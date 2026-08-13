import {
    normalizeSocialRelationshipEdge,
    normalizeSocialSourceMessageIds,
    normalizeSocialStructuralTags,
} from './social-schema.js';
import {
    SOCIAL_FAMILY_RELATIONSHIP_KINDS,
    normalizeSocialIdentityClaim,
    normalizeSocialIdentityClaims,
    normalizeSocialPersonReference,
    normalizeSocialPersonReferences,
    normalizeSocialRelationshipClaim,
    normalizeSocialRelationshipClaims,
} from './social-claims-schema.js';

const FAMILY_KINDS =
    new Set(
        SOCIAL_FAMILY_RELATIONSHIP_KINDS,
    );

function mergeRecords(
    ...collections
) {
    const byId = new Map();
    collections
        .flatMap(collection =>
            Array.isArray(collection)
                ? collection
                : [])
        .forEach(record => {
            if (record?.id) {
                byId.set(
                    record.id,
                    record,
                );
            }
        });
    return [
        ...byId.values(),
    ];
}

function recordsEqual(
    left,
    right,
) {
    return JSON.stringify(left) ===
        JSON.stringify(right);
}

function statementClock(
    statement,
    embedded,
) {
    return String(
        embedded?.clock ||
        statement?.lastClock ||
        statement?.firstClock ||
        '',
    );
}

function statementClaimBase(
    statement,
    embedded,
) {
    return {
        subjectId:
            embedded.subjectId ||
            statement.subjectId,
        sourceKind:
            embedded.sourceKind ||
            (
                statement.speakerId ===
                statement.subjectId
                    ? 'self'
                    : 'other'
            ),
        speakerId:
            embedded.speakerId ||
            statement.speakerId,
        sourceMessageIds:
            embedded.sourceMessageIds ||
            statement
                .sourceMessageIds,
        witnessedBy:
            embedded.witnessedBy ||
            statement.witnessedBy,
        clock:
            statementClock(
                statement,
                embedded,
            ),
    };
}

function migrateStatementClaims(
    statements,
) {
    const identityClaims = [];
    const relationshipClaims = [];
    const personReferences = [];
    statements.forEach(statement => {
        const identity =
            statement.identityClaim;
        if (
            identity &&
            typeof identity ===
                'object' &&
            !Array.isArray(identity)
        ) {
            const normalized =
                normalizeSocialIdentityClaim({
                    ...identity,
                    ...statementClaimBase(
                        statement,
                        identity,
                    ),
                    id:
                        identity.id ||
                        `${statement.id}:identity`,
                });
            if (normalized) {
                identityClaims.push(
                    normalized,
                );
            }
        }
        const relationship =
            statement
                .relationshipClaim;
        const reference =
            statement.personReference ||
            relationship
                ?.personReference;
        if (
            reference &&
            typeof reference ===
                'object' &&
            !Array.isArray(reference)
        ) {
            const normalized =
                normalizeSocialPersonReference(
                    reference,
                );
            if (normalized) {
                personReferences.push(
                    normalized,
                );
            }
        }
        if (
            relationship &&
            typeof relationship ===
                'object' &&
            !Array.isArray(
                relationship,
            )
        ) {
            const normalized =
                normalizeSocialRelationshipClaim({
                    ...relationship,
                    ...statementClaimBase(
                        statement,
                        relationship,
                    ),
                    id:
                        relationship.id ||
                        `${statement.id}:relationship`,
                });
            if (normalized) {
                relationshipClaims
                    .push(normalized);
            }
        }
    });
    return {
        identityClaims,
        relationshipClaims,
        personReferences,
    };
}

export function normalizeLegacySocialStatements(
    values,
) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
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
        .slice(-500);
}

export function migrateLegacyFamilyEdges(
    value = {},
) {
    const evidenceById =
        new Map(
            (
                Array.isArray(
                    value
                        .relationshipEvidence,
                )
                    ? value
                        .relationshipEvidence
                    : []
            )
                .filter(evidence =>
                    evidence?.id)
                .map(evidence => [
                    String(evidence.id),
                    evidence,
                ]),
        );
    const personReferences = [];
    const relationshipClaims = [];
    (
        Array.isArray(
            value.relationships,
        )
            ? value.relationships
            : []
    ).forEach(edge => {
        const tags =
            normalizeSocialStructuralTags(
                edge?.structuralTags,
                edge?.structureTags,
            );
        if (
            !edge?.sourceActorId ||
            !edge?.targetActorId ||
            edge.sourceActorId ===
                edge.targetActorId ||
            !tags.includes('family')
        ) {
            return;
        }
        const referenceId =
            `legacy-person:${edge.targetActorId}`;
        const evidence = (
            edge.evidenceIds || []
        )
            .map(id =>
                evidenceById.get(
                    String(id),
                ))
            .filter(Boolean);
        personReferences.push({
            id: referenceId,
            label:
                String(
                    edge.targetActorId,
                ),
            status: 'resolved',
            actorId:
                String(
                    edge.targetActorId,
                ),
        });
        relationshipClaims.push({
            id:
                `legacy-family:${edge.id || `${edge.sourceActorId}->${edge.targetActorId}`}`,
            subjectId:
                String(
                    edge.sourceActorId,
                ),
            relationshipKind:
                'family',
            targetRefId:
                referenceId,
            sourceKind:
                'authority',
            speakerId: 'authority',
            sourceMessageIds:
                normalizeSocialSourceMessageIds(
                    evidence.flatMap(
                        item =>
                            item
                                .sourceMessageIds ||
                            [],
                    ),
                ),
            witnessedBy: [
                ...new Set(
                    evidence
                        .flatMap(item =>
                            item
                                .witnessedBy ||
                            [])
                        .map(String)
                        .filter(Boolean),
                ),
            ],
            clock:
                String(
                    edge.updatedClock ||
                    evidence.at(-1)
                        ?.clock ||
                    '',
                ),
        });
    });
    if (
        !personReferences.length &&
        !relationshipClaims.length
    ) {
        return value;
    }
    return {
        ...value,
        personReferences:
            mergeRecords(
                value.personReferences,
                personReferences,
            ),
        relationshipClaims:
            mergeRecords(
                value.relationshipClaims,
                relationshipClaims,
            ),
    };
}

export function normalizeSocialClaimStores(
    source,
    statements,
) {
    const migrated =
        migrateStatementClaims(
            statements,
        );
    return {
        identityClaims:
            normalizeSocialIdentityClaims(
                mergeRecords(
                    source.identityClaims,
                    migrated
                        .identityClaims,
                ),
            ),
        relationshipClaims:
            normalizeSocialRelationshipClaims(
                mergeRecords(
                    source
                        .relationshipClaims,
                    migrated
                        .relationshipClaims,
                ),
            ),
        personReferences:
            normalizeSocialPersonReferences(
                mergeRecords(
                    source
                        .personReferences,
                    migrated
                        .personReferences,
                ),
            ),
    };
}

export function getSocialAuthorityFamilyRelations(
    relationshipClaims,
    personReferences,
) {
    const references =
        new Map(
            personReferences.map(
                reference => [
                    reference.id,
                    reference,
                ],
            ),
        );
    const byDirection =
        new Map();
    relationshipClaims
        .filter(claim =>
            claim.sourceKind ===
                'authority' &&
            FAMILY_KINDS.has(
                claim
                    .relationshipKind,
            ))
        .forEach(claim => {
            const reference =
                references.get(
                    claim.targetRefId,
                );
            if (
                reference?.status !==
                    'resolved' ||
                !reference.actorId ||
                reference.actorId ===
                    claim.subjectId
            ) {
                return;
            }
            const key =
                `${claim.subjectId}->${reference.actorId}`;
            const relation =
                byDirection.get(key) || {
                    sourceActorId:
                        claim.subjectId,
                    targetActorId:
                        reference.actorId,
                    relationshipClaimIds:
                        [],
                    relationshipKinds: [],
                    witnessedBy: [],
                };
            relation
                .relationshipClaimIds
                .push(claim.id);
            if (
                !relation
                    .relationshipKinds
                    .includes(
                        claim
                            .relationshipKind,
                    )
            ) {
                relation
                    .relationshipKinds
                    .push(
                        claim
                            .relationshipKind,
                    );
            }
            relation.witnessedBy = [
                ...new Set([
                    ...relation
                        .witnessedBy,
                    ...claim.witnessedBy,
                ]),
            ];
            byDirection.set(
                key,
                relation,
            );
        });
    return [
        ...byDirection.values(),
    ];
}

export function sanitizeSocialFamilyEvidence(
    relationshipEvidence,
    relationshipClaims,
    personReferences,
) {
    const directions =
        new Set(
            getSocialAuthorityFamilyRelations(
                relationshipClaims,
                personReferences,
            ).map(relation =>
                `${relation.sourceActorId}->${relation.targetActorId}`),
        );
    return relationshipEvidence
        .map(evidence => ({
            ...evidence,
            structuralTags:
                evidence
                    .structuralTags
                    .filter(tag =>
                        tag !== 'family' ||
                        directions.has(
                            `${evidence.sourceActorId}->${evidence.targetActorId}`,
                        )),
        }));
}

export function reconcileSocialFamilyRelationships(
    relationships,
    relationshipClaims,
    personReferences,
) {
    const authority =
        getSocialAuthorityFamilyRelations(
            relationshipClaims,
            personReferences,
        );
    const byDirection =
        new Map(
            authority.map(relation => [
                `${relation.sourceActorId}->${relation.targetActorId}`,
                relation,
            ]),
        );
    const present = new Set();
    const reconciled =
        relationships.map(edge => {
            const key =
                `${edge.sourceActorId}->${edge.targetActorId}`;
            const relation =
                byDirection.get(key);
            present.add(key);
            return normalizeSocialRelationshipEdge({
                ...edge,
                structuralTags:
                    normalizeSocialStructuralTags(
                        (
                            edge
                                .structuralTags ||
                            []
                        ).filter(tag =>
                            tag !==
                                'family'),
                        relation
                            ? ['family']
                            : [],
                    ),
                relationshipClaimIds:
                    relation
                        ?.relationshipClaimIds ||
                    [],
                relationshipKinds:
                    relation
                        ?.relationshipKinds ||
                    [],
                witnessedBy:
                    relation
                        ? [
                            ...new Set([
                                ...(
                                    edge
                                        .witnessedBy ||
                                    []
                                ),
                                ...relation
                                    .witnessedBy,
                            ]),
                        ]
                        : edge.witnessedBy,
            });
        });
    authority
        .filter(relation =>
            !present.has(
                `${relation.sourceActorId}->${relation.targetActorId}`,
            ))
        .forEach(relation => {
            reconciled.push(
                normalizeSocialRelationshipEdge({
                    id:
                        `social-family:${relation.sourceActorId}->${relation.targetActorId}`,
                    sourceActorId:
                        relation
                            .sourceActorId,
                    targetActorId:
                        relation
                            .targetActorId,
                    structuralTags: [
                        'family',
                    ],
                    relationshipClaimIds:
                        relation
                            .relationshipClaimIds,
                    relationshipKinds:
                        relation
                            .relationshipKinds,
                    witnessedBy:
                        relation
                            .witnessedBy,
                }),
            );
        });
    return reconciled.slice(-500);
}

export function mergeSocialClaimStores(
    worldState,
    graphValue,
) {
    const previous =
        worldState?.socialGraph || {};
    const incoming =
        graphValue || {};
    const next = {
        ...incoming,
    };
    for (const key of [
        'identityClaims',
        'relationshipClaims',
        'personReferences',
    ]) {
        next[key] =
            Object.hasOwn(
                incoming,
                key,
            )
                ? mergeRecords(
                    previous[key],
                    incoming[key],
                )
                : previous[key] || [];
    }
    return next;
}

function validateRawRecords(
    sourceGraph,
    errors,
) {
    const definitions = [
        [
            'identityClaims',
            '身份声明',
            normalizeSocialIdentityClaim,
        ],
        [
            'relationshipClaims',
            '关系声明',
            normalizeSocialRelationshipClaim,
        ],
        [
            'personReferences',
            '人物引用',
            normalizeSocialPersonReference,
        ],
    ];
    definitions.forEach(
        ([
            key,
            label,
            normalizer,
        ]) => {
            if (
                !Object.hasOwn(
                    sourceGraph,
                    key,
                )
            ) {
                return;
            }
            if (
                !Array.isArray(
                    sourceGraph[key],
                )
            ) {
                errors.push(
                    `${label}列表格式无效。`,
                );
                return;
            }
            sourceGraph[key]
                .forEach(entry => {
                    if (!normalizer(entry)) {
                        errors.push(
                            `${label} ${entry?.id || '?'} 格式或权限无效。`,
                        );
                    }
                });
        },
    );
}

function hasAllowedMessages(
    entry,
    messageIds,
) {
    return (
        entry.sourceMessageIds
            .length > 0 &&
        entry.sourceMessageIds
            .every(id =>
                messageIds.has(
                    Number(id),
                ))
    );
}

export function validateSocialClaimGraph({
    sourceGraph,
    graph,
    actorIds,
    messageIds,
    acceptedIdentityClaimIds,
    acceptedRelationshipClaimIds,
    previousGraph = {},
}) {
    const errors = [];
    validateRawRecords(
        sourceGraph,
        errors,
    );
    const validEntity = id =>
        id === 'player' ||
        actorIds.has(id);
    const validWitness = validEntity;
    const validSpeaker = id =>
        validEntity(id) ||
        id === 'authority' ||
        id === 'migration';
    const previousReferences =
        new Map(
            (
                previousGraph
                    .personReferences ||
                []
            ).map(reference => [
                reference.id,
                reference,
            ]),
        );
    const previousIdentityClaims =
        new Map(
            (
                previousGraph
                    .identityClaims ||
                []
            ).map(claim => [
                claim.id,
                claim,
            ]),
        );
    const previousRelationshipClaims =
        new Map(
            (
                previousGraph
                    .relationshipClaims ||
                []
            ).map(claim => [
                claim.id,
                claim,
            ]),
        );
    const references =
        new Map(
            graph.personReferences
                .map(reference => [
                    reference.id,
                    reference,
                ]),
        );
    graph.personReferences
        .forEach(reference => {
            const previous =
                previousReferences.get(
                    reference.id,
                );
            if (
                reference.status ===
                    'resolved' &&
                !validEntity(
                    reference.actorId,
                )
            ) {
                errors.push(
                    `人物引用 ${reference.id} 未绑定现有人物。`,
                );
            }
            if (
                !previous &&
                reference.status !==
                    'unresolved'
            ) {
                errors.push(
                    `人物引用 ${reference.id} 的 resolution 只能由权威 Reducer 写入。`,
                );
            } else if (
                previous &&
                !recordsEqual(
                    previous,
                    reference,
                )
            ) {
                errors.push(
                    `人物引用 ${reference.id} 的既有 resolution 不得由社交导演覆盖。`,
                );
            }
        });
    graph.identityClaims
        .forEach(claim => {
            const previous =
                previousIdentityClaims
                    .get(claim.id);
            const persisted =
                previous &&
                recordsEqual(
                    previous,
                    claim,
                );
            if (
                !validEntity(
                    claim.subjectId,
                ) ||
                !validSpeaker(
                    claim.speakerId,
                ) ||
                !claim.witnessedBy
                    .every(
                        validWitness,
                    )
            ) {
                errors.push(
                    `身份声明 ${claim.id} 引用了未授权来源。`,
                );
            }
            if (
                previous &&
                !persisted
            ) {
                errors.push(
                    `身份声明 ${claim.id} 不得覆盖既有声明。`,
                );
            } else if (
                !persisted &&
                (
                    !acceptedIdentityClaimIds
                        .has(claim.id) ||
                    !claim.clock ||
                    !hasAllowedMessages(
                        claim,
                        messageIds,
                    )
                )
            ) {
                errors.push(
                    `身份声明 ${claim.id} 未通过本批证据授权。`,
                );
            }
        });
    graph.relationshipClaims
        .forEach(claim => {
            const reference =
                references.get(
                    claim.targetRefId,
                );
            const previous =
                previousRelationshipClaims
                    .get(claim.id);
            const persisted =
                previous &&
                recordsEqual(
                    previous,
                    claim,
                );
            if (
                !validEntity(
                    claim.subjectId,
                ) ||
                !validSpeaker(
                    claim.speakerId,
                ) ||
                !reference ||
                !claim.witnessedBy
                    .every(
                        validWitness,
                    ) ||
                (
                    reference.status ===
                        'resolved' &&
                    !validEntity(
                        reference.actorId,
                    )
                )
            ) {
                errors.push(
                    `关系声明 ${claim.id} 引用了未授权来源。`,
                );
            }
            if (
                previous &&
                !persisted
            ) {
                errors.push(
                    `关系声明 ${claim.id} 不得覆盖既有声明。`,
                );
            } else if (
                !persisted &&
                (
                    claim.sourceKind ===
                        'authority' ||
                    !acceptedRelationshipClaimIds
                        .has(claim.id) ||
                    !claim.clock ||
                    !hasAllowedMessages(
                        claim,
                        messageIds,
                    )
                )
            ) {
                errors.push(
                    `关系声明 ${claim.id} 未通过本批证据授权。`,
                );
            }
        });
    return errors;
}
