import {
    MAP_DIRECTOR_TRIGGERS,
    PRESET_WORLD_MAP,
} from './world-data.js';
import {
    getPresetLocalMap,
    LOCAL_MAP_CATALOG,
    LOCAL_MAP_SCHEMA_VERSION,
    PRESET_LOCATION_ACTORS,
    PRESET_LOCAL_MAPS,
} from './map-pack.js';
import {
    CANON_CHARACTER_CATALOG,
    CANON_PLAYABLE_CHARACTER_CATALOG,
    CANON_SETTING_TAG_VALUES,
    findCanonCharacter,
    findMentionedCanonCharacters,
    getCanonNameAliases,
    getCanonSettingProfile,
} from './canon-characters.js';
import {
    APPEARANCE_SLOT_VALUES,
    HAND_VALUES,
    LOCAL_MATERIAL_PERSISTENCE_VALUES,
    MATERIAL_EVENT_DEFINITIONS,
    MATERIAL_EVENT_TYPE_SET,
    MATERIAL_OPERATIONS,
    MATERIAL_STATE_SCHEMA_VERSION,
} from './material-schema.js';
import {
    createInitialSpellbook,
    findSpellReferences,
    getSpellDefinition,
    getSpellProficiency,
    normalizeKnownSpell,
    normalizeSpellbook,
    parseSpellCastDirectives,
    SPELL_CATALOG_VERSION,
} from './spell-catalog.js';
import {
    createDefaultPresenceWitnessState,
    projectActorEventKnowledge,
} from './presence-witness-contract.js';

export * from './presence-witness-contract.js';

export {
    createSpellDirective,
    findSpellReferences,
    getSpellDefinition,
    getSpellProficiency,
    normalizeSpellbook,
    parseSpellCastDirectives,
    removeSpellCastDirectives,
    SPELL_CATALOG,
    SPELL_CATALOG_VERSION,
    SPELL_LEARNING_SOURCE_LABELS,
} from './spell-catalog.js';

const SENSITIVE_PRESET_FIELDS = new Set([
    '__proto__',
    'api_key',
    'api_url',
    'custom_include_body',
    'custom_include_headers',
    'custom_url',
    'constructor',
    'prototype',
    'proxy_password',
    'reverse_proxy',
]);
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const CHARACTER_ATTRIBUTE_KEYS = Object.freeze([
    'physique',
    'agility',
    'perception',
    'intellect',
    'willpower',
    'charisma',
]);
export const CHARACTER_ATTRIBUTE_BUDGET = 63;
export const DEFAULT_CONTEXT_SIZE = 120000;
export const MIN_CONTEXT_SIZE = 32768;
export const DEFAULT_CAST_POLICY =
    Object.freeze({
        maxStoryActors: 48,
        maxGeneratedGuests: 12,
        targetPeerActors: 16,
        maxAuthorityActors: 12,
    });
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

export function selectSharedMemoriesForContext(
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

function extractStreamingLooseJsonStringField(
    raw,
    key,
    nextKeys,
) {
    const match = new RegExp(
        `"${key}"\\s*:\\s*`,
    ).exec(raw);
    if (!match) return '';
    const start = match.index + match[0].length;
    const boundary = new RegExp(
        `,\\s*"(?:${nextKeys.join('|')})"\\s*:`,
    ).exec(raw.slice(start));
    if (!boundary) return '';
    let encoded = raw.slice(
        start,
        start + boundary.index,
    ).trim();
    if (encoded.startsWith('"')) {
        encoded = encoded.slice(1);
    }
    if (encoded.endsWith('"')) {
        encoded = encoded.slice(0, -1);
    }
    return decodeStreamingJsonString(
        encoded,
        true,
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
    const worldChanges =
        extractStreamingJsonObjectField(
            raw,
            'worldChanges',
        );
    const relationshipUpdates =
        extractStreamingJsonArrayField(
            raw,
            'relationshipUpdates',
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
        !authorQuillEn ||
        !Array.isArray(
            unresolvedThreadsEn,
        ) ||
        !worldChanges ||
        !Array.isArray(
            relationshipUpdates,
        ) ||
        !nextScene
    ) {
        return null;
    }
    return {
        transitionMinutes,
        nextClock,
        closureSummaryEn,
        authorQuillEn,
        unresolvedThreadsEn,
        worldChanges,
        relationshipUpdates,
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

function extractStreamingActorUpdates(raw) {
    const match = /"actorUpdates"\s*:\s*\[/.exec(raw);
    if (!match) return [];
    const updates = [];
    let cursor = match.index + match[0].length;
    while (cursor < raw.length && updates.length < 24) {
        const start = raw.indexOf('{', cursor);
        if (start < 0) break;
        const object = extractBalancedJsonObject(raw, start);
        if (!object) {
            const fragment = raw.slice(start);
            const id =
                extractStreamingJsonStringField(
                    fragment,
                    'id',
                );
            const currentActivityEn =
                extractStreamingJsonStringField(
                    fragment,
                    'currentActivityEn',
                );
            if (id && currentActivityEn) {
                const mapId =
                    extractStreamingJsonStringField(
                        fragment,
                        'mapId',
                    );
                const roomId =
                    extractStreamingJsonStringField(
                        fragment,
                        'roomId',
                    );
                const present =
                    /"present"\s*:\s*(true|false)/
                        .exec(fragment)?.[1];
                updates.push({
                    id,
                    ...(present
                        ? {
                            present:
                                present === 'true',
                        }
                        : {}),
                    currentActivityEn,
                    ...(mapId ? { mapId } : {}),
                    ...(roomId ? { roomId } : {}),
                });
            }
            break;
        }
        if (object.value?.id &&
            object.value?.currentActivityEn) {
            updates.push(object.value);
        }
        cursor = object.end;
    }
    return updates;
}

export function recoverScenePerformancePayload(rawText) {
    const raw = String(rawText || '');
    const publicEventEn =
        extractStreamingJsonStringField(
            raw,
            'publicEventEn',
        ) ||
        extractStreamingLooseJsonStringField(
            raw,
            'publicEventEn',
            [
                'eventEnded',
                'pacingBeatRealized',
                'checkApplied',
                'sceneProgression',
                'segments',
            ],
        );
    const segments = extractStreamingSceneSegments(raw)
        .filter(segment => !segment.partial)
        .map(({ partial, ...segment }) => segment);
    if (!segments.length) {
        return null;
    }
    const booleanField = key => new RegExp(
        `"${key}"\\s*:\\s*(true|false)`,
    ).exec(raw)?.[1] === 'true';
    return {
        ...(publicEventEn
            ? { publicEventEn }
            : {}),
        eventEnded:
            booleanField('eventEnded'),
        pacingBeatRealized:
            booleanField('pacingBeatRealized'),
        checkApplied: booleanField('checkApplied'),
        sceneProgression:
            extractStreamingJsonObjectField(
                raw,
                'sceneProgression',
            ),
        actorPresence:
            extractStreamingJsonObjectField(
                raw,
                'actorPresence',
            ),
        segments,
        actorUpdates:
            extractStreamingActorUpdates(raw),
    };
}

export const CAMPAIGN_PRESETS = Object.freeze({
    canon_1991: {
        id: 'canon_1991',
        name: '与哈利同届',
        eyebrow: 'Canon Cohort',
        description: '1991 年收到入学通知。原著人物与事件按既定条件开始运行。',
        startYear: 1991,
        grade: 1,
        lockedYear: true,
        lockedGrade: true,
    },
    hogwarts_student: {
        id: 'hogwarts_student',
        name: '霍格沃茨在校生',
        eyebrow: 'Open School Years',
        description: '从任意年级进入校园。已有课程、关系与能力会写入角色背景。',
        startYear: 1991,
        grade: 3,
        lockedYear: false,
        lockedGrade: false,
    },
    marauders_era: {
        id: 'marauders_era',
        name: '掠夺者时代',
        eyebrow: 'Earlier Generation',
        description: '从 1971 年的霍格沃茨开始，在战争阴影形成前建立自己的因果。',
        startYear: 1971,
        grade: 1,
        lockedYear: true,
        lockedGrade: false,
    },
});

export const DIFFICULTY_PRESETS = Object.freeze({
    narrative: {
        id: 'narrative',
        name: '叙事',
        description: '后果仍然成立，但危险升级更缓慢，失败更常转化为新情节。',
    },
    standard: {
        id: 'standard',
        name: '标准',
        description: '按规则完整结算风险、关系破裂、处分与伤势。',
    },
    harsh: {
        id: 'harsh',
        name: '严酷',
        description: '资源紧张、敌人更主动，永久伤势与死亡更早进入结果集合。',
    },
});

export function createDefaultCampaign() {
    return {
        presetId: 'canon_1991',
        startYear: 1991,
        grade: 1,
        difficulty: 'standard',
    };
}

export function normalizeCampaign(campaign = {}) {
    const preset = CAMPAIGN_PRESETS[campaign.presetId] || CAMPAIGN_PRESETS.canon_1991;
    const difficulty = DIFFICULTY_PRESETS[campaign.difficulty] ? campaign.difficulty : 'standard';
    const grade = preset.lockedGrade
        ? preset.grade
        : Math.min(7, Math.max(1, Number.parseInt(campaign.grade, 10) || preset.grade));
    const startYear = preset.lockedYear
        ? preset.startYear
        : Math.min(2020, Math.max(1900, Number.parseInt(campaign.startYear, 10) || preset.startYear));
    return {
        presetId: preset.id,
        presetName: preset.name,
        startYear,
        grade,
        difficulty,
        difficultyName: DIFFICULTY_PRESETS[difficulty].name,
    };
}

export function buildCampaignContext(campaign) {
    const normalized = normalizeCampaign(campaign);
    const preset = CAMPAIGN_PRESETS[normalized.presetId];
    const difficulty = DIFFICULTY_PRESETS[normalized.difficulty];
    return `CAMPAIGN CONFIGURATION (binding state):
- Story blueprint: ${preset.name}
- Starting school year: ${normalized.startYear}
- Starting grade: ${normalized.grade}
- Difficulty: ${difficulty.name}
- Difficulty behavior: ${difficulty.description}

Begin at a point appropriate to this year and grade. Do not replay first-year admission events for an older student unless their background explicitly requires it.`;
}

export const DEFAULT_WORLD_PROMPT = `You are the narrative and rules engine for a persistent role-playing game set in the Harry Potter wizarding world.

Begin from the selected point in Harry Potter canon, including the era, institutions, magic, social norms, and characters that exist at that time. Treat established world facts, character motives, relationships, time, location, inventory, injuries, and prior consequences as binding state. Canon is the initial condition, not a protected outcome. Player actions may create coherent butterfly effects.

Write immersive literary role-play that can naturally mix physical action, dialogue, observation, and private thought in one continuous response. NPCs have independent motives and may refuse, deceive, withdraw, or become permanently hostile. Do not protect the player from earned consequences. Never decide the player's unspoken choices or actions.

When an action has uncertain and meaningful consequences, stop before resolving it so the rules layer can request a check. Otherwise continue until the next point that requires player input.`;

export const ENGLISH_OUTPUT_CONTRACT = `OUTPUT LANGUAGE CONTRACT:
- Produce all narrative, dialogue, labels, and structured values in English only.
- Do not output Chinese or provide a bilingual answer.
- Preserve paragraph breaks and proper nouns.
- The application translates the completed English response for display. English remains the authoritative source stored in context.`;

export const CANON_WIT_TONE_CONTRACT = `NARRATIVE VOICE CONTRACT — ORIGINAL, CANON-COMPATIBLE BRITISH WIT:

CORE VOICE
- Write original prose. Do not copy, quote, paraphrase, or imitate any published author's distinctive sentences.
- Use clear everyday British English. The wit comes from exact observation, social rank, bad manners under good manners, and magic causing practical inconvenience, not from ornamental phrasing.
- Treat the wizarding world as lived-in. A moving portrait can be vain, a school rule can be ridiculous, and an owl can make a mess. Characters who live here do not marvel at every ordinary enchantment.
- Keep danger sincere. Humour may make fear more human, but must never turn a dangerous scene into a routine of jokes.
- Give every NPC a private conversational purpose. Their lines should evade, press, flatter, rebuke, bargain, or reveal bounded information in a voice shaped by age, class, temperament, and current irritation.

PROSE DISCIPLINE
- Show what is presently observable: an action, spoken line, physical consequence, or specific usable detail. Do not fill space with things that do not happen, vague atmosphere, or an object's unexplained behaviour.
- Every paragraph must earn its place by changing the physical situation, advancing a conversation, revealing character through behaviour, planting an observable detail, or sharpening a consequence. Otherwise cut it.
- Prefer concrete nouns and active verbs. Use one or two telling sensory details, not a catalogue of sight, sound, smell, texture, and temperature.
- Vary sentence and paragraph length with the action. Let comic observations arrive plainly. Use fragments, semicolons, em dashes, ellipses, and rhetorical triplets rarely, never as a default cadence.
- Trust subtext. Do not explain a joke, translate a facial expression into an emotion, announce that tension is palpable, or summarise what a moment "seems to say."
- A quiet beat still needs evidence: a spoon bent in someone's grip, shoes stopping outside the door, or a reply left conspicuously unsigned. "Silence" by itself is not an event.
- Use at most one sharp comic observation in a dramatic beat. Not every paragraph needs wit.

RECENCY-AWARE VARIATION
- Track and self-correct the prose choices made across recent responses. Actively break their patterns and parallelisms by changing sentence structures, line lengths, rhythms, paragraph shapes, openings, transitions, and closures.
- Treat recently used wording, sentence shapes, cadences, comparison mechanics, sensory anchors, mentions, and descriptors as spent material. Re-express the beat through a genuinely different narrative route, or leave the repeated detail unstated.
- Rotate the means of characterization among physical action, object handling, dialogue timing, spatial choice, consequence, and concise narrator judgment. Do not merely swap synonyms while preserving the same explanatory sentence frame.
- Vary how each response enters the scene and how each paragraph begins. If a recent response opened with dialogue, a summary beat, or a character comparison, choose another entry point that fits the present action.
- Prioritize story flow over exhaustive callbacks. A detail from the previous turn may remain unmentioned when repeating it would add no new action, pressure, or meaning.

CALIBRATION EXAMPLES
BAD: "The kettle, silent for several minutes, begins to tick again — cooling or warming, impossible to tell."
BETTER: "The kettle clicked on behind Mrs Zhang. She left it boiling, apparently on behalf of the whole family."

BAD: "A palpable tension settled over the room, heavy with all that remained unspoken."
BETTER: "Mr Zhang folded the letter twice. It had arrived already folded, but he appeared to think the school might take the hint."

BAD: "McGonagall's eyes held a storm of conflicting emotions as she regarded the child."
BETTER: "McGonagall looked from the muddy wand to the ceiling. 'An explanation, Miss Zhang. A short one, if you please.'"

BAD: "The corridor held its breath. Shadows danced, and somewhere in the distance, fate began to stir."
BETTER: "A suit of armour sneezed behind them, dropped its halberd, and blamed the draught."

AVOID
- Purple prose, trailer language, generic AI sentiment, therapy-speak, modern internet slang, camera directions, decorative metaphors, and portentous closing lines.
- False ambiguity such as "whether X or Y, impossible to tell"; stock phrases such as "a mix of emotions," "the air was thick," "for a moment, time stood still," or "something shifted"; and strings of negated non-events such as "no one spoke, no one moved."
- Repeated personification of rooms, silence, shadows, air, time, fate, or household objects. Personify only for a concrete comic effect that reveals the observer or changes the scene.
- Generic reactions shared by every character. Preserve canon-compatible motives and restrained individual voices, and never reuse lines from the books.

End on a concrete social, magical, or consequential turn that genuinely requires the player's response, not an ominous narrator flourish.`;

export const CANON_CAST_IDENTITY_CONTRACT = `CAST IDENTITY AUTHORITY:
- A recurring person who participates in a named actor's exchange, is consulted for help, or performs more than one distinct beat is a cast member, not anonymous crowd texture.
- A supplied known or unmet actor may participate only through their stable actor ID. If an absent supplied actor is used, add that ID to actorEntrances; when a new guest and an existing entrance both participate, use kind mixed.
- Never smuggle a recognizable Canon or known actor into beatEn, pressureEn, currentActivityEn, or narration as a distinctive unnamed companion. Either admit the supplied actor by stable ID or omit that companion.
- Anonymous crowd texture is reserved for fleeting people without actor IDs who do not speak, receive state, participate in the exchange, or recur across the response.
- In on-scene prose, once a present named actor is individually identified by placement or action, use their supplied nameEn at the first clear reference. Do not demote a present named actor to a hair colour, age, house, or other anonymous descriptor merely because they are not directly addressed.`;

export function buildSystemPrompt(worldPrompt = DEFAULT_WORLD_PROMPT) {
    return `${String(worldPrompt || DEFAULT_WORLD_PROMPT).trim()}\n\n${CANON_WIT_TONE_CONTRACT}\n\n${ENGLISH_OUTPUT_CONTRACT}`;
}

export const STORY_TONE_VALUES =
    Object.freeze([
        'balanced',
        'adventure',
        'mystery',
        'social',
    ]);
export const RELATIVE_AGE_PREFERENCE_VALUES =
    Object.freeze([
        'peer_focused',
        'mixed',
        'intergenerational',
    ]);
export const SOCIAL_DENSITY_VALUES =
    Object.freeze([
        'intimate',
        'balanced',
        'ensemble',
    ]);
export const CANON_DENSITY_VALUES =
    Object.freeze([
        'original_focused',
        'balanced',
        'canon_focused',
    ]);
export const RELATIONSHIP_FOCUS_VALUES =
    Object.freeze([
        'friendship',
        'romance',
        'rivalry',
        'mentorship',
        'family',
    ]);

export function normalizeStoryPreferences(
    preferences = {},
) {
    const relationshipFocus = [
        ...new Set(
            (
                Array.isArray(
                    preferences
                        .relationshipFocus,
                )
                    ? preferences
                        .relationshipFocus
                    : [
                        'friendship',
                        'rivalry',
                    ]
            ).filter(value =>
                RELATIONSHIP_FOCUS_VALUES
                    .includes(value)),
        ),
    ];
    return {
        tone: STORY_TONE_VALUES
            .includes(preferences.tone)
            ? preferences.tone
            : 'balanced',
        relationshipFocus:
            relationshipFocus.length
                ? relationshipFocus
                : [
                    'friendship',
                    'rivalry',
                ],
        socialDensity:
            SOCIAL_DENSITY_VALUES
                .includes(
                    preferences
                        .socialDensity,
                )
                ? preferences
                    .socialDensity
                : 'balanced',
        relativeAgePreference:
            RELATIVE_AGE_PREFERENCE_VALUES
                .includes(
                    preferences
                        .relativeAgePreference,
                )
                ? preferences
                    .relativeAgePreference
                : 'peer_focused',
        canonDensity:
            CANON_DENSITY_VALUES
                .includes(
                    preferences
                        .canonDensity,
                )
                ? preferences
                    .canonDensity
                : 'balanced',
    };
}

function calculateAgeOnDate(
    birthDate,
    worldClock,
) {
    const birth = String(
        birthDate || '',
    ).match(
        /^(\d{4})-(\d{2})-(\d{2})$/,
    );
    const current = String(
        worldClock || '',
    ).match(
        /^(\d{4})-(\d{2})-(\d{2})/,
    );
    if (!birth || !current) return null;
    let age =
        Number(current[1]) -
        Number(birth[1]);
    if (
        Number(current[2]) <
            Number(birth[2]) ||
        (
            Number(current[2]) ===
                Number(birth[2]) &&
            Number(current[3]) <
                Number(birth[3])
        )
    ) {
        age--;
    }
    return age;
}

export function getPlayerAgeAtClock(
    worldState,
) {
    const exact = calculateAgeOnDate(
        worldState.character?.identity
            ?.birthDate,
        worldState.clock,
    );
    if (Number.isFinite(exact)) {
        return exact;
    }
    const baseAge = Number(
        worldState.character?.identity
            ?.age,
    );
    const currentYear = Number(
        String(worldState.clock || '')
            .match(/^(\d{4})/)?.[1],
    );
    const startYear = Number(
        worldState.campaign?.startYear,
    );
    return Number.isFinite(baseAge)
        ? baseAge +
            (
                Number.isFinite(
                    currentYear,
                ) &&
                Number.isFinite(
                    startYear,
                )
                    ? currentYear -
                        startYear
                    : 0
            )
        : null;
}

function getActorAgeAtClock(
    worldState,
    actor,
) {
    const exact = calculateAgeOnDate(
        actor?.birthDate,
        worldState.clock,
    );
    if (Number.isFinite(exact)) {
        return exact;
    }
    const currentYear = Number(
        String(worldState.clock || '')
            .match(/^(\d{4})/)?.[1],
    );
    const birthYear = Number(
        actor?.birthYear,
    );
    if (
        Number.isFinite(currentYear) &&
        Number.isFinite(birthYear)
    ) {
        return currentYear - birthYear;
    }
    const canon = getCanonSettingProfile(
        actor?.canonCatalogId ||
        actor?.nameEn,
        {
            worldYear: currentYear,
            playerAge:
                getPlayerAgeAtClock(
                    worldState,
                ),
        },
    );
    return Number.isFinite(
        canon?.estimatedAge,
    )
        ? canon.estimatedAge
        : null;
}

export function getRelativeAgeProfile(
    worldState,
    actor,
) {
    const playerAge =
        getPlayerAgeAtClock(
            worldState,
        );
    const actorAge =
        getActorAgeAtClock(
            worldState,
            actor,
        );
    if (
        !Number.isFinite(playerAge) ||
        !Number.isFinite(actorAge)
    ) {
        return {
            playerAge,
            actorAge,
            ageDelta: null,
            relativeAgeBand: 'unknown',
        };
    }
    const ageDelta =
        actorAge - playerAge;
    return {
        playerAge,
        actorAge,
        ageDelta,
        relativeAgeBand:
            ageDelta <= -6
                ? 'much_younger'
                : ageDelta <= -2
                    ? 'younger_peer'
                    : ageDelta <= 1
                        ? 'same_age'
                        : ageDelta <= 5
                            ? 'older_peer'
                            : 'older_generation',
    };
}

export function buildPlayerVisibleProfile(
    worldState = {},
) {
    const identity =
        worldState.character?.identity || {};
    const background =
        worldState.character?.background ||
        {};
    return {
        name:
            String(identity.name || '').trim(),
        pronouns:
            String(
                identity.pronouns || '',
            ).trim(),
        age:
            getPlayerAgeAtClock(worldState),
        heritage:
            String(
                identity.heritage ||
                identity.ethnicity ||
                background.ethnicity ||
                background
                    .culturalBackground ||
                '',
            ).trim(),
        appearance:
            String(
                identity.appearance || '',
            ).trim(),
    };
}

export function createDefaultCharacterDraft() {
    return {
        identity: {
            name: '',
            pronouns: '',
            age: 11,
            birthDate: '1980-07-01',
            heritage: '',
            appearance: '',
        },
        background: {
            bloodStatus: '',
            guardian: '',
            home: '',
            economy: '',
            desire: '',
            fear: '',
            habit: '',
            formativeEvent: '',
        },
        aptitudes: {
            learning: '',
            physical: '',
            observation: '',
            social: '',
            pressure: '',
            magicalPotential: 'balanced',
            strongDomain: '',
            weakDomain: '',
            rareTalent: 'none',
        },
        attributes: {
            physique: 10,
            agility: 10,
            perception: 11,
            intellect: 11,
            willpower: 11,
            charisma: 10,
        },
        storyPreferences:
            normalizeStoryPreferences(),
        polishedBackground: '',
        confirmed: false,
    };
}

export function validateCharacterDraft(character) {
    const errors = [];
    if (!String(character?.identity?.name || '').trim()) {
        errors.push('请填写角色姓名。');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(
        String(
            character?.identity
                ?.birthDate || '',
        ),
    )) {
        errors.push(
            '请填写固定出生日期。',
        );
    }
    if (!String(character?.background?.guardian || '').trim()) {
        errors.push('请填写监护人或家庭关系。');
    }
    if (!String(character?.background?.desire || '').trim()) {
        errors.push('请填写角色最想得到的事物。');
    }
    if (!String(character?.background?.fear || '').trim()) {
        errors.push('请填写角色最害怕的事物。');
    }
    if (
        !normalizeStoryPreferences(
            character?.storyPreferences,
        ).relationshipFocus.length
    ) {
        errors.push(
            '请至少选择一种关系体验。',
        );
    }

    const attributes = character?.attributes || {};
    const values = CHARACTER_ATTRIBUTE_KEYS.map(key => Number(attributes[key]));
    if (values.some(value => !Number.isInteger(value) || value < 7 || value > 14)) {
        errors.push('六项属性必须是 7–14 之间的整数。');
    } else if (values.reduce((sum, value) => sum + value, 0) !== CHARACTER_ATTRIBUTE_BUDGET) {
        errors.push(`六项属性总和必须为 ${CHARACTER_ATTRIBUTE_BUDGET}。`);
    }
    return errors;
}

export function buildCharacterContext(character) {
    if (!character?.confirmed) {
        return '';
    }
    return `PLAYER CHARACTER (binding state):
${JSON.stringify(character, null, 2)}

Do not alter confirmed player facts. Never speak, decide, or act on behalf of this character beyond actions explicitly supplied by the player.`;
}

export function buildMandatorySceneState(
    worldState = {},
) {
    const presentActors = (worldState.actors || [])
        .filter(actor => actor.present !== false);
    const presentActorIds = new Set(
        presentActors.map(actor => actor.id),
    );
    const profiles = new Map(
        (worldState.actorLibrary || [])
            .filter(profile =>
                presentActorIds.has(profile.id))
            .map(profile => [profile.id, profile]),
    );
    const scene = worldState.scene
        ? {
            id: worldState.scene.id,
            name: worldState.scene.name,
            nameEn: worldState.scene.nameEn,
            summary: worldState.scene.summary,
            summaryEn: worldState.scene.summaryEn,
            explorationHook:
                worldState.scene.explorationHook,
            explorationHookEn:
                worldState.scene.explorationHookEn,
            temporalFactsEn:
                worldState.scene
                    .temporalFactsEn || [],
            mapId: worldState.scene.mapId,
            roomId: worldState.scene.roomId,
            itemStates:
                worldState.scene
                    .itemStates || [],
            nextSceneIntent:
                worldState.scene.nextSceneIntent || null,
            pacingPressureEn:
                worldState.scene.pacingPressureEn || '',
        }
        : null;
    return {
        clock: worldState.clock,
        chapter: worldState.chapter,
        location: worldState.location,
        scene,
        playerPosition: {
            mapId:
                worldState.map?.activeMapId || null,
            roomId:
                worldState.map?.currentLocalNodeId || null,
            visibleResiduesEn:
                worldState.map
                    ?.roomStates?.[
                        `${worldState.map?.activeMapId}:${worldState.map?.currentLocalNodeId}`
                    ]
                    ?.visibleResiduesEn ||
                [],
            materialEffects:
                buildCurrentMaterialState(
                    worldState,
                ).roomEffects,
        },
        currentMaterialState:
            buildCurrentMaterialState(
                worldState,
            ),
        presentActors: presentActors.map(actor => ({
            id: actor.id,
            nameEn: actor.nameEn,
            roleEn: actor.roleEn,
            relationshipToPlayerEn:
                actor.relationshipToPlayerEn,
            impressionOfPlayerEn:
                actor.impressionOfPlayerEn,
            currentActivityEn:
                actor.currentActivityEn,
            currentIntentEn: actor.currentIntentEn,
            knownRumors:
                getActorKnownRumors(
                    worldState,
                    actor.id,
                ),
            lifeStatus:
                actor.lifeStatus || 'alive',
            lifeStatusPermanent:
                Boolean(
                    actor.lifeStatusPermanent,
                ),
            lifeStatusDetailEn:
                actor.lifeStatusDetailEn ||
                (
                    actor.lifeStatus === 'dead'
                        ? ''
                        : 'Alive.'
                ),
            mapId: actor.mapId,
            roomId: actor.roomId,
            presentation:
                worldState
                    .actorPresentations?.[
                        actor.id
                    ] ||
                null,
        })),
        actorPerformance: presentActors.map(actor => {
            const profile = profiles.get(actor.id) || {};
            const normalized =
                normalizeActorMemoryProfile(
                    profile,
                    actor,
                );
            return {
                id: actor.id,
                personalityEn: profile.personalityEn,
                speechStyleEn: profile.speechStyleEn,
                privateGoalEn: profile.privateGoalEn,
                fearEn: profile.fearEn,
                knowledgeEn:
                    normalized.knowledgeEn,
            };
        }),
        behavioralEnvironment:
            buildBehavioralEnvironment(
                worldState,
            ),
        dailyDirectives: (
            worldState.dailyDirector?.plan
                ?.actorDirectives || []
        ).filter(directive =>
            presentActorIds.has(directive.id)),
        pacingDirective:
            worldState.pacingDirector?.pendingBeat
                ?.status === 'pending'
                ? (
                    worldState
                        .pacingDirector
                        .pendingBeat
                        .causalCollapse
                        ? {
                            ...worldState
                                .pacingDirector
                                .pendingBeat,
                            causalCollapse: {
                                recordId:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .recordId ||
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .id,
                                kind:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .kind,
                                surfaceMode:
                                    'aftermath',
                                visibleResiduesEn:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .visibleResiduesEn,
                                aftermathEn:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .aftermathEn,
                            },
                        }
                        : worldState
                            .pacingDirector
                            .pendingBeat
                )
                : null,
        recentWorldNews:
            (worldState.worldNews || [])
                .slice(-4)
                .map(brief => ({
                    id: brief.id,
                    headlineEn:
                        brief.headlineEn,
                    briefEn: brief.briefEn,
                    category: brief.category,
                    happenedClock:
                        brief.happenedClock,
                })),
        publicConflict: worldState.conflict
            ? {
                title:
                    worldState.conflict.title ||
                    worldState.conflict.titleEn,
                immediatePressure:
                    worldState.conflict.immediatePressure ||
                    worldState.conflict
                        .immediatePressureEn,
                stakes:
                    worldState.conflict.stakes ||
                    worldState.conflict.stakesEn,
            }
            : null,
        agenda: (worldState.agenda || []).slice(-8),
        discoveredClues: (worldState.clues || [])
            .filter(clue => clue.discovered === true),
        items: worldState.items || [],
        knownSpells:
            (
                worldState
                    .spellbook
                    ?.known ||
                []
            ).map(entry => {
                const spell =
                    getSpellDefinition(
                        entry.spellId,
                    );
                return spell
                    ? {
                        spellId:
                            spell.id,
                        incantation:
                            spell.incantation,
                        effectEn:
                            spell.effectEn,
                        proficiencyRank:
                            entry
                                .proficiencyRank,
                        proficiencyXp:
                            entry
                                .proficiencyXp,
                    }
                    : null;
            }).filter(Boolean),
    };
}

export const RELATIONSHIP_MEMORY_VERSION = 6;
export const FIRST_IMPRESSION_VERSION = 1;
export const ACTOR_KNOWLEDGE_VERSION = 1;
export const ACTOR_KNOWLEDGE_BOUNDARY_EN =
    'Use only current-scene observations, actor-specific memories, witnessed social evidence, known rumors, and supplied current-date public facts.';
export const SOCIAL_GRAPH_VERSION = 2;
export const SOCIAL_GRAPH_EXTRACTOR_VERSION = 6;
export const SOCIAL_RELATIONSHIP_DIMENSION_RANGES =
    Object.freeze({
        familiarity: Object.freeze({
            minimum: 0,
            maximum: 100,
        }),
        closeness: Object.freeze({
            minimum: 0,
            maximum: 100,
        }),
        warmth: Object.freeze({
            minimum: -100,
            maximum: 100,
        }),
        trust: Object.freeze({
            minimum: -100,
            maximum: 100,
        }),
        respect: Object.freeze({
            minimum: -100,
            maximum: 100,
        }),
        influence: Object.freeze({
            minimum: -100,
            maximum: 100,
        }),
        tension: Object.freeze({
            minimum: 0,
            maximum: 100,
        }),
        resentment: Object.freeze({
            minimum: 0,
            maximum: 100,
        }),
        fear: Object.freeze({
            minimum: 0,
            maximum: 100,
        }),
        protectiveness: Object.freeze({
            minimum: 0,
            maximum: 100,
        }),
    });
export const SOCIAL_RELATIONSHIP_DIMENSIONS =
    Object.freeze(
        Object.keys(
            SOCIAL_RELATIONSHIP_DIMENSION_RANGES,
        ),
    );
export const SOCIAL_RELATIONSHIP_EMOTIONS =
    Object.freeze([
        'anger',
        'fear',
        'contempt',
        'disgust',
        'envy',
        'shame',
        'guilt',
        'gratitude',
        'admiration',
        'hope',
        'disappointment',
        'relief',
        'pity',
        'joy',
        'distress',
    ]);
export const SOCIAL_RELATIONSHIP_STRUCTURAL_TAGS =
    Object.freeze([
        'family',
        'authority',
        'classmate',
        'rivalry',
        'mentor',
    ]);
const SOCIAL_ACTIVE_EMOTION_DECAY_PER_TURN = 1;
export const SOCIAL_RELATIONSHIP_CLOSENESS_ANCHORS =
    Object.freeze([
        Object.freeze({
            value: 0,
            label: '无关系',
        }),
        Object.freeze({
            value: 10,
            label: '初识',
        }),
        Object.freeze({
            value: 20,
            label: '熟人',
        }),
        Object.freeze({
            value: 35,
            label: '朋友',
        }),
        Object.freeze({
            value: 50,
            label: '密友',
        }),
        Object.freeze({
            value: 70,
            label: '知己',
        }),
        Object.freeze({
            value: 90,
            label: '终身或家庭级纽带',
        }),
    ]);
export const SOCIAL_RELATIONSHIP_SIGNED_ANCHORS =
    Object.freeze([-75, -50, -20, 0, 20, 50, 75]);
export const SOCIAL_RELATIONSHIP_NEGATIVE_ANCHORS =
    Object.freeze([10, 20, 35, 50, 70, 90]);
export const IMPRESSION_MAX_WORDS = 16;
export const FIRST_IMPRESSION_MAX_WORDS = 24;
export const IMPRESSION_UPDATE_COOLDOWN_TURNS = 3;
export const ENTITY_STATE_VERSION = 1;
export const OBSERVED_INVENTORY_VERSION = 1;
export const ACTOR_MOVEMENT_HISTORY_VERSION = 2;
export const ITEM_IMPORTANCE_VALUES = Object.freeze([
    'key',
    'important',
    'ordinary',
]);
export const ITEM_CUSTODY_VALUES = Object.freeze([
    'carried',
    'equipped',
    'stored',
    'consumed',
    'lost',
]);
export const ACTOR_LIFE_STATUS_VALUES = Object.freeze([
    'alive',
    'injured',
    'incapacitated',
    'missing',
    'dead',
]);
export const SHARED_MEMORY_TIER_LIMITS = Object.freeze({
    core: 3,
    recent: 6,
    everyday: 8,
});

const SHARED_MEMORY_TIERS = Object.freeze([
    'core',
    'recent',
    'everyday',
]);

const IMPORTANT_ITEM_PATTERN =
    /(?:\b(?:wand|key|letter|journal|diary|map|permit|token|ring|amulet|artifact|heirloom|autograph|signed parchment)\b|魔杖|钥匙|信件|日记|地图|许可证|信物|戒指|护符|魔法物品|传家宝|签名|签名羊皮纸)/i;
const ORDINARY_TRANSIENT_ITEM_PATTERN =
    /(?:\b(?:food|meal|snack|sweet|toffee|pasty|tart|drink|wrapper|receipt)\b|食物|饭|零食|糖果|太妃糖|馅饼|饮料|包装|收据)/i;
const DURABLE_ACQUISITION_PATTERN =
    /(?:\b(?:belongs? to|became .{0,24}(?:property|possession)|bought|purchased|received|accepted|acquired|was given|was handed|purchase (?:is|was) complete|fitting (?:is|was) resolved|has chosen)\b|归.+所有|买下|购买完成|得到|收下|交给|正式获得|认主|选择了)/i;
const PLAYER_KEEP_ITEM_PATTERN =
    /(?:保留|收好|带上|随身|装进|放进(?:包|口袋)|拿走|留着|keep|save|carry|take (?:it|this|the)|put (?:it|this|the) (?:away|in)|hold on to)/i;

function inferItemImportance(
    item = {},
) {
    if (ITEM_IMPORTANCE_VALUES.includes(
        item.importance,
    )) {
        return item.importance;
    }
    const text = [
        item.id,
        item.labelEn,
        item.label,
        item.detailEn,
        item.detail,
    ].filter(Boolean).join(' ');
    if (IMPORTANT_ITEM_PATTERN.test(text)) {
        return 'key';
    }
    return 'ordinary';
}

function inferItemKind(
    value,
) {
    const text = typeof value === 'string'
        ? value
        : [
            value?.id,
            value?.labelEn,
            value?.label,
            value?.detailEn,
            value?.detail,
        ].filter(Boolean).join(' ');
    const kinds = [
        ['wand', /(?:\bwand\b|魔杖)/i],
        ['key', /(?:\bkey\b|钥匙)/i],
        ['letter', /(?:\bletter\b|信件|通知书)/i],
        ['journal', /(?:\b(?:journal|diary)\b|日记)/i],
        ['map', /(?:\bmap\b|地图)/i],
        ['permit', /(?:\bpermit\b|许可证)/i],
        ['token', /(?:\btoken\b|信物)/i],
        ['jewellery', /(?:\b(?:ring|amulet)\b|戒指|护符)/i],
    ];
    return kinds.find(([, pattern]) =>
        pattern.test(text))?.[0] ||
        'other';
}

export function normalizeInventoryItem(
    item = {},
    index = 0,
    defaults = {},
) {
    const importance = inferItemImportance(item);
    const custody =
        ITEM_CUSTODY_VALUES.includes(item.custody)
            ? item.custody
            : importance === 'ordinary'
                ? 'stored'
                : 'carried';
    const ownerId = String(
        item.ownerId ||
        defaults.ownerId ||
        'player',
    ).trim();
    const activeWithOwner = [
        'carried',
        'equipped',
    ].includes(custody);
    return {
        ...item,
        id: normalizeMemoryId(
            item.id,
            `item_${index + 1}`,
        ),
        labelEn: String(
            item.labelEn ||
            item.label ||
            `Item ${index + 1}`,
        ).trim(),
        label: String(
            item.label ||
            item.labelEn ||
            `物品 ${index + 1}`,
        ).trim(),
        detailEn: String(
            item.detailEn ||
            item.detail ||
            '',
        ).trim(),
        detail: String(
            item.detail ||
            item.detailEn ||
            '',
        ).trim(),
        kind: item.kind ||
            inferItemKind(item),
        importance,
        custody,
        ownerId,
        mapId: activeWithOwner
            ? String(
                defaults.mapId ||
                item.mapId ||
                '',
            )
            : String(
                item.mapId ||
                defaults.mapId ||
                '',
            ),
        roomId: activeWithOwner
            ? String(
                defaults.roomId ||
                item.roomId ||
                '',
            )
            : String(
                item.roomId ||
                defaults.roomId ||
                '',
            ),
        status: [
            'available',
            'damaged',
            'consumed',
            'lost',
        ].includes(item.status)
            ? item.status
            : custody === 'consumed'
                ? 'consumed'
                : custody === 'lost'
                    ? 'lost'
                    : 'available',
        acquiredClock:
            item.acquiredClock ||
            defaults.clock ||
            '',
        updatedClock:
            item.updatedClock ||
            item.acquiredClock ||
            defaults.clock ||
            '',
        source: item.source || defaults.source || 'world',
    };
}

export function projectObservedInventoryUpdates(
    observedUpdates,
    worldState,
    playerAction,
    narrativeText,
) {
    const existingItems =
        new Map(
            (
                worldState.items ||
                []
            ).map((item, index) => {
                const normalized =
                    normalizeInventoryItem(
                        item,
                        index,
                    );
                return [
                    normalized.id,
                    normalized,
                ];
            }),
        );
    const allowedActions =
        new Set([
            'acquire',
            'update',
            'carry',
            'equip',
            'store',
            'consume',
            'lose',
        ]);
    const explicitPossession =
        /(?:\b(?:take|takes|took|pick(?:ed)? up|receive[ds]?|accept(?:ed)?|claim(?:ed)?|keep|kept|carry|carried|hold(?:ing)?|held|clamped on|in (?:her|his|their) hand)\b|拿起|拿到|拿走|收下|收到|接过|认领|保留|留着|带着|握着|攥着|手里|随身)/iu;
    const projected = [];
    const seenIds =
        new Set();
    for (
        const observed
        of Array.isArray(
            observedUpdates,
        )
            ? observedUpdates
            : []
    ) {
        if (
            !observed ||
            Number(
                observed.confidence ||
                0,
            ) < 0.65 ||
            observed.ownerId !==
                'player' ||
            !allowedActions.has(
                observed.action,
            ) ||
            !/^[a-z][a-z0-9_]{1,79}$/u
                .test(
                    String(
                        observed.id ||
                        '',
                    ),
                ) ||
            seenIds.has(
                observed.id,
            )
        ) {
            continue;
        }
        const sourceText =
            observed.sourceKind ===
                'player'
                ? String(
                    playerAction ||
                    '',
                )
                : String(
                    narrativeText ||
                    '',
                );
        const evidence =
            String(
                observed.evidenceText ||
                '',
            ).trim();
        if (
            !evidence ||
            !sourceText.includes(
                evidence,
            )
        ) {
            continue;
        }
        const existing =
            existingItems.get(
                observed.id,
            );
        if (
            !existing &&
            (
                observed.action !==
                    'acquire' ||
                ![
                    'key',
                    'important',
                ].includes(
                    observed
                        .importance,
                ) ||
                ![
                    'carried',
                    'equipped',
                ].includes(
                    observed
                        .custody,
                ) ||
                !explicitPossession
                    .test(evidence) ||
                !String(
                    observed.labelEn ||
                    '',
                ).trim() ||
                !String(
                    observed.detailEn ||
                    '',
                ).trim()
            )
        ) {
            continue;
        }
        seenIds.add(
            observed.id,
        );
        projected.push({
            id:
                observed.id,
            action:
                existing &&
                observed.action ===
                    'acquire'
                    ? 'update'
                    : observed.action,
            labelEn:
                String(
                    observed.labelEn ||
                    existing?.labelEn ||
                    '',
                ).trim(),
            label:
                String(
                    observed.labelZh ||
                    existing?.label ||
                    observed.labelEn ||
                    '',
                ).trim(),
            detailEn:
                String(
                    observed.detailEn ||
                    existing?.detailEn ||
                    '',
                ).trim(),
            detail:
                String(
                    observed.detailZh ||
                    existing?.detail ||
                    observed.detailEn ||
                    '',
                ).trim(),
            importance:
                existing
                    ?.importance ||
                observed.importance,
            custody:
                observed.custody,
            ownerId: 'player',
        });
    }
    return projected;
}

export function migrateObservedInventoryState(
    worldState,
    chat = [],
) {
    if (
        Number(
            worldState
                .observedInventoryVersion ||
            0,
        ) >=
        OBSERVED_INVENTORY_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const recentMessages =
        (
            Array.isArray(chat)
                ? chat
                : []
        ).slice(-12);
    const playerText =
        recentMessages
            .filter(message =>
                message?.is_user)
            .map(message =>
                String(
                    message.mes ||
                    '',
                ))
            .join('\n');
    const narrativeText =
        recentMessages
            .flatMap(message =>
                (
                    message?.extra
                        ?.hogwartsMud
                        ?.turnTransaction
                        ?.segments ||
                    []
                ).map(segment =>
                    String(
                        segment.textEn ||
                        '',
                    )))
            .join('\n');
    const claimsAutograph =
        /(?:拿起.{0,16}签名|拿到.{0,16}签名|带着.{0,16}签名|收下.{0,16}签名|\b(?:took|picked up|kept|carried|received).{0,32}\bautograph\b)/iu
            .test(playerText);
    const confirmsAutograph =
        /(?:\b(?:signed parchment|autograph|crooked H)\b|签名羊皮纸|签下.{0,12}H|签名)/iu
            .test(narrativeText);
    const existingAutograph =
        (
            next.items ||
            []
        ).some(item =>
            /(?:autograph|signed_parchment|签名)/iu
                .test(
                    `${item.id || ''} ${item.labelEn || ''} ${item.label || ''}`,
                ));
    if (
        claimsAutograph &&
        confirmsAutograph &&
        !existingAutograph
    ) {
        const harry =
            (
                next.actorLibrary ||
                []
            ).find(actor =>
                actor.id ===
                    'canon_harry_james_potter');
        next.items = [
            ...(
                next.items ||
                []
            ),
            normalizeInventoryItem(
                {
                    id:
                        'harry_signed_parchment',
                    labelEn:
                        'Harry Potter Autograph',
                    label:
                        '哈利·波特的签名',
                    detailEn:
                        'Lavender Brown\'s Sorting notes parchment bearing Harry Potter\'s crooked H autograph.',
                    detail:
                        '拉文德·布朗的分院笔记羊皮纸，上面留着哈利·波特歪歪扭扭的 H 签名。',
                    kind: 'other',
                    importance:
                        'important',
                    custody:
                        'carried',
                    ownerId:
                        'player',
                    source:
                        'local_semantic_migration',
                    acquiredClock:
                        next.clock,
                    updatedClock:
                        next.clock,
                    actorId:
                        harry?.id ||
                        'canon_harry_james_potter',
                },
                (
                    next.items ||
                    []
                ).length,
                {
                    mapId:
                        next.map
                            ?.activeMapId,
                    roomId:
                        next.map
                            ?.currentLocalNodeId,
                    clock:
                        next.clock,
                },
            ),
        ];
        if (next.scene) {
            next.scene.itemStates =
                createSceneItemStates(
                    next.items,
                    {
                        mapId:
                            next.map
                                ?.activeMapId,
                        roomId:
                            next.map
                                ?.currentLocalNodeId,
                    },
                );
        }
    }
    next.observedInventoryVersion =
        OBSERVED_INVENTORY_VERSION;
    return {
        state: next,
        changed: true,
    };
}

export function createSceneItemStates(
    items = [],
    {
        mapId = '',
        roomId = '',
    } = {},
) {
    return (items || []).map((item, index) => {
        const normalized =
            normalizeInventoryItem(
                item,
                index,
                { mapId, roomId },
            );
        const followsPlayer = [
            'carried',
            'equipped',
        ].includes(normalized.custody) &&
            normalized.ownerId === 'player';
        return {
            id: normalized.id,
            custody: normalized.custody,
            ownerId: normalized.ownerId,
            mapId: followsPlayer
                ? mapId
                : normalized.mapId,
            roomId: followsPlayer
                ? roomId
                : normalized.roomId,
            status: normalized.status,
        };
    });
}

function compactMaterialText(
    value,
    maximumLength = 160,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function materialFingerprint(value) {
    return compactMaterialText(
        value,
        200,
    )
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}

function materialEffectIdentity(event) {
    return [
        event.category,
        event.type,
        event.operation,
        event.actorId,
        event.aspect,
        event.slot,
        event.hand,
        event.quantity || '',
        materialFingerprint(
            event.valueText ||
            event.objectText ||
            event.targetText,
        ),
        materialFingerprint(
            event.sourceText,
        ),
        materialFingerprint(
            event.targetText,
        ),
    ].join(':');
}

function normalizeMaterialEvent(
    source,
    worldState,
) {
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source) ||
        !MATERIAL_EVENT_TYPE_SET.has(
            source.type,
        )
    ) {
        return null;
    }
    const definition =
        MATERIAL_EVENT_DEFINITIONS[
            source.type
        ];
    const mapId =
        compactMaterialText(
            source.mapId,
            120,
        );
    const roomId =
        compactMaterialText(
            source.roomId,
            120,
        );
    const currentMapId =
        String(
            worldState.map?.activeMapId ||
            '',
        );
    const currentRoomId =
        String(
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
    const sceneId =
        compactMaterialText(
            worldState.scene?.id ||
            source.sceneId,
            120,
        );
    if (
        !mapId ||
        !roomId ||
        mapId !== currentMapId ||
        roomId !== currentRoomId
    ) {
        return null;
    }
    const validActorIds = new Set([
        'player',
        ...(worldState.actors || [])
            .map(actor => actor.id),
        ...(worldState.actorLibrary || [])
            .map(actor => actor.id),
    ]);
    const actorId =
        compactMaterialText(
            source.actorId,
            96,
        );
    if (
        actorId &&
        !validActorIds.has(actorId)
    ) {
        return null;
    }
    const objectText =
        compactMaterialText(
            source.objectText,
        );
    const sourceText =
        compactMaterialText(
            source.sourceText,
        );
    const targetText =
        compactMaterialText(
            source.targetText,
        );
    const valueText =
        compactMaterialText(
            source.valueText,
        );
    const previousValueText =
        compactMaterialText(
            source.previousValueText,
        );
    const resultText =
        compactMaterialText(
            source.resultText,
        );
    const operation =
        [
            'outfit_changed',
            'accessory_changed',
        ].includes(source.type) &&
        source.operation ===
            'remove'
            ? 'remove'
            : definition.operation;
    if (
        !MATERIAL_OPERATIONS.includes(
            operation,
        )
    ) {
        return null;
    }
    const fields = {
        actorId,
        objectText,
        sourceText,
        targetText,
        valueText,
        previousValueText,
        resultText,
    };
    if (
        (definition.required || [])
            .some(field =>
                !fields[field])
    ) {
        return null;
    }
    if (
        definition.requiredAny &&
        !definition.requiredAny.some(
            field => fields[field],
        )
    ) {
        return null;
    }
    if (
        definition
            .requiredUnlessRemove &&
        operation !== 'remove' &&
        !fields[
            definition
                .requiredUnlessRemove
        ]
    ) {
        return null;
    }
    const slot =
        APPEARANCE_SLOT_VALUES
            .includes(source.slot)
            ? source.slot
            : 'unspecified';
    const hand =
        HAND_VALUES.includes(
            source.hand,
        )
            ? source.hand
            : 'unspecified';
    const persistence =
        LOCAL_MATERIAL_PERSISTENCE_VALUES
            .includes(
                source.persistence,
            )
            ? source.persistence
            : 'until_changed';
    const evidence = (
        Array.isArray(source.evidence)
            ? source.evidence
            : source.evidence
                ? [source.evidence]
                : []
    )
        .filter(item =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            compactMaterialText(
                item.text,
                500,
            ))
        .slice(0, 3)
        .map(item => ({
            text:
                compactMaterialText(
                    item.text,
                    500,
                ),
            start:
                Math.max(
                    0,
                    Number(
                        item.start || 0,
                    ),
                ),
            end:
                Math.max(
                    0,
                    Number(
                        item.end || 0,
                    ),
                ),
        }));
    if (!evidence.length) {
        return null;
    }
    const quantity =
        Number.isInteger(
            Number(source.quantity),
        ) &&
        Number(source.quantity) > 0 &&
        Number(source.quantity) <= 1_000
            ? Number(source.quantity)
            : null;
    const sourceKinds = [
        ...new Set(
            (
                Array.isArray(
                    source.sourceKinds,
                )
                    ? source
                        .sourceKinds
                    : [source.sourceKind]
            ).filter(value =>
                [
                    'player',
                    'narrative',
                ].includes(value)),
        ),
    ];
    return {
        id:
            normalizeMemoryId(
                source.id,
                `material_${materialFingerprint(
                    materialEffectIdentity(
                        source,
                    ),
                ).slice(0, 40)}`,
            ),
        schemaVersion:
            MATERIAL_STATE_SCHEMA_VERSION,
        category:
            definition.category,
        type: source.type,
        aspect:
            definition.aspect,
        actorId,
        objectText,
        sourceText,
        targetText,
        valueText,
        previousValueText,
        resultText,
        quantity,
        operation,
        slot,
        hand,
        mapId,
        roomId,
        sceneId,
        persistence,
        sourceKinds,
        confidence:
            Math.min(
                1,
                Math.max(
                    0,
                    Number(
                        source.confidence ||
                        0,
                    ),
                ),
            ),
        uieConfidence:
            Math.min(
                1,
                Math.max(
                    0,
                    Number(
                        source
                            .uieConfidence ||
                        0,
                    ),
                ),
            ),
        evidence,
    };
}

export function normalizeMaterialEvents(
    events,
    worldState,
) {
    if (!Array.isArray(events)) {
        return [];
    }
    const accepted = new Map();
    for (
        const source
        of events.slice(0, 24)
    ) {
        const event =
            normalizeMaterialEvent(
                source,
                worldState,
            );
        if (!event) continue;
        const key =
            materialEffectIdentity(event);
        const previous =
            accepted.get(key);
        if (!previous) {
            accepted.set(key, event);
            continue;
        }
        previous.sourceKinds = [
            ...new Set([
                ...previous.sourceKinds,
                ...event.sourceKinds,
            ]),
        ];
        previous.evidence = [
            ...previous.evidence,
            ...event.evidence,
        ].slice(0, 3);
        previous.confidence =
            Math.max(
                previous.confidence,
                event.confidence,
            );
        previous.uieConfidence =
            Math.max(
                previous.uieConfidence,
                event.uieConfidence,
            );
    }
    return [...accepted.values()]
        .slice(0, 24);
}

function materialTargetsOverlap(
    left,
    right,
) {
    const leftTarget =
        materialFingerprint(
            left.targetText ||
            left.objectText,
        );
    const rightTarget =
        materialFingerprint(
            right.targetText ||
            right.objectText,
        );
    return Boolean(
        leftTarget &&
        rightTarget &&
        (
            leftTarget.includes(
                rightTarget,
            ) ||
            rightTarget.includes(
                leftTarget,
            )
        ),
    );
}

function materialObjectsOverlap(
    left,
    right,
) {
    const leftObject =
        materialFingerprint(
            left.objectText,
        );
    const rightObject =
        materialFingerprint(
            right.objectText,
        );
    return Boolean(
        leftObject &&
        rightObject &&
        (
            leftObject.includes(
                rightObject,
            ) ||
            rightObject.includes(
                leftObject,
            )
        ),
    );
}

export function applyMaterialEvents(
    worldState,
    events,
    {
        clock =
        worldState.clock || '',
        turn =
        Number(
            worldState.turn?.count ||
            0,
        ),
    } = {},
) {
    const next =
        structuredClone(worldState);
    const accepted =
        normalizeMaterialEvents(
            events,
            next,
        );
    if (!accepted.length) {
        return next;
    }
    next.materialStateVersion =
        MATERIAL_STATE_SCHEMA_VERSION;
    next.actorPresentations ??= {};
    next.materialEventLog = [
        ...(next.materialEventLog || []),
        ...accepted.map(event => ({
            ...event,
            committedClock: clock,
            committedTurn: turn,
        })),
    ].slice(-200);
    next.map ??= {};
    next.map.roomStates ??= {};
    for (const event of accepted) {
        if (
            event.category ===
                'appearance_change'
        ) {
            const previous =
                next.actorPresentations[
                    event.actorId
                ] || {};
            const presentation = {
                ...previous,
                updatedClock: clock,
                sourceEventId:
                    event.id,
            };
            if (
                event.type ===
                    'outfit_changed'
            ) {
                presentation.outfit =
                    event.operation ===
                        'remove'
                        ? ''
                        : event
                            .valueText;
            } else if (
                event.type ===
                    'accessory_changed'
            ) {
                const accessories = {
                    ...(previous
                        .accessories ||
                        {}),
                };
                const accessorySlot =
                    event.slot ===
                        'unspecified'
                        ? 'accessory'
                        : event.slot;
                if (
                    event.operation ===
                        'remove'
                ) {
                    if (
                        event.slot ===
                            'unspecified'
                    ) {
                        for (
                            const key
                            of Object.keys(
                                accessories,
                            )
                        ) {
                            if (
                                !event
                                    .valueText ||
                                materialFingerprint(
                                    accessories[
                                        key
                                    ],
                                ).includes(
                                    materialFingerprint(
                                        event
                                            .valueText,
                                    ),
                                )
                            ) {
                                delete accessories[
                                    key
                                ];
                            }
                        }
                    } else {
                        delete accessories[
                            accessorySlot
                        ];
                    }
                } else {
                    accessories[
                        accessorySlot
                    ] = event.valueText;
                }
                presentation.accessories =
                    accessories;
            } else if (
                event.type ===
                    'hairstyle_changed'
            ) {
                presentation.hair =
                    event.valueText;
            } else if (
                event.type ===
                    'appearance_changed'
            ) {
                const conditions = (
                    previous
                        .visibleConditions ||
                    []
                ).filter(condition =>
                    condition.id !==
                    event.id);
                presentation
                    .visibleConditions = [
                        ...conditions,
                        {
                            id: event.id,
                            value:
                                event
                                    .valueText,
                            resultText:
                                event
                                    .resultText,
                            persistence:
                                event
                                    .persistence,
                            sceneId:
                                event.sceneId,
                            committedClock:
                                clock,
                            committedTurn:
                                turn,
                        },
                    ].slice(-8);
            } else if (
                event.type ===
                    'appearance_cleared'
            ) {
                presentation
                    .visibleConditions = (
                        previous
                            .visibleConditions ||
                        []
                    ).filter(condition =>
                        event.valueText &&
                        !materialFingerprint(
                            condition.value,
                        ).includes(
                            materialFingerprint(
                                event
                                    .valueText,
                            ),
                        ));
            } else if (
                event.type ===
                    'object_held'
            ) {
                const heldItems = {
                    ...(previous
                        .heldItems ||
                        {}),
                };
                heldItems[
                    event.hand
                ] = event.objectText;
                presentation.heldItems =
                    heldItems;
                presentation.heldObject =
                    Object.values(
                        heldItems,
                    ).filter(Boolean)
                        .join(' / ');
            } else if (
                event.type ===
                    'object_released'
            ) {
                const heldItems = {
                    ...(previous
                        .heldItems ||
                        {}),
                };
                if (
                    event.hand ===
                        'unspecified'
                ) {
                    for (
                        const key
                        of Object.keys(
                            heldItems,
                        )
                    ) {
                        if (
                            !event
                                .objectText ||
                            materialFingerprint(
                                heldItems[key],
                            ).includes(
                                materialFingerprint(
                                    event
                                        .objectText,
                                ),
                            )
                        ) {
                            delete heldItems[
                                key
                            ];
                        }
                    }
                } else {
                    delete heldItems[
                        event.hand
                    ];
                }
                presentation.heldItems =
                    heldItems;
                presentation.heldObject =
                    Object.values(
                        heldItems,
                    ).filter(Boolean)
                        .join(' / ');
            }
            next.actorPresentations[
                event.actorId
            ] = presentation;
            continue;
        }
        const roomKey =
            `${event.mapId}:${event.roomId}`;
        const roomState =
            next.map.roomStates[
                roomKey
            ] || {};
        let materialEffects = (
            roomState.materialEffects ||
            []
        ).filter(effect => {
            if (effect.id === event.id) {
                return false;
            }
            if (
                effect.persistence ===
                    'transient' &&
                Number(
                    effect
                        .committedTurn ||
                    0,
                ) < turn
            ) {
                return false;
            }
            if (
                effect.persistence ===
                    'until_scene_end' &&
                effect.sceneId &&
                effect.sceneId !==
                    next.scene?.id
            ) {
                return false;
            }
            return true;
        });
        if (
            [
                'object_moved',
                'object_removed',
            ].includes(event.type)
        ) {
            materialEffects =
                materialEffects.filter(
                    effect =>
                        ![
                            'object_placed',
                            'object_moved',
                        ].includes(
                            effect.type,
                        ) ||
                        !materialObjectsOverlap(
                            effect,
                            event,
                        ),
                );
            if (
                event.type ===
                    'object_removed'
            ) {
                next.map.roomStates[
                    roomKey
                ] = {
                    ...roomState,
                    materialEffects,
                };
                continue;
            }
        }
        if (
            event.type ===
                'scene_repaired'
        ) {
            const matchingDamageIds =
                materialEffects
                    .filter(effect =>
                        effect.type ===
                            'scene_damaged' &&
                        materialTargetsOverlap(
                            effect,
                            event,
                        ))
                    .map(effect =>
                        effect.id);
            if (
                !matchingDamageIds.length
            ) {
                const sameActorDamage =
                    materialEffects
                        .filter(effect =>
                            effect.type ===
                                'scene_damaged' &&
                            effect.actorId ===
                                event.actorId);
                if (
                    sameActorDamage.length ===
                    1
                ) {
                    matchingDamageIds.push(
                        sameActorDamage[0].id,
                    );
                }
            }
            materialEffects =
                materialEffects.filter(
                    effect =>
                        !matchingDamageIds
                            .includes(
                                effect.id,
                            ),
                );
            if (!event.resultText) {
                next.map.roomStates[
                    roomKey
                ] = {
                    ...roomState,
                    materialEffects,
                };
                continue;
            }
        }
        if (
            event.type ===
                'scene_cleaned'
        ) {
            materialEffects =
                materialEffects.filter(
                    effect =>
                        effect.type !==
                            'scene_soiled' ||
                        (
                            !materialTargetsOverlap(
                                effect,
                                event,
                            ) &&
                            !materialObjectsOverlap(
                                effect,
                                event,
                            )
                        ),
                );
            if (!event.resultText) {
                next.map.roomStates[
                    roomKey
                ] = {
                    ...roomState,
                    materialEffects,
                };
                continue;
            }
        }
        const effect = {
            ...event,
            committedClock: clock,
            committedTurn: turn,
            description:
                event.evidence
                    .map(item =>
                        item.text)
                    .filter(Boolean)
                    .join(' ')
                    .slice(0, 800),
        };
        next.map.roomStates[
            roomKey
        ] = {
            ...roomState,
            materialEffects: [
                ...materialEffects,
                effect,
            ].slice(-24),
        };
    }
    return next;
}

export function buildCurrentMaterialState(
    worldState = {},
) {
    const mapId =
        worldState.map?.activeMapId ||
        '';
    const roomId =
        worldState.map
            ?.currentLocalNodeId ||
        '';
    const roomKey =
        `${mapId}:${roomId}`;
    const currentTurn =
        Number(
            worldState.turn?.count ||
            0,
        );
    const currentSceneId =
        worldState.scene?.id ||
        '';
    const isActive = entry => {
        if (
            entry.persistence ===
                'transient' &&
            Number(
                entry.committedTurn ||
                0,
            ) < currentTurn
        ) {
            return false;
        }
        if (
            entry.persistence ===
                'until_scene_end' &&
            entry.sceneId &&
            entry.sceneId !==
                currentSceneId
        ) {
            return false;
        }
        return true;
    };
    const currentActorIds = new Set([
        'player',
        ...(worldState.actors || [])
            .filter(actor =>
                actor.present !==
                    false &&
                (
                    !actor.mapId ||
                    actor.mapId ===
                        mapId
                ) &&
                (
                    !actor.roomId ||
                    actor.roomId ===
                        roomId
                ))
            .map(actor =>
                actor.id),
    ]);
    return {
        mapId,
        roomId,
        roomEffects:
            (
                worldState.map
                    ?.roomStates?.[
                        roomKey
                    ]
                    ?.materialEffects ||
                []
            )
                .filter(isActive)
                .slice(-24)
                .map(effect => ({
                    id: effect.id,
                    schemaVersion:
                        effect
                            .schemaVersion,
                    category:
                        effect.category,
                    type: effect.type,
                    operation:
                        effect.operation,
                    aspect:
                        effect.aspect,
                    actorId:
                        effect.actorId,
                    objectText:
                        effect.objectText,
                    sourceText:
                        effect.sourceText,
                    targetText:
                        effect.targetText,
                    valueText:
                        effect.valueText,
                    resultText:
                        effect.resultText,
                    quantity:
                        effect.quantity,
                    persistence:
                        effect.persistence,
                    description:
                        effect.description,
                    committedClock:
                        effect
                            .committedClock,
                })),
        actorPresentations:
            Object.fromEntries(
                Object.entries(
                    worldState
                        .actorPresentations ||
                    {},
                )
                    .filter(([actorId]) =>
                        currentActorIds.has(
                            actorId,
                        ))
                    .map(
                        ([
                            actorId,
                            presentation,
                        ]) => [
                            actorId,
                            {
                                outfit:
                                    presentation
                                        .outfit ||
                                    '',
                                accessories:
                                    presentation
                                        .accessories ||
                                    {},
                                hair:
                                    presentation
                                        .hair ||
                                    '',
                                visibleConditions:
                                    (
                                        presentation
                                            .visibleConditions ||
                                        []
                                    )
                                        .filter(
                                            isActive,
                                        )
                                        .map(
                                            condition =>
                                                condition
                                                    .value ||
                                                condition
                                                    .resultText,
                                        )
                                        .filter(
                                            Boolean,
                                        ),
                                heldItems:
                                    presentation
                                        .heldItems ||
                                    {},
                                heldObject:
                                    presentation
                                        .heldObject ||
                                    '',
                                updatedClock:
                                    presentation
                                        .updatedClock ||
                                    '',
                            },
                        ],
                    ),
            ),
    };
}

export const ACTOR_PRESENTATION_VERSION = 1;
const ACTOR_VISUAL_DESCRIPTION_VERSION = 1;
const DYNAMIC_OUTFIT_PATTERN =
    /\b(?:wearing|wears|dressed in)\s+([^.;]+?)(?=,\s*(?:holding|carrying|surrounded|sitting|standing|wiping|with)\b|[.;]|$)/iu;
const DYNAMIC_IN_OUTFIT_PATTERN =
    /\bin\s+((?:an?\s+|the\s+)?[^,.;]{0,80}?(?:robes?|cloak|shirt|dress|uniform|apron|shawl|coat|boots?|hat)[^,.;]{0,40}?)(?=,|[.;]|$)/iu;
const DYNAMIC_HELD_PATTERN =
    /\b(?:holding|holds|carrying|carries)\s+([^.;]+?)(?=,\s*(?:and|while|with)\b|[.;]|$)/iu;

function ensureDescriptionSentence(
    value,
) {
    const text = String(value || '')
        .replace(/\s+/gu, ' ')
        .replace(/\s+([,.;])/gu, '$1')
        .replace(/,\s*\./gu, '.')
        .replace(/\.\s*\./gu, '.')
        .trim();
    if (!text) return '';
    return /[.!?]$/u.test(text)
        ? text
        : `${text}.`;
}

function sanitizeLocalizedPhysicalDescription(
    value,
) {
    return ensureDescriptionSentence(
        String(value || '')
            .replace(
                /[，,]\s*(?:穿着|身穿|戴着|拿着|手持|抱着|周围(?:堆着|放着)|坐在|站在|正在)[^。！？]*/gu,
                '',
            )
            .replace(
                /(?:他|她|他们)(?:穿着|身穿|戴着|拿着|手持|抱着)[^。！？]*[。！？]?/gu,
                '',
            ),
    );
}

export function splitActorVisualDescription(
    value,
) {
    const source = ensureDescriptionSentence(
        value,
    );
    if (!source) {
        return {
            physicalDescriptionEn: '',
            outfit: '',
            heldObject: '',
        };
    }
    const outfit =
        source.match(
            DYNAMIC_OUTFIT_PATTERN,
        )?.[1] ||
        source.match(
            DYNAMIC_IN_OUTFIT_PATTERN,
        )?.[1] ||
        '';
    const heldObject =
        source.match(
            DYNAMIC_HELD_PATTERN,
        )?.[1] ||
        '';
    let physicalDescriptionEn = source
        .replace(
            /,\s*(?:wearing|dressed in|holding|carrying|surrounded by|sitting|standing|perched|wiping|presiding over)\b[^.]*[.]?/giu,
            '.',
        )
        .replace(
            /(?:^|[.]\s*)(?:He|She|They)\s+(?:wears?|is wearing|holds?|is holding|carries?|is carrying)\b[^.]*[.]?/giu,
            '. ',
        )
        .replace(
            /\s+in\s+(?:an?\s+|the\s+)?[^,.;]{0,80}?(?:robes?|cloak|shirt|dress|uniform|apron|shawl|coat|boots?|hat)[^,.;]{0,40}?(?=,|[.;]|$)/giu,
            '',
        );
    physicalDescriptionEn =
        ensureDescriptionSentence(
            physicalDescriptionEn,
        );
    return {
        physicalDescriptionEn:
            physicalDescriptionEn ||
            source,
        outfit:
            String(outfit)
                .replace(
                    /,\s*(?:holding|carrying|surrounded by)\b.*$/iu,
                    '',
                )
                .trim(),
        heldObject:
            String(heldObject)
                .trim(),
    };
}

function normalizeActorVisualRecord(
    source = {},
) {
    const split =
        splitActorVisualDescription(
            source
                .physicalDescriptionEn ||
            source.publicDescriptionEn ||
            source.publicDescription,
        );
    const physicalDescriptionEn =
        ensureDescriptionSentence(
            source.physicalDescriptionEn ||
            split.physicalDescriptionEn,
        );
    const localizedSource =
        source.physicalDescription ||
        source.publicDescription ||
        '';
    const physicalDescription =
        sanitizeLocalizedPhysicalDescription(
            localizedSource,
        ) ||
        physicalDescriptionEn;
    return {
        record: {
            ...source,
            physicalDescriptionEn,
            physicalDescription,
            publicDescriptionEn:
                physicalDescriptionEn,
            publicDescription:
                physicalDescription,
            visualDescriptionVersion:
                ACTOR_VISUAL_DESCRIPTION_VERSION,
        },
        presentationSeed: {
            outfit: split.outfit,
            heldObject:
                split.heldObject,
        },
    };
}

export function migrateActorPresentationState(
    worldState,
) {
    if (!worldState) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const records = [
        ...(worldState.actors || []),
        ...(worldState.actorLibrary || []),
    ];
    const needsMigration =
        Number(
            worldState
                .actorPresentationVersion ||
            0,
        ) <
            ACTOR_PRESENTATION_VERSION ||
        records.some(record =>
            Number(
                record
                    .visualDescriptionVersion ||
                0,
            ) <
                ACTOR_VISUAL_DESCRIPTION_VERSION);
    if (!needsMigration) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    const seeds = new Map();
    const normalizeRecords = values =>
        (values || []).map(source => {
            const normalized =
                normalizeActorVisualRecord(
                    source,
                );
            const previous =
                seeds.get(source.id) || {};
            seeds.set(source.id, {
                outfit:
                    previous.outfit ||
                    normalized
                        .presentationSeed
                        .outfit,
                heldObject:
                    previous.heldObject ||
                    normalized
                        .presentationSeed
                        .heldObject,
            });
            return normalized.record;
        });
    next.actors =
        normalizeRecords(next.actors);
    next.actorLibrary =
        normalizeRecords(
            next.actorLibrary,
        );
    next.actorPresentations ??= {};
    for (
        const actor
        of next.actors || []
    ) {
        if (actor.present === false) {
            continue;
        }
        const seed =
            seeds.get(actor.id);
        if (!seed?.outfit) {
            continue;
        }
        const previous =
            next.actorPresentations[
                actor.id
            ] || {};
        next.actorPresentations[
            actor.id
        ] = {
            ...previous,
            outfit:
                previous.outfit ||
                seed.outfit,
            updatedClock:
                previous
                    .updatedClock ||
                next.clock ||
                '',
            source:
                previous.source ||
                'legacy_public_description_migration',
        };
    }
    const normalizeGuest = guest =>
        guest
            ? normalizeActorVisualRecord(
                guest,
            ).record
            : guest;
    if (
        next.pacingDirector
            ?.pendingBeat?.guestActor
    ) {
        next.pacingDirector
            .pendingBeat.guestActor =
            normalizeGuest(
                next.pacingDirector
                    .pendingBeat
                    .guestActor,
            );
    }
    if (
        next.pacingDirector
            ?.assessment
            ?.intervention
            ?.guestActor
    ) {
        next.pacingDirector
            .assessment
            .intervention
            .guestActor =
            normalizeGuest(
                next.pacingDirector
                    .assessment
                    .intervention
                    .guestActor,
            );
    }
    next.actorPresentationVersion =
        ACTOR_PRESENTATION_VERSION;
    next.materialStateVersion =
        Math.max(
            Number(
                next.materialStateVersion ||
                0,
            ),
            MATERIAL_STATE_SCHEMA_VERSION,
        );
    return {
        state: next,
        changed: true,
    };
}

export function buildActorAppearanceView(
    worldState,
    actorId,
) {
    const actor =
        (worldState?.actors || [])
            .find(item =>
                item.id === actorId) ||
        {};
    const profile =
        (worldState?.actorLibrary || [])
            .find(item =>
                item.id === actorId) ||
        {};
    const visual =
        normalizeActorVisualRecord({
            ...actor,
            ...profile,
        }).record;
    const presentation =
        worldState
            ?.actorPresentations?.[
                actorId
            ] ||
        {};
    const accessories =
        Object.values(
            presentation.accessories ||
            {},
        ).filter(Boolean);
    const visibleConditions = (
        presentation.visibleConditions ||
        []
    )
        .map(condition =>
            typeof condition ===
                'string'
                ? condition
                : condition.value ||
                    condition
                        .resultText)
        .filter(Boolean);
    const heldItems =
        Object.entries(
            presentation.heldItems ||
            {},
        )
            .filter(([, item]) =>
                item)
            .map(([hand, item]) => ({
                hand,
                item,
            }));
    if (
        !heldItems.length &&
        presentation.heldObject
    ) {
        heldItems.push({
            hand: 'unspecified',
            item:
                presentation
                    .heldObject,
        });
    }
    return {
        physicalDescription:
            visual
                .physicalDescription ||
            visual
                .physicalDescriptionEn ||
            '尚未仔细观察。',
        physicalDescriptionEn:
            visual
                .physicalDescriptionEn ||
            '',
        presentation: {
            outfit:
                presentation.outfit ||
                '',
            accessories,
            hair:
                presentation.hair ||
                '',
            visibleConditions,
            heldItems,
            updatedClock:
                presentation
                    .updatedClock ||
                '',
        },
    };
}

function normalizeActorLifeState(
    actor = {},
) {
    const lifeStatus =
        ACTOR_LIFE_STATUS_VALUES.includes(
            actor.lifeStatus,
        )
            ? actor.lifeStatus
            : 'alive';
    const permanent =
        lifeStatus === 'dead'
            ? actor.lifeStatusPermanent !==
                false
            : Boolean(
                actor.lifeStatusPermanent,
            );
    return {
        ...actor,
        lifeStatus,
        lifeStatusPermanent: permanent,
        lifeStatusDetailEn: String(
            actor.lifeStatusDetailEn ||
            actor.lifeStatusDetail ||
            (
                lifeStatus === 'alive'
                    ? 'Alive.'
                    : ''
            ),
        ).trim(),
        lifeStatusDetail: String(
            actor.lifeStatusDetail ||
            actor.lifeStatusDetailEn ||
            (
                lifeStatus === 'alive'
                    ? '存活。'
                    : ''
            ),
        ).trim(),
        lifeStatusSinceClock:
            actor.lifeStatusSinceClock || '',
        present:
            lifeStatus === 'dead'
                ? false
                : actor.present,
    };
}

export function migrateEntityState(
    worldState,
    chat = [],
) {
    if (!worldState ||
        Number(worldState.entityStateVersion || 0) >=
            ENTITY_STATE_VERSION) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next = structuredClone(worldState);
    const defaults = {
        mapId: next.map?.activeMapId || '',
        roomId:
            next.map?.currentLocalNodeId || '',
        clock: next.clock || '',
    };
    next.items = (next.items || []).map(
        (item, index) =>
            normalizeInventoryItem(
                item,
                index,
                defaults,
            ),
    );
    const recentTransactions = (chat || [])
        .slice(-24)
        .map(message =>
            message?.extra?.hogwartsMud
                ?.turnTransaction)
        .filter(Boolean);
    const recentText = JSON.stringify(
        recentTransactions,
    );
    const hasOwnedWand =
        next.items.some(item =>
            /(?:wand|魔杖)/i.test(
                `${item.id} ${item.labelEn} ${item.label}`,
            ) &&
            !['consumed', 'lost'].includes(
                item.custody,
            ));
    if (
        !hasOwnedWand &&
        /(?:holly wand|冬青.{0,8}魔杖)/i
            .test(recentText) &&
        /(?:belongs? to Tina|wand fitting is resolved|has chosen Tina|seven Galleons|归蒂娜所有|选择了蒂娜)/i
            .test(recentText)
    ) {
        next.items.push(
            normalizeInventoryItem({
                id: 'holly_phoenix_wand',
                labelEn:
                    'Holly Wand',
                label: '冬青木魔杖',
                detailEn:
                    'Twelve and a quarter inches, phoenix feather core; chosen Tina at Ollivanders.',
                detail:
                    '十二又四分之一英寸，凤凰羽毛杖芯；在奥利凡德魔杖店选择了蒂娜。',
                importance: 'key',
                custody: 'carried',
                ownerId: 'player',
                source:
                    'legacy_turn_recovery',
            }, next.items.length, defaults),
        );
    }
    next.actors = (next.actors || [])
        .map(normalizeActorLifeState);
    next.actorLibrary =
        (next.actorLibrary || []).map(profile => {
            const actor = next.actors.find(
                item => item.id === profile.id,
            );
            return {
                ...profile,
                lifeStatus:
                    actor?.lifeStatus ||
                    profile.lifeStatus ||
                    'alive',
                lifeStatusPermanent:
                    actor
                        ?.lifeStatusPermanent ||
                    Boolean(
                        profile
                            .lifeStatusPermanent,
                    ),
                lifeStatusDetailEn:
                    actor
                        ?.lifeStatusDetailEn ||
                    profile
                        .lifeStatusDetailEn ||
                    'Alive.',
                lifeStatusDetail:
                    actor
                        ?.lifeStatusDetail ||
                    profile
                        .lifeStatusDetail ||
                    '存活。',
                lifeStatusSinceClock:
                    actor
                        ?.lifeStatusSinceClock ||
                    profile
                        .lifeStatusSinceClock ||
                    '',
            };
        });
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                defaults,
            );
    }
    next.entityStateVersion =
        ENTITY_STATE_VERSION;
    return {
        state: next,
        changed: true,
    };
}

function memoryFingerprint(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeMemoryId(value, fallback) {
    const normalized = String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return normalized || fallback;
}

export function normalizeSharedMemories(sharedMemories = {}) {
    return Object.fromEntries(
        SHARED_MEMORY_TIERS.map(tier => {
            const items = Array.isArray(sharedMemories?.[tier])
                ? sharedMemories[tier]
                : [];
            const normalized = items
                .map((item, index) => {
                    const source = typeof item === 'string'
                        ? { summaryEn: item }
                        : item || {};
                    const summaryEn = String(
                        source.summaryEn || source.summary || '',
                    ).trim();
                    if (!summaryEn) return null;
                    return {
                        ...source,
                        id: normalizeMemoryId(
                            source.id,
                            `legacy_${tier}_${index + 1}`,
                        ),
                        summaryEn,
                        summary: String(
                            source.summary || summaryEn,
                        ).trim(),
                        tier,
                        firstClock:
                            source.firstClock ||
                            source.lastClock ||
                            '',
                        lastClock:
                            source.lastClock ||
                            source.firstClock ||
                            '',
                        createdTurn: Math.max(
                            0,
                            Number(source.createdTurn || 0),
                        ),
                        updatedTurn: Math.max(
                            0,
                            Number(
                                source.updatedTurn ||
                                source.createdTurn ||
                                0,
                            ),
                        ),
                        source: source.source || 'legacy',
                    };
                })
                .filter(Boolean);
            return [
                tier,
                normalized.slice(
                    -SHARED_MEMORY_TIER_LIMITS[tier],
                ),
            ];
        }),
    );
}

function hasGenericImpression(value) {
    return /^(?:stranger|unknown|newly met(?: stranger)?|new acquaintance|none|future contact|has not formed a distinct opinion yet|still forming an opinion from their recent encounters|hard to ignore; still deciding what to make of them|尚不熟悉|陌生人?|还没有形成清晰看法|正从最近的相处中慢慢形成看法)\.?$/i.test(
        String(value || '').trim(),
    );
}

function countTextWords(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

function isValidImpressionShorthand(
    value,
) {
    const impression =
        String(value || '').trim();
    return Boolean(
        impression &&
        countTextWords(impression) <=
            IMPRESSION_MAX_WORDS &&
        !hasGenericImpression(impression) &&
        !/\b(?:currently|right now|this turn|today|at the moment|just (?:saw|heard|watched|learned))\b/i
            .test(impression),
    );
}

function isValidFirstImpression(
    value,
) {
    const impression =
        String(value || '').trim();
    return Boolean(
        impression &&
        countTextWords(impression) <=
            FIRST_IMPRESSION_MAX_WORDS &&
        !hasGenericImpression(impression) &&
        !/\b(?:currently|right now|this turn|today|at the moment|just (?:saw|heard|watched|learned))\b/i
            .test(impression),
    );
}

function deriveRelationshipImpression(
    profile = {},
    actorState = {},
) {
    const relationship = [
        profile.relationshipToPlayerEn,
        profile.relationshipToPlayer,
        actorState.relationshipToPlayerEn,
        actorState.relationshipToPlayer,
    ].filter(Boolean).join(' ');
    if (/(?:father|dad|父亲|爸爸)/i.test(relationship)) {
        return {
            established: true,
            en: 'My troublesome daughter; impossible not to worry about.',
            zh: '我那不省心、又不能不管的女儿啊。',
        };
    }
    if (/(?:mother|mum|mom|母亲|妈妈)/i.test(relationship)) {
        return {
            established: true,
            en: 'My impossible child; loved, exhausting, and always on my mind.',
            zh: '我那让人头疼、却总放不下的孩子。',
        };
    }
    if (/(?:parent|guardian|family|sibling|brother|sister|监护人|家人|亲人|兄弟|姐妹|哥哥|姐姐|弟弟|妹妹)/i.test(relationship)) {
        return {
            established: true,
            en: 'Family: familiar trouble, familiar affection, and no easy distance.',
            zh: '自家人：熟悉的麻烦，熟悉的牵挂，想疏远也难。',
        };
    }
    if (/(?:best friend|close friend|childhood friend|old friend|friend|好友|挚友|朋友|发小|青梅竹马)/i.test(relationship)) {
        return {
            established: true,
            en: 'A difficult friend, but still one of mine.',
            zh: '是个难搞的朋友，但终究是自己人。',
        };
    }
    return {
        established: false,
        en: 'Has not formed a distinct opinion yet.',
        zh: '还没有形成清晰看法。',
    };
}

function deriveInitialRelationshipTags(
    profile = {},
    actorState = {},
) {
    const rawTags =
        profile.relationshipTags ||
        actorState.relationshipTags;
    const supplied =
        Array.isArray(rawTags)
            ? rawTags.filter(Boolean)
            : [];
    if (supplied.length) return supplied;
    const introduced =
        actorState.present === true ||
        Boolean(
            profile.introducedClock ||
            actorState.introducedClock,
        );
    if (!introduced) return [];
    const relationship = [
        profile.relationshipToPlayerEn,
        profile.relationshipToPlayer,
        actorState
            .relationshipToPlayerEn,
        actorState
            .relationshipToPlayer,
    ].filter(Boolean).join(' ');
    if (
        /(?:parent|father|mother|guardian|family|sibling|brother|sister|父亲|母亲|爸爸|妈妈|监护人|家人|兄弟|姐妹)/i
            .test(relationship)
    ) {
        return ['family'];
    }
    if (
        /(?:friend|好友|朋友|发小)/i
            .test(relationship)
    ) {
        return ['friend'];
    }
    if (
        /(?:rival|competitor|宿敌|对手)/i
            .test(relationship)
    ) {
        return ['rival'];
    }
    if (
        /(?:mentor|mentee|teacher|student|导师|师生)/i
            .test(relationship)
    ) {
        return ['mentor'];
    }
    if (
        /(?:crush|romantic|lover|好感|恋人)/i
            .test(relationship)
    ) {
        return ['romantic_interest'];
    }
    if (
        /(?:enemy|hostile|仇敌|敌人)/i
            .test(relationship)
    ) {
        return ['enemy'];
    }
    return ['acquaintance'];
}

export function buildActorNameAliases(
    nameEn = '',
    name = '',
    existingAliases = [],
) {
    const aliases = [];
    const seen = new Set();
    const add = value => {
        const alias =
            String(value || '').trim();
        const key = alias
            .normalize('NFKC')
            .toLocaleLowerCase();
        if (
            alias.length >= 2 &&
            !seen.has(key)
        ) {
            seen.add(key);
            aliases.push(alias);
        }
    };
    (existingAliases || []).forEach(add);
    [nameEn, name].forEach(value => {
        add(value);
        String(value || '')
            .split(/[·•\s]+/u)
            .filter(part =>
                part.length >= 2 &&
                !/^(?:professor|prof|mr|mrs|ms|miss|dr)$/i
                    .test(part))
            .forEach(add);
    });
    return aliases;
}

function getCanonActorDisplayMetadata(
    actor = {},
) {
    const canon =
        findCanonCharacter(
            actor.canonCatalogId,
        ) ||
        findCanonCharacter(
            actor.id,
        ) ||
        findCanonCharacter(
            actor.nameEn,
        );
    const name = String(
        canon?.nameZh || '',
    ).trim();
    if (!canon || !name) {
        return null;
    }
    const nameEn = String(
        canon.nameEn ||
        actor.nameEn ||
        '',
    ).trim();
    const nameParts =
        nameEn.split(/\s+/u)
            .filter(Boolean);
    return {
        nameEn,
        name,
        aliases:
            buildActorNameAliases(
                nameEn,
                name,
                [
                    ...(actor.aliases || []),
                    ...(canon.aliasesZh || []),
                    ...(nameParts.length >= 3
                        ? [
                            `${nameParts[0]} ${nameParts.at(-1)}`,
                        ]
                        : []),
                    name.replace(
                        /[·•\s]+/gu,
                        '',
                    ),
                ],
            ),
    };
}

export function reconcileCanonActorDisplayNames(
    worldState,
) {
    if (!worldState) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    let changed = false;
    const reconcile = actor => {
        const display =
            getCanonActorDisplayMetadata(
                actor,
            );
        if (!display) {
            return actor;
        }
        if (
            actor.nameEn ===
                display.nameEn &&
            actor.name ===
                display.name &&
            JSON.stringify(
                actor.aliases || [],
            ) ===
                JSON.stringify(
                    display.aliases,
                )
        ) {
            return actor;
        }
        changed = true;
        return {
            ...actor,
            ...display,
        };
    };
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(reconcile);
    next.actors = (
        next.actors || []
    ).map(reconcile);
    return {
        state: next,
        changed,
    };
}

export function resolveTemporaryActorRevealedName(
    actor,
    segments = [],
) {
    const idTokens = String(
        actor?.id || '',
    )
        .split('_')
        .filter(Boolean);
    const firstIdToken =
        idTokens[0] || '';
    if (
        !firstIdToken ||
        /^(?:temp|temporary|unnamed|unknown|student|boy|girl|man|woman|witch|wizard|gryffindor|slytherin|hufflepuff|ravenclaw)$/i
            .test(firstIdToken)
    ) {
        return {
            nameEn:
                String(
                    actor?.nameEn || '',
                ).trim(),
            name:
                String(
                    actor?.name || '',
                ).trim(),
        };
    }
    const dialogue = (
        segments || []
    ).find(segment =>
        segment?.type ===
            'dialogue' &&
        segment.actorId ===
            actor.id);
    const english = String(
        dialogue?.textEn || '',
    ).trim();
    const englishMatch =
        english.match(
            /^(?:(?:i am|i'm|call me|name's)\s+)?([A-Z][A-Za-z'’-]{1,39})(?=[.!?,\s]|$)/u,
        );
    const candidateEn =
        String(
            englishMatch?.[1] || '',
        ).trim();
    if (
        !candidateEn ||
        candidateEn
            .toLocaleLowerCase() !==
            firstIdToken
                .toLocaleLowerCase()
    ) {
        return {
            nameEn:
                String(
                    actor?.nameEn || '',
                ).trim(),
            name:
                String(
                    actor?.name || '',
                ).trim(),
        };
    }
    const chinese = String(
        dialogue?.textZh || '',
    ).trim();
    const chineseMatch =
        chinese.match(
            /^(?:我叫|我是|叫我)?\s*([\p{Script=Han}·]{1,12})(?=[。！？，、\s]|$)/u,
        );
    return {
        nameEn: candidateEn,
        name:
            String(
                chineseMatch?.[1] ||
                actor?.name ||
                '',
            ).trim(),
    };
}

export function reconcileTemporaryActorDisplayNames(
    worldState,
    chat = [],
) {
    if (!worldState) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    let changed = false;
    next.actors = (
        next.actors || []
    ).map(actor => {
        if (!actor.temporary) {
            return actor;
        }
        const segments = [
            ...chat,
        ].reverse()
            .map(message =>
                message.extra
                    ?.hogwartsMud
                    ?.segments ||
                message.extra
                    ?.hogwartsMud
                    ?.turnTransaction
                    ?.segments ||
                [])
            .find(items =>
                items.some(segment =>
                    segment.actorId ===
                    actor.id)) ||
            [];
        const revealed =
            resolveTemporaryActorRevealedName(
                actor,
                segments,
            );
        if (
            !revealed.nameEn ||
            (
                revealed.nameEn ===
                    actor.nameEn &&
                (
                    !revealed.name ||
                    revealed.name ===
                        actor.name
                )
            )
        ) {
            return actor;
        }
        changed = true;
        return {
            ...actor,
            nameEn:
                revealed.nameEn,
            name:
                revealed.name ||
                actor.name ||
                revealed.nameEn,
            aliases:
                buildActorNameAliases(
                    revealed.nameEn,
                    revealed.name,
                    actor.aliases,
                ),
        };
    });
    return {
        state: next,
        changed,
    };
}

const EXPLICIT_ADDRESS_LINE_PATTERN =
    /^([ \t]*)[@＠]\s*(?:【\s*([^】\n]+?)\s*】|([^：:\n]+?))\s*[：:]\s*(.*)$/u;
const EXPLICIT_ADDRESS_START_PATTERN =
    /^[ \t]*[@＠]/u;

function getPlayerActionLines(
    playerAction = '',
) {
    return String(playerAction || '')
        .split(/\r?\n/u);
}

export function parseExplicitAddressDirective(
    playerAction = '',
) {
    return parseExplicitAddressBlocks(
        playerAction,
    )
        .map(block =>
            block.targetLabel)
        .filter(Boolean);
}

export function parseExplicitAddressBlocks(
    playerAction = '',
) {
    const blocks = [];
    getPlayerActionLines(
        playerAction,
    ).forEach((line, lineIndex) => {
        const match = line.match(
            EXPLICIT_ADDRESS_LINE_PATTERN,
        );
        if (!match) return;
        blocks.push({
            order: blocks.length,
            lineIndex,
            targetLabel:
                String(
                    match[2] ||
                    match[3] ||
                    '',
                ).trim(),
            speech:
                String(
                    match[4] ??
                    '',
                ).trim(),
            raw: line,
        });
    });
    return blocks;
}

export function removeExplicitAddressDirective(
    playerAction = '',
) {
    return getPlayerActionLines(
        playerAction,
    )
        .map(line => {
            const match = line.match(
                EXPLICIT_ADDRESS_LINE_PATTERN,
            );
            if (!match) return line;
            return `${match[1]}“${String(match[4] || '').trim()}”`;
        })
        .join('\n')
        .trim();
}

export function stripExplicitAddressTargets(
    playerAction = '',
) {
    return getPlayerActionLines(
        playerAction,
    )
        .map(line => {
            const match = line.match(
                EXPLICIT_ADDRESS_LINE_PATTERN,
            );
            if (!match) return line;
            return `${match[1]}${String(match[4] || '').trim()}`;
        })
        .join('\n')
        .trim();
}

export function buildStructuredPlayerTurnSequence(
    playerAction = '',
    addressing = {},
) {
    const blocksByLine = new Map(
        (addressing.blocks || [])
            .map(block => [
                block.lineIndex,
                block,
            ]),
    );
    return getPlayerActionLines(
        playerAction,
    )
        .map((line, lineIndex) => {
            const speechBlock =
                blocksByLine.get(lineIndex);
            if (speechBlock) {
                return {
                    type:
                        speechBlock.mode ===
                            'broadcast'
                            ? 'broadcast_speech'
                            : 'direct_speech',
                    lineIndex,
                    speechOrder:
                        speechBlock.order,
                    targetLabel:
                        speechBlock
                            .targetLabel,
                    targetActorId:
                        speechBlock
                            .targetActorId ||
                        '',
                    speechText:
                        speechBlock
                            .speechText,
                };
            }
            const text = line.trim();
            return text ? {
                type: 'action',
                lineIndex,
                text,
            } : null;
        })
        .filter(Boolean);
}

export function resolvePlayerAddressing(
    worldState = {},
    playerAction = '',
) {
    const targetLabels =
        parseExplicitAddressDirective(
            playerAction,
        );
    const addressBlocks =
        parseExplicitAddressBlocks(
            playerAction,
        );
    const attemptedLineCount =
        getPlayerActionLines(
            playerAction,
        ).filter(line =>
            EXPLICIT_ADDRESS_START_PATTERN
                .test(line))
            .length;
    const attempted =
        attemptedLineCount > 0;
    if (!attempted) {
        return {
            mode: 'open',
            attempted: false,
            valid: true,
            actorIds: [],
            targetLabels: [],
            unresolvedLabels: [],
            speechText: '',
            blocks: [],
            error: '',
        };
    }
    if (
        !targetLabels.length ||
        addressBlocks.length !==
            attemptedLineCount ||
        addressBlocks.some(block =>
            !block.targetLabel ||
            !block.speech)
    ) {
        return {
            mode: 'invalid',
            attempted: true,
            valid: false,
            actorIds: [],
            targetLabels,
            unresolvedLabels:
                targetLabels,
            speechText: '',
            blocks: [],
            error:
                '每条定向台词必须单独成行，并使用“@人物：台词”格式。',
        };
    }
    const profiles = new Map(
        (worldState.actorLibrary || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    const resolvedBlocks = [];
    const unresolvedLabels = [];
    for (const block of addressBlocks) {
        if (
            /^(?:全场|所有人|大家|room|everyone)$/iu
                .test(block.targetLabel)
        ) {
            resolvedBlocks.push({
                order: block.order,
                lineIndex:
                    block.lineIndex,
                mode: 'broadcast',
                targetLabel:
                    block.targetLabel,
                targetActorId: '',
                speechText:
                    block.speech,
            });
            continue;
        }
        const normalizedTarget =
            block.targetLabel
                .normalize('NFKC')
                .toLocaleLowerCase();
        const matches =
            (worldState.actors || [])
                .filter(actor =>
                    actor.present !==
                        false)
                .filter(actor => {
                    const profile =
                        profiles.get(
                            actor.id,
                        ) || {};
                    return buildActorNameAliases(
                        actor.nameEn ||
                            profile.nameEn,
                        actor.name ||
                            profile.name,
                        [
                            ...(actor.aliases ||
                                []),
                            ...(profile.aliases ||
                                []),
                        ],
                    ).some(alias =>
                        alias
                            .normalize('NFKC')
                            .toLocaleLowerCase() ===
                        normalizedTarget);
                });
        if (matches.length !== 1) {
            unresolvedLabels.push(
                block.targetLabel,
            );
            continue;
        }
        resolvedBlocks.push({
            order: block.order,
            lineIndex:
                block.lineIndex,
            mode: 'direct',
            targetLabel:
                block.targetLabel,
            targetActorId:
                matches[0].id,
            speechText:
                block.speech,
        });
    }
    if (unresolvedLabels.length) {
        return {
            mode: 'invalid',
            attempted: true,
            valid: false,
            actorIds: [],
            targetLabels,
            unresolvedLabels:
                unresolvedLabels,
            speechText: '',
            blocks:
                resolvedBlocks,
            error:
                `当前在场人物中无法唯一匹配：${unresolvedLabels.join('、')}。`,
        };
    }
    const actorIds = [
        ...new Set(
            resolvedBlocks
                .map(block =>
                    block.targetActorId)
                .filter(Boolean),
        ),
    ];
    const hasBroadcast =
        resolvedBlocks.some(block =>
            block.mode ===
                'broadcast');
    return {
        mode:
            hasBroadcast &&
            !actorIds.length
                ? 'broadcast'
                : actorIds.length === 1 &&
                    !hasBroadcast
                    ? 'direct'
                    : 'sequence',
        attempted: true,
        valid: true,
        actorIds,
        targetLabels,
        unresolvedLabels: [],
        speechText:
            resolvedBlocks.length === 1
                ? resolvedBlocks[0]
                    .speechText
                : '',
        blocks:
            resolvedBlocks,
        error: '',
    };
}

export function filterKnowledgeForAudience(
    records,
    {
        actorIds = [],
    } = {},
) {
    const normalizeEntityId = value =>
        String(value || '')
            .normalize('NFKD')
            .replace(/[^\w.-]+/g, '_')
            .replace(
                /^[_\-.]+|[_\-.]+$/g,
                '',
            )
            .slice(0, 96);
    const audience = [
        ...new Set(
            actorIds
                .map(normalizeEntityId)
                .filter(Boolean),
        ),
    ];
    return (records || [])
        .filter(record => {
            if (
                record.category ===
                    'actors' ||
                record.category ===
                    'scenes' ||
                record.category ===
                    'clues'
            ) {
                return false;
            }
            const visibleTo =
                new Set(
                    (
                        record.entityIds ||
                        []
                    )
                        .map(
                            normalizeEntityId,
                        )
                        .filter(Boolean),
                );
            return audience.length > 0 &&
                audience.every(actorId =>
                    visibleTo.has(actorId));
        });
}

export function getActorVisibleSocialKnowledge(
    worldState,
    actorId,
    {
        statementLimit = 16,
        evidenceLimit = 16,
        relationshipLimit = 12,
    } = {},
) {
    const projection =
        buildSocialAudienceProjection(
            worldState,
            actorId,
        );
    const statements =
        projection.statements
            .slice(-statementLimit);
    const relationshipEvidence =
        projection.relationshipEvidence
            .slice(-evidenceLimit);
    const relationships =
        projection.relationships
            .slice(-relationshipLimit);
    const knownRelationshipActorIds = [
        ...new Set([
            ...statements.flatMap(
                statement => [
                    statement.subjectId,
                    statement.speakerId,
                ],
            ),
            ...relationshipEvidence.flatMap(
                evidence => [
                    evidence.sourceActorId,
                    evidence.targetActorId,
                ],
            ),
            ...relationships.flatMap(
                relationship => [
                    relationship.sourceActorId,
                    relationship.targetActorId,
                ],
            ),
        ].filter(id =>
            id &&
            id !== 'player' &&
            id !== actorId)),
    ];
    return {
        statements,
        relationshipEvidence,
        relationships,
        knownRelationshipActorIds,
    };
}

export function buildActorKnowledgeCapsules(
    worldState,
    actorIds = [],
    contextPlan = {},
) {
    const requestedActorIds = [
        ...new Set(
            actorIds.filter(Boolean),
        ),
    ];
    const profiles = new Map(
        (worldState?.actorLibrary || [])
            .map(profile => [
                profile.id,
                profile,
            ]),
    );
    const currentActors = new Map(
        (worldState?.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    const dailyDirectives =
        new Map(
            (
                worldState?.dailyDirector
                    ?.plan
                    ?.actorDirectives ||
                []
            ).map(directive => [
                directive.id,
                directive,
            ]),
        );
    return requestedActorIds
        .map(actorId => {
            const actor =
                profiles.get(actorId);
            if (!actor) return null;
            const dynamic =
                normalizeActorMemoryProfile(
                    actor,
                    currentActors.get(
                        actorId,
                    ) || {},
                );
            return {
                actorId,
                roleEn: actor.roleEn,
                relationshipToPlayerEn:
                    actor
                        .relationshipToPlayerEn,
                publicBackgroundEn:
                    actor.publicBackgroundEn,
                privateGoalEn:
                    actor.privateGoalEn,
                fearEn: actor.fearEn,
                secretEn: actor.secretEn,
                knowledgeEn:
                    dynamic.knowledgeEn,
                impressionOfPlayerEn:
                    dynamic
                        .impressionOfPlayerEn,
                sharedMemories:
                    selectSharedMemoriesForContext(
                        dynamic
                            .sharedMemories,
                        contextPlan,
                    ),
                dailyDirective:
                    dailyDirectives
                        .get(actorId) ||
                    null,
                knownRumors:
                    getActorKnownRumors(
                        worldState,
                        actorId,
                    ),
                eventKnowledge:
                    projectActorEventKnowledge(
                        worldState,
                        actorId,
                    ),
                socialKnowledge:
                    getActorVisibleSocialKnowledge(
                        worldState,
                        actorId,
                    ),
                causalFacts:
                    normalizeCausalCollapseState(
                        worldState
                            .causalCollapse,
                    ).records
                        .filter(record =>
                            (
                                record
                                    .knownByActorIds ||
                                []
                            ).includes(
                                actorId,
                            ))
                        .slice(-8)
                        .map(record => ({
                            id: record.id,
                            kind:
                                record.kind,
                            factEn:
                                record.factEn,
                            effectiveSinceClock:
                                record
                                    .effectiveSinceClock,
                        })),
            };
        })
        .filter(Boolean);
}

function getContinuityRelationshipStage(
    closeness,
    hasMet,
) {
    if (closeness >= 90) {
        return 'lifelong or family-level bond';
    }
    if (closeness >= 70) {
        return 'confidant or deeply bonded';
    }
    if (closeness >= 50) {
        return 'close friend';
    }
    if (closeness >= 35) {
        return 'friend';
    }
    if (closeness >= 20) {
        return 'acquaintance';
    }
    if (closeness >= 10) {
        return 'newly acquainted';
    }
    return hasMet
        ? 'met previously'
        : 'not established';
}

export function buildActorContinuityCapsules(
    worldState,
    actorIds = [],
    contextPlan = {},
) {
    const requestedActorIds = [
        ...new Set(
            actorIds.filter(Boolean),
        ),
    ];
    const profiles = new Map(
        (worldState?.actorLibrary || [])
            .map(profile => [
                profile.id,
                profile,
            ]),
    );
    const currentActors = new Map(
        (worldState?.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    return requestedActorIds
        .map(actorId => {
            const profile =
                profiles.get(actorId);
            if (!profile) return null;
            const dynamic =
                normalizeActorMemoryProfile(
                    profile,
                    currentActors.get(
                        actorId,
                    ) || {},
                );
            const selectedMemories =
                selectSharedMemoriesForContext(
                    dynamic.sharedMemories,
                    contextPlan,
                );
            const sharedMemories = [
                ...(
                    selectedMemories.core ||
                    []
                ).slice(-1),
                ...(
                    selectedMemories.recent ||
                    []
                ).slice(-2),
                ...(
                    selectedMemories.everyday ||
                    []
                ).slice(-1),
            ].map(memory => ({
                id: memory.id,
                tier: memory.tier,
                summaryEn:
                    memory.summaryEn,
                lastClock:
                    memory.lastClock,
            }));
            const socialKnowledge =
                getActorVisibleSocialKnowledge(
                    worldState,
                    actorId,
                    {
                        statementLimit: 16,
                        evidenceLimit: 32,
                        relationshipLimit: 32,
                    },
                );
            const actorEdges =
                socialKnowledge
                    .relationships;
            const playerEdge =
                actorEdges.find(edge =>
                    edge.sourceActorId ===
                        actorId &&
                    edge.targetActorId ===
                        'player') ||
                null;
            const hasMetPlayer =
                Boolean(
                    dynamic
                        .firstImpressionClock ||
                    dynamic
                        .firstImpressionOfPlayerEn ||
                    sharedMemories.length ||
                    playerEdge,
                );
            const knownActorIds =
                new Set();
            actorEdges.forEach(edge => {
                if (
                    Number(
                        edge.familiarity ||
                        0,
                    ) <= 0
                ) {
                    return;
                }
                const otherId =
                    edge.sourceActorId ===
                        actorId
                        ? edge.targetActorId
                        : edge.sourceActorId;
                if (
                    otherId &&
                    otherId !==
                        'player'
                ) {
                    knownActorIds.add(
                        otherId,
                    );
                }
            });
            socialKnowledge
                .relationshipEvidence
                .filter(evidence =>
                    evidence.eventKind ===
                        'introduction' &&
                    (
                        evidence
                            .sourceActorId ===
                            actorId ||
                        evidence
                            .targetActorId ===
                            actorId
                    ))
                .forEach(evidence => {
                    const otherId =
                        evidence
                            .sourceActorId ===
                            actorId
                            ? evidence
                                .targetActorId
                            : evidence
                                .sourceActorId;
                    if (
                        otherId &&
                        otherId !==
                            'player'
                    ) {
                        knownActorIds.add(
                            otherId,
                        );
                    }
                });
            const familiarity =
                Number(
                    playerEdge
                        ?.familiarity ||
                    0,
                );
            const closeness =
                Number(
                    playerEdge
                        ?.closeness ||
                    0,
                );
            return {
                actorId,
                hasMetPlayer,
                knownActorIds: [
                    ...knownActorIds,
                ].sort(),
                relationshipToPlayer: {
                    stageEn:
                        getContinuityRelationshipStage(
                            closeness,
                            hasMetPlayer,
                        ),
                    familiarity,
                    closeness,
                    warmth: Number(
                        playerEdge
                            ?.warmth ||
                        0,
                    ),
                    trust: Number(
                        playerEdge
                            ?.trust ||
                        0,
                    ),
                    respect: Number(
                        playerEdge
                            ?.respect ||
                        0,
                    ),
                    influence: Number(
                        playerEdge
                            ?.influence ||
                        0,
                    ),
                    tension: Number(
                        playerEdge
                            ?.tension ||
                        0,
                    ),
                    resentment: Number(
                        playerEdge
                            ?.resentment ||
                        0,
                    ),
                    fear: Number(
                        playerEdge
                            ?.fear ||
                        0,
                    ),
                    protectiveness: Number(
                        playerEdge
                            ?.protectiveness ||
                        0,
                    ),
                    labels:
                        playerEdge
                            ?.labels ||
                        [],
                    structuralTags:
                        playerEdge
                            ?.structuralTags ||
                        [],
                    activeEmotions:
                        playerEdge
                            ?.activeEmotions ||
                        [],
                    latestEvidence:
                        playerEdge
                            ?.latestEvidence ||
                        null,
                    impressionOfPlayerEn:
                        dynamic
                            .impressionOfPlayerEn,
                },
                sharedMemories,
            };
        })
        .filter(Boolean);
}

export function sanitizeActorKnowledgeEn(
    profile = {},
    actorState = {},
) {
    const canonIdentity =
        findCanonCharacter(
            profile.canonCatalogId ||
            profile.nameEn ||
            actorState.nameEn,
        );
    const fingerprint = value =>
        String(value || '')
            .normalize('NFKC')
            .trim()
            .toLocaleLowerCase()
            .replace(/\s+/gu, ' ');
    const catalogValues = new Set(
        canonIdentity
            ? [
                canonIdentity.roleEn,
                canonIdentity.house
                    ? `House: ${canonIdentity.house}`
                    : '',
                canonIdentity.affiliationsEn,
                canonIdentity.skillsEn,
            ]
                .map(fingerprint)
                .filter(Boolean)
            : [],
    );
    const source =
        Array.isArray(profile.knowledgeEn)
            ? profile.knowledgeEn
            : Array.isArray(
                actorState.knowledgeEn,
            )
                ? actorState.knowledgeEn
                : [];
    const sanitized = [
        ...new Set(
            source
                .map(value =>
                    String(value || '').trim())
                .filter(Boolean)
                .filter(value =>
                    !catalogValues.has(
                        fingerprint(value),
                    ))
                .filter(value =>
                    !/(?:^|\b)(?:almost|nearly|virtually)?\s*everything(?:\b|$)|\bomniscien(?:t|ce)\b|\bknows?\s+all\b/iu
                        .test(value)),
        ),
    ];
    if (
        canonIdentity &&
        !sanitized.includes(
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        )
    ) {
        sanitized.push(
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        );
    }
    return sanitized;
}

export function normalizeActorMemoryProfile(
    profile = {},
    actorState = {},
) {
    const memories = normalizeSharedMemories(
        profile.sharedMemories ||
        actorState.sharedMemories,
    );
    const hasMemories = SHARED_MEMORY_TIERS.some(
        tier => memories[tier].length,
    );
    const relationshipImpression =
        deriveRelationshipImpression(
            profile,
            actorState,
        );
    const suppliedImpressionEn = String(
        profile.impressionOfPlayerEn ||
        actorState.impressionOfPlayerEn ||
        '',
    ).trim();
    const firstImpressionOfPlayerEn =
        String(
            profile
                .firstImpressionOfPlayerEn ||
            actorState
                .firstImpressionOfPlayerEn ||
            '',
        ).trim();
    const firstImpressionOfPlayer =
        String(
            profile
                .firstImpressionOfPlayer ||
            actorState
                .firstImpressionOfPlayer ||
            firstImpressionOfPlayerEn,
        ).trim();
    const wasUpdated = Boolean(
        profile.impressionUpdatedClock ||
        actorState.impressionUpdatedClock ||
        Number(
            profile.impressionUpdatedTurn ||
            actorState.impressionUpdatedTurn ||
            0,
        ),
    );
    let impressionOfPlayerEn =
        suppliedImpressionEn ||
        relationshipImpression.en;
    let impressionOfPlayer = String(
        profile.impressionOfPlayer ||
        actorState.impressionOfPlayer ||
        (
            suppliedImpressionEn
                ? impressionOfPlayerEn
                : relationshipImpression.zh
        ),
    ).trim();
    if (!wasUpdated &&
        relationshipImpression.established &&
        (
            !suppliedImpressionEn ||
            hasGenericImpression(
                suppliedImpressionEn,
            )
        )) {
        impressionOfPlayerEn =
            relationshipImpression.en;
        impressionOfPlayer =
            relationshipImpression.zh;
    }
    if (hasMemories &&
        hasGenericImpression(impressionOfPlayerEn)) {
        impressionOfPlayerEn =
            'Still forming an opinion from their recent encounters.';
        impressionOfPlayer =
            '正从最近的相处中慢慢形成看法。';
    }
    const canonProfile =
        getCanonSettingProfile(
            profile.canonCatalogId ||
            profile.nameEn ||
            actorState.nameEn,
        );
    const nameEn = String(
        profile.nameEn ||
        actorState.nameEn ||
        profile.name ||
        actorState.name ||
        '',
    ).trim();
    const name = String(
        profile.name ||
        profile.display?.name ||
        actorState.name ||
        nameEn,
    ).trim();
    const visual =
        normalizeActorVisualRecord({
            ...profile,
            physicalDescriptionEn:
                profile
                    .physicalDescriptionEn ||
                actorState
                    .physicalDescriptionEn,
            physicalDescription:
                profile
                    .physicalDescription ||
                actorState
                    .physicalDescription,
            publicDescriptionEn:
                profile
                    .publicDescriptionEn ||
                actorState
                    .publicDescriptionEn,
            publicDescription:
                profile
                    .publicDescription ||
                actorState
                    .publicDescription,
        }).record;
    return {
        ...visual,
        nameEn,
        name,
        aliases: buildActorNameAliases(
            nameEn,
            name,
            [
                ...(profile.aliases || []),
                ...(actorState.aliases || []),
            ],
        ),
        canonCatalogId:
            canonProfile?.id ||
            profile.canonCatalogId ||
            '',
        fixedBirthText:
            canonProfile
                ?.fixedBirthText ||
            profile.fixedBirthText ||
            '',
        birthYear:
            canonProfile
                ?.estimatedBirthYear ||
            profile.birthYear ||
            null,
        settingTags:
            canonProfile
                ?.settingTags ||
            profile.settingTags ||
            [],
        relationshipTags:
            deriveInitialRelationshipTags(
                profile,
                actorState,
            ),
        firstImpressionOfPlayerEn,
        firstImpressionOfPlayer,
        firstImpressionClock:
            profile.firstImpressionClock ||
            actorState.firstImpressionClock ||
            '',
        firstImpressionTurn: Math.max(
            0,
            Number(
                profile
                    .firstImpressionTurn ||
                actorState
                    .firstImpressionTurn ||
                0,
            ),
        ),
        firstImpressionPending:
            !firstImpressionOfPlayerEn &&
            Boolean(
                profile
                    .firstImpressionPending ||
                actorState
                    .firstImpressionPending,
            ),
        impressionOfPlayerEn,
        impressionOfPlayer,
        impressionUpdatedClock:
            profile.impressionUpdatedClock ||
            actorState.impressionUpdatedClock ||
            '',
        impressionUpdatedTurn: Math.max(
            0,
            Number(
                profile.impressionUpdatedTurn ||
                actorState.impressionUpdatedTurn ||
                0,
            ),
        ),
        knowledgeEn:
            sanitizeActorKnowledgeEn(
                profile,
                actorState,
            ),
        sharedMemories: memories,
    };
}

export function migrateActorKnowledgeBoundaries(
    worldState,
) {
    if (
        !worldState ||
        Number(
            worldState
                .actorKnowledgeVersion ||
            0,
        ) >= ACTOR_KNOWLEDGE_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    const currentActors = new Map(
        (next.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    next.actorLibrary =
        (next.actorLibrary || [])
            .map(profile => ({
                ...profile,
                knowledgeEn:
                    sanitizeActorKnowledgeEn(
                        profile,
                        currentActors.get(
                            profile.id,
                        ) || {},
                    ),
            }));
    next.actorKnowledgeVersion =
        ACTOR_KNOWLEDGE_VERSION;
    return {
        state: next,
        changed: true,
    };
}

const SOCIAL_RELATIONSHIP_DIMENSION_SET =
    new Set(SOCIAL_RELATIONSHIP_DIMENSIONS);
const SOCIAL_RELATIONSHIP_EMOTION_SET =
    new Set(SOCIAL_RELATIONSHIP_EMOTIONS);
const SOCIAL_RELATIONSHIP_EVENT_KINDS =
    new Set([
        'introduction',
        'routine_interaction',
        'shared_time',
        'serious_conversation',
        'vulnerability',
        'support',
        'help',
        'gift',
        'promise',
        'praise',
        'rescue',
        'sacrifice',
        'insult',
        'humiliation',
        'threat',
        'harm',
        'betrayal',
        'unresolved_conflict',
        'accepted_apology',
        'accepted_compensation',
        'forgiveness',
        'reappraisal',
        'other',
    ]);
const SOCIAL_RELATIONSHIP_IMPACTS =
    new Set([
        'trace',
        'minor',
        'meaningful',
        'major',
        'defining',
    ]);

function finiteSocialNumber(
    value,
    fallback = 0,
) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return fallback;
    }
    const number = Number(value);
    return Number.isFinite(number)
        ? number
        : fallback;
}

function clampSocialNumber(
    value,
    minimum,
    maximum,
    fallback = 0,
) {
    return Math.min(
        maximum,
        Math.max(
            minimum,
            finiteSocialNumber(
                value,
                fallback,
            ),
        ),
    );
}

function clampSocialDimension(
    dimension,
    value,
    fallback = 0,
) {
    const range =
        SOCIAL_RELATIONSHIP_DIMENSION_RANGES[
            dimension
        ];
    return clampSocialNumber(
        value,
        range.minimum,
        range.maximum,
        fallback,
    );
}

function normalizeSocialSourceMessageIds(
    values,
) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(Number)
                .filter(Number.isInteger),
        ),
    ].sort((left, right) =>
        left - right);
}

function normalizeSocialStructuralTags(
    ...sources
) {
    const aliases = {
        rival: 'rivalry',
        competitor: 'rivalry',
    };
    const tags = [];
    const seen = new Set();
    sources
        .flatMap(source =>
            Array.isArray(source)
                ? source
                : [])
        .forEach(value => {
            const raw = String(value || '')
                .normalize('NFKC')
                .trim()
                .toLocaleLowerCase()
                .replace(/[\s-]+/g, '_');
            const tag = aliases[raw] || raw;
            if (
                tag &&
                tag.length <= 64 &&
                /^[a-z0-9_:]+$/.test(tag) &&
                !seen.has(tag)
            ) {
                seen.add(tag);
                tags.push(tag);
            }
        });
    return tags;
}

function impactForSocialDelta(delta) {
    const magnitude = Math.abs(delta);
    if (magnitude <= 1) return 'trace';
    if (magnitude <= 3) return 'minor';
    if (magnitude <= 6) {
        return 'meaningful';
    }
    if (magnitude <= 12) return 'major';
    return 'defining';
}

function normalizeSocialDimensionDeltas(
    values,
) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
        .filter(proposal =>
            proposal &&
            SOCIAL_RELATIONSHIP_DIMENSION_SET
                .has(proposal.dimension) &&
            Number.isFinite(
                Number(proposal.delta),
            ))
        .map(proposal => {
            const maximum =
                proposal.dimension ===
                    'closeness'
                    ? 15
                    : 18;
            const delta = clampSocialNumber(
                proposal.delta,
                -maximum,
                maximum,
            );
            const normalized = {
                dimension:
                    proposal.dimension,
                delta,
                impact:
                    SOCIAL_RELATIONSHIP_IMPACTS
                        .has(proposal.impact)
                        ? proposal.impact
                        : impactForSocialDelta(
                            delta,
                        ),
            };
            for (const key of [
                'appliedDelta',
                'repeatMultiplier',
                'saturationMultiplier',
                'asymmetryMultiplier',
                'stageGateCeiling',
            ]) {
                if (
                    Number.isFinite(
                        Number(proposal[key]),
                    )
                ) {
                    normalized[key] =
                        Number(proposal[key]);
                }
            }
            return normalized;
        })
        .slice(
            0,
            SOCIAL_RELATIONSHIP_DIMENSIONS
                .length,
        );
}

function inferSocialEventKind(evidence) {
    if (
        SOCIAL_RELATIONSHIP_EVENT_KINDS
            .has(evidence?.eventKind)
    ) {
        return evidence.eventKind;
    }
    const deltas =
        normalizeSocialDimensionDeltas(
            evidence?.dimensionDeltas,
        );
    const tags =
        normalizeSocialStructuralTags(
            evidence?.structuralTags,
        );
    if (
        tags.includes('rivalry') ||
        deltas.some(proposal =>
            proposal.dimension ===
                'tension' &&
            proposal.delta > 0)
    ) {
        return 'unresolved_conflict';
    }
    if (
        deltas.some(proposal =>
            proposal.dimension ===
                'protectiveness' &&
            proposal.delta > 0)
    ) {
        return 'support';
    }
    if (
        deltas.some(proposal =>
            proposal.dimension ===
                'familiarity' &&
            proposal.delta > 0)
    ) {
        return 'introduction';
    }
    return 'other';
}

function parseSocialGraphV1MigrationInput(
    value = {},
) {
    const relationshipEvidence = (
        Array.isArray(
            value.relationshipEvidence,
        )
            ? value.relationshipEvidence
            : []
    ).map(evidence => {
        const {
            type,
            weightDelta,
            ...v2Evidence
        } = evidence || {};
        const magnitude = clampSocialNumber(
            weightDelta,
            -2,
            2,
        );
        let proposal = null;
        if (type === 'met') {
            proposal = {
                dimension: 'familiarity',
                delta: 12,
            };
        } else if (type === 'trust') {
            proposal = {
                dimension: 'trust',
                delta: magnitude * 8,
            };
        } else if (type === 'affinity') {
            proposal = {
                dimension: 'warmth',
                delta: magnitude * 8,
            };
        } else if (
            type === 'tension' ||
            type === 'rivalry'
        ) {
            proposal = {
                dimension: 'tension',
                delta:
                    Math.abs(magnitude) * 8,
            };
        } else if (
            type === 'protectiveness'
        ) {
            proposal = {
                dimension:
                    'protectiveness',
                delta:
                    Math.max(
                        0,
                        magnitude,
                    ) * 8,
            };
        }
        const migratedDeltas =
            proposal &&
            proposal.delta !== 0
                ? [{
                    ...proposal,
                    impact:
                        impactForSocialDelta(
                            proposal.delta,
                        ),
                }]
                : [];
        const suppliedDeltas =
            normalizeSocialDimensionDeltas(
                v2Evidence
                    .dimensionDeltas,
            );
        const structuralTags =
            normalizeSocialStructuralTags(
                v2Evidence.structuralTags,
                type === 'family'
                    ? ['family']
                    : [],
                type === 'rivalry'
                    ? ['rivalry']
                    : [],
            );
        const eventKind = {
            met: 'introduction',
            tension:
                'unresolved_conflict',
            rivalry:
                'unresolved_conflict',
            protectiveness: 'support',
        }[type] || 'other';
        return {
            ...v2Evidence,
            eventKind,
            dimensionDeltas:
                suppliedDeltas.length
                    ? suppliedDeltas
                    : migratedDeltas,
            structuralTags,
        };
    });
    const evidenceByDirection = new Map();
    relationshipEvidence.forEach(evidence => {
        const key =
            `${evidence.sourceActorId}->${evidence.targetActorId}`;
        const entries =
            evidenceByDirection.get(key) || [];
        entries.push(evidence);
        evidenceByDirection.set(key, entries);
    });
    const relationships = (
        Array.isArray(value.relationships)
            ? value.relationships
            : []
    ).map(edge => {
        const {
            affinity,
            ...v2Edge
        } = edge || {};
        const familiarity =
            clampSocialDimension(
                'familiarity',
                edge?.familiarity,
            );
        const warmth =
            clampSocialDimension(
                'warmth',
                affinity,
                finiteSocialNumber(
                    edge?.warmth,
                    0,
                ),
            );
        const trust =
            clampSocialDimension(
                'trust',
                edge?.trust,
            );
        const protectiveness =
            clampSocialDimension(
                'protectiveness',
                edge?.protectiveness,
            );
        const key =
            `${edge?.sourceActorId}->${edge?.targetActorId}`;
        const structuralTags =
            normalizeSocialStructuralTags(
                edge?.structuralTags,
                edge?.structureTags,
                (
                    evidenceByDirection
                        .get(key) || []
                ).flatMap(evidence =>
                    evidence
                        .structuralTags || []),
            );
        const family =
            structuralTags
                .includes('family');
        return {
            ...v2Edge,
            familiarity: family
                ? Math.max(
                    familiarity,
                    90,
                )
                : familiarity,
            closeness: family
                ? Math.max(
                    Math.min(
                        familiarity,
                        Math.round(
                            Math.max(
                                0,
                                warmth,
                            ) * 0.45 +
                            Math.max(
                                0,
                                trust,
                            ) * 0.35 +
                            protectiveness *
                                0.20,
                        ),
                    ),
                    70,
                )
                : Math.min(
                    familiarity,
                    Math.round(
                        Math.max(
                            0,
                            warmth,
                        ) * 0.45 +
                        Math.max(
                            0,
                            trust,
                        ) * 0.35 +
                        protectiveness *
                            0.20,
                    ),
                ),
            warmth,
            structuralTags,
        };
    });
    return {
        ...value,
        version: SOCIAL_GRAPH_VERSION,
        relationshipEvidence,
        relationships,
    };
}

function normalizeEmotionAppraisals(
    values,
    fallbackSourceMessageIds = [],
) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
        .filter(appraisal =>
            appraisal &&
            SOCIAL_RELATIONSHIP_EMOTION_SET
                .has(appraisal.emotion) &&
            Number.isFinite(
                Number(appraisal.intensity),
            ) &&
            Number(appraisal.intensity) > 0)
        .map(appraisal => {
            const normalized = {
                emotion: appraisal.emotion,
                intensity: Math.round(
                    clampSocialNumber(
                        appraisal.intensity,
                        1,
                        5,
                        1,
                    ),
                ),
                sourceMessageIds:
                    normalizeSocialSourceMessageIds(
                        appraisal
                            .sourceMessageIds
                            ?.length
                            ? appraisal
                                .sourceMessageIds
                            : fallbackSourceMessageIds,
                    ),
            };
            for (const key of [
                'sourceEvidenceId',
                'sceneId',
                'eventKind',
                'updatedClock',
            ]) {
                if (appraisal[key]) {
                    normalized[key] =
                        String(appraisal[key]);
                }
            }
            for (const key of [
                'initialIntensity',
                'updatedTurn',
            ]) {
                if (
                    Number.isFinite(
                        Number(appraisal[key]),
                    )
                ) {
                    normalized[key] =
                        Number(appraisal[key]);
                }
            }
            if (
                Array.isArray(
                    appraisal.witnessedBy,
                )
            ) {
                normalized.witnessedBy = [
                    ...new Set(
                        appraisal
                            .witnessedBy
                            .map(String)
                            .filter(Boolean),
                    ),
                ];
            }
            return normalized;
        })
        .slice(0, 4);
}

export function normalizeSocialRelationshipEvidence(
    evidence = {},
) {
    const sourceMessageIds =
        normalizeSocialSourceMessageIds(
            evidence.sourceMessageIds,
        );
    const structuralTags =
        normalizeSocialStructuralTags(
            evidence.structuralTags,
        );
    const normalized = {
        id: String(evidence.id || ''),
        sourceActorId: String(
            evidence.sourceActorId || '',
        ),
        targetActorId: String(
            evidence.targetActorId || '',
        ),
        eventKind:
            inferSocialEventKind({
                ...evidence,
                structuralTags,
            }),
        dimensionDeltas:
            normalizeSocialDimensionDeltas(
                evidence.dimensionDeltas,
            ),
        emotionAppraisals:
            normalizeEmotionAppraisals(
                evidence.emotionAppraisals,
                sourceMessageIds,
            ),
        structuralTags,
        summaryEn: String(
            evidence.summaryEn || '',
        ),
        summary: String(
            evidence.summary ||
            evidence.summaryEn ||
            '',
        ),
        witnessedBy: [
            ...new Set(
                (
                    Array.isArray(
                        evidence.witnessedBy,
                    )
                        ? evidence
                            .witnessedBy
                        : []
                )
                    .map(String)
                    .filter(Boolean),
            ),
        ],
        sourceMessageIds,
        sceneId: String(
            evidence.sceneId ||
            evidence.scene?.id ||
            '',
        ),
        clock: String(
            evidence.clock || '',
        ),
        turn: Math.max(
            0,
            finiteSocialNumber(
                evidence.turn,
                0,
            ),
        ),
    };
    if (
        typeof evidence.source ===
        'string'
    ) {
        normalized.source =
            evidence.source;
    }
    if (
        Array.isArray(
            evidence.sourceEventIds,
        )
    ) {
        normalized.sourceEventIds = [
            ...new Set(
                evidence.sourceEventIds
                    .map(String)
                    .filter(Boolean),
            ),
        ];
    }
    if (evidence.effectiveSinceClock) {
        normalized.effectiveSinceClock =
            String(
                evidence
                    .effectiveSinceClock,
            );
    }
    for (const key of [
        'knownTo',
        'authorizedWitnesses',
        'authorizedAudienceIds',
    ]) {
        if (Array.isArray(evidence[key])) {
            normalized[key] = [
                ...new Set(
                    evidence[key]
                        .map(String)
                        .filter(Boolean),
                ),
            ];
        }
    }
    for (const key of [
        'playerKnown',
        'knownToPlayer',
    ]) {
        if (
            typeof evidence[key] ===
            'boolean'
        ) {
            normalized[key] =
                evidence[key];
        }
    }
    if (evidence.visibility) {
        normalized.visibility =
            String(evidence.visibility);
    }
    return normalized;
}

function normalizeSocialCurrentTurn(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }
    const turn = Number(value);
    return Number.isFinite(turn)
        ? Math.max(0, turn)
        : null;
}

function decayActiveSocialEmotion(
    emotion,
    currentTurn,
) {
    const normalized =
        normalizeEmotionAppraisals(
            [emotion],
            emotion?.sourceMessageIds,
        )[0];
    if (!normalized) {
        return null;
    }
    const turn =
        normalizeSocialCurrentTurn(
            currentTurn,
        );
    const updatedTurn =
        normalizeSocialCurrentTurn(
            emotion?.updatedTurn,
        );
    if (
        turn === null ||
        updatedTurn === null
    ) {
        return normalized;
    }
    const initialIntensity = Math.round(
        clampSocialNumber(
            emotion?.initialIntensity ??
                normalized.intensity,
            1,
            5,
            normalized.intensity,
        ),
    );
    const elapsedTurns = Math.max(
        0,
        Math.floor(turn - updatedTurn),
    );
    const intensity =
        initialIntensity -
        elapsedTurns *
            SOCIAL_ACTIVE_EMOTION_DECAY_PER_TURN;
    return intensity > 0
        ? {
            ...normalized,
            initialIntensity,
            intensity,
        }
        : null;
}

function deriveActiveSocialEmotions(
    edge,
    relationshipEvidence,
    currentTurn,
) {
    const supplied =
        Array.isArray(edge.activeEmotions)
            ? edge.activeEmotions
            : relationshipEvidence
                .flatMap(evidence =>
                    (
                        evidence
                            .emotionAppraisals ||
                        []
                    ).map(appraisal => ({
                        ...appraisal,
                        sourceEvidenceId:
                            evidence.id,
                        sceneId:
                            evidence.sceneId ||
                            '',
                        eventKind:
                            evidence.eventKind ||
                            '',
                        witnessedBy: [
                            ...(
                                evidence
                                    .witnessedBy ||
                                []
                            ),
                        ],
                        updatedTurn:
                            finiteSocialNumber(
                                evidence.turn,
                                0,
                            ),
                        updatedClock:
                            evidence.clock ||
                            '',
                    })));
    const byEmotion = new Map();
    supplied.forEach(emotion => {
        const normalized =
            decayActiveSocialEmotion(
                emotion,
                currentTurn,
            );
        if (normalized) {
            byEmotion.set(
                normalized.emotion,
                normalized,
            );
        }
    });
    return [
        ...byEmotion.values(),
    ].slice(
        -SOCIAL_RELATIONSHIP_EMOTIONS
            .length,
    );
}

export function normalizeSocialRelationshipEdge(
    edge = {},
    {
        relationshipEvidence = [],
        currentTurn = null,
    } = {},
) {
    const evidence = (
        Array.isArray(relationshipEvidence)
            ? relationshipEvidence
            : []
    ).filter(item =>
        item.sourceActorId ===
            edge.sourceActorId &&
        item.targetActorId ===
            edge.targetActorId);
    const familiarity =
        clampSocialDimension(
            'familiarity',
            edge.familiarity,
        );
    const warmth =
        clampSocialDimension(
            'warmth',
            edge.warmth,
        );
    const trust = clampSocialDimension(
        'trust',
        edge.trust,
    );
    const protectiveness =
        clampSocialDimension(
            'protectiveness',
            edge.protectiveness,
        );
    const migratedCloseness = Math.min(
        familiarity,
        Math.round(
            Math.max(0, warmth) * 0.45 +
            Math.max(0, trust) * 0.35 +
            protectiveness * 0.20,
        ),
    );
    const closeness =
        clampSocialDimension(
            'closeness',
            edge.closeness,
            migratedCloseness,
        );
    const structuralTags =
        normalizeSocialStructuralTags(
            edge.structuralTags,
            edge.structureTags,
            evidence.flatMap(item =>
                item.structuralTags || []),
        );
    const normalized = {
        id: String(edge.id || ''),
        sourceActorId: String(
            edge.sourceActorId || '',
        ),
        targetActorId: String(
            edge.targetActorId || '',
        ),
        familiarity,
        closeness,
        warmth,
        trust,
        respect: clampSocialDimension(
            'respect',
            edge.respect,
        ),
        influence: clampSocialDimension(
            'influence',
            edge.influence,
        ),
        tension: clampSocialDimension(
            'tension',
            edge.tension,
        ),
        resentment:
            clampSocialDimension(
                'resentment',
                edge.resentment,
            ),
        fear: clampSocialDimension(
            'fear',
            edge.fear,
        ),
        protectiveness,
        structuralTags,
        activeEmotions:
            deriveActiveSocialEmotions(
                edge,
                evidence,
                currentTurn,
            ),
        evidenceIds: [
            ...new Set(
                (
                    Array.isArray(
                        edge.evidenceIds,
                    )
                        ? edge.evidenceIds
                        : []
                )
                    .map(String)
                    .filter(Boolean),
            ),
        ],
    };
    for (const key of [
        'knownTo',
        'authorizedWitnesses',
        'authorizedAudienceIds',
        'witnessedBy',
    ]) {
        if (Array.isArray(edge[key])) {
            normalized[key] = [
                ...new Set(
                    edge[key]
                        .map(String)
                        .filter(Boolean),
                ),
            ];
        }
    }
    for (const key of [
        'playerKnown',
        'knownToPlayer',
    ]) {
        if (
            typeof edge[key] ===
            'boolean'
        ) {
            normalized[key] = edge[key];
        }
    }
    if (edge.visibility) {
        normalized.visibility =
            String(edge.visibility);
    }
    if (
        Number.isFinite(
            Number(edge.updatedTurn),
        )
    ) {
        normalized.updatedTurn =
            Number(edge.updatedTurn);
    }
    if (edge.updatedClock) {
        normalized.updatedClock =
            String(edge.updatedClock);
    }
    return normalized;
}

function getSocialClosenessLabel(
    closeness,
) {
    if (closeness >= 90) {
        return '终身或家庭级纽带';
    }
    if (closeness >= 70) return '知己';
    if (closeness >= 50) return '密友';
    if (closeness >= 35) return '朋友';
    if (closeness >= 20) return '熟人';
    if (closeness >= 10) return '初识';
    return '无关系';
}

export function deriveRelationshipLabels(
    value = {},
) {
    const edge =
        normalizeSocialRelationshipEdge(
            value,
        );
    const tags = new Set(
        edge.structuralTags,
    );
    const stage =
        getSocialClosenessLabel(
            edge.closeness,
        );
    const labels = [];
    const add = label => {
        if (
            label &&
            !labels.includes(label)
        ) {
            labels.push(label);
        }
    };
    const estranged =
        edge.resentment >= 35 ||
        edge.warmth <= -20 ||
        edge.trust <= -20;
    const awe =
        edge.fear >= 35 &&
        edge.respect >= 20;
    const nemesis =
        tags.has('rivalry') &&
        (
            edge.resentment >= 70 ||
            edge.tension >= 70 ||
            edge.warmth <= -50
        );
    const hostile =
        edge.warmth <= -50 ||
        edge.resentment >= 50 ||
        edge.tension >= 70;

    if (tags.has('family')) {
        add(
            estranged
                ? '疏远的亲人'
                : '亲人',
        );
    } else if (nemesis) {
        add('宿敌');
    } else if (
        edge.closeness >= 35 &&
        estranged
    ) {
        add(
            edge.closeness >= 70
                ? '疏远的知己'
                : edge.closeness >= 50
                    ? '疏远的密友'
                    : '疏远的朋友',
        );
    } else if (hostile) {
        add('敌对');
    } else if (
        (
            edge.warmth <= -20 ||
            edge.resentment >= 20
        ) &&
        edge.closeness < 35 &&
        edge.familiarity >= 20
    ) {
        add('反感的熟人');
    } else if (
        awe &&
        tags.has('mentor')
    ) {
        add('敬畏的导师');
    } else if (
        awe &&
        tags.has('authority')
    ) {
        add('敬畏的权威');
    } else if (awe) {
        add('敬畏');
    } else if (
        edge.respect >= 20 &&
        edge.trust <= -20
    ) {
        add('尊敬但不信任');
    } else if (edge.fear >= 35) {
        add('畏惧');
    } else {
        add(stage);
    }

    if (
        edge.closeness >= 35 &&
        edge.resentment >= 35
    ) {
        add('亲近但积怨的朋友');
    }
    if (
        tags.has('family') &&
        labels[0] !== '亲人'
    ) {
        add('亲人');
    }
    if (awe) add('敬畏');
    if (
        edge.respect >= 20 &&
        edge.trust <= -20
    ) {
        add('尊敬但不信任');
    }
    if (
        edge.fear >= 35 &&
        !awe
    ) {
        add('畏惧');
    }
    if (
        !tags.has('family') &&
        stage !== '无关系' &&
        ![
            '反感的熟人',
            stage,
        ].includes(labels[0])
    ) {
        add(stage);
    }
    if (edge.protectiveness >= 50) {
        add('保护者');
    }
    if (tags.has('mentor')) {
        add('导师');
    }
    if (tags.has('authority')) {
        add('权威');
    }
    if (tags.has('rivalry')) {
        add('竞争者');
    }
    return labels;
}

function normalizeSocialLastRunStats(value) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return null;
    }
    const normalized = {};
    if (Array.isArray(value.modelKeys)) {
        normalized.modelKeys = [
            ...new Set(
                value.modelKeys
                    .map(String)
                    .filter(Boolean),
            ),
        ];
    }
    for (const key of [
        'modelStatements',
        'modelRelationshipEvidence',
        'acceptedStatements',
        'acceptedRelationshipEvidence',
    ]) {
        if (
            Number.isFinite(
                Number(value[key]),
            )
        ) {
            normalized[key] =
                Number(value[key]);
        }
    }
    if (Array.isArray(value.rejected)) {
        normalized.rejected =
            value.rejected.map(entry => {
                const rejection = {};
                for (const key of [
                    'kind',
                    'reason',
                    'evidenceId',
                    'dimension',
                    'impact',
                ]) {
                    if (entry?.[key]) {
                        rejection[key] =
                            String(entry[key]);
                    }
                }
                if (
                    Array.isArray(
                        entry?.fields,
                    )
                ) {
                    rejection.fields =
                        entry.fields
                            .map(String);
                }
                if (
                    entry?.value !==
                    undefined
                ) {
                    rejection.value =
                        entry.value;
                }
                if (
                    entry?.source &&
                    typeof entry.source ===
                        'object'
                ) {
                    const source = entry.source;
                    rejection.source = {
                        sourceActorId: String(
                            source
                                .sourceActorId ||
                            '',
                        ),
                        targetActorId: String(
                            source
                                .targetActorId ||
                            '',
                        ),
                        sceneId: String(
                            source.sceneId || '',
                        ),
                        eventKind:
                            inferSocialEventKind(
                                source,
                            ),
                        dimensionDeltas:
                            normalizeSocialDimensionDeltas(
                                source
                                    .dimensionDeltas,
                            ),
                        structuralTags:
                            normalizeSocialStructuralTags(
                                source
                                    .structuralTags,
                            ),
                        emotionAppraisals:
                            normalizeEmotionAppraisals(
                                source
                                    .emotionAppraisals,
                                source
                                    .sourceMessageIds,
                            ),
                        summaryEn: String(
                            source.summaryEn ||
                            '',
                        ),
                        summary: String(
                            source.summary ||
                            source.summaryEn ||
                            '',
                        ),
                        witnessedBy: [
                            ...new Set(
                                (
                                    source
                                        .witnessedBy ||
                                    []
                                )
                                    .map(String)
                                    .filter(
                                        Boolean,
                                    ),
                            ),
                        ],
                        sourceMessageIds:
                            normalizeSocialSourceMessageIds(
                                source
                                    .sourceMessageIds,
                            ),
                    };
                }
                return rejection;
            });
    }
    return normalized;
}

export function normalizeSocialGraph(
    value = {},
    {
        currentTurn = null,
    } = {},
) {
    const sourceVersion =
        Math.max(
            1,
            finiteSocialNumber(
                value.version,
                1,
            ),
        );
    const source =
        sourceVersion <
            SOCIAL_GRAPH_VERSION
            ? parseSocialGraphV1MigrationInput(
                value,
            )
            : value;
    const relationshipEvidence = (
        Array.isArray(
            source.relationshipEvidence,
        )
            ? source.relationshipEvidence
            : []
    )
        .filter(evidence =>
            evidence?.id &&
            evidence?.sourceActorId &&
            evidence?.targetActorId)
        .map(evidence =>
            normalizeSocialRelationshipEvidence(
                evidence,
            ))
        .slice(-1000);
    return {
        version: SOCIAL_GRAPH_VERSION,
        extractorVersion: Math.max(
            0,
            finiteSocialNumber(
                source.extractorVersion,
                0,
            ),
        ),
        statements: Array.isArray(
            source.statements,
        )
            ? source.statements
                .filter(statement =>
                    statement?.id &&
                    statement?.subjectId &&
                    statement?.speakerId &&
                    statement?.textEn)
                .map(statement => ({
                    ...statement,
                    witnessedBy: [
                        ...new Set(
                            (
                                Array.isArray(
                                    statement
                                        .witnessedBy,
                                )
                                    ? statement
                                        .witnessedBy
                                    : []
                            )
                                .map(String)
                                .filter(Boolean),
                        ),
                    ],
                }))
                .slice(-500)
            : [],
        relationshipEvidence,
        relationships: Array.isArray(
            source.relationships,
        )
            ? source.relationships
                .filter(edge =>
                    edge?.id &&
                    edge?.sourceActorId &&
                    edge?.targetActorId)
                .map(edge =>
                    normalizeSocialRelationshipEdge(
                        edge,
                        {
                            relationshipEvidence,
                            currentTurn,
                        },
                    ))
                .slice(-500)
            : [],
        lastProcessedMessageId:
            Number.isInteger(
                source.lastProcessedMessageId,
            )
                ? source.lastProcessedMessageId
                : -1,
        lastRunSceneId:
            String(
                source.lastRunSceneId ||
                '',
            ),
        lastRunTurn: Math.max(
            0,
            finiteSocialNumber(
                source.lastRunTurn,
                0,
            ),
        ),
        lastRunClock:
            String(
                source.lastRunClock || '',
            ),
        backfilledSceneIds:
            Array.isArray(
                source.backfilledSceneIds,
            )
                ? [...new Set(
                    source
                        .backfilledSceneIds
                        .map(String)
                        .filter(Boolean),
                )].slice(-50)
                : [],
        backfillPendingSceneId:
            String(
                source
                    .backfillPendingSceneId ||
                '',
            ),
        status:
            String(
                source.status || 'idle',
            ),
        error:
            String(source.error || ''),
        lastRunStats:
            normalizeSocialLastRunStats(
                source.lastRunStats,
            ),
    };
}

export function projectActorSocialRelationships(
    actorLibrary = [],
    graphValue = {},
) {
    const graph =
        normalizeSocialGraph(graphValue);
    return (
        Array.isArray(actorLibrary)
            ? actorLibrary
            : []
    ).map(profile => ({
        ...profile,
        socialRelationships:
            graph.relationships
                .filter(edge =>
                    edge.sourceActorId ===
                        profile.id ||
                    edge.targetActorId ===
                        profile.id),
    }));
}

export function migrateLoadedSocialGraph(
    value = {},
    {
        chatLength = 0,
        sceneId = '',
        extractorVersion =
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
    } = {},
) {
    const sourceVersion = Math.max(
        1,
        finiteSocialNumber(
            value?.version,
            1,
        ),
    );
    const sourceExtractorVersion =
        Math.max(
            0,
            finiteSocialNumber(
                value?.extractorVersion,
                0,
            ),
        );
    const targetExtractorVersion =
        Math.max(
            0,
            finiteSocialNumber(
                extractorVersion,
                SOCIAL_GRAPH_EXTRACTOR_VERSION,
            ),
        );
    const graph =
        normalizeSocialGraph(value);
    const lastMessageId =
        Math.max(
            -1,
            Math.floor(
                Math.max(
                    0,
                    Number(chatLength) || 0,
                ),
            ) - 1,
        );
    const cursorAtTail =
        graph.lastProcessedMessageId >=
        lastMessageId;
    const migrationRequired =
        sourceVersion <
            SOCIAL_GRAPH_VERSION ||
        sourceExtractorVersion <
            targetExtractorVersion;

    if (
        sourceExtractorVersion <
        targetExtractorVersion
    ) {
        graph.extractorVersion =
            targetExtractorVersion;
        if (!cursorAtTail && sceneId) {
            graph.backfillPendingSceneId =
                String(sceneId);
            if (
                graph.status !==
                'running'
            ) {
                graph.status =
                    'pending';
            }
        }
    }
    if (cursorAtTail) {
        graph.backfillPendingSceneId =
            '';
        graph.status = 'ready';
        graph.error = '';
    }

    return {
        graph,
        changed:
            JSON.stringify(value || {}) !==
            JSON.stringify(graph),
        cursorAtTail,
        migrationRequired,
        allowAutomaticModelWork:
            !cursorAtTail &&
            !migrationRequired,
    };
}

function normalizeSocialAudienceId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim();
}

function getSocialAuthorizedAudienceIds(
    entry,
) {
    return [
        ...new Set(
            [
                entry?.witnessedBy,
                entry?.knownTo,
                entry?.authorizedWitnesses,
                entry?.authorizedAudienceIds,
            ]
                .flatMap(value =>
                    Array.isArray(value)
                        ? value
                        : [])
                .map(
                    normalizeSocialAudienceId,
                )
                .filter(Boolean),
        ),
    ];
}

export function isSocialEntryVisibleToAudience(
    entry,
    audienceActorId,
) {
    const audienceId =
        normalizeSocialAudienceId(
            audienceActorId,
        );
    if (!entry || !audienceId) {
        return false;
    }
    const sourceId =
        normalizeSocialAudienceId(
            entry.sourceActorId ||
            entry.speakerId,
        );
    if (sourceId === audienceId) {
        return true;
    }
    if (
        getSocialAuthorizedAudienceIds(
            entry,
        ).includes(audienceId)
    ) {
        return true;
    }
    return audienceId === 'player' &&
        (
            entry.playerKnown === true ||
            entry.knownToPlayer === true ||
            entry.visibility === 'player'
        );
}

function getSocialEvidenceOrder(
    evidence,
    fallback,
) {
    const messageId =
        normalizeSocialSourceMessageIds(
            evidence?.sourceMessageIds,
        ).at(-1);
    return finiteSocialNumber(
        evidence?.turn ??
        evidence?.updatedTurn ??
        messageId,
        fallback,
    );
}

function projectSocialDimensionsForAudience(
    edge,
    directionEvidence,
    audienceActorId,
) {
    const dimensions =
        Object.fromEntries(
            SOCIAL_RELATIONSHIP_DIMENSIONS
                .map(dimension => [
                    dimension,
                    clampSocialDimension(
                        dimension,
                        edge[dimension],
                    ),
                ]),
        );
    if (
        edge.sourceActorId ===
        audienceActorId
    ) {
        return dimensions;
    }
    directionEvidence
        .filter(evidence =>
            !isSocialEntryVisibleToAudience(
                evidence,
                audienceActorId,
            ))
        .flatMap(evidence =>
            evidence.dimensionDeltas || [])
        .forEach(proposal => {
            const contribution =
                Number.isFinite(
                    Number(
                        proposal.appliedDelta,
                    ),
                )
                    ? Number(
                        proposal.appliedDelta,
                    )
                    : Number(
                        proposal.delta,
                    );
            if (
                !SOCIAL_RELATIONSHIP_DIMENSION_SET
                    .has(proposal.dimension) ||
                !Number.isFinite(
                    contribution,
                )
            ) {
                return;
            }
            dimensions[proposal.dimension] =
                clampSocialDimension(
                    proposal.dimension,
                    dimensions[
                        proposal.dimension
                    ] -
                    contribution,
                );
        });
    return dimensions;
}

function projectSocialActiveEmotions(
    edge,
    visibleEvidenceIds,
    audienceActorId,
) {
    if (
        edge.sourceActorId ===
        audienceActorId
    ) {
        return edge.activeEmotions;
    }
    return (edge.activeEmotions || [])
        .filter(emotion =>
            visibleEvidenceIds.has(
                emotion.sourceEvidenceId,
            ) ||
            isSocialEntryVisibleToAudience(
                emotion,
                audienceActorId,
            ));
}

export function buildSocialAudienceProjection(
    worldState = {},
    audienceActorId = 'player',
) {
    const audienceId =
        normalizeSocialAudienceId(
            audienceActorId,
        );
    const graph =
        normalizeSocialGraph(
            worldState?.socialGraph,
            {
                currentTurn:
                    worldState?.turn?.count,
            },
        );
    if (!audienceId) {
        return {
            version: graph.version,
            audienceActorId: '',
            statements: [],
            relationshipEvidence: [],
            relationships: [],
        };
    }
    const directionEvidence =
        new Map();
    graph.relationshipEvidence
        .forEach((evidence, index) => {
            const key =
                `${evidence.sourceActorId}->${evidence.targetActorId}`;
            const values =
                directionEvidence.get(
                    key,
                ) || [];
            values.push({
                ...evidence,
                audienceOrder:
                    getSocialEvidenceOrder(
                        evidence,
                        index,
                    ),
            });
            directionEvidence.set(
                key,
                values,
            );
        });
    const visibleEvidence =
        graph.relationshipEvidence
            .filter(evidence =>
                isSocialEntryVisibleToAudience(
                    evidence,
                    audienceId,
                ));
    const visibleEvidenceIds =
        new Set(
            visibleEvidence.map(evidence =>
                evidence.id),
        );
    const relationships =
        graph.relationships
            .map(edge => {
                const key =
                    `${edge.sourceActorId}->${edge.targetActorId}`;
                const evidence =
                    directionEvidence.get(
                        key,
                    ) || [];
                const visible =
                    evidence
                        .filter(item =>
                            visibleEvidenceIds
                                .has(item.id))
                        .sort((left, right) =>
                            right.audienceOrder -
                            left.audienceOrder);
                const sourceSelf =
                    edge.sourceActorId ===
                    audienceId;
                const edgeAuthorized =
                    isSocialEntryVisibleToAudience(
                        edge,
                        audienceId,
                    );
                if (
                    !sourceSelf &&
                    !edgeAuthorized &&
                    !visible.length
                ) {
                    return null;
                }
                const dimensions =
                    projectSocialDimensionsForAudience(
                        edge,
                        evidence,
                        audienceId,
                    );
                const structuralTags =
                    sourceSelf
                        ? edge.structuralTags
                        : normalizeSocialStructuralTags(
                            visible.flatMap(item =>
                                item.structuralTags ||
                                []),
                            !evidence.length &&
                                edgeAuthorized
                                ? edge
                                    .structuralTags
                                : [],
                        );
                const projected = {
                    ...edge,
                    ...dimensions,
                    structuralTags,
                    evidenceIds:
                        visible.map(item =>
                            item.id),
                    evidence:
                        visible.map(
                            ({
                                audienceOrder,
                                ...item
                            }) => item,
                        ),
                    activeEmotions:
                        projectSocialActiveEmotions(
                            edge,
                            visibleEvidenceIds,
                            audienceId,
                        ),
                    audienceActorId:
                        audienceId,
                    audienceVisible: true,
                };
                projected.latestEvidence =
                    projected.evidence[0] ||
                    null;
                projected.labels =
                    deriveRelationshipLabels(
                        projected,
                    );
                projected.stageLabel =
                    getSocialClosenessLabel(
                        projected.closeness,
                    );
                return projected;
            })
            .filter(Boolean);
    return {
        version: graph.version,
        audienceActorId:
            audienceId,
        statements:
            graph.statements
                .filter(statement =>
                    isSocialEntryVisibleToAudience(
                        statement,
                        audienceId,
                    )),
        relationshipEvidence:
            visibleEvidence,
        relationships,
    };
}

function upsertSharedMemory(
    profile,
    memory,
    targetTier,
) {
    const normalizedProfile =
        normalizeActorMemoryProfile(profile);
    const memories = normalizedProfile.sharedMemories;
    const fingerprint = memoryFingerprint(
        memory.summaryEn || memory.summary,
    );
    let existing = null;
    let existingTier = '';
    SHARED_MEMORY_TIERS.forEach(tier => {
        const match = memories[tier].find(item =>
            memoryFingerprint(item.summaryEn) === fingerprint);
        if (match && !existing) {
            existing = match;
            existingTier = tier;
        }
    });
    const tierRank = {
        everyday: 0,
        recent: 1,
        core: 2,
    };
    const resolvedTier = existing &&
        tierRank[existingTier] > tierRank[targetTier]
        ? existingTier
        : targetTier;
    if (existing) {
        memories[existingTier] = memories[existingTier]
            .filter(item => item.id !== existing.id);
    }
    const nextMemory = {
        ...(existing || {}),
        ...memory,
        id: normalizeMemoryId(
            memory.id || existing?.id,
            `memory_${normalizeMemoryId(profile.id, 'actor')}_${resolvedTier}_${memories[resolvedTier].length + 1}`,
        ),
        summaryEn: String(
            memory.summaryEn ||
            existing?.summaryEn ||
            '',
        ).trim(),
        summary: String(
            memory.summary ||
            existing?.summary ||
            memory.summaryEn ||
            '',
        ).trim(),
        tier: resolvedTier,
        firstClock:
            existing?.firstClock ||
            memory.firstClock ||
            memory.lastClock ||
            '',
        lastClock:
            memory.lastClock ||
            existing?.lastClock ||
            memory.firstClock ||
            '',
        createdTurn: Math.max(
            0,
            Number(
                existing?.createdTurn ??
                memory.createdTurn ??
                0,
            ),
        ),
        updatedTurn: Math.max(
            0,
            Number(
                memory.updatedTurn ??
                existing?.updatedTurn ??
                0,
            ),
        ),
        source: memory.source || existing?.source || 'low',
    };
    memories[resolvedTier] = [
        ...memories[resolvedTier],
        nextMemory,
    ].slice(-SHARED_MEMORY_TIER_LIMITS[resolvedTier]);
    return {
        ...normalizedProfile,
        sharedMemories: memories,
    };
}

function compactLegacyMemoryText(value) {
    const text = String(value || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 40) {
        return `${words.slice(0, 40).join(' ')}…`;
    }
    return text.length > 180
        ? `${text.slice(0, 180).trim()}…`
        : text;
}

function buildLegacyActorMemory(
    transaction,
    actorId,
) {
    const explicitUpdate =
        (transaction.actorUpdates || []).find(update =>
            update.id === actorId &&
            update.memoryUpdate?.summaryEn);
    if (explicitUpdate) {
        return {
            summaryEn: compactLegacyMemoryText(
                explicitUpdate.memoryUpdate.summaryEn,
            ),
            summary: compactLegacyMemoryText(
                explicitUpdate.memoryUpdate.summary ||
                explicitUpdate.memoryUpdate.summaryEn,
            ),
            targetTier: 'everyday',
            significance:
                explicitUpdate.memoryUpdate
                    .significance ||
                'everyday',
            lastingImpactEn:
                explicitUpdate.memoryUpdate
                    .lastingImpactEn || '',
            lastingImpact:
                explicitUpdate.memoryUpdate
                    .lastingImpact || '',
            source: 'low',
        };
    }
    const segments = transaction.segments || [];
    const english = [];
    const translated = [];
    segments.forEach((segment, index) => {
        if (segment.type !== 'dialogue' ||
            segment.actorId !== actorId) {
            return;
        }
        const previous = segments[index - 1];
        if (previous?.type === 'narration') {
            english.push(previous.textEn);
            translated.push(
                previous.textZh || previous.textEn,
            );
        }
        english.push(segment.textEn);
        translated.push(
            segment.textZh || segment.textEn,
        );
    });
    const summaryEn = compactLegacyMemoryText(
        [...new Set(english.filter(Boolean))].join(' '),
    );
    if (!summaryEn) return null;
    return {
        summaryEn,
        summary: compactLegacyMemoryText(
            [...new Set(translated.filter(Boolean))].join(' '),
        ) || summaryEn,
        targetTier: 'everyday',
        source: 'migration',
    };
}

export function migrateRelationshipMemoryState(
    worldState,
    chat = [],
) {
    if (!worldState ||
        Number(worldState.relationshipMemoryVersion || 0) >=
            RELATIONSHIP_MEMORY_VERSION) {
        return { state: worldState, changed: false };
    }
    const next = structuredClone(worldState);
    const currentActors = new Map(
        (next.actors || []).map(actor => [actor.id, actor]),
    );
    const profilesNeedingShorthand = new Set(
        (next.actorLibrary || [])
            .filter(profile => {
                const actor = currentActors.get(profile.id) || {};
                const impression = String(
                    profile.impressionOfPlayerEn ||
                    actor.impressionOfPlayerEn ||
                    '',
                ).trim();
                return !isValidImpressionShorthand(
                    impression,
                );
            })
            .map(profile => profile.id),
    );
    next.actorLibrary = (next.actorLibrary || []).map(profile => {
        const normalized =
            normalizeActorMemoryProfile(
                profile,
                currentActors.get(profile.id),
            );
        const demotedLowMemories =
            normalized.sharedMemories.recent
                .filter(memory =>
                    memory.source === 'low')
                .map(memory => ({
                    ...memory,
                    tier: 'everyday',
                    significance:
                        memory.significance ||
                        'everyday',
                }));
        return {
            ...normalized,
            sharedMemories:
                normalizeSharedMemories({
                    core:
                        normalized.sharedMemories
                            .core
                            .filter(memory =>
                                memory.source !==
                                'migration'),
                    recent:
                        normalized.sharedMemories
                            .recent
                            .filter(memory =>
                                memory.source !==
                                    'migration' &&
                                memory.source !==
                                    'low'),
                    everyday: [
                        ...normalized
                            .sharedMemories
                            .everyday
                            .filter(memory =>
                                memory.source !==
                                'migration'),
                        ...demotedLowMemories,
                    ],
                }),
        };
    });
    const profiles = new Map(
        next.actorLibrary.map(profile => [profile.id, profile]),
    );
    chat.slice(-16).forEach((message, messageIndex) => {
        const transaction =
            message?.extra?.hogwartsMud?.turnTransaction;
        if (!transaction) return;
        const participantIds = new Set([
            ...(transaction.segments || [])
                .map(segment => segment.actorId),
            ...(transaction.actorUpdates || [])
                .filter(update =>
                    update.impressionOfPlayerEn ||
                    update.memoryUpdate?.summaryEn)
                .map(update => update.id),
        ].filter(Boolean));
        participantIds.forEach(actorId => {
            const profile = profiles.get(actorId);
            if (!profile) return;
            const candidate = buildLegacyActorMemory(
                transaction,
                actorId,
            );
            if (!candidate) return;
            const migrated = upsertSharedMemory(
                profile,
                {
                    id: `${actorId}_legacy_${messageIndex + 1}`,
                    summaryEn: candidate.summaryEn,
                    summary: candidate.summary,
                    firstClock:
                        transaction.committedClock ||
                        next.clock,
                    lastClock:
                        transaction.committedClock ||
                        next.clock,
                    createdTurn: Math.max(
                        0,
                        Number(next.turn?.count || 0) -
                            (16 - messageIndex),
                    ),
                    updatedTurn:
                        Number(next.turn?.count || 0),
                    source: candidate.source,
                    significance:
                        candidate.significance ||
                        'everyday',
                    lastingImpactEn:
                        candidate
                            .lastingImpactEn || '',
                    lastingImpact:
                        candidate
                            .lastingImpact || '',
                },
                candidate.targetTier,
            );
            profiles.set(actorId, migrated);
        });
    });
    next.actorLibrary = next.actorLibrary.map(profile => {
        const normalized = normalizeActorMemoryProfile(
            profiles.get(profile.id) || profile,
            currentActors.get(profile.id),
        );
        return profilesNeedingShorthand
            .has(profile.id)
            ? {
                ...normalized,
                ...(() => {
                    const initial =
                        deriveRelationshipImpression(
                            normalized,
                            currentActors.get(profile.id),
                        );
                    return initial.established
                        ? {
                            impressionOfPlayerEn:
                                initial.en,
                            impressionOfPlayer:
                                initial.zh,
                        }
                        : {
                            impressionOfPlayerEn:
                                'Hard to ignore; still deciding what to make of them.',
                            impressionOfPlayer:
                                '很难忽视，但还没想好该怎么看这个人。',
                        };
                })(),
            }
            : normalized;
    });
    const normalizedProfiles = new Map(
        next.actorLibrary.map(profile => [profile.id, profile]),
    );
    next.actors = (next.actors || []).map(actor => {
        const profile = normalizedProfiles.get(actor.id);
        return profile ? {
            ...actor,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
        } : actor;
    });
    const previousMemoryDirector =
        next.memoryDirector || {};
    next.memoryDirector = {
        status: 'idle',
        error: '',
        reviewedActorIds: [],
        reviewedAt: null,
        ...previousMemoryDirector,
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        pendingEventBoundary:
            previousMemoryDirector
                .pendingEventBoundary ||
            null,
        lastReviewedTurn:
            Number(
                previousMemoryDirector
                    .lastReviewedTurn || 0,
            ) ||
            Number(next.turn?.count || 0),
    };
    delete next.memoryDirector
        .reviewAfterTurns;
    next.relationshipMemoryVersion =
        RELATIONSHIP_MEMORY_VERSION;
    return { state: next, changed: true };
}

function normalizeCastPolicy(
    policy = {},
) {
    return {
        maxStoryActors: Math.min(
            80,
            Math.max(
                3,
                Number(
                    policy.maxStoryActors ||
                    DEFAULT_CAST_POLICY
                        .maxStoryActors,
                ),
            ),
        ),
        maxGeneratedGuests: Math.min(
            24,
            Math.max(
                0,
                Number(
                    policy.maxGeneratedGuests ??
                    DEFAULT_CAST_POLICY
                        .maxGeneratedGuests,
                ),
            ),
        ),
        targetPeerActors: Math.min(
            32,
            Math.max(
                6,
                Number(
                    policy.targetPeerActors ||
                    DEFAULT_CAST_POLICY
                        .targetPeerActors,
                ),
            ),
        ),
        maxAuthorityActors: Math.min(
            24,
            Math.max(
                4,
                Number(
                    policy.maxAuthorityActors ||
                    DEFAULT_CAST_POLICY
                        .maxAuthorityActors,
                ),
            ),
        ),
    };
}

export function buildStoryCastPolicy(
    worldState = {},
) {
    const policy = normalizeCastPolicy(
        worldState.castPolicy,
    );
    const profiles = [
        ...new Map(
            (worldState.actorLibrary || [])
                .filter(actor => actor?.id)
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        ).values(),
    ];
    const canonActorCount =
        profiles.filter(actor =>
            actor.source ===
                'preset_location_resident' ||
            actor.source ===
                'canon_catalog' ||
            Boolean(
                findCanonCharacter(
                    actor.nameEn,
                ),
            )).length;
    const generatedGuestCount =
        profiles.filter(actor =>
            actor.source ===
                'pacing_public_guest')
            .length;
    const storyActorCount =
        profiles.length;
    const metActorIds = new Set([
        ...(worldState.sceneArchive || [])
            .flatMap(scene =>
                scene.actorIds || []),
        ...(worldState.actors || [])
            .filter(actor =>
                actor.present !== false)
            .map(actor => actor.id),
        ...profiles
            .filter(actor =>
                actor.introducedClock)
            .map(actor => actor.id),
    ]);
    const ageProfiles =
        profiles
            .filter(actor =>
                metActorIds.has(actor.id))
            .map(actor => ({
                id: actor.id,
                ...getRelativeAgeProfile(
                    worldState,
                    actor,
                ),
            }));
    const peerActorCount =
        ageProfiles.filter(actor =>
            [
                'same_age',
                'younger_peer',
                'older_peer',
            ].includes(
                actor.relativeAgeBand,
            )).length;
    const playerRelationshipActorIds =
        new Set(
            (
                worldState.socialGraph
                    ?.relationships ||
                []
            )
                .filter(edge =>
                    (
                        edge.sourceActorId ===
                            'player' ||
                        edge.targetActorId ===
                            'player'
                    ) &&
                    Number(
                        edge.familiarity ||
                        0,
                    ) >= 12)
                .map(edge =>
                    edge.sourceActorId ===
                        'player'
                        ? edge.targetActorId
                        : edge.sourceActorId),
        );
    const meaningfulRelationshipPattern =
        /(?:family|parent|guardian|friend|mentor|mentee|rival|enemy|romantic|spouse|partner|sibling|cousin|relative|家人|父|母|监护|朋友|导师|师生|对手|敌人|恋人|伴侣|亲属)/iu;
    const meaningfulRelationshipTags =
        new Set([
            'family',
            'friend',
            'mentor',
            'mentee',
            'rival',
            'enemy',
            'romantic_interest',
            'partner',
        ]);
    const allMeaningfulKnownActorIds =
        profiles
            .filter(actor => {
                if (
                    !metActorIds.has(
                        actor.id,
                    )
                ) {
                    return false;
                }
                const memories =
                    normalizeSharedMemories(
                        actor
                            .sharedMemories,
                    );
                const memoryCount =
                    memories.core.length +
                    memories.recent.length +
                    memories.everyday.length;
                const sceneCount = [
                    ...(
                        worldState
                            .sceneArchive ||
                        []
                    ).map(scene =>
                        scene.actorIds ||
                        []),
                    (
                        worldState.actors ||
                        []
                    )
                        .filter(item =>
                            item.present !==
                                false)
                        .map(item =>
                            item.id),
                ].filter(actorIds =>
                    actorIds.includes(
                        actor.id,
                    )).length;
                const priorityRelationship =
                    (
                        actor
                            .relationshipTags ||
                        []
                    ).some(tag =>
                        meaningfulRelationshipTags
                            .has(tag)) ||
                    meaningfulRelationshipPattern
                        .test([
                            actor
                                .relationshipToPlayerEn,
                            actor
                                .relationshipToPlayer,
                        ]
                            .filter(Boolean)
                            .join(' '));
                return (
                    priorityRelationship ||
                    (
                        sceneCount >= 2 &&
                        (
                            playerRelationshipActorIds
                                .has(
                                    actor.id,
                                ) ||
                            memoryCount > 0
                        )
                    )
                );
            })
            .map(actor =>
                actor.id);
    const socialStageExcludedPattern =
        /\b(?:professor|teacher|headmaster|headmistress|parent|guardian|mother|father|family|sibling|relative)\b|(?:教授|教师|校长|家人|父|母|监护|兄弟|姐妹|亲属)/iu;
    const excludedFromSocialStageActorIds =
        profiles
            .filter(actor =>
                allMeaningfulKnownActorIds
                    .includes(actor.id) &&
                socialStageExcludedPattern
                    .test([
                        actor.roleEn,
                        actor.role,
                        actor
                            .relationshipToPlayerEn,
                        actor
                            .relationshipToPlayer,
                    ]
                        .filter(Boolean)
                        .join(' ')))
            .map(actor =>
                actor.id);
    const excludedFromSocialStage =
        new Set(
            excludedFromSocialStageActorIds,
        );
    const meaningfulKnownActorIds =
        allMeaningfulKnownActorIds
            .filter(actorId =>
                !excludedFromSocialStage
                    .has(actorId));
    const meaningfulKnownActorCount =
        meaningfulKnownActorIds.length;
    const socialStage =
        meaningfulKnownActorCount < 12
            ? 'exploration'
            : meaningfulKnownActorCount < 16
                ? 'circle_formation'
                : 'socially_stable';
    const socialStagePolicy =
        socialStage === 'exploration'
            ? {
                newActorShare: 0.7,
                familiarActorShare: 0.3,
                genericFamiliarRecallBudget: 1,
            }
            : socialStage ===
                'circle_formation'
                ? {
                    newActorShare: 0.5,
                    familiarActorShare: 0.5,
                    genericFamiliarRecallBudget: 2,
                }
                : {
                    newActorShare: 0.2,
                    familiarActorShare: 0.8,
                    genericFamiliarRecallBudget: 3,
                };
    const authorityActors =
        profiles.filter(actor =>
            metActorIds.has(actor.id) &&
            /(?:professor|teacher|headmaster|headmistress|parent|guardian|mother|father|minister|authority)/i
                .test([
                    actor.roleEn,
                    actor.role,
                    actor
                        .relationshipToPlayerEn,
                    actor
                        .relationshipToPlayer,
                ].filter(Boolean).join(' ')));
    const sceneActorIds = [
        ...(
            worldState.sceneArchive || []
        ).map(scene =>
            scene.actorIds || []),
        (worldState.actors || [])
            .filter(actor =>
                actor.present !== false)
            .map(actor => actor.id),
    ];
    const actorExposure =
        profiles.map(actor => {
            const sceneCount =
                sceneActorIds.filter(ids =>
                    ids.includes(actor.id))
                    .length;
            let consecutiveSceneCount = 0;
            for (
                let index =
                    sceneActorIds.length - 1;
                index >= 0;
                index--
            ) {
                if (
                    !sceneActorIds[index]
                        .includes(actor.id)
                ) {
                    break;
                }
                consecutiveSceneCount++;
            }
            return {
                id: actor.id,
                sceneCount,
                consecutiveSceneCount,
                reusePenalty:
                    sceneCount * 2 +
                    Math.max(
                        0,
                        consecutiveSceneCount -
                            1,
                    ) * 8,
            };
        });
    const currentTurn =
        Number(
            worldState.turn?.count || 0,
        );
    const stagedPeerTarget =
        currentTurn < 10
            ? Math.min(
                3,
                policy.targetPeerActors,
            )
            : currentTurn < 30
                ? Math.min(
                    6,
                    policy.targetPeerActors,
                )
                : policy.targetPeerActors;
    const urgentPeerDeficit =
        Math.max(
            0,
            stagedPeerTarget -
                peerActorCount,
        );
    const repeatedAuthorityIds =
        authorityActors
            .filter(actor =>
                actorExposure.find(
                    exposure =>
                        exposure.id ===
                            actor.id)
                    ?.consecutiveSceneCount >=
                    2)
            .map(actor => actor.id);
    return {
        ...policy,
        storyActorCount,
        canonActorCount,
        generatedGuestCount,
        metActorCount:
            metActorIds.size,
        metActorIds: [
            ...metActorIds,
        ],
        meaningfulKnownActorCount,
        meaningfulKnownActorIds,
        excludedFromSocialStageActorIds,
        socialStage,
        socialStagePolicy,
        peerActorCount,
        authorityActorCount:
            authorityActors.length,
        peerDeficit: Math.max(
            0,
            policy.targetPeerActors -
                peerActorCount,
        ),
        stagedPeerTarget,
        urgentPeerDeficit,
        repeatedAuthorityIds,
        authorityOverage: Math.max(
            0,
            authorityActors.length -
                policy.maxAuthorityActors,
        ),
        relativeAgeProfiles:
            ageProfiles,
        actorExposure,
        remainingStorySlots: Math.max(
            0,
            policy.maxStoryActors -
                storyActorCount,
        ),
        remainingGeneratedGuestSlots:
            Math.max(
                0,
                policy.maxGeneratedGuests -
                    generatedGuestCount,
            ),
        canonCatalogSize:
            CANON_CHARACTER_CATALOG.length,
    };
}

const LONG_TERM_PURSUIT_TAGS =
    new Set([
        'friend',
        'mentor',
        'mentee',
        'rival',
        'enemy',
        'romantic_interest',
        'partner',
    ]);

export function buildActorSelectionPolicy(
    worldState = {},
    playerAction = '',
    recentPlayerTurns = [],
    currentAddressing = null,
) {
    const castPolicy =
        buildStoryCastPolicy(
            worldState,
        );
    const addressing =
        currentAddressing
            ?.valid === true
            ? currentAddressing
            : resolvePlayerAddressing(
                worldState,
                playerAction,
            );
    const explicitActorIds =
        new Set(
            addressing.valid
                ? addressing.actorIds
                : [],
        );
    const explicitCanonCandidates =
        findMentionedCanonCharacters(
            playerAction,
        ).map(actor => {
            explicitActorIds.add(
                actor.id,
            );
            const profile =
                getCanonSettingProfile(
                    actor,
                );
            return {
                id: actor.id,
                nameEn: actor.nameEn,
                roleEn:
                    actor.roleEn ||
                    'Canon character',
                house:
                    actor.house || '',
                settingTags:
                    profile
                        ?.settingTags ||
                    [],
            };
        });
    const recentTurns =
        (
            recentPlayerTurns ||
            []
        ).slice(-16);
    const directedAttention =
        new Map();
    recentTurns
        .forEach((turn, turnIndex) => {
            const actorIds =
                Array.isArray(
                    turn?.actorIds,
                )
                    ? turn.actorIds
                    : [];
            [
                ...new Set(
                    actorIds,
                ),
            ].forEach(actorId => {
                const attention =
                    directedAttention
                        .get(actorId) ||
                    {
                        turnCount: 0,
                        sceneIds:
                            new Set(),
                        lastTurnIndex: -1,
                    };
                attention.turnCount++;
                if (turn?.sceneId) {
                    attention.sceneIds
                        .add(
                            turn.sceneId,
                        );
                }
                attention.lastTurnIndex =
                    turnIndex;
                directedAttention.set(
                    actorId,
                    attention,
                );
            });
        });
    const recentAttentionStart =
        Math.max(
            0,
            recentTurns.length - 3,
        );
    const pursuedActorIds =
        new Set(
            [
                ...directedAttention
                    .entries(),
            ]
                .filter(([, attention]) =>
                    attention.turnCount >= 2 &&
                    attention.sceneIds.size >= 2 &&
                    attention.lastTurnIndex >=
                        recentAttentionStart)
                .map(([actorId]) =>
                    actorId),
        );
    (
        worldState.actorLibrary ||
        []
    ).forEach(actor => {
        if (
            (
                actor
                    .relationshipTags ||
                []
            ).some(tag =>
                LONG_TERM_PURSUIT_TAGS
                    .has(tag))
        ) {
            pursuedActorIds.add(
                actor.id,
            );
        }
    });
    const pendingBeat =
        worldState.pacingDirector
            ?.pendingBeat;
    const unresolvedPendingBeat =
        pendingBeat &&
        pendingBeat.status !==
            'consumed'
            ? pendingBeat
            : null;
    const causalActorIds =
        new Set([
            unresolvedPendingBeat
                ?.focusActorId,
            unresolvedPendingBeat
                ?.guestActor?.id,
            ...(
                unresolvedPendingBeat
                    ?.actorEntrances ||
                []
            ).map(actor =>
                actor.id),
        ].filter(Boolean));
    return {
        priorityOrder: [
            'explicit_current_turn',
            'long_term_pursuit',
            'causal_or_unresolved',
            'social_stage_quota',
            'generic_familiar_recall',
        ],
        explicitActorIds: [
            ...explicitActorIds,
        ],
        pursuedActorIds: [
            ...pursuedActorIds,
        ],
        causalActorIds: [
            ...causalActorIds,
        ],
        explicitCanonCandidates,
        socialStage:
            castPolicy.socialStage,
        meaningfulKnownActorCount:
            castPolicy
                .meaningfulKnownActorCount,
        stageQuota:
            castPolicy
                .socialStagePolicy,
        metActorIds:
            castPolicy.metActorIds,
    };
}

const CROWDED_SCENE_ROOM_KINDS =
    new Set([
        'hall',
        'platform',
        'station',
        'street',
        'courtyard',
        'classroom',
        'common_room',
        'dining_hall',
        'shop',
    ]);

export function buildSceneCastRotationPolicy(
    worldState = {},
    destination = {},
) {
    const castPolicy =
        buildStoryCastPolicy(
            worldState,
        );
    const currentActiveActorIds =
        (worldState.actors || [])
            .filter(actor =>
                actor.present !==
                    false &&
                !actor.temporary)
            .map(actor =>
                actor.id);
    const mapId =
        destination.mapId ||
        worldState.scene?.mapId ||
        worldState.map?.activeMapId;
    const roomId =
        destination.roomId ||
        worldState.scene?.roomId ||
        worldState.map
            ?.currentLocalNodeId;
    const map =
        getLocalMapDefinition(
            mapId,
            worldState.map,
        );
    const room =
        getMapRooms(
            map,
            worldState.map,
        ).find(item =>
            item.id === roomId);
    const crowdedPublicScene =
        CROWDED_SCENE_ROOM_KINDS
            .has(room?.kind) ||
        (
            [
                'public',
                'student',
                'visitor',
            ].includes(room?.access) &&
            currentActiveActorIds
                .length >= 5
        );
    const exposureByActorId =
        new Map(
            castPolicy
                .actorExposure
                .map(exposure => [
                    exposure.id,
                    exposure,
                ]),
        );
    const highExposureActorIds =
        [...currentActiveActorIds]
            .sort((left, right) => {
                const leftExposure =
                    exposureByActorId
                        .get(left);
                const rightExposure =
                    exposureByActorId
                        .get(right);
                return (
                    Number(
                        rightExposure
                            ?.consecutiveSceneCount ||
                        0,
                    ) -
                    Number(
                        leftExposure
                            ?.consecutiveSceneCount ||
                        0,
                    ) ||
                    Number(
                        rightExposure
                            ?.reusePenalty ||
                        0,
                    ) -
                    Number(
                        leftExposure
                            ?.reusePenalty ||
                        0,
                    )
                );
            })
            .filter(actorId => {
                const exposure =
                    exposureByActorId
                        .get(actorId);
                return (
                    Number(
                        exposure
                            ?.consecutiveSceneCount ||
                        0,
                    ) >= 2 ||
                    Number(
                        exposure
                            ?.sceneCount ||
                        0,
                    ) >= 3
                );
            });
    const minimumNamedTurnover =
        crowdedPublicScene &&
        currentActiveActorIds.length >= 5
            ? Math.min(
                2,
                highExposureActorIds
                    .length,
            )
            : currentActiveActorIds.length >= 4 &&
                highExposureActorIds.length
                ? 1
                : 0;
    const recentSceneCastHistory = [
        ...(worldState.sceneArchive || [])
            .slice(-2)
            .map(scene => ({
                sceneId: scene.id,
                actorIds:
                    scene.actorIds || [],
            })),
        {
            sceneId:
                worldState.scene?.id ||
                '',
            actorIds:
                currentActiveActorIds,
        },
    ];
    return {
        crowdedPublicScene,
        targetActiveNamedCast: {
            min: crowdedPublicScene
                ? 2
                : 1,
            max: 4,
        },
        continuityAnchorBudget:
            crowdedPublicScene
                ? 2
                : 3,
        minimumNamedTurnover,
        currentActiveActorIds,
        highExposureActorIds,
        recommendedRotateOutActorIds:
            highExposureActorIds,
        recentSceneCastHistory,
        anonymousCrowdAllowed:
            crowdedPublicScene,
        destination: {
            mapId,
            roomId,
            roomKind:
                room?.kind || '',
            access:
                room?.access || '',
        },
    };
}

export function createInitialWorldState(character, modelSlots, campaign = createDefaultCampaign()) {
    const normalizedCampaign = normalizeCampaign(campaign);
    const normalizedCharacter =
        structuredClone(character);
    normalizedCharacter.identity ??= {};
    normalizedCharacter.identity
        .birthDate ||=
        `${normalizedCampaign.startYear - Number(normalizedCharacter.identity.age || 11)}-07-01`;
    normalizedCharacter.identity
        .heritage ??=
        normalizedCharacter.identity
            .ethnicity ||
        normalizedCharacter.background
            ?.ethnicity ||
        normalizedCharacter.background
            ?.culturalBackground ||
        '';
    normalizedCharacter.storyPreferences =
        normalizeStoryPreferences(
            normalizedCharacter
                .storyPreferences,
        );
    return {
        phase: 'initializing',
        campaign: normalizedCampaign,
        chapter: '正在编排首幕',
        clock: `${normalizedCampaign.startYear} · 时间待定`,
        location: '世界建档中',
        character: {
            ...normalizedCharacter,
            confirmed: true,
        },
        modelSlots: structuredClone(modelSlots),
        map: {
            baseVersion: PRESET_WORLD_MAP.version,
            localMapVersion: LOCAL_MAP_SCHEMA_VERSION,
            activeMapId: null,
            currentNodeId: null,
            currentLocalNodeId: null,
            currentLevelId: null,
            discoveredNodeIds: [],
            discoveredLocalNodeIds: [],
            generatedNodes: [],
            customLocalMaps: [],
            generatedLocalNodes: [],
            generatedLocalExits: [],
            interiorMapBindings: {},
            nodeOverrides: {},
            roomStates: {},
            exitStates: {},
            proposals: [],
        },
        actors: [],
        actorLibrary: [],
        ...createDefaultPresenceWitnessState(),
        actorPresentations: {},
        materialEventLog: [],
        materialStateVersion:
            MATERIAL_STATE_SCHEMA_VERSION,
        castPolicy: structuredClone(
            DEFAULT_CAST_POLICY,
        ),
        storyArcs: [],
        conflict: null,
        agenda: [],
        timeline: [],
        worldNews: [],
        gossipPacks: [],
        worldChangeLog: [],
        turn: {
            count: 0,
            status: 'idle',
            error: '',
            lastElapsedMinutes: 0,
            lastResolvedAt: null,
        },
        dailyDirector: {
            date: '',
            status: 'pending',
            error: '',
            plan: null,
            settledAt: null,
        },
        pacingDirector: {
            status: 'idle',
            error: '',
            lastAssessedTurn: null,
            lastAssessedSceneId: '',
            reassessAfterTurns: 6,
            assessment: null,
            pendingBeat: null,
        },
        causalCollapse:
            normalizeCausalCollapseState(),
        relationshipMemoryVersion:
            RELATIONSHIP_MEMORY_VERSION,
        actorKnowledgeVersion:
            ACTOR_KNOWLEDGE_VERSION,
        firstImpressionVersion:
            FIRST_IMPRESSION_VERSION,
        entityStateVersion:
            ENTITY_STATE_VERSION,
        memoryDirector: {
            status: 'idle',
            error: '',
            lastReviewedTurn: 0,
            triggerMode:
                'event_boundary',
            minimumReviewTurns: 10,
            pendingEventBoundary: null,
            reviewedActorIds: [],
            reviewedAt: null,
        },
        socialGraph:
            normalizeSocialGraph(),
        sceneArchive: [],
        sceneTransition: {
            status: 'idle',
            tier: 'medium',
            error: '',
            requestedAt: null,
            settledAt: null,
        },
        spatial: {
            version: SPATIAL_STATE_VERSION,
            player: {
                mapId: null,
                roomId: null,
            },
            lastMovement: null,
        },
        knowledgeBase: {
            timelineId: '',
            rootPath: '',
            vectorSource: 'transformers',
            vectorStatus: 'pending',
            vectorError: '',
            categories: {},
            lastSyncedAt: null,
        },
        directorFoundation: {
            status: 'pending',
            error: '',
            committedAt: null,
        },
        opening: {
            status: 'pending',
            attempt: 0,
            error: '',
            package: null,
            committedAt: null,
        },
        clues: [],
        checks: [],
        items: [],
        spellbook:
            createInitialSpellbook(
                normalizedCampaign
                    .grade,
                '',
            ),
        status: [
            { label: '体力', detail: '稳定' },
            { label: '压力', detail: '平静' },
        ],
    };
}

const OPENING_ID_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export function validateDirectorFoundation(foundation, presentActors = []) {
    const errors = [];
    if (!foundation || typeof foundation !== 'object' || Array.isArray(foundation)) {
        return { valid: false, errors: ['导演基础包必须是对象。'] };
    }

    const actorLibrary = Array.isArray(foundation.actorLibrary) ? foundation.actorLibrary : [];
    if (actorLibrary.length < 3 || actorLibrary.length > 24) {
        errors.push('出场角色库必须包含 3–24 名角色。');
    }
    const actorIds = new Set();
    actorLibrary.forEach(actor => {
        if (!OPENING_ID_PATTERN.test(String(actor.id || '')) || actorIds.has(actor.id)) {
            errors.push('出场角色库 ID 无效或重复。');
        }
        actorIds.add(actor.id);
        for (const key of [
            'nameEn',
            'roleEn',
            'relationshipToPlayerEn',
            'impressionOfPlayerEn',
            'publicDescriptionEn',
            'publicBackgroundEn',
            'personalityEn',
            'speechStyleEn',
            'privateGoalEn',
            'fearEn',
            'secretEn',
        ]) {
            if (!String(actor[key] || '').trim()) {
                errors.push(`角色 ${actor.id || '?'} 缺少 ${key}。`);
            }
        }
        if (!Array.isArray(actor.knowledgeEn) || actor.knowledgeEn.length < 1) {
            errors.push(`角色 ${actor.id || '?'} 必须有独立知识边界。`);
        }
        if (
            !/^\d{4}-\d{2}-\d{2}$/
                .test(
                    String(
                        actor.birthDate ||
                        '',
                    ),
                )
        ) {
            errors.push(
                `角色 ${actor.id || '?'} 必须固化出生日期。`,
            );
        }
        if (
            !Array.isArray(
                actor.settingTags,
            ) ||
            actor.settingTags.length < 2 ||
            actor.settingTags.length > 5 ||
            actor.settingTags.some(
                tag =>
                    !CANON_SETTING_TAG_VALUES
                        .includes(tag))
        ) {
            errors.push(
                `角色 ${actor.id || '?'} 必须有 2–5 个固定设定标签。`,
            );
        }
    });

    const presentIds = (presentActors || []).map(actor => actor.id).filter(Boolean);
    presentIds.forEach(actorId => {
        if (!actorIds.has(actorId)) {
            errors.push(`在场人物 ${actorId} 不存在于出场角色库。`);
        }
        const profile = actorLibrary.find(
            actor =>
                actor.id === actorId,
        );
        if (!isValidFirstImpression(
            profile
                ?.firstImpressionOfPlayerEn,
        )) {
            errors.push(
                `在场人物 ${actorId} 必须有基于玩家可见特征的初见印象。`,
            );
        }
    });

    const storyArc = foundation.storyArc;
    if (!storyArc || typeof storyArc !== 'object' || Array.isArray(storyArc)) {
        errors.push('导演必须预写一条隐藏探索故事线。');
        return { valid: false, errors };
    }
    for (const key of ['id', 'titleEn', 'hookEn', 'hiddenTruthEn', 'stakesEn']) {
        if (!String(storyArc[key] || '').trim()) {
            errors.push(`隐藏探索线缺少 ${key}。`);
        }
    }
    if (storyArc.id && !OPENING_ID_PATTERN.test(String(storyArc.id))) {
        errors.push('隐藏探索线 ID 必须是 snake_case。');
    }
    const involvedActorIds = Array.isArray(storyArc.involvedActorIds) ? storyArc.involvedActorIds : [];
    if (involvedActorIds.length < 2 || involvedActorIds.some(actorId => !actorIds.has(actorId))) {
        errors.push('隐藏探索线必须引用角色库中的至少两名角色。');
    }

    const cluePlan = Array.isArray(storyArc.cluePlan) ? storyArc.cluePlan : [];
    if (cluePlan.length < 3 || cluePlan.length > 8) {
        errors.push('隐藏探索线必须预写 3–8 个线索节点。');
    }
    const clueIds = new Set();
    const clueSources = new Set();
    cluePlan.forEach(clue => {
        if (!OPENING_ID_PATTERN.test(String(clue.id || '')) || clueIds.has(clue.id)) {
            errors.push('隐藏线索 ID 无效或重复。');
        }
        clueIds.add(clue.id);
        for (const key of ['labelEn', 'hiddenFactEn', 'playerFacingDiscoveryEn', 'unlockConditionEn']) {
            if (!String(clue[key] || '').trim()) {
                errors.push(`隐藏线索 ${clue.id || '?'} 缺少 ${key}。`);
            }
        }
        const sourceActorIds = Array.isArray(clue.sourceActorIds) ? clue.sourceActorIds : [];
        const sourceLocationIds = Array.isArray(clue.sourceLocationIds) ? clue.sourceLocationIds : [];
        if (!sourceActorIds.length && !sourceLocationIds.length && !String(clue.sourceItemId || '').trim()) {
            errors.push(`隐藏线索 ${clue.id || '?'} 必须绑定人物、地点或物品来源。`);
        }
        sourceActorIds.forEach(actorId => {
            clueSources.add(`actor:${actorId}`);
            if (!actorIds.has(actorId)) {
                errors.push(`隐藏线索 ${clue.id || '?'} 引用了不存在的角色。`);
            }
        });
        sourceLocationIds.forEach(locationId => clueSources.add(`location:${locationId}`));
        if (clue.sourceItemId) clueSources.add(`item:${clue.sourceItemId}`);
    });
    if (clueSources.size < 3) {
        errors.push('隐藏探索线的线索必须分布在至少三个不同来源。');
    }
    return { valid: errors.length === 0, errors };
}

export function validateOpeningWorldPackage(opening, character, campaign) {
    const errors = [];
    if (!opening || typeof opening !== 'object' || Array.isArray(opening)) {
        return { valid: false, errors: ['开场世界包必须是对象。'] };
    }
    const requiredText = [
        ['chapterEn', opening.chapterEn],
        ['clock', opening.clock],
        ['scene.nameEn', opening.scene?.nameEn],
        ['scene.summaryEn', opening.scene?.summaryEn],
        [
            'scene.explorationHookEn',
            opening.scene?.explorationHookEn,
        ],
        ['conflict.titleEn', opening.conflict?.titleEn],
        ['conflict.premiseEn', opening.conflict?.premiseEn],
        ['conflict.immediatePressureEn', opening.conflict?.immediatePressureEn],
        ['conflict.stakesEn', opening.conflict?.stakesEn],
        ['conflict.incitingEventEn', opening.conflict?.incitingEventEn],
        ['openingBriefEn', opening.openingBriefEn],
    ];
    requiredText.forEach(([path, value]) => {
        if (!String(value || '').trim()) errors.push(`${path} 不能为空。`);
    });
    const openingHookWords = String(
        opening.scene?.explorationHookEn || '',
    )
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
    if (
        openingHookWords < 6 ||
        openingHookWords > 60
    ) {
        errors.push(
            'scene.explorationHookEn 必须是 6–60 词的非剧透环境钩子。',
        );
    }
    if (!/^\d{4}-\d{2}-\d{2} · \d{2}:\d{2}$/.test(String(opening.clock || ''))) {
        errors.push('clock 必须使用 YYYY-MM-DD · HH:MM。');
    } else if (!String(opening.clock).startsWith(String(normalizeCampaign(campaign).startYear))) {
        errors.push('开场年份必须与剧本年份一致。');
    }

    const map = opening.scene?.map;
    if (!map || typeof map !== 'object') {
        errors.push('scene.map 不能为空。');
    } else {
        if (!OPENING_ID_PATTERN.test(String(map.id || ''))) errors.push('scene.map.id 必须是 snake_case。');
        if (!String(map.nameEn || '').trim()) errors.push('scene.map.nameEn 不能为空。');
        const levels = Array.isArray(map.levels) ? map.levels : [];
        const rooms = Array.isArray(map.rooms) ? map.rooms : [];
        const exits = Array.isArray(map.exits) ? map.exits : [];
        if (levels.length < 1 || levels.length > 4) errors.push('家庭/开场地图必须包含 1–4 个分区。');
        if (rooms.length < 2 || rooms.length > 16) errors.push('家庭/开场地图必须包含 2–16 个房间。');
        const levelIds = new Set();
        levels.forEach(level => {
            if (!OPENING_ID_PATTERN.test(String(level.id || '')) || levelIds.has(level.id)) {
                errors.push('地图分区 ID 无效或重复。');
            }
            levelIds.add(level.id);
        });
        const roomIds = new Set();
        rooms.forEach(room => {
            if (!OPENING_ID_PATTERN.test(String(room.id || '')) || roomIds.has(room.id)) {
                errors.push('房间 ID 无效或重复。');
            }
            roomIds.add(room.id);
            if (!levelIds.has(room.levelId)) errors.push(`房间 ${room.id || '?'} 引用了不存在的分区。`);
            if (!String(room.nameEn || '').trim()) errors.push(`房间 ${room.id || '?'} 缺少名称。`);
            if (!Number.isFinite(room.x) || room.x < 5 || room.x > 95 ||
                !Number.isFinite(room.y) || room.y < 5 || room.y > 95) {
                errors.push(`房间 ${room.id || '?'} 坐标必须在 5–95。`);
            }
        });
        if (!roomIds.has(map.currentRoomId)) errors.push('currentRoomId 必须引用地图中的房间。');
        exits.forEach(route => {
            if (!roomIds.has(route.from) || !roomIds.has(route.to) || route.from === route.to) {
                errors.push('地图出口引用了不存在或相同的房间。');
            }
        });
        if (opening.nextSceneIntent !== undefined) {
            const intent = opening.nextSceneIntent;
            for (const key of ['titleEn', 'summaryEn', 'triggerEn']) {
                if (!String(intent?.[key] || '').trim()) {
                    errors.push(`nextSceneIntent 缺少 ${key}。`);
                }
            }
            if (intent?.mapId !== map.id ||
                !roomIds.has(intent?.roomId)) {
                errors.push('nextSceneIntent 必须引用开场地图中的已有房间。');
            }
            if (!['medium', 'high'].includes(intent?.tier)) {
                errors.push('nextSceneIntent.tier 必须是 medium 或 high。');
            }
        }
    }

    const actors = Array.isArray(opening.actors) ? opening.actors : [];
    if (actors.length < 1 || actors.length > 8) errors.push('开场必须包含 1–8 名在场 NPC。');
    const actorIds = new Set();
    actors.forEach(actor => {
        if (!OPENING_ID_PATTERN.test(String(actor.id || '')) || actorIds.has(actor.id)) {
            errors.push('在场人物 ID 无效或重复。');
        }
        actorIds.add(actor.id);
        for (const key of ['nameEn', 'roleEn', 'relationshipToPlayerEn', 'firstImpressionOfPlayerEn', 'impressionOfPlayerEn', 'currentActivityEn', 'currentIntentEn']) {
            if (!String(actor[key] || '').trim()) errors.push(`人物 ${actor.id || '?'} 缺少 ${key}。`);
        }
        if (!isValidFirstImpression(
            actor.firstImpressionOfPlayerEn,
        )) {
            errors.push(
                `人物 ${actor.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
            );
        }
    });
    const playerName = String(character?.identity?.name || '').trim().toLocaleLowerCase();
    if (actors.some(actor => String(actor.nameEn || '').trim().toLocaleLowerCase() === playerName)) {
        errors.push('玩家角色不能被重复列为 NPC。');
    }
    if (actors.some(actor => /hogwarts world director|world narrator|storage narrator/i.test(String(actor.nameEn || '')))) {
        errors.push('后台存档叙事者不能作为在场人物。');
    }
    if (!Array.isArray(opening.agenda) || opening.agenda.length < 1) {
        errors.push('开场必须提供至少一项后续日程。');
    }
    const foundationValidation = validateDirectorFoundation({
        actorLibrary: opening.actorLibrary,
        storyArc: opening.storyArc,
    }, actors);
    errors.push(...foundationValidation.errors);
    return { valid: errors.length === 0, errors };
}

export function applyOpeningWorldPackage(worldState, opening) {
    const next = structuredClone(worldState);
    const map = opening.scene.map;
    const display = opening.display || {};
    const sceneName = display.sceneName || opening.scene.nameEn;
    const customMap = {
        id: map.id,
        parentWorldNodeId: opening.scene.worldAnchorId || '',
        name: display.mapName || map.nameEn,
        nameEn: map.nameEn,
        coordinateSystem: 'abstract-grid-100',
        defaultLevelId: map.currentLevelId || map.levels[0].id,
        layoutRule: 'This opening-scene map is committed world state. Changes require a validated World Director mutation.',
        levels: map.levels.map((level, index) => ({
            id: level.id,
            name: display.levelNames?.[index] || level.nameEn,
            nameEn: level.nameEn,
            z: Number(level.z || 0),
        })),
        nodes: map.rooms.map((room, index) => ({
            id: room.id,
            name: display.roomNames?.[index] || room.nameEn,
            nameEn: room.nameEn,
            levelId: room.levelId,
            kind: room.kind || 'room',
            x: room.x,
            y: room.y,
            access: room.access || 'private',
            description: room.descriptionEn || '',
            descriptionEn: room.descriptionEn || '',
            tags: ['opening_generated'],
        })),
        exits: map.exits.map(route => ({
            from: route.from,
            to: route.to,
            direction: route.direction || 'passage',
            kind: route.kind || 'door',
            minutes: Math.max(0, Number(route.minutes || 1)),
            conditions: [],
        })),
    };
    next.phase = 'opening_narration';
    next.chapter = display.chapter || opening.chapterEn;
    next.clock = opening.clock;
    next.location = sceneName;
    next.scene = {
        id: opening.scene.id || map.id,
        name: sceneName,
        nameEn: opening.scene.nameEn,
        summary: display.sceneSummary || opening.scene.summaryEn,
        summaryEn: opening.scene.summaryEn,
        explorationHook:
            display.sceneExplorationHook ||
            opening.scene.explorationHookEn,
        explorationHookEn:
            opening.scene.explorationHookEn,
        startedClock: opening.clock,
        startedMessageId: 0,
        timelineEntries: [{
            clock: opening.clock,
            label: display.incitingEvent ||
                opening.conflict.incitingEventEn,
        }],
        mapId: map.id,
        roomId: map.currentRoomId,
    };
    next.actors = opening.actors.map((actor, index) =>
        normalizeActorLifeState({
            ...actor,
            name: display.actorNames?.[index] || actor.nameEn,
            role: display.actorRoles?.[index] || actor.roleEn,
            relationshipToPlayer: display.actorRelationships?.[index] || actor.relationshipToPlayerEn,
            firstImpressionOfPlayerEn:
                actor.firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                display.actorFirstImpressions?.[index] ||
                actor.firstImpressionOfPlayerEn,
            firstImpressionClock:
                opening.clock,
            firstImpressionTurn: 0,
            firstImpressionPending: false,
            impressionOfPlayerEn:
            actor.impressionOfPlayerEn ||
            actor.relationshipToPlayerEn,
            impressionOfPlayer:
            display.actorImpressions?.[index] ||
            actor.impressionOfPlayerEn ||
            display.actorRelationships?.[index] ||
            actor.relationshipToPlayerEn,
            impressionUpdatedClock: opening.clock,
            impressionUpdatedTurn: 0,
            currentActivity: display.actorActivities?.[index] || actor.currentActivityEn,
            currentIntent: display.actorIntents?.[index] || actor.currentIntentEn,
            mapId: customMap.id,
            roomId: customMap.nodes.some(room => room.id === actor.roomId)
                ? actor.roomId
                : inferActorRoomId(actor, customMap, map.currentRoomId),
            present: actor.present !== false,
        }));
    const openingActors = new Map(
        next.actors.map(actor => [actor.id, actor]),
    );
    next.actorLibrary = (opening.actorLibrary || []).map(actor =>
        normalizeActorMemoryProfile({
            ...actor,
            name:
                actor.display?.name ||
                actor.name ||
                actor.nameEn,
            aliases:
                actor.aliases || [],
            role: actor.display?.role || actor.roleEn,
            relationshipToPlayer:
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            firstImpressionOfPlayerEn:
                actor.firstImpressionOfPlayerEn ||
                openingActors.get(actor.id)
                    ?.firstImpressionOfPlayerEn ||
                '',
            firstImpressionOfPlayer:
                actor.display?.firstImpressionOfPlayer ||
                openingActors.get(actor.id)
                    ?.firstImpressionOfPlayer ||
                '',
            firstImpressionClock:
                openingActors.has(actor.id)
                    ? opening.clock
                    : '',
            firstImpressionTurn: 0,
            firstImpressionPending:
                false,
            impressionOfPlayerEn:
                actor.impressionOfPlayerEn ||
                openingActors.get(actor.id)
                    ?.impressionOfPlayerEn ||
                actor.relationshipToPlayerEn,
            impressionOfPlayer:
                actor.display?.impressionOfPlayer ||
                openingActors.get(actor.id)
                    ?.impressionOfPlayer ||
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            impressionUpdatedClock:
                openingActors.has(actor.id)
                    ? opening.clock
                    : '',
            impressionUpdatedTurn: 0,
            introducedClock:
                openingActors.has(actor.id)
                    ? opening.clock
                    : '',
            introducedTurn: 0,
            lifeStatus:
                openingActors.get(actor.id)
                    ?.lifeStatus ||
                actor.lifeStatus ||
                'alive',
            lifeStatusPermanent:
                Boolean(
                    openingActors.get(actor.id)
                        ?.lifeStatusPermanent ||
                    actor.lifeStatusPermanent,
                ),
            lifeStatusDetailEn:
                openingActors.get(actor.id)
                    ?.lifeStatusDetailEn ||
                actor.lifeStatusDetailEn ||
                'Alive.',
            lifeStatusDetail:
                openingActors.get(actor.id)
                    ?.lifeStatusDetail ||
                actor.lifeStatusDetail ||
                '存活。',
            lifeStatusSinceClock:
                openingActors.get(actor.id)
                    ?.lifeStatusSinceClock ||
                actor.lifeStatusSinceClock ||
                '',
            publicDescription:
                actor.display?.publicDescription ||
                actor.publicDescriptionEn,
            publicBackground:
                actor.display?.publicBackground ||
                actor.publicBackgroundEn,
            personality:
                actor.display?.personality ||
                actor.personalityEn,
            speechStyle:
                actor.display?.speechStyle ||
                actor.speechStyleEn,
        }, openingActors.get(actor.id)));
    next.storyArcs = opening.storyArc ? [{
        ...structuredClone(opening.storyArc),
        status: opening.storyArc.status || 'active',
        revealedClueIds: [],
    }] : [];
    next.conflict = {
        ...opening.conflict,
        title: display.conflictTitle || opening.conflict.titleEn,
        premise: display.conflictPremise || opening.conflict.premiseEn,
        immediatePressure: display.conflictPressure || opening.conflict.immediatePressureEn,
        stakes: display.conflictStakes || opening.conflict.stakesEn,
        incitingEvent: display.incitingEvent || opening.conflict.incitingEventEn,
    };
    next.agenda = (opening.agenda || []).map((item, index) => ({
        ...item,
        timeLabel: display.agendaTimes?.[index] || item.timeLabelEn,
        label: display.agendaLabels?.[index] || item.labelEn,
    }));
    next.clues = [];
    next.timeline = [{
        clock: opening.clock,
        label: display.incitingEvent || opening.conflict.incitingEventEn,
    }];
    next.items = (opening.items || []).map(
        (item, index) =>
            normalizeInventoryItem({
                ...item,
                label:
                    display.itemLabels?.[index] ||
                    item.labelEn,
                detail:
                    display.itemDetails?.[index] ||
                    item.detailEn,
            }, index, {
                mapId: customMap.id,
                roomId: map.currentRoomId,
                clock: opening.clock,
                source: 'opening',
            }),
    );
    next.map.customLocalMaps = [
        ...(next.map.customLocalMaps || []).filter(item => item.id !== customMap.id),
        customMap,
    ];
    next.map.activeMapId = customMap.id;
    next.map.currentNodeId = null;
    next.map.currentLocalNodeId = map.currentRoomId;
    next.map.currentLevelId = customMap.nodes.find(room => room.id === map.currentRoomId)?.levelId || customMap.defaultLevelId;
    next.map.discoveredLocalNodeIds = customMap.nodes.map(room => `${customMap.id}:${room.id}`);
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId: customMap.id,
            roomId: map.currentRoomId,
        },
        lastMovement: null,
    };
    next.scene.itemStates =
        createSceneItemStates(
            next.items,
            {
                mapId: customMap.id,
                roomId: map.currentRoomId,
            },
        );
    next.scene.nextSceneIntent = opening.nextSceneIntent
        ? structuredClone(opening.nextSceneIntent)
        : createFallbackNextSceneIntent(next);
    next.opening = {
        status: 'narrating',
        attempt: Number(next.opening?.attempt || 0),
        error: '',
        package: structuredClone(opening),
        committedAt: new Date().toISOString(),
    };
    next.directorFoundation = {
        status: 'ready',
        error: '',
        committedAt: new Date().toISOString(),
    };
    return migrateActorPresentationState(
        next,
    ).state;
}

export function applyDirectorFoundation(worldState, foundation) {
    const validation = validateDirectorFoundation(foundation, worldState.actors);
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const previousProfiles = new Map(
        (next.actorLibrary || []).map(actor => [
            actor.id,
            normalizeActorMemoryProfile(actor),
        ]),
    );
    const currentActors = new Map(
        (next.actors || []).map(actor => [actor.id, actor]),
    );
    next.actorLibrary = foundation.actorLibrary.map(actor => {
        const previous = previousProfiles.get(actor.id);
        return normalizeActorMemoryProfile({
            ...actor,
            name:
                actor.display?.name ||
                actor.name ||
                actor.nameEn,
            aliases:
                actor.aliases || [],
            role: actor.display?.role || actor.roleEn,
            relationshipToPlayer:
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            firstImpressionOfPlayerEn:
                previous
                    ?.firstImpressionOfPlayerEn ||
                actor.firstImpressionOfPlayerEn ||
                '',
            firstImpressionOfPlayer:
                previous
                    ?.firstImpressionOfPlayer ||
                actor.display
                    ?.firstImpressionOfPlayer ||
                actor.firstImpressionOfPlayerEn ||
                '',
            firstImpressionClock:
                previous
                    ?.firstImpressionClock ||
                (
                    currentActors.has(actor.id)
                        ? next.clock
                        : ''
                ),
            firstImpressionTurn:
                previous
                    ?.firstImpressionTurn ||
                0,
            firstImpressionPending:
                currentActors.has(actor.id) &&
                !(
                    previous
                        ?.firstImpressionOfPlayerEn ||
                    actor
                        .firstImpressionOfPlayerEn
                ),
            impressionOfPlayerEn:
                previous?.impressionOfPlayerEn ||
                actor.impressionOfPlayerEn ||
                actor.relationshipToPlayerEn,
            impressionOfPlayer:
                previous?.impressionOfPlayer ||
                actor.display?.impressionOfPlayer ||
                actor.impressionOfPlayerEn ||
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            impressionUpdatedClock:
                previous?.impressionUpdatedClock || '',
            impressionUpdatedTurn:
                previous?.impressionUpdatedTurn || 0,
            relationshipTags:
                previous?.relationshipTags,
            introducedClock:
                previous?.introducedClock ||
                (
                    currentActors.has(
                        actor.id,
                    )
                        ? next.clock
                        : ''
                ),
            introducedTurn:
                previous?.introducedTurn ||
                (
                    currentActors.has(
                        actor.id,
                    )
                        ? Number(
                            next.turn
                                ?.count || 0,
                        )
                        : null
                ),
            sharedMemories:
                previous?.sharedMemories,
            publicDescription:
                actor.display?.publicDescription ||
                actor.publicDescriptionEn,
            publicBackground:
                actor.display?.publicBackground ||
                actor.publicBackgroundEn,
            personality:
                actor.display?.personality ||
                actor.personalityEn,
            speechStyle:
                actor.display?.speechStyle ||
                actor.speechStyleEn,
        }, currentActors.get(actor.id));
    });
    next.storyArcs = [{
        ...structuredClone(foundation.storyArc),
        status: foundation.storyArc.status || 'active',
        revealedClueIds: Array.isArray(foundation.storyArc.revealedClueIds)
            ? foundation.storyArc.revealedClueIds
            : [],
    }];
    next.actors = next.actors.map(actor => {
        const profile = next.actorLibrary.find(item => item.id === actor.id);
        return profile ? {
            ...actor,
            name: profile.name,
            role: profile.role,
            relationshipToPlayer: profile.relationshipToPlayer,
            firstImpressionOfPlayerEn:
                profile
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile.firstImpressionClock,
            firstImpressionTurn:
                profile.firstImpressionTurn,
            firstImpressionPending:
                profile.firstImpressionPending,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
        } : actor;
    });
    next.clues = (next.clues || []).filter(clue => clue.discovered === true);
    next.timeline = Array.isArray(next.timeline) && next.timeline.length
        ? next.timeline
        : [{
            clock: next.clock,
            label: next.scene?.summary || next.chapter || '故事开始',
        }];
    next.directorFoundation = {
        status: 'ready',
        error: '',
        committedAt: new Date().toISOString(),
    };
    return next;
}

const SPELL_TEACHING_PATTERN =
    /(?:教学|教会|讲解|示范|演示|练习|尝试这个咒语|跟着念|照着第?\s*\d+\s*页|teach|taught|demonstrat|practi[cs]e|try (?:it|this spell)|repeat after|writ(?:e|es|ten).{0,40}(?:board|blackboard)|page\s+\d+)/iu;
const SPELL_SELF_STUDY_PATTERN =
    /(?:自学|学习|研究|阅读|照着书|查阅|笔记|偷偷学|self[- ]?study|learn|study|research|read(?:ing)?|from (?:a|the) book|notes?)/iu;
const SPELL_SOURCE_PRIORITY =
    Object.freeze({
        experiment: 0,
        prior_schooling: 1,
        self_study: 2,
        class: 3,
        special_instruction: 4,
    });
const SPELL_OUTCOME_XP =
    Object.freeze({
        catastrophic_failure: 1,
        failure: 2,
        success_with_cost: 5,
        success: 8,
        critical_success: 12,
    });

function createLearnedSpellEntry(
    spellId,
    {
        source = 'experiment',
        detail = '',
        clock = '',
        turn = 0,
        proficiencyXp = 0,
        sortOrder = 0,
    } = {},
) {
    return normalizeKnownSpell({
        spellId,
        learnedSource:
            source,
        learnedSourceDetail:
            detail,
        firstLearnedClock:
            clock,
        firstLearnedTurn:
            turn,
        lastPracticedClock:
            '',
        lastPracticedTurn:
            0,
        attempts: 0,
        successes: 0,
        criticalSuccesses: 0,
        failures: 0,
        proficiencyXp,
        sortOrder,
    });
}

function upsertLearnedSpell(
    spellbook,
    spellId,
    {
        source = 'experiment',
        detail = '',
        clock = '',
        turn = 0,
        proficiencyXp = 0,
    } = {},
) {
    const spell =
        getSpellDefinition(
            spellId,
        );
    if (!spell) {
        return null;
    }
    spellbook.known ??= [];
    const index =
        spellbook.known
            .findIndex(entry =>
                entry.spellId ===
                spell.id);
    if (index < 0) {
        const created =
            createLearnedSpellEntry(
                spell.id,
                {
                    source,
                    detail,
                    clock,
                    turn,
                    proficiencyXp,
                    sortOrder:
                        spellbook.known
                            .length,
                },
            );
        spellbook.known.push(
            created,
        );
        spellbook.lastUpdatedClock =
            clock ||
            spellbook
                .lastUpdatedClock;
        return created;
    }
    const existing =
        spellbook.known[index];
    const existingPriority =
        SPELL_SOURCE_PRIORITY[
            existing.learnedSource
        ] ??
        0;
    const nextPriority =
        SPELL_SOURCE_PRIORITY[
            source
        ] ??
        0;
    const next =
        normalizeKnownSpell({
            ...existing,
            ...(nextPriority >
                existingPriority
                ? {
                    learnedSource:
                        source,
                    learnedSourceDetail:
                        detail ||
                        existing
                            .learnedSourceDetail,
                }
                : {}),
            firstLearnedClock:
                existing
                    .firstLearnedClock ||
                clock,
            firstLearnedTurn:
                existing
                    .firstLearnedTurn ||
                turn,
            proficiencyXp:
                Math.max(
                    Number(
                        existing
                            .proficiencyXp ||
                        0,
                    ),
                    Number(
                        proficiencyXp ||
                        0,
                    ),
                ),
        });
    spellbook.known[index] =
        next;
    return next;
}

function getSpellLearningSource(
    text,
) {
    const source =
        String(text || '');
    if (
        SPELL_SELF_STUDY_PATTERN
            .test(source)
    ) {
        return 'self_study';
    }
    return 'experiment';
}

function getSpellTextFromMessage(
    message,
) {
    const mud =
        message?.extra
            ?.hogwartsMud;
    return [
        mud?.sourceEn,
        message?.mes,
        ...(
            mud?.segments ||
            []
        ).map(segment =>
            segment.textEn),
    ]
        .filter(Boolean)
        .join('\n');
}

export function migrateSpellbookState(
    worldState,
    chat = [],
) {
    if (!worldState) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const normalized =
        normalizeSpellbook(
            next.spellbook,
            {
                grade:
                    next.campaign
                        ?.grade ||
                    1,
                clock:
                    next.clock ||
                    '',
            },
        );
    const previous =
        JSON.stringify(
            next.spellbook ||
            null,
        );
    next.spellbook =
        normalized;
    const startIndex =
        Math.max(
            0,
            Number(
                normalized
                    .lastScannedMessageId ??
                -1,
            ) +
                1,
        );
    (
        Array.isArray(chat)
            ? chat
            : []
    )
        .slice(startIndex)
        .forEach(
            (
                message,
                offset,
            ) => {
                const messageId =
                    startIndex +
                    offset;
                const text =
                    getSpellTextFromMessage(
                        message,
                    );
                if (
                    message
                        ?.is_user
                ) {
                    parseSpellCastDirectives(
                        text,
                    ).forEach(cast => {
                        const source =
                            getSpellLearningSource(
                                text,
                            );
                        upsertLearnedSpell(
                            next.spellbook,
                            cast.spellId,
                            {
                                source,
                                detail:
                                    source ===
                                        'self_study'
                                        ? 'Learned through the player\'s own study.'
                                        : 'Discovered through the player\'s own experiment.',
                                clock:
                                    next.clock ||
                                    '',
                                turn:
                                    next.turn
                                        ?.count ||
                                    0,
                                proficiencyXp:
                                    source ===
                                        'self_study'
                                        ? 5
                                        : 1,
                            },
                        );
                    });
                } else if (
                    SPELL_TEACHING_PATTERN
                        .test(text)
                ) {
                    findSpellReferences(
                        text,
                    ).forEach(spell => {
                        upsertLearnedSpell(
                            next.spellbook,
                            spell.id,
                            {
                                source:
                                    'class',
                                detail:
                                    `Taught or demonstrated in ${next.scene?.nameEn || 'class'}.`,
                                clock:
                                    next.clock ||
                                    '',
                                turn:
                                    next.turn
                                        ?.count ||
                                    0,
                                proficiencyXp:
                                    8,
                            },
                        );
                    });
                }
                next.spellbook
                    .lastScannedMessageId =
                    messageId;
            },
        );
    next.spellbook.version =
        SPELL_CATALOG_VERSION;
    return {
        state: next,
        changed:
            previous !==
            JSON.stringify(
                next.spellbook,
            ),
    };
}

function getKnownSpell(
    worldState,
    spellId,
) {
    return (
        worldState
            ?.spellbook
            ?.known ||
        []
    ).find(entry =>
        entry.spellId ===
        spellId) ||
        null;
}

function getSpellProficiencyModifier(
    worldState,
    spellId,
) {
    const known =
        getKnownSpell(
            worldState,
            spellId,
        );
    if (!known) {
        return -2;
    }
    return getSpellProficiency(
        known.proficiencyXp,
    ).modifier;
}

export function settleSpellProgress(
    worldState,
    playerAction,
    transaction = {},
) {
    const casts =
        Array.isArray(
            transaction
                .spellCasts,
        ) &&
        transaction
            .spellCasts
            .length
            ? transaction
                .spellCasts
            : parseSpellCastDirectives(
                playerAction,
            );
    const narrativeText = [
        transaction.publicEventEn,
        ...(
            transaction.segments ||
            []
        ).map(segment =>
            segment.textEn),
    ]
        .filter(Boolean)
        .join('\n');
    if (
        !casts.length &&
        !SPELL_TEACHING_PATTERN
            .test(narrativeText)
    ) {
        return worldState;
    }
    const next =
        structuredClone(
            worldState,
        );
    next.spellbook =
        normalizeSpellbook(
            next.spellbook,
            {
                grade:
                    next.campaign
                        ?.grade ||
                    1,
                clock:
                    next.clock ||
                    '',
            },
        );
    findSpellReferences(
        narrativeText,
    ).forEach(spell => {
        if (
            SPELL_TEACHING_PATTERN
                .test(narrativeText)
        ) {
            upsertLearnedSpell(
                next.spellbook,
                spell.id,
                {
                    source:
                        'class',
                    detail:
                        `Taught or demonstrated in ${next.scene?.nameEn || 'class'}.`,
                    clock:
                        next.clock,
                    turn:
                        next.turn
                            ?.count ||
                        0,
                    proficiencyXp:
                        8,
                },
            );
        }
    });
    casts.forEach(cast => {
        const existing =
            getKnownSpell(
                next,
                cast.spellId,
            );
        const source =
            existing
                ?.learnedSource ||
            getSpellLearningSource(
                playerAction,
            );
        const learned =
            upsertLearnedSpell(
                next.spellbook,
                cast.spellId,
                {
                    source,
                    detail:
                        source ===
                            'class'
                            ? `Practised during ${next.scene?.nameEn || 'class'}.`
                            : source ===
                                'self_study'
                                ? 'Learned through the player\'s own study.'
                                : 'Discovered through the player\'s own experiment.',
                    clock:
                        next.clock,
                    turn:
                        next.turn
                            ?.count ||
                        0,
                    proficiencyXp:
                        source ===
                            'class'
                            ? 8
                            : source ===
                                'self_study'
                                ? 5
                                : 1,
                },
            );
        if (!learned) {
            return;
        }
        const outcome =
            transaction
                .checkResolution
                ?.spell
                ?.spellId ===
                cast.spellId
                ? transaction
                    .checkResolution
                    .outcome
                : null;
        const xpGain =
            SPELL_OUTCOME_XP[
                outcome
            ] ??
            1;
        const success =
            [
                'success_with_cost',
                'success',
                'critical_success',
            ].includes(
                outcome,
            );
        const updated =
            normalizeKnownSpell({
                ...learned,
                lastPracticedClock:
                    next.clock,
                lastPracticedTurn:
                    next.turn
                        ?.count ||
                    0,
                attempts:
                    learned.attempts +
                    1,
                successes:
                    learned.successes +
                    (
                        success
                            ? 1
                            : 0
                    ),
                criticalSuccesses:
                    learned
                        .criticalSuccesses +
                    (
                        outcome ===
                            'critical_success'
                            ? 1
                            : 0
                    ),
                failures:
                    learned.failures +
                    (
                        success
                            ? 0
                            : 1
                    ),
                proficiencyXp:
                    learned
                        .proficiencyXp +
                    xpGain,
            });
        const index =
            next.spellbook
                .known
                .findIndex(entry =>
                    entry.spellId ===
                    cast.spellId);
        next.spellbook
            .known[index] =
            updated;
    });
    next.spellbook.lastUpdatedClock =
        next.clock;
    return next;
}

const WORLD_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) · (\d{2}):(\d{2})$/;
const MAGIC_ACTION_PATTERN =
    /(?:施法|念咒|施放咒语|使用魔法|发动魔法|幻影移形|\bcast(?:s|ing)?\s+(?:a\s+)?spell\b|\buse(?:s|d|ing)?\s+magic\b|\bapparat(?:e|es|ed|ing)\b)/iu;
const INVESTIGATION_ACTION_PATTERN = /(?:调查|搜索|检查|观察|阅读|研究|翻找|询问|investigat|search|inspect|study|read)/i;
const EXTENDED_ACTION_PATTERN = /(?:训练|练习|上课|制作|熬制|等待|睡觉|休息|train|practice|class|brew|wait|sleep|rest)/i;
const MOVEMENT_ACTION_PATTERN = /(?:前往|去往|进入|来到|返回|抵达|走进|走到|走向|走去|赶往|跑到|跑进|跑去|冲进|冲向|冲到|冲去|穿过|跨过|出去|上楼|下楼|绕着.+跑|往.{1,40}(?:走|跑|冲|去)|go to|enter|head to|return to|travel|walk to|run to|run into|rush to|go through)/i;
const GUIDED_MOVEMENT_ACTION_PATTERN =
    /(?:带路|领路|领着|引路|跟着|跟随|带我(?:们)?去|下一个(?:购物)?(?:点|地点)|跟(?:着|随)?[\p{L}\p{N}_·.'’ -]{1,30}(?:走|去|前往|进入|穿过)|被.{0,24}(?:拉|带|领)(?:着)?.{0,12}(?:去|到|进|穿过)|lead (?:me|us|the way)|follow|next (?:stop|shop|place)|(?:pull|take|guide|lead) (?:me|us) (?:to|through))/iu;
const EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN =
    /(?:→|->)\s*(?:【\s*([^】\n]+?)\s*】|([^\n。！？!?]+))/u;
export const SPATIAL_STATE_VERSION = 7;
const SPATIAL_INFERENCE_STOPWORDS = new Set([
    'steps',
    'lobby',
    'entrance',
    'door',
    'doorway',
    'room',
    'hall',
    'hallway',
    'shop',
    'street',
    'corridor',
    'compartment',
    'carriage',
    'gryffindor',
    'hufflepuff',
    'ravenclaw',
    'slytherin',
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'standing',
    'walking',
    'behind',
    'inside',
    'outside',
]);
const CHECK_OUTCOMES = Object.freeze([
    'catastrophic_failure',
    'failure',
    'success_with_cost',
    'success',
    'critical_success',
]);
const CHECK_OUTCOME_LABELS = Object.freeze({
    catastrophic_failure: {
        label: '灾难性失败',
        labelEn: 'Catastrophic failure',
    },
    failure: {
        label: '失败并产生后果',
        labelEn: 'Failure with consequence',
    },
    success_with_cost: {
        label: '成功但付出代价',
        labelEn: 'Success at a cost',
    },
    success: {
        label: '完全成功',
        labelEn: 'Full success',
    },
    critical_success: {
        label: '重大成功',
        labelEn: 'Critical success',
    },
});
export const CHECK_ATTRIBUTE_LABELS = Object.freeze({
    physique: { label: '体魄', labelEn: 'Physique' },
    agility: { label: '灵巧', labelEn: 'Agility' },
    perception: { label: '感知', labelEn: 'Perception' },
    intellect: { label: '智识', labelEn: 'Intellect' },
    willpower: { label: '意志', labelEn: 'Willpower' },
    charisma: { label: '魅力', labelEn: 'Charisma' },
});
const ACTION_CHECK_RULES = Object.freeze([
    {
        id: 'physical_force',
        label: '体魄对抗',
        labelEn: 'Physical contest',
        attribute: 'physique',
        targetAttribute: 'physique',
        skill: 'athletics',
        opposed: true,
        dcAdjustment: 0,
        pattern: /(?:推(?!理|测|断)(?:开|倒|到|搡)?|撞(?:开|倒)?|殴打|打(?:他|她|人|向|了|一拳|一下)|踢|抓住|按住|拽|拖|扯|抢|掰|砸|攻击|扑向|绊倒|shove|push|hit|kick|grab|tackle|restrain|trip)/i,
    },
    {
        id: 'agility',
        label: '灵巧行动',
        labelEn: 'Agility action',
        attribute: 'agility',
        targetAttribute: 'agility',
        skill: 'acrobatics',
        opposed: false,
        dcAdjustment: 1,
        pattern: /(?:躲|闪避|翻越|跳过|跳上|攀|爬|潜行|溜过去|扒窃|偷走|撬锁|追赶|逃脱|dodge|evade|climb|jump|sneak|steal|pickpocket|lockpick|chase|escape)/i,
    },
    {
        id: 'perception',
        label: '感知调查',
        labelEn: 'Perception check',
        attribute: 'perception',
        targetAttribute: 'agility',
        skill: 'investigation',
        opposed: false,
        dcAdjustment: 0,
        pattern: /(?:调查|搜索|搜查|仔细检查|仔细观察|偷听|寻找|翻找|辨认|察觉|investigat|search|inspect closely|eavesdrop|notice|spot|track)/i,
    },
    {
        id: 'intellect',
        label: '智识检定',
        labelEn: 'Intellect check',
        attribute: 'intellect',
        targetAttribute: 'intellect',
        skill: 'lore',
        opposed: false,
        dcAdjustment: 1,
        pattern: /(?:回忆|推理|解读|破译|计算|研究|分析|认出|recall|deduce|decode|calculate|research|analyse|analyze|identify)/i,
    },
    {
        id: 'willpower',
        label: '意志检定',
        labelEn: 'Willpower check',
        attribute: 'willpower',
        targetAttribute: 'willpower',
        skill: 'discipline',
        opposed: false,
        dcAdjustment: 1,
        pattern: /(?:抵抗|忍住|集中精神|保持专注|克服恐惧|保持镇定|resist|endure|concentrate|focus|overcome fear|stay calm)/i,
    },
    {
        id: 'charisma',
        label: '社交对抗',
        labelEn: 'Social contest',
        attribute: 'charisma',
        targetAttribute: 'willpower',
        skill: 'influence',
        opposed: true,
        dcAdjustment: 0,
        pattern: /(?:说服|欺骗|撒谎|威胁|恐吓|套话|交涉|谈判|魅惑|取悦|persuade|deceive|lie to|threaten|intimidate|negotiate|charm|bluff)/i,
    },
    {
        id: 'magic',
        label: '施法检定',
        labelEn: 'Spellcasting check',
        attribute: 'willpower',
        targetAttribute: 'willpower',
        skill: 'spellcasting',
        opposed: false,
        dcAdjustment: 2,
        pattern: /(?:施法|念咒|举起魔杖|挥动魔杖|释放咒语|cast(?:ing)? a spell|raise(?:d)? (?:my|the) wand|wave(?:d)? (?:my|the) wand)/i,
    },
]);
const CHECK_DIFFICULTY_DC = Object.freeze({
    narrative: 10,
    standard: 12,
    harsh: 14,
});
const CHECK_ADVANTAGE_PATTERN = /(?:借助|利用.+(?:工具|道具)|有人协助|出其不意|充分准备|with help|using .+ tool|prepared|by surprise)/i;
const CHECK_DISADVANTAGE_PATTERN = /(?:重伤|精疲力尽|惊慌|恐惧得|被束缚|injured|exhausted|panicked|restrained)/i;

function secureRandomInt(maximum) {
    const range = Math.max(1, Number(maximum) || 1);
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.getRandomValues) {
        return Math.floor(Math.random() * range) + 1;
    }
    const values = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / range) * range;
    do {
        cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);
    return (values[0] % range) + 1;
}

function getAttributeModifier(character, attribute) {
    const value = Number(character?.attributes?.[attribute] ?? 10);
    return Math.floor((value - 10) / 2);
}

function getSkillModifier(character, skill) {
    const source = character?.skills?.[skill];
    const value = Number(
        source && typeof source === 'object'
            ? source.value
            : source,
    );
    return Number.isFinite(value) && value > 0
        ? Math.min(5, Math.floor(value / 4))
        : 0;
}

function normalizeCheckText(value) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/[_·]/g, ' ')
        .toLocaleLowerCase();
}

function findCheckTargetActor(
    worldState,
    playerAction,
    checkRule = null,
) {
    const baseQuery = normalizeCheckText(playerAction);
    const aliases = [];
    if (/(?:男孩|男生|小男孩|小孩)/.test(baseQuery)) {
        aliases.push('boy child first year student');
    }
    if (/(?:女孩|女生|小女孩)/.test(baseQuery)) {
        aliases.push('girl child first year student');
    }
    if (/(?:教授|老师)/.test(baseQuery)) {
        aliases.push('professor teacher');
    }
    if (/(?:店主|老板)/.test(baseQuery)) {
        aliases.push('shopkeeper owner bartender');
    }
    if (/(?:路人|行人)/.test(baseQuery)) {
        aliases.push('passerby shopper stranger');
    }
    if (/(?:爸爸|父亲)/.test(baseQuery)) {
        aliases.push('father guardian');
    }
    const query = `${baseQuery} ${aliases.join(' ')}`;
    const spatialActors = new Map(
        buildSpatialContext(worldState).actors
            .map(actor => [actor.id, actor]),
    );
    const playerRoomId =
        worldState.map?.currentLocalNodeId;
    let best = null;
    (worldState.actors || [])
        .filter(actor => actor.present !== false)
        .forEach(actor => {
            const spatial = spatialActors.get(actor.id);
            if (checkRule?.id === 'physical_force' &&
                actor.roomId !== playerRoomId) {
                return;
            }
            if (checkRule?.id === 'charisma' &&
                spatial && !spatial.canHearPlayer) {
                return;
            }
            const profile = (worldState.actorLibrary || [])
                .find(item => item.id === actor.id);
            const labels = [
                actor.id,
                actor.name,
                actor.nameEn,
                profile?.name,
                profile?.nameEn,
                actor.role,
                actor.roleEn,
                profile?.role,
                profile?.roleEn,
                profile?.publicDescription,
                profile?.publicDescriptionEn,
            ].filter(Boolean);
            let score = 0;
            labels.forEach(label => {
                const normalized = normalizeCheckText(label);
                if (normalized.length >= 3 &&
                    query.includes(normalized)) {
                    score = Math.max(score, normalized.length + 20);
                }
                normalized.split(/[^\p{L}\p{N}]+/u)
                    .filter(part => part.length >= 4)
                    .forEach(part => {
                        if (query.includes(part)) {
                            score = Math.max(score, part.length);
                        }
                    });
            });
            if (score > 0 && (!best || score > best.score)) {
                best = { actor, profile, score };
            }
        });
    return best;
}

function deriveNpcCheckModifier(actor, profile, attribute) {
    const explicit = Number(
        profile?.checkModifiers?.[attribute] ??
        actor?.checkModifiers?.[attribute],
    );
    if (Number.isFinite(explicit)) {
        return Math.max(-5, Math.min(5, explicit));
    }
    const role = normalizeCheckText([
        actor?.roleEn,
        actor?.role,
        profile?.roleEn,
        profile?.role,
        profile?.publicDescriptionEn,
    ].filter(Boolean).join(' '));
    let modifier = 0;
    if (/(?:headmistress|professor|auror|master|champion|校长|教授|傲罗|大师)/i.test(role)) {
        modifier = 3;
    } else if (/(?:teacher|guard|officer|adult|shopkeeper|bartender|老师|守卫|成年|店主)/i.test(role)) {
        modifier = 1;
    } else if (/(?:first year|first-year|student|child|boy|girl|一年级|学生|孩子|男孩|女孩)/i.test(role)) {
        modifier = 0;
    }
    if (attribute === 'physique' &&
        /(?:small|frail|stooped|瘦小|虚弱|驼背)/i.test(role)) {
        modifier -= 1;
    }
    return Math.max(-5, Math.min(5, modifier));
}

function rollD20(mode, randomInt) {
    const count = mode === 'normal' ? 1 : 2;
    const rolls = Array.from(
        { length: count },
        () => randomInt(20),
    );
    return {
        rolls,
        keptRoll: mode === 'advantage'
            ? Math.max(...rolls)
            : mode === 'disadvantage'
                ? Math.min(...rolls)
                : rolls[0],
    };
}

function getCheckOutcome(total, targetTotal, naturalRoll) {
    const margin = total - targetTotal;
    let rank = margin <= -10
        ? 0
        : margin < 0
            ? 1
            : margin < 5
                ? 2
                : margin < 10
                    ? 3
                    : 4;
    if (naturalRoll === 1) rank--;
    if (naturalRoll === 20) rank++;
    return CHECK_OUTCOMES[
        Math.max(0, Math.min(CHECK_OUTCOMES.length - 1, rank))
    ];
}

export function detectActionCheck(
    worldState,
    playerAction,
    {
        forced = false,
        spellCast = null,
    } = {},
) {
    const action = String(playerAction || '');
    const structuredSpell =
        getSpellDefinition(
            spellCast?.spellId ||
            parseSpellCastDirectives(
                action,
            )[0]?.spellId,
        );
    const knownSpell =
        structuredSpell
            ? getKnownSpell(
                worldState,
                structuredSpell.id,
            )
            : null;
    const rule =
        structuredSpell
            ? {
                id: 'magic',
                label:
                    `施法检定 · ${structuredSpell.name}`,
                labelEn:
                    `Spellcasting check · ${structuredSpell.incantation}`,
                attribute:
                    'willpower',
                targetAttribute:
                    structuredSpell
                        .targetAttribute,
                skill:
                    'spellcasting',
                opposed:
                    structuredSpell
                        .opposed,
                dcAdjustment:
                    structuredSpell
                        .dcAdjustment +
                    (
                        knownSpell
                            ? 0
                            : 2
                    ),
                spell:
                    structuredSpell,
                knownSpell:
                    Boolean(
                        knownSpell,
                    ),
            }
            : ACTION_CHECK_RULES.find(item =>
                item.pattern.test(action),
            );
    if (!rule && !forced) {
        return null;
    }
    const selected = rule || {
        id: 'forced_general',
        label: '主动判定',
        labelEn: 'Player-requested check',
        attribute: 'perception',
        targetAttribute: 'agility',
        skill: 'general',
        opposed: false,
        dcAdjustment: 0,
    };
    const target = findCheckTargetActor(
        worldState,
        action,
        selected,
    );
    if (selected.id === 'physical_force' &&
        !target &&
        !forced &&
        !/(?:用力|强行|撞开|砸开|破坏|沉重|锁住|卡住|force|break|stuck|heavy)/i.test(action)) {
        return null;
    }
    return {
        ...selected,
        forced:
            Boolean(
                forced ||
                structuredSpell,
            ),
        target: target
            ? {
                actorId: target.actor.id,
                name: target.actor.name ||
                    target.profile?.name ||
                    target.actor.nameEn ||
                    target.profile?.nameEn ||
                    target.actor.id,
            }
            : null,
    };
}

export function resolveActionCheck(
    worldState,
    playerAction,
    {
        forced = false,
        randomInt = secureRandomInt,
        semanticCheck =
        undefined,
        spellCast = null,
    } = {},
) {
    const structuredSpell =
        getSpellDefinition(
            spellCast?.spellId ||
            parseSpellCastDirectives(
                playerAction,
            )[0]?.spellId,
        );
    const hasSemanticCheck =
        semanticCheck &&
        typeof semanticCheck ===
            'object' &&
        !Array.isArray(
            semanticCheck,
        );
    const semanticRule =
        hasSemanticCheck
            ? ACTION_CHECK_RULES.find(
                rule =>
                    rule.id ===
                    semanticCheck
                        .ruleId,
            )
            : null;
    const semanticTarget =
        hasSemanticCheck &&
        semanticCheck
            .targetActorId
            ? (
                worldState.actors ||
                []
            ).find(actor =>
                actor.id ===
                    semanticCheck
                        .targetActorId &&
                actor.present !==
                    false)
            : null;
    const semanticTargetProfile =
        semanticTarget
            ? (
                worldState
                    .actorLibrary ||
                []
            ).find(profile =>
                profile.id ===
                    semanticTarget.id)
            : null;
    let detected;
    if (structuredSpell) {
        detected =
            detectActionCheck(
                worldState,
                playerAction,
                {
                    forced: true,
                    spellCast: {
                        spellId:
                            structuredSpell.id,
                    },
                },
            );
    } else if (
        hasSemanticCheck
    ) {
        detected =
            semanticCheck
                .required ||
            forced
                ? {
                    ...(
                        semanticRule ||
                        {
                            id:
                                'forced_general',
                            label:
                                '主动判定',
                            labelEn:
                                'Player-requested check',
                            attribute:
                                'perception',
                            targetAttribute:
                                'agility',
                            skill:
                                'general',
                            opposed:
                                false,
                            dcAdjustment:
                                0,
                        }
                    ),
                    forced:
                        Boolean(
                            forced,
                        ),
                    target:
                        semanticTarget
                            ? {
                                actorId:
                                    semanticTarget.id,
                                name:
                                    semanticTarget.name ||
                                    semanticTargetProfile
                                        ?.name ||
                                    semanticTarget.nameEn ||
                                    semanticTargetProfile
                                        ?.nameEn ||
                                    semanticTarget.id,
                            }
                            : null,
                }
                : null;
    } else {
        detected =
            detectActionCheck(
                worldState,
                playerAction,
                {
                    forced,
                    spellCast,
                },
            );
    }
    if (!detected) {
        return null;
    }
    const character = worldState.character || {};
    const attributeModifier = getAttributeModifier(
        character,
        detected.attribute,
    );
    const skillModifier = getSkillModifier(
        character,
        detected.skill,
    );
    const proficiencyModifier =
        detected.spell
            ? getSpellProficiencyModifier(
                worldState,
                detected.spell.id,
            )
            : 0;
    const itemUsed = (worldState.items || []).find(item =>
        [item.id, item.label, item.labelEn]
            .filter(Boolean)
            .some(label =>
                normalizeCheckText(playerAction)
                    .includes(normalizeCheckText(label)),
            ),
    );
    const equipmentModifier = itemUsed ? 1 : 0;
    const hasAdvantage =
        CHECK_ADVANTAGE_PATTERN.test(playerAction);
    const statusText = normalizeCheckText(
        (worldState.status || [])
            .map(item => `${item.label} ${item.detail}`)
            .join(' '),
    );
    const hasDisadvantage =
        CHECK_DISADVANTAGE_PATTERN.test(
            `${playerAction} ${statusText}`,
        );
    const rollMode = hasAdvantage === hasDisadvantage
        ? 'normal'
        : hasAdvantage
            ? 'advantage'
            : 'disadvantage';
    const playerRoll = rollD20(rollMode, randomInt);
    const modifierTotal = attributeModifier +
        skillModifier +
        equipmentModifier +
        proficiencyModifier;
    const total = playerRoll.keptRoll + modifierTotal;
    const targetMatch =
        semanticTarget
            ? {
                actor:
                    semanticTarget,
                profile:
                    semanticTargetProfile,
            }
            : detected.target
                ? findCheckTargetActor(
                    worldState,
                    detected
                        .target.name,
                    detected,
                )
                : null;
    const useOpposed = Boolean(
        detected.opposed && targetMatch,
    );
    let targetTotal;
    let hidden;
    if (useOpposed) {
        const opponentRoll = rollD20('normal', randomInt);
        const opponentModifier = deriveNpcCheckModifier(
            targetMatch.actor,
            targetMatch.profile,
            detected.targetAttribute,
        );
        targetTotal =
            opponentRoll.keptRoll + opponentModifier;
        hidden = {
            mode: 'opposed',
            opponentRoll: opponentRoll.keptRoll,
            opponentModifier,
            opponentTotal: targetTotal,
        };
    } else {
        const baseDc = CHECK_DIFFICULTY_DC[
            worldState.campaign?.difficulty
        ] || CHECK_DIFFICULTY_DC.standard;
        targetTotal = Math.max(
            5,
            Math.min(25, baseDc + detected.dcAdjustment),
        );
        hidden = {
            mode: 'difficulty',
            difficultyClass: targetTotal,
        };
    }
    const outcome = getCheckOutcome(
        total,
        targetTotal,
        playerRoll.keptRoll,
    );
    return {
        id: globalThis.crypto?.randomUUID?.() ||
            `check-${Date.now()}-${playerRoll.rolls.join('-')}`,
        kind: detected.id,
        label: detected.label,
        labelEn: detected.labelEn,
        reasonEn: `Resolve the uncertain player action: ${String(playerAction).slice(0, 240)}`,
        forced: detected.forced,
        attribute: detected.attribute,
        attributeLabel:
            CHECK_ATTRIBUTE_LABELS[detected.attribute].label,
        attributeLabelEn:
            CHECK_ATTRIBUTE_LABELS[detected.attribute].labelEn,
        skill: detected.skill,
        rollMode,
        rolls: playerRoll.rolls,
        keptRoll: playerRoll.keptRoll,
        modifiers: {
            attribute: attributeModifier,
            skill: skillModifier,
            equipment: equipmentModifier,
            proficiency:
                proficiencyModifier,
            situation: 0,
            total: modifierTotal,
        },
        total,
        target: {
            mode: hidden.mode,
            actorId: detected.target?.actorId || null,
            name: detected.target?.name || null,
            visibleDifficulty: null,
        },
        outcome,
        outcomeLabel: CHECK_OUTCOME_LABELS[outcome].label,
        outcomeLabelEn: CHECK_OUTCOME_LABELS[outcome].labelEn,
        hidden,
        itemId: itemUsed?.id || null,
        ...(detected.spell
            ? {
                spell: {
                    spellId:
                        detected
                            .spell
                            .id,
                    incantation:
                        detected
                            .spell
                            .incantation,
                    name:
                        detected
                            .spell
                            .name,
                    nameEn:
                        detected
                            .spell
                            .nameEn,
                    known:
                        detected
                            .knownSpell,
                    proficiencyBefore:
                        getKnownSpell(
                            worldState,
                            detected
                                .spell
                                .id,
                        )
                            ?.proficiencyXp ||
                        0,
                },
            }
            : {}),
        resolvedAt: new Date().toISOString(),
    };
}

export function validateCheckResolution(check, worldState) {
    const errors = [];
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
        return { valid: false, errors: ['判定结果必须是对象。'] };
    }
    if (!CHECK_ATTRIBUTE_LABELS[check.attribute]) {
        errors.push('判定属性无效。');
    }
    if (!CHECK_OUTCOMES.includes(check.outcome)) {
        errors.push('判定结果等级无效。');
    }
    if (!Array.isArray(check.rolls) ||
        !check.rolls.length ||
        check.rolls.some(roll =>
            !Number.isInteger(roll) || roll < 1 || roll > 20)) {
        errors.push('D20 骰面无效。');
    }
    if (!Number.isInteger(check.keptRoll) ||
        !check.rolls?.includes(check.keptRoll)) {
        errors.push('保留骰面无效。');
    }
    const modifierTotal = Number(check.modifiers?.attribute || 0) +
        Number(check.modifiers?.skill || 0) +
        Number(check.modifiers?.equipment || 0) +
        Number(check.modifiers?.proficiency || 0) +
        Number(check.modifiers?.situation || 0);
    if (Number(check.modifiers?.total) !== modifierTotal ||
        Number(check.total) !==
            Number(check.keptRoll) + modifierTotal) {
        errors.push('判定总值与修正不一致。');
    }
    if (check.target?.actorId &&
        !(worldState.actors || []).some(actor =>
            actor.id === check.target.actorId)) {
        errors.push('判定对抗目标不存在。');
    }
    if (
        check.spell &&
        !getSpellDefinition(
            check.spell.spellId,
        )
    ) {
        errors.push(
            '施法判定引用了未知咒语。',
        );
    }
    if (!['difficulty', 'opposed'].includes(check.hidden?.mode)) {
        errors.push('判定目标模式无效。');
    } else {
        let targetTotal;
        if (check.hidden.mode === 'opposed') {
            const opponentRoll =
                Number(check.hidden.opponentRoll);
            const opponentModifier =
                Number(check.hidden.opponentModifier);
            targetTotal = opponentRoll + opponentModifier;
            if (!Number.isInteger(opponentRoll) ||
                opponentRoll < 1 ||
                opponentRoll > 20 ||
                Number(check.hidden.opponentTotal) !==
                    targetTotal) {
                errors.push('NPC 暗骰总值无效。');
            }
        } else {
            targetTotal =
                Number(check.hidden.difficultyClass);
            if (!Number.isInteger(targetTotal) ||
                targetTotal < 5 ||
                targetTotal > 25) {
                errors.push('隐藏难度无效。');
            }
        }
        if (Number.isFinite(targetTotal) &&
            CHECK_OUTCOMES.includes(check.outcome) &&
            getCheckOutcome(
                Number(check.total),
                targetTotal,
                Number(check.keptRoll),
            ) !== check.outcome) {
            errors.push('判定结果等级与骰值不一致。');
        }
    }
    return { valid: errors.length === 0, errors };
}

export function advanceWorldClock(clock, elapsedMinutes) {
    const match = WORLD_CLOCK_PATTERN.exec(String(clock || ''));
    if (!match) {
        throw new Error('世界时钟格式无效。');
    }
    const [, year, month, day, hour, minute] = match;
    const value = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
    ));
    value.setUTCMinutes(value.getUTCMinutes() + Number(elapsedMinutes || 0));
    const pad = number => String(number).padStart(2, '0');
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} · ` +
        `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
}

export const BEHAVIORAL_ENVIRONMENT_VERSION = 1;

const WEATHER_PATTERNS = Object.freeze([
    {
        condition: 'overcast',
        conditionEn: 'Low overcast',
        precipitationEn: 'None',
        windEn: 'Light breeze',
        visibilityEn: 'Good',
    },
    {
        condition: 'light_rain',
        conditionEn: 'Light rain',
        precipitationEn: 'Intermittent light rain',
        windEn: 'Light breeze',
        visibilityEn: 'Moderate',
    },
    {
        condition: 'mist',
        conditionEn: 'Highland mist',
        precipitationEn: 'Fine moisture',
        windEn: 'Calm',
        visibilityEn: 'Limited',
    },
    {
        condition: 'steady_rain',
        conditionEn: 'Steady rain',
        precipitationEn: 'Continuous rain',
        windEn: 'Moderate wind',
        visibilityEn: 'Reduced',
    },
    {
        condition: 'clear_spells',
        conditionEn: 'Broken cloud with clear spells',
        precipitationEn: 'None',
        windEn: 'Light breeze',
        visibilityEn: 'Good',
    },
    {
        condition: 'windy',
        conditionEn: 'Windy and overcast',
        precipitationEn: 'Occasional drizzle',
        windEn: 'Strong wind',
        visibilityEn: 'Good',
    },
]);

function stableEnvironmentHash(value) {
    let hash = 2166136261;
    for (
        const character of String(value || '')
    ) {
        hash ^= character
            .codePointAt(0);
        hash = Math.imul(
            hash,
            16777619,
        );
    }
    return hash >>> 0;
}

function getEnvironmentPeriod(hour) {
    if (hour < 5) {
        return 'deep_night';
    }
    if (hour < 7) {
        return 'dawn';
    }
    if (hour < 9) {
        return 'early_morning';
    }
    if (hour < 12) {
        return 'morning';
    }
    if (hour < 14) {
        return 'midday';
    }
    if (hour < 18) {
        return 'afternoon';
    }
    if (hour < 21) {
        return 'evening';
    }
    return 'late_night';
}

export function buildBehavioralEnvironment(
    worldState = {},
    clock = worldState.clock,
) {
    const match =
        WORLD_CLOCK_PATTERN.exec(
            String(clock || ''),
        );
    if (!match) {
        return {
            version:
                BEHAVIORAL_ENVIRONMENT_VERSION,
            clock: String(clock || ''),
            source:
                'deterministic_local_policy',
            period: 'unknown',
            daylight: 'unknown',
            exposure: 'unknown',
            curfewActive: false,
            sleepPressure: 'unknown',
            weather: null,
            behavioralConstraintsEn: [
                'Use only explicit scene evidence for time and weather behavior.',
            ],
        };
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const mapId = String(
        worldState.map
            ?.activeMapId ||
        worldState.scene?.mapId ||
        '',
    );
    const roomId = String(
        worldState.map
            ?.currentLocalNodeId ||
        worldState.scene?.roomId ||
        '',
    );
    const map =
        getLocalMapDefinition(
            mapId,
            worldState.map || {},
        );
    const room = map
        ? getMapRooms(
            map,
            worldState.map || {},
        ).find(item =>
            item.id === roomId)
        : null;
    const placeText = [
        roomId,
        room?.nameEn,
        room?.kind,
        ...(room?.tags || []),
    ]
        .filter(Boolean)
        .join(' ');
    const exposure =
        /(?:garden|grounds|courtyard|street|alley|shore|platform|exterior|forest|lake|path|road|village|yard|jetty|bridge|outdoor)/iu
            .test(placeText)
            ? 'outdoor'
            : 'indoor';
    const regionId =
        /(?:hogwarts|hogsmeade)/iu
            .test(mapId)
            ? 'scottish_highlands'
            : /(?:diagon|knockturn|kings_cross|ministry|st_mungo)/iu
                .test(mapId)
                ? 'london'
                : 'britain';
    const weatherSlot =
        Math.floor(hour / 6);
    const slotKey = [
        year,
        String(month)
            .padStart(2, '0'),
        String(day)
            .padStart(2, '0'),
        weatherSlot,
        regionId,
    ].join(':');
    const weather =
        WEATHER_PATTERNS[
            stableEnvironmentHash(
                slotKey,
            ) %
            WEATHER_PATTERNS.length
        ];
    const baseTemperatureByMonth = [
        4,
        5,
        7,
        10,
        13,
        16,
        18,
        18,
        14,
        10,
        7,
        5,
    ];
    const timeTemperatureOffset =
        hour < 6
            ? -3
            : hour < 10
                ? -1
                : hour < 18
                    ? 2
                    : 0;
    const temperatureC =
        baseTemperatureByMonth[
            month - 1
        ] +
        timeTemperatureOffset +
        (
            regionId ===
                'scottish_highlands'
                ? -2
                : 0
        );
    const sunriseByMonth = [
        8,
        7,
        6,
        5,
        4,
        4,
        4,
        5,
        6,
        7,
        8,
        8,
    ];
    const sunsetByMonth = [
        16,
        17,
        18,
        20,
        21,
        22,
        22,
        21,
        19,
        18,
        16,
        16,
    ];
    const daylight =
        hour >=
            sunriseByMonth[
                month - 1
            ] &&
        hour <
            sunsetByMonth[
                month - 1
            ]
            ? 'daylight'
            : 'dark';
    const period =
        getEnvironmentPeriod(hour);
    const atHogwarts =
        /hogwarts/iu.test(
            mapId,
        );
    const curfewActive =
        atHogwarts &&
        (
            hour >= 21 ||
            hour < 6
        );
    const sleepPressure =
        hour < 5
            ? 'high'
            : hour < 7 ||
                hour >= 22
                ? 'moderate'
                : 'low';
    const constraints = [
        `Treat ${String(clock)} as ${period.replaceAll('_', ' ')} with ${daylight}; it is a behavioral condition, not a decorative label.`,
    ];
    if (sleepPressure === 'high') {
        constraints.push(
            'Most school-age characters should be asleep, preparing to sleep, or showing a concrete reason for remaining active.',
        );
    } else if (
        sleepPressure ===
            'moderate'
    ) {
        constraints.push(
            'School-age characters should show plausible tiredness, bedtime preparation, or an existing reason to stay active.',
        );
    }
    if (curfewActive) {
        constraints.push(
            'Hogwarts student curfew is active; corridor movement should be limited, quiet, supervised, or carry an observable risk of intervention.',
        );
    }
    constraints.push(
        exposure === 'outdoor'
            ? `People are exposed to ${weather.conditionEn.toLocaleLowerCase()}, ${weather.windEn.toLocaleLowerCase()}, and about ${temperatureC}°C; reflect this through clothing, shelter, pace, visibility, or physical comfort when relevant.`
            : `The ${weather.conditionEn.toLocaleLowerCase()} weather and about ${temperatureC}°C remain outside; reflect them only through windows, sound, draughts, wet arrivals, heating, clothing, or plans when relevant.`,
    );
    constraints.push(
        'Current scene, location, and environment override a daily directive whose activity or location has already passed.',
        'Embody only materially relevant effects; do not recite the environment as a checklist.',
    );
    return {
        version:
            BEHAVIORAL_ENVIRONMENT_VERSION,
        source:
            'deterministic_local_policy',
        clock: String(clock),
        slotKey,
        regionId,
        period,
        localTime: {
            year,
            month,
            day,
            hour,
            minute,
        },
        daylight,
        exposure,
        curfewActive,
        sleepPressure,
        weather: {
            ...weather,
            temperatureC,
        },
        behavioralConstraintsEn:
            constraints,
    };
}

function worldClockToEpochMinutes(clock) {
    const match = WORLD_CLOCK_PATTERN.exec(
        String(clock || ''),
    );
    if (!match) return null;
    return Math.floor(
        Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
        ) / 60000,
    );
}

export const TEMPORAL_STATE_VERSION = 1;
export const WORLD_CHANGE_MIN_DAYS = 7;
export const GOSSIP_CHANNEL_VALUES =
    Object.freeze([
        'classmates',
        'family',
        'house',
        'staff',
        'local',
        'public',
    ]);
export const WORLD_NEWS_CATEGORY_VALUES =
    Object.freeze([
        'ministry',
        'britain',
        'hogwarts',
        'local',
        'international',
    ]);

export function getWorldClockGapMinutes(
    fromClock,
    toClock,
) {
    const fromMinutes =
        worldClockToEpochMinutes(fromClock);
    const toMinutes =
        worldClockToEpochMinutes(toClock);
    return fromMinutes === null ||
        toMinutes === null
        ? null
        : toMinutes - fromMinutes;
}

export function reconcileTemporalState(
    worldState,
    sceneOpeningText = '',
) {
    let next = structuredClone(worldState);
    const scene = next.scene;
    const openingText = String(
        sceneOpeningText || '',
    );
    if (
        !scene ||
        !openingText.trim() ||
        Number(
            scene.temporalGroundingVersion ||
            0,
        ) >= TEMPORAL_STATE_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
            clockRepair: null,
        };
    }

    const normalizedOpening =
        openingText.toLocaleLowerCase();
    const mapId =
        next.map?.activeMapId ||
        scene.mapId;
    const isLegacySchoolDeparture =
        mapId === 'kings_cross' &&
        /(?:first of september|1(?:st)? september|september (?:the )?first|september 1(?:st)?)/i
            .test(normalizedOpening) &&
        /(?:hogwarts express|platform(?: nine| 9)|barrier)/i
            .test(normalizedOpening);
    const clockMatch = WORLD_CLOCK_PATTERN.exec(
        String(next.clock || ''),
    );
    let clockRepair = null;

    if (isLegacySchoolDeparture && clockMatch) {
        const year = Number(clockMatch[1]);
        const oldStart =
            scene.startedClock ||
            next.clock;
        const oldStartMinutes =
            worldClockToEpochMinutes(oldStart);
        const targetStart =
            `${year}-09-01 · 10:30`;
        const targetStartMinutes =
            worldClockToEpochMinutes(
                targetStart,
            );
        if (
            oldStartMinutes !== null &&
            targetStartMinutes !== null &&
            targetStartMinutes >
                oldStartMinutes &&
            getWorldDate(next.clock) !==
                `${year}-09-01`
        ) {
            const deltaMinutes =
                targetStartMinutes -
                oldStartMinutes;
            const shiftClock = value =>
                WORLD_CLOCK_PATTERN.test(
                    String(value || ''),
                )
                    ? advanceWorldClock(
                        value,
                        deltaMinutes,
                    )
                    : value;
            const shiftSceneState = state => {
                const shifted =
                    structuredClone(state);
                const currentSceneClocks =
                    new Set(
                        [
                            shifted.scene
                                ?.startedClock,
                            ...(
                                shifted.scene
                                    ?.timelineEntries ||
                                []
                            ).map(entry =>
                                entry.clock),
                        ].filter(Boolean),
                    );
                shifted.clock =
                    shiftClock(shifted.clock);
                if (shifted.scene) {
                    shifted.scene.startedClock =
                        shiftClock(
                            shifted.scene
                                .startedClock,
                        );
                    shifted.scene.timelineEntries =
                        (
                            shifted.scene
                                .timelineEntries ||
                            []
                        ).map(entry => ({
                            ...entry,
                            clock:
                                shiftClock(
                                    entry.clock,
                                ),
                        }));
                }
                shifted.timeline = (
                    shifted.timeline || []
                ).map(entry =>
                    currentSceneClocks.has(
                        entry.clock,
                    )
                        ? {
                            ...entry,
                            clock:
                                shiftClock(
                                    entry.clock,
                                ),
                        }
                        : entry);
                shifted.items = (
                    shifted.items || []
                ).map(item =>
                    currentSceneClocks.has(
                        item.updatedClock,
                    )
                        ? {
                            ...item,
                            updatedClock:
                                shiftClock(
                                    item
                                        .updatedClock,
                                ),
                        }
                        : item);
                return shifted;
            };
            next = shiftSceneState(next);
            if (next.turnRetry?.baseState) {
                next.turnRetry = {
                    ...next.turnRetry,
                    baseState:
                        shiftSceneState(
                            next.turnRetry
                                .baseState,
                        ),
                };
                next.turnRetry.baseClock =
                    next.turnRetry
                        .baseState.clock;
            }
            clockRepair = {
                fromClock:
                    worldState.clock,
                toClock: next.clock,
                fromSceneStartedClock:
                    oldStart,
                toSceneStartedClock:
                    next.scene
                        ?.startedClock,
                source:
                    'legacy_kings_cross_anchor',
            };
        }
    }

    next.scene.temporalFactsEn =
        [...new Set([
            ...(
                next.scene
                    .temporalFactsEn || []
            ),
            ...(isLegacySchoolDeparture
                ? [
                    `The current date is 1 September ${clockMatch?.[1] || ''}.`,
                    'The train departs at eleven.',
                ]
                : []),
        ])];
    next.scene.temporalFacts =
        [...new Set([
            ...(
                next.scene
                    .temporalFacts || []
            ),
            ...(isLegacySchoolDeparture
                ? [
                    `${clockMatch?.[1] || ''} 年 9 月 1 日。`,
                    '火车十一点出发。',
                ]
                : []),
        ])];
    next.scene.temporalGroundingVersion =
        TEMPORAL_STATE_VERSION;
    return {
        state: next,
        changed: true,
        clockRepair,
    };
}

export function getWorldDate(clock) {
    const match = WORLD_CLOCK_PATTERN.exec(String(clock || ''));
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

export function isDailyDirectorPlanCurrent(clock, dailyDirector) {
    const date = getWorldDate(clock);
    return Boolean(
        date &&
        dailyDirector?.date === date &&
        dailyDirector?.status === 'ready' &&
        dailyDirector?.plan,
    );
}

function getActorIdSet(actorIds = []) {
    return new Set(actorIds.filter(Boolean));
}

function getCoreCastOverlap(leftIds, rightIds) {
    const left = getActorIdSet(leftIds);
    const right = getActorIdSet(rightIds);
    const smallerSize = Math.min(left.size, right.size);
    if (smallerSize < 2) {
        return { sharedCount: 0, ratio: 0 };
    }
    const sharedCount = [...left]
        .filter(actorId => right.has(actorId))
        .length;
    return {
        sharedCount,
        ratio: sharedCount / smallerSize,
    };
}

const EXPLICIT_NEW_ACTOR_PATTERN =
    /(?:随机|随便|任意).{0,8}(?:人|酒客|顾客|店员|老板)|(?:问|找|寻找|叫住|搭话|认识|结识|见见|看看|介绍).{0,12}(?:陌生人|酒客|顾客|店员|老板|别人|其他人|其他学生|同学|新朋友|新人|谁)|(?:谁|有没有人).{0,10}(?:在|坐在|待在).{0,10}(?:车厢|隔间|房间|走廊)|(?:random|any|some).{0,12}(?:person|patron|customer|student)|(?:ask|approach|talk to|meet|find|look for|see who).{0,16}(?:stranger|patron|shopkeeper|barman|other student|new people|someone)/i;

const MIN_AUTOMATIC_PACING_REASSESS_TURNS = 6;
const SATURATED_SCENE_PEER_COUNT = 3;
export const CAUSAL_COLLAPSE_VERSION = 1;
export const CAUSAL_COLLAPSE_MIN_CHECK_TURNS = 6;
export const CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE = 1;
const CAUSAL_COLLAPSE_KINDS = new Set([
    'social_edge',
    'offscreen_event',
    'institutional_fact',
    'material_history',
    'obligation',
    'rumor_route',
]);
const CAUSAL_COLLAPSE_PERSISTENCE_TARGETS =
    new Set([
        'event',
        'social_graph',
        'room_state',
        'item',
        'rumor',
        'obligation',
    ]);
const CAUSAL_COLLAPSE_KEYS =
    new Set([
        'kind',
        'focusActorId',
        'relatedActorIds',
        'itemId',
        'mapId',
        'roomId',
        'effectiveMinutesBeforeObservation',
        'factEn',
        'edgeType',
        'visibleResiduesEn',
        'aftermathEn',
        'witnessAccounts',
        'sourceEventIds',
        'persistenceTargets',
        'surfaceMode',
        'consequenceMode',
        'irreversible',
        'requiresHighTier',
    ]);
const CAUSAL_SOCIAL_STRUCTURAL_TAG_BY_EDGE_TYPE =
    Object.freeze({
        roommate: 'roommate',
        classmate: 'classmate',
        rival: 'rivalry',
        neighbor: 'neighbor',
        witness: 'witness',
        creditor: 'creditor',
        debtor: 'debtor',
    });
const CAUSAL_WITNESS_ACCOUNT_KEYS =
    new Set([
        'actorId',
        'accountEn',
    ]);

export function normalizeCausalCollapseState(
    value = {},
) {
    return {
        version:
            CAUSAL_COLLAPSE_VERSION,
        minimumCheckIntervalTurns:
            CAUSAL_COLLAPSE_MIN_CHECK_TURNS,
        maximumBindingsPerScene:
            CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE,
        lastCheckedTurn:
            Number.isInteger(
                value.lastCheckedTurn,
            )
                ? Math.max(
                    0,
                    value.lastCheckedTurn,
                )
                : null,
        lastBoundTurn:
            Number.isInteger(
                value.lastBoundTurn,
            )
                ? Math.max(
                    0,
                    value.lastBoundTurn,
                )
                : null,
        checkedSlots:
            Array.isArray(
                value.checkedSlots,
            )
                ? value.checkedSlots
                    .filter(entry =>
                        entry?.key &&
                        Number.isInteger(
                            entry.checkedTurn,
                        ))
                    .slice(-100)
                : [],
        records:
            Array.isArray(
                value.records,
            )
                ? value.records
                    .filter(record =>
                        record?.id &&
                        CAUSAL_COLLAPSE_KINDS
                            .has(record.kind) &&
                        record.factEn)
                    .slice(-100)
                : [],
    };
}

function playerActionMentionsItem(
    item,
    playerAction,
) {
    const action = String(
        playerAction || '',
    ).normalize('NFKC');
    const labels = [
        item.id,
        item.labelEn,
        item.label,
    ]
        .map(value =>
            String(value || '')
                .trim()
                .normalize('NFKC'))
        .filter(value =>
            value.length >= 2);
    return labels.some(label => {
        if (
            /[\p{Script=Han}]/u
                .test(label)
        ) {
            return action.includes(label);
        }
        const escaped =
            label.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );
        return new RegExp(
            `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
            'iu',
        ).test(action);
    });
}

export function detectCausalCollapseOpportunity(
    worldState = {},
    playerAction = '',
) {
    const state =
        normalizeCausalCollapseState(
            worldState
                .causalCollapse,
        );
    const sceneId =
        String(
            worldState.scene?.id ||
            '',
        );
    const checkedKeys =
        new Set(
            state.checkedSlots
                .map(entry =>
                    entry.key),
        );
    const boundInScene =
        state.records.filter(record =>
            record.sceneId ===
                sceneId)
            .length;
    if (
        !sceneId ||
        boundInScene >=
            state
                .maximumBindingsPerScene
    ) {
        return null;
    }
    const addressing =
        resolvePlayerAddressing(
            worldState,
            playerAction,
        );
    const directBlocks =
        addressing.valid
            ? (
                addressing.blocks ||
                []
            ).filter(block =>
                block.mode ===
                    'direct' &&
                block.targetActorId)
            : [];
    const directSpeechLength =
        directBlocks.reduce(
            (total, block) =>
                total +
                String(
                    block.speechText ||
                    '',
                ).trim().length,
            0,
        );
    if (directSpeechLength >= 12) {
        const profiles = new Map(
            (
                worldState
                    .actorLibrary ||
                []
            ).map(profile => [
                profile.id,
                profile,
            ]),
        );
        for (
            const actorId of [
                ...new Set(
                    directBlocks.map(
                        block =>
                            block
                                .targetActorId,
                    ),
                ),
            ]
        ) {
            const profile =
                profiles.get(actorId) ||
                {};
            const milestone =
                (
                    profile
                        .relationshipTags ||
                    []
                ).find(tag =>
                    [
                        'friend',
                        'rival',
                        'romantic_interest',
                        'enemy',
                    ].includes(tag));
            const milestoneKey =
                milestone
                    ? `actor:${actorId}:relationship:${milestone}`
                    : '';
            const firstDeepKey =
                `actor:${actorId}:first_deep`;
            const key =
                milestoneKey &&
                !checkedKeys.has(
                    milestoneKey,
                )
                    ? milestoneKey
                    : !checkedKeys.has(
                        firstDeepKey,
                    )
                        ? firstDeepKey
                        : '';
            if (key) {
                return {
                    key,
                    type:
                        milestoneKey ===
                            key
                            ? 'relationship_upgrade'
                            : 'first_deep_conversation',
                    focusActorId:
                        actorId,
                    mapId:
                        worldState.map
                            ?.activeMapId ||
                        '',
                    roomId:
                        worldState.map
                            ?.currentLocalNodeId ||
                        '',
                    itemId: '',
                };
            }
        }
    }
    if (
        parseExplicitMovementDirective(
            playerAction,
        )
    ) {
        const mapId = String(
            worldState.map
                ?.activeMapId ||
            '',
        );
        const roomId = String(
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
        const key =
            `location:${mapId}:${roomId}:first_observation`;
        if (
            mapId &&
            roomId &&
            !checkedKeys.has(key)
        ) {
            return {
                key,
                type:
                    'first_location_observation',
                focusActorId: '',
                mapId,
                roomId,
                itemId: '',
            };
        }
    }
    if (
        /(?:检查|查看|观察|研究|翻看|inspect|examine|study|look at)/iu
            .test(
                String(
                    playerAction || '',
                ),
            )
    ) {
        const item = (
            worldState.items || []
        ).find(candidate =>
            [
                'key',
                'important',
            ].includes(
                candidate.importance,
            ) &&
            playerActionMentionsItem(
                candidate,
                playerAction,
            ));
        if (item) {
            const key =
                `item:${item.id}:first_inspection`;
            if (!checkedKeys.has(key)) {
                return {
                    key,
                    type:
                        'first_item_inspection',
                    focusActorId: '',
                    mapId:
                        worldState.map
                            ?.activeMapId ||
                        '',
                    roomId:
                        worldState.map
                            ?.currentLocalNodeId ||
                        '',
                    itemId:
                        item.id,
                };
            }
        }
    }
    return null;
}

export function analyzePacingSignals(
    worldState = {},
    playerAction = '',
) {
    const scene = worldState.scene || {};
    const pacing = worldState.pacingDirector || {};
    const totalTurns = Math.max(0, Number(worldState.turn?.count || 0));
    const sceneTurnCount = Math.max(
        0,
        Number(scene.timelineEntries?.length || 0) - 1,
    );
    const currentActorIds = (worldState.actors || [])
        .filter(actor => actor.present !== false)
        .map(actor => actor.id);
    let repeatedCastSceneCount = currentActorIds.length ? 1 : 0;
    for (const archived of [...(worldState.sceneArchive || [])].reverse()) {
        const overlap = getCoreCastOverlap(
            currentActorIds,
            archived.actorIds || [],
        );
        if (overlap.sharedCount < 2 || overlap.ratio < 0.75) {
            break;
        }
        repeatedCastSceneCount += 1;
    }

    const lastAssessedTurn = Number.isInteger(pacing.lastAssessedTurn)
        ? pacing.lastAssessedTurn
        : null;
    const turnsSinceAssessment = lastAssessedTurn === null
        ? Number.POSITIVE_INFINITY
        : Math.max(0, totalTurns - lastAssessedTurn);
    const reassessAfterTurns = Math.min(
        6,
        Math.max(2, Number(pacing.reassessAfterTurns || 3)),
    );
    const automaticReassessAfterTurns =
        Math.max(
            MIN_AUTOMATIC_PACING_REASSESS_TURNS,
            reassessAfterTurns,
        );
    const pendingBeat = pacing.pendingBeat?.status === 'pending';
    const assessmentRunning = pacing.status === 'assessing';
    const assessedCurrentScene =
        pacing.lastAssessedSceneId === scene.id;
    const automaticCooldownReady =
        turnsSinceAssessment >=
            automaticReassessAfterTurns;
    const causalCollapseOpportunity =
        detectCausalCollapseOpportunity(
            worldState,
            playerAction,
        );
    const castPolicy =
        buildStoryCastPolicy(
            worldState,
        );
    const reasons = [];
    const explicitNewActorRequest =
        EXPLICIT_NEW_ACTOR_PATTERN.test(
            String(playerAction || ''),
        );
    const knownActorIds =
        new Set([
            ...(
                worldState
                    .actorLibrary ||
                []
            ).map(actor =>
                actor.id),
            ...(
                worldState.actors ||
                []
            ).map(actor =>
                actor.id),
        ]);
    const explicitCanonActorIds =
        findMentionedCanonCharacters(
            playerAction,
        )
            .map(actor =>
                actor.id)
            .filter(actorId =>
                !knownActorIds.has(
                    actorId,
                ));
    const explicitCanonActorRequest =
        explicitCanonActorIds.length > 0;
    const currentPeerActorCount =
        castPolicy
            .relativeAgeProfiles
            .filter(actor =>
                currentActorIds.includes(
                    actor.id,
                ) &&
                [
                    'same_age',
                    'younger_peer',
                    'older_peer',
                ].includes(
                    actor.relativeAgeBand,
                ))
            .length;
    const currentPeerRosterSaturated =
        currentPeerActorCount >=
            SATURATED_SCENE_PEER_COUNT;
    if (explicitNewActorRequest) {
        reasons.push('explicit_new_actor_request');
    }
    if (explicitCanonActorRequest) {
        reasons.push(
            'explicit_canon_actor_request',
        );
    }
    if (
        causalCollapseOpportunity &&
        automaticCooldownReady
    ) {
        reasons.push(
            'causal_collapse_opportunity',
        );
    }
    if (
        castPolicy.urgentPeerDeficit > 0 &&
        !currentPeerRosterSaturated &&
        sceneTurnCount >= 1 &&
        automaticCooldownReady
    ) {
        reasons.push(
            'relationship_roster_gap',
        );
    }
    if (repeatedCastSceneCount >= 2 &&
        sceneTurnCount >= 1 &&
        !assessedCurrentScene) {
        reasons.push('repeated_core_cast');
    }
    if (
        sceneTurnCount >= 3 &&
        automaticCooldownReady
    ) {
        reasons.push('long_scene');
    }
    if (
        sceneTurnCount >= 8 &&
        turnsSinceAssessment >= 10
    ) {
        reasons.push('periodic_reassessment');
    }
    return {
        shouldAssess: Boolean(
            worldState.phase === 'playing' &&
            scene.id &&
            (
                !pendingBeat ||
                explicitCanonActorRequest
            ) &&
            !assessmentRunning &&
            reasons.length,
        ),
        reasons,
        metrics: {
            totalTurns,
            sceneTurnCount,
            repeatedCastSceneCount,
            currentActorIds,
            turnsSinceAssessment: Number.isFinite(turnsSinceAssessment)
                ? turnsSinceAssessment
                : null,
            reassessAfterTurns,
            automaticReassessAfterTurns,
            explicitNewActorRequest,
            explicitCanonActorRequest,
            explicitCanonActorIds,
            causalCollapseOpportunity,
            causalCollapseCooldownReady:
                automaticCooldownReady,
            currentPeerActorCount,
            currentPeerRosterSaturated,
            socialStage:
                castPolicy.socialStage,
            meaningfulKnownActorCount:
                castPolicy
                    .meaningfulKnownActorCount,
            socialStagePolicy:
                castPolicy
                    .socialStagePolicy,
            urgentPeerDeficit:
                castPolicy
                    .urgentPeerDeficit,
            stagedPeerTarget:
                castPolicy
                    .stagedPeerTarget,
            repeatedAuthorityIds:
                castPolicy
                    .repeatedAuthorityIds,
            forcePeerIntroduction:
                castPolicy
                    .urgentPeerDeficit > 0 &&
                castPolicy
                    .repeatedAuthorityIds
                    .length > 0,
        },
    };
}

const PACING_INTERVENTION_KINDS = new Set([
    'new_actor',
    'causal_collision',
    'environmental_hook',
    'minor_mishap',
    'urgent_disruption',
    'revelation',
    'existing_actor_action',
    'complication',
    'main_arc',
    'mixed',
]);

const PACING_GUEST_ACTOR_KEYS = new Set([
    'id',
    'nameEn',
    'roleEn',
    'relationshipToPlayerEn',
    'publicDescriptionEn',
    'publicBackgroundEn',
    'personalityEn',
    'speechStyleEn',
    'currentActivityEn',
    'birthDate',
    'settingTags',
]);

const PACING_TEMPORARY_ACTOR_KEYS =
    new Set([
        'id',
        'nameEn',
        'roleEn',
        'publicDescriptionEn',
        'personalityEn',
        'speechStyleEn',
        'currentActivityEn',
    ]);

const LOCALIZED_TEMPORARY_ACTOR_KEYS =
    new Set([
        'name',
        'role',
        'publicDescription',
        'personality',
        'speechStyle',
        'currentActivity',
    ]);

export function buildTemporaryActorPromotionPolicy(
    worldState = {},
) {
    return {
        mode:
            'promote_selected_anonymous_interaction',
        promoteWhen:
            'The player selects one specific unnamed person and starts a continuing interaction by addressing, touching, displacing, sitting beside, following, blocking, giving to, taking from, or otherwise directly affecting that person.',
        keepAnonymousWhen:
            'The person is only glimpsed, described as crowd texture, or receives no individual continuing interaction from the player.',
        maximumEntrances: 2,
        reservedActorIds: [
            ...new Set([
                ...(
                    worldState
                        .actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
                ...(
                    worldState.actors ||
                    []
                ).map(actor =>
                    actor.id),
            ]),
        ].filter(Boolean),
        requiredFields: [
            ...PACING_TEMPORARY_ACTOR_KEYS,
        ],
    };
}

export function normalizePacingAssessmentPayload(
    payload,
    worldState = {},
    canonCandidates = [],
) {
    const normalized =
        structuredClone(payload);
    if (
        normalized?.decision ===
            'hold' &&
        normalized.intervention ===
            undefined
    ) {
        normalized.intervention = null;
    }
    const intervention =
        normalized?.intervention;
    if (intervention) {
        intervention.actorEntrances =
            Array.isArray(
                intervention.actorEntrances,
            )
                ? intervention.actorEntrances
                : [];
        intervention.temporaryActors =
            Array.isArray(
                intervention.temporaryActors,
            )
                ? intervention.temporaryActors
                : [];
        intervention.guestActor ??= null;
        intervention.identityMergeFromId ??=
            '';
        intervention.identityEvidenceEn ??=
            '';
        intervention.identityRevealed ??=
            false;
        intervention.causalCollapse ??=
            null;
        if (
            intervention
                .causalCollapse
        ) {
            const collapse =
                intervention
                    .causalCollapse;
            collapse.relatedActorIds =
                Array.isArray(
                    collapse
                        .relatedActorIds,
                )
                    ? collapse
                        .relatedActorIds
                    : [];
            collapse.visibleResiduesEn =
                Array.isArray(
                    collapse
                        .visibleResiduesEn,
                )
                    ? collapse
                        .visibleResiduesEn
                    : [];
            collapse.witnessAccounts =
                Array.isArray(
                    collapse
                        .witnessAccounts,
                )
                    ? collapse
                        .witnessAccounts
                    : [];
            collapse.sourceEventIds =
                Array.isArray(
                    collapse
                        .sourceEventIds,
                )
                    ? collapse
                        .sourceEventIds
                    : [];
            collapse.persistenceTargets =
                Array.isArray(
                    collapse
                        .persistenceTargets,
                )
                    ? collapse
                        .persistenceTargets
                    : [];
            collapse.focusActorId ??=
                '';
            collapse.itemId ??= '';
            collapse.edgeType ??= '';
        }
    }
    if (
        !intervention ||
        intervention.guestActor ||
        !intervention.actorEntrances
    ) {
        return normalized;
    }
    const libraryIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const metActorIds = new Set(
        buildStoryCastPolicy(
            worldState,
        ).metActorIds,
    );
    const entranceMetStates =
        intervention.actorEntrances
            .map(entry =>
                metActorIds.has(
                    entry.id,
                ));
    if (
        intervention.kind ===
            'new_actor' &&
        !intervention.guestActor &&
        entranceMetStates.length
    ) {
        if (
            entranceMetStates
                .every(Boolean)
        ) {
            intervention.kind =
                'existing_actor_action';
        } else if (
            entranceMetStates
                .some(Boolean)
        ) {
            intervention.kind =
                'mixed';
        }
    }
    const suppliedCanon = new Map(
        (canonCandidates || [])
            .map(candidate => [
                candidate.id,
                candidate,
            ]),
    );
    const entranceIndex =
        intervention.actorEntrances
            .findIndex(entry =>
                !libraryIds.has(entry.id) &&
                suppliedCanon.has(entry.id));
    if (entranceIndex < 0) {
        return normalized;
    }
    const entrance =
        intervention.actorEntrances[
            entranceIndex
        ];
    const candidate =
        suppliedCanon.get(entrance.id);
    const canonIdentity =
        findCanonCharacter(
            candidate.id ||
            candidate.nameEn,
        );
    if (!canonIdentity) {
        return normalized;
    }
    const canonProfile =
        getCanonSettingProfile(
            canonIdentity,
        );
    const settingTags =
        canonProfile?.settingTags ||
        candidate.settingTags ||
        [
            'steady',
            'social',
        ];
    intervention.actorEntrances =
        intervention.actorEntrances
            .filter((_, index) =>
                index !== entranceIndex);
    intervention.guestActor = {
        id: canonIdentity.id,
        nameEn:
            canonIdentity.nameEn,
        roleEn:
            candidate.roleEn ||
            canonIdentity.roleEn ||
            'Hogwarts student',
        relationshipToPlayerEn:
            'newly met stranger',
        publicDescriptionEn:
            `${canonIdentity.nameEn} is a student of roughly the player's age with an otherwise unrecorded physical appearance.`,
        publicBackgroundEn:
            'A Hogwarts-bound student from the established Canon cohort.',
        personalityEn:
            settingTags.join(', '),
        speechStyleEn:
            'Age-appropriate speech consistent with established Canon characterization.',
        currentActivityEn:
            entrance
                .currentActivityEn,
        birthDate: '',
        settingTags: [
            ...settingTags,
        ],
    };
    intervention.kind =
        intervention.actorEntrances.length
            ? 'mixed'
            : 'new_actor';
    return normalized;
}

export function validatePacingAssessment(
    payload,
    worldState = {},
    signals = {},
) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, errors: ['节奏评估必须是对象。'] };
    }
    if (!['hold', 'intervene'].includes(payload.decision)) {
        errors.push('节奏评估 decision 必须是 hold 或 intervene。');
    }
    if (!String(payload.diagnosisEn || '').trim()) {
        errors.push('节奏评估缺少 diagnosisEn。');
    }
    const reassessAfterTurns = Number(payload.reassessAfterTurns);
    if (!Number.isInteger(reassessAfterTurns) ||
        reassessAfterTurns < 2 ||
        reassessAfterTurns > 6) {
        errors.push('reassessAfterTurns 必须是 2–6 的整数。');
    }
    if (payload.decision === 'hold') {
        if (payload.intervention !== null) {
            errors.push('hold 决策的 intervention 必须是 null。');
        }
        if (
            signals.reasons
                ?.includes(
                    'causal_collapse_opportunity',
                )
        ) {
            errors.push(
                '因果坍塌机会已触发；找不到兼容事实时必须降级为普通意外，不能 hold。',
            );
        }
        if (
            signals.metrics
                ?.forcePeerIntroduction
        ) {
            errors.push(
                '当前同龄关系缺口与权威人物重复出场同时成立，不能继续 hold。',
            );
        }
        if (
            signals.reasons
                ?.includes(
                    'explicit_canon_actor_request',
                )
        ) {
            errors.push(
                '玩家已明确选择一名未入库 Canon 人物，不能继续 hold。',
            );
        }
        return { valid: errors.length === 0, errors };
    }

    const intervention = payload.intervention;
    if (!intervention ||
        typeof intervention !== 'object' ||
        Array.isArray(intervention)) {
        return {
            valid: false,
            errors: [...errors, 'intervene 决策必须包含 intervention。'],
        };
    }
    if (!PACING_INTERVENTION_KINDS.has(intervention.kind)) {
        errors.push('节奏介入 kind 无效。');
    }
    if (intervention.timing !== 'this_turn') {
        errors.push('节奏介入 timing 必须是 this_turn。');
    }
    for (const key of ['beatEn', 'pressureEn']) {
        if (!String(intervention[key] || '').trim()) {
            errors.push(`节奏介入缺少 ${key}。`);
        }
    }
    const activeArcIds = new Set(
        (worldState.storyArcs || [])
            .filter(arc => arc.status === 'active')
            .map(arc => arc.id),
    );
    if (intervention.arcId &&
        !activeArcIds.has(intervention.arcId)) {
        errors.push(`节奏介入引用了非活动主线 ${intervention.arcId}。`);
    }

    const libraryIds = new Set(
        (worldState.actorLibrary || []).map(actor => actor.id),
    );
    const presentIds = new Set(
        (worldState.actors || [])
            .filter(actor => actor.present !== false)
            .map(actor => actor.id),
    );
    const actorEntrances = Array.isArray(intervention.actorEntrances)
        ? intervention.actorEntrances
        : [];
    const entranceIds = new Set();
    if (actorEntrances.length > 2) {
        errors.push('一次节奏介入最多引入两名已有角色。');
    }
    actorEntrances.forEach(entry => {
        if (!libraryIds.has(entry.id) ||
            presentIds.has(entry.id) ||
            entranceIds.has(entry.id)) {
            errors.push(`入场角色 ${entry.id || '?'} 不存在、重复或已经在场。`);
        }
        if (!String(entry.currentActivityEn || '').trim()) {
            errors.push(`入场角色 ${entry.id || '?'} 缺少公开活动。`);
        }
        entranceIds.add(entry.id);
    });

    const temporaryActors =
        Array.isArray(
            intervention.temporaryActors,
        )
            ? intervention.temporaryActors
            : [];
    const runtimeActors = new Map(
        (worldState.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    const causalOpportunity =
        signals.reasons
            ?.includes(
                'causal_collapse_opportunity',
            )
            ? signals.metrics
                ?.causalCollapseOpportunity ||
                null
            : null;
    const causalCollapse =
        intervention.causalCollapse;
    if (causalCollapse) {
        if (!causalOpportunity) {
            errors.push(
                '没有因果坍塌触发槽位时不得提交 causalCollapse。',
            );
        }
        if (
            intervention.kind !==
                'causal_collision'
        ) {
            errors.push(
                '因果坍塌介入 kind 必须是 causal_collision。',
            );
        }
        const unauthorized =
            Object.keys(
                causalCollapse,
            ).filter(key =>
                !CAUSAL_COLLAPSE_KEYS
                    .has(key));
        if (unauthorized.length) {
            errors.push(
                `causalCollapse 不得写入字段：${unauthorized.join(', ')}。`,
            );
        }
        if (
            !CAUSAL_COLLAPSE_KINDS
                .has(
                    causalCollapse.kind,
                )
        ) {
            errors.push(
                'causalCollapse.kind 无效。',
            );
        }
        const effectiveMinutes =
            Number(
                causalCollapse
                    .effectiveMinutesBeforeObservation,
            );
        if (
            !Number.isInteger(
                effectiveMinutes,
            ) ||
            effectiveMinutes < 1 ||
            effectiveMinutes > 10080
        ) {
            errors.push(
                '因果事实必须发生在观测前 1 分钟至 7 天内。',
            );
        }
        if (
            !String(
                causalCollapse
                    .factEn ||
                '',
            ).trim() ||
            countTextWords(
                causalCollapse
                    .factEn,
            ) > 80
        ) {
            errors.push(
                '因果事实必须是 1–80 词的具体英文事实。',
            );
        }
        if (
            causalCollapse
                .surfaceMode !==
                'aftermath'
        ) {
            errors.push(
                'MVP 因果坍塌只能以 aftermath 方式显影。',
            );
        }
        if (
            causalCollapse
                .consequenceMode !==
                'mixed'
        ) {
            errors.push(
                '因果坍塌后果必须保持麻烦与机会混合。',
            );
        }
        if (
            causalCollapse
                .irreversible !==
                false ||
            causalCollapse
                .requiresHighTier !==
                false
        ) {
            errors.push(
                '中档因果坍塌不得提交不可逆或高档权限事实。',
            );
        }
        const residues =
            causalCollapse
                .visibleResiduesEn;
        if (
            !Array.isArray(residues) ||
            residues.length < 1 ||
            residues.length > 3 ||
            residues.some(residue =>
                !String(
                    residue || '',
                ).trim() ||
                countTextWords(
                    residue,
                ) > 45)
        ) {
            errors.push(
                '因果坍塌必须包含 1–3 条、每条不超过 45 词的可见余波。',
            );
        }
        if (
            !String(
                causalCollapse
                    .aftermathEn ||
                '',
            ).trim() ||
            countTextWords(
                causalCollapse
                    .aftermathEn,
            ) > 45
        ) {
            errors.push(
                '因果坍塌必须包含不超过 45 词的余波表演指令。',
            );
        }
        const actorIds = new Set([
            ...libraryIds,
            ...runtimeActors.keys(),
        ]);
        const focusActorId =
            String(
                causalCollapse
                    .focusActorId ||
                '',
            );
        if (
            focusActorId &&
            !actorIds.has(
                focusActorId,
            )
        ) {
            errors.push(
                `因果坍塌焦点人物 ${focusActorId} 不存在。`,
            );
        }
        const relatedActorIds =
            causalCollapse
                .relatedActorIds;
        if (
            !Array.isArray(
                relatedActorIds,
            ) ||
            relatedActorIds.length > 4 ||
            relatedActorIds.some(
                actorId =>
                    !actorIds.has(
                        actorId,
                    ))
        ) {
            errors.push(
                '因果坍塌关联人物必须是最多四名既有人物。',
            );
        }
        if (
            causalOpportunity
                ?.focusActorId &&
            focusActorId !==
                causalOpportunity
                    .focusActorId
        ) {
            errors.push(
                '因果坍塌焦点人物必须匹配当前观测槽位。',
            );
        }
        if (
            causalOpportunity
                ?.itemId &&
            causalCollapse.itemId !==
                causalOpportunity
                    .itemId
        ) {
            errors.push(
                '因果坍塌物品必须匹配当前检查槽位。',
            );
        }
        if (
            String(
                causalCollapse.mapId ||
                '',
            ) !==
                String(
                    causalOpportunity
                        ?.mapId ||
                    worldState.map
                        ?.activeMapId ||
                    '',
                ) ||
            String(
                causalCollapse.roomId ||
                '',
            ) !==
                String(
                    causalOpportunity
                        ?.roomId ||
                    worldState.map
                        ?.currentLocalNodeId ||
                    '',
                )
        ) {
            errors.push(
                '因果坍塌必须绑定当前权威地图与房间。',
            );
        }
        const persistenceTargets =
            causalCollapse
                .persistenceTargets;
        if (
            !Array.isArray(
                persistenceTargets,
            ) ||
            !persistenceTargets.length ||
            persistenceTargets.some(
                target =>
                    !CAUSAL_COLLAPSE_PERSISTENCE_TARGETS
                        .has(target))
        ) {
            errors.push(
                '因果坍塌必须声明合法的持久化目标。',
            );
        }
        if (
            causalCollapse.kind ===
                'social_edge' &&
            (
                !focusActorId ||
                !relatedActorIds.length ||
                !persistenceTargets
                    .includes(
                        'social_graph',
                    )
            )
        ) {
            errors.push(
                '社会关系坍塌必须包含焦点人物、关联人物和 social_graph 目标。',
            );
        }
        if (
            causalCollapse.kind ===
                'material_history' &&
            (
                !String(
                    causalCollapse
                        .itemId ||
                    '',
                ) ||
                !persistenceTargets
                    .includes('item')
            )
        ) {
            errors.push(
                '物品历史坍塌必须绑定物品和 item 目标。',
            );
        }
        const witnessAccounts =
            causalCollapse
                .witnessAccounts;
        if (
            !Array.isArray(
                witnessAccounts,
            ) ||
            witnessAccounts.length > 4
        ) {
            errors.push(
                '因果坍塌最多包含四个见证者知识账户。',
            );
        } else {
            witnessAccounts.forEach(
                account => {
                    const extraKeys =
                        Object.keys(
                            account || {},
                        ).filter(key =>
                            !CAUSAL_WITNESS_ACCOUNT_KEYS
                                .has(key));
                    if (
                        extraKeys.length ||
                        !actorIds.has(
                            account
                                ?.actorId,
                        ) ||
                        !String(
                            account
                                ?.accountEn ||
                            '',
                        ).trim() ||
                        countTextWords(
                            account
                                ?.accountEn,
                        ) > 60
                    ) {
                        errors.push(
                            '因果坍塌见证者账户无效。',
                        );
                    }
                },
            );
        }
        if (
            !Array.isArray(
                causalCollapse
                    .sourceEventIds,
            ) ||
            causalCollapse
                .sourceEventIds
                .length > 8 ||
            causalCollapse
                .sourceEventIds
                .some(id =>
                    !String(id || '')
                        .trim())
        ) {
            errors.push(
                '因果坍塌来源事件 ID 无效。',
            );
        }
    } else if (causalOpportunity) {
        if (
            ![
                'environmental_hook',
                'minor_mishap',
                'complication',
                'existing_actor_action',
            ].includes(
                intervention.kind,
            )
        ) {
            errors.push(
                '因果事实不成立时必须降级为普通环境变化、意外或既有人物行动。',
            );
        }
    }
    const temporaryIds = new Set();
    if (temporaryActors.length > 2) {
        errors.push(
            '一次节奏介入最多引入两名场景临时人物。',
        );
    }
    temporaryActors.forEach(actor => {
        const existing =
            runtimeActors.get(actor.id);
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(String(actor.id || '')) ||
            libraryIds.has(actor.id) ||
            temporaryIds.has(actor.id) ||
            (
                existing &&
                !existing.temporary
            ) ||
            (
                existing &&
                existing.present !==
                    false
            )
        ) {
            errors.push(
                `临时人物 ${actor.id || '?'} 的 ID 无效、重复或已经在场。`,
            );
        }
        PACING_TEMPORARY_ACTOR_KEYS
            .forEach(key => {
                if (!String(
                    actor[key] || '',
                ).trim()) {
                    errors.push(
                        `临时人物 ${actor.id || '?'} 缺少 ${key}。`,
                    );
                }
            });
        const unauthorized =
            Object.keys(actor)
                .filter(key =>
                    !PACING_TEMPORARY_ACTOR_KEYS
                        .has(key));
        if (unauthorized.length) {
            errors.push(
                `临时人物不得写入字段：${unauthorized.join(', ')}。`,
            );
        }
        temporaryIds.add(actor.id);
    });

    const guest = intervention.guestActor;
    const castPolicy =
        buildStoryCastPolicy(worldState);
    const canonGuest = guest
        ? findCanonCharacter(
            guest.nameEn,
        )
        : null;
    if (guest !== null && guest !== undefined) {
        if (!guest ||
            typeof guest !== 'object' ||
            Array.isArray(guest)) {
            errors.push('guestActor 必须是对象或 null。');
        } else {
            if (!/^[a-z][a-z0-9_]{2,79}$/.test(String(guest.id || '')) ||
                libraryIds.has(guest.id) ||
                runtimeActors.has(guest.id)) {
                errors.push('guestActor.id 必须是未使用的 snake_case ID。');
            }
            for (const key of PACING_GUEST_ACTOR_KEYS) {
                if ([
                    'birthDate',
                    'settingTags',
                ].includes(key)) {
                    continue;
                }
                if (!String(guest[key] || '').trim()) {
                    errors.push(`guestActor 缺少 ${key}。`);
                }
            }
            if (
                !Array.isArray(
                    guest.settingTags,
                ) ||
                guest.settingTags.length < 2 ||
                guest.settingTags.length > 5 ||
                guest.settingTags.some(
                    tag =>
                        !CANON_SETTING_TAG_VALUES
                            .includes(tag))
            ) {
                errors.push(
                    'guestActor.settingTags 必须包含 2–5 个固定设定标签。',
                );
            }
            const unauthorized = Object.keys(guest)
                .filter(key => !PACING_GUEST_ACTOR_KEYS.has(key));
            if (unauthorized.length) {
                errors.push(
                    `公共过场人物不得写入字段：${unauthorized.join(', ')}。`,
                );
            }
            if (
                castPolicy.remainingStorySlots <
                    1
            ) {
                errors.push(
                    `故事人物已达到上限 ${castPolicy.maxStoryActors}，必须复用已入库人物。`,
                );
            }
            if (
                !canonGuest &&
                castPolicy
                    .remainingGeneratedGuestSlots <
                    1
            ) {
                errors.push(
                    `原创过场人物已达到上限 ${castPolicy.maxGeneratedGuests}，必须复用既有人物或选择 Canon 人物。`,
                );
            }
            if (canonGuest) {
                if (
                    guest.id !==
                    canonGuest.id
                ) {
                    errors.push(
                        `Canon 人物 ${guest.nameEn} 必须使用目录 ID ${canonGuest.id}。`,
                    );
                }
                const duplicate =
                    (worldState.actorLibrary || [])
                        .find(actor =>
                            findCanonCharacter(
                                actor.nameEn,
                            )?.id ===
                                canonGuest.id);
                if (duplicate) {
                    errors.push(
                        `Canon 人物 ${guest.nameEn} 已以 ${duplicate.id} 入库，必须复用已有角色。`,
                    );
                }
                const canonProfile =
                    getCanonSettingProfile(
                        canonGuest,
                    );
                if (
                    JSON.stringify([
                        ...(
                            guest
                                .settingTags ||
                            []
                        ),
                    ].sort()) !==
                    JSON.stringify([
                        ...(
                            canonProfile
                                ?.settingTags ||
                            []
                        ),
                    ].sort())
                ) {
                    errors.push(
                        `Canon 人物 ${guest.nameEn} 必须使用目录预设的 settingTags。`,
                    );
                }
            } else if (
                !/^\d{4}-\d{2}-\d{2}$/
                    .test(
                        String(
                            guest.birthDate ||
                            '',
                        ),
                    )
            ) {
                errors.push(
                    '原创人物出场时必须固化 YYYY-MM-DD 出生日期。',
                );
            }
            const previousGuest =
                worldState.pacingDirector
                    ?.assessment
                    ?.intervention
                    ?.guestActor;
            if (
                !canonGuest &&
                previousGuest &&
                !findCanonCharacter(
                    previousGuest.nameEn,
                ) &&
                signals.metrics
                    ?.explicitNewActorRequest !==
                    true
            ) {
                errors.push(
                    '未明确请求陌生人时，不得连续新增原创过场人物。',
                );
            }
        }
    }
    if (['new_actor', 'mixed'].includes(intervention.kind) &&
        !actorEntrances.length &&
        !guest &&
        !temporaryActors.length) {
        errors.push('新人物介入必须包含已有角色入场或公共过场人物。');
    }
    const identityMergeFromId =
        String(
            intervention
                .identityMergeFromId ||
            '',
        );
    if (identityMergeFromId) {
        const temporary =
            runtimeActors.get(
                identityMergeFromId,
            );
        if (
            !temporary?.temporary ||
            !guest
        ) {
            errors.push(
                '身份合并必须引用既有临时人物，并同时提交正式 guestActor 身份。',
            );
        }
        if (
            intervention
                .identityRevealed !== true ||
            !String(
                intervention
                    .identityEvidenceEn ||
                '',
            ).trim()
        ) {
            errors.push(
                '暂定身份只有在叙事已揭晓且存在明确证据时才能合并。',
            );
        }
    } else if (
        intervention.identityRevealed ||
        String(
            intervention
                .identityEvidenceEn ||
            '',
        ).trim()
    ) {
        errors.push(
            '身份揭晓信息缺少 identityMergeFromId。',
        );
    }
    if (
        signals.metrics
            ?.forcePeerIntroduction
    ) {
        const introducedProfiles = [
            ...actorEntrances
                .map(entry =>
                    (worldState
                        .actorLibrary ||
                    []).find(actor =>
                        actor.id ===
                            entry.id))
                .filter(Boolean),
            ...(guest
                ? [{
                    ...guest,
                    canonCatalogId:
                        canonGuest?.id ||
                        '',
                    birthYear:
                        getCanonSettingProfile(
                            canonGuest,
                        )
                            ?.estimatedBirthYear,
                }]
                : []),
        ];
        if (
            !introducedProfiles.some(
                actor => [
                    'same_age',
                    'younger_peer',
                    'older_peer',
                ].includes(
                    getRelativeAgeProfile(
                        worldState,
                        actor,
                    ).relativeAgeBand,
                ))
        ) {
            errors.push(
                '当前必须补充与玩家年龄相近的新关系人物。',
            );
        }
    }
    if (
        ![
            'new_actor',
            'mixed',
            'existing_actor_action',
        ].includes(
            intervention.kind,
        ) &&
        actorEntrances.length
    ) {
        errors.push(
            '当前介入类型不得夹带 actorEntrances。',
        );
    }
    if (
        !['new_actor', 'mixed'].includes(
            intervention.kind,
        ) &&
        guest
    ) {
        errors.push(
            '非新人物介入不得夹带 guestActor。',
        );
    }
    return { valid: errors.length === 0, errors };
}

export function applyPacingAssessment(
    worldState,
    payload,
    signals = {},
) {
    const validation = validatePacingAssessment(
        payload,
        worldState,
        signals,
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const intervention = payload.decision === 'intervene'
        ? structuredClone(payload.intervention)
        : null;
    const mapId = next.map?.activeMapId;
    const roomId = next.map?.currentLocalNodeId;
    const totalTurns = Math.max(
        0,
        Number(
            next.turn?.count ||
            0,
        ),
    );
    const causalOpportunity =
        signals.reasons
            ?.includes(
                'causal_collapse_opportunity',
            )
            ? signals.metrics
                ?.causalCollapseOpportunity ||
                null
            : null;
    const causalState =
        normalizeCausalCollapseState(
            next.causalCollapse,
        );
    if (causalOpportunity) {
        causalState.lastCheckedTurn =
            totalTurns;
        causalState.checkedSlots = [
            ...causalState
                .checkedSlots
                .filter(entry =>
                    entry.key !==
                        causalOpportunity
                            .key),
            {
                key:
                    causalOpportunity
                        .key,
                type:
                    causalOpportunity
                        .type,
                sceneId:
                    next.scene?.id ||
                    '',
                checkedTurn:
                    totalTurns,
                outcome:
                    intervention
                        ?.causalCollapse
                        ? 'bound'
                        : 'immediate_incident',
            },
        ].slice(-100);
    }
    const causalCollapse =
        intervention
            ?.causalCollapse;
    if (
        causalOpportunity &&
        causalCollapse
    ) {
        const recordId =
            `causal_${totalTurns + 1}_${causalCollapse.kind}_${causalState.records.length + 1}`;
        const knownByActorIds = [
            causalCollapse
                .focusActorId,
            ...(
                causalCollapse
                    .relatedActorIds ||
                []
            ),
            ...(
                causalCollapse
                    .witnessAccounts ||
                []
            ).map(account =>
                account.actorId),
        ].filter(Boolean);
        const record = {
            ...structuredClone(
                causalCollapse,
            ),
            id: recordId,
            slotKey:
                causalOpportunity.key,
            triggerType:
                causalOpportunity.type,
            sceneId:
                next.scene?.id ||
                '',
            status:
                'pending_surface',
            effectiveSinceClock:
                advanceWorldClock(
                    next.clock,
                    -Number(
                        causalCollapse
                            .effectiveMinutesBeforeObservation,
                    ),
                ),
            observedAtClock:
                next.clock,
            materializedAtTurn:
                totalTurns + 1,
            knownByActorIds:
                [...new Set(
                    knownByActorIds,
                )],
        };
        causalState.records = [
            ...causalState.records,
            record,
        ].slice(-100);
        causalState.lastBoundTurn =
            totalTurns;
        intervention.causalCollapse = {
            ...record,
            recordId,
        };
        if (
            record
                .persistenceTargets
                .includes(
                    'room_state',
                )
        ) {
            next.map ??= {};
            next.map.roomStates ??= {};
            const roomKey =
                `${record.mapId}:${record.roomId}`;
            const roomState =
                next.map
                    .roomStates[
                        roomKey
                    ] || {};
            next.map.roomStates[
                roomKey
            ] = {
                ...roomState,
                causalFactIds: [
                    ...new Set([
                        ...(
                            roomState
                                .causalFactIds ||
                            []
                        ),
                        recordId,
                    ]),
                ],
                visibleResiduesEn:
                    [
                        ...new Set([
                            ...(
                                roomState
                                    .visibleResiduesEn ||
                                []
                            ),
                            ...record
                                .visibleResiduesEn,
                        ]),
                    ].slice(-12),
            };
        }
        if (
            record.itemId &&
            record
                .persistenceTargets
                .includes('item')
        ) {
            next.items = (
                next.items || []
            ).map(item =>
                item.id ===
                    record.itemId
                    ? {
                        ...item,
                        causalFactIds: [
                            ...new Set([
                                ...(
                                    item
                                        .causalFactIds ||
                                    []
                                ),
                                recordId,
                            ]),
                        ],
                    }
                    : item);
        }
        if (
            record.kind ===
                'social_edge' &&
            record
                .persistenceTargets
                .includes(
                    'social_graph',
                )
        ) {
            next.socialGraph =
                normalizeSocialGraph(
                    next.socialGraph,
                );
            const relationshipEvidence =
                new Map(
                    next.socialGraph
                        .relationshipEvidence
                        .map(evidence => [
                            evidence.id,
                            evidence,
                        ]),
                );
            const relationships =
                new Map(
                    next.socialGraph
                        .relationships
                        .map(edge => [
                            `${edge.sourceActorId}->${edge.targetActorId}`,
                            edge,
                        ]),
                );
            for (
                const relatedActorId of (
                    record
                        .relatedActorIds ||
                    []
                )
            ) {
                for (
                    const [
                        sourceActorId,
                        targetActorId,
                    ] of [
                        [
                            record
                                .focusActorId,
                            relatedActorId,
                        ],
                        [
                            relatedActorId,
                            record
                                .focusActorId,
                        ],
                    ]
                ) {
                    const evidenceId =
                        `${recordId}_${sourceActorId}_${targetActorId}`;
                    const key =
                        `${sourceActorId}->${targetActorId}`;
                    const existing =
                        relationships
                            .get(key) ||
                        {};
                    const edgeType =
                        String(
                            record.edgeType ||
                            '',
                        );
                    const causalStructuralTag =
                        CAUSAL_SOCIAL_STRUCTURAL_TAG_BY_EDGE_TYPE[
                            edgeType
                        ];
                    const causalStructuralTags =
                        causalStructuralTag
                            ? [
                                causalStructuralTag,
                            ]
                            : [];
                    const familiarity =
                        Math.max(
                            2,
                            clampSocialDimension(
                                'familiarity',
                                existing
                                    .familiarity,
                            ),
                        );
                    const warmth = Math.max(
                        edgeType === 'friend'
                            ? 1
                            : 0,
                        clampSocialDimension(
                            'warmth',
                            existing.warmth,
                        ),
                    );
                    const tension = Math.max(
                        edgeType === 'rival'
                            ? 1
                            : 0,
                        clampSocialDimension(
                            'tension',
                            existing.tension,
                        ),
                    );
                    const dimensionDeltas = [
                        [
                            'familiarity',
                            familiarity,
                        ],
                        ['warmth', warmth],
                        ['tension', tension],
                    ].flatMap(
                        ([
                            dimension,
                            nextValue,
                        ]) => {
                            const previousValue =
                                clampSocialDimension(
                                    dimension,
                                    existing[
                                        dimension
                                    ],
                                );
                            const delta =
                                nextValue -
                                previousValue;
                            return delta
                                ? [{
                                    dimension,
                                    delta,
                                    appliedDelta:
                                        delta,
                                    impact:
                                        impactForSocialDelta(
                                            delta,
                                        ),
                                }]
                                : [];
                        },
                    );
                    relationshipEvidence.set(
                        evidenceId,
                        {
                            id: evidenceId,
                            sourceActorId,
                            targetActorId,
                            eventKind: 'other',
                            dimensionDeltas,
                            structuralTags:
                                causalStructuralTags,
                            emotionAppraisals: [],
                            summaryEn:
                                record.factEn,
                            witnessedBy: [
                                ...new Set(
                                    record
                                        .knownByActorIds ||
                                    [
                                        sourceActorId,
                                        targetActorId,
                                    ],
                                ),
                            ],
                            sourceMessageIds: [],
                            sourceEventIds: [
                                ...(
                                    record
                                        .sourceEventIds ||
                                    []
                                ),
                            ],
                            sceneId:
                                record.sceneId,
                            source:
                                'causal_collapse',
                            effectiveSinceClock:
                                record
                                    .effectiveSinceClock,
                            clock:
                                record
                                    .observedAtClock,
                            turn: totalTurns,
                        },
                    );
                    relationships.set(
                        key,
                        {
                            ...existing,
                            familiarity,
                            closeness:
                                clampSocialDimension(
                                    'closeness',
                                    existing.closeness,
                                ),
                            warmth,
                            trust:
                                clampSocialDimension(
                                    'trust',
                                    existing.trust,
                                ),
                            respect:
                                clampSocialDimension(
                                    'respect',
                                    existing.respect,
                                ),
                            influence:
                                clampSocialDimension(
                                    'influence',
                                    existing.influence,
                                ),
                            tension,
                            resentment:
                                clampSocialDimension(
                                    'resentment',
                                    existing
                                        .resentment,
                                ),
                            fear:
                                clampSocialDimension(
                                    'fear',
                                    existing.fear,
                                ),
                            protectiveness:
                                clampSocialDimension(
                                    'protectiveness',
                                    existing
                                        .protectiveness,
                                ),
                            structuralTags:
                                normalizeSocialStructuralTags(
                                    existing
                                        .structuralTags,
                                    causalStructuralTags,
                                ),
                            activeEmotions:
                                Array.isArray(
                                    existing
                                        .activeEmotions,
                                )
                                    ? structuredClone(
                                        existing
                                            .activeEmotions,
                                    )
                                    : [],
                            evidenceIds:
                                [
                                    ...new Set([
                                        ...(
                                            existing
                                                .evidenceIds ||
                                            []
                                        ),
                                        evidenceId,
                                    ]),
                                ].slice(-32),
                            id:
                                existing.id ||
                                `relationship_${sourceActorId}_${targetActorId}`,
                            sourceActorId,
                            targetActorId,
                            updatedTurn:
                                totalTurns,
                            updatedClock:
                                next.clock,
                        },
                    );
                }
            }
            next.socialGraph = {
                ...next.socialGraph,
                relationshipEvidence: [
                    ...relationshipEvidence
                        .values(),
                ].slice(-1000),
                relationships: [
                    ...relationships
                        .values(),
                ].slice(-500),
            };
            next.actorLibrary =
                projectActorSocialRelationships(
                    next.actorLibrary,
                    next.socialGraph,
                );
        }
    }
    next.causalCollapse =
        causalState;
    const guest = intervention?.guestActor;
    if (guest) {
        const canonIdentity =
            findCanonCharacter(
                guest.nameEn,
            );
        const canonProfile =
            getCanonSettingProfile(
                canonIdentity,
            );
        const canonDisplay =
            getCanonActorDisplayMetadata({
                ...guest,
                canonCatalogId:
                    canonIdentity?.id ||
                    '',
            });
        const actorSource = canonIdentity
            ? 'canon_catalog'
            : 'pacing_public_guest';
        const guestRoomId = inferActorRoomId(
            guest,
            getLocalMapDefinition(mapId, next.map),
            roomId,
        );
        next.actorLibrary = [
            ...(next.actorLibrary || []),
            normalizeActorMemoryProfile({
                ...guest,
                ...(canonDisplay || {}),
                privateGoalEn: 'Complete the committed public scene beat.',
                fearEn: '',
                secretEn: '',
                knowledgeEn: canonIdentity
                    ? [
                        ACTOR_KNOWLEDGE_BOUNDARY_EN,
                    ]
                    : [],
                impressionOfPlayerEn:
                    'Has only just noticed the player.',
                impressionOfPlayer:
                    '刚刚注意到玩家，还没有形成稳定看法。',
                firstImpressionPending:
                    true,
                canonCatalogId:
                    canonIdentity?.id || '',
                fixedBirthText:
                    canonProfile
                        ?.fixedBirthText ||
                    '',
                birthYear:
                    canonProfile
                        ?.estimatedBirthYear ||
                    (
                        guest.birthDate
                            ? Number(
                                guest.birthDate
                                    .slice(
                                        0,
                                        4,
                                    ),
                            )
                            : null
                    ),
                birthDate:
                    canonIdentity
                        ? ''
                        : guest.birthDate,
                settingTags:
                    canonProfile
                        ?.settingTags ||
                    guest.settingTags,
                relationshipTags: [
                    'acquaintance',
                ],
                introducedClock:
                    next.clock,
                introducedTurn:
                    Number(
                        next.turn?.count ||
                        0,
                    ),
                source: actorSource,
            }),
        ];
        next.actors = [
            ...(next.actors || []),
            {
                id: guest.id,
                nameEn:
                    canonDisplay
                        ?.nameEn ||
                    guest.nameEn,
                name:
                    canonDisplay
                        ?.name ||
                    guest.name ||
                    guest.nameEn,
                aliases:
                    canonDisplay
                        ?.aliases ||
                    buildActorNameAliases(
                        guest.nameEn,
                        guest.name,
                        guest.aliases,
                    ),
                roleEn: guest.roleEn,
                role: guest.roleEn,
                relationshipToPlayerEn: guest.relationshipToPlayerEn,
                relationshipToPlayer: guest.relationshipToPlayerEn,
                impressionOfPlayerEn:
                    'Has only just noticed the player.',
                impressionOfPlayer:
                    '刚刚注意到玩家，还没有形成稳定看法。',
                impressionUpdatedClock: next.clock,
                impressionUpdatedTurn:
                    Number(next.turn?.count || 0),
                firstImpressionPending:
                    true,
                publicDescriptionEn: guest.publicDescriptionEn,
                currentActivityEn: guest.currentActivityEn,
                currentActivity: guest.currentActivityEn,
                currentIntentEn: intervention.pressureEn,
                currentIntent: intervention.pressureEn,
                present: true,
                lifeStatus: 'alive',
                lifeStatusPermanent:
                    false,
                lifeStatusDetailEn:
                    'Alive.',
                lifeStatusDetail:
                    '存活。',
                lifeStatusSinceClock: '',
                mapId,
                roomId: guestRoomId,
                canonCatalogId:
                    canonIdentity?.id || '',
                fixedBirthText:
                    canonProfile
                        ?.fixedBirthText ||
                    '',
                birthYear:
                    canonProfile
                        ?.estimatedBirthYear ||
                    (
                        guest.birthDate
                            ? Number(
                                guest.birthDate
                                    .slice(
                                        0,
                                        4,
                                    ),
                            )
                            : null
                    ),
                birthDate:
                    canonIdentity
                        ? ''
                        : guest.birthDate,
                settingTags:
                    canonProfile
                        ?.settingTags ||
                    guest.settingTags,
                relationshipTags: [
                    'acquaintance',
                ],
                introducedClock:
                    next.clock,
                introducedTurn:
                    Number(
                        next.turn?.count ||
                        0,
                    ),
                source: actorSource,
            },
        ];
    }
    const identityMergeFromId =
        intervention?.identityMergeFromId;
    if (
        guest &&
        identityMergeFromId
    ) {
        const temporary =
            next.actors.find(actor =>
                actor.id ===
                    identityMergeFromId &&
                actor.temporary);
        const guestProfile =
            next.actorLibrary.find(
                actor =>
                    actor.id === guest.id,
            );
        const guestActor =
            next.actors.find(actor =>
                actor.id === guest.id);
        if (
            temporary &&
            guestProfile &&
            guestActor
        ) {
            const sharedMemories =
                normalizeSharedMemories(
                    guestProfile
                        .sharedMemories,
                );
            sharedMemories.everyday = [
                ...sharedMemories.everyday,
                ...(
                    temporary
                        .temporaryMemories ||
                    []
                ),
            ].slice(
                -SHARED_MEMORY_TIER_LIMITS
                    .everyday,
            );
            const mergedProfile =
                normalizeActorMemoryProfile({
                    ...guestProfile,
                    id:
                        identityMergeFromId,
                    aliases:
                        buildActorNameAliases(
                            guestProfile
                                .nameEn,
                            guestProfile.name,
                            [
                                ...(
                                    guestProfile
                                        .aliases ||
                                    []
                                ),
                                ...(
                                    temporary
                                        .aliases ||
                                    []
                                ),
                                temporary
                                    .nameEn,
                            ],
                        ),
                    sharedMemories,
                    provisionalActorId:
                        identityMergeFromId,
                    resolvedIdentityId:
                        guest.id,
                    identityStatus:
                        'confirmed',
                    identityEvidenceEn:
                        intervention
                            .identityEvidenceEn,
                });
            next.actorLibrary =
                next.actorLibrary
                    .filter(actor =>
                        actor.id !==
                            guest.id)
                    .concat(
                        mergedProfile,
                    );
            next.actors =
                next.actors
                    .filter(actor =>
                        ![
                            guest.id,
                            identityMergeFromId,
                        ].includes(
                            actor.id,
                        ))
                    .concat({
                        ...guestActor,
                        id:
                            identityMergeFromId,
                        aliases:
                            mergedProfile
                                .aliases,
                        temporary: false,
                        provisionalActorId:
                            identityMergeFromId,
                        resolvedIdentityId:
                            guest.id,
                        identityStatus:
                            'confirmed',
                        identityEvidenceEn:
                            intervention
                                .identityEvidenceEn,
                    });
        }
    }
    (
        intervention?.temporaryActors ||
        []
    ).forEach(actor => {
        if (
            actor.id ===
            identityMergeFromId
        ) {
            return;
        }
        const existing =
            next.actors.find(item =>
                item.id === actor.id);
        if (existing?.temporary) {
            Object.assign(existing, {
                ...actor,
                name:
                    existing.name ||
                    actor.nameEn,
                aliases:
                    buildActorNameAliases(
                        actor.nameEn,
                        existing.name,
                        existing.aliases,
                    ),
                present: true,
                mapId,
                roomId,
                currentActivity:
                    actor
                        .currentActivityEn,
                currentIntentEn:
                    intervention
                        .pressureEn,
                currentIntent:
                    intervention
                        .pressureEn,
            });
            return;
        }
        next.actors.push({
            ...actor,
            name: actor.nameEn,
            aliases:
                buildActorNameAliases(
                    actor.nameEn,
                ),
            relationshipToPlayerEn:
                'scene acquaintance',
            relationshipToPlayer:
                '场景中的临时相识',
            currentActivity:
                actor.currentActivityEn,
            currentIntentEn:
                intervention.pressureEn,
            currentIntent:
                intervention.pressureEn,
            present: true,
            temporary: true,
            provisionalActorId:
                actor.id,
            identityStatus:
                'provisional',
            temporaryMemories: [],
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusDetail:
                '存活。',
            lifeStatusSinceClock: '',
            mapId,
            roomId,
            source:
                'scene_temporary_actor',
            introducedClock:
                next.clock,
            introducedTurn:
                Number(
                    next.turn?.count ||
                    0,
                ),
        });
    });
    const entrances = new Map(
        (intervention?.actorEntrances || [])
            .map(entry => [entry.id, entry]),
    );
    next.actorLibrary =
        (next.actorLibrary || [])
            .map(profile =>
                entrances.has(profile.id)
                    ? normalizeActorMemoryProfile({
                        ...profile,
                        introducedClock:
                            profile
                                .introducedClock ||
                            next.clock,
                        introducedTurn:
                            profile
                                .introducedTurn ??
                            Number(
                                next.turn
                                    ?.count ||
                                0,
                            ),
                        firstImpressionPending:
                            !profile
                                .firstImpressionOfPlayerEn,
                    }, {
                        ...profile,
                        present: true,
                    })
                    : profile);
    next.actors = (next.actors || []).map(actor => {
        const entrance = entrances.get(actor.id);
        const profile = next.actorLibrary
            .find(item =>
                item.id === actor.id);
        const entranceRoomId = entrance
            ? inferActorRoomId(
                entrance,
                getLocalMapDefinition(mapId, next.map),
                roomId,
            )
            : roomId;
        return entrance ? {
            ...actor,
            present: true,
            mapId,
            roomId: entranceRoomId,
            currentActivityEn: entrance.currentActivityEn,
            currentActivity: entrance.currentActivityEn,
            firstImpressionOfPlayerEn:
                profile
                    ?.firstImpressionOfPlayerEn ||
                actor
                    .firstImpressionOfPlayerEn ||
                '',
            firstImpressionOfPlayer:
                profile
                    ?.firstImpressionOfPlayer ||
                actor
                    .firstImpressionOfPlayer ||
                '',
            firstImpressionClock:
                profile
                    ?.firstImpressionClock ||
                actor.firstImpressionClock ||
                '',
            firstImpressionTurn:
                profile
                    ?.firstImpressionTurn ||
                actor.firstImpressionTurn ||
                0,
            firstImpressionPending:
                !(
                    profile
                        ?.firstImpressionOfPlayerEn ||
                    actor
                        .firstImpressionOfPlayerEn
                ),
        } : actor;
    });
    for (const [actorId, entrance] of entrances) {
        if (next.actors.some(actor => actor.id === actorId)) {
            continue;
        }
        const profile = next.actorLibrary.find(actor =>
            actor.id === actorId);
        const entranceRoomId = inferActorRoomId(
            entrance,
            getLocalMapDefinition(mapId, next.map),
            roomId,
        );
        next.actors.push({
            id: profile.id,
            nameEn: profile.nameEn,
            name: profile.name || profile.nameEn,
            roleEn: profile.roleEn,
            role: profile.role || profile.roleEn,
            relationshipToPlayerEn:
                profile.relationshipToPlayerEn,
            relationshipToPlayer:
                profile.relationshipToPlayer ||
                profile.relationshipToPlayerEn,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer ||
                profile.impressionOfPlayerEn,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
            firstImpressionOfPlayerEn:
                profile
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile.firstImpressionClock,
            firstImpressionTurn:
                profile.firstImpressionTurn,
            firstImpressionPending:
                !profile
                    .firstImpressionOfPlayerEn,
            publicDescriptionEn: profile.publicDescriptionEn,
            currentActivityEn: entrance.currentActivityEn,
            currentActivity: entrance.currentActivityEn,
            currentIntentEn: intervention.pressureEn,
            currentIntent: intervention.pressureEn,
            present: true,
            mapId,
            roomId: entranceRoomId,
        });
    }
    next.pacingDirector = {
        status: 'ready',
        error: '',
        lastAssessedTurn: totalTurns,
        lastAssessedSceneId: next.scene?.id || '',
        reassessAfterTurns: payload.reassessAfterTurns,
        assessment: structuredClone(payload),
        assessedAt: new Date().toISOString(),
        signals: structuredClone(signals),
        pendingBeat: intervention ? {
            ...intervention,
            status: 'pending',
            sceneId: next.scene?.id || '',
            createdTurn: totalTurns,
        } : null,
    };
    if (intervention && next.scene) {
        next.scene.pacingPressureEn = intervention.pressureEn;
    }
    return migrateActorPresentationState(
        next,
    ).state;
}

export function consumePacingBeat(worldState) {
    const pending = worldState.pacingDirector?.pendingBeat;
    if (pending?.status !== 'pending') {
        return worldState;
    }
    const next = structuredClone(worldState);
    next.pacingDirector.pendingBeat = {
        ...next.pacingDirector.pendingBeat,
        status: 'consumed',
        consumedAtClock: next.clock,
        consumedTurn: Number(next.turn?.count || 0),
    };
    const recordId =
        pending
            .causalCollapse
            ?.recordId ||
        pending
            .causalCollapse
            ?.id;
    if (recordId) {
        next.causalCollapse =
            normalizeCausalCollapseState(
                next.causalCollapse,
            );
        next.causalCollapse.records =
            next.causalCollapse.records
                .map(record =>
                    record.id ===
                        recordId
                        ? {
                            ...record,
                            status:
                                'surfaced',
                            surfacedAtClock:
                                next.clock,
                            surfacedAtTurn:
                                Number(
                                    next.turn
                                        ?.count ||
                                    0,
                                ),
                        }
                        : record);
    }
    return next;
}

export function estimateTurnMinutes(playerAction, timePolicy = {}) {
    const action = String(playerAction || '');
    const policy = {
        defaultMinutes: Math.max(15, Number(timePolicy.defaultMinutes) || 15),
        movementMinutes: Math.max(15, Number(timePolicy.movementMinutes) || 15),
        investigationMinutes: Math.max(15, Number(timePolicy.investigationMinutes) || 30),
        extendedActionMinutes: Math.max(15, Number(timePolicy.extendedActionMinutes) || 60),
        instantaneousMagicMinutes: Math.max(0, Number(timePolicy.instantaneousMagicMinutes) || 1),
    };
    if (MAGIC_ACTION_PATTERN.test(action)) {
        return policy.instantaneousMagicMinutes;
    }
    if (EXTENDED_ACTION_PATTERN.test(action)) {
        return policy.extendedActionMinutes;
    }
    if (INVESTIGATION_ACTION_PATTERN.test(action)) {
        return policy.investigationMinutes;
    }
    if (MOVEMENT_ACTION_PATTERN.test(action)) {
        return policy.movementMinutes;
    }
    return policy.defaultMinutes;
}

export function createTurnPerformanceBudget(
    playerAction,
    timePolicy = {},
    {
        activeNamedActorCount = 0,
        adjudicatedMinutes =
        undefined,
    } = {},
) {
    const suppliedMinutes =
        Number(
            adjudicatedMinutes,
        );
    const elapsedMinutes =
        Number.isInteger(
            suppliedMinutes,
        ) &&
        suppliedMinutes >= 0 &&
        suppliedMinutes <= 10_080
            ? suppliedMinutes
            : estimateTurnMinutes(
                playerAction,
                timePolicy,
            );
    const baseMinimumWords = elapsedMinutes < 15
        ? 60
        : Math.min(650, 180 + elapsedMinutes * 4);
    const normalizedActorCount =
        Math.max(
            0,
            Number(
                activeNamedActorCount,
            ) || 0,
        );
    const ensembleActorCount =
        elapsedMinutes >= 15
            ? Math.max(
                0,
                normalizedActorCount -
                    3,
            )
            : 0;
    const minimumWords =
        Math.min(
            800,
            baseMinimumWords +
                ensembleActorCount *
                    60,
        );
    const maximumWords =
        Math.min(
            1000,
            baseMinimumWords +
                320 +
                ensembleActorCount *
                    100,
        );
    return {
        elapsedMinutes,
        minimumWords,
        maximumWords,
        ...(ensembleActorCount > 0
            ? {
                activeNamedActorCount:
                    normalizedActorCount,
                ensemble: true,
                minimumSegments:
                    Math.min(
                        8,
                        4 +
                        Math.ceil(
                            ensembleActorCount /
                                2,
                        ),
                    ),
                maximumSegments: 20,
                primaryProgressionShare:
                    0.4,
                maximumIndividuatedSecondaryActors:
                    2,
            }
            : {}),
    };
}

export function resolveTurnElapsedMinutes(
    performance,
    budget,
) {
    const minimumMinutes = Math.max(
        0,
        Number(budget?.elapsedMinutes) || 0,
    );
    if (minimumMinutes < 15) {
        return minimumMinutes;
    }
    const wordCount = (
        performance?.segments || []
    )
        .map(segment =>
            String(segment?.textEn || '').trim())
        .filter(Boolean)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean)
        .length;
    const softWordCapacity = Math.ceil(
        Math.max(
            1,
            Number(budget?.maximumWords) || 1,
        ) * 1.3,
    );
    if (wordCount <= softWordCapacity) {
        return minimumMinutes;
    }
    const overflowBlocks = Math.ceil(
        (wordCount - softWordCapacity) /
        softWordCapacity,
    );
    return minimumMinutes +
        overflowBlocks * 15;
}

const PRECISE_TEMPORAL_CLAIM_PATTERNS = [
    /\b(?:since|at|by|before|after|until|till)\s+(?:noon|midnight|dawn|dusk|sunrise|sunset|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:shop|store|bank|pub|office|business|premises|doors?)\s+(?:clos(?:e|es|ed|ing)|opens?|opening)\s+(?:at|in|within|by|before|after)\b/gi,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+o['’]?clock\b/gi,
    /\b(?:breakfast|lunch|dinner|supper|tea)\s+(?:at|by)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\b/gi,
    /\b(?:train|express|coach|bus|ferry|boat|ship|flight|service)\s+(?:departs?|leaves?|arrives?|boards?|starts?)\s+(?:at\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2}(?::[0-5]\d)?|noon|midnight)\b/gi,
    /\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth|thirty-first|\d{1,2}(?:st|nd|rd|th)?)\s+of\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:the\s+)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth|thirty-first|\d{1,2}(?:st|nd|rd|th)?)\b/gi,
];

const RELATIVE_TEMPORAL_CLAIM_PATTERN =
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|\d+)\s+(minutes?|hours?)\s+(before|after|until|till|later|earlier|ago|past)\b/gi;
const TEMPORAL_NUMBER_WORDS = Object.freeze({
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
});
const TURN_INTERNAL_RELATIVE_DIRECTIONS =
    new Set([
        'after',
        'later',
        'earlier',
        'ago',
        'past',
    ]);

export function validateSceneTemporalConsistency(
    payload,
    worldState,
    budget,
    allowedSourceText = '',
) {
    const startMatch = WORLD_CLOCK_PATTERN.exec(
        String(worldState?.clock || ''),
    );
    if (!startMatch) {
        return { valid: true, errors: [] };
    }
    const minimumEndClock = advanceWorldClock(
        worldState.clock,
        Number(budget?.elapsedMinutes) || 0,
    );
    const endMatch = WORLD_CLOCK_PATTERN.exec(
        minimumEndClock,
    );
    const allowedClockValues = new Set([
        `${startMatch[4]}:${startMatch[5]}`,
        ...(endMatch
            ? [`${endMatch[4]}:${endMatch[5]}`]
            : []),
    ]);
    const corpus = [
        payload?.publicEventEn,
        payload?.sceneProgression?.summaryEn,
        ...(payload?.segments || []).map(
            segment => segment?.textEn,
        ),
        ...(payload?.actorUpdates || []).flatMap(
            update => [
                update?.currentActivityEn,
                update?.impressionOfPlayerEn,
                update?.memoryUpdate?.summaryEn,
            ],
        ),
    ].filter(Boolean).join(' ');
    const source = String(allowedSourceText || '')
        .toLocaleLowerCase();
    const unsupported = new Set();
    for (const claim of corpus.match(
        /\b(?:[01]\d|2[0-3]):[0-5]\d\b/g,
    ) || []) {
        if (!allowedClockValues.has(claim) &&
            !source.includes(claim.toLocaleLowerCase())) {
            unsupported.add(claim);
        }
    }
    for (
        const match of corpus.matchAll(
            RELATIVE_TEMPORAL_CLAIM_PATTERN,
        )
    ) {
        const claim =
            String(match[0] || '')
                .trim();
        if (
            !claim ||
            source.includes(
                claim.toLocaleLowerCase(),
            )
        ) {
            continue;
        }
        const amountText =
            String(match[1] || '')
                .toLocaleLowerCase();
        const amount =
            /^\d+$/.test(amountText)
                ? Number(amountText)
                : TEMPORAL_NUMBER_WORDS[
                    amountText
                ] || 0;
        const durationMinutes =
            amount *
            (
                /^hours?$/i.test(
                    String(
                        match[2] ||
                        '',
                    ),
                )
                    ? 60
                    : 1
            );
        const direction =
            String(match[3] || '')
                .toLocaleLowerCase();
        const withinAuthorizedTurn =
            TURN_INTERNAL_RELATIVE_DIRECTIONS
                .has(direction) &&
            durationMinutes > 0 &&
            durationMinutes <=
                Math.max(
                    0,
                    Number(
                        budget
                            ?.elapsedMinutes ||
                        0,
                    ),
                );
        if (!withinAuthorizedTurn) {
            unsupported.add(claim);
        }
    }
    PRECISE_TEMPORAL_CLAIM_PATTERNS.forEach(pattern => {
        for (const match of corpus.matchAll(pattern)) {
            const claim = String(match[0] || '').trim();
            if (claim &&
                !source.includes(
                    claim.toLocaleLowerCase(),
                )) {
                unsupported.add(claim);
            }
        }
    });
    if (!unsupported.size) {
        return { valid: true, errors: [] };
    }
    return {
        valid: false,
        errors: [
            `现场表演违反系统时间权威（${worldState.clock} 至不早于 ${minimumEndClock}）：不得编造精确时刻、营业时间、外部倒计时或超出本回合跨度的相对时间：${[...unsupported].join('、')}`,
        ],
    };
}

function validateItemUpdates(
    itemUpdates,
    worldState,
    playerAction = '',
    narrativeText = '',
    {
        requireNarrativeAcquisition = true,
    } = {},
) {
    const errors = [];
    if (!Array.isArray(itemUpdates)) {
        return ['itemUpdates 必须是数组。'];
    }
    const existingItems = new Map(
        (worldState.items || []).map(item => [
            item.id,
            normalizeInventoryItem(item),
        ]),
    );
    const seenIds = new Set();
    const allowedActions = new Set([
        'acquire',
        'update',
        'carry',
        'equip',
        'store',
        'consume',
        'lose',
    ]);
    itemUpdates.forEach(update => {
        if (!update ||
            typeof update !== 'object' ||
            Array.isArray(update)) {
            errors.push('物品更新必须是对象。');
            return;
        }
        if (!/^[a-z][a-z0-9_]{1,79}$/.test(
            String(update.id || ''),
        ) || seenIds.has(update.id)) {
            errors.push(
                `物品更新 ${update.id || '?'} 的 ID 无效或重复。`,
            );
        }
        seenIds.add(update.id);
        if (!allowedActions.has(update.action)) {
            errors.push(
                `物品 ${update.id || '?'} 的 action 无效。`,
            );
        }
        const existing =
            existingItems.get(update.id);
        if (
            update.action !== 'acquire' &&
            !existing
        ) {
            errors.push(
                `物品 ${update.id || '?'} 尚未入栏，不能执行 ${update.action || '?'}。`,
            );
        }
        if (update.action === 'acquire') {
            if (
                !String(
                    update.labelEn || '',
                ).trim() ||
                !String(
                    update.detailEn || '',
                ).trim()
            ) {
                errors.push(
                    `新物品 ${update.id || '?'} 缺少 labelEn 或 detailEn。`,
                );
            }
            if (!ITEM_IMPORTANCE_VALUES.includes(
                update.importance,
            )) {
                errors.push(
                    `新物品 ${update.id || '?'} 的 importance 无效。`,
                );
            }
            if (!ITEM_CUSTODY_VALUES.includes(
                update.custody,
            )) {
                errors.push(
                    `新物品 ${update.id || '?'} 的 custody 无效。`,
                );
            }
            const itemText = [
                update.labelEn,
                update.detailEn,
            ].filter(Boolean).join(' ');
            if (
                update.importance ===
                    'ordinary' &&
                ORDINARY_TRANSIENT_ITEM_PATTERN
                    .test(itemText) &&
                !PLAYER_KEEP_ITEM_PATTERN.test(
                    playerAction,
                )
            ) {
                errors.push(
                    `普通消耗品 ${update.id || '?'} 只有在玩家明确要求保留或携带时才能进入物品栏。`,
                );
            }
        }
    });

    const acquiredImportant =
        IMPORTANT_ITEM_PATTERN.test(
            narrativeText,
        ) &&
        DURABLE_ACQUISITION_PATTERN.test(
            narrativeText,
        );
    if (
        requireNarrativeAcquisition &&
        acquiredImportant
    ) {
        const kind =
            inferItemKind(narrativeText);
        const alreadyTracked =
            [...existingItems.values()].some(item =>
                item.kind === kind &&
                !['consumed', 'lost'].includes(
                    item.custody,
                ));
        const submitted =
            itemUpdates.some(update =>
                update.action === 'acquire' &&
                inferItemKind(update) === kind &&
                ['key', 'important'].includes(
                    update.importance,
                ));
        if (!alreadyTracked && !submitted) {
            errors.push(
                `本回合已明确获得重要物品（${kind}），必须提交 acquire itemUpdate。`,
            );
        }
    }
    return errors;
}

function applyItemUpdates(
    worldState,
    itemUpdates = [],
) {
    const items = (worldState.items || [])
        .map((item, index) =>
            normalizeInventoryItem(
                item,
                index,
                {
                    mapId:
                        worldState.map
                            ?.activeMapId,
                    roomId:
                        worldState.map
                            ?.currentLocalNodeId,
                    clock: worldState.clock,
                },
            ));
    const byId = new Map(
        items.map(item => [item.id, item]),
    );
    itemUpdates.forEach(update => {
        const existing = byId.get(update.id);
        let custody =
            update.custody ||
            existing?.custody ||
            'carried';
        if (update.action === 'carry') {
            custody = 'carried';
        } else if (update.action === 'equip') {
            custody = 'equipped';
        } else if (update.action === 'store') {
            custody = 'stored';
        } else if (update.action === 'consume') {
            custody = 'consumed';
        } else if (update.action === 'lose') {
            custody = 'lost';
        }
        const followsPlayer = [
            'carried',
            'equipped',
        ].includes(custody) &&
            (update.ownerId ||
                existing?.ownerId ||
                'player') === 'player';
        const nextItem = normalizeInventoryItem({
            ...(existing || {}),
            ...update,
            label:
                update.label ||
                existing?.label ||
                update.labelEn,
            detail:
                update.detail ||
                existing?.detail ||
                update.detailEn,
            custody,
            status:
                custody === 'consumed'
                    ? 'consumed'
                    : custody === 'lost'
                        ? 'lost'
                        : update.status ||
                            existing?.status ||
                            'available',
            updatedClock:
                worldState.clock,
            acquiredClock:
                existing?.acquiredClock ||
                worldState.clock,
            source:
                existing?.source ||
                'scene_turn',
            mapId: followsPlayer
                ? worldState.map
                    ?.activeMapId
                : update.mapId ||
                    existing?.mapId,
            roomId: followsPlayer
                ? worldState.map
                    ?.currentLocalNodeId
                : update.roomId ||
                    existing?.roomId,
        }, items.length, {
            mapId:
                worldState.map?.activeMapId,
            roomId:
                worldState.map
                    ?.currentLocalNodeId,
            clock: worldState.clock,
        });
        delete nextItem.action;
        byId.set(nextItem.id, nextItem);
    });
    return [...byId.values()];
}

function validateActorPresenceResolution(
    actorPresence,
    worldState,
    actorUpdates,
    {
        required = false,
        authorizedEntranceIds = [],
    } = {},
) {
    const errors = [];
    if (actorPresence == null) {
        if (required) {
            errors.push(
                '低档每轮必须提交完整的回合结束在场人物名单。',
            );
        }
        return errors;
    }
    if (
        typeof actorPresence !== 'object' ||
        Array.isArray(actorPresence) ||
        !Array.isArray(
            actorPresence
                .presentActorIdsAfterTurn,
        )
    ) {
        return [
            'actorPresence 必须包含 presentActorIdsAfterTurn 数组。',
        ];
    }
    const actorIdsAfterTurn =
        actorPresence
            .presentActorIdsAfterTurn
            .map(String);
    const presentAfterTurn = new Set(
        actorIdsAfterTurn,
    );
    if (
        presentAfterTurn.size !==
        actorIdsAfterTurn.length
    ) {
        errors.push(
            '回合结束在场人物名单不能包含重复人物。',
        );
    }
    const initiallyPresent = new Set(
        (worldState.actors || [])
            .filter(actor =>
                actor.present !== false)
            .map(actor =>
                actor.id),
    );
    const authorizedPresent =
        new Set([
            ...initiallyPresent,
            ...authorizedEntranceIds,
        ]);
    actorIdsAfterTurn.forEach(actorId => {
        if (!authorizedPresent.has(actorId)) {
            errors.push(
                `回合结束在场人物名单包含未授权入场人物 ${actorId}。`,
            );
        }
    });
    const updatesByActor = new Map(
        (
            Array.isArray(actorUpdates)
                ? actorUpdates
                : []
        ).map(update => [
            update.id,
            update,
        ]),
    );
    initiallyPresent.forEach(actorId => {
        if (presentAfterTurn.has(actorId)) {
            return;
        }
        const update =
            updatesByActor.get(actorId);
        if (
            !update ||
            update.present !== false ||
            !String(
                update.currentActivityEn ||
                '',
            ).trim()
        ) {
            errors.push(
                `离场人物 ${actorId} 必须提交 present:false 和离场后的当前活动。`,
            );
        }
    });
    authorizedEntranceIds.forEach(
        actorId => {
            const update =
                updatesByActor.get(actorId);
            if (
                !update ||
                typeof update.present !==
                    'boolean' ||
                update.present !==
                    presentAfterTurn.has(
                        actorId,
                    ) ||
                !String(
                    update
                        .currentActivityEn ||
                    '',
                ).trim()
            ) {
                errors.push(
                    `临时入场人物 ${actorId} 必须提交与最终在场状态一致的 present 和当前活动。`,
                );
            }
        },
    );
    updatesByActor.forEach(
        (update, actorId) => {
            if (
                update.present !==
                    undefined &&
                update.present !==
                    presentAfterTurn.has(actorId)
            ) {
                errors.push(
                    `人物 ${actorId} 的 present 与回合结束在场名单不一致。`,
                );
            }
        },
    );
    return errors;
}

function validateTemporaryActorEntrances(
    entrances,
    worldState,
    {
        allowLocalizedDisplayFields =
        false,
    } = {},
) {
    const errors = [];
    if (!Array.isArray(entrances)) {
        return {
            valid: false,
            errors: [
                'temporaryActorEntrances 必须是数组。',
            ],
            ids: [],
        };
    }
    if (entrances.length > 2) {
        errors.push(
            '单轮最多引入两名场景临时人物。',
        );
    }
    const existingIds = new Set([
        ...(worldState.actorLibrary || [])
            .map(actor => actor.id),
        ...(worldState.actors || [])
            .map(actor => actor.id),
    ]);
    const ids = new Set();
    entrances.forEach(actor => {
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(String(actor?.id || '')) ||
            existingIds.has(actor?.id) ||
            ids.has(actor?.id)
        ) {
            errors.push(
                `临时入场人物 ${actor?.id || '?'} 的 ID 无效、重复或已存在。`,
            );
        }
        PACING_TEMPORARY_ACTOR_KEYS
            .forEach(key => {
                if (!String(
                    actor?.[key] || '',
                ).trim()) {
                    errors.push(
                        `临时入场人物 ${actor?.id || '?'} 缺少 ${key}。`,
                    );
                }
            });
        const unauthorized =
            Object.keys(actor || {})
                .filter(key =>
                    !PACING_TEMPORARY_ACTOR_KEYS
                        .has(key) &&
                    (
                        !allowLocalizedDisplayFields ||
                        !LOCALIZED_TEMPORARY_ACTOR_KEYS
                            .has(key)
                    ));
        if (unauthorized.length) {
            errors.push(
                `临时入场人物不得写入字段：${unauthorized.join(', ')}。`,
            );
        }
        ids.add(actor?.id);
    });
    return {
        valid: errors.length === 0,
        errors,
        ids: [...ids].filter(Boolean),
    };
}

export function recoverImplicitTemporaryActorEntrances(
    payload,
    worldState,
) {
    const recovered =
        structuredClone(payload);
    const declared =
        Array.isArray(
            recovered
                ?.temporaryActorEntrances,
        )
            ? recovered
                .temporaryActorEntrances
            : [];
    recovered.temporaryActorEntrances =
        declared;
    if (
        declared.length >= 2 ||
        !Array.isArray(
            recovered?.segments,
        ) ||
        !Array.isArray(
            recovered?.actorUpdates,
        )
    ) {
        return recovered;
    }
    const reservedIds = new Set([
        ...(
            worldState.actorLibrary ||
            []
        ).map(actor => actor.id),
        ...(
            worldState.actors ||
            []
        ).map(actor => actor.id),
        ...declared.map(actor =>
            actor.id),
    ]);
    const dialogueActorIds =
        new Set(
            recovered.segments
                .filter(segment =>
                    segment.type ===
                        'dialogue')
                .map(segment =>
                    segment.actorId)
                .filter(Boolean),
        );
    const updatesById =
        new Map(
            recovered.actorUpdates
                .filter(update =>
                    update?.present !==
                        false &&
                    String(
                        update
                            ?.currentActivityEn ||
                        '',
                    ).trim())
                .map(update => [
                    update.id,
                    update,
                ]),
        );
    const suppliedPresentIds =
        Array.isArray(
            recovered
                ?.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? new Set(
                recovered
                    .actorPresence
                    .presentActorIdsAfterTurn,
            )
            : null;
    const recoverableIds = [
        ...dialogueActorIds,
    ].filter(actorId =>
        /^[a-z][a-z0-9_]{2,79}$/
            .test(
                String(actorId || ''),
            ) &&
        !reservedIds.has(actorId) &&
        updatesById.has(actorId) &&
        (
            !suppliedPresentIds ||
            suppliedPresentIds
                .has(actorId)
        ))
        .slice(
            0,
            2 - declared.length,
        );
    recoverableIds.forEach(actorId => {
        const update =
            updatesById.get(actorId);
        const publicLabel =
            String(actorId)
                .split('_')
                .filter(Boolean)
                .map(word =>
                    word.charAt(0)
                        .toLocaleUpperCase() +
                    word.slice(1))
                .join(' ');
        recovered
            .temporaryActorEntrances
            .push({
                id: actorId,
                nameEn:
                    publicLabel ||
                    'Unnamed Scene Acquaintance',
                roleEn:
                    'Previously unnamed scene acquaintance',
                publicDescriptionEn:
                    'A person in the current scene whom the player has directly engaged; further identity details remain unrevealed.',
                personalityEn:
                    'Not yet established beyond the observable interaction.',
                speechStyleEn:
                    'Defined only by dialogue already rendered in this turn.',
                currentActivityEn:
                    update
                        .currentActivityEn,
            });
    });
    return recovered;
}

export const NARRATIVE_TURN_PROTOCOL_VERSION =
    2;

const NARRATIVE_STATE_PROPOSAL_TYPES =
    new Set([
        'actor_activity',
        'actor_move',
        'actor_enter',
        'actor_exit',
        'social_hint',
        'item_update',
        'temporary_actor',
        'clue_reveal',
    ]);

function appendSettlementWarning(
    warnings,
    code,
    detail,
) {
    warnings.push({
        code: String(code || 'unknown'),
        detail: String(detail || '')
            .slice(0, 500),
    });
}

function compactNarrativeEventText(
    value,
) {
    const words = String(value || '')
        .replace(/\s+/gu, ' ')
        .trim()
        .split(/\s+/u)
        .filter(Boolean)
        .slice(0, 48);
    if (!words.length) {
        return '';
    }
    const text = words.join(' ');
    return /[.!?]["'’”)]?$/u.test(text)
        ? text
        : `${text}.`;
}

function deriveNarrativePublicEvent(
    payload,
) {
    const supplied = String(
        payload?.publicEventEn || '',
    ).trim();
    if (
        supplied &&
        !/player completes|player acts|characters respond/iu
            .test(supplied)
    ) {
        return compactNarrativeEventText(
            supplied,
        );
    }
    const progression = String(
        payload?.signals
            ?.sceneProgression
            ?.summaryEn ||
        payload?.sceneProgression
            ?.summaryEn ||
        '',
    ).trim();
    if (progression) {
        return compactNarrativeEventText(
            progression,
        );
    }
    const segments = Array.isArray(
        payload?.segments,
    )
        ? payload.segments
        : [];
    const narration = [...segments]
        .reverse()
        .find(segment =>
            segment?.type ===
                'narration' &&
            String(
                segment.textEn ||
                '',
            ).trim());
    if (narration) {
        return compactNarrativeEventText(
            narration.textEn,
        );
    }
    const dialogueActorIds = [
        ...new Set(
            segments
                .filter(segment =>
                    segment?.type ===
                        'dialogue')
                .map(segment =>
                    segment.actorId)
                .filter(Boolean),
        ),
    ];
    return dialogueActorIds.length
        ? `A conversation continued with ${dialogueActorIds.join(', ')}.`
        : 'The current scene continued.';
}

export function normalizeNarrativeTurnCore(
    source,
) {
    const payload =
        source &&
        typeof source === 'object' &&
        !Array.isArray(source)
            ? structuredClone(source)
            : {};
    const warnings = Array.isArray(
        payload.settlementWarnings,
    )
        ? payload.settlementWarnings
        : [];
    payload.protocolVersion =
        NARRATIVE_TURN_PROTOCOL_VERSION;
    payload.segments = Array.isArray(
        payload.segments,
    )
        ? payload.segments
        : [];
    payload.stateProposals =
        Array.isArray(
            payload.stateProposals,
        )
            ? payload.stateProposals
                .slice(0, 24)
            : [];
    payload.signals =
        payload.signals &&
        typeof payload.signals ===
            'object' &&
        !Array.isArray(payload.signals)
            ? payload.signals
            : {};
    payload.settlementWarnings =
        warnings;
    return payload;
}

function mergeActorUpdate(
    updates,
    actorId,
    patch,
) {
    if (!actorId) {
        return;
    }
    const previous =
        updates.get(actorId) || {
            id: actorId,
        };
    updates.set(actorId, {
        ...previous,
        ...patch,
        id: actorId,
        ...(previous.memoryUpdate ||
            patch.memoryUpdate
            ? {
                memoryUpdate: {
                    ...(
                        previous
                            .memoryUpdate ||
                        {}
                    ),
                    ...(
                        patch
                            .memoryUpdate ||
                        {}
                    ),
                },
            }
            : {}),
    });
}

export function foldNarrativeTurnProposals(
    source,
) {
    const payload =
        normalizeNarrativeTurnCore(
            source,
        );
    const warnings =
        payload.settlementWarnings;
    const actorUpdates = new Map();
    if (
        payload.actorUpdates !==
            undefined &&
        !Array.isArray(
            payload.actorUpdates,
        )
    ) {
        appendSettlementWarning(
            warnings,
            'invalid_legacy_actor_updates',
            'actorUpdates was not an array and was ignored.',
        );
    }
    (
        Array.isArray(
            payload.actorUpdates,
        )
            ? payload.actorUpdates
            : []
    ).forEach(update => {
        if (
            update &&
            typeof update ===
                'object' &&
            !Array.isArray(update) &&
            update.id
        ) {
            mergeActorUpdate(
                actorUpdates,
                String(update.id),
                update,
            );
        }
    });
    const itemUpdates =
        Array.isArray(
            payload.itemUpdates,
        )
            ? [...payload.itemUpdates]
            : [];
    const entrances =
        Array.isArray(
            payload
                .temporaryActorEntrances,
        )
            ? [
                ...payload
                    .temporaryActorEntrances,
            ]
            : [];
    const revealedClues =
        Array.isArray(
            payload.revealedClues,
        )
            ? [...payload.revealedClues]
            : [];

    payload.stateProposals
        .forEach(proposal => {
            if (
                !proposal ||
                typeof proposal !==
                    'object' ||
                Array.isArray(proposal) ||
                !NARRATIVE_STATE_PROPOSAL_TYPES
                    .has(proposal.type)
            ) {
                appendSettlementWarning(
                    warnings,
                    'unknown_state_proposal',
                    proposal?.type ||
                        'non-object proposal',
                );
                return;
            }
            const actorId = String(
                proposal.actorId || '',
            );
            if (
                [
                    'actor_activity',
                    'actor_move',
                    'actor_enter',
                    'actor_exit',
                    'social_hint',
                ].includes(
                    proposal.type,
                ) &&
                !actorId
            ) {
                appendSettlementWarning(
                    warnings,
                    'proposal_missing_actor',
                    proposal.type,
                );
                return;
            }
            if (
                proposal.type ===
                    'actor_activity'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        currentActivityEn:
                            proposal
                                .currentActivityEn,
                    },
                );
            } else if (
                proposal.type ===
                    'actor_move'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        currentActivityEn:
                            proposal
                                .currentActivityEn,
                        mapId:
                            proposal.mapId,
                        roomId:
                            proposal.roomId,
                    },
                );
            } else if (
                proposal.type ===
                    'actor_enter' ||
                proposal.type ===
                    'actor_exit'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        present:
                            proposal.type ===
                                'actor_enter',
                        currentActivityEn:
                            proposal
                                .currentActivityEn,
                        ...(proposal.mapId
                            ? {
                                mapId:
                                    proposal
                                        .mapId,
                            }
                            : {}),
                        ...(proposal.roomId
                            ? {
                                roomId:
                                    proposal
                                        .roomId,
                            }
                            : {}),
                    },
                );
            } else if (
                proposal.type ===
                    'social_hint'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        firstImpressionOfPlayerEn:
                            proposal
                                .firstImpressionOfPlayerEn,
                        impressionOfPlayerEn:
                            proposal
                                .impressionOfPlayerEn,
                        memoryUpdate:
                            proposal.memoryUpdate,
                    },
                );
            } else if (
                proposal.type ===
                    'item_update'
            ) {
                if (
                    proposal.item &&
                    typeof proposal.item ===
                        'object' &&
                    !Array.isArray(
                        proposal.item,
                    )
                ) {
                    itemUpdates.push(
                        proposal.item,
                    );
                } else {
                    appendSettlementWarning(
                        warnings,
                        'proposal_missing_item',
                        'item_update',
                    );
                }
            } else if (
                proposal.type ===
                    'temporary_actor'
            ) {
                const actor =
                    proposal.actor;
                if (
                    actor &&
                    typeof actor ===
                        'object' &&
                    !Array.isArray(actor)
                ) {
                    entrances.push(actor);
                    mergeActorUpdate(
                        actorUpdates,
                        String(
                            actor.id || '',
                        ),
                        {
                            present: true,
                            currentActivityEn:
                                proposal
                                    .currentActivityEn ||
                                actor
                                    .currentActivityEn,
                        },
                    );
                } else {
                    appendSettlementWarning(
                        warnings,
                        'proposal_missing_temporary_actor',
                        'temporary_actor',
                    );
                }
            } else if (
                proposal.type ===
                    'clue_reveal'
            ) {
                if (
                    proposal.clue &&
                    typeof proposal.clue ===
                        'object' &&
                    !Array.isArray(
                        proposal.clue,
                    )
                ) {
                    revealedClues.push(
                        proposal.clue,
                    );
                }
            }
        });
    payload.actorUpdates = [
        ...actorUpdates.values(),
    ];
    payload.itemUpdates =
        itemUpdates;
    payload.temporaryActorEntrances =
        entrances;
    payload.revealedClues =
        revealedClues;
    return payload;
}

function sanitizeNarrativeActorUpdates(
    payload,
    worldState,
) {
    const warnings =
        payload.settlementWarnings;
    const temporaryIds = new Set(
        (
            payload
                .temporaryActorEntrances ||
            []
        ).map(actor =>
            actor.id),
    );
    const knownActors = new Map(
        (
            worldState.actors ||
            []
        ).map(actor => [
            actor.id,
            actor,
        ]),
    );
    const validActorIds = new Set([
        ...knownActors.keys(),
        ...(
            worldState
                .actorLibrary ||
            []
        ).map(actor =>
            actor.id),
        ...temporaryIds,
    ]);
    const allowedKeys = new Set([
        'id',
        'present',
        'currentActivityEn',
        'mapId',
        'roomId',
        'firstImpressionOfPlayerEn',
        'impressionOfPlayerEn',
        'memoryUpdate',
    ]);
    const merged = new Map();
    (
        payload.actorUpdates || []
    ).forEach(source => {
        if (
            !source ||
            typeof source !==
                'object' ||
            Array.isArray(source) ||
            !validActorIds.has(
                source.id,
            )
        ) {
            appendSettlementWarning(
                warnings,
                'invalid_actor_proposal',
                source?.id || '?',
            );
            return;
        }
        const update =
            Object.fromEntries(
                Object.entries(source)
                    .filter(([key]) =>
                        allowedKeys.has(
                            key,
                        )),
            );
        if (
            update.present !==
                undefined &&
            typeof update.present !==
                'boolean'
        ) {
            delete update.present;
            appendSettlementWarning(
                warnings,
                'invalid_actor_presence_hint',
                update.id,
            );
        }
        if (
            update.currentActivityEn !=
                null
        ) {
            update.currentActivityEn =
                String(
                    update
                        .currentActivityEn ||
                    '',
                ).trim();
            if (
                !update
                    .currentActivityEn
            ) {
                delete update
                    .currentActivityEn;
            }
        }
        const actor =
            knownActors.get(update.id);
        if (
            update.mapId ||
            update.roomId
        ) {
            const currentMapId =
                actor?.mapId ||
                worldState.map
                    ?.activeMapId;
            const currentRoomId =
                actor?.roomId ||
                worldState.map
                    ?.currentLocalNodeId;
            const targetMapId =
                update.mapId ||
                currentMapId;
            const validRoute =
                targetMapId ===
                    currentMapId &&
                update.roomId &&
                findLocalRoomPath(
                    targetMapId,
                    currentRoomId,
                    update.roomId,
                    worldState.map,
                );
            if (!validRoute) {
                delete update.mapId;
                delete update.roomId;
                appendSettlementWarning(
                    warnings,
                    'invalid_actor_move_proposal',
                    update.id,
                );
            } else {
                update.mapId =
                    targetMapId;
            }
        }
        if (
            update.present ===
                false &&
            !update.currentActivityEn
        ) {
            update.currentActivityEn =
                'Leaving the immediate scene.';
        }
        const meaningfulKeys =
            Object.keys(update)
                .filter(key =>
                    key !== 'id');
        if (
            !meaningfulKeys.length
        ) {
            return;
        }
        mergeActorUpdate(
            merged,
            update.id,
            update,
        );
    });
    payload.actorUpdates = [
        ...merged.values(),
    ];
    return payload;
}

function sanitizeNarrativeTemporaryActors(
    payload,
    worldState,
) {
    const warnings =
        payload.settlementWarnings;
    const accepted = [];
    const canonicalRedirects =
        new Map();
    const knownCanonActorIds =
        new Map();
    [
        ...(worldState
            .actorLibrary || []),
        ...(worldState.actors || []),
    ].forEach(actor => {
        const canon =
            findCanonCharacter(
                actor.canonCatalogId,
            ) ||
            findCanonCharacter(
                actor.id,
            ) ||
            findCanonCharacter(
                actor.nameEn,
            );
        if (
            canon &&
            (
                !knownCanonActorIds.has(
                    canon.id,
                ) ||
                actor.id === canon.id
            )
        ) {
            knownCanonActorIds.set(
                canon.id,
                actor.id,
            );
        }
    });
    (
        payload
            .temporaryActorEntrances ||
        []
    ).forEach(actor => {
        const canon =
            findCanonCharacter(
                actor?.id,
            ) ||
            findCanonCharacter(
                actor?.nameEn,
            );
        const knownActorId =
            canon
                ? knownCanonActorIds.get(
                    canon.id,
                )
                : '';
        if (canon && knownActorId) {
            canonicalRedirects.set(
                actor.id,
                knownActorId,
            );
            return;
        }
        if (canon) {
            appendSettlementWarning(
                warnings,
                'canon_actor_cannot_be_temporary',
                `${actor.nameEn || actor.id} 必须由 Canon 目录以稳定 ID ${canon.id} 入场。`,
            );
            return;
        }
        const validation =
            validateTemporaryActorEntrances(
                [actor],
                {
                    ...worldState,
                    actors: [
                        ...(
                            worldState
                                .actors ||
                            []
                        ),
                        ...accepted,
                    ],
                },
            );
        if (!validation.valid) {
            appendSettlementWarning(
                warnings,
                'invalid_temporary_actor_proposal',
                validation.errors
                    .join('；'),
            );
            return;
        }
        accepted.push(actor);
    });
    payload.temporaryActorEntrances =
        accepted;
    if (!canonicalRedirects.size) {
        return payload;
    }
    const redirectId = actorId =>
        canonicalRedirects.get(
            actorId,
        ) || actorId;
    payload.segments = (
        payload.segments || []
    ).map(segment => ({
        ...segment,
        ...(segment.actorId
            ? {
                actorId:
                    redirectId(
                        segment.actorId,
                    ),
            }
            : {}),
    }));
    if (
        Array.isArray(
            payload.actorPresence
                ?.presentActorIdsAfterTurn,
        )
    ) {
        payload.actorPresence
            .presentActorIdsAfterTurn = [
                ...new Set(
                    payload.actorPresence
                        .presentActorIdsAfterTurn
                        .map(redirectId),
                ),
            ];
    }
    const actorUpdates =
        new Map();
    (
        payload.actorUpdates || []
    ).forEach(update => {
        const actorId =
            redirectId(update.id);
        mergeActorUpdate(
            actorUpdates,
            actorId,
            {
                ...update,
                id: actorId,
            },
        );
    });
    payload.actorUpdates = [
        ...actorUpdates.values(),
    ];
    return payload;
}

function sanitizeNarrativeItemsAndClues(
    payload,
    worldState,
    playerAction,
) {
    const warnings =
        payload.settlementWarnings;
    const narrative = (
        payload.segments || []
    )
        .map(segment =>
            segment.textEn)
        .join(' ');
    payload.itemUpdates = (
        payload.itemUpdates || []
    ).filter(update => {
        const errors =
            validateItemUpdates(
                [update],
                worldState,
                playerAction,
                narrative,
                {
                    requireNarrativeAcquisition:
                        false,
                },
            );
        if (errors.length) {
            appendSettlementWarning(
                warnings,
                'invalid_item_proposal',
                errors.join('；'),
            );
            return false;
        }
        return true;
    });
    if (
        IMPORTANT_ITEM_PATTERN.test(
            narrative,
        ) &&
        DURABLE_ACQUISITION_PATTERN
            .test(narrative) &&
        !payload.itemUpdates.some(
            update =>
                update.action ===
                    'acquire',
        )
    ) {
        appendSettlementWarning(
            warnings,
            'possible_untracked_item',
            'The narrative may contain an important item acquisition without a valid item proposal.',
        );
    }
    const activeArc = (
        worldState.storyArcs ||
        []
    ).find(arc =>
        arc.status === 'active');
    const clueIds = new Set(
        (
            activeArc?.cluePlan ||
            []
        ).map(clue =>
            clue.id),
    );
    payload.revealedClues = (
        payload.revealedClues ||
        []
    ).filter(clue => {
        const valid =
            clueIds.has(clue?.id) &&
            String(
                clue?.labelEn || '',
            ).trim() &&
            String(
                clue?.detailEn || '',
            ).trim();
        if (!valid) {
            appendSettlementWarning(
                warnings,
                'invalid_clue_proposal',
                clue?.id || '?',
            );
        }
        return valid;
    });
    return payload;
}

export function reconcileNarrativeTurnAuthority(
    source,
    worldState,
    {
        playerAction = '',
        admittedActors = [],
    } = {},
) {
    let payload =
        foldNarrativeTurnProposals(
            source,
        );
    payload.publicEventEn =
        deriveNarrativePublicEvent(
            payload,
        );
    payload =
        recoverImplicitTemporaryActorEntrances(
            payload,
            worldState,
        );
    payload =
        sanitizeNarrativeTemporaryActors(
            payload,
            worldState,
        );
    payload =
        sanitizeNarrativeActorUpdates(
            payload,
            worldState,
        );
    payload =
        sanitizeNarrativeItemsAndClues(
            payload,
            worldState,
            playerAction,
        );
    if (
        payload.actorPresence != null
    ) {
        const presenceErrors =
            validateActorPresenceResolution(
                payload.actorPresence,
                worldState,
                payload.actorUpdates,
                {
                    authorizedEntranceIds:
                        (
                            payload
                                .temporaryActorEntrances ||
                            []
                        ).map(actor =>
                            actor.id),
                },
            );
        if (presenceErrors.length) {
            appendSettlementWarning(
                payload
                    .settlementWarnings,
                'invalid_actor_presence_snapshot',
                presenceErrors
                    .join('；'),
            );
            delete payload.actorPresence;
        }
    }
    payload =
        normalizeScenePerformanceActorLocations(
            payload,
            worldState,
        );
    payload =
        ensureMentionedKnownActorMemories(
            payload,
            worldState,
            admittedActors,
        );
    return payload;
}

export function finalizeNarrativeTurnPerformance(
    source,
    {
        movementResolution = null,
        momentumDirective = null,
        checkResolution = null,
    } = {},
) {
    const payload =
        normalizeNarrativeTurnCore(
            source,
        );
    const signals =
        payload.signals || {};
    payload.publicEventEn =
        deriveNarrativePublicEvent(
            payload,
        );
    payload.eventEnded =
        typeof signals.eventEnded ===
            'boolean'
            ? signals.eventEnded
            : payload.eventEnded ===
                true;
    payload.pacingBeatRealized =
        typeof signals
            .pacingBeatRealized ===
            'boolean'
            ? signals
                .pacingBeatRealized
            : payload
                .pacingBeatRealized ===
                true;
    payload.checkApplied =
        Boolean(checkResolution);
    const proposedProgression =
        signals.sceneProgression ||
        payload.sceneProgression;
    const progressionTypes =
        new Set([
            'npc_initiative',
            'access_change',
            'practical_step',
            'new_information',
            'social_shift',
        ]);
    payload.sceneProgression =
        proposedProgression &&
        typeof proposedProgression ===
            'object' &&
        !Array.isArray(
            proposedProgression,
        ) &&
        progressionTypes.has(
            proposedProgression.type,
        ) &&
        String(
            proposedProgression
                .summaryEn ||
            '',
        ).trim()
            ? {
                type:
                    proposedProgression
                        .type,
                summaryEn:
                    compactNarrativeEventText(
                        proposedProgression
                            .summaryEn,
                    ),
                completedRequestedStep:
                    proposedProgression
                        .completedRequestedStep ===
                    true,
            }
            : {
                type:
                    movementResolution
                        ?.moved
                        ? 'access_change'
                        : checkResolution
                            ? 'practical_step'
                            : 'social_shift',
                summaryEn:
                    payload
                        .publicEventEn,
                completedRequestedStep:
                    false,
            };
    payload.settlementWarnings = [
        ...new Map(
            (
                payload
                    .settlementWarnings ||
                []
            ).map(warning => [
                `${warning.code}:${warning.detail}`,
                warning,
            ]),
        ).values(),
    ].slice(-24);
    if (
        momentumDirective
            ?.explicitProgressionRequest &&
        !payload.sceneProgression
            .completedRequestedStep
    ) {
        appendSettlementWarning(
            payload
                .settlementWarnings,
            'unconfirmed_requested_progression',
            'The narrative was accepted without a structured completion signal.',
        );
    }
    delete payload.stateProposals;
    delete payload.signals;
    return payload;
}

export function settleNarrativeTurnPerformance(
    source,
    worldState,
    options = {},
) {
    const core =
        normalizeNarrativeTurnCore(
            source,
        );
    const folded =
        foldNarrativeTurnProposals(
            core,
        );
    const reconciled =
        reconcileNarrativeTurnAuthority(
            folded,
            worldState,
            {
                playerAction:
                    options.playerAction,
                admittedActors:
                    options
                        .admittedActors ||
                    [],
            },
        );
    return finalizeNarrativeTurnPerformance(
        reconciled,
        options,
    );
}

export function validateScenePerformance(
    payload,
    worldState,
    budget,
    momentumDirective = null,
    checkResolution = null,
    movementResolution = null,
    temporalSourceText = '',
) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, errors: ['现场表演必须是对象。'] };
    }
    const narrativeFirst =
        Number(
            payload.protocolVersion ||
            0,
        ) >=
        NARRATIVE_TURN_PROTOCOL_VERSION;

    const temporaryValidation =
        validateTemporaryActorEntrances(
            payload
                .temporaryActorEntrances ??
            [],
            worldState,
        );
    errors.push(
        ...temporaryValidation.errors,
    );
    const temporaryActorIds = new Set(
        temporaryValidation.ids,
    );
    const presentActorIds = new Set([
        ...(
            (worldState.actors || [])
                .filter(actor => actor.present !== false)
                .map(actor => actor.id)
        ),
        ...temporaryActorIds,
    ]);
    const presentActors = new Map(
        [
            ...(worldState.actors || [])
                .filter(actor => actor.present !== false)
                .map(actor => [actor.id, actor]),
            ...(payload
                .temporaryActorEntrances ||
                [])
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        ],
    );
    const actorProfiles = new Map(
        (worldState.actorLibrary || [])
            .map(actor => [
                actor.id,
                normalizeActorMemoryProfile(
                    actor,
                    presentActors.get(actor.id),
                ),
            ]),
    );
    const publicEvent = String(payload.publicEventEn || '').trim();
    if (
        !narrativeFirst &&
        (
            !publicEvent ||
            /player completes|player acts|characters respond/i
                .test(publicEvent)
        )
    ) {
        errors.push('现场记录必须是具体事件摘要，不能使用通用占位句。');
    }
    if (
        !narrativeFirst &&
        typeof payload.eventEnded !==
        'boolean') {
        errors.push(
            '低档必须明确提交 eventEnded 布尔信号。',
        );
    }
    if (
        !narrativeFirst &&
        checkResolution &&
        payload.checkApplied !== true
    ) {
        errors.push('低档必须明确执行已提交的本地判定结果。');
    }
    if (
        !narrativeFirst &&
        !checkResolution &&
        payload.checkApplied === true
    ) {
        errors.push('没有本地判定时，低档不得声称执行了判定。');
    }

    const segments = Array.isArray(payload.segments) ? payload.segments : [];
    if (segments.length < 1 || segments.length > 24) {
        errors.push('现场表演必须包含 1–24 个分段。');
    }
    segments.forEach(segment => {
        const text =
            String(
                segment.textEn || '',
            ).trim();
        const placeholderOnly =
            /^(?:[.\u2026…\-_*~\s]+|tbd|todo|placeholder|same as above)$/iu
                .test(text);
        if (!['narration', 'dialogue'].includes(segment.type) ||
            !text) {
            errors.push('现场表演包含无效或空白分段。');
        } else if (placeholderOnly) {
            errors.push(
                '现场表演分段不能只包含省略号或占位文本。',
            );
        }
        if (segment.type === 'dialogue' && !presentActorIds.has(segment.actorId)) {
            errors.push(`现场对白引用了不存在的在场角色 ${segment.actorId || '?'}。`);
        }
    });
    const temporalValidation =
        validateSceneTemporalConsistency(
            payload,
            worldState,
            budget,
            temporalSourceText,
        );
    errors.push(...temporalValidation.errors);
    const inventoryNarrative = [
        payload.publicEventEn,
        payload.sceneProgression?.summaryEn,
        ...segments.map(segment =>
            segment.textEn),
        ...(payload.actorUpdates || [])
            .flatMap(update => [
                update.memoryUpdate
                    ?.summaryEn,
                update.memoryUpdate
                    ?.lastingImpactEn,
            ]),
    ].filter(Boolean).join(' ');
    errors.push(...validateItemUpdates(
        payload.itemUpdates ?? [],
        worldState,
        temporalSourceText,
        inventoryNarrative,
        {
            requireNarrativeAcquisition:
                !narrativeFirst,
        },
    ));
    if (movementResolution?.moved) {
        const destinationMap =
            getLocalMapDefinition(
                movementResolution.toMapId,
                worldState.map,
            );
        const destinationRoom = getMapRooms(
            destinationMap,
            worldState.map,
        ).find(room =>
            room.id === movementResolution.toRoomId);
        const arrivalLabels = [
            movementResolution.toRoomNameEn,
            destinationRoom?.nameEn,
            ...(destinationRoom?.aliases || []),
            String(
                movementResolution.toRoomId || '',
            ).replace(/_/g, ' '),
        ]
            .map(normalizeSpatialText)
            .filter(label =>
                label.length >= 4 &&
                /[a-z]/i.test(label));
        const arrivalCorpus = normalizeSpatialText([
            publicEvent,
            payload.sceneProgression?.summaryEn,
            ...segments.map(segment =>
                segment.textEn),
        ].filter(Boolean).join(' '));
        if (arrivalLabels.length &&
            !arrivalLabels.some(label =>
                arrivalCorpus.includes(label))) {
            errors.push(
                `已提交移动必须在本回合明确抵达 ${movementResolution.toRoomName || movementResolution.toRoomNameEn || movementResolution.toRoomId}，不能停在途中。`,
            );
        }
    }

    if (
        momentumDirective?.required &&
        !narrativeFirst
    ) {
        const progression = payload.sceneProgression;
        const allowedProgressionTypes = new Set([
            'npc_initiative',
            'access_change',
            'practical_step',
            'new_information',
            'social_shift',
        ]);
        if (!progression ||
            typeof progression !== 'object' ||
            Array.isArray(progression)) {
            errors.push('15 分钟现场必须包含 sceneProgression。');
        } else {
            if (!allowedProgressionTypes.has(progression.type)) {
                errors.push('sceneProgression.type 无效。');
            }
            const summary = String(
                progression.summaryEn || '',
            ).trim();
            if (!summary) {
                errors.push('sceneProgression 缺少已完成的具体变化。');
            }
            const checkBlocksCompletion =
                [
                    'catastrophic_failure',
                    'failure',
                ].includes(
                    checkResolution
                        ?.outcome,
                );
            if (
                momentumDirective
                    .explicitProgressionRequest &&
                !checkBlocksCompletion &&
                progression.completedRequestedStep !== true) {
                errors.push('玩家明确要求的程序性推进没有在本回合完成。');
            }
            if (
                momentumDirective
                    .explicitProgressionRequest &&
                !checkBlocksCompletion &&
                /\b(?:prepares?|preparing|about to|ready to|waits? to|will|intends? to)\b/i.test(summary)) {
                errors.push('程序性推进停在了准备阶段，必须完成动作后再停。');
            }
        }
    }

    const actorUpdates = payload.actorUpdates === undefined
        ? []
        : payload.actorUpdates;
    if (!Array.isArray(actorUpdates)) {
        errors.push('actorUpdates 必须是数组。');
    } else {
        if (
            movementResolution?.moved &&
            !narrativeFirst
        ) {
            const updatesByActor = new Map(
                actorUpdates.map(update => [
                    update.id,
                    update,
                ]),
            );
            (movementResolution.companionIds || [])
                .forEach(actorId => {
                    const update =
                        updatesByActor.get(actorId);
                    if (
                        !update ||
                        update.mapId !==
                            movementResolution.toMapId ||
                        update.roomId !==
                            movementResolution.toRoomId ||
                        !String(
                            update.currentActivityEn || '',
                        ).trim()
                    ) {
                        errors.push(
                            `同行者 ${actorId} 必须更新到已提交目的地并刷新当前活动。`,
                        );
                    }
                });
        }
        const initialSpatialActors = new Map(
            buildSpatialContext(worldState).actors
                .map(actor => [actor.id, actor]),
        );
        const allowedUpdateKeys = new Set([
            'id',
            'present',
            'currentActivityEn',
            'mapId',
            'roomId',
            'firstImpressionOfPlayerEn',
            'impressionOfPlayerEn',
            'memoryUpdate',
        ]);
        actorUpdates.forEach(update => {
            if (!presentActorIds.has(update.id) ||
                (
                    !narrativeFirst &&
                    !String(
                        update
                            .currentActivityEn ||
                        '',
                    ).trim()
                )) {
                errors.push(`现场人物更新 ${update.id || '?'} 无效。`);
            }
            if (update.present !== undefined && typeof update.present !== 'boolean') {
                errors.push(`现场人物更新 ${update.id || '?'} 的 present 必须是布尔值。`);
            }
            if (update.mapId || update.roomId) {
                const actor = presentActors.get(update.id);
                const mapId = update.mapId || actor?.mapId ||
                    worldState.map?.activeMapId;
                const fromRoomId = actor?.roomId ||
                    worldState.map?.currentLocalNodeId;
                if (mapId !== (actor?.mapId || worldState.map?.activeMapId)) {
                    errors.push(`低档现场人物 ${update.id || '?'} 不能跨地图移动。`);
                } else if (!update.roomId || !findLocalRoomPath(
                    mapId,
                    fromRoomId,
                    update.roomId,
                    worldState.map,
                )) {
                    errors.push(`现场人物 ${update.id || '?'} 的目标房间不可达。`);
                }
            }
            if (
                update
                    .firstImpressionOfPlayerEn !=
                    null
            ) {
                let spatial =
                    initialSpatialActors.get(
                        update.id,
                    );
                if (
                    !spatial?.canSeePlayer &&
                    (update.mapId ||
                        update.roomId)
                ) {
                    const projectedState = {
                        ...worldState,
                        actors: (
                            worldState.actors ||
                            []
                        ).map(actor =>
                            actor.id ===
                                update.id
                                ? {
                                    ...actor,
                                    mapId:
                                        update.mapId ||
                                        actor.mapId,
                                    roomId:
                                        update.roomId ||
                                        actor.roomId,
                                }
                                : actor),
                    };
                    spatial = buildSpatialContext(
                        projectedState,
                    ).actors.find(actor =>
                        actor.id ===
                            update.id);
                }
                if (!spatial?.canSeePlayer) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 无法看见玩家，不得形成外貌初见印象。`,
                    );
                }
                if (!isValidFirstImpression(
                    update
                        .firstImpressionOfPlayerEn,
                )) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
                    );
                }
                if (
                    actorProfiles.get(
                        update.id,
                    )
                        ?.firstImpressionOfPlayerEn
                ) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 已有初见印象，不得覆盖。`,
                    );
                }
            }
            if (
                update.impressionOfPlayerEn != null ||
                update.memoryUpdate != null
            ) {
                if (
                    temporaryActorIds.has(
                        update.id,
                    )
                ) {
                    if (
                        update
                            .impressionOfPlayerEn !=
                        null
                    ) {
                        errors.push(
                            `临时人物 ${update.id} 不得形成正式玩家印象。`,
                        );
                    }
                } else {
                    let spatial =
                    initialSpatialActors.get(update.id);
                    if (
                        !spatial?.canSeePlayer &&
                    !spatial?.canHearPlayer &&
                    (update.mapId || update.roomId)
                    ) {
                        const projectedState = {
                            ...worldState,
                            actors: (worldState.actors || [])
                                .map(actor =>
                                    actor.id === update.id
                                        ? {
                                            ...actor,
                                            mapId:
                                            update.mapId ||
                                            actor.mapId,
                                            roomId:
                                            update.roomId ||
                                            actor.roomId,
                                        }
                                        : actor),
                        };
                        spatial = buildSpatialContext(
                            projectedState,
                        ).actors.find(actor =>
                            actor.id === update.id);
                    }
                    if (
                        !spatial?.canSeePlayer &&
                    !spatial?.canHearPlayer
                    ) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 无法看见或听见玩家，不得形成玩家印象或共同记忆。`,
                        );
                    }
                }
            }
            if (update.impressionOfPlayerEn != null) {
                const impression = String(
                    update.impressionOfPlayerEn || '',
                ).trim();
                const previous =
                    actorProfiles.get(update.id);
                const previousImpression =
                    String(
                        previous
                            ?.impressionOfPlayerEn ||
                        '',
                    ).trim();
                const turnsSinceUpdate =
                    Math.max(
                        0,
                        Number(
                            worldState.turn
                                ?.count || 0,
                        ) -
                        Number(
                            previous
                                ?.impressionUpdatedTurn ||
                            0,
                        ),
                    );
                if (!isValidImpressionShorthand(
                    impression,
                )) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的玩家印象必须是 1–${IMPRESSION_MAX_WORDS} 词的主观 shorthand，不能复述本轮动作。`,
                    );
                } else if (
                    previousImpression &&
                    memoryFingerprint(
                        previousImpression,
                    ) !==
                        memoryFingerprint(
                            impression,
                        ) &&
                    turnsSinceUpdate <
                        IMPRESSION_UPDATE_COOLDOWN_TURNS
                ) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的玩家印象过于频繁变化；普通证据至少间隔 ${IMPRESSION_UPDATE_COOLDOWN_TURNS} 回合。`,
                    );
                }
            }
            if (update.memoryUpdate != null) {
                const memory = update.memoryUpdate;
                if (!memory ||
                    typeof memory !== 'object' ||
                    Array.isArray(memory)) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的 memoryUpdate 必须是对象。`,
                    );
                } else {
                    const summary = String(
                        memory.summaryEn || '',
                    ).trim();
                    const wordCount = summary
                        .split(/\s+/)
                        .filter(Boolean)
                        .length;
                    if (!summary || wordCount > 40) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 的共同记忆必须具体且不超过 40 词。`,
                        );
                    }
                    if (![
                        'everyday',
                        'notable',
                    ].includes(memory.significance)) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 的共同记忆显著度无效。`,
                        );
                    }
                    const lastingImpactEn =
                        String(
                            memory
                                .lastingImpactEn ||
                            '',
                        ).trim();
                    if (
                        memory.significance ===
                            'notable' &&
                        (
                            !lastingImpactEn ||
                            countTextWords(
                                lastingImpactEn,
                            ) > 24
                        )
                    ) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 的 notable 记忆必须说明 24 词内的长期影响。`,
                        );
                    }
                    const unauthorizedMemoryKeys =
                        Object.keys(memory).filter(key =>
                            ![
                                'summaryEn',
                                'significance',
                                'lastingImpactEn',
                            ].includes(key));
                    if (unauthorizedMemoryKeys.length) {
                        errors.push(
                            `低档不得直接写入共同记忆字段：${unauthorizedMemoryKeys.join(', ')}。`,
                        );
                    }
                }
            }
            const unauthorizedKeys = Object.keys(update)
                .filter(key => !allowedUpdateKeys.has(key));
            if (unauthorizedKeys.length) {
                errors.push(
                    `低档现场表演者不得写入 ${update.id || '?'} 的字段：${unauthorizedKeys.join(', ')}。`,
                );
            }
        });
    }
    errors.push(
        ...validateActorPresenceResolution(
            payload.actorPresence,
            worldState,
            actorUpdates,
            {
                required:
                    !narrativeFirst,
                authorizedEntranceIds:
                    temporaryValidation.ids,
            },
        ),
    );

    const pacingBeat = worldState.pacingDirector?.pendingBeat;
    if (pacingBeat?.status === 'pending') {
        if (
            !narrativeFirst &&
            payload.pacingBeatRealized !==
                true
        ) {
            errors.push('低档必须明确执行已提交的节奏转机。');
        }
        const introducedActorIds = [
            ...(pacingBeat.actorEntrances || [])
                .map(entry => entry.id),
            pacingBeat.guestActor?.id,
        ].filter(Boolean);
        const representedActorIds = new Set([
            ...segments
                .filter(segment => segment.type === 'dialogue')
                .map(segment => segment.actorId),
            ...(Array.isArray(actorUpdates)
                ? actorUpdates.map(update => update.id)
                : []),
        ]);
        introducedActorIds.forEach(actorId => {
            if (!representedActorIds.has(actorId)) {
                errors.push(`节奏转机的新入场人物 ${actorId} 未在现场中出现。`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

export function validateTurnTransaction(
    transaction,
    worldState,
    playerAction = '',
    {
        allowLocalizedTemporaryActorFields =
        false,
    } = {},
) {
    const errors = [];
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
        return { valid: false, errors: ['回合结算包必须是对象。'] };
    }
    const narrativeFirst =
        Number(
            transaction
                .protocolVersion ||
            0,
        ) >=
        NARRATIVE_TURN_PROTOCOL_VERSION;
    const elapsedMinutes = Number(transaction.elapsedMinutes);
    if (!Number.isInteger(elapsedMinutes) || elapsedMinutes < 0 || elapsedMinutes > 10080) {
        errors.push('elapsedMinutes 必须是 0–10080 的整数。');
    }
    if (!String(transaction.publicEventEn || '').trim()) {
        errors.push('回合结算必须包含玩家可知的事件摘要。');
    }
    if (
        transaction.eventEnded !==
            undefined &&
        typeof transaction.eventEnded !==
            'boolean'
    ) {
        errors.push(
            '回合 eventEnded 必须是布尔值。',
        );
    }
    if (transaction.checkResolution) {
        const checkValidation = validateCheckResolution(
            transaction.checkResolution,
            worldState,
        );
        errors.push(...checkValidation.errors);
    }
    if (
        transaction.spellCasts !==
            undefined
    ) {
        if (
            !Array.isArray(
                transaction
                    .spellCasts,
            )
        ) {
            errors.push(
                'spellCasts 必须是数组。',
            );
        } else {
            transaction
                .spellCasts
                .forEach(cast => {
                    if (
                        !getSpellDefinition(
                            cast
                                ?.spellId,
                        )
                    ) {
                        errors.push(
                            `spellCasts 引用了未知咒语 ${cast?.spellId || '?'}。`,
                        );
                    }
                });
        }
    }
    const temporaryValidation =
        validateTemporaryActorEntrances(
            transaction
                .temporaryActorEntrances ??
            [],
            worldState,
            {
                allowLocalizedDisplayFields:
                    allowLocalizedTemporaryActorFields,
            },
        );
    errors.push(
        ...temporaryValidation.errors,
    );
    const actorIds = new Set([
        ...(worldState.actorLibrary || [])
            .map(actor => actor.id),
        ...(worldState.actors || [])
            .map(actor => actor.id),
        ...temporaryValidation.ids,
    ]);
    const segments = Array.isArray(transaction.segments) ? transaction.segments : [];
    if (segments.length < 1 || segments.length > 24) {
        errors.push('回合叙事必须包含 1–24 个分段。');
    }
    segments.forEach(segment => {
        if (!['narration', 'dialogue'].includes(segment.type)) {
            errors.push('叙事分段类型只能是 narration 或 dialogue。');
        }
        if (!String(segment.textEn || '').trim()) {
            errors.push('叙事分段不能为空。');
        }
        if (segment.type === 'dialogue' && !actorIds.has(segment.actorId)) {
            errors.push(`对白引用了不存在的角色 ${segment.actorId || '?'}。`);
        }
    });
    const inventoryNarrative = [
        transaction.publicEventEn,
        transaction.sceneProgression
            ?.summaryEn,
        ...segments.map(segment =>
            segment.textEn),
    ].filter(Boolean).join(' ');
    errors.push(...validateItemUpdates(
        transaction.itemUpdates ?? [],
        worldState,
        playerAction,
        inventoryNarrative,
        {
            requireNarrativeAcquisition:
                !narrativeFirst,
        },
    ));
    (transaction.actorUpdates || []).forEach(update => {
        if (!actorIds.has(update.id)) {
            errors.push(`人物更新引用了不存在的角色 ${update.id || '?'}。`);
        }
        if (
            update
                .firstImpressionOfPlayerEn !=
                null &&
            !isValidFirstImpression(
                update
                    .firstImpressionOfPlayerEn,
            )
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
            );
        }
        if (
            update.impressionOfPlayerEn != null &&
            !isValidImpressionShorthand(
                update.impressionOfPlayerEn,
            )
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的玩家印象必须是 1–${IMPRESSION_MAX_WORDS} 词的主观 shorthand。`,
            );
        }
        if (update.memoryUpdate != null &&
            (
                !String(
                    update.memoryUpdate?.summaryEn || '',
                ).trim() ||
                ![
                    'everyday',
                    'notable',
                ].includes(
                    update.memoryUpdate?.significance,
                )
            )) {
            errors.push(`人物更新 ${update.id || '?'} 的共同记忆无效。`);
        }
        if (
            update.memoryUpdate
                ?.significance ===
                'notable' &&
            !String(
                update.memoryUpdate
                    ?.lastingImpactEn || '',
            ).trim()
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的 notable 记忆缺少长期影响。`,
            );
        }
        if (update.roomId) {
            const actor = (worldState.actors || [])
                .find(item => item.id === update.id);
            const mapId = update.mapId || actor?.mapId ||
                worldState.map?.activeMapId;
            const fromRoomId = actor?.roomId ||
                worldState.map?.currentLocalNodeId;
            if (!findLocalRoomPath(
                mapId,
                fromRoomId,
                update.roomId,
                worldState.map,
            )) {
                errors.push(`人物更新 ${update.id || '?'} 的房间不可达。`);
            }
        }
    });
    errors.push(
        ...validateActorPresenceResolution(
            transaction.actorPresence,
            worldState,
            transaction.actorUpdates,
            {
                authorizedEntranceIds:
                    temporaryValidation.ids,
            },
        ),
    );
    const activeArc = (worldState.storyArcs || []).find(arc => arc.status === 'active');
    const plannedClueIds = new Set((activeArc?.cluePlan || []).map(clue => clue.id));
    (transaction.revealedClues || []).forEach(clue => {
        if (!plannedClueIds.has(clue.id)) {
            errors.push(`回合试图揭示未预写的线索 ${clue.id || '?'}。`);
        }
        if (!String(clue.labelEn || '').trim() || !String(clue.detailEn || '').trim()) {
            errors.push(`揭示线索 ${clue.id || '?'} 缺少玩家可见内容。`);
        }
    });
    return { valid: errors.length === 0, errors };
}

export function createTurnRetryCheckpoint(
    worldState,
    {
        playerMessageId,
        assistantMessageId,
        playerAction,
        forceCheck = false,
    },
) {
    const baseState = structuredClone(worldState);
    delete baseState.turnRetry;
    baseState.turn = {
        ...(baseState.turn || {}),
        status: 'idle',
        error: '',
    };
    return {
        version: 1,
        playerMessageId,
        assistantMessageId,
        playerAction: String(playerAction || ''),
        forceCheck: Boolean(forceCheck),
        baseClock: baseState.clock,
        createdAt: new Date().toISOString(),
        baseState,
    };
}

export function restoreTurnRetryCheckpoint(
    checkpoint,
) {
    if (
        checkpoint?.version !== 1 ||
        !Number.isInteger(
            checkpoint.playerMessageId,
        ) ||
        !Number.isInteger(
            checkpoint.assistantMessageId,
        ) ||
        !String(checkpoint.playerAction || '').trim() ||
        !checkpoint.baseState ||
        typeof checkpoint.baseState !== 'object'
    ) {
        throw new Error('上一回合缺少可用的状态检查点。');
    }
    const restored = structuredClone(
        checkpoint.baseState,
    );
    delete restored.turnRetry;
    restored.turn = {
        ...(restored.turn || {}),
        status: 'idle',
        error: '',
    };
    const checkpointMovement =
        parseExplicitMovementDirective(
            checkpoint.playerAction,
        );
    const pacingMovement =
        parseExplicitMovementDirective(
            restored.pacingDirector
                ?.signals
                ?.playerAction ||
            '',
        );
    const rolledBackPacingAssessment =
        checkpoint.source ===
            'legacy_projection' ||
        (
            checkpointMovement &&
            pacingMovement &&
            normalizeSpatialText(
                checkpointMovement
                    .destinationText,
            ) ===
                normalizeSpatialText(
                    pacingMovement
                        .destinationText,
                )
        );
    if (
        rolledBackPacingAssessment &&
        Number(
            restored.pacingDirector
                ?.lastAssessedTurn ??
            -1,
        ) >=
            Number(
                restored.turn
                    ?.count ||
                0,
            )
    ) {
        restored.pacingDirector = {
            ...(restored
                .pacingDirector ||
            {}),
            status: 'idle',
            error: '',
            lastAssessedTurn: null,
            lastAssessedSceneId: '',
            assessment: null,
            assessedAt: '',
            signals: null,
            pendingBeat: null,
        };
    }
    return restored;
}

export function getAvailableTurnRollbackCheckpoint(
    worldState,
    chat,
) {
    const checkpoint =
        worldState?.turnRetry;
    if (
        worldState?.turn?.status !==
            'idle' ||
        checkpoint?.version !== 1 ||
        !checkpoint.baseState ||
        !Array.isArray(chat) ||
        !Number.isInteger(
            checkpoint.playerMessageId,
        ) ||
        !Number.isInteger(
            checkpoint.assistantMessageId,
        ) ||
        checkpoint.playerMessageId !==
            chat.length - 2 ||
        checkpoint.assistantMessageId !==
            chat.length - 1
    ) {
        return null;
    }
    const playerMessage =
        chat[
            checkpoint.playerMessageId
        ];
    const assistantMessage =
        chat[
            checkpoint.assistantMessageId
        ];
    if (
        playerMessage?.is_user !== true ||
        playerMessage.extra
            ?.hogwartsMud?.role !==
            'player_turn' ||
        assistantMessage?.is_user ===
            true ||
        assistantMessage?.extra
            ?.hogwartsMud?.role !==
            'scene_turn'
    ) {
        return null;
    }
    return checkpoint;
}

export function createLegacyTurnRollbackCheckpoint(
    worldState,
    chat,
) {
    if (
        worldState?.turn?.status !==
            'idle' ||
        !Array.isArray(chat) ||
        chat.length < 3
    ) {
        return null;
    }
    const assistantMessageId =
        chat.length - 1;
    const playerMessageId =
        assistantMessageId - 1;
    const previousAssistantMessageId =
        playerMessageId - 1;
    const assistantMessage =
        chat[assistantMessageId];
    const playerMessage =
        chat[playerMessageId];
    const previousAssistantMessage =
        chat[
            previousAssistantMessageId
        ];
    const transaction =
        assistantMessage?.extra
            ?.hogwartsMud
            ?.turnTransaction;
    const previousTransaction =
        previousAssistantMessage?.extra
            ?.hogwartsMud
            ?.turnTransaction;
    if (
        playerMessage?.is_user !== true ||
        playerMessage.extra
            ?.hogwartsMud?.role !==
            'player_turn' ||
        assistantMessage?.is_user ===
            true ||
        assistantMessage?.extra
            ?.hogwartsMud?.role !==
            'scene_turn' ||
        !transaction ||
        !previousTransaction
            ?.committedClock
    ) {
        return null;
    }
    const currentTurn =
        Math.max(
            1,
            Number(
                worldState.turn
                    ?.count ||
                1,
            ),
        );
    const previousTurn =
        currentTurn - 1;
    const baseState =
        structuredClone(
            worldState,
        );
    delete baseState.turnRetry;
    baseState.clock =
        previousTransaction
            .committedClock;
    baseState.turn = {
        ...(baseState.turn || {}),
        count: previousTurn,
        status: 'idle',
        error: '',
        lastElapsedMinutes:
            Number(
                previousTransaction
                    .elapsedMinutes ||
                0,
            ),
        lastResolvedAt:
            previousAssistantMessage
                .send_date ||
            '',
    };
    const latestClock =
        transaction
            .committedClock;
    const removeLatestTimelineEntry =
        entries => {
            const nextEntries =
                structuredClone(
                    entries || [],
                );
            const lastIndex =
                nextEntries.length - 1;
            if (
                lastIndex >= 0 &&
                (
                    !latestClock ||
                    nextEntries[lastIndex]
                        ?.clock ===
                        latestClock
                )
            ) {
                nextEntries.splice(
                    lastIndex,
                    1,
                );
            }
            return nextEntries;
        };
    if (baseState.scene) {
        baseState.scene
            .timelineEntries =
            removeLatestTimelineEntry(
                baseState.scene
                    .timelineEntries,
            );
    }
    baseState.timeline =
        removeLatestTimelineEntry(
            baseState.timeline,
        );
    const previousPresence =
        new Set(
            previousTransaction
                .actorPresence
                ?.presentActorIdsAfterTurn ||
            [],
        );
    const previousUpdates =
        new Map(
            (
                previousTransaction
                    .actorUpdates ||
                []
            ).map(update => [
                update.id,
                update,
            ]),
        );
    const temporaryActorIds =
        new Set(
            (
                transaction
                    .temporaryActorEntrances ||
                []
            ).map(actor =>
                actor.id),
        );
    const restoreActor =
        actor => {
            const update =
                previousUpdates.get(
                    actor.id,
                );
            return {
                ...actor,
                present:
                    previousPresence
                        .has(actor.id),
                ...(update
                    ? {
                        mapId:
                            update.mapId ||
                            actor.mapId,
                        roomId:
                            update.roomId ||
                            actor.roomId,
                        currentActivityEn:
                            update
                                .currentActivityEn ??
                            actor
                                .currentActivityEn,
                        currentActivity:
                            update
                                .currentActivity ??
                            update
                                .currentActivityEn ??
                            actor
                                .currentActivity,
                        currentIntentEn:
                            update
                                .currentIntentEn ??
                            actor
                                .currentIntentEn,
                        currentIntent:
                            update
                                .currentIntent ??
                            update
                                .currentIntentEn ??
                            actor
                                .currentIntent,
                    }
                    : {}),
            };
        };
    baseState.actors =
        (baseState.actors || [])
            .filter(actor =>
                !temporaryActorIds
                    .has(actor.id))
            .map(restoreActor);
    const stripCurrentTurnMemories =
        actor => {
            const nextActor = {
                ...actor,
            };
            if (
                nextActor
                    .sharedMemories
            ) {
                nextActor.sharedMemories = {
                    ...nextActor
                        .sharedMemories,
                };
                for (
                    const tier of [
                        'core',
                        'recent',
                        'everyday',
                    ]
                ) {
                    nextActor
                        .sharedMemories[
                            tier
                        ] = (
                            nextActor
                                .sharedMemories[
                                    tier
                                ] ||
                            []
                        ).filter(memory =>
                            Number(
                                memory
                                    .createdTurn ||
                                0,
                            ) <
                            currentTurn);
                }
            }
            return nextActor;
        };
    baseState.actorLibrary =
        (baseState.actorLibrary || [])
            .filter(actor =>
                !temporaryActorIds
                    .has(actor.id))
            .map(
                stripCurrentTurnMemories,
            );
    baseState.actors =
        baseState.actors.map(
            stripCurrentTurnMemories,
        );
    const committedMovement =
        worldState.spatial
            ?.lastMovement;
    const attemptedMovement =
        playerMessage.extra
            ?.hogwartsMud
            ?.movement;
    if (
        committedMovement?.moved ===
            true &&
        attemptedMovement
            ?.attempted === true &&
        attemptedMovement.toMapId ===
            committedMovement.toMapId &&
        attemptedMovement.toRoomId ===
            committedMovement.toRoomId
    ) {
        const fromMapId =
            committedMovement
                .fromMapId;
        const fromRoomId =
            committedMovement
                .fromRoomId;
        const fromMap =
            getLocalMapDefinition(
                fromMapId,
                baseState.map,
            );
        const fromRoom =
            getMapRooms(
                fromMap,
                baseState.map,
            ).find(room =>
                room.id ===
                    fromRoomId);
        baseState.map.activeMapId =
            fromMapId;
        baseState.map
            .currentLocalNodeId =
            fromRoomId;
        baseState.map.currentLevelId =
            fromRoom?.levelId ||
            fromMap?.defaultLevelId;
        baseState.location =
            committedMovement
                .fromRoomName ||
            fromRoom?.name ||
            fromRoom?.nameEn ||
            baseState.location;
        if (baseState.scene) {
            baseState.scene.mapId =
                fromMapId;
            baseState.scene.roomId =
                fromRoomId;
        }
        const companionIds =
            new Set(
                committedMovement
                    .companionIds ||
                [],
            );
        baseState.actors =
            baseState.actors.map(actor =>
                companionIds
                    .has(actor.id)
                    ? {
                        ...actor,
                        mapId:
                            fromMapId,
                        roomId:
                            fromRoomId,
                    }
                    : actor);
        baseState.items =
            (baseState.items || [])
                .map((item, index) => {
                    const normalized =
                        normalizeInventoryItem(
                            item,
                            index,
                            {
                                mapId:
                                    fromMapId,
                                roomId:
                                    fromRoomId,
                                clock:
                                    baseState
                                        .clock,
                            },
                        );
                    return normalized
                        .ownerId ===
                            'player' &&
                        [
                            'carried',
                            'equipped',
                        ].includes(
                            normalized
                                .custody,
                        )
                        ? {
                            ...normalized,
                            mapId:
                                fromMapId,
                            roomId:
                                fromRoomId,
                        }
                        : normalized;
                });
        if (baseState.scene) {
            baseState.scene.itemStates =
                createSceneItemStates(
                    baseState.items,
                    {
                        mapId:
                            fromMapId,
                        roomId:
                            fromRoomId,
                    },
                );
        }
        baseState.spatial = {
            ...(baseState.spatial || {}),
            version:
                SPATIAL_STATE_VERSION,
            player: {
                mapId:
                    fromMapId,
                roomId:
                    fromRoomId,
            },
            lastMovement: null,
        };
    }
    if (
        baseState.pacingDirector
            ?.pendingBeat
            ?.consumedTurn >=
        currentTurn
    ) {
        baseState.pacingDirector = {
            ...baseState
                .pacingDirector,
            status: 'idle',
            pendingBeat: null,
        };
        if (baseState.scene) {
            baseState.scene
                .pacingPressureEn =
                '';
        }
    }
    return {
        version: 1,
        playerMessageId,
        assistantMessageId,
        playerAction:
            String(
                playerMessage.mes ||
                '',
            ),
        forceCheck:
            Boolean(
                playerMessage.extra
                    ?.hogwartsMud
                    ?.requiresCheck,
            ),
        baseClock:
            baseState.clock,
        createdAt:
            new Date()
                .toISOString(),
        source:
            'legacy_projection',
        baseState,
    };
}

export function getFailedPlayerTurn(
    chat,
    turnState,
) {
    if (
        turnState?.status !== 'failed' ||
        !Array.isArray(chat) ||
        !chat.length
    ) {
        return null;
    }
    const messageId = chat.length - 1;
    const message = chat[messageId];
    if (
        message?.is_user !== true ||
        message.extra?.hogwartsMud?.role !==
            'player_turn'
    ) {
        return null;
    }
    return {
        messageId,
        playerAction:
            String(message.mes || ''),
        forceCheck:
            Boolean(
                message.extra.hogwartsMud
                    .requiresCheck,
            ),
        error:
            String(turnState.error || ''),
    };
}

export function findUnsettledTurn(
    chat,
    turnState,
) {
    if (
        !Array.isArray(chat) ||
        !chat.length
    ) {
        return null;
    }
    const lastMessageId =
        chat.length - 1;
    const lastMessage =
        chat[lastMessageId];
    if (
        lastMessage?.is_user ===
            true &&
        lastMessage.extra
            ?.hogwartsMud?.role ===
            'player_turn'
    ) {
        if (
            turnState?.status ===
            'failed'
        ) {
            return null;
        }
        return {
            playerMessageId:
                lastMessageId,
            assistantMessageId:
                null,
            playerAction:
                String(
                    lastMessage.mes ||
                    '',
                ),
            forceCheck:
                Boolean(
                    lastMessage.extra
                        .hogwartsMud
                        .requiresCheck,
                ),
        };
    }
    if (
        turnState?.status !==
        'resolving'
    ) {
        return null;
    }
    for (
        let messageId =
            lastMessageId;
        messageId >= 0;
        messageId--
    ) {
        const message =
            chat[messageId];
        if (message?.is_user) {
            break;
        }
        if (
            !message ||
            message.is_system ||
            message.extra
                ?.hogwartsMud?.role ===
                'opening_narrative' ||
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
        ) {
            continue;
        }
        const playerMessageId =
            chat
                .slice(
                    0,
                    messageId,
                )
                .findLastIndex(
                    candidate =>
                        candidate
                            ?.is_user ===
                            true,
                );
        const playerMessage =
            chat[playerMessageId];
        if (
            playerMessage?.extra
                ?.hogwartsMud?.role !==
                'player_turn'
        ) {
            return null;
        }
        return {
            playerMessageId,
            assistantMessageId:
                messageId,
            playerAction:
                String(
                    playerMessage.mes ||
                    '',
                ),
            forceCheck:
                Boolean(
                    playerMessage.extra
                        .hogwartsMud
                        .requiresCheck,
                ),
        };
    }
    return null;
}

export function applyTurnTransaction(worldState, transaction, playerAction = '') {
    const validation = validateTurnTransaction(
        transaction,
        worldState,
        playerAction,
        {
            allowLocalizedTemporaryActorFields:
                true,
        },
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    let next = structuredClone(worldState);
    const requestedMinutes = Number(transaction.elapsedMinutes);
    const allowShortMagicTurn =
        transaction.instantaneousMagic ===
            true &&
        Boolean(
            String(
                transaction
                    .exceptionReasonEn ||
                '',
            ).trim(),
        );
    const elapsedMinutes = allowShortMagicTurn
        ? requestedMinutes
        : Math.max(15, requestedMinutes);
    next.clock = advanceWorldClock(next.clock, elapsedMinutes);
    if (transaction.checkResolution) {
        next.checks = [
            ...(next.checks || []),
            {
                ...structuredClone(transaction.checkResolution),
                committedClock: next.clock,
            },
        ].slice(-100);
    }

    const committedTurn =
        Number(next.turn?.count || 0) + 1;
    const actorUpdates = new Map(
        (transaction.actorUpdates || []).map(update => [
            update.id,
            update,
        ]),
    );
    const settledPresentActorIds =
        Array.isArray(
            transaction.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? new Set(
                transaction.actorPresence
                    .presentActorIdsAfterTurn,
            )
            : null;
    (
        transaction
            .temporaryActorEntrances ||
        []
    ).forEach(actor => {
        const update =
            actorUpdates.get(actor.id);
        next.actors ??= [];
        next.actors.push({
            ...structuredClone(actor),
            name:
                actor.name ||
                actor.nameEn,
            aliases:
                buildActorNameAliases(
                    actor.nameEn,
                    actor.name,
                ),
            relationshipToPlayerEn:
                'scene acquaintance',
            relationshipToPlayer:
                '场景中的临时相识',
            currentActivityEn:
                update
                    ?.currentActivityEn ||
                actor.currentActivityEn,
            currentActivity:
                update
                    ?.currentActivity ||
                update
                    ?.currentActivityEn ||
                actor.currentActivityEn,
            present:
                settledPresentActorIds
                    ?.has(actor.id) ??
                true,
            temporary: true,
            provisionalActorId:
                actor.id,
            identityStatus:
                'provisional',
            temporaryMemories: [],
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusDetail:
                '存活。',
            lifeStatusSinceClock: '',
            mapId:
                update?.mapId ||
                next.map?.activeMapId,
            roomId:
                update?.roomId ||
                next.map
                    ?.currentLocalNodeId,
            source:
                'scene_temporary_actor',
            introducedClock:
                next.clock,
            introducedTurn:
                committedTurn,
        });
    });
    next.actorLibrary = (next.actorLibrary || []).map(
        profile => {
            const update = actorUpdates.get(profile.id);
            let normalized =
                normalizeActorMemoryProfile(profile);
            if (!update) return normalized;
            if (
                update
                    .firstImpressionOfPlayerEn
            ) {
                const seedCurrent =
                    hasGenericImpression(
                        normalized
                            .impressionOfPlayerEn,
                    );
                normalized = {
                    ...normalized,
                    firstImpressionOfPlayerEn:
                        update
                            .firstImpressionOfPlayerEn,
                    firstImpressionOfPlayer:
                        update
                            .firstImpressionOfPlayer ||
                        update
                            .firstImpressionOfPlayerEn,
                    firstImpressionClock:
                        next.clock,
                    firstImpressionTurn:
                        committedTurn,
                    firstImpressionPending:
                        false,
                    ...(seedCurrent
                        ? {
                            impressionOfPlayerEn:
                                update
                                    .firstImpressionOfPlayerEn,
                            impressionOfPlayer:
                                update
                                    .firstImpressionOfPlayer ||
                                update
                                    .firstImpressionOfPlayerEn,
                            impressionUpdatedClock:
                                next.clock,
                            impressionUpdatedTurn:
                                committedTurn,
                        }
                        : {}),
                };
            }
            if (update.impressionOfPlayerEn) {
                normalized = {
                    ...normalized,
                    impressionOfPlayerEn:
                        update.impressionOfPlayerEn,
                    impressionOfPlayer:
                        update.impressionOfPlayer ||
                        update.impressionOfPlayerEn,
                    impressionUpdatedClock: next.clock,
                    impressionUpdatedTurn: committedTurn,
                };
            }
            if (update.memoryUpdate?.summaryEn) {
                normalized = upsertSharedMemory(
                    normalized,
                    {
                        id: `${profile.id}_t${committedTurn}_everyday`,
                        summaryEn:
                            update.memoryUpdate.summaryEn,
                        summary:
                            update.memoryUpdate.summary ||
                            update.memoryUpdate.summaryEn,
                        firstClock: next.clock,
                        lastClock: next.clock,
                        createdTurn: committedTurn,
                        updatedTurn: committedTurn,
                        source: 'low',
                        significance:
                            update.memoryUpdate
                                .significance,
                        lastingImpactEn:
                            update.memoryUpdate
                                .lastingImpactEn ||
                            '',
                        lastingImpact:
                            update.memoryUpdate
                                .lastingImpact ||
                            update.memoryUpdate
                                .lastingImpactEn ||
                            '',
                    },
                    'everyday',
                );
            }
            return normalized;
        },
    );
    const profiles = new Map(
        next.actorLibrary.map(profile => [
            profile.id,
            profile,
        ]),
    );
    next.actors = (next.actors || []).map(actor => {
        const update = actorUpdates.get(actor.id);
        const profile = profiles.get(actor.id);
        if (!update && !profile) return actor;
        const temporaryMemories =
            actor.temporary &&
            update?.memoryUpdate
                ?.summaryEn
                ? [
                    ...(
                        actor
                            .temporaryMemories ||
                        []
                    ),
                    {
                        id:
                            `${actor.id}_t${committedTurn}_temporary`,
                        summaryEn:
                            update
                                .memoryUpdate
                                .summaryEn,
                        summary:
                            update
                                .memoryUpdate
                                .summary ||
                            update
                                .memoryUpdate
                                .summaryEn,
                        clock:
                            next.clock,
                        turn:
                            committedTurn,
                    },
                ].slice(-8)
                : actor
                    .temporaryMemories;
        return {
            ...actor,
            present:
                settledPresentActorIds
                    ? settledPresentActorIds
                        .has(actor.id)
                    : update?.present ??
                        actor.present,
            mapId: update?.mapId || actor.mapId ||
                next.map?.activeMapId,
            roomId: update?.roomId || actor.roomId ||
                next.map?.currentLocalNodeId,
            currentActivityEn:
                update?.currentActivityEn ||
                actor.currentActivityEn,
            currentIntentEn:
                update?.currentIntentEn ||
                actor.currentIntentEn,
            currentActivity:
                update?.currentActivity ||
                update?.currentActivityEn ||
                actor.currentActivity,
            currentIntent:
                update?.currentIntent ||
                update?.currentIntentEn ||
                actor.currentIntent,
            firstImpressionOfPlayerEn:
                profile
                    ?.firstImpressionOfPlayerEn ||
                actor
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    ?.firstImpressionOfPlayer ||
                actor
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile
                    ?.firstImpressionClock ||
                actor.firstImpressionClock,
            firstImpressionTurn:
                profile
                    ?.firstImpressionTurn ||
                actor.firstImpressionTurn,
            firstImpressionPending:
                profile
                    ?.firstImpressionPending ||
                false,
            impressionOfPlayerEn:
                profile?.impressionOfPlayerEn ||
                actor.impressionOfPlayerEn,
            impressionOfPlayer:
                profile?.impressionOfPlayer ||
                actor.impressionOfPlayer,
            impressionUpdatedClock:
                profile?.impressionUpdatedClock ||
                actor.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile?.impressionUpdatedTurn ||
                actor.impressionUpdatedTurn,
            ...(actor.temporary
                ? {
                    temporaryMemories:
                        temporaryMemories ||
                        [],
                }
                : {}),
        };
    });
    next.items = applyItemUpdates(
        next,
        transaction.itemUpdates || [],
    );
    next = applyMaterialEvents(
        next,
        transaction.materialEvents || [],
        {
            clock: next.clock,
            turn: committedTurn,
        },
    );
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId:
                        next.map?.activeMapId,
                    roomId:
                        next.map
                            ?.currentLocalNodeId,
                },
            );
    }

    const existingClueIds = new Set((next.clues || []).map(clue => clue.id));
    const revealedClues = (transaction.revealedClues || [])
        .filter(clue => !existingClueIds.has(clue.id))
        .map(clue => ({
            ...clue,
            label: clue.label || clue.labelEn,
            detail: clue.detail || clue.detailEn,
            discovered: true,
            discoveredAt: next.clock,
        }));
    next.clues = [...(next.clues || []), ...revealedClues];
    const revealedIds = revealedClues.map(clue => clue.id);
    next.storyArcs = (next.storyArcs || []).map(arc => arc.status === 'active' ? {
        ...arc,
        revealedClueIds: [...new Set([...(arc.revealedClueIds || []), ...revealedIds])],
    } : arc);
    const timelineEntry = {
        clock: next.clock,
        label: transaction.publicEvent || transaction.publicEventEn,
    };
    next.timeline = [
        ...(next.timeline || []),
        timelineEntry,
    ].slice(-20);
    if (next.scene) {
        next.scene.timelineEntries = [
            ...(next.scene.timelineEntries || []),
            timelineEntry,
        ];
    }
    const lastReviewedTurn =
        Number(
            next.memoryDirector
                ?.lastReviewedTurn ||
            0,
        );
    const hasUnreviewedMemory =
        (next.actorLibrary || [])
            .some(profile =>
                getActorMemoryEntries(
                    profile,
                ).some(memory =>
                    Number(
                        memory.updatedTurn ||
                        0,
                    ) >
                    lastReviewedTurn));
    if (
        transaction.eventEnded ===
            true
    ) {
        next.memoryDirector = {
            ...(next.memoryDirector ||
                {}),
            status: 'idle',
            error: '',
            triggerMode:
                'event_boundary',
            pendingEventBoundary: {
                id: `${
                    next.scene?.id ||
                    'scene'
                }:event:${committedTurn}`,
                status: 'pending',
                sceneId:
                    next.scene?.id ||
                    '',
                turn: committedTurn,
                clock: next.clock,
                publicEventEn:
                    transaction
                        .publicEventEn,
                hasUnreviewedMemory,
                intentRefreshed:
                    false,
                intentRefreshStatus:
                    'pending',
            },
        };
        delete next.memoryDirector
            .reviewAfterTurns;
    }
    next.turn = {
        count: committedTurn,
        status: 'idle',
        error: '',
        lastElapsedMinutes: elapsedMinutes,
        lastResolvedAt: new Date().toISOString(),
    };
    next =
        settleSpellProgress(
            next,
            playerAction,
            transaction,
        );
    return migrateActorPresentationState(
        next,
    ).state;
}

function getActorMemoryEntries(profile) {
    const normalized =
        normalizeActorMemoryProfile(profile);
    return SHARED_MEMORY_TIERS.flatMap(tier =>
        normalized.sharedMemories[tier].map(memory => ({
            ...memory,
            tier,
        })));
}

export function analyzeMemoryConsolidation(
    worldState,
) {
    const totalTurns = Math.max(
        0,
        Number(worldState?.turn?.count || 0),
    );
    const director = worldState?.memoryDirector || {};
    const lastReviewedTurn = Math.max(
        0,
        Number(director.lastReviewedTurn || 0),
    );
    const eventBoundary =
        director
            .pendingEventBoundary ||
        null;
    const minimumReviewTurns =
        Math.max(
            10,
            Number(
                director
                    .minimumReviewTurns ||
                10,
            ),
        );
    const boundaryTurn = Math.max(
        0,
        Number(
            eventBoundary?.turn ||
            0,
        ),
    );
    const boundaryTurnsSinceReview =
        boundaryTurn -
        lastReviewedTurn;
    const actors = (worldState?.actorLibrary || [])
        .map(profile => {
            const normalized =
                normalizeActorMemoryProfile(profile);
            const everydayCount =
                normalized.sharedMemories.everyday.length;
            const recentCount =
                normalized.sharedMemories.recent.length;
            const changedCount = [
                ...normalized.sharedMemories.everyday,
                ...normalized.sharedMemories.recent,
            ].filter(memory =>
                Number(memory.updatedTurn || 0) >
                lastReviewedTurn).length;
            return {
                id: profile.id,
                everydayCount,
                recentCount,
                pendingCount:
                    everydayCount + recentCount,
                changedCount,
            };
        })
        .filter(actor => actor.pendingCount > 0);
    const pendingCount = actors.reduce(
        (sum, actor) => sum + actor.pendingCount,
        0,
    );
    const changedActorIds = actors
        .filter(actor => actor.changedCount > 0)
        .map(actor => actor.id);
    return {
        shouldReview:
            worldState?.phase === 'playing' &&
            eventBoundary?.status ===
                'pending' &&
            (
                !eventBoundary.sceneId ||
                eventBoundary.sceneId ===
                    worldState.scene?.id
            ) &&
            boundaryTurnsSinceReview >=
                minimumReviewTurns &&
            changedActorIds.length > 0,
        totalTurns,
        lastReviewedTurn,
        triggerMode:
            'event_boundary',
        minimumReviewTurns,
        boundaryTurn,
        boundaryTurnsSinceReview,
        eventBoundary,
        pendingCount,
        changedActorIds,
        actors,
    };
}

export function validateMemoryConsolidation(
    payload,
    worldState,
) {
    const errors = [];
    if (!payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)) {
        return {
            valid: false,
            errors: ['共同记忆整理包必须是对象。'],
        };
    }
    const reviews = Array.isArray(payload.reviews)
        ? payload.reviews
        : [];
    if (reviews.length > 8) {
        errors.push('共同记忆整理最多包含 8 个人物。');
    }
    const profiles = new Map(
        (worldState?.actorLibrary || []).map(profile => [
            profile.id,
            normalizeActorMemoryProfile(profile),
        ]),
    );
    const reviewedIds = new Set();
    reviews.forEach(review => {
        const profile = profiles.get(review.id);
        if (!profile || reviewedIds.has(review.id)) {
            errors.push(
                `共同记忆整理人物 ${review.id || '?'} 不存在或重复。`,
            );
            return;
        }
        reviewedIds.add(review.id);
        if (review.impressionOfPlayerEn !== undefined) {
            const impression = String(
                review.impressionOfPlayerEn || '',
            ).trim();
            if (!isValidImpressionShorthand(
                impression,
            )) {
                errors.push(
                    `人物 ${review.id} 的整理后印象必须是 1–${IMPRESSION_MAX_WORDS} 词的主观 shorthand。`,
                );
            }
        }
        const operations = Array.isArray(review.operations)
            ? review.operations
            : [];
        if (!operations.length &&
            !review.impressionOfPlayerEn) {
            errors.push(
                `人物 ${review.id} 的整理没有任何变化。`,
            );
        }
        if (operations.length > 4) {
            errors.push(
                `人物 ${review.id} 一次最多执行 4 条记忆整理。`,
            );
        }
        const entries = new Map(
            getActorMemoryEntries(profile).map(memory => [
                memory.id,
                memory,
            ]),
        );
        const usedSourceIds = new Set();
        operations.forEach(operation => {
            const sourceIds = Array.isArray(
                operation.sourceIds,
            )
                ? operation.sourceIds
                : [];
            if (!sourceIds.length || sourceIds.length > 4) {
                errors.push(
                    `人物 ${review.id} 的记忆整理必须引用 1–4 条来源。`,
                );
            }
            const sources = sourceIds
                .map(id => entries.get(id))
                .filter(Boolean);
            if (sources.length !== sourceIds.length ||
                sourceIds.some(id => usedSourceIds.has(id))) {
                errors.push(
                    `人物 ${review.id} 的记忆来源不存在或被重复使用。`,
                );
            }
            sourceIds.forEach(id =>
                usedSourceIds.add(id));
            if (![
                'core',
                'recent',
                'forget',
            ].includes(operation.targetTier)) {
                errors.push(
                    `人物 ${review.id} 的记忆目标层级无效。`,
                );
            }
            if (operation.targetTier === 'core' &&
                !sources.some(source =>
                    ['core', 'recent'].includes(
                        source.tier,
                    ))) {
                errors.push(
                    `人物 ${review.id} 的深刻记忆必须来自近期大事或已有深刻记忆。`,
                );
            }
            if (operation.targetTier === 'recent' &&
                sources.some(source =>
                    source.tier === 'core')) {
                errors.push(
                    `人物 ${review.id} 的深刻记忆不能降级为近期大事。`,
                );
            }
            if (
                operation.targetTier ===
                    'recent' &&
                !(
                    sources.some(source =>
                        source.tier === 'recent' ||
                        (
                            source.significance ===
                                'notable' &&
                            String(
                                source
                                    .lastingImpactEn ||
                                '',
                            ).trim()
                        )) ||
                    (
                        sources.filter(source =>
                            source.tier ===
                                'everyday')
                            .length >= 2 &&
                        new Set(
                            sources
                                .filter(source =>
                                    source.tier ===
                                        'everyday')
                                .map(source =>
                                    Number(
                                        source.createdTurn ||
                                        source.updatedTurn ||
                                        0,
                                    ))
                                .filter(Boolean),
                        ).size >= 2
                    )
                )
            ) {
                errors.push(
                    `人物 ${review.id} 的近期大事必须来自已有近期记忆、带长期影响的 notable 候选，或至少两条跨回合日常记忆形成的重复模式。`,
                );
            }
            if (operation.targetTier === 'forget' &&
                sources.some(source =>
                    source.tier === 'core')) {
                errors.push(
                    `人物 ${review.id} 的深刻记忆不能直接遗忘。`,
                );
            }
            if (operation.targetTier !== 'forget') {
                const summary = String(
                    operation.summaryEn || '',
                ).trim();
                const wordCount = summary
                    .split(/\s+/)
                    .filter(Boolean)
                    .length;
                const maxWords =
                    operation.targetTier ===
                        'recent'
                        ? 32
                        : 40;
                if (!summary ||
                    wordCount > maxWords) {
                    errors.push(
                        `人物 ${review.id} 的整理摘要必须具体且不超过 ${maxWords} 词。`,
                    );
                }
            }
            const unauthorizedKeys =
                Object.keys(operation).filter(key =>
                    ![
                        'sourceIds',
                        'targetTier',
                        'summaryEn',
                        'summary',
                    ].includes(key));
            if (unauthorizedKeys.length) {
                errors.push(
                    `共同记忆整理包含未授权字段：${unauthorizedKeys.join(', ')}。`,
                );
            }
        });
    });
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function normalizeMemoryConsolidationPayload(
    payload,
    worldState,
) {
    const normalized =
        structuredClone(
            payload &&
            typeof payload === 'object'
                ? payload
                : {},
        );
    const reviewedIds = new Set();
    normalized.reviews = (
        Array.isArray(normalized.reviews)
            ? normalized.reviews
            : []
    ).filter(review => {
        if (
            reviewedIds.has(review?.id) ||
            !validateMemoryConsolidation(
                { reviews: [review] },
                worldState,
            ).valid
        ) {
            return false;
        }
        reviewedIds.add(review.id);
        return true;
    });
    normalized.statements =
        Array.isArray(
            normalized.statements,
        )
            ? normalized.statements
            : Array.isArray(
                normalized
                    .socialStatements,
            )
                ? normalized
                    .socialStatements
                : [];
    normalized.relationshipEvidence =
        Array.isArray(
            normalized
                .relationshipEvidence,
        )
            ? normalized
                .relationshipEvidence
            : Array.isArray(
                normalized
                    .socialRelationshipEvidence,
            )
                ? normalized
                    .socialRelationshipEvidence
                : [];
    return normalized;
}

export function applyMemoryConsolidation(
    worldState,
    payload,
) {
    const validation = validateMemoryConsolidation(
        payload,
        worldState,
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const reviews = new Map(
        payload.reviews.map(review => [
            review.id,
            review,
        ]),
    );
    const currentTurn = Math.max(
        0,
        Number(next.turn?.count || 0),
    );
    next.actorLibrary = (next.actorLibrary || []).map(
        (profile, profileIndex) => {
            const review = reviews.get(profile.id);
            let normalized =
                normalizeActorMemoryProfile(profile);
            if (!review) return normalized;
            if (review.impressionOfPlayerEn) {
                normalized = {
                    ...normalized,
                    impressionOfPlayerEn:
                        review.impressionOfPlayerEn,
                    impressionOfPlayer:
                        review.impressionOfPlayer ||
                        review.impressionOfPlayerEn,
                    impressionUpdatedClock: next.clock,
                    impressionUpdatedTurn: currentTurn,
                };
            }
            (review.operations || []).forEach(
                (operation, operationIndex) => {
                    const sourceIds = new Set(
                        operation.sourceIds,
                    );
                    const sources =
                        getActorMemoryEntries(normalized)
                            .filter(memory =>
                                sourceIds.has(memory.id));
                    const memories =
                        normalizeSharedMemories(
                            normalized.sharedMemories,
                        );
                    SHARED_MEMORY_TIERS.forEach(tier => {
                        memories[tier] = memories[tier]
                            .filter(memory =>
                                !sourceIds.has(memory.id));
                    });
                    normalized = {
                        ...normalized,
                        sharedMemories: memories,
                    };
                    if (operation.targetTier ===
                        'forget') {
                        return;
                    }
                    normalized = upsertSharedMemory(
                        normalized,
                        {
                            id: `${profile.id}_m${currentTurn}_${profileIndex + 1}_${operationIndex + 1}`,
                            summaryEn:
                                operation.summaryEn,
                            summary:
                                operation.summary ||
                                operation.summaryEn,
                            firstClock:
                                sources[0]?.firstClock ||
                                next.clock,
                            lastClock: next.clock,
                            createdTurn: Math.min(
                                ...sources.map(memory =>
                                    Number(
                                        memory.createdTurn ||
                                        currentTurn,
                                    )),
                            ),
                            updatedTurn: currentTurn,
                            source: 'medium',
                        },
                        operation.targetTier,
                    );
                },
            );
            return normalized;
        },
    );
    const profiles = new Map(
        next.actorLibrary.map(profile => [
            profile.id,
            profile,
        ]),
    );
    next.actors = (next.actors || []).map(actor => {
        const profile = profiles.get(actor.id);
        return profile ? {
            ...actor,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
        } : actor;
    });
    const eventBoundary =
        next.memoryDirector
            ?.pendingEventBoundary;
    next.memoryDirector = {
        ...(next.memoryDirector || {}),
        status: 'ready',
        error: '',
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        lastReviewedTurn: currentTurn,
        pendingEventBoundary:
            eventBoundary
                ? {
                    ...eventBoundary,
                    status: 'consumed',
                    consumedTurn:
                        currentTurn,
                    consumedClock:
                        next.clock,
                }
                : null,
        reviewedActorIds:
            payload.reviews.map(review => review.id),
        reviewedAt: new Date().toISOString(),
    };
    return next;
}

export function validateSocialDirectorResult(
    result,
    worldState,
    allowedMessageIds = [],
) {
    const errors = [];
    if (
        !result ||
        typeof result !== 'object' ||
        !result.socialGraph
    ) {
        return {
            valid: false,
            errors: [
                '社交导演图缺少输出。',
            ],
        };
    }
    const graph = normalizeSocialGraph(
        result.socialGraph,
    );
    const actorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const messageIds = new Set(
        (allowedMessageIds || [])
            .map(Number)
            .filter(Number.isInteger),
    );
    const acceptedStatementIds =
        new Set(
            result
                .acceptedStatementIds ||
            [],
        );
    const acceptedEvidenceIds =
        new Set(
            result
                .acceptedEvidenceIds ||
            [],
        );
    const validWitness = id =>
        id === 'player' ||
        actorIds.has(id);
    const validRelationshipEntity = id =>
        id === 'player' ||
        actorIds.has(id);
    for (const statement of (
        graph.statements || []
    )) {
        if (
            !actorIds.has(
                statement.subjectId,
            ) ||
            !actorIds.has(
                statement.speakerId,
            ) ||
            !(
                statement.witnessedBy ||
                []
            ).every(validWitness) ||
            (
                acceptedStatementIds
                    .has(statement.id) &&
                !(
                    statement
                        .sourceMessageIds ||
                    []
                ).every(id =>
                    messageIds.has(
                        Number(id),
                    ))
            )
        ) {
            errors.push(
                `社交声明 ${statement.id || '?'} 引用了未授权来源。`,
            );
        }
    }
    for (const evidence of (
        graph.relationshipEvidence ||
        []
    )) {
        if (
            !validRelationshipEntity(
                evidence
                    .sourceActorId,
            ) ||
            !validRelationshipEntity(
                evidence
                    .targetActorId,
            ) ||
            !(
                evidence.witnessedBy ||
                []
            ).every(validWitness) ||
            (
                acceptedEvidenceIds
                    .has(evidence.id) &&
                !(
                    evidence
                        .sourceMessageIds ||
                    []
                ).every(id =>
                    messageIds.has(
                        Number(id),
                    ))
            )
        ) {
            errors.push(
                `关系证据 ${evidence.id || '?'} 引用了未授权来源。`,
            );
        }
    }
    for (const edge of (
        graph.relationships || []
    )) {
        if (
            !validRelationshipEntity(
                edge.sourceActorId,
            ) ||
            !validRelationshipEntity(
                edge.targetActorId,
            ) ||
            edge.sourceActorId ===
                edge.targetActorId
        ) {
            errors.push(
                `关系边 ${edge.id || '?'} 引用了无效人物。`,
            );
        }
    }
    const memoryValidation =
        validateMemoryConsolidation(
            {
                reviews: Array.isArray(
                    result.memoryReviews,
                )
                    ? result
                        .memoryReviews
                    : [],
            },
            worldState,
        );
    errors.push(
        ...memoryValidation.errors,
    );
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function applySocialDirectorResult(
    worldState,
    result,
    allowedMessageIds = [],
) {
    const validation =
        validateSocialDirectorResult(
            result,
            worldState,
            allowedMessageIds,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    const reviews =
        result.memoryReviews ||
        [];
    let next =
        reviews.length
            ? applyMemoryConsolidation(
                worldState,
                {
                    reviews,
                },
            )
            : structuredClone(
                worldState,
            );
    next.socialGraph =
        normalizeSocialGraph(
            result.socialGraph,
            {
                currentTurn:
                    worldState?.turn?.count,
            },
        );
    const graph = next.socialGraph;
    next.actorLibrary =
        projectActorSocialRelationships(
            next.actorLibrary,
            graph,
        ).map(profile => ({
            ...profile,
            socialStatements:
                graph.statements
                    .filter(statement =>
                        statement.subjectId ===
                            profile.id),
        }));
    return next;
}

function getSceneMapDefinitions(mapState = {}) {
    const maps = [];
    const seen = new Set();
    const add = map => {
        if (map?.id && !seen.has(map.id)) {
            maps.push(map);
            seen.add(map.id);
        }
    };
    add(getLocalMapDefinition(mapState.activeMapId, mapState));
    (mapState.customLocalMaps || []).forEach(add);
    LOCAL_MAP_CATALOG.forEach(entry => add(getPresetLocalMap(entry.id)));
    return maps;
}

export function findSceneDestination(text, worldState) {
    const query = String(text || '').normalize('NFKC').toLocaleLowerCase();
    if (!query.trim()) {
        return null;
    }
    const mapState = worldState?.map || {};
    const generatedNodes = mapState.generatedLocalNodes || [];
    let best = null;
    const consider = candidate => {
        if (!best || candidate.score > best.score) {
            best = candidate;
        }
    };
    for (const map of getSceneMapDefinitions(mapState)) {
        const activeBonus = map.id === mapState.activeMapId ? 20 : 0;
        const nodes = [
            ...(map.nodes || []),
            ...generatedNodes.filter(node => node.mapId === map.id),
        ];
        for (const room of nodes) {
            for (const label of [
                room.name,
                room.nameEn,
                room.id,
                ...(room.aliases || []),
            ]) {
                const normalized = String(label || '').normalize('NFKC').toLocaleLowerCase();
                if (normalized.length >= 2 && query.includes(normalized)) {
                    consider({
                        mapId: map.id,
                        roomId: room.id,
                        mapName: map.name,
                        mapNameEn: map.nameEn,
                        roomName: room.name || room.nameEn,
                        roomNameEn:
                            room.nameEn ||
                            (room.aliases || []).find(alias =>
                                /[a-z]/i.test(alias)) ||
                            formatSceneLocationId(
                                room.id,
                            ) ||
                            room.name,
                        levelId: room.levelId,
                        score: 100 + activeBonus + normalized.length,
                    });
                }
            }
        }
        for (const label of [map.name, map.nameEn, map.id]) {
            const normalized = String(label || '').normalize('NFKC').toLocaleLowerCase();
            if (normalized.length < 2 || !query.includes(normalized)) continue;
            const room = nodes.find(node => node.id === map.defaultLevelId) ||
                nodes.find(node => node.levelId === map.defaultLevelId) ||
                nodes[0];
            if (room) {
                consider({
                    mapId: map.id,
                    roomId: room.id,
                    mapName: map.name,
                    mapNameEn: map.nameEn,
                    roomName: room.name || room.nameEn,
                    roomNameEn:
                        room.nameEn ||
                        formatSceneLocationId(
                            room.id,
                        ) ||
                        room.name,
                    levelId: room.levelId,
                    score: 10 + activeBonus + normalized.length,
                });
            }
        }
    }
    if (!best) {
        return null;
    }
    const destination = { ...best };
    delete destination.score;
    return destination;
}

export function resolveSceneTransitionDestination(
    worldState,
    text,
) {
    const direct =
        findSceneDestination(
            text,
            worldState,
        );
    if (direct) {
        return direct;
    }
    const activeMapId = String(
        worldState?.scene?.mapId ||
        worldState?.map?.activeMapId ||
        '',
    );
    const query = String(text || '')
        .normalize('NFKC')
        .toLocaleLowerCase();
    const leavesExpress =
        activeMapId.includes(
            'hogwarts_express',
        ) &&
        /(?:到达|抵达|下车|arriv|reach|get off)/i
            .test(query) &&
        /(?:霍格沃茨|霍格莫德|hogwarts|hogsmeade)/i
            .test(query);
    if (!leavesExpress) {
        return null;
    }
    return getSceneDestinationAuthority(
        worldState,
        {
            mapId: 'hogsmeade',
            roomId:
                'hogsmeade_station',
        },
    );
}

function findExplicitRoomReference(
    text,
    map,
    mapState = {},
) {
    const query = normalizeSpatialText(text);
    if (!query || !map) return null;
    let best = null;
    getMapRooms(map, mapState).forEach(room => {
        [
            room.id,
            room.name,
            room.nameEn,
            ...(room.aliases || []),
        ].forEach(label => {
            const normalized =
                normalizeSpatialText(label);
            if (
                normalized.length < 3 ||
                !query.includes(normalized)
            ) {
                return;
            }
            if (
                !best ||
                normalized.length > best.score
            ) {
                best = {
                    room,
                    score: normalized.length,
                };
            }
        });
    });
    return best?.room || null;
}

export function createFallbackNextSceneIntent(worldState) {
    const mapId = String(worldState.map?.activeMapId || '');
    const roomId = String(worldState.map?.currentLocalNodeId || '');
    const map = getLocalMapDefinition(mapId, worldState.map);
    const room = getMapRooms(map, worldState.map)
        .find(item => item.id === roomId);
    const focusActor = (worldState.actors || []).find(actor =>
        actor.present !== false &&
        (actor.mapId || mapId) === mapId &&
        actor.roomId === roomId);
    const roomName = room?.name || room?.nameEn || roomId || '当前地点';
    const roomNameEn = room?.nameEn ||
        formatSceneLocationId(roomId) ||
        room?.name ||
        'Current Location';
    const actorName = focusActor?.name || focusActor?.nameEn || '';
    const actorNameEn = focusActor?.nameEn || focusActor?.name || '';
    return {
        titleEn: actorNameEn
            ? `${roomNameEn}: ${actorNameEn}`
            : `The Next Beat in ${roomNameEn}`,
        title: actorName
            ? `${roomName} · ${actorName}`
            : `${roomName}的下一幕`,
        summaryEn: actorNameEn
            ? `Continue the immediate public interaction with ${actorNameEn} in ${roomNameEn}.`
            : `Continue the unresolved public action in ${roomNameEn}.`,
        summary: actorName
            ? `继续推进你与${actorName}在${roomName}的当前互动。`
            : `继续推进${roomName}尚未完成的公开行动。`,
        triggerEn: 'When the player chooses to close the current scene.',
        trigger: '玩家主动结束当前场景时。',
        mapId,
        roomId,
        tier: 'medium',
        source: 'migration_fallback',
    };
}

export function validateEventBoundaryNextSceneIntent(
    value,
) {
    const errors = [];
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        return {
            valid: false,
            errors: [
                '事件边界下一场景意图必须是对象。',
            ],
        };
    }
    const limits = {
        titleEn: 120,
        summaryEn: 600,
        triggerEn: 300,
    };
    Object.entries(limits)
        .forEach(([key, limit]) => {
            const text = String(
                value[key] || '',
            ).trim();
            if (!text || text.length > limit) {
                errors.push(
                    `事件边界下一场景意图 ${key} 必须是非空且不超过 ${limit} 字符的文本。`,
                );
            }
        });
    const allowedKeys = new Set([
        ...Object.keys(limits),
        'title',
        'summary',
        'trigger',
    ]);
    const unauthorizedKeys =
        Object.keys(value)
            .filter(key =>
                !allowedKeys.has(key));
    if (unauthorizedKeys.length) {
        errors.push(
            `事件边界下一场景意图不得写入字段：${unauthorizedKeys.join(', ')}。`,
        );
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function applyEventBoundaryNextSceneIntent(
    worldState,
    intentUpdate,
) {
    const validation =
        validateEventBoundaryNextSceneIntent(
            intentUpdate,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    const next =
        structuredClone(worldState);
    if (!next.scene) {
        throw new Error(
            '当前没有可更新下一场景意图的活动场景。',
        );
    }
    const currentIntent =
        validateNextSceneIntent(
            next.scene.nextSceneIntent,
            next,
        ).valid
            ? next.scene.nextSceneIntent
            : createFallbackNextSceneIntent(
                next,
            );
    next.scene.nextSceneIntent = {
        ...currentIntent,
        titleEn: intentUpdate.titleEn,
        title:
            intentUpdate.title ||
            intentUpdate.titleEn,
        summaryEn:
            intentUpdate.summaryEn,
        summary:
            intentUpdate.summary ||
            intentUpdate.summaryEn,
        triggerEn:
            intentUpdate.triggerEn,
        trigger:
            intentUpdate.trigger ||
            intentUpdate.triggerEn,
        source:
            'medium_event_boundary',
        updatedTurn:
            Number(
                next.turn?.count || 0,
            ),
        updatedClock:
            next.clock,
    };
    return next;
}

function formatSceneLocationId(value) {
    return String(value || '')
        .split(/[_-]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getSceneDestinationAuthority(
    worldState,
    destination = {},
) {
    const mapId = String(destination?.mapId || '');
    const roomId = String(destination?.roomId || '');
    const map = getLocalMapDefinition(mapId, worldState?.map);
    const room = getMapRooms(map, worldState?.map)
        .find(item => item.id === roomId);
    if (!map || !room) {
        return null;
    }
    return {
        mapId,
        roomId,
        mapName: map.name || map.nameEn || mapId,
        mapNameEn: map.nameEn || formatSceneLocationId(mapId),
        roomName: room.name || room.nameEn || roomId,
        roomNameEn: room.nameEn || formatSceneLocationId(roomId),
        roomDescriptionEn: room.descriptionEn || room.description || '',
    };
}

export function validateSceneDestinationGrounding(
    payload,
    worldState,
    expectedDestination,
) {
    const errors = [];
    const authority = getSceneDestinationAuthority(
        worldState,
        expectedDestination,
    );
    if (!authority) {
        return {
            valid: false,
            errors: ['无法读取下一场景的权威目标房间。'],
        };
    }
    const nextScene = payload?.nextScene || {};
    if (nextScene.mapId !== authority.mapId ||
        nextScene.roomId !== authority.roomId) {
        errors.push(
            `下一场景必须原样使用 ${authority.mapId} / ${authority.roomId}，不能只改正文或只改 ID。`,
        );
        return { valid: false, errors };
    }
    return { valid: errors.length === 0, errors };
}

function getClosingSceneWitnessIds(
    worldState,
) {
    const mapId =
        worldState.scene?.mapId ||
        worldState.map?.activeMapId;
    const roomId =
        worldState.scene?.roomId ||
        worldState.map?.currentLocalNodeId;
    return (worldState.actors || [])
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || mapId) === mapId &&
            (actor.roomId || roomId) === roomId)
        .map(actor => actor.id);
}

export function normalizeTransitionWorldChanges(
    worldChanges,
) {
    const source =
        worldChanges &&
        typeof worldChanges === 'object' &&
        !Array.isArray(worldChanges)
            ? worldChanges
            : {};
    return {
        prophetBriefs:
            (
                Array.isArray(
                    source.prophetBriefs,
                )
                    ? source.prophetBriefs
                    : []
            )
                .slice(0, 4)
                .map(brief => ({
                    id: String(
                        brief?.id || '',
                    ).trim(),
                    headlineEn: String(
                        brief?.headlineEn || '',
                    ).trim(),
                    headline: String(
                        brief?.headline || '',
                    ).trim(),
                    briefEn: String(
                        brief?.briefEn || '',
                    ).trim(),
                    brief: String(
                        brief?.brief || '',
                    ).trim(),
                    category: String(
                        brief?.category || '',
                    ).trim(),
                    happenedClock: String(
                        brief?.happenedClock || '',
                    ).trim(),
                })),
        gossipUpdates:
            (
                Array.isArray(
                    source.gossipUpdates,
                )
                    ? source.gossipUpdates
                    : []
            )
                .slice(0, 4)
                .map(update => ({
                    id: String(
                        update?.id || '',
                    ).trim(),
                    action: String(
                        update?.action || '',
                    ).trim(),
                    originEventEn: String(
                        update?.originEventEn || '',
                    ).trim(),
                    originEvent: String(
                        update?.originEvent || '',
                    ).trim(),
                    truthCoreEn: String(
                        update?.truthCoreEn || '',
                    ).trim(),
                    truthCore: String(
                        update?.truthCore || '',
                    ).trim(),
                    versionEn: String(
                        update?.versionEn || '',
                    ).trim(),
                    version: String(
                        update?.version || '',
                    ).trim(),
                    sourceActorIds: [
                        ...new Set(
                            (
                                Array.isArray(
                                    update
                                        ?.sourceActorIds,
                                )
                                    ? update
                                        .sourceActorIds
                                    : []
                            )
                                .map(String)
                                .filter(Boolean),
                        ),
                    ].slice(0, 6),
                    audienceActorIds: [
                        ...new Set(
                            (
                                Array.isArray(
                                    update
                                        ?.audienceActorIds,
                                )
                                    ? update
                                        .audienceActorIds
                                    : []
                            )
                                .map(String)
                                .filter(Boolean),
                        ),
                    ].slice(0, 6),
                    channel: String(
                        update?.channel || '',
                    ).trim(),
                    targetGroupEn: String(
                        update?.targetGroupEn ||
                        '',
                    ).trim(),
                    targetGroup: String(
                        update?.targetGroup ||
                        '',
                    ).trim(),
                    distortionLevel: Number(
                        update
                            ?.distortionLevel,
                    ),
                })),
    };
}

function getGossipKnownActorIds(pack) {
    return new Set([
        ...(pack?.sourceActorIds || []),
        ...(pack?.knownActorIds || []),
        ...(pack?.versions || [])
            .flatMap(version => [
                ...(version
                    .sourceActorIds || []),
                ...(version
                    .audienceActorIds || []),
            ]),
    ]);
}

export function getActorKnownRumors(
    worldState,
    actorId,
) {
    return (worldState.gossipPacks || [])
        .filter(pack =>
            pack.status !== 'faded')
        .map(pack => {
            if (
                (pack.sourceActorIds || [])
                    .includes(actorId)
            ) {
                return {
                    id: pack.id,
                    versionEn:
                        pack.truthCoreEn,
                    version:
                        pack.truthCore ||
                        pack.truthCoreEn,
                    channel: 'witness',
                    targetGroupEn:
                        'Direct witnesses',
                    distortionLevel: 0,
                    truthWitness: true,
                };
            }
            const received = (
                pack.versions || []
            )
                .filter(version =>
                    (
                        version
                            .audienceActorIds ||
                        []
                    ).includes(actorId))
                .at(-1);
            return received ? {
                id: pack.id,
                versionEn:
                    received.versionEn,
                version:
                    received.version ||
                    received.versionEn,
                channel:
                    received.channel,
                targetGroupEn:
                    received.targetGroupEn,
                distortionLevel:
                    received
                        .distortionLevel,
                truthWitness: false,
            } : null;
        })
        .filter(Boolean)
        .slice(-6);
}

export function validateTransitionWorldChanges(
    worldChanges,
    worldState,
    nextClock,
    {
        allowPending = false,
    } = {},
) {
    const errors = [];
    const changes =
        normalizeTransitionWorldChanges(
            worldChanges,
        );
    const gapMinutes =
        getWorldClockGapMinutes(
            worldState.clock,
            nextClock,
        );
    const longTransition =
        Number(gapMinutes) >=
            WORLD_CHANGE_MIN_DAYS *
            1440;
    const briefs =
        changes.prophetBriefs;
    const gossipUpdates =
        changes.gossipUpdates;
    if (!longTransition) {
        if (
            briefs.length ||
            gossipUpdates.length
        ) {
            errors.push(
                `不足 ${WORLD_CHANGE_MIN_DAYS} 天的转场不得生成场间新闻或流言传播。`,
            );
        }
        return errors;
    }
    if (!briefs.length) {
        if (
            allowPending &&
            !gossipUpdates.length
        ) {
            return errors;
        }
        errors.push(
            '跨越至少一周的转场必须生成 1–4 条《预言家日报》边角新闻。',
        );
    }
    const witnessIds = new Set(
        getClosingSceneWitnessIds(
            worldState,
        ),
    );
    if (
        witnessIds.size &&
        !gossipUpdates.some(update =>
            update.action === 'create')
    ) {
        errors.push(
            '跨越至少一周且旧场景有见证者时，必须从目击事件创建至少一个流言包。',
        );
    }

    const actorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const existingNewsIds = new Set(
        (worldState.worldNews || [])
            .map(brief => brief.id),
    );
    const seenNewsIds = new Set();
    const fromMinutes =
        worldClockToEpochMinutes(
            worldState.clock,
        );
    const toMinutes =
        worldClockToEpochMinutes(
            nextClock,
        );
    briefs.forEach(brief => {
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(brief.id) ||
            seenNewsIds.has(brief.id) ||
            existingNewsIds.has(brief.id)
        ) {
            errors.push(
                `日报新闻 ID ${brief.id || '?'} 无效或重复。`,
            );
        }
        seenNewsIds.add(brief.id);
        const headlineWords =
            countTextWords(
                brief.headlineEn,
            );
        const briefWords =
            countTextWords(
                brief.briefEn,
            );
        if (
            headlineWords < 2 ||
            headlineWords > 18 ||
            briefWords < 8 ||
            briefWords > 60
        ) {
            errors.push(
                `日报新闻 ${brief.id || '?'} 的标题或正文长度无效。`,
            );
        }
        if (
            !WORLD_NEWS_CATEGORY_VALUES
                .includes(
                    brief.category,
                )
        ) {
            errors.push(
                `日报新闻 ${brief.id || '?'} 的 category 无效。`,
            );
        }
        const happenedMinutes =
            worldClockToEpochMinutes(
                brief.happenedClock,
            );
        if (
            happenedMinutes === null ||
            happenedMinutes < fromMinutes ||
            happenedMinutes > toMinutes
        ) {
            errors.push(
                `日报新闻 ${brief.id || '?'} 的 happenedClock 必须落在本次时间跳跃内。`,
            );
        }
    });

    const packs = new Map(
        (worldState.gossipPacks || [])
            .map(pack => [
                pack.id,
                pack,
            ]),
    );
    const seenGossipIds = new Set();
    gossipUpdates.forEach(update => {
        const existing =
            packs.get(update.id);
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(update.id) ||
            seenGossipIds.has(update.id)
        ) {
            errors.push(
                `流言包 ID ${update.id || '?'} 无效或在本次更新中重复。`,
            );
        }
        seenGossipIds.add(update.id);
        if (![
            'create',
            'propagate',
        ].includes(update.action)) {
            errors.push(
                `流言包 ${update.id || '?'} 的 action 无效。`,
            );
        }
        if (
            !GOSSIP_CHANNEL_VALUES
                .includes(
                    update.channel,
                )
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的传播渠道无效。`,
            );
        }
        if (
            countTextWords(
                update.versionEn,
            ) < 5 ||
            countTextWords(
                update.versionEn,
            ) > 60 ||
            countTextWords(
                update.targetGroupEn,
            ) < 2 ||
            countTextWords(
                update.targetGroupEn,
            ) > 18
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的传播版本或目标群体长度无效。`,
            );
        }
        if (
            !Number.isInteger(
                update.distortionLevel,
            ) ||
            update.distortionLevel < 1 ||
            update.distortionLevel > 3
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的 distortionLevel 必须是 1–3。`,
            );
        }
        if (
            !update.sourceActorIds.length ||
            update.sourceActorIds.some(
                id => !actorIds.has(id)) ||
            update.audienceActorIds.some(
                id => !actorIds.has(id))
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的传播人物必须引用现有人物，且至少有一个来源人物。`,
            );
        }
        if (update.action === 'create') {
            if (existing) {
                errors.push(
                    `新流言包 ${update.id} 已存在。`,
                );
            }
            if (
                update.sourceActorIds.some(
                    id =>
                        !witnessIds.has(id))
            ) {
                errors.push(
                    `新流言包 ${update.id} 的来源必须是旧场景同房间见证者。`,
                );
            }
            if (
                countTextWords(
                    update.originEventEn,
                ) < 6 ||
                countTextWords(
                    update.originEventEn,
                ) > 50 ||
                countTextWords(
                    update.truthCoreEn,
                ) < 6 ||
                countTextWords(
                    update.truthCoreEn,
                ) > 50 ||
                update.distortionLevel !== 1
            ) {
                errors.push(
                    `新流言包 ${update.id} 必须含 6–50 词的目击事件和真相底稿，并从失真 1 开始。`,
                );
            }
        } else if (
            !existing ||
            existing.status === 'faded'
        ) {
            errors.push(
                `传播流言包 ${update.id || '?'} 不存在或已经淡出。`,
            );
        } else {
            const knownActors =
                getGossipKnownActorIds(
                    existing,
                );
            if (
                update.sourceActorIds.some(
                    id =>
                        !knownActors.has(id))
            ) {
                errors.push(
                    `传播流言包 ${update.id} 的来源人物尚未听过该流言。`,
                );
            }
            const latest =
                existing.versions?.at(-1);
            const expectedDistortion =
                Math.min(
                    3,
                    Number(
                        latest
                            ?.distortionLevel ||
                        0,
                    ) + 1,
                );
            if (
                update.distortionLevel !==
                    expectedDistortion ||
                update.versionEn ===
                    latest?.versionEn
            ) {
                errors.push(
                    `传播流言包 ${update.id} 必须在上一版本上增加一级失真并改写内容。`,
                );
            }
        }
    });
    return errors;
}

export function applyTransitionWorldChanges(
    next,
    previous,
    payload,
) {
    const changes =
        normalizeTransitionWorldChanges(
            payload.worldChanges,
        );
    const gapMinutes =
        getWorldClockGapMinutes(
            previous.clock,
            payload.nextClock,
        );
    if (
        Number(gapMinutes) <
            WORLD_CHANGE_MIN_DAYS * 1440
    ) {
        return null;
    }
    next.worldNews = [
        ...(next.worldNews || []),
        ...changes.prophetBriefs.map(
            brief => ({
                ...brief,
                headline:
                    brief.headline ||
                    brief.headlineEn,
                brief:
                    brief.brief ||
                    brief.briefEn,
                source:
                    'daily_prophet_margin',
                publishedClock:
                    payload.nextClock,
            }),
        ),
    ].slice(-24);

    const packs = new Map(
        (next.gossipPacks || [])
            .map(pack => [
                pack.id,
                structuredClone(pack),
            ]),
    );
    for (const update of changes
        .gossipUpdates) {
        const version = {
            clock: payload.nextClock,
            versionEn:
                update.versionEn,
            version:
                update.version ||
                update.versionEn,
            sourceActorIds:
                update.sourceActorIds,
            audienceActorIds:
                update.audienceActorIds,
            channel: update.channel,
            targetGroupEn:
                update.targetGroupEn,
            targetGroup:
                update.targetGroup ||
                update.targetGroupEn,
            distortionLevel:
                update.distortionLevel,
        };
        if (update.action === 'create') {
            packs.set(update.id, {
                id: update.id,
                originEventEn:
                    update.originEventEn,
                originEvent:
                    update.originEvent ||
                    update.originEventEn,
                truthCoreEn:
                    update.truthCoreEn,
                truthCore:
                    update.truthCore ||
                    update.truthCoreEn,
                sourceActorIds:
                    update.sourceActorIds,
                knownActorIds:
                    [...new Set([
                        ...update
                            .sourceActorIds,
                        ...update
                            .audienceActorIds,
                    ])],
                status: 'active',
                createdClock:
                    payload.nextClock,
                updatedClock:
                    payload.nextClock,
                versions: [version],
            });
            continue;
        }
        const pack = packs.get(
            update.id,
        );
        pack.versions = [
            ...(pack.versions || []),
            version,
        ].slice(-8);
        pack.knownActorIds = [
            ...new Set([
                ...(pack
                    .knownActorIds || []),
                ...update.sourceActorIds,
                ...update
                    .audienceActorIds,
            ]),
        ];
        pack.updatedClock =
            payload.nextClock;
        pack.status = 'active';
    }
    next.gossipPacks = [...packs.values()]
        .map(pack => {
            const quietMinutes =
                getWorldClockGapMinutes(
                    pack.updatedClock,
                    payload.nextClock,
                );
            return Number(quietMinutes) >=
                28 * 1440
                ? {
                    ...pack,
                    status: 'faded',
                }
                : pack;
        })
        .slice(-16);

    const entry = {
        id: normalizeMemoryId(
            `world_change_${previous.scene?.id || 'scene'}_${payload.nextClock}`,
            'world_change',
        ),
        fromClock: previous.clock,
        toClock: payload.nextClock,
        elapsedDays:
            Math.floor(
                Number(gapMinutes) /
                1440,
            ),
        prophetBriefIds:
            changes.prophetBriefs
                .map(brief => brief.id),
        gossipUpdateIds:
            changes.gossipUpdates
                .map(update => update.id),
        createdAt:
            new Date().toISOString(),
    };
    next.worldChangeLog = [
        ...(next.worldChangeLog || []),
        entry,
    ].slice(-12);
    return entry;
}

export function stripSyntheticSceneOpeningActorSegments(
    segments = [],
) {
    return (
        Array.isArray(segments)
            ? segments
            : []
    ).filter(segment =>
        !(
            segment?.type ===
                'narration' &&
            /^[A-Z][A-Za-z.'’-]*(?:\s+[A-Z][A-Za-z.'’-]*){1,5}\s+remains visible in the scene,\s+/u
                .test(
                    String(
                        segment.textEn ||
                        '',
                    ).trim(),
                )
        ));
}

export function normalizeSceneTransitionPackage(
    payload,
    worldState,
    options = {},
) {
    const normalized = structuredClone(payload);
    const transitionMinutes = Number(
        normalized.transitionMinutes,
    );
    normalized.transitionMinutes =
        Number.isFinite(transitionMinutes)
            ? Math.max(
                0,
                Math.round(
                    transitionMinutes,
                ),
            )
            : 0;
    normalized.nextClock =
        WORLD_CLOCK_PATTERN.test(
            String(
                normalized.nextClock || '',
            ),
        )
            ? String(
                normalized.nextClock,
            )
            : advanceWorldClock(
                worldState.clock,
                normalized.transitionMinutes,
            );
    normalized.worldChanges =
        normalizeTransitionWorldChanges(
            normalized.worldChanges,
        );
    const worldChangeGapMinutes =
        getWorldClockGapMinutes(
            worldState.clock,
            normalized.nextClock,
        );
    if (
        Number.isFinite(
            worldChangeGapMinutes,
        ) &&
        worldChangeGapMinutes <
            7 * 1440
    ) {
        normalized.worldChanges = {
            prophetBriefs: [],
            gossipUpdates: [],
        };
    }
    normalized.closureSummaryEn = String(
        normalized.closureSummaryEn ||
        worldState.scene?.summaryEn ||
        'The current scene reaches its committed conclusion.',
    ).trim();
    normalized.unresolvedThreadsEn =
        Array.isArray(
            normalized.unresolvedThreadsEn,
        )
            ? normalized
                .unresolvedThreadsEn
                .map(item =>
                    String(item || '').trim())
                .filter(Boolean)
                .slice(0, 8)
            : [];
    const profiles = new Map(
        (worldState.actorLibrary || []).map(
            profile => [
                profile.id,
                normalizeActorMemoryProfile(
                    profile,
                ),
            ],
        ),
    );
    const closingMapId =
        worldState.scene?.mapId ||
        worldState.map?.activeMapId;
    const closingRoomId =
        worldState.scene?.roomId ||
        worldState.map?.currentLocalNodeId;
    const witnessIds = (
        worldState.actors || []
    )
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || closingMapId) ===
                closingMapId &&
            actor.roomId === closingRoomId)
        .map(actor => actor.id)
        .filter(id => profiles.has(id))
        .slice(0, 6);
    const suppliedRelationshipUpdates =
        Array.isArray(
            normalized.relationshipUpdates,
        )
            ? normalized.relationshipUpdates
            : [];
    const suppliedUpdatesById = new Map(
        suppliedRelationshipUpdates
            .filter(update =>
                profiles.has(update?.id))
            .map(update => [
                update.id,
                update,
            ]),
    );
    const relationshipIds = [
        ...new Set(
            suppliedUpdatesById.size
                ? suppliedUpdatesById.keys()
                : witnessIds,
        ),
    ].slice(0, 6);
    const closureWords = String(
        normalized.closureSummaryEn ||
        worldState.scene?.summaryEn ||
        'The actor witnessed the player throughout the scene.',
    )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const fallbackPrefixWords =
        'During the closed scene,'
            .split(/\s+/);
    const fallbackSuffixWords =
        'This experience materially shaped the actor’s view of the player.'
            .split(/\s+/);
    const fallbackClosureWordLimit =
        32 -
        fallbackPrefixWords.length -
        fallbackSuffixWords.length;
    const fallbackMemory = [
        ...fallbackPrefixWords,
        ...closureWords.slice(
            0,
            fallbackClosureWordLimit,
        ),
        ...fallbackSuffixWords,
    ]
        .join(' ');
    normalized.relationshipUpdates =
        relationshipIds.map(id => {
            const supplied =
                suppliedUpdatesById.get(id) ||
                {};
            const profile = profiles.get(id);
            const suppliedImpression = String(
                supplied
                    .impressionOfPlayerEn ||
                '',
            ).trim();
            const existingImpression = String(
                profile
                    ?.impressionOfPlayerEn ||
                '',
            ).trim();
            const impressionOfPlayerEn =
                isValidImpressionShorthand(
                    suppliedImpression,
                )
                    ? suppliedImpression
                    : isValidImpressionShorthand(
                        existingImpression,
                    )
                        ? existingImpression
                        : 'A demanding, unpredictable child who repeatedly tests firm boundaries.';
            const suppliedMemoryWords = String(
                supplied.sceneMemoryEn || '',
            )
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            const sceneMemoryEn =
                suppliedMemoryWords.length >= 8
                    ? suppliedMemoryWords
                        .slice(0, 32)
                        .join(' ')
                    : fallbackMemory;
            return {
                id,
                impressionOfPlayerEn,
                sceneMemoryEn,
            };
        });
    const nextScene = normalized?.nextScene;
    if (!nextScene || typeof nextScene !== 'object') {
        return normalized;
    }
    if (
        options
            .repairUnboundDestination
    ) {
        const suppliedMap =
            getLocalMapDefinition(
                nextScene.mapId,
                worldState.map,
            );
        const suppliedRoomExists =
            getMapRooms(
                suppliedMap,
                worldState.map,
            ).some(room =>
                room.id ===
                nextScene.roomId);
        if (!suppliedRoomExists) {
            const candidate =
                findSceneDestination(
                    [
                        nextScene.roomId,
                        nextScene.nameEn,
                        nextScene.summaryEn,
                        nextScene
                            .explorationHookEn,
                        ...(
                            nextScene
                                .openingSegments ||
                            []
                        ).map(segment =>
                            segment.textEn),
                        options
                            .destinationHint,
                    ]
                        .filter(Boolean)
                        .join(' '),
                    worldState,
                );
            if (candidate) {
                nextScene.mapId =
                    candidate.mapId;
                nextScene.roomId =
                    candidate.roomId;
            }
        }
    }
    const map = getLocalMapDefinition(nextScene.mapId, worldState.map);
    const rooms = getMapRooms(map, worldState.map);
    const roomIds = new Set(rooms.map(room => room.id));
    const room = rooms.find(item =>
        item.id === nextScene.roomId);
    const usedSceneIds = new Set([
        worldState.scene?.id,
        ...(worldState.sceneArchive || [])
            .map(scene => scene.id),
    ].filter(Boolean));
    if (
        !/^[a-z][a-z0-9_]{2,79}$/.test(
            String(nextScene.id || ''),
        ) ||
        usedSceneIds.has(nextScene.id)
    ) {
        nextScene.id = normalizeMemoryId(
            `${nextScene.mapId}_${nextScene.roomId}_${Number(worldState.turn?.count || 0) + 1}`,
            'next_scene',
        );
    }
    nextScene.nameEn = String(
        nextScene.nameEn ||
        room?.nameEn ||
        formatSceneLocationId(
            nextScene.roomId,
        ) ||
        'Next Scene',
    ).trim();
    nextScene.summaryEn = String(
        nextScene.summaryEn ||
        `${nextScene.nameEn} begins with the player-visible situation ready for a response.`,
    ).trim();
    nextScene.chapterEn = String(
        nextScene.chapterEn ||
        worldState.chapter ||
        nextScene.nameEn,
    ).trim();
    nextScene.temporalFactsEn =
        Array.isArray(
            nextScene.temporalFactsEn,
        )
            ? nextScene.temporalFactsEn
                .map(item =>
                    String(item || '').trim())
                .filter(Boolean)
                .slice(0, 6)
            : [];
    const hookWords = String(
        nextScene.explorationHookEn || '',
    )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    nextScene.explorationHookEn = (
        hookWords.length >= 6
            ? hookWords
            : [
                ...hookWords,
                'A nearby detail can be inspected or ignored.',
            ]
    )
        .slice(0, 60)
        .join(' ');
    const crowdedRoom =
        CROWDED_SCENE_ROOM_KINDS
            .has(room?.kind) ||
        [
            'public',
            'student',
            'visitor',
        ].includes(room?.access);
    const crowdDirectionWords =
        String(
            nextScene
                .crowdDirectionEn ||
            '',
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    nextScene.crowdDirectionEn =
        (
            crowdDirectionWords.length
                ? crowdDirectionWords
                : crowdedRoom
                    ? 'Keep the surrounding crowd alive through collective movement and one or two fleeting unnamed visual figures; give them no attributable dialogue or persistent identity.'
                        .split(/\s+/)
                    : []
        )
            .slice(0, 80)
            .join(' ');
    const projected = structuredClone(worldState);
    projected.map.activeMapId = nextScene.mapId;
    projected.map.currentLocalNodeId = nextScene.roomId;
    projected.scene = {
        ...(projected.scene || {}),
        mapId: nextScene.mapId,
        roomId: nextScene.roomId,
    };

    const validActorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const seenActorIds = new Set();
    nextScene.actorStates = (nextScene.actorStates || [])
        .filter(actor =>
            validActorIds.has(actor?.id) &&
            !seenActorIds.has(actor.id) &&
            seenActorIds.add(actor.id))
        .slice(0, 6)
        .map(actor => {
            const candidate =
                findSceneDestination(
                    actor.currentActivityEn,
                    projected,
                );
            const currentActor = (
                worldState.actors || []
            ).find(item =>
                item.id === actor.id);
            const normalizedActor = {
                ...actor,
                present:
                    actor.present === true,
                currentActivityEn:
                    String(
                        actor
                            .currentActivityEn ||
                        'Remaining nearby in the new scene.',
                    ).trim(),
                lifeStatus:
                    ACTOR_LIFE_STATUS_VALUES
                        .includes(
                            actor.lifeStatus,
                        )
                        ? actor.lifeStatus
                        : currentActor
                            ?.lifeStatus ||
                            'alive',
                lifeStatusPermanent:
                    currentActor
                        ?.lifeStatusPermanent ===
                        true ||
                    (
                        options.tier ===
                            'high' &&
                        actor
                            .lifeStatusPermanent ===
                            true
                    ),
                lifeStatusDetailEn:
                    String(
                        actor
                            .lifeStatusDetailEn ||
                        'Alive.',
                    ).trim(),
                mapId: nextScene.mapId,
                roomId: roomIds.has(
                    actor.roomId,
                )
                    ? actor.roomId
                    : candidate?.mapId ===
                        nextScene.mapId
                        ? candidate.roomId
                        : nextScene.roomId,
            };
            const firstImpressionWords =
                String(
                    normalizedActor
                        .firstImpressionOfPlayerEn ||
                    '',
                )
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);
            if (
                firstImpressionWords.length >
                FIRST_IMPRESSION_MAX_WORDS
            ) {
                const clipped =
                    firstImpressionWords
                        .slice(
                            0,
                            FIRST_IMPRESSION_MAX_WORDS,
                        )
                        .join(' ')
                        .replace(
                            /[,:;—-]+$/u,
                            '',
                        );
                normalizedActor
                    .firstImpressionOfPlayerEn =
                    /[.!?]$/u.test(clipped)
                        ? clipped
                        : `${clipped}.`;
            }
            if (
                profiles.get(actor.id)
                    ?.firstImpressionOfPlayerEn
            ) {
                delete normalizedActor
                    .firstImpressionOfPlayerEn;
            }
            return normalizedActor;
        });
    nextScene.openingSegments =
        Array.isArray(
            nextScene.openingSegments,
        )
            ? nextScene.openingSegments
                .filter(segment =>
                    ['narration', 'dialogue']
                        .includes(segment?.type) &&
                    String(
                        segment?.textEn || '',
                    ).trim())
                .slice(0, 8)
            : [];
    const presentIds = new Set(
        nextScene.actorStates
            .filter(actor => actor.present)
            .map(actor => actor.id),
    );
    nextScene.openingSegments =
        nextScene.openingSegments
            .filter(segment =>
                segment.type !== 'dialogue' ||
                presentIds.has(
                    segment.actorId,
                ));
    if (!nextScene.openingSegments.some(
        segment =>
            segment.type === 'narration',
    )) {
        nextScene.openingSegments.unshift({
            type: 'narration',
            textEn:
                `${nextScene.nameEn}: ${nextScene.summaryEn}`,
        });
    }
    if (nextScene.openingSegments.length < 2) {
        nextScene.openingSegments.push({
            type: 'narration',
            textEn:
                nextScene
                    .crowdDirectionEn ||
                'The immediate surroundings remain visible and available for the player to inspect or ignore.',
        });
    }
    projected.actors = nextScene.actorStates.map(actor => ({
        ...actor,
        nameEn: (worldState.actorLibrary || []).find(item =>
            item.id === actor.id)?.nameEn || actor.id,
    }));

    const following = nextScene.followingSceneIntent || {};
    if (!validateNextSceneIntent(following, projected).valid) {
        const candidate = findSceneDestination(
            `${following.titleEn || ''} ${following.summaryEn || ''}`,
            projected,
        );
        if (candidate) {
            following.mapId = candidate.mapId;
            following.roomId = candidate.roomId;
        }
    }
    if (!validateNextSceneIntent(following, projected).valid) {
        const fallback = createFallbackNextSceneIntent(projected);
        nextScene.followingSceneIntent = {
            ...fallback,
            titleEn: String(following.titleEn || fallback.titleEn),
            summaryEn: String(following.summaryEn || fallback.summaryEn),
            triggerEn: String(following.triggerEn || fallback.triggerEn),
            tier: ['medium', 'high'].includes(following.tier)
                ? following.tier
                : fallback.tier,
        };
    } else {
        nextScene.followingSceneIntent = following;
    }
    return normalized;
}

export function validateNextSceneIntent(intent, worldState) {
    const errors = [];
    if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
        return { valid: false, errors: ['下一幕意图必须是对象。'] };
    }
    for (const key of [
        'titleEn',
        'summaryEn',
        'triggerEn',
        'mapId',
        'roomId',
    ]) {
        if (!String(intent[key] || '').trim()) {
            errors.push(`下一幕意图缺少 ${key}。`);
        }
    }
    if (!['medium', 'high'].includes(intent.tier)) {
        errors.push('下一幕意图的 tier 必须是 medium 或 high。');
    }
    const map = getLocalMapDefinition(intent.mapId, worldState.map);
    const roomExists = getMapRooms(map, worldState.map)
        .some(room => room.id === intent.roomId);
    if (!map || !roomExists) {
        errors.push('下一幕意图必须引用现有地图和房间。');
    }
    return { valid: errors.length === 0, errors };
}

export function validateSceneTransitionPackage(payload, worldState, options = {}) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, errors: ['场景切换包必须是对象。'] };
    }
    const transitionMinutes = Number(payload.transitionMinutes);
    if (
        !Number.isInteger(
            transitionMinutes,
        ) ||
        transitionMinutes < 0
    ) {
        errors.push(
            'transitionMinutes 必须是非负整数。',
        );
    }
    const nextClock = String(
        payload.nextClock || '',
    );
    const currentClockMinutes =
        worldClockToEpochMinutes(
            worldState.clock,
        );
    const nextClockMinutes =
        worldClockToEpochMinutes(
            nextClock,
        );
    if (nextClockMinutes === null) {
        errors.push(
            'nextClock 必须是有效的 YYYY-MM-DD · HH:mm 权威时间。',
        );
    } else if (
        currentClockMinutes !== null &&
        nextClockMinutes <
            currentClockMinutes +
            Math.max(
                0,
                transitionMinutes,
            )
    ) {
        errors.push(
            'nextClock 不得早于当前时间加转场耗时。',
        );
    }
    errors.push(
        ...validateTransitionWorldChanges(
            payload.worldChanges,
            worldState,
            nextClock,
            {
                allowPending:
                    options
                        .deferWorldChanges ===
                    true,
            },
        ),
    );
    if (!String(payload.closureSummaryEn || '').trim()) {
        errors.push('场景切换包缺少具体的收束摘要。');
    }
    const authorQuillEn = String(
        payload.authorQuillEn || '',
    ).trim();
    const authorQuillWords = authorQuillEn
        .split(/\s+/)
        .filter(Boolean)
        .length;
    if (authorQuillWords < 40 ||
        authorQuillWords > 500) {
        errors.push(
            '作者的羽毛笔必须是 40–500 词的具体 OOC 章节评价。',
        );
    }
    if (!Array.isArray(payload.unresolvedThreadsEn) || payload.unresolvedThreadsEn.length > 8 ||
        payload.unresolvedThreadsEn.some(item => !String(item || '').trim())) {
        errors.push('unresolvedThreadsEn 必须是至多 8 条非空文本。');
    }
    const relationshipUpdates =
        payload.relationshipUpdates;
    const relationshipActorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const updatedRelationshipIds = new Set();
    if (!Array.isArray(relationshipUpdates) ||
        relationshipUpdates.length > 6) {
        errors.push(
            'relationshipUpdates 必须是至多 6 条人物关系结算。',
        );
    } else {
        relationshipUpdates.forEach(update => {
            if (
                !relationshipActorIds.has(
                    update?.id,
                ) ||
                updatedRelationshipIds.has(
                    update?.id,
                )
            ) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 不存在或重复。`,
                );
            }
            updatedRelationshipIds.add(
                update?.id,
            );
            if (!isValidImpressionShorthand(
                update?.impressionOfPlayerEn,
            )) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 的印象必须是非占位的 1–${IMPRESSION_MAX_WORDS} 词主观 shorthand。`,
                );
            }
            const memoryWords = countTextWords(
                update?.sceneMemoryEn,
            );
            if (memoryWords < 8 ||
                memoryWords > 32) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 的章节记忆必须是 8–32 词。`,
                );
            }
        });
    }

    const nextScene = payload.nextScene;
    if (!nextScene || typeof nextScene !== 'object' || Array.isArray(nextScene)) {
        return { valid: false, errors: [...errors, '场景切换包缺少 nextScene。'] };
    }
    if (!/^[a-z][a-z0-9_]{2,79}$/.test(String(nextScene.id || ''))) {
        errors.push('nextScene.id 必须是唯一的 snake_case ID。');
    }
    const usedSceneIds = new Set([
        worldState.scene?.id,
        ...(worldState.sceneArchive || []).map(scene => scene.id),
    ].filter(Boolean));
    if (usedSceneIds.has(nextScene.id)) {
        errors.push(`场景 ID ${nextScene.id} 已被使用。`);
    }
    for (const key of ['nameEn', 'summaryEn', 'chapterEn', 'mapId', 'roomId']) {
        if (!String(nextScene[key] || '').trim()) {
            errors.push(`nextScene 缺少 ${key}。`);
        }
    }
    const explorationHookEn = String(
        nextScene.explorationHookEn || '',
    ).trim();
    const explorationHookWords =
        explorationHookEn
            .split(/\s+/)
            .filter(Boolean)
            .length;
    if (
        explorationHookWords < 6 ||
        explorationHookWords > 60
    ) {
        errors.push(
            '下一场景必须包含 6–60 词的非剧透 explorationHookEn。',
        );
    }
    if (
        !Array.isArray(
            nextScene.temporalFactsEn,
        ) ||
        nextScene.temporalFactsEn.length > 6 ||
        nextScene.temporalFactsEn.some(
            item =>
                !String(item || '').trim(),
        )
    ) {
        errors.push(
            '下一场景 temporalFactsEn 必须是至多 6 条非空公开时间事实。',
        );
    }

    const map = getLocalMapDefinition(nextScene.mapId, worldState.map);
    const rooms = map ? [
        ...(map.nodes || []),
        ...(worldState.map?.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ] : [];
    const room = rooms.find(item => item.id === nextScene.roomId);
    if (!map) {
        errors.push(`nextScene 引用了不存在的地图 ${nextScene.mapId || '?'}。`);
    } else if (!room) {
        errors.push(`nextScene 引用了不存在的房间 ${nextScene.roomId || '?'}。`);
    }
    if (options.expectedMapId && nextScene.mapId !== options.expectedMapId) {
        errors.push(`下一场景必须使用玩家指定的地图 ${options.expectedMapId}。`);
    }
    if (options.expectedRoomId && nextScene.roomId !== options.expectedRoomId) {
        errors.push(`下一场景必须落在玩家指定的房间 ${options.expectedRoomId}。`);
    }

    const actorIds = new Set((worldState.actorLibrary || []).map(actor => actor.id));
    const actorStates = Array.isArray(nextScene.actorStates) ? nextScene.actorStates : [];
    const stateIds = new Set();
    if (actorStates.length > 6) {
        errors.push('下一场景人物状态不能超过 6 条。');
    }
    actorStates.forEach(actor => {
        if (!actorIds.has(actor.id) || stateIds.has(actor.id)) {
            errors.push(`下一场景人物 ${actor.id || '?'} 不存在或重复。`);
        }
        stateIds.add(actor.id);
        if (typeof actor.present !== 'boolean' || !String(actor.currentActivityEn || '').trim()) {
            errors.push(`下一场景人物 ${actor.id || '?'} 缺少公开活动状态。`);
        }
        const currentActor =
            (worldState.actors || []).find(
                item => item.id === actor.id,
            );
        const profile =
            (worldState.actorLibrary || [])
                .find(item =>
                    item.id === actor.id);
        const needsFirstImpression =
            actor.present === true &&
            actor.roomId ===
                nextScene.roomId &&
            !profile
                ?.firstImpressionOfPlayerEn &&
            (
                currentActor?.present !== true ||
                profile
                    ?.firstImpressionPending ===
                    true
            );
        if (
            needsFirstImpression &&
            !isValidFirstImpression(
                actor
                    .firstImpressionOfPlayerEn,
            )
        ) {
            errors.push(
                `下一场景新入场人物 ${actor.id || '?'} 必须提交基于玩家可见特征的初见印象。`,
            );
        }
        if (
            actor
                .firstImpressionOfPlayerEn &&
            profile
                ?.firstImpressionOfPlayerEn
        ) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 已有初见印象，不得覆盖。`,
            );
        }
        const currentLifeStatus =
            currentActor?.lifeStatus ||
            'alive';
        const nextLifeStatus =
            actor.lifeStatus;
        if (!ACTOR_LIFE_STATUS_VALUES.includes(
            nextLifeStatus,
        )) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 的 lifeStatus 无效。`,
            );
        }
        if (
            typeof actor
                .lifeStatusPermanent !==
                'boolean' ||
            !String(
                actor.lifeStatusDetailEn ||
                '',
            ).trim()
        ) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 必须明确生命状态、永久标记和公开说明。`,
            );
        }
        if (
            currentActor
                ?.lifeStatusPermanent &&
            currentLifeStatus === 'dead' &&
            nextLifeStatus !== 'dead'
        ) {
            errors.push(
                `永久死亡人物 ${actor.id || '?'} 不能恢复为其他状态。`,
            );
        }
        if (
            nextLifeStatus === 'dead' &&
            options.tier !== 'high' &&
            currentLifeStatus !== 'dead'
        ) {
            errors.push(
                `只有高端世界导演可以提交人物 ${actor.id || '?'} 的永久死亡。`,
            );
        }
        if (
            actor.lifeStatusPermanent &&
            !currentActor
                ?.lifeStatusPermanent &&
            options.tier !== 'high'
        ) {
            errors.push(
                `只有高端世界导演可以提交人物 ${actor.id || '?'} 的永久生命状态。`,
            );
        }
        if (
            ['dead', 'missing'].includes(
                nextLifeStatus,
            ) &&
            actor.present
        ) {
            errors.push(
                `死亡或失踪人物 ${actor.id || '?'} 不能标记为在场行动者。`,
            );
        }
        const actorMapId = actor.mapId || nextScene.mapId;
        if (actorMapId !== nextScene.mapId ||
            !rooms.some(room => room.id === actor.roomId)) {
            errors.push(`下一场景人物 ${actor.id || '?'} 的地图房间无效。`);
        }
    });

    const presentActorIds = new Set(
        actorStates.filter(actor => actor.present).map(actor => actor.id),
    );
    const summaryText =
        String(
            nextScene.summaryEn ||
            '',
        ).toLocaleLowerCase();
    (
        worldState.actorLibrary ||
        []
    ).forEach(profile => {
        const explicitlyNamed =
            [
                profile.nameEn,
                ...(
                    profile.aliases ||
                    []
                ),
            ]
                .filter(name =>
                    String(name || '')
                        .trim()
                        .length >= 4)
                .some(name =>
                    summaryText.includes(
                        String(name)
                            .toLocaleLowerCase(),
                    ));
        if (
            explicitlyNamed &&
            !presentActorIds.has(
                profile.id,
            )
        ) {
            errors.push(
                `下一场景摘要明确点名 ${profile.id}，该人物必须以 present:true 写入 actorStates。`,
            );
        }
    });
    const segments = Array.isArray(nextScene.openingSegments)
        ? nextScene.openingSegments
        : [];
    if (segments.length < 2 || segments.length > 8) {
        errors.push('下一场景开场必须包含 2–8 个分段。');
    }
    if (!segments.some(segment => segment.type === 'narration')) {
        errors.push('下一场景开场至少需要一个环境或动作描写分段。');
    }
    segments.forEach(segment => {
        if (!['narration', 'dialogue'].includes(segment.type) ||
            !String(segment.textEn || '').trim()) {
            errors.push('下一场景开场包含无效或空白分段。');
        }
        if (segment.type === 'dialogue' && !presentActorIds.has(segment.actorId)) {
            errors.push(`下一场景对白引用了不在场人物 ${segment.actorId || '?'}。`);
        }
    });
    const followingIntent = validateNextSceneIntent(
        nextScene.followingSceneIntent,
        worldState,
    );
    errors.push(...followingIntent.errors.map(error =>
        `后续${error}`));
    if (options.requireDestinationGrounding &&
        options.expectedMapId &&
        options.expectedRoomId) {
        const grounding = validateSceneDestinationGrounding(
            payload,
            worldState,
            {
                mapId: options.expectedMapId,
                roomId: options.expectedRoomId,
            },
        );
        errors.push(...grounding.errors);
    }
    return { valid: errors.length === 0, errors };
}

export function applySceneTransition(worldState, payload, archiveEntry = {}, options = {}) {
    const validation = validateSceneTransitionPackage(payload, worldState, options);
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const nextScene = payload.nextScene;
    const map = getLocalMapDefinition(nextScene.mapId, next.map);
    const rooms = [
        ...(map.nodes || []),
        ...(next.map.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ];
    const room = rooms.find(item => item.id === nextScene.roomId);
    const nextClock = payload.nextClock;
    const closureTimelineEntry = {
        clock: archiveEntry.endedClock || worldState.clock,
        label: archiveEntry.closureSummary || payload.closureSummaryEn,
    };
    const archivedTimelineEntries = structuredClone(
        archiveEntry.timelineEntries?.length
            ? archiveEntry.timelineEntries
            : worldState.scene?.timelineEntries || [],
    );
    const lastArchivedEntry =
        archivedTimelineEntries[archivedTimelineEntries.length - 1];
    if (lastArchivedEntry?.clock !== closureTimelineEntry.clock ||
        lastArchivedEntry?.label !== closureTimelineEntry.label) {
        archivedTimelineEntries.push(closureTimelineEntry);
    }
    const committedArchiveEntry = {
        ...structuredClone(archiveEntry),
        timelineEntries: archivedTimelineEntries,
    };

    next.sceneArchive = [
        ...(next.sceneArchive || []).filter(scene => scene.id !== archiveEntry.id),
        committedArchiveEntry,
    ];
    next.clock = nextClock;
    const normalizedWorldChanges =
        normalizeTransitionWorldChanges(
            payload.worldChanges,
        );
    const worldChangePending =
        options.deferWorldChanges ===
            true &&
        Number(
            getWorldClockGapMinutes(
                worldState.clock,
                nextClock,
            ),
        ) >=
            WORLD_CHANGE_MIN_DAYS *
            1440 &&
        !normalizedWorldChanges
            .prophetBriefs.length &&
        !normalizedWorldChanges
            .gossipUpdates.length;
    const worldChangeEntry =
        worldChangePending
            ? null
            : applyTransitionWorldChanges(
                next,
                worldState,
                payload,
            );
    const currentTurn = Math.max(
        0,
        Number(next.turn?.count || 0),
    );
    const relationshipUpdates = new Map(
        (payload.relationshipUpdates || [])
            .map(update => [
                update.id,
                update,
            ]),
    );
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(profile => {
        const update =
            relationshipUpdates.get(
                profile.id,
            );
        let normalized =
            normalizeActorMemoryProfile(profile);
        if (!update) return normalized;
        normalized = {
            ...normalized,
            impressionOfPlayerEn:
                update.impressionOfPlayerEn,
            impressionOfPlayer:
                update.impressionOfPlayer ||
                update.impressionOfPlayerEn,
            impressionUpdatedClock:
                nextClock,
            impressionUpdatedTurn:
                currentTurn,
        };
        return upsertSharedMemory(
            normalized,
            {
                id: `${profile.id}_${archiveEntry.id || worldState.scene?.id || 'scene'}_recent_${currentTurn}`,
                summaryEn:
                    update.sceneMemoryEn,
                summary:
                    update.sceneMemory ||
                    update.sceneMemoryEn,
                firstClock:
                    archiveEntry.startedClock ||
                    worldState.scene
                        ?.startedClock ||
                    worldState.clock,
                lastClock:
                    archiveEntry.endedClock ||
                    worldState.clock,
                createdTurn: currentTurn,
                updatedTurn: currentTurn,
                source: 'medium_transition',
                significance: 'notable',
                lastingImpactEn:
                    update.sceneMemoryEn,
                lastingImpact:
                    update.sceneMemory ||
                    update.sceneMemoryEn,
            },
            'recent',
        );
    });
    next.chapter = nextScene.chapter || nextScene.chapterEn;
    next.location = room.name || nextScene.name || nextScene.nameEn;
    next.items = (next.items || [])
        .map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId:
                            nextScene.mapId,
                        roomId:
                            nextScene.roomId,
                        clock: nextClock,
                    },
                );
            if (
                normalized.ownerId ===
                    'player' &&
                ['carried', 'equipped']
                    .includes(
                        normalized.custody,
                    )
            ) {
                return {
                    ...normalized,
                    mapId:
                        nextScene.mapId,
                    roomId:
                        nextScene.roomId,
                    updatedClock:
                        nextClock,
                };
            }
            return normalized;
        });
    next.scene = {
        id: nextScene.id,
        name: nextScene.name || nextScene.nameEn,
        nameEn: nextScene.nameEn,
        summary: nextScene.summary || nextScene.summaryEn,
        summaryEn: nextScene.summaryEn,
        explorationHook:
            nextScene.explorationHook ||
            nextScene.explorationHookEn,
        explorationHookEn:
            nextScene.explorationHookEn,
        crowdDirection:
            nextScene.crowdDirection ||
            nextScene.crowdDirectionEn,
        crowdDirectionEn:
            nextScene.crowdDirectionEn,
        temporalFacts:
            nextScene.temporalFacts ||
            nextScene.temporalFactsEn,
        temporalFactsEn:
            nextScene.temporalFactsEn,
        temporalGroundingVersion:
            TEMPORAL_STATE_VERSION,
        worldChangeId:
            worldChangeEntry?.id || '',
        startedClock: nextClock,
        startedMessageId: Number(options.startedMessageId || 0),
        timelineEntries: [{
            clock: nextClock,
            label: nextScene.summary || nextScene.summaryEn,
        }],
        mapId: nextScene.mapId,
        roomId: nextScene.roomId,
        itemStates:
            createSceneItemStates(
                next.items,
                {
                    mapId:
                        nextScene.mapId,
                    roomId:
                        nextScene.roomId,
                },
            ),
        nextSceneIntent: structuredClone(
            nextScene.followingSceneIntent,
        ),
    };
    next.map.activeMapId = nextScene.mapId;
    next.map.currentLocalNodeId = nextScene.roomId;
    next.map.currentLevelId = room.levelId || map.defaultLevelId;
    next.map.discoveredLocalNodeIds = [...new Set([
        ...(next.map.discoveredLocalNodeIds || []),
        `${nextScene.mapId}:${nextScene.roomId}`,
    ])];

    const actorStateMap = new Map(
        nextScene.actorStates.map(actor => [actor.id, actor]),
    );
    const existingActors = new Map((next.actors || []).map(actor => [actor.id, actor]));
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(profile => {
        const current =
            existingActors.get(profile.id);
        const update =
            actorStateMap.get(profile.id);
        if (
            update
                ?.firstImpressionOfPlayerEn &&
            !profile
                .firstImpressionOfPlayerEn
        ) {
            const currentImpression =
                normalizeActorMemoryProfile(
                    profile,
                    current,
                );
            const seedCurrent =
                hasGenericImpression(
                    currentImpression
                        .impressionOfPlayerEn,
                );
            return normalizeActorMemoryProfile({
                ...currentImpression,
                firstImpressionOfPlayerEn:
                    update
                        .firstImpressionOfPlayerEn,
                firstImpressionOfPlayer:
                    update
                        .firstImpressionOfPlayer ||
                    update
                        .firstImpressionOfPlayerEn,
                firstImpressionClock:
                    nextClock,
                firstImpressionTurn:
                    currentTurn,
                firstImpressionPending:
                    false,
                ...(seedCurrent
                    ? {
                        impressionOfPlayerEn:
                            update
                                .firstImpressionOfPlayerEn,
                        impressionOfPlayer:
                            update
                                .firstImpressionOfPlayer ||
                            update
                                .firstImpressionOfPlayerEn,
                        impressionUpdatedClock:
                            nextClock,
                        impressionUpdatedTurn:
                            currentTurn,
                    }
                    : {}),
                introducedClock:
                    profile.introducedClock ||
                    nextClock,
                introducedTurn:
                    profile.introducedTurn ??
                    currentTurn,
            }, {
                ...current,
                present: true,
            });
        }
        if (
            update?.present === true &&
            current?.present !== true &&
            !profile
                .firstImpressionOfPlayerEn
        ) {
            return normalizeActorMemoryProfile({
                ...profile,
                introducedClock:
                    profile.introducedClock ||
                    nextClock,
                introducedTurn:
                    profile.introducedTurn ??
                    currentTurn,
                firstImpressionPending:
                    true,
            }, {
                ...current,
                present: true,
            });
        }
        return normalizeActorMemoryProfile(
            profile,
            current,
        );
    });
    next.actors = (next.actorLibrary || []).map(profile => {
        const current = existingActors.get(profile.id) || {};
        const update = actorStateMap.get(profile.id);
        const lifeStatus =
            update?.lifeStatus ||
            current.lifeStatus ||
            profile.lifeStatus ||
            'alive';
        const lifeStatusPermanent =
            lifeStatus === 'dead'
                ? update
                    ?.lifeStatusPermanent !==
                    false
                : Boolean(
                    update
                        ?.lifeStatusPermanent ??
                    current
                        .lifeStatusPermanent ??
                    profile
                        .lifeStatusPermanent,
                );
        return {
            ...current,
            id: profile.id,
            nameEn: current.nameEn || profile.nameEn,
            name: current.name || profile.name || profile.nameEn,
            roleEn: current.roleEn || profile.roleEn,
            role: current.role || profile.role || profile.roleEn,
            relationshipToPlayerEn: current.relationshipToPlayerEn || profile.relationshipToPlayerEn,
            relationshipToPlayer: current.relationshipToPlayer || profile.relationshipToPlayer,
            firstImpressionOfPlayerEn:
                profile
                    .firstImpressionOfPlayerEn ||
                current
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    .firstImpressionOfPlayer ||
                current
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile.firstImpressionClock ||
                current.firstImpressionClock,
            firstImpressionTurn:
                profile.firstImpressionTurn ||
                current.firstImpressionTurn,
            firstImpressionPending:
                profile.firstImpressionPending,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn ||
                current.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer ||
                current.impressionOfPlayer ||
                profile.impressionOfPlayerEn,
            impressionUpdatedClock:
                profile.impressionUpdatedClock ||
                current.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn ||
                current.impressionUpdatedTurn,
            publicDescriptionEn: current.publicDescriptionEn || profile.publicDescriptionEn,
            present:
                lifeStatus === 'dead'
                    ? false
                    : update?.present === true,
            lifeStatus,
            lifeStatusPermanent,
            lifeStatusDetailEn:
                update
                    ?.lifeStatusDetailEn ||
                current
                    .lifeStatusDetailEn ||
                profile
                    .lifeStatusDetailEn ||
                (
                    lifeStatus === 'alive'
                        ? 'Alive.'
                        : ''
                ),
            lifeStatusDetail:
                update
                    ?.lifeStatusDetail ||
                update
                    ?.lifeStatusDetailEn ||
                current
                    .lifeStatusDetail ||
                profile
                    .lifeStatusDetail ||
                (
                    lifeStatus === 'alive'
                        ? '存活。'
                        : ''
                ),
            lifeStatusSinceClock:
                lifeStatus !==
                    (
                        current.lifeStatus ||
                        profile.lifeStatus ||
                        'alive'
                    )
                    ? nextClock
                    : current
                        .lifeStatusSinceClock ||
                        profile
                            .lifeStatusSinceClock ||
                        '',
            mapId: update?.mapId || current.mapId || nextScene.mapId,
            roomId: update?.roomId || current.roomId || nextScene.roomId,
            currentActivityEn: update?.currentActivityEn || current.currentActivityEn || '',
            currentActivity: update?.currentActivity || update?.currentActivityEn ||
                current.currentActivity || '',
        };
    }).concat(
        (worldState.actors || [])
            .filter(actor =>
                actor.temporary)
            .map(actor => ({
                ...structuredClone(actor),
                present: false,
                currentActivityEn:
                    actor.currentActivityEn ||
                    'No longer in the active scene.',
                currentActivity:
                    actor.currentActivity ||
                    actor.currentActivityEn ||
                    '已离开当前场景。',
            })),
    );
    const lifeStates = new Map(
        next.actors.map(actor => [
            actor.id,
            actor,
        ]),
    );
    next.actorLibrary =
        next.actorLibrary.map(profile => {
            const actor =
                lifeStates.get(profile.id);
            return actor ? {
                ...profile,
                lifeStatus:
                    actor.lifeStatus,
                lifeStatusPermanent:
                    actor
                        .lifeStatusPermanent,
                lifeStatusDetailEn:
                    actor
                        .lifeStatusDetailEn,
                lifeStatusDetail:
                    actor.lifeStatusDetail,
                lifeStatusSinceClock:
                    actor
                        .lifeStatusSinceClock,
            } : profile;
        });
    next.timeline = [
        ...(next.timeline || []),
        closureTimelineEntry,
        next.scene.timelineEntries[0],
    ].slice(-20);
    next.sceneTransition = {
        status: 'idle',
        tier: options.tier || 'medium',
        error: '',
        requestedAt: null,
        settledAt: new Date().toISOString(),
    };
    next.sceneEnrichment = {
        ...(next.sceneEnrichment || {}),
        worldChanges:
            worldChangePending
                ? {
                    status: 'pending',
                    sceneId:
                        nextScene.id,
                    fromClock:
                        worldState.clock,
                    toClock:
                        nextClock,
                    error: '',
                }
                : {
                    status: 'ready',
                    sceneId:
                        nextScene.id,
                    fromClock:
                        worldState.clock,
                    toClock:
                        nextClock,
                    error: '',
                },
    };
    next.pacingDirector = {
        ...(next.pacingDirector || {}),
        status: 'idle',
        error: '',
        pendingBeat: null,
    };
    next.memoryDirector = {
        ...(next.memoryDirector || {}),
        status: 'ready',
        error: '',
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        lastReviewedTurn:
            options
                .deferSocialConsolidation ===
                true
                ? Number(
                    next.memoryDirector
                        ?.lastReviewedTurn ||
                    0,
                )
                : currentTurn,
        pendingEventBoundary: null,
    };
    delete next.memoryDirector
        .reviewAfterTurns;
    next.turn = {
        ...(next.turn || {}),
        status: 'idle',
        error: '',
    };
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId: nextScene.mapId,
            roomId: nextScene.roomId,
        },
        lastMovement: null,
    };
    return next;
}

export function getLocalMapDefinition(mapId, mapState = {}) {
    return (mapState.customLocalMaps || []).find(map => map.id === mapId) || getPresetLocalMap(mapId);
}

const INTERIOR_CONTAINER_KINDS =
    new Set([
        'train',
        'vehicle',
        'ship',
        'vessel',
        'carriage',
    ]);

export function getInteriorMapRequest(
    worldState,
) {
    const mapState = worldState.map || {};
    const parentMapId = String(
        mapState.activeMapId || '',
    );
    const parentRoomId = String(
        mapState.currentLocalNodeId || '',
    );
    const parentMap =
        getLocalMapDefinition(
            parentMapId,
            mapState,
        );
    if (
        !parentMap ||
        parentMap.sourceContainerKey ||
        !parentRoomId
    ) {
        return null;
    }
    const room = getMapRooms(
        parentMap,
        mapState,
    ).find(node =>
        node.id === parentRoomId);
    if (
        !room ||
        (
            !INTERIOR_CONTAINER_KINDS
                .has(room.kind) &&
            !(room.tags || []).includes(
                'requires_interior_map',
            )
        )
    ) {
        return null;
    }
    const bindingKey =
        `${parentMapId}:${parentRoomId}`;
    const boundMapId =
        mapState.interiorMapBindings
            ?.[bindingKey] || '';
    const boundMap = boundMapId
        ? getLocalMapDefinition(
            boundMapId,
            mapState,
        )
        : null;
    return {
        bindingKey,
        status: boundMap
            ? 'ready'
            : 'missing',
        parentMapId,
        parentRoomId,
        parentMapName:
            parentMap.name ||
            parentMap.nameEn ||
            parentMapId,
        parentMapNameEn:
            parentMap.nameEn ||
            parentMap.name ||
            parentMapId,
        parentWorldNodeId:
            parentMap
                .parentWorldNodeId ||
            parentMapId,
        parentRoomName:
            room.name ||
            room.nameEn ||
            parentRoomId,
        parentRoomNameEn:
            room.nameEn ||
            room.name ||
            parentRoomId,
        parentRoomKind:
            room.kind || 'container',
        parentRoomDescriptionEn:
            room.descriptionEn ||
            room.description ||
            '',
        suggestedMapId:
            `${parentMapId}_${parentRoomId}_interior`
                .replace(
                    /[^a-z0-9_]/g,
                    '_',
                )
                .slice(0, 63),
        boundMapId:
            boundMap?.id || '',
    };
}

export function normalizeGeneratedInteriorMapLabels(
    worldState,
) {
    let changed = false;
    const next =
        structuredClone(worldState);
    next.map.customLocalMaps =
        (next.map.customLocalMaps || [])
            .map(map => {
                if (
                    map.generatedBy !==
                        'medium-scene-director' ||
                    !map.parentMapId ||
                    !map.parentRoomId
                ) {
                    return map;
                }
                const parentMap =
                    getLocalMapDefinition(
                        map.parentMapId,
                        next.map,
                    );
                const parentRoom =
                    getMapRooms(
                        parentMap,
                        next.map,
                    ).find(room =>
                        room.id ===
                            map.parentRoomId);
                const isTrain =
                    parentRoom?.kind ===
                        'train';
                const normalizeLabel =
                    value => isTrain
                        ? String(value || '')
                            .replace(
                                /快速/g,
                                '特快',
                            )
                            .replace(
                                /马车/g,
                                '车厢',
                            )
                            .replace(
                                /登机/g,
                                '上车',
                            )
                        : String(
                            value || '',
                        );
                const name =
                    parentRoom?.name
                        ? `${parentRoom.name} · 内部`
                        : normalizeLabel(
                            map.name ||
                            map.nameEn,
                        );
                const levels =
                    (map.levels || [])
                        .map(level => ({
                            ...level,
                            name:
                                normalizeLabel(
                                    level.name ||
                                    level.nameEn,
                                ),
                        }));
                const nodes =
                    (map.nodes || [])
                        .map(node => ({
                            ...node,
                            name:
                                normalizeLabel(
                                    node.name ||
                                    node.nameEn,
                                ),
                        }));
                if (
                    name !== map.name ||
                    levels.some(
                        (level, index) =>
                            level.name !==
                            map.levels?.[
                                index
                            ]?.name) ||
                    nodes.some(
                        (node, index) =>
                            node.name !==
                            map.nodes?.[
                                index
                            ]?.name)
                ) {
                    changed = true;
                }
                return {
                    ...map,
                    name,
                    levels,
                    nodes,
                };
            });
    if (changed) {
        const activeMap =
            next.map.customLocalMaps
                .find(map =>
                    map.id ===
                        next.map.activeMapId);
        if (activeMap) {
            next.location =
                activeMap.name ||
                activeMap.nameEn ||
                next.location;
        }
    }
    return {
        state: changed
            ? next
            : worldState,
        changed,
    };
}

export function validateGeneratedInteriorMap(
    generatedMap,
    worldState,
    request =
    getInteriorMapRequest(
        worldState,
    ),
) {
    const errors = [];
    if (
        !request ||
        request.status !== 'missing'
    ) {
        return {
            valid: false,
            errors: [
                '当前地点不需要创建新的内部地图。',
            ],
        };
    }
    if (
        !generatedMap ||
        typeof generatedMap !== 'object' ||
        Array.isArray(generatedMap)
    ) {
        return {
            valid: false,
            errors: ['内部地图包必须是对象。'],
        };
    }
    if (
        generatedMap.version !== 1 ||
        !OPENING_ID_PATTERN.test(
            String(
                generatedMap.id || '',
            ),
        ) ||
        generatedMap.id !==
            request.suggestedMapId ||
        !String(
            generatedMap.nameEn || '',
        ).trim()
    ) {
        errors.push(
            '内部地图版本、稳定 ID 或英文名称无效。',
        );
    }
    if (
        getLocalMapDefinition(
            generatedMap.id,
            worldState.map,
        )
    ) {
        errors.push(
            '内部地图 ID 已被现有地图占用。',
        );
    }
    const levels = Array.isArray(
        generatedMap.levels,
    )
        ? generatedMap.levels
        : [];
    const rooms = Array.isArray(
        generatedMap.rooms,
    )
        ? generatedMap.rooms
        : [];
    const exits = Array.isArray(
        generatedMap.exits,
    )
        ? generatedMap.exits
        : [];
    if (
        levels.length < 1 ||
        levels.length > 4 ||
        rooms.length < 2 ||
        rooms.length > 16
    ) {
        errors.push(
            '内部地图必须包含 1–4 个分区和 2–16 个房间。',
        );
    }
    const levelIds = new Set();
    levels.forEach(level => {
        if (
            !OPENING_ID_PATTERN.test(
                String(level?.id || ''),
            ) ||
            levelIds.has(level.id) ||
            !String(
                level?.nameEn || '',
            ).trim()
        ) {
            errors.push(
                '内部地图分区 ID、名称无效或重复。',
            );
        }
        levelIds.add(level?.id);
    });
    const roomIds = new Set();
    rooms.forEach(room => {
        if (
            !OPENING_ID_PATTERN.test(
                String(room?.id || ''),
            ) ||
            roomIds.has(room.id) ||
            !levelIds.has(room.levelId) ||
            !String(
                room?.nameEn || '',
            ).trim() ||
            !String(
                room?.descriptionEn || '',
            ).trim()
        ) {
            errors.push(
                `内部房间 ${room?.id || '?'} 的 ID、名称、描述或分区无效。`,
            );
        }
        if (
            !Number.isFinite(room?.x) ||
            room.x < 5 ||
            room.x > 95 ||
            !Number.isFinite(room?.y) ||
            room.y < 5 ||
            room.y > 95
        ) {
            errors.push(
                `内部房间 ${room?.id || '?'} 坐标必须在 5–95。`,
            );
        }
        roomIds.add(room?.id);
    });
    if (
        !levelIds.has(
            generatedMap.currentLevelId,
        ) ||
        !roomIds.has(
            generatedMap.currentRoomId,
        )
    ) {
        errors.push(
            '内部地图的当前分区或当前房间不存在。',
        );
    }
    const adjacency = new Map(
        [...roomIds].map(id => [id, []]),
    );
    const exitKeys = new Set();
    exits.forEach(route => {
        const key =
            `${route?.from}->${route?.to}`;
        if (
            !roomIds.has(route?.from) ||
            !roomIds.has(route?.to) ||
            route.from === route.to ||
            exitKeys.has(key)
        ) {
            errors.push(
                '内部地图出口引用了无效、相同或重复的房间。',
            );
            return;
        }
        exitKeys.add(key);
        adjacency.get(route.from)
            .push(route.to);
        adjacency.get(route.to)
            .push(route.from);
    });
    if (
        roomIds.size &&
        exits.length < roomIds.size - 1
    ) {
        errors.push(
            '内部地图出口不足以连接全部房间。',
        );
    } else if (
        roomIds.has(
            generatedMap.currentRoomId,
        )
    ) {
        const visited = new Set([
            generatedMap.currentRoomId,
        ]);
        const queue = [
            generatedMap.currentRoomId,
        ];
        while (queue.length) {
            const current = queue.shift();
            for (
                const target of
                adjacency.get(current) ||
                    []
            ) {
                if (visited.has(target)) {
                    continue;
                }
                visited.add(target);
                queue.push(target);
            }
        }
        if (visited.size !== roomIds.size) {
            errors.push(
                '内部地图必须从当前房间连通全部房间。',
            );
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}

function enterInteriorMap(
    worldState,
    customMap,
    request,
) {
    const next =
        structuredClone(worldState);
    const displayMap =
        structuredClone(customMap);
    const normalizeTrainLabel = value =>
        request.parentRoomKind === 'train'
            ? String(value || '')
                .replace(/快速/g, '特快')
                .replace(/马车/g, '车厢')
                .replace(/登机/g, '上车')
            : String(value || '');
    displayMap.name =
        request.parentRoomName
            ? `${request.parentRoomName} · 内部`
            : normalizeTrainLabel(
                displayMap.name ||
                displayMap.nameEn,
            );
    displayMap.levels =
        (displayMap.levels || [])
            .map(level => ({
                ...level,
                name: normalizeTrainLabel(
                    level.name ||
                    level.nameEn,
                ),
            }));
    displayMap.nodes =
        (displayMap.nodes || [])
            .map(node => ({
                ...node,
                name: normalizeTrainLabel(
                    node.name ||
                    node.nameEn,
                ),
            }));
    next.map.customLocalMaps = [
        ...(
            next.map.customLocalMaps ||
            []
        ).filter(map =>
            map.id !== displayMap.id),
        displayMap,
    ];
    const room =
        displayMap.nodes.find(node =>
            node.id ===
                displayMap.currentRoomId) ||
        displayMap.nodes.find(node =>
            node.id ===
                displayMap.defaultRoomId) ||
        displayMap.nodes[0];
    next.map.interiorMapBindings = {
        ...(
            next.map
                .interiorMapBindings || {}
        ),
        [request.bindingKey]:
            displayMap.id,
    };
    next.map.activeMapId =
        displayMap.id;
    next.map.currentLocalNodeId =
        room.id;
    next.map.currentLevelId =
        room.levelId ||
        displayMap.defaultLevelId;
    next.map.discoveredLocalNodeIds =
        [...new Set([
            ...(
                next.map
                    .discoveredLocalNodeIds ||
                []
            ),
            `${displayMap.id}:${room.id}`,
        ])];
    next.location =
        displayMap.name ||
        displayMap.nameEn ||
        room.name ||
        room.nameEn;
    if (next.scene) {
        next.scene.mapId =
            displayMap.id;
        next.scene.roomId =
            room.id;
        if (
            next.scene
                .nextSceneIntent
                ?.mapId ===
                request.parentMapId &&
            next.scene
                .nextSceneIntent
                ?.roomId ===
                request.parentRoomId
        ) {
            next.scene.nextSceneIntent = {
                ...next.scene
                    .nextSceneIntent,
                mapId: displayMap.id,
                roomId: room.id,
            };
        }
    }
    next.actors = (next.actors || [])
        .map(actor =>
            actor.present !== false &&
            (actor.mapId ||
                request.parentMapId) ===
                request.parentMapId &&
            (actor.roomId ||
                request.parentRoomId) ===
                request.parentRoomId
                ? {
                    ...actor,
                    mapId: displayMap.id,
                    roomId: room.id,
                }
                : actor);
    next.items = (next.items || [])
        .map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId:
                            displayMap.id,
                        roomId: room.id,
                        clock: next.clock,
                    },
                );
            return normalized.ownerId ===
                'player' &&
                [
                    'carried',
                    'equipped',
                ].includes(
                    normalized.custody,
                )
                ? {
                    ...normalized,
                    mapId: displayMap.id,
                    roomId: room.id,
                    updatedClock:
                        next.clock,
                }
                : normalized;
        });
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId: displayMap.id,
                    roomId: room.id,
                },
            );
    }
    next.spatial = {
        version:
            SPATIAL_STATE_VERSION,
        openingGroundingVersion:
            next.spatial
                ?.openingGroundingVersion ||
            0,
        player: {
            mapId: displayMap.id,
            roomId: room.id,
        },
        lastMovement:
            next.spatial
                ?.lastMovement || null,
    };
    return next;
}

export function applyGeneratedInteriorMap(
    worldState,
    generatedMap,
    request =
    getInteriorMapRequest(
        worldState,
    ),
) {
    const validation =
        validateGeneratedInteriorMap(
            generatedMap,
            worldState,
            request,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    const display =
        generatedMap.display || {};
    const customMap = {
        id: generatedMap.id,
        parentWorldNodeId:
            request.parentWorldNodeId,
        parentMapId:
            request.parentMapId,
        parentRoomId:
            request.parentRoomId,
        sourceContainerKey:
            request.bindingKey,
        generatedBy:
            'medium-scene-director',
        generatedAt:
            new Date().toISOString(),
        name:
            display.mapName ||
            generatedMap.nameEn,
        nameEn:
            generatedMap.nameEn,
        coordinateSystem:
            'abstract-grid-100',
        defaultLevelId:
            generatedMap.currentLevelId ||
            generatedMap.levels[0].id,
        defaultRoomId:
            generatedMap.currentRoomId,
        currentRoomId:
            generatedMap.currentRoomId,
        layoutRule:
            'This generated interior is persistent local topology. Medium-tier scene directors may create it once but may not silently rewrite it later.',
        levels:
            generatedMap.levels
                .map((level, index) => ({
                    id: level.id,
                    name:
                        display
                            .levelNames
                            ?.[index] ||
                        level.nameEn,
                    nameEn:
                        level.nameEn,
                    z: Number(
                        level.z || 0,
                    ),
                })),
        nodes:
            generatedMap.rooms
                .map((room, index) => ({
                    id: room.id,
                    name:
                        display
                            .roomNames
                            ?.[index] ||
                        room.nameEn,
                    nameEn:
                        room.nameEn,
                    levelId:
                        room.levelId,
                    kind:
                        room.kind ||
                        'room',
                    x: room.x,
                    y: room.y,
                    access:
                        room.access ||
                        'ticketed',
                    description:
                        room.descriptionEn,
                    descriptionEn:
                        room.descriptionEn,
                    tags: [
                        'medium_generated_interior',
                    ],
                    aliases:
                        room.aliases || [],
                })),
        exits:
            generatedMap.exits
                .map(route => ({
                    from: route.from,
                    to: route.to,
                    direction:
                        route.direction ||
                        'passage',
                    kind:
                        route.kind ||
                        'passage',
                    minutes: Math.max(
                        0,
                        Number(
                            route.minutes ||
                            1,
                        ),
                    ),
                    conditions: [],
                })),
    };
    const next =
        structuredClone(worldState);
    next.map.customLocalMaps = [
        ...(next.map
            .customLocalMaps || [])
            .filter(map =>
                map.id !==
                    customMap.id),
        customMap,
    ];
    return enterInteriorMap(
        next,
        customMap,
        request,
    );
}

export function enterBoundInteriorMap(
    worldState,
    request =
    getInteriorMapRequest(
        worldState,
    ),
) {
    if (
        !request?.boundMapId
    ) {
        return worldState;
    }
    const customMap =
        getLocalMapDefinition(
            request.boundMapId,
            worldState.map,
        );
    return customMap
        ? enterInteriorMap(
            worldState,
            customMap,
            request,
        )
        : worldState;
}

export function admitCurrentLocationResidents(
    worldState,
    {
        mapId =
        worldState.map
            ?.activeMapId,
        roomId =
        worldState.map
            ?.currentLocalNodeId,
        activate = true,
    } = {},
) {
    const residents = Object.values(
        PRESET_LOCATION_ACTORS,
    ).filter(actor =>
        actor.homeMapId === mapId &&
        actor.homeRoomId === roomId);
    if (!residents.length) {
        return {
            state: worldState,
            admittedActorIds: [],
        };
    }

    const next = structuredClone(worldState);
    next.actorLibrary ??= [];
    next.actors ??= [];
    const admittedActorIds = [];
    let changed = false;
    residents.forEach(resident => {
        let profile = next.actorLibrary
            .find(actor =>
                actor.id === resident.id);
        if (!profile) {
            profile = normalizeActorMemoryProfile(
                structuredClone(resident),
            );
            next.actorLibrary.push(profile);
            changed = true;
        }
        if (
            profile.lifeStatus === 'dead' &&
            profile.lifeStatusPermanent
        ) {
            return;
        }
        if (
            !profile
                .firstImpressionOfPlayerEn &&
            !profile
                .firstImpressionPending
        ) {
            profile =
                normalizeActorMemoryProfile({
                    ...profile,
                    introducedClock:
                        profile.introducedClock ||
                        next.clock,
                    introducedTurn:
                        profile.introducedTurn ??
                        Number(
                            next.turn?.count ||
                            0,
                        ),
                    firstImpressionPending:
                        true,
                }, {
                    ...profile,
                    present: true,
                });
            const profileIndex =
                next.actorLibrary.findIndex(
                    actor =>
                        actor.id ===
                        profile.id,
                );
            next.actorLibrary[
                profileIndex
            ] = profile;
            changed = true;
        }

        const actorIndex = next.actors
            .findIndex(actor =>
                actor.id === resident.id);
        if (actorIndex < 0) {
            next.actors.push({
                id: profile.id,
                nameEn: profile.nameEn,
                name:
                    profile.name ||
                    profile.nameEn,
                roleEn: profile.roleEn,
                role:
                    profile.role ||
                    profile.roleEn,
                relationshipToPlayerEn:
                    profile
                        .relationshipToPlayerEn,
                relationshipToPlayer:
                    profile
                        .relationshipToPlayer ||
                    profile
                        .relationshipToPlayerEn,
                impressionOfPlayerEn:
                    profile.impressionOfPlayerEn,
                impressionOfPlayer:
                    profile.impressionOfPlayer ||
                    profile.impressionOfPlayerEn,
                impressionUpdatedClock: '',
                impressionUpdatedTurn: 0,
                firstImpressionOfPlayerEn:
                    profile
                        .firstImpressionOfPlayerEn,
                firstImpressionOfPlayer:
                    profile
                        .firstImpressionOfPlayer,
                firstImpressionClock:
                    profile
                        .firstImpressionClock,
                firstImpressionTurn:
                    profile
                        .firstImpressionTurn,
                firstImpressionPending:
                    profile
                        .firstImpressionPending,
                publicDescriptionEn:
                    profile.publicDescriptionEn,
                currentActivityEn:
                    resident.currentActivityEn,
                currentActivity:
                    resident.currentActivity ||
                    resident.currentActivityEn,
                currentIntentEn:
                    resident.currentIntentEn,
                currentIntent:
                    resident.currentIntent ||
                    resident.currentIntentEn,
                present:
                    Boolean(
                        activate,
                    ),
                lifeStatus: 'alive',
                lifeStatusPermanent: false,
                lifeStatusDetailEn: 'Alive.',
                lifeStatusDetail: '存活。',
                lifeStatusSinceClock: '',
                mapId,
                roomId,
                source:
                    'preset_location_resident',
            });
            admittedActorIds.push(
                resident.id,
            );
            changed = true;
            return;
        }

        const actor =
            next.actors[actorIndex];
        if (
            activate &&
            actor.present === false &&
            actor.lifeStatus !== 'dead' &&
            (actor.mapId || mapId) === mapId &&
            (actor.roomId || roomId) === roomId
        ) {
            next.actors[actorIndex] = {
                ...actor,
                present: true,
                currentActivityEn:
                    resident.currentActivityEn,
                currentActivity:
                    resident.currentActivity ||
                    resident.currentActivityEn,
                currentIntentEn:
                    resident.currentIntentEn,
                currentIntent:
                    resident.currentIntent ||
                    resident.currentIntentEn,
                firstImpressionOfPlayerEn:
                    profile
                        .firstImpressionOfPlayerEn,
                firstImpressionOfPlayer:
                    profile
                        .firstImpressionOfPlayer,
                firstImpressionClock:
                    profile
                        .firstImpressionClock,
                firstImpressionTurn:
                    profile
                        .firstImpressionTurn,
                firstImpressionPending:
                    profile
                        .firstImpressionPending,
            };
            admittedActorIds.push(
                resident.id,
            );
            changed = true;
        }
    });

    return {
        state: changed ? next : worldState,
        admittedActorIds,
    };
}

export function admitMentionedKnownActors(
    worldState,
    playerAction,
) {
    const action = String(
        playerAction || '',
    ).normalize('NFKC');
    if (!action.trim()) {
        return {
            state: worldState,
            admittedActors: [],
        };
    }
    const mapId =
        worldState.map?.activeMapId;
    const roomId =
        worldState.map
            ?.currentLocalNodeId;
    if (!mapId || !roomId) {
        return {
            state: worldState,
            admittedActors: [],
        };
    }
    const profiles = new Map(
        (
            worldState.actorLibrary ||
            []
        ).map(profile => [
            profile.id,
            profile,
        ]),
    );
    const containsAlias = alias => {
        const target = String(
            alias || '',
        ).trim().normalize('NFKC');
        if (target.length < 2) {
            return false;
        }
        if (/[\p{Script=Han}]/u.test(target)) {
            return action.includes(target);
        }
        const escaped =
            target.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );
        return new RegExp(
            `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
            'iu',
        ).test(action);
    };
    const candidates = (
        worldState.actors || []
    )
        .filter(actor =>
            actor.present === false &&
            actor.lifeStatus !== 'dead' &&
            actor.lifeStatus !== 'missing' &&
            actor.mapId === mapId &&
            actor.roomId)
        .map(actor => {
            const profile =
                profiles.get(actor.id) ||
                {};
            const matchedAliases =
                buildActorNameAliases(
                    actor.nameEn ||
                        profile.nameEn,
                    actor.name ||
                        profile.name,
                    [
                        ...(actor.aliases ||
                            []),
                        ...(profile.aliases ||
                            []),
                    ],
                ).filter(
                    containsAlias,
                );
            const path =
                findLocalRoomPath(
                    mapId,
                    actor.roomId,
                    roomId,
                    worldState.map,
                );
            return {
                actor,
                matchedAlias:
                    matchedAliases.sort(
                        (left, right) =>
                            right.length -
                            left.length,
                    )[0] || '',
                path,
            };
        })
        .filter(candidate =>
            candidate.matchedAlias &&
            candidate.path &&
            candidate.path.minutes <= 5 &&
            candidate.path.roomIds.length <=
                4)
        .sort((left, right) =>
            right.matchedAlias.length -
                left.matchedAlias.length ||
            left.path.minutes -
                right.path.minutes)
        .slice(0, 2);
    if (!candidates.length) {
        return {
            state: worldState,
            admittedActors: [],
        };
    }
    const next =
        structuredClone(worldState);
    const candidateById = new Map(
        candidates.map(candidate => [
            candidate.actor.id,
            candidate,
        ]),
    );
    next.actors = (
        next.actors || []
    ).map(actor => {
        const candidate =
            candidateById.get(actor.id);
        if (!candidate) {
            return actor;
        }
        return {
            ...actor,
            present: true,
            mapId,
            roomId,
            currentActivityEn:
                'Turning toward the player after being explicitly acknowledged in the current scene.',
            currentActivity:
                '在当前场景中被玩家明确点名后，转身回应玩家。',
        };
    });
    return {
        state: next,
        admittedActors:
            candidates.map(
                candidate => ({
                    id:
                        candidate.actor.id,
                    nameEn:
                        candidate.actor
                            .nameEn ||
                        profiles.get(
                            candidate.actor.id,
                        )?.nameEn ||
                        candidate.actor.id,
                    name:
                        candidate.actor
                            .name ||
                        profiles.get(
                            candidate.actor.id,
                        )?.name ||
                        candidate.actor
                            .nameEn ||
                        candidate.actor.id,
                    matchedAlias:
                        candidate
                            .matchedAlias,
                    previousRoomId:
                        candidate.actor
                            .roomId,
                    mapId,
                    roomId,
                    pathMinutes:
                        candidate.path
                            .minutes,
                    requireReaction:
                        true,
                    requireEverydayMemory:
                        true,
                }),
            ),
    };
}

function getMapRooms(map, mapState = {}) {
    if (!map) return [];
    return [
        ...(map.nodes || []),
        ...(mapState.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ];
}

function getMapExits(map, mapState = {}) {
    if (!map) return [];
    return [
        ...(map.exits || []),
        ...(mapState.generatedLocalExits || [])
            .filter(route => route.mapId === map.id),
    ];
}

function normalizeSpatialText(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsSpatialPhrase(
    text,
    phrase,
) {
    if (!text || !phrase) return false;
    return /[\u3400-\u9FFF]/u.test(
        phrase,
    )
        ? text.includes(phrase)
        : ` ${text} `.includes(
            ` ${phrase} `,
        );
}

export function inferActorRoomId(actor, map, fallbackRoomId = '') {
    const rooms = getMapRooms(map);
    const activity = normalizeSpatialText(
        actor?.currentActivityEn || actor?.currentActivity || '',
    );
    const primaryActivity = activity
        .split(/[,;]|\b(?:while|watching|looking|calling)\b/i)[0];
    let best = null;
    rooms.forEach(room => {
        let score = 0;
        for (const label of [
            room.id,
            room.name,
            room.nameEn,
            ...(room.aliases || []),
        ]) {
            const normalized = normalizeSpatialText(label);
            if (
                normalized.length >= 3 &&
                containsSpatialPhrase(
                    activity,
                    normalized,
                )
            ) {
                score += 1000 +
                    normalized.length;
            }
            if (
                normalized.length >= 3 &&
                containsSpatialPhrase(
                    primaryActivity,
                    normalized,
                )
            ) {
                score += 3000 +
                    normalized.length;
            }
            normalized.split(/[^\p{L}\p{N}]+/u)
                .filter(word =>
                    word.length >= 4 &&
                    !SPATIAL_INFERENCE_STOPWORDS.has(word))
                .forEach(word => {
                    if (containsSpatialPhrase(
                        activity,
                        word,
                    )) {
                        score += word.length;
                    }
                    if (containsSpatialPhrase(
                        primaryActivity,
                        word,
                    )) {
                        score += word.length * 200;
                    }
                });
        }
        if (!best || score > best.score) {
            best = { roomId: room.id, score };
        }
    });
    if (best?.score > 0) {
        return best.roomId;
    }
    return rooms.some(room => room.id === fallbackRoomId)
        ? fallbackRoomId
        : rooms[0]?.id || '';
}

export function sanitizeScenePerformanceActorMetadata(
    payload,
    worldState,
) {
    const sanitized =
        structuredClone(payload);
    if (!Array.isArray(
        sanitized?.actorUpdates,
    )) {
        return sanitized;
    }
    const temporaryActorIds = new Set(
        (
            sanitized
                .temporaryActorEntrances ||
            []
        ).map(actor => actor.id),
    );
    const initialSpatialActors = new Map(
        buildSpatialContext(worldState)
            .actors.map(actor => [
                actor.id,
                actor,
            ]),
    );
    const actors = new Map(
        (worldState.actors || []).map(
            actor => [
                actor.id,
                actor,
            ],
        ),
    );
    const profiles = new Map(
        (
            worldState.actorLibrary ||
            []
        ).map(profile => [
            profile.id,
            profile,
        ]),
    );
    sanitized.actorUpdates =
        sanitized.actorUpdates.map(
            source => {
                const update = {
                    ...source,
                };
                const actor =
                    actors.get(update.id) ||
                    {};
                const profile =
                    normalizeActorMemoryProfile(
                        profiles.get(
                            update.id,
                        ) || {},
                        actor,
                    );
                let spatial =
                    initialSpatialActors.get(
                        update.id,
                    );
                if (
                    (
                        !spatial
                            ?.canSeePlayer ||
                        !spatial
                            ?.canHearPlayer
                    ) &&
                    (
                        update.mapId ||
                        update.roomId
                    ) &&
                    actors.has(update.id)
                ) {
                    const projectedState = {
                        ...worldState,
                        actors: (
                            worldState.actors ||
                            []
                        ).map(item =>
                            item.id ===
                                update.id
                                ? {
                                    ...item,
                                    mapId:
                                        update.mapId ||
                                        item.mapId,
                                    roomId:
                                        update.roomId ||
                                        item.roomId,
                                }
                                : item),
                    };
                    spatial =
                        buildSpatialContext(
                            projectedState,
                        ).actors.find(item =>
                            item.id ===
                            update.id);
                }
                if (
                    update
                        .firstImpressionOfPlayerEn !=
                    null
                ) {
                    const invalidFirst =
                        temporaryActorIds.has(
                            update.id,
                        ) ||
                        !spatial
                            ?.canSeePlayer ||
                        Boolean(
                            profile
                                .firstImpressionOfPlayerEn,
                        ) ||
                        !isValidFirstImpression(
                            update
                                .firstImpressionOfPlayerEn,
                        );
                    if (invalidFirst) {
                        delete update
                            .firstImpressionOfPlayerEn;
                        delete update
                            .firstImpressionOfPlayer;
                    }
                }
                if (
                    update
                        .impressionOfPlayerEn !=
                    null
                ) {
                    const proposed =
                        String(
                            update
                                .impressionOfPlayerEn ||
                            '',
                        ).trim();
                    const previous =
                        String(
                            profile
                                .impressionOfPlayerEn ||
                            '',
                        ).trim();
                    const turnsSinceUpdate =
                        Math.max(
                            0,
                            Number(
                                worldState.turn
                                    ?.count ||
                                0,
                            ) -
                            Number(
                                profile
                                    .impressionUpdatedTurn ||
                                0,
                            ),
                        );
                    const changesRecent =
                        Boolean(previous) &&
                        memoryFingerprint(
                            previous,
                        ) !==
                            memoryFingerprint(
                                proposed,
                            ) &&
                        turnsSinceUpdate <
                            IMPRESSION_UPDATE_COOLDOWN_TURNS;
                    const invalidImpression =
                        temporaryActorIds.has(
                            update.id,
                        ) ||
                        (
                            !spatial
                                ?.canSeePlayer &&
                            !spatial
                                ?.canHearPlayer
                        ) ||
                        !isValidImpressionShorthand(
                            proposed,
                        ) ||
                        changesRecent;
                    if (invalidImpression) {
                        delete update
                            .impressionOfPlayerEn;
                        delete update
                            .impressionOfPlayer;
                    }
                }
                if (update.memoryUpdate != null) {
                    const memory =
                        update.memoryUpdate;
                    const summary =
                        String(
                            memory
                                ?.summaryEn ||
                            '',
                        ).trim();
                    const significance =
                        String(
                            memory
                                ?.significance ||
                            '',
                        );
                    const lastingImpactEn =
                        String(
                            memory
                                ?.lastingImpactEn ||
                            '',
                        ).trim();
                    const unauthorizedKeys =
                        memory &&
                        typeof memory ===
                            'object' &&
                        !Array.isArray(memory)
                            ? Object.keys(
                                memory,
                            ).filter(key =>
                                ![
                                    'summaryEn',
                                    'significance',
                                    'lastingImpactEn',
                                ].includes(key))
                            : [];
                    const lacksWitness =
                        !temporaryActorIds
                            .has(update.id) &&
                        !spatial
                            ?.canSeePlayer &&
                        !spatial
                            ?.canHearPlayer;
                    const invalidMemory =
                        !memory ||
                        typeof memory !==
                            'object' ||
                        Array.isArray(memory) ||
                        lacksWitness ||
                        !summary ||
                        countTextWords(
                            summary,
                        ) > 40 ||
                        ![
                            'everyday',
                            'notable',
                        ].includes(
                            significance,
                        ) ||
                        (
                            significance ===
                                'notable' &&
                            (
                                !lastingImpactEn ||
                                countTextWords(
                                    lastingImpactEn,
                                ) > 24
                            )
                        ) ||
                        unauthorizedKeys
                            .length > 0;
                    if (invalidMemory) {
                        delete update.memoryUpdate;
                    }
                }
                return update;
            },
        );
    return sanitized;
}

export function ensureMentionedKnownActorMemories(
    payload,
    worldState,
    admittedActors = [],
) {
    const normalized =
        structuredClone(payload);
    if (!admittedActors.length) {
        return normalized;
    }
    normalized.actorUpdates =
        Array.isArray(
            normalized.actorUpdates,
        )
            ? normalized.actorUpdates
            : [];
    normalized.actorPresence ??= {
        presentActorIdsAfterTurn: [],
    };
    normalized.actorPresence
        .presentActorIdsAfterTurn =
        Array.isArray(
            normalized.actorPresence
                .presentActorIdsAfterTurn,
        )
            ? normalized.actorPresence
                .presentActorIdsAfterTurn
            : [];
    const runtimeActors = new Map(
        (
            worldState.actors || []
        ).map(actor => [
            actor.id,
            actor,
        ]),
    );
    admittedActors.forEach(
        admitted => {
            let update =
                normalized.actorUpdates
                    .find(item =>
                        item.id ===
                        admitted.id);
            if (!update) {
                const actor =
                    runtimeActors.get(
                        admitted.id,
                    ) || {};
                update = {
                    id: admitted.id,
                    present: true,
                    currentActivityEn:
                        actor
                            .currentActivityEn ||
                        'Responding to the player in the current scene.',
                    mapId:
                        actor.mapId ||
                        admitted.mapId,
                    roomId:
                        actor.roomId ||
                        admitted.roomId,
                };
                normalized.actorUpdates
                    .push(update);
            }
            if (
                admitted
                    .requireEverydayMemory &&
                !update.memoryUpdate
                    ?.summaryEn
            ) {
                const publicWords =
                    String(
                        normalized
                            .publicEventEn ||
                        '',
                    )
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);
                const publicSummary =
                    publicWords
                        .slice(0, 40)
                        .join(' ');
                update.memoryUpdate = {
                    summaryEn:
                        publicSummary ||
                        `The player directly acknowledged ${admitted.nameEn} during the current scene.`,
                    significance:
                        'everyday',
                };
            }
            if (
                update.present !==
                    false &&
                !normalized
                    .actorPresence
                    .presentActorIdsAfterTurn
                    .includes(
                        admitted.id,
                    )
            ) {
                normalized
                    .actorPresence
                    .presentActorIdsAfterTurn
                    .push(
                        admitted.id,
                    );
            }
        },
    );
    return normalized;
}

export function normalizeScenePerformanceActorLocations(
    payload,
    worldState,
) {
    const normalized = structuredClone(payload);
    const actorUpdates =
        Array.isArray(
            normalized?.actorUpdates,
        )
            ? normalized.actorUpdates
            : [];
    if (Array.isArray(normalized?.actorUpdates)) {
        normalized.actorUpdates =
            normalized.actorUpdates.map(update => {
                const actor = (
                    worldState.actors || []
                ).find(item =>
                    item.id === update.id);
                const profile =
                normalizeActorMemoryProfile(
                    (
                        worldState
                            .actorLibrary ||
                        []
                    ).find(item =>
                        item.id ===
                            update.id) ||
                    {},
                    actor || {},
                );
                if (
                    update
                        .firstImpressionOfPlayerEn &&
                profile
                    .firstImpressionOfPlayerEn
                ) {
                    delete update
                        .firstImpressionOfPlayerEn;
                    delete update
                        .firstImpressionOfPlayer;
                }
                if (
                    update
                        .impressionOfPlayerEn !=
                    null
                ) {
                    const proposed =
                    String(
                        update
                            .impressionOfPlayerEn ||
                        '',
                    ).trim();
                    const previous =
                    String(
                        profile
                            .impressionOfPlayerEn ||
                        '',
                    ).trim();
                    const turnsSinceUpdate =
                    Math.max(
                        0,
                        Number(
                            worldState.turn
                                ?.count ||
                            0,
                        ) -
                        Number(
                            profile
                                .impressionUpdatedTurn ||
                            0,
                        ),
                    );
                    if (
                        previous &&
                    memoryFingerprint(
                        previous,
                    ) !==
                        memoryFingerprint(
                            proposed,
                        ) &&
                    turnsSinceUpdate <
                        IMPRESSION_UPDATE_COOLDOWN_TURNS
                    ) {
                        delete update
                            .impressionOfPlayerEn;
                        delete update
                            .impressionOfPlayer;
                    }
                }
                if (
                    update.memoryUpdate &&
                ![
                    'everyday',
                    'notable',
                ].includes(
                    update.memoryUpdate
                        .significance,
                )
                ) {
                    const significance = String(
                        update.memoryUpdate
                            .significance || '',
                    ).toLocaleLowerCase();
                    if (
                        /^(?:important|major|notable|recent|significant)$/
                            .test(significance)
                    ) {
                        update.memoryUpdate.significance =
                        'notable';
                    } else if (
                        /^(?:daily|everyday|minor|routine|small)$/
                            .test(significance)
                    ) {
                        update.memoryUpdate.significance =
                        'everyday';
                    }
                }
                const mapId = update.mapId || actor?.mapId ||
                worldState.map?.activeMapId;
                const actorRoomId = actor?.roomId ||
                worldState.map?.currentLocalNodeId;
                const fallbackRoomId =
                update.roomId || actorRoomId;
                const inferredRoomId = inferActorRoomId(
                    update,
                    getLocalMapDefinition(mapId, worldState.map),
                    fallbackRoomId,
                );
                if (!inferredRoomId ||
                inferredRoomId === update.roomId ||
                !findLocalRoomPath(
                    mapId,
                    actorRoomId,
                    inferredRoomId,
                    worldState.map,
                )) {
                    return update;
                }
                return {
                    ...update,
                    mapId,
                    roomId: inferredRoomId,
                };
            });
    }
    if (
        normalized.actorPresence ==
            null
    ) {
        const initiallyPresent =
            new Set(
                (worldState.actors || [])
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id),
            );
        const temporaryIds =
            new Set(
                (
                    normalized
                        .temporaryActorEntrances ||
                    []
                ).map(actor =>
                    actor.id),
            );
        actorUpdates.forEach(update => {
            if (
                update.present ===
                false
            ) {
                initiallyPresent.delete(
                    update.id,
                );
            } else if (
                update.present ===
                    true &&
                temporaryIds.has(
                    update.id,
                )
            ) {
                initiallyPresent.add(
                    update.id,
                );
            }
        });
        normalized.actorPresence = {
            presentActorIdsAfterTurn:
                [...initiallyPresent],
        };
    }
    return sanitizeScenePerformanceActorMetadata(
        normalized,
        worldState,
    );
}

function isRoutePassable(
    mapId,
    route,
    mapState = {},
    options = {},
) {
    const runtime = mapState.exitStates?.[
        `${mapId}:${route.from}->${route.to}`
    ];
    const allowedConditions = new Set(
        options.allowedConditions || [],
    );
    return runtime?.blocked !== true &&
        (route.conditions || []).every(
            condition =>
                allowedConditions.has(
                    condition,
                ),
        );
}

export function findLocalRoomPath(
    mapId,
    fromRoomId,
    toRoomId,
    mapState = {},
    options = {},
) {
    const map = getLocalMapDefinition(mapId, mapState);
    const rooms = getMapRooms(map, mapState);
    const roomIds = new Set(rooms.map(room => room.id));
    if (!roomIds.has(fromRoomId) || !roomIds.has(toRoomId)) {
        return null;
    }
    if (fromRoomId === toRoomId) {
        return { roomIds: [fromRoomId], routes: [], minutes: 0 };
    }
    const adjacency = new Map();
    const addRoute = route => {
        if (
            !adjacency.has(
                route.from,
            )
        ) {
            adjacency.set(
                route.from,
                [],
            );
        }
        adjacency.get(route.from)
            .push(route);
    };
    getMapExits(map, mapState)
        .forEach(route => {
            if (
                isRoutePassable(
                    mapId,
                    route,
                    mapState,
                    options,
                )
            ) {
                addRoute(route);
            }
            if (route.oneWay === true) {
                return;
            }
            const reverseRoute = {
                ...route,
                from: route.to,
                to: route.from,
                conditions:
                    route
                        .reverseConditions ??
                    route.conditions,
                reversed: true,
            };
            if (
                isRoutePassable(
                    mapId,
                    reverseRoute,
                    mapState,
                    options,
                )
            ) {
                addRoute(
                    reverseRoute,
                );
            }
        });
    const queue = [{
        roomId: fromRoomId,
        roomIds: [fromRoomId],
        routes: [],
        minutes: 0,
    }];
    const visited = new Set([fromRoomId]);
    while (queue.length) {
        const current = queue.shift();
        for (const route of adjacency.get(current.roomId) || []) {
            if (visited.has(route.to)) continue;
            const next = {
                roomId: route.to,
                roomIds: [...current.roomIds, route.to],
                routes: [...current.routes, route],
                minutes: current.minutes + Math.max(0, Number(route.minutes || 1)),
            };
            if (route.to === toRoomId) {
                return {
                    roomIds: next.roomIds,
                    routes: next.routes,
                    minutes: next.minutes,
                };
            }
            visited.add(route.to);
            queue.push(next);
        }
    }
    return null;
}

function getExplicitMovementCompanionIds(
    worldState,
    action,
    allowedRoomIds = null,
) {
    const movementText = String(action || '')
        .split(/[\n。！？!?]+/)
        .filter(clause =>
            MOVEMENT_ACTION_PATTERN.test(clause) ||
            GUIDED_MOVEMENT_ACTION_PATTERN
                .test(clause) ||
            Boolean(
                findSceneDestination(
                    clause,
                    worldState,
                ),
            ))
        .join(' ');
    if (!movementText) return [];
    const normalizedMovement =
        normalizeSpatialText(movementText);
    const currentMapId = String(
        worldState.map?.activeMapId || '',
    );
    const currentRoomId = String(
        worldState.map?.currentLocalNodeId || '',
    );
    const allowedRooms = new Set(
        Array.isArray(allowedRoomIds) &&
            allowedRoomIds.length
            ? allowedRoomIds
            : [currentRoomId],
    );
    const profiles = new Map(
        (worldState.actorLibrary || []).map(
            profile => [profile.id, profile],
        ),
    );
    return (worldState.actors || [])
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || currentMapId) ===
                currentMapId &&
            allowedRooms.has(
                actor.roomId || currentRoomId,
            ))
        .filter(actor => {
            const profile =
                profiles.get(actor.id) || {};
            const relationship = [
                actor.relationshipToPlayerEn,
                actor.relationshipToPlayer,
                profile.relationshipToPlayerEn,
                profile.relationshipToPlayer,
            ].filter(Boolean).join(' ');
            const familyAliases =
                /(?:father|dad|父亲|爸爸)/i
                    .test(relationship)
                    ? ['爸爸', '我爸', '父亲', 'dad', 'father']
                    : /(?:mother|mum|mom|母亲|妈妈)/i
                        .test(relationship)
                        ? ['妈妈', '我妈', '母亲', 'mum', 'mom', 'mother']
                        : [];
            return [
                actor.id,
                actor.name,
                actor.nameEn,
                profile.name,
                profile.nameEn,
                ...(actor.aliases || []),
                ...(profile.aliases || []),
                ...familyAliases,
            ]
                .map(normalizeSpatialText)
                .filter(alias => alias.length >= 2)
                .some(alias =>
                    normalizedMovement.includes(alias));
        })
        .map(actor => actor.id);
}

export function isGuidedMovementAction(
    playerAction,
) {
    const action = String(playerAction || '');
    return GUIDED_MOVEMENT_ACTION_PATTERN
        .test(action);
}

export function parseExplicitMovementDirective(
    playerAction,
) {
    const action = String(playerAction || '');
    const match = action.match(
        EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN,
    );
    const destinationText = String(
        match?.[1] || match?.[2] || '',
    ).trim();
    if (
        !match ||
        !destinationText
    ) {
        return null;
    }
    return {
        raw: match[0],
        marker:
            match[0].trim()
                .startsWith('->')
                ? '->'
                : '→',
        destinationText,
        start: match.index,
        end:
            Number(match.index || 0) +
            match[0].length,
    };
}

export function removeExplicitMovementDirective(
    playerAction,
) {
    const action = String(playerAction || '');
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    if (!directive) return action;
    return (
        action.slice(
            0,
            directive.start,
        ) +
        action.slice(
            directive.end,
        )
    )
        .replace(
            /^[ \t]*\n/,
            '',
        )
        .replace(
            /\n{3,}/g,
            '\n\n',
        )
        .trim();
}

export function inspectPlayerMovementIntent(
    worldState,
    playerAction,
) {
    const action = String(playerAction || '');
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    const destination =
        findSceneDestination(
            directive?.destinationText ||
                action,
            worldState,
        );
    const guided =
        isGuidedMovementAction(action);
    const candidate = Boolean(
        directive ||
        destination ||
        guided ||
        MOVEMENT_ACTION_PATTERN.test(
            action,
        ),
    );
    return {
        explicit: Boolean(directive),
        directive,
        destination,
        guided,
        candidate,
        confirmationRequired:
            candidate &&
            !directive,
    };
}

export function applyPlayerMovement(
    worldState,
    playerAction,
    options = {},
) {
    const action = String(playerAction || '');
    const intent =
        inspectPlayerMovementIntent(
            worldState,
            action,
        );
    const confirmedDestination =
        options.confirmedDestination
            ? structuredClone(
                options
                    .confirmedDestination,
            )
            : null;
    const confirmed =
        intent.explicit ||
        options.confirmed === true ||
        Boolean(
            confirmedDestination,
        );
    if (!confirmed) {
        return {
            state: worldState,
            movement: null,
        };
    }
    const requestedDestination =
        confirmedDestination ||
        intent.destination;
    const guided = intent.guided;
    const rawDestination =
        requestedDestination ||
        (
            guided &&
            options.guidedDestination
                ? structuredClone(
                    options.guidedDestination,
                )
                : null
        );
    const destinationMap =
        rawDestination
            ? getLocalMapDefinition(
                rawDestination.mapId,
                worldState.map,
            )
            : null;
    const destinationRoom =
        rawDestination
            ? getMapRooms(
                destinationMap,
                worldState.map,
            ).find(room =>
                room.id ===
                    rawDestination.roomId)
            : null;
    const catalogDestination =
        rawDestination
            ? findSceneDestination(
                rawDestination.roomId,
                worldState,
            )
            : null;
    const catalogRoomNameEn =
        catalogDestination &&
        catalogDestination.mapId ===
            rawDestination?.mapId
            ? catalogDestination
                .roomNameEn
            : '';
    const suppliedRoomNameEn =
        String(
            rawDestination
                ?.roomNameEn || '',
        );
    const destination =
        rawDestination
            ? {
                ...rawDestination,
                roomName:
                    rawDestination.roomName ||
                    destinationRoom?.name ||
                    destinationRoom?.nameEn,
                roomNameEn:
                    destinationRoom?.nameEn ||
                    (
                        /[a-z]/i.test(
                            suppliedRoomNameEn,
                        )
                            ? suppliedRoomNameEn
                            : catalogRoomNameEn
                    ) ||
                    formatSceneLocationId(
                        destinationRoom?.id,
                    ) ||
                    rawDestination.roomName,
                levelId:
                    rawDestination.levelId ||
                    destinationRoom?.levelId,
            }
            : null;
    const guidance = guided
        ? {
            guided: true,
            guidedByActorId:
                options.guidedByActorId || '',
            destinationSource:
                intent.explicit &&
                    requestedDestination
                    ? 'player_marker'
                    : confirmedDestination
                        ? 'stored_confirmation'
                        : destination
                            ? 'guide_context'
                            : 'unresolved',
        }
        : {};
    const confirmation = {
        confirmed: true,
        confirmationSource:
            intent.explicit
                ? 'player_marker'
                : confirmedDestination
                    ? 'stored_movement'
                    : 'internal',
    };
    if (!destination) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                ...confirmation,
                ...guidance,
                reason: guided
                    ? 'guide_destination_unknown'
                    : 'no_known_destination',
            },
        };
    }
    const mapId = String(worldState.map?.activeMapId || '');
    const fromRoomId = String(worldState.map?.currentLocalNodeId || '');
    let companionIds =
        getExplicitMovementCompanionIds(
            worldState,
            action,
        );
    const sourceMap = getLocalMapDefinition(
        mapId,
        worldState.map,
    );
    const sourceRoom = getMapRooms(
        sourceMap,
        worldState.map,
    ).find(room => room.id === fromRoomId);
    const destinationNameEn =
        destination.roomNameEn ||
        destination.roomName ||
        destination.roomId;
    if (destination.mapId !== mapId) {
        const bindings =
            worldState.map
                ?.interiorMapBindings ||
            {};
        const exitsBoundInterior =
            Boolean(
                sourceMap
                    ?.sourceContainerKey,
            ) &&
            sourceMap.parentMapId ===
                destination.mapId &&
            bindings[
                sourceMap
                    .sourceContainerKey
            ] === mapId;
        const entersBoundInterior =
            Boolean(
                destinationMap
                    ?.sourceContainerKey,
            ) &&
            destinationMap.parentMapId ===
                mapId &&
            bindings[
                destinationMap
                    .sourceContainerKey
            ] === destination.mapId;
        const bridgeMapId =
            exitsBoundInterior
                ? destination.mapId
                : entersBoundInterior
                    ? mapId
                    : '';
        const bridgeFromRoomId =
            exitsBoundInterior
                ? sourceMap.parentRoomId
                : fromRoomId;
        const bridgeToRoomId =
            exitsBoundInterior
                ? destination.roomId
                : destinationMap
                    ?.parentRoomId;
        const bridgePath =
            bridgeMapId &&
            bridgeFromRoomId &&
            bridgeToRoomId
                ? bridgeFromRoomId ===
                    bridgeToRoomId
                    ? {
                        roomIds: [
                            bridgeFromRoomId,
                        ],
                        routes: [],
                        minutes: 0,
                    }
                    : findLocalRoomPath(
                        bridgeMapId,
                        bridgeFromRoomId,
                        bridgeToRoomId,
                        worldState.map,
                        {
                            allowedConditions: [
                                'wizard_intent',
                            ],
                        },
                    )
                : null;
        if (
            (
                exitsBoundInterior ||
                entersBoundInterior
            ) &&
            bridgePath
        ) {
            const next =
                structuredClone(
                    worldState,
                );
            const routeRoomIds = [
                ...(exitsBoundInterior
                    ? [fromRoomId]
                    : []),
                ...bridgePath.roomIds,
                ...(entersBoundInterior
                    ? [
                        destination
                            .roomId,
                    ]
                    : []),
            ].filter((roomId, index, rooms) =>
                roomId &&
                roomId !==
                    rooms[index - 1]);
            next.map.activeMapId =
                destination.mapId;
            next.map.currentLocalNodeId =
                destination.roomId;
            next.map.currentLevelId =
                destination.levelId ||
                destinationMap
                    ?.defaultLevelId;
            next.map.discoveredLocalNodeIds =
                [...new Set([
                    ...(
                        next.map
                            .discoveredLocalNodeIds ||
                        []
                    ),
                    `${destination.mapId}:${destination.roomId}`,
                ])];
            next.location =
                destination.roomName ||
                destination.roomNameEn ||
                next.location;
            if (next.scene) {
                next.scene.mapId =
                    destination.mapId;
                next.scene.roomId =
                    destination.roomId;
            }
            next.items =
                (next.items || [])
                    .map((item, index) => {
                        const normalized =
                            normalizeInventoryItem(
                                item,
                                index,
                                {
                                    mapId:
                                        destination
                                            .mapId,
                                    roomId:
                                        destination
                                            .roomId,
                                    clock:
                                        next.clock,
                                },
                            );
                        return normalized
                            .ownerId ===
                                'player' &&
                            [
                                'carried',
                                'equipped',
                            ].includes(
                                normalized
                                    .custody,
                            )
                            ? {
                                ...normalized,
                                mapId:
                                    destination
                                        .mapId,
                                roomId:
                                    destination
                                        .roomId,
                            }
                            : normalized;
                    });
            if (next.scene) {
                next.scene.itemStates =
                    createSceneItemStates(
                        next.items,
                        {
                            mapId:
                                destination
                                    .mapId,
                            roomId:
                                destination
                                    .roomId,
                        },
                    );
            }
            if (companionIds.length) {
                const companions =
                    new Set(
                        companionIds,
                    );
                next.actors =
                    (next.actors || [])
                        .map(actor =>
                            companions
                                .has(
                                    actor.id,
                                ) &&
                            (
                                actor.mapId ||
                                mapId
                            ) === mapId &&
                            (
                                actor.roomId ||
                                fromRoomId
                            ) === fromRoomId
                                ? {
                                    ...actor,
                                    mapId:
                                        destination
                                            .mapId,
                                    roomId:
                                        destination
                                            .roomId,
                                }
                                : actor);
            }
            const movement = {
                attempted: true,
                moved: true,
                fromMapId: mapId,
                fromRoomId,
                toMapId:
                    destination.mapId,
                toRoomId:
                    destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn:
                    destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                path: routeRoomIds,
                minutes: Math.max(
                    1,
                    Number(
                        bridgePath.minutes ||
                        0,
                    ),
                ),
                bridge:
                    exitsBoundInterior
                        ? 'interior_to_parent'
                        : 'parent_to_interior',
                committedAt:
                    new Date()
                        .toISOString(),
            };
            next.spatial = {
                ...(next.spatial || {}),
                version:
                    SPATIAL_STATE_VERSION,
                player: {
                    mapId:
                        destination.mapId,
                    roomId:
                        destination.roomId,
                },
                lastMovement:
                    movement,
            };
            return {
                state: next,
                movement,
            };
        }
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                requiresSceneTransition: true,
                fromMapId: mapId,
                fromRoomId,
                toMapId: destination.mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                reason: 'different_local_map',
            },
        };
    }
    const allowedConditions = [
        'wizard_intent',
    ];
    const hasSchoolTravelAuthority =
        (worldState.items || []).some(item =>
            item.ownerId === 'player' &&
            ['carried', 'equipped']
                .includes(item.custody) &&
            (
                item.id ===
                    'acceptance_letter' ||
                /(?:acceptance|school letter|train ticket|录取通知|车票)/i
                    .test(
                        `${item.labelEn || ''} ${item.label || ''}`,
                    )
            ));
    if (
        [
            fromRoomId,
            destination.roomId,
        ].includes(
            'hogwarts_express',
        ) &&
        (
            hasSchoolTravelAuthority ||
            /(?:霍格沃茨特快|霍格沃茨列车|开学列车|hogwarts express|train to hogwarts)/i
                .test(action)
        )
    ) {
        allowedConditions.push(
            'valid_school_travel',
        );
    }
    const path = findLocalRoomPath(
        mapId,
        fromRoomId,
        destination.roomId,
        worldState.map,
        { allowedConditions },
    );
    if (!path) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                fromMapId: mapId,
                fromRoomId,
                toMapId: destination.mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                reason: 'no_passable_route',
            },
        };
    }
    companionIds = getExplicitMovementCompanionIds(
        worldState,
        action,
        path.roomIds,
    );
    if (options.guidedByActorId) {
        const guide = (worldState.actors || [])
            .find(actor =>
                actor.id ===
                    options.guidedByActorId);
        if (
            guide &&
            (guide.mapId || mapId) === mapId &&
            path.roomIds.includes(
                guide.roomId || fromRoomId,
            )
        ) {
            companionIds = [...new Set([
                ...companionIds,
                guide.id,
            ])];
        }
    }
    if (fromRoomId === destination.roomId) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                fromMapId: mapId,
                fromRoomId,
                toMapId: mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.name ||
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomName ||
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                path: path.roomIds,
                minutes: 0,
                reason: 'already_there',
            },
        };
    }
    const next = structuredClone(worldState);
    next.map.currentLocalNodeId = destination.roomId;
    next.map.currentLevelId = destination.levelId ||
        getLocalMapDefinition(mapId, next.map)?.defaultLevelId;
    next.map.discoveredLocalNodeIds = [...new Set([
        ...(next.map.discoveredLocalNodeIds || []),
        `${mapId}:${destination.roomId}`,
    ])];
    next.location = destination.roomName || destination.roomNameEn ||
        next.location;
    if (next.scene) {
        next.scene.roomId = destination.roomId;
    }
    next.items = (next.items || [])
        .map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId,
                        roomId:
                            destination.roomId,
                        clock: next.clock,
                    },
                );
            return normalized.ownerId ===
                'player' &&
                ['carried', 'equipped']
                    .includes(
                        normalized.custody,
                    )
                ? {
                    ...normalized,
                    mapId,
                    roomId:
                        destination.roomId,
                }
                : normalized;
        });
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId,
                    roomId:
                        destination.roomId,
                },
            );
    }
    if (companionIds.length) {
        const companions = new Set(companionIds);
        const routeRooms = new Set(path.roomIds);
        next.actors = (next.actors || []).map(actor =>
            companions.has(actor.id) &&
            (actor.mapId || mapId) === mapId &&
            routeRooms.has(actor.roomId || fromRoomId)
                ? {
                    ...actor,
                    mapId,
                    roomId: destination.roomId,
                }
                : actor);
    }
    const movement = {
        attempted: true,
        moved: true,
        fromMapId: mapId,
        fromRoomId,
        toMapId: mapId,
        toRoomId: destination.roomId,
        fromRoomName:
            sourceRoom?.name ||
            sourceRoom?.nameEn ||
            fromRoomId,
        toRoomName:
            destination.roomName ||
            destination.roomNameEn ||
            destination.roomId,
        toRoomNameEn: destinationNameEn,
        companionIds,
        ...confirmation,
        ...guidance,
        path: path.roomIds,
        minutes: path.minutes,
        committedAt: new Date().toISOString(),
    };
    next.spatial = {
        ...(next.spatial || {}),
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId,
            roomId: destination.roomId,
        },
        lastMovement: movement,
    };
    return { state: next, movement };
}

export function resolvePlayerMovement(
    worldState,
    playerAction,
    storedMovement = null,
    options = {},
) {
    if (storedMovement?.moved !== true) {
        return applyPlayerMovement(
            worldState,
            playerAction,
            options,
        );
    }

    const correctedGuidedDestination =
        storedMovement.guided === true &&
        storedMovement.destinationSource ===
            'guide_context' &&
        options.guidedDestination &&
        (
            options.guidedDestination.mapId !==
                storedMovement.toMapId ||
            options.guidedDestination.roomId !==
                storedMovement.toRoomId
        );
    const replayBase = structuredClone(worldState);
    replayBase.map ??= {};
    replayBase.map.activeMapId =
        storedMovement.fromMapId ||
        replayBase.map.activeMapId;
    replayBase.map.currentLocalNodeId =
        storedMovement.fromRoomId ||
        replayBase.map.currentLocalNodeId;
    replayBase.spatial = {
        ...(replayBase.spatial || {}),
        player: {
            mapId:
                replayBase.map.activeMapId,
            roomId:
                replayBase.map.currentLocalNodeId,
        },
    };
    if (correctedGuidedDestination) {
        const staleCompanionIds = new Set([
            ...(storedMovement.companionIds || []),
            storedMovement.guidedByActorId,
        ].filter(Boolean));
        replayBase.actors = (
            replayBase.actors || []
        ).map(actor =>
            staleCompanionIds.has(actor.id) &&
            (actor.mapId ||
                storedMovement.toMapId) ===
                storedMovement.toMapId &&
            (actor.roomId ||
                storedMovement.toRoomId) ===
                storedMovement.toRoomId
                ? {
                    ...actor,
                    mapId:
                        storedMovement.fromMapId,
                    roomId:
                        storedMovement.fromRoomId,
                }
                : actor);
    }
    const replayDestination =
        correctedGuidedDestination
            ? options.guidedDestination
            : {
                mapId:
                    storedMovement.toMapId,
                roomId:
                    storedMovement.toRoomId,
                roomName:
                    storedMovement.toRoomName,
                roomNameEn:
                    storedMovement.toRoomNameEn,
            };
    const replayed = applyPlayerMovement(
        replayBase,
        playerAction,
        {
            ...options,
            confirmed: true,
            confirmedDestination:
                replayDestination,
        },
    );
    if (
        correctedGuidedDestination &&
        replayed.movement?.moved === true &&
        replayed.movement.toMapId ===
            options.guidedDestination.mapId &&
        replayed.movement.toRoomId ===
            options.guidedDestination.roomId
    ) {
        return replayed;
    }
    const sameDestination =
        replayed.movement?.moved === true &&
        replayed.movement.toMapId ===
            storedMovement.toMapId &&
        replayed.movement.toRoomId ===
            storedMovement.toRoomId;
    if (sameDestination) {
        return {
            state: replayed.state,
            movement: {
                ...structuredClone(storedMovement),
                ...replayed.movement,
                companionIds: [...new Set([
                    ...(storedMovement.companionIds || []),
                    ...(replayed.movement.companionIds || []),
                ])],
                committedAt:
                    storedMovement.committedAt ||
                    replayed.movement.committedAt,
            },
        };
    }

    const alreadyCommitted =
        worldState.map?.activeMapId ===
            storedMovement.toMapId &&
        worldState.map?.currentLocalNodeId ===
            storedMovement.toRoomId;
    if (alreadyCommitted) {
        return {
            state: worldState,
            movement:
                structuredClone(storedMovement),
        };
    }
    return applyPlayerMovement(
        worldState,
        playerAction,
        {
            ...options,
            confirmed: true,
            confirmedDestination:
                replayDestination,
        },
    );
}

export function reconcileSpatialState(
    worldState,
    recentPlayerAction = '',
    options = {},
) {
    let next = structuredClone(worldState);
    let changed = false;
    const previousSpatialVersion = Number(
        worldState.spatial?.version || 0,
    );
    next.map ??= {};
    const mapId = String(next.map?.activeMapId || '');
    const map = getLocalMapDefinition(mapId, next.map);
    const rooms = getMapRooms(map, next.map);
    const roomIds = new Set(rooms.map(room => room.id));
    const previousPlayerRoomId = String(
        next.map.currentLocalNodeId || '',
    );
    const sceneOpeningText = String(
        options.sceneOpeningText || '',
    ).trim();
    const openingGroundingVersion =
        Number(
            worldState.spatial
                ?.openingGroundingVersion ||
            0,
        );
    const hasCommittedSceneMovement =
        worldState.spatial
            ?.lastMovement?.moved === true;
    const needsOpeningGrounding =
        Boolean(sceneOpeningText) &&
        openingGroundingVersion < 1 &&
        !hasCommittedSceneMovement;
    let locationRepair = null;
    if (
        needsOpeningGrounding
    ) {
        const openingRoom =
            findExplicitRoomReference(
                sceneOpeningText,
                map,
                next.map,
            );
        if (
            openingRoom &&
            openingRoom.id !==
                previousPlayerRoomId
        ) {
            next.map.currentLocalNodeId =
                openingRoom.id;
            next.map.currentLevelId =
                openingRoom.levelId ||
                next.map.currentLevelId;
            next.map.discoveredLocalNodeIds =
                [...new Set([
                    ...(
                        next.map
                            .discoveredLocalNodeIds ||
                        []
                    ),
                    `${mapId}:${openingRoom.id}`,
                ])];
            if (next.scene) {
                next.scene.mapId = mapId;
                next.scene.roomId =
                    openingRoom.id;
            }
            next.location =
                openingRoom.name ||
                openingRoom.nameEn ||
                next.location;
            next.items = (next.items || [])
                .map((item, index) => {
                    const normalized =
                        normalizeInventoryItem(
                            item,
                            index,
                            {
                                mapId,
                                roomId:
                                    openingRoom.id,
                                clock: next.clock,
                            },
                        );
                    return normalized.ownerId ===
                        'player' &&
                        [
                            'carried',
                            'equipped',
                        ].includes(
                            normalized.custody,
                        )
                        ? {
                            ...normalized,
                            mapId,
                            roomId:
                                openingRoom.id,
                        }
                        : normalized;
                });
            if (next.scene) {
                next.scene.itemStates =
                    createSceneItemStates(
                        next.items,
                        {
                            mapId,
                            roomId:
                                openingRoom.id,
                        },
                    );
            }
            next.actors = (next.actors || [])
                .map(actor =>
                    actor.present !== false &&
                    (actor.mapId || mapId) ===
                        mapId &&
                    (
                        actor.roomId ||
                        previousPlayerRoomId
                    ) === previousPlayerRoomId
                        ? {
                            ...actor,
                            mapId,
                            roomId:
                                openingRoom.id,
                        }
                        : actor);
            locationRepair = {
                fromMapId: mapId,
                fromRoomId:
                    previousPlayerRoomId,
                toMapId: mapId,
                toRoomId: openingRoom.id,
                source:
                    'scene_opening_text',
            };
            changed = true;
        }
    }
    const dormitoryRoom =
        rooms.find(room =>
            room.id ===
                'gryffindor_girls_dormitory');
    const sceneDormitoryText = [
        next.scene?.id,
        next.scene?.name,
        next.scene?.nameEn,
        next.scene?.summary,
        next.scene?.summaryEn,
        sceneOpeningText,
    ].filter(Boolean).join(' ');
    const shouldRepairGryffindorDormitory =
        previousSpatialVersion < 6 &&
        mapId === 'hogwarts_castle' &&
        previousPlayerRoomId ===
            'gryffindor_common_room' &&
        dormitoryRoom &&
        /(?:gryffindor[_\s-]*(?:girls?[_\s-]*)?dormitory|gryffindor.{0,160}(?:girls?|female).{0,80}dormitory|girls?.{0,160}dormitory|女生.{0,80}(?:宿舍|卧室)|宿舍里有|爬.{0,80}楼梯.{0,80}宿舍)/iu
            .test(
                sceneDormitoryText,
            );
    if (
        shouldRepairGryffindorDormitory
    ) {
        next.map.currentLocalNodeId =
            dormitoryRoom.id;
        next.map.currentLevelId =
            dormitoryRoom.levelId;
        next.map.discoveredLocalNodeIds =
            [...new Set([
                ...(
                    next.map
                        .discoveredLocalNodeIds ||
                    []
                ),
                `${mapId}:${dormitoryRoom.id}`,
            ])];
        next.location =
            dormitoryRoom.name ||
            dormitoryRoom.nameEn ||
            next.location;
        if (next.scene) {
            next.scene.mapId = mapId;
            next.scene.roomId =
                dormitoryRoom.id;
            if (
                next.scene
                    .nextSceneIntent
                    ?.mapId ===
                    mapId &&
                next.scene
                    .nextSceneIntent
                    ?.roomId ===
                    previousPlayerRoomId
            ) {
                next.scene.nextSceneIntent = {
                    ...next.scene
                        .nextSceneIntent,
                    roomId:
                        dormitoryRoom.id,
                };
            }
        }
        next.actors = (
            next.actors || []
        ).map(actor =>
            actor.present !== false &&
            (actor.mapId || mapId) ===
                mapId &&
            (
                actor.roomId ||
                previousPlayerRoomId
            ) === previousPlayerRoomId
                ? {
                    ...actor,
                    mapId,
                    roomId:
                        dormitoryRoom.id,
                }
                : actor);
        next.items = (
            next.items || []
        ).map((item, index) => {
            const normalized =
                normalizeInventoryItem(
                    item,
                    index,
                    {
                        mapId,
                        roomId:
                            dormitoryRoom.id,
                        clock: next.clock,
                    },
                );
            return normalized.ownerId ===
                'player' &&
                [
                    'carried',
                    'equipped',
                ].includes(
                    normalized.custody,
                )
                ? {
                    ...normalized,
                    mapId,
                    roomId:
                        dormitoryRoom.id,
                }
                : normalized;
        });
        if (next.scene) {
            next.scene.itemStates =
                createSceneItemStates(
                    next.items,
                    {
                        mapId,
                        roomId:
                            dormitoryRoom.id,
                    },
                );
        }
        locationRepair = {
            fromMapId: mapId,
            fromRoomId:
                previousPlayerRoomId,
            toMapId: mapId,
            toRoomId:
                dormitoryRoom.id,
            source:
                'gryffindor_dormitory_scene_migration',
        };
        changed = true;
    }
    const fallbackRoomId = roomIds.has(next.map?.currentLocalNodeId)
        ? next.map.currentLocalNodeId
        : rooms[0]?.id || '';
    next.actors = (next.actors || []).map(actor => {
        const actorMapId = getLocalMapDefinition(actor.mapId, next.map)
            ? actor.mapId
            : mapId;
        const actorMap = getLocalMapDefinition(actorMapId, next.map);
        const actorRooms = new Set(
            getMapRooms(actorMap, next.map).map(room => room.id),
        );
        let roomId = actorRooms.has(actor.roomId)
            ? actor.roomId
            : inferActorRoomId(actor, actorMap, fallbackRoomId);
        const activityRoomId =
            inferActorRoomId(
                actor,
                actorMap,
                roomId,
            );
        if (
            previousSpatialVersion <
                SPATIAL_STATE_VERSION &&
            activityRoomId &&
            activityRoomId !== roomId &&
            findLocalRoomPath(
                actorMapId,
                roomId,
                activityRoomId,
                next.map,
            )
        ) {
            roomId = activityRoomId;
        }
        const activity = String(
            actor.currentActivityEn ||
            actor.currentActivity ||
            '',
        );
        if (
            previousSpatialVersion <
                SPATIAL_STATE_VERSION &&
            actorMapId === mapId &&
            actor.roomId === 'gringotts_steps' &&
            /^\s*steps from\b/i.test(activity) &&
            !/(?:gringotts|古灵阁)/i.test(activity)
        ) {
            roomId = fallbackRoomId;
        }
        if (actor.mapId !== actorMapId || actor.roomId !== roomId) {
            changed = true;
        }
        return {
            ...actor,
            mapId: actorMapId,
            roomId,
        };
    });
    let movement = null;
    const shouldUpgradeGringottsLandmark =
        previousSpatialVersion < 3 &&
        next.map?.currentLocalNodeId ===
            'gringotts_steps' &&
        /(?:古灵阁|gringotts)/i.test(
            recentPlayerAction,
        ) &&
        !/(?:古灵阁台阶|gringotts steps)/i.test(
            recentPlayerAction,
        );
    if (shouldUpgradeGringottsLandmark) {
        const previousMovement =
            structuredClone(
                next.spatial?.lastMovement,
            );
        const result = applyPlayerMovement(
            next,
            recentPlayerAction,
            { confirmed: true },
        );
        next = result.state;
        movement = result.movement;
        if (
            movement?.moved &&
            previousMovement?.moved
        ) {
            const previousCompanions = new Set(
                previousMovement.companionIds || [],
            );
            next.actors = (next.actors || [])
                .map(actor =>
                    previousCompanions.has(actor.id) &&
                    actor.mapId === movement.toMapId &&
                    actor.roomId ===
                        movement.fromRoomId
                        ? {
                            ...actor,
                            roomId:
                                movement.toRoomId,
                        }
                        : actor);
            const previousPath =
                previousMovement.path || [];
            const upgradedMovement = {
                ...movement,
                fromMapId:
                    previousMovement.fromMapId ||
                    movement.fromMapId,
                fromRoomId:
                    previousMovement.fromRoomId ||
                    movement.fromRoomId,
                fromRoomName:
                    previousMovement.fromRoomName ||
                    movement.fromRoomName,
                companionIds: [...new Set([
                    ...(previousMovement
                        .companionIds || []),
                    ...(movement.companionIds || []),
                ])],
                path: [
                    ...previousPath,
                    ...(movement.path || []).slice(
                        previousPath.at(-1) ===
                            movement.path?.[0]
                            ? 1
                            : 0,
                    ),
                ],
                minutes:
                    Number(
                        previousMovement.minutes || 0,
                    ) +
                    Number(movement.minutes || 0),
                committedAt:
                    previousMovement.committedAt ||
                    movement.committedAt,
            };
            next.spatial.lastMovement =
                upgradedMovement;
            movement = upgradedMovement;
        }
        changed ||= Boolean(movement?.moved);
    } else if (
        (
            !worldState.spatial?.version ||
            (
                previousSpatialVersion <
                    SPATIAL_STATE_VERSION &&
                Boolean(
                    parseExplicitMovementDirective(
                        recentPlayerAction,
                    ),
                ) &&
                worldState.spatial
                    ?.lastMovement
                    ?.moved !== true
            ) ||
            options.retryUnresolvedMovement === true
        ) &&
        recentPlayerAction
    ) {
        const result = applyPlayerMovement(
            next,
            recentPlayerAction,
            { confirmed: true },
        );
        next = result.state;
        movement = result.movement;
        changed ||= Boolean(movement?.moved);
    }
    const player = {
        mapId: String(next.map?.activeMapId || ''),
        roomId: String(next.map?.currentLocalNodeId || ''),
    };
    const nextOpeningGroundingVersion =
        sceneOpeningText &&
        (
            needsOpeningGrounding ||
            hasCommittedSceneMovement
        )
            ? 1
            : openingGroundingVersion;
    if (next.spatial?.version !==
            SPATIAL_STATE_VERSION ||
        next.spatial
            ?.openingGroundingVersion !==
            nextOpeningGroundingVersion ||
        next.spatial?.player?.mapId !== player.mapId ||
        next.spatial?.player?.roomId !== player.roomId) {
        changed = true;
    }
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        openingGroundingVersion:
            nextOpeningGroundingVersion,
        player,
        lastMovement: next.spatial?.lastMovement || movement || null,
    };
    return {
        state: next,
        changed,
        movement,
        locationRepair,
    };
}

function roomReferencesRoom(room, target) {
    const description = normalizeSpatialText(
        room?.descriptionEn || room?.description || '',
    );
    return [target?.id, target?.name, target?.nameEn]
        .map(normalizeSpatialText)
        .filter(label => label.length >= 4)
        .some(label => description.includes(label));
}

export function buildSpatialContext(worldState) {
    const mapState = worldState.map || {};
    const playerMapId = String(mapState.activeMapId || '');
    const playerRoomId = String(mapState.currentLocalNodeId || '');
    const playerMap = getLocalMapDefinition(playerMapId, mapState);
    const playerRooms = getMapRooms(playerMap, mapState);
    const roomById = new Map(playerRooms.map(room => [room.id, room]));
    const playerRoom = roomById.get(playerRoomId);
    const actors = (worldState.actors || [])
        .filter(actor => actor.present !== false)
        .map(actor => {
            const actorMapId = actor.mapId || playerMapId;
            const actorRoomId = actor.roomId || playerRoomId;
            const actorRoom = actorMapId === playerMapId
                ? roomById.get(actorRoomId)
                : null;
            const sameRoom = actorMapId === playerMapId &&
                actorRoomId === playerRoomId;
            const directRoute = actorMapId === playerMapId &&
                getMapExits(playerMap, mapState).some(route =>
                    route.from === actorRoomId &&
                    route.to === playerRoomId &&
                    isRoutePassable(playerMapId, route, mapState));
            const describedSightline = actorMapId === playerMapId &&
                (roomReferencesRoom(actorRoom, playerRoom) ||
                    roomReferencesRoom(playerRoom, actorRoom));
            const path = actorMapId === playerMapId
                ? findLocalRoomPath(
                    playerMapId,
                    actorRoomId,
                    playerRoomId,
                    mapState,
                )
                : null;
            return {
                id: actor.id,
                nameEn: actor.nameEn,
                mapId: actorMapId,
                roomId: actorRoomId,
                roomName: actorRoom?.name || actorRoom?.nameEn || actorRoomId,
                canSeePlayer: Boolean(
                    sameRoom || directRoute || describedSightline,
                ),
                canHearPlayer: Boolean(path && path.roomIds.length <= 3),
                visibilityReason: sameRoom
                    ? 'same_room'
                    : describedSightline
                        ? 'described_sightline'
                        : directRoute
                            ? 'adjacent_opening'
                            : 'none',
            };
        });
    return {
        player: {
            mapId: playerMapId,
            roomId: playerRoomId,
            roomName: playerRoom?.name || playerRoom?.nameEn || playerRoomId,
        },
        actors,
    };
}

export function reconcileVisibleActorPresenceState(
    worldState,
) {
    const next =
        structuredClone(
            worldState,
        );
    const visibleActorIds =
        new Set(
            buildSpatialContext(
                next,
            ).actors
                .filter(actor =>
                    actor.canSeePlayer ||
                    actor.canHearPlayer)
                .map(actor =>
                    actor.id),
        );
    const removedActorIds = [];
    next.actors = (
        next.actors ||
        []
    ).map(actor => {
        if (
            actor.present === false ||
            visibleActorIds.has(
                actor.id,
            )
        ) {
            return actor;
        }
        removedActorIds.push(
            actor.id,
        );
        return {
            ...actor,
            present: false,
        };
    });
    return {
        state: next,
        changed:
            removedActorIds.length > 0,
        removedActorIds,
    };
}

export function migrateActorMovementHistory(
    worldState,
    chat = [],
) {
    if (
        Number(
            worldState
                .actorMovementHistoryVersion ||
            0,
        ) >=
        ACTOR_MOVEMENT_HISTORY_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const actorById =
        new Map(
            (
                next.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const profileById =
        new Map(
            (
                next.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const lastKnown =
        new Map();
    const actorIdsNamedIn =
        text => {
            const normalized =
                normalizeSpatialText(
                    text,
                );
            return [
                ...actorById.values(),
            ]
                .filter(actor => {
                    const profile =
                        profileById.get(
                            actor.id,
                        ) ||
                        {};
                    return [
                        actor.id,
                        actor.name,
                        actor.nameEn,
                        ...(actor.aliases ||
                            []),
                        profile.name,
                        profile.nameEn,
                        ...(profile.aliases ||
                            []),
                    ]
                        .map(
                            normalizeSpatialText,
                        )
                        .filter(alias =>
                            alias.length >=
                            2)
                        .some(alias =>
                            normalized
                                .includes(
                                    alias,
                                ));
                })
                .map(actor =>
                    actor.id);
        };
    for (
        const message
        of Array.isArray(chat)
            ? chat
            : []
    ) {
        const mud =
            message?.extra
                ?.hogwartsMud;
        if (
            message?.is_user &&
            mud?.movement?.moved ===
                true
        ) {
            const directive =
                parseExplicitMovementDirective(
                    message.mes,
                );
            const actorIds =
                new Set([
                    ...(
                        mud.movement
                            .companionIds ||
                        []
                    ),
                    ...actorIdsNamedIn(
                        directive
                            ?.destinationText ||
                        '',
                    ),
                ]);
            for (
                const actorId
                of actorIds
            ) {
                if (
                    actorById.has(
                        actorId,
                    )
                ) {
                    lastKnown.set(
                        actorId,
                        {
                            mapId:
                                mud
                                    .movement
                                    .toMapId,
                            roomId:
                                mud
                                    .movement
                                    .toRoomId,
                            currentActivityEn:
                                `Last known at ${
                                    mud
                                        .movement
                                        .toRoomNameEn ||
                                    mud
                                        .movement
                                        .toRoomName ||
                                    mud
                                        .movement
                                        .toRoomId
                                } after accompanying the player's explicit movement.`,
                        },
                    );
                }
            }
        }
        const transaction =
            mud?.turnTransaction;
        for (
            const update
            of transaction
                ?.actorUpdates ||
            []
        ) {
            if (
                actorById.has(
                    update.id,
                ) &&
                (
                    update.mapId ||
                    update.roomId
                )
            ) {
                const previous =
                    lastKnown.get(
                        update.id,
                    ) ||
                    actorById.get(
                        update.id,
                    );
                lastKnown.set(
                    update.id,
                    {
                        mapId:
                            update.mapId ||
                            previous
                                ?.mapId,
                        roomId:
                            update.roomId ||
                            previous
                                ?.roomId,
                        currentActivityEn:
                            update
                                .currentActivityEn ||
                            previous
                                ?.currentActivityEn,
                    },
                );
            }
        }
    }
    next.actors = (
        next.actors ||
        []
    ).map(actor => {
        const location =
            lastKnown.get(
                actor.id,
            );
        return location
            ? {
                ...actor,
                mapId:
                    location.mapId ||
                    actor.mapId,
                roomId:
                    location.roomId ||
                    actor.roomId,
                currentActivityEn:
                    location
                        .currentActivityEn ||
                    actor
                        .currentActivityEn,
            }
            : actor;
    });
    next.actorMovementHistoryVersion =
        ACTOR_MOVEMENT_HISTORY_VERSION;
    return {
        state: next,
        changed: true,
    };
}

export function reconcileTurnActorPresenceWithSpatialState(
    transaction,
    worldState,
) {
    const next =
        structuredClone(
            transaction,
        );
    const actorById =
        new Map(
            (
                worldState.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const updates =
        new Map(
            (
                next.actorUpdates ||
                []
            ).map(update => [
                update.id,
                update,
            ]),
        );
    const projectedState = {
        ...worldState,
        actors: (
            worldState.actors ||
            []
        ).map(actor => {
            const update =
                updates.get(
                    actor.id,
                );
            return update
                ? {
                    ...actor,
                    present:
                        update.present ??
                        actor.present,
                    mapId:
                        update.mapId ||
                        actor.mapId,
                    roomId:
                        update.roomId ||
                        actor.roomId,
                }
                : actor;
        }),
    };
    const visibleActorIds =
        new Set(
            buildSpatialContext(
                projectedState,
            ).actors
                .filter(actor =>
                    actor.canSeePlayer ||
                    actor.canHearPlayer)
                .map(actor =>
                    actor.id),
        );
    const temporaryActorIds =
        new Set(
            (
                next
                    .temporaryActorEntrances ||
                []
            ).map(actor =>
                actor.id),
        );
    const suppliedPresence =
        Array.isArray(
            next.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? next.actorPresence
                .presentActorIdsAfterTurn
            : (
                worldState.actors ||
                []
            )
                .filter(actor =>
                    actor.present !==
                        false)
                .map(actor =>
                    actor.id);
    const finalPresence = [];
    for (
        const actorId
        of new Set(
            suppliedPresence,
        )
    ) {
        const actor =
            actorById.get(
                actorId,
            );
        const update =
            updates.get(
                actorId,
            );
        if (
            temporaryActorIds
                .has(actorId) ||
            (
                actor &&
                update?.present !==
                    false &&
                visibleActorIds
                    .has(actorId)
            )
        ) {
            finalPresence.push(
                actorId,
            );
            continue;
        }
        if (
            !actor ||
            update?.present ===
                false
        ) {
            continue;
        }
        updates.set(
            actorId,
            {
                ...update,
                id: actorId,
                present: false,
                currentActivityEn:
                    update
                        ?.currentActivityEn ||
                    actor
                        .currentActivityEn ||
                    `Off-scene in ${
                        actor.roomId ||
                        'an unknown room'
                    }.`,
            },
        );
    }
    next.actorPresence = {
        presentActorIdsAfterTurn:
            finalPresence,
    };
    next.actorUpdates = [
        ...updates.values(),
    ];
    return next;
}

export function validateLocalMapPack(mapPack = PRESET_LOCAL_MAPS) {
    const errors = [];
    const parentIds = new Set(PRESET_WORLD_MAP.nodes.map(item => item.id));
    for (const [mapId, map] of Object.entries(mapPack || {})) {
        if (map.id !== mapId) {
            errors.push(`${mapId}: map.id 不匹配。`);
        }
        if (!parentIds.has(map.parentWorldNodeId)) {
            errors.push(`${mapId}: parentWorldNodeId 不存在。`);
        }
        const levelIds = new Set((map.levels || []).map(level => level.id));
        if (!levelIds.has(map.defaultLevelId)) {
            errors.push(`${mapId}: 默认楼层不存在。`);
        }
        const nodeIds = new Set();
        for (const room of map.nodes || []) {
            if (nodeIds.has(room.id)) {
                errors.push(`${mapId}: 房间 ID ${room.id} 重复。`);
            }
            nodeIds.add(room.id);
            if (!levelIds.has(room.levelId)) {
                errors.push(`${mapId}: 房间 ${room.id} 引用了不存在的楼层。`);
            }
            if (!Number.isFinite(room.x) || !Number.isFinite(room.y)) {
                errors.push(`${mapId}: 房间 ${room.id} 缺少有效坐标。`);
            }
        }
        for (const route of map.exits || []) {
            if (!nodeIds.has(route.from) || !nodeIds.has(route.to)) {
                errors.push(`${mapId}: 出口 ${route.from} -> ${route.to} 引用了不存在的房间。`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}

export function resolveLocalMapId(mapState = {}, currentLocation = '') {
    const explicit = String(mapState?.activeMapId || '');
    if (getLocalMapDefinition(explicit, mapState)) {
        return explicit;
    }
    const location = String(currentLocation || '').trim().toLocaleLowerCase();
    const customMatch = (mapState.customLocalMaps || []).find(item =>
        item.id.toLocaleLowerCase() === location || item.name.toLocaleLowerCase() === location,
    );
    if (customMatch) {
        return customMatch.id;
    }
    return LOCAL_MAP_CATALOG.find(item =>
        item.id.toLocaleLowerCase() === location ||
        item.name.toLocaleLowerCase() === location ||
        item.parentWorldNodeId.toLocaleLowerCase() === location,
    )?.id || null;
}

export function buildLocalMapModel(mapId, mapState = {}, requestedLevelId = '') {
    const preset = getLocalMapDefinition(mapId, mapState);
    if (!preset) {
        return null;
    }
    const generatedNodes = (mapState.generatedLocalNodes || []).filter(item => item.mapId === mapId);
    const generatedExits = (mapState.generatedLocalExits || []).filter(item => item.mapId === mapId);
    const roomStates = mapState.roomStates && typeof mapState.roomStates === 'object' ? mapState.roomStates : {};
    const exitStates = mapState.exitStates && typeof mapState.exitStates === 'object' ? mapState.exitStates : {};
    const currentRoomId = String(mapState.currentLocalNodeId || '');
    const currentRoom = [...preset.nodes, ...generatedNodes].find(room => room.id === currentRoomId);
    const levelId = preset.levels.some(level => level.id === requestedLevelId)
        ? requestedLevelId
        : currentRoom?.levelId || mapState.currentLevelId || preset.defaultLevelId;
    const discovered = new Set(mapState.discoveredLocalNodeIds || []);
    const nodes = [...preset.nodes, ...generatedNodes]
        .filter(room => room.levelId === levelId)
        .map(room => ({
            ...room,
            runtime: roomStates[`${mapId}:${room.id}`] || null,
            visibility: room.id === currentRoomId
                ? 'current'
                : discovered.has(`${mapId}:${room.id}`) || room.access !== 'secret'
                    ? 'discovered'
                    : 'known',
            generated: generatedNodes.includes(room),
        }));
    const visibleIds = new Set(nodes.map(room => room.id));
    const exits = [...preset.exits, ...generatedExits]
        .filter(route => visibleIds.has(route.from) && visibleIds.has(route.to))
        .map(route => ({
            ...route,
            runtime: exitStates[`${mapId}:${route.from}->${route.to}`] || null,
            generated: generatedExits.includes(route),
        }));
    return {
        id: preset.id,
        name: preset.name,
        layoutRule: preset.layoutRule || '',
        levels: preset.levels.map(level => ({ ...level })),
        levelId,
        nodes,
        exits,
        currentRoomId,
    };
}

export function buildMapAuthorityContext(worldState = {}) {
    const mapState = worldState.map || {};
    const activeMapId = resolveLocalMapId(mapState, worldState.location);
    const activeMap = getLocalMapDefinition(activeMapId, mapState);
    const payload = {
        schemaVersion: LOCAL_MAP_SCHEMA_VERSION,
        authority: [
            'Preset rooms, levels, coordinates, and exits are immutable facts.',
            'Use the preset graph before proposing any new location.',
            'currentLocalNodeId is the player room; every present actor owns a separate mapId and roomId.',
            'Runtime changes may block, damage, reveal, or reroute preset topology without deleting it.',
            'Only the World Director may propose a genuinely new room after confirming the map pack has no suitable location.',
        ],
        worldCatalog: PRESET_WORLD_MAP.nodes.map(item => ({
            id: item.id,
            name: item.name,
            regionId: item.regionId,
            localMapId: getPresetLocalMap(item.id)?.id || null,
        })),
        localMapCatalog: LOCAL_MAP_CATALOG,
        activeMap: activeMap ? {
            id: activeMap.id,
            name: activeMap.name,
            layoutRule: activeMap.layoutRule || '',
            levels: activeMap.levels,
            nodes: activeMap.nodes,
            exits: activeMap.exits,
        } : null,
        runtimeDiff: {
            activeMapId,
            currentLocalNodeId: mapState.currentLocalNodeId || null,
            currentLevelId: mapState.currentLevelId || null,
            discoveredLocalNodeIds: mapState.discoveredLocalNodeIds || [],
            roomStates: mapState.roomStates || {},
            exitStates: mapState.exitStates || {},
            generatedLocalNodes: mapState.generatedLocalNodes || [],
            generatedLocalExits: mapState.generatedLocalExits || [],
        },
        spatial: buildSpatialContext(worldState),
    };
    return `MUD MAP AUTHORITY (binding JSON):\n${JSON.stringify(payload)}`;
}

export function validateLocalMapMutation(mutation, mapPack = PRESET_LOCAL_MAPS) {
    const errors = [];
    if (!mutation || typeof mutation !== 'object' || Array.isArray(mutation)) {
        return { valid: false, errors: ['地图状态变更必须是对象。'] };
    }
    const map = mapPack[mutation.mapId];
    if (!map) {
        return { valid: false, errors: ['地图状态变更引用了不存在的小地图。'] };
    }
    const roomIds = new Set(map.nodes.map(room => room.id));
    const exitIds = new Set(map.exits.map(route => `${route.from}->${route.to}`));
    const changes = Array.isArray(mutation.changes) ? mutation.changes : [];
    if (!changes.length || changes.length > 20) {
        errors.push('地图状态变更必须包含 1–20 项。');
    }
    for (const [index, change] of changes.entries()) {
        const prefix = `第 ${index + 1} 项`;
        if (change.type === 'room_state') {
            if (!roomIds.has(change.roomId)) {
                errors.push(`${prefix}引用了不存在的房间。`);
            }
            if (!['normal', 'blocked', 'damaged', 'altered', 'occupied'].includes(change.status)) {
                errors.push(`${prefix}的房间状态无效。`);
            }
        } else if (change.type === 'exit_state') {
            if (!exitIds.has(`${change.from}->${change.to}`) && !exitIds.has(`${change.to}->${change.from}`)) {
                errors.push(`${prefix}引用了不存在的出口。`);
            }
            if (typeof change.blocked !== 'boolean') {
                errors.push(`${prefix}缺少 blocked 布尔值。`);
            }
        } else if (change.type === 'discover_secret') {
            if (!roomIds.has(change.roomId)) {
                errors.push(`${prefix}引用了不存在的秘密地点。`);
            }
        } else {
            errors.push(`${prefix}的变更类型无效。`);
        }
    }
    return { valid: errors.length === 0, errors };
}

export function applyLocalMapMutation(mapState, mutation) {
    const next = structuredClone(mapState || {});
    next.roomStates = next.roomStates || {};
    next.exitStates = next.exitStates || {};
    next.discoveredLocalNodeIds = Array.isArray(next.discoveredLocalNodeIds)
        ? next.discoveredLocalNodeIds
        : [];
    for (const change of mutation.changes) {
        if (change.type === 'room_state') {
            next.roomStates[`${mutation.mapId}:${change.roomId}`] = {
                status: change.status,
                note: String(change.note || ''),
            };
        } else if (change.type === 'exit_state') {
            next.exitStates[`${mutation.mapId}:${change.from}->${change.to}`] = {
                blocked: change.blocked,
                note: String(change.note || ''),
            };
        } else if (change.type === 'discover_secret') {
            const key = `${mutation.mapId}:${change.roomId}`;
            if (!next.discoveredLocalNodeIds.includes(key)) {
                next.discoveredLocalNodeIds.push(key);
            }
        }
    }
    return next;
}

export function buildMapModel(mapState = {}, currentLocation = '', revealAll = false) {
    const regionById = new Map(PRESET_WORLD_MAP.regions.map(region => [region.id, region]));
    const overrides = mapState?.nodeOverrides && typeof mapState.nodeOverrides === 'object'
        ? mapState.nodeOverrides
        : {};
    const discovered = new Set(Array.isArray(mapState?.discoveredNodeIds) ? mapState.discoveredNodeIds : []);
    const sourceNodes = [
        ...PRESET_WORLD_MAP.nodes.map(node => ({ ...node, ...(overrides[node.id] || {}) })),
        ...(Array.isArray(mapState?.generatedNodes) ? mapState.generatedNodes : []),
    ];
    const explicitCurrentId = String(mapState?.currentNodeId || '');
    const location = String(currentLocation || '').trim().toLocaleLowerCase();
    const currentNodeId = explicitCurrentId || sourceNodes.find(node =>
        node.name.toLocaleLowerCase() === location || node.id.toLocaleLowerCase() === location,
    )?.id || '';

    const nodes = sourceNodes.map(node => {
        const region = regionById.get(node.regionId);
        const localX = Number.isFinite(Number(node.x)) ? Number(node.x) : 50;
        const localY = Number.isFinite(Number(node.y)) ? Number(node.y) : 50;
        const isCurrent = node.id === currentNodeId;
        const isDiscovered = revealAll || isCurrent || discovered.has(node.id) || node.locked === false;
        return {
            ...node,
            mapX: region ? region.x + (localX - 50) * 0.34 : localX,
            mapY: region ? region.y + (localY - 50) * 0.30 : localY,
            visibility: isCurrent ? 'current' : isDiscovered ? 'discovered' : 'known',
        };
    });
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const edges = PRESET_WORLD_MAP.edges
        .map(edge => ({
            ...edge,
            source: nodeById.get(edge.from),
            target: nodeById.get(edge.to),
        }))
        .filter(edge => edge.source && edge.target)
        .map(edge => ({
            ...edge,
            visibility: revealAll || (
                edge.source.visibility !== 'known' &&
                edge.target.visibility !== 'known'
            ) ? 'discovered' : 'known',
        }));
    const connectedIds = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    nodes.filter(node => node.locked === false && !connectedIds.has(node.id)).forEach(node => {
        const nearest = nodes
            .filter(candidate => candidate.id !== node.id && candidate.regionId === node.regionId)
            .map(candidate => ({
                node: candidate,
                distance: Math.hypot(candidate.mapX - node.mapX, candidate.mapY - node.mapY),
            }))
            .sort((left, right) => left.distance - right.distance)[0]?.node;
        if (nearest) {
            edges.push({
                from: nearest.id,
                to: node.id,
                mode: 'discovered',
                minutes: null,
                source: nearest,
                target: node,
                visibility: 'discovered',
                generated: true,
            });
        }
    });

    return {
        regions: PRESET_WORLD_MAP.regions.map(region => ({ ...region })),
        nodes,
        edges,
        currentNodeId,
    };
}

export function validateMapProposal(proposal, options = {}) {
    const trigger = String(options.trigger || '');
    const baseMap = options.baseMap || PRESET_WORLD_MAP;
    const generatedNodes = Array.isArray(options.generatedNodes) ? options.generatedNodes : [];
    const errors = [];

    if (!MAP_DIRECTOR_TRIGGERS.includes(trigger)) {
        errors.push('地图提案缺少有效触发条件。');
    }
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
        return { valid: false, errors: ['地图提案必须是对象。'] };
    }

    const changes = Array.isArray(proposal.changes) ? proposal.changes : [];
    if (!changes.length || changes.length > 12) {
        errors.push('地图提案必须包含 1–12 项变更。');
    }

    const regions = new Set(baseMap.regions.map(region => region.id));
    const baseNodes = new Map(baseMap.nodes.map(node => [node.id, node]));
    const generatedIds = new Set(generatedNodes.map(node => node.id));
    const seenIds = new Set([...baseNodes.keys(), ...generatedIds]);

    for (const [index, change] of changes.entries()) {
        const prefix = `第 ${index + 1} 项`;
        if (!change || typeof change !== 'object' || !['add', 'update'].includes(change.operation)) {
            errors.push(`${prefix}只允许 add 或 update。`);
            continue;
        }
        const node = change.node;
        if (!node || typeof node !== 'object' || !/^[a-z0-9_]{3,64}$/.test(String(node.id || ''))) {
            errors.push(`${prefix}的地点 ID 无效。`);
            continue;
        }

        if (change.operation === 'add') {
            if (seenIds.has(node.id)) {
                errors.push(`${prefix}试图重复创建地点。`);
            }
            if (!regions.has(node.regionId)) {
                errors.push(`${prefix}引用了不存在的区域。`);
            }
            if (!String(node.name || '').trim() || !String(node.summary || '').trim()) {
                errors.push(`${prefix}缺少地点名称或说明。`);
            }
            seenIds.add(node.id);
            continue;
        }

        if (!seenIds.has(node.id)) {
            errors.push(`${prefix}试图修改不存在的地点。`);
            continue;
        }
        if (baseNodes.has(node.id)) {
            if (!['canon_divergence', 'world_event'].includes(trigger)) {
                errors.push(`${prefix}没有修改原著地点的因果权限。`);
            }
            const forbidden = ['name', 'regionId', 'x', 'y', 'kind', 'locked'];
            if (forbidden.some(key => Object.hasOwn(node, key))) {
                errors.push(`${prefix}试图改写原著地点身份或坐标。`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

export function applyMapProposal(mapState, proposal) {
    const next = structuredClone(mapState);
    next.generatedNodes = Array.isArray(next.generatedNodes) ? next.generatedNodes : [];
    next.nodeOverrides = next.nodeOverrides && typeof next.nodeOverrides === 'object' ? next.nodeOverrides : {};
    next.proposals = Array.isArray(next.proposals) ? next.proposals : [];

    for (const change of proposal.changes) {
        if (change.operation === 'add') {
            next.generatedNodes.push({
                ...structuredClone(change.node),
                locked: false,
                generatedBy: 'world-director',
            });
        } else {
            const generatedIndex = next.generatedNodes.findIndex(node => node.id === change.node.id);
            if (generatedIndex >= 0) {
                next.generatedNodes[generatedIndex] = {
                    ...next.generatedNodes[generatedIndex],
                    ...structuredClone(change.node),
                    id: next.generatedNodes[generatedIndex].id,
                };
            } else {
                const { id, ...allowedChanges } = change.node;
                next.nodeOverrides[id] = {
                    ...(next.nodeOverrides[id] || {}),
                    ...structuredClone(allowedChanges),
                };
            }
        }
    }
    next.proposals.push({
        id: proposal.id || `map-${Date.now()}`,
        reason: String(proposal.reason || ''),
        acceptedAt: Date.now(),
    });
    return next;
}

export function splitTranslationChunks(text, maxLength = 4700) {
    const source = String(text ?? '').trim();
    if (!source) {
        return [];
    }

    const safeMaxLength = Math.max(32, Number(maxLength) || 4700);
    const splitOversizedParagraph = paragraph => {
        const pieces = [];
        let remaining = paragraph.trim();
        while (remaining.length > safeMaxLength) {
            const window = remaining.slice(0, safeMaxLength + 1);
            let cut = 0;
            const sentenceBoundary = /[.!?。！？](?:["'”’)\]]*)\s+/g;
            for (const match of window.matchAll(sentenceBoundary)) {
                cut = match.index + match[0].trimEnd().length;
            }
            if (!cut) {
                const whitespaceBoundary = /\s+/g;
                for (const match of window.matchAll(whitespaceBoundary)) {
                    if (match.index > 0) {
                        cut = match.index;
                    }
                }
            }
            if (!cut) {
                const nextWhitespace = remaining.slice(safeMaxLength).search(/\s/);
                if (nextWhitespace < 0) {
                    pieces.push(remaining);
                    return pieces;
                }
                cut = safeMaxLength + nextWhitespace;
            }
            pieces.push(remaining.slice(0, cut).trim());
            remaining = remaining.slice(cut).trimStart();
        }
        if (remaining) {
            pieces.push(remaining);
        }
        return pieces;
    };

    const paragraphs = source.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean);
    const chunks = [];
    let current = '';

    const flush = () => {
        if (current) {
            chunks.push(current);
            current = '';
        }
    };

    for (const paragraph of paragraphs) {
        if (paragraph.length > safeMaxLength) {
            flush();
            chunks.push(...splitOversizedParagraph(paragraph));
            continue;
        }

        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
        if (candidate.length > safeMaxLength) {
            flush();
            current = paragraph;
        } else {
            current = candidate;
        }
    }

    flush();
    return chunks;
}

export const TRANSLATION_PROVIDER_IDS = Object.freeze([
    'local',
    'google',
    'bing',
    'off',
]);

export function normalizeTranslationProvider(value, fallback = 'local') {
    const normalized = String(value || '').trim().toLocaleLowerCase();
    if (TRANSLATION_PROVIDER_IDS.includes(normalized)) {
        return normalized;
    }
    const normalizedFallback = String(fallback || '').trim().toLocaleLowerCase();
    return TRANSLATION_PROVIDER_IDS.includes(normalizedFallback)
        ? normalizedFallback
        : 'local';
}

export const TRANSLATION_TERM_GLOSSARY = Object.freeze([
    ...CANON_PLAYABLE_CHARACTER_CATALOG
        .flatMap(character =>
            [
                ...new Set(
                    getCanonNameAliases(
                        character,
                    ).filter(alias =>
                        !/[\p{Script=Han}]/u
                            .test(alias)),
                ),
            ].map(source =>
                Object.freeze({
                    source,
                    target:
                        character
                            .nameZh,
                }))),
    Object.freeze({ source: 'Hogwarts School of Witchcraft and Wizardry', target: '霍格沃茨魔法学校' }),
    Object.freeze({ source: 'Hogwarts Express', target: '霍格沃茨特快' }),
    Object.freeze({ source: 'Hogwarts uniform handbook', target: '霍格沃茨校服手册' }),
    Object.freeze({ source: 'Tina\'s first morning at Hogwarts', target: '蒂娜在霍格沃茨的第一个早晨' }),
    Object.freeze({ source: 'egg on her hand, egg on her wrist, egg on her robe, and egg on her civic duty', target: '手上沾着鸡蛋，手腕上沾着鸡蛋，袍子上沾着鸡蛋，连公民义务上也沾着鸡蛋' }),
    Object.freeze({ source: 'dragged Lavender to Charms class so fast the ink was still wet', target: '以飞快的速度拽着拉文德赶去魔咒课，墨水甚至还没干' }),
    Object.freeze({ source: 'tucked them under one arm', target: '把三本书夹在一只胳膊下' }),
    Object.freeze({ source: 'arranged a signed parchment between them', target: '把一张签名羊皮纸摆在两人之间' }),
    Object.freeze({ source: 'Platform Nine and Three-Quarters', target: '九又四分之三站台' }),
    Object.freeze({ source: 'Standard Book of Spells', target: '《标准咒语》' }),
    Object.freeze({ source: 'Sorting notes parchment', target: '分院笔记羊皮纸' }),
    Object.freeze({ source: 'Sorting parchment', target: '分院羊皮纸' }),
    Object.freeze({ source: 'egg-glossed handshake', target: '沾着鸡蛋的握手' }),
    Object.freeze({ source: 'terrier with a rag', target: '叼着破布的梗犬' }),
    Object.freeze({ source: 'rafters', target: '房梁' }),
    Object.freeze({ source: 'Sorting Hat', target: '分院帽' }),
    Object.freeze({ source: 'Sorting Stool', target: '分院凳' }),
    Object.freeze({ source: 'the Sorting', target: '分院仪式' }),
    Object.freeze({ source: 'Great Hall', target: '礼堂' }),
    Object.freeze({ source: 'Entrance Hall', target: '门厅' }),
    Object.freeze({ source: 'Gryffindor common room', target: '格兰芬多公共休息室' }),
    Object.freeze({ source: 'common room', target: '公共休息室' }),
    Object.freeze({ source: 'girls\' staircase', target: '女生宿舍楼梯' }),
    Object.freeze({ source: 'portrait hole', target: '肖像洞口' }),
    Object.freeze({ source: 'staff table', target: '教师席' }),
    Object.freeze({ source: 'House Cup', target: '学院杯' }),
    Object.freeze({ source: 'Deputy Headmistress', target: '副校长' }),
    Object.freeze({ source: 'Headmaster', target: '校长' }),
    Object.freeze({ source: 'first-years', target: '一年级新生' }),
    Object.freeze({ source: 'first-year', target: '一年级新生' }),
    Object.freeze({ source: 'third-years', target: '三年级学生' }),
    Object.freeze({ source: 'third-year', target: '三年级学生' }),
    Object.freeze({ source: 'fifth-years', target: '五年级学生' }),
    Object.freeze({ source: 'fifth-year', target: '五年级学生' }),
    Object.freeze({ source: 'sixth-former', target: '六年级学生' }),
    Object.freeze({ source: 'prefects', target: '级长们' }),
    Object.freeze({ source: 'prefect', target: '级长' }),
    Object.freeze({ source: 'treacle tart', target: '糖浆馅饼' }),
    Object.freeze({ source: 'pumpkin juice', target: '南瓜汁' }),
    Object.freeze({ source: 'Carriage', target: '车厢' }),
    Object.freeze({ source: 'Compartment', target: '隔间' }),
    Object.freeze({ source: 'Hermione Jean Granger', target: '赫敏·简·格兰杰' }),
    Object.freeze({ source: 'Hermione Granger', target: '赫敏·格兰杰' }),
    Object.freeze({ source: 'Hermione', target: '赫敏' }),
    Object.freeze({ source: 'Lavender Brown', target: '拉文德·布朗' }),
    Object.freeze({ source: 'Lavender', target: '拉文德' }),
    Object.freeze({ source: 'Dean', target: '迪安' }),
    Object.freeze({ source: 'Professor Minerva McGonagall', target: '米勒娃·麦格教授' }),
    Object.freeze({ source: 'Professor McGonagall', target: '麦格教授' }),
    Object.freeze({ source: 'Minerva McGonagall', target: '米勒娃·麦格' }),
    Object.freeze({ source: 'Quill of Acceptance', target: '接纳之笔' }),
    Object.freeze({ source: 'Ministry of Magic', target: '魔法部' }),
    Object.freeze({ source: 'Scottish Highlands', target: '苏格兰高地' }),
    Object.freeze({ source: 'King’s Cross', target: '国王十字车站' }),
    Object.freeze({ source: 'King\'s Cross', target: '国王十字车站' }),
    Object.freeze({ source: 'Muggle-born', target: '麻瓜出身' }),
    Object.freeze({ source: 'first Charms lesson', target: '第一节魔咒课' }),
    Object.freeze({ source: 'first-year Gryffindors', target: '格兰芬多一年级新生' }),
    Object.freeze({ source: 'Transfiguration After Break', target: '课间休息后的变形术课' }),
    Object.freeze({ source: 'Charms classroom', target: '魔咒课教室' }),
    Object.freeze({ source: 'swish and flick', target: '一挥一抖' }),
    Object.freeze({ source: 'Charms', target: '魔咒课' }),
    Object.freeze({ source: 'Transfiguration', target: '变形术' }),
    Object.freeze({ source: 'McGonagall', target: '麦格' }),
    Object.freeze({ source: 'Tina Zhang', target: '蒂娜·张' }),
    Object.freeze({ source: 'Tina', target: '蒂娜' }),
    Object.freeze({ source: 'Alex Zhang', target: '亚历克斯·张' }),
    Object.freeze({ source: 'Hogwarts', target: '霍格沃茨' }),
    Object.freeze({ source: 'Muggles', target: '麻瓜' }),
    Object.freeze({ source: 'Muggle', target: '麻瓜' }),
    Object.freeze({ source: 'Galleons', target: '加隆' }),
    Object.freeze({ source: 'Galleon', target: '加隆' }),
]);

function normalizeTranslationGlossary(glossary) {
    const seen = new Set();
    return (Array.isArray(glossary) ? glossary : [])
        .map(entry => ({
            source: String(entry?.source || '').trim(),
            target: String(entry?.target || '').trim(),
        }))
        .filter(entry => entry.source && entry.target && !seen.has(entry.source.toLocaleLowerCase()) &&
            seen.add(entry.source.toLocaleLowerCase()))
        .sort((left, right) => right.source.length - left.source.length);
}

export function buildActorTranslationTerms(actors = []) {
    const terms = [];
    const seen = new Set();
    const addTerm = (source, target) => {
        const normalizedSource = String(source || '').trim();
        const normalizedTarget = String(target || '').trim();
        const key = normalizedSource.toLocaleLowerCase();
        if (
            !normalizedSource ||
            !normalizedTarget ||
            normalizedSource === normalizedTarget ||
            seen.has(key)
        ) {
            return;
        }
        seen.add(key);
        terms.push({
            source: normalizedSource,
            target: normalizedTarget,
        });
    };

    (Array.isArray(actors) ? actors : []).forEach(actor => {
        const nameEn = String(actor?.nameEn || '').trim();
        const name = String(
            actor?.name ||
            actor?.display?.name ||
            '',
        ).trim();
        addTerm(nameEn, name);

        const sourceParts =
            nameEn.split(/\s+/).filter(Boolean);
        const targetParts =
            name.split('·').filter(Boolean);
        if (
            sourceParts.length > 1 &&
            sourceParts.length ===
                targetParts.length
        ) {
            sourceParts.forEach(
                (sourcePart, index) =>
                    addTerm(
                        sourcePart,
                        targetParts[index],
                    ),
            );
        } else if (targetParts.length > 1) {
            addTerm(
                sourceParts[0],
                targetParts[0],
            );
            addTerm(
                sourceParts.at(-1),
                targetParts.at(-1),
            );
        }
    });

    return terms;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyTranslationGlossaryTargets(
    text,
    glossary = TRANSLATION_TERM_GLOSSARY,
) {
    let localizedText =
        String(text ?? '');
    normalizeTranslationGlossary(
        glossary,
    ).forEach(entry => {
        const pattern =
            new RegExp(
                `(?<![\\p{L}\\p{N}_])${escapeRegExp(entry.source)}(?![\\p{L}\\p{N}_])`,
                'giu',
            );
        localizedText =
            localizedText.replace(
                pattern,
                entry.target,
            );
    });
    return localizedText;
}

export function normalizeLocalTranslationText(
    source,
    translated,
) {
    const sourceText =
        String(source ?? '').trim();
    const translatedText =
        restoreTranslationTerms(
            translated,
            [],
        ).trim();
    if (
        sourceText.length <= 160 &&
        !sourceText.includes('\n') &&
        !/[()（）]/u.test(
            sourceText,
        )
    ) {
        return translatedText
            .replace(
                /\n+\s*[（(][^()（）\n]{1,160}[）)]\s*$/u,
                '',
            )
            .trim();
    }
    return translatedText;
}

export function protectTranslationTerms(text, glossary = TRANSLATION_TERM_GLOSSARY) {
    let protectedText = String(text ?? '');
    normalizeTranslationGlossary(glossary).forEach((entry, index) => {
        const pattern = new RegExp(
            `(?<![\\p{L}\\p{N}_])${escapeRegExp(entry.source)}(?![\\p{L}\\p{N}_])`,
            'giu',
        );
        protectedText = protectedText.replace(pattern, `[[HPMUD_TERM_${index}]]`);
    });
    return protectedText;
}

export function restoreTranslationTerms(text, glossary = TRANSLATION_TERM_GLOSSARY) {
    let restoredText = String(text ?? '');
    normalizeTranslationGlossary(glossary).forEach((entry, index) => {
        const marker = new RegExp(`\\[\\[\\s*HPMUD_TERM_${index}\\s*]]`, 'g');
        restoredText = restoredText.replace(marker, entry.target);
    });
    return restoredText
        .replace(
            /([\u3400-\u9FFF])[ \t\u00A0]+(?=[\u3400-\u9FFF])/g,
            '$1',
        )
        .replace(
            /([，。！？；：、”’）】》])[ \t\u00A0]+/g,
            '$1',
        )
        .replace(
            /[ \t\u00A0]+(?=[，。！？；：、”’）】》])/g,
            '',
        )
        .replace(
            /([“‘（【《])[ \t\u00A0]+/g,
            '$1',
        );
}

export function createTranslationBatches(
    values,
    maxLength = 4700,
    {
        maxRecords =
        Number
            .POSITIVE_INFINITY,
    } = {},
) {
    const safeMaxLength = Math.max(128, Number(maxLength) || 4700);
    const safeMaxRecords =
        Number.isFinite(
            maxRecords,
        )
            ? Math.max(
                1,
                Math.floor(
                    maxRecords,
                ),
            )
            : Number
                .POSITIVE_INFINITY;
    const records = [];
    (Array.isArray(values) ? values : []).forEach((value, valueIndex) => {
        const parts = splitTranslationChunks(
            String(value ?? ''),
            Math.max(64, safeMaxLength - 48),
        );
        (parts.length ? parts : ['']).forEach((part, partIndex) => {
            records.push(`[[HPMUD_${valueIndex}_${partIndex}]] ${part}`);
        });
    });

    const batches = [];
    let current = '';
    let currentRecords = 0;
    records.forEach(record => {
        const candidate = current ? `${current}\n\n${record}` : record;
        if (
            current &&
            (
                candidate.length >
                    safeMaxLength ||
                currentRecords >=
                    safeMaxRecords
            )
        ) {
            batches.push(current);
            current = record;
            currentRecords = 1;
        } else {
            current = candidate;
            currentRecords += 1;
        }
    });
    if (current) {
        batches.push(current);
    }
    return batches;
}

export function shouldTranslateToChinese(text) {
    const source = String(text ?? '').replace(/\s+/g, '');
    if (!source) {
        return false;
    }
    const latin = (source.match(/[A-Za-z]/g) || []).length;
    const cjk = (source.match(/[\u3400-\u9FFF]/g) || []).length;
    return latin >= 8 && latin > cjk;
}

export function assertImportSize(size, maxBytes = MAX_IMPORT_BYTES) {
    if (!Number.isFinite(size) || size < 0 || size > maxBytes) {
        throw new Error(`Import file exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
    }
}

export function detectPresetApi(data, fallback = 'openai') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return fallback;
    }

    if (Array.isArray(data.prompts) || Array.isArray(data.prompt_order) || data.openai_max_context !== undefined) {
        return 'openai';
    }

    if (data.instruct_sequence || data.system_sequence || data.input_sequence) {
        return 'instruct';
    }

    if (data.story_string || data.chat_start || data.example_separator) {
        return 'context';
    }

    return fallback;
}

export function sanitizePresetData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Preset must be a JSON object.');
    }

    const clean = structuredClone(data);
    const removed = [];

    const strip = (value, path = '') => {
        if (!value || typeof value !== 'object') {
            return;
        }
        for (const key of Object.keys(value)) {
            const keyPath = path ? `${path}.${key}` : key;
            if (SENSITIVE_PRESET_FIELDS.has(key)) {
                delete value[key];
                removed.push(keyPath);
            } else {
                strip(value[key], keyPath);
            }
        }
    };
    strip(clean);

    return { clean, removed };
}

export function normalizeRegexScripts(data, uuidFactory = () => crypto.randomUUID()) {
    const scripts = Array.isArray(data) ? data : [data];
    if (!scripts.length) {
        throw new Error('Regex file is empty.');
    }

    return scripts.map((script, index) => {
        if (!script || typeof script !== 'object' || Array.isArray(script)) {
            throw new Error(`Regex entry ${index + 1} must be an object.`);
        }
        if (typeof script.scriptName !== 'string' || !script.scriptName.trim()) {
            throw new Error(`Regex entry ${index + 1} has no scriptName.`);
        }
        if (typeof script.findRegex !== 'string') {
            throw new Error(`Regex entry ${index + 1} has no findRegex.`);
        }

        return {
            ...structuredClone(script),
            id: uuidFactory(),
            scriptName: script.scriptName.trim(),
            replaceString: String(script.replaceString ?? ''),
            disabled: Boolean(script.disabled),
        };
    });
}
