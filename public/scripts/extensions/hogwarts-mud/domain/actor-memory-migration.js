import {
    deriveRelationshipImpression,
    isValidImpressionShorthand,
    normalizeActorMemoryProfile,
    normalizeSharedMemories,
    RELATIONSHIP_MEMORY_VERSION,
    SHARED_MEMORY_TIER_LIMITS,
    SHARED_MEMORY_TIERS,
} from './actor-memory.js';
import {
    memoryFingerprint,
    normalizeMemoryId,
} from './stable-identity.js';

const LEGACY_TRANSITION_FILLER_PATTERN =
    /^During the closed scene,[\s\S]*This experience materially shaped the actor['’]s view of the player\.$/u;

export function isLegacyTransitionFillerMemory(
    memory,
) {
    return (
        memory?.source ===
            'medium_transition' &&
        LEGACY_TRANSITION_FILLER_PATTERN
            .test(
                String(
                    memory.summaryEn ||
                    memory.summary ||
                    '',
                ).trim(),
            )
    );
}

function pruneLegacyTransitionFillerMemories(
    profile,
) {
    const sharedMemories =
        normalizeSharedMemories(
            profile.sharedMemories,
        );
    return {
        ...profile,
        sharedMemories:
            normalizeSharedMemories(
                Object.fromEntries(
                    SHARED_MEMORY_TIERS
                        .map(tier => [
                            tier,
                            sharedMemories[tier]
                                .filter(memory =>
                                    !isLegacyTransitionFillerMemory(
                                        memory,
                                    )),
                        ]),
                ),
            ),
    };
}

export function upsertSharedMemory(
    profile,
    memory,
    targetTier,
) {
    const normalizedProfile =
        normalizeActorMemoryProfile(profile);
    const memories = normalizedProfile.sharedMemories;
    const fingerprint = memoryFingerprint(
        memory.summaryEn || memory.summary,
    );
    let existing = null;
    let existingTier = '';
    SHARED_MEMORY_TIERS.forEach(tier => {
        const match = memories[tier].find(item =>
            memoryFingerprint(item.summaryEn) === fingerprint);
        if (match && !existing) {
            existing = match;
            existingTier = tier;
        }
    });
    const tierRank = {
        everyday: 0,
        recent: 1,
        core: 2,
    };
    const resolvedTier = existing &&
        tierRank[existingTier] > tierRank[targetTier]
        ? existingTier
        : targetTier;
    if (existing) {
        memories[existingTier] = memories[existingTier]
            .filter(item => item.id !== existing.id);
    }
    const nextMemory = {
        ...(existing || {}),
        ...memory,
        id: normalizeMemoryId(
            memory.id || existing?.id,
            `memory_${normalizeMemoryId(profile.id, 'actor')}_${resolvedTier}_${memories[resolvedTier].length + 1}`,
        ),
        summaryEn: String(
            memory.summaryEn ||
            existing?.summaryEn ||
            '',
        ).trim(),
        summary: String(
            memory.summary ||
            existing?.summary ||
            memory.summaryEn ||
            '',
        ).trim(),
        tier: resolvedTier,
        firstClock:
            existing?.firstClock ||
            memory.firstClock ||
            memory.lastClock ||
            '',
        lastClock:
            memory.lastClock ||
            existing?.lastClock ||
            memory.firstClock ||
            '',
        createdTurn: Math.max(
            0,
            Number(
                existing?.createdTurn ??
                memory.createdTurn ??
                0,
            ),
        ),
        updatedTurn: Math.max(
            0,
            Number(
                memory.updatedTurn ??
                existing?.updatedTurn ??
                0,
            ),
        ),
        source: memory.source || existing?.source || 'low',
    };
    memories[resolvedTier] = [
        ...memories[resolvedTier],
        nextMemory,
    ].slice(-SHARED_MEMORY_TIER_LIMITS[resolvedTier]);
    return {
        ...normalizedProfile,
        sharedMemories: memories,
    };
}

function compactLegacyMemoryText(value) {
    const text = String(value || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 40) {
        return `${words.slice(0, 40).join(' ')}…`;
    }
    return text.length > 180
        ? `${text.slice(0, 180).trim()}…`
        : text;
}

function buildLegacyActorMemory(
    transaction,
    actorId,
) {
    const explicitUpdate =
        (transaction.actorUpdates || []).find(update =>
            update.id === actorId &&
            update.memoryUpdate?.summaryEn);
    if (explicitUpdate) {
        return {
            summaryEn: compactLegacyMemoryText(
                explicitUpdate.memoryUpdate.summaryEn,
            ),
            summary: compactLegacyMemoryText(
                explicitUpdate.memoryUpdate.summary ||
                explicitUpdate.memoryUpdate.summaryEn,
            ),
            targetTier: 'everyday',
            significance:
                explicitUpdate.memoryUpdate
                    .significance ||
                'everyday',
            lastingImpactEn:
                explicitUpdate.memoryUpdate
                    .lastingImpactEn || '',
            lastingImpact:
                explicitUpdate.memoryUpdate
                    .lastingImpact || '',
            source: 'low',
        };
    }
    const segments = transaction.segments || [];
    const english = [];
    const translated = [];
    segments.forEach((segment, index) => {
        if (segment.type !== 'dialogue' ||
            segment.actorId !== actorId) {
            return;
        }
        const previous = segments[index - 1];
        if (previous?.type === 'narration') {
            english.push(previous.textEn);
            translated.push(
                previous.textZh || previous.textEn,
            );
        }
        english.push(segment.textEn);
        translated.push(
            segment.textZh || segment.textEn,
        );
    });
    const summaryEn = compactLegacyMemoryText(
        [...new Set(english.filter(Boolean))].join(' '),
    );
    if (!summaryEn) return null;
    return {
        summaryEn,
        summary: compactLegacyMemoryText(
            [...new Set(translated.filter(Boolean))].join(' '),
        ) || summaryEn,
        targetTier: 'everyday',
        source: 'migration',
    };
}

export function migrateRelationshipMemoryState(
    worldState,
    chat = [],
) {
    if (!worldState) {
        return { state: worldState, changed: false };
    }
    const needsVersionMigration =
        Number(
            worldState
                .relationshipMemoryVersion ||
            0,
        ) < RELATIONSHIP_MEMORY_VERSION;
    const needsFillerPruning =
        (worldState.actorLibrary || [])
            .some(profile =>
                SHARED_MEMORY_TIERS.some(tier =>
                    (
                        Array.isArray(
                            profile
                                .sharedMemories?.[tier],
                        )
                            ? profile
                                .sharedMemories[tier]
                            : []
                    ).some(
                        isLegacyTransitionFillerMemory,
                    )));
    if (
        !needsVersionMigration &&
        !needsFillerPruning
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next = structuredClone(worldState);
    if (!needsVersionMigration) {
        next.actorLibrary =
            (next.actorLibrary || [])
                .map(
                    pruneLegacyTransitionFillerMemories,
                );
        return {
            state: next,
            changed: true,
        };
    }
    const currentActors = new Map(
        (next.actors || []).map(actor => [actor.id, actor]),
    );
    const profilesNeedingShorthand = new Set(
        (next.actorLibrary || [])
            .filter(profile => {
                const actor = currentActors.get(profile.id) || {};
                const impression = String(
                    profile.impressionOfPlayerEn ||
                    actor.impressionOfPlayerEn ||
                    '',
                ).trim();
                return !isValidImpressionShorthand(
                    impression,
                );
            })
            .map(profile => profile.id),
    );
    next.actorLibrary = (next.actorLibrary || []).map(profile => {
        const normalized =
            normalizeActorMemoryProfile(
                profile,
                currentActors.get(profile.id),
            );
        const demotedLowMemories =
            normalized.sharedMemories.recent
                .filter(memory =>
                    memory.source === 'low')
                .map(memory => ({
                    ...memory,
                    tier: 'everyday',
                    significance:
                        memory.significance ||
                        'everyday',
                }));
        return {
            ...normalized,
            sharedMemories:
                normalizeSharedMemories({
                    core:
                        normalized.sharedMemories
                            .core
                            .filter(memory =>
                                memory.source !==
                                'migration'),
                    recent:
                        normalized.sharedMemories
                            .recent
                            .filter(memory =>
                                memory.source !==
                                    'migration' &&
                                memory.source !==
                                    'low'),
                    everyday: [
                        ...normalized
                            .sharedMemories
                            .everyday
                            .filter(memory =>
                                memory.source !==
                                'migration'),
                        ...demotedLowMemories,
                    ],
                }),
        };
    });
    const profiles = new Map(
        next.actorLibrary.map(profile => [profile.id, profile]),
    );
    chat.slice(-16).forEach((message, messageIndex) => {
        const transaction =
            message?.extra?.hogwartsMud?.turnTransaction;
        if (!transaction) return;
        const participantIds = new Set([
            ...(transaction.segments || [])
                .map(segment => segment.actorId),
            ...(transaction.actorUpdates || [])
                .filter(update =>
                    update.impressionOfPlayerEn ||
                    update.memoryUpdate?.summaryEn)
                .map(update => update.id),
        ].filter(Boolean));
        participantIds.forEach(actorId => {
            const profile = profiles.get(actorId);
            if (!profile) return;
            const candidate = buildLegacyActorMemory(
                transaction,
                actorId,
            );
            if (!candidate) return;
            const migrated = upsertSharedMemory(
                profile,
                {
                    id: `${actorId}_legacy_${messageIndex + 1}`,
                    summaryEn: candidate.summaryEn,
                    summary: candidate.summary,
                    firstClock:
                        transaction.committedClock ||
                        next.clock,
                    lastClock:
                        transaction.committedClock ||
                        next.clock,
                    createdTurn: Math.max(
                        0,
                        Number(next.turn?.count || 0) -
                            (16 - messageIndex),
                    ),
                    updatedTurn:
                        Number(next.turn?.count || 0),
                    source: candidate.source,
                    significance:
                        candidate.significance ||
                        'everyday',
                    lastingImpactEn:
                        candidate
                            .lastingImpactEn || '',
                    lastingImpact:
                        candidate
                            .lastingImpact || '',
                },
                candidate.targetTier,
            );
            profiles.set(actorId, migrated);
        });
    });
    next.actorLibrary = next.actorLibrary.map(profile => {
        const normalized = normalizeActorMemoryProfile(
            profiles.get(profile.id) || profile,
            currentActors.get(profile.id),
        );
        const migrated = profilesNeedingShorthand
            .has(profile.id)
            ? {
                ...normalized,
                ...(() => {
                    const initial =
                        deriveRelationshipImpression(
                            normalized,
                            currentActors.get(profile.id),
                        );
                    return initial.established
                        ? {
                            impressionOfPlayerEn:
                                initial.en,
                            impressionOfPlayer:
                                initial.zh,
                        }
                        : {
                            impressionOfPlayerEn:
                                'Hard to ignore; still deciding what to make of them.',
                            impressionOfPlayer:
                                '很难忽视，但还没想好该怎么看这个人。',
                        };
                })(),
            }
            : normalized;
        return pruneLegacyTransitionFillerMemories(
            migrated,
        );
    });
    const normalizedProfiles = new Map(
        next.actorLibrary.map(profile => [profile.id, profile]),
    );
    next.actors = (next.actors || []).map(actor => {
        const profile = normalizedProfiles.get(actor.id);
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
    const previousMemoryDirector =
        next.memoryDirector || {};
    next.memoryDirector = {
        status: 'idle',
        error: '',
        reviewedActorIds: [],
        reviewedAt: null,
        ...previousMemoryDirector,
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        pendingEventBoundary:
            previousMemoryDirector
                .pendingEventBoundary ||
            null,
        lastReviewedTurn:
            Number(
                previousMemoryDirector
                    .lastReviewedTurn || 0,
            ) ||
            Number(next.turn?.count || 0),
    };
    delete next.memoryDirector
        .reviewAfterTurns;
    next.relationshipMemoryVersion =
        RELATIONSHIP_MEMORY_VERSION;
    return { state: next, changed: true };
}
