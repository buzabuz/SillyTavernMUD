// Extracted from the helpers compatibility facade for Task 4.

import {
    createSceneItemStates,
    synchronizeHeldItemLocations,
} from './inventory.js';

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

import {
    parseExplicitMovementDirective,
} from './movement.js';

import {
    normalizeSpatialText,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

export function createTurnRetryCheckpoint(
    worldState,
    {
        playerMessageId,
        assistantMessageId,
        playerAction,
        forceCheck = false,
    },
) {
    const baseState = structuredClone(worldState);
    delete baseState.turnRetry;
    baseState.turn = {
        ...(baseState.turn || {}),
        status: 'idle',
        error: '',
    };
    return {
        version: 1,
        playerMessageId,
        assistantMessageId,
        playerAction: String(playerAction || ''),
        forceCheck: Boolean(forceCheck),
        baseClock: baseState.clock,
        createdAt: new Date().toISOString(),
        baseState,
    };
}

export function restoreTurnRetryCheckpoint(
    checkpoint,
) {
    if (
        checkpoint?.version !== 1 ||
        !Number.isInteger(
            checkpoint.playerMessageId,
        ) ||
        !Number.isInteger(
            checkpoint.assistantMessageId,
        ) ||
        !String(checkpoint.playerAction || '').trim() ||
        !checkpoint.baseState ||
        typeof checkpoint.baseState !== 'object'
    ) {
        throw new Error('上一回合缺少可用的状态检查点。');
    }
    const restored = structuredClone(
        checkpoint.baseState,
    );
    delete restored.turnRetry;
    restored.turn = {
        ...(restored.turn || {}),
        status: 'idle',
        error: '',
    };
    const checkpointMovement =
        parseExplicitMovementDirective(
            checkpoint.playerAction,
        );
    const pacingMovement =
        parseExplicitMovementDirective(
            restored.pacingDirector
                ?.signals
                ?.playerAction ||
            '',
        );
    const rolledBackPacingAssessment =
        checkpoint.source ===
            'legacy_projection' ||
        (
            checkpointMovement &&
            pacingMovement &&
            normalizeSpatialText(
                checkpointMovement
                    .destinationText,
            ) ===
                normalizeSpatialText(
                    pacingMovement
                        .destinationText,
                )
        );
    if (
        rolledBackPacingAssessment &&
        Number(
            restored.pacingDirector
                ?.lastAssessedTurn ??
            -1,
        ) >=
            Number(
                restored.turn
                    ?.count ||
                0,
            )
    ) {
        restored.pacingDirector = {
            ...(restored
                .pacingDirector ||
            {}),
            status: 'idle',
            error: '',
            lastAssessedTurn: null,
            lastAssessedSceneId: '',
            assessment: null,
            assessedAt: '',
            signals: null,
            pendingBeat: null,
        };
    }
    return restored;
}

export function getAvailableTurnRollbackCheckpoint(
    worldState,
    chat,
) {
    const checkpoint =
        worldState?.turnRetry;
    if (
        worldState?.turn?.status !==
            'idle' ||
        checkpoint?.version !== 1 ||
        !checkpoint.baseState ||
        !Array.isArray(chat) ||
        !Number.isInteger(
            checkpoint.playerMessageId,
        ) ||
        !Number.isInteger(
            checkpoint.assistantMessageId,
        ) ||
        checkpoint.playerMessageId !==
            chat.length - 2 ||
        checkpoint.assistantMessageId !==
            chat.length - 1
    ) {
        return null;
    }
    const playerMessage =
        chat[
            checkpoint.playerMessageId
        ];
    const assistantMessage =
        chat[
            checkpoint.assistantMessageId
        ];
    if (
        playerMessage?.is_user !== true ||
        playerMessage.extra
            ?.hogwartsMud?.role !==
            'player_turn' ||
        assistantMessage?.is_user ===
            true ||
        assistantMessage?.extra
            ?.hogwartsMud?.role !==
            'scene_turn'
    ) {
        return null;
    }
    return checkpoint;
}

export function createLegacyTurnRollbackCheckpoint(
    worldState,
    chat,
) {
    if (
        worldState?.turn?.status !==
            'idle' ||
        !Array.isArray(chat) ||
        chat.length < 3
    ) {
        return null;
    }
    const assistantMessageId =
        chat.length - 1;
    const playerMessageId =
        assistantMessageId - 1;
    const previousAssistantMessageId =
        playerMessageId - 1;
    const assistantMessage =
        chat[assistantMessageId];
    const playerMessage =
        chat[playerMessageId];
    const previousAssistantMessage =
        chat[
            previousAssistantMessageId
        ];
    const transaction =
        assistantMessage?.extra
            ?.hogwartsMud
            ?.turnTransaction;
    const previousTransaction =
        previousAssistantMessage?.extra
            ?.hogwartsMud
            ?.turnTransaction;
    if (
        playerMessage?.is_user !== true ||
        playerMessage.extra
            ?.hogwartsMud?.role !==
            'player_turn' ||
        assistantMessage?.is_user ===
            true ||
        assistantMessage?.extra
            ?.hogwartsMud?.role !==
            'scene_turn' ||
        !transaction ||
        !previousTransaction
            ?.committedClock
    ) {
        return null;
    }
    const currentTurn =
        Math.max(
            1,
            Number(
                worldState.turn
                    ?.count ||
                1,
            ),
        );
    const previousTurn =
        currentTurn - 1;
    const baseState =
        structuredClone(
            worldState,
        );
    delete baseState.turnRetry;
    baseState.clock =
        previousTransaction
            .committedClock;
    baseState.turn = {
        ...(baseState.turn || {}),
        count: previousTurn,
        status: 'idle',
        error: '',
        lastElapsedMinutes:
            Number(
                previousTransaction
                    .elapsedMinutes ||
                0,
            ),
        lastResolvedAt:
            previousAssistantMessage
                .send_date ||
            '',
    };
    const latestClock =
        transaction
            .committedClock;
    const removeLatestTimelineEntry =
        entries => {
            const nextEntries =
                structuredClone(
                    entries || [],
                );
            const lastIndex =
                nextEntries.length - 1;
            if (
                lastIndex >= 0 &&
                (
                    !latestClock ||
                    nextEntries[lastIndex]
                        ?.clock ===
                        latestClock
                )
            ) {
                nextEntries.splice(
                    lastIndex,
                    1,
                );
            }
            return nextEntries;
        };
    if (baseState.scene) {
        baseState.scene
            .timelineEntries =
            removeLatestTimelineEntry(
                baseState.scene
                    .timelineEntries,
            );
    }
    baseState.timeline =
        removeLatestTimelineEntry(
            baseState.timeline,
        );
    const previousPresence =
        new Set(
            previousTransaction
                .actorPresence
                ?.presentActorIdsAfterTurn ||
            [],
        );
    const previousUpdates =
        new Map(
            (
                previousTransaction
                    .actorUpdates ||
                []
            ).map(update => [
                update.id,
                update,
            ]),
        );
    const temporaryActorIds =
        new Set(
            (
                transaction
                    .temporaryActorEntrances ||
                []
            ).map(actor =>
                actor.id),
        );
    const restoreActor =
        actor => {
            const update =
                previousUpdates.get(
                    actor.id,
                );
            return {
                ...actor,
                present:
                    previousPresence
                        .has(actor.id),
                ...(update
                    ? {
                        mapId:
                            update.mapId ||
                            actor.mapId,
                        roomId:
                            update.roomId ||
                            actor.roomId,
                        currentActivityEn:
                            update
                                .currentActivityEn ??
                            actor
                                .currentActivityEn,
                        currentActivity:
                            update
                                .currentActivity ??
                            update
                                .currentActivityEn ??
                            actor
                                .currentActivity,
                        currentIntentEn:
                            update
                                .currentIntentEn ??
                            actor
                                .currentIntentEn,
                        currentIntent:
                            update
                                .currentIntent ??
                            update
                                .currentIntentEn ??
                            actor
                                .currentIntent,
                    }
                    : {}),
            };
        };
    baseState.actors =
        (baseState.actors || [])
            .filter(actor =>
                !temporaryActorIds
                    .has(actor.id))
            .map(restoreActor);
    const stripCurrentTurnMemories =
        actor => {
            const nextActor = {
                ...actor,
            };
            if (
                nextActor
                    .sharedMemories
            ) {
                nextActor.sharedMemories = {
                    ...nextActor
                        .sharedMemories,
                };
                for (
                    const tier of [
                        'core',
                        'recent',
                        'everyday',
                    ]
                ) {
                    nextActor
                        .sharedMemories[
                            tier
                        ] = (
                            nextActor
                                .sharedMemories[
                                    tier
                                ] ||
                            []
                        ).filter(memory =>
                            Number(
                                memory
                                    .createdTurn ||
                                0,
                            ) <
                            currentTurn);
                }
            }
            return nextActor;
        };
    baseState.actorLibrary =
        (baseState.actorLibrary || [])
            .filter(actor =>
                !temporaryActorIds
                    .has(actor.id))
            .map(
                stripCurrentTurnMemories,
            );
    baseState.actors =
        baseState.actors.map(
            stripCurrentTurnMemories,
        );
    const committedMovement =
        worldState.spatial
            ?.lastMovement;
    const attemptedMovement =
        playerMessage.extra
            ?.hogwartsMud
            ?.movement;
    if (
        committedMovement?.moved ===
            true &&
        attemptedMovement
            ?.attempted === true &&
        attemptedMovement.toMapId ===
            committedMovement.toMapId &&
        attemptedMovement.toRoomId ===
            committedMovement.toRoomId
    ) {
        const fromMapId =
            committedMovement
                .fromMapId;
        const fromRoomId =
            committedMovement
                .fromRoomId;
        const fromMap =
            getLocalMapDefinition(
                fromMapId,
                baseState.map,
            );
        const fromRoom =
            getMapRooms(
                fromMap,
                baseState.map,
            ).find(room =>
                room.id ===
                    fromRoomId);
        baseState.map.activeMapId =
            fromMapId;
        baseState.map
            .currentLocalNodeId =
            fromRoomId;
        baseState.map.currentLevelId =
            fromRoom?.levelId ||
            fromMap?.defaultLevelId;
        baseState.location =
            committedMovement
                .fromRoomName ||
            fromRoom?.name ||
            fromRoom?.nameEn ||
            baseState.location;
        if (baseState.scene) {
            baseState.scene.mapId =
                fromMapId;
            baseState.scene.roomId =
                fromRoomId;
        }
        const companionIds =
            new Set(
                committedMovement
                    .companionIds ||
                [],
            );
        baseState.actors =
            baseState.actors.map(actor =>
                companionIds
                    .has(actor.id)
                    ? {
                        ...actor,
                        mapId:
                            fromMapId,
                        roomId:
                            fromRoomId,
                    }
                    : actor);
        baseState.items =
            synchronizeHeldItemLocations(
                baseState.items,
                {
                    playerMapId:
                        fromMapId,
                    playerRoomId:
                        fromRoomId,
                    actors:
                        baseState.actors,
                    clock:
                        baseState.clock,
                },
            );
        if (baseState.scene) {
            baseState.scene.itemStates =
                createSceneItemStates(
                    baseState.items,
                    {
                        mapId:
                            fromMapId,
                        roomId:
                            fromRoomId,
                    },
                );
        }
        baseState.spatial = {
            ...(baseState.spatial || {}),
            version:
                SPATIAL_STATE_VERSION,
            player: {
                mapId:
                    fromMapId,
                roomId:
                    fromRoomId,
            },
            lastMovement: null,
        };
    }
    if (
        baseState.pacingDirector
            ?.pendingBeat
            ?.consumedTurn >=
        currentTurn
    ) {
        baseState.pacingDirector = {
            ...baseState
                .pacingDirector,
            status: 'idle',
            pendingBeat: null,
        };
        if (baseState.scene) {
            baseState.scene
                .pacingPressureEn =
                '';
        }
    }
    return {
        version: 1,
        playerMessageId,
        assistantMessageId,
        playerAction:
            String(
                playerMessage.mes ||
                '',
            ),
        forceCheck:
            Boolean(
                playerMessage.extra
                    ?.hogwartsMud
                    ?.requiresCheck,
            ),
        baseClock:
            baseState.clock,
        createdAt:
            new Date()
                .toISOString(),
        source:
            'legacy_projection',
        baseState,
    };
}

export function getFailedPlayerTurn(
    chat,
    turnState,
) {
    if (
        turnState?.status !== 'failed' ||
        !Array.isArray(chat) ||
        !chat.length
    ) {
        return null;
    }
    const messageId = chat.length - 1;
    const message = chat[messageId];
    if (
        message?.is_user !== true ||
        message.extra?.hogwartsMud?.role !==
            'player_turn'
    ) {
        return null;
    }
    return {
        messageId,
        playerAction:
            String(message.mes || ''),
        forceCheck:
            Boolean(
                message.extra.hogwartsMud
                    .requiresCheck,
            ),
        error:
            String(turnState.error || ''),
    };
}

export function findUnsettledTurn(
    chat,
    turnState,
) {
    if (
        !Array.isArray(chat) ||
        !chat.length
    ) {
        return null;
    }
    const lastMessageId =
        chat.length - 1;
    const lastMessage =
        chat[lastMessageId];
    if (
        lastMessage?.is_user ===
            true &&
        lastMessage.extra
            ?.hogwartsMud?.role ===
            'player_turn'
    ) {
        if (
            turnState?.status ===
            'failed'
        ) {
            return null;
        }
        return {
            playerMessageId:
                lastMessageId,
            assistantMessageId:
                null,
            playerAction:
                String(
                    lastMessage.mes ||
                    '',
                ),
            forceCheck:
                Boolean(
                    lastMessage.extra
                        .hogwartsMud
                        .requiresCheck,
                ),
        };
    }
    if (
        turnState?.status !==
        'resolving'
    ) {
        return null;
    }
    for (
        let messageId =
            lastMessageId;
        messageId >= 0;
        messageId--
    ) {
        const message =
            chat[messageId];
        if (message?.is_user) {
            break;
        }
        if (
            !message ||
            message.is_system ||
            message.extra
                ?.hogwartsMud?.role ===
                'opening_narrative' ||
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
        ) {
            continue;
        }
        const playerMessageId =
            chat
                .slice(
                    0,
                    messageId,
                )
                .findLastIndex(
                    candidate =>
                        candidate
                            ?.is_user ===
                            true,
                );
        const playerMessage =
            chat[playerMessageId];
        if (
            playerMessage?.extra
                ?.hogwartsMud?.role !==
                'player_turn'
        ) {
            return null;
        }
        return {
            playerMessageId,
            assistantMessageId:
                messageId,
            playerAction:
                String(
                    playerMessage.mes ||
                    '',
                ),
            forceCheck:
                Boolean(
                    playerMessage.extra
                        .hogwartsMud
                        .requiresCheck,
                ),
        };
    }
    return null;
}
