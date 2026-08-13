import {
    normalizeNpcIdentity,
    validateNpcIdentity,
} from './npc-identity-schema.js';

export const actorContextVersion = 1;
export const memoryReferenceVersion = 3;
export const actorDossierProjectionVersion = 1;

export const MEMORY_REF_RECORD_TYPE_VALUES =
    Object.freeze([
        'event',
        'appraisal',
    ]);

export const ACTOR_CAST_ORIGIN_VALUES =
    Object.freeze([
        'foundation',
        'canon_catalog',
        'preset_resident',
        'generated_guest',
        'scene_temporary',
    ]);

export const ACTOR_LIFE_STATUS_VALUES =
    Object.freeze([
        'alive',
        'injured',
        'incapacitated',
        'missing',
        'dead',
    ]);

const ACTOR_CORE_KEYS = Object.freeze([
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
]);
const ACTOR_CAST_KEYS =
    Object.freeze([
        'origin',
        'introducedClock',
        'introducedTurn',
    ]);
const ACTOR_PUBLIC_PROFILE_KEYS =
    Object.freeze([
        'descriptionEn',
        'backgroundEn',
    ]);
const ACTOR_PERFORMANCE_CORE_KEYS =
    Object.freeze([
        'temperamentEn',
        'speechStyleEn',
        'motivesEn',
        'socialStrategiesEn',
        'boundariesEn',
        'vulnerabilitiesEn',
    ]);
const ACTOR_PRIVATE_FACT_KEYS =
    Object.freeze([
        'secretEn',
        'knowledgeEn',
    ]);
const ACTOR_RUNTIME_KEYS = Object.freeze([
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
]);
const MEMORY_REF_KEYS = Object.freeze([
    'recordType',
    'recordId',
    'addedClock',
]);
const ACTOR_MEMORY_INDEX_KEYS =
    Object.freeze([
        'version',
        'byActorId',
    ]);
const ACTOR_MEMORY_ENTRY_KEYS =
    Object.freeze([
        'firstImpressionRef',
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

function hasExactKeys(
    value,
    keys,
) {
    if (!isRecord(value)) {
        return false;
    }
    const actual =
        Object.keys(value);
    const allowed =
        new Set(keys);
    return actual.length === keys.length &&
        actual.every(key =>
            allowed.has(key));
}

function compactText(
    value,
    maximumLength = 2000,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function normalizeIdentifier(
    value,
) {
    return compactText(
        value,
        128,
    )
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_.:-]+/gu, '_')
        .replace(/^[_:.-]+|[_:.-]+$/gu, '');
}

function normalizeTextList(
    values,
    {
        maximumItems = 64,
        maximumLength = 500,
    } = {},
) {
    const normalized = [];
    const seen = new Set();
    for (
        const value of Array.isArray(values)
            ? values
            : []
    ) {
        const text =
            compactText(
                value,
                maximumLength,
            );
        const key =
            text.toLocaleLowerCase();
        if (
            !text ||
            seen.has(key)
        ) {
            continue;
        }
        seen.add(key);
        normalized.push(text);
        if (
            normalized.length >=
            maximumItems
        ) {
            break;
        }
    }
    return normalized;
}

function isStringList(value) {
    return Array.isArray(value) &&
        value.every(item =>
            typeof item === 'string');
}

function validationResult(
    value,
    errors,
) {
    return {
        valid:
            errors.length === 0,
        errors,
        value,
    };
}

/**
 * Normalize a stable ActorCoreV1 record.
 *
 * @param {object} source Source record.
 * @returns {object} ActorCoreV1.
 */
export function normalizeActorCore(
    source = {},
) {
    const record =
        isRecord(source)
            ? source
            : {};
    const publicProfile =
        isRecord(record.publicProfile)
            ? record.publicProfile
            : {};
    const cast =
        isRecord(record.cast)
            ? record.cast
            : {};
    const performanceCore =
        isRecord(record.performanceCore)
            ? record.performanceCore
            : {};
    const privateFacts =
        isRecord(record.privateFacts)
            ? record.privateFacts
            : {};
    return {
        id:
            normalizeIdentifier(
                record.id,
            ),
        canonCatalogId:
            normalizeIdentifier(
                record.canonCatalogId,
            ),
        nameEn:
            compactText(
                record.nameEn,
                160,
            ),
        aliases:
            normalizeTextList(
                record.aliases,
                {
                    maximumItems: 32,
                    maximumLength: 160,
                },
            ),
        roleEn:
            compactText(
                record.roleEn,
                240,
            ),
        cast: {
            origin:
                ACTOR_CAST_ORIGIN_VALUES
                    .includes(
                        cast.origin,
                    )
                    ? cast.origin
                    : 'foundation',
            introducedClock:
                compactText(
                    cast.introducedClock,
                    120,
                ),
            introducedTurn:
                Number.isInteger(
                    cast.introducedTurn,
                ) &&
                cast.introducedTurn >= 0
                    ? cast.introducedTurn
                    : null,
        },
        publicProfile: {
            descriptionEn:
                compactText(
                    publicProfile
                        .descriptionEn,
                    2000,
                ),
            backgroundEn:
                compactText(
                    publicProfile
                        .backgroundEn,
                    4000,
                ),
        },
        performanceCore: {
            temperamentEn:
                compactText(
                    performanceCore
                        .temperamentEn,
                    1000,
                ),
            speechStyleEn:
                compactText(
                    performanceCore
                        .speechStyleEn,
                    1000,
                ),
            motivesEn:
                normalizeTextList(
                    performanceCore
                        .motivesEn,
                ),
            socialStrategiesEn:
                normalizeTextList(
                    performanceCore
                        .socialStrategiesEn,
                ),
            boundariesEn:
                normalizeTextList(
                    performanceCore
                        .boundariesEn,
                ),
            vulnerabilitiesEn:
                normalizeTextList(
                    performanceCore
                        .vulnerabilitiesEn,
                ),
        },
        identity:
            normalizeNpcIdentity(
                record.identity,
            ),
        privateFacts: {
            secretEn:
                compactText(
                    privateFacts.secretEn,
                    2000,
                ),
            knowledgeEn:
                normalizeTextList(
                    privateFacts.knowledgeEn,
                    {
                        maximumItems: 128,
                        maximumLength: 2000,
                    },
                ),
        },
    };
}

/**
 * Validate an ActorCoreV1 record without accepting legacy copies.
 *
 * @param {object} source Candidate record.
 * @returns {{valid: boolean, errors: string[], value: object}}
 */
export function validateActorCore(
    source,
) {
    const value =
        normalizeActorCore(source);
    const errors = [];
    if (
        !hasExactKeys(
            source,
            ACTOR_CORE_KEYS,
        )
    ) {
        errors.push(
            'Actor Core must contain exactly the ActorCoreV1 fields.',
        );
    }
    if (
        !value.id ||
        source?.id !== value.id
    ) {
        errors.push(
            'Actor Core id must be a normalized stable ID.',
        );
    }
    if (
        !value.nameEn ||
        typeof source?.nameEn !==
            'string'
    ) {
        errors.push(
            'Actor Core nameEn is required.',
        );
    }
    if (
        typeof source?.canonCatalogId !==
            'string' ||
        typeof source?.roleEn !==
            'string' ||
        !isStringList(source?.aliases)
    ) {
        errors.push(
            'Actor Core catalog, role, or aliases are invalid.',
        );
    }
    if (
        !hasExactKeys(
            source?.cast,
            ACTOR_CAST_KEYS,
        ) ||
        !ACTOR_CAST_ORIGIN_VALUES
            .includes(
                source?.cast?.origin,
            ) ||
        typeof source?.cast
            ?.introducedClock !==
            'string' ||
        !(
            source?.cast
                ?.introducedTurn ===
                null ||
            (
                Number.isInteger(
                    source?.cast
                        ?.introducedTurn,
                ) &&
                source.cast
                    .introducedTurn >= 0
            )
        )
    ) {
        errors.push(
            'Actor Core cast lifecycle is invalid.',
        );
    }
    if (
        !hasExactKeys(
            source?.publicProfile,
            ACTOR_PUBLIC_PROFILE_KEYS,
        ) ||
        typeof source?.publicProfile
            ?.descriptionEn !==
            'string' ||
        typeof source?.publicProfile
            ?.backgroundEn !==
            'string'
    ) {
        errors.push(
            'Actor Core publicProfile is invalid.',
        );
    }
    if (
        !hasExactKeys(
            source?.performanceCore,
            ACTOR_PERFORMANCE_CORE_KEYS,
        ) ||
        typeof source?.performanceCore
            ?.temperamentEn !==
            'string' ||
        typeof source?.performanceCore
            ?.speechStyleEn !==
            'string' ||
        !isStringList(
            source?.performanceCore
                ?.motivesEn,
        ) ||
        !isStringList(
            source?.performanceCore
                ?.socialStrategiesEn,
        ) ||
        !isStringList(
            source?.performanceCore
                ?.boundariesEn,
        ) ||
        !isStringList(
            source?.performanceCore
                ?.vulnerabilitiesEn,
        )
    ) {
        errors.push(
            'Actor Core performanceCore is invalid.',
        );
    }
    const identityValidation =
        validateNpcIdentity(
            source?.identity,
        );
    if (!identityValidation.valid) {
        errors.push(
            ...identityValidation.errors
                .map(error =>
                    `Actor Core ${error}`),
        );
    }
    if (
        !hasExactKeys(
            source?.privateFacts,
            ACTOR_PRIVATE_FACT_KEYS,
        ) ||
        typeof source?.privateFacts
            ?.secretEn !==
            'string' ||
        !isStringList(
            source?.privateFacts
                ?.knowledgeEn,
        )
    ) {
        errors.push(
            'Actor Core privateFacts is invalid.',
        );
    }
    return validationResult(
        value,
        errors,
    );
}

/**
 * Project an ActorCoreV1 whitelist copy.
 *
 * @param {object} source Source record.
 * @returns {object} ActorCoreV1 projection.
 */
export function projectActorCore(
    source,
) {
    return normalizeActorCore(
        source,
    );
}

/**
 * Normalize an ActorRuntimeV1 record.
 *
 * @param {object} source Source record.
 * @returns {object} ActorRuntimeV1.
 */
export function normalizeActorRuntime(
    source = {},
) {
    const record =
        isRecord(source)
            ? source
            : {};
    return {
        id:
            normalizeIdentifier(
                record.id,
            ),
        mapId:
            normalizeIdentifier(
                record.mapId,
            ),
        roomId:
            normalizeIdentifier(
                record.roomId,
            ),
        present:
            record.present === true,
        lifeStatus:
            ACTOR_LIFE_STATUS_VALUES
                .includes(
                    record.lifeStatus,
                )
                ? record.lifeStatus
                : 'alive',
        lifeStatusPermanent:
            record
                .lifeStatusPermanent ===
            true,
        lifeStatusDetailEn:
            compactText(
                record.lifeStatusDetailEn,
                500,
            ),
        lifeStatusSinceClock:
            compactText(
                record.lifeStatusSinceClock,
                120,
            ),
        currentActivityEn:
            compactText(
                record.currentActivityEn,
                1000,
            ),
        currentIntentEn:
            compactText(
                record.currentIntentEn,
                1000,
            ),
        currentGoalEn:
            compactText(
                record.currentGoalEn,
                1000,
            ),
        temporary:
            record.temporary === true,
    };
}

/**
 * Validate an exact ActorRuntimeV1 record.
 *
 * @param {object} source Candidate record.
 * @returns {{valid: boolean, errors: string[], value: object}}
 */
export function validateActorRuntime(
    source,
) {
    const value =
        normalizeActorRuntime(source);
    const errors = [];
    if (
        !hasExactKeys(
            source,
            ACTOR_RUNTIME_KEYS,
        )
    ) {
        errors.push(
            'Actor Runtime must contain exactly the ActorRuntimeV1 fields.',
        );
    }
    if (
        !value.id ||
        source?.id !== value.id
    ) {
        errors.push(
            'Actor Runtime id must be a normalized stable ID.',
        );
    }
    for (
        const key of [
            'mapId',
            'roomId',
            'lifeStatus',
            'lifeStatusDetailEn',
            'lifeStatusSinceClock',
            'currentActivityEn',
            'currentIntentEn',
            'currentGoalEn',
        ]
    ) {
        if (
            typeof source?.[key] !==
            'string'
        ) {
            errors.push(
                `Actor Runtime ${key} must be a string.`,
            );
        }
    }
    for (
        const key of [
            'present',
            'lifeStatusPermanent',
            'temporary',
        ]
    ) {
        if (
            typeof source?.[key] !==
            'boolean'
        ) {
            errors.push(
                `Actor Runtime ${key} must be a boolean.`,
            );
        }
    }
    if (
        !ACTOR_LIFE_STATUS_VALUES
            .includes(
                source?.lifeStatus,
            )
    ) {
        errors.push(
            'Actor Runtime lifeStatus is invalid.',
        );
    }
    if (
        !value.lifeStatusDetailEn
    ) {
        errors.push(
            'Actor Runtime lifeStatusDetailEn is required.',
        );
    }
    if (
        [
            'dead',
            'missing',
        ].includes(
            value.lifeStatus,
        ) &&
        value.present
    ) {
        errors.push(
            'Dead or missing Actor Runtime cannot be present.',
        );
    }
    return validationResult(
        value,
        errors,
    );
}

/**
 * Project an ActorRuntimeV1 whitelist copy.
 *
 * @param {object} source Source record.
 * @returns {object} ActorRuntimeV1 projection.
 */
export function projectActorRuntime(
    source,
) {
    return normalizeActorRuntime(
        source,
    );
}

/**
 * Normalize a MemoryRefV1 record.
 *
 * @param {object} source Source record.
 * @returns {object} MemoryRefV1.
 */
export function normalizeMemoryRef(
    source = {},
) {
    const record =
        isRecord(source)
            ? source
            : {};
    return {
        recordType:
            MEMORY_REF_RECORD_TYPE_VALUES
                .includes(record.recordType)
                ? record.recordType
                : '',
        recordId:
            normalizeIdentifier(
                record.recordId,
            ),
        addedClock:
            compactText(
                record.addedClock,
                120,
            ),
    };
}

/**
 * Validate an exact MemoryRefV1 record.
 *
 * @param {object} source Candidate record.
 * @returns {{valid: boolean, errors: string[], value: object}}
 */
export function validateMemoryRef(
    source,
) {
    const value =
        normalizeMemoryRef(source);
    const errors = [];
    if (
        !hasExactKeys(
            source,
            MEMORY_REF_KEYS,
        )
    ) {
        errors.push(
            'Memory Ref must contain exactly recordType, recordId, and addedClock.',
        );
    }
    if (
        !MEMORY_REF_RECORD_TYPE_VALUES
            .includes(
                source?.recordType,
            )
    ) {
        errors.push(
            'Memory Ref recordType must be event or appraisal.',
        );
    }
    if (
        !value.recordId ||
        source?.recordId !==
            value.recordId
    ) {
        errors.push(
            'Memory Ref recordId must be a normalized stable ID.',
        );
    }
    if (
        !value.addedClock ||
        typeof source?.addedClock !==
            'string'
    ) {
        errors.push(
            'Memory Ref addedClock is required.',
        );
    }
    return validationResult(
        value,
        errors,
    );
}

/**
 * Project a MemoryRefV1 whitelist copy.
 *
 * @param {object} source Source record.
 * @returns {object} MemoryRefV1 projection.
 */
export function projectMemoryRef(
    source,
) {
    return normalizeMemoryRef(
        source,
    );
}

function normalizeMemoryRefList(
    values,
) {
    return (
        Array.isArray(values)
            ? values
            : []
    ).map(normalizeMemoryRef);
}

function normalizeActorMemoryEntry(
    source,
) {
    const record =
        isRecord(source)
            ? source
            : {};
    return {
        firstImpressionRef:
            normalizeIdentifier(
                record
                    .firstImpressionRef,
            ),
        core:
            normalizeMemoryRefList(
                record.core,
            ),
        recent:
            normalizeMemoryRefList(
                record.recent,
            ),
        everyday:
            normalizeMemoryRefList(
                record.everyday,
            ),
    };
}

/**
 * Normalize an ActorMemoryIndexV1 record.
 *
 * @param {object} source Source record.
 * @returns {object} ActorMemoryIndexV1.
 */
export function normalizeActorMemoryIndex(
    source = {},
) {
    const byActorId =
        isRecord(source?.byActorId)
            ? source.byActorId
            : {};
    return {
        version:
            memoryReferenceVersion,
        byActorId:
            Object.fromEntries(
                Object.entries(
                    byActorId,
                )
                    .map(([
                        actorId,
                        entry,
                    ]) => [
                        normalizeIdentifier(
                            actorId,
                        ),
                        normalizeActorMemoryEntry(
                            entry,
                        ),
                    ])
                    .filter(([
                        actorId,
                    ]) =>
                        Boolean(actorId))
                    .sort((left, right) =>
                        left[0]
                            .localeCompare(
                                right[0],
                                'en',
                            )),
            ),
    };
}

/**
 * Validate an exact ActorMemoryIndexV1 record.
 *
 * @param {object} source Candidate record.
 * @returns {{valid: boolean, errors: string[], value: object}}
 */
export function validateActorMemoryIndex(
    source,
) {
    const value =
        normalizeActorMemoryIndex(
            source,
        );
    const errors = [];
    if (
        !hasExactKeys(
            source,
            ACTOR_MEMORY_INDEX_KEYS,
        )
    ) {
        errors.push(
            'Actor Memory Index must contain exactly version and byActorId.',
        );
    }
    if (
        source?.version !==
        memoryReferenceVersion
    ) {
        errors.push(
            `Actor Memory Index version must be ${memoryReferenceVersion}.`,
        );
    }
    if (!isRecord(source?.byActorId)) {
        errors.push(
            'Actor Memory Index byActorId must be an object.',
        );
        return validationResult(
            value,
            errors,
        );
    }
    for (
        const [
            actorId,
            entry,
        ] of Object.entries(
            source.byActorId,
        )
    ) {
        if (
            !actorId ||
            actorId !==
                normalizeIdentifier(actorId)
        ) {
            errors.push(
                `Actor Memory Index actor ID ${actorId || '?'} is invalid.`,
            );
        }
        if (
            !hasExactKeys(
                entry,
                ACTOR_MEMORY_ENTRY_KEYS,
            )
        ) {
            errors.push(
                `Actor Memory Index entry ${actorId || '?'} has unsupported fields.`,
            );
            continue;
        }
        if (
            typeof entry
                .firstImpressionRef !==
                'string' ||
            entry.firstImpressionRef !==
                normalizeIdentifier(
                    entry.firstImpressionRef,
                )
        ) {
            errors.push(
                `Actor Memory Index entry ${actorId} has an invalid firstImpressionRef.`,
            );
        }
        for (
            const tier of [
                'core',
                'recent',
                'everyday',
            ]
        ) {
            if (
                !Array.isArray(
                    entry[tier],
                )
            ) {
                errors.push(
                    `Actor Memory Index entry ${actorId}.${tier} must be an array.`,
                );
                continue;
            }
            entry[tier]
                .forEach((
                    reference,
                    index,
                ) => {
                    const validation =
                        validateMemoryRef(
                            reference,
                        );
                    errors.push(
                        ...validation.errors
                            .map(error =>
                                `${actorId}.${tier}[${index}]: ${error}`),
                    );
                });
        }
    }
    return validationResult(
        value,
        errors,
    );
}

/**
 * Project an ActorMemoryIndexV1 whitelist copy.
 *
 * @param {object} source Source record.
 * @returns {object} ActorMemoryIndexV1 projection.
 */
export function projectActorMemoryIndex(
    source,
) {
    return normalizeActorMemoryIndex(
        source,
    );
}
