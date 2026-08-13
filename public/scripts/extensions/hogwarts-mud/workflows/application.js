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
    getWorldDate,
    runHighCalendarDirectorSafely,
    runMediumCalendarDirectorSafely,
    ensureDailyDirectorPlan,
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
        const settledState =
            getMudState() ||
            committedState;
        if (
            settledState
                ?.dailyDirector
                ?.date !==
            getWorldDate(
                settledState.clock,
            )
        ) {
            await ensureDailyDirectorPlan();
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
        applyDirectorFoundation,
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
        getWorldDate,
        isDailyDirectorPlanCurrent,
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
        validateDirectorFoundation,
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
        sendRoleRequest,
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
        sendRoleRequest,
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
        sendRoleRequest,
    });

    const {
        ensureDirectorFoundation:
            ensureDirectorFoundationBase,
        composeSceneSegments,
        hasOpeningNarrative,
        initializeOpeningWorld:
            initializeOpeningWorldBase,
    } = createOpeningWorkflow({
        CANON_WIT_TONE_CONTRACT,
        PRESET_WORLD_MAP,
        TRANSLATION_FORMAT_VERSION,
        applyDirectorFoundation,
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
        sendRoleRequest,
        syncLocalKnowledge,
        translateOpeningValues,
        validateDirectorFoundation,
        validateOpeningWorldPackage,
    });

    async function ensureDirectorFoundation() {
        const result =
            await ensureDirectorFoundationBase();
        const state =
            getMudState();
        if (
            state
                ?.directorFoundation
                ?.status === 'ready' &&
            state.phase === 'playing'
        ) {
            const highPlanningResult =
                await runHighCalendarDirectorSafely({
                    trigger: 'foundation',
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

    async function initializeOpeningWorld() {
        const result =
            await initializeOpeningWorldBase();
        const state =
            getMudState();
        if (
            state
                ?.directorFoundation
                ?.status === 'ready' &&
            state.phase === 'playing'
        ) {
            const highPlanningResult =
                await runHighCalendarDirectorSafely({
                    trigger: 'foundation',
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
        sendRoleRequest,
        translateOpeningValues,
        validateGeneratedInteriorMap,
    });

    const {
        projectActorLibraryForContext,
        ensureDailyDirectorPlan,
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
        getWorldDate,
        isDailyDirectorPlanCurrent,
        jobRegistry,
        normalizeActorMemoryProfile,
        normalizePacingAssessmentPayload,
        parseJsonObject,
        projectNpcRuntimeActorsForPrompt,
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        selectSharedMemoriesForContext,
        sendRoleRequest,
        syncLocalKnowledge,
        validatePacingAssessment,
    });

    const {
        createMemoryConsolidationPrompt,
        SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
        ensureMemoryConsolidation,
        ensureSocialDirectorCatchup,
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
        sendRoleRequest,
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
        sendRoleRequest,
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
        const settledState =
            getMudState() ||
            result;
        if (
            settledState
                ?.dailyDirector
                ?.date !==
            getWorldDate(
                settledState.clock,
            )
        ) {
            await ensureDailyDirectorPlan();
        }
        return getMudState() ||
            settledState;
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
                getWorldDate,
                runHighCalendarDirectorSafely,
                runMediumCalendarDirectorSafely,
                ensureDailyDirectorPlan,
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
            getWorldDate,
            runHighCalendarDirectorSafely,
            runMediumCalendarDirectorSafely,
            ensureDailyDirectorPlan,
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
        buildActorContinuityCapsules,
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
        sendRoleRequest,
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
        ensureDailyDirectorPlan,
        ensureDirectorFoundation,
        ensureMemoryConsolidation,
        runMediumCalendarDirectorSafely,
        ensurePacingDirectorAssessment,
        ensureSceneLifecycleState,
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
        getWorldDate,
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
        sendRoleRequest,
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
        ensureDirectorFoundation,
        composeSceneSegments,
        hasOpeningNarrative,
        initializeOpeningWorld,
        ensureCurrentInteriorMap,
        projectActorLibraryForContext,
        ensureDailyDirectorPlan,
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
