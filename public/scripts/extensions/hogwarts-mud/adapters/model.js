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
        getConnectionProfiles,
        limitMessagesToContext,
        parseCompleteJsonObject,
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
        const execute = requestStream =>
            ConnectionManagerRequestService.sendRequest(
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
