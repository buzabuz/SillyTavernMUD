/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    runSocialDirectorGraph,
} from '../src/hogwarts-mud/social-director-graph.js';
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
    createPendingEventBoundary,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    normalizeAppraisal,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    buildNarrativeAuthoritySnapshot,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-authority.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    applySocialDirectorResult,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-reducer.js';
import {
    createSceneTransitionWorkflow,
    getSceneTransitionRetrievalOptions,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
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
    return migrateActorContextV1({
        ...source,
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
                    id: 'memory_a',
                    summaryEn:
                        'The player refused help in public.',
                    updatedTurn: 30,
                }],
            },
        }],
        actors: [{
            id: 'hermione',
        }],
        memorySynapse: {
            version: 1,
            maxActiveSchemasPerPair: 3,
            appraisals,
            personSchemas: [],
        },
        eventKnowledge:
            appraisals.map(appraisal => ({
                eventId:
                    appraisal
                        .sourceEventIds[0],
                summaryEn:
                    `Committed source for ${appraisal.id}.`,
            })),
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
            normalizeActorMemoryProfile:
                actor => ({
                    ...actor,
                    sharedMemories:
                        actor.sharedMemories,
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
            selectSharedMemoriesForContext:
                memories => memories,
            sendRoleRequest:
                async () => {
                    calls += 1;
                    return {
                        scanComplete: true,
                        reviewAfterTurns: 10,
                        reviews: [],
                        statements: [],
                        relationshipEvidence: [],
                        schemaOperations: [
                            schemaOperation,
                        ],
                    };
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
            .authoritySnapshot,
        buildNarrativeAuthoritySnapshot(
            promptState,
        ),
    );
    assert.match(
        prompt[0].content,
        /Current structured State[\s\S]*current-scene[\s\S]*earlier Events[\s\S]*Appraisals or Schemas[\s\S]*raw historical evidence/iu,
    );
    const result =
        await workflow
            .generateMemoryConsolidation(
                {},
                createBoundaryWorld(),
                {
                    actors: [],
                },
                {
                    backfill: false,
                    messages: [],
                    allowedMessageIds: [],
                },
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
        0;
    state.socialGraph =
        normalizeSocialGraph();
    state.eventKnowledge = [
        ...state.eventKnowledge,
        {
            eventId:
            'event_schema_diagnostics',
            sceneId: 'scene_b',
            sourceMessageIds: [0],
            summaryEn:
            'Hermione sees the player refuse help in public.',
            participantActorIds: [
                'hermione',
            ],
            witnessActorIds: [
                'hermione',
            ],
        },
    ];
    const context = {
        chat: [{
            is_user: false,
            extra: {
                hogwartsMud: {
                    segments: [{
                        type:
                            'narration',
                        textEn:
                            'Hermione sees the player refuse help in public.',
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
            async () => ({
                ok: true,
                json:
                    async () => ({
                        socialGraph:
                            normalizeSocialGraph(),
                        memoryReviews: [],
                        schemaOperations: [
                            schemaOperation,
                        ],
                        acceptedStatementIds:
                            [],
                        acceptedEvidenceIds:
                            [],
                    }),
            });
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
                normalizeActorMemoryProfile:
                    actor => actor,
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
                selectSharedMemoriesForContext:
                    memories =>
                        memories,
                sendRoleRequest:
                    async () => ({
                        scanComplete: true,
                        reviewAfterTurns:
                            10,
                        reviews: [],
                        statements: [],
                        relationshipEvidence:
                            [],
                        schemaOperations: [
                            schemaOperation,
                        ],
                    }),
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

test('memory localization preserves schemaOperations without changing the Person Schema authority shape', async () => {
    const schemaOperation =
        createSchemaOperation();
    const workflow =
        createSocialMemoryWorkflow({
            getSettings: () => ({
                translationEnabled:
                    true,
            }),
            translateOpeningValues:
                async values =>
                    values.map(
                        value =>
                            `ZH:${value}`,
                    ),
        });
    const localized =
        await workflow
            .localizeMemoryConsolidation({
                reviews: [],
                statements: [],
                relationshipEvidence: [],
                schemaOperations: [
                    schemaOperation,
                ],
            });
    assert.deepEqual(
        localized.schemaOperations,
        [schemaOperation],
    );
});

test('[defect-probing] social resolver returns schemaOperations from the same medium extraction', async () => {
    const schemaOperation =
        createSchemaOperation();
    const result =
        await runSocialDirectorGraph({
            sceneId: 'scene_b',
            clock:
                '1991-09-03 · 17:00',
            turn: 30,
            actorIds: ['hermione'],
            presentActorIds: [
                'hermione',
            ],
            allowedMessageIds: [],
            messageSceneIds: {},
            witnessActorIdsByMessageId:
                {},
            eventKnowledge: [],
            existingGraph:
                normalizeSocialGraph(),
            extraction: {
                reviews: [],
                statements: [],
                relationshipEvidence:
                    [],
                schemaOperations: [
                    schemaOperation,
                ],
            },
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
            normalizeSocialGraph(),
        memoryReviews: [],
        schemaOperations: [
            createSchemaOperation(),
        ],
        acceptedStatementIds: [],
        acceptedEvidenceIds: [],
    };
    const committed =
        applySocialDirectorResult(
            world,
            result,
            [],
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
                [],
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

test('turn boundary IDs include stable epoch and revision provenance', () => {
    const boundary =
        createPendingEventBoundary(
            {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 7,
                clock:
                    '1991-09-03 · 17:00',
                scene: {
                    id: 'scene_b',
                },
            },
            {
                publicEventEn:
                    'The lesson ends.',
            },
            30,
            true,
        );
    assert.equal(
        boundary.boundaryId,
        boundary.id,
    );
    assert.equal(
        boundary.timelineEpoch,
        'epoch_a',
    );
    assert.equal(
        boundary.stateRevision,
        7,
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

test('[defect-probing] scene transition prompt requires an explicit next-scene intent for every active actor', () => {
    const workflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT: '',
            buildActorContinuityCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildMapAuthorityContext:
                () => ({}),
            buildSceneCastRotationPolicy:
                () => ({}),
            formatRetrievedKnowledge:
                () => '',
            getContext:
                () => ({
                    chat: [],
                }),
            projectActorLibraryForContext:
                () => [],
        });
    const prompt =
        workflow
            .createSceneTransitionPrompt(
                {
                    clock:
                        '1991-09-03 · 17:00',
                    scene: {
                        id: 'scene_old',
                    },
                    map: {},
                    actors: [{
                        id: 'hermione',
                        present: true,
                        currentIntentEn:
                            'Finish the old argument.',
                    }],
                    actorLibrary: [{
                        id: 'hermione',
                    }],
                    items: [],
                    clues: [],
                    storyArcs: [],
                },
                'medium',
                '',
                null,
                {
                    changed: false,
                },
                [],
                {
                    chapterMessageLimit:
                        20,
                },
            );
    assert.match(
        prompt[0].content,
        /active actor.*currentIntentEn.*explicit/u,
    );
    assert.match(
        prompt[0].content,
        /"currentIntentEn":/u,
    );
});

test('[defect-probing] scene transition prompt requires active actors to submit or clear currentIntentEn', () => {
    const workflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT: '',
            buildActorContinuityCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildMapAuthorityContext:
                () => ({}),
            buildSceneCastRotationPolicy:
                () => ({}),
            formatRetrievedKnowledge:
                () => '',
            getContext:
                () => ({
                    chat: [],
                }),
            projectActorLibraryForContext:
                () => [],
        });
    const prompt =
        workflow
            .createSceneTransitionPrompt(
                {
                    clock:
                        '1991-09-03 · 17:00',
                    scene: {
                        id: 'scene_old',
                    },
                    map: {},
                    actors: [{
                        id: 'hermione',
                        present: true,
                        currentIntentEn:
                            'Finish the old argument.',
                    }],
                    actorLibrary: [{
                        id: 'hermione',
                    }],
                    items: [],
                    clues: [],
                    storyArcs: [],
                },
                'medium',
                '',
                null,
                {
                    changed: false,
                },
                [],
                {
                    ragLimit: 4,
                },
            );
    assert.match(
        prompt[0].content,
        /"currentIntentEn":/u,
    );
    assert.match(
        prompt[0].content,
        /explicitly (?:submit|clear).*currentIntentEn/iu,
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
                    recent: [],
                    everyday: [{
                        id: 'memory_scene_close',
                        summaryEn:
                        'Hermione remembers the old discussion ending.',
                        updatedTurn: 30,
                    }],
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
        authorQuillEn:
            'This chapter closes with sufficient paperwork, several determined glances, and one heroic refusal to leave a sentence unfinished. The editorial desk notes that everyone survived the conversation, which is already above average for a school evening. Hermione wins the Orderly Exit award; the furniture receives honourable mention for staying neutral throughout.',
        unresolvedThreadsEn: [],
        worldChanges: {
            prophetBriefs: [],
            gossipUpdates: [],
        },
        relationshipUpdates: [],
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

test('medium Scene retrieval excludes locked records while high transition may request them', () => {
    assert.deepEqual(
        getSceneTransitionRetrievalOptions(
            'medium',
            6,
        ),
        {
            includeLockedClues:
                false,
            limit: 6,
        },
    );
    assert.deepEqual(
        getSceneTransitionRetrievalOptions(
            'high',
            6,
        ),
        {
            includeLockedClues:
                true,
            limit: 6,
        },
    );
});
