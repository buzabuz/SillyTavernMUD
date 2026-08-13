export function buildSocialClaimsAudienceProjection(
    graph,
    audienceActorId,
    isVisible,
) {
    const identityClaims =
        graph.identityClaims
            .filter(claim =>
                isVisible(
                    claim,
                    audienceActorId,
                ));
    const relationshipClaims =
        graph.relationshipClaims
            .filter(claim =>
                isVisible(
                    claim,
                    audienceActorId,
                ));
    const visibleRelationshipClaimIds =
        new Set(
            relationshipClaims
                .map(claim => claim.id),
        );
    const visibleReferenceIds =
        new Set(
            relationshipClaims
                .map(claim =>
                    claim.targetRefId),
        );
    const resolvedReferenceIds =
        new Set(
            relationshipClaims
                .filter(claim =>
                    claim.sourceKind ===
                        'authority')
                .map(claim =>
                    claim.targetRefId),
        );
    const personReferences =
        graph.personReferences
            .filter(reference =>
                visibleReferenceIds.has(
                    reference.id,
                ))
            .map(reference => (
                reference.status ===
                    'resolved' &&
                resolvedReferenceIds.has(
                    reference.id,
                )
                    ? {
                        ...reference,
                    }
                    : {
                        id: reference.id,
                        label:
                            reference.label,
                        status:
                            'unresolved',
                        actorId: '',
                    }
            ));
    return {
        identityClaims,
        relationshipClaims,
        personReferences,
        visibleRelationshipClaimIds,
    };
}

export function isSocialFamilyEdgeVisible(
    edge,
    visibleRelationshipClaimIds,
) {
    return (
        edge.relationshipClaimIds ||
        []
    ).some(id =>
        visibleRelationshipClaimIds
            .has(id));
}
