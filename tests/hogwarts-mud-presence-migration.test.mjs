/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    mkdtemp,
    readFile,
    stat,
    writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    atomicReplaceFile,
    restoreManifest,
    runCli,
    runMigration,
} from '../scripts/migrate-hogwarts-presence-witness.mjs';

const occupantIds = [
    'canon_dean_thomas',
    'canon_filius_flitwick',
    'canon_harry_james_potter',
    'canon_hermione_jean_granger',
    'canon_lavender_brown',
    'canon_neville_longbottom',
    'canon_ronald_bilius_weasley',
    'canon_seamus_finnigan',
];

function hash(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function message(value) {
    return JSON.stringify(value);
}

function createFixture() {
    const relationships =
        Array.from(
            { length: 33 },
            (_, index) => ({
                id: `relationship_${index}`,
                warmth: index,
                evidenceIds: [
                    `evidence_${index}`,
                ],
            }),
        );
    const relationshipEvidence =
        Array.from(
            { length: 91 },
            (_, index) => ({
                id: `evidence_${index}`,
                sourceActorId:
                    occupantIds[
                        index %
                        occupantIds.length
                    ],
            }),
        );
    const memories =
        Array.from(
            { length: 64 },
            (_, index) => ({
                id: `memory_${index}`,
                summaryEn:
                    `Memory ${index}`,
            }),
        );
    const actors =
        occupantIds.map(
            (id, index) => ({
                id,
                present: [
                    'canon_ronald_bilius_weasley',
                    'canon_lavender_brown',
                ].includes(id),
                lifeStatus: 'alive',
                mapId:
                    index % 2
                        ? 'hogwarts_castle'
                        : 'stale_map',
                roomId:
                    index % 2
                        ? 'stale_room'
                        : 'great_hall',
            }),
        );
    const state = {
        clock:
            '1991-09-02 · 11:05',
        turn: {
            count: 91,
            status: 'idle',
        },
        cursor: null,
        scene: {
            id:
                'first_charms_lesson',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
        },
        actors,
        actorLibrary:
            actors.map(
                (actor, index) => ({
                    id: actor.id,
                    sharedMemories: {
                        core:
                            index === 0
                                ? memories
                                : [],
                        recent: [],
                        everyday: [],
                    },
                }),
            ),
        items:
            Array.from(
                { length: 5 },
                (_, index) => ({
                    id: `item_${index}`,
                    status: 'available',
                }),
            ),
        socialGraph: {
            relationships,
            relationshipEvidence,
        },
        sceneArchive: [{
            id: 'prior_scene',
            actorIds: [
                'canon_hermione_jean_granger',
            ],
            messageIds: [0],
        }],
        knowledgeBase: {
            vectorStatus: 'ready',
            vectorError: '',
            recordHashes: {
                'actors:ron': 1,
                'scenes:prior_scene': 2,
                'events:turn-1': 3,
            },
        },
    };
    const header = {
        character_name:
            'Hogwarts World Director',
        user_name: 'Tina',
        chat_metadata: {
            hogwartsMud: state,
        },
    };
    const openingText = [
        'Hermione arrived and sat behind Lavender.',
        'Harry Potter and Ron Weasley came through the door and sat down.',
        'Seamus sat on the far side.',
        'Dean arrived and sat down.',
        'Neville arrived last.',
        'Professor Flitwick climbed onto three books and stood at the front.',
    ].join(' ');
    const accidentNarrative = [
        'Tina cast at Ron.',
        'Ron\'s feet left the floor.',
        'His trainers kicked at nothing. The class erupted — someone gasped, someone laughed, a chair scraped back hard against the stone floor.',
        'Professor Flitwick lowered Ron safely.',
    ].join(' ');
    const messages = [
        {
            name: 'Scene',
            is_user: false,
            mes: openingText,
            extra: {
                hogwartsMud: {
                    role: 'scene_opening',
                    sceneId:
                        'first_charms_lesson',
                    sourceEn:
                        openingText,
                },
            },
        },
        {
            name: 'User',
            is_user: true,
            mes:
                'Tina points at Ron and shouts Wingardium Leviosa.',
            extra: {
                hogwartsMud: {
                    sceneId:
                        'first_charms_lesson',
                    spellCasts: [{
                        spellId:
                            'wingardium_leviosa',
                    }],
                    checkResolution: {
                        outcome:
                            'critical_success',
                    },
                },
            },
        },
        {
            name: 'Scene',
            is_user: false,
            mes:
                accidentNarrative,
            extra: {
                hogwartsMud: {
                    role: 'scene_turn',
                    sceneId:
                        'first_charms_lesson',
                    sourceEn:
                        accidentNarrative,
                    turnTransaction: {
                        spellCasts: [{
                            spellId:
                                'wingardium_leviosa',
                        }],
                        actorPresence: {
                            presentActorIdsAfterTurn: [
                                'canon_ronald_bilius_weasley',
                                'canon_filius_flitwick',
                            ],
                        },
                    },
                },
            },
        },
        {
            name: 'Scene',
            is_user: false,
            mes:
                'The lesson continued.',
            extra: {
                hogwartsMud: {
                    role: 'scene_turn',
                    sceneId:
                        'first_charms_lesson',
                    turnTransaction: {
                        actorPresence: {
                            presentActorIdsAfterTurn: [
                                'canon_ronald_bilius_weasley',
                                'canon_lavender_brown',
                            ],
                        },
                    },
                },
            },
        },
    ];
    const body =
        Buffer.from(
            `\n${messages.map(message).join('\n')}`,
        );
    return {
        source:
            Buffer.concat([
                Buffer.from(
                    JSON.stringify(
                        header,
                    ),
                ),
                body,
            ]),
        body,
        state,
    };
}

function splitFile(source) {
    const newline =
        source.indexOf(0x0a);
    return {
        header:
            JSON.parse(
                source
                    .subarray(0, newline)
                    .toString('utf8'),
            ),
        body:
            source.subarray(newline),
    };
}

function protectedState(state) {
    return {
        clock: state.clock,
        turn: state.turn,
        cursor: state.cursor,
        sceneId: state.scene.id,
        relationships:
            state.socialGraph
                .relationships,
        relationshipEvidence:
            state.socialGraph
                .relationshipEvidence,
        sharedMemories:
            state.actorLibrary
                .flatMap(actor => [
                    ...(
                        actor
                            .sharedMemories
                            ?.core ||
                        []
                    ),
                    ...(
                        actor
                            .sharedMemories
                            ?.recent ||
                        []
                    ),
                    ...(
                        actor
                            .sharedMemories
                            ?.everyday ||
                        []
                    ),
                ]),
        items: state.items,
    };
}

test('dry-run, apply, no-op, restore, and re-apply preserve archive bytes and state invariants', async () => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-presence-',
            ),
        );
    const chatDirectory =
        path.join(root, 'chats');
    const backupRoot =
        path.join(root, 'backups');
    const file =
        path.join(
            chatDirectory,
            'Tina.jsonl',
        );
    await import('node:fs/promises')
        .then(module =>
            module.mkdir(
                chatDirectory,
                {
                    recursive: true,
                },
            ));
    const fixture =
        createFixture();
    await writeFile(
        file,
        fixture.source,
    );
    const beforeStat =
        await stat(file);
    const beforeHash =
        hash(
            await readFile(file),
        );
    const protectedBefore =
        protectedState(
            fixture.state,
        );

    const dryRun =
        await runCli([
            '--dry-run',
            '--file',
            file,
            '--backup-root',
            backupRoot,
        ]);
    const afterDryStat =
        await stat(file);
    assert.equal(
        dryRun.changed,
        1,
    );
    assert.equal(
        dryRun.networkCalls,
        0,
    );
    assert.equal(
        hash(await readFile(file)),
        beforeHash,
    );
    assert.equal(
        afterDryStat.mtimeMs,
        beforeStat.mtimeMs,
    );

    const applied =
        await runCli([
            '--apply',
            '--file',
            file,
            '--backup-root',
            backupRoot,
        ]);
    assert.equal(
        applied.networkCalls,
        0,
    );
    assert.equal(applied.changed, 1);
    assert.ok(applied.manifestPath);
    const manifest =
        JSON.parse(
            await readFile(
                applied.manifestPath,
                'utf8',
            ),
        );
    assert.equal(
        manifest.status,
        'completed',
    );
    assert.equal(
        manifest.entries[0]
            .before.sha256,
        beforeHash,
    );
    assert.equal(
        manifest.entries[0]
            .before.size,
        fixture.source.length,
    );
    assert.equal(
        manifest.entries[0]
            .before.mtimeMs,
        beforeStat.mtimeMs,
    );
    const afterSource =
        await readFile(file);
    const afterHash =
        hash(afterSource);
    const migrated =
        splitFile(afterSource);
    const state =
        migrated.header
            .chat_metadata
            .hogwartsMud;
    assert.deepEqual(
        migrated.body,
        fixture.body,
        'all bytes after the first metadata line must remain unchanged',
    );
    assert.deepEqual(
        protectedState(state),
        protectedBefore,
    );
    assert.equal(
        state.presenceWitnessVersion,
        1,
    );
    assert.deepEqual(
        state
            .activeInteractionActorIds,
        [
            'canon_lavender_brown',
            'canon_ronald_bilius_weasley',
        ],
    );
    assert.deepEqual(
        state.localPresence
            .occupantActorIds,
        occupantIds,
    );
    assert.deepEqual(
        state.localPresence
            .cohortIds,
        [
            'gryffindor_year1_charms_1991',
        ],
    );
    assert.equal(
        state.eventKnowledge.length,
        1,
    );
    assert.deepEqual(
        state.eventKnowledge[0]
            .sourceMessageIds,
        [1, 2],
    );
    assert.deepEqual(
        state.eventKnowledge[0]
            .witnessActorIds,
        occupantIds,
    );
    assert.deepEqual(
        state.eventKnowledge[0]
            .witnessCohortIds,
        [
            'gryffindor_year1_charms_1991',
        ],
    );
    assert.equal(
        state.socialGraph
            .relationships.length,
        33,
    );
    assert.equal(
        state.socialGraph
            .relationshipEvidence
            .length,
        91,
    );
    assert.equal(
        protectedState(state)
            .sharedMemories.length,
        64,
    );
    assert.equal(
        state.items.length,
        5,
    );
    assert.deepEqual(
        state.sceneArchive[0]
            .activeInteractionActorIds,
        [
            'canon_hermione_jean_granger',
        ],
    );
    assert.deepEqual(
        state.sceneArchive[0]
            .localOccupantActorIds,
        [
            'canon_hermione_jean_granger',
        ],
    );
    assert.deepEqual(
        state.sceneArchive[0]
            .localCohortIds,
        [],
    );
    assert.deepEqual(
        state.sceneArchive[0]
            .events,
        [],
    );
    assert.equal(
        state.knowledgeBase
            .vectorStatus,
        'stale',
    );
    assert.equal(
        state.knowledgeBase
            .recordHashes[
                'actors:ron'
            ],
        1,
    );
    assert.equal(
        state.knowledgeBase
            .recordHashes[
                'scenes:prior_scene'
            ],
        undefined,
    );

    const noOp =
        await runMigration({
            mode: 'apply',
            file,
            backupRoot,
        });
    assert.equal(noOp.changed, 0);
    assert.equal(noOp.noops, 1);
    assert.equal(
        hash(await readFile(file)),
        afterHash,
    );

    const restored =
        await restoreManifest(
            applied.manifestPath,
        );
    assert.equal(restored.restored, 1);
    assert.equal(
        hash(await readFile(file)),
        beforeHash,
    );

    const reapplied =
        await runMigration({
            mode: 'apply',
            file,
            backupRoot,
        });
    assert.equal(reapplied.changed, 1);
    assert.equal(
        hash(await readFile(file)),
        afterHash,
        're-apply after restore must produce the identical after hash',
    );
});

test('restore refuses a file changed after migration', async () => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-restore-',
            ),
        );
    const file =
        path.join(root, 'Tina.jsonl');
    const fixture =
        createFixture();
    await writeFile(
        file,
        fixture.source,
    );
    const applied =
        await runMigration({
            mode: 'apply',
            file,
            backupRoot:
                path.join(
                    root,
                    'backups',
                ),
        });
    const migrated =
        await readFile(file);
    await writeFile(
        file,
        Buffer.concat([
            migrated,
            Buffer.from('\nchanged'),
        ]),
    );
    await assert.rejects(
        restoreManifest(
            applied.manifestPath,
        ),
        /RESTORE_HASH_MISMATCH/u,
    );
});

test('atomic replacement enforces the expected source hash', async () => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-hash-',
            ),
        );
    const file =
        path.join(root, 'archive.jsonl');
    await writeFile(file, 'before');
    await assert.rejects(
        atomicReplaceFile(
            file,
            Buffer.from('after'),
            hash('not-before'),
        ),
        /SOURCE_HASH_MISMATCH/u,
    );
    assert.equal(
        await readFile(file, 'utf8'),
        'before',
    );
});

test('--all skips shell archives and never scans backup paths', async () => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-all-',
            ),
        );
    const fixture =
        createFixture();
    await writeFile(
        path.join(root, 'Tina.jsonl'),
        fixture.source,
    );
    await writeFile(
        path.join(root, 'shell.jsonl'),
        '{"chat_metadata":{},"user_name":"Tina"}',
    );
    const result =
        await runMigration({
            mode: 'dry-run',
            all: true,
            chatDirectory: root,
        });
    assert.equal(result.scanned, 2);
    assert.equal(result.changed, 1);
    assert.equal(result.skipped, 1);
    await assert.rejects(
        runMigration({
            mode: 'dry-run',
            file:
                path.join(
                    root,
                    'backups',
                    'Tina.jsonl',
                ),
        }),
        /Backup paths are not migration inputs/u,
    );
});
