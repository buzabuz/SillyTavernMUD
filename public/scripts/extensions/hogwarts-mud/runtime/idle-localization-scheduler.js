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
        if (
            !batch.length ||
            !queue.beginBatch(
                batch,
            )
        ) {
            return false;
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
        try {
            const rows =
                await translateBatch({
                    providerId,
                    candidates:
                        batch,
                });
            await upsertRows(rows);
            queue.completeBatch(
                keys,
            );
            render(keys);
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
            schedule();
        }
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
        isActive:
            () => active,
    });
}
