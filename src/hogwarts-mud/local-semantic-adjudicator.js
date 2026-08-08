import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fetch from 'node-fetch';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';
import { z } from 'zod';

import { getConfigValue } from '../util.js';

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
    'acquire',
    'update',
    'carry',
    'equip',
    'store',
    'consume',
    'lose',
];
const INVENTORY_IMPORTANCE = [
    'key',
    'important',
    'ordinary',
];
const INVENTORY_CUSTODY = [
    'carried',
    'equipped',
    'stored',
    'consumed',
    'lost',
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
        objectText:
            z.string().max(300),
        sourceText:
            z.string().max(300),
        targetText:
            z.string().max(300),
        valueText:
            z.string().max(300),
        previousValueText:
            z.string().max(300),
        resultText:
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
        action:
            z.enum(
                INVENTORY_ACTIONS,
            ),
        labelEn:
            z.string().max(200),
        labelZh:
            z.string().max(200),
        detailEn:
            z.string().max(600),
        detailZh:
            z.string().max(600),
        importance:
            z.enum(
                INVENTORY_IMPORTANCE,
            ),
        custody:
            z.enum(
                INVENTORY_CUSTODY,
            ),
        ownerId:
            z.string().max(96),
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

const translationResultSchema =
    z.object({
        translation:
            z.string().max(20_000),
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
        'objectText',
        'sourceText',
        'targetText',
        'valueText',
        'previousValueText',
        'resultText',
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
        objectText: {
            type: 'string',
        },
        sourceText: {
            type: 'string',
        },
        targetText: {
            type: 'string',
        },
        valueText: {
            type: 'string',
        },
        previousValueText: {
            type: 'string',
        },
        resultText: {
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
        'action',
        'labelEn',
        'labelZh',
        'detailEn',
        'detailZh',
        'importance',
        'custody',
        'ownerId',
        'sourceKind',
        'evidenceText',
        'confidence',
    ],
    properties: {
        id: {
            type: 'string',
        },
        action: {
            type: 'string',
            enum:
                INVENTORY_ACTIONS,
        },
        labelEn: {
            type: 'string',
            maxLength: 200,
        },
        labelZh: {
            type: 'string',
            maxLength: 200,
        },
        detailEn: {
            type: 'string',
            maxLength: 600,
        },
        detailZh: {
            type: 'string',
            maxLength: 600,
        },
        importance: {
            type: 'string',
            enum:
                INVENTORY_IMPORTANCE,
        },
        custody: {
            type: 'string',
            enum:
                INVENTORY_CUSTODY,
        },
        ownerId: {
            type: 'string',
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
        perception:
            perceptionJsonSchema,
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

const translationJsonSchema = {
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

function enqueue(operation) {
    const current =
        requestQueue.then(
            operation,
            operation,
        );
    requestQueue =
        current.catch(() => {});
    return current;
}

async function callStructuredModel({
    system,
    input,
    jsonSchema,
    resultSchema,
    unload = false,
    modelOverride = '',
    contextSizeOverride = 0,
}) {
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
                                    `${system}\n\nReturn only data matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`,
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
7. direct speech "我要推理一下你为什么不肯签名" => elapsedMinutes 15, check.required false. The word 推理 is quoted speech, not an enacted investigation.`;

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
- evidenceText must be an exact substring of narrativeText. Use an empty string when ended is false.
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
3. Pure dialogue with no physical or presence change => empty materialEvents and actorUpdates; perception still describes that primary exchange.
4. A failed secret spell sends Ron into the rafters in front of class => visualScope room, audibleScope room, concealment attempted, Ron as a direct participant.
5. A note quietly passed to Harry without discovery => visualScope target, audibleScope none, concealment successful, Harry as a direct participant.`;

const INVENTORY_TURN_SYSTEM = `You are a conservative inventory observer for an already-written RPG turn. Extract only durable story possessions explicitly acquired, retained, carried, equipped, stored, consumed, or lost by the player.

Rules:
- playerAction and narrativeText are the only evidence sources. inventory is context, never evidence.
- Return an empty array unless an exact source clause explicitly shows the player taking, receiving, claiming, keeping, carrying, holding, storing, consuming, or losing a durable story item.
- A signed autograph, personal letter, key, wand, map, named keepsake, clue-bearing document, or similarly durable artifact is important or key when the player keeps it.
- Ignore food, drinks, wrappers, cutlery, generic quills, generic books, classroom supplies, clothing mentioned only as scenery, and objects handled only by NPCs.
- New possessions use action acquire, ownerId player, custody carried or equipped, and a stable descriptive snake_case ID.
- Existing possessions must reuse a supplied inventory ID.
- New acquisitions require accurate English and Simplified Chinese labels and details.
- sourceKind player selects playerAction; sourceKind narrative selects narrativeText.
- evidenceText must be one exact source substring no longer than 500 characters. Never paraphrase, cite inventory, or invent a sentence.
- Do not infer ownership from proximity. If another actor takes the item away and the player does not retain it, return no acquisition.

Example: playerAction "Tina拿起哈利签过名的羊皮纸并带着它去上课" => acquire one important signed parchment owned by player, using that exact clause as evidence.`;

const INVENTORY_CANDIDATE_ITEM_PATTERN =
    /(?:\b(?:autograph|signed (?:parchment|note|paper|book)|letter|key|wand|map|journal|diary|ring|amulet|artifact|heirloom|keepsake|permit|token)\b|签名|签过名|亲笔签名|信件|钥匙|魔杖|地图|日记|戒指|护符|魔法物品|传家宝|纪念品|许可证|信物)/iu;
const INVENTORY_CANDIDATE_POSSESSION_PATTERN =
    /(?:\b(?:take|takes|took|pick(?:ed)? up|receive[ds]?|accept(?:ed)?|claim(?:ed)?|keep|kept|carry|carried|hold(?:ing)?|held|clamped on|put .* (?:bag|pocket))\b|拿起|拿到|拿走|收下|收到|接过|认领|保留|留着|带着|握着|攥着|手里|随身|装进|放进口袋|放进包)/iu;

function shouldObserveInventory(
    input,
) {
    const source = [
        input?.playerAction,
        input?.narrativeText,
    ]
        .filter(Boolean)
        .join('\n');
    return INVENTORY_CANDIDATE_ITEM_PATTERN
        .test(source) &&
        INVENTORY_CANDIDATE_POSSESSION_PATTERN
            .test(source);
}

const TRANSLATION_SYSTEM = `你是哈利·波特文字 RPG 的专业英译简中翻译器。英文是权威原文，中文只用于显示。

要求：
- 完整翻译输入中的全部英文，不得总结、删节、续写、解释或改变事实。
- 使用自然、流畅、有叙事感的现代简体中文；对白应符合人物年龄和语气，旁白保留英式冷幽默。
- 保留段落、打断、引号、强调、数字和专有格式。
- 短标题和短标签只给出一个简洁译名，不附加括号中的第二种译法。
- “Name, age N,” 这类同位语表示人物年龄，必须译为“N 岁”，不得误作章节或序号。
- 如实保留动作、物质和空间关系，不把沾染、摆放、移动等物理事实改写成比喻。
- 咒语名称和咒文必须逐字保留原文（例如 Wingardium Leviosa、Expelliarmus、Expecto Patronum），不得翻译、音译或添加中文括注；只翻译咒语周围的叙述。
- 输入可能是中英混排；其中中文是已经锁定的术语，必须保留，并把其余所有英文完整译成中文。
- glossary 中的 source 必须使用对应 target，不得自行改译。
- 所有形如 [[HPMUD_...]] 的占位符必须逐字原样保留，顺序和数量不得改变。
- 不要翻译或改写占位符内部内容。
- 只返回符合 JSON Schema 的 translation 字段。`;

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

export function translateText(
    text,
    {
        model = '',
        unload = true,
        glossary = [],
    } = {},
) {
    return enqueue(async () => {
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
                        /\[\[\s*HPMUD_TERM_\d+\s*\]\]/gu,
                    ),
                ),
            ].sort();
        const translated =
            await callStructuredModel({
                system:
                    TRANSLATION_SYSTEM,
                input: {
                    text: source,
                    glossary:
                        normalizedGlossary,
                },
                jsonSchema:
                    translationJsonSchema,
                resultSchema:
                    translationResultSchema,
                unload,
                modelOverride:
                    model ||
                    settings
                        .translationModel,
                contextSizeOverride:
                    8_192,
            });
        let translation =
            normalizeGeneratedTranslation(
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
                        /\[\[\s*HPMUD_TERM_\d+\s*\]\]/gu,
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
            unknownTermMarkers.length
        ) {
            throw new Error(
                `Local translation changed protected placeholders: fields=${JSON.stringify(sourceMarkers)} translatedFields=${JSON.stringify(translatedMarkers)} unknownTerms=${JSON.stringify(unknownTermMarkers)}`,
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
    return enqueue(() =>
        callStructuredModel({
            system:
                PRE_TURN_SYSTEM,
            input,
            jsonSchema:
                preTurnJsonSchema,
            resultSchema:
                preTurnResultSchema,
            modelOverride: model,
        }));
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
    return enqueue(async () => {
        const {
            inventory = [],
            ...coreInput
        } = input || {};
        const core =
            await callStructuredModel({
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
                input,
            )
        ) {
            try {
                const settings =
                    getSettings();
                const inventoryResult =
                    await callStructuredModel({
                        system:
                            INVENTORY_TURN_SYSTEM,
                        input: {
                            playerAction:
                                String(
                                    input
                                        ?.playerAction ||
                                    '',
                                ),
                            narrativeText:
                                String(
                                    input
                                        ?.narrativeText ||
                                    '',
                                ),
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
                inventoryUpdates =
                    inventoryResult
                        .result
                        .inventoryUpdates;
                inventoryDiagnostics =
                    inventoryResult
                        .diagnostics;
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
