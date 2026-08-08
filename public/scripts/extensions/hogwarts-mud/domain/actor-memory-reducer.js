import {
    IMPRESSION_MAX_WORDS,
    isValidImpressionShorthand,
    normalizeActorMemoryProfile,
    normalizeSharedMemories,
    SHARED_MEMORY_TIERS,
} from './actor-memory.js';
import {
    upsertSharedMemory,
} from './actor-memory-migration.js';

export function getActorMemoryEntries(profile) {
    const normalized =
        normalizeActorMemoryProfile(profile);
    return SHARED_MEMORY_TIERS.flatMap(tier =>
        normalized.sharedMemories[tier].map(memory => ({
            ...memory,
            tier,
        })));
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
    const actors = (worldState?.actorLibrary || [])
        .map(profile => {
            const normalized =
                normalizeActorMemoryProfile(profile);
            const everydayCount =
                normalized.sharedMemories.everyday.length;
            const recentCount =
                normalized.sharedMemories.recent.length;
            const changedCount = [
                ...normalized.sharedMemories.everyday,
                ...normalized.sharedMemories.recent,
            ].filter(memory =>
                Number(memory.updatedTurn || 0) >
                lastReviewedTurn).length;
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
    const profiles = new Map(
        (worldState?.actorLibrary || []).map(profile => [
            profile.id,
            normalizeActorMemoryProfile(profile),
        ]),
    );
    const reviewedIds = new Set();
    reviews.forEach(review => {
        const profile = profiles.get(review.id);
        if (!profile || reviewedIds.has(review.id)) {
            errors.push(
                `共同记忆整理人物 ${review.id || '?'} 不存在或重复。`,
            );
            return;
        }
        reviewedIds.add(review.id);
        if (review.impressionOfPlayerEn !== undefined) {
            const impression = String(
                review.impressionOfPlayerEn || '',
            ).trim();
            if (!isValidImpressionShorthand(
                impression,
            )) {
                errors.push(
                    `人物 ${review.id} 的整理后印象必须是 1–${IMPRESSION_MAX_WORDS} 词的主观 shorthand。`,
                );
            }
        }
        const operations = Array.isArray(review.operations)
            ? review.operations
            : [];
        if (!operations.length &&
            !review.impressionOfPlayerEn) {
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
            getActorMemoryEntries(profile).map(memory => [
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
                sourceIds.some(id => usedSourceIds.has(id))) {
                errors.push(
                    `人物 ${review.id} 的记忆来源不存在或被重复使用。`,
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
            if (
                operation.targetTier ===
                    'recent' &&
                !(
                    sources.some(source =>
                        source.tier === 'recent' ||
                        (
                            source.significance ===
                                'notable' &&
                            String(
                                source
                                    .lastingImpactEn ||
                                '',
                            ).trim()
                        )) ||
                    (
                        sources.filter(source =>
                            source.tier ===
                                'everyday')
                            .length >= 2 &&
                        new Set(
                            sources
                                .filter(source =>
                                    source.tier ===
                                        'everyday')
                                .map(source =>
                                    Number(
                                        source.createdTurn ||
                                        source.updatedTurn ||
                                        0,
                                    ))
                                .filter(Boolean),
                        ).size >= 2
                    )
                )
            ) {
                errors.push(
                    `人物 ${review.id} 的近期大事必须来自已有近期记忆、带长期影响的 notable 候选，或至少两条跨回合日常记忆形成的重复模式。`,
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
    normalized.statements =
        Array.isArray(
            normalized.statements,
        )
            ? normalized.statements
            : Array.isArray(
                normalized
                    .socialStatements,
            )
                ? normalized
                    .socialStatements
                : [];
    normalized.relationshipEvidence =
        Array.isArray(
            normalized
                .relationshipEvidence,
        )
            ? normalized
                .relationshipEvidence
            : Array.isArray(
                normalized
                    .socialRelationshipEvidence,
            )
                ? normalized
                    .socialRelationshipEvidence
                : [];
    return normalized;
}

export function applyMemoryConsolidation(
    worldState,
    payload,
) {
    const validation = validateMemoryConsolidation(
        payload,
        worldState,
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
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
    next.actorLibrary = (next.actorLibrary || []).map(
        (profile, profileIndex) => {
            const review = reviews.get(profile.id);
            let normalized =
                normalizeActorMemoryProfile(profile);
            if (!review) return normalized;
            if (review.impressionOfPlayerEn) {
                normalized = {
                    ...normalized,
                    impressionOfPlayerEn:
                        review.impressionOfPlayerEn,
                    impressionOfPlayer:
                        review.impressionOfPlayer ||
                        review.impressionOfPlayerEn,
                    impressionUpdatedClock: next.clock,
                    impressionUpdatedTurn: currentTurn,
                };
            }
            (review.operations || []).forEach(
                (operation, operationIndex) => {
                    const sourceIds = new Set(
                        operation.sourceIds,
                    );
                    const sources =
                        getActorMemoryEntries(normalized)
                            .filter(memory =>
                                sourceIds.has(memory.id));
                    const memories =
                        normalizeSharedMemories(
                            normalized.sharedMemories,
                        );
                    SHARED_MEMORY_TIERS.forEach(tier => {
                        memories[tier] = memories[tier]
                            .filter(memory =>
                                !sourceIds.has(memory.id));
                    });
                    normalized = {
                        ...normalized,
                        sharedMemories: memories,
                    };
                    if (operation.targetTier ===
                        'forget') {
                        return;
                    }
                    normalized = upsertSharedMemory(
                        normalized,
                        {
                            id: `${profile.id}_m${currentTurn}_${profileIndex + 1}_${operationIndex + 1}`,
                            summaryEn:
                                operation.summaryEn,
                            summary:
                                operation.summary ||
                                operation.summaryEn,
                            firstClock:
                                sources[0]?.firstClock ||
                                next.clock,
                            lastClock: next.clock,
                            createdTurn: Math.min(
                                ...sources.map(memory =>
                                    Number(
                                        memory.createdTurn ||
                                        currentTurn,
                                    )),
                            ),
                            updatedTurn: currentTurn,
                            source: 'medium',
                        },
                        operation.targetTier,
                    );
                },
            );
            return normalized;
        },
    );
    const profiles = new Map(
        next.actorLibrary.map(profile => [
            profile.id,
            profile,
        ]),
    );
    next.actors = (next.actors || []).map(actor => {
        const profile = profiles.get(actor.id);
        return profile ? {
            ...actor,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
        } : actor;
    });
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
        reviewedAt: new Date().toISOString(),
    };
    return next;
}
