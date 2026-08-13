import {
    addActorMemoryRefV1,
    assertActorContextStateV1,
} from './actor-context-runtime.js';
import {
    reduceEventKnowledge,
} from '../presence-witness-contract.js';

const PUBLIC_MEMORY_SALIENCE =
    new Set([
        'notable',
        'major',
    ]);

function isRoomWidePerception(
    perception,
) {
    return (
        perception?.concealment !==
            'successful' &&
        (
            [
                'room',
                'area',
            ].includes(
                perception
                    ?.visualScope,
            ) ||
            [
                'room',
                'adjacent',
            ].includes(
                perception
                    ?.audibleScope,
            )
        )
    );
}

export function isPublicWitnessMemoryEvent(
    eventKnowledge,
) {
    return Boolean(
        eventKnowledge?.eventId &&
        String(
            eventKnowledge.summaryEn ||
            '',
        ).trim() &&
        PUBLIC_MEMORY_SALIENCE.has(
            eventKnowledge
                .perception
                ?.salience,
        ) &&
        isRoomWidePerception(
            eventKnowledge
                .perception,
        ) &&
        Array.isArray(
            eventKnowledge
                .witnessActorIds,
        ) &&
        eventKnowledge
            .witnessActorIds
            .length,
    );
}

export function applyWitnessedEventMemories(
    worldState,
    transaction,
    {
        clock =
        worldState?.clock ||
        '',
        turn =
        worldState?.turn
            ?.count ||
        0,
    } = {},
) {
    assertActorContextStateV1(
        worldState,
    );
    const eventKnowledge =
        transaction
            ?.eventKnowledge;
    if (!eventKnowledge?.eventId) {
        return worldState;
    }
    const next =
        structuredClone(
            worldState,
        );
    next.eventKnowledge =
        reduceEventKnowledge(
            next,
            eventKnowledge,
        );
    const canonicalEvent =
        next.eventKnowledge
            .find(event =>
                event.eventId ===
                    eventKnowledge
                        .eventId);
    if (!canonicalEvent) {
        return assertActorContextStateV1(
            next,
        );
    }
    if (
        !isPublicWitnessMemoryEvent(
            canonicalEvent,
        )
    ) {
        return assertActorContextStateV1(
            next,
        );
    }
    const witnessIds =
        new Set(
            canonicalEvent
                .witnessActorIds,
        );
    for (const actorId of witnessIds) {
        if (
            !next.actorLibrary
                ?.some(actor =>
                    actor.id === actorId)
        ) {
            continue;
        }
        addActorMemoryRefV1(
            next,
            actorId,
            'everyday',
            {
                recordType: 'event',
                recordId:
                    canonicalEvent
                        .eventId,
                addedClock: clock,
            },
        );
    }
    return assertActorContextStateV1(
        next,
    );
}
