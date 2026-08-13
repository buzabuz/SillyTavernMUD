export const TIMELINE_CHRONICLE_VERSION = 1;

const CHRONICLE_KEYS = Object.freeze([
    'version',
    'entries',
]);
const ENTRY_KEYS = Object.freeze([
    'sceneId',
    'endedClock',
    'summaryEn',
]);

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function hasExactKeys(value, keys) {
    if (!isRecord(value)) {
        return false;
    }
    const actual = Object.keys(value);
    const allowed = new Set(keys);
    return actual.length === keys.length &&
        actual.every(key =>
            allowed.has(key));
}

function text(value, maximumLength) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function countWords(value) {
    return text(value, 10_000)
        .split(/\s+/u)
        .filter(Boolean)
        .length;
}

function compareClock(left, right) {
    return String(left).localeCompare(
        String(right),
        'en',
    );
}

export function normalizeChronicleEntry(
    value,
    {
        allowLegacySummaryLength = false,
    } = {},
) {
    if (!isRecord(value)) {
        return null;
    }
    const entry = {
        sceneId: text(value.sceneId, 160),
        endedClock:
            text(value.endedClock, 120),
        summaryEn:
            text(value.summaryEn, 640),
    };
    const words =
        countWords(entry.summaryEn);
    if (
        !entry.sceneId ||
        !entry.endedClock ||
        !entry.summaryEn ||
        (
            !allowLegacySummaryLength &&
            (
                words < 40 ||
                words > 80
            )
        )
    ) {
        return null;
    }
    return entry;
}

export function normalizeGlobalChronicle(
    value,
    options = {},
) {
    const source = isRecord(value)
        ? value
        : {};
    const entries = [];
    const seen = new Set();
    for (
        const candidate of Array.isArray(
            source.entries,
        )
            ? source.entries
            : []
    ) {
        const entry =
            normalizeChronicleEntry(
                candidate,
                options,
            );
        if (
            !entry ||
            seen.has(entry.sceneId)
        ) {
            continue;
        }
        seen.add(entry.sceneId);
        entries.push(entry);
    }
    return {
        version:
            TIMELINE_CHRONICLE_VERSION,
        entries,
    };
}

export function validateGlobalChronicle(
    value,
    options = {},
) {
    const normalized =
        normalizeGlobalChronicle(
            value,
            options,
        );
    const errors = [];
    if (
        !hasExactKeys(
            value,
            CHRONICLE_KEYS,
        ) ||
        value.version !==
            TIMELINE_CHRONICLE_VERSION ||
        !Array.isArray(value.entries)
    ) {
        errors.push(
            'Global Chronicle contract is invalid.',
        );
    }
    const seen = new Set();
    let previousClock = '';
    for (const entry of (
        Array.isArray(value?.entries)
            ? value.entries
            : []
    )) {
        const normalizedEntry =
            normalizeChronicleEntry(
                entry,
                options,
            );
        if (
            !normalizedEntry ||
            !hasExactKeys(
                entry,
                ENTRY_KEYS,
            )
        ) {
            errors.push(
                'Global Chronicle entry is invalid.',
            );
            continue;
        }
        if (
            seen.has(
                normalizedEntry.sceneId,
            )
        ) {
            errors.push(
                `Duplicate Chronicle Scene ${normalizedEntry.sceneId}.`,
            );
        }
        seen.add(normalizedEntry.sceneId);
        if (
            previousClock &&
            compareClock(
                normalizedEntry
                    .endedClock,
                previousClock,
            ) < 0
        ) {
            errors.push(
                'Global Chronicle clocks are out of order.',
            );
        }
        previousClock =
            normalizedEntry.endedClock;
    }
    return {
        valid: errors.length === 0,
        errors,
        value: normalized,
    };
}

export function appendGlobalChronicleEntry(
    chronicle,
    entry,
) {
    const current =
        validateGlobalChronicle(
            chronicle,
            {
                allowLegacySummaryLength:
                    true,
            },
        );
    if (!current.valid) {
        throw new TypeError(
            current.errors.join(' '),
        );
    }
    const normalizedEntry =
        normalizeChronicleEntry(entry);
    if (!normalizedEntry) {
        throw new TypeError(
            'Global Chronicle entry is invalid.',
        );
    }
    const existing =
        current.value.entries
            .find(candidate =>
                candidate.sceneId ===
                    normalizedEntry
                        .sceneId);
    if (existing) {
        if (
            JSON.stringify(existing) ===
            JSON.stringify(
                normalizedEntry,
            )
        ) {
            return structuredClone(
                current.value,
            );
        }
        throw new TypeError(
            `Conflicting Chronicle Scene ${normalizedEntry.sceneId}.`,
        );
    }
    const next = {
        version:
            TIMELINE_CHRONICLE_VERSION,
        entries: [
            ...current.value.entries,
            normalizedEntry,
        ],
    };
    const validation =
        validateGlobalChronicle(
            next,
            {
                allowLegacySummaryLength:
                    true,
            },
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.errors.join(' '),
        );
    }
    return next;
}

export function createDefaultGlobalChronicle() {
    return {
        version:
            TIMELINE_CHRONICLE_VERSION,
        entries: [],
    };
}
