import {
    createRoleTransportEnvelope,
} from '../domain/prompt-budget-allocator.js';

/**
 * Role capacity handoff for role_capacity.measurement.completeRequest.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

export function createModelAdapter(ports) {
    const {
        ConnectionManagerRequestService,
        applyRegexPresetById,
        beforeRequest = () => {},
        getConnectionProfiles,
        parseCompleteJsonObject,
        recordTurnDiagnostic =
        () => {},
        uuidv4,
    } = ports;

    async function sendScheduledRoleRequest(
        slot,
        prompt,
        {
            json = false,
            jsonSchema = null,
            stream = false,
            onProgress = null,
            skipRegexPreset = false,
        } = {},
    ) {
        const profiles = getConnectionProfiles();
        const baseProfile = profiles.find(item => item.id === slot.profileId);
        if (!baseProfile) {
            throw new Error('职责绑定的 Connection Profile 不存在。');
        }
        const regexPresetId = skipRegexPreset
            ? ''
            : slot.regexPresetId || baseProfile['regex-preset'];
        if (!skipRegexPreset) {
            await applyRegexPresetById(regexPresetId);
        }
        const effectiveProfile = {
            ...structuredClone(baseProfile),
            id: `hpmud-runtime-${uuidv4()}`,
            preset: slot.presetName || baseProfile.preset,
            'regex-preset': regexPresetId,
        };
        profiles.push(effectiveProfile);
        const requestPrompt =
            structuredClone(
                prompt,
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
                        false,
                    originalUserJsonValid:
                        Boolean(originalJson),
                    limitedUserJsonValid:
                        Boolean(limitedJson),
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
                },
            );
        }
        const {
            requestPayload:
                overridePayload,
        } =
            createRoleTransportEnvelope({
                maxResponseLength:
                    slot.maxResponseLength,
                json,
                jsonSchema,
            });
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
                const response =
                    await execute(true);
                if (
                    typeof response ===
                    'function'
                ) {
                    let content = '';
                    let reasoning = '';
                    for await (
                        const chunk
                        of response()
                    ) {
                        content =
                            chunk.text ||
                            content;
                        reasoning =
                            chunk.state?.reasoning || reasoning;
                        onProgress?.(
                            content,
                            chunk.state || {},
                        );
                    }
                    return {
                        content,
                        reasoning,
                    };
                }
                onProgress?.(
                    response?.content ||
                    '',
                    {},
                );
                return response;
            }
            return await execute(false);
        } finally {
            const index = profiles.findIndex(item => item.id === effectiveProfile.id);
            if (index >= 0) {
                profiles.splice(index, 1);
            }
        }
    }

    function createScheduledRoleInvoker() {
        return (
            slot,
            prompt,
            options = {},
        ) =>
            sendScheduledRoleRequest(
                slot,
                prompt,
                {
                    ...options,
                    // The public scheduler owns complete Prompt eligibility.
                    preservePrompt:
                        true,
                },
            );
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
        createScheduledRoleInvoker,
        extractRoleResponseText,
        parseJsonObject,
    };
}
