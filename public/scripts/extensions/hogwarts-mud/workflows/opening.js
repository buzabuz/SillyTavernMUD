import {
    applyCommittedSceneOpeningExperience,
} from '../domain/archive-projection.js';
import {
    buildNarrativePromptContext,
} from '../domain/narrative-prompt-context.js';
import {
    MODEL_OUTPUT_EVIDENCE_AUTHORITY,
    collectNonEnglishAuthorityFields,
    createModelLanguageMismatch,
    partitionModelSegments,
} from '../domain/model-language-adoption.js';

export function createOpeningWorkflow(ports) {
    const {
        PRESET_WORLD_MAP,
        applyNativeRoleSettings,
        applyOpeningWorldPackage,
        applySystemPrompt,
        enqueueLocalizationCandidates =
        async () => {},
        extractRoleResponseText,
        getContext,
        getMudState,
        jobRegistry,
        parseJsonObject,
        renderAll,
        resolveRoleSlots,
        scheduleRender,
        sendBootstrapSceneOpeningRequest,
        sendOpeningWorldRequest,
        syncLocalKnowledge,
        validateOpeningWorldPackage,
    } = ports;

    function createOpeningDirectorPrompt(state) {
        const isFirstYear = state.campaign.grade === 1;
        return [
            {
                role: 'system',
                content: `You are the World Director. Build the committed opening state for a persistent Harry Potter RPG. Output exactly one JSON object and no prose.

The opening must already be in motion before the player gets control. Establish an exact time, a concrete current room, 1-8 present NPCs with independent activity and intent, and one strong dramatic conflict with immediate pressure and long-term stakes.

	Every actor is proposed exactly once in actorProposals. For a present actor, runtime.present is true, runtime.roomId names one opening-map room, and firstImpressionOfPlayerEn is a specific 1-24 English-word initial opinion grounded in visible conduct or confirmed shared history. Do not use "stranger", "unknown", or a bare relationship label for family, guardians, relatives, established friends, or other pre-existing contacts.
	Every actor, including an absent future clue-bearing role, requires a non-empty runtime.currentActivityEn. For an absent actor, describe the actor's current offstage activity without placing them in the opening room.

	publicProfile.descriptionEn is stable physical appearance only. Exclude clothes, accessories, held objects, nearby possessions, furniture, pose, activity, and location. Put current behavior in runtime.currentActivityEn; subsequent clothing and object state is maintained separately.

For a first-year pre-Hogwarts start, use the player's actual home background when available. Create a compact, internally consistent local MUD map for that home and begin with the admission-letter situation already affecting the household. For an older student, choose the most causally appropriate pre-term or school setting. Never list the storage narrator as an NPC. Never decide the player's response, dialogue, thoughts, or action.

Also create a durable private actor library with every present NPC plus future clue-bearing roles. Prewrite one hidden exploration arc with a fixed actual truth and 3-8 clue nodes spread across at least three distinct sources. These private facts guide later play and must not be exposed in the opening prose.

Prewrite one player-facing nextSceneIntent at the same time. It is the default next dramatic beat, not a spoiler or forced outcome. For the opening package, it must use scene.map.id and one existing roomId from that generated map. Choose medium for an ordinary transition and high only for a planned permanent or complex causal turn.

Do not create formal inventory records. Keep items as an empty array. Ordinary clothes, school supplies, household objects, shop stock, and scene props are implicit narrative resources. Canon signature items are seeded by deterministic runtime data; any newly important object must later be proposed to the player for confirmation.

Use English only. IDs must be snake_case. Coordinates must be numbers from 5 to 95. The local map needs 2-16 rooms and valid exits. Every present NPC must have a roomId from that local map.

Schema:
{
  "version": 1,
  "chapterEn": "string",
  "clock": "YYYY-MM-DD · HH:MM",
  "scene": {
    "id": "snake_case",
    "nameEn": "string",
    "summaryEn": "string",
	    "explorationHookEn": "6-60 word non-spoiler environmental hook",
    "worldAnchorId": "optional preset world node id or empty string",
    "map": {
      "id": "snake_case",
      "nameEn": "string",
      "currentLevelId": "snake_case",
      "levels": [{"id":"snake_case","nameEn":"string","z":0}],
      "rooms": [{"id":"snake_case","nameEn":"string","levelId":"snake_case","kind":"room","descriptionEn":"string","x":50,"y":50,"access":"private"}],
      "exits": [{"from":"room_id","to":"room_id","direction":"north","kind":"door","minutes":1}],
      "currentRoomId": "room_id"
    }
  },
	  "actorProposals": [{
    "id":"snake_case",
    "nameEn":"string",
	    "aliases":["public alias"],
    "roleEn":"string",
	    "publicProfile":{
	      "descriptionEn":"stable physical traits only",
	      "backgroundEn":"public background"
	    },
	    "performanceCore":{
	      "temperamentEn":"stable temperament",
	      "speechStyleEn":"voice, diction and habits",
	      "motivesEn":["durable motive"],
	      "socialStrategiesEn":["performable social strategy"],
	      "boundariesEn":["durable boundary"],
	      "vulnerabilitiesEn":["durable vulnerability"]
	    },
	    "privateFacts":{
	      "secretEn":"private secret or empty string",
	      "knowledgeEn":["fact this actor actually knows"]
	    },
	    "runtime":{
	      "present":true,
	      "roomId":"existing_room_id or empty when absent",
	      "currentActivityEn":"observable current activity",
	      "currentIntentEn":"current intent",
	      "currentGoalEn":"current goal"
	    },
	    "initialRelationshipToPlayerEn":"initial relationship structure",
	    "firstImpressionOfPlayerEn":"specific opinion when present, otherwise empty"
  }],
  "storyArc": {
    "id":"snake_case",
    "titleEn":"private title",
    "hookEn":"surface mystery",
    "hiddenTruthEn":"predetermined actual answer",
    "stakesEn":"string",
    "involvedActorIds":["actor_id"],
    "cluePlan":[{
      "id":"snake_case",
      "labelEn":"string",
      "hiddenFactEn":"string",
      "playerFacingDiscoveryEn":"string",
      "unlockConditionEn":"string",
      "sourceActorIds":["actor_id"],
      "sourceLocationIds":["optional_location_id"],
      "sourceItemId":"optional_item_id"
    }]
  },
  "conflict": {"titleEn":"string","premiseEn":"string","immediatePressureEn":"string","stakesEn":"string","incitingEventEn":"string"},
  "clues": [{"id":"snake_case","labelEn":"string","detailEn":"string"}],
  "items": [],
  "nextSceneIntent": {
    "titleEn": "player-facing next beat title",
    "summaryEn": "non-spoiler default direction",
    "triggerEn": "observable condition for ending the current scene",
    "mapId": "same_id_as_scene_map",
    "roomId": "existing_room_id",
    "tier": "medium|high"
  },
  "openingBriefEn": "A detailed brief for the narrator describing the active scene beats, NPC behavior, sensory anchors, and the exact point where player control begins."
}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    campaign: state.campaign,
                    firstYearAdmissionOpening: isFirstYear,
                    playerCharacter: state.character,
                    canonicalWorldCatalog: PRESET_WORLD_MAP.nodes.map(node => ({
                        id: node.id,
                        nameEn:
                            node.nameEn,
                        regionId: node.regionId,
                        summaryEn:
                            node.summaryEn,
                    })),
                }),
            },
        ];
    }

    function createBootstrapSceneOpeningPrompt(
        state,
    ) {
        const presentActorIds =
            (state.actors || [])
                .filter(actor =>
                    actor.present ===
                    true)
                .map(actor =>
                    actor.id);
        const profileById =
            new Map(
                (state.actorLibrary || [])
                    .map(profile => [
                        profile.id,
                        profile,
                    ]),
            );
        const context =
            buildNarrativePromptContext(
                state,
                [],
                {
                    actorIds:
                        presentActorIds,
                },
            );
        return [
            {
                role: 'system',
                content: `You are the low-tier Scene Opening Performer. Opening World has already committed the first Scene. Render it as original English narration and NPC dialogue. Return exactly one JSON object and no Markdown.

Use authoritySnapshot as the only current Actor, Item, Material and Room authority. actorPerformanceCards provide only public performance guidance for the matching actor ID. Never transfer one Actor's temperament or knowledge to another.

Do not change the committed clock, room, cast, conflict, activities, intents, Items or facts. Dialogue may use only a present actor ID. Never speak, think, decide, emote, move or act for the player. Do not reveal private facts, Story Arc truth or locked clues. Focus on at most three named actors, begin inside the committed current room, put the opening conflict in motion, and end where the player can respond.

Write 2-6 ordered segments totalling roughly 180-420 English words.

Schema:
{"segments":[{"type":"narration","textEn":"observable prose"},{"type":"dialogue","actorId":"present_actor_id","textEn":"spoken words only"}]}`,
            },
            {
                role: 'user',
                content:
                    JSON.stringify({
                        openingClock:
                            state.clock,
                        currentScene:
                            state.scene,
                        openingBriefEn:
                            state.opening
                                ?.package
                                ?.openingBriefEn ||
                            '',
                        conflict:
                            state.conflict,
                        authoritySnapshot:
                            context
                                .authoritySnapshot,
                        actorPerformanceCards:
                            presentActorIds
                                .map(actorId => {
                                    const profile =
                                        profileById.get(
                                            actorId,
                                        ) || {};
                                    return {
                                        id:
                                            actorId,
                                        nameEn:
                                            profile
                                                .nameEn ||
                                            actorId,
                                        roleEn:
                                            profile
                                                .roleEn ||
                                            '',
                                        publicProfile:
                                            profile
                                                .publicProfile ||
                                            {},
                                        performanceCore:
                                            profile
                                                .performanceCore ||
                                            {},
                                    };
                                }),
                        memoryActivationCapsules:
                            context
                                .memoryActivationCapsules,
                    }),
            },
        ];
    }

    function validateBootstrapSceneOpening(
        payload,
        state,
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
                    'Bootstrap Scene Opening must be an object.',
                ],
                segments: [],
            };
        }
        const unknownRootKeys =
            Object.keys(payload)
                .filter(key =>
                    key !== 'segments');
        if (unknownRootKeys.length) {
            errors.push(
                `Bootstrap Scene Opening cannot contain fields: ${unknownRootKeys.join(', ')}.`,
            );
        }
        const segments =
            Array.isArray(
                payload?.segments,
            )
                ? payload.segments
                : [];
        if (
            segments.length < 2 ||
            segments.length > 6
        ) {
            errors.push(
                'Bootstrap Scene Opening requires 2-6 segments.',
            );
        }
        const presentActorIds =
            new Set(
                (state.actors || [])
                    .filter(actor =>
                        actor.present ===
                        true)
                    .map(actor =>
                        actor.id),
            );
        let narrationCount = 0;
        let wordCount = 0;
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
                        ])
                        : null;
            if (
                !allowedKeys ||
                !String(
                    segment?.textEn ||
                    segment?.rawText ||
                    '',
                ).trim()
            ) {
                errors.push(
                    `Bootstrap segment ${index} is invalid.`,
                );
                return;
            }
            const unknownKeys =
                Object.keys(segment)
                    .filter(key =>
                        !allowedKeys.has(
                            key,
                        ));
            if (unknownKeys.length) {
                errors.push(
                    `Bootstrap segment ${index} cannot contain fields: ${unknownKeys.join(', ')}.`,
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
                    `Bootstrap segment ${index} rawText lacks language evidence metadata.`,
                );
            }
            wordCount +=
                String(
                    segment.textEn ||
                    '',
                )
                    .trim()
                    .split(/\s+/u)
                    .filter(Boolean)
                    .length;
            if (
                segment.type ===
                'narration'
            ) {
                narrationCount += 1;
                if (
                    segment.actorId !==
                    undefined
                ) {
                    errors.push(
                        `Narration segment ${index} cannot have actorId.`,
                    );
                }
            } else if (
                !presentActorIds.has(
                    segment.actorId,
                )
            ) {
                errors.push(
                    `Dialogue segment ${index} has an unknown or absent actor.`,
                );
            }
        });
        if (!narrationCount) {
            errors.push(
                'Bootstrap Scene Opening requires narration.',
            );
        }
        if (
            wordCount > 0 &&
            (
                wordCount < 180 ||
                wordCount > 420
            )
        ) {
            errors.push(
                'Bootstrap Scene Opening must contain 180-420 English words.',
            );
        }
        return {
            valid:
                errors.length === 0,
            errors,
            segments,
        };
    }

    async function generateBootstrapSceneOpening(
        lowSlot,
        state,
    ) {
        const prompt =
            createBootstrapSceneOpeningPrompt(
                state,
            );
        const response =
            await sendBootstrapSceneOpeningRequest(
                lowSlot,
                prompt,
                {
                    json: true,
                },
            );
        const raw =
            extractRoleResponseText(
                response,
            );
        try {
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
            const validation =
                validateBootstrapSceneOpening(
                    parsed,
                    state,
                );
            if (!validation.valid) {
                throw new Error(
                    validation.errors
                        .join('；'),
                );
            }
            return validation.segments;
        } catch (error) {
            throw new Error(
                `Bootstrap Scene Opening invalid: ${String(error?.message || error)}`,
            );
        }
    }

    function composeSceneSegments(segments, actorLibrary, language = 'en') {
        const actors = new Map((actorLibrary || []).map(actor => [actor.id, actor]));
        return (segments || []).map(segment => {
            const text =
                segment.textEn ||
                segment.rawText ||
                '';
            if (segment.type !== 'dialogue') {
                return text;
            }
            const actor = actors.get(segment.actorId);
            const name = language === 'zh'
                ? actor?.name || actor?.display?.name || actor?.nameEn || segment.actorId
                : actor?.nameEn || actor?.name || segment.actorId;
            return `${name}: “${text}”`;
        }).join('\n\n');
    }

    async function appendOpeningNarrative(segments, state) {
        const context = getContext();
        const messageText =
            composeSceneSegments(
                segments,
                state.actorLibrary,
                'en',
            );
        const message = {
            name: 'Scene',
            is_user: false,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: messageText,
            extra: {
                hogwartsMud: {
                    languageVersion: 1,
                    role: 'opening_narrative',
                    sceneId: state.scene?.id,
                    segments,
                },
            },
        };
        const messageId =
            context.chat.length;
        context.chat.push(message);
        await context.saveChat();
        void enqueueLocalizationCandidates(
            segments
                .map((
                    segment,
                    index,
                ) => ({
                    recordKind:
                        'message_segment',
                    recordId:
                        `message:${messageId}:segment:${index}`,
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
                '[Hogwarts MUD] Opening localization candidate enqueue failed',
                error,
            ));
        const openingExperience =
            applyCommittedSceneOpeningExperience(
                state,
                message,
                messageId,
            );
        context.chatMetadata.hogwartsMud =
            openingExperience.state;
        if (openingExperience.event) {
            await context.saveMetadata();
        }
        scheduleRender();
    }

    function hasOpeningNarrative() {
        return getContext().chat.some(message =>
            message.extra?.hogwartsMud?.role === 'opening_narrative',
        );
    }

    async function generateOpeningPackage(highSlot, state) {
        const response =
            await sendOpeningWorldRequest(
                highSlot,
                createOpeningDirectorPrompt(
                    state,
                ),
                {
                    json: true,
                },
            );
        const opening =
            parseJsonObject(
                extractRoleResponseText(
                    response,
                ),
            );
        const mismatchPaths =
            collectNonEnglishAuthorityFields(
                opening,
            );
        if (mismatchPaths.length) {
            return {
                languageSkipped: true,
                diagnostics:
                    mismatchPaths.map(
                        fieldPath =>
                            createModelLanguageMismatch({
                                taskId:
                                    'opening_world',
                                fieldPath,
                                recordId:
                                    opening
                                        ?.scene
                                        ?.id ||
                                    '',
                            }),
                    ),
            };
        }
        const validation =
            validateOpeningWorldPackage(
                opening,
                state.character,
                state.campaign,
            );
        if (!validation.valid) {
            throw new Error(
                validation.errors
                    .join('；'),
            );
        }
        return opening;
    }

    async function initializeOpeningWorld() {
        if (jobRegistry.opening) {
            return jobRegistry.opening;
        }
        jobRegistry.opening = (async () => {
            const context = getContext();
            let state = getMudState();
            if (!state?.character?.confirmed) {
                return;
            }
            const slots = resolveRoleSlots(state.modelSlots);
            const highSlot = slots.high;
            if (!highSlot.profileId) {
                throw new Error('世界导演没有可用的 Connection Profile。');
            }
            state.opening ??= { status: 'pending', attempt: 0, error: '', package: null, committedAt: null };
            state.phase = state.opening.package ? 'opening_narration' : 'initializing';
            state.opening.status = state.opening.package ? 'narrating' : 'directing';
            state.opening.attempt = Number(state.opening.attempt || 0) + 1;
            state.opening.error = '';
            if (!state.opening.package) {
                state.chapterEn =
                    'Opening World';
                state.clock = `${state.campaign.startYear} · Time pending`;
            }
            await context.saveMetadata();
            renderAll();

            try {
                if (!state.opening.package) {
                    const opening = await generateOpeningPackage(highSlot, state);
                    if (
                        opening
                            ?.languageSkipped
                    ) {
                        state.opening.status =
                            'language_skipped';
                        state.opening.error = '';
                        state.opening
                            .languageMismatchCount =
                            opening
                                .diagnostics
                                .length;
                        state.phase =
                            'initializing';
                        await context
                            .saveMetadata();
                        renderAll();
                        return state;
                    }
                    context.chatMetadata.hogwartsMud =
                        applyOpeningWorldPackage(
                            state,
                            opening,
                        );
                    state = getMudState();
                    await context.saveMetadata();
                    applySystemPrompt();
                    renderAll();
                }

                if (!hasOpeningNarrative()) {
                    const sceneSlot =
                        slots.low;
                    if (!sceneSlot?.profileId) {
                        throw new Error(
                            '首幕场景表演需要低档 Connection Profile。',
                        );
                    }
                    const segments =
                        await generateBootstrapSceneOpening(
                            sceneSlot,
                            state,
                        );
                    await appendOpeningNarrative(
                        segments,
                        state,
                    );
                }

                state = getMudState();
                state.phase = 'playing';
                state.opening.status = 'ready';
                state.opening.error = '';
                state.opening.narratedAt = new Date().toISOString();
                await context.saveMetadata();
                await applyNativeRoleSettings(slots.low);
                await syncLocalKnowledge();
                applySystemPrompt();
                renderAll();
                toastr.success('首幕已经编排完成。现在轮到你行动。');
            } catch (error) {
                state = getMudState();
                state.phase = 'initialization_failed';
                state.opening ??= {};
                state.opening.status = 'failed';
                state.opening.error = String(error?.cause?.message || error?.message || error);
                await context.saveMetadata();
                renderAll();
                throw error;
            }
        })().finally(() => {
            jobRegistry.opening = null;
        });
        return jobRegistry.opening;
    }

    return {
        createOpeningDirectorPrompt,
        createBootstrapSceneOpeningPrompt,
        validateBootstrapSceneOpening,
        generateBootstrapSceneOpening,
        composeSceneSegments,
        appendOpeningNarrative,
        hasOpeningNarrative,
        generateOpeningPackage,
        initializeOpeningWorld,
    };
}
