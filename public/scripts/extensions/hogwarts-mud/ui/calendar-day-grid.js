import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';

const CLOCK_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2}) · ([01]\d|2[0-3]):([0-5]\d)$/u;

const DEFAULT_GRID_OPTIONS = Object.freeze({
    defaultStartHour: 8,
    defaultEndHour: 18,
    pixelsPerMinute: 1,
    minimumCardHeight: 44,
});

function element(documentRef, tag, className = '', content = '') {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

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

function parseClock(clock) {
    const match = String(clock || '').match(CLOCK_PATTERN);
    if (!match) return null;
    const [
        ,
        year,
        month,
        day,
        hour,
        minute,
    ] = match;
    const epochMinute = Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
    ) / 60000;
    return {
        epochMinute,
        minuteOfDay: Number(hour) * 60 + Number(minute),
        timeLabel: `${hour}:${minute}`,
    };
}

function formatDuration(
    minutes,
    displayLocale,
) {
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

function normalizeEntries(entries) {
    return asArray(entries)
        .map(entry => {
            const start = parseClock(entry?.startClock);
            const end = parseClock(entry?.endClock);
            if (
                !start ||
                !end ||
                end.epochMinute <= start.epochMinute
            ) {
                return null;
            }
            const durationMinutes = end.epochMinute - start.epochMinute;
            return {
                ...entry,
                startMinute: start.minuteOfDay,
                endMinute: start.minuteOfDay + durationMinutes,
                durationMinutes,
                startTimeLabel: start.timeLabel,
                endTimeLabel: end.timeLabel,
            };
        })
        .filter(Boolean)
        .sort((left, right) =>
            left.startMinute - right.startMinute ||
            left.endMinute - right.endMinute ||
            String(left.id).localeCompare(String(right.id)));
}

export function calculateVisibleHourRange(
    entries,
    {
        defaultStartHour =
        DEFAULT_GRID_OPTIONS.defaultStartHour,
        defaultEndHour =
        DEFAULT_GRID_OPTIONS.defaultEndHour,
    } = {},
) {
    const normalized = normalizeEntries(entries);
    const earliest = normalized.length
        ? Math.floor(normalized[0].startMinute / 60)
        : defaultStartHour;
    const latest = normalized.length
        ? Math.ceil(
            Math.max(...normalized.map(entry => entry.endMinute)) / 60,
        )
        : defaultEndHour;
    const startHour = Math.max(
        0,
        Math.min(defaultStartHour, earliest),
    );
    const endHour = Math.min(
        24,
        Math.max(defaultEndHour, latest, startHour + 1),
    );
    return {
        startHour,
        endHour,
        totalMinutes: (endHour - startHour) * 60,
    };
}

export function calculateOverlapLanes(entries) {
    const normalized = normalizeEntries(entries);
    const groups = [];
    let current = null;
    for (const entry of normalized) {
        if (!current || entry.startMinute >= current.endMinute) {
            current = {
                endMinute: entry.endMinute,
                entries: [],
            };
            groups.push(current);
        } else {
            current.endMinute = Math.max(
                current.endMinute,
                entry.endMinute,
            );
        }
        current.entries.push(entry);
    }

    return groups.flatMap(group => {
        const laneEnds = [];
        const assigned = group.entries.map(entry => {
            let laneIndex = laneEnds.findIndex(
                endMinute => endMinute <= entry.startMinute,
            );
            if (laneIndex < 0) laneIndex = laneEnds.length;
            laneEnds[laneIndex] = entry.endMinute;
            return {
                ...entry,
                laneIndex,
            };
        });
        const laneCount = Math.max(1, laneEnds.length);
        return assigned.map(entry => ({
            ...entry,
            laneCount,
        }));
    });
}

export function calculateCalendarDayGrid(
    entries,
    {
        pixelsPerMinute =
        DEFAULT_GRID_OPTIONS.pixelsPerMinute,
        minimumCardHeight =
        DEFAULT_GRID_OPTIONS.minimumCardHeight,
        displayLocale = 'zh-CN',
        ...rangeOptions
    } = {},
) {
    const range = calculateVisibleHourRange(entries, rangeOptions);
    const rangeStartMinute = range.startHour * 60;
    const items = calculateOverlapLanes(entries).map(entry => {
        const minuteOffset = entry.startMinute - rangeStartMinute;
        const durationHeight =
            entry.durationMinutes * pixelsPerMinute;
        return {
            ...entry,
            minuteOffset,
            top: minuteOffset * pixelsPerMinute,
            durationHeight,
            height: Math.max(minimumCardHeight, durationHeight),
            leftPercent:
                entry.laneIndex / entry.laneCount * 100,
            widthPercent: 100 / entry.laneCount,
            ariaLabel: [
                entry.title,
                `${entry.startTimeLabel}${
                    staticText(
                        displayLocale,
                        'ui.calendar.to',
                        ' to ',
                    )
                }${entry.endTimeLabel}`,
                formatDuration(
                    entry.durationMinutes,
                    displayLocale,
                ),
                entry.statusLabel,
                entry.location,
            ].filter(Boolean)
                .join(
                    staticText(
                        displayLocale,
                        'ui.calendar.list_separator',
                        ', ',
                    ),
                ),
        };
    });
    const hours = Array.from(
        {
            length: range.endHour - range.startHour + 1,
        },
        (_, index) => {
            const hour = range.startHour + index;
            return {
                hour,
                label: `${String(hour).padStart(2, '0')}:00`,
                minuteOffset: index * 60,
                top: index * 60 * pixelsPerMinute,
            };
        },
    );
    return {
        ...range,
        pixelsPerMinute,
        minimumCardHeight,
        height: range.totalMinutes * pixelsPerMinute,
        hours,
        items,
    };
}

export function calculateCalendarWeekGrid(
    days,
    options = {},
) {
    const weekDays = asArray(days);
    const range = calculateVisibleHourRange(
        weekDays.flatMap(day => asArray(day?.entries)),
        options,
    );
    const dayGrids = weekDays.map(day => ({
        ...day,
        grid: calculateCalendarDayGrid(
            day?.entries,
            {
                ...options,
                defaultStartHour: range.startHour,
                defaultEndHour: range.endHour,
            },
        ),
    }));
    return {
        ...range,
        pixelsPerMinute:
            options.pixelsPerMinute ??
            DEFAULT_GRID_OPTIONS.pixelsPerMinute,
        height:
            range.totalMinutes *
            (
                options.pixelsPerMinute ??
                DEFAULT_GRID_OPTIONS.pixelsPerMinute
            ),
        hours: dayGrids[0]?.grid?.hours || [],
        days: dayGrids,
        itemCount: dayGrids.reduce(
            (total, day) => total + day.grid.items.length,
            0,
        ),
    };
}

function setGridPosition(node, item) {
    node.style.setProperty('--calendar-grid-top', String(item.top));
    node.style.setProperty(
        '--calendar-grid-height',
        String(item.durationHeight),
    );
    node.style.setProperty(
        '--calendar-lane-index',
        String(item.laneIndex),
    );
    node.style.setProperty(
        '--calendar-lane-count',
        String(item.laneCount),
    );
}

function createPlanCard(
    documentRef,
    item,
    {
        selected,
        tabbable,
        onSelect,
        onKeyDown,
    },
) {
    const button = element(
        documentRef,
        'button',
        [
            'hpmud-calendar-plan-card',
            `is-${item.status}`,
            selected ? 'is-selected' : '',
        ].filter(Boolean).join(' '),
    );
    button.type = 'button';
    button.dataset.calendarItem = item.id;
    button.dataset.calendarEntryId = item.id;
    button.dataset.calendarGridTop = String(item.top);
    button.dataset.calendarDurationHeight =
        String(item.durationHeight);
    button.dataset.calendarLaneIndex = String(item.laneIndex);
    button.dataset.calendarLaneCount = String(item.laneCount);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(selected));
    button.setAttribute('aria-label', item.ariaLabel);
    button.tabIndex = tabbable ? 0 : -1;
    setGridPosition(button, item);

    const interval = element(
        documentRef,
        'span',
        'hpmud-calendar-plan-time',
    );
    const start = element(
        documentRef,
        'time',
        '',
        item.startTimeLabel,
    );
    start.dateTime = item.startClock.replace(' · ', 'T');
    const end = element(
        documentRef,
        'time',
        '',
        item.endTimeLabel,
    );
    end.dateTime = item.endClock.replace(' · ', 'T');
    interval.append(
        start,
        element(documentRef, 'span', '', '–'),
        end,
    );
    button.append(
        interval,
        element(
            documentRef,
            'span',
            `hpmud-calendar-plan-status is-${item.status}`,
            item.statusLabel,
        ),
        element(
            documentRef,
            'strong',
            '',
            item.title,
        ),
        element(
            documentRef,
            'small',
            '',
            item.location,
        ),
    );
    button.addEventListener('click', () => onSelect?.(item.id));
    if (onKeyDown) {
        button.addEventListener('keydown', onKeyDown);
    }
    return button;
}

export function renderCalendarDayGrid(
    documentRef,
    container,
    {
        grid,
        selectedEntryId = '',
        onSelect,
        onKeyDown,
        displayLocale = 'zh-CN',
    },
) {
    container.replaceChildren();
    if (!grid.items.length) {
        const empty = element(
            documentRef,
            'div',
            'hpmud-calendar-section-empty',
        );
        empty.append(
            element(
                documentRef,
                'strong',
                '',
                staticText(
                    displayLocale,
                    'ui.calendar.day.no_plans',
                    'No plans on this day',
                ),
            ),
            element(
                documentRef,
                'p',
                '',
                staticText(
                    displayLocale,
                    'ui.calendar.day.no_plans_detail',
                    'Blank dates remain blank. The system never invents schedules to fill them.',
                ),
            ),
        );
        container.append(empty);
        return;
    }

    const shell = element(
        documentRef,
        'div',
        'hpmud-calendar-day-grid',
    );
    shell.style.setProperty(
        '--calendar-grid-total-height',
        String(grid.height),
    );
    const scale = element(
        documentRef,
        'div',
        'hpmud-calendar-hour-scale',
    );
    scale.setAttribute('aria-hidden', 'true');
    const track = element(
        documentRef,
        'div',
        'hpmud-calendar-day-track',
    );
    track.setAttribute('role', 'listbox');
    track.setAttribute(
        'aria-label',
        staticText(
            displayLocale,
            'ui.calendar.day.grid_aria',
            'Plan time grid for the selected date',
        ),
    );
    for (const hour of grid.hours) {
        const label = element(
            documentRef,
            'time',
            '',
            hour.label,
        );
        label.dateTime = hour.label;
        label.style.setProperty(
            '--calendar-hour-top',
            String(hour.top),
        );
        scale.append(label);
        const line = element(
            documentRef,
            'span',
            'hpmud-calendar-hour-line',
        );
        line.setAttribute('aria-hidden', 'true');
        line.style.setProperty(
            '--calendar-hour-top',
            String(hour.top),
        );
        track.append(line);
    }
    const rovingId =
        selectedEntryId ||
        grid.items[0]?.id ||
        '';
    track.append(
        ...grid.items.map(item =>
            createPlanCard(documentRef, item, {
                selected: item.id === selectedEntryId,
                tabbable: item.id === rovingId,
                onSelect,
                onKeyDown,
            })),
    );
    shell.append(scale, track);
    container.append(shell);
}

function createWeekDayButton(
    documentRef,
    day,
    onDateSelect,
    displayLocale,
) {
    const button = element(
        documentRef,
        'button',
        [
            'hpmud-calendar-week-day',
            day.isSelected ? 'is-selected' : '',
            day.isToday ? 'is-today' : '',
        ].filter(Boolean).join(' '),
    );
    button.type = 'button';
    button.dataset.calendarDate = day.date;
    button.setAttribute('aria-label', day.ariaLabel);
    button.setAttribute(
        'aria-pressed',
        String(day.isSelected),
    );
    if (day.isToday) button.setAttribute('aria-current', 'date');
    button.append(
        element(
            documentRef,
            'small',
            '',
            day.weekdayLabel,
        ),
        element(
            documentRef,
            'strong',
            '',
            `${day.month}.${day.day}`,
        ),
        element(
            documentRef,
            'span',
            '',
            day.entryCount
                ? formatStaticText(
                    displayLocale,
                    'ui.calendar.item_count',
                    '{count} items',
                    {
                        count:
                            day.entryCount,
                    },
                )
                : staticText(
                    displayLocale,
                    'ui.calendar.empty',
                    'Empty',
                ),
        ),
    );
    button.addEventListener(
        'click',
        () => onDateSelect?.(day.date),
    );
    return button;
}

export function renderCalendarWeekGrid(
    documentRef,
    container,
    {
        week,
        selectedEntryId = '',
        onSelect,
        onDateSelect,
        onKeyDown,
        displayLocale = 'zh-CN',
    },
) {
    container.replaceChildren();
    const shell = element(
        documentRef,
        'div',
        'hpmud-calendar-week-grid',
    );
    shell.style.setProperty(
        '--calendar-grid-total-height',
        String(week.height),
    );
    const scroller = element(
        documentRef,
        'div',
        'hpmud-calendar-week-scroll',
    );
    const content = element(
        documentRef,
        'div',
        'hpmud-calendar-week-content',
    );
    const header = element(
        documentRef,
        'div',
        'hpmud-calendar-week-header',
    );
    header.append(
        element(
            documentRef,
            'span',
            'hpmud-calendar-week-corner',
            staticText(
                displayLocale,
                'ui.calendar.meta.time',
                'Time',
            ),
        ),
        ...week.days.map(day =>
            createWeekDayButton(
                documentRef,
                day,
                onDateSelect,
                displayLocale,
            )),
    );

    const body = element(
        documentRef,
        'div',
        'hpmud-calendar-week-body',
    );
    const scale = element(
        documentRef,
        'div',
        'hpmud-calendar-hour-scale',
    );
    scale.setAttribute('aria-hidden', 'true');
    for (const hour of week.hours) {
        const label = element(
            documentRef,
            'time',
            '',
            hour.label,
        );
        label.dateTime = hour.label;
        label.style.setProperty(
            '--calendar-hour-top',
            String(hour.top),
        );
        scale.append(label);
    }
    body.append(scale);

    const rovingId =
        selectedEntryId ||
        week.days
            .flatMap(day => day.grid.items)
            .find(Boolean)?.id ||
        '';
    for (const day of week.days) {
        const track = element(
            documentRef,
            'div',
            [
                'hpmud-calendar-day-track',
                'hpmud-calendar-week-track',
                day.isSelected ? 'is-selected' : '',
                day.isToday ? 'is-today' : '',
            ].filter(Boolean).join(' '),
        );
        track.dataset.calendarWeekDate = day.date;
        track.setAttribute('role', 'listbox');
        track.setAttribute(
            'aria-label',
            formatStaticText(
                displayLocale,
                'ui.calendar.day.plans_aria',
                '{weekday} plans',
                {
                    weekday:
                        day.weekdayLabel,
                },
            ),
        );
        for (const hour of week.hours) {
            const line = element(
                documentRef,
                'span',
                'hpmud-calendar-hour-line',
            );
            line.setAttribute('aria-hidden', 'true');
            line.style.setProperty(
                '--calendar-hour-top',
                String(hour.top),
            );
            track.append(line);
        }
        track.append(
            ...day.grid.items.map(item =>
                createPlanCard(documentRef, item, {
                    selected: item.id === selectedEntryId,
                    tabbable: item.id === rovingId,
                    onSelect,
                    onKeyDown,
                })),
        );
        body.append(track);
    }

    content.append(header, body);
    scroller.append(content);
    shell.append(scroller);
    container.append(shell);
}

function createLinkedPlan(
    documentRef,
    entry,
    onSelect,
) {
    const button = element(
        documentRef,
        'button',
        'hpmud-calendar-scene-plan',
    );
    button.type = 'button';
    button.dataset.calendarEntryId = entry.id;
    button.append(
        element(documentRef, 'strong', '', entry.title),
        element(
            documentRef,
            'span',
            `hpmud-calendar-item-status is-${entry.status}`,
            entry.statusLabel,
        ),
    );
    button.addEventListener('click', () => onSelect?.(entry.id));
    return button;
}

export function renderCalendarSceneCards(
    documentRef,
    container,
    {
        scenes,
        selectedSceneId = '',
        expandedSceneIds = [],
        onSelect,
        onToggle,
        onLinkedEntrySelect,
        displayLocale = 'zh-CN',
    },
) {
    container.replaceChildren();
    if (!scenes.length) {
        const empty = element(
            documentRef,
            'div',
            'hpmud-calendar-section-empty',
        );
        empty.append(
            element(
                documentRef,
                'strong',
                '',
                staticText(
                    displayLocale,
                    'ui.calendar.day.no_scenes',
                    'No Scenes on this day',
                ),
            ),
            element(
                documentRef,
                'p',
                '',
                staticText(
                    displayLocale,
                    'ui.calendar.day.no_scenes_detail',
                    'You may open a Free Scene here. Nothing changes world State before submission.',
                ),
            ),
        );
        container.append(empty);
        return;
    }
    const expanded = new Set(expandedSceneIds);
    scenes.forEach((scene, index) => {
        const isExpanded = expanded.has(scene.id);
        const isSelected = selectedSceneId === scene.id;
        const article = element(
            documentRef,
            'article',
            [
                'hpmud-calendar-scene-card',
                isSelected ? 'is-selected' : '',
            ].filter(Boolean).join(' '),
        );
        article.dataset.calendarSceneCard = scene.id;
        const regionId = `hpmud_calendar_scene_links_${index}`;
        const button = element(
            documentRef,
            'button',
            'hpmud-calendar-scene-summary',
        );
        button.type = 'button';
        button.dataset.calendarItem = scene.id;
        button.dataset.calendarSceneId = scene.id;
        button.setAttribute('aria-expanded', String(isExpanded));
        button.setAttribute('aria-controls', regionId);
        if (isSelected) button.setAttribute('aria-current', 'true');
        const time = element(
            documentRef,
            'time',
            '',
            scene.timeLabel,
        );
        time.dateTime = scene.startClock.replace(' · ', 'T');
        const copy = element(documentRef, 'span');
        copy.append(
            element(documentRef, 'strong', '', scene.title),
            element(
                documentRef,
                'small',
                '',
                `${scene.location} · ${staticText(
                    displayLocale,
                    'ui.calendar.scene.archived',
                    'Archived',
                )}`,
            ),
        );
        button.append(
            time,
            copy,
            element(
                documentRef,
                'i',
                '',
                isExpanded
                    ? staticText(
                        displayLocale,
                        'ui.calendar.collapse',
                        'Collapse',
                    )
                    : staticText(
                        displayLocale,
                        'ui.calendar.expand',
                        'Expand',
                    ),
            ),
        );
        button.addEventListener('click', () => {
            onToggle?.(scene.id);
            onSelect?.(scene.id);
        });

        const region = element(
            documentRef,
            'div',
            'hpmud-calendar-scene-links',
        );
        region.id = regionId;
        region.setAttribute('id', regionId);
        region.hidden = !isExpanded;
        if (!scene.linkedEntries.length) {
            region.append(
                element(
                    documentRef,
                    'p',
                    'hpmud-calendar-muted',
                    staticText(
                        displayLocale,
                        'ui.calendar.scene.no_linked_plans',
                        'No linked plans',
                    ),
                ),
            );
        } else {
            region.append(
                ...scene.linkedEntries.map(entry =>
                    createLinkedPlan(
                        documentRef,
                        entry,
                        onLinkedEntrySelect,
                    )),
            );
        }
        article.append(button, region);
        container.append(article);
    });
}
