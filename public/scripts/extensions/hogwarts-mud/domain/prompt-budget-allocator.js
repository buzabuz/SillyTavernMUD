import {
    getModelTaskDefinition,
} from './model-task-registry.js';

export const PROMPT_BUDGET_POLICY_VERSION = 2;

const policies = Object.freeze({
    medium_character_polish: {
        maximumCharacters: 4_000,
        sectionPriority: [
            'system',
            'schema',
            'playerCharacter',
        ],
    },
    high_opening_world: {
        maximumCharacters: 20_000,
        sectionPriority: [
            'system',
            'schema',
            'playerCharacter',
            'campaign',
            'worldCatalog',
        ],
    },
    high_foundation: {
        maximumCharacters: 0,
        sectionPriority: [],
    },
    medium_opening_scene: {
        maximumCharacters: 0,
        sectionPriority: [],
    },
    low_opening_dialogue: {
        maximumCharacters: 0,
        sectionPriority: [],
    },
    high_calendar: {
        maximumCharacters: 20_000,
        sectionPriority: [
            'system',
            'schema',
            'storyArcs',
            'calendar',
            'actors',
            'map',
        ],
    },
    medium_calendar: {
        maximumCharacters: 50_000,
        sectionPriority: [
            'system',
            'schema',
            'calendar',
            'actors',
            'mapDirectory',
        ],
    },
    medium_interior_map: {
        maximumCharacters: 10_000,
        sectionPriority: [
            'system',
            'schema',
            'container',
            'parentMap',
        ],
    },
    medium_daily: {
        maximumCharacters: 0,
        sectionPriority: [],
    },
    medium_pacing: {
        maximumCharacters: 65_000,
        sectionPriority: [
            'system',
            'schema',
            'playerAction',
            'authoritySnapshot',
            'causalState',
            'actors',
        ],
    },
    low_scene_performance: {
        maximumCharacters: 80_000,
        sectionPriority: [
            'system',
            'schema',
            'playerTurn',
            'authoritySnapshot',
            'actorCards',
            'memoryActivations',
            'actionOpportunities',
        ],
    },
    scene_transition: {
        maximumCharacters: 95_000,
        sectionPriority: [
            'system',
            'schema',
            'authoritySnapshot',
            'currentScene',
            'actorCards',
            'calendar',
            'mapDirectory',
            'recentEvents',
            'chronicle',
        ],
    },
    low_scene_opening: {
        maximumCharacters: 40_000,
        sectionPriority: [
            'system',
            'schema',
            'authoritySnapshot',
            'nextScene',
            'actorCards',
            'memoryActivations',
        ],
    },
    medium_social: {
        maximumCharacters: 80_000,
        sectionPriority: [
            'system',
            'schema',
            'sceneEvidence',
            'actors',
            'socialReceipts',
        ],
    },
    high_map_expansion: {
        maximumCharacters: 45_000,
        sectionPriority: [
            'system',
            'schema',
            'worldCatalog',
            'currentMap',
            'trigger',
        ],
    },
    local_pre_turn: {
        maximumCharacters: 9_000,
        sectionPriority: [
            'system',
            'schema',
            'playerTurn',
            'room',
            'actors',
        ],
    },
    post_turn_semantic: {
        maximumCharacters: 10_500,
        providerAware: true,
        sectionPriority: [
            'system',
            'schema',
            'playerAction',
            'narrative',
            'room',
            'actors',
        ],
    },
    local_inventory: {
        maximumCharacters: 9_000,
        sectionPriority: [
            'system',
            'schema',
            'playerAction',
            'narrative',
            'inventory',
        ],
    },
    local_dynamic_identity: {
        maximumCharacters: 6_000,
        sectionPriority: [
            'system',
            'schema',
            'narrative',
            'actors',
            'route',
        ],
    },
    local_dynamic_turn: {
        maximumCharacters: 20_000,
        sectionPriority: [
            'system',
            'schema',
            'requestedTasks',
            'playerAction',
            'narrative',
            'inventory',
            'actors',
            'route',
        ],
    },
    local_event_boundary: {
        maximumCharacters: 20_000,
        sectionPriority: [
            'system',
            'schema',
            'checkpoint',
            'turns',
        ],
    },
    local_appraisal: {
        maximumCharacters: 3_500,
        sectionPriority: [
            'system',
            'schema',
            'event',
            'observers',
        ],
    },
    local_translation: {
        maximumCharacters: 20_000,
        sectionPriority: [
            'system',
            'schema',
            'text',
            'glossary',
        ],
    },
});

function serializedCharacters(
    value,
) {
    return JSON.stringify(
        value,
    ).length;
}

function clone(value) {
    return structuredClone(
        value,
    );
}

export function getTaskPromptBudgetPolicy(
    taskId,
) {
    const definition =
        getModelTaskDefinition(
            taskId,
        );
    if (!definition) {
        throw new TypeError(
            `Unknown model task ${taskId || '?'}.`,
        );
    }
    const policy =
        policies[
            definition
                .budgetPolicyId
        ];
    if (!policy) {
        throw new TypeError(
            `Model task ${taskId} has no prompt budget policy.`,
        );
    }
    return Object.freeze({
        version:
            PROMPT_BUDGET_POLICY_VERSION,
        taskId,
        budgetPolicyId:
            definition
                .budgetPolicyId,
        maximumCharacters:
            policy
                .maximumCharacters,
        providerAware:
            policy.providerAware ===
            true,
        sectionPriority:
            Object.freeze([
                ...policy
                    .sectionPriority,
            ]),
    });
}

/**
 * @param {Array<{ role?: string, content?: string }>} [messages]
 * @param {{ transportJsonSchema?: object | null, runtimeWrapper?: object | null }} [options]
 */
export function measurePromptMessages(
    messages = [],
    {
        transportJsonSchema =
        null,
        runtimeWrapper = null,
    } = {},
) {
    const sections =
        (
            Array.isArray(messages)
                ? messages
                : []
        ).map((
            message,
            index,
        ) => ({
            index,
            role:
                String(
                    message?.role ||
                    '',
                ),
            characters:
                String(
                    message?.content ||
                    '',
                ).length,
        }));
    const messageCharacters =
            sections.reduce(
                (
                    total,
                    section,
                ) =>
                    total +
                    section.characters,
                0,
            );
    const transportSchemaCharacters =
        transportJsonSchema
            ? JSON.stringify(
                transportJsonSchema
                    .value ||
                transportJsonSchema,
            ).length
            : 0;
    const runtimeWrapperCharacters =
        runtimeWrapper
            ? JSON.stringify(
                runtimeWrapper,
            ).length
            : 0;
    return {
        characters:
            messageCharacters +
            transportSchemaCharacters +
            runtimeWrapperCharacters,
        messageCharacters,
        transportSchemaCharacters,
        runtimeWrapperCharacters,
        sections,
    };
}

/**
 * Builds the one transport envelope used both for Prompt measurement and the
 * eventual role-model request. The schema is measured separately because it is
 * already included in the prompt budget as a transport schema.
 *
 * @param {{ maxResponseLength?: number, json?: boolean, jsonSchema?: object | null }} options
 */
export function createRoleTransportEnvelope({
    maxResponseLength = 0,
    json = false,
    jsonSchema = null,
} = {}) {
    const requestPayload = {
        max_tokens:
            Math.max(
                0,
                Number(maxResponseLength) ||
                0,
            ),
    };
    const transportJsonSchema =
        json && jsonSchema
            ? jsonSchema
            : null;
    if (transportJsonSchema) {
        requestPayload.json_schema =
            transportJsonSchema;
    } else if (json) {
        requestPayload.response_format = {
            type:
                'json_object',
        };
    }
    const runtimeWrapper = {
        ...requestPayload,
    };
    delete runtimeWrapper
        .json_schema;
    return {
        requestPayload,
        transportJsonSchema,
        runtimeWrapper,
    };
}

export function createTaskPromptBudget(
    taskId,
    {
        runtimeMaximumCharacters =
        Number.MAX_SAFE_INTEGER,
    } = {},
) {
    const policy =
        getTaskPromptBudgetPolicy(
            taskId,
        );
    const runtimeMaximum =
        Number(
            runtimeMaximumCharacters,
        );
    const normalizedRuntimeMaximum =
        Number.isSafeInteger(
            runtimeMaximum,
        ) &&
        runtimeMaximum >= 0
            ? runtimeMaximum
            : Number.MAX_SAFE_INTEGER;
    return {
        ...policy,
        runtimeMaximumCharacters:
            normalizedRuntimeMaximum,
        effectiveMaximumCharacters:
            policy.providerAware ===
            true
                ? normalizedRuntimeMaximum
                : Math.min(
                    policy
                        .maximumCharacters,
                    normalizedRuntimeMaximum,
                ),
    };
}

export function allocatePromptSections({
    taskId,
    runtimeMaximumCharacters,
    sections = [],
}) {
    const budget =
        createTaskPromptBudget(
            taskId,
            {
                runtimeMaximumCharacters,
            },
        );
    if (
        budget.effectiveMaximumCharacters <=
        0
    ) {
        throw new TypeError(
            `Retired model task ${taskId} has no prompt budget.`,
        );
    }
    const priorityIndex =
        new Map(
            budget.sectionPriority
                .map((
                    key,
                    index,
                ) => [
                    key,
                    index,
                ]),
        );
    const normalized =
        sections.map((
            section,
            index,
        ) => ({
            key:
                String(
                    section.key ||
                    `section_${index}`,
                ),
            value:
                clone(
                    section.value,
                ),
            protected:
                section.protected ===
                true,
            trim:
                section.trim ||
                'omit',
            insertionIndex:
                index,
        }));
    const protectedSections =
        normalized.filter(section =>
            section.protected);
    const protectedCharacters =
        serializedCharacters(
            Object.fromEntries(
                protectedSections
                    .map(section => [
                        section.key,
                        section.value,
                    ]),
            ),
        );
    if (
        protectedCharacters >
        budget.effectiveMaximumCharacters
    ) {
        throw new RangeError(
            `Protected Prompt sections for ${taskId} require ${protectedCharacters} characters, above ${budget.effectiveMaximumCharacters}.`,
        );
    }
    const output =
        Object.fromEntries(
            protectedSections
                .map(section => [
                    section.key,
                    section.value,
                ]),
        );
    const omitted = [];
    const candidates =
        normalized
            .filter(section =>
                !section.protected)
            .sort((left, right) => (
                (
                    priorityIndex.get(
                        left.key,
                    ) ??
                    Number.MAX_SAFE_INTEGER
                ) -
                (
                    priorityIndex.get(
                        right.key,
                    ) ??
                    Number.MAX_SAFE_INTEGER
                ) ||
                left.insertionIndex -
                right.insertionIndex
            ));
    for (const section of candidates) {
        let value =
            section.value;
        let candidate = {
            ...output,
            [section.key]:
                value,
        };
        while (
            serializedCharacters(
                candidate,
            ) >
                budget
                    .effectiveMaximumCharacters &&
            section.trim ===
                'oldest_records' &&
            Array.isArray(value) &&
            value.length
        ) {
            value = value.slice(1);
            candidate = {
                ...output,
                [section.key]:
                    value,
            };
        }
        if (
            serializedCharacters(
                candidate,
            ) <=
            budget.effectiveMaximumCharacters
        ) {
            output[section.key] =
                value;
            if (
                Array.isArray(
                    section.value,
                ) &&
                value.length <
                section.value.length
            ) {
                omitted.push({
                    key:
                        section.key,
                    reason:
                        'oldest_records',
                    omittedCount:
                        section.value.length -
                        value.length,
                });
            }
        } else {
            omitted.push({
                key:
                    section.key,
                reason: 'budget',
                omittedCount:
                    Array.isArray(
                        section.value,
                    )
                        ? section
                            .value.length
                        : 1,
            });
        }
    }
    return {
        value: output,
        budget,
        characters:
            serializedCharacters(
                output,
            ),
        omitted,
    };
}
