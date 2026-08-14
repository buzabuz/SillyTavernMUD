import {
    NARRATIVE_PROMPT_ACCESS,
    projectNarrativePromptInput,
} from '../domain/narrative-prompt-context.js';

export function createDirectorWorkflows(ports) {
    const {
        CANON_CAST_IDENTITY_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY =
        '',
        analyzePacingSignals,
        applyPacingAssessment,
        applySystemPrompt,
        buildActorSelectionPolicy,
        buildMapAuthorityContext,
        buildNpcIdentityPromptProjection =
        () => null,
        createContextBudgetPlan,
        extractRoleResponseText,
        formatRetrievedKnowledge,
        getContext,
        getMudState,
        jobRegistry,
        normalizePacingAssessmentPayload,
        parseJsonObject,
        projectNpcRuntimeActorsForPrompt =
        state => (
            state?.actors ||
            []
        ).map(actor =>
            Object.fromEntries(
                Object.entries(actor)
                    .filter(([key]) =>
                        key !== 'identity'),
            )),
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        sendPacingDirectorRequest,
        syncLocalKnowledge,
        validatePacingAssessment,
    } = ports;

    function projectActorLibraryForContext(
        actorLibrary,
        _contextPlan,
        {
            actorIds = null,
            includePrivate = true,
            identityObserver =
            includePrivate
                ? 'self'
                : 'player',
            worldState = null,
        } = {},
    ) {
        const allowedIds = actorIds
            ? new Set(actorIds)
            : null;
        const projectionState =
            worldState ||
            getMudState?.() ||
            {
                actorLibrary,
            };
        const runtimeById =
            new Map(
                (
                    projectionState
                        .actors ||
                    []
                ).map(actor => [
                    actor.id,
                    actor,
                ]),
            );
        return (actorLibrary || [])
            .filter(actor =>
                !allowedIds || allowedIds.has(actor.id))
            .map(actor => {
                const runtime =
                    runtimeById.get(
                        actor.id,
                    ) || {};
                const identityProjection =
                buildNpcIdentityPromptProjection(
                    projectionState,
                    actor.id,
                    identityObserver ===
                        'self'
                        ? actor.id
                        : identityObserver,
                    {
                        clock:
                            projectionState
                                ?.clock ||
                            '',
                    },
                );
                return {
                    id: actor.id,
                    nameEn: actor.nameEn,
                    roleEn: actor.roleEn,
                    publicProfile:
                    actor.publicProfile,
                    performanceCore:
                    actor.performanceCore,
                    runtime: {
                        mapId:
                        runtime.mapId ||
                        '',
                        roomId:
                        runtime.roomId ||
                        '',
                        present:
                        runtime.present ===
                        true,
                        lifeStatus:
                        runtime.lifeStatus ||
                        'alive',
                        lifeStatusPermanent:
                        runtime
                            .lifeStatusPermanent ===
                        true,
                        lifeStatusDetailEn:
                        runtime
                            .lifeStatusDetailEn ||
                        'Alive.',
                        currentActivityEn:
                        runtime
                            .currentActivityEn ||
                        '',
                        currentIntentEn:
                        runtime
                            .currentIntentEn ||
                        '',
                        currentGoalEn:
                        runtime
                            .currentGoalEn ||
                        '',
                        temporary:
                        runtime.temporary ===
                        true,
                    },
                    ...(includePrivate ? {
                        privateFacts:
                        actor.privateFacts,
                    } : {}),
                    ...(identityProjection
                        ? {
                            identityProjection,
                        }
                        : {}),
                };
            });
    }

    function buildPacingActorSelectionPolicy(
        state,
        pacingSignals,
    ) {
        const recentPlayerTurns =
        getContext().chat
            .filter(message =>
                message.is_user)
            .slice(-16)
            .map(message => {
                const addressing =
                    message.extra
                        ?.hogwartsMud
                        ?.addressing ||
                    {};
                const actorIds =
                    Array.isArray(
                        addressing
                            .actorIds,
                    )
                        ? addressing
                            .actorIds
                        : (
                            addressing
                                .blocks ||
                            []
                        )
                            .map(block =>
                                block
                                    .targetActorId)
                            .filter(Boolean);
                return {
                    actorIds,
                    sceneId:
                        message.extra
                            ?.hogwartsMud
                            ?.sceneId ||
                        '',
                };
            });
        return buildActorSelectionPolicy(
            state,
            pacingSignals
                .selectionPlayerAction ||
        pacingSignals
            .playerAction ||
        '',
            recentPlayerTurns,
            pacingSignals
                .currentAddressing ||
        null,
        );
    }

    function createPacingDirectorPrompt(
        state,
        pacingSignals,
        retrievedKnowledge = [],
        contextPlan = createContextBudgetPlan(
            CONTEXT_SIZE_PRESETS.rich,
            DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
        ),
    ) {
        const presentActorIds = new Set(
            (state.actors || [])
                .filter(actor => actor.present !== false)
                .map(actor => actor.id),
        );
        const actorSelectionPolicy =
        buildPacingActorSelectionPolicy(
            state,
            pacingSignals,
        );
        const metActorIds =
        new Set(
            actorSelectionPolicy
                .metActorIds,
        );
        const absentActorIds =
        state.actorLibrary
            .filter(actor =>
                !presentActorIds
                    .has(actor.id))
            .map(actor =>
                actor.id);
        const knownAbsentActorIds =
        absentActorIds.filter(actorId =>
            metActorIds.has(actorId));
        const unmetAbsentActorIds =
        absentActorIds.filter(actorId =>
            !metActorIds.has(actorId));
        return [
            {
                role: 'system',
                content: `You are the mid-tier Pacing Director and Causal Collapse Resolver for a persistent Harry Potter RPG. You are called when local pacing signals detect repetition, drift, or a first meaningful observation of an unresolved person, location, or item. Diagnose the scene and return exactly one compact JSON object with no Markdown.

${CANON_CAST_IDENTITY_CONTRACT}

Authority and limits:
- This is not a daily plan and not scene prose. Do not write dialogue.
- Prefer a concrete turn when the same core cast or pressure has repeated.
- When pacingSignals.reasons includes causal_collapse_opportunity, first try to bind one previously unobserved but logically compatible fact. The player's observation triggers materialization, but the fact must have existed in world time before the current observation.
- A causal fact may be an ordinary social edge, offscreen event, institutional fact, material history, obligation, or rumor route. It must not contradict prior dialogue, observed space, actor knowledge, time, map state, or existing causalCollapseRecords.
- Bind only reversible medium-tier facts. Blood relations, major identities, deaths, permanent injuries, successful major crimes, Canon rewrites, and irreversible consequences require the high tier and cannot be materialized here.
- Causal collapse uses aftermath-first presentation. Provide physical, social, or institutional residues for the low tier to show; do not put the hidden explanation into beatEn or pressureEn.
- Use existing actor and item IDs only. causalCollapse cannot create a new actor.
- If no natural fact passes compatibility, return one ordinary environmental_hook, minor_mishap, complication, or existing_actor_action in the same response with causalCollapse null. Do not hold and do not request another model call.
- Apply actorSelectionPolicy in this exact descending order: explicitActorIds from the current turn; pursuedActorIds from sustained player attention; actors causally required by unresolved events; the current social-stage new/familiar quota; ordinary familiar recall. A lower tier must never displace a plausible higher-tier actor.
- exploration means the player is still discovering the social world. After higher priorities are satisfied, prefer one plausible unmetAvailableActor or a new public guest over an ordinary knownAbsentActor. Generic familiar recall is limited to actorSelectionPolicy.stageQuota.genericFamiliarRecallBudget.
- circle_formation balances unmet and familiar actors according to stageQuota. socially_stable may prefer knownAbsentActors, while preserving the supplied new-actor share across scenes.
- A known absent actor may always return early when explicitly named, pursued, causally required, or carrying a live unresolved thread. The social stage never blocks such a return.
- kind new_actor is reserved for an unmetAvailableActor or a genuinely new guestActor. A returning knownAbsentActor uses kind existing_actor_action. Use mixed only when both categories participate. A familiar return does not satisfy the social-stage new-actor share.
- explicitCanonCandidates are user-named Canon characters. When one is plausible at the current time and place, reference its stable ID in actorEntrances; normalization will promote it without inventing a duplicate.
- When pacingSignals.reasons includes explicit_canon_actor_request, do not hold. Admit the plausible selected Canon candidate with its supplied stable ID; if the candidate is genuinely impossible at this time or place, use a concrete non-actor intervention rather than inventing a duplicate.
- New people must be plausible for the current room, age context, and activity. A public guest has no secret, hidden relationship, private lore, special power, or permanent plot authority.
- guestActor.publicDescriptionEn must contain only stable physical traits. Never put clothes, accessories, held items, nearby belongings, furniture, pose, activity, or location into it; currentActivityEn carries activity and the material observer records dynamic presentation.
- Story Arc state is unavailable at this tier. Keep arcId empty and use only supplied observable scene pressure.
- You may create an immediate public complication, but not a permanent consequence, new map, item, spell, relationship, or canon rewrite.
- The intervention will be binding for the next low-tier performance. Keep it playable and stop before the player chooses a response.
- Use hold when the current interaction still has meaningful unused pressure, except when causal_collapse_opportunity is active.
- Keep diagnosisEn, beatEn, pressureEn, and actor activities under 45 English words each.

${NPC_IDENTITY_PROMPT_BOUNDARY}

Schema:
{
  "decision": "hold|intervene",
  "diagnosisEn": "brief meta diagnosis",
  "reassessAfterTurns": 2,
  "intervention": null
}

For intervene, intervention must be:
{
  "kind": "new_actor|causal_collision|environmental_hook|minor_mishap|existing_actor_action|complication|main_arc|mixed",
  "timing": "this_turn",
  "beatEn": "observable event the low tier must realize",
  "pressureEn": "immediate public pressure requiring player response",
  "arcId": "",
  "actorEntrances": [
    {
      "id": "existing_absent_actor_id",
      "currentActivityEn": "observable entrance activity"
    }
  ],
  "guestActor": null,
  "causalCollapse": null
}

For a bound causal fact, use kind causal_collision and causalCollapse:
{
  "kind": "social_edge|offscreen_event|institutional_fact|material_history|obligation",
  "focusActorId": "existing_focus_actor_id_or_empty",
  "relatedActorIds": ["existing_actor_id"],
  "itemId": "existing_item_id_or_empty",
  "mapId": "current_authoritative_map_id",
  "roomId": "current_authoritative_room_id",
  "effectiveMinutesBeforeObservation": 7,
  "factEn": "specific fact that was true before observation",
  "edgeType": "friend|roommate|classmate|rival|neighbor|witness|creditor|debtor|empty",
  "visibleResiduesEn": ["observable aftermath detail"],
  "aftermathEn": "what the low tier should visibly stage without explaining the cause",
  "witnessAccounts": [
    {
      "actorId": "existing_actor_id",
      "accountEn": "what only this actor knows and may reveal if directly addressed"
    }
  ],
  "sourceEventIds": ["existing_event_id_if_any"],
  "persistenceTargets": ["event|social_graph|room_state|item|obligation"],
  "surfaceMode": "aftermath",
  "consequenceMode": "mixed",
  "irreversible": false,
  "requiresHighTier": false
}

When a public guest is necessary, guestActor must contain exactly:
{
  "id": "new_snake_case_id",
  "nameEn": "public name",
  "roleEn": "ordinary local role",
  "relationshipToPlayerEn": "newly met or stranger",
  "publicDescriptionEn": "stable physical traits only; no clothing, props, activity, or location",
  "publicBackgroundEn": "minimal public background",
  "personalityEn": "performable public temperament",
  "speechStyleEn": "performable speech style",
  "currentActivityEn": "observable entrance activity"
}`,
            },
            {
                role: 'user',
                content: JSON.stringify(
                    projectNarrativePromptInput(
                        {
                            pacingSignals,
                            clock: state.clock,
                            currentScene:
                                state.scene,
                            currentLocation:
                                state.location,
                            presentActors:
                            projectNpcRuntimeActorsForPrompt(
                                state,
                                {
                                    presentOnly:
                                        true,
                                },
                            ),
                            actorSelectionPolicy,
                            knownAbsentActors:
                            projectActorLibraryForContext(
                                state.actorLibrary,
                                contextPlan,
                                {
                                    actorIds:
                                        knownAbsentActorIds,
                                    includePrivate:
                                        false,
                                    includeMemories:
                                        false,
                                    identityObserver:
                                        'player',
                                    worldState:
                                        state,
                                },
                            ),
                            unmetAvailableActors:
                            projectActorLibraryForContext(
                                state.actorLibrary,
                                contextPlan,
                                {
                                    actorIds:
                                        unmetAbsentActorIds,
                                    includePrivate:
                                        false,
                                    includeMemories:
                                        false,
                                    identityObserver:
                                        'player',
                                    worldState:
                                        state,
                                },
                            ),
                            explicitCanonCandidates:
                            actorSelectionPolicy
                                .explicitCanonCandidates,
                            discoveredClues:
                            (
                                state.clues ||
                                []
                            ).filter(clue =>
                                clue
                                    .discovered ===
                                true),
                            recentScenes:
                            (
                                state.sceneArchive ||
                                []
                            ).slice(
                                contextPlan.mode ===
                                    'lean'
                                    ? -1
                                    : contextPlan.mode ===
                                        'balanced'
                                        ? -2
                                        : -3,
                            ),
                            currentSceneTimeline:
                            (
                                state.scene
                                    ?.timelineEntries ||
                                []
                            ).slice(
                                -contextPlan
                                    .recentMessageLimit,
                            ),
                            recentMessages:
                            getContext().chat
                                .slice(Math.max(
                                    0,
                                    Number(
                                        state.scene
                                            ?.startedMessageId ||
                                        0,
                                    ),
                                ))
                                .slice(
                                    -contextPlan
                                        .recentMessageLimit,
                                )
                                .map(message => ({
                                    isUser:
                                        Boolean(
                                            message
                                                .is_user,
                                        ),
                                    text:
                                        message.mes,
                                })),
                            causalCollapseRecords:
                            (
                                state
                                    .causalCollapse
                                    ?.records ||
                                []
                            ).slice(-8),
                            mapAuthority:
                            buildMapAuthorityContext(
                                state,
                            ),
                            retrievedLocalKnowledge:
                            formatRetrievedKnowledge(
                                projectNarrativePromptInput(
                                    retrievedKnowledge,
                                ),
                            ),
                        },
                        {
                            access:
                            NARRATIVE_PROMPT_ACCESS
                                .MEDIUM,
                        },
                    ),
                ),
            },
        ];
    }

    function createCausalPacingDirectorPrompt(
        state,
        pacingSignals,
    ) {
        const opportunity =
            pacingSignals.metrics
                ?.causalCollapseOpportunity ||
            null;
        const runtimeById =
            new Map(
                (
                    state.actors ||
                    []
                ).map(actor => [
                    actor.id,
                    actor,
                ]),
            );
        const relevantActorIds =
            new Set([
                opportunity
                    ?.focusActorId,
                ...(
                    state.actors ||
                    []
                )
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id),
            ].filter(Boolean));
        const actorDirectory =
            (
                state.actorLibrary ||
                []
            )
                .filter(actor =>
                    relevantActorIds
                        .has(actor.id))
                .map(actor => {
                    const runtime =
                        runtimeById.get(
                            actor.id,
                        ) || {};
                    return {
                        id: actor.id,
                        nameEn:
                            actor.nameEn ||
                            actor.id,
                        roleEn:
                            actor.roleEn ||
                            '',
                        present:
                            runtime.present !==
                            false,
                        currentActivityEn:
                            runtime
                                .currentActivityEn ||
                            '',
                    };
                });
        const currentItem =
            opportunity?.itemId
                ? (
                    state.items ||
                    []
                ).find(item =>
                    item.id ===
                        opportunity.itemId) ||
                    null
                : null;
        const recentCommittedEvents =
            (
                state.eventKnowledge ||
                []
            )
                .slice(-8)
                .map(event => ({
                    id:
                        event.id ||
                        event.eventId ||
                        '',
                    kind:
                        event.kind ||
                        event.type ||
                        '',
                    clock:
                        event.clock ||
                        '',
                    summaryEn:
                        event.summaryEn ||
                        event.eventEn ||
                        '',
                    actorIds: [
                        ...new Set([
                            ...(
                                event
                                    .participantActorIds ||
                                []
                            ),
                            ...(
                                event
                                    .witnessActorIds ||
                                []
                            ),
                            ...(
                                event
                                    .recipientActorIds ||
                                []
                            ),
                        ]),
                    ],
                }));
        const existingCausalFacts =
            (
                state.causalCollapse
                    ?.records ||
                []
            )
                .slice(-8)
                .map(record => ({
                    id: record.id,
                    slotKey:
                        record.slotKey,
                    kind:
                        record.kind,
                    factEn:
                        record.factEn,
                    focusActorId:
                        record.focusActorId ||
                        '',
                    relatedActorIds:
                        record
                            .relatedActorIds ||
                        [],
                    itemId:
                        record.itemId ||
                        '',
                    mapId:
                        record.mapId ||
                        '',
                    roomId:
                        record.roomId ||
                        '',
                }));
        return [{
            role: 'system',
            content: `You are the medium-tier Causal Collapse Director. A deterministic guard found one unresolved observation slot. Return one JSON object and no Markdown.

Choose hold when no grounded, reversible prior fact is compatible with the supplied committed State. Otherwise return exactly one causal_collision. Never create, admit, move, merge, rename or reveal an Actor. Never produce filler, mishaps, environmental hooks, generic initiative, Scene prose, dialogue, a new Item, a new map, a spell, a major identity, a death, a permanent injury, a successful major crime or a Canon rewrite.

A bound fact must have become true 1 minute to 7 days before this observation, remain compatible with recentCommittedEvents and existingCausalFacts, and use only supplied Actor, Item, map, room and Event IDs. Show aftermath first: beatEn, pressureEn, visibleResiduesEn and aftermathEn may expose consequences but not narrate the hidden cause. Only matching witnessAccounts may know the cause.

Schema:
{
  "decision": "hold|intervene",
  "diagnosisEn": "1-45 English words",
  "reassessAfterTurns": 6,
  "intervention": null
}

For intervene:
{
  "kind": "causal_collision",
  "timing": "this_turn",
  "beatEn": "observable aftermath, at most 45 words",
  "pressureEn": "immediate public pressure, at most 45 words",
  "arcId": "",
  "causalCollapse": {
    "kind": "social_edge|offscreen_event|institutional_fact|material_history|obligation",
    "focusActorId": "supplied existing actor ID or empty",
    "relatedActorIds": ["supplied existing actor ID"],
    "itemId": "supplied current item ID or empty",
    "mapId": "supplied current map ID",
    "roomId": "supplied current room ID",
    "effectiveMinutesBeforeObservation": 7,
    "factEn": "specific prior fact, at most 80 words",
    "edgeType": "friend|roommate|classmate|rival|neighbor|witness|creditor|debtor|empty",
    "visibleResiduesEn": ["1-3 observable details, each at most 45 words"],
    "aftermathEn": "low-tier staging instruction, at most 45 words",
    "witnessAccounts": [{"actorId":"supplied actor ID","accountEn":"private account, at most 60 words"}],
    "sourceEventIds": ["supplied Event ID"],
    "persistenceTargets": ["event|social_graph|room_state|item|obligation"],
    "surfaceMode": "aftermath",
    "consequenceMode": "mixed",
    "irreversible": false,
    "requiresHighTier": false
  }
}`,
        }, {
            role: 'user',
            content:
                JSON.stringify({
                    causalOpportunity:
                        opportunity,
                    clock:
                        state.clock,
                    currentScene: {
                        id:
                            state.scene
                                ?.id ||
                            '',
                        summaryEn:
                            state.scene
                                ?.summaryEn ||
                            '',
                    },
                    currentLocation: {
                        mapId:
                            state.map
                                ?.activeMapId ||
                            '',
                        roomId:
                            state.map
                                ?.currentLocalNodeId ||
                            '',
                        name:
                            state.location ||
                            '',
                    },
                    actorDirectory,
                    currentItem,
                    recentCommittedEvents,
                    existingCausalFacts,
                }),
        }];
    }

    async function generatePacingAssessment(
        roleSlot,
        state,
        pacingSignals,
    ) {
        const prompt =
        createCausalPacingDirectorPrompt(
            state,
            pacingSignals,
        );
        let response = await sendPacingDirectorRequest(
            roleSlot,
            prompt,
            { json: true },
        );
        let raw = extractRoleResponseText(response);
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const payload =
                normalizePacingAssessmentPayload(
                    parseJsonObject(raw),
                );
                if (payload.decision === 'hold' &&
                payload.intervention === undefined) {
                    payload.intervention = null;
                }
                const validation = validatePacingAssessment(
                    payload,
                    state,
                    pacingSignals,
                );
                if (!validation.valid) {
                    throw new Error(validation.errors.join('；'));
                }
                return payload;
            } catch (error) {
                lastError = error;
                if (attempt > 0) break;
                response = await sendPacingDirectorRequest(roleSlot, [
                    {
                        role: 'system',
                        content: 'Repair the causal-only Pacing JSON. Return hold with null intervention when no grounded prior fact fits. Otherwise return exactly one reversible this_turn causal_collision using only supplied Actor, Item, map, room and Event IDs. Never create or admit an Actor, and never return filler or a generic incident. Output JSON only.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            validationError:
                            String(error?.message || error),
                            invalidOutput: raw,
                            originalRequest:
                            JSON.parse(prompt[1].content),
                        }),
                    },
                ], { json: true });
                raw = extractRoleResponseText(response);
            }
        }
        throw new Error(
            `中档节奏评估连续两次无效：${String(lastError?.message || lastError)}`,
        );
    }

    async function ensurePacingDirectorAssessment(
        playerAction = '',
        _currentAddressing = null,
        _selectionPlayerAction = playerAction,
    ) {
        if (jobRegistry.pacing) {
            return jobRegistry.pacing;
        }
        let state = getMudState();
        const pacingSignals = analyzePacingSignals(
            state,
            playerAction,
        );
        if (!pacingSignals.shouldAssess) {
            return null;
        }
        jobRegistry.pacing = (async () => {
            const context = getContext();
            state = getMudState();
            state.pacingDirector = {
                ...(state.pacingDirector || {}),
                status: 'assessing',
                error: '',
            };
            await context.saveMetadata();
            renderAll();
            try {
                const slots = resolveRoleSlots(state.modelSlots);
                const assessment = await generatePacingAssessment(
                    slots.medium,
                    state,
                    pacingSignals,
                );
                state = getMudState();
                context.chatMetadata.hogwartsMud =
                applyPacingAssessment(
                    state,
                    assessment,
                    pacingSignals,
                );
                await context.saveMetadata();
                applySystemPrompt();
                renderAll();
                if (
                    assessment
                        .intervention
                        ?.causalCollapse
                ) {
                    await syncLocalKnowledge();
                }
                return assessment;
            } catch (error) {
                state = getMudState();
                state.pacingDirector = {
                    ...(state.pacingDirector || {}),
                    status: 'failed',
                    error: String(
                        error?.cause?.message ||
                    error?.message ||
                    error,
                    ),
                    lastAssessedTurn:
                    Number(state.turn?.count || 0),
                    lastAssessedSceneId: state.scene?.id || '',
                    reassessAfterTurns: 2,
                };
                await context.saveMetadata();
                renderAll();
                console.warn(
                    '[Hogwarts MUD] Pacing assessment failed; continuing the ordinary turn',
                    error,
                );
                return null;
            }
        })().finally(() => {
            jobRegistry.pacing = null;
            renderAll();
        });
        return jobRegistry.pacing;
    }

    return {
        projectActorLibraryForContext,
        createPacingDirectorPrompt:
            createCausalPacingDirectorPrompt,
        generatePacingAssessment,
        ensurePacingDirectorAssessment,
    };
}
