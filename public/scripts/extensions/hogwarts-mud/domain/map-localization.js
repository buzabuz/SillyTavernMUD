import {
    createLocalizationField,
} from './localization-candidates.js';

const FIELD_KEY_SUFFIX = Object.freeze({
    descriptionEn: 'description',
    layoutRuleEn: 'layout_rule',
    nameEn: 'name',
    subtitleEn: 'subtitle',
    summaryEn: 'summary',
});

function field(
    staticKey,
    recordKind,
    recordId,
    fieldPath,
    sourceTextEn,
) {
    return {
        ...createLocalizationField(
            recordKind,
            recordId,
            fieldPath,
            sourceTextEn,
        ),
        staticKey,
    };
}

export function createWorldRegionField(
    region,
    fieldPath = 'nameEn',
) {
    return field(
        `world.region.${region.id}.${FIELD_KEY_SUFFIX[fieldPath]}`,
        'world_region',
        region.id,
        fieldPath,
        region[fieldPath],
    );
}

export function createWorldMapNodeField(
    node,
    fieldPath = 'nameEn',
) {
    return field(
        `world.node.${node.id}.${FIELD_KEY_SUFFIX[fieldPath]}`,
        'world_map_node',
        node.id,
        fieldPath,
        node[fieldPath],
    );
}

export function createLocalMapField(
    map,
    fieldPath = 'nameEn',
) {
    return field(
        `map.${map.id}.${FIELD_KEY_SUFFIX[fieldPath]}`,
        'local_map',
        map.id,
        fieldPath,
        map[fieldPath],
    );
}

export function createLocalMapLevelField(
    mapId,
    level,
) {
    return field(
        `map.${mapId}.level.${level.id}.name`,
        'local_map_level',
        `${mapId}:${level.id}`,
        'nameEn',
        level.nameEn,
    );
}

export function createLocalMapRoomField(
    mapId,
    room,
    fieldPath = 'nameEn',
) {
    return field(
        `map.${mapId}.room.${room.id}.${FIELD_KEY_SUFFIX[fieldPath]}`,
        'local_map_room',
        `${mapId}:${room.id}`,
        fieldPath,
        room[fieldPath],
    );
}
