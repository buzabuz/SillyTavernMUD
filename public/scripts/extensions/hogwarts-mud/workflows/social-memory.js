export function createSocialMemoryWorkflow(ports) {
    const {
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
        analyzeMemoryConsolidation,
        applySocialDirectorResult,
        applySystemPrompt,
        buildSocialAudienceProjection,
        createContextBudgetPlan,
        extractRoleResponseText,
        getContext,
        getMudState,
        getRequestHeaders,
        getSettings,
        jobRegistry,
        normalizeActorMemoryProfile,
        normalizeMemoryConsolidationPayload,
        normalizeSocialGraph,
        renderAll,
        resolveRoleSlots,
        selectSharedMemoriesForContext,
        sendRoleRequest,
        syncLocalKnowledge,
        translateOpeningValues,
        validateMemoryConsolidation,
        validateSocialDirectorResult,
    } = ports;

    function collectSocialDirectorEvidence(
        state,
        {
            backfill = false,
        } = {},
    ) {
        const chat =
        getContext().chat ||
        [];
        const sceneStart =
        Math.max(
            0,
            Number(
                state.scene
                    ?.startedMessageId ||
                0,
            ),
        );
        const lastProcessed =
        Number(
            state.socialGraph
                ?.lastProcessedMessageId ??
            -1,
        );
        const start =
        backfill
            ? Math.max(
                0,
                lastProcessed +
                    1,
            )
            : Math.max(
                sceneStart,
                lastProcessed +
                    1,
            );
        const eventKnowledgeById =
        new Map(
            (state.eventKnowledge || [])
                .filter(event =>
                    event?.eventId)
                .map(event => [
                    event.eventId,
                    event,
                ]),
        );
        chat.forEach(message => {
            const event =
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
                ?.eventKnowledge;
            if (
                event?.eventId &&
            !eventKnowledgeById.has(
                event.eventId,
            )
            ) {
                eventKnowledgeById.set(
                    event.eventId,
                    event,
                );
            }
        });
        const eventsByMessageId =
        new Map();
        for (
            const event
            of eventKnowledgeById.values()
        ) {
            for (
                const rawMessageId
                of event.sourceMessageIds ||
            []
            ) {
                const messageId =
                Number(rawMessageId);
                if (
                    !Number.isInteger(
                        messageId,
                    )
                ) {
                    continue;
                }
                const events =
                eventsByMessageId
                    .get(messageId) ||
                [];
                events.push(event);
                eventsByMessageId.set(
                    messageId,
                    events,
                );
            }
        }
        const knownActorIds =
        new Set(
            (state.actorLibrary || [])
                .map(actor => actor.id),
        );
        const candidates =
        chat
            .map((message, index) => ({
                message,
                index,
            }))
            .filter(({ message, index }) =>
                index >= start &&
                eventsByMessageId
                    .has(index) &&
                (
                    message.is_user ||
                    Array.isArray(
                        message.extra
                            ?.hogwartsMud
                            ?.segments,
                    )
                ))
            .map(({ message, index }) => {
                const mud =
                    message.extra
                        ?.hogwartsMud ||
                    {};
                const committedEvents =
                    eventsByMessageId
                        .get(index) ||
                    [];
                const sceneIds = [
                    ...new Set(
                        committedEvents
                            .map(event =>
                                String(
                                    event
                                        .sceneId ||
                                    '',
                                ))
                            .filter(Boolean),
                    ),
                ];
                const sceneId =
                    sceneIds.length === 1
                        ? sceneIds[0]
                        : '';
                const segments =
                    message.is_user
                        ? []
                        : (
                            mud.segments ||
                            []
                        ).map(segment => ({
                            type:
                                segment.type,
                            actorId:
                                segment.actorId ||
                                '',
                            textEn:
                                segment.textEn ||
                                '',
                        }));
                const witnessActorIds = [
                    ...new Set(
                        committedEvents
                            .flatMap(event =>
                                event
                                    .witnessActorIds ||
                                [])
                            .filter(actorId =>
                                knownActorIds
                                    .has(
                                        actorId,
                                    )),
                    ),
                ].sort();
                return {
                    id: index,
                    sceneId,
                    isUser:
                        Boolean(
                            message.is_user,
                        ),
                    text:
                        message.is_user
                            ? String(
                                message.mes ||
                                '',
                            )
                            : '',
                    segments,
                    witnessActorIds,
                    eventIds:
                        committedEvents
                            .map(event =>
                                event.eventId),
                };
            });
        let batchEnd =
        Math.min(
            candidates.length,
            24,
        );
        if (
            candidates[
                batchEnd - 1
            ]?.isUser &&
        candidates[batchEnd] &&
        !candidates[batchEnd]
            .isUser
        ) {
            batchEnd++;
        }
        const records =
        candidates.slice(
            0,
            batchEnd,
        );
        const selectedEventIds =
        new Set(
            records.flatMap(record =>
                record.eventIds),
        );
        records.forEach(record => {
            delete record.eventIds;
        });
        const eventKnowledge = [
            ...eventKnowledgeById
                .values(),
        ]
            .filter(event =>
                selectedEventIds.has(
                    event.eventId,
                ))
            .map(event =>
                structuredClone(event));
        return {
            backfill,
            hasMore:
            candidates.length >
            records.length,
            messages: records,
            allowedMessageIds:
            records.map(record =>
                record.id),
            messageSceneIds:
            Object.fromEntries(
                records.map(record => [
                    record.id,
                    record.sceneId,
                ]),
            ),
            witnessActorIdsByMessageId:
            Object.fromEntries(
                records.map(record => [
                    record.id,
                    record
                        .witnessActorIds,
                ]),
            ),
            eventKnowledge,
            presentActorIds: [
                ...new Set(
                    records.flatMap(record =>
                        record
                            .witnessActorIds
                            .filter(actorId =>
                                actorId !==
                                'player')),
                ),
            ],
            sceneIds: [
                ...new Set(
                    records
                        .map(record =>
                            record.sceneId)
                        .filter(Boolean),
                ),
            ],
        };
    }

    function createMemoryConsolidationPrompt(
        state,
        signals,
        evidence,
        contextPlan = createContextBudgetPlan(
            CONTEXT_SIZE_PRESETS.rich,
            DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
        ),
    ) {
        const reviewableIds = new Set(
            signals.actors.map(actor => actor.id),
        );
        const reviewableActors =
        evidence.backfill
            ? []
            : state.actorLibrary
                .filter(actor =>
                    reviewableIds.has(
                        actor.id,
                    ))
                .map(actor => {
                    const dynamic =
                        normalizeActorMemoryProfile(
                            actor,
                        );
                    return {
                        id: actor.id,
                        nameEn:
                            actor.nameEn,
                        relationshipToPlayerEn:
                            actor
                                .relationshipToPlayerEn,
                        impressionOfPlayerEn:
                            dynamic
                                .impressionOfPlayerEn,
                        sharedMemories:
                            selectSharedMemoriesForContext(
                                dynamic
                                    .sharedMemories,
                                contextPlan,
                            ),
                        socialStatements:
                            actor
                                .socialStatements ||
                            [],
                        socialRelationships:
                            buildSocialAudienceProjection(
                                state,
                                actor.id,
                            ).relationships,
                    };
                });
        const backfillRules =
        evidence.backfill
            ? `
- This is a versioned catch-up scan. reviews must be exactly [] and scanComplete must be true only after every supplied sceneEvidence message has been scanned.
- sceneEvidence may span multiple archived scenes. Every statement and relationship item must copy the exact sceneId supplied on its source message.
- Output at most 12 statements and 24 relationshipEvidence items. Prioritize meaningful player-facing changes, then durable inter-NPC changes.
- Include introductions, refusals, coercion, injury, help, promises, betrayal, repair, and structural relationships. Omit routine classroom facts, transient preferences, and evidence already represented by existingSocialGraph.`
            : `
- This is an event-boundary update. reviews may consolidate supplied memories. scanComplete must be true after all supplied sceneEvidence messages have been scanned.`;
        const existingGraph =
        normalizeSocialGraph(
            state.socialGraph,
        );
        const existingSocialGraph = {
            statements:
            existingGraph.statements
                .map(statement => ({
                    id: statement.id,
                    subjectId:
                        statement.subjectId,
                    speakerId:
                        statement.speakerId,
                    category:
                        statement.category,
                    textEn:
                        statement.textEn,
                    sourceMessageIds:
                        statement
                            .sourceMessageIds ||
                        [],
                })),
            relationshipEvidence:
            existingGraph
                .relationshipEvidence
                .map(item => ({
                    id: item.id,
                    sourceActorId:
                        item.sourceActorId,
                    targetActorId:
                        item.targetActorId,
                    eventKind:
                        item.eventKind,
                    dimensionDeltas:
                        item.dimensionDeltas ||
                        [],
                    structuralTags:
                        item.structuralTags ||
                        [],
                    summaryEn:
                        item.summaryEn,
                    sceneId:
                        item.sceneId,
                    sourceMessageIds:
                        item
                            .sourceMessageIds ||
                        [],
                })),
            relationships:
            existingGraph
                .relationships
                .map(edge => ({
                    sourceActorId:
                        edge.sourceActorId,
                    targetActorId:
                        edge.targetActorId,
                    familiarity:
                        edge.familiarity,
                    closeness:
                        edge.closeness,
                    warmth:
                        edge.warmth,
                    trust: edge.trust,
                    respect:
                        edge.respect,
                    influence:
                        edge.influence,
                    tension:
                        edge.tension,
                    resentment:
                        edge.resentment,
                    fear: edge.fear,
                    protectiveness:
                        edge
                            .protectiveness,
                    structuralTags:
                        edge.structuralTags ||
                        [],
                })),
            lastProcessedMessageId:
            existingGraph
                .lastProcessedMessageId,
        };
        return [
            {
                role: 'system',
                content: `You are the single mid-tier Social Director for a persistent Harry Potter RPG. Perform one source-grounded extraction for a deterministic LangGraph reducer. Consolidate player-visible relationship memory, attributed NPC statements, and directed social evidence. Do not write scene prose or invent events. Return one compact JSON object. Internal reasoning is permitted, but the final answer must contain one complete JSON object matching the schema.

Rules:
- Use only supplied memory IDs and their observable summaries. Never use actor secrets, hidden clues, private goals, or facts the actor did not witness.
- statements records what a supplied actor publicly claimed, not omniscient truth. Every statement needs subjectId, speakerId, sceneId, witnessedBy, and exact sourceMessageIds.
- relationshipEvidence is directed and may connect a supplied actor to another supplied actor or to player. Every item needs sceneId, witnessedBy, and exact sourceMessageIds.
- witnessedBy must be a subset of every cited message's witnessActorIds. Never grant knowledge to an absent actor.
- Use only actorDirectory IDs and allowedMessageIds. Never assume player witnessed a message unless that message's witnessActorIds includes player.
- existingSocialGraph is read-only calibration and duplicate context. Never emit migration, summaries, or score corrections for stored relationships; extract only new supplied sceneEvidence.
- Emit one consolidated relationshipEvidence item per directed actor pair, eventKind, scene, and sourceMessageIds set. The reducer, not you, owns final scores.
- dimensionDeltas are proposals. Allowed dimensions are familiarity, closeness, warmth, trust, respect, influence, tension, resentment, fear, and protectiveness.
- eventKind must be one of introduction, routine_interaction, shared_time, serious_conversation, vulnerability, support, help, gift, promise, praise, rescue, sacrifice, insult, humiliation, threat, harm, betrayal, unresolved_conflict, accepted_apology, accepted_compensation, forgiveness, reappraisal, or other.
- structuralTags may contain only family, authority, classmate, rivalry, or mentor. Tags describe structure, never sentiment.
- Include at most four emotionAppraisals from anger, fear, contempt, disgust, envy, shame, guilt, gratitude, admiration, hope, disappointment, relief, pity, joy, or distress. Intensity is 1-5 and every appraisal cites sourceMessageIds from its parent evidence.
- Do not repeat evidence already represented by existingSocialGraph. Repeated similar new events still need their own exact new message provenance.
- familiarity is knowledge, not liking. Same class or forced co-presence primarily changes familiarity. Raise closeness only for voluntary shared time, serious conversation, vulnerability, support, mutual risk, or sustained shared experience.
- resentment may rise only for a clear insult, humiliation, threat, harm, betrayal, or unresolved conflict. It may fall only for an explicitly accepted apology/compensation, forgiveness, or reappraisal. A gift, greeting, or unaccepted apology must not lower resentment.
- Closeness anchors: 0 none, 10 first met, 20 acquaintance, 35 friend, 50 close friend, 70 confidant/high intimacy, 90 lifelong/family-grade bond.
- Signed anchors for warmth/trust/respect: -75 hatred/expected betrayal/strong contempt; -50 dislike/distrust/contempt; -20 coolness/guarded/disapproval; 0 neutral/unverified; 20 liking/limited trust/recognition; 50 deep affection/high trust/admiration; 75 devoted care/life-or-death trust/reverence.
- Negative anchors for tension/resentment/fear: 10 slight, 20 remembered/guarded, 35 strained, 50 overt conflict/serious grievance/fear, 70 explosive/vengeful/terrified, 90 actively hostile/irreconcilable/traumatic.
- Impact bands: trace=1; minor=2-3; meaningful=4-6; major=7-12; defining=13-18. defining is only for a source-grounded irreversible betrayal or sacrifice. Ordinary closeness change is at most 10; defining closeness is at most 15.
- Calibration examples: routine class chat => routine_interaction with familiarity +1 trace and usually no closeness; concrete support => support with warmth/trust +4 to +6 meaningful; major betrayal => betrayal with trust -7 to -12, warmth loss, and supported resentment/tension; an apology lowers resentment only as accepted_apology when the source shows acceptance.
- Keep small texture in everyday memories unless it is redundant or stale.
- Merge related everyday memories into a recent memory only when together they describe a meaningful pattern or event.
- Promote to core only when at least one source is already recent/core and the experience is a lasting turning point or repeated defining pattern.
- Core memories cannot be forgotten or downgraded. They may only be merged into another core memory.
- A source memory ID may appear in only one operation.
- Use targetTier "forget" for redundant everyday/recent memories; omit summaryEn for forget.
- Update impressionOfPlayerEn only when the supplied memories support a sharper current opinion. It must be a concrete judgment, never "stranger" or a relationship label.
- Keep each impression and summary under 40 English words.
- Set reviewAfterTurns to 10-20. Never schedule another review sooner than 10 committed turns.
- Review only actors who need an operation or an impression refinement. Include 0-8 actor reviews.
${backfillRules}

Schema:
{
  "scanComplete": true,
  "reviewAfterTurns": 10,
  "reviews": [
    {
      "id": "existing_actor_id",
      "impressionOfPlayerEn": "optional refined current opinion",
      "operations": [
        {
          "sourceIds": ["existing_memory_id"],
          "targetTier": "core|recent|forget",
          "summaryEn": "required merged memory unless targetTier is forget"
        }
      ]
    }
  ],
  "statements": [
    {
      "subjectId": "existing_actor_id",
      "speakerId": "existing_actor_id",
      "sceneId": "exact_source_scene_id",
      "category": "family|origin|education|wealth|occupation|identity|history|preference|other",
      "textEn": "one source-grounded public claim",
      "witnessedBy": ["player", "existing_actor_id"],
      "sourceMessageIds": [123]
    }
  ],
  "relationshipEvidence": [
    {
      "sourceActorId": "existing_actor_id",
      "targetActorId": "player|different_existing_actor_id",
      "sceneId": "exact_source_scene_id",
      "eventKind": "support",
      "dimensionDeltas": [
        {"dimension": "trust", "delta": 4, "impact": "meaningful"}
      ],
      "structuralTags": ["classmate"],
      "emotionAppraisals": [
        {"emotion": "gratitude", "intensity": 3, "sourceMessageIds": [123]}
      ],
      "summaryEn": "one observable directed relationship event",
      "witnessedBy": ["existing_actor_id"],
      "sourceMessageIds": [123]
    }
  ]
}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    clock: state.clock,
                    currentTurn:
                    Number(state.turn?.count || 0),
                    consolidationSignals: signals,
                    reviewableActors,
                    actorDirectory:
                    (state.actorLibrary ||
                    []).map(actor => ({
                        id: actor.id,
                        nameEn:
                            actor.nameEn,
                    })),
                    existingSocialGraph:
                    existingSocialGraph,
                    sceneEvidence:
                    evidence.messages,
                    allowedMessageIds:
                    evidence
                        .allowedMessageIds,
                }),
            },
        ];
    }

    const SOCIAL_DIRECTOR_EVENT_KINDS =
    Object.freeze([
        'introduction',
        'routine_interaction',
        'shared_time',
        'serious_conversation',
        'vulnerability',
        'support',
        'help',
        'gift',
        'promise',
        'praise',
        'rescue',
        'sacrifice',
        'insult',
        'humiliation',
        'threat',
        'harm',
        'betrayal',
        'unresolved_conflict',
        'accepted_apology',
        'accepted_compensation',
        'forgiveness',
        'reappraisal',
        'other',
    ]);

    const SOCIAL_DIRECTOR_IMPACTS =
    Object.freeze([
        'trace',
        'minor',
        'meaningful',
        'major',
        'defining',
    ]);

    const SOCIAL_DIRECTOR_DIMENSIONS =
    Object.freeze([
        'familiarity',
        'closeness',
        'warmth',
        'trust',
        'respect',
        'influence',
        'tension',
        'resentment',
        'fear',
        'protectiveness',
    ]);

    const SOCIAL_DIRECTOR_STRUCTURAL_TAGS =
    Object.freeze([
        'family',
        'authority',
        'classmate',
        'rivalry',
        'mentor',
    ]);

    const SOCIAL_DIRECTOR_EMOTIONS =
    Object.freeze([
        'anger',
        'fear',
        'contempt',
        'disgust',
        'envy',
        'shame',
        'guilt',
        'gratitude',
        'admiration',
        'hope',
        'disappointment',
        'relief',
        'pity',
        'joy',
        'distress',
    ]);

    const SOCIAL_DIRECTOR_RESPONSE_SCHEMA = {
        name:
        'hogwarts_mud_social_director',
        description:
        'Source-grounded social extraction for the deterministic relationship reducer.',
        strict: true,
        value: {
            type: 'object',
            additionalProperties: false,
            properties: {
                scanComplete: {
                    type: 'boolean',
                },
                reviewAfterTurns: {
                    type: 'integer',
                    minimum: 10,
                    maximum: 20,
                },
                reviews: {
                    type: 'array',
                    maxItems: 8,
                    items: {
                        type: 'object',
                        additionalProperties:
                        false,
                        properties: {
                            id: {
                                type: 'string',
                            },
                            impressionOfPlayerEn: {
                                type: 'string',
                            },
                            operations: {
                                type: 'array',
                                items: {
                                    type:
                                    'object',
                                    additionalProperties:
                                    false,
                                    properties: {
                                        sourceIds: {
                                            type:
                                            'array',
                                            items: {
                                                type:
                                                'string',
                                            },
                                        },
                                        targetTier: {
                                            type:
                                            'string',
                                            enum: [
                                                'core',
                                                'recent',
                                                'forget',
                                            ],
                                        },
                                        summaryEn: {
                                            type: [
                                                'string',
                                                'null',
                                            ],
                                        },
                                    },
                                    required: [
                                        'sourceIds',
                                        'targetTier',
                                        'summaryEn',
                                    ],
                                },
                            },
                        },
                        required: [
                            'id',
                            'impressionOfPlayerEn',
                            'operations',
                        ],
                    },
                },
                statements: {
                    type: 'array',
                    maxItems: 12,
                    items: {
                        type: 'object',
                        additionalProperties:
                        false,
                        properties: {
                            subjectId: {
                                type: 'string',
                            },
                            speakerId: {
                                type: 'string',
                            },
                            sceneId: {
                                type: 'string',
                            },
                            category: {
                                type: 'string',
                                enum: [
                                    'family',
                                    'origin',
                                    'education',
                                    'wealth',
                                    'occupation',
                                    'identity',
                                    'history',
                                    'preference',
                                    'other',
                                ],
                            },
                            textEn: {
                                type: 'string',
                            },
                            witnessedBy: {
                                type: 'array',
                                items: {
                                    type:
                                    'string',
                                },
                            },
                            sourceMessageIds: {
                                type: 'array',
                                items: {
                                    type:
                                    'integer',
                                },
                            },
                        },
                        required: [
                            'subjectId',
                            'speakerId',
                            'sceneId',
                            'category',
                            'textEn',
                            'witnessedBy',
                            'sourceMessageIds',
                        ],
                    },
                },
                relationshipEvidence: {
                    type: 'array',
                    maxItems: 24,
                    items: {
                        type: 'object',
                        additionalProperties:
                        false,
                        properties: {
                            sourceActorId: {
                                type: 'string',
                            },
                            targetActorId: {
                                type: 'string',
                            },
                            sceneId: {
                                type: 'string',
                            },
                            eventKind: {
                                type: 'string',
                                enum:
                                SOCIAL_DIRECTOR_EVENT_KINDS,
                            },
                            dimensionDeltas: {
                                type: 'array',
                                maxItems: 10,
                                items: {
                                    type:
                                    'object',
                                    additionalProperties:
                                    false,
                                    properties: {
                                        dimension: {
                                            type:
                                            'string',
                                            enum:
                                            SOCIAL_DIRECTOR_DIMENSIONS,
                                        },
                                        delta: {
                                            type:
                                            'number',
                                            minimum:
                                            -18,
                                            maximum:
                                            18,
                                        },
                                        impact: {
                                            type:
                                            'string',
                                            enum:
                                            SOCIAL_DIRECTOR_IMPACTS,
                                        },
                                    },
                                    required: [
                                        'dimension',
                                        'delta',
                                        'impact',
                                    ],
                                },
                            },
                            structuralTags: {
                                type: 'array',
                                maxItems: 5,
                                items: {
                                    type:
                                    'string',
                                    enum:
                                    SOCIAL_DIRECTOR_STRUCTURAL_TAGS,
                                },
                            },
                            emotionAppraisals: {
                                type: 'array',
                                maxItems: 4,
                                items: {
                                    type:
                                    'object',
                                    additionalProperties:
                                    false,
                                    properties: {
                                        emotion: {
                                            type:
                                            'string',
                                            enum:
                                            SOCIAL_DIRECTOR_EMOTIONS,
                                        },
                                        intensity: {
                                            type:
                                            'integer',
                                            minimum:
                                            1,
                                            maximum:
                                            5,
                                        },
                                        sourceMessageIds: {
                                            type:
                                            'array',
                                            items: {
                                                type:
                                                'integer',
                                            },
                                        },
                                    },
                                    required: [
                                        'emotion',
                                        'intensity',
                                        'sourceMessageIds',
                                    ],
                                },
                            },
                            summaryEn: {
                                type: 'string',
                            },
                            witnessedBy: {
                                type: 'array',
                                items: {
                                    type:
                                    'string',
                                },
                            },
                            sourceMessageIds: {
                                type: 'array',
                                items: {
                                    type:
                                    'integer',
                                },
                            },
                        },
                        required: [
                            'sourceActorId',
                            'targetActorId',
                            'sceneId',
                            'eventKind',
                            'dimensionDeltas',
                            'structuralTags',
                            'emotionAppraisals',
                            'summaryEn',
                            'witnessedBy',
                            'sourceMessageIds',
                        ],
                    },
                },
            },
            required: [
                'scanComplete',
                'reviewAfterTurns',
                'reviews',
                'statements',
                'relationshipEvidence',
            ],
        },
    };

    async function generateMemoryConsolidation(
        roleSlot,
        state,
        signals,
        evidence,
        contextPlan,
    ) {
        const prompt = createMemoryConsolidationPrompt(
            state,
            signals,
            evidence,
            contextPlan,
        );
        const response = await sendRoleRequest(
            roleSlot,
            prompt,
            {
                json: true,
                jsonSchema:
                SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
            },
        );
        const extracted =
        extractRoleResponseText(
            response,
        );
        const payload =
        normalizeMemoryConsolidationPayload(
            extracted,
            state,
        );
        if (
            payload.scanComplete !==
            true
        ) {
            console.warn(
                '[Hogwarts MUD] Social Director returned no complete JSON object',
                {
                    content:
                    typeof response
                        ?.content ===
                        'string'
                        ? response.content
                            .slice(0, 500)
                        : response?.content,
                    reasoning:
                    typeof response
                        ?.reasoning ===
                        'string'
                        ? response.reasoning
                            .slice(0, 500)
                        : response
                            ?.reasoning,
                },
            );
            throw new Error(
                '社交导演没有返回完整 JSON 扫描结果。',
            );
        }
        if (
            evidence.backfill &&
        payload.reviews.length
        ) {
            throw new Error(
                '补算模式不得修改共同记忆。',
            );
        }
        const validation =
        validateMemoryConsolidation(
            payload,
            state,
        );
        if (!validation.valid) {
            throw new Error(
                validation.errors.join('；'),
            );
        }
        return payload;
    }

    async function localizeMemoryConsolidation(payload) {
        if (!getSettings().translationEnabled) {
            return payload;
        }
        const values = payload.reviews.flatMap(review => [
            review.impressionOfPlayerEn || '',
            ...(review.operations || []).map(
                operation => operation.summaryEn || '',
            ),
        ]).concat(
            (payload.statements || [])
                .map(statement =>
                    statement.textEn ||
                ''),
            (
                payload
                    .relationshipEvidence ||
            []
            ).map(evidence =>
                evidence.summaryEn ||
            ''),
        );
        const translated =
        await translateOpeningValues(values);
        let cursor = 0;
        const localized = {
            ...payload,
            reviews: payload.reviews.map(review => {
                const impressionOfPlayer =
                translated[cursor++];
                return {
                    ...review,
                    ...(review.impressionOfPlayerEn
                        ? { impressionOfPlayer }
                        : {}),
                    operations: (
                        review.operations || []
                    ).map(operation => {
                        const summary = translated[cursor++];
                        return {
                            ...operation,
                            ...(operation.summaryEn
                                ? { summary }
                                : {}),
                        };
                    }),
                };
            }),
        };
        localized.statements =
        (
            payload.statements ||
            []
        ).map(statement => {
            const text =
                translated[cursor++];
            return {
                ...statement,
                text:
                    text ||
                    statement.textEn,
            };
        });
        localized.relationshipEvidence =
        (
            payload
                .relationshipEvidence ||
            []
        ).map(evidence => {
            const summary =
                translated[cursor++];
            return {
                ...evidence,
                summary:
                    summary ||
                    evidence.summaryEn,
                dimensionDeltas:
                    evidence
                        .dimensionDeltas ||
                    [],
                structuralTags:
                    evidence
                        .structuralTags ||
                    [],
                emotionAppraisals:
                    evidence
                        .emotionAppraisals ||
                    [],
            };
        });
        return localized;
    }

    async function resolveSocialDirectorGraph(
        state,
        payload,
        evidence,
    ) {
        const firstMessageId =
        evidence
            .allowedMessageIds[0] ??
        -1;
        const lastMessageId =
        evidence
            .allowedMessageIds
            .at(-1) ??
        -1;
        const response = await fetch(
            '/api/hogwarts-mud/social/resolve',
            {
                method: 'POST',
                headers:
                getRequestHeaders(),
                body: JSON.stringify({
                    sceneId:
                    evidence.backfill
                        ? `social_catchup_${firstMessageId}_${lastMessageId}`
                        : state.scene?.id ||
                            '',
                    clock: state.clock,
                    turn: Number(
                        state.turn?.count ||
                    0,
                    ),
                    actorIds:
                    (
                        state.actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                    presentActorIds:
                    evidence
                        .presentActorIds,
                    allowedMessageIds:
                    evidence
                        .allowedMessageIds,
                    messageSceneIds:
                    evidence
                        .messageSceneIds,
                    witnessActorIdsByMessageId:
                    evidence
                        .witnessActorIdsByMessageId,
                    eventKnowledge:
                    evidence
                        .eventKnowledge,
                    existingGraph:
                    normalizeSocialGraph(
                        state.socialGraph,
                    ),
                    extraction:
                    payload,
                }),
            },
        );
        if (!response.ok) {
            throw new Error(
                `社交导演图请求失败（${response.status}）。`,
            );
        }
        const result =
        await response.json();
        const validation =
        validateSocialDirectorResult(
            result,
            state,
            evidence
                .allowedMessageIds,
        );
        if (!validation.valid) {
            throw new Error(
                validation.errors.join(
                    '；',
                ),
            );
        }
        return result;
    }

    async function ensureMemoryConsolidation(
        {
            backfill = false,
        } = {},
    ) {
        if (jobRegistry.memory) {
            return jobRegistry.memory;
        }
        let state = getMudState();
        const signals =
        analyzeMemoryConsolidation(state);
        if (
            !backfill &&
        !signals.shouldReview
        ) {
            return null;
        }
        const evidence =
        collectSocialDirectorEvidence(
            state,
            {
                backfill,
            },
        );
        if (
            !evidence
                .allowedMessageIds
                .length
        ) {
            if (backfill) {
                const context =
                getContext();
                const next =
                structuredClone(
                    state,
                );
                next.socialGraph =
                normalizeSocialGraph(
                    next.socialGraph,
                );
                next.socialGraph
                    .extractorVersion =
                SOCIAL_GRAPH_EXTRACTOR_VERSION;
                next.socialGraph
                    .backfillPendingSceneId =
                '';
                next.socialGraph.status =
                'ready';
                next.socialGraph.error =
                '';
                context.chatMetadata
                    .hogwartsMud =
                next;
                await context
                    .saveMetadata();
                renderAll();
            }
            return null;
        }
        jobRegistry.memory = (async () => {
            const context = getContext();
            state = getMudState();
            state.socialGraph =
            normalizeSocialGraph(
                state.socialGraph,
            );
            state.socialGraph.status =
            'running';
            state.socialGraph.error =
            '';
            if (!backfill) {
                state.memoryDirector = {
                    ...(state.memoryDirector || {}),
                    status: 'consolidating',
                    error: '',
                };
            }
            await context.saveMetadata();
            renderAll();
            try {
                const slots = resolveRoleSlots(
                    state.modelSlots,
                );
                const contextPlan =
                createContextBudgetPlan(
                    slots.medium.contextSize,
                    slots.medium.maxResponseLength,
                );
                let payload =
                await generateMemoryConsolidation(
                    slots.medium,
                    state,
                    signals,
                    evidence,
                    contextPlan,
                );
                try {
                    payload =
                    await localizeMemoryConsolidation(
                        payload,
                    );
                } catch (translationError) {
                    console.warn(
                        '[Hogwarts MUD] Memory consolidation translation failed; using English',
                        translationError,
                    );
                }
                state = getMudState();
                const graphResult =
                await resolveSocialDirectorGraph(
                    state,
                    payload,
                    evidence,
                );
                const next =
                applySocialDirectorResult(
                    state,
                    graphResult,
                    evidence
                        .allowedMessageIds,
                );
                next.socialGraph
                    .extractorVersion =
                SOCIAL_GRAPH_EXTRACTOR_VERSION;
                next.socialGraph.status =
                'ready';
                next.socialGraph.error =
                '';
                if (backfill) {
                    next.socialGraph
                        .backfilledSceneIds = [
                            ...new Set([
                                ...(
                                    next
                                        .socialGraph
                                        .backfilledSceneIds ||
                                []
                                ),
                                ...evidence
                                    .sceneIds,
                            ]),
                        ].slice(-50);
                    next.socialGraph
                        .backfillPendingSceneId =
                    evidence.hasMore
                        ? state
                            .socialGraph
                            ?.backfillPendingSceneId ||
                            state.scene?.id ||
                            ''
                        : '';
                }
                context.chatMetadata
                    .hogwartsMud =
                next;
                await context.saveMetadata();
                applySystemPrompt();
                renderAll();
                await syncLocalKnowledge();
                return graphResult;
            } catch (error) {
                state = getMudState();
                state.socialGraph =
                normalizeSocialGraph(
                    state.socialGraph,
                );
                state.socialGraph.status =
                'failed';
                state.socialGraph.error =
                String(
                    error?.cause?.message ||
                    error?.message ||
                    error,
                );
                if (backfill) {
                    state.socialGraph
                        .backfillPendingSceneId =
                    state.socialGraph
                        .backfillPendingSceneId ||
                    state.scene?.id ||
                    '';
                } else {
                    state.memoryDirector = {
                        ...(state.memoryDirector || {}),
                        status: 'failed',
                        error:
                        state.socialGraph
                            .error,
                        lastReviewedTurn:
                        Number(
                            state.turn
                                ?.count ||
                            0,
                        ),
                        reviewAfterTurns: 10,
                    };
                }
                await context.saveMetadata();
                renderAll();
                console.warn(
                    '[Hogwarts MUD] Social Director failed; keeping committed narrative and prior social state',
                    error,
                );
                return null;
            }
        })().finally(() => {
            jobRegistry.memory = null;
            renderAll();
        });
        return jobRegistry.memory;
    }

    async function ensureSocialDirectorCatchup(
        {
            force = false,
        } = {},
    ) {
        for (
            let batch = 0;
            batch < 5;
            batch++
        ) {
            const graph =
            normalizeSocialGraph(
                getMudState()
                    ?.socialGraph,
            );
            if (
                !force &&
            graph.extractorVersion >=
                SOCIAL_GRAPH_EXTRACTOR_VERSION &&
            !graph
                .backfillPendingSceneId
            ) {
                return graph;
            }
            const attemptKey = [
                graph.extractorVersion,
                graph
                    .lastProcessedMessageId,
                graph
                    .backfillPendingSceneId,
            ].join(':');
            if (
                jobRegistry.socialCatchupAttempts
                    .has(attemptKey)
            ) {
                return graph;
            }
            jobRegistry.socialCatchupAttempts
                .add(attemptKey);
            await ensureMemoryConsolidation({
                backfill: true,
            });
            const nextGraph =
            normalizeSocialGraph(
                getMudState()
                    ?.socialGraph,
            );
            if (
                nextGraph.status ===
                'failed' ||
            !nextGraph
                .backfillPendingSceneId
            ) {
                return nextGraph;
            }
            force = false;
        }
        return normalizeSocialGraph(
            getMudState()?.socialGraph,
        );
    }

    return {
        collectSocialDirectorEvidence,
        createMemoryConsolidationPrompt,
        SOCIAL_DIRECTOR_EVENT_KINDS,
        SOCIAL_DIRECTOR_IMPACTS,
        SOCIAL_DIRECTOR_DIMENSIONS,
        SOCIAL_DIRECTOR_STRUCTURAL_TAGS,
        SOCIAL_DIRECTOR_EMOTIONS,
        SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
        generateMemoryConsolidation,
        localizeMemoryConsolidation,
        resolveSocialDirectorGraph,
        ensureMemoryConsolidation,
        ensureSocialDirectorCatchup,
    };
}
