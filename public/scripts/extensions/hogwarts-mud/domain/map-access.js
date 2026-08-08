import {
    getPresetLocalMap,
} from '../map-pack.js';

export function getLocalMapDefinition(mapId, mapState = {}) {
    return (mapState.customLocalMaps || []).find(map => map.id === mapId) || getPresetLocalMap(mapId);
}

export function getMapRooms(map, mapState = {}) {
    if (!map) return [];
    return [
        ...(map.nodes || []),
        ...(mapState.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ];
}
