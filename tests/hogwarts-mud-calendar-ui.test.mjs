/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import { load } from 'cheerio';
import {
    buildCalendarLocationOptions,
    buildCalendarViewModel,
    resolveCalendarDateKey,
    resolveCalendarListKey,
    restoreCalendarFocus,
    validateCalendarTimelineMoment,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-view-model.js';
import {
    createCalendarController,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-controller.js';
import {
    calculateCalendarDayGrid,
    calculateOverlapLanes,
    calculateVisibleHourRange,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-day-grid.js';
import {
    normalizeModelSlots,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    repairLoadedModelSlots,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-library.js';

const CURRENT_CLOCK = '1991-09-03 · 10:00';
const TARGET_CLOCK = '1991-09-03 · 11:00';
const HARRY_ID = 'canon_harry_james_potter';
const HERMIONE_ID = 'canon_hermione_jean_granger';
const STORYLINE_ID = 'first_year_secrets';
const BEAT_ID = 'first_year_secrets_autumn';

function createEntry(id, patch = {}) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        titleEn: id,
        summaryEn: `Public schedule for ${id}.`,
        tags: [],
        startClock: TARGET_CLOCK,
        endClock: '1991-09-03 · 12:00',
        participantIds: [HARRY_ID],
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
        status: 'planned',
        planningTier: 'medium',
        relatedSceneIds: [],
        sourceBeatId: '',
        beatSlot: null,
        scheduleKind: 'class',
        createdClock: CURRENT_CLOCK,
        updatedClock: CURRENT_CLOCK,
        ...patch,
    };
}

function createWorldState() {
    const exam = createEntry('charms_exam', {
        titleEn: 'Charms Exam',
        summaryEn:
            'Complete the public exam in the Charms classroom.',
        tags: ['exam'],
        participantIds: [
            HARRY_ID,
            HERMIONE_ID,
        ],
        relatedSceneIds: [
            'archive_exam_one',
            'archive_exam_two',
        ],
        sourceBeatId: BEAT_ID,
        beatSlot: 1,
        scheduleKind: 'story',
    });
    const date = createEntry('charms_date', {
        titleEn: 'A Date During the Exam',
        summaryEn:
            'Another public commitment at the same time.',
        tags: ['date'],
        participantIds: [HERMIONE_ID],
        mapId: 'hogsmeade',
        roomId: 'three_broomsticks',
        sourceBeatId: BEAT_ID,
        beatSlot: 2,
        scheduleKind: 'social',
    });
    const completed = createEntry('morning_class', {
        titleEn: 'Morning Class',
        startClock: '1991-09-03 · 08:00',
        endClock: '1991-09-03 · 09:00',
        status: 'completed',
    });
    const cancelled = createEntry('cancelled_training', {
        titleEn:
            'Cancelled Training',
        startClock: '1991-09-03 · 14:00',
        endClock: '1991-09-03 · 15:00',
        status: 'cancelled',
    });
    const pastPlanned = createEntry('stale_planned', {
        titleEn: 'Past Plan',
        startClock: '1991-09-02 · 08:00',
        endClock: '1991-09-02 · 09:00',
        status: 'planned',
    });
    return {
        timelineEpoch: 'calendar_ui_timeline_one',
        clock: CURRENT_CLOCK,
        calendar: {
            version: 3,
            storylines: [{
                id: STORYLINE_ID,
                titleEn: 'First-year Secrets',
                summaryEn: 'A public long-running first-year thread.',
                tags: ['mystery'],
                startClock: '1991-09-01 · 00:00',
                endClock: '1992-06-30 · 23:59',
                participantIds: [HARRY_ID, HERMIONE_ID],
                status: 'active',
                createdClock: '1991-09-01 · 00:00',
                updatedClock: CURRENT_CLOCK,
            }],
            storyBeats: [{
                id: BEAT_ID,
                storylineId: STORYLINE_ID,
                titleEn: 'Autumn Clues',
                summaryEn: 'Four scenes reveal the first clue.',
                tags: ['term'],
                termKey: '1991_autumn',
                sequence: 1,
                windowStartClock: '1991-09-01 · 00:00',
                windowEndClock: '1991-12-20 · 23:59',
                sceneTarget: 4,
                status: 'active',
                relatedSceneIds: ['archive_exam_one'],
                createdClock: '1991-09-01 · 00:00',
                updatedClock: CURRENT_CLOCK,
            }],
            entries: [
                exam,
                date,
                completed,
                cancelled,
                pastPlanned,
            ],
            horizon: '1991-09-17 · 10:00',
        },
        actorLibrary: [{
            id: HARRY_ID,
            nameEn: 'Harry Potter',
        }, {
            id: HERMIONE_ID,
            nameEn:
                'Hermione Granger',
        }],
        actors: [],
        map: {
            activeMapId: 'hogwarts_castle',
            currentLocalNodeId: 'charms_classroom',
            customLocalMaps: [{
                id: 'hogwarts_castle',
                nodes: [{
                    id: 'charms_classroom',
                    nameEn:
                        'Charms Classroom',
                }],
            }, {
                id: 'hogsmeade',
                nodes: [{
                    id: 'three_broomsticks',
                    nameEn:
                        'Three Broomsticks',
                }],
            }],
            generatedLocalNodes: [],
        },
        sceneArchive: [{
            id: 'archive_exam_one',
            nameEn: 'Exam Act One',
            summaryEn:
                'The first archived exam scene.',
            startedClock: '1991-09-03 · 11:00',
            endedClock: '1991-09-03 · 11:20',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            calendarEntryIds: [
                'charms_exam',
                'charms_date',
            ],
            timelineEntries: [{
                clock: '1991-09-03 · 11:00',
                summaryEn:
                    'The exam begins.',
            }, {
                clock: '1991-09-03 · 11:20',
                summaryEn:
                    'The first scene ends.',
            }],
            messageIds: [11, 12],
            authorQuillEn: 'Archive body one.',
        }, {
            id: 'archive_exam_two',
            nameEn: 'Exam Act Two',
            summaryEn:
                'The second archived exam scene.',
            startedClock: '1991-09-03 · 11:20',
            endedClock: '1991-09-03 · 12:00',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            calendarEntryIds: ['charms_exam'],
            messageIds: [13, 14],
            authorQuillEn: 'Archive body two.',
        }, {
            id: 'archive_four_states',
            nameEn:
                'Four-state Claims Archive',
            summaryEn:
                'Only four explicitly claimed plans are shown.',
            startedClock: '1991-09-03 · 12:10',
            endedClock: '1991-09-03 · 12:30',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            calendarEntryIds: [
                'charms_exam',
                'charms_date',
                'cancelled_training',
                'stale_planned',
            ],
            messageIds: [],
            authorQuillEn: 'Four explicit claims.',
        }, {
            id: 'empty_claim_archive',
            nameEn:
                'Empty Claims Archive',
            summaryEn:
                'A Scene with an explicit empty claim list.',
            startedClock: '1991-09-03 · 11:00',
            endedClock: '1991-09-03 · 11:10',
            calendarEntryIds: [],
            messageIds: [],
        }, {
            id: 'legacy_archive',
            nameEn: 'Legacy Archive',
            summaryEn:
                'An older Scene without plan links.',
            startedClock: '1991-09-03 · 11:00',
            endedClock: '1991-09-03 · 11:30',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
            messageIds: [1, 2],
            authorQuillEn: 'Legacy archive body.',
        }],
    };
}

function getRoomName(state, mapId, roomId) {
    const map = state.map.customLocalMaps
        .find(candidate => candidate.id === mapId);
    const names = {
        charms_classroom:
            '魔咒教室',
        three_broomsticks:
            '三把扫帚',
        great_hall:
            '礼堂',
    };
    return names[roomId] ||
        map?.nodes.find(room =>
            room.id === roomId)
            ?.nameEn ||
        roomId ||
        '位置未知';
}

class TestNode {
    constructor(tagName, documentRef) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = documentRef;
        this.children = [];
        this.dataset = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.style = {
            values: new Map(),
            setProperty: (name, value) => {
                this.style.values.set(name, String(value));
            },
            getPropertyValue: name =>
                this.style.values.get(name) || '',
        };
        this.className = '';
        this._textContent = '';
        this.open = false;
        this.hidden = false;
        this.disabled = false;
        this.scrollLeft = 0;
        this.scrollTop = 0;
        this.offsetParent = this;
    }

    append(...children) {
        const values = children.filter(Boolean);
        values.forEach(child => {
            child.parentElement = this;
        });
        this.children.push(...values);
    }

    replaceChildren(...children) {
        this.children = children.filter(Boolean);
        this.children.forEach(child => {
            child.parentElement = this;
        });
        this._textContent = '';
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
        if (name === 'id') this.id = String(value);
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    dispatch(type, patch = {}) {
        const event = {
            currentTarget: this,
            target: this,
            preventDefault() {},
            stopPropagation() {},
            ...patch,
        };
        for (const listener of this.listeners.get(type) || []) {
            listener(event);
        }
        return event;
    }

    click() {
        if (!this.disabled) this.dispatch('click');
    }

    focus({ preventScroll = false } = {}) {
        this.ownerDocument.activeElement = this;
        if (!preventScroll) {
            for (const target of this.ownerDocument.scrollTargets || []) {
                target.scrollTop = 0;
                target.scrollLeft = 0;
            }
        }
    }

    showModal() {
        this.open = true;
        for (const target of this.ownerDocument.scrollTargets || []) {
            target.scrollTop = 0;
            target.scrollLeft = 0;
        }
    }

    close() {
        if (!this.open) return;
        this.open = false;
        for (const target of this.ownerDocument.scrollTargets || []) {
            target.scrollTop = 0;
            target.scrollLeft = 0;
        }
        this.dispatch('close');
    }

    closest() {
        return null;
    }

    matches(selector) {
        if (selector.startsWith('#')) {
            return this.id === selector.slice(1);
        }
        if (selector.startsWith('.')) {
            return this.className.split(/\s+/u)
                .includes(selector.slice(1));
        }
        if (/^[a-z]+$/u.test(selector)) {
            return this.tagName === selector.toUpperCase();
        }
        const attribute = selector.match(
            /^\[([^=\]]+)(?:="([^"]*)")?\]$/u,
        );
        if (!attribute) return false;
        const [, name, expected] = attribute;
        let value;
        if (name.startsWith('data-')) {
            const key = name.slice(5).replace(
                /-([a-z])/gu,
                (_match, letter) => letter.toUpperCase(),
            );
            value = this.dataset[key];
        } else {
            value = this.getAttribute(name);
        }
        return expected === undefined
            ? value !== undefined && value !== null
            : String(value) === expected;
    }

    querySelectorAll(selector) {
        const matches = [];
        const visit = node => {
            if (node.matches?.(selector)) matches.push(node);
            node.children.forEach(visit);
        };
        this.children.forEach(visit);
        return matches;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    set textContent(value) {
        this._textContent = String(value);
        this.children = [];
    }

    get textContent() {
        return [
            this._textContent,
            ...this.children.map(child => child.textContent),
        ].join('');
    }
}

function createControllerDom() {
    const documentRef = {
        activeElement: null,
        scrollTargets: [],
        createElement(tagName) {
            return new TestNode(tagName, documentRef);
        },
    };
    const root = new TestNode('div', documentRef);
    const ids = [
        'hpmud_calendar',
        'hpmud_calendar_dialog',
        'hpmud_calendar_month_grid',
        'hpmud_calendar_date_strip',
        'hpmud_calendar_items',
        'hpmud_calendar_day_sections',
        'hpmud_calendar_plan_summary',
        'hpmud_calendar_plan_grid',
        'hpmud_calendar_free_toggle',
        'hpmud_calendar_free_panel',
        'hpmud_calendar_scene_list',
        'hpmud_calendar_storylines',
        'hpmud_calendar_preview',
        'hpmud_calendar_status',
        'hpmud_calendar_month_label',
        'hpmud_calendar_date_label',
        'hpmud_calendar_date_summary',
        'hpmud_calendar_collection_kicker',
        'hpmud_calendar_close',
        'hpmud_story',
    ];
    const nodes = Object.fromEntries(ids.map(id => {
        const buttonIds = new Set([
            'hpmud_calendar',
            'hpmud_calendar_free_toggle',
            'hpmud_calendar_close',
        ]);
        const node = new TestNode(
            id.endsWith('_dialog')
                ? 'dialog'
                : buttonIds.has(id)
                    ? 'button'
                    : 'div',
            documentRef,
        );
        node.id = id;
        node.setAttribute('id', id);
        return [id, node];
    }));
    nodes.hpmud_calendar_free_toggle.setAttribute(
        'aria-controls',
        'hpmud_calendar_free_panel',
    );
    nodes.hpmud_calendar_free_toggle.setAttribute(
        'aria-expanded',
        'false',
    );
    nodes.hpmud_calendar_free_panel.hidden = true;
    root.append(
        nodes.hpmud_calendar,
        nodes.hpmud_story,
        nodes.hpmud_calendar_dialog,
    );
    const agendaTab = new TestNode('button', documentRef);
    agendaTab.dataset.calendarView = 'agenda';
    agendaTab.setAttribute('role', 'tab');
    agendaTab.setAttribute('aria-selected', 'true');
    const storylinesTab = new TestNode('button', documentRef);
    storylinesTab.dataset.calendarView = 'storylines';
    storylinesTab.setAttribute('role', 'tab');
    storylinesTab.setAttribute('aria-selected', 'false');
    nodes.hpmud_calendar_items.append(
        nodes.hpmud_calendar_day_sections,
        nodes.hpmud_calendar_storylines,
    );
    nodes.hpmud_calendar_day_sections.append(
        nodes.hpmud_calendar_plan_summary,
        nodes.hpmud_calendar_plan_grid,
        nodes.hpmud_calendar_free_toggle,
        nodes.hpmud_calendar_free_panel,
        nodes.hpmud_calendar_scene_list,
    );
    const nestedIds = new Set([
        'hpmud_calendar_day_sections',
        'hpmud_calendar_plan_summary',
        'hpmud_calendar_plan_grid',
        'hpmud_calendar_free_toggle',
        'hpmud_calendar_free_panel',
        'hpmud_calendar_scene_list',
        'hpmud_calendar_storylines',
    ]);
    nodes.hpmud_calendar_dialog.append(
        agendaTab,
        storylinesTab,
        ...ids
            .filter(id => ![
                'hpmud_calendar',
                'hpmud_calendar_dialog',
                'hpmud_story',
            ].includes(id) &&
            !nestedIds.has(id))
            .map(id => nodes[id]),
    );
    const hostChat = new TestNode('div', documentRef);
    hostChat.id = 'chat';
    hostChat.setAttribute('id', 'chat');
    documentRef.querySelector = selector =>
        selector === '#chat'
            ? hostChat
            : root.querySelector(selector);
    documentRef.scrollTargets = [
        nodes.hpmud_story,
        hostChat,
    ];
    return {
        documentRef,
        hostChat,
        nodes,
        refs: {
            root,
            calendarDialog:
                nodes.hpmud_calendar_dialog,
            storyElement:
                nodes.hpmud_story,
        },
        viewTabs: {
            agenda: agendaTab,
            storylines: storylinesTab,
        },
    };
}

test('day-grid pure functions calculate visible hours, duration height, offsets, and stable overlap lanes', () => {
    const entries = [
        createEntry('lane_a', {
            titleEn: 'Short Plan',
            startClock: '1991-09-03 · 08:30',
            endClock: '1991-09-03 · 09:00',
            statusLabel: '计划中',
        }),
        createEntry('lane_b', {
            startClock: '1991-09-03 · 08:45',
            endClock: '1991-09-03 · 10:00',
        }),
        createEntry('lane_c', {
            startClock: '1991-09-03 · 09:45',
            endClock: '1991-09-03 · 10:15',
        }),
    ];
    assert.deepEqual(
        calculateVisibleHourRange(entries),
        {
            startHour: 8,
            endHour: 18,
            totalMinutes: 600,
        },
    );
    const lanes = calculateOverlapLanes(entries);
    assert.deepEqual(
        lanes.map(item => [
            item.id,
            item.laneIndex,
            item.laneCount,
        ]),
        [
            ['lane_a', 0, 2],
            ['lane_b', 1, 2],
            ['lane_c', 0, 2],
        ],
    );
    const grid = calculateCalendarDayGrid(entries);
    const short = grid.items.find(item => item.id === 'lane_a');
    assert.equal(short.minuteOffset, 30);
    assert.equal(short.top, 30);
    assert.equal(short.durationHeight, 30);
    assert.equal(short.height, 44);
    assert.match(short.ariaLabel, /08:30 至 09:00，30 分钟，计划中/u);
});

test('loading a save repairs stale explicit role profiles from the current valid AI configuration', () => {
    const staleSlots = {
        low: {
            profileId: 'deleted-profile',
            contextSize: 32000,
            maxResponseLength: 4000,
        },
        medium: {
            profileId: 'deleted-profile',
            contextSize: 64000,
            maxResponseLength: 6000,
        },
        high: {
            profileId: 'deleted-profile',
            contextSize: 120000,
            maxResponseLength: 12000,
        },
    };
    const configuredSlots = {
        low: {
            profileId: 'current-profile',
        },
        medium: {
            profileId: 'current-profile',
        },
        high: {
            profileId: 'current-profile',
        },
    };
    const repair = repairLoadedModelSlots({
        loadedSlots: staleSlots,
        configuredSlots,
        profiles: [{
            id: 'current-profile',
        }, {
            id: 'hpmud-runtime-temporary',
        }],
        normalizeModelSlots,
    });
    assert.equal(repair.changed, true);
    assert.deepEqual(
        repair.repairedRoles,
        ['low', 'medium', 'high'],
    );
    assert.deepEqual(
        [
            repair.modelSlots.low.profileId,
            repair.modelSlots.medium.profileId,
            repair.modelSlots.high.profileId,
        ],
        [
            'current-profile',
            'current-profile',
            'current-profile',
        ],
    );
    assert.equal(
        repair.modelSlots.medium.contextSize,
        64000,
        'repair preserves the save-specific context policy',
    );
});

test('V2.2 view model keeps the day unselected, projects a week grid, and claims plans only by calendarEntryIds', () => {
    const state = createWorldState();
    const defaultView = buildCalendarViewModel(state, {
        selectedDate: '1991-09-03',
        getRoomName,
    });
    assert.equal(defaultView.preview, null);
    assert.equal(defaultView.selectedEntryId, '');
    assert.deepEqual(
        defaultView.entries.map(entry => entry.id),
        [
            'morning_class',
            'charms_exam',
            'charms_date',
            'cancelled_training',
        ],
        'plans remain sorted without auto-selecting an item',
    );
    assert.equal(defaultView.totalItems, 9);
    assert.equal(defaultView.weekDays.length, 7);
    assert.equal(defaultView.weekDays[0].date, '1991-09-02');
    assert.equal(defaultView.weekGrid.days.length, 7);
    assert.equal(defaultView.weekGrid.itemCount, 5);
    assert.match(defaultView.weekLabel, /9 月 2—8 日/u);
    assert.deepEqual(
        defaultView.dayGrid.items
            .filter(entry => entry.startClock === TARGET_CLOCK)
            .map(entry => [
                entry.id,
                entry.laneIndex,
                entry.laneCount,
            ]),
        [
            ['charms_date', 0, 2],
            ['charms_exam', 1, 2],
        ],
    );
    assert.equal(
        defaultView.dayGrid.items
            .find(entry => entry.id === 'charms_exam')
            .top,
        180,
    );

    const examView = buildCalendarViewModel(state, {
        selectedDate: '1991-09-03',
        selectedEntryId: 'charms_exam',
        getRoomName,
    });

    assert.equal(examView.preview.id, 'charms_exam');
    assert.equal(examView.preview.canEnter, true);
    assert.equal(examView.preview.durationLabel, '1 小时');
    assert.equal(examView.preview.scheduleKindLabel, '剧情');
    assert.equal(examView.preview.source.storylineId, STORYLINE_ID);
    assert.equal(examView.preview.source.beatId, BEAT_ID);
    assert.equal(examView.preview.source.progressLabel, '1 / 4 场景');
    assert.equal(
        examView.preview.location,
        '魔咒教室',
    );
    assert.equal(examView.storylines.length, 1);
    assert.equal(examView.storylines[0].beats[0].sceneProgress, 1);
    assert.equal(examView.storylines[0].beats[0].sceneTarget, 4);
    assert.equal(examView.storylines[0].beats[0].scheduleCount, 2);
    assert.ok(
        buildCalendarLocationOptions(state)
            .find(map => map.id === 'hogwarts_castle')
            .rooms.some(room => room.id === 'charms_classroom'),
    );
    assert.deepEqual(
        examView.preview.participants.map(person => person.name),
        [
            '哈利·波特',
            '赫敏·格兰杰',
        ],
    );

    const dateView = buildCalendarViewModel(state, {
        selectedEntryId: 'charms_date',
        getRoomName,
    });
    assert.equal(dateView.preview.id, 'charms_date');
    assert.equal(dateView.preview.location, '三把扫帚');
    const claimed = defaultView.scenes.find(
        scene => scene.id === 'archive_exam_one',
    );
    assert.deepEqual(
        claimed.linkedEntries.map(entry => [
            entry.id,
            entry.statusLabel,
        ]),
        [
            ['charms_exam', '计划中'],
            ['charms_date', '计划中'],
        ],
    );
    assert.deepEqual(
        defaultView.scenes.find(
            scene => scene.id === 'legacy_archive',
        ).linkedEntries,
        [],
        'an overlapping legacy scene must not infer a plan claim',
    );
    assert.deepEqual(
        defaultView.scenes.find(
            scene => scene.id === 'empty_claim_archive',
        ).linkedEntries,
        [],
        'an explicit empty claim field must not infer overlapping plans',
    );
    assert.deepEqual(
        defaultView.scenes.find(
            scene => scene.id === 'archive_four_states',
        ).linkedEntries.map(entry => entry.id),
        [
            'charms_exam',
            'charms_date',
            'cancelled_training',
            'stale_planned',
        ],
        'scene projection must preserve only explicit claim order',
    );
    assert.equal(
        state.calendar.entries.find(
            entry => entry.id === 'charms_exam',
        ).status,
        'planned',
        'view-model projection must not mutate Calendar authority',
    );
});

test('free opening validation accepts only non-past clocks and authoritative map-room pairs', () => {
    const state = createWorldState();
    assert.deepEqual(
        validateCalendarTimelineMoment(state, {
            date: '1991-09-03',
            time: '15:00',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
        }),
        {
            valid: true,
            error: '',
            startClock: '1991-09-03 · 15:00',
        },
    );
    assert.match(
        validateCalendarTimelineMoment(state, {
            date: '1991-09-03',
            time: '09:59',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
        }).error,
        /不得早于/u,
    );
    assert.match(
        validateCalendarTimelineMoment(state, {
            date: '1991-09-03',
            time: '15:00',
            mapId: 'hogwarts_castle',
            roomId: 'invented_room',
        }).error,
        /权威房间/u,
    );
});

test('only valid future planned entries can enter while terminal and past entries are read-only', () => {
    const state = createWorldState();
    state.calendar.entries.push(createEntry('active_club', {
        status: 'active',
        startClock: '1991-09-03 · 10:00',
        endClock: '1991-09-03 · 10:30',
    }));
    const day = buildCalendarViewModel(state, {
        selectedDate: '1991-09-03',
        getRoomName,
    });
    const byId = new Map(day.entries.map(entry => [entry.id, entry]));

    assert.deepEqual(
        [
            byId.get('charms_exam'),
            byId.get('active_club'),
            byId.get('morning_class'),
            byId.get('cancelled_training'),
        ].map(entry => entry.statusLabel),
        [
            '计划中',
            '进行中',
            '已完成时间段',
            '已取消',
        ],
    );
    assert.equal(byId.get('charms_exam').canEnter, true);
    assert.equal(byId.get('charms_date').canEnter, true);
    assert.equal(byId.get('morning_class').canEnter, false);
    assert.match(
        byId.get('morning_class').readOnlyReason,
        /完成状态不代表叙事结果/u,
    );
    assert.equal(byId.get('cancelled_training').canEnter, false);
    assert.match(
        byId.get('cancelled_training').readOnlyReason,
        /已经取消/u,
    );

    const past = buildCalendarViewModel(state, {
        selectedEntryId: 'stale_planned',
        getRoomName,
    });
    assert.equal(past.preview.canEnter, false);
    assert.match(
        past.preview.readOnlyReason,
        /时间已经过去|开始时间已经过去/u,
    );
});

test('scene projection reads exact plan claims without copying transcript body', () => {
    const state = createWorldState();
    state.calendar.entries.find(
        entry => entry.id === 'charms_exam',
    ).status = 'completed';
    state.calendar.entries.find(
        entry => entry.id === 'charms_date',
    ).status = 'active';

    const sceneView = buildCalendarViewModel(state, {
        selectedSceneId: 'archive_four_states',
        getRoomName,
    });
    assert.equal(sceneView.preview.kind, 'scene_archive');
    assert.equal(sceneView.preview.readOnly, true);
    assert.deepEqual(
        sceneView.preview.linkedEntries.map(entry => entry.id),
        [
            'charms_exam',
            'charms_date',
            'cancelled_training',
            'stale_planned',
        ],
    );
    assert.deepEqual(
        sceneView.preview.linkedEntries.map(entry => entry.statusLabel),
        [
            '已完成时间段',
            '进行中',
            '已取消',
            '计划中',
        ],
    );

    const timelineView = buildCalendarViewModel(state, {
        selectedSceneId: 'archive_exam_one',
        getRoomName,
    });
    assert.deepEqual(
        timelineView.preview.timelineEntries,
        [{
            clock: '1991-09-03 · 11:00',
            summaryEn:
                'The exam begins.',
            label:
                'The exam begins.',
            timeLabel: '11:00',
        }, {
            clock: '1991-09-03 · 11:20',
            summaryEn:
                'The first scene ends.',
            label:
                'The first scene ends.',
            timeLabel: '11:20',
        }],
    );
    assert.equal(
        Object.hasOwn(timelineView.preview, 'messageIds'),
        false,
    );
    assert.equal(
        Object.hasOwn(timelineView.preview, 'authorQuillEn'),
        false,
        'transcript and Author Quill body stay in sceneArchive',
    );

    const legacy = buildCalendarViewModel(state, {
        selectedSceneId: 'legacy_archive',
        getRoomName,
    });
    assert.equal(legacy.preview.id, 'legacy_archive');
    assert.deepEqual(legacy.preview.linkedEntries, []);
    assert.equal(legacy.preview.location, '礼堂');
    assert.equal(legacy.preview.statusLabel, '已封存 · 只读');
    const empty = buildCalendarViewModel(state, {
        selectedSceneId: 'empty_claim_archive',
        getRoomName,
    });
    assert.deepEqual(empty.preview.linkedEntries, []);
});

test('calendar keyboard helpers cover date grid, list navigation, and focus restoration', () => {
    assert.equal(
        resolveCalendarDateKey('1991-09-03', 'ArrowRight'),
        '1991-09-04',
    );
    assert.equal(
        resolveCalendarDateKey('1991-09-03', 'ArrowDown'),
        '1991-09-10',
    );
    assert.equal(
        resolveCalendarDateKey('1991-09-03', 'Home'),
        '1991-09-02',
    );
    assert.equal(
        resolveCalendarDateKey('1991-09-03', 'End'),
        '1991-09-08',
    );
    assert.equal(
        resolveCalendarDateKey('1991-03-31', 'PageUp'),
        '1991-02-28',
    );
    assert.equal(resolveCalendarListKey('ArrowDown', 2, 3), 0);
    assert.equal(resolveCalendarListKey('ArrowUp', 0, 3), 2);
    assert.equal(resolveCalendarListKey('Home', 2, 3), 0);
    assert.equal(resolveCalendarListKey('End', 0, 3), 2);

    let focused = 0;
    restoreCalendarFocus({
        focus() {
            focused += 1;
        },
    });
    assert.equal(focused, 1);
});

test('controller DOM flow previews each item, moves list focus, reads archives, enters, and restores focus', async () => {
    const state = createWorldState();
    const authorityBefore = JSON.stringify(state);
    const {
        documentRef,
        hostChat,
        nodes,
        refs,
        viewTabs,
    } = createControllerDom();
    nodes.hpmud_story.scrollTop = 46.5;
    hostChat.scrollTop = 45075;
    const calls = {
        archives: [],
        moments: [],
        timelines: [],
    };
    let momentFailure = null;
    const jobRegistry = {
        calendarMomentPhase:
            'idle',
    };
    const session = {
        calendarSelectedDate: '',
        calendarDisplayMonth: '',
        calendarSelectedEntryId: '',
        calendarSelectedSceneId: '',
        calendarSelectedStorylineId: '',
        calendarTimelineEpoch: '',
        calendarViewMode: 'agenda',
        calendarFreeStartTime: '',
        calendarFreeMapId: '',
        calendarFreeRoomId: '',
        calendarFreePanelOpen: false,
        calendarExpandedSceneIds: [],
        calendarMomentBusy: false,
        calendarMomentError: '',
        archiveTranscriptLimit: 8,
    };
    const controller = createCalendarController({
        refs,
        session,
        ARCHIVE_TRANSCRIPT_PAGE_SIZE: 8,
        getRoomName,
        getWorldState: () => state,
        jobRegistry,
        renderSceneArchiveTranscript(
            record,
            preserve,
            target,
            options,
        ) {
            calls.archives.push({
                id: record.id,
                preserve,
                target,
                options,
            });
            target.textContent = record.authorQuillEn;
        },
        async runCalendarMoment(entryId) {
            calls.moments.push(entryId);
            if (momentFailure) {
                throw momentFailure;
            }
        },
        async runTimelineMoment(options) {
            calls.timelines.push(options);
        },
    });
    refs.calendarDialog.addEventListener(
        'close',
        controller.handleCalendarDialogClose,
    );

    controller.openCalendar({
        entryId: 'charms_exam',
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(refs.calendarDialog.open, true);
    assert.equal(nodes.hpmud_story.scrollTop, 46.5);
    assert.equal(hostChat.scrollTop, 45075);
    session.calendarMomentBusy = true;
    jobRegistry.calendarMomentPhase =
        'opening';
    controller.renderCalendar();
    const loading =
        nodes.hpmud_calendar_preview
            .querySelector(
                '.hpmud-calendar-moment-loading',
            );
    assert.ok(loading);
    assert.match(
        loading.textContent,
        /生成新场景开场/u,
    );
    assert.match(
        loading.textContent,
        /通常约 1–2 分钟/u,
    );
    assert.equal(
        loading.getAttribute('role'),
        'status',
    );
    assert.equal(
        nodes.hpmud_calendar_preview
            .querySelector(
                '.hpmud-calendar-enter',
            )
            .disabled,
        true,
    );
    session.calendarMomentBusy = false;
    jobRegistry.calendarMomentPhase =
        'idle';
    controller.renderCalendar();

    controller.setCalendarView('storylines', {
        focus: true,
    });
    assert.equal(
        viewTabs.storylines.getAttribute('aria-selected'),
        'true',
    );
    assert.equal(documentRef.activeElement, viewTabs.storylines);
    const storylineButton = refs.calendarDialog.querySelector(
        `[data-calendar-storyline-id="${STORYLINE_ID}"]`,
    );
    storylineButton.click();
    assert.match(
        nodes.hpmud_calendar_preview.textContent,
        /Autumn Clues/u,
    );
    assert.match(
        nodes.hpmud_calendar_preview.textContent,
        /1 \/ 4 场景/u,
    );
    controller.setCalendarView('agenda');
    assert.match(
        nodes.hpmud_calendar_preview.textContent,
        /Charms Exam/u,
    );
    assert.doesNotMatch(
        nodes.hpmud_calendar_preview.textContent,
        /A Date During the Exam/u,
        'the compact detail must not repeat simultaneous plans',
    );

    const nextDateButton = refs.calendarDialog
        .querySelectorAll('[data-calendar-date]')
        .find(button =>
            button.dataset.calendarDate ===
                '1991-09-04');
    nextDateButton.click();
    assert.equal(
        documentRef.activeElement.dataset.calendarDate,
        '1991-09-04',
        'date selection keeps focus on its rerendered control',
    );
    assert.equal(nodes.hpmud_story.scrollTop, 46.5);
    assert.equal(hostChat.scrollTop, 45075);

    controller.openCalendar({
        entryId: 'charms_exam',
    });
    const weekScrollBefore = refs.calendarDialog.querySelector(
        '.hpmud-calendar-week-scroll',
    );
    weekScrollBefore.scrollTop = 187;
    weekScrollBefore.scrollLeft = 23;
    nodes.hpmud_calendar_preview.scrollTop = 91;
    const entryButton = refs.calendarDialog.querySelector(
        '[data-calendar-entry-id="charms_date"]',
    );
    entryButton.click();
    assert.match(
        nodes.hpmud_calendar_preview.textContent,
        /A Date During the Exam/u,
    );
    assert.equal(
        session.calendarSelectedEntryId,
        'charms_date',
    );
    assert.equal(
        documentRef.activeElement.dataset.calendarEntryId,
        'charms_date',
        'entry selection keeps focus on its rerendered option',
    );
    assert.equal(nodes.hpmud_story.scrollTop, 46.5);
    assert.equal(hostChat.scrollTop, 45075);
    const weekScrollAfter = refs.calendarDialog.querySelector(
        '.hpmud-calendar-week-scroll',
    );
    assert.equal(weekScrollAfter.scrollTop, 187);
    assert.equal(weekScrollAfter.scrollLeft, 23);
    assert.equal(nodes.hpmud_calendar_preview.scrollTop, 0);

    let listButtons = nodes.hpmud_calendar_plan_grid
        .querySelectorAll('[data-calendar-item]');
    assert.equal(
        listButtons.filter(button => button.tabIndex === 0).length,
        1,
        'the listbox exposes one Tab stop',
    );
    assert.equal(
        listButtons.find(button =>
            button.dataset.calendarEntryId === 'charms_date').tabIndex,
        0,
        'the selected option owns the initial Tab stop',
    );
    listButtons[0].focus();
    listButtons[0].dispatch('keydown', {
        key: 'ArrowDown',
    });
    assert.equal(documentRef.activeElement, listButtons[1]);
    assert.equal(listButtons[0].tabIndex, -1);
    assert.equal(listButtons[1].tabIndex, 0);
    assert.equal(
        listButtons.filter(button => button.tabIndex === 0).length,
        1,
        'arrow navigation moves rather than duplicates the Tab stop',
    );
    listButtons[1].click();
    listButtons = nodes.hpmud_calendar_plan_grid
        .querySelectorAll('[data-calendar-item]');
    const selectedOption = listButtons.find(button =>
        button.dataset.calendarItem ===
        session.calendarSelectedEntryId);
    assert.equal(selectedOption.getAttribute('aria-selected'), 'true');
    assert.equal(selectedOption.tabIndex, 0);
    assert.equal(documentRef.activeElement, selectedOption);
    assert.equal(nodes.hpmud_story.scrollTop, 46.5);
    assert.equal(hostChat.scrollTop, 45075);

    controller.openCalendar({
        archiveId: 'archive_exam_one',
    });
    assert.deepEqual(
        calls.archives.map(call => call.id),
        ['archive_exam_one'],
    );
    assert.equal(calls.archives[0].preserve, false);
    assert.deepEqual(calls.archives[0].options, {
        readOnly: true,
    });
    assert.equal(
        calls.archives[0].target.textContent,
        'Archive body one.',
    );
    assert.match(
        nodes.hpmud_calendar_preview.textContent,
        /时间线 · 2 条/u,
    );
    assert.match(
        nodes.hpmud_calendar_preview.textContent,
        /The exam begins\./u,
    );
    assert.ok(
        nodes.hpmud_calendar_preview.querySelector(
            '.hpmud-calendar-scene-detail-summary',
        ),
        'Scene prose uses a detail-only class instead of the scene-card grid class',
    );
    assert.equal(
        nodes.hpmud_calendar_preview
            .querySelector('.hpmud-calendar-enter'),
        null,
        'read-only Scene preview has no enter action',
    );
    assert.equal(nodes.hpmud_story.scrollTop, 46.5);
    assert.equal(hostChat.scrollTop, 45075);
    assert.equal(
        JSON.stringify(state),
        authorityBefore,
        'view switching and preview selection must not write authority',
    );

    let sceneButton = nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-id="archive_exam_one"]');
    assert.equal(sceneButton.getAttribute('aria-expanded'), 'false');
    const controlledRegionId = sceneButton.getAttribute('aria-controls');
    assert.ok(controlledRegionId);
    assert.equal(
        nodes.hpmud_calendar_scene_list
            .querySelector(`#${controlledRegionId}`).hidden,
        true,
    );
    sceneButton.click();
    sceneButton = nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-id="archive_exam_one"]');
    assert.equal(sceneButton.getAttribute('aria-expanded'), 'true');
    assert.equal(
        nodes.hpmud_calendar_scene_list
            .querySelector(`#${controlledRegionId}`).hidden,
        false,
    );
    const claimedCard = nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-card="archive_exam_one"]');
    assert.match(claimedCard.textContent, /Charms Exam计划中/u);
    assert.match(claimedCard.textContent, /A Date During the Exam计划中/u);

    nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-id="legacy_archive"]')
        .click();
    const legacyCard = nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-card="legacy_archive"]');
    assert.match(legacyCard.textContent, /未关联计划/u);
    assert.doesNotMatch(legacyCard.textContent, /Charms Exam/u);
    nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-id="empty_claim_archive"]')
        .click();
    const emptyClaimCard = nodes.hpmud_calendar_scene_list
        .querySelector('[data-calendar-scene-card="empty_claim_archive"]');
    assert.match(emptyClaimCard.textContent, /未关联计划/u);
    assert.doesNotMatch(emptyClaimCard.textContent, /Charms Exam/u);
    assert.doesNotMatch(
        nodes.hpmud_calendar_items.textContent,
        /\bScene\b|attendance|去了|没去/u,
    );
    assert.doesNotMatch(
        nodes.hpmud_calendar_preview.textContent,
        /开始时刻的全部安排|自由开场|认领计划/u,
        'the compact detail must keep removed overview modules out',
    );

    let escapePrevented = false;
    let escapeStopped = false;
    controller.handleCalendarKeyDown({
        key: 'Escape',
        preventDefault() {
            escapePrevented = true;
        },
        stopPropagation() {
            escapeStopped = true;
        },
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(escapePrevented, true);
    assert.equal(escapeStopped, true);
    assert.equal(refs.calendarDialog.open, false);
    assert.equal(documentRef.activeElement, nodes.hpmud_calendar);
    assert.equal(nodes.hpmud_story.scrollTop, 46.5);
    assert.equal(hostChat.scrollTop, 45075);

    controller.openCalendar({
        entryId: 'charms_exam',
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    nodes.hpmud_calendar_preview
        .querySelector('.hpmud-calendar-enter')
        .click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(calls.moments, ['charms_exam']);
    assert.equal(refs.calendarDialog.open, false);
    assert.equal(
        documentRef.activeElement,
        nodes.hpmud_calendar,
        'closing restores focus to the Calendar entry',
    );

    momentFailure =
        new Error(
            '职责绑定的 Connection Profile 不存在。',
        );
    controller.openCalendar({
        entryId: 'charms_exam',
    });
    nodes.hpmud_calendar_preview
        .querySelector('.hpmud-calendar-enter')
        .click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(refs.calendarDialog.open, true);
    assert.match(
        nodes.hpmud_calendar_preview
            .querySelector(
                '.hpmud-calendar-action-feedback',
            )
            .textContent,
        /无法打开该场景/u,
    );
    assert.equal(
        nodes.hpmud_calendar_status.getAttribute('role'),
        'alert',
    );
    momentFailure = null;

    controller.openCalendar();
    const currentDateButton = refs.calendarDialog
        .querySelectorAll('[data-calendar-date]')
        .find(button =>
            button.dataset.calendarDate === '1991-09-03');
    currentDateButton.click();
    assert.equal(
        nodes.hpmud_calendar_preview.querySelector(
            '.hpmud-calendar-free-form',
        ),
        null,
    );
    nodes.hpmud_calendar_free_toggle.click();
    let freeForm = nodes.hpmud_calendar_free_panel
        .querySelector('.hpmud-calendar-free-form');
    assert.ok(freeForm);
    assert.equal(
        nodes.hpmud_calendar_free_toggle.getAttribute('aria-expanded'),
        'true',
    );
    assert.equal(
        nodes.hpmud_calendar_free_toggle.getAttribute('aria-controls'),
        'hpmud_calendar_free_panel',
    );
    assert.equal(
        nodes.hpmud_calendar_preview.querySelector(
            '.hpmud-calendar-free-form',
        ),
        null,
    );
    controller.handleCalendarKeyDown({
        key: 'Escape',
        preventDefault() {},
        stopPropagation() {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(refs.calendarDialog.open, true);
    assert.equal(nodes.hpmud_calendar_free_panel.hidden, true);
    assert.equal(
        nodes.hpmud_calendar_free_toggle.getAttribute('aria-expanded'),
        'false',
    );
    assert.equal(
        documentRef.activeElement,
        nodes.hpmud_calendar_free_toggle,
    );
    nodes.hpmud_calendar_free_toggle.click();
    freeForm = nodes.hpmud_calendar_free_panel
        .querySelector('.hpmud-calendar-free-form');
    const timeInput = freeForm.querySelectorAll('input')[1];
    timeInput.value = '15:00';
    timeInput.dispatch('change');
    freeForm.dispatch('submit');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(calls.timelines, [{
        startClock: '1991-09-03 · 15:00',
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    }]);
    assert.equal(refs.calendarDialog.open, false);
});

test('controller invalidates date, month, entry, and Scene selection when timeline epoch changes', async () => {
    let state = createWorldState();
    const {
        nodes,
        refs,
    } = createControllerDom();
    const session = {
        calendarSelectedDate: '',
        calendarDisplayMonth: '',
        calendarSelectedEntryId: '',
        calendarSelectedSceneId: '',
        calendarSelectedStorylineId: '',
        calendarTimelineEpoch: '',
        calendarViewMode: 'agenda',
        calendarFreeStartTime: '',
        calendarFreeMapId: '',
        calendarFreeRoomId: '',
        calendarFreePanelOpen: false,
        calendarExpandedSceneIds: [],
        calendarMomentBusy: false,
        calendarMomentError: '',
        archiveTranscriptLimit: 8,
    };
    const controller = createCalendarController({
        refs,
        session,
        getRoomName,
        getWorldState: () => state,
        renderSceneArchiveTranscript() {},
        async runCalendarMoment() {},
        async runTimelineMoment() {},
    });

    controller.openCalendar({
        entryId: 'charms_exam',
    });
    controller.closeCalendar();
    Object.assign(session, {
        calendarSelectedDate: '1991-09-01',
        calendarDisplayMonth: '1991-09-01',
        calendarSelectedEntryId: 'charms_exam',
        calendarSelectedSceneId: 'legacy_archive',
        calendarSelectedStorylineId: STORYLINE_ID,
    });
    const nextClock = '1991-10-05 · 09:00';
    state = {
        ...createWorldState(),
        timelineEpoch: 'calendar_ui_timeline_two',
        clock: nextClock,
        calendar: {
            version: 3,
            storylines: [],
            storyBeats: [],
            entries: [
                createEntry('new_timeline_class', {
                    titleEn:
                        'New Timeline Class',
                    startClock: '1991-10-05 · 10:00',
                    endClock: '1991-10-05 · 11:00',
                    createdClock: nextClock,
                    updatedClock: nextClock,
                }),
            ],
            horizon: '1991-10-19 · 09:00',
        },
        sceneArchive: [],
    };

    controller.openCalendar();
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(session.calendarTimelineEpoch, 'calendar_ui_timeline_two');
    assert.equal(session.calendarSelectedDate, '1991-10-05');
    assert.equal(session.calendarDisplayMonth, '1991-10-05');
    assert.equal(session.calendarSelectedEntryId, '');
    assert.equal(session.calendarSelectedSceneId, '');
    assert.equal(session.calendarSelectedStorylineId, '');
    const firstOption = nodes.hpmud_calendar_items.querySelector(
        '[data-calendar-entry-id="new_timeline_class"]',
    );
    assert.equal(firstOption.getAttribute('aria-selected'), 'false');
    assert.equal(firstOption.tabIndex, 0);
    assert.equal(
        nodes.hpmud_calendar_preview.querySelector(
            '.hpmud-calendar-enter',
        ),
        null,
        'ordinary open leaves the day overview unselected',
    );
    assert.equal(
        nodes.hpmud_calendar_preview.querySelector(
            '.hpmud-calendar-free-form',
        ),
        null,
    );
    assert.equal(
        nodes.hpmud_calendar_free_panel.querySelector(
            '.hpmud-calendar-free-form',
        ),
        null,
    );
});

test('Calendar panel keeps the date index modal outside the week, scene, and detail reading order', async () => {
    const panelSource = await readFile(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/panel.html',
            import.meta.url,
        ),
        'utf8',
    );
    const $ = load(panelSource);
    const trigger = $('#hpmud_calendar');
    const dialog = $('#hpmud_calendar_dialog');

    assert.equal(trigger.length, 1);
    assert.equal(
        trigger.parent().hasClass('hpmud-top-actions'),
        true,
    );
    assert.equal(
        trigger.siblings('#hpmud_relationship_graph').length,
        1,
    );
    assert.equal(trigger.attr('aria-haspopup'), 'dialog');
    assert.equal(trigger.attr('aria-controls'), 'hpmud_calendar_dialog');
    assert.equal(dialog.prop('tagName'), 'DIALOG');
    assert.equal(dialog.attr('aria-labelledby'), 'hpmud_calendar_title');
    assert.equal(
        dialog.attr('aria-describedby'),
        'hpmud_calendar_description',
    );
    const layoutChildren = dialog.find('.hpmud-calendar-layout').children();
    assert.equal(layoutChildren.length, 2);
    assert.equal(layoutChildren.eq(0).hasClass('hpmud-calendar-day'), true);
    assert.equal(layoutChildren.eq(1).hasClass('hpmud-calendar-preview'), true);
    assert.equal(
        dialog.find('#hpmud_calendar_date_modal')
            .closest('.hpmud-calendar-week-title-row').length,
        1,
    );
    assert.equal(
        dialog.find('#hpmud_calendar_date_modal').attr('role'),
        'dialog',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_date_modal').attr('aria-modal'),
        'false',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_date_modal_open')
            .attr('aria-controls'),
        'hpmud_calendar_date_modal',
    );
    assert.equal(dialog.find('.hpmud-calendar-plans').length, 1);
    assert.equal(dialog.find('.hpmud-calendar-scenes').length, 1);
    assert.equal(
        dialog.find('#hpmud_calendar_scene_list').attr('role'),
        'list',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_storylines').attr('role'),
        'listbox',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_free_toggle')
            .closest('.hpmud-calendar-scenes').length,
        1,
    );
    assert.equal(
        dialog.find('#hpmud_calendar_free_panel')
            .closest('.hpmud-calendar-scenes').length,
        1,
    );
    assert.equal(
        dialog.find('#hpmud_calendar_preview .hpmud-calendar-free-form')
            .length,
        0,
    );
    assert.equal(
        dialog.find('[data-calendar-view]').length,
        2,
    );
    assert.equal(
        dialog.find('[data-calendar-view="agenda"]').attr('role'),
        'tab',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_preview').attr('aria-live'),
        'polite',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_status').attr('aria-live'),
        'polite',
    );
    assert.equal(
        dialog.find('#hpmud_calendar_close').attr('aria-label'),
        '关闭日历',
    );
    assert.doesNotMatch(
        dialog.text(),
        /\bScene\b|attendance|去了|没去/u,
    );
});

test('controller uses action and archive ports without writing authority or scrolling story', async () => {
    const [
        controllerSource,
        storySource,
        messageSource,
        bindingsSource,
    ] = await Promise.all([
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/calendar-controller.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/story-renderer.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/message-renderer.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/bindings.js',
                import.meta.url,
            ),
            'utf8',
        ),
    ]);
    const enterSource = controllerSource.slice(
        controllerSource.indexOf('async function enterCalendarMoment'),
        controllerSource.indexOf('function createEntryAction'),
    );
    const scenePreviewSource = controllerSource.slice(
        controllerSource.indexOf('function renderScenePreview'),
        controllerSource.indexOf('function renderPreview'),
    );
    const oldArchiveEntry = storySource.slice(
        storySource.indexOf('function openSceneArchive'),
        storySource.indexOf('function updateSceneDestinationStatus'),
    );

    assert.match(enterSource, /runCalendarMoment\(entry\.id\)/u);
    assert.match(
        controllerSource,
        /runTimelineMoment\(\{[\s\S]*?startClock:[\s\S]*?mapId:[\s\S]*?roomId:/u,
    );
    assert.doesNotMatch(
        controllerSource,
        /chatMetadata|saveMetadata|sendRoleRequest|scrollIntoView/u,
    );
    assert.match(
        controllerSource,
        /documentRef\.querySelector\?\.\('#chat'\)/u,
    );
    assert.match(
        controllerSource,
        /restoreBackgroundScroll/u,
    );
    assert.match(
        controllerSource,
        /hpmud-calendar-localization-retry/u,
    );
    assert.match(
        controllerSource,
        /requestFieldRetranslation\([\s\S]*?errorFields/u,
    );
    assert.match(
        controllerSource,
        /translation\.status\.partial_error/u,
    );
    assert.match(scenePreviewSource, /readSceneArchiveRecord\(state, scene\.id\)/u);
    assert.match(
        scenePreviewSource,
        /renderSceneArchiveTranscript\([\s\S]*?record,[\s\S]*?false,[\s\S]*?transcript,[\s\S]*?readOnly: true/u,
    );
    assert.match(
        storySource,
        /renderMessage\([\s\S]*?message,[\s\S]*?messageId,[\s\S]*?readOnly/u,
    );
    assert.match(
        messageSource,
        /menu\.append\(retranslate\)/u,
    );
    assert.match(
        bindingsSource,
        /calendarDialog,[\s\S]*?'keydown',[\s\S]*?handleCalendarKeyDown,[\s\S]*?true/u,
    );
    assert.match(oldArchiveEntry, /openCalendar\(\{\s*archiveId: scene\.id/u);
    assert.doesNotMatch(oldArchiveEntry, /showModal|saveMetadata/u);
    assert.doesNotMatch(
        controllerSource,
        /冲突二选一|只能选择一项|自动取消|自动结算其他/u,
    );
    assert.doesNotMatch(
        controllerSource,
        /共同进入新 Scene/u,
    );
    assert.doesNotMatch(
        controllerSource,
        /function createMomentEntries|function createRelatedScenes|function createLinkedEntries/u,
    );
    assert.doesNotMatch(
        scenePreviewSource,
        /linkedEntries|calendar-related/u,
    );
});

test('Calendar styles enforce desktop split, compact breakpoints, targets, focus, and reduced motion', async () => {
    const styleSource = await readFile(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/style.css',
            import.meta.url,
        ),
        'utf8',
    );
    const calendarStyles = styleSource.slice(
        styleSource.indexOf('/* Calendar:'),
    );

    assert.match(
        calendarStyles,
        /Calendar V2\.1:[\s\S]*?\.hpmud-calendar-layout \{[\s\S]*?clamp\(358px, 25vw, 390px\)[\s\S]*?minmax\(0, 1fr\)[\s\S]*?clamp\(280px, 22vw, 350px\)/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-date \{[\s\S]*?min-width: 44px[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-enter \{[\s\S]*?min-height: 48px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-view-tabs > button \{[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-free-form input,[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-free-submit \{[\s\S]*?min-height: 48px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-plan-card \{[\s\S]*?position: absolute[\s\S]*?top: calc\(var\(--calendar-grid-top\) \* 1px\)[\s\S]*?var\(--calendar-lane-count\)[\s\S]*?height: max\([\s\S]*?44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-scene-summary \{[\s\S]*?min-height: 56px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-scene-plan \{[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /#hpmud_calendar_free_toggle \{[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-transcript \.hpmud-message-translation > summary,[\s\S]*?min-width: 44px[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-transcript \.hpmud-message-translation-menu button \{[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-transcript > \.hpmud-load-earlier \{[\s\S]*?min-width: 44px[\s\S]*?min-height: 44px/u,
    );
    assert.match(
        calendarStyles,
        /Calendar V2\.1:[\s\S]*?@media \(max-width: 820px\)[\s\S]*?\.hpmud-calendar-layout[\s\S]*?minmax\(300px, \.78fr\)[\s\S]*?minmax\(0, 1\.22fr\)/u,
    );
    assert.match(
        calendarStyles,
        /@media \(max-width: 560px\)[\s\S]*?\.hpmud-calendar-month-grid[\s\S]*?display: none[\s\S]*?\.hpmud-calendar-date-strip[\s\S]*?display: grid[\s\S]*?repeat\(7, minmax\(44px, 1fr\)\)/u,
    );
    assert.match(
        calendarStyles,
        /Calendar V2\.1:[\s\S]*?@media \(max-width: 390px\)[\s\S]*?\.hpmud-calendar-day-sections,[\s\S]*?max-width: 100%[\s\S]*?overflow-x: hidden/u,
    );
    assert.match(
        calendarStyles,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hpmud-calendar-dialog[\s\S]*?animation: none !important[\s\S]*?transition: none !important/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-app button:focus-visible[\s\S]*?outline: 2px solid var\(--hp-gold\)/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-plan-card:focus-visible,[\s\S]*?#hpmud_calendar_free_toggle:focus-visible[\s\S]*?outline: 2px solid var\(--hp-gold\)/u,
    );
    assert.match(
        calendarStyles,
        /Calendar V2\.2:[\s\S]*?\.hpmud-calendar-date-modal \{[\s\S]*?top: calc\(100% \+ 8px\)[\s\S]*?width: min\(390px/u,
    );
    assert.match(
        calendarStyles,
        /Calendar V2\.2:[\s\S]*?\.hpmud-calendar-day-sections \{[\s\S]*?grid-template-rows:[\s\S]*?clamp\(330px, 52vh, 520px\)[\s\S]*?auto/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-scene-list \{[\s\S]*?grid-auto-rows: max-content[\s\S]*?align-content: start[\s\S]*?overflow: visible/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-preview-header,[\s\S]*?width: min\(100%, 760px\)[\s\S]*?max-width: 760px/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-moment-loading \{[\s\S]*?box-shadow/u,
    );
    assert.match(
        calendarStyles,
        /\.hpmud-calendar-loading-steps \{[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/u,
    );
    assert.match(
        calendarStyles,
        /@keyframes hpmud-calendar-loading-spin/u,
    );
});
