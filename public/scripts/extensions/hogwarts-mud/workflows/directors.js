import {
    projectCalendarAtMoment,
    projectCalendarToday,
    projectUpcomingCalendar,
} from '../domain/calendar-projection.js';
import {
    NARRATIVE_PROMPT_ACCESS,
    projectNarrativePromptInput,
} from '../domain/narrative-prompt-context.js';

export function selectRecentChronicle(
    state,
) {
    const entries =
        (
            state.globalChronicle
                ?.entries ||
            []
        ).slice(-3);
    while (
        entries.length &&
        JSON.stringify(entries).length >
            1400
    ) {
        entries.shift();
    }
    return entries;
}

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
        getWorldDate,
        isDailyDirectorPlanCurrent,
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
        sendRoleRequest,
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

    function createDailyDirectorPrompt(
        state,
        retrievedKnowledge = [],
        contextPlan = createContextBudgetPlan(
            CONTEXT_SIZE_PRESETS.rich,
            DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
        ),
    ) {
        const date = getWorldDate(state.clock);
        const hasCalendar =
            Array.isArray(
                state.calendar
                    ?.entries,
            );
        const calendar = {
            today:
                hasCalendar
                    ? projectCalendarToday(
                        state,
                        state.clock,
                    )
                    : [],
            upcoming:
                hasCalendar
                    ? projectUpcomingCalendar(
                        state,
                        state.clock,
                        7,
                    )
                    : [],
            currentMoment:
                hasCalendar
                    ? projectCalendarAtMoment(
                        state,
                        state.clock,
                    )
                    : [],
        };
        return [
            {
                role: 'system',
                content: `You are the mid-tier Daily Director for a persistent Harry Potter RPG. You are called exactly once per in-world date. Settle the previous day's character consequences and prepare today's actor guidance, clue opportunities, and time policy. Return exactly one compact JSON object with no Markdown.

Rules:
- Produce one directive for every currently present actor.
- Use only the supplied medium-tier actor projection. Private goals, secrets, locked clues, and Story Arc state are unavailable.
- A revealed clue must be prewritten and must have had its unlock condition satisfied in the supplied previous-day events.
- Calendar is read-only. Use calendar.today, calendar.upcoming and calendar.currentMoment for guidance, but never output a Calendar proposal, entry, cancellation, reschedule, status change or horizon.
- calendar.currentMoment is the complete set of schedules overlapping the current clock. Keep every entry regardless of participant, location, tag or planningTier.
- Do not write scene prose or NPC dialogue.
- Keep ordinary turn durations at least 15 minutes. Instantaneous magic may use fewer.
- Keep every string under 20 English words. Do not restate character profiles.

${NPC_IDENTITY_PROMPT_BOUNDARY}

Schema:
{
  "date": "YYYY-MM-DD",
  "actorDirectives": [
    {
      "id":"actor_id",
      "goalEn":"today's immediate goal",
      "moodEn":"current mood",
      "guidanceEn":"how to perform this actor today"
    }
  ],
  "revealedClueIds": ["clues actually earned yesterday"],
  "timePolicy": {
    "defaultMinutes":15,
    "movementMinutes":15,
    "investigationMinutes":30,
    "extendedActionMinutes":60,
    "instantaneousMagicMinutes":1
  }
}`,
            },
            {
                role: 'user',
                content: JSON.stringify(
                    projectNarrativePromptInput(
                        {
                            date,
                            calendar,
                            currentScene:
                                state.scene,
                            presentActors:
                            projectNpcRuntimeActorsForPrompt(
                                state,
                            ),
                            actorLibrary:
                            projectActorLibraryForContext(
                                state.actorLibrary,
                                contextPlan,
                                {
                                    includePrivate:
                                        false,
                                    identityObserver:
                                        'self',
                                    worldState:
                                        state,
                                },
                            ),
                            discoveredClues:
                            (
                                state.clues ||
                                []
                            ).filter(clue =>
                                clue
                                    .discovered ===
                                true),
                            recentChronicle:
                                selectRecentChronicle(
                                    state,
                                ),
                            recentMessages:
                            getContext().chat
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

    function validateDailyDirectorPlan(plan, state) {
        const errors = [];
        for (const key of [
            'calendar',
            'calendarEntries',
            'calendarUpdates',
            'calendarProposal',
            'entries',
            'horizon',
        ]) {
            if (
                Object.hasOwn(
                    plan || {},
                    key,
                )
            ) {
                errors.push(
                    `Daily Director 不得输出 Calendar 字段 ${key}。`,
                );
            }
        }
        const date = getWorldDate(state.clock);
        const actorIds = new Set((state.actorLibrary || []).map(actor => actor.id));
        const presentActorIds = (state.actors || [])
            .filter(actor => actor.present !== false)
            .map(actor => actor.id);
        if (plan?.date !== date) {
            errors.push(`日计划日期必须是 ${date}。`);
        }
        const directives = Array.isArray(plan?.actorDirectives) ? plan.actorDirectives : [];
        const directiveIds = new Set(directives.map(item => item.id));
        presentActorIds.forEach(actorId => {
            if (!directiveIds.has(actorId)) {
                errors.push(`日计划缺少在场人物 ${actorId} 的指令。`);
            }
        });
        directives.forEach(item => {
            if (!actorIds.has(item.id)) {
                errors.push(`日计划引用了不存在的角色 ${item.id || '?'}。`);
            }
            for (const key of ['goalEn', 'moodEn', 'guidanceEn']) {
                if (!String(item[key] || '').trim()) {
                    errors.push(`角色 ${item.id || '?'} 的日计划缺少 ${key}。`);
                }
            }
        });
        const activeArc = (state.storyArcs || []).find(arc => arc.status === 'active');
        const clueIds = new Set((activeArc?.cluePlan || []).map(clue => clue.id));
        (plan?.revealedClueIds || []).forEach(clueId => {
            if (!clueIds.has(clueId)) {
                errors.push(`日结试图揭示未预写线索 ${clueId || '?'}。`);
            }
        });
        const policy = plan?.timePolicy || {};
        for (const key of [
            'defaultMinutes',
            'movementMinutes',
            'investigationMinutes',
            'extendedActionMinutes',
            'instantaneousMagicMinutes',
        ]) {
            if (!Number.isInteger(Number(policy[key])) || Number(policy[key]) < 0) {
                errors.push(`日计划时间规则 ${key} 无效。`);
            }
        }
        return { valid: errors.length === 0, errors };
    }

    async function generateDailyDirectorPlan(
        roleSlot,
        state,
        retrievedKnowledge,
        contextPlan,
    ) {
        let response = await sendRoleRequest(
            roleSlot,
            createDailyDirectorPrompt(
                state,
                retrievedKnowledge,
                contextPlan,
            ),
            { json: true },
        );
        let raw = extractRoleResponseText(response);
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const plan = parseJsonObject(raw);
                const validation = validateDailyDirectorPlan(plan, state);
                if (!validation.valid) {
                    throw new Error(validation.errors.join('；'));
                }
                return plan;
            } catch (error) {
                lastError = error;
                if (attempt > 0) break;
                response = await sendRoleRequest(roleSlot, [
                    {
                        role: 'system',
                        content: 'Repair the compact daily-director JSON. Keep the supplied date, include every present actor exactly once, use only prewritten clue IDs, and provide a complete timePolicy. Output no dialogue or scene prose.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            validationError: String(error?.message || error),
                            invalidOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                            requiredSchema:
                            createDailyDirectorPrompt(
                                state,
                                retrievedKnowledge,
                                contextPlan,
                            )[0].content,
                        }),
                    },
                ], { json: true });
                raw = extractRoleResponseText(response);
            }
        }
        throw new Error(`中档日计划连续两次无效：${String(lastError?.message || lastError)}`);
    }

    async function ensureDailyDirectorPlan() {
        let state = getMudState();
        const date = getWorldDate(state?.clock);
        if (!date || state?.phase !== 'playing') {
            return;
        }
        if (isDailyDirectorPlanCurrent(state.clock, state.dailyDirector)) {
            return;
        }
        if (jobRegistry.daily) {
            return jobRegistry.daily;
        }

        jobRegistry.daily = (async () => {
            const context = getContext();
            state = getMudState();
            state.dailyDirector = {
                date,
                status: 'building',
                error: '',
                plan: null,
                settledAt: null,
            };
            await context.saveMetadata();
            renderAll();
            try {
                const slots = resolveRoleSlots(state.modelSlots);
                const contextPlan =
                createContextBudgetPlan(
                    slots.medium.contextSize,
                    slots.medium.maxResponseLength,
                );
                const entityIds = [
                    state.scene?.id,
                    state.map?.currentLocalNodeId,
                    ...(state.actors || []).filter(actor => actor.present !== false).map(actor => actor.id),
                ].filter(Boolean);
                const retrievedKnowledge = await retrieveLocalKnowledge(
                    `Daily plan for ${date}. ${state.scene?.summaryEn || state.scene?.summary || ''}`,
                    entityIds,
                    {
                        limit: contextPlan.ragLimit,
                    },
                );
                const plan = await generateDailyDirectorPlan(
                    slots.medium,
                    state,
                    retrievedKnowledge,
                    contextPlan,
                );
                state = getMudState();
                const activeArc = (state.storyArcs || []).find(arc => arc.status === 'active');
                const cluePlan = new Map((activeArc?.cluePlan || []).map(clue => [clue.id, clue]));
                const existingClueIds = new Set((state.clues || []).map(clue => clue.id));
                const revealed = (plan.revealedClueIds || [])
                    .filter(clueId => cluePlan.has(clueId) && !existingClueIds.has(clueId))
                    .map(clueId => {
                        const clue = cluePlan.get(clueId);
                        return {
                            id: clue.id,
                            labelEn: clue.labelEn,
                            detailEn: clue.playerFacingDiscoveryEn,
                            label: clue.labelEn,
                            detail: clue.playerFacingDiscoveryEn,
                            discovered: true,
                            discoveredAt: state.clock,
                        };
                    });
                state.clues = [...(state.clues || []), ...revealed];
                state.storyArcs = (state.storyArcs || []).map(arc => arc.id === activeArc?.id ? {
                    ...arc,
                    revealedClueIds: [...new Set([
                        ...(arc.revealedClueIds || []),
                        ...revealed.map(clue => clue.id),
                    ])],
                } : arc);
                const directives = new Map(plan.actorDirectives.map(item => [item.id, item]));
                state.actors = (state.actors || []).map(actor => {
                    const directive = directives.get(actor.id);
                    return directive ? {
                        ...actor,
                        currentIntentEn: directive.goalEn,
                        currentIntent: directive.goalEn,
                    } : actor;
                });
                state.dailyDirector = {
                    date,
                    status: 'ready',
                    error: '',
                    plan,
                    settledAt: new Date().toISOString(),
                };
                await context.saveMetadata();
                applySystemPrompt();
                renderAll();
                await syncLocalKnowledge();
            } catch (error) {
                state = getMudState();
                state.dailyDirector = {
                    date,
                    status: 'failed',
                    error: String(error?.cause?.message || error?.message || error),
                    plan: null,
                    settledAt: null,
                };
                await context.saveMetadata();
                renderAll();
                throw error;
            }
        })().finally(() => {
            jobRegistry.daily = null;
        });
        return jobRegistry.daily;
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

    async function generatePacingAssessment(
        roleSlot,
        state,
        pacingSignals,
        retrievedKnowledge,
        contextPlan,
    ) {
        const actorSelectionPolicy =
        buildPacingActorSelectionPolicy(
            state,
            pacingSignals,
        );
        const prompt = createPacingDirectorPrompt(
            state,
            pacingSignals,
            retrievedKnowledge,
            contextPlan,
        );
        let response = await sendRoleRequest(
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
                    state,
                    actorSelectionPolicy
                        .explicitCanonCandidates,
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
                response = await sendRoleRequest(roleSlot, [
                    {
                        role: 'system',
                        content: 'Repair the pacing assessment JSON. Preserve actorSelectionPolicy priority order and social-stage quota. Keep arcId empty and use only supplied actor, item, map, and room IDs. If causal_collapse_opportunity is active, return one compatible causal_collision with aftermath-only surface data, or one ordinary incident with causalCollapse null; never hold. Causal facts must be reversible and requireHighTier false. Otherwise return hold with null intervention or one safe this_turn intervention. Return JSON only.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            validationError:
                            String(error?.message || error),
                            invalidOutput: raw,
                            originalRequest:
                            JSON.parse(prompt[1].content),
                            requiredSchema: prompt[0].content,
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
        currentAddressing = null,
        selectionPlayerAction = playerAction,
    ) {
        if (jobRegistry.pacing) {
            return jobRegistry.pacing;
        }
        let state = getMudState();
        const pacingSignals = analyzePacingSignals(
            state,
            playerAction,
        );
        pacingSignals.playerAction = playerAction;
        pacingSignals
            .selectionPlayerAction =
        selectionPlayerAction;
        pacingSignals.currentAddressing =
        currentAddressing
            ?.valid === true
            ? {
                mode:
                    currentAddressing
                        .mode,
                attempted:
                    Boolean(
                        currentAddressing
                            .attempted,
                    ),
                valid: true,
                actorIds: [
                    ...(
                        currentAddressing
                            .actorIds ||
                        []
                    ),
                ],
                targetLabels: [
                    ...(
                        currentAddressing
                            .targetLabels ||
                        []
                    ),
                ],
            }
            : null;
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
                const contextPlan =
                createContextBudgetPlan(
                    slots.medium.contextSize,
                    slots.medium.maxResponseLength,
                );
                const entityIds = [
                    state.scene?.id,
                    state.map?.currentLocalNodeId,
                    ...(state.actors || [])
                        .filter(actor => actor.present !== false)
                        .map(actor => actor.id),
                    ...(state.storyArcs || [])
                        .filter(arc => arc.status === 'active')
                        .map(arc => arc.id),
                ].filter(Boolean);
                const retrievedKnowledge =
                await retrieveLocalKnowledge(
                    `Assess scene pacing: ${pacingSignals.reasons.join(', ')}. ` +
                    `${state.scene?.summaryEn || state.scene?.summary || ''}`,
                    entityIds,
                    {
                        limit: contextPlan.ragLimit,
                    },
                );
                const assessment = await generatePacingAssessment(
                    slots.medium,
                    state,
                    pacingSignals,
                    retrievedKnowledge,
                    contextPlan,
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
                if (assessment.intervention?.guestActor ||
                assessment.intervention?.actorEntrances?.length ||
                assessment.intervention?.causalCollapse) {
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
        createDailyDirectorPrompt,
        validateDailyDirectorPlan,
        generateDailyDirectorPlan,
        ensureDailyDirectorPlan,
        buildPacingActorSelectionPolicy,
        createPacingDirectorPrompt,
        generatePacingAssessment,
        ensurePacingDirectorAssessment,
    };
}
