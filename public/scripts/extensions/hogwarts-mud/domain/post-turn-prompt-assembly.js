import {
    createContextBudgetPlan,
} from '../core/context-budget.js';
import {
    createRoleTransportEnvelope,
    measurePromptMessages,
} from './prompt-budget-allocator.js';
import {
    createLowPostTurnSemanticMessages,
    createPostTurnSemanticMessages,
    LOW_POST_TURN_TRANSPORT_JSON_SCHEMA,
    POST_TURN_JSON_SCHEMA,
    LOW_POST_TURN_JSON_SCHEMA,
} from './post-turn-semantic-contract.js';
import { selectPostOutputSchema, selectLocalPostOutputSchema } from './post-bookkeeping-contract.js';

/**
 * Field routes: vcon013.input.itemCandidates,
 * vcon013.input.identityTargetActorIds,
 * vcon013.input.inspectionTargetActorIds.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

export const POST_TURN_LOCAL_CONTEXT_TOKENS = 8_192;
export const POST_TURN_LOCAL_RESPONSE_RESERVE_TOKENS = 2_048;
export const POST_TURN_LOCAL_ESTIMATED_CHARACTERS_PER_TOKEN = 4;

function clone(value) {
    return structuredClone(value);
}

function uniqueStrings(values) {
    return [
        ...new Set(
            (values || [])
                .map(value =>
                    String(value || '').trim())
                .filter(Boolean),
        ),
    ];
}

function withEstimatedTokens(
    measurement,
    capacity,
) {
    const charactersPerToken =
        Math.max(
            1,
            Number(
                capacity
                    .estimatedCharactersPerToken ||
                1,
            ),
        );
    return {
        ...measurement,
        estimatedTokens:
            Math.ceil(
                measurement.characters /
                charactersPerToken,
            ),
        estimatedMessageTokens:
            Math.ceil(
                measurement.messageCharacters /
                charactersPerToken,
            ),
        estimatedSchemaTokens:
            Math.ceil(
                measurement
                    .transportSchemaCharacters /
                charactersPerToken,
            ),
        estimatedWrapperTokens:
            Math.ceil(
                measurement
                    .runtimeWrapperCharacters /
                charactersPerToken,
            ),
    };
}

function createRuntimeWrapper(
    capacity,
) {
    if (capacity.provider === 'local') {
        return {
            model:
                String(
                    capacity.model ||
                    'configured_local_semantic_model',
                ),
            messages: [
                'system',
                'user',
            ],
            stream: false,
            think: false,
            format:
                'transport_json_schema',
            keep_alive: 0,
            options: {
                temperature: 0,
                num_ctx: capacity.contextSize,
                num_predict:
                    capacity.responseReserve,
                seed: 42,
            },
        };
    }
    return {
        transport:
            'connection_profile',
        stream: false,
        json: true,
        json_schema:
            'transport_json_schema',
        max_tokens:
            capacity.responseReserve,
        skip_regex_preset: true,
    };
}

function measureInput(
    input,
    capacity,
) {
    const isLow =
        capacity.provider ===
        'low';
    const roleTransportEnvelope =
        isLow
            ? createRoleTransportEnvelope({
                maxResponseLength:
                    capacity
                        .responseReserve,
                json: true,
                jsonSchema:
                    {
                        ...LOW_POST_TURN_TRANSPORT_JSON_SCHEMA,
                        value: selectPostOutputSchema(LOW_POST_TURN_JSON_SCHEMA, input),
                    },
            })
            : null;
    return measurePromptMessages(
        isLow
            ? createLowPostTurnSemanticMessages(
                input,
            )
            : createPostTurnSemanticMessages(
                input,
            ),
        {
            transportJsonSchema:
                roleTransportEnvelope
                    ?.transportJsonSchema ||
                selectLocalPostOutputSchema(input.recoveryTargets ? LOW_POST_TURN_JSON_SCHEMA : POST_TURN_JSON_SCHEMA, input),
            runtimeWrapper:
                roleTransportEnvelope
                    ?.runtimeWrapper ||
                createRuntimeWrapper(
                    capacity,
                ),
        },
    );
}

function createLowCapacity(lowSlot) {
    const plan =
        createContextBudgetPlan(
            lowSlot?.contextSize,
            lowSlot?.maxResponseLength,
        );
    return {
        provider: 'low',
        kind: 'role_context',
        maximumCharacters:
            plan.maxPromptCharacters,
        contextSize:
            plan.contextSize,
        responseReserve:
            plan.maxResponseLength,
        promptTokenBudget:
            plan.roleBudgetTokens,
        estimatedCharactersPerToken: 3,
    };
}

function createLocalCapacity({
    contextTokens =
    POST_TURN_LOCAL_CONTEXT_TOKENS,
    responseReserveTokens =
    POST_TURN_LOCAL_RESPONSE_RESERVE_TOKENS,
    estimatedCharactersPerToken =
    POST_TURN_LOCAL_ESTIMATED_CHARACTERS_PER_TOKEN,
    model = '',
} = {}) {
    const normalizedContext =
        Math.max(
            1,
            Number(contextTokens) ||
            POST_TURN_LOCAL_CONTEXT_TOKENS,
        );
    const responseReserve =
        Math.min(
            normalizedContext - 1,
            Math.max(
                1,
                Number(responseReserveTokens) ||
                POST_TURN_LOCAL_RESPONSE_RESERVE_TOKENS,
            ),
        );
    const promptTokens =
        Math.max(
            1,
            normalizedContext -
                responseReserve,
        );
    const charactersPerToken =
        Math.max(
            1,
            Number(
                estimatedCharactersPerToken,
            ) ||
            POST_TURN_LOCAL_ESTIMATED_CHARACTERS_PER_TOKEN,
        );
    return {
        provider: 'local',
        kind: 'local_context_estimate',
        maximumCharacters:
            promptTokens *
            charactersPerToken,
        contextSize:
            normalizedContext,
        responseReserve,
        promptTokenBudget:
            promptTokens,
        estimatedCharactersPerToken:
            charactersPerToken,
        model:
            String(model || ''),
    };
}

export function createPostTurnProviderCapacity(
    provider,
    {
        lowSlot = null,
        localCapacity = {},
    } = {},
) {
    return provider === 'local'
        ? createLocalCapacity(
            localCapacity,
        )
        : createLowCapacity(
            lowSlot,
        );
}

function createRetainedActorIds(input) {
    return new Set(
        uniqueStrings([
            'player',
            ...(
                input.targetActorIds ||
                []
            ),
            ...(
                input.identityTargetActorIds ||
                []
            ),
            ...(
                input.inspectionTargetActorIds ||
                []
            ),
            ...(
                input.localPresence
                    ?.occupantActorIds ||
                []
            ),
            input.movementPreflight
                ?.guideActorId,
            ...(
                input.movementPreflight
                    ?.eligibleCompanionActorIds ||
                []
            ),
        ]),
    );
}

function createRetainedRoomIds(
    input,
    retainedActorIds,
) {
    const retained =
        new Set(
            uniqueStrings([
                input.room?.currentRoomId,
                input.movementPreflight
                    ?.candidateRoomId,
                ...(
                    input.movementPreflight
                        ?.routeRoomIds ||
                    []
                ),
                ...(
                    input.actors ||
                    []
                ).filter(actor =>
                    retainedActorIds.has(
                        String(actor?.id || ''),
                    ),
                ).map(actor =>
                    actor?.roomId),
            ]),
        );
    return retained;
}

function omitSection(
    input,
    key,
    diagnostics,
) {
    if (!Object.hasOwn(input, key)) {
        return false;
    }
    const value =
        input[key];
    delete input[key];
    diagnostics.push({
        key,
        omittedCount:
            Array.isArray(value)
                ? value.length
                : 1,
    });
    return true;
}

function compactCohorts(
    input,
    diagnostics,
) {
    if (
        !input.localPresence ||
        !Array.isArray(
            input.localPresence.cohortIds,
        ) ||
        !input.localPresence.cohortIds.length
    ) {
        return false;
    }
    const count =
        input.localPresence.cohortIds
            .length;
    input.localPresence = {
        ...input.localPresence,
        cohortIds: [],
    };
    diagnostics.push({
        key: 'localPresence.cohortIds',
        omittedCount: count,
    });
    return true;
}

function compactActors(
    input,
    diagnostics,
    retained,
) {
    if (!Array.isArray(input.actors)) {
        return false;
    }
    const next =
        input.actors.filter(actor =>
            retained.has(
                String(actor?.id || ''),
            ));
    const omittedCount =
        input.actors.length -
        next.length;
    if (omittedCount <= 0) {
        return false;
    }
    input.actors = next;
    diagnostics.push({
        key: 'actors',
        omittedCount,
    });
    return true;
}

function compactRoomRecords(
    input,
    diagnostics,
    retained,
) {
    if (
        !Array.isArray(
            input.room?.rooms,
        )
    ) {
        return false;
    }
    const next =
        input.room.rooms.filter(room =>
            retained.has(
                String(room?.id || ''),
            ));
    const omittedCount =
        input.room.rooms.length -
        next.length;
    if (omittedCount <= 0) {
        return false;
    }
    input.room = {
        ...input.room,
        rooms: next,
    };
    diagnostics.push({
        key: 'room.rooms',
        omittedCount,
    });
    return true;
}

function createCompactionSteps(
    input,
    diagnostics,
    {
        retainedActorIds,
        retainedRoomIds,
    },
) {
    return [
        () =>
            omitSection(
                input,
                'existingActorPresence',
                diagnostics,
            ),
        () =>
            omitSection(
                input,
                'playerTurnSequence',
                diagnostics,
            ),
        () =>
            compactCohorts(
                input,
                diagnostics,
            ),
        () =>
            omitSection(
                input,
                'localPresence',
                diagnostics,
            ),
        () =>
            compactActors(
                input,
                diagnostics,
                retainedActorIds,
            ),
        () => {
            if (!input.room) {
                return false;
            }
            if (!Object.hasOwn(
                input.room,
                'exits',
            )) {
                return false;
            }
            const exits =
                input.room.exits;
            delete input.room.exits;
            diagnostics.push({
                key: 'room.exits',
                omittedCount:
                    Array.isArray(exits)
                        ? exits.length
                        : 1,
            });
            return true;
        },
        () =>
            compactRoomRecords(
                input,
                diagnostics,
                retainedRoomIds,
            ),
    ];
}

export function assemblePostTurnSemanticPrompt({
    provider,
    input,
    lowSlot = null,
    localCapacity = {},
}) {
    const capacity =
        createPostTurnProviderCapacity(
            provider,
            {
                lowSlot,
                localCapacity,
            },
        );
    const fullInput =
        clone(input);
    const retainedActorIds =
        createRetainedActorIds(
            fullInput,
        );
    const retainedRoomIds =
        createRetainedRoomIds(
            fullInput,
            retainedActorIds,
        );
    const fullMeasurement =
        withEstimatedTokens(
            measureInput(
                fullInput,
                capacity,
            ),
            capacity,
        );
    const compactInput =
        clone(fullInput);
    const compactedSections = [];
    let measurement =
        fullMeasurement;
    for (
        const compact of createCompactionSteps(
            compactInput,
            compactedSections,
            {
                retainedActorIds,
                retainedRoomIds,
            },
        )
    ) {
        if (
            measurement.characters <=
            capacity.maximumCharacters
        ) {
            break;
        }
        const checkpoint =
            compactedSections.length;
        if (!compact()) {
            continue;
        }
        measurement =
            withEstimatedTokens(
                measureInput(
                    compactInput,
                    capacity,
                ),
                capacity,
            );
        if (
            measurement.characters >
            capacity.maximumCharacters &&
            compactedSections.length ===
                checkpoint
        ) {
            throw new Error(
                'Post prompt compaction did not report its omission.',
            );
        }
    }
    const fit =
        measurement.characters <=
        capacity.maximumCharacters;
    const effectiveInput =
        compactedSections.length
            ? compactInput
            : fullInput;
    return {
        fit,
        input: effectiveInput,
        messages:
            capacity.provider === 'low'
                ? createLowPostTurnSemanticMessages(
                    effectiveInput,
                )
                : createPostTurnSemanticMessages(
                    effectiveInput,
                ),
        diagnostics: {
            provider:
                capacity.provider,
            capacity,
            fullMeasurement,
            finalMeasurement:
                measurement,
            compactedSections,
        },
    };
}
