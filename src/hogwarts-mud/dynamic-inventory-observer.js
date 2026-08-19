import { getConfigValue } from '../util.js';

import {
    DYNAMIC_INVENTORY_CONTEXT_SIZE,
    DYNAMIC_INVENTORY_TASK_ID,
    createDynamicInventoryModelRequest,
    guardDynamicInventoryResult,
} from './inventory-observation-contract.js';
import {
    callStructuredModel,
    enqueueLocalSemanticOperation,
} from './local-semantic-adjudicator.js';

const DEFAULT_DYNAMIC_MODEL =
    'qwen3:4b';

function configuredDynamicModel() {
    return String(
        process.env
            .HOGWARTS_OLLAMA_INVENTORY_MODEL ||
        getConfigValue(
            'hogwartsMud.localSemantic.inventoryModel',
            DEFAULT_DYNAMIC_MODEL,
        ) ||
        DEFAULT_DYNAMIC_MODEL,
    );
}

export async function observeDynamicInventory(
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
        createDynamicInventoryModelRequest(
            input,
        );
    return enqueue(async () => {
        const response =
            await callModel({
                taskId:
                    DYNAMIC_INVENTORY_TASK_ID,
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
                    DYNAMIC_INVENTORY_CONTEXT_SIZE,
            });
        const guarded =
            guardDynamicInventoryResult(
                response.result,
                request
                    .normalizedInput,
            );
        return {
            result: {
                inventoryUpdates:
                    guarded
                        .inventoryUpdates,
            },
            diagnostics: {
                ...(
                    response
                        .diagnostics ||
                    {}
                ),
                taskId:
                    DYNAMIC_INVENTORY_TASK_ID,
                routed: true,
                modelCalls: 1,
                contextSize:
                    DYNAMIC_INVENTORY_CONTEXT_SIZE,
                promptCharacters:
                    request
                        .promptMeasurement
                        .characters,
                rejectedUpdateCount:
                    guarded
                        .rejections
                        .length,
                rejections:
                    guarded.rejections,
            },
        };
    });
}
