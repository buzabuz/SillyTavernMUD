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

function element(documentRef, tag, className = '', content = '') {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
}

function appendMetaRow(documentRef, list, label, value, { time = false } = {}) {
    const row = element(documentRef, 'div');
    const term = element(documentRef, 'dt', '', label);
    const detail = element(documentRef, 'dd');
    if (time) {
        const timeNode = element(documentRef, 'time', '', value);
        timeNode.dateTime = String(value || '').replace(' · ', 'T');
        detail.append(timeNode);
    } else {
        detail.textContent = value || '无';
    }
    row.append(term, detail);
    list.append(row);
}

function appendRecordRows(documentRef, list, rows) {
    for (const [label, value] of rows) {
        appendMetaRow(documentRef, list, label, value);
    }
}

function appendIntervalRow(
    documentRef,
    list,
    label,
    startClock,
    endClock,
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
        element(documentRef, 'span', '', ' 至 '),
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
        getRoomName,
        getWorldState,
        jobRegistry = {},
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
    const viewTabs = [
        ...root.querySelectorAll('[data-calendar-view]'),
    ];
    let lastViewModel = null;
    let backgroundScrollSnapshot = null;

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
                ? '已切换到今日日程。'
                : '已切换到剧情线作者视图。',
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
                        ? `${day.itemCount} 项`
                        : '空',
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
                `${storyline.intervalLabel} · ${storyline.beats.length} 个学期 beat`,
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
            element(documentRef, 'strong', '', '尚无公开剧情线'),
            element(
                documentRef,
                'p',
                '',
                '剧情线由高级导演维护，不会从日程或预览中自动生成。',
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
                entry.summary || '没有公开摘要。',
            ),
        );
        return section;
    }

    function createTags(tags) {
        if (!tags.length) return null;
        const section = element(
            documentRef,
            'section',
            'hpmud-calendar-tags',
        );
        section.setAttribute('aria-label', '安排标签');
        section.append(
            ...tags.map(tag => element(documentRef, 'span', '', tag)),
        );
        return section;
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
            '时间',
            entry.startClock,
            entry.endClock,
        );
        appendRecordRows(documentRef, list, [
            ['地点', entry.location],
            [
                '人物',
                entry.participants.length
                    ? entry.participants
                        .map(person => person.name)
                        .join('、')
                    : '无指定人物',
            ],
            ['状态', entry.statusLabel],
            [
                '公开来源',
                entry.source
                    ? `${entry.source.storylineTitle} · ${entry.source.beatTitle}`
                    : entry.planningTierLabel,
            ],
        ]);
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
            `已封存时间线，共 ${scene.timelineEntries.length} 条`,
        );
        section.append(
            element(
                documentRef,
                'h4',
                '',
                `时间线 · ${scene.timelineEntries.length} 条`,
            ),
        );
        if (!scene.timelineEntries.length) {
            section.append(
                element(
                    documentRef,
                    'p',
                    'hpmud-calendar-muted',
                    '该场景没有保存时间线条目。',
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
                entry.timeLabel || '时间未知',
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
                    entry.label || '没有保存说明。',
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
        announce(`正在进入 ${entry.startClock}。`);
        try {
            await runCalendarMoment(entry.id);
            backgroundScrollSnapshot = null;
            closeCalendar();
        } catch (error) {
            console.error('[Hogwarts MUD] Calendar Moment failed', error);
            session.calendarMomentError =
                String(
                    error?.cause?.message ||
                    error?.message ||
                    error,
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
            draft,
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
        announce(`正在前往 ${validation.startClock} 的自由开场。`);
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
                String(error?.cause?.message || error?.message || error);
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
            element(documentRef, 'small', '', '自由场景'),
            element(documentRef, 'h4', '', '从所选日期自由开场'),
            element(
                documentRef,
                'p',
                '',
                '不认领任何计划。提交后才会封存当前场景，并通过时间线保存事务创建新场景。',
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
                option(`${map.name} · ${map.id}`, map.id)),
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
                            room.id,
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
            element(documentRef, 'span', '', '所选日期'),
            dateInput,
        );
        const timeLabel = element(documentRef, 'label');
        timeLabel.append(
            element(documentRef, 'span', '', '开始时间'),
            timeInput,
        );
        const mapLabel = element(documentRef, 'label');
        mapLabel.append(
            element(documentRef, 'span', '', '权威地图'),
            mapSelect,
        );
        const roomLabel = element(documentRef, 'label');
        roomLabel.append(
            element(documentRef, 'span', '', '权威房间'),
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
                ? '正在建立场景'
                : '自由开场',
        );
        submit.type = 'submit';
        const cancel = element(
            documentRef,
            'button',
            'hpmud-calendar-free-cancel',
            '取消',
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
                readDraft(),
            );
            const error =
                session.calendarMomentError ||
                validation.error;
            feedback.textContent = error ||
                `有效目标 · ${validation.startClock} · 不认领日程`;
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
                ? `正在进入 ${entry.timeLabel}`
                : '进入场景',
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
            label: '整理场景资料',
        }, {
            id: 'archiving',
            label: '封存当前场景',
        }, {
            id: 'opening',
            label: '生成新场景开场',
        }, {
            id: 'saving',
            label: '保存世界状态',
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
                '正在读取日程、人物、地点与当前场景记录。',
            archiving:
                '导演正在收束旧场景，并编排前往目标时刻的转场。',
            opening:
                '旧场景方案已完成，现场表演者正在书写下一幕。',
            saving:
                '生成已完成，正在原子保存场景档案、时钟与日程。',
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
                '页面仍在工作',
            ),
            element(
                documentRef,
                'small',
                '',
                '需要连续完成两次模型生成，通常约 1–2 分钟。请保持页面开启。',
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
                '计划详情',
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
            '时间',
            scene.startClock,
            scene.endClock,
        );
        appendRecordRows(documentRef, meta, [
            ['地点', scene.location],
            ['档案 ID', scene.id],
        ]);
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
                '封存场景 · 只读正文',
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
            element(documentRef, 'h4', '', '长期线路档案'),
        );
        const meta = element(documentRef, 'dl', 'hpmud-calendar-meta');
        appendMetaRow(
            documentRef,
            meta,
            '时间跨度',
            storyline.intervalLabel,
            {
                time: true,
            },
        );
        appendRecordRows(documentRef, meta, [
            ['状态', storyline.statusLabel],
            [
                '人物',
                storyline.participants.length
                    ? storyline.participants
                        .map(person => person.name)
                        .join('、')
                    : '未指定',
            ],
            ['稳定 ID', storyline.id],
        ]);
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
                `学期节奏 · ${storyline.beats.length} 个 beat`,
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
                    `${beat.sequence.toString().padStart(2, '0')} · ${beat.termKey}`,
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
                `${beat.title} 场景进度`,
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
                    beat.summary || '没有公开节奏摘要。',
                ),
                progress,
                element(
                    documentRef,
                    'small',
                    '',
                    `${beat.windowLabel} · ${beat.scheduleCount} 个日程机会`,
                ),
            );
            beats.append(article);
        }
        body.append(beats);
        preview.append(
            createPreviewHeader(
                storyline,
                'Storyline · 作者视图',
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
                element(documentRef, 'h3', '', '剧情线作者视图'),
                element(
                    documentRef,
                    'p',
                    '',
                    '左侧展示长期线路及每个学期 beat 的 0..4 场景进度。选择剧情线查看完整节奏档案。',
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
                    '尚未选择',
                ),
                element(
                    documentRef,
                    'p',
                    '',
                    '选择一项计划或场景查看精简详情。',
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
            getRoomName,
        });
        session.calendarSelectedDate = viewModel.selectedDate;
        session.calendarDisplayMonth = viewModel.displayMonth;
        session.calendarSelectedEntryId = viewModel.selectedEntryId;
        session.calendarSelectedSceneId = viewModel.selectedSceneId;
        session.calendarSelectedStorylineId =
            viewModel.selectedStorylineId;
        syncViewTabs();
        root.querySelector('#hpmud_calendar_month_label').textContent =
            viewModel.monthLabel;
        const storylineMode =
            session.calendarViewMode === 'storylines';
        collectionKicker.textContent =
            storylineMode
                ? '作者视图'
                : 'Weekly ledger';
        root.querySelector('#hpmud_calendar_date_label').textContent =
            storylineMode
                ? '长期剧情线'
                : viewModel.weekLabel;
        root.querySelector('#hpmud_calendar_date_summary').textContent =
            storylineMode
                ? `${viewModel.storylines.length} 条线路`
                : `已选 ${viewModel.selectedDateLabel} · ${viewModel.scenes.length} 个场景`;
        planSummary.textContent =
            `${viewModel.weekGrid.itemCount} 项 · 容器内滚动`;
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
        announce(`${viewModel?.selectedDateLabel || 'Calendar'} 已打开。`);
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
