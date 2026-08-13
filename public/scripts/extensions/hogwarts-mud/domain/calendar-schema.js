import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

export const CALENDAR_VERSION = 2;

export const CALENDAR_STORYLINE_FIELDS =
    Object.freeze([
        'id',
        'title',
        'titleEn',
        'summary',
        'summaryEn',
        'tags',
        'startClock',
        'endClock',
        'participantIds',
        'status',
        'createdClock',
        'updatedClock',
    ]);

export const CALENDAR_STORY_BEAT_FIELDS =
    Object.freeze([
        'id',
        'storylineId',
        'title',
        'titleEn',
        'summary',
        'summaryEn',
        'tags',
        'termKey',
        'sequence',
        'windowStartClock',
        'windowEndClock',
        'sceneTarget',
        'status',
        'relatedSceneIds',
        'createdClock',
        'updatedClock',
    ]);

export const CALENDAR_SCHEDULE_FIELDS =
    Object.freeze([
        'id',
        'parentId',
        'entryType',
        'title',
        'titleEn',
        'summary',
        'summaryEn',
        'tags',
        'startClock',
        'endClock',
        'participantIds',
        'mapId',
        'roomId',
        'status',
        'planningTier',
        'relatedSceneIds',
        'createdClock',
        'updatedClock',
        'sourceBeatId',
        'beatSlot',
        'scheduleKind',
    ]);

// Keep the V1 export name while entries[] narrows to schedules.
export const CALENDAR_ENTRY_FIELDS =
    CALENDAR_SCHEDULE_FIELDS;

export const CALENDAR_ENTRY_TYPES =
    Object.freeze([
        'event',
    ]);

export const CALENDAR_STORYLINE_STATUSES =
    Object.freeze([
        'planned',
        'active',
        'resolved',
        'cancelled',
    ]);

export const CALENDAR_STORY_BEAT_STATUSES =
    Object.freeze([
        'planned',
        'active',
        'realized',
        'deferred',
        'cancelled',
    ]);

export const CALENDAR_ENTRY_STATUSES =
    Object.freeze([
        'planned',
        'active',
        'completed',
        'cancelled',
    ]);

export const CALENDAR_PLANNING_TIERS =
    Object.freeze([
        'high',
        'medium',
    ]);

export const CALENDAR_SCHEDULE_KINDS =
    Object.freeze([
        'routine',
        'class',
        'story',
        'social',
        'personal',
    ]);

const CALENDAR_FIELDS =
    Object.freeze([
        'version',
        'storylines',
        'storyBeats',
        'entries',
        'horizon',
    ]);
const STABLE_ID_PATTERN =
    /^[a-z][a-z0-9_]{1,127}$/u;
const TERM_KEY_PATTERN =
    /^[a-z0-9][a-z0-9_]{1,127}$/u;
const WORLD_CLOCK_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2}) · (\d{2}):(\d{2})$/u;

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function assertExactFields(
    source,
    fields,
    label,
) {
    if (!isRecord(source)) {
        throw new TypeError(
            `${label} 必须是对象。`,
        );
    }
    const allowed =
        new Set(fields);
    const unknown =
        Object.keys(source)
            .filter(key =>
                !allowed.has(key));
    if (unknown.length) {
        throw new TypeError(
            `${label} 包含未知字段：${unknown.join('、')}。`,
        );
    }
    const missing =
        fields.filter(key =>
            !Object.prototype
                .hasOwnProperty.call(
                    source,
                    key,
                ));
    if (missing.length) {
        throw new TypeError(
            `${label} 缺少字段：${missing.join('、')}。`,
        );
    }
}

function normalizedText(
    value,
    label,
    {
        allowEmpty = false,
        lowerCase = false,
    } = {},
) {
    if (typeof value !== 'string') {
        throw new TypeError(
            `${label} 必须是字符串。`,
        );
    }
    const normalized =
        value.normalize('NFKC')
            .replace(/\s+/gu, ' ')
            .trim();
    if (
        !allowEmpty &&
        !normalized
    ) {
        throw new TypeError(
            `${label} 不能为空。`,
        );
    }
    return lowerCase
        ? normalized
            .toLocaleLowerCase()
        : normalized;
}

function normalizedStringArray(
    value,
    label,
    {
        lowerCase = false,
    } = {},
) {
    if (!Array.isArray(value)) {
        throw new TypeError(
            `${label} 必须是数组。`,
        );
    }
    const seen =
        new Set();
    const normalized = [];
    value.forEach(
        (entry, index) => {
            const text =
                normalizedText(
                    entry,
                    `${label}[${index}]`,
                    {
                        lowerCase,
                    },
                );
            if (!seen.has(text)) {
                seen.add(text);
                normalized.push(text);
            }
        },
    );
    return normalized;
}

function clockParts(clock) {
    const match =
        WORLD_CLOCK_PATTERN.exec(
            String(clock || ''),
        );
    if (!match) {
        return null;
    }
    const [
        ,
        year,
        month,
        day,
        hour,
        minute,
    ] = match.map(Number);
    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
            ),
        );
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !==
            month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute
    ) {
        return null;
    }
    return {
        value:
            Math.floor(
                date.getTime() /
                60000,
            ),
    };
}

export function isCalendarWorldClock(
    clock,
) {
    return Boolean(
        clockParts(clock),
    );
}

function normalizedInteger(
    value,
    label,
) {
    if (!Number.isSafeInteger(value)) {
        throw new TypeError(
            `${label} 必须是安全整数。`,
        );
    }
    return value;
}

function normalizedNullableInteger(
    value,
    label,
) {
    if (value === null) {
        return null;
    }
    return normalizedInteger(
        value,
        label,
    );
}

export function normalizeCalendarStoryline(
    source,
) {
    assertExactFields(
        source,
        CALENDAR_STORYLINE_FIELDS,
        'Calendar storyline',
    );
    return {
        id:
            normalizedText(
                source.id,
                'Calendar storyline id',
            ),
        title:
            normalizedText(
                source.title,
                'Calendar storyline title',
            ),
        titleEn:
            normalizedText(
                source.titleEn,
                'Calendar storyline titleEn',
            ),
        summary:
            normalizedText(
                source.summary,
                'Calendar storyline summary',
            ),
        summaryEn:
            normalizedText(
                source.summaryEn,
                'Calendar storyline summaryEn',
            ),
        tags:
            normalizedStringArray(
                source.tags,
                'Calendar storyline tags',
                {
                    lowerCase: true,
                },
            ),
        startClock:
            normalizedText(
                source.startClock,
                'Calendar storyline startClock',
            ),
        endClock:
            normalizedText(
                source.endClock,
                'Calendar storyline endClock',
            ),
        participantIds:
            normalizedStringArray(
                source.participantIds,
                'Calendar storyline participantIds',
            ),
        status:
            normalizedText(
                source.status,
                'Calendar storyline status',
                {
                    lowerCase: true,
                },
            ),
        createdClock:
            normalizedText(
                source.createdClock,
                'Calendar storyline createdClock',
            ),
        updatedClock:
            normalizedText(
                source.updatedClock,
                'Calendar storyline updatedClock',
            ),
    };
}

export function normalizeCalendarStoryBeat(
    source,
) {
    assertExactFields(
        source,
        CALENDAR_STORY_BEAT_FIELDS,
        'Calendar storyBeat',
    );
    return {
        id:
            normalizedText(
                source.id,
                'Calendar storyBeat id',
            ),
        storylineId:
            normalizedText(
                source.storylineId,
                'Calendar storyBeat storylineId',
            ),
        title:
            normalizedText(
                source.title,
                'Calendar storyBeat title',
            ),
        titleEn:
            normalizedText(
                source.titleEn,
                'Calendar storyBeat titleEn',
            ),
        summary:
            normalizedText(
                source.summary,
                'Calendar storyBeat summary',
            ),
        summaryEn:
            normalizedText(
                source.summaryEn,
                'Calendar storyBeat summaryEn',
            ),
        tags:
            normalizedStringArray(
                source.tags,
                'Calendar storyBeat tags',
                {
                    lowerCase: true,
                },
            ),
        termKey:
            normalizedText(
                source.termKey,
                'Calendar storyBeat termKey',
                {
                    lowerCase: true,
                },
            ),
        sequence:
            normalizedInteger(
                source.sequence,
                'Calendar storyBeat sequence',
            ),
        windowStartClock:
            normalizedText(
                source.windowStartClock,
                'Calendar storyBeat windowStartClock',
            ),
        windowEndClock:
            normalizedText(
                source.windowEndClock,
                'Calendar storyBeat windowEndClock',
            ),
        sceneTarget:
            normalizedInteger(
                source.sceneTarget,
                'Calendar storyBeat sceneTarget',
            ),
        status:
            normalizedText(
                source.status,
                'Calendar storyBeat status',
                {
                    lowerCase: true,
                },
            ),
        relatedSceneIds:
            normalizedStringArray(
                source.relatedSceneIds,
                'Calendar storyBeat relatedSceneIds',
            ),
        createdClock:
            normalizedText(
                source.createdClock,
                'Calendar storyBeat createdClock',
            ),
        updatedClock:
            normalizedText(
                source.updatedClock,
                'Calendar storyBeat updatedClock',
            ),
    };
}

export function normalizeCalendarSchedule(
    source,
) {
    assertExactFields(
        source,
        CALENDAR_SCHEDULE_FIELDS,
        'Calendar schedule',
    );
    return {
        id:
            normalizedText(
                source.id,
                'Calendar schedule id',
            ),
        parentId:
            source.parentId === null
                ? ''
                : normalizedText(
                    source.parentId,
                    'Calendar schedule parentId',
                    {
                        allowEmpty: true,
                    },
                ),
        entryType:
            normalizedText(
                source.entryType,
                'Calendar schedule entryType',
                {
                    lowerCase: true,
                },
            ),
        title:
            normalizedText(
                source.title,
                'Calendar schedule title',
            ),
        titleEn:
            normalizedText(
                source.titleEn,
                'Calendar schedule titleEn',
            ),
        summary:
            normalizedText(
                source.summary,
                'Calendar schedule summary',
            ),
        summaryEn:
            normalizedText(
                source.summaryEn,
                'Calendar schedule summaryEn',
            ),
        tags:
            normalizedStringArray(
                source.tags,
                'Calendar schedule tags',
                {
                    lowerCase: true,
                },
            ),
        startClock:
            normalizedText(
                source.startClock,
                'Calendar schedule startClock',
            ),
        endClock:
            normalizedText(
                source.endClock,
                'Calendar schedule endClock',
            ),
        participantIds:
            normalizedStringArray(
                source.participantIds,
                'Calendar schedule participantIds',
            ),
        mapId:
            normalizedText(
                source.mapId,
                'Calendar schedule mapId',
            ),
        roomId:
            normalizedText(
                source.roomId,
                'Calendar schedule roomId',
            ),
        status:
            normalizedText(
                source.status,
                'Calendar schedule status',
                {
                    lowerCase: true,
                },
            ),
        planningTier:
            normalizedText(
                source.planningTier,
                'Calendar schedule planningTier',
                {
                    lowerCase: true,
                },
            ),
        relatedSceneIds:
            normalizedStringArray(
                source.relatedSceneIds,
                'Calendar schedule relatedSceneIds',
            ),
        createdClock:
            normalizedText(
                source.createdClock,
                'Calendar schedule createdClock',
            ),
        updatedClock:
            normalizedText(
                source.updatedClock,
                'Calendar schedule updatedClock',
            ),
        sourceBeatId:
            source.sourceBeatId === null
                ? ''
                : normalizedText(
                    source.sourceBeatId,
                    'Calendar schedule sourceBeatId',
                    {
                        allowEmpty: true,
                    },
                ),
        beatSlot:
            normalizedNullableInteger(
                source.beatSlot,
                'Calendar schedule beatSlot',
            ),
        scheduleKind:
            normalizedText(
                source.scheduleKind,
                'Calendar schedule scheduleKind',
                {
                    lowerCase: true,
                },
            ),
    };
}

export function normalizeCalendarEntry(
    source,
) {
    return normalizeCalendarSchedule(
        source,
    );
}

export function normalizeCalendarState(
    source,
) {
    assertExactFields(
        source,
        CALENDAR_FIELDS,
        'Calendar',
    );
    for (const field of [
        'storylines',
        'storyBeats',
        'entries',
    ]) {
        if (Array.isArray(source[field])) {
            continue;
        }
        throw new TypeError(
            `Calendar ${field} 必须是数组。`,
        );
    }
    return {
        version: source.version,
        storylines:
            source.storylines.map(
                normalizeCalendarStoryline,
            ),
        storyBeats:
            source.storyBeats.map(
                normalizeCalendarStoryBeat,
            ),
        entries:
            source.entries.map(
                normalizeCalendarSchedule,
            ),
        horizon:
            normalizedText(
                source.horizon,
                'Calendar horizon',
            ),
    };
}

function validateStableId(
    value,
    label,
    errors,
) {
    if (
        !STABLE_ID_PATTERN.test(
            value,
        )
    ) {
        errors.push(
            `${label} 必须是稳定 snake_case ID。`,
        );
    }
}

function validateClockRange(
    record,
    {
        startField,
        endField,
        label,
    },
    errors,
) {
    const start =
        clockParts(
            record[startField],
        );
    const end =
        clockParts(
            record[endField],
        );
    const created =
        clockParts(
            record.createdClock,
        );
    const updated =
        clockParts(
            record.updatedClock,
        );
    if (!start) {
        errors.push(
            `${label} 的 ${startField} 不是绝对世界时钟。`,
        );
    }
    if (!end) {
        errors.push(
            `${label} 的 ${endField} 不是绝对世界时钟。`,
        );
    }
    if (
        start &&
        end &&
        end.value < start.value
    ) {
        errors.push(
            `${label} 的 ${endField} 早于 ${startField}。`,
        );
    }
    if (!created) {
        errors.push(
            `${label} 的 createdClock 不是绝对世界时钟。`,
        );
    }
    if (!updated) {
        errors.push(
            `${label} 的 updatedClock 不是绝对世界时钟。`,
        );
    }
    if (
        created &&
        updated &&
        updated.value < created.value
    ) {
        errors.push(
            `${label} 的 updatedClock 早于 createdClock。`,
        );
    }
    return {
        start,
        end,
    };
}

function validateActiveStart(
    status,
    start,
    currentClock,
    label,
    errors,
) {
    if (
        status === 'active' &&
        start &&
        currentClock &&
        start.value >
            currentClock.value
    ) {
        errors.push(
            `${label} 的 active 状态无效：开始时钟晚于当前世界时钟。`,
        );
    }
}

function validateStorylineValues(
    storyline,
    index,
    currentClock,
    errors,
) {
    const prefix =
        `Calendar storyline ${storyline.id || index}`;
    validateStableId(
        storyline.id,
        `${prefix} 的 id`,
        errors,
    );
    if (
        !CALENDAR_STORYLINE_STATUSES
            .includes(
                storyline.status,
            )
    ) {
        errors.push(
            `${prefix} 的 status 无效。`,
        );
    }
    const {
        start,
    } =
        validateClockRange(
            storyline,
            {
                startField:
                    'startClock',
                endField:
                    'endClock',
                label:
                    prefix,
            },
            errors,
        );
    validateActiveStart(
        storyline.status,
        start,
        currentClock,
        prefix,
        errors,
    );
}

function validateStoryBeatValues(
    beat,
    index,
    currentClock,
    errors,
) {
    const prefix =
        `Calendar storyBeat ${beat.id || index}`;
    validateStableId(
        beat.id,
        `${prefix} 的 id`,
        errors,
    );
    validateStableId(
        beat.storylineId,
        `${prefix} 的 storylineId`,
        errors,
    );
    if (
        !TERM_KEY_PATTERN.test(
            beat.termKey,
        )
    ) {
        errors.push(
            `${prefix} 的 termKey 必须是稳定键。`,
        );
    }
    if (
        beat.sequence < 1
    ) {
        errors.push(
            `${prefix} 的 sequence 必须是正整数。`,
        );
    }
    if (beat.sceneTarget !== 4) {
        errors.push(
            `${prefix} 的 sceneTarget 必须固定为 4。`,
        );
    }
    if (
        !CALENDAR_STORY_BEAT_STATUSES
            .includes(
                beat.status,
            )
    ) {
        errors.push(
            `${prefix} 的 status 无效。`,
        );
    }
    const {
        start,
    } =
        validateClockRange(
            beat,
            {
                startField:
                    'windowStartClock',
                endField:
                    'windowEndClock',
                label:
                    prefix,
            },
            errors,
        );
    validateActiveStart(
        beat.status,
        start,
        currentClock,
        prefix,
        errors,
    );
}

function validateScheduleValues(
    entry,
    index,
    currentClock,
    errors,
) {
    const prefix =
        `Calendar schedule ${entry.id || index}`;
    validateStableId(
        entry.id,
        `${prefix} 的 id`,
        errors,
    );
    if (entry.parentId) {
        validateStableId(
            entry.parentId,
            `${prefix} 的 parentId`,
            errors,
        );
    }
    if (entry.sourceBeatId) {
        validateStableId(
            entry.sourceBeatId,
            `${prefix} 的 sourceBeatId`,
            errors,
        );
    }
    if (
        !CALENDAR_ENTRY_TYPES.includes(
            entry.entryType,
        )
    ) {
        errors.push(
            `${prefix} 的 entryType 无效。`,
        );
    }
    if (
        !CALENDAR_ENTRY_STATUSES
            .includes(
                entry.status,
            )
    ) {
        errors.push(
            `${prefix} 的 status 无效。`,
        );
    }
    if (
        !CALENDAR_PLANNING_TIERS
            .includes(
                entry.planningTier,
            )
    ) {
        errors.push(
            `${prefix} 的 planningTier 无效。`,
        );
    }
    if (
        !CALENDAR_SCHEDULE_KINDS
            .includes(
                entry.scheduleKind,
            )
    ) {
        errors.push(
            `${prefix} 的 scheduleKind 无效。`,
        );
    }
    if (entry.sourceBeatId) {
        if (
            entry.beatSlot < 1 ||
            entry.beatSlot > 4
        ) {
            errors.push(
                `${prefix} 的 beatSlot 必须是 1..4。`,
            );
        }
    } else if (entry.beatSlot !== null) {
        errors.push(
            `${prefix} 没有 sourceBeatId 时 beatSlot 必须为 null。`,
        );
    }
    const {
        start,
    } =
        validateClockRange(
            entry,
            {
                startField:
                    'startClock',
                endField:
                    'endClock',
                label:
                    prefix,
            },
            errors,
        );
    validateActiveStart(
        entry.status,
        start,
        currentClock,
        prefix,
        errors,
    );
}

function authorityIds(
    worldState,
) {
    const actorIds =
        new Set(
            (
                Array.isArray(
                    worldState.actorLibrary,
                )
                    ? worldState
                        .actorLibrary
                    : []
            )
                .map(actor =>
                    String(
                        actor?.id ||
                        '',
                    ))
                .filter(Boolean),
        );
    const archiveIds =
        new Set(
            (
                Array.isArray(
                    worldState.sceneArchive,
                )
                    ? worldState
                        .sceneArchive
                    : []
            )
                .map(scene =>
                    String(
                        scene?.id ||
                        '',
                    ))
                .filter(Boolean),
        );
    return {
        actorIds,
        archiveIds,
    };
}

function validateActorReferences(
    record,
    label,
    actorIds,
    errors,
) {
    record.participantIds
        .forEach(actorId => {
            if (
                !actorIds.has(
                    actorId,
                )
            ) {
                errors.push(
                    `${label} 引用了不存在的 Actor ${actorId}。`,
                );
            }
        });
}

function validateSceneReferences(
    sceneIds,
    label,
    archiveIds,
    errors,
) {
    sceneIds.forEach(sceneId => {
        if (
            !archiveIds.has(
                sceneId,
            )
        ) {
            errors.push(
                `${label} 引用了不存在的封存 Scene ${sceneId}。`,
            );
        }
    });
}

function validateStorylineReferences(
    storylines,
    actorIds,
    errors,
) {
    storylines.forEach(storyline => {
        validateActorReferences(
            storyline,
            `Calendar storyline ${storyline.id}`,
            actorIds,
            errors,
        );
    });
}

function validateStoryBeatReferences(
    beats,
    storylineIds,
    archiveIds,
    errors,
) {
    const termKeys =
        new Map();
    const lastSequences =
        new Map();
    beats.forEach(beat => {
        if (
            !storylineIds.has(
                beat.storylineId,
            )
        ) {
            errors.push(
                `Calendar storyBeat ${beat.id} 引用了不存在的 storyline ${beat.storylineId}。`,
            );
        }
        const terms =
            termKeys.get(
                beat.storylineId,
            ) ||
            new Set();
        if (terms.has(beat.termKey)) {
            errors.push(
                `Calendar storyline ${beat.storylineId} 的 termKey ${beat.termKey} 重复。`,
            );
        }
        terms.add(
            beat.termKey,
        );
        termKeys.set(
            beat.storylineId,
            terms,
        );
        const lastSequence =
            lastSequences.get(
                beat.storylineId,
            );
        if (
            lastSequence !== undefined &&
            beat.sequence <= lastSequence
        ) {
            errors.push(
                `Calendar storyline ${beat.storylineId} 的 storyBeat sequence 必须严格递增。`,
            );
        }
        lastSequences.set(
            beat.storylineId,
            beat.sequence,
        );
        validateSceneReferences(
            beat.relatedSceneIds,
            `Calendar storyBeat ${beat.id}`,
            archiveIds,
            errors,
        );
    });
}

function validateScheduleLocation(
    entry,
    worldState,
    errors,
) {
    const map =
        getLocalMapDefinition(
            entry.mapId,
            worldState.map ||
            {},
        );
    if (!map) {
        errors.push(
            `Calendar schedule ${entry.id} 引用了不存在的地图 ${entry.mapId}。`,
        );
        return;
    }
    if (
        !getMapRooms(
            map,
            worldState.map ||
            {},
        ).some(room =>
            room.id ===
            entry.roomId)
    ) {
        errors.push(
            `Calendar schedule ${entry.id} 的房间 ${entry.roomId} 不属于地图 ${entry.mapId}。`,
        );
    }
}

function validateScheduleReferences(
    entries,
    storylines,
    beats,
    worldState,
    actorIds,
    archiveIds,
    errors,
) {
    const storylineIds =
        new Set(
            storylines.map(entry =>
                entry.id),
        );
    const beatIds =
        new Set(
            beats.map(beat =>
                beat.id),
        );
    const occupiedSlots =
        new Set();
    entries.forEach(entry => {
        if (
            entry.parentId &&
            !storylineIds.has(
                entry.parentId,
            )
        ) {
            errors.push(
                `Calendar schedule ${entry.id} 引用了不存在的 legacy storyline ${entry.parentId}。`,
            );
        }
        if (entry.sourceBeatId) {
            if (
                !beatIds.has(
                    entry.sourceBeatId,
                )
            ) {
                errors.push(
                    `Calendar schedule ${entry.id} 引用了不存在的 storyBeat ${entry.sourceBeatId}。`,
                );
            }
            const slotKey =
                `${entry.sourceBeatId}:${entry.beatSlot}`;
            if (
                occupiedSlots.has(
                    slotKey,
                )
            ) {
                errors.push(
                    `Calendar storyBeat ${entry.sourceBeatId} 的 beatSlot ${entry.beatSlot} 重复。`,
                );
            }
            occupiedSlots.add(
                slotKey,
            );
        }
        validateActorReferences(
            entry,
            `Calendar schedule ${entry.id}`,
            actorIds,
            errors,
        );
        validateScheduleLocation(
            entry,
            worldState,
            errors,
        );
        validateSceneReferences(
            entry.relatedSceneIds,
            `Calendar schedule ${entry.id}`,
            archiveIds,
            errors,
        );
    });
}

function validateUniqueIds(
    records,
    label,
    errors,
) {
    const ids =
        new Set();
    records.forEach(record => {
        if (ids.has(record.id)) {
            errors.push(
                `${label} ID ${record.id} 重复。`,
            );
        }
        ids.add(
            record.id,
        );
    });
}

export function validateCalendarState(
    source,
    worldState = {},
) {
    const errors = [];
    let calendar = null;
    try {
        calendar =
            normalizeCalendarState(
                source,
            );
    } catch (error) {
        errors.push(
            String(
                error?.message ||
                error,
            ),
        );
        return {
            valid: false,
            errors,
            calendar: null,
        };
    }
    if (
        calendar.version !==
        CALENDAR_VERSION
    ) {
        errors.push(
            `Calendar version 必须是 ${CALENDAR_VERSION}。`,
        );
    }
    if (
        !isCalendarWorldClock(
            calendar.horizon,
        )
    ) {
        errors.push(
            'Calendar horizon 必须是绝对世界时钟。',
        );
    }
    const currentClock =
        clockParts(
            worldState.clock,
        );
    calendar.storylines
        .forEach(
            (storyline, index) =>
                validateStorylineValues(
                    storyline,
                    index,
                    currentClock,
                    errors,
                ),
        );
    calendar.storyBeats
        .forEach(
            (beat, index) =>
                validateStoryBeatValues(
                    beat,
                    index,
                    currentClock,
                    errors,
                ),
        );
    calendar.entries
        .forEach(
            (entry, index) =>
                validateScheduleValues(
                    entry,
                    index,
                    currentClock,
                    errors,
                ),
        );
    validateUniqueIds(
        calendar.storylines,
        'Calendar storyline',
        errors,
    );
    validateUniqueIds(
        calendar.storyBeats,
        'Calendar storyBeat',
        errors,
    );
    validateUniqueIds(
        calendar.entries,
        'Calendar schedule',
        errors,
    );
    const {
        actorIds,
        archiveIds,
    } =
        authorityIds(
            worldState,
        );
    validateStorylineReferences(
        calendar.storylines,
        actorIds,
        errors,
    );
    const storylineIds =
        new Set(
            calendar.storylines
                .map(storyline =>
                    storyline.id),
        );
    validateStoryBeatReferences(
        calendar.storyBeats,
        storylineIds,
        archiveIds,
        errors,
    );
    validateScheduleReferences(
        calendar.entries,
        calendar.storylines,
        calendar.storyBeats,
        worldState,
        actorIds,
        archiveIds,
        errors,
    );
    return {
        valid:
            errors.length === 0,
        errors,
        calendar,
    };
}

export function createInitialCalendarState(
    clock,
) {
    const horizon =
        normalizedText(
            clock,
            'Calendar horizon',
        );
    if (
        !isCalendarWorldClock(
            horizon,
        )
    ) {
        throw new TypeError(
            'Calendar horizon 必须是绝对世界时钟。',
        );
    }
    return {
        version:
            CALENDAR_VERSION,
        storylines: [],
        storyBeats: [],
        entries: [],
        horizon,
    };
}
