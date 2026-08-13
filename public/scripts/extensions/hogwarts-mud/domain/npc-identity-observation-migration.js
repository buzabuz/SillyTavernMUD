import {
    applyNpcIdentityObservations,
} from './npc-identity-observation.js';

export const NPC_IDENTITY_OBSERVATION_MIGRATION_VERSION = 1;

const INJURY_INSPECTION_PATTERN =
    /(?:\b(?:inspect|check|examine|look(?:ed|ing)? (?:for|at)).{0,80}\b(?:injur|wound|bruise|burn|damage|hurt)\w*\b|(?:仔细观察|检查).{0,40}(?:伤痕|伤势|受伤|伤口))/iu;
const NO_VISIBLE_INJURY_PATTERN =
    /(?:\b(?:no|without|nonexistent)\s+(?:visible\s+)?(?:spell\s+)?(?:injur|wound|bruise|burn|damage)\w*\b|\b(?:perfectly|visibly)\s+un(?:injured|hurt|harmed)\b|没有(?:发现|看到|观察到)?(?:明显|可见)?(?:伤痕|伤势|伤口|损伤)|未(?:发现|看到|观察到)(?:明显|可见)?(?:伤痕|伤势|伤口|损伤))/iu;

function compactText(
    value,
    maximumLength = 500,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function actorAliases(
    actor,
) {
    return [
        actor.name,
        actor.nameEn,
        ...(actor.aliases ||
            []),
    ]
        .map(value =>
            compactText(
                value,
                160,
            ).toLocaleLowerCase())
        .filter(value =>
            value.length >= 2);
}

function addressedActorIds(
    action,
    actors,
) {
    const labels = [
        ...String(
            action || '',
        ).matchAll(
            /@([^：“:\n]+)/gu,
        ),
    ]
        .map(match =>
            compactText(
                match[1],
                160,
            ).toLocaleLowerCase())
        .filter(Boolean);
    if (!labels.length) {
        return [];
    }
    return [
        ...new Set(
            actors
                .filter(actor => {
                    const aliases =
                        actorAliases(
                            actor,
                        );
                    return labels.some(
                        label =>
                            aliases.some(
                                alias =>
                                    label ===
                                        alias ||
                                    label.includes(
                                        alias,
                                    ) ||
                                    alias.includes(
                                        label,
                                    ),
                            ),
                    );
                })
                .map(actor =>
                    actor.id),
        ),
    ];
}

function findNegativeInjuryEvidence(
    segments,
) {
    for (const segment of (
        segments || []
    )) {
        if (
            segment?.type !==
                'narration'
        ) {
            continue;
        }
        const sentences =
            String(
                segment.textEn ||
                '',
            ).match(
                /[^.!?\n]+(?:[.!?]+|$)/gu,
            ) || [];
        const sentence =
            sentences.find(value =>
                NO_VISIBLE_INJURY_PATTERN
                    .test(value));
        if (sentence) {
            return sentence.trim();
        }
    }
    return '';
}

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

function legacyObservation(
    transaction,
    action,
    actors,
) {
    if (
        !INJURY_INSPECTION_PATTERN
            .test(
                String(
                    action || '',
                ))
    ) {
        return [];
    }
    const actorIds =
        addressedActorIds(
            action,
            actors,
        );
    const evidence =
        findNegativeInjuryEvidence(
            transaction
                ?.segments,
        );
    if (
        actorIds.length !== 1 ||
        !evidence
    ) {
        return [];
    }
    return [{
        version: 1,
        actorId:
            actorIds[0],
        kind:
            'injury_assessment',
        status:
            'no_visible_injury',
        injuryType: '',
        description: '',
        evidenceText:
            evidence,
        confidence: 0.95,
    }];
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
    const actors = [
        ...(
            next.actorLibrary ||
            []
        ),
        ...(
            next.actors ||
            []
        ),
    ];
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
        const previous =
            chat[index - 1];
        const action =
            previous?.is_user
                ? previous.mes
                : '';
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
                : legacyObservation(
                    transaction,
                    action,
                    actors,
                );
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
