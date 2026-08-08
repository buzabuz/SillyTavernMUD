export const DEFAULT_CONTEXT_SIZE = 120000;
export const MIN_CONTEXT_SIZE = 32768;
export const MANDATORY_CONTEXT_RESERVE = 6000;
export const ROLE_CONTEXT_RESERVE = 8192;
export const DEFAULT_RESPONSE_HEADROOM = 12000;
export const RESPONSE_HEADROOM_VERSION = 1;
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
        const requestedResponse = headroomVersion >= RESPONSE_HEADROOM_VERSION
            ? configuredResponse
            : Math.max(
                DEFAULT_RESPONSE_HEADROOM,
                configuredResponse,
            );
        const responseCeiling = Math.max(
            512,
            contextSize -
                MANDATORY_CONTEXT_RESERVE -
                ROLE_CONTEXT_RESERVE,
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

export function limitMessagesToContext(messages, contextSize, maxResponseLength) {
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
        ...next.map((message, index) => ({ message, index })).filter(item => item.message?.role === 'system'),
    ];
    for (const { message } of trimOrder) {
        if (overflow <= 0) break;
        const content = String(message?.content || '');
        const removable = Math.min(overflow, Math.max(0, content.length - 64));
        if (removable > 0) {
            message.content = content.slice(removable);
            overflow -= removable;
        }
    }
    return next;
}
