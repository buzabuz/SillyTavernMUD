import {
    createAppraisalId,
    validateAppraisalProposal,
} from '../../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeSocialGraph,
} from '../../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    normalizeSocialEmotionEffects,
    normalizeSocialRelationshipEdge,
    normalizeSocialRelationshipEvidence,
    normalizeSocialStructuralTags,
} from '../../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    createReportedEventKnowledgeId,
    createStableContractId,
    getEventKnowledgeSourceMessageIds,
    normalizeEventKnowledge,
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
    RELATIONSHIP_DIMENSION_RANGES,
    RELATIONSHIP_DIMENSIONS,
    REPEAT_MULTIPLIERS,
    RESENTMENT_HARM_EVENT_KINDS,
    SIGNED_NEGATIVE_DIMENSIONS,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
    STAGE_GATED_CLOSENESS_EVENT_KINDS,
    STRUCTURAL_TAGS,
} from './social-director-contract.js';
import {
    validateReportedClaims,
} from './social-director-v3-claims.js';

const AUDIBLE_WITNESS_BASES =
    new Set([
        'direct',
        'target_audible',
        'target_visual_audible',
        'nearby_audible',
        'nearby_visual_audible',
        'room_audible',
        'room_visual_audible',
        'adjacent_audible',
        'reported',
    ]);

function normalizeId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .slice(0, 160);
}

function normalizeText(
    value,
    maximumLength = 600,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function unique(values) {
    return [
        ...new Set(
            values.filter(Boolean),
        ),
    ];
}

function stableIds(values) {
    return unique(
        (
            Array.isArray(values)
                ? values
                : []
        )
            .map(normalizeId)
            .filter(Boolean),
    ).sort((left, right) =>
        left.localeCompare(
            right,
            'en',
        ));
}

function roundSocialNumber(value) {
    return Math.round(
        (
            Number(value) +
            Number.EPSILON
        ) * 100,
    ) / 100;
}

function clamp(
    value,
    minimum,
    maximum,
) {
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

function exactKeys(
    value,
    keys,
) {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        return false;
    }
    const actual =
        Object.keys(value);
    const allowed =
        new Set(keys);
    return (
        actual.length ===
            keys.length &&
        actual.every(key =>
            allowed.has(key))
    );
}

function speakerCanAccessEvent(
    event,
    speakerId,
) {
    if (!event || !speakerId) {
        return false;
    }
    if (
        event.eventKind ===
            'reported'
    ) {
        return (
            event.report?.speakerId ===
                speakerId ||
            (
                event.report
                    ?.recipientIds ||
                []
            ).includes(speakerId)
        );
    }
    return (
        (
            event
                .participantActorIds ||
            []
        ).includes(speakerId) ||
        (
            event.witnessActorIds ||
            []
        ).includes(speakerId) ||
        (
            speakerId === 'player' &&
            event.knownToPlayer ===
                true
        )
    );
}

function eventActorOptions(input) {
    return {
        actors:
            stableIds(
                input.actorIds,
            ).map(id => ({
                id,
            })),
        knownActorIds:
            stableIds(
                input.actorIds,
            ),
        cohortIds:
            unique(
                (
                    input.eventKnowledge ||
                    []
                ).flatMap(event =>
                    event
                        .witnessCohortIds ||
                    []),
            ),
    };
}

export function validateCommittedEventWitnessInput(
    input = {},
) {
    const errors = [];
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
    const allowed =
        new Set(
            allowedMessageIds,
        );
    const sceneSets =
        new Map(
            allowedMessageIds.map(id => [
                id,
                new Set(),
            ]),
        );
    const witnessSets =
        new Map(
            allowedMessageIds.map(id => [
                id,
                new Set(),
            ]),
        );
    const options =
        eventActorOptions(input);
    for (const event of (
        input.eventKnowledge ||
        []
    )) {
        const validation =
            validateEventKnowledgeContract(
                event,
                {
                    ...options,
                    sourceTexts: [
                        event.perception
                            ?.evidenceText,
                    ],
                },
            );
        if (!validation.valid) {
            errors.push(
                'invalid_event_knowledge_record',
            );
            continue;
        }
        for (
            const messageId of
            getEventKnowledgeSourceMessageIds(
                event,
            )
        ) {
            if (!allowed.has(messageId)) {
                continue;
            }
            sceneSets
                .get(messageId)
                .add(event.sceneId);
            for (const actorId of (
                event.witnessActorIds ||
                []
            )) {
                witnessSets
                    .get(messageId)
                    .add(actorId);
            }
        }
    }
    const messageSceneIds = {};
    const witnessActorIdsByMessageId =
        {};
    for (const messageId of (
        allowedMessageIds
    )) {
        const scenes = [
            ...sceneSets.get(
                messageId,
            ),
        ];
        if (scenes.length !== 1) {
            errors.push(
                'message_event_scene_is_not_unique',
            );
        }
        messageSceneIds[messageId] =
            scenes[0] || '';
        witnessActorIdsByMessageId[
            messageId
        ] = [
            ...witnessSets.get(
                messageId,
            ),
        ].sort();
    }
    return {
        valid:
            errors.length === 0,
        errors,
        eventKnowledge:
            structuredClone(
                input.eventKnowledge ||
                [],
            ),
        messageSceneIds,
        witnessActorIdsByMessageId,
    };
}

function eligibleRecipientsForMessage(
    events,
    messageId,
    speakerId,
) {
    const relevant =
        events.filter(event =>
            getEventKnowledgeSourceMessageIds(
                event,
            ).includes(messageId));
    if (!relevant.length) {
        return [];
    }
    let eligible = null;
    for (const event of relevant) {
        const current =
            new Set(
                Object.entries(
                    event.witnessBasis ||
                    {},
                )
                    .filter(([
                        ,
                        basis,
                    ]) =>
                        AUDIBLE_WITNESS_BASES
                            .has(basis))
                    .map(([actorId]) =>
                        actorId),
            );
        if (
            event.knownToPlayer ===
                true &&
            speakerId !== 'player'
        ) {
            current.add('player');
        }
        current.delete(speakerId);
        eligible = eligible === null
            ? current
            : new Set(
                [...eligible]
                    .filter(id =>
                        current.has(id)),
            );
    }
    return [...(eligible || [])]
        .sort();
}

function sourceSegment(
    evidenceById,
    reference,
) {
    const message =
        evidenceById.get(
            Number(
                reference?.messageId,
            ),
        );
    const segmentIndex =
        Number(
            reference
                ?.segmentIndex,
        );
    if (
        !message ||
        !Number.isInteger(segmentIndex)
    ) {
        return null;
    }
    if (segmentIndex === -1) {
        return message.isUser
            ? {
                message,
                speakerId: 'player',
                text:
                    String(
                        message.text ||
                        '',
                    ),
                historicalEventIds:
                    [],
            }
            : null;
    }
    const segment =
        message.segments
            ?.[segmentIndex];
    if (
        segment?.type !==
            'dialogue' ||
        !segment.actorId
    ) {
        return null;
    }
    return {
        message,
        speakerId:
            segment.actorId,
        text:
            String(
                segment.textEn ||
                '',
            ),
        historicalEventIds:
            unique(
                (
                    segment
                        .historicalClaims ||
                    []
                ).flatMap(claim =>
                    claim
                        .sourceEventIds ||
                    []),
            ),
    };
}

function hasExplicitAudience(
    evidenceText,
    recipientIds,
    actorNames,
) {
    const text =
        normalizeText(
            evidenceText,
        ).toLocaleLowerCase();
    if (!text) return false;
    return recipientIds.every(id => {
        if (
            id === 'player' &&
            /\b(?:you|player|tina)\b/iu
                .test(text)
        ) {
            return true;
        }
        const name =
            actorNames.get(id);
        return (
            text.includes(
                id.toLocaleLowerCase(),
            ) ||
            Boolean(
                name &&
                text.includes(
                    name
                        .toLocaleLowerCase(),
                ),
            )
        );
    });
}

function reject(
    rejected,
    kind,
    reason,
    source,
) {
    rejected.push({
        kind,
        reason,
        source,
    });
}

function validateReportedEvents(
    input,
    prefixMessageIds,
    rejected,
) {
    const events =
        input.eventKnowledge || [];
    const eventById =
        new Map(
            events.map(event => [
                event.eventId,
                event,
            ]),
        );
    const evidenceById =
        new Map(
            (
                input.sceneEvidence ||
                []
            ).map(message => [
                Number(message.id),
                message,
            ]),
        );
    const actorIds =
        new Set([
            ...stableIds(
                input.actorIds,
            ),
            'player',
        ]);
    const actorNames =
        new Map(
            (
                input.actorDirectory ||
                []
            ).map(actor => [
                normalizeId(actor.id),
                normalizeText(
                    actor.nameEn,
                    200,
                ),
            ]),
        );
    const prefix =
        new Set(prefixMessageIds);
    const byLocalId = new Map();
    const byReportKey =
        new Set();
    const committed = [];
    for (const proposal of (
        input.extraction
            ?.reportedEvents ||
        []
    )) {
        const localReportId =
            normalizeId(
                proposal
                    ?.localReportId,
            );
        const refs =
            Array.isArray(
                proposal
                    ?.sourceSegmentRefs,
            )
                ? proposal
                    .sourceSegmentRefs
                : [];
        const segments =
            refs.map(reference =>
                sourceSegment(
                    evidenceById,
                    reference,
                ));
        const messageIds =
            unique(
                refs.map(reference =>
                    Number(
                        reference
                            ?.messageId,
                    )),
            );
        const speakerId =
            normalizeId(
                proposal
                    ?.speakerId,
            );
        const recipientIds =
            stableIds(
                proposal
                    ?.recipientIds,
            );
        const subjectIds =
            stableIds(
                proposal
                    ?.subjectIds,
            );
        const sourceText =
            normalizeText(
                proposal
                    ?.sourceStatementText,
            );
        const audienceText =
            normalizeText(
                proposal
                    ?.audienceEvidenceText,
            );
        const summaryEn =
            normalizeText(
                proposal?.summaryEn,
                600,
            );
        const statementKind =
            [
                'claim',
                'correction',
                'retraction',
            ].includes(
                proposal
                    ?.statementKind,
            )
                ? proposal
                    .statementKind
                : '';
        const aboutEventId =
            normalizeId(
                proposal
                    ?.aboutEventId,
            );
        const parentReportedEventId =
            normalizeId(
                proposal
                    ?.parentReportedEventId,
            );
        const distortionLevel =
            Number(
                proposal
                    ?.distortionLevel,
            );
        const oneMessage =
            messageIds.length === 1 &&
            prefix.has(
                messageIds[0],
            );
        const sourceGrounded =
            segments.length > 0 &&
            segments.every(Boolean) &&
            segments.every(segment =>
                segment.speakerId ===
                    speakerId &&
                segment.text.includes(
                    sourceText,
                ) &&
                (
                    !audienceText ||
                    segment.text.includes(
                        audienceText,
                    )
                ));
        const eligible =
            oneMessage
                ? eligibleRecipientsForMessage(
                    events,
                    messageIds[0],
                    speakerId,
                )
                : [];
        const exactAudience =
            JSON.stringify(
                recipientIds,
            ) ===
            JSON.stringify(
                stableIds(eligible),
            );
        const explicitAudience =
            !exactAudience &&
            hasExplicitAudience(
                audienceText,
                recipientIds,
                actorNames,
            );
        const linkedIds =
            new Set(
                segments
                    .filter(Boolean)
                    .flatMap(segment =>
                        segment
                            .historicalEventIds),
            );
        const aboutEvent =
            aboutEventId
                ? eventById.get(
                    aboutEventId,
                )
                : null;
        const parentEvent =
            parentReportedEventId
                ? eventById.get(
                    parentReportedEventId,
                )
                : null;
        const rolesValid =
            actorIds.has(speakerId) &&
            recipientIds.length > 0 &&
            recipientIds.every(id =>
                actorIds.has(id) &&
                id !== speakerId) &&
            subjectIds.every(id =>
                actorIds.has(id));
        const linksValid =
            (
                !aboutEventId ||
                aboutEvent &&
                speakerCanAccessEvent(
                    aboutEvent,
                    speakerId,
                ) &&
                linkedIds.has(
                    aboutEventId,
                )
            ) &&
            (
                !parentReportedEventId ||
                parentEvent
                    ?.eventKind ===
                    'reported' &&
                speakerCanAccessEvent(
                    parentEvent,
                    speakerId,
                ) &&
                linkedIds.has(
                    parentReportedEventId,
                )
            ) &&
            (
                ![
                    'correction',
                    'retraction',
                ].includes(
                    statementKind,
                ) ||
                parentReportedEventId
            );
        const reportKey = [
            messageIds[0],
            speakerId,
            recipientIds.join(','),
        ].join(':');
        if (
            !localReportId ||
            byLocalId.has(
                localReportId,
            ) ||
            byReportKey.has(reportKey) ||
            !oneMessage ||
            !sourceText ||
            !summaryEn ||
            !sourceGrounded ||
            !rolesValid ||
            !eligible.length ||
            recipientIds.some(id =>
                !eligible.includes(id)) ||
            (
                !exactAudience &&
                !explicitAudience
            ) ||
            !statementKind ||
            !Number.isInteger(
                distortionLevel,
            ) ||
            distortionLevel < 0 ||
            distortionLevel > 3 ||
            !linksValid
        ) {
            reject(
                rejected,
                'reported_event',
                'invalid_report_provenance',
                proposal,
            );
            continue;
        }
        const eventId =
            createReportedEventKnowledgeId({
                sceneId:
                    segments[0]
                        .message
                        .sceneId,
                sourceSegmentRefs:
                    refs,
                speakerId,
                recipientIds,
                statementKind,
                sourceStatementText:
                    sourceText,
            });
        const event =
            normalizeEventKnowledge({
                version: 2,
                eventKind:
                    'reported',
                eventId,
                sceneId:
                    segments[0]
                        .message
                        .sceneId,
                clock:
                    input.clock,
                summaryEn,
                activationSchemaIds:
                    [],
                participantActorIds:
                    stableIds([
                        speakerId,
                        ...recipientIds,
                    ]).filter(id =>
                        id !== 'player'),
                witnessActorIds:
                    stableIds([
                        speakerId,
                        ...recipientIds,
                    ]).filter(id =>
                        id !== 'player'),
                witnessCohortIds:
                    [],
                witnessBasis: {},
                knownToPlayer:
                    speakerId ===
                        'player' ||
                    recipientIds
                        .includes(
                            'player',
                        ),
                source:
                    'social_event_boundary',
                report: {
                    statementKind,
                    sourceSegmentRefs:
                        refs,
                    speakerId,
                    recipientIds,
                    subjectIds,
                    aboutEventId,
                    parentReportedEventId,
                    distortionLevel,
                },
            }, eventActorOptions(input));
        if (!event) {
            reject(
                rejected,
                'reported_event',
                'invalid_report_contract',
                proposal,
            );
            continue;
        }
        byReportKey.add(reportKey);
        byLocalId.set(
            localReportId,
            event,
        );
        committed.push(event);
    }
    return {
        events: committed,
        byLocalId,
    };
}

function validateRecipientAppraisals(
    input,
    reportResult,
    rejected,
) {
    const proposals = [];
    const refs = new Map();
    const records = new Map();
    const events = [
        ...(input.eventKnowledge ||
            []),
        ...reportResult.events,
    ];
    const worldState = {
        clock: input.clock,
        actorLibrary:
            stableIds(
                input.actorIds,
            ).map(id => ({
                id,
            })),
        actors:
            stableIds(
                input.actorIds,
            ).map(id => ({
                id,
            })),
        eventKnowledge: events,
    };
    for (const source of (
        input.extraction
            ?.recipientAppraisals ||
        []
    )) {
        const localReportId =
            normalizeId(
                source
                    ?.localReportId,
            );
        const event =
            reportResult.byLocalId
                .get(localReportId);
        const observerId =
            normalizeId(
                source?.observerId,
            );
        const proposal = {
            observerId,
            targetId:
                normalizeId(
                    source?.targetId,
                ),
            summaryEn:
                normalizeText(
                    source?.summaryEn,
                ),
            sourceEventIds:
                event
                    ? [
                        event.eventId,
                    ]
                    : [],
            activationSchemaIds:
                [],
            derivedSchemaIds: [],
            contextTags:
                stableIds(
                    source
                        ?.contextTags,
                ),
            confidence:
                Number(
                    source
                        ?.confidence,
                ),
            supersedesAppraisalId:
                '',
        };
        const validation =
            event &&
            event.report
                .recipientIds
                .includes(observerId)
                ? validateAppraisalProposal(
                    proposal,
                    worldState,
                )
                : {
                    valid: false,
                };
        if (!validation.valid) {
            reject(
                rejected,
                'recipient_appraisal',
                'invalid_appraisal_provenance',
                source,
            );
            continue;
        }
        proposals.push(proposal);
        const appraisalId =
            createAppraisalId(
                proposal,
            );
        refs.set(
            `${localReportId}:${observerId}`,
            appraisalId,
        );
        records.set(
            appraisalId,
            {
                id: appraisalId,
                observerId:
                    proposal.observerId,
                targetId:
                    proposal.targetId,
                sourceEventIds:
                    proposal
                        .sourceEventIds,
            },
        );
    }
    return {
        proposals,
        refs,
        records,
    };
}

function validateDimensionDeltas(
    values,
    eventKind,
    structuralTags,
    rejected,
) {
    const accepted = [];
    const seen = new Set();
    for (const proposal of (
        Array.isArray(values)
            ? values
            : []
    )) {
        const dimension =
            normalizeId(
                proposal?.dimension,
            );
        const delta =
            Number(proposal?.delta);
        const impact =
            normalizeId(
                proposal?.impact,
            );
        const band =
            IMPACT_BANDS[impact];
        const maximum =
            dimension ===
                'closeness'
                ? impact ===
                    'defining'
                    ? 15
                    : Math.min(
                        10,
                        band
                            ?.maximum ||
                        0,
                    )
                : band?.maximum ||
                    0;
        let valid =
            RELATIONSHIP_DIMENSIONS
                .has(dimension) &&
            Number.isFinite(delta) &&
            delta !== 0 &&
            band &&
            Math.abs(delta) >=
                band.minimum &&
            Math.abs(delta) <=
                maximum &&
            !seen.has(dimension);
        if (
            impact === 'defining' &&
            !DEFINING_EVENT_KINDS
                .has(eventKind)
        ) {
            valid = false;
        }
        if (
            dimension === 'closeness' &&
            delta > 0 &&
            (
                eventKind ===
                    'routine_interaction' ||
                structuralTags
                    .includes(
                        'classmate',
                    ) &&
                NON_BONDING_CLOSENESS_EVENT_KINDS
                    .has(eventKind)
            )
        ) {
            valid = false;
        }
        if (
            dimension ===
                'resentment' &&
            (
                delta < 0 &&
                !ACCEPTED_REPAIR_EVENT_KINDS
                    .has(eventKind) ||
                delta > 0 &&
                !RESENTMENT_HARM_EVENT_KINDS
                    .has(eventKind)
            )
        ) {
            valid = false;
        }
        if (!valid) {
            reject(
                rejected,
                'dimension_delta',
                'invalid_dimension_delta',
                proposal,
            );
            continue;
        }
        seen.add(dimension);
        accepted.push({
            dimension,
            delta,
            impact,
        });
    }
    return accepted;
}

function getRepeatMultiplier(
    receipt,
    existingReceipts,
) {
    const priorCount =
        existingReceipts
            .filter(previous => (
                previous.sourceActorId ===
                    receipt.sourceActorId &&
                previous.targetActorId ===
                    receipt.targetActorId &&
                previous.eventKind ===
                    receipt.eventKind &&
                Number(receipt.turn) -
                    Number(
                        previous.turn,
                    ) >= 0 &&
                Number(receipt.turn) -
                    Number(
                        previous.turn,
                    ) <= 10
            )).length;
    return REPEAT_MULTIPLIERS[
        Math.min(
            priorCount,
            REPEAT_MULTIPLIERS
                .length - 1,
        )
    ];
}

function getClosenessStageCeiling(
    current,
) {
    const threshold =
        CLOSENESS_STAGE_THRESHOLDS
            .find(value =>
                current < value);
    return threshold === undefined
        ? 100
        : roundSocialNumber(
            Math.max(
                current,
                threshold - 0.01,
            ),
        );
}

function applyDimensionDelta(
    edge,
    proposal,
    receipt,
    repeatMultiplier,
) {
    const range =
        RELATIONSHIP_DIMENSION_RANGES[
            proposal.dimension
        ];
    const current =
        clamp(
            edge[
                proposal.dimension
            ],
            range.minimum,
            range.maximum,
        );
    const saturationMultiplier =
        current === 0 ||
        Math.sign(current) !==
            Math.sign(
                proposal.delta,
            )
            ? 1
            : Math.max(
                0.25,
                1 -
                    Math.abs(current) /
                    100,
            );
    const asymmetryMultiplier =
        proposal.delta < 0 &&
        SIGNED_NEGATIVE_DIMENSIONS
            .has(
                proposal.dimension,
            )
            ? receipt.eventKind ===
                    'betrayal' &&
                [
                    'major',
                    'defining',
                ].includes(
                    proposal.impact,
                )
                ? 1.5
                : 1.25
            : 1;
    const maximum =
        proposal.dimension ===
            'closeness'
            ? proposal.impact ===
                'defining'
                ? 15
                : Math.min(
                    10,
                    IMPACT_BANDS[
                        proposal.impact
                    ].maximum,
                )
            : IMPACT_BANDS[
                proposal.impact
            ].maximum;
    const scaled =
        proposal.delta *
        repeatMultiplier *
        saturationMultiplier *
        asymmetryMultiplier;
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
            .has(receipt.eventKind)
            ? getClosenessStageCeiling(
                current,
            )
            : null;
    const next =
        roundSocialNumber(
            clamp(
                stageGateCeiling ===
                    null
                    ? current +
                        capped
                    : Math.min(
                        current +
                            capped,
                        stageGateCeiling,
                    ),
                range.minimum,
                range.maximum,
            ),
        );
    edge[proposal.dimension] =
        next;
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

function decayActiveEmotions(
    values,
    currentTurn,
) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
        .map(value => {
            const elapsed =
                Math.max(
                    0,
                    Number(
                        currentTurn,
                    ) -
                    Number(
                        value
                            .updatedTurn,
                    ),
                );
            const initial =
                Number(
                    value
                        .initialIntensity ??
                    value.intensity,
                );
            const intensity =
                initial -
                elapsed *
                    ACTIVE_EMOTION_DECAY_PER_TURN;
            return (
                EMOTIONS.has(
                    value.emotion,
                ) &&
                intensity > 0
            )
                ? {
                    ...value,
                    initialIntensity:
                        initial,
                    intensity,
                }
                : null;
        })
        .filter(Boolean);
}

function validateRelationshipReceipts(
    input,
    reportResult,
    appraisalResult,
    rejected,
) {
    const existingGraph =
        normalizeSocialGraph(
            input.existingGraph,
            {
                currentTurn:
                    input.turn,
            },
        );
    const allEvents = [
        ...(input.eventKnowledge ||
            []),
        ...reportResult.events,
    ];
    const eventById =
        new Map(
            allEvents.map(event => [
                event.eventId,
                event,
            ]),
        );
    const eventRefs =
        new Map([
            ...allEvents.map(event => [
                event.eventId,
                event.eventId,
            ]),
            ...[
                ...reportResult
                    .byLocalId
                    .entries(),
            ].map(([
                localId,
                event,
            ]) => [
                localId,
                event.eventId,
            ]),
        ]);
    const availableAppraisals =
        new Map(
            [
                ...(
                    input
                        .availableAppraisals ||
                    []
                ).map(appraisal => [
                    appraisal.id,
                    appraisal,
                ]),
                ...appraisalResult
                    .records
                    .entries(),
            ],
        );
    const relationships =
        new Map(
            existingGraph
                .relationships
                .map(edge => [
                    `${edge.sourceActorId}->${edge.targetActorId}`,
                    {
                        ...edge,
                        activeEmotions:
                            decayActiveEmotions(
                                edge
                                    .activeEmotions,
                                input.turn,
                            ),
                    },
                ]),
        );
    const receipts =
        new Map(
            existingGraph
                .relationshipEvidence
                .map(receipt => [
                    receipt.id,
                    receipt,
                ]),
        );
    const acceptedIds = [];
    const structuralRetention =
        new Set();
    const actorIds =
        new Set([
            ...stableIds(
                input.actorIds,
            ),
            'player',
        ]);
    for (const source of (
        input.extraction
            ?.relationshipEvidence ||
        []
    )) {
        if (
            !exactKeys(
                source,
                [
                    ...MODEL_RELATIONSHIP_EVIDENCE_FIELDS,
                ],
            )
        ) {
            reject(
                rejected,
                'relationship_evidence',
                'unknown_contract_field',
                source,
            );
            continue;
        }
        const sourceActorId =
            normalizeId(
                source
                    .sourceActorId,
            );
        const targetActorId =
            normalizeId(
                source
                    .targetActorId,
            );
        const eventId =
            eventRefs.get(
                normalizeId(
                    source.eventRef,
                ),
            );
        const event =
            eventById.get(eventId);
        const eventKind =
            EVENT_KINDS.has(
                source.eventKind,
            )
                ? source.eventKind
                : '';
        const structuralTags =
            normalizeSocialStructuralTags(
                source.structuralTags,
            )
                .filter(tag =>
                    STRUCTURAL_TAGS
                        .has(tag));
        const emotionEffects =
            normalizeSocialEmotionEffects(
                source.emotionEffects,
            );
        let appraisalId =
            normalizeId(
                source.appraisalRef,
            );
        appraisalId =
            appraisalResult.refs.get(
                appraisalId,
            ) ||
            appraisalId;
        const appraisal =
            availableAppraisals.get(
                appraisalId,
            );
        const sourceAuthorized =
            speakerCanAccessEvent(
                event,
                sourceActorId,
            );
        const appraisalValid =
            !appraisalId ||
            (
                appraisal &&
                appraisal.observerId ===
                    sourceActorId &&
                appraisal.targetId ===
                    targetActorId &&
                (
                    appraisal
                        .sourceEventIds ||
                    []
                ).includes(eventId)
            );
        if (
            !actorIds.has(
                sourceActorId,
            ) ||
            !actorIds.has(
                targetActorId,
            ) ||
            sourceActorId ===
                targetActorId ||
            !event ||
            !eventKind ||
            !sourceAuthorized ||
            !appraisalValid
        ) {
            reject(
                rejected,
                'relationship_evidence',
                'invalid_reference',
                source,
            );
            continue;
        }
        const dimensionDeltas =
            validateDimensionDeltas(
                source.dimensionDeltas,
                eventKind,
                structuralTags,
                rejected,
            );
        const id =
            createStableContractId(
                'relation_evidence',
                {
                    sourceActorId,
                    targetActorId,
                    eventKind,
                    eventId,
                },
            );
        if (receipts.has(id)) {
            acceptedIds.push(id);
            continue;
        }
        const key =
            `${sourceActorId}->${targetActorId}`;
        const edge =
            normalizeSocialRelationshipEdge({
                sourceActorId,
                targetActorId,
                ...relationships
                    .get(key),
                id:
                    relationships
                        .get(key)?.id ||
                    createStableContractId(
                        'relationship',
                        {
                            sourceActorId,
                            targetActorId,
                        },
                    ),
                activeEmotions:
                    relationships
                        .get(key)
                        ?.activeEmotions ||
                    [],
            });
        const priorTags =
            new Set(
                edge.structuralTags,
            );
        const repeatMultiplier =
            getRepeatMultiplier(
                {
                    sourceActorId,
                    targetActorId,
                    eventKind,
                    turn:
                        input.turn,
                },
                [
                    ...receipts.values(),
                ],
            );
        const applied =
            dimensionDeltas.map(
                delta =>
                    applyDimensionDelta(
                        edge,
                        delta,
                        {
                            eventKind,
                        },
                        repeatMultiplier,
                    ));
        edge.structuralTags =
            unique([
                ...edge
                    .structuralTags,
                ...structuralTags,
            ]);
        if (
            appraisalId &&
            structuralTags.some(tag =>
                !priorTags.has(tag))
        ) {
            structuralRetention.add(
                appraisalId,
            );
        }
        const emotions =
            new Map(
                (
                    edge.activeEmotions ||
                    []
                ).map(emotion => [
                    emotion.emotion,
                    emotion,
                ]),
            );
        for (const effect of (
            emotionEffects
        )) {
            emotions.set(
                effect.emotion,
                {
                    ...effect,
                    initialIntensity:
                        effect.intensity,
                    sourceEvidenceId:
                        id,
                    eventKind,
                    updatedTurn:
                        input.turn,
                    updatedClock:
                        input.clock,
                },
            );
        }
        edge.activeEmotions = [
            ...emotions.values(),
        ];
        edge.evidenceIds =
            unique([
                ...(
                    edge
                        .evidenceIds ||
                    []
                ),
                id,
            ]).slice(-32);
        edge.updatedTurn =
            input.turn;
        edge.updatedClock =
            input.clock;
        const receipt =
            normalizeSocialRelationshipEvidence({
                id,
                sourceActorId,
                targetActorId,
                eventId,
                appraisalId,
                eventKind,
                dimensionDeltas:
                    applied,
                structuralTags,
                emotionEffects,
                clock:
                    input.clock,
                turn:
                    input.turn,
            });
        relationships.set(
            key,
            edge,
        );
        receipts.set(id, receipt);
        acceptedIds.push(id);
    }
    return {
        relationshipEvidence: [
            ...receipts.values(),
        ].slice(-1000),
        relationships: [
            ...relationships.values(),
        ].slice(-500),
        acceptedIds,
        structuralRetention: [
            ...structuralRetention,
        ],
    };
}

export async function runSocialDirectorGraph(
    input,
) {
    const witnessValidation =
        validateCommittedEventWitnessInput(
            input,
        );
    if (!witnessValidation.valid) {
        throw new TypeError(
            witnessValidation.errors
                .join('; '),
        );
    }
    const allowed =
        unique(
            input.allowedMessageIds
                .map(Number),
        ).sort((left, right) =>
            left - right);
    const processedThroughMessageId =
        Number(
            input.extraction
                ?.processedThroughMessageId,
        );
    const processedIndex =
        allowed.indexOf(
            processedThroughMessageId,
        );
    if (
        processedIndex < 0 ||
        (
            input.extraction
                ?.scanComplete ===
                true &&
            processedIndex !==
                allowed.length - 1
        )
    ) {
        throw new TypeError(
            'processedThroughMessageId is not a complete scan prefix.',
        );
    }
    const prefixMessageIds =
        allowed.slice(
            0,
            processedIndex + 1,
        );
    const rejected = [];
    const reportResult =
        validateReportedEvents(
            input,
            prefixMessageIds,
            rejected,
        );
    const appraisalResult =
        validateRecipientAppraisals(
            input,
            reportResult,
            rejected,
        );
    const receiptResult =
        validateRelationshipReceipts(
            input,
            reportResult,
            appraisalResult,
            rejected,
        );
    const claims =
        validateReportedClaims(
            input,
            reportResult.byLocalId,
            rejected,
        );
    const existing =
        normalizeSocialGraph(
            input.existingGraph,
        );
    const socialGraph =
        normalizeSocialGraph({
            version:
                SOCIAL_GRAPH_VERSION,
            extractorVersion:
                SOCIAL_GRAPH_EXTRACTOR_VERSION,
            ...claims,
            relationshipEvidence:
                receiptResult
                    .relationshipEvidence,
            relationships:
                receiptResult
                    .relationships,
            lastProcessedMessageId:
                Math.max(
                    existing
                        .lastProcessedMessageId,
                    processedThroughMessageId,
                ),
            lastRunSceneId:
                String(
                    input.sceneId ||
                    '',
                ),
            lastRunTurn:
                Number(
                    input.turn,
                ) || 0,
            lastRunClock:
                String(
                    input.clock ||
                    '',
                ),
            backfilledSceneIds:
                existing
                    .backfilledSceneIds,
            backfillPendingSceneId:
                existing
                    .backfillPendingSceneId,
            status: 'ready',
            error: '',
            lastRunStats: {
                processedThroughMessageId,
                scanComplete:
                    input.extraction
                        ?.scanComplete ===
                    true,
                proposedReports:
                    (
                        input.extraction
                            ?.reportedEvents ||
                        []
                    ).length,
                acceptedReports:
                    reportResult
                        .events.length,
                proposedReceipts:
                    (
                        input.extraction
                            ?.relationshipEvidence ||
                        []
                    ).length,
                acceptedReceipts:
                    receiptResult
                        .acceptedIds.length,
                rejectedCount:
                    rejected.length,
            },
        }, {
            currentTurn:
                input.turn,
        });
    return {
        socialGraph,
        reportedEvents:
            reportResult.events,
        recipientAppraisals:
            appraisalResult.proposals,
        memoryReviews:
            Array.isArray(
                input.extraction
                    ?.reviews,
            )
                ? input.extraction
                    .reviews
                : [],
        schemaOperations:
            Array.isArray(
                input.extraction
                    ?.schemaOperations,
            )
                ? structuredClone(
                    input.extraction
                        .schemaOperations,
                )
                : [],
        processedThroughMessageId,
        scanComplete:
            input.extraction
                ?.scanComplete ===
            true,
        acceptedEvidenceIds:
            receiptResult
                .acceptedIds,
        structurallyRetainedAppraisalIds:
            receiptResult
                .structuralRetention,
        rejected,
    };
}
