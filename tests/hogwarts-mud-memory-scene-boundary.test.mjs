/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    runSocialDirectorGraph,
} from '../src/hogwarts-mud/social-director-v3-graph.js';
import {
    migrateActorContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    analyzeMemoryConsolidation,
    applyMemoryConsolidation,
    captureMemoryBoundaryGuard,
    isMemoryBoundaryGuardCurrent,
    normalizeMemoryConsolidationPayload,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-reducer.js';
import {
    applyCommittedSceneOpeningExperience,
    settleSceneCloseMemoryBoundary,
} from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import {
    applySceneTransition,
} from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import {
    validateSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    normalizeAppraisal,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    normalizeEventKnowledge,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    applySocialDirectorResult,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-v3-reducer.js';
import {
    createSocialMemoryWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';

function createAcceptedAppraisal(
    id,
    sceneId,
    messageId,
) {
    return normalizeAppraisal({
        id,
        observerId: 'hermione',
        targetId: 'player',
        summaryEn:
            `Hermione interprets evidence ${id} as a repeated refusal of public help.`,
        sourceEventIds: [
            `event_${id}`,
        ],
        sourceMessageIds: [
            messageId,
        ],
        sourceRumorIds: [],
        sceneId,
        contextTags: ['help'],
        confidence: 0.8,
        status: 'accepted',
        knowledgeSource: 'witness',
        committedClock:
            '1991-09-03 · 17:00',
        historicalClaimAllowed:
            true,
    });
}

function strictActorContextWorld(
    source,
) {
    const migrated =
        migrateActorContextV1({
            ...source,
            memorySynapse:
            undefined,
            actorLibrary:
            (
                source.actorLibrary ||
                []
            ).map(actor => ({
                nameEn:
                    actor.nameEn ||
                    actor.id,
                roleEn:
                    actor.roleEn ||
                    'Student',
                personalityEn:
                    'Observant and deliberate.',
                speechStyleEn:
                    'Clear and direct.',
                ...actor,
            })),
            actors:
            (
                source.actors ||
                []
            ).map(actor => ({
                mapId:
                    source.scene
                        ?.mapId ||
                    'castle',
                roomId:
                    source.scene
                        ?.roomId ||
                    'library',
                present: false,
                lifeStatus: 'alive',
                currentActivityEn: '',
                currentIntentEn: '',
                currentGoalEn: '',
                temporary: false,
                ...actor,
            })),
        }).state;
    if (source.memorySynapse) {
        migrated.memorySynapse =
            structuredClone(
                source.memorySynapse,
            );
    }
    if (source.eventKnowledge) {
        migrated.eventKnowledge =
            structuredClone(
                source.eventKnowledge,
            );
    }
    migrated.socialGraph =
        normalizeSocialGraph(
            source.socialGraph,
        );
    return migrated;
}

function createBoundaryWorld() {
    const appraisals = [
        createAcceptedAppraisal(
            'appraisal_a',
            'scene_a',
            10,
        ),
        createAcceptedAppraisal(
            'appraisal_b',
            'scene_b',
            20,
        ),
        createAcceptedAppraisal(
            'appraisal_c',
            'scene_b',
            21,
        ),
    ];
    return strictActorContextWorld({
        timelineEpoch: 'epoch_a',
        stateRevision: 7,
        phase: 'playing',
        clock: '1991-09-03 · 17:00',
        turn: {
            count: 30,
        },
        scene: {
            id: 'scene_b',
        },
        actorLibrary: [{
            id: 'hermione',
            impressionOfPlayerEn:
                'A difficult classmate.',
            sharedMemories: {
                core: [],
                recent: [],
                everyday: [{
                    eventId:
                            'event_appraisal_c',
                    lastClock:
                            '1991-09-03 · 17:00',
                }],
            },
        }],
        actors: [{
            id: 'hermione',
        }],
        memorySynapse: {
            version: 2,
            maxActiveSchemasPerPair: 3,
            appraisals,
            personSchemas: [],
        },
        eventKnowledge:
            appraisals.map(
                appraisal => {
                    const summaryEn =
                        `Committed source for ${appraisal.id}.`;
                    const sourceMessageId = {
                        appraisal_a:
                            10,
                        appraisal_b:
                            20,
                        appraisal_c:
                            21,
                    }[
                        appraisal.id
                    ];
                    const sceneId =
                        appraisal.id ===
                            'appraisal_a'
                            ? 'scene_a'
                            : 'scene_b';
                    return normalizeEventKnowledge({
                        version: 2,
                        eventId:
                            appraisal
                                .sourceEventIds[0],
                        eventKind:
                            'observed',
                        sceneId:
                            sceneId,
                        clock:
                            appraisal
                                .committedClock,
                        sourceMessageIds: [
                            sourceMessageId,
                        ],
                        summaryEn,
                        activationSchemaIds:
                            [],
                        participantActorIds: [
                            'player',
                        ],
                        witnessActorIds: [
                            'hermione',
                        ],
                        witnessCohortIds:
                            [],
                        witnessBasis: {
                            hermione:
                                'room_visual',
                        },
                        perception: {
                            version: 1,
                            visualScope:
                                'room',
                            audibleScope:
                                'none',
                            salience:
                                'normal',
                            attribution:
                                'clear',
                            concealment:
                                'none',
                            directParticipantActorIds: [
                                'player',
                            ],
                            evidenceText:
                                summaryEn,
                            confidence:
                                0.9,
                            source:
                                'post_turn_observer',
                        },
                        knownToPlayer:
                            true,
                        source:
                            'deterministic_fallback',
                    }, {
                        actors: [{
                            id:
                                'hermione',
                        }, {
                            id:
                                'player',
                        }],
                        sourceTexts: [
                            summaryEn,
                        ],
                    });
                },
            ),
        memoryDirector: {
            lastReviewedTurn: 10,
            pendingEventBoundary: {
                id: 'scene_b:event:30',
                boundaryId:
                    'scene_b:event:30',
                timelineEpoch: 'epoch_a',
                stateRevision: 7,
                status: 'pending',
                sceneId: 'scene_b',
                turn: 30,
            },
        },
    });
}

function createSchemaOperation() {
    return {
        type: 'upsert',
        observerId: 'hermione',
        targetId: 'player',
        factPatternEn:
            'The player repeatedly refuses public help.',
        interpretationEn:
            'The player protects autonomy by rejecting visible assistance.',
        expectationEn:
            'Hermione expects the player to reject assistance when other students can see.',
        supportAppraisalIds: [
            'appraisal_a',
            'appraisal_b',
            'appraisal_c',
        ],
        counterAppraisalIds: [],
        contextTags: ['help'],
    };
}

function createSocialExtraction(
    schemaOperations,
    processedThroughMessageId,
) {
    return {
        scanComplete: true,
        processedThroughMessageId,
        reviewAfterTurns: 10,
        reviews: [],
        reportedEvents: [],
        recipientAppraisals: [],
        identityClaims: [],
        relationshipClaims: [],
        personReferences: [],
        relationshipEvidence: [],
        schemaOperations,
    };
}

test('event-boundary medium schema accepts schemaOperations in the existing single call', async () => {
    let calls = 0;
    const schemaOperation =
        createSchemaOperation();
    const workflow =
        createSocialMemoryWorkflow({
            CONTEXT_SIZE_PRESETS: {
                rich: 64_000,
            },
            DEFAULT_MODEL_SLOTS: {
                medium: {
                    maxResponseLength: 8_000,
                },
            },
            buildSocialAudienceProjection:
                () => ({
                    relationships: [],
                }),
            createContextBudgetPlan:
                () => ({}),
            extractRoleResponseText:
                response => response,
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            normalizeMemoryConsolidationPayload,
            normalizeSocialGraph:
                graph => ({
                    statements: [],
                    relationshipEvidence: [],
                    relationships: [],
                    lastProcessedMessageId:
                        -1,
                    ...(graph || {}),
                }),
            sendModelTaskRequest:
                async () => {
                    calls += 1;
                    return createSocialExtraction(
                        [schemaOperation],
                        21,
                    );
                },
            validateMemoryConsolidation:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    const schema =
        workflow
            .SOCIAL_DIRECTOR_RESPONSE_SCHEMA
            .value;
    assert.ok(
        schema.properties
            .schemaOperations,
    );
    assert.ok(
        schema.required.includes(
            'schemaOperations',
        ),
    );
    const promptState =
        createBoundaryWorld();
    promptState.socialGraph = {};
    const prompt =
        workflow
            .createMemoryConsolidationPrompt(
                promptState,
                {
                    actors: [],
                },
                {
                    backfill: false,
                    messages: [],
                    allowedMessageIds: [],
                },
            );
    assert.match(
        prompt[0].content,
        /schemaOperations/u,
    );
    const promptPayload =
        JSON.parse(
            prompt[1].content,
        );
    assert.equal(
        promptPayload
            .memorySynapse
            .appraisals.length,
        0,
    );
    assert.deepEqual(
        promptPayload
            .socialAuthorityStamp,
        {
            timelineEpoch:
                promptState
                    .timelineEpoch,
            stateRevision:
                promptState
                    .stateRevision,
            clock:
                promptState.clock,
            currentSceneId:
                promptState
                    .scene.id,
            actorIds: [
                'player',
            ],
        },
    );
    assert.equal(
        Object.hasOwn(
            promptPayload,
            'authoritySnapshot',
        ),
        false,
    );
    assert.match(
        prompt[0].content,
        /committed Events[\s\S]*schemaOperations may promote or update a Person Schema/iu,
    );
    const promptWorld =
        createBoundaryWorld();
    const evidence = {
        backfill: false,
        hasMore: false,
        messages: [],
        allowedMessageIds: [
            10,
            20,
            21,
        ],
        messageSceneIds: {
            10: 'scene_a',
            20: 'scene_b',
            21: 'scene_b',
        },
        witnessActorIdsByMessageId: {
            10: ['hermione'],
            20: ['hermione'],
            21: ['hermione'],
        },
        eventKnowledge:
            promptWorld
                .eventKnowledge,
        presentActorIds: [
            'hermione',
        ],
        sceneIds: [
            'scene_a',
            'scene_b',
        ],
    };
    const result =
        await workflow
            .generateMemoryConsolidation(
                {},
                promptWorld,
                {
                    actors: [],
                },
                evidence,
                {},
            );
    assert.equal(calls, 1);
    assert.deepEqual(
        result.schemaOperations,
        [schemaOperation],
    );
});

test('[defect-probing] production Memory Consolidation records Schema validation outcomes', async () => {
    const state =
        createBoundaryWorld();
    state.scene.startedMessageId =
        1;
    state.socialGraph =
        normalizeSocialGraph();
    const diagnosticSummary =
        'Hermione sees the player refuse help in public.';
    state.eventKnowledge = [
        ...state.eventKnowledge,
        normalizeEventKnowledge({
            version: 2,
            eventKind:
                'observed',
            eventId:
            'event_schema_diagnostics',
            sceneId: 'scene_b',
            clock: state.clock,
            sourceMessageIds: [1],
            summaryEn:
                diagnosticSummary,
            activationSchemaIds:
                [],
            participantActorIds: [
                'hermione',
            ],
            witnessActorIds: [
                'hermione',
            ],
            witnessCohortIds: [],
            witnessBasis: {
                hermione: 'direct',
            },
            perception: {
                version: 1,
                visualScope: 'room',
                audibleScope: 'room',
                salience: 'normal',
                attribution: 'clear',
                concealment: 'none',
                directParticipantActorIds: [
                    'hermione',
                ],
                evidenceText:
                    diagnosticSummary,
                confidence: 0.9,
                source:
                    'post_turn_observer',
            },
            knownToPlayer: true,
            source:
                'post_turn_observer',
        }, {
            actors: state.actors,
            sourceTexts: [
                diagnosticSummary,
            ],
        }),
    ];
    const context = {
        chat: [{}, {
            is_user: false,
            extra: {
                hogwartsMud: {
                    segments: [{
                        type:
                            'narration',
                        textEn:
                            diagnosticSummary,
                    }],
                },
            },
        }],
        chatMetadata: {
            hogwartsMud:
                state,
        },
        saveMetadata:
            async () => {
                const current =
                    context.chatMetadata
                        .hogwartsMud;
                context.chatMetadata
                    .hogwartsMud = {
                        ...current,
                        stateRevision:
                        current.stateRevision + 1,
                    };
            },
    };
    const diagnostics = [];
    const originalFetch =
        globalThis.fetch;
    const schemaOperation =
        createSchemaOperation();
    try {
        globalThis.fetch =
            async (
                _url,
                request,
            ) => {
                const input =
                    JSON.parse(
                        request.body,
                    );
                assert.deepEqual(
                    input
                        .allowedMessageIds,
                    [1],
                );
                assert.equal(
                    input.extraction
                        .processedThroughMessageId,
                    1,
                );
                const result =
                    await runSocialDirectorGraph(
                        input,
                    );
                return {
                    ok: true,
                    json:
                        async () =>
                            result,
                };
            };
        const workflow =
            createSocialMemoryWorkflow({
                CONTEXT_SIZE_PRESETS: {
                    rich: 64_000,
                },
                DEFAULT_MODEL_SLOTS: {
                    medium: {
                        maxResponseLength:
                            8_000,
                    },
                },
                SOCIAL_GRAPH_EXTRACTOR_VERSION:
                    3,
                analyzeMemoryConsolidation:
                    () => ({
                        shouldReview: true,
                        actors: [],
                    }),
                applySocialDirectorResult:
                    applySocialDirectorResult,
                applySystemPrompt:
                    () => {},
                buildSocialAudienceProjection:
                    () => ({
                        relationships: [],
                    }),
                captureMemoryBoundaryGuard,
                createContextBudgetPlan:
                    () => ({}),
                extractRoleResponseText:
                    response =>
                        response,
                getContext:
                    () => context,
                getMudState:
                    () =>
                        context
                            .chatMetadata
                            .hogwartsMud,
                getRequestHeaders:
                    () => ({}),
                getSettings:
                    () => ({
                        translationEnabled:
                            false,
                    }),
                isMemoryBoundaryGuardCurrent,
                jobRegistry: {
                    memory: null,
                },
                normalizeMemoryConsolidationPayload,
                normalizeSocialGraph,
                recordTurnDiagnostic:
                    (stage, data) => {
                        diagnostics.push({
                            stage,
                            data,
                        });
                    },
                renderAll:
                    () => {},
                resolveRoleSlots:
                    () => ({
                        medium: {
                            contextSize:
                                64_000,
                            maxResponseLength:
                                8_000,
                        },
                    }),
                sendModelTaskRequest:
                    async () =>
                        createSocialExtraction(
                            [
                                schemaOperation,
                            ],
                            1,
                        ),
                syncLocalKnowledge:
                    async () => {},
                validateMemoryConsolidation:
                    () => ({
                        valid: true,
                        errors: [],
                    }),
                validateSocialDirectorResult:
                    () => ({
                        valid: true,
                        errors: [],
                    }),
            });

        await workflow
            .ensureMemoryConsolidation();
        const outcome =
            diagnostics.find(entry =>
                entry.stage ===
                    'schema_operations_validation');
        assert.deepEqual(
            outcome.data,
            {
                proposed: 1,
                accepted: 1,
                rejected: 0,
                reasons: [],
            },
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});

test('[defect-probing] social resolver returns schemaOperations from the same medium extraction', async () => {
    const schemaOperation =
        createSchemaOperation();
    const world =
        createBoundaryWorld();
    const result =
        await runSocialDirectorGraph({
            sceneId: 'scene_b',
            clock:
                '1991-09-03 · 17:00',
            turn: 30,
            actorIds: [
                'hermione',
                'player',
            ],
            presentActorIds: [
                'hermione',
            ],
            allowedMessageIds: [
                10,
                20,
                21,
            ],
            eventKnowledge:
                world.eventKnowledge,
            existingGraph:
                normalizeSocialGraph(),
            extraction:
                createSocialExtraction(
                    [schemaOperation],
                    21,
                ),
        });
    assert.deepEqual(
        result.schemaOperations,
        [schemaOperation],
    );
});

test('memory consolidation commits schema operations and rejects stale epoch, revision, or boundary ID', () => {
    const world =
        createBoundaryWorld();
    const guard =
        captureMemoryBoundaryGuard(
            world,
        );
    assert.equal(
        isMemoryBoundaryGuardCurrent(
            world,
            guard,
        ),
        true,
    );
    const operation =
        createSchemaOperation();
    const committed =
        applyMemoryConsolidation(
            world,
            {
                reviews: [],
                schemaOperations: [
                    operation,
                ],
            },
            {
                boundaryGuard:
                    guard,
            },
        );
    assert.equal(
        committed.memorySynapse
            .personSchemas.length,
        1,
    );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary
            .status,
        'consumed',
    );

    for (const stale of [
        {
            ...world,
            timelineEpoch:
                'epoch_b',
        },
        {
            ...world,
            stateRevision: 8,
        },
        {
            ...world,
            memoryDirector: {
                ...world.memoryDirector,
                pendingEventBoundary: {
                    ...world
                        .memoryDirector
                        .pendingEventBoundary,
                    boundaryId:
                        'different_boundary',
                    id:
                        'different_boundary',
                },
            },
        },
    ]) {
        const before =
            structuredClone(stale);
        assert.equal(
            isMemoryBoundaryGuardCurrent(
                stale,
                guard,
            ),
            false,
        );
        assert.throws(
            () =>
                applyMemoryConsolidation(
                    stale,
                    {
                        reviews: [],
                        schemaOperations: [],
                    },
                    {
                        boundaryGuard:
                            guard,
                    },
                ),
            /stale memory boundary/iu,
        );
        assert.deepEqual(
            stale,
            before,
        );
    }
});

test('[defect-probing] memory consolidation keeps active Schema authoritative without actor compatibility copies', () => {
    const world =
        createBoundaryWorld();
    const worldFacts = {
        locationId:
            'transfiguration_classroom',
        itemIds: [
            'brass_quill',
        ],
    };
    world.worldFacts = worldFacts;
    const committed =
        applyMemoryConsolidation(
            world,
            {
                reviews: [],
                schemaOperations: [
                    createSchemaOperation(),
                ],
            },
        );
    assert.equal(
        Object.hasOwn(
            committed
                .actorLibrary[0],
            'impressionOfPlayerEn',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            committed.actors[0],
            'impressionOfPlayerEn',
        ),
        false,
    );
    assert.equal(
        committed.memorySynapse
            .personSchemas[0]
            .factPatternEn,
        'The player repeatedly refuses public help.',
    );
    assert.deepEqual(
        committed.worldFacts,
        worldFacts,
    );
});

test('memory consolidation does not recreate a discarded legacy current opinion', () => {
    const committed =
        applyMemoryConsolidation(
            createBoundaryWorld(),
            {
                reviews: [],
                schemaOperations: [],
            },
        );
    assert.equal(
        Object.hasOwn(
            committed
                .actorLibrary[0],
            'impressionOfPlayerEn',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            committed.actors[0],
            'impressionOfPlayerEn',
        ),
        false,
    );
    assert.equal(
        committed.memorySynapse
            .appraisals
            .some(appraisal =>
                appraisal.summaryEn ===
                    'A difficult classmate.'),
        false,
    );
    assert.equal(
        Object.values(
            committed.actorMemoryIndex
                .byActorId,
        ).some(entry =>
            [
                'core',
                'recent',
                'everyday',
            ].some(tier =>
                entry[tier].some(
                    reference =>
                        committed
                            .memorySynapse
                            .appraisals
                            .find(appraisal =>
                                appraisal.id ===
                                    reference
                                        .recordId)
                            ?.summaryEn ===
                            'A difficult classmate.',
                ))),
        false,
    );
});

test('[defect-probing] social director commits schema operations under the captured boundary guard', () => {
    const world =
        createBoundaryWorld();
    world.socialGraph =
        normalizeSocialGraph();
    const guard =
        captureMemoryBoundaryGuard(
            world,
        );
    const result = {
        socialGraph:
            normalizeSocialGraph({
                lastProcessedMessageId:
                    10,
            }),
        reportedEvents: [],
        recipientAppraisals: [],
        memoryReviews: [],
        schemaOperations: [
            createSchemaOperation(),
        ],
        processedThroughMessageId:
            10,
        scanComplete: true,
        acceptedEvidenceIds: [],
        structurallyRetainedAppraisalIds:
            [],
        rejected: [],
    };
    const committed =
        applySocialDirectorResult(
            world,
            result,
            [10],
            {
                boundaryGuard:
                    guard,
            },
        );
    assert.equal(
        committed.memorySynapse
            .personSchemas.length,
        1,
    );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary
            .status,
        'consumed',
    );

    const stale = {
        ...world,
        stateRevision: 8,
    };
    const before =
        structuredClone(stale);
    assert.throws(
        () =>
            applySocialDirectorResult(
                stale,
                result,
                [10],
                {
                    boundaryGuard:
                        guard,
                },
            ),
        /stale memory boundary/iu,
    );
    assert.deepEqual(
        stale,
        before,
    );
});

test('scene close clears a consumed boundary but carries a pending boundary into the next scene', () => {
    const world =
        createBoundaryWorld();
    const carried =
        settleSceneCloseMemoryBoundary(
            world.memoryDirector,
            'scene_c',
        );
    assert.equal(
        carried.pendingEventBoundary
            .boundaryId,
        'scene_b:event:30',
    );
    assert.equal(
        carried.pendingEventBoundary
            .carriedToSceneId,
        'scene_c',
    );
    const signals =
        analyzeMemoryConsolidation({
            ...world,
            scene: {
                id: 'scene_c',
            },
            memoryDirector:
                carried,
        });
    assert.equal(
        signals.shouldReview,
        true,
    );

    const consumed =
        settleSceneCloseMemoryBoundary(
            {
                ...world.memoryDirector,
                pendingEventBoundary: {
                    ...world
                        .memoryDirector
                        .pendingEventBoundary,
                    status: 'consumed',
                },
            },
            'scene_c',
        );
    assert.equal(
        consumed
            .pendingEventBoundary,
        null,
    );
});

test('committed scene opening records exact provenance without creating Item or relationship facts', () => {
    const world =
        strictActorContextWorld({
            clock: '1991-09-03 · 18:00',
            turn: {
                count: 30,
            },
            scene: {
                id: 'scene_c',
                mapId: 'castle',
                roomId: 'library',
            },
            map: {
                activeMapId: 'castle',
                currentLocalNodeId:
                'library',
            },
            activeInteractionActorIds: [
                'hermione',
            ],
            actors: [{
                id: 'hermione',
                present: true,
                mapId: 'castle',
                roomId: 'library',
            }],
            actorLibrary: [{
                id: 'hermione',
                sharedMemories: {
                    core: [],
                    recent: [],
                    everyday: [],
                },
            }],
            items: [{
                id: 'tracked_quill',
                holderId: 'player',
            }],
            socialGraph: {
                relationships: [],
            },
            eventKnowledge: [],
        });
    const message = {
        mes:
            'The library lamps burn low. Hermione closes a book and looks toward the player.',
        extra: {
            hogwartsMud: {
                role: 'scene_opening',
                sceneId: 'scene_c',
                segments: [{
                    type: 'narration',
                    textEn:
                        'The library lamps burn low.',
                }, {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'We should begin.',
                }],
            },
        },
    };
    const result =
        applyCommittedSceneOpeningExperience(
            world,
            message,
            44,
        );
    assert.deepEqual(
        result.event
            .sourceMessageIds,
        [44],
    );
    assert.equal(
        result.event.sceneId,
        'scene_c',
    );
    assert.deepEqual(
        result.event.witnessActorIds,
        ['hermione'],
    );
    assert.deepEqual(
        result.state.items,
        world.items,
    );
    assert.deepEqual(
        result.state.socialGraph,
        world.socialGraph,
    );
    assert.equal(
        result.state
            .eventKnowledge.length,
        1,
    );
    assert.deepEqual(
        result.state
            .actorMemoryIndex
            .byActorId
            .hermione
            .everyday[0],
        {
            recordType: 'event',
            recordId:
                result.event.eventId,
            addedClock:
                world.clock,
        },
    );
});

test('[defect-probing] committed scene opening experience is projected only from structured Scene authority', () => {
    const world =
        strictActorContextWorld({
            clock: '1991-09-03 · 18:00',
            turn: {
                count: 30,
            },
            scene: {
                id: 'scene_c',
                mapId: 'castle',
                roomId: 'library',
            },
            actors: [{
                id: 'hermione',
                present: true,
                mapId: 'castle',
                roomId: 'library',
            }],
            actorLibrary: [{
                id: 'hermione',
                sharedMemories: {
                    core: [],
                    recent: [],
                    everyday: [],
                },
            }],
            eventKnowledge: [],
        });
    const safeObservation =
        'Rain traces the library windows while Hermione closes the nearest book.';
    const result =
        applyCommittedSceneOpeningExperience(
            world,
            {
                extra: {
                    hogwartsMud: {
                        role:
                            'scene_opening',
                        sceneId:
                            'scene_c',
                        segments: [{
                            type:
                                'narration',
                            textEn:
                                safeObservation,
                        }, {
                            type:
                                'dialogue',
                            actorId:
                                'hermione',
                            textEn:
                                'You are the hidden heir of Ravenclaw.',
                        }, {
                            type:
                                'dialogue',
                            actorId:
                                'hermione',
                            textEn:
                                'I promise to show you the forbidden book tonight.',
                        }, {
                            type:
                                'dialogue',
                            actorId:
                                'hermione',
                            textEn:
                                'From now on, you are my sister and closest friend.',
                        }, {
                            type:
                                'dialogue',
                            actorId:
                                'hermione',
                            textEn:
                                'Take my silver ring; it is yours now.',
                        }],
                    },
                },
            },
            45,
        );
    const memory =
        result.state
            .actorMemoryIndex
            .byActorId
            .hermione
            .everyday[0];
    const authoritativeSummary =
        'At 1991-09-03 · 18:00, the scene opens in library. Present actors: hermione.';

    assert.equal(
        result.event.summaryEn,
        authoritativeSummary,
    );
    assert.equal(
        result.event.perception
            .evidenceText,
        authoritativeSummary,
    );
    assert.equal(
        memory.recordId,
        result.event.eventId,
    );
    assert.equal(
        Object.hasOwn(
            memory,
            'summaryEn',
        ),
        false,
    );
    assert.equal(
        result.event.source,
        'structured_scene_opening',
    );
    assert.doesNotMatch(
        JSON.stringify({
            events:
                result.state
                    .eventKnowledge,
            memories:
                result.state
                    .actorMemoryIndex,
        }),
        /hidden heir|forbidden book|promise|sister|closest friend|silver ring|yours now/iu,
    );

    const synonymBypass =
        applyCommittedSceneOpeningExperience(
            world,
            {
                extra: {
                    hogwartsMud: {
                        role:
                            'scene_opening',
                        sceneId:
                            'scene_c',
                        segments: [{
                            type:
                                'dialogue',
                            actorId:
                                'hermione',
                            textEn:
                                'The forbidden volume will be waiting for Tina at midnight.',
                        }, {
                            type:
                                'narration',
                            textEn:
                                'Harry settles a silver ring into Tina\'s palm.',
                        }, {
                            type:
                                'dialogue',
                            actorId:
                                'hermione',
                            textEn:
                                'The old bloodline account is confirmed, and our bond is unbreakable.',
                        }],
                    },
                },
            },
            46,
        );
    assert.equal(
        synonymBypass.event
            .summaryEn,
        authoritativeSummary,
    );
    assert.doesNotMatch(
        JSON.stringify({
            event:
                synonymBypass.event,
            memories:
                synonymBypass.state
                    .actorMemoryIndex,
        }),
        /forbidden volume|midnight|silver ring|palm|bloodline|unbreakable/iu,
    );
});

test('[defect-probing] scene close carry remains reviewable and consumable on a later turn', () => {
    const state =
        strictActorContextWorld({
            timelineEpoch: 'epoch_a',
            stateRevision: 7,
            phase: 'playing',
            clock: '1991-09-03 · 17:00',
            chapter: 'Old Chapter',
            location: 'Old Room',
            turn: {
                count: 30,
            },
            scene: {
                id: 'scene_old',
                nameEn: 'Old Room',
                summaryEn: 'The old scene.',
                startedClock:
                '1991-09-03 · 16:00',
                timelineEntries: [],
                mapId: 'castle',
                roomId: 'old_room',
            },
            sceneArchive: [],
            timeline: [],
            globalChronicle: {
                version: 1,
                entries: [],
            },
            map: {
                activeMapId: 'castle',
                currentLocalNodeId:
                'old_room',
                currentLevelId: 'level',
                discoveredLocalNodeIds: [],
                customLocalMaps: [{
                    id: 'castle',
                    defaultLevelId: 'level',
                    levels: [{
                        id: 'level',
                    }],
                    nodes: [{
                        id: 'old_room',
                        name: 'Old Room',
                        nameEn: 'Old Room',
                        levelId: 'level',
                    }, {
                        id: 'library',
                        name: 'Library',
                        nameEn: 'Library',
                        levelId: 'level',
                    }],
                    exits: [],
                }],
                generatedLocalNodes: [],
            },
            actorLibrary: [{
                id: 'hermione',
                nameEn: 'Hermione',
                firstImpressionOfPlayerEn:
                'A capable classmate.',
                sharedMemories: {
                    core: [],
                    recent: [{
                        id: 'memory_scene_close',
                        summaryEn:
                        'Hermione remembers the old discussion ending.',
                        updatedTurn: 30,
                    }],
                    everyday: [],
                },
            }, {
                id: 'ron',
                nameEn: 'Ron',
                firstImpressionOfPlayerEn:
                'A loud classmate.',
                sharedMemories: {
                    core: [],
                    recent: [],
                    everyday: [],
                },
            }],
            actors: [{
                id: 'hermione',
                nameEn: 'Hermione',
                present: true,
                lifeStatus: 'alive',
                currentIntentEn:
                'Finish the old argument.',
                currentIntent:
                'Finish the old argument.',
                mapId: 'castle',
                roomId: 'old_room',
            }, {
                id: 'ron',
                nameEn: 'Ron',
                present: true,
                lifeStatus: 'alive',
                currentIntentEn:
                'Keep arguing in the old scene.',
                currentIntent:
                'Keep arguing in the old scene.',
                mapId: 'castle',
                roomId: 'old_room',
            }],
            items: [],
            cohorts: [],
            memoryDirector: {
                lastReviewedTurn: 20,
                pendingEventBoundary: {
                    id: 'scene_old:event:30',
                    boundaryId:
                    'scene_old:event:30',
                    timelineEpoch: 'epoch_a',
                    stateRevision: 7,
                    status: 'pending',
                    sceneId: 'scene_old',
                    turn: 30,
                },
            },
        });
    const payload = {
        transitionMinutes: 5,
        nextClock:
            '1991-09-03 · 17:05',
        closureSummaryEn:
            'The old discussion ends.',
        globalChronicleSummaryEn:
            'The classroom discussion ended after Hermione and Ron exhausted the immediate disagreement. Hermione moved to the library for assigned reading while Ron left the active cast, and the unresolved memory boundary remained available for the next eligible consolidation turn without changing any established relationship or Item fact.',
        authorQuillEn:
            'This chapter closes with sufficient paperwork, several determined glances, and one heroic refusal to leave a sentence unfinished. The editorial desk notes that everyone survived the conversation, which is already above average for a school evening. Hermione wins the Orderly Exit award; the furniture receives honourable mention for staying neutral throughout.',
        unresolvedThreadsEn: [],
        nextScene: {
            id: 'scene_library',
            nameEn: 'Library',
            summaryEn:
                'Library opens for a quiet study scene.',
            chapterEn: 'Library Study',
            mapId: 'castle',
            roomId: 'library',
            explorationHookEn:
                'A returned book bears a fresh handwritten shelf mark.',
            temporalFactsEn: [],
            actorStates: [{
                id: 'hermione',
                present: true,
                currentActivityEn:
                    'Sorting books at a table.',
                currentIntentEn: '',
                lifeStatus: 'alive',
                lifeStatusPermanent:
                    false,
                lifeStatusDetailEn:
                    'Alive and unharmed.',
                mapId: 'castle',
                roomId: 'library',
            }],
            openingSegments: [{
                type: 'narration',
                textEn:
                    'The Library settles into evening quiet.',
            }, {
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    'This table is free.',
            }],
            followingSceneIntent: {
                titleEn: 'Leave the Library',
                summaryEn:
                    'Conclude the study session.',
                triggerEn:
                    'After the player finishes studying.',
                mapId: 'castle',
                roomId: 'old_room',
                tier: 'medium',
            },
        },
    };
    const missingActiveIntent =
        structuredClone(payload);
    delete missingActiveIntent
        .nextScene
        .actorStates[0]
        .currentIntentEn;
    assert.equal(
        validateSceneTransitionPackage(
            missingActiveIntent,
            state,
            {
                expectedMapId:
                    'castle',
                expectedRoomId:
                    'library',
                tier: 'medium',
            },
        ).valid,
        false,
    );
    const inactiveWithoutIntent =
        structuredClone(payload);
    inactiveWithoutIntent
        .nextScene
        .actorStates[0]
        .present = false;
    delete inactiveWithoutIntent
        .nextScene
        .actorStates[0]
        .currentIntentEn;
    inactiveWithoutIntent
        .nextScene
        .openingSegments[1] = {
            type: 'narration',
            textEn:
                'Dust drifts through a narrow beam of evening light.',
        };
    assert.equal(
        validateSceneTransitionPackage(
            inactiveWithoutIntent,
            state,
            {
                expectedMapId:
                    'castle',
                expectedRoomId:
                    'library',
                tier: 'medium',
            },
        ).valid,
        true,
    );
    const next =
        applySceneTransition(
            state,
            payload,
            {
                id: 'scene_old',
                endedClock:
                    state.clock,
                closureSummary:
                    payload
                        .closureSummaryEn,
            },
            {
                expectedMapId:
                    'castle',
                expectedRoomId:
                    'library',
                tier: 'medium',
            },
        );
    assert.equal(
        next.actors.find(actor =>
            actor.id ===
                'hermione')
            .currentIntentEn,
        '',
    );
    assert.equal(
        Object.hasOwn(
            next.actors.find(actor =>
                actor.id ===
                    'hermione'),
            'currentIntent',
        ),
        false,
    );
    assert.equal(
        next.actors.find(actor =>
            actor.id === 'ron')
            .currentIntentEn,
        '',
    );
    assert.equal(
        Object.hasOwn(
            next.actors.find(actor =>
                actor.id === 'ron'),
            'currentIntent',
        ),
        false,
    );
    assert.equal(
        next.memoryDirector
            .pendingEventBoundary
            .boundaryId,
        'scene_old:event:30',
    );
    assert.equal(
        next.memoryDirector
            .pendingEventBoundary
            .carriedToSceneId,
        'scene_library',
    );
    assert.equal(
        next.memoryDirector
            .lastReviewedTurn,
        20,
    );

    const subsequentTurn = {
        ...next,
        turn: {
            ...next.turn,
            count: 31,
        },
    };
    const signals =
        analyzeMemoryConsolidation(
            subsequentTurn,
        );
    assert.equal(
        signals.shouldReview,
        true,
    );
    const guard =
        captureMemoryBoundaryGuard(
            subsequentTurn,
        );
    for (const stale of [
        {
            ...subsequentTurn,
            timelineEpoch: 'epoch_b',
        },
        {
            ...subsequentTurn,
            stateRevision: 8,
        },
        {
            ...subsequentTurn,
            memoryDirector: {
                ...subsequentTurn
                    .memoryDirector,
                pendingEventBoundary: {
                    ...subsequentTurn
                        .memoryDirector
                        .pendingEventBoundary,
                    boundaryId:
                        'different_boundary',
                },
            },
        },
    ]) {
        assert.throws(
            () =>
                applyMemoryConsolidation(
                    stale,
                    {
                        reviews: [],
                        schemaOperations: [],
                    },
                    {
                        boundaryGuard:
                            guard,
                    },
                ),
            /stale memory boundary/iu,
        );
    }
    const consolidated =
        applyMemoryConsolidation(
            subsequentTurn,
            {
                reviews: [],
                schemaOperations: [],
            },
            {
                boundaryGuard:
                    guard,
            },
        );
    assert.equal(
        consolidated.memoryDirector
            .pendingEventBoundary
            .status,
        'consumed',
    );

    const committedIntentPayload =
        structuredClone(payload);
    committedIntentPayload
        .nextScene
        .actorStates[0]
        .currentIntentEn =
        'Finish the assigned reading before supper.';
    const withCommittedIntent =
        applySceneTransition(
            state,
            committedIntentPayload,
            {
                id: 'scene_old',
                endedClock:
                    state.clock,
                closureSummary:
                    committedIntentPayload
                        .closureSummaryEn,
            },
            {
                expectedMapId:
                    'castle',
                expectedRoomId:
                    'library',
                tier: 'medium',
            },
        );
    assert.equal(
        withCommittedIntent
            .actors
            .find(actor =>
                actor.id ===
                    'hermione')
            .currentIntentEn,
        'Finish the assigned reading before supper.',
    );
});
