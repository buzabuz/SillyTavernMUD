/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    limitMessagesToContext,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    CALENDAR_ENTRY_FIELDS,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-schema.js';
import {
    projectCalendarByDate,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-projection.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    createDirectorWorkflows,
} from '../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createMediumCalendarDirectorPrompt,
    createMediumCalendarDirectorWorkflow,
    detectExplicitCalendarCommitment,
    evaluateMediumCalendarTriggers,
    projectMediumCalendarDirectorContext,
    validateMediumCalendarDirectorProposal,
} from '../public/scripts/extensions/hogwarts-mud/workflows/medium-calendar-director.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createTurnPerformanceWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';

const CURRENT_CLOCK =
    '1991-09-03 · 10:30';
const HARRY_ID =
    'canon_harry_james_potter';
const HERMIONE_ID =
    'canon_hermione_jean_granger';

function createEntry(
    id,
    patch = {},
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        title:
            `公开安排 ${id}`,
        titleEn:
            `Public schedule ${id}`,
        summary:
            `${id} 的玩家可见摘要。`,
        summaryEn:
            `Player-visible summary for ${id}.`,
        tags: [],
        startClock:
            '1991-09-05 · 10:00',
        endClock:
            '1991-09-05 · 11:00',
        participantIds: [
            HARRY_ID,
        ],
        mapId:
            'hogwarts_castle',
        roomId:
            'charms_classroom',
        status: 'planned',
        planningTier:
            'medium',
        relatedSceneIds: [],
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        sourceBeatId: '',
        beatSlot: null,
        scheduleKind:
            'personal',
        ...patch,
    };
}

function createOverlapEntries() {
    return [
        createEntry(
            'charms_exam',
            {
                title:
                    '魔咒考试',
                titleEn:
                    'Charms Exam',
                tags: [
                    'exam',
                    'canon',
                ],
                startClock:
                    CURRENT_CLOCK,
                endClock:
                    '1991-09-03 · 12:00',
                participantIds: [
                    HARRY_ID,
                ],
                planningTier:
                    'high',
                sourceBeatId:
                    'first_term_exam_beat',
                beatSlot: 1,
                scheduleKind:
                    'story',
            },
        ),
        createEntry(
            'hogsmeade_date',
            {
                title:
                    '霍格莫德约会',
                titleEn:
                    'Hogsmeade Date',
                tags: [
                    'date',
                ],
                startClock:
                    CURRENT_CLOCK,
                endClock:
                    '1991-09-03 · 12:00',
                participantIds: [
                    HERMIONE_ID,
                ],
                mapId:
                    'hogsmeade',
                roomId:
                    'three_broomsticks',
            },
        ),
    ];
}

function createState(
    entries = [],
    patch = {},
) {
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'timeline_medium_calendar',
        stateRevision: 8,
        revisionHistory: [],
        phase: 'playing',
        clock: CURRENT_CLOCK,
        calendar: {
            version: 2,
            storylines: [{
                id:
                    'first_year_trials',
                title:
                    '一年级的考验',
                titleEn:
                    'First-Year Trials',
                summary:
                    '公开的一年级成长线。',
                summaryEn:
                    'A public first-year growth storyline.',
                tags: [
                    'school',
                ],
                startClock:
                    '1991-09-01 · 00:00',
                endClock:
                    '1992-06-30 · 23:59',
                participantIds: [
                    HARRY_ID,
                ],
                status: 'active',
                createdClock:
                    '1991-09-01 · 00:00',
                updatedClock:
                    CURRENT_CLOCK,
            }],
            storyBeats: [{
                id:
                    'first_term_exam_beat',
                storylineId:
                    'first_year_trials',
                title:
                    '第一次考试',
                titleEn:
                    'The First Exam',
                summary:
                    '公开的考试节奏。',
                summaryEn:
                    'A public examination beat.',
                tags: [
                    'exam',
                ],
                termKey:
                    'year_1_term_1',
                sequence: 1,
                windowStartClock:
                    '1991-09-01 · 00:00',
                windowEndClock:
                    '1991-12-31 · 23:59',
                sceneTarget: 4,
                status:
                    'deferred',
                relatedSceneIds: [],
                createdClock:
                    '1991-09-01 · 00:00',
                updatedClock:
                    CURRENT_CLOCK,
            }],
            entries,
            horizon:
                CURRENT_CLOCK,
        },
        modelSlots: {},
        dailyDirector: {
            date: '',
            status: 'idle',
            plan: null,
        },
        actorLibrary: [{
            id: HARRY_ID,
            name:
                '哈利·波特',
            nameEn:
                'Harry Potter',
            role:
                '学生',
            roleEn:
                'Student',
            identity:
                normalizeNpcIdentity(),
        }, {
            id: HERMIONE_ID,
            name:
                '赫敏·格兰杰',
            nameEn:
                'Hermione Granger',
            role:
                '学生',
            roleEn:
                'Student',
            identity:
                normalizeNpcIdentity(),
        }],
        actors: [{
            id: HARRY_ID,
            present: true,
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            currentActivityEn:
                'Writing an exam.',
            currentIntentEn:
                'Finish the exam.',
        }, {
            id: HERMIONE_ID,
            present: false,
            mapId:
                'hogsmeade',
            roomId:
                'three_broomsticks',
            currentActivityEn:
                'Waiting for a meeting.',
            currentIntentEn:
                'Keep an appointment.',
        }],
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
            customLocalMaps: [{
                id:
                    'hogwarts_castle',
                nodes: [{
                    id:
                        'charms_classroom',
                    nameEn:
                        'Charms Classroom',
                }, {
                    id:
                        'training_pitch',
                    nameEn:
                        'Training Pitch',
                }],
            }, {
                id: 'hogsmeade',
                nodes: [{
                    id:
                        'three_broomsticks',
                    nameEn:
                        'Three Broomsticks',
                }],
            }],
            generatedLocalNodes: [],
            roomStates: {},
        },
        sceneArchive: [],
        scene: {
            id: 'charms_scene',
            name:
                '魔咒课教室',
            nameEn:
                'Charms Classroom',
            summary:
                '考试正在进行。',
            summaryEn:
                'An exam is underway.',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            startedClock:
                CURRENT_CLOCK,
            startedMessageId: 0,
            timelineEntries: [],
            calendarEntryIds: [
                'charms_exam',
            ],
            nextSceneIntent: {
                tier: 'medium',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'training_pitch',
            },
        },
        location:
            'Charms Classroom',
        storyArcs: [],
        clues: [],
        items: [],
        actorPresentations: {},
        ...patch,
    };
}

function createProposal(
    state,
    entries,
) {
    return {
        baseTimelineEpoch:
            state.timelineEpoch,
        baseStateRevision:
            state.stateRevision,
        entries,
    };
}

function createBeatSchedules(
    beatId =
    'first_term_exam_beat',
) {
    return [
        '1991-09-05 · 14:00',
        '1991-09-08 · 16:00',
        '1991-09-11 · 18:00',
        '1991-09-15 · 19:00',
    ].map(
        (startClock, index) =>
            createEntry(
                `${beatId}_slot_${index + 1}`,
                {
                    tags: [
                        'story',
                        'exam',
                    ],
                    startClock,
                    endClock:
                        startClock.replace(
                            /:\d{2}$/u,
                            ':45',
                        ),
                    sourceBeatId:
                        beatId,
                    beatSlot:
                        index + 1,
                    scheduleKind:
                        'story',
                },
            ),
    );
}

function createReadableDaySchedules() {
    return [{
        tag: 'breakfast',
        start: '07:30',
        end: '08:00',
        kind: 'routine',
    }, {
        tag: 'class',
        start: '09:00',
        end: '10:30',
        kind: 'class',
    }, {
        tag: 'lunch',
        start: '12:00',
        end: '12:45',
        kind: 'routine',
    }, {
        tag: 'training',
        start: '15:00',
        end: '16:00',
        kind: 'personal',
    }, {
        tag: 'meeting',
        start: '17:00',
        end: '17:45',
        kind: 'social',
    }, {
        tag: 'dinner',
        start: '18:30',
        end: '19:15',
        kind: 'routine',
    }, {
        tag: 'date',
        start: '20:00',
        end: '21:00',
        kind: 'social',
    }].map(item =>
        createEntry(
            `daily_${item.tag}`,
            {
                tags: [
                    item.tag,
                ],
                startClock:
                    `1991-09-04 · ${item.start}`,
                endClock:
                    `1991-09-04 · ${item.end}`,
                scheduleKind:
                    item.kind,
            },
        ));
}

function createPlanningHarness(
    state,
    responses,
    {
        saveResult = null,
    } = {},
) {
    const calls = {
        prompts: [],
        transactions: [],
    };
    const context = {
        chat: [{
            is_user: true,
            mes:
                '我答应你周末和你见面。',
        }],
        chatMetadata: {
            hogwartsMud:
                state,
        },
    };
    const jobRegistry = {};
    const workflow =
        createMediumCalendarDirectorWorkflow({
            buildMapAuthorityContext:
                () => ({
                    maps: [{
                        id:
                            'hogwarts_castle',
                        rooms: [
                            'charms_classroom',
                            'training_pitch',
                        ],
                    }, {
                        id:
                            'hogsmeade',
                        rooms: [
                            'three_broomsticks',
                        ],
                    }],
                }),
            extractRoleResponseText:
                response =>
                    response.content,
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            async guardedSaveTransaction(
                options,
            ) {
                calls.transactions
                    .push(options);
                if (saveResult) {
                    return saveResult;
                }
                const committed = {
                    ...options.nextState,
                    stateRevision:
                        options
                            .currentState
                            .stateRevision +
                        1,
                };
                context.chatMetadata
                    .hogwartsMud =
                    committed;
                return {
                    ok: true,
                    state: committed,
                };
            },
            jobRegistry,
            parseJsonObject:
                value =>
                    JSON.parse(value),
            resolveRoleSlots:
                () => ({
                    medium: {
                        profileId:
                            'medium_profile',
                    },
                }),
            async sendRoleRequest(
                roleSlot,
                prompt,
            ) {
                calls.prompts.push({
                    roleSlot,
                    prompt,
                });
                const response =
                    responses.shift();
                return {
                    content:
                        typeof response ===
                            'string'
                            ? response
                            : JSON.stringify(
                                response,
                            ),
                };
            },
        });
    return {
        calls,
        context,
        workflow,
    };
}

function createOrdinaryTagEntries() {
    const tags = [
        'quidditch',
        'date',
        'exam',
        'class',
        'training',
        'meeting',
        'canon',
    ];
    return tags.map(
        (tag, index) =>
            createEntry(
                `${tag}_schedule`,
                {
                    tags: [
                        tag,
                    ],
                    startClock:
                        `1991-09-${
                            String(
                                4 + index,
                            ).padStart(
                                2,
                                '0',
                            )
                        } · 10:00`,
                    endClock:
                        `1991-09-${
                            String(
                                4 + index,
                            ).padStart(
                                2,
                                '0',
                            )
                        } · 11:00`,
                    roomId:
                        index % 2
                            ? 'training_pitch'
                            : 'charms_classroom',
                },
            ),
    );
}

test('Medium trigger detection covers horizon, day rollover, successful high planning and conservative explicit commitments', () => {
    const adequate =
        createState(
            [],
            {
                calendar: {
                    version: 1,
                    entries: [],
                    horizon:
                        '1991-09-17 · 10:30',
                },
            },
        );
    assert.deepEqual(
        evaluateMediumCalendarTriggers(
            adequate,
        ),
        {
            shouldRun: false,
            reasons: [],
            explicitCommitment: '',
        },
    );
    assert.deepEqual(
        evaluateMediumCalendarTriggers(
            createState(),
        ).reasons,
        [
            'horizon_insufficient',
        ],
    );
    assert.deepEqual(
        evaluateMediumCalendarTriggers(
            createState(),
            {
                highPlanningResult: {
                    status: 'failed',
                },
                force: true,
                playerAction:
                    '我答应你周末和你约会。',
            },
        ),
        {
            shouldRun: false,
            reasons: [],
            explicitCommitment: '',
        },
        'a failed High Calendar run blocks every Medium fallback trigger',
    );
    assert.deepEqual(
        evaluateMediumCalendarTriggers(
            adequate,
            {
                previousClock:
                    '1991-09-02 · 23:59',
            },
        ).reasons,
        [
            'day_changed',
        ],
    );
    assert.deepEqual(
        evaluateMediumCalendarTriggers(
            adequate,
            {
                highPlanningResult: {
                    status:
                        'committed',
                },
            },
        ).reasons,
        [
            'high_calendar_succeeded',
        ],
    );
    const promise =
        '我答应你周末和你约会。';
    assert.equal(
        detectExplicitCalendarCommitment(
            promise,
        ),
        promise,
    );
    assert.equal(
        evaluateMediumCalendarTriggers(
            adequate,
            {
                playerAction:
                    promise,
            },
        ).reasons.includes(
            'player_commitment',
        ),
        true,
    );
    assert.equal(
        detectExplicitCalendarCommitment(
            '也许以后可以约会。',
        ),
        '',
        'speculative dialogue must not trigger planning',
    );
});

test('Medium prompt and proposal exclude temporary, provisional, and Identity-incomplete actors', async () => {
    const state =
        createState();
    state.actorLibrary.push(
        {
            id: 'temporary_actor',
            nameEn: 'Temporary Actor',
            identity:
                normalizeNpcIdentity(),
        },
        {
            id: 'provisional_actor',
            nameEn:
                'Provisional Actor',
            identity:
                normalizeNpcIdentity(),
        },
        {
            id: 'identity_missing_actor',
            nameEn:
                'Identity Missing Actor',
        },
    );
    state.actors.push(
        {
            id: 'temporary_actor',
            temporary: true,
        },
        {
            id: 'provisional_actor',
            temporary: true,
        },
        {
            id: 'identity_missing_actor',
        },
    );

    const context =
        projectMediumCalendarDirectorContext(
            state,
            {
                trigger: {
                    reasons: [
                        'manual',
                    ],
                },
            },
        );
    assert.deepEqual(
        context.admittedActorStates
            .map(actor => actor.id),
        [
            HARRY_ID,
            HERMIONE_ID,
        ],
    );
    const promptContext =
        JSON.parse(
            createMediumCalendarDirectorPrompt(
                state,
                {
                    trigger: {
                        reasons: [
                            'manual',
                        ],
                    },
                },
            )[1].content,
        );
    assert.deepEqual(
        promptContext
            .admittedActorStates
            .map(actor => actor.id),
        [
            HARRY_ID,
            HERMIONE_ID,
        ],
    );

    for (
        const actorId of [
            'temporary_actor',
            'provisional_actor',
            'identity_missing_actor',
        ]
    ) {
        const validation =
            validateMediumCalendarDirectorProposal(
                createProposal(
                    state,
                    [
                        createEntry(
                            `meeting_${actorId}`,
                            {
                                participantIds: [
                                    actorId,
                                ],
                            },
                        ),
                    ],
                ),
                state,
                '1991-09-17 · 10:30',
            );
        assert.equal(
            validation.valid,
            false,
        );
        assert.match(
            validation.errors
                .join('；'),
            /Actor Admission\/Identity/u,
        );
    }

    const rejectedProposal =
        createProposal(
            state,
            [
                createEntry(
                    'temporary_actor_meeting',
                    {
                        participantIds: [
                            'temporary_actor',
                        ],
                    },
                ),
            ],
        );
    const harness =
        createPlanningHarness(
            state,
            [
                rejectedProposal,
                rejectedProposal,
            ],
        );
    const before =
        structuredClone(state);
    await assert.rejects(
        harness.workflow
            .runMediumCalendarDirector({
                force: true,
            }),
        /Actor Admission\/Identity/u,
    );
    assert.equal(
        harness.calls
            .transactions.length,
        0,
        'rejected participants must not reach the reducer save boundary',
    );
    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud,
        before,
    );
});

test('Medium expands active or planned beats into four stable slots and keeps ordinary daily schedules readable', async () => {
    const state =
        createState();
    state.calendar
        .storyBeats[0]
        .status =
        'active';
    const beatSchedules =
        createBeatSchedules();
    const dailySchedules =
        createReadableDaySchedules();
    const beforeStorylines =
        structuredClone(
            state.calendar
                .storylines,
        );
    const beforeStoryBeats =
        structuredClone(
            state.calendar
                .storyBeats,
        );
    const beforeScene =
        structuredClone(
            state.scene,
        );
    const context =
        projectMediumCalendarDirectorContext(
            state,
            {
                trigger: {
                    reasons: [
                        'manual',
                    ],
                },
            },
        );

    assert.equal(
        context
            .schedulableStoryBeats
            .length,
        1,
    );
    assert.deepEqual(
        context
            .schedulableStoryBeats[0]
            .missingBeatSlots,
        [
            1,
            2,
            3,
            4,
        ],
    );
    assert.deepEqual(
        context
            .dailyScheduleGuidance
            .ordinaryTags,
        [
            'breakfast',
            'class',
            'lunch',
            'dinner',
            'training',
            'date',
            'meeting',
        ],
    );
    assert.equal(
        context
            .dailyScheduleGuidance
            .coverage[0]
            .date,
        '1991-09-03',
    );
    assert.equal(
        context
            .dailyScheduleGuidance
            .coverage.at(-1)
            .date,
        '1991-09-17',
    );

    const plannedState =
        structuredClone(state);
    plannedState.calendar
        .storyBeats[0]
        .status =
        'planned';
    assert.equal(
        projectMediumCalendarDirectorContext(
            plannedState,
        ).schedulableStoryBeats
            .length,
        1,
        'planned beats entering the same window are also schedulable',
    );

    const incomplete =
        validateMediumCalendarDirectorProposal(
            createProposal(
                state,
                beatSchedules.slice(
                    0,
                    3,
                ),
            ),
            state,
            '1991-09-17 · 10:30',
        );
    assert.equal(
        incomplete.valid,
        false,
    );
    assert.match(
        incomplete.errors
            .join('；'),
        /缺少稳定 schedule 槽位：4/u,
    );

    const proposal =
        createProposal(
            state,
            [
                ...beatSchedules,
                ...dailySchedules,
            ],
        );
    const harness =
        createPlanningHarness(
            state,
            [
                proposal,
            ],
        );
    const result =
        await harness.workflow
            .runMediumCalendarDirector({
                force: true,
            });
    const committed =
        harness.context
            .chatMetadata
            .hogwartsMud;
    assert.equal(
        result.status,
        'committed',
    );
    assert.deepEqual(
        committed.calendar
            .entries
            .filter(entry =>
                entry.sourceBeatId ===
                'first_term_exam_beat')
            .map(entry => [
                entry.sourceBeatId,
                entry.beatSlot,
                entry.scheduleKind,
            ]),
        [
            [
                'first_term_exam_beat',
                1,
                'story',
            ],
            [
                'first_term_exam_beat',
                2,
                'story',
            ],
            [
                'first_term_exam_beat',
                3,
                'story',
            ],
            [
                'first_term_exam_beat',
                4,
                'story',
            ],
        ],
    );
    assert.deepEqual(
        projectCalendarByDate(
            committed,
            '1991-09-04',
        )
            .filter(entry =>
                entry.id.startsWith(
                    'daily_',
                ))
            .map(entry =>
                entry.tags[0]),
        [
            'breakfast',
            'class',
            'lunch',
            'training',
            'meeting',
            'dinner',
            'date',
        ],
        'ordinary schedules remain one time-ordered agenda',
    );
    assert.deepEqual(
        committed.calendar
            .storylines,
        beforeStorylines,
    );
    assert.deepEqual(
        committed.calendar
            .storyBeats,
        beforeStoryBeats,
    );
    assert.deepEqual(
        committed.scene,
        beforeScene,
    );

    const firstSlot =
        committed.calendar
            .entries.find(entry =>
                entry.beatSlot ===
                    1 &&
                entry.sourceBeatId ===
                    'first_term_exam_beat');
    const rescheduled = {
        ...firstSlot,
        startClock:
            '1991-09-06 · 14:00',
        endClock:
            '1991-09-06 · 14:45',
        updatedClock:
            committed.clock,
    };
    const replayProposal =
        createProposal(
            committed,
            [
                rescheduled,
            ],
        );
    const replayHarness =
        createPlanningHarness(
            committed,
            [
                replayProposal,
            ],
        );
    await replayHarness.workflow
        .runMediumCalendarDirector({
            force: true,
        });
    const replayed =
        replayHarness.context
            .chatMetadata
            .hogwartsMud;
    assert.equal(
        replayed.calendar
            .entries
            .filter(entry =>
                entry.sourceBeatId ===
                'first_term_exam_beat')
            .length,
        4,
        'replanning upserts the same sourceBeatId + beatSlot IDs',
    );
    assert.equal(
        replayed.calendar
            .entries.find(entry =>
                entry.id ===
                firstSlot.id)
            .startClock,
        rescheduled.startClock,
    );

    const changedPair = {
        ...rescheduled,
        beatSlot: 2,
    };
    const pairValidation =
        validateMediumCalendarDirectorProposal(
            createProposal(
                committed,
                [
                    changedPair,
                ],
            ),
            committed,
            '1991-09-17 · 10:30',
        );
    assert.equal(
        pairValidation.valid,
        false,
    );
    assert.match(
        pairValidation.errors
            .join('；'),
        /sourceBeatId \+ beatSlot 创建后不可修改|beatSlot 2 重复/u,
    );

    const pastState =
        structuredClone(
            replayed,
        );
    pastState.clock =
        '1991-09-18 · 10:30';
    const pastSlot =
        pastState.calendar
            .entries.find(entry =>
                entry.id ===
                firstSlot.id);
    const pastValidation =
        validateMediumCalendarDirectorProposal(
            createProposal(
                pastState,
                [{
                    ...pastSlot,
                    summary:
                        '不得改写已经过去的节奏日程。',
                }],
            ),
            pastState,
            '1991-10-02 · 10:30',
        );
    assert.equal(
        pastValidation.valid,
        false,
    );
    assert.match(
        pastValidation.errors
            .join('；'),
        /已结束，只能只读/u,
    );

    const prompt =
        createMediumCalendarDirectorPrompt(
            state,
        )[0].content;
    assert.match(
        prompt,
        /sourceBeatId \+ beatSlot/u,
    );
    assert.match(
        prompt,
        /Breakfast, class, lunch, dinner, training, date and meeting/u,
    );
    assert.match(
        prompt,
        /"scheduleKind": "routine\|class\|story\|social\|personal"/u,
    );
    assert.doesNotMatch(
        prompt,
        /"meal"|"course"/u,
    );
});

test('Medium planning reads all required authority and atomically advances horizon only after a valid shared upsert', async () => {
    const highStoryline = {
        id:
            'school_year_storyline',
        title:
            '学年故事线',
        titleEn:
            'School-Year Storyline',
        summary:
            '公开的学年方向。',
        summaryEn:
            'A public school-year direction.',
        tags: [
            'school',
        ],
        startClock:
            CURRENT_CLOCK,
        endClock:
            '1992-06-20 · 20:00',
        participantIds: [
            HARRY_ID,
        ],
        status: 'active',
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
    };
    const existing =
        createEntry(
            'weekend_meeting',
            {
                tags: [
                    'meeting',
                ],
            },
        );
    const state =
        createState([
            existing,
        ]);
    state.calendar.storylines
        .push(highStoryline);
    const updated = {
        ...existing,
        parentId:
            highStoryline.id,
        summary:
            '玩家承诺后，周末会面保持原稳定条目。',
        summaryEn:
            'The promised weekend meeting keeps its stable entry.',
    };
    const proposal =
        createProposal(
            state,
            [
                updated,
            ],
        );
    const responses = [
        proposal,
    ];
    const harness =
        createPlanningHarness(
            state,
            responses,
        );
    const beforeOtherDomains = {
        actors:
            structuredClone(
                state.actors,
            ),
        scene:
            structuredClone(
                state.scene,
            ),
        items:
            structuredClone(
                state.items,
            ),
    };

    const result =
        await harness.workflow
            .runMediumCalendarDirector({
                playerAction:
                    '我答应你周末和你见面。',
            });

    assert.equal(
        result.status,
        'committed',
    );
    assert.equal(
        result.targetHorizon,
        '1991-09-17 · 10:30',
    );
    assert.equal(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar.horizon,
        result.targetHorizon,
    );
    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar.entries
            .map(entry =>
                entry.id),
        [
            existing.id,
        ],
        'the repeated plan updates its stable ID instead of appending a duplicate',
    );
    assert.equal(
        harness.calls
            .transactions.length,
        1,
    );
    assert.deepEqual(
        harness.calls
            .transactions[0]
            .changedDomains,
        [
            'calendar',
        ],
    );
    assert.equal(
        harness.calls
            .transactions[0]
            .consumeRevision,
        true,
    );
    const promptContext =
        JSON.parse(
            harness.calls
                .prompts[0]
                .prompt[1]
                .content,
        );
    assert.deepEqual(
        promptContext.highEntries
            .map(entry =>
                entry.id),
        [],
    );
    assert.deepEqual(
        promptContext
            .currentAndFutureMediumEntries
            .map(entry =>
                entry.id),
        [
            existing.id,
        ],
    );
    assert.equal(
        promptContext
            .recentPlayerActions
            .at(-1),
        '我答应你周末和你见面。',
    );
    assert.deepEqual(
        promptContext
            .admittedActorStates
            .map(actor => [
                actor.id,
                actor.present,
                actor.roomId,
            ]),
        [
            [
                HARRY_ID,
                true,
                'charms_classroom',
            ],
            [
                HERMIONE_ID,
                false,
                'three_broomsticks',
            ],
        ],
    );
    assert.ok(
        promptContext.mapAuthority,
    );
    assert.deepEqual(
        {
            actors:
                harness.context
                    .chatMetadata
                    .hogwartsMud
                    .actors,
            scene:
                harness.context
                    .chatMetadata
                    .hogwartsMud
                    .scene,
            items:
                harness.context
                    .chatMetadata
                    .hogwartsMud
                    .items,
        },
        beforeOtherDomains,
    );

    const replayState =
        harness.context
            .chatMetadata
            .hogwartsMud;
    const replayEntry = {
        ...replayState
            .calendar.entries
            .find(entry =>
                entry.id ===
                existing.id),
        summary:
            '重复规划仍更新同一条周末会面。',
        summaryEn:
            'Repeated planning still updates the same weekend meeting.',
    };
    responses.push(
        createProposal(
            replayState,
            [
                replayEntry,
            ],
        ),
    );
    const replay =
        await harness.workflow
            .runMediumCalendarDirector({
                force: true,
            });
    assert.equal(
        replay.status,
        'committed',
    );
    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar.entries
            .map(entry =>
                entry.id),
        [
            existing.id,
        ],
    );
    assert.equal(
        harness.calls
            .transactions.length,
        2,
    );
});

test('failed Medium persistence leaves entries and horizon byte-stable', async () => {
    const state =
        createState();
    const proposal =
        createProposal(
            state,
            [
                createEntry(
                    'weekend_date',
                    {
                        tags: [
                            'date',
                        ],
                    },
                ),
            ],
        );
    const harness =
        createPlanningHarness(
            state,
            [
                proposal,
            ],
            {
                saveResult: {
                    ok: false,
                    status:
                        'stale_save',
                },
            },
        );
    const before =
        JSON.stringify(
            state.calendar,
        );

    await assert.rejects(
        harness.workflow
            .runMediumCalendarDirector({
                force: true,
            }),
        /revision 冲突/u,
    );
    assert.equal(
        JSON.stringify(
            harness.context
                .chatMetadata
                .hogwartsMud
                .calendar,
        ),
        before,
    );
    assert.equal(
        harness.calls
            .transactions.length,
        1,
    );
});

test('all ordinary schedule tags, including canon, use identical Medium validation and overlap rules', () => {
    const state =
        createState();
    const entries =
        createOrdinaryTagEntries();
    const proposal =
        createProposal(
            state,
            entries,
        );
    const validation =
        validateMediumCalendarDirectorProposal(
            proposal,
            state,
            '1991-09-17 · 10:30',
        );
    assert.equal(
        validation.valid,
        true,
        validation.errors.join('；'),
    );
    assert.deepEqual(
        validation.entries
            .map(entry =>
                entry.tags[0]),
        [
            'quidditch',
            'date',
            'exam',
            'class',
            'training',
            'meeting',
            'canon',
        ],
    );

    const beyondWindow =
        validateMediumCalendarDirectorProposal(
            createProposal(
                state,
                [
                    createEntry(
                        'too_late',
                        {
                            startClock:
                                '1991-09-18 · 10:00',
                            endClock:
                                '1991-09-18 · 11:00',
                        },
                    ),
                ],
            ),
            state,
            '1991-09-17 · 10:30',
        );
    assert.equal(
        beyondWindow.valid,
        false,
    );
    assert.match(
        beyondWindow.errors
            .join('；'),
        /startClock 必须位于当前时钟至目标 horizon/u,
    );
    assert.doesNotThrow(() => {
        const invalidClock =
            validateMediumCalendarDirectorProposal(
                createProposal(
                    state,
                    [
                        createEntry(
                            'invalid_clock',
                            {
                                startClock:
                                    '1991-02-30 · 10:00',
                            },
                        ),
                    ],
                ),
                state,
                '1991-09-17 · 10:30',
            );
        assert.equal(
            invalidClock.valid,
            false,
        );
        assert.match(
            invalidClock.errors
                .join('；'),
            /startClock 不是绝对世界时钟/u,
        );
    });
    const prompt =
        createMediumCalendarDirectorPrompt(
            state,
            {
                trigger: {
                    reasons: [
                        'manual',
                    ],
                },
            },
        );
    assert.match(
        prompt[0].content,
        /Breakfast, lunch, dinner, quidditch, date, exam, class, training, meeting, canon and every other category are ordinary equal tags/u,
    );
    assert.doesNotMatch(
        prompt[0].content,
        /canon.{0,40}(?:priority|protected|special mechanics)/iu,
    );
});

function createDailyHarness(
    state,
) {
    const calls = [];
    const context = {
        chat: [{
            is_user: true,
            mes:
                'I keep writing.',
        }],
        chatMetadata: {
            hogwartsMud:
                state,
        },
        async saveMetadata() {},
    };
    const workflow =
        createDirectorWorkflows({
            CONTEXT_SIZE_PRESETS: {
                rich: 120000,
            },
            DEFAULT_MODEL_SLOTS: {
                medium: {
                    maxResponseLength:
                        12000,
                },
            },
            applySystemPrompt() {},
            buildActorSelectionPolicy:
                () => ({}),
            buildMapAuthorityContext:
                () => ({}),
            createContextBudgetPlan:
                () => ({
                    recentMessageLimit:
                        10,
                    memoryLimits: {},
                    ragLimit: 4,
                }),
            extractRoleResponseText:
                response =>
                    response.content,
            formatRetrievedKnowledge:
                () => '',
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            getWorldDate:
                clock =>
                    clock.slice(
                        0,
                        10,
                    ),
            isDailyDirectorPlanCurrent:
                () => false,
            jobRegistry: {},
            normalizeActorMemoryProfile:
                actor => ({
                    ...actor,
                    sharedMemories: {},
                    knowledgeEn: [],
                }),
            normalizePacingAssessmentPayload:
                value => value,
            parseJsonObject:
                value =>
                    JSON.parse(value),
            projectNpcRuntimeActorsForPrompt:
                current =>
                    current.actors,
            renderAll() {},
            resolveRoleSlots:
                () => ({
                    medium: {
                        profileId:
                            'medium',
                        contextSize:
                            120000,
                        maxResponseLength:
                            12000,
                    },
                }),
            retrieveLocalKnowledge:
                async () => [],
            selectSharedMemoriesForContext:
                () => ({}),
            async sendRoleRequest(
                _slot,
                prompt,
            ) {
                calls.push(prompt);
                return {
                    content:
                        JSON.stringify({
                            date:
                                '1991-09-03',
                            actorDirectives: [{
                                id:
                                    HARRY_ID,
                                goalEn:
                                    'Finish both pressures.',
                                moodEn:
                                    'Concentrated.',
                                guidanceEn:
                                    'Balance the simultaneous obligations.',
                            }],
                            revealedClueIds: [],
                            timePolicy: {
                                defaultMinutes:
                                    15,
                                movementMinutes:
                                    15,
                                investigationMinutes:
                                    30,
                                extendedActionMinutes:
                                    60,
                                instantaneousMagicMinutes:
                                    1,
                            },
                        }),
                };
            },
            syncLocalKnowledge:
                async () => {},
            validatePacingAssessment:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    return {
        calls,
        context,
        workflow,
    };
}

test('Daily Director reads today, upcoming and every current overlap without writing Calendar', async () => {
    const state =
        createState(
            createOverlapEntries(),
        );
    state.actors =
        state.actors.filter(actor =>
            actor.id ===
            HARRY_ID);
    const harness =
        createDailyHarness(
            state,
        );
    const before =
        structuredClone(
            state.calendar,
        );

    await harness.workflow
        .ensureDailyDirectorPlan();

    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar,
        before,
    );
    const payload =
        JSON.parse(
            harness.calls[0][1]
                .content,
        );
    const expectedEntries =
        state.calendar.entries;
    assert.deepEqual(
        payload.calendar
            .currentMoment,
        expectedEntries,
        'an absent participant and different suggested location do not filter the date',
    );
    assert.deepEqual(
        payload.calendar.today,
        expectedEntries,
    );
    assert.deepEqual(
        payload.calendar.upcoming,
        expectedEntries,
    );
    payload.calendar
        .currentMoment
        .forEach(entry => {
            assert.deepEqual(
                Object.keys(entry),
                CALENDAR_ENTRY_FIELDS,
            );
        });
    const forbidden =
        harness.workflow
            .validateDailyDirectorPlan(
                {
                    date:
                        '1991-09-03',
                    calendarProposal: {
                        entries: [],
                    },
                    actorDirectives: [],
                    revealedClueIds: [],
                    timePolicy: {},
                },
                state,
            );
    assert.equal(
        forbidden.valid,
        false,
    );
    assert.match(
        forbidden.errors
            .join('；'),
        /不得输出 Calendar/u,
    );
});

function createPerformerPrompt(
    state,
) {
    const workflow =
        createTurnPerformanceWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT:
                '',
            CONTEXT_SIZE_PRESETS: {
                rich: 120000,
            },
            DEFAULT_MODEL_SLOTS: {
                low: {
                    maxResponseLength:
                        12000,
                },
            },
            buildActorContinuityCapsules:
                () => [],
            buildActorKnowledgeCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildCurrentMaterialState:
                () => ({}),
            buildSpatialContext:
                () => ({}),
            buildStructuredPlayerTurnSequence:
                () => [],
            buildTemporaryActorPromotionPolicy:
                () => ({}),
            createContextBudgetPlan:
                () => ({
                    mode: 'rich',
                    label: 'rich',
                    inputBudget:
                        108000,
                    ragLimit: 10,
                    memoryLimits: {},
                }),
            formatRetrievedKnowledge:
                () => '',
            getActiveAddressingState:
                () => ({}),
            parseItemOperationDirectives:
                () => ({
                    directives: [],
                    errors: [],
                }),
            removeExplicitAddressDirective:
                value => value,
            resolvePlayerAddressing:
                () => ({
                    valid: true,
                    actorIds: [],
                }),
        });
    return workflow
        .createScenePerformancePrompt(
            state,
            'Continue writing.',
            {
                elapsedMinutes: 15,
                minimumWords: 240,
                maximumWords: 560,
            },
            [],
            null,
            null,
            null,
            {
                valid: true,
                actorIds: [],
            },
            [],
        );
}

function createTransitionWorkflow() {
    return createSceneTransitionWorkflow({
        CANON_CAST_IDENTITY_CONTRACT:
            '',
        CANON_WIT_TONE_CONTRACT:
            '',
        buildActorContinuityCapsules:
            () => [],
        buildBehavioralEnvironment:
            () => ({}),
        buildMapAuthorityContext:
            () => ({}),
        buildSceneCastRotationPolicy:
            () => ({}),
        createContextBudgetPlan:
            () => ({
                chapterMessageLimit:
                    10,
            }),
        formatRetrievedKnowledge:
            () => '',
        getContext:
            () => ({
                chat: [],
            }),
        projectActorLibraryForContext:
            () => [],
        projectNpcRuntimeActorsForPrompt:
            current =>
                current.actors,
    });
}

test('Daily keeps both overlaps while Performer and Scene Transition receive only the Scene claim and public sources', () => {
    const state =
        createState(
            createOverlapEntries(),
        );
    state.actors =
        state.actors.filter(actor =>
            actor.id ===
            HARRY_ID);
    const performer =
        createPerformerPrompt(
            state,
        );
    const performerPayload =
        JSON.parse(
            performer[1].content,
        );
    const expectedEntries =
        state.calendar.entries
            .filter(entry =>
                entry.id ===
                'charms_exam');
    assert.deepEqual(
        performerPayload
            .calendarEntries,
        expectedEntries,
    );
    performerPayload
        .calendarEntries
        .forEach(entry => {
            assert.deepEqual(
                Object.keys(entry),
                CALENDAR_ENTRY_FIELDS,
            );
        });
    assert.equal(
        performerPayload
            .calendarStorySources[0]
            .scheduleId,
        'charms_exam',
    );
    assert.equal(
        performerPayload
            .calendarStorySources[0]
            .storyBeat.id,
        'first_term_exam_beat',
    );
    assert.equal(
        performerPayload
            .calendarStorySources[0]
            .storyline.id,
        'first_year_trials',
    );
    assert.match(
        performer[0].content,
        /only schedules explicitly claimed by currentScene\.calendarEntryIds/u,
    );

    const workflow =
        createTransitionWorkflow();
    for (const tier of [
        'medium',
        'high',
    ]) {
        const prompt =
            workflow
                .createSceneTransitionPrompt(
                    state,
                    tier,
                    '',
                    null,
                    {
                        changed: false,
                    },
                    [],
                    {
                        chapterMessageLimit:
                            10,
                    },
                );
        const payload =
            JSON.parse(
                prompt[1].content,
            );
        assert.equal(
            payload.tier,
            tier,
        );
        assert.deepEqual(
            payload.calendarEntries,
            expectedEntries,
            `${tier} transition must read only the current Scene claim`,
        );
        payload.calendarEntries
            .forEach(entry => {
                assert.deepEqual(
                    Object.keys(entry),
                    CALENDAR_ENTRY_FIELDS,
                );
            });
        assert.deepEqual(
            payload
                .calendarStorySources,
            performerPayload
                .calendarStorySources,
        );
        assert.match(
            prompt[0].content,
            /only schedules explicitly claimed by the current Scene/u,
        );
    }
});

test('context limiting preserves complete Calendar prompt authority under overflow', () => {
    const calendarEntries =
        createOverlapEntries();
    const calendar = {
        today:
            structuredClone(
                calendarEntries,
            ),
        upcoming:
            structuredClone(
                calendarEntries,
            ),
        currentMoment:
            structuredClone(
                calendarEntries,
            ),
    };
    const limited =
        limitMessagesToContext(
            [{
                role: 'system',
                content:
                    'Preserve Calendar authority.',
            }, {
                role: 'user',
                content:
                    JSON.stringify({
                        playerAction:
                            'Continue.',
                        calendar,
                        calendarClock:
                            CURRENT_CLOCK,
                        calendarEntries,
                        retrievedLocalKnowledge: [{
                            text:
                                'optional '.repeat(
                                    20_000,
                                ),
                        }],
                    }),
            }],
            32_768,
            18_576,
        );
    const payload =
        JSON.parse(
            limited[1].content,
        );

    assert.equal(
        payload.calendarClock,
        CURRENT_CLOCK,
    );
    assert.deepEqual(
        payload.calendarEntries,
        calendarEntries,
    );
    assert.deepEqual(
        payload.calendar,
        calendar,
    );
    assert.equal(
        payload
            .retrievedLocalKnowledge,
        undefined,
    );
});

test('application wiring schedules Medium after successful high planning and committed turns while index stays within its boundary', async () => {
    const application =
        await readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/application.js',
                import.meta.url,
            ),
            'utf8',
        );
    const turn =
        await readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/turn.js',
                import.meta.url,
            ),
            'utf8',
        );
    const index =
        await readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/index.js',
                import.meta.url,
            ),
            'utf8',
        );
    const mediumDirector =
        await readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/medium-calendar-director.js',
                import.meta.url,
            ),
            'utf8',
        );

    assert.match(
        application,
        /runHighCalendarDirectorSafely\(\{[\s\S]{0,120}?trigger: 'foundation'[\s\S]{0,500}?highPlanningAllowsMedium\([\s\S]{0,100}?highPlanningResult[\s\S]{0,180}?runMediumCalendarDirectorSafely\(\{[\s\S]{0,80}?highPlanningResult/u,
    );
    assert.match(
        application,
        /runSceneTransitionBase\([\s\S]{0,700}?highPlanningAllowsMedium\([\s\S]{0,100}?highPlanningResult[\s\S]{0,180}?runMediumCalendarDirectorSafely\(\{[\s\S]{0,100}?previousClock[\s\S]{0,100}?highPlanningResult/u,
    );
    assert.match(
        application,
        /runTimelineMomentBase\([\s\S]{0,700}?finalizeCalendarMomentPostCommit/u,
    );
    assert.match(
        application,
        /runTimelineMoment,/u,
    );
    assert.match(
        turn,
        /await runMediumCalendarDirectorSafely\(\{[\s\S]{0,100}?previousClock,[\s\S]{0,100}?playerAction,[\s\S]{0,100}?\}\);[\s\S]{0,100}?state = getMudState\(\);[\s\S]{0,200}?ensureDailyDirectorPlan/u,
    );
    assert.ok(
        index.split('\n')
            .length <= 601,
        'index.js must remain at or below 600 content lines',
    );
    assert.doesNotMatch(
        mediumDirector,
        /(?:from|import\s*\()\s*['"][^'"]*(?:helpers|index)\.js['"]/u,
    );
    assert.ok(
        mediumDirector
            .split('\n')
            .length < 2000,
        'Medium Calendar Director exceeds the workflow module limit',
    );

    const context =
        projectMediumCalendarDirectorContext(
            createState(),
            {
                trigger: {
                    reasons: [
                        'horizon_insufficient',
                    ],
                },
            },
        );
    assert.equal(
        Object.hasOwn(
            context,
            'hiddenStoryArcs',
        ),
        false,
    );
});
