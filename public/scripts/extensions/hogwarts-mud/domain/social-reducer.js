import {
    applyMemoryConsolidation,
    validateMemoryConsolidation,
} from './actor-memory-reducer.js';
import {
    normalizeSocialGraph,
    projectActorSocialRelationships,
} from './social-migration.js';

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
    const graph = normalizeSocialGraph(
        result.socialGraph,
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
    let next =
        reviews.length
            ? applyMemoryConsolidation(
                worldState,
                {
                    reviews,
                },
            )
            : structuredClone(
                worldState,
            );
    next.socialGraph =
        normalizeSocialGraph(
            result.socialGraph,
            {
                currentTurn:
                    worldState?.turn?.count,
            },
        );
    const graph = next.socialGraph;
    next.actorLibrary =
        projectActorSocialRelationships(
            next.actorLibrary,
            graph,
        ).map(profile => ({
            ...profile,
            socialStatements:
                graph.statements
                    .filter(statement =>
                        statement.subjectId ===
                            profile.id),
        }));
    return next;
}
