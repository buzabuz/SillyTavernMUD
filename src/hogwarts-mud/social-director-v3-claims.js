import {
    normalizeSocialIdentityClaim,
    normalizeSocialPersonReference,
    normalizeSocialRelationshipClaim,
} from '../../public/scripts/extensions/hogwarts-mud/domain/social-claims-schema.js';
import {
    normalizeSocialGraph,
} from '../../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    createStableContractId,
} from '../../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';

function normalizeId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .slice(0, 160);
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

function validAttribution(
    claim,
    event,
) {
    return Boolean(
        claim &&
        (
            claim.sourceKind ===
                'self'
                ? event.report
                    .speakerId ===
                    claim.subjectId
                : event.report
                    .speakerId !==
                    claim.subjectId
        ),
    );
}

export function validateReportedClaims(
    input,
    reportedEventByLocalId,
    rejected,
) {
    const existing =
        normalizeSocialGraph(
            input.existingGraph,
        );
    const references =
        new Map(
            existing.personReferences
                .map(reference => [
                    reference.id,
                    reference,
                ]),
        );
    for (const source of (
        input.extraction
            ?.personReferences ||
        []
    )) {
        const reference =
            normalizeSocialPersonReference({
                id:
                    source?.id,
                label:
                    source?.label,
                status:
                    'unresolved',
                actorId: '',
            });
        if (reference) {
            references.set(
                reference.id,
                reference,
            );
        } else {
            reject(
                rejected,
                'person_reference',
                'invalid_reference',
                source,
            );
        }
    }
    const identityClaims =
        new Map(
            existing.identityClaims
                .map(claim => [
                    claim.id,
                    claim,
                ]),
        );
    for (const source of (
        input.extraction
            ?.identityClaims ||
        []
    )) {
        const event =
            reportedEventByLocalId
                .get(
                    normalizeId(
                        source
                            ?.localReportId,
                    ),
                );
        const claim =
            event
                ? normalizeSocialIdentityClaim({
                    id:
                        createStableContractId(
                            'identity_claim',
                            {
                                reportedEventId:
                                    event.eventId,
                                subjectId:
                                    source
                                        ?.subjectId,
                                fieldPath:
                                    source
                                        ?.fieldPath,
                            },
                        ),
                    subjectId:
                        source
                            ?.subjectId,
                    fieldPath:
                        source
                            ?.fieldPath,
                    value:
                        source?.value,
                    sourceKind:
                        source
                            ?.sourceKind,
                    reportedEventId:
                        event.eventId,
                    authoritySourceRef:
                        '',
                })
                : null;
        if (
            validAttribution(
                claim,
                event,
            )
        ) {
            identityClaims.set(
                claim.id,
                claim,
            );
        } else {
            reject(
                rejected,
                'identity_claim',
                'invalid_report_reference',
                source,
            );
        }
    }
    const relationshipClaims =
        new Map(
            existing
                .relationshipClaims
                .map(claim => [
                    claim.id,
                    claim,
                ]),
        );
    for (const source of (
        input.extraction
            ?.relationshipClaims ||
        []
    )) {
        const event =
            reportedEventByLocalId
                .get(
                    normalizeId(
                        source
                            ?.localReportId,
                    ),
                );
        const claim =
            event
                ? normalizeSocialRelationshipClaim({
                    id:
                        createStableContractId(
                            'relationship_claim',
                            {
                                reportedEventId:
                                    event.eventId,
                                subjectId:
                                    source
                                        ?.subjectId,
                                targetRefId:
                                    source
                                        ?.targetRefId,
                            },
                        ),
                    subjectId:
                        source
                            ?.subjectId,
                    relationshipKind:
                        source
                            ?.relationshipKind,
                    targetRefId:
                        source
                            ?.targetRefId,
                    sourceKind:
                        source
                            ?.sourceKind,
                    reportedEventId:
                        event.eventId,
                    authoritySourceRef:
                        '',
                })
                : null;
        if (
            validAttribution(
                claim,
                event,
            ) &&
            references.has(
                claim.targetRefId,
            )
        ) {
            relationshipClaims.set(
                claim.id,
                claim,
            );
        } else {
            reject(
                rejected,
                'relationship_claim',
                'invalid_report_reference',
                source,
            );
        }
    }
    return {
        identityClaims: [
            ...identityClaims.values(),
        ],
        relationshipClaims: [
            ...relationshipClaims
                .values(),
        ],
        personReferences: [
            ...references.values(),
        ],
    };
}
