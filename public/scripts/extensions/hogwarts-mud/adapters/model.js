const RATE_LIMIT_MESSAGE_PATTERN =
    /\b(?:429|too many requests|rate[\s_-]*limit(?:ed|ing)?)\b/iu;

function isRateLimitError(error) {
    const statuses = [
        error?.status,
        error?.statusCode,
        error?.response?.status,
        error?.cause?.status,
    ];
    if (statuses.some(status => Number(status) === 429)) {
        return true;
    }
    const message = String(error?.message || error || '');
    return RATE_LIMIT_MESSAGE_PATTERN.test(message);
}

export function createModelAdapter(ports) {
    const {
        ConnectionManagerRequestService,
        applyRegexPresetById,
        beforeRequest = () => {},
        createContextBudgetPlan =
        () => null,
        getConnectionProfiles,
        limitMessagesToContext,
        parseCompleteJsonObject,
        recordTurnDiagnostic =
        () => {},
        uuidv4,
    } = ports;

    async function sendRoleRequest(
        slot,
        prompt,
        {
            json = false,
            jsonSchema = null,
            stream = false,
            onProgress = null,
        } = {},
    ) {
        const profiles = getConnectionProfiles();
        const baseProfile = profiles.find(item => item.id === slot.profileId);
        if (!baseProfile) {
            throw new Error('职责绑定的 Connection Profile 不存在。');
        }
        const regexPresetId = slot.regexPresetId || baseProfile['regex-preset'];
        await applyRegexPresetById(regexPresetId);
        const effectiveProfile = {
            ...structuredClone(baseProfile),
            id: `hpmud-runtime-${uuidv4()}`,
            preset: slot.presetName || baseProfile.preset,
            'regex-preset': regexPresetId,
        };
        profiles.push(effectiveProfile);
        const requestPrompt = limitMessagesToContext(
            prompt,
            slot.contextSize,
            slot.maxResponseLength,
        );
        const requestCharacters =
            Array.isArray(requestPrompt)
                ? requestPrompt.reduce(
                    (
                        sum,
                        message,
                    ) =>
                        sum +
                        String(
                            message
                                ?.content ||
                            '',
                        ).length,
                    0,
                )
                : String(
                    requestPrompt ||
                    '',
                ).length;
        const requestContextPlan =
            createContextBudgetPlan(
                slot.contextSize,
                slot.maxResponseLength,
            );
        const requestExceedsContext =
            Number.isFinite(
                requestContextPlan
                    ?.maxPromptCharacters,
            ) &&
            requestCharacters >
                requestContextPlan
                    .maxPromptCharacters;
        const diagnosticSystem =
            Array.isArray(prompt)
                ? String(
                    prompt.find(message =>
                        message?.role ===
                            'system')
                        ?.content ||
                    '',
                )
                : '';
        const diagnosticRole =
            diagnosticSystem.includes(
                'On-Scene Performer',
            )
                ? 'scene_performer'
                : diagnosticSystem.includes(
                    'Repair only the narrative core',
                )
                    ? 'scene_repair'
                    : '';
        if (diagnosticRole) {
            const originalUser =
                String(
                    prompt.find(message =>
                        message?.role ===
                            'user')
                        ?.content ||
                    '',
                );
            const limitedSystem =
                String(
                    requestPrompt.find(message =>
                        message?.role ===
                            'system')
                        ?.content ||
                    '',
                );
            const limitedUser =
                String(
                    requestPrompt.find(message =>
                        message?.role ===
                            'user')
                        ?.content ||
                    '',
                );
            let originalJson = null;
            let limitedJson = null;
            try {
                originalJson =
                    JSON.parse(
                        originalUser,
                    );
            } catch {
                // Invalid JSON is recorded below.
            }
            try {
                limitedJson =
                    JSON.parse(
                        limitedUser,
                    );
            } catch {
                // Invalid JSON is recorded below.
            }
            const originalInput =
                originalJson
                    ?.originalSceneInput ||
                originalJson;
            const limitedInput =
                limitedJson
                    ?.originalSceneInput ||
                limitedJson;
            recordTurnDiagnostic(
                'model_request',
                {
                    role:
                        diagnosticRole,
                    stream,
                    json,
                    originalCharacters:
                        Array.isArray(prompt)
                            ? prompt.reduce(
                                (
                                    sum,
                                    message,
                                ) =>
                                    sum +
                                    String(
                                        message
                                            ?.content ||
                                        '',
                                    ).length,
                                0,
                            )
                            : String(
                                prompt ||
                                '',
                            ).length,
                    limitedCharacters:
                        requestCharacters,
                    maxPromptCharacters:
                        requestContextPlan
                            ?.maxPromptCharacters ??
                        null,
                    exceedsContextBudget:
                        requestExceedsContext,
                    originalMessageCharacters:
                        Array.isArray(prompt)
                            ? prompt.map(
                                message => ({
                                    role:
                                        message
                                            ?.role,
                                    characters:
                                        String(
                                            message
                                                ?.content ||
                                            '',
                                        )
                                            .length,
                                }),
                            )
                            : [],
                    limitedMessageCharacters:
                        Array.isArray(
                            requestPrompt,
                        )
                            ? requestPrompt
                                .map(
                                    message => ({
                                        role:
                                            message
                                                ?.role,
                                        characters:
                                            String(
                                                message
                                                    ?.content ||
                                                '',
                                            )
                                                .length,
                                    }),
                                )
                            : [],
                    contextTrimmed:
                        originalUser !==
                            limitedUser ||
                        diagnosticSystem !==
                            limitedSystem,
                    originalUserJsonValid:
                        Boolean(originalJson),
                    limitedUserJsonValid:
                        Boolean(limitedJson),
                    originalPlayerAction:
                        originalInput
                            ?.playerAction ||
                        '',
                    limitedPlayerAction:
                        limitedInput
                            ?.playerAction ||
                        '',
                    originalPlayerTurnSequence:
                        originalInput
                            ?.playerTurnSequence ||
                        [],
                    limitedPlayerTurnSequence:
                        limitedInput
                            ?.playerTurnSequence ||
                        [],
                    targetWordRange:
                        originalInput
                            ?.targetWordRange ||
                        originalJson
                            ?.originalSceneInput
                            ?.targetWordRange ||
                        null,
                    elapsedMinutes:
                        originalInput
                            ?.elapsedMinutes ??
                        null,
                    instructionFlags: {
                        originalDuration:
                            /plausibly cover .* minutes/iu
                                .test(
                                    diagnosticSystem,
                                ),
                        limitedDuration:
                            /plausibly cover .* minutes/iu
                                .test(
                                    limitedSystem,
                                ),
                        originalDirectAnswer:
                            diagnosticSystem
                                .includes(
                                    'Every direct block',
                                ),
                        limitedDirectAnswer:
                            limitedSystem
                                .includes(
                                    'Every direct block',
                                ),
                    },
                    limitedUserPrefix:
                        limitedUser.slice(
                            0,
                            500,
                        ),
                    limitedUserSuffix:
                        limitedUser.slice(
                            -500,
                        ),
                },
            );
        }
        if (requestExceedsContext) {
            const error =
                new Error(
                    `职责请求上下文仍超过预算：${requestCharacters}/${requestContextPlan.maxPromptCharacters} 字符。`,
                );
            error.name =
                'ContextBudgetExceededError';
            throw error;
        }
        const overridePayload = {
            max_tokens: slot.maxResponseLength,
            ...(json ? {
                ...(
                    jsonSchema
                        ? {
                            json_schema:
                            jsonSchema,
                        }
                        : {
                        // Keep raw fenced JSON for legacy
                        // director responses.
                            response_format: {
                                type:
                                'json_object',
                            },
                        }
                ),
            } : {}),
        };
        const execute = requestStream => {
            beforeRequest();
            recordTurnDiagnostic(
                'model_call',
                {
                    tier:
                        slot
                            .diagnosticTier ||
                        slot.tier ||
                        'unknown',
                    stream:
                        requestStream,
                },
            );
            return ConnectionManagerRequestService.sendRequest(
                effectiveProfile.id,
                requestPrompt,
                slot.maxResponseLength,
                {
                    extractData: true,
                    includePreset: true,
                    stream: requestStream,
                },
                overridePayload,
            );
        };
        try {
            if (stream) {
                try {
                    const response = await execute(true);
                    if (typeof response === 'function') {
                        let content = '';
                        let reasoning = '';
                        for await (const chunk of response()) {
                            content = chunk.text || content;
                            reasoning =
                            chunk.state?.reasoning || reasoning;
                            onProgress?.(
                                content,
                                chunk.state || {},
                            );
                        }
                        return { content, reasoning };
                    }
                    onProgress?.(
                        response?.content || '',
                        {},
                    );
                    return response;
                } catch (error) {
                    if (isRateLimitError(error)) {
                        throw error;
                    }
                    console.warn(
                        '[Hogwarts MUD] Streaming unavailable; falling back to one-shot request',
                        error,
                    );
                }
            }
            return await execute(false);
        } finally {
            const index = profiles.findIndex(item => item.id === effectiveProfile.id);
            if (index >= 0) {
                profiles.splice(index, 1);
            }
        }
    }

    function extractRoleResponseText(response) {
        if (response?.content && typeof response.content === 'object') {
            return response.content;
        }
        const candidates = [
            String(response?.content || '').trim(),
            String(response?.reasoning || '').trim(),
        ].filter(Boolean);
        for (const candidate of [
            ...candidates,
            candidates.join('\n'),
        ]) {
            try {
                return parseCompleteJsonObject(
                    candidate,
                );
            } catch {
            // Continue until a complete JSON object is found.
            }
        }
        return candidates[0] || '';
    }

    function parseJsonObject(text) {
        if (text && typeof text === 'object' && !Array.isArray(text)) {
            return text;
        }
        const source = String(text || '').trim();
        const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
        if (fenced) {
            return JSON.parse(fenced);
        }
        try {
            return JSON.parse(source);
        } catch (directError) {
            const candidates = [];
            for (let start = 0; start < source.length; start++) {
                if (source[start] !== '{') continue;
                let depth = 0;
                let inString = false;
                let escaped = false;
                for (let index = start; index < source.length; index++) {
                    const character = source[index];
                    if (inString) {
                        if (escaped) {
                            escaped = false;
                        } else if (character === '\\') {
                            escaped = true;
                        } else if (character === '"') {
                            inString = false;
                        }
                        continue;
                    }
                    if (character === '"') {
                        inString = true;
                    } else if (character === '{') {
                        depth++;
                    } else if (character === '}') {
                        depth--;
                        if (depth === 0) {
                            candidates.push(source.slice(start, index + 1));
                            break;
                        }
                    }
                }
            }
            candidates.sort((left, right) => right.length - left.length);
            for (const candidate of candidates) {
                try {
                    const parsed = JSON.parse(candidate);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        return parsed;
                    }
                } catch {
                // Try the next balanced object.
                }
            }
            throw directError;
        }
    }

    return {
        sendRoleRequest,
        extractRoleResponseText,
        parseJsonObject,
    };
}
