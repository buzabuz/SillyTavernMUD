// Extracted from the helpers compatibility facade for Task 4.

import {
    upsertSharedMemory,
} from './actor-memory-migration.js';

import {
    hasGenericImpression,
    normalizeActorMemoryProfile,
} from './actor-memory.js';

import {
    createSceneItemStates,
    normalizeInventoryItem,
} from './inventory.js';

import {
    getLocalMapDefinition,
} from './map-access.js';

import {
    validateSceneTransitionPackage,
} from './scene-transition.js';

import {
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

import {
    getWorldClockGapMinutes,
    TEMPORAL_STATE_VERSION,
    WORLD_CHANGE_MIN_DAYS,
} from './time-environment.js';

import {
    applyTransitionWorldChanges,
    normalizeTransitionWorldChanges,
} from './world-changes.js';

export function applySceneTransition(worldState, payload, archiveEntry = {}, options = {}) {
    const validation = validateSceneTransitionPackage(payload, worldState, options);
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const nextScene = payload.nextScene;
    const map = getLocalMapDefinition(nextScene.mapId, next.map);
    const rooms = [
        ...(map.nodes || []),
        ...(next.map.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ];
    const room = rooms.find(item => item.id === nextScene.roomId);
    const nextClock = payload.nextClock;
    const closureTimelineEntry = {
        clock: archiveEntry.endedClock || worldState.clock,
        label: archiveEntry.closureSummary || payload.closureSummaryEn,
    };
    const archivedTimelineEntries = structuredClone(
        archiveEntry.timelineEntries?.length
            ? archiveEntry.timelineEntries
            : worldState.scene?.timelineEntries || [],
    );
    const lastArchivedEntry =
        archivedTimelineEntries[archivedTimelineEntries.length - 1];
    if (lastArchivedEntry?.clock !== closureTimelineEntry.clock ||
        lastArchivedEntry?.label !== closureTimelineEntry.label) {
        archivedTimelineEntries.push(closureTimelineEntry);
    }
    const committedArchiveEntry = {
        ...structuredClone(archiveEntry),
        timelineEntries: archivedTimelineEntries,
    };

    next.sceneArchive = [
        ...(next.sceneArchive || []).filter(scene => scene.id !== archiveEntry.id),
        committedArchiveEntry,
    ];
    next.clock = nextClock;
    const normalizedWorldChanges =
        normalizeTransitionWorldChanges(
            payload.worldChanges,
        );
    const worldChangePending =
        options.deferWorldChanges ===
            true &&
        Number(
            getWorldClockGapMinutes(
                worldState.clock,
                nextClock,
            ),
        ) >=
            WORLD_CHANGE_MIN_DAYS *
            1440 &&
        !normalizedWorldChanges
            .prophetBriefs.length &&
        !normalizedWorldChanges
            .gossipUpdates.length;
    const worldChangeEntry =
        worldChangePending
            ? null
            : applyTransitionWorldChanges(
                next,
                worldState,
                payload,
            );
    const currentTurn = Math.max(
        0,
        Number(next.turn?.count || 0),
    );
    const relationshipUpdates = new Map(
        (payload.relationshipUpdates || [])
            .map(update => [
                update.id,
                update,
            ]),
    );
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(profile => {
        const update =
            relationshipUpdates.get(
                profile.id,
            );
        let normalized =
            normalizeActorMemoryProfile(profile);
        if (!update) return normalized;
        normalized = {
            ...normalized,
            impressionOfPlayerEn:
                update.impressionOfPlayerEn,
            impressionOfPlayer:
                update.impressionOfPlayer ||
                update.impressionOfPlayerEn,
            impressionUpdatedClock:
                nextClock,
            impressionUpdatedTurn:
                currentTurn,
        };
        return upsertSharedMemory(
            normalized,
            {
                id: `${profile.id}_${archiveEntry.id || worldState.scene?.id || 'scene'}_recent_${currentTurn}`,
                summaryEn:
                    update.sceneMemoryEn,
                summary:
                    update.sceneMemory ||
                    update.sceneMemoryEn,
                firstClock:
                    archiveEntry.startedClock ||
                    worldState.scene
                        ?.startedClock ||
                    worldState.clock,
                lastClock:
                    archiveEntry.endedClock ||
                    worldState.clock,
                createdTurn: currentTurn,
                updatedTurn: currentTurn,
                source: 'medium_transition',
                significance: 'notable',
                lastingImpactEn:
                    update.sceneMemoryEn,
                lastingImpact:
                    update.sceneMemory ||
                    update.sceneMemoryEn,
            },
            'recent',
        );
    });
    next.chapter = nextScene.chapter || nextScene.chapterEn;
    next.location = room.name || nextScene.name || nextScene.nameEn;
    next.items = (next.items || [])
        .map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId:
                            nextScene.mapId,
                        roomId:
                            nextScene.roomId,
                        clock: nextClock,
                    },
                );
            if (
                normalized.ownerId ===
                    'player' &&
                ['carried', 'equipped']
                    .includes(
                        normalized.custody,
                    )
            ) {
                return {
                    ...normalized,
                    mapId:
                        nextScene.mapId,
                    roomId:
                        nextScene.roomId,
                    updatedClock:
                        nextClock,
                };
            }
            return normalized;
        });
    next.scene = {
        id: nextScene.id,
        name: nextScene.name || nextScene.nameEn,
        nameEn: nextScene.nameEn,
        summary: nextScene.summary || nextScene.summaryEn,
        summaryEn: nextScene.summaryEn,
        explorationHook:
            nextScene.explorationHook ||
            nextScene.explorationHookEn,
        explorationHookEn:
            nextScene.explorationHookEn,
        crowdDirection:
            nextScene.crowdDirection ||
            nextScene.crowdDirectionEn,
        crowdDirectionEn:
            nextScene.crowdDirectionEn,
        temporalFacts:
            nextScene.temporalFacts ||
            nextScene.temporalFactsEn,
        temporalFactsEn:
            nextScene.temporalFactsEn,
        temporalGroundingVersion:
            TEMPORAL_STATE_VERSION,
        worldChangeId:
            worldChangeEntry?.id || '',
        startedClock: nextClock,
        startedMessageId: Number(options.startedMessageId || 0),
        timelineEntries: [{
            clock: nextClock,
            label: nextScene.summary || nextScene.summaryEn,
        }],
        mapId: nextScene.mapId,
        roomId: nextScene.roomId,
        itemStates:
            createSceneItemStates(
                next.items,
                {
                    mapId:
                        nextScene.mapId,
                    roomId:
                        nextScene.roomId,
                },
            ),
        nextSceneIntent: structuredClone(
            nextScene.followingSceneIntent,
        ),
    };
    next.map.activeMapId = nextScene.mapId;
    next.map.currentLocalNodeId = nextScene.roomId;
    next.map.currentLevelId = room.levelId || map.defaultLevelId;
    next.map.discoveredLocalNodeIds = [...new Set([
        ...(next.map.discoveredLocalNodeIds || []),
        `${nextScene.mapId}:${nextScene.roomId}`,
    ])];

    const actorStateMap = new Map(
        nextScene.actorStates.map(actor => [actor.id, actor]),
    );
    const existingActors = new Map((next.actors || []).map(actor => [actor.id, actor]));
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(profile => {
        const current =
            existingActors.get(profile.id);
        const update =
            actorStateMap.get(profile.id);
        if (
            update
                ?.firstImpressionOfPlayerEn &&
            !profile
                .firstImpressionOfPlayerEn
        ) {
            const currentImpression =
                normalizeActorMemoryProfile(
                    profile,
                    current,
                );
            const seedCurrent =
                hasGenericImpression(
                    currentImpression
                        .impressionOfPlayerEn,
                );
            return normalizeActorMemoryProfile({
                ...currentImpression,
                firstImpressionOfPlayerEn:
                    update
                        .firstImpressionOfPlayerEn,
                firstImpressionOfPlayer:
                    update
                        .firstImpressionOfPlayer ||
                    update
                        .firstImpressionOfPlayerEn,
                firstImpressionClock:
                    nextClock,
                firstImpressionTurn:
                    currentTurn,
                firstImpressionPending:
                    false,
                ...(seedCurrent
                    ? {
                        impressionOfPlayerEn:
                            update
                                .firstImpressionOfPlayerEn,
                        impressionOfPlayer:
                            update
                                .firstImpressionOfPlayer ||
                            update
                                .firstImpressionOfPlayerEn,
                        impressionUpdatedClock:
                            nextClock,
                        impressionUpdatedTurn:
                            currentTurn,
                    }
                    : {}),
                introducedClock:
                    profile.introducedClock ||
                    nextClock,
                introducedTurn:
                    profile.introducedTurn ??
                    currentTurn,
            }, {
                ...current,
                present: true,
            });
        }
        if (
            update?.present === true &&
            current?.present !== true &&
            !profile
                .firstImpressionOfPlayerEn
        ) {
            return normalizeActorMemoryProfile({
                ...profile,
                introducedClock:
                    profile.introducedClock ||
                    nextClock,
                introducedTurn:
                    profile.introducedTurn ??
                    currentTurn,
                firstImpressionPending:
                    true,
            }, {
                ...current,
                present: true,
            });
        }
        return normalizeActorMemoryProfile(
            profile,
            current,
        );
    });
    next.actors = (next.actorLibrary || []).map(profile => {
        const current = existingActors.get(profile.id) || {};
        const update = actorStateMap.get(profile.id);
        const lifeStatus =
            update?.lifeStatus ||
            current.lifeStatus ||
            profile.lifeStatus ||
            'alive';
        const lifeStatusPermanent =
            lifeStatus === 'dead'
                ? update
                    ?.lifeStatusPermanent !==
                    false
                : Boolean(
                    update
                        ?.lifeStatusPermanent ??
                    current
                        .lifeStatusPermanent ??
                    profile
                        .lifeStatusPermanent,
                );
        return {
            ...current,
            id: profile.id,
            nameEn: current.nameEn || profile.nameEn,
            name: current.name || profile.name || profile.nameEn,
            roleEn: current.roleEn || profile.roleEn,
            role: current.role || profile.role || profile.roleEn,
            relationshipToPlayerEn: current.relationshipToPlayerEn || profile.relationshipToPlayerEn,
            relationshipToPlayer: current.relationshipToPlayer || profile.relationshipToPlayer,
            firstImpressionOfPlayerEn:
                profile
                    .firstImpressionOfPlayerEn ||
                current
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    .firstImpressionOfPlayer ||
                current
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile.firstImpressionClock ||
                current.firstImpressionClock,
            firstImpressionTurn:
                profile.firstImpressionTurn ||
                current.firstImpressionTurn,
            firstImpressionPending:
                profile.firstImpressionPending,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn ||
                current.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer ||
                current.impressionOfPlayer ||
                profile.impressionOfPlayerEn,
            impressionUpdatedClock:
                profile.impressionUpdatedClock ||
                current.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn ||
                current.impressionUpdatedTurn,
            publicDescriptionEn: current.publicDescriptionEn || profile.publicDescriptionEn,
            present:
                lifeStatus === 'dead'
                    ? false
                    : update?.present === true,
            lifeStatus,
            lifeStatusPermanent,
            lifeStatusDetailEn:
                update
                    ?.lifeStatusDetailEn ||
                current
                    .lifeStatusDetailEn ||
                profile
                    .lifeStatusDetailEn ||
                (
                    lifeStatus === 'alive'
                        ? 'Alive.'
                        : ''
                ),
            lifeStatusDetail:
                update
                    ?.lifeStatusDetail ||
                update
                    ?.lifeStatusDetailEn ||
                current
                    .lifeStatusDetail ||
                profile
                    .lifeStatusDetail ||
                (
                    lifeStatus === 'alive'
                        ? '存活。'
                        : ''
                ),
            lifeStatusSinceClock:
                lifeStatus !==
                    (
                        current.lifeStatus ||
                        profile.lifeStatus ||
                        'alive'
                    )
                    ? nextClock
                    : current
                        .lifeStatusSinceClock ||
                        profile
                            .lifeStatusSinceClock ||
                        '',
            mapId: update?.mapId || current.mapId || nextScene.mapId,
            roomId: update?.roomId || current.roomId || nextScene.roomId,
            currentActivityEn: update?.currentActivityEn || current.currentActivityEn || '',
            currentActivity: update?.currentActivity || update?.currentActivityEn ||
                current.currentActivity || '',
        };
    }).concat(
        (worldState.actors || [])
            .filter(actor =>
                actor.temporary)
            .map(actor => ({
                ...structuredClone(actor),
                present: false,
                currentActivityEn:
                    actor.currentActivityEn ||
                    'No longer in the active scene.',
                currentActivity:
                    actor.currentActivity ||
                    actor.currentActivityEn ||
                    '已离开当前场景。',
            })),
    );
    const lifeStates = new Map(
        next.actors.map(actor => [
            actor.id,
            actor,
        ]),
    );
    next.actorLibrary =
        next.actorLibrary.map(profile => {
            const actor =
                lifeStates.get(profile.id);
            return actor ? {
                ...profile,
                lifeStatus:
                    actor.lifeStatus,
                lifeStatusPermanent:
                    actor
                        .lifeStatusPermanent,
                lifeStatusDetailEn:
                    actor
                        .lifeStatusDetailEn,
                lifeStatusDetail:
                    actor.lifeStatusDetail,
                lifeStatusSinceClock:
                    actor
                        .lifeStatusSinceClock,
            } : profile;
        });
    next.timeline = [
        ...(next.timeline || []),
        closureTimelineEntry,
        next.scene.timelineEntries[0],
    ].slice(-20);
    next.sceneTransition = {
        status: 'idle',
        tier: options.tier || 'medium',
        error: '',
        requestedAt: null,
        settledAt: new Date().toISOString(),
    };
    next.sceneEnrichment = {
        ...(next.sceneEnrichment || {}),
        worldChanges:
            worldChangePending
                ? {
                    status: 'pending',
                    sceneId:
                        nextScene.id,
                    fromClock:
                        worldState.clock,
                    toClock:
                        nextClock,
                    error: '',
                }
                : {
                    status: 'ready',
                    sceneId:
                        nextScene.id,
                    fromClock:
                        worldState.clock,
                    toClock:
                        nextClock,
                    error: '',
                },
    };
    next.pacingDirector = {
        ...(next.pacingDirector || {}),
        status: 'idle',
        error: '',
        pendingBeat: null,
    };
    next.memoryDirector = {
        ...(next.memoryDirector || {}),
        status: 'ready',
        error: '',
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        lastReviewedTurn:
            options
                .deferSocialConsolidation ===
                true
                ? Number(
                    next.memoryDirector
                        ?.lastReviewedTurn ||
                    0,
                )
                : currentTurn,
        pendingEventBoundary: null,
    };
    delete next.memoryDirector
        .reviewAfterTurns;
    next.turn = {
        ...(next.turn || {}),
        status: 'idle',
        error: '',
    };
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId: nextScene.mapId,
            roomId: nextScene.roomId,
        },
        lastMovement: null,
    };
    return next;
}
