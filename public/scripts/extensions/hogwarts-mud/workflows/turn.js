export function createTurnWorkflow(ports) {
    const {
        TRANSLATION_FORMAT_VERSION,
        admitCurrentLocationResidents,
        admitMentionedKnownActors,
        applyObservedActorUpdates,
        applyPlayerMovement,
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
        ensurePacingDirectorAssessment,
        ensureSceneLifecycleState,
        ensureSocialDirectorCatchup,
        finalizeTurnDiagnostics =
        () => null,
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
        parseSpellCastDirectives,
        reconcileSpatialState,
        reconcileTurnActorPresenceWithSpatialState,
        reconcileVisibleActorPresenceState,
        reduceLocalPresence,
        removeExplicitAddressDirective,
        removeSpellCastDirectives,
        renderAll,
        resetInspectorMapScope,
        requestLocalTurnAdjudication,
        requestLocalTurnObservation,
        recordTurnDiagnostic =
        () => {},
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
        discardTurnDiagnostics =
        () => {},
    } = ports;

    function findPlayerActionForMessage(chat, messageId) {
        for (let index = messageId - 1; index >= 0; index--) {
            if (chat[index]?.is_user) {
                return chat[index].mes;
            }
            if (!chat[index]?.is_system) {
                break;
            }
        }
        return '';
    }

    async function repairLegacyGenericTurnSummaries() {
        const context = getContext();
        const state = getMudState();
        let chatChanged = false;
        let metadataChanged = false;
        const replacements = new Map();

        context.chat.forEach((message, messageId) => {
            const transactions = [
                message.extra?.hogwartsMud?.turnTransaction,
                ...(message.swipe_info || []).map(
                    swipe => swipe.extra?.hogwartsMud?.turnTransaction,
                ),
            ].filter(transaction =>
                transaction &&
            /player completes|player acts|characters respond/i.test(
                String(transaction.publicEventEn || ''),
            ),
            );
            if (!transactions.length) return;

            const action = findPlayerActionForMessage(context.chat, messageId)
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 180);
            if (!action) return;
            transactions.forEach(transaction => {
                transaction.publicEventEn = `Legacy player action: ${action}`;
                transaction.publicEvent = action;
                if (transaction.committedClock) {
                    replacements.set(transaction.committedClock, action);
                }
            });
            chatChanged = true;
        });

        if (replacements.size) {
            state.timeline = (state.timeline || []).map(entry =>
                replacements.has(entry.clock) &&
                /玩家完成规定的动作|player completes|characters respond/i.test(
                    String(entry.label || ''),
                )
                    ? { ...entry, label: replacements.get(entry.clock) }
                    : entry,
            );
            metadataChanged = true;
        }
        if (chatChanged) await context.saveChat();
        if (metadataChanged) await context.saveMetadata();
    }

    async function repairLegacySyntheticSceneOpeningSegments() {
        const context =
        getContext();
        const state =
        getMudState();
        let changed = false;
        for (
            const message
            of context.chat
        ) {
            const mud =
            message?.extra
                ?.hogwartsMud;
            if (
                mud?.role !==
                'scene_opening' ||
            !Array.isArray(
                mud.segments,
            )
            ) {
                continue;
            }
            const cleaned =
            stripSyntheticSceneOpeningActorSegments(
                mud.segments,
            );
            if (
                cleaned.length ===
                mud.segments.length ||
            !cleaned.length
            ) {
                continue;
            }
            const sourceEn =
            composeSceneSegments(
                cleaned,
                state
                    .actorLibrary ||
                    [],
                'en',
            );
            const translatedZh =
            composeSceneSegments(
                cleaned,
                state
                    .actorLibrary ||
                    [],
                'zh',
            );
            const hasTranslation =
            cleaned.some(segment =>
                String(
                    segment.textZh ||
                    '',
                ).trim()) &&
            translatedZh !==
                sourceEn;
            mud.segments =
            cleaned;
            mud.sourceEn =
            sourceEn;
            mud.translatedZh =
            hasTranslation
                ? translatedZh
                : undefined;
            message.mes =
            sourceEn;
            if (hasTranslation) {
                message.extra
                    .display_text =
                translatedZh;
            } else {
                delete message.extra
                    .display_text;
            }
            changed = true;
        }
        if (changed) {
            await context.saveChat();
        }
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
                    message.extra
                        .hogwartsMud
                        .sourceEn ||
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

    function buildSceneMessage(transaction, state, existingMessage = null) {
        const renderableActors = [
            ...(state.actorLibrary || []),
            ...(state.actors || []),
        ];
        const sourceEn = composeSceneSegments(transaction.segments, renderableActors, 'en');
        const translatedZh = composeSceneSegments(transaction.segments, renderableActors, 'zh');
        const hasTranslation = getSettings().translationEnabled &&
        transaction.segments.some(segment =>
            String(segment.textZh || '').trim()) &&
        translatedZh !== sourceEn;
        const message = existingMessage || {
            name: 'Scene',
            is_user: false,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: sourceEn,
            extra: {},
        };
        message.name = 'Scene';
        message.mes = sourceEn;
        message.extra = message.extra && typeof message.extra === 'object' ? message.extra : {};
        message.extra.hogwartsMud = {
            ...message.extra.hogwartsMud,
            sourceEn,
            translatedZh: hasTranslation ? translatedZh : undefined,
            provider: hasTranslation
                ? getSettings()
                    .translationProvider
                : undefined,
            translatedAt: hasTranslation ? Date.now() : undefined,
            translationVersion: hasTranslation
                ? TRANSLATION_FORMAT_VERSION
                : undefined,
            role: 'scene_turn',
            sceneId: state.scene?.id,
            segments: transaction.segments,
            turnTransaction: transaction,
        };
        if (hasTranslation) {
            message.extra.display_text = translatedZh;
        } else {
            delete message.extra.display_text;
        }
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
            let state = getMudState();
            beginTurnDiagnostics({
                playerAction,
                sceneId:
                    state.scene?.id,
                turnCount:
                    state.turn?.count,
                assistantMessageId,
            });
            let playerMessage = null;
            let spellCasts =
            parseSpellCastDirectives(
                playerAction,
            );
            let addressing =
            resolvePlayerAddressing(
                getActiveAddressingState(
                    state,
                ),
                playerAction,
            );
            if (!addressing.valid) {
                throw new Error(
                    addressing.error,
                );
            }
            const narrativePlayerAction =
            removeSpellCastDirectives(
                removeExplicitAddressDirective(
                    playerAction,
                ),
            );
            state.turn ??= {};
            state.turn.status = 'resolving';
            state.turn.error = '';
            await context.saveMetadata();
            renderAll();
            try {
                playerMessage = assistantMessageId === null
                    ? [...context.chat].reverse().find(message =>
                        message.is_user &&
                    message.mes === playerAction)
                    : context.chat
                        .slice(0, assistantMessageId)
                        .reverse()
                        .find(message => message.is_user);
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
                await ensureDirectorFoundation();
                await ensureDailyDirectorPlan();
                state = getMudState();
                const playerMessageId =
                context.chat.indexOf(
                    playerMessage,
                );
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
                const movementResult = applyPlayerMovement(
                    state,
                    narrativePlayerAction,
                );
                const movementResolution = movementResult.movement;
                if (movementResolution) {
                    if (playerMessage?.extra?.hogwartsMud) {
                        playerMessage.extra.hogwartsMud.movement =
                        movementResolution;
                        await context.saveChat();
                    }
                }
                if (movementResolution?.moved) {
                    const presenceReconciliation =
                    reconcileVisibleActorPresenceState(
                        movementResult.state,
                    );
                    context.chatMetadata.hogwartsMud =
                    presenceReconciliation
                        .state;
                    state = getMudState();
                    await context.saveMetadata();
                    applySystemPrompt();
                    renderAll();
                }
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
                    movementResolution,
                    forceCheckRequested,
                );
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
                (state.actors || [])
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id);
                const entityIds = [
                    state.scene?.id,
                    state.map?.currentLocalNodeId,
                ].filter(Boolean);
                let retrievedKnowledge = await retrieveLocalKnowledge(
                    narrativePlayerAction,
                    entityIds,
                    {
                        limit:
                        contextPlan
                            .ragLimit *
                        3,
                    },
                );
                retrievedKnowledge =
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
                const budget = createTurnPerformanceBudget(
                    narrativePlayerAction,
                    state.dailyDirector?.plan?.timePolicy,
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
                    narrativePlayerAction,
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
                    movementResolution,
                    momentumDirective,
                    checkResolution,
                    addressing,
                    mentionedKnownActors,
                    contextPlan,
                );
                setLiveSceneStreamPhase(
                    'translating',
                    performance.segments,
                );
                let transaction = buildSceneTransaction(
                    performance,
                    budget,
                    state.pacingDirector?.pendingBeat?.status === 'pending'
                        ? state.pacingDirector.pendingBeat
                        : null,
                    checkResolution,
                );
                transaction.spellCasts =
                structuredClone(
                    spellCasts,
                );
                const validation = validateTurnTransaction(transaction, state);
                if (!validation.valid) {
                    throw new Error(`合并后的回合事务无效：${validation.errors.join('；')}`);
                }
                try {
                    transaction = await localizeTurnTransaction(transaction);
                } catch (translationError) {
                    console.warn('[Hogwarts MUD] Turn transaction translation failed; using English labels', translationError);
                }
                const localObservation =
                await requestLocalTurnObservation(
                    state,
                    narrativePlayerAction,
                    transaction,
                    {
                        addressing,
                    },
                );
                transaction.materialEvents =
                localObservation
                    .materialEvents;
                transaction.itemUpdates = [
                    ...new Map(
                        [
                            ...(
                                transaction
                                    .itemUpdates ||
                            []
                            ),
                            ...(
                                localObservation
                                    .itemUpdates ||
                            []
                            ),
                        ].map(update => [
                            update.id,
                            update,
                        ]),
                    ).values(),
                ];
                transaction.materialExtraction = {
                    schemaVersion: 1,
                    source:
                    'ollama_structured_observer',
                    ...(
                        localObservation
                            .observation
                            .diagnostics ||
                    {}
                    ),
                };
                transaction.eventEnded =
                isObservedEventBoundary(
                    localObservation
                        .observation,
                    localObservation
                        .narrativeText,
                );
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
                    transaction
                        .eventKnowledge =
                    normalizeEventKnowledge({
                        sceneId,
                        sourceMessageIds: [
                            ...(
                                playerMessageId >=
                                    0
                                    ? [
                                        playerMessageId,
                                    ]
                                    : []
                            ),
                            assistantMessageId ??
                            context.chat
                                .length,
                        ],
                        summaryEn:
                            transaction
                                .publicEventEn,
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
                let nextState = applyTurnTransaction(
                    state,
                    transaction,
                    narrativePlayerAction,
                );
                nextState =
                applyPresenceWitnessTransaction(
                    nextState,
                    transaction,
                );
                nextState = consumePacingBeat(nextState);
                if (rollbackCheckpoint) {
                    nextState.turnRetry =
                    rollbackCheckpoint;
                }
                context.chatMetadata.hogwartsMud = nextState;
                state = getMudState();
                transaction.committedClock = state.clock;
                const existingMessage = assistantMessageId === null
                    ? null
                    : context.chat[assistantMessageId];
                const message = buildSceneMessage(transaction, state, existingMessage);
                let messageId = assistantMessageId;
                if (messageId === null) {
                    context.chat.push(message);
                    messageId = context.chat.length - 1;
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
                await context.saveMetadata();
                await context.saveChat();
                await syncLocalKnowledge();
                applySystemPrompt();
                updateNativeMessageBlock(messageId, message);
                renderAll();
                await ensureSocialDirectorCatchup();
                await ensureMemoryConsolidation();
                state = getMudState();
                if (state.dailyDirector?.date !== getWorldDate(state.clock)) {
                    await ensureDailyDirectorPlan();
                }
            } catch (error) {
                const errorText =
                    String(
                        error?.cause
                            ?.message ||
                        error?.message ||
                        error,
                    );
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
                state = getMudState();
                state.turn ??= {};
                state.turn.status = 'failed';
                state.turn.error =
                    errorText;
                await context.saveMetadata();
                if (playerMessage) {
                    await context.saveChat();
                }
                renderAll();
                throw error;
            } finally {
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

    async function processUnsettledTurn() {
        const context = getContext();
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
                applySystemPrompt();
                renderAll();
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
                activeMap
                    ?.sourceContainerKey &&
            getInspectorMapScope() !==
                'auto'
            ) {
                resetInspectorMapScope();
                renderAll();
            }
            await ensureDirectorFoundation();
            await repairLegacyGenericTurnSummaries();
            await repairLegacySyntheticSceneOpeningSegments();
            await repairNarratedCurrentLocationResidents();
            await syncLocalKnowledge();
            await ensureDailyDirectorPlan();
            await processUnsettledTurn();
            await ensureSocialDirectorCatchup();
        } catch (error) {
            console.error('[Hogwarts MUD] Playable-state preparation failed', error);
            toastr.error(String(error?.cause?.message || error?.message || error));
        }
    }

    return {
        findPlayerActionForMessage,
        repairLegacyGenericTurnSummaries,
        repairLegacySyntheticSceneOpeningSegments,
        repairNarratedCurrentLocationResidents,
        buildSceneMessage,
        runStructuredTurn,
        retryFailedPlayerTurn,
        processUnsettledTurn,
        preparePlayableState,
    };
}
