/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CALENDAR_ENTRY_FIELDS,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-schema.js';
import {
    applyCalendarProposal,
    guardedSaveCalendarProposal,
    settleCalendarAtClock,
    validateCalendarProposal,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-reducer.js';
import {
    projectCalendarAtMoment,
    projectCalendarByDate,
    projectCalendarByParent,
    projectCalendarByTag,
    projectCalendarToday,
    projectUpcomingCalendar,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-projection.js';
import * as calendarProjection
    from '../public/scripts/extensions/hogwarts-mud/domain/calendar-projection.js';
import {
    archiveSceneWithCalendarLinks,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-scene.js';
import {
    createSaveRevisionGuard,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';

const CURRENT_CLOCK =
    '1991-09-03 · 10:30';
const START_CLOCK =
    '1991-09-03 · 11:00';
const END_CLOCK =
    '1991-09-03 · 12:00';
const HARRY_ID =
    'canon_harry_james_potter';
const HERMIONE_ID =
    'canon_hermione_jean_granger';

function createStorage() {
    const values = new Map();
    return {
        get length() {
            return values.size;
        },
        key(index) {
            return [
                ...values.keys(),
            ][index] ?? null;
        },
        getItem(key) {
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            values.set(
                key,
                String(value),
            );
        },
        removeItem(key) {
            values.delete(key);
        },
    };
}

function createEntry(
    id,
    patch = {},
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        titleEn: id,
        summaryEn:
            `Public summary for ${id}.`,
        tags: [],
        startClock:
            START_CLOCK,
        endClock:
            END_CLOCK,
        participantIds: [
            HARRY_ID,
        ],
        mapId:
            'hogwarts_castle',
        roomId:
            'charms_classroom',
        status: 'planned',
        planningTier:
            'medium',
        relatedSceneIds: [],
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        sourceBeatId: '',
        beatSlot: null,
        scheduleKind:
            'personal',
        ...patch,
    };
}

function createStoryline(
    id =
    'house_cup_storyline',
    patch = {},
) {
    return {
        id,
        titleEn: id,
        summaryEn:
            `Public long-term direction for ${id}.`,
        tags: [],
        startClock:
            '1991-09-01 · 08:00',
        endClock:
            '1992-06-20 · 20:00',
        participantIds: [
            HARRY_ID,
        ],
        status: 'active',
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        ...patch,
    };
}

function createStoryBeat(
    id =
    'house_cup_autumn_1991',
    patch = {},
) {
    return {
        id,
        storylineId:
            'house_cup_storyline',
        titleEn: id,
        summaryEn:
            `Public term beat for ${id}.`,
        tags: [],
        termKey:
            '1991_autumn',
        sequence: 1,
        windowStartClock:
            '1991-09-01 · 08:00',
        windowEndClock:
            '1991-12-20 · 20:00',
        sceneTarget: 4,
        status: 'active',
        relatedSceneIds: [],
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        ...patch,
    };
}

function createState(
    entries = [],
    patch = {},
) {
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'timeline_calendar_test',
        stateRevision: 4,
        revisionHistory: [],
        clock: CURRENT_CLOCK,
        calendar: {
            version: 3,
            storylines: [],
            storyBeats: [],
            entries,
            horizon:
                '1991-09-17 · 10:30',
        },
        actorLibrary: [{
            id: HARRY_ID,
        }, {
            id: HERMIONE_ID,
        }],
        map: {
            customLocalMaps: [{
                id:
                    'hogwarts_castle',
                nodes: [{
                    id:
                        'charms_classroom',
                }, {
                    id:
                        'great_hall',
                }],
            }, {
                id:
                    'hogsmeade',
                nodes: [{
                    id:
                        'three_broomsticks',
                }],
            }],
            generatedLocalNodes: [],
        },
        sceneArchive: [{
            id:
                'scene_before_class',
        }, {
            id:
                'scene_after_class',
        }],
        items: [{
            id: 'borrowed_quill',
            state: 'intact',
        }],
        identityState: {
            version: 1,
        },
        socialGraph: {
            version: 2,
        },
        memoryDirector: {
            status: 'idle',
        },
        scene: {
            id: 'current_scene',
            outcome: 'unresolved',
        },
        ...patch,
    };
}

function createHighProposal(
    state,
    storylines,
    storyBeats,
    patch = {},
) {
    return {
        baseTimelineEpoch:
            state.timelineEpoch,
        baseStateRevision:
            state.stateRevision,
        storylines,
        storyBeats,
        ...patch,
    };
}

function createProposal(
    state,
    entries,
    patch = {},
) {
    return {
        baseTimelineEpoch:
            state.timelineEpoch,
        baseStateRevision:
            state.stateRevision,
        entries,
        ...patch,
    };
}

function withoutCalendar(
    state,
) {
    const clone =
        structuredClone(state);
    delete clone.calendar;
    return clone;
}

test('[defect-probing] High accepts only typed storyline and storyBeat proposals while Medium accepts only schedules', () => {
    const highStoryline =
        createStoryline(
            'house_cup_storyline',
            {
                titleEn:
                    'House Cup competition',
            },
        );
    const highBeat =
        createStoryBeat();
    const omittedMedium =
        createEntry(
            'charms_homework',
        );
    const state =
        createState([
            omittedMedium,
        ]);
    const beforeDomains =
        withoutCalendar(state);
    const highApplied =
        applyCalendarProposal(
            state,
            createHighProposal(
                state,
                [highStoryline],
                [highBeat],
            ),
            'high',
        );

    assert.deepEqual(
        highApplied.calendar
            .storylines,
        [highStoryline],
    );
    assert.deepEqual(
        highApplied.calendar
            .storyBeats,
        [highBeat],
    );
    assert.deepEqual(
        highApplied.calendar
            .entries,
        [omittedMedium],
        'High cannot create or rewrite schedules',
    );
    assert.deepEqual(
        withoutCalendar(
            highApplied,
        ),
        beforeDomains,
    );

    const mediumSchedule =
        createEntry(
            'house_cup_meeting',
            {
                sourceBeatId:
                    highBeat.id,
                beatSlot: 1,
                scheduleKind:
                    'story',
                parentId:
                    highStoryline.id,
                roomId:
                    'great_hall',
                startClock:
                    '1991-09-10 · 18:00',
                endClock:
                    '1991-09-10 · 20:00',
            },
        );
    const mediumApplied =
        applyCalendarProposal(
            highApplied,
            createProposal(
                highApplied,
                [mediumSchedule],
            ),
            'medium',
        );

    assert.deepEqual(
        mediumApplied.calendar
            .entries.map(entry =>
                entry.id),
        [
            omittedMedium.id,
            mediumSchedule.id,
        ],
    );
    assert.deepEqual(
        mediumApplied.calendar
            .storylines,
        highApplied.calendar
            .storylines,
        'Medium cannot rewrite storylines',
    );
    assert.deepEqual(
        mediumApplied.calendar
            .storyBeats,
        highApplied.calendar
            .storyBeats,
        'Medium cannot rewrite story beats',
    );

    assert.throws(
        () => applyCalendarProposal(
            highApplied,
            createProposal(
                highApplied,
                [mediumSchedule],
            ),
            'high',
        ),
        /未知字段|storylines|不得.*schedule|entries/u,
    );
    assert.throws(
        () => applyCalendarProposal(
            highApplied,
            createHighProposal(
                highApplied,
                [highStoryline],
                [highBeat],
            ),
            'medium',
        ),
        /未知字段|entries|不得.*story/u,
    );
});

test('Medium schedule proposals accept four stable beat slots and reject duplicate slots atomically', () => {
    const storyline =
        createStoryline();
    const beat =
        createStoryBeat();
    const state =
        createState();
    state.calendar.storylines = [
        storyline,
    ];
    state.calendar.storyBeats = [
        beat,
    ];
    const schedules =
        Array.from(
            {
                length: 4,
            },
            (_, index) =>
                createEntry(
                    `house_cup_slot_${index + 1}`,
                    {
                        sourceBeatId:
                            beat.id,
                        beatSlot:
                            index + 1,
                        scheduleKind:
                            'story',
                    },
                ),
        );
    const applied =
        applyCalendarProposal(
            state,
            createProposal(
                state,
                schedules,
            ),
            'medium',
        );

    assert.deepEqual(
        applied.calendar
            .entries.map(entry =>
                entry.beatSlot),
        [
            1,
            2,
            3,
            4,
        ],
    );
    assert.deepEqual(
        applied.calendar.storyBeats,
        state.calendar.storyBeats,
    );

    const duplicateSlot = {
        ...schedules[1],
        id:
            'house_cup_duplicate_slot',
        beatSlot: 1,
    };
    assert.throws(
        () => applyCalendarProposal(
            state,
            createProposal(
                state,
                [
                    schedules[0],
                    duplicateSlot,
                ],
            ),
            'medium',
        ),
        /beatSlot 1 重复/u,
    );
    assert.deepEqual(
        state.calendar.entries,
        [],
    );
});

test('proposal validation rejects stale heads, unknown fields and invalid entries without mutating state', () => {
    const state = createState();
    const before =
        JSON.stringify(state);
    const entry =
        createEntry('charms_exam');

    for (const proposal of [
        createProposal(
            state,
            [entry],
            {
                baseTimelineEpoch:
                    'timeline_stale',
            },
        ),
        createProposal(
            state,
            [entry],
            {
                baseStateRevision:
                    state.stateRevision -
                    1,
            },
        ),
    ]) {
        assert.equal(
            validateCalendarProposal(
                proposal,
                state,
                'medium',
            ).valid,
            false,
        );
        assert.throws(
            () => applyCalendarProposal(
                state,
                proposal,
                'medium',
            ),
            /已陈旧/u,
        );
    }

    assert.equal(
        validateCalendarProposal(
            {
                ...createProposal(
                    state,
                    [entry],
                ),
                hiddenDirectorPayload:
                    'must not persist',
            },
            state,
            'medium',
        ).valid,
        false,
    );
    assert.doesNotThrow(() => {
        const invalidClock =
            validateCalendarProposal(
                createProposal(
                    state,
                    [
                        createEntry(
                            'invalid_clock',
                            {
                                endClock:
                                    '1991-02-30 · 12:00',
                            },
                        ),
                    ],
                ),
                state,
                'medium',
            );
        assert.equal(
            invalidClock.valid,
            false,
        );
        assert.match(
            invalidClock
                .errors.join('\n'),
            /endClock 不是绝对世界时钟/u,
        );
    });
    assert.equal(
        JSON.stringify(state),
        before,
    );
});

test('guarded proposal save commits once and rejects the same stale revision before persistence', async () => {
    const storage =
        createStorage();
    let claim = 0;
    const guard =
        createSaveRevisionGuard({
            storage,
            lockManager: null,
            createClaimId:
                () =>
                    `calendar_claim_${claim += 1}`,
            now:
                () =>
                    '1991-09-03T10:30:00.000Z',
        });
    const pageA =
        createState();
    const pageB =
        structuredClone(pageA);
    guard.registerHead(pageA);
    const proposal =
        createProposal(
            pageA,
            [
                createEntry(
                    'charms_exam',
                    {
                        tags: [
                            'exam',
                        ],
                    },
                ),
            ],
        );
    let persisted = null;
    const first =
        await guardedSaveCalendarProposal({
            worldState: pageA,
            proposal,
            planningTier:
                'medium',
            guard,
            save: state => {
                persisted = state;
                return {
                    durable: true,
                };
            },
        });

    assert.equal(
        first.ok,
        true,
    );
    assert.equal(
        persisted.stateRevision,
        5,
    );
    assert.deepEqual(
        persisted.calendar
            .entries.map(entry =>
                entry.id),
        ['charms_exam'],
    );
    assert.equal(
        persisted.revisionHistory
            .at(-1)
            .changedDomains
            .includes('calendar'),
        true,
    );

    await assert.rejects(
        guardedSaveCalendarProposal({
            worldState:
                first.state,
            proposal,
            planningTier:
                'medium',
            guard,
            save: () => {
                throw new Error(
                    'stale callback must not run',
                );
            },
        }),
        /stateRevision 已陈旧/u,
    );

    let staleSaveCalls = 0;
    const competing =
        await guardedSaveCalendarProposal({
            worldState: pageB,
            proposal,
            planningTier:
                'medium',
            guard,
            save: () => {
                staleSaveCalls += 1;
            },
        });
    assert.equal(
        competing.ok,
        false,
    );
    assert.equal(
        competing.status,
        'stale_save',
    );
    assert.equal(
        staleSaveCalls,
        0,
    );
});

test('[defect-probing] empty and unchanged proposals consume their base revision exactly once', async () => {
    const cases = [{
        name: 'empty',
        entries: [],
        initialEntries: [],
    }, {
        name: 'unchanged',
        entries: [
            createEntry(
                'existing_exam',
            ),
        ],
        initialEntries: [
            createEntry(
                'existing_exam',
            ),
        ],
    }];

    for (const scenario of cases) {
        const state =
            createState(
                scenario
                    .initialEntries,
            );
        const proposal =
            createProposal(
                state,
                scenario.entries,
            );
        const guard =
            createSaveRevisionGuard({
                storage:
                    createStorage(),
                lockManager: null,
                createClaimId:
                    () =>
                        `${scenario.name}_claim`,
                now:
                    () =>
                        '1991-09-03T10:30:00.000Z',
            });
        guard.registerHead(
            state,
        );
        let saveCalls = 0;

        const first =
            await guardedSaveCalendarProposal({
                worldState:
                    state,
                proposal,
                planningTier:
                    'medium',
                guard,
                save: () => {
                    saveCalls += 1;
                    return {
                        durable: true,
                    };
                },
            });
        const repeated =
            await guardedSaveCalendarProposal({
                worldState:
                    state,
                proposal,
                planningTier:
                    'medium',
                guard,
                save: () => {
                    saveCalls += 1;
                    return {
                        durable: true,
                    };
                },
            });

        assert.equal(
            first.ok,
            true,
            scenario.name,
        );
        assert.equal(
            first.state
                .stateRevision,
            state.stateRevision +
                1,
            scenario.name,
        );
        assert.equal(
            repeated.ok,
            false,
            scenario.name,
        );
        assert.equal(
            repeated.status,
            'stale_save',
            scenario.name,
        );
        assert.equal(
            saveCalls,
            1,
            scenario.name,
        );
    }
});

test('local clock settlement activates and completes every overlap without producing outcomes', () => {
    const exam =
        createEntry(
            'charms_exam',
            {
                titleEn:
                    'Charms exam',
                tags: [
                    'exam',
                ],
                participantIds: [
                    HARRY_ID,
                    HERMIONE_ID,
                ],
            },
        );
    const date =
        createEntry(
            'charms_date',
            {
                titleEn:
                    'Date during exams',
                tags: [
                    'date',
                ],
                participantIds: [
                    HERMIONE_ID,
                ],
                mapId:
                    'hogsmeade',
                roomId:
                    'three_broomsticks',
            },
        );
    const cancelled =
        createEntry(
            'cancelled_practice',
            {
                status:
                    'cancelled',
            },
        );
    const state =
        createState([
            exam,
            date,
            cancelled,
        ]);
    state.calendar.storylines = [
        createStoryline(),
    ];
    state.calendar.storyBeats = [
        createStoryBeat(),
    ];
    const beatsBefore =
        structuredClone(
            state.calendar
                .storyBeats,
        );
    const beforeStart =
        settleCalendarAtClock(
            state,
            '1991-09-03 · 10:59',
        );
    assert.equal(
        beforeStart,
        state,
    );

    const active =
        settleCalendarAtClock(
            state,
            START_CLOCK,
        );
    assert.deepEqual(
        active.calendar.entries
            .map(entry =>
                entry.status),
        [
            'active',
            'active',
            'cancelled',
        ],
    );
    assert.deepEqual(
        active.calendar
            .storyBeats,
        beatsBefore,
        'world-clock settlement changes schedules only and never realizes a beat',
    );
    assert.deepEqual(
        withoutCalendar(active),
        withoutCalendar(state),
        'clock settlement cannot write Scene, Item, Identity, Social or Memory',
    );
    assert.equal(
        settleCalendarAtClock(
            active,
            END_CLOCK,
        ),
        active,
        'endClock remains inside the active interval',
    );

    const completed =
        settleCalendarAtClock(
            active,
            '1991-09-03 · 12:01',
        );
    assert.deepEqual(
        completed.calendar
            .entries.map(entry =>
                entry.status),
        [
            'completed',
            'completed',
            'cancelled',
        ],
    );
    assert.deepEqual(
        completed.calendar
            .storyBeats,
        beatsBefore,
    );
    completed.calendar.entries
        .forEach(entry => {
            assert.deepEqual(
                Object.keys(entry),
                CALENDAR_ENTRY_FIELDS,
                'completion adds no success, attendance, score or narrative outcome',
            );
        });
    assert.equal(
        completed.scene.outcome,
        'unresolved',
    );
    assert.equal(
        completed.items[0].state,
        'intact',
    );
});

test('[defect-probing] local clock settlement defers only expired incomplete beats without reading prose', () => {
    const state =
        createState();
    state.sceneArchive = [
        'beat_scene_one',
        'beat_scene_two',
        'beat_scene_three',
        'beat_scene_four',
    ].map(id => ({
        id,
    }));
    state.calendar.storylines = [
        createStoryline(),
    ];
    state.calendar.storyBeats = [
        createStoryBeat(
            'planned_expired_beat',
            {
                termKey:
                    'planned_expired',
                sequence: 1,
                windowEndClock:
                    '1991-09-03 · 10:00',
                status: 'planned',
                summaryEn:
                    'The prose claims that all four Scenes are complete.',
            },
        ),
        createStoryBeat(
            'active_expired_beat',
            {
                termKey:
                    'active_expired',
                sequence: 2,
                windowEndClock:
                    '1991-09-03 · 10:00',
                relatedSceneIds: [
                    'beat_scene_one',
                    'beat_scene_two',
                    'beat_scene_three',
                ],
            },
        ),
        createStoryBeat(
            'realized_expired_beat',
            {
                termKey:
                    'realized_expired',
                sequence: 3,
                windowEndClock:
                    '1991-09-03 · 10:00',
                status: 'realized',
                relatedSceneIds: [
                    'beat_scene_one',
                    'beat_scene_two',
                    'beat_scene_three',
                    'beat_scene_four',
                ],
            },
        ),
        createStoryBeat(
            'cancelled_expired_beat',
            {
                termKey:
                    'cancelled_expired',
                sequence: 4,
                windowEndClock:
                    '1991-09-03 · 10:00',
                status: 'cancelled',
            },
        ),
        createStoryBeat(
            'boundary_planned_beat',
            {
                termKey:
                    'boundary_planned',
                sequence: 5,
                windowEndClock:
                    CURRENT_CLOCK,
                status: 'planned',
            },
        ),
    ];
    const terminalBeatsBefore =
        structuredClone(
            state.calendar.storyBeats
                .slice(
                    2,
                    4,
                ),
        );

    const atBoundary =
        settleCalendarAtClock(
            state,
            CURRENT_CLOCK,
        );
    assert.deepEqual(
        atBoundary.calendar.storyBeats
            .map(beat =>
                beat.status),
        [
            'deferred',
            'deferred',
            'realized',
            'cancelled',
            'planned',
        ],
    );
    assert.deepEqual(
        atBoundary.calendar.storyBeats
            .slice(
                2,
                4,
            ),
        terminalBeatsBefore,
        'realized and cancelled beats remain byte-stable',
    );
    assert.equal(
        atBoundary.calendar.storyBeats[0]
            .summaryEn,
        'The prose claims that all four Scenes are complete.',
        'narrative claims cannot realize a beat',
    );
    assert.deepEqual(
        atBoundary.calendar.storyBeats[1]
            .relatedSceneIds,
        [
            'beat_scene_one',
            'beat_scene_two',
            'beat_scene_three',
        ],
    );

    const afterBoundary =
        settleCalendarAtClock(
            atBoundary,
            '1991-09-03 · 10:31',
        );
    assert.equal(
        afterBoundary.calendar
            .storyBeats[4].status,
        'deferred',
        'windowEndClock remains inclusive until the world clock moves past it',
    );
    assert.equal(
        settleCalendarAtClock(
            afterBoundary,
            '1991-09-03 · 10:31',
        ),
        afterBoundary,
        'repeating the same settlement is byte-stable',
    );
});

test('proposal rejects rescheduling an active entry outside the current clock interval', () => {
    const active =
        createEntry(
            'active_charms_class',
            {
                startClock:
                    '1991-09-03 · 10:00',
                status: 'active',
            },
        );
    const unchanged =
        createEntry(
            'unchanged_future_class',
        );
    const state =
        createState([
            active,
            unchanged,
        ]);
    const before =
        JSON.stringify(state);
    const rescheduled = {
        ...active,
        startClock:
            '1991-09-03 · 13:00',
        endClock:
            '1991-09-03 · 14:00',
        updatedClock:
            state.clock,
    };
    const otherwiseValidUpdate = {
        ...unchanged,
        summaryEn:
            'This otherwise valid update must not commit partially.',
    };
    const validation =
        validateCalendarProposal(
            createProposal(
                state,
                [
                    rescheduled,
                    otherwiseValidUpdate,
                ],
            ),
            state,
            'medium',
        );

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        validation.errors.join('\n'),
        /active.*当前世界时钟.*时间区间/u,
    );
    assert.throws(
        () => applyCalendarProposal(
            state,
            createProposal(
                state,
                [
                    rescheduled,
                    otherwiseValidUpdate,
                ],
            ),
            'medium',
        ),
        /active.*当前世界时钟.*时间区间/u,
    );
    assert.equal(
        JSON.stringify(state),
        before,
        'invalid active rescheduling rejects the whole proposal without mutation',
    );

    const boundaryUpdate = {
        ...active,
        startClock:
            CURRENT_CLOCK,
        endClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
    };
    const applied =
        applyCalendarProposal(
            state,
            createProposal(
                state,
                [boundaryUpdate],
            ),
            'medium',
        );
    assert.deepEqual(
        applied.calendar
            .entries[0],
        boundaryUpdate,
        'active updates remain valid when the inclusive interval still covers the current clock',
    );
});

test('clock settlement rejects an active entry before its start instead of regressing it to planned', () => {
    const inconsistent =
        createState([
            createEntry(
                'future_active_class',
                {
                    startClock:
                        '1991-09-03 · 13:00',
                    endClock:
                        '1991-09-03 · 14:00',
                    status: 'active',
                },
            ),
        ]);
    const before =
        JSON.stringify(
            inconsistent,
        );

    assert.throws(
        () => settleCalendarAtClock(
            inconsistent,
            CURRENT_CLOCK,
        ),
        /active.*(?:startClock|开始时钟).*当前世界时钟/u,
    );
    assert.equal(
        JSON.stringify(
            inconsistent,
        ),
        before,
    );
});

test('only an explicit owning-director proposal cancels a live entry', () => {
    const planned =
        createEntry(
            'weekend_meeting',
        );
    const state =
        createState([
            planned,
        ]);
    const cancelled = {
        ...planned,
        status: 'cancelled',
    };
    const applied =
        applyCalendarProposal(
            state,
            createProposal(
                state,
                [cancelled],
            ),
            'medium',
        );
    assert.equal(
        applied.calendar
            .entries[0].status,
        'cancelled',
    );

    for (const localStatus of [
        'active',
        'completed',
    ]) {
        assert.throws(
            () => applyCalendarProposal(
                state,
                createProposal(
                    state,
                    [{
                        ...planned,
                        status:
                            localStatus,
                    }],
                ),
                'medium',
            ),
            /本地时钟结算/u,
        );
    }
    assert.throws(
        () => applyCalendarProposal(
            state,
            createProposal(
                state,
                [{
                    ...cancelled,
                    planningTier:
                        'high',
                }],
            ),
            'high',
        ),
        /High proposal.*entries|未知字段：entries/u,
    );
});

test('past, terminal and Scene-linked entry fields remain read-only and byte-stable', () => {
    const completed =
        createEntry(
            'past_exam',
            {
                status:
                    'completed',
                startClock:
                    '1991-09-03 · 08:00',
                endClock:
                    '1991-09-03 · 09:00',
                relatedSceneIds: [
                    'scene_before_class',
                ],
            },
        );
    const cancelled =
        createEntry(
            'cancelled_meeting',
            {
                status:
                    'cancelled',
            },
        );
    const stalePlanned =
        createEntry(
            'unsettled_past_entry',
            {
                startClock:
                    '1991-09-03 · 08:00',
                endClock:
                    '1991-09-03 · 09:00',
            },
        );
    const state =
        createState(
            [
                completed,
                cancelled,
                stalePlanned,
            ],
            {
                clock:
                    '1991-09-03 · 13:00',
            },
        );
    const before =
        JSON.stringify(
            state.calendar.entries,
        );

    for (const entry of [
        {
            ...completed,
            titleEn:
                'Must not rewrite the past',
        },
        {
            ...cancelled,
            titleEn:
                'Must not reopen a cancelled entry',
        },
        {
            ...stalePlanned,
            titleEn:
                'Must not reschedule a past entry',
        },
    ]) {
        assert.throws(
            () => applyCalendarProposal(
                state,
                createProposal(
                    state,
                    [entry],
                ),
                'medium',
            ),
            /已结束，只能只读|不得被改写到过去/u,
        );
    }

    assert.throws(
        () => applyCalendarProposal(
            state,
            createProposal(
                state,
                [{
                    ...completed,
                    relatedSceneIds: [
                        'scene_before_class',
                        'scene_after_class',
                    ],
                }],
            ),
            'medium',
        ),
        /relatedSceneIds 只能由 Scene 封存 Reducer/u,
    );
    assert.equal(
        JSON.stringify(
            state.calendar.entries,
        ),
        before,
    );
});

test('[defect-probing] schedule projections exclude storyline and storyBeat while the storyline projection reports 0..4 progress', () => {
    const date =
        createEntry(
            'charms_date',
            {
                parentId:
                    'school_year_storyline',
                tags: [
                    'date',
                ],
                mapId:
                    'hogsmeade',
                roomId:
                    'three_broomsticks',
            },
        );
    const storyline =
        createStoryline(
            'school_year_storyline',
            {
                tags: [
                    'canon',
                ],
                startClock:
                    '1991-09-02 · 08:00',
                endClock:
                    '1991-09-04 · 18:00',
            },
        );
    const beat =
        createStoryBeat(
            'school_year_first_term',
            {
                storylineId:
                    storyline.id,
                relatedSceneIds: [
                    'scene_before_class',
                    'scene_after_class',
                ],
            },
        );
    const exam =
        createEntry(
            'charms_exam',
            {
                parentId:
                    storyline.id,
                tags: [
                    'exam',
                    'canon',
                ],
                status:
                    'completed',
            },
        );
    const cancelled =
        createEntry(
            'cancelled_class',
            {
                tags: [
                    'class',
                ],
                status:
                    'cancelled',
            },
        );
    const later =
        createEntry(
            'later_practice',
            {
                startClock:
                    '1991-09-05 · 11:00',
                endClock:
                    '1991-09-05 · 12:00',
            },
        );
    const state =
        createState(
            [
                date,
                exam,
                cancelled,
                later,
            ],
            {
                clock:
                    '1991-09-03 · 11:30',
            },
        );
    state.calendar.storylines = [
        storyline,
    ];
    state.calendar.storyBeats = [
        beat,
    ];
    const ids = entries =>
        entries.map(entry =>
            entry.id);

    assert.deepEqual(
        ids(
            projectCalendarByDate(
                state,
                '1991-09-03',
            ),
        ),
        [
            date.id,
            exam.id,
            cancelled.id,
        ],
    );
    assert.deepEqual(
        ids(
            projectCalendarByParent(
                state,
                storyline.id,
            ),
        ),
        [
            date.id,
            exam.id,
        ],
    );
    assert.deepEqual(
        ids(
            projectCalendarByTag(
                state,
                ' CANON ',
            ),
        ),
        [
            exam.id,
        ],
    );
    assert.deepEqual(
        ids(
            projectCalendarToday(
                state,
            ),
        ),
        [
            date.id,
            exam.id,
            cancelled.id,
        ],
    );
    assert.deepEqual(
        ids(
            projectUpcomingCalendar(
                state,
                state.clock,
                1,
            ),
        ),
        [
            date.id,
            exam.id,
            cancelled.id,
        ],
    );
    const moment =
        projectCalendarAtMoment(
            state,
            state.clock,
        );
    assert.deepEqual(
        ids(moment),
        [
            date.id,
            exam.id,
        ],
        'specified moments include every overlapping schedule except explicitly cancelled schedules',
    );
    moment.forEach(entry => {
        assert.deepEqual(
            Object.keys(entry),
            CALENDAR_ENTRY_FIELDS,
        );
    });
    assert.deepEqual(
        ids(
            projectCalendarByDate(
                [
                    storyline,
                    beat,
                    date,
                ],
                '1991-09-03',
            ),
        ),
        [date.id],
        'the compatibility array input also narrows mixed records to schedules',
    );

    assert.equal(
        typeof calendarProjection
            .projectCalendarStorylines,
        'function',
    );
    const storylines =
        calendarProjection
            .projectCalendarStorylines(
                state,
            );
    assert.equal(
        storylines.length,
        1,
    );
    assert.equal(
        storylines[0].id,
        storyline.id,
    );
    assert.equal(
        storylines[0]
            .storyBeats[0].id,
        beat.id,
    );
    assert.equal(
        storylines[0]
            .storyBeats[0]
            .sceneProgress,
        2,
    );
    assert.equal(
        storylines[0]
            .storyBeats[0]
            .sceneTarget,
        4,
    );
    storylines[0]
        .storyBeats[0]
        .relatedSceneIds
        .push('mutated_projection');
    assert.deepEqual(
        state.calendar
            .storyBeats[0]
            .relatedSceneIds,
        [
            'scene_before_class',
            'scene_after_class',
        ],
        'storyline projections are detached from authority state',
    );
});

test('[defect-probing] Scene archival realizes a beat only after four distinct linked Scenes', () => {
    const storyline =
        createStoryline();
    const beat =
        createStoryBeat();
    const schedules =
        Array.from(
            {
                length: 4,
            },
            (_, index) =>
                createEntry(
                    `house_cup_scene_${index + 1}`,
                    {
                        parentId:
                            storyline.id,
                        sourceBeatId:
                            beat.id,
                        beatSlot:
                            index + 1,
                        scheduleKind:
                            'story',
                    },
                ),
        );
    let state =
        createState(schedules);
    state.calendar.storylines = [
        storyline,
    ];
    state.calendar.storyBeats = [
        beat,
    ];

    for (
        let index = 0;
        index < 3;
        index += 1
    ) {
        state =
            archiveSceneWithCalendarLinks(
                state,
                {
                    id:
                        `house_cup_archive_${index + 1}`,
                    calendarEntryIds: [
                        schedules[index].id,
                    ],
                },
            );
    }
    assert.deepEqual(
        state.calendar
            .storyBeats[0]
            .relatedSceneIds,
        [
            'house_cup_archive_1',
            'house_cup_archive_2',
            'house_cup_archive_3',
        ],
    );
    assert.notEqual(
        state.calendar
            .storyBeats[0].status,
        'realized',
        'three observed Scenes cannot realize the beat',
    );

    state =
        archiveSceneWithCalendarLinks(
            state,
            {
                id:
                    'house_cup_archive_4',
                calendarEntryIds: [
                    schedules[3].id,
                    schedules[3].id,
                ],
            },
        );
    const realizedBeat =
        state.calendar
            .storyBeats[0];
    assert.deepEqual(
        realizedBeat.relatedSceneIds,
        [
            'house_cup_archive_1',
            'house_cup_archive_2',
            'house_cup_archive_3',
            'house_cup_archive_4',
        ],
    );
    assert.equal(
        realizedBeat.status,
        'realized',
    );
    assert.equal(
        Object.hasOwn(
            state,
            'calendarResults',
        ),
        false,
    );
});

test('[defect-probing] an expired beat with only three observed Scenes remains as deferred residue', () => {
    const storyline =
        createStoryline();
    const beat =
        createStoryBeat(
            'house_cup_expired',
            {
                windowEndClock:
                    '1991-09-03 · 10:00',
                relatedSceneIds: [
                    'scene_before_class',
                    'scene_after_class',
                ],
            },
        );
    const schedule =
        createEntry(
            'house_cup_expired_slot',
            {
                parentId:
                    storyline.id,
                sourceBeatId:
                    beat.id,
                beatSlot: 3,
                scheduleKind:
                    'story',
            },
        );
    const state =
        createState(
            [schedule],
        );
    state.calendar.storylines = [
        storyline,
    ];
    state.calendar.storyBeats = [
        beat,
    ];
    const outsideCalendar =
        withoutCalendar(state);

    const archived =
        archiveSceneWithCalendarLinks(
            state,
            {
                id:
                    'house_cup_archive_3',
                calendarEntryIds: [
                    schedule.id,
                ],
            },
        );
    const deferredBeat =
        archived.calendar
            .storyBeats[0];

    assert.equal(
        deferredBeat.status,
        'deferred',
    );
    assert.deepEqual(
        deferredBeat.relatedSceneIds,
        [
            'scene_before_class',
            'scene_after_class',
            'house_cup_archive_3',
        ],
    );
    const archivedOutsideCalendar =
        withoutCalendar(archived);
    assert.deepEqual(
        {
            ...archivedOutsideCalendar,
            sceneArchive:
                outsideCalendar
                    .sceneArchive,
        },
        outsideCalendar,
        'beat lifecycle writes no Item, Identity, Social, Memory or Scene outcome',
    );
});

test('projection and reducer functions are pure and never create a second domain fact', () => {
    const entry =
        createEntry(
            'charms_exam',
            {
                tags: [
                    'exam',
                ],
            },
        );
    const state =
        createState([
            entry,
        ]);
    const before =
        structuredClone(state);
    const projection =
        projectCalendarAtMoment(
            state,
            START_CLOCK,
        );
    projection[0].titleEn =
        'mutated projection';
    projection[0].tags
        .push('mutated');
    assert.deepEqual(
        state,
        before,
    );

    const updated = {
        ...entry,
        summaryEn:
            'Public exam schedule update.',
    };
    const applied =
        applyCalendarProposal(
            state,
            createProposal(
                state,
                [updated],
            ),
            'medium',
        );
    assert.deepEqual(
        withoutCalendar(applied),
        withoutCalendar(state),
    );
    assert.equal(
        applied.items,
        state.items,
    );
    assert.equal(
        applied.identityState,
        state.identityState,
    );
    assert.equal(
        applied.socialGraph,
        state.socialGraph,
    );
    assert.equal(
        applied.memoryDirector,
        state.memoryDirector,
    );
    assert.equal(
        Object.hasOwn(
            applied,
            'calendarResults',
        ),
        false,
    );
});
