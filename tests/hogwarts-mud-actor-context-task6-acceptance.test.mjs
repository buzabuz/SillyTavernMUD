/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    LOW_TIER_ACTIVE_SCHEMA_LIMIT,
    LOW_TIER_ACTOR_EVENT_LIMIT,
    LOW_TIER_CONTEXT_MAX_BYTES,
    LOW_TIER_GLOBAL_EVENT_LIMIT,
    projectLowTierContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/low-tier-context-v1.js';

const encoder = new TextEncoder();
const bytes = value =>
    encoder.encode(
        JSON.stringify(value),
    ).length;

function actor(
    actorId,
) {
    return {
        core: {
            id: actorId,
            nameEn:
                `Actor ${actorId}`,
            roleEn: 'Student',
            performanceCore: {
                temperamentEn:
                    'Alert and deliberate.',
                speechStyleEn:
                    'Concise.',
                motivesEn: [
                    'Understand the player.',
                ],
                socialStrategiesEn: [
                    'Ask a direct question.',
                ],
                boundariesEn: [
                    'Reject coercion.',
                ],
            },
        },
        runtime: {
            id: actorId,
            mapId:
                'hogwarts_castle',
            roomId:
                'library',
            present: true,
            currentActivityEn:
                'Reading.',
            currentIntentEn:
                'Observe.',
        },
    };
}

function capsule(
    actorId,
) {
    return {
        version: 1,
        observerId: actorId,
        expectations:
            Array.from(
                {
                    length: 5,
                },
                (_, index) => ({
                    schemaId:
                        `schema_${actorId}_${index}`,
                    observerId:
                        actorId,
                    targetId:
                        'player',
                    expectationEn:
                        `Expectation ${index}.`,
                    confidence: 0.8,
                    status: 'active',
                }),
            ),
        supportingEvents:
            Array.from(
                {
                    length: 5,
                },
                (_, index) => ({
                    recordId:
                        `events_${actorId}_${index}`,
                    text:
                        `Event ${actorId} ${index}.`,
                    sceneId:
                        `scene_${index}`,
                    effectiveClock:
                        '1991-09-02 · 18:00',
                    sourceRefs: [{
                        type: 'event',
                        id:
                            `event_${actorId}_${index}`,
                    }],
                }),
            ),
        sourceIds: [],
        confidence: 0.8,
        capsuleId:
            `capsule_${actorId}`,
    };
}

test('Task 6 LowTierContext enforces Schema<=3, Event<=3 per actor, and Event<=8 globally', () => {
    const actorIds = [
        'actor_a',
        'actor_b',
        'actor_c',
        'actor_d',
    ];
    const records =
        actorIds.map(actor);
    const context =
        projectLowTierContextV1(
            {
                actorLibrary:
                    records.map(
                        record =>
                            record.core,
                    ),
                actors:
                    records.map(
                        record =>
                            record.runtime,
                    ),
                actorPresentations:
                    {},
                socialGraph: {
                    relationships: [],
                },
            },
            {
                actorIds,
                playerTurn: {
                    playerAction:
                        'Continue.',
                },
                sceneFacts: {},
                actionOpportunities:
                    [],
                memoryActivationCapsules: {
                    version: 1,
                    common: {
                        facts: [],
                        sealed: true,
                    },
                    byActorId:
                        Object.fromEntries(
                            actorIds.map(
                                actorId => [
                                    actorId,
                                    capsule(
                                        actorId,
                                    ),
                                ],
                            ),
                        ),
                },
                prohibitions: [],
            },
        );
    const capsules =
        Object.values(
            context
                .memoryActivations
                .byActorId,
        );
    const eventCounts =
        capsules.map(
            current =>
                current
                    .supportingEvents
                    .length,
        );
    const schemaCounts =
        capsules.map(
            current =>
                current
                    .expectations
                    .length,
        );

    assert.equal(
        Math.max(
            ...schemaCounts,
        ),
        LOW_TIER_ACTIVE_SCHEMA_LIMIT,
    );
    assert.equal(
        Math.max(
            ...eventCounts,
        ),
        LOW_TIER_ACTOR_EVENT_LIMIT,
    );
    assert.equal(
        eventCounts.reduce(
            (
                total,
                count,
            ) =>
                total + count,
            0,
        ),
        LOW_TIER_GLOBAL_EVENT_LIMIT,
    );
    assert.ok(
        bytes(context) <=
            LOW_TIER_CONTEXT_MAX_BYTES,
    );
});
