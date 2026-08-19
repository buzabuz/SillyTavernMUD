import {
    getModelTaskDefinition,
    MODEL_TASK_REGISTRY_VERSION,
} from '../domain/model-task-registry.js';
import {
    ModelTaskDeferredError,
    recordModelTaskAttempt,
    recordModelTaskFailure,
    recordModelTaskSuccess,
} from '../domain/model-task-runtime.js';
import {
    createTaskPromptBudget,
    measurePromptMessages,
} from '../domain/prompt-budget-allocator.js';

function text(
    value,
    maximumLength = 200,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function resolveState(
    getState,
) {
    try {
        return getState?.() || {};
    } catch {
        return {};
    }
}

function defaultActionId(
    state,
    eventType,
) {
    const explicit =
        text(
            state.modelTaskRuntime
                ?.activeActionId ||
            state.turn
                ?.activeActionId,
            240,
        );
    if (explicit) {
        return explicit;
    }
    return [
        text(
            state.timelineEpoch ||
            'stable_epoch',
            120,
        ),
        Number.isSafeInteger(
            state.stateRevision,
        )
            ? state.stateRevision
            : 0,
        Number.isSafeInteger(
            state.turn?.count,
        )
            ? state.turn.count
            : 0,
        text(
            eventType,
            120,
        ),
    ].join(':');
}

function normalizeEvent(
    definition,
    event,
    state,
) {
    const eventType =
        text(
            event?.eventType,
            160,
        );
    if (
        !definition
            .triggerEvents
            .includes(eventType)
    ) {
        throw new TypeError(
            `Model task ${definition.taskId} cannot run for event ${eventType || '?'}.`,
        );
    }
    const emittedBy =
        text(
            event?.emittedBy,
            240,
        );
    if (!emittedBy) {
        throw new TypeError(
            `Model task ${definition.taskId} requires emittedBy.`,
        );
    }
    const actionId =
        text(
            event?.actionId,
            240,
        ) ||
        defaultActionId(
            state,
            eventType,
        );
    return Object.freeze({
        eventId:
            text(
                event?.eventId,
                240,
            ) ||
            [
                definition.taskId,
                actionId,
                eventType,
            ].join(':'),
        eventType,
        phase:
            definition.phase,
        emittedBy,
        actionId,
        timelineEpoch:
            text(
                state.timelineEpoch ||
                'stable_epoch',
                160,
            ),
        stateRevision:
            Number.isSafeInteger(
                state.stateRevision,
            )
                ? state.stateRevision
                : 0,
        turn:
            Number.isSafeInteger(
                state.turn?.count,
            )
                ? state.turn.count
                : 0,
        sceneId:
            text(
                state.scene?.id,
                160,
            ),
    });
}

function assertTaskTier(
    definition,
    tier,
) {
    if (
        !definition.allowedTiers
            .includes(tier)
    ) {
        throw new TypeError(
            `Model task ${definition.taskId} cannot use tier ${tier || '?'}.`,
        );
    }
}

export function createModelEventScheduler({
    invokeRole,
    getState = () => ({}),
    onAttempt = () => {},
    onSuccess = () => {},
    onFailure = () => {},
    persistRuntime =
    async () => {},
    getRuntimeMaximumCharacters =
    () => Number.MAX_SAFE_INTEGER,
    enforceProductBudget = false,
} = {}) {
    if (
        typeof invokeRole !==
        'function'
    ) {
        throw new TypeError(
            'Model event scheduler requires invokeRole.',
        );
    }

    function prepare(
        taskId,
        tier,
        event,
    ) {
        const definition =
            getModelTaskDefinition(
                taskId,
            );
        if (!definition) {
            throw new TypeError(
                `Unknown model task ${taskId || '?'}.`,
            );
        }
        if (
            definition.status ===
            'retired'
        ) {
            throw new TypeError(
                `Retired model task ${taskId} cannot run.`,
            );
        }
        assertTaskTier(
            definition,
            tier,
        );
        const state =
            resolveState(
                getState,
            );
        return {
            definition,
            state,
            event:
                normalizeEvent(
                    definition,
                    event,
                    state,
                ),
        };
    }

    function currentTaskState(
        prepared,
    ) {
        const current =
            resolveState(
                getState,
            );
        return (
            current.timelineEpoch ===
                prepared.event
                    .timelineEpoch
                ? current
                : prepared.state
        );
    }

    async function runRoleTask(
        taskId,
        roleSlot,
        messages,
        options = {},
        event = {},
    ) {
        const tier =
            text(
                options.tier ||
                roleSlot?.role ||
                roleSlot?.tier,
                40,
            ) ||
            getModelTaskDefinition(
                taskId,
            )?.allowedTiers?.[0] ||
            '';
        const prepared =
            prepare(
                taskId,
                tier,
                event,
            );
        const promptMeasurement =
            measurePromptMessages(
                messages,
                {
                    transportJsonSchema:
                        options
                            .jsonSchema ||
                        null,
                },
            );
        const promptBudget =
            createTaskPromptBudget(
                taskId,
                {
                    runtimeMaximumCharacters:
                        getRuntimeMaximumCharacters(
                            roleSlot,
                        ),
                },
            );
        if (
            promptMeasurement.characters >
            promptBudget
                .runtimeMaximumCharacters
        ) {
            throw new RangeError(
                `Model task ${taskId} Prompt requires ${promptMeasurement.characters} characters, above runtime ceiling ${promptBudget.runtimeMaximumCharacters}.`,
            );
        }
        if (
            enforceProductBudget &&
            promptMeasurement.characters >
            promptBudget
                .effectiveMaximumCharacters
        ) {
            throw new RangeError(
                `Model task ${taskId} Prompt requires ${promptMeasurement.characters} characters, above product budget ${promptBudget.effectiveMaximumCharacters}.`,
            );
        }
        const envelope = {
            registryVersion:
                MODEL_TASK_REGISTRY_VERSION,
            taskId,
            tier,
            definition:
                prepared.definition,
            event:
                prepared.event,
            promptBudget,
            promptMeasurement,
        };
        const requestOptions = {
            ...options,
        };
        delete requestOptions.tier;
        delete requestOptions
            .modelTaskActionId;
        const usesWorldLedger =
            prepared.definition
                .ledgerScope ===
            'world';
        if (usesWorldLedger) {
            try {
                recordModelTaskAttempt(
                    prepared.state,
                    prepared.definition,
                    prepared.event,
                    tier,
                );
            } catch (error) {
                if (
                    error instanceof
                    ModelTaskDeferredError
                ) {
                    await persistRuntime(
                        prepared.state,
                    );
                }
                throw error;
            }
            await persistRuntime(
                prepared.state,
            );
        }
        onAttempt(envelope);
        try {
            const result =
                await invokeRole(
                    roleSlot,
                    messages,
                    requestOptions,
                );
            if (usesWorldLedger) {
                const outcomeState =
                    currentTaskState(
                        prepared,
                    );
                recordModelTaskSuccess(
                    outcomeState,
                    prepared.definition,
                    prepared.event,
                );
                await persistRuntime(
                    outcomeState,
                );
            }
            onSuccess(envelope);
            return result;
        } catch (error) {
            if (usesWorldLedger) {
                const outcomeState =
                    currentTaskState(
                        prepared,
                    );
                recordModelTaskFailure(
                    outcomeState,
                    prepared.definition,
                    prepared.event,
                );
                await persistRuntime(
                    outcomeState,
                );
            }
            onFailure({
                ...envelope,
                error,
            });
            throw error;
        }
    }

    async function runLocalTask(
        taskId,
        invoke,
        event = {},
    ) {
        if (
            typeof invoke !==
            'function'
        ) {
            throw new TypeError(
                `Local model task ${taskId || '?'} requires invoke.`,
            );
        }
        const prepared =
            prepare(
                taskId,
                'local',
                event,
            );
        const envelope = {
            registryVersion:
                MODEL_TASK_REGISTRY_VERSION,
            taskId,
            tier: 'local',
            definition:
                prepared.definition,
            event:
                prepared.event,
        };
        const usesWorldLedger =
            prepared.definition
                .ledgerScope ===
            'world';
        if (usesWorldLedger) {
            try {
                recordModelTaskAttempt(
                    prepared.state,
                    prepared.definition,
                    prepared.event,
                    'local',
                );
            } catch (error) {
                if (
                    error instanceof
                    ModelTaskDeferredError
                ) {
                    await persistRuntime(
                        prepared.state,
                    );
                }
                throw error;
            }
            await persistRuntime(
                prepared.state,
            );
        }
        onAttempt(envelope);
        try {
            const result =
                await invoke();
            if (usesWorldLedger) {
                const outcomeState =
                    currentTaskState(
                        prepared,
                    );
                recordModelTaskSuccess(
                    outcomeState,
                    prepared.definition,
                    prepared.event,
                );
                await persistRuntime(
                    outcomeState,
                );
            }
            onSuccess(envelope);
            return result;
        } catch (error) {
            if (usesWorldLedger) {
                const outcomeState =
                    currentTaskState(
                        prepared,
                    );
                recordModelTaskFailure(
                    outcomeState,
                    prepared.definition,
                    prepared.event,
                );
                await persistRuntime(
                    outcomeState,
                );
            }
            onFailure({
                ...envelope,
                error,
            });
            throw error;
        }
    }

    function createRoleRequest(
        taskId,
        {
            eventType,
            emittedBy,
            tier = '',
        },
    ) {
        return (
            roleSlot,
            messages,
            options = {},
        ) =>
            runRoleTask(
                taskId,
                roleSlot,
                messages,
                {
                    ...options,
                    ...(tier
                        ? {
                            tier,
                        }
                        : {}),
                },
                {
                    eventType,
                    emittedBy,
                    actionId:
                        options
                            .modelTaskActionId,
                },
            );
    }

    return Object.freeze({
        runRoleTask,
        runLocalTask,
        createRoleRequest,
    });
}
