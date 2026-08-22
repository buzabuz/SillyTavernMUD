import {
    projectCalendarSceneContext,
} from '../domain/calendar-projection.js';
import {
    applyCommittedSceneOpeningExperience as applyCommittedSceneOpeningExperienceDeterministically,
} from '../domain/archive-projection.js';
import {
    NARRATIVE_AUTHORITY_PROMPT_CONTRACT,
    NARRATIVE_PROMPT_ACCESS,
    buildNarrativePromptContext,
    getHistoricalKnowledgeRecords,
    projectNarrativePromptInput,
} from '../domain/narrative-prompt-context.js';
import {
    MODEL_OUTPUT_EVIDENCE_AUTHORITY,
    collectNonEnglishAuthorityFields,
    createModelLanguageMismatch,
    partitionModelSegments,
} from '../domain/model-language-adoption.js';
import {
    getMapRooms,
} from '../domain/map-access.js';
import {
    getInteriorMount,
    listMapsByMountHierarchy,
} from '../domain/interior-mount.js';

function isFixedMomentContext(
    transitionContext,
) {
    return [
        'calendar_moment',
        'timeline_moment',
    ].includes(
        transitionContext?.kind,
    );
}

function getTransitionCalendarContext(
    state,
    transitionContext,
    {
        opening = false,
    } = {},
) {
    if (
        isFixedMomentContext(
            transitionContext,
        )
    ) {
        return {
            entries:
                structuredClone(
                    transitionContext
                        .calendarEntries ||
                    [],
                ),
            storySources:
                structuredClone(
                    transitionContext
                        .calendarStorySources ||
                    [],
                ),
        };
    }
    if (opening) {
        return {
            entries: [],
            storySources: [],
        };
    }
    if (
        !Array.isArray(
            state?.calendar
                ?.entries,
        )
    ) {
        return {
            entries: [],
            storySources: [],
        };
    }
    return projectCalendarSceneContext(
        state,
    );
}

function projectTransitionLocationDirectory(
    state,
) {
    return listMapsByMountHierarchy(
        state.map || {},
    ).map(({
        map,
        depth,
    }) => ({
        id: map.id,
        nameEn:
            map.nameEn ||
            map.id,
        depth,
        mount:
            getInteriorMount(map),
        rooms:
            getMapRooms(
                map,
                state.map,
            ).map(room => ({
                id: room.id,
                nameEn:
                    room.nameEn ||
                    room.id,
                kind:
                    room.kind ||
                    'room',
                ...(
                    room.levelId
                        ? {
                            levelId:
                                room
                                    .levelId,
                        }
                        : {}
                ),
                ...(
                    room.access
                        &&
                    room.access !==
                        'public'
                        ? {
                            access:
                                room
                                    .access,
                        }
                        : {}
                ),
            })),
    }));
}

function collectTransitionActorIds(
    state,
    sceneCastPolicy,
    calendarEntries,
    expectedDestination,
) {
    const destinationMapId =
        expectedDestination
            ?.mapId ||
        '';
    const destinationRoomId =
        expectedDestination
            ?.roomId ||
        '';
    return [
        ...new Set([
            ...(
                sceneCastPolicy
                    .currentActiveActorIds ||
                []
            ),
            ...(
                state
                    .activeInteractionActorIds ||
                []
            ),
            ...calendarEntries
                .flatMap(entry =>
                    entry
                        .participantIds ||
                    []),
            ...(
                state.actors ||
                []
            )
                .filter(actor =>
                    destinationMapId &&
                    (
                        actor.mapId ===
                            destinationMapId ||
                        (
                            actor.mapId ===
                                undefined &&
                            state.map
                                ?.activeMapId ===
                                destinationMapId
                        )
                    ) &&
                    (
                        !destinationRoomId ||
                        actor.roomId ===
                            destinationRoomId
                    ))
                .map(actor =>
                    actor.id),
        ].filter(Boolean)),
    ].slice(0, 12);
}

function projectTransitionActorCards(
    state,
    actorIds,
    {
        includePrivate = false,
    } = {},
) {
    const allowedIds =
        new Set(actorIds);
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
    return (
        state.actorLibrary ||
        []
    )
        .filter(actor =>
            allowedIds.has(actor.id))
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
                aliases:
                    actor.aliases ||
                    [],
                roleEn:
                    actor.roleEn ||
                    '',
                publicProfile:
                    actor
                        .publicProfile ||
                    {},
                performanceCore:
                    actor
                        .performanceCore ||
                    {},
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
                        runtime
                            .lifeStatus ||
                        'alive',
                    lifeStatusPermanent:
                        runtime
                            .lifeStatusPermanent ===
                        true,
                    lifeStatusDetailEn:
                        runtime
                            .lifeStatusDetailEn ||
                        '',
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
                },
                ...(includePrivate
                    ? {
                        identity:
                            actor.identity,
                        privateFacts:
                            actor
                                .privateFacts,
                    }
                    : {}),
            };
        });
}

export function validateLowSceneOpeningOutput(
    payload,
    presentActorIds = new Set(),
) {
    const errors = [];
    if (
        !payload ||
        typeof payload !==
            'object' ||
        Array.isArray(payload)
    ) {
        return {
            valid: false,
            errors: [
                '低档场景开场必须是对象。',
            ],
        };
    }
    const unknownRootKeys =
        Object.keys(payload)
            .filter(key =>
                key !== 'segments');
    if (unknownRootKeys.length) {
        errors.push(
            `低档场景开场不得写入字段：${unknownRootKeys.join(', ')}。`,
        );
    }
    const segments =
        Array.isArray(
            payload.segments,
        )
            ? payload.segments
            : [];
    if (
        segments.length < 2 ||
        segments.length > 6
    ) {
        errors.push(
            '低档场景开场必须包含 2–6 个分段。',
        );
    }
    let narrationCount = 0;
    segments.forEach((
        segment,
        index,
    ) => {
        const allowedKeys =
            segment?.type ===
                'narration'
                ? new Set([
                    'type',
                    'textEn',
                    'rawText',
                    'language',
                    'authority',
                ])
                : segment?.type ===
                    'dialogue'
                    ? new Set([
                        'type',
                        'actorId',
                        'textEn',
                        'rawText',
                        'language',
                        'authority',
                        'historicalClaims',
                    ])
                    : null;
        if (!allowedKeys) {
            errors.push(
                `低档场景开场第 ${index + 1} 段类型无效。`,
            );
            return;
        }
        const unknown =
            Object.keys(segment)
                .filter(key =>
                    !allowedKeys.has(key));
        if (unknown.length) {
            errors.push(
                `低档场景开场第 ${index + 1} 段不得写入字段：${unknown.join(', ')}。`,
            );
        }
        if (
            segment.type ===
                'dialogue' &&
            segment.historicalClaims !==
                undefined
        ) {
            if (
                !Array.isArray(
                    segment
                        .historicalClaims,
                )
            ) {
                errors.push(
                    `低档场景开场第 ${index + 1} 段 historicalClaims 必须是数组。`,
                );
            } else {
                segment
                    .historicalClaims
                    .forEach((
                        claim,
                        claimIndex,
                    ) => {
                        const claimKeys =
                            claim &&
                            typeof claim ===
                                'object' &&
                            !Array.isArray(
                                claim,
                            )
                                ? Object.keys(
                                    claim,
                                )
                                : [];
                        const unknownClaimKeys =
                            claimKeys
                                .filter(key =>
                                    ![
                                        'claimTextEn',
                                        'sourceEventIds',
                                    ].includes(
                                        key,
                                    ));
                        if (
                            claimKeys.length !==
                                2 ||
                            unknownClaimKeys
                                .length ||
                            !String(
                                claim
                                    ?.claimTextEn ||
                                '',
                            ).trim() ||
                            !Array.isArray(
                                claim
                                    ?.sourceEventIds,
                            )
                        ) {
                            errors.push(
                                `低档场景开场第 ${index + 1} 段 historicalClaims[${claimIndex}] 无效。`,
                            );
                        }
                    });
            }
        }
        const text =
            String(
                segment.textEn ||
                segment.rawText ||
                '',
            ).trim();
        if (!text) {
            errors.push(
                `低档场景开场第 ${index + 1} 段为空。`,
            );
        }
        if (
            segment.rawText &&
            (
                segment.authority !==
                    MODEL_OUTPUT_EVIDENCE_AUTHORITY ||
                !segment.language
            )
        ) {
            errors.push(
                `低档场景开场第 ${index + 1} 段 rawText 缺少语言证据标记。`,
            );
        }
        if (
            segment.type ===
                'narration'
        ) {
            narrationCount += 1;
        } else if (
            !presentActorIds.has(
                segment.actorId,
            )
        ) {
            errors.push(
                `低档场景开场第 ${index + 1} 段引用了不在场人物 ${segment.actorId || '?'}。`,
            );
        }
    });
    if (!narrationCount) {
        errors.push(
            '低档场景开场至少需要一个 narration 分段。',
        );
    }
    return {
        valid:
            errors.length === 0,
        errors,
        segments,
    };
}

export function projectAuthoritativeSceneItems(
    worldState = {},
    synchronizeHeldItemLocations = items =>
        items,
) {
    const mapId =
        worldState.map?.activeMapId ||
        worldState.scene?.mapId ||
        '';
    const roomId =
        worldState.map
            ?.currentLocalNodeId ||
        worldState.scene?.roomId ||
        '';
    return synchronizeHeldItemLocations(
        worldState.items || [],
        {
            playerMapId: mapId,
            playerRoomId: roomId,
            actors:
                worldState.actors ||
                [],
            clock:
                worldState.clock ||
                '',
        },
    )
        .filter(item =>
            item.visibility !==
                'hidden' &&
            [
                'whole',
                'remains',
            ].includes(
                item.physicalForm,
            ))
        .map(item => ({
            id: item.id,
            labelEn:
                item.labelEn ||
                item.label ||
                item.id,
            ownerId: item.ownerId,
            holderId: item.holderId,
            location:
                structuredClone(
                    item.location || {
                        mapId: item.mapId,
                        roomId: item.roomId,
                        placement:
                            item.holderId
                                ? 'with_holder'
                                : 'in_room',
                    },
                ),
            state: item.state,
            physicalForm:
                item.physicalForm,
            isEquipped:
                item.isEquipped ===
                true,
            transferMode:
                item.transferMode ||
                'none',
        }));
}

export function getSceneTransitionRetrievalOptions(
    tier,
    limit,
) {
    return {
        includeLockedClues:
            tier === 'high',
        limit,
    };
}

export function createSceneTransitionWorkflow(ports) {
    const {
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY =
        '',
        admitCurrentLocationResidents,
        applyCommittedSceneOpeningExperience =
        applyCommittedSceneOpeningExperienceDeterministically,
        applySceneTransition,
        applySystemPrompt,
        buildActorContinuityCapsules,
        buildBehavioralEnvironment,
        buildSceneCastRotationPolicy,
        composeSceneSegments,
        createContextBudgetPlan,
        enqueueLocalizationCandidates =
        async () => {},
        ensureCurrentInteriorMap,
        ensureSceneLifecycleState,
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
        projectSceneArchivePresence,
        recordTurnDiagnostic =
        () => {},
        renderAll,
        resolveRoleSlots,
        retrieveLocalKnowledge,
        sendSceneOpeningRequest,
        sendSceneTransitionRequest,
        synchronizeHeldItemLocations,
        syncLocalKnowledge,
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
        transitionContext = {},
    ) {
        const isHighTier = tier === 'high';
        const destinationAuthority = expectedDestination
            ? getSceneDestinationAuthority(state, expectedDestination)
            : null;
        const fixedMoment =
            isFixedMomentContext(
                transitionContext,
            );
        const calendarClock =
            fixedMoment
                ? transitionContext
                    .fixedClock
                : state.clock;
        const calendarContext =
            getTransitionCalendarContext(
                state,
                transitionContext,
            );
        const calendarEntries =
            calendarContext.entries;
        const calendarStorySources =
            calendarContext.storySources;
        const sceneCastPolicy =
            buildSceneCastRotationPolicy(
                state,
                expectedDestination ||
                {},
            );
        const transitionActorIds =
            collectTransitionActorIds(
                state,
                sceneCastPolicy,
                calendarEntries,
                expectedDestination,
            );
        const calendarMomentGuidance =
            transitionContext.kind ===
                'calendar_moment'
                ? `- This is a Calendar Moment. nextClock must be exactly ${transitionContext.fixedClock}; do not choose another time.
- calendarMoment.suggestedDestination is context, not a binding destination. Choose the final valid room under normal Scene Transition authority.
- calendarMoment.calendarEntries contains only the schedule explicitly selected by the player. Do not infer attendance from other schedules at the same clock.`
                : transitionContext.kind ===
                    'timeline_moment'
                    ? `- This is a free Timeline Moment. nextClock must be exactly ${transitionContext.fixedClock}; do not choose another time.
- explicitDestination is the player's authoritative location choice.
- calendarEntries must remain empty. Do not infer attendance from schedules overlapping this clock.`
                    : '';
        const presentActorIds =
            (
                state.actors ||
                []
            )
                .filter(actor =>
                    actor.present !==
                    false)
                .map(actor =>
                    actor.id);
        const narrativeContext =
            buildNarrativePromptContext(
                state,
                retrievedKnowledge,
                {
                    actorIds:
                        presentActorIds,
                    access:
                        isHighTier
                            ? NARRATIVE_PROMPT_ACCESS
                                .DEDICATED_HIGH
                            : NARRATIVE_PROMPT_ACCESS
                                .MEDIUM,
                },
            );
        const actorKnowledge =
            buildActorContinuityCapsules(
                state,
                presentActorIds,
                contextPlan,
            );
        return [
            {
                role: 'system',
                content: `You are the ${isHighTier ? 'high-tier World Director' : 'mid-tier Scene Transition Director'} for a persistent Harry Potter RPG. The player has explicitly chosen to close the current scene. Settle the observed scene and choose the next committed structured state as one JSON object with no Markdown. A separate low-tier performer writes the public opening after your state is accepted.

${NARRATIVE_AUTHORITY_PROMPT_CONTRACT}

Authority and boundaries:
- Archive only events that already occurred in the supplied messages. Do not rewrite the player action.
- authorQuillEn is an out-of-character editorial postscript evaluating the player's performance in the chapter being closed. Write 180-280 English words packed with affectionate roasting, callbacks, mock awards, deadpan asides, and at least three distinct jokes grounded in specific observable player choices.
- The Author's Quill is funny rather than lyrical or therapeutic. It may tease the player's tactics and running bits, but never insult the real player, speak as an NPC, reveal hidden truths, locked clues, private motives, future events, exact hidden rolls, or information absent from the observed transcript.
- Do not merely summarize the chapter. Treat it like a sharp British humour column written by an omniscient editor who has seen the player's chaos but is contractually forbidden to spoil the plot.
- Realize committedNextSceneIntent by default. If userOverride.changed is true, honor the user's edited direction while preserving committed facts.
- The next scene must use an existing mapId and roomId from locationDirectory. Never invent or rename a room.
- If explicitDestination is supplied, nextScene.mapId and nextScene.roomId must match it exactly.
- If explicitDestination is supplied, rewrite every destination-sensitive field for that room. nextScene.nameEn and nextScene.summaryEn must each literally name explicitDestination.roomNameEn. Stale state from the old room makes the entire package invalid.
- ${isHighTier
        ? 'You may settle a major causal turn using only already committed hidden-story facts, but may not reveal a locked clue without its prewritten condition.'
        : 'Handle an ordinary scene close and location transition. Do not create hidden facts, clues, relationships, items, spells, or permanent consequences.'}
- actorStates is private structured state, not prose. It may reference only the supplied transitionActorCards. Record each actor's exact existing mapId and roomId; actors may remain visible from another room when a sightline exists. Omitted actors leave the visible scene.
- Every active actor in actorStates must explicitly submit currentIntentEn or explicitly clear currentIntentEn with an empty string.
- Follow sceneCastPolicy. In crowded scenes prefer 2-4 active named actors, prioritize the actor who drives the scene procedure plus the player's immediate relationship focus, and rotate overexposed actors out. Other students are anonymous crowd texture.
- Any named actor required to speak or drive the next scene must be present in actorStates. Do not use actorStates to enumerate everyone who could plausibly occupy a classroom or hall.
- When a newly activated actor has no established first impression, actorStates must include a 1-24 word firstImpressionOfPlayerEn based only on the player's visible features and conduct.
- actorContinuityCapsules are sealed by actorId and contain only established social continuity. A capsule may guide only its matching actor. If hasMetPlayer is true, do not write a first-time self-introduction to the player. Treat knownActorIds as people that actor has already met. The supplied relationship stance, Schema expectations, and supporting Events override generic assumptions.
- Do not transfer one actor's memory, impression, or relationship knowledge to another actor or to the narrator.
- globalChronicleSummaryEn must compress the closed Scene's committed timeline into 40-80 English words and at most 640 characters. Preserve durable causes, decisions, consequences and unresolved effects using only supplied facts.
- globalChronicleSummaryEn is a semantic cross-Scene chronicle, not a copy of closureSummaryEn, an opening summary, or an actor-specific feeling.
- behavioralEnvironment describes the closing clock. Compute the opening clock from currentClock plus transitionMinutes instead of carrying the closing period forward.
- Choose transitionMinutes freely according to the time that naturally passes in the fiction. Sleep, travel, waiting, holidays, and deliberate time skips may advance as long as needed. If asleep characters wake in the next scene, allow a plausible rest unless an already established alarm, emergency, departure, or other observable cause wakes them early.
- Materially embody the opening time's daylight, sleep pressure, curfew, weather, exposure, clothing, shelter, noise, and activity implications. Do not recite them as a checklist.
- authoritySnapshot.currentItems is the binding visible tracked-Item state before transition. ownerId is social ownership, while holderId alone controls physical possession. Do not transfer, restore, repair, damage, destroy, relocate, or otherwise change an Item in nextScene prose or actor activities.
- Do not output openingSegments or any public opening prose. The low-tier performer will render actorStates, summaryEn, explorationHookEn, crowdDirectionEn, and the environment into a concrete opening that requires the player's response.
- calendarEntries contains only schedules explicitly claimed by the current Scene, or by the selected schedule for a Calendar Moment. calendarStorySources contains their public beat/storyline sources. Never infer attendance from time overlap, and never write, cancel, reschedule or settle Calendar state.
- While creating nextScene, also prewrite followingSceneIntent for the scene after it. Keep that intent player-facing and free of spoilers.
- transitionMinutes must be a non-negative integer with no maximum span. Do not compress an overnight rest into the old three-hour ceiling, and do not repeat time already consumed by the last player turn.
- Use original English prose and the supplied canon-compatible voice contract.
${calendarMomentGuidance}

${NPC_IDENTITY_PROMPT_BOUNDARY}

Schema:
{
  "transitionMinutes": 0,
  "closureSummaryEn": "specific observable closure of the old scene",
  "globalChronicleSummaryEn": "40-80 word semantic chronicle of the closed scene",
  "authorQuillEn": "180-280 word OOC comic review of the player's observed chapter performance",
  "unresolvedThreadsEn": ["public unresolved thread"],
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
        "currentIntentEn": "explicit next-scene intent, or empty string to clear it",
        "lifeStatus": "alive|injured|incapacitated|missing|dead",
        "lifeStatusPermanent": false,
        "lifeStatusDetailEn": "public current life-state explanation",
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
                content: JSON.stringify(
                    projectNarrativePromptInput({
                        tier,
                        authoritySnapshot:
                    Object.fromEntries(
                        Object.entries(
                            narrativeContext
                                .authoritySnapshot,
                        ).filter(([
                            key,
                        ]) =>
                            key !==
                            'currentActors'),
                    ),
                        destinationHint,
                        explicitDestination: destinationAuthority,
                        committedNextSceneIntent:
                    state.scene?.nextSceneIntent,
                        userOverride: intentOverride,
                        currentClock: state.clock,
                        calendarClock,
                        calendarEntries,
                        calendarStorySources,
                        currentChapterEn:
                            state.chapterEn,
                        currentScene: state.scene,
                        currentLocation: {
                            mapId:
                                state.scene
                                    ?.mapId ||
                                state.map
                                    ?.activeMapId ||
                                '',
                            roomId:
                                state.scene
                                    ?.roomId ||
                                state.map
                                    ?.currentLocalNodeId ||
                                '',
                        },
                        calendarMoment:
                    transitionContext.kind ===
                        'calendar_moment'
                        ? {
                            targetClock:
                                transitionContext
                                    .fixedClock,
                            suggestedDestination:
                                transitionContext
                                    .suggestedDestination,
                            targetEntry:
                                transitionContext
                                    .targetEntry,
                            calendarEntries:
                                calendarEntries,
                            calendarStorySources,
                        }
                        : null,
                        timelineMoment:
                    transitionContext.kind ===
                        'timeline_moment'
                        ? {
                            targetClock:
                                transitionContext
                                    .fixedClock,
                            destination:
                                transitionContext
                                    .suggestedDestination,
                            calendarEntries:
                                calendarEntries,
                            calendarStorySources,
                        }
                        : null,
                        transitionActorCards:
                    projectTransitionActorCards(
                        state,
                        transitionActorIds,
                        {
                            includePrivate:
                                isHighTier,
                        },
                    ),
                        actorContinuityCapsules:
                    actorKnowledge,
                        memoryActivationCapsules:
                    narrativeContext
                        .memoryActivationCapsules,
                        sceneCastPolicy,
                        behavioralEnvironment:
                    buildBehavioralEnvironment(
                        state,
                    ),
                        currentConflict: state.conflict,
                        discoveredClues:
                    (state.clues || [])
                        .filter(clue =>
                            clue
                                .discovered ===
                            true),
                        ...(isHighTier
                            ? {
                                hiddenStoryArcs:
                                state.storyArcs,
                            }
                            : {}),
                        locationDirectory:
                    projectTransitionLocationDirectory(
                        state,
                    ),
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
                        historicalKnowledgeEvidence:
                    formatRetrievedKnowledge(
                        getHistoricalKnowledgeRecords(
                            retrievedKnowledge,
                            {
                                includeLocked:
                                    isHighTier,
                            },
                        ),
                    ),
                    }, {
                        access:
                            isHighTier
                                ? NARRATIVE_PROMPT_ACCESS
                                    .DEDICATED_HIGH
                                : NARRATIVE_PROMPT_ACCESS
                                    .MEDIUM,
                    }),
                ),
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
        transitionContext = {},
    ) {
        const prompt = createSceneTransitionPrompt(
            state,
            tier,
            destinationHint,
            expectedDestination,
            intentOverride,
            retrievedKnowledge,
            contextPlan,
            transitionContext,
        );
        const response =
            await sendSceneTransitionRequest(
                roleSlot,
                prompt,
                {
                    json: true,
                    tier,
                },
            );
        const destinationAuthority = expectedDestination
            ? getSceneDestinationAuthority(state, expectedDestination)
            : null;
        const raw =
            extractRoleResponseText(
                response,
            );
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
        const mismatchPaths =
            collectNonEnglishAuthorityFields(
                parsed,
            );
        if (mismatchPaths.length) {
            return {
                languageSkipped: true,
                diagnostics:
                    mismatchPaths.map(
                        fieldPath =>
                            createModelLanguageMismatch({
                                taskId:
                                    'scene_transition',
                                fieldPath,
                                recordId:
                                    parsed
                                        ?.nextScene
                                        ?.id ||
                                    '',
                            }),
                    ),
            };
        }
        const payload =
            normalizeSceneTransitionPackage(
                parsed,
                state,
                {
                    tier,
                },
            );
        if (
            isFixedMomentContext(
                transitionContext,
            )
        ) {
            payload.nextClock =
                transitionContext
                    .fixedClock;
            payload.transitionMinutes =
                transitionContext
                    .fixedTransitionMinutes;
        }
        const validation =
            validateSceneTransitionPackage(
                payload,
                state,
                {
                    expectedMapId:
                        expectedDestination
                            ?.mapId,
                    expectedRoomId:
                        expectedDestination
                            ?.roomId,
                    requireDestinationGrounding:
                        Boolean(
                            destinationAuthority,
                        ),
                    deferOpeningSegments:
                        true,
                },
            );
        if (!validation.valid) {
            throw new Error(
                validation.errors
                    .join('；'),
            );
        }
        return payload;
    }

    async function generateSceneTransitionOpening(
        roleSlot,
        state,
        payload,
        expectedDestination,
        contextPlan,
        transitionContext = {},
        retrievedKnowledge = [],
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
        const calendarContext =
            getTransitionCalendarContext(
                projectedState,
                transitionContext,
                {
                    opening: true,
                },
            );
        const calendarEntries =
            calendarContext.entries;
        const calendarStorySources =
            calendarContext.storySources;
        const narrativeContext =
            buildNarrativePromptContext(
                projectedState,
                retrievedKnowledge,
                {
                    actorIds: [
                        ...presentActorIds,
                    ],
                },
            );
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

${NARRATIVE_AUTHORITY_PROMPT_CONTRACT}

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
- Scene Opening may depict only already committed Actor/Scene observable state and safe opening prose. Do not create or reveal a promise, secret, hidden truth, relationship declaration or mutation, or any gift, loan, return, theft, or other Item transfer.
- authoritySnapshot.currentItems is the exhaustive visible tracked-Item projection for this opening. holderId, not ownerId, controls who physically possesses an Item. A destroyed Item may appear only as remains and must never become damaged, intact, usable, repaired, or replaced. Do not give an actor an implicit generic prop that could be mistaken for a tracked Item whose state, holder, or location contradicts it.
- calendarEntries contains only schedules explicitly claimed by this new Scene. calendarStorySources contains their public beat/storyline sources. Never infer another schedule from the clock, participant, location, tag, or director tier.
- The first narration segment should identify destinationAuthority.roomNameEn naturally.
- Write 2-6 ordered segments, including at least one narration segment, totalling roughly 180-420 English words.
- Follow the supplied canon-compatible wit contract without copying published prose.

${NPC_IDENTITY_PROMPT_BOUNDARY}

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
      "textEn": "spoken words only",
      "historicalClaims": [
        {
          "claimTextEn": "exact concrete historical claim substring from textEn",
          "sourceEventIds": ["event ID from this actor's supportingEvents sourceRefs"]
        }
      ]
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
                    authoritySnapshot:
                        Object.fromEntries(
                            Object.entries(
                                narrativeContext
                                    .authoritySnapshot,
                            ).filter(([
                                key,
                            ]) =>
                                key !==
                                'currentActors'),
                        ),
                    calendarClock:
                        payload
                            .nextClock,
                    calendarEntries,
                    calendarStorySources,
                    calendarMoment:
                    transitionContext.kind ===
                        'calendar_moment'
                        ? {
                            targetClock:
                                transitionContext
                                    .fixedClock,
                            suggestedDestination:
                                transitionContext
                                    .suggestedDestination,
                            targetEntry:
                                transitionContext
                                    .targetEntry,
                            calendarEntries:
                                calendarEntries,
                            calendarStorySources,
                        }
                        : null,
                    timelineMoment:
                    transitionContext.kind ===
                        'timeline_moment'
                        ? {
                            targetClock:
                                transitionContext
                                    .fixedClock,
                            destination:
                                transitionContext
                                    .suggestedDestination,
                            calendarEntries:
                                calendarEntries,
                            calendarStorySources,
                        }
                        : null,
                    destinationAuthority,
                    nextScene: {
                        ...nextScene,
                        openingSegments:
                            undefined,
                    },
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
                                identityObserver:
                                    'player',
                                worldState:
                                    projectedState,
                            },
                        ),
                    memoryActivationCapsules:
                        narrativeContext
                            .memoryActivationCapsules,
                    behavioralEnvironment:
                        buildBehavioralEnvironment(
                            projectedState,
                        ),
                    historicalKnowledgeEvidence:
                        formatRetrievedKnowledge(
                            getHistoricalKnowledgeRecords(
                                retrievedKnowledge,
                            ),
                        ),
                }),
            },
        ];
        const originalRequest =
            JSON.parse(
                prompt[1].content,
            );
        recordTurnDiagnostic(
            'narrative_context',
            {
                authority: {
                    version:
                        originalRequest
                            .authoritySnapshot
                            ?.version ??
                        null,
                    stateRevision:
                        originalRequest
                            .authoritySnapshot
                            ?.stateRevision ??
                        null,
                },
                activationCapsuleIds: {
                    common:
                        originalRequest
                            .memoryActivationCapsules
                            ?.common
                            ?.capsuleId ||
                        '',
                    byActorId:
                        Object.fromEntries(
                            Object.entries(
                                originalRequest
                                    .memoryActivationCapsules
                                    ?.byActorId ||
                                {},
                            ).map(
                                ([
                                    actorId,
                                    capsule,
                                ]) => [
                                    actorId,
                                    capsule
                                        ?.capsuleId ||
                                    '',
                                ],
                            ),
                        ),
                },
            },
        );
        try {
            const response =
                await sendSceneOpeningRequest(
                    roleSlot,
                    prompt,
                    {
                        json: true,
                    },
                );
            const raw =
                extractRoleResponseText(
                    response,
                );
            const parsed =
                parseJsonObject(raw);
            const partition =
                partitionModelSegments(
                    parsed?.segments,
                    {
                        taskId:
                            'scene_opening',
                    },
                );
            parsed.segments =
                partition
                    .displaySegments;
            const outputValidation =
                validateLowSceneOpeningOutput(
                    parsed,
                    presentActorIds,
                );
            if (
                !outputValidation
                    .valid
            ) {
                throw new Error(
                    outputValidation
                        .errors
                        .join('；'),
                );
            }
            const segments =
                outputValidation
                    .segments;
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
            throw new Error(
                `低档场景开场无效：${String(error?.message || error)}`,
            );
        }
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
            nameEn: state.scene.nameEn,
            summaryEn: state.scene.summaryEn,
            closureSummaryEn: payload.closureSummaryEn,
            authorQuillEn: payload.authorQuillEn,
            unresolvedThreadsEn: payload.unresolvedThreadsEn || [],
            startedClock: state.scene.startedClock || state.clock,
            endedClock: state.clock,
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
            calendarEntryIds: [
                ...new Set(
                    (
                        state.scene
                            .calendarEntryIds ||
                        []
                    ).filter(Boolean),
                ),
            ],
            tier,
            status: 'closed',
            closedAt: new Date().toISOString(),
        };
    }

    function buildSceneTransitionMessage(payload, state) {
        const segments = payload.nextScene.openingSegments;
        const messageText =
            composeSceneSegments(
                segments,
                state.actorLibrary,
                'en',
            );
        return {
            name: 'Scene',
            is_user: false,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: messageText,
            extra: {
                hogwartsMud: {
                    languageVersion: 1,
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
                            authoritativeItems:
                            projectAuthoritativeSceneItems(
                                state,
                                synchronizeHeldItemLocations,
                            ),
                        },
                    },
                    authorQuillEn: payload.authorQuillEn,
                },
            },
        };
    }

    async function runSceneTransition({
        tier = 'medium',
        destinationHint = '',
    } = {}) {
        if (
            jobRegistry.calendarMoment
        ) {
            throw new Error(
                'Calendar Moment 正在结算，暂时不能发起普通场景转场。',
            );
        }
        if (jobRegistry.sceneTransition) {
            return jobRegistry.sceneTransition;
        }
        const context = getContext();
        let state = getMudState();
        if (!state?.scene || state.phase !== 'playing') {
            throw new Error('当前没有可以结束的活动场景。');
        }
        if (
            state.turn?.status ===
            'post_unsettled'
        ) {
            throw new Error(
                'Post 结算尚未完成，请先重试 Post 或丢弃本回合。',
            );
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
                    `Close scene ${state.scene.nameEn}. ` +
                `Next destination: ${destinationHint || 'director choice'}.`,
                    entityIds,
                    {
                        ...getSceneTransitionRetrievalOptions(
                            tier,
                            contextPlan.ragLimit,
                        ),
                        relational: true,
                        audienceActorIds:
                            (
                                state
                                    .actorLibrary ||
                                []
                            ).map(actor =>
                                actor.id),
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
                if (
                    payload
                        ?.languageSkipped
                ) {
                    state =
                        getMudState();
                    state.sceneTransition = {
                        ...state
                            .sceneTransition,
                        status:
                            'language_skipped',
                        error: '',
                        languageMismatchCount:
                            payload
                                .diagnostics
                                .length,
                        settledAt:
                            new Date()
                                .toISOString(),
                    };
                    await context
                        .saveMetadata();
                    renderAll();
                    toastr.warning(
                        '场景导演返回了非英语结构内容，本次转场未写入世界状态。',
                    );
                    return state;
                }
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
                    {},
                    retrievedKnowledge,
                );
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
                void enqueueLocalizationCandidates(
                    (
                        payload.nextScene
                            .openingSegments ||
                        []
                    ).map((
                        segment,
                        index,
                    ) => ({
                        recordKind:
                            'message_segment',
                        recordId:
                            `message:${startedMessageId}:segment:${index}`,
                        fieldPath: 'textEn',
                        sourceText:
                            segment.textEn ||
                            '',
                        priority: 0,
                        changedAt:
                            Date.now(),
                    })),
                ).catch(error =>
                    console.warn(
                        '[Hogwarts MUD] Scene localization candidate enqueue failed',
                        error,
                    ));
                const openingExperience =
                    applyCommittedSceneOpeningExperience(
                        nextState,
                        message,
                        startedMessageId,
                    );
                context.chatMetadata.hogwartsMud =
                    openingExperience.state;
                if (openingExperience.event) {
                    await context.saveMetadata();
                }
                const interiorState =
                await ensureCurrentInteriorMap();
                const settledState =
                interiorState ||
                getMudState();
                await syncLocalKnowledge();
                applySystemPrompt();
                renderAll();
                toastr.success(
                    '旧场景已封存，当前场景已切换。',
                );
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
        getCurrentSceneMessageIds,
        buildSceneArchiveEntry,
        buildSceneTransitionMessage,
        runSceneTransition,
    };
}
