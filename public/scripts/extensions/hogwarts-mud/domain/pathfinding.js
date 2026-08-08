// Extracted from the helpers compatibility facade for Task 4.

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

import {
    getMapExits,
} from './spatial-foundation.js';

export function isRoutePassable(
    mapId,
    route,
    mapState = {},
    options = {},
) {
    const runtime = mapState.exitStates?.[
        `${mapId}:${route.from}->${route.to}`
    ];
    const allowedConditions = new Set(
        options.allowedConditions || [],
    );
    return runtime?.blocked !== true &&
        (route.conditions || []).every(
            condition =>
                allowedConditions.has(
                    condition,
                ),
        );
}

export function findLocalRoomPath(
    mapId,
    fromRoomId,
    toRoomId,
    mapState = {},
    options = {},
) {
    const map = getLocalMapDefinition(mapId, mapState);
    const rooms = getMapRooms(map, mapState);
    const roomIds = new Set(rooms.map(room => room.id));
    if (!roomIds.has(fromRoomId) || !roomIds.has(toRoomId)) {
        return null;
    }
    if (fromRoomId === toRoomId) {
        return { roomIds: [fromRoomId], routes: [], minutes: 0 };
    }
    const adjacency = new Map();
    const addRoute = route => {
        if (
            !adjacency.has(
                route.from,
            )
        ) {
            adjacency.set(
                route.from,
                [],
            );
        }
        adjacency.get(route.from)
            .push(route);
    };
    getMapExits(map, mapState)
        .forEach(route => {
            if (
                isRoutePassable(
                    mapId,
                    route,
                    mapState,
                    options,
                )
            ) {
                addRoute(route);
            }
            if (route.oneWay === true) {
                return;
            }
            const reverseRoute = {
                ...route,
                from: route.to,
                to: route.from,
                conditions:
                    route
                        .reverseConditions ??
                    route.conditions,
                reversed: true,
            };
            if (
                isRoutePassable(
                    mapId,
                    reverseRoute,
                    mapState,
                    options,
                )
            ) {
                addRoute(
                    reverseRoute,
                );
            }
        });
    const queue = [{
        roomId: fromRoomId,
        roomIds: [fromRoomId],
        routes: [],
        minutes: 0,
    }];
    const visited = new Set([fromRoomId]);
    while (queue.length) {
        const current = queue.shift();
        for (const route of adjacency.get(current.roomId) || []) {
            if (visited.has(route.to)) continue;
            const next = {
                roomId: route.to,
                roomIds: [...current.roomIds, route.to],
                routes: [...current.routes, route],
                minutes: current.minutes + Math.max(0, Number(route.minutes || 1)),
            };
            if (route.to === toRoomId) {
                return {
                    roomIds: next.roomIds,
                    routes: next.routes,
                    minutes: next.minutes,
                };
            }
            visited.add(route.to);
            queue.push(next);
        }
    }
    return null;
}
