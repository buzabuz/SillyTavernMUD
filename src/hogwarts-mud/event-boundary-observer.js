import {
    callStructuredModel,
} from './local-semantic-adjudicator.js';
import {
    EVENT_BOUNDARY_CONTEXT_SIZE,
    EVENT_BOUNDARY_SYSTEM,
    EVENT_BOUNDARY_TASK_ID,
    createEventBoundaryJsonSchema,
    eventBoundaryInputSchema,
    eventBoundaryResultSchema,
    validateEventBoundaryResult,
} from './event-boundary-contract.js';

export function createEventBoundaryModelRequest(
    input,
) {
    const parsed =
        eventBoundaryInputSchema
            .parse(input);
    return {
        taskId:
            EVENT_BOUNDARY_TASK_ID,
        system:
            EVENT_BOUNDARY_SYSTEM,
        input: parsed,
        jsonSchema:
            createEventBoundaryJsonSchema(
                parsed,
            ),
        resultSchema:
            eventBoundaryResultSchema,
        exactContextSize:
            EVENT_BOUNDARY_CONTEXT_SIZE,
    };
}

export async function observeEventBoundary(
    input,
    {
        model = '',
    } = {},
) {
    const request =
        createEventBoundaryModelRequest(
            input,
        );
    const modeled =
        await callStructuredModel({
            ...request,
            modelOverride:
                model,
        });
    const validation =
        validateEventBoundaryResult(
            modeled.result,
            request.input,
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.error,
        );
    }
    return {
        ...modeled,
        result:
            validation.value,
    };
}
