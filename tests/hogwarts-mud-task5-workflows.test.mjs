/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    settlePostTurnModelResult,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import { createModelAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import { createAutomaticWorkGate } from '../public/scripts/extensions/hogwarts-mud/runtime/automatic-work.js';
import { createJobRegistry } from '../public/scripts/extensions/hogwarts-mud/runtime/job-registry.js';
import { createLifecycleRuntime } from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';
import {
    TURN_DIAGNOSTIC_EVENT_LIMIT,
    TURN_DIAGNOSTIC_HISTORY_LIMIT,
    TURN_DIAGNOSTIC_STRING_LIMIT,
    attachTurnDiagnostics,
    createTurnDiagnosticsRecorder,
} from '../public/scripts/extensions/hogwarts-mud/runtime/turn-diagnostics.js';
import {
    reduceLocalPresence,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    projectSceneTransitionPresence,
} from '../public/scripts/extensions/hogwarts-mud/domain/transition-presence.js';
import {
    normalizeItemProposal,
    resolveItemCandidate,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-reducer.js';
import {
    synchronizeHeldItemLocations,
} from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    normalizeSpellProposal,
    resolveSpellCandidate,
} from '../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import {
    createWorkflowApplication,
} from '../public/scripts/extensions/hogwarts-mud/workflows/application.js';
import { createOpeningWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import {
    createSceneTransitionWorkflow,
    projectAuthoritativeSceneItems,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import { createTurnPerformanceWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import { createTurnWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { createGuardedSavePorts } from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import { createSaveRevisionGuard } from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';

function createOpeningHarness(responses) {
    const calls = [];
    const workflow = createOpeningWorkflow({
        PRESET_WORLD_MAP: {
            nodes: [],
        },
        extractRoleResponseText: response =>
            response.content,
        parseJsonObject: value =>
            JSON.parse(value),
        sendOpeningWorldRequest: async (...args) => {
            calls.push(args);
            return {
                content: responses.shift(),
            };
        },
        validateOpeningWorldPackage: value => ({
            valid: value.valid === true,
            errors: value.valid === true
                ? []
                : ['invalid opening'],
        }),
    });
    return {
        calls,
        state: {
            campaign: {
                grade: 1,
            },
            character: {
                identity: {
                    name: 'Tina',
                },
            },
        },
        workflow,
    };
}

test('[defect-probing] local semantic adapter submits one Appraisal batch for every legal observer and falls back locally', async () => {
    const originalFetch =
        globalThis.fetch;
    const requests = [];
    const adapter =
        createLocalSemanticAdapter({
            getRequestHeaders:
                () => ({
                    'Content-Type':
                        'application/json',
                }),
        });
    const event = {
        eventId:
            'event_appraisal_batch',
        sceneId:
            'scene_appraisal_batch',
        sourceMessageIds: [10, 11],
        summaryEn:
            'The player waits while Hermione asks a direct question.',
        participantActorIds: [
            'hermione',
        ],
        witnessActorIds: [
            'ron',
        ],
    };
    const state = {
        clock:
            '1991-09-04 · 09:45',
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
            {
                id: 'luna',
                nameEn:
                    'Luna Lovegood',
            },
            {
                id: 'draco',
                nameEn:
                    'Draco Malfoy',
            },
        ],
        actors: [],
        eventKnowledge: [
            event,
        ],
    };

    try {
        assert.equal(
            typeof adapter
                .requestLocalTurnAppraisals,
            'function',
        );
        globalThis.fetch =
            async (
                url,
                options,
            ) => {
                requests.push({
                    url,
                    body:
                        JSON.parse(
                            options.body,
                        ),
                });
                return {
                    ok: true,
                    json:
                        async () => ({
                            result: {
                                appraisalProposals:
                                    [],
                            },
                            diagnostics: {
                                model:
                                    'local-test',
                            },
                        }),
                };
            };
        const result =
            await adapter
                .requestLocalTurnAppraisals(
                    state,
                    event,
                );
        assert.equal(
            requests.length,
            1,
        );
        assert.equal(
            requests[0].url,
            '/api/hogwarts-mud/local/appraise',
        );
        assert.deepEqual(
            requests[0].body.input
                .observers
                .map(observer =>
                    observer.id),
            [
                'hermione',
                'ron',
            ],
        );
        assert.equal(
            result.diagnostics.called,
            true,
        );

        globalThis.fetch =
            async () => {
                throw new Error(
                    'Ollama offline',
                );
            };
        const fallback =
            await adapter
                .requestLocalTurnAppraisals(
                    state,
                    event,
                );
        assert.deepEqual(
            fallback
                .appraisalProposals,
            [],
        );
        assert.equal(
            fallback
                .diagnostics.fallback,
            true,
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});

function createTurnPerformancePromptHarness() {
    return createTurnPerformanceWorkflow({
        CANON_CAST_IDENTITY_CONTRACT: '',
        CANON_WIT_TONE_CONTRACT: '',
        CONTEXT_SIZE_PRESETS: {
            rich: 120000,
        },
        DEFAULT_MODEL_SLOTS: {
            low: {
                maxResponseLength: 12000,
            },
        },
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
            () => [{
                type: 'direct_speech',
                lineIndex: 0,
                speechOrder: 0,
                targetActorId: 'hermione',
                speechText:
                    'Please teach me.',
            }],
        buildTemporaryActorPromotionPolicy:
            () => ({}),
        createContextBudgetPlan:
            () => ({
                mode: 'rich',
                label: 'rich',
                inputBudget: 108000,
                ragLimit: 10,
                memoryLimits: {},
            }),
        formatRetrievedKnowledge:
            () => '',
        getActiveAddressingState:
            () => ({}),
        getAuthoritativeSceneSpells:
            () => [{
                spellId:
                    'match_to_needle_transfiguration',
                incantation:
                    'Acufors',
                name:
                    '火柴变针',
                nameEn:
                    'Match-to-Needle Transfiguration',
            }],
        parseItemOperationDirectives:
            () => ({
                directives: [],
                errors: [],
            }),
        removeExplicitAddressDirective:
            value => value,
        resolvePlayerAddressing:
            () => ({
                valid: true,
                actorIds: ['hermione'],
            }),
    });
}

function deferred() {
    let resolve;
    const promise =
        new Promise(resolvePromise => {
            resolve =
                resolvePromise;
        });
    return {
        promise,
        resolve,
    };
}

function createTurnHarness({
    existingAssistant = false,
    invalidAddressing = false,
    legacyDiagnostics = null,
    postGate = null,
    postObservation = null,
    postTemporalDiagnostics = null,
    translationGate = null,
    failInitialPreservation = false,
} = {}) {
    const playerAction = 'Wait by the door.';
    const playerMessage = {
        is_user: true,
        mes: playerAction,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                ...(legacyDiagnostics
                    ? {
                        turnDiagnostics:
                            structuredClone(
                                legacyDiagnostics,
                            ),
                    }
                    : {}),
            },
        },
    };
    const assistantMessage = {
        is_user: false,
        mes: 'Interrupted response',
        extra: {},
    };
    const state = {
        phase: 'playing',
        clock: '1991-09-01 · 08:00',
        turn: {
            count: 0,
            status: 'failed',
            error: 'interrupted',
        },
        scene: {
            id: 'test_scene',
            startedMessageId: 0,
        },
        sceneTransition: {
            status: 'idle',
        },
        map: {
            activeMapId: 'test_map',
            currentLocalNodeId: 'test_room',
        },
        actors: [],
        actorLibrary: [],
        modelSlots: {},
        dailyDirector: {
            date: '1991-09-01',
            plan: {
                timePolicy: {},
            },
        },
        pacingDirector: {
            pendingBeat: null,
        },
    };
    const context = {
        chat: existingAssistant
            ? [playerMessage, assistantMessage]
            : [playerMessage],
        chatMetadata: {
            hogwartsMud: state,
        },
        saveChat: async () => {},
        saveMetadata: async () => {},
    };
    const jobRegistry = createJobRegistry();
    let failPreservation = failInitialPreservation;
    let durable;
    const saveValues = new Map();
    const savePorts = failInitialPreservation ? createGuardedSavePorts({
        getContext: () => context,
        guard: createSaveRevisionGuard({
            lockManager: null,
            storage: {
                get length() { return saveValues.size; },
                key: index => [...saveValues.keys()][index] ?? null,
                getItem: key => saveValues.get(key) ?? null,
                setItem: (key, value) => saveValues.set(key, String(value)),
                removeItem: key => saveValues.delete(key),
            },
        }),
        readPersistedTimeline: async () => [
            { chat_metadata: { hogwartsMud: durable.state } }, ...durable.chat,
        ],
    }) : null;
    if (savePorts) {
        const persist = async () => {
            if (failPreservation && context.chat[1]?.extra?.hogwartsMud?.pendingPostSettlement) {
                throw new Error('initial disk write failed');
            }
            durable = structuredClone({ state: context.chatMetadata.hogwartsMud, chat: context.chat });
            return { durable: true };
        };
        context.saveChat = persist;
        context.saveMetadata = persist;
    }
    let diagnosticId = 0;
    let diagnosticNow =
        Date.parse(
            '1991-09-01T08:00:00.000Z',
        );
    const diagnostics =
        createTurnDiagnosticsRecorder({
            createId: () =>
                `test-${++diagnosticId}`,
            now: () =>
                diagnosticNow++,
        });
    let streamClears = 0;
    let currentTurnLocalizationCalls =
        0;
    let settledLocalizationCalls =
        0;
    let currentTurnCandidates = [];
    let translationCompletion =
        Promise.resolve(true);
    const workflowOrder = [];
    const modelCalls = [];
    const workflow = createTurnWorkflow({
        TRANSLATION_FORMAT_VERSION: 12,
        admitMentionedKnownActors: current => ({
            state: current,
            admittedActors: [],
        }),
        applyObservedActorUpdates: () => {},
        applyPresenceWitnessTransaction: current =>
            current,
        applySystemPrompt: () => {},
        applyTurnTransaction: (current, transaction) => ({
            ...current,
            clock: '1991-09-01 · 08:15',
            turn: {
                count: 1,
                status: 'idle',
                error: '',
            },
            lastTransaction: transaction,
        }),
        attachTurnDiagnostics,
        ...diagnostics,
        buildLocalSemanticRoomContext: () => ({
            rooms: [],
        }),
        buildSceneTransaction: createTurnPerformanceWorkflow({}).buildSceneTransaction,
        clearLiveSceneStream: () => {
            streamClears++;
        },
        composeSceneSegments: segments =>
            segments.map(segment =>
                segment.textEn).join('\n'),
        consumePacingBeat: current =>
            current,
        createContextBudgetPlan: () => ({
            ragLimit: 1,
        }),
        createSceneMomentumDirective: () => ({
            required: true,
        }),
        createTurnPerformanceBudget: () => ({
            elapsedMinutes: 15,
        }),
        createTurnRetryCheckpoint: (
            current,
            checkpoint,
        ) => ({
            baseState: structuredClone(current),
            ...checkpoint,
        }),
        enqueueCurrentTurnLocalizationCandidates:
            async candidates => {
                currentTurnLocalizationCalls++;
                currentTurnCandidates =
                    structuredClone(
                        candidates,
                    );
                workflowOrder.push(
                    'translation_start',
                );
                translationCompletion =
                    translationGate
                        ? translationGate
                            .promise
                            .then(() => {
                                workflowOrder.push(
                                    'translation_end',
                                );
                                return true;
                            })
                        : Promise.resolve(
                            true,
                        );
                return {
                    started: true,
                    completion:
                        translationCompletion,
                };
            },
        enqueueLocalizationCandidates:
            async () => {
                settledLocalizationCalls++;
            },
        assertWorldFoundationReady:
            () => true,
        ensurePacingDirectorAssessment: async () => {},
        ensureSocialDirectorForAction: async () => {},
        ensureSocialDirectorCatchup: async () => {},
        filterKnowledgeForAudience: values =>
            values,
        findUnsettledTurn: () => existingAssistant
            ? {
                playerAction,
                assistantMessageId: 1,
                forceCheck: false,
            }
            : null,
        generateScenePerformance:
            async () => {
                modelCalls.push('scene');
                return preserveSceneNarrative({
                    segments: [{
                        type:
                        'narration',
                        textEn:
                        'Tina waits by the door.',
                    }],
                });
            },
        getActiveAddressingState: () => ({}),
        getContext: () => context,
        getFailedPlayerTurn: () => ({
            playerAction,
            forceCheck: false,
        }),
        getMudState: () =>
            context.chatMetadata.hogwartsMud,
        guardedRewriteTimeline:
            async ({
                currentState,
                nextState,
                nextChat,
                source,
            }) => {
                if (failInitialPreservation && source === 'turn_post_pending') throw new Error('initial disk write failed');
                assert.equal(
                    currentState
                        .stateRevision,
                    context.chatMetadata
                        .hogwartsMud
                        .stateRevision,
                );
                context.chatMetadata
                    .hogwartsMud =
                    nextState;
                context.chat.splice(
                    0,
                    context.chat.length,
                    ...structuredClone(
                        nextChat,
                    ),
                );
                return {
                    ok: true,
                    state: nextState,
                };
            },
        getSettings: () => ({
            translationEnabled: false,
        }),
        getWorldDate: () => '1991-09-01',
        jobRegistry,
        localizeTurnTransaction: async transaction =>
            transaction,
        parseSpellCastDirectives: () => [],
        parseItemOperationDirectives: () => ({
            directives: [],
            errors: [],
        }),
        partitionItemProposals: () => ({
            operations: [],
            candidates: [],
        }),
        reconcileTurnActorPresenceWithSpatialState:
            transaction => transaction,
        reduceLocalPresence: () => ({
            occupantActorIds: [],
            cohortIds: [],
        }),
        removeExplicitAddressDirective: value =>
            value,
        removeSpellCastDirectives: value =>
            value,
        renderAll: () => {},
        requestLocalTurnAdjudication: async () => {
            modelCalls.push('pre');
            return {
                result: {
                    temporal: {
                        elapsedMinutes: 15,
                    },
                    check: {
                        required: false,
                    },
                },
                diagnostics: {},
            };
        },
        requestPostTurnSemanticObservation:
            async () => {
                modelCalls.push('post');
                workflowOrder.push(
                    'post_start',
                );
                if (postGate) {
                    await postGate
                        .promise;
                    workflowOrder.push(
                        'post_end',
                    );
                }
                return postObservation || {
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
                    temporalDiagnostics:
                        postTemporalDiagnostics,
                    targetActorIds:
                        [],
                };
            },
        resolveActionCheck: () => null,
        resolveEventWitnesses: () => null,
        resolvePlayerAddressing: () => ({
            valid:
                !invalidAddressing,
            error:
                invalidAddressing
                    ? 'Unknown addressed actor.'
                    : '',
            attempted: false,
            actorIds: [],
        }),
        resolveRoleSlots: () => ({
            low: {
                profileId: 'offline-test',
                contextSize: 4096,
                maxResponseLength: 512,
            },
        }),
        retrieveLocalKnowledge: async () => [],
        setLiveSceneStreamPhase: () => {},
        syncLocalKnowledge: async () => {},
        updateNativeMessageBlock: () => {},
        validateTurnTransaction: () => ({
            valid: true,
            errors: [],
        }),
        ...(savePorts || {}),
    });
    return {
        context,
        jobRegistry,
        preparePersistence: async () => {
            await savePorts.registerSaveRevisionHead(context, { persistMigration: false });
            durable = structuredClone({ state: context.chatMetadata.hogwartsMud, chat: context.chat });
        },
        resumeWrites: () => { failPreservation = false; },
        get durable() { return durable; },
        get streamClears() {
            return streamClears;
        },
        get currentTurnLocalizationCalls() {
            return currentTurnLocalizationCalls;
        },
        get settledLocalizationCalls() {
            return settledLocalizationCalls;
        },
        get currentTurnCandidates() {
            return currentTurnCandidates;
        },
        get translationCompletion() {
            return translationCompletion;
        },
        workflowOrder,
        modelCalls,
        workflow,
    };
}

test('initial scene performer prompt forbids replaying player speech as output dialogue', () => {
    const workflow =
        createTurnPerformancePromptHarness();
    const prompt =
        workflow.createScenePerformancePrompt(
            {
                clock:
                    '1991-09-02 · 12:00',
                scene: {},
                map: {},
                actors: [{
                    id: 'hermione',
                    nameEn:
                        'Hermione Granger',
                    present: true,
                }],
                actorLibrary: [],
                items: [],
            },
            'Please teach me.',
            {
                elapsedMinutes: 15,
                minimumWords: 240,
                maximumWords: 560,
            },
            [],
            null,
            null,
            null,
            {
                valid: true,
                actorIds: ['hermione'],
            },
            [],
            {
                mode: 'rich',
                label: 'rich',
                inputBudget: 108000,
                ragLimit: 10,
                memoryLimits: {},
            },
        );
    const systemPrompt =
        prompt[0].content;
    const userPayload =
        JSON.parse(
            prompt[1].content,
        );

    assert.match(
        systemPrompt,
        /playerTurn is input context, not output material/u,
    );
    assert.match(
        systemPrompt,
        /never emit a dialogue segment with actorId "player"/u,
    );
    assert.match(
        systemPrompt,
        /Every output dialogue segment must be new NPC speech/u,
    );
    assert.deepEqual(
        Object.keys(userPayload),
        [
            'playerTurn',
            'sceneFacts',
            'actorCards',
            'actionOpportunities',
            'memoryActivations',
            'prohibitions',
        ],
    );
    assert.equal(
        userPayload
            .playerTurn
            .playerTurnSequence[0]
            .speechText,
        'Please teach me.',
    );
    assert.equal(
        userPayload
            .sceneFacts
            .authoritativeSceneSpells[0]
            .incantation,
        'Acufors',
    );
    assert.match(
        systemPrompt,
        /authoritativeSceneSpells is binding spell identity/u,
    );
    const concreteStepRule =
        'When the player explicitly requests an immediate concrete step, complete it in this response when legal; do not stop at preparation.';
    assert.equal(
        systemPrompt
            .split(concreteStepRule)
            .length -
            1,
        1,
    );
    assert.doesNotMatch(
        systemPrompt,
        /explicitProgressionRequest|completedRequestedStep/u,
    );
});

test('scene performer drops a stale opening form after the timeline advances', () => {
    const workflow =
        createTurnPerformancePromptHarness();
    const state = {
        clock:
            '1991-09-02 · 12:30',
        scene: {
            id:
                'transfiguration_after_break',
            nameEn:
                'Transfiguration Classroom',
            summaryEn:
                'A tabby cat rests on the professor\'s desk.',
            timelineEntries: [
                {
                    clock:
                        '1991-09-02 · 11:30',
                    label:
                        'A tabby cat watches the class.',
                },
                {
                    clock:
                        '1991-09-02 · 11:45',
                    label:
                        'McGonagall transforms back and begins teaching.',
                },
            ],
        },
        map: {},
        actors: [{
            id:
                'minerva_mcgonagall',
            currentActivityEn:
                'Pacing the aisles in human form.',
            present: true,
        }],
        actorLibrary: [{
            id:
                'minerva_mcgonagall',
            nameEn:
                'Minerva McGonagall',
            roleEn:
                'Professor',
            performanceCore: {},
        }],
        items: [],
    };
    const prompt =
        workflow.createScenePerformancePrompt(
            state,
            'Lavender recalls petting the cat.',
            {
                elapsedMinutes: 15,
                minimumWords: 240,
                maximumWords: 560,
            },
            [],
            null,
            null,
            null,
            {
                valid: true,
                actorIds: [],
            },
            [],
            {
                mode: 'rich',
                label: 'rich',
                inputBudget: 108000,
                ragLimit: 10,
                memoryLimits: {},
            },
        );
    const systemPrompt =
        prompt[0].content;
    const userPayload =
        JSON.parse(
            prompt[1].content,
        );

    assert.deepEqual(
        Object.keys(userPayload),
        [
            'playerTurn',
            'sceneFacts',
            'actorCards',
            'actionOpportunities',
            'memoryActivations',
            'prohibitions',
        ],
    );
    assert.equal(
        Object.hasOwn(
            userPayload
                .sceneFacts
                .currentScene,
            'summaryEn',
        ),
        false,
    );
    assert.equal(
        userPayload
            .sceneFacts
            .currentScene
            .timelineEntries
            .length,
        2,
    );
    assert.equal(
        userPayload
            .actorCards[0]
            .runtime
            .activityEn,
        'Pacing the aisles in human form.',
    );
    assert.match(
        systemPrompt,
        /past transformation of one actor is not a second simultaneous creature/u,
    );
    assert.match(
        systemPrompt,
        /timelineEntries is chronological history, not a set of simultaneous facts/u,
    );

    state.scene.timelineEntries =
        state.scene.timelineEntries
            .slice(0, 1);
    const openingPayload =
        JSON.parse(
            workflow
                .createScenePerformancePrompt(
                    state,
                    '',
                    {
                        elapsedMinutes:
                            15,
                        minimumWords:
                            240,
                        maximumWords:
                            560,
                    },
                    [],
                    null,
                    null,
                    null,
                    {
                        valid: true,
                        actorIds: [],
                    },
                )[1]
                .content,
        );
    assert.deepEqual(
        Object.keys(openingPayload),
        [
            'playerTurn',
            'sceneFacts',
            'actorCards',
            'actionOpportunities',
            'memoryActivations',
            'prohibitions',
        ],
    );
    assert.equal(
        openingPayload
            .sceneFacts
            .currentScene
            .summaryEn,
        'A tabby cat rests on the professor\'s desk.',
    );
});

test('[defect-probing] scene transition projects only physical items and preserves remains by holder for both directors', async () => {
    const state = {
        clock:
            '1991-09-02 · 12:45',
        scene: {
            id:
                'transfiguration_after_break',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
        },
        items: [{
            version: 2,
            id:
                'harry_spare_brass_quill',
            type: 'tool',
            labelEn:
                'Harry\'s Spare Brass Quill',
            ownerId:
                'canon_harry_james_potter',
            holderId: 'player',
            location: {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
                placement:
                    'with_holder',
            },
            state: 'destroyed',
            physicalForm: 'remains',
            visibility: 'public',
            transferMode: 'loan',
        }, {
            version: 3,
            id: 'vanished_quill',
            type: 'tool',
            labelEn: 'Vanished Quill',
            ownerId: 'player',
            holderId: '',
            location: {
                mapId: '',
                roomId: '',
                placement: '',
            },
            state: 'destroyed',
            physicalForm: 'absent',
            visibility: 'public',
        }, {
            version: 3,
            id: 'lost_quill',
            type: 'tool',
            labelEn: 'Lost Quill',
            ownerId: 'player',
            holderId: '',
            location: {
                mapId: '',
                roomId: '',
                placement: '',
            },
            state: 'lost',
            physicalForm: 'unknown',
            visibility: 'public',
        }, {
            version: 2,
            id: 'hidden_note',
            type: 'document',
            labelEn: 'Hidden Note',
            ownerId:
                'canon_harry_james_potter',
            holderId:
                'canon_harry_james_potter',
            location: {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
                placement:
                    'with_holder',
            },
            state: 'intact',
            visibility: 'hidden',
        }],
        actors: [{
            id:
                'canon_harry_james_potter',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            present: true,
        }],
        actorLibrary: [],
    };
    const projectedState =
        structuredClone(state);
    projectedState.clock =
        '1991-09-02 · 13:05';
    projectedState.map
        .currentLocalNodeId =
        'gryffindor_common_room';
    projectedState.scene.roomId =
        'gryffindor_common_room';
    projectedState.actors[0].roomId =
        'gryffindor_common_room';

    const projected =
        projectAuthoritativeSceneItems(
            projectedState,
            synchronizeHeldItemLocations,
        );
    assert.deepEqual(
        projected,
        [{
            id:
                'harry_spare_brass_quill',
            labelEn:
                'Harry\'s Spare Brass Quill',
            ownerId:
                'canon_harry_james_potter',
            holderId: 'player',
            location: {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'gryffindor_common_room',
                placement:
                    'with_holder',
            },
            state: 'destroyed',
            physicalForm: 'remains',
            isEquipped: false,
            transferMode: 'loan',
        }],
    );

    let openingPrompt = null;
    const workflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT: '',
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
            extractRoleResponseText:
                response =>
                    response.content,
            formatRetrievedKnowledge:
                () => '',
            getContext: () => ({
                chat: [],
            }),
            getSceneDestinationAuthority:
                () => ({
                    roomNameEn:
                        'Gryffindor Common Room',
                }),
            parseJsonObject: value =>
                JSON.parse(value),
            projectActorLibraryForContext:
                () => [],
            sendSceneOpeningRequest:
                async (
                    roleSlot,
                    prompt,
                ) => {
                    openingPrompt =
                        prompt;
                    return {
                        content:
                            JSON.stringify({
                                segments: [{
                                    type:
                                        'narration',
                                    textEn:
                                        'The Gryffindor Common Room is quiet.',
                                }, {
                                    type:
                                        'narration',
                                    textEn:
                                        'The fire waits for a response.',
                                }],
                            }),
                    };
                },
            stripSyntheticSceneOpeningActorSegments:
                segments =>
                    segments,
            synchronizeHeldItemLocations,
            validateSceneTransitionPackage:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    const directorPrompt =
        workflow
            .createSceneTransitionPrompt(
                state,
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
    const directorPayload =
        JSON.parse(
            directorPrompt[1]
                .content,
        );
    assert.equal(
        directorPayload
            .authoritySnapshot
            .currentItems[0]
            .holderId,
        'player',
    );
    assert.equal(
        directorPayload
            .authoritySnapshot
            .currentItems[0]
            .state,
        'destroyed',
    );
    assert.equal(
        directorPayload
            .authoritySnapshot
            .currentItems[0]
            .physicalForm,
        'remains',
    );
    assert.deepEqual(
        directorPayload
            .authoritySnapshot
            .currentItems
            .map(item =>
                item.id),
        [
            'harry_spare_brass_quill',
        ],
    );
    assert.match(
        directorPrompt[0].content,
        /holderId alone controls physical possession/u,
    );
    const payload = {
        nextClock:
            '1991-09-02 · 13:05',
        nextScene: {
            id:
                'gryffindor_common_room_quill_repair',
            nameEn:
                'Gryffindor Common Room',
            summaryEn:
                'Tina considers repairing the destroyed quill.',
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            actorStates: [{
                id:
                    'canon_harry_james_potter',
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'gryffindor_common_room',
                currentActivityEn:
                    'Sitting away from Tina.',
            }],
        },
    };
    await workflow
        .generateSceneTransitionOpening(
            {},
            state,
            payload,
            {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'gryffindor_common_room',
            },
            {},
        );
    const openingSystemPrompt =
        openingPrompt[0].content;
    const openingPayload =
        JSON.parse(
            openingPrompt[1].content,
        );
    const quill =
        openingPayload
            .authoritySnapshot
            .currentItems[0];
    assert.equal(
        quill.ownerId,
        'canon_harry_james_potter',
    );
    assert.equal(
        quill.holderId,
        'player',
    );
    assert.equal(
        quill.state,
        'destroyed',
    );
    assert.equal(
        quill.physicalForm,
        'remains',
    );
    assert.equal(
        quill.location.roomId,
        'gryffindor_common_room',
    );
    assert.match(
        openingSystemPrompt,
        /holderId, not ownerId, controls who physically possesses/u,
    );
    assert.match(
        openingSystemPrompt,
        /destroyed Item may appear only as remains/u,
    );
});

test('Item candidate acceptance persists and renders without knowledge or model work', async () => {
    const candidate =
        normalizeItemProposal(
            {
                id:
                    'test_borrowed_quill',
                operation:
                    'acquire',
                type: 'tool',
                labelEn:
                    'Borrowed Quill',
                label:
                    '借来的羽毛笔',
                ownerId:
                    'canon_harry_james_potter',
                holderId: 'player',
                appearanceEn:
                    'A borrowed brass-nibbed quill.',
                appearance:
                    '一支借来的黄铜笔尖羽毛笔。',
                transferMode: 'loan',
                evidenceText:
                    'Harry offered Tina the quill.',
            },
            {
                sourceRole:
                    'local_observer',
                sourceEventId:
                    'test_item_candidate',
                clock:
                    '1991-09-02 · 12:00',
            },
        );
    const state = {
        clock:
            '1991-09-02 · 12:00',
        character: {
            confirmed: true,
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
        },
        scene: {
            itemStates: [],
        },
        items: [],
        actors: [{
            id:
                'canon_harry_james_potter',
        }],
        actorLibrary: [{
            id:
                'canon_harry_james_potter',
        }],
        actorPresentations: {},
        pendingItemProposals: [
            candidate,
        ],
        itemProposalDecisions: [],
    };
    let metadataSaves = 0;
    let knowledgeSyncs = 0;
    let renders = 0;
    let promptUpdates = 0;
    const context = {
        chatMetadata: {
            hogwartsMud:
                state,
        },
        saveMetadata:
            async () => {
                metadataSaves++;
            },
    };
    const slots = {
        low: {
            profileId: '',
        },
        medium: {
            profileId: '',
        },
        high: {
            profileId: '',
        },
    };
    const application =
        createWorkflowApplication({
            DEFAULT_SETTINGS: {
                promptVersion: 1,
                modelSlots: slots,
                translationProvider:
                    'off',
            },
            DEFAULT_WORLD_PROMPT: '',
            extension_settings: {},
            getRequestHeaders:
                () => ({
                    'Content-Type':
                        'application/json',
                }),
            getContext: () =>
                context,
            normalizeModelSlots:
                value =>
                    structuredClone(
                        value ||
                        slots,
                    ),
            normalizeTranslationProvider:
                value =>
                    value ||
                    'off',
            uuidv4: () =>
                'fixture',
            resolveItemCandidate,
            syncKnowledgeBase:
                async () => {
                    knowledgeSyncs++;
                    await new Promise(
                        () => {},
                    );
                },
            retrieveKnowledge:
                async () => [],
            applySystemPrompt:
                () => {
                    promptUpdates++;
                },
            renderAll:
                () => {
                    renders++;
                },
        });

    const result =
        await Promise.race([
            application
                .acceptItemCandidate(
                    candidate.key,
                ),
            new Promise(
                (
                    _resolve,
                    reject,
                ) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    'candidate acceptance timed out',
                                ),
                            ),
                        250,
                    ),
            ),
        ]);

    assert.equal(
        result.changed,
        true,
    );
    assert.equal(
        metadataSaves,
        1,
    );
    assert.equal(
        knowledgeSyncs,
        0,
    );
    assert.equal(
        promptUpdates,
        1,
    );
    assert.equal(
        renders,
        1,
    );
    assert.equal(
        context.chatMetadata
            .hogwartsMud
            .pendingItemProposals
            .length,
        0,
    );
    assert.equal(
        context.chatMetadata
            .hogwartsMud
            .items[0]
            .id,
        'test_borrowed_quill',
    );
    const replay =
        await application
            .acceptItemCandidate(
                candidate.key,
            );
    assert.equal(
        replay.changed,
        false,
    );
    assert.equal(
        metadataSaves,
        1,
    );
    assert.equal(
        knowledgeSyncs,
        0,
    );
    assert.equal(
        renders,
        2,
    );
});

test('custom spell candidate acceptance persists locally without knowledge or model work', async () => {
    const candidate =
        normalizeSpellProposal(
            {
                incantation:
                    'Nebula Verto',
                sourceActorId:
                    'canon_hermione_jean_granger',
                evidenceText:
                    'The incantation is Nebula Verto.',
                effectEn:
                    'It makes writing glow.',
            },
            {
                sourceEventId:
                    'test_spell_candidate',
                clock:
                    '1991-09-02 · 12:30',
            },
        );
    const state = {
        clock:
            '1991-09-02 · 12:30',
        turn: {
            count: 96,
        },
        campaign: {
            grade: 1,
        },
        character: {
            confirmed: true,
        },
        spellbook: {
            version: 2,
            known: [],
            lastScannedMessageId:
                -1,
        },
        pendingSpellProposals: [
            candidate,
        ],
        spellProposalDecisions: [],
    };
    let metadataSaves = 0;
    let knowledgeSyncs = 0;
    let renders = 0;
    let promptUpdates = 0;
    const context = {
        chatMetadata: {
            hogwartsMud:
                state,
        },
        saveMetadata:
            async () => {
                metadataSaves++;
            },
    };
    const slots = {
        low: {
            profileId: '',
        },
        medium: {
            profileId: '',
        },
        high: {
            profileId: '',
        },
    };
    const application =
        createWorkflowApplication({
            DEFAULT_SETTINGS: {
                promptVersion: 1,
                modelSlots: slots,
                translationProvider:
                    'off',
            },
            DEFAULT_WORLD_PROMPT: '',
            extension_settings: {},
            getRequestHeaders:
                () => ({
                    'Content-Type':
                        'application/json',
                }),
            getContext: () =>
                context,
            normalizeModelSlots:
                value =>
                    structuredClone(
                        value ||
                        slots,
                    ),
            normalizeTranslationProvider:
                value =>
                    value ||
                    'off',
            uuidv4: () =>
                'fixture',
            resolveSpellCandidate,
            syncKnowledgeBase:
                async () => {
                    knowledgeSyncs++;
                    await new Promise(
                        () => {},
                    );
                },
            retrieveKnowledge:
                async () => [],
            applySystemPrompt:
                () => {
                    promptUpdates++;
                },
            renderAll:
                () => {
                    renders++;
                },
        });

    const result =
        await Promise.race([
            application
                .acceptSpellCandidate(
                    candidate.key,
                ),
            new Promise(
                (
                    _resolve,
                    reject,
                ) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    'spell candidate acceptance timed out',
                                ),
                            ),
                        250,
                    ),
            ),
        ]);

    assert.equal(
        result.changed,
        true,
    );
    assert.equal(
        metadataSaves,
        1,
    );
    assert.equal(
        knowledgeSyncs,
        0,
    );
    assert.equal(
        promptUpdates,
        1,
    );
    assert.equal(
        renders,
        1,
    );
    assert.equal(
        context.chatMetadata
            .hogwartsMud
            .pendingSpellProposals
            .length,
        0,
    );
    assert.equal(
        context.chatMetadata
            .hogwartsMud
            .spellbook
            .known[0]
            .spellId,
        'custom_nebula_verto',
    );
});

test('runtime gate and job registries keep suppression and locks instance-local', () => {
    const leftGate = createAutomaticWorkGate();
    const rightGate = createAutomaticWorkGate();
    const leftJobs = createJobRegistry();
    const rightJobs = createJobRegistry();

    leftGate.suppressed = true;
    leftJobs.turnSettlement.set('turn', Promise.resolve());
    leftJobs.socialCatchupAttempts.add('cursor');

    assert.equal(rightGate.suppressed, false);
    assert.equal(rightJobs.turnSettlement.size, 0);
    assert.equal(rightJobs.socialCatchupAttempts.size, 0);
});

test('lifecycle repairs stale transition cast and local-presence projections without model work', () => {
    const activeActorIds = [
        'minerva_mcgonagall',
        'canon_hermione_jean_granger',
        'canon_ronald_bilius_weasley',
        'canon_lavender_brown',
    ];
    const localOnlyActorIds = [
        'canon_dean_thomas',
        'canon_harry_james_potter',
        'canon_neville_longbottom',
        'canon_seamus_finnigan',
    ];
    const actorIds = [
        ...activeActorIds,
        ...localOnlyActorIds,
    ];
    const cohortActorIds =
        actorIds.filter(id =>
            id !==
                'minerva_mcgonagall');
    const state = {
        modelSlots: {},
        actorLibrary:
            actorIds.map(id => ({
                id,
            })),
        actors:
            actorIds.map(id => ({
                id,
                present:
                    activeActorIds
                        .includes(id),
                lifeStatus:
                    'alive',
                mapId:
                    'hogwarts_castle',
                roomId:
                    activeActorIds
                        .includes(id)
                        ? 'transfiguration_classroom'
                        : 'charms_classroom',
            })),
        activeInteractionActorIds: [
            'canon_ronald_bilius_weasley',
        ],
        localPresence: {
            version: 1,
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            occupantActorIds:
                activeActorIds,
            cohortIds: [],
            updatedTurn:
                92,
            source:
                'actor_position',
        },
        cohorts: [{
            version: 1,
            id:
                'gryffindor_year1_charms_1991',
            labelEn:
                'Gryffindor first-years in Charms',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            knownMemberActorIds:
                cohortActorIds,
            source:
                'class_roster',
        }],
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
        },
        scene: {
            id:
                'transfiguration_after_break',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            startedClock:
                '1991-09-02 · 11:30',
            startedMessageId:
                0,
            timelineEntries: [],
            nextSceneIntent: {},
        },
        sceneArchive: [{
            localCohortIds: [
                'gryffindor_year1_charms_1991',
            ],
        }],
        checks: [],
        timeline: [],
        turn: {
            count: 92,
        },
        sceneTransition: {
            status:
                'idle',
        },
        pacingDirector: {
            status:
                'idle',
        },
        memoryDirector: {
            status:
                'ready',
            reviewAfterTurns:
                10,
            lastReviewedTurn:
                92,
        },
        causalCollapse: {},
        socialGraph: {},
    };
    const context = {
        chat: [],
    };
    const unchanged =
        current => ({
            state:
                current,
            changed:
                false,
        });
    const lifecycle =
        createLifecycleRuntime({
            createFallbackNextSceneIntent:
                () => ({}),
            getContext:
                () => context,
            getLocalMapDefinition:
                () => ({
                    nodes: [{
                        id:
                            'transfiguration_classroom',
                        kind:
                            'classroom',
                    }],
                }),
            getMudState:
                () => state,
            getRoomName:
                () => '',
            jobRegistry:
                createJobRegistry(),
            migrateActorKnowledgeBoundaries:
                unchanged,
            migrateActorMovementHistory:
                unchanged,
            migrateActorPresentationState:
                unchanged,
            migrateLoadedSocialGraph:
                graph => ({
                    graph,
                    changed:
                        false,
                }),
            migrateObservedInventoryState:
                unchanged,
            migrateRelationshipMemoryState:
                unchanged,
            migrateSpellbookState:
                unchanged,
            migrateTimelineAppraisalState:
                unchanged,
            normalizeCausalCollapseState:
                value => value,
            normalizeModelSlots:
                value => value,
            projectActorSocialRelationships:
                value => value,
            projectSceneTransitionPresence,
            reconcileCanonActorDisplayNames:
                unchanged,
            reconcileTemporaryActorDisplayNames:
                unchanged,
            reduceLocalPresence,
            saveMetadataDebounced:
                () => {},
            validateNextSceneIntent:
                () => ({
                    valid: true,
                }),
        });

    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        true,
    );
    assert.deepEqual(
        state
            .activeInteractionActorIds,
        activeActorIds,
    );
    assert.deepEqual(
        state.localPresence,
        {
            version: 1,
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            occupantActorIds:
                [...actorIds]
                    .sort(),
            cohortIds: [
                'gryffindor_year1_transfiguration_1991',
            ],
            updatedTurn:
                92,
            source:
                'cohort_roster',
        },
    );
});

test('turn diagnostics stay local, bounded, and retain only recent traces', () => {
    let id = 0;
    let now =
        Date.parse(
            '1991-09-01T08:00:00.000Z',
        );
    const recorder =
        createTurnDiagnosticsRecorder({
            createId: () =>
                `trace-${++id}`,
            now: () =>
                now++,
        });
    const chat = [];
    for (
        let turn = 0;
        turn <
            TURN_DIAGNOSTIC_HISTORY_LIMIT +
                2;
        turn++
    ) {
        recorder.beginTurnDiagnostics({
            playerAction:
                `turn ${turn}`,
            turnCount:
                turn,
        });
        for (
            let event = 0;
            event <
                TURN_DIAGNOSTIC_EVENT_LIMIT +
                    2;
            event++
        ) {
            recorder.recordTurnDiagnostic(
                'event',
                {
                    text:
                        'x'.repeat(
                            TURN_DIAGNOSTIC_STRING_LIMIT +
                                10,
                        ),
                    requestedPlayerAction:
                        'raw player action',
                    playerMessage:
                        'raw player message',
                    addressing: {
                        speechText:
                            'nested player speech',
                        targetLabels: [
                            'nested player target',
                        ],
                    },
                    momentum: {
                        unresolvedPublicPressureEn:
                            'nested model output',
                    },
                },
            );
        }
        const trace =
            recorder.finalizeTurnDiagnostics(
                'committed',
            );
        const message = {
            extra: {
                hogwartsMud: {},
            },
        };
        chat.push(message);
        attachTurnDiagnostics(
            chat,
            message,
            trace,
        );
        assert.equal(
            trace.events.length,
            TURN_DIAGNOSTIC_EVENT_LIMIT,
        );
        assert.equal(
            trace.events[0]
                .sequence,
            0,
        );
        assert.equal(
            trace.playerAction,
            undefined,
        );
        assert.equal(
            trace.playerActionCharacters,
            `turn ${turn}`.length,
        );
        assert.deepEqual(
            trace.events
                .find(event =>
                    event.stage ===
                        'event')
                .data,
            {
                addressing: {},
                momentum: {},
            },
        );
    }
    assert.equal(
        chat.filter(message =>
            message.extra
                .hogwartsMud
                .turnDiagnostics)
            .length,
        TURN_DIAGNOSTIC_HISTORY_LIMIT,
    );
    assert.equal(
        chat.at(-1)
            .extra
            .hogwartsMud
            .turnDiagnostics
            .status,
        'committed',
    );
});

test('opening workflow accepts a valid first response without repair', async () => {
    const harness = createOpeningHarness([
        JSON.stringify({
            valid: true,
            id: 'opening',
        }),
    ]);

    const result =
        await harness.workflow.generateOpeningPackage(
            {
                profileId: 'offline-test',
            },
            harness.state,
        );

    assert.equal(result.id, 'opening');
    assert.equal(harness.calls.length, 1);
});

test('opening workflow surfaces the first invalid response without repair', async () => {
    const harness = createOpeningHarness([
        JSON.stringify({
            valid: false,
        }),
    ]);

    await assert.rejects(
        harness.workflow
            .generateOpeningPackage(
                {
                    profileId: 'offline-test',
                },
                harness.state,
            ),
        /invalid opening/u,
    );
    assert.equal(
        harness.calls.length,
        1,
    );
});

test('model adapter records scheduler-owned request metrics without raw prompt data', async () => {
    const events = [];
    const prompt = [
        {
            role: 'system',
            content:
                'You are the low-tier On-Scene Performer. The scene must plausibly cover 15 minutes. Every direct block must receive an answer.',
        },
        {
            role: 'user',
            content:
                JSON.stringify({
                    playerAction:
                        'Whisper to Lavender.',
                    playerTurnSequence: [{
                        type:
                            'direct_speech',
                        targetActorId:
                            'canon_lavender_brown',
                        text:
                            'A private question.',
                    }],
                    elapsedMinutes:
                        15,
                    targetWordRange: [
                        240,
                        560,
                    ],
                }),
        },
    ];
    const adapter =
        createModelAdapter({
            ConnectionManagerRequestService: {
                sendRequest:
                    async () => ({
                        content:
                            '{"segments":[]}',
                    }),
            },
            applyRegexPresetById:
                async () => {},
            getConnectionProfiles:
                () => [{
                    id: 'base',
                }],
            parseCompleteJsonObject:
                value => value,
            recordTurnDiagnostic:
                (stage, data) => {
                    events.push({
                        stage,
                        data,
                    });
                },
            uuidv4:
                () => 'diagnostic-test',
        });

    await adapter
        .createScheduledRoleInvoker()(
            {
                profileId:
                'base',
                contextSize:
                4096,
                maxResponseLength:
                512,
            },
            prompt,
            {
                json: true,
            },
        );

    assert.deepEqual(
        events.map(event =>
            event.stage),
        [
            'model_request',
            'model_call',
        ],
    );
    assert.equal(
        events[0].stage,
        'model_request',
    );
    assert.equal(
        events[0].data
            .contextTrimmed,
        false,
    );
    assert.equal(
        events[0].data
            .originalPlayerAction,
        undefined,
    );
    assert.equal(
        events[0].data
            .limitedUserJsonValid,
        true,
    );
    assert.equal(
        events[0].data
            .limitedPlayerAction,
        undefined,
    );
    assert.equal(
        events[0].data
            .originalPlayerTurnSequence,
        undefined,
    );
    assert.equal(
        events[0].data
            .limitedUserPrefix,
        undefined,
    );
    assert.equal(
        events[0].data
            .instructionFlags
            .limitedDuration,
        true,
    );
    assert.deepEqual(
        events[1].data,
        {
            tier: 'unknown',
            stream: false,
        },
    );
});

test('production turn workflow overlaps Low post with P0 translation before committing', async () => {
    const postGate =
        deferred();
    const translationGate =
        deferred();
    const harness =
        createTurnHarness({
            postGate,
            translationGate,
        });
    let turnCompleted = false;
    const turnPromise =
        harness.workflow
            .retryFailedPlayerTurn()
            .then(() => {
                turnCompleted = true;
            });

    await new Promise(resolve =>
        setImmediate(resolve));
    assert.deepEqual(
        harness.workflowOrder
            .slice(0, 2),
        [
            'post_start',
            'translation_start',
        ],
    );
    assert.equal(
        turnCompleted,
        false,
    );

    postGate.resolve();
    await new Promise(resolve =>
        setImmediate(resolve));
    assert.equal(
        turnCompleted,
        false,
    );
    assert.equal(
        harness.workflowOrder
            .includes(
                'translation_end',
            ),
        false,
    );

    translationGate.resolve();
    await turnPromise;
    assert.equal(
        turnCompleted,
        true,
    );
    assert.equal(
        harness.workflowOrder
            .at(-1),
        'translation_end',
    );
});

test('initial narrative persistence failure retains session prose without Post dispatch or a saved claim', async () => {
    const harness = createTurnHarness({ failInitialPreservation: true });
    await harness.preparePersistence();
    await harness.workflow.runStructuredTurn(harness.context.chat[0].mes);
    assert.equal(harness.context.chat.length, 1);
    assert.equal(harness.workflowOrder.includes('post_start'), false);
    assert.equal(harness.jobRegistry.unsavedPostNarrative.message.extra.hogwartsMud.segments[0].textEn,
        'Tina waits by the door.');
    assert.equal(harness.jobRegistry.unsavedPostNarrative.message.extra.hogwartsMud.turnTransaction, undefined);
    assert.equal(harness.context.chatMetadata.hogwartsMud.turn.status, 'post_unsettled');
    const callsBefore = [...harness.modelCalls];
    const countBefore = harness.context.chatMetadata.hogwartsMud.turn.count;
    await assert.rejects(() => harness.workflow.retryPendingPostSettlement({ saveOnly: true }), /initial disk write failed/);
    assert.ok(harness.jobRegistry.unsavedPostNarrative);
    assert.equal(harness.durable.chat.length, 1);
    harness.resumeWrites();
    const result = await harness.workflow.retryPendingPostSettlement({ saveOnly: true });
    assert.deepEqual(result, { settled: false, narrativeSaved: true });
    assert.equal(harness.jobRegistry.unsavedPostNarrative, undefined);
    assert.deepEqual(harness.modelCalls, callsBefore);
    assert.deepEqual(callsBefore, ['pre', 'scene']);
    assert.equal(harness.durable.state.turn.count, countBefore);
    assert.equal(harness.durable.state.turn.status, 'post_unsettled');
    assert.equal(harness.durable.chat[1].extra.hogwartsMud.segments[0].textEn, 'Tina waits by the door.');
    assert.equal(harness.durable.chat[1].extra.hogwartsMud.pendingPostSettlement.recovery.supplement.status, 'available');
    assert.equal(harness.durable.chat[1].extra.hogwartsMud.turnTransaction, undefined);
});

test('malformed Post families preserve a valid Material sibling until explicit defaults commit', async () => {
    const narrative =
        'Tina placed the brass cup on the table.';
    const validMaterial = {
        type: 'object_placed',
        actorId: 'player',
        objectTextEn:
            'the brass cup',
        sourceTextEn: '',
        targetTextEn:
            'the table',
        valueTextEn: '',
        previousValueTextEn: '',
        resultTextEn:
            'the brass cup on the table',
        quantity: 1,
        operation: 'add',
        slot: 'hands',
        hand: 'right',
        persistence:
            'until_changed',
        sourceKind: 'narrative',
        evidenceText: narrative,
        confidence: 0.95,
    };
    const baseResult = {
        schemaVersion: 2,
        temporaryActors: [],
        firstImpressions: [],
        sceneProgression: null,
        pacingRealization: null,
        historicalClaims: [],
        materialEvents: [
            validMaterial,
        ],
        actorUpdates: [],
        inventoryObservationRequired:
            false,
        perception: {
            version: 1,
            visualScope: 'room',
            audibleScope: 'none',
            salience: 'normal',
            attribution: 'clear',
            concealment: 'none',
            directParticipantActorIds:
                [],
            evidenceText: narrative,
            confidence: 0.9,
            source:
                'post_turn_observer',
        },
        temporalClaims: [],
        playerMovement: null,
        inventoryUpdates: [],
        identityObservations: [],
    };
    const malformedCases = [
        [
            'materialEvents',
            {
                materialEvents: [
                    validMaterial,
                    {
                        invalid: true,
                    },
                ],
            },
        ],
        [
            'actorUpdates',
            {
                actorUpdates: [{
                    invalid: true,
                }],
            },
        ],
        [
            'inventoryObservationRequired',
            {
                inventoryObservationRequired:
                    'yes',
            },
        ],
        [
            'perception',
            {
                perception: {
                    invalid: true,
                },
            },
        ],
        [
            'temporalClaims',
            {
                temporalClaims: [{
                    invalid: true,
                }],
            },
        ],
        [
            'inventoryUpdates',
            {
                inventoryUpdates: [{
                    invalid: true,
                }],
            },
        ],
        [
            'identityObservations',
            {
                identityObservations: [{
                    invalid: true,
                }],
            },
        ],
    ];

    for (
        const [
            family,
            malformed,
        ]
        of malformedCases
    ) {
        const raw = {
            ...structuredClone(
                baseResult,
            ),
            ...malformed,
        };
        const adapter =
            createLocalSemanticAdapter({
                buildLocalMapModel:
                    () => ({
                        nodes: [{
                            id: 'classroom',
                            nameEn:
                                'Classroom',
                        }],
                        exits: [],
                    }),
                buildStructuredPlayerTurnSequence:
                    () => [],
                getRequestHeaders:
                    () => ({}),
                projectObservedInventoryUpdates:
                    () => [],
                resolveRoleSlots:
                    slots => slots,
                sendPostTurnSemanticRequest:
                    async () => ({
                        content:
                            JSON.stringify(
                                raw,
                            ),
                    }),
                fetchImpl:
                    async (_url, options) => ({
                        ok: true,
                        json:
                            async () => {
                                const body =
                                    JSON.parse(
                                        options
                                            .body,
                                    );
                                return settlePostTurnModelResult(
                                    body.input,
                                    body.raw,
                                );
                            },
                    }),
                validatePerceptionContract:
                    perception => ({
                        valid:
                            Boolean(
                                perception,
                            ),
                        value:
                            perception,
                    }),
            });
        const postObservation =
            await adapter
                .requestPostTurnSemanticObservation(
                    {
                        clock:
                            '1991-09-01 · 08:00',
                        postTurnSemanticProvider:
                            'low',
                        modelSlots: {
                            low: {
                                profileId:
                                    'low-profile',
                            },
                        },
                        character: {
                            canonicalEn: {
                                identity: {
                                    nameEn:
                                        'Tina',
                                },
                            },
                        },
                        map: {
                            activeMapId:
                                'castle',
                            currentLocalNodeId:
                                'classroom',
                        },
                        scene: {
                            id: 'lesson',
                            mapId: 'castle',
                            roomId:
                                'classroom',
                        },
                        actors: [],
                        actorLibrary: [],
                        localPresence: {
                            occupantActorIds:
                                [],
                        },
                        items: [],
                    },
                    'Wait by the door.',
                    {
                        elapsedMinutes: 15,
                        segments: [{
                            type:
                                'narration',
                            textEn:
                                narrative,
                        }],
                        actorPresence: {
                            presentActorIdsAfterTurn:
                                [],
                        },
                        actorUpdates: [],
                    },
                );
        assert.notEqual(
            postObservation
                .postSettlementFailure,
            true,
            family,
        );
        assert.equal(
            postObservation
                .materialEvents
                .length,
            1,
            family,
        );
        const harness =
            createTurnHarness({
                postObservation,
            });

        await harness.workflow
            .runStructuredTurn(
                harness.context
                    .chat[0].mes,
            );

        if (family !== 'inventoryObservationRequired') {
            assert.equal(harness.context.chatMetadata.hogwartsMud.turn.status, 'post_unsettled', family);
            assert.equal(harness.context.chat[1].extra.hogwartsMud.turnTransaction, undefined, family);
            await harness.workflow.retryPendingPostSettlement({ defaults: true });
        }
        assert.equal(
            harness.context
                .chatMetadata
                .hogwartsMud
                .turn.status,
            'idle',
            family,
        );
        assert.equal(
            harness.context
                .chatMetadata
                .hogwartsMud
                .lastTransaction
                .materialEvents
                .length,
            1,
            family,
        );
        assert.ok(
            harness.context
                .chatMetadata
                .hogwartsMud
                .lastTransaction
                .settlementWarnings
                .some(warning =>
                    warning.code ===
                        'post_family_rejected' &&
                    warning.detail
                        .startsWith(
                            `${family}:`,
                        )),
            family,
        );
    }
});

test('failed-turn retry appends one assistant response without duplicating player input', async () => {
    const legacyDiagnostics = {
        version: 1,
        traceId: 'legacy-v1',
        events: [{
            stage: 'legacy',
        }],
    };
    const harness = createTurnHarness({
        legacyDiagnostics,
    });

    await harness.workflow.retryFailedPlayerTurn();

    assert.equal(harness.context.chat.length, 2);
    assert.equal(
        harness.context.chat.filter(message =>
            message.is_user).length,
        1,
    );
    assert.equal(
        harness.context.chatMetadata.hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(harness.streamClears, 1);
    assert.equal(
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics
            .version,
        3,
    );
    assert.deepEqual(
        harness.context.chat[0]
            .extra
            .hogwartsMud
            .turnDiagnostics,
        legacyDiagnostics,
    );
    assert.equal(
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics
            .status,
        'committed',
    );
    assert.ok(
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics
            .events
            .some(event =>
                event.stage ===
                    'workflow_input'),
    );
    const milestones =
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics
            .events;
    const narrativeVisible =
        milestones.find(event =>
            event.stage ===
                'narrative_visible');
    const stateSettled =
        milestones.find(event =>
            event.stage ===
                'state_settled');
    assert.ok(
        narrativeVisible,
    );
    assert.ok(
        stateSettled,
    );
    assert.equal(
        narrativeVisible.data.surface,
        'chat_message',
    );
    assert.equal(
        stateSettled.data.scope,
        'persistent_turn_and_immediate_followups',
    );
    assert.equal(
        harness
            .currentTurnLocalizationCalls,
        1,
    );
    assert.equal(
        harness
            .settledLocalizationCalls,
        0,
    );
    assert.deepEqual(
        harness.currentTurnCandidates
            .map(candidate => ({
                recordId:
                    candidate
                        .recordId,
                priority:
                    candidate
                        .priority,
            })),
        [{
            recordId:
                'message:1:segment:0',
            priority: 0,
        }],
    );
    assert.deepEqual(
        harness.workflowOrder
            .slice(0, 2),
        [
            'post_start',
            'translation_start',
        ],
    );
    assert.equal(
        milestones.indexOf(
            narrativeVisible,
        ) <
            milestones.indexOf(
                stateSettled,
            ),
        true,
    );
});

test('selected provider paths keep one early current-message owner without post-settlement enqueue', async () => {
    const harness =
        createTurnHarness();

    await harness.workflow
        .retryFailedPlayerTurn();

    assert.equal(
        harness
            .currentTurnLocalizationCalls,
        1,
    );
    assert.equal(
        harness
            .settledLocalizationCalls,
        0,
    );
});

test('[defect-probing] production addressing failure persists bounded V3 diagnostics for the new turn', async () => {
    const legacyDiagnostics = {
        version: 1,
        traceId: 'legacy-v1',
    };
    const harness =
        createTurnHarness({
            invalidAddressing: true,
            legacyDiagnostics,
        });

    await assert.rejects(
        harness.workflow
            .runStructuredTurn(
                'Wait by the door.',
            ),
        /Unknown addressed actor/u,
    );

    const diagnostics =
        harness.context.chat[0]
            .extra
            .hogwartsMud
            .turnDiagnostics;
    assert.equal(
        diagnostics.version,
        3,
    );
    assert.equal(
        diagnostics.status,
        'failed',
    );
    assert.ok(
        diagnostics.events.length <=
            TURN_DIAGNOSTIC_EVENT_LIMIT,
    );
    assert.equal(
        harness.jobRegistry
            .turnSettlement.size,
        0,
    );
    assert.equal(
        harness.jobRegistry
            .turnActive,
        false,
    );
});

test('[defect-probing] temporal claim diagnostics retain rule metadata but never persist evidence prose', async () => {
    const evidence =
        'TEMPORAL_EVIDENCE_SENTINEL: the player and model prose must not persist';
    const harness =
        createTurnHarness({
            postTemporalDiagnostics: {
                valid: false,
                accepted: 0,
                rejected: 1,
                errors: [
                    `Rejected temporal claim: ${evidence}`,
                ],
                reasonCodes: [
                    evidence,
                ],
                rejectedClaims: [{
                    index: 3,
                    evidenceText: evidence,
                    kind: 'schedule',
                    reason:
                        'external_time_not_authorized',
                }],
            },
        });

    await harness.workflow
        .retryFailedPlayerTurn();

    const diagnostics =
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics;
    const validation =
        diagnostics.events.find(event =>
            event.stage ===
                'temporal_claim_validation');
    assert.deepEqual(
        validation.data,
        {
            valid: false,
            accepted: 0,
            rejected: 1,
            reasonCodes: [
                'unknown_rejection_reason',
                'external_time_not_authorized',
            ],
            rejectedClaims: [{
                index: 3,
                kind: 'schedule',
                reason:
                    'external_time_not_authorized',
            }],
            persisted: false,
        },
    );
    assert.equal(
        JSON.stringify(diagnostics)
            .includes(evidence),
        false,
    );
});

test('unsettled-turn recovery rewrites the existing assistant message in place', async () => {
    const harness = createTurnHarness({
        existingAssistant: true,
    });

    await harness.workflow.processUnsettledTurn();

    assert.equal(harness.context.chat.length, 2);
    assert.equal(
        harness.context.chat[1].mes,
        'Tina waits by the door.',
    );
    assert.equal(
        harness.context.chatMetadata.hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(harness.streamClears, 1);
});
