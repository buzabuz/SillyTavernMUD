import {
    createNewSaveRevisionState,
    hasWorldStateChanges,
    isStateRevisionCurrentOrModelTaskRuntimeOnly,
    migrateSaveRevisionState,
} from '../domain/save-revision.js';
import {
    HostSaveDurabilityError,
    createSaveRevisionGuard,
} from './save-revision-guard.js';

export const SAVE_REVISION_REFRESH_MESSAGE =
    '时间线已在其他页面更新，请刷新后继续。';

export class SaveRevisionConflictError extends Error {
    constructor(conflict) {
        super(SAVE_REVISION_REFRESH_MESSAGE);
        this.name =
            'SaveRevisionConflictError';
        this.code =
            conflict?.code ||
            'stale_save';
        this.conflict =
            conflict || null;
    }
}

function getTimelineKey(context) {
    return String(
        context
            ?.getCurrentChatId
            ?.call(context) ||
        context?.chatId ||
        context
            ?.chatMetadata
            ?.hogwartsMud
            ?.campaign
            ?.timelineId ||
        'unsaved',
    ).replace(/\.jsonl$/iu, '');
}

function mergeSaveOptions(
    current,
    next,
) {
    return {
        source:
            next?.source ||
            current?.source ||
            'metadata',
        consumeRevision:
            current
                ?.consumeRevision ===
                true ||
            next
                ?.consumeRevision ===
                true,
        changedDomains: [
            ...new Set([
                ...(
                    current
                        ?.changedDomains ||
                    []
                ),
                ...(
                    next
                        ?.changedDomains ||
                    []
                ),
            ]),
        ],
    };
}

export function createGuardedSavePorts(
    {
        getContext: getHostContext,
        saveMetadataDebounced:
            hostSaveMetadataDebounced =
            () => {},
        guard =
        createSaveRevisionGuard(),
        onConflict = () => {},
    } = {},
) {
    if (
        typeof getHostContext !==
        'function'
    ) {
        throw new TypeError(
            'Guarded save ports require getContext.',
        );
    }

    const proxyTargets =
        new WeakMap();
    const contextProxies =
        new WeakMap();
    let active = {
        timelineEpoch: '',
        timelineKey: '',
        baseline: null,
        conflict: null,
        migrationPending: false,
    };
    let debouncedOptions = null;
    let debounceScheduled = false;
    let metadataQueue =
        Promise.resolve();

    function unwrapContext(context) {
        return (
            proxyTargets.get(context) ||
            context
        );
    }

    function clearActiveTimeline(
        timelineKey = '',
    ) {
        active = {
            timelineEpoch: '',
            timelineKey,
            baseline: null,
            conflict: null,
            migrationPending: false,
        };
    }

    function setConflict(
        conflict,
        {
            restoreBaseline =
            true,
        } = {},
    ) {
        const previous =
            active.conflict;
        active.conflict =
            conflict;
        const context =
            unwrapContext(
                getHostContext(),
            );
        const worldState =
            context
                ?.chatMetadata
                ?.hogwartsMud;
        if (
            restoreBaseline &&
            active.baseline &&
            worldState
                ?.timelineEpoch ===
                active.timelineEpoch
        ) {
            context.chatMetadata
                .hogwartsMud =
                structuredClone(
                    active.baseline,
                );
        }
        if (
            !previous ||
            previous.code !==
                conflict.code ||
            previous.actualRevision !==
                conflict.actualRevision
        ) {
            onConflict(
                conflict,
                SAVE_REVISION_REFRESH_MESSAGE,
            );
        }
        return conflict;
    }

    function handleHostSaveError(
        error,
        {
            additions = [],
            context,
            pendingState,
            source,
        },
    ) {
        if (
            !(
                error instanceof
                HostSaveDurabilityError
            )
        ) {
            throw error;
        }
        if (
            error.confirmedFailure
        ) {
            context
                .chatMetadata
                .hogwartsMud =
                pendingState;
            additions.forEach(
                addition => {
                    const index =
                        context.chat
                            ?.indexOf(
                                addition,
                            ) ??
                        -1;
                    if (index >= 0) {
                        context.chat
                            .splice(
                                index,
                                1,
                            );
                    }
                },
            );
            throw error;
        }
        const committedState =
            context
                ?.chatMetadata
                ?.hogwartsMud;
        setConflict(
            {
                code:
                    'save_in_progress',
                timelineEpoch:
                    active
                        .timelineEpoch,
                expectedRevision:
                    active.baseline
                        ?.stateRevision,
                actualRevision:
                    committedState
                        ?.stateRevision ??
                    active.baseline
                        ?.stateRevision,
                source,
                recoverable: true,
            },
            {
                restoreBaseline:
                    false,
            },
        );
        throw error;
    }

    function prepareContext(
        inputContext,
    ) {
        const context =
            unwrapContext(
                inputContext,
            );
        const timelineKey =
            getTimelineKey(context);
        const worldState =
            context
                ?.chatMetadata
                ?.hogwartsMud;
        if (!worldState) {
            return null;
        }
        const migration =
            migrateSaveRevisionState(
                worldState,
                {
                    timelineKey,
                },
            );
        if (migration.changed) {
            context.chatMetadata
                .hogwartsMud =
                migration.state;
        }
        return {
            context,
            state:
                context.chatMetadata
                    .hogwartsMud,
            timelineKey,
            migrationChanged:
                migration.changed,
        };
    }

    function observeContext(
        inputContext,
        {
            force = false,
            migrationPending =
            false,
        } = {},
    ) {
        const prepared =
            prepareContext(
                inputContext,
            );
        if (!prepared) {
            const context =
                unwrapContext(
                    inputContext,
                );
            const timelineKey =
                getTimelineKey(
                    context,
                );
            if (
                force ||
                (
                    active.timelineKey &&
                    active.timelineKey !==
                        timelineKey
                )
            ) {
                clearActiveTimeline(
                    timelineKey,
                );
            }
            return null;
        }
        const {
            context,
            state,
            timelineKey,
            migrationChanged,
        } = prepared;
        const pendingMigration =
            migrationChanged ||
            migrationPending ||
            (
                active.timelineEpoch ===
                    state.timelineEpoch &&
                active.migrationPending
            );
        if (
            force ||
            active.timelineEpoch !==
                state.timelineEpoch
        ) {
            const previousConflict =
                active.timelineEpoch ===
                    state.timelineEpoch
                    ? active.conflict
                    : null;
            const registered =
                guard.registerHead(
                    state,
                );
            active = {
                timelineEpoch:
                    state
                        .timelineEpoch,
                timelineKey,
                baseline:
                    structuredClone(
                        state,
                    ),
                conflict: null,
                migrationPending:
                    pendingMigration,
            };
            if (
                registered.claimId ||
                registered
                    .stateRevision !==
                state.stateRevision
            ) {
                active.conflict =
                    previousConflict;
                setConflict({
                    code:
                        registered
                            .claimId
                            ? 'save_in_progress'
                            : 'stale_save',
                    timelineEpoch:
                        state
                            .timelineEpoch,
                    expectedRevision:
                        state
                            .stateRevision,
                    actualRevision:
                        registered
                            .stateRevision,
                    source:
                        'timeline_load',
                    recoverable: true,
                });
            }
        } else if (
            migrationChanged ||
            migrationPending
        ) {
            active.migrationPending =
                true;
        }
        return {
            context,
            state,
            timelineKey,
            migrationChanged:
                migrationChanged,
        };
    }

    function assertSaveRevisionWritable() {
        if (active.conflict) {
            throw new SaveRevisionConflictError(
                active.conflict,
            );
        }
    }

    async function saveMetadataForContext(
        inputContext,
        options = {},
    ) {
        let observed =
            observeContext(
                inputContext,
            );
        const context =
            unwrapContext(
                inputContext,
            );
        const hostSave =
            context?.saveMetadata;
        if (
            typeof hostSave !==
            'function'
        ) {
            throw new TypeError(
                'Hogwarts context does not provide saveMetadata.',
            );
        }
        if (!observed) {
            return hostSave.call(
                context,
            );
        }
        assertSaveRevisionWritable();
        const pendingState =
            observed.state;
        const source =
            String(
                options?.source ||
                'metadata',
            );
        let result;
        try {
            result =
                await guard.guardedSave({
                    currentState:
                    active.baseline,
                    nextState:
                    pendingState,
                    source,
                    timelineKey:
                    observed
                        .timelineKey,
                    changedDomains:
                    options
                        ?.changedDomains ||
                    [],
                    consumeRevision:
                    options
                        ?.consumeRevision ===
                    true,
                    save:
                    async committed => {
                        context
                            .chatMetadata
                            .hogwartsMud =
                            committed;
                        return hostSave
                            .call(
                                context,
                            );
                    },
                });
        } catch (error) {
            handleHostSaveError(
                error,
                {
                    context,
                    pendingState,
                    source,
                },
            );
        }
        if (!result.ok) {
            setConflict(
                result.conflict,
            );
            throw new SaveRevisionConflictError(
                result.conflict,
            );
        }
        if (
            active.timelineEpoch ===
            result.state.timelineEpoch
        ) {
            active.baseline =
                structuredClone(
                    result.state,
                );
            active.migrationPending =
                false;
        }
        return result;
    }

    async function guardedSaveTransaction(
        {
            currentState,
            nextState,
            source = 'transaction',
            changedDomains = [],
            chatMessages = [],
            consumeRevision =
            false,
        },
    ) {
        const observed =
            observeContext(
                getHostContext(),
            );
        if (!observed) {
            throw new TypeError(
                'Guarded transaction requires an active Hogwarts world.',
            );
        }
        assertSaveRevisionWritable();
        const context =
            observed.context;
        const hostSave =
            context?.saveMetadata;
        if (
            typeof hostSave !==
            'function'
        ) {
            throw new TypeError(
                'Hogwarts context does not provide saveMetadata.',
            );
        }
        const runtimeOnlyAdvance =
            currentState
                ?.timelineEpoch ===
            observed.state
                .timelineEpoch &&
            isStateRevisionCurrentOrModelTaskRuntimeOnly(
                observed.state,
                currentState
                    ?.stateRevision,
            );
        const transactionCurrentState =
            runtimeOnlyAdvance
                ? observed.state
                : currentState;
        const transactionNextState =
            runtimeOnlyAdvance
                ? {
                    ...nextState,
                    saveRevisionVersion:
                        observed.state
                            .saveRevisionVersion,
                    timelineEpoch:
                        observed.state
                            .timelineEpoch,
                    stateRevision:
                        observed.state
                            .stateRevision,
                    revisionHistory:
                        structuredClone(
                            observed.state
                                .revisionHistory ||
                            [],
                        ),
                    modelTaskRuntime:
                        structuredClone(
                            observed.state
                                .modelTaskRuntime ||
                            {},
                        ),
                }
                : nextState;
        if (
            transactionCurrentState
                ?.timelineEpoch !==
                observed.state
                    .timelineEpoch ||
            transactionCurrentState
                ?.stateRevision !==
                observed.state
                    .stateRevision ||
            hasWorldStateChanges(
                transactionCurrentState,
                observed.state,
            )
        ) {
            throw new SaveRevisionConflictError({
                code: 'stale_save',
                timelineEpoch:
                    transactionCurrentState
                        ?.timelineEpoch ||
                    observed.state
                        .timelineEpoch,
                expectedRevision:
                    transactionCurrentState
                        ?.stateRevision,
                actualRevision:
                    observed.state
                        .stateRevision,
                source,
                recoverable: true,
            });
        }
        if (!Array.isArray(chatMessages)) {
            throw new TypeError(
                'Guarded transaction chatMessages must be an array.',
            );
        }
        if (!Array.isArray(context.chat)) {
            throw new TypeError(
                'Guarded transaction requires the active chat array.',
            );
        }
        const pendingState =
            observed.state;
        const additions =
            structuredClone(
                chatMessages,
            );
        let result;
        try {
            result =
                await guard.guardedSave({
                    currentState:
                        transactionCurrentState,
                    nextState:
                        transactionNextState,
                    source,
                    timelineKey:
                    observed
                        .timelineKey,
                    changedDomains,
                    consumeRevision:
                    consumeRevision ===
                    true,
                    save:
                    async committed => {
                        context
                            .chatMetadata
                            .hogwartsMud =
                            committed;
                        context.chat.push(
                            ...additions,
                        );
                        return hostSave
                            .call(
                                context,
                            );
                    },
                });
        } catch (error) {
            handleHostSaveError(
                error,
                {
                    additions,
                    context,
                    pendingState,
                    source,
                },
            );
        }
        if (!result.ok) {
            setConflict(
                result.conflict,
            );
            throw new SaveRevisionConflictError(
                result.conflict,
            );
        }
        if (
            active.timelineEpoch ===
            result.state.timelineEpoch
        ) {
            active.baseline =
                structuredClone(
                    result.state,
                );
            active.migrationPending =
                false;
        }
        return result;
    }

    async function guardedRewriteTimeline(
        {
            currentState,
            nextState,
            currentChat,
            nextChat,
            source =
            'language_authority_migration',
            changedDomains = [
                'language_authority',
            ],
        },
    ) {
        const observed =
            observeContext(
                getHostContext(),
            );
        if (!observed) {
            throw new TypeError(
                'Guarded timeline rewrite requires an active Hogwarts world.',
            );
        }
        assertSaveRevisionWritable();
        const context =
            observed.context;
        const hostSave =
            context?.saveChat;
        if (
            typeof hostSave !==
            'function'
        ) {
            throw new TypeError(
                'Hogwarts context does not provide saveChat.',
            );
        }
        if (
            currentState
                ?.timelineEpoch !==
                observed.state
                    .timelineEpoch ||
            currentState
                ?.stateRevision !==
                observed.state
                    .stateRevision ||
            hasWorldStateChanges(
                currentState,
                observed.state,
            )
        ) {
            throw new SaveRevisionConflictError({
                code: 'stale_save',
                timelineEpoch:
                    currentState
                        ?.timelineEpoch ||
                    observed.state
                        .timelineEpoch,
                expectedRevision:
                    currentState
                        ?.stateRevision,
                actualRevision:
                    observed.state
                        .stateRevision,
                source,
                recoverable: true,
            });
        }
        if (
            !Array.isArray(
                currentChat,
            ) ||
            !Array.isArray(
                nextChat,
            ) ||
            !Array.isArray(
                context.chat,
            )
        ) {
            throw new TypeError(
                'Guarded timeline rewrite requires current and next chat arrays.',
            );
        }
        if (
            JSON.stringify(
                currentChat,
            ) !==
            JSON.stringify(
                context.chat,
            )
        ) {
            throw new SaveRevisionConflictError({
                code:
                    'stale_chat',
                timelineEpoch:
                    observed.state
                        .timelineEpoch,
                expectedRevision:
                    currentState
                        .stateRevision,
                actualRevision:
                    observed.state
                        .stateRevision,
                source,
                recoverable: true,
            });
        }
        const previousState =
            context
                .chatMetadata
                .hogwartsMud;
        const previousChat =
            structuredClone(
                context.chat,
            );
        const hostChat =
            context.chat;
        const rewrittenChat =
            structuredClone(
                nextChat,
            );
        let result;
        try {
            result =
                await guard.guardedSave({
                    currentState,
                    nextState,
                    source,
                    timelineKey:
                        observed
                            .timelineKey,
                    changedDomains,
                    consumeRevision:
                        true,
                    save:
                    async committed => {
                        context
                            .chatMetadata
                            .hogwartsMud =
                            committed;
                        hostChat.splice(
                            0,
                            hostChat.length,
                            ...structuredClone(
                                rewrittenChat,
                            ),
                        );
                        return hostSave
                            .call(
                                context,
                            );
                    },
                });
        } catch (error) {
            context
                .chatMetadata
                .hogwartsMud =
                previousState;
            hostChat.splice(
                0,
                hostChat.length,
                ...structuredClone(
                    previousChat,
                ),
            );
            if (
                error instanceof
                HostSaveDurabilityError
            ) {
                if (
                    !error
                        .confirmedFailure
                ) {
                    setConflict(
                        {
                            code:
                                'save_in_progress',
                            timelineEpoch:
                                active
                                    .timelineEpoch,
                            expectedRevision:
                                active.baseline
                                    ?.stateRevision,
                            actualRevision:
                                currentState
                                    .stateRevision,
                            source,
                            recoverable:
                                true,
                        },
                        {
                            restoreBaseline:
                                false,
                        },
                    );
                }
            }
            throw error;
        }
        if (!result.ok) {
            context
                .chatMetadata
                .hogwartsMud =
                previousState;
            hostChat.splice(
                0,
                hostChat.length,
                ...structuredClone(
                    previousChat,
                ),
            );
            setConflict(
                result.conflict,
            );
            throw new SaveRevisionConflictError(
                result.conflict,
            );
        }
        if (
            active.timelineEpoch ===
            result.state.timelineEpoch
        ) {
            active.baseline =
                structuredClone(
                    result.state,
                );
            active.migrationPending =
                false;
        }
        return result;
    }

    async function saveChatForContext(
        inputContext,
        options = {},
    ) {
        let observed =
            observeContext(
                inputContext,
            );
        const context =
            unwrapContext(
                inputContext,
            );
        const hostSave =
            context?.saveChat;
        if (
            typeof hostSave !==
            'function'
        ) {
            throw new TypeError(
                'Hogwarts context does not provide saveChat.',
            );
        }
        if (!observed) {
            return hostSave.call(
                context,
            );
        }
        assertSaveRevisionWritable();
        if (
            hasWorldStateChanges(
                active.baseline,
                observed.state,
            )
        ) {
            await saveMetadataForContext(
                context,
                {
                    source:
                        options?.source
                            ? `${
                                options
                                    .source
                            }:metadata`
                            : 'chat:metadata',
                    changedDomains:
                        options
                            ?.changedDomains ||
                        [],
                },
            );
            observed =
                observeContext(
                    context,
                );
        }
        let result;
        try {
            result =
                await guard.guardedSave({
                    currentState:
                    active.baseline,
                    nextState:
                    observed.state,
                    source:
                    options?.source ||
                    'chat',
                    kind: 'chat-only',
                    timelineKey:
                    observed
                        .timelineKey,
                    save: () =>
                        hostSave.call(
                            context,
                        ),
                });
        } catch (error) {
            handleHostSaveError(
                error,
                {
                    context,
                    pendingState:
                        observed.state,
                    source:
                        options?.source ||
                        'chat',
                },
            );
        }
        if (!result.ok) {
            setConflict(
                result.conflict,
            );
            throw new SaveRevisionConflictError(
                result.conflict,
            );
        }
        return result;
    }

    function getContext() {
        const context =
            getHostContext();
        observeContext(context);
        if (
            !context ||
            typeof context !==
                'object'
        ) {
            return context;
        }
        let proxy =
            contextProxies.get(
                context,
            );
        if (proxy) {
            return proxy;
        }
        proxy = new Proxy(
            context,
            {
                get(target, property) {
                    if (
                        property ===
                        'saveMetadata'
                    ) {
                        return options =>
                            saveMetadataForContext(
                                target,
                                options,
                            );
                    }
                    if (
                        property ===
                        'saveChat'
                    ) {
                        return options =>
                            saveChatForContext(
                                target,
                                options,
                            );
                    }
                    const value =
                        Reflect.get(
                            target,
                            property,
                            target,
                        );
                    return typeof value ===
                        'function'
                        ? value.bind(
                            target,
                        )
                        : value;
                },
                set(
                    target,
                    property,
                    value,
                ) {
                    return Reflect.set(
                        target,
                        property,
                        value,
                        target,
                    );
                },
            },
        );
        contextProxies.set(
            context,
            proxy,
        );
        proxyTargets.set(
            proxy,
            context,
        );
        return proxy;
    }

    async function guardedSaveMetadata(
        options = {},
    ) {
        return saveMetadataForContext(
            getHostContext(),
            options,
        );
    }

    async function guardedSaveChat(
        options = {},
    ) {
        return saveChatForContext(
            getHostContext(),
            options,
        );
    }

    function saveMetadataDebounced(
        options = {},
    ) {
        const context =
            getHostContext();
        if (
            !context
                ?.chatMetadata
                ?.hogwartsMud
        ) {
            return hostSaveMetadataDebounced();
        }
        debouncedOptions =
            mergeSaveOptions(
                debouncedOptions,
                options,
            );
        if (debounceScheduled) {
            return;
        }
        debounceScheduled = true;
        queueMicrotask(() => {
            debounceScheduled =
                false;
            const pending =
                debouncedOptions;
            debouncedOptions =
                null;
            metadataQueue =
                metadataQueue
                    .then(() =>
                        guardedSaveMetadata(
                            pending,
                        ))
                    .catch(error => {
                        if (
                            !(
                                error instanceof
                                SaveRevisionConflictError
                            )
                        ) {
                            console.error(
                                '[Hogwarts MUD] Guarded metadata save failed',
                                error,
                            );
                        }
                    });
        });
    }

    async function flushPendingMetadataSave() {
        if (debounceScheduled) {
            await new Promise(resolve =>
                queueMicrotask(
                    resolve,
                ));
        }
        await metadataQueue;
    }

    async function registerSaveRevisionHead(
        inputContext =
        getHostContext(),
        {
            persistMigration =
            true,
            adoptPersistedHead = false,
        } = {},
    ) {
        const prepared =
            prepareContext(
                inputContext,
            );
        if (prepared) {
            if (
                adoptPersistedHead &&
                typeof guard
                    .replaceHead ===
                'function'
            ) {
                await guard.replaceHead(
                    prepared.state,
                );
            } else if (
                typeof guard
                    .recoverHead ===
                'function'
            ) {
                await guard.recoverHead(
                    prepared.state,
                );
            }
        }
        const observed =
            observeContext(
                prepared?.context ||
                inputContext,
                {
                    force: true,
                    migrationPending:
                        prepared
                            ?.migrationChanged ||
                        false,
                },
            );
        if (
            !observed ||
            active.conflict ||
            !persistMigration ||
            !active
                .migrationPending
        ) {
            return {
                state:
                    observed?.state ||
                    null,
                conflict:
                    active.conflict,
            };
        }
        return saveMetadataForContext(
            observed.context,
            {
                source:
                    'revision_migration',
            },
        );
    }

    function initializeNewTimelineState(
        worldState,
        options = {},
    ) {
        return {
            ...structuredClone(
                worldState,
            ),
            ...createNewSaveRevisionState(
                options,
            ),
        };
    }

    return {
        SAVE_REVISION_REFRESH_MESSAGE,
        assertSaveRevisionWritable,
        flushPendingMetadataSave,
        getContext,
        getSaveRevisionConflict:
            () =>
                active.conflict,
        guardedRewriteTimeline,
        guardedSaveChat,
        guardedSaveMetadata,
        guardedSaveTransaction,
        initializeNewTimelineState,
        isSaveRevisionBlocked:
            () =>
                Boolean(
                    active.conflict,
                ),
        registerSaveRevisionHead,
        saveMetadataDebounced,
    };
}
