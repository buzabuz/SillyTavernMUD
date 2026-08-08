// Extracted from the helpers compatibility facade for Task 4.

import {
    getMapRooms,
} from './map-access.js';

export const ACTOR_MOVEMENT_HISTORY_VERSION = 2;

export const OPENING_ID_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export const MAGIC_ACTION_PATTERN =
    /(?:施法|念咒|施放咒语|使用魔法|发动魔法|幻影移形|\bcast(?:s|ing)?\s+(?:a\s+)?spell\b|\buse(?:s|d|ing)?\s+magic\b|\bapparat(?:e|es|ed|ing)\b)/iu;

export const INVESTIGATION_ACTION_PATTERN = /(?:调查|搜索|检查|观察|阅读|研究|翻找|询问|investigat|search|inspect|study|read)/i;

export const EXTENDED_ACTION_PATTERN = /(?:训练|练习|上课|制作|熬制|等待|睡觉|休息|train|practice|class|brew|wait|sleep|rest)/i;

export const MOVEMENT_ACTION_PATTERN = /(?:前往|去往|进入|来到|返回|抵达|走进|走到|走向|走去|赶往|跑到|跑进|跑去|冲进|冲向|冲到|冲去|穿过|跨过|出去|上楼|下楼|绕着.+跑|往.{1,40}(?:走|跑|冲|去)|go to|enter|head to|return to|travel|walk to|run to|run into|rush to|go through)/i;

export const GUIDED_MOVEMENT_ACTION_PATTERN =
    /(?:带路|领路|领着|引路|跟着|跟随|带我(?:们)?去|下一个(?:购物)?(?:点|地点)|跟(?:着|随)?[\p{L}\p{N}_·.'’ -]{1,30}(?:走|去|前往|进入|穿过)|被.{0,24}(?:拉|带|领)(?:着)?.{0,12}(?:去|到|进|穿过)|lead (?:me|us|the way)|follow|next (?:stop|shop|place)|(?:pull|take|guide|lead) (?:me|us) (?:to|through))/iu;

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
        actor?.currentActivityEn || actor?.currentActivity || '',
    );
    const primaryActivity = activity
        .split(/[,;]|\b(?:while|watching|looking|calling)\b/i)[0];
    let best = null;
    rooms.forEach(room => {
        let score = 0;
        for (const label of [
            room.id,
            room.name,
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
