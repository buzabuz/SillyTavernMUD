import {
    getPresetLocalMap,
    LOCAL_MAP_CATALOG,
} from '../map-pack.js';
import {
    PRESET_WORLD_MAP,
} from '../world-data.js';
import {
    getMapRooms,
} from './map-access.js';

const MOUNT_KEYS =
    new Set([
        'parentMapId',
        'parentRoomId',
    ]);
const worldNodeIds =
    new Set(
        PRESET_WORLD_MAP.nodes
            .map(node =>
                node.id),
    );

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function text(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim();
}

export function createInteriorMountKey(
    parentMapId,
    parentRoomId,
) {
    const mapId =
        text(parentMapId);
    const roomId =
        text(parentRoomId);
    return mapId && roomId
        ? `${mapId}:${roomId}`
        : '';
}

export function getInteriorMount(
    map,
) {
    if (!isRecord(map?.mount)) {
        return null;
    }
    const extraKeys =
        Object.keys(map.mount)
            .filter(key =>
                !MOUNT_KEYS.has(key));
    const parentMapId =
        text(
            map.mount
                .parentMapId,
        );
    const parentRoomId =
        text(
            map.mount
                .parentRoomId,
        );
    if (
        extraKeys.length ||
        !parentMapId ||
        !parentRoomId
    ) {
        return null;
    }
    return {
        parentMapId,
        parentRoomId,
    };
}

export function buildInteriorMountIndex(
    mapState = {},
) {
    const index =
        new Map();
    for (
        const map
        of mapState.customLocalMaps ||
        []
    ) {
        const mount =
            getInteriorMount(map);
        if (!mount) {
            continue;
        }
        const key =
            createInteriorMountKey(
                mount.parentMapId,
                mount.parentRoomId,
            );
        if (index.has(key)) {
            throw new TypeError(
                `Interior mount ${key} is owned by both ${index.get(key).id} and ${map.id}.`,
            );
        }
        index.set(
            key,
            map,
        );
    }
    return index;
}

export function findMountedInteriorMap(
    mapState,
    parentMapId,
    parentRoomId,
) {
    const key =
        createInteriorMountKey(
            parentMapId,
            parentRoomId,
        );
    return key
        ? buildInteriorMountIndex(
            mapState,
        ).get(key) ||
            null
        : null;
}

function findMap(
    mapId,
    customMaps,
) {
    return customMaps
        .find(map =>
            map.id === mapId) ||
        getPresetLocalMap(mapId) ||
        null;
}

function resolveWorldAnchorId(
    map,
    customMaps,
    visited =
    new Set(),
) {
    const mapId =
        text(map?.id);
    if (
        mapId &&
        visited.has(mapId)
    ) {
        throw new TypeError(
            `Interior mount cycle includes ${mapId}.`,
        );
    }
    const nextVisited =
        new Set(visited);
    if (mapId) {
        nextVisited.add(mapId);
    }
    const explicit =
        text(
            map?.worldAnchorId,
        );
    if (
        explicit &&
        worldNodeIds.has(explicit)
    ) {
        return explicit;
    }
    const presetAnchor =
        text(
            map
                ?.parentWorldNodeId,
        );
    if (
        presetAnchor &&
        worldNodeIds.has(
            presetAnchor,
        )
    ) {
        return presetAnchor;
    }
    const mount =
        getInteriorMount(map);
    if (!mount) {
        return '';
    }
    const parent =
        findMap(
            mount.parentMapId,
            customMaps,
        );
    if (!parent || parent === map) {
        return '';
    }
    return resolveWorldAnchorId(
        parent,
        customMaps,
        nextVisited,
    );
}

function withoutLegacyMapFields(
    map,
) {
    const normalized = {
        ...map,
    };
    delete normalized.parentWorldNodeId;
    delete normalized.parentMapId;
    delete normalized.parentRoomId;
    delete normalized.sourceContainerKey;
    return normalized;
}

export function migrateInteriorMountAuthority(
    worldState,
) {
    if (!isRecord(worldState)) {
        throw new TypeError(
            'Interior mount migration requires State.',
        );
    }
    const sourceMapState =
        isRecord(worldState.map)
            ? worldState.map
            : {};
    const sourceMaps =
        Array.isArray(
            sourceMapState
                .customLocalMaps,
        )
            ? sourceMapState
                .customLocalMaps
            : [];
    const legacyBindings =
        sourceMapState
            .interiorMapBindings ===
            undefined
            ? {}
            : sourceMapState
                .interiorMapBindings;
    if (!isRecord(legacyBindings)) {
        throw new TypeError(
            'map.interiorMapBindings must be an object before migration.',
        );
    }
    const matchedLegacyKeys =
        new Set();
    const migratedMaps =
        sourceMaps.map(sourceMap => {
            if (
                !isRecord(sourceMap) ||
                !text(sourceMap.id)
            ) {
                throw new TypeError(
                    'Every custom local map requires an ID.',
                );
            }
            const legacyParentMapId =
                text(
                    sourceMap
                        .parentMapId,
                );
            const legacyParentRoomId =
                text(
                    sourceMap
                        .parentRoomId,
                );
            const existingMount =
                getInteriorMount(
                    sourceMap,
                );
            if (
                sourceMap.mount !==
                    undefined &&
                !existingMount
            ) {
                throw new TypeError(
                    `Custom map ${sourceMap.id} has an invalid mount.`,
                );
            }
            const parentMapId =
                existingMount
                    ?.parentMapId ||
                legacyParentMapId;
            const parentRoomId =
                existingMount
                    ?.parentRoomId ||
                legacyParentRoomId;
            const isInterior =
                Boolean(
                    existingMount ||
                    parentMapId ||
                    parentRoomId ||
                    sourceMap
                        .sourceContainerKey ||
                    sourceMap.generatedBy ===
                        'medium-scene-director',
                );
            const base =
                withoutLegacyMapFields(
                    sourceMap,
                );
            if (!isInterior) {
                delete base.mount;
                return {
                    ...base,
                    worldAnchorId:
                        resolveWorldAnchorId(
                            sourceMap,
                            sourceMaps,
                        ),
                };
            }
            if (
                !parentMapId ||
                !parentRoomId
            ) {
                throw new TypeError(
                    `Interior map ${sourceMap.id} has incomplete parent authority.`,
                );
            }
            const parentMap =
                findMap(
                    parentMapId,
                    sourceMaps,
                );
            if (
                !parentMap ||
                parentMap.id ===
                    sourceMap.id
            ) {
                throw new TypeError(
                    `Interior map ${sourceMap.id} references missing parent map ${parentMapId}.`,
                );
            }
            const parentRoom =
                getMapRooms(
                    parentMap,
                    sourceMapState,
                ).find(room =>
                    room.id ===
                        parentRoomId);
            if (!parentRoom) {
                throw new TypeError(
                    `Interior map ${sourceMap.id} references missing parent room ${parentMapId}:${parentRoomId}.`,
                );
            }
            const mountKey =
                createInteriorMountKey(
                    parentMapId,
                    parentRoomId,
                );
            const legacyMapId =
                text(
                    legacyBindings[
                        mountKey
                    ],
                );
            if (
                legacyMapId &&
                legacyMapId !==
                    sourceMap.id
            ) {
                throw new TypeError(
                    `Legacy interior binding ${mountKey} points to ${legacyMapId}, not ${sourceMap.id}.`,
                );
            }
            const sourceContainerKey =
                text(
                    sourceMap
                        .sourceContainerKey,
                );
            if (
                sourceContainerKey &&
                sourceContainerKey !==
                    mountKey
            ) {
                throw new TypeError(
                    `Interior map ${sourceMap.id} has conflicting sourceContainerKey ${sourceContainerKey}.`,
                );
            }
            if (legacyMapId) {
                matchedLegacyKeys.add(
                    mountKey,
                );
            }
            const mounted = {
                ...base,
                worldAnchorId:
                    resolveWorldAnchorId(
                        {
                            ...sourceMap,
                            mount: {
                                parentMapId,
                                parentRoomId,
                            },
                        },
                        sourceMaps,
                    ),
                mount: {
                    parentMapId,
                    parentRoomId,
                },
            };
            return mounted;
        });
    for (
        const [
            key,
            mapId,
        ] of Object.entries(
            legacyBindings,
        )
    ) {
        if (
            text(mapId) &&
            !matchedLegacyKeys.has(
                key,
            )
        ) {
            throw new TypeError(
                `Legacy interior binding ${key} -> ${mapId} has no unique child map.`,
            );
        }
    }
    const candidateMapState = {
        ...sourceMapState,
        customLocalMaps:
            migratedMaps,
    };
    delete candidateMapState
        .interiorMapBindings;
    buildInteriorMountIndex(
        candidateMapState,
    );
    const next =
        structuredClone(
            worldState,
        );
    next.map =
        candidateMapState;
    const changed =
        JSON.stringify(
            sourceMapState,
        ) !==
        JSON.stringify(
            candidateMapState,
        );
    return {
        state:
            changed
                ? next
                : worldState,
        changed,
        stats: {
            mountedInteriorCount:
                buildInteriorMountIndex(
                    candidateMapState,
                ).size,
            removedLegacyBindingCount:
                Object.keys(
                    legacyBindings,
                ).length,
        },
    };
}

export function listMapsByMountHierarchy(
    mapState = {},
) {
    const customMaps =
        mapState.customLocalMaps ||
        [];
    const mapsById =
        new Map();
    for (
        const catalogEntry
        of LOCAL_MAP_CATALOG
    ) {
        mapsById.set(
            catalogEntry.id,
            findMap(
                catalogEntry.id,
                customMaps,
            ),
        );
    }
    for (const map of customMaps) {
        mapsById.set(
            map.id,
            map,
        );
    }
    const childrenByParent =
        new Map();
    for (const map of customMaps) {
        const mount =
            getInteriorMount(map);
        if (!mount) {
            continue;
        }
        const children =
            childrenByParent
                .get(
                    mount.parentMapId,
                ) ||
            [];
        children.push({
            map,
            mount,
        });
        childrenByParent.set(
            mount.parentMapId,
            children,
        );
    }
    const entries = [];
    const visited =
        new Set();
    const append =
        (
            map,
            depth = 0,
            parentRoomId = '',
        ) => {
            if (
                !map?.id ||
                visited.has(map.id)
            ) {
                return;
            }
            visited.add(map.id);
            entries.push({
                map,
                depth,
                parentRoomId,
            });
            const children =
                childrenByParent
                    .get(map.id) ||
                [];
            children
                .sort((left, right) =>
                    text(
                        left.map.name ||
                        left.map.nameEn ||
                        left.map.id,
                    ).localeCompare(
                        text(
                            right.map
                                .name ||
                            right.map
                                .nameEn ||
                            right.map.id,
                        ),
                    ))
                .forEach(child =>
                    append(
                        child.map,
                        depth + 1,
                        child.mount
                            .parentRoomId,
                    ));
        };
    for (
        const map of mapsById
            .values()
    ) {
        if (
            map &&
            !getInteriorMount(map)
        ) {
            append(map);
        }
    }
    for (
        const map of mapsById
            .values()
    ) {
        append(map);
    }
    return entries;
}
