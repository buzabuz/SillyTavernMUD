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
