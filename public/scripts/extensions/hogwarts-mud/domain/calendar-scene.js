import {
    isCalendarWorldClock,
    validateCalendarState,
} from './calendar-schema.js';
import {
    projectCalendarSceneContext,
} from './calendar-projection.js';
import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';
import {
    worldClockToEpochMinutes,
} from './time-environment.js';

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

export function normalizeCalendarEntryIds(
    value,
) {
    if (!Array.isArray(value)) {
        return [];
    }
    return [
        ...new Set(
            value
                .map(id =>
                    String(id || '')
                        .normalize('NFKC')
                        .trim())
                .filter(Boolean),
        ),
    ];
}

export function selectCalendarMomentTransitionTier(
    worldState,
) {
    const candidate =
        worldState
            ?.sceneTransition
            ?.status ===
        'failed'
            ? worldState
                .sceneTransition
                .tier
            : worldState
                ?.scene
                ?.nextSceneIntent
                ?.tier;
    return candidate === 'high'
        ? 'high'
        : 'medium';
}

export function getCalendarMomentContext(
    worldState,
    entryId,
) {
    if (!isRecord(worldState)) {
        throw new TypeError(
            'Calendar Moment 需要世界状态对象。',
        );
    }
    const validation =
        validateCalendarState(
            worldState.calendar,
            worldState,
        );
    if (!validation.valid) {
        throw new TypeError(
            `Calendar 当前状态无效：${validation.errors.join('；')}`,
        );
    }
    if (
        !isCalendarWorldClock(
            worldState.clock,
        )
    ) {
        throw new TypeError(
            'Calendar Moment 当前世界时钟无效。',
        );
    }
    const normalizedId =
        String(entryId || '')
            .normalize('NFKC')
            .trim();
    const target =
        validation.calendar.entries
            .find(entry =>
                entry.id ===
                normalizedId);
    if (!target) {
        throw new Error(
            `Calendar 条目 ${normalizedId || '?'} 不存在。`,
        );
    }
    if (target.status !== 'planned') {
        throw new Error(
            `Calendar 条目 ${target.id} 不是可进入的 planned 安排。`,
        );
    }
    if (
        worldClockToEpochMinutes(
            target.startClock,
        ) <
        worldClockToEpochMinutes(
            worldState.clock,
        )
    ) {
        throw new Error(
            `Calendar 条目 ${target.id} 的开始时间已经过去。`,
        );
    }
    const calendarContext =
        projectCalendarSceneContext(
            validation.calendar,
            [
                target.id,
            ],
        );
    return {
        kind:
            'calendar_moment',
        target:
            structuredClone(target),
        targetClock:
            target.startClock,
        suggestedDestination: {
            mapId: target.mapId,
            roomId: target.roomId,
        },
        entries:
            calendarContext.entries,
        storySources:
            calendarContext
                .storySources,
        calendarEntryIds:
            [
                target.id,
            ],
        tier:
            selectCalendarMomentTransitionTier(
                worldState,
            ),
        lockDestination:
            false,
    };
}

export function getTimelineMomentContext(
    worldState,
    {
        startClock,
        mapId,
        roomId,
    } = {},
) {
    if (!isRecord(worldState)) {
        throw new TypeError(
            'Timeline Moment 需要世界状态对象。',
        );
    }
    const validation =
        validateCalendarState(
            worldState.calendar,
            worldState,
        );
    if (!validation.valid) {
        throw new TypeError(
            `Calendar 当前状态无效：${validation.errors.join('；')}`,
        );
    }
    if (
        !isCalendarWorldClock(
            worldState.clock,
        )
    ) {
        throw new TypeError(
            'Timeline Moment 当前世界时钟无效。',
        );
    }
    const targetClock =
        String(startClock || '')
            .normalize('NFKC')
            .trim();
    if (
        !isCalendarWorldClock(
            targetClock,
        )
    ) {
        throw new TypeError(
            'Timeline Moment 目标时钟必须是绝对世界时钟。',
        );
    }
    if (
        worldClockToEpochMinutes(
            targetClock,
        ) <
        worldClockToEpochMinutes(
            worldState.clock,
        )
    ) {
        throw new Error(
            'Timeline Moment 目标时钟不得早于当前世界时钟。',
        );
    }
    const targetMapId =
        String(mapId || '')
            .normalize('NFKC')
            .trim();
    const targetRoomId =
        String(roomId || '')
            .normalize('NFKC')
            .trim();
    const map =
        getLocalMapDefinition(
            targetMapId,
            worldState.map ||
            {},
        );
    if (!map) {
        throw new Error(
            `Timeline Moment 引用了不存在的地图 ${targetMapId || '?'}。`,
        );
    }
    if (
        !getMapRooms(
            map,
            worldState.map ||
            {},
        ).some(room =>
            room.id ===
            targetRoomId)
    ) {
        throw new Error(
            `Timeline Moment 房间 ${targetRoomId || '?'} 不属于地图 ${targetMapId}。`,
        );
    }
    return {
        kind:
            'timeline_moment',
        target: null,
        targetClock,
        suggestedDestination: {
            mapId:
                targetMapId,
            roomId:
                targetRoomId,
        },
        entries: [],
        storySources: [],
        calendarEntryIds: [],
        tier:
            selectCalendarMomentTransitionTier(
                worldState,
            ),
        lockDestination:
            true,
    };
}

export function archiveSceneWithCalendarLinks(
    worldState,
    archiveRecord,
) {
    if (
        !isRecord(worldState) ||
        !isRecord(archiveRecord)
    ) {
        throw new TypeError(
            'Scene 封存需要世界状态和 archive record。',
        );
    }
    const archiveId =
        String(archiveRecord.id || '')
            .normalize('NFKC')
            .trim();
    if (!archiveId) {
        throw new TypeError(
            'Scene archive record 必须有稳定 ID。',
        );
    }
    const sourceIds =
        Object.hasOwn(
            archiveRecord,
            'calendarEntryIds',
        )
            ? archiveRecord
                .calendarEntryIds
            : worldState.scene
                ?.calendarEntryIds;
    const calendarEntryIds =
        normalizeCalendarEntryIds(
            sourceIds,
        );
    const committedRecord = {
        ...structuredClone(
            archiveRecord,
        ),
        id: archiveId,
        calendarEntryIds,
    };
    const next =
        structuredClone(worldState);
    next.sceneArchive = [
        ...(
            Array.isArray(
                next.sceneArchive,
            )
                ? next.sceneArchive
                : []
        ).filter(record =>
            record?.id !==
            archiveId),
        committedRecord,
    ];
    if (!next.calendar) {
        return next;
    }
    const validation =
        validateCalendarState(
            next.calendar,
            next,
        );
    if (!validation.valid) {
        throw new TypeError(
            `Scene 封存前 Calendar 状态无效：${validation.errors.join('；')}`,
        );
    }
    const linkedIds =
        new Set(
            calendarEntryIds,
        );
    const linkedBeatIds =
        new Set(
            validation.calendar
                .entries
                .filter(entry =>
                    linkedIds.has(
                        entry.id,
                    ))
                .map(entry =>
                    entry.sourceBeatId)
                .filter(Boolean),
        );
    const currentClockMinutes =
        isCalendarWorldClock(
            next.clock,
        )
            ? worldClockToEpochMinutes(
                next.clock,
            )
            : null;
    next.calendar = {
        ...validation.calendar,
        storyBeats:
            validation.calendar
                .storyBeats.map(beat => {
                    if (
                        !linkedBeatIds.has(
                            beat.id,
                        )
                    ) {
                        return beat;
                    }
                    const relatedSceneIds = [
                        ...new Set([
                            ...beat
                                .relatedSceneIds,
                            archiveId,
                        ]),
                    ];
                    let status =
                        beat.status;
                    if (
                        status !==
                            'cancelled' &&
                        relatedSceneIds
                            .length >=
                            beat.sceneTarget
                    ) {
                        status =
                            'realized';
                    } else if (
                        ![
                            'realized',
                            'cancelled',
                        ].includes(
                            status,
                        ) &&
                        currentClockMinutes !==
                            null &&
                        currentClockMinutes >
                            worldClockToEpochMinutes(
                                beat.windowEndClock,
                            )
                    ) {
                        status =
                            'deferred';
                    }
                    return {
                        ...beat,
                        status,
                        relatedSceneIds,
                    };
                }),
        entries:
            validation.calendar
                .entries.map(entry => {
                    if (
                        !linkedIds.has(
                            entry.id,
                        )
                    ) {
                        return entry;
                    }
                    return {
                        ...entry,
                        relatedSceneIds: [
                            ...new Set([
                                ...entry
                                    .relatedSceneIds,
                                archiveId,
                            ]),
                        ],
                    };
                }),
    };
    const linkedValidation =
        validateCalendarState(
            next.calendar,
            next,
        );
    if (!linkedValidation.valid) {
        throw new TypeError(
            `Scene 封存产生非法 Calendar 关系：${linkedValidation.errors.join('；')}`,
        );
    }
    next.calendar =
        linkedValidation.calendar;
    return next;
}

function projectArchiveRecord(
    record,
) {
    return {
        id: String(
            record?.id || '',
        ),
        kind: 'scene_archive',
        title:
            String(
                record?.name ||
                record?.nameEn ||
                record?.id ||
                '',
            ),
        titleEn:
            String(
                record?.nameEn ||
                record?.name ||
                record?.id ||
                '',
            ),
        summary:
            String(
                record?.summary ||
                record?.summaryEn ||
                '',
            ),
        summaryEn:
            String(
                record?.summaryEn ||
                record?.summary ||
                '',
            ),
        startClock:
            String(
                record?.startedClock ||
                record?.endedClock ||
                '',
            ),
        endClock:
            String(
                record?.endedClock ||
                record?.startedClock ||
                '',
            ),
        mapId:
            String(
                record?.mapId || '',
            ),
        roomId:
            String(
                record?.roomId || '',
            ),
        calendarEntryIds:
            normalizeCalendarEntryIds(
                record
                    ?.calendarEntryIds,
            ),
        readOnly: true,
    };
}

export function projectSceneArchiveHistory(
    worldState,
) {
    return (
        Array.isArray(
            worldState?.sceneArchive,
        )
            ? worldState.sceneArchive
            : []
    )
        .filter(record =>
            String(
                record?.id || '',
            ).trim())
        .map(
            projectArchiveRecord,
        );
}

export function projectCalendarRelatedScenes(
    worldState,
    entryId,
) {
    const entry =
        worldState
            ?.calendar
            ?.entries
            ?.find(candidate =>
                candidate?.id ===
                entryId);
    if (!entry) {
        return [];
    }
    const historyById =
        new Map(
            projectSceneArchiveHistory(
                worldState,
            ).map(record => [
                record.id,
                record,
            ]),
        );
    return normalizeCalendarEntryIds(
        entry.relatedSceneIds,
    )
        .map(id =>
            historyById.get(id))
        .filter(Boolean)
        .map(record =>
            structuredClone(record));
}

export function readSceneArchiveRecord(
    worldState,
    archiveId,
) {
    const record =
        (
            Array.isArray(
                worldState?.sceneArchive,
            )
                ? worldState
                    .sceneArchive
                : []
        ).find(candidate =>
            candidate?.id ===
            archiveId);
    return record
        ? structuredClone(record)
        : null;
}
