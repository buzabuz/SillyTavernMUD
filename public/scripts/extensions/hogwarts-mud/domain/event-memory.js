import {
    upsertSharedMemory,
} from './actor-memory-migration.js';

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
    const eventKnowledge =
        transaction
            ?.eventKnowledge;
    if (
        !isPublicWitnessMemoryEvent(
            eventKnowledge,
        )
    ) {
        return worldState;
    }
    const witnessIds =
        new Set(
            eventKnowledge
                .witnessActorIds,
        );
    const summaryEn =
        String(
            eventKnowledge
                .summaryEn,
        ).trim();
    const summary =
        String(
            transaction
                ?.publicEvent ||
            summaryEn,
        ).trim();
    const significance =
        eventKnowledge
            .perception
            .salience ===
            'major'
            ? 'notable'
            : 'everyday';
    const next =
        structuredClone(
            worldState,
        );
    next.actorLibrary =
        (
            next.actorLibrary ||
            []
        ).map(profile => {
            if (
                !witnessIds.has(
                    profile.id,
                )
            ) {
                return profile;
            }
            const alreadyRecorded =
                Object.values(
                    profile
                        .sharedMemories ||
                    {},
                )
                    .flat()
                    .some(memory =>
                        memory.eventId ===
                        eventKnowledge
                            .eventId);
            if (alreadyRecorded) {
                return profile;
            }
            return upsertSharedMemory(
                profile,
                {
                    id:
                        `${
                            profile.id
                        }_${
                            eventKnowledge
                                .eventId
                        }_witness`,
                    summaryEn,
                    summary,
                    firstClock:
                        clock,
                    lastClock:
                        clock,
                    createdTurn:
                        turn,
                    updatedTurn:
                        turn,
                    source:
                        'event_witness',
                    significance,
                    lastingImpactEn:
                        '',
                    lastingImpact:
                        '',
                    eventId:
                        eventKnowledge
                            .eventId,
                    sourceMessageIds: [
                        ...(
                            eventKnowledge
                                .sourceMessageIds ||
                            []
                        ),
                    ],
                    witnessBasis:
                        eventKnowledge
                            .witnessBasis
                            ?.[
                                profile.id
                            ] ||
                        'witnessed',
                },
                'everyday',
            );
        });
    return next;
}
