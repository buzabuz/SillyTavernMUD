import {
    normalizeNpcIdentity,
} from './npc-identity-schema.js';

export const ACTOR_CREATION_PROPOSAL_VERSION = 1;

export const ACTOR_CREATION_PROPOSAL_KEYS = Object.freeze([
    'id',
    'nameEn',
    'aliases',
    'roleEn',
    'publicProfile',
    'performanceCore',
    'privateFacts',
    'runtime',
    'initialRelationshipToPlayerEn',
    'firstImpressionOfPlayerEn',
]);

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function text(value, maximumLength = 1000) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function textList(
    values,
    maximumItems = 16,
    maximumLength = 500,
) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    text(
                        value,
                        maximumLength,
                    ))
                .filter(Boolean),
        ),
    ].slice(0, maximumItems);
}

function hasExactKeys(
    value,
    keys,
) {
    if (!isRecord(value)) {
        return false;
    }
    const allowed = new Set(keys);
    return (
        Object.keys(value).length ===
            keys.length &&
        Object.keys(value)
            .every(key =>
                allowed.has(key))
    );
}

export function normalizeActorCreationProposal(
    source = {},
) {
    const publicProfile =
        isRecord(source.publicProfile)
            ? source.publicProfile
            : {};
    const performanceCore =
        isRecord(source.performanceCore)
            ? source.performanceCore
            : {};
    const privateFacts =
        isRecord(source.privateFacts)
            ? source.privateFacts
            : {};
    const runtime =
        isRecord(source.runtime)
            ? source.runtime
            : {};
    return {
        id:
            text(
                source.id,
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
                ),
        nameEn:
            text(
                source.nameEn,
                160,
            ),
        aliases:
            textList(
                source.aliases,
                16,
                160,
            ),
        roleEn:
            text(
                source.roleEn,
                240,
            ),
        publicProfile: {
            descriptionEn:
                text(
                    publicProfile
                        .descriptionEn,
                    2000,
                ),
            backgroundEn:
                text(
                    publicProfile
                        .backgroundEn,
                    3000,
                ),
        },
        performanceCore: {
            temperamentEn:
                text(
                    performanceCore
                        .temperamentEn,
                    1000,
                ),
            speechStyleEn:
                text(
                    performanceCore
                        .speechStyleEn,
                    1000,
                ),
            motivesEn:
                textList(
                    performanceCore
                        .motivesEn,
                ),
            socialStrategiesEn:
                textList(
                    performanceCore
                        .socialStrategiesEn,
                ),
            boundariesEn:
                textList(
                    performanceCore
                        .boundariesEn,
                ),
            vulnerabilitiesEn:
                textList(
                    performanceCore
                        .vulnerabilitiesEn,
                ),
        },
        privateFacts: {
            secretEn:
                text(
                    privateFacts.secretEn,
                    2000,
                ),
            knowledgeEn:
                textList(
                    privateFacts
                        .knowledgeEn,
                    32,
                    1200,
                ),
        },
        runtime: {
            present:
                runtime.present === true,
            roomId:
                text(
                    runtime.roomId,
                    120,
                ),
            currentActivityEn:
                text(
                    runtime
                        .currentActivityEn,
                    1000,
                ),
            currentIntentEn:
                text(
                    runtime
                        .currentIntentEn,
                    1000,
                ),
            currentGoalEn:
                text(
                    runtime
                        .currentGoalEn,
                    1000,
                ),
        },
        initialRelationshipToPlayerEn:
            text(
                source
                    .initialRelationshipToPlayerEn,
                500,
            ),
        firstImpressionOfPlayerEn:
            text(
                source
                    .firstImpressionOfPlayerEn,
                500,
            ),
    };
}

export function validateActorCreationProposal(
    source,
    {
        mode = 'opening',
    } = {},
) {
    const value =
        normalizeActorCreationProposal(
            source,
        );
    const errors = [];
    if (
        !hasExactKeys(
            source,
            ACTOR_CREATION_PROPOSAL_KEYS,
        )
    ) {
        errors.push(
            'Actor creation proposal fields are invalid.',
        );
    }
    for (const [
        label,
        candidate,
        keys,
    ] of [
        [
            'publicProfile',
            source?.publicProfile,
            [
                'descriptionEn',
                'backgroundEn',
            ],
        ],
        [
            'performanceCore',
            source?.performanceCore,
            [
                'temperamentEn',
                'speechStyleEn',
                'motivesEn',
                'socialStrategiesEn',
                'boundariesEn',
                'vulnerabilitiesEn',
            ],
        ],
        [
            'privateFacts',
            source?.privateFacts,
            [
                'secretEn',
                'knowledgeEn',
            ],
        ],
        [
            'runtime',
            source?.runtime,
            [
                'present',
                'roomId',
                'currentActivityEn',
                'currentIntentEn',
                'currentGoalEn',
            ],
        ],
    ]) {
        if (
            !hasExactKeys(
                candidate,
                keys,
            )
        ) {
            errors.push(
                `Actor creation proposal ${label} fields are invalid.`,
            );
        }
    }
    if (
        !/^[a-z][a-z0-9_]{2,79}$/u
            .test(
                String(
                    source?.id ||
                    '',
                ),
            )
    ) {
        errors.push(
            'Actor creation proposal id is invalid.',
        );
    }
    if (
        typeof source?.runtime
            ?.present !==
        'boolean'
    ) {
        errors.push(
            'Actor creation proposal runtime.present must be boolean.',
        );
    }
    for (const path of [
        'aliases',
        'performanceCore.motivesEn',
        'performanceCore.socialStrategiesEn',
        'performanceCore.boundariesEn',
        'performanceCore.vulnerabilitiesEn',
        'privateFacts.knowledgeEn',
    ]) {
        const parts = path.split('.');
        const candidate =
            parts.reduce(
                (
                    current,
                    key,
                ) =>
                    current?.[key],
                source,
            );
        if (!Array.isArray(candidate)) {
            errors.push(
                `Actor creation proposal ${path} must be an array.`,
            );
        }
    }
    for (const [
        label,
        candidate,
    ] of [
        ['nameEn', value.nameEn],
        ['roleEn', value.roleEn],
        [
            'publicProfile.descriptionEn',
            value.publicProfile
                .descriptionEn,
        ],
        [
            'performanceCore.temperamentEn',
            value.performanceCore
                .temperamentEn,
        ],
        [
            'performanceCore.speechStyleEn',
            value.performanceCore
                .speechStyleEn,
        ],
        [
            'runtime.currentActivityEn',
            value.runtime
                .currentActivityEn,
        ],
    ]) {
        if (!candidate) {
            errors.push(
                `Actor creation proposal requires ${label}.`,
            );
        }
    }
    if (
        mode === 'opening' &&
        !value.initialRelationshipToPlayerEn
    ) {
        errors.push(
            'Opening Actor proposal requires initialRelationshipToPlayerEn.',
        );
    }
    if (
        mode === 'opening' &&
        value.runtime.present &&
        !value.firstImpressionOfPlayerEn
    ) {
        errors.push(
            'Present Opening Actor proposal requires firstImpressionOfPlayerEn.',
        );
    }
    if (
        mode === 'temporary' &&
        (
            value.privateFacts.secretEn ||
            value.privateFacts
                .knowledgeEn.length ||
            value.initialRelationshipToPlayerEn ||
            value.firstImpressionOfPlayerEn
        )
    ) {
        errors.push(
            'Temporary Actor proposal cannot contain private or relationship facts.',
        );
    }
    return {
        valid:
            errors.length === 0,
        errors,
        value,
        identity:
            normalizeNpcIdentity(),
    };
}

export function projectActorCreationCore(
    proposal,
    {
        cast,
        identity =
        normalizeNpcIdentity(),
    } = {},
) {
    const value =
        normalizeActorCreationProposal(
            proposal,
        );
    return {
        id: value.id,
        canonCatalogId: '',
        nameEn:
            value.nameEn,
        aliases:
            value.aliases,
        roleEn:
            value.roleEn,
        cast,
        publicProfile:
            value.publicProfile,
        performanceCore:
            value.performanceCore,
        identity,
        privateFacts:
            value.privateFacts,
    };
}

export function projectActorCreationRuntime(
    proposal,
    {
        mapId = '',
        temporary = false,
    } = {},
) {
    const value =
        normalizeActorCreationProposal(
            proposal,
        );
    return {
        mapId,
        roomId:
            value.runtime.roomId,
        present:
            value.runtime.present,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
        lifeStatusSinceClock: '',
        currentActivityEn:
            value.runtime
                .currentActivityEn,
        currentIntentEn:
            value.runtime
                .currentIntentEn,
        currentGoalEn:
            value.runtime
                .currentGoalEn,
        temporary,
    };
}
