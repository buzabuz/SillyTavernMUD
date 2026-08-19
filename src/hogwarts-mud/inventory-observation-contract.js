import { z } from 'zod';

import {
    isEnglishAuthorityText,
} from '../../public/scripts/extensions/hogwarts-mud/domain/model-language-adoption.js';
import {
    getTaskPromptBudgetPolicy,
    measurePromptMessages,
} from '../../public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js';

export const DYNAMIC_INVENTORY_CONTEXT_SIZE =
    4_096;
export const DYNAMIC_INVENTORY_TASK_ID =
    'local_inventory_observer';
export const DYNAMIC_INVENTORY_MIN_CONFIDENCE =
    0.65;

export const INVENTORY_OBSERVATION_RESULT_DESCRIPTOR =
    Object.freeze({
        maximumItems: 8,
        fields: Object.freeze({
            id: Object.freeze({
                kind: 'string',
                maximumLength: 80,
            }),
            operation: Object.freeze({
                kind: 'enum',
                values: Object.freeze([
                    'acquire',
                    'carry',
                    'place',
                    'equip',
                    'unequip',
                    'give',
                    'lend',
                    'consume',
                    'damage',
                    'clean',
                    'lose',
                    'destroy',
                ]),
            }),
            type: Object.freeze({
                kind: 'enum',
                values: Object.freeze([
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
                ]),
            }),
            labelEn: Object.freeze({
                kind: 'string',
                maximumLength: 200,
            }),
            appearanceEn: Object.freeze({
                kind: 'string',
                maximumLength: 600,
            }),
            ownerId: Object.freeze({
                kind: 'string',
                maximumLength: 96,
            }),
            holderId: Object.freeze({
                kind: 'string',
                maximumLength: 96,
            }),
            targetHolderId: Object.freeze({
                kind: 'string',
                maximumLength: 96,
            }),
            transferMode: Object.freeze({
                kind: 'enum',
                values: Object.freeze([
                    'none',
                    'gift',
                    'loan',
                    'theft',
                    'return',
                ]),
            }),
            storyRoles: Object.freeze({
                kind: 'enum_array',
                maximumItems: 5,
                values: Object.freeze([
                    'signature',
                    'social',
                    'clue',
                    'promise',
                    'keepsake',
                ]),
            }),
            visibility: Object.freeze({
                kind: 'enum',
                values: Object.freeze([
                    'public',
                    'owner_known',
                    'hidden',
                ]),
            }),
            isEquipped: Object.freeze({
                kind: 'boolean',
            }),
            held: Object.freeze({
                kind: 'boolean',
            }),
            sourceKind: Object.freeze({
                kind: 'enum',
                values: Object.freeze([
                    'player',
                    'narrative',
                ]),
            }),
            evidenceText: Object.freeze({
                kind: 'string',
                maximumLength: 500,
            }),
            evidenceItemText: Object.freeze({
                kind: 'string',
                maximumLength: 300,
            }),
            physicalForm: Object.freeze({
                kind: 'enum',
                values: Object.freeze([
                    'whole',
                    'remains',
                    'absent',
                    'unknown',
                ]),
            }),
            confidence: Object.freeze({
                kind: 'number',
                minimum: 0,
                maximum: 1,
            }),
        }),
    });

export const DYNAMIC_INVENTORY_SYSTEM = `You are the routed Inventory observer for one completed RPG turn.

Authority:
- The post-turn observer already selected this route. Do not reroute it.
- Only playerAction and narrativeSegments are evidence; inventory is context.
- evidenceText is one exact source substring. evidenceItemText is its exact Item-identifying substring. Never paraphrase or invent evidence.
- Existing possessions reuse a supplied inventory ID; never substitute a similar name.
- Return an empty array unless an exact source clause establishes acquire, carry, place, equip, unequip, give, lend, consume, damage, clean, lose, or destroy.
- Every proposal requires an accurate English labelEn and objective appearanceEn. Do not output translated display fields.

Item rules:
- A pair such as 【物品操作:carry｜携带】 followed by 【物品:stable_item_id｜label】 is authoritative player intent and object selection, but does not prove success.
- New candidates require durable identity, clue, promise, social, retention, or plot value.
- Keep generic quills, generic books, classroom supplies, food, drinks, tableware, uniforms, clothing, and shop stock implicit unless a completed retention, gift, loan, return, or theft makes the specific object persistent.
- A completed gift, loan, return, or theft crosses the implicit-item boundary.
- A newly tracked transferred object uses operation acquire plus transferMode gift, loan, theft, or return. Use give/lend only for an existing supplied inventory ID.
- ownerId is the legal owner. holderId is the current holder. A gift changes both; a loan or theft changes holderId but preserves ownerId.
- targetHolderId is only for give/lend. held means physically in hand at turn end; isEquipped means worn.
- physicalForm is whole for intact Items. For destroy, absent requires explicit no remaining matter; remains requires surviving fragments, ash, or wreckage; otherwise unknown.

Return exactly the supplied JSON Schema.`;

export class DynamicInventoryInputError
    extends TypeError {}

const narrativeSegmentSchema =
    z.object({
        type:
            z.enum([
                'narration',
                'dialogue',
            ]),
        actorId:
            z.string()
                .max(96),
        textEn:
            z.string()
                .min(1)
                .max(4_000),
    }).strict();

const inventoryContextSchema =
    z.object({
        id:
            z.string()
                .min(1)
                .max(80),
        labelEn:
            z.string()
                .max(200),
        label:
            z.string()
                .max(200),
        appearanceEn:
            z.string()
                .max(600),
        type:
            z.string()
                .max(64),
        ownerId:
            z.string()
                .max(96),
        holderId:
            z.string()
                .max(96),
        state:
            z.string()
                .max(64),
        isEquipped:
            z.boolean(),
    }).strict();

const dynamicInventoryInputSchema =
    z.object({
        playerAction:
            z.string()
                .max(8_000),
        narrativeSegments:
            z.array(
                narrativeSegmentSchema,
            ).max(24),
        inventory:
            z.array(
                inventoryContextSchema,
            ).max(128),
    }).strict();

function fieldZodSchema(field) {
    switch (field.kind) {
        case 'string':
            return z.string()
                .max(
                    field.maximumLength,
                );
        case 'enum':
            return z.enum(
                field.values,
            );
        case 'enum_array':
            return z.array(
                z.enum(
                    field.values,
                ),
            ).max(
                field.maximumItems,
            );
        case 'boolean':
            return z.boolean();
        case 'number':
            return z.number()
                .min(
                    field.minimum,
                )
                .max(
                    field.maximum,
                );
        default:
            throw new TypeError(
                `Unknown Inventory descriptor kind ${field.kind || '?'}.`,
            );
    }
}

function fieldJsonSchema(field) {
    switch (field.kind) {
        case 'string':
            return {
                type: 'string',
                maxLength:
                    field.maximumLength,
            };
        case 'enum':
            return {
                type: 'string',
                enum: field.values,
            };
        case 'enum_array':
            return {
                type: 'array',
                maxItems:
                    field.maximumItems,
                items: {
                    type: 'string',
                    enum: field.values,
                },
            };
        case 'boolean':
            return {
                type: 'boolean',
            };
        case 'number':
            return {
                type: 'number',
                minimum:
                    field.minimum,
                maximum:
                    field.maximum,
            };
        default:
            throw new TypeError(
                `Unknown Inventory descriptor kind ${field.kind || '?'}.`,
            );
    }
}

export function createDynamicInventoryResultSchema() {
    const fields =
        INVENTORY_OBSERVATION_RESULT_DESCRIPTOR
            .fields;
    return z.object({
        inventoryUpdates:
            z.array(
                z.object(
                    Object.fromEntries(
                        Object.entries(
                            fields,
                        ).map(([
                            fieldName,
                            field,
                        ]) => [
                            fieldName,
                            fieldZodSchema(
                                field,
                            ),
                        ]),
                    ),
                ).strict(),
            ).max(
                INVENTORY_OBSERVATION_RESULT_DESCRIPTOR
                    .maximumItems,
            ),
    }).strict();
}

export function createDynamicInventoryJsonSchema() {
    const fields =
        INVENTORY_OBSERVATION_RESULT_DESCRIPTOR
            .fields;
    return {
        type: 'object',
        additionalProperties: false,
        required: [
            'inventoryUpdates',
        ],
        properties: {
            inventoryUpdates: {
                type: 'array',
                maxItems:
                    INVENTORY_OBSERVATION_RESULT_DESCRIPTOR
                        .maximumItems,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required:
                        Object.keys(
                            fields,
                        ),
                    properties:
                        Object.fromEntries(
                            Object.entries(
                                fields,
                            ).map(([
                                fieldName,
                                field,
                            ]) => [
                                fieldName,
                                fieldJsonSchema(
                                    field,
                                ),
                            ]),
                        ),
                },
            },
        },
    };
}

export function normalizeDynamicInventoryInput(
    input,
) {
    let parsed;
    try {
        parsed =
            dynamicInventoryInputSchema
                .parse(input);
    } catch (error) {
        throw new DynamicInventoryInputError(
            String(
                error?.message ||
                error,
            ),
        );
    }
    const inventoryIds =
        parsed.inventory.map(item =>
            item.id);
    if (
        new Set(inventoryIds).size !==
        inventoryIds.length
    ) {
        throw new DynamicInventoryInputError(
            'Dynamic Inventory context must not contain duplicate Item IDs.',
        );
    }
    return parsed;
}

export function createDynamicInventoryModelRequest(
    input,
) {
    const normalizedInput =
        normalizeDynamicInventoryInput(
            input,
        );
    const resultSchema =
        createDynamicInventoryResultSchema();
    const jsonSchema =
        createDynamicInventoryJsonSchema();
    const promptMeasurement =
        measurePromptMessages(
            [
                {
                    role: 'system',
                    content:
                        DYNAMIC_INVENTORY_SYSTEM,
                },
                {
                    role: 'user',
                    content:
                        JSON.stringify(
                            normalizedInput,
                        ),
                },
            ],
            {
                transportJsonSchema:
                    jsonSchema,
            },
        );
    const budget =
        getTaskPromptBudgetPolicy(
            DYNAMIC_INVENTORY_TASK_ID,
        );
    if (
        promptMeasurement.characters >
        budget.maximumCharacters
    ) {
        throw new RangeError(
            `Dynamic Inventory Prompt requires ${promptMeasurement.characters} characters, above ${budget.maximumCharacters}.`,
        );
    }
    return {
        normalizedInput,
        system:
            DYNAMIC_INVENTORY_SYSTEM,
        input:
            normalizedInput,
        jsonSchema,
        resultSchema,
        promptMeasurement,
    };
}

function reject(
    rejections,
    index,
    code,
) {
    rejections.push({
        index,
        code,
    });
}

export function guardDynamicInventoryResult(
    source,
    normalizedInput,
) {
    const parsed =
        createDynamicInventoryResultSchema()
            .parse(source);
    const seenIds =
        new Set();
    const inventoryUpdates = [];
    const rejections = [];
    parsed.inventoryUpdates.forEach((
        update,
        index,
    ) => {
        if (
            seenIds.has(update.id)
        ) {
            reject(
                rejections,
                index,
                'duplicate_item_id',
            );
            return;
        }
        const sourceText =
            update.sourceKind ===
                'player'
                ? normalizedInput
                    .playerAction
                : normalizedInput
                    .narrativeSegments
                    .map(segment =>
                        segment.textEn)
                    .join('\n');
        const evidenceText =
            String(
                update.evidenceText ||
                '',
            ).trim();
        if (
            !evidenceText ||
            !sourceText.includes(
                evidenceText,
            )
        ) {
            reject(
                rejections,
                index,
                'ungrounded_evidence',
            );
            return;
        }
        const evidenceItemText =
            String(
                update.evidenceItemText ||
                '',
            ).trim();
        if (
            !evidenceItemText ||
            !evidenceText.includes(
                evidenceItemText,
            )
        ) {
            reject(
                rejections,
                index,
                'ungrounded_item_evidence',
            );
            return;
        }
        if (
            update.confidence <
            DYNAMIC_INVENTORY_MIN_CONFIDENCE
        ) {
            reject(
                rejections,
                index,
                'confidence_below_threshold',
            );
            return;
        }
        if (
            !isEnglishAuthorityText(
                update.labelEn,
            ) ||
            !isEnglishAuthorityText(
                update.appearanceEn,
            )
        ) {
            reject(
                rejections,
                index,
                'non_english_authority_text',
            );
            return;
        }
        seenIds.add(update.id);
        inventoryUpdates.push(update);
    });
    return {
        inventoryUpdates,
        rejections,
    };
}
