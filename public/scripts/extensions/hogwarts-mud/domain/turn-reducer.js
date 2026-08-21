// Extracted from the helpers compatibility facade for Task 4.

import {
    projectActorCreationCore,
    projectActorCreationRuntime,
} from './actor-creation-proposal.js';

import {
    settleCalendarAtClock,
} from './calendar-reducer.js';

import {
    assertActorContextStateV1,
    markActorIntroducedV1,
    recordActorAppraisalV1,
    updateActorRuntimeV1,
    upsertActorV1,
} from './actor-context-runtime.js';

import {
    migrateActorPresentationState,
} from './appearance.js';

import {
    createSceneItemStates,
} from './inventory.js';

import {
    applyMaterialEvents,
} from './material-state.js';

import {
    applyNpcIdentityObservations,
} from './npc-identity-observation.js';

import {
    settleSpellProgress,
} from './spell-state.js';
import {
    applyWitnessedEventMemories,
} from './event-memory.js';
import {
    queueSpellCandidates,
} from './spell-proposals.js';

import {
    advanceWorldClock,
} from './time-environment.js';

import {
    applyItemOperations,
    normalizeItemProposal,
    queueItemCandidates,
} from './item-reducer.js';

import {
    validateTurnTransaction,
} from './turn-validation.js';
import {
    settlePostPlayerMovement,
} from './movement-post-settlement.js';

export function applyTurnTransaction(
    worldState,
    transaction,
    playerAction = '',
    {
        sourceMessageId = null,
    } = {},
) {
    const validation = validateTurnTransaction(
        transaction,
        worldState,
        playerAction,
        {
            allowLocalizedTemporaryActorFields:
                true,
        },
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    let next = structuredClone(worldState);
    if (transaction.movementPreflight) {
        const movementSettlement =
            settlePostPlayerMovement(
                next,
                transaction.movementPreflight,
                transaction.playerMovement,
                transaction.segments,
            );
        if (!movementSettlement.valid) {
            throw new Error(
                movementSettlement.error,
            );
        }
        next = movementSettlement.state;
        transaction.movementOutcome =
            movementSettlement.movementOutcome;
        if (
            movementSettlement
                .movementOutcome
                ?.moved ===
            true
        ) {
            transaction.elapsedMinutes =
                movementSettlement
                    .movementOutcome
                    .minutes;
        }
    }
    const requestedMinutes = Number(transaction.elapsedMinutes);
    const allowShortMagicTurn =
        transaction.instantaneousMagic ===
            true &&
        Boolean(
            String(
                transaction
                    .exceptionReasonEn ||
                '',
            ).trim(),
        );
    const elapsedMinutes = allowShortMagicTurn
        ? requestedMinutes
        : Math.max(15, requestedMinutes);
    next.clock = advanceWorldClock(next.clock, elapsedMinutes);
    if (next.calendar) {
        next =
            settleCalendarAtClock(
                next,
                next.clock,
            );
    }
    if (transaction.checkResolution) {
        next.checks = [
            ...(next.checks || []),
            {
                ...structuredClone(transaction.checkResolution),
                committedClock: next.clock,
            },
        ].slice(-100);
    }

    const committedTurn =
        Number(next.turn?.count || 0) + 1;
    const actorUpdates = new Map(
        (transaction.actorUpdates || []).map(update => [
            update.id,
            update,
        ]),
    );
    const settledPresentActorIds =
        Array.isArray(
            transaction.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? new Set(
                transaction.actorPresence
                    .presentActorIdsAfterTurn,
            )
            : null;
    (
        transaction
            .temporaryActorEntrances ||
        []
    ).forEach(actor => {
        const update =
            actorUpdates.get(actor.id);
        const cast = {
            origin:
                'scene_temporary',
            introducedClock:
                next.clock ||
                'unknown',
            introducedTurn:
                committedTurn,
        };
        upsertActorV1(next, {
            actorId: actor.id,
            coreSource:
                projectActorCreationCore(
                    actor,
                    {
                        cast,
                    },
                ),
            runtimeSource: {
                ...projectActorCreationRuntime(
                    actor,
                    {
                        mapId:
                            update?.mapId ||
                            next.map
                                ?.activeMapId,
                        temporary:
                            true,
                    },
                ),
                roomId:
                    update?.roomId ||
                    actor.runtime
                        .roomId ||
                    next.map
                        ?.currentLocalNodeId,
                present:
                    settledPresentActorIds
                        ?.has(actor.id) ??
                    true,
                currentActivityEn:
                    update
                        ?.currentActivityEn ||
                    actor.runtime
                        .currentActivityEn,
                currentIntentEn:
                    update
                        ?.currentIntentEn ||
                    actor.runtime
                        .currentIntentEn,
            },
        });
        markActorIntroducedV1(
            next,
            actor.id,
            {
                turn:
                    committedTurn,
            },
        );
    });
    for (const update of actorUpdates.values()) {
        if (
            !next.actorLibrary.some(actor =>
                actor.id === update.id)
        ) {
            continue;
        }
        if (
            update
                .firstImpressionOfPlayerEn
        ) {
            recordActorAppraisalV1(
                next,
                {
                    actorId: update.id,
                    summaryEn:
                        update
                            .firstImpressionOfPlayerEn,
                    kind:
                        'first_impression',
                    tier: 'recent',
                    firstImpression:
                        true,
                },
            );
        }
    }
    next =
        applyWitnessedEventMemories(
            next,
            transaction,
            {
                clock:
                    next.clock,
                turn:
                    committedTurn,
            },
        );
    for (const actor of next.actors) {
        const update =
            actorUpdates.get(actor.id);
        const locationKnown =
            update?.locationKnown ??
            actor.locationKnown ??
            Boolean(
                actor.mapId &&
                actor.roomId,
            );
        updateActorRuntimeV1(
            next,
            actor.id,
            {
                present:
                    settledPresentActorIds
                        ? settledPresentActorIds
                            .has(actor.id)
                        : update?.present ??
                            actor.present,
                mapId:
                    locationKnown
                        ? update?.mapId ||
                            actor.mapId ||
                            next.map
                                ?.activeMapId
                        : '',
                roomId:
                    locationKnown
                        ? update?.roomId ||
                            actor.roomId ||
                            next.map
                                ?.currentLocalNodeId
                        : '',
                locationKnown,
                currentActivityEn:
                    update
                        ?.currentActivityEn ??
                    actor.currentActivityEn,
                currentIntentEn:
                    update
                        ?.currentIntentEn ??
                    actor.currentIntentEn,
            },
        );
    }
    const itemOperations =
        (
            transaction
                .itemOperations ||
            transaction.itemUpdates ||
            []
        )
            .map(
                (
                    operation,
                    index,
                ) =>
                    normalizeItemProposal(
                        operation,
                        {
                            sourceRole:
                                operation
                                    .sourceRole ||
                                'low',
                            sourceEventId:
                                transaction
                                    .eventKnowledge
                                    ?.eventId ||
                                `turn_${
                                    Number(
                                        next.turn
                                            ?.count ||
                                        0,
                                    ) + 1
                                }`,
                            clock:
                                next.clock,
                            index,
                        },
                    ),
            )
            .filter(Boolean);
    next =
        applyItemOperations(
            next,
            itemOperations,
        );
    next =
        queueItemCandidates(
            next,
            transaction
                .itemCandidates ||
            [],
        );
    next =
        queueSpellCandidates(
            next,
            transaction
                .spellCandidates ||
            [],
        );
    next = applyMaterialEvents(
        next,
        transaction.materialEvents || [],
        {
            clock: next.clock,
            turn: committedTurn,
        },
    );
    next =
        applyNpcIdentityObservations(
            next,
            transaction
                .identityObservations ||
            [],
            {
                clock:
                    next.clock,
                eventId:
                    transaction
                        .eventKnowledge
                        ?.eventId ||
                    '',
                sourceMessageIds:
                    transaction
                        .eventKnowledge
                        ?.sourceMessageIds ||
                    [],
            },
        ).state;
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId:
                        next.map?.activeMapId,
                    roomId:
                        next.map
                            ?.currentLocalNodeId,
                },
            );
    }

    const existingClueIds = new Set((next.clues || []).map(clue => clue.id));
    const revealedClues = (transaction.revealedClues || [])
        .filter(clue => !existingClueIds.has(clue.id))
        .map(clue => ({
            ...clue,
            label: clue.label || clue.labelEn,
            detail: clue.detail || clue.detailEn,
            discovered: true,
            discoveredAt: next.clock,
        }));
    next.clues = [...(next.clues || []), ...revealedClues];
    const revealedIds = revealedClues.map(clue => clue.id);
    next.storyArcs = (next.storyArcs || []).map(arc => arc.status === 'active' ? {
        ...arc,
        revealedClueIds: [...new Set([...(arc.revealedClueIds || []), ...revealedIds])],
    } : arc);
    const timelineEntry = {
        clock: next.clock,
        summaryEn:
            transaction
                .publicEventEn,
        sourceRef:
            Number.isInteger(
                sourceMessageId,
            ) &&
            sourceMessageId >= 0
                ? `message:${sourceMessageId}:public_event`
                : `turn:${committedTurn}:public_event`,
    };
    if (next.scene) {
        next.scene.timelineEntries = [
            ...(next.scene.timelineEntries || []),
            timelineEntry,
        ];
    }
    next.turn = {
        count: committedTurn,
        status: 'idle',
        error: '',
        lastElapsedMinutes: elapsedMinutes,
        lastResolvedAt: new Date().toISOString(),
    };
    next =
        settleSpellProgress(
            next,
            playerAction,
            transaction,
        );
    return assertActorContextStateV1(
        migrateActorPresentationState(
            next,
        ).state,
    );
}
