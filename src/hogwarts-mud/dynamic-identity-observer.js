import { z } from 'zod';

import {
    getTaskPromptBudgetPolicy,
    measurePromptMessages,
} from '../../public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js';
import { getConfigValue } from '../util.js';
import {
    callStructuredModel,
    enqueueLocalSemanticOperation,
} from './local-semantic-adjudicator.js';

export const DYNAMIC_IDENTITY_CONTEXT_SIZE =
    2_048;
export const DYNAMIC_IDENTITY_TASK_ID =
    'local_dynamic_identity_observer';
export const DYNAMIC_IDENTITY_MIN_CONFIDENCE =
    0.7;

export class DynamicIdentityInputError
    extends TypeError {}

const DEFAULT_DYNAMIC_MODEL =
    'qwen3:4b';

export const DYNAMIC_IDENTITY_RESULT_DESCRIPTOR =
    Object.freeze({
        maximumItems: 4,
        fields: Object.freeze({
            actorId: Object.freeze({
                kind:
                    'route_actor_id',
                minimumLength: 1,
                maximumLength: 96,
            }),
            injuryStatus:
                Object.freeze({
                    kind: 'enum',
                    values:
                        Object.freeze([
                            'injured',
                            'no_visible_injury',
                        ]),
                }),
            evidenceText:
                Object.freeze({
                    kind: 'string',
                    minimumLength: 1,
                    maximumLength: 500,
                }),
            evidenceSegmentIndex:
                Object.freeze({
                    kind:
                        'segment_index',
                    minimum: 0,
                }),
            confidence:
                Object.freeze({
                    kind: 'number',
                    minimum: 0,
                    maximum: 1,
                }),
        }),
    });

const routeIdSchema =
    z.string()
        .min(
            DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                .fields.actorId
                .minimumLength,
        )
        .max(
            DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                .fields.actorId
                .maximumLength,
        )
        .refine(
            value =>
                value === value.trim(),
            'Route IDs cannot contain outer whitespace.',
        );

const dynamicIdentityInputSchema =
    z.object({
        narrativeSegments:
            z.array(
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
                }).strict(),
            ).max(24),
        actors:
            z.array(
                z.object({
                    id:
                        routeIdSchema,
                    nameEn:
                        z.string()
                            .max(200),
                }).strict(),
            ).max(64),
        identityTargetActorIds:
            z.array(
                routeIdSchema,
            ).max(16),
        inspectionTargetActorIds:
            z.array(
                routeIdSchema,
            ).max(16),
    }).strict();

export const DYNAMIC_IDENTITY_SYSTEM = `You are the routed Identity observer for one completed RPG turn.

Authority:
- identityTargetActorIds is the complete allowed Actor set. Never emit another Actor.
- inspectionTargetActorIds is the complete set eligible for no_visible_injury.
- narrativeSegments is the only evidence source.
- evidenceSegmentIndex is the zero-based narration segment containing the observation and is the stable evidence authority.
- evidenceText must be one exact non-empty substring of that indexed narration segment.
- Dialogue claims, Actor context, IDs and route metadata are not evidence.

Sparse injury rules:
- injured requires narration explicitly describing an objectively visible injury.
- no_visible_injury requires narration explicitly saying a deliberate examination of an inspection target found no visible injury.
- Silence, ordinary activity, posture, clothing, teaching, Item transfer, hypothetical language or unrelated dialogue never proves either result.
- Emit at most one observation per routed Actor.
- Return an empty array when routed evidence is absent.

Return exactly the supplied JSON Schema.`;

function unique(values) {
    return [
        ...new Set(
            values,
        ),
    ];
}

function normalizeInput(input) {
    let parsed;
    try {
        parsed =
            dynamicIdentityInputSchema
                .parse(input);
    } catch (error) {
        throw new DynamicIdentityInputError(
            String(
                error?.message ||
                error,
            ),
        );
    }
    const actorIds =
        new Set(
            parsed.actors.map(actor =>
                actor.id),
        );
    if (
        actorIds.size !==
        parsed.actors.length
    ) {
        throw new DynamicIdentityInputError(
            'Dynamic Identity actors must have unique IDs.',
        );
    }
    const identityTargetActorIds =
        unique(
            parsed
                .identityTargetActorIds,
        );
    const inspectionTargetActorIds =
        unique(
            parsed
                .inspectionTargetActorIds,
        );
    const identityTargets =
        new Set(
            identityTargetActorIds,
        );
    for (const actorId of
        identityTargetActorIds) {
        if (!actorIds.has(actorId)) {
            throw new DynamicIdentityInputError(
                `Dynamic Identity route references unknown Actor ${actorId}.`,
            );
        }
    }
    for (const actorId of
        inspectionTargetActorIds) {
        if (
            !identityTargets.has(
                actorId,
            )
        ) {
            throw new DynamicIdentityInputError(
                `Inspection target ${actorId} is outside the Identity route.`,
            );
        }
    }
    const actorById =
        new Map(
            parsed.actors.map(actor => [
                actor.id,
                actor,
            ]),
        );
    return {
        narrativeSegments:
            parsed.narrativeSegments,
        actors:
            identityTargetActorIds
                .map(actorId =>
                    actorById.get(
                        actorId,
                    )),
        identityTargetActorIds,
        inspectionTargetActorIds,
    };
}

function resultSchemaContext(
    identityTargetActorIds,
    narrativeSegmentCount,
) {
    return {
        actorIds:
            identityTargetActorIds,
        segmentMaximum:
            Math.max(
                0,
                narrativeSegmentCount -
                    1,
            ),
    };
}

function zodFieldFromDescriptor(
    field,
    context,
) {
    switch (field.kind) {
        case 'route_actor_id':
            return context.actorIds.length
                ? z.enum(
                    context.actorIds,
                )
                : z.never();
        case 'enum':
            return z.enum(
                field.values,
            );
        case 'string':
            return z.string()
                .min(
                    field.minimumLength,
                )
                .max(
                    field.maximumLength,
                );
        case 'segment_index':
            return z.number()
                .int()
                .min(
                    field.minimum,
                )
                .max(
                    context
                        .segmentMaximum,
                );
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
                `Unknown Dynamic Identity descriptor kind ${field.kind || '?'}.`,
            );
    }
}

function jsonFieldFromDescriptor(
    field,
    context,
) {
    switch (field.kind) {
        case 'route_actor_id':
            return {
                type: 'string',
                minLength:
                    field.minimumLength,
                maxLength:
                    field.maximumLength,
                enum:
                    context.actorIds,
            };
        case 'enum':
            return {
                type: 'string',
                enum:
                    field.values,
            };
        case 'string':
            return {
                type: 'string',
                minLength:
                    field.minimumLength,
                maxLength:
                    field.maximumLength,
            };
        case 'segment_index':
            return {
                type: 'integer',
                minimum:
                    field.minimum,
                maximum:
                    context
                        .segmentMaximum,
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
                `Unknown Dynamic Identity descriptor kind ${field.kind || '?'}.`,
            );
    }
}

export function createDynamicIdentityResultSchema(
    identityTargetActorIds,
    narrativeSegmentCount,
) {
    const context =
        resultSchemaContext(
            identityTargetActorIds,
            narrativeSegmentCount,
        );
    const observationSchema =
        z.object(
            Object.fromEntries(
                Object.entries(
                    DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                        .fields,
                ).map(([
                    fieldName,
                    field,
                ]) => [
                    fieldName,
                    zodFieldFromDescriptor(
                        field,
                        context,
                    ),
                ]),
            ),
        ).strict();
    return z.object({
        identityObservations:
            z.array(
                observationSchema,
            ).max(
                DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                    .maximumItems,
            ),
    }).strict();
}

export function createDynamicIdentityJsonSchema(
    identityTargetActorIds,
    narrativeSegmentCount,
) {
    const context =
        resultSchemaContext(
            identityTargetActorIds,
            narrativeSegmentCount,
        );
    const fields =
        DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
            .fields;
    return {
        type: 'object',
        additionalProperties: false,
        required: [
            'identityObservations',
        ],
        properties: {
            identityObservations: {
                type: 'array',
                maxItems:
                    DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                        .maximumItems,
                items: {
                    type: 'object',
                    additionalProperties:
                        false,
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
                                jsonFieldFromDescriptor(
                                    field,
                                    context,
                                ),
                            ]),
                        ),
                },
            },
        },
    };
}

export function createDynamicIdentityModelRequest(
    input,
) {
    const normalized =
        normalizeInput(input);
    const resultSchema =
        createDynamicIdentityResultSchema(
            normalized
                .identityTargetActorIds,
            normalized
                .narrativeSegments
                .length,
        );
    if (
        !normalized
            .identityTargetActorIds
            .length
    ) {
        return {
            routed: false,
            normalizedInput:
                normalized,
            system:
                DYNAMIC_IDENTITY_SYSTEM,
            input: null,
            jsonSchema: null,
            resultSchema,
            promptMeasurement: {
                characters: 0,
                messageCharacters: 0,
                transportSchemaCharacters:
                    0,
                sections: [],
            },
        };
    }
    const modelInput = {
        narrativeSegments:
            normalized
                .narrativeSegments,
        actors:
            normalized.actors,
        identityTargetActorIds:
            normalized
                .identityTargetActorIds,
        inspectionTargetActorIds:
            normalized
                .inspectionTargetActorIds,
    };
    const jsonSchema =
        createDynamicIdentityJsonSchema(
            normalized
                .identityTargetActorIds,
            normalized
                .narrativeSegments
                .length,
        );
    const promptMeasurement =
        measurePromptMessages(
            [
                {
                    role: 'system',
                    content:
                        DYNAMIC_IDENTITY_SYSTEM,
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
            DYNAMIC_IDENTITY_TASK_ID,
        );
    if (
        promptMeasurement
            .characters >
        budget.maximumCharacters
    ) {
        throw new RangeError(
            `Dynamic Identity Prompt requires ${promptMeasurement.characters} characters, above ${budget.maximumCharacters}.`,
        );
    }
    return {
        routed: true,
        normalizedInput:
            normalized,
        system:
            DYNAMIC_IDENTITY_SYSTEM,
        input:
            modelInput,
        jsonSchema,
        resultSchema,
        promptMeasurement,
    };
}

function configuredDynamicModel() {
    return String(
        process.env
            .HOGWARTS_OLLAMA_DYNAMIC_MODEL ||
        getConfigValue(
            'hogwartsMud.localSemantic.dynamicModel',
            DEFAULT_DYNAMIC_MODEL,
        ) ||
        DEFAULT_DYNAMIC_MODEL,
    );
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

export function guardDynamicIdentityResult(
    source,
    normalizedInput,
) {
    const parsed =
        createDynamicIdentityResultSchema(
            normalizedInput
                .identityTargetActorIds,
            normalizedInput
                .narrativeSegments
                .length,
        ).parse(source);
    const actorIds =
        new Set(
            normalizedInput
                .actors
                .map(actor =>
                    actor.id),
        );
    const identityTargets =
        new Set(
            normalizedInput
                .identityTargetActorIds,
        );
    const inspectionTargets =
        new Set(
            normalizedInput
                .inspectionTargetActorIds,
        );
    const seenActors =
        new Set();
    const accepted = [];
    const rejections = [];
    parsed.identityObservations
        .forEach((
            observation,
            index,
        ) => {
            if (
                !actorIds.has(
                    observation.actorId,
                ) ||
                !identityTargets.has(
                    observation.actorId,
                )
            ) {
                reject(
                    rejections,
                    index,
                    'actor_outside_route',
                );
                return;
            }
            if (
                seenActors.has(
                    observation.actorId,
                )
            ) {
                reject(
                    rejections,
                    index,
                    'duplicate_actor',
                );
                return;
            }
            const segment =
                normalizedInput
                    .narrativeSegments[
                        observation
                            .evidenceSegmentIndex
                    ];
            if (!segment) {
                reject(
                    rejections,
                    index,
                    'invalid_evidence_segment',
                );
                return;
            }
            if (
                segment.type !==
                'narration'
            ) {
                reject(
                    rejections,
                    index,
                    'evidence_is_not_narration',
                );
                return;
            }
            const sourceEvidence =
                String(
                    observation
                        .evidenceText ||
                    '',
                ).trim();
            const segmentText =
                String(
                    segment.textEn ||
                    '',
                );
            const evidenceText =
                sourceEvidence &&
                segmentText.includes(
                    sourceEvidence,
                )
                    ? sourceEvidence
                    : segmentText.length <=
                        500
                        ? segmentText
                        : '';
            if (!evidenceText) {
                reject(
                    rejections,
                    index,
                    'unrecoverable_evidence',
                );
                return;
            }
            if (
                observation.confidence <
                DYNAMIC_IDENTITY_MIN_CONFIDENCE
            ) {
                reject(
                    rejections,
                    index,
                    'confidence_below_threshold',
                );
                return;
            }
            if (
                observation
                    .injuryStatus ===
                    'no_visible_injury' &&
                !inspectionTargets.has(
                    observation.actorId,
                )
            ) {
                reject(
                    rejections,
                    index,
                    'inspection_target_required',
                );
                return;
            }
            seenActors.add(
                observation.actorId,
            );
            const visibleInjury =
                observation
                    .injuryStatus ===
                'injured';
            accepted.push({
                version: 1,
                actorId:
                    observation.actorId,
                kind:
                    'injury_assessment',
                status:
                    visibleInjury
                        ? 'visible_injury'
                        : 'no_visible_injury',
                injuryType:
                    visibleInjury
                        ? 'unknown'
                        : '',
                description:
                    visibleInjury
                        ? evidenceText
                        : '',
                evidenceText,
                evidenceSegmentIndex:
                    observation
                        .evidenceSegmentIndex,
                confidence:
                    observation.confidence,
            });
        });
    return {
        identityObservations:
            accepted,
        rejections,
    };
}

export async function observeDynamicIdentity(
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
        createDynamicIdentityModelRequest(
            input,
        );
    if (!request.routed) {
        return {
            result: {
                identityObservations:
                    [],
            },
            diagnostics: {
                taskId:
                    DYNAMIC_IDENTITY_TASK_ID,
                routed: false,
                modelCalls: 0,
                contextSize:
                    DYNAMIC_IDENTITY_CONTEXT_SIZE,
                promptCharacters: 0,
                rejectedObservationCount:
                    0,
                rejections: [],
            },
        };
    }
    return enqueue(async () => {
        const response =
            await callModel({
                taskId:
                    DYNAMIC_IDENTITY_TASK_ID,
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
                    DYNAMIC_IDENTITY_CONTEXT_SIZE,
            });
        const guarded =
            guardDynamicIdentityResult(
                response.result,
                request
                    .normalizedInput,
            );
        return {
            result: {
                identityObservations:
                    guarded
                        .identityObservations,
            },
            diagnostics: {
                ...(
                    response
                        .diagnostics ||
                    {}
                ),
                taskId:
                    DYNAMIC_IDENTITY_TASK_ID,
                routed: true,
                modelCalls: 1,
                contextSize:
                    DYNAMIC_IDENTITY_CONTEXT_SIZE,
                promptCharacters:
                    request
                        .promptMeasurement
                        .characters,
                rejectedObservationCount:
                    guarded
                        .rejections
                        .length,
                rejections:
                    guarded.rejections,
            },
        };
    });
}
