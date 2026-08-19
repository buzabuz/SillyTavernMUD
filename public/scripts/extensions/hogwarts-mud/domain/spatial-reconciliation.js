// Extracted from the helpers compatibility facade for Task 4.

import {
    createSceneItemStates,
    synchronizeHeldItemLocations,
} from './inventory.js';

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

import {
    applyPlayerMovement,
    parseExplicitMovementDirective,
} from './movement.js';

import {
    findLocalRoomPath,
    isRoutePassable,
} from './pathfinding.js';

import {
    findExplicitRoomReference,
} from './scene-destination.js';

import {
    ACTOR_MOVEMENT_HISTORY_VERSION,
    getMapExits,
    normalizeSpatialText,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

export function reconcileSpatialState(
    worldState,
    recentPlayerAction = '',
    options = {},
) {
    let next = structuredClone(worldState);
    let changed = false;
    const previousSpatialVersion = Number(
        worldState.spatial?.version || 0,
    );
    next.map ??= {};
    const mapId = String(next.map?.activeMapId || '');
    const map = getLocalMapDefinition(mapId, next.map);
    const rooms = getMapRooms(map, next.map);
    const roomIds = new Set(rooms.map(room => room.id));
    const previousPlayerRoomId = String(
        next.map.currentLocalNodeId || '',
    );
    const sceneOpeningText = String(
        options.sceneOpeningText || '',
    ).trim();
    const openingGroundingVersion =
        Number(
            worldState.spatial
                ?.openingGroundingVersion ||
            0,
        );
    const hasCommittedSceneMovement =
        worldState.spatial
            ?.lastMovement?.moved === true;
    const needsOpeningGrounding =
        Boolean(sceneOpeningText) &&
        openingGroundingVersion < 1 &&
        !hasCommittedSceneMovement;
    let locationRepair = null;
    if (
        needsOpeningGrounding
    ) {
        const openingRoom =
            findExplicitRoomReference(
                sceneOpeningText,
                map,
                next.map,
            );
        if (
            openingRoom &&
            openingRoom.id !==
                previousPlayerRoomId
        ) {
            next.map.currentLocalNodeId =
                openingRoom.id;
            next.map.currentLevelId =
                openingRoom.levelId ||
                next.map.currentLevelId;
            next.map.discoveredLocalNodeIds =
                [...new Set([
                    ...(
                        next.map
                            .discoveredLocalNodeIds ||
                        []
                    ),
                    `${mapId}:${openingRoom.id}`,
                ])];
            if (next.scene) {
                next.scene.mapId = mapId;
                next.scene.roomId =
                    openingRoom.id;
            }
            next.actors = (next.actors || [])
                .map(actor =>
                    actor.present !== false &&
                    (actor.mapId || mapId) ===
                        mapId &&
                    (
                        actor.roomId ||
                        previousPlayerRoomId
                    ) === previousPlayerRoomId
                        ? {
                            ...actor,
                            mapId,
                            roomId:
                                openingRoom.id,
                        }
                        : actor);
            next.items =
                synchronizeHeldItemLocations(
                    next.items,
                    {
                        playerMapId:
                            mapId,
                        playerRoomId:
                            openingRoom.id,
                        actors:
                            next.actors,
                        clock:
                            next.clock,
                    },
                );
            if (next.scene) {
                next.scene.itemStates =
                    createSceneItemStates(
                        next.items,
                        {
                            mapId,
                            roomId:
                                openingRoom.id,
                        },
                    );
            }
            locationRepair = {
                fromMapId: mapId,
                fromRoomId:
                    previousPlayerRoomId,
                toMapId: mapId,
                toRoomId: openingRoom.id,
                source:
                    'scene_opening_text',
            };
            changed = true;
        }
    }
    const fallbackRoomId = roomIds.has(next.map?.currentLocalNodeId)
        ? next.map.currentLocalNodeId
        : rooms[0]?.id || '';
    next.actors = (next.actors || []).map(actor => {
        if (
            actor.locationKnown ===
            false
        ) {
            if (
                actor.mapId ||
                actor.roomId ||
                actor.present ===
                    true
            ) {
                changed = true;
            }
            return {
                ...actor,
                mapId: '',
                roomId: '',
                present: false,
            };
        }
        const actorMapId = getLocalMapDefinition(actor.mapId, next.map)
            ? actor.mapId
            : mapId;
        const actorMap = getLocalMapDefinition(actorMapId, next.map);
        const actorRooms = new Set(
            getMapRooms(actorMap, next.map).map(room => room.id),
        );
        const roomId = actorRooms.has(actor.roomId)
            ? actor.roomId
            : fallbackRoomId;
        if (actor.mapId !== actorMapId || actor.roomId !== roomId) {
            changed = true;
        }
        return {
            ...actor,
            mapId: actorMapId,
            roomId,
        };
    });
    let movement = null;
    if (
        (
            !worldState.spatial?.version ||
            (
                previousSpatialVersion <
                    SPATIAL_STATE_VERSION &&
                Boolean(
                    parseExplicitMovementDirective(
                        recentPlayerAction,
                    ),
                ) &&
                worldState.spatial
                    ?.lastMovement
                    ?.moved !== true
            ) ||
            options.retryUnresolvedMovement === true
        ) &&
        recentPlayerAction
    ) {
        const result = applyPlayerMovement(
            next,
            recentPlayerAction,
            { confirmed: true },
        );
        next = result.state;
        movement = result.movement;
        changed ||= Boolean(movement?.moved);
    }
    const player = {
        mapId: String(next.map?.activeMapId || ''),
        roomId: String(next.map?.currentLocalNodeId || ''),
    };
    const nextOpeningGroundingVersion =
        sceneOpeningText &&
        (
            needsOpeningGrounding ||
            hasCommittedSceneMovement
        )
            ? 1
            : openingGroundingVersion;
    if (next.spatial?.version !==
            SPATIAL_STATE_VERSION ||
        next.spatial
            ?.openingGroundingVersion !==
            nextOpeningGroundingVersion ||
        next.spatial?.player?.mapId !== player.mapId ||
        next.spatial?.player?.roomId !== player.roomId) {
        changed = true;
    }
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        openingGroundingVersion:
            nextOpeningGroundingVersion,
        player,
        lastMovement: next.spatial?.lastMovement || movement || null,
    };
    return {
        state: next,
        changed,
        movement,
        locationRepair,
    };
}

function roomReferencesRoom(room, target) {
    const description = normalizeSpatialText(
        room?.descriptionEn ||
        '',
    );
    return [
        target?.id,
        target?.nameEn,
        ...(target?.aliases || []),
    ]
        .map(normalizeSpatialText)
        .filter(label => label.length >= 4)
        .some(label => description.includes(label));
}

export function buildSpatialContext(worldState) {
    const mapState = worldState.map || {};
    const playerMapId = String(mapState.activeMapId || '');
    const playerRoomId = String(mapState.currentLocalNodeId || '');
    const playerMap = getLocalMapDefinition(playerMapId, mapState);
    const playerRooms = getMapRooms(playerMap, mapState);
    const roomById = new Map(playerRooms.map(room => [room.id, room]));
    const playerRoom = roomById.get(playerRoomId);
    const actors = (worldState.actors || [])
        .filter(actor => actor.present !== false)
        .map(actor => {
            const actorMapId = actor.mapId || playerMapId;
            const actorRoomId = actor.roomId || playerRoomId;
            const actorRoom = actorMapId === playerMapId
                ? roomById.get(actorRoomId)
                : null;
            const sameRoom = actorMapId === playerMapId &&
                actorRoomId === playerRoomId;
            const directRoute = actorMapId === playerMapId &&
                getMapExits(playerMap, mapState).some(route =>
                    route.from === actorRoomId &&
                    route.to === playerRoomId &&
                    isRoutePassable(playerMapId, route, mapState));
            const describedSightline = actorMapId === playerMapId &&
                (roomReferencesRoom(actorRoom, playerRoom) ||
                    roomReferencesRoom(playerRoom, actorRoom));
            const path = actorMapId === playerMapId
                ? findLocalRoomPath(
                    playerMapId,
                    actorRoomId,
                    playerRoomId,
                    mapState,
                )
                : null;
            return {
                id: actor.id,
                nameEn: actor.nameEn,
                mapId: actorMapId,
                roomId: actorRoomId,
                roomNameEn:
                    actorRoom?.nameEn ||
                    actorRoomId,
                canSeePlayer: Boolean(
                    sameRoom || directRoute || describedSightline,
                ),
                canHearPlayer: Boolean(path && path.roomIds.length <= 3),
                visibilityReason: sameRoom
                    ? 'same_room'
                    : describedSightline
                        ? 'described_sightline'
                        : directRoute
                            ? 'adjacent_opening'
                            : 'none',
            };
        });
    return {
        player: {
            mapId: playerMapId,
            roomId: playerRoomId,
            roomNameEn:
                playerRoom?.nameEn ||
                playerRoomId,
        },
        actors,
    };
}

export function reconcileVisibleActorPresenceState(
    worldState,
) {
    const next =
        structuredClone(
            worldState,
        );
    const visibleActorIds =
        new Set(
            buildSpatialContext(
                next,
            ).actors
                .filter(actor =>
                    actor.canSeePlayer ||
                    actor.canHearPlayer)
                .map(actor =>
                    actor.id),
        );
    const removedActorIds = [];
    next.actors = (
        next.actors ||
        []
    ).map(actor => {
        if (
            actor.present === false ||
            visibleActorIds.has(
                actor.id,
            )
        ) {
            return actor;
        }
        removedActorIds.push(
            actor.id,
        );
        return {
            ...actor,
            present: false,
        };
    });
    return {
        state: next,
        changed:
            removedActorIds.length > 0,
        removedActorIds,
    };
}

export function migrateActorMovementHistory(
    worldState,
    chat = [],
) {
    if (
        Number(
            worldState
                .actorMovementHistoryVersion ||
            0,
        ) >=
        ACTOR_MOVEMENT_HISTORY_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const actorById =
        new Map(
            (
                next.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const profileById =
        new Map(
            (
                next.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const lastKnown =
        new Map();
    const actorIdsNamedIn =
        text => {
            const normalized =
                normalizeSpatialText(
                    text,
                );
            return [
                ...actorById.values(),
            ]
                .filter(actor => {
                    const profile =
                        profileById.get(
                            actor.id,
                        ) ||
                        {};
                    return [
                        actor.id,
                        actor.name,
                        actor.nameEn,
                        ...(actor.aliases ||
                            []),
                        profile.name,
                        profile.nameEn,
                        ...(profile.aliases ||
                            []),
                    ]
                        .map(
                            normalizeSpatialText,
                        )
                        .filter(alias =>
                            alias.length >=
                            2)
                        .some(alias =>
                            normalized
                                .includes(
                                    alias,
                                ));
                })
                .map(actor =>
                    actor.id);
        };
    for (
        const message
        of Array.isArray(chat)
            ? chat
            : []
    ) {
        const mud =
            message?.extra
                ?.hogwartsMud;
        if (
            message?.is_user &&
            mud?.movement?.moved ===
                true
        ) {
            const directive =
                parseExplicitMovementDirective(
                    message.mes,
                );
            const actorIds =
                new Set([
                    ...(
                        mud.movement
                            .companionIds ||
                        []
                    ),
                    ...actorIdsNamedIn(
                        directive
                            ?.destinationText ||
                        '',
                    ),
                ]);
            for (
                const actorId
                of actorIds
            ) {
                if (
                    actorById.has(
                        actorId,
                    )
                ) {
                    lastKnown.set(
                        actorId,
                        {
                            mapId:
                                mud
                                    .movement
                                    .toMapId,
                            roomId:
                                mud
                                    .movement
                                    .toRoomId,
                            currentActivityEn:
                                `Last known at ${
                                    mud
                                        .movement
                                        .toRoomNameEn ||
                                    mud
                                        .movement
                                        .toRoomName ||
                                    mud
                                        .movement
                                        .toRoomId
                                } after accompanying the player's explicit movement.`,
                        },
                    );
                }
            }
        }
        const transaction =
            mud?.turnTransaction;
        for (
            const update
            of transaction
                ?.actorUpdates ||
            []
        ) {
            if (
                actorById.has(
                    update.id,
                ) &&
                (
                    update.mapId ||
                    update.roomId
                )
            ) {
                const previous =
                    lastKnown.get(
                        update.id,
                    ) ||
                    actorById.get(
                        update.id,
                    );
                lastKnown.set(
                    update.id,
                    {
                        mapId:
                            update.mapId ||
                            previous
                                ?.mapId,
                        roomId:
                            update.roomId ||
                            previous
                                ?.roomId,
                        currentActivityEn:
                            update
                                .currentActivityEn ||
                            previous
                                ?.currentActivityEn,
                    },
                );
            }
        }
    }
    next.actors = (
        next.actors ||
        []
    ).map(actor => {
        const location =
            lastKnown.get(
                actor.id,
            );
        return location
            ? {
                ...actor,
                mapId:
                    location.mapId ||
                    actor.mapId,
                roomId:
                    location.roomId ||
                    actor.roomId,
                currentActivityEn:
                    location
                        .currentActivityEn ||
                    actor
                        .currentActivityEn,
            }
            : actor;
    });
    next.actorMovementHistoryVersion =
        ACTOR_MOVEMENT_HISTORY_VERSION;
    return {
        state: next,
        changed: true,
    };
}

export function reconcileTurnActorPresenceWithSpatialState(
    transaction,
    worldState,
) {
    const next =
        structuredClone(
            transaction,
        );
    const actorById =
        new Map(
            (
                worldState.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const updates =
        new Map(
            (
                next.actorUpdates ||
                []
            ).map(update => [
                update.id,
                update,
            ]),
        );
    const projectedState = {
        ...worldState,
        actors: (
            worldState.actors ||
            []
        ).map(actor => {
            const update =
                updates.get(
                    actor.id,
                );
            return update
                ? {
                    ...actor,
                    present:
                        update.present ??
                        actor.present,
                    mapId:
                        update.mapId ||
                        actor.mapId,
                    roomId:
                        update.roomId ||
                        actor.roomId,
                }
                : actor;
        }),
    };
    const visibleActorIds =
        new Set(
            buildSpatialContext(
                projectedState,
            ).actors
                .filter(actor =>
                    actor.canSeePlayer ||
                    actor.canHearPlayer)
                .map(actor =>
                    actor.id),
        );
    const temporaryActorIds =
        new Set(
            (
                next
                    .temporaryActorEntrances ||
                []
            ).map(actor =>
                actor.id),
        );
    const suppliedPresence =
        Array.isArray(
            next.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? next.actorPresence
                .presentActorIdsAfterTurn
            : (
                worldState.actors ||
                []
            )
                .filter(actor =>
                    actor.present !==
                        false)
                .map(actor =>
                    actor.id);
    const finalPresence = [];
    for (
        const actorId
        of new Set(
            suppliedPresence,
        )
    ) {
        const actor =
            actorById.get(
                actorId,
            );
        const update =
            updates.get(
                actorId,
            );
        if (
            temporaryActorIds
                .has(actorId) ||
            (
                actor &&
                update?.present !==
                    false &&
                visibleActorIds
                    .has(actorId)
            )
        ) {
            finalPresence.push(
                actorId,
            );
            continue;
        }
        if (
            !actor ||
            update?.present ===
                false
        ) {
            continue;
        }
        updates.set(
            actorId,
            {
                ...update,
                id: actorId,
                present: false,
                currentActivityEn:
                    update
                        ?.currentActivityEn ||
                    actor
                        .currentActivityEn ||
                    `Off-scene in ${
                        actor.roomId ||
                        'an unknown room'
                    }.`,
            },
        );
    }
    next.actorPresence = {
        presentActorIdsAfterTurn:
            finalPresence,
    };
    next.actorUpdates = [
        ...updates.values(),
    ];
    return next;
}
