import {
    normalizeCalendarEntry,
    normalizeCalendarStoryBeat,
    normalizeCalendarStoryline,
    validateCalendarState,
    isCalendarWorldClock,
} from './calendar-schema.js';
import {
    worldClockToEpochMinutes,
} from './time-environment.js';

export const CALENDAR_HIGH_PROPOSAL_FIELDS =
    Object.freeze([
        'baseTimelineEpoch',
        'baseStateRevision',
        'storylines',
        'storyBeats',
    ]);
export const CALENDAR_MEDIUM_PROPOSAL_FIELDS =
    Object.freeze([
        'baseTimelineEpoch',
        'baseStateRevision',
        'entries',
    ]);
// Keep the V1 export name for schedule proposal consumers.
export const CALENDAR_PROPOSAL_FIELDS =
    CALENDAR_MEDIUM_PROPOSAL_FIELDS;

const DIRECTOR_TIERS =
    new Set([
        'high',
        'medium',
    ]);
const TERMINAL_STATUSES =
    new Set([
        'completed',
        'cancelled',
    ]);
const DEFERABLE_STORY_BEAT_STATUSES =
    new Set([
        'planned',
        'active',
    ]);
const DIRECTOR_STATUS_TRANSITIONS =
    Object.freeze({
        planned:
            new Set([
                'planned',
                'cancelled',
            ]),
        active:
            new Set([
                'active',
                'cancelled',
            ]),
        completed:
            new Set([
                'completed',
            ]),
        cancelled:
            new Set([
                'cancelled',
            ]),
    });
const STORYLINE_STATUS_TRANSITIONS =
    Object.freeze({
        planned:
            new Set([
                'planned',
                'active',
                'cancelled',
            ]),
        active:
            new Set([
                'active',
                'resolved',
                'cancelled',
            ]),
        resolved:
            new Set([
                'resolved',
            ]),
        cancelled:
            new Set([
                'cancelled',
            ]),
    });
const STORY_BEAT_STATUS_TRANSITIONS =
    Object.freeze({
        planned:
            new Set([
                'planned',
                'active',
                'cancelled',
            ]),
        active:
            new Set([
                'active',
                'cancelled',
            ]),
        realized:
            new Set([
                'realized',
            ]),
        deferred:
            new Set([
                'deferred',
                'cancelled',
            ]),
        cancelled:
            new Set([
                'cancelled',
            ]),
    });

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function recordsEqual(
    left,
    right,
) {
    return JSON.stringify(left) ===
        JSON.stringify(right);
}

function clockMinutes(
    clock,
    label,
) {
    if (
        !isCalendarWorldClock(
            clock,
        )
    ) {
        throw new TypeError(
            `${label} 必须是绝对世界时钟。`,
        );
    }
    return worldClockToEpochMinutes(
        clock,
    );
}

function optionalClockMinutes(
    clock,
) {
    return isCalendarWorldClock(
        clock,
    )
        ? worldClockToEpochMinutes(
            clock,
        )
        : null;
}

function validateExactProposalFields(
    proposal,
    fields,
    label,
    errors,
) {
    if (!isRecord(proposal)) {
        errors.push(
            `${label} 必须是对象。`,
        );
        return false;
    }
    const allowed =
        new Set(
            fields,
        );
    const unknown =
        Object.keys(proposal)
            .filter(key =>
                !allowed.has(key));
    if (unknown.length) {
        errors.push(
            `${label} 包含未知字段：${unknown.join('、')}。`,
        );
    }
    const missing =
        fields
            .filter(key =>
                !Object.hasOwn(
                    proposal,
                    key,
                ));
    if (missing.length) {
        errors.push(
            `${label} 缺少字段：${missing.join('、')}。`,
        );
    }
    return (
        unknown.length === 0 &&
        missing.length === 0
    );
}

function normalizeProposalEntries(
    proposal,
    errors,
) {
    if (!Array.isArray(proposal.entries)) {
        errors.push(
            'Calendar proposal entries 必须是数组。',
        );
        return [];
    }
    const entries = [];
    proposal.entries
        .forEach((entry, index) => {
            try {
                entries.push(
                    normalizeCalendarEntry(
                        entry,
                    ),
                );
            } catch (error) {
                errors.push(
                    `Calendar proposal entries[${index}] 无效：${
                        String(
                            error?.message ||
                            error,
                        )
                    }`,
                );
            }
        });
    return entries;
}

function normalizeProposalRecords(
    proposal,
    field,
    normalize,
    label,
    errors,
) {
    if (!Array.isArray(proposal[field])) {
        errors.push(
            `${label} 必须是数组。`,
        );
        return [];
    }
    const records = [];
    proposal[field]
        .forEach((record, index) => {
            try {
                records.push(
                    normalize(record),
                );
            } catch (error) {
                errors.push(
                    `${label}[${index}] 无效：${
                        String(
                            error?.message ||
                            error,
                        )
                    }`,
                );
            }
        });
    return records;
}

function validateUniqueProposalIds(
    records,
    label,
    errors,
) {
    const seenIds =
        new Set();
    const duplicateIds =
        new Set();
    records.forEach(record => {
        if (seenIds.has(record.id)) {
            duplicateIds.add(
                record.id,
            );
        }
        seenIds.add(record.id);
    });
    if (duplicateIds.size) {
        errors.push(
            `${label} ID 重复：${[
                ...duplicateIds,
            ].join('、')}。`,
        );
    }
}

function validateProposalHead(
    proposal,
    worldState,
    errors,
) {
    if (
        typeof proposal
            .baseTimelineEpoch !==
            'string' ||
        !proposal
            .baseTimelineEpoch
            .trim()
    ) {
        errors.push(
            'Calendar proposal baseTimelineEpoch 无效。',
        );
    }
    if (
        !Number.isSafeInteger(
            proposal
                .baseStateRevision,
        ) ||
        proposal
            .baseStateRevision < 0
    ) {
        errors.push(
            'Calendar proposal baseStateRevision 必须是非负安全整数。',
        );
    }
    if (
        proposal
            .baseTimelineEpoch !==
        worldState.timelineEpoch
    ) {
        errors.push(
            'Calendar proposal timelineEpoch 已陈旧。',
        );
    }
    if (
        proposal
            .baseStateRevision !==
        worldState.stateRevision
    ) {
        errors.push(
            'Calendar proposal stateRevision 已陈旧。',
        );
    }
}

function validateDirectorTier(
    planningTier,
    errors,
) {
    if (
        !DIRECTOR_TIERS.has(
            planningTier,
        )
    ) {
        errors.push(
            'Calendar proposal planningTier 必须是 high 或 medium。',
        );
        return false;
    }
    return true;
}

function validateNewStoryline(
    storyline,
    currentClockMinutes,
    errors,
) {
    if (
        ![
            'planned',
            'active',
        ].includes(
            storyline.status,
        )
    ) {
        errors.push(
            `Calendar 新 storyline ${storyline.id} 必须以 planned 或 active 状态创建。`,
        );
    }
    const end =
        optionalClockMinutes(
            storyline.endClock,
        );
    if (
        end !== null &&
        end < currentClockMinutes
    ) {
        errors.push(
            `Calendar 新 storyline ${storyline.id} 已经结束。`,
        );
    }
}

function validateExistingStoryline(
    current,
    incoming,
    currentClockMinutes,
    errors,
) {
    const changed =
        !recordsEqual(
            current,
            incoming,
        );
    if (
        incoming.createdClock !==
        current.createdClock
    ) {
        errors.push(
            `Calendar storyline ${incoming.id} 的 createdClock 创建后不可修改。`,
        );
    }
    if (
        changed &&
        [
            'resolved',
            'cancelled',
        ].includes(
            current.status,
        )
    ) {
        errors.push(
            `Calendar storyline ${incoming.id} 已终结，只能只读。`,
        );
    }
    if (
        !STORYLINE_STATUS_TRANSITIONS[
            current.status
        ]?.has(
            incoming.status,
        )
    ) {
        errors.push(
            `Calendar storyline ${incoming.id} 的状态转换无效。`,
        );
    }
    const currentEnd =
        optionalClockMinutes(
            current.endClock,
        );
    if (
        changed &&
        currentEnd !== null &&
        currentEnd <
            currentClockMinutes
    ) {
        errors.push(
            `Calendar storyline ${incoming.id} 已经结束，只能只读。`,
        );
    }
}

function validateNewStoryBeat(
    beat,
    currentClockMinutes,
    errors,
) {
    if (
        ![
            'planned',
            'active',
        ].includes(
            beat.status,
        )
    ) {
        errors.push(
            `Calendar 新 storyBeat ${beat.id} 必须以 planned 或 active 状态创建。`,
        );
    }
    if (
        beat.relatedSceneIds
            .length > 0
    ) {
        errors.push(
            `Calendar 新 storyBeat ${beat.id} 的 relatedSceneIds 只能由 Scene 封存 Reducer 写入。`,
        );
    }
    const end =
        optionalClockMinutes(
            beat.windowEndClock,
        );
    if (
        end !== null &&
        end < currentClockMinutes
    ) {
        errors.push(
            `Calendar 新 storyBeat ${beat.id} 的窗口已经结束。`,
        );
    }
}

function validateExistingStoryBeat(
    current,
    incoming,
    currentClockMinutes,
    errors,
) {
    const changed =
        !recordsEqual(
            current,
            incoming,
        );
    if (
        incoming.createdClock !==
        current.createdClock
    ) {
        errors.push(
            `Calendar storyBeat ${incoming.id} 的 createdClock 创建后不可修改。`,
        );
    }
    if (
        !recordsEqual(
            incoming.relatedSceneIds,
            current.relatedSceneIds,
        )
    ) {
        errors.push(
            `Calendar storyBeat ${incoming.id} 的 relatedSceneIds 只能由 Scene 封存 Reducer 写入。`,
        );
    }
    if (
        changed &&
        [
            'realized',
            'cancelled',
        ].includes(
            current.status,
        )
    ) {
        errors.push(
            `Calendar storyBeat ${incoming.id} 已终结，只能只读。`,
        );
    }
    if (
        !STORY_BEAT_STATUS_TRANSITIONS[
            current.status
        ]?.has(
            incoming.status,
        )
    ) {
        errors.push(
            `Calendar storyBeat ${incoming.id} 的状态转换无效。`,
        );
    }
    if (
        incoming.status !==
            current.status &&
        [
            'realized',
            'deferred',
        ].includes(
            incoming.status,
        )
    ) {
        errors.push(
            `Calendar storyBeat ${incoming.id} 的 ${incoming.status} 状态只能由本地生命周期 Reducer 写入。`,
        );
    }
    const currentEnd =
        optionalClockMinutes(
            current.windowEndClock,
        );
    if (
        changed &&
        current.status !==
            'deferred' &&
        currentEnd !== null &&
        currentEnd <
            currentClockMinutes
    ) {
        errors.push(
            `Calendar storyBeat ${incoming.id} 的窗口已经结束，只能只读。`,
        );
    }
}

function validateNewEntry(
    entry,
    planningTier,
    currentClockMinutes,
    errors,
) {
    if (
        entry.planningTier !==
        planningTier
    ) {
        errors.push(
            `Calendar 条目 ${entry.id} 只能由 ${entry.planningTier} 导演创建。`,
        );
    }
    if (
        entry.status !==
        'planned'
    ) {
        errors.push(
            `Calendar 新条目 ${entry.id} 必须以 planned 状态创建。`,
        );
    }
    if (
        entry.relatedSceneIds
            .length > 0
    ) {
        errors.push(
            `Calendar 新条目 ${entry.id} 的 relatedSceneIds 只能由 Scene 封存 Reducer 写入。`,
        );
    }
    if (
        optionalClockMinutes(
            entry.endClock,
        ) !== null &&
        optionalClockMinutes(
            entry.endClock,
        ) <
        currentClockMinutes
    ) {
        errors.push(
            `Calendar 新条目 ${entry.id} 的安排时间已经过去。`,
        );
    }
}

function validateExistingEntry(
    current,
    incoming,
    planningTier,
    currentClockMinutes,
    errors,
) {
    const changed =
        !recordsEqual(
            current,
            incoming,
        );
    if (
        current.planningTier !==
            planningTier ||
        incoming.planningTier !==
            planningTier
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 只能由 ${current.planningTier} 导演维护。`,
        );
    }
    if (
        incoming.createdClock !==
        current.createdClock
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 的 createdClock 创建后不可修改。`,
        );
    }
    if (
        !recordsEqual(
            incoming.relatedSceneIds,
            current.relatedSceneIds,
        )
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 的 relatedSceneIds 只能由 Scene 封存 Reducer写入。`,
        );
    }
    if (
        changed &&
        (
            TERMINAL_STATUSES.has(
                current.status,
            ) ||
            clockMinutes(
                current.endClock,
                `Calendar 条目 ${current.id} endClock`,
            ) <
                currentClockMinutes
        )
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 已结束，只能只读。`,
        );
    }
    if (
        !DIRECTOR_STATUS_TRANSITIONS[
            current.status
        ]?.has(
            incoming.status,
        )
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 的状态只能由本地时钟结算，导演仅可明确取消。`,
        );
    }
    const incomingStartMinutes =
        optionalClockMinutes(
            incoming.startClock,
        );
    const incomingEndMinutes =
        optionalClockMinutes(
            incoming.endClock,
        );
    if (
        incoming.status === 'active' &&
        (
            incomingStartMinutes ===
                null ||
            incomingEndMinutes ===
                null ||
            currentClockMinutes <
                incomingStartMinutes ||
            currentClockMinutes >
                incomingEndMinutes
        )
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 保持 active 时必须覆盖当前世界时钟的时间区间。`,
        );
    }
    if (
        incomingEndMinutes !== null &&
        incomingEndMinutes <
        currentClockMinutes
    ) {
        errors.push(
            `Calendar 条目 ${incoming.id} 不得被改写到过去。`,
        );
    }
}

function mergeProposalEntries(
    currentEntries,
    incomingEntries,
) {
    const incomingById =
        new Map(
            incomingEntries.map(entry => [
                entry.id,
                entry,
            ]),
        );
    const currentIds =
        new Set(
            currentEntries.map(entry =>
                entry.id),
        );
    return [
        ...currentEntries.map(entry =>
            incomingById.get(
                entry.id,
            ) || entry),
        ...incomingEntries.filter(entry =>
            !currentIds.has(
                entry.id,
            )),
    ];
}

export function validateHighCalendarProposal(
    proposal,
    worldState,
) {
    const errors = [];
    if (!isRecord(worldState)) {
        return {
            valid: false,
            errors: [
                'Calendar proposal 需要世界状态对象。',
            ],
            storylines: [],
            storyBeats: [],
            entries: [],
            calendar: null,
        };
    }
    const currentValidation =
        validateCalendarState(
            worldState.calendar,
            worldState,
        );
    if (!currentValidation.valid) {
        return {
            valid: false,
            errors: [
                `Calendar 当前状态无效：${currentValidation.errors.join('；')}`,
            ],
            storylines: [],
            storyBeats: [],
            entries: [],
            calendar: null,
        };
    }
    if (
        !validateExactProposalFields(
            proposal,
            CALENDAR_HIGH_PROPOSAL_FIELDS,
            'Calendar High proposal',
            errors,
        )
    ) {
        return {
            valid: false,
            errors,
            storylines: [],
            storyBeats: [],
            entries: [],
            calendar: null,
        };
    }
    validateProposalHead(
        proposal,
        worldState,
        errors,
    );
    const storylines =
        normalizeProposalRecords(
            proposal,
            'storylines',
            normalizeCalendarStoryline,
            'Calendar High proposal storylines',
            errors,
        );
    const storyBeats =
        normalizeProposalRecords(
            proposal,
            'storyBeats',
            normalizeCalendarStoryBeat,
            'Calendar High proposal storyBeats',
            errors,
        );
    if (
        !Array.isArray(
            proposal.storylines,
        ) ||
        !Array.isArray(
            proposal.storyBeats,
        ) ||
        storylines.length !==
            proposal.storylines.length ||
        storyBeats.length !==
            proposal.storyBeats.length
    ) {
        return {
            valid: false,
            errors,
            storylines,
            storyBeats,
            entries: [],
            calendar: null,
        };
    }
    validateUniqueProposalIds(
        storylines,
        'Calendar High proposal storyline',
        errors,
    );
    validateUniqueProposalIds(
        storyBeats,
        'Calendar High proposal storyBeat',
        errors,
    );
    let currentClockMinutes = null;
    try {
        currentClockMinutes =
            clockMinutes(
                worldState.clock,
                'Calendar 当前世界时钟',
            );
    } catch (error) {
        errors.push(
            String(
                error?.message ||
                error,
            ),
        );
    }
    if (currentClockMinutes !== null) {
        const currentStorylines =
            new Map(
                currentValidation
                    .calendar.storylines
                    .map(storyline => [
                        storyline.id,
                        storyline,
                    ]),
            );
        storylines.forEach(
            storyline => {
                const current =
                    currentStorylines.get(
                        storyline.id,
                    );
                if (current) {
                    validateExistingStoryline(
                        current,
                        storyline,
                        currentClockMinutes,
                        errors,
                    );
                } else {
                    validateNewStoryline(
                        storyline,
                        currentClockMinutes,
                        errors,
                    );
                }
            },
        );
        const currentStoryBeats =
            new Map(
                currentValidation
                    .calendar.storyBeats
                    .map(beat => [
                        beat.id,
                        beat,
                    ]),
            );
        storyBeats.forEach(beat => {
            const current =
                currentStoryBeats.get(
                    beat.id,
                );
            if (current) {
                validateExistingStoryBeat(
                    current,
                    beat,
                    currentClockMinutes,
                    errors,
                );
            } else {
                validateNewStoryBeat(
                    beat,
                    currentClockMinutes,
                    errors,
                );
            }
        });
    }
    const calendar = {
        ...currentValidation.calendar,
        storylines:
            mergeProposalEntries(
                currentValidation
                    .calendar.storylines,
                storylines,
            ),
        storyBeats:
            mergeProposalEntries(
                currentValidation
                    .calendar.storyBeats,
                storyBeats,
            ),
    };
    const mergedValidation =
        validateCalendarState(
            calendar,
            worldState,
        );
    if (!mergedValidation.valid) {
        errors.push(
            ...mergedValidation.errors,
        );
    }
    return {
        valid:
            errors.length === 0,
        errors,
        storylines,
        storyBeats,
        entries: [],
        calendar:
            mergedValidation.calendar,
    };
}

export function validateMediumCalendarProposal(
    proposal,
    worldState,
) {
    const errors = [];
    if (!isRecord(worldState)) {
        return {
            valid: false,
            errors: [
                'Calendar proposal 需要世界状态对象。',
            ],
            entries: [],
            calendar: null,
        };
    }
    const currentValidation =
        validateCalendarState(
            worldState.calendar,
            worldState,
        );
    if (!currentValidation.valid) {
        return {
            valid: false,
            errors: [
                `Calendar 当前状态无效：${currentValidation.errors.join('；')}`,
            ],
            entries: [],
            calendar: null,
        };
    }
    if (
        !validateExactProposalFields(
            proposal,
            CALENDAR_MEDIUM_PROPOSAL_FIELDS,
            'Calendar Medium proposal',
            errors,
        )
    ) {
        return {
            valid: false,
            errors,
            entries: [],
            calendar: null,
        };
    }
    validateProposalHead(
        proposal,
        worldState,
        errors,
    );
    const entries =
        normalizeProposalEntries(
            proposal,
            errors,
        );
    if (
        !Array.isArray(
            proposal.entries,
        ) ||
        entries.length !==
        proposal.entries.length
    ) {
        return {
            valid: false,
            errors,
            entries,
            calendar: null,
        };
    }
    validateUniqueProposalIds(
        entries,
        'Calendar Medium proposal schedule',
        errors,
    );
    const currentById =
        new Map(
            currentValidation
                .calendar.entries
                .map(entry => [
                    entry.id,
                    entry,
                ]),
        );
    let currentClockMinutes = null;
    try {
        currentClockMinutes =
            clockMinutes(
                worldState.clock,
                'Calendar 当前世界时钟',
            );
    } catch (error) {
        errors.push(
            String(
                error?.message ||
                error,
            ),
        );
    }
    if (currentClockMinutes !== null) {
        entries.forEach(entry => {
            const current =
                currentById.get(
                    entry.id,
                );
            if (current) {
                validateExistingEntry(
                    current,
                    entry,
                    'medium',
                    currentClockMinutes,
                    errors,
                );
            } else {
                validateNewEntry(
                    entry,
                    'medium',
                    currentClockMinutes,
                    errors,
                );
            }
        });
    }
    const calendar = {
        ...currentValidation.calendar,
        entries:
            mergeProposalEntries(
                currentValidation
                    .calendar.entries,
                entries,
            ),
    };
    const mergedValidation =
        validateCalendarState(
            calendar,
            worldState,
        );
    if (!mergedValidation.valid) {
        errors.push(
            ...mergedValidation.errors,
        );
    }
    return {
        valid:
            errors.length === 0,
        errors,
        entries,
        calendar:
            mergedValidation.calendar,
    };
}

export function validateCalendarProposal(
    proposal,
    worldState,
    planningTier,
) {
    const errors = [];
    if (
        !validateDirectorTier(
            planningTier,
            errors,
        )
    ) {
        return {
            valid: false,
            errors,
            storylines: [],
            storyBeats: [],
            entries: [],
            calendar: null,
        };
    }
    return planningTier === 'high'
        ? validateHighCalendarProposal(
            proposal,
            worldState,
        )
        : validateMediumCalendarProposal(
            proposal,
            worldState,
        );
}

function applyValidatedCalendarProposal(
    worldState,
    validation,
) {
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    if (
        recordsEqual(
            validation.calendar,
            worldState.calendar,
        )
    ) {
        return worldState;
    }
    return {
        ...worldState,
        calendar:
            validation.calendar,
    };
}

export function applyHighCalendarProposal(
    worldState,
    proposal,
) {
    return applyValidatedCalendarProposal(
        worldState,
        validateHighCalendarProposal(
            proposal,
            worldState,
        ),
    );
}

export function applyMediumCalendarProposal(
    worldState,
    proposal,
) {
    return applyValidatedCalendarProposal(
        worldState,
        validateMediumCalendarProposal(
            proposal,
            worldState,
        ),
    );
}

export function applyCalendarProposal(
    worldState,
    proposal,
    planningTier,
) {
    return planningTier === 'high'
        ? applyHighCalendarProposal(
            worldState,
            proposal,
        )
        : planningTier === 'medium'
            ? applyMediumCalendarProposal(
                worldState,
                proposal,
            )
            : applyValidatedCalendarProposal(
                worldState,
                validateCalendarProposal(
                    proposal,
                    worldState,
                    planningTier,
                ),
            );
}

export function settleCalendarAtClock(
    worldState,
    clock =
    worldState?.clock,
) {
    if (!isRecord(worldState)) {
        throw new TypeError(
            'Calendar 时钟结算需要世界状态对象。',
        );
    }
    const targetMinutes =
        clockMinutes(
            clock,
            'Calendar 结算时钟',
        );
    const validationWorldState = {
        ...worldState,
        clock,
    };
    const calendarValidation =
        validateCalendarState(
            worldState.calendar,
            validationWorldState,
        );
    if (!calendarValidation.valid) {
        throw new TypeError(
            `Calendar 当前状态无效：${calendarValidation.errors.join('；')}`,
        );
    }
    let changed = false;
    const entries =
        calendarValidation
            .calendar.entries
            .map(entry => {
                if (
                    TERMINAL_STATUSES.has(
                        entry.status,
                    )
                ) {
                    return entry;
                }
                const start =
                    clockMinutes(
                        entry.startClock,
                        `Calendar 条目 ${entry.id} startClock`,
                    );
                const end =
                    clockMinutes(
                        entry.endClock,
                        `Calendar 条目 ${entry.id} endClock`,
                    );
                let status =
                    entry.status;
                if (targetMinutes > end) {
                    status =
                        'completed';
                } else if (
                    status ===
                        'planned' &&
                    targetMinutes >= start
                ) {
                    status =
                        'active';
                }
                if (
                    status ===
                    entry.status
                ) {
                    return entry;
                }
                changed = true;
                return {
                    ...entry,
                    status,
                    updatedClock:
                        Math.max(
                            targetMinutes,
                            clockMinutes(
                                entry.updatedClock,
                                `Calendar 条目 ${entry.id} updatedClock`,
                            ),
                        ) ===
                            targetMinutes
                            ? clock
                            : entry
                                .updatedClock,
                };
            });
    const storyBeats =
        calendarValidation
            .calendar.storyBeats
            .map(beat => {
                if (
                    !DEFERABLE_STORY_BEAT_STATUSES
                        .has(
                            beat.status,
                        ) ||
                    beat.relatedSceneIds
                        .length >=
                        beat.sceneTarget ||
                    targetMinutes <=
                        clockMinutes(
                            beat.windowEndClock,
                            `Calendar storyBeat ${beat.id} windowEndClock`,
                        )
                ) {
                    return beat;
                }
                changed = true;
                return {
                    ...beat,
                    status:
                        'deferred',
                    updatedClock:
                        Math.max(
                            targetMinutes,
                            clockMinutes(
                                beat.updatedClock,
                                `Calendar storyBeat ${beat.id} updatedClock`,
                            ),
                        ) ===
                            targetMinutes
                            ? clock
                            : beat
                                .updatedClock,
                };
            });
    if (!changed) {
        return worldState;
    }
    const calendar = {
        ...calendarValidation.calendar,
        storyBeats,
        entries,
    };
    const settledValidation =
        validateCalendarState(
            calendar,
            validationWorldState,
        );
    if (!settledValidation.valid) {
        throw new TypeError(
            `Calendar 时钟结算产生非法状态：${settledValidation.errors.join('；')}`,
        );
    }
    return {
        ...worldState,
        calendar:
            settledValidation.calendar,
    };
}

export async function guardedSaveCalendarProposal({
    worldState,
    proposal,
    planningTier,
    guard,
    save,
    timelineKey = '',
    source =
    `calendar_${planningTier}_director`,
}) {
    if (
        typeof guard?.guardedSave !==
        'function'
    ) {
        throw new TypeError(
            'Calendar proposal save 需要 guarded save。',
        );
    }
    if (typeof save !== 'function') {
        throw new TypeError(
            'Calendar proposal save 需要持久化回调。',
        );
    }
    const nextState =
        applyCalendarProposal(
            worldState,
            proposal,
            planningTier,
        );
    return guard.guardedSave({
        currentState:
            worldState,
        nextState,
        source,
        timelineKey,
        changedDomains: [
            'calendar',
        ],
        consumeRevision: true,
        save,
    });
}
