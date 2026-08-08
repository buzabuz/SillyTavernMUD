export function createSceneTransitionWorkflow(ports) {
    const {
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
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
        ensureDailyDirectorPlan,
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
        getWorldDate,
        jobRegistry,
        normalizeSceneTransitionPackage,
        parseJsonObject,
        projectActorLibraryForContext,
        projectSceneArchivePresence,
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        sendRoleRequest,
        stripSyntheticSceneOpeningActorSegments,
        syncLocalKnowledge,
        translateOpeningValues,
        validateSceneTransitionPackage,
    } = ports;

    function createSceneTransitionPrompt(
        state,
        tier,
        destinationHint,
        expectedDestination,
        intentOverride,
        retrievedKnowledge = [],
        contextPlan = createContextBudgetPlan(
            CONTEXT_SIZE_PRESETS.rich,
            DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
        ),
    ) {
        const isHighTier = tier === 'high';
        const destinationAuthority = expectedDestination
            ? getSceneDestinationAuthority(state, expectedDestination)
            : null;
        return [
            {
                role: 'system',
                content: `You are the ${isHighTier ? 'high-tier World Director' : 'mid-tier Scene Transition Director'} for a persistent Harry Potter RPG. The player has explicitly chosen to close the current scene. Settle the observed scene and choose the next committed structured state as one JSON object with no Markdown. A separate low-tier performer writes the public opening after your state is accepted.

Authority and boundaries:
- Archive only events that already occurred in the supplied messages. Do not rewrite the player action.
- authorQuillEn is an out-of-character editorial postscript evaluating the player's performance in the chapter being closed. Write 180-280 English words packed with affectionate roasting, callbacks, mock awards, deadpan asides, and at least three distinct jokes grounded in specific observable player choices.
- The Author's Quill is funny rather than lyrical or therapeutic. It may tease the player's tactics and running bits, but never insult the real player, speak as an NPC, reveal hidden truths, locked clues, private motives, future events, exact hidden rolls, or information absent from the observed transcript.
- Do not merely summarize the chapter. Treat it like a sharp British humour column written by an omniscient editor who has seen the player's chaos but is contractually forbidden to spoil the plot.
- Realize committedNextSceneIntent by default. If userOverride.changed is true, honor the user's edited direction while preserving committed facts.
- The next scene must use an existing mapId and roomId from mapAuthority. Never invent or rename a room.
- If explicitDestination is supplied, nextScene.mapId and nextScene.roomId must match it exactly.
- If explicitDestination is supplied, rewrite every destination-sensitive field for that room. nextScene.nameEn and nextScene.summaryEn must each literally name explicitDestination.roomNameEn. Stale state from the old room makes the entire package invalid.
- ${isHighTier
        ? 'You may settle a major causal turn using only already committed hidden-story facts, but may not reveal a locked clue without its prewritten condition.'
        : 'Handle an ordinary scene close and location transition. Do not create hidden facts, clues, relationships, items, spells, or permanent consequences.'}
- actorStates is private structured state, not prose. It may reference only the supplied actorLibrary. Record each actor's exact existing mapId and roomId; actors may remain visible from another room when a sightline exists. Omitted actors leave the visible scene.
- Follow sceneCastPolicy. In crowded scenes prefer 2-4 active named actors, prioritize the actor who drives the scene procedure plus the player's immediate relationship focus, and rotate overexposed actors out. Other students are anonymous crowd texture.
- Any named actor required to speak or drive the next scene must be present in actorStates. Do not use actorStates to enumerate everyone who could plausibly occupy a classroom or hall.
- When a newly activated actor has no established first impression, actorStates must include a 1-24 word firstImpressionOfPlayerEn based only on the player's visible features and conduct.
- actorContinuityCapsules are sealed by actorId and contain only established social continuity. A capsule may guide only its matching actor. If hasMetPlayer is true, do not write a first-time self-introduction to the player. Treat knownActorIds as people that actor has already met. relationshipToPlayer.stageEn and sharedMemories override generic or stale relationship labels.
- Do not transfer one actor's memory, impression, or relationship knowledge to another actor or to the narrator.
- relationshipUpdates is optional and sparse. Emit it only for an actor whose view of the player materially changed because of one specific interaction in the closing scene.
- sceneMemoryEn must be one complete 8-32 word actor-centered memory: what the player did to that actor or what that actor personally witnessed, plus the actor's specific interpretation when relevant.
- Never use closureSummaryEn as a relationship memory. Do not emit routine attendance, a general scene recap, generic consequences, or the same memory for multiple actors. Omit unchanged actors and use an empty array when no distinct memory was formed.
- behavioralEnvironment describes the closing clock. Compute the opening clock from currentClock plus transitionMinutes instead of carrying the closing period forward.
- Choose transitionMinutes freely according to the time that naturally passes in the fiction. Sleep, travel, waiting, holidays, and deliberate time skips may advance as long as needed. If asleep characters wake in the next scene, allow a plausible rest unless an already established alarm, emergency, departure, or other observable cause wakes them early.
- Materially embody the opening time's daylight, sleep pressure, curfew, weather, exposure, clothing, shelter, noise, and activity implications. Do not recite them as a checklist.
- Do not output openingSegments or any public opening prose. The low-tier performer will render actorStates, summaryEn, explorationHookEn, crowdDirectionEn, and the environment into a concrete opening that requires the player's response.
- While creating nextScene, also prewrite followingSceneIntent for the scene after it. Keep that intent player-facing and free of spoilers.
- transitionMinutes must be a non-negative integer with no maximum span. Do not compress an overnight rest into the old three-hour ceiling, and do not repeat time already consumed by the last player turn.
- Use original English prose and the supplied canon-compatible voice contract.

Schema:
{
  "transitionMinutes": 0,
  "closureSummaryEn": "specific observable closure of the old scene",
  "authorQuillEn": "180-280 word OOC comic review of the player's observed chapter performance",
  "unresolvedThreadsEn": ["public unresolved thread"],
  "relationshipUpdates": [
    {
      "id": "existing_actor_id",
      "impressionOfPlayerEn": "1-16 word concrete current opinion",
      "sceneMemoryEn": "one complete 8-32 word actor-specific memory"
    }
  ],
  "nextScene": {
    "id": "unique_snake_case_id",
    "nameEn": "scene title",
    "summaryEn": "player-visible scene situation",
    "chapterEn": "chapter title",
    "mapId": "existing_map_id",
    "roomId": "existing_room_id",
    "actorStates": [
      {
        "id": "actor_id",
        "present": true,
        "currentActivityEn": "observable activity in the new scene",
        "firstImpressionOfPlayerEn": "short visible first impression when required",
        "mapId": "same_existing_map_id",
        "roomId": "existing_room_id"
      }
    ],
    "followingSceneIntent": {
      "titleEn": "player-facing next beat title",
      "summaryEn": "non-spoiler default direction",
      "triggerEn": "observable condition for ending nextScene",
      "mapId": "existing_map_id",
      "roomId": "existing_room_id",
      "tier": "medium|high"
    }
  }
}

${CANON_WIT_TONE_CONTRACT}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    tier,
                    destinationHint,
                    explicitDestination: destinationAuthority,
                    committedNextSceneIntent:
                    state.scene?.nextSceneIntent,
                    userOverride: intentOverride,
                    currentClock: state.clock,
                    currentChapter: state.chapter,
                    currentScene: state.scene,
                    currentLocation: state.location,
                    currentActors: state.actors,
                    actorLibrary:
                    projectActorLibraryForContext(
                        state.actorLibrary,
                        contextPlan,
                        {
                            includePrivate: isHighTier,
                            includeMemories: isHighTier,
                        },
                    ),
                    actorContinuityCapsules:
                    buildActorContinuityCapsules(
                        state,
                        (
                            state.actorLibrary ||
                            []
                        ).map(actor =>
                            actor.id),
                        contextPlan,
                    ),
                    sceneCastPolicy:
                    buildSceneCastRotationPolicy(
                        state,
                        expectedDestination ||
                        {},
                    ),
                    behavioralEnvironment:
                    buildBehavioralEnvironment(
                        state,
                    ),
                    currentConflict: state.conflict,
                    discoveredClues: state.clues,
                    hiddenStoryArcs: isHighTier
                        ? state.storyArcs
                        : [],
                    mapAuthority: buildMapAuthorityContext(state),
                    recentMessages: getContext().chat
                        .slice(Math.max(0, Number(state.scene?.startedMessageId || 0)))
                        .slice(
                            -contextPlan.chapterMessageLimit,
                        )
                        .map(message => ({
                            isUser: Boolean(message.is_user),
                            text: message.mes,
                            segments: message.extra?.hogwartsMud?.segments,
                        })),
                    retrievedLocalKnowledge: formatRetrievedKnowledge(retrievedKnowledge),
                }),
            },
        ];
    }

    async function generateSceneTransitionPackage(
        roleSlot,
        state,
        tier,
        destinationHint,
        expectedDestination,
        intentOverride,
        retrievedKnowledge,
        contextPlan,
    ) {
        const prompt = createSceneTransitionPrompt(
            state,
            tier,
            destinationHint,
            expectedDestination,
            intentOverride,
            retrievedKnowledge,
            contextPlan,
        );
        let response = await sendRoleRequest(roleSlot, prompt, { json: true });
        let raw = extractRoleResponseText(response);
        let lastError = null;
        const destinationAuthority = expectedDestination
            ? getSceneDestinationAuthority(state, expectedDestination)
            : null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const parsed =
                parseJsonObject(raw);
                if (
                    parsed.nextScene &&
                typeof parsed
                    .nextScene ===
                    'object'
                ) {
                    delete parsed
                        .nextScene
                        .openingSegments;
                }
                const payload = normalizeSceneTransitionPackage(
                    parsed,
                    state,
                    {
                        tier,
                    },
                );
                const validation = validateSceneTransitionPackage(payload, state, {
                    expectedMapId: expectedDestination?.mapId,
                    expectedRoomId: expectedDestination?.roomId,
                    requireDestinationGrounding: Boolean(destinationAuthority),
                });
                if (!validation.valid) {
                    throw new Error(validation.errors.join('；'));
                }
                return payload;
            } catch (error) {
                lastError = error;
                if (attempt >= 2) break;
                response = await sendRoleRequest(roleSlot, [
                    {
                        role: 'system',
                        content: `Rewrite the invalid scene-transition JSON as one complete replacement object. Preserve only the observed closure facts, committed intent or explicit user override, existing actor IDs, and world facts. Include authorQuillEn as a 180-280 word OOC comic review with specific callbacks, affectionate roasting, mock awards or deadpan asides, and at least three jokes based only on observed player choices. It must not reveal hidden facts, private motives, locked clues, future events, or hidden roll details.

The destination authority is binding. Rewrite nextScene.id, nameEn, summaryEn, actorStates.currentActivityEn, and followingSceneIntent so they form one coherent new scene at that destination. Do not retain state or physical details from the old room. If a supplied actor cannot plausibly be at the destination, mark that actor absent. nextScene.nameEn and nextScene.summaryEn must each literally contain destinationAuthority.roomNameEn.

Preserve actorContinuityCapsules from originalRequest. behavioralEnvironment describes only the closing clock; derive the opening conditions from currentClock plus transitionMinutes. Choose any non-negative transitionMinutes naturally required by sleep, travel, waiting, holidays, or another time skip, with no maximum span. Familiar actors must behave as already acquainted, and the opening must embody materially relevant time, sleep pressure, curfew, and weather effects without reciting them.

Do not output openingSegments or public opening prose. Return only valid structured transition JSON. Never invent a player action.`,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            validationError: String(error?.message || error),
                            invalidOutput: raw,
                            originalRequest: JSON.parse(prompt[1].content),
                            destinationAuthority,
                            requiredSchema: prompt[0].content,
                        }),
                    },
                ], { json: true });
                raw = extractRoleResponseText(response);
            }
        }
        throw new Error(`场景结算连续三次无效：${String(lastError?.message || lastError)}`);
    }

    async function generateSceneTransitionOpening(
        roleSlot,
        state,
        payload,
        expectedDestination,
        contextPlan,
    ) {
        const nextScene =
        payload.nextScene;
        const presentActorIds =
        new Set(
            (
                nextScene
                    .actorStates ||
                []
            )
                .filter(actor =>
                    actor.present ===
                        true)
                .map(actor =>
                    actor.id),
        );
        const projectedState =
        structuredClone(
            state,
        );
        projectedState.clock =
        payload.nextClock;
        projectedState.map = {
            ...(
                projectedState.map ||
            {}
            ),
            activeMapId:
            nextScene.mapId,
            currentLocalNodeId:
            nextScene.roomId,
        };
        projectedState.scene = {
            ...(
                projectedState.scene ||
            {}
            ),
            id: nextScene.id,
            nameEn:
            nextScene.nameEn,
            summaryEn:
            nextScene.summaryEn,
            mapId:
            nextScene.mapId,
            roomId:
            nextScene.roomId,
        };
        const existingActors =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
        projectedState.actors =
        (
            nextScene
                .actorStates ||
            []
        ).map(actor => ({
            ...(
                existingActors.get(
                    actor.id,
                ) ||
                {}
            ),
            ...actor,
        }));
        const destinationAuthority =
        getSceneDestinationAuthority(
            state,
            expectedDestination || {
                mapId:
                    nextScene.mapId,
                roomId:
                    nextScene.roomId,
            },
        );
        const prompt = [
            {
                role: 'system',
                content: `You are the low-tier Scene Opening Performer for a persistent Harry Potter RPG. A higher-tier director has already committed the next scene's state. Render that state as vivid player-facing English prose and NPC dialogue. Return exactly one JSON object with a segments array and no Markdown.

Boundaries:
- Do not change the committed clock, map, room, cast, activities, life states, items, facts, hooks, or following intent.
- The player is already at destinationAuthority. Begin inside the committed destination, not travelling toward it.
- Never speak, think, decide, emote, inspect, move, or act for the player. End at a concrete prompt for the player's response.
- Dialogue may use only a supplied present actor ID. Never introduce or name another actor.
- actorStates is private state, not text to paraphrase. Never write "remains visible in the scene", "is still present", a cast roll call, or one sentence per actor.
- It is valid to omit a present actor from the opening prose when that actor is not important to the immediate camera. Preserve them silently in state.
- In a crowded scene, focus on at most 2-3 named actors. Let everyone else remain anonymous simultaneous crowd texture.
- Use currentActivityEn as blocking guidance, then dramatize only the actions needed for this opening. Do not mechanically restate it.
- Use explorationHookEn as an optional concrete detail, not an instruction label. Use crowdDirectionEn as background motion, not an attendance list.
- Preserve actor-specific continuity. One actor cannot use another actor's memories or private knowledge.
- The first narration segment should identify destinationAuthority.roomNameEn naturally.
- Write 2-6 ordered segments, including at least one narration segment, totalling roughly 180-420 English words.
- Follow the supplied canon-compatible wit contract without copying published prose.

Schema:
{
  "segments": [
    {
      "type": "narration",
      "textEn": "observable opening prose"
    },
    {
      "type": "dialogue",
      "actorId": "supplied_present_actor_id",
      "textEn": "spoken words only"
    }
  ]
}

${CANON_CAST_IDENTITY_CONTRACT}

${CANON_WIT_TONE_CONTRACT}`,
            },
            {
                role: 'user',
                content:
                JSON.stringify({
                    openingClock:
                        payload
                            .nextClock,
                    destinationAuthority,
                    nextScene: {
                        ...nextScene,
                        openingSegments:
                            undefined,
                    },
                    presentActorStates:
                        (
                            nextScene
                                .actorStates ||
                            []
                        ).filter(actor =>
                            actor.present ===
                                true),
                    actorProfiles:
                        projectActorLibraryForContext(
                            (
                                state
                                    .actorLibrary ||
                                []
                            ).filter(actor =>
                                presentActorIds
                                    .has(
                                        actor.id,
                                    )),
                            contextPlan,
                            {
                                includePrivate:
                                    false,
                                includeMemories:
                                    false,
                            },
                        ),
                    actorContinuityCapsules:
                        buildActorContinuityCapsules(
                            state,
                            [
                                ...presentActorIds,
                            ],
                            contextPlan,
                        ),
                    behavioralEnvironment:
                        buildBehavioralEnvironment(
                            projectedState,
                        ),
                    currentMaterialState:
                        buildCurrentMaterialState(
                            projectedState,
                        ),
                }),
            },
        ];
        let raw = '';
        let lastError = null;
        for (
            let attempt = 0;
            attempt < 2;
            attempt++
        ) {
            try {
                const response =
                await sendRoleRequest(
                    roleSlot,
                    attempt === 0
                        ? prompt
                        : [
                            {
                                role:
                                    'system',
                                content:
                                    'Repair the scene-opening performance. Return only a JSON object with 2-6 ordered segments. Keep all committed state unchanged. Use only supplied present actor IDs for dialogue. Do not enumerate the cast, restate actorStates, use "remains visible in the scene", or act for the player.',
                            },
                            {
                                role: 'user',
                                content:
                                    JSON.stringify({
                                        validationError:
                                            String(
                                                lastError
                                                    ?.message ||
                                                lastError ||
                                                '',
                                            ),
                                        invalidOutput:
                                            raw,
                                        originalRequest:
                                            JSON.parse(
                                                prompt[1]
                                                    .content,
                                            ),
                                    }),
                            },
                        ],
                    {
                        json: true,
                    },
                );
                raw =
                extractRoleResponseText(
                    response,
                );
                const parsed =
                parseJsonObject(raw);
                const segments =
                stripSyntheticSceneOpeningActorSegments(
                    parsed.segments,
                );
                const candidate =
                structuredClone(
                    payload,
                );
                candidate.nextScene
                    .openingSegments =
                segments;
                const validation =
                validateSceneTransitionPackage(
                    candidate,
                    state,
                    {
                        expectedMapId:
                            nextScene.mapId,
                        expectedRoomId:
                            nextScene.roomId,
                        requireDestinationGrounding:
                            Boolean(
                                destinationAuthority,
                            ),
                    },
                );
                if (!validation.valid) {
                    throw new Error(
                        validation.errors
                            .join('；'),
                    );
                }
                return candidate;
            } catch (error) {
                lastError = error;
            }
        }
        console.warn(
            '[Hogwarts MUD] Low-tier scene opening failed; using the deterministic short opening',
            lastError,
        );
        return payload;
    }

    async function localizeSceneTransitionPackage(payload) {
        if (!getSettings().translationEnabled) {
            return payload;
        }
        const nextScene = payload.nextScene;
        const values = [
            payload.closureSummaryEn,
            payload.authorQuillEn,
            ...(payload.unresolvedThreadsEn || []),
            nextScene.nameEn,
            nextScene.summaryEn,
            nextScene.chapterEn,
            ...(nextScene.actorStates || []).map(actor => actor.currentActivityEn),
            ...(nextScene.openingSegments || []).map(segment => segment.textEn),
            nextScene.followingSceneIntent.titleEn,
            nextScene.followingSceneIntent.summaryEn,
            nextScene.followingSceneIntent.triggerEn,
        ];
        const translated = await translateOpeningValues(values);
        let cursor = 0;
        return {
            ...payload,
            translationProvider:
            getSettings()
                .translationProvider,
            closureSummary: translated[cursor++],
            authorQuill: translated[cursor++],
            unresolvedThreads: (payload.unresolvedThreadsEn || [])
                .map(() => translated[cursor++]),
            nextScene: {
                ...nextScene,
                name: translated[cursor++],
                summary: translated[cursor++],
                chapter: translated[cursor++],
                actorStates: (nextScene.actorStates || []).map(actor => ({
                    ...actor,
                    currentActivity: translated[cursor++],
                })),
                openingSegments: (nextScene.openingSegments || []).map(segment => ({
                    ...segment,
                    textZh: translated[cursor++],
                })),
                followingSceneIntent: {
                    ...nextScene.followingSceneIntent,
                    title: translated[cursor++],
                    summary: translated[cursor++],
                    trigger: translated[cursor++],
                },
            },
        };
    }

    function getCurrentSceneMessageIds(state) {
        const chat = getContext().chat;
        const sceneId = state.scene?.id;
        const isFirstScene = !(state.sceneArchive || []).length;
        const openingMessageId = isFirstScene
            ? chat.findIndex(message =>
                message.extra?.hogwartsMud?.role === 'opening_narrative')
            : -1;
        const start = Math.max(
            0,
            Math.min(
                Number(state.scene?.startedMessageId || 0),
                openingMessageId >= 0
                    ? openingMessageId
                    : Number.POSITIVE_INFINITY,
            ),
        );
        const ids = [];
        chat.forEach((message, messageId) => {
            if (messageId < start) return;
            if (message.is_user ||
            message.extra?.hogwartsMud?.sceneId === sceneId ||
            (isFirstScene &&
                message.extra?.hogwartsMud?.role === 'opening_narrative') ||
            (isFirstScene &&
                Array.isArray(message.extra?.hogwartsMud?.segments))) {
                ids.push(messageId);
            }
        });
        return ids;
    }

    function buildSceneArchiveEntry(state, payload, tier) {
        const messageIds =
        getCurrentSceneMessageIds(
            state,
        );
        const presence =
        projectSceneArchivePresence(
            state,
            {
                sceneId:
                    state.scene.id,
                messageIds,
            },
        );
        return {
            id: state.scene.id,
            name: state.scene.name,
            nameEn: state.scene.nameEn,
            summary: state.scene.summary,
            summaryEn: state.scene.summaryEn,
            closureSummary: payload.closureSummary || payload.closureSummaryEn,
            closureSummaryEn: payload.closureSummaryEn,
            authorQuill:
            payload.authorQuill ||
            payload.authorQuillEn,
            authorQuillEn: payload.authorQuillEn,
            unresolvedThreads: payload.unresolvedThreads || payload.unresolvedThreadsEn || [],
            unresolvedThreadsEn: payload.unresolvedThreadsEn || [],
            startedClock: state.scene.startedClock || state.clock,
            endedClock: state.clock,
            location: state.location,
            mapId: state.scene.mapId || state.map?.activeMapId,
            roomId: state.scene.roomId || state.map?.currentLocalNodeId,
            activeInteractionActorIds:
            presence
                .activeInteractionActorIds,
            localOccupantActorIds:
            presence
                .localOccupantActorIds,
            localCohortIds:
            presence.localCohortIds,
            events: presence.events,
            actorIds:
            presence.actorIds,
            messageIds,
            timelineEntries: structuredClone(
                state.scene.timelineEntries || [],
            ),
            tier,
            translationProvider:
            payload
                .translationProvider ||
            '',
            status: 'closed',
            closedAt: new Date().toISOString(),
        };
    }

    function buildSceneTransitionMessage(payload, state) {
        const segments = payload.nextScene.openingSegments;
        const sourceEn = composeSceneSegments(segments, state.actorLibrary, 'en');
        const translatedZh = composeSceneSegments(segments, state.actorLibrary, 'zh');
        const hasTranslation = getSettings().translationEnabled &&
        segments.some(segment => String(segment.textZh || '').trim()) &&
        translatedZh !== sourceEn;
        return {
            name: 'Scene',
            is_user: false,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: sourceEn,
            extra: {
                hogwartsMud: {
                    sourceEn,
                    translatedZh: hasTranslation ? translatedZh : undefined,
                    provider: hasTranslation
                        ? payload
                            .translationProvider ||
                        getSettings()
                            .translationProvider
                        : undefined,
                    translatedAt: hasTranslation ? Date.now() : undefined,
                    translationVersion: hasTranslation
                        ? TRANSLATION_FORMAT_VERSION
                        : undefined,
                    role: 'scene_opening',
                    sceneId: payload.nextScene.id,
                    segments,
                    sceneTransition: {
                        closureSummaryEn: payload.closureSummaryEn,
                        transitionMinutes: payload.transitionMinutes,
                        diagnostics: {
                            version: 1,
                            actorStateIds:
                                (
                                    payload
                                        .nextScene
                                        ?.actorStates ||
                                    []
                                ).map(actor =>
                                    actor.id),
                            presentActorStateIds:
                                (
                                    payload
                                        .nextScene
                                        ?.actorStates ||
                                    []
                                )
                                    .filter(actor =>
                                        actor.present ===
                                            true)
                                    .map(actor =>
                                        actor.id),
                            committedPresentActorIds:
                                (
                                    state.actors ||
                                    []
                                )
                                    .filter(actor =>
                                        actor.present ===
                                            true)
                                    .map(actor =>
                                        actor.id),
                            activeInteractionActorIds:
                                structuredClone(
                                    state
                                        .activeInteractionActorIds ||
                                    [],
                                ),
                            localPresence:
                                state.localPresence
                                    ? {
                                        mapId:
                                            state
                                                .localPresence
                                                .mapId,
                                        roomId:
                                            state
                                                .localPresence
                                                .roomId,
                                        occupantActorIds:
                                            structuredClone(
                                                state
                                                    .localPresence
                                                    .occupantActorIds ||
                                                [],
                                            ),
                                    }
                                    : null,
                        },
                    },
                    authorQuill:
                    payload.authorQuill ||
                    payload.authorQuillEn,
                    authorQuillEn: payload.authorQuillEn,
                },
                ...(hasTranslation
                    ? { display_text: translatedZh }
                    : {}),
            },
        };
    }

    async function runSceneTransition({
        tier = 'medium',
        destinationHint = '',
    } = {}) {
        if (jobRegistry.sceneTransition) {
            return jobRegistry.sceneTransition;
        }
        const context = getContext();
        let state = getMudState();
        if (!state?.scene || state.phase !== 'playing') {
            throw new Error('当前没有可以结束的活动场景。');
        }
        ensureSceneLifecycleState(state);
        const committedIntent = state.scene.nextSceneIntent;
        const defaultHint = formatNextSceneIntent(committedIntent);
        const destinationChanged = destinationHint.trim() !==
        defaultHint.trim();
        const tierChanged = tier !== committedIntent.tier;
        const intentOverride = {
            changed: destinationChanged || tierChanged,
            destinationChanged,
            tierChanged,
            text: destinationHint,
            requestedTier: tier,
        };
        const slots = resolveRoleSlots(state.modelSlots);
        const roleSlot = tier === 'high' ? slots.high : slots.medium;
        const contextPlan = createContextBudgetPlan(
            roleSlot.contextSize,
            roleSlot.maxResponseLength,
        );
        if (!roleSlot.profileId) {
            throw new Error(`未配置${tier === 'high' ? '高档' : '中档'} Connection Profile。`);
        }
        const expectedDestination = destinationChanged
            ? findSceneDestination(destinationHint, state)
            : {
                mapId: committedIntent.mapId,
                roomId: committedIntent.roomId,
            };

        jobRegistry.sceneTransition = (async () => {
            jobRegistry.sceneTransitionActive = true;
            const residentAdmission =
            admitCurrentLocationResidents(
                state,
                {
                    mapId:
                        expectedDestination
                            ?.mapId,
                    roomId:
                        expectedDestination
                            ?.roomId,
                    activate: false,
                },
            );
            state =
            residentAdmission.state;
            context.chatMetadata
                .hogwartsMud =
            state;
            state.sceneTransition = {
                status: 'resolving',
                tier,
                error: '',
                requestedAt: new Date().toISOString(),
                settledAt: null,
                destinationHint,
                expectedDestination,
                intentOverride,
            };
            await context.saveMetadata();
            renderAll();
            try {
                const entityIds = [
                    state.scene.id,
                    state.map?.activeMapId,
                    state.map?.currentLocalNodeId,
                    expectedDestination?.roomId,
                    ...(state.actors || []).filter(actor => actor.present !== false)
                        .map(actor => actor.id),
                ].filter(Boolean);
                const retrievedKnowledge = await retrieveLocalKnowledge(
                    `Close scene ${state.scene.nameEn || state.scene.name}. ` +
                `Next destination: ${destinationHint || 'director choice'}.`,
                    entityIds,
                    {
                        includeLockedClues: true,
                        limit: contextPlan.ragLimit,
                    },
                );
                let payload = await generateSceneTransitionPackage(
                    roleSlot,
                    state,
                    tier,
                    destinationHint,
                    expectedDestination,
                    intentOverride,
                    retrievedKnowledge,
                    contextPlan,
                );
                const openingContextPlan =
                createContextBudgetPlan(
                    slots.low
                        .contextSize,
                    slots.low
                        .maxResponseLength,
                );
                if (
                    !slots.low.profileId
                ) {
                    throw new Error(
                        '未配置低档 Connection Profile，无法生成场景开场。',
                    );
                }
                payload =
                await generateSceneTransitionOpening(
                    slots.low,
                    state,
                    payload,
                    expectedDestination,
                    openingContextPlan,
                );
                try {
                    payload = await localizeSceneTransitionPackage(payload);
                } catch (translationError) {
                    console.warn('[Hogwarts MUD] Scene transition translation failed; using English', translationError);
                }
                const archiveEntry = buildSceneArchiveEntry(state, payload, tier);
                const startedMessageId = context.chat.length;
                const nextState = applySceneTransition(
                    state,
                    payload,
                    archiveEntry,
                    {
                        expectedMapId: expectedDestination?.mapId,
                        expectedRoomId: expectedDestination?.roomId,
                        startedMessageId,
                        tier,
                    },
                );
                const message = buildSceneTransitionMessage(payload, nextState);
                context.chatMetadata.hogwartsMud = nextState;
                context.chat.push(message);
                await context.saveMetadata();
                await context.saveChat();
                const interiorState =
                await ensureCurrentInteriorMap();
                const settledState =
                interiorState ||
                getMudState();
                await syncLocalKnowledge();
                applySystemPrompt();
                renderAll();
                if (settledState.dailyDirector?.date !== getWorldDate(settledState.clock)) {
                    await ensureDailyDirectorPlan();
                }
                setTimeout(
                    () => {
                        void ensureSocialDirectorCatchup({
                            force: true,
                        });
                    },
                    0,
                );
                toastr.success(`旧场景已封存，当前场景切换到${settledState.location}。`);
                return settledState;
            } catch (error) {
                state = getMudState();
                state.sceneTransition = {
                    ...state.sceneTransition,
                    status: 'failed',
                    error: String(error?.cause?.message || error?.message || error),
                    settledAt: null,
                };
                await context.saveMetadata();
                renderAll();
                throw error;
            } finally {
                jobRegistry.sceneTransitionActive = false;
                jobRegistry.sceneTransition = null;
                renderAll();
            }
        })();
        return jobRegistry.sceneTransition;
    }

    return {
        createSceneTransitionPrompt,
        generateSceneTransitionPackage,
        generateSceneTransitionOpening,
        localizeSceneTransitionPackage,
        getCurrentSceneMessageIds,
        buildSceneArchiveEntry,
        buildSceneTransitionMessage,
        runSceneTransition,
    };
}
