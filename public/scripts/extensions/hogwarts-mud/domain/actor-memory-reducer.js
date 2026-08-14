import {
    normalizeActorMemoryProfile,
    SHARED_MEMORY_TIERS,
} from './actor-memory.js';
import {
    addActorMemoryRefV1,
    assertActorContextStateV1,
    removeActorMemoryRefsV1,
} from './actor-context-runtime.js';

import {
    applyAppraisalProposals,
    applyPersonSchemaOperations,
} from './memory-synapse-reducer.js';
import {
    createAppraisalId,
} from './memory-synapse-schema.js';
import {
    validateSocialGraphV3,
} from './social-migration.js';
import {
    isStateRevisionCurrentOrModelTaskRuntimeOnly,
} from './save-revision.js';

export function getActorMemoryEntries(profile) {
    const normalized =
        normalizeActorMemoryProfile(profile);
    return SHARED_MEMORY_TIERS.flatMap(tier =>
        normalized.sharedMemories[tier].map(memory => ({
            ...memory,
            tier,
        })));
}

function getActorMemoryRefs(
    worldState,
    actorId,
) {
    const entry =
        worldState
            ?.actorMemoryIndex
            ?.byActorId
            ?.[actorId];
    return [
        'core',
        'recent',
        'everyday',
    ].flatMap(tier =>
        (entry?.[tier] || [])
            .map(reference => ({
                ...reference,
                id:
                    reference.recordId,
                tier,
            })));
}

function getBoundaryId(
    boundary,
) {
    return String(
        boundary?.boundaryId ||
        boundary?.id ||
        '',
    ).trim();
}

export function captureMemoryBoundaryGuard(
    worldState,
) {
    return {
        timelineEpoch:
            String(
                worldState
                    ?.timelineEpoch ||
                '',
            ),
        stateRevision:
            Math.max(
                0,
                Number(
                    worldState
                        ?.stateRevision,
                ) || 0,
            ),
        turn:
            Math.max(
                0,
                Number(
                    worldState
                        ?.turn
                        ?.count,
                ) || 0,
            ),
        sceneId:
            String(
                worldState
                    ?.scene
                    ?.id ||
                '',
            ),
        clock:
            String(
                worldState?.clock ||
                '',
            ),
        boundaryId:
            getBoundaryId(
                worldState
                    ?.memoryDirector
                    ?.pendingEventBoundary,
            ),
    };
}

export function isMemoryBoundaryGuardCurrent(
    worldState,
    guard,
) {
    if (!guard) return true;
    const current =
        captureMemoryBoundaryGuard(
            worldState,
        );
    return Boolean(
        guard.boundaryId &&
        current.timelineEpoch ===
            guard.timelineEpoch &&
        isStateRevisionCurrentOrModelTaskRuntimeOnly(
            worldState,
            guard.stateRevision,
        ) &&
        current.turn ===
            guard.turn &&
        current.sceneId ===
            guard.sceneId &&
        current.clock ===
            guard.clock &&
        current.boundaryId ===
            guard.boundaryId &&
        worldState
            ?.memoryDirector
            ?.pendingEventBoundary
            ?.status ===
            'pending',
    );
}

export function analyzeMemoryConsolidation(
    worldState,
) {
    const totalTurns = Math.max(
        0,
        Number(worldState?.turn?.count || 0),
    );
    const director = worldState?.memoryDirector || {};
    const lastReviewedTurn = Math.max(
        0,
        Number(director.lastReviewedTurn || 0),
    );
    const eventBoundary =
        director
            .pendingEventBoundary ||
        null;
    const minimumReviewTurns =
        Math.max(
            10,
            Number(
                director
                    .minimumReviewTurns ||
                10,
            ),
        );
    const boundaryTurn = Math.max(
        0,
        Number(
            eventBoundary?.turn ||
            0,
        ),
    );
    const boundaryTurnsSinceReview =
        boundaryTurn -
        lastReviewedTurn;
    const actors =
        (worldState?.actorLibrary || [])
            .map(profile => {
                const entry =
                worldState
                    ?.actorMemoryIndex
                    ?.byActorId
                    ?.[profile.id] ||
                {};
                const everydayCount =
                (entry.everyday || [])
                    .length;
                const recentCount =
                (entry.recent || [])
                    .length;
                const changedCount =
                boundaryTurn >
                    lastReviewedTurn
                    ? everydayCount +
                        recentCount
                    : 0;
                return {
                    id: profile.id,
                    everydayCount,
                    recentCount,
                    pendingCount:
                    everydayCount + recentCount,
                    changedCount,
                };
            })
            .filter(actor => actor.pendingCount > 0);
    const pendingCount = actors.reduce(
        (sum, actor) => sum + actor.pendingCount,
        0,
    );
    const changedActorIds = actors
        .filter(actor => actor.changedCount > 0)
        .map(actor => actor.id);
    return {
        shouldReview:
            worldState?.phase === 'playing' &&
            eventBoundary?.status ===
                'pending' &&
            (
                !eventBoundary.sceneId ||
                eventBoundary.sceneId ===
                    worldState.scene?.id ||
                eventBoundary
                    .carriedToSceneId ===
                    worldState.scene?.id
            ) &&
            boundaryTurnsSinceReview >=
                minimumReviewTurns &&
            changedActorIds.length > 0,
        totalTurns,
        lastReviewedTurn,
        triggerMode:
            'event_boundary',
        minimumReviewTurns,
        boundaryTurn,
        boundaryTurnsSinceReview,
        eventBoundary,
        pendingCount,
        changedActorIds,
        actors,
    };
}

export function validateMemoryConsolidation(
    payload,
    worldState,
) {
    const errors = [];
    if (!payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)) {
        return {
            valid: false,
            errors: ['共同记忆整理包必须是对象。'],
        };
    }
    const reviews = Array.isArray(payload.reviews)
        ? payload.reviews
        : [];
    if (reviews.length > 8) {
        errors.push('共同记忆整理最多包含 8 个人物。');
    }
    const profiles = new Set(
        (worldState?.actorLibrary || []).map(profile => [
            profile.id,
        ]).flat(),
    );
    const reviewedIds = new Set();
    reviews.forEach(review => {
        if (
            !profiles.has(review.id) ||
            reviewedIds.has(review.id)
        ) {
            errors.push(
                `共同记忆整理人物 ${review.id || '?'} 不存在或重复。`,
            );
            return;
        }
        reviewedIds.add(review.id);
        const reviewKeys =
            Object.keys(review);
        if (
            reviewKeys.length !== 2 ||
            reviewKeys.some(key =>
                ![
                    'id',
                    'operations',
                ].includes(key))
        ) {
            errors.push(
                `人物 ${review.id} 的整理包含未授权字段。`,
            );
        }
        const operations = Array.isArray(review.operations)
            ? review.operations
            : [];
        if (!operations.length) {
            errors.push(
                `人物 ${review.id} 的整理没有任何变化。`,
            );
        }
        if (operations.length > 4) {
            errors.push(
                `人物 ${review.id} 一次最多执行 4 条记忆整理。`,
            );
        }
        const entries = new Map(
            getActorMemoryRefs(
                worldState,
                review.id,
            ).map(memory => [
                memory.id,
                memory,
            ]),
        );
        const usedSourceIds = new Set();
        operations.forEach(operation => {
            const sourceIds = Array.isArray(
                operation.sourceIds,
            )
                ? operation.sourceIds
                : [];
            if (!sourceIds.length || sourceIds.length > 4) {
                errors.push(
                    `人物 ${review.id} 的记忆整理必须引用 1–4 条来源。`,
                );
            }
            const sources = sourceIds
                .map(id => entries.get(id))
                .filter(Boolean);
            if (sources.length !== sourceIds.length ||
                sources.some(source =>
                    source.recordType !==
                        'appraisal') ||
                sourceIds.some(id => usedSourceIds.has(id))) {
                errors.push(
                    `人物 ${review.id} 的记忆来源必须是未重复使用的 AppraisalRef。`,
                );
            }
            sourceIds.forEach(id =>
                usedSourceIds.add(id));
            if (![
                'core',
                'recent',
                'forget',
            ].includes(operation.targetTier)) {
                errors.push(
                    `人物 ${review.id} 的记忆目标层级无效。`,
                );
            }
            if (operation.targetTier === 'core' &&
                !sources.some(source =>
                    ['core', 'recent'].includes(
                        source.tier,
                    ))) {
                errors.push(
                    `人物 ${review.id} 的深刻记忆必须来自近期大事或已有深刻记忆。`,
                );
            }
            if (operation.targetTier === 'recent' &&
                sources.some(source =>
                    source.tier === 'core')) {
                errors.push(
                    `人物 ${review.id} 的深刻记忆不能降级为近期大事。`,
                );
            }
            if (operation.targetTier === 'forget' &&
                sources.some(source =>
                    source.tier === 'core')) {
                errors.push(
                    `人物 ${review.id} 的深刻记忆不能直接遗忘。`,
                );
            }
            if (operation.targetTier !== 'forget') {
                const summary = String(
                    operation.summaryEn || '',
                ).trim();
                const wordCount = summary
                    .split(/\s+/)
                    .filter(Boolean)
                    .length;
                const maxWords =
                    operation.targetTier ===
                        'recent'
                        ? 32
                        : 40;
                if (!summary ||
                    wordCount > maxWords) {
                    errors.push(
                        `人物 ${review.id} 的整理摘要必须具体且不超过 ${maxWords} 词。`,
                    );
                }
            }
            const unauthorizedKeys =
                Object.keys(operation).filter(key =>
                    ![
                        'sourceIds',
                        'targetTier',
                        'summaryEn',
                        'summary',
                    ].includes(key));
            if (unauthorizedKeys.length) {
                errors.push(
                    `共同记忆整理包含未授权字段：${unauthorizedKeys.join(', ')}。`,
                );
            }
        });
    });
    const schemaOperations =
        Array.isArray(
            payload.schemaOperations,
        )
            ? payload.schemaOperations
            : [];
    if (schemaOperations.length > 32) {
        errors.push(
            '人物图式整理最多包含 32 条操作。',
        );
    } else if (schemaOperations.length) {
        try {
            applyPersonSchemaOperations(
                worldState,
                schemaOperations,
            );
        } catch (error) {
            errors.push(
                String(
                    error?.message ||
                    error,
                ),
            );
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function normalizeMemoryConsolidationPayload(
    payload,
    worldState,
) {
    const normalized =
        structuredClone(
            payload &&
            typeof payload === 'object'
                ? payload
                : {},
        );
    const reviewedIds = new Set();
    normalized.reviews = (
        Array.isArray(normalized.reviews)
            ? normalized.reviews
            : []
    ).filter(review => {
        if (
            reviewedIds.has(review?.id) ||
            !validateMemoryConsolidation(
                { reviews: [review] },
                worldState,
            ).valid
        ) {
            return false;
        }
        reviewedIds.add(review.id);
        return true;
    });
    for (const field of [
        'reportedEvents',
        'recipientAppraisals',
        'identityClaims',
        'relationshipClaims',
        'personReferences',
        'relationshipEvidence',
    ]) {
        normalized[field] =
            Array.isArray(
                normalized[field],
            )
                ? normalized[field]
                : [];
    }
    normalized.schemaOperations =
        Array.isArray(
            normalized
                .schemaOperations,
        )
            ? normalized
                .schemaOperations
            : [];
    return normalized;
}

function getProtectedAppraisalIds(
    state,
) {
    const protectedIds =
        new Set();
    for (const entry of Object.values(
        state.actorMemoryIndex
            ?.byActorId ||
        {},
    )) {
        if (entry.firstImpressionRef) {
            protectedIds.add(
                entry.firstImpressionRef,
            );
        }
        for (const tier of [
            'core',
            'recent',
            'everyday',
        ]) {
            for (const reference of (
                entry[tier] || []
            )) {
                if (
                    reference.recordType ===
                        'appraisal'
                ) {
                    protectedIds.add(
                        reference.recordId,
                    );
                }
            }
        }
    }
    for (const schema of (
        state.memorySynapse
            ?.personSchemas ||
        []
    )) {
        for (const appraisalId of [
            ...(schema
                .supportAppraisalIds ||
                []),
            ...(schema
                .counterAppraisalIds ||
                []),
        ]) {
            protectedIds.add(
                appraisalId,
            );
        }
    }
    for (const appraisal of (
        state.memorySynapse
            ?.appraisals ||
        []
    )) {
        if (
            appraisal
                .supersedesAppraisalId ||
            appraisal.supersededById
        ) {
            protectedIds.add(
                appraisal.id,
            );
            if (
                appraisal
                    .supersedesAppraisalId
            ) {
                protectedIds.add(
                    appraisal
                        .supersedesAppraisalId,
                );
            }
            if (appraisal.supersededById) {
                protectedIds.add(
                    appraisal
                        .supersededById,
                );
            }
        }
    }
    return protectedIds;
}

function createMergedAppraisalProposal(
    state,
    actorId,
    operation,
) {
    const byId =
        new Map(
            (
                state.memorySynapse
                    ?.appraisals ||
                []
            ).map(appraisal => [
                appraisal.id,
                appraisal,
            ]),
        );
    const sources =
        operation.sourceIds
            .map(id =>
                byId.get(id));
    if (
        sources.some(source =>
            !source) ||
        sources.some(source =>
            source.observerId !==
                actorId) ||
        new Set(
            sources.map(source =>
                source.targetId),
        ).size !== 1
    ) {
        throw new TypeError(
            `Memory consolidation for ${actorId} has incompatible Appraisal sources.`,
        );
    }
    return {
        observerId: actorId,
        targetId:
            sources[0].targetId,
        summaryEn:
            operation.summaryEn,
        sourceEventIds: [
            ...new Set(
                sources.flatMap(
                    source =>
                        source
                            .sourceEventIds ||
                        [],
                ),
            ),
        ].sort(),
        activationSchemaIds: [
            ...new Set(
                sources.flatMap(
                    source =>
                        source
                            .activationSchemaIds ||
                        [],
                ),
            ),
        ].sort(),
        derivedSchemaIds: [
            ...new Set(
                sources.flatMap(
                    source =>
                        source
                            .derivedSchemaIds ||
                        [],
                ),
            ),
        ].sort(),
        contextTags: [
            ...new Set([
                'memory_consolidation',
                ...sources.flatMap(
                    source =>
                        source
                            .contextTags ||
                        [],
                ),
            ]),
        ].sort(),
        confidence:
            sources.reduce(
                (sum, source) =>
                    sum +
                    Number(
                        source
                            .confidence ||
                        0,
                    ),
                0,
            ) /
            sources.length,
        supersedesAppraisalId:
            '',
    };
}

function rebindRelationshipReceipts(
    state,
    replacementBySourceId,
) {
    for (const receipt of (
        state.socialGraph
            ?.relationshipEvidence ||
        []
    )) {
        const replacementId =
            replacementBySourceId
                .get(
                    receipt.appraisalId,
                );
        if (
            replacementId ===
                undefined
        ) {
            continue;
        }
        const replacement =
            (
                state.memorySynapse
                    ?.appraisals ||
                []
            ).find(appraisal =>
                appraisal.id ===
                    replacementId);
        receipt.appraisalId =
            replacement &&
            replacement.observerId ===
                receipt.sourceActorId &&
            replacement.targetId ===
                receipt.targetActorId &&
            (
                replacement
                    .sourceEventIds ||
                []
            ).includes(
                receipt.eventId,
            )
                ? replacement.id
                : '';
    }
}

export function applyMemoryConsolidation(
    worldState,
    payload,
    {
        boundaryGuard = null,
    } = {},
) {
    if (
        boundaryGuard &&
        !isMemoryBoundaryGuardCurrent(
            worldState,
            boundaryGuard,
        )
    ) {
        throw new Error(
            'Rejected stale memory boundary consolidation.',
        );
    }
    const validation = validateMemoryConsolidation(
        payload,
        worldState,
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    let next = structuredClone(worldState);
    const reviews = new Map(
        payload.reviews.map(review => [
            review.id,
            review,
        ]),
    );
    const currentTurn = Math.max(
        0,
        Number(next.turn?.count || 0),
    );
    const replacementBySourceId =
        new Map();
    const deletionCandidates =
        new Set();
    for (const review of reviews.values()) {
        for (const operation of (
            review.operations ||
            []
        )) {
            let replacementId = '';
            if (
                operation.targetTier !==
                    'forget'
            ) {
                if (
                    operation
                        .sourceIds
                        .length === 1
                ) {
                    replacementId =
                        operation
                            .sourceIds[0];
                } else {
                    const proposal =
                        createMergedAppraisalProposal(
                            next,
                            review.id,
                            operation,
                        );
                    next =
                        applyAppraisalProposals(
                            next,
                            [proposal],
                        );
                    replacementId =
                        createAppraisalId(
                            proposal,
                        );
                }
            }
            removeActorMemoryRefsV1(
                next,
                review.id,
                operation.sourceIds,
            );
            for (const sourceId of (
                operation.sourceIds
            )) {
                replacementBySourceId
                    .set(
                        sourceId,
                        replacementId,
                    );
                if (
                    sourceId !==
                        replacementId
                ) {
                    deletionCandidates
                        .add(sourceId);
                }
            }
            if (replacementId) {
                addActorMemoryRefV1(
                    next,
                    review.id,
                    operation
                        .targetTier,
                    {
                        recordType:
                            'appraisal',
                        recordId:
                            replacementId,
                        addedClock:
                            next.clock,
                    },
                );
            }
        }
    }
    next =
        applyPersonSchemaOperations(
            next,
            payload
                .schemaOperations ||
                [],
        );
    rebindRelationshipReceipts(
        next,
        replacementBySourceId,
    );
    const protectedIds =
        getProtectedAppraisalIds(
            next,
        );
    const deletedIds =
        new Set(
            [...deletionCandidates]
                .filter(id =>
                    !protectedIds.has(id)),
        );
    next.memorySynapse
        .appraisals =
        (
            next.memorySynapse
                ?.appraisals ||
            []
        ).filter(appraisal =>
            !deletedIds.has(
                appraisal.id,
            ));
    const socialValidation =
        validateSocialGraphV3(
            next.socialGraph,
            {
                eventKnowledge:
                    next.eventKnowledge ||
                    [],
                appraisals:
                    next.memorySynapse
                        ?.appraisals ||
                    [],
            },
        );
    if (!socialValidation.valid) {
        throw new TypeError(
            socialValidation.errors
                .join(' '),
        );
    }
    next.socialGraph =
        socialValidation.value;
    const eventBoundary =
        next.memoryDirector
            ?.pendingEventBoundary;
    next.memoryDirector = {
        ...(next.memoryDirector || {}),
        status: 'ready',
        error: '',
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        lastReviewedTurn: currentTurn,
        pendingEventBoundary:
            eventBoundary
                ? {
                    ...eventBoundary,
                    status: 'consumed',
                    consumedTurn:
                        currentTurn,
                    consumedClock:
                        next.clock,
                }
                : null,
        reviewedActorIds:
            payload.reviews.map(review => review.id),
        schemaOperationCount:
            (
                payload.schemaOperations ||
                []
            ).length,
        reviewedAt: new Date().toISOString(),
    };
    return assertActorContextStateV1(
        next,
    );
}
