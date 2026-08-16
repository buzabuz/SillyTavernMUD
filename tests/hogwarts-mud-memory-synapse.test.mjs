/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createAppraisalId,
    createDefaultMemorySynapse,
    createPersonSchemaId,
    initializeMemorySynapseState,
    normalizeAppraisal,
    normalizeMemorySynapse,
    validateAppraisalObserverAccess,
    validateAppraisalProposal,
    validateMemorySynapse,
    validatePersonSchema,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    applyAppraisalProposals,
    applyPersonSchemaOperations,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-reducer.js';

function createEvent({
    id,
    sceneId,
    messageId,
    participants = ['hermione'],
    witnesses = ['ron'],
}) {
    return {
        eventId: id,
        sceneId,
        sourceMessageIds: [messageId],
        summaryEn:
            `Objective account of ${id}.`,
        participantActorIds:
            participants,
        witnessActorIds:
            [
                ...new Set([
                    ...participants,
                    ...witnesses,
                ]),
            ],
    };
}

function createWorld() {
    return {
        clock: '1991-09-03 · 17:00',
        actorLibrary: [
            {
                id: 'hermione',
                impressionOfPlayerEn:
                    'An intriguing new classmate.',
            },
            {
                id: 'ron',
                impressionOfPlayerEn:
                    'Probably trouble.',
            },
            {
                id: 'luna',
                impressionOfPlayerEn:
                    'Still deciding.',
            },
            {
                id: 'draco',
                impressionOfPlayerEn:
                    'An unwelcome rival.',
            },
        ],
        actors: [
            { id: 'hermione' },
            { id: 'ron' },
            { id: 'luna' },
            { id: 'draco' },
        ],
        eventKnowledge: [
            createEvent({
                id: 'event_corridor_help',
                sceneId: 'scene_corridor',
                messageId: 101,
            }),
            createEvent({
                id: 'event_library_help',
                sceneId: 'scene_library',
                messageId: 102,
            }),
            createEvent({
                id: 'event_classroom_help',
                sceneId: 'scene_library',
                messageId: 103,
            }),
            createEvent({
                id: 'event_accepts_help',
                sceneId: 'scene_courtyard',
                messageId: 104,
            }),
            createEvent({
                id: 'event_requests_help',
                sceneId: 'scene_great_hall',
                messageId: 105,
            }),
        ],
    };
}

function proposal({
    observerId = 'hermione',
    targetId = 'player',
    eventId,
    summaryEn,
    confidence = 0.8,
    supersedesAppraisalId,
}) {
    return {
        observerId,
        targetId,
        summaryEn,
        sourceEventIds: [eventId],
        contextTags: ['help', 'pressure'],
        confidence,
        ...(supersedesAppraisalId
            ? {
                supersedesAppraisalId,
            }
            : {}),
    };
}

function supportProposals() {
    return [
        proposal({
            eventId:
                'event_corridor_help',
            sceneId: 'scene_corridor',
            messageId: 101,
            summaryEn:
                'She reads the refusal as pride surfacing when the player feels exposed.',
        }),
        proposal({
            eventId:
                'event_library_help',
            sceneId: 'scene_library',
            messageId: 102,
            summaryEn:
                'She interprets the quick dismissal as another attempt to hide embarrassment.',
            confidence: 0.75,
        }),
        proposal({
            eventId:
                'event_classroom_help',
            sceneId: 'scene_library',
            messageId: 103,
            summaryEn:
                'She now expects defensive independence whenever classmates notice the player struggling.',
            confidence: 0.85,
        }),
    ];
}

function counterProposals() {
    return [
        proposal({
            eventId:
                'event_accepts_help',
            sceneId: 'scene_courtyard',
            messageId: 104,
            summaryEn:
                'She notices the player can accept quiet help when no audience makes it embarrassing.',
            confidence: 0.85,
        }),
        proposal({
            eventId:
                'event_requests_help',
            sceneId: 'scene_great_hall',
            messageId: 105,
            summaryEn:
                'She is surprised that the player openly asks for assistance before pride takes over.',
            confidence: 0.9,
        }),
    ];
}

function activeSchemaOperation(
    supportAppraisalIds,
    overrides = {},
) {
    return {
        type: 'upsert',
        observerId: 'hermione',
        targetId: 'player',
        factPatternEn:
            'The player repeatedly refuses visible help.',
        interpretationEn:
            'The player protects pride when embarrassment has an audience.',
        expectationEn:
            'Hermione expects the player to refuse help when embarrassment has an audience.',
        supportAppraisalIds,
        counterAppraisalIds: [],
        contextTags: [
            'help',
            'pressure',
        ],
        ...overrides,
    };
}

test('old saves initialize Memory Synapse deterministically without inventing subjective evidence', () => {
    const legacy = {
        clock: '1991-09-01 · 09:00',
        actorLibrary: [{
            id: 'hermione',
            impressionOfPlayerEn:
                'A sharp but reckless classmate.',
        }],
    };
    const first =
        initializeMemorySynapseState(
            legacy,
        );
    assert.equal(first.changed, true);
    assert.deepEqual(
        first.state.memorySynapse,
        createDefaultMemorySynapse(),
    );
    assert.equal(
        first.state.actorLibrary[0]
            .impressionOfPlayerEn,
        legacy.actorLibrary[0]
            .impressionOfPlayerEn,
    );
    assert.deepEqual(
        first.state.memorySynapse.appraisals,
        [],
    );
    assert.deepEqual(
        first.state.memorySynapse.personSchemas,
        [],
    );

    const second =
        initializeMemorySynapseState(
            first.state,
        );
    assert.equal(second.changed, false);
    assert.equal(
        second.state,
        first.state,
    );
    assert.equal(
        validateMemorySynapse(
            second.state.memorySynapse,
        ).valid,
        true,
    );
});

test('normalizers produce stable IDs, ordering, confidence bounds, and strict validation', () => {
    const firstId = createAppraisalId({
        observerId: 'Hermione',
        targetId: 'PLAYER',
        sourceEventIds: [
            'event_b',
            'event_a',
        ],
    });
    const secondId = createAppraisalId({
        observerId: 'hermione',
        targetId: 'player',
        sourceEventIds: [
            'event_a',
            'event_b',
        ],
    });
    assert.equal(firstId, secondId);

    const normalized =
        normalizeMemorySynapse({
            version: 0,
            maxActiveSchemasPerPair: 99,
            appraisals: [
                {
                    observerId:
                        'hermione',
                    targetId: 'player',
                    summaryEn:
                        'A subjective reading.',
                    sourceEventIds: [
                        'event_b',
                        'event_a',
                    ],
                    confidence: 4,
                    status:
                        'provisional',
                    contextTags: [
                        'Social Pressure',
                    ],
                },
            ],
        });
    assert.equal(
        normalized
            .maxActiveSchemasPerPair,
        3,
    );
    assert.equal(
        normalized.appraisals[0]
            .confidence,
        1,
    );
    assert.deepEqual(
        normalized.appraisals[0]
            .sourceEventIds,
        [
            'event_a',
            'event_b',
        ],
    );
    assert.deepEqual(
        normalized.appraisals[0]
            .contextTags,
        ['social_pressure'],
    );
    assert.equal(
        validateMemorySynapse({
            ...normalized,
            unexpected: true,
        }).valid,
        false,
    );
});

test('observer access distinguishes participant, witness, reported recipient, and outsider', () => {
    const world = createWorld();
    world.eventKnowledge.push({
        eventKind: 'reported',
        eventId:
            'event_reported_help',
        sceneId: 'scene_corridor',
        summaryEn:
            'Ron reports the corridor event to Luna.',
        participantActorIds: [],
        witnessActorIds: [],
        report: {
            speakerId: 'ron',
            recipientIds: ['luna'],
        },
    });
    const base = {
        targetId: 'player',
        summaryEn:
            'The observer forms a private interpretation.',
        sourceEventIds: [
            'event_corridor_help',
        ],
        confidence: 0.7,
        status: 'provisional',
    };
    const participant =
        validateAppraisalObserverAccess(
            normalizeAppraisal({
                ...base,
                observerId:
                    'hermione',
            }),
            world,
        );
    assert.equal(
        participant.valid,
        true,
    );
    assert.equal(
        participant.basis,
        'participant',
    );

    const witness =
        validateAppraisalObserverAccess(
            normalizeAppraisal({
                ...base,
                observerId: 'ron',
            }),
            world,
        );
    assert.equal(witness.valid, true);
    assert.equal(
        witness.basis,
        'witness',
    );

    const reported =
        validateAppraisalObserverAccess(
            normalizeAppraisal({
                ...base,
                observerId: 'luna',
                sourceEventIds: [
                    'event_reported_help',
                ],
            }),
            world,
        );
    assert.equal(reported.valid, true);
    assert.equal(
        reported.basis,
        'reported',
    );

    const outsider =
        validateAppraisalObserverAccess(
            normalizeAppraisal({
                ...base,
                observerId: 'draco',
                sourceEventIds: [
                    'event_reported_help',
                ],
            }),
            world,
        );
    assert.equal(
        outsider.valid,
        false,
    );
    assert.match(
        outsider.errors.join(' '),
        /did not receive reported Event/u,
    );

    const missingEvent =
        validateAppraisalObserverAccess(
            normalizeAppraisal({
                ...base,
                observerId:
                    'hermione',
                sourceEventIds: [
                    'event_missing',
                ],
            }),
            world,
        );
    assert.equal(
        missingEvent.valid,
        false,
    );
    assert.match(
        missingEvent.errors.join(' '),
        /uncommitted event/u,
    );
});

test('Appraisal reducer accepts legal observer batches, rejects copied facts, deduplicates replay, and preserves superseded history', () => {
    const world = createWorld();
    const hermioneProposal =
        supportProposals()[0];
    const ronProposal = proposal({
        observerId: 'ron',
        eventId:
            'event_corridor_help',
        sceneId: 'scene_corridor',
        messageId: 101,
        summaryEn:
            'Ron takes the same refusal as stubbornness rather than embarrassment.',
        confidence: 0.65,
    });
    const afterBatch =
        applyAppraisalProposals(
            world,
            [
                hermioneProposal,
                ronProposal,
            ],
        );
    assert.equal(
        afterBatch.memorySynapse
            .appraisals.length,
        2,
    );
    assert.deepEqual(
        afterBatch.memorySynapse
            .appraisals
            .map(appraisal =>
                appraisal
                    .knowledgeSource)
            .sort(),
        [
            'participant',
            'witness',
        ],
    );

    const replay =
        applyAppraisalProposals(
            afterBatch,
            [
                ronProposal,
                hermioneProposal,
            ],
        );
    assert.deepEqual(
        replay.memorySynapse,
        afterBatch.memorySynapse,
    );

    const objectiveCopy =
        validateAppraisalProposal(
            proposal({
                eventId:
                    'event_corridor_help',
                sceneId:
                    'scene_corridor',
                messageId: 101,
                summaryEn:
                    'Objective account of event_corridor_help.',
            }),
            world,
        );
    assert.equal(
        objectiveCopy.valid,
        false,
    );
    assert.match(
        objectiveCopy.errors.join(' '),
        /interpret/u,
    );

    const previous =
        afterBatch.memorySynapse
            .appraisals
            .find(appraisal =>
                appraisal.observerId ===
                    'hermione');
    const reappraisal = proposal({
        eventId:
            'event_accepts_help',
        sceneId: 'scene_courtyard',
        messageId: 104,
        summaryEn:
            'She revises her view after seeing that privacy makes help easier to accept.',
        confidence: 0.85,
        supersedesAppraisalId:
            previous.id,
    });
    const revised =
        applyAppraisalProposals(
            afterBatch,
            [reappraisal],
        );
    const oldRecord =
        revised.memorySynapse
            .appraisals
            .find(appraisal =>
                appraisal.id ===
                    previous.id);
    const replacement =
        revised.memorySynapse
            .appraisals
            .find(appraisal =>
                appraisal
                    .supersedesAppraisalId ===
                    previous.id);
    assert.equal(
        oldRecord.status,
        'superseded',
    );
    assert.equal(
        oldRecord.supersededById,
        replacement.id,
    );
    assert.equal(
        replacement.status,
        'accepted',
    );
});

test('[defect-probing] Appraisal reducer accepts legal records while isolating unauthorized observers and Schema feedback', async () => {
    const {
        reduceAppraisalProposals,
    } = await import(
        '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-reducer.js'
    );
    assert.equal(
        typeof reduceAppraisalProposals,
        'function',
    );
    const legal =
        supportProposals()[0];
    const unauthorized = proposal({
        observerId: 'draco',
        eventId:
            'event_corridor_help',
        sceneId: 'scene_corridor',
        messageId: 101,
        summaryEn:
            'Draco treats the refusal as proof that the player cannot tolerate witnesses.',
    });
    const schemaFeedback = {
        ...proposal({
            eventId:
                'event_corridor_help',
            sceneId: 'scene_corridor',
            messageId: 101,
            summaryEn:
                'She repeats an activated expectation instead of forming a fresh interpretation.',
        }),
        activationSchemaIds: [
            'schema_feedback',
        ],
    };
    const reduced =
        reduceAppraisalProposals(
            createWorld(),
            [
                legal,
                unauthorized,
                schemaFeedback,
            ],
        );

    assert.equal(
        reduced.summary.proposed,
        3,
    );
    assert.equal(
        reduced.summary.accepted,
        1,
    );
    assert.equal(
        reduced.summary.rejected,
        2,
    );
    assert.deepEqual(
        reduced.state.memorySynapse
            .appraisals
            .map(appraisal =>
                appraisal.observerId),
        ['hermione'],
    );
    assert.deepEqual(
        new Set(
            reduced.outcomes
                .flatMap(outcome =>
                    outcome.reasons),
        ),
        new Set([
            'observer_not_authorized',
            'schema_feedback_source',
        ]),
    );
});

test('Person Schema promotion requires three accepted Appraisals across two scenes', () => {
    assert.equal(
        validatePersonSchema({
            id: 'schema_too_early',
            observerId: 'hermione',
            targetId: 'player',
            factPatternEn:
                'One refusal has been observed.',
            interpretationEn:
                'The refusal may reflect pride.',
            expectationEn:
                'Hermione expects a repeated pattern without enough evidence.',
            confidence: 0.8,
            supportAppraisalIds: [
                'appraisal_only_one',
            ],
            supportEventIds: [
                'event_only_one',
            ],
            counterAppraisalIds: [],
            contextTags: ['help'],
            status: 'active',
            updatedClock:
                '1991-09-03 · 17:00',
        }).valid,
        false,
    );
    const withAppraisals =
        applyAppraisalProposals(
            createWorld(),
            supportProposals(),
        );
    const supportIds =
        withAppraisals
            .memorySynapse
            .appraisals
            .map(appraisal =>
                appraisal.id);
    assert.throws(
        () =>
            applyPersonSchemaOperations(
                withAppraisals,
                [
                    activeSchemaOperation(
                        supportIds.slice(0, 2),
                    ),
                ],
            ),
        /three accepted Appraisals across two scenes/u,
    );

    const promoted =
        applyPersonSchemaOperations(
            withAppraisals,
            [
                activeSchemaOperation(
                    supportIds,
                ),
            ],
        );
    assert.equal(
        promoted.memorySynapse
            .personSchemas.length,
        1,
    );
    const schema =
        promoted.memorySynapse
            .personSchemas[0];
    assert.equal(
        schema.status,
        'active',
    );
    assert.deepEqual(
        schema.supportAppraisalIds,
        [...supportIds].sort(),
    );
    assert.deepEqual(
        schema.supportEventIds,
        [
            'event_classroom_help',
            'event_corridor_help',
            'event_library_help',
        ],
    );
    assert.equal(
        new Set(
            supportProposals()
                .flatMap(item =>
                    item.sourceEventIds)
                .map(eventId =>
                    createWorld()
                        .eventKnowledge
                        .find(event =>
                            event.eventId ===
                            eventId)
                        ?.sceneId),
        ).size,
        2,
    );
});

test('counterevidence lowers confidence, accumulated contradictions contest a Schema, and compatibility falls back', () => {
    const allProposals = [
        ...supportProposals(),
        ...counterProposals(),
    ];
    const withAppraisals =
        applyAppraisalProposals(
            createWorld(),
            allProposals,
        );
    const supportIds =
        withAppraisals
            .memorySynapse
            .appraisals
            .filter(appraisal =>
                [
                    'event_corridor_help',
                    'event_library_help',
                    'event_classroom_help',
                ].includes(
                    appraisal
                        .sourceEventIds[0],
                ))
            .map(appraisal =>
                appraisal.id);
    const counterIds =
        withAppraisals
            .memorySynapse
            .appraisals
            .filter(appraisal =>
                [
                    'event_accepts_help',
                    'event_requests_help',
                ].includes(
                    appraisal
                        .sourceEventIds[0],
                ))
            .map(appraisal =>
                appraisal.id);
    const promoted =
        applyPersonSchemaOperations(
            withAppraisals,
            [
                activeSchemaOperation(
                    supportIds,
                ),
            ],
        );
    const initial =
        promoted.memorySynapse
            .personSchemas[0];
    const withCounter =
        applyPersonSchemaOperations(
            promoted,
            [{
                type: 'upsert',
                schemaId: initial.id,
                counterAppraisalIds: [
                    counterIds[0],
                ],
            }],
        );
    const weakened =
        withCounter.memorySynapse
            .personSchemas
            .find(schema =>
                schema.id ===
                    initial.id);
    assert.equal(
        weakened.status,
        'contested',
    );
    assert.ok(
        weakened.confidence <
            initial.confidence,
    );

    const contestedState =
        applyPersonSchemaOperations(
            withCounter,
            [{
                type: 'upsert',
                schemaId: initial.id,
                counterAppraisalIds: [
                    counterIds[1],
                ],
            }],
        );
    const contested =
        contestedState.memorySynapse
            .personSchemas
            .find(schema =>
                schema.id ===
                    initial.id);
    assert.equal(
        contested.status,
        'contested',
    );
    assert.deepEqual(
        contested.counterAppraisalIds,
        [...counterIds].sort(),
    );
});

test('active Person Schemas are bounded per observer-target pair and explicit replacement keeps history', () => {
    const withAppraisals =
        applyAppraisalProposals(
            createWorld(),
            supportProposals(),
        );
    const supportIds =
        withAppraisals
            .memorySynapse
            .appraisals
            .map(appraisal =>
                appraisal.id);
    const labels = [
        'Proudly deflects visible help',
        'Masks uncertainty with speed',
        'Protects friends before asking',
        'Challenges rules under pressure',
    ];
    const bounded =
        applyPersonSchemaOperations(
            withAppraisals,
            labels.slice(0, 3).map(
                (_labelEn, index) =>
                    activeSchemaOperation(
                        supportIds,
                        {
                            factPatternEn:
                                `Repeated pattern ${index + 1} appears under pressure.`,
                            interpretationEn:
                                `Hermione interprets pattern ${index + 1} as defensive pride.`,
                            expectationEn:
                                `Hermione expects pattern ${index + 1} when pressure rises.`,
                            contextTags: [
                                `pattern_${index + 1}`,
                            ],
                        },
                    ),
            ),
        );
    assert.equal(
        bounded.memorySynapse
            .personSchemas
            .filter(schema =>
                schema.status ===
                    'active')
            .length,
        3,
    );
    assert.equal(
        bounded.memorySynapse
            .personSchemas
            .filter(schema =>
                schema.status ===
                    'superseded')
            .length,
        0,
    );

    const original =
        bounded.memorySynapse
            .personSchemas
            .find(schema =>
                schema.status ===
                    'active');
    const replacement =
        applyPersonSchemaOperations(
            bounded,
            [
                activeSchemaOperation(
                    supportIds,
                    {
                        factPatternEn:
                            'The player accepts help more readily in private.',
                        interpretationEn:
                            'Privacy reduces the player\'s need to defend pride.',
                        expectationEn:
                            'Hermione now expects private offers to be accepted more readily.',
                        contextTags: [
                            'private_help',
                        ],
                        supersedesSchemaId:
                            original.id,
                    },
                ),
            ],
        );
    const oldRecord =
        replacement.memorySynapse
            .personSchemas
            .find(schema =>
                schema.id ===
                    original.id);
    assert.equal(
        oldRecord.status,
        'superseded',
    );
    assert.ok(
        oldRecord.supersededById,
    );
    assert.equal(
        replacement.memorySynapse
            .personSchemas
            .some(schema =>
                schema.id ===
                    oldRecord
                        .supersededById &&
                schema.status ===
                    'active'),
        true,
    );
});

test('[defect-probing] Schema feedback provenance cannot support the same or a replacement Schema', () => {
    const operation =
        activeSchemaOperation([]);
    const candidateSchemaId =
        createPersonSchemaId(
            operation,
        );
    const feedbackWorld =
        createWorld();
    feedbackWorld.eventKnowledge =
        feedbackWorld.eventKnowledge
            .map(event => (
                [
                    101,
                    102,
                    103,
                ].includes(
                    event.sourceMessageIds[0],
                )
                    ? {
                        ...event,
                        provenance: {
                            activationSchemaIds: [
                                candidateSchemaId,
                            ],
                            derivedSchemaIds: [
                                candidateSchemaId,
                            ],
                        },
                    }
                    : event
            ));
    const withFeedback =
        applyAppraisalProposals(
            feedbackWorld,
            supportProposals(),
        );
    const feedbackIds =
        withFeedback.memorySynapse
            .appraisals
            .map(appraisal =>
                appraisal.id);
    assert.throws(
        () =>
            applyPersonSchemaOperations(
                withFeedback,
                [
                    activeSchemaOperation(
                        feedbackIds,
                    ),
                ],
            ),
        /Schema feedback provenance/u,
    );

    const withLegalAppraisals =
        applyAppraisalProposals(
            createWorld(),
            supportProposals(),
        );
    const promoted =
        applyPersonSchemaOperations(
            withLegalAppraisals,
            [
                activeSchemaOperation(
                    withLegalAppraisals
                        .memorySynapse
                        .appraisals
                        .map(appraisal =>
                            appraisal.id),
                ),
            ],
        );
    const existing =
        promoted.memorySynapse
            .personSchemas[0];
    const replacementInput =
        structuredClone(promoted);
    replacementInput.memorySynapse
        .appraisals =
        replacementInput.memorySynapse
            .appraisals
            .map(appraisal => ({
                ...appraisal,
                provenance: {
                    activationSchemaIds: [
                        existing.id,
                    ],
                    derivedSchemaIds: [
                        existing.id,
                    ],
                },
            }));
    assert.throws(
        () =>
            applyPersonSchemaOperations(
                replacementInput,
                [
                    activeSchemaOperation(
                        replacementInput
                            .memorySynapse
                            .appraisals
                            .map(appraisal =>
                                appraisal.id),
                        {
                            factPatternEn:
                                'The player accepts help more readily in private.',
                            interpretationEn:
                                'Privacy reduces the player\'s need to defend pride.',
                            expectationEn:
                                'Hermione expects private offers to be accepted more readily.',
                            contextTags: [
                                'private_help',
                            ],
                            supersedesSchemaId:
                                existing.id,
                        },
                    ),
                ],
            ),
        /Schema feedback provenance/u,
    );
});

test('unrelated Schema provenance remains legal Event evidence', () => {
    const world = createWorld();
    world.eventKnowledge =
        world.eventKnowledge.map(event => (
            [
                101,
                102,
                103,
            ].includes(
                event.sourceMessageIds[0],
            )
                ? {
                    ...event,
                    activationSchemaIds: [
                        'schema_unrelated',
                    ],
                    derivedSchemaIds: [
                        'schema_other',
                    ],
                }
                : event
        ));
    const withAppraisals =
        applyAppraisalProposals(
            world,
            supportProposals(),
        );
    assert.deepEqual(
        withAppraisals.memorySynapse
            .appraisals
            .map(appraisal => ({
                activationSchemaIds:
                    appraisal
                        .activationSchemaIds,
                derivedSchemaIds:
                    appraisal
                        .derivedSchemaIds,
            })),
        Array.from(
            { length: 3 },
            () => ({
                activationSchemaIds: [
                    'schema_unrelated',
                ],
                derivedSchemaIds: [
                    'schema_other',
                ],
            }),
        ),
    );
    const promoted =
        applyPersonSchemaOperations(
            withAppraisals,
            [
                activeSchemaOperation(
                    withAppraisals
                        .memorySynapse
                        .appraisals
                        .map(appraisal =>
                            appraisal.id),
                ),
            ],
        );
    assert.equal(
        promoted.memorySynapse
            .personSchemas[0]
            .status,
        'active',
    );
    assert.deepEqual(
        promoted.eventKnowledge,
        world.eventKnowledge,
    );
});
