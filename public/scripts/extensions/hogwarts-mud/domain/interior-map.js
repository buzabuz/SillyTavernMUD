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
    OPENING_ID_PATTERN,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

const INTERIOR_CONTAINER_KINDS =
    new Set([
        'train',
        'vehicle',
        'ship',
        'vessel',
        'carriage',
    ]);

export function getInteriorMapRequest(
    worldState,
) {
    const mapState = worldState.map || {};
    const parentMapId = String(
        mapState.activeMapId || '',
    );
    const parentRoomId = String(
        mapState.currentLocalNodeId || '',
    );
    const parentMap =
        getLocalMapDefinition(
            parentMapId,
            mapState,
        );
    if (
        !parentMap ||
        parentMap.sourceContainerKey ||
        !parentRoomId
    ) {
        return null;
    }
    const room = getMapRooms(
        parentMap,
        mapState,
    ).find(node =>
        node.id === parentRoomId);
    if (
        !room ||
        (
            !INTERIOR_CONTAINER_KINDS
                .has(room.kind) &&
            !(room.tags || []).includes(
                'requires_interior_map',
            )
        )
    ) {
        return null;
    }
    const bindingKey =
        `${parentMapId}:${parentRoomId}`;
    const boundMapId =
        mapState.interiorMapBindings
            ?.[bindingKey] || '';
    const boundMap = boundMapId
        ? getLocalMapDefinition(
            boundMapId,
            mapState,
        )
        : null;
    return {
        bindingKey,
        status: boundMap
            ? 'ready'
            : 'missing',
        parentMapId,
        parentRoomId,
        parentMapName:
            parentMap.name ||
            parentMap.nameEn ||
            parentMapId,
        parentMapNameEn:
            parentMap.nameEn ||
            parentMap.name ||
            parentMapId,
        parentWorldNodeId:
            parentMap
                .parentWorldNodeId ||
            parentMapId,
        parentRoomName:
            room.name ||
            room.nameEn ||
            parentRoomId,
        parentRoomNameEn:
            room.nameEn ||
            room.name ||
            parentRoomId,
        parentRoomKind:
            room.kind || 'container',
        parentRoomDescriptionEn:
            room.descriptionEn ||
            room.description ||
            '',
        suggestedMapId:
            `${parentMapId}_${parentRoomId}_interior`
                .replace(
                    /[^a-z0-9_]/g,
                    '_',
                )
                .slice(0, 63),
        boundMapId:
            boundMap?.id || '',
    };
}

export function normalizeGeneratedInteriorMapLabels(
    worldState,
) {
    let changed = false;
    const next =
        structuredClone(worldState);
    next.map.customLocalMaps =
        (next.map.customLocalMaps || [])
            .map(map => {
                if (
                    map.generatedBy !==
                        'medium-scene-director' ||
                    !map.parentMapId ||
                    !map.parentRoomId
                ) {
                    return map;
                }
                const parentMap =
                    getLocalMapDefinition(
                        map.parentMapId,
                        next.map,
                    );
                const parentRoom =
                    getMapRooms(
                        parentMap,
                        next.map,
                    ).find(room =>
                        room.id ===
                            map.parentRoomId);
                const isTrain =
                    parentRoom?.kind ===
                        'train';
                const normalizeLabel =
                    value => isTrain
                        ? String(value || '')
                            .replace(
                                /快速/g,
                                '特快',
                            )
                            .replace(
                                /马车/g,
                                '车厢',
                            )
                            .replace(
                                /登机/g,
                                '上车',
                            )
                        : String(
                            value || '',
                        );
                const name =
                    parentRoom?.name
                        ? `${parentRoom.name} · 内部`
                        : normalizeLabel(
                            map.name ||
                            map.nameEn,
                        );
                const levels =
                    (map.levels || [])
                        .map(level => ({
                            ...level,
                            name:
                                normalizeLabel(
                                    level.name ||
                                    level.nameEn,
                                ),
                        }));
                const nodes =
                    (map.nodes || [])
                        .map(node => ({
                            ...node,
                            name:
                                normalizeLabel(
                                    node.name ||
                                    node.nameEn,
                                ),
                        }));
                if (
                    name !== map.name ||
                    levels.some(
                        (level, index) =>
                            level.name !==
                            map.levels?.[
                                index
                            ]?.name) ||
                    nodes.some(
                        (node, index) =>
                            node.name !==
                            map.nodes?.[
                                index
                            ]?.name)
                ) {
                    changed = true;
                }
                return {
                    ...map,
                    name,
                    levels,
                    nodes,
                };
            });
    if (changed) {
        const activeMap =
            next.map.customLocalMaps
                .find(map =>
                    map.id ===
                        next.map.activeMapId);
        if (activeMap) {
            next.location =
                activeMap.name ||
                activeMap.nameEn ||
                next.location;
        }
    }
    return {
        state: changed
            ? next
            : worldState,
        changed,
    };
}

export function validateGeneratedInteriorMap(
    generatedMap,
    worldState,
    request =
    getInteriorMapRequest(
        worldState,
    ),
) {
    const errors = [];
    if (
        !request ||
        request.status !== 'missing'
    ) {
        return {
            valid: false,
            errors: [
                '当前地点不需要创建新的内部地图。',
            ],
        };
    }
    if (
        !generatedMap ||
        typeof generatedMap !== 'object' ||
        Array.isArray(generatedMap)
    ) {
        return {
            valid: false,
            errors: ['内部地图包必须是对象。'],
        };
    }
    if (
        generatedMap.version !== 1 ||
        !OPENING_ID_PATTERN.test(
            String(
                generatedMap.id || '',
            ),
        ) ||
        generatedMap.id !==
            request.suggestedMapId ||
        !String(
            generatedMap.nameEn || '',
        ).trim()
    ) {
        errors.push(
            '内部地图版本、稳定 ID 或英文名称无效。',
        );
    }
    if (
        getLocalMapDefinition(
            generatedMap.id,
            worldState.map,
        )
    ) {
        errors.push(
            '内部地图 ID 已被现有地图占用。',
        );
    }
    const levels = Array.isArray(
        generatedMap.levels,
    )
        ? generatedMap.levels
        : [];
    const rooms = Array.isArray(
        generatedMap.rooms,
    )
        ? generatedMap.rooms
        : [];
    const exits = Array.isArray(
        generatedMap.exits,
    )
        ? generatedMap.exits
        : [];
    if (
        levels.length < 1 ||
        levels.length > 4 ||
        rooms.length < 2 ||
        rooms.length > 16
    ) {
        errors.push(
            '内部地图必须包含 1–4 个分区和 2–16 个房间。',
        );
    }
    const levelIds = new Set();
    levels.forEach(level => {
        if (
            !OPENING_ID_PATTERN.test(
                String(level?.id || ''),
            ) ||
            levelIds.has(level.id) ||
            !String(
                level?.nameEn || '',
            ).trim()
        ) {
            errors.push(
                '内部地图分区 ID、名称无效或重复。',
            );
        }
        levelIds.add(level?.id);
    });
    const roomIds = new Set();
    rooms.forEach(room => {
        if (
            !OPENING_ID_PATTERN.test(
                String(room?.id || ''),
            ) ||
            roomIds.has(room.id) ||
            !levelIds.has(room.levelId) ||
            !String(
                room?.nameEn || '',
            ).trim() ||
            !String(
                room?.descriptionEn || '',
            ).trim()
        ) {
            errors.push(
                `内部房间 ${room?.id || '?'} 的 ID、名称、描述或分区无效。`,
            );
        }
        if (
            !Number.isFinite(room?.x) ||
            room.x < 5 ||
            room.x > 95 ||
            !Number.isFinite(room?.y) ||
            room.y < 5 ||
            room.y > 95
        ) {
            errors.push(
                `内部房间 ${room?.id || '?'} 坐标必须在 5–95。`,
            );
        }
        roomIds.add(room?.id);
    });
    if (
        !levelIds.has(
            generatedMap.currentLevelId,
        ) ||
        !roomIds.has(
            generatedMap.currentRoomId,
        )
    ) {
        errors.push(
            '内部地图的当前分区或当前房间不存在。',
        );
    }
    const adjacency = new Map(
        [...roomIds].map(id => [id, []]),
    );
    const exitKeys = new Set();
    exits.forEach(route => {
        const key =
            `${route?.from}->${route?.to}`;
        if (
            !roomIds.has(route?.from) ||
            !roomIds.has(route?.to) ||
            route.from === route.to ||
            exitKeys.has(key)
        ) {
            errors.push(
                '内部地图出口引用了无效、相同或重复的房间。',
            );
            return;
        }
        exitKeys.add(key);
        adjacency.get(route.from)
            .push(route.to);
        adjacency.get(route.to)
            .push(route.from);
    });
    if (
        roomIds.size &&
        exits.length < roomIds.size - 1
    ) {
        errors.push(
            '内部地图出口不足以连接全部房间。',
        );
    } else if (
        roomIds.has(
            generatedMap.currentRoomId,
        )
    ) {
        const visited = new Set([
            generatedMap.currentRoomId,
        ]);
        const queue = [
            generatedMap.currentRoomId,
        ];
        while (queue.length) {
            const current = queue.shift();
            for (
                const target of
                adjacency.get(current) ||
                    []
            ) {
                if (visited.has(target)) {
                    continue;
                }
                visited.add(target);
                queue.push(target);
            }
        }
        if (visited.size !== roomIds.size) {
            errors.push(
                '内部地图必须从当前房间连通全部房间。',
            );
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}

function enterInteriorMap(
    worldState,
    customMap,
    request,
) {
    const next =
        structuredClone(worldState);
    const displayMap =
        structuredClone(customMap);
    const normalizeTrainLabel = value =>
        request.parentRoomKind === 'train'
            ? String(value || '')
                .replace(/快速/g, '特快')
                .replace(/马车/g, '车厢')
                .replace(/登机/g, '上车')
            : String(value || '');
    displayMap.name =
        request.parentRoomName
            ? `${request.parentRoomName} · 内部`
            : normalizeTrainLabel(
                displayMap.name ||
                displayMap.nameEn,
            );
    displayMap.levels =
        (displayMap.levels || [])
            .map(level => ({
                ...level,
                name: normalizeTrainLabel(
                    level.name ||
                    level.nameEn,
                ),
            }));
    displayMap.nodes =
        (displayMap.nodes || [])
            .map(node => ({
                ...node,
                name: normalizeTrainLabel(
                    node.name ||
                    node.nameEn,
                ),
            }));
    next.map.customLocalMaps = [
        ...(
            next.map.customLocalMaps ||
            []
        ).filter(map =>
            map.id !== displayMap.id),
        displayMap,
    ];
    const room =
        displayMap.nodes.find(node =>
            node.id ===
                displayMap.currentRoomId) ||
        displayMap.nodes.find(node =>
            node.id ===
                displayMap.defaultRoomId) ||
        displayMap.nodes[0];
    next.map.interiorMapBindings = {
        ...(
            next.map
                .interiorMapBindings || {}
        ),
        [request.bindingKey]:
            displayMap.id,
    };
    next.map.activeMapId =
        displayMap.id;
    next.map.currentLocalNodeId =
        room.id;
    next.map.currentLevelId =
        room.levelId ||
        displayMap.defaultLevelId;
    next.map.discoveredLocalNodeIds =
        [...new Set([
            ...(
                next.map
                    .discoveredLocalNodeIds ||
                []
            ),
            `${displayMap.id}:${room.id}`,
        ])];
    next.location =
        displayMap.name ||
        displayMap.nameEn ||
        room.name ||
        room.nameEn;
    if (next.scene) {
        next.scene.mapId =
            displayMap.id;
        next.scene.roomId =
            room.id;
        if (
            next.scene
                .nextSceneIntent
                ?.mapId ===
                request.parentMapId &&
            next.scene
                .nextSceneIntent
                ?.roomId ===
                request.parentRoomId
        ) {
            next.scene.nextSceneIntent = {
                ...next.scene
                    .nextSceneIntent,
                mapId: displayMap.id,
                roomId: room.id,
            };
        }
    }
    next.actors = (next.actors || [])
        .map(actor =>
            actor.present !== false &&
            (actor.mapId ||
                request.parentMapId) ===
                request.parentMapId &&
            (actor.roomId ||
                request.parentRoomId) ===
                request.parentRoomId
                ? {
                    ...actor,
                    mapId: displayMap.id,
                    roomId: room.id,
                }
                : actor);
    next.items = (next.items || [])
        .map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId:
                            displayMap.id,
                        roomId: room.id,
                        clock: next.clock,
                    },
                );
            return normalized.ownerId ===
                'player' &&
                [
                    'carried',
                    'equipped',
                ].includes(
                    normalized.custody,
                )
                ? {
                    ...normalized,
                    mapId: displayMap.id,
                    roomId: room.id,
                    updatedClock:
                        next.clock,
                }
                : normalized;
        });
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId: displayMap.id,
                    roomId: room.id,
                },
            );
    }
    next.spatial = {
        version:
            SPATIAL_STATE_VERSION,
        openingGroundingVersion:
            next.spatial
                ?.openingGroundingVersion ||
            0,
        player: {
            mapId: displayMap.id,
            roomId: room.id,
        },
        lastMovement:
            next.spatial
                ?.lastMovement || null,
    };
    return next;
}

export function applyGeneratedInteriorMap(
    worldState,
    generatedMap,
    request =
    getInteriorMapRequest(
        worldState,
    ),
) {
    const validation =
        validateGeneratedInteriorMap(
            generatedMap,
            worldState,
            request,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    const display =
        generatedMap.display || {};
    const customMap = {
        id: generatedMap.id,
        parentWorldNodeId:
            request.parentWorldNodeId,
        parentMapId:
            request.parentMapId,
        parentRoomId:
            request.parentRoomId,
        sourceContainerKey:
            request.bindingKey,
        generatedBy:
            'medium-scene-director',
        generatedAt:
            new Date().toISOString(),
        name:
            display.mapName ||
            generatedMap.nameEn,
        nameEn:
            generatedMap.nameEn,
        coordinateSystem:
            'abstract-grid-100',
        defaultLevelId:
            generatedMap.currentLevelId ||
            generatedMap.levels[0].id,
        defaultRoomId:
            generatedMap.currentRoomId,
        currentRoomId:
            generatedMap.currentRoomId,
        layoutRule:
            'This generated interior is persistent local topology. Medium-tier scene directors may create it once but may not silently rewrite it later.',
        levels:
            generatedMap.levels
                .map((level, index) => ({
                    id: level.id,
                    name:
                        display
                            .levelNames
                            ?.[index] ||
                        level.nameEn,
                    nameEn:
                        level.nameEn,
                    z: Number(
                        level.z || 0,
                    ),
                })),
        nodes:
            generatedMap.rooms
                .map((room, index) => ({
                    id: room.id,
                    name:
                        display
                            .roomNames
                            ?.[index] ||
                        room.nameEn,
                    nameEn:
                        room.nameEn,
                    levelId:
                        room.levelId,
                    kind:
                        room.kind ||
                        'room',
                    x: room.x,
                    y: room.y,
                    access:
                        room.access ||
                        'ticketed',
                    description:
                        room.descriptionEn,
                    descriptionEn:
                        room.descriptionEn,
                    tags: [
                        'medium_generated_interior',
                    ],
                    aliases:
                        room.aliases || [],
                })),
        exits:
            generatedMap.exits
                .map(route => ({
                    from: route.from,
                    to: route.to,
                    direction:
                        route.direction ||
                        'passage',
                    kind:
                        route.kind ||
                        'passage',
                    minutes: Math.max(
                        0,
                        Number(
                            route.minutes ||
                            1,
                        ),
                    ),
                    conditions: [],
                })),
    };
    const next =
        structuredClone(worldState);
    next.map.customLocalMaps = [
        ...(next.map
            .customLocalMaps || [])
            .filter(map =>
                map.id !==
                    customMap.id),
        customMap,
    ];
    return enterInteriorMap(
        next,
        customMap,
        request,
    );
}

export function enterBoundInteriorMap(
    worldState,
    request =
    getInteriorMapRequest(
        worldState,
    ),
) {
    if (
        !request?.boundMapId
    ) {
        return worldState;
    }
    const customMap =
        getLocalMapDefinition(
            request.boundMapId,
            worldState.map,
        );
    return customMap
        ? enterInteriorMap(
            worldState,
            customMap,
            request,
        )
        : worldState;
}
