export const SOCIAL_IDENTITY_CLAIM_SOURCE_KINDS =
    Object.freeze([
        'self',
        'other',
        'authority',
    ]);
export const SOCIAL_RELATIONSHIP_CLAIM_SOURCE_KINDS =
    Object.freeze([
        'self',
        'other',
        'authority',
    ]);
export const SOCIAL_PERSON_REFERENCE_STATUSES =
    Object.freeze([
        'unresolved',
        'resolved',
        'nonexistent',
    ]);
export const SOCIAL_FAMILY_RELATIONSHIP_KINDS =
    Object.freeze([
        'family',
        'parent',
        'child',
        'sibling',
        'brother',
        'sister',
        'guardian',
        'ward',
        'spouse',
        'partner',
        'relative',
        'cousin',
        'grandparent',
        'grandchild',
        'aunt',
        'uncle',
        'niece',
        'nephew',
    ]);

const IDENTITY_SOURCE_KINDS =
    new Set(
        SOCIAL_IDENTITY_CLAIM_SOURCE_KINDS,
    );
const RELATIONSHIP_SOURCE_KINDS =
    new Set(
        SOCIAL_RELATIONSHIP_CLAIM_SOURCE_KINDS,
    );
const IDENTITY_FIELD_ROOTS =
    new Set([
        'gender',
        'birth',
        'education',
        'lineage',
        'body',
    ]);

function text(
    value,
    maximumLength = 500,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function actorId(value) {
    return text(value, 160);
}

function claimValue(value) {
    if (value === undefined) {
        return undefined;
    }
    try {
        return structuredClone(value);
    } catch {
        return undefined;
    }
}

function identityFieldPath(value) {
    const fieldPath =
        text(value, 240)
            .replace(
                /^identity\./u,
                '',
            );
    if (
        !fieldPath ||
        !/^[a-zA-Z0-9_.[\]-]+$/u
            .test(fieldPath)
    ) {
        return '';
    }
    const root =
        fieldPath.split(
            /[.[\]]/u,
        )[0];
    return IDENTITY_FIELD_ROOTS
        .has(root)
        ? fieldPath
        : '';
}

export function normalizeSocialClaimRelationshipKind(
    value,
) {
    return text(value, 80)
        .toLocaleLowerCase()
        .replace(
            /[\s-]+/gu,
            '_',
        )
        .replace(
            /[^a-z0-9_:]+/gu,
            '',
        );
}

function collection(
    values,
    normalizer,
    maximumLength,
) {
    const byId = new Map();
    (
        Array.isArray(values)
            ? values
            : []
    ).forEach(value => {
        const normalized =
            normalizer(value);
        if (normalized) {
            byId.set(
                normalized.id,
                normalized,
            );
        }
    });
    return [
        ...byId.values(),
    ].slice(-maximumLength);
}

export function normalizeSocialIdentityClaim(
    source = {},
) {
    const normalized = {
        id: text(source.id, 200),
        subjectId:
            actorId(source.subjectId),
        fieldPath:
            identityFieldPath(
                source.fieldPath,
            ),
        value:
            claimValue(source.value),
        sourceKind:
            text(
                source.sourceKind,
                40,
            ).toLocaleLowerCase(),
        reportedEventId:
            text(
                source.reportedEventId,
                200,
            ),
        authoritySourceRef:
            text(
                source.authoritySourceRef,
                240,
            ),
    };
    const validKind =
        IDENTITY_SOURCE_KINDS.has(
            normalized.sourceKind,
        );
    const hasSource =
        normalized.sourceKind ===
            'authority'
            ? Boolean(
                normalized
                    .authoritySourceRef,
            )
            : Boolean(
                normalized
                    .reportedEventId,
            );
    return (
        normalized.id &&
        normalized.subjectId &&
        normalized.fieldPath &&
        normalized.value !==
            undefined &&
        validKind &&
        hasSource
    )
        ? normalized
        : null;
}

export function normalizeSocialIdentityClaims(
    values,
) {
    return collection(
        values,
        normalizeSocialIdentityClaim,
        1000,
    );
}

export function normalizeSocialPersonReference(
    source = {},
) {
    const rawStatus =
        text(
            source.status ||
            'unresolved',
            40,
        ).toLocaleLowerCase();
    const status = {
        unresolved:
            'unresolved',
        resolved: 'resolved',
        nonexistent:
            'nonexistent',
        imaginary:
            'nonexistent',
        fabricated:
            'nonexistent',
    }[rawStatus];
    const normalized = {
        id: text(source.id, 200),
        label: text(
            source.label,
            240,
        ),
        status,
        actorId:
            status === 'resolved'
                ? actorId(
                    source.actorId,
                )
                : '',
    };
    return (
        normalized.id &&
        normalized.label &&
        normalized.status &&
        (
            normalized.status !==
                'resolved' ||
            normalized.actorId
        )
    )
        ? normalized
        : null;
}

export function normalizeSocialPersonReferences(
    values,
) {
    return collection(
        values,
        normalizeSocialPersonReference,
        500,
    );
}

export function normalizeSocialRelationshipClaim(
    source = {},
) {
    const normalized = {
        id: text(source.id, 200),
        subjectId:
            actorId(source.subjectId),
        relationshipKind:
            normalizeSocialClaimRelationshipKind(
                source
                    .relationshipKind,
            ),
        targetRefId:
            text(
                source.targetRefId,
                200,
            ),
        sourceKind:
            text(
                source.sourceKind,
                40,
            ).toLocaleLowerCase(),
        reportedEventId:
            text(
                source.reportedEventId,
                200,
            ),
        authoritySourceRef:
            text(
                source.authoritySourceRef,
                240,
            ),
    };
    const validKind =
        RELATIONSHIP_SOURCE_KINDS
            .has(
                normalized
                    .sourceKind,
            );
    const hasEvidence =
        normalized.sourceKind ===
            'authority' ||
        Boolean(
            normalized.reportedEventId,
        );
    return (
        normalized.id &&
        normalized.subjectId &&
        normalized
            .relationshipKind &&
        normalized.targetRefId &&
        validKind &&
        hasEvidence &&
        (
            normalized.sourceKind !==
                'authority' ||
            normalized
                .authoritySourceRef
        )
    )
        ? normalized
        : null;
}

export function normalizeSocialRelationshipClaims(
    values,
) {
    return collection(
        values,
        normalizeSocialRelationshipClaim,
        1000,
    );
}
