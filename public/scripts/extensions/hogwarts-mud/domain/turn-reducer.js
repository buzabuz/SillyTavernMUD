// Extracted from the helpers compatibility facade for Task 4.

import {
    buildActorNameAliases,
} from './actor-identity.js';

import {
    upsertSharedMemory,
} from './actor-memory-migration.js';

import {
    getActorMemoryEntries,
} from './actor-memory-reducer.js';

import {
    hasGenericImpression,
    normalizeActorMemoryProfile,
} from './actor-memory.js';

import {
    migrateActorPresentationState,
} from './appearance.js';

import {
    createSceneItemStates,
} from './inventory.js';

import {
    applyMaterialEvents,
} from './material-state.js';

import {
    settleSpellProgress,
} from './spell-state.js';

import {
    advanceWorldClock,
} from './time-environment.js';

import {
    applyItemUpdates,
} from './turn-authority.js';

import {
    validateTurnTransaction,
} from './turn-validation.js';

export function applyTurnTransaction(worldState, transaction, playerAction = '') {
    const validation = validateTurnTransaction(
        transaction,
        worldState,
        playerAction,
        {
            allowLocalizedTemporaryActorFields:
                true,
        },
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    let next = structuredClone(worldState);
    const requestedMinutes = Number(transaction.elapsedMinutes);
    const allowShortMagicTurn =
        transaction.instantaneousMagic ===
            true &&
        Boolean(
            String(
                transaction
                    .exceptionReasonEn ||
                '',
            ).trim(),
        );
    const elapsedMinutes = allowShortMagicTurn
        ? requestedMinutes
        : Math.max(15, requestedMinutes);
    next.clock = advanceWorldClock(next.clock, elapsedMinutes);
    if (transaction.checkResolution) {
        next.checks = [
            ...(next.checks || []),
            {
                ...structuredClone(transaction.checkResolution),
                committedClock: next.clock,
            },
        ].slice(-100);
    }

    const committedTurn =
        Number(next.turn?.count || 0) + 1;
    const actorUpdates = new Map(
        (transaction.actorUpdates || []).map(update => [
            update.id,
            update,
        ]),
    );
    const settledPresentActorIds =
        Array.isArray(
            transaction.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? new Set(
                transaction.actorPresence
                    .presentActorIdsAfterTurn,
            )
            : null;
    (
        transaction
            .temporaryActorEntrances ||
        []
    ).forEach(actor => {
        const update =
            actorUpdates.get(actor.id);
        next.actors ??= [];
        next.actors.push({
            ...structuredClone(actor),
            name:
                actor.name ||
                actor.nameEn,
            aliases:
                buildActorNameAliases(
                    actor.nameEn,
                    actor.name,
                ),
            relationshipToPlayerEn:
                'scene acquaintance',
            relationshipToPlayer:
                '场景中的临时相识',
            currentActivityEn:
                update
                    ?.currentActivityEn ||
                actor.currentActivityEn,
            currentActivity:
                update
                    ?.currentActivity ||
                update
                    ?.currentActivityEn ||
                actor.currentActivityEn,
            present:
                settledPresentActorIds
                    ?.has(actor.id) ??
                true,
            temporary: true,
            provisionalActorId:
                actor.id,
            identityStatus:
                'provisional',
            temporaryMemories: [],
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusDetail:
                '存活。',
            lifeStatusSinceClock: '',
            mapId:
                update?.mapId ||
                next.map?.activeMapId,
            roomId:
                update?.roomId ||
                next.map
                    ?.currentLocalNodeId,
            source:
                'scene_temporary_actor',
            introducedClock:
                next.clock,
            introducedTurn:
                committedTurn,
        });
    });
    next.actorLibrary = (next.actorLibrary || []).map(
        profile => {
            const update = actorUpdates.get(profile.id);
            let normalized =
                normalizeActorMemoryProfile(profile);
            if (!update) return normalized;
            if (
                update
                    .firstImpressionOfPlayerEn
            ) {
                const seedCurrent =
                    hasGenericImpression(
                        normalized
                            .impressionOfPlayerEn,
                    );
                normalized = {
                    ...normalized,
                    firstImpressionOfPlayerEn:
                        update
                            .firstImpressionOfPlayerEn,
                    firstImpressionOfPlayer:
                        update
                            .firstImpressionOfPlayer ||
                        update
                            .firstImpressionOfPlayerEn,
                    firstImpressionClock:
                        next.clock,
                    firstImpressionTurn:
                        committedTurn,
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
                                next.clock,
                            impressionUpdatedTurn:
                                committedTurn,
                        }
                        : {}),
                };
            }
            if (update.impressionOfPlayerEn) {
                normalized = {
                    ...normalized,
                    impressionOfPlayerEn:
                        update.impressionOfPlayerEn,
                    impressionOfPlayer:
                        update.impressionOfPlayer ||
                        update.impressionOfPlayerEn,
                    impressionUpdatedClock: next.clock,
                    impressionUpdatedTurn: committedTurn,
                };
            }
            if (update.memoryUpdate?.summaryEn) {
                normalized = upsertSharedMemory(
                    normalized,
                    {
                        id: `${profile.id}_t${committedTurn}_everyday`,
                        summaryEn:
                            update.memoryUpdate.summaryEn,
                        summary:
                            update.memoryUpdate.summary ||
                            update.memoryUpdate.summaryEn,
                        firstClock: next.clock,
                        lastClock: next.clock,
                        createdTurn: committedTurn,
                        updatedTurn: committedTurn,
                        source: 'low',
                        significance:
                            update.memoryUpdate
                                .significance,
                        lastingImpactEn:
                            update.memoryUpdate
                                .lastingImpactEn ||
                            '',
                        lastingImpact:
                            update.memoryUpdate
                                .lastingImpact ||
                            update.memoryUpdate
                                .lastingImpactEn ||
                            '',
                    },
                    'everyday',
                );
            }
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
        const update = actorUpdates.get(actor.id);
        const profile = profiles.get(actor.id);
        if (!update && !profile) return actor;
        const temporaryMemories =
            actor.temporary &&
            update?.memoryUpdate
                ?.summaryEn
                ? [
                    ...(
                        actor
                            .temporaryMemories ||
                        []
                    ),
                    {
                        id:
                            `${actor.id}_t${committedTurn}_temporary`,
                        summaryEn:
                            update
                                .memoryUpdate
                                .summaryEn,
                        summary:
                            update
                                .memoryUpdate
                                .summary ||
                            update
                                .memoryUpdate
                                .summaryEn,
                        clock:
                            next.clock,
                        turn:
                            committedTurn,
                    },
                ].slice(-8)
                : actor
                    .temporaryMemories;
        return {
            ...actor,
            present:
                settledPresentActorIds
                    ? settledPresentActorIds
                        .has(actor.id)
                    : update?.present ??
                        actor.present,
            mapId: update?.mapId || actor.mapId ||
                next.map?.activeMapId,
            roomId: update?.roomId || actor.roomId ||
                next.map?.currentLocalNodeId,
            currentActivityEn:
                update?.currentActivityEn ||
                actor.currentActivityEn,
            currentIntentEn:
                update?.currentIntentEn ||
                actor.currentIntentEn,
            currentActivity:
                update?.currentActivity ||
                update?.currentActivityEn ||
                actor.currentActivity,
            currentIntent:
                update?.currentIntent ||
                update?.currentIntentEn ||
                actor.currentIntent,
            firstImpressionOfPlayerEn:
                profile
                    ?.firstImpressionOfPlayerEn ||
                actor
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    ?.firstImpressionOfPlayer ||
                actor
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile
                    ?.firstImpressionClock ||
                actor.firstImpressionClock,
            firstImpressionTurn:
                profile
                    ?.firstImpressionTurn ||
                actor.firstImpressionTurn,
            firstImpressionPending:
                profile
                    ?.firstImpressionPending ||
                false,
            impressionOfPlayerEn:
                profile?.impressionOfPlayerEn ||
                actor.impressionOfPlayerEn,
            impressionOfPlayer:
                profile?.impressionOfPlayer ||
                actor.impressionOfPlayer,
            impressionUpdatedClock:
                profile?.impressionUpdatedClock ||
                actor.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile?.impressionUpdatedTurn ||
                actor.impressionUpdatedTurn,
            ...(actor.temporary
                ? {
                    temporaryMemories:
                        temporaryMemories ||
                        [],
                }
                : {}),
        };
    });
    next.items = applyItemUpdates(
        next,
        transaction.itemUpdates || [],
    );
    next = applyMaterialEvents(
        next,
        transaction.materialEvents || [],
        {
            clock: next.clock,
            turn: committedTurn,
        },
    );
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId:
                        next.map?.activeMapId,
                    roomId:
                        next.map
                            ?.currentLocalNodeId,
                },
            );
    }

    const existingClueIds = new Set((next.clues || []).map(clue => clue.id));
    const revealedClues = (transaction.revealedClues || [])
        .filter(clue => !existingClueIds.has(clue.id))
        .map(clue => ({
            ...clue,
            label: clue.label || clue.labelEn,
            detail: clue.detail || clue.detailEn,
            discovered: true,
            discoveredAt: next.clock,
        }));
    next.clues = [...(next.clues || []), ...revealedClues];
    const revealedIds = revealedClues.map(clue => clue.id);
    next.storyArcs = (next.storyArcs || []).map(arc => arc.status === 'active' ? {
        ...arc,
        revealedClueIds: [...new Set([...(arc.revealedClueIds || []), ...revealedIds])],
    } : arc);
    const timelineEntry = {
        clock: next.clock,
        label: transaction.publicEvent || transaction.publicEventEn,
    };
    next.timeline = [
        ...(next.timeline || []),
        timelineEntry,
    ].slice(-20);
    if (next.scene) {
        next.scene.timelineEntries = [
            ...(next.scene.timelineEntries || []),
            timelineEntry,
        ];
    }
    const lastReviewedTurn =
        Number(
            next.memoryDirector
                ?.lastReviewedTurn ||
            0,
        );
    const hasUnreviewedMemory =
        (next.actorLibrary || [])
            .some(profile =>
                getActorMemoryEntries(
                    profile,
                ).some(memory =>
                    Number(
                        memory.updatedTurn ||
                        0,
                    ) >
                    lastReviewedTurn));
    if (
        transaction.eventEnded ===
            true
    ) {
        next.memoryDirector = {
            ...(next.memoryDirector ||
                {}),
            status: 'idle',
            error: '',
            triggerMode:
                'event_boundary',
            pendingEventBoundary: {
                id: `${
                    next.scene?.id ||
                    'scene'
                }:event:${committedTurn}`,
                status: 'pending',
                sceneId:
                    next.scene?.id ||
                    '',
                turn: committedTurn,
                clock: next.clock,
                publicEventEn:
                    transaction
                        .publicEventEn,
                hasUnreviewedMemory,
                intentRefreshed:
                    false,
                intentRefreshStatus:
                    'pending',
            },
        };
        delete next.memoryDirector
            .reviewAfterTurns;
    }
    next.turn = {
        count: committedTurn,
        status: 'idle',
        error: '',
        lastElapsedMinutes: elapsedMinutes,
        lastResolvedAt: new Date().toISOString(),
    };
    next =
        settleSpellProgress(
            next,
            playerAction,
            transaction,
        );
    return migrateActorPresentationState(
        next,
    ).state;
}
