import { createStatePorts } from '../runtime/state-ports.js';
import { createLifecycleRuntime } from '../runtime/lifecycle.js';
import {
    attachTurnDiagnostics,
    createTurnDiagnosticsRecorder,
} from '../runtime/turn-diagnostics.js';
import { createModelAdapter } from '../adapters/model.js';
import { createKnowledgeAdapter } from '../adapters/knowledge.js';
import { createTranslationAdapter } from '../adapters/translation.js';
import { createLocalSemanticAdapter } from '../adapters/local-semantic.js';
import {
    createModelEventScheduler,
} from '../runtime/model-event-scheduler.js';
import { createOpeningWorkflow } from './opening.js';
import { createInteriorMapWorkflow } from './interior-map.js';
import { createDirectorWorkflows } from './directors.js';
import { createSocialMemoryWorkflow } from './social-memory.js';
import { createSceneTransitionWorkflow } from './scene-transition.js';
import { createTurnPerformanceWorkflow } from './turn-performance.js';
import { createTurnWorkflow } from './turn.js';
import { createHighCalendarDirectorWorkflow } from './high-calendar-director.js';
import { createMediumCalendarDirectorWorkflow } from './medium-calendar-director.js';
import { createCalendarMomentWorkflow } from './calendar-moment.js';

function highPlanningAllowsMedium(
    result,
) {
    return result?.status !==
        'failed';
}

export async function finalizeCalendarMomentPostCommit({
    committedState,
    previousClock,
    getMudState,
    runHighCalendarDirectorSafely,
    runMediumCalendarDirectorSafely,
    warn = console.warn,
}) {
    try {
        let highPlanningResult =
            null;
        if (
            committedState
                ?.sceneTransition
                ?.tier ===
            'high'
        ) {
            highPlanningResult =
                await runHighCalendarDirectorSafely({
                    trigger:
                        'high_transition',
                });
        }
        if (
            highPlanningAllowsMedium(
                highPlanningResult,
            )
        ) {
            await runMediumCalendarDirectorSafely({
                previousClock,
                highPlanningResult,
            });
        }
    } catch (error) {
        warn(
            '[Hogwarts MUD] Calendar Moment committed; post-commit director refresh failed',
            error,
        );
    }
    return getMudState() ||
        committedState;
}

export function createWorkflowApplication(ports) {
    const {
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        ConnectionManagerRequestService,
        DEFAULT_MODEL_SLOTS,
        DEFAULT_SETTINGS,
        DEFAULT_WORLD_PROMPT,
        NPC_IDENTITY_PROMPT_BOUNDARY,
        PRESET_WORLD_MAP,
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
        TRANSLATION_FORMAT_VERSION,
        TRANSLATION_TERM_GLOSSARY,
        admitCurrentLocationResidents,
        admitMentionedKnownActors,
        analyzeMemoryConsolidation,
        analyzePacingSignals,
        applyGeneratedInteriorMap,
        applyNativeRoleSettings,
        applyOpeningWorldPackage,
        applyPacingAssessment,
        applyPlayerMovement,
        applyPresenceWitnessTransaction,
        applyRegexPresetById,
        applySceneTransition,
        applySocialDirectorResult,
        applySystemPrompt,
        applyTranslationGlossaryTargets,
        applyTurnTransaction,
        beginLiveSceneStream,
        buildActorContinuityCapsules,
        buildActorKnowledgeCapsules,
        buildActorMemoryKnowledgeSeeds,
        buildActorSelectionPolicy,
        buildActorTranslationTerms,
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
        buildLocalMapModel,
        buildMapAuthorityContext,
        buildNpcIdentityPromptProjection,
        buildSceneCastRotationPolicy,
        buildSocialAudienceProjection,
        captureMemoryBoundaryGuard,
        buildSpatialContext,
        buildStructuredPlayerTurnSequence,
        buildTemporaryActorPromotionPolicy,
        clearLiveSceneStream,
        consumePacingBeat,
        createContextBudgetPlan,
        createDeterministicPerceptionFallback,
        createFallbackNextSceneIntent,
        createTranslationBatches,
        createTurnPerformanceBudget,
        createTurnRetryCheckpoint,
        enterBoundInteriorMap,
        extractSpellCandidates,
        extension_settings,
        filterKnowledgeForAudience,
        findLocalRoomPath,
        findSceneDestination,
        findUnsettledTurn,
        formatNextSceneIntent,
        formatRetrievedKnowledge,
        getActiveAddressingState,
        getAuthoritativeSceneSpells,
        getConnectionProfiles,
        getContext,
        getFailedPlayerTurn,
        getInspectorMapScope,
        getInteriorMapRequest,
        getLocalMapDefinition,
        getRequestHeaders,
        getRoomName,
        getSceneDestinationAuthority,
        isMemoryBoundaryGuardCurrent,
        jobRegistry,
        limitMessagesToContext,
        migrateActorContextState,
        migrateActorKnowledgeBoundaries,
        migrateActorMovementHistory,
        migrateActorPresentationState,
        migrateLoadedSocialGraph,
        migrateObservedInventoryState,
        migrateItemSystemState,
        migrateNpcIdentityState,
        migrateNpcIdentityObservations,
        migrateRelationshipMemoryState,
        migrateSpellbookState,
        normalizeActorMemoryProfile,
        normalizeCausalCollapseState,
        normalizeEventKnowledge,
        normalizeGeneratedInteriorMapLabels,
        normalizeLocalTranslationText,
        normalizeMemoryConsolidationPayload,
        normalizeModelSlots,
        normalizePacingAssessmentPayload,
        normalizeSceneTransitionPackage,
        normalizeSocialGraph,
        normalizeTranslationProvider,
        parseCompleteJsonObject,
        parseItemOperationDirectives,
        parseSpellCastDirectives,
        partitionItemProposals,
        projectActorSocialRelationships,
        projectObservedInventoryUpdates,
        projectNpcRuntimeActorsForPrompt,
        projectSceneArchivePresence,
        projectSceneTransitionPresence,
        protectTranslationTerms,
        reconcileCanonActorDisplayNames,
        reconcileObservedPerceptionWithFallback,
        reconcileSpatialState,
        reconcileAuthoritativeSpellNarrative,
        reconcileTemporaryActorDisplayNames,
        reconcileTurnActorPresenceWithSpatialState,
        reconcileVisibleActorPresenceState,
        recoverScenePerformancePayload,
        reduceLocalPresence,
        removeExplicitAddressDirective,
        removeSpellCastDirectives,
        renderAll,
        resetInspectorMapScope,
        assertSaveRevisionWritable =
        () => {},
        guardedSaveTransaction,
        resolveActionCheck,
        resolveEventWitnesses,
        resolveItemCandidate,
        resolvePlayerAddressing,
        resolveSpellCandidate,
        resolveTemporaryActorRevealedName,
        restoreTranslationTerms,
        retrieveKnowledge,
        saveMetadataDebounced,
        scheduleRender,
        selectSharedMemoriesForContext,
        setLiveSceneStreamPhase,
        settleNarrativeTurnPerformance,
        splitTranslationChunks,
        stripSyntheticSceneOpeningActorSegments,
        synchronizeHeldItemLocations,
        syncKnowledgeBase,
        updateLiveSceneStream,
        updateNativeMessageBlock,
        uuidv4,
        validateGeneratedInteriorMap,
        validateMemoryConsolidation,
        validateNextSceneIntent,
        validateOpeningWorldPackage,
        validatePacingAssessment,
        validatePerceptionContract,
        validateScenePerformance,
        validateSceneTransitionPackage,
        validateSocialDirectorResult,
        validateTurnTransaction,
    } = ports;

    const {
        getSettings,
        resolveRoleSlots,
        getMudState,
    } = createStatePorts({
        DEFAULT_SETTINGS,
        DEFAULT_WORLD_PROMPT,
        extension_settings,
        getContext,
        normalizeModelSlots,
        normalizeTranslationProvider,
    });

    const {
        beginTurnDiagnostics,
        recordTurnDiagnostic,
        finalizeTurnDiagnostics,
        discardTurnDiagnostics,
    } = createTurnDiagnosticsRecorder({
        createId: uuidv4,
    });

    const {
        ensureSceneLifecycleState,
    } = createLifecycleRuntime({
        createFallbackNextSceneIntent,
        getContext,
        getLocalMapDefinition,
        getMudState,
        getRoomName,
        jobRegistry,
        migrateActorContextState,
        migrateActorKnowledgeBoundaries,
        migrateActorMovementHistory,
        migrateActorPresentationState,
        migrateLoadedSocialGraph,
        migrateObservedInventoryState,
        migrateItemSystemState,
        migrateNpcIdentityState,
        migrateNpcIdentityObservations,
        migrateRelationshipMemoryState,
        migrateSpellbookState,
        normalizeCausalCollapseState,
        normalizeModelSlots,
        projectActorSocialRelationships,
        projectSceneTransitionPresence,
        reconcileCanonActorDisplayNames,
        reconcileTemporaryActorDisplayNames,
        reduceLocalPresence,
        saveMetadataDebounced,
        validateNextSceneIntent,
    });

    const {
        sendRoleRequest:
            invokeRoleRequest,
        extractRoleResponseText,
        parseJsonObject,
    } = createModelAdapter({
        ConnectionManagerRequestService,
        applyRegexPresetById,
        beforeRequest:
            assertSaveRevisionWritable,
        createContextBudgetPlan,
        getConnectionProfiles,
        limitMessagesToContext,
        parseCompleteJsonObject,
        recordTurnDiagnostic,
        uuidv4,
    });
    const modelEventScheduler =
        createModelEventScheduler({
            invokeRole:
                invokeRoleRequest,
            getState:
                getMudState,
            persistRuntime:
                async () => {
                    if (getMudState()) {
                        await getContext()
                            .saveMetadata({
                                source:
                                    'model_task_runtime',
                                changedDomains: [
                                    'model_task_runtime',
                                ],
                            });
                    }
                },
            getRuntimeMaximumCharacters:
                roleSlot =>
                    createContextBudgetPlan(
                        roleSlot
                            ?.contextSize,
                        roleSlot
                            ?.maxResponseLength,
                    )
                        .maxPromptCharacters,
            enforceProductBudget:
                true,
            onAttempt:
                envelope =>
                    recordTurnDiagnostic(
                        'model_task_attempt',
                        {
                            taskId:
                                envelope.taskId,
                            eventType:
                                envelope.event
                                    .eventType,
                            emittedBy:
                                envelope.event
                                    .emittedBy,
                            actionId:
                                envelope.event
                                    .actionId,
                            phase:
                                envelope.event
                                    .phase,
                            promptCharacters:
                                envelope
                                    .promptMeasurement
                                    ?.characters ??
                                null,
                            productBudget:
                                envelope
                                    .promptBudget
                                    ?.maximumCharacters ??
                                null,
                        },
                    ),
        });
    const roleRequests = {
        characterPolish:
            modelEventScheduler
                .createRoleRequest(
                    'character_polish',
                    {
                        eventType:
                            'setup.character_polish_requested',
                        emittedBy:
                            'ui.setup',
                        tier: 'medium',
                    },
                ),
        openingWorld:
            modelEventScheduler
                .createRoleRequest(
                    'opening_world',
                    {
                        eventType:
                            'world.bootstrap_requested',
                        emittedBy:
                            'opening.initialize',
                        tier: 'high',
                    },
                ),
        calendarHigh:
            modelEventScheduler
                .createRoleRequest(
                    'calendar_high',
                    {
                        eventType:
                            'calendar.high_planning_requested',
                        emittedBy:
                            'calendar.high_guard',
                        tier: 'high',
                    },
                ),
        calendarMedium:
            modelEventScheduler
                .createRoleRequest(
                    'calendar_medium',
                    {
                        eventType:
                            'calendar.horizon_low',
                        emittedBy:
                            'calendar.medium_guard',
                        tier: 'medium',
                    },
                ),
        interiorCartographer:
            modelEventScheduler
                .createRoleRequest(
                    'interior_cartographer',
                    {
                        eventType:
                            'map.container_entered',
                        emittedBy:
                            'map.interior_guard',
                        tier: 'medium',
                    },
                ),
        pacingDirector:
            modelEventScheduler
                .createRoleRequest(
                    'pacing_director',
                    {
                        eventType:
                            'turn.pre_generation',
                        emittedBy:
                            'turn.pacing_guard',
                        tier: 'medium',
                    },
                ),
        scenePerformance:
            modelEventScheduler
                .createRoleRequest(
                    'scene_performance',
                    {
                        eventType:
                            'turn.generation',
                        emittedBy:
                            'turn.performance',
                        tier: 'low',
                    },
                ),
        sceneTransition:
            modelEventScheduler
                .createRoleRequest(
                    'scene_transition',
                    {
                        eventType:
                            'scene.close_requested',
                        emittedBy:
                            'scene.transition',
                    },
                ),
        sceneOpening:
            modelEventScheduler
                .createRoleRequest(
                    'scene_opening',
                    {
                        eventType:
                            'scene.transition_committed',
                        emittedBy:
                            'scene.transition',
                        tier: 'low',
                    },
                ),
        sceneOpeningBootstrap:
            modelEventScheduler
                .createRoleRequest(
                    'scene_opening',
                    {
                        eventType:
                            'world.bootstrap_committed',
                        emittedBy:
                            'opening.initialize',
                        tier: 'low',
                    },
                ),
        socialDirector:
            modelEventScheduler
                .createRoleRequest(
                    'social_director',
                    {
                        eventType:
                            'memory.event_boundary_committed',
                        emittedBy:
                            'social.memory_guard',
                        tier: 'medium',
                    },
                ),
        mapExpansion:
            modelEventScheduler
                .createRoleRequest(
                    'map_expansion',
                    {
                        eventType:
                            'map.expansion_requested',
                        emittedBy:
                            'ui.map',
                        tier: 'high',
                    },
                ),
    };

    const {
        syncLocalKnowledge,
        retrieveLocalKnowledge,
    } = createKnowledgeAdapter({
        getContext,
        getMudState,
        recordTurnDiagnostic,
        retrieveKnowledge,
        syncKnowledgeBase,
    });

    const {
        translateOpeningValues,
        translateWithProvider,
    } = createTranslationAdapter({
        TRANSLATION_TERM_GLOSSARY,
        applyTranslationGlossaryTargets,
        buildActorTranslationTerms,
        createTranslationBatches,
        getMudState,
        getRequestHeaders,
        getSettings,
        normalizeLocalTranslationText,
        normalizeTranslationProvider,
        protectTranslationTerms,
        restoreTranslationTerms,
        runLocalModelTask:
            modelEventScheduler
                .runLocalTask,
        splitTranslationChunks,
    });

    const {
        runHighCalendarDirector,
        runHighCalendarDirectorSafely,
    } = createHighCalendarDirectorWorkflow({
        buildMapAuthorityContext,
        extractRoleResponseText,
        getContext,
        getMudState,
        jobRegistry,
        parseJsonObject,
        renderAll,
        resolveRoleSlots,
        sendModelTaskRequest:
            roleRequests.calendarHigh,
    });

    const {
        runMediumCalendarDirector,
        runMediumCalendarDirectorSafely,
    } = createMediumCalendarDirectorWorkflow({
        applySystemPrompt,
        buildMapAuthorityContext,
        extractRoleResponseText,
        getContext,
        getMudState,
        guardedSaveTransaction,
        jobRegistry,
        parseJsonObject,
        renderAll,
        resolveRoleSlots,
        sendModelTaskRequest:
            roleRequests.calendarMedium,
    });

    const {
        composeSceneSegments,
        hasOpeningNarrative,
        initializeOpeningWorld:
            initializeOpeningWorldBase,
    } = createOpeningWorkflow({
        CANON_WIT_TONE_CONTRACT,
        PRESET_WORLD_MAP,
        TRANSLATION_FORMAT_VERSION,
        applyNativeRoleSettings,
        applyOpeningWorldPackage,
        applySystemPrompt,
        extractRoleResponseText,
        getContext,
        getMudState,
        getSettings,
        jobRegistry,
        parseJsonObject,
        renderAll,
        resolveRoleSlots,
        scheduleRender,
        sendBootstrapSceneOpeningRequest:
            roleRequests.sceneOpeningBootstrap,
        sendOpeningWorldRequest:
            roleRequests.openingWorld,
        syncLocalKnowledge,
        translateOpeningValues,
        validateOpeningWorldPackage,
    });

    function assertWorldFoundationReady(
        state =
        getMudState(),
    ) {
        if (
            !state ||
            (state.actorLibrary || [])
                .length < 3 ||
            !(state.storyArcs || [])
                .some(arc =>
                    arc?.status !==
                    'closed')
        ) {
            throw new TypeError(
                'World bootstrap is incomplete. Opening World must commit Actor Library and Story Arc atomically.',
            );
        }
        return true;
    }

    async function initializeOpeningWorld() {
        const result =
            await initializeOpeningWorldBase();
        const state =
            getMudState();
        if (
            state &&
            state.phase === 'playing'
        ) {
            assertWorldFoundationReady(
                state,
            );
            const highPlanningResult =
                await runHighCalendarDirectorSafely({
                    trigger:
                        'opening_world',
                });
            if (
                highPlanningAllowsMedium(
                    highPlanningResult,
                )
            ) {
                await runMediumCalendarDirectorSafely({
                    highPlanningResult,
                });
            }
        }
        return result;
    }

    const {
        ensureCurrentInteriorMap,
    } = createInteriorMapWorkflow({
        applyGeneratedInteriorMap,
        applySystemPrompt,
        enterBoundInteriorMap,
        extractRoleResponseText,
        getContext,
        getInspectorMapScope,
        getInteriorMapRequest,
        getLocalMapDefinition,
        getMudState,
        getSettings,
        jobRegistry,
        normalizeGeneratedInteriorMapLabels,
        parseJsonObject,
        renderAll,
        resetInspectorMapScope,
        resolveRoleSlots,
        sendModelTaskRequest:
            roleRequests
                .interiorCartographer,
        translateOpeningValues,
        validateGeneratedInteriorMap,
    });

    const {
        projectActorLibraryForContext,
        ensurePacingDirectorAssessment,
    } = createDirectorWorkflows({
        CANON_CAST_IDENTITY_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY,
        analyzePacingSignals,
        applyPacingAssessment,
        applySystemPrompt,
        buildActorSelectionPolicy,
        buildMapAuthorityContext,
        buildNpcIdentityPromptProjection,
        createContextBudgetPlan,
        extractRoleResponseText,
        formatRetrievedKnowledge,
        getContext,
        getMudState,
        jobRegistry,
        normalizeActorMemoryProfile,
        normalizePacingAssessmentPayload,
        parseJsonObject,
        projectNpcRuntimeActorsForPrompt,
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        selectSharedMemoriesForContext,
        sendPacingDirectorRequest:
            roleRequests.pacingDirector,
        syncLocalKnowledge,
        validatePacingAssessment,
    });

    const {
        createMemoryConsolidationPrompt,
        SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
        ensureMemoryConsolidation,
        ensureSocialDirectorCatchup,
        ensureSocialDirectorForAction,
    } = createSocialMemoryWorkflow({
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
        analyzeMemoryConsolidation,
        applySocialDirectorResult,
        applySystemPrompt,
        buildSocialAudienceProjection,
        captureMemoryBoundaryGuard,
        createContextBudgetPlan,
        extractRoleResponseText,
        getContext,
        getMudState,
        getRequestHeaders,
        getSettings,
        isMemoryBoundaryGuardCurrent,
        jobRegistry,
        normalizeActorMemoryProfile,
        normalizeMemoryConsolidationPayload,
        normalizeSocialGraph,
        renderAll,
        resolveRoleSlots,
        selectSharedMemoriesForContext,
        sendModelTaskRequest:
            roleRequests.socialDirector,
        syncLocalKnowledge,
        translateOpeningValues,
        validateMemoryConsolidation,
        validateSocialDirectorResult,
    });

    const {
        runSceneTransition:
            runSceneTransitionBase,
        buildSceneArchiveEntry,
        buildSceneTransitionMessage,
        generateSceneTransitionOpening,
        generateSceneTransitionPackage,
        localizeSceneTransitionPackage,
    } = createSceneTransitionWorkflow({
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY,
        TRANSLATION_FORMAT_VERSION,
        admitCurrentLocationResidents,
        applySceneTransition,
        applySystemPrompt,
        buildActorContinuityCapsules,
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
        buildMapAuthorityContext,
        buildSceneCastRotationPolicy,
        composeSceneSegments,
        createContextBudgetPlan,
        ensureCurrentInteriorMap,
        ensureSceneLifecycleState,
        ensureSocialDirectorCatchup,
        extractRoleResponseText,
        findSceneDestination,
        formatNextSceneIntent,
        formatRetrievedKnowledge,
        getContext,
        getMudState,
        getSceneDestinationAuthority,
        getSettings,
        jobRegistry,
        normalizeSceneTransitionPackage,
        parseJsonObject,
        projectActorLibraryForContext,
        projectNpcRuntimeActorsForPrompt,
        projectSceneArchivePresence,
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        sendSceneOpeningRequest:
            roleRequests.sceneOpening,
        sendSceneTransitionRequest:
            roleRequests.sceneTransition,
        stripSyntheticSceneOpeningActorSegments,
        synchronizeHeldItemLocations,
        syncLocalKnowledge,
        translateOpeningValues,
        validateSceneTransitionPackage,
    });

    const {
        runCalendarMoment:
            runCalendarMomentBase,
        runTimelineMoment:
            runTimelineMomentBase,
    } = createCalendarMomentWorkflow({
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        applySceneTransition,
        applySystemPrompt,
        buildSceneArchiveEntry,
        buildSceneTransitionMessage,
        createContextBudgetPlan,
        generateSceneTransitionOpening,
        generateSceneTransitionPackage,
        getContext,
        getMudState,
        guardedSaveTransaction,
        jobRegistry,
        localizeSceneTransitionPackage,
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
    });

    async function runSceneTransition(
        options = {},
    ) {
        const previousClock =
            getMudState()?.clock ||
            '';
        const result =
            await runSceneTransitionBase(
                options,
            );
        let highPlanningResult =
            null;
        if (
            options.tier ===
            'high'
        ) {
            highPlanningResult =
                await runHighCalendarDirectorSafely({
                    trigger:
                        'high_transition',
                });
        }
        if (
            highPlanningAllowsMedium(
                highPlanningResult,
            )
        ) {
            await runMediumCalendarDirectorSafely({
                previousClock,
                highPlanningResult,
            });
        }
        return getMudState() ||
            result;
    }

    async function runCalendarMoment(
        entryId,
    ) {
        const previousClock =
            getMudState()?.clock ||
            '';
        const result =
            await runCalendarMomentBase(
                entryId,
            );
        const finalized =
            await finalizeCalendarMomentPostCommit({
                committedState:
                    result,
                previousClock,
                getMudState,
                runHighCalendarDirectorSafely,
                runMediumCalendarDirectorSafely,
            });
        return finalized;
    }

    async function runTimelineMoment(
        options,
    ) {
        const previousClock =
            getMudState()?.clock ||
            '';
        const result =
            await runTimelineMomentBase(
                options,
            );
        return finalizeCalendarMomentPostCommit({
            committedState:
                result,
            previousClock,
            getMudState,
            runHighCalendarDirectorSafely,
            runMediumCalendarDirectorSafely,
        });
    }

    const {
        createSceneMomentumDirective,
        generateScenePerformance,
        buildSceneTransaction,
        localizeTurnTransaction,
    } = createTurnPerformanceWorkflow({
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY,
        beginLiveSceneStream,
        buildActorKnowledgeCapsules,
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
        buildNpcIdentityPromptProjection,
        buildSpatialContext,
        buildStructuredPlayerTurnSequence,
        buildTemporaryActorPromotionPolicy,
        createContextBudgetPlan,
        extractRoleResponseText,
        formatRetrievedKnowledge,
        getActiveAddressingState,
        getAuthoritativeSceneSpells,
        getRequestHeaders,
        getSettings,
        parseItemOperationDirectives,
        parseJsonObject,
        projectNpcRuntimeActorsForPrompt,
        recordTurnDiagnostic,
        recoverScenePerformancePayload,
        removeExplicitAddressDirective,
        resolvePlayerAddressing,
        resolveTemporaryActorRevealedName,
        sendModelTaskRequest:
            roleRequests.scenePerformance,
        setLiveSceneStreamPhase,
        settleNarrativeTurnPerformance,
        translateOpeningValues,
        updateLiveSceneStream,
        validateScenePerformance,
    });

    const {
        buildLocalSemanticRoomContext,
        requestLocalTurnAdjudication,
        requestLocalTurnAppraisals,
        isObservedEventBoundary,
        applyObservedActorUpdates,
        requestLocalTurnObservation,
    } = createLocalSemanticAdapter({
        buildLocalMapModel,
        buildStructuredPlayerTurnSequence,
        createDeterministicPerceptionFallback,
        findLocalRoomPath,
        getRequestHeaders,
        projectObservedInventoryUpdates,
        reconcileObservedPerceptionWithFallback,
        runLocalModelTask:
            modelEventScheduler
                .runLocalTask,
        validatePerceptionContract,
    });

    const {
        runStructuredTurn,
        retryFailedPlayerTurn,
        preparePlayableState,
    } = createTurnWorkflow({
        TRANSLATION_FORMAT_VERSION,
        admitCurrentLocationResidents,
        admitMentionedKnownActors,
        applyObservedActorUpdates,
        applyPlayerMovement,
        applyPresenceWitnessTransaction,
        applySystemPrompt,
        applyTurnTransaction,
        attachTurnDiagnostics,
        beginTurnDiagnostics,
        buildActorMemoryKnowledgeSeeds,
        buildLocalSemanticRoomContext,
        buildSceneTransaction,
        clearLiveSceneStream,
        composeSceneSegments,
        consumePacingBeat,
        createContextBudgetPlan,
        createSceneMomentumDirective,
        createTurnPerformanceBudget,
        createTurnRetryCheckpoint,
        ensureCurrentInteriorMap,
        assertWorldFoundationReady,
        ensurePacingDirectorAssessment,
        ensureSceneLifecycleState,
        ensureSocialDirectorForAction,
        ensureSocialDirectorCatchup,
        finalizeTurnDiagnostics,
        filterKnowledgeForAudience,
        findUnsettledTurn,
        generateScenePerformance,
        getActiveAddressingState,
        getContext,
        getFailedPlayerTurn,
        getLocalMapDefinition,
        getMudState,
        getSettings,
        getInspectorMapScope,
        isObservedEventBoundary,
        jobRegistry,
        localizeTurnTransaction,
        normalizeEventKnowledge,
        parseItemOperationDirectives,
        parseSpellCastDirectives,
        partitionItemProposals,
        extractSpellCandidates,
        reconcileSpatialState,
        reconcileAuthoritativeSpellNarrative,
        reconcileTurnActorPresenceWithSpatialState,
        reconcileVisibleActorPresenceState,
        reduceLocalPresence,
        removeExplicitAddressDirective,
        removeSpellCastDirectives,
        renderAll,
        resetInspectorMapScope,
        requestLocalTurnAdjudication,
        requestLocalTurnAppraisals,
        requestLocalTurnObservation,
        recordTurnDiagnostic,
        resolveActionCheck,
        resolveEventWitnesses,
        resolvePlayerAddressing,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        setLiveSceneStreamPhase,
        stripSyntheticSceneOpeningActorSegments,
        syncLocalKnowledge,
        updateNativeMessageBlock,
        validateTurnTransaction,
        discardTurnDiagnostics,
    });

    async function decideItemCandidate(
        key,
        decision,
    ) {
        assertSaveRevisionWritable();
        const context =
            getContext();
        const state =
            getMudState();
        const result =
            resolveItemCandidate(
                state,
                key,
                decision,
            );
        if (!result.changed) {
            renderAll();
            return result;
        }
        context.chatMetadata
            .hogwartsMud =
            result.state;
        await context
            .saveMetadata();
        applySystemPrompt();
        renderAll();
        return result;
    }

    const acceptItemCandidate =
        key =>
            decideItemCandidate(
                key,
                'accepted',
            );
    const ignoreItemCandidate =
        key =>
            decideItemCandidate(
                key,
                'ignored',
            );

    async function decideSpellCandidate(
        key,
        decision,
    ) {
        assertSaveRevisionWritable();
        const context =
            getContext();
        const result =
            resolveSpellCandidate(
                getMudState(),
                key,
                decision,
            );
        if (!result.changed) {
            renderAll();
            return result;
        }
        context.chatMetadata
            .hogwartsMud =
            result.state;
        await context
            .saveMetadata();
        applySystemPrompt();
        renderAll();
        return result;
    }

    const acceptSpellCandidate =
        key =>
            decideSpellCandidate(
                key,
                'accepted',
            );
    const ignoreSpellCandidate =
        key =>
            decideSpellCandidate(
                key,
                'ignored',
            );


    return {
        getSettings,
        resolveRoleSlots,
        getMudState,
        ensureSceneLifecycleState,
        sendCharacterPolishRequest:
            roleRequests.characterPolish,
        sendMapExpansionRequest:
            roleRequests.mapExpansion,
        extractRoleResponseText,
        parseJsonObject,
        syncLocalKnowledge,
        retrieveLocalKnowledge,
        translateOpeningValues,
        translateWithProvider,
        runHighCalendarDirector,
        runHighCalendarDirectorSafely,
        runMediumCalendarDirector,
        runMediumCalendarDirectorSafely,
        assertWorldFoundationReady,
        composeSceneSegments,
        hasOpeningNarrative,
        initializeOpeningWorld,
        ensureCurrentInteriorMap,
        projectActorLibraryForContext,
        ensurePacingDirectorAssessment,
        createMemoryConsolidationPrompt,
        SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
        ensureMemoryConsolidation,
        ensureSocialDirectorCatchup,
        runSceneTransition,
        runCalendarMoment,
        runTimelineMoment,
        createSceneMomentumDirective,
        generateScenePerformance,
        buildSceneTransaction,
        localizeTurnTransaction,
        buildLocalSemanticRoomContext,
        requestLocalTurnAdjudication,
        isObservedEventBoundary,
        applyObservedActorUpdates,
        requestLocalTurnObservation,
        runStructuredTurn,
        retryFailedPlayerTurn,
        preparePlayableState,
        acceptItemCandidate,
        ignoreItemCandidate,
        acceptSpellCandidate,
        ignoreSpellCandidate,
        assertSaveRevisionWritable,
    };
}
