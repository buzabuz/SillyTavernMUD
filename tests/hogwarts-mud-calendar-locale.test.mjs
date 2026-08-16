/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildCalendarViewModel,
    validateCalendarTimelineMoment,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-view-model.js';

function createState() {
    return {
        timelineEpoch:
            'calendar_locale_timeline',
        clock:
            '1991-09-03 · 10:00',
        calendar: {
            version: 3,
            storylines: [],
            storyBeats: [],
            entries: [{
                id: 'charms_class',
                parentId: '',
                entryType: 'event',
                titleEn:
                    'Charms Class',
                summaryEn:
                    'Practice the levitation charm.',
                tags: ['class'],
                startClock:
                    '1991-09-03 · 11:00',
                endClock:
                    '1991-09-03 · 12:00',
                participantIds: [
                    'canon_harry_james_potter',
                ],
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
                status: 'planned',
                planningTier:
                    'medium',
                relatedSceneIds: [],
                sourceBeatId: '',
                beatSlot: null,
                scheduleKind:
                    'class',
                createdClock:
                    '1991-09-03 · 10:00',
                updatedClock:
                    '1991-09-03 · 10:00',
            }],
            horizon:
                '1991-09-17 · 10:00',
        },
        actorLibrary: [{
            id: 'canon_harry_james_potter',
            nameEn:
                'Harry Potter',
        }],
        actors: [],
        map: {
            generatedLocalNodes: [],
            customLocalMaps: [],
        },
        sceneArchive: [],
    };
}

test('Calendar ViewModel projects English static chrome without changing authority IDs', () => {
    const view =
        buildCalendarViewModel(
            createState(),
            {
                selectedDate:
                    '1991-09-03',
                displayLocale: 'en',
                getRoomName:
                    () =>
                        'Charms Classroom',
            },
        );
    const entry =
        view.entries[0];

    assert.equal(
        entry.id,
        'charms_class',
    );
    assert.equal(
        entry.statusLabel,
        'Planned',
    );
    assert.equal(
        entry.scheduleKindLabel,
        'Class',
    );
    assert.equal(
        entry.planningTierLabel,
        'Medium-tier plan',
    );
    assert.equal(
        entry.durationLabel,
        '1 hr',
    );
    assert.equal(
        /[\u3400-\u9fff]/u.test(
            [
                view.monthLabel,
                view.selectedDateLabel,
                view.weekLabel,
                view.weekDays[0]
                    .weekdayLabel,
                view.weekGrid.days[0]
                    .grid.items[0]
                    ?.ariaLabel ||
                    '',
            ].join(' '),
        ),
        false,
    );
    assert.equal(
        validateCalendarTimelineMoment(
            createState(),
            {
                date: '',
                displayLocale:
                    'en',
            },
        ).error,
        'Select a valid date first.',
    );
});

test('Calendar ViewModel keeps zh-CN as the default display locale', () => {
    const view =
        buildCalendarViewModel(
            createState(),
            {
                selectedDate:
                    '1991-09-03',
                getRoomName:
                    () => '魔咒教室',
            },
        );

    assert.equal(
        view.entries[0]
            .statusLabel,
        '计划中',
    );
    assert.equal(
        view.entries[0]
            .durationLabel,
        '1 小时',
    );
    assert.match(
        view.selectedDateLabel,
        /1991 年 9 月 3 日/u,
    );
});
