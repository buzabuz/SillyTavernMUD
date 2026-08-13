import {
    projectCalendarSceneContext,
} from '../domain/calendar-projection.js';
import {
    NARRATIVE_AUTHORITY_PROMPT_CONTRACT,
    buildNarrativePromptContext,
} from '../domain/narrative-prompt-context.js';
import {
    validateHistoricalClaimProvenance,
} from '../domain/narrative-memory-provenance.js';
import {
    projectLowTierContextV1,
} from '../domain/low-tier-context-v1.js';

const LOW_TIER_NARRATIVE_AUTHORITY_PROMPT_CONTRACT =
    NARRATIVE_AUTHORITY_PROMPT_CONTRACT
        .replaceAll(
            'memoryActivationCapsules',
            'memoryActivations',
        )
        .replaceAll(
            'historicalKnowledgeEvidence',
            'memoryActivations',
        );

export function createTurnPerformanceWorkflow(ports) {
    const {
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY =
        '',
        beginLiveSceneStream,
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
        buildSpatialContext,
        buildStructuredPlayerTurnSequence,
        buildTemporaryActorPromotionPolicy,
        createContextBudgetPlan,
        extractRoleResponseText,
        getActiveAddressingState,
        getAuthoritativeSceneSpells =
        () => [],
        getRequestHeaders,
        getSettings,
        parseItemOperationDirectives,
        parseJsonObject,
        recoverScenePerformancePayload,
        recordTurnDiagnostic =
        () => {},
        removeExplicitAddressDirective,
        resolvePlayerAddressing,
        resolveTemporaryActorRevealedName,
        sendRoleRequest,
        setLiveSceneStreamPhase,
        settleNarrativeTurnPerformance,
        translateOpeningValues,
        updateLiveSceneStream,
        validateScenePerformance,
    } = ports;

    const EXPLICIT_PROGRESSION_PATTERN =
    /(?:赶紧|立刻|现在|马上|开始|继续|带路|打开|开启|解锁|交给|给我|出发|跟上|跟着|进入|进去|走吧|走，|走。)|(?:open|unlock|start|continue|lead the way|let'?s go|go through|hand over)/i;

    function createSceneMomentumDirective(
        state,
        playerAction,
        budget,
    ) {
        const nextIntent = state.scene?.nextSceneIntent || null;
        const intentLocationReached =
        Boolean(
            nextIntent?.mapId &&
            nextIntent?.roomId &&
            nextIntent.mapId ===
                state.map?.activeMapId &&
            nextIntent.roomId ===
                state.map
                    ?.currentLocalNodeId,
        );
        return {
            required: Number(budget.elapsedMinutes) >= 15,
            explicitProgressionRequest:
            EXPLICIT_PROGRESSION_PATTERN.test(
                String(playerAction || ''),
            ),
            playerRoomMustRemain:
            state.map?.currentLocalNodeId || null,
            committedNextSceneIntent: nextIntent,
            intentLocationReached,
            minimumCompletedProcedureUnits:
            intentLocationReached &&
            Number(
                budget.elapsedMinutes,
            ) >= 15
                ? 1
                : 0,
            unresolvedPublicPressureEn:
            state.scene?.pacingPressureEn || '',
            instruction:
            intentLocationReached
                ? 'The committed intent location is already reached. Complete at least one visible procedural unit beyond entry, setup, announcement, or preparation.'
                : nextIntent
                    ? 'Advance a deterministic NPC or procedural step toward the committed next intent without changing the player room.'
                    : 'Advance one concrete NPC, practical, informational, access, or social step.',
        };
    }

    function projectPacingDirectiveForPerformance(
        pendingBeat,
        addressing,
    ) {
        if (
            pendingBeat?.status !==
            'pending'
        ) {
            return null;
        }
        const projected =
        structuredClone(pendingBeat);
        const collapse =
        projected.causalCollapse;
        if (!collapse) {
            return projected;
        }
        const addressedActorIds =
        new Set(
            addressing?.actorIds ||
            [],
        );
        projected.causalCollapse = {
            recordId:
            collapse.recordId ||
            collapse.id,
            kind: collapse.kind,
            surfaceMode:
            collapse.surfaceMode,
            visibleResiduesEn:
            collapse
                .visibleResiduesEn,
            aftermathEn:
            collapse.aftermathEn,
            witnessAccounts:
            (
                collapse
                    .witnessAccounts ||
                []
            ).filter(account =>
                addressedActorIds
                    .has(
                        account
                            .actorId,
                    )),
        };
        return projected;
    }

    function projectCurrentSceneForPerformance(
        scene,
    ) {
        if (
            !scene ||
            typeof scene !==
                'object'
        ) {
            return null;
        }
        const {
            summary,
            summaryEn,
            ...currentScene
        } = scene;
        const hasProgressed =
            (
                scene.timelineEntries ||
                []
            ).length > 1;
        return {
            ...currentScene,
            ...(
                hasProgressed
                    ? {}
                    : {
                        summary,
                        summaryEn,
                    }
            ),
        };
    }

    function createScenePerformancePrompt(
        state,
        playerAction,
        budget,
        retrievedKnowledge = [],
        movementResolution = null,
        momentumDirective = null,
        checkResolution = null,
        addressingOverride = null,
        mentionedKnownActors = [],
        contextPlan = createContextBudgetPlan(
            CONTEXT_SIZE_PRESETS.rich,
            DEFAULT_MODEL_SLOTS.low.maxResponseLength,
        ),
    ) {
        const addressing =
        addressingOverride
            ?.valid === true
            ? addressingOverride
            : resolvePlayerAddressing(
                getActiveAddressingState(
                    state,
                ),
                playerAction,
            );
        const narrativePlayerAction =
        removeExplicitAddressDirective(
            playerAction,
        );
        const currentRoomState =
        state.map
            ?.roomStates?.[
                `${state.map?.activeMapId}:${state.map?.currentLocalNodeId}`
            ] ||
        null;
        const sceneSafeRoomState =
        currentRoomState
            ? Object.fromEntries(
                Object.entries(
                    currentRoomState,
                ).filter(([key]) =>
                    key !==
                    'materialEffects'),
            )
            : null;
        const playerTurnSequence =
        buildStructuredPlayerTurnSequence(
            playerAction,
            addressing,
        );
        const itemDirectiveResult =
        parseItemOperationDirectives(
            playerAction,
            (
                state.items ||
                []
            ).filter(item =>
                item.visibility !==
                    'hidden'),
        );
        const privateKnowledgeActorIds =
        new Set(
            addressing.actorIds ||
            [],
        );
        const presentActorIds = new Set(
            state.actors.filter(actor => actor.present !== false).map(actor => actor.id),
        );
        const behavioralEnvironment =
        buildBehavioralEnvironment(
            state,
        );
        const pacingDirective =
        projectPacingDirectiveForPerformance(
            state.pacingDirector
                ?.pendingBeat,
            addressing,
        );
        const authoritativeSceneSpells =
        getAuthoritativeSceneSpells(
            state,
        );
        const calendarContext =
            Array.isArray(
                state.calendar
                    ?.entries,
            )
                ? projectCalendarSceneContext(
                    state,
                )
                : {
                    entries: [],
                    storySources: [],
                };
        const calendarEntries =
            calendarContext.entries;
        const calendarStorySources =
            calendarContext.storySources;
        const narrativeContext =
            buildNarrativePromptContext(
                state,
                retrievedKnowledge,
                {
                    actorIds: [
                        ...presentActorIds,
                        ...(
                            addressing
                                .actorIds ||
                            []
                        ),
                    ],
                },
            );
        const actorIds = [
            ...new Set([
                ...presentActorIds,
                ...(
                    addressing
                        .actorIds ||
                    []
                ),
                ...mentionedKnownActors,
            ]),
        ];
        const lowTierContext =
            projectLowTierContextV1(
                state,
                {
                    actorIds,
                    playerTurn: {
                        playerAction:
                            narrativePlayerAction,
                        playerTurnSequence,
                        addressing,
                        privateKnowledgeActorIds:
                            [
                                ...privateKnowledgeActorIds,
                            ],
                        itemDirectives:
                            itemDirectiveResult
                                .directives,
                        itemDirectiveErrors:
                            itemDirectiveResult
                                .errors,
                        elapsedMinutes:
                            budget.elapsedMinutes,
                        targetWordRange: [
                            budget.minimumWords,
                            budget.maximumWords,
                        ],
                        ensemblePolicy:
                            budget.ensemble
                                ? {
                                    activeNamedActorCount:
                                        budget
                                            .activeNamedActorCount,
                                    targetSegmentRange: [
                                        budget
                                            .minimumSegments,
                                        budget
                                            .maximumSegments,
                                    ],
                                    primaryProgressionShare:
                                        budget
                                            .primaryProgressionShare,
                                    maximumIndividuatedSecondaryActors:
                                        budget
                                            .maximumIndividuatedSecondaryActors,
                                }
                                : null,
                        movementResolution,
                        checkResolution,
                    },
                    sceneFacts: {
                        authoritySnapshot:
                            narrativeContext
                                .authoritySnapshot,
                        clockBeforeTurn:
                            state.clock,
                        currentScene:
                            projectCurrentSceneForPerformance(
                                state.scene,
                            ),
                        currentLocation:
                            state.location,
                        currentRoomId:
                            state.map
                                ?.currentLocalNodeId,
                        currentRoomState:
                            sceneSafeRoomState,
                        currentMaterialState:
                            buildCurrentMaterialState(
                                state,
                            ),
                        formalItems:
                            (
                                state.items ||
                                []
                            )
                                .filter(item =>
                                    item.visibility !==
                                    'hidden')
                                .map(item => ({
                                    id: item.id,
                                    type:
                                        item.type ||
                                        item.kind,
                                    labelEn:
                                        item.labelEn,
                                    ownerId:
                                        item.ownerId,
                                    holderId:
                                        item.holderId,
                                    state:
                                        item.state ||
                                        item.status,
                                    isEquipped:
                                        item
                                            .isEquipped ===
                                        true,
                                })),
                        calendarEntries,
                        calendarStorySources,
                        behavioralEnvironment,
                        authoritativeSceneSpells,
                    },
                    actionOpportunities: [
                        momentumDirective,
                        pacingDirective,
                        {
                            spatialContext:
                                buildSpatialContext(
                                    state,
                                ),
                        },
                        {
                            temporaryActorPromotionPolicy:
                                buildTemporaryActorPromotionPolicy(
                                    state,
                                ),
                        },
                    ].filter(Boolean),
                    memoryActivationCapsules:
                        narrativeContext
                            .memoryActivationCapsules,
                    prohibitions: [
                        {
                            type:
                                'actor_acl',
                            privateKnowledgeActorIds:
                                [
                                    ...privateKnowledgeActorIds,
                                ],
                        },
                        {
                            type:
                                'historical_provenance',
                            rule:
                                'Concrete history requires a hydrated supporting Event in the matching actor activation.',
                        },
                        {
                            type:
                                'player_control',
                            rule:
                                'Never add player speech, thoughts, intentions, or choices.',
                        },
                    ],
                },
            );
        return [
            {
                role: 'system',
                content: `You are the low-tier On-Scene Performer for a persistent Harry Potter RPG. Render the already committed scene into vivid observable prose, physical action, and NPC dialogue. Return exactly one JSON object with no Markdown.

${CANON_CAST_IDENTITY_CONTRACT}

${LOW_TIER_NARRATIVE_AUTHORITY_PROMPT_CONTRACT}

Strict boundaries from prohibitions:
- segments is the only required output field. State bookkeeping is handled by a deterministic settlement graph after your response. Omit optional metadata whenever no real state change occurred.
- You may perform mundane blocking, gestures, conversation, sensory changes, and ordinary consequences that follow directly from the player's stated action.
- You may not directly establish a new location, formal NPC, Item, spell, relationship, hidden fact, clue, rule result, or plot turn as authoritative state. You may submit an item_update proposal; a new object remains only a player-review candidate until the player explicitly records it. A genuinely new incantation may appear in observable narrative only under the authoritativeSceneSpells rule below and likewise remains a player-review candidate. The sole NPC exception is the temporary actor promotion policy in actionOpportunities: promote a specific unnamed crowd member whom the player has already selected for direct, continuing interaction.
- playerTurn is the sole authoritative ordered player input. direct_speech and broadcast_speech entries are already routed by the rules layer; action entries are never spoken dialogue. Preserve lineIndex and speechOrder. Never infer, replace, or merge an addressee from prose.
- playerTurn is input context, not output material. The player's submitted action and speech are already visible in chat: never copy, quote, paraphrase, translate, or reenact them in segments; never emit a dialogue segment with actorId "player". Begin with observable consequences and NPC/environment responses. Every output dialogue segment must be new NPC speech using an exact actorId from actorCards.
- playerTurn contains routing metadata for its ordered input. Do not reinterpret playerTurn or names inside action entries to infer another addressee.
- mentionedKnownActors is rules-layer authority for familiar people explicitly named in action prose. Each listed actor is now present in the current room. Depict an observable response to the acknowledged gesture or action; do not replace them with an anonymous bystander.
- Every direct block's targetActorId must visibly answer, refuse, evade, fail to hear, be interrupted for a concrete reason, or leave before the next direct block is resolved. Broadcast blocks address the room. In open mode, do not infer a private addressee from names mentioned in prose.
- memoryActivations contains sealed actor-ID capsules. An NPC may use only the capsule whose actor ID exactly equals that NPC's ID. Never transfer, paraphrase, imply, or reveal a memory, directive, impression, claim, relationship, rumor, private goal, fear, secret, or inference from one capsule through another NPC or the narrator.
- memoryActivations contains non-secret relationship continuity for the matching actor. If the activation establishes that the actor has met the player, treat the player as already known. Treat activated known actor IDs as people that actor has already met. Use the activated relationship stance and supporting events instead of generic or stale relationship labels, but never transfer one actor's continuity through another.
- actorCards are public performance data only. An actor absent from memoryActivations may use only current-scene observations, public profile fields, the current player action, common memory activation facts, and public memoryActivations.
- socialKnowledge statements and relationship evidence are known to that capsule's actor because they spoke, directly participated, or were recorded as a witness. The fact that another capsule knows something never makes it common knowledge.
- stateProposals are sparse, optional hints. Emit one only when the prose actually changes an NPC's activity/presence/room, creates a temporary actor, changes an item, or supplies a directly witnessed social hint. Never repeat unchanged state.
- social_hint is optional and actor-scoped. Never write core memory, relationship labels, private facts, or deductions. The settlement graph enforces visibility, cooldown, and significance independently.
- Follow the committed scene, actorCards, local records, and today's medium-tier directives exactly.
- sceneFacts contains only schedules explicitly claimed by the current scene. It contains their public beat/storyline sources. Never infer another schedule from the clock, participant, location, tag, or planningTier, and never write, cancel, reschedule or settle Calendar state.
- currentScene.summary/summaryEn is supplied only while it still describes the scene opening. After the scene timeline advances, current actors, currentActivityEn, currentMaterialState, currentRoomState, and timelineEntries are the binding present-tense authority.
- currentScene.timelineEntries is chronological history, not a set of simultaneous facts. Later form, position, presence, and material entries supersede earlier ones.
- Player or NPC dialogue may recall an earlier form, use a nickname, joke, speculate, or simply be mistaken. Such speech does not create another entity or override actorCards. A past transformation of one actor is not a second simultaneous creature unless a separate current actor or material entity explicitly exists.
- Daily directives can outlive a scene transition. Current committed scene, location, rooms, and currentActivityEn always override stale locations or completed actions mentioned in a daily directive.
- behavioralEnvironment is binding current context. Materially embody time period, daylight, sleep pressure, curfew, weather, exposure, clothing, shelter, noise, and activity effects when relevant. It overrides stale daily timing or location guidance. Do not recite it as a checklist.
- If pacingDirective is supplied, it is already committed mid-tier authority. Realize its beat and pressure during this turn using only the actors already present in this input, plus any player-selected unnamed person who must be promoted under temporaryActorPromotionPolicy. Do not add anything else beyond that directive.
- If pacingDirective contains causalCollapse, show its visibleResiduesEn and aftermathEn before explaining anything. The narrator must not state or infer the hidden cause. Only an actor-specific witnessAccounts entry or that actor's sealed causalFacts may be spoken, and only by the matching directly addressed actor.
- currentRoomState.visibleResiduesEn contains previously committed aftermath that remains physically or institutionally observable. Preserve it until a later authoritative state change removes it; visibility does not grant knowledge of its hidden cause.
- A named residue or belonging never makes its owner present. Only actorCards entries may speak, act, move, or receive state proposals; do not admit an absent owner because their blanket, trunk, note, damage, or other aftermath remains in the room.
- currentMaterialState is binding visual state for the player, present actors, and this room only. Preserve active outfits, accessories, hairstyles, visible conditions, held objects and hands, placements, moves, removals, furnishing adjustments, damage, repairs, dirt, and cleaning silently unless relevant; do not reset anything merely because this turn does not mention it.
- implicitItemPolicy grants ordinary identity-appropriate objects without creating Items: students have normal uniform, quills, textbooks and school supplies; professors have ordinary robes and teaching/office supplies; shopkeepers have routine stock and tools; everyone has normal clothing, food, household and hygiene objects. Use these naturally without IDs, quantities, history or item_update proposals until a completed gift, loan, return, theft, or deliberate retention makes the specific object socially persistent.
- formalItems is the complete player-visible tracked Item list. Use its stable ID for carry/place/equip/unequip/give/lend/consume/damage/clean/lose/destroy proposals. Never rename an existing Item.
- itemDirectives pairs a structured player-intent operation with one stable formal Item ID. Treat it as authoritative object selection and intended operation, but not as proof of success. Narrate the attempt, then emit an item_update only when this turn's observable result actually completes or changes that operation. Recipient identity for give/lend still comes from the natural player action.
- itemDirectiveErrors are diagnostics for malformed or unknown references. Never guess a replacement Item or mutate state from an invalid directive.
- Propose acquire for a new candidate only when ownership, a completed gift/loan/return/theft, social meaning, clue/promise value, signature identity, or future plot consequences make durable tracking useful. Include objective appearance and exact evidence from this turn. A transferred ordinary quill, book, classroom supply, or everyday object crosses the implicit boundary; preserve lender ownerId and borrower holderId with transferMode loan. Untransferred ordinary clothing and transient props stay implicit.
- Use only facts already observable in the scene or explicitly supplied in the scene-safe local records. Never disclose a locked clue or infer a private fact.
- Never add speech, thoughts, intentions, or choices for the player beyond the supplied action.
- NPCs have agency. They must pursue their committed goals, initiate practical steps, and act without waiting for the player to prompt every motion.
- Do not stop immediately before a deterministic NPC action that the player already requested and whose prerequisites are satisfied. Opening an established door, demonstrating a known mechanism, handing over a prepared object, or beginning an agreed procedure is progression, not control of the player.
- Never turn "McGonagall opens the wall" into "McGonagall raises her wand and is about to open the wall." Complete the NPC action, then stop at the new choice or consequence it creates.
- Do not move the player to another authoritative room unless movementResolution already committed that move. NPCs may open access, move along valid routes, and expose what lies beyond while the player remains free to follow or refuse.
- The rules layer has already settled player movement in spatialContext. Begin with the player at that committed room and never move them back.
- NPCs in another room may react only when spatialContext says they can see or hear the player. Do not teleport an NPC between rooms.
- actor_move proposals may move an NPC only through existing connected rooms on the same map. Omit the proposal when no movement occurs.
- If checkResolution is supplied, the local rules layer has already resolved the uncertain action. Depict its exact outcome and consequences; never reroll, change the modifier, soften a failure, or stop before the resolved outcome.
- If checkResolution.spellObservation is supplied, the player actively tried to identify that catalog spell or technique. Apply the resolved observation outcome. On failure or catastrophic_failure, do not reveal its name, incantation, effect, or stable ID unless a present NPC explicitly teaches or explains it during this result. On success_with_cost, success, or critical_success, name the supplied spell and incantation visibly; only those outcomes learn through observation.
- authoritativeSceneSpells is binding spell identity for the current scene. If an NPC names, writes, teaches, explains, demonstrates, or casts one of these spells, use its exact spellId, incantation, name, and effect. Never invent a synonym, substitute incantation, or custom spell for the same technique. You may introduce a genuinely new custom incantation only when it is not a replacement for any authoritativeSceneSpells entry; the rules layer will treat it as a player-review candidate rather than established Canon.
- Never reveal checkResolution.hidden, an opponent roll, or an exact hidden difficulty in prose or dialogue.
- If checkResolution is null, do not invent a roll or claim that a check occurred.
- The scene must plausibly cover ${budget.elapsedMinutes} in-world minutes. This is a duration to dramatize, not a timestamp to mention.
- Quantified relative narration such as "five minutes later" or "ten minutes ago" is allowed only when it remains within this turn's ${budget.elapsedMinutes}-minute span. Never invent an absolute clock, date, opening time, transport schedule, external countdown, or a relative duration longer than this turn.
- Do not pad with empty chatter. Let conversation, practical movement, pauses, social friction, and environmental continuity make the duration believable.
- For this duration and cast size, write approximately ${budget.minimumWords}-${budget.maximumWords} English words across ${budget.minimumSegments || 4}-${budget.maximumSegments || 16} ordered segments.
- Include at least two narration segments. Use dialogue segments only for present actors.
- When ensemblePolicy is supplied, the extra budget exists to preserve both crowd life and story movement. Reserve at least ${Math.round((budget.primaryProgressionShare || 0.4) * 100)}% of the response for the primary interaction and concrete progression after the player's immediate action.
- Ensemble texture is simultaneous background, not a roll call. Individuate at most ${budget.maximumIndividuatedSecondaryActors || 2} secondary named actors unless the player directly affects more. Do not spend one reaction sentence proving that every present actor still exists.
- Apply temporaryActorPromotionPolicy independently of the medium-tier pacing cooldown. Merely looking across a crowd keeps people anonymous. Selecting one specific unnamed person and sitting beside, speaking to, touching, displacing, following, blocking, giving to, taking from, or otherwise directly affecting them requires promotion in this response.
- A promoted person must use a new stable snake_case ID not listed in reservedActorIds, appear visibly in segments, and receive one temporary_actor proposal. Use an observable descriptor as nameEn until the story reveals a real name. Do not invent secrets, private history, special powers, or a relationship.
- A promoted actor's publicDescriptionEn contains stable physical traits only. Exclude clothing, accessories, held items, nearby belongings, pose, activity, and location; currentActivityEn and the material observer own those dynamic details.
- A 15-minute turn must materially advance at least one concrete axis: NPC initiative, access change, practical procedure, new bounded information, or social position. Furnishings, bystander reactions, and repeated explanations do not count by themselves.
- If momentumDirective.explicitProgressionRequest is true, complete that requested procedural step in the prose. An optional signals.sceneProgression may report the completion, but omission never invalidates good prose.
- If momentumDirective.intentLocationReached is true, entry, lining up, opening doors, introductions, songs, announcements, and "about to begin" beats are setup rather than completed procedure units. Render at least momentumDirective.minimumCompletedProcedureUnits finished unit beyond setup before stopping.
- When signals.sceneProgression is supplied, summaryEn must include every consequential public result from this response: tracked Item damage/destruction, teacher praise or House-point awards, public reprimands, and other room-visible outcomes. Do not reduce a multi-result public event to only its first action.
- signals.eventEnded is optional and true only when a bounded interaction or procedure phase genuinely closes. Omit signals rather than filling them mechanically.
- If pacingDirective is visibly realized, signals.pacingBeatRealized may be true. The settlement graph does not require this bookkeeping field.

${NPC_IDENTITY_PROMPT_BOUNDARY}

Schema:
{
  "segments":[
    {"type":"narration","textEn":"observable scene prose and action"},
    {
      "type":"dialogue",
      "actorId":"actor_id",
      "textEn":"spoken words only",
      "historicalClaims":[
        {
          "claimTextEn":"exact concrete historical claim substring from textEn",
          "sourceEventIds":["event ID from this actor's supportingEvents sourceRefs"]
        }
      ]
    }
  ],
  "stateProposals":[
    {
      "type":"actor_activity|actor_move|actor_enter|actor_exit",
      "actorId":"actor_id",
      "currentActivityEn":"only when changed",
      "mapId":"existing_map_id when moving",
      "roomId":"reachable_room_id when moving"
    },
    {
      "type":"social_hint",
      "actorId":"actor_id",
      "firstImpressionOfPlayerEn":"optional first impression",
      "impressionOfPlayerEn":"optional concrete current opinion based on this turn",
      "memoryUpdate":{
        "summaryEn":"optional directly witnessed experience",
        "significance":"everyday|notable",
        "lastingImpactEn":"required only for notable"
      }
    },
    {
      "type":"item_update",
      "item":{
        "id":"stable_item_id",
        "operation":"acquire|carry|place|equip|unequip|give|lend|consume|damage|clean|lose|destroy",
        "type":"wand|eyewear|clothing|accessory|document|container|money|key|book|tool|consumable|keepsake|clue|other",
        "labelEn":"required for a new candidate",
        "appearanceEn":"objective visible appearance; required for a new candidate",
        "ownerId":"player or actor ID",
        "holderId":"player or actor ID",
        "targetHolderId":"required for give/lend",
        "transferMode":"none|gift|loan|theft|return",
        "storyRoles":["signature|social|clue|promise|keepsake"],
        "visibility":"public|owner_known|hidden",
        "isEquipped":false,
        "held":false,
        "evidenceText":"exact substring from player action or generated English segments"
      }
    },
    {
      "type":"temporary_actor",
      "actor":{
        "id":"new_stable_snake_case_id",
        "nameEn":"observable public name or descriptor",
        "roleEn":"ordinary scene role",
        "publicDescriptionEn":"stable physical traits only; no clothing, props, activity, or location",
        "personalityEn":"performable public temperament",
        "speechStyleEn":"performable speech style",
        "currentActivityEn":"observable activity at entry"
      }
    }
  ],
  "signals":{
    "eventEnded":false,
    "pacingBeatRealized":false,
    "sceneProgression":{
      "type":"npc_initiative|access_change|practical_step|new_information|social_shift",
      "summaryEn":"optional completed change",
      "completedRequestedStep":false
    }
  }
}

${CANON_WIT_TONE_CONTRACT}`,
            },
            {
                role: 'user',
                content:
                    JSON.stringify(
                        lowTierContext,
                    ),
            },
        ];
    }

    async function settleScenePerformance(
        payload,
        state,
        {
            playerAction,
            movementResolution,
            momentumDirective,
            checkResolution,
            admittedActors,
        },
    ) {
        const input = {
            payload,
            worldState: state,
            playerAction,
            movementResolution,
            momentumDirective,
            checkResolution,
            admittedActors,
        };
        try {
            const response = await fetch(
                '/api/hogwarts-mud/turn/settle',
                {
                    method: 'POST',
                    headers:
                    getRequestHeaders(),
                    body:
                    JSON.stringify(
                        input,
                    ),
                },
            );
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`,
                );
            }
            const result =
            await response.json();
            if (
                !result?.performance ||
            typeof result.performance !==
                'object'
            ) {
                throw new Error(
                    'Turn settlement graph returned no performance.',
                );
            }
            return {
                ...result.performance,
                settlementSource:
                'langgraph',
            };
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Turn settlement graph unavailable; using local reducer',
                error,
            );
            return {
                ...settleNarrativeTurnPerformance(
                    payload,
                    state,
                    {
                        playerAction,
                        movementResolution,
                        momentumDirective,
                        checkResolution,
                        admittedActors,
                    },
                ),
                settlementSource:
                'local_reducer',
            };
        }
    }

    async function generateScenePerformance(
        lowSlot,
        state,
        playerAction,
        budget,
        retrievedKnowledge,
        movementResolution,
        momentumDirective,
        checkResolution,
        addressing,
        mentionedKnownActors,
        contextPlan,
    ) {
        if (!lowSlot.profileId) {
            throw new Error('现场表演没有可用的低档 Connection Profile。');
        }
        const scenePrompt = createScenePerformancePrompt(
            state,
            playerAction,
            budget,
            retrievedKnowledge,
            movementResolution,
            momentumDirective,
            checkResolution,
            addressing,
            mentionedKnownActors,
            contextPlan,
        );
        const originalSceneInput =
            JSON.parse(
                scenePrompt[1].content,
            );
        recordTurnDiagnostic(
            'narrative_context',
            {
                authority: {
                    version:
                        originalSceneInput
                            .sceneFacts
                            ?.authoritySnapshot
                            ?.version ??
                        null,
                    stateRevision:
                        originalSceneInput
                            .sceneFacts
                            ?.authoritySnapshot
                            ?.stateRevision ??
                        null,
                },
                activationCapsuleIds: {
                    common:
                        originalSceneInput
                            .memoryActivations
                            ?.common
                            ?.capsuleId ||
                        '',
                    byActorId:
                        Object.fromEntries(
                            Object.entries(
                                originalSceneInput
                                    .memoryActivations
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
        beginLiveSceneStream(checkResolution);
        let response = await sendRoleRequest(
            lowSlot,
            scenePrompt,
            {
                json: true,
                stream: true,
                onProgress: rawText =>
                    updateLiveSceneStream(
                        rawText,
                        'receiving',
                    ),
            },
        );
        let raw = extractRoleResponseText(response);
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            recordTurnDiagnostic(
                'model_response',
                {
                    attempt,
                    rawCharacters:
                        typeof raw ===
                            'string'
                            ? raw.length
                            : JSON.stringify(
                                raw || {},
                            ).length,
                },
            );
            try {
                let parsedPayload;
                try {
                    parsedPayload = parseJsonObject(raw);
                } catch (parseError) {
                    parsedPayload =
                    recoverScenePerformancePayload(raw);
                    if (!parsedPayload) throw parseError;
                }
                if (
                    !Array.isArray(
                        parsedPayload
                            ?.segments,
                    )
                ) {
                    parsedPayload =
                    recoverScenePerformancePayload(raw) ||
                    parsedPayload;
                }
                const payload =
                await settleScenePerformance(
                    parsedPayload,
                    state,
                    {
                        playerAction,
                        movementResolution,
                        momentumDirective,
                        checkResolution,
                        admittedActors:
                            mentionedKnownActors,
                    },
                );
                const validation = validateScenePerformance(
                    payload,
                    state,
                    budget,
                    momentumDirective,
                    checkResolution,
                    movementResolution,
                    playerAction,
                );
                const historicalClaimValidation =
                    validateHistoricalClaimProvenance(
                        payload.segments,
                        originalSceneInput
                            .memoryActivations,
                    );
                validation.errors.push(
                    ...historicalClaimValidation
                        .errors,
                );
                validation.valid =
                    validation
                        .errors
                        .length === 0;
                recordTurnDiagnostic(
                    'performance_validation',
                    {
                        attempt,
                        budget,
                        wordCount:
                            (
                                payload
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
                        segmentCount:
                            payload
                                .segments
                                ?.length ||
                            0,
                        validation,
                        settlementSource:
                            payload
                                .settlementSource,
                    },
                );
                if (!validation.valid) {
                    throw new Error(validation.errors.join('；'));
                }
                setLiveSceneStreamPhase(
                    'receiving',
                    payload.segments,
                );
                return payload;
            } catch (error) {
                lastError = error;
                recordTurnDiagnostic(
                    'performance_repair',
                    {
                        attempt,
                        error:
                            String(
                                error
                                    ?.message ||
                                error,
                            ),
                        willRetry:
                            attempt === 0,
                    },
                );
                if (attempt > 0) break;
                setLiveSceneStreamPhase('repairing');
                const validationConflict = {
                    stage:
                        'scene_performance_validation',
                    errors:
                        String(
                            error?.message ||
                            error,
                        )
                            .split('；')
                            .map(value =>
                                value.trim())
                            .filter(Boolean)
                            .slice(0, 16),
                };
                let invalidOutput = raw;
                try {
                    invalidOutput =
                        parseJsonObject(raw);
                } catch {
                    // Keep the raw response when it is not valid JSON.
                }
                const repairContext =
                    projectLowTierContextV1(
                        state,
                        {
                            actorIds:
                                originalSceneInput
                                    .actorCards
                                    .map(card =>
                                        card.actorId),
                            playerTurn: {
                                ...originalSceneInput
                                    .playerTurn,
                                repair: {
                                    validationConflict,
                                    validationError:
                                        validationConflict
                                            .errors
                                            .join('；'),
                                    invalidOutput,
                                },
                            },
                            sceneFacts:
                                originalSceneInput
                                    .sceneFacts,
                            actionOpportunities:
                                originalSceneInput
                                    .actionOpportunities,
                            memoryActivationCapsules:
                                originalSceneInput
                                    .memoryActivations,
                            prohibitions:
                                originalSceneInput
                                    .prohibitions,
                        },
                    );
                response = await sendRoleRequest(lowSlot, [
                    {
                        role: 'system',
                        content: `Repair only the narrative core of the on-scene performance JSON. Return ${budget.minimumSegments || 4}-${budget.maximumSegments || 16} ordered narration/dialogue segments with at least two narration segments. Every segment must contain concrete observable prose or spoken words; never return ellipses, TBD, or placeholder text. Each dialogue segment must use a supplied present actor ID. Preserve every already valid segment, but rewrite any sentence named by validationError. For a concrete prior time, place, action, or quotation, retain it only in the matching actor's dialogue and add historicalClaims with an exact claimTextEn substring plus sourceEventIds from that actor's supportingEvents; otherwise remove the unsupported detail. The narrator and other actors cannot consume that Event. stateProposals and signals are optional; omit them rather than inventing metadata. If checkResolution exists, visibly apply that exact local result without rerolling or changing it. If momentumDirective requests a deterministic action whose prerequisites are satisfied, complete it in the prose rather than stopping at preparation. If a pacingDirective exists, visibly perform it using the supplied actors. Preserve the committed player room and actor rooms. The prose must plausibly cover ${budget.elapsedMinutes} minutes. Quantified relative narration is allowed only within that ${budget.elapsedMinutes}-minute span; never invent an absolute clock, date, schedule, external countdown, or longer relative duration. Do not add world facts or locked clues. Return one JSON object with no Markdown.`,
                    },
                    {
                        role: 'user',
                        content:
                            JSON.stringify(
                                repairContext,
                            ),
                    },
                ], {
                    json: true,
                    stream: true,
                    onProgress: rawText =>
                        updateLiveSceneStream(
                            rawText,
                            'repairing',
                        ),
                });
                raw = extractRoleResponseText(response);
            }
        }
        throw new Error(`低档现场表演连续两次无效：${String(lastError?.message || lastError)}`);
    }

    function buildSceneTransaction(
        performance,
        budget,
        pacingBeat = null,
        checkResolution = null,
    ) {
        return {
            protocolVersion:
            performance
                .protocolVersion ||
            2,
            settlementSource:
            performance
                .settlementSource ||
            'unknown',
            elapsedMinutes: budget.elapsedMinutes,
            instantaneousMagic: budget.elapsedMinutes < 15,
            exceptionReasonEn: budget.elapsedMinutes < 15
                ? 'The local semantic adjudicator classifies the enacted action as instantaneous.'
                : '',
            publicEventEn: performance.publicEventEn,
            eventEnded:
            performance.eventEnded ===
            true,
            sceneProgression: structuredClone(
                performance.sceneProgression,
            ),
            segments: performance.segments,
            actorPresence:
            structuredClone(
                performance.actorPresence,
            ),
            actorUpdates: Array.isArray(performance.actorUpdates)
                ? performance.actorUpdates
                : [],
            temporaryActorEntrances:
            Array.isArray(
                performance
                    .temporaryActorEntrances,
            )
                ? performance
                    .temporaryActorEntrances
                : [],
            itemUpdates:
            Array.isArray(
                performance.itemUpdates,
            )
                ? performance.itemUpdates
                : [],
            revealedClues:
            Array.isArray(
                performance
                    .revealedClues,
            )
                ? performance
                    .revealedClues
                : [],
            settlementWarnings:
            Array.isArray(
                performance
                    .settlementWarnings,
            )
                ? performance
                    .settlementWarnings
                : [],
            ...(checkResolution ? {
                checkResolution: structuredClone(
                    checkResolution,
                ),
            } : {}),
            ...(pacingBeat ? {
                pacingBeat: structuredClone(pacingBeat),
            } : {}),
        };
    }

    async function localizeTurnTransaction(transaction) {
        const temporaryActorEntrances =
        (
            transaction
                .temporaryActorEntrances ||
            []
        ).map(actor => ({
            ...actor,
            ...resolveTemporaryActorRevealedName(
                actor,
                transaction.segments,
            ),
        }));
        const source = {
            ...transaction,
            temporaryActorEntrances,
        };
        if (!getSettings().translationEnabled) {
            return source;
        }
        const values = [
            source.publicEventEn,
            ...source.segments.map(segment => segment.textEn),
            ...(source.actorUpdates || []).flatMap(update => [
                update.currentActivityEn || '',
                update.currentIntentEn || '',
                update.impressionOfPlayerEn || '',
                update.memoryUpdate?.summaryEn || '',
            ]),
            ...temporaryActorEntrances.flatMap(actor => [
                actor.nameEn,
                actor.roleEn,
                actor.publicDescriptionEn,
                actor.personalityEn,
                actor.speechStyleEn,
                actor.currentActivityEn,
            ]),
            ...(source.revealedClues || []).flatMap(clue => [
                clue.labelEn,
                clue.detailEn,
            ]),
        ];
        const translated = await translateOpeningValues(values);
        let cursor = 0;
        const localized = {
            ...source,
            publicEvent: translated[cursor++],
            segments: source.segments.map(segment => ({
                ...segment,
                textZh: translated[cursor++],
            })),
            actorUpdates: [],
            temporaryActorEntrances: [],
            revealedClues: [],
        };
        (source.actorUpdates || []).forEach(update => {
            const currentActivity = translated[cursor++];
            const currentIntent = translated[cursor++];
            const impressionOfPlayer = translated[cursor++];
            const memorySummary = translated[cursor++];
            localized.actorUpdates.push({
                ...update,
                currentActivity,
                currentIntent,
                ...(update.impressionOfPlayerEn
                    ? { impressionOfPlayer }
                    : {}),
                ...(update.memoryUpdate
                    ? {
                        memoryUpdate: {
                            ...update.memoryUpdate,
                            summary: memorySummary,
                        },
                    }
                    : {}),
            });
        });
        temporaryActorEntrances.forEach(actor => {
            localized
                .temporaryActorEntrances
                .push({
                    ...actor,
                    name:
                    translated[cursor++],
                    role:
                    translated[cursor++],
                    publicDescription:
                    translated[cursor++],
                    personality:
                    translated[cursor++],
                    speechStyle:
                    translated[cursor++],
                    currentActivity:
                    translated[cursor++],
                });
        });
        (source.revealedClues || []).forEach(clue => {
            localized.revealedClues.push({
                ...clue,
                label: translated[cursor++],
                detail: translated[cursor++],
            });
        });
        return localized;
    }

    return {
        EXPLICIT_PROGRESSION_PATTERN,
        createSceneMomentumDirective,
        projectPacingDirectiveForPerformance,
        createScenePerformancePrompt,
        settleScenePerformance,
        generateScenePerformance,
        buildSceneTransaction,
        localizeTurnTransaction,
    };
}
