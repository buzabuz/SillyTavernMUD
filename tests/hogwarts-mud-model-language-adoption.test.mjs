/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    adoptEnglishFields,
    collectNonEnglishAuthorityFields,
    partitionModelSegments,
} from '../public/scripts/extensions/hogwarts-mud/domain/model-language-adoption.js';
import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    normalizeCharacterV2,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    adoptLocalInventoryLanguage,
    adoptLocalPostTurnLanguage,
    adoptLocalPreTurnLanguage,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import {
    adoptLocalAppraisalLanguage,
} from '../src/hogwarts-mud/local-appraisal-proposer.js';
import {
    adoptSocialDirectorLanguage,
} from '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';

test('required English fields reject only the affected record and emit bounded diagnostics', () => {
    const adoption =
        adoptEnglishFields(
            {
                id: 'record_one',
                summaryEn:
                    '这不是英语权威。',
                confidence: 0.9,
            },
            {
                taskId: 'test_task',
                recordId:
                    'record_one',
                requiredFields: [
                    'summaryEn',
                ],
            },
        );

    assert.equal(
        adoption.admissible,
        false,
    );
    assert.deepEqual(
        adoption.missingRequired,
        [
            'summaryEn',
        ],
    );
    assert.deepEqual(
        adoption.diagnostics,
        [{
            code:
                'model_language_mismatch',
            taskId: 'test_task',
            fieldPath:
                'summaryEn',
            recordId:
                'record_one',
            language: 'non_en',
        }],
    );
    assert.equal(
        Object.hasOwn(
            adoption.accepted,
            'summaryEn',
        ),
        false,
    );
});

test('non-English model prose remains display evidence and never becomes canonical textEn', () => {
    const partitioned =
        partitionModelSegments(
            [
                {
                    type: 'narration',
                    textEn:
                        'Hermione closed the book.',
                },
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        '“先别碰它。”',
                },
            ],
            {
                taskId:
                    'low_scene_performance',
            },
        );

    assert.equal(
        partitioned
            .canonicalSegments
            .length,
        1,
    );
    assert.deepEqual(
        partitioned.displaySegments[1],
        {
            type: 'dialogue',
            actorId: 'hermione',
            rawText:
                '“先别碰它。”',
            language: 'non_en',
            authority:
                'model_output_evidence',
        },
    );
    assert.deepEqual(
        collectNonEnglishAuthorityFields({
            accepted:
                partitioned
                    .canonicalSegments,
        }),
        [],
    );
});

test('Character V2 preserves a non-English polish preview only as input evidence', () => {
    const character =
        normalizeCharacterV2({
            inputEvidence: {
                locale: 'zh-CN',
                identity: {},
                background: {},
                aptitudes: {},
                polishedBackground:
                    '蒂娜在麻瓜家庭长大。',
            },
        });

    assert.equal(
        character.inputEvidence
            .polishedBackground,
        '蒂娜在麻瓜家庭长大。',
    );
    assert.equal(
        character.canonicalEn
            .polishedBackgroundEn,
        '',
    );
});

test('local pre-turn adoption preserves structural decisions while omitting non-English reason prose', () => {
    const adopted =
        adoptLocalPreTurnLanguage({
            schemaVersion: 1,
            temporal: {
                mode: 'ordinary',
                elapsedMinutes: 15,
                basis: 'estimated',
                evidenceText:
                    '坐下来',
                reasonEn:
                    '这是一个普通动作。',
                confidence: 0.9,
            },
            check: {
                required: false,
                ruleId: 'none',
                targetActorId: '',
                reasonEn:
                    'No uncertain action occurred.',
                confidence: 0.9,
            },
        });

    assert.equal(
        adopted.result.temporal
            .elapsedMinutes,
        15,
    );
    assert.equal(
        adopted.result.temporal
            .reasonEn,
        '',
    );
    assert.equal(
        adopted.result.check
            .reasonEn,
        'No uncertain action occurred.',
    );
    assert.equal(
        adopted.diagnostics.length,
        1,
    );
});

test('local post-turn adoption skips non-English core records without blocking independent English records', () => {
    const adopted =
        adoptLocalPostTurnLanguage({
            schemaVersion: 1,
            materialEvents: [
                {
                    id: 'english_material',
                    objectTextEn:
                        'brass quill',
                },
                {
                    id: 'chinese_material',
                    objectTextEn:
                        '黄铜羽毛笔',
                },
            ],
            actorUpdates: [
                {
                    actorId: 'harry',
                    currentActivityEn:
                        'Backing away from Tina.',
                },
                {
                    actorId: 'ron',
                    currentActivityEn:
                        '躲到哈利身后。',
                },
            ],
        });

    assert.deepEqual(
        adopted.result
            .materialEvents
            .map(record => record.id),
        [
            'english_material',
        ],
    );
    assert.deepEqual(
        adopted.result
            .actorUpdates
            .map(record =>
                record.actorId),
        [
            'harry',
        ],
    );
    assert.equal(
        adopted.diagnostics.length,
        2,
    );
});

test('local inventory and Appraisal adoption skip only proposals with non-English canonical prose', () => {
    const inventory =
        adoptLocalInventoryLanguage({
            inventoryUpdates: [
                {
                    id: 'english_quill',
                    labelEn:
                        'Spare Brass Quill',
                    appearanceEn:
                        'A writing quill with a brass nib.',
                },
                {
                    id: 'chinese_quill',
                    labelEn:
                        '备用黄铜羽毛笔',
                    appearanceEn:
                        '一支带黄铜笔尖的羽毛笔。',
                },
            ],
        });
    const appraisals =
        adoptLocalAppraisalLanguage({
            appraisalProposals: [
                {
                    observerId: 'harry',
                    summaryEn:
                        'Tina ignores ordinary boundaries.',
                },
                {
                    observerId: 'ron',
                    summaryEn:
                        '蒂娜完全不理会普通边界。',
                },
            ],
        });

    assert.deepEqual(
        inventory.result
            .inventoryUpdates
            .map(record => record.id),
        [
            'english_quill',
        ],
    );
    assert.equal(
        inventory.diagnostics.length,
        2,
    );
    assert.deepEqual(
        appraisals.result
            .appraisalProposals
            .map(record =>
                record.observerId),
        [
            'harry',
        ],
    );
    assert.equal(
        appraisals.diagnostics.length,
        1,
    );
});

test('dynamic Inventory model contract is English-only', async () => {
    const source =
        await readFile(
            new URL(
                '../src/hogwarts-mud/inventory-observation-contract.js',
                import.meta.url,
            ),
            'utf8',
        );

    assert.doesNotMatch(
        source,
        /labelZh|appearanceZh|Simplified Chinese labels/u,
    );
    assert.match(
        source,
        /Every proposal requires an accurate English labelEn and objective appearanceEn/u,
    );
});

test('local Appraisal adapter rechecks language before returning proposals to the reducer', async () => {
    const originalFetch =
        globalThis.fetch;
    const adapter =
        createLocalSemanticAdapter({
            getRequestHeaders:
                () => ({}),
        });
    const event = {
        eventId:
            'event_language_adoption',
        participantActorIds: [
            'hermione',
            'ron',
        ],
        witnessActorIds: [],
        summaryEn:
            'Tina waits for an answer.',
    };
    const state = {
        clock:
            '1991-09-02 · 11:05',
        actorLibrary: [
            {
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
            },
            {
                id: 'ron',
                nameEn:
                    'Ron Weasley',
            },
        ],
        actors: [],
        eventKnowledge: [
            event,
        ],
    };

    try {
        globalThis.fetch =
            async () => ({
                ok: true,
                json:
                    async () => ({
                        result: {
                            appraisalProposals: [
                                {
                                    observerId:
                                        'hermione',
                                    summaryEn:
                                        'Tina expects an immediate answer.',
                                },
                                {
                                    observerId:
                                        'ron',
                                    summaryEn:
                                        '蒂娜希望立刻得到回答。',
                                },
                            ],
                        },
                        diagnostics: {
                            model:
                                'local-test',
                        },
                    }),
            });
        const adopted =
            await adapter
                .requestLocalTurnAppraisals(
                    state,
                    event,
                );

        assert.deepEqual(
            adopted.appraisalProposals
                .map(proposal =>
                    proposal.observerId),
            [
                'hermione',
            ],
        );
        assert.equal(
            adopted.diagnostics
                .languageMismatchCount,
            1,
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});

test('Social Director language adoption preserves independent English records', () => {
    const adopted =
        adoptSocialDirectorLanguage({
            reviews: [
                {
                    id: 'english_review',
                    summaryEn:
                        'Harry expects Tina to ignore another refusal.',
                },
                {
                    id: 'chinese_review',
                    summaryEn:
                        '哈利觉得蒂娜还会无视拒绝。',
                },
            ],
            reportedEvents: [],
            recipientAppraisals: [],
            identityClaims: [],
            relationshipClaims: [],
            personReferences: [],
            relationshipEvidence: [],
            schemaOperations: [],
        });

    assert.deepEqual(
        adopted.reviews.map(
            review => review.id,
        ),
        [
            'english_review',
        ],
    );
    assert.equal(
        adopted
            .modelLanguageDiagnostics
            .length,
        1,
    );
});
