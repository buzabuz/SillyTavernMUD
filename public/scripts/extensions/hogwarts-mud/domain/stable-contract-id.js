const STABLE_ID_PATTERN =
    /^[a-z][a-z0-9_]{0,79}$/;

function stableCompare(left, right) {
    const a = String(left);
    const b = String(right);
    return a < b
        ? -1
        : a > b
            ? 1
            : 0;
}

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }
    if (
        value &&
        typeof value === 'object'
    ) {
        return Object.fromEntries(
            Object.keys(value)
                .sort(stableCompare)
                .map(key => [
                    key,
                    canonicalize(value[key]),
                ]),
        );
    }
    return value ?? null;
}

function stableHash(value) {
    const source =
        JSON.stringify(
            canonicalize(value),
        );
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (
        let index = 0;
        index < source.length;
        index++
    ) {
        const code =
            source.charCodeAt(index);
        first = Math.imul(
            first ^ code,
            0x01000193,
        );
        second = Math.imul(
            second ^ code,
            0x85ebca6b,
        );
    }
    return [
        first >>> 0,
        second >>> 0,
    ].map(part =>
        part.toString(16)
            .padStart(8, '0'))
        .join('');
}

function slugify(value) {
    return String(value || '')
        .trim()
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9]+/gu, '_')
        .replace(/^_+|_+$/gu, '')
        .slice(0, 36);
}

export function normalizeStableContractId(
    value,
) {
    const id =
        String(value || '').trim();
    return STABLE_ID_PATTERN
        .test(id)
        ? id
        : '';
}

export function createStableContractId(
    prefix,
    identity,
) {
    const normalizedPrefix =
        slugify(prefix) ||
        'record';
    const hint = slugify(
        typeof identity === 'object'
            ? identity?.labelEn ||
                identity?.sceneId ||
                identity?.mapId
            : identity,
    );
    return [
        normalizedPrefix,
        hint,
        stableHash(identity),
    ].filter(Boolean)
        .join('_')
        .slice(0, 80);
}

export function createEventKnowledgeId(
    {
        sceneId,
        sourceMessageIds,
    } = {},
) {
    return createStableContractId(
        'event',
        {
            sceneId:
                normalizeStableContractId(
                    sceneId,
                ),
            sourceMessageIds: [
                ...new Set(
                    (
                        sourceMessageIds ||
                        []
                    )
                        .map(Number)
                        .filter(
                            Number
                                .isSafeInteger,
                        ),
                ),
            ].sort((left, right) =>
                left - right),
        },
    );
}
