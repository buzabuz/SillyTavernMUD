import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fetch from 'node-fetch';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';
import { z } from 'zod';

import {
    getModelTaskDefinition,
} from '../../public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js';
import {
    createModelLanguageMismatch,
    isEnglishAuthorityText,
} from '../../public/scripts/extensions/hogwarts-mud/domain/model-language-adoption.js';
import { getConfigValue } from '../util.js';
import { IDENTITY_OBSERVATION_JSON_SCHEMA, IDENTITY_OBSERVATION_RESULT_SCHEMA, IDENTITY_OBSERVATION_SYSTEM_RULES } from './identity-observation-contract.js';

const SCHEMA_VERSION = 1;
const DEFAULT_API_URL =
    'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3:1.7b';
const DEFAULT_KEEP_ALIVE = '60s';
const DEFAULT_CONTEXT_SIZE = 4096;
const DEFAULT_TIMEOUT_MS = 120_000;
const MODULE_ROOT =
    path.dirname(
        fileURLToPath(
            import.meta.url,
        ),
    );
const PROJECT_ROOT =
    path.resolve(
        MODULE_ROOT,
        '..',
        '..',
    );

const TEMPORAL_MODES = [
    'instantaneous',
    'brief',
    'ordinary',
    'extended',
    'explicit_duration',
    'travel',
    'sleep',
    'event_boundary',
];
const TEMPORAL_BASES = [
    'estimated',
    'explicit',
    'route',
    'schedule',
    'fallback',
];
const CHECK_RULE_IDS = [
    'none',
    'physical_force',
    'agility',
    'perception',
    'intellect',
    'willpower',
    'charisma',
    'magic',
    'forced_general',
];
const MATERIAL_EVENT_TYPES = [
    'object_placed',
    'object_moved',
    'object_removed',
    'scene_adjusted',
    'scene_damaged',
    'scene_repaired',
    'scene_soiled',
    'scene_cleaned',
    'outfit_changed',
    'accessory_changed',
    'hairstyle_changed',
    'appearance_changed',
    'appearance_cleared',
    'object_held',
    'object_released',
];
const MATERIAL_OPERATIONS = [
    'set',
    'add',
    'move',
    'remove',
    'damage',
    'repair',
    'soil',
    'clean',
];
const MATERIAL_PERSISTENCE = [
    'transient',
    'until_scene_end',
    'until_changed',
];
const MATERIAL_SLOTS = [
    'head',
    'hair',
    'face',
    'neck',
    'torso_inner',
    'torso_outer',
    'hands',
    'waist',
    'legs',
    'feet',
    'accessory',
    'unspecified',
];
const INVENTORY_ACTIONS = [
    'acquire', 'carry', 'place', 'equip', 'unequip', 'give',
    'lend', 'consume', 'damage', 'clean', 'lose', 'destroy',
];
const INVENTORY_TYPES = [
    'wand',
    'eyewear',
    'clothing',
    'accessory',
    'document',
    'container',
    'money',
    'key',
    'book',
    'tool',
    'consumable',
    'keepsake',
    'clue',
    'other',
];
const INVENTORY_TRANSFER_MODES = [
    'none', 'gift', 'loan', 'theft', 'return',
];
const INVENTORY_STORY_ROLES = [
    'signature', 'social', 'clue', 'promise', 'keepsake',
];
const INVENTORY_VISIBILITY = [
    'public', 'owner_known', 'hidden',
];
const VISUAL_SCOPES = [
    'none',
    'target',
    'nearby',
    'room',
    'area',
];
const AUDIBLE_SCOPES = [
    'none',
    'target',
    'nearby',
    'room',
    'adjacent',
];
const PERCEPTION_SALIENCE = [
    'subtle',
    'normal',
    'notable',
    'major',
];
const PERCEPTION_ATTRIBUTION = [
    'clear',
    'ambiguous',
    'unknown',
];
const PERCEPTION_CONCEALMENT = [
    'none',
    'attempted',
    'successful',
];

const confidenceSchema =
    z.number().min(0).max(1);

const preTurnResultSchema =
    z.object({
        schemaVersion:
            z.literal(SCHEMA_VERSION),
        temporal: z.object({
            mode:
                z.enum(TEMPORAL_MODES),
            elapsedMinutes:
                z.number()
                    .int()
                    .min(0)
                    .max(10_080),
            basis:
                z.enum(TEMPORAL_BASES),
            evidenceText:
                z.string().max(500),
            reasonEn:
                z.string().max(500),
            confidence:
                confidenceSchema,
        }).strict(),
        check: z.object({
            required: z.boolean(),
            ruleId:
                z.enum(CHECK_RULE_IDS),
            targetActorId:
                z.string().max(96),
            reasonEn:
                z.string().max(500),
            confidence:
                confidenceSchema,
        }).strict(),
    }).strict();

const materialEventSchema =
    z.object({
        type:
            z.enum(MATERIAL_EVENT_TYPES),
        actorId:
            z.string().max(96),
        objectTextEn:
            z.string().max(300),
        sourceTextEn:
            z.string().max(300),
        targetTextEn:
            z.string().max(300),
        valueTextEn:
            z.string().max(300),
        previousValueTextEn:
            z.string().max(300),
        resultTextEn:
            z.string().max(500),
        quantity:
            z.number()
                .int()
                .min(1)
                .max(1_000)
                .nullable(),
        operation:
            z.enum(MATERIAL_OPERATIONS),
        slot:
            z.enum(MATERIAL_SLOTS),
        hand:
            z.enum([
                'left',
                'right',
                'both',
                'unspecified',
            ]),
        persistence:
            z.enum(
                MATERIAL_PERSISTENCE,
            ),
        sourceKind:
            z.enum([
                'player',
                'narrative',
            ]),
        evidenceText:
            z.string().max(500),
        confidence:
            confidenceSchema,
    }).strict();

const inventoryUpdateSchema =
    z.object({
        id:
            z.string().max(80),
        operation:
            z.enum(
                INVENTORY_ACTIONS,
            ),
        type:
            z.enum(
                INVENTORY_TYPES,
            ),
        labelEn:
            z.string().max(200),
        appearanceEn:
            z.string().max(600),
        ownerId:
            z.string().max(96),
        holderId:
            z.string().max(96),
        targetHolderId:
            z.string().max(96),
        transferMode:
            z.enum(
                INVENTORY_TRANSFER_MODES,
            ),
        storyRoles:
            z.array(
                z.enum(
                    INVENTORY_STORY_ROLES,
                ),
            ).max(5),
        visibility:
            z.enum(
                INVENTORY_VISIBILITY,
            ),
        isEquipped:
            z.boolean(),
        held:
            z.boolean(),
        sourceKind:
            z.enum([
                'player',
                'narrative',
            ]),
        evidenceText:
            z.string().max(500),
        confidence:
            confidenceSchema,
    }).strict();

const perceptionSchema =
    z.object({
        version: z.literal(1),
        visualScope:
            z.enum(VISUAL_SCOPES),
        audibleScope:
            z.enum(AUDIBLE_SCOPES),
        salience:
            z.enum(PERCEPTION_SALIENCE),
        attribution:
            z.enum(PERCEPTION_ATTRIBUTION),
        concealment:
            z.enum(PERCEPTION_CONCEALMENT),
        directParticipantActorIds:
            z.array(
                z.string().max(96),
            ).max(16),
        evidenceText:
            z.string()
                .min(1)
                .max(500),
        confidence:
            confidenceSchema,
        source:
            z.literal(
                'post_turn_observer',
            ),
    }).strict();

const postTurnResultSchema =
    z.object({
        schemaVersion:
            z.literal(SCHEMA_VERSION),
        materialEvents:
            z.array(
                materialEventSchema,
            ).max(16),
        eventBoundary: z.object({
            ended: z.boolean(),
            reasonEn:
                z.string().max(500),
            evidenceText:
                z.string().max(500),
            confidence:
                confidenceSchema,
        }).strict(),
        actorUpdates: z.array(
            z.object({
                actorId:
                    z.string().max(96),
                currentActivityEn:
                    z.string().max(500),
                presence:
                    z.enum([
                        'unchanged',
                        'present',
                        'absent',
                    ]),
                roomId:
                    z.string().max(96),
                evidenceText:
                    z.string().max(500),
                confidence:
                    confidenceSchema,
            }).strict(),
        ).max(16),
        identityObservations:
            z.array(IDENTITY_OBSERVATION_RESULT_SCHEMA).max(16),
        perception:
            perceptionSchema,
    }).strict();

const inventoryTurnResultSchema =
    z.object({
        inventoryUpdates:
            z.array(
                inventoryUpdateSchema,
            ).max(8),
    }).strict();

export const translationResultSchema =
    z.object({
        translation:
            z.string().max(20_000),
    }).strict();

export const translationBatchResultSchema =
    z.object({
        translations:
            z.array(
                z.object({
                    index:
                        z.number()
                            .int()
                            .min(0)
                            .max(255),
                    partIndex:
                        z.number()
                            .int()
                            .min(0)
                            .max(255),
                    text:
                        z.string()
                            .min(1)
                            .max(20_000),
                }).strict(),
            ).min(1)
                .max(256),
    }).strict();

const preTurnJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'schemaVersion',
        'temporal',
        'check',
    ],
    properties: {
        schemaVersion: {
            type: 'integer',
            const: SCHEMA_VERSION,
        },
        temporal: {
            type: 'object',
            additionalProperties: false,
            required: [
                'mode',
                'elapsedMinutes',
                'basis',
                'evidenceText',
                'reasonEn',
                'confidence',
            ],
            properties: {
                mode: {
                    type: 'string',
                    enum: TEMPORAL_MODES,
                },
                elapsedMinutes: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 10_080,
                },
                basis: {
                    type: 'string',
                    enum: TEMPORAL_BASES,
                },
                evidenceText: {
                    type: 'string',
                },
                reasonEn: {
                    type: 'string',
                },
                confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
            },
        },
        check: {
            type: 'object',
            additionalProperties: false,
            required: [
                'required',
                'ruleId',
                'targetActorId',
                'reasonEn',
                'confidence',
            ],
            properties: {
                required: {
                    type: 'boolean',
                },
                ruleId: {
                    type: 'string',
                    enum: CHECK_RULE_IDS,
                },
                targetActorId: {
                    type: 'string',
                },
                reasonEn: {
                    type: 'string',
                },
                confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
            },
        },
    },
};

const materialEventJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'type',
        'actorId',
        'objectTextEn',
        'sourceTextEn',
        'targetTextEn',
        'valueTextEn',
        'previousValueTextEn',
        'resultTextEn',
        'quantity',
        'operation',
        'slot',
        'hand',
        'persistence',
        'sourceKind',
        'evidenceText',
        'confidence',
    ],
    properties: {
        type: {
            type: 'string',
            enum: MATERIAL_EVENT_TYPES,
        },
        actorId: {
            type: 'string',
        },
        objectTextEn: {
            type: 'string',
        },
        sourceTextEn: {
            type: 'string',
        },
        targetTextEn: {
            type: 'string',
        },
        valueTextEn: {
            type: 'string',
        },
        previousValueTextEn: {
            type: 'string',
        },
        resultTextEn: {
            type: 'string',
        },
        quantity: {
            anyOf: [
                {
                    type: 'integer',
                    minimum: 1,
                    maximum: 1_000,
                },
                {
                    type: 'null',
                },
            ],
        },
        operation: {
            type: 'string',
            enum: MATERIAL_OPERATIONS,
        },
        slot: {
            type: 'string',
            enum: MATERIAL_SLOTS,
        },
        hand: {
            type: 'string',
            enum: [
                'left',
                'right',
                'both',
                'unspecified',
            ],
        },
        persistence: {
            type: 'string',
            enum: MATERIAL_PERSISTENCE,
        },
        sourceKind: {
            type: 'string',
            enum: [
                'player',
                'narrative',
            ],
        },
        evidenceText: {
            type: 'string',
            maxLength: 500,
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
        },
    },
};

const inventoryUpdateJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'id',
        'operation',
        'type',
        'labelEn',
        'appearanceEn',
        'ownerId',
        'holderId',
        'targetHolderId',
        'transferMode',
        'storyRoles',
        'visibility',
        'isEquipped',
        'held',
        'sourceKind',
        'evidenceText',
        'confidence',
    ],
    properties: {
        id: {
            type: 'string',
        },
        operation: {
            type: 'string',
            enum:
                INVENTORY_ACTIONS,
        },
        type: {
            type: 'string',
            enum:
                INVENTORY_TYPES,
        },
        labelEn: {
            type: 'string',
            maxLength: 200,
        },
        appearanceEn: {
            type: 'string',
            maxLength: 600,
        },
        ownerId: {
            type: 'string',
            maxLength: 96,
        },
        holderId: {
            type: 'string',
            maxLength: 96,
        },
        targetHolderId: {
            type: 'string',
            maxLength: 96,
        },
        transferMode: {
            type: 'string',
            enum:
                INVENTORY_TRANSFER_MODES,
        },
        storyRoles: {
            type: 'array',
            maxItems: 5,
            items: {
                type: 'string',
                enum:
                    INVENTORY_STORY_ROLES,
            },
        },
        visibility: {
            type: 'string',
            enum:
                INVENTORY_VISIBILITY,
        },
        isEquipped: {
            type: 'boolean',
        },
        held: {
            type: 'boolean',
        },
        sourceKind: {
            type: 'string',
            enum: [
                'player',
                'narrative',
            ],
        },
        evidenceText: {
            type: 'string',
            maxLength: 500,
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
        },
    },
};

const perceptionJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'version',
        'visualScope',
        'audibleScope',
        'salience',
        'attribution',
        'concealment',
        'directParticipantActorIds',
        'evidenceText',
        'confidence',
        'source',
    ],
    properties: {
        version: {
            type: 'integer',
            const: 1,
        },
        visualScope: {
            type: 'string',
            enum: VISUAL_SCOPES,
        },
        audibleScope: {
            type: 'string',
            enum: AUDIBLE_SCOPES,
        },
        salience: {
            type: 'string',
            enum:
                PERCEPTION_SALIENCE,
        },
        attribution: {
            type: 'string',
            enum:
                PERCEPTION_ATTRIBUTION,
        },
        concealment: {
            type: 'string',
            enum:
                PERCEPTION_CONCEALMENT,
        },
        directParticipantActorIds: {
            type: 'array',
            maxItems: 16,
            items: {
                type: 'string',
            },
        },
        evidenceText: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
        },
        source: {
            type: 'string',
            const:
                'post_turn_observer',
        },
    },
};

const postTurnJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'schemaVersion',
        'materialEvents',
        'eventBoundary',
        'actorUpdates',
        'identityObservations',
        'perception',
    ],
    properties: {
        schemaVersion: {
            type: 'integer',
            const: SCHEMA_VERSION,
        },
        materialEvents: {
            type: 'array',
            maxItems: 16,
            items:
                materialEventJsonSchema,
        },
        eventBoundary: {
            type: 'object',
            additionalProperties: false,
            required: [
                'ended',
                'reasonEn',
                'evidenceText',
                'confidence',
            ],
            properties: {
                ended: {
                    type: 'boolean',
                },
                reasonEn: {
                    type: 'string',
                    maxLength: 500,
                },
                evidenceText: {
                    type: 'string',
                    maxLength: 500,
                },
                confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
            },
        },
        actorUpdates: {
            type: 'array',
            maxItems: 16,
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'actorId',
                    'currentActivityEn',
                    'presence',
                    'roomId',
                    'evidenceText',
                    'confidence',
                ],
                properties: {
                    actorId: {
                        type: 'string',
                    },
                    currentActivityEn: {
                        type: 'string',
                        maxLength: 500,
                    },
                    presence: {
                        type: 'string',
                        enum: [
                            'unchanged',
                            'present',
                            'absent',
                        ],
                    },
                    roomId: {
                        type: 'string',
                    },
                    evidenceText: {
                        type: 'string',
                        maxLength: 500,
                    },
                    confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                    },
                },
            },
        },
        identityObservations: { type: 'array', maxItems: 16, items: IDENTITY_OBSERVATION_JSON_SCHEMA },
        perception: perceptionJsonSchema,
    },
};

const inventoryTurnJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'inventoryUpdates',
    ],
    properties: {
        inventoryUpdates: {
            type: 'array',
            maxItems: 8,
            items:
                inventoryUpdateJsonSchema,
        },
    },
};

export const translationJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'translation',
    ],
    properties: {
        translation: {
            type: 'string',
        },
    },
};

export const translationBatchJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'translations',
    ],
    properties: {
        translations: {
            type: 'array',
            minItems: 1,
            maxItems: 256,
            items: {
                type: 'object',
                additionalProperties:
                    false,
                required: [
                    'index',
                    'partIndex',
                    'text',
                ],
                properties: {
                    index: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 255,
                    },
                    partIndex: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 255,
                    },
                    text: {
                        type: 'string',
                    },
                },
            },
        },
    },
};

function rejectNonEnglishRecord({
    source,
    fields,
    taskId,
    recordId,
    fieldPrefix,
    diagnostics,
}) {
    const rejectedFields =
        fields.filter(field => {
            const value =
                String(
                    source?.[field] ||
                    '',
                ).trim();
            return value &&
                !isEnglishAuthorityText(
                    value,
                );
        });
    diagnostics.push(
        ...rejectedFields.map(field =>
            createModelLanguageMismatch({
                taskId,
                fieldPath:
                    `${fieldPrefix}.${field}`,
                recordId,
            })),
    );
    return rejectedFields.length > 0;
}

export function adoptLocalPreTurnLanguage(
    result,
) {
    const diagnostics = [];
    const temporal = {
        ...(result?.temporal || {}),
    };
    const check = {
        ...(result?.check || {}),
    };
    for (const [
        owner,
        fieldPrefix,
    ] of [
            [
                temporal,
                'temporal',
            ],
            [
                check,
                'check',
            ],
        ]) {
        if (
            String(
                owner.reasonEn ||
                '',
            ).trim() &&
            !isEnglishAuthorityText(
                owner.reasonEn,
            )
        ) {
            diagnostics.push(
                createModelLanguageMismatch({
                    taskId:
                        'local_pre_turn_adjudicator',
                    fieldPath:
                        `${fieldPrefix}.reasonEn`,
                }),
            );
            owner.reasonEn = '';
        }
    }
    return {
        result: {
            ...result,
            temporal,
            check,
        },
        diagnostics,
    };
}

export function adoptLocalPostTurnLanguage(
    result,
) {
    const diagnostics = [];
    const materialEvents = (
        result?.materialEvents ||
        []
    ).filter((event, index) =>
        !rejectNonEnglishRecord({
            source: event,
            fields: [
                'objectTextEn',
                'sourceTextEn',
                'targetTextEn',
                'valueTextEn',
                'previousValueTextEn',
                'resultTextEn',
            ],
            taskId:
                'local_post_turn_observer',
            recordId:
                String(
                    event?.id ||
                    index,
                ),
            fieldPrefix:
                `materialEvents[${index}]`,
            diagnostics,
        }));
    const actorUpdates = (
        result?.actorUpdates ||
        []
    ).filter((update, index) =>
        !rejectNonEnglishRecord({
            source: update,
            fields: [
                'currentActivityEn',
            ],
            taskId:
                'local_post_turn_observer',
            recordId:
                String(
                    update?.actorId ||
                    index,
                ),
            fieldPrefix:
                `actorUpdates[${index}]`,
            diagnostics,
        }));
    const identityObservations = (
        result?.identityObservations ||
        []
    ).filter((observation, index) =>
        !rejectNonEnglishRecord({
            source: observation,
            fields: [
                'injuryType',
                'description',
            ],
            taskId:
                'local_post_turn_observer',
            recordId:
                String(
                    observation
                        ?.actorId ||
                    index,
                ),
            fieldPrefix:
                `identityObservations[${index}]`,
            diagnostics,
        }));
    const eventBoundary = {
        ...(result?.eventBoundary ||
            {}),
    };
    if (
        String(
            eventBoundary.reasonEn ||
            '',
        ).trim() &&
        !isEnglishAuthorityText(
            eventBoundary.reasonEn,
        )
    ) {
        diagnostics.push(
            createModelLanguageMismatch({
                taskId:
                    'local_post_turn_observer',
                fieldPath:
                    'eventBoundary.reasonEn',
            }),
        );
        eventBoundary.reasonEn = '';
    }
    return {
        result: {
            ...result,
            materialEvents,
            eventBoundary,
            actorUpdates,
            identityObservations,
        },
        diagnostics,
    };
}

export function adoptLocalInventoryLanguage(
    result,
) {
    const diagnostics = [];
    const inventoryUpdates = (
        result?.inventoryUpdates ||
        []
    ).filter((update, index) =>
        !rejectNonEnglishRecord({
            source: update,
            fields: [
                'labelEn',
                'appearanceEn',
            ],
            taskId:
                'local_inventory_observer',
            recordId:
                String(
                    update?.id ||
                    index,
                ),
            fieldPrefix:
                `inventoryUpdates[${index}]`,
            diagnostics,
        }));
    return {
        result: {
            ...result,
            inventoryUpdates,
        },
        diagnostics,
    };
}

let requestQueue =
    Promise.resolve();
let ollamaChild = null;
let ollamaStartPromise = null;

function getSettings() {
    return {
        enabled:
            getConfigValue(
                'hogwartsMud.localSemantic.enabled',
                true,
                'boolean',
            ),
        apiUrl:
            String(
                process.env
                    .HOGWARTS_OLLAMA_URL ||
                getConfigValue(
                    'hogwartsMud.localSemantic.apiUrl',
                    DEFAULT_API_URL,
                ) ||
                DEFAULT_API_URL,
            ),
        model:
            String(
                process.env
                    .HOGWARTS_OLLAMA_MODEL ||
                getConfigValue(
                    'hogwartsMud.localSemantic.model',
                    DEFAULT_MODEL,
                ) ||
                DEFAULT_MODEL,
            ),
        inventoryModel:
            String(
                process.env
                    .HOGWARTS_OLLAMA_INVENTORY_MODEL ||
                getConfigValue(
                    'hogwartsMud.localSemantic.inventoryModel',
                    'qwen3:4b',
                ) ||
                'qwen3:4b',
            ),
        translationModel:
            String(
                process.env
                    .HOGWARTS_OLLAMA_TRANSLATION_MODEL ||
                getConfigValue(
                    'hogwartsMud.localSemantic.translationModel',
                    'qwen3:4b',
                ) ||
                'qwen3:4b',
            ),
        keepAlive:
            String(
                getConfigValue(
                    'hogwartsMud.localSemantic.keepAlive',
                    DEFAULT_KEEP_ALIVE,
                ) ||
                DEFAULT_KEEP_ALIVE,
            ),
        contextSize:
            Math.max(
                1_024,
                Math.min(
                    16_384,
                    Number(
                        getConfigValue(
                            'hogwartsMud.localSemantic.contextSize',
                            DEFAULT_CONTEXT_SIZE,
                            'number',
                        ),
                    ) ||
                    DEFAULT_CONTEXT_SIZE,
                ),
            ),
        timeoutMs:
            Math.max(
                5_000,
                Math.min(
                    300_000,
                    Number(
                        getConfigValue(
                            'hogwartsMud.localSemantic.timeoutMs',
                            DEFAULT_TIMEOUT_MS,
                            'number',
                        ),
                    ) ||
                    DEFAULT_TIMEOUT_MS,
                ),
            ),
    };
}

async function isOllamaReachable(
    settings,
) {
    const apiUrl =
        new URL(settings.apiUrl);
    apiUrl.pathname = '/api/tags';
    const controller =
        new AbortController();
    const timeout =
        setTimeout(
            () => controller.abort(),
            2_000,
        );
    timeout.unref?.();
    try {
        const response =
            await fetch(
                apiUrl,
                {
                    signal:
                        controller.signal,
                },
            );
        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

function findProjectOllamaBinary() {
    const candidates = [
        String(
            process.env
                .HOGWARTS_OLLAMA_BINARY ||
            '',
        ).trim(),
        path.join(
            PROJECT_ROOT,
            'data',
            '_cache',
            'ollama',
            'bin',
            'ollama',
        ),
        path.join(
            PROJECT_ROOT,
            'data',
            '_cache',
            'ollama',
            'ollama',
        ),
        path.join(
            PROJECT_ROOT,
            'data',
            '_cache',
            'ollama',
            'dist',
            'Ollama.app',
            'Contents',
            'Resources',
            'ollama',
        ),
        '/usr/local/bin/ollama',
        '/opt/homebrew/bin/ollama',
    ].filter(Boolean);
    return candidates.find(candidate =>
        fs.existsSync(candidate)) ||
        '';
}

async function ensureOllamaServer(
    settings,
) {
    if (
        await isOllamaReachable(
            settings,
        )
    ) {
        return;
    }
    if (ollamaStartPromise) {
        return ollamaStartPromise;
    }
    ollamaStartPromise =
        (async () => {
            const binary =
                findProjectOllamaBinary();
            if (!binary) {
                throw new Error(
                    'Ollama is not running and no local binary was found.',
                );
            }
            if (
                !ollamaChild ||
                ollamaChild.exitCode !==
                    null
            ) {
                const localHome =
                    path.join(
                        PROJECT_ROOT,
                        'data',
                        '_cache',
                        'ollama',
                        'home',
                    );
                const localModels =
                    path.join(
                        PROJECT_ROOT,
                        'data',
                        '_cache',
                        'ollama',
                        'models',
                    );
                fs.mkdirSync(
                    localHome,
                    {
                        recursive: true,
                    },
                );
                fs.mkdirSync(
                    localModels,
                    {
                        recursive: true,
                    },
                );
                const host =
                    new URL(
                        settings.apiUrl,
                    );
                ollamaChild =
                    spawn(
                        binary,
                        ['serve'],
                        {
                            cwd:
                                PROJECT_ROOT,
                            stdio: [
                                'ignore',
                                'ignore',
                                'pipe',
                            ],
                            env: {
                                ...process.env,
                                HOME:
                                    localHome,
                                OLLAMA_HOST:
                                    `${host.hostname}:${host.port || '11434'}`,
                                OLLAMA_MODELS:
                                    localModels,
                            },
                        },
                    );
                ollamaChild.stderr
                    ?.on(
                        'data',
                        chunk => {
                            const text =
                                String(
                                    chunk,
                                );
                            if (
                                /error|fatal/iu
                                    .test(text)
                            ) {
                                console.warn(
                                    '[Hogwarts MUD] Ollama:',
                                    text.trim(),
                                );
                            }
                        },
                    );
                ollamaChild.on(
                    'exit',
                    () => {
                        ollamaChild =
                            null;
                    },
                );
            }
            for (
                let attempt = 0;
                attempt < 20;
                attempt++
            ) {
                await new Promise(resolve =>
                    setTimeout(
                        resolve,
                        250,
                    ));
                if (
                    await isOllamaReachable(
                        settings,
                    )
                ) {
                    return;
                }
            }
            throw new Error(
                'Ollama did not become ready.',
            );
        })();
    try {
        await ollamaStartPromise;
    } finally {
        ollamaStartPromise = null;
    }
}

export function enqueueLocalSemanticOperation(operation) {
    const current =
        requestQueue.then(
            operation,
            operation,
        );
    requestQueue =
        current.catch(() => {});
    return current;
}

export async function callStructuredModel({
    taskId,
    system,
    input,
    jsonSchema,
    resultSchema,
    unload = false,
    modelOverride = '',
    contextSizeOverride = 0,
}) {
    const taskDefinition =
        getModelTaskDefinition(
            taskId,
        );
    if (
        !taskDefinition ||
        !taskDefinition.allowedTiers
            .includes('local') ||
        ![
            'local_observer',
            'utility',
        ].includes(
            taskDefinition.kind,
        )
    ) {
        throw new TypeError(
            `Unknown local model task ${taskId || '?'}.`,
        );
    }
    const settings = getSettings();
    if (!settings.enabled) {
        throw new Error(
            'Local semantic adjudicator is disabled.',
        );
    }
    await ensureOllamaServer(
        settings,
    );
    const apiUrl =
        new URL(settings.apiUrl);
    apiUrl.pathname = '/api/chat';
    const controller =
        new AbortController();
    const timeout =
        setTimeout(
            () => controller.abort(),
            settings.timeoutMs,
        );
    timeout.unref?.();
    try {
        const response =
            await fetch(
                apiUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        model:
                            modelOverride ||
                            settings.model,
                        messages: [
                            {
                                role:
                                    'system',
                                content:
                                    system,
                            },
                            {
                                role:
                                    'user',
                                content:
                                    JSON.stringify(
                                        input,
                                    ),
                            },
                        ],
                        stream: false,
                        think: false,
                        format:
                            jsonSchema,
                        keep_alive:
                            unload
                                ? 0
                                : settings
                                    .keepAlive,
                        options: {
                            temperature: 0,
                            num_ctx:
                                Math.max(
                                    settings
                                        .contextSize,
                                    Number(
                                        contextSizeOverride ||
                                        0,
                                    ),
                                ),
                            seed: 42,
                        },
                    }),
                    signal:
                        controller.signal,
                },
            );
        if (!response.ok) {
            throw new Error(
                `Ollama ${response.status}: ${(
                    await response.text()
                ).slice(0, 1_000)}`,
            );
        }
        const payload =
            await response.json();
        const content =
            String(
                payload
                    ?.message
                    ?.content ||
                '',
            ).trim();
        if (!content) {
            throw new Error(
                'Ollama returned no structured content.',
            );
        }
        const parsed =
            resultSchema.parse(
                JSON.parse(content),
            );
        return {
            result: parsed,
            diagnostics: {
                taskId,
                schemaVersion:
                    SCHEMA_VERSION,
                model:
                    String(
                        payload.model ||
                        modelOverride ||
                        settings.model,
                    ),
                totalDuration:
                    Number(
                        payload
                            .total_duration ||
                        0,
                    ),
                loadDuration:
                    Number(
                        payload
                            .load_duration ||
                        0,
                    ),
                promptTokens:
                    Number(
                        payload
                            .prompt_eval_count ||
                        0,
                    ),
                outputTokens:
                    Number(
                        payload
                            .eval_count ||
                        0,
                    ),
                unloaded:
                    Boolean(unload),
            },
        };
    } finally {
        clearTimeout(timeout);
    }
}

const PRE_TURN_SYSTEM = `You are a deterministic semantic adjudicator for a persistent text RPG. Classify only what the player actually attempts in this turn.

playerTurnSequence is authoritative:
- action entries are enacted now.
- direct_speech and broadcast_speech entries are spoken words, not actions.
- A future plan, question, hypothetical, recollection, or quoted word such as "class", "wait", "sleep", or "travel" must not consume that future duration.

Temporal rules:
- elapsedMinutes is a count of MINUTES. Eight hours is 480 minutes; two hours is 120 minutes.
- Every non-magical ordinary or uncertain action consumes at least 15 minutes.
- instantaneous and values below 15 are reserved for an explicitly cast instantaneous spell.
- Brief conversation, ordinary object handling, sitting down, pushing someone, or one immediate social exchange consumes 15 minutes.
- "Continue class" without explicitly finishing or waiting through the class is exactly a representative 15-minute turn, not a whole class.
- Use an event or schedule boundary only when the player explicitly completes, waits through, sleeps through, or skips to that boundary.
- When movementResolution.moved is true, respect its route minutes.
- basis route is legal only when movementResolution.moved is true. basis explicit is legal only when the enacted action contains an explicit duration.
- Never expand time merely because the request contains many questions or the eventual prose may be long.

Check rules:
- A check is required only for a meaningful uncertain attempted action with consequences.
- Ordinary conversation, asking questions, attending class, waiting, sleeping, handing over an object, sitting down, or deterministic movement requires no check.
- Physical force, stealth, theft, persuasion, deception, investigation under uncertainty, or spellcasting may require a check.
- Actively trying to read, identify, copy, or understand a visible spell under uncertainty (blurred writing, distance, concealment, unfamiliar technique, interruption, or time pressure) requires one perception or intellect check. Merely hearing that a spell exists does not.
- forcedCheck is a boolean input. When it is false, never use forced_general.
- Select one supplied ruleId and one supplied present actor ID only. Use none when no check is required.
- forcedCheck=true always requires forced_general when no more specific rule applies.
- targetActorId must be empty when there is no check.

Calibration examples:
1. action "*挤在哈利旁边坐下，把纸笔塞给他*" plus speech "你等下一起上课吗？" => elapsedMinutes 15, mode ordinary, basis estimated, check.required false, ruleId none.
2. action "*继续和同学们一起上课*" => elapsedMinutes 15, mode ordinary, basis estimated, no check.
3. action "*一直上完这节课，再收拾书包离开*" => mode event_boundary, use the plausible remaining class duration in minutes, no check.
4. action "*坐在这里等了两个小时*" => elapsedMinutes 120, mode explicit_duration, basis explicit, no check.
5. action "*睡了八个小时，第二天早上醒来*" => elapsedMinutes 480, mode sleep, basis explicit, no check.
6. action "*用力把面前的男孩推倒*" => elapsedMinutes 15, check.required true, ruleId physical_force.
7. direct speech "我要推理一下你为什么不肯签名" => elapsedMinutes 15, check.required false. The word 推理 is quoted speech, not an enacted investigation.
8. action "*眯着眼睛辨认黑板上模糊的咒语*" => elapsedMinutes 15, check.required true, ruleId perception.`;

const POST_TURN_SYSTEM = `You are a sparse observer of an already-written RPG turn. Extract only explicit observable changes from playerAction and narrativeSegments.

Material rules:
- Return only physical changes that should persist beyond the sentence: placement, movement, removal, damage, repair, dirt, cleaning, outfit, accessory, hairstyle, visible condition, or held object.
- Do not treat incidental food, ordinary gestures, metaphors, comparisons, schedules, or unchanged surroundings as material events.
- Actor walking between rooms is an actor update, never a material event.
- Changing clothes uses outfit_changed. Do not encode clothing as scene_adjusted.
- evidenceText must be an exact substring of the selected player or narrative source.
- evidenceText must be one concise sentence or clause no longer than 500 characters. Never copy the full narrative.
- Use only supplied actor IDs. Empty actorId is allowed only for scene changes with no identifiable actor.
- Never use permanent persistence.
- Leave irrelevant fields as empty strings. Do not invent previous values, hands, quantities, source objects, or targets.

Event boundary rules:
- ended is true only when the bounded interaction or procedure visibly closes, such as the focal actor leaving, the task completing, or the parties disengaging.
- A focal actor walking out of the current interaction sets ended true.
- Completing one ordinary physical action, changing clothes, placing an item, or finishing a sentence does not by itself end the surrounding event.
- evidenceText must be an exact substring of one narrativeSegments[].textEn value. Use an empty string when ended is false.
- Boundary evidence must be one concise sentence no longer than 500 characters.

Actor rules:
- Return only actors whose observable current activity, presence, or room changed.
- Use only supplied actor and room IDs.
- An absent actor cannot enter merely because their name or belonging is mentioned.
- Mark absent only when the actor visibly leaves the current interaction.
- Prior currentActivityEn and existingActorUpdates describe old state. They are context, never evidence.
- evidenceText must be an exact substring of a narrative segment, not a field name such as currentActivityEn or playerAction.
- Actor evidence must be one concise sentence no longer than 500 characters.
- Keep actor updates sparse and evidence-based.

${IDENTITY_OBSERVATION_SYSTEM_RULES}
Perception rules:
- Return exactly one primary event perception for the enacted turn. Describe how the completed result could be perceived, not merely what the player intended.
- visualScope is none, target, nearby, room, or area. audibleScope is none, target, nearby, room, or adjacent.
- directParticipantActorIds contains only supplied actor IDs directly affected by or deliberately exchanging the event. Do not return witnesses, observers, cohorts, room occupants, or invented IDs.
- A failed covert action that causes a visible or audible public result keeps concealment attempted and uses the scope of the actual result.
- A genuinely successful concealed action uses concealment successful. Whispers and passed notes normally use target scope unless the narrative explicitly exposes them.
- evidenceText must be one exact non-empty substring of playerAction or a narrative segment and no longer than 500 characters.
- Never output witnessActorIds, witnessCohortIds, witnessBasis, or any final witness list.
- attribution is clear only when the observable result clearly identifies its actor. Ambiguous or unknown attribution still records the event itself.
- source must be post_turn_observer.

Calibration examples:
1. Narrative "Harry turned and walked through the great doors into the Entrance Hall, leaving the breakfast table behind." => no material event; eventBoundary ended true; one Harry actor update with presence absent, roomId entrance_hall, and that exact sentence as evidence.
2. Player "Tina把二十八只玩具熊排列在床头，然后换上条纹睡衣。" => object_placed for the bears and outfit_changed for striped pyjamas. No updates for unrelated actors.
3. Pure dialogue with no physical or presence change => empty materialEvents, actorUpdates, and identityObservations; perception still describes that primary exchange.
4. A failed secret spell sends Ron into the rafters in front of class => visualScope room, audibleScope room, concealment attempted, Ron as a direct participant.
5. A note quietly passed to Harry without discovery => visualScope target, audibleScope none, concealment successful, Harry as a direct participant.`;

const INVENTORY_TURN_SYSTEM = `You are a conservative Item V2 proposal observer for an already-written RPG turn. Extract only durable story items whose ownership, holder, location, social meaning, clue/promise value, signature identity, or future state can matter.

Rules:
- playerAction and narrativeText are the only evidence sources. inventory is context, never evidence.
- A pair such as 【物品操作:carry｜携带】 followed by 【物品:stable_item_id｜label】 is authoritative player intent and object selection. Reuse that exact inventory ID; never substitute a similarly named Item.
- The structured pair does not prove success. Emit the requested operation only when narrativeText observably completes or changes the Item state. For give/lend, the natural action or narrative must identify the recipient.
- A malformed, orphaned, hidden, or unknown-ID directive must not produce an inventory update.
- Return an empty array unless an exact source clause establishes acquire, carry, place, equip, unequip, give, lend, consume, damage, clean, lose, or destroy.
- A signed autograph, personal letter, key, wand, map, named keepsake, clue-bearing document, promise token, socially meaningful gift, or signature accessory may become a new candidate.
- Ignore food, drinks, wrappers, cutlery, generic quills, generic books, classroom supplies, routine shop stock, ordinary uniforms, generic clothing and everyday objects unless the player deliberately marks one for retention, the completed event gives it social/plot significance, or the object is visibly given, lent, borrowed, returned, or stolen.
- Ordinary identity-appropriate objects remain implicit and receive no ID, quantity or history.
- A completed gift, loan, return, or theft crosses the implicit-item boundary even for an ordinary quill, book, classroom supply, or everyday object. Emit a proposal so owner and holder can remain distinct. For a new borrowed object, use operation acquire, preserve the lender as ownerId, set the borrower as holderId, and use transferMode loan.
- New candidates use operation acquire and a stable descriptive snake_case ID. They are only proposals; the player decides whether to record them.
- Existing possessions must reuse a supplied inventory ID.
- Every proposal requires an accurate English labelEn and objective appearanceEn. Do not output translated display fields.
- ownerId is the social/legal owner. holderId is the current holder. A gift changes both; a loan or theft changes holderId but preserves ownerId.
- targetHolderId is required only for give/lend. Use empty string otherwise.
- storyRoles may include signature, social, clue, promise, keepsake. Use an empty array when none apply.
- visibility is public for visibly known objects, owner_known for ordinary NPC signature belongings, and hidden only when the player has not observed the object.
- held is true only when the item is physically in hand at turn end. isEquipped is true only when worn.
- sourceKind player selects playerAction; sourceKind narrative selects narrativeText.
- evidenceText must be one exact source substring no longer than 500 characters. Never paraphrase, cite inventory, or invent a sentence.
- Do not infer ownership from proximity. If another actor takes the item away and the player does not retain it, return no acquisition.

Example: playerAction "Tina拿起哈利签过名的羊皮纸并带着它去上课" => acquire one document candidate owned and held by player, storyRoles social and keepsake, using that exact clause as evidence.`;

const INVENTORY_CANDIDATE_ITEM_PATTERN =
    /(?:\b(?:autograph|signed (?:parchment|note|paper|book)|letter|key|wand|map|journal|diary|ring|ribbon|glasses|spectacles|amulet|artifact|heirloom|keepsake|permit|token|quill|pen|textbook)\b|签名|签过名|亲笔签名|信件|钥匙|魔杖|地图|日记|戒指|丝带|眼镜|护符|魔法物品|传家宝|纪念品|许可证|信物|羽毛笔|钢笔|课本)/iu;
const INVENTORY_CANDIDATE_POSSESSION_PATTERN =
    /(?:\b(?:acquire|equip|unequip|take|takes|took|pick(?:ed)? up|receive[ds]?|accept(?:ed)?|claim(?:ed)?|keep|kept|carry|carried|hold(?:ing)?|held|clamped on|wear|wore|remove[ds]?|give|gave|lend|lent|borrow|place[ds]?|put|consume[ds]?|break|broke|damage[ds]?|clean[eds]?|wash(?:ed)?|lose|lost|destroy(?:ed)?)\b|获得|携带|拿起|拿到|拿走|收下|收到|接过|认领|保留|留着|带着|握着|攥着|手里|随身|装进|放下|放置|穿戴|穿上|戴上|脱下|摘下|赠送|送给|借出|借给|借来|消耗|吃掉|喝掉|损坏|打坏|清洗|洗净|丢失|弄丢|销毁|摧毁|放进口袋|放进包)/iu;

function shouldObserveInventory(
    input,
) {
    const source = [
        input?.playerAction,
        input?.narrativeText,
    ]
        .filter(Boolean)
        .join('\n');
    const normalizedSource =
        source.normalize('NFKC')
            .toLocaleLowerCase();
    const inventory =
        Array.isArray(input?.inventory)
            ? input.inventory
            : [];
    const mentionsTrackedItem =
        inventory
            .flatMap(item => [
                item?.labelEn,
                item?.label,
                item?.appearanceEn,
            ])
            .map(value =>
                String(value || '')
                    .normalize('NFKC')
                    .toLocaleLowerCase()
                    .trim())
            .filter(value =>
                value.length >= 2)
            .some(value =>
                normalizedSource.includes(
                    value,
                ));
    return (
        INVENTORY_CANDIDATE_ITEM_PATTERN
            .test(source) ||
        mentionsTrackedItem
    ) &&
        INVENTORY_CANDIDATE_POSSESSION_PATTERN
            .test(source);
}

export const TRANSLATION_SYSTEM = `你是哈利·波特文字 RPG 的专业英译简中翻译器。英文是权威原文，中文只用于显示。

要求：
- 完整翻译输入中的全部英文，不得总结、删节、续写、解释或改变事实。
- 使用自然、流畅、有叙事感的现代简体中文；对白应符合人物年龄和语气，旁白保留英式冷幽默。
- 保留段落、打断、引号、强调、数字和专有格式。
- 短标题和短标签只给出一个简洁译名，不附加括号中的第二种译法。
- “Name, age N,” 这类同位语表示人物年龄，必须译为“N 岁”，不得误作章节或序号。
- 如实保留动作、物质和空间关系，不把沾染、摆放、移动等物理事实改写成比喻。
- 咒语名称和咒文必须逐字保留原文（例如 Wingardium Leviosa、Expelliarmus、Expecto Patronum），不得翻译、音译或添加中文括注；只翻译咒语周围的叙述。
- 除逐字保留的咒语、URL 和占位符外，输出不得残留任何英文单词；Year、Scene、Storyline、Current、flick、swish 等普通英文必须译成中文。
- 输入可能是中英混排；其中中文是已经锁定的术语，必须保留，并把其余所有英文完整译成中文。
- glossary 中的 source 必须使用对应 target，不得自行改译。
- 所有形如 [[HPMUD_...]] 的占位符必须逐字原样保留，顺序和数量不得改变。
- 不要翻译或改写占位符内部内容。
- 输出 JSON 前逐字检查最终 translation；除 HPMUD 占位符和 URL 外，只要仍有 A-Z 或 a-z 字母，就必须先译成中文，不能原样返回。
- 只返回符合 JSON Schema 的 translation 字段。`;

export const TRANSLATION_BATCH_SYSTEM = `你是哈利·波特文字 RPG 的专业英译简中翻译器。英文是权威原文，中文只用于显示。

要求：
- segments 中每一项独立完整翻译，不得总结、删节、合并、拆分、续写、解释或改变事实。
- 每个输出项必须逐字复制对应输入的 index 和 partIndex；不得缺项、重复或新增 ID。
- 使用自然、流畅、有叙事感的现代简体中文；短标题和短标签只给出一个简洁译名。
- 保留每项中的段落、打断、引号、强调、数字和专有格式。
- 咒语名称和咒文必须逐字保留原文，不得翻译、音译或添加中文括注。
- 除逐字保留的咒语、URL 和术语占位符外，每个 text 都不得残留任何英文单词；Year、Scene、Storyline、Current、flick、swish 等普通英文必须译成中文。
- 输入可能中英混排；已有中文和 glossary 锁定术语必须原样保留。
- 所有形如 ⟦术语0⟧ 的术语占位符必须逐字原样保留。
- text 中不得输出 [[HPMUD_<index>_<partIndex>]] 字段边界标记。
- 输出 JSON 前逐项逐字检查每个 text；除 ⟦术语0⟧ 这类占位符和 URL 外，只要仍有 A-Z 或 a-z 字母，就必须先译成中文，不能原样返回。
- 只返回符合 JSON Schema 的 translations 数组。`;

function getTranslationMarkers(
    text,
    pattern,
) {
    return (
        String(text || '')
            .match(
                pattern,
            ) ||
        []
    ).map(marker =>
        marker.replace(
            /\s+/gu,
            '',
        ));
}

function normalizeGeneratedTranslation(
    value,
) {
    return String(value || '')
        .replace(
            /【\s*HPMUD_(?:TERM_)?\d+(?:_\d+)?\s*】/giu,
            '',
        )
        .replace(
            /\[\[\s*HPM:\s*\d+(?:[._:]\d+)?\s*\]\]/giu,
            '',
        )
        .trim();
}

export function parseProtectedTranslationSegments(
    source,
) {
    const input =
        String(source || '');
    const pattern =
        /\[\[\s*HPMUD_(\d+)_(\d+)\s*\]\]\s*([\s\S]*?)(?=\[\[\s*HPMUD_\d+_\d+\s*\]\]|$)/gu;
    const segments = [
        ...input.matchAll(
            pattern,
        ),
    ].map(match => ({
        index:
            Number(match[1]),
        partIndex:
            Number(match[2]),
        marker:
            `[[HPMUD_${
                Number(match[1])
            }_${
                Number(match[2])
            }]]`,
        text:
            String(
                match[3] ||
                '',
            ).trim(),
    }));
    const sourceMarkers =
        getTranslationMarkers(
            input,
            /\[\[\s*HPMUD_\d+_\d+\s*\]\]/gu,
        );
    const identities =
        new Set(
            segments.map(segment =>
                `${
                    segment.index
                }:${
                    segment.partIndex
                }`),
        );
    if (
        sourceMarkers.length !==
            segments.length ||
        identities.size !==
            segments.length ||
        segments.some(segment =>
            !segment.text)
    ) {
        throw new Error(
            'Local translation input has invalid protected segment boundaries.',
        );
    }
    return segments;
}

export function restoreStructuredTranslationSegments(
    sourceSegments,
    translations,
) {
    const expected =
        new Map(
            sourceSegments.map(
                segment => [
                    `${
                        segment.index
                    }:${
                        segment.partIndex
                    }`,
                    segment,
                ],
            ),
        );
    const translated =
        new Map();
    for (const entry of (
        translations || []
    )) {
        const identity =
            `${
                Number(entry?.index)
            }:${
                Number(
                    entry?.partIndex,
                )
            }`;
        const text =
            normalizeGeneratedTranslation(
                entry?.text,
            );
        if (
            !expected.has(identity) ||
            translated.has(identity) ||
            !text
        ) {
            throw new Error(
                'Local translation changed structured segment identities.',
            );
        }
        translated.set(
            identity,
            text,
        );
    }
    if (
        translated.size !==
        expected.size
    ) {
        throw new Error(
            'Local translation changed structured segment identities.',
        );
    }
    return sourceSegments
        .map(segment =>
            `${segment.marker} ${
                translated.get(
                    `${
                        segment.index
                    }:${
                        segment.partIndex
                    }`,
                )
            }`)
        .join('\n');
}

export function translateText(
    text,
    {
        model = '',
        unload = true,
        glossary = [],
    } = {},
) {
    return enqueueLocalSemanticOperation(async () => {
        const source =
            String(
                text || '',
            );
        if (
            !source.trim() ||
            source.length >
                12_000
        ) {
            throw new Error(
                'Local translation input is empty or too large.',
            );
        }
        const settings =
            getSettings();
        const normalizedGlossary =
            (
                Array.isArray(
                    glossary,
                )
                    ? glossary
                    : []
            )
                .slice(0, 96)
                .map(entry => ({
                    source:
                        String(
                            entry?.source ||
                            '',
                        ).slice(
                            0,
                            200,
                        ),
                    target:
                        String(
                            entry?.target ||
                            '',
                        ).slice(
                            0,
                            200,
                        ),
                }))
                .filter(entry =>
                    entry.source &&
                    entry.target);
        const sourceMarkers =
            getTranslationMarkers(
                source,
                /\[\[\s*HPMUD_\d+_\d+\s*\]\]/gu,
            );
        const sourceTermMarkers =
            [
                ...new Set(
                    getTranslationMarkers(
                        source,
                        /⟦\s*术语\s*\d+\s*⟧/gu,
                    ),
                ),
            ].sort();
        const sourceSegments =
            parseProtectedTranslationSegments(
                source,
            );
        const usesStructuredBatch =
            sourceSegments.length > 0;
        const translated =
            await callStructuredModel({
                taskId:
                    'local_translation',
                system:
                    usesStructuredBatch
                        ? TRANSLATION_BATCH_SYSTEM
                        : TRANSLATION_SYSTEM,
                input:
                    usesStructuredBatch
                        ? {
                            segments:
                                sourceSegments
                                    .map(segment => ({
                                        index:
                                            segment.index,
                                        partIndex:
                                            segment
                                                .partIndex,
                                        text:
                                            segment.text,
                                    })),
                            glossary:
                                normalizedGlossary,
                        }
                        : {
                            text: source,
                            glossary:
                                normalizedGlossary,
                        },
                jsonSchema:
                    usesStructuredBatch
                        ? translationBatchJsonSchema
                        : translationJsonSchema,
                resultSchema:
                    usesStructuredBatch
                        ? translationBatchResultSchema
                        : translationResultSchema,
                unload,
                modelOverride:
                    model ||
                    settings
                        .translationModel,
                contextSizeOverride:
                    8_192,
            });
        let translation =
            usesStructuredBatch
                ? restoreStructuredTranslationSegments(
                    sourceSegments,
                    translated
                        .result
                        .translations,
                )
                : normalizeGeneratedTranslation(
                    translated
                        .result
                        .translation,
                );
        let translatedMarkers =
            getTranslationMarkers(
                translation,
                /\[\[\s*HPMUD_\d+_\d+\s*\]\]/gu,
            );
        if (
            sourceMarkers.length ===
                1 &&
            translatedMarkers.length ===
                0
        ) {
            translation =
                `${sourceMarkers[0]} ${translation}`;
            translatedMarkers = [
                sourceMarkers[0],
            ];
        }
        const translatedTermMarkers =
            [
                ...new Set(
                    getTranslationMarkers(
                        translation,
                        /⟦\s*术语\s*\d+\s*⟧/gu,
                    ),
                ),
            ].sort();
        const unknownTermMarkers =
            translatedTermMarkers
                .filter(marker =>
                    !sourceTermMarkers
                        .includes(
                            marker,
                        ));
        if (
            JSON.stringify(
                translatedMarkers,
            ) !==
                JSON.stringify(
                    sourceMarkers,
                ) ||
            JSON.stringify(
                translatedTermMarkers,
            ) !==
                JSON.stringify(
                    sourceTermMarkers,
                ) ||
            unknownTermMarkers.length
        ) {
            throw new Error(
                `Local translation changed protected placeholders: fields=${JSON.stringify(sourceMarkers)} translatedFields=${JSON.stringify(translatedMarkers)} sourceTerms=${JSON.stringify(sourceTermMarkers)} translatedTerms=${JSON.stringify(translatedTermMarkers)} unknownTerms=${JSON.stringify(unknownTermMarkers)}`,
            );
        }
        return {
            translation,
            diagnostics:
                translated
                    .diagnostics,
        };
    });
}

export function adjudicateTurn(
    input,
    {
        model = '',
    } = {},
) {
    return enqueueLocalSemanticOperation(async () => {
        const modeled =
            await callStructuredModel({
                taskId:
                'local_pre_turn_adjudicator',
                system:
                PRE_TURN_SYSTEM,
                input,
                jsonSchema:
                preTurnJsonSchema,
                resultSchema:
                preTurnResultSchema,
                modelOverride: model,
            });
        const adopted =
            adoptLocalPreTurnLanguage(
                modeled.result,
            );
        return {
            ...modeled,
            result: adopted.result,
            diagnostics: {
                ...modeled.diagnostics,
                languageMismatches:
                    adopted.diagnostics,
                languageMismatchCount:
                    adopted.diagnostics
                        .length,
            },
        };
    });
}

export function validateObservedPerception(
    perception,
    input = {},
) {
    const parsed =
        perceptionSchema.safeParse(
            perception,
        );
    if (!parsed.success) {
        return {
            valid: false,
            error:
                'Perception does not match the post-turn schema.',
        };
    }
    const allowedActorIds =
        new Set(
            (
                Array.isArray(
                    input.actors,
                )
                    ? input.actors
                    : []
            )
                .map(actor =>
                    String(
                        actor?.id ||
                        '',
                    ))
                .filter(Boolean),
        );
    if (
        parsed.data
            .directParticipantActorIds
            .some(actorId =>
                !allowedActorIds
                    .has(actorId))
    ) {
        return {
            valid: false,
            error:
                'Perception references an actor ID outside the supplied observer context.',
        };
    }
    const sourceTexts = [
        String(
            input.playerAction ||
            '',
        ),
        ...(
            Array.isArray(
                input.narrativeSegments,
            )
                ? input
                    .narrativeSegments
                : []
        ).map(segment =>
            String(
                segment?.textEn ||
                '',
            )),
    ];
    if (
        !sourceTexts.some(text =>
            text.includes(
                parsed.data
                    .evidenceText,
            ))
    ) {
        return {
            valid: false,
            error:
                'Perception evidenceText is not grounded in playerAction or a narrative segment.',
        };
    }
    return {
        valid: true,
        value: parsed.data,
        error: '',
    };
}

export function observeTurn(
    input,
    {
        model = '',
        inventoryModel = '',
    } = {},
) {
    return enqueueLocalSemanticOperation(async () => {
        const narrativeText =
            (
                input
                    ?.narrativeSegments ||
                []
            )
                .map(segment =>
                    String(
                        segment
                            ?.textEn ||
                        '',
                    ))
                .filter(Boolean)
                .join('\n');
        const normalizedInput = {
            ...(input || {}),
            narrativeText,
        };
        const inventory =
            normalizedInput.inventory ||
            [];
        const coreInput = {
            ...normalizedInput,
        };
        delete coreInput.inventory;
        delete coreInput.narrativeText;
        const coreModel =
            await callStructuredModel({
                taskId:
                    'local_post_turn_observer',
                system:
                    POST_TURN_SYSTEM,
                input:
                    coreInput,
                jsonSchema:
                    postTurnJsonSchema,
                resultSchema:
                    postTurnResultSchema,
                unload: true,
                modelOverride: model,
            });
        const coreAdoption =
            adoptLocalPostTurnLanguage(
                coreModel.result,
            );
        const core = {
            ...coreModel,
            result:
                coreAdoption.result,
            diagnostics: {
                ...coreModel.diagnostics,
                languageMismatches:
                    coreAdoption
                        .diagnostics,
                languageMismatchCount:
                    coreAdoption
                        .diagnostics
                        .length,
            },
        };
        const perceptionValidation =
            validateObservedPerception(
                core.result
                    .perception,
                coreInput,
            );
        core.result.perception =
            perceptionValidation.valid
                ? perceptionValidation
                    .value
                : null;
        let inventoryUpdates = [];
        let inventoryDiagnostics =
            null;
        if (
            shouldObserveInventory(
                normalizedInput,
            )
        ) {
            try {
                const settings =
                    getSettings();
                const inventoryResult =
                    await callStructuredModel({
                        taskId:
                            'local_inventory_observer',
                        system:
                            INVENTORY_TURN_SYSTEM,
                        input: {
                            playerAction:
                                String(
                                    normalizedInput
                                        ?.playerAction ||
                                    '',
                                ),
                            narrativeText:
                                narrativeText,
                            inventory,
                        },
                        jsonSchema:
                            inventoryTurnJsonSchema,
                        resultSchema:
                            inventoryTurnResultSchema,
                        unload: true,
                        modelOverride:
                            inventoryModel ||
                            settings
                                .inventoryModel,
                    });
                const inventoryAdoption =
                    adoptLocalInventoryLanguage(
                        inventoryResult
                            .result,
                    );
                inventoryUpdates =
                    inventoryAdoption
                        .result
                        .inventoryUpdates;
                inventoryDiagnostics =
                    {
                        ...inventoryResult
                            .diagnostics,
                        languageMismatches:
                            inventoryAdoption
                                .diagnostics,
                        languageMismatchCount:
                            inventoryAdoption
                                .diagnostics
                                .length,
                    };
            } catch (error) {
                console.warn(
                    '[Hogwarts MUD] Local inventory observation unavailable; omitting optional item updates',
                    error,
                );
            }
        }
        return {
            result: {
                ...core.result,
                inventoryUpdates,
            },
            diagnostics: {
                ...core.diagnostics,
                perceptionRejected:
                    !perceptionValidation
                        .valid,
                perceptionError:
                    perceptionValidation
                        .error,
                inventoryModel:
                    inventoryDiagnostics
                        ?.model ||
                    '',
                inventoryDuration:
                    inventoryDiagnostics
                        ?.totalDuration ||
                    0,
                inventoryTaskId:
                    inventoryDiagnostics
                        ?.taskId ||
                    '',
                languageMismatches: [
                    ...(
                        core.diagnostics
                            .languageMismatches ||
                        []
                    ),
                    ...(
                        inventoryDiagnostics
                            ?.languageMismatches ||
                        []
                    ),
                ],
                languageMismatchCount:
                    Number(
                        core.diagnostics
                            .languageMismatchCount ||
                        0,
                    ) +
                    Number(
                        inventoryDiagnostics
                            ?.languageMismatchCount ||
                        0,
                    ),
            },
        };
    });
}

export async function getLocalSemanticStatus() {
    const settings = getSettings();
    try {
        await ensureOllamaServer(
            settings,
        );
    } catch {
        // Status response below reports the connection failure.
    }
    const apiUrl =
        new URL(settings.apiUrl);
    apiUrl.pathname = '/api/tags';
    const controller =
        new AbortController();
    const timeout =
        setTimeout(
            () => controller.abort(),
            Math.min(
                settings.timeoutMs,
                10_000,
            ),
        );
    timeout.unref?.();
    try {
        const response =
            await fetch(
                apiUrl,
                {
                    signal:
                        controller.signal,
                },
            );
        if (!response.ok) {
            throw new Error(
                `Ollama ${response.status}`,
            );
        }
        const payload =
            await response.json();
        return {
            available: true,
            configuredModel:
                settings.model,
            models:
                (payload.models || [])
                    .map(item =>
                        item.name)
                    .filter(Boolean),
        };
    } catch (error) {
        return {
            available: false,
            configuredModel:
                settings.model,
            models: [],
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 500),
        };
    } finally {
        clearTimeout(timeout);
    }
}

export const LOCAL_SEMANTIC_SCHEMA_VERSION =
    SCHEMA_VERSION;
