/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createTranslationAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/translation.js';
import {
    createLocalizationQueue,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-queue.js';
import {
    collectStateLocalizationCandidates,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-candidates.js';
import {
    TRANSLATION_TABLE_LIMITS,
    createTranslationRowKey,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-contract.js';
import {
    createJobRegistry,
} from '../public/scripts/extensions/hogwarts-mud/runtime/job-registry.js';
import {
    createIdleLocalizationScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/idle-localization-scheduler.js';
import {
    createModelEventScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    filterPersistedLocalizationCandidates,
} from '../public/scripts/extensions/hogwarts-mud/workflows/application.js';
import {
    parseProtectedTranslationSegments,
    restoreStructuredTranslationSegments,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';

function candidate(
    key,
    priority,
    sourceText = key,
) {
    return {
        key,
        priority,
        sourceText,
        sourceHash:
            `hash_${key}`,
    };
}

test('localization queue orders P0-P4 and enforces provider source caps', () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('older', 4),
        candidate('visible', 1),
        candidate('current', 0),
    ]);

    assert.deepEqual(
        queue.nextBatch('local')
            .map(item => item.key),
        [
            'current',
            'visible',
            'older',
        ],
    );

    const capped =
        createLocalizationQueue();
    capped.enqueue([
        candidate(
            'first',
            0,
            'a'.repeat(700),
        ),
        candidate(
            'second',
            1,
            'b'.repeat(700),
        ),
    ]);
    assert.deepEqual(
        capped.nextBatch('bing')
            .map(item => item.key),
        [
            'first',
        ],
    );

    const rowCapped =
        createLocalizationQueue();
    rowCapped.enqueue(
        Array.from(
            {
                length: 300,
            },
            (_, index) =>
                candidate(
                    `short_${index}`,
                    1,
                    'x',
                ),
        ),
    );
    assert.equal(
        rowCapped.nextBatch(
            'local',
        ).length,
        TRANSLATION_TABLE_LIMITS
            .maxUpsertRows,
    );
});

test('timeline queue hydration skips persisted ready and error rows through bounded table queries', async () => {
    const timelineEpoch =
        'timeline';
    const createRow =
        (
            recordId,
            {
                status,
                translatedText,
                errorCode,
            },
        ) => ({
            schemaVersion: 1,
            timelineEpoch,
            recordKind:
                'calendar_entry',
            recordId,
            fieldPath:
                'titleEn',
            sourceHash:
                recordId
                    .padEnd(
                        64,
                        '0',
                    ),
            sourceLocale: 'en',
            targetLocale:
                'zh-CN',
            providerId: 'local',
            translatorVersion: 1,
            glossaryVersion: 1,
            translatedText,
            status,
            errorCode,
        });
    const readyRow =
        createRow(
            'a',
            {
                status: 'ready',
                translatedText:
                    'translated_a',
                errorCode: '',
            },
        );
    const errorRow =
        createRow(
            'b',
            {
                status: 'error',
                translatedText: '',
                errorCode:
                    'PROVIDER_DOWN',
            },
        );
    const readyKey =
        await createTranslationRowKey(
            readyRow,
        );
    const errorKey =
        await createTranslationRowKey(
            errorRow,
        );
    const missingRow =
        createRow(
            'c',
            {
                status: 'ready',
                translatedText:
                    'translated_c',
                errorCode: '',
            },
        );
    const missingKey =
        await createTranslationRowKey(
            missingRow,
        );
    const rowsByKey =
        new Map([
            [
                readyKey,
                readyRow,
            ],
            [
                errorKey,
                errorRow,
            ],
        ]);
    const querySizes = [];
    const pending =
        await filterPersistedLocalizationCandidates({
            candidates: [
                {
                    key: readyKey,
                },
                {
                    key: errorKey,
                },
                {
                    key:
                        missingKey,
                },
            ],
            timelineEpoch,
            localizationTable: {
                async queryRows(
                    _timelineEpoch,
                    keys,
                ) {
                    querySizes.push(
                        keys.length,
                    );
                    return {
                        rows: keys
                            .map(key =>
                                rowsByKey
                                    .get(key))
                            .filter(Boolean),
                    };
                },
            },
            maxQueryKeys: 2,
        });

    assert.deepEqual(
        querySizes,
        [
            2,
            1,
        ],
    );
    assert.deepEqual(
        pending,
        [{
            key: missingKey,
        }],
    );
});

test('structured local translation restores exact batch identities without guessing missing fields', () => {
    const segments =
        parseProtectedTranslationSegments(
            '[[HPMUD_0_0]] First title\n[[HPMUD_1_0]] Second detail',
        );
    assert.deepEqual(
        segments,
        [
            {
                index: 0,
                partIndex: 0,
                marker:
                    '[[HPMUD_0_0]]',
                text:
                    'First title',
            },
            {
                index: 1,
                partIndex: 0,
                marker:
                    '[[HPMUD_1_0]]',
                text:
                    'Second detail',
            },
        ],
    );
    assert.equal(
        restoreStructuredTranslationSegments(
            segments,
            [
                {
                    index: 1,
                    partIndex: 0,
                    text: '第二条详情',
                },
                {
                    index: 0,
                    partIndex: 0,
                    text: '第一条标题',
                },
            ],
        ),
        '[[HPMUD_0_0]] 第一条标题\n[[HPMUD_1_0]] 第二条详情',
    );
    assert.throws(
        () =>
            restoreStructuredTranslationSegments(
                segments,
                [{
                    index: 0,
                    partIndex: 0,
                    text: '只有一条',
                }],
            ),
        /structured segment identities/u,
    );
});

test('state candidate projection uses stable domain identities and P1-P4 priorities', () => {
    const candidates =
        collectStateLocalizationCandidates({
            scene: {
                id: 'scene_one',
                nameEn: 'Great Hall',
                summaryEn:
                    'Breakfast continues.',
            },
            actorLibrary: [{
                id: 'harry',
                nameEn:
                    'Harry Potter',
                roleEn: 'Student',
                publicProfile: {
                    descriptionEn:
                        'A thin boy with glasses.',
                    backgroundEn:
                        'A first-year student.',
                },
                performanceCore: {
                    temperamentEn:
                        'Guarded.',
                    speechStyleEn:
                        'Direct.',
                },
            }],
            actors: [{
                id: 'harry',
                currentActivityEn:
                    'Eating breakfast.',
            }],
            memorySynapse: {
                appraisals: [{
                    id: 'appraisal_one',
                    summaryEn:
                        'Tina ignores refusals.',
                }],
            },
            sceneArchive: [
                {
                    id: 'archive_old',
                    nameEn:
                        'Old Scene',
                },
                {
                    id: 'archive_latest',
                    nameEn:
                        'Latest Scene',
                },
            ],
        });
    const byIdentity =
        new Map(
            candidates.map(item => [
                [
                    item.recordKind,
                    item.recordId,
                    item.fieldPath,
                ].join(':'),
                item,
            ]),
        );

    assert.equal(
        byIdentity.get(
            'scene:scene_one:nameEn',
        ).priority,
        1,
    );
    assert.equal(
        byIdentity.get(
            'actor_runtime:harry:currentActivityEn',
        ).priority,
        1,
    );
    assert.equal(
        byIdentity.get(
            'appraisal:appraisal_one:summaryEn',
        ).priority,
        2,
    );
    assert.equal(
        byIdentity.get(
            'scene_archive:archive_latest:nameEn',
        ).priority,
        3,
    );
    assert.equal(
        byIdentity.get(
            'scene_archive:archive_old:nameEn',
        ).priority,
        4,
    );
});

test('failed localization rows stay dormant until source identity changes', () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('row', 0),
    ]);
    const batch =
        queue.nextBatch('local');
    queue.beginBatch(batch);
    queue.failBatch(
        ['row'],
        'PROVIDER_DOWN',
    );

    assert.deepEqual(
        queue.nextBatch('local'),
        [],
    );
    queue.enqueue([
        {
            ...candidate(
                'row',
                0,
                'changed',
            ),
            sourceHash:
                'new_hash',
        },
    ]);
    assert.equal(
        queue.nextBatch('local')
            .length,
        1,
    );
});

test('idle scheduler dispatches one provider request and one server upsert', async () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('one', 0),
        candidate('two', 1),
    ]);
    let translationCalls = 0;
    let upsertCalls = 0;
    const scheduler =
        createIdleLocalizationScheduler({
            queue,
            automaticWork: {
                suppressed: false,
            },
            jobRegistry:
                createJobRegistry(),
            getProviderId:
                () => 'local',
            getActionId:
                () => 'action_one',
            translateBatch:
                async ({ candidates }) => {
                    translationCalls++;
                    return candidates.map(
                        item => ({
                            key: item.key,
                        }),
                    );
                },
            upsertRows:
                async () => {
                    upsertCalls++;
                },
        });

    assert.equal(
        await scheduler.dispatch(
            'action_one',
        ),
        true,
    );
    assert.equal(
        translationCalls,
        1,
    );
    assert.equal(
        upsertCalls,
        1,
    );
    assert.equal(
        queue.snapshot()
            .entries.length,
        0,
    );
    scheduler.stop();
});

test('idle scheduler blocks dispatch for active jobs, saves, hidden documents and new actions', async () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('one', 0),
    ]);
    const jobs =
        createJobRegistry();
    let actionId = 'new_action';
    let calls = 0;
    const scheduler =
        createIdleLocalizationScheduler({
            queue,
            automaticWork: {
                suppressed: false,
            },
            jobRegistry: jobs,
            getProviderId:
                () => 'local',
            getActionId:
                () => actionId,
            translateBatch:
                async () => {
                    calls++;
                    return [];
                },
            upsertRows:
                async () => {},
        });

    assert.equal(
        await scheduler.dispatch(
            'old_action',
        ),
        false,
    );
    jobs.turnActive = true;
    actionId = 'new_action';
    assert.equal(
        scheduler.gatesOpen(),
        false,
    );
    jobs.turnActive = false;
    assert.equal(
        calls,
        0,
    );
    scheduler.stop();
});

test('idle scheduler records one bounded server error batch without retrying the provider', async () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('one', 0),
    ]);
    let providerCalls = 0;
    let failureWrites = 0;
    const scheduler =
        createIdleLocalizationScheduler({
            queue,
            automaticWork: {
                suppressed: false,
            },
            jobRegistry:
                createJobRegistry(),
            getProviderId:
                () => 'local',
            getActionId:
                () => 'action_one',
            translateBatch:
                async () => {
                    providerCalls++;
                    const error =
                        new Error(
                            'offline',
                        );
                    error.code =
                        'PROVIDER_DOWN';
                    throw error;
                },
            upsertRows:
                async () => {},
            recordFailure:
                async ({
                    candidates,
                    errorCode,
                }) => {
                    failureWrites++;
                    assert.equal(
                        candidates.length,
                        1,
                    );
                    assert.equal(
                        errorCode,
                        'PROVIDER_DOWN',
                    );
                },
        });

    assert.equal(
        await scheduler.dispatch(
            'action_one',
        ),
        false,
    );
    assert.equal(providerCalls, 1);
    assert.equal(failureWrites, 1);
    assert.deepEqual(
        queue.nextBatch('local'),
        [],
    );
    scheduler.stop();
});

test('ephemeral display model tasks never mutate or persist world runtime ledger', async () => {
    const state = {
        timelineEpoch:
            'timeline_one',
        stateRevision: 7,
        turn: {
            count: 2,
        },
    };
    const before =
        JSON.stringify(state);
    let persisted = 0;
    const scheduler =
        createModelEventScheduler({
            invokeRole:
                async () => ({
                    content: 'ok',
                }),
            getState:
                () => state,
            persistRuntime:
                async () => {
                    persisted++;
                },
        });

    const result =
        await scheduler.runLocalTask(
            'local_translation',
            async () => 'translated',
            {
                eventType:
                    'localization.idle_batch_requested',
                emittedBy:
                    'localization.idle_scheduler',
            },
        );

    assert.equal(
        result,
        'translated',
    );
    assert.equal(persisted, 0);
    assert.equal(
        JSON.stringify(state),
        before,
    );
});

test('translation adapter sends one marker-protected provider request per idle batch', async () => {
    const originalFetch =
        globalThis.fetch;
    let calls = 0;
    try {
        globalThis.fetch =
            async (
                _url,
                options,
            ) => {
                calls++;
                const body =
                    JSON.parse(
                        options.body,
                    );
                assert.match(
                    body.text,
                    /HPMUD_0_0/u,
                );
                assert.match(
                    body.text,
                    /HPMUD_1_0/u,
                );
                return {
                    ok: true,
                    text:
                        async () =>
                            '[[HPMUD_0_0]] 第一条\n[[HPMUD_1_0]] Second.',
                };
            };
        const adapter =
            createTranslationAdapter({
                TRANSLATION_TERM_GLOSSARY:
                    [],
                applyTranslationGlossaryTargets:
                    value => value,
                buildActorTranslationTerms:
                    () => [],
                createTranslationBatches:
                    () => [],
                getMudState:
                    () => null,
                getRequestHeaders:
                    () => ({}),
                getSettings:
                    () => ({
                        translationProvider:
                            'google',
                        targetLanguage:
                            'zh-CN',
                    }),
                normalizeLocalTranslationText:
                    (
                        _source,
                        translated,
                    ) => translated,
                normalizeTranslationProvider:
                    value => value,
                protectTranslationTerms:
                    value => value,
                restoreTranslationTerms:
                    value => value,
                shouldTranslateToChinese:
                    value =>
                        value ===
                        'Second.',
                splitTranslationChunks:
                    value => [
                        value,
                    ],
            });
        const translated =
            await adapter
                .translateLocalizationBatch({
                    providerId:
                        'google',
                    candidates: [
                        candidate(
                            'one',
                            0,
                            'First.',
                        ),
                        candidate(
                            'two',
                            1,
                            'Second.',
                        ),
                    ],
                });

        assert.equal(calls, 1);
        assert.deepEqual(
            translated.map(item => ({
                translatedText:
                    item.translatedText,
                translationStatus:
                    item
                        .translationStatus,
                errorCode:
                    item.errorCode,
            })),
            [
                {
                    translatedText:
                        '第一条',
                    translationStatus:
                        'ready',
                    errorCode: '',
                },
                {
                    translatedText: '',
                    translationStatus:
                        'error',
                    errorCode:
                        'TARGET_LOCALE_MISMATCH',
                },
            ],
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});

test('local idle translation sends pure English with a separate glossary in one provider request', async () => {
    const originalFetch =
        globalThis.fetch;
    let calls = 0;
    try {
        globalThis.fetch =
            async (
                _url,
                options,
            ) => {
                calls++;
                const body =
                    JSON.parse(
                        options.body,
                    );
                assert.match(
                    body.text,
                    /Tina Zhang/u,
                );
                assert.doesNotMatch(
                    body.text,
                    /蒂娜·张/u,
                );
                assert.deepEqual(
                    body.glossary,
                    [{
                        source:
                            'Tina Zhang',
                        target:
                            '蒂娜·张',
                    }],
                );
                return {
                    ok: true,
                    text:
                        async () =>
                            '[[HPMUD_0_0]] 蒂娜·张',
                };
            };
        const adapter =
            createTranslationAdapter({
                TRANSLATION_TERM_GLOSSARY: [{
                    source:
                        'Tina Zhang',
                    target:
                        '蒂娜·张',
                }],
                applyTranslationGlossaryTargets:
                    (
                        value,
                    ) =>
                        value.replaceAll(
                            'Tina Zhang',
                            '蒂娜·张',
                        ),
                buildActorTranslationTerms:
                    () => [],
                createTranslationBatches:
                    () => [],
                getMudState:
                    () => null,
                getRequestHeaders:
                    () => ({}),
                getSettings:
                    () => ({
                        translationProvider:
                            'local',
                        targetLanguage:
                            'zh-CN',
                    }),
                normalizeLocalTranslationText:
                    (
                        _source,
                        translated,
                    ) => translated,
                normalizeTranslationProvider:
                    value => value,
                protectTranslationTerms:
                    () => {
                        throw new Error(
                            'Local provider source must not use term markers.',
                        );
                    },
                restoreTranslationTerms:
                    value => value,
                shouldTranslateToChinese:
                    () => false,
                splitTranslationChunks:
                    value => [
                        value,
                    ],
            });

        const [
            translated,
        ] = await adapter
            .translateLocalizationBatch({
                providerId: 'local',
                candidates: [
                    candidate(
                        'player_name',
                        1,
                        'Tina Zhang',
                    ),
                ],
            });

        assert.equal(calls, 1);
        assert.equal(
            translated
                .translatedText,
            '蒂娜·张',
        );
        assert.equal(
            translated
                .translationStatus,
            'ready',
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});

test('translation adapter reports an empty model segment instead of creating an invalid ready row', async () => {
    const originalFetch =
        globalThis.fetch;
    try {
        globalThis.fetch =
            async () => ({
                ok: true,
                text:
                    async () =>
                        '[[HPMUD_0_0]]',
            });
        const adapter =
            createTranslationAdapter({
                TRANSLATION_TERM_GLOSSARY:
                    [],
                applyTranslationGlossaryTargets:
                    value => value,
                buildActorTranslationTerms:
                    () => [],
                createTranslationBatches:
                    () => [],
                getMudState:
                    () => null,
                getRequestHeaders:
                    () => ({}),
                getSettings:
                    () => ({
                        translationProvider:
                            'local',
                        targetLanguage:
                            'zh-CN',
                    }),
                normalizeLocalTranslationText:
                    (
                        _source,
                        translated,
                    ) => translated,
                normalizeTranslationProvider:
                    value => value,
                protectTranslationTerms:
                    value => value,
                restoreTranslationTerms:
                    value => value,
                shouldTranslateToChinese:
                    () => false,
                splitTranslationChunks:
                    value => [
                        value,
                    ],
            });

        const [
            translated,
        ] = await adapter
            .translateLocalizationBatch({
                providerId: 'local',
                candidates: [
                    candidate(
                        'empty',
                        1,
                        'Tina Zhang',
                    ),
                ],
            });

        assert.deepEqual(
            {
                translatedText:
                    translated
                        .translatedText,
                translationStatus:
                    translated
                        .translationStatus,
                errorCode:
                    translated.errorCode,
            },
            {
                translatedText: '',
                translationStatus:
                    'error',
                errorCode:
                    'EMPTY_TRANSLATION',
            },
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});
