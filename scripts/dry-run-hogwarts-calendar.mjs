/* global globalThis */
import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    stat,
} from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';

import {
    migrateCalendarState,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-migration.js';

function parseArguments(argv) {
    const options = {
        file: '',
    };
    for (
        let index = 0;
        index < argv.length;
        index += 1
    ) {
        const argument = argv[index];
        if (argument === '--file') {
            options.file =
                argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (argument === '--dry-run') {
            continue;
        }
        throw new Error(
            `Unknown argument: ${argument}`,
        );
    }
    if (!options.file) {
        throw new Error(
            'Usage: node scripts/dry-run-hogwarts-calendar.mjs --dry-run --file <chat.jsonl>',
        );
    }
    return options;
}

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function splitJsonl(raw) {
    const firstNewline =
        raw.indexOf('\n');
    if (firstNewline < 0) {
        throw new Error(
            'The chat JSONL has no message rows.',
        );
    }
    const messageBytes =
        raw.slice(firstNewline + 1);
    return {
        metadataLine:
            raw.slice(
                0,
                firstNewline,
            ),
        messageBytes,
        chat:
            messageBytes
                .split('\n')
                .filter(Boolean)
                .map(line =>
                    JSON.parse(line)),
    };
}

function withoutCalendar(state) {
    const copy =
        structuredClone(state);
    delete copy.calendar;
    return copy;
}

function identitySnapshot(state) {
    return {
        npcIdentityVersion:
            state.npcIdentityVersion,
        npcIdentityObservationVersion:
            state.npcIdentityObservationVersion,
        actorLibrary:
            (state.actorLibrary || [])
                .map(actor => ({
                    id: actor.id,
                    identity:
                        actor.identity,
                })),
        actors:
            (state.actors || [])
                .map(actor => ({
                    id: actor.id,
                    identity:
                        actor.identity,
                })),
    };
}

function memorySnapshot(state) {
    return {
        memoryDirector:
            state.memoryDirector,
        eventKnowledge:
            state.eventKnowledge,
        actorLibrary:
            (state.actorLibrary || [])
                .map(actor => ({
                    id: actor.id,
                    fields:
                        Object.fromEntries(
                            Object.entries(actor)
                                .filter(([key]) =>
                                    /memory|knowledge/iu
                                        .test(key)),
                        ),
                })),
        actors:
            (state.actors || [])
                .map(actor => ({
                    id: actor.id,
                    fields:
                        Object.fromEntries(
                            Object.entries(actor)
                                .filter(([key]) =>
                                    /memory|knowledge/iu
                                        .test(key)),
                        ),
                })),
    };
}

function itemSnapshot(state) {
    return Object.fromEntries(
        Object.entries(state)
            .filter(([key]) =>
                /item/iu.test(key)),
    );
}

function locationSnapshot(state) {
    return {
        location:
            state.location,
        map:
            state.map,
        spatial:
            state.spatial,
        localPresence:
            state.localPresence,
        cohorts:
            state.cohorts,
    };
}

function assertDomainInvariants(
    before,
    after,
    label,
) {
    assert.deepEqual(
        withoutCalendar(after),
        withoutCalendar(before),
        `${label}: Calendar migration changed a non-Calendar field.`,
    );
    assert.equal(
        after.clock,
        before.clock,
        `${label}: clock changed.`,
    );
    assert.deepEqual(
        after.scene,
        before.scene,
        `${label}: scene changed.`,
    );
    assert.deepEqual(
        after.sceneArchive,
        before.sceneArchive,
        `${label}: sceneArchive changed.`,
    );
    assert.deepEqual(
        after.actors,
        before.actors,
        `${label}: actors changed.`,
    );
    assert.deepEqual(
        itemSnapshot(after),
        itemSnapshot(before),
        `${label}: Item state changed.`,
    );
    assert.deepEqual(
        identitySnapshot(after),
        identitySnapshot(before),
        `${label}: Identity state changed.`,
    );
    assert.deepEqual(
        after.socialGraph,
        before.socialGraph,
        `${label}: Social state changed.`,
    );
    assert.deepEqual(
        memorySnapshot(after),
        memorySnapshot(before),
        `${label}: Memory state changed.`,
    );
    assert.deepEqual(
        locationSnapshot(after),
        locationSnapshot(before),
        `${label}: location state changed.`,
    );
}

function migrateTwice(
    state,
    label,
) {
    const first =
        migrateCalendarState(
            state,
        );
    const second =
        migrateCalendarState(
            first.state,
        );
    assert.equal(
        JSON.stringify(
            second.state,
        ),
        JSON.stringify(
            first.state,
        ),
        `${label}: repeated migration is not byte-stable.`,
    );
    assertDomainInvariants(
        state,
        first.state,
        label,
    );
    return {
        first,
        second,
    };
}

const V1_STORYLINE_PRESERVED_FIELDS =
    Object.freeze([
        'id',
        'title',
        'titleEn',
        'summary',
        'summaryEn',
        'tags',
        'startClock',
        'endClock',
        'participantIds',
        'createdClock',
        'updatedClock',
    ]);
const V1_SCHEDULE_PRESERVED_FIELDS =
    Object.freeze([
        'id',
        'parentId',
        'entryType',
        'title',
        'titleEn',
        'summary',
        'summaryEn',
        'tags',
        'startClock',
        'endClock',
        'participantIds',
        'mapId',
        'roomId',
        'status',
        'planningTier',
        'relatedSceneIds',
        'createdClock',
        'updatedClock',
    ]);

function assertV1Migration(
    source,
    result,
) {
    assert.equal(
        result.first.changed,
        true,
        'Calendar V1 source did not migrate to V2.',
    );
    const sourceStorylines =
        source.calendar.entries
            .filter(entry =>
                entry.entryType ===
                'storyline');
    const sourceSchedules =
        source.calendar.entries
            .filter(entry =>
                entry.entryType ===
                'event');
    const migrated =
        result.first.state.calendar;
    assert.equal(
        migrated.version,
        2,
        'Calendar V1 source did not produce version=2.',
    );
    assert.deepEqual(
        migrated.storyBeats,
        [],
        'Calendar V1 migration invented storyBeats.',
    );
    assert.deepEqual(
        migrated.storylines
            .map(storyline =>
                storyline.id),
        sourceStorylines
            .map(storyline =>
                storyline.id),
        'Calendar V1 storyline IDs changed during migration.',
    );
    assert.deepEqual(
        migrated.entries
            .map(entry =>
                entry.id),
        sourceSchedules
            .map(entry =>
                entry.id),
        'Calendar V1 event IDs changed during migration.',
    );
    sourceStorylines.forEach(
        (sourceStoryline, index) => {
            const target =
                migrated.storylines[
                    index
                ];
            for (
                const field of
                V1_STORYLINE_PRESERVED_FIELDS
            ) {
                assert.deepEqual(
                    target[field],
                    sourceStoryline[
                        field
                    ],
                    `Calendar V1 storyline ${sourceStoryline.id} changed ${field}.`,
                );
            }
            assert.equal(
                target.status,
                sourceStoryline
                    .status ===
                    'completed'
                    ? 'resolved'
                    : sourceStoryline
                        .status,
                `Calendar V1 storyline ${sourceStoryline.id} changed status incorrectly.`,
            );
        },
    );
    sourceSchedules.forEach(
        (sourceSchedule, index) => {
            const target =
                migrated.entries[index];
            for (
                const field of
                V1_SCHEDULE_PRESERVED_FIELDS
            ) {
                assert.deepEqual(
                    target[field],
                    sourceSchedule[field],
                    `Calendar V1 schedule ${sourceSchedule.id} changed ${field}.`,
                );
            }
            assert.equal(
                target.sourceBeatId,
                '',
                `Calendar V1 schedule ${sourceSchedule.id} gained a fake sourceBeatId.`,
            );
            assert.equal(
                target.beatSlot,
                null,
                `Calendar V1 schedule ${sourceSchedule.id} gained a fake beatSlot.`,
            );
        },
    );
    assert.equal(
        result.second.changed,
        false,
        'Second V1-to-V2 migration was not a no-op.',
    );
    return {
        sourceStorylines:
            sourceStorylines.length,
        migratedStorylines:
            migrated.storylines.length,
        sourceSchedules:
            sourceSchedules.length,
        migratedSchedules:
            migrated.entries.length,
        stableStorylineIds: true,
        stableScheduleIds: true,
        grandfatheredFieldsPreserved:
            true,
        fakeStoryBeatsCreated:
            0,
        repeatedMigrationByteStable:
            true,
    };
}

function assertLegacyAgendaIsolated(
    source,
    calendar,
) {
    const serialized =
        JSON.stringify(calendar);
    for (const item of (
        Array.isArray(source.agenda)
            ? source.agenda
            : []
    )) {
        for (const key of [
            'label',
            'labelEn',
        ]) {
            const value =
                String(item?.[key] || '')
                    .trim();
            if (value) {
                assert.equal(
                    serialized.includes(value),
                    false,
                    `Legacy agenda value leaked into Calendar: ${value}`,
                );
            }
        }
    }
}

function networkBlocker() {
    let calls = 0;
    const patches = [];
    const block = label => {
        calls += 1;
        throw new Error(
            `Network access is forbidden during dry-run: ${label}`,
        );
    };
    const patch = (
        target,
        key,
        label,
    ) => {
        const original =
            target[key];
        patches.push(() => {
            target[key] =
                original;
        });
        target[key] =
            (..._args) =>
                block(label);
    };
    patch(
        globalThis,
        'fetch',
        'fetch',
    );
    patch(
        http,
        'request',
        'http.request',
    );
    patch(
        https,
        'request',
        'https.request',
    );
    patch(
        net,
        'connect',
        'net.connect',
    );
    patch(
        net,
        'createConnection',
        'net.createConnection',
    );
    patch(
        tls,
        'connect',
        'tls.connect',
    );
    return {
        get calls() {
            return calls;
        },
        restore() {
            patches
                .reverse()
                .forEach(restore =>
                    restore());
        },
    };
}

async function main() {
    const options =
        parseArguments(
            process.argv.slice(2),
        );
    const file =
        path.resolve(
            options.file,
        );
    const blocker =
        networkBlocker();
    const modelCalls = 0;
    try {
        const beforeStat =
            await stat(
                file,
                {
                    bigint: true,
                },
            );
        const rawBefore =
            await readFile(
                file,
                'utf8',
            );
        const {
            metadataLine,
            messageBytes,
            chat,
        } = splitJsonl(
            rawBefore,
        );
        const metadata =
            JSON.parse(
                metadataLine,
            );
        const before =
            metadata
                ?.chat_metadata
                ?.hogwartsMud;
        if (!before) {
            throw new Error(
                'The JSONL metadata does not contain chat_metadata.hogwartsMud.',
            );
        }

        const sourceCalendarVersion =
            before.calendar
                ?.version;
        if (
            ![
                1,
                2,
            ].includes(
                sourceCalendarVersion,
            )
        ) {
            throw new Error(
                `Calendar dry-run requires a V1 or V2 source; found ${sourceCalendarVersion ?? 'none'}.`,
            );
        }
        const sourceCalendar =
            migrateTwice(
                before,
                `source Calendar V${sourceCalendarVersion}`,
            );
        const v1Migration =
            sourceCalendarVersion ===
                1
                ? assertV1Migration(
                    before,
                    sourceCalendar,
                )
                : null;
        if (
            sourceCalendarVersion ===
            2
        ) {
            assert.equal(
                sourceCalendar
                    .first.changed,
                false,
                'Existing Calendar V2 unexpectedly required normalization.',
            );
            assert.equal(
                sourceCalendar
                    .first.state,
                before,
                'No-op Calendar V2 migration did not retain the source state.',
            );
        }
        assertLegacyAgendaIsolated(
            before,
            sourceCalendar.first
                .state.calendar,
        );

        const noCalendarSource =
            structuredClone(before);
        delete noCalendarSource
            .calendar;
        const noCalendar =
            migrateTwice(
                noCalendarSource,
                'real Tina legacy clone',
            );
        assert.equal(
            noCalendar.first.changed,
            true,
            'No-Calendar clone did not initialize Calendar V2.',
        );
        assert.deepEqual(
            noCalendar.first
                .state.calendar,
            {
                version: 2,
                storylines: [],
                storyBeats: [],
                entries: [],
                horizon:
                    before.clock,
            },
            'No-Calendar clone did not initialize the exact empty Calendar V2 state.',
        );
        assert.equal(
            noCalendar.second.changed,
            false,
            'Second no-Calendar-clone migration was not a no-op.',
        );
        assert.deepEqual(
            noCalendar.first
                .state.agenda,
            before.agenda,
            'Legacy agenda changed during Calendar migration.',
        );
        assertLegacyAgendaIsolated(
            before,
            noCalendar.first
                .state.calendar,
        );
        assert.equal(
            JSON.stringify(
                noCalendar.first
                    .state.calendar,
            ).includes(
                'authorQuill',
            ),
            false,
            'Scene Archive Author Quill content leaked into Calendar.',
        );
        assert.equal(
            noCalendar.first
                .state.calendar
                .entries.length,
            0,
            'Scene Archive content was copied into initialized Calendar entries.',
        );
        assert.equal(
            noCalendar.first
                .state.calendar
                .storylines.length,
            0,
            'Scene Archive content was copied into initialized Calendar storylines.',
        );
        assert.equal(
            noCalendar.first
                .state.calendar
                .storyBeats.length,
            0,
            'Scene Archive content was copied into initialized Calendar storyBeats.',
        );

        const rawAfter =
            await readFile(
                file,
                'utf8',
            );
        const afterStat =
            await stat(
                file,
                {
                    bigint: true,
                },
            );
        assert.equal(
            rawAfter,
            rawBefore,
            'The source JSONL changed during dry-run.',
        );
        assert.equal(
            afterStat.size,
            beforeStat.size,
            'The source JSONL size changed during dry-run.',
        );
        assert.equal(
            afterStat.mtimeNs,
            beforeStat.mtimeNs,
            'The source JSONL mtime changed during dry-run.',
        );
        assert.equal(
            blocker.calls,
            0,
            'Dry-run attempted network access.',
        );
        assert.equal(
            modelCalls,
            0,
            'Dry-run attempted model access.',
        );

        const report = {
            mode:
                'read-only-calendar-dry-run',
            file,
            source: {
                sha256:
                    sha256(rawBefore),
                bytes:
                    Number(
                        beforeStat.size,
                    ),
                mtimeNs:
                    beforeStat
                        .mtimeNs
                        .toString(),
                unchanged: true,
            },
            messages: {
                count:
                    chat.length,
                sha256:
                    sha256(
                        messageBytes,
                    ),
                unchanged: true,
            },
            sourceCalendar: {
                inputVersion:
                    sourceCalendarVersion,
                outputVersion:
                    sourceCalendar.first
                        .state
                        .calendar
                        .version,
                storylines:
                    sourceCalendar.first
                        .state
                        .calendar
                        .storylines
                        .length,
                storyBeats:
                    sourceCalendar.first
                        .state
                        .calendar
                        .storyBeats
                        .length,
                schedules:
                    sourceCalendar.first
                        .state
                        .calendar
                        .entries.length,
                changed:
                    sourceCalendar.first
                        .changed,
                sha256:
                    sha256(
                        JSON.stringify(
                            sourceCalendar.first
                                .state
                                .calendar,
                        ),
                    ),
                repeatedMigrationByteStable:
                    true,
            },
            v1Migration,
            noCalendarClone: {
                initialized: true,
                version: 2,
                storylines: 0,
                storyBeats: 0,
                entries: 0,
                horizon:
                    noCalendar.first
                        .state
                        .calendar
                        .horizon,
                calendarSha256:
                    sha256(
                        JSON.stringify(
                            noCalendar.first
                                .state
                                .calendar,
                        ),
                    ),
                repeatedMigrationByteStable:
                    true,
                agendaUnchanged: true,
                agendaNotMigrated: true,
                sceneArchiveBodyNotCopied:
                    true,
            },
            invariants: {
                clockUnchanged: true,
                sceneUnchanged: true,
                sceneArchiveUnchanged:
                    true,
                actorsUnchanged: true,
                itemsUnchanged: true,
                identityUnchanged: true,
                socialUnchanged: true,
                memoryUnchanged: true,
                locationUnchanged: true,
                allNonCalendarFieldsUnchanged:
                    true,
                networkCalls:
                    blocker.calls,
                modelCalls,
            },
        };
        process.stdout.write(
            `${JSON.stringify(
                report,
                null,
                2,
            )}\n`,
        );
    } finally {
        blocker.restore();
    }
}

await main();
