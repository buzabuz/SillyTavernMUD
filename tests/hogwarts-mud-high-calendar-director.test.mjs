/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    createGuardedSavePorts,
} from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import {
    createSaveRevisionGuard,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import {
    finalizeCalendarMomentPostCommit,
} from '../public/scripts/extensions/hogwarts-mud/workflows/application.js';
import {
    createHighCalendarDirectorPrompt,
    createHighCalendarDirectorWorkflow,
    projectHighCalendarDirectorContext,
    validateHighCalendarDirectorProposal,
} from '../public/scripts/extensions/hogwarts-mud/workflows/high-calendar-director.js';

const CURRENT_CLOCK =
    '1991-09-03 · 10:30';
const ACTOR_ID =
    'canon_hermione_jean_granger';
const STORYLINE_ID =
    'tina_secret_storyline';

const TERM_WINDOWS = [
    [
        'year_1_autumn',
        '1991-09-03 · 10:30',
        '1991-12-20 · 20:00',
    ],
    [
        'year_1_spring',
        '1992-01-06 · 08:00',
        '1992-06-20 · 20:00',
    ],
    [
        'year_2_autumn',
        '1992-09-01 · 08:00',
        '1992-12-20 · 20:00',
    ],
    [
        'year_2_spring',
        '1993-01-06 · 08:00',
        '1993-06-20 · 20:00',
    ],
    [
        'year_3_autumn',
        '1993-09-01 · 08:00',
        '1993-12-20 · 20:00',
    ],
    [
        'year_3_spring',
        '1994-01-06 · 08:00',
        '1994-06-20 · 20:00',
    ],
    [
        'year_4_autumn',
        '1994-09-01 · 08:00',
        '1994-12-20 · 20:00',
    ],
    [
        'year_4_spring',
        '1995-01-06 · 08:00',
        '1995-06-20 · 20:00',
    ],
];

function createStorage() {
    const values =
        new Map();
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

function createStoryline(
    id = STORYLINE_ID,
    patch = {},
) {
    return {
        id,
        title:
            '蒂娜的秘密',
        titleEn:
            'Tina Secret',
        summary:
            '一条跨越四学年的公开成长线。',
        summaryEn:
            'A public growth storyline spanning four school years.',
        tags: [
            'school',
            'mystery',
        ],
        startClock:
            CURRENT_CLOCK,
        endClock:
            '1995-06-20 · 20:00',
        participantIds: [
            ACTOR_ID,
        ],
        status: 'planned',
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        ...patch,
    };
}

function createBeat(
    sequence,
    patch = {},
) {
    const [
        termKey,
        windowStartClock,
        windowEndClock,
    ] = TERM_WINDOWS[
        sequence - 1
    ] || TERM_WINDOWS[0];
    return {
        id:
            `${STORYLINE_ID}_beat_${
                sequence
            }`,
        storylineId:
            STORYLINE_ID,
        title:
            `第 ${sequence} 学期节奏`,
        titleEn:
            `Term ${sequence} Beat`,
        summary:
            `第 ${sequence} 学期推进公开剧情方向。`,
        summaryEn:
            `Term ${sequence} advances the public story direction.`,
        tags: [
            'school',
        ],
        termKey,
        sequence,
        windowStartClock,
        windowEndClock,
        sceneTarget: 4,
        status: 'planned',
        relatedSceneIds: [],
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        ...patch,
    };
}

function createFourYearBeats() {
    return TERM_WINDOWS.map(
        (_window, index) =>
            createBeat(
                index + 1,
            ),
    );
}

function createSchedule(
    id,
    patch = {},
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        title:
            `公开日程 ${id}`,
        titleEn:
            `Public schedule ${id}`,
        summary:
            `${id} 的玩家可见摘要。`,
        summaryEn:
            `Player-visible summary for ${id}.`,
        tags: [],
        startClock:
            '1991-09-04 · 10:00',
        endClock:
            '1991-09-04 · 11:00',
        participantIds: [
            ACTOR_ID,
        ],
        mapId: 'test_map',
        roomId: 'test_room',
        status: 'planned',
        planningTier: 'medium',
        relatedSceneIds: [],
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        sourceBeatId: '',
        beatSlot: null,
        scheduleKind: 'story',
        ...patch,
    };
}

function createState(
    calendarPatch = {},
    statePatch = {},
) {
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'timeline_high_calendar_v2',
        stateRevision: 7,
        revisionHistory: [],
        phase: 'playing',
        clock: CURRENT_CLOCK,
        modelSlots: {},
        calendar: {
            version: 2,
            storylines: [],
            storyBeats: [],
            entries: [],
            horizon:
                CURRENT_CLOCK,
            ...calendarPatch,
        },
        directorFoundation: {
            status: 'ready',
            committedAt:
                'foundation_commit',
        },
        actorLibrary: [{
            id: ACTOR_ID,
            name:
                '赫敏·格兰杰',
            nameEn:
                'Hermione Granger',
            role:
                '学生',
            roleEn:
                'Student',
            privateGoalEn:
                'Win every private argument.',
            identity:
                normalizeNpcIdentity(),
        }],
        actors: [{
            id: ACTOR_ID,
            present: true,
        }],
        map: {
            customLocalMaps: [{
                id: 'test_map',
                nodes: [{
                    id: 'test_room',
                    name:
                        '测试房间',
                    nameEn:
                        'Test Room',
                }],
            }],
            generatedLocalNodes: [],
        },
        scene: {
            id: 'current_scene',
            name:
                '当前场景',
            nameEn:
                'Current Scene',
            summary:
                '公开场景摘要。',
            summaryEn:
                'Public scene summary.',
            mapId: 'test_map',
            roomId: 'test_room',
            startedClock:
                '1991-09-03 · 09:00',
        },
        sceneArchive: [],
        conflict: {
            title:
                '公开冲突',
            titleEn:
                'Public Conflict',
            premise:
                '一场公开竞争。',
            premiseEn:
                'A public competition.',
        },
        storyArcs: [{
            id: 'hidden_arc',
            privateGoalEn:
                'Secretly isolate the prefect.',
            hiddenTruthEn:
                'The prefect planted the forged timetable.',
            cluePlan: [{
                hiddenFactEn:
                    'A silver pin proves the prefect lied.',
                unlockConditionEn:
                    'Search the locked desk after midnight.',
            }],
        }],
        pacingDirector: {
            status: 'ready',
            pendingBeat: {
                id:
                    'single_turn_intervention',
                status: 'pending',
                instructionEn:
                    'Interrupt this turn with a visible owl.',
            },
        },
        items: [{
            id: 'foundation_item',
        }],
        socialGraph: {
            version: 2,
        },
        ...statePatch,
    };
}

function createProposal(
    state,
    storylines,
    storyBeats,
    patch = {},
) {
    return {
        baseTimelineEpoch:
            state.timelineEpoch,
        baseStateRevision:
            state.stateRevision,
        storylines,
        storyBeats,
        ...patch,
    };
}

function withoutCalendar(
    state,
) {
    const copy =
        structuredClone(state);
    delete copy.calendar;
    return copy;
}

function createHarness(
    state,
    responses,
    {
        saveError = null,
        consumeRevisionOnSave =
        false,
        useRealGuard = false,
    } = {},
) {
    let claim = 0;
    const calls = [];
    const saves = [];
    const context = {
        chatId:
            'high-calendar-v2-test',
        chatMetadata: {
            hogwartsMud:
                state,
        },
        saveMetadata:
            async options => {
                saves.push(
                    options,
                );
                if (saveError) {
                    throw saveError;
                }
                if (
                    consumeRevisionOnSave &&
                    options
                        ?.consumeRevision
                ) {
                    const current =
                        context
                            .chatMetadata
                            .hogwartsMud;
                    context.chatMetadata
                        .hogwartsMud = {
                            ...current,
                            stateRevision:
                                current
                                    .stateRevision +
                                1,
                        };
                }
                return {
                    durable: true,
                };
            },
    };
    const savePorts =
        useRealGuard
            ? createGuardedSavePorts({
                getContext:
                    () => context,
                guard:
                    createSaveRevisionGuard({
                        storage:
                            createStorage(),
                        lockManager: null,
                        createClaimId:
                            () =>
                                `high_calendar_claim_${
                                    claim += 1
                                }`,
                        now:
                            () =>
                                '1991-09-03T10:30:00.000Z',
                    }),
            })
            : null;
    const workflow =
        createHighCalendarDirectorWorkflow({
            buildMapAuthorityContext:
                () => ({
                    maps: [{
                        id:
                            'test_map',
                        rooms: [
                            'test_room',
                        ],
                    }],
                }),
            extractRoleResponseText:
                response =>
                    response.content,
            getContext: () =>
                savePorts
                    ?.getContext() ||
                context,
            getMudState: () =>
                context.chatMetadata
                    .hogwartsMud,
            jobRegistry: {},
            parseJsonObject:
                value =>
                    JSON.parse(value),
            renderAll: () => {},
            resolveRoleSlots:
                () => ({
                    high: {
                        profileId:
                            'high_profile',
                    },
                    medium: {
                        profileId:
                            'medium_profile',
                    },
                }),
            sendRoleRequest:
                async (
                    roleSlot,
                    prompt,
                ) => {
                    calls.push({
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
        savePorts,
        saves,
        workflow,
    };
}

test('[defect-probing] Foundation commits one four-year storyline with eight ordered term beats and no schedules', async () => {
    const state =
        createState();
    const storyline =
        createStoryline();
    const storyBeats =
        createFourYearBeats();
    const proposal =
        createProposal(
            state,
            [
                storyline,
            ],
            storyBeats,
        );
    const harness =
        createHarness(
            state,
            [
                proposal,
            ],
        );
    const before =
        structuredClone(state);

    const result =
        await harness.workflow
            .runHighCalendarDirector({
                trigger:
                    'foundation',
            });

    assert.equal(
        result.status,
        'committed',
    );
    const calendar =
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar;
    assert.deepEqual(
        calendar.storylines,
        [
            storyline,
        ],
    );
    assert.deepEqual(
        calendar.storyBeats
            .map(beat => ({
                termKey:
                    beat.termKey,
                sequence:
                    beat.sequence,
                sceneTarget:
                    beat.sceneTarget,
            })),
        storyBeats.map(beat => ({
            termKey:
                beat.termKey,
            sequence:
                beat.sequence,
            sceneTarget:
                4,
        })),
    );
    assert.equal(
        new Set(
            calendar.storyBeats
                .map(beat =>
                    beat.termKey),
        ).size,
        8,
    );
    assert.deepEqual(
        calendar.entries,
        [],
    );
    assert.deepEqual(
        withoutCalendar(
            harness.context
                .chatMetadata
                .hogwartsMud,
        ),
        withoutCalendar(
            before,
        ),
        'High planning writes only Calendar storyline and storyBeat collections',
    );
    assert.deepEqual(
        harness.saves,
        [{
            source:
                'calendar_high_director',
            changedDomains: [
                'calendar',
            ],
            consumeRevision:
                true,
        }],
    );
});

test('[defect-probing] High prompt and validator accept only the V2 typed storyline/storyBeat proposal', () => {
    const state =
        createState();
    const valid =
        createProposal(
            state,
            [
                createStoryline(),
            ],
            createFourYearBeats(),
        );
    const validation =
        validateHighCalendarDirectorProposal(
            valid,
            state,
            {
                trigger:
                    'foundation',
            },
        );
    assert.equal(
        validation.valid,
        true,
        validation.errors.join('；'),
    );

    const overreachingProposals = [{
        field: 'entries',
        proposal: {
            ...valid,
            entries: [
                createSchedule(
                    'high_overreach',
                    {
                        planningTier:
                            'high',
                    },
                ),
            ],
        },
    }, ...[
        'mapId',
        'roomId',
        'scene',
        'sceneId',
    ].map(field => ({
        field,
        proposal: {
            ...valid,
            storylines: [{
                ...valid
                    .storylines[0],
                [field]:
                    'forbidden',
            }],
        },
    }))];
    for (
        const {
            field,
            proposal,
        } of overreachingProposals
    ) {
        const rejected =
            validateHighCalendarDirectorProposal(
                proposal,
                state,
                {
                    trigger:
                        'foundation',
                },
            );
        assert.equal(
            rejected.valid,
            false,
            `${field} must be rejected`,
        );
        assert.match(
            rejected.errors
                .join('；'),
            /未知字段/u,
        );
    }

    const prompt =
        createHighCalendarDirectorPrompt(
            state,
            {
                trigger:
                    'foundation',
            },
        );
    assert.match(
        prompt[0].content,
        /storylines[\s\S]*storyBeats/u,
    );
    assert.match(
        prompt[0].content,
        /sceneTarget[\s\S]*4/u,
    );
    assert.doesNotMatch(
        prompt[0].content,
        /"entries"|"mapId"|"roomId"|"sceneId"/u,
    );
});

test('[defect-probing] a grandfathered V1 High schedule does not make V2 Foundation skip missing storylines', async () => {
    const legacySchedule =
        createSchedule(
            'grandfathered_high_event',
            {
                planningTier:
                    'high',
            },
        );
    const state =
        createState({
            entries: [
                legacySchedule,
            ],
        });
    const proposal =
        createProposal(
            state,
            [
                createStoryline(),
            ],
            createFourYearBeats(),
        );
    const harness =
        createHarness(
            state,
            [
                proposal,
            ],
        );

    const result =
        await harness.workflow
            .runHighCalendarDirector({
                trigger:
                    'foundation',
            });

    assert.equal(
        result.status,
        'committed',
    );
    assert.equal(
        harness.calls.length,
        1,
    );
    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar.entries,
        [
            legacySchedule,
        ],
    );
    assert.equal(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar.storyBeats
            .length,
        8,
    );
});

test('[defect-probing] high-tier refresh sees and updates only current or future beats while preserving realized history and schedules', async () => {
    const storyline =
        createStoryline();
    const realized =
        createBeat(
            1,
            {
                status: 'realized',
                relatedSceneIds: [
                    'archive_1',
                    'archive_2',
                    'archive_3',
                    'archive_4',
                ],
            },
        );
    const current =
        createBeat(
            2,
            {
                windowStartClock:
                    '1991-09-01 · 08:00',
                windowEndClock:
                    '1991-12-20 · 20:00',
            },
        );
    const future =
        createBeat(
            3,
            {
                windowStartClock:
                    '1992-01-06 · 08:00',
                windowEndClock:
                    '1992-06-20 · 20:00',
            },
        );
    const schedule =
        createSchedule(
            'existing_medium_schedule',
        );
    const sceneArchive = [
        1,
        2,
        3,
        4,
    ].map(index => ({
        id:
            `archive_${index}`,
        tier:
            index === 4
                ? 'high'
                : 'medium',
        endedClock:
            `1991-09-0${index} · 09:00`,
    }));
    const state =
        createState(
            {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    realized,
                    current,
                    future,
                ],
                entries: [
                    schedule,
                ],
            },
            {
                sceneArchive,
            },
        );
    const updatedCurrent = {
        ...current,
        summary:
            '重大转折后，当前学期进入公开的新阶段。',
        summaryEn:
            'After the major turn, the current term enters a new public phase.',
        updatedClock:
            CURRENT_CLOCK,
    };
    const proposal =
        createProposal(
            state,
            [],
            [
                updatedCurrent,
            ],
        );
    const harness =
        createHarness(
            state,
            [
                proposal,
            ],
        );
    const beforeScene =
        structuredClone(
            state.scene,
        );
    const beforePacing =
        structuredClone(
            state.pacingDirector,
        );

    await harness.workflow
        .runHighCalendarDirector({
            trigger:
                'high_transition',
        });

    const committed =
        harness.context
            .chatMetadata
            .hogwartsMud;
    assert.deepEqual(
        committed.calendar
            .storyBeats[0],
        realized,
    );
    assert.equal(
        committed.calendar
            .storyBeats[1]
            .summary,
        updatedCurrent.summary
            .normalize('NFKC'),
    );
    assert.deepEqual(
        committed.calendar
            .storyBeats[2],
        future,
    );
    assert.deepEqual(
        committed.calendar.entries,
        [
            schedule,
        ],
    );
    assert.deepEqual(
        committed.scene,
        beforeScene,
    );
    assert.deepEqual(
        committed.pacingDirector,
        beforePacing,
    );

    const projected =
        projectHighCalendarDirectorContext(
            state,
            {
                trigger:
                    'high_transition',
            },
        );
    assert.deepEqual(
        projected
            .currentAndFutureStoryBeats
            .map(beat =>
                beat.id),
        [
            current.id,
            future.id,
        ],
    );
    assert.deepEqual(
        projected
            .currentAndFutureStorylines
            .map(entry =>
                entry.id),
        [
            storyline.id,
        ],
    );
    assert.equal(
        Object.hasOwn(
            projected,
            'currentAndFutureHighEntries',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            projected,
            'pacingDirector',
        ),
        false,
    );
    assert.equal(
        JSON.stringify(
            projected,
        ).includes(
            'single_turn_intervention',
        ),
        false,
    );
});

test('High refresh rejects realized and elapsed beat rewrites without mutating state', () => {
    const storyline =
        createStoryline();
    const realized =
        createBeat(
            1,
            {
                status: 'realized',
                relatedSceneIds: [
                    'archive_1',
                    'archive_2',
                    'archive_3',
                    'archive_4',
                ],
            },
        );
    const elapsedDeferred =
        createBeat(
            2,
            {
                status: 'deferred',
                windowStartClock:
                    '1991-08-01 · 08:00',
                windowEndClock:
                    '1991-08-31 · 20:00',
            },
        );
    const state =
        createState(
            {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    realized,
                    elapsedDeferred,
                ],
            },
            {
                sceneArchive: [
                    1,
                    2,
                    3,
                    4,
                ].map(index => ({
                    id:
                        `archive_${index}`,
                })),
            },
        );
    const before =
        structuredClone(state);

    for (const beat of [
        realized,
        elapsedDeferred,
    ]) {
        const validation =
            validateHighCalendarDirectorProposal(
                createProposal(
                    state,
                    [],
                    [{
                        ...beat,
                        summary:
                            '试图改写已经固定的节奏。',
                        updatedClock:
                            CURRENT_CLOCK,
                    }],
                ),
                state,
                {
                    trigger:
                        'high_transition',
                },
            );
        assert.equal(
            validation.valid,
            false,
        );
        assert.match(
            validation.errors
                .join('；'),
            /终结|过去|窗口已经结束|当前或未来/u,
        );
    }
    assert.deepEqual(
        state,
        before,
    );
});

test('[defect-probing] High typed records retain hidden-information and Actor Admission Identity gates', () => {
    const state =
        createState();
    const hiddenStoryline =
        createStoryline(
            STORYLINE_ID,
            {
                summaryEn:
                    state.storyArcs[0]
                        .hiddenTruthEn,
            },
        );
    const hidden =
        validateHighCalendarDirectorProposal(
            createProposal(
                state,
                [
                    hiddenStoryline,
                ],
                createFourYearBeats(),
            ),
            state,
            {
                trigger:
                    'high_transition',
            },
        );
    assert.equal(
        hidden.valid,
        false,
    );
    assert.match(
        hidden.errors.join('；'),
        /隐藏 storyArc/u,
    );

    const rejectedStates = [
        createState(
            {},
            {
                actorLibrary: [{
                    id: ACTOR_ID,
                    identity:
                        normalizeNpcIdentity(),
                }],
                actors: [{
                    id: ACTOR_ID,
                    temporary: true,
                }],
            },
        ),
        createState(
            {},
            {
                actorLibrary: [{
                    id: ACTOR_ID,
                    identity: null,
                }],
            },
        ),
        createState(
            {},
            {
                actors: [{
                    id: ACTOR_ID,
                    temporary: true,
                }],
            },
        ),
    ];
    rejectedStates.forEach(
        rejectedState => {
            const validation =
                validateHighCalendarDirectorProposal(
                    createProposal(
                        rejectedState,
                        [
                            createStoryline(),
                        ],
                        createFourYearBeats(),
                    ),
                    rejectedState,
                    {
                        trigger:
                            'high_transition',
                    },
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
        },
    );
});

test('long-term storyBeats remain isolated from pacingDirector.pendingBeat across prompt and commit', async () => {
    const state =
        createState();
    const pendingBefore =
        structuredClone(
            state.pacingDirector
                .pendingBeat,
        );
    const proposal =
        createProposal(
            state,
            [
                createStoryline(),
            ],
            createFourYearBeats(),
        );
    const harness =
        createHarness(
            state,
            [
                proposal,
            ],
        );

    await harness.workflow
        .runHighCalendarDirector({
            trigger:
                'foundation',
        });

    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .pacingDirector
            .pendingBeat,
        pendingBefore,
    );
    const promptContext =
        JSON.parse(
            harness.calls[0]
                .prompt[1].content,
        );
    assert.equal(
        Object.hasOwn(
            promptContext,
            'pacingDirector',
        ),
        false,
    );
    assert.equal(
        JSON.stringify(
            promptContext,
        ).includes(
            pendingBefore.id,
        ),
        false,
    );
    assert.match(
        harness.calls[0]
            .prompt[0].content,
        /pendingBeat[\s\S]*never consume|never consume[\s\S]*pendingBeat/iu,
    );
});

test('model and durable save failures preserve Calendar, Foundation, transition, Scene and pendingBeat', async () => {
    const state =
        createState();
    const before =
        structuredClone(state);
    const invalid = {
        baseTimelineEpoch:
            state.timelineEpoch,
        baseStateRevision:
            state.stateRevision,
        entries: [],
    };
    const modelFailure =
        createHarness(
            state,
            [
                invalid,
                invalid,
            ],
        );
    const failedPlan =
        await modelFailure
            .workflow
            .runHighCalendarDirectorSafely({
                trigger:
                    'foundation',
            });
    assert.equal(
        failedPlan.status,
        'failed',
    );
    assert.deepEqual(
        modelFailure.context
            .chatMetadata
            .hogwartsMud,
        before,
    );
    assert.equal(
        modelFailure.saves.length,
        0,
    );
    assert.equal(
        modelFailure.calls.every(call =>
            call.roleSlot
                .profileId ===
            'high_profile'),
        true,
        'High planning never downgrades to medium',
    );

    const transitionState =
        createState(
            {},
            {
                sceneArchive: [{
                    id:
                        'committed_transition',
                    tier: 'high',
                    endedClock:
                        CURRENT_CLOCK,
                }],
            },
        );
    const transitionBefore =
        structuredClone(
            transitionState,
        );
    const proposal =
        createProposal(
            transitionState,
            [
                createStoryline(),
            ],
            createFourYearBeats(),
        );
    const saveFailure =
        createHarness(
            transitionState,
            [
                proposal,
            ],
            {
                saveError:
                    new Error(
                        'disk unavailable',
                    ),
            },
        );
    const failedSave =
        await saveFailure
            .workflow
            .runHighCalendarDirectorSafely({
                trigger:
                    'high_transition',
            });
    assert.equal(
        failedSave.status,
        'failed',
    );
    assert.deepEqual(
        saveFailure.context
            .chatMetadata
            .hogwartsMud,
        transitionBefore,
    );
});

test('empty high_transition typed proposal consumes its base revision once through the real save guard', async () => {
    const state =
        createState();
    const emptyProposal =
        createProposal(
            state,
            [],
            [],
        );
    const harness =
        createHarness(
            state,
            [
                emptyProposal,
                emptyProposal,
                emptyProposal,
            ],
            {
                useRealGuard: true,
            },
        );
    await harness.savePorts
        .registerSaveRevisionHead(
            harness.context,
            {
                persistMigration:
                    false,
            },
        );

    const first =
        await harness.workflow
            .runHighCalendarDirector({
                trigger:
                    'high_transition',
            });

    assert.equal(
        first.status,
        'committed',
    );
    assert.equal(
        harness.context
            .chatMetadata
            .hogwartsMud
            .stateRevision,
        state.stateRevision + 1,
    );
    assert.deepEqual(
        harness.context
            .chatMetadata
            .hogwartsMud
            .calendar,
        state.calendar,
    );
    assert.equal(
        harness.saves.length,
        1,
    );

    await assert.rejects(
        harness.workflow
            .runHighCalendarDirector({
                trigger:
                    'high_transition',
            }),
        /stateRevision 已陈旧/u,
    );
    assert.equal(
        harness.saves.length,
        1,
    );
});

test('application starts High only after committed Foundation or high transition and never invokes Medium after High failure', async () => {
    const [
        applicationSource,
        openingSource,
        transitionSource,
    ] = await Promise.all([
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/application.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/opening.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js',
                import.meta.url,
            ),
            'utf8',
        ),
    ]);
    assert.match(
        applicationSource,
        /await ensureDirectorFoundationBase\(\);[\s\S]*?directorFoundation[\s\S]*?await runHighCalendarDirectorSafely\(\{[\s\S]*?trigger: 'foundation'/u,
    );
    assert.match(
        applicationSource,
        /await initializeOpeningWorldBase\(\);[\s\S]*?directorFoundation[\s\S]*?await runHighCalendarDirectorSafely\(\{[\s\S]*?trigger: 'foundation'/u,
    );
    assert.match(
        applicationSource,
        /await runSceneTransitionBase\([\s\S]*?options,[\s\S]*?\);[\s\S]*?options\.tier ===[\s\S]*?'high'[\s\S]*?trigger:[\s\S]*?'high_transition'/u,
    );
    assert.match(
        openingSource,
        /context\.chatMetadata\.hogwartsMud = applyDirectorFoundation/u,
    );
    assert.match(
        transitionSource,
        /const nextState = applySceneTransition/u,
    );

    let mediumCalls = 0;
    let dailyCalls = 0;
    const committedState =
        createState(
            {},
            {
                sceneTransition: {
                    tier: 'high',
                    status: 'settled',
                },
                dailyDirector: {
                    date:
                        CURRENT_CLOCK.slice(
                            0,
                            10,
                        ),
                },
            },
        );
    const result =
        await finalizeCalendarMomentPostCommit({
            committedState,
            previousClock:
                '1991-09-03 · 09:00',
            getMudState:
                () => committedState,
            getWorldDate:
                clock =>
                    clock.slice(
                        0,
                        10,
                    ),
            runHighCalendarDirectorSafely:
                async () => ({
                    status: 'failed',
                    state:
                        committedState,
                }),
            runMediumCalendarDirectorSafely:
                async () => {
                    mediumCalls += 1;
                },
            ensureDailyDirectorPlan:
                async () => {
                    dailyCalls += 1;
                },
        });
    assert.equal(
        result,
        committedState,
    );
    assert.equal(
        mediumCalls,
        0,
    );
    assert.equal(
        dailyCalls,
        0,
    );
});
