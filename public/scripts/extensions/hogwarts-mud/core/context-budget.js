export const DEFAULT_CONTEXT_SIZE = 120000;
export const MIN_CONTEXT_SIZE = 32768;
export const MANDATORY_CONTEXT_RESERVE = 6000;
export const ROLE_CONTEXT_RESERVE = 8192;
export const DEFAULT_RESPONSE_HEADROOM = 12000;
export const RESPONSE_HEADROOM_VERSION = 2;
export const CONTEXT_SIZE_PRESETS = Object.freeze({
    lean: 32768,
    balanced: 65536,
    rich: DEFAULT_CONTEXT_SIZE,
});
export const DEFAULT_MODEL_SLOTS = Object.freeze({
    low: {
        profileId: '',
        presetName: '',
        regexPresetId: '',
        contextSize: DEFAULT_CONTEXT_SIZE,
        maxResponseLength: DEFAULT_RESPONSE_HEADROOM,
        responseHeadroomVersion:
            RESPONSE_HEADROOM_VERSION,
    },
    medium: {
        profileId: '',
        presetName: '',
        regexPresetId: '',
        contextSize: DEFAULT_CONTEXT_SIZE,
        maxResponseLength: DEFAULT_RESPONSE_HEADROOM,
        responseHeadroomVersion:
            RESPONSE_HEADROOM_VERSION,
    },
    high: {
        profileId: '',
        presetName: '',
        regexPresetId: '',
        contextSize: DEFAULT_CONTEXT_SIZE,
        maxResponseLength: DEFAULT_RESPONSE_HEADROOM,
        responseHeadroomVersion:
            RESPONSE_HEADROOM_VERSION,
    },
});

export function normalizeModelSlots(slots = {}) {
    return Object.fromEntries(Object.entries(DEFAULT_MODEL_SLOTS).map(([role, defaults]) => {
        const source = slots?.[role] || {};
        const contextSize = Math.min(2000000, Math.max(MIN_CONTEXT_SIZE, Number.parseInt(source.contextSize, 10) || defaults.contextSize));
        const legacyMaxTokens = Number.parseInt(source.maxTokens, 10);
        const configuredResponse = Number.parseInt(source.maxResponseLength, 10) || legacyMaxTokens || defaults.maxResponseLength;
        const headroomVersion = Number.parseInt(source.responseHeadroomVersion, 10) || 0;
        const responseCeiling = Math.max(
            512,
            contextSize -
                MANDATORY_CONTEXT_RESERVE -
                ROLE_CONTEXT_RESERVE,
        );
        const legacyCeilingResponse =
            headroomVersion === 1 &&
            configuredResponse >=
                responseCeiling;
        const requestedResponse = headroomVersion >= RESPONSE_HEADROOM_VERSION
            ? configuredResponse
            : legacyCeilingResponse
                ? DEFAULT_RESPONSE_HEADROOM
                : Math.max(
                    DEFAULT_RESPONSE_HEADROOM,
                    configuredResponse,
                );
        return [role, {
            profileId: String(source.profileId || ''),
            presetName: String(source.presetName || ''),
            regexPresetId: String(source.regexPresetId || ''),
            contextSize,
            maxResponseLength: Math.min(responseCeiling, 128000, Math.max(1, requestedResponse)),
            responseHeadroomVersion:
                RESPONSE_HEADROOM_VERSION,
        }];
    }));
}

export function createContextBudgetPlan(
    contextSize,
    maxResponseLength,
) {
    const normalizedContext = Math.max(
        MIN_CONTEXT_SIZE,
        Number(contextSize) || DEFAULT_CONTEXT_SIZE,
    );
    const normalizedResponse = Math.min(
        normalizedContext -
            MANDATORY_CONTEXT_RESERVE -
            ROLE_CONTEXT_RESERVE,
        Math.max(
            1,
            Number(maxResponseLength) || 1,
        ),
    );
    const inputBudget = Math.max(
        MANDATORY_CONTEXT_RESERVE,
        normalizedContext - normalizedResponse,
    );
    const mandatoryReserveTokens = Math.min(
        12000,
        Math.max(
            MANDATORY_CONTEXT_RESERVE,
            Math.ceil(inputBudget * 0.08),
        ),
    );
    const roleBudgetTokens = Math.max(
        ROLE_CONTEXT_RESERVE,
        inputBudget - mandatoryReserveTokens,
    );
    const mode = inputBudget >= 90000
        ? 'rich'
        : inputBudget >= 45000
            ? 'balanced'
            : 'lean';
    const policy = {
        lean: {
            label: '精简',
            ragLimit: 3,
            recentMessageLimit: 4,
            chapterMessageLimit: 8,
            memoryLimits: {
                core: 3,
                recent: 2,
                everyday: 1,
            },
        },
        balanced: {
            label: '标准',
            ragLimit: 6,
            recentMessageLimit: 8,
            chapterMessageLimit: 16,
            memoryLimits: {
                core: 3,
                recent: 4,
                everyday: 3,
            },
        },
        rich: {
            label: '丰裕',
            ragLimit: 10,
            recentMessageLimit: 16,
            chapterMessageLimit: 32,
            memoryLimits: {
                core: 3,
                recent: 6,
                everyday: 8,
            },
        },
    }[mode];
    return {
        mode,
        ...policy,
        contextSize: normalizedContext,
        maxResponseLength: normalizedResponse,
        inputBudget,
        mandatoryReserveTokens,
        roleBudgetTokens,
        maxPromptCharacters: roleBudgetTokens * 3,
    };
}


export function createSharedMemoryContextSelector(
    normalizeSharedMemories,
) {
    return function selectSharedMemoriesForContext(
        sharedMemories,
        contextPlan,
    ) {
        const normalized =
            normalizeSharedMemories(sharedMemories);
        return Object.fromEntries(
            ['core', 'recent', 'everyday'].map(tier => {
                const limit = Math.max(
                    0,
                    Number(
                        contextPlan?.memoryLimits?.[tier] ||
                        0,
                    ),
                );
                return [
                    tier,
                    limit
                        ? normalized[tier].slice(-limit)
                        : [],
                ];
            }),
        );
    };
}

const STRUCTURED_CONTEXT_TRIM_KEYS =
    Object.freeze([
        'retrievedLocalKnowledge',
        'historicalKnowledgeEvidence',
        'contextPolicy',
    ]);

const STRUCTURED_CONTEXT_PRESERVE_KEYS =
    Object.freeze([
        'playerAction',
        'playerTurnSequence',
        'addressing',
        'privateKnowledgeActorIds',
        'elapsedMinutes',
        'targetWordRange',
        'ensemblePolicy',
        'clockBeforeTurn',
        'calendar',
        'calendarClock',
        'calendarEntries',
        'calendarStorySources',
        'calendarMoment',
        'timelineMoment',
        'openingClock',
        'currentScene',
        'currentLocation',
        'currentRoomId',
        'destinationAuthority',
        'nextScene',
        'presentActorStates',
        'movementResolution',
        'momentumDirective',
        'checkResolution',
        'mentionedKnownActors',
        'presentActors',
        'actorProfiles',
        'authoritySnapshot',
        'itemDirectives',
        'authoritativeItems',
        'actorKnowledge',
        'addressedActorKnowledge',
        'actorContinuityCapsules',
        'memoryActivationCapsules',
        'behavioralEnvironment',
        'currentRoomState',
        'currentMaterialState',
        'spatialContext',
        'temporaryActorPromotionPolicy',
        'pacingDirective',
    ]);

const STRUCTURED_CONTEXT_DEGRADE_KEYS =
    Object.freeze([
        // Legacy alias of actorKnowledge. Keeping both can duplicate
        // the largest actor-scoped context block.
        'addressedActorKnowledge',
        // These snapshots are already represented in authoritySnapshot.
        'currentMaterialState',
        'currentRoomState',
        // The remaining fields add progressively less authority than the
        // system contract and the core turn input.
        'actorContinuityCapsules',
        'presentActors',
        'actorProfiles',
        'behavioralEnvironment',
        'spatialContext',
        'actorKnowledge',
        'memoryActivationCapsules',
    ]);

const STRUCTURED_REPAIR_INPUT_KEYS =
    Object.freeze([
        'originalSceneInput',
        'originalRequest',
    ]);

const STRUCTURED_REPAIR_ENVELOPE_KEYS =
    Object.freeze([
        'authoritySnapshot',
        'memoryActivationCapsules',
        'validationConflict',
        'validationError',
    ]);

function isStructuredObject(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function getStructuredRepairInput(
    value,
) {
    const key =
        STRUCTURED_REPAIR_INPUT_KEYS
            .find(candidate =>
                isStructuredObject(
                    value?.[candidate],
                ));
    return key
        ? {
            key,
            value: value[key],
        }
        : {
            key: '',
            value,
        };
}

function compactInvalidSegment(
    segment,
) {
    if (!isStructuredObject(segment)) {
        return segment;
    }
    return Object.fromEntries(
        [
            'id',
            'type',
            'actorId',
            'textEn',
            'historicalClaims',
            'sourceEventIds',
        ]
            .filter(key =>
                Object.hasOwn(
                    segment,
                    key,
                ))
            .map(key => [
                key,
                structuredClone(
                    segment[key],
                ),
            ]),
    );
}

function compactRepairInvalidOutput(
    value,
    fallbackCharacters,
) {
    const wasString =
        typeof value === 'string';
    let parsed = value;
    if (wasString) {
        try {
            parsed = JSON.parse(value);
        } catch {
            return value.slice(
                0,
                fallbackCharacters,
            );
        }
    }
    if (
        !isStructuredObject(parsed) ||
        !Array.isArray(parsed.segments)
    ) {
        return wasString
            ? value.slice(
                0,
                fallbackCharacters,
            )
            : String(value || '').slice(
                0,
                fallbackCharacters,
            );
    }
    const compact = {
        segments:
            parsed.segments.map(
                compactInvalidSegment,
            ),
    };
    return wasString
        ? JSON.stringify(compact)
        : compact;
}

function trimStructuredMessageContent(
    content,
    removeCharacters,
    structuredContextTrimmer,
) {
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        return null;
    }
    if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
    ) {
        return null;
    }
    const targetCharacters =
        Math.max(
            256,
            content.length -
                Math.max(
                    0,
                    removeCharacters,
                ),
        );
    if (
        typeof structuredContextTrimmer ===
        'function'
    ) {
        const trimmed =
            structuredContextTrimmer(
                parsed,
                targetCharacters,
            );
        if (trimmed) {
            const serialized =
                JSON.stringify(trimmed);
            return {
                content: serialized,
                removedCharacters:
                    Math.max(
                        0,
                        content.length -
                            serialized.length,
                    ),
            };
        }
    }
    let next =
        structuredClone(parsed);
    const repairInput =
        getStructuredRepairInput(
            next,
        );
    const sceneInput =
        repairInput.value;
    const prefix =
        repairInput.key
            ? `${repairInput.key}.`
            : '';
    const omitted = [];
    let serialized =
        JSON.stringify(next);
    for (
        const key of
        STRUCTURED_CONTEXT_TRIM_KEYS
    ) {
        if (
            serialized.length <=
                targetCharacters
        ) {
            break;
        }
        if (
            Object.hasOwn(
                sceneInput,
                key,
            )
        ) {
            delete sceneInput[key];
            omitted.push(
                `${prefix}${key}`,
            );
            serialized =
                JSON.stringify(next);
        }
    }
    if (
        serialized.length >
            targetCharacters &&
        repairInput.key &&
        Object.hasOwn(
            next,
            'requiredSchema',
        )
    ) {
        delete next.requiredSchema;
        omitted.push(
            'requiredSchema',
        );
        serialized =
            JSON.stringify(next);
    }
    if (
        serialized.length >
        targetCharacters
    ) {
        const mandatoryInput =
            Object.fromEntries(
                STRUCTURED_CONTEXT_PRESERVE_KEYS
                    .filter(key =>
                        Object.hasOwn(
                            sceneInput,
                            key,
                        ))
                    .map(key => [
                        key,
                        sceneInput[key],
                    ]),
            );
        omitted.push(
            ...Object.keys(
                sceneInput,
            )
                .filter(key =>
                    !Object.hasOwn(
                        mandatoryInput,
                        key,
                    ))
                .map(key =>
                    `${prefix}${key}`),
        );
        if (sceneInput === next) {
            next =
                mandatoryInput;
        } else {
            const envelope =
                Object.fromEntries(
                    STRUCTURED_REPAIR_ENVELOPE_KEYS
                        .filter(key =>
                            Object.hasOwn(
                                next,
                                key,
                            ))
                        .map(key => [
                            key,
                            next[key],
                        ]),
                );
            if (
                Object.hasOwn(
                    next,
                    'invalidOutput',
                )
            ) {
                envelope.invalidOutput =
                    compactRepairInvalidOutput(
                        next.invalidOutput,
                        Math.max(
                            1_000,
                            Math.floor(
                                targetCharacters /
                                3,
                            ),
                        ),
                    );
            }
            envelope[
                repairInput.key
            ] = mandatoryInput;
            omitted.push(
                ...Object.keys(next)
                    .filter(key =>
                        !Object.hasOwn(
                            envelope,
                            key,
                        ))
                    .map(key => key),
            );
            next = envelope;
        }
        serialized =
            JSON.stringify(next);
    }
    const degradedInput =
        getStructuredRepairInput(
            next,
        );
    for (
        const key of
        STRUCTURED_CONTEXT_DEGRADE_KEYS
    ) {
        if (
            serialized.length <=
                targetCharacters
        ) {
            break;
        }
        if (
            Object.hasOwn(
                degradedInput.value,
                key,
            )
        ) {
            delete degradedInput
                .value[key];
            omitted.push(
                degradedInput.key
                    ? `${degradedInput.key}.${key}`
                    : key,
            );
            serialized =
                JSON.stringify(next);
        }
    }
    if (omitted.length) {
        next.contextOmittedFields =
            [...new Set(omitted)];
        serialized =
            JSON.stringify(next);
    }
    return {
        content:
            serialized,
        removedCharacters:
            Math.max(
                0,
                content.length -
                    serialized.length,
            ),
    };
}

export function limitMessagesToContext(
    messages,
    contextSize,
    maxResponseLength,
    structuredContextTrimmer = null,
) {
    const contextPlan = createContextBudgetPlan(
        contextSize,
        maxResponseLength,
    );
    const maxCharacters = Math.max(
        256,
        contextPlan.maxPromptCharacters,
    );
    if (typeof messages === 'string') {
        return messages.length > maxCharacters ? messages.slice(-maxCharacters) : messages;
    }
    if (!Array.isArray(messages)) {
        return messages;
    }
    const next = structuredClone(messages);
    let overflow = next.reduce((sum, message) => sum + String(message?.content || '').length, 0) - maxCharacters;
    if (overflow <= 0) {
        return next;
    }
    const trimOrder = [
        ...next.map((message, index) => ({ message, index })).filter(item => item.message?.role !== 'system'),
    ];
    for (const { message } of trimOrder) {
        if (overflow <= 0) break;
        const content = String(message?.content || '');
        const structured =
            trimStructuredMessageContent(
                content,
                overflow,
                structuredContextTrimmer,
            );
        if (
            structured &&
            structured
                .removedCharacters >
                0
        ) {
            message.content =
                structured.content;
            overflow -=
                structured
                    .removedCharacters;
            continue;
        }
        if (structured) {
            continue;
        }
        const removable = Math.min(overflow, Math.max(0, content.length - 64));
        if (removable > 0) {
            message.content = content.slice(removable);
            overflow -= removable;
        }
    }
    return next;
}
