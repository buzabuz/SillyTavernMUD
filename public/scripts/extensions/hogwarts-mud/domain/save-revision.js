export const SAVE_REVISION_VERSION = 1;
export const MAX_REVISION_HISTORY = 48;
export const MAX_ITEM_CHANGES = 64;
export const MAX_IDENTITY_CHANGES = 128;

const MAX_IDENTITY_SCAN = 512;
const REVISION_FIELDS = new Set([
    'saveRevisionVersion',
    'timelineEpoch',
    'stateRevision',
    'revisionHistory',
]);
const IDENTITY_ROOT_FIELDS = new Set([
    'version',
    'gender',
    'birth',
    'education',
    'lineage',
    'body',
    'provenance',
]);
const SENSITIVE_FIELD_PATTERN =
    /(?:secret|private|credential|token|api[_-]?key|prompt)/iu;

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function compactText(value, maximumLength = 160) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim()
        .slice(0, maximumLength);
}

function normalizeRevision(value) {
    const revision = Number(value);
    return Number.isSafeInteger(revision) && revision >= 0
        ? revision
        : 0;
}

function canonicalize(value, seen = new WeakSet()) {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean'
    ) {
        return value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value)
            ? value
            : null;
    }
    if (Array.isArray(value)) {
        return value.map(item =>
            canonicalize(item, seen));
    }
    if (!isRecord(value)) {
        return null;
    }
    if (seen.has(value)) {
        throw new TypeError(
            'Save revision state must be JSON-compatible.',
        );
    }
    seen.add(value);
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
        const entry = value[key];
        if (
            entry === undefined ||
            typeof entry === 'function'
        ) {
            continue;
        }
        normalized[key] =
            canonicalize(entry, seen);
    }
    seen.delete(value);
    return normalized;
}

function stableStringify(value) {
    return JSON.stringify(
        canonicalize(value),
    );
}

function withoutRevisionFields(state) {
    if (!isRecord(state)) {
        return state;
    }
    return Object.fromEntries(
        Object.entries(state)
            .filter(([key]) =>
                !REVISION_FIELDS.has(key)),
    );
}

function hashText(value, seed) {
    let hash = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
        hash ^= hash >>> 13;
    }
    return (hash >>> 0)
        .toString(16)
        .padStart(8, '0');
}

function sanitizeBoundedValue(value, depth = 0) {
    if (value === null) {
        return null;
    }
    if (typeof value === 'string') {
        return value.slice(0, 500);
    }
    if (
        typeof value === 'boolean' ||
        (
            typeof value === 'number' &&
            Number.isFinite(value)
        )
    ) {
        return value;
    }
    if (depth >= 6) {
        return null;
    }
    if (Array.isArray(value)) {
        return value
            .slice(0, 24)
            .map(entry =>
                sanitizeBoundedValue(
                    entry,
                    depth + 1,
                ));
    }
    if (!isRecord(value)) {
        return null;
    }
    return Object.fromEntries(
        Object.keys(value)
            .sort()
            .filter(key =>
                !SENSITIVE_FIELD_PATTERN
                    .test(key))
            .slice(0, 32)
            .map(key => [
                key,
                sanitizeBoundedValue(
                    value[key],
                    depth + 1,
                ),
            ]),
    );
}

function normalizeItemChange(change) {
    return {
        itemId:
            compactText(
                change?.itemId,
                120,
            ),
        before:
            sanitizeBoundedValue(
                change?.before,
            ),
        after:
            sanitizeBoundedValue(
                change?.after,
            ),
    };
}

function normalizeIdentityChange(change) {
    return {
        actorId:
            compactText(
                change?.actorId,
                120,
            ),
        fieldPath:
            compactText(
                change?.fieldPath,
                240,
            ),
        before:
            sanitizeBoundedValue(
                change?.before,
            ),
        after:
            sanitizeBoundedValue(
                change?.after,
            ),
    };
}

function normalizeHistoryEntry(entry) {
    const baseRevision =
        normalizeRevision(
            entry?.baseRevision,
        );
    const revision =
        Math.max(
            baseRevision,
            normalizeRevision(
                entry?.revision,
            ),
        );
    return {
        id:
            compactText(
                entry?.id,
                180,
            ),
        baseRevision,
        revision,
        source:
            compactText(
                entry?.source,
                120,
            ),
        committedAt:
            compactText(
                entry?.committedAt,
                80,
            ),
        changedDomains: [
            ...new Set(
                (
                    Array.isArray(
                        entry?.changedDomains,
                    )
                        ? entry.changedDomains
                        : []
                )
                    .map(value =>
                        compactText(
                            value,
                            80,
                        ))
                    .filter(Boolean),
            ),
        ].sort(),
        itemChanges:
            (
                Array.isArray(
                    entry?.itemChanges,
                )
                    ? entry.itemChanges
                    : []
            )
                .map(normalizeItemChange)
                .filter(change =>
                    Boolean(change.itemId))
                .slice(
                    0,
                    MAX_ITEM_CHANGES,
                ),
        identityChanges:
            (
                Array.isArray(
                    entry?.identityChanges,
                )
                    ? entry.identityChanges
                    : []
            )
                .map(
                    normalizeIdentityChange,
                )
                .filter(change =>
                    Boolean(
                        change.actorId &&
                        change.fieldPath,
                    ))
                .slice(
                    0,
                    MAX_IDENTITY_CHANGES,
                ),
    };
}

function normalizeRevisionHistory(history) {
    return (
        Array.isArray(history)
            ? history
            : []
    )
        .map(normalizeHistoryEntry)
        .slice(-MAX_REVISION_HISTORY);
}

export function deriveLegacyTimelineEpoch(
    worldState,
    {
        timelineKey = '',
    } = {},
) {
    const source =
        stableStringify({
            timelineKey:
                compactText(
                    timelineKey,
                    300,
                ),
            state:
                withoutRevisionFields(
                    worldState,
                ),
        });
    return `legacy_${hashText(
        source,
        2166136261,
    )}${hashText(
        source,
        2246822519,
    )}`;
}

function defaultEpochFactory() {
    const crypto =
        globalThis.crypto;
    if (
        typeof crypto?.randomUUID ===
        'function'
    ) {
        return `timeline_${
            crypto.randomUUID()
        }`;
    }
    if (
        typeof crypto?.getRandomValues ===
        'function'
    ) {
        const bytes =
            crypto.getRandomValues(
                new Uint8Array(16),
            );
        return `timeline_${
            [...bytes]
                .map(value =>
                    value
                        .toString(16)
                        .padStart(2, '0'))
                .join('')
        }`;
    }
    throw new Error(
        'Secure randomness is required to create a timeline epoch.',
    );
}

export function createNewSaveRevisionState(
    {
        epochFactory = defaultEpochFactory,
    } = {},
) {
    const timelineEpoch =
        compactText(
            epochFactory(),
            160,
        );
    if (!timelineEpoch) {
        throw new TypeError(
            'Timeline epoch factory returned an empty value.',
        );
    }
    return {
        saveRevisionVersion:
            SAVE_REVISION_VERSION,
        timelineEpoch,
        stateRevision: 0,
        revisionHistory: [],
    };
}

export function migrateSaveRevisionState(
    worldState,
    {
        timelineKey = '',
    } = {},
) {
    if (!isRecord(worldState)) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    const before =
        JSON.stringify({
            saveRevisionVersion:
                next.saveRevisionVersion,
            timelineEpoch:
                next.timelineEpoch,
            stateRevision:
                next.stateRevision,
            revisionHistory:
                next.revisionHistory,
        });
    next.saveRevisionVersion =
        SAVE_REVISION_VERSION;
    next.timelineEpoch =
        compactText(
            next.timelineEpoch,
            160,
        ) ||
        deriveLegacyTimelineEpoch(
            next,
            {
                timelineKey,
            },
        );
    next.stateRevision =
        normalizeRevision(
            next.stateRevision,
        );
    next.revisionHistory =
        normalizeRevisionHistory(
            next.revisionHistory,
        );
    const after =
        JSON.stringify({
            saveRevisionVersion:
                next.saveRevisionVersion,
            timelineEpoch:
                next.timelineEpoch,
            stateRevision:
                next.stateRevision,
            revisionHistory:
                next.revisionHistory,
        });
    return {
        state: next,
        changed:
            before !== after,
    };
}

function itemSnapshot(item) {
    return {
        ownerId:
            compactText(
                item?.ownerId,
                120,
            ),
        holderId:
            compactText(
                item?.holderId,
                120,
            ),
        location: {
            mapId:
                compactText(
                    item?.location
                        ?.mapId,
                    160,
                ),
            roomId:
                compactText(
                    item?.location
                        ?.roomId,
                    160,
                ),
            placement:
                compactText(
                    item?.location
                        ?.placement,
                    160,
                ),
        },
        state:
            compactText(
                item?.state,
                80,
            ),
    };
}

function itemMap(state) {
    const items = new Map();
    for (const item of state?.items || []) {
        const id =
            compactText(
                item?.id,
                120,
            );
        if (id) {
            items.set(
                id,
                itemSnapshot(item),
            );
        }
    }
    return items;
}

function collectItemChanges(
    beforeState,
    afterState,
) {
    const beforeItems =
        itemMap(beforeState);
    const afterItems =
        itemMap(afterState);
    const itemIds = [
        ...new Set([
            ...beforeItems.keys(),
            ...afterItems.keys(),
        ]),
    ].sort();
    const changes = [];
    for (const itemId of itemIds) {
        const before =
            beforeItems.get(itemId) ??
            null;
        const after =
            afterItems.get(itemId) ??
            null;
        if (
            stableStringify(before) ===
            stableStringify(after)
        ) {
            continue;
        }
        changes.push({
            itemId,
            before,
            after,
        });
        if (
            changes.length >=
            MAX_ITEM_CHANGES
        ) {
            break;
        }
    }
    return changes;
}

function collectIdentityLeaves(
    value,
    path,
    leaves,
    depth = 0,
) {
    if (
        leaves.size >=
        MAX_IDENTITY_SCAN
    ) {
        return;
    }
    if (
        value === null ||
        typeof value !== 'object'
    ) {
        leaves.set(
            path,
            sanitizeBoundedValue(value),
        );
        return;
    }
    if (depth >= 8) {
        return;
    }
    if (Array.isArray(value)) {
        value
            .slice(0, 32)
            .forEach((entry, index) => {
                collectIdentityLeaves(
                    entry,
                    `${path}[${index}]`,
                    leaves,
                    depth + 1,
                );
            });
        return;
    }
    for (const key of Object.keys(value).sort()) {
        if (
            SENSITIVE_FIELD_PATTERN
                .test(key)
        ) {
            continue;
        }
        collectIdentityLeaves(
            value[key],
            path
                ? `${path}.${key}`
                : key,
            leaves,
            depth + 1,
        );
    }
}

function identityMap(state) {
    const identities =
        new Map();
    for (
        const actor of
        state?.actorLibrary || []
    ) {
        const actorId =
            compactText(
                actor?.id,
                120,
            );
        if (
            !actorId ||
            !isRecord(actor?.identity)
        ) {
            continue;
        }
        const leaves = new Map();
        for (
            const key of
            Object.keys(
                actor.identity,
            ).sort()
        ) {
            if (
                !IDENTITY_ROOT_FIELDS
                    .has(key)
            ) {
                continue;
            }
            collectIdentityLeaves(
                actor.identity[key],
                key,
                leaves,
            );
        }
        identities.set(
            actorId,
            leaves,
        );
    }
    return identities;
}

function collectIdentityChanges(
    beforeState,
    afterState,
) {
    const beforeIdentities =
        identityMap(beforeState);
    const afterIdentities =
        identityMap(afterState);
    const actorIds = [
        ...new Set([
            ...beforeIdentities.keys(),
            ...afterIdentities.keys(),
        ]),
    ].sort();
    const changes = [];
    for (const actorId of actorIds) {
        const before =
            beforeIdentities
                .get(actorId) ||
            new Map();
        const after =
            afterIdentities
                .get(actorId) ||
            new Map();
        const paths = [
            ...new Set([
                ...before.keys(),
                ...after.keys(),
            ]),
        ].sort();
        for (const fieldPath of paths) {
            const beforeValue =
                before.has(fieldPath)
                    ? before.get(
                        fieldPath,
                    )
                    : null;
            const afterValue =
                after.has(fieldPath)
                    ? after.get(
                        fieldPath,
                    )
                    : null;
            if (
                stableStringify(
                    beforeValue,
                ) ===
                stableStringify(
                    afterValue,
                )
            ) {
                continue;
            }
            changes.push({
                actorId,
                fieldPath,
                before:
                    beforeValue,
                after:
                    afterValue,
            });
            if (
                changes.length >=
                MAX_IDENTITY_CHANGES
            ) {
                return changes;
            }
        }
    }
    return changes;
}

export function buildSaveRevisionDiff(
    beforeState,
    afterState,
) {
    return {
        itemChanges:
            collectItemChanges(
                beforeState,
                afterState,
            ),
        identityChanges:
            collectIdentityChanges(
                beforeState,
                afterState,
            ),
    };
}

export function hasWorldStateChanges(
    beforeState,
    afterState,
) {
    return stableStringify(
        withoutRevisionFields(
            beforeState,
        ),
    ) !== stableStringify(
        withoutRevisionFields(
            afterState,
        ),
    );
}

export function isStateRevisionCurrentOrModelTaskRuntimeOnly(
    worldState,
    expectedRevision,
) {
    const expected =
        normalizeRevision(
            expectedRevision,
        );
    const current =
        normalizeRevision(
            worldState
                ?.stateRevision,
        );
    if (current === expected) {
        return true;
    }
    if (current < expected) {
        return false;
    }
    const entries =
        (
            Array.isArray(
                worldState
                    ?.revisionHistory,
            )
                ? worldState
                    .revisionHistory
                : []
        )
            .filter(entry =>
                Number(
                    entry?.revision,
                ) > expected &&
                Number(
                    entry?.revision,
                ) <= current)
            .sort((
                left,
                right,
            ) =>
                Number(
                    left.revision,
                ) -
                Number(
                    right.revision,
                ));
    if (
        entries.length !==
            current - expected
    ) {
        return false;
    }
    let previous = expected;
    for (const entry of entries) {
        const domains =
            Array.isArray(
                entry
                    ?.changedDomains,
            )
                ? entry
                    .changedDomains
                : [];
        if (
            Number(
                entry
                    ?.baseRevision,
            ) !== previous ||
            Number(
                entry?.revision,
            ) !== previous + 1 ||
            entry?.source !==
                'model_task_runtime' ||
            domains.length !== 1 ||
            domains[0] !==
                'model_task_runtime'
        ) {
            return false;
        }
        previous =
            Number(
                entry.revision,
            );
    }
    return previous === current;
}

function withoutTrackedDomains(state) {
    const source =
        withoutRevisionFields(state);
    if (!isRecord(source)) {
        return source;
    }
    const result = {
        ...source,
    };
    delete result.items;
    delete result.modelTaskRuntime;
    result.actorLibrary =
        (
            result.actorLibrary || []
        ).map(actor => {
            if (!isRecord(actor)) {
                return actor;
            }
            const copy = {
                ...actor,
            };
            delete copy.identity;
            return copy;
        });
    return result;
}

function detectChangedDomains(
    beforeState,
    afterState,
    itemChanges,
    identityChanges,
    explicitDomains,
) {
    const domains =
        new Set(
            (
                Array.isArray(
                    explicitDomains,
                )
                    ? explicitDomains
                    : []
            )
                .map(value =>
                    compactText(
                        value,
                        80,
                    ))
                .filter(Boolean),
        );
    if (
        stableStringify(
            beforeState?.items || [],
        ) !==
        stableStringify(
            afterState?.items || [],
        )
    ) {
        domains.add('item');
    }
    if (
        itemChanges.length > 0
    ) {
        domains.add('item');
    }
    if (
        identityChanges.length > 0
    ) {
        domains.add('identity');
    }
    if (
        stableStringify(
            withoutTrackedDomains(
                beforeState,
            ),
        ) !==
        stableStringify(
            withoutTrackedDomains(
                afterState,
            ),
        )
    ) {
        domains.add('world');
    }
    return [...domains].sort();
}

export function getSaveRevisionHead(
    worldState,
) {
    const migrated =
        migrateSaveRevisionState(
            worldState,
        ).state;
    if (!isRecord(migrated)) {
        return null;
    }
    return {
        saveRevisionVersion:
            SAVE_REVISION_VERSION,
        timelineEpoch:
            migrated.timelineEpoch,
        stateRevision:
            migrated.stateRevision,
    };
}

export function prepareSaveRevisionCommit(
    {
        currentState,
        nextState = currentState,
        source = 'unknown',
        committedAt = new Date().toISOString(),
        entryId = '',
        changedDomains = [],
        timelineKey = '',
        forceCommit = false,
    },
) {
    const current =
        migrateSaveRevisionState(
            currentState,
            {
                timelineKey,
            },
        ).state;
    if (!isRecord(current)) {
        throw new TypeError(
            'Current world state is required.',
        );
    }
    const candidateInput =
        structuredClone(
            nextState ?? current,
        );
    if (!isRecord(candidateInput)) {
        throw new TypeError(
            'Next world state is required.',
        );
    }
    candidateInput.timelineEpoch ||=
        current.timelineEpoch;
    const candidate =
        migrateSaveRevisionState(
            candidateInput,
            {
                timelineKey,
            },
        ).state;
    if (
        candidate.timelineEpoch !==
        current.timelineEpoch
    ) {
        throw new Error(
            'Cannot commit state from a different timeline epoch.',
        );
    }
    const changed =
        forceCommit ||
        hasWorldStateChanges(
            current,
            candidate,
        );
    candidate.saveRevisionVersion =
        SAVE_REVISION_VERSION;
    candidate.timelineEpoch =
        current.timelineEpoch;
    candidate.stateRevision =
        current.stateRevision;
    candidate.revisionHistory =
        current.revisionHistory;
    if (!changed) {
        return {
            state: candidate,
            changed: false,
            entry: null,
        };
    }
    if (
        current.stateRevision >=
        Number.MAX_SAFE_INTEGER
    ) {
        throw new RangeError(
            'State revision exhausted the safe integer range.',
        );
    }
    const revision =
        current.stateRevision + 1;
    const {
        itemChanges,
        identityChanges,
    } = buildSaveRevisionDiff(
        current,
        candidate,
    );
    const entry =
        normalizeHistoryEntry({
            id:
                entryId ||
                `revision_${
                    current.timelineEpoch
                }_${revision}`,
            baseRevision:
                current.stateRevision,
            revision,
            source,
            committedAt,
            changedDomains:
                detectChangedDomains(
                    current,
                    candidate,
                    itemChanges,
                    identityChanges,
                    changedDomains,
                ),
            itemChanges,
            identityChanges,
        });
    candidate.stateRevision =
        revision;
    candidate.revisionHistory = [
        ...current.revisionHistory,
        entry,
    ].slice(-MAX_REVISION_HISTORY);
    return {
        state: candidate,
        changed: true,
        entry,
    };
}
