/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    archiveSceneWithCalendarLinks,
    getCalendarMomentContext,
    projectCalendarRelatedScenes,
    projectSceneArchiveHistory,
    readSceneArchiveRecord,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-scene.js';
import {
    settleCalendarAtClock,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-reducer.js';
import {
    CALENDAR_ENTRY_FIELDS,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-schema.js';
import {
    createSaveRevisionGuard,
    createSaveRevisionStorageAdapter,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import {
    createGuardedSavePorts,
} from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import {
    createCalendarMomentWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/calendar-moment.js';
import {
    finalizeCalendarMomentPostCommit,
} from '../public/scripts/extensions/hogwarts-mud/workflows/application.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    buildCalendarViewModel,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-view-model.js';

const CURRENT_CLOCK =
    '1991-09-03 · 10:00';
const TARGET_CLOCK =
    '1991-09-03 · 11:00';
const FREE_CLOCK =
    '1991-09-03 · 15:00';
const END_CLOCK =
    '1991-09-03 · 12:00';
const HARRY_ID =
    'canon_harry_james_potter';
const HERMIONE_ID =
    'canon_hermione_jean_granger';

function createStorage() {
    const values = new Map();
    return {
        get length() {
            return values.size;
        },
        key(index) {
            return [
                ...values.keys(),
            ][index] ?? null;
        },
        getItem(key) {
            return values.get(key) ??
                null;
        },
        setItem(key, value) {
            values.set(
                key,
                String(value),
            );
        },
        removeItem(key) {
            values.delete(key);
        },
    };
}

function createEntry(
    id,
    patch = {},
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        titleEn: id,
        summaryEn:
            `Public schedule for ${id}.`,
        tags: [],
        startClock:
            TARGET_CLOCK,
        endClock:
            END_CLOCK,
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

function createState(
    patch = {},
) {
    const currentEntry =
        createEntry(
            'morning_corridor',
            {
                startClock:
                    '1991-09-03 · 09:00',
                endClock:
                    '1991-09-03 · 10:45',
                status: 'active',
            },
        );
    const exam =
        createEntry(
            'charms_exam',
            {
                titleEn:
                    'Charms Exam',
                tags: [
                    'exam',
                ],
                participantIds: [
                    HARRY_ID,
                    HERMIONE_ID,
                ],
                planningTier:
                    'high',
                sourceBeatId:
                    'first_term_exam_beat',
                beatSlot: 1,
                scheduleKind:
                    'story',
            },
        );
    const date =
        createEntry(
            'charms_date',
            {
                titleEn:
                    'Date During the Exam',
                tags: [
                    'date',
                ],
                participantIds: [
                    HERMIONE_ID,
                ],
                mapId:
                    'hogsmeade',
                roomId:
                    'three_broomsticks',
            },
        );
    const cancelled =
        createEntry(
            'cancelled_class',
            {
                status:
                    'cancelled',
            },
        );
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'timeline_calendar_moment',
        stateRevision: 6,
        revisionHistory: [],
        phase: 'playing',
        clock: CURRENT_CLOCK,
        calendar: {
            version: 3,
            storylines: [{
                id:
                    'first_year_trials',
                titleEn:
                    'First-Year Trials',
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
                titleEn:
                    'The First Exam',
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
                status: 'active',
                relatedSceneIds: [],
                createdClock:
                    '1991-09-01 · 00:00',
                updatedClock:
                    CURRENT_CLOCK,
            }],
            entries: [
                currentEntry,
                exam,
                date,
                cancelled,
            ],
            horizon:
                '1991-09-17 · 10:00',
        },
        actorLibrary: [{
            id: HARRY_ID,
        }, {
            id: HERMIONE_ID,
        }],
        map: {
            customLocalMaps: [{
                id:
                    'hogwarts_castle',
                nodes: [{
                    id:
                        'charms_classroom',
                }, {
                    id:
                        'great_hall',
                }, {
                    id:
                        'black_lake_shore',
                }],
            }, {
                id: 'hogsmeade',
                nodes: [{
                    id:
                        'three_broomsticks',
                }],
            }],
            generatedLocalNodes: [],
        },
        sceneArchive: [{
            id: 'legacy_scene',
            nameEn: 'Legacy Scene',
            summaryEn:
                'Legacy archive metadata.',
            authorQuillEn:
                'Original archive body.',
            messageIds: [
                1,
                2,
            ],
            startedClock:
                '1991-09-02 · 08:00',
            endedClock:
                '1991-09-02 · 09:00',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
        }],
        scene: {
            id: 'current_scene',
            nameEn: 'Corridor',
            summaryEn:
                'A corridor scene.',
            startedClock:
                '1991-09-03 · 09:00',
            startedMessageId: 0,
            timelineEntries: [],
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            calendarEntryIds: [
                currentEntry.id,
            ],
            nextSceneIntent: {
                tier: 'medium',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'great_hall',
            },
        },
        sceneTransition: {
            status: 'idle',
            tier: 'medium',
        },
        modelSlots: {},
        ...patch,
    };
}

function createPayload() {
    return {
        transitionMinutes: 60,
        nextClock:
            TARGET_CLOCK,
        closureSummaryEn:
            'The corridor scene closes.',
        authorQuillEn:
            'The original archive body remains in the archive record.',
        unresolvedThreadsEn: [],
        nextScene: {
            id:
                'great_hall_calendar_moment',
            nameEn: 'Great Hall',
            summaryEn:
                'The Great Hall holds both scheduled pressures at once.',
            chapterEn:
                'Simultaneous Obligations',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
            actorStates: [],
            openingSegments: [{
                type:
                    'narration',
                textEn:
                    'The Great Hall receives two schedules at the same hour.',
            }],
            followingSceneIntent: {
                tier: 'medium',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'great_hall',
            },
        },
    };
}

function createGuard(
    storage,
    pageId,
) {
    let claim = 0;
    return createSaveRevisionGuard({
        storage,
        lockManager: null,
        createClaimId: () =>
            `${pageId}_${
                claim += 1
            }`,
        now: () =>
            '1991-09-03T11:00:00.000Z',
    });
}

function createWorkflowHarness(
    state,
    {
        guard,
        failModel = false,
        failSave = false,
        languageSkipped = false,
    } = {},
) {
    const calls = {
        director: [],
        opening: [],
        commits: 0,
        savedMessages: [],
        phases: [],
    };
    const activeGuard =
        guard ||
        createGuard(
            createStorage(),
            'calendar',
        );
    activeGuard.registerHead(
        state,
    );
    let persisted = null;
    const jobRegistry = {};
    const workflow =
        createCalendarMomentWorkflow({
            CONTEXT_SIZE_PRESETS: {
                rich: 120000,
            },
            DEFAULT_MODEL_SLOTS: {
                medium: {
                    maxResponseLength:
                        12000,
                },
            },
            applySceneTransition(
                current,
                payload,
                archiveEntry,
                options,
            ) {
                const archived =
                    archiveSceneWithCalendarLinks(
                        current,
                        archiveEntry,
                    );
                return {
                    ...archived,
                    clock:
                        payload.nextClock,
                    scene: {
                        id:
                            payload
                                .nextScene
                                .id,
                        mapId:
                            payload
                                .nextScene
                                .mapId,
                        roomId:
                            payload
                                .nextScene
                                .roomId,
                        calendarEntryIds:
                            options
                                .calendarEntryIds,
                        nextSceneIntent:
                            payload
                                .nextScene
                                .followingSceneIntent,
                    },
                    sceneTransition: {
                        status: 'idle',
                        tier:
                            options.tier,
                    },
                };
            },
            applySystemPrompt() {},
            buildSceneArchiveEntry(
                current,
                payload,
                tier,
            ) {
                return {
                    id:
                        current.scene.id,
                    nameEn:
                        current.scene
                            .nameEn,
                    summaryEn:
                        current.scene
                            .summaryEn,
                    authorQuillEn:
                        payload
                            .authorQuillEn,
                    messageIds: [
                        0,
                    ],
                    startedClock:
                        current.scene
                            .startedClock,
                    endedClock:
                        current.clock,
                    mapId:
                        current.scene.mapId,
                    roomId:
                        current.scene.roomId,
                    calendarEntryIds:
                        current.scene
                            .calendarEntryIds,
                    tier,
                    status: 'closed',
                };
            },
            buildSceneTransitionMessage(
                payload,
            ) {
                return {
                    mes:
                        payload
                            .nextScene
                            .openingSegments[0]
                            .textEn,
                    extra: {
                        hogwartsMud: {
                            sceneId:
                                payload
                                    .nextScene
                                    .id,
                        },
                    },
                };
            },
            createContextBudgetPlan() {
                return {
                    ragLimit: 4,
                };
            },
            async generateSceneTransitionOpening(
                ...args
            ) {
                calls.opening
                    .push(args);
                return args[2];
            },
            async generateSceneTransitionPackage(
                ...args
            ) {
                calls.director
                    .push(args);
                if (failModel) {
                    throw new Error(
                        'model unavailable',
                    );
                }
                if (languageSkipped) {
                    return {
                        languageSkipped: true,
                        diagnostics: [{
                            code:
                                'model_language_mismatch',
                        }],
                    };
                }
                const payload =
                    createPayload();
                const expectedDestination =
                    args[4];
                if (expectedDestination) {
                    payload.nextScene.mapId =
                        expectedDestination
                            .mapId;
                    payload.nextScene.roomId =
                        expectedDestination
                            .roomId;
                }
                return payload;
            },
            getContext() {
                return {
                    chat: [],
                };
            },
            getMudState() {
                return state;
            },
            async guardedSaveTransaction(
                options,
            ) {
                calls.commits += 1;
                calls.savedMessages =
                    options.chatMessages;
                return activeGuard
                    .guardedSave({
                        currentState:
                            options
                                .currentState,
                        nextState:
                            options
                                .nextState,
                        source:
                            options.source,
                        changedDomains:
                            options
                                .changedDomains,
                        save:
                            committed => {
                                if (failSave) {
                                    throw new Error(
                                        'disk failed',
                                    );
                                }
                                persisted =
                                    committed;
                                return {
                                    durable:
                                        true,
                                };
                            },
                    });
            },
            jobRegistry,
            async localizeSceneTransitionPackage(
                payload,
            ) {
                return payload;
            },
            renderAll() {
                calls.phases.push(
                    jobRegistry
                        .calendarMomentPhase,
                );
            },
            resolveRoleSlots() {
                return {
                    low: {
                        profileId: 'low',
                        contextSize:
                            120000,
                        maxResponseLength:
                            12000,
                    },
                    medium: {
                        profileId:
                            'medium',
                        contextSize:
                            120000,
                        maxResponseLength:
                            12000,
                    },
                    high: {
                        profileId: 'high',
                        contextSize:
                            120000,
                        maxResponseLength:
                            12000,
                    },
                };
            },
            async retrieveLocalKnowledge() {
                return [];
            },
        });
    return {
        calls,
        getPersisted:
            () => persisted,
        workflow,
    };
}

test('Calendar Moment claims only the selected schedule while overlap settlement and transition authority stay independent', async () => {
    const state =
        createState();
    state.calendar.storyBeats.push({
        ...structuredClone(
            state.calendar
                .storyBeats[0],
        ),
        id:
            'expired_unobserved_beat',
        titleEn:
            'Expired Unobserved Beat',
        summaryEn:
            'The prose claims completion without any linked Scene.',
        termKey:
            'year_1_expired_beat',
        sequence: 2,
        windowEndClock:
            '1991-09-03 · 10:30',
        status: 'planned',
        relatedSceneIds: [],
    });
    const before =
        structuredClone(state);
    const harness =
        createWorkflowHarness(
            state,
        );
    const result =
        await harness.workflow
            .runCalendarMoment(
                'charms_exam',
            );

    assert.deepEqual(
        state,
        before,
        'generation and commit preparation do not mutate the source page',
    );
    assert.equal(
        harness.calls
            .director.length,
        1,
    );
    assert.deepEqual(
        harness.calls.phases,
        [
            'preparing',
            'archiving',
            'opening',
            'saving',
            'committed',
            'idle',
        ],
    );
    const directorArgs =
        harness.calls.director[0];
    assert.equal(
        directorArgs[2],
        'medium',
        'the high-planning entry does not select the high transition tier',
    );
    assert.equal(
        directorArgs[4],
        null,
        'the suggested Calendar location is not an expected destination lock',
    );
    const transitionContext =
        directorArgs[8];
    assert.equal(
        transitionContext
            .fixedClock,
        TARGET_CLOCK,
    );
    assert.deepEqual(
        transitionContext
            .suggestedDestination,
        {
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
        },
    );
    assert.deepEqual(
        transitionContext
            .calendarEntries
            .map(entry =>
                entry.id),
        [
            'charms_exam',
        ],
    );
    assert.deepEqual(
        transitionContext
            .calendarStorySources
            .map(source =>
                source.scheduleId),
        [
            'charms_exam',
        ],
    );
    assert.equal(
        transitionContext
            .calendarStorySources[0]
            .storyBeat.id,
        'first_term_exam_beat',
    );
    assert.equal(
        transitionContext
            .calendarStorySources[0]
            .storyline.id,
        'first_year_trials',
    );
    assert.deepEqual(
        harness.calls
            .opening[0][5]
            .calendarEntries
            .map(entry =>
                entry.id),
        [
            'charms_exam',
        ],
        'the low opening performer receives only the claimed schedule',
    );
    assert.equal(
        result.clock,
        TARGET_CLOCK,
    );
    assert.equal(
        result.scene.roomId,
        'great_hall',
        'the normal transition authority may choose a final room different from the suggestion',
    );
    assert.deepEqual(
        result.scene
            .calendarEntryIds,
        [
            'charms_exam',
        ],
    );
    assert.deepEqual(
        result.calendar.entries
            .map(entry => [
                entry.id,
                entry.status,
            ]),
        [
            [
                'morning_corridor',
                'completed',
            ],
            [
                'charms_exam',
                'active',
            ],
            [
                'charms_date',
                'active',
            ],
            [
                'cancelled_class',
                'cancelled',
            ],
        ],
    );
    assert.equal(
        result.calendar.storyBeats
            .find(beat =>
                beat.id ===
                'expired_unobserved_beat')
            .status,
        'deferred',
        'Calendar Moment applies the shared local beat settlement before commit',
    );
    assert.deepEqual(
        result.calendar.entries
            .find(entry =>
                entry.id ===
                'morning_corridor')
            .relatedSceneIds,
        [
            'current_scene',
        ],
    );
    assert.deepEqual(
        result.sceneArchive
            .find(record =>
                record.id ===
                'current_scene')
            .calendarEntryIds,
        [
            'morning_corridor',
        ],
    );
    assert.equal(
        harness.calls.commits,
        1,
    );
    assert.equal(
        harness.calls
            .savedMessages.length,
        1,
    );
    assert.equal(
        harness.getPersisted()
            .stateRevision,
        7,
    );
});

test('Task 37 keeps exam and date attendance separate while both schedules settle by the shared world clock', async () => {
    for (const selectedEntryId of [
        'charms_exam',
        'charms_date',
    ]) {
        const state =
            createState();
        state.calendar.entries =
            state.calendar.entries
                .map(entry => {
                    if (
                        entry.id ===
                        'charms_exam'
                    ) {
                        return {
                            ...entry,
                            endClock:
                                '1991-09-03 · 11:30',
                        };
                    }
                    if (
                        entry.id ===
                        'charms_date'
                    ) {
                        return {
                            ...entry,
                            endClock:
                                '1991-09-03 · 12:15',
                        };
                    }
                    return entry;
                });
        const viewModel =
            buildCalendarViewModel(
                state,
                {
                    selectedEntryId,
                    getRoomName:
                        (
                            _worldState,
                            _mapId,
                            roomId,
                        ) =>
                            roomId,
                },
            );
        const preview =
            viewModel.preview;
        assert.equal(
            preview.id,
            selectedEntryId,
        );
        assert.deepEqual(
            viewModel.entries
                .filter(entry =>
                    [
                        'charms_exam',
                        'charms_date',
                    ].includes(
                        entry.id,
                    ))
                .map(entry =>
                    entry.id),
            [
                'charms_exam',
                'charms_date',
            ],
            'overlapping schedules remain separate in the day plan projection',
        );

        const harness =
            createWorkflowHarness(
                state,
            );
        const active =
            await harness.workflow
                .runCalendarMoment(
                    preview.id,
                );
        assert.deepEqual(
            active.scene
                .calendarEntryIds,
            [
                selectedEntryId,
            ],
            `${selectedEntryId} preview claimed another concurrent schedule`,
        );
        const activeEntries =
            active.calendar.entries
                .filter(entry =>
                    [
                        'charms_exam',
                        'charms_date',
                    ].includes(
                        entry.id,
                    ));
        assert.deepEqual(
            activeEntries
                .map(entry =>
                    entry.status),
            [
                'active',
                'active',
            ],
        );
        assert.equal(
            activeEntries
                .some(entry =>
                    entry.status ===
                    'cancelled'),
            false,
        );

        const lowPromptEntries =
            harness.calls
                .opening[0][5]
                .calendarEntries;
        assert.deepEqual(
            lowPromptEntries,
            state.calendar.entries
                .filter(entry =>
                    entry.id ===
                    selectedEntryId),
            'the low opening prompt must receive only the selected complete schedule',
        );
        lowPromptEntries
            .forEach(entry => {
                assert.deepEqual(
                    Object.keys(entry),
                    CALENDAR_ENTRY_FIELDS,
                );
            });

        const afterExam =
            settleCalendarAtClock(
                active,
                '1991-09-03 · 11:31',
            );
        assert.deepEqual(
            afterExam.calendar.entries
                .filter(entry =>
                    [
                        'charms_exam',
                        'charms_date',
                    ].includes(
                        entry.id,
                    ))
                .map(entry => [
                    entry.id,
                    entry.status,
                ]),
            [
                [
                    'charms_exam',
                    'completed',
                ],
                [
                    'charms_date',
                    'active',
                ],
            ],
        );
        const completed =
            settleCalendarAtClock(
                afterExam,
                '1991-09-03 · 12:16',
            );
        assert.deepEqual(
            completed.calendar.entries
                .filter(entry =>
                    [
                        'charms_exam',
                        'charms_date',
                    ].includes(
                        entry.id,
                    ))
                .map(entry => [
                    entry.id,
                    entry.status,
                ]),
            [
                [
                    'charms_exam',
                    'completed',
                ],
                [
                    'charms_date',
                    'completed',
                ],
            ],
        );
    }
});

test('normal transition authority can select high for a medium-planning target', () => {
    const state =
        createState();
    state.scene
        .nextSceneIntent.tier =
        'high';
    const moment =
        getCalendarMomentContext(
            state,
            'charms_date',
        );

    assert.equal(
        moment.target
            .planningTier,
        'medium',
    );
    assert.equal(
        moment.tier,
        'high',
    );
    assert.deepEqual(
        moment.calendarEntryIds,
        [
            'charms_date',
        ],
    );
});

test('Timeline Moment creates a free Scene at a legal future location without claiming overlapping schedules', async () => {
    const state =
        createState();
    const before =
        structuredClone(state);
    const harness =
        createWorkflowHarness(
            state,
        );

    const result =
        await harness.workflow
            .runTimelineMoment({
                startClock:
                    FREE_CLOCK,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'black_lake_shore',
            });

    assert.deepEqual(
        state,
        before,
    );
    assert.equal(
        result.clock,
        FREE_CLOCK,
    );
    assert.equal(
        result.scene.mapId,
        'hogwarts_castle',
    );
    assert.equal(
        result.scene.roomId,
        'black_lake_shore',
    );
    assert.deepEqual(
        result.scene
            .calendarEntryIds,
        [],
    );
    assert.deepEqual(
        harness.calls
            .director[0][8]
            .calendarEntries,
        [],
    );
    assert.deepEqual(
        harness.calls
            .opening[0][5]
            .calendarEntries,
        [],
    );
    assert.deepEqual(
        result.calendar.entries
            .filter(entry =>
                [
                    'charms_exam',
                    'charms_date',
                ].includes(
                    entry.id,
                ))
            .map(entry =>
                entry.status),
        [
            'completed',
            'completed',
        ],
        'free opening settles world schedules without claiming attendance',
    );
});

test('Timeline Moment rejects a past clock and invalid map-room pair before model or persistence work', async () => {
    for (const request of [{
        startClock:
            '1991-09-03 · 09:59',
        mapId:
            'hogwarts_castle',
        roomId:
            'black_lake_shore',
    }, {
        startClock:
            TARGET_CLOCK,
        mapId:
            'hogwarts_castle',
        roomId:
            'three_broomsticks',
    }, {
        startClock:
            TARGET_CLOCK,
        mapId:
            'missing_map',
        roomId:
            'black_lake_shore',
    }]) {
        const state =
            createState();
        const before =
            JSON.stringify(state);
        const harness =
            createWorkflowHarness(
                state,
            );

        await assert.rejects(
            harness.workflow
                .runTimelineMoment(
                    request,
                ),
            /目标时钟不得早于|不存在的地图|不属于地图/u,
        );
        assert.equal(
            JSON.stringify(state),
            before,
        );
        assert.equal(
            harness.calls
                .director.length,
            0,
        );
        assert.equal(
            harness.calls.commits,
            0,
        );
    }
});

test('Scene archive links are append-only many-to-many and never settle Calendar status', () => {
    const state =
        createState({
            clock:
                TARGET_CLOCK,
        });
    state.calendar.entries =
        state.calendar.entries
            .filter(entry =>
                [
                    'charms_exam',
                    'charms_date',
                ].includes(
                    entry.id,
                ))
            .map(entry => ({
                ...entry,
                status: 'active',
            }));
    state.scene
        .calendarEntryIds = [
            'charms_exam',
            'charms_date',
        ];
    const first =
        archiveSceneWithCalendarLinks(
            state,
            {
                id: 'scene_exam_one',
                authorQuillEn:
                    'First body.',
            },
        );
    first.scene
        .calendarEntryIds = [
            'charms_exam',
            'charms_exam',
        ];
    const second =
        archiveSceneWithCalendarLinks(
            first,
            {
                id: 'scene_exam_two',
                authorQuillEn:
                    'Second body.',
            },
        );

    assert.deepEqual(
        second.calendar.entries
            .find(entry =>
                entry.id ===
                'charms_exam')
            .relatedSceneIds,
        [
            'scene_exam_one',
            'scene_exam_two',
        ],
    );
    assert.deepEqual(
        second.calendar.entries
            .find(entry =>
                entry.id ===
                'charms_date')
            .relatedSceneIds,
        [
            'scene_exam_one',
        ],
    );
    assert.deepEqual(
        second.calendar.entries
            .map(entry =>
                entry.status),
        [
            'active',
            'active',
        ],
        'archiving alone does not activate, complete, or cancel entries',
    );
    assert.deepEqual(
        second.sceneArchive
            .find(record =>
                record.id ===
                'scene_exam_one')
            .calendarEntryIds,
        [
            'charms_exam',
            'charms_date',
        ],
    );
    assert.deepEqual(
        second.sceneArchive
            .find(record =>
                record.id ===
                'scene_exam_two')
            .calendarEntryIds,
        [
            'charms_exam',
        ],
    );
});

test('archiving a selected schedule Scene links only its source beat and preserves deduplication', () => {
    const state =
        createState({
            clock:
                TARGET_CLOCK,
        });
    state.scene
        .calendarEntryIds = [
            'charms_exam',
        ];
    const first =
        archiveSceneWithCalendarLinks(
            state,
            {
                id:
                    'observed_exam_scene',
            },
        );
    const second =
        archiveSceneWithCalendarLinks(
            first,
            {
                id:
                    'observed_exam_scene',
                calendarEntryIds: [
                    'charms_exam',
                ],
            },
        );
    const beat =
        second.calendar
            .storyBeats[0];

    assert.deepEqual(
        beat.relatedSceneIds,
        [
            'observed_exam_scene',
        ],
    );
    assert.equal(
        beat.status,
        'active',
    );
    assert.deepEqual(
        second.calendar.entries
            .find(entry =>
                entry.id ===
                'charms_date')
            .relatedSceneIds,
        [],
    );
});

test('legacy archives project as stable read-only history while body stays in the original archive', () => {
    const state =
        createState();
    const history =
        projectSceneArchiveHistory(
            state,
        );
    const legacy =
        history.find(record =>
            record.id ===
            'legacy_scene');

    assert.equal(
        legacy.readOnly,
        true,
    );
    assert.deepEqual(
        legacy.calendarEntryIds,
        [],
    );
    assert.equal(
        Object.hasOwn(
            legacy,
            'authorQuillEn',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            legacy,
            'messageIds',
        ),
        false,
    );
    assert.deepEqual(
        projectCalendarRelatedScenes(
            state,
            'charms_exam',
        ),
        [],
    );
    const original =
        readSceneArchiveRecord(
            state,
            'legacy_scene',
        );
    assert.equal(
        original.authorQuillEn,
        'Original archive body.',
    );
    original.authorQuillEn =
        'mutated clone';
    assert.equal(
        state.sceneArchive[0]
            .authorQuillEn,
        'Original archive body.',
    );
    assert.doesNotMatch(
        JSON.stringify(
            state.calendar,
        ),
        /Original archive body/u,
    );
});

test('model and persistence failures leave Scene, clock, Calendar, archive and messages unchanged', async () => {
    for (const {
        mode,
        run,
    } of [{
            mode: 'model',
            run: workflow =>
                workflow.runCalendarMoment(
                    'charms_exam',
                ),
        }, {
            mode: 'save',
            run: workflow =>
                workflow.runTimelineMoment({
                    startClock:
                        TARGET_CLOCK,
                    mapId:
                        'hogwarts_castle',
                    roomId:
                        'black_lake_shore',
                }),
        }]) {
        const state =
            createState();
        const before =
            JSON.stringify(state);
        const harness =
            createWorkflowHarness(
                state,
                {
                    failModel:
                        mode ===
                        'model',
                    failSave:
                        mode ===
                        'save',
                },
            );
        await assert.rejects(
            run(
                harness.workflow,
            ),
            mode === 'model'
                ? /model unavailable/u
                : /disk failed/u,
        );
        assert.equal(
            JSON.stringify(state),
            before,
        );
        assert.equal(
            harness.calls
                .director.length,
            1,
            'Calendar Moment never retries the story model',
        );
        assert.equal(
            harness.calls
                .savedMessages
                .length,
            mode === 'save'
                ? 1
                : 0,
        );
    }
});

test('language-skipped Calendar and Timeline Moments stop before opening or persistence', async () => {
    for (const {
        label,
        run,
    } of [{
            label: 'Calendar',
            run: workflow =>
                workflow.runCalendarMoment(
                    'charms_exam',
                ),
        }, {
            label: 'Timeline',
            run: workflow =>
                workflow.runTimelineMoment({
                    startClock:
                        TARGET_CLOCK,
                    mapId:
                        'hogwarts_castle',
                    roomId:
                        'black_lake_shore',
                }),
        }]) {
        const state =
            createState();
        const before =
            JSON.stringify(state);
        const harness =
            createWorkflowHarness(
                state,
                {
                    languageSkipped: true,
                },
            );
        await assert.rejects(
            run(
                harness.workflow,
            ),
            error =>
                error?.code ===
                'language_skipped',
            `${label} Moment preserves the language-skip result`,
        );
        assert.equal(
            JSON.stringify(state),
            before,
            `${label} Moment leaves world State unchanged`,
        );
        assert.equal(
            harness.calls.director.length,
            1,
            `${label} Moment makes one director call`,
        );
        assert.equal(
            harness.calls.opening.length,
            0,
            `${label} Moment does not call Scene Opening`,
        );
        assert.equal(
            harness.calls.commits,
            0,
            `${label} Moment does not save`,
        );
        assert.deepEqual(
            harness.calls.phases,
            [
                'preparing',
                'archiving',
                'idle',
            ],
            `${label} Moment never advances to opening`,
        );
    }
});

test('Calendar and Timeline Moment pages sharing one revision allow only the first guarded commit', async () => {
    const storage =
        createStorage();
    const guard =
        createGuard(
            storage,
            'shared',
        );
    const pageA =
        createState();
    const pageB =
        structuredClone(pageA);
    guard.registerHead(pageA);
    const first =
        createWorkflowHarness(
            pageA,
            {
                guard,
            },
        );
    const second =
        createWorkflowHarness(
            pageB,
            {
                guard,
            },
        );
    const pageBBefore =
        JSON.stringify(pageB);

    const committed =
        await first.workflow
            .runCalendarMoment(
                'charms_exam',
            );
    await assert.rejects(
        second.workflow
            .runTimelineMoment({
                startClock:
                    TARGET_CLOCK,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'black_lake_shore',
            }),
        /刷新/u,
    );

    assert.equal(
        committed.stateRevision,
        7,
    );
    assert.equal(
        first.getPersisted()
            .stateRevision,
        7,
    );
    assert.equal(
        second.getPersisted(),
        null,
        'the stale page never reaches persistence',
    );
    assert.equal(
        JSON.stringify(pageB),
        pageBBefore,
    );
});

test('Calendar transition prompts expose only the selected schedule with public story sources and disable package repair retries', async () => {
    const state =
        createState();
    let requests = 0;
    let prompt = null;
    const workflow =
        createSceneTransitionWorkflow({
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
            extractRoleResponseText:
                response =>
                    response.content,
            formatRetrievedKnowledge:
                () => '',
            getContext: () => ({
                chat: [],
            }),
            parseJsonObject() {
                throw new Error(
                    'invalid response',
                );
            },
            projectActorLibraryForContext:
                () => [],
            async sendSceneTransitionRequest(
                _slot,
                requestPrompt,
            ) {
                requests += 1;
                prompt =
                    requestPrompt;
                return {
                    content: '{}',
                };
            },
        });
    const transitionContext = {
        kind:
            'calendar_moment',
        fixedClock:
            TARGET_CLOCK,
        fixedTransitionMinutes:
            60,
        suggestedDestination: {
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
        },
        targetEntry:
            state.calendar
                .entries[1],
        calendarEntries:
            state.calendar
                .entries
                .slice(1, 2),
        calendarStorySources: [{
            scheduleId:
                'charms_exam',
            storyBeat:
                state.calendar
                    .storyBeats[0],
            storyline:
                state.calendar
                    .storylines[0],
        }],
        noModelRetry: true,
    };

    await assert.rejects(
        workflow
            .generateSceneTransitionPackage(
                {
                    profileId:
                        'medium',
                },
                state,
                'medium',
                '',
                null,
                {
                    changed: true,
                },
                [],
                {
                    chapterMessageLimit:
                        10,
                },
                transitionContext,
            ),
        /invalid response/u,
    );
    assert.equal(
        requests,
        1,
    );
    const request =
        JSON.parse(
            prompt[1].content,
        );
    assert.deepEqual(
        request.calendarMoment
            .calendarEntries
            .map(entry =>
                entry.id),
        [
            'charms_exam',
        ],
    );
    assert.equal(
        request.calendarMoment
            .calendarStorySources[0]
            .storyBeat.id,
        'first_term_exam_beat',
    );
    assert.match(
        prompt[0].content,
        /suggestedDestination is context, not a binding destination/u,
    );
});

test('guarded state-and-chat transaction requires durable acknowledgement and keeps an unconfirmed host failure fenced', async () => {
    const createHost =
        shouldFail => {
            const state =
                createState();
            const snapshots = [];
            const context = {
                chatId:
                    'calendar-host',
                chatMetadata: {
                    hogwartsMud:
                        state,
                },
                chat: [{
                    mes: 'before',
                }],
                async saveMetadata() {
                    snapshots.push({
                        state:
                            structuredClone(
                                this
                                    .chatMetadata
                                    .hogwartsMud,
                            ),
                        chat:
                            structuredClone(
                                this.chat,
                            ),
                    });
                    if (shouldFail.value) {
                        throw new Error(
                            'host failed',
                        );
                    }
                    return {
                        durable: true,
                    };
                },
            };
            return {
                context,
                snapshots,
                state,
            };
        };
    const failure = {
        value: true,
    };
    const host =
        createHost(failure);
    const failureStorage =
        createStorage();
    const failureAdapter =
        createSaveRevisionStorageAdapter(
            failureStorage,
        );
    const ports =
        createGuardedSavePorts({
            getContext: () =>
                host.context,
            guard:
                createGuard(
                    failureStorage,
                    'host_failure',
                ),
        });
    await ports
        .registerSaveRevisionHead();
    const current =
        host.context
            .chatMetadata
            .hogwartsMud;
    const next =
        structuredClone(current);
    next.clock =
        TARGET_CLOCK;

    await assert.rejects(
        ports
            .guardedSaveTransaction({
                currentState:
                    current,
                nextState: next,
                source:
                    'calendar_moment',
                changedDomains: [
                    'calendar',
                    'scene',
                ],
                chatMessages: [{
                    mes: 'new scene',
                }],
            }),
        error => {
            assert.equal(
                error?.code,
                'host_save_not_durable',
            );
            assert.equal(
                error
                    ?.confirmedFailure,
                false,
            );
            assert.match(
                String(
                    error
                        ?.cause
                        ?.message,
                ),
                /host failed/u,
            );
            return true;
        },
    );
    assert.equal(
        ports
            .isSaveRevisionBlocked(),
        true,
    );
    assert.equal(
        host.context
            .chatMetadata
            .hogwartsMud
            .stateRevision,
        7,
    );
    assert.equal(
        host.context
            .chatMetadata
            .hogwartsMud
            .clock,
        TARGET_CLOCK,
    );
    assert.equal(
        host.context.chat
            .at(-1).mes,
        'new scene',
    );
    assert.deepEqual(
        failureAdapter.readHead(
            current.timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                current.timelineEpoch,
            stateRevision: 7,
            claimId:
                'host_failure_1',
            claimBaseRevision: 6,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );
    assert.equal(
        host.snapshots.length,
        1,
        'an unconfirmed host failure invokes the host exactly once',
    );

    const successHost =
        createHost({
            value: false,
        });
    const successPorts =
        createGuardedSavePorts({
            getContext: () =>
                successHost
                    .context,
            guard:
                createGuard(
                    createStorage(),
                    'host_success',
                ),
        });
    await successPorts
        .registerSaveRevisionHead();
    const successCurrent =
        successHost.context
            .chatMetadata
            .hogwartsMud;
    const successNext =
        structuredClone(
            successCurrent,
        );
    successNext.clock =
        TARGET_CLOCK;
    const result =
        await successPorts
            .guardedSaveTransaction({
                currentState:
                    successCurrent,
                nextState:
                    successNext,
                source:
                    'calendar_moment',
                changedDomains: [
                    'calendar',
                    'scene',
                ],
                chatMessages: [{
                    mes: 'new scene',
                }],
            });
    assert.equal(
        result.ok,
        true,
    );
    assert.equal(
        result.state
            .stateRevision,
        7,
    );
    assert.equal(
        successHost
            .snapshots.length,
        1,
        'a durable transaction invokes the host exactly once',
    );
    assert.equal(
        successHost.context
            .chat
            .at(-1).mes,
        'new scene',
    );
});

test('Calendar Moment commits after only model-task runtime revisions advance during its model calls', async () => {
    const baseline =
        createState();
    const runtimeAdvanced =
        structuredClone(baseline);
    runtimeAdvanced.modelTaskRuntime = {
        byTaskId: {
            scene_transition: {
                attempted: 1,
                succeeded: 1,
            },
        },
    };
    runtimeAdvanced.stateRevision = 7;
    runtimeAdvanced.revisionHistory = [{
        id: 'runtime_7',
        baseRevision: 6,
        revision: 7,
        source: 'model_task_runtime',
        committedAt:
            '1991-09-03T10:30:00.000Z',
        changedDomains: [
            'model_task_runtime',
        ],
    }];
    const context = {
        chatId:
            'calendar-runtime-rebase',
        chatMetadata: {
            hogwartsMud:
                runtimeAdvanced,
        },
        chat: [],
        async saveMetadata() {
            return {
                durable: true,
            };
        },
    };
    const ports =
        createGuardedSavePorts({
            getContext: () => context,
            guard:
                createGuard(
                    createStorage(),
                    'calendar_runtime_rebase',
                ),
        });
    await ports
        .registerSaveRevisionHead();
    const next =
        structuredClone(baseline);
    next.clock =
        TARGET_CLOCK;

    const result =
        await ports
            .guardedSaveTransaction({
                currentState: baseline,
                nextState: next,
                source:
                    'calendar_moment',
                changedDomains: [
                    'calendar',
                    'clock',
                    'scene',
                ],
                chatMessages: [{
                    mes: 'new scene',
                }],
            });

    assert.equal(result.ok, true);
    assert.equal(
        result.state.stateRevision,
        8,
    );
    assert.equal(
        result.state.clock,
        TARGET_CLOCK,
    );
    assert.deepEqual(
        result.state.modelTaskRuntime,
        runtimeAdvanced.modelTaskRuntime,
    );
    assert.equal(
        context.chat.at(-1).mes,
        'new scene',
    );
});

test('a failed post-commit High refresh blocks Medium fallback without changing Calendar Moment success', async () => {
    const committedState = {
        ...createState(),
        clock:
            TARGET_CLOCK,
        stateRevision: 7,
        sceneTransition: {
            status: 'idle',
            tier: 'high',
        },
        dailyDirector: {
            date: '1991-09-03',
            status: 'ready',
        },
    };
    const horizon =
        committedState
            .calendar.horizon;
    let mediumCalls = 0;

    const result =
        await finalizeCalendarMomentPostCommit({
            committedState,
            previousClock:
                CURRENT_CLOCK,
            getMudState: () =>
                committedState,
            getWorldDate: clock =>
                clock.slice(0, 10),
            runHighCalendarDirectorSafely:
                async () => ({
                    status: 'failed',
                }),
            runMediumCalendarDirectorSafely:
                async () => {
                    mediumCalls += 1;
                    return {
                        status: 'committed',
                    };
                },
            ensureDailyDirectorPlan:
                async () => {
                    throw new Error(
                        'current Daily plan should not refresh',
                    );
                },
        });

    assert.equal(
        result,
        committedState,
    );
    assert.equal(
        mediumCalls,
        0,
        'horizon insufficiency must not turn a failed High refresh into Medium planning',
    );
    assert.equal(
        result.calendar.horizon,
        horizon,
    );
    assert.equal(
        result.sceneTransition
            .status,
        'idle',
    );
});

test('Calendar Moment post-commit has no retired Daily Director hook', async () => {
    const committedState = {
        ...createState(),
        clock:
            TARGET_CLOCK,
        stateRevision: 7,
    };
    const warnings = [];
    let dailyCalls = 0;

    const result =
        await finalizeCalendarMomentPostCommit({
            committedState,
            previousClock:
                CURRENT_CLOCK,
            getMudState: () =>
                committedState,
            runHighCalendarDirectorSafely:
                async () => ({
                    status: 'skipped',
                }),
            runMediumCalendarDirectorSafely:
                async () => ({
                    status: 'skipped',
                }),
            ensureDailyDirectorPlan:
                async () => {
                    dailyCalls += 1;
                },
            warn: (...args) => {
                warnings.push(args);
            },
        });

    assert.equal(
        result,
        committedState,
        'the already committed operation remains the returned success state',
    );
    assert.equal(
        result.stateRevision,
        7,
    );
    assert.equal(
        result.clock,
        TARGET_CLOCK,
    );
    assert.equal(
        result.sceneTransition
            .status,
        'idle',
    );
    assert.equal(
        Object.hasOwn(
            result,
            'calendarMoment',
        ),
        false,
        'post-commit model failure must not create a misleading Calendar Moment failure marker',
    );
    assert.equal(
        warnings.length,
        0,
    );
    assert.equal(
        dailyCalls,
        0,
    );
});
