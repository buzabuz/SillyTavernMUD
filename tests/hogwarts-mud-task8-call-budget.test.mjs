/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createKnowledgeRecordV2,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    migrateActorContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    createModelAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import {
    attachTurnDiagnostics,
    createTurnDiagnosticsRecorder,
} from '../public/scripts/extensions/hogwarts-mud/runtime/turn-diagnostics.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createSocialMemoryWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';
import {
    createTurnPerformanceWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    createTurnWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';
import {
    FakeVectorBackend,
} from '../src/hogwarts-mud/knowledge-vector-backend.js';
import {
    createKnowledgeVectorService,
} from '../src/hogwarts-mud/knowledge-vector-service.js';

function createRecorder() {
    let now =
        Date.parse(
            '1991-09-04T09:30:00.000Z',
        );
    return createTurnDiagnosticsRecorder({
        createId:
            () => 'task8-budget',
        now: () => now++,
    });
}

function createModelHarness(
    recorder,
    responses,
) {
    const profiles = [{
        id: 'base',
        preset: 'base-preset',
    }];
    const requests = [];
    const adapter =
        createModelAdapter({
            ConnectionManagerRequestService: {
                sendRequest:
                    async (
                        _profileId,
                        _prompt,
                        _maxTokens,
                        options,
                    ) => {
                        requests.push({
                            stream:
                                options.stream,
                        });
                        return {
                            content:
                                responses.shift(),
                        };
                    },
            },
            applyRegexPresetById:
                async () => {},
            getConnectionProfiles:
                () => profiles,
            limitMessagesToContext:
                prompt => prompt,
            parseCompleteJsonObject:
                value => value,
            recordTurnDiagnostic:
                recorder
                    .recordTurnDiagnostic,
            uuidv4:
                () =>
                    `task8-${requests.length}`,
        });
    return {
        ...adapter,
        profiles,
        requests,
    };
}

function knowledgeRecord(
    recordId,
    {
        visibility = {
            scope: 'public',
            actorIds: [],
        },
    } = {},
) {
    return createKnowledgeRecordV2({
        category: 'events',
        recordId,
        nodeType: 'fact',
        title: recordId,
        text:
            `${recordId} remembers the quill.`,
        entityIds: ['quill'],
        tags: ['current'],
        timelineEpoch:
            'task8_epoch',
        stateRevision: 8,
        sourceRefs: [{
            type: 'event',
            id: recordId,
        }],
        visibility,
        effectiveClock:
            '1991-09-04 · 09:00',
        sceneId: 'scene_task8',
    });
}

function createNarrativeState() {
    return migrateActorContextV1({
        timelineEpoch:
            'task8_epoch',
        stateRevision: 8,
        clock: '1991-09-04 · 09:30',
        location: 'Charms Classroom',
        character: {
            confirmed: true,
        },
        scene: {
            id: 'scene_task8',
            nameEn:
                'Charms Classroom',
            summaryEn:
                'The class waits.',
            mapId: 'castle',
            roomId: 'charms',
            timelineEntries: [],
        },
        map: {
            activeMapId: 'castle',
            currentLocalNodeId:
                'charms',
            roomStates: {},
        },
        actors: [{
            id: 'hermione',
            nameEn:
                'Hermione Granger',
            present: true,
            mapId: 'castle',
            roomId: 'charms',
            lifeStatus: 'alive',
            currentActivityEn:
                'Watching the desk.',
        }],
        actorLibrary: [{
            id: 'hermione',
            nameEn:
                'Hermione Granger',
            roleEn: 'Student',
        }],
        actorPresentations: {},
        items: [],
        clues: [],
        storyArcs: [],
    }).state;
}

function createContextPlan() {
    return {
        mode: 'rich',
        label: 'rich',
        inputBudget: 108_000,
        ragLimit: 8,
        memoryLimits: {},
    };
}

test('Fake Qdrant hybrid and audience filtering make zero paid calls', async () => {
    const exact =
        new FakeVectorBackend({
            name: 'json-fake',
        });
    const preferred =
        new FakeVectorBackend({
            name: 'qdrant-fake',
        });
    await exact.upsert({
        timelineId: 'task8',
        timelineEpoch:
            'task8_epoch',
        stateRevision: 8,
        records: [
            knowledgeRecord(
                'exact_public',
            ),
        ],
    });
    await preferred.upsert({
        timelineId: 'task8',
        timelineEpoch:
            'task8_epoch',
        stateRevision: 8,
        records: [
            knowledgeRecord(
                'semantic_public',
            ),
            knowledgeRecord(
                'semantic_private',
                {
                    visibility: {
                        scope: 'actor',
                        actorIds: [
                            'hermione',
                        ],
                    },
                },
            ),
        ],
    });
    const recorder =
        createRecorder();
    recorder.beginTurnDiagnostics();
    const service =
        createKnowledgeVectorService({
            exactBackend: exact,
            preferredBackend:
                preferred,
        });
    const result =
        await service.query({
            timelineId: 'task8',
            query: 'quill',
            entityIds: ['quill'],
            limit: 8,
            filters: {
                timelineEpoch:
                    'task8_epoch',
                stateRevision: 8,
                audience: {
                    actorIds: [
                        'player',
                    ],
                },
                clock:
                    '1991-09-04 · 09:30',
            },
        });
    const trace =
        recorder
            .finalizeTurnDiagnostics(
                'committed',
            );

    assert.deepEqual(
        result.records.map(record =>
            record.recordId),
        [
            'exact_public',
            'semantic_public',
        ],
    );
    assert.equal(
        result.diagnostics
            .backend,
        'qdrant-fake',
    );
    assert.equal(
        result.diagnostics
            .degraded,
        false,
    );
    assert.deepEqual(
        trace.callCounts,
        {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
        },
    );
});

test('ordinary successful Performer keeps the paid budget at one low call', async t => {
    const originalFetch =
        globalThis.fetch;
    globalThis.fetch =
        async (_url, options) => ({
            ok: true,
            async json() {
                return {
                    performance:
                        JSON.parse(
                            options.body,
                        ).payload,
                };
            },
        });
    t.after(() => {
        globalThis.fetch =
            originalFetch;
    });
    const recorder =
        createRecorder();
    const model =
        createModelHarness(
            recorder,
            [
                JSON.stringify({
                    segments: [{
                        type:
                            'narration',
                        textEn:
                            'The classroom settles.',
                    }],
                }),
            ],
        );
    const workflow =
        createTurnPerformanceWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT:
                '',
            CONTEXT_SIZE_PRESETS: {
                rich: 120_000,
            },
            DEFAULT_MODEL_SLOTS: {
                low: {
                    maxResponseLength:
                        12_000,
                },
            },
            beginLiveSceneStream:
                () => {},
            buildActorContinuityCapsules:
                () => [],
            buildActorKnowledgeCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildCurrentMaterialState:
                () => ({}),
            buildSpatialContext:
                () => ({}),
            buildStructuredPlayerTurnSequence:
                () => [],
            buildTemporaryActorPromotionPolicy:
                () => ({}),
            createContextBudgetPlan:
                createContextPlan,
            extractRoleResponseText:
                model
                    .extractRoleResponseText,
            formatRetrievedKnowledge:
                () => '',
            getActiveAddressingState:
                () => ({}),
            getAuthoritativeSceneSpells:
                () => [],
            getRequestHeaders:
                () => ({}),
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            parseItemOperationDirectives:
                () => ({
                    directives: [],
                    errors: [],
                }),
            parseJsonObject:
                model.parseJsonObject,
            recoverScenePerformancePayload:
                () => null,
            removeExplicitAddressDirective:
                value => value,
            resolvePlayerAddressing:
                () => ({
                    valid: true,
                    actorIds: [
                        'hermione',
                    ],
                }),
            resolveTemporaryActorRevealedName:
                actor => actor,
            sendRoleRequest:
                model.sendRoleRequest,
            setLiveSceneStreamPhase:
                () => {},
            settleNarrativeTurnPerformance:
                payload => payload,
            translateOpeningValues:
                async values => values,
            updateLiveSceneStream:
                () => {},
            validateScenePerformance:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    recorder.beginTurnDiagnostics({
        sceneId: 'scene_task8',
    });
    await workflow
        .generateScenePerformance(
            {
                profileId: 'base',
                diagnosticTier:
                    'low',
                contextSize: 120_000,
                maxResponseLength:
                    12_000,
            },
            createNarrativeState(),
            'Wait for class.',
            {
                elapsedMinutes: 15,
                minimumWords: 1,
                maximumWords: 100,
                minimumSegments: 1,
                maximumSegments: 4,
            },
            [],
            null,
            null,
            null,
            {
                valid: true,
                actorIds: [
                    'hermione',
                ],
            },
            [],
            createContextPlan(),
        );
    const trace =
        recorder
            .finalizeTurnDiagnostics(
                'committed',
            );

    assert.equal(
        model.requests.length,
        1,
    );
    assert.deepEqual(
        trace.callCounts,
        {
            high: 0,
            medium: 0,
            low: 1,
            local: 0,
        },
    );
});

test('event-boundary schema consolidation uses one existing medium call', async () => {
    const recorder =
        createRecorder();
    const model =
        createModelHarness(
            recorder,
            [{
                scanComplete: true,
                reviewAfterTurns: 10,
                reviews: [],
                statements: [],
                relationshipEvidence:
                    [],
                schemaOperations: [],
            }],
        );
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
            buildSocialAudienceProjection:
                () => ({
                    relationships: [],
                }),
            createContextBudgetPlan:
                () => ({}),
            extractRoleResponseText:
                model
                    .extractRoleResponseText,
            normalizeActorMemoryProfile:
                actor => ({
                    ...actor,
                    sharedMemories:
                        actor.sharedMemories,
                }),
            normalizeMemoryConsolidationPayload:
                payload => payload,
            normalizeSocialGraph:
                graph => ({
                    statements: [],
                    relationshipEvidence:
                        [],
                    relationships: [],
                    lastProcessedMessageId:
                        -1,
                    ...(graph || {}),
                }),
            selectSharedMemoriesForContext:
                memories => memories,
            sendRoleRequest:
                model.sendRoleRequest,
            validateMemoryConsolidation:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    const state = {
        clock:
            '1991-09-04 · 09:30',
        turn: {
            count: 8,
        },
        actorLibrary: [],
        socialGraph: {},
        memorySynapse: {
            appraisals: [],
            personSchemas: [],
        },
    };
    recorder.beginTurnDiagnostics({
        sceneId: 'scene_task8',
    });
    await workflow
        .generateMemoryConsolidation(
            {
                profileId: 'base',
                diagnosticTier:
                    'medium',
                contextSize: 64_000,
                maxResponseLength:
                    8_000,
            },
            state,
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
    const trace =
        recorder
            .finalizeTurnDiagnostics(
                'committed',
            );

    assert.equal(
        model.requests.length,
        1,
    );
    assert.deepEqual(
        trace.callCounts,
        {
            high: 0,
            medium: 1,
            low: 0,
            local: 0,
        },
    );
});

function createBoundaryTurnHarness({
    eventBoundary = true,
    appraisalFailure = false,
    staleAppraisal = false,
    activationSchemaIds = [],
} = {}) {
    const recorder =
        createRecorder();
    const modelCalls = {
        high: 0,
        medium: 0,
        low: 0,
    };
    let localCalls = 0;
    const appraisalRequests = [];
    const retrievalCalls = [];
    const playerAction =
        'Wait by the door.';
    const playerMessage = {
        is_user: true,
        mes: playerAction,
        extra: {
            hogwartsMud: {},
        },
    };
    const state = {
        timelineEpoch:
            'task8_appraisal_epoch',
        stateRevision: 7,
        phase: 'playing',
        clock:
            '1991-09-04 · 09:30',
        turn: {
            count: 7,
            status: 'idle',
            error: '',
        },
        scene: {
            id: 'scene_task8',
            startedMessageId: 0,
        },
        sceneTransition: {
            status: 'idle',
        },
        map: {
            activeMapId: 'castle',
            currentLocalNodeId:
                'charms',
        },
        actors: [
            {
                id: 'hermione',
                present: true,
            },
            {
                id: 'draco',
                present: true,
            },
            {
                id: 'luna',
                present: false,
            },
        ],
        actorLibrary: [
            {
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
            },
            {
                id: 'draco',
                nameEn:
                    'Draco Malfoy',
            },
        ],
        eventKnowledge: [],
        memorySynapse: {
            version: 1,
            maxActiveSchemasPerPair: 3,
            appraisals: [],
            personSchemas: [],
        },
        items: [],
        modelSlots: {},
        dailyDirector: {
            date: '1991-09-04',
            plan: {
                timePolicy: {},
            },
        },
        pacingDirector: {
            pendingBeat: null,
        },
    };
    const context = {
        chat: [playerMessage],
        chatMetadata: {
            hogwartsMud: state,
        },
        saveChat:
            async () => {},
        saveMetadata:
            async () => {},
    };
    const workflow =
        createTurnWorkflow({
            TRANSLATION_FORMAT_VERSION:
                12,
            admitMentionedKnownActors:
                current => ({
                    state: current,
                    admittedActors: [],
                }),
            applyObservedActorUpdates:
                () => {},
            applyPlayerMovement:
                current => ({
                    state: current,
                    movement: null,
                }),
            applyPresenceWitnessTransaction:
                current => current,
            applySystemPrompt:
                () => {},
            applyTurnTransaction:
                (current, transaction) => {
                    const next = {
                        ...current,
                        clock:
                            '1991-09-04 · 09:45',
                        turn: {
                            count: 8,
                            status: 'idle',
                            error: '',
                        },
                        lastTransaction:
                            transaction,
                    };
                    if (transaction.eventKnowledge) {
                        next.eventKnowledge = [
                            ...(current
                                .eventKnowledge ||
                            []),
                            transaction
                                .eventKnowledge,
                        ];
                    }
                    return next;
                },
            attachTurnDiagnostics,
            ...recorder,
            buildLocalSemanticRoomContext:
                () => ({
                    rooms: [],
                }),
            buildSceneTransaction:
                () => ({
                    protocolVersion: 2,
                    publicEventEn:
                        'Tina waits by the door.',
                    segments: [{
                        type:
                            'narration',
                        textEn:
                            'Tina waits by the door.',
                    }],
                    actorPresence: {
                        presentActorIdsAfterTurn:
                            [],
                    },
                    actorUpdates: [],
                    itemUpdates: [],
                    settlementWarnings: [],
                }),
            clearLiveSceneStream:
                () => {},
            composeSceneSegments:
                segments =>
                    segments
                        .map(segment =>
                            segment.textEn)
                        .join('\n'),
            consumePacingBeat:
                current => current,
            createContextBudgetPlan:
                () => ({
                    ragLimit: 1,
                }),
            createSceneMomentumDirective:
                () => ({
                    required: true,
                }),
            createTurnPerformanceBudget:
                () => ({
                    elapsedMinutes: 15,
                }),
            createTurnRetryCheckpoint:
                (
                    current,
                    checkpoint,
                ) => ({
                    baseState:
                        structuredClone(
                            current,
                        ),
                    ...checkpoint,
                }),
            ensureDailyDirectorPlan:
                async () => {},
            ensureDirectorFoundation:
                async () => {},
            ensureMemoryConsolidation:
                async () => {
                    if (!eventBoundary) {
                        return null;
                    }
                    modelCalls.medium++;
                    recorder
                        .recordTurnDiagnostic(
                            'model_call',
                            {
                                tier:
                                    'medium',
                            },
                        );
                },
            ensurePacingDirectorAssessment:
                async () => {},
            ensureSocialDirectorCatchup:
                async () => {},
            filterKnowledgeForAudience:
                values => values,
            generateScenePerformance:
                async () => {
                    modelCalls.low++;
                    recorder
                        .recordTurnDiagnostic(
                            'model_call',
                            {
                                tier:
                                    'low',
                            },
                        );
                    return {
                        segments: [],
                    };
                },
            getActiveAddressingState:
                () => ({}),
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            getWorldDate:
                () => '1991-09-04',
            isObservedEventBoundary:
                () => eventBoundary,
            jobRegistry: {
                sceneTransitionActive:
                    false,
                turnActive: false,
                turnSettlement:
                    new Map(),
            },
            localizeTurnTransaction:
                async transaction =>
                    transaction,
            normalizeEventKnowledge:
                event => ({
                    eventId:
                        'event_task8_appraisal',
                    ...event,
                }),
            parseSpellCastDirectives:
                () => [],
            parseItemOperationDirectives:
                () => ({
                    directives: [],
                    errors: [],
                }),
            partitionItemProposals:
                () => ({
                    operations: [],
                    candidates: [],
                }),
            reconcileTurnActorPresenceWithSpatialState:
                transaction =>
                    transaction,
            reduceLocalPresence:
                () => ({
                    occupantActorIds: [],
                    cohortIds: [],
                }),
            removeExplicitAddressDirective:
                value => value,
            removeSpellCastDirectives:
                value => value,
            renderAll:
                () => {},
            requestLocalTurnAdjudication:
                async () => ({
                    result: {
                        temporal: {
                            elapsedMinutes: 15,
                        },
                        check: {
                            required: false,
                        },
                    },
                    diagnostics: {},
                }),
            requestLocalTurnObservation:
                async () => ({
                    observation: {
                        diagnostics: {},
                    },
                    narrativeText:
                        'Tina waits by the door.',
                    materialEvents: [],
                    itemUpdates: [],
                    perception: {
                        source:
                            'deterministic_test',
                    },
                    targetActorIds: [],
                }),
            requestLocalTurnAppraisals:
                async (
                    current,
                    event,
                ) => {
                    localCalls++;
                    appraisalRequests.push({
                        current,
                        event,
                    });
                    if (staleAppraisal) {
                        context.chatMetadata
                            .hogwartsMud = {
                                ...context
                                    .chatMetadata
                                    .hogwartsMud,
                                stateRevision: 8,
                            };
                    }
                    if (appraisalFailure) {
                        throw new Error(
                            'local appraisal unavailable',
                        );
                    }
                    return {
                        appraisalProposals: [
                            {
                                observerId:
                                    'hermione',
                                targetId:
                                    'player',
                                summaryEn:
                                    'Hermione interprets the waiting as deliberate patience rather than hesitation.',
                                sourceEventIds: [
                                    event.eventId,
                                ],
                                sourceMessageIds:
                                    event
                                        .sourceMessageIds,
                                sceneId:
                                    event.sceneId,
                                contextTags: [
                                    'patience',
                                ],
                                confidence: 0.8,
                            },
                            {
                                observerId:
                                    'draco',
                                targetId:
                                    'player',
                                summaryEn:
                                    'Draco assumes the pause is an attempt to attract attention.',
                                sourceEventIds: [
                                    event.eventId,
                                ],
                                sourceMessageIds:
                                    event
                                        .sourceMessageIds,
                                sceneId:
                                    event.sceneId,
                                contextTags: [
                                    'attention',
                                ],
                                confidence: 0.7,
                            },
                        ],
                        diagnostics: {
                            called: true,
                            fallback: false,
                        },
                    };
                },
            resolveActionCheck:
                () => null,
            resolveEventWitnesses:
                () => ({
                    participantActorIds: [
                        'hermione',
                    ],
                    witnessActorIds: [
                        'hermione',
                    ],
                    witnessCohortIds: [],
                    witnessBasis: {
                        hermione:
                            'direct_participant',
                    },
                }),
            resolvePlayerAddressing:
                () => ({
                    valid: true,
                    attempted: true,
                    actorIds: [
                        'luna',
                    ],
                }),
            resolveRoleSlots:
                () => ({
                    low: {
                        profileId:
                            'offline-test',
                        contextSize: 4_096,
                        maxResponseLength:
                            512,
                    },
                }),
            retrieveLocalKnowledge:
                async (...args) => {
                    retrievalCalls.push(
                        args,
                    );
                    const records = [];
                    records.activationCapsules = {
                        version: 1,
                        common: {
                            sealed: true,
                            scope: 'common',
                            observerId: '',
                            facts: [],
                        },
                        byActorId: {
                            hermione: {
                                sealed: true,
                                scope: 'observer',
                                observerId:
                                    'hermione',
                                expectations:
                                    activationSchemaIds
                                        .map(schemaId => ({
                                            schemaId,
                                        })),
                            },
                        },
                    };
                    return records;
                },
            runMediumCalendarDirectorSafely:
                async () => null,
            setLiveSceneStreamPhase:
                () => {},
            syncLocalKnowledge:
                async () => {},
            updateNativeMessageBlock:
                () => {},
            validateTurnTransaction:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    return {
        context,
        appraisalRequests,
        get localCalls() {
            return localCalls;
        },
        modelCalls,
        playerAction,
        retrievalCalls,
        workflow,
    };
}

test('ordinary successful turn keeps high and medium at zero while preserving one low call', async () => {
    const harness =
        createBoundaryTurnHarness({
            eventBoundary: false,
        });
    await harness.workflow
        .runStructuredTurn(
            harness.playerAction,
        );

    assert.deepEqual(
        harness.modelCalls,
        {
            high: 0,
            medium: 0,
            low: 1,
        },
    );
    assert.deepEqual(
        harness.context.chat[1]
            .extra.hogwartsMud
            .turnDiagnostics
            .callCounts,
        {
            high: 0,
            medium: 0,
            low: 1,
            local: 1,
        },
    );
    assert.equal(
        harness.localCalls,
        1,
    );
    assert.equal(
        harness.appraisalRequests.length,
        1,
    );
    assert.deepEqual(
        harness.retrievalCalls[0][2]
            .audienceActorIds,
        [
            'hermione',
            'draco',
            'luna',
        ],
    );
    assert.deepEqual(
        harness.context.chatMetadata
            .hogwartsMud
            .memorySynapse
            .appraisals
            .map(appraisal =>
                appraisal.observerId),
        ['hermione'],
    );
    const appraisalValidation =
        harness.context.chat[1]
            .extra.hogwartsMud
            .turnDiagnostics.events
            .find(event =>
                event.stage ===
                    'appraisal_proposal_validation');
    assert.equal(
        appraisalValidation
            .data.accepted,
        1,
    );
    assert.equal(
        appraisalValidation
            .data.rejected,
        1,
    );
    assert.deepEqual(
        appraisalValidation
            .data.reasons,
        [{
            code:
                'observer_not_authorized',
            count: 1,
        }],
    );
});

test('[defect-probing] production turn commits activation Schema provenance into Event and accepted Appraisal sources', async () => {
    const schemaId =
        'schema_hermione_player_patience';
    const harness =
        createBoundaryTurnHarness({
            eventBoundary: false,
            activationSchemaIds: [
                schemaId,
            ],
        });
    await harness.workflow
        .runStructuredTurn(
            harness.playerAction,
        );

    assert.deepEqual(
        harness.context.chatMetadata
            .hogwartsMud
            .eventKnowledge[0]
            .activationSchemaIds,
        [schemaId],
    );
    assert.deepEqual(
        harness.context.chatMetadata
            .hogwartsMud
            .memorySynapse
            .appraisals[0]
            .activationSchemaIds,
        [schemaId],
    );
});

test('[defect-probing] event-boundary medium call remains in the committed turn diagnostics', async () => {
    const harness =
        createBoundaryTurnHarness();
    await harness.workflow
        .runStructuredTurn(
            harness.playerAction,
        );

    assert.deepEqual(
        harness.modelCalls,
        {
            high: 0,
            medium: 1,
            low: 1,
        },
    );
    assert.deepEqual(
        harness.context.chat[1]
            .extra.hogwartsMud
            .turnDiagnostics
            .callCounts,
        {
            high: 0,
            medium: 1,
            low: 1,
            local: 1,
        },
    );
});

test('[defect-probing] local Appraisal failure falls back without blocking the committed turn', async () => {
    const harness =
        createBoundaryTurnHarness({
            eventBoundary: false,
            appraisalFailure: true,
        });
    await harness.workflow
        .runStructuredTurn(
            harness.playerAction,
        );

    assert.equal(
        harness.localCalls,
        1,
    );
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud.turn.count,
        8,
    );
    assert.deepEqual(
        harness.context.chatMetadata
            .hogwartsMud
            .memorySynapse
            .appraisals,
        [],
    );
    const diagnostics =
        harness.context.chat[1]
            .extra.hogwartsMud
            .turnDiagnostics;
    assert.equal(
        diagnostics.callCounts.local,
        1,
    );
    assert.equal(
        diagnostics.events
            .find(event =>
                event.stage ===
                    'appraisal_proposal_validation')
            .data.fallback,
        true,
    );
});

test('[defect-probing] stale post-turn Appraisal work cannot overwrite a newer revision', async () => {
    const harness =
        createBoundaryTurnHarness({
            eventBoundary: false,
            staleAppraisal: true,
        });
    await assert.rejects(
        harness.workflow
            .runStructuredTurn(
                harness.playerAction,
            ),
        /stale post-turn Appraisal/iu,
    );

    assert.equal(
        harness.localCalls,
        1,
    );
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud
            .stateRevision,
        8,
    );
    assert.deepEqual(
        harness.context.chatMetadata
            .hogwartsMud
            .memorySynapse
            .appraisals,
        [],
    );
});

function createTransitionHarness() {
    const paidCalls = {
        high: 0,
        medium: 0,
        low: 0,
    };
    const state =
        migrateActorContextV1({
            phase: 'playing',
            timelineEpoch:
            'task8_epoch',
            stateRevision: 8,
            clock:
            '1991-09-04 · 09:30',
            location:
            'Charms Classroom',
            turn: {
                count: 8,
            },
            scene: {
                id: 'scene_task8',
                nameEn:
                'Charms Classroom',
                summaryEn:
                'The old scene.',
                startedClock:
                '1991-09-04 · 09:00',
                startedMessageId: 0,
                mapId: 'castle',
                roomId: 'charms',
                timelineEntries: [],
                nextSceneIntent: {
                    mapId: 'castle',
                    roomId: 'library',
                    tier: 'medium',
                },
            },
            sceneArchive: [],
            sceneTransition: {
                status: 'idle',
            },
            map: {
                activeMapId: 'castle',
                currentLocalNodeId:
                'charms',
            },
            actors: [{
                id: 'hermione',
                present: true,
                mapId: 'castle',
                roomId: 'charms',
                lifeStatus: 'alive',
            }],
            actorLibrary: [{
                id: 'hermione',
                nameEn:
                'Hermione Granger',
                roleEn: 'Student',
            }],
            activeInteractionActorIds: [
                'hermione',
            ],
            localPresence: {
                mapId: 'castle',
                roomId: 'charms',
                occupantActorIds: [
                    'hermione',
                ],
                cohortIds: [],
            },
            items: [],
            clues: [],
            storyArcs: [],
            modelSlots: {},
        }).state;
    const context = {
        chat: [],
        chatMetadata: {
            hogwartsMud: state,
        },
        saveChat:
            async () => {},
        saveMetadata:
            async () => {},
    };
    const transitionPayload = {
        closureSummaryEn:
            'The lesson ends.',
        authorQuillEn:
            'The quill awards punctuality.',
        unresolvedThreadsEn: [],
        transitionMinutes: 15,
        nextClock:
            '1991-09-04 · 09:45',
        nextScene: {
            id: 'scene_library',
            nameEn: 'Library',
            summaryEn:
                'The Library waits.',
            chapterEn:
                'Library Morning',
            explorationHookEn: '',
            crowdDirectionEn: '',
            mapId: 'castle',
            roomId: 'library',
            actorStates: [{
                id: 'hermione',
                present: true,
                mapId: 'castle',
                roomId: 'library',
                lifeStatus: 'alive',
                lifeStatusPermanent:
                    false,
                lifeStatusDetailEn:
                    'Alive.',
                lifeStatusSinceClock: '',
                currentActivityEn:
                    'Sorting notes.',
                currentIntentEn:
                    'Finish the index.',
                currentGoalEn: '',
                temporary: false,
            }],
            followingSceneIntent: {
                titleEn: 'Continue',
                summaryEn:
                    'Continue studying.',
                triggerEn:
                    'When ready.',
                mapId: 'castle',
                roomId: 'library',
                tier: 'medium',
            },
        },
    };
    const workflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT:
                '',
            CONTEXT_SIZE_PRESETS: {
                rich: 120_000,
            },
            DEFAULT_MODEL_SLOTS: {
                medium: {
                    maxResponseLength:
                        12_000,
                },
            },
            TRANSLATION_FORMAT_VERSION:
                12,
            admitCurrentLocationResidents:
                current => ({
                    state: current,
                }),
            applySceneTransition:
                (
                    current,
                    payload,
                    archiveEntry,
                ) => ({
                    ...current,
                    clock:
                        payload.nextClock,
                    location: 'Library',
                    sceneArchive: [
                        archiveEntry,
                    ],
                    scene: {
                        ...payload
                            .nextScene,
                        startedMessageId:
                            0,
                    },
                    actors:
                        payload
                            .nextScene
                            .actorStates,
                    sceneTransition: {
                        status: 'idle',
                    },
                }),
            applySystemPrompt:
                () => {},
            buildActorContinuityCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildCurrentMaterialState:
                () => ({}),
            buildMapAuthorityContext:
                () => ({}),
            buildSceneCastRotationPolicy:
                () => ({}),
            composeSceneSegments:
                segments =>
                    segments
                        .map(segment =>
                            segment.textEn)
                        .join('\n'),
            createContextBudgetPlan:
                createContextPlan,
            ensureCurrentInteriorMap:
                async () => null,
            ensureSceneLifecycleState:
                () => false,
            ensureSocialDirectorCatchup:
                async ({ force }) => {
                    assert.equal(
                        force,
                        true,
                    );
                    paidCalls.medium++;
                },
            extractRoleResponseText:
                response =>
                    response.content,
            findSceneDestination:
                () => null,
            formatNextSceneIntent:
                () => '',
            formatRetrievedKnowledge:
                () => '',
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            getSceneDestinationAuthority:
                (_current, destination) => ({
                    ...destination,
                    roomNameEn:
                        'Library',
                }),
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            jobRegistry: {
                calendarMoment: null,
                sceneTransition: null,
                sceneTransitionActive:
                    false,
            },
            normalizeSceneTransitionPackage:
                payload => payload,
            parseJsonObject:
                value =>
                    JSON.parse(value),
            projectActorLibraryForContext:
                actors => actors,
            projectSceneArchivePresence:
                () => ({
                    activeInteractionActorIds:
                        ['hermione'],
                    localOccupantActorIds:
                        ['hermione'],
                    localCohortIds: [],
                    events: [],
                    actorIds: [
                        'hermione',
                    ],
                }),
            renderAll:
                () => {},
            resolveRoleSlots:
                () => ({
                    high: {
                        profileId: 'high',
                        diagnosticTier:
                            'high',
                        ...createContextPlan(),
                        contextSize:
                            120_000,
                        maxResponseLength:
                            12_000,
                    },
                    medium: {
                        profileId:
                            'medium',
                        diagnosticTier:
                            'medium',
                        contextSize:
                            120_000,
                        maxResponseLength:
                            12_000,
                    },
                    low: {
                        profileId: 'low',
                        diagnosticTier:
                            'low',
                        contextSize:
                            120_000,
                        maxResponseLength:
                            12_000,
                    },
                }),
            retrieveLocalKnowledge:
                async () => [],
            sendRoleRequest:
                async slot => {
                    paidCalls[
                        slot
                            .diagnosticTier
                    ]++;
                    return {
                        content:
                            slot
                                .diagnosticTier ===
                                'low'
                                ? JSON.stringify({
                                    segments: [{
                                        type:
                                            'narration',
                                        textEn:
                                            'The Library settles into view.',
                                    }],
                                })
                                : JSON.stringify(
                                    transitionPayload,
                                ),
                    };
                },
            stripSyntheticSceneOpeningActorSegments:
                segments => segments,
            synchronizeHeldItemLocations:
                items => items,
            syncLocalKnowledge:
                async () => {},
            translateOpeningValues:
                async values => values,
            validateSceneTransitionPackage:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    return {
        context,
        paidCalls,
        workflow,
    };
}

test('[defect-probing] Scene Transition adds no memory-only paid call', async t => {
    const originalSetTimeout =
        globalThis.setTimeout;
    const originalToastr =
        globalThis.toastr;
    const scheduled = [];
    globalThis.setTimeout =
        callback => {
            scheduled.push(callback);
            return 1;
        };
    globalThis.toastr = {
        success:
            () => {},
    };
    t.after(() => {
        globalThis.setTimeout =
            originalSetTimeout;
        if (
            originalToastr ===
            undefined
        ) {
            delete globalThis.toastr;
        } else {
            globalThis.toastr =
                originalToastr;
        }
    });
    const harness =
        createTransitionHarness();
    await harness.workflow
        .runSceneTransition();
    for (const callback of scheduled) {
        await callback();
    }

    assert.equal(
        scheduled.length,
        0,
    );
    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .eventKnowledge[0]
            .sourceMessageIds,
        [0],
    );
    assert.deepEqual(
        harness.paidCalls,
        {
            high: 0,
            medium: 1,
            low: 1,
        },
    );
});
