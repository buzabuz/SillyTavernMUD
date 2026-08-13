import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
    normalizeActorCore,
    normalizeActorRuntime,
    validateActorCore,
    validateActorMemoryIndex,
    validateActorRuntime,
} from './actor-context-schema.js';
import {
    createDefaultMemorySynapse,
    normalizeAppraisal,
    validateAppraisal,
    validateMemorySynapse,
} from './memory-synapse-schema.js';
import {
    getCanonicalPerformanceCore,
    isPlaceholderSpeechStyle,
} from './actor-core-canon.js';
import {
    sanitizeActorKnowledgeEn,
} from './actor-memory.js';

const MEMORY_TIERS = Object.freeze([
    'core',
    'recent',
    'everyday',
]);

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function text(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

function firstText(...values) {
    return values
        .map(text)
        .find(Boolean) || '';
}

function textList(...values) {
    const result = [];
    const seen = new Set();
    for (const value of values.flat()) {
        const normalized = text(value);
        const key =
            normalized.toLocaleLowerCase();
        if (
            normalized &&
            !seen.has(key)
        ) {
            seen.add(key);
            result.push(normalized);
        }
    }
    return result;
}

function identifier(value) {
    return text(value)
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_.:-]+/gu, '_')
        .replace(/^[_:.-]+|[_:.-]+$/gu, '')
        .slice(0, 128);
}

function hasOwn(
    value,
    key,
) {
    return isRecord(value) &&
        Object.hasOwn(value, key);
}

function duplicateString(
    profile,
    runtime,
    key,
) {
    const profileValue =
        text(profile?.[key]);
    const runtimeValue =
        text(runtime?.[key]);
    if (
        profileValue &&
        runtimeValue &&
        profileValue !== runtimeValue
    ) {
        throw new TypeError(
            `Conflicting Actor lifecycle field ${key}.`,
        );
    }
    return runtimeValue || profileValue;
}

function duplicateInteger(
    profile,
    runtime,
    key,
) {
    const profileValue =
        Number.isInteger(
            profile?.[key],
        )
            ? profile[key]
            : null;
    const runtimeValue =
        Number.isInteger(
            runtime?.[key],
        )
            ? runtime[key]
            : null;
    if (
        profileValue !== null &&
        runtimeValue !== null &&
        profileValue !== runtimeValue
    ) {
        throw new TypeError(
            `Conflicting Actor lifecycle field ${key}.`,
        );
    }
    return runtimeValue ??
        profileValue;
}

function duplicateBoolean(
    profile,
    runtime,
    key,
    fallback = false,
) {
    const profileHas =
        hasOwn(profile, key);
    const runtimeHas =
        hasOwn(runtime, key);
    if (
        profileHas &&
        runtimeHas &&
        Boolean(profile[key]) !==
            Boolean(runtime[key])
    ) {
        throw new TypeError(
            `Conflicting Actor lifecycle field ${key}.`,
        );
    }
    if (runtimeHas) {
        return runtime[key] === true;
    }
    if (profileHas) {
        return profile[key] === true;
    }
    return fallback;
}

function castOrigin(
    profile,
    runtime,
) {
    if (
        isRecord(profile?.cast) &&
        profile.cast.origin
    ) {
        return profile.cast.origin;
    }
    const source =
        duplicateString(
            profile,
            runtime,
            'source',
        );
    const mapping = {
        canon_catalog:
            'canon_catalog',
        preset_location_resident:
            'preset_resident',
        pacing_public_guest:
            'generated_guest',
        scene_temporary_actor:
            'scene_temporary',
    };
    if (source && !mapping[source]) {
        throw new TypeError(
            `Unknown Actor lifecycle source ${source}.`,
        );
    }
    if (
        duplicateBoolean(
            profile,
            runtime,
            'temporary',
        )
    ) {
        return 'scene_temporary';
    }
    return mapping[source] ||
        'foundation';
}

function defaultLifeDetail(
    lifeStatus,
) {
    return {
        alive: 'Alive.',
        injured: 'Injured.',
        incapacitated:
            'Incapacitated.',
        missing: 'Missing.',
        dead: 'Dead.',
    }[lifeStatus] || 'Alive.';
}

function inferredIntroduction(
    state,
    actorId,
    profile,
    runtime,
) {
    const clocks = [
        profile
            ?.introducedClock,
        runtime
            ?.introducedClock,
        profile
            ?.firstImpressionClock,
        runtime
            ?.firstImpressionClock,
        profile
            ?.impressionUpdatedClock,
        runtime
            ?.impressionUpdatedClock,
        ...(state.sceneArchive || [])
            .filter(scene =>
                (
                    scene.actorIds ||
                    []
                ).includes(actorId))
            .flatMap(scene => [
                scene.startedClock,
                scene.endedClock,
            ]),
        ...(state.eventKnowledge || [])
            .filter(event =>
                [
                    ...(
                        event
                            .participantActorIds ||
                        []
                    ),
                    ...(
                        event
                            .witnessActorIds ||
                        []
                    ),
                ].includes(actorId))
            .map(event =>
                event.clock),
        ...(
            state.socialGraph
                ?.relationshipEvidence ||
            []
        )
            .filter(evidence =>
                evidence.sourceActorId ===
                    actorId ||
                evidence.targetActorId ===
                    actorId)
            .map(evidence =>
                evidence.clock),
    ]
        .map(text)
        .filter(Boolean)
        .sort();
    const hasPlayerContact =
        Boolean(
            clocks.length ||
            (
                state.socialGraph
                    ?.relationships ||
                []
            ).some(edge =>
                (
                    edge.sourceActorId ===
                        actorId ||
                    edge.targetActorId ===
                        actorId
                ) &&
                (
                    edge.sourceActorId ===
                        'player' ||
                    edge.targetActorId ===
                        'player' ||
                    edge.knownToPlayer ===
                        true ||
                    edge.playerKnown ===
                        true
                )) ||
            profile
                ?.firstImpressionOfPlayerEn ||
            runtime
                ?.firstImpressionOfPlayerEn ||
            profile
                ?.impressionOfPlayerEn ||
            runtime
                ?.impressionOfPlayerEn ||
            runtime?.present === true,
        );
    const turns = [
        profile?.introducedTurn,
        runtime?.introducedTurn,
        ...(state.sceneArchive || [])
            .filter(scene =>
                (
                    scene.actorIds ||
                    []
                ).includes(actorId))
            .flatMap(scene => [
                scene.startedTurn,
                scene.endedTurn,
            ]),
    ]
        .filter(value =>
            Number.isInteger(value) &&
            value >= 0)
        .sort((left, right) =>
            left - right);
    return {
        introducedClock:
            clocks[0] ||
            (
                hasPlayerContact
                    ? text(state.clock) ||
                        'unknown'
                    : ''
            ),
        introducedTurn:
            turns[0] ??
            (
                hasPlayerContact &&
                Number.isInteger(
                    state.turn?.count,
                )
                    ? state.turn.count
                    : null
            ),
    };
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

function sourceRecordsById(
    records,
    label,
) {
    if (!Array.isArray(records)) {
        throw new TypeError(
            `${label} must be an array.`,
        );
    }
    const result = new Map();
    for (const record of records) {
        if (!isRecord(record)) {
            throw new TypeError(
                `${label} entries must be objects.`,
            );
        }
        const id = identifier(record.id);
        if (
            !id ||
            id !== record.id ||
            result.has(id)
        ) {
            throw new TypeError(
                `${label} contains an invalid or duplicate actor ID.`,
            );
        }
        result.set(id, record);
    }
    return result;
}

function eventRecords(state) {
    if (
        state.eventKnowledge === undefined
    ) {
        return [];
    }
    if (!Array.isArray(
        state.eventKnowledge,
    )) {
        throw new TypeError(
            'eventKnowledge must be an array.',
        );
    }
    return state.eventKnowledge;
}

function eventIdsFromState(state) {
    const ids = new Set();
    for (const event of eventRecords(state)) {
        if (!isRecord(event)) {
            throw new TypeError(
                'eventKnowledge entries must be objects.',
            );
        }
        const eventId = text(event.eventId);
        if (
            !eventId ||
            ids.has(eventId)
        ) {
            throw new TypeError(
                'eventKnowledge contains an invalid or duplicate eventId.',
            );
        }
        ids.add(eventId);
    }
    return ids;
}

function isDirectorGoal(value) {
    const normalized =
        text(value).toLocaleLowerCase();
    return (
        !normalized ||
        /(?:scene|beat|director|canon|committed public)/u
            .test(normalized)
    );
}

export function projectActorCoreV1(
    actorId,
    profile,
    runtime,
) {
    const source =
        profile || runtime;
    const existingCore =
        isRecord(
            source?.performanceCore,
        )
            ? source.performanceCore
            : {};
    const canonicalCore =
        getCanonicalPerformanceCore(
            actorId,
        ) || {};
    const legacyMotive =
        firstText(
            profile?.privateGoalEn,
            runtime?.privateGoalEn,
        );
    const speechStyleEn =
        firstText(
            existingCore.speechStyleEn,
            profile?.speechStyleEn,
            runtime?.speechStyleEn,
        );
    const existingCast =
        isRecord(source?.cast)
            ? source.cast
            : {};
    const canonCatalogId =
        firstText(
            profile?.canonCatalogId,
            runtime?.canonCatalogId,
        );
    const nameEn =
        firstText(
            profile?.nameEn,
            runtime?.nameEn,
            profile?.name,
            runtime?.name,
        );
    const privateKnowledgeEn =
        textList(
            source?.privateFacts
                ?.knowledgeEn ||
                [],
            profile?.knowledgeEn ||
                [],
        );
    return normalizeActorCore({
        id: actorId,
        canonCatalogId:
            canonCatalogId,
        nameEn:
            nameEn,
        aliases:
            textList(
                profile?.aliases || [],
                runtime?.aliases || [],
            ),
        roleEn:
            firstText(
                profile?.roleEn,
                runtime?.roleEn,
                profile?.role,
                runtime?.role,
            ),
        cast: {
            origin:
                castOrigin(
                    profile,
                    runtime,
                ),
            introducedClock:
                firstText(
                    existingCast
                        .introducedClock,
                    duplicateString(
                        profile,
                        runtime,
                        'introducedClock',
                    ),
                ),
            introducedTurn:
                Number.isInteger(
                    existingCast
                        .introducedTurn,
                )
                    ? existingCast
                        .introducedTurn
                    : duplicateInteger(
                        profile,
                        runtime,
                        'introducedTurn',
                    ),
        },
        publicProfile: {
            descriptionEn:
                firstText(
                    source?.publicProfile
                        ?.descriptionEn,
                    profile
                        ?.publicDescriptionEn,
                    profile
                        ?.physicalDescriptionEn,
                    runtime
                        ?.publicDescriptionEn,
                    runtime
                        ?.physicalDescriptionEn,
                ),
            backgroundEn:
                firstText(
                    source?.publicProfile
                        ?.backgroundEn,
                    profile
                        ?.publicBackgroundEn,
                    runtime
                        ?.publicBackgroundEn,
                ),
        },
        performanceCore: {
            temperamentEn:
                firstText(
                    existingCore
                        .temperamentEn,
                    profile?.personalityEn,
                    runtime?.personalityEn,
                    canonicalCore
                        .temperamentEn,
                ),
            speechStyleEn:
                isPlaceholderSpeechStyle(
                    speechStyleEn,
                )
                    ? firstText(
                        canonicalCore
                            .speechStyleEn,
                    )
                    : firstText(
                        speechStyleEn,
                        canonicalCore
                            .speechStyleEn,
                    ),
            motivesEn:
                textList(
                    existingCore.motivesEn ||
                        [],
                    isDirectorGoal(
                        legacyMotive,
                    )
                        ? []
                        : [legacyMotive],
                    canonicalCore.motivesEn ||
                        [],
                ),
            socialStrategiesEn:
                textList(
                    existingCore
                        .socialStrategiesEn ||
                        [],
                    canonicalCore
                        .socialStrategiesEn ||
                        [],
                ),
            boundariesEn:
                textList(
                    existingCore
                        .boundariesEn ||
                        [],
                    canonicalCore
                        .boundariesEn ||
                        [],
                ),
            vulnerabilitiesEn:
                textList(
                    existingCore
                        .vulnerabilitiesEn ||
                        [],
                    profile?.fearEn,
                    canonicalCore
                        .vulnerabilitiesEn ||
                        [],
                ),
        },
        identity:
            profile?.identity ||
            runtime?.identity ||
            {},
        privateFacts: {
            secretEn:
                firstText(
                    source?.privateFacts
                        ?.secretEn,
                    profile?.secretEn,
                ),
            knowledgeEn:
                sanitizeActorKnowledgeEn({
                    canonCatalogId,
                    nameEn,
                    knowledgeEn:
                        privateKnowledgeEn,
                }),
        },
    });
}

export function projectActorRuntimeV1(
    actorId,
    profile,
    runtime,
) {
    const source =
        runtime || profile;
    const legacyGoal =
        [
            runtime?.currentGoalEn,
            runtime?.privateGoalEn,
            profile?.currentGoalEn,
            profile?.privateGoalEn,
        ]
            .map(text)
            .find(goal =>
                goal &&
                !isDirectorGoal(goal)) ||
        '';
    const lifeStatus =
        duplicateString(
            profile,
            runtime,
            'lifeStatus',
        ) ||
        'alive';
    return normalizeActorRuntime({
        id: actorId,
        mapId:
            firstText(
                runtime?.mapId,
                profile?.mapId,
                profile?.homeMapId,
            ),
        roomId:
            firstText(
                runtime?.roomId,
                profile?.roomId,
                profile?.homeRoomId,
            ),
        present:
            ![
                'dead',
                'missing',
            ].includes(lifeStatus) &&
            runtime?.present === true,
        lifeStatus:
            lifeStatus,
        lifeStatusPermanent:
            duplicateBoolean(
                profile,
                runtime,
                'lifeStatusPermanent',
            ),
        lifeStatusDetailEn:
            duplicateString(
                profile,
                runtime,
                'lifeStatusDetailEn',
            ) ||
            defaultLifeDetail(
                lifeStatus,
            ),
        lifeStatusSinceClock:
            duplicateString(
                profile,
                runtime,
                'lifeStatusSinceClock',
            ),
        currentActivityEn:
            firstText(
                runtime
                    ?.currentActivityEn,
                profile
                    ?.currentActivityEn,
            ),
        currentIntentEn:
            firstText(
                runtime
                    ?.currentIntentEn,
                profile
                    ?.currentIntentEn,
            ),
        currentGoalEn:
            legacyGoal,
        temporary:
            duplicateBoolean(
                profile,
                runtime,
                'temporary',
                source?.temporary ===
                    true,
            ),
    });
}

function emptyMemoryEntry() {
    return {
        firstImpressionRef: '',
        core: [],
        recent: [],
        everyday: [],
    };
}

function migratedAppraisal({
    actorId,
    kind,
    sourceId,
    summaryEn,
    clock,
    sourceMessageIds = [],
}) {
    const summary =
        text(summaryEn);
    const fingerprint =
        JSON.stringify({
            actorId,
            kind,
            sourceId,
            summary,
            clock,
        });
    const appraisal =
        normalizeAppraisal({
            id:
                `appraisal_migrated_${stableHash(
                    fingerprint,
                )}`,
            observerId: actorId,
            targetId: 'player',
            summaryEn: summary,
            sourceEventIds: [],
            sourceMessageIds:
                Array.isArray(
                    sourceMessageIds,
                )
                    ? sourceMessageIds
                    : [],
            sourceRumorIds: [],
            activationSchemaIds: [],
            derivedSchemaIds: [],
            sceneId: '',
            contextTags: [
                `migrated_${kind}`,
            ],
            confidence: 0.5,
            status: 'accepted',
            knowledgeSource: 'mixed',
            committedClock:
                firstText(
                    clock,
                    'unknown',
                ),
            historicalClaimAllowed:
                false,
        });
    const validation =
        validateAppraisal(appraisal);
    if (!validation.valid) {
        throw new TypeError(
            `Legacy ${kind} Appraisal cannot be migrated: ${
                validation.errors.join(' ')
            }`,
        );
    }
    return appraisal;
}

function addAppraisal(
    appraisal,
    appraisalsById,
    stats,
) {
    const existing =
        appraisalsById.get(appraisal.id);
    if (
        existing &&
        JSON.stringify(existing) !==
            JSON.stringify(appraisal)
    ) {
        throw new TypeError(
            `Conflicting Appraisal ID ${appraisal.id}.`,
        );
    }
    if (!existing) {
        appraisalsById.set(
            appraisal.id,
            appraisal,
        );
        stats.migratedAppraisalCount +=
            1;
    }
    return appraisal.id;
}

function memorySources(
    actorId,
    profile,
    runtime,
    rootSharedMemories,
) {
    const result =
        Object.fromEntries(
            MEMORY_TIERS.map(tier => [
                tier,
                [],
            ]),
        );
    for (const source of [
        profile?.sharedMemories,
        runtime?.sharedMemories,
        rootSharedMemories?.[actorId],
    ]) {
        if (!isRecord(source)) {
            continue;
        }
        for (const tier of MEMORY_TIERS) {
            if (
                source[tier] !==
                    undefined &&
                !Array.isArray(
                    source[tier],
                )
            ) {
                throw new TypeError(
                    `sharedMemories.${tier} must be an array.`,
                );
            }
            result[tier].push(
                ...(source[tier] || []),
            );
        }
    }
    if (
        runtime?.temporaryMemories !==
            undefined &&
        !Array.isArray(
            runtime.temporaryMemories,
        )
    ) {
        throw new TypeError(
            'temporaryMemories must be an array.',
        );
    }
    result.everyday.push(
        ...(
            runtime
                ?.temporaryMemories ||
            []
        ).map(memory => ({
            ...memory,
            migrationKind:
                'temporary_memory',
            lastClock:
                memory?.lastClock ||
                memory?.clock,
        })),
    );
    return result;
}

function appendMemoryRef(
    entry,
    tier,
    reference,
) {
    if (
        !entry[tier].some(item =>
            item.recordType ===
                reference.recordType &&
            item.recordId ===
                reference.recordId)
    ) {
        entry[tier].push(reference);
    }
}

function migrateMemories({
    state,
    actorId,
    profile,
    runtime,
    eventIds,
    playerKnownEventIds,
    appraisalsById,
    stats,
}) {
    const entry =
        emptyMemoryEntry();
    const sources =
        memorySources(
            actorId,
            profile,
            runtime,
            state.sharedMemories,
        );
    for (const tier of MEMORY_TIERS) {
        for (const memory of sources[tier]) {
            if (!isRecord(memory)) {
                throw new TypeError(
                    'Shared memory entries must be objects.',
                );
            }
            const addedClock =
                firstText(
                    memory.lastClock,
                    memory.firstClock,
                    state.clock,
                    'unknown',
                );
            const eventId =
                text(memory.eventId);
            if (
                eventId &&
                eventIds.has(eventId)
            ) {
                playerKnownEventIds.add(
                    eventId,
                );
                appendMemoryRef(
                    entry,
                    tier,
                    {
                        recordType:
                            'event',
                        recordId:
                            eventId,
                        addedClock,
                    },
                );
                continue;
            }
            const appraisalId =
                identifier(
                    memory.appraisalId ||
                    (
                        memory.recordType ===
                            'appraisal'
                            ? memory.recordId
                            : ''
                    ),
                );
            if (
                appraisalId &&
                appraisalsById.has(
                    appraisalId,
                )
            ) {
                appendMemoryRef(
                    entry,
                    tier,
                    {
                        recordType:
                            'appraisal',
                        recordId:
                            appraisalId,
                        addedClock,
                    },
                );
                continue;
            }
            const summaryEn =
                firstText(
                    memory.summaryEn,
                    memory.summary,
                );
            if (!summaryEn) {
                throw new TypeError(
                    'Shared memory cannot be converted to a canonical reference.',
                );
            }
            const appraisal =
                migratedAppraisal({
                    actorId,
                    kind:
                        memory
                            .migrationKind ||
                        'legacy_memory',
                    sourceId:
                        firstText(
                            memory.id,
                            `${tier}_${stableHash(
                                JSON.stringify(
                                    memory,
                                ),
                            )}`,
                        ),
                    summaryEn,
                    clock: addedClock,
                    sourceMessageIds:
                        memory
                            .sourceMessageIds,
                });
            addAppraisal(
                appraisal,
                appraisalsById,
                stats,
            );
            appendMemoryRef(
                entry,
                tier,
                {
                    recordType:
                        'appraisal',
                    recordId:
                        appraisal.id,
                    addedClock,
                },
            );
        }
    }
    for (const [
        kind,
        value,
        clock,
    ] of [
            [
                'first_impression',
                firstText(
                    profile
                        ?.firstImpressionOfPlayerEn,
                    runtime
                        ?.firstImpressionOfPlayerEn,
                    profile
                        ?.firstImpressionOfPlayer,
                    runtime
                        ?.firstImpressionOfPlayer,
                ),
                firstText(
                    profile?.firstImpressionClock,
                    runtime?.firstImpressionClock,
                    state.clock,
                ),
            ],
            [
                'current_impression',
                firstText(
                    profile
                        ?.impressionOfPlayerEn,
                    runtime
                        ?.impressionOfPlayerEn,
                    profile
                        ?.impressionOfPlayer,
                    runtime
                        ?.impressionOfPlayer,
                ),
                firstText(
                    profile
                        ?.impressionUpdatedClock,
                    runtime
                        ?.impressionUpdatedClock,
                    state.clock,
                ),
            ],
        ]) {
        if (!value) {
            continue;
        }
        const appraisal =
            migratedAppraisal({
                actorId,
                kind,
                sourceId: kind,
                summaryEn: value,
                clock,
            });
        addAppraisal(
            appraisal,
            appraisalsById,
            stats,
        );
        if (
            kind ===
            'first_impression'
        ) {
            entry.firstImpressionRef =
                appraisal.id;
        } else {
            appendMemoryRef(
                entry,
                'recent',
                {
                    recordType:
                        'appraisal',
                    recordId:
                        appraisal.id,
                    addedClock:
                        appraisal
                            .committedClock,
                },
            );
        }
    }
    return entry;
}

function countLegacyFields(
    records,
    allowed,
) {
    return records.reduce(
        (total, record) =>
            total +
            Object.keys(record)
                .filter(key =>
                    !allowed.has(key))
                .length,
        0,
    );
}

function validateLink(
    id,
    knownIds,
    label,
    errors,
) {
    if (
        id &&
        !knownIds.has(id)
    ) {
        errors.push(
            `${label} references unknown ID ${id}.`,
        );
    }
}

/**
 * Validate a fully cut-over Actor Context V1 state.
 *
 * @param {object} state Candidate state.
 * @returns {{valid: boolean, errors: string[], value: object}}
 */
export function validateActorContextStateV1(
    state,
) {
    const errors = [];
    if (!isRecord(state)) {
        return {
            valid: false,
            errors: [
                'Actor Context state must be an object.',
            ],
            value: state,
        };
    }
    for (const [
        key,
        expected,
    ] of [
            [
                'actorContextVersion',
                actorContextVersion,
            ],
            [
                'memoryReferenceVersion',
                memoryReferenceVersion,
            ],
            [
                'actorDossierProjectionVersion',
                actorDossierProjectionVersion,
            ],
        ]) {
        if (state[key] !== expected) {
            errors.push(
                `${key} must be ${expected}.`,
            );
        }
    }
    const cores =
        Array.isArray(state.actorLibrary)
            ? state.actorLibrary
            : [];
    const runtimes =
        Array.isArray(state.actors)
            ? state.actors
            : [];
    if (!Array.isArray(
        state.actorLibrary,
    )) {
        errors.push(
            'actorLibrary must be an array.',
        );
    }
    if (!Array.isArray(state.actors)) {
        errors.push(
            'actors must be an array.',
        );
    }
    const actorIds = new Set();
    cores.forEach((core, index) => {
        const validation =
            validateActorCore(core);
        errors.push(
            ...validation.errors.map(error =>
                `actorLibrary[${index}]: ${error}`),
        );
        if (
            actorIds.has(validation.value.id)
        ) {
            errors.push(
                `Duplicate Actor Core ID ${validation.value.id}.`,
            );
        }
        actorIds.add(validation.value.id);
    });
    const runtimeIds = new Set();
    runtimes.forEach((runtime, index) => {
        const validation =
            validateActorRuntime(runtime);
        errors.push(
            ...validation.errors.map(error =>
                `actors[${index}]: ${error}`),
        );
        if (
            runtimeIds.has(
                validation.value.id,
            )
        ) {
            errors.push(
                `Duplicate Actor Runtime ID ${validation.value.id}.`,
            );
        }
        runtimeIds.add(validation.value.id);
        if (
            !actorIds.has(
                validation.value.id,
            )
        ) {
            errors.push(
                `Actor Runtime ${validation.value.id} has no Actor Core.`,
            );
        }
    });
    const memoryValidation =
        validateActorMemoryIndex(
            state.actorMemoryIndex,
        );
    errors.push(
        ...memoryValidation.errors.map(error =>
            `actorMemoryIndex: ${error}`),
    );
    const synapseValidation =
        validateMemorySynapse(
            state.memorySynapse,
        );
    errors.push(
        ...synapseValidation.errors.map(error =>
            `memorySynapse: ${error}`),
    );
    let eventIds = new Set();
    try {
        eventIds =
            eventIdsFromState(state);
    } catch (error) {
        errors.push(error.message);
    }
    const appraisalIds =
        new Set(
            synapseValidation.value
                .appraisals
                .map(appraisal =>
                    appraisal.id),
        );
    const schemaIds =
        new Set(
            synapseValidation.value
                .personSchemas
                .map(schema =>
                    schema.id),
        );
    for (const [
        actorId,
        entry,
    ] of Object.entries(
            state.actorMemoryIndex
                ?.byActorId || {},
        )) {
        if (!actorIds.has(actorId)) {
            errors.push(
                `Actor Memory Index references unknown actor ${actorId}.`,
            );
        }
        validateLink(
            entry?.firstImpressionRef,
            appraisalIds,
            `${actorId}.firstImpressionRef`,
            errors,
        );
        for (const tier of MEMORY_TIERS) {
            for (const reference of (
                entry?.[tier] || []
            )) {
                validateLink(
                    reference.recordId,
                    reference.recordType ===
                        'event'
                        ? eventIds
                        : appraisalIds,
                    `${actorId}.${tier}`,
                    errors,
                );
            }
        }
    }
    for (const appraisal of (
        synapseValidation.value
            .appraisals
    )) {
        if (
            !actorIds.has(
                appraisal.observerId,
            )
        ) {
            errors.push(
                `Appraisal ${appraisal.id} has an unknown observer.`,
            );
        }
        if (
            appraisal.targetId !==
                'player' &&
            !actorIds.has(
                appraisal.targetId,
            )
        ) {
            errors.push(
                `Appraisal ${appraisal.id} has an unknown target.`,
            );
        }
        for (const eventId of (
            appraisal.sourceEventIds
        )) {
            validateLink(
                eventId,
                eventIds,
                `Appraisal ${appraisal.id}`,
                errors,
            );
        }
        validateLink(
            appraisal
                .supersedesAppraisalId,
            appraisalIds,
            `Appraisal ${appraisal.id}`,
            errors,
        );
        validateLink(
            appraisal.supersededById,
            appraisalIds,
            `Appraisal ${appraisal.id}`,
            errors,
        );
    }
    for (const schema of (
        synapseValidation.value
            .personSchemas
    )) {
        validateLink(
            schema.supersedesSchemaId,
            schemaIds,
            `Person Schema ${schema.id}`,
            errors,
        );
        validateLink(
            schema.supersededById,
            schemaIds,
            `Person Schema ${schema.id}`,
            errors,
        );
    }
    return {
        valid:
            errors.length === 0,
        errors: [
            ...new Set(errors),
        ],
        value: state,
    };
}

/**
 * Atomically migrate the current Actor Context state to V1.
 *
 * @param {object} state Current world state.
 * @returns {{state: object, changed: boolean, stats: object}}
 */
export function migrateActorContextV1(
    state,
) {
    const source =
        structuredClone(state);
    if (!isRecord(source)) {
        throw new TypeError(
            'Actor Context source must be an object.',
        );
    }
    const alreadyV1 =
        source.actorContextVersion ===
            actorContextVersion &&
        source.memoryReferenceVersion ===
            memoryReferenceVersion &&
        source
            .actorDossierProjectionVersion ===
            actorDossierProjectionVersion;
    if (alreadyV1) {
        const validation =
            validateActorContextStateV1(
                source,
            );
        if (!validation.valid) {
            throw new TypeError(
                validation.errors.join(' '),
            );
        }
        return {
            state: source,
            changed: false,
            stats: {
                actorCoreCount:
                    source.actorLibrary.length,
                actorRuntimeCount:
                    source.actors.length,
                memoryRefCount:
                    Object.values(
                        source.actorMemoryIndex
                            .byActorId,
                    ).reduce(
                        (total, entry) =>
                            total +
                            MEMORY_TIERS.reduce(
                                (
                                    count,
                                    tier,
                                ) =>
                                    count +
                                    entry[tier]
                                        .length,
                                0,
                            ),
                        0,
                    ),
                migratedAppraisalCount:
                    0,
                removedLegacyFieldCount:
                    0,
            },
        };
    }
    if (
        source.actorMemoryIndex !==
            undefined
    ) {
        throw new TypeError(
            'Partial Actor Context V1 state is not a valid cutover source.',
        );
    }
    const profilesById =
        sourceRecordsById(
            source.actorLibrary,
            'actorLibrary',
        );
    const runtimesById =
        sourceRecordsById(
            source.actors,
            'actors',
        );
    const eventIds =
        eventIdsFromState(source);
    const existingSynapse =
        source.memorySynapse ===
            undefined
            ? createDefaultMemorySynapse()
            : source.memorySynapse;
    const existingValidation =
        validateMemorySynapse(
            existingSynapse,
        );
    if (!existingValidation.valid) {
        throw new TypeError(
            existingValidation.errors
                .join(' '),
        );
    }
    const stats = {
        actorCoreCount: 0,
        actorRuntimeCount: 0,
        memoryRefCount: 0,
        migratedAppraisalCount: 0,
        removedLegacyFieldCount:
            countLegacyFields(
                [...profilesById.values()],
                new Set([
                    'id',
                    'canonCatalogId',
                    'nameEn',
                    'aliases',
                    'roleEn',
                    'cast',
                    'publicProfile',
                    'performanceCore',
                    'identity',
                    'privateFacts',
                ]),
            ) +
            countLegacyFields(
                [...runtimesById.values()],
                new Set([
                    'id',
                    'mapId',
                    'roomId',
                    'present',
                    'lifeStatus',
                    'lifeStatusPermanent',
                    'lifeStatusDetailEn',
                    'lifeStatusSinceClock',
                    'currentActivityEn',
                    'currentIntentEn',
                    'currentGoalEn',
                    'temporary',
                ]),
            ),
    };
    const appraisalsById =
        new Map(
            existingValidation.value
                .appraisals
                .map(appraisal => [
                    appraisal.id,
                    appraisal,
                ]),
        );
    const playerKnownEventIds =
        new Set();
    const actorIds = [
        ...new Set([
            ...profilesById.keys(),
            ...runtimesById.keys(),
        ]),
    ].sort((left, right) =>
        left.localeCompare(right, 'en'));
    const actorLibrary = [];
    const actors = [];
    const byActorId = {};
    for (const actorId of actorIds) {
        const profile =
            profilesById.get(actorId);
        const runtime =
            runtimesById.get(actorId);
        if (
            firstText(
                profile
                    ?.identityEvidenceEn,
                runtime
                    ?.identityEvidenceEn,
            )
        ) {
            throw new TypeError(
                `Actor ${actorId} identity evidence has no canonical source reference.`,
            );
        }
        const core =
            projectActorCoreV1(
                actorId,
                profile,
                runtime,
            );
        if (!core.cast.introducedClock) {
            const introduced =
                inferredIntroduction(
                    source,
                    actorId,
                    profile,
                    runtime,
                );
            core.cast = {
                ...core.cast,
                ...introduced,
            };
        }
        actorLibrary.push(core);
        actors.push(
            projectActorRuntimeV1(
                actorId,
                profile,
                runtime,
            ),
        );
        byActorId[actorId] =
            migrateMemories({
                state: source,
                actorId,
                profile,
                runtime,
                eventIds,
                playerKnownEventIds,
                appraisalsById,
                stats,
            });
    }
    const eventKnowledge =
        eventRecords(source)
            .map(sourceEvent => {
                const event =
                    structuredClone(
                        sourceEvent,
                    );
                delete event.playerKnown;
                delete event
                    .knownToPlayer;
                return {
                    ...event,
                    knownToPlayer:
                        playerKnownEventIds
                            .has(
                                event
                                    .eventId,
                            ),
                };
            });
    const next = {
        ...source,
        actorContextVersion,
        memoryReferenceVersion,
        actorDossierProjectionVersion,
        actorLibrary,
        actors,
        eventKnowledge,
        actorMemoryIndex: {
            version:
                memoryReferenceVersion,
            byActorId,
        },
        memorySynapse: {
            ...existingValidation.value,
            appraisals: [
                ...appraisalsById.values(),
            ].sort((left, right) =>
                left.id.localeCompare(
                    right.id,
                    'en',
                )),
        },
    };
    delete next.sharedMemories;
    delete next.impressions;
    stats.actorCoreCount =
        actorLibrary.length;
    stats.actorRuntimeCount =
        actors.length;
    stats.memoryRefCount =
        Object.values(byActorId)
            .reduce(
                (total, entry) =>
                    total +
                    MEMORY_TIERS.reduce(
                        (count, tier) =>
                            count +
                            entry[tier].length,
                        0,
                    ),
                0,
            );
    const validation =
        validateActorContextStateV1(
            next,
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.errors.join(' '),
        );
    }
    return {
        state: next,
        changed:
            JSON.stringify(source) !==
            JSON.stringify(next),
        stats,
    };
}
