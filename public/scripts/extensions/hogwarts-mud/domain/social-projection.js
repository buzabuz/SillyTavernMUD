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
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from './localized-view-model.js';

function staticText(
    displayLocale,
    staticKey,
    sourceTextEn,
) {
    return getStaticLocaleText(
        staticKey,
        normalizeDisplayLocale(
            displayLocale,
        ),
    ) ||
        sourceTextEn;
}

function getSocialClosenessStage(
    closeness,
) {
    if (closeness >= 90) {
        return 'lifelong';
    }
    if (closeness >= 70) return 'confidant';
    if (closeness >= 50) return 'close_friend';
    if (closeness >= 35) return 'friend';
    if (closeness >= 20) return 'acquaintance';
    if (closeness >= 10) {
        return 'new_acquaintance';
    }
    return 'none';
}

function getSocialClosenessLabel(
    closeness,
    displayLocale,
) {
    const stage =
        getSocialClosenessStage(
            closeness,
        );
    return staticText(
        displayLocale,
        `ui.relationship.stage.${stage}`,
        stage,
    );
}

export function deriveRelationshipLabels(
    value = {},
    displayLocale =
    'zh-CN',
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
    const edge =
        normalizeSocialRelationshipEdge(
            value,
        );
    const tags = new Set(
        edge.structuralTags,
    );
    const stageCode =
        getSocialClosenessStage(
            edge.closeness,
        );
    const stage =
        getSocialClosenessLabel(
            edge.closeness,
            locale,
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
    const label =
        (
            code,
            sourceTextEn,
        ) =>
            staticText(
                locale,
                `ui.relationship.label.${code}`,
                sourceTextEn,
            );
    const familyLabel =
        label(
            'family',
            'Family',
        );
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
                ? label(
                    'estranged_family',
                    'Estranged family',
                )
                : familyLabel,
        );
    } else if (nemesis) {
        add(
            label(
                'nemesis',
                'Nemesis',
            ),
        );
    } else if (
        edge.closeness >= 35 &&
        estranged
    ) {
        add(
            edge.closeness >= 70
                ? label(
                    'estranged_confidant',
                    'Estranged confidant',
                )
                : edge.closeness >= 50
                    ? label(
                        'estranged_close_friend',
                        'Estranged close friend',
                    )
                    : label(
                        'estranged_friend',
                        'Estranged friend',
                    ),
        );
    } else if (hostile) {
        add(
            label(
                'hostile',
                'Hostile',
            ),
        );
    } else if (
        (
            edge.warmth <= -20 ||
            edge.resentment >= 20
        ) &&
        edge.closeness < 35 &&
        edge.familiarity >= 20
    ) {
        add(
            label(
                'disliked_acquaintance',
                'Disliked acquaintance',
            ),
        );
    } else if (
        awe &&
        tags.has('mentor')
    ) {
        add(
            label(
                'awed_mentor',
                'Awed mentor',
            ),
        );
    } else if (
        awe &&
        tags.has('authority')
    ) {
        add(
            label(
                'awed_authority',
                'Awed authority',
            ),
        );
    } else if (awe) {
        add(
            label(
                'awe',
                'Awe',
            ),
        );
    } else if (
        edge.respect >= 20 &&
        edge.trust <= -20
    ) {
        add(
            label(
                'respect_without_trust',
                'Respect without trust',
            ),
        );
    } else if (edge.fear >= 35) {
        add(
            label(
                'afraid',
                'Afraid',
            ),
        );
    } else {
        add(stage);
    }

    if (
        edge.closeness >= 35 &&
        edge.resentment >= 35
    ) {
        add(
            label(
                'close_with_resentment',
                'Close friend with resentment',
            ),
        );
    }
    if (
        tags.has('family') &&
        labels[0] !==
            familyLabel
    ) {
        add(
            familyLabel,
        );
    }
    if (awe) {
        add(
            label(
                'awe',
                'Awe',
            ),
        );
    }
    if (
        edge.respect >= 20 &&
        edge.trust <= -20
    ) {
        add(
            label(
                'respect_without_trust',
                'Respect without trust',
            ),
        );
    }
    if (
        edge.fear >= 35 &&
        !awe
    ) {
        add(
            label(
                'afraid',
                'Afraid',
            ),
        );
    }
    if (
        !tags.has('family') &&
        stageCode !== 'none' &&
        ![
            label(
                'disliked_acquaintance',
                'Disliked acquaintance',
            ),
            stage,
        ].includes(labels[0])
    ) {
        add(stage);
    }
    if (edge.protectiveness >= 50) {
        add(
            label(
                'protector',
                'Protector',
            ),
        );
    }
    if (tags.has('mentor')) {
        add(
            label(
                'mentor',
                'Mentor',
            ),
        );
    }
    if (tags.has('authority')) {
        add(
            label(
                'authority',
                'Authority',
            ),
        );
    }
    if (tags.has('rivalry')) {
        add(
            label(
                'rival',
                'Rival',
            ),
        );
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
    {
        displayLocale =
        'zh-CN',
    } = {},
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
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
                        locale,
                    );
                projected.stageLabel =
                    getSocialClosenessLabel(
                        projected.closeness,
                        locale,
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
