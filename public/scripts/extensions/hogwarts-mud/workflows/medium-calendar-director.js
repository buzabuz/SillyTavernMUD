import {
    applyCalendarProposal,
    validateCalendarProposal,
} from '../domain/calendar-reducer.js';
import {
    projectCalendarByDate,
    projectUpcomingCalendar,
} from '../domain/calendar-projection.js';
import {
    isCalendarWorldClock,
    validateCalendarState,
} from '../domain/calendar-schema.js';
import {
    validateNpcIdentity,
} from '../domain/npc-identity-schema.js';
import {
    NARRATIVE_PROMPT_ACCESS,
    projectNarrativePromptInput,
} from '../domain/narrative-prompt-context.js';
import {
    getMapRooms,
} from '../domain/map-access.js';
import {
    getInteriorMount,
    listMapsByMountHierarchy,
} from '../domain/interior-mount.js';
import {
    advanceWorldClock,
    worldClockToEpochMinutes,
} from '../domain/time-environment.js';

export const MEDIUM_CALENDAR_MIN_DAYS = 7;
export const MEDIUM_CALENDAR_TARGET_DAYS = 14;

const TERMINAL_STATUSES =
    new Set([
        'completed',
        'cancelled',
    ]);
const SCHEDULABLE_STORYLINE_STATUSES =
    new Set([
        'planned',
        'active',
    ]);
const SCHEDULABLE_STORY_BEAT_STATUSES =
    new Set([
        'planned',
        'active',
    ]);
const STORY_BEAT_SLOTS =
    Object.freeze([
        1,
        2,
        3,
        4,
    ]);
const DAILY_SCHEDULE_TAGS =
    Object.freeze([
        'breakfast',
        'class',
        'lunch',
        'dinner',
        'training',
        'date',
        'meeting',
    ]);
const CHINESE_COMMITMENT_PATTERN =
    /(?:^|[\s，。！？；])我(?:答应|承诺|保证)(?:你|他|她|他们|大家)?[^。！？\n]{0,120}(?:今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|周末|下周|见面|碰面|约会|训练|练习|上课|考试|会合)/u;
const ENGLISH_COMMITMENT_PATTERN =
    /\bi\s+(?:promise|agree|commit|swear)\b[^\n.!?]{0,120}\b(?:today|tomorrow|tonight|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|meet|date|practice|train|class|exam|appointment)\b/iu;
const ENGLISH_FUTURE_MEETING_PATTERN =
    /\bi(?:'ll| will)\s+(?:meet|see|join|attend|practice|train|study)\b[^\n.!?]{0,100}\b(?:today|tomorrow|tonight|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/iu;

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function normalizedText(value) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
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

function isSuccessfulPlanningResult(
    result,
) {
    return [
        'committed',
        'unchanged',
    ].includes(
        result?.status,
    );
}

export function detectExplicitCalendarCommitment(
    playerAction,
) {
    const normalized =
        normalizedText(
            playerAction,
        );
    if (
        !normalized ||
        (
            !CHINESE_COMMITMENT_PATTERN
                .test(normalized) &&
            !ENGLISH_COMMITMENT_PATTERN
                .test(normalized) &&
            !ENGLISH_FUTURE_MEETING_PATTERN
                .test(normalized)
        )
    ) {
        return '';
    }
    return normalized.slice(
        0,
        240,
    );
}

export function evaluateMediumCalendarTriggers(
    worldState,
    {
        highPlanningResult = null,
        playerAction = '',
        force = false,
    } = {},
) {
    if (
        highPlanningResult?.status ===
        'failed'
    ) {
        return {
            shouldRun: false,
            reasons: [],
            explicitCommitment: '',
        };
    }
    if (
        !isRecord(worldState) ||
        !isCalendarWorldClock(
            worldState.clock,
        ) ||
        !isCalendarWorldClock(
            worldState.calendar
                ?.horizon,
        )
    ) {
        return {
            shouldRun: false,
            reasons: [],
            explicitCommitment: '',
        };
    }
    const reasons = [];
    const currentMinutes =
        clockMinutes(
            worldState.clock,
            'Medium Calendar 当前时钟',
        );
    const horizonMinutes =
        clockMinutes(
            worldState.calendar
                .horizon,
            'Medium Calendar horizon',
        );
    if (
        horizonMinutes -
            currentMinutes <
        MEDIUM_CALENDAR_MIN_DAYS *
            24 *
            60
    ) {
        reasons.push(
            'horizon_insufficient',
        );
    }
    if (
        isSuccessfulPlanningResult(
            highPlanningResult,
        )
    ) {
        reasons.push(
            'high_calendar_succeeded',
        );
    }
    const explicitCommitment =
        detectExplicitCalendarCommitment(
            playerAction,
        );
    if (explicitCommitment) {
        reasons.push(
            'player_commitment',
        );
    }
    if (force) {
        reasons.push(
            'manual',
        );
    }
    return {
        shouldRun:
            reasons.length > 0,
        reasons: [
            ...new Set(reasons),
        ],
        explicitCommitment,
    };
}

function projectPlanningEntries(
    worldState,
    planningTier = '',
) {
    const currentMinutes =
        clockMinutes(
            worldState.clock,
            'Medium Calendar 当前时钟',
        );
    return projectUpcomingCalendar(
        worldState,
        worldState.clock,
        MEDIUM_CALENDAR_TARGET_DAYS,
    )
        .filter(entry =>
            (
                !planningTier ||
                entry.planningTier ===
                    planningTier
            ) &&
            !TERMINAL_STATUSES.has(
                entry.status,
            ) &&
            clockMinutes(
                entry.endClock,
                `Calendar 条目 ${entry.id} endClock`,
            ) >= currentMinutes)
        .map(entry =>
            structuredClone(entry));
}

export function projectSchedulableStoryBeats(
    worldState,
    targetHorizon =
    advanceWorldClock(
        worldState.clock,
        MEDIUM_CALENDAR_TARGET_DAYS *
            24 *
            60,
    ),
) {
    const currentMinutes =
        clockMinutes(
            worldState.clock,
            'Medium Calendar 当前时钟',
        );
    const targetMinutes =
        clockMinutes(
            targetHorizon,
            'Medium Calendar 目标 horizon',
        );
    const storylinesById =
        new Map(
            (
                worldState.calendar
                    ?.storylines ||
                []
            )
                .filter(storyline =>
                    SCHEDULABLE_STORYLINE_STATUSES
                        .has(
                            storyline.status,
                        ))
                .map(storyline => [
                    storyline.id,
                    storyline,
                ]),
        );
    const schedulesByBeat =
        new Map();
    (
        worldState.calendar
            ?.entries ||
        []
    ).forEach(entry => {
        if (!entry.sourceBeatId) {
            return;
        }
        const schedules =
            schedulesByBeat.get(
                entry.sourceBeatId,
            ) ||
            [];
        schedules.push(entry);
        schedulesByBeat.set(
            entry.sourceBeatId,
            schedules,
        );
    });
    return (
        worldState.calendar
            ?.storyBeats ||
        []
    )
        .filter(beat => {
            if (
                !SCHEDULABLE_STORY_BEAT_STATUSES
                    .has(beat.status) ||
                !storylinesById.has(
                    beat.storylineId,
                )
            ) {
                return false;
            }
            const windowStart =
                clockMinutes(
                    beat.windowStartClock,
                    `Calendar storyBeat ${beat.id} windowStartClock`,
                );
            const windowEnd =
                clockMinutes(
                    beat.windowEndClock,
                    `Calendar storyBeat ${beat.id} windowEndClock`,
                );
            return (
                windowStart <=
                    targetMinutes &&
                windowEnd >=
                    currentMinutes
            );
        })
        .map(beat => {
            const existingSchedules =
                (
                    schedulesByBeat.get(
                        beat.id,
                    ) ||
                    []
                )
                    .map(entry =>
                        structuredClone(
                            entry,
                        ))
                    .sort((left, right) =>
                        clockMinutes(
                            left.startClock,
                            `Calendar 条目 ${left.id} startClock`,
                        ) -
                            clockMinutes(
                                right.startClock,
                                `Calendar 条目 ${right.id} startClock`,
                            ) ||
                        left.id.localeCompare(
                            right.id,
                        ));
            const occupiedSlots =
                new Set(
                    existingSchedules
                        .map(entry =>
                            entry.beatSlot),
                );
            return {
                storyline:
                    structuredClone(
                        storylinesById.get(
                            beat.storylineId,
                        ),
                    ),
                storyBeat:
                    structuredClone(
                        beat,
                    ),
                occupiedBeatSlots:
                    [...occupiedSlots]
                        .filter(Number.isInteger)
                        .sort((
                            left,
                            right,
                        ) =>
                            left - right),
                missingBeatSlots:
                    STORY_BEAT_SLOTS
                        .filter(slot =>
                            !occupiedSlots
                                .has(slot)),
            };
        })
        .sort((left, right) =>
            clockMinutes(
                left.storyBeat
                    .windowStartClock,
                `Calendar storyBeat ${left.storyBeat.id} windowStartClock`,
            ) -
                clockMinutes(
                    right.storyBeat
                        .windowStartClock,
                    `Calendar storyBeat ${right.storyBeat.id} windowStartClock`,
                ) ||
            left.storyBeat.sequence -
                right.storyBeat.sequence ||
            left.storyBeat.id.localeCompare(
                right.storyBeat.id,
            ));
}

function projectDailyScheduleCoverage(
    worldState,
    targetHorizon,
) {
    const targetMinutes =
        clockMinutes(
            targetHorizon,
            'Medium Calendar 目标 horizon',
        );
    const dates = [];
    for (
        let dayOffset = 0;
        dayOffset <=
            MEDIUM_CALENDAR_TARGET_DAYS;
        dayOffset++
    ) {
        const clock =
            advanceWorldClock(
                worldState.clock,
                dayOffset *
                    24 *
                    60,
            );
        if (
            clockMinutes(
                clock,
                'Medium Calendar 规划日期',
            ) >
            targetMinutes
        ) {
            break;
        }
        const date =
            clock.slice(0, 10);
        if (
            dates.at(-1) !== date
        ) {
            dates.push(date);
        }
    }
    return dates.map(date => {
        const schedules =
            projectCalendarByDate(
                worldState,
                date,
            );
        return {
            date,
            existingScheduleIds:
                schedules.map(entry =>
                    entry.id),
            existingScheduleKinds: [
                ...new Set(
                    schedules.map(entry =>
                        entry
                            .scheduleKind),
                ),
            ],
            existingTags: [
                ...new Set(
                    schedules.flatMap(
                        entry =>
                            entry.tags,
                    ),
                ),
            ],
        };
    });
}

function projectAdmittedActorStates(
    worldState,
) {
    const runtimeById =
        new Map(
            (
                worldState.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    return (
        worldState.actorLibrary ||
        []
    ).filter(profile => {
        const runtime =
            runtimeById.get(
                profile.id,
            );
        return Boolean(
            profile &&
            runtime?.temporary !==
                true &&
            validateNpcIdentity(
                profile.identity,
            ).valid,
        );
    }).map(profile => {
        const runtime =
            runtimeById.get(
                profile.id,
            ) ||
            {};
        return {
            id: profile.id,
            nameEn:
                String(
                    profile.nameEn ||
                    profile.name ||
                    profile.id,
                ),
            roleEn:
                String(
                    profile.roleEn ||
                    profile.role ||
                    '',
                ),
        };
    });
}

function projectCalendarLocationDirectory(
    worldState,
) {
    return listMapsByMountHierarchy(
        worldState.map || {},
    ).map(({
        map,
        depth,
    }) => ({
        id: map.id,
        nameEn:
            map.nameEn ||
            map.name ||
            map.id,
        depth,
        mount:
            getInteriorMount(map),
        rooms:
            getMapRooms(
                map,
                worldState.map,
            ).map(room => ({
                id: room.id,
                nameEn:
                    room.nameEn ||
                    room.name ||
                    room.id,
                access:
                    room.access ||
                    '',
            })),
    }));
}

export function projectMediumCalendarDirectorContext(
    worldState,
    {
        trigger,
        recentPlayerActions = [],
    } = {},
) {
    const targetHorizon =
        advanceWorldClock(
            worldState.clock,
            MEDIUM_CALENDAR_TARGET_DAYS *
                24 *
                60,
        );
    return projectNarrativePromptInput(
        {
            triggerReasons:
                structuredClone(
                    trigger?.reasons ||
                    [],
                ),
            explicitCommitment:
                String(
                    trigger
                        ?.explicitCommitment ||
                    '',
                ),
            baseTimelineEpoch:
                worldState.timelineEpoch,
            baseStateRevision:
                worldState.stateRevision,
            currentClock:
                worldState.clock,
            currentHorizon:
                worldState.calendar
                    .horizon,
            planningWindow: {
                minimumHorizon:
                    advanceWorldClock(
                        worldState.clock,
                        MEDIUM_CALENDAR_MIN_DAYS *
                            24 *
                            60,
                    ),
                targetHorizon,
            },
            schedulableStoryBeats:
                projectSchedulableStoryBeats(
                    worldState,
                    targetHorizon,
                ),
            existingSchedules:
                projectPlanningEntries(
                    worldState,
                ),
            dailyScheduleGuidance: {
                ordinaryTags: [
                    ...DAILY_SCHEDULE_TAGS,
                ],
                scheduleKinds: [
                    'routine',
                    'class',
                    'story',
                    'social',
                    'personal',
                ],
            },
            recentPlayerActions:
                recentPlayerActions
                    .map(normalizedText)
                    .filter(Boolean)
                    .slice(-8),
            admittedActorDirectory:
                projectAdmittedActorStates(
                    worldState,
                ),
            currentLocation: {
                mapId:
                    String(
                        worldState.map
                            ?.activeMapId ||
                        worldState.scene
                            ?.mapId ||
                        '',
                    ),
                roomId:
                    String(
                        worldState.map
                            ?.currentLocalNodeId ||
                        worldState.scene
                            ?.roomId ||
                        '',
                    ),
                label:
                    String(
                        worldState.location ||
                        '',
                    ),
            },
            locationDirectory:
                projectCalendarLocationDirectory(
                    worldState,
                ),
        },
        {
            access:
            NARRATIVE_PROMPT_ACCESS
                .MEDIUM,
        },
    );
}

export function validateMediumCalendarDirectorProposal(
    proposal,
    worldState,
    targetHorizon,
) {
    const validation =
        validateCalendarProposal(
            proposal,
            worldState,
            'medium',
        );
    const errors = [
        ...validation.errors,
    ];
    let currentMinutes = null;
    let targetMinutes = null;
    try {
        currentMinutes =
            clockMinutes(
                worldState.clock,
                'Medium Calendar 当前时钟',
            );
        targetMinutes =
            clockMinutes(
                targetHorizon,
                'Medium Calendar 目标 horizon',
            );
        const minimum =
            currentMinutes +
            MEDIUM_CALENDAR_MIN_DAYS *
                24 *
                60;
        const maximum =
            currentMinutes +
            MEDIUM_CALENDAR_TARGET_DAYS *
                24 *
                60;
        if (
            targetMinutes < minimum ||
            targetMinutes > maximum
        ) {
            errors.push(
                'Medium Calendar 目标 horizon 必须位于未来 7–14 天。',
            );
        }
    } catch (error) {
        errors.push(
            String(
                error?.message ||
                error,
            ),
        );
    }
    const admittedActorIds =
        new Set(
            projectAdmittedActorStates(
                worldState,
            ).map(actor =>
                actor.id),
        );
    validation.entries
        .forEach(entry => {
            entry.participantIds
                .forEach(actorId => {
                    if (
                        !admittedActorIds
                            .has(actorId)
                    ) {
                        errors.push(
                            `Calendar 条目 ${entry.id} 的 Actor ${actorId} 尚未完成 Actor Admission/Identity。`,
                        );
                    }
                });
        });
    if (
        currentMinutes !== null &&
        targetMinutes !== null
    ) {
        const currentEntriesById =
            new Map(
                (
                    worldState.calendar
                        ?.entries ||
                    []
                ).map(entry => [
                    entry.id,
                    entry,
                ]),
            );
        const schedulableBeats =
            projectSchedulableStoryBeats(
                worldState,
                targetHorizon,
            );
        const schedulableById =
            new Map(
                schedulableBeats
                    .map(item => [
                        item.storyBeat.id,
                        item,
                    ]),
            );
        validation.entries
            .forEach(entry => {
                const currentEntry =
                    currentEntriesById.get(
                        entry.id,
                    );
                if (
                    entry.planningTier !==
                    'medium'
                ) {
                    errors.push(
                        `Medium Calendar 条目 ${entry.id} 必须使用 planningTier=medium。`,
                    );
                }
                if (
                    currentEntry &&
                    (
                        currentEntry
                            .sourceBeatId !==
                            entry.sourceBeatId ||
                        currentEntry
                            .beatSlot !==
                            entry.beatSlot
                    )
                ) {
                    errors.push(
                        `Medium Calendar 条目 ${entry.id} 的 sourceBeatId + beatSlot 创建后不可修改。`,
                    );
                }
                const timingChanged =
                    !currentEntry ||
                    currentEntry
                        .startClock !==
                        entry.startClock ||
                    currentEntry
                        .endClock !==
                        entry.endClock;
                if (
                    timingChanged &&
                    isCalendarWorldClock(
                        entry.startClock,
                    )
                ) {
                    const start =
                        clockMinutes(
                            entry.startClock,
                            `Calendar 条目 ${entry.id} startClock`,
                        );
                    if (
                        start <
                            currentMinutes ||
                        start >
                            targetMinutes
                    ) {
                        errors.push(
                            `Medium Calendar 新建或改期条目 ${entry.id} 的 startClock 必须位于当前时钟至目标 horizon。`,
                        );
                    }
                }
                if (!entry.sourceBeatId) {
                    return;
                }
                const beatProjection =
                    schedulableById.get(
                        entry.sourceBeatId,
                    );
                if (!beatProjection) {
                    errors.push(
                        `Medium Calendar 条目 ${entry.id} 只能关联进入规划窗口的 active/planned storyBeat。`,
                    );
                    return;
                }
                if (
                    entry.scheduleKind !==
                    'story'
                ) {
                    errors.push(
                        `Medium Calendar 节奏条目 ${entry.id} 必须使用 scheduleKind=story。`,
                    );
                }
                if (
                    isCalendarWorldClock(
                        entry.startClock,
                    ) &&
                    isCalendarWorldClock(
                        entry.endClock,
                    )
                ) {
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
                    const beat =
                        beatProjection
                            .storyBeat;
                    const beatStart =
                        clockMinutes(
                            beat.windowStartClock,
                            `Calendar storyBeat ${beat.id} windowStartClock`,
                        );
                    const beatEnd =
                        clockMinutes(
                            beat.windowEndClock,
                            `Calendar storyBeat ${beat.id} windowEndClock`,
                        );
                    if (
                        start < beatStart ||
                        end > beatEnd
                    ) {
                        errors.push(
                            `Medium Calendar 节奏条目 ${entry.id} 必须位于 storyBeat ${beat.id} 的窗口内。`,
                        );
                    }
                }
            });
        if (validation.calendar) {
            schedulableBeats
                .forEach(item => {
                    const occupiedSlots =
                        new Set(
                            validation
                                .calendar
                                .entries
                                .filter(entry =>
                                    entry
                                        .sourceBeatId ===
                                    item
                                        .storyBeat
                                        .id)
                                .map(entry =>
                                    entry
                                        .beatSlot),
                        );
                    const missingSlots =
                        STORY_BEAT_SLOTS
                            .filter(slot =>
                                !occupiedSlots
                                    .has(slot));
                    if (
                        missingSlots.length
                    ) {
                        errors.push(
                            `Medium Calendar storyBeat ${item.storyBeat.id} 缺少稳定 schedule 槽位：${missingSlots.join(', ')}。`,
                        );
                    }
                });
        }
    }
    return {
        ...validation,
        valid:
            errors.length === 0,
        errors,
        targetHorizon,
    };
}

export function createMediumCalendarDirectorPrompt(
    worldState,
    options = {},
) {
    const context =
        projectMediumCalendarDirectorContext(
            worldState,
            options,
        );
    return [
        {
            role: 'system',
            content: `You are the Medium Calendar Director for a persistent RPG. Roll the player-visible schedule forward through the supplied 7-14 day planning window. Return exactly one shared Calendar upsert proposal as JSON with no Markdown or commentary.

Rules:
- Return exactly baseTimelineEpoch, baseStateRevision and entries. Calendar horizon is committed locally only after this proposal succeeds; never output horizon.
- Create or update only planningTier "medium" schedules in entries. Never output or modify storyline, storyBeat or Scene records. existingSchedules with planningTier "high" are grandfathered read-only schedules.
- For every schedulableStoryBeats item, preserve every existing sourceBeatId + beatSlot pair and create each missingBeatSlots value. The merged Calendar must contain exactly the stable slots 1, 2, 3 and 4 for that beat.
- Beat-derived schedules use scheduleKind "story", the supplied storyBeat ID as sourceBeatId, and a beatSlot from 1 through 4. Place them inside both the storyBeat window and the supplied planning window. They are opportunities, not prewritten Scenes or outcomes.
- Reuse the existing schedule ID for the same sourceBeatId + beatSlot or repeated routine, promise, class, meeting, training session or event. Never change an existing sourceBeatId + beatSlot pair and never create a duplicate for it.
- Maintain a readable agenda using existingSchedules and dailyScheduleGuidance. Breakfast, class, lunch, dinner, training, date and meeting are ordinary schedule tags used only when applicable; represent them with the existing routine/class/social/personal scheduleKind values. Do not invent meal, class or timetable fields or mechanisms.
- New or rescheduled entries must start between currentClock and planningWindow.targetHorizon. An empty proposal is valid only when all beat slots and applicable daily schedules already exist.
- Use recent player behavior, explicitCommitment, admittedActorDirectory and locationDirectory. Use only supplied actor, map and room IDs.
- Every field is player-visible. Never output hidden storyArc facts, private motives, locked clues, model reasoning, secret payloads or guaranteed outcomes.
- Breakfast, lunch, dinner, quidditch, date, exam, class, training, meeting, canon and every other category are ordinary equal tags. No tag grants priority, protection, exclusivity, automatic results or special mechanics.
- Overlapping time, participants and locations are allowed. Do not cancel, hide, move or omit one arrangement merely because another overlaps it.
- New entries start planned with empty relatedSceneIds. Existing createdClock and relatedSceneIds are immutable. Past, completed and cancelled entries remain untouched.
- Do not propose Actor, Identity, Item, Social, Memory, Scene, score, grade, attendance or any other domain change.

Proposal schema:
{
  "baseTimelineEpoch": "exact supplied value",
  "baseStateRevision": 0,
  "entries": [{
    "id": "stable_snake_case",
    "parentId": "",
    "entryType": "event",
    "title": "player-visible Chinese title",
    "titleEn": "player-visible English title",
    "summary": "player-visible Chinese summary",
    "summaryEn": "player-visible English summary",
    "tags": ["ordinary_tag"],
    "startClock": "YYYY-MM-DD · HH:MM",
    "endClock": "YYYY-MM-DD · HH:MM",
    "participantIds": ["admitted_actor_id"],
    "mapId": "existing_map_id",
    "roomId": "existing_room_id",
    "status": "planned",
    "planningTier": "medium",
    "relatedSceneIds": [],
    "createdClock": "current clock for new entries; preserve existing value on update",
    "updatedClock": "current clock",
    "sourceBeatId": "schedulable storyBeat ID, or empty for ordinary schedules",
    "beatSlot": "1..4 for a beat schedule, or null",
    "scheduleKind": "routine|class|story|social|personal"
  }]
}`,
        },
        {
            role: 'user',
            content:
                JSON.stringify(
                    context,
                ),
        },
    ];
}

export function createMediumCalendarDirectorWorkflow(
    ports,
) {
    const {
        applySystemPrompt =
        () => {},
        extractRoleResponseText,
        getContext =
        () => ({
            chat: [],
        }),
        getMudState,
        guardedSaveTransaction,
        jobRegistry = {},
        parseJsonObject,
        renderAll =
        () => {},
        resolveRoleSlots,
        sendModelTaskRequest,
    } = ports;

    async function generateMediumCalendarProposal(
        roleSlot,
        state,
        trigger,
        targetHorizon,
    ) {
        const recentPlayerActions =
            (
                getContext().chat ||
                []
            )
                .filter(message =>
                    message?.is_user)
                .map(message =>
                    message.mes);
        const prompt =
            createMediumCalendarDirectorPrompt(
                state,
                {
                    trigger,
                    recentPlayerActions,
                },
            );
        let raw = '';
        let lastError = null;
        for (
            let attempt = 0;
            attempt < 2;
            attempt++
        ) {
            const response =
                await sendModelTaskRequest(
                    roleSlot,
                    attempt === 0
                        ? prompt
                        : [{
                            role:
                                'system',
                            content:
                                'Repair the invalid Medium Calendar proposal. Return only baseTimelineEpoch, baseStateRevision and entries. Fill every missing beat slot 1..4 with stable sourceBeatId + beatSlot schedules, reuse existing pair IDs, preserve ordinary daily schedules, and use only supplied actor/map/room IDs. Keep only medium V2 schedules with scheduleKind, remove past edits, hidden content, horizon and every non-Calendar field. JSON only.',
                        }, {
                            role: 'user',
                            content:
                                JSON.stringify({
                                    validationError:
                                        String(
                                            lastError
                                                ?.message ||
                                            lastError ||
                                            '',
                                        ),
                                    invalidOutput:
                                        raw,
                                    originalRequest:
                                        JSON.parse(
                                            prompt[1]
                                                .content,
                                        ),
                                }),
                        }],
                    {
                        json: true,
                    },
                );
            raw =
                extractRoleResponseText(
                    response,
                );
            try {
                const proposal =
                    parseJsonObject(
                        raw,
                    );
                const validation =
                    validateMediumCalendarDirectorProposal(
                        proposal,
                        state,
                        targetHorizon,
                    );
                if (!validation.valid) {
                    throw new Error(
                        validation.errors
                            .join('；'),
                    );
                }
                return proposal;
            } catch (error) {
                lastError = error;
            }
        }
        throw new Error(
            `中级 Calendar Director 连续两次未返回合法 proposal：${
                String(
                    lastError?.message ||
                    lastError,
                )
            }`,
        );
    }

    async function runMediumCalendarDirector(
        options = {},
    ) {
        const initialState =
            getMudState();
        const trigger =
            evaluateMediumCalendarTriggers(
                initialState,
                options,
            );
        if (!trigger.shouldRun) {
            return {
                status: 'skipped',
                reasons: [],
                state:
                    initialState,
            };
        }
        if (
            jobRegistry
                .mediumCalendarDirector
        ) {
            return jobRegistry
                .mediumCalendarDirector;
        }
        jobRegistry
            .mediumCalendarDirector =
        (async () => {
            const state =
                getMudState();
            const targetHorizon =
                advanceWorldClock(
                    state.clock,
                    MEDIUM_CALENDAR_TARGET_DAYS *
                        24 *
                        60,
                );
            const roleSlot =
                resolveRoleSlots(
                    state.modelSlots,
                ).medium;
            if (!roleSlot?.profileId) {
                throw new Error(
                    '中级 Calendar Director 没有可用的中档 Connection Profile。',
                );
            }
            const proposal =
                await generateMediumCalendarProposal(
                    roleSlot,
                    state,
                    trigger,
                    targetHorizon,
                );
            const current =
                getMudState();
            const validation =
                validateMediumCalendarDirectorProposal(
                    proposal,
                    current,
                    targetHorizon,
                );
            if (!validation.valid) {
                throw new Error(
                    validation.errors
                        .join('；'),
                );
            }
            const proposed =
                applyCalendarProposal(
                    current,
                    proposal,
                    'medium',
                );
            const next =
                proposed === current
                    ? structuredClone(
                        current,
                    )
                    : proposed;
            if (
                clockMinutes(
                    targetHorizon,
                    'Medium Calendar 目标 horizon',
                ) >
                clockMinutes(
                    next.calendar.horizon,
                    'Medium Calendar 当前 horizon',
                )
            ) {
                next.calendar = {
                    ...next.calendar,
                    horizon:
                        targetHorizon,
                };
            }
            const calendarValidation =
                validateCalendarState(
                    next.calendar,
                    next,
                );
            if (
                !calendarValidation.valid
            ) {
                throw new Error(
                    calendarValidation.errors
                        .join('；'),
                );
            }
            next.calendar =
                calendarValidation.calendar;
            if (
                typeof guardedSaveTransaction !==
                'function'
            ) {
                throw new TypeError(
                    'Medium Calendar proposal 需要 guarded save transaction。',
                );
            }
            const result =
                await guardedSaveTransaction({
                    currentState:
                        current,
                    nextState: next,
                    source:
                        'calendar_medium_director',
                    changedDomains: [
                        'calendar',
                    ],
                    consumeRevision:
                        true,
                });
            if (!result?.ok) {
                const error =
                    new Error(
                        'Medium Calendar proposal 因 revision 冲突未提交。',
                    );
                error.code =
                    result?.status ||
                    'stale_save';
                throw error;
            }
            applySystemPrompt();
            renderAll();
            return {
                status:
                    'committed',
                reasons:
                    trigger.reasons,
                proposal,
                targetHorizon,
                state:
                    result.state,
            };
        })().finally(() => {
            jobRegistry
                .mediumCalendarDirector =
                null;
        });
        return jobRegistry
            .mediumCalendarDirector;
    }

    async function runMediumCalendarDirectorSafely(
        options,
    ) {
        try {
            return await runMediumCalendarDirector(
                options,
            );
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Medium Calendar planning failed; preserving the current Calendar horizon',
                error,
            );
            return {
                status: 'failed',
                error,
                state:
                    getMudState(),
            };
        }
    }

    return {
        generateMediumCalendarProposal,
        runMediumCalendarDirector,
        runMediumCalendarDirectorSafely,
    };
}
