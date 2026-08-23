import {
    getCalendarMomentContext,
    getTimelineMomentContext,
    normalizeCalendarEntryIds,
} from '../domain/calendar-scene.js';
import {
    settleCalendarAtClock,
} from '../domain/calendar-reducer.js';
import {
    worldClockToEpochMinutes,
} from '../domain/time-environment.js';

/**
 * Model-route: sceneTransition.result.languageSkipped.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

function createConflictError(
    result,
) {
    const error =
        new Error(
            '时间线已在其他页面更新，请刷新后继续。',
        );
    error.name =
        'CalendarMomentConflictError';
    error.code =
        result?.conflict?.code ||
        result?.status ||
        'stale_save';
    error.conflict =
        result?.conflict ||
        null;
    return error;
}

function transitionMinutesBetween(
    currentClock,
    targetClock,
) {
    const current =
        worldClockToEpochMinutes(
            currentClock,
        );
    const target =
        worldClockToEpochMinutes(
            targetClock,
        );
    if (
        current === null ||
        target === null ||
        target < current
    ) {
        throw new Error(
            'Moment 目标时钟不得早于当前世界时钟。',
        );
    }
    return target - current;
}

function buildCalendarDestinationHint(
    context,
) {
    if (!context.target) {
        return [
            'Free timeline moment.',
            `Target clock: ${context.targetClock}.`,
            `Required location: ${context.suggestedDestination.mapId}/${context.suggestedDestination.roomId}.`,
        ].join(' ');
    }
    return [
        `Calendar moment: ${context.target.titleEn}.`,
        `Target clock: ${context.targetClock}.`,
        `Suggested location only: ${context.suggestedDestination.mapId}/${context.suggestedDestination.roomId}.`,
    ].join(' ');
}

function createCalendarMomentLanguageSkippedError(
    diagnostics,
) {
    const error =
        new Error(
            'Scene director returned non-English structured content.',
        );
    error.name =
        'CalendarMomentLanguageSkippedError';
    error.code =
        'language_skipped';
    error.diagnostics =
        Array.isArray(diagnostics)
            ? diagnostics
            : [];
    return error;
}

export function createCalendarMomentWorkflow(
    ports,
) {
    const {
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        applySceneTransition,
        applySystemPrompt =
        () => {},
        buildSceneArchiveEntry,
        buildSceneTransitionMessage,
        createContextBudgetPlan,
        generateSceneTransitionOpening,
        generateSceneTransitionPackage,
        getContext,
        getMudState,
        guardedSaveTransaction,
        jobRegistry = {},
        renderAll =
        () => {},
        resolveRoleSlots,
        retrieveLocalKnowledge =
        async () => [],
    } = ports;

    function setMomentPhase(
        phase,
    ) {
        jobRegistry
            .calendarMomentPhase =
            phase;
        renderAll();
    }

    async function runMoment(
        resolveMoment,
    ) {
        if (
            jobRegistry
                .calendarMoment
        ) {
            return jobRegistry
                .calendarMoment;
        }
        if (
            jobRegistry
                .sceneTransition ||
            jobRegistry
                .sceneTransitionActive ||
            jobRegistry.turnActive
        ) {
            throw new Error(
                '世界状态仍在结算，暂时不能进入 Moment。',
            );
        }
        const state =
            getMudState();
        if (
            !state?.scene ||
            state.phase !==
                'playing'
        ) {
            throw new Error(
                '当前没有可以结束的活动场景。',
            );
        }
        const moment =
            resolveMoment(state);
        const slots =
            resolveRoleSlots(
                state.modelSlots,
            );
        const roleSlot =
            moment.tier === 'high'
                ? slots.high
                : slots.medium;
        if (!roleSlot?.profileId) {
            throw new Error(
                `未配置${moment.tier === 'high' ? '高档' : '中档'} Connection Profile。`,
            );
        }
        if (!slots.low?.profileId) {
            throw new Error(
                '未配置低档 Connection Profile，无法生成场景开场。',
            );
        }
        const contextPlan =
            createContextBudgetPlan(
                roleSlot.contextSize ||
                CONTEXT_SIZE_PRESETS
                    ?.rich,
                roleSlot
                    .maxResponseLength ||
                DEFAULT_MODEL_SLOTS
                    ?.medium
                    ?.maxResponseLength,
            );
        const openingContextPlan =
            createContextBudgetPlan(
                slots.low.contextSize,
                slots.low
                    .maxResponseLength,
            );
        const transitionMinutes =
            transitionMinutesBetween(
                state.clock,
                moment.targetClock,
            );
        const transitionContext = {
            kind:
                moment.kind,
            fixedClock:
                moment.targetClock,
            fixedTransitionMinutes:
                transitionMinutes,
            suggestedDestination:
                structuredClone(
                    moment
                        .suggestedDestination,
                ),
            targetEntry:
                structuredClone(
                    moment.target,
                ),
            calendarEntries:
                structuredClone(
                    moment.entries,
                ),
            calendarStorySources:
                structuredClone(
                    moment.storySources,
                ),
            noModelRetry: true,
        };
        const destinationHint =
            buildCalendarDestinationHint(
                moment,
            );
        const intentOverride = {
            changed: true,
            destinationChanged:
                moment
                    .lockDestination,
            tierChanged:
                moment.tier !==
                state.scene
                    ?.nextSceneIntent
                    ?.tier,
            text: destinationHint,
            requestedTier:
                moment.tier,
            calendarMoment:
                moment.kind ===
                'calendar_moment',
            timelineMoment:
                moment.kind ===
                'timeline_moment',
        };
        const entityIds = [
            state.scene.id,
            moment
                .suggestedDestination
                .mapId,
            moment
                .suggestedDestination
                .roomId,
            ...moment.entries
                .flatMap(entry =>
                    entry
                        .participantIds),
        ].filter(Boolean);
        const expectedDestination =
            moment.lockDestination
                ? structuredClone(
                    moment
                        .suggestedDestination,
                )
                : null;
        const knowledgeQuery =
            moment.target
                ? `Enter ${moment.target.titleEn} at ${moment.targetClock}.`
                : `Begin a free scene at ${moment.targetClock} in ${moment.suggestedDestination.mapId}/${moment.suggestedDestination.roomId}.`;

        setMomentPhase(
            'preparing',
        );
        jobRegistry
            .calendarMoment =
        (async () => {
            jobRegistry
                .sceneTransitionActive =
                true;
            const retrievedKnowledge =
                await retrieveLocalKnowledge(
                    knowledgeQuery,
                    [
                        ...new Set(
                            entityIds,
                        ),
                    ],
                    {
                        includeLockedClues:
                            moment.tier ===
                            'high',
                        limit:
                            contextPlan
                                .ragLimit,
                    },
                );
            setMomentPhase(
                'archiving',
            );
            let payload =
                await generateSceneTransitionPackage(
                    roleSlot,
                    state,
                    moment.tier,
                    destinationHint,
                    expectedDestination,
                    intentOverride,
                    retrievedKnowledge,
                    contextPlan,
                    transitionContext,
                );
            if (
                payload
                    ?.languageSkipped
            ) {
                throw createCalendarMomentLanguageSkippedError(
                    payload.diagnostics,
                );
            }
            setMomentPhase(
                'opening',
            );
            payload = {
                ...payload,
                transitionMinutes,
                nextClock:
                    moment.targetClock,
            };
            payload =
                await generateSceneTransitionOpening(
                    slots.low,
                    state,
                    payload,
                    expectedDestination,
                    openingContextPlan,
                    transitionContext,
                );
            setMomentPhase(
                'saving',
            );
            const archiveEntry = {
                ...buildSceneArchiveEntry(
                    state,
                    payload,
                    moment.tier,
                ),
                calendarEntryIds:
                    normalizeCalendarEntryIds(
                        state.scene
                            .calendarEntryIds,
                    ),
            };
            const startedMessageId =
                getContext().chat
                    .length;
            const transitioned =
                applySceneTransition(
                    state,
                    payload,
                    archiveEntry,
                    {
                        startedMessageId,
                        tier:
                            moment.tier,
                        calendarEntryIds:
                            moment
                                .calendarEntryIds,
                    },
                );
            if (
                transitioned.clock !==
                moment.targetClock
            ) {
                throw new Error(
                    'Scene Transition 未保持 Moment 目标时钟。',
                );
            }
            const nextState =
                settleCalendarAtClock(
                    transitioned,
                    moment.targetClock,
                );
            const message =
                buildSceneTransitionMessage(
                    payload,
                    nextState,
                );
            const result =
                await guardedSaveTransaction({
                    currentState:
                        state,
                    nextState,
                    source:
                        moment.kind,
                    changedDomains: [
                        'calendar',
                        'clock',
                        'scene',
                        'scene_archive',
                    ],
                    chatMessages: [
                        message,
                    ],
                });
            if (!result?.ok) {
                throw createConflictError(
                    result,
                );
            }
            applySystemPrompt();
            jobRegistry
                .calendarMomentPhase =
                'committed';
            renderAll();
            return result.state;
        })();
        try {
            return await jobRegistry
                .calendarMoment;
        } finally {
            jobRegistry
                .calendarMoment =
                null;
            jobRegistry
                .sceneTransitionActive =
                false;
            jobRegistry
                .calendarMomentPhase =
                'idle';
            renderAll();
        }
    }

    async function runCalendarMoment(
        entryId,
    ) {
        return runMoment(state =>
            getCalendarMomentContext(
                state,
                entryId,
            ));
    }

    async function runTimelineMoment(
        options,
    ) {
        return runMoment(state =>
            getTimelineMomentContext(
                state,
                options,
            ));
    }

    return {
        runCalendarMoment,
        runTimelineMoment,
    };
}
