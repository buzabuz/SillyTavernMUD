import {
    applyNpcIdentityObservations,
} from './npc-identity-observation.js';

export const NPC_IDENTITY_OBSERVATION_MIGRATION_VERSION = 1;

function transactionFromMessage(
    message,
) {
    return message
        ?.extra
        ?.hogwartsMud
        ?.turnTransaction ||
        message
            ?.extra
            ?.hogwarts_mud
            ?.turnTransaction ||
        null;
}

function sourceMessageIds(
    transaction,
    assistantIndex,
) {
    const ids =
        transaction
            ?.eventKnowledge
            ?.sourceMessageIds;
    if (
        Array.isArray(ids) &&
        ids.length
    ) {
        return ids;
    }
    return [
        Math.max(
            0,
            assistantIndex - 1,
        ),
        assistantIndex,
    ];
}

export function migrateNpcIdentityObservations(
    worldState,
    chat = [],
) {
    if (
        !worldState ||
        worldState
            .actorContextVersion ===
            1 ||
        Number(
            worldState
                .npcIdentityObservationVersion ||
            0,
        ) >=
            NPC_IDENTITY_OBSERVATION_MIGRATION_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
            diagnostics: {
                observationsReplayed: 0,
            },
        };
    }
    let next =
        structuredClone(
            worldState,
        );
    let observationsReplayed = 0;
    for (
        let index = 0;
        index < chat.length;
        index += 1
    ) {
        const message =
            chat[index];
        const transaction =
            transactionFromMessage(
                message,
            );
        if (!transaction) {
            continue;
        }
        const observations =
            Array.isArray(
                transaction
                    .identityObservations,
            ) &&
            transaction
                .identityObservations
                .length
                ? transaction
                    .identityObservations
                : [];
        if (!observations.length) {
            continue;
        }
        const applied =
            applyNpcIdentityObservations(
                next,
                observations,
                {
                    clock:
                        transaction
                            .committedClock ||
                        next.clock ||
                        '',
                    eventId:
                        transaction
                            .eventKnowledge
                            ?.eventId ||
                        '',
                    sourceMessageIds:
                        sourceMessageIds(
                            transaction,
                            index,
                        ),
                },
            );
        next =
            applied.state;
        observationsReplayed +=
            applied.accepted.length;
    }
    next
        .npcIdentityObservationVersion =
    NPC_IDENTITY_OBSERVATION_MIGRATION_VERSION;
    return {
        state: next,
        changed: true,
        diagnostics: {
            observationsReplayed,
        },
    };
}
