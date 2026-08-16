import { createStatePorts } from '../runtime/state-ports.js';
import { createLifecycleRuntime } from '../runtime/lifecycle.js';
import {
    attachTurnDiagnostics,
    createTurnDiagnosticsRecorder,
} from '../runtime/turn-diagnostics.js';
import { createModelAdapter } from '../adapters/model.js';
import { createKnowledgeAdapter } from '../adapters/knowledge.js';
import { createTranslationAdapter } from '../adapters/translation.js';
import {
    createLocalizationTableAdapter,
} from '../adapters/localization-table.js';
import { createLocalSemanticAdapter } from '../adapters/local-semantic.js';
import {
    createLocalizationQueue,
} from '../domain/localization-queue.js';
import {
    collectChatLocalizationCandidates,
    collectStateLocalizationCandidates,
} from '../domain/localization-candidates.js';
import {
    TRANSLATION_TABLE_LIMITS,
    createTranslationRowKey,
    hashTranslationSource,
} from '../domain/localization-contract.js';
import {
    createModelEventScheduler,
} from '../runtime/model-event-scheduler.js';
import {
    createIdleLocalizationScheduler,
} from '../runtime/idle-localization-scheduler.js';
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

export async function filterPersistedLocalizationCandidates({
    candidates,
    timelineEpoch,
    localizationTable,
    maxQueryKeys =
    TRANSLATION_TABLE_LIMITS
        .maxQueryKeys,
}) {
    const prepared =
        Array.isArray(candidates)
            ? candidates
            : [];
    const keys = [
        ...new Set(
            prepared
                .map(candidate =>
                    String(
                        candidate?.key ||
                        '',
                    ))
                .filter(Boolean),
        ),
    ];
    const persistedKeys =
        new Set();
    for (
        let offset = 0;
        offset < keys.length;
        offset += maxQueryKeys
    ) {
        const response =
            await localizationTable
                .queryRows(
                    timelineEpoch,
                    keys.slice(
                        offset,
                        offset +
                            maxQueryKeys,
                    ),
                );
        const rowKeys =
            await Promise.all(
                (
                    response.rows ||
                    []
                ).map(row =>
                    createTranslationRowKey(
                        row,
                    )),
            );
        rowKeys.forEach(key =>
            persistedKeys.add(key));
    }
    return prepared.filter(
        candidate =>
            !persistedKeys.has(
                candidate.key,
            ),
    );
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
        TRANSLATION_TERM_GLOSSARY,
        admitCurrentLocationResidents,
        admitMentionedKnownActors,
        analyzeMemoryConsolidation,
        analyzePacingSignals,
        automaticWork,
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
        restoreTranslationTerms,
        retrieveKnowledge,
        saveMetadataDebounced,
        scheduleRender,
        selectSharedMemoriesForContext,
        setLiveSceneStreamPhase,
        settleNarrativeTurnPerformance,
        shouldTranslateToChinese,
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
        resolveRoleSlots,
        getMudState,
        getSettings,
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
        translateLocalizationBatch,
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
        shouldTranslateToChinese,
        runLocalModelTask:
            modelEventScheduler
                .runLocalTask,
        splitTranslationChunks,
    });
    const localizationTable =
        createLocalizationTableAdapter({
            getRequestHeaders,
        });
    const localizationQueue =
        createLocalizationQueue();
    const idleLocalizationScheduler =
        createIdleLocalizationScheduler({
            queue:
                localizationQueue,
            automaticWork,
            jobRegistry,
            getProviderId:
                () =>
                    getSettings()
                        .translationProvider,
            getActionId:
                () =>
                    String(
                        getMudState()
                            ?.modelTaskRuntime
                            ?.activeActionId ||
                        '',
                    ),
            isDocumentVisible:
                () =>
                    globalThis.document
                        ?.visibilityState !==
                    'hidden',
            translateBatch:
                translateLocalizationBatch,
            upsertRows:
                async translated => {
                    const timelineEpoch =
                        String(
                            getMudState()
                                ?.timelineEpoch ||
                            '',
                        );
                    const rows =
                        await Promise.all(
                            translated.map(
                                candidate =>
                                    candidate
                                        .translationStatus ===
                                        'error'
                                        ? localizationTable
                                            .createErrorRow({
                                                timelineEpoch,
                                                recordKind:
                                                    candidate
                                                        .recordKind,
                                                recordId:
                                                    candidate
                                                        .recordId,
                                                fieldPath:
                                                    candidate
                                                        .fieldPath,
                                                sourceText:
                                                    candidate
                                                        .sourceText,
                                                providerId:
                                                    candidate
                                                        .providerId ||
                                                    getSettings()
                                                        .translationProvider,
                                                translatorVersion:
                                                    Number(
                                                        candidate
                                                            .translatorVersion ||
                                                        1,
                                                    ),
                                                glossaryVersion:
                                                    Number(
                                                        candidate
                                                            .glossaryVersion ||
                                                        1,
                                                    ),
                                                errorCode:
                                                    candidate
                                                        .errorCode ||
                                                    'TARGET_LOCALE_MISMATCH',
                                            })
                                        : localizationTable
                                            .createReadyRow({
                                                timelineEpoch,
                                                recordKind:
                                                    candidate
                                                        .recordKind,
                                                recordId:
                                                    candidate
                                                        .recordId,
                                                fieldPath:
                                                    candidate
                                                        .fieldPath,
                                                sourceText:
                                                    candidate
                                                        .sourceText,
                                                translatedText:
                                                    candidate
                                                        .translatedText,
                                                providerId:
                                                    candidate
                                                        .providerId ||
                                                    getSettings()
                                                        .translationProvider,
                                                translatorVersion:
                                                    Number(
                                                        candidate
                                                            .translatorVersion ||
                                                        1,
                                                    ),
                                                glossaryVersion:
                                                    Number(
                                                        candidate
                                                            .glossaryVersion ||
                                                        1,
                                                    ),
                                            }),
                            ),
                        );
                    await localizationTable
                        .upsertRows(
                            timelineEpoch,
                            rows.map(
                                entry =>
                                    entry.row,
                            ),
                        );
                    if (
                        globalThis
                            .CustomEvent &&
                        globalThis
                            .dispatchEvent
                    ) {
                        globalThis
                            .dispatchEvent(
                                new globalThis
                                    .CustomEvent(
                                        'hogwarts-mud-localization-rows',
                                        {
                                            detail:
                                                rows,
                                        },
                                    ),
                            );
                    }
                },
            recordFailure:
                async ({
                    candidates,
                    errorCode,
                }) => {
                    const timelineEpoch =
                        String(
                            getMudState()
                                ?.timelineEpoch ||
                            '',
                        );
                    const rows =
                        await Promise.all(
                            candidates.map(
                                candidate =>
                                    localizationTable
                                        .createErrorRow({
                                            timelineEpoch,
                                            recordKind:
                                                candidate
                                                    .recordKind,
                                            recordId:
                                                candidate
                                                    .recordId,
                                            fieldPath:
                                                candidate
                                                    .fieldPath,
                                            sourceText:
                                                candidate
                                                    .sourceText,
                                            providerId:
                                                candidate
                                                    .providerId ||
                                                getSettings()
                                                    .translationProvider,
                                            translatorVersion:
                                                Number(
                                                    candidate
                                                        .translatorVersion ||
                                                    1,
                                                ),
                                            glossaryVersion:
                                                Number(
                                                    candidate
                                                        .glossaryVersion ||
                                                    1,
                                                ),
                                            errorCode,
                                        }),
                            ),
                        );
                    await localizationTable
                        .upsertRows(
                            timelineEpoch,
                            rows.map(
                                entry =>
                                    entry.row,
                            ),
                        );
                },
            render:
                () => renderAll(),
        });

    async function enqueueLocalizationCandidates(
        candidates,
    ) {
        const state =
            getMudState();
        const providerId =
            getSettings()
                .translationProvider;
        if (
            !state?.timelineEpoch ||
            providerId === 'off'
        ) {
            return;
        }
        const allCandidates = [
            ...(candidates || []),
            ...collectStateLocalizationCandidates(
                state,
            ),
            ...collectChatLocalizationCandidates(
                getContext()
                    ?.chat ||
                [],
            ),
        ];
        const prepared =
            await Promise.all(
                allCandidates
                    .filter(candidate =>
                        String(
                            candidate
                                ?.sourceText ||
                            '',
                        ).trim())
                    .map(async candidate => {
                        const sourceHash =
                            await hashTranslationSource(
                                candidate
                                    .sourceText,
                            );
                        const identity = {
                            timelineEpoch:
                                state
                                    .timelineEpoch,
                            recordKind:
                                candidate
                                    .recordKind,
                            recordId:
                                candidate
                                    .recordId,
                            fieldPath:
                                candidate
                                    .fieldPath,
                            sourceHash,
                            sourceLocale:
                                'en',
                            targetLocale:
                                'zh-CN',
                            providerId,
                            translatorVersion:
                                Number(
                                    candidate
                                        .translatorVersion ||
                                    1,
                                ),
                            glossaryVersion:
                                Number(
                                    candidate
                                        .glossaryVersion ||
                                    1,
                                ),
                        };
                        return {
                            ...candidate,
                            ...identity,
                            key:
                                await createTranslationRowKey(
                                    identity,
                                ),
                        };
                    }),
            );
        const uniquePrepared =
            new Map();
        prepared.forEach(candidate => {
            const current =
                uniquePrepared.get(
                    candidate.key,
                );
            uniquePrepared.set(
                candidate.key,
                current
                    ? {
                        ...current,
                        priority:
                            Math.min(
                                current
                                    .priority,
                                candidate
                                    .priority,
                            ),
                    }
                    : candidate,
            );
        });
        let pending;
        try {
            pending =
                await filterPersistedLocalizationCandidates({
                    candidates: [
                        ...uniquePrepared
                            .values(),
                    ],
                    timelineEpoch:
                        state.timelineEpoch,
                    localizationTable,
                });
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Localization candidate table query failed',
                error,
            );
            return {
                enqueued: 0,
                skipped:
                    uniquePrepared.size,
                errorCode:
                    String(
                        error?.code ||
                        'TABLE_UNAVAILABLE',
                    ).slice(0, 64),
            };
        }
        localizationQueue.enqueue(
            pending,
        );
        idleLocalizationScheduler
            .schedule();
        return {
            enqueued:
                pending.length,
            skipped:
                uniquePrepared.size -
                pending.length,
            errorCode: '',
        };
    }

    const {
        runHighCalendarDirector,
        runHighCalendarDirectorSafely,
    } = createHighCalendarDirectorWorkflow({
        buildMapAuthorityContext,
        enqueueLocalizationCandidates,
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
        enqueueLocalizationCandidates,
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
        PRESET_WORLD_MAP,
        applyNativeRoleSettings,
        applyOpeningWorldPackage,
        applySystemPrompt,
        enqueueLocalizationCandidates,
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
        jobRegistry,
        parseJsonObject,
        renderAll,
        resetInspectorMapScope,
        resolveRoleSlots,
        sendModelTaskRequest:
            roleRequests
                .interiorCartographer,
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
        enqueueLocalizationCandidates,
        extractRoleResponseText,
        getContext,
        getMudState,
        getRequestHeaders,
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
    } = createSceneTransitionWorkflow({
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY,
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
        enqueueLocalizationCandidates,
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
        parseItemOperationDirectives,
        parseJsonObject,
        projectNpcRuntimeActorsForPrompt,
        recordTurnDiagnostic,
        recoverScenePerformancePayload,
        removeExplicitAddressDirective,
        resolvePlayerAddressing,
        sendModelTaskRequest:
            roleRequests.scenePerformance,
        setLiveSceneStreamPhase,
        settleNarrativeTurnPerformance,
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
        enqueueLocalizationCandidates,
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
        localizationTable,
        localizationQueue,
        idleLocalizationScheduler,
        enqueueLocalizationCandidates,
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
