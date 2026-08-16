import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    appendFile,
    mkdtemp,
    readFile,
    rm,
    stat,
} from 'node:fs/promises';
import {
    tmpdir,
} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    createLocalizationTableAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/localization-table.js';
import {
    TRANSLATION_API_CONTRACT_VERSION,
    TRANSLATION_RECORD_SCHEMA_VERSION,
    TRANSLATION_TABLE_SCHEMA_VERSION,
    createTranslationRowKey,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-contract.js';
import {
    TranslationTableError,
    createServerRowKey,
    createTranslationTableService,
} from '../src/hogwarts-mud/localization-table.js';

const TIMELINE_EPOCH =
    'timeline_language_v1_test';

function sourceHash(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function createRow({
    recordId = 'message:1:segment:0',
    source = 'English source.',
    translatedText = '中文译文。',
    status = 'ready',
    errorCode = '',
} = {}) {
    return {
        schemaVersion:
            TRANSLATION_RECORD_SCHEMA_VERSION,
        timelineEpoch:
            TIMELINE_EPOCH,
        recordKind:
            'message_segment',
        recordId,
        fieldPath: 'textEn',
        sourceHash:
            sourceHash(source),
        sourceLocale: 'en',
        targetLocale: 'zh-CN',
        providerId: 'local',
        translatorVersion: 13,
        glossaryVersion: 1,
        translatedText:
            status === 'ready'
                ? translatedText
                : '',
        status,
        errorCode,
    };
}

async function withTempRoot(
    callback,
) {
    const root =
        await mkdtemp(
            path.join(
                tmpdir(),
                'hogwarts-localization-',
            ),
        );
    try {
        return await callback(root);
    } finally {
        await rm(
            root,
            {
                recursive: true,
                force: true,
            },
        );
    }
}

test(
    'server and browser contracts derive the same stable row key',
    async () => {
        const row =
            createRow();
        assert.equal(
            await createTranslationRowKey(
                row,
            ),
            createServerRowKey(row),
        );
    },
);

test(
    'translation rows survive service restart through snapshot and journal replay',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                const row =
                    createRow();
                const result =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [row],
                    });
                assert.equal(
                    result.tableRevision,
                    1,
                );
                assert.equal(
                    result
                        .acceptedKeys
                        .length,
                    1,
                );

                const restarted =
                    createTranslationTableService({
                        filesRoot,
                    });
                const query =
                    await restarted.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys:
                            result
                                .acceptedKeys,
                    });
                assert.equal(
                    query.rows.length,
                    1,
                );
                assert.equal(
                    query.rows[0]
                        .translatedText,
                    '中文译文。',
                );
            },
        ),
);

test(
    'concurrent tab upserts merge unrelated rows under one table lock',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                const first =
                    createRow({
                        recordId:
                            'message:1:segment:0',
                    });
                const second =
                    createRow({
                        recordId:
                            'message:2:segment:0',
                        source:
                            'Second source.',
                    });
                const results =
                    await Promise.all([
                        service.upsert({
                            timelineEpoch:
                                TIMELINE_EPOCH,
                            rows: [first],
                        }),
                        service.upsert({
                            timelineEpoch:
                                TIMELINE_EPOCH,
                            rows: [second],
                        }),
                    ]);
                const keys =
                    results.flatMap(
                        result =>
                            result
                                .acceptedKeys,
                    );
                const query =
                    await service.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys,
                    });
                assert.equal(
                    query.tableRevision,
                    2,
                );
                assert.equal(
                    query.rows.length,
                    2,
                );
            },
        ),
);

test(
    'repeating the same seed row is revision-idempotent',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                const row =
                    createRow();
                const first =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [row],
                    });
                const second =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [row],
                    });
                assert.equal(
                    first.tableRevision,
                    1,
                );
                assert.equal(
                    second.tableRevision,
                    1,
                );
                assert.deepEqual(
                    second.acceptedKeys,
                    first.acceptedKeys,
                );
            },
        ),
);

test(
    'a late error cannot downgrade ready while a later ready row upgrades error',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                const ready =
                    createRow();
                const error = {
                    ...ready,
                    translatedText: '',
                    status: 'error',
                    errorCode:
                        'SOURCE_LOCALE_LEAK',
                };
                const first =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [ready],
                    });
                const ignoredDowngrade =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [error],
                    });
                assert.equal(
                    ignoredDowngrade
                        .tableRevision,
                    first.tableRevision,
                );
                const readyQuery =
                    await service.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys:
                            first.acceptedKeys,
                    });
                assert.equal(
                    readyQuery.rows[0]
                        .status,
                    'ready',
                );
                assert.equal(
                    readyQuery.rows[0]
                        .translatedText,
                    '中文译文。',
                );

                const secondError =
                    createRow({
                        recordId:
                            'message:2:segment:0',
                        source:
                            'Second source.',
                        status: 'error',
                        errorCode:
                            'SOURCE_LOCALE_LEAK',
                    });
                const secondReady =
                    createRow({
                        recordId:
                            'message:2:segment:0',
                        source:
                            'Second source.',
                        translatedText:
                            '第二条译文。',
                    });
                const errorResult =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            secondError,
                        ],
                    });
                const upgradeResult =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            secondReady,
                        ],
                    });
                assert.equal(
                    upgradeResult
                        .tableRevision,
                    errorResult
                        .tableRevision + 1,
                );
                const upgraded =
                    await service.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys:
                            upgradeResult
                                .acceptedKeys,
                    });
                assert.equal(
                    upgraded.rows[0]
                        .status,
                    'ready',
                );
                assert.equal(
                    upgraded.rows[0]
                        .translatedText,
                    '第二条译文。',
                );
            },
        ),
);

test(
    'a stale source hash cannot overwrite the current source row',
    'a stale source hash cannot overwrite the current source row',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                const oldRow =
                    createRow({
                        source: 'Old source.',
                        translatedText:
                            '旧译文。',
                    });
                const currentRow =
                    createRow({
                        source:
                            'Current source.',
                        translatedText:
                            '当前译文。',
                    });
                const first =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [currentRow],
                    });
                const second =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [oldRow],
                    });
                assert.notEqual(
                    first
                        .acceptedKeys[0],
                    second
                        .acceptedKeys[0],
                );
                const current =
                    await service.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys:
                            first
                                .acceptedKeys,
                    });
                assert.equal(
                    current.rows[0]
                        .translatedText,
                    '当前译文。',
                );
            },
        ),
);

test(
    'an incomplete crash tail is removed before a later durable append',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                await service.upsert({
                    timelineEpoch:
                        TIMELINE_EPOCH,
                    rows: [
                        createRow(),
                    ],
                });
                const paths =
                    service.paths(
                        TIMELINE_EPOCH,
                    );
                await appendFile(
                    paths.journalPath,
                    '{"partial":',
                    'utf8',
                );
                await service.upsert({
                    timelineEpoch:
                        TIMELINE_EPOCH,
                    rows: [
                        createRow({
                            recordId:
                                'message:2:segment:0',
                            source:
                                'Second source.',
                        }),
                    ],
                });
                const restarted =
                    createTranslationTableService({
                        filesRoot,
                    });
                assert.equal(
                    (
                        await restarted.health({
                            timelineEpoch:
                                TIMELINE_EPOCH,
                        })
                    ).rowCount,
                    2,
                );
            },
        ),
);

test(
    'explicit retranslation removes only requested keys',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                    });
                const result =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            createRow(),
                            createRow({
                                recordId:
                                    'message:2:segment:0',
                                source:
                                    'Second source.',
                            }),
                        ],
                    });
                const removed =
                    await service.retranslate({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys: [
                            result
                                .acceptedKeys[0],
                        ],
                    });
                assert.deepEqual(
                    removed.removedKeys,
                    [
                        result
                            .acceptedKeys[0],
                    ],
                );
                const query =
                    await service.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys:
                            result
                                .acceptedKeys,
                    });
                assert.equal(
                    query.rows.length,
                    1,
                );
                assert.equal(
                    query.rows[0]
                        .recordId,
                    'message:2:segment:0',
                );
            },
        ),
);

test(
    'user roots and hostile timeline text remain isolated',
    async () =>
        withTempRoot(
            async root => {
                const firstRoot =
                    path.join(
                        root,
                        'first-user',
                    );
                const secondRoot =
                    path.join(
                        root,
                        'second-user',
                    );
                const hostileEpoch =
                    '../../other-user';
                const first =
                    createTranslationTableService({
                        filesRoot:
                            firstRoot,
                    });
                const second =
                    createTranslationTableService({
                        filesRoot:
                            secondRoot,
                    });
                const row = {
                    ...createRow(),
                    timelineEpoch:
                        hostileEpoch,
                };
                await first.upsert({
                    timelineEpoch:
                        hostileEpoch,
                    rows: [row],
                });
                const firstPaths =
                    first.paths(
                        hostileEpoch,
                    );
                assert.ok(
                    firstPaths.tableRoot
                        .startsWith(
                            path.join(
                                firstRoot,
                                'hogwarts-mud',
                                'localization',
                            ),
                        ),
                );
                assert.equal(
                    (
                        await second.health({
                            timelineEpoch:
                                hostileEpoch,
                        })
                    ).rowCount,
                    0,
                );
            },
        ),
);

test(
    'failed journal append preserves the previous durable table',
    async () =>
        withTempRoot(
            async filesRoot => {
                const stable =
                    createTranslationTableService({
                        filesRoot,
                    });
                const first =
                    await stable.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            createRow(),
                        ],
                    });
                const failing =
                    createTranslationTableService({
                        filesRoot,
                        appendJournal:
                            async () => {
                                throw new Error(
                                    'forced append failure',
                                );
                            },
                    });
                await assert.rejects(
                    failing.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            createRow({
                                recordId:
                                    'message:2:segment:0',
                                source:
                                    'Second source.',
                            }),
                        ],
                    }),
                    /forced append failure/u,
                );
                const query =
                    await stable.query({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        keys: [
                            first
                                .acceptedKeys[0],
                        ],
                    });
                assert.equal(
                    query.tableRevision,
                    1,
                );
                assert.equal(
                    query.rows.length,
                    1,
                );
            },
        ),
);

test(
    'journal compaction writes an atomic snapshot without losing rows',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                        limits: {
                            maxJournalBytesBeforeCompaction:
                                1,
                        },
                    });
                const result =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            createRow(),
                        ],
                    });
                const paths =
                    service.paths(
                        TIMELINE_EPOCH,
                    );
                assert.ok(
                    (
                        await stat(
                            paths
                                .snapshotPath,
                        )
                    ).size > 0,
                );
                assert.equal(
                    await readFile(
                        paths.journalPath,
                        'utf8',
                    ),
                    '',
                );
                const restarted =
                    createTranslationTableService({
                        filesRoot,
                    });
                assert.equal(
                    (
                        await restarted.query({
                            timelineEpoch:
                                TIMELINE_EPOCH,
                            keys:
                                result
                                    .acceptedKeys,
                        })
                    ).rows.length,
                    1,
                );
            },
        ),
);

test(
    'capacity failure rejects the new row and retains existing rows',
    async () =>
        withTempRoot(
            async filesRoot => {
                const service =
                    createTranslationTableService({
                        filesRoot,
                        limits: {
                            maxRowsPerTimeline:
                                1,
                        },
                    });
                const first =
                    await service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            createRow(),
                        ],
                    });
                await assert.rejects(
                    service.upsert({
                        timelineEpoch:
                            TIMELINE_EPOCH,
                        rows: [
                            createRow({
                                recordId:
                                    'message:2:segment:0',
                                source:
                                    'Second source.',
                            }),
                        ],
                    }),
                    error =>
                        error instanceof
                            TranslationTableError &&
                        error.code ===
                            'TRANSLATION_TABLE_CAPACITY',
                );
                assert.equal(
                    (
                        await service.query({
                            timelineEpoch:
                                TIMELINE_EPOCH,
                            keys:
                                first
                                    .acceptedKeys,
                        })
                    ).rows.length,
                    1,
                );
            },
        ),
);

test(
    'client adapter sends versioned bounded envelopes and rejects mismatches',
    async () => {
        const calls = [];
        const adapter =
            createLocalizationTableAdapter({
                getRequestHeaders:
                    () => ({
                        'Content-Type':
                            'application/json',
                    }),
                fetchImpl:
                    async (
                        url,
                        options,
                    ) => {
                        calls.push({
                            url,
                            options,
                        });
                        return {
                            ok: true,
                            status: 200,
                            async json() {
                                return {
                                    translationApiContractVersion:
                                        TRANSLATION_API_CONTRACT_VERSION,
                                    tableSchemaVersion:
                                        TRANSLATION_TABLE_SCHEMA_VERSION,
                                    timelineEpoch:
                                        TIMELINE_EPOCH,
                                    tableRevision:
                                        0,
                                    rows: [],
                                };
                            },
                        };
                    },
            });
        await adapter.queryRows(
            TIMELINE_EPOCH,
            [],
        );
        const body =
            JSON.parse(
                calls[0]
                    .options.body,
            );
        assert.equal(
            body
                .translationApiContractVersion,
            TRANSLATION_API_CONTRACT_VERSION,
        );
        assert.equal(
            body.timelineEpoch,
            TIMELINE_EPOCH,
        );

        const mismatched =
            createLocalizationTableAdapter({
                getRequestHeaders:
                    () => ({}),
                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                translationApiContractVersion:
                                    999,
                                tableSchemaVersion:
                                    TRANSLATION_TABLE_SCHEMA_VERSION,
                                timelineEpoch:
                                    TIMELINE_EPOCH,
                            };
                        },
                    }),
            });
        await assert.rejects(
            mismatched.getHealth(
                TIMELINE_EPOCH,
            ),
            /contract mismatch/u,
        );
    },
);
