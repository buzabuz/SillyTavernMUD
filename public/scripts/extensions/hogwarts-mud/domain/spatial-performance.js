// Extracted from the helpers compatibility facade for Task 4.

import {
    isValidFirstImpression,
    normalizeActorMemoryProfile,
} from './actor-memory.js';

import {
    buildSpatialContext,
} from './spatial-reconciliation.js';

export function sanitizeScenePerformanceActorMetadata(
    payload,
    worldState,
) {
    const sanitized =
        structuredClone(payload);
    if (!Array.isArray(
        sanitized?.actorUpdates,
    )) {
        return sanitized;
    }
    const temporaryActorIds = new Set(
        (
            sanitized
                .temporaryActorEntrances ||
            []
        ).map(actor => actor.id),
    );
    const initialSpatialActors = new Map(
        buildSpatialContext(worldState)
            .actors.map(actor => [
                actor.id,
                actor,
            ]),
    );
    const actors = new Map(
        (worldState.actors || []).map(
            actor => [
                actor.id,
                actor,
            ],
        ),
    );
    const profiles = new Map(
        (
            worldState.actorLibrary ||
            []
        ).map(profile => [
            profile.id,
            profile,
        ]),
    );
    sanitized.actorUpdates =
        sanitized.actorUpdates.map(
            source => {
                const update = {
                    ...source,
                };
                const actor =
                    actors.get(update.id) ||
                    {};
                const profile =
                    normalizeActorMemoryProfile(
                        profiles.get(
                            update.id,
                        ) || {},
                        actor,
                    );
                let spatial =
                    initialSpatialActors.get(
                        update.id,
                    );
                if (
                    (
                        !spatial
                            ?.canSeePlayer ||
                        !spatial
                            ?.canHearPlayer
                    ) &&
                    (
                        update.mapId ||
                        update.roomId
                    ) &&
                    actors.has(update.id)
                ) {
                    const projectedState = {
                        ...worldState,
                        actors: (
                            worldState.actors ||
                            []
                        ).map(item =>
                            item.id ===
                                update.id
                                ? {
                                    ...item,
                                    mapId:
                                        update.mapId ||
                                        item.mapId,
                                    roomId:
                                        update.roomId ||
                                        item.roomId,
                                }
                                : item),
                    };
                    spatial =
                        buildSpatialContext(
                            projectedState,
                        ).actors.find(item =>
                            item.id ===
                            update.id);
                }
                if (
                    update
                        .firstImpressionOfPlayerEn !=
                    null
                ) {
                    const invalidFirst =
                        temporaryActorIds.has(
                            update.id,
                        ) ||
                        !spatial
                            ?.canSeePlayer ||
                        Boolean(
                            profile
                                .firstImpressionOfPlayerEn,
                        ) ||
                        !isValidFirstImpression(
                            update
                                .firstImpressionOfPlayerEn,
                        );
                    if (invalidFirst) {
                        delete update
                            .firstImpressionOfPlayerEn;
                        delete update
                            .firstImpressionOfPlayer;
                    }
                }
                return update;
            },
        );
    return sanitized;
}

export function normalizeScenePerformanceActorLocations(
    payload,
    worldState,
) {
    const normalized = structuredClone(payload);
    const actorUpdates =
        Array.isArray(
            normalized?.actorUpdates,
        )
            ? normalized.actorUpdates
            : [];
    if (Array.isArray(normalized?.actorUpdates)) {
        normalized.actorUpdates =
            normalized.actorUpdates.map(update => {
                const actor = (
                    worldState.actors || []
                ).find(item =>
                    item.id === update.id);
                const profile =
                normalizeActorMemoryProfile(
                    (
                        worldState
                            .actorLibrary ||
                        []
                    ).find(item =>
                        item.id ===
                            update.id) ||
                    {},
                    actor || {},
                );
                if (
                    update
                        .firstImpressionOfPlayerEn &&
                profile
                    .firstImpressionOfPlayerEn
                ) {
                    delete update
                        .firstImpressionOfPlayerEn;
                    delete update
                        .firstImpressionOfPlayer;
                }
                return update;
            });
    }
    if (
        normalized.actorPresence ==
            null
    ) {
        const initiallyPresent =
            new Set(
                (worldState.actors || [])
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id),
            );
        const temporaryIds =
            new Set(
                (
                    normalized
                        .temporaryActorEntrances ||
                    []
                ).map(actor =>
                    actor.id),
            );
        actorUpdates.forEach(update => {
            if (
                update.present ===
                false
            ) {
                initiallyPresent.delete(
                    update.id,
                );
            } else if (
                update.present ===
                    true &&
                temporaryIds.has(
                    update.id,
                )
            ) {
                initiallyPresent.add(
                    update.id,
                );
            }
        });
        normalized.actorPresence = {
            presentActorIdsAfterTurn:
                [...initiallyPresent],
        };
    }
    return sanitizeScenePerformanceActorMetadata(
        normalized,
        worldState,
    );
}
