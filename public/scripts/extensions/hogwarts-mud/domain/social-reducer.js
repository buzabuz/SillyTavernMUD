import {
    applyMemoryConsolidation,
    validateMemoryConsolidation,
} from './actor-memory-reducer.js';
import {
    normalizeSocialGraph,
} from './social-migration.js';
import {
    assertActorContextStateV1,
} from './actor-context-runtime.js';
import {
    mergeSocialClaimStores,
    validateSocialClaimGraph,
} from './social-claims-reducer.js';

export function validateSocialDirectorResult(
    result,
    worldState,
    allowedMessageIds = [],
) {
    const errors = [];
    if (
        !result ||
        typeof result !== 'object' ||
        !result.socialGraph
    ) {
        return {
            valid: false,
            errors: [
                '社交导演图缺少输出。',
            ],
        };
    }
    const previousGraph =
        normalizeSocialGraph(
            worldState.socialGraph,
        );
    const sourceGraph =
        mergeSocialClaimStores(
            worldState,
            result.socialGraph,
        );
    const graph = normalizeSocialGraph(
        sourceGraph,
    );
    const actorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const messageIds = new Set(
        (allowedMessageIds || [])
            .map(Number)
            .filter(Number.isInteger),
    );
    const acceptedStatementIds =
        new Set(
            result
                .acceptedStatementIds ||
            [],
        );
    const acceptedEvidenceIds =
        new Set(
            result
                .acceptedEvidenceIds ||
            [],
        );
    const acceptedIdentityClaimIds =
        new Set(
            result
                .acceptedIdentityClaimIds ||
            [],
        );
    const acceptedRelationshipClaimIds =
        new Set(
            result
                .acceptedRelationshipClaimIds ||
            [],
        );
    errors.push(
        ...validateSocialClaimGraph({
            sourceGraph:
                result.socialGraph,
            graph,
            actorIds,
            messageIds,
            acceptedIdentityClaimIds,
            acceptedRelationshipClaimIds,
            previousGraph,
        }),
    );
    const validWitness = id =>
        id === 'player' ||
        actorIds.has(id);
    const validRelationshipEntity = id =>
        id === 'player' ||
        actorIds.has(id);
    for (const statement of (
        graph.statements || []
    )) {
        if (
            !actorIds.has(
                statement.subjectId,
            ) ||
            !actorIds.has(
                statement.speakerId,
            ) ||
            !(
                statement.witnessedBy ||
                []
            ).every(validWitness) ||
            (
                acceptedStatementIds
                    .has(statement.id) &&
                !(
                    statement
                        .sourceMessageIds ||
                    []
                ).every(id =>
                    messageIds.has(
                        Number(id),
                    ))
            )
        ) {
            errors.push(
                `社交声明 ${statement.id || '?'} 引用了未授权来源。`,
            );
        }
    }
    for (const evidence of (
        graph.relationshipEvidence ||
        []
    )) {
        if (
            !validRelationshipEntity(
                evidence
                    .sourceActorId,
            ) ||
            !validRelationshipEntity(
                evidence
                    .targetActorId,
            ) ||
            !(
                evidence.witnessedBy ||
                []
            ).every(validWitness) ||
            (
                acceptedEvidenceIds
                    .has(evidence.id) &&
                !(
                    evidence
                        .sourceMessageIds ||
                    []
                ).every(id =>
                    messageIds.has(
                        Number(id),
                    ))
            )
        ) {
            errors.push(
                `关系证据 ${evidence.id || '?'} 引用了未授权来源。`,
            );
        }
    }
    for (const edge of (
        graph.relationships || []
    )) {
        if (
            !validRelationshipEntity(
                edge.sourceActorId,
            ) ||
            !validRelationshipEntity(
                edge.targetActorId,
            ) ||
            edge.sourceActorId ===
                edge.targetActorId
        ) {
            errors.push(
                `关系边 ${edge.id || '?'} 引用了无效人物。`,
            );
        }
    }
    const memoryValidation =
        validateMemoryConsolidation(
            {
                reviews: Array.isArray(
                    result.memoryReviews,
                )
                    ? result
                        .memoryReviews
                    : [],
                schemaOperations:
                    Array.isArray(
                        result
                            .schemaOperations,
                    )
                        ? result
                            .schemaOperations
                        : [],
            },
            worldState,
        );
    errors.push(
        ...memoryValidation.errors,
    );
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function applySocialDirectorResult(
    worldState,
    result,
    allowedMessageIds = [],
    {
        boundaryGuard = null,
    } = {},
) {
    const validation =
        validateSocialDirectorResult(
            result,
            worldState,
            allowedMessageIds,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    const reviews =
        result.memoryReviews ||
        [];
    const schemaOperations =
        result.schemaOperations ||
        [];
    let next =
        (
            reviews.length ||
            schemaOperations.length ||
            boundaryGuard
        )
            ? applyMemoryConsolidation(
                worldState,
                {
                    reviews,
                    schemaOperations,
                },
                {
                    boundaryGuard,
                },
            )
            : structuredClone(
                worldState,
            );
    const graphSource =
        mergeSocialClaimStores(
            worldState,
            result.socialGraph,
        );
    next.socialGraph =
        normalizeSocialGraph(
            graphSource,
            {
                currentTurn:
                    worldState?.turn?.count,
            },
        );
    return assertActorContextStateV1(
        next,
    );
}
