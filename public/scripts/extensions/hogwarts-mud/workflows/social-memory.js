import {
    getEventKnowledgeSourceMessageIds,
} from '../presence-witness-contract.js';

function projectSocialEvent(
    event,
) {
    return {
        eventId:
            event.eventId ||
            event.id ||
            '',
        kind:
            event.kind ||
            event.type ||
            '',
        sceneId:
            event.sceneId ||
            '',
        clock:
            event.clock ||
            '',
        summaryEn:
            event.summaryEn ||
            '',
        participantActorIds:
            event
                .participantActorIds ||
            [],
        witnessActorIds:
            event
                .witnessActorIds ||
            [],
        speakerId:
            event.speakerId ||
            '',
        recipientIds:
            event.recipientIds ||
            event
                .recipientActorIds ||
            [],
        subjectIds:
            event.subjectIds ||
            [],
        aboutEventId:
            event.aboutEventId ||
            '',
        parentReportedEventId:
            event
                .parentReportedEventId ||
            '',
    };
}

export function createSocialMemoryWorkflow(ports) {
    const {
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
        analyzeMemoryConsolidation,
        applySocialDirectorResult,
        applySystemPrompt,
        buildSocialAudienceProjection,
        captureMemoryBoundaryGuard,
        createContextBudgetPlan,
        extractRoleResponseText,
        getContext,
        getMudState,
        getRequestHeaders,
        getSettings,
        isMemoryBoundaryGuardCurrent,
        jobRegistry,
        normalizeMemoryConsolidationPayload,
        normalizeSocialGraph,
        recordTurnDiagnostic =
        () => {},
        renderAll,
        resolveRoleSlots,
        sendModelTaskRequest,
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
                of getEventKnowledgeSourceMessageIds(
                    event,
                )
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
                            historicalClaims:
                                (
                                    segment
                                        .historicalClaims ||
                                    []
                                ).map(claim => ({
                                    claimTextEn:
                                        claim
                                            .claimTextEn ||
                                        '',
                                    sourceEventIds:
                                        claim
                                            .sourceEventIds ||
                                        [],
                                })),
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
        records
            .flatMap(record =>
                record.segments)
            .flatMap(segment =>
                segment
                    .historicalClaims ||
                [])
            .flatMap(claim =>
                claim.sourceEventIds ||
                [])
            .forEach(eventId =>
                selectedEventIds.add(
                    eventId,
                ));
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
        _contextPlan = createContextBudgetPlan(
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
                    return {
                        id: actor.id,
                        nameEn:
                            actor.nameEn,
                        memoryRefs:
                            structuredClone(
                                state
                                    .actorMemoryIndex
                                    ?.byActorId
                                    ?.[actor.id] ||
                                {
                                    firstImpressionRef:
                                        '',
                                    core: [],
                                    recent: [],
                                    everyday: [],
                                },
                            ),
                        socialProjection:
                            buildSocialAudienceProjection(
                                state,
                                actor.id,
                            ).relationships
                                .map(edge => ({
                                    sourceActorId:
                                        edge
                                            .sourceActorId,
                                    targetActorId:
                                        edge
                                            .targetActorId,
                                    familiarity:
                                        edge
                                            .familiarity,
                                    closeness:
                                        edge
                                            .closeness,
                                    warmth:
                                        edge.warmth,
                                    trust:
                                        edge.trust,
                                    respect:
                                        edge.respect,
                                    influence:
                                        edge
                                            .influence,
                                    tension:
                                        edge
                                            .tension,
                                    resentment:
                                        edge
                                            .resentment,
                                    fear:
                                        edge.fear,
                                    protectiveness:
                                        edge
                                            .protectiveness,
                                    structuralTags:
                                        edge
                                            .structuralTags ||
                                        [],
                                    evidenceIds:
                                        edge
                                            .evidenceIds ||
                                        [],
                                })),
                    };
                });
        const reviewableAppraisalIds =
            new Set(
                reviewableActors
                    .flatMap(actor => [
                        actor.memoryRefs
                            .firstImpressionRef,
                        ...[
                            'core',
                            'recent',
                            'everyday',
                        ].flatMap(tier =>
                            (
                                actor
                                    .memoryRefs[
                                        tier
                                    ] ||
                                []
                            )
                                .filter(ref =>
                                    ref.recordType ===
                                        'appraisal')
                                .map(ref =>
                                    ref.recordId)),
                    ])
                    .filter(Boolean),
            );
        const backfillRules =
        evidence.backfill
            ? `
- This is a versioned catch-up scan. reviews and schemaOperations must both be exactly []. Set processedThroughMessageId to the final fully scanned source-message prefix; scanComplete is true only when every supplied sceneEvidence message was scanned.
- sceneEvidence may span multiple archived scenes. Every report must cite exact sourceSegmentRefs from one supplied message.
- Output at most 24 reportedEvents and 24 relationshipEvidence items. Prioritize meaningful player-facing changes, then durable inter-NPC changes.
- Include introductions, refusals, coercion, injury, help, promises, betrayal, repair, and structural relationships. Omit routine classroom facts, transient preferences, and evidence already represented by existingSocialGraph.`
            : `
- This is an event-boundary update. reviews may consolidate supplied memories. processedThroughMessageId must identify the final fully scanned source-message prefix.`;
        const existingGraph =
        normalizeSocialGraph(
            state.socialGraph,
        );
        const batchEventIds =
            new Set(
                (
                    evidence
                        .eventKnowledge ||
                    []
                ).map(event =>
                    event.eventId ||
                    event.id)
                    .filter(Boolean),
            );
        const batchActorIds =
            new Set([
                'player',
                ...(
                    signals.actors ||
                    []
                ).map(actor =>
                    actor.id),
                ...(
                    evidence
                        .presentActorIds ||
                    []
                ),
                ...(
                    evidence
                        .eventKnowledge ||
                    []
                ).flatMap(event => [
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
                    event.speakerId,
                    ...(
                        event
                            .recipientIds ||
                        event
                            .recipientActorIds ||
                        []
                    ),
                    ...(
                        event.subjectIds ||
                        []
                    ),
                ]),
            ].filter(Boolean));
        const existingSocialGraph = {
            relationshipEvidence:
            existingGraph
                .relationshipEvidence
                .filter(item =>
                    batchEventIds.has(
                        item.eventId,
                    ))
                .map(item => ({
                    id: item.id,
                    sourceActorId:
                        item.sourceActorId,
                    targetActorId:
                        item.targetActorId,
                    eventId:
                        item.eventId,
                    appraisalId:
                        item.appraisalId,
                    eventKind:
                        item.eventKind,
                    dimensionDeltas:
                        item.dimensionDeltas ||
                        [],
                    structuralTags:
                        item.structuralTags ||
                        [],
                    emotionEffects:
                        item
                            .emotionEffects ||
                        [],
                })),
            relationships:
            existingGraph
                .relationships
                .filter(edge =>
                    batchActorIds.has(
                        edge.sourceActorId,
                    ) &&
                    batchActorIds.has(
                        edge.targetActorId,
                    ))
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
                content: `You are the single mid-tier Social Director for a persistent Harry Potter RPG. Perform one source-grounded extraction for a deterministic reducer. Consolidate Appraisal memory, attributed reported Events, and directed relationship effects. Do not write scene prose or invent events. Return one compact JSON object matching the supplied transport JSON Schema.

socialAuthorityStamp is the binding revision, Scene and Actor-ID whitelist for this extraction. It is not narrative prose and grants no hidden knowledge.

Rules:
- Use only supplied memory IDs, committed Events and exact sceneEvidence text. Never use actor secrets, hidden clues, private goals, or facts the actor did not witness or receive.
- reportedEvents records the hard fact that one speaker communicated an attributed claim to explicit recipients. The claim itself is not automatically true.
- Every reported Event must cite exact sourceSegmentRefs from one supplied message. For an NPC, segmentIndex identifies that actor's dialogue segment. For player text, use segmentIndex -1 and speakerId "player".
- sourceStatementText and audienceEvidenceText must be exact substrings of the cited source text. summaryEn is attributed English prose, at most 600 characters, and is the only persisted report text.
- recipientIds must be direct/audible recipients of every cited committed Event. Never grant a report to a visual-only or absent actor. Without explicit target evidence, include the full eligible audience.
- aboutEventId is optional authority linkage only. It does not make the allegation true and does not grant recipients access to the linked Event. Fabricated claims use an empty aboutEventId.
- parentReportedEventId is optional and may cite only a report the speaker previously spoke or received. correction and retraction require it.
- recipientAppraisals are subjective reactions to a local report. Each observer must be that report's explicit recipient; the reducer maps localReportId to the committed Event.
- Generic free-text claims are forbidden. Identity and relationship claims are structured records that cite localReportId; never copy quote text, speaker, witness, Scene, message or clock into a claim.
- Never write authority Identity, resolve a person reference, or create a formal family edge. New personReferences remain unresolved.
- relationshipEvidence is directed and references exactly one existing Event ID or localReportId through eventRef. appraisalRef is optional. It contains only relationship effects, never prose, Scene, messages, witnesses or visibility.
- Use only actorDirectory IDs and allowedMessageIds. existingSocialGraph is read-only calibration and duplicate context. Extract only new supplied sceneEvidence.
- Emit one relationshipEvidence item per directed pair, eventKind and Event reference. The reducer, not you, owns final scores and actual appliedDelta.
- dimensionDeltas are proposals. Allowed dimensions are familiarity, closeness, warmth, trust, respect, influence, tension, resentment, fear, and protectiveness.
- eventKind must be one of introduction, routine_interaction, shared_time, serious_conversation, vulnerability, support, help, gift, promise, praise, rescue, sacrifice, insult, humiliation, threat, harm, betrayal, unresolved_conflict, accepted_apology, accepted_compensation, forgiveness, reappraisal, or other.
- structuralTags may contain only family, authority, classmate, rivalry, or mentor. Tags describe structure, never sentiment.
- Include at most four emotionEffects from anger, fear, contempt, disgust, envy, shame, guilt, gratitude, admiration, hope, disappointment, relief, pity, joy, or distress. Intensity is 1-5.
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
- schemaOperations may promote or update a Person Schema only from the supplied accepted memorySynapse Appraisals. A stable Schema requires at least three accepted Appraisals across at least two scenes for the same observer-target pair.
- Person Schemas are subjective expectations, not Identity or world-fact authority. Cite exact supportAppraisalIds and counterAppraisalIds; use [] when there is no legal operation.
- Keep each Appraisal and consolidation summary under 40 English words.
- Set reviewAfterTurns to 10-20. Never schedule another review sooner than 10 committed turns.
- Review only actors who need a consolidation operation. Include 0-8 actor reviews.
- processedThroughMessageId is required. It advances only across a fully scanned prefix of sceneEvidence. If the 24-report cap prevents scanning the full batch, set scanComplete false and leave the suffix for catch-up.
${backfillRules}
The transport JSON Schema is the sole output shape authority.`,
            },
            {
                role: 'user',
                content: JSON.stringify(
                    {
                        socialAuthorityStamp: {
                            timelineEpoch:
                                state
                                    .timelineEpoch ||
                                '',
                            stateRevision:
                                Number(
                                    state
                                        .stateRevision ||
                                    0,
                                ),
                            clock:
                                state.clock,
                            currentSceneId:
                                state.scene
                                    ?.id ||
                                '',
                            actorIds:
                                [...batchActorIds]
                                    .sort(),
                        },
                        clock: state.clock,
                        currentTurn:
                    Number(state.turn?.count || 0),
                        consolidationSignals: signals,
                        reviewableActors,
                        actorDirectory:
                    (state.actorLibrary ||
                    [])
                        .filter(actor =>
                            batchActorIds
                                .has(actor.id))
                        .map(actor => ({
                            id: actor.id,
                            nameEn:
                                actor.nameEn,
                        })),
                        existingSocialGraph:
                    existingSocialGraph,
                        memorySynapse: {
                            appraisals:
                            structuredClone(
                                state
                                    .memorySynapse
                                    ?.appraisals ||
                                [],
                            ).filter(appraisal =>
                                reviewableAppraisalIds
                                    .has(
                                        appraisal.id,
                                    )),
                            personSchemas:
                            structuredClone(
                                state
                                    .memorySynapse
                                    ?.personSchemas ||
                                [],
                            ).filter(schema =>
                                reviewableIds.has(
                                    schema
                                        .observerId,
                                )),
                        },
                        currentSceneCommittedEvents:
                        (
                            evidence
                                .eventKnowledge ||
                            []
                        )
                            .filter(event =>
                                event.sceneId ===
                                    state.scene
                                        ?.id)
                            .map(
                                projectSocialEvent,
                            ),
                        earlierCommittedEvents:
                        (
                            evidence
                                .eventKnowledge ||
                            []
                        )
                            .filter(event =>
                                event.sceneId !==
                                    state.scene
                                        ?.id)
                            .map(
                                projectSocialEvent,
                            ),
                        sceneEvidence:
                    evidence.messages,
                        allowedMessageIds:
                    evidence
                        .allowedMessageIds,
                    },
                ),
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

    const PERSON_SCHEMA_OPERATION_SCHEMA = {
        anyOf: [{
            type: 'object',
            additionalProperties: false,
            properties: {
                type: {
                    type: 'string',
                    enum: ['upsert'],
                },
                schemaId: {
                    type: [
                        'string',
                        'null',
                    ],
                },
                observerId: {
                    type: 'string',
                },
                targetId: {
                    type: 'string',
                },
                labelEn: {
                    type: 'string',
                },
                expectationEn: {
                    type: 'string',
                },
                supportAppraisalIds: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                counterAppraisalIds: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                contextTags: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                supersedesSchemaId: {
                    type: [
                        'string',
                        'null',
                    ],
                },
            },
            required: [
                'type',
                'schemaId',
                'observerId',
                'targetId',
                'labelEn',
                'expectationEn',
                'supportAppraisalIds',
                'counterAppraisalIds',
                'contextTags',
                'supersedesSchemaId',
            ],
        }, {
            type: 'object',
            additionalProperties: false,
            properties: {
                type: {
                    type: 'string',
                    enum: ['supersede'],
                },
                schemaId: {
                    type: 'string',
                },
            },
            required: [
                'type',
                'schemaId',
            ],
        }],
    };

    const SOURCE_SEGMENT_REF_SCHEMA = {
        type: 'object',
        additionalProperties: false,
        properties: {
            messageId: {
                type: 'integer',
            },
            segmentIndex: {
                type: 'integer',
                minimum: -1,
            },
        },
        required: [
            'messageId',
            'segmentIndex',
        ],
    };

    const REPORTED_EVENT_PROPOSAL_SCHEMA = {
        type: 'object',
        additionalProperties: false,
        properties: {
            localReportId: {
                type: 'string',
            },
            statementKind: {
                type: 'string',
                enum: [
                    'claim',
                    'correction',
                    'retraction',
                ],
            },
            sourceStatementText: {
                type: 'string',
            },
            audienceEvidenceText: {
                type: 'string',
            },
            summaryEn: {
                type: 'string',
            },
            sourceSegmentRefs: {
                type: 'array',
                minItems: 1,
                maxItems: 16,
                items:
                    SOURCE_SEGMENT_REF_SCHEMA,
            },
            speakerId: {
                type: 'string',
            },
            recipientIds: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'string',
                },
            },
            subjectIds: {
                type: 'array',
                items: {
                    type: 'string',
                },
            },
            aboutEventId: {
                type: 'string',
            },
            parentReportedEventId: {
                type: 'string',
            },
            distortionLevel: {
                type: 'integer',
                minimum: 0,
                maximum: 3,
            },
        },
        required: [
            'localReportId',
            'statementKind',
            'sourceStatementText',
            'audienceEvidenceText',
            'summaryEn',
            'sourceSegmentRefs',
            'speakerId',
            'recipientIds',
            'subjectIds',
            'aboutEventId',
            'parentReportedEventId',
            'distortionLevel',
        ],
    };

    const RECIPIENT_APPRAISAL_SCHEMA = {
        type: 'object',
        additionalProperties: false,
        properties: {
            localReportId: {
                type: 'string',
            },
            observerId: {
                type: 'string',
            },
            targetId: {
                type: 'string',
            },
            summaryEn: {
                type: 'string',
            },
            contextTags: {
                type: 'array',
                items: {
                    type: 'string',
                },
            },
            confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
            },
        },
        required: [
            'localReportId',
            'observerId',
            'targetId',
            'summaryEn',
            'contextTags',
            'confidence',
        ],
    };

    const IDENTITY_CLAIM_SCHEMA = {
        type: 'object',
        additionalProperties: false,
        properties: {
            localReportId: {
                type: 'string',
            },
            subjectId: {
                type: 'string',
            },
            fieldPath: {
                type: 'string',
            },
            value: {},
            sourceKind: {
                type: 'string',
                enum: [
                    'self',
                    'other',
                ],
            },
        },
        required: [
            'localReportId',
            'subjectId',
            'fieldPath',
            'value',
            'sourceKind',
        ],
    };

    const RELATIONSHIP_CLAIM_SCHEMA = {
        type: 'object',
        additionalProperties: false,
        properties: {
            localReportId: {
                type: 'string',
            },
            subjectId: {
                type: 'string',
            },
            relationshipKind: {
                type: 'string',
            },
            targetRefId: {
                type: 'string',
            },
            sourceKind: {
                type: 'string',
                enum: [
                    'self',
                    'other',
                ],
            },
        },
        required: [
            'localReportId',
            'subjectId',
            'relationshipKind',
            'targetRefId',
            'sourceKind',
        ],
    };

    const PERSON_REFERENCE_SCHEMA = {
        type: 'object',
        additionalProperties: false,
        properties: {
            id: {
                type: 'string',
            },
            label: {
                type: 'string',
            },
        },
        required: [
            'id',
            'label',
        ],
    };

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
                processedThroughMessageId: {
                    type: 'integer',
                    minimum: 0,
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
                            'operations',
                        ],
                    },
                },
                reportedEvents: {
                    type: 'array',
                    maxItems: 24,
                    items:
                        REPORTED_EVENT_PROPOSAL_SCHEMA,
                },
                recipientAppraisals: {
                    type: 'array',
                    maxItems: 24,
                    items:
                        RECIPIENT_APPRAISAL_SCHEMA,
                },
                identityClaims: {
                    type: 'array',
                    maxItems: 24,
                    items:
                        IDENTITY_CLAIM_SCHEMA,
                },
                relationshipClaims: {
                    type: 'array',
                    maxItems: 24,
                    items:
                        RELATIONSHIP_CLAIM_SCHEMA,
                },
                personReferences: {
                    type: 'array',
                    maxItems: 24,
                    items:
                        PERSON_REFERENCE_SCHEMA,
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
                            eventRef: {
                                type: 'string',
                            },
                            appraisalRef: {
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
                            emotionEffects: {
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
                                    },
                                    required: [
                                        'emotion',
                                        'intensity',
                                    ],
                                },
                            },
                        },
                        required: [
                            'sourceActorId',
                            'targetActorId',
                            'eventRef',
                            'appraisalRef',
                            'eventKind',
                            'dimensionDeltas',
                            'structuralTags',
                            'emotionEffects',
                        ],
                    },
                },
                schemaOperations: {
                    type: 'array',
                    maxItems: 32,
                    items:
                        PERSON_SCHEMA_OPERATION_SCHEMA,
                },
            },
            required: [
                'scanComplete',
                'processedThroughMessageId',
                'reviewAfterTurns',
                'reviews',
                'reportedEvents',
                'recipientAppraisals',
                'identityClaims',
                'relationshipClaims',
                'personReferences',
                'relationshipEvidence',
                'schemaOperations',
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
        const response = await sendModelTaskRequest(
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
        const allowedMessageIds =
            evidence
                .allowedMessageIds;
        const processedIndex =
            allowedMessageIds.indexOf(
                payload
                    .processedThroughMessageId,
            );
        if (
            processedIndex < 0 ||
            (
                payload.scanComplete ===
                    true &&
                processedIndex !==
                    allowedMessageIds
                        .length - 1
            )
        ) {
            throw new Error(
                '社交导演 processedThroughMessageId 不是完整扫描前缀。',
            );
        }
        if (
            evidence.backfill &&
            (
                payload.reviews.length ||
                payload
                    .schemaOperations
                    .length
            )
        ) {
            throw new Error(
                '补算模式不得修改共同记忆或人物图式。',
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
        const values = payload.reviews.flatMap(review =>
            (review.operations || []).map(
                operation => operation.summaryEn || '',
            ));
        const translated =
        await translateOpeningValues(values);
        let cursor = 0;
        const localized = {
            ...payload,
            reviews: payload.reviews.map(review => {
                return {
                    ...review,
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
                    actorDirectory:
                    (
                        state.actorLibrary ||
                        []
                    ).map(actor => ({
                        id: actor.id,
                        nameEn:
                            actor.nameEn,
                    })),
                    sceneEvidence:
                    evidence.messages,
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
                    availableAppraisals:
                    (
                        state.memorySynapse
                            ?.appraisals ||
                        []
                    ).map(appraisal => ({
                        id: appraisal.id,
                        observerId:
                            appraisal
                                .observerId,
                        targetId:
                            appraisal
                                .targetId,
                        sourceEventIds:
                            appraisal
                                .sourceEventIds ||
                            [],
                    })),
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
        let boundaryGuard = null;
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
            state = getMudState();
            boundaryGuard =
                backfill
                    ? null
                    : captureMemoryBoundaryGuard(
                        state,
                    );
            renderAll();
            let proposedSchemaOperations =
                0;
            let schemaDiagnosticsRecorded =
                false;
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
                proposedSchemaOperations =
                    payload
                        .schemaOperations
                        .length;
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
                    {
                        boundaryGuard,
                    },
                );
                recordTurnDiagnostic(
                    'schema_operations_validation',
                    {
                        proposed:
                            proposedSchemaOperations,
                        accepted:
                            (
                                graphResult
                                    .schemaOperations ||
                                []
                            ).length,
                        rejected: 0,
                        reasons: [],
                    },
                );
                schemaDiagnosticsRecorded =
                    true;
                next.socialGraph
                    .extractorVersion =
                SOCIAL_GRAPH_EXTRACTOR_VERSION;
                const hasUnprocessedSuffix =
                    evidence.hasMore ||
                    graphResult
                        .scanComplete !==
                        true;
                next.socialGraph.status =
                    hasUnprocessedSuffix
                        ? 'pending'
                        : 'ready';
                next.socialGraph.error =
                '';
                next.socialGraph
                    .backfillPendingSceneId =
                    hasUnprocessedSuffix
                        ? state
                            .socialGraph
                            ?.backfillPendingSceneId ||
                            state.scene?.id ||
                            ''
                        : '';
                if (backfill) {
                    if (
                        !hasUnprocessedSuffix
                    ) {
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
                    }
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
                if (
                    error?.code ===
                        'MODEL_TASK_DEFERRED'
                ) {
                    state = getMudState();
                    state.socialGraph =
                    normalizeSocialGraph(
                        state.socialGraph,
                    );
                    state.socialGraph.status =
                        'pending';
                    state.socialGraph.error =
                        '';
                    if (!backfill) {
                        state.memoryDirector = {
                            ...(
                                state
                                    .memoryDirector ||
                                {}
                            ),
                            status: 'pending',
                            error: '',
                        };
                    }
                    await context
                        .saveMetadata();
                    renderAll();
                    return null;
                }
                if (
                    !schemaDiagnosticsRecorded &&
                    proposedSchemaOperations
                ) {
                    recordTurnDiagnostic(
                        'schema_operations_validation',
                        {
                            proposed:
                                proposedSchemaOperations,
                            accepted: 0,
                            rejected:
                                proposedSchemaOperations,
                            reasons: [{
                                code:
                                    boundaryGuard &&
                                    !isMemoryBoundaryGuardCurrent(
                                        getMudState(),
                                        boundaryGuard,
                                    )
                                        ? 'stale_revision_or_boundary'
                                        : 'schema_validation_failed',
                                count:
                                    proposedSchemaOperations,
                            }],
                        },
                    );
                }
                if (
                    boundaryGuard &&
                    !isMemoryBoundaryGuardCurrent(
                        getMudState(),
                        boundaryGuard,
                    )
                ) {
                    console.warn(
                        '[Hogwarts MUD] Discarded stale memory consolidation result',
                        error,
                    );
                    return null;
                }
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
                'pending'
        ) {
            jobRegistry
                .socialCatchupAttempts
                .delete(attemptKey);
        }
        return nextGraph;
    }

    async function ensureSocialDirectorForAction() {
        const graph =
            normalizeSocialGraph(
                getMudState()
                    ?.socialGraph,
            );
        if (
            graph.extractorVersion <
                SOCIAL_GRAPH_EXTRACTOR_VERSION ||
            graph.backfillPendingSceneId
        ) {
            return ensureSocialDirectorCatchup();
        }
        await ensureMemoryConsolidation();
        return normalizeSocialGraph(
            getMudState()
                ?.socialGraph,
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
        ensureSocialDirectorForAction,
    };
}
