import {
    projectCalendarSceneContext,
} from '../domain/calendar-projection.js';
import {
    NARRATIVE_AUTHORITY_PROMPT_CONTRACT,
    buildNarrativePromptContext,
} from '../domain/narrative-prompt-context.js';
import {
    projectLowTierContextV1,
} from '../domain/low-tier-context-v1.js';
import {
    MODEL_OUTPUT_EVIDENCE_AUTHORITY,
    collectNonEnglishAuthorityFields,
    createModelLanguageMismatch,
    partitionModelSegments,
} from '../domain/model-language-adoption.js';
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

const LOW_OUTPUT_KEYS =
    new Set([
        'segments',
        'stateProposals',
        'signals',
    ]);
const LOW_SEGMENT_KEYS = {
    narration:
        new Set([
            'type',
            'textEn',
            'rawText',
            'language',
            'authority',
        ]),
    dialogue:
        new Set([
            'type',
            'actorId',
            'textEn',
            'rawText',
            'language',
            'authority',
            'historicalClaims',
        ]),
};

function adoptLowPerformanceLanguage(
    payload,
) {
    const partition =
        partitionModelSegments(
            payload?.segments,
            {
                taskId:
                    'scene_performance',
            },
        );
    const diagnostics = [
        ...partition.diagnostics,
    ];
    const stateProposals =
        (
            Array.isArray(
                payload?.stateProposals,
            )
                ? payload
                    .stateProposals
                : []
        ).filter((
            proposal,
            index,
        ) => {
            const mismatches =
                collectNonEnglishAuthorityFields(
                    proposal,
                    {
                        path:
                            `stateProposals[${index}]`,
                    },
                );
            diagnostics.push(
                ...mismatches.map(
                    fieldPath =>
                        createModelLanguageMismatch({
                            taskId:
                                'scene_performance',
                            fieldPath,
                            recordId:
                                proposal?.actorId ||
                                proposal?.item
                                    ?.id ||
                                String(index),
                        }),
                ),
            );
            return mismatches.length ===
                0;
        });
    const signalMismatches =
        collectNonEnglishAuthorityFields(
            payload?.signals,
            {
                path: 'signals',
            },
        );
    diagnostics.push(
        ...signalMismatches.map(
            fieldPath =>
                createModelLanguageMismatch({
                    taskId:
                        'scene_performance',
                    fieldPath,
                    recordId: 'signals',
                }),
        ),
    );
    const accepted = {
        ...payload,
        segments:
            partition
                .displaySegments,
        stateProposals,
        ...(signalMismatches.length
            ? {
                signals: {},
            }
            : {}),
    };
    Object.defineProperty(
        accepted,
        'modelLanguageDiagnostics',
        {
            value:
                diagnostics,
            enumerable: false,
        },
    );
    return accepted;
}
const LOW_PROPOSAL_KEYS = {
    actor_activity:
        new Set([
            'type',
            'actorId',
            'currentActivityEn',
        ]),
    actor_move:
        new Set([
            'type',
            'actorId',
            'currentActivityEn',
            'mapId',
            'roomId',
        ]),
    actor_enter:
        new Set([
            'type',
            'actorId',
            'currentActivityEn',
            'mapId',
            'roomId',
        ]),
    actor_exit:
        new Set([
            'type',
            'actorId',
            'currentActivityEn',
            'mapId',
            'roomId',
        ]),
    social_hint:
        new Set([
            'type',
            'actorId',
            'currentActivityEn',
            'firstImpressionOfPlayerEn',
        ]),
    item_update:
        new Set([
            'type',
            'item',
        ]),
    temporary_actor:
        new Set([
            'type',
            'actor',
        ]),
};
const LOW_ITEM_PROPOSAL_KEYS =
    new Set([
        'id',
        'operation',
        'type',
        'labelEn',
        'appearanceEn',
        'ownerId',
        'holderId',
        'targetHolderId',
        'transferMode',
        'storyRoles',
        'visibility',
        'isEquipped',
        'held',
        'evidenceText',
    ]);

export function sanitizeLowScenePerformancePayload(
    payload,
) {
    if (
        !payload ||
        typeof payload !==
            'object' ||
        Array.isArray(
            payload,
        ) ||
        !Array.isArray(
            payload.stateProposals,
        )
    ) {
        return payload;
    }
    const diagnostics = [];
    payload.stateProposals =
        payload.stateProposals.map(
            (
                proposal,
                proposalIndex,
            ) => {
                if (
                    !proposal ||
                    typeof proposal !==
                        'object' ||
                    Array.isArray(
                        proposal,
                    )
                ) {
                    return proposal;
                }
                const allowed =
                    LOW_PROPOSAL_KEYS[
                        proposal.type
                    ];
                if (!allowed) {
                    return proposal;
                }
                const droppedFields =
                    Object.keys(proposal)
                        .filter(field =>
                            !allowed.has(field));
                if (!droppedFields.length) {
                    return proposal;
                }
                diagnostics.push({
                    proposalIndex,
                    fields: droppedFields,
                });
                return Object.fromEntries(
                    Object.entries(
                        proposal,
                    ).filter(([
                        field,
                    ]) =>
                        allowed.has(field)),
                );
            },
        );
    Object.defineProperty(
        payload,
        'modelShapeDiagnostics',
        {
            value: diagnostics,
            enumerable: false,
        },
    );
    return payload;
}

const LOW_PROGRESSION_TYPES =
    new Set([
        'npc_initiative',
        'access_change',
        'practical_step',
        'new_information',
        'social_shift',
    ]);

function appendUnknownKeyErrors(
    value,
    allowedKeys,
    label,
    errors,
) {
    if (
        !value ||
        typeof value !==
            'object' ||
        Array.isArray(value)
    ) {
        errors.push(
            `${label} 必须是对象。`,
        );
        return;
    }
    const unknown =
        Object.keys(value)
            .filter(key =>
                !allowedKeys.has(key));
    if (unknown.length) {
        errors.push(
            `${label} 不得写入字段：${unknown.join(', ')}。`,
        );
    }
}

export function validateLowScenePerformanceOutputContract(
    payload,
    {
        requireSceneProgression =
        false,
        requirePacingBeatRealized =
        false,
    } = {},
) {
    const errors = [];
    appendUnknownKeyErrors(
        payload,
        LOW_OUTPUT_KEYS,
        '低档输出',
        errors,
    );
    if (!Array.isArray(
        payload?.segments,
    )) {
        errors.push(
            '低档输出 segments 必须是数组。',
        );
    } else {
        payload.segments
            .forEach((
                segment,
                index,
            ) => {
                const allowed =
                    LOW_SEGMENT_KEYS[
                        segment?.type
                    ];
                if (!allowed) {
                    errors.push(
                        `segments[${index}].type 无效。`,
                    );
                    return;
                }
                appendUnknownKeyErrors(
                    segment,
                    allowed,
                    `segments[${index}]`,
                    errors,
                );
                const hasTextEn =
                    Boolean(
                        String(
                            segment
                                ?.textEn ||
                            '',
                        ).trim(),
                    );
                const hasRawText =
                    Boolean(
                        String(
                            segment
                                ?.rawText ||
                            '',
                        ).trim(),
                    );
                if (
                    hasTextEn ===
                    hasRawText
                ) {
                    errors.push(
                        `segments[${index}] 必须且只能包含 textEn 或 rawText。`,
                    );
                }
                if (
                    hasRawText &&
                    (
                        segment
                            ?.authority !==
                            MODEL_OUTPUT_EVIDENCE_AUTHORITY ||
                        !segment
                            ?.language
                    )
                ) {
                    errors.push(
                        `segments[${index}] rawText 缺少语言证据标记。`,
                    );
                }
                (
                    segment
                        .historicalClaims ||
                    []
                ).forEach((
                    claim,
                    claimIndex,
                ) =>
                    appendUnknownKeyErrors(
                        claim,
                        new Set([
                            'claimTextEn',
                            'sourceEventIds',
                        ]),
                        `segments[${index}].historicalClaims[${claimIndex}]`,
                        errors,
                    ));
            });
    }
    if (
        payload?.stateProposals !==
            undefined &&
        !Array.isArray(
            payload.stateProposals,
        )
    ) {
        errors.push(
            '低档输出 stateProposals 必须是数组。',
        );
    } else {
        (
            payload
                ?.stateProposals ||
            []
        ).forEach((
            proposal,
            index,
        ) => {
            const allowed =
                LOW_PROPOSAL_KEYS[
                    proposal?.type
                ];
            if (!allowed) {
                errors.push(
                    `stateProposals[${index}].type 无效。`,
                );
                return;
            }
            appendUnknownKeyErrors(
                proposal,
                allowed,
                `stateProposals[${index}]`,
                errors,
            );
            if (
                [
                    'actor_activity',
                    'actor_move',
                    'actor_enter',
                    'actor_exit',
                    'social_hint',
                ].includes(
                    proposal.type,
                ) &&
                (
                    !String(
                        proposal.actorId ||
                        '',
                    ).trim() ||
                    !String(
                        proposal
                            .currentActivityEn ||
                        '',
                    ).trim()
                )
            ) {
                errors.push(
                    `stateProposals[${index}] 缺少 actorId 或 currentActivityEn。`,
                );
            }
            if (
                proposal.type ===
                    'social_hint' &&
                !String(
                    proposal
                        .firstImpressionOfPlayerEn ||
                    '',
                ).trim()
            ) {
                errors.push(
                    `stateProposals[${index}] 缺少 firstImpressionOfPlayerEn。`,
                );
            }
            if (
                proposal.type ===
                    'item_update'
            ) {
                appendUnknownKeyErrors(
                    proposal.item,
                    LOW_ITEM_PROPOSAL_KEYS,
                    `stateProposals[${index}].item`,
                    errors,
                );
            }
        });
    }
    const signals =
        payload?.signals &&
        typeof payload.signals ===
            'object' &&
        !Array.isArray(
            payload.signals,
        )
            ? payload.signals
            : null;
    if (payload?.signals !== undefined) {
        appendUnknownKeyErrors(
            payload.signals,
            new Set([
                'pacingBeatRealized',
                'sceneProgression',
            ]),
            'signals',
            errors,
        );
        for (const key of [
            'pacingBeatRealized',
        ]) {
            if (
                signals?.[key] !==
                    undefined &&
                typeof signals[key] !==
                    'boolean'
            ) {
                errors.push(
                    `signals.${key} 必须是布尔值。`,
                );
            }
        }
        if (
            signals
                ?.sceneProgression !==
                undefined
        ) {
            appendUnknownKeyErrors(
                signals
                    .sceneProgression,
                new Set([
                    'type',
                    'summaryEn',
                ]),
                'signals.sceneProgression',
                errors,
            );
            const progression =
                signals
                    .sceneProgression;
            if (
                !LOW_PROGRESSION_TYPES
                    .has(
                        progression
                            ?.type,
                    )
            ) {
                errors.push(
                    'signals.sceneProgression.type 无效。',
                );
            }
            if (
                !String(
                    progression
                        ?.summaryEn ||
                    '',
                ).trim()
            ) {
                errors.push(
                    'signals.sceneProgression.summaryEn 不能为空。',
                );
            }
        }
    }
    if (
        requireSceneProgression &&
        !signals?.sceneProgression
    ) {
        errors.push(
            '本回合必须提交 signals.sceneProgression。',
        );
    }
    if (
        requirePacingBeatRealized &&
        signals
            ?.pacingBeatRealized !==
            true
    ) {
        errors.push(
            '本回合必须将 signals.pacingBeatRealized 设为 true。',
        );
    }
    return {
        valid:
            errors.length === 0,
        errors,
    };
}

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
        buildSpatialContext,
        buildStructuredPlayerTurnSequence,
        buildTemporaryActorPromotionPolicy,
        createContextBudgetPlan,
        extractRoleResponseText,
        getActiveAddressingState,
        getAuthoritativeSceneSpells =
        () => [],
        getRequestHeaders,
        parseItemOperationDirectives,
        parseJsonObject,
        recoverScenePerformancePayload,
        recordTurnDiagnostic =
        () => {},
        removeExplicitAddressDirective,
        resolvePlayerAddressing,
        sendModelTaskRequest,
        setLiveSceneStreamPhase,
        settleNarrativeTurnPerformance,
        updateLiveSceneStream,
        validateScenePerformance,
    } = ports;

    function createSceneMomentumDirective(
        state,
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
        movementPreflight = null,
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
                    queryAnchors: [
                        narrativePlayerAction,
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
                        movementPreflight,
                        checkResolution,
                    },
                    sceneFacts: {
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
                        clockBeforeTurn:
                            state.clock,
                        currentScene:
                            projectCurrentSceneForPerformance(
                                state.scene,
                            ),
                        currentRoomId:
                            state.map
                                ?.currentLocalNodeId,
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
- Reported Events and relationship receipts are known only to matching capsule's actor because they spoke, directly participated, received the report, or were recorded as a witness. Another capsule's knowledge never becomes common knowledge.
- stateProposals are sparse, optional hints. Emit one only when the prose actually changes an NPC's activity/presence/room, creates a temporary actor, changes an item, or records a pending first impression. Never repeat unchanged state.
- Every Actor state proposal requires currentActivityEn. social_hint is allowed only when that actor is meeting and seeing the player for the first time; it contains only actorId, currentActivityEn and firstImpressionOfPlayerEn. Never output impressionOfPlayerEn, memoryUpdate, Appraisal, relationship, clue, private fact, deduction or any other social field. Post-turn Appraisal/Social workflows own those facts.
- Follow the committed scene, actorCards, local records, and today's medium-tier directives exactly.
- sceneFacts contains only schedules explicitly claimed by the current scene. It contains their public beat/storyline sources. Never infer another schedule from the clock, participant, location, tag, or planningTier, and never write, cancel, reschedule or settle Calendar state.
- currentScene.summary/summaryEn is supplied only while it still describes the scene opening. After the scene timeline advances, current actors, currentActivityEn, authoritySnapshot.currentMaterialState, authoritySnapshot.currentRoomState, and timelineEntries are the binding present-tense authority.
- currentScene.timelineEntries is chronological history, not a set of simultaneous facts. Later form, position, presence, and material entries supersede earlier ones.
- Player or NPC dialogue may recall an earlier form, use a nickname, joke, speculate, or simply be mistaken. Such speech does not create another entity or override actorCards. A past transformation of one actor is not a second simultaneous creature unless a separate current actor or material entity explicitly exists.
- behavioralEnvironment is binding current context. Materially embody time period, daylight, sleep pressure, curfew, weather, exposure, clothing, shelter, noise, and activity effects when relevant. It overrides stale daily timing or location guidance. Do not recite it as a checklist.
- If pacingDirective is supplied, it is already committed mid-tier authority. Realize its beat and pressure during this turn using only the actors already present in this input, plus any player-selected unnamed person who must be promoted under temporaryActorPromotionPolicy. Do not add anything else beyond that directive.
- If pacingDirective contains causalCollapse, show its visibleResiduesEn and aftermathEn before explaining anything. The narrator must not state or infer the hidden cause. Only an actor-specific witnessAccounts entry or that actor's sealed causalFacts may be spoken, and only by the matching directly addressed actor.
- authoritySnapshot.currentRoomState.visibleResiduesEn contains previously committed aftermath that remains physically or institutionally observable. Preserve it until a later authoritative state change removes it; visibility does not grant knowledge of its hidden cause.
- A named residue or belonging never makes its owner present. Only actorCards entries may speak, act, move, or receive state proposals; do not admit an absent owner because their blanket, trunk, note, damage, or other aftermath remains in the room.
- authoritySnapshot.currentMaterialState is binding visual state for the player, present actors, and this room only. Preserve active outfits, accessories, hairstyles, visible conditions, held objects and hands, placements, moves, removals, furnishing adjustments, damage, repairs, dirt, and cleaning silently unless relevant; do not reset anything merely because this turn does not mention it.
- implicitItemPolicy grants ordinary identity-appropriate objects without creating Items: students have normal uniform, quills, textbooks and school supplies; professors have ordinary robes and teaching/office supplies; shopkeepers have routine stock and tools; everyone has normal clothing, food, household and hygiene objects. Use these naturally without IDs, quantities, history or item_update proposals until a completed gift, loan, return, theft, or deliberate retention makes the specific object socially persistent.
- authoritySnapshot.currentItems is the complete player-visible tracked Item list. Use its stable ID for carry/place/equip/unequip/give/lend/consume/damage/clean/lose/destroy proposals. Never rename an existing Item.
- itemDirectives pairs a structured player-intent operation with one stable formal Item ID. Treat it as authoritative object selection and intended operation, but not as proof of success. Narrate the attempt, then emit an item_update only when this turn's observable result actually completes or changes that operation. Recipient identity for give/lend still comes from the natural player action.
- itemDirectiveErrors are diagnostics for malformed or unknown references. Never guess a replacement Item or mutate state from an invalid directive.
- Propose acquire for a new candidate only when ownership, a completed gift/loan/return/theft, social meaning, clue/promise value, signature identity, or future plot consequences make durable tracking useful. Include objective appearance and exact evidence from this turn. A transferred ordinary quill, book, classroom supply, or everyday object crosses the implicit boundary; preserve lender ownerId and borrower holderId with transferMode loan. Untransferred ordinary clothing and transient props stay implicit.
- Use only facts already observable in the scene or explicitly supplied in the scene-safe local records. Never disclose a locked clue or infer a private fact.
- Never add speech, thoughts, intentions, or choices for the player beyond the supplied action.
- NPCs have agency. They must pursue their committed goals, initiate practical steps, and act without waiting for the player to prompt every motion.
- When the player explicitly requests an immediate concrete step, complete it in this response when legal; do not stop at preparation.
- movementPreflight is a deterministic route/access boundary, never an already-committed arrival. Begin at the current spatialContext room.
- If movementPreflight.eligibility is eligible, you may depict completion only to its exact candidate destination. Whether the player actually arrives, and whether an NPC agrees to accompany them, must follow this Scene's visible events.
- If movementPreflight is ineligible, depict any block, refusal, uncertainty, or failed attempt honestly; never depict an authoritative arrival at its candidate destination.
- If movementPreflight.eligibility is already_there, depict that no travel occurred. Do not add a different player movement.
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
- A promoted actor's publicProfile.descriptionEn contains stable physical traits only. Exclude clothing, accessories, held items, nearby belongings, pose, activity, and location; runtime.currentActivityEn and the material observer own those dynamic details.
- A 15-minute turn must materially advance at least one concrete axis: NPC initiative, access change, practical procedure, new bounded information, or social position. Furnishings, bystander reactions, and repeated explanations do not count by themselves.
- When momentumDirective.required is true, signals.sceneProgression is required and must report the completed concrete change.
- If momentumDirective.intentLocationReached is true, entry, lining up, opening doors, introductions, songs, announcements, and "about to begin" beats are setup rather than completed procedure units. Render at least momentumDirective.minimumCompletedProcedureUnits finished unit beyond setup before stopping.
- When signals.sceneProgression is supplied, summaryEn must include every consequential public result from this response: tracked Item damage/destruction, teacher praise or House-point awards, public reprimands, and other room-visible outcomes. Do not reduce a multi-result public event to only its first action.
- When pacingDirective is supplied, visibly realize it and set signals.pacingBeatRealized to true.

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
      "type":"actor_activity",
      "actorId":"actor_id",
      "currentActivityEn":"required resulting activity"
    },
    {
      "type":"actor_move|actor_enter|actor_exit",
      "actorId":"actor_id",
      "currentActivityEn":"required resulting activity",
      "mapId":"existing_map_id when moving",
      "roomId":"reachable_room_id when moving"
    },
    {
      "type":"social_hint",
      "actorId":"actor_id",
      "currentActivityEn":"required resulting activity",
      "firstImpressionOfPlayerEn":"required first impression for a first meeting"
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
	      "actor":{"id":"new_snake_case","nameEn":"public name","aliases":[],"roleEn":"scene role","publicProfile":{"descriptionEn":"stable traits","backgroundEn":""},"performanceCore":{"temperamentEn":"temperament","speechStyleEn":"speech","motivesEn":[],"socialStrategiesEn":[],"boundariesEn":[],"vulnerabilitiesEn":[]},"privateFacts":{"secretEn":"","knowledgeEn":[]},"runtime":{"present":true,"roomId":"","currentActivityEn":"entry activity","currentIntentEn":"","currentGoalEn":""},"initialRelationshipToPlayerEn":"","firstImpressionOfPlayerEn":""}
    }
  ],
  "signals":{
    "pacingBeatRealized":false,
    "sceneProgression":{
      "type":"npc_initiative|access_change|practical_step|new_information|social_shift",
      "summaryEn":"completed change"
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
            movementPreflight,
            momentumDirective,
            checkResolution,
        },
    ) {
        const input = {
            payload,
            worldState: state,
            playerAction,
            movementPreflight,
            momentumDirective,
            checkResolution,
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
                        movementPreflight,
                        momentumDirective,
                        checkResolution,
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
        movementPreflight,
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
            movementPreflight,
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
                expectationReasonsByActorId:
                    Object.fromEntries(
                        Object.entries(
                            originalSceneInput
                                .memoryActivations
                                ?.byActorId ||
                            {},
                        ).map(([
                            actorId,
                            capsule,
                        ]) => [
                            actorId,
                            (
                                capsule
                                    ?.expectations ||
                                []
                            ).length
                                ? 'available'
                                : 'no_legal_schema',
                        ]),
                    ),
            },
        );
        beginLiveSceneStream(checkResolution);
        const response = await sendModelTaskRequest(
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
        const raw =
            extractRoleResponseText(
                response,
            );
        const attempt = 0;
        {
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
                parsedPayload =
                    adoptLowPerformanceLanguage(
                        parsedPayload,
                    );
                parsedPayload =
                    sanitizeLowScenePerformancePayload(
                        parsedPayload,
                    );
                const outputContract =
                    validateLowScenePerformanceOutputContract(
                        parsedPayload,
                        {
                            requireSceneProgression:
                                momentumDirective
                                    ?.required ===
                                true,
                            requirePacingBeatRealized:
                                state
                                    .pacingDirector
                                    ?.pendingBeat
                                    ?.status ===
                                'pending',
                        },
                    );
                if (!outputContract.valid) {
                    throw new Error(
                        outputContract
                            .errors
                            .join('；'),
                    );
                }
                const payload =
                await settleScenePerformance(
                    parsedPayload,
                    state,
                    {
                        playerAction,
                        movementPreflight,
                        momentumDirective,
                        checkResolution,
                    },
                );
                const validation = validateScenePerformance(
                    payload,
                    state,
                    budget,
                    momentumDirective,
                    checkResolution,
                    movementPreflight,
                    playerAction,
                );
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
                        languageMismatchCount:
                            parsedPayload
                                .modelLanguageDiagnostics
                                .length,
                        droppedStateProposalFields:
                            parsedPayload
                                .modelShapeDiagnostics,
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
                recordTurnDiagnostic(
                    'performance_failure',
                    {
                        attempt,
                        error:
                            String(
                                error
                                    ?.message ||
                                error,
                            ),
                        willRetry:
                            false,
                    },
                );
                throw new Error(
                    `低档现场表演无效：${String(error?.message || error)}`,
                );
            }
        }
    }

    function buildSceneTransaction(
        performance,
        budget,
        pacingBeat = null,
        checkResolution = null,
        movementPreflight = null,
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
            ...(movementPreflight ? {
                movementPreflight:
                    structuredClone(
                        movementPreflight,
                    ),
            } : {}),
            ...(pacingBeat ? {
                pacingBeat: structuredClone(pacingBeat),
            } : {}),
        };
    }

    return {
        createSceneMomentumDirective,
        projectPacingDirectiveForPerformance,
        createScenePerformancePrompt,
        settleScenePerformance,
        generateScenePerformance,
        buildSceneTransaction,
    };
}
