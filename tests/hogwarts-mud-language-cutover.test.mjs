/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    existsSync,
} from 'node:fs';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    TINA_MESSAGE_AFTER,
    migrateLanguageAuthorityV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/language-authority-migration.js';
import {
    migrateActorContextV1,
    validateActorContextStateV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    seedLanguageAuthorityTranslations,
} from '../public/scripts/extensions/hogwarts-mud/domain/language-authority-seeding.js';
import {
    createTranslationRowKey,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-contract.js';
import {
    SaveRevisionConflictError,
    createGuardedSavePorts,
} from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import {
    createSaveRevisionGuard,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import {
    createSaveLibrary,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-library.js';
import {
    auditLanguageStructure,
} from '../scripts/audit-hogwarts-language-boundary.mjs';

const LEGACY_TINA_ARCHIVE_PATH =
    new URL(
        '../data/default-user/backups/chat_hogwarts_world_director_language-authority-v1-pre-r124.jsonl',
        import.meta.url,
    );

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
            return values.get(key) ??
                null;
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

function createState() {
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'language_cutover_timeline',
        stateRevision: 3,
        revisionHistory: [],
        languageAuthorityVersion: 0,
        clock:
            '1991-07-24 · 10:00',
    };
}

function createHarness({
    saveResult = {
        durable: true,
    },
} = {}) {
    const saveCalls = {
        chat: 0,
        metadata: 0,
    };
    const hostChat = [{
        is_user: true,
        mes: '原始玩家动作',
    }, {
        is_user: false,
        mes: 'Original assistant text.',
    }];
    let persistedChat = [];
    const context = {
        chatId:
            'language-cutover',
        chatMetadata: {
            hogwartsMud:
                createState(),
        },
        chat: hostChat,
        async saveMetadata() {
            saveCalls.metadata += 1;
            return {
                durable: true,
            };
        },
        async saveChat() {
            saveCalls.chat += 1;
            persistedChat =
                structuredClone(
                    hostChat,
                );
            return saveResult;
        },
    };
    let claim = 0;
    const ports =
        createGuardedSavePorts({
            getContext:
                () => context,
            guard:
                createSaveRevisionGuard({
                    storage:
                        createStorage(),
                    lockManager:
                        null,
                    createClaimId:
                        () =>
                            `language_cutover_${
                                claim += 1
                            }`,
                    now:
                        () =>
                            '2026-08-15T00:00:00.000Z',
                }),
        });
    return {
        context,
        get persistedChat() {
            return persistedChat;
        },
        hostChat,
        ports,
        saveCalls,
    };
}

test('whole-timeline rewrite commits State and chat through one saveChat call', async () => {
    const harness =
        createHarness();
    const {
        context,
        hostChat,
        ports,
        saveCalls,
    } = harness;
    await ports
        .registerSaveRevisionHead({
            persistMigration:
                false,
        });
    const currentState =
        structuredClone(
            context
                .chatMetadata
                .hogwartsMud,
        );
    const currentChat =
        structuredClone(
            context.chat,
        );
    const nextState = {
        ...currentState,
        languageAuthorityVersion:
            1,
    };
    const nextChat =
        structuredClone(
            currentChat,
        );
    nextChat[1].extra = {
        hogwartsMud: {
            languageVersion: 1,
        },
    };

    const result =
        await ports
            .guardedRewriteTimeline({
                currentState,
                nextState,
                currentChat,
                nextChat,
            });

    assert.equal(
        result.ok,
        true,
    );
    assert.equal(
        result.state
            .stateRevision,
        4,
    );
    assert.equal(
        context
            .chatMetadata
            .hogwartsMud
            .languageAuthorityVersion,
        1,
    );
    assert.deepEqual(
        context.chat,
        nextChat,
    );
    assert.equal(
        context.chat,
        hostChat,
    );
    assert.deepEqual(
        harness.persistedChat,
        nextChat,
    );
    assert.deepEqual(
        saveCalls,
        {
            chat: 1,
            metadata: 0,
        },
    );
});

test('whole-timeline rewrite rejects a stale current chat before host save', async () => {
    const {
        context,
        ports,
        saveCalls,
    } = createHarness();
    await ports
        .registerSaveRevisionHead({
            persistMigration:
                false,
        });
    const currentState =
        structuredClone(
            context
                .chatMetadata
                .hogwartsMud,
        );
    const staleChat = [{
        mes: 'stale',
    }];

    await assert.rejects(
        ports
            .guardedRewriteTimeline({
                currentState,
                nextState: {
                    ...currentState,
                    languageAuthorityVersion:
                        1,
                },
                currentChat:
                    staleChat,
                nextChat:
                    staleChat,
            }),
        error =>
            error instanceof
                SaveRevisionConflictError &&
            error.code ===
                'stale_chat',
    );
    assert.deepEqual(
        saveCalls,
        {
            chat: 0,
            metadata: 0,
        },
    );
});

test('confirmed rewrite failure restores the exact prior State and chat objects', async () => {
    const {
        context,
        ports,
        saveCalls,
    } = createHarness({
        saveResult: {
            durable: false,
            confirmedFailure: true,
        },
    });
    await ports
        .registerSaveRevisionHead({
            persistMigration:
                false,
        });
    const previousState =
        context
            .chatMetadata
            .hogwartsMud;
    const previousChat =
        context.chat;
    const currentState =
        structuredClone(
            previousState,
        );
    const currentChat =
        structuredClone(
            previousChat,
        );

    await assert.rejects(
        ports
            .guardedRewriteTimeline({
                currentState,
                nextState: {
                    ...currentState,
                    languageAuthorityVersion:
                        1,
                },
                currentChat,
                nextChat: [{
                    mes: 'rewritten',
                }],
            }),
        error =>
            error?.code ===
                'host_save_not_durable' &&
            error
                .confirmedFailure ===
                true,
    );
    assert.equal(
        context
            .chatMetadata
            .hogwartsMud,
        previousState,
    );
    assert.equal(
        context.chat,
        previousChat,
    );
    assert.deepEqual(
        saveCalls,
        {
            chat: 1,
            metadata: 0,
        },
    );
});

async function readTinaArchive() {
    const contents =
        await readFile(
            LEGACY_TINA_ARCHIVE_PATH,
            'utf8',
        );
    const records =
        contents
            .trim()
            .split(/\n/u)
            .map(line =>
                JSON.parse(line));
    return {
        contents,
        state:
            records[0]
                .chat_metadata
                .hogwartsMud,
        chat:
            records.slice(1),
    };
}

function itemInvariant(state) {
    return (
        state.items ||
        []
    ).map(item => ({
        id: item.id,
        state: item.state,
        physicalForm:
            item.physicalForm,
        ownerId:
            item.ownerId,
        holderId:
            item.holderId,
        location:
            item.location,
    }));
}

test(
    'real Tina dry-run produces English Authority V1 without touching source bytes',
    {
        skip:
            !existsSync(
                LEGACY_TINA_ARCHIVE_PATH,
            ),
    },
    async () => {
        const source =
            await readTinaArchive();
        const beforeState =
            JSON.stringify(
                source.state,
            );
        const beforeChat =
            JSON.stringify(
                source.chat,
            );
        const migration =
            migrateLanguageAuthorityV1({
                worldState:
                    migrateActorContextV1(
                        source.state,
                    ).state,
                chat:
                    source.chat,
            });
        const afterContents =
            await readFile(
                LEGACY_TINA_ARCHIVE_PATH,
                'utf8',
            );

        assert.equal(
            afterContents,
            source.contents,
        );
        assert.equal(
            JSON.stringify(
                source.state,
            ),
            beforeState,
        );
        assert.equal(
            JSON.stringify(
                source.chat,
            ),
            beforeChat,
        );
        assert.equal(
            migration.report
                .timelineEntries,
            127,
        );
        assert.deepEqual(
            {
                language:
                    migration
                        .nextState
                        .languageAuthorityVersion,
                character:
                    migration
                        .nextState
                        .characterLanguageVersion,
                calendar:
                    migration
                        .nextState
                        .calendar.version,
                item:
                    migration
                        .nextState
                        .itemSystemVersion,
                material:
                    migration
                        .nextState
                        .materialStateVersion,
                spell:
                    migration
                        .nextState
                        .spellbook.version,
                map:
                    migration
                        .nextState
                        .map
                        .localMapVersion,
            },
            {
                language: 1,
                character: 2,
                calendar: 3,
                item: 4,
                material: 3,
                spell: 3,
                map: 2,
            },
        );
        assert.equal(
            migration
                .nextState
                .chapterEn,
            'The First Evening',
        );
        assert.equal(
            migration
                .nextState
                .sceneArchive[0]
                .timelineEntries[3]
                .summaryEn,
            TINA_MESSAGE_AFTER,
        );
        assert.equal(
            migration
                .nextState
                .sceneArchive[0]
                .timelineEntries[3]
                .sourceRef,
            'message:6:public_event',
        );
        assert.equal(
            migration
                .nextChat[6]
                .extra
                .hogwartsMud
                .turnTransaction
                .publicEventEn,
            TINA_MESSAGE_AFTER,
        );
        assert.equal(
            migration
                .nextChat[6]
                .swipe_info[0]
                .extra
                .hogwartsMud
                .turnTransaction
                .publicEventEn,
            TINA_MESSAGE_AFTER,
        );
        assert.equal(
            migration
                .nextState
                .actorPresentations
                .canon_lavender_brown
                .outfitEn,
            'robes',
        );
        assert.equal(
            migration
                .nextState
                .actorPresentations
                .canon_harry_james_potter
                .heldObjectEn,
            'his pumpkin juice, held up in front of himself',
        );
        assert.deepEqual(
            itemInvariant(
                migration
                    .nextState,
            ),
            itemInvariant(
                source.state,
            ),
        );
        assert.ok(
            migration
                .translationCandidates
                .length >
            1_000,
        );
        assert.equal(
            migration
                .translationCandidates
                .some(candidate =>
                    /\p{Script=Han}/u
                        .test(
                            candidate
                                .sourceText,
                        )),
            false,
        );
        const audit =
            auditLanguageStructure({
                state:
                    migration
                        .nextState,
                messages:
                    migration
                        .nextChat,
            });
        assert.deepEqual(
            audit.violations,
            [],
        );
        assert.deepEqual(
            audit.unknownPaths,
            [],
        );
        assert.deepEqual(
            validateActorContextStateV1(
                migration.nextState,
            ).errors,
            [],
        );
    },
);

test(
    'real Tina language migration is byte-idempotent',
    {
        skip:
            !existsSync(
                LEGACY_TINA_ARCHIVE_PATH,
            ),
    },
    async () => {
        const source =
            await readTinaArchive();
        const first =
            migrateLanguageAuthorityV1({
                worldState:
                    source.state,
                chat:
                    source.chat,
            });
        const second =
            migrateLanguageAuthorityV1({
                worldState:
                    first.nextState,
                chat:
                    first.nextChat,
            });

        assert.equal(
            second.changed,
            false,
        );
        assert.equal(
            JSON.stringify(
                second.nextState,
            ),
            JSON.stringify(
                first.nextState,
            ),
        );
        assert.equal(
            JSON.stringify(
                second.nextChat,
            ),
            JSON.stringify(
                first.nextChat,
            ),
        );
    },
);

test(
    'Tina exact-before mismatch blocks dry-run without mutating inputs',
    {
        skip:
            !existsSync(
                LEGACY_TINA_ARCHIVE_PATH,
            ),
    },
    async () => {
        const source =
            await readTinaArchive();
        const state =
            structuredClone(
                source.state,
            );
        const chat =
            structuredClone(
                source.chat,
            );
        const beforeState =
            JSON.stringify(state);
        chat[6].extra
            .hogwartsMud
            .turnTransaction
            .publicEventEn =
            'mismatched';
        const beforeChat =
            JSON.stringify(chat);

        assert.throws(
            () =>
                migrateLanguageAuthorityV1({
                    worldState:
                        state,
                    chat,
                }),
            /Tina message 6 publicEventEn exact-before guard failed/u,
        );
        assert.equal(
            JSON.stringify(state),
            beforeState,
        );
        assert.equal(
            JSON.stringify(chat),
            beforeChat,
        );
        assert.equal(
            chat[6].extra
                .hogwartsMud
                .turnTransaction
                .publicEventEn,
            'mismatched',
        );
    },
);

function createSeedAdapter({
    omitLastQueryRow = false,
    upsertError = null,
} = {}) {
    const rows =
        new Map();
    const calls = {
        upsert: [],
        query: [],
    };
    return {
        calls,
        async createReadyRow(
            candidate,
        ) {
            const row = {
                ...candidate,
                sourceHash:
                    `hash:${
                        candidate
                            .sourceText
                    }`,
                status: 'ready',
            };
            return {
                key:
                    await createTranslationRowKey(
                        row,
                    ),
                row,
            };
        },
        async upsertRows(
            _timelineEpoch,
            batch,
        ) {
            calls.upsert.push(
                batch,
            );
            if (upsertError) {
                throw upsertError;
            }
            for (const row of batch) {
                const key =
                    await createTranslationRowKey(
                        row,
                    );
                rows.set(
                    key,
                    row,
                );
            }
            return {
                acceptedKeys:
                    await Promise.all(
                        batch.map(row =>
                            createTranslationRowKey(
                                row,
                            )),
                    ),
            };
        },
        async queryRows(
            _timelineEpoch,
            keys,
        ) {
            calls.query.push(
                keys,
            );
            const selected =
                keys
                    .map(key =>
                        rows.get(key))
                    .filter(Boolean);
            if (
                omitLastQueryRow
            ) {
                selected.pop();
            }
            return {
                rows:
                    selected,
            };
        },
    };
}

function createSeedCandidates(
    count,
) {
    return Array.from(
        {
            length:
                count,
        },
        (
            _,
            index,
        ) => ({
            recordKind:
                'message_segment',
            recordId:
                `message:${index}`,
            fieldPath:
                'textEn',
            sourceText:
                `English ${index}`,
            translatedText:
                `中文 ${index}`,
        }),
    );
}

test('translation seeding upserts bounded batches and verifies every row', async () => {
    const adapter =
        createSeedAdapter();
    const result =
        await seedLanguageAuthorityTranslations({
            timelineEpoch:
                'seed_timeline',
            candidates:
                createSeedCandidates(
                    513,
                ),
            localizationTable:
                adapter,
        });

    assert.equal(
        result.rowCount,
        513,
    );
    assert.deepEqual(
        adapter.calls
            .upsert
            .map(batch =>
                batch.length),
        [
            256,
            256,
            1,
        ],
    );
    assert.deepEqual(
        adapter.calls
            .query
            .map(batch =>
                batch.length),
        [
            513,
        ],
    );
});

test('translation seed read-back mismatch blocks migration without retry', async () => {
    const adapter =
        createSeedAdapter({
            omitLastQueryRow:
                true,
        });

    await assert.rejects(
        seedLanguageAuthorityTranslations({
            timelineEpoch:
                'seed_timeline',
            candidates:
                createSeedCandidates(
                    3,
                ),
            localizationTable:
                adapter,
        }),
        /Translation seed read-back mismatch/u,
    );
    assert.equal(
        adapter.calls
            .upsert
            .length,
        1,
    );
    assert.equal(
        adapter.calls
            .query
            .length,
        1,
    );
});

test('translation seed upsert failure surfaces once without query or retry', async () => {
    const failure =
        new Error(
            'forced seed failure',
        );
    const adapter =
        createSeedAdapter({
            upsertError:
                failure,
        });

    await assert.rejects(
        seedLanguageAuthorityTranslations({
            timelineEpoch:
                'seed_timeline',
            candidates:
                createSeedCandidates(
                    3,
                ),
            localizationTable:
                adapter,
        }),
        error =>
            error === failure,
    );
    assert.equal(
        adapter.calls
            .upsert
            .length,
        1,
    );
    assert.equal(
        adapter.calls
            .query
            .length,
        0,
    );
});

test(
    'Save Library seeds and verifies translations before one timeline rewrite',
    {
        skip:
            !existsSync(
                LEGACY_TINA_ARCHIVE_PATH,
            ),
    },
    async () => {
        const source =
            await readTinaArchive();
        const context = {
            chatMetadata: {
                hogwartsMud:
                    structuredClone(
                        source.state,
                    ),
            },
            chat:
                structuredClone(
                    source.chat,
                ),
        };
        const order = [];
        const adapter =
            createSeedAdapter();
        const originalUpsert =
            adapter.upsertRows;
        adapter.upsertRows =
            async (
                timelineEpoch,
                rows,
            ) => {
                order.push(
                    'seed',
                );
                return originalUpsert(
                    timelineEpoch,
                    rows,
                );
            };
        let rewriteCalls = 0;
        const library =
            createSaveLibrary({
                refs: {
                    root: {},
                },
                session: {},
                localizationTable:
                    adapter,
                guardedRewriteTimeline:
                    async ({
                        nextState,
                        nextChat,
                    }) => {
                        order.push(
                            'rewrite',
                        );
                        rewriteCalls += 1;
                        context
                            .chatMetadata
                            .hogwartsMud =
                            structuredClone(
                                nextState,
                            );
                        context.chat =
                            structuredClone(
                                nextChat,
                            );
                    },
            });

        const result =
            await library
                .migrateLoadedLanguageAuthority(
                    context,
                );

        assert.equal(
            result.changed,
            true,
        );
        assert.equal(
            rewriteCalls,
            1,
        );
        assert.equal(
            order.at(-1),
            'rewrite',
        );
        assert.equal(
            adapter.calls
                .upsert
                .flat()[0]
                .providerId,
            'local',
        );
        assert.equal(
            order
                .slice(
                    0,
                    -1,
                )
                .every(value =>
                    value ===
                    'seed'),
            true,
        );
        assert.equal(
            context
                .chatMetadata
                .hogwartsMud
                .languageAuthorityVersion,
            1,
        );
    },
);

test(
    'Save Library never rewrites JSONL when translation read-back fails',
    {
        skip:
            !existsSync(
                LEGACY_TINA_ARCHIVE_PATH,
            ),
    },
    async () => {
        const source =
            await readTinaArchive();
        const context = {
            chatMetadata: {
                hogwartsMud:
                    structuredClone(
                        source.state,
                    ),
            },
            chat:
                structuredClone(
                    source.chat,
                ),
        };
        const beforeState =
            JSON.stringify(
                context
                    .chatMetadata
                    .hogwartsMud,
            );
        const beforeChat =
            JSON.stringify(
                context.chat,
            );
        let rewriteCalls = 0;
        const library =
            createSaveLibrary({
                refs: {
                    root: {},
                },
                session: {},
                localizationTable:
                    createSeedAdapter({
                        omitLastQueryRow:
                            true,
                    }),
                guardedRewriteTimeline:
                    async () => {
                        rewriteCalls += 1;
                    },
            });

        await assert.rejects(
            library
                .migrateLoadedLanguageAuthority(
                    context,
                ),
            /Translation seed read-back mismatch/u,
        );
        assert.equal(
            rewriteCalls,
            0,
        );
        assert.equal(
            JSON.stringify(
                context
                    .chatMetadata
                    .hogwartsMud,
            ),
            beforeState,
        );
        assert.equal(
            JSON.stringify(
                context.chat,
            ),
            beforeChat,
        );
    },
);
