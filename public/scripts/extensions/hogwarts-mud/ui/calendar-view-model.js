import {
    projectCalendarByDate,
    projectCalendarStorylines,
} from '../domain/calendar-projection.js';
import {
    getCalendarMomentContext,
    projectSceneArchiveHistory,
    readSceneArchiveRecord,
} from '../domain/calendar-scene.js';
import {
    worldClockToEpochMinutes,
} from '../domain/time-environment.js';
import {
    LOCAL_MAP_CATALOG,
} from '../map-pack.js';
import {
    getLocalMapDefinition,
    getMapRooms,
} from '../domain/map-access.js';
import {
    calculateCalendarDayGrid,
    calculateCalendarWeekGrid,
} from './calendar-day-grid.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const WEEKDAYS = Object.freeze(['一', '二', '三', '四', '五', '六', '日']);
const STATUS_LABELS = Object.freeze({
    planned: '计划中',
    active: '进行中',
    completed: '已完成时间段',
    cancelled: '已取消',
});
const SCHEDULE_KIND_LABELS = Object.freeze({
    routine: '日常',
    class: '课程',
    story: '剧情',
    social: '社交',
    personal: '个人',
});
const STORYLINE_STATUS_LABELS = Object.freeze({
    planned: '规划中',
    active: '推进中',
    resolved: '已收束',
    cancelled: '已取消',
});
const BEAT_STATUS_LABELS = Object.freeze({
    planned: '待排演',
    active: '进行中',
    realized: '已实现',
    deferred: '已顺延',
    cancelled: '已取消',
});
const TIER_LABELS = Object.freeze({
    high: '高级规划',
    medium: '中级规划',
});

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function firstText(...values) {
    return values
        .map(value => String(value || '').normalize('NFKC').trim())
        .find(Boolean) || '';
}

export function calendarDateFromClock(clock) {
    const date = String(clock || '').slice(0, 10);
    return DATE_PATTERN.test(date) ? date : '';
}

function parseDate(date) {
    if (!DATE_PATTERN.test(date)) return null;
    const [year, month, day] = date.split('-').map(Number);
    const value = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(value.getTime()) ? null : value;
}

function formatDate(value) {
    return [
        value.getUTCFullYear(),
        String(value.getUTCMonth() + 1).padStart(2, '0'),
        String(value.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

function shiftDate(date, days) {
    const value = parseDate(date);
    if (!value) return '';
    value.setUTCDate(value.getUTCDate() + days);
    return formatDate(value);
}

function shiftMonth(date, months) {
    const value = parseDate(date);
    if (!value) return '';
    const day = value.getUTCDate();
    value.setUTCDate(1);
    value.setUTCMonth(value.getUTCMonth() + months);
    const finalDay = new Date(Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth() + 1,
        0,
    )).getUTCDate();
    value.setUTCDate(Math.min(day, finalDay));
    return formatDate(value);
}

function weekdayIndex(date) {
    const value = parseDate(date);
    return value ? (value.getUTCDay() + 6) % 7 : 0;
}

function fullDateLabel(date) {
    const value = parseDate(date);
    if (!value) return date;
    return `${value.getUTCFullYear()} 年 ${value.getUTCMonth() + 1} 月 ${value.getUTCDate()} 日 · 周${WEEKDAYS[weekdayIndex(date)]}`;
}

function fullMonthLabel(date) {
    const value = parseDate(date);
    if (!value) return date;
    return `${value.getUTCFullYear()} 年 ${value.getUTCMonth() + 1} 月`;
}

function timeLabel(clock) {
    const value = String(clock || '');
    return value.includes(' · ')
        ? value.split(' · ').at(-1)
        : value || '时间未知';
}

function intervalLabel(startClock, endClock) {
    if (!startClock && !endClock) return '时间未知';
    return `${startClock || '未知'} → ${endClock || '未知'}`;
}

function durationLabel(startClock, endClock) {
    const start = worldClockToEpochMinutes(startClock);
    const end = worldClockToEpochMinutes(endClock);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end < start
    ) {
        return '时长未知';
    }
    const minutes = end - start;
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder
        ? `${hours} 小时 ${remainder} 分钟`
        : `${hours} 小时`;
}

function actorDirectory(worldState) {
    const directory = new Map();
    for (const actor of [
        ...asArray(worldState?.actorLibrary),
        ...asArray(worldState?.actors),
    ]) {
        const id = firstText(actor?.id);
        if (id) {
            directory.set(id, {
                ...(directory.get(id) || {}),
                ...actor,
            });
        }
    }
    return directory;
}

function participantViews(worldState, participantIds) {
    const directory = actorDirectory(worldState);
    return asArray(participantIds).map(id => ({
        id,
        name: firstText(
            directory.get(id)?.name,
            directory.get(id)?.nameEn,
            id,
        ),
    }));
}

function readOnlyReason(worldState, entry) {
    if (entry.status === 'completed') {
        return '安排时间已经发生；完成状态不代表叙事结果。';
    }
    if (entry.status === 'cancelled') {
        return '该安排已经取消，只能阅读。';
    }
    if (entry.status === 'active') {
        return '该安排已经开始，只能阅读当前记录。';
    }
    const current = worldClockToEpochMinutes(worldState?.clock);
    const start = worldClockToEpochMinutes(entry.startClock);
    const end = worldClockToEpochMinutes(entry.endClock);
    if (Number.isFinite(end) && Number.isFinite(current) && end < current) {
        return '该安排的时间已经过去，只能阅读。';
    }
    if (Number.isFinite(start) && Number.isFinite(current) && start < current) {
        return '该安排的开始时间已经过去，不能重新进入。';
    }
    try {
        getCalendarMomentContext(worldState, entry.id);
        return '';
    } catch {
        return '安排引用已失效，当前只能阅读。';
    }
}

function roomLabel(getRoomName, worldState, mapId, roomId) {
    try {
        return getRoomName(worldState, mapId, roomId);
    } catch {
        return roomId || '位置未知';
    }
}

function createStorySourceView(worldState, entry) {
    if (!entry.sourceBeatId) return null;
    const beat = asArray(worldState?.calendar?.storyBeats)
        .find(candidate => candidate.id === entry.sourceBeatId);
    const storyline = asArray(worldState?.calendar?.storylines)
        .find(candidate => candidate.id === beat?.storylineId);
    if (!beat || !storyline) return null;
    const sceneProgress = Math.min(
        beat.sceneTarget,
        new Set(beat.relatedSceneIds).size,
    );
    return {
        storylineId: storyline.id,
        storylineTitle: firstText(
            storyline.title,
            storyline.titleEn,
            storyline.id,
        ),
        beatId: beat.id,
        beatTitle: firstText(beat.title, beat.titleEn, beat.id),
        termKey: beat.termKey,
        beatSlot: entry.beatSlot,
        sceneProgress,
        sceneTarget: beat.sceneTarget,
        progressLabel: `${sceneProgress} / ${beat.sceneTarget} 场景`,
    };
}

function createEntryView(worldState, entry, getRoomName) {
    const reason = readOnlyReason(worldState, entry);
    return {
        id: entry.id,
        kind: 'calendar_entry',
        title: firstText(entry.title, entry.titleEn, entry.id),
        titleEn: firstText(entry.titleEn),
        summary: firstText(entry.summary, entry.summaryEn),
        summaryEn: firstText(entry.summaryEn),
        startClock: entry.startClock,
        endClock: entry.endClock,
        timeLabel: timeLabel(entry.startClock),
        endTimeLabel: timeLabel(entry.endClock),
        intervalLabel: intervalLabel(entry.startClock, entry.endClock),
        durationLabel: durationLabel(entry.startClock, entry.endClock),
        status: entry.status,
        statusLabel: STATUS_LABELS[entry.status] || entry.status,
        statusTone: entry.status,
        entryType: entry.entryType,
        entryTypeLabel: '日程',
        scheduleKind: entry.scheduleKind,
        scheduleKindLabel:
            SCHEDULE_KIND_LABELS[entry.scheduleKind] ||
            entry.scheduleKind,
        planningTier: entry.planningTier,
        planningTierLabel:
            TIER_LABELS[entry.planningTier] || entry.planningTier,
        parentId: entry.parentId,
        tags: [...entry.tags],
        participants: participantViews(worldState, entry.participantIds),
        mapId: entry.mapId,
        roomId: entry.roomId,
        location: roomLabel(
            getRoomName,
            worldState,
            entry.mapId,
            entry.roomId,
        ),
        createdClock: entry.createdClock,
        updatedClock: entry.updatedClock,
        source: createStorySourceView(worldState, entry),
        readOnly: Boolean(reason),
        readOnlyReason: reason,
        canEnter: !reason,
    };
}

function createSceneView(worldState, scene, getRoomName) {
    const record = readSceneArchiveRecord(worldState, scene.id);
    const linkedEntries = asArray(scene.calendarEntryIds)
        .map(id => worldState?.calendar?.entries?.find(entry => entry.id === id))
        .filter(Boolean)
        .map(entry => createEntryView(worldState, entry, getRoomName));
    const timelineEntries = asArray(record?.timelineEntries)
        .map(entry => {
            const clock = firstText(entry?.clock);
            const label = firstText(entry?.label, entry?.labelEn);
            return {
                clock,
                label,
                timeLabel: firstText(
                    entry?.timeLabel,
                    timeLabel(clock),
                ),
            };
        })
        .filter(entry => entry.clock || entry.label);
    return {
        id: scene.id,
        kind: 'scene_archive',
        title: firstText(scene.title, scene.titleEn, scene.id),
        titleEn: firstText(scene.titleEn),
        summary: firstText(scene.summary, scene.summaryEn),
        summaryEn: firstText(scene.summaryEn),
        startClock: scene.startClock,
        endClock: scene.endClock,
        timeLabel: timeLabel(scene.startClock),
        intervalLabel: intervalLabel(scene.startClock, scene.endClock),
        mapId: scene.mapId,
        roomId: scene.roomId,
        location: firstText(
            record?.location,
            roomLabel(
                getRoomName,
                worldState,
                scene.mapId,
                scene.roomId,
            ),
        ),
        linkedEntries,
        calendarEntryIds: [...asArray(scene.calendarEntryIds)],
        timelineEntries,
        readOnly: true,
        statusLabel: '已封存 · 只读',
    };
}

function historyOnDate(history, date) {
    return history.filter(scene =>
        calendarDateFromClock(scene.startClock || scene.endClock) === date);
}

function entriesOnDate(worldState, date) {
    if (!worldState?.calendar || !DATE_PATTERN.test(date)) return [];
    try {
        return projectCalendarByDate(worldState, date);
    } catch {
        return [];
    }
}

function createMonthDates(
    worldState,
    displayMonth,
    selectedDate,
    currentDate,
    history,
) {
    const month = parseDate(displayMonth);
    if (!month) return [];
    month.setUTCDate(1);
    const targetMonth = formatDate(month).slice(0, 7);
    const firstVisible = shiftDate(formatDate(month), -weekdayIndex(formatDate(month)));
    return Array.from({ length: 42 }, (_, index) => {
        const date = shiftDate(firstVisible, index);
        const entryCount = entriesOnDate(worldState, date).length;
        const sceneCount = historyOnDate(history, date).length;
        return {
            date,
            day: Number(date.slice(8, 10)),
            weekdayLabel: `周${WEEKDAYS[weekdayIndex(date)]}`,
            outsideMonth: date.slice(0, 7) !== targetMonth,
            isSelected: date === selectedDate,
            isToday: date === currentDate,
            entryCount,
            sceneCount,
            itemCount: entryCount + sceneCount,
            ariaLabel: `${fullDateLabel(date)}，${entryCount} 项计划，${sceneCount} 个场景`,
        };
    });
}

function createCompactDates(monthDates, selectedDate) {
    const index = monthDates.findIndex(day => day.date === selectedDate);
    if (index < 0) return monthDates.slice(0, 7);
    const start = Math.max(0, index - weekdayIndex(selectedDate));
    return monthDates.slice(start, start + 7);
}

function createWeekDays(
    worldState,
    selectedDate,
    currentDate,
    history,
    getRoomName,
) {
    const weekStart = shiftDate(
        selectedDate,
        -weekdayIndex(selectedDate),
    );
    return Array.from({ length: 7 }, (_, index) => {
        const date = shiftDate(weekStart, index);
        const entries = entriesOnDate(worldState, date)
            .map(entry => createEntryView(
                worldState,
                entry,
                getRoomName,
            ));
        const sceneCount = historyOnDate(history, date).length;
        return {
            date,
            day: Number(date.slice(8, 10)),
            month: Number(date.slice(5, 7)),
            weekdayLabel: `周${WEEKDAYS[index]}`,
            isSelected: date === selectedDate,
            isToday: date === currentDate,
            entries,
            entryCount: entries.length,
            sceneCount,
            itemCount: entries.length + sceneCount,
            ariaLabel: `${fullDateLabel(date)}，${entries.length} 项计划，${sceneCount} 个场景`,
        };
    });
}

function weekRangeLabel(weekDays) {
    const start = weekDays[0];
    const end = weekDays.at(-1);
    if (!start || !end) return '本周日程';
    const sameYear = start.date.slice(0, 4) === end.date.slice(0, 4);
    const sameMonth = start.date.slice(0, 7) === end.date.slice(0, 7);
    if (sameMonth) {
        return `${start.date.slice(0, 4)} 年 ${start.month} 月 ${start.day}—${end.day} 日`;
    }
    if (sameYear) {
        return `${start.date.slice(0, 4)} 年 ${start.month} 月 ${start.day} 日—${end.month} 月 ${end.day} 日`;
    }
    return `${start.date}—${end.date}`;
}

function createStorylineViews(worldState) {
    let projected = [];
    try {
        projected = projectCalendarStorylines(worldState);
    } catch {
        return [];
    }
    return projected.map(storyline => ({
        id: storyline.id,
        kind: 'storyline',
        title: firstText(
            storyline.title,
            storyline.titleEn,
            storyline.id,
        ),
        titleEn: firstText(storyline.titleEn),
        summary: firstText(storyline.summary, storyline.summaryEn),
        summaryEn: firstText(storyline.summaryEn),
        tags: [...storyline.tags],
        startClock: storyline.startClock,
        endClock: storyline.endClock,
        intervalLabel: intervalLabel(
            storyline.startClock,
            storyline.endClock,
        ),
        participants: participantViews(
            worldState,
            storyline.participantIds,
        ),
        status: storyline.status,
        statusLabel:
            STORYLINE_STATUS_LABELS[storyline.status] ||
            storyline.status,
        statusTone: storyline.status,
        beats: storyline.storyBeats.map(beat => ({
            id: beat.id,
            title: firstText(beat.title, beat.titleEn, beat.id),
            titleEn: firstText(beat.titleEn),
            summary: firstText(beat.summary, beat.summaryEn),
            summaryEn: firstText(beat.summaryEn),
            tags: [...beat.tags],
            termKey: beat.termKey,
            sequence: beat.sequence,
            windowStartClock: beat.windowStartClock,
            windowEndClock: beat.windowEndClock,
            windowLabel: intervalLabel(
                beat.windowStartClock,
                beat.windowEndClock,
            ),
            status: beat.status,
            statusLabel:
                BEAT_STATUS_LABELS[beat.status] ||
                beat.status,
            sceneProgress: beat.sceneProgress,
            sceneTarget: beat.sceneTarget,
            progressLabel:
                `${beat.sceneProgress} / ${beat.sceneTarget} 场景`,
            scheduleCount: asArray(worldState?.calendar?.entries)
                .filter(entry => entry.sourceBeatId === beat.id)
                .length,
        })),
    }));
}

export function buildCalendarLocationOptions(worldState) {
    const mapState = worldState?.map || {};
    const mapIds = [
        ...LOCAL_MAP_CATALOG.map(map => map.id),
        ...asArray(mapState.customLocalMaps).map(map => map.id),
    ];
    return [...new Set(mapIds)]
        .map(mapId => getLocalMapDefinition(mapId, mapState))
        .filter(Boolean)
        .map(map => {
            const levelNames = new Map(
                asArray(map.levels).map(level => [
                    level.id,
                    firstText(level.name, level.nameEn, level.id),
                ]),
            );
            const rooms = getMapRooms(map, mapState)
                .map(room => ({
                    id: room.id,
                    name: firstText(room.name, room.nameEn, room.id),
                    levelId: firstText(room.levelId),
                    levelName: firstText(
                        levelNames.get(room.levelId),
                        room.levelId,
                    ),
                }))
                .filter(room => room.id)
                .sort((left, right) =>
                    left.levelName.localeCompare(right.levelName, 'zh-CN') ||
                    left.name.localeCompare(right.name, 'zh-CN') ||
                    left.id.localeCompare(right.id));
            return {
                id: map.id,
                name: firstText(map.name, map.nameEn, map.id),
                rooms,
            };
        })
        .filter(map => map.id && map.rooms.length)
        .sort((left, right) =>
            left.name.localeCompare(right.name, 'zh-CN') ||
            left.id.localeCompare(right.id));
}

export function validateCalendarTimelineMoment(
    worldState,
    {
        date = '',
        time = '',
        mapId = '',
        roomId = '',
    } = {},
) {
    if (!DATE_PATTERN.test(date)) {
        return {
            valid: false,
            error: '请先选择有效日期。',
            startClock: '',
        };
    }
    if (!TIME_PATTERN.test(time)) {
        return {
            valid: false,
            error: '请选择有效的开始时间。',
            startClock: '',
        };
    }
    const startClock = `${date} · ${time}`;
    const current = worldClockToEpochMinutes(worldState?.clock);
    const target = worldClockToEpochMinutes(startClock);
    if (
        !Number.isFinite(current) ||
        !Number.isFinite(target)
    ) {
        return {
            valid: false,
            error: '当前世界时钟或所选时间无效。',
            startClock,
        };
    }
    if (target < current) {
        return {
            valid: false,
            error: '自由开场时间不得早于当前世界时钟。',
            startClock,
        };
    }
    const map = buildCalendarLocationOptions(worldState)
        .find(candidate => candidate.id === mapId);
    if (!map) {
        return {
            valid: false,
            error: '请选择权威地图。',
            startClock,
        };
    }
    if (!map.rooms.some(room => room.id === roomId)) {
        return {
            valid: false,
            error: '请选择该地图中的权威房间。',
            startClock,
        };
    }
    return {
        valid: true,
        error: '',
        startClock,
    };
}

function fallbackDate(worldState, history) {
    return calendarDateFromClock(worldState?.clock) ||
        calendarDateFromClock(worldState?.calendar?.entries?.[0]?.startClock) ||
        calendarDateFromClock(history[0]?.startClock) ||
        '1970-01-01';
}

function resolveSelectedDate(worldState, history, options) {
    const entry = worldState?.calendar?.entries?.find(
        candidate => candidate.id === options.selectedEntryId,
    );
    const scene = history.find(
        candidate => candidate.id === options.selectedSceneId,
    );
    return calendarDateFromClock(entry?.startClock) ||
        calendarDateFromClock(scene?.startClock || scene?.endClock) ||
        (
            DATE_PATTERN.test(options.selectedDate)
                ? options.selectedDate
                : fallbackDate(worldState, history)
        );
}

export function buildCalendarViewModel(
    worldState,
    {
        selectedDate = '',
        displayMonth = '',
        selectedEntryId = '',
        selectedSceneId = '',
        selectedStorylineId = '',
        getRoomName = (_state, _mapId, roomId) =>
            roomId || '位置未知',
    } = {},
) {
    const history = projectSceneArchiveHistory(worldState);
    const date = resolveSelectedDate(worldState, history, {
        selectedDate,
        selectedEntryId,
        selectedSceneId,
    });
    const month = DATE_PATTERN.test(displayMonth) ? displayMonth : date;
    const currentDate = calendarDateFromClock(worldState?.clock);
    const entries = entriesOnDate(worldState, date)
        .map(entry => createEntryView(worldState, entry, getRoomName));
    const scenes = historyOnDate(history, date)
        .map(scene => createSceneView(worldState, scene, getRoomName));
    let selectedEntry = entries.find(entry => entry.id === selectedEntryId) || null;
    let selectedScene = history.find(scene => scene.id === selectedSceneId) || null;
    const preview = selectedScene
        ? createSceneView(worldState, selectedScene, getRoomName)
        : selectedEntry;
    const monthDates = createMonthDates(
        worldState,
        month,
        date,
        currentDate,
        history,
    );
    const weekDays = createWeekDays(
        worldState,
        date,
        currentDate,
        history,
        getRoomName,
    );
    const storylines = createStorylineViews(worldState);
    const selectedStoryline = storylines
        .find(storyline => storyline.id === selectedStorylineId) ||
        null;
    return {
        currentClock: worldState?.clock || '',
        currentDate,
        selectedDate: date,
        displayMonth: month,
        monthLabel: fullMonthLabel(month),
        selectedDateLabel: fullDateLabel(date),
        weekLabel: weekRangeLabel(weekDays),
        monthDates,
        compactDates: createCompactDates(monthDates, date),
        weekDays,
        weekGrid: calculateCalendarWeekGrid(weekDays),
        entries,
        dayGrid: calculateCalendarDayGrid(entries),
        scenes,
        preview,
        storylines,
        selectedStoryline,
        selectedStorylineId: selectedStoryline?.id || '',
        locationOptions: buildCalendarLocationOptions(worldState),
        selectedEntryId: selectedEntry?.id || '',
        selectedSceneId: selectedScene?.id || '',
        totalItems: entries.length + scenes.length,
    };
}

export function resolveCalendarDateKey(date, key) {
    const shifts = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -weekdayIndex(date),
        End: 6 - weekdayIndex(date),
    };
    if (Object.hasOwn(shifts, key)) return shiftDate(date, shifts[key]);
    if (key === 'PageUp') return shiftMonth(date, -1);
    if (key === 'PageDown') return shiftMonth(date, 1);
    return '';
}

export function resolveCalendarListKey(key, currentIndex, itemCount) {
    if (itemCount <= 0) return -1;
    if (key === 'ArrowDown' || key === 'ArrowRight') {
        return (currentIndex + 1) % itemCount;
    }
    if (key === 'ArrowUp' || key === 'ArrowLeft') {
        return (currentIndex - 1 + itemCount) % itemCount;
    }
    if (key === 'Home') return 0;
    if (key === 'End') return itemCount - 1;
    return -1;
}

export function restoreCalendarFocus(trigger) {
    trigger?.focus({
        preventScroll: true,
    });
}
