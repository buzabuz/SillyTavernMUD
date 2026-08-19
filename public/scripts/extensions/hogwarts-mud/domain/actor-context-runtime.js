import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
    normalizeActorCore,
    normalizeActorRuntime,
} from './actor-context-schema.js';
import {
    projectActorCoreV1,
    projectActorRuntimeV1,
    validateActorContextStateV1,
} from './actor-context-cutover.js';
import {
    normalizeAppraisal,
} from './memory-synapse-schema.js';

const MEMORY_TIERS =
    Object.freeze([
        'core',
        'recent',
        'everyday',
    ]);

function compactText(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0)
        .toString(36)
        .padStart(7, '0');
}

function emptyMemoryEntry() {
    return {
        firstImpressionRef: '',
        core: [],
        recent: [],
        everyday: [],
    };
}

export function isActorContextStateV1(
    state,
) {
    return (
        state?.actorContextVersion ===
            actorContextVersion &&
        state?.memoryReferenceVersion ===
            memoryReferenceVersion &&
        state
            ?.actorDossierProjectionVersion ===
            actorDossierProjectionVersion
    );
}

export function assertActorContextStateV1(
    state,
) {
    const validation =
        validateActorContextStateV1(
            state,
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.errors.join(' '),
        );
    }
    return state;
}

export function ensureActorMemoryEntryV1(
    state,
    actorId,
) {
    state.actorMemoryIndex
        .byActorId[actorId] ??=
        emptyMemoryEntry();
    return state.actorMemoryIndex
        .byActorId[actorId];
}

export function upsertActorV1(
    state,
    {
        actorId,
        coreSource = {},
        runtimeSource = {},
    },
) {
    const existingCore =
        (state.actorLibrary || [])
            .find(actor =>
                actor.id === actorId);
    const existingRuntime =
        (state.actors || [])
            .find(actor =>
                actor.id === actorId);
    const core =
        projectActorCoreV1(
            actorId,
            {
                ...(existingCore || {}),
                ...coreSource,
            },
            runtimeSource,
        );
    const runtime =
        projectActorRuntimeV1(
            actorId,
            core,
            {
                ...(existingRuntime || {}),
                ...runtimeSource,
            },
        );
    state.actorLibrary = [
        ...(state.actorLibrary || [])
            .filter(actor =>
                actor.id !== actorId),
        core,
    ].sort((left, right) =>
        left.id.localeCompare(
            right.id,
            'en',
        ));
    state.actors = [
        ...(state.actors || [])
            .filter(actor =>
                actor.id !== actorId),
        runtime,
    ].sort((left, right) =>
        left.id.localeCompare(
            right.id,
            'en',
        ));
    ensureActorMemoryEntryV1(
        state,
        actorId,
    );
    return {
        core,
        runtime,
    };
}

export function updateActorRuntimeV1(
    state,
    actorId,
    patch,
) {
    const index =
        (state.actors || [])
            .findIndex(actor =>
                actor.id === actorId);
    if (index < 0) {
        throw new TypeError(
            `Unknown Actor Runtime ${actorId}.`,
        );
    }
    const current =
        state.actors[index];
    const lifeKeys = [
        'lifeStatus',
        'lifeStatusPermanent',
        'lifeStatusDetailEn',
        'lifeStatusSinceClock',
    ];
    if (
        lifeKeys.some(key =>
            Object.hasOwn(
                patch,
                key,
            ) &&
            patch[key] !==
                current[key])
    ) {
        throw new TypeError(
            'Actor life state must use updateActorLifeStateV1().',
        );
    }
    state.actors[index] =
        normalizeActorRuntime({
            ...current,
            id: actorId,
            mapId:
                patch.mapId ??
                current.mapId,
            roomId:
                patch.roomId ??
                current.roomId,
            locationKnown:
                patch.locationKnown ??
                current.locationKnown,
            present:
                patch.present ??
                current.present,
            lifeStatus:
                current.lifeStatus,
            lifeStatusPermanent:
                current
                    .lifeStatusPermanent,
            lifeStatusDetailEn:
                current
                    .lifeStatusDetailEn,
            lifeStatusSinceClock:
                current
                    .lifeStatusSinceClock,
            currentActivityEn:
                patch.currentActivityEn ??
                current.currentActivityEn,
            currentIntentEn:
                patch.currentIntentEn ??
                current.currentIntentEn,
            currentGoalEn:
                patch.currentGoalEn ??
                current.currentGoalEn,
            temporary:
                patch.temporary ??
                current.temporary,
        });
    return state.actors[index];
}

export function updateActorLifeStateV1(
    state,
    actorId,
    patch,
    {
        tier = 'medium',
        clock =
        state.clock ||
            'unknown',
    } = {},
) {
    const index =
        (state.actors || [])
            .findIndex(actor =>
                actor.id === actorId);
    if (index < 0) {
        throw new TypeError(
            `Unknown Actor Runtime ${actorId}.`,
        );
    }
    const current =
        state.actors[index];
    const lifeStatus =
        patch.lifeStatus ??
        current.lifeStatus;
    const permanent =
        patch.lifeStatusPermanent ??
        current.lifeStatusPermanent;
    const detailEn =
        compactText(
            patch.lifeStatusDetailEn ??
            current.lifeStatusDetailEn,
        );
    const changed =
        lifeStatus !==
            current.lifeStatus ||
        permanent !==
            current.lifeStatusPermanent;
    if (
        current.lifeStatusPermanent &&
        (
            lifeStatus !==
                current.lifeStatus ||
            permanent !== true
        )
    ) {
        throw new TypeError(
            `Permanent Actor life state ${actorId} cannot be changed.`,
        );
    }
    if (
        changed &&
        (
            lifeStatus === 'dead' ||
            (
                permanent === true &&
                current
                    .lifeStatusPermanent !==
                    true
            )
        ) &&
        tier !== 'high'
    ) {
        throw new TypeError(
            `Only high tier can commit permanent Actor life state ${actorId}.`,
        );
    }
    if (!detailEn) {
        throw new TypeError(
            `Actor life state ${actorId} requires lifeStatusDetailEn.`,
        );
    }
    state.actors[index] =
        normalizeActorRuntime({
            ...current,
            lifeStatus,
            lifeStatusPermanent:
                permanent === true,
            lifeStatusDetailEn:
                detailEn,
            lifeStatusSinceClock:
                changed
                    ? compactText(clock) ||
                        'unknown'
                    : current
                        .lifeStatusSinceClock,
            present:
                [
                    'dead',
                    'missing',
                ].includes(lifeStatus)
                    ? false
                    : patch.present ??
                        current.present,
        });
    return state.actors[index];
}

export function markActorIntroducedV1(
    state,
    actorId,
    {
        clock =
        state.clock ||
            'unknown',
        turn =
        state.turn?.count ??
            null,
    } = {},
) {
    const index =
        (state.actorLibrary || [])
            .findIndex(actor =>
                actor.id === actorId);
    if (index < 0) {
        throw new TypeError(
            `Unknown Actor Core ${actorId}.`,
        );
    }
    const current =
        state.actorLibrary[index];
    if (
        current.cast
            .introducedClock
    ) {
        return current;
    }
    state.actorLibrary[index] =
        normalizeActorCore({
            ...current,
            cast: {
                ...current.cast,
                introducedClock:
                    compactText(clock) ||
                    'unknown',
                introducedTurn:
                    Number.isInteger(turn) &&
                    turn >= 0
                        ? turn
                        : null,
            },
        });
    return state.actorLibrary[index];
}

export function addActorMemoryRefV1(
    state,
    actorId,
    tier,
    {
        recordType,
        recordId,
        addedClock =
        state.clock ||
            'unknown',
    },
) {
    if (!MEMORY_TIERS.includes(tier)) {
        throw new TypeError(
            `Unknown Actor Memory tier ${tier}.`,
        );
    }
    const entry =
        ensureActorMemoryEntryV1(
            state,
            actorId,
        );
    for (const candidate of MEMORY_TIERS) {
        entry[candidate] =
            entry[candidate].filter(
                reference =>
                    !(
                        reference.recordType ===
                            recordType &&
                        reference.recordId ===
                            recordId
                    ),
            );
    }
    entry[tier].push({
        recordType,
        recordId,
        addedClock:
            compactText(addedClock) ||
            'unknown',
    });
    return entry;
}

export function removeActorMemoryRefsV1(
    state,
    actorId,
    recordIds,
) {
    const ids =
        new Set(recordIds || []);
    const entry =
        ensureActorMemoryEntryV1(
            state,
            actorId,
        );
    for (const tier of MEMORY_TIERS) {
        entry[tier] =
            entry[tier].filter(
                reference =>
                    !ids.has(
                        reference.recordId,
                    ),
            );
    }
    if (
        ids.has(
            entry.firstImpressionRef,
        )
    ) {
        entry.firstImpressionRef = '';
    }
    return entry;
}

export function recordActorAppraisalV1(
    state,
    {
        actorId,
        summaryEn,
        kind,
        tier = 'recent',
        clock =
        state.clock ||
            'unknown',
        sceneId =
        state.scene?.id ||
            '',
        sourceEventIds = [],
        sourceMessageIds = [],
        firstImpression = false,
    },
) {
    const summary =
        compactText(summaryEn);
    if (!summary) {
        return '';
    }
    const id =
        `appraisal_${kind}_${stableHash(
            JSON.stringify({
                actorId,
                summary,
                clock,
                sceneId,
                sourceEventIds,
                sourceMessageIds,
            }),
        )}`;
    const appraisal =
        normalizeAppraisal({
            id,
            observerId: actorId,
            targetId: 'player',
            summaryEn: summary,
            sourceEventIds,
            sourceMessageIds,
            sourceRumorIds: [],
            activationSchemaIds: [],
            derivedSchemaIds: [],
            sceneId,
            contextTags: [kind],
            confidence: 0.5,
            status: 'accepted',
            knowledgeSource:
                sourceEventIds.length
                    ? 'witness'
                    : 'mixed',
            committedClock:
                compactText(clock) ||
                'unknown',
            historicalClaimAllowed:
                false,
        });
    const appraisals =
        state.memorySynapse
            .appraisals;
    if (
        !appraisals.some(existing =>
            existing.id === id)
    ) {
        appraisals.push(appraisal);
        appraisals.sort((left, right) =>
            left.id.localeCompare(
                right.id,
                'en',
            ));
    }
    const entry =
        addActorMemoryRefV1(
            state,
            actorId,
            tier,
            {
                recordType:
                    'appraisal',
                recordId: id,
                addedClock:
                    appraisal
                        .committedClock,
            },
        );
    if (firstImpression) {
        entry.firstImpressionRef = id;
    }
    return id;
}

export function removeActorV1(
    state,
    actorId,
) {
    state.actorLibrary =
        (state.actorLibrary || [])
            .filter(actor =>
                actor.id !== actorId);
    state.actors =
        (state.actors || [])
            .filter(actor =>
                actor.id !== actorId);
    delete state.actorMemoryIndex
        .byActorId[actorId];
    return state;
}
