// Extracted from the helpers compatibility facade for Task 4.

import {
    getMapRooms,
} from './map-access.js';

export const ACTOR_MOVEMENT_HISTORY_VERSION = 2;

export const OPENING_ID_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export const EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN =
    /(?:→|->)\s*(?:【\s*([^】\n]+?)\s*】|([^\n。！？!?]+))/u;

export const SPATIAL_STATE_VERSION = 7;

const SPATIAL_INFERENCE_STOPWORDS = new Set([
    'steps',
    'lobby',
    'entrance',
    'door',
    'doorway',
    'room',
    'hall',
    'hallway',
    'shop',
    'street',
    'corridor',
    'compartment',
    'carriage',
    'gryffindor',
    'hufflepuff',
    'ravenclaw',
    'slytherin',
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'standing',
    'walking',
    'behind',
    'inside',
    'outside',
]);

export function getMapExits(map, mapState = {}) {
    if (!map) return [];
    return [
        ...(map.exits || []),
        ...(mapState.generatedLocalExits || [])
            .filter(route => route.mapId === map.id),
    ];
}

export function normalizeSpatialText(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsSpatialPhrase(
    text,
    phrase,
) {
    if (!text || !phrase) return false;
    return /[\u3400-\u9FFF]/u.test(
        phrase,
    )
        ? text.includes(phrase)
        : ` ${text} `.includes(
            ` ${phrase} `,
        );
}

export function inferActorRoomId(actor, map, fallbackRoomId = '') {
    const rooms = getMapRooms(map);
    const activity = normalizeSpatialText(
        actor?.currentActivityEn ||
        '',
    );
    const primaryActivity = activity
        .split(/[,;]|\b(?:while|watching|looking|calling)\b/i)[0];
    let best = null;
    rooms.forEach(room => {
        let score = 0;
        for (const label of [
            room.id,
            room.nameEn,
            ...(room.aliases || []),
        ]) {
            const normalized = normalizeSpatialText(label);
            if (
                normalized.length >= 3 &&
                containsSpatialPhrase(
                    activity,
                    normalized,
                )
            ) {
                score += 1000 +
                    normalized.length;
            }
            if (
                normalized.length >= 3 &&
                containsSpatialPhrase(
                    primaryActivity,
                    normalized,
                )
            ) {
                score += 3000 +
                    normalized.length;
            }
            normalized.split(/[^\p{L}\p{N}]+/u)
                .filter(word =>
                    word.length >= 4 &&
                    !SPATIAL_INFERENCE_STOPWORDS.has(word))
                .forEach(word => {
                    if (containsSpatialPhrase(
                        activity,
                        word,
                    )) {
                        score += word.length;
                    }
                    if (containsSpatialPhrase(
                        primaryActivity,
                        word,
                    )) {
                        score += word.length * 200;
                    }
                });
        }
        if (!best || score > best.score) {
            best = { roomId: room.id, score };
        }
    });
    if (best?.score > 0) {
        return best.roomId;
    }
    return rooms.some(room => room.id === fallbackRoomId)
        ? fallbackRoomId
        : rooms[0]?.id || '';
}
