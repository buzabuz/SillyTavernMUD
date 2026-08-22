import { z } from 'zod';

import {
    getTaskPromptBudgetPolicy,
    measurePromptMessages,
} from '../../public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js';
import { getConfigValue } from '../util.js';
import {
    DYNAMIC_IDENTITY_SYSTEM,
    createDynamicIdentityModelRequest,
    guardDynamicIdentityResult,
} from './dynamic-identity-observer.js';
import {
    DYNAMIC_INVENTORY_SYSTEM,
    createDynamicInventoryModelRequest,
    guardDynamicInventoryResult,
} from './inventory-observation-contract.js';
import {
    callStructuredModel,
    enqueueLocalSemanticOperation,
} from './local-semantic-adjudicator.js';

export const DYNAMIC_TURN_CONTEXT_SIZE =
    4_096;
export const DYNAMIC_TURN_TASK_ID =
    'local_dynamic_turn_observer';

const DEFAULT_DYNAMIC_MODEL =
    'qwen3:4b';
const DYNAMIC_TURN_HEADER =
    'Complete only requestedTasks for the same completed RPG turn. Return exactly the fields present in the supplied JSON Schema. Never add, copy, or infer work for an unrequested section.';

function configuredDynamicModel() {
    return String(
        process.env
            .HOGWARTS_OLLAMA_DYNAMIC_MODEL ||
        process.env
            .HOGWARTS_OLLAMA_INVENTORY_MODEL ||
        getConfigValue(
            'hogwartsMud.localSemantic.dynamicModel',
            getConfigValue(
                'hogwartsMud.localSemantic.inventoryModel',
                DEFAULT_DYNAMIC_MODEL,
            ),
        ) ||
        DEFAULT_DYNAMIC_MODEL,
    );
}

function zeroPromptMeasurement() {
    return {
        characters: 0,
        messageCharacters: 0,
        transportSchemaCharacters: 0,
        sections: [],
    };
}

function assertSharedNarrative(
    identityRequest,
    inventoryRequest,
) {
    if (
        !identityRequest ||
        !inventoryRequest
    ) {
        return;
    }
    const identitySegments =
        identityRequest
            .normalizedInput
            .narrativeSegments;
    const inventorySegments =
        inventoryRequest
            .normalizedInput
            .narrativeSegments;
    if (
        JSON.stringify(
            identitySegments,
        ) !==
        JSON.stringify(
            inventorySegments,
        )
    ) {
        throw new TypeError(
            'Shared dynamic Turn sections must use the same narrative segments.',
        );
    }
}

export function createDynamicTurnSystem(
    requestedTasks,
) {
    const sections = [];
    if (
        requestedTasks.includes(
            'inventory',
        )
    ) {
        sections.push(
            `INVENTORY:\n${DYNAMIC_INVENTORY_SYSTEM}`,
        );
    }
    if (
        requestedTasks.includes(
            'identity',
        )
    ) {
        sections.push(
            `IDENTITY:\n${DYNAMIC_IDENTITY_SYSTEM}`,
        );
    }
    return [
        DYNAMIC_TURN_HEADER,
        ...sections,
    ].join('\n\n');
}

export function createDynamicTurnModelRequest(
    input = {},
) {
    const candidateIdentity =
        input.identity
            ? createDynamicIdentityModelRequest(
                input.identity,
            )
            : null;
    const identityRequest =
        candidateIdentity?.routed
            ? candidateIdentity
            : null;
    const inventoryRequest =
        input.inventory
            ? createDynamicInventoryModelRequest(
                input.inventory,
                {
                    // The composed request owns the shared 20k budget.
                    enforcePromptBudget: false,
                },
            )
            : null;
    assertSharedNarrative(
        identityRequest,
        inventoryRequest,
    );
    const requestedTasks = [
        ...(inventoryRequest
            ? ['inventory']
            : []),
        ...(identityRequest
            ? ['identity']
            : []),
    ];
    const shape = {};
    const properties = {};
    if (inventoryRequest) {
        shape.inventoryUpdates =
            inventoryRequest
                .resultSchema
                .shape
                .inventoryUpdates;
        properties.inventoryUpdates =
            inventoryRequest
                .jsonSchema
                .properties
                .inventoryUpdates;
    }
    if (identityRequest) {
        shape.identityObservations =
            identityRequest
                .resultSchema
                .shape
                .identityObservations;
        properties.identityObservations =
            identityRequest
                .jsonSchema
                .properties
                .identityObservations;
    }
    const resultSchema =
        z.object(shape).strict();
    if (!requestedTasks.length) {
        return {
            routed: false,
            requestedTasks,
            normalizedInputs: {
                identity:
                    candidateIdentity
                        ?.normalizedInput ||
                    null,
                inventory: null,
            },
            system:
                createDynamicTurnSystem(
                    requestedTasks,
                ),
            input: null,
            jsonSchema: null,
            resultSchema,
            promptMeasurement:
                zeroPromptMeasurement(),
        };
    }
    const narrativeSegments =
        inventoryRequest
            ?.normalizedInput
            .narrativeSegments ||
        identityRequest
            .normalizedInput
            .narrativeSegments;
    const modelInput = {
        requestedTasks,
        narrativeSegments,
    };
    if (inventoryRequest) {
        Object.assign(
            modelInput,
            {
                playerAction:
                    inventoryRequest
                        .normalizedInput
                        .playerAction,
                inventory:
                    inventoryRequest
                        .normalizedInput
                        .inventory,
            },
        );
    }
    if (identityRequest) {
        Object.assign(
            modelInput,
            {
                actors:
                    identityRequest
                        .normalizedInput
                        .actors,
                identityTargetActorIds:
                    identityRequest
                        .normalizedInput
                        .identityTargetActorIds,
                inspectionTargetActorIds:
                    identityRequest
                        .normalizedInput
                        .inspectionTargetActorIds,
            },
        );
    }
    const jsonSchema = {
        type: 'object',
        additionalProperties: false,
        required:
            Object.keys(
                properties,
            ),
        properties,
    };
    const system =
        createDynamicTurnSystem(
            requestedTasks,
        );
    const promptMeasurement =
        measurePromptMessages(
            [
                {
                    role: 'system',
                    content: system,
                },
                {
                    role: 'user',
                    content:
                        JSON.stringify(
                            modelInput,
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
            DYNAMIC_TURN_TASK_ID,
        );
    if (
        promptMeasurement
            .characters >
        budget.maximumCharacters
    ) {
        throw new RangeError(
            `Shared dynamic Turn Prompt requires ${promptMeasurement.characters} characters, above ${budget.maximumCharacters}.`,
        );
    }
    return {
        routed: true,
        requestedTasks,
        normalizedInputs: {
            identity:
                identityRequest
                    ?.normalizedInput ||
                null,
            inventory:
                inventoryRequest
                    ?.normalizedInput ||
                null,
        },
        system,
        input: modelInput,
        jsonSchema,
        resultSchema,
        promptMeasurement,
    };
}

export async function observeDynamicTurn(
    input,
    {
        model = '',
        callModel =
        callStructuredModel,
        enqueue =
        enqueueLocalSemanticOperation,
    } = {},
) {
    const request =
        createDynamicTurnModelRequest(
            input,
        );
    if (!request.routed) {
        return {
            result: {
                identityObservations: [],
                inventoryUpdates: [],
            },
            diagnostics: {
                taskId:
                    DYNAMIC_TURN_TASK_ID,
                routed: false,
                requestedTasks: [],
                modelCalls: 0,
                contextSize:
                    DYNAMIC_TURN_CONTEXT_SIZE,
                promptCharacters: 0,
                identity: {
                    rejectedObservationCount:
                        0,
                    rejections: [],
                },
                inventory: {
                    rejectedUpdateCount:
                        0,
                    rejections: [],
                },
            },
        };
    }
    return enqueue(async () => {
        const response =
            await callModel({
                taskId:
                    DYNAMIC_TURN_TASK_ID,
                system:
                    request.system,
                input:
                    request.input,
                jsonSchema:
                    request.jsonSchema,
                resultSchema:
                    request.resultSchema,
                unload: true,
                modelOverride:
                    model ||
                    (
                        callModel ===
                            callStructuredModel
                            ? configuredDynamicModel()
                            : DEFAULT_DYNAMIC_MODEL
                    ),
                exactContextSize:
                    DYNAMIC_TURN_CONTEXT_SIZE,
            });
        const identity =
            request.normalizedInputs
                .identity
                ? guardDynamicIdentityResult(
                    {
                        identityObservations:
                            response
                                .result
                                .identityObservations,
                    },
                    request
                        .normalizedInputs
                        .identity,
                )
                : {
                    identityObservations:
                        [],
                    rejections: [],
                };
        const inventory =
            request.normalizedInputs
                .inventory
                ? guardDynamicInventoryResult(
                    {
                        inventoryUpdates:
                            response
                                .result
                                .inventoryUpdates,
                    },
                    request
                        .normalizedInputs
                        .inventory,
                )
                : {
                    inventoryUpdates: [],
                    rejections: [],
                };
        return {
            result: {
                identityObservations:
                    identity
                        .identityObservations,
                inventoryUpdates:
                    inventory
                        .inventoryUpdates,
            },
            diagnostics: {
                ...(
                    response
                        .diagnostics ||
                    {}
                ),
                taskId:
                    DYNAMIC_TURN_TASK_ID,
                routed: true,
                requestedTasks:
                    request.requestedTasks,
                modelCalls: 1,
                contextSize:
                    DYNAMIC_TURN_CONTEXT_SIZE,
                promptCharacters:
                    request
                        .promptMeasurement
                        .characters,
                identity: {
                    rejectedObservationCount:
                        identity
                            .rejections
                            .length,
                    rejections:
                        identity.rejections,
                },
                inventory: {
                    rejectedUpdateCount:
                        inventory
                            .rejections
                            .length,
                    rejections:
                        inventory.rejections,
                },
            },
        };
    });
}
