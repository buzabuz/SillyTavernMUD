import {
    projectSceneArchiveHistory,
    readSceneArchiveRecord,
} from '../domain/calendar-scene.js';
import {
    buildCalendarViewModel,
    calendarDateFromClock,
    resolveCalendarDateKey,
    resolveCalendarListKey,
    restoreCalendarFocus,
    validateCalendarTimelineMoment,
} from './calendar-view-model.js';
import {
    renderCalendarWeekGrid,
    renderCalendarSceneCards,
} from './calendar-day-grid.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';
import {
    createActorNameField,
} from '../domain/actor-display-name.js';
import {
    getCanonLocalizationZhCn,
} from '../canon-localization.zh-cn.js';

function element(documentRef, tag, className = '', content = '') {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
}

function appendMetaRow(
    documentRef,
    list,
    label,
    value,
    {
        time = false,
        emptyText = '',
    } = {},
) {
    const row = element(documentRef, 'div');
    const term = element(documentRef, 'dt', '', label);
    const detail = element(documentRef, 'dd');
    if (time) {
        const timeNode = element(documentRef, 'time', '', value);
        timeNode.dateTime = String(value || '').replace(' · ', 'T');
        detail.append(timeNode);
    } else {
        detail.textContent =
            value ||
            emptyText;
    }
    row.append(term, detail);
    list.append(row);
}

function appendRecordRows(
    documentRef,
    list,
    rows,
    options,
) {
    for (const [label, value] of rows) {
        appendMetaRow(
            documentRef,
            list,
            label,
            value,
            options,
        );
    }
}

function appendIntervalRow(
    documentRef,
    list,
    label,
    startClock,
    endClock,
    separator,
) {
    const row = element(documentRef, 'div');
    const term = element(documentRef, 'dt', '', label);
    const detail = element(documentRef, 'dd');
    const start = element(documentRef, 'time', '', startClock);
    const end = element(documentRef, 'time', '', endClock);
    start.dateTime = String(startClock || '').replace(' · ', 'T');
    end.dateTime = String(endClock || '').replace(' · ', 'T');
    detail.append(
        start,
        element(
            documentRef,
            'span',
            '',
            separator,
        ),
        end,
    );
    row.append(term, detail);
    list.append(row);
}

export function createCalendarController(ports) {
    const {
        refs,
        session,
        ARCHIVE_TRANSCRIPT_PAGE_SIZE = 8,
        ensureLocalizedFields =
        async () => [],
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
        getRoomName,
        getWorldState,
        jobRegistry = {},
        requestFieldRetranslation =
        async () => [],
        renderSceneArchiveTranscript,
        runCalendarMoment,
        runTimelineMoment,
    } = ports;
    const {
        root,
        calendarDialog,
        storyElement =
        root.querySelector('#hpmud_story'),
    } = refs;
    const documentRef = root.ownerDocument || document;
    const trigger = root.querySelector('#hpmud_calendar');
    const dateModal = root.querySelector(
        '#hpmud_calendar_date_modal',
    );
    const dateModalOpen = root.querySelector(
        '#hpmud_calendar_date_modal_open',
    );
    const dateModalClose = root.querySelector(
        '#hpmud_calendar_date_modal_close',
    );
    const monthGrid = root.querySelector('#hpmud_calendar_month_grid');
    const dateStrip = root.querySelector('#hpmud_calendar_date_strip');
    const itemList = root.querySelector('#hpmud_calendar_items');
    const daySections = root.querySelector(
        '#hpmud_calendar_day_sections',
    );
    const planGrid = root.querySelector('#hpmud_calendar_plan_grid');
    const planSummary = root.querySelector(
        '#hpmud_calendar_plan_summary',
    );
    const sceneList = root.querySelector('#hpmud_calendar_scene_list');
    const freeToggle = root.querySelector(
        '#hpmud_calendar_free_toggle',
    );
    const freePanel = root.querySelector(
        '#hpmud_calendar_free_panel',
    );
    const storylineList = root.querySelector(
        '#hpmud_calendar_storylines',
    );
    const preview = root.querySelector('#hpmud_calendar_preview');
    const liveStatus = root.querySelector('#hpmud_calendar_status');
    const collectionKicker = root.querySelector(
        '#hpmud_calendar_collection_kicker',
    );
    const localizationStatus =
        element(
            documentRef,
            'small',
            'hpmud-calendar-localization-status',
            '\u00a0',
        );
    const localizationRetry =
        element(
            documentRef,
            'button',
            'hpmud-calendar-localization-retry',
        );
    localizationRetry.type =
        'button';
    localizationRetry.hidden =
        true;
    calendarDialog
        .querySelector(
            '.hpmud-calendar-title > div',
        )
        ?.append(
            localizationStatus,
            localizationRetry,
        );
    const viewTabs = [
        ...root.querySelectorAll('[data-calendar-view]'),
    ];
    let lastViewModel = null;
    let lastLocalizationFields = [];
    let backgroundScrollSnapshot = null;

    function staticText(
        staticKey,
        sourceTextEn,
    ) {
        return getStaticLocaleText(
            staticKey,
            normalizeDisplayLocale(
                session.displayLocale,
            ),
        ) ||
            sourceTextEn;
    }

    function formatStaticText(
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
                staticKey,
                sourceTextEn,
            ),
        );
    }

    function setDirectText(
        node,
        value,
    ) {
        const textNode = [
            ...(node?.childNodes ||
                []),
        ].find(child =>
            child.nodeType === 3 &&
            String(
                child.nodeValue ||
                '',
            ).trim());
        if (textNode) {
            textNode.nodeValue =
                value;
        } else {
            node?.append?.(
                documentRef
                    .createTextNode(
                        value,
                    ),
            );
        }
    }

    function syncStaticChrome() {
        const setText = (
            selector,
            key,
            sourceTextEn,
        ) => {
            const node =
                calendarDialog
                    .querySelector(
                        selector,
                    );
            if (node) {
                node.textContent =
                    staticText(
                        key,
                        sourceTextEn,
                    );
            }
        };
        const setAria = (
            selector,
            key,
            sourceTextEn,
        ) =>
            calendarDialog
                .querySelector(
                    selector,
                )
                ?.setAttribute?.(
                    'aria-label',
                    staticText(
                        key,
                        sourceTextEn,
                    ),
                );
        setText(
            '#hpmud_calendar_title',
            'ui.calendar.title',
            'School Calendar',
        );
        setText(
            '#hpmud_calendar_description',
            'ui.calendar.description',
            'Read public schedules by time. Preview and author views never write world State.',
        );
        setAria(
            '.hpmud-calendar-view-tabs',
            'ui.calendar.view_tabs_aria',
            'Calendar views',
        );
        setText(
            '[data-calendar-view="agenda"]',
            'ui.calendar.view.agenda',
            'Agenda',
        );
        setText(
            '[data-calendar-view="storylines"]',
            'ui.calendar.view.storylines',
            'Storylines',
        );
        setAria(
            '#hpmud_calendar_close',
            'ui.calendar.close_aria',
            'Close Calendar',
        );
        setAria(
            '#hpmud_calendar_collection',
            'ui.calendar.collection_aria',
            'Plans, Scenes, and Storylines',
        );
        const dateTrigger =
            calendarDialog
                .querySelector(
                    '#hpmud_calendar_date_modal_open',
                );
        setDirectText(
            dateTrigger,
            staticText(
                'ui.calendar.date_index',
                'Date index',
            ),
        );
        setAria(
            '#hpmud_calendar_date_modal',
            'ui.calendar.select_date',
            'Select date',
        );
        setText(
            '.hpmud-calendar-date-modal-header strong',
            'ui.calendar.date_index',
            'Date index',
        );
        setAria(
            '#hpmud_calendar_date_modal_close',
            'ui.calendar.close_date_index_aria',
            'Close date index',
        );
        setAria(
            '#hpmud_calendar_previous_month',
            'ui.calendar.previous_month_aria',
            'Previous month',
        );
        setAria(
            '#hpmud_calendar_next_month',
            'ui.calendar.next_month_aria',
            'Next month',
        );
        setAria(
            '#hpmud_calendar_month_grid',
            'ui.calendar.select_date',
            'Select date',
        );
        [
            ...calendarDialog
                .querySelectorAll(
                    '.hpmud-calendar-weekdays > span',
                ),
        ].forEach((
            node,
            index,
        ) => {
            const weekdayKey = [
                'mon',
                'tue',
                'wed',
                'thu',
                'fri',
                'sat',
                'sun',
            ][index];
            node.textContent =
                staticText(
                    `ui.calendar.weekday.${weekdayKey}`,
                    weekdayKey,
                );
        });
        setText(
            '#hpmud_calendar_plans_title',
            'ui.calendar.week_schedule',
            'Weekly schedule',
        );
        setText(
            '#hpmud_calendar_scenes_title',
            'ui.calendar.scenes',
            'Scenes',
        );
        setText(
            '#hpmud_calendar_free_toggle',
            'ui.calendar.free_scene',
            'Free Scene',
        );
        setAria(
            '#hpmud_calendar_storylines',
            'ui.calendar.public_storylines_aria',
            'Public Storylines',
        );
        setAria(
            '#hpmud_calendar_preview',
            'ui.calendar.preview_aria',
            'Plan or Scene details',
        );
    }

    function schedule(callback) {
        const scheduleFrame =
            globalThis.requestAnimationFrame ||
            (handler => setTimeout(handler, 0));
        scheduleFrame(callback);
    }

    function getBackgroundScrollNodes() {
        return [
            storyElement,
            documentRef.querySelector?.('#chat'),
        ].filter(
            (node, index, nodes) =>
                node &&
                nodes.indexOf(node) === index,
        );
    }

    function captureBackgroundScroll() {
        return getBackgroundScrollNodes()
            .map(node => ({
                node,
                left: Number(node.scrollLeft || 0),
                top: Number(node.scrollTop || 0),
            }));
    }

    function restoreBackgroundScroll(
        snapshot = backgroundScrollSnapshot,
    ) {
        for (const {
            node,
            left,
            top,
        } of snapshot || []) {
            node.scrollLeft = left;
            node.scrollTop = top;
        }
    }

    function beginBackgroundScrollProtection() {
        backgroundScrollSnapshot ??=
            captureBackgroundScroll();
        restoreBackgroundScroll();
    }

    function captureAgendaScroll() {
        const week = planGrid.querySelector(
            '.hpmud-calendar-week-scroll',
        );
        return week
            ? {
                left: Number(week.scrollLeft || 0),
                top: Number(week.scrollTop || 0),
            }
            : null;
    }

    function restoreAgendaScroll(snapshot) {
        if (!snapshot) return;
        const week = planGrid.querySelector(
            '.hpmud-calendar-week-scroll',
        );
        if (!week) return;
        week.scrollLeft = snapshot.left;
        week.scrollTop = snapshot.top;
    }

    function resetPreviewScroll() {
        preview.scrollLeft = 0;
        preview.scrollTop = 0;
    }

    function isWithin(node, ancestor) {
        for (let current = node; current; current = current.parentElement) {
            if (current === ancestor) return true;
        }
        return false;
    }

    function focusCalendarElement(node) {
        if (!node) return;
        try {
            node.focus({
                preventScroll: true,
            });
        } catch {
            node.focus();
        }
        restoreBackgroundScroll();
    }

    function announce(message, alert = false) {
        liveStatus.textContent = message;
        liveStatus.setAttribute('role', alert ? 'alert' : 'status');
    }

    function updateLocalizationStatus(
        fields,
    ) {
        lastLocalizationFields = [
            ...(fields || []),
        ];
        const statuses =
            (fields || [])
                .map(field =>
                    getLocalizedField(
                        field,
                    ).status);
        const status =
            statuses.includes(
                'error',
            )
                ? 'error'
                : statuses.includes(
                    'pending',
                )
                    ? 'pending'
                    : '';
        localizationStatus.className = [
            'hpmud-calendar-localization-status',
            status
                ? 'is-visible'
                : '',
            status === 'error'
                ? 'is-error'
                : '',
        ].filter(Boolean)
            .join(' ');
        localizationStatus.textContent =
            status
                ? getLocalizedField({
                    staticKey:
                        status ===
                            'error'
                            ? 'translation.status.partial_error'
                            : 'translation.status.pending',
                    sourceTextEn:
                        status === 'error'
                            ? 'Some fields are showing English source'
                            : 'Translating',
                }).text
                : '\u00a0';
        localizationRetry.hidden =
            status !== 'error';
        localizationRetry.textContent =
            getLocalizedField({
                staticKey:
                    'translation.action.retranslate',
                sourceTextEn:
                    'Retranslate',
            }).text;
    }

    localizationRetry.addEventListener(
        'click',
        async () => {
            localizationRetry.disabled =
                true;
            const errorFields =
                lastLocalizationFields
                    .filter(field =>
                        getLocalizedField(
                            field,
                        ).status ===
                            'error');
            try {
                await requestFieldRetranslation(
                    errorFields,
                    {
                        priority: 1,
                    },
                );
                announce(
                    getLocalizedField({
                        staticKey:
                            'translation.status.pending',
                        sourceTextEn:
                            'Translating',
                    }).text,
                );
            } finally {
                localizationRetry.disabled =
                    false;
            }
        },
    );

    function findByData(selector, key, value) {
        return [...calendarDialog.querySelectorAll(selector)]
            .find(node => node.dataset[key] === value);
    }

    function findDateButton(date) {
        const candidates = [
            ...calendarDialog.querySelectorAll(
                '[data-calendar-date]',
            ),
        ].filter(node => node.dataset.calendarDate === date);
        return candidates.find(node => node.offsetParent !== null) ||
            candidates[0];
    }

    function resetCalendarSelection({
        timelineEpoch = '',
    } = {}) {
        session.calendarSelectedDate = '';
        session.calendarDisplayMonth = '';
        session.calendarSelectedEntryId = '';
        session.calendarSelectedSceneId = '';
        session.calendarSelectedStorylineId = '';
        session.calendarTimelineEpoch = timelineEpoch;
        session.calendarViewMode = 'agenda';
        session.calendarFreeStartTime = '';
        session.calendarFreeMapId = '';
        session.calendarFreeRoomId = '';
        session.calendarFreePanelOpen = false;
        session.calendarExpandedSceneIds = [];
        session.calendarMomentError = '';
        lastViewModel = null;
        closeDateModal({
            focus: false,
        });
    }

    function syncCalendarTimeline(state) {
        const timelineEpoch = String(state?.timelineEpoch || '');
        if (session.calendarTimelineEpoch === timelineEpoch) {
            return;
        }
        resetCalendarSelection({
            timelineEpoch,
        });
    }

    function setSelectedDate(date, { focus = false } = {}) {
        session.calendarViewMode = 'agenda';
        session.calendarSelectedDate = date;
        session.calendarDisplayMonth = date;
        session.calendarSelectedEntryId = '';
        session.calendarSelectedSceneId = '';
        session.calendarFreePanelOpen = false;
        session.calendarExpandedSceneIds = [];
        session.calendarFreeStartTime = '';
        session.calendarMomentError = '';
        renderCalendar();
        if (focus) {
            focusCalendarElement(
                findDateButton(date),
            );
        }
    }

    function selectEntry(entryId, { focus = false } = {}) {
        const entry = getWorldState().calendar?.entries
            ?.find(candidate => candidate.id === entryId);
        if (!entry) return;
        const scrollSnapshot = captureAgendaScroll();
        session.calendarViewMode = 'agenda';
        session.calendarSelectedDate =
            calendarDateFromClock(entry.startClock) ||
            session.calendarSelectedDate;
        session.calendarDisplayMonth = session.calendarSelectedDate;
        session.calendarSelectedEntryId = entryId;
        session.calendarSelectedSceneId = '';
        session.calendarMomentError = '';
        renderCalendar();
        restoreAgendaScroll(scrollSnapshot);
        resetPreviewScroll();
        if (focus) {
            focusCalendarElement(
                findByData(
                    '[data-calendar-entry-id]',
                    'calendarEntryId',
                    entryId,
                ),
            );
        }
        schedule(() => restoreAgendaScroll(scrollSnapshot));
    }

    function selectScene(sceneId, { keepEntry = false, focus = false } = {}) {
        const scene = projectSceneArchiveHistory(getWorldState())
            .find(candidate => candidate.id === sceneId);
        if (!scene) return;
        session.calendarViewMode = 'agenda';
        session.archiveTranscriptLimit = ARCHIVE_TRANSCRIPT_PAGE_SIZE;
        session.calendarSelectedSceneId = sceneId;
        if (!keepEntry) {
            session.calendarSelectedEntryId = '';
            session.calendarSelectedDate =
                calendarDateFromClock(scene.startClock || scene.endClock) ||
                session.calendarSelectedDate;
            session.calendarDisplayMonth = session.calendarSelectedDate;
        }
        renderCalendar();
        resetPreviewScroll();
        if (focus) {
            focusCalendarElement(
                findByData(
                    '[data-calendar-scene-id]',
                    'calendarSceneId',
                    sceneId,
                ) ||
                preview.querySelector(
                    '.hpmud-calendar-preview-header',
                ),
            );
        }
    }

    function selectStoryline(
        storylineId,
        {
            focus = false,
        } = {},
    ) {
        const storyline = getWorldState().calendar?.storylines
            ?.find(candidate => candidate.id === storylineId);
        if (!storyline) return;
        session.calendarViewMode = 'storylines';
        session.calendarSelectedStorylineId = storylineId;
        renderCalendar();
        resetPreviewScroll();
        if (focus) {
            focusCalendarElement(
                findByData(
                    '[data-calendar-storyline-id]',
                    'calendarStorylineId',
                    storylineId,
                ),
            );
        }
    }

    function syncViewTabs() {
        for (const tab of viewTabs) {
            const selected =
                tab.dataset.calendarView ===
                session.calendarViewMode;
            tab.setAttribute(
                'aria-selected',
                String(selected),
            );
            tab.tabIndex = selected ? 0 : -1;
        }
    }

    function setCalendarView(
        mode,
        {
            focus = false,
        } = {},
    ) {
        if (!['agenda', 'storylines'].includes(mode)) return;
        session.calendarViewMode = mode;
        if (mode === 'storylines') {
            session.calendarFreePanelOpen = false;
        }
        session.calendarMomentError = '';
        renderCalendar();
        if (focus) {
            focusCalendarElement(
                viewTabs.find(tab =>
                    tab.dataset.calendarView === mode),
            );
        }
        announce(
            mode === 'agenda'
                ? staticText(
                    'ui.calendar.switched.agenda',
                    'Switched to today\'s agenda.',
                )
                : staticText(
                    'ui.calendar.switched.storylines',
                    'Switched to the Storyline author view.',
                ),
        );
    }

    function setRovingOption(buttons, current) {
        for (const button of buttons) {
            button.tabIndex = button === current ? 0 : -1;
        }
    }

    function handleListKeyDown(event) {
        const list = event.currentTarget.dataset.calendarStorylineId
            ? storylineList
            : planGrid;
        const buttons = [...list.querySelectorAll('[data-calendar-item]')];
        const next = resolveCalendarListKey(
            event.key,
            buttons.indexOf(event.currentTarget),
            buttons.length,
        );
        if (next < 0) return;
        event.preventDefault();
        event.stopPropagation?.();
        setRovingOption(buttons, buttons[next]);
        focusCalendarElement(buttons[next]);
    }

    function createDateButton(day, compact = false) {
        const button = element(
            documentRef,
            'button',
            [
                'hpmud-calendar-date',
                day.isSelected ? 'is-selected' : '',
                day.isToday ? 'is-today' : '',
                day.outsideMonth ? 'is-outside' : '',
                compact ? 'is-compact' : '',
            ].filter(Boolean).join(' '),
        );
        button.type = 'button';
        button.dataset.calendarDate = day.date;
        button.setAttribute('aria-label', day.ariaLabel);
        button.setAttribute('aria-pressed', String(day.isSelected));
        if (day.isToday) button.setAttribute('aria-current', 'date');
        button.append(
            element(
                documentRef,
                'span',
                'hpmud-calendar-day-number',
                String(day.day),
            ),
            element(
                documentRef,
                'small',
                '',
                compact
                    ? day.weekdayLabel
                    : day.itemCount
                        ? formatStaticText(
                            'ui.calendar.item_count',
                            '{count} items',
                            {
                                count:
                                    day.itemCount,
                            },
                        )
                        : staticText(
                            'ui.calendar.empty',
                            'Empty',
                        ),
            ),
        );
        button.addEventListener(
            'click',
            () => {
                setSelectedDate(day.date, {
                    focus: !dateModal,
                });
                if (dateModal) {
                    closeDateModal();
                }
            },
        );
        button.addEventListener('keydown', event => {
            const targetDate = resolveCalendarDateKey(day.date, event.key);
            if (!targetDate) return;
            event.preventDefault();
            event.stopPropagation?.();
            setSelectedDate(targetDate, { focus: true });
        });
        return button;
    }

    function renderDates(viewModel) {
        monthGrid?.replaceChildren(
            ...viewModel.monthDates.map(day => createDateButton(day)),
        );
        dateStrip?.replaceChildren(
            ...viewModel.compactDates.map(day => createDateButton(day, true)),
        );
    }

    function createStorylineButton(
        storyline,
        selected,
        tabbable,
    ) {
        const button = element(
            documentRef,
            'button',
            `hpmud-calendar-storyline${selected ? ' is-selected' : ''}`,
        );
        button.type = 'button';
        button.dataset.calendarItem = storyline.id;
        button.dataset.calendarStorylineId = storyline.id;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = tabbable ? 0 : -1;
        const heading = element(
            documentRef,
            'span',
            'hpmud-calendar-storyline-heading',
        );
        heading.append(
            element(documentRef, 'strong', '', storyline.title),
            element(
                documentRef,
                'span',
                `hpmud-calendar-item-status is-${storyline.status}`,
                storyline.statusLabel,
            ),
        );
        const beats = element(
            documentRef,
            'span',
            'hpmud-calendar-storyline-beats',
        );
        for (const beat of storyline.beats) {
            const row = element(documentRef, 'span');
            row.append(
                element(
                    documentRef,
                    'span',
                    '',
                    `${beat.sequence}. ${beat.title}`,
                ),
                element(
                    documentRef,
                    'b',
                    '',
                    beat.progressLabel,
                ),
            );
            beats.append(row);
        }
        button.append(
            heading,
            element(
                documentRef,
                'small',
                '',
                formatStaticText(
                    'ui.calendar.term_beat_count',
                    '{interval} · {count} term beats',
                    {
                        interval:
                            storyline
                                .intervalLabel,
                        count:
                            storyline
                                .beats
                                .length,
                    },
                ),
            ),
            beats,
        );
        button.addEventListener(
            'click',
            () => selectStoryline(storyline.id, {
                focus: true,
            }),
        );
        button.addEventListener('keydown', handleListKeyDown);
        return button;
    }

    function renderStorylines(viewModel) {
        storylineList.replaceChildren();
        const rovingId =
            viewModel.selectedStorylineId ||
            viewModel.storylines[0]?.id ||
            '';
        storylineList.append(
            ...viewModel.storylines.map(storyline =>
                createStorylineButton(
                    storyline,
                    storyline.id === viewModel.selectedStorylineId,
                    storyline.id === rovingId,
                )),
        );
        if (viewModel.storylines.length) return;
        const empty = element(documentRef, 'div', 'hpmud-calendar-empty');
        empty.append(
            element(documentRef, 'span', '', '◇'),
            element(
                documentRef,
                'strong',
                '',
                staticText(
                    'ui.calendar.no_public_storylines',
                    'No public Storylines',
                ),
            ),
            element(
                documentRef,
                'p',
                '',
                staticText(
                    'ui.calendar.no_public_storylines_detail',
                    'High-tier Directors maintain Storylines. Schedules and previews never create them automatically.',
                ),
            ),
        );
        storylineList.append(empty);
    }

    function toggleSceneExpansion(sceneId) {
        const expanded = new Set(
            session.calendarExpandedSceneIds || [],
        );
        if (expanded.has(sceneId)) {
            expanded.delete(sceneId);
        } else {
            expanded.add(sceneId);
        }
        session.calendarExpandedSceneIds = [...expanded];
    }

    function renderDaySections(viewModel) {
        renderCalendarWeekGrid(
            documentRef,
            planGrid,
            {
                week: viewModel.weekGrid,
                selectedEntryId: viewModel.selectedEntryId,
                onSelect: entryId => selectEntry(entryId, {
                    focus: true,
                }),
                onDateSelect: date => setSelectedDate(date, {
                    focus: true,
                }),
                onKeyDown: handleListKeyDown,
                displayLocale:
                    session
                        .displayLocale,
            },
        );
        renderCalendarSceneCards(
            documentRef,
            sceneList,
            {
                scenes: viewModel.scenes,
                selectedSceneId: viewModel.selectedSceneId,
                expandedSceneIds:
                    session.calendarExpandedSceneIds || [],
                onToggle: toggleSceneExpansion,
                onSelect: sceneId => selectScene(sceneId, {
                    focus: true,
                }),
                onLinkedEntrySelect: entryId => selectEntry(entryId, {
                    focus: true,
                }),
                displayLocale:
                    session
                        .displayLocale,
            },
        );
    }

    function renderItems(viewModel) {
        const storylineMode =
            session.calendarViewMode === 'storylines';
        daySections.hidden = storylineMode;
        storylineList.hidden = !storylineMode;
        if (storylineMode) {
            renderStorylines(viewModel);
            return;
        }
        renderDaySections(viewModel);
    }

    function createPreviewHeader(item, eyebrow) {
        const header = element(
            documentRef,
            'header',
            'hpmud-calendar-preview-header',
        );
        header.tabIndex = -1;
        const copy = element(documentRef, 'div');
        copy.append(
            element(documentRef, 'small', '', eyebrow),
            element(documentRef, 'h3', '', item.title),
        );
        header.append(
            copy,
            element(
                documentRef,
                'span',
                `hpmud-calendar-status is-${item.statusTone || 'archive'}`,
                item.statusLabel,
            ),
        );
        return header;
    }

    function createSummary(entry) {
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-summary',
        );
        section.append(
            element(
                documentRef,
                'p',
                '',
                entry.summary ||
                    staticText(
                        'ui.calendar.no_public_summary',
                        'No public summary.',
                    ),
            ),
        );
        return section;
    }

    function createTags(tags) {
        const localizedTags =
            tags
                .map(tag =>
                    getStaticLocaleText(
                        `ui.calendar.tag.${tag}`,
                        normalizeDisplayLocale(
                            session
                                .displayLocale,
                        ),
                    ))
                .filter(Boolean);
        if (!localizedTags.length) {
            return null;
        }
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-tags',
        );
        section.setAttribute(
            'aria-label',
            staticText(
                'ui.calendar.tags_aria',
                'Schedule tags',
            ),
        );
        section.append(
            ...localizedTags.map(tag =>
                element(
                    documentRef,
                    'span',
                    '',
                    tag,
                )),
        );
        return section;
    }

    function formatTermKey(
        termKey,
    ) {
        const match =
            /^(\d{4})_(autumn|spring)$/u
                .exec(
                    String(
                        termKey ||
                        '',
                    ),
                );
        if (!match) {
            return staticText(
                'ui.calendar.term.unknown',
                'Unscheduled term',
            );
        }
        return formatStaticText(
            `ui.calendar.term.${match[2]}`,
            match[2] === 'spring'
                ? '{year} spring term'
                : '{year} autumn term',
            {
                year: match[1],
            },
        );
    }

    function createEntryDetails(entry) {
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-context',
        );
        const list = element(
            documentRef,
            'dl',
            'hpmud-calendar-meta',
        );
        appendIntervalRow(
            documentRef,
            list,
            staticText(
                'ui.calendar.meta.time',
                'Time',
            ),
            entry.startClock,
            entry.endClock,
            staticText(
                'ui.calendar.to',
                ' to ',
            ),
        );
        appendRecordRows(
            documentRef,
            list,
            [
                [
                    staticText(
                        'ui.calendar.meta.location',
                        'Location',
                    ),
                    entry.location,
                ],
                [
                    staticText(
                        'ui.calendar.meta.characters',
                        'Characters',
                    ),
                    entry.participants.length
                        ? entry.participants
                            .map(person => person.name)
                            .join(', ')
                        : staticText(
                            'ui.calendar.meta.no_characters',
                            'No specified characters',
                        ),
                ],
                [
                    staticText(
                        'ui.calendar.meta.status',
                        'Status',
                    ),
                    entry.statusLabel,
                ],
                [
                    staticText(
                        'ui.calendar.meta.public_source',
                        'Public source',
                    ),
                    entry.source
                        ? `${entry.source.storylineTitle} · ${entry.source.beatTitle}`
                        : entry.planningTierLabel,
                ],
            ],
            {
                emptyText:
                    staticText(
                        'ui.calendar.none',
                        'None',
                    ),
            },
        );
        section.append(list);
        return section;
    }

    function createSceneTimeline(scene) {
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-scene-timeline',
        );
        section.setAttribute(
            'aria-label',
            formatStaticText(
                'ui.calendar.timeline.sealed',
                'Sealed timeline · {count} entries',
                {
                    count:
                        scene
                            .timelineEntries
                            .length,
                },
            ),
        );
        section.append(
            element(
                documentRef,
                'h4',
                '',
                formatStaticText(
                    'ui.calendar.timeline.count',
                    'Timeline · {count} entries',
                    {
                        count:
                            scene
                                .timelineEntries
                                .length,
                    },
                ),
            ),
        );
        if (!scene.timelineEntries.length) {
            section.append(
                element(
                    documentRef,
                    'p',
                    'hpmud-calendar-muted',
                    staticText(
                        'ui.calendar.timeline.empty',
                        'This Scene has no saved timeline entries.',
                    ),
                ),
            );
            return section;
        }
        const list = element(documentRef, 'ol');
        for (const entry of scene.timelineEntries) {
            const item = element(documentRef, 'li');
            const time = element(
                documentRef,
                'time',
                '',
                entry.timeLabel ||
                    staticText(
                        'ui.calendar.time.unknown',
                        'Time unknown',
                    ),
            );
            if (entry.clock) {
                time.dateTime = entry.clock.replace(' · ', 'T');
            }
            item.append(
                time,
                element(
                    documentRef,
                    'p',
                    '',
                    entry.label ||
                        staticText(
                            'ui.calendar.timeline.no_note',
                            'No saved note.',
                        ),
                ),
            );
            list.append(item);
        }
        section.append(list);
        return section;
    }

    async function enterCalendarMoment(entry) {
        if (session.calendarMomentBusy) return;
        session.calendarMomentBusy = true;
        session.calendarMomentError = '';
        renderCalendar();
        announce(
            formatStaticText(
                'ui.calendar.entering',
                'Entering {clock}.',
                {
                    clock:
                        entry.startClock,
                },
            ),
        );
        try {
            await runCalendarMoment(entry.id);
            backgroundScrollSnapshot = null;
            closeCalendar();
        } catch (error) {
            console.error('[Hogwarts MUD] Calendar Moment failed', error);
            session.calendarMomentError =
                staticText(
                    'ui.calendar.runtime_error',
                    'The Scene could not be opened.',
                );
            announce(
                session.calendarMomentError,
                true,
            );
        } finally {
            session.calendarMomentBusy = false;
            if (calendarDialog.open) {
                renderCalendar();
                preview.querySelector('.hpmud-calendar-enter')?.focus();
            }
        }
    }

    function getFreeMomentDraft(viewModel, state) {
        const maps = viewModel.locationOptions;
        const preferredMapId =
            session.calendarFreeMapId ||
            state.map?.activeMapId ||
            maps[0]?.id ||
            '';
        const map =
            maps.find(candidate => candidate.id === preferredMapId) ||
            maps[0] ||
            null;
        const preferredRoomId =
            session.calendarFreeRoomId ||
            (
                map?.id === state.map?.activeMapId
                    ? state.map?.currentLocalNodeId
                    : ''
            ) ||
            map?.rooms[0]?.id ||
            '';
        const room =
            map?.rooms.find(candidate =>
                candidate.id === preferredRoomId) ||
            map?.rooms[0] ||
            null;
        const currentTime =
            String(state.clock || '').split(' · ').at(-1);
        const time =
            session.calendarFreeStartTime ||
            (
                viewModel.selectedDate === viewModel.currentDate &&
                /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(currentTime)
                    ? currentTime
                    : '09:00'
            );
        session.calendarFreeStartTime = time;
        session.calendarFreeMapId = map?.id || '';
        session.calendarFreeRoomId = room?.id || '';
        return {
            date: viewModel.selectedDate,
            time,
            mapId: map?.id || '',
            roomId: room?.id || '',
        };
    }

    async function enterTimelineMoment(draft) {
        if (session.calendarMomentBusy) return;
        const state = getWorldState();
        const validation = validateCalendarTimelineMoment(
            state,
            {
                ...draft,
                displayLocale:
                    session
                        .displayLocale,
            },
        );
        if (!validation.valid) {
            session.calendarMomentError = validation.error;
            renderCalendar();
            freePanel.querySelector(
                '.hpmud-calendar-free-submit',
            )?.focus();
            return;
        }
        session.calendarMomentBusy = true;
        session.calendarMomentError = '';
        renderCalendar();
        announce(
            formatStaticText(
                'ui.calendar.entering_free',
                'Opening a Free Scene at {clock}.',
                {
                    clock:
                        validation
                            .startClock,
                },
            ),
        );
        try {
            await runTimelineMoment({
                startClock: validation.startClock,
                mapId: draft.mapId,
                roomId: draft.roomId,
            });
            backgroundScrollSnapshot = null;
            closeCalendar();
        } catch (error) {
            console.error('[Hogwarts MUD] Timeline Moment failed', error);
            session.calendarMomentError =
                staticText(
                    'ui.calendar.runtime_error',
                    'The Scene could not be opened.',
                );
            announce(session.calendarMomentError, true);
        } finally {
            session.calendarMomentBusy = false;
            if (calendarDialog.open) {
                renderCalendar();
                freePanel.querySelector(
                    '.hpmud-calendar-free-submit',
                )?.focus();
            }
        }
    }

    function setFreePanelOpen(open, { focus = '' } = {}) {
        session.calendarFreePanelOpen = Boolean(open);
        if (!open) session.calendarMomentError = '';
        renderCalendar();
        schedule(() => {
            if (!calendarDialog.open) return;
            const target = focus === 'form'
                ? freePanel.querySelector('input')
                : freeToggle;
            focusCalendarElement(target);
        });
    }

    function createFreeMomentForm(viewModel, state) {
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-free',
        );
        section.append(
            element(
                documentRef,
                'small',
                '',
                staticText(
                    'ui.calendar.free.kicker',
                    'Free Scene',
                ),
            ),
            element(
                documentRef,
                'h4',
                '',
                staticText(
                    'ui.calendar.free.title',
                    'Open a Free Scene on the selected date',
                ),
            ),
            element(
                documentRef,
                'p',
                '',
                staticText(
                    'ui.calendar.free.detail',
                    'Claims no plan. Submission seals the current Scene and creates a new Scene through the timeline save transaction.',
                ),
            ),
        );
        const form = element(
            documentRef,
            'form',
            'hpmud-calendar-free-form',
        );
        const draft = getFreeMomentDraft(viewModel, state);
        const dateInput = element(documentRef, 'input');
        dateInput.type = 'date';
        dateInput.value = draft.date;
        dateInput.readOnly = true;
        dateInput.setAttribute('aria-readonly', 'true');
        const timeInput = element(documentRef, 'input');
        timeInput.type = 'time';
        timeInput.required = true;
        timeInput.value = draft.time;
        if (viewModel.selectedDate === viewModel.currentDate) {
            timeInput.min = String(state.clock || '').split(' · ').at(-1);
        }
        const mapSelect = element(documentRef, 'select');
        mapSelect.required = true;
        const roomSelect = element(documentRef, 'select');
        roomSelect.required = true;
        const option = (label, value) => {
            const node = element(documentRef, 'option', '', label);
            node.value = value;
            return node;
        };
        mapSelect.append(
            ...viewModel.locationOptions.map(map =>
                option(map.name, map.id)),
        );
        mapSelect.value = draft.mapId;
        const populateRooms = mapId => {
            const map = viewModel.locationOptions
                .find(candidate => candidate.id === mapId);
            roomSelect.replaceChildren(
                ...(
                    map?.rooms || []
                ).map(room =>
                    option(
                        [
                            room.levelName,
                            room.name,
                        ].filter(Boolean).join(' · '),
                        room.id,
                    )),
            );
            roomSelect.value =
                map?.rooms.some(room =>
                    room.id === session.calendarFreeRoomId)
                    ? session.calendarFreeRoomId
                    : map?.rooms[0]?.id || '';
            session.calendarFreeRoomId = roomSelect.value;
        };
        populateRooms(mapSelect.value);
        const dateLabel = element(documentRef, 'label');
        dateLabel.append(
            element(
                documentRef,
                'span',
                '',
                staticText(
                    'ui.calendar.free.selected_date',
                    'Selected date',
                ),
            ),
            dateInput,
        );
        const timeLabel = element(documentRef, 'label');
        timeLabel.append(
            element(
                documentRef,
                'span',
                '',
                staticText(
                    'ui.calendar.free.start_time',
                    'Start time',
                ),
            ),
            timeInput,
        );
        const mapLabel = element(documentRef, 'label');
        mapLabel.append(
            element(
                documentRef,
                'span',
                '',
                staticText(
                    'ui.calendar.free.authoritative_map',
                    'Authoritative Map',
                ),
            ),
            mapSelect,
        );
        const roomLabel = element(documentRef, 'label');
        roomLabel.append(
            element(
                documentRef,
                'span',
                '',
                staticText(
                    'ui.calendar.free.authoritative_room',
                    'Authoritative room',
                ),
            ),
            roomSelect,
        );
        const feedback = element(
            documentRef,
            'p',
            'hpmud-calendar-free-feedback',
        );
        feedback.id = 'hpmud_calendar_free_feedback';
        feedback.setAttribute('aria-live', 'polite');
        const submit = element(
            documentRef,
            'button',
            'hpmud-calendar-free-submit',
            session.calendarMomentBusy
                ? staticText(
                    'ui.calendar.free.creating',
                    'Creating Scene',
                )
                : staticText(
                    'ui.calendar.free.open',
                    'Open Free Scene',
                ),
        );
        submit.type = 'submit';
        const cancel = element(
            documentRef,
            'button',
            'hpmud-calendar-free-cancel',
            staticText(
                'ui.calendar.cancel',
                'Cancel',
            ),
        );
        cancel.type = 'button';
        cancel.addEventListener(
            'click',
            () => setFreePanelOpen(false, {
                focus: 'toggle',
            }),
        );
        const readDraft = () => ({
            date: viewModel.selectedDate,
            time: timeInput.value,
            mapId: mapSelect.value,
            roomId: roomSelect.value,
        });
        const refreshValidation = () => {
            const validation = validateCalendarTimelineMoment(
                state,
                {
                    ...readDraft(),
                    displayLocale:
                        session
                            .displayLocale,
                },
            );
            const error =
                session.calendarMomentError ||
                validation.error;
            feedback.textContent = error ||
                formatStaticText(
                    'ui.calendar.free.valid',
                    'Valid target · {clock} · claims no schedule',
                    {
                        clock:
                            validation
                                .startClock,
                    },
                );
            feedback.className =
                `hpmud-calendar-free-feedback${error ? ' is-error' : ' is-valid'}`;
            feedback.setAttribute(
                'role',
                session.calendarMomentError ? 'alert' : 'status',
            );
            submit.disabled =
                Boolean(session.calendarMomentBusy) ||
                !validation.valid;
        };
        timeInput.addEventListener('change', () => {
            session.calendarFreeStartTime = timeInput.value;
            session.calendarMomentError = '';
            refreshValidation();
        });
        mapSelect.addEventListener('change', () => {
            session.calendarFreeMapId = mapSelect.value;
            session.calendarFreeRoomId = '';
            session.calendarMomentError = '';
            populateRooms(mapSelect.value);
            refreshValidation();
        });
        roomSelect.addEventListener('change', () => {
            session.calendarFreeRoomId = roomSelect.value;
            session.calendarMomentError = '';
            refreshValidation();
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            void enterTimelineMoment(readDraft());
        });
        form.append(
            dateLabel,
            timeLabel,
            mapLabel,
            roomLabel,
            feedback,
            element(
                documentRef,
                'div',
                'hpmud-calendar-free-actions',
            ),
        );
        form.querySelector('.hpmud-calendar-free-actions')
            .append(cancel, submit);
        section.append(form);
        refreshValidation();
        return section;
    }

    function createEntryAction(entry) {
        if (!entry.canEnter) return null;
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-action',
        );
        if (session.calendarMomentBusy) {
            section.className +=
                ' is-loading';
            section.append(
                createCalendarMomentLoading(
                    entry,
                ),
            );
        }
        const button = element(
            documentRef,
            'button',
            'hpmud-calendar-enter',
            session.calendarMomentBusy
                ? formatStaticText(
                    'ui.calendar.entering_scene',
                    'Entering {time}',
                    {
                        time:
                            entry.timeLabel,
                    },
                )
                : staticText(
                    'ui.calendar.enter_scene',
                    'Enter Scene',
                ),
        );
        button.type = 'button';
        button.disabled = Boolean(session.calendarMomentBusy);
        button.addEventListener(
            'click',
            () => void enterCalendarMoment(entry),
        );
        section.append(button);
        if (session.calendarMomentError) {
            const feedback = element(
                documentRef,
                'p',
                'hpmud-calendar-action-feedback',
                session.calendarMomentError,
            );
            feedback.setAttribute(
                'role',
                'alert',
            );
            section.append(feedback);
        }
        return section;
    }

    function createCalendarMomentLoading(
        entry,
    ) {
        const phases = [{
            id: 'preparing',
            label:
                staticText(
                    'ui.calendar.transition.prepare',
                    'Prepare Scene material',
                ),
        }, {
            id: 'archiving',
            label:
                staticText(
                    'ui.calendar.transition.archive',
                    'Archive current Scene',
                ),
        }, {
            id: 'opening',
            label:
                staticText(
                    'ui.calendar.transition.generate',
                    'Generate new Scene opening',
                ),
        }, {
            id: 'saving',
            label:
                staticText(
                    'ui.calendar.transition.save',
                    'Save world State',
                ),
        }];
        const requestedPhase =
            jobRegistry
                .calendarMomentPhase;
        const phaseIndex =
            requestedPhase ===
                'committed'
                ? phases.length - 1
                : Math.max(
                    0,
                    phases.findIndex(
                        phase =>
                            phase.id ===
                            requestedPhase,
                    ),
                );
        const current =
            phases[phaseIndex];
        const details = {
            preparing:
                staticText(
                    'ui.calendar.transition.detail.prepare',
                    'Reading the schedule, characters, location, and current Scene record.',
                ),
            archiving:
                staticText(
                    'ui.calendar.transition.detail.archive',
                    'The Director is closing the old Scene and arranging the transition to the target time.',
                ),
            opening:
                staticText(
                    'ui.calendar.transition.detail.generate',
                    'The old Scene plan is complete. The Scene Performer is writing the next opening.',
                ),
            saving:
                staticText(
                    'ui.calendar.transition.detail.save',
                    'Generation is complete. Atomically saving the Scene archive, clock, and Calendar.',
                ),
        };
        const panel = element(
            documentRef,
            'div',
            'hpmud-calendar-moment-loading',
        );
        panel.setAttribute(
            'role',
            'status',
        );
        panel.setAttribute(
            'aria-live',
            'polite',
        );
        const heading = element(
            documentRef,
            'header',
        );
        const spinner = element(
            documentRef,
            'span',
            'hpmud-calendar-loading-sigil',
        );
        spinner.setAttribute(
            'aria-hidden',
            'true',
        );
        const copy = element(
            documentRef,
            'div',
        );
        copy.append(
            element(
                documentRef,
                'small',
                '',
                'Calendar moment',
            ),
            element(
                documentRef,
                'strong',
                '',
                current.label,
            ),
        );
        heading.append(
            spinner,
            copy,
            element(
                documentRef,
                'time',
                '',
                entry.timeLabel,
            ),
        );
        const list = element(
            documentRef,
            'ol',
            'hpmud-calendar-loading-steps',
        );
        phases.forEach(
            (
                phase,
                index,
            ) => {
                const item = element(
                    documentRef,
                    'li',
                    index < phaseIndex
                        ? 'is-complete'
                        : index === phaseIndex
                            ? 'is-current'
                            : '',
                );
                item.append(
                    element(
                        documentRef,
                        'i',
                    ),
                    element(
                        documentRef,
                        'span',
                        '',
                        phase.label,
                    ),
                );
                list.append(item);
            },
        );
        const note = element(
            documentRef,
            'footer',
        );
        note.append(
            element(
                documentRef,
                'span',
                '',
                staticText(
                    'ui.calendar.page_working',
                    'The page is still working',
                ),
            ),
            element(
                documentRef,
                'small',
                '',
                staticText(
                    'ui.calendar.page_working_detail',
                    'Two consecutive model generations are required and usually take 1-2 minutes. Keep this page open.',
                ),
            ),
        );
        panel.append(
            heading,
            element(
                documentRef,
                'p',
                '',
                details[current.id],
            ),
            list,
            note,
        );
        return panel;
    }

    function renderEntryPreview(entry) {
        const body = element(
            documentRef,
            'div',
            'hpmud-calendar-preview-body',
        );
        const parts = [
            createSummary(entry),
            createEntryDetails(entry),
            createEntryAction(entry),
        ].filter(Boolean);
        body.append(...parts);
        preview.append(
            createPreviewHeader(
                entry,
                staticText(
                    'ui.calendar.plan_details',
                    'Plan details',
                ),
            ),
            body,
        );
    }

    function renderScenePreview(scene, state) {
        const body = element(
            documentRef,
            'div',
            'hpmud-calendar-preview-body',
        );
        const meta = element(
            documentRef,
            'dl',
            'hpmud-calendar-meta hpmud-calendar-scene-meta',
        );
        appendIntervalRow(
            documentRef,
            meta,
            staticText(
                'ui.calendar.meta.time',
                'Time',
            ),
            scene.startClock,
            scene.endClock,
            staticText(
                'ui.calendar.to',
                ' to ',
            ),
        );
        appendRecordRows(
            documentRef,
            meta,
            [
                [
                    staticText(
                        'ui.calendar.meta.location',
                        'Location',
                    ),
                    scene.location,
                ],
            ],
            {
                emptyText:
                    staticText(
                        'ui.calendar.none',
                        'None',
                    ),
            },
        );
        body.append(meta);
        if (scene.summary) {
            body.append(
                element(
                    documentRef,
                    'p',
                    'hpmud-calendar-scene-detail-summary',
                    scene.summary,
                ),
            );
        }
        body.append(
            createSceneTimeline(scene),
        );
        const transcript = element(
            documentRef,
            'div',
            'hpmud-archive-transcript hpmud-calendar-transcript',
        );
        transcript.id = 'hpmud_calendar_transcript';
        body.append(transcript);
        preview.append(
            createPreviewHeader(
                scene,
                staticText(
                    'ui.calendar.archive_body',
                    'Archived Scene · Read-only text',
                ),
            ),
            body,
        );
        const record = readSceneArchiveRecord(state, scene.id);
        if (record) {
            renderSceneArchiveTranscript(
                record,
                false,
                transcript,
                {
                    readOnly: true,
                },
            );
        }
    }
    function renderStorylinePreview(storyline) {
        const body = element(
            documentRef,
            'div',
            'hpmud-calendar-preview-body',
        );
        body.append(
            createSummary(storyline),
            createTags(storyline.tags),
        );
        const overview = element(
            documentRef,
            'section',
            'hpmud-calendar-context',
        );
        overview.append(
            element(
                documentRef,
                'h4',
                '',
                staticText(
                    'ui.calendar.storyline.archive',
                    'Long-term Storyline archive',
                ),
            ),
        );
        const meta = element(documentRef, 'dl', 'hpmud-calendar-meta');
        appendMetaRow(
            documentRef,
            meta,
            staticText(
                'ui.calendar.meta.duration',
                'Duration',
            ),
            storyline.intervalLabel,
            {
                time: true,
                emptyText:
                    staticText(
                        'ui.calendar.none',
                        'None',
                    ),
            },
        );
        appendRecordRows(
            documentRef,
            meta,
            [
                [
                    staticText(
                        'ui.calendar.meta.status',
                        'Status',
                    ),
                    storyline.statusLabel,
                ],
                [
                    staticText(
                        'ui.calendar.meta.characters',
                        'Characters',
                    ),
                    storyline.participants.length
                        ? storyline.participants
                            .map(person => person.name)
                            .join(', ')
                        : staticText(
                            'ui.calendar.meta.no_characters',
                            'No specified characters',
                        ),
                ],
            ],
            {
                emptyText:
                    staticText(
                        'ui.calendar.none',
                        'None',
                    ),
            },
        );
        overview.append(meta);
        body.append(overview);
        const beats = element(
            documentRef,
            'section',
            'hpmud-calendar-beat-ledger',
        );
        beats.append(
            element(
                documentRef,
                'h4',
                '',
                formatStaticText(
                    'ui.calendar.storyline.term_progress',
                    'Term pacing · {count} beats',
                    {
                        count:
                            storyline
                                .beats
                                .length,
                    },
                ),
            ),
        );
        for (const beat of storyline.beats) {
            const article = element(documentRef, 'article');
            const header = element(documentRef, 'header');
            header.append(
                element(
                    documentRef,
                    'small',
                    '',
                    `${
                        beat.sequence
                            .toString()
                            .padStart(
                                2,
                                '0',
                            )
                    } · ${formatTermKey(
                        beat.termKey,
                    )}`,
                ),
                element(documentRef, 'h5', '', beat.title),
                element(
                    documentRef,
                    'span',
                    `hpmud-calendar-item-status is-${beat.status}`,
                    beat.statusLabel,
                ),
            );
            const progress = element(
                documentRef,
                'div',
                'hpmud-calendar-progress',
            );
            progress.setAttribute('role', 'progressbar');
            progress.setAttribute(
                'aria-label',
                formatStaticText(
                    'ui.calendar.storyline.scene_progress',
                    '{title} Scene progress',
                    {
                        title:
                            beat.title,
                    },
                ),
            );
            progress.setAttribute('aria-valuemin', '0');
            progress.setAttribute(
                'aria-valuemax',
                String(beat.sceneTarget),
            );
            progress.setAttribute(
                'aria-valuenow',
                String(beat.sceneProgress),
            );
            progress.append(
                ...Array.from(
                    {
                        length: beat.sceneTarget,
                    },
                    (_, index) => {
                        const mark = element(documentRef, 'i');
                        if (index < beat.sceneProgress) {
                            mark.className = 'is-complete';
                        }
                        return mark;
                    },
                ),
                element(documentRef, 'strong', '', beat.progressLabel),
            );
            article.append(
                header,
                element(
                    documentRef,
                    'p',
                    '',
                    beat.summary ||
                        staticText(
                            'ui.calendar.storyline.no_summary',
                            'No public pacing summary.',
                        ),
                ),
                progress,
                element(
                    documentRef,
                    'small',
                    '',
                    formatStaticText(
                        'ui.calendar.storyline.opportunities',
                        '{window} · {count} schedule opportunities',
                        {
                            window:
                                beat
                                    .windowLabel,
                            count:
                                beat
                                    .scheduleCount,
                        },
                    ),
                ),
            );
            beats.append(article);
        }
        body.append(beats);
        preview.append(
            createPreviewHeader(
                storyline,
                staticText(
                    'ui.calendar.storyline.author_view',
                    'Storyline · Author view',
                ),
            ),
            body,
        );
    }

    function renderFreePanel(viewModel, state) {
        const open = session.calendarViewMode === 'agenda' &&
            Boolean(session.calendarFreePanelOpen);
        freeToggle.setAttribute('aria-expanded', String(open));
        freePanel.hidden = !open;
        freePanel.replaceChildren(
            ...(open
                ? [createFreeMomentForm(viewModel, state)]
                : []),
        );
    }

    function renderPreview(viewModel, state) {
        preview.replaceChildren();
        if (session.calendarViewMode === 'storylines') {
            if (viewModel.selectedStoryline) {
                renderStorylinePreview(viewModel.selectedStoryline);
                return;
            }
            const empty = element(
                documentRef,
                'div',
                'hpmud-calendar-preview-empty',
            );
            empty.append(
                element(documentRef, 'span', '', '◇'),
                element(
                    documentRef,
                    'h3',
                    '',
                    staticText(
                        'ui.calendar.storyline.author_title',
                        'Storyline author view',
                    ),
                ),
                element(
                    documentRef,
                    'p',
                    '',
                    staticText(
                        'ui.calendar.storyline.author_detail',
                        'The left side shows long-term Storylines and each term beat\'s 0..4 Scene progress. Select a Storyline to inspect its pacing archive.',
                    ),
                ),
            );
            preview.append(empty);
            return;
        }
        if (!viewModel.preview) {
            const empty = element(
                documentRef,
                'div',
                'hpmud-calendar-preview-empty',
            );
            empty.append(
                element(documentRef, 'span', '', '◇'),
                element(
                    documentRef,
                    'h3',
                    '',
                    staticText(
                        'ui.calendar.not_selected',
                        'Nothing selected',
                    ),
                ),
                element(
                    documentRef,
                    'p',
                    '',
                    staticText(
                        'ui.calendar.preview_empty',
                        'Select a plan or Scene to view a concise record.',
                    ),
                ),
            );
            preview.append(empty);
            return;
        }
        if (viewModel.preview.kind === 'scene_archive') {
            renderScenePreview(viewModel.preview, state);
        } else {
            renderEntryPreview(viewModel.preview);
        }
    }

    function renderCalendar() {
        if (!calendarDialog?.open) return null;
        syncStaticChrome();
        beginBackgroundScrollProtection();
        const state = getWorldState();
        syncCalendarTimeline(state);
        const viewModel = buildCalendarViewModel(state, {
            selectedDate: session.calendarSelectedDate,
            displayMonth: session.calendarDisplayMonth,
            selectedEntryId: session.calendarSelectedEntryId,
            selectedSceneId: session.calendarSelectedSceneId,
            selectedStorylineId:
                session.calendarSelectedStorylineId,
            displayLocale:
                session.displayLocale,
            getRoomName,
            getLocalizedField,
        });
        const storylineMode =
            session.calendarViewMode ===
            'storylines';
        const visibleLocalizationFields =
            new Map();
        const addField = (
            recordKind,
            recordId,
            fieldPath,
            sourceTextEn,
        ) => {
            if (!sourceTextEn) return;
            const field = {
                recordKind,
                recordId:
                    String(recordId),
                fieldPath,
                sourceTextEn,
            };
            visibleLocalizationFields
                .set(
                    JSON.stringify([
                        recordKind,
                        recordId,
                        fieldPath,
                    ]),
                    field,
                );
        };
        const addEntry = entry => {
            addField(
                'calendar_entry',
                entry.id,
                'titleEn',
                entry.titleEn,
            );
            addField(
                'calendar_entry',
                entry.id,
                'summaryEn',
                entry.summaryEn,
            );
            (
                entry.participants ||
                []
            )
                .filter(person =>
                    !getCanonLocalizationZhCn(
                        person.id,
                    ))
                .forEach(person =>
                    visibleLocalizationFields
                        .set(
                            JSON.stringify([
                                'actor_core',
                                person.id,
                                'nameEn',
                            ]),
                            createActorNameField(
                                person.id,
                                person.nameEn,
                            ),
                        ));
        };
        if (storylineMode) {
            viewModel.storylines
                .forEach(storyline => {
                    addField(
                        'calendar_storyline',
                        storyline.id,
                        'titleEn',
                        storyline.titleEn,
                    );
                    addField(
                        'calendar_storyline',
                        storyline.id,
                        'summaryEn',
                        storyline.summaryEn,
                    );
                    storyline.beats
                        .forEach(beat => {
                            addField(
                                'calendar_story_beat',
                                beat.id,
                                'titleEn',
                                beat.titleEn,
                            );
                            addField(
                                'calendar_story_beat',
                                beat.id,
                                'summaryEn',
                                beat.summaryEn,
                            );
                        });
                });
        } else {
            viewModel.weekDays
                .flatMap(day =>
                    day.entries)
                .forEach(addEntry);
            viewModel.entries
                .forEach(addEntry);
            viewModel.scenes
                .forEach(scene => {
                    addField(
                        'scene_archive',
                        scene.id,
                        'nameEn',
                        scene.titleEn,
                    );
                    addField(
                        'scene_archive',
                        scene.id,
                        'summaryEn',
                        scene.summaryEn,
                    );
                    scene.timelineEntries
                        .forEach((
                            entry,
                            index,
                        ) =>
                            addField(
                                'scene_timeline',
                                `${scene.id}:${index}`,
                                'summaryEn',
                                entry.summaryEn,
                            ));
                });
        }
        if (
            !storylineMode &&
            session
                .calendarFreePanelOpen
        ) {
            viewModel.locationOptions
                .flatMap(option =>
                    option
                        .localizationFields ||
                    [])
                .forEach(field =>
                    visibleLocalizationFields
                        .set(
                            JSON.stringify([
                                field.recordKind,
                                field.recordId,
                                field.fieldPath,
                            ]),
                            field,
                        ));
        }
        updateLocalizationStatus([
            ...visibleLocalizationFields
                .values(),
        ]);
        void Promise.resolve(
            ensureLocalizedFields(
                [
                    ...visibleLocalizationFields
                        .values(),
                ],
                {
                    priority: 1,
                },
            ),
        ).catch(error =>
            console.warn(
                '[Hogwarts MUD] Calendar localization query failed',
                error,
            ));
        session.calendarSelectedDate = viewModel.selectedDate;
        session.calendarDisplayMonth = viewModel.displayMonth;
        session.calendarSelectedEntryId = viewModel.selectedEntryId;
        session.calendarSelectedSceneId = viewModel.selectedSceneId;
        session.calendarSelectedStorylineId =
            viewModel.selectedStorylineId;
        syncViewTabs();
        root.querySelector('#hpmud_calendar_month_label').textContent =
            viewModel.monthLabel;
        collectionKicker.textContent =
            storylineMode
                ? staticText(
                    'ui.calendar.mode.author',
                    'Author view',
                )
                : staticText(
                    'ui.calendar.mode.weekly',
                    'Weekly ledger',
                );
        root.querySelector('#hpmud_calendar_date_label').textContent =
            storylineMode
                ? staticText(
                    'ui.calendar.mode.storylines',
                    'Long-term Storylines',
                )
                : viewModel.weekLabel;
        root.querySelector('#hpmud_calendar_date_summary').textContent =
            storylineMode
                ? formatStaticText(
                    'ui.calendar.storyline_count',
                    '{count} Storylines',
                    {
                        count:
                            viewModel
                                .storylines
                                .length,
                    },
                )
                : formatStaticText(
                    'ui.calendar.selected_summary',
                    'Selected {date} · {count} Scenes',
                    {
                        date:
                            viewModel
                                .selectedDateLabel,
                        count:
                            viewModel
                                .scenes
                                .length,
                    },
                );
        planSummary.textContent =
            formatStaticText(
                'ui.calendar.scroll_summary',
                '{count} items · scrolls inside this panel',
                {
                    count:
                        viewModel
                            .weekGrid
                            .itemCount,
                },
            );
        renderDates(viewModel);
        renderItems(viewModel);
        renderFreePanel(viewModel, state);
        renderPreview(viewModel, state);
        lastViewModel = viewModel;
        restoreBackgroundScroll();
        return viewModel;
    }

    function openCalendar({ entryId = '', archiveId = '' } = {}) {
        beginBackgroundScrollProtection();
        const state = getWorldState();
        syncCalendarTimeline(state);
        if (entryId) {
            const entry = state.calendar?.entries
                ?.find(candidate => candidate.id === entryId);
            session.calendarSelectedEntryId = entry?.id || '';
            session.calendarSelectedSceneId = '';
            session.calendarViewMode = 'agenda';
            session.calendarSelectedDate =
                calendarDateFromClock(entry?.startClock) ||
                calendarDateFromClock(state.clock);
        } else if (archiveId) {
            const scene = projectSceneArchiveHistory(state)
                .find(candidate => candidate.id === archiveId);
            session.calendarSelectedEntryId = '';
            session.calendarSelectedSceneId = scene?.id || '';
            session.calendarViewMode = 'agenda';
            session.calendarSelectedDate =
                calendarDateFromClock(scene?.startClock || scene?.endClock) ||
                calendarDateFromClock(state.clock);
        } else {
            session.calendarSelectedDate =
                session.calendarSelectedDate ||
                calendarDateFromClock(state.clock);
        }
        session.calendarDisplayMonth = session.calendarSelectedDate;
        if (!calendarDialog.open) {
            calendarDialog.showModal();
            restoreBackgroundScroll();
        }
        const viewModel = renderCalendar();
        const focusTarget =
            itemList.querySelector('[aria-selected="true"]') ||
            calendarDialog.querySelector('[aria-pressed="true"]') ||
            viewTabs.find(tab =>
                tab.dataset.calendarView ===
                session.calendarViewMode) ||
            calendarDialog.querySelector('#hpmud_calendar_close');
        schedule(() => {
            if (!calendarDialog.open) return;
            focusCalendarElement(focusTarget);
            restoreBackgroundScroll();
        });
        announce(
            formatStaticText(
                'ui.calendar.opened',
                '{date} opened.',
                {
                    date:
                        viewModel
                            ?.selectedDateLabel ||
                        'Calendar',
                },
            ),
        );
    }

    function closeCalendar() {
        const snapshot = backgroundScrollSnapshot;
        if (calendarDialog.open) calendarDialog.close();
        restoreBackgroundScroll(snapshot);
    }

    function shiftCalendarMonth(delta) {
        const key = delta < 0 ? 'PageUp' : 'PageDown';
        const date = resolveCalendarDateKey(
            session.calendarDisplayMonth ||
            session.calendarSelectedDate ||
            lastViewModel?.selectedDate,
            key,
        );
        if (!date) return;
        session.calendarDisplayMonth = date;
        renderCalendar();
    }

    function openDateModal() {
        if (!dateModal) return;
        if (!dateModal.hidden) {
            closeDateModal();
            return;
        }
        dateModal.hidden = false;
        dateModalOpen?.setAttribute('aria-expanded', 'true');
        schedule(() => {
            if (dateModal.hidden || !calendarDialog.open) return;
            const selected = monthGrid?.querySelector(
                '[aria-pressed="true"]',
            );
            focusCalendarElement(selected || dateModalClose);
        });
    }

    function closeDateModal({
        focus = true,
    } = {}) {
        if (!dateModal || dateModal.hidden) return;
        dateModal.hidden = true;
        dateModalOpen?.setAttribute('aria-expanded', 'false');
        if (focus) {
            schedule(() => focusCalendarElement(dateModalOpen));
        }
    }

    function handleCalendarDialogClose() {
        session.calendarMomentBusy = false;
        session.calendarFreePanelOpen = false;
        session.calendarMomentError = '';
        closeDateModal({
            focus: false,
        });
        const snapshot =
            backgroundScrollSnapshot ||
            captureBackgroundScroll();
        restoreBackgroundScroll(snapshot);
        restoreCalendarFocus(trigger);
        restoreBackgroundScroll(snapshot);
        schedule(() => {
            restoreBackgroundScroll(snapshot);
            if (backgroundScrollSnapshot === snapshot) {
                backgroundScrollSnapshot = null;
            }
        });
    }

    function handleCalendarKeyDown(event) {
        const tabMode = event.target?.dataset?.calendarView;
        if (
            tabMode &&
            [
                'ArrowLeft',
                'ArrowRight',
                'Home',
                'End',
            ].includes(event.key)
        ) {
            event.preventDefault();
            event.stopPropagation?.();
            const nextMode =
                event.key === 'ArrowLeft' ||
                event.key === 'Home'
                    ? 'agenda'
                    : 'storylines';
            setCalendarView(nextMode, {
                focus: true,
            });
            return;
        }
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation?.();
        if (dateModal && !dateModal.hidden) {
            closeDateModal();
            return;
        }
        if (session.calendarFreePanelOpen) {
            setFreePanelOpen(false, {
                focus: 'toggle',
            });
            return;
        }
        closeCalendar();
    }

    dateModalOpen?.addEventListener('click', openDateModal);
    dateModalClose?.addEventListener(
        'click',
        () => closeDateModal(),
    );
    calendarDialog?.addEventListener('click', event => {
        if (
            !dateModal ||
            dateModal.hidden ||
            event.target === dateModalOpen ||
            isWithin(event.target, dateModal)
        ) {
            return;
        }
        closeDateModal({
            focus: false,
        });
    });
    freeToggle.addEventListener('click', () => {
        const open = !session.calendarFreePanelOpen;
        setFreePanelOpen(open, {
            focus: open ? 'form' : 'toggle',
        });
    });

    return {
        closeCalendar,
        handleCalendarDialogClose,
        handleCalendarKeyDown,
        openCalendar,
        renderCalendar,
        resetCalendarSelection,
        setCalendarView,
        shiftCalendarMonth,
    };
}
