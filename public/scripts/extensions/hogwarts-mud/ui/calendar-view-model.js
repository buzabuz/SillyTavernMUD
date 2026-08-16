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
    getMapRooms,
} from '../domain/map-access.js';
import {
    getInteriorMount,
    listMapsByMountHierarchy,
} from '../domain/interior-mount.js';
import {
    createLocalMapField,
    createLocalMapLevelField,
    createLocalMapRoomField,
} from '../domain/map-localization.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';
import {
    getActorDisplayName,
} from '../domain/actor-display-name.js';
import {
    getSceneTimelineDisplaySummary,
} from '../domain/scene-timeline-display.js';
import {
    calculateCalendarDayGrid,
    calculateCalendarWeekGrid,
} from './calendar-day-grid.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const WEEKDAY_KEYS =
    Object.freeze([
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun',
    ]);

function staticText(
    displayLocale,
    staticKey,
    sourceTextEn,
) {
    return getStaticLocaleText(
        staticKey,
        normalizeDisplayLocale(
            displayLocale,
        ),
    ) ||
        sourceTextEn;
}

function formatStaticText(
    displayLocale,
    staticKey,
    sourceTextEn,
    values = {},
) {
    return Object.entries(
        values,
    ).reduce(
        (
            text,
            [
                key,
                value,
            ],
        ) =>
            text.replaceAll(
                `{${key}}`,
                String(value),
            ),
        staticText(
            displayLocale,
            staticKey,
            sourceTextEn,
        ),
    );
}

function weekdayText(
    displayLocale,
    index,
) {
    const key =
        WEEKDAY_KEYS[
            index
        ] ||
        WEEKDAY_KEYS[0];
    return staticText(
        displayLocale,
        `ui.calendar.weekday.${key}`,
        key.charAt(0)
            .toUpperCase() +
            key.slice(1),
    );
}

function keyedLabel(
    displayLocale,
    group,
    value,
) {
    return staticText(
        displayLocale,
        `ui.calendar.${group}.${value}`,
        value,
    );
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function firstText(...values) {
    return values
        .map(value => String(value || '').normalize('NFKC').trim())
        .find(Boolean) || '';
}

function localizedText(
    getLocalizedField,
    recordKind,
    recordId,
    fieldPath,
    sourceTextEn,
) {
    const source =
        firstText(
            sourceTextEn,
        );
    return getLocalizedField({
        recordKind,
        recordId:
            String(recordId || ''),
        fieldPath,
        sourceTextEn: source,
    })?.text || source;
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

function fullDateLabel(
    date,
    displayLocale,
) {
    const value = parseDate(date);
    if (!value) return date;
    return formatStaticText(
        displayLocale,
        'ui.calendar.date.full',
        '{year}-{month}-{day} · {weekday}',
        {
            year:
                value.getUTCFullYear(),
            month:
                value.getUTCMonth() + 1,
            day:
                value.getUTCDate(),
            weekday:
                weekdayText(
                    displayLocale,
                    weekdayIndex(date),
                ),
        },
    );
}

function fullMonthLabel(
    date,
    displayLocale,
) {
    const value = parseDate(date);
    if (!value) return date;
    return formatStaticText(
        displayLocale,
        'ui.calendar.date.month',
        '{year}-{month}',
        {
            year:
                value.getUTCFullYear(),
            month:
                value.getUTCMonth() + 1,
        },
    );
}

function timeLabel(
    clock,
    displayLocale,
) {
    const value = String(clock || '');
    return value.includes(' · ')
        ? value.split(' · ').at(-1)
        : value ||
            staticText(
                displayLocale,
                'ui.calendar.time.unknown',
                'Time unknown',
            );
}

function intervalLabel(
    startClock,
    endClock,
    displayLocale,
) {
    if (!startClock && !endClock) {
        return staticText(
            displayLocale,
            'ui.calendar.time.unknown',
            'Time unknown',
        );
    }
    const unknown =
        staticText(
            displayLocale,
            'ui.calendar.unknown',
            'Unknown',
        );
    return `${
        startClock ||
        unknown
    } → ${
        endClock ||
        unknown
    }`;
}

function durationLabel(
    startClock,
    endClock,
    displayLocale,
) {
    const start = worldClockToEpochMinutes(startClock);
    const end = worldClockToEpochMinutes(endClock);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end < start
    ) {
        return staticText(
            displayLocale,
            'ui.calendar.duration.unknown',
            'Duration unknown',
        );
    }
    const minutes = end - start;
    if (minutes < 60) {
        return formatStaticText(
            displayLocale,
            'ui.calendar.duration.minutes',
            '{minutes} min',
            {
                minutes,
            },
        );
    }
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder
        ? formatStaticText(
            displayLocale,
            'ui.calendar.duration.hours_minutes',
            '{hours} hr {minutes} min',
            {
                hours,
                minutes:
                    remainder,
            },
        )
        : formatStaticText(
            displayLocale,
            'ui.calendar.duration.hours',
            '{hours} hr',
            {
                hours,
            },
        );
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

function participantViews(
    worldState,
    participantIds,
    getLocalizedField,
    displayLocale,
) {
    const directory = actorDirectory(worldState);
    return asArray(participantIds).map(id => {
        const nameEn =
            firstText(
                directory
                    .get(id)
                    ?.nameEn,
                id,
            );
        return {
            id,
            nameEn,
            name:
                getActorDisplayName({
                    actorId: id,
                    nameEn,
                    displayLocale,
                    getLocalizedField,
                }),
        };
    });
}

function readOnlyReason(
    worldState,
    entry,
    displayLocale,
) {
    if (entry.status === 'completed') {
        return staticText(
            displayLocale,
            'ui.calendar.readonly.completed',
            'The scheduled time has passed. Completion does not imply a narrative outcome.',
        );
    }
    if (entry.status === 'cancelled') {
        return staticText(
            displayLocale,
            'ui.calendar.readonly.cancelled',
            'This schedule was cancelled and is read-only.',
        );
    }
    if (entry.status === 'active') {
        return staticText(
            displayLocale,
            'ui.calendar.readonly.active',
            'This schedule has started. Only the current record is readable.',
        );
    }
    const current = worldClockToEpochMinutes(worldState?.clock);
    const start = worldClockToEpochMinutes(entry.startClock);
    const end = worldClockToEpochMinutes(entry.endClock);
    if (Number.isFinite(end) && Number.isFinite(current) && end < current) {
        return staticText(
            displayLocale,
            'ui.calendar.readonly.ended',
            'This scheduled time has passed and is read-only.',
        );
    }
    if (Number.isFinite(start) && Number.isFinite(current) && start < current) {
        return staticText(
            displayLocale,
            'ui.calendar.readonly.started',
            'This schedule has already started and cannot be entered again.',
        );
    }
    try {
        getCalendarMomentContext(worldState, entry.id);
        return '';
    } catch {
        return staticText(
            displayLocale,
            'ui.calendar.readonly.invalid_reference',
            'The schedule reference is invalid and is currently read-only.',
        );
    }
}

function roomLabel(
    getRoomName,
    worldState,
    mapId,
    roomId,
    displayLocale,
) {
    try {
        return getRoomName(worldState, mapId, roomId);
    } catch {
        return roomId ||
            staticText(
                displayLocale,
                'map.location.unknown',
                'Unknown location',
            );
    }
}

function createStorySourceView(
    worldState,
    entry,
    getLocalizedField,
    displayLocale,
) {
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
        storylineTitle:
            localizedText(
                getLocalizedField,
                'calendar_storyline',
                storyline.id,
                'titleEn',
                firstText(
                    storyline.titleEn,
                    storyline.id,
                ),
            ),
        beatId: beat.id,
        beatTitle:
            localizedText(
                getLocalizedField,
                'calendar_story_beat',
                beat.id,
                'titleEn',
                firstText(
                    beat.titleEn,
                    beat.id,
                ),
            ),
        termKey: beat.termKey,
        beatSlot: entry.beatSlot,
        sceneProgress,
        sceneTarget: beat.sceneTarget,
        progressLabel:
            formatStaticText(
                displayLocale,
                'ui.calendar.scene_progress',
                '{current} / {target} Scenes',
                {
                    current:
                        sceneProgress,
                    target:
                        beat
                            .sceneTarget,
                },
            ),
    };
}

function createEntryView(
    worldState,
    entry,
    getRoomName,
    getLocalizedField,
    displayLocale,
) {
    const reason =
        readOnlyReason(
            worldState,
            entry,
            displayLocale,
        );
    return {
        id: entry.id,
        kind: 'calendar_entry',
        title: localizedText(
            getLocalizedField,
            'calendar_entry',
            entry.id,
            'titleEn',
            entry.titleEn ||
                entry.id,
        ),
        titleEn: firstText(entry.titleEn),
        summary: localizedText(
            getLocalizedField,
            'calendar_entry',
            entry.id,
            'summaryEn',
            entry.summaryEn,
        ),
        summaryEn: firstText(entry.summaryEn),
        startClock: entry.startClock,
        endClock: entry.endClock,
        timeLabel:
            timeLabel(
                entry.startClock,
                displayLocale,
            ),
        endTimeLabel:
            timeLabel(
                entry.endClock,
                displayLocale,
            ),
        intervalLabel:
            intervalLabel(
                entry.startClock,
                entry.endClock,
                displayLocale,
            ),
        durationLabel:
            durationLabel(
                entry.startClock,
                entry.endClock,
                displayLocale,
            ),
        status: entry.status,
        statusLabel:
            keyedLabel(
                displayLocale,
                'status.schedule',
                entry.status,
            ),
        statusTone: entry.status,
        entryType: entry.entryType,
        entryTypeLabel:
            staticText(
                displayLocale,
                'ui.calendar.entry_type.schedule',
                'Schedule',
            ),
        scheduleKind: entry.scheduleKind,
        scheduleKindLabel:
            keyedLabel(
                displayLocale,
                'kind',
                entry
                    .scheduleKind,
            ),
        planningTier: entry.planningTier,
        planningTierLabel:
            keyedLabel(
                displayLocale,
                'tier',
                entry
                    .planningTier,
            ),
        parentId: entry.parentId,
        tags: [...entry.tags],
        participants: participantViews(
            worldState,
            entry.participantIds,
            getLocalizedField,
            displayLocale,
        ),
        mapId: entry.mapId,
        roomId: entry.roomId,
        location: roomLabel(
            getRoomName,
            worldState,
            entry.mapId,
            entry.roomId,
            displayLocale,
        ),
        createdClock: entry.createdClock,
        updatedClock: entry.updatedClock,
        source:
            createStorySourceView(
                worldState,
                entry,
                getLocalizedField,
                displayLocale,
            ),
        readOnly: Boolean(reason),
        readOnlyReason: reason,
        canEnter: !reason,
    };
}

function createSceneView(
    worldState,
    scene,
    getRoomName,
    getLocalizedField,
    displayLocale,
) {
    const record = readSceneArchiveRecord(worldState, scene.id);
    const linkedEntries = asArray(scene.calendarEntryIds)
        .map(id => worldState?.calendar?.entries?.find(entry => entry.id === id))
        .filter(Boolean)
        .map(entry =>
            createEntryView(
                worldState,
                entry,
                getRoomName,
                getLocalizedField,
                displayLocale,
            ));
    const timelineEntries = asArray(record?.timelineEntries)
        .map((entry, index) => {
            const clock = firstText(entry?.clock);
            const summaryEn =
                getSceneTimelineDisplaySummary(
                    entry?.summaryEn,
                );
            return {
                clock,
                summaryEn,
                label:
                    localizedText(
                        getLocalizedField,
                        'scene_timeline',
                        `${scene.id}:${index}`,
                        'summaryEn',
                        summaryEn,
                    ),
                timeLabel: firstText(
                    entry?.timeLabel,
                    timeLabel(
                        clock,
                        displayLocale,
                    ),
                ),
            };
        })
        .filter(entry => entry.clock || entry.label);
    return {
        id: scene.id,
        kind: 'scene_archive',
        title: localizedText(
            getLocalizedField,
            'scene_archive',
            scene.id,
            'nameEn',
            scene.titleEn ||
                scene.id,
        ),
        titleEn: firstText(scene.titleEn),
        summary: localizedText(
            getLocalizedField,
            'scene_archive',
            scene.id,
            'summaryEn',
            scene.summaryEn,
        ),
        summaryEn: firstText(scene.summaryEn),
        startClock: scene.startClock,
        endClock: scene.endClock,
        timeLabel:
            timeLabel(
                scene.startClock,
                displayLocale,
            ),
        intervalLabel:
            intervalLabel(
                scene.startClock,
                scene.endClock,
                displayLocale,
            ),
        mapId: scene.mapId,
        roomId: scene.roomId,
        location: roomLabel(
            getRoomName,
            worldState,
            scene.mapId,
            scene.roomId,
            displayLocale,
        ),
        linkedEntries,
        calendarEntryIds: [...asArray(scene.calendarEntryIds)],
        timelineEntries,
        readOnly: true,
        statusLabel:
            staticText(
                displayLocale,
                'ui.calendar.archived_readonly',
                'Archived · Read-only',
            ),
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
    displayLocale,
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
            weekdayLabel:
                formatStaticText(
                    displayLocale,
                    'ui.calendar.date.weekday',
                    '{weekday}',
                    {
                        weekday:
                            weekdayText(
                                displayLocale,
                                weekdayIndex(
                                    date,
                                ),
                            ),
                    },
                ),
            outsideMonth: date.slice(0, 7) !== targetMonth,
            isSelected: date === selectedDate,
            isToday: date === currentDate,
            entryCount,
            sceneCount,
            itemCount: entryCount + sceneCount,
            ariaLabel:
                formatStaticText(
                    displayLocale,
                    'ui.calendar.date_aria',
                    '{date}, {plans} plans, {scenes} Scenes',
                    {
                        date:
                            fullDateLabel(
                                date,
                                displayLocale,
                            ),
                        plans:
                            entryCount,
                        scenes:
                            sceneCount,
                    },
                ),
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
    getLocalizedField,
    displayLocale,
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
                getLocalizedField,
                displayLocale,
            ));
        const sceneCount = historyOnDate(history, date).length;
        return {
            date,
            day: Number(date.slice(8, 10)),
            month: Number(date.slice(5, 7)),
            weekdayLabel:
                formatStaticText(
                    displayLocale,
                    'ui.calendar.date.weekday',
                    '{weekday}',
                    {
                        weekday:
                            weekdayText(
                                displayLocale,
                                index,
                            ),
                    },
                ),
            isSelected: date === selectedDate,
            isToday: date === currentDate,
            entries,
            entryCount: entries.length,
            sceneCount,
            itemCount: entries.length + sceneCount,
            ariaLabel:
                formatStaticText(
                    displayLocale,
                    'ui.calendar.date_aria',
                    '{date}, {plans} plans, {scenes} Scenes',
                    {
                        date:
                            fullDateLabel(
                                date,
                                displayLocale,
                            ),
                        plans:
                            entries
                                .length,
                        scenes:
                            sceneCount,
                    },
                ),
        };
    });
}

function weekRangeLabel(
    weekDays,
    displayLocale,
) {
    const start = weekDays[0];
    const end = weekDays.at(-1);
    if (!start || !end) {
        return staticText(
            displayLocale,
            'ui.calendar.week.fallback',
            'This week',
        );
    }
    const sameYear = start.date.slice(0, 4) === end.date.slice(0, 4);
    const sameMonth = start.date.slice(0, 7) === end.date.slice(0, 7);
    if (sameMonth) {
        return formatStaticText(
            displayLocale,
            'ui.calendar.week.same_month',
            '{year}-{month}-{startDay} to {endDay}',
            {
                year:
                    start.date
                        .slice(0, 4),
                month:
                    start.month,
                startDay:
                    start.day,
                endDay:
                    end.day,
            },
        );
    }
    if (sameYear) {
        return formatStaticText(
            displayLocale,
            'ui.calendar.week.same_year',
            '{year}-{startMonth}-{startDay} to {endMonth}-{endDay}',
            {
                year:
                    start.date
                        .slice(0, 4),
                startMonth:
                    start.month,
                startDay:
                    start.day,
                endMonth:
                    end.month,
                endDay:
                    end.day,
            },
        );
    }
    return `${start.date}—${end.date}`;
}

function createStorylineViews(
    worldState,
    getLocalizedField,
    displayLocale,
) {
    let projected = [];
    try {
        projected = projectCalendarStorylines(worldState);
    } catch {
        return [];
    }
    return projected.map(storyline => ({
        id: storyline.id,
        kind: 'storyline',
        title: localizedText(
            getLocalizedField,
            'calendar_storyline',
            storyline.id,
            'titleEn',
            storyline.titleEn ||
                storyline.id,
        ),
        titleEn: firstText(storyline.titleEn),
        summary: localizedText(
            getLocalizedField,
            'calendar_storyline',
            storyline.id,
            'summaryEn',
            storyline.summaryEn,
        ),
        summaryEn: firstText(storyline.summaryEn),
        tags: [...storyline.tags],
        startClock: storyline.startClock,
        endClock: storyline.endClock,
        intervalLabel: intervalLabel(
            storyline.startClock,
            storyline.endClock,
            displayLocale,
        ),
        participants: participantViews(
            worldState,
            storyline.participantIds,
            getLocalizedField,
            displayLocale,
        ),
        status: storyline.status,
        statusLabel:
            keyedLabel(
                displayLocale,
                'status.storyline',
                storyline
                    .status,
            ),
        statusTone: storyline.status,
        beats: storyline.storyBeats.map(beat => ({
            id: beat.id,
            title: localizedText(
                getLocalizedField,
                'calendar_story_beat',
                beat.id,
                'titleEn',
                beat.titleEn ||
                    beat.id,
            ),
            titleEn: firstText(beat.titleEn),
            summary: localizedText(
                getLocalizedField,
                'calendar_story_beat',
                beat.id,
                'summaryEn',
                beat.summaryEn,
            ),
            summaryEn: firstText(beat.summaryEn),
            tags: [...beat.tags],
            termKey: beat.termKey,
            sequence: beat.sequence,
            windowStartClock: beat.windowStartClock,
            windowEndClock: beat.windowEndClock,
            windowLabel: intervalLabel(
                beat.windowStartClock,
                beat.windowEndClock,
                displayLocale,
            ),
            status: beat.status,
            statusLabel:
                keyedLabel(
                    displayLocale,
                    'status.beat',
                    beat.status,
                ),
            sceneProgress: beat.sceneProgress,
            sceneTarget: beat.sceneTarget,
            progressLabel:
                formatStaticText(
                    displayLocale,
                    'ui.calendar.scene_progress',
                    '{current} / {target} Scenes',
                    {
                        current:
                            beat
                                .sceneProgress,
                        target:
                            beat
                                .sceneTarget,
                    },
                ),
            scheduleCount: asArray(worldState?.calendar?.entries)
                .filter(entry => entry.sourceBeatId === beat.id)
                .length,
        })),
    }));
}

export function buildCalendarLocationOptions(
    worldState,
    getLocalizedField =
    field => ({
        text:
            field.sourceTextEn ||
            '',
    }),
) {
    const mapState = worldState?.map || {};
    const hierarchy =
        listMapsByMountHierarchy(
            mapState,
        );
    const mapsById =
        new Map(
            hierarchy.map(entry => [
                entry.map.id,
                entry.map,
            ]),
        );
    return hierarchy
        .map(({
            map,
            depth,
        }) => {
            const mount =
                getInteriorMount(map);
            const parentRoom =
                mount
                    ? getMapRooms(
                        mapsById.get(
                            mount.parentMapId,
                        ),
                        mapState,
                    ).find(room =>
                        room.id ===
                            mount.parentRoomId)
                    : null;
            const mapField =
                createLocalMapField(
                    map,
                );
            const parentRoomField =
                parentRoom
                    ? createLocalMapRoomField(
                        mount.parentMapId,
                        parentRoom,
                    )
                    : null;
            const levelFields =
                new Map(
                    asArray(
                        map.levels,
                    ).map(level => [
                        level.id,
                        createLocalMapLevelField(
                            map.id,
                            level,
                        ),
                    ]),
                );
            const levelNames =
                new Map(
                    [
                        ...levelFields,
                    ].map(([
                        levelId,
                        field,
                    ]) => [
                        levelId,
                        firstText(
                            getLocalizedField(
                                field,
                            )?.text,
                            field
                                .sourceTextEn,
                            levelId,
                        ),
                    ]),
                );
            const rooms = getMapRooms(map, mapState)
                .map(room => {
                    const roomField =
                        createLocalMapRoomField(
                            map.id,
                            room,
                        );
                    return {
                        id: room.id,
                        name: firstText(
                            getLocalizedField(
                                roomField,
                            )?.text,
                            roomField
                                .sourceTextEn,
                            room.id,
                        ),
                        levelId: firstText(
                            room.levelId,
                        ),
                        levelName: firstText(
                            levelNames.get(
                                room.levelId,
                            ),
                            room.levelId,
                        ),
                        localizationFields: [
                            roomField,
                        ],
                    };
                })
                .filter(room => room.id)
                .sort((left, right) =>
                    left.levelName.localeCompare(right.levelName, 'zh-CN') ||
                    left.name.localeCompare(right.name, 'zh-CN') ||
                    left.id.localeCompare(right.id));
            return {
                id: map.id,
                name: [
                    depth
                        ? `${'  '.repeat(depth)}↳`
                        : '',
                    parentRoom
                        ? `${firstText(
                            getLocalizedField(
                                parentRoomField,
                            )?.text,
                            parentRoomField
                                .sourceTextEn,
                            mount.parentRoomId,
                        )} /`
                        : '',
                    firstText(
                        getLocalizedField(
                            mapField,
                        )?.text,
                        mapField
                            .sourceTextEn,
                        map.id,
                    ),
                ].filter(Boolean)
                    .join(' '),
                depth,
                mount,
                rooms,
                localizationFields: [
                    mapField,
                    parentRoomField,
                    ...levelFields
                        .values(),
                    ...rooms
                        .flatMap(room =>
                            room
                                .localizationFields),
                ].filter(Boolean),
            };
        })
        .filter(map =>
            map.id &&
            map.rooms.length);
}

export function validateCalendarTimelineMoment(
    worldState,
    {
        date = '',
        time = '',
        mapId = '',
        roomId = '',
        displayLocale = 'zh-CN',
    } = {},
) {
    if (!DATE_PATTERN.test(date)) {
        return {
            valid: false,
            error:
                staticText(
                    displayLocale,
                    'ui.calendar.validation.date',
                    'Select a valid date first.',
                ),
            startClock: '',
        };
    }
    if (!TIME_PATTERN.test(time)) {
        return {
            valid: false,
            error:
                staticText(
                    displayLocale,
                    'ui.calendar.validation.time',
                    'Select a valid start time.',
                ),
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
            error:
                staticText(
                    displayLocale,
                    'ui.calendar.validation.clock',
                    'The current world clock or selected time is invalid.',
                ),
            startClock,
        };
    }
    if (target < current) {
        return {
            valid: false,
            error:
                staticText(
                    displayLocale,
                    'ui.calendar.validation.past',
                    'A Free Scene cannot begin before the current world clock.',
                ),
            startClock,
        };
    }
    const map = buildCalendarLocationOptions(worldState)
        .find(candidate => candidate.id === mapId);
    if (!map) {
        return {
            valid: false,
            error:
                staticText(
                    displayLocale,
                    'ui.calendar.validation.map',
                    'Select an authoritative Map.',
                ),
            startClock,
        };
    }
    if (!map.rooms.some(room => room.id === roomId)) {
        return {
            valid: false,
            error:
                staticText(
                    displayLocale,
                    'ui.calendar.validation.room',
                    'Select an authoritative room in that Map.',
                ),
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
        displayLocale = 'zh-CN',
        getRoomName = (_state, _mapId, roomId) =>
            roomId ||
                staticText(
                    displayLocale,
                    'map.location.unknown',
                    'Unknown location',
                ),
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
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
        .map(entry =>
            createEntryView(
                worldState,
                entry,
                getRoomName,
                getLocalizedField,
                displayLocale,
            ));
    const scenes = historyOnDate(history, date)
        .map(scene =>
            createSceneView(
                worldState,
                scene,
                getRoomName,
                getLocalizedField,
                displayLocale,
            ));
    let selectedEntry = entries.find(entry => entry.id === selectedEntryId) || null;
    let selectedScene = history.find(scene => scene.id === selectedSceneId) || null;
    const preview = selectedScene
        ? createSceneView(
            worldState,
            selectedScene,
            getRoomName,
            getLocalizedField,
            displayLocale,
        )
        : selectedEntry;
    const monthDates = createMonthDates(
        worldState,
        month,
        date,
        currentDate,
        history,
        displayLocale,
    );
    const weekDays = createWeekDays(
        worldState,
        date,
        currentDate,
        history,
        getRoomName,
        getLocalizedField,
        displayLocale,
    );
    const storylines =
        createStorylineViews(
            worldState,
            getLocalizedField,
            displayLocale,
        );
    const selectedStoryline = storylines
        .find(storyline => storyline.id === selectedStorylineId) ||
        null;
    return {
        currentClock: worldState?.clock || '',
        currentDate,
        selectedDate: date,
        displayMonth: month,
        monthLabel:
            fullMonthLabel(
                month,
                displayLocale,
            ),
        selectedDateLabel:
            fullDateLabel(
                date,
                displayLocale,
            ),
        weekLabel:
            weekRangeLabel(
                weekDays,
                displayLocale,
            ),
        monthDates,
        compactDates: createCompactDates(monthDates, date),
        weekDays,
        weekGrid:
            calculateCalendarWeekGrid(
                weekDays,
                {
                    displayLocale,
                },
            ),
        entries,
        dayGrid:
            calculateCalendarDayGrid(
                entries,
                {
                    displayLocale,
                },
            ),
        scenes,
        preview,
        storylines,
        selectedStoryline,
        selectedStorylineId: selectedStoryline?.id || '',
        locationOptions:
            buildCalendarLocationOptions(
                worldState,
                getLocalizedField,
            ),
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
