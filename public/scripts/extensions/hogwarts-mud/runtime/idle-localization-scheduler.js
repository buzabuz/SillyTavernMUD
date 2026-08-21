function hasActiveJobs(
    registry,
) {
    return Boolean(
        registry.opening ||
        registry.foundation ||
        registry.daily ||
        registry
            .mediumCalendarDirector ||
        registry.pacing ||
        registry.memory ||
        registry.sceneTransition ||
        registry.calendarMoment ||
        registry.interiorMap ||
        registry.turnActive ||
        registry
            .sceneTransitionActive ||
        registry
            .localizationActiveBatch ||
        registry.translation?.size ||
        registry.turnSettlement?.size,
    );
}

function hasBlockingCurrentTurnJobs(
    registry,
    turnJobKey,
) {
    const turnSettlements =
        registry.turnSettlement;
    const hasOtherTurnSettlement =
        turnSettlements instanceof Map
            ? [
                ...turnSettlements
                    .keys(),
            ].some(key =>
                key !== turnJobKey)
            : Boolean(
                turnSettlements?.size,
            );
    return Boolean(
        registry.opening ||
        registry.foundation ||
        registry.daily ||
        registry
            .mediumCalendarDirector ||
        registry.pacing ||
        registry.memory ||
        registry.sceneTransition ||
        registry.calendarMoment ||
        registry.interiorMap ||
        registry
            .sceneTransitionActive ||
        registry
            .localizationActiveBatch ||
        registry.translation?.size ||
        hasOtherTurnSettlement,
    );
}

export function createIdleLocalizationScheduler({
    queue,
    automaticWork,
    jobRegistry,
    getProviderId,
    getActionId = () => '',
    hasPendingSave =
    () => false,
    isDocumentVisible =
    () => true,
    translateBatch,
    upsertRows,
    recordFailure =
    async () => {},
    render = () => {},
    requestIdle =
    globalThis
        .requestIdleCallback
        ?.bind(globalThis),
    cancelIdle =
    globalThis
        .cancelIdleCallback
        ?.bind(globalThis),
    setTimer =
    globalThis.setTimeout
        ?.bind(globalThis),
    clearTimer =
    globalThis.clearTimeout
        ?.bind(globalThis),
    onCurrentTurnP0StateChange =
    () => {},
} = {}) {
    if (
        !queue ||
        typeof translateBatch !==
            'function' ||
        typeof upsertRows !==
            'function'
    ) {
        throw new TypeError(
            'Idle localization scheduler requires queue, translateBatch and upsertRows.',
        );
    }
    let scheduled = null;
    let active = false;
    let stopped = false;

    function notifyCurrentTurnP0State(
        activeState,
        keys,
    ) {
        try {
            onCurrentTurnP0StateChange({
                active:
                    activeState,
                keys: [...keys],
            });
        } catch {
            // UI progress cannot fail or retry translation work.
        }
    }

    function gatesOpen() {
        return Boolean(
            !stopped &&
            automaticWork
                ?.suppressed !== true &&
            !hasActiveJobs(
                jobRegistry || {},
            ) &&
            !hasPendingSave() &&
            !active &&
            isDocumentVisible(),
        );
    }

    function cancelScheduled() {
        if (!scheduled) {
            return;
        }
        if (
            scheduled.kind === 'idle'
        ) {
            cancelIdle?.(
                scheduled.id,
            );
        } else {
            clearTimer?.(
                scheduled.id,
            );
        }
        scheduled = null;
    }

    function beginDispatch(
        providerId,
        batch,
        {
            currentTurnP0 =
            false,
        } = {},
    ) {
        if (
            !batch.length ||
            !queue.beginBatch(
                batch,
            )
        ) {
            return null;
        }
        const keys =
            batch.map(item =>
                item.key);
        active = true;
        if (jobRegistry) {
            jobRegistry
                .localizationActiveBatch = [
                    ...keys,
                ];
        }
        if (currentTurnP0) {
            notifyCurrentTurnP0State(
                true,
                keys,
            );
        }
        const completion =
            (async () => {
                try {
                    const rows =
                        await translateBatch({
                            providerId,
                            candidates:
                                batch,
                        });
                    await upsertRows(
                        rows,
                    );
                    queue.completeBatch(
                        keys,
                    );
                    if (
                        !currentTurnP0
                    ) {
                        render(keys);
                    }
                    return true;
                } catch (error) {
                    try {
                        await recordFailure({
                            candidates:
                                batch,
                            errorCode:
                                error?.code ||
                                'TRANSLATION_FAILED',
                        });
                    } catch {
                        // The provider request is never retried.
                    }
                    queue.failBatch(
                        keys,
                        error?.code ||
                            'TRANSLATION_FAILED',
                    );
                    return false;
                } finally {
                    active = false;
                    if (jobRegistry) {
                        jobRegistry
                            .localizationActiveBatch =
                            null;
                    }
                    if (
                        currentTurnP0
                    ) {
                        notifyCurrentTurnP0State(
                            false,
                            keys,
                        );
                        render(keys);
                    }
                    schedule();
                }
            })();
        return {
            keys,
            completion,
        };
    }

    async function dispatch(
        expectedActionId,
    ) {
        scheduled = null;
        if (
            !gatesOpen() ||
            getActionId() !==
                expectedActionId
        ) {
            return false;
        }
        const providerId =
            getProviderId();
        if (
            ![
                'local',
                'google',
                'bing',
            ].includes(
                providerId,
            )
        ) {
            return false;
        }
        const batch =
            queue.nextBatch(
                providerId,
            );
        const started =
            beginDispatch(
                providerId,
                batch,
            );
        if (!started) {
            return false;
        }
        return started.completion;
    }

    function dispatchCurrentTurnP0({
        expectedActionId,
        turnJobKey,
        keys,
    } = {}) {
        const providerId =
            getProviderId();
        if (
            stopped ||
            automaticWork
                ?.suppressed === true ||
            ![
                'local',
                'google',
                'bing',
            ].includes(
                providerId,
            ) ||
            jobRegistry
                ?.turnActive !== true ||
            !(
                jobRegistry
                    ?.turnSettlement instanceof
                    Map &&
                jobRegistry
                    .turnSettlement
                    .has(turnJobKey)
            ) ||
            hasBlockingCurrentTurnJobs(
                jobRegistry || {},
                turnJobKey,
            ) ||
            hasPendingSave() ||
            active ||
            !isDocumentVisible() ||
            getActionId() !==
                expectedActionId
        ) {
            return {
                started: false,
                keys: [],
                completion:
                    Promise.resolve(
                        false,
                    ),
            };
        }
        const batch =
            queue.nextBatchForKeys(
                providerId,
                keys || [],
            );
        if (
            !batch.length ||
            batch.some(candidate =>
                candidate.priority !==
                0)
        ) {
            return {
                started: false,
                keys: [],
                completion:
                    Promise.resolve(
                        false,
                    ),
            };
        }
        const started =
            beginDispatch(
                providerId,
                batch,
                {
                    currentTurnP0:
                        true,
                },
            );
        return started
            ? {
                started: true,
                ...started,
            }
            : {
                started: false,
                keys: [],
                completion:
                    Promise.resolve(
                        false,
                    ),
            };
    }

    function schedule() {
        if (
            scheduled ||
            !gatesOpen()
        ) {
            return false;
        }
        const expectedActionId =
            getActionId();
        if (requestIdle) {
            const id =
                requestIdle(
                    deadline => {
                        if (
                            deadline
                                .timeRemaining() <=
                                0 &&
                            !deadline
                                .didTimeout
                        ) {
                            scheduled = null;
                            schedule();
                            return;
                        }
                        void dispatch(
                            expectedActionId,
                        );
                    },
                );
            scheduled = {
                kind: 'idle',
                id,
            };
            return true;
        }
        const id =
            setTimer?.(
                () => {
                    if (
                        !gatesOpen()
                    ) {
                        scheduled = null;
                        return;
                    }
                    void dispatch(
                        expectedActionId,
                    );
                },
                0,
            );
        scheduled = {
            kind: 'timer',
            id,
        };
        return true;
    }

    function notifyPlayerAction() {
        cancelScheduled();
    }

    function stop() {
        stopped = true;
        cancelScheduled();
    }

    return Object.freeze({
        schedule,
        notifyPlayerAction,
        stop,
        gatesOpen,
        dispatch,
        dispatchCurrentTurnP0,
        isActive:
            () => active,
    });
}
