import {
    ACTOR_EVENT_KNOWLEDGE_KIND_VALUES,
    ACTOR_EVENT_KNOWLEDGE_SCHEMA_VERSION,
    ACTOR_PRESENT_COMPATIBILITY,
    ATTRIBUTION_VALUES,
    AUDIBLE_SCOPE_VALUES,
    COHORT_CONTRACT_KEYS,
    COHORT_SCHEMA_VERSION,
    COHORT_SOURCE_VALUES,
    CONCEALMENT_VALUES,
    EVENT_KNOWLEDGE_CONTRACT_KEYS,
    EVENT_KNOWLEDGE_KIND_VALUES,
    EVENT_KNOWLEDGE_OBSERVED_KEYS,
    EVENT_KNOWLEDGE_REPORTED_KEYS,
    EVENT_KNOWLEDGE_SCHEMA_VERSION,
    EVENT_KNOWLEDGE_SOURCE_VALUES,
    LOCAL_PRESENCE_CONTRACT_KEYS,
    LOCAL_PRESENCE_SCHEMA_VERSION,
    LOCAL_PRESENCE_SOURCE_VALUES,
    PERCEPTION_CONTRACT_KEYS,
    PERCEPTION_SCHEMA_VERSION,
    PERCEPTION_SOURCE_VALUES,
    PRESENCE_WITNESS_SCHEMA_VERSION,
    REPORTED_EVENT_CONTRACT_KEYS,
    REPORTED_EVENT_STATEMENT_KIND_VALUES,
    SALIENCE_VALUES,
    SOURCE_SEGMENT_REF_CONTRACT_KEYS,
    VISUAL_SCOPE_VALUES,
    WITNESS_BASIS_VALUES,
    WITNESS_RESOLUTION_CONTRACT_KEYS,
    WITNESS_RESOLUTION_SCHEMA_VERSION,
} from './domain/presence-witness-schema.js';
import {
    projectActorEventKnowledge,
} from './domain/actor-event-knowledge.js';
import {
    createReportedEventKnowledgeId,
    getEventKnowledgeSourceMessageIds,
    normalizeReportedEvent,
} from './domain/reported-event-contract.js';
import {
    createEventKnowledgeId,
    createStableContractId,
    normalizeStableContractId,
} from './domain/stable-contract-id.js';

export {
    ACTOR_EVENT_KNOWLEDGE_KIND_VALUES,
    ACTOR_EVENT_KNOWLEDGE_SCHEMA_VERSION,
    ACTOR_PRESENT_COMPATIBILITY,
    ATTRIBUTION_VALUES,
    AUDIBLE_SCOPE_VALUES,
    COHORT_CONTRACT_KEYS,
    COHORT_SCHEMA_VERSION,
    COHORT_SOURCE_VALUES,
    CONCEALMENT_VALUES,
    EVENT_KNOWLEDGE_CONTRACT_KEYS,
    EVENT_KNOWLEDGE_KIND_VALUES,
    EVENT_KNOWLEDGE_OBSERVED_KEYS,
    EVENT_KNOWLEDGE_REPORTED_KEYS,
    EVENT_KNOWLEDGE_SCHEMA_VERSION,
    EVENT_KNOWLEDGE_SOURCE_VALUES,
    LOCAL_PRESENCE_CONTRACT_KEYS,
    LOCAL_PRESENCE_SCHEMA_VERSION,
    LOCAL_PRESENCE_SOURCE_VALUES,
    PERCEPTION_CONTRACT_KEYS,
    PERCEPTION_SCHEMA_VERSION,
    PERCEPTION_SOURCE_VALUES,
    PRESENCE_WITNESS_SCHEMA_VERSION,
    REPORTED_EVENT_CONTRACT_KEYS,
    REPORTED_EVENT_STATEMENT_KIND_VALUES,
    SALIENCE_VALUES,
    SOURCE_SEGMENT_REF_CONTRACT_KEYS,
    VISUAL_SCOPE_VALUES,
    WITNESS_BASIS_VALUES,
    WITNESS_RESOLUTION_CONTRACT_KEYS,
    WITNESS_RESOLUTION_SCHEMA_VERSION,
};
export {
    createEventKnowledgeId,
    createReportedEventKnowledgeId,
    createStableContractId,
    getEventKnowledgeSourceMessageIds,
    projectActorEventKnowledge,
};

const UNAVAILABLE_LIFE_STATUSES =
    new Set([
        'dead',
        'missing',
    ]);

function stableCompare(left, right) {
    const a = String(left);
    const b = String(right);
    return a < b
        ? -1
        : a > b
            ? 1
            : 0;
}

function normalizeId(value) {
    return normalizeStableContractId(
        value,
    );
}

function buildActorIndex(actors = []) {
    return new Map(
        (Array.isArray(actors)
            ? actors
            : [])
            .map(actor => [
                normalizeId(actor?.id),
                actor,
            ])
            .filter(([id]) => id),
    );
}

function buildAllowedIdSet(
    actors,
    knownActorIds,
) {
    const allowed = new Set([
        ...buildActorIndex(actors).keys(),
        ...(Array.isArray(knownActorIds)
            ? knownActorIds
            : []),
    ]);
    allowed.delete('');
    return allowed;
}

function isAvailableActor(actor) {
    return !actor ||
        !UNAVAILABLE_LIFE_STATUSES
            .has(actor.lifeStatus);
}

function isActorAtLocation(
    actor,
    mapId,
    roomId,
) {
    if (!actor) {
        return true;
    }
    if (
        actor.mapId &&
        actor.mapId !== mapId
    ) {
        return false;
    }
    if (
        actor.roomId &&
        actor.roomId !== roomId
    ) {
        return false;
    }
    return true;
}

function normalizeIdList(
    values,
    {
        allowedIds,
        actorIndex,
        mapId,
        roomId,
        requireAvailable = false,
        requireLocation = false,
    } = {},
) {
    const normalized = new Set();
    for (
        const value
        of Array.isArray(values)
            ? values
            : []
    ) {
        const id = normalizeId(value);
        const actor = actorIndex?.get(id);
        if (
            !id ||
            (
                allowedIds?.size &&
                !allowedIds.has(id)
            ) ||
            (
                requireAvailable &&
                !isAvailableActor(actor)
            ) ||
            (
                requireLocation &&
                !isActorAtLocation(
                    actor,
                    mapId,
                    roomId,
                )
            )
        ) {
            continue;
        }
        normalized.add(id);
    }
    return [...normalized]
        .sort(stableCompare);
}

export function normalizeActiveInteractionActorIds(
    activeInteractionActorIds,
    {
        actors = [],
        knownActorIds = [],
    } = {},
) {
    const actorIndex =
        buildActorIndex(actors);
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    const hasExplicitIds =
        Array.isArray(
            activeInteractionActorIds,
        );
    const source = hasExplicitIds
        ? activeInteractionActorIds
        : [...actorIndex.values()]
            .filter(actor =>
                actor.present !== false)
            .map(actor => actor.id);
    return normalizeIdList(source, {
        allowedIds,
        actorIndex,
        requireAvailable: true,
    });
}

export function getActiveInteractionActorIds(
    worldState = {},
) {
    return normalizeActiveInteractionActorIds(
        Array.isArray(
            worldState
                .activeInteractionActorIds,
        )
            ? worldState
                .activeInteractionActorIds
            : undefined,
        {
            actors:
                worldState.actors || [],
            knownActorIds: (
                worldState.actorLibrary ||
                []
            ).map(actor => actor.id),
        },
    );
}

export function createDefaultLocalPresence() {
    return {
        version:
            LOCAL_PRESENCE_SCHEMA_VERSION,
        mapId: '',
        roomId: '',
        occupantActorIds: [],
        cohortIds: [],
        updatedTurn: 0,
        source: 'initial',
    };
}

export function normalizeCohort(
    cohort,
    {
        actors = [],
        knownActorIds = [],
    } = {},
) {
    if (
        !cohort ||
        typeof cohort !== 'object' ||
        Array.isArray(cohort)
    ) {
        return null;
    }
    const labelEn =
        String(cohort.labelEn || '').trim();
    const mapId =
        normalizeId(cohort.mapId);
    const roomId =
        normalizeId(cohort.roomId);
    if (
        !labelEn ||
        !mapId ||
        !roomId ||
        !COHORT_SOURCE_VALUES.includes(
            cohort.source,
        )
    ) {
        return null;
    }
    const actorIndex =
        buildActorIndex(actors);
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    const suppliedId =
        normalizeId(cohort.id);
    return {
        version: COHORT_SCHEMA_VERSION,
        id: suppliedId ||
            createStableContractId(
                'cohort',
                {
                    labelEn,
                    mapId,
                    roomId,
                    source: cohort.source,
                },
            ),
        labelEn,
        mapId,
        roomId,
        knownMemberActorIds:
            normalizeIdList(
                cohort
                    .knownMemberActorIds,
                {
                    allowedIds,
                    actorIndex,
                    mapId,
                    roomId,
                    requireAvailable: true,
                    requireLocation: true,
                },
            ),
        source: cohort.source,
    };
}

export function normalizeCohorts(
    cohorts,
    options = {},
) {
    const byId = new Map();
    for (
        const cohort
        of Array.isArray(cohorts)
            ? cohorts
            : []
    ) {
        const normalized =
            normalizeCohort(
                cohort,
                options,
            );
        if (normalized) {
            byId.set(
                normalized.id,
                normalized,
            );
        }
    }
    return [...byId.values()]
        .sort((left, right) =>
            stableCompare(
                left.id,
                right.id,
            ));
}

export function normalizeLocalPresence(
    localPresence,
    {
        actors = [],
        knownActorIds = [],
        cohorts = [],
    } = {},
) {
    const source =
        localPresence &&
        typeof localPresence === 'object' &&
        !Array.isArray(localPresence)
            ? localPresence
            : {};
    const mapId =
        normalizeId(source.mapId);
    const roomId =
        normalizeId(source.roomId);
    const actorIndex =
        buildActorIndex(actors);
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    const normalizedCohorts =
        normalizeCohorts(cohorts, {
            actors,
            knownActorIds,
        });
    const cohortIdsAtLocation =
        new Set(
            normalizedCohorts
                .filter(cohort =>
                    cohort.mapId === mapId &&
                    cohort.roomId === roomId)
                .map(cohort => cohort.id),
        );
    const hasCohortDefinitions =
        Array.isArray(cohorts) &&
        cohorts.length > 0;
    return {
        version:
            LOCAL_PRESENCE_SCHEMA_VERSION,
        mapId,
        roomId,
        occupantActorIds:
            mapId && roomId
                ? normalizeIdList(
                    source
                        .occupantActorIds,
                    {
                        allowedIds,
                        actorIndex,
                        mapId,
                        roomId,
                        requireAvailable:
                            true,
                        requireLocation:
                            true,
                    },
                )
                : [],
        cohortIds:
            mapId && roomId
                ? normalizeIdList(
                    source.cohortIds,
                ).filter(id =>
                    !hasCohortDefinitions ||
                    cohortIdsAtLocation
                        .has(id))
                : [],
        updatedTurn: Math.max(
            0,
            Number.parseInt(
                source.updatedTurn,
                10,
            ) || 0,
        ),
        source:
            LOCAL_PRESENCE_SOURCE_VALUES
                .includes(source.source)
                ? source.source
                : 'initial',
    };
}

function hasOnlyAllowedKeys(value, allowedKeys) {
    return Object.keys(value).every(key =>
        allowedKeys.includes(key));
}

function hasExactKeys(value, expectedKeys) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === expectedKeys.length &&
        Object.keys(value).every(key =>
            expectedKeys.includes(key)),
    );
}
function validationResult(value, valid, message) {
    return {
        valid,
        errors: valid ? [] : [message],
        value: valid ? value : null,
    };
}

export function validateCohortContract(
    cohort,
    options = {},
) {
    const normalized =
        normalizeCohort(cohort, options);
    return validationResult(
        normalized,
        Boolean(normalized) &&
            hasOnlyAllowedKeys(
                cohort,
                COHORT_CONTRACT_KEYS,
            ),
        'Cohort contract is invalid.',
    );
}

export function validateLocalPresenceContract(
    localPresence,
    options = {},
) {
    const normalized =
        normalizeLocalPresence(
            localPresence,
            options,
        );
    const validInput =
        localPresence &&
        typeof localPresence === 'object' &&
        !Array.isArray(localPresence);
    return validationResult(
        normalized,
        Boolean(validInput) &&
            hasOnlyAllowedKeys(
                localPresence,
                LOCAL_PRESENCE_CONTRACT_KEYS,
            ),
        'Local presence contract is invalid.',
    );
}

export function normalizePerception(
    perception,
    {
        actors = [],
        knownActorIds = [],
        sourceTexts = [],
    } = {},
) {
    if (
        !perception ||
        typeof perception !== 'object' ||
        Array.isArray(perception)
    ) {
        return null;
    }
    const confidence =
        Number(perception.confidence);
    const evidenceText =
        String(
            perception.evidenceText || '',
        );
    const evidenceIsGrounded =
        !sourceTexts.length ||
        sourceTexts.some(text =>
            String(text)
                .includes(evidenceText));
    if (
        !VISUAL_SCOPE_VALUES.includes(
            perception.visualScope,
        ) ||
        !AUDIBLE_SCOPE_VALUES.includes(
            perception.audibleScope,
        ) ||
        !SALIENCE_VALUES.includes(
            perception.salience,
        ) ||
        !ATTRIBUTION_VALUES.includes(
            perception.attribution,
        ) ||
        !CONCEALMENT_VALUES.includes(
            perception.concealment,
        ) ||
        !evidenceText ||
        !evidenceIsGrounded ||
        !Number.isFinite(confidence) ||
        confidence < 0 ||
        confidence > 1
    ) {
        return null;
    }
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    return {
        version:
            PERCEPTION_SCHEMA_VERSION,
        visualScope:
            perception.visualScope,
        audibleScope:
            perception.audibleScope,
        salience: perception.salience,
        attribution:
            perception.attribution,
        concealment:
            perception.concealment,
        directParticipantActorIds:
            normalizeIdList(
                perception
                    .directParticipantActorIds,
                { allowedIds },
            ),
        evidenceText,
        confidence,
        source:
            PERCEPTION_SOURCE_VALUES
                .includes(perception.source)
                ? perception.source
                : 'post_turn_observer',
    };
}

export function validatePerceptionContract(
    perception,
    options = {},
) {
    const normalized =
        normalizePerception(
            perception,
            options,
        );
    const suppliedParticipantIds =
        normalizeIdList(
            perception
                ?.directParticipantActorIds,
        );
    const valid = Boolean(normalized) &&
        JSON.stringify(
            suppliedParticipantIds,
        ) ===
            JSON.stringify(
                normalized
                    ?.directParticipantActorIds,
            ) &&
        hasOnlyAllowedKeys(
            perception,
            PERCEPTION_CONTRACT_KEYS,
        );
    return validationResult(
        normalized,
        valid,
        'Perception contract is invalid.',
    );
}

export function normalizeWitnessResolution(
    resolution,
    {
        actors = [],
        knownActorIds = [],
        cohortIds = [],
    } = {},
) {
    if (
        !resolution ||
        typeof resolution !== 'object' ||
        Array.isArray(resolution)
    ) {
        return null;
    }
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    const participantActorIds =
        normalizeIdList(
            resolution
                .participantActorIds,
            { allowedIds },
        );
    const witnessActorIds =
        normalizeIdList([
            ...(
                resolution
                    .witnessActorIds ||
                []
            ),
            ...participantActorIds,
        ], { allowedIds });
    const allowedCohortIds =
        new Set(
            normalizeIdList(cohortIds),
        );
    const witnessCohortIds =
        normalizeIdList(
            resolution
                .witnessCohortIds,
        ).filter(id =>
            !allowedCohortIds.size ||
            allowedCohortIds.has(id));
    const suppliedBasis =
        resolution.witnessBasis &&
        typeof resolution
            .witnessBasis === 'object' &&
        !Array.isArray(
            resolution.witnessBasis,
        )
            ? resolution.witnessBasis
            : {};
    const participantSet =
        new Set(participantActorIds);
    const witnessBasis = {};
    for (
        const actorId
        of witnessActorIds
    ) {
        const basis =
            participantSet.has(actorId)
                ? 'direct'
                : suppliedBasis[actorId];
        if (
            !WITNESS_BASIS_VALUES.includes(
                basis,
            )
        ) {
            return null;
        }
        witnessBasis[actorId] = basis;
    }
    return {
        version:
            WITNESS_RESOLUTION_SCHEMA_VERSION,
        participantActorIds,
        witnessActorIds,
        witnessCohortIds,
        witnessBasis,
    };
}

export function validateWitnessResolutionContract(
    resolution,
    options = {},
) {
    const normalized =
        normalizeWitnessResolution(
            resolution,
            options,
        );
    return validationResult(
        normalized,
        Boolean(normalized) &&
            hasOnlyAllowedKeys(
                resolution,
                WITNESS_RESOLUTION_CONTRACT_KEYS,
            ),
        'Witness resolution contract is invalid.',
    );
}

function normalizeMessageIds(values) {
    const normalized = [];
    const seen = new Set();
    for (
        const value
        of Array.isArray(values)
            ? values
            : []
    ) {
        if (
            Number.isSafeInteger(value) &&
            value >= 0
        ) {
            const key = `n:${value}`;
            if (!seen.has(key)) {
                seen.add(key);
                normalized.push(value);
            }
            continue;
        }
        const text =
            String(value || '').trim();
        const key = `s:${text}`;
        if (text && !seen.has(key)) {
            seen.add(key);
            normalized.push(text);
        }
    }
    return normalized.sort((left, right) => {
        if (
            typeof left === 'number' &&
            typeof right === 'number'
        ) {
            return left - right;
        }
        if (typeof left === 'number') {
            return -1;
        }
        if (typeof right === 'number') {
            return 1;
        }
        return stableCompare(left, right);
    });
}

export function normalizeEventKnowledge(
    eventKnowledge,
    options = {},
) {
    if (
        !eventKnowledge ||
        typeof eventKnowledge !==
            'object' ||
        Array.isArray(eventKnowledge)
    ) {
        return null;
    }
    if (
        eventKnowledge.eventKind ===
            'reported'
    ) {
        return normalizeReportedEvent(
            eventKnowledge,
            options,
        );
    }
    if (
        eventKnowledge.eventKind !==
            'observed'
    ) {
        return null;
    }
    const sceneId =
        normalizeId(
            eventKnowledge.sceneId,
        );
    const clock =
        String(
            eventKnowledge.clock || '',
        ).trim();
    const sourceMessageIds =
        normalizeMessageIds(
            eventKnowledge
                .sourceMessageIds,
        );
    const summaryEn =
        String(
            eventKnowledge.summaryEn ||
            '',
        ).trim();
    const perception =
        normalizePerception(
            eventKnowledge.perception,
            options,
        );
    const resolution =
        normalizeWitnessResolution(
            eventKnowledge,
            options,
        );
    if (
        !sceneId ||
        !clock ||
        !sourceMessageIds.length ||
        !summaryEn ||
        !perception ||
        !resolution ||
        !EVENT_KNOWLEDGE_SOURCE_VALUES
            .includes(
                eventKnowledge.source,
            )
        ||
        JSON.stringify(
            perception
                .directParticipantActorIds,
        ) !==
        JSON.stringify(
            resolution
                .participantActorIds,
        )
    ) {
        return null;
    }
    return {
        version:
            EVENT_KNOWLEDGE_SCHEMA_VERSION,
        eventKind: 'observed',
        eventId:
            normalizeId(
                eventKnowledge.eventId,
            ) ||
            createEventKnowledgeId({
                sceneId,
                sourceMessageIds,
            }),
        sceneId,
        clock,
        sourceMessageIds,
        summaryEn,
        activationSchemaIds:
            normalizeIdList(
                eventKnowledge
                    .activationSchemaIds,
            ).slice(0, 64),
        participantActorIds:
            resolution
                .participantActorIds,
        witnessActorIds:
            resolution.witnessActorIds,
        witnessCohortIds:
            resolution.witnessCohortIds,
        witnessBasis:
            resolution.witnessBasis,
        perception,
        knownToPlayer: false,
        source: eventKnowledge.source,
    };
}

export function validateEventKnowledgeContract(
    eventKnowledge,
    options = {},
) {
    const normalized =
        normalizeEventKnowledge(
            eventKnowledge,
            options,
        );
    const perceptionValidation =
        eventKnowledge?.eventKind ===
            'observed'
            ? validatePerceptionContract(
                eventKnowledge
                    ?.perception,
                options,
            )
            : {
                valid: true,
            };
    const allowedKeys =
        eventKnowledge?.eventKind ===
            'observed'
            ? EVENT_KNOWLEDGE_OBSERVED_KEYS
            : EVENT_KNOWLEDGE_REPORTED_KEYS;
    const reportKeysValid =
        eventKnowledge?.eventKind !==
            'reported' ||
        (
            hasExactKeys(
                eventKnowledge.report,
                REPORTED_EVENT_CONTRACT_KEYS,
            ) &&
            (
                eventKnowledge.report
                    ?.sourceSegmentRefs ||
                []
            ).every(reference =>
                hasExactKeys(
                    reference,
                    SOURCE_SEGMENT_REF_CONTRACT_KEYS,
                ))
        );
    const valid = Boolean(normalized) &&
        eventKnowledge?.version ===
            EVENT_KNOWLEDGE_SCHEMA_VERSION &&
        EVENT_KNOWLEDGE_KIND_VALUES
            .includes(
                eventKnowledge
                    ?.eventKind,
            ) &&
        perceptionValidation.valid &&
        hasExactKeys(
            eventKnowledge,
            allowedKeys,
        ) &&
        reportKeysValid;
    return validationResult(
        normalized,
        valid,
        'Event knowledge contract is invalid.',
    );
}

export function projectSceneArchivePresence(
    worldState = {},
    {
        sceneId =
        worldState.scene?.id ||
            '',
        messageIds = [],
    } = {},
) {
    const actors =
        worldState.actors || [];
    const knownActorIds = (
        worldState.actorLibrary ||
        []
    ).map(actor => actor.id);
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    const activeInteractionActorIds =
        getActiveInteractionActorIds(
            worldState,
        );
    const localOccupantActorIds =
        normalizeIdList(
            worldState.localPresence
                ?.occupantActorIds,
            { allowedIds },
        );
    const localCohortIds =
        normalizeIdList(
            worldState.localPresence
                ?.cohortIds,
        );
    const sourceMessageIds =
        new Set(
            normalizeMessageIds(
                messageIds,
            ),
        );
    const events = (
        worldState.eventKnowledge ||
        []
    )
        .filter(event =>
            event?.sceneId ===
                sceneId &&
            (
                !sourceMessageIds.size ||
                (
                    getEventKnowledgeSourceMessageIds(
                        event,
                    )
                ).some(messageId =>
                    sourceMessageIds
                        .has(messageId))
            ))
        .map(event =>
            structuredClone(event))
        .sort((left, right) =>
            stableCompare(
                left.eventId,
                right.eventId,
            ));
    return {
        activeInteractionActorIds,
        localOccupantActorIds,
        localCohortIds,
        events,
        actorIds: [
            ...activeInteractionActorIds,
        ],
    };
}

export function reduceLocalPresence(
    worldState = {},
    {
        actorUpdates = [],
        mapId =
        worldState.map
            ?.activeMapId ||
            worldState.scene?.mapId ||
            '',
        roomId =
        worldState.map
            ?.currentLocalNodeId ||
            worldState.scene?.roomId ||
            '',
        updatedTurn =
        Number(
            worldState.turn?.count ||
            0,
        ) + 1,
    } = {},
) {
    const actors =
        Array.isArray(worldState.actors)
            ? worldState.actors
            : [];
    const updatesById =
        new Map(
            (
                Array.isArray(actorUpdates)
                    ? actorUpdates
                    : []
            ).map(update => [
                normalizeId(update?.id),
                update,
            ]),
        );
    const projectedActors =
        actors.map(actor => {
            const update =
                updatesById.get(
                    actor.id,
                );
            return update
                ? {
                    ...actor,
                    mapId:
                        update.mapId ||
                        actor.mapId,
                    roomId:
                        update.roomId ||
                        actor.roomId,
                }
                : actor;
        });
    const previous =
        worldState.localPresence ||
        createDefaultLocalPresence();
    const sameLocation =
        previous.mapId === mapId &&
        previous.roomId === roomId;
    const occupants =
        new Set(
            sameLocation
                ? previous
                    .occupantActorIds ||
                    []
                : [],
        );
    for (const actor of projectedActors) {
        if (
            isAvailableActor(actor) &&
            actor.mapId === mapId &&
            actor.roomId === roomId
        ) {
            occupants.add(actor.id);
        } else {
            occupants.delete(actor.id);
        }
    }
    const cohorts =
        normalizeCohorts(
            worldState.cohorts,
            {
                actors:
                    projectedActors,
                knownActorIds: (
                    worldState
                        .actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
            },
        );
    const cohortIds =
        cohorts
            .filter(cohort =>
                cohort.mapId ===
                    mapId &&
                cohort.roomId ===
                    roomId)
            .map(cohort =>
                cohort.id);
    const hasMovement =
        [...updatesById.values()]
            .some(update =>
                update?.mapId ||
                update?.roomId);
    return normalizeLocalPresence({
        version:
            LOCAL_PRESENCE_SCHEMA_VERSION,
        mapId,
        roomId,
        occupantActorIds:
            [...occupants],
        cohortIds,
        updatedTurn,
        source: hasMovement
            ? 'movement'
            : cohortIds.length
                ? 'cohort_roster'
                : 'actor_position',
    }, {
        actors: projectedActors,
        knownActorIds: (
            worldState.actorLibrary ||
            []
        ).map(actor =>
            actor.id),
        cohorts,
    });
}

function findFallbackEvidence(
    sourceTexts,
    preferredPattern,
) {
    const sources =
        (Array.isArray(sourceTexts)
            ? sourceTexts
            : [])
            .map(text =>
                String(text || ''))
            .filter(text =>
                text.trim());
    for (const source of sources) {
        const clauses =
            source.match(
                /[^.!?\n。！？]+(?:[.!?。！？]+|$)/gu,
            ) || [source];
        const preferred =
            clauses.find(clause =>
                preferredPattern
                    ?.test(clause));
        const selected =
            preferred ||
            clauses.find(clause =>
                clause.trim());
        if (selected) {
            return selected
                .trim()
                .slice(0, 500);
        }
    }
    return 'The turn produced an observable event.';
}

export function createDeterministicPerceptionFallback(
    {
        playerAction = '',
        narrativeText = '',
        narrativeSegments = [],
        playerTurnSequence = [],
        spellCasts = [],
        checkResolution = null,
        targetActorIds = [],
        actors = [],
        knownActorIds = [],
    } = {},
) {
    const sourceTexts = [
        ...(
            Array.isArray(
                narrativeSegments,
            )
                ? narrativeSegments
                    .map(segment =>
                        segment?.textEn)
                : []
        ),
        narrativeText,
        playerAction,
    ].filter(Boolean);
    const combined =
        sourceTexts.join('\n');
    const privatePattern =
        /(?:\bwhisper(?:ed|s|ing)?\b|\bpassed? (?:a )?(?:note|paper)\b|\bnote\b|\bsecretly\b|\bquietly\b|耳语|低声|悄声|纸条|传纸|偷偷|悄悄)/iu;
    const publicPattern =
        /(?:\b(?:shout|yell|scream|explosion|explode|blast|crash|alarm|announce|levitat|injur|damage|fire)\w*\b|\bsuccessfully demonstrat(?:e|ed|es|ing)\b|\b(?:a|one|\d+) points? to (?:gryffindor|slytherin|ravenclaw|hufflepuff)\b|\b(?:very promising start|well done|excellent work)\b|喊|大叫|尖叫|爆炸|轰鸣|撞击|宣布|公告|悬浮|受伤|伤害|起火|成功示范|(?:格兰芬多|斯莱特林|拉文克劳|赫奇帕奇).{0,12}加[一二三四五六七八九十\d]+分|表现很好|做得好)/iu;
    const notePattern =
        /(?:\b(?:note|paper)\b|纸条|传纸)/iu;
    const whisperPattern =
        /(?:\bwhisper\w*\b|耳语|低声|悄声)/iu;
    const sequence =
        Array.isArray(
            playerTurnSequence,
        )
            ? playerTurnSequence
            : [];
    const hasBroadcast =
        sequence.some(entry =>
            entry?.type ===
                'broadcast_speech');
    const hasDirectSpeech =
        sequence.some(entry =>
            entry?.type ===
                'direct_speech');
    const hasSpell =
        Array.isArray(spellCasts) &&
        spellCasts.length > 0;
    const attemptedConcealment =
        privatePattern.test(
            String(playerAction),
        );
    const successfulCheck =
        [
            'success_with_cost',
            'success',
            'critical_success',
        ].includes(
            checkResolution?.outcome,
        );
    const failedCheck =
        [
            'critical_failure',
            'failure',
        ].includes(
            checkResolution?.outcome,
        );
    const isNote =
        notePattern.test(combined);
    const isWhisper =
        whisperPattern.test(combined);
    const explicitPublicResult =
        hasBroadcast ||
        publicPattern.test(
            String(
                narrativeText ||
                '',
            ),
        ) ||
        /(?:\beveryone heard\b|\bthe whole room\b|全班|所有人都听)/iu
            .test(
                String(
                    narrativeText ||
                    '',
                ),
            );
    const privateSuccess =
        attemptedConcealment &&
        !failedCheck &&
        !explicitPublicResult &&
        (
            successfulCheck ||
            isNote ||
            isWhisper
        );
    const publicResult =
        explicitPublicResult ||
        hasSpell ||
        publicPattern.test(combined);
    let visualScope = 'nearby';
    let audibleScope = 'nearby';
    if (privateSuccess) {
        visualScope = isWhisper &&
            !isNote
            ? 'none'
            : 'target';
        audibleScope = isNote &&
            !isWhisper
            ? 'none'
            : 'target';
    } else if (
        hasBroadcast ||
        publicResult
    ) {
        visualScope = 'room';
        audibleScope = 'room';
    } else if (hasDirectSpeech) {
        visualScope = 'none';
        audibleScope = 'target';
    }
    const participants =
        normalizeIdList([
            ...targetActorIds,
            checkResolution
                ?.target
                ?.actorId,
        ], {
            allowedIds:
                buildAllowedIdSet(
                    actors,
                    knownActorIds,
                ),
        });
    const evidenceText =
        findFallbackEvidence(
            sourceTexts,
            publicResult
                ? publicPattern
                : privatePattern,
        );
    return normalizePerception({
        version:
            PERCEPTION_SCHEMA_VERSION,
        visualScope,
        audibleScope,
        salience: publicResult
            ? hasSpell ||
                /(?:explosion|blast|爆炸|轰鸣)/iu
                    .test(combined)
                ? 'major'
                : 'notable'
            : privateSuccess
                ? 'subtle'
                : 'normal',
        attribution:
            participants.length ||
            hasSpell ||
            hasDirectSpeech ||
            hasBroadcast
                ? 'clear'
                : 'unknown',
        concealment:
            attemptedConcealment
                ? privateSuccess
                    ? 'successful'
                    : 'attempted'
                : 'none',
        directParticipantActorIds:
            participants,
        evidenceText,
        confidence: 0.65,
        source:
            'deterministic_fallback',
    }, {
        actors,
        knownActorIds,
        sourceTexts: [
            ...sourceTexts,
            evidenceText,
        ],
    });
}

function addWitnessChannel(
    channelsByActor,
    actorId,
    channel,
    basisScope,
) {
    if (!actorId) {
        return;
    }
    const current =
        channelsByActor.get(actorId) ||
        {
            visual: false,
            audible: false,
            visualBasis: '',
            audibleBasis: '',
        };
    current[channel] = true;
    current[
        `${channel}Basis`
    ] = basisScope;
    channelsByActor.set(
        actorId,
        current,
    );
}

function getWitnessBasis(channels) {
    const visual =
        channels.visualBasis;
    const audible =
        channels.audibleBasis;
    if (visual && audible) {
        if (visual === 'area') {
            return 'area_visual';
        }
        if (audible === 'adjacent') {
            return 'adjacent_audible';
        }
        if (
            visual === audible &&
            [
                'target',
                'nearby',
                'room',
            ].includes(visual)
        ) {
            return `${visual}_visual_audible`;
        }
        if (
            visual === 'room' ||
            audible === 'room'
        ) {
            return 'room_visual_audible';
        }
        if (
            visual === 'target' ||
            audible === 'target'
        ) {
            return 'target_visual_audible';
        }
        return 'nearby_visual_audible';
    }
    if (visual) {
        return visual === 'area'
            ? 'area_visual'
            : `${visual}_visual`;
    }
    return audible === 'adjacent'
        ? 'adjacent_audible'
        : `${audible}_audible`;
}

export function resolveEventWitnesses(
    {
        perception,
        localPresence,
        activeInteractionActorIds = [],
        targetActorIds = [],
        nearbyActorIds = [],
        actors = [],
        knownActorIds = [],
        spatialGraph = {},
    } = {},
) {
    const normalizedPerception =
        normalizePerception(
            perception,
            {
                actors,
                knownActorIds,
                sourceTexts: [
                    perception
                        ?.evidenceText,
                ],
            },
        );
    if (!normalizedPerception) {
        return null;
    }
    const allowedIds =
        buildAllowedIdSet(
            actors,
            knownActorIds,
        );
    const participantActorIds =
        normalizeIdList(
            normalizedPerception
                .directParticipantActorIds,
            { allowedIds },
        );
    const occupantIds =
        new Set(
            normalizeIdList(
                localPresence
                    ?.occupantActorIds,
                { allowedIds },
            ),
        );
    const targetIds =
        normalizeIdList(
            targetActorIds,
            { allowedIds },
        );
    const nearbyIds =
        normalizeIdList([
            ...activeInteractionActorIds,
            ...nearbyActorIds,
        ], { allowedIds })
            .filter(actorId =>
                occupantIds
                    .has(actorId));
    const channelsByActor =
        new Map();
    const addScope = (
        scope,
        channel,
    ) => {
        if (scope === 'none') {
            return;
        }
        if (scope === 'target') {
            for (const actorId of targetIds) {
                addWitnessChannel(
                    channelsByActor,
                    actorId,
                    channel,
                    'target',
                );
            }
            return;
        }
        if (scope === 'nearby') {
            for (const actorId of nearbyIds) {
                addWitnessChannel(
                    channelsByActor,
                    actorId,
                    channel,
                    'nearby',
                );
            }
            return;
        }
        for (const actorId of occupantIds) {
            addWitnessChannel(
                channelsByActor,
                actorId,
                channel,
                'room',
            );
        }
        if (
            scope !== 'area' &&
            scope !== 'adjacent'
        ) {
            return;
        }
        const currentRoomId =
            spatialGraph
                .currentRoomId ||
            localPresence?.roomId ||
            '';
        const adjacentRoomIds =
            new Set();
        for (
            const exit
            of Array.isArray(
                spatialGraph.exits,
            )
                ? spatialGraph.exits
                : []
        ) {
            if (
                exit.from ===
                    currentRoomId
            ) {
                adjacentRoomIds.add(
                    exit.to,
                );
            }
            if (
                exit.to ===
                    currentRoomId
            ) {
                adjacentRoomIds.add(
                    exit.from,
                );
            }
        }
        for (const actor of actors) {
            if (
                actor.mapId ===
                    localPresence
                        ?.mapId &&
                adjacentRoomIds.has(
                    actor.roomId,
                ) &&
                isAvailableActor(actor)
            ) {
                addWitnessChannel(
                    channelsByActor,
                    actor.id,
                    channel,
                    scope,
                );
            }
        }
    };
    if (
        normalizedPerception
            .concealment !==
        'successful'
    ) {
        addScope(
            normalizedPerception
                .visualScope,
            'visual',
        );
        addScope(
            normalizedPerception
                .audibleScope,
            'audible',
        );
    }
    for (
        const actorId
        of participantActorIds
    ) {
        channelsByActor.delete(
            actorId,
        );
    }
    const witnessBasis = {};
    for (
        const actorId
        of participantActorIds
    ) {
        witnessBasis[actorId] =
            'direct';
    }
    for (
        const [
            actorId,
            channels,
        ] of [...channelsByActor]
            .sort(([left], [right]) =>
                stableCompare(
                    left,
                    right,
                ))
    ) {
        witnessBasis[actorId] =
            getWitnessBasis(
                channels,
            );
    }
    const roomWide =
        normalizedPerception
            .concealment !==
                'successful' &&
        (
            [
                'room',
                'area',
            ].includes(
                normalizedPerception
                    .visualScope,
            ) ||
            [
                'room',
                'adjacent',
            ].includes(
                normalizedPerception
                    .audibleScope,
            )
        );
    return normalizeWitnessResolution({
        version:
            WITNESS_RESOLUTION_SCHEMA_VERSION,
        participantActorIds,
        witnessActorIds:
            Object.keys(
                witnessBasis,
            ),
        witnessCohortIds:
            roomWide
                ? localPresence
                    ?.cohortIds ||
                    []
                : [],
        witnessBasis,
    }, {
        actors,
        knownActorIds,
        cohortIds:
            localPresence
                ?.cohortIds ||
            [],
    });
}

export function reduceEventKnowledge(
    worldState = {},
    eventKnowledge,
) {
    const normalized =
        normalizeEventKnowledge(
            eventKnowledge,
            {
                actors:
                    worldState.actors ||
                    [],
                knownActorIds: [
                    ...(
                        worldState
                            .actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                ],
                cohortIds: (
                    worldState
                        .cohorts ||
                    []
                ).map(cohort =>
                    cohort.id),
                sourceTexts: [
                    eventKnowledge
                        ?.perception
                        ?.evidenceText,
                ],
            },
        );
    if (!normalized) {
        return Array.isArray(
            worldState.eventKnowledge,
        )
            ? structuredClone(
                worldState
                    .eventKnowledge,
            )
            : [];
    }
    if (
        normalized.eventKind ===
            'reported' &&
        (
            normalized.report
                ?.speakerId ===
                'player' ||
            (
                normalized.report
                    ?.recipientIds ||
                []
            ).includes('player')
        )
    ) {
        normalized.knownToPlayer =
            true;
    }
    const byId =
        new Map(
            (
                worldState
                    .eventKnowledge ||
                []
            ).map(event => [
                event.eventId,
                structuredClone(
                    event,
                ),
            ]),
        );
    const existing =
        byId.get(
            normalized.eventId,
        );
    if (existing) {
        const comparableExisting = {
            ...existing,
            knownToPlayer: false,
        };
        const comparableNext = {
            ...normalized,
            knownToPlayer: false,
        };
        if (
            JSON.stringify(
                comparableExisting,
            ) !==
            JSON.stringify(
                comparableNext,
            )
        ) {
            throw new TypeError(
                `Conflicting Event ${normalized.eventId}.`,
            );
        }
    }
    byId.set(
        normalized.eventId,
        {
            ...(existing || normalized),
            knownToPlayer:
                existing
                    ?.knownToPlayer ===
                    true ||
                normalized
                    .knownToPlayer ===
                    true,
        },
    );
    return [...byId.values()]
        .sort((left, right) =>
            stableCompare(
                left.eventId,
                right.eventId,
            ));
}

const PLAYER_VISIBLE_EVENT_MESSAGE_ROLES =
    new Set([
        'opening_narrative',
        'scene_opening',
        'scene_turn',
    ]);

/**
 * Mark canonical Events visible only after a locally-built player message has
 * been committed. Event/model input cannot set this bit through normalization.
 *
 * @param {object} worldState Canonical world state.
 * @param {object} message Committed player-visible chat message.
 * @param {number} messageId Committed chat row index.
 * @param {string[]} eventIds Canonical Event IDs proven by the local writer.
 * @returns {object} Detached world state.
 */
export function markCommittedMessageEventsKnownToPlayer(
    worldState = {},
    message,
    messageId,
    eventIds = [],
) {
    const mud =
        message?.extra
            ?.hogwartsMud;
    const playerVisible =
        Number.isInteger(
            messageId,
        ) &&
        messageId >= 0 &&
        message?.is_user ===
            false &&
        message?.is_system ===
            false &&
        PLAYER_VISIBLE_EVENT_MESSAGE_ROLES
            .has(mud?.role) &&
        Array.isArray(
            mud?.segments,
        ) &&
        mud.segments.length > 0;
    const allowedEventIds =
        new Set(
            normalizeIdList(
                eventIds,
            ),
        );
    if (
        !playerVisible ||
        !allowedEventIds.size
    ) {
        return structuredClone(
            worldState,
        );
    }
    const next =
        structuredClone(
            worldState,
        );
    next.eventKnowledge =
        (
            next.eventKnowledge ||
            []
        ).map(event => ({
            ...event,
            knownToPlayer:
                event
                    ?.knownToPlayer ===
                    true ||
                (
                    allowedEventIds
                        .has(
                            event?.eventId,
                        ) &&
                    getEventKnowledgeSourceMessageIds(
                        event,
                    ).includes(
                        messageId,
                    )
                ),
        }));
    return next;
}

export function applyPresenceWitnessTransaction(
    worldState = {},
    transaction = {},
) {
    const next =
        structuredClone(
            worldState,
        );
    next.presenceWitnessVersion =
        PRESENCE_WITNESS_SCHEMA_VERSION;
    next.eventKnowledgeVersion =
        EVENT_KNOWLEDGE_SCHEMA_VERSION;
    next.activeInteractionActorIds =
        normalizeActiveInteractionActorIds(
            transaction
                .actorPresence
                ?.presentActorIdsAfterTurn,
            {
                actors:
                    next.actors ||
                    [],
                knownActorIds: (
                    next.actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
            },
        );
    next.localPresence =
        normalizeLocalPresence(
            transaction
                .localPresence ||
            next.localPresence,
            {
                actors:
                    next.actors ||
                    [],
                knownActorIds: (
                    next.actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
                cohorts:
                    next.cohorts ||
                    [],
            },
        );
    if (transaction.eventKnowledge) {
        next.eventKnowledge =
            reduceEventKnowledge(
                next,
                transaction
                    .eventKnowledge,
            );
    }
    return next;
}

export function createDefaultPresenceWitnessState() {
    return {
        presenceWitnessVersion:
            PRESENCE_WITNESS_SCHEMA_VERSION,
        eventKnowledgeVersion:
            EVENT_KNOWLEDGE_SCHEMA_VERSION,
        activeInteractionActorIds: [],
        localPresence:
            createDefaultLocalPresence(),
        cohorts: [],
        eventKnowledge: [],
    };
}
