import {
    applyHighCalendarProposal,
    validateHighCalendarProposal,
} from '../domain/calendar-reducer.js';
import {
    isCalendarWorldClock,
} from '../domain/calendar-schema.js';
import {
    validateNpcIdentity,
} from '../domain/npc-identity-schema.js';
import {
    worldClockToEpochMinutes,
} from '../domain/time-environment.js';
import {
    adoptEnglishFields,
} from '../domain/model-language-adoption.js';

const HIGH_CALENDAR_TRIGGERS =
    new Set([
        'opening_world',
        'high_transition',
    ]);
const TERMINAL_STORYLINE_STATUSES =
    new Set([
        'resolved',
        'cancelled',
    ]);
const TERMINAL_STORY_BEAT_STATUSES =
    new Set([
        'realized',
        'cancelled',
    ]);
const PRIVATE_STORY_KEY_PATTERN =
    /(?:hidden|private|secret|unlock|clue|storyarc)/iu;

function adoptHighCalendarLanguage(
    proposal,
) {
    const diagnostics = [];
    const adoptRecords =
        (
            records,
            taskId,
        ) =>
            (
                Array.isArray(records)
                    ? records
                    : []
            )
                .map(record => {
                    const candidate = {
                        ...record,
                    };
                    delete candidate.title;
                    delete candidate.summary;
                    const result =
                        adoptEnglishFields(
                            candidate,
                            {
                                taskId,
                                recordId:
                                    candidate.id,
                                requiredFields: [
                                    'titleEn',
                                    'summaryEn',
                                ],
                            },
                        );
                    diagnostics.push(
                        ...result
                            .diagnostics,
                    );
                    return result.admissible
                        ? result.accepted
                        : null;
                })
                .filter(Boolean);
    const accepted = {
        ...proposal,
        storylines:
            adoptRecords(
                proposal?.storylines,
                'calendar_high',
            ),
        storyBeats:
            adoptRecords(
                proposal?.storyBeats,
                'calendar_high',
            ),
    };
    Object.defineProperty(
        accepted,
        'modelLanguageDiagnostics',
        {
            value:
                diagnostics,
            enumerable: false,
        },
    );
    return accepted;
}

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function normalizedFingerprint(
    value,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .toLocaleLowerCase();
}

function collectPrivateStoryValues(
    value,
    values,
    privatePath = false,
) {
    if (typeof value === 'string') {
        const fingerprint =
            normalizedFingerprint(
                value,
            );
        if (
            privatePath &&
            fingerprint.length >= 12
        ) {
            values.add(
                fingerprint,
            );
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(entry =>
            collectPrivateStoryValues(
                entry,
                values,
                privatePath,
            ));
        return;
    }
    if (!isRecord(value)) {
        return;
    }
    Object.entries(value)
        .forEach(([key, entry]) =>
            collectPrivateStoryValues(
                entry,
                values,
                privatePath ||
                PRIVATE_STORY_KEY_PATTERN
                    .test(key),
            ));
}

function findHiddenStoryLeak(
    records,
    worldState,
) {
    const privateValues =
        new Set();
    collectPrivateStoryValues(
        worldState.storyArcs || [],
        privateValues,
        true,
    );
    if (!privateValues.size) {
        return '';
    }
    for (const record of records) {
        for (const field of [
            'titleEn',
            'summaryEn',
        ]) {
            const candidate =
                normalizedFingerprint(
                    record[field],
                );
            if (
                candidate.length < 12
            ) {
                continue;
            }
            for (
                const privateValue
                of privateValues
            ) {
                if (
                    candidate.includes(
                        privateValue,
                    ) ||
                    privateValue.includes(
                        candidate,
                    )
                ) {
                    return `${record.id}.${field}`;
                }
            }
        }
    }
    return '';
}

function hasStableActorIdentity(
    actorId,
    worldState,
) {
    const profile =
        (
            worldState.actorLibrary ||
            []
        ).find(actor =>
            actor?.id === actorId);
    const runtimeActor =
        (
            worldState.actors ||
            []
        ).find(actor =>
            actor?.id === actorId);
    return Boolean(
        profile &&
        runtimeActor?.temporary !==
            true &&
        validateNpcIdentity(
            profile.identity,
        ).valid,
    );
}

function publicConflictProjection(
    conflict,
) {
    if (!isRecord(conflict)) {
        return null;
    }
    return Object.fromEntries(
        [
            'titleEn',
            'premiseEn',
            'immediatePressureEn',
            'stakesEn',
            'incitingEventEn',
        ].map(key => [
            key,
            String(
                conflict[key] ||
                '',
            ),
        ]),
    );
}

function latestHighTransitionProjection(
    worldState,
) {
    const archive =
        [
            ...(
                worldState.sceneArchive ||
                []
            ),
        ].reverse()
            .find(scene =>
                scene?.tier ===
                'high');
    if (!archive) {
        return null;
    }
    return {
        id:
            String(archive.id || ''),
        endedClock:
            String(
                archive.endedClock ||
                '',
            ),
    };
}

function currentOrFutureStoryState(
    worldState,
) {
    if (
        !isCalendarWorldClock(
            worldState.clock,
        )
    ) {
        return {
            storylines: [],
            storyBeats: [],
        };
    }
    const currentMinutes =
        worldClockToEpochMinutes(
            worldState.clock,
        );
    const storylines =
        (
            worldState.calendar
                ?.storylines ||
            []
        ).filter(storyline =>
            !TERMINAL_STORYLINE_STATUSES
                .has(
                    storyline.status,
                ) &&
            isCalendarWorldClock(
                storyline.endClock,
            ) &&
            worldClockToEpochMinutes(
                storyline.endClock,
            ) >= currentMinutes)
            .map(storyline =>
                structuredClone(
                    storyline,
                ));
    const storylineIds =
        new Set(
            storylines.map(storyline =>
                storyline.id),
        );
    const storyBeats =
        (
            worldState.calendar
                ?.storyBeats ||
            []
        ).filter(beat =>
            storylineIds.has(
                beat.storylineId,
            ) &&
            !TERMINAL_STORY_BEAT_STATUSES
                .has(
                    beat.status,
                ) &&
            isCalendarWorldClock(
                beat.windowEndClock,
            ) &&
            worldClockToEpochMinutes(
                beat.windowEndClock,
            ) >= currentMinutes)
            .map(beat =>
                structuredClone(beat));
    return {
        storylines,
        storyBeats,
    };
}

function hasOpeningWorldStoryPlan(
    worldState,
) {
    const storylines =
        worldState.calendar
            ?.storylines ||
        [];
    const storyBeats =
        worldState.calendar
            ?.storyBeats ||
        [];
    if (!storylines.length) {
        return false;
    }
    const storylineIdsWithBeats =
        new Set(
            storyBeats.map(beat =>
                beat.storylineId),
        );
    return storylines.every(
        storyline =>
            storylineIdsWithBeats
                .has(storyline.id),
    );
}

function validateHighTransitionScope(
    validation,
    worldState,
    errors,
) {
    if (
        !isCalendarWorldClock(
            worldState.clock,
        )
    ) {
        return;
    }
    const currentMinutes =
        worldClockToEpochMinutes(
            worldState.clock,
        );
    const currentStorylines =
        new Map(
            (
                worldState.calendar
                    ?.storylines ||
                []
            ).map(storyline => [
                storyline.id,
                storyline,
            ]),
        );
    validation.storylines
        .forEach(storyline => {
            const current =
                currentStorylines.get(
                    storyline.id,
                );
            if (
                current &&
                (
                    TERMINAL_STORYLINE_STATUSES
                        .has(
                            current.status,
                        ) ||
                    (
                        isCalendarWorldClock(
                            current.endClock,
                        ) &&
                        worldClockToEpochMinutes(
                            current.endClock,
                        ) <
                            currentMinutes
                    )
                )
            ) {
                errors.push(
                    `High Calendar storyline ${storyline.id} 不属于当前或未来节奏。`,
                );
            }
        });
    const currentStoryBeats =
        new Map(
            (
                worldState.calendar
                    ?.storyBeats ||
                []
            ).map(beat => [
                beat.id,
                beat,
            ]),
        );
    validation.storyBeats
        .forEach(beat => {
            const current =
                currentStoryBeats.get(
                    beat.id,
                );
            if (
                current &&
                (
                    TERMINAL_STORY_BEAT_STATUSES
                        .has(
                            current.status,
                        ) ||
                    (
                        isCalendarWorldClock(
                            current
                                .windowEndClock,
                        ) &&
                        worldClockToEpochMinutes(
                            current
                                .windowEndClock,
                        ) <
                            currentMinutes
                    )
                )
            ) {
                errors.push(
                    `High Calendar storyBeat ${beat.id} 不属于当前或未来节奏。`,
                );
            }
        });
}

export function projectHighCalendarDirectorContext(
    worldState,
    {
        trigger = 'opening_world',
    } = {},
) {
    if (
        !HIGH_CALENDAR_TRIGGERS
            .has(trigger)
    ) {
        throw new TypeError(
            'High Calendar trigger 必须是 opening_world 或 high_transition。',
        );
    }
    const admittedActors =
        (
            worldState.actorLibrary ||
            []
        )
            .filter(actor =>
                hasStableActorIdentity(
                    actor.id,
                    worldState,
                ))
            .map(actor => ({
                id: actor.id,
                nameEn:
                    String(
                        actor.nameEn ||
                        actor.id,
                    ),
                roleEn:
                    String(
                        actor.roleEn ||
                        '',
                    ),
                identityReady: true,
            }));
    const currentOrFuture =
        currentOrFutureStoryState(
            worldState,
        );
    return {
        trigger,
        baseTimelineEpoch:
            worldState.timelineEpoch,
        baseStateRevision:
            worldState.stateRevision,
        currentClock:
            worldState.clock,
        publicConflict:
            publicConflictProjection(
                worldState.conflict,
            ),
        latestHighTransition:
            trigger ===
                'high_transition'
                ? latestHighTransitionProjection(
                    worldState,
                )
                : null,
        admittedActors,
        currentAndFutureStorylines:
            currentOrFuture
                .storylines,
        currentAndFutureStoryBeats:
            currentOrFuture
                .storyBeats,
    };
}

export function validateHighCalendarDirectorProposal(
    proposal,
    worldState,
    {
        trigger = 'opening_world',
    } = {},
) {
    const validation =
        validateHighCalendarProposal(
            proposal,
            worldState,
        );
    const errors = [
        ...validation.errors,
    ];
    if (
        !HIGH_CALENDAR_TRIGGERS
            .has(trigger)
    ) {
        errors.push(
            'High Calendar trigger 无效。',
        );
    }
    if (
        trigger ===
            'opening_world' &&
        (
            validation.storylines
                .length === 0 ||
            validation.storyBeats
                .length === 0
        )
    ) {
        errors.push(
            'Opening World High Calendar proposal 必须提交 storyline 及其 storyBeat 学期节奏。',
        );
    }
    validation.storylines
        .forEach(storyline => {
            storyline.participantIds
                .forEach(actorId => {
                    if (
                        !hasStableActorIdentity(
                            actorId,
                            worldState,
                        )
                    ) {
                        errors.push(
                            `Calendar storyline ${storyline.id} 的 Actor ${actorId} 尚未完成 Actor Admission/Identity。`,
                        );
                    }
                });
        });
    const hiddenLeak =
        findHiddenStoryLeak(
            [
                ...validation
                    .storylines,
                ...validation
                    .storyBeats,
            ],
            worldState,
        );
    if (hiddenLeak) {
        errors.push(
            `High Calendar proposal 的 ${hiddenLeak} 泄漏了隐藏 storyArc 内容。`,
        );
    }
    if (
        trigger ===
        'opening_world'
    ) {
        const incomingStorylineIds =
            new Set(
                validation.storylines
                    .map(storyline =>
                        storyline.id),
            );
        incomingStorylineIds
            .forEach(storylineId => {
                if (
                    !validation
                        .storyBeats
                        .some(beat =>
                            beat
                                .storylineId ===
                            storylineId)
                ) {
                    errors.push(
                        `Opening World High Calendar storyline ${storylineId} 缺少学期 storyBeat。`,
                    );
                }
            });
    }
    if (
        trigger ===
        'high_transition'
    ) {
        validateHighTransitionScope(
            validation,
            worldState,
            errors,
        );
    }
    return {
        ...validation,
        valid:
            errors.length === 0,
        errors,
    };
}

export function createHighCalendarDirectorPrompt(
    worldState,
    {
        trigger = 'opening_world',
    } = {},
) {
    const context =
        projectHighCalendarDirectorContext(
            worldState,
            {
                trigger,
            },
        );
    const triggerInstruction =
        trigger === 'opening_world'
            ? 'Create at least one long-span storyline and one ordered storyBeat for every academic term it spans. A four-school-year storyline has eight term beats.'
            : 'Refresh only current or future storylines and storyBeats supplied in context. Keep past, realized, resolved and cancelled records untouched. If no change is needed, return storylines: [] and storyBeats: [].';
    return [
        {
            role: 'system',
            content: `You are the High Calendar Director for a persistent RPG. Return exactly one Calendar upsert proposal as JSON with no Markdown or commentary.

Calendar storyline and storyBeat records are entirely player-visible. Never output hidden storyArc facts, private motives, locked clues, model reasoning, secret payloads or predetermined future outcomes.

${triggerInstruction}

Rules:
- Return exactly baseTimelineEpoch, baseStateRevision, storylines and storyBeats. Never return entries, schedules, mapId, roomId, Scene prose, openings or exact event arrangements.
- Storylines express long-term public direction. StoryBeats express broad term windows and four observable-scene targets; they are not schedules or prewritten Scenes.
- Every storyline termKey is represented at most once, sequences are strictly increasing, and every storyBeat has sceneTarget 4.
- Reuse stable IDs when updating existing current/future records. Omitted records remain unchanged.
- Never include, rewrite, reschedule or cancel past, realized, resolved or cancelled records.
- New records start as planned with createdClock and updatedClock equal to currentClock.
- New storyBeats use relatedSceneIds: []. Existing relatedSceneIds and createdClock are immutable and must be preserved exactly.
- Storyline participantIds may use only admittedActors whose identityReady is true. Actor Admission/Identity must commit before a later Calendar run.
- calendar.storyBeats and pacingDirector.pendingBeat are separate authorities. Never consume, migrate, copy or overwrite pendingBeat.
- Canon, quidditch, exam, date, class and every other category are ordinary tags with no special mechanics.
- Calendar planning must not propose changes to Actor, Identity, Item, Social, Memory, Scene or any other domain.

Proposal schema:
{
  "baseTimelineEpoch": "exact supplied value",
  "baseStateRevision": 0,
  "storylines": [{
    "id": "stable_snake_case",
    "titleEn": "player-visible English title",
    "summaryEn": "player-visible English summary",
    "tags": ["ordinary_tag"],
    "startClock": "YYYY-MM-DD · HH:MM",
    "endClock": "YYYY-MM-DD · HH:MM",
    "participantIds": ["admitted_actor_id"],
    "status": "planned",
    "createdClock": "current clock for new entries; preserve existing value on update",
    "updatedClock": "current clock"
  }],
  "storyBeats": [{
    "id": "stable_snake_case",
    "storylineId": "existing or proposed storyline id",
    "titleEn": "player-visible English title",
    "summaryEn": "player-visible English summary",
    "tags": ["ordinary_tag"],
    "termKey": "unique_stable_term_key",
    "sequence": 1,
    "windowStartClock": "YYYY-MM-DD · HH:MM",
    "windowEndClock": "YYYY-MM-DD · HH:MM",
    "sceneTarget": 4,
    "status": "planned",
    "relatedSceneIds": [],
    "createdClock": "current clock for new beats; preserve existing value on update",
    "updatedClock": "current clock"
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

function calendarsEqual(
    left,
    right,
) {
    return JSON.stringify(left) ===
        JSON.stringify(right);
}

export function createHighCalendarDirectorWorkflow(
    ports,
) {
    const {
        extractRoleResponseText,
        enqueueLocalizationCandidates =
        async () => {},
        getContext,
        getMudState,
        jobRegistry,
        parseJsonObject,
        renderAll =
        () => {},
        resolveRoleSlots,
        sendModelTaskRequest,
    } = ports;

    async function generateHighCalendarProposal(
        roleSlot,
        state,
        trigger,
    ) {
        const prompt =
            createHighCalendarDirectorPrompt(
                state,
                {
                    trigger,
                },
            );
        const response =
            await sendModelTaskRequest(
                roleSlot,
                prompt,
                {
                    json: true,
                },
            );
        const proposal =
            adoptHighCalendarLanguage(
                parseJsonObject(
                    extractRoleResponseText(
                        response,
                    ),
                ),
            );
        const validation =
            validateHighCalendarDirectorProposal(
                proposal,
                state,
                {
                    trigger,
                },
            );
        if (
            !validation.valid &&
            !proposal
                .modelLanguageDiagnostics
                .length
        ) {
            throw new Error(
                validation.errors
                    .join('；'),
            );
        }
        return proposal;
    }

    async function runHighCalendarDirector(
        {
            trigger = 'opening_world',
            force = false,
        } = {},
    ) {
        if (
            !HIGH_CALENDAR_TRIGGERS
                .has(trigger)
        ) {
            throw new TypeError(
                'High Calendar trigger 必须是 opening_world 或 high_transition。',
            );
        }
        const initialState =
            getMudState();
        if (
            trigger === 'opening_world' &&
            !force &&
            hasOpeningWorldStoryPlan(
                initialState,
            )
        ) {
            return {
                status:
                    'skipped',
                reason:
                    'opening_world_already_planned',
                state:
                    initialState,
            };
        }
        if (
            jobRegistry
                .highCalendarDirector
        ) {
            return jobRegistry
                .highCalendarDirector;
        }
        jobRegistry
            .highCalendarDirector =
        (async () => {
            const state =
                getMudState();
            const roleSlot =
                resolveRoleSlots(
                    state.modelSlots,
                ).high;
            if (!roleSlot?.profileId) {
                throw new Error(
                    '高级 Calendar Director 没有可用的高档 Connection Profile。',
                );
            }
            const proposal =
                await generateHighCalendarProposal(
                    roleSlot,
                    state,
                    trigger,
                );
            const current =
                getMudState();
            if (
                proposal
                    .modelLanguageDiagnostics
                    .length &&
                (
                    (
                        trigger ===
                            'opening_world' &&
                        (
                            !proposal
                                .storylines
                                .length ||
                            !proposal
                                .storyBeats
                                .length
                        )
                    ) ||
                    (
                        !proposal
                            .storylines
                            .length &&
                        !proposal
                            .storyBeats
                            .length
                    )
                )
            ) {
                return {
                    status:
                        'language_skipped',
                    diagnostics:
                        proposal
                            .modelLanguageDiagnostics,
                    state: current,
                };
            }
            const validation =
                validateHighCalendarDirectorProposal(
                    proposal,
                    current,
                    {
                        trigger,
                    },
                );
            if (!validation.valid) {
                throw new Error(
                    validation.errors
                        .join('；'),
                );
            }
            const next =
                applyHighCalendarProposal(
                    current,
                    proposal,
                );
            const context =
                getContext();
            context.chatMetadata
                .hogwartsMud =
                next;
            try {
                await context.saveMetadata({
                    source:
                        'calendar_high_director',
                    changedDomains: [
                        'calendar',
                    ],
                    consumeRevision:
                        true,
                });
            } catch (error) {
                const pending =
                    context.chatMetadata
                        .hogwartsMud;
                if (
                    pending
                        ?.timelineEpoch ===
                        current
                            .timelineEpoch &&
                    pending
                        ?.stateRevision ===
                        current
                            .stateRevision &&
                    calendarsEqual(
                        pending.calendar,
                        next.calendar,
                    )
                ) {
                    context.chatMetadata
                        .hogwartsMud =
                        current;
                }
                renderAll();
                throw error;
            }
            void enqueueLocalizationCandidates(
                [],
            ).catch(error =>
                console.warn(
                    '[Hogwarts MUD] High Calendar localization candidate enqueue failed',
                    error,
                ));
            renderAll();
            return {
                status:
                    'committed',
                proposal,
                state:
                    getMudState(),
            };
        })().finally(() => {
            jobRegistry
                .highCalendarDirector =
                null;
        });
        return jobRegistry
            .highCalendarDirector;
    }

    async function runHighCalendarDirectorSafely(
        options,
    ) {
        try {
            return await runHighCalendarDirector(
                options,
            );
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] High Calendar planning failed; preserving committed world state',
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
        generateHighCalendarProposal,
        runHighCalendarDirector,
        runHighCalendarDirectorSafely,
    };
}
