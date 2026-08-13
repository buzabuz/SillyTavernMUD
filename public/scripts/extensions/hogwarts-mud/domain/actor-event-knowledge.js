import {
    ACTOR_EVENT_KNOWLEDGE_SCHEMA_VERSION,
} from './presence-witness-schema.js';
import {
    normalizeStableContractId,
} from './stable-contract-id.js';

function projectKnownEvent(
    event,
    knowledgeKind,
) {
    const projected =
        structuredClone(event);
    if (
        projected?.eventKind ===
            'reported'
    ) {
        delete projected
            .report
            .sourceSegmentRefs;
        delete projected
            .report
            .aboutEventId;
        delete projected
            .report
            .parentReportedEventId;
    }
    return {
        ...projected,
        knowledgeKind,
    };
}

export function projectActorEventKnowledge(
    worldState = {},
    actorId,
) {
    const normalizedActorId =
        normalizeStableContractId(
            actorId,
        );
    const direct = [];
    const witnessed = [];
    const reported = [];
    for (const event of (
        worldState.eventKnowledge ||
        []
    )) {
        if (
            event?.eventKind ===
                'reported'
        ) {
            if (
                event.report
                    ?.speakerId ===
                    normalizedActorId
            ) {
                direct.push(
                    projectKnownEvent(
                        event,
                        'direct',
                    ),
                );
                continue;
            }
            if (
                (
                    event.report
                        ?.recipientIds ||
                    []
                ).includes(
                    normalizedActorId,
                )
            ) {
                reported.push(
                    projectKnownEvent(
                        event,
                        'reported',
                    ),
                );
                continue;
            }
        }
        if (
            (
                event
                    ?.participantActorIds ||
                []
            ).includes(
                normalizedActorId,
            )
        ) {
            direct.push(
                projectKnownEvent(
                    event,
                    'direct',
                ),
            );
            continue;
        }
        if (
            (
                event
                    ?.witnessActorIds ||
                []
            ).includes(
                normalizedActorId,
            )
        ) {
            witnessed.push(
                projectKnownEvent(
                    event,
                    'witnessed',
                ),
            );
        }
    }
    return {
        version:
            ACTOR_EVENT_KNOWLEDGE_SCHEMA_VERSION,
        direct,
        witnessed,
        reported,
    };
}
