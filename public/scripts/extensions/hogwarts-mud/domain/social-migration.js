import {
    finiteSocialNumber,
    inferSocialEventKind,
    normalizeEmotionAppraisals,
    parseSocialGraphV1MigrationInput,
    normalizeSocialDimensionDeltas,
    normalizeSocialRelationshipEdge,
    normalizeSocialRelationshipEvidence,
    normalizeSocialSourceMessageIds,
    normalizeSocialStructuralTags,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
} from './social-schema.js';

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
    const sourceVersion =
        Math.max(
            1,
            finiteSocialNumber(
                value.version,
                1,
            ),
        );
    const source =
        sourceVersion <
            SOCIAL_GRAPH_VERSION
            ? parseSocialGraphV1MigrationInput(
                value,
            )
            : value;
    const relationshipEvidence = (
        Array.isArray(
            source.relationshipEvidence,
        )
            ? source.relationshipEvidence
            : []
    )
        .filter(evidence =>
            evidence?.id &&
            evidence?.sourceActorId &&
            evidence?.targetActorId)
        .map(evidence =>
            normalizeSocialRelationshipEvidence(
                evidence,
            ))
        .slice(-1000);
    return {
        version: SOCIAL_GRAPH_VERSION,
        extractorVersion: Math.max(
            0,
            finiteSocialNumber(
                source.extractorVersion,
                0,
            ),
        ),
        statements: Array.isArray(
            source.statements,
        )
            ? source.statements
                .filter(statement =>
                    statement?.id &&
                    statement?.subjectId &&
                    statement?.speakerId &&
                    statement?.textEn)
                .map(statement => ({
                    ...statement,
                    witnessedBy: [
                        ...new Set(
                            (
                                Array.isArray(
                                    statement
                                        .witnessedBy,
                                )
                                    ? statement
                                        .witnessedBy
                                    : []
                            )
                                .map(String)
                                .filter(Boolean),
                        ),
                    ],
                }))
                .slice(-500)
            : [],
        relationshipEvidence,
        relationships: Array.isArray(
            source.relationships,
        )
            ? source.relationships
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
                    ))
                .slice(-500)
            : [],
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

export function projectActorSocialRelationships(
    actorLibrary = [],
    graphValue = {},
) {
    const graph =
        normalizeSocialGraph(graphValue);
    return (
        Array.isArray(actorLibrary)
            ? actorLibrary
            : []
    ).map(profile => ({
        ...profile,
        socialRelationships:
            graph.relationships
                .filter(edge =>
                    edge.sourceActorId ===
                        profile.id ||
                    edge.targetActorId ===
                        profile.id),
    }));
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
        normalizeSocialGraph(value);
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
