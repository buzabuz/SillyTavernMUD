import {
    clampSocialDimension,
    finiteSocialNumber,
    normalizeSocialRelationshipEdge,
    normalizeSocialSourceMessageIds,
    normalizeSocialStructuralTags,
    SOCIAL_RELATIONSHIP_DIMENSION_SET,
    SOCIAL_RELATIONSHIP_DIMENSIONS,
} from './social-schema.js';
import {
    normalizeSocialGraph,
} from './social-migration.js';
import {
    buildSocialClaimsAudienceProjection,
    isSocialFamilyEdgeVisible,
} from './social-claims-projection.js';

function getSocialClosenessLabel(
    closeness,
) {
    if (closeness >= 90) {
        return '终身或家庭级纽带';
    }
    if (closeness >= 70) return '知己';
    if (closeness >= 50) return '密友';
    if (closeness >= 35) return '朋友';
    if (closeness >= 20) return '熟人';
    if (closeness >= 10) return '初识';
    return '无关系';
}

export function deriveRelationshipLabels(
    value = {},
) {
    const edge =
        normalizeSocialRelationshipEdge(
            value,
        );
    const tags = new Set(
        edge.structuralTags,
    );
    const stage =
        getSocialClosenessLabel(
            edge.closeness,
        );
    const labels = [];
    const add = label => {
        if (
            label &&
            !labels.includes(label)
        ) {
            labels.push(label);
        }
    };
    const estranged =
        edge.resentment >= 35 ||
        edge.warmth <= -20 ||
        edge.trust <= -20;
    const awe =
        edge.fear >= 35 &&
        edge.respect >= 20;
    const nemesis =
        tags.has('rivalry') &&
        (
            edge.resentment >= 70 ||
            edge.tension >= 70 ||
            edge.warmth <= -50
        );
    const hostile =
        edge.warmth <= -50 ||
        edge.resentment >= 50 ||
        edge.tension >= 70;

    if (tags.has('family')) {
        add(
            estranged
                ? '疏远的亲人'
                : '亲人',
        );
    } else if (nemesis) {
        add('宿敌');
    } else if (
        edge.closeness >= 35 &&
        estranged
    ) {
        add(
            edge.closeness >= 70
                ? '疏远的知己'
                : edge.closeness >= 50
                    ? '疏远的密友'
                    : '疏远的朋友',
        );
    } else if (hostile) {
        add('敌对');
    } else if (
        (
            edge.warmth <= -20 ||
            edge.resentment >= 20
        ) &&
        edge.closeness < 35 &&
        edge.familiarity >= 20
    ) {
        add('反感的熟人');
    } else if (
        awe &&
        tags.has('mentor')
    ) {
        add('敬畏的导师');
    } else if (
        awe &&
        tags.has('authority')
    ) {
        add('敬畏的权威');
    } else if (awe) {
        add('敬畏');
    } else if (
        edge.respect >= 20 &&
        edge.trust <= -20
    ) {
        add('尊敬但不信任');
    } else if (edge.fear >= 35) {
        add('畏惧');
    } else {
        add(stage);
    }

    if (
        edge.closeness >= 35 &&
        edge.resentment >= 35
    ) {
        add('亲近但积怨的朋友');
    }
    if (
        tags.has('family') &&
        labels[0] !== '亲人'
    ) {
        add('亲人');
    }
    if (awe) add('敬畏');
    if (
        edge.respect >= 20 &&
        edge.trust <= -20
    ) {
        add('尊敬但不信任');
    }
    if (
        edge.fear >= 35 &&
        !awe
    ) {
        add('畏惧');
    }
    if (
        !tags.has('family') &&
        stage !== '无关系' &&
        ![
            '反感的熟人',
            stage,
        ].includes(labels[0])
    ) {
        add(stage);
    }
    if (edge.protectiveness >= 50) {
        add('保护者');
    }
    if (tags.has('mentor')) {
        add('导师');
    }
    if (tags.has('authority')) {
        add('权威');
    }
    if (tags.has('rivalry')) {
        add('竞争者');
    }
    return labels;
}

function normalizeSocialAudienceId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim();
}

function getSocialAuthorizedAudienceIds(
    entry,
) {
    return [
        ...new Set(
            [
                entry?.witnessedBy,
                entry?.knownTo,
                entry?.authorizedWitnesses,
                entry?.authorizedAudienceIds,
            ]
                .flatMap(value =>
                    Array.isArray(value)
                        ? value
                        : [])
                .map(
                    normalizeSocialAudienceId,
                )
                .filter(Boolean),
        ),
    ];
}

export function isSocialEntryVisibleToAudience(
    entry,
    audienceActorId,
) {
    const audienceId =
        normalizeSocialAudienceId(
            audienceActorId,
        );
    if (!entry || !audienceId) {
        return false;
    }
    const sourceId =
        normalizeSocialAudienceId(
            entry.sourceActorId ||
            entry.speakerId,
        );
    if (sourceId === audienceId) {
        return true;
    }
    if (
        getSocialAuthorizedAudienceIds(
            entry,
        ).includes(audienceId)
    ) {
        return true;
    }
    return audienceId === 'player' &&
        (
            entry.playerKnown === true ||
            entry.knownToPlayer === true ||
            entry.visibility === 'player'
        );
}

function isEventVisibleToAudience(
    event,
    audienceActorId,
) {
    const audienceId =
        normalizeSocialAudienceId(
            audienceActorId,
        );
    if (!event || !audienceId) {
        return false;
    }
    if (audienceId === 'authority') {
        return true;
    }
    if (
        event.eventKind ===
            'reported'
    ) {
        return (
            event.report?.speakerId ===
                audienceId ||
            (
                event.report
                    ?.recipientIds ||
                []
            ).includes(audienceId)
        );
    }
    return (
        (
            event
                .participantActorIds ||
            []
        ).includes(audienceId) ||
        (
            event.witnessActorIds ||
            []
        ).includes(audienceId) ||
        (
            audienceId === 'player' &&
            event.knownToPlayer ===
                true
        )
    );
}

function isReferenceEntryVisible(
    entry,
    audienceActorId,
    eventsById,
) {
    const eventId =
        entry?.eventId ||
        entry?.reportedEventId ||
        '';
    if (eventId) {
        return isEventVisibleToAudience(
            eventsById.get(eventId),
            audienceActorId,
        );
    }
    if (
        entry?.sourceKind ===
            'authority' &&
        entry?.subjectId ===
            audienceActorId
    ) {
        return true;
    }
    return isSocialEntryVisibleToAudience(
        entry,
        audienceActorId,
    );
}

function getSocialEvidenceOrder(
    evidence,
    fallback,
) {
    const messageId =
        normalizeSocialSourceMessageIds(
            evidence?.sourceMessageIds,
        ).at(-1);
    return finiteSocialNumber(
        evidence?.turn ??
        evidence?.updatedTurn ??
        messageId,
        fallback,
    );
}

function projectSocialDimensionsForAudience(
    edge,
    directionEvidence,
    audienceActorId,
) {
    const dimensions =
        Object.fromEntries(
            SOCIAL_RELATIONSHIP_DIMENSIONS
                .map(dimension => [
                    dimension,
                    clampSocialDimension(
                        dimension,
                        edge[dimension],
                    ),
                ]),
        );
    if (
        edge.sourceActorId ===
        audienceActorId
    ) {
        return dimensions;
    }
    directionEvidence
        .filter(evidence =>
            !isSocialEntryVisibleToAudience(
                evidence,
                audienceActorId,
            ))
        .flatMap(evidence =>
            evidence.dimensionDeltas || [])
        .forEach(proposal => {
            const contribution =
                Number.isFinite(
                    Number(
                        proposal.appliedDelta,
                    ),
                )
                    ? Number(
                        proposal.appliedDelta,
                    )
                    : Number(
                        proposal.delta,
                    );
            if (
                !SOCIAL_RELATIONSHIP_DIMENSION_SET
                    .has(proposal.dimension) ||
                !Number.isFinite(
                    contribution,
                )
            ) {
                return;
            }
            dimensions[proposal.dimension] =
                clampSocialDimension(
                    proposal.dimension,
                    dimensions[
                        proposal.dimension
                    ] -
                    contribution,
                );
        });
    return dimensions;
}

function projectSocialActiveEmotions(
    edge,
    visibleEvidenceIds,
    audienceActorId,
) {
    if (
        edge.sourceActorId ===
        audienceActorId
    ) {
        return edge.activeEmotions;
    }
    return (edge.activeEmotions || [])
        .filter(emotion =>
            visibleEvidenceIds.has(
                emotion.sourceEvidenceId,
            ) ||
            isSocialEntryVisibleToAudience(
                emotion,
                audienceActorId,
            ));
}

export function buildSocialAudienceProjection(
    worldState = {},
    audienceActorId = 'player',
) {
    const audienceId =
        normalizeSocialAudienceId(
            audienceActorId,
        );
    const graph =
        normalizeSocialGraph(
            worldState?.socialGraph,
            {
                currentTurn:
                    worldState?.turn?.count,
            },
        );
    const eventsById =
        new Map(
            (
                worldState
                    ?.eventKnowledge ||
                []
            ).map(event => [
                event.eventId,
                event,
            ]),
        );
    if (!audienceId) {
        return {
            version: graph.version,
            audienceActorId: '',
            identityClaims: [],
            relationshipClaims: [],
            personReferences: [],
            relationshipEvidence: [],
            relationships: [],
        };
    }
    const claimsProjection =
        buildSocialClaimsAudienceProjection(
            graph,
            audienceId,
            (entry, viewerId) =>
                isReferenceEntryVisible(
                    entry,
                    viewerId,
                    eventsById,
                ),
        );
    const directionEvidence =
        new Map();
    graph.relationshipEvidence
        .forEach((evidence, index) => {
            const key =
                `${evidence.sourceActorId}->${evidence.targetActorId}`;
            const values =
                directionEvidence.get(
                    key,
                ) || [];
            values.push({
                ...evidence,
                audienceOrder:
                    getSocialEvidenceOrder(
                        evidence,
                        index,
                    ),
            });
            directionEvidence.set(
                key,
                values,
            );
        });
    const visibleEvidence =
        graph.relationshipEvidence
            .filter(evidence =>
                isReferenceEntryVisible(
                    evidence,
                    audienceId,
                    eventsById,
                ));
    const visibleEvidenceIds =
        new Set(
            visibleEvidence.map(evidence =>
                evidence.id),
        );
    const relationships =
        graph.relationships
            .map(edge => {
                const key =
                    `${edge.sourceActorId}->${edge.targetActorId}`;
                const evidence =
                    directionEvidence.get(
                        key,
                    ) || [];
                const visible =
                    evidence
                        .filter(item =>
                            visibleEvidenceIds
                                .has(item.id))
                        .sort((left, right) =>
                            right.audienceOrder -
                            left.audienceOrder);
                const sourceSelf =
                    edge.sourceActorId ===
                    audienceId;
                const playerTargetMetaView =
                    audienceId ===
                        'player' &&
                    edge.targetActorId ===
                        'player';
                const edgeAuthorized =
                    isSocialEntryVisibleToAudience(
                        edge,
                        audienceId,
                    );
                const visibleFamilyClaim =
                    isSocialFamilyEdgeVisible(
                        edge,
                        claimsProjection
                            .visibleRelationshipClaimIds,
                    );
                const hiddenGeneratedFamily =
                    edge.id.startsWith(
                        'social-family:',
                    ) &&
                    edge.structuralTags
                        .includes(
                            'family',
                        ) &&
                    !visibleFamilyClaim;
                if (
                    hiddenGeneratedFamily ||
                    !sourceSelf &&
                    !playerTargetMetaView &&
                    !edgeAuthorized &&
                    !visible.length
                ) {
                    return null;
                }
                const dimensions =
                    playerTargetMetaView
                        ? Object.fromEntries(
                            SOCIAL_RELATIONSHIP_DIMENSIONS
                                .map(dimension => [
                                    dimension,
                                    clampSocialDimension(
                                        dimension,
                                        edge[
                                            dimension
                                        ],
                                    ),
                                ]),
                        )
                        : projectSocialDimensionsForAudience(
                            edge,
                            evidence,
                            audienceId,
                        );
                const structuralTags =
                    sourceSelf
                        ? edge.structuralTags
                            .filter(tag =>
                                tag !==
                                    'family' ||
                                visibleFamilyClaim)
                        : normalizeSocialStructuralTags(
                            visible.flatMap(item =>
                                item.structuralTags ||
                                []),
                            visibleFamilyClaim
                                ? ['family']
                                : [],
                            !evidence.length &&
                                edgeAuthorized
                                ? edge
                                    .structuralTags
                                    .filter(
                                        tag =>
                                            tag !==
                                                    'family',
                                    )
                                : [],
                        );
                const projected = {
                    ...edge,
                    ...dimensions,
                    structuralTags,
                    evidenceIds:
                        visible.map(item =>
                            item.id),
                    evidence:
                        visible.map(
                            ({
                                audienceOrder,
                                ...item
                            }) => item,
                        ),
                    activeEmotions:
                        projectSocialActiveEmotions(
                            edge,
                            visibleEvidenceIds,
                            audienceId,
                        ),
                    audienceActorId:
                        audienceId,
                    audienceVisible: true,
                };
                projected.latestEvidence =
                    projected.evidence[0] ||
                    null;
                projected.labels =
                    deriveRelationshipLabels(
                        projected,
                    );
                projected.stageLabel =
                    getSocialClosenessLabel(
                        projected.closeness,
                    );
                return projected;
            })
            .filter(Boolean);
    return {
        version: graph.version,
        audienceActorId:
            audienceId,
        identityClaims:
            claimsProjection
                .identityClaims,
        relationshipClaims:
            claimsProjection
                .relationshipClaims,
        personReferences:
            claimsProjection
                .personReferences,
        relationshipEvidence:
            visibleEvidence,
        relationships,
    };
}
