import {
    NPC_INJURY_ASSESSMENT_VALUES,
    normalizeNpcIdentity,
} from './npc-identity-schema.js';

export const NPC_IDENTITY_OBSERVATION_VERSION = 1;

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

function compactActorId(value) {
    return compactText(
        value,
        96,
    );
}

function injuryFingerprint(
    value,
) {
    return compactText(
        value,
        500,
    )
        .toLocaleLowerCase()
        .replace(
            /[^\p{L}\p{N}]+/gu,
            '',
        );
}

export function normalizeNpcIdentityObservation(
    source,
) {
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source)
    ) {
        return null;
    }
    const actorId =
        compactActorId(
            source.actorId,
        );
    const kind =
        compactText(
            source.kind,
            80,
        );
    const status =
        compactText(
            source.status,
            80,
        );
    const evidenceText =
        compactText(
            source.evidenceText,
            500,
        );
    const confidence =
        Number(
            source.confidence,
        );
    if (
        !actorId ||
        kind !==
            'injury_assessment' ||
        !NPC_INJURY_ASSESSMENT_VALUES
            .includes(status) ||
        status === 'unknown' ||
        !evidenceText ||
        !Number.isFinite(
            confidence,
        ) ||
        confidence < 0 ||
        confidence > 1
    ) {
        return null;
    }
    const description =
        compactText(
            source.description,
            500,
        );
    if (
        status ===
            'visible_injury' &&
        !description
    ) {
        return null;
    }
    return {
        version:
            NPC_IDENTITY_OBSERVATION_VERSION,
        actorId,
        kind,
        status,
        injuryType:
            compactText(
                source.injuryType,
                80,
            )
                .toLocaleLowerCase()
                .replace(
                    /[^a-z0-9_]+/gu,
                    '_',
                )
                .replace(
                    /^_+|_+$/gu,
                    '',
                ) ||
            'unknown',
        description,
        evidenceText,
        confidence,
    };
}

function observationSourceRef({
    eventId,
    sourceMessageIds,
}) {
    const parts = [];
    const normalizedEventId =
        compactText(
            eventId,
            160,
        );
    if (normalizedEventId) {
        parts.push(
            `event:${normalizedEventId}`,
        );
    }
    const messageIds = [
        ...new Set(
            (
                Array.isArray(
                    sourceMessageIds,
                )
                    ? sourceMessageIds
                    : []
            )
                .map(Number)
                .filter(
                    Number.isInteger,
                ),
        ),
    ].sort(
        (
            left,
            right,
        ) =>
            left - right,
    );
    if (messageIds.length) {
        parts.push(
            `messages:${messageIds.join(',')}`,
        );
    }
    return parts.join('|') ||
        'direct-observation';
}

function appendObservationProvenance(
    identity,
    fieldPaths,
    {
        clock,
        eventId,
        sourceMessageIds,
    },
) {
    const retained = (
        identity.provenance
            .records || []
    );
    const records = [
        ...retained,
        ...fieldPaths.map(
            fieldPath => ({
                fieldPath,
                sourceTier:
                    'direct_observation',
                sourceRef:
                    observationSourceRef({
                        eventId,
                        sourceMessageIds,
                    }),
                effectiveFrom:
                    compactText(
                        clock,
                        80,
                    ),
                effectiveTo: '',
            }),
        ),
    ];
    const staticRecords =
        records.filter(record =>
            record.sourceTier !==
                'direct_observation');
    const observationRecords =
        records.filter(record =>
            record.sourceTier ===
                'direct_observation')
            .slice(-24);
    return {
        ...identity.provenance,
        generatedBy:
            identity.provenance
                .generatedBy ===
                'unknown'
                ? 'npc_identity_observation_reducer'
                : identity.provenance
                    .generatedBy,
        records: [
            ...staticRecords,
            ...observationRecords,
        ],
    };
}

function applyObservationToIdentity(
    source,
    observation,
    options,
) {
    const identity =
        normalizeNpcIdentity(
            source,
        );
    const body = {
        ...identity.body,
        injuryAssessment: {
            status:
                observation.status,
            summary:
                observation.description ||
                observation.evidenceText,
            asOfClock:
                compactText(
                    options.clock,
                    80,
                ),
        },
        asOfClock:
            compactText(
                options.clock,
                80,
            ),
    };
    const fieldPaths = [
        'body.injuryAssessment',
    ];
    if (
        observation.status ===
            'visible_injury'
    ) {
        const fingerprint =
            injuryFingerprint(
                observation.description,
            );
        const existing =
            (
                body.injuries || []
            ).find(injury =>
                injuryFingerprint(
                    injury.description,
                ) ===
                    fingerprint &&
                injury.status !==
                    'resolved');
        if (!existing) {
            body.injuries = [
                ...(
                    body.injuries ||
                    []
                ),
                {
                    type:
                        observation
                            .injuryType,
                    description:
                        observation
                            .description,
                    status: 'active',
                    startedClock:
                        compactText(
                            options.clock,
                            80,
                        ),
                    resolvedClock: '',
                },
            ].slice(-24);
        }
        fieldPaths.push(
            'body.injuries',
        );
    }
    return normalizeNpcIdentity({
        ...identity,
        body,
        provenance:
            appendObservationProvenance(
                identity,
                fieldPaths,
                options,
            ),
    });
}

export function applyNpcIdentityObservations(
    worldState,
    observations,
    {
        clock =
        worldState?.clock ||
        '',
        eventId = '',
        sourceMessageIds = [],
    } = {},
) {
    const accepted = (
        Array.isArray(
            observations,
        )
            ? observations
            : []
    )
        .map(
            normalizeNpcIdentityObservation,
        )
        .filter(observation =>
            observation &&
            observation.confidence >=
                0.7);
    if (!accepted.length) {
        return {
            state: worldState,
            changed: false,
            accepted: [],
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const knownActorIds =
        new Set([
            ...(
                next.actorLibrary ||
                []
            ).map(actor =>
                actor.id),
            ...(
                next.actors ||
                []
            ).map(actor =>
                actor.id),
        ]);
    const latestByActor =
        new Map();
    for (const observation of accepted) {
        if (
            knownActorIds.has(
                observation.actorId,
            )
        ) {
            latestByActor.set(
                observation.actorId,
                observation,
            );
        }
    }
    if (!latestByActor.size) {
        return {
            state: worldState,
            changed: false,
            accepted: [],
        };
    }
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(actor => {
        const observation =
            latestByActor.get(
                actor.id,
            );
        if (!observation) {
            return actor;
        }
        const identity =
            applyObservationToIdentity(
                actor.identity,
                observation,
                {
                    clock,
                    eventId,
                    sourceMessageIds,
                },
            );
        return {
            ...actor,
            identity,
        };
    });
    return {
        state: next,
        changed: true,
        accepted: [
            ...latestByActor.values(),
        ],
    };
}
