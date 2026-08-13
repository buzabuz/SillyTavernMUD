import {
    finiteSocialNumber,
    inferSocialEventKind,
    normalizeEmotionAppraisals,
    normalizeSocialDimensionDeltas,
    normalizeSocialRelationshipEdge,
    normalizeSocialRelationshipEvidence,
    normalizeSocialSourceMessageIds,
    normalizeSocialStructuralTags,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
    validateSocialRelationshipEvidenceV3,
} from './social-schema.js';
import {
    normalizeSocialClaimStores,
    reconcileSocialFamilyRelationships,
    sanitizeSocialFamilyEvidence,
} from './social-claims-reducer.js';

function normalizeSocialLastRunStats(value) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return null;
    }
    const normalized = {};
    if (Array.isArray(value.modelKeys)) {
        normalized.modelKeys = [
            ...new Set(
                value.modelKeys
                    .map(String)
                    .filter(Boolean),
            ),
        ];
    }
    for (const key of [
        'modelStatements',
        'modelRelationshipEvidence',
        'acceptedStatements',
        'acceptedRelationshipEvidence',
    ]) {
        if (
            Number.isFinite(
                Number(value[key]),
            )
        ) {
            normalized[key] =
                Number(value[key]);
        }
    }
    if (Array.isArray(value.rejected)) {
        normalized.rejected =
            value.rejected.map(entry => {
                const rejection = {};
                for (const key of [
                    'kind',
                    'reason',
                    'evidenceId',
                    'dimension',
                    'impact',
                ]) {
                    if (entry?.[key]) {
                        rejection[key] =
                            String(entry[key]);
                    }
                }
                if (
                    Array.isArray(
                        entry?.fields,
                    )
                ) {
                    rejection.fields =
                        entry.fields
                            .map(String);
                }
                if (
                    entry?.value !==
                    undefined
                ) {
                    rejection.value =
                        entry.value;
                }
                if (
                    entry?.source &&
                    typeof entry.source ===
                        'object'
                ) {
                    const source = entry.source;
                    rejection.source = {
                        sourceActorId: String(
                            source
                                .sourceActorId ||
                            '',
                        ),
                        targetActorId: String(
                            source
                                .targetActorId ||
                            '',
                        ),
                        sceneId: String(
                            source.sceneId || '',
                        ),
                        eventKind:
                            inferSocialEventKind(
                                source,
                            ),
                        dimensionDeltas:
                            normalizeSocialDimensionDeltas(
                                source
                                    .dimensionDeltas,
                            ),
                        structuralTags:
                            normalizeSocialStructuralTags(
                                source
                                    .structuralTags,
                            ),
                        emotionAppraisals:
                            normalizeEmotionAppraisals(
                                source
                                    .emotionAppraisals,
                                source
                                    .sourceMessageIds,
                            ),
                        summaryEn: String(
                            source.summaryEn ||
                            '',
                        ),
                        summary: String(
                            source.summary ||
                            source.summaryEn ||
                            '',
                        ),
                        witnessedBy: [
                            ...new Set(
                                (
                                    source
                                        .witnessedBy ||
                                    []
                                )
                                    .map(String)
                                    .filter(
                                        Boolean,
                                    ),
                            ),
                        ],
                        sourceMessageIds:
                            normalizeSocialSourceMessageIds(
                                source
                                    .sourceMessageIds,
                            ),
                    };
                }
                return rejection;
            });
    }
    return normalized;
}

export function normalizeSocialGraph(
    value = {},
    {
        currentTurn = null,
    } = {},
) {
    const source =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
            ? value
            : {};
    const {
        identityClaims,
        relationshipClaims,
        personReferences,
    } = normalizeSocialClaimStores(
        source,
        [],
    );
    const relationshipEvidence =
        sanitizeSocialFamilyEvidence(
            (
                Array.isArray(
                    source.relationshipEvidence,
                )
                    ? source
                        .relationshipEvidence
                    : []
            )
                .filter(evidence =>
                    evidence?.id &&
                    evidence?.eventId &&
                    evidence
                        ?.sourceActorId &&
                    evidence
                        ?.targetActorId)
                .map(evidence =>
                    normalizeSocialRelationshipEvidence(
                        evidence,
                    ))
                .slice(-1000),
            relationshipClaims,
            personReferences,
        );
    const relationships =
        reconcileSocialFamilyRelationships(
            (
                Array.isArray(
                    source.relationships,
                )
                    ? source
                        .relationships
                    : []
            )
                .filter(edge =>
                    edge?.id &&
                    edge?.sourceActorId &&
                    edge?.targetActorId)
                .map(edge =>
                    normalizeSocialRelationshipEdge(
                        edge,
                        {
                            relationshipEvidence,
                            currentTurn,
                        },
                    )),
            relationshipClaims,
            personReferences,
        );
    return {
        version: SOCIAL_GRAPH_VERSION,
        extractorVersion: Math.max(
            0,
            finiteSocialNumber(
                source.extractorVersion,
                0,
            ),
        ),
        identityClaims,
        relationshipClaims,
        personReferences,
        relationshipEvidence,
        relationships,
        lastProcessedMessageId:
            Number.isInteger(
                source.lastProcessedMessageId,
            )
                ? source.lastProcessedMessageId
                : -1,
        lastRunSceneId:
            String(
                source.lastRunSceneId ||
                '',
            ),
        lastRunTurn: Math.max(
            0,
            finiteSocialNumber(
                source.lastRunTurn,
                0,
            ),
        ),
        lastRunClock:
            String(
                source.lastRunClock || '',
            ),
        backfilledSceneIds:
            Array.isArray(
                source.backfilledSceneIds,
            )
                ? [...new Set(
                    source
                        .backfilledSceneIds
                        .map(String)
                        .filter(Boolean),
                )].slice(-50)
                : [],
        backfillPendingSceneId:
            String(
                source
                    .backfillPendingSceneId ||
                '',
            ),
        status:
            String(
                source.status || 'idle',
            ),
        error:
            String(source.error || ''),
        lastRunStats:
            normalizeSocialLastRunStats(
                source.lastRunStats,
            ),
    };
}

const SOCIAL_GRAPH_V3_KEYS =
    Object.freeze([
        'version',
        'extractorVersion',
        'identityClaims',
        'relationshipClaims',
        'personReferences',
        'relationshipEvidence',
        'relationships',
        'lastProcessedMessageId',
        'lastRunSceneId',
        'lastRunTurn',
        'lastRunClock',
        'backfilledSceneIds',
        'backfillPendingSceneId',
        'status',
        'error',
        'lastRunStats',
    ]);

export function validateSocialGraphV3(
    value,
    {
        eventKnowledge = [],
        appraisals = [],
    } = {},
) {
    const normalized =
        normalizeSocialGraph(value);
    const errors = [];
    const actualKeys =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
            ? Object.keys(value)
            : [];
    const allowed =
        new Set(SOCIAL_GRAPH_V3_KEYS);
    if (
        value?.version !==
            SOCIAL_GRAPH_VERSION ||
        actualKeys.length !==
            SOCIAL_GRAPH_V3_KEYS.length ||
        actualKeys.some(key =>
            !allowed.has(key)) ||
        Object.hasOwn(
            value || {},
            'statements',
        )
    ) {
        errors.push(
            'Social Graph V3 contract is invalid.',
        );
    }
    const eventById =
        new Map(
            eventKnowledge.map(event => [
                event.eventId,
                event,
            ]),
        );
    for (
        const evidence of Array.isArray(
            value?.relationshipEvidence,
        )
            ? value.relationshipEvidence
            : []
    ) {
        const validation =
            validateSocialRelationshipEvidenceV3(
                evidence,
                {
                    eventKnowledge,
                    appraisals,
                },
            );
        errors.push(...validation.errors);
    }
    const evidenceIds =
        new Set(
            normalized
                .relationshipEvidence
                .map(evidence =>
                    evidence.id),
        );
    if (
        evidenceIds.size !==
        normalized
            .relationshipEvidence
            .length
    ) {
        errors.push(
            'Social Graph V3 has duplicate Evidence IDs.',
        );
    }
    for (
        const edge of normalized
            .relationships
    ) {
        if (
            edge.evidenceIds
                .some(id =>
                    !evidenceIds.has(id))
        ) {
            errors.push(
                `Relationship edge ${edge.id || '?'} cites unknown Evidence.`,
            );
        }
    }
    for (const claim of [
        ...normalized.identityClaims,
        ...normalized.relationshipClaims,
    ]) {
        if (
            claim.sourceKind ===
                'authority'
        ) {
            if (
                !claim.authoritySourceRef ||
                claim.reportedEventId
            ) {
                errors.push(
                    `Authority claim ${claim.id || '?'} has invalid provenance.`,
                );
            }
            continue;
        }
        const event =
            eventById.get(
                claim.reportedEventId,
            );
        const speakerId =
            event?.report?.speakerId;
        if (
            event?.eventKind !==
                'reported' ||
            (
                claim.sourceKind ===
                    'self'
                    ? speakerId !==
                        claim.subjectId
                    : speakerId ===
                        claim.subjectId
            )
        ) {
            errors.push(
                `Social claim ${claim.id || '?'} has invalid reported Event provenance.`,
            );
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        value: normalized,
    };
}

export function projectActorSocialRelationships(
    actorLibrary = [],
) {
    return (
        Array.isArray(actorLibrary)
            ? actorLibrary
            : []
    ).map(profile => {
        const cleaned =
            { ...profile };
        delete cleaned
            .socialStatements;
        delete cleaned
            .socialRelationships;
        return cleaned;
    });
}

export function migrateLoadedSocialGraph(
    value = {},
    {
        chatLength = 0,
        sceneId = '',
        extractorVersion =
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
    } = {},
) {
    const sourceVersion = Math.max(
        1,
        finiteSocialNumber(
            value?.version,
            1,
        ),
    );
    const sourceExtractorVersion =
        Math.max(
            0,
            finiteSocialNumber(
                value?.extractorVersion,
                0,
            ),
        );
    const targetExtractorVersion =
        Math.max(
            0,
            finiteSocialNumber(
                extractorVersion,
                SOCIAL_GRAPH_EXTRACTOR_VERSION,
            ),
        );
    const graph =
        normalizeSocialGraph(
            value,
        );
    const lastMessageId =
        Math.max(
            -1,
            Math.floor(
                Math.max(
                    0,
                    Number(chatLength) || 0,
                ),
            ) - 1,
        );
    const cursorAtTail =
        graph.lastProcessedMessageId >=
        lastMessageId;
    const migrationRequired =
        sourceVersion <
            SOCIAL_GRAPH_VERSION ||
        sourceExtractorVersion <
            targetExtractorVersion;

    if (
        sourceExtractorVersion <
        targetExtractorVersion
    ) {
        graph.extractorVersion =
            targetExtractorVersion;
        if (!cursorAtTail && sceneId) {
            graph.backfillPendingSceneId =
                String(sceneId);
            if (
                graph.status !==
                'running'
            ) {
                graph.status =
                    'pending';
            }
        }
    }
    if (cursorAtTail) {
        graph.backfillPendingSceneId =
            '';
        graph.status = 'ready';
        graph.error = '';
    }

    return {
        graph,
        changed:
            JSON.stringify(value || {}) !==
            JSON.stringify(graph),
        cursorAtTail,
        migrationRequired,
        allowAutomaticModelWork:
            !cursorAtTail &&
            !migrationRequired,
    };
}
