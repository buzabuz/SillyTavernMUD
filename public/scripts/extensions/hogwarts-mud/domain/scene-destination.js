// Extracted from the helpers compatibility facade for Task 4.

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';
import {
    listMapsByMountHierarchy,
} from './interior-mount.js';

import {
    normalizeSpatialText,
} from './spatial-foundation.js';

function getSceneMapDefinitions(mapState = {}) {
    return listMapsByMountHierarchy(
        mapState,
    ).map(entry =>
        entry.map);
}

export function findSceneDestination(text, worldState) {
    const query = String(text || '').normalize('NFKC').toLocaleLowerCase();
    if (!query.trim()) {
        return null;
    }
    const mapState = worldState?.map || {};
    const generatedNodes = mapState.generatedLocalNodes || [];
    let best = null;
    const consider = candidate => {
        if (!best || candidate.score > best.score) {
            best = candidate;
        }
    };
    for (const map of getSceneMapDefinitions(mapState)) {
        const activeBonus = map.id === mapState.activeMapId ? 20 : 0;
        const nodes = [
            ...(map.nodes || []),
            ...generatedNodes.filter(node => node.mapId === map.id),
        ];
        for (const room of nodes) {
            for (const label of [
                room.nameEn,
                room.id,
                ...(room.aliases || []),
            ]) {
                const normalized = String(label || '').normalize('NFKC').toLocaleLowerCase();
                if (normalized.length >= 2 && query.includes(normalized)) {
                    consider({
                        mapId: map.id,
                        roomId: room.id,
                        mapName:
                            map.nameEn,
                        mapNameEn: map.nameEn,
                        roomName:
                            room.nameEn,
                        roomNameEn:
                            room.nameEn ||
                            (room.aliases || []).find(alias =>
                                /[a-z]/i.test(alias)) ||
                            formatSceneLocationId(
                                room.id,
                            ),
                        levelId: room.levelId,
                        score: 100 + activeBonus + normalized.length,
                    });
                }
            }
        }
        for (const label of [
            map.nameEn,
            map.id,
            ...(map.aliases || []),
        ]) {
            const normalized = String(label || '').normalize('NFKC').toLocaleLowerCase();
            if (normalized.length < 2 || !query.includes(normalized)) continue;
            const room = nodes.find(node => node.id === map.defaultLevelId) ||
                nodes.find(node => node.levelId === map.defaultLevelId) ||
                nodes[0];
            if (room) {
                consider({
                    mapId: map.id,
                    roomId: room.id,
                    mapName:
                        map.nameEn,
                    mapNameEn: map.nameEn,
                    roomName:
                        room.nameEn,
                    roomNameEn:
                        room.nameEn ||
                        formatSceneLocationId(
                            room.id,
                        ),
                    levelId: room.levelId,
                    score: 10 + activeBonus + normalized.length,
                });
            }
        }
    }
    if (!best) {
        return null;
    }
    const destination = { ...best };
    delete destination.score;
    return destination;
}

export function resolveSceneTransitionDestination(
    worldState,
    text,
) {
    const direct =
        findSceneDestination(
            text,
            worldState,
        );
    if (direct) {
        return direct;
    }
    const activeMapId = String(
        worldState?.scene?.mapId ||
        worldState?.map?.activeMapId ||
        '',
    );
    const query = String(text || '')
        .normalize('NFKC')
        .toLocaleLowerCase();
    const leavesExpress =
        activeMapId.includes(
            'hogwarts_express',
        ) &&
        /(?:到达|抵达|下车|arriv|reach|get off)/i
            .test(query) &&
        /(?:霍格沃茨|霍格莫德|hogwarts|hogsmeade)/i
            .test(query);
    if (!leavesExpress) {
        return null;
    }
    return getSceneDestinationAuthority(
        worldState,
        {
            mapId: 'hogsmeade',
            roomId:
                'hogsmeade_station',
        },
    );
}

export function findExplicitRoomReference(
    text,
    map,
    mapState = {},
) {
    const query = normalizeSpatialText(text);
    if (!query || !map) return null;
    let best = null;
    getMapRooms(map, mapState).forEach(room => {
        [
            room.id,
            room.nameEn,
            ...(room.aliases || []),
        ].forEach(label => {
            const normalized =
                normalizeSpatialText(label);
            if (
                normalized.length < 3 ||
                !query.includes(normalized)
            ) {
                return;
            }
            if (
                !best ||
                normalized.length > best.score
            ) {
                best = {
                    room,
                    score: normalized.length,
                };
            }
        });
    });
    return best?.room || null;
}

export function createFallbackNextSceneIntent(worldState) {
    const mapId = String(worldState.map?.activeMapId || '');
    const roomId = String(worldState.map?.currentLocalNodeId || '');
    const map = getLocalMapDefinition(mapId, worldState.map);
    const room = getMapRooms(map, worldState.map)
        .find(item => item.id === roomId);
    const focusActor = (worldState.actors || []).find(actor =>
        actor.present !== false &&
        (actor.mapId || mapId) === mapId &&
        actor.roomId === roomId);
    const roomNameEn = room?.nameEn ||
        formatSceneLocationId(roomId) ||
        'Current Location';
    const actorNameEn =
        focusActor?.nameEn || '';
    return {
        titleEn: actorNameEn
            ? `${roomNameEn}: ${actorNameEn}`
            : `The Next Beat in ${roomNameEn}`,
        summaryEn: actorNameEn
            ? `Continue the immediate public interaction with ${actorNameEn} in ${roomNameEn}.`
            : `Continue the unresolved public action in ${roomNameEn}.`,
        triggerEn: 'When the player chooses to close the current scene.',
        mapId,
        roomId,
        tier: 'medium',
        source: 'migration_fallback',
    };
}

export function validateEventBoundaryNextSceneIntent(
    value,
) {
    const errors = [];
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        return {
            valid: false,
            errors: [
                '事件边界下一场景意图必须是对象。',
            ],
        };
    }
    const limits = {
        titleEn: 120,
        summaryEn: 600,
        triggerEn: 300,
    };
    Object.entries(limits)
        .forEach(([key, limit]) => {
            const text = String(
                value[key] || '',
            ).trim();
            if (!text || text.length > limit) {
                errors.push(
                    `事件边界下一场景意图 ${key} 必须是非空且不超过 ${limit} 字符的文本。`,
                );
            }
        });
    const allowedKeys = new Set([
        ...Object.keys(limits),
    ]);
    const unauthorizedKeys =
        Object.keys(value)
            .filter(key =>
                !allowedKeys.has(key));
    if (unauthorizedKeys.length) {
        errors.push(
            `事件边界下一场景意图不得写入字段：${unauthorizedKeys.join(', ')}。`,
        );
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function applyEventBoundaryNextSceneIntent(
    worldState,
    intentUpdate,
) {
    const validation =
        validateEventBoundaryNextSceneIntent(
            intentUpdate,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    const next =
        structuredClone(worldState);
    if (!next.scene) {
        throw new Error(
            '当前没有可更新下一场景意图的活动场景。',
        );
    }
    const currentIntent =
        validateNextSceneIntent(
            next.scene.nextSceneIntent,
            next,
        ).valid
            ? next.scene.nextSceneIntent
            : createFallbackNextSceneIntent(
                next,
            );
    next.scene.nextSceneIntent = {
        ...currentIntent,
        titleEn: intentUpdate.titleEn,
        summaryEn:
            intentUpdate.summaryEn,
        triggerEn:
            intentUpdate.triggerEn,
        source:
            'medium_event_boundary',
        updatedTurn:
            Number(
                next.turn?.count || 0,
            ),
        updatedClock:
            next.clock,
    };
    return next;
}

export function formatSceneLocationId(value) {
    return String(value || '')
        .split(/[_-]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getSceneDestinationAuthority(
    worldState,
    destination = {},
) {
    const mapId = String(destination?.mapId || '');
    const roomId = String(destination?.roomId || '');
    const map = getLocalMapDefinition(mapId, worldState?.map);
    const room = getMapRooms(map, worldState?.map)
        .find(item => item.id === roomId);
    if (!map || !room) {
        return null;
    }
    return {
        mapId,
        roomId,
        mapName:
            map.nameEn ||
            formatSceneLocationId(
                mapId,
            ),
        mapNameEn: map.nameEn || formatSceneLocationId(mapId),
        roomName:
            room.nameEn ||
            formatSceneLocationId(
                roomId,
            ),
        roomNameEn: room.nameEn || formatSceneLocationId(roomId),
        roomDescriptionEn:
            room.descriptionEn ||
            '',
    };
}

export function validateSceneDestinationGrounding(
    payload,
    worldState,
    expectedDestination,
) {
    const errors = [];
    const authority = getSceneDestinationAuthority(
        worldState,
        expectedDestination,
    );
    if (!authority) {
        return {
            valid: false,
            errors: ['无法读取下一场景的权威目标房间。'],
        };
    }
    const nextScene = payload?.nextScene || {};
    if (nextScene.mapId !== authority.mapId ||
        nextScene.roomId !== authority.roomId) {
        errors.push(
            `下一场景必须原样使用 ${authority.mapId} / ${authority.roomId}，不能只改正文或只改 ID。`,
        );
        return { valid: false, errors };
    }
    return { valid: errors.length === 0, errors };
}

export function getClosingSceneWitnessIds(
    worldState,
) {
    const mapId =
        worldState.scene?.mapId ||
        worldState.map?.activeMapId;
    const roomId =
        worldState.scene?.roomId ||
        worldState.map?.currentLocalNodeId;
    return (worldState.actors || [])
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || mapId) === mapId &&
            (actor.roomId || roomId) === roomId)
        .map(actor => actor.id);
}

export function validateNextSceneIntent(intent, worldState) {
    const errors = [];
    if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
        return { valid: false, errors: ['下一幕意图必须是对象。'] };
    }
    for (const key of [
        'titleEn',
        'summaryEn',
        'triggerEn',
        'mapId',
        'roomId',
    ]) {
        if (!String(intent[key] || '').trim()) {
            errors.push(`下一幕意图缺少 ${key}。`);
        }
    }
    if (!['medium', 'high'].includes(intent.tier)) {
        errors.push('下一幕意图的 tier 必须是 medium 或 high。');
    }
    const map = getLocalMapDefinition(intent.mapId, worldState.map);
    const roomExists = getMapRooms(map, worldState.map)
        .some(room => room.id === intent.roomId);
    if (!map || !roomExists) {
        errors.push('下一幕意图必须引用现有地图和房间。');
    }
    return { valid: errors.length === 0, errors };
}
