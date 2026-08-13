import {
    applyCommittedSceneOpeningExperience,
} from '../domain/archive-projection.js';

export function createOpeningWorkflow(ports) {
    const {
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
    } = ports;

    async function localizeOpeningPackage(opening) {
        if (!getSettings().translationEnabled) {
            return opening;
        }
        const fields = [
            opening.chapterEn,
            opening.scene.nameEn,
            opening.scene.summaryEn,
            opening.scene.map.nameEn,
            ...opening.scene.map.levels.map(level => level.nameEn),
            ...opening.scene.map.rooms.map(room => room.nameEn),
            ...opening.actors.flatMap(actor => [
                actor.roleEn,
                actor.relationshipToPlayerEn,
                actor.impressionOfPlayerEn ||
                actor.relationshipToPlayerEn,
                actor.currentActivityEn,
                actor.currentIntentEn,
            ]),
            opening.conflict.titleEn,
            opening.conflict.premiseEn,
            opening.conflict.immediatePressureEn,
            opening.conflict.stakesEn,
            opening.conflict.incitingEventEn,
            ...(opening.clues || []).flatMap(item => [item.labelEn, item.detailEn]),
            ...(opening.items || []).flatMap(item => [item.labelEn, item.detailEn]),
            ...(opening.nextSceneIntent ? [
                opening.nextSceneIntent.titleEn,
                opening.nextSceneIntent.summaryEn,
                opening.nextSceneIntent.triggerEn,
            ] : []),
        ];
        const translated = await translateOpeningValues(fields);
        let cursor = 0;
        const display = {
            chapter: translated[cursor++],
            sceneName: translated[cursor++],
            sceneSummary: translated[cursor++],
            mapName: translated[cursor++],
            levelNames: opening.scene.map.levels.map(() => translated[cursor++]),
            roomNames: opening.scene.map.rooms.map(() => translated[cursor++]),
            actorRoles: [],
            actorRelationships: [],
            actorImpressions: [],
            actorActivities: [],
            actorIntents: [],
        };
        opening.actors.forEach(() => {
            display.actorRoles.push(translated[cursor++]);
            display.actorRelationships.push(translated[cursor++]);
            display.actorImpressions.push(translated[cursor++]);
            display.actorActivities.push(translated[cursor++]);
            display.actorIntents.push(translated[cursor++]);
        });
        display.conflictTitle = translated[cursor++];
        display.conflictPremise = translated[cursor++];
        display.conflictPressure = translated[cursor++];
        display.conflictStakes = translated[cursor++];
        display.incitingEvent = translated[cursor++];
        display.clueLabels = [];
        display.clueDetails = [];
        (opening.clues || []).forEach(() => {
            display.clueLabels.push(translated[cursor++]);
            display.clueDetails.push(translated[cursor++]);
        });
        display.itemLabels = [];
        display.itemDetails = [];
        (opening.items || []).forEach(() => {
            display.itemLabels.push(translated[cursor++]);
            display.itemDetails.push(translated[cursor++]);
        });
        const nextSceneIntent = opening.nextSceneIntent ? {
            ...opening.nextSceneIntent,
            title: translated[cursor++],
            summary: translated[cursor++],
            trigger: translated[cursor++],
        } : undefined;
        return {
            ...opening,
            ...(nextSceneIntent ? { nextSceneIntent } : {}),
            display,
        };
    }

    async function localizeDirectorFoundation(foundation) {
        if (!getSettings().translationEnabled) {
            return foundation;
        }
        const values = foundation.actorLibrary.flatMap(actor => [
            actor.roleEn,
            actor.relationshipToPlayerEn,
            actor.impressionOfPlayerEn ||
            actor.relationshipToPlayerEn,
            actor.publicDescriptionEn,
            actor.publicBackgroundEn,
            actor.personalityEn,
            actor.speechStyleEn,
        ]);
        const translated = await translateOpeningValues(values);
        let cursor = 0;
        return {
            ...foundation,
            actorLibrary: foundation.actorLibrary.map(actor => ({
                ...actor,
                display: {
                    name: actor.nameEn,
                    role: translated[cursor++],
                    relationshipToPlayer: translated[cursor++],
                    impressionOfPlayer: translated[cursor++],
                    publicDescription: translated[cursor++],
                    publicBackground: translated[cursor++],
                    personality: translated[cursor++],
                    speechStyle: translated[cursor++],
                },
            })),
        };
    }

    function createDirectorFoundationPrompt(state) {
        return [
            {
                role: 'system',
                content: `You are the highest-level World Director for a persistent Harry Potter RPG. Build the durable private cast library and one fully prewritten hidden exploration arc. Return exactly one JSON object with no Markdown.

The cast library must contain every currently present NPC plus future clue-bearing characters who can enter later. Canon characters must remain canon-consistent. Each character needs a stable public identity, voice, private goal, fear, secret, and bounded knowledge. The on-scene narrator will use these profiles to roleplay each person separately.

publicDescriptionEn is the actor's stable physical description only: body, face, complexion, natural hair, and other durable features. Never include clothing, accessories, held objects, nearby possessions, furniture, current pose, current activity, or scene position. Those belong to current activity and the material presentation state.

impressionOfPlayerEn is an actual starting opinion, not a relationship label. Parents, guardians, relatives, established friends, and other pre-existing contacts must begin with a specific impression grounded in the player's confirmed background and their shared history. Only a genuinely unmet character may use a not-yet-met state; never describe a parent or old friend as a stranger.

The hidden exploration arc is binding private world truth, not a public quest summary. Predetermine the actual answer, stakes, involved people, and 3-8 discoverable clue nodes. Spread clues across at least three distinct people, places, or items. A clue may become player-visible only after its unlock condition is satisfied. Do not use the storage narrator as a character.

Keep the output compact and machine-safe:
- Create 5-7 actors total, including every current actor ID exactly once.
- Create exactly 4 clue nodes.
- Every string value must be at most 35 English words.
- Every knowledgeEn array must contain 1-3 short facts.
- Do not restate the prompt, explain decisions, or emit analysis.
- Close every string, array, and object.

Schema:
{
  "actorLibrary": [{
    "id": "snake_case",
    "nameEn": "string",
    "roleEn": "string",
    "relationshipToPlayerEn": "string",
    "impressionOfPlayerEn": "specific initial opinion of the player",
    "publicDescriptionEn": "stable physical traits only; no clothing, props, activity, or location",
    "publicBackgroundEn": "what the player currently knows",
    "personalityEn": "stable temperament",
    "speechStyleEn": "voice, diction, habits",
    "privateGoalEn": "hidden current goal",
    "fearEn": "private fear",
    "secretEn": "private secret",
    "knowledgeEn": ["facts this character actually knows"]
  }],
  "storyArc": {
    "id": "snake_case",
    "titleEn": "private director title",
    "hookEn": "the surface mystery",
    "hiddenTruthEn": "the predetermined actual answer",
    "stakesEn": "what changes if discovered or suppressed",
    "involvedActorIds": ["actor_id"],
    "cluePlan": [{
      "id": "snake_case",
      "labelEn": "private clue label",
      "hiddenFactEn": "which part of the truth this proves",
      "playerFacingDiscoveryEn": "what may be shown after discovery",
      "unlockConditionEn": "specific action or earned disclosure",
      "sourceActorIds": ["actor_id"],
      "sourceLocationIds": ["optional_location_id"],
      "sourceItemId": "optional_item_id"
    }]
  }
}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    playerCharacter: state.character,
                    campaign: state.campaign,
                    currentScene: state.scene,
                    currentActors: state.actors,
                    internalConflict: state.conflict,
                    candidateHiddenClues: state.clues,
                    committedOpening: state.opening?.package,
                }),
            },
        ];
    }

    async function generateDirectorFoundation(roleSlot, state) {
        let response = await sendRoleRequest(
            roleSlot,
            createDirectorFoundationPrompt(state),
            { json: true },
        );
        let raw = extractRoleResponseText(response);
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const foundation = parseJsonObject(raw);
                const validation = validateDirectorFoundation(foundation, state.actors);
                if (!validation.valid) {
                    throw new Error(validation.errors.join('；'));
                }
                return foundation;
            } catch (error) {
                lastError = error;
                if (attempt > 0) break;
                response = await sendRoleRequest(roleSlot, [
                    {
                        role: 'system',
                        content: 'Repair the director-foundation JSON. Return exactly one compact complete JSON object matching the supplied schema. Keep every present actor ID, use 5-7 actors total, exactly 4 clue nodes, at most 35 words per string, and ensure all references resolve. Output no analysis.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            validationError: String(error?.message || error),
                            invalidOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                            requiredSchema: createDirectorFoundationPrompt(state)[0].content,
                        }),
                    },
                ], { json: true });
                raw = extractRoleResponseText(response);
            }
        }
        throw new Error(`世界导演未能建立出场角色库：${String(lastError?.message || lastError)}`);
    }

    async function ensureDirectorFoundation() {
        const current = getMudState();
        const foundationReady = current?.directorFoundation?.status === 'ready' &&
        Array.isArray(current.actorLibrary) &&
        current.actorLibrary.length >= 3 &&
        Array.isArray(current.storyArcs) &&
        current.storyArcs.some(arc => Array.isArray(arc.cluePlan) && arc.cluePlan.length >= 3);
        if (foundationReady || current?.phase !== 'playing') {
            return;
        }
        if (jobRegistry.foundation) {
            return jobRegistry.foundation;
        }

        jobRegistry.foundation = (async () => {
            const context = getContext();
            let state = getMudState();
            const slots = resolveRoleSlots(state.modelSlots);
            const roleSlot = slots.high;
            if (!roleSlot.profileId) {
                throw new Error('出场角色库没有可用的高档或中档 Connection Profile。');
            }
            state.directorFoundation = {
                status: 'building',
                error: '',
                committedAt: state.directorFoundation?.committedAt || null,
            };
            await context.saveMetadata();
            renderAll();
            try {
                let foundation = await generateDirectorFoundation(roleSlot, state);
                try {
                    foundation = await localizeDirectorFoundation(foundation);
                } catch (translationError) {
                    console.warn('[Hogwarts MUD] Cast library translation failed; using English labels', translationError);
                }
                context.chatMetadata.hogwartsMud = applyDirectorFoundation(state, foundation);
                state = getMudState();
                await context.saveMetadata();
                await syncLocalKnowledge();
                applySystemPrompt();
                renderAll();
            } catch (error) {
                state = getMudState();
                state.directorFoundation = {
                    status: 'failed',
                    error: String(error?.cause?.message || error?.message || error),
                    committedAt: null,
                };
                await context.saveMetadata();
                renderAll();
                throw error;
            }
        })().finally(() => {
            jobRegistry.foundation = null;
        });
        return jobRegistry.foundation;
    }

    function createOpeningDirectorPrompt(state) {
        const isFirstYear = state.campaign.grade === 1;
        return [
            {
                role: 'system',
                content: `You are the World Director. Build the committed opening state for a persistent Harry Potter RPG. Output exactly one JSON object and no prose.

The opening must already be in motion before the player gets control. Establish an exact time, a concrete current room, 1-8 present NPCs with independent activity and intent, and one strong dramatic conflict with immediate pressure and long-term stakes.

Every present actor and actor-library profile needs impressionOfPlayerEn. For family, guardians, relatives, established friends, and other pre-existing contacts, write a specific initial opinion grounded in the confirmed player background and their shared life before this scene. Do not use "stranger", "unknown", or a bare relationship label for them.

publicDescriptionEn is stable physical appearance only. Exclude clothes, accessories, held objects, nearby possessions, furniture, pose, activity, and location. Put current behavior in currentActivityEn; subsequent clothing and object state is maintained separately.

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
  "actors": [{"id":"snake_case","nameEn":"string","roleEn":"string","relationshipToPlayerEn":"string","impressionOfPlayerEn":"specific initial opinion of the player","publicDescriptionEn":"stable physical traits only","currentActivityEn":"string","currentIntentEn":"string","roomId":"existing_room_id","present":true}],
  "actorLibrary": [{
    "id":"snake_case",
    "nameEn":"string",
    "roleEn":"string",
    "relationshipToPlayerEn":"string",
    "impressionOfPlayerEn":"specific initial opinion or not-yet-met state",
    "publicDescriptionEn":"stable physical traits only",
    "publicBackgroundEn":"string",
    "personalityEn":"string",
    "speechStyleEn":"string",
    "privateGoalEn":"string",
    "fearEn":"string",
    "secretEn":"string",
    "knowledgeEn":["string"]
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
                        name: node.name,
                        regionId: node.regionId,
                        summary: node.summary,
                    })),
                }),
            },
        ];
    }

    function validateOpeningScenePlan(plan, state) {
        const errors = [];
        const actorIds = new Set((state.actorLibrary || []).map(actor => actor.id));
        const sequence = Array.isArray(plan?.sequence) ? plan.sequence : [];
        const dialogueBeats = Array.isArray(plan?.dialogueBeats) ? plan.dialogueBeats : [];
        if (!sequence.length || sequence.length > 24) {
            errors.push('首幕必须包含 1–24 个顺序分段。');
        }
        const beats = new Map();
        dialogueBeats.forEach(beat => {
            if (!String(beat.id || '').trim() || beats.has(beat.id) ||
            !actorIds.has(beat.actorId) || !String(beat.intentEn || '').trim()) {
                errors.push('首幕对白任务无效。');
            }
            beats.set(beat.id, beat);
        });
        sequence.forEach(segment => {
            if (segment.type === 'narration' && !String(segment.textEn || '').trim()) {
                errors.push('首幕旁白不能为空。');
            } else if (segment.type === 'dialogue' &&
            (!beats.has(segment.beatId) ||
                beats.get(segment.beatId)?.actorId !== segment.actorId)) {
                errors.push('首幕对白分段引用了无效任务。');
            } else if (!['narration', 'dialogue'].includes(segment.type)) {
                errors.push('首幕分段类型无效。');
            }
        });
        return { valid: errors.length === 0, errors };
    }

    async function generatePlannedDialogueLines(lowSlot, state, dialogueBeats) {
        if (!dialogueBeats.length) return [];
        const actorIds = new Set(dialogueBeats.map(beat => beat.actorId));
        const response = await sendRoleRequest(lowSlot, [
            {
                role: 'system',
                content: `You are the low-tier Dialogue Performer. Write only the requested NPC spoken lines. Do not narrate setting, actions, consequences, time, clues, or state. Return exactly:
{"lines":[{"beatId":"beat_1","actorId":"actor_id","textEn":"spoken words only"}]}

${CANON_WIT_TONE_CONTRACT}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    actorProfiles: state.actorLibrary.filter(actor => actorIds.has(actor.id)),
                    dialogueBeats,
                }),
            },
        ], { json: true });
        const payload = parseJsonObject(extractRoleResponseText(response));
        const lines = Array.isArray(payload.lines) ? payload.lines : [];
        const beats = new Map(dialogueBeats.map(beat => [beat.id, beat]));
        if (lines.length !== dialogueBeats.length) {
            throw new Error('低档对白模型没有完成全部首幕对白任务。');
        }
        lines.forEach(line => {
            const beat = beats.get(line.beatId);
            if (!beat || beat.actorId !== line.actorId || !String(line.textEn || '').trim()) {
                throw new Error('低档对白模型返回了无效的首幕对白。');
            }
        });
        return lines;
    }

    function mergeOpeningScenePlan(plan, lines) {
        const lineMap = new Map(lines.map(line => [line.beatId, line]));
        return plan.sequence.map(segment => segment.type === 'narration'
            ? { type: 'narration', textEn: segment.textEn }
            : {
                type: 'dialogue',
                actorId: segment.actorId,
                textEn: lineMap.get(segment.beatId)?.textEn || '',
            });
    }

    function createOpeningScenePlanPrompt(state) {
        return [
            {
                role: 'system',
                content: `You are the mid-tier Opening Scene Director for a persistent Harry Potter RPG. Plan the first playable scene using the committed world package and actor profiles exactly. Return exactly one JSON object with no Markdown wrapper.

Requirements:
- Begin inside the current room with the listed NPCs already doing their current activities.
- You own setting, physical continuity, event sequencing, and narration.
- Do not write NPC dialogue. Emit dialogue tasks for the low-tier Dialogue Performer.
- Use 500-900 words total with literary scene continuity.
- Preserve all committed facts and do not introduce a different location, time, NPC, item, or outcome.
- Never narrate the player character's unspoken thoughts, dialogue, decision, or action.
- End at the first consequential moment that demands the player's response.
- Do not reveal any private goal, secret, hidden truth, or locked clue.

Schema:
{
  "elapsedMinutes": 0,
  "publicEventEn": "the inciting event begins",
  "sequence": [
    {"type":"narration","textEn":"scene prose"},
    {"type":"dialogue","beatId":"beat_1","actorId":"actor_id"}
  ],
  "dialogueBeats": [
    {
      "id":"beat_1",
      "actorId":"actor_id",
      "intentEn":"what the speaker needs from the player",
      "mustConveyEn":["facts the line may communicate"],
      "emotionalSubtextEn":"private delivery subtext",
      "maxWords":80
    }
  ]
}

${CANON_WIT_TONE_CONTRACT}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    character: state.character,
                    campaign: state.campaign,
                    committedOpeningPackage: state.opening.package,
                    currentScene: state.scene,
                    presentActors: state.actors,
                    actorProfiles: state.actorLibrary,
                    conflict: state.conflict,
                }),
            },
        ];
    }

    function composeSceneSegments(segments, actorLibrary, language = 'en') {
        const actors = new Map((actorLibrary || []).map(actor => [actor.id, actor]));
        return (segments || []).map(segment => {
            const text = language === 'zh' && segment.textZh ? segment.textZh : segment.textEn;
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

    async function localizeSceneSegments(segments) {
        if (!getSettings().translationEnabled) {
            return segments;
        }
        const translated = await translateOpeningValues(segments.map(segment => segment.textEn));
        return segments.map((segment, index) => ({
            ...segment,
            textZh: translated[index],
        }));
    }

    async function appendOpeningNarrative(segments, state) {
        const context = getContext();
        const sourceEn = composeSceneSegments(segments, state.actorLibrary, 'en');
        const translatedZh = composeSceneSegments(segments, state.actorLibrary, 'zh');
        const message = {
            name: 'Scene',
            is_user: false,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: sourceEn,
            extra: {
                hogwartsMud: {
                    sourceEn,
                    role: 'opening_narrative',
                    sceneId: state.scene?.id,
                    segments,
                    ...(translatedZh !== sourceEn ? {
                        translatedZh,
                        provider:
                        getSettings()
                            .translationProvider,
                        translatedAt: Date.now(),
                        translationVersion: TRANSLATION_FORMAT_VERSION,
                    } : {}),
                },
                ...(translatedZh !== sourceEn ? { display_text: translatedZh } : {}),
            },
        };
        const messageId =
            context.chat.length;
        context.chat.push(message);
        await context.saveChat();
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
        let response = await sendRoleRequest(
            highSlot,
            createOpeningDirectorPrompt(state),
            { json: true },
        );
        let raw = extractRoleResponseText(response);
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const opening = parseJsonObject(raw);
                const validation = validateOpeningWorldPackage(opening, state.character, state.campaign);
                if (!validation.valid) {
                    throw new Error(validation.errors.join('；'));
                }
                return opening;
            } catch (error) {
                lastError = error;
                if (attempt > 0) {
                    break;
                }
                response = await sendRoleRequest(highSlot, [
                    {
                        role: 'system',
                        content: 'Repair an invalid opening-world JSON package. Return exactly one complete JSON object with no Markdown and no commentary. Preserve usable facts, fill missing required fields, close all arrays and objects, keep the campaign year unchanged, and ensure every map exit references an existing room.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            validationError: String(error?.message || error),
                            invalidOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                            requiredSchema: createOpeningDirectorPrompt(state)[0].content,
                        }),
                    },
                ], { json: true });
                raw = extractRoleResponseText(response);
            }
        }
        const preview = String(typeof raw === 'string' ? raw : JSON.stringify(raw) || '')
            .replace(/\s+/g, ' ')
            .slice(0, 280);
        throw new Error(
            `世界导演连续两次未返回合法开场包：${String(lastError?.message || lastError)}。` +
        `响应摘要：${preview || '[空响应]'}`,
        );
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
                state.chapter = '正在编排首幕';
                state.clock = `${state.campaign.startYear} · 时间待定`;
                state.location = '世界建档中';
            }
            await context.saveMetadata();
            renderAll();

            try {
                if (!state.opening.package) {
                    const opening = await generateOpeningPackage(highSlot, state);
                    let localized = opening;
                    try {
                        localized = await localizeOpeningPackage(opening);
                        const localizedFoundation = await localizeDirectorFoundation({
                            actorLibrary: opening.actorLibrary,
                            storyArc: opening.storyArc,
                        });
                        localized.actorLibrary = localizedFoundation.actorLibrary;
                        localized.storyArc = localizedFoundation.storyArc;
                    } catch (translationError) {
                        console.warn('[Hogwarts MUD] Opening state translation failed; using English labels', translationError);
                    }
                    context.chatMetadata.hogwartsMud = applyOpeningWorldPackage(state, localized);
                    state = getMudState();
                    await context.saveMetadata();
                    applySystemPrompt();
                    renderAll();
                }

                if (!hasOpeningNarrative()) {
                    const sceneSlot = slots.medium;
                    if (!sceneSlot?.profileId) {
                        throw new Error('首幕场景编排至少需要中档 Connection Profile。');
                    }
                    const response = await sendRoleRequest(
                        sceneSlot,
                        createOpeningScenePlanPrompt(state),
                        { json: true },
                    );
                    const plan = parseJsonObject(extractRoleResponseText(response));
                    const validation = validateOpeningScenePlan(plan, state);
                    if (!validation.valid) {
                        throw new Error(`首幕场景计划无效：${validation.errors.join('；')}`);
                    }
                    const lines = await generatePlannedDialogueLines(
                        slots.low,
                        state,
                        plan.dialogueBeats || [],
                    );
                    const segments = mergeOpeningScenePlan(plan, lines);
                    const localizedSegments = await localizeSceneSegments(segments);
                    await appendOpeningNarrative(localizedSegments, state);
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
        localizeOpeningPackage,
        localizeDirectorFoundation,
        createDirectorFoundationPrompt,
        generateDirectorFoundation,
        ensureDirectorFoundation,
        createOpeningDirectorPrompt,
        validateOpeningScenePlan,
        generatePlannedDialogueLines,
        mergeOpeningScenePlan,
        createOpeningScenePlanPrompt,
        composeSceneSegments,
        localizeSceneSegments,
        appendOpeningNarrative,
        hasOpeningNarrative,
        generateOpeningPackage,
        initializeOpeningWorld,
    };
}
