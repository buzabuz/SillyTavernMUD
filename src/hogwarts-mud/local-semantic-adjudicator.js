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
import {
    parseExactDurationMinutes,
} from '../../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import { getConfigValue } from '../util.js';
import {
    PRE_TURN_EVIDENCE_ROUTE_JSON_SCHEMA,
    PRE_TURN_EVIDENCE_ROUTE_SCHEMA,
    validatePreTurnCalendarCommitment,
} from './pre-turn-route-contract.js';
import {
    createPreTurnSystemPrompt,
} from './pre-turn-system-prompt.js';
import { settlePreTurnCheck } from './pre-turn-check-contract.js';
import {
    POST_TURN_SYSTEM,
} from './post-turn-system-prompt.js';
import {
    postTurnJsonSchema,
    postTurnResultSchema,
} from './post-turn-transport-contract.js';

export {
    validatePreTurnCalendarCommitment,
    settlePreTurnCheck,
};

const SCHEMA_VERSION = 1;
const DEFAULT_API_URL =
    'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3:1.7b';
const DEFAULT_KEEP_ALIVE = '60s';
const DEFAULT_CONTEXT_SIZE = 4096;
const DEFAULT_TIMEOUT_MS = 120_000;
export const POST_TURN_CONTEXT_SIZE =
    4_096;
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

const TEMPORAL_KINDS = [
    'instantaneous',
    'ordinary',
    'explicit_duration',
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
const TEMPORAL_CLAIM_KINDS = [
    'absolute_clock',
    'relative_duration',
    'named_time',
    'schedule',
    'calendar_date',
];
const TEMPORAL_CLAIM_RELATIONS = [
    'none',
    'before',
    'after',
    'until',
    'till',
    'later',
    'earlier',
    'ago',
    'past',
];

const confidenceSchema =
    z.number().min(0).max(1);

const preTurnResultSchema =
    z.object({
        schemaVersion:
            z.literal(SCHEMA_VERSION),
        temporal: z.object({
            kind:
                z.enum(TEMPORAL_KINDS),
            evidenceText:
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
            rollMode:
                z.enum([
                    'normal',
                    'advantage',
                    'disadvantage',
                ]),
            reasonEn:
                z.string().max(500),
            confidence:
                confidenceSchema,
        }).strict(),
        calendarCommitment:
            PRE_TURN_EVIDENCE_ROUTE_SCHEMA,
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

const temporalClaimSchema =
    z.object({
        kind:
            z.enum(
                TEMPORAL_CLAIM_KINDS,
            ),
        evidenceText:
            z.string()
                .min(1)
                .max(500),
        confidence:
            confidenceSchema,
    }).strict();
const settledTemporalClaimSchema =
    temporalClaimSchema.extend({
        clock:
            z.string()
                .max(5),
        durationMinutes:
            z.number()
                .int()
                .min(0)
                .max(10_080),
        relation:
            z.enum(
                TEMPORAL_CLAIM_RELATIONS,
            ),
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
        'calendarCommitment',
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
                'kind',
                'evidenceText',
                'confidence',
            ],
            properties: {
                kind: {
                    type: 'string',
                    enum: TEMPORAL_KINDS,
                },
                evidenceText: {
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
                'rollMode',
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
                rollMode: {
                    type: 'string',
                    enum: [
                        'normal',
                        'advantage',
                        'disadvantage',
                    ],
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
        calendarCommitment:
            PRE_TURN_EVIDENCE_ROUTE_JSON_SCHEMA,
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
                'evidenceText',
            ],
            taskId:
                'post_turn_semantic_proposal',
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
                'evidenceText',
            ],
            taskId:
                'post_turn_semantic_proposal',
            recordId:
                String(
                    update?.actorId ||
                    index,
                ),
            fieldPrefix:
                `actorUpdates[${index}]`,
            diagnostics,
        }));
    return {
        result: {
            ...result,
            materialEvents,
            actorUpdates,
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
    exactContextSize = 0,
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
                            num_ctx: exactContextSize || Math.max(
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

export function createPreTurnModelRequest(
    input,
) {
    return {
        taskId:
            'local_pre_turn_adjudicator',
        system:
            createPreTurnSystemPrompt(
                input,
            ),
        input,
        jsonSchema:
            preTurnJsonSchema,
        resultSchema:
            preTurnResultSchema,
    };
}

export function settlePreTurnTemporal(
    temporal,
    input = {},
) {
    const ordinary = {
        mode: 'ordinary',
        elapsedMinutes: 15,
        basis: 'estimated',
        evidenceText: '',
        reasonEn:
            'Deterministic ordinary-turn policy settled fifteen minutes.',
        confidence:
            Number(
                temporal
                    ?.confidence ||
                0,
            ),
    };
    if (
        temporal?.kind ===
        'instantaneous'
    ) {
        return {
            valid: true,
            value: {
                mode:
                    'instantaneous',
                elapsedMinutes: 1,
                basis: 'estimated',
                evidenceText:
                    String(
                        temporal
                            .evidenceText ||
                        '',
                    ),
                reasonEn:
                    'The model identified an enacted instantaneous spell; deterministic policy settled one minute.',
                confidence:
                    temporal
                        .confidence,
            },
            error: '',
        };
    }
    if (
        temporal?.kind !==
        'explicit_duration'
    ) {
        return {
            valid: true,
            value: ordinary,
            error: '',
        };
    }
    const evidenceText =
        String(
            temporal.evidenceText ||
            '',
        ).trim();
    const enacted =
        (
            input.playerTurnSequence ||
            []
        ).some(entry =>
            entry?.type ===
                'action' &&
            String(
                entry.text ??
                entry.textEn ??
                '',
            ).includes(
                evidenceText,
            ));
    if (
        !evidenceText ||
        !enacted
    ) {
        return {
            valid: false,
            value: ordinary,
            error:
                'Explicit duration evidence is not grounded in one enacted action entry.',
        };
    }
    const parsed =
        parseExactDurationMinutes(
            evidenceText,
        );
    if (!parsed.valid) {
        return {
            valid: false,
            value: ordinary,
            error:
                `Explicit duration grammar rejected the evidence: ${parsed.error}.`,
        };
    }
    return {
        valid: true,
        value: {
            mode:
                'explicit_duration',
            elapsedMinutes:
                parsed.minutes,
            basis: 'explicit',
            evidenceText,
            reasonEn:
                'Deterministic exact-duration grammar converted the enacted evidence to minutes.',
            confidence:
                temporal
                    .confidence,
        },
        error: '',
    };
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
                ...createPreTurnModelRequest(
                    input,
                ),
                modelOverride: model,
            });
        const calendarCommitmentValidation =
            validatePreTurnCalendarCommitment(
                modeled.result
                    .calendarCommitment,
                input,
            );
        const temporalSettlement =
            settlePreTurnTemporal(
                modeled.result
                    .temporal,
                input,
            );
        const checkSettlement =
            settlePreTurnCheck(
                modeled.result.check,
            );
        const adopted =
            adoptLocalPreTurnLanguage(
                {
                    ...modeled.result,
                    calendarCommitment:
                        calendarCommitmentValidation
                            .value,
                    check:
                        checkSettlement
                            .value,
                    temporal:
                        temporalSettlement
                            .value,
                },
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
                calendarCommitmentRejected:
                    !calendarCommitmentValidation
                        .valid,
                calendarCommitmentError:
                    calendarCommitmentValidation
                        .error,
                temporalRejected:
                    !temporalSettlement
                        .valid,
                temporalError:
                    temporalSettlement
                        .error,
                checkNormalized:
                    checkSettlement
                        .normalized,
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

function isExactClockClaim(
    value,
) {
    const source =
        String(value || '');
    const parts =
        source.split(':');
    if (
        parts.length !== 2 ||
        parts[0].length !== 2 ||
        parts[1].length !== 2 ||
        ![
            ...parts[0],
            ...parts[1],
        ].every(character =>
            character >= '0' &&
            character <= '9')
    ) {
        return false;
    }
    const hour =
        Number(parts[0]);
    const minute =
        Number(parts[1]);
    return hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59;
}

export function validateObservedTemporalClaims(
    temporalClaims,
    input = {},
) {
    const parsed =
        z.array(
            settledTemporalClaimSchema,
        ).max(16)
            .safeParse(
                temporalClaims,
            );
    if (!parsed.success) {
        return {
            values: [],
            errors: [
                'Temporal claims do not match the post-turn schema.',
            ],
        };
    }
    const narrativeTexts = (
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
        ));
    const values = [];
    const errors = [];
    parsed.data.forEach(
        (
            claim,
            index,
        ) => {
            if (
                !narrativeTexts
                    .some(text =>
                        text.includes(
                            claim
                                .evidenceText,
                        ))
            ) {
                errors.push(
                    `temporalClaims[${index}] evidenceText is not grounded in a narrative segment.`,
                );
                return;
            }
            if (
                claim.kind ===
                    'absolute_clock'
            ) {
                if (
                    !isExactClockClaim(
                        claim.clock,
                    ) ||
                    claim.durationMinutes !==
                        0 ||
                    claim.relation !==
                        'none'
                ) {
                    errors.push(
                        `temporalClaims[${index}] has an invalid absolute-clock normalization.`,
                    );
                    return;
                }
            } else if (
                claim.kind ===
                    'relative_duration'
            ) {
                if (
                    claim.clock ||
                    claim.durationMinutes <=
                        0 ||
                    claim.relation ===
                        'none'
                ) {
                    errors.push(
                        `temporalClaims[${index}] has an invalid relative-duration normalization.`,
                    );
                    return;
                }
            } else if (
                claim.clock ||
                claim.durationMinutes !==
                    0 ||
                claim.relation !==
                    'none'
            ) {
                errors.push(
                    `temporalClaims[${index}] has fields that do not belong to ${claim.kind}.`,
                );
                return;
            }
            values.push(claim);
        },
    );
    return {
        values,
        errors,
    };
}

export function createPostTurnModelRequest(
    input,
) {
    return {
        taskId:
            'post_turn_semantic_proposal',
        system:
            POST_TURN_SYSTEM,
        input,
        jsonSchema:
            postTurnJsonSchema,
        resultSchema:
            postTurnResultSchema,
        unload: true,
        exactContextSize:
            POST_TURN_CONTEXT_SIZE,
    };
}

export function parsePostTurnModelResult(
    rawResult,
) {
    if (
        rawResult &&
        typeof rawResult ===
            'object' &&
        !Array.isArray(
            rawResult,
        )
    ) {
        return postTurnResultSchema.parse(
            rawResult,
        );
    }
    if (
        typeof rawResult !==
            'string' ||
        !rawResult.trim()
    ) {
        throw new TypeError(
            'Post-turn model result must be one JSON object.',
        );
    }
    return postTurnResultSchema.parse(
        JSON.parse(
            rawResult,
        ),
    );
}

export function settlePostTurnModelResult(
    input,
    rawResult,
    diagnostics = {},
) {
    const coreInput =
        input || {};
    const parsed =
        parsePostTurnModelResult(
            rawResult,
        );
    const coreAdoption =
        adoptLocalPostTurnLanguage(
            parsed,
        );
    const perceptionValidation =
        validateObservedPerception(
            coreAdoption.result
                .perception,
            coreInput,
        );
    const temporalClaimsValidation =
        validateObservedTemporalClaims(
            coreAdoption.result
                .temporalClaims,
            coreInput,
        );
    return {
        result: {
            ...coreAdoption.result,
            perception:
                perceptionValidation.valid
                    ? perceptionValidation
                        .value
                    : null,
            temporalClaims:
                temporalClaimsValidation
                    .values,
        },
        diagnostics: {
            ...diagnostics,
            languageMismatches:
                coreAdoption
                    .diagnostics,
            languageMismatchCount:
                coreAdoption
                    .diagnostics
                    .length,
            perceptionRejected:
                !perceptionValidation
                    .valid,
            perceptionError:
                perceptionValidation
                    .error,
            temporalClaimsRejected:
                temporalClaimsValidation
                    .errors.length,
            temporalClaimErrors:
                temporalClaimsValidation
                    .errors,
        },
    };
}

export function observeTurn(
    input,
    {
        model = '',
    } = {},
) {
    return enqueueLocalSemanticOperation(async () => {
        const coreInput =
            input || {};
        const coreModel =
            await callStructuredModel({
                ...createPostTurnModelRequest(
                    coreInput,
                ),
                modelOverride: model,
            });
        return settlePostTurnModelResult(
            coreInput,
            coreModel.result,
            coreModel.diagnostics,
        );
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
