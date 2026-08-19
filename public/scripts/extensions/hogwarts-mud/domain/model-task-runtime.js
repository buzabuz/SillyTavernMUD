import {
    MODEL_TASK_CATALOG,
    MODEL_TASK_REGISTRY_VERSION,
} from './model-task-registry.js';

export const MODEL_TASK_RUNTIME_VERSION = 1;

function activeDefinitions() {
    return MODEL_TASK_CATALOG
        .filter(task =>
            task.status !== 'retired' &&
            task.ledgerScope !== 'server_ephemeral');
}

function emptyTaskRuntime() {
    return {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        deferred: 0,
        skipped: 0,
        lastTriggerKey: '',
        lastEmitter: '',
        lastActionId: '',
        lastAttemptedRevision: null,
        lastCompletedRevision: null,
        lastTurn: null,
        lastSceneId: '',
        nextEligibleTurn: null,
    };
}

function boundedCount(value) {
    const number =
        Number(value);
    return (
        Number.isSafeInteger(
            number,
        ) &&
        number >= 0
            ? Math.min(
                number,
                Number.MAX_SAFE_INTEGER,
            )
            : 0
    );
}

function optionalInteger(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }
    const number =
        Number(value);
    return (
        Number.isSafeInteger(
            number,
        ) &&
        number >= 0
            ? number
            : null
    );
}

function text(
    value,
    maximumLength = 240,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function normalizeTaskRuntime(
    value,
) {
    const fallback =
        emptyTaskRuntime();
    return {
        attempted:
            boundedCount(
                value?.attempted,
            ),
        succeeded:
            boundedCount(
                value?.succeeded,
            ),
        failed:
            boundedCount(
                value?.failed,
            ),
        deferred:
            boundedCount(
                value?.deferred,
            ),
        skipped:
            boundedCount(
                value?.skipped,
            ),
        lastTriggerKey:
            text(
                value
                    ?.lastTriggerKey,
            ),
        lastEmitter:
            text(
                value?.lastEmitter,
            ),
        lastActionId:
            text(
                value?.lastActionId,
            ),
        lastAttemptedRevision:
            optionalInteger(
                value
                    ?.lastAttemptedRevision,
            ),
        lastCompletedRevision:
            optionalInteger(
                value
                    ?.lastCompletedRevision,
            ),
        lastTurn:
            optionalInteger(
                value?.lastTurn,
            ),
        lastSceneId:
            text(
                value?.lastSceneId,
                160,
            ),
        nextEligibleTurn:
            optionalInteger(
                value
                    ?.nextEligibleTurn,
            ),
        ...(
            value &&
            typeof value ===
                'object'
                ? {}
                : fallback
        ),
    };
}

export function createDefaultModelTaskRuntime() {
    return {
        version:
            MODEL_TASK_RUNTIME_VERSION,
        registryVersion:
            MODEL_TASK_REGISTRY_VERSION,
        activeActionId: '',
        byTaskId:
            Object.fromEntries(
                activeDefinitions()
                    .map(definition => [
                        definition.taskId,
                        emptyTaskRuntime(),
                    ]),
            ),
        quotaWindows: {
            medium: {
                actionId: '',
                usedTaskIds: [],
            },
        },
    };
}

export function normalizeModelTaskRuntime(
    value,
) {
    const source =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
            ? value
            : {};
    const definitions =
        activeDefinitions();
    return {
        version:
            MODEL_TASK_RUNTIME_VERSION,
        registryVersion:
            MODEL_TASK_REGISTRY_VERSION,
        activeActionId:
            text(
                source
                    .activeActionId,
            ),
        byTaskId:
            Object.fromEntries(
                definitions.map(
                    definition => [
                        definition.taskId,
                        normalizeTaskRuntime(
                            source.byTaskId
                                ?.[
                                    definition
                                        .taskId
                                ],
                        ),
                    ],
                ),
            ),
        quotaWindows: {
            medium: {
                actionId:
                    text(
                        source
                            .quotaWindows
                            ?.medium
                            ?.actionId,
                    ),
                usedTaskIds: [
                    ...new Set(
                        (
                            source
                                .quotaWindows
                                ?.medium
                                ?.usedTaskIds ||
                            []
                        )
                            .map(taskId =>
                                text(
                                    taskId,
                                    120,
                                ))
                            .filter(taskId =>
                                definitions
                                    .some(
                                        definition =>
                                            definition
                                                .taskId ===
                                            taskId,
                                    )),
                    ),
                ].slice(0, 16),
            },
        },
    };
}

export function ensureModelTaskRuntime(
    state,
) {
    if (
        !state ||
        typeof state !== 'object' ||
        Array.isArray(state)
    ) {
        throw new TypeError(
            'Model task runtime requires State.',
        );
    }
    state.modelTaskRuntime =
        normalizeModelTaskRuntime(
            state.modelTaskRuntime,
        );
    return state.modelTaskRuntime;
}

export function beginModelTaskAction(
    state,
    actionId,
) {
    const runtime =
        ensureModelTaskRuntime(
            state,
        );
    const normalizedActionId =
        text(actionId);
    if (!normalizedActionId) {
        throw new TypeError(
            'Model task action requires actionId.',
        );
    }
    runtime.activeActionId =
        normalizedActionId;
    runtime.quotaWindows.medium = {
        actionId:
            normalizedActionId,
        usedTaskIds: [],
    };
    return runtime;
}

export function endModelTaskAction(
    state,
    actionId,
) {
    const runtime =
        ensureModelTaskRuntime(
            state,
        );
    if (
        !actionId ||
        runtime.activeActionId ===
            text(actionId)
    ) {
        runtime.activeActionId = '';
    }
    return runtime;
}

export class ModelTaskDeferredError
    extends Error {
    constructor(
        message,
        {
            taskId = '',
            reason = '',
        } = {},
    ) {
        super(message);
        this.name =
            'ModelTaskDeferredError';
        this.code =
            'MODEL_TASK_DEFERRED';
        this.taskId = taskId;
        this.reason = reason;
    }
}

function taskRow(
    runtime,
    taskId,
) {
    const row =
        runtime.byTaskId
            ?.[taskId];
    if (!row) {
        throw new TypeError(
            `Model task runtime has no row for ${taskId}.`,
        );
    }
    return row;
}

export function recordModelTaskAttempt(
    state,
    definition,
    event,
    tier,
) {
    const runtime =
        ensureModelTaskRuntime(
            state,
        );
    const row =
        taskRow(
            runtime,
            definition.taskId,
        );
    if (
        tier === 'medium'
    ) {
        const window =
            runtime.quotaWindows
                .medium;
        if (
            window.actionId !==
            event.actionId
        ) {
            window.actionId =
                event.actionId;
            window.usedTaskIds = [];
        }
        if (
            window.usedTaskIds.length &&
            !window.usedTaskIds
                .includes(
                    definition.taskId,
                )
        ) {
            row.deferred += 1;
            row.lastActionId =
                event.actionId;
            row.lastTriggerKey =
                event.eventId;
            row.lastEmitter =
                event.emittedBy;
            throw new ModelTaskDeferredError(
                `Medium model budget for action ${event.actionId} is already used by ${window.usedTaskIds[0]}.`,
                {
                    taskId:
                        definition.taskId,
                    reason:
                        'medium_action_quota',
                },
            );
        }
        if (
            !window.usedTaskIds
                .includes(
                    definition.taskId,
                )
        ) {
            window.usedTaskIds.push(
                definition.taskId,
            );
        }
    }
    row.attempted += 1;
    row.lastTriggerKey =
        event.eventId;
    row.lastEmitter =
        event.emittedBy;
    row.lastActionId =
        event.actionId;
    row.lastAttemptedRevision =
        event.stateRevision;
    row.lastTurn =
        event.turn;
    row.lastSceneId =
        event.sceneId;
    return runtime;
}

export function recordModelTaskSuccess(
    state,
    definition,
    event,
) {
    const runtime =
        ensureModelTaskRuntime(
            state,
        );
    const row =
        taskRow(
            runtime,
            definition.taskId,
        );
    row.succeeded += 1;
    row.lastCompletedRevision =
        Number.isSafeInteger(
            state.stateRevision,
        )
            ? state.stateRevision
            : event.stateRevision;
    row.lastTurn =
        Number.isSafeInteger(
            state.turn?.count,
        )
            ? state.turn.count
            : event.turn;
    row.lastSceneId =
        text(
            state.scene?.id ||
            event.sceneId,
            160,
        );
    return runtime;
}

export function recordModelTaskFailure(
    state,
    definition,
    event,
) {
    const runtime =
        ensureModelTaskRuntime(
            state,
        );
    const row =
        taskRow(
            runtime,
            definition.taskId,
        );
    row.failed += 1;
    row.lastActionId =
        event.actionId;
    row.lastTriggerKey =
        event.eventId;
    return runtime;
}
