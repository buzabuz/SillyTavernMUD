// Extracted from the helpers compatibility facade for Task 4.

import {
    countTextWords,
    IMPRESSION_UPDATE_COOLDOWN_TURNS,
    isValidFirstImpression,
    isValidImpressionShorthand,
    normalizeActorMemoryProfile,
} from './actor-memory.js';

import {
    getLocalMapDefinition,
} from './map-access.js';

import {
    findLocalRoomPath,
} from './pathfinding.js';

import {
    inferActorRoomId,
} from './spatial-foundation.js';

import {
    buildSpatialContext,
} from './spatial-reconciliation.js';

import {
    memoryFingerprint,
} from './stable-identity.js';

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
                if (
                    update
                        .impressionOfPlayerEn !=
                    null
                ) {
                    const proposed =
                        String(
                            update
                                .impressionOfPlayerEn ||
                            '',
                        ).trim();
                    const previous =
                        String(
                            profile
                                .impressionOfPlayerEn ||
                            '',
                        ).trim();
                    const turnsSinceUpdate =
                        Math.max(
                            0,
                            Number(
                                worldState.turn
                                    ?.count ||
                                0,
                            ) -
                            Number(
                                profile
                                    .impressionUpdatedTurn ||
                                0,
                            ),
                        );
                    const changesRecent =
                        Boolean(previous) &&
                        memoryFingerprint(
                            previous,
                        ) !==
                            memoryFingerprint(
                                proposed,
                            ) &&
                        turnsSinceUpdate <
                            IMPRESSION_UPDATE_COOLDOWN_TURNS;
                    const invalidImpression =
                        temporaryActorIds.has(
                            update.id,
                        ) ||
                        (
                            !spatial
                                ?.canSeePlayer &&
                            !spatial
                                ?.canHearPlayer
                        ) ||
                        !isValidImpressionShorthand(
                            proposed,
                        ) ||
                        changesRecent;
                    if (invalidImpression) {
                        delete update
                            .impressionOfPlayerEn;
                        delete update
                            .impressionOfPlayer;
                    }
                }
                if (update.memoryUpdate != null) {
                    const memory =
                        update.memoryUpdate;
                    const summary =
                        String(
                            memory
                                ?.summaryEn ||
                            '',
                        ).trim();
                    const significance =
                        String(
                            memory
                                ?.significance ||
                            '',
                        );
                    const lastingImpactEn =
                        String(
                            memory
                                ?.lastingImpactEn ||
                            '',
                        ).trim();
                    const unauthorizedKeys =
                        memory &&
                        typeof memory ===
                            'object' &&
                        !Array.isArray(memory)
                            ? Object.keys(
                                memory,
                            ).filter(key =>
                                ![
                                    'summaryEn',
                                    'significance',
                                    'lastingImpactEn',
                                ].includes(key))
                            : [];
                    const lacksWitness =
                        !temporaryActorIds
                            .has(update.id) &&
                        !spatial
                            ?.canSeePlayer &&
                        !spatial
                            ?.canHearPlayer;
                    const invalidMemory =
                        !memory ||
                        typeof memory !==
                            'object' ||
                        Array.isArray(memory) ||
                        lacksWitness ||
                        !summary ||
                        countTextWords(
                            summary,
                        ) > 40 ||
                        ![
                            'everyday',
                            'notable',
                        ].includes(
                            significance,
                        ) ||
                        (
                            significance ===
                                'notable' &&
                            (
                                !lastingImpactEn ||
                                countTextWords(
                                    lastingImpactEn,
                                ) > 24
                            )
                        ) ||
                        unauthorizedKeys
                            .length > 0;
                    if (invalidMemory) {
                        delete update.memoryUpdate;
                    }
                }
                return update;
            },
        );
    return sanitized;
}

export function ensureMentionedKnownActorMemories(
    payload,
    worldState,
    admittedActors = [],
) {
    const normalized =
        structuredClone(payload);
    if (!admittedActors.length) {
        return normalized;
    }
    normalized.actorUpdates =
        Array.isArray(
            normalized.actorUpdates,
        )
            ? normalized.actorUpdates
            : [];
    normalized.actorPresence ??= {
        presentActorIdsAfterTurn: [],
    };
    normalized.actorPresence
        .presentActorIdsAfterTurn =
        Array.isArray(
            normalized.actorPresence
                .presentActorIdsAfterTurn,
        )
            ? normalized.actorPresence
                .presentActorIdsAfterTurn
            : [];
    const runtimeActors = new Map(
        (
            worldState.actors || []
        ).map(actor => [
            actor.id,
            actor,
        ]),
    );
    admittedActors.forEach(
        admitted => {
            let update =
                normalized.actorUpdates
                    .find(item =>
                        item.id ===
                        admitted.id);
            if (!update) {
                const actor =
                    runtimeActors.get(
                        admitted.id,
                    ) || {};
                update = {
                    id: admitted.id,
                    present: true,
                    currentActivityEn:
                        actor
                            .currentActivityEn ||
                        'Responding to the player in the current scene.',
                    mapId:
                        actor.mapId ||
                        admitted.mapId,
                    roomId:
                        actor.roomId ||
                        admitted.roomId,
                };
                normalized.actorUpdates
                    .push(update);
            }
            if (
                admitted
                    .requireEverydayMemory &&
                !update.memoryUpdate
                    ?.summaryEn
            ) {
                const publicWords =
                    String(
                        normalized
                            .publicEventEn ||
                        '',
                    )
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);
                const publicSummary =
                    publicWords
                        .slice(0, 40)
                        .join(' ');
                update.memoryUpdate = {
                    summaryEn:
                        publicSummary ||
                        `The player directly acknowledged ${admitted.nameEn} during the current scene.`,
                    significance:
                        'everyday',
                };
            }
            if (
                update.present !==
                    false &&
                !normalized
                    .actorPresence
                    .presentActorIdsAfterTurn
                    .includes(
                        admitted.id,
                    )
            ) {
                normalized
                    .actorPresence
                    .presentActorIdsAfterTurn
                    .push(
                        admitted.id,
                    );
            }
        },
    );
    return normalized;
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
                if (
                    update
                        .impressionOfPlayerEn !=
                    null
                ) {
                    const proposed =
                    String(
                        update
                            .impressionOfPlayerEn ||
                        '',
                    ).trim();
                    const previous =
                    String(
                        profile
                            .impressionOfPlayerEn ||
                        '',
                    ).trim();
                    const turnsSinceUpdate =
                    Math.max(
                        0,
                        Number(
                            worldState.turn
                                ?.count ||
                            0,
                        ) -
                        Number(
                            profile
                                .impressionUpdatedTurn ||
                            0,
                        ),
                    );
                    if (
                        previous &&
                    memoryFingerprint(
                        previous,
                    ) !==
                        memoryFingerprint(
                            proposed,
                        ) &&
                    turnsSinceUpdate <
                        IMPRESSION_UPDATE_COOLDOWN_TURNS
                    ) {
                        delete update
                            .impressionOfPlayerEn;
                        delete update
                            .impressionOfPlayer;
                    }
                }
                if (
                    update.memoryUpdate &&
                ![
                    'everyday',
                    'notable',
                ].includes(
                    update.memoryUpdate
                        .significance,
                )
                ) {
                    const significance = String(
                        update.memoryUpdate
                            .significance || '',
                    ).toLocaleLowerCase();
                    if (
                        /^(?:important|major|notable|recent|significant)$/
                            .test(significance)
                    ) {
                        update.memoryUpdate.significance =
                        'notable';
                    } else if (
                        /^(?:daily|everyday|minor|routine|small)$/
                            .test(significance)
                    ) {
                        update.memoryUpdate.significance =
                        'everyday';
                    }
                }
                const mapId = update.mapId || actor?.mapId ||
                worldState.map?.activeMapId;
                const actorRoomId = actor?.roomId ||
                worldState.map?.currentLocalNodeId;
                const fallbackRoomId =
                update.roomId || actorRoomId;
                const inferredRoomId = inferActorRoomId(
                    update,
                    getLocalMapDefinition(mapId, worldState.map),
                    fallbackRoomId,
                );
                if (!inferredRoomId ||
                inferredRoomId === update.roomId ||
                !findLocalRoomPath(
                    mapId,
                    actorRoomId,
                    inferredRoomId,
                    worldState.map,
                )) {
                    return update;
                }
                return {
                    ...update,
                    mapId,
                    roomId: inferredRoomId,
                };
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
