/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    LOW_TIER_ACTOR_CARD_MAX_BYTES,
    LOW_TIER_CONTEXT_KEYS,
    LOW_TIER_CONTEXT_MAX_BYTES,
    isLowTierContextV1,
    projectLowTierContextV1,
    trimLowTierContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/low-tier-context-v1.js';

const encoder = new TextEncoder();
const size = value =>
    encoder.encode(
        JSON.stringify(value),
    ).length;

function state() {
    return {
        actorLibrary: [{
            id: 'hermione',
            nameEn:
                'Hermione Granger',
            roleEn: 'Student',
            performanceCore: {
                temperamentEn:
                    'Exacting '.repeat(
                        500,
                    ),
                speechStyleEn:
                    'Precise '.repeat(
                        500,
                    ),
                motivesEn:
                    Array.from(
                        {
                            length: 20,
                        },
                        (_, index) =>
                            `Motive ${index}`,
                    ),
                socialStrategiesEn:
                    Array.from(
                        {
                            length: 20,
                        },
                        (_, index) =>
                            `Strategy ${index}`,
                    ),
                boundariesEn:
                    Array.from(
                        {
                            length: 20,
                        },
                        (_, index) =>
                            `Boundary ${index}`,
                    ),
            },
            sharedMemories: {
                core: [{
                    summaryEn:
                        'Forbidden raw memory.',
                }],
            },
        }],
        actors: [{
            id: 'hermione',
            present: true,
            mapId: 'castle',
            roomId: 'library',
            currentActivityEn:
                'Reading.',
            currentIntentEn:
                'Answer carefully.',
        }],
        actorPresentations: {
            hermione: {
                outfit:
                    'School robes.',
            },
        },
        socialGraph: {
            relationships: [],
        },
    };
}

function capsules() {
    return {
        version: 1,
        common: {
            facts: [],
            sealed: true,
        },
        byActorId: {
            hermione: {
                version: 1,
                observerId:
                    'hermione',
                expectations:
                    Array.from(
                        {
                            length: 7,
                        },
                        (_, index) => ({
                            schemaId:
                                `schema_${index}`,
                            observerId:
                                'hermione',
                            targetId:
                                'player',
                            expectationEn:
                                `Expectation ${index}`,
                            confidence: 0.8,
                            status: 'active',
                        }),
                    ),
                supportingEvents:
                    Array.from(
                        {
                            length: 7,
                        },
                        (_, index) => ({
                            recordId:
                                `event_record_${index}`,
                            text:
                                `Event ${index} ${'detail '.repeat(500)}`,
                            sourceRefs: [{
                                type: 'event',
                                id:
                                    `event_${index}`,
                            }],
                        }),
                    ),
                sourceIds: [],
                confidence: 0.8,
                capsuleId:
                    'capsule_hermione',
            },
        },
    };
}

test('LowTierContextV1 has six fields and enforces actor, schema, event, and payload budgets', () => {
    const context =
        projectLowTierContextV1(
            state(),
            {
                actorIds: [
                    'hermione',
                ],
                playerTurn: {
                    playerAction:
                        'Continue.',
                },
                sceneFacts: {
                    clockBeforeTurn:
                        '1991-09-05 · 10:00',
                },
                actionOpportunities: [],
                memoryActivationCapsules:
                    capsules(),
                prohibitions: [],
            },
        );

    assert.deepEqual(
        Object.keys(context),
        LOW_TIER_CONTEXT_KEYS,
    );
    assert.equal(
        isLowTierContextV1(
            context,
        ),
        true,
    );
    assert.ok(
        size(context) <=
            LOW_TIER_CONTEXT_MAX_BYTES,
    );
    assert.ok(
        size(context.actorCards[0]) <=
            LOW_TIER_ACTOR_CARD_MAX_BYTES,
    );
    assert.equal(
        context.memoryActivations
            .byActorId.hermione
            .expectations.length,
        3,
    );
    assert.equal(
        context.memoryActivations
            .byActorId.hermione
            .supportingEvents.length,
        3,
    );
    assert.doesNotMatch(
        JSON.stringify(context),
        /sharedMemories|actorLibrary|socialGraph/u,
    );
});

test('LowTierContextV1 trimming preserves six fields without legacy fallback data', () => {
    const context =
        projectLowTierContextV1(
            state(),
            {
                actorIds: [
                    'hermione',
                ],
                playerTurn: {
                    playerAction:
                        'Continue.',
                },
                sceneFacts: {
                    authoritySnapshot: {
                        version: 1,
                    },
                },
                actionOpportunities:
                    Array.from(
                        {
                            length: 20,
                        },
                        (_, index) => ({
                            id: index,
                            text:
                                'opportunity '.repeat(
                                    200,
                                ),
                        }),
                    ),
                memoryActivationCapsules:
                    capsules(),
                prohibitions: [],
            },
        );
    const trimmed =
        trimLowTierContextV1(
            context,
            8_000,
        );

    assert.deepEqual(
        Object.keys(trimmed),
        LOW_TIER_CONTEXT_KEYS,
    );
    assert.ok(
        size(trimmed) <=
            8_000,
    );
    assert.doesNotMatch(
        JSON.stringify(trimmed),
        /actorProfiles|actorKnowledge|sharedMemories|historicalKnowledgeEvidence/u,
    );
});
