/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeAppraisalConfidence,
    proposeTurnAppraisals,
} from '../src/hogwarts-mud/local-appraisal-proposer.js';

function proposal(
    confidence,
) {
    return {
        observerId: 'harry',
        targetId: 'player',
        summaryEn:
            'Tina ignores ordinary boundaries.',
        sourceEventIds: [
            'event_turn',
        ],
        contextTags: [
            'boundary',
        ],
        confidence,
    };
}

test('Appraisal confidence preserves decimal notation and normalizes percentage notation', async () => {
    let calls = 0;
    const result =
        await proposeTurnAppraisals(
            {
                event: {
                    eventId: 'event_turn',
                },
                observers: [],
            },
            {
                enqueue: operation =>
                    operation(),
                callModel: async request => {
                    calls++;
                    assert.equal(
                        request.resultSchema.safeParse({
                            appraisalProposals: [
                                proposal(95),
                            ],
                        }).success,
                        true,
                    );
                    return {
                        result: {
                            appraisalProposals: [
                                proposal(0.95),
                                proposal(95),
                                proposal(100),
                                proposal(250),
                            ],
                        },
                        diagnostics: {},
                    };
                },
            },
        );

    assert.equal(calls, 1);
    assert.deepEqual(
        result.result.appraisalProposals.map(
            value => value.confidence,
        ),
        [
            0.95,
            0.95,
            1,
            1,
        ],
    );
});

test('Appraisal confidence rejects negative and nonfinite values', async () => {
    assert.throws(
        () =>
            normalizeAppraisalConfidence(
                -0.01,
            ),
        /nonnegative/u,
    );
    assert.throws(
        () =>
            normalizeAppraisalConfidence(
                Number.POSITIVE_INFINITY,
            ),
        /finite/u,
    );

    await assert.rejects(
        proposeTurnAppraisals(
            {
                event: {
                    eventId: 'event_turn',
                },
                observers: [],
            },
            {
                enqueue: operation =>
                    operation(),
                callModel: async () => ({
                    result: {
                        appraisalProposals: [
                            proposal(-1),
                        ],
                    },
                    diagnostics: {},
                }),
            },
        ),
        /nonnegative/u,
    );
});
