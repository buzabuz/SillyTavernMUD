import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createDefaultModelTaskRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/model-task-runtime.js';
import {
    createModelEventScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    buildEventBoundaryCheckpoint,
    createBackgroundEventBoundaryWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/background-event-boundary.js';
import {
    createEventBoundaryModelRequest,
} from '../src/hogwarts-mud/event-boundary-observer.js';

function createState(
    turn = 10,
) {
    return {
        timelineEpoch:
            'event_epoch',
        stateRevision: 5,
        clock:
            '1991-09-02 · 12:00',
        phase: 'playing',
        turn: {
            count: turn,
        },
        scene: {
            id: 'tea_scene',
        },
        memoryDirector: {
            status: 'idle',
            error: '',
            lastReviewedTurn: 0,
            triggerMode:
                'event_boundary',
            minimumReviewTurns: 10,
            pendingEventBoundary:
                null,
        },
        modelTaskRuntime:
            createDefaultModelTaskRuntime(),
        actors: [{
            id: 'ron',
            mapId: 'castle',
            roomId: 'tea_room',
            locationKnown: true,
            present: true,
        }],
        localPresence: {
            occupantActorIds: [
                'ron',
            ],
        },
    };
}

function createCommittedChat(
    count,
) {
    return Array.from(
        {
            length: count,
        },
        (_, index) => {
            const turn =
                index + 1;
            const final =
                turn % 10 === 0;
            const closingNarrationEn =
                final
                    ? 'The shared tea conversation concluded, and everyone set down their cups.'
                    : `The tea conversation continued through turn ${turn}.`;
            return {
                is_user: false,
                extra: {
                    hogwartsMud: {
                        role:
                            'scene_turn',
                        sceneId:
                            'tea_scene',
                        turnTransaction: {
                            committedClock:
                                `1991-09-02 · 1${turn % 10}:00`,
                            publicEventEn:
                                closingNarrationEn,
                            segments: [{
                                type:
                                    'narration',
                                textEn:
                                    closingNarrationEn,
                            }],
                            eventKnowledge: {
                                eventId:
                                    `event_${turn}`,
                            },
                        },
                    },
                },
            };
        },
    );
}

function createHarness({
    turn = 10,
    fetchResults = [],
    beforeResponse =
        () => {},
} = {}) {
    const state =
        createState(turn);
    const context = {
        chat:
            createCommittedChat(
                turn,
            ),
        chatMetadata: {
            hogwartsMud:
                state,
        },
        metadataSaves: 0,
        async saveMetadata() {
            this.metadataSaves++;
        },
    };
    let fetchCalls = 0;
    let downstreamCalls = 0;
    const scheduler =
        createModelEventScheduler({
            invokeRole:
                async () => {
                    throw new Error(
                        'Role model path must not run.',
                    );
                },
            getState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            persistRuntime:
                async () => {
                    context.metadataSaves++;
                },
        });
    const jobRegistry = {
        eventBoundary: null,
    };
    const workflow =
        createBackgroundEventBoundaryWorkflow({
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            getRequestHeaders:
                () => ({
                    'Content-Type':
                        'application/json',
                }),
            jobRegistry,
            runLocalModelTask:
                scheduler
                    .runLocalTask,
            fetchImpl:
                async () => {
                    const index =
                        fetchCalls++;
                    beforeResponse({
                        context,
                        index,
                    });
                    const result =
                        fetchResults[index];
                    if (
                        result instanceof
                        Error
                    ) {
                        return {
                            ok: false,
                            status: 503,
                            text:
                                async () =>
                                    result.message,
                        };
                    }
                    return {
                        ok: true,
                        status: 200,
                        json:
                            async () => ({
                                result,
                                diagnostics: {
                                    model:
                                        'qwen3:1.7b',
                                },
                            }),
                    };
                },
            ensureSocialDirectorForAction:
                async () => {
                    downstreamCalls++;
                },
        });
    return {
        context,
        workflow,
        get fetchCalls() {
            return fetchCalls;
        },
        get downstreamCalls() {
            return downstreamCalls;
        },
    };
}

test('checkpoint projection contains exactly ten contiguous committed turns and builds the production request', () => {
    const state =
        createState(10);
    const checkpoint =
        buildEventBoundaryCheckpoint(
            state,
            createCommittedChat(10),
        );

    assert.equal(
        checkpoint
            .input
            .turns
            .length,
        10,
    );
    assert.deepEqual(
        checkpoint
            .input
            .turns
            .map(turn =>
                turn.turn),
        [
            1, 2, 3, 4, 5,
            6, 7, 8, 9, 10,
        ],
    );
    assert.equal(
        checkpoint
            .hasUnreviewedMemory,
        true,
    );
    const request =
        createEventBoundaryModelRequest(
            checkpoint.input,
        );
    assert.equal(
        request.taskId,
        'local_event_boundary_observer',
    );
    assert.equal(
        request.exactContextSize,
        4_096,
    );
    assert.deepEqual(
        request.jsonSchema
            .properties
            .evidenceTurn
            .enum,
        [
            0, 1, 2, 3, 4, 5,
            6, 7, 8, 9, 10,
        ],
    );
});

test('off-checkpoint turns perform zero Event work', () => {
    const harness =
        createHarness({
            turn: 9,
        });

    assert.equal(
        harness.workflow
            .scheduleBackgroundEventBoundary(),
        null,
    );
    assert.equal(
        harness.fetchCalls,
        0,
    );
});

test('ended checkpoint writes one pending boundary and cannot repeat the same checkpoint', async () => {
    const evidence =
        createCommittedChat(10)[9]
            .extra.hogwartsMud
            .turnTransaction
            .segments[0]
            .textEn;
    const harness =
        createHarness({
            fetchResults: [{
                ended: true,
                evidenceTurn: 10,
                evidenceText:
                    evidence,
                confidence: 0.95,
            }],
        });
    const before =
        structuredClone(
            harness.context
                .chatMetadata
                .hogwartsMud,
        );

    await harness.workflow
        .scheduleBackgroundEventBoundary();

    const state =
        harness.context
            .chatMetadata
            .hogwartsMud;
    assert.equal(
        harness.fetchCalls,
        1,
    );
    assert.equal(
        state.memoryDirector
            .pendingEventBoundary
            .turn,
        10,
    );
    assert.equal(
        state.memoryDirector
            .pendingEventBoundary
            .status,
        'pending',
    );
    assert.equal(
        harness.downstreamCalls,
        1,
    );
    assert.deepEqual(
        state.actors,
        before.actors,
    );
    assert.deepEqual(
        state.localPresence,
        before.localPresence,
    );
    assert.equal(
        Object.hasOwn(
            state,
            'eventKnowledge',
        ),
        Object.hasOwn(
            before,
            'eventKnowledge',
        ),
    );
    assert.equal(
        harness.workflow
            .scheduleBackgroundEventBoundary(),
        null,
    );
    assert.equal(
        harness.fetchCalls,
        1,
    );
});

test('not-ended and failed checkpoints write no boundary and wait until the next checkpoint', async () => {
    const notEnded =
        createHarness({
            fetchResults: [{
                ended: false,
                evidenceTurn: 0,
                evidenceText: '',
                confidence: 0,
            }],
        });
    await notEnded.workflow
        .scheduleBackgroundEventBoundary();
    assert.equal(
        notEnded.context
            .chatMetadata
            .hogwartsMud
            .memoryDirector
            .pendingEventBoundary,
        null,
    );
    assert.equal(
        notEnded.context
            .chatMetadata
            .hogwartsMud
            .modelTaskRuntime
            .byTaskId
            .local_event_boundary_observer
            .succeeded,
        1,
    );

    const failed =
        createHarness({
            fetchResults: [
                new Error(
                    'Ollama offline',
                ),
                {
                    ended: false,
                    evidenceTurn: 0,
                    evidenceText: '',
                    confidence: 0,
                },
            ],
        });
    await failed.workflow
        .scheduleBackgroundEventBoundary();
    assert.equal(
        failed.context
            .chatMetadata
            .hogwartsMud
            .modelTaskRuntime
            .byTaskId
            .local_event_boundary_observer
            .failed,
        1,
    );
    assert.equal(
        failed.workflow
            .scheduleBackgroundEventBoundary(),
        null,
    );
    assert.equal(
        failed.fetchCalls,
        1,
    );

    failed.context
        .chatMetadata
        .hogwartsMud
        .turn.count = 20;
    failed.context.chat =
        createCommittedChat(20);
    await failed.workflow
        .scheduleBackgroundEventBoundary();
    assert.equal(
        failed.fetchCalls,
        2,
    );
});

test('checkpoint projection failure is recorded once before any model request', async () => {
    const harness =
        createHarness();
    const transaction =
        harness.context.chat[9]
            .extra.hogwartsMud
            .turnTransaction;
    transaction.segments = [{
        type: 'narration',
        rawText:
            '只有显示文本，没有英文权威。',
    }];

    await harness.workflow
        .scheduleBackgroundEventBoundary();

    const row =
        harness.context
            .chatMetadata
            .hogwartsMud
            .modelTaskRuntime
            .byTaskId
            .local_event_boundary_observer;
    assert.equal(
        harness.fetchCalls,
        0,
    );
    assert.equal(
        row.attempted,
        1,
    );
    assert.equal(
        row.failed,
        1,
    );
    assert.equal(
        harness.workflow
            .scheduleBackgroundEventBoundary(),
        null,
    );
});

test('a result that becomes stale while the model runs cannot write Event State', async () => {
    const evidence =
        createCommittedChat(10)[9]
            .extra.hogwartsMud
            .turnTransaction
            .publicEventEn;
    const harness =
        createHarness({
            fetchResults: [{
                ended: true,
                evidenceTurn: 10,
                evidenceText:
                    evidence,
                confidence: 0.95,
            }],
            beforeResponse: ({
                context,
            }) => {
                context.chatMetadata
                    .hogwartsMud
                    .turn.count = 11;
            },
        });

    await harness.workflow
        .scheduleBackgroundEventBoundary();

    assert.equal(
        harness.context
            .chatMetadata
            .hogwartsMud
            .memoryDirector
            .pendingEventBoundary,
        null,
    );
    assert.equal(
        harness.downstreamCalls,
        0,
    );
});
