// Extracted from the helpers compatibility facade for Task 4.

import {
    createSceneItemStates,
    normalizeInventoryItem,
} from './inventory.js';

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

import {
    findLocalRoomPath,
} from './pathfinding.js';

import {
    findSceneDestination,
    formatSceneLocationId,
} from './scene-destination.js';

import {
    EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN,
    GUIDED_MOVEMENT_ACTION_PATTERN,
    MOVEMENT_ACTION_PATTERN,
    normalizeSpatialText,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

function getExplicitMovementCompanionIds(
    worldState,
    action,
    allowedRoomIds = null,
) {
    const movementText = String(action || '')
        .split(/[\n。！？!?]+/)
        .filter(clause =>
            MOVEMENT_ACTION_PATTERN.test(clause) ||
            GUIDED_MOVEMENT_ACTION_PATTERN
                .test(clause) ||
            Boolean(
                findSceneDestination(
                    clause,
                    worldState,
                ),
            ))
        .join(' ');
    if (!movementText) return [];
    const normalizedMovement =
        normalizeSpatialText(movementText);
    const currentMapId = String(
        worldState.map?.activeMapId || '',
    );
    const currentRoomId = String(
        worldState.map?.currentLocalNodeId || '',
    );
    const allowedRooms = new Set(
        Array.isArray(allowedRoomIds) &&
            allowedRoomIds.length
            ? allowedRoomIds
            : [currentRoomId],
    );
    const profiles = new Map(
        (worldState.actorLibrary || []).map(
            profile => [profile.id, profile],
        ),
    );
    return (worldState.actors || [])
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || currentMapId) ===
                currentMapId &&
            allowedRooms.has(
                actor.roomId || currentRoomId,
            ))
        .filter(actor => {
            const profile =
                profiles.get(actor.id) || {};
            const relationship = [
                actor.relationshipToPlayerEn,
                actor.relationshipToPlayer,
                profile.relationshipToPlayerEn,
                profile.relationshipToPlayer,
            ].filter(Boolean).join(' ');
            const familyAliases =
                /(?:father|dad|父亲|爸爸)/i
                    .test(relationship)
                    ? ['爸爸', '我爸', '父亲', 'dad', 'father']
                    : /(?:mother|mum|mom|母亲|妈妈)/i
                        .test(relationship)
                        ? ['妈妈', '我妈', '母亲', 'mum', 'mom', 'mother']
                        : [];
            return [
                actor.id,
                actor.name,
                actor.nameEn,
                profile.name,
                profile.nameEn,
                ...(actor.aliases || []),
                ...(profile.aliases || []),
                ...familyAliases,
            ]
                .map(normalizeSpatialText)
                .filter(alias => alias.length >= 2)
                .some(alias =>
                    normalizedMovement.includes(alias));
        })
        .map(actor => actor.id);
}

export function isGuidedMovementAction(
    playerAction,
) {
    const action = String(playerAction || '');
    return GUIDED_MOVEMENT_ACTION_PATTERN
        .test(action);
}

export function parseExplicitMovementDirective(
    playerAction,
) {
    const action = String(playerAction || '');
    const match = action.match(
        EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN,
    );
    const destinationText = String(
        match?.[1] || match?.[2] || '',
    ).trim();
    if (
        !match ||
        !destinationText
    ) {
        return null;
    }
    return {
        raw: match[0],
        marker:
            match[0].trim()
                .startsWith('->')
                ? '->'
                : '→',
        destinationText,
        start: match.index,
        end:
            Number(match.index || 0) +
            match[0].length,
    };
}

export function removeExplicitMovementDirective(
    playerAction,
) {
    const action = String(playerAction || '');
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    if (!directive) return action;
    return (
        action.slice(
            0,
            directive.start,
        ) +
        action.slice(
            directive.end,
        )
    )
        .replace(
            /^[ \t]*\n/,
            '',
        )
        .replace(
            /\n{3,}/g,
            '\n\n',
        )
        .trim();
}

export function inspectPlayerMovementIntent(
    worldState,
    playerAction,
) {
    const action = String(playerAction || '');
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    const destination =
        findSceneDestination(
            directive?.destinationText ||
                action,
            worldState,
        );
    const guided =
        isGuidedMovementAction(action);
    const candidate = Boolean(
        directive ||
        destination ||
        guided ||
        MOVEMENT_ACTION_PATTERN.test(
            action,
        ),
    );
    return {
        explicit: Boolean(directive),
        directive,
        destination,
        guided,
        candidate,
        confirmationRequired:
            candidate &&
            !directive,
    };
}

export function applyPlayerMovement(
    worldState,
    playerAction,
    options = {},
) {
    const action = String(playerAction || '');
    const intent =
        inspectPlayerMovementIntent(
            worldState,
            action,
        );
    const confirmedDestination =
        options.confirmedDestination
            ? structuredClone(
                options
                    .confirmedDestination,
            )
            : null;
    const confirmed =
        intent.explicit ||
        options.confirmed === true ||
        Boolean(
            confirmedDestination,
        );
    if (!confirmed) {
        return {
            state: worldState,
            movement: null,
        };
    }
    const requestedDestination =
        confirmedDestination ||
        intent.destination;
    const guided = intent.guided;
    const rawDestination =
        requestedDestination ||
        (
            guided &&
            options.guidedDestination
                ? structuredClone(
                    options.guidedDestination,
                )
                : null
        );
    const destinationMap =
        rawDestination
            ? getLocalMapDefinition(
                rawDestination.mapId,
                worldState.map,
            )
            : null;
    const destinationRoom =
        rawDestination
            ? getMapRooms(
                destinationMap,
                worldState.map,
            ).find(room =>
                room.id ===
                    rawDestination.roomId)
            : null;
    const catalogDestination =
        rawDestination
            ? findSceneDestination(
                rawDestination.roomId,
                worldState,
            )
            : null;
    const catalogRoomNameEn =
        catalogDestination &&
        catalogDestination.mapId ===
            rawDestination?.mapId
            ? catalogDestination
                .roomNameEn
            : '';
    const suppliedRoomNameEn =
        String(
            rawDestination
                ?.roomNameEn || '',
        );
    const destination =
        rawDestination
            ? {
                ...rawDestination,
                roomName:
                    rawDestination.roomName ||
                    destinationRoom?.name ||
                    destinationRoom?.nameEn,
                roomNameEn:
                    destinationRoom?.nameEn ||
                    (
                        /[a-z]/i.test(
                            suppliedRoomNameEn,
                        )
                            ? suppliedRoomNameEn
                            : catalogRoomNameEn
                    ) ||
                    formatSceneLocationId(
                        destinationRoom?.id,
                    ) ||
                    rawDestination.roomName,
                levelId:
                    rawDestination.levelId ||
                    destinationRoom?.levelId,
            }
            : null;
    const guidance = guided
        ? {
            guided: true,
            guidedByActorId:
                options.guidedByActorId || '',
            destinationSource:
                intent.explicit &&
                    requestedDestination
                    ? 'player_marker'
                    : confirmedDestination
                        ? 'stored_confirmation'
                        : destination
                            ? 'guide_context'
                            : 'unresolved',
        }
        : {};
    const confirmation = {
        confirmed: true,
        confirmationSource:
            intent.explicit
                ? 'player_marker'
                : confirmedDestination
                    ? 'stored_movement'
                    : 'internal',
    };
    if (!destination) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                ...confirmation,
                ...guidance,
                reason: guided
                    ? 'guide_destination_unknown'
                    : 'no_known_destination',
            },
        };
    }
    const mapId = String(worldState.map?.activeMapId || '');
    const fromRoomId = String(worldState.map?.currentLocalNodeId || '');
    let companionIds =
        getExplicitMovementCompanionIds(
            worldState,
            action,
        );
    const sourceMap = getLocalMapDefinition(
        mapId,
        worldState.map,
    );
    const sourceRoom = getMapRooms(
        sourceMap,
        worldState.map,
    ).find(room => room.id === fromRoomId);
    const destinationNameEn =
        destination.roomNameEn ||
        destination.roomName ||
        destination.roomId;
    if (destination.mapId !== mapId) {
        const bindings =
            worldState.map
                ?.interiorMapBindings ||
            {};
        const exitsBoundInterior =
            Boolean(
                sourceMap
                    ?.sourceContainerKey,
            ) &&
            sourceMap.parentMapId ===
                destination.mapId &&
            bindings[
                sourceMap
                    .sourceContainerKey
            ] === mapId;
        const entersBoundInterior =
            Boolean(
                destinationMap
                    ?.sourceContainerKey,
            ) &&
            destinationMap.parentMapId ===
                mapId &&
            bindings[
                destinationMap
                    .sourceContainerKey
            ] === destination.mapId;
        const bridgeMapId =
            exitsBoundInterior
                ? destination.mapId
                : entersBoundInterior
                    ? mapId
                    : '';
        const bridgeFromRoomId =
            exitsBoundInterior
                ? sourceMap.parentRoomId
                : fromRoomId;
        const bridgeToRoomId =
            exitsBoundInterior
                ? destination.roomId
                : destinationMap
                    ?.parentRoomId;
        const bridgePath =
            bridgeMapId &&
            bridgeFromRoomId &&
            bridgeToRoomId
                ? bridgeFromRoomId ===
                    bridgeToRoomId
                    ? {
                        roomIds: [
                            bridgeFromRoomId,
                        ],
                        routes: [],
                        minutes: 0,
                    }
                    : findLocalRoomPath(
                        bridgeMapId,
                        bridgeFromRoomId,
                        bridgeToRoomId,
                        worldState.map,
                        {
                            allowedConditions: [
                                'wizard_intent',
                            ],
                        },
                    )
                : null;
        if (
            (
                exitsBoundInterior ||
                entersBoundInterior
            ) &&
            bridgePath
        ) {
            const next =
                structuredClone(
                    worldState,
                );
            const routeRoomIds = [
                ...(exitsBoundInterior
                    ? [fromRoomId]
                    : []),
                ...bridgePath.roomIds,
                ...(entersBoundInterior
                    ? [
                        destination
                            .roomId,
                    ]
                    : []),
            ].filter((roomId, index, rooms) =>
                roomId &&
                roomId !==
                    rooms[index - 1]);
            next.map.activeMapId =
                destination.mapId;
            next.map.currentLocalNodeId =
                destination.roomId;
            next.map.currentLevelId =
                destination.levelId ||
                destinationMap
                    ?.defaultLevelId;
            next.map.discoveredLocalNodeIds =
                [...new Set([
                    ...(
                        next.map
                            .discoveredLocalNodeIds ||
                        []
                    ),
                    `${destination.mapId}:${destination.roomId}`,
                ])];
            next.location =
                destination.roomName ||
                destination.roomNameEn ||
                next.location;
            if (next.scene) {
                next.scene.mapId =
                    destination.mapId;
                next.scene.roomId =
                    destination.roomId;
            }
            next.items =
                (next.items || [])
                    .map((item, index) => {
                        const normalized =
                            normalizeInventoryItem(
                                item,
                                index,
                                {
                                    mapId:
                                        destination
                                            .mapId,
                                    roomId:
                                        destination
                                            .roomId,
                                    clock:
                                        next.clock,
                                },
                            );
                        return normalized
                            .ownerId ===
                                'player' &&
                            [
                                'carried',
                                'equipped',
                            ].includes(
                                normalized
                                    .custody,
                            )
                            ? {
                                ...normalized,
                                mapId:
                                    destination
                                        .mapId,
                                roomId:
                                    destination
                                        .roomId,
                            }
                            : normalized;
                    });
            if (next.scene) {
                next.scene.itemStates =
                    createSceneItemStates(
                        next.items,
                        {
                            mapId:
                                destination
                                    .mapId,
                            roomId:
                                destination
                                    .roomId,
                        },
                    );
            }
            if (companionIds.length) {
                const companions =
                    new Set(
                        companionIds,
                    );
                next.actors =
                    (next.actors || [])
                        .map(actor =>
                            companions
                                .has(
                                    actor.id,
                                ) &&
                            (
                                actor.mapId ||
                                mapId
                            ) === mapId &&
                            (
                                actor.roomId ||
                                fromRoomId
                            ) === fromRoomId
                                ? {
                                    ...actor,
                                    mapId:
                                        destination
                                            .mapId,
                                    roomId:
                                        destination
                                            .roomId,
                                }
                                : actor);
            }
            const movement = {
                attempted: true,
                moved: true,
                fromMapId: mapId,
                fromRoomId,
                toMapId:
                    destination.mapId,
                toRoomId:
                    destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn:
                    destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                path: routeRoomIds,
                minutes: Math.max(
                    1,
                    Number(
                        bridgePath.minutes ||
                        0,
                    ),
                ),
                bridge:
                    exitsBoundInterior
                        ? 'interior_to_parent'
                        : 'parent_to_interior',
                committedAt:
                    new Date()
                        .toISOString(),
            };
            next.spatial = {
                ...(next.spatial || {}),
                version:
                    SPATIAL_STATE_VERSION,
                player: {
                    mapId:
                        destination.mapId,
                    roomId:
                        destination.roomId,
                },
                lastMovement:
                    movement,
            };
            return {
                state: next,
                movement,
            };
        }
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                requiresSceneTransition: true,
                fromMapId: mapId,
                fromRoomId,
                toMapId: destination.mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                reason: 'different_local_map',
            },
        };
    }
    const allowedConditions = [
        'wizard_intent',
    ];
    const hasSchoolTravelAuthority =
        (worldState.items || []).some(item =>
            item.ownerId === 'player' &&
            ['carried', 'equipped']
                .includes(item.custody) &&
            (
                item.id ===
                    'acceptance_letter' ||
                /(?:acceptance|school letter|train ticket|录取通知|车票)/i
                    .test(
                        `${item.labelEn || ''} ${item.label || ''}`,
                    )
            ));
    if (
        [
            fromRoomId,
            destination.roomId,
        ].includes(
            'hogwarts_express',
        ) &&
        (
            hasSchoolTravelAuthority ||
            /(?:霍格沃茨特快|霍格沃茨列车|开学列车|hogwarts express|train to hogwarts)/i
                .test(action)
        )
    ) {
        allowedConditions.push(
            'valid_school_travel',
        );
    }
    const path = findLocalRoomPath(
        mapId,
        fromRoomId,
        destination.roomId,
        worldState.map,
        { allowedConditions },
    );
    if (!path) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                fromMapId: mapId,
                fromRoomId,
                toMapId: destination.mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                reason: 'no_passable_route',
            },
        };
    }
    companionIds = getExplicitMovementCompanionIds(
        worldState,
        action,
        path.roomIds,
    );
    if (options.guidedByActorId) {
        const guide = (worldState.actors || [])
            .find(actor =>
                actor.id ===
                    options.guidedByActorId);
        if (
            guide &&
            (guide.mapId || mapId) === mapId &&
            path.roomIds.includes(
                guide.roomId || fromRoomId,
            )
        ) {
            companionIds = [...new Set([
                ...companionIds,
                guide.id,
            ])];
        }
    }
    if (fromRoomId === destination.roomId) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                fromMapId: mapId,
                fromRoomId,
                toMapId: mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                path: path.roomIds,
                minutes: 0,
                reason: 'already_there',
            },
        };
    }
    const next = structuredClone(worldState);
    next.map.currentLocalNodeId = destination.roomId;
    next.map.currentLevelId = destination.levelId ||
        getLocalMapDefinition(mapId, next.map)?.defaultLevelId;
    next.map.discoveredLocalNodeIds = [...new Set([
        ...(next.map.discoveredLocalNodeIds || []),
        `${mapId}:${destination.roomId}`,
    ])];
    next.location = destination.roomName || destination.roomNameEn ||
        next.location;
    if (next.scene) {
        next.scene.roomId = destination.roomId;
    }
    next.items = (next.items || [])
        .map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId,
                        roomId:
                            destination.roomId,
                        clock: next.clock,
                    },
                );
            return normalized.ownerId ===
                'player' &&
                ['carried', 'equipped']
                    .includes(
                        normalized.custody,
                    )
                ? {
                    ...normalized,
                    mapId,
                    roomId:
                        destination.roomId,
                }
                : normalized;
        });
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId,
                    roomId:
                        destination.roomId,
                },
            );
    }
    if (companionIds.length) {
        const companions = new Set(companionIds);
        const routeRooms = new Set(path.roomIds);
        next.actors = (next.actors || []).map(actor =>
            companions.has(actor.id) &&
            (actor.mapId || mapId) === mapId &&
            routeRooms.has(actor.roomId || fromRoomId)
                ? {
                    ...actor,
                    mapId,
                    roomId: destination.roomId,
                }
                : actor);
    }
    const movement = {
        attempted: true,
        moved: true,
        fromMapId: mapId,
        fromRoomId,
        toMapId: mapId,
        toRoomId: destination.roomId,
        fromRoomName:
            sourceRoom?.name ||
            sourceRoom?.nameEn ||
            fromRoomId,
        toRoomName:
            destination.roomName ||
            destination.roomNameEn ||
            destination.roomId,
        toRoomNameEn: destinationNameEn,
        companionIds,
        ...confirmation,
        ...guidance,
        path: path.roomIds,
        minutes: path.minutes,
        committedAt: new Date().toISOString(),
    };
    next.spatial = {
        ...(next.spatial || {}),
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId,
            roomId: destination.roomId,
        },
        lastMovement: movement,
    };
    return { state: next, movement };
}

export function resolvePlayerMovement(
    worldState,
    playerAction,
    storedMovement = null,
    options = {},
) {
    if (storedMovement?.moved !== true) {
        return applyPlayerMovement(
            worldState,
            playerAction,
            options,
        );
    }

    const correctedGuidedDestination =
        storedMovement.guided === true &&
        storedMovement.destinationSource ===
            'guide_context' &&
        options.guidedDestination &&
        (
            options.guidedDestination.mapId !==
                storedMovement.toMapId ||
            options.guidedDestination.roomId !==
                storedMovement.toRoomId
        );
    const replayBase = structuredClone(worldState);
    replayBase.map ??= {};
    replayBase.map.activeMapId =
        storedMovement.fromMapId ||
        replayBase.map.activeMapId;
    replayBase.map.currentLocalNodeId =
        storedMovement.fromRoomId ||
        replayBase.map.currentLocalNodeId;
    replayBase.spatial = {
        ...(replayBase.spatial || {}),
        player: {
            mapId:
                replayBase.map.activeMapId,
            roomId:
                replayBase.map.currentLocalNodeId,
        },
    };
    if (correctedGuidedDestination) {
        const staleCompanionIds = new Set([
            ...(storedMovement.companionIds || []),
            storedMovement.guidedByActorId,
        ].filter(Boolean));
        replayBase.actors = (
            replayBase.actors || []
        ).map(actor =>
            staleCompanionIds.has(actor.id) &&
            (actor.mapId ||
                storedMovement.toMapId) ===
                storedMovement.toMapId &&
            (actor.roomId ||
                storedMovement.toRoomId) ===
                storedMovement.toRoomId
                ? {
                    ...actor,
                    mapId:
                        storedMovement.fromMapId,
                    roomId:
                        storedMovement.fromRoomId,
                }
                : actor);
    }
    const replayDestination =
        correctedGuidedDestination
            ? options.guidedDestination
            : {
                mapId:
                    storedMovement.toMapId,
                roomId:
                    storedMovement.toRoomId,
                roomName:
                    storedMovement.toRoomName,
                roomNameEn:
                    storedMovement.toRoomNameEn,
            };
    const replayed = applyPlayerMovement(
        replayBase,
        playerAction,
        {
            ...options,
            confirmed: true,
            confirmedDestination:
                replayDestination,
        },
    );
    if (
        correctedGuidedDestination &&
        replayed.movement?.moved === true &&
        replayed.movement.toMapId ===
            options.guidedDestination.mapId &&
        replayed.movement.toRoomId ===
            options.guidedDestination.roomId
    ) {
        return replayed;
    }
    const sameDestination =
        replayed.movement?.moved === true &&
        replayed.movement.toMapId ===
            storedMovement.toMapId &&
        replayed.movement.toRoomId ===
            storedMovement.toRoomId;
    if (sameDestination) {
        return {
            state: replayed.state,
            movement: {
                ...structuredClone(storedMovement),
                ...replayed.movement,
                companionIds: [...new Set([
                    ...(storedMovement.companionIds || []),
                    ...(replayed.movement.companionIds || []),
                ])],
                committedAt:
                    storedMovement.committedAt ||
                    replayed.movement.committedAt,
            },
        };
    }

    const alreadyCommitted =
        worldState.map?.activeMapId ===
            storedMovement.toMapId &&
        worldState.map?.currentLocalNodeId ===
            storedMovement.toRoomId;
    if (alreadyCommitted) {
        return {
            state: worldState,
            movement:
                structuredClone(storedMovement),
        };
    }
    return applyPlayerMovement(
        worldState,
        playerAction,
        {
            ...options,
            confirmed: true,
            confirmedDestination:
                replayDestination,
        },
    );
}
