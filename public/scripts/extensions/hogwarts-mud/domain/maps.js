// Extracted from the helpers compatibility facade for Task 4.

import {
    getPresetLocalMap,
    LOCAL_MAP_CATALOG,
    LOCAL_MAP_SCHEMA_VERSION,
    PRESET_LOCAL_MAPS,
} from '../map-pack.js';

import {
    MAP_DIRECTOR_TRIGGERS,
    PRESET_WORLD_MAP,
} from '../world-data.js';

import {
    getLocalMapDefinition,
} from './map-access.js';

import {
    buildSpatialContext,
} from './spatial-reconciliation.js';
import {
    createModelLanguageMismatch,
    isEnglishAuthorityText,
} from './model-language-adoption.js';

export function validateLocalMapPack(mapPack = PRESET_LOCAL_MAPS) {
    const errors = [];
    const parentIds = new Set(PRESET_WORLD_MAP.nodes.map(item => item.id));
    for (const [mapId, map] of Object.entries(mapPack || {})) {
        if (map.id !== mapId) {
            errors.push(`${mapId}: map.id 不匹配。`);
        }
        if (!parentIds.has(map.parentWorldNodeId)) {
            errors.push(`${mapId}: parentWorldNodeId 不存在。`);
        }
        const levelIds = new Set((map.levels || []).map(level => level.id));
        if (!levelIds.has(map.defaultLevelId)) {
            errors.push(`${mapId}: 默认楼层不存在。`);
        }
        const nodeIds = new Set();
        for (const room of map.nodes || []) {
            if (nodeIds.has(room.id)) {
                errors.push(`${mapId}: 房间 ID ${room.id} 重复。`);
            }
            nodeIds.add(room.id);
            if (!levelIds.has(room.levelId)) {
                errors.push(`${mapId}: 房间 ${room.id} 引用了不存在的楼层。`);
            }
            if (!Number.isFinite(room.x) || !Number.isFinite(room.y)) {
                errors.push(`${mapId}: 房间 ${room.id} 缺少有效坐标。`);
            }
        }
        for (const route of map.exits || []) {
            if (!nodeIds.has(route.from) || !nodeIds.has(route.to)) {
                errors.push(`${mapId}: 出口 ${route.from} -> ${route.to} 引用了不存在的房间。`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}

export function resolveLocalMapId(mapState = {}, currentLocation = '') {
    const explicit = String(mapState?.activeMapId || '');
    if (getLocalMapDefinition(explicit, mapState)) {
        return explicit;
    }
    const location = String(currentLocation || '').trim().toLocaleLowerCase();
    const customMatch = (mapState.customLocalMaps || []).find(item =>
        item.id.toLocaleLowerCase() === location || item.nameEn.toLocaleLowerCase() === location,
    );
    if (customMatch) {
        return customMatch.id;
    }
    return LOCAL_MAP_CATALOG.find(item =>
        item.id.toLocaleLowerCase() === location ||
        item.nameEn.toLocaleLowerCase() === location ||
        item.parentWorldNodeId.toLocaleLowerCase() === location,
    )?.id || null;
}

export function buildLocalMapModel(mapId, mapState = {}, requestedLevelId = '') {
    const preset = getLocalMapDefinition(mapId, mapState);
    if (!preset) {
        return null;
    }
    const generatedNodes = (mapState.generatedLocalNodes || []).filter(item => item.mapId === mapId);
    const generatedExits = (mapState.generatedLocalExits || []).filter(item => item.mapId === mapId);
    const roomStates = mapState.roomStates && typeof mapState.roomStates === 'object' ? mapState.roomStates : {};
    const exitStates = mapState.exitStates && typeof mapState.exitStates === 'object' ? mapState.exitStates : {};
    const currentRoomId = String(mapState.currentLocalNodeId || '');
    const currentRoom = [...preset.nodes, ...generatedNodes].find(room => room.id === currentRoomId);
    const levelId = preset.levels.some(level => level.id === requestedLevelId)
        ? requestedLevelId
        : currentRoom?.levelId || mapState.currentLevelId || preset.defaultLevelId;
    const discovered = new Set(mapState.discoveredLocalNodeIds || []);
    const nodes = [...preset.nodes, ...generatedNodes]
        .filter(room => room.levelId === levelId)
        .map(room => ({
            ...room,
            runtime: roomStates[`${mapId}:${room.id}`] || null,
            visibility: room.id === currentRoomId
                ? 'current'
                : discovered.has(`${mapId}:${room.id}`) || room.access !== 'secret'
                    ? 'discovered'
                    : 'known',
            generated: generatedNodes.includes(room),
        }));
    const visibleIds = new Set(nodes.map(room => room.id));
    const exits = [...preset.exits, ...generatedExits]
        .filter(route => visibleIds.has(route.from) && visibleIds.has(route.to))
        .map(route => ({
            ...route,
            runtime: exitStates[`${mapId}:${route.from}->${route.to}`] || null,
            generated: generatedExits.includes(route),
        }));
    return {
        id: preset.id,
        nameEn: preset.nameEn,
        layoutRuleEn:
            preset.layoutRuleEn ||
            '',
        levels: preset.levels.map(level => ({ ...level })),
        levelId,
        nodes,
        exits,
        currentRoomId,
    };
}

export function buildMapAuthorityContext(
    worldState = {},
    {
        purpose = 'runtime',
    } = {},
) {
    const mapState = worldState.map || {};
    const activeMapId = resolveLocalMapId(mapState, worldState.location);
    const activeMap = getLocalMapDefinition(activeMapId, mapState);
    const expansion =
        purpose ===
        'expansion';
    const activeMapProjection =
        activeMap
            ? expansion
                ? {
                    id:
                        activeMap.id,
                    nameEn:
                        activeMap
                            .nameEn,
                    defaultLevelId:
                        activeMap
                            .defaultLevelId,
                    levels:
                        (
                            activeMap
                                .levels ||
                            []
                        ).map(level => ({
                            id: level.id,
                            nameEn:
                                level
                                    .nameEn ||
                                level.id,
                            z: level.z,
                        })),
                    nodes:
                        (
                            activeMap
                                .nodes ||
                            []
                        ).map(node => ({
                            id: node.id,
                            nameEn:
                                node
                                    .nameEn ||
                                node.id,
                            levelId:
                                node
                                    .levelId ||
                                '',
                            kind:
                                node.kind ||
                                'room',
                            ...(
                                node.access
                                    ? {
                                        access:
                                            node
                                                .access,
                                    }
                                    : {}
                            ),
                        })),
                    exits:
                        (
                            activeMap
                                .exits ||
                            []
                        ).map(exit => ({
                            from:
                                exit.from,
                            to: exit.to,
                        })),
                }
                : {
                    id: activeMap.id,
                    nameEn:
                        activeMap.nameEn,
                    layoutRuleEn:
                        activeMap.layoutRuleEn ||
                        '',
                    levels:
                        activeMap.levels,
                    nodes:
                        activeMap.nodes,
                    exits:
                        activeMap.exits,
                }
            : null;
    const payload = {
        schemaVersion: LOCAL_MAP_SCHEMA_VERSION,
        authority: [
            'Preset rooms, levels, coordinates, and exits are immutable facts.',
            'Use the preset graph before proposing any new location.',
            'currentLocalNodeId is the player room; every present actor owns a separate mapId and roomId.',
            'Runtime changes may block, damage, reveal, or reroute preset topology without deleting it.',
            'Only the World Director may propose a genuinely new room after confirming the map pack has no suitable location.',
        ],
        worldCatalog: PRESET_WORLD_MAP.nodes.map(item => ({
            id: item.id,
            nameEn: item.nameEn,
            regionId: item.regionId,
            localMapId: getPresetLocalMap(item.id)?.id || null,
        })),
        localMapCatalog: LOCAL_MAP_CATALOG,
        activeMap:
            activeMapProjection,
        runtimeDiff:
            expansion
                ? {
                    activeMapId,
                    currentLocalNodeId:
                        mapState
                            .currentLocalNodeId ||
                        null,
                    currentLevelId:
                        mapState
                            .currentLevelId ||
                        null,
                    generatedLocalNodes:
                        mapState
                            .generatedLocalNodes ||
                        [],
                    generatedLocalExits:
                        mapState
                            .generatedLocalExits ||
                        [],
                }
                : {
                    activeMapId,
                    currentLocalNodeId:
                        mapState
                            .currentLocalNodeId ||
                        null,
                    currentLevelId:
                        mapState
                            .currentLevelId ||
                        null,
                    discoveredLocalNodeIds:
                        mapState
                            .discoveredLocalNodeIds ||
                        [],
                    roomStates:
                        mapState.roomStates ||
                        {},
                    exitStates:
                        mapState.exitStates ||
                        {},
                    generatedLocalNodes:
                        mapState
                            .generatedLocalNodes ||
                        [],
                    generatedLocalExits:
                        mapState
                            .generatedLocalExits ||
                        [],
                },
        ...(
            expansion
                ? {}
                : {
                    spatial:
                        buildSpatialContext(
                            worldState,
                        ),
                }
        ),
    };
    return `MUD MAP AUTHORITY (binding JSON):\n${JSON.stringify(payload)}`;
}

export function validateLocalMapMutation(mutation, mapPack = PRESET_LOCAL_MAPS) {
    const errors = [];
    if (!mutation || typeof mutation !== 'object' || Array.isArray(mutation)) {
        return { valid: false, errors: ['地图状态变更必须是对象。'] };
    }
    const map = mapPack[mutation.mapId];
    if (!map) {
        return { valid: false, errors: ['地图状态变更引用了不存在的小地图。'] };
    }
    const roomIds = new Set(map.nodes.map(room => room.id));
    const exitIds = new Set(map.exits.map(route => `${route.from}->${route.to}`));
    const changes = Array.isArray(mutation.changes) ? mutation.changes : [];
    if (!changes.length || changes.length > 20) {
        errors.push('地图状态变更必须包含 1–20 项。');
    }
    for (const [index, change] of changes.entries()) {
        const prefix = `第 ${index + 1} 项`;
        if (change.type === 'room_state') {
            if (!roomIds.has(change.roomId)) {
                errors.push(`${prefix}引用了不存在的房间。`);
            }
            if (!['normal', 'blocked', 'damaged', 'altered', 'occupied'].includes(change.status)) {
                errors.push(`${prefix}的房间状态无效。`);
            }
        } else if (change.type === 'exit_state') {
            if (!exitIds.has(`${change.from}->${change.to}`) && !exitIds.has(`${change.to}->${change.from}`)) {
                errors.push(`${prefix}引用了不存在的出口。`);
            }
            if (typeof change.blocked !== 'boolean') {
                errors.push(`${prefix}缺少 blocked 布尔值。`);
            }
        } else if (change.type === 'discover_secret') {
            if (!roomIds.has(change.roomId)) {
                errors.push(`${prefix}引用了不存在的秘密地点。`);
            }
        } else {
            errors.push(`${prefix}的变更类型无效。`);
        }
    }
    return { valid: errors.length === 0, errors };
}

export function applyLocalMapMutation(mapState, mutation) {
    const next = structuredClone(mapState || {});
    next.roomStates = next.roomStates || {};
    next.exitStates = next.exitStates || {};
    next.discoveredLocalNodeIds = Array.isArray(next.discoveredLocalNodeIds)
        ? next.discoveredLocalNodeIds
        : [];
    for (const change of mutation.changes) {
        if (change.type === 'room_state') {
            next.roomStates[`${mutation.mapId}:${change.roomId}`] = {
                status: change.status,
                note: String(change.note || ''),
            };
        } else if (change.type === 'exit_state') {
            next.exitStates[`${mutation.mapId}:${change.from}->${change.to}`] = {
                blocked: change.blocked,
                note: String(change.note || ''),
            };
        } else if (change.type === 'discover_secret') {
            const key = `${mutation.mapId}:${change.roomId}`;
            if (!next.discoveredLocalNodeIds.includes(key)) {
                next.discoveredLocalNodeIds.push(key);
            }
        }
    }
    return next;
}

export function buildMapModel(mapState = {}, currentLocation = '', revealAll = false) {
    const regionById = new Map(PRESET_WORLD_MAP.regions.map(region => [region.id, region]));
    const overrides = mapState?.nodeOverrides && typeof mapState.nodeOverrides === 'object'
        ? mapState.nodeOverrides
        : {};
    const discovered = new Set(Array.isArray(mapState?.discoveredNodeIds) ? mapState.discoveredNodeIds : []);
    const sourceNodes = [
        ...PRESET_WORLD_MAP.nodes.map(node => ({ ...node, ...(overrides[node.id] || {}) })),
        ...(
            Array.isArray(
                mapState?.generatedNodes,
            )
                ? mapState
                    .generatedNodes
                    .map(node => ({
                        ...node,
                    }))
                : []
        ),
    ];
    const explicitCurrentId = String(mapState?.currentNodeId || '');
    const location = String(currentLocation || '').trim().toLocaleLowerCase();
    const currentNodeId =
        explicitCurrentId ||
        sourceNodes.find(node =>
            [
                node.id,
                node.nameEn,
                ...(node.aliases ||
                    []),
            ]
                .filter(Boolean)
                .some(value =>
                    String(value)
                        .toLocaleLowerCase() ===
                    location))
            ?.id ||
        '';

    const nodes = sourceNodes.map(node => {
        const region = regionById.get(node.regionId);
        const localX = Number.isFinite(Number(node.x)) ? Number(node.x) : 50;
        const localY = Number.isFinite(Number(node.y)) ? Number(node.y) : 50;
        const isCurrent = node.id === currentNodeId;
        const isDiscovered = revealAll || isCurrent || discovered.has(node.id) || node.locked === false;
        return {
            ...node,
            mapX: region ? region.x + (localX - 50) * 0.34 : localX,
            mapY: region ? region.y + (localY - 50) * 0.30 : localY,
            visibility: isCurrent ? 'current' : isDiscovered ? 'discovered' : 'known',
        };
    });
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const edges = PRESET_WORLD_MAP.edges
        .map(edge => ({
            ...edge,
            source: nodeById.get(edge.from),
            target: nodeById.get(edge.to),
        }))
        .filter(edge => edge.source && edge.target)
        .map(edge => ({
            ...edge,
            visibility: revealAll || (
                edge.source.visibility !== 'known' &&
                edge.target.visibility !== 'known'
            ) ? 'discovered' : 'known',
        }));
    const connectedIds = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    nodes.filter(node => node.locked === false && !connectedIds.has(node.id)).forEach(node => {
        const nearest = nodes
            .filter(candidate => candidate.id !== node.id && candidate.regionId === node.regionId)
            .map(candidate => ({
                node: candidate,
                distance: Math.hypot(candidate.mapX - node.mapX, candidate.mapY - node.mapY),
            }))
            .sort((left, right) => left.distance - right.distance)[0]?.node;
        if (nearest) {
            edges.push({
                from: nearest.id,
                to: node.id,
                mode: 'discovered',
                minutes: null,
                source: nearest,
                target: node,
                visibility: 'discovered',
                generated: true,
            });
        }
    });

    return {
        regions: PRESET_WORLD_MAP.regions.map(region => ({ ...region })),
        nodes,
        edges,
        currentNodeId,
    };
}

export function adoptMapProposalLanguage(
    proposal,
) {
    const diagnostics = [];
    const accepted = {
        ...proposal,
        changes: (
            Array.isArray(
                proposal?.changes,
            )
                ? proposal.changes
                : []
        ).filter((change, index) => {
            const node =
                change?.node;
            const mismatches = [
                'nameEn',
                'summaryEn',
            ].filter(field => {
                const value =
                    String(
                        node?.[field] ||
                        '',
                    ).trim();
                return value &&
                    !isEnglishAuthorityText(
                        value,
                    );
            });
            diagnostics.push(
                ...mismatches.map(field =>
                    createModelLanguageMismatch({
                        taskId:
                            'map_expansion',
                        fieldPath:
                            `changes[${index}].node.${field}`,
                        recordId:
                            String(
                                node?.id ||
                                index,
                            ),
                    })),
            );
            return mismatches.length ===
                0;
        }),
    };
    if (
        String(
            accepted.reasonEn ||
            '',
        ).trim() &&
        !isEnglishAuthorityText(
            accepted.reasonEn,
        )
    ) {
        diagnostics.push(
            createModelLanguageMismatch({
                taskId:
                    'map_expansion',
                fieldPath: 'reasonEn',
                recordId:
                    String(
                        accepted.id ||
                        '',
                    ),
            }),
        );
        accepted.reasonEn = '';
    }
    return {
        proposal: accepted,
        diagnostics,
    };
}

export function validateMapProposal(proposal, options = {}) {
    const trigger = String(options.trigger || '');
    const baseMap = options.baseMap || PRESET_WORLD_MAP;
    const generatedNodes = Array.isArray(options.generatedNodes) ? options.generatedNodes : [];
    const errors = [];

    if (!MAP_DIRECTOR_TRIGGERS.includes(trigger)) {
        errors.push('地图提案缺少有效触发条件。');
    }
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
        return { valid: false, errors: ['地图提案必须是对象。'] };
    }
    if (
        Object.hasOwn(
            proposal,
            'reason',
        )
    ) {
        errors.push(
            '地图提案不得包含已删除字段 reason。',
        );
    }

    const changes = Array.isArray(proposal.changes) ? proposal.changes : [];
    if (changes.length > 12) {
        errors.push('地图提案最多包含 12 项变更。');
    }

    const regions = new Set(baseMap.regions.map(region => region.id));
    const baseNodes = new Map(baseMap.nodes.map(node => [node.id, node]));
    const generatedIds = new Set(generatedNodes.map(node => node.id));
    const seenIds = new Set([...baseNodes.keys(), ...generatedIds]);

    for (const [index, change] of changes.entries()) {
        const prefix = `第 ${index + 1} 项`;
        if (!change || typeof change !== 'object' || !['add', 'update'].includes(change.operation)) {
            errors.push(`${prefix}只允许 add 或 update。`);
            continue;
        }
        const node = change.node;
        if (!node || typeof node !== 'object' || !/^[a-z0-9_]{3,64}$/.test(String(node.id || ''))) {
            errors.push(`${prefix}的地点 ID 无效。`);
            continue;
        }
        const removedFields = [
            'name',
            'summary',
        ].filter(field =>
            Object.hasOwn(
                node,
                field,
            ));
        if (removedFields.length) {
            errors.push(
                `${prefix}包含已删除字段：${removedFields.join('、')}。`,
            );
        }

        if (change.operation === 'add') {
            if (seenIds.has(node.id)) {
                errors.push(`${prefix}试图重复创建地点。`);
            }
            if (!regions.has(node.regionId)) {
                errors.push(`${prefix}引用了不存在的区域。`);
            }
            if (
                !isEnglishAuthorityText(
                    node.nameEn,
                ) ||
                !isEnglishAuthorityText(
                    node.summaryEn,
                )
            ) {
                errors.push(`${prefix}缺少地点名称或说明。`);
            }
            seenIds.add(node.id);
            continue;
        }

        if (!seenIds.has(node.id)) {
            errors.push(`${prefix}试图修改不存在的地点。`);
            continue;
        }
        if (baseNodes.has(node.id)) {
            if (!['canon_divergence', 'world_event'].includes(trigger)) {
                errors.push(`${prefix}没有修改原著地点的因果权限。`);
            }
            const forbidden = [
                'name',
                'nameEn',
                'regionId',
                'x',
                'y',
                'kind',
                'locked',
            ];
            if (forbidden.some(key => Object.hasOwn(node, key))) {
                errors.push(`${prefix}试图改写原著地点身份或坐标。`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

export function applyMapProposal(mapState, proposal) {
    const next = structuredClone(mapState);
    next.generatedNodes = Array.isArray(next.generatedNodes) ? next.generatedNodes : [];
    next.nodeOverrides = next.nodeOverrides && typeof next.nodeOverrides === 'object' ? next.nodeOverrides : {};
    next.proposals = Array.isArray(next.proposals) ? next.proposals : [];

    for (const change of proposal.changes) {
        if (change.operation === 'add') {
            next.generatedNodes.push({
                ...structuredClone(change.node),
                locked: false,
                generatedBy: 'world-director',
            });
        } else {
            const generatedIndex = next.generatedNodes.findIndex(node => node.id === change.node.id);
            if (generatedIndex >= 0) {
                next.generatedNodes[generatedIndex] = {
                    ...next.generatedNodes[generatedIndex],
                    ...structuredClone(change.node),
                    id: next.generatedNodes[generatedIndex].id,
                };
            } else {
                const { id, ...allowedChanges } = change.node;
                next.nodeOverrides[id] = {
                    ...(next.nodeOverrides[id] || {}),
                    ...structuredClone(allowedChanges),
                };
            }
        }
    }
    next.proposals.push({
        id: proposal.id || `map-${Date.now()}`,
        reasonEn:
            String(
                proposal.reasonEn ||
                '',
            ),
        acceptedAt: Date.now(),
    });
    return next;
}
