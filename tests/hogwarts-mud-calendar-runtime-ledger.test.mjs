/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    archiveSceneWithCalendarLinks,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-scene.js';
import {
    createGuardedSavePorts,
} from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import {
    createModelEventScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    createSaveRevisionGuard,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import {
    createCalendarMomentWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/calendar-moment.js';

const CURRENT_CLOCK =
    '1991-09-03 · 10:00';
const TARGET_CLOCK =
    '1991-09-03 · 11:00';
const END_CLOCK =
    '1991-09-03 · 12:00';
const PLAYER_ID =
    'canon_harry_james_potter';

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
            `Scheduled event ${id}.`,
        tags: [],
        startClock:
            TARGET_CLOCK,
        endClock:
            END_CLOCK,
        participantIds: [
            PLAYER_ID,
        ],
        mapId:
            'hogwarts_castle',
        roomId:
            'great_hall',
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
            'current_activity',
            {
                startClock:
                    '1991-09-03 · 09:00',
                endClock:
                    '1991-09-03 · 10:45',
                roomId:
                    'charms_classroom',
                status: 'active',
            },
        );
    const targetEntry =
        createEntry(
            'great_hall_moment',
        );
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'calendar_runtime_ledger',
        stateRevision: 341,
        revisionHistory: [],
        phase: 'playing',
        clock: CURRENT_CLOCK,
        calendar: {
            version: 3,
            storylines: [],
            storyBeats: [],
            entries: [
                currentEntry,
                targetEntry,
            ],
            horizon:
                '1991-09-17 · 10:00',
        },
        actorLibrary: [{
            id: PLAYER_ID,
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
                }],
            }],
            generatedLocalNodes: [],
        },
        sceneArchive: [],
        scene: {
            id: 'current_scene',
            nameEn: 'Charms Classroom',
            summaryEn:
                'A lesson is ending.',
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
        nextClock: TARGET_CLOCK,
        closureSummaryEn:
            'The lesson concludes before lunch.',
        authorQuillEn:
            'The classroom gives way to a warmer room.',
        unresolvedThreadsEn: [],
        nextScene: {
            id:
                'great_hall_runtime_ledger',
            nameEn: 'Great Hall',
            summaryEn:
                'The hall opens around the next scheduled moment.',
            chapterEn:
                'A Scheduled Noon',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
            actorStates: [],
            openingSegments: [{
                type:
                    'narration',
                textEn:
                    'The Great Hall carries the sound of lunch.',
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

function createRoleSlots() {
    return {
        low: {
            role: 'low',
            profileId:
                'low-profile',
            contextSize: 120000,
            maxResponseLength: 12000,
        },
        medium: {
            role: 'medium',
            profileId:
                'medium-profile',
            contextSize: 120000,
            maxResponseLength: 12000,
        },
        high: {
            role: 'high',
            profileId:
                'high-profile',
            contextSize: 120000,
            maxResponseLength: 12000,
        },
    };
}

async function createCalendarRuntimeHarness(
    {
        injectWorldRevision =
        false,
    } = {},
) {
    const snapshots = [];
    const context = {
        chatId:
            'calendar-runtime-ledger',
        chatMetadata: {
            hogwartsMud:
                createState(),
        },
        chat: [],
        async saveMetadata() {
            snapshots.push({
                state:
                    structuredClone(
                        this.chatMetadata
                            .hogwartsMud,
                    ),
                chat:
                    structuredClone(
                        this.chat,
                    ),
            });
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
                    'calendar_runtime_ledger',
                ),
        });
    await ports
        .registerSaveRevisionHead();

    const calls = {
        runtimeSaves: 0,
        schedulerRequests: 0,
    };
    const scheduler =
        createModelEventScheduler({
            getState: () =>
                context
                    .chatMetadata
                    .hogwartsMud,
            getRuntimeMaximumCharacters:
                () => 240000,
            invokeRole:
                async () => {
                    calls.schedulerRequests += 1;
                    return {
                        local:
                            'deterministic',
                    };
                },
            persistRuntime:
                async () => {
                    const live =
                        ports.getContext();
                    await live.saveMetadata({
                        source:
                            'model_task_runtime',
                        changedDomains: [
                            'model_task_runtime',
                        ],
                    });
                    calls.runtimeSaves += 1;
                    if (
                        injectWorldRevision &&
                        calls.runtimeSaves === 1
                    ) {
                        const updated =
                            ports.getContext();
                        updated.chatMetadata
                            .hogwartsMud.clock =
                            '1991-09-03 · 10:15';
                        await updated.saveMetadata({
                            source:
                                'turn',
                            changedDomains: [
                                'clock',
                            ],
                        });
                    }
                },
        });
    const sendSceneTransition =
        scheduler.createRoleRequest(
            'scene_transition',
            {
                eventType:
                    'scene.close_requested',
                emittedBy:
                    'scene.transition',
                tier: 'medium',
            },
        );
    const sendSceneOpening =
        scheduler.createRoleRequest(
            'scene_opening',
            {
                eventType:
                    'scene.transition_committed',
                emittedBy:
                    'scene.transition',
                tier: 'low',
            },
        );
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
                            payload.nextScene
                                .id,
                        nameEn:
                            payload.nextScene
                                .nameEn,
                        summaryEn:
                            payload.nextScene
                                .summaryEn,
                        startedClock:
                            payload.nextClock,
                        startedMessageId:
                            options
                                .startedMessageId,
                        timelineEntries: [],
                        mapId:
                            payload.nextScene
                                .mapId,
                        roomId:
                            payload.nextScene
                                .roomId,
                        calendarEntryIds:
                            options
                                .calendarEntryIds,
                        nextSceneIntent:
                            payload.nextScene
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
                        payload.authorQuillEn,
                    messageIds: [
                        0,
                    ],
                    startedClock:
                        current.scene
                            .startedClock,
                    endedClock:
                        current.clock,
                    mapId:
                        current.scene
                            .mapId,
                    roomId:
                        current.scene
                            .roomId,
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
                        payload.nextScene
                            .openingSegments[0]
                            .textEn,
                    extra: {
                        hogwartsMud: {
                            sceneId:
                                payload.nextScene
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
                roleSlot,
                state,
                payload,
            ) {
                await sendSceneOpening(
                    roleSlot,
                    [{
                        role: 'user',
                        content:
                            'deterministic opening',
                    }],
                    {
                        json: true,
                    },
                );
                return payload;
            },
            async generateSceneTransitionPackage(
                roleSlot,
            ) {
                await sendSceneTransition(
                    roleSlot,
                    [{
                        role: 'user',
                        content:
                            'deterministic transition',
                    }],
                    {
                        json: true,
                    },
                );
                return createPayload();
            },
            getContext:
                () => ports.getContext(),
            getMudState: () =>
                context
                    .chatMetadata
                    .hogwartsMud,
            guardedSaveTransaction:
                ports.guardedSaveTransaction,
            jobRegistry: {},
            renderAll() {},
            resolveRoleSlots:
                () => createRoleSlots(),
            retrieveLocalKnowledge:
                async () => [],
        });
    return {
        calls,
        context,
        snapshots,
        workflow,
    };
}

test('Calendar Moment commits after scheduler runtime writes advance the live State', async () => {
    const harness =
        await createCalendarRuntimeHarness();

    const result =
        await harness.workflow
            .runCalendarMoment(
                'great_hall_moment',
            );

    assert.equal(
        harness.calls.schedulerRequests,
        2,
    );
    assert.equal(
        harness.calls.runtimeSaves,
        4,
    );
    assert.deepEqual(
        harness.snapshots.map(snapshot =>
            snapshot.state
                .stateRevision),
        [
            342,
            343,
            344,
            345,
            346,
        ],
    );
    assert.deepEqual(
        result.revisionHistory
            .slice(-5)
            .map(entry => ({
                revision:
                    entry.revision,
                source:
                    entry.source,
                changedDomains:
                    entry.changedDomains,
            })),
        [{
            revision: 342,
            source:
                'model_task_runtime',
            changedDomains: [
                'model_task_runtime',
            ],
        }, {
            revision: 343,
            source:
                'model_task_runtime',
            changedDomains: [
                'model_task_runtime',
            ],
        }, {
            revision: 344,
            source:
                'model_task_runtime',
            changedDomains: [
                'model_task_runtime',
            ],
        }, {
            revision: 345,
            source:
                'model_task_runtime',
            changedDomains: [
                'model_task_runtime',
            ],
        }, {
            revision: 346,
            source:
                'calendar_moment',
            changedDomains: [
                'calendar',
                'clock',
                'scene',
                'scene_archive',
                'world',
            ],
        }],
    );
    assert.equal(
        result.modelTaskRuntime
            .byTaskId
            .scene_transition
            .attempted,
        1,
    );
    assert.equal(
        result.modelTaskRuntime
            .byTaskId
            .scene_transition
            .succeeded,
        1,
    );
    assert.equal(
        result.modelTaskRuntime
            .byTaskId
            .scene_opening
            .attempted,
        1,
    );
    assert.equal(
        result.modelTaskRuntime
            .byTaskId
            .scene_opening
            .succeeded,
        1,
    );
    assert.equal(
        harness.context.chat.length,
        1,
    );
    assert.equal(
        result.scene.id,
        'great_hall_runtime_ledger',
    );
});

test('Calendar Moment does not call fetch while it opens a scheduled Scene', async () => {
    const originalFetch =
        globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch =
        async () => {
            fetchCalls += 1;
            throw new Error(
                'Calendar telemetry must not call fetch.',
            );
        };
    try {
        const harness =
            await createCalendarRuntimeHarness();
        await harness.workflow
            .runCalendarMoment(
                'great_hall_moment',
            );
        assert.equal(fetchCalls, 0);
    } finally {
        globalThis.fetch =
            originalFetch;
    }
});

test('Calendar Moment preserves a real intervening world revision as a conflict', async () => {
    const harness =
        await createCalendarRuntimeHarness({
            injectWorldRevision:
                true,
        });

    await assert.rejects(
        harness.workflow
            .runCalendarMoment(
                'great_hall_moment',
            ),
        error =>
            error?.code ===
            'stale_save',
    );

    const live =
        harness.context
            .chatMetadata
            .hogwartsMud;
    assert.equal(
        harness.calls.schedulerRequests,
        2,
    );
    assert.equal(
        harness.calls.runtimeSaves,
        4,
    );
    assert.equal(
        live.stateRevision,
        346,
    );
    assert.equal(
        live.clock,
        '1991-09-03 · 10:15',
    );
    assert.equal(
        live.scene.id,
        'current_scene',
    );
    assert.equal(
        harness.context.chat.length,
        0,
    );
});

async function assertRuntimeHistoryConflict(
    mutateLiveState,
) {
    const baseline =
        createState();
    const live =
        structuredClone(baseline);
    mutateLiveState(live);
    const context = {
        chatId:
            'calendar-runtime-history',
        chatMetadata: {
            hogwartsMud: live,
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
                    'calendar_runtime_history',
                ),
        });
    await ports
        .registerSaveRevisionHead();
    const before =
        structuredClone(
            context.chatMetadata
                .hogwartsMud,
        );
    const next =
        structuredClone(baseline);
    next.clock = TARGET_CLOCK;

    await assert.rejects(
        ports.guardedSaveTransaction({
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
        }),
        error =>
            error?.code ===
            'stale_save',
    );
    assert.equal(
        context.chat.length,
        0,
    );
    assert.deepEqual(
        context.chatMetadata
            .hogwartsMud,
        before,
    );
}

test('guarded Calendar save rejects incomplete and cross-timeline runtime history', async () => {
    await assertRuntimeHistoryConflict(
        live => {
            live.stateRevision = 342;
            live.revisionHistory = [];
        },
    );
    await assertRuntimeHistoryConflict(
        live => {
            live.stateRevision = 342;
            live.revisionHistory = [{
                id:
                    'mixed_domain',
                baseRevision: 341,
                revision: 342,
                source:
                    'model_task_runtime',
                changedDomains: [
                    'model_task_runtime',
                    'clock',
                ],
            }];
        },
    );
    await assertRuntimeHistoryConflict(
        live => {
            live.stateRevision = 342;
            live.revisionHistory = [{
                id:
                    'non_contiguous',
                baseRevision: 339,
                revision: 342,
                source:
                    'model_task_runtime',
                changedDomains: [
                    'model_task_runtime',
                ],
            }];
        },
    );
    await assertRuntimeHistoryConflict(
        live => {
            live.timelineEpoch =
                'another_timeline';
            live.stateRevision = 342;
            live.revisionHistory = [{
                id:
                    'other_timeline',
                baseRevision: 341,
                revision: 342,
                source:
                    'model_task_runtime',
                changedDomains: [
                    'model_task_runtime',
                ],
            }];
        },
    );
});
