import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createPostTurnModelRequest,
    createPreTurnModelRequest,
    settlePreTurnCheck,
    settlePreTurnTemporal,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import {
    ALL_RECALL_CASES,
    POST_RECALL_CASES,
    PRE_RECALL_CASES,
    RETIRED_IMMEDIATE_EVENT_RECALL_CASES,
    REVISION_17_MOVEMENT_RECALL_CASES,
} from './hogwarts-mud-local-semantic-recall-cases.mjs';

function countBy(
    cases,
    field,
) {
    return Object.fromEntries(
        [
            ...new Set(
                cases.map(item =>
                    item[field]),
            ),
        ]
            .sort()
            .map(value => [
                value,
                cases.filter(item =>
                    item[field] ===
                    value)
                    .length,
            ]),
    );
}

test(
    'pre-turn temporal settlement converts exact action evidence in deterministic code',
    () => {
        const exact =
            settlePreTurnTemporal(
                {
                    kind:
                        'explicit_duration',
                    evidenceText:
                        '等两小时三十分钟',
                    confidence: 0.9,
                },
                {
                    playerTurnSequence: [{
                        type:
                            'action',
                        text:
                            '我坐下等两小时三十分钟。',
                    }],
                },
            );
        assert.equal(
            exact.valid,
            true,
        );
        assert.equal(
            exact.value
                .elapsedMinutes,
            150,
        );

        const vague =
            settlePreTurnTemporal(
                {
                    kind:
                        'explicit_duration',
                    evidenceText:
                        '大约等两小时',
                    confidence: 0.9,
                },
                {
                    playerTurnSequence: [{
                        type:
                            'action',
                        text:
                            '我大约等两小时。',
                    }],
                },
            );
        assert.equal(
            vague.valid,
            false,
        );
        assert.equal(
            vague.value
                .elapsedMinutes,
            15,
        );

        const quoted =
            settlePreTurnTemporal(
                {
                    kind:
                        'explicit_duration',
                    evidenceText:
                        '等两个小时',
                    confidence: 0.9,
                },
                {
                    playerTurnSequence: [{
                        type:
                            'direct_speech',
                        text:
                            '明天等两个小时。',
                    }],
                },
            );
        assert.equal(
            quoted.valid,
            false,
        );
        assert.equal(
            quoted.value
                .elapsedMinutes,
            15,
        );
    },
);

test(
    'pre-turn no-check proposals normalize to the neutral no-write contract',
    () => {
        assert.deepEqual(
            settlePreTurnCheck({
                required: false,
                ruleId:
                    'physical_force',
                targetActorId:
                    'invented_actor',
                rollMode: 'advantage',
                reasonEn:
                    'Contradictory output.',
                confidence: 0.95,
            }),
            {
                valid: true,
                value: {
                    required: false,
                    ruleId: 'none',
                    targetActorId: '',
                    rollMode: 'normal',
                    reasonEn: '',
                    confidence: 0,
                },
                normalized: true,
            },
        );
    },
);

test(
    'active recall excludes retired Event and pre progression cases',
    () => {
        assert.equal(
            PRE_RECALL_CASES.length,
            36,
        );
        assert.equal(
            POST_RECALL_CASES.length,
            48,
        );
        assert.equal(
            ALL_RECALL_CASES.length,
            84,
        );
        assert.equal(
            new Set(
                ALL_RECALL_CASES
                    .map(item =>
                        item.id),
            ).size,
            84,
        );
        assert.equal(
            RETIRED_IMMEDIATE_EVENT_RECALL_CASES
                .length,
            12,
        );
        assert.deepEqual(
            countBy(
                PRE_RECALL_CASES,
                'family',
            ),
            {
                calendar: 12,
                check: 12,
                time: 12,
            },
        );
        assert.deepEqual(
            countBy(
                POST_RECALL_CASES,
                'family',
            ),
            {
                actor_update: 12,
                inventory_route: 20,
                material_event: 12,
                temporal: 4,
            },
        );
    },
);

test(
    'every major family balances positive and negative cases across languages',
    () => {
        for (const [
            family,
            expectedPolarity,
        ] of Object.entries({
                calendar: 6,
                check: 6,
                time: 6,
                actor_update: 6,
                inventory_route: 10,
                material_event: 6,
                temporal: 2,
            })) {
            const cases =
                ALL_RECALL_CASES
                    .filter(item =>
                        item.family ===
                        family);
            assert.equal(
                cases.filter(item =>
                    item.polarity ===
                    'positive')
                    .length,
                expectedPolarity,
                `${family} positive coverage`,
            );
            assert.equal(
                cases.filter(item =>
                    item.polarity ===
                    'negative')
                    .length,
                expectedPolarity,
                `${family} negative coverage`,
            );
            const languages =
                new Set(
                    cases.map(item =>
                        item.language),
                );
            assert.equal(
                languages.has('en'),
                true,
                `${family} English coverage`,
            );
            assert.equal(
                languages.has('zh') ||
                    languages.has('mixed'),
                true,
                `${family} Chinese or mixed coverage`,
            );
        }
    },
);

test(
    'holdout is at least thirty percent and remains separately identifiable',
    () => {
        const holdout =
            ALL_RECALL_CASES
                .filter(item =>
                    item.holdout);
        assert.equal(
            holdout.length >=
                Math.ceil(
                    ALL_RECALL_CASES
                        .length *
                    0.3,
                ),
            true,
        );
        assert.equal(
            holdout.some(item =>
                item.stage === 'pre'),
            true,
        );
        assert.equal(
            holdout.some(item =>
                item.stage === 'post'),
            true,
        );
    },
);

test(
    'Revision 17 movement holdout covers guarded follow success and rejection',
    () => {
        assert.equal(
            REVISION_17_MOVEMENT_RECALL_CASES
                .length,
            30,
        );
        assert.equal(
            REVISION_17_MOVEMENT_RECALL_CASES
                .filter(item =>
                    item.polarity ===
                    'positive')
                .length,
            20,
        );
        assert.equal(
            REVISION_17_MOVEMENT_RECALL_CASES
                .filter(item =>
                    item.polarity ===
                    'negative')
                .length,
            10,
        );
        assert.deepEqual(
            new Set(
                REVISION_17_MOVEMENT_RECALL_CASES
                    .map(item =>
                        item.language),
            ),
            new Set([
                'en',
                'mixed',
                'zh',
            ]),
        );
        assert.equal(
            REVISION_17_MOVEMENT_RECALL_CASES
                .every(item =>
                    item.holdout &&
                    item.stage ===
                        'pre' &&
                    item.family ===
                        'movement_intent'),
            true,
        );
        assert.equal(
            REVISION_17_MOVEMENT_RECALL_CASES
                .filter(item =>
                    item.polarity ===
                    'positive')
                .some(item =>
                    item.expected
                        .movementIntent
                        .destinationRoomId ===
                    ''),
            true,
        );
    },
);

test(
    'expected answers never enter exact production model requests',
    () => {
        for (const item of
            [
                ...PRE_RECALL_CASES,
                ...REVISION_17_MOVEMENT_RECALL_CASES,
            ]) {
            const request =
                createPreTurnModelRequest(
                    item.input,
                );
            assert.equal(
                request.taskId,
                'local_pre_turn_adjudicator',
            );
            assert.equal(
                JSON.stringify(
                    request.input,
                ).includes(
                    JSON.stringify(
                        item.expected,
                    ),
                ),
                false,
                item.id,
            );
            assert.equal(
                Object.hasOwn(
                    request.input,
                    'expected',
                ),
                false,
            );
        }
        for (const item of
            POST_RECALL_CASES) {
            const request =
                createPostTurnModelRequest(
                    item.input,
                );
            assert.equal(
                request.taskId,
                'post_turn_semantic_proposal',
            );
            assert.equal(
                Object.hasOwn(
                    request.input,
                    'expected',
                ),
                false,
            );
        }
    },
);
