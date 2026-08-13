import {
    CALENDAR_ENTRY_STATUSES,
    CALENDAR_PLANNING_TIERS,
    CALENDAR_VERSION,
    createInitialCalendarState,
    normalizeCalendarEntry,
    validateCalendarState,
} from './calendar-schema.js';

const LEGACY_CALENDAR_FIELDS =
    Object.freeze([
        'version',
        'entries',
        'horizon',
    ]);
const LEGACY_ENTRY_FIELDS =
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
    ]);
const LEGACY_ENTRY_TYPES =
    Object.freeze([
        'storyline',
        'event',
    ]);

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
            !Object.hasOwn(
                source,
                key,
            ));
    if (missing.length) {
        throw new TypeError(
            `${label} 缺少字段：${missing.join('、')}。`,
        );
    }
}

function normalizeLegacyEntry(
    source,
    index,
) {
    assertExactFields(
        source,
        LEGACY_ENTRY_FIELDS,
        `Calendar V1 entries[${index}]`,
    );
    const entry =
        normalizeCalendarEntry({
            ...source,
            sourceBeatId: '',
            beatSlot: null,
            scheduleKind: 'personal',
        });
    if (
        !LEGACY_ENTRY_TYPES.includes(
            entry.entryType,
        )
    ) {
        throw new TypeError(
            `Calendar V1 条目 ${entry.id} 的 entryType 无效。`,
        );
    }
    if (
        !CALENDAR_ENTRY_STATUSES
            .includes(
                entry.status,
            )
    ) {
        throw new TypeError(
            `Calendar V1 条目 ${entry.id} 的 status 无效。`,
        );
    }
    if (
        !CALENDAR_PLANNING_TIERS
            .includes(
                entry.planningTier,
            )
    ) {
        throw new TypeError(
            `Calendar V1 条目 ${entry.id} 的 planningTier 无效。`,
        );
    }
    return entry;
}

function legacyScheduleKind(
    entry,
) {
    const tags =
        new Set(
            entry.tags,
        );
    if (tags.has('class')) {
        return 'class';
    }
    if (
        [
            'routine',
            'breakfast',
            'lunch',
            'dinner',
            'meal',
        ].some(tag =>
            tags.has(tag))
    ) {
        return 'routine';
    }
    if (
        [
            'social',
            'date',
            'meeting',
        ].some(tag =>
            tags.has(tag))
    ) {
        return 'social';
    }
    if (
        entry.parentId ||
        entry.planningTier === 'high' ||
        tags.has('story') ||
        tags.has('canon')
    ) {
        return 'story';
    }
    return 'personal';
}

function migrateLegacyStoryline(
    entry,
) {
    return {
        id: entry.id,
        title: entry.title,
        titleEn: entry.titleEn,
        summary: entry.summary,
        summaryEn: entry.summaryEn,
        tags: entry.tags,
        startClock: entry.startClock,
        endClock: entry.endClock,
        participantIds:
            entry.participantIds,
        status:
            entry.status === 'completed'
                ? 'resolved'
                : entry.status,
        createdClock:
            entry.createdClock,
        updatedClock:
            entry.updatedClock,
    };
}

function migrateLegacyCalendar(
    source,
) {
    assertExactFields(
        source,
        LEGACY_CALENDAR_FIELDS,
        'Calendar V1',
    );
    if (source.version !== 1) {
        throw new TypeError(
            'Calendar V1 migration 只接受 version=1。',
        );
    }
    if (!Array.isArray(source.entries)) {
        throw new TypeError(
            'Calendar V1 entries 必须是数组。',
        );
    }
    const entries =
        source.entries.map(
            normalizeLegacyEntry,
        );
    const ids =
        new Set();
    entries.forEach(entry => {
        if (ids.has(entry.id)) {
            throw new TypeError(
                `Calendar V1 条目 ID ${entry.id} 重复。`,
            );
        }
        ids.add(
            entry.id,
        );
    });
    return {
        version:
            CALENDAR_VERSION,
        storylines:
            entries
                .filter(entry =>
                    entry.entryType ===
                    'storyline')
                .map(
                    migrateLegacyStoryline,
                ),
        storyBeats: [],
        entries:
            entries
                .filter(entry =>
                    entry.entryType ===
                    'event')
                .map(entry => ({
                    ...entry,
                    sourceBeatId: '',
                    beatSlot: null,
                    scheduleKind:
                        legacyScheduleKind(
                            entry,
                        ),
                })),
        horizon: source.horizon,
    };
}

export function migrateCalendarState(
    worldState,
) {
    if (
        !worldState ||
        typeof worldState !== 'object' ||
        Array.isArray(worldState)
    ) {
        throw new TypeError(
            'Calendar migration 需要世界状态对象。',
        );
    }
    const hasCalendar =
        Object.prototype
            .hasOwnProperty.call(
                worldState,
                'calendar',
            ) &&
        worldState.calendar !==
            null &&
        worldState.calendar !==
            undefined;
    const candidate =
        !hasCalendar
            ? createInitialCalendarState(
                worldState.clock,
            )
            : worldState
                .calendar
                ?.version === 1
                ? migrateLegacyCalendar(
                    worldState.calendar,
                )
                : worldState.calendar;
    const calendar =
        validateCalendarState(
            candidate,
            worldState,
        );
    if (!calendar.valid) {
        throw new TypeError(
            `Calendar migration 拒绝非法状态：${calendar.errors.join('；')}`,
        );
    }
    const changed =
        !hasCalendar ||
        JSON.stringify(
            worldState.calendar,
        ) !==
        JSON.stringify(
            calendar.calendar,
        );
    if (!changed) {
        return {
            state: worldState,
            changed: false,
        };
    }
    return {
        state: {
            ...worldState,
            calendar:
                calendar.calendar,
        },
        changed: true,
    };
}
