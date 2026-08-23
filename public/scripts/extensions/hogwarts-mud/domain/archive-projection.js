// Extracted from the helpers compatibility facade for Task 4.

import {
    applyWitnessedEventMemories,
} from './event-memory.js';
import {
    expireEverydayAppraisalsAtSceneTransition,
} from './appraisal-lifecycle.js';

import {
    markCommittedMessageEventsKnownToPlayer,
    normalizeEventKnowledge,
    reduceEventKnowledge,
} from '../presence-witness-contract.js';

import {
    assertActorContextStateV1,
    markActorIntroducedV1,
    recordActorAppraisalV1,
    updateActorLifeStateV1,
    updateActorRuntimeV1,
    upsertActorV1,
} from './actor-context-runtime.js';

import {
    archiveSceneWithCalendarLinks,
    normalizeCalendarEntryIds,
} from './calendar-scene.js';

import {
    settleCalendarAtClock,
} from './calendar-reducer.js';

import {
    createSceneItemStates,
    synchronizeHeldItemLocations,
} from './inventory.js';

import {
    getLocalMapDefinition,
} from './map-access.js';

import {
    validateSceneTransitionPackage,
} from './scene-transition.js?v=0.1.2';

import {
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

import {
    TEMPORAL_STATE_VERSION,
} from './time-environment.js';

import {
    projectSceneTransitionPresence,
} from './transition-presence.js';
import {
    appendGlobalChronicleEntry,
} from './timeline-chronicle.js?v=0.1.2';

export function settleSceneCloseMemoryBoundary(
    memoryDirector = {},
    nextSceneId = '',
) {
    const boundary =
        memoryDirector
            ?.pendingEventBoundary;
    const pending =
        boundary?.status ===
            'pending'
            ? {
                ...structuredClone(
                    boundary,
                ),
                boundaryId:
                    boundary.boundaryId ||
                    boundary.id,
                carriedToSceneId:
                    nextSceneId,
            }
            : null;
    return {
        ...(memoryDirector || {}),
        pendingEventBoundary:
            pending,
    };
}

export function applyCommittedSceneOpeningExperience(
    worldState,
    message,
    messageId,
) {
    const mud =
        message?.extra
            ?.hogwartsMud;
    const sceneId =
        String(
            mud?.sceneId ||
            worldState?.scene?.id ||
            '',
        );
    if (
        ![
            'opening_narrative',
            'scene_opening',
        ].includes(
            mud?.role,
        ) ||
        !sceneId ||
        !Number.isInteger(messageId) ||
        messageId < 0
    ) {
        return {
            state: worldState,
            event: null,
        };
    }
    const localActors =
        (
            worldState.actors ||
            []
        )
            .filter(actor =>
                actor.present === true &&
                actor.mapId ===
                    worldState.scene
                        ?.mapId &&
                actor.roomId ===
                    worldState.scene
                        ?.roomId)
            .map(actor => actor.id)
            .sort();
    const localSet =
        new Set(localActors);
    const activeActorIds =
        Array.isArray(
            worldState
                .activeInteractionActorIds,
        )
            ? worldState
                .activeInteractionActorIds
            : [];
    const participantActorIds =
        [
            ...new Set(
                activeActorIds
                    .filter(actorId =>
                        localSet.has(
                            actorId,
                        )),
            ),
        ].sort();
    const actorNames =
        new Map(
            (
                worldState
                    .actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                String(
                    actor.nameEn ||
                    actor.id,
                ).trim(),
            ]),
        );
    const locationEn =
        String(
            worldState.scene
                ?.nameEn ||
            worldState.scene
                ?.roomId ||
            sceneId,
        ).trim();
    const clock =
        String(
            worldState.clock ||
            worldState.scene
                ?.startedClock ||
            '',
        ).trim();
    const summaryParts = [
        `${
            clock
                ? `At ${clock}, the`
                : 'The'
        } scene opens in ${locationEn}.`,
    ];
    if (localActors.length) {
        summaryParts.push(
            `Present actors: ${
                localActors
                    .map(actorId =>
                        actorNames.get(
                            actorId,
                        ) ||
                        actorId)
                    .join(', ')
            }.`,
        );
    }
    const summaryEn =
        summaryParts.join(' ');
    const eventId =
        `opening_${
            sceneId
                .replace(
                    /[^a-z0-9_]+/giu,
                    '_',
                )
        }_${messageId}`;
    const event =
        normalizeEventKnowledge({
            version: 2,
            eventKind: 'observed',
            eventId,
            sceneId,
            clock,
            sourceMessageIds: [
                messageId,
            ],
            summaryEn,
            participantActorIds,
            witnessActorIds:
            localActors,
            witnessCohortIds: [],
            witnessBasis:
            Object.fromEntries(
                localActors.map(actorId => [
                    actorId,
                    participantActorIds
                        .includes(actorId)
                        ? 'direct'
                        : 'room_visual_audible',
                ]),
            ),
            perception: {
                version: 1,
                visualScope: 'room',
                audibleScope: 'room',
                salience: 'notable',
                attribution: 'clear',
                concealment: 'none',
                directParticipantActorIds:
                participantActorIds,
                evidenceText:
                summaryEn,
                confidence: 1,
                source:
                'structured_scene_opening',
            },
            source:
            'structured_scene_opening',
        }, {
            actors:
            worldState.actors ||
            [],
            knownActorIds: (
                worldState
                    .actorLibrary ||
            []
            ).map(actor =>
                actor.id),
            cohortIds: (
                worldState.cohorts ||
            []
            ).map(cohort =>
                cohort.id),
            sourceTexts: [
                summaryEn,
            ],
        });
    if (!event) {
        throw new TypeError(
            'Committed scene opening Event is invalid.',
        );
    }
    let next =
        structuredClone(
            worldState,
        );
    next.eventKnowledge =
        reduceEventKnowledge(
            next,
            event,
        );
    next =
        applyWitnessedEventMemories(
            next,
            {
                eventKnowledge:
                    event,
                publicEvent:
                    summaryEn,
            },
            {
                clock:
                    next.clock,
                turn:
                    next.turn?.count ||
                    0,
            },
        );
    next =
        markCommittedMessageEventsKnownToPlayer(
            next,
            message,
            messageId,
            [
                event.eventId,
            ],
        );
    const committedEvent =
        next.eventKnowledge
            .find(candidate =>
                candidate.eventId ===
                    event.eventId) ||
        event;
    return {
        state: next,
        event: committedEvent,
    };
}

export function applySceneTransition(worldState, payload, archiveEntry = {}, options = {}) {
    assertActorContextStateV1(
        worldState,
    );
    const validation = validateSceneTransitionPackage(payload, worldState, options);
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    let next = structuredClone(worldState);
    const nextScene = payload.nextScene;
    const map = getLocalMapDefinition(nextScene.mapId, next.map);
    const rooms = [
        ...(map.nodes || []),
        ...(next.map.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ];
    const room = rooms.find(item => item.id === nextScene.roomId);
    const nextClock = payload.nextClock;
    const closureTimelineEntry = {
        clock: archiveEntry.endedClock || worldState.clock,
        summaryEn:
            archiveEntry
                .closureSummaryEn ||
            payload.closureSummaryEn,
        sourceRef:
            `scene:${worldState.scene?.id || 'unknown'}:closure`,
    };
    const archivedTimelineEntries = structuredClone(
        archiveEntry.timelineEntries?.length
            ? archiveEntry.timelineEntries
            : worldState.scene?.timelineEntries || [],
    );
    const lastArchivedEntry =
        archivedTimelineEntries[archivedTimelineEntries.length - 1];
    if (lastArchivedEntry?.clock !== closureTimelineEntry.clock ||
        lastArchivedEntry?.summaryEn !==
            closureTimelineEntry
                .summaryEn) {
        archivedTimelineEntries.push(closureTimelineEntry);
    }
    const committedArchiveEntry = {
        ...structuredClone(archiveEntry),
        id:
            archiveEntry.id ||
            worldState.scene?.id,
        timelineEntries: archivedTimelineEntries,
    };
    const archivedState =
        archiveSceneWithCalendarLinks(
            next,
            committedArchiveEntry,
        );
    next.sceneArchive =
        archivedState.sceneArchive;
    if (archivedState.calendar) {
        next.calendar =
            archivedState.calendar;
    }
    next.globalChronicle =
        appendGlobalChronicleEntry(
            next.globalChronicle,
            {
                sceneId:
                    committedArchiveEntry
                        .id,
                endedClock:
                    committedArchiveEntry
                        .endedClock ||
                    worldState.clock,
                summaryEn:
                    payload
                        .globalChronicleSummaryEn,
            },
        );
    next.clock = nextClock;
    if (next.calendar) {
        next =
            settleCalendarAtClock(
                next,
                nextClock,
            );
    }
    const currentTurn = Math.max(
        0,
        Number(next.turn?.count || 0),
    );
    next.chapterEn =
        nextScene.chapterEn;
    next.scene = {
        id: nextScene.id,
        nameEn: nextScene.nameEn,
        summaryEn: nextScene.summaryEn,
        explorationHookEn:
            nextScene.explorationHookEn,
        crowdDirectionEn:
            nextScene.crowdDirectionEn,
        temporalFactsEn:
            nextScene.temporalFactsEn,
        temporalGroundingVersion:
            TEMPORAL_STATE_VERSION,
        startedClock: nextClock,
        startedMessageId: Number(options.startedMessageId || 0),
        timelineEntries: [{
            clock: nextClock,
            summaryEn:
                nextScene.summaryEn,
            sourceRef:
                `scene:${nextScene.id}:opening`,
        }],
        mapId: nextScene.mapId,
        roomId: nextScene.roomId,
        calendarEntryIds:
            normalizeCalendarEntryIds(
                options
                    .calendarEntryIds,
            ),
        itemStates:
            createSceneItemStates(
                next.items,
                {
                    mapId:
                        nextScene.mapId,
                    roomId:
                        nextScene.roomId,
                },
            ),
        nextSceneIntent: structuredClone(
            nextScene.followingSceneIntent,
        ),
    };
    next.map.activeMapId = nextScene.mapId;
    next.map.currentLocalNodeId = nextScene.roomId;
    next.map.currentLevelId = room.levelId || map.defaultLevelId;
    next.map.discoveredLocalNodeIds = [...new Set([
        ...(next.map.discoveredLocalNodeIds || []),
        `${nextScene.mapId}:${nextScene.roomId}`,
    ])];

    const actorStateMap = new Map(
        nextScene.actorStates.map(actor => [actor.id, actor]),
    );
    const existingActors = new Map((next.actors || []).map(actor => [actor.id, actor]));
    for (const profile of (
        next.actorLibrary || []
    )) {
        let current =
            existingActors.get(
                profile.id,
            );
        const update = actorStateMap.get(profile.id);
        if (!current) {
            current = upsertActorV1(
                next,
                {
                    actorId:
                        profile.id,
                    coreSource:
                        profile,
                    runtimeSource: {
                        mapId:
                            update
                                ?.mapId ||
                            '',
                        roomId:
                            update
                                ?.roomId ||
                            '',
                        present: false,
                        lifeStatus:
                            update
                                ?.lifeStatus ||
                            'alive',
                        lifeStatusPermanent:
                            update
                                ?.lifeStatusPermanent ===
                            true,
                        lifeStatusDetailEn:
                            update
                                ?.lifeStatusDetailEn ||
                            'Alive.',
                        lifeStatusSinceClock:
                            update?.lifeStatus &&
                            update.lifeStatus !==
                                'alive'
                                ? nextClock
                                : '',
                        currentActivityEn:
                            '',
                        currentIntentEn:
                            '',
                        currentGoalEn:
                            '',
                        temporary:
                            false,
                    },
                },
            ).runtime;
        }
        if (
            update
                ?.firstImpressionOfPlayerEn
        ) {
            recordActorAppraisalV1(
                next,
                {
                    actorId:
                        profile.id,
                    summaryEn:
                        update
                            .firstImpressionOfPlayerEn,
                    kind:
                        'first_impression',
                    tier: 'recent',
                    clock: nextClock,
                    sceneId:
                        nextScene.id,
                    firstImpression:
                        true,
                },
            );
        }
        const lifeStatus =
            update?.lifeStatus ||
            current.lifeStatus ||
            'alive';
        updateActorRuntimeV1(
            next,
            profile.id,
            {
                mapId:
                    update?.mapId ||
                    current.mapId,
                roomId:
                    update?.roomId ||
                    current.roomId,
                present:
                    ![
                        'dead',
                        'missing',
                    ].includes(
                        lifeStatus,
                    ) &&
                    update?.present ===
                        true,
                currentActivityEn:
                    update
                        ?.currentActivityEn ??
                    current
                        .currentActivityEn,
                currentIntentEn:
                    update
                        ?.currentIntentEn ??
                    '',
                currentGoalEn:
                    current
                        .currentGoalEn,
                temporary:
                    current.temporary,
            },
        );
        updateActorLifeStateV1(
            next,
            profile.id,
            {
                lifeStatus,
                lifeStatusPermanent:
                    update
                        ?.lifeStatusPermanent ??
                    current
                        .lifeStatusPermanent,
                lifeStatusDetailEn:
                    update
                        ?.lifeStatusDetailEn ||
                    current
                        .lifeStatusDetailEn,
                present:
                    update?.present ===
                    true,
            },
            {
                tier:
                    options.tier ||
                    'medium',
                clock:
                    nextClock,
            },
        );
        if (
            update?.present === true ||
            update
                ?.firstImpressionOfPlayerEn
        ) {
            markActorIntroducedV1(
                next,
                profile.id,
                {
                    clock:
                        nextClock,
                    turn:
                        currentTurn,
                },
            );
        }
    }
    const presence =
        projectSceneTransitionPresence(
            worldState,
            next,
            nextScene,
            room,
            currentTurn,
        );
    next.actors =
        presence.actors;
    next.cohorts =
        presence.cohorts;
    next.activeInteractionActorIds =
        presence
            .activeInteractionActorIds;
    next.localPresence =
        presence.localPresence;
    next.items =
        synchronizeHeldItemLocations(
            next.items,
            {
                playerMapId:
                    nextScene.mapId,
                playerRoomId:
                    nextScene.roomId,
                actors:
                    next.actors,
                clock:
                    nextClock,
            },
        );
    next.scene.itemStates =
        createSceneItemStates(
            next.items,
            {
                mapId:
                    nextScene.mapId,
                roomId:
                    nextScene.roomId,
            },
        );
    next.sceneTransition = {
        status: 'idle',
        tier: options.tier || 'medium',
        error: '',
        requestedAt: null,
        settledAt: new Date().toISOString(),
    };
    next.pacingDirector = {
        ...(next.pacingDirector || {}),
        status: 'idle',
        error: '',
        pendingBeat: null,
    };
    next.memoryDirector = {
        ...settleSceneCloseMemoryBoundary(
            next.memoryDirector,
            nextScene.id,
        ),
        status: 'ready',
        error: '',
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        lastReviewedTurn:
            options
                .deferSocialConsolidation ===
                true ||
            next.memoryDirector
                ?.pendingEventBoundary
                ?.status ===
                'pending'
                ? Number(
                    next.memoryDirector
                        ?.lastReviewedTurn ||
                    0,
                )
                : currentTurn,
    };
    delete next.memoryDirector
        .reviewAfterTurns;
    next.turn = {
        ...(next.turn || {}),
        status: 'idle',
        error: '',
    };
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId: nextScene.mapId,
            roomId: nextScene.roomId,
        },
        lastMovement: null,
    };
    next =
        expireEverydayAppraisalsAtSceneTransition(
            next,
        ).state;
    return assertActorContextStateV1(
        next,
    );
}
