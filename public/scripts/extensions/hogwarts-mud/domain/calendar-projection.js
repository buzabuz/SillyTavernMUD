import {
    isCalendarWorldClock,
} from './calendar-schema.js';
import {
    advanceWorldClock,
    worldClockToEpochMinutes,
} from './time-environment.js';

const CALENDAR_DATE_PATTERN =
    /^\d{4}-\d{2}-\d{2}$/u;
const DEFAULT_UPCOMING_DAYS = 7;

function getCalendarEntries(source) {
    const entries =
        Array.isArray(source)
            ? source
            : source?.calendar
                ?.entries ||
                source?.entries;
    if (!Array.isArray(entries)) {
        throw new TypeError(
            'Calendar projection 需要 entries 数组。',
        );
    }
    return entries.filter(entry =>
        entry?.entryType ===
        'event');
}

function getCalendarStoryState(
    source,
) {
    const calendar =
        source?.calendar ||
        source;
    if (
        !Array.isArray(
            calendar?.storylines,
        ) ||
        !Array.isArray(
            calendar?.storyBeats,
        )
    ) {
        throw new TypeError(
            'Calendar storyline projection 需要 storylines 与 storyBeats 数组。',
        );
    }
    return calendar;
}

function compareSchedules(
    left,
    right,
) {
    const clockOrder =
        clockMinutes(
            left.startClock,
            `Calendar 条目 ${left.id} startClock`,
        ) -
        clockMinutes(
            right.startClock,
            `Calendar 条目 ${right.id} startClock`,
        );
    return clockOrder;
}

function cloneMatchingEntries(
    source,
    predicate,
) {
    return getCalendarEntries(
        source,
    )
        .filter(predicate)
        .map(entry =>
            structuredClone(entry))
        .sort(compareSchedules);
}

function clockMinutes(
    clock,
    label,
) {
    if (
        !isCalendarWorldClock(
            clock,
        )
    ) {
        throw new TypeError(
            `${label} 必须是绝对世界时钟。`,
        );
    }
    return worldClockToEpochMinutes(
        clock,
    );
}

function normalizeDate(
    date,
) {
    const normalized =
        String(date || '')
            .normalize('NFKC')
            .trim();
    if (
        !CALENDAR_DATE_PATTERN
            .test(normalized) ||
        !isCalendarWorldClock(
            `${normalized} · 00:00`,
        )
    ) {
        throw new TypeError(
            'Calendar projection 日期必须是 YYYY-MM-DD。',
        );
    }
    return normalized;
}

function intervalOverlaps(
    entry,
    rangeStart,
    rangeEnd,
) {
    const start =
        clockMinutes(
            entry.startClock,
            `Calendar 条目 ${entry.id} startClock`,
        );
    const end =
        clockMinutes(
            entry.endClock,
            `Calendar 条目 ${entry.id} endClock`,
        );
    return (
        start <= rangeEnd &&
        end >= rangeStart
    );
}

export function projectCalendarByDate(
    source,
    date,
) {
    const normalizedDate =
        normalizeDate(date);
    const rangeStart =
        clockMinutes(
            `${normalizedDate} · 00:00`,
            'Calendar 日期开始时钟',
        );
    const rangeEnd =
        clockMinutes(
            `${normalizedDate} · 23:59`,
            'Calendar 日期结束时钟',
        );
    return cloneMatchingEntries(
        source,
        entry =>
            intervalOverlaps(
                entry,
                rangeStart,
                rangeEnd,
            ),
    );
}

export function projectCalendarByParent(
    source,
    parentId,
) {
    const normalizedParentId =
        String(parentId || '')
            .normalize('NFKC')
            .trim();
    return cloneMatchingEntries(
        source,
        entry =>
            entry.parentId ===
            normalizedParentId,
    );
}

export function projectCalendarByTag(
    source,
    tag,
) {
    const normalizedTag =
        String(tag || '')
            .normalize('NFKC')
            .trim()
            .toLocaleLowerCase();
    if (!normalizedTag) {
        throw new TypeError(
            'Calendar projection 标签不能为空。',
        );
    }
    return cloneMatchingEntries(
        source,
        entry =>
            entry.tags.includes(
                normalizedTag,
            ),
    );
}

export function projectCalendarToday(
    source,
    currentClock =
    source?.clock,
) {
    clockMinutes(
        currentClock,
        'Calendar 当前世界时钟',
    );
    return projectCalendarByDate(
        source,
        currentClock.slice(
            0,
            10,
        ),
    );
}

export function projectUpcomingCalendar(
    source,
    currentClock =
    source?.clock,
    days =
    DEFAULT_UPCOMING_DAYS,
) {
    if (
        !Number.isSafeInteger(days) ||
        days < 0
    ) {
        throw new TypeError(
            'Calendar 近期天数必须是非负安全整数。',
        );
    }
    const rangeStart =
        clockMinutes(
            currentClock,
            'Calendar 近期开始时钟',
        );
    const throughClock =
        advanceWorldClock(
            currentClock,
            days * 24 * 60,
        );
    const rangeEnd =
        clockMinutes(
            throughClock,
            'Calendar 近期结束时钟',
        );
    return cloneMatchingEntries(
        source,
        entry =>
            intervalOverlaps(
                entry,
                rangeStart,
                rangeEnd,
            ),
    );
}

export function projectCalendarAtMoment(
    source,
    clock,
) {
    const moment =
        clockMinutes(
            clock,
            'Calendar projection 时钟',
        );
    return cloneMatchingEntries(
        source,
        entry =>
            entry.status !==
                'cancelled' &&
            intervalOverlaps(
                entry,
                moment,
                moment,
            ),
    );
}

export function projectCalendarSceneContext(
    source,
    calendarEntryIds =
    source?.scene
        ?.calendarEntryIds,
) {
    const calendar =
        source?.calendar ||
        source;
    const claimedIds = [
        ...new Set(
            (
                Array.isArray(
                    calendarEntryIds,
                )
                    ? calendarEntryIds
                    : []
            )
                .map(id =>
                    String(id || '')
                        .normalize('NFKC')
                        .trim())
                .filter(Boolean),
        ),
    ];
    const entriesById =
        new Map(
            getCalendarEntries(
                calendar,
            ).map(entry => [
                entry.id,
                entry,
            ]),
        );
    const entries =
        claimedIds
            .map(id =>
                entriesById.get(id))
            .filter(Boolean)
            .map(entry =>
                structuredClone(entry));
    const beatsById =
        new Map(
            (
                Array.isArray(
                    calendar
                        ?.storyBeats,
                )
                    ? calendar
                        .storyBeats
                    : []
            ).map(beat => [
                beat.id,
                beat,
            ]),
        );
    const storylinesById =
        new Map(
            (
                Array.isArray(
                    calendar
                        ?.storylines,
                )
                    ? calendar
                        .storylines
                    : []
            ).map(storyline => [
                storyline.id,
                storyline,
            ]),
        );
    const storySources =
        entries
            .map(entry => {
                const storyBeat =
                    beatsById.get(
                        entry
                            .sourceBeatId,
                    );
                if (!storyBeat) {
                    return null;
                }
                const storyline =
                    storylinesById.get(
                        storyBeat
                            .storylineId,
                    );
                if (!storyline) {
                    return null;
                }
                return {
                    scheduleId:
                        entry.id,
                    storyBeat:
                        structuredClone(
                            storyBeat,
                        ),
                    storyline:
                        structuredClone(
                            storyline,
                        ),
                };
            })
            .filter(Boolean);
    return {
        entries,
        storySources,
    };
}

export function projectCalendarStoryBeats(
    source,
    storylineId = '',
) {
    const calendar =
        getCalendarStoryState(
            source,
        );
    const normalizedStorylineId =
        String(storylineId || '')
            .normalize('NFKC')
            .trim();
    return calendar.storyBeats
        .filter(beat =>
            !normalizedStorylineId ||
            beat.storylineId ===
                normalizedStorylineId)
        .map(beat => ({
            ...structuredClone(
                beat,
            ),
            sceneProgress:
                Math.min(
                    beat.sceneTarget,
                    new Set(
                        beat
                            .relatedSceneIds,
                    ).size,
                ),
        }))
        .sort((left, right) =>
            left.sequence -
                right.sequence ||
            left.id.localeCompare(
                right.id,
            ));
}

export function projectCalendarStorylines(
    source,
) {
    const calendar =
        getCalendarStoryState(
            source,
        );
    const beats =
        projectCalendarStoryBeats(
            calendar,
        );
    const beatsByStoryline =
        new Map();
    beats.forEach(beat => {
        const grouped =
            beatsByStoryline.get(
                beat.storylineId,
            ) ||
            [];
        grouped.push(beat);
        beatsByStoryline.set(
            beat.storylineId,
            grouped,
        );
    });
    return calendar.storylines
        .map(storyline => ({
            ...structuredClone(
                storyline,
            ),
            storyBeats:
                beatsByStoryline.get(
                    storyline.id,
                ) ||
                [],
        }))
        .sort((left, right) =>
            clockMinutes(
                left.startClock,
                `Calendar storyline ${left.id} startClock`,
            ) -
                clockMinutes(
                    right.startClock,
                    `Calendar storyline ${right.id} startClock`,
                ) ||
            left.id.localeCompare(
                right.id,
            ));
}
