import {
    reduceAppraisalProposals,
} from '../domain/memory-synapse-reducer.js';
import {
    beginModelTaskAction,
    endModelTaskAction,
} from '../domain/model-task-runtime.js';
import {
    getDeterministicTimePolicy,
} from '../domain/turn-time.js';
import {
    isStateRevisionCurrentOrModelTaskRuntimeOnly,
} from '../domain/save-revision.js';
import {
    markCommittedMessageEventsKnownToPlayer,
} from '../presence-witness-contract.js';
import {
    getInteriorMount,
} from '../domain/interior-mount.js';
import {
    validatePostPlayerMovement,
} from '../domain/movement-post-settlement.js';
import {
    createPendingPostSettlement,
    findPendingPostSettlement,
    isPendingPostSettlementCurrent,
    isPendingPostSettlementTail,
} from '../domain/pending-post-settlement.js';

function capturePostTurnAppraisalGuard(
    state,
) {
    const boundary =
        state?.memoryDirector
            ?.pendingEventBoundary;
    return {
        timelineEpoch:
            String(
                state?.timelineEpoch ||
                '',
            ),
        stateRevision:
            Number(
                state?.stateRevision ||
                0,
            ),
        turn:
            Number(
                state?.turn?.count ||
                0,
            ),
        sceneId:
            String(
                state?.scene?.id ||
                '',
            ),
        clock:
            String(
                state?.clock ||
                '',
            ),
        boundaryId:
            String(
                boundary?.boundaryId ||
                boundary?.id ||
                '',
            ),
    };
}

function isPostTurnAppraisalGuardCurrent(
    state,
    guard,
) {
    const current =
        capturePostTurnAppraisalGuard(
            state,
        );
    return (
        current.timelineEpoch ===
            guard.timelineEpoch &&
        isStateRevisionCurrentOrModelTaskRuntimeOnly(
            state,
            guard.stateRevision,
        ) &&
        current.turn ===
            guard.turn &&
        current.sceneId ===
            guard.sceneId &&
        current.clock ===
            guard.clock &&
        current.boundaryId ===
            guard.boundaryId
    );
}

function collectActivationSchemaIds(
    retrieval,
    observerIds,
) {
    const capsules =
        retrieval
            ?.activationCapsules
            ?.byActorId ||
        {};
    return [
        ...new Set(
            observerIds.flatMap(observerId => {
                const capsule =
                    capsules[observerId];
                if (
                    capsule?.sealed !== true ||
                    capsule.scope !==
                        'observer' ||
                    capsule.observerId !==
                        observerId
                ) {
                    return [];
                }
                return (
                    capsule.expectations ||
                    []
                ).map(expectation =>
                    String(
                        expectation?.schemaId ||
                        '',
                    ).trim())
                    .filter(Boolean);
            }),
        ),
    ].sort().slice(0, 64);
}

export function createTurnWorkflow(ports) {
    const {
        admitCurrentLocationResidents,
        admitMentionedKnownActors,
        applyObservedActorUpdates,
        applyPresenceWitnessTransaction,
        applySystemPrompt,
        applyTurnTransaction,
        attachTurnDiagnostics =
        () => ({
            attached: false,
            removed: 0,
        }),
        beginTurnDiagnostics =
        () => null,
        buildActorMemoryKnowledgeSeeds =
        () => ({
            recordIds: [],
            retainedEventIdsByActorId:
                {},
        }),
        createPlayerMovementPreflight =
        () => null,
        buildLocalSemanticRoomContext,
        buildSceneTransaction,
        clearLiveSceneStream,
        composeSceneSegments,
        consumePacingBeat,
        createContextBudgetPlan,
        createSceneMomentumDirective,
        createTurnPerformanceBudget,
        createTurnRetryCheckpoint,
        restoreTurnRetryCheckpoint,
        enqueueCurrentTurnLocalizationCandidates =
        async () => ({
            started: false,
        }),
        ensureCurrentInteriorMap,
        assertWorldFoundationReady,
        ensurePacingDirectorAssessment,
        ensureSceneLifecycleState,
        ensureSocialDirectorForAction,
        ensureSocialDirectorCatchup,
        finalizeTurnDiagnostics =
        () => null,
        extractSpellCandidates =
        () => [],
        filterKnowledgeForAudience,
        findUnsettledTurn,
        generateScenePerformance,
        getActiveAddressingState,
        getContext,
        getFailedPlayerTurn,
        getLocalMapDefinition,
        getMudState,
        getInspectorMapScope,
        jobRegistry,
        normalizeEventKnowledge,
        parseItemOperationDirectives,
        parseSpellCastDirectives,
        partitionItemProposals,
        reconcileSpatialState,
        reconcileAuthoritativeSpellNarrative =
        transaction => ({
            transaction,
            corrections: [],
        }),
        reconcileTurnActorPresenceWithSpatialState,
        reconcileVisibleActorPresenceState,
        reduceLocalPresence,
        removeExplicitAddressDirective,
        removeSpellCastDirectives,
        renderAll,
        resetInspectorMapScope,
        requestLocalTurnAdjudication,
        requestLocalTurnAppraisals =
        async () => ({
            appraisalProposals: [],
            diagnostics: {
                called: false,
                fallback: false,
            },
        }),
        requestPostTurnSemanticObservation,
        recordTurnDiagnostic =
        () => {},
        runMediumCalendarDirectorSafely =
        async () => ({
            status: 'skipped',
        }),
        scheduleBackgroundEventBoundary =
        () => null,
        resolveActionCheck,
        resolveEventWitnesses,
        resolvePlayerAddressing,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        setLiveSceneStreamPhase,
        syncLocalKnowledge,
        updateNativeMessageBlock,
        validateTurnTransaction,
        discardTurnDiagnostics =
        () => {},
    } = ports;

    async function preservePendingPostSettlement({
        playerMessageId,
        sceneMessageId,
        sceneMessage,
        transaction,
        movementPreflight,
        preTurnCheckpoint,
        observation,
        failureCode,
        retryCount = 0,
        baseState = null,
    }) {
        const context = getContext();
        const state =
            baseState
                ? structuredClone(
                    baseState,
                )
                : getMudState();
        sceneMessage.extra ??= {};
        sceneMessage.extra.hogwartsMud ??= {};
        delete sceneMessage.extra
            .hogwartsMud
            .turnTransaction;
        sceneMessage.extra
            .hogwartsMud
            .pendingPostSettlement =
            createPendingPostSettlement({
                state,
                playerMessageId,
                sceneMessageId,
                transactionDraft:
                    transaction,
                movementPreflight,
                preTurnCheckpoint,
                provider:
                    observation?.observation
                        ?.diagnostics?.provider ||
                    state.postTurnSemanticProvider,
                failureCode,
                promptAssembly:
                    observation?.promptAssembly ||
                    observation?.observation
                        ?.diagnostics
                        ?.promptAssembly,
                retryCount,
            });
        state.turn ??= {};
        state.turn.status =
            'post_unsettled';
        state.turn.error = '';
        context.chatMetadata.hogwartsMud =
            state;
        await context.saveMetadata();
        sceneMessage.extra
            .hogwartsMud
            .pendingPostSettlement
            .stateRevision =
            Number(
                getMudState()
                    ?.stateRevision ||
                0,
            );
        await context.saveChat();
        renderAll();
        return sceneMessage.extra
            .hogwartsMud
            .pendingPostSettlement;
    }

    function integratePostObservation(
        transaction,
        observation,
        state,
        playerAction,
        playerMessageId,
        sceneMessageId,
        {
            movementPreflight = null,
            activationSchemaIds = [],
        } = {},
    ) {
        const movementValidation =
            validatePostPlayerMovement(
                movementPreflight,
                observation
                    .observation
                    ?.result
                    ?.playerMovement,
                transaction.segments,
            );
        if (!movementValidation.valid) {
            return {
                valid: false,
                failureCode:
                    'post_candidate_rejected',
            };
        }
        if (movementPreflight) {
            transaction.playerMovement =
                movementValidation.value;
        }
        transaction.materialEvents =
            observation.materialEvents;
        transaction.identityObservations =
            observation.identityObservations ||
            [];
        recordTurnDiagnostic(
            'temporal_claim_validation',
            {
                ...(
                    observation.temporalDiagnostics ||
                    {
                        valid: true,
                        accepted: 0,
                        rejected: 0,
                    }
                ),
                persisted: false,
            },
        );
        if (
            Number(
                observation
                    .temporalDiagnostics
                    ?.rejected ||
                0,
            ) > 0
        ) {
            transaction.settlementWarnings = [
                ...(
                    transaction
                        .settlementWarnings ||
                    []
                ),
                {
                    code:
                        'temporal_claim_rejected',
                    detail:
                        'Narrative remains visible; unsupported temporal claims did not affect clock or Calendar State.',
                },
            ].slice(-24);
        }
        const itemSourceEventId =
            `${
                state.scene?.id ||
                'scene'
            }_turn_${
                Number(
                    state.turn?.count ||
                    0,
                ) + 1
            }`;
        const itemOptions = {
            sourceEventId:
                itemSourceEventId,
            sourceMessageIds:
                playerMessageId >= 0
                    ? [playerMessageId]
                    : [],
            clock: state.clock,
            sourceTexts: [
                playerAction,
                observation.narrativeText,
            ],
        };
        const performanceItems =
            partitionItemProposals(
                transaction.itemUpdates ||
                [],
                state,
                {
                    ...itemOptions,
                    sourceRole: 'low',
                },
            );
        const observedItems =
            partitionItemProposals(
                observation.itemUpdates ||
                [],
                state,
                {
                    ...itemOptions,
                    sourceRole:
                        'local_observer',
                },
            );
        transaction.itemOperations = [
            ...new Map(
                [
                    ...performanceItems.operations,
                    ...observedItems.operations,
                ].map(proposal => [
                    proposal.key,
                    proposal,
                ]),
            ).values(),
        ];
        transaction.itemCandidates = [
            ...new Map(
                [
                    ...performanceItems.candidates,
                    ...observedItems.candidates,
                ].map(proposal => [
                    proposal.key,
                    proposal,
                ]),
            ).values(),
        ];
        transaction.itemUpdates = [];
        transaction.spellCandidates =
            extractSpellCandidates(
                transaction,
                state,
                {
                    ...itemOptions,
                    playerAction,
                },
            );
        transaction.materialExtraction = {
            schemaVersion: 1,
            source:
                'post_turn_semantic_provider',
            provider:
                observation.observation
                    ?.diagnostics?.provider ||
                'unknown',
            ...(
                observation.observation
                    ?.diagnostics ||
                {}
            ),
        };
        applyObservedActorUpdates(
            transaction,
            observation.observation,
            state,
            observation.narrativeText,
        );
        transaction =
            reconcileTurnActorPresenceWithSpatialState(
                transaction,
                state,
            );
        transaction.localPresence =
            reduceLocalPresence(
                state,
                {
                    actorUpdates:
                        transaction.actorUpdates,
                },
            );
        transaction.perception =
            observation.perception;
        const witnessResolution =
            resolveEventWitnesses({
                perception:
                    transaction.perception,
                localPresence:
                    transaction.localPresence,
                activeInteractionActorIds:
                    transaction.actorPresence
                        ?.presentActorIdsAfterTurn ||
                    [],
                targetActorIds:
                    observation.targetActorIds,
                actors:
                    state.actors ||
                    [],
                knownActorIds: (
                    state.actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
                spatialGraph:
                    buildLocalSemanticRoomContext(
                        state,
                    ),
            });
        if (witnessResolution) {
            transaction.participantActorIds =
                witnessResolution
                    .participantActorIds;
            transaction.witnessActorIds =
                witnessResolution
                    .witnessActorIds;
            transaction.witnessCohortIds =
                witnessResolution
                    .witnessCohortIds;
            transaction.witnessBasis =
                witnessResolution
                    .witnessBasis;
            const rawSceneId =
                String(
                    state.scene?.id ||
                    '',
                );
            const sceneId =
                /^[a-z][a-z0-9_]{0,79}$/u
                    .test(rawSceneId)
                    ? rawSceneId
                    : 'scene_current';
            transaction.eventKnowledge =
                normalizeEventKnowledge({
                    version: 2,
                    eventKind: 'observed',
                    sceneId,
                    clock:
                        transaction.committedClock ||
                        state.clock,
                    sourceMessageIds: [
                        ...(
                            playerMessageId >= 0
                                ? [playerMessageId]
                                : []
                        ),
                        sceneMessageId,
                    ],
                    summaryEn:
                        transaction.publicEventEn,
                    activationSchemaIds,
                    ...witnessResolution,
                    perception:
                        transaction.perception,
                    source:
                        transaction.perception
                            .source,
                }, {
                    actors:
                        state.actors ||
                        [],
                    knownActorIds: (
                        state.actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                    cohortIds:
                        transaction.localPresence
                            .cohortIds,
                    sourceTexts: [
                        playerAction,
                        observation.narrativeText,
                    ],
                });
        }
        return {
            valid: true,
            transaction,
        };
    }

    async function repairNarratedCurrentLocationResidents() {
        const context =
        getContext();
        const state =
        getMudState();
        const openingText =
        context.chat
            .filter(message =>
                message?.extra
                    ?.hogwartsMud
                    ?.role ===
                    'scene_opening' &&
                message.extra
                    .hogwartsMud
                    .sceneId ===
                    state.scene?.id)
            .map(message =>
                String(
                    message.mes ||
                    '',
                ))
            .join('\n')
            .toLocaleLowerCase();
        if (!openingText) {
            return;
        }
        const admission =
        admitCurrentLocationResidents(
            state,
            {
                activate: false,
            },
        );
        if (
            !admission
                .admittedActorIds
                .length
        ) {
            return;
        }
        const next =
        admission.state;
        const profileById =
        new Map(
            (
                next.actorLibrary ||
                []
            ).map(profile => [
                profile.id,
                profile,
            ]),
        );
        const activatedIds =
        new Set(
            admission
                .admittedActorIds
                .filter(actorId => {
                    const profile =
                        profileById.get(
                            actorId,
                        );
                    return [
                        profile
                            ?.nameEn,
                        ...(
                            profile
                                ?.aliases ||
                            []
                        ),
                    ]
                        .filter(Boolean)
                        .some(name =>
                            openingText
                                .includes(
                                    String(name)
                                        .toLocaleLowerCase(),
                                ));
                }),
        );
        if (!activatedIds.size) {
            return;
        }
        next.actors = (
            next.actors ||
        []
        ).map(actor =>
            activatedIds.has(
                actor.id,
            )
                ? {
                    ...actor,
                    present: true,
                }
                : actor);
        context.chatMetadata
            .hogwartsMud =
        next;
        await context.saveMetadata();
    }

    function buildNarrativeMessage(
        segments,
        state,
        existingMessage = null,
    ) {
        const renderableActors = [
            ...(state.actorLibrary || []),
            ...(state.actors || []),
        ];
        const messageText =
            composeSceneSegments(
                segments,
                renderableActors,
                'en',
            );
        const message = existingMessage || {
            name: 'Scene',
            is_user: false,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: messageText,
            extra: {},
        };
        message.name = 'Scene';
        message.mes = messageText;
        message.extra = message.extra && typeof message.extra === 'object' ? message.extra : {};
        message.extra.hogwartsMud = {
            ...message.extra.hogwartsMud,
            languageVersion: 1,
            role: 'scene_turn',
            sceneId: state.scene?.id,
            segments,
        };
        delete message.extra
            .hogwartsMud
            .turnTransaction;
        delete message.extra
            .display_text;
        return message;
    }

    function buildSceneMessage(
        transaction,
        state,
        existingMessage = null,
    ) {
        const message =
            buildNarrativeMessage(
                transaction.segments,
                state,
                existingMessage,
            );
        message.extra.hogwartsMud
            .turnTransaction =
        transaction;
        return message;
    }

    async function runStructuredTurn(
        playerAction,
        assistantMessageId = null,
        forceCheck = false,
    ) {
        const jobKey = assistantMessageId ?? 'new-turn';
        const existingJob = jobRegistry.turnSettlement.get(jobKey);
        if (existingJob) {
            return existingJob;
        }
        const context = getContext();
        if (!playerAction ||
        getMudState()?.phase !== 'playing' ||
        jobRegistry.sceneTransitionActive ||
        getMudState()?.sceneTransition?.status === 'resolving') {
            return;
        }

        const job = (async () => {
            jobRegistry.turnActive = true;
            const turnStartedAt =
                Date.now();
            let state = getMudState();
            const modelTaskActionId = [
                'turn',
                state.timelineEpoch ||
                    'stable_epoch',
                Number(
                    state.turn?.count ||
                    0,
                ) + 1,
                assistantMessageId ??
                    context.chat.length,
            ].join(':');
            beginModelTaskAction(
                state,
                modelTaskActionId,
            );
            beginTurnDiagnostics({
                playerAction,
                sceneId:
                    state.scene?.id,
                turnCount:
                    state.turn?.count,
                assistantMessageId,
            });
            let playerMessage = null;
            let spellCasts = [];
            let addressing = null;
            let narrativeMessageId =
                assistantMessageId;
            let narrativeMessage =
                assistantMessageId ===
                    null
                    ? null
                    : context.chat[
                        assistantMessageId
                    ] ||
                    null;
            let narrativePlayerAction =
                playerAction;
            let itemDirectiveResult = {
                directives: [],
                errors: [],
            };
            let postSettlementStarted = false;
            let postSettlementCommitted = false;
            let postSettlementDraft = null;
            let postSettlementBaseState = null;
            let postSettlementPlayerMessageId = -1;
            let postSettlementMovementPreflight = null;
            let postSettlementRollbackCheckpoint = null;
            try {
                playerMessage = assistantMessageId === null
                    ? [...context.chat].reverse().find(message =>
                        message.is_user &&
                    message.mes === playerAction)
                    : context.chat
                        .slice(0, assistantMessageId)
                        .reverse()
                        .find(message => message.is_user);
                itemDirectiveResult =
                parseItemOperationDirectives(
                    playerAction,
                    (
                        state.items ||
                        []
                    ).filter(item =>
                        item.visibility !==
                            'hidden'),
                );
                spellCasts =
                parseSpellCastDirectives(
                    playerAction,
                    state,
                );
                addressing =
                resolvePlayerAddressing(
                    getActiveAddressingState(
                        state,
                    ),
                    playerAction,
                );
                narrativePlayerAction =
                removeSpellCastDirectives(
                    removeExplicitAddressDirective(
                        playerAction,
                    ),
                );
                if (!addressing.valid) {
                    throw new Error(
                        addressing.error,
                    );
                }
                state.turn ??= {};
                state.turn.status = 'resolving';
                state.turn.error = '';
                await context.saveMetadata();
                renderAll();
                recordTurnDiagnostic(
                    'player_message',
                    {
                        requestedPlayerAction:
                            playerAction,
                        storedPlayerMessage:
                            String(
                                playerMessage
                                    ?.mes ||
                                '',
                            ),
                        matched:
                            playerMessage
                                ?.mes ===
                            playerAction,
                        assistantMessageId,
                    },
                );
                const storedAddressing =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.addressing;
                if (
                    storedAddressing
                        ?.valid === true &&
                storedAddressing
                    ?.attempted === true
                ) {
                    addressing =
                    structuredClone(
                        storedAddressing,
                    );
                }
                if (
                    playerMessage?.extra
                        ?.hogwartsMud
                ) {
                    playerMessage.extra
                        .hogwartsMud
                        .addressing =
                    structuredClone(
                        addressing,
                    );
                    playerMessage.extra
                        .hogwartsMud
                        .itemDirectives =
                    structuredClone(
                        itemDirectiveResult
                            .directives,
                    );
                    playerMessage.extra
                        .hogwartsMud
                        .itemDirectiveErrors =
                    structuredClone(
                        itemDirectiveResult
                            .errors,
                    );
                    await context.saveChat();
                }
                const storedSpellCasts =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.spellCasts;
                if (
                    Array.isArray(
                        storedSpellCasts,
                    ) &&
                storedSpellCasts.length
                ) {
                    spellCasts =
                    structuredClone(
                        storedSpellCasts,
                    );
                } else if (
                    spellCasts.length &&
                playerMessage?.extra
                    ?.hogwartsMud
                ) {
                    playerMessage.extra
                        .hogwartsMud
                        .spellCasts =
                    structuredClone(
                        spellCasts,
                    );
                    await context.saveChat();
                }
                assertWorldFoundationReady(
                    state,
                );
                state = getMudState();
                const playerMessageId =
                context.chat.indexOf(
                    playerMessage,
                );
                postSettlementPlayerMessageId =
                    playerMessageId;
                const rollbackCheckpoint =
                playerMessageId >= 0
                    ? createTurnRetryCheckpoint(
                        state,
                        {
                            playerMessageId,
                            assistantMessageId:
                                assistantMessageId ??
                                context.chat
                                    .length,
                            playerAction,
                            forceCheck,
                        },
                    )
                    : null;
                postSettlementRollbackCheckpoint =
                    rollbackCheckpoint;
                const movementPreflight =
                    createPlayerMovementPreflight(
                        state,
                        narrativePlayerAction,
                        context.chat,
                    );
                postSettlementMovementPreflight =
                    movementPreflight;
                const storedMentionedActors =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.mentionedKnownActors;
                const mentionedAdmission =
                admitMentionedKnownActors(
                    state,
                    narrativePlayerAction,
                );
                const mentionedKnownActors =
                mentionedAdmission
                    .admittedActors.length
                    ? mentionedAdmission
                        .admittedActors
                    : Array.isArray(
                        storedMentionedActors,
                    )
                        ? structuredClone(
                            storedMentionedActors,
                        )
                        : [];
                if (
                    mentionedAdmission
                        .admittedActors.length
                ) {
                    context.chatMetadata
                        .hogwartsMud =
                    mentionedAdmission.state;
                    state = getMudState();
                    if (
                        playerMessage?.extra
                            ?.hogwartsMud
                    ) {
                        playerMessage.extra
                            .hogwartsMud
                            .mentionedKnownActors =
                        structuredClone(
                            mentionedKnownActors,
                        );
                        await context.saveChat();
                    }
                    await context.saveMetadata();
                    applySystemPrompt();
                    renderAll();
                }
                await ensurePacingDirectorAssessment(
                    narrativePlayerAction,
                    addressing,
                    playerAction,
                );
                state = getMudState();
                const forceCheckRequested =
                forceCheck ||
                spellCasts.length >
                    0 ||
                Boolean(
                    playerMessage?.extra
                        ?.hogwartsMud
                        ?.requiresCheck,
                );
                const existingAdjudication =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.localAdjudication;
                const localAdjudication =
                existingAdjudication ||
                await requestLocalTurnAdjudication(
                    state,
                    playerAction,
                    addressing,
                    forceCheckRequested,
                );
                if (
                    movementPreflight &&
                    playerMessage?.extra
                        ?.hogwartsMud
                ) {
                    playerMessage.extra
                        .hogwartsMud
                        .movementPreflight =
                        structuredClone(
                            movementPreflight,
                        );
                    await context.saveChat();
                }
                if (
                    !existingAdjudication &&
                playerMessage?.extra
                    ?.hogwartsMud
                ) {
                    playerMessage.extra
                        .hogwartsMud
                        .localAdjudication =
                    structuredClone(
                        localAdjudication,
                    );
                    await context.saveChat();
                }
                const existingCheck =
                playerMessage?.extra?.hogwartsMud
                    ?.checkResolution;
                const checkResolution = existingCheck ||
                resolveActionCheck(
                    state,
                    narrativePlayerAction,
                    {
                        forced:
                            forceCheckRequested,
                        semanticCheck:
                            localAdjudication
                                .result
                                .check,
                        sourceMessageId:
                            playerMessageId,
                        spellCast:
                            spellCasts[0] ||
                            null,
                    },
                );
                if (checkResolution &&
                !existingCheck &&
                playerMessage?.extra?.hogwartsMud) {
                    playerMessage.extra.hogwartsMud
                        .checkResolution =
                    structuredClone(checkResolution);
                    await context.saveChat();
                }
                const slots = resolveRoleSlots(state.modelSlots);
                const contextPlan =
                createContextBudgetPlan(
                    slots.low.contextSize,
                    slots.low.maxResponseLength,
                );
                const knowledgeAudienceActorIds =
                [
                    ...new Set([
                        ...(state.actors || [])
                            .filter(actor =>
                                actor.present !==
                                    false)
                            .map(actor =>
                                actor.id),
                        ...(
                            addressing
                                ?.actorIds ||
                            []
                        ),
                    ].filter(Boolean)),
                ];
                const memoryKnowledgeSeeds =
                    buildActorMemoryKnowledgeSeeds(
                        state,
                        knowledgeAudienceActorIds,
                        contextPlan,
                    );
                const entityIds = [
                    state.scene?.id,
                    state.map?.currentLocalNodeId,
                    ...(
                        memoryKnowledgeSeeds
                            .recordIds ||
                        []
                    ),
                ].filter(Boolean);
                let retrievedKnowledge = await retrieveLocalKnowledge(
                    narrativePlayerAction,
                    entityIds,
                    {
                        audienceActorIds:
                            knowledgeAudienceActorIds,
                        seedRecordIds:
                            memoryKnowledgeSeeds
                                .recordIds ||
                            [],
                        retainedEventIdsByActorId:
                            memoryKnowledgeSeeds
                                .retainedEventIdsByActorId ||
                            {},
                        limit:
                        contextPlan
                            .ragLimit *
                        3,
                    },
                );
                const retrievalMetadata = {
                    activationCapsules:
                        retrievedKnowledge
                            .activationCapsules,
                    retainedEventIdsByActorId:
                        retrievedKnowledge
                            .retainedEventIdsByActorId,
                    diagnostics:
                        retrievedKnowledge
                            .diagnostics,
                };
                const filteredKnowledge =
                filterKnowledgeForAudience(
                    retrievedKnowledge,
                    {
                        actorIds:
                            knowledgeAudienceActorIds,
                    },
                ).slice(
                    0,
                    contextPlan.ragLimit,
                );
                filteredKnowledge
                    .activationCapsules =
                retrievalMetadata
                    .activationCapsules;
                filteredKnowledge
                    .retainedEventIdsByActorId =
                retrievalMetadata
                    .retainedEventIdsByActorId;
                filteredKnowledge.diagnostics =
                retrievalMetadata.diagnostics;
                retrievedKnowledge =
                filteredKnowledge;
                const budget = createTurnPerformanceBudget(
                    narrativePlayerAction,
                    getDeterministicTimePolicy(),
                    {
                        activeNamedActorCount:
                        knowledgeAudienceActorIds
                            .length,
                        adjudicatedMinutes:
                        localAdjudication
                            .result
                            .temporal
                            .elapsedMinutes,
                    },
                );
                const momentumDirective =
                createSceneMomentumDirective(
                    state,
                    budget,
                );
                recordTurnDiagnostic(
                    'workflow_input',
                    {
                        playerAction:
                            narrativePlayerAction,
                        playerMessage:
                            String(
                                playerMessage
                                    ?.mes ||
                                '',
                            ),
                        budget,
                        momentumDirective,
                        addressing,
                        contextPlan,
                        turnCount:
                            state.turn?.count,
                        sceneId:
                            state.scene?.id,
                    },
                );
                const performance = await generateScenePerformance(
                    slots.low,
                    state,
                    narrativePlayerAction,
                    budget,
                    retrievedKnowledge,
                    movementPreflight,
                    momentumDirective,
                    checkResolution,
                    addressing,
                    mentionedKnownActors,
                    contextPlan,
                );
                narrativeMessage =
                buildNarrativeMessage(
                    performance.segments,
                    state,
                    narrativeMessage,
                );
                if (
                    narrativeMessageId ===
                    null
                ) {
                    context.chat.push(
                        narrativeMessage,
                    );
                    narrativeMessageId =
                    context.chat.length -
                    1;
                }
                await context.saveChat();
                updateNativeMessageBlock(
                    narrativeMessageId,
                    narrativeMessage,
                );
                renderAll();
                setLiveSceneStreamPhase(
                    'committing',
                    performance.segments,
                );
                const currentTurnLocalizationCandidates =
                    (
                        performance
                            .segments ||
                        []
                    ).map((
                        segment,
                        index,
                    ) => ({
                        recordKind:
                            'message_segment',
                        recordId:
                            `message:${narrativeMessageId}:segment:${index}`,
                        fieldPath:
                            'textEn',
                        sourceText:
                            segment
                                .textEn ||
                            '',
                        priority: 0,
                        changedAt:
                            Date.now(),
                    }));
                recordTurnDiagnostic(
                    'narrative_visible',
                    {
                        elapsedMs:
                            Math.max(
                                0,
                                Date.now() -
                                    turnStartedAt,
                            ),
                        surface:
                            'chat_message',
                        segmentCount:
                            performance.segments
                                ?.length ||
                            0,
                        messageId:
                            narrativeMessageId,
                    },
                );
                let transaction = buildSceneTransaction(
                    performance,
                    budget,
                    state.pacingDirector?.pendingBeat?.status === 'pending'
                        ? state.pacingDirector.pendingBeat
                        : null,
                    checkResolution,
                    movementPreflight,
                );
                const spellReconciliation =
                reconcileAuthoritativeSpellNarrative(
                    transaction,
                    state,
                );
                transaction =
                spellReconciliation
                    .transaction;
                if (
                    spellReconciliation
                        .corrections
                        .length
                ) {
                    recordTurnDiagnostic(
                        'spell_authority_reconciliation',
                        {
                            corrections:
                                spellReconciliation
                                    .corrections,
                        },
                    );
                }
                transaction.spellCasts =
                structuredClone(
                    spellCasts,
                );
                const validation = validateTurnTransaction(transaction, state);
                if (!validation.valid) {
                    throw new Error(`合并后的回合事务无效：${validation.errors.join('；')}`);
                }
                postSettlementStarted = true;
                postSettlementDraft =
                    structuredClone(
                        transaction,
                    );
                postSettlementBaseState =
                    structuredClone(
                        getMudState(),
                    );
                const postObservationPromise =
                    requestPostTurnSemanticObservation(
                        state,
                        narrativePlayerAction,
                        transaction,
                        {
                            addressing,
                        },
                    );
                void postObservationPromise
                    .catch(() => {
                        // The original promise is awaited below after P0 dispatch.
                    });
                const currentTurnLocalizationStart =
                    enqueueCurrentTurnLocalizationCandidates(
                        currentTurnLocalizationCandidates,
                        {
                            turnJobKey:
                                jobKey,
                        },
                    ).catch(error => {
                        console.warn(
                            '[Hogwarts MUD] Current-turn localization dispatch failed',
                            error,
                        );
                        return {
                            started: false,
                            errorCode:
                                String(
                                    error
                                        ?.code ||
                                    'P0_DISPATCH_FAILED',
                                ),
                        };
                    });
                const currentTurnLocalization =
                    await currentTurnLocalizationStart;
                const localObservation =
                    await postObservationPromise;
                if (
                    currentTurnLocalization
                        ?.completion
                ) {
                    await currentTurnLocalization
                        .completion
                        .catch(error => {
                            console.warn(
                                '[Hogwarts MUD] Current-turn localization failed',
                                error,
                            );
                        });
                }
                const movementValidation =
                    validatePostPlayerMovement(
                        movementPreflight,
                        localObservation
                            .observation
                            ?.result
                            ?.playerMovement,
                        transaction.segments,
                    );
                if (
                    localObservation
                        .postSettlementFailure ||
                    !movementValidation.valid
                ) {
                    await preservePendingPostSettlement({
                        playerMessageId,
                        sceneMessageId:
                            narrativeMessageId,
                        sceneMessage:
                            narrativeMessage,
                        transaction,
                        movementPreflight,
                        preTurnCheckpoint:
                            rollbackCheckpoint,
                        observation:
                            localObservation,
                        failureCode:
                            localObservation
                                .postSettlementFailure
                                ? localObservation
                                    .failureCode ||
                                    'post_provider_failed'
                                : 'post_candidate_rejected',
                    });
                    return;
                }
                if (movementPreflight) {
                    transaction.playerMovement =
                        movementValidation.value;
                }
                transaction.materialEvents =
                localObservation
                    .materialEvents;
                transaction
                    .identityObservations =
                localObservation
                    .identityObservations ||
                [];
                recordTurnDiagnostic(
                    'temporal_claim_validation',
                    {
                        ...(
                            localObservation
                                .temporalDiagnostics ||
                            {
                                valid: true,
                                accepted: 0,
                                rejected: 0,
                            }
                        ),
                        persisted:
                            false,
                    },
                );
                if (
                    Number(
                        localObservation
                            .temporalDiagnostics
                            ?.rejected ||
                        0,
                    ) > 0
                ) {
                    transaction
                        .settlementWarnings = [
                            ...(
                                transaction
                                    .settlementWarnings ||
                            []
                            ),
                            {
                                code:
                                'temporal_claim_rejected',
                                detail:
                                'Narrative remains visible; unsupported temporal claims did not affect clock or Calendar State.',
                            },
                        ].slice(-24);
                }
                const itemSourceEventId =
                    `${
                        state.scene?.id ||
                        'scene'
                    }_turn_${
                        Number(
                            state.turn
                                ?.count ||
                            0,
                        ) + 1
                    }`;
                const performanceItems =
                    partitionItemProposals(
                        transaction
                            .itemUpdates ||
                        [],
                        state,
                        {
                            sourceRole:
                                'low',
                            sourceEventId:
                                itemSourceEventId,
                            sourceMessageIds:
                                playerMessageId >=
                                    0
                                    ? [
                                        playerMessageId,
                                    ]
                                    : [],
                            clock:
                                state.clock,
                            sourceTexts: [
                                narrativePlayerAction,
                                localObservation
                                    .narrativeText,
                            ],
                        },
                    );
                const observedItems =
                    partitionItemProposals(
                        localObservation
                            .itemUpdates ||
                        [],
                        state,
                        {
                            sourceRole:
                                'local_observer',
                            sourceEventId:
                                itemSourceEventId,
                            sourceMessageIds:
                                playerMessageId >=
                                    0
                                    ? [
                                        playerMessageId,
                                    ]
                                    : [],
                            clock:
                                state.clock,
                            sourceTexts: [
                                narrativePlayerAction,
                                localObservation
                                    .narrativeText,
                            ],
                        },
                    );
                transaction.itemOperations = [
                    ...new Map(
                        [
                            ...performanceItems
                                .operations,
                            ...observedItems
                                .operations,
                        ].map(proposal => [
                            proposal.key,
                            proposal,
                        ]),
                    ).values(),
                ];
                transaction.itemCandidates = [
                    ...new Map(
                        [
                            ...performanceItems
                                .candidates,
                            ...observedItems
                                .candidates,
                        ].map(proposal => [
                            proposal.key,
                            proposal,
                        ]),
                    ).values(),
                ];
                transaction.itemUpdates = [];
                transaction.spellCandidates =
                extractSpellCandidates(
                    transaction,
                    state,
                    {
                        sourceEventId:
                            itemSourceEventId,
                        sourceMessageIds:
                            playerMessageId >=
                                0
                                ? [
                                    playerMessageId,
                                ]
                                : [],
                        clock:
                            state.clock,
                        playerAction:
                            narrativePlayerAction,
                    },
                );
                transaction.materialExtraction = {
                    schemaVersion: 1,
                    source:
                    'post_turn_semantic_provider',
                    provider:
                    localObservation
                        .observation
                        ?.diagnostics
                        ?.provider ||
                    'unknown',
                    ...(
                        localObservation
                            .observation
                            .diagnostics ||
                    {}
                    ),
                };
                applyObservedActorUpdates(
                    transaction,
                    localObservation
                        .observation,
                    state,
                    localObservation
                        .narrativeText,
                );
                transaction =
                reconcileTurnActorPresenceWithSpatialState(
                    transaction,
                    state,
                );
                transaction.localPresence =
                reduceLocalPresence(
                    state,
                    {
                        actorUpdates:
                            transaction
                                .actorUpdates,
                    },
                );
                transaction.perception =
                localObservation
                    .perception;
                const witnessResolution =
                resolveEventWitnesses({
                    perception:
                        transaction
                            .perception,
                    localPresence:
                        transaction
                            .localPresence,
                    activeInteractionActorIds:
                        transaction
                            .actorPresence
                            ?.presentActorIdsAfterTurn ||
                        [],
                    targetActorIds:
                        localObservation
                            .targetActorIds,
                    actors:
                        state.actors ||
                        [],
                    knownActorIds: (
                        state
                            .actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                    spatialGraph:
                        buildLocalSemanticRoomContext(
                            state,
                        ),
                });
                if (witnessResolution) {
                    transaction
                        .participantActorIds =
                    witnessResolution
                        .participantActorIds;
                    transaction
                        .witnessActorIds =
                    witnessResolution
                        .witnessActorIds;
                    transaction
                        .witnessCohortIds =
                    witnessResolution
                        .witnessCohortIds;
                    transaction
                        .witnessBasis =
                    witnessResolution
                        .witnessBasis;
                    const rawSceneId =
                    String(
                        state.scene?.id ||
                        '',
                    );
                    const sceneId =
                    /^[a-z][a-z0-9_]{0,79}$/u
                        .test(rawSceneId)
                        ? rawSceneId
                        : 'scene_current';
                    const activationSchemaIds =
                        collectActivationSchemaIds(
                            retrievedKnowledge,
                            [
                                ...witnessResolution
                                    .participantActorIds,
                                ...witnessResolution
                                    .witnessActorIds,
                            ],
                        );
                    transaction
                        .eventKnowledge =
                    normalizeEventKnowledge({
                        version: 2,
                        eventKind:
                            'observed',
                        sceneId,
                        clock:
                            transaction
                                .committedClock ||
                            state.clock,
                        sourceMessageIds: [
                            ...(
                                playerMessageId >=
                                    0
                                    ? [
                                        playerMessageId,
                                    ]
                                    : []
                            ),
                            narrativeMessageId,
                        ],
                        summaryEn:
                            transaction
                                .publicEventEn,
                        activationSchemaIds,
                        ...witnessResolution,
                        perception:
                            transaction
                                .perception,
                        source:
                            transaction
                                .perception
                                .source,
                    }, {
                        actors:
                            state.actors ||
                            [],
                        knownActorIds: (
                            state
                                .actorLibrary ||
                            []
                        ).map(actor =>
                            actor.id),
                        cohortIds:
                            transaction
                                .localPresence
                                .cohortIds,
                        sourceTexts: [
                            narrativePlayerAction,
                            localObservation
                                .narrativeText,
                        ],
                    });
                }
                if (
                    localAdjudication
                        .diagnostics
                        ?.fallback ||
                localObservation
                    .observation
                    .diagnostics
                    ?.fallback ||
                localObservation
                    .observation
                    .diagnostics
                    ?.perceptionFallback
                ) {
                    transaction.settlementWarnings = [
                        ...(
                            transaction
                                .settlementWarnings ||
                        []
                        ),
                        {
                            code:
                            'local_semantic_fallback',
                            detail:
                            'Narrative committed with conservative local semantic defaults.',
                        },
                    ].slice(-24);
                }
                setLiveSceneStreamPhase(
                    'committing',
                    [],
                );
                state = getMudState();
                const timelineSourceMessageId =
                    narrativeMessageId;
                let nextState = applyTurnTransaction(
                    state,
                    transaction,
                    narrativePlayerAction,
                    {
                        sourceMessageId:
                            timelineSourceMessageId,
                    },
                );
                if (
                    transaction
                        .movementOutcome
                        ?.moved ===
                    true
                ) {
                    transaction =
                    reconcileTurnActorPresenceWithSpatialState(
                        transaction,
                        nextState,
                    );
                    transaction.localPresence =
                    reduceLocalPresence(
                        nextState,
                        {
                            actorUpdates:
                                transaction
                                    .actorUpdates,
                        },
                    );
                }
                nextState =
                applyPresenceWitnessTransaction(
                    nextState,
                    transaction,
                );
                nextState = consumePacingBeat(nextState);
                if (transaction.eventKnowledge) {
                    const appraisalGuard =
                        capturePostTurnAppraisalGuard(
                            state,
                        );
                    let appraisalBatch;
                    try {
                        appraisalBatch =
                            await requestLocalTurnAppraisals(
                                nextState,
                                transaction
                                    .eventKnowledge,
                            );
                        if (
                            appraisalBatch
                                ?.diagnostics
                                ?.called
                        ) {
                            recordTurnDiagnostic(
                                'local_call',
                                {
                                    operation:
                                        'appraisal_batch',
                                },
                            );
                        }
                    } catch (error) {
                        recordTurnDiagnostic(
                            'local_call',
                            {
                                operation:
                                    'appraisal_batch',
                            },
                        );
                        appraisalBatch = {
                            appraisalProposals:
                                [],
                            diagnostics: {
                                called: true,
                                fallback: true,
                                error:
                                    String(
                                        error
                                            ?.message ||
                                        error,
                                    ).slice(
                                        0,
                                        500,
                                    ),
                            },
                        };
                    }
                    if (
                        !isPostTurnAppraisalGuardCurrent(
                            getMudState(),
                            appraisalGuard,
                        )
                    ) {
                        recordTurnDiagnostic(
                            'appraisal_proposal_validation',
                            {
                                proposed:
                                    appraisalBatch
                                        ?.appraisalProposals
                                        ?.length ||
                                    0,
                                accepted: 0,
                                rejected:
                                    appraisalBatch
                                        ?.appraisalProposals
                                        ?.length ||
                                    0,
                                reasons: [{
                                    code:
                                        'stale_revision_or_boundary',
                                    count:
                                        appraisalBatch
                                            ?.appraisalProposals
                                            ?.length ||
                                        1,
                                }],
                                stale: true,
                            },
                        );
                        throw new Error(
                            'Rejected stale post-turn Appraisal result.',
                        );
                    }
                    const appraisalResult =
                        reduceAppraisalProposals(
                            nextState,
                            appraisalBatch
                                ?.appraisalProposals ||
                            [],
                        );
                    nextState =
                        appraisalResult.state;
                    recordTurnDiagnostic(
                        'appraisal_proposal_validation',
                        {
                            ...appraisalResult
                                .summary,
                            fallback:
                                appraisalBatch
                                    ?.diagnostics
                                    ?.fallback ===
                                true,
                            outcomes:
                                appraisalResult
                                    .outcomes,
                        },
                    );
                }
                const liveModelTaskRuntime =
                    getMudState()
                        ?.modelTaskRuntime;
                if (liveModelTaskRuntime) {
                    nextState
                        .modelTaskRuntime =
                    structuredClone(
                        liveModelTaskRuntime,
                    );
                }
                if (rollbackCheckpoint) {
                    nextState.turnRetry =
                    rollbackCheckpoint;
                }
                context.chatMetadata.hogwartsMud = nextState;
                state = getMudState();
                transaction.committedClock = state.clock;
                const message =
                buildSceneMessage(
                    transaction,
                    state,
                    narrativeMessage,
                );
                const messageId =
                    narrativeMessageId;
                if (
                    playerMessage?.extra
                        ?.hogwartsMud
                ) {
                    delete playerMessage
                        .extra
                        .hogwartsMud
                        .movementPreflight;
                }
                recordTurnDiagnostic(
                    'commit',
                    {
                        messageId,
                        committedClock:
                            transaction
                                .committedClock,
                        elapsedMinutes:
                            transaction
                                .elapsedMinutes,
                        segmentCount:
                            transaction
                                .segments
                                ?.length ||
                            0,
                        wordCount:
                            (
                                transaction
                                    .segments ||
                                []
                            )
                                .map(segment =>
                                    String(
                                        segment
                                            ?.textEn ||
                                        '',
                                    ).trim())
                                .filter(Boolean)
                                .join(' ')
                                .split(/\s+/)
                                .filter(Boolean)
                                .length,
                        settlementSource:
                            transaction
                                .settlementSource,
                        settlementWarnings:
                            transaction
                                .settlementWarnings ||
                            [],
                    },
                );
                await context.saveMetadata();
                await context.saveChat();
                postSettlementCommitted = true;
                if (
                    transaction
                        .eventKnowledge
                        ?.eventId
                ) {
                    context.chatMetadata
                        .hogwartsMud =
                        markCommittedMessageEventsKnownToPlayer(
                            getMudState(),
                            message,
                            messageId,
                            [
                                transaction
                                    .eventKnowledge
                                    .eventId,
                            ],
                        );
                    state = getMudState();
                    await context.saveMetadata();
                }
                await syncLocalKnowledge();
                applySystemPrompt();
                updateNativeMessageBlock(messageId, message);
                renderAll();
                const calendarCommitment =
                    localAdjudication
                        .result
                        .calendarCommitment;
                if (
                    calendarCommitment
                        ?.requested ===
                    true
                ) {
                    const calendarResult =
                        await runMediumCalendarDirectorSafely({
                            playerAction,
                            calendarCommitment,
                        });
                    recordTurnDiagnostic(
                        'calendar_commitment_settlement',
                        {
                            requested: true,
                            status:
                                String(
                                    calendarResult
                                        ?.status ||
                                    'failed',
                                ),
                            stateWritten:
                                calendarResult
                                    ?.status ===
                                'committed',
                        },
                    );
                    state = getMudState();
                }
                await ensureSocialDirectorForAction();
                await context.saveChat();
                state = getMudState();
                recordTurnDiagnostic(
                    'state_settled',
                    {
                        elapsedMs:
                            Math.max(
                                0,
                                Date.now() -
                                    turnStartedAt,
                            ),
                        stateRevision:
                            Number(
                                state
                                    .stateRevision ||
                                0,
                            ),
                        turnCount:
                            Number(
                                state
                                    .turn
                                    ?.count ||
                                0,
                            ),
                        scope:
                            'persistent_turn_and_immediate_followups',
                        messageId,
                    },
                );
                const completedDiagnostics =
                    finalizeTurnDiagnostics(
                        'committed',
                        {
                            messageId,
                            committedClock:
                                transaction
                                    .committedClock,
                        },
                    );
                attachTurnDiagnostics(
                    context.chat,
                    message,
                    completedDiagnostics,
                );
                await context.saveChat();
                scheduleBackgroundEventBoundary();
            } catch (error) {
                const errorText =
                    String(
                        error?.cause
                            ?.message ||
                        error?.message ||
                        error,
                    );
                if (
                    postSettlementStarted &&
                    !postSettlementCommitted &&
                    narrativeMessage &&
                    postSettlementDraft &&
                    postSettlementPlayerMessageId >=
                        0 &&
                    narrativeMessageId !==
                        null
                ) {
                    await preservePendingPostSettlement({
                        playerMessageId:
                            postSettlementPlayerMessageId,
                        sceneMessageId:
                            narrativeMessageId,
                        sceneMessage:
                            narrativeMessage,
                        transaction:
                            postSettlementDraft,
                        movementPreflight:
                            postSettlementMovementPreflight,
                        preTurnCheckpoint:
                            postSettlementRollbackCheckpoint,
                        failureCode:
                            'post_guard_failed',
                        baseState:
                            postSettlementBaseState,
                    });
                    return;
                }
                if (postSettlementCommitted) {
                    console.error(
                        '[Hogwarts MUD] Post-commit follow-up failed',
                        error,
                    );
                    throw error;
                }
                recordTurnDiagnostic(
                    'turn_error',
                    {
                        error:
                            errorText,
                    },
                );
                const failedDiagnostics =
                    finalizeTurnDiagnostics(
                        'failed',
                        {
                            error:
                                errorText,
                        },
                    );
                if (playerMessage) {
                    attachTurnDiagnostics(
                        context.chat,
                        playerMessage,
                        failedDiagnostics,
                    );
                }
                if (
                    narrativeMessageId !==
                    null &&
                    narrativeMessage
                ) {
                    attachTurnDiagnostics(
                        context.chat,
                        narrativeMessage,
                        failedDiagnostics,
                    );
                }
                state = getMudState();
                state.turn ??= {};
                state.turn.status = 'failed';
                state.turn.error =
                    errorText;
                await context.saveMetadata();
                if (
                    playerMessage ||
                    narrativeMessage
                ) {
                    await context.saveChat();
                }
                renderAll();
                throw error;
            } finally {
                const currentState =
                    getMudState();
                if (currentState) {
                    endModelTaskAction(
                        currentState,
                        modelTaskActionId,
                    );
                    await context
                        .saveMetadata();
                }
                discardTurnDiagnostics();
                jobRegistry.turnActive = false;
                clearLiveSceneStream();
                jobRegistry.turnSettlement.delete(jobKey);
                renderAll();
            }
        })();
        jobRegistry.turnSettlement.set(jobKey, job);
        return job;
    }

    async function retryFailedPlayerTurn() {
        const context = getContext();
        const failedTurn =
        getFailedPlayerTurn(
            context.chat,
            getMudState()?.turn,
        );
        if (!failedTurn) {
            toastr.info(
                '当前没有待重试的玩家回合。',
            );
            renderAll();
            return;
        }
        if (
            jobRegistry.turnActive ||
        jobRegistry.sceneTransitionActive
        ) {
            toastr.warning(
                '世界状态仍在结算，请稍候。',
            );
            return;
        }
        try {
            await runStructuredTurn(
                failedTurn.playerAction,
                null,
                failedTurn.forceCheck,
            );
        } catch (error) {
            toastr.error(
                String(
                    error?.cause?.message ||
                error?.message ||
                error,
                ),
            );
        }
    }

    async function retryPendingPostSettlement() {
        const context = getContext();
        let state = getMudState();
        const retrySaved =
            findPendingPostSettlement(
                context.chat,
            );
        if (
            state?.turn?.status !==
            'post_unsettled'
        ) {
            return;
        }
        if (
            jobRegistry.turnActive ||
            jobRegistry.sceneTransitionActive
        ) {
            throw new Error(
                'The world is still settling.',
            );
        }
        const saved = retrySaved;
        const sceneMessageId =
            saved?.sceneMessageId;
        const sceneMessage =
            saved?.sceneMessage;
        const pending =
            saved?.pending;
        if (
            !pending ||
            pending.retryable !== true ||
            !isPendingPostSettlementCurrent(
                state,
                pending,
            ) ||
            !isPendingPostSettlementTail(
                context.chat,
                pending,
            )
        ) {
            throw new Error(
                'The saved Scene can no longer be settled against this timeline.',
            );
        }
        const playerMessage =
            context.chat[
                pending.playerMessageId
            ];
        if (
            playerMessage?.is_user !==
            true ||
            !pending.transactionDraft
        ) {
            throw new Error(
                'The saved Post settlement is incomplete.',
            );
        }
        let transaction =
            structuredClone(
                pending.transactionDraft,
            );
        jobRegistry.turnActive = true;
        state.turn.status = 'resolving';
        state.turn.error = '';
        context.chatMetadata.hogwartsMud =
            state;
        await context.saveMetadata();
        state = getMudState();
        renderAll();
        let committed = false;
        try {
            const observation =
                await requestPostTurnSemanticObservation(
                    state,
                    String(
                        playerMessage.mes ||
                        '',
                    ),
                    transaction,
                    {
                        addressing:
                            playerMessage.extra
                                ?.hogwartsMud
                                ?.addressing ||
                            {},
                        settlementOnly: true,
                    },
                );
            if (
                observation
                    .postSettlementFailure
            ) {
                await preservePendingPostSettlement({
                    playerMessageId:
                        pending.playerMessageId,
                    sceneMessageId,
                    sceneMessage,
                    transaction,
                    movementPreflight:
                        pending.movementPreflight,
                    preTurnCheckpoint:
                        pending.preTurnCheckpoint,
                    observation,
                    failureCode:
                        observation
                            .failureCode ||
                        'post_provider_failed',
                    retryCount:
                        Number(
                            pending.retryCount ||
                            0,
                        ) + 1,
                });
                return {
                    settled: false,
                };
            }
            const integrated =
                integratePostObservation(
                    transaction,
                    observation,
                    state,
                    String(
                        playerMessage.mes ||
                        '',
                    ),
                    pending.playerMessageId,
                    sceneMessageId,
                    {
                        movementPreflight:
                            pending
                                .movementPreflight,
                    },
                );
            if (!integrated.valid) {
                await preservePendingPostSettlement({
                    playerMessageId:
                        pending.playerMessageId,
                    sceneMessageId,
                    sceneMessage,
                    transaction,
                    movementPreflight:
                        pending.movementPreflight,
                    preTurnCheckpoint:
                        pending.preTurnCheckpoint,
                    observation,
                    failureCode:
                        integrated.failureCode,
                    retryCount:
                        Number(
                            pending.retryCount ||
                            0,
                        ) + 1,
                });
                return {
                    settled: false,
                };
            }
            transaction =
                integrated.transaction;
            let nextState =
                applyTurnTransaction(
                    state,
                    transaction,
                    String(
                        playerMessage.mes ||
                        '',
                    ),
                    {
                        sourceMessageId:
                            sceneMessageId,
                    },
                );
            if (
                transaction
                    .movementOutcome
                    ?.moved ===
                true
            ) {
                transaction =
                    reconcileTurnActorPresenceWithSpatialState(
                        transaction,
                        nextState,
                    );
                transaction.localPresence =
                    reduceLocalPresence(
                        nextState,
                        {
                            actorUpdates:
                                transaction
                                    .actorUpdates,
                        },
                    );
            }
            nextState =
                applyPresenceWitnessTransaction(
                    nextState,
                    transaction,
                );
            nextState = consumePacingBeat(nextState);
            const liveModelTaskRuntime =
                getMudState()
                    ?.modelTaskRuntime;
            if (liveModelTaskRuntime) {
                nextState.modelTaskRuntime =
                    structuredClone(
                        liveModelTaskRuntime,
                    );
            }
            if (pending.preTurnCheckpoint) {
                nextState.turnRetry =
                    structuredClone(
                        pending
                            .preTurnCheckpoint,
                    );
            }
            context.chatMetadata.hogwartsMud =
                nextState;
            state = getMudState();
            transaction.committedClock =
                state.clock;
            const committedMessage =
                buildSceneMessage(
                    transaction,
                    state,
                    sceneMessage,
                );
            delete committedMessage.extra
                .hogwartsMud
                .pendingPostSettlement;
            delete playerMessage.extra
                ?.hogwartsMud
                ?.movementPreflight;
            await context.saveMetadata();
            await context.saveChat();
            committed = true;
            updateNativeMessageBlock(
                sceneMessageId,
                committedMessage,
            );
            applySystemPrompt();
            renderAll();
            return {
                settled: true,
            };
        } catch (error) {
            if (!committed) {
                await preservePendingPostSettlement({
                    playerMessageId:
                        pending.playerMessageId,
                    sceneMessageId,
                    sceneMessage,
                    transaction,
                    movementPreflight:
                        pending.movementPreflight,
                    preTurnCheckpoint:
                        pending.preTurnCheckpoint,
                    failureCode:
                        'post_provider_failed',
                    retryCount:
                        Number(
                            pending.retryCount ||
                            0,
                        ) + 1,
                });
            }
            throw error;
        } finally {
            jobRegistry.turnActive = false;
            renderAll();
        }
    }

    async function discardPendingPostSettlement() {
        const context = getContext();
        const state = getMudState();
        if (
            state?.turn?.status !==
            'post_unsettled'
        ) {
            return null;
        }
        if (
            jobRegistry.turnActive ||
            jobRegistry.sceneTransitionActive
        ) {
            throw new Error(
                'The world is still settling.',
            );
        }
        const saved =
            findPendingPostSettlement(
                context.chat,
            );
        const pending =
            saved?.pending;
        if (
            !pending ||
            pending.discardable !== true ||
            !isPendingPostSettlementCurrent(
                state,
                pending,
            ) ||
            !isPendingPostSettlementTail(
                context.chat,
                pending,
            ) ||
            !pending.preTurnCheckpoint
        ) {
            throw new Error(
                'The saved Scene can no longer be discarded safely.',
            );
        }
        const playerMessage =
            context.chat[
                pending.playerMessageId
            ];
        const restored =
            restoreTurnRetryCheckpoint(
                pending.preTurnCheckpoint,
            );
        jobRegistry.turnActive = true;
        try {
            context.chat.splice(
                pending.playerMessageId,
                2,
            );
            context.chatMetadata.hogwartsMud =
                restored;
            await context.saveMetadata();
            await context.saveChat();
            applySystemPrompt();
            renderAll();
            return {
                playerAction:
                    String(
                        playerMessage?.mes ||
                        pending.preTurnCheckpoint
                            .playerAction ||
                        '',
                    ),
            };
        } finally {
            jobRegistry.turnActive = false;
            renderAll();
        }
    }

    async function processUnsettledTurn() {
        const context = getContext();
        if (
            getMudState()?.turn?.status ===
            'post_unsettled'
        ) {
            renderAll();
            return;
        }
        const unsettled =
        findUnsettledTurn(
            context.chat,
            getMudState()?.turn,
        );
        if (!unsettled) {
            if (
                getFailedPlayerTurn(
                    context.chat,
                    getMudState()?.turn,
                )
            ) {
                renderAll();
            }
            return;
        }
        await runStructuredTurn(
            unsettled.playerAction,
            unsettled
                .assistantMessageId,
            unsettled.forceCheck,
        );
    }

    async function preparePlayableState() {
        try {
            const context = getContext();
            let state = getMudState();
            const lifecycleChanged = ensureSceneLifecycleState(state);
            const recentPlayerAction = [...context.chat]
                .reverse()
                .find(message => message.is_user)?.mes || '';
            const spatial = reconcileSpatialState(
                state,
                recentPlayerAction,
            );
            const presence =
            reconcileVisibleActorPresenceState(
                spatial.state,
            );
            if (spatial.changed) {
                context.chatMetadata.hogwartsMud =
                presence.state;
                state = getMudState();
            } else if (
                presence.changed
            ) {
                context.chatMetadata.hogwartsMud =
                presence.state;
                state = getMudState();
            }
            if (
                lifecycleChanged ||
            spatial.changed ||
            presence.changed
            ) {
                await context.saveMetadata();
                if (lifecycleChanged) {
                    const pending =
                        findPendingPostSettlement(
                            context.chat,
                        )?.pending;
                    if (
                        pending &&
                        getMudState()
                            ?.turn?.status ===
                            'post_unsettled'
                    ) {
                        pending.stateRevision =
                            Number(
                                getMudState()
                                    ?.stateRevision ||
                                0,
                            );
                    }
                    await context.saveChat();
                }
                applySystemPrompt();
                renderAll();
            }
            state = getMudState();
            if (
                state.turn?.status ===
                'post_unsettled'
            ) {
                renderAll();
                return;
            }
            await ensureCurrentInteriorMap();
            state = getMudState();
            const activeMap =
            getLocalMapDefinition(
                state.map
                    ?.activeMapId,
                state.map,
            );
            if (
                getInteriorMount(
                    activeMap,
                ) &&
            getInspectorMapScope() !==
                'auto'
            ) {
                resetInspectorMapScope();
                renderAll();
            }
            assertWorldFoundationReady(
                state,
            );
            await repairNarratedCurrentLocationResidents();
            await syncLocalKnowledge();
            await processUnsettledTurn();
            await ensureSocialDirectorCatchup();
        } catch (error) {
            console.error('[Hogwarts MUD] Playable-state preparation failed', error);
            toastr.error(String(error?.cause?.message || error?.message || error));
        }
    }

    return {
        repairNarratedCurrentLocationResidents,
        buildSceneMessage,
        runStructuredTurn,
        retryFailedPlayerTurn,
        retryPendingPostSettlement,
        discardPendingPostSettlement,
        processUnsettledTurn,
        preparePlayableState,
    };
}
