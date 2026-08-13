import { createHash } from 'node:crypto';

import {
    END,
    START,
    StateGraph,
    StateSchema,
} from '@langchain/langgraph';
import { z } from 'zod';

import {
    validateEventKnowledgeContract,
} from '../../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    ACCEPTED_REPAIR_EVENT_KINDS,
    ACTIVE_EMOTION_DECAY_PER_TURN,
    CLOSENESS_STAGE_THRESHOLDS,
    DEFINING_EVENT_KINDS,
    EMOTIONS,
    EVENT_KINDS,
    IMPACT_BANDS,
    MODEL_RELATIONSHIP_EVIDENCE_FIELDS,
    NON_BONDING_CLOSENESS_EVENT_KINDS,
    PERSISTED_RELATIONSHIP_EDGE_FIELDS,
    PERSISTED_RELATIONSHIP_EVIDENCE_FIELDS,
    RELATIONSHIP_DIMENSION_RANGES,
    RELATIONSHIP_DIMENSIONS,
    REPEAT_MULTIPLIERS,
    RESENTMENT_HARM_EVENT_KINDS,
    SIGNED_NEGATIVE_DIMENSIONS,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
    STAGE_GATED_CLOSENESS_EVENT_KINDS,
    STATEMENT_CATEGORIES,
    STRUCTURAL_TAGS,
    selectObjectFields,
} from './social-director-contract.js';

export {
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
    getSocialDirectorReducerContract,
} from './social-director-contract.js';

const SocialDirectorState = new StateSchema({
    input: z.any(),
    context: z.any().optional(),
    acceptedStatements: z.array(z.any()).optional(),
    acceptedEvidence: z.array(z.any()).optional(),
    rejected: z.array(z.any()).optional(),
    output: z.any().optional(),
});

function normalizeId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .slice(0, 120);
}

function normalizeText(value, maxLength = 400) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function clamp(value, minimum, maximum) {
    const number = Number(value);
    return Math.min(
        maximum,
        Math.max(
            minimum,
            Number.isFinite(number)
                ? number
                : 0,
        ),
    );
}

function roundSocialNumber(value) {
    return Math.round(
        (Number(value) +
            Number.EPSILON) *
            100,
    ) / 100;
}

function stableId(prefix, parts) {
    const digest = createHash('sha256')
        .update(parts.map(String).join('\u001f'))
        .digest('hex')
        .slice(0, 20);
    return `${prefix}_${digest}`;
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function stableNormalizedIds(values) {
    return unique(
        (
            Array.isArray(values)
                ? values
                : []
        )
            .map(normalizeId)
            .filter(Boolean),
    ).sort();
}

function equalIdMaps(
    supplied,
    projected,
    messageIds,
) {
    const suppliedKeys =
        Object.keys(supplied || {})
            .map(Number)
            .filter(
                Number.isInteger,
            )
            .sort((left, right) =>
                left - right);
    if (
        JSON.stringify(suppliedKeys) !==
        JSON.stringify(messageIds)
    ) {
        return false;
    }
    return messageIds.every(messageId =>
        JSON.stringify(
            stableNormalizedIds(
                supplied?.[messageId],
            ),
        ) ===
        JSON.stringify(
            projected[messageId],
        ));
}

export function validateCommittedEventWitnessInput(
    input = {},
) {
    const errors = [];
    const actorIds =
        new Set(
            stableNormalizedIds(
                input.actorIds,
            ),
        );
    const allowedMessageIds =
        unique(
            (
                input.allowedMessageIds ||
                []
            )
                .map(Number)
                .filter(
                    Number.isInteger,
                ),
        ).sort((left, right) =>
            left - right);
    const allowedMessageIdSet =
        new Set(
            allowedMessageIds,
        );
    const witnessesByMessage =
        Object.fromEntries(
            allowedMessageIds.map(id => [
                id,
                new Set(),
            ]),
        );
    const scenesByMessage =
        Object.fromEntries(
            allowedMessageIds.map(id => [
                id,
                new Set(),
            ]),
        );
    const eventKnowledge =
        Array.isArray(
            input.eventKnowledge,
        )
            ? input.eventKnowledge
            : [];
    if (
        eventKnowledge.length > 200
    ) {
        errors.push(
            'too_many_event_knowledge_records',
        );
    }
    for (const event of eventKnowledge) {
        const contractValidation =
            validateEventKnowledgeContract(
                event,
                {
                    actors: [
                        ...actorIds,
                    ].map(id => ({
                        id,
                    })),
                    cohortIds:
                        event
                            ?.witnessCohortIds ||
                        [],
                    sourceTexts: [
                        event
                            ?.perception
                            ?.evidenceText,
                    ],
                },
            );
        if (
            !contractValidation.valid
        ) {
            errors.push(
                'invalid_event_knowledge_record',
            );
            continue;
        }
        const normalizedEvent =
            contractValidation.value;
        const sceneId =
            normalizeId(
                normalizedEvent.sceneId,
            );
        const sourceMessageIds =
            unique(
                (
                    normalizedEvent
                        .sourceMessageIds ||
                    []
                )
                    .map(Number)
                    .filter(
                        Number.isInteger,
                    ),
            );
        const participantActorIds =
            stableNormalizedIds(
                normalizedEvent
                    .participantActorIds,
            );
        const witnessActorIds =
            stableNormalizedIds(
                normalizedEvent
                    .witnessActorIds,
            );
        const witnessSet =
            new Set(witnessActorIds);
        const witnessBasis =
            normalizedEvent
                .witnessBasis;
        if (
            !normalizeId(
                normalizedEvent.eventId,
            ) ||
            !sceneId ||
            !sourceMessageIds.length ||
            !sourceMessageIds.some(id =>
                allowedMessageIdSet
                    .has(id)) ||
            witnessActorIds.some(id =>
                !actorIds.has(id)) ||
            participantActorIds.some(id =>
                !witnessSet.has(id)) ||
            !witnessBasis ||
            typeof witnessBasis !==
                'object' ||
            Array.isArray(witnessBasis) ||
            witnessActorIds.some(id =>
                !String(
                    witnessBasis[id] ||
                    '',
                ).trim()) ||
            !normalizedEvent
                .perception ||
            typeof normalizedEvent
                .perception !==
                'object'
        ) {
            errors.push(
                'invalid_event_knowledge_record',
            );
            continue;
        }
        for (
            const messageId
            of sourceMessageIds
        ) {
            if (
                !allowedMessageIdSet
                    .has(messageId)
            ) {
                continue;
            }
            for (
                const actorId
                of witnessActorIds
            ) {
                witnessesByMessage[
                    messageId
                ].add(actorId);
            }
            scenesByMessage[
                messageId
            ].add(sceneId);
        }
    }
    const projectedWitnesses =
        Object.fromEntries(
            allowedMessageIds.map(id => [
                id,
                [
                    ...witnessesByMessage[id],
                ].sort(),
            ]),
        );
    const projectedScenes =
        Object.fromEntries(
            allowedMessageIds.map(id => {
                const scenes = [
                    ...scenesByMessage[id],
                ];
                if (scenes.length !== 1) {
                    errors.push(
                        'message_event_scene_is_not_unique',
                    );
                }
                return [
                    id,
                    scenes[0] || '',
                ];
            }),
        );
    if (
        !equalIdMaps(
            input
                .witnessActorIdsByMessageId,
            projectedWitnesses,
            allowedMessageIds,
        )
    ) {
        errors.push(
            'witness_map_does_not_match_event_knowledge',
        );
    }
    if (
        JSON.stringify(
            Object.keys(
                input.messageSceneIds ||
                {},
            )
                .map(Number)
                .filter(
                    Number.isInteger,
                )
                .sort((left, right) =>
                    left - right),
        ) !==
            JSON.stringify(
                allowedMessageIds,
            ) ||
        allowedMessageIds.some(id =>
            normalizeId(
                input
                    .messageSceneIds?.[id],
            ) !==
            projectedScenes[id])
    ) {
        errors.push(
            'scene_map_does_not_match_event_knowledge',
        );
    }
    return {
        valid: errors.length === 0,
        errors,
        eventKnowledge:
            structuredClone(
                eventKnowledge,
            ),
        messageSceneIds:
            projectedScenes,
        witnessActorIdsByMessageId:
            projectedWitnesses,
    };
}

function isRelationshipEntity(id, context) {
    return id === 'player' ||
        context.actorIds.has(id);
}

function collectEvidence(state) {
    const input = state.input || {};
    const actorIds = new Set(
        (input.actorIds || [])
            .map(normalizeId)
            .filter(Boolean),
    );
    const presentActorIds = new Set(
        (input.presentActorIds || [])
            .map(normalizeId)
            .filter(id => actorIds.has(id)),
    );
    const allowedMessageIds = new Set(
        (input.allowedMessageIds || [])
            .map(Number)
            .filter(Number.isInteger),
    );
    const messageSceneIds =
        new Map(
            Object.entries(
                input
                    .messageSceneIds ||
                {},
            )
                .map(([id, sceneId]) => [
                    Number(id),
                    normalizeId(
                        sceneId,
                    ),
                ])
                .filter(([id, sceneId]) =>
                    Number.isInteger(id) &&
                    allowedMessageIds
                        .has(id) &&
                    sceneId),
        );
    const witnessActorIdsByMessageId =
        new Map(
            Object.entries(
                input
                    .witnessActorIdsByMessageId ||
                {},
            )
                .map(([id, actorIdsForMessage]) => [
                    Number(id),
                    new Set(
                        (
                            Array.isArray(
                                actorIdsForMessage,
                            )
                                ? actorIdsForMessage
                                : []
                        )
                            .map(normalizeId)
                            .filter(actorId =>
                                actorId ===
                                    'player' ||
                                actorIds.has(
                                    actorId,
                                )),
                    ),
                ])
                .filter(([id]) =>
                    Number.isInteger(id) &&
                    allowedMessageIds
                        .has(id)),
        );
    return {
        context: {
            actorIds,
            presentActorIds,
            allowedMessageIds,
            messageSceneIds,
            witnessActorIdsByMessageId,
            sceneId: normalizeId(input.sceneId),
            clock: normalizeText(input.clock, 80),
            turn: Math.max(
                0,
                Number(input.turn) || 0,
            ),
            existingGraph:
                input.existingGraph &&
                typeof input.existingGraph ===
                    'object'
                    ? structuredClone(
                        input.existingGraph,
                    )
                    : {},
            extraction:
                input.extraction &&
                typeof input.extraction ===
                    'object'
                    ? structuredClone(
                        input.extraction,
                    )
                    : {},
        },
    };
}

function filterWitnesses(
    values,
    sourceMessageIds,
    context,
) {
    if (!sourceMessageIds.length) {
        return [];
    }
    return unique(
        (
            Array.isArray(values)
                ? values
                : []
        )
            .map(normalizeId)
            .filter(id =>
                isRelationshipEntity(
                    id,
                    context,
                ) &&
                sourceMessageIds.every(
                    messageId =>
                        context
                            .witnessActorIdsByMessageId
                            .get(messageId)
                            ?.has(id),
                )),
    );
}

function resolveEvidenceSceneId(
    source,
    sourceMessageIds,
    context,
) {
    const sourceSceneIds =
        unique(
            sourceMessageIds
                .map(messageId =>
                    context
                        .messageSceneIds
                        .get(messageId))
                .filter(Boolean),
        );
    const requested =
        normalizeId(
            source?.sceneId,
        );
    if (sourceSceneIds.length > 1) {
        return '';
    }
    if (sourceSceneIds.length === 1) {
        return sourceSceneIds[0];
    }
    return requested ||
        context.sceneId;
}

function getSourceMessageIds(
    values,
    context,
) {
    if (
        !Array.isArray(values) ||
        !values.length
    ) {
        return {
            ids: [],
            valid: false,
        };
    }
    const converted =
        values.map(Number);
    const valid =
        converted.every(id =>
            Number.isInteger(id) &&
            context
                .allowedMessageIds
                .has(id) &&
            context
                .messageSceneIds
                .has(id) &&
            context
                .witnessActorIdsByMessageId
                .has(id));
    return {
        ids: valid
            ? unique(converted)
                .sort((left, right) =>
                    left - right)
            : [],
        valid,
    };
}

function validateDimensionDeltas(
    values,
    {
        eventKind,
        evidenceId,
        structuralTags = [],
    },
    rejected,
) {
    const accepted = [];
    const seenDimensions = new Set();
    (
        Array.isArray(values)
            ? values
            : []
    ).forEach((proposal, index) => {
        const dimension =
            normalizeId(
                proposal?.dimension,
            );
        const impact =
            normalizeId(
                proposal?.impact,
            );
        const rawDelta =
            Number(proposal?.delta);
        const band =
            IMPACT_BANDS[impact];
        const maximum =
            band
                ? getImpactMaximum(
                    dimension,
                    impact,
                )
                : 0;
        const magnitude =
            Math.abs(rawDelta);
        let reason = '';
        if (
            !RELATIONSHIP_DIMENSIONS
                .has(dimension)
        ) {
            reason = 'unknown_dimension';
        } else if (
            !Number.isFinite(rawDelta) ||
            rawDelta === 0
        ) {
            reason = 'invalid_delta';
        } else if (!IMPACT_BANDS[impact]) {
            reason = 'invalid_impact';
        } else if (
            seenDimensions.has(dimension)
        ) {
            reason = 'duplicate_dimension';
        } else if (
            impact === 'defining' &&
            !DEFINING_EVENT_KINDS
                .has(eventKind)
        ) {
            reason =
                'defining_requires_strong_provenance';
        } else if (
            magnitude < band.minimum ||
            magnitude > maximum
        ) {
            reason =
                'delta_outside_impact_band';
        } else if (
            dimension === 'closeness' &&
            rawDelta > 0 &&
            (
                eventKind ===
                    'routine_interaction' ||
                (
                    structuralTags.includes(
                        'classmate',
                    ) &&
                    NON_BONDING_CLOSENESS_EVENT_KINDS
                        .has(eventKind)
                )
            )
        ) {
            reason =
                'closeness_requires_voluntary_bonding';
        } else if (
            dimension === 'resentment' &&
            rawDelta < 0 &&
            !ACCEPTED_REPAIR_EVENT_KINDS
                .has(eventKind)
        ) {
            reason =
                'resentment_repair_not_accepted';
        } else if (
            dimension === 'resentment' &&
            rawDelta > 0 &&
            !RESENTMENT_HARM_EVENT_KINDS
                .has(eventKind)
        ) {
            reason =
                'resentment_requires_harm';
        }
        if (reason) {
            rejected.push({
                kind: 'dimension_delta',
                reason,
                evidenceId,
                index,
                proposal,
            });
            return;
        }
        seenDimensions.add(dimension);
        accepted.push({
            dimension,
            delta: rawDelta,
            impact,
        });
    });
    return accepted;
}

function validateStructuralTags(
    values,
    evidenceId,
    rejected,
) {
    const accepted = [];
    (
        Array.isArray(values)
            ? values
            : []
    ).forEach((value, index) => {
        const tag =
            normalizeId(value)
                .toLocaleLowerCase();
        if (!STRUCTURAL_TAGS.has(tag)) {
            rejected.push({
                kind: 'structural_tag',
                reason:
                    'unknown_structural_tag',
                evidenceId,
                index,
                value,
            });
            return;
        }
        if (!accepted.includes(tag)) {
            accepted.push(tag);
        }
    });
    return accepted;
}

function validateEmotionAppraisals(
    values,
    {
        evidenceId,
        evidenceSourceMessageIds,
    },
    context,
    rejected,
) {
    const accepted = [];
    (
        Array.isArray(values)
            ? values
            : []
    ).forEach((appraisal, index) => {
        if (accepted.length >= 4) {
            rejected.push({
                kind: 'emotion_appraisal',
                reason:
                    'too_many_emotion_appraisals',
                evidenceId,
                index,
                appraisal,
            });
            return;
        }
        const emotion =
            normalizeId(
                appraisal?.emotion,
            );
        const intensity =
            Number(
                appraisal?.intensity,
            );
        const suppliedSourceMessageIds =
            appraisal?.sourceMessageIds;
        const sourceResult =
            suppliedSourceMessageIds ===
                undefined
                ? {
                    ids:
                        evidenceSourceMessageIds,
                    valid: true,
                }
                : getSourceMessageIds(
                    suppliedSourceMessageIds,
                    context,
                );
        const sourcesBelongToEvidence =
            sourceResult.ids.every(id =>
                evidenceSourceMessageIds
                    .includes(id));
        let reason = '';
        if (!EMOTIONS.has(emotion)) {
            reason = 'unknown_emotion';
        } else if (
            !Number.isInteger(intensity) ||
            intensity < 1 ||
            intensity > 5
        ) {
            reason =
                'invalid_emotion_intensity';
        } else if (
            !sourceResult.valid ||
            !sourceResult.ids.length ||
            !sourcesBelongToEvidence
        ) {
            reason =
                'invalid_emotion_provenance';
        }
        if (reason) {
            rejected.push({
                kind: 'emotion_appraisal',
                reason,
                evidenceId,
                index,
                appraisal,
            });
            return;
        }
        accepted.push({
            emotion,
            intensity,
            sourceMessageIds:
                sourceResult.ids,
        });
    });
    return accepted;
}

function validateExtraction(state) {
    const context = state.context;
    const extraction =
        context.extraction || {};
    const acceptedStatements = [];
    const acceptedEvidence = [];
    const rejected = [];

    for (const source of (
        extraction.statements || []
    )) {
        const subjectId =
            normalizeId(source?.subjectId);
        const speakerId =
            normalizeId(source?.speakerId);
        const category =
            STATEMENT_CATEGORIES.has(
                source?.category,
            )
                ? source.category
                : 'other';
        const textEn =
            normalizeText(source?.textEn);
        const sourceMessageResult =
            getSourceMessageIds(
                source?.sourceMessageIds,
                context,
            );
        const sourceMessageIds =
            sourceMessageResult.ids;
        const witnessedBy =
            filterWitnesses(
                source?.witnessedBy,
                sourceMessageIds,
                context,
            );
        const sceneId =
            resolveEvidenceSceneId(
                source,
                sourceMessageIds,
                context,
            );
        if (
            !context.actorIds.has(subjectId) ||
            !context.actorIds.has(speakerId) ||
            !textEn ||
            !sourceMessageResult.valid ||
            !witnessedBy.length ||
            !sceneId
        ) {
            rejected.push({
                kind: 'statement',
                reason:
                    'invalid_provenance',
                source,
            });
            continue;
        }
        acceptedStatements.push({
            id: stableId(
                'statement',
                [
                    subjectId,
                    speakerId,
                    category,
                    sceneId,
                    ...sourceMessageIds,
                    textEn.toLocaleLowerCase(),
                ],
            ),
            subjectId,
            speakerId,
            category,
            textEn,
            text:
                normalizeText(
                    source?.text ||
                    textEn,
                ),
            status: 'claimed',
            witnessedBy,
            sourceMessageIds,
            sceneId,
            firstClock: context.clock,
            lastClock: context.clock,
            createdTurn: context.turn,
            updatedTurn: context.turn,
        });
    }

    for (const source of (
        extraction.relationshipEvidence ||
        []
    )) {
        const unsupportedFields =
            Object.keys(source || {})
                .filter(field =>
                    !MODEL_RELATIONSHIP_EVIDENCE_FIELDS
                        .has(field));
        if (unsupportedFields.length) {
            rejected.push({
                kind:
                    'relationship_evidence',
                reason:
                    'unknown_contract_field',
                fields:
                    unsupportedFields,
                source,
            });
            continue;
        }
        const sourceActorId =
            normalizeId(
                source?.sourceActorId,
            );
        const targetActorId =
            normalizeId(
                source?.targetActorId,
            );
        const requestedEventKind =
            normalizeId(
                source?.eventKind,
            );
        const eventKind =
            EVENT_KINDS.has(
                requestedEventKind,
            )
                ? requestedEventKind
                : 'other';
        const summaryEn =
            normalizeText(
                source?.summaryEn,
            );
        const sourceMessageResult =
            getSourceMessageIds(
                source?.sourceMessageIds,
                context,
            );
        const sourceMessageIds =
            sourceMessageResult.ids;
        const witnessedBy =
            filterWitnesses(
                source?.witnessedBy,
                sourceMessageIds,
                context,
            );
        const sceneId =
            resolveEvidenceSceneId(
                source,
                sourceMessageIds,
                context,
            );
        if (
            sourceActorId ===
                targetActorId ||
            !isRelationshipEntity(
                sourceActorId,
                context,
            ) ||
            !isRelationshipEntity(
                targetActorId,
                context,
            ) ||
            !summaryEn ||
            !sourceMessageResult.valid ||
            !witnessedBy.length ||
            !sceneId
        ) {
            rejected.push({
                kind:
                    'relationship_evidence',
                reason:
                    'invalid_provenance',
                source,
            });
            continue;
        }
        const id = stableId(
            'relation_evidence',
            [
                sourceActorId,
                targetActorId,
                eventKind,
                sceneId,
                ...sourceMessageIds,
            ],
        );
        if (eventKind !== requestedEventKind) {
            rejected.push({
                kind: 'event_kind',
                reason:
                    'unknown_event_kind',
                evidenceId: id,
                value:
                    source?.eventKind,
            });
        }
        const structuralTags =
            validateStructuralTags(
                source?.structuralTags,
                id,
                rejected,
            );
        const dimensionDeltas =
            validateDimensionDeltas(
                source?.dimensionDeltas,
                {
                    eventKind,
                    evidenceId: id,
                    structuralTags,
                },
                rejected,
            );
        const emotionAppraisals =
            validateEmotionAppraisals(
                source?.emotionAppraisals,
                {
                    evidenceId: id,
                    evidenceSourceMessageIds:
                        sourceMessageIds,
                },
                context,
                rejected,
            );
        acceptedEvidence.push({
            id,
            sourceActorId,
            targetActorId,
            eventKind,
            dimensionDeltas,
            structuralTags,
            emotionAppraisals,
            summaryEn,
            summary:
                normalizeText(
                    source?.summary ||
                    summaryEn,
                ),
            witnessedBy,
            sourceMessageIds,
            sceneId,
            clock: context.clock,
            turn: context.turn,
        });
    }

    return {
        acceptedStatements,
        acceptedEvidence,
        rejected,
    };
}

function compareRelationshipEvidence(
    left,
    right,
) {
    const leftMessageId =
        left.sourceMessageIds?.[0] ??
        Number.MAX_SAFE_INTEGER;
    const rightMessageId =
        right.sourceMessageIds?.[0] ??
        Number.MAX_SAFE_INTEGER;
    return leftMessageId - rightMessageId ||
        String(left.sceneId)
            .localeCompare(
                String(right.sceneId),
            ) ||
        String(left.sourceActorId)
            .localeCompare(
                String(right.sourceActorId),
            ) ||
        String(left.targetActorId)
            .localeCompare(
                String(right.targetActorId),
            ) ||
        String(left.eventKind)
            .localeCompare(
                String(right.eventKind),
            ) ||
        String(left.id)
            .localeCompare(String(right.id));
}

function getRepeatMultiplier(
    evidence,
    relationshipEvidence,
) {
    const priorCount = [
        ...relationshipEvidence.values(),
    ].filter(previous => {
        if (
            previous.id === evidence.id ||
            previous.sourceActorId !==
                evidence.sourceActorId ||
            previous.targetActorId !==
                evidence.targetActorId ||
            previous.eventKind !==
                evidence.eventKind
        ) {
            return false;
        }
        const previousTurn =
            Number(previous.turn);
        const currentTurn =
            Number(evidence.turn);
        const age =
            currentTurn -
            previousTurn;
        return previous.sceneId ===
                evidence.sceneId ||
            (
                Number.isFinite(age) &&
                age >= 0 &&
                age <= 10
            );
    }).length;
    return REPEAT_MULTIPLIERS[
        Math.min(
            priorCount,
            REPEAT_MULTIPLIERS.length -
                1,
        )
    ];
}

function getSaturationMultiplier(
    current,
    delta,
) {
    if (
        current === 0 ||
        Math.sign(current) !==
            Math.sign(delta)
    ) {
        return 1;
    }
    return Math.max(
        0.25,
        1 - Math.abs(current) / 100,
    );
}

function getAsymmetryMultiplier(
    dimension,
    delta,
    evidence,
) {
    if (
        delta >= 0 ||
        !SIGNED_NEGATIVE_DIMENSIONS
            .has(dimension)
    ) {
        return 1;
    }
    return evidence.eventKind ===
        'betrayal' &&
        [
            'major',
            'defining',
        ].includes(
            evidence.currentImpact,
        )
        ? 1.5
        : 1.25;
}

function getImpactMaximum(
    dimension,
    impact,
) {
    const maximum =
        IMPACT_BANDS[impact].maximum;
    if (dimension !== 'closeness') {
        return maximum;
    }
    return impact === 'defining'
        ? 15
        : Math.min(10, maximum);
}

function getClosenessStageCeiling(
    current,
) {
    const nextThreshold =
        CLOSENESS_STAGE_THRESHOLDS
            .find(threshold =>
                current < threshold);
    return nextThreshold === undefined
        ? 100
        : roundSocialNumber(
            Math.max(
                current,
                nextThreshold - 0.01,
            ),
        );
}

function applyDimensionDelta(
    edge,
    proposal,
    evidence,
    repeatMultiplier,
) {
    const range =
        RELATIONSHIP_DIMENSION_RANGES[
            proposal.dimension
        ];
    const current = clamp(
        edge[proposal.dimension],
        range.minimum,
        range.maximum,
    );
    const saturationMultiplier =
        getSaturationMultiplier(
            current,
            proposal.delta,
        );
    const asymmetryMultiplier =
        getAsymmetryMultiplier(
            proposal.dimension,
            proposal.delta,
            {
                ...evidence,
                currentImpact:
                    proposal.impact,
            },
        );
    const scaled =
        proposal.delta *
        repeatMultiplier *
        saturationMultiplier *
        asymmetryMultiplier;
    const maximum =
        getImpactMaximum(
            proposal.dimension,
            proposal.impact,
        );
    const capped =
        Math.sign(scaled) *
        Math.min(
            Math.abs(scaled),
            maximum,
        );
    const stageGateCeiling =
        proposal.dimension ===
            'closeness' &&
        proposal.delta > 0 &&
        STAGE_GATED_CLOSENESS_EVENT_KINDS
            .has(evidence.eventKind)
            ? getClosenessStageCeiling(
                current,
            )
            : null;
    const next = roundSocialNumber(
        clamp(
            stageGateCeiling === null
                ? current + capped
                : Math.min(
                    current + capped,
                    stageGateCeiling,
                ),
            range.minimum,
            range.maximum,
        ),
    );
    edge[proposal.dimension] = next;
    return {
        ...proposal,
        appliedDelta:
            roundSocialNumber(
                next - current,
            ),
        repeatMultiplier,
        saturationMultiplier:
            roundSocialNumber(
                saturationMultiplier,
            ),
        asymmetryMultiplier,
        ...(
            stageGateCeiling === null
                ? {}
                : {
                    stageGateCeiling,
                }
        ),
    };
}

function decayActiveEmotion(
    emotion,
    currentTurn,
) {
    if (!EMOTIONS.has(emotion?.emotion)) {
        return null;
    }
    const intensity = clamp(
        emotion.intensity,
        1,
        5,
    );
    const initialIntensity = clamp(
        emotion.initialIntensity ??
            intensity,
        1,
        5,
    );
    const updatedTurn =
        Number(emotion.updatedTurn);
    const turn = Number(currentTurn);
    if (
        !Number.isFinite(updatedTurn) ||
        !Number.isFinite(turn)
    ) {
        return {
            ...emotion,
            intensity,
        };
    }
    const elapsedTurns = Math.max(
        0,
        Math.floor(turn - updatedTurn),
    );
    const decayedIntensity =
        initialIntensity -
        elapsedTurns *
            ACTIVE_EMOTION_DECAY_PER_TURN;
    return decayedIntensity > 0
        ? {
            ...emotion,
            initialIntensity,
            intensity:
                decayedIntensity,
        }
        : null;
}

function decayActiveEmotions(
    values,
    currentTurn,
) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
        .map(emotion =>
            decayActiveEmotion(
                emotion,
                currentTurn,
            ))
        .filter(Boolean);
}

function applyEmotionAppraisals(
    edge,
    evidence,
) {
    const activeEmotions =
        new Map(
            (
                Array.isArray(
                    edge.activeEmotions,
                )
                    ? edge.activeEmotions
                    : []
            )
                .filter(emotion =>
                    EMOTIONS.has(
                        emotion?.emotion,
                    ))
                .map(emotion => [
                    emotion.emotion,
                    emotion,
                ]),
        );
    for (const appraisal of (
        evidence.emotionAppraisals || []
    )) {
        activeEmotions.set(
            appraisal.emotion,
            {
                ...appraisal,
                sourceEvidenceId:
                    evidence.id,
                sourceMessageIds: [
                    ...appraisal
                        .sourceMessageIds,
                ],
                sceneId:
                    evidence.sceneId,
                eventKind:
                    evidence.eventKind,
                witnessedBy: [
                    ...evidence
                        .witnessedBy,
                ],
                updatedTurn:
                    evidence.turn,
                updatedClock:
                    evidence.clock,
            },
        );
    }
    edge.activeEmotions = [
        ...activeEmotions.values(),
    ];
}

function deriveRelationshipState(state) {
    const context = state.context;
    const existing =
        context.existingGraph || {};
    const statements = new Map(
        (existing.statements || [])
            .map(statement => [
                statement.id,
                statement,
            ]),
    );
    for (const statement of (
        state.acceptedStatements || []
    )) {
        const previous =
            statements.get(statement.id);
        statements.set(
            statement.id,
            previous
                ? {
                    ...previous,
                    ...statement,
                    firstClock:
                        previous.firstClock ||
                        statement.firstClock,
                    witnessedBy: unique([
                        ...(previous
                            .witnessedBy ||
                        []),
                        ...statement
                            .witnessedBy,
                    ]),
                    sourceMessageIds:
                        unique([
                            ...(previous
                                .sourceMessageIds ||
                            []),
                            ...statement
                                .sourceMessageIds,
                        ]).sort(
                            (left, right) =>
                                left - right,
                        ),
                }
                : statement,
        );
    }

    const relationshipEvidence =
        new Map(
            (
                existing
                    .relationshipEvidence ||
                []
            ).map(evidence => {
                const normalized =
                    selectObjectFields(
                        evidence,
                        PERSISTED_RELATIONSHIP_EVIDENCE_FIELDS,
                    );
                return [
                    normalized.id,
                    normalized,
                ];
            }).filter(([id]) => id),
        );
    const seenEvidenceIds = new Set(
        relationshipEvidence.keys(),
    );
    const newEvidence = (
        state.acceptedEvidence || []
    )
        .sort(compareRelationshipEvidence)
        .filter(evidence => {
            if (
                seenEvidenceIds.has(
                    evidence.id,
                )
            ) {
                return false;
            }
            seenEvidenceIds.add(evidence.id);
            return true;
        });

    const relationships = new Map(
        (existing.relationships || [])
            .map(edge => {
                const normalized =
                    selectObjectFields(
                        edge,
                        PERSISTED_RELATIONSHIP_EDGE_FIELDS,
                    );
                const nextEdge = {
                    ...normalized,
                    activeEmotions:
                        decayActiveEmotions(
                            normalized
                                .activeEmotions,
                            context.turn,
                        ),
                };
                return [
                    `${normalized.sourceActorId}->${normalized.targetActorId}`,
                    nextEdge,
                ];
            })
            .filter(([key]) =>
                !key.includes('undefined')),
    );
    for (const evidence of newEvidence) {
        const key =
            `${evidence.sourceActorId}->${evidence.targetActorId}`;
        const edge = {
            familiarity: 0,
            closeness: 0,
            warmth: 0,
            trust: 0,
            respect: 0,
            influence: 0,
            tension: 0,
            resentment: 0,
            fear: 0,
            protectiveness: 0,
            structuralTags: [],
            activeEmotions: [],
            evidenceIds: [],
            ...relationships.get(key),
            id: stableId(
                'relationship',
                [
                    evidence.sourceActorId,
                    evidence.targetActorId,
                ],
            ),
            sourceActorId:
                evidence.sourceActorId,
            targetActorId:
                evidence.targetActorId,
        };
        const repeatMultiplier =
            getRepeatMultiplier(
                evidence,
                relationshipEvidence,
            );
        const appliedDimensionDeltas =
            (
                evidence
                    .dimensionDeltas ||
                []
            ).map(proposal =>
                applyDimensionDelta(
                    edge,
                    proposal,
                    evidence,
                    repeatMultiplier,
                ));
        const committedEvidence = {
            ...evidence,
            dimensionDeltas:
                appliedDimensionDeltas,
        };
        edge.structuralTags = unique([
            ...(edge.structuralTags || []),
            ...(
                evidence
                    .structuralTags ||
                []
            ),
        ]);
        applyEmotionAppraisals(
            edge,
            committedEvidence,
        );
        edge.evidenceIds = unique([
            ...(edge.evidenceIds || []),
            evidence.id,
        ]).slice(-32);
        edge.updatedTurn = context.turn;
        edge.updatedClock = context.clock;
        relationships.set(key, edge);
        relationshipEvidence.set(
            evidence.id,
            committedEvidence,
        );
    }

    const messageIds = [
        ...context.allowedMessageIds,
    ];
    const existingCursor =
        Number.isInteger(
            existing
                .lastProcessedMessageId,
        )
            ? existing
                .lastProcessedMessageId
            : -1;
    return {
        output: {
            socialGraph: {
                version:
                    SOCIAL_GRAPH_VERSION,
                extractorVersion:
                    SOCIAL_GRAPH_EXTRACTOR_VERSION,
                statements: [
                    ...statements.values(),
                ].slice(-500),
                relationshipEvidence: [
                    ...relationshipEvidence
                        .values(),
                ].slice(-1000),
                relationships: [
                    ...relationships.values(),
                ].slice(-500),
                lastProcessedMessageId:
                    messageIds.length
                        ? Math.max(
                            existingCursor,
                            ...messageIds,
                        )
                        : existingCursor,
                lastRunSceneId:
                    context.sceneId,
                lastRunTurn: context.turn,
                lastRunClock:
                    context.clock,
                backfilledSceneIds:
                    Array.isArray(
                        existing
                            .backfilledSceneIds,
                    )
                        ? existing
                            .backfilledSceneIds
                        : [],
                backfillPendingSceneId:
                    String(
                        existing
                            .backfillPendingSceneId ||
                        '',
                    ),
                status: 'ready',
                error: '',
                lastRunStats: {
                    modelKeys:
                        Object.keys(
                            context
                                .extraction ||
                            {},
                        ),
                    modelStatements:
                        Array.isArray(
                            context
                                .extraction
                                ?.statements,
                        )
                            ? context
                                .extraction
                                .statements
                                .length
                            : 0,
                    modelRelationshipEvidence:
                        Array.isArray(
                            context
                                .extraction
                                ?.relationshipEvidence,
                        )
                            ? context
                                .extraction
                                .relationshipEvidence
                                .length
                            : 0,
                    acceptedStatements:
                        (
                            state
                                .acceptedStatements ||
                            []
                        ).length,
                    acceptedRelationshipEvidence:
                        (
                            state
                                .acceptedEvidence ||
                            []
                        ).length,
                    rejected:
                        (
                            state.rejected ||
                            []
                        ).map(entry =>
                            selectObjectFields(
                                entry,
                                new Set([
                                    'kind',
                                    'reason',
                                    'fields',
                                    'evidenceId',
                                    'dimension',
                                    'value',
                                    'impact',
                                ]),
                            )),
                },
            },
            memoryReviews: Array.isArray(
                context.extraction?.reviews,
            )
                ? context.extraction.reviews
                : [],
            schemaOperations:
                Array.isArray(
                    context.extraction
                        ?.schemaOperations,
                )
                    ? structuredClone(
                        context.extraction
                            .schemaOperations,
                    )
                    : [],
            acceptedStatementIds: (
                state.acceptedStatements ||
                []
            ).map(item => item.id),
            acceptedEvidenceIds: (
                state.acceptedEvidence ||
                []
            ).map(item => item.id),
            rejected:
                state.rejected || [],
        },
    };
}

const socialDirectorGraph =
    new StateGraph(
        SocialDirectorState,
    )
        .addNode(
            'collect_evidence',
            collectEvidence,
        )
        .addNode(
            'validate_extraction',
            validateExtraction,
        )
        .addNode(
            'derive_relationships',
            deriveRelationshipState,
        )
        .addEdge(
            START,
            'collect_evidence',
        )
        .addEdge(
            'collect_evidence',
            'validate_extraction',
        )
        .addEdge(
            'validate_extraction',
            'derive_relationships',
        )
        .addEdge(
            'derive_relationships',
            END,
        )
        .compile();

export async function runSocialDirectorGraph(
    input,
) {
    const result =
        await socialDirectorGraph.invoke(
            { input },
        );
    return result.output;
}
