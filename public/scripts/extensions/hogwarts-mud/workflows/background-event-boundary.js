import {
    settleBackgroundEventBoundary,
    validateBackgroundEventBoundary,
} from '../domain/event-boundary-reducer.js';

export const EVENT_BOUNDARY_TASK_ID =
    'local_event_boundary_observer';
export const EVENT_BOUNDARY_WINDOW_SIZE =
    10;

function exactText(
    value,
) {
    return String(value ?? '')
        .trim();
}

export function buildEventBoundaryCheckpoint(
    worldState,
    chat,
) {
    const checkpointTurn =
        Number(
            worldState
                ?.turn?.count,
        );
    if (
        !Number.isInteger(
            checkpointTurn,
        ) ||
        checkpointTurn <= 0 ||
        checkpointTurn %
            EVENT_BOUNDARY_WINDOW_SIZE !==
            0
    ) {
        return null;
    }
    const committed = (
        Array.isArray(chat)
            ? chat
            : []
    )
        .map((message, messageId) => ({
            message,
            messageId,
            mud:
                message?.extra
                    ?.hogwartsMud,
        }))
        .filter(entry =>
            entry.message?.is_user !==
                true &&
            entry.mud?.role ===
                'scene_turn' &&
            entry.mud
                .turnTransaction)
        .slice(
            -EVENT_BOUNDARY_WINDOW_SIZE,
        );
    if (
        committed.length !==
        EVENT_BOUNDARY_WINDOW_SIZE
    ) {
        throw new TypeError(
            'Event boundary checkpoint requires exactly ten committed scene turns.',
        );
    }
    const windowStartTurn =
        checkpointTurn -
        EVENT_BOUNDARY_WINDOW_SIZE +
        1;
    let hasUnreviewedMemory =
        false;
    const turns =
        committed.map(
            (entry, index) => {
                const transaction =
                    entry.mud
                        .turnTransaction;
                const narration =
                    (
                        transaction
                            .segments ||
                        entry.mud
                            .segments ||
                        []
                    )
                        .filter(segment =>
                            segment?.type ===
                                'narration')
                        .at(-1);
                const publicEventEn =
                    exactText(
                        transaction
                            .publicEventEn,
                    );
                const closingNarrationEn =
                    exactText(
                        narration?.textEn,
                    ).slice(0, 500);
                if (
                    !publicEventEn ||
                    !closingNarrationEn
                ) {
                    throw new TypeError(
                        'Event boundary checkpoint contains an incomplete or oversized committed turn.',
                    );
                }
                hasUnreviewedMemory ||=
                    Boolean(
                        transaction
                            .eventKnowledge
                            ?.eventId,
                    );
                return {
                    turn:
                        windowStartTurn +
                        index,
                    messageId:
                        entry.messageId,
                    sceneId:
                        exactText(
                            entry.mud
                                .sceneId ||
                            worldState
                                ?.scene?.id,
                        ),
                    clock:
                        exactText(
                            transaction
                                .committedClock ||
                            worldState
                                ?.clock,
                        ),
                    publicEventEn,
                    closingNarrationEn,
                };
            },
        );
    return {
        input: {
            checkpointTurn,
            windowStartTurn,
            windowEndTurn:
                checkpointTurn,
            turns,
        },
        hasUnreviewedMemory:
            checkpointTurn >
                Number(
                    worldState
                        ?.memoryDirector
                        ?.lastReviewedTurn ||
                    0,
                ) &&
            hasUnreviewedMemory,
    };
}

export function createBackgroundEventBoundaryWorkflow({
    getContext,
    getMudState,
    getRequestHeaders,
    jobRegistry,
    runLocalModelTask,
    fetchImpl = fetch,
    ensureSocialDirectorForAction =
        async () => {},
    renderAll = () => {},
}) {
    function scheduleBackgroundEventBoundary() {
        const state =
            getMudState();
        const checkpointTurn =
            Number(
                state?.turn?.count,
            );
        if (
            !Number.isInteger(
                checkpointTurn,
            ) ||
            checkpointTurn <= 0 ||
            checkpointTurn %
                EVENT_BOUNDARY_WINDOW_SIZE !==
                0 ||
            jobRegistry
                .eventBoundary
        ) {
            return null;
        }
        const runtimeRow =
            state.modelTaskRuntime
                ?.byTaskId
                ?.[
                    EVENT_BOUNDARY_TASK_ID
                ];
        if (
            Number(
                runtimeRow
                    ?.lastTurn,
            ) ===
                checkpointTurn &&
            Number(
                runtimeRow
                    ?.attempted ||
                0,
            ) > 0
        ) {
            return null;
        }
        const triggerKey = [
            EVENT_BOUNDARY_TASK_ID,
            exactText(
                state.timelineEpoch ||
                'stable_epoch',
            ),
            checkpointTurn,
        ].join(':');
        const guard = {
            timelineEpoch:
                exactText(
                    state.timelineEpoch,
                ),
            stateRevision:
                Number(
                    state.stateRevision ||
                    0,
                ),
            checkpointTurn,
            triggerKey,
        };
        jobRegistry.eventBoundary =
            (async () => {
                const context =
                    getContext();
                let checkpoint;
                const response =
                    await runLocalModelTask(
                        EVENT_BOUNDARY_TASK_ID,
                        async () => {
                            checkpoint =
                                buildEventBoundaryCheckpoint(
                                    getMudState(),
                                    context.chat,
                                );
                            const requested =
                                await fetchImpl(
                                    '/api/hogwarts-mud/local/event-boundary/observe',
                                    {
                                        method: 'POST',
                                        headers:
                                            getRequestHeaders(),
                                        body:
                                            JSON.stringify({
                                                input:
                                                    checkpoint
                                                        .input,
                                            }),
                                    },
                                );
                            if (!requested.ok) {
                                throw new Error(
                                    (
                                        await requested
                                            .text()
                                    ).slice(
                                        0,
                                        1_000,
                                    ) ||
                                    `HTTP ${requested.status}`,
                                );
                            }
                            const payload =
                                await requested
                                    .json();
                            const validation =
                                validateBackgroundEventBoundary(
                                    payload
                                        ?.result,
                                    checkpoint
                                        .input,
                                );
                            if (!validation.valid) {
                                throw new TypeError(
                                    validation
                                        .error,
                                );
                            }
                            return {
                                ...payload,
                                result:
                                    validation
                                        .value,
                            };
                        },
                        {
                            eventId:
                                triggerKey,
                            eventType:
                                'turn.event_checkpoint',
                            emittedBy:
                                'turn.background_event_boundary',
                            actionId:
                                triggerKey,
                        },
                    );
                const settled =
                    settleBackgroundEventBoundary(
                        getMudState(),
                        checkpoint.input,
                        response.result,
                        guard,
                        {
                            hasUnreviewedMemory:
                                checkpoint
                                    .hasUnreviewedMemory,
                        },
                    );
                if (!settled.changed) {
                    return settled;
                }
                context.chatMetadata
                    .hogwartsMud =
                    settled.state;
                await context
                    .saveMetadata({
                        source:
                            'background_event_boundary',
                        changedDomains: [
                            'memory_director',
                        ],
                    });
                renderAll();
                void Promise.resolve(
                    ensureSocialDirectorForAction(),
                ).catch(error =>
                    console.warn(
                        '[Hogwarts MUD] Event-boundary downstream work failed',
                        error,
                    ));
                return settled;
            })()
                .catch(error => {
                    console.warn(
                        '[Hogwarts MUD] Background Event boundary review failed; waiting for the next checkpoint',
                        error,
                    );
                    return null;
                })
                .finally(() => {
                    jobRegistry
                        .eventBoundary =
                        null;
                    renderAll();
                });
        return jobRegistry
            .eventBoundary;
    }

    return {
        scheduleBackgroundEventBoundary,
    };
}
