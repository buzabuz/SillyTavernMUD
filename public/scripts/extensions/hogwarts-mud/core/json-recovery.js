function decodeStreamingJsonString(value, complete) {
    let candidate = String(value || '');
    if (!complete) {
        const trailingSlashes =
            candidate.match(/\\+$/)?.[0]?.length || 0;
        if (trailingSlashes % 2 === 1) {
            candidate = candidate.slice(0, -1);
        }
        candidate = candidate.replace(
            /\\u[0-9a-f]{0,3}$/i,
            '',
        );
    }
    try {
        return JSON.parse(`"${candidate}"`);
    } catch {
        return candidate
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
    }
}

export function extractStreamingSceneSegments(rawText) {
    const raw = String(rawText || '');
    const segmentsMatch = /"segments"\s*:/.exec(raw);
    if (!segmentsMatch) {
        return [];
    }
    const actorUpdatesIndex = raw.indexOf(
        '"actorUpdates"',
        segmentsMatch.index,
    );
    const scope = raw.slice(
        segmentsMatch.index,
        actorUpdatesIndex >= 0
            ? actorUpdatesIndex
            : raw.length,
    );
    const segments = [];
    const textPattern = /"textEn"\s*:\s*"/g;
    let match;
    while ((match = textPattern.exec(scope)) &&
        segments.length < 24) {
        const objectStart = scope.lastIndexOf(
            '{',
            match.index,
        );
        const prefix = scope.slice(
            Math.max(0, objectStart),
            match.index,
        );
        const type = /"type"\s*:\s*"(narration|dialogue)"/
            .exec(prefix)?.[1];
        if (!type) {
            continue;
        }
        const actorId = /"actorId"\s*:\s*"([^"]+)"/
            .exec(prefix)?.[1];
        const textStart = textPattern.lastIndex;
        let escaped = false;
        let textEnd = -1;
        for (let index = textStart;
            index < scope.length;
            index++) {
            const character = scope[index];
            if (escaped) {
                escaped = false;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === '"') {
                textEnd = index;
                break;
            }
        }
        const complete = textEnd >= 0;
        const encoded = scope.slice(
            textStart,
            complete ? textEnd : scope.length,
        );
        const textEn = decodeStreamingJsonString(
            encoded,
            complete,
        );
        if (!textEn) {
            continue;
        }
        segments.push({
            type,
            ...(type === 'dialogue' && actorId
                ? { actorId }
                : {}),
            textEn,
            partial: !complete,
        });
        if (!complete) {
            break;
        }
        textPattern.lastIndex = textEnd + 1;
    }
    return segments;
}

function extractStreamingJsonStringField(raw, key) {
    const match = new RegExp(
        `"${key}"\\s*:\\s*"`,
    ).exec(raw);
    if (!match) return '';
    const start = match.index + match[0].length;
    let escaped = false;
    for (let index = start; index < raw.length; index++) {
        const character = raw[index];
        if (escaped) {
            escaped = false;
        } else if (character === '\\') {
            escaped = true;
        } else if (character === '"') {
            return decodeStreamingJsonString(
                raw.slice(start, index),
                true,
            );
        }
    }
    return decodeStreamingJsonString(
        raw.slice(start),
        false,
    );
}

function extractBalancedJsonObject(raw, start) {
    if (start < 0 || raw[start] !== '{') return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index++) {
        const character = raw[index];
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
                try {
                    return {
                        value: JSON.parse(
                            raw.slice(start, index + 1),
                        ),
                        end: index + 1,
                    };
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

function extractBalancedJsonArray(raw, start) {
    if (start < 0 || raw[start] !== '[') return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index++) {
        const character = raw[index];
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
        } else if (character === '[') {
            depth++;
        } else if (character === ']') {
            depth--;
            if (depth === 0) {
                try {
                    return {
                        value: JSON.parse(
                            raw.slice(
                                start,
                                index + 1,
                            ),
                        ),
                        end: index + 1,
                    };
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

export function parseCompleteJsonObject(text) {
    if (
        text &&
        typeof text === 'object' &&
        !Array.isArray(text)
    ) {
        return text;
    }
    const source = String(text || '')
        .replace(
            /<think\b[^>]*>[\s\S]*?<\/think>/gi,
            '',
        )
        .trim();
    const fenced = source.match(
        /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i,
    )?.[1];
    const candidateSource = String(
        fenced ??
        source.replace(
            /^```(?:json)?\s*/i,
            '',
        ),
    ).trim();
    try {
        return JSON.parse(candidateSource);
    } catch (directError) {
        const start = candidateSource.indexOf('{');
        if (start < 0) {
            throw directError;
        }
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (
            let index = start;
            index < candidateSource.length;
            index++
        ) {
            const character =
                candidateSource[index];
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
                    const parsed = JSON.parse(
                        candidateSource.slice(
                            start,
                            index + 1,
                        ),
                    );
                    if (
                        parsed &&
                        typeof parsed ===
                            'object' &&
                        !Array.isArray(parsed)
                    ) {
                        return parsed;
                    }
                    throw directError;
                }
            }
        }
        throw new SyntaxError(
            'Structured JSON response ended before the root object closed.',
        );
    }
}

function extractStreamingJsonArrayField(raw, key) {
    const match = new RegExp(
        `"${key}"\\s*:`,
    ).exec(raw);
    if (!match) return null;
    const start = raw.indexOf(
        '[',
        match.index + match[0].length,
    );
    return extractBalancedJsonArray(
        raw,
        start,
    )?.value || null;
}

export function recoverSceneTransitionPayload(
    rawText,
) {
    const raw = String(rawText || '')
        .replace(
            /^```(?:json)?\s*/i,
            '',
        );
    const transitionMinutes = Number(
        /"transitionMinutes"\s*:\s*(-?\d+)/
            .exec(raw)?.[1],
    );
    const nextClock =
        extractStreamingJsonStringField(
            raw,
            'nextClock',
        );
    const closureSummaryEn =
        extractStreamingJsonStringField(
            raw,
            'closureSummaryEn',
        );
    const globalChronicleSummaryEn =
        extractStreamingJsonStringField(
            raw,
            'globalChronicleSummaryEn',
        );
    const authorQuillEn =
        extractStreamingJsonStringField(
            raw,
            'authorQuillEn',
        );
    const unresolvedThreadsEn =
        extractStreamingJsonArrayField(
            raw,
            'unresolvedThreadsEn',
        );
    const nextScene =
        extractStreamingJsonObjectField(
            raw,
            'nextScene',
        );
    if (
        !Number.isFinite(
            transitionMinutes,
        ) ||
        !nextClock ||
        !closureSummaryEn ||
        !globalChronicleSummaryEn ||
        !authorQuillEn ||
        !Array.isArray(
            unresolvedThreadsEn,
        ) ||
        !nextScene
    ) {
        return null;
    }
    return {
        transitionMinutes,
        nextClock,
        closureSummaryEn,
        globalChronicleSummaryEn,
        authorQuillEn,
        unresolvedThreadsEn,
        nextScene,
        socialStatements:
            extractStreamingJsonArrayField(
                raw,
                'socialStatements',
            ) || [],
        socialRelationshipEvidence:
            extractStreamingJsonArrayField(
                raw,
                'socialRelationshipEvidence',
            ) || [],
    };
}

function extractStreamingJsonObjectField(raw, key) {
    const match = new RegExp(
        `"${key}"\\s*:`,
    ).exec(raw);
    if (!match) return null;
    const start = raw.indexOf(
        '{',
        match.index + match[0].length,
    );
    return extractBalancedJsonObject(raw, start)?.value ||
        null;
}

export function recoverScenePerformancePayload(rawText) {
    const raw = String(rawText || '');
    const segments = extractStreamingSceneSegments(raw)
        .filter(segment => !segment.partial)
        .map(({ partial, ...segment }) => segment);
    if (!segments.length) {
        return null;
    }
    const stateProposals =
        extractStreamingJsonArrayField(
            raw,
            'stateProposals',
        );
    const signals =
        extractStreamingJsonObjectField(
            raw,
            'signals',
        );
    return {
        segments,
        ...(Array.isArray(
            stateProposals,
        )
            ? {
                stateProposals,
            }
            : {}),
        ...(signals
            ? {
                signals,
            }
            : {}),
    };
}
