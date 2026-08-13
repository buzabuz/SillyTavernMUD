export const KNOWLEDGE_PROJECTOR_VERSION = 2;
export const KNOWLEDGE_NODE_TYPES = Object.freeze([
    'fact',
    'appraisal',
    'schema',
    'actor',
    'scene',
    'clue',
]);
export const KNOWLEDGE_CATEGORIES = Object.freeze([
    'actors',
    'scenes',
    'events',
    'clues',
    'appraisals',
    'schemas',
    'social_evidence',
]);

const VISIBILITY_SCOPES = new Set([
    'public',
    'actor',
    'witnesses',
    'locked',
]);
const NODE_TYPE_SET = new Set(
    KNOWLEDGE_NODE_TYPES,
);
const CATEGORY_SET = new Set(
    KNOWLEDGE_CATEGORIES,
);

function uniqueSorted(values) {
    return [
        ...new Set(
            (values || [])
                .map(value =>
                    String(value || '')
                        .trim())
                .filter(Boolean),
        ),
    ].sort((left, right) =>
        left.localeCompare(right));
}

export function normalizeKnowledgeId(
    value,
    fallback = 'unknown',
) {
    const normalized =
        String(value || '')
            .normalize('NFKD')
            .replace(
                /[^\w.-]+/g,
                '_',
            )
            .replace(
                /^[_\-.]+|[_\-.]+$/g,
                '',
            )
            .slice(0, 160);
    return normalized || fallback;
}

export function canonicalizeKnowledgeValue(
    value,
    seen = new WeakSet(),
) {
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
            canonicalizeKnowledgeValue(
                item,
                seen,
            ));
    }
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return null;
    }
    if (seen.has(value)) {
        throw new TypeError(
            'Knowledge records must be JSON-compatible.',
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
            canonicalizeKnowledgeValue(
                entry,
                seen,
            );
    }
    seen.delete(value);
    return normalized;
}

export function stableKnowledgeStringify(value) {
    return JSON.stringify(
        canonicalizeKnowledgeValue(value),
    );
}

export function computeKnowledgeChecksum(value) {
    const text =
        typeof value === 'string'
            ? value
            : stableKnowledgeStringify(value);
    let first = 0xdeadbeef;
    let second = 0x41c6ce57;
    for (
        let index = 0;
        index < text.length;
        index++
    ) {
        const code = text.charCodeAt(index);
        first = Math.imul(
            first ^ code,
            2654435761,
        );
        second = Math.imul(
            second ^ code,
            1597334677,
        );
    }
    first =
        Math.imul(
            first ^ (first >>> 16),
            2246822507,
        ) ^
        Math.imul(
            second ^ (second >>> 13),
            3266489909,
        );
    second =
        Math.imul(
            second ^ (second >>> 16),
            2246822507,
        ) ^
        Math.imul(
            first ^ (first >>> 13),
            3266489909,
        );
    const high =
        (2097151 & second)
            .toString(16)
            .padStart(6, '0');
    const low =
        (first >>> 0)
            .toString(16)
            .padStart(8, '0');
    return `cyrb53-${high}${low}`;
}

export function normalizeKnowledgeSourceRefs(
    sourceRefs,
) {
    const normalized =
        (Array.isArray(sourceRefs)
            ? sourceRefs
            : [])
            .map(sourceRef => {
                if (
                    typeof sourceRef ===
                    'string'
                ) {
                    return {
                        type: 'state',
                        id: normalizeKnowledgeId(
                            sourceRef,
                        ),
                    };
                }
                if (
                    !sourceRef ||
                    typeof sourceRef !==
                        'object'
                ) {
                    return null;
                }
                const id =
                    normalizeKnowledgeId(
                        sourceRef.id ??
                        sourceRef.messageId ??
                        sourceRef.eventId ??
                        sourceRef.sceneId,
                        '',
                    );
                if (!id) return null;
                return {
                    type:
                        normalizeKnowledgeId(
                            sourceRef.type ||
                            'state',
                        ),
                    id,
                    ...(sourceRef.revision !==
                    undefined
                        ? {
                            revision:
                                Math.max(
                                    0,
                                    Number(
                                        sourceRef
                                            .revision,
                                    ) ||
                                    0,
                                ),
                        }
                        : {}),
                };
            })
            .filter(Boolean);
    const byKey = new Map();
    for (const sourceRef of normalized) {
        byKey.set(
            `${sourceRef.type}:${sourceRef.id}`,
            sourceRef,
        );
    }
    return [...byKey.values()]
        .sort((left, right) =>
            `${left.type}:${left.id}`
                .localeCompare(
                    `${right.type}:${right.id}`,
                ));
}

export function normalizeKnowledgeVisibility(
    visibility,
) {
    const requestedScope =
        String(visibility?.scope || '');
    const isValid =
        VISIBILITY_SCOPES
            .has(requestedScope);
    return {
        scope:
            isValid
                ? requestedScope
                : 'locked',
        actorIds:
            isValid
                ? uniqueSorted(
                    visibility?.actorIds,
                ).map(actorId =>
                    normalizeKnowledgeId(
                        actorId,
                    ))
                : [],
    };
}

function normalizeRevision(value) {
    const revision = Number(value);
    return Number.isSafeInteger(revision) &&
        revision >= 0
        ? revision
        : 0;
}

function checksumInput(record) {
    return {
        version: 2,
        recordId: record.recordId,
        nodeType: record.nodeType,
        title: record.title,
        text: record.text,
        entityIds: record.entityIds,
        tags: record.tags,
        timelineEpoch:
            record.timelineEpoch,
        projectorVersion: 2,
        sourceRefs: record.sourceRefs,
        visibility: record.visibility,
        effectiveClock:
            record.effectiveClock,
        sceneId: record.sceneId,
        data: record.data,
    };
}

export function createKnowledgeRecordV2(
    input,
) {
    const category =
        String(input?.category || '');
    if (!CATEGORY_SET.has(category)) {
        throw new TypeError(
            `Invalid knowledge category: ${category}`,
        );
    }
    const nodeType =
        String(input?.nodeType || '');
    if (!NODE_TYPE_SET.has(nodeType)) {
        throw new TypeError(
            `Invalid knowledge nodeType: ${nodeType}`,
        );
    }
    const recordId =
        normalizeKnowledgeId(
            input.recordId ||
            input.id,
        );
    const text =
        String(input.text || '')
            .replace(/\r\n?/g, '\n')
            .trim();
    if (!text) {
        throw new TypeError(
            `Knowledge record ${recordId} has no retrieval text.`,
        );
    }
    const record = {
        version: 2,
        recordId,
        nodeType,
        text,
        entityIds:
            uniqueSorted(
                input.entityIds,
            ).map(entityId =>
                normalizeKnowledgeId(
                    entityId,
                )),
        tags:
            uniqueSorted(
                input.tags,
            ).map(tag =>
                normalizeKnowledgeId(
                    tag,
                )),
        timelineEpoch:
            String(
                input.timelineEpoch ||
                'legacy_epoch',
            ).trim(),
        stateRevision:
            normalizeRevision(
                input.stateRevision,
            ),
        projectorVersion: 2,
        sourceRefs:
            normalizeKnowledgeSourceRefs(
                input.sourceRefs,
            ),
        visibility:
            normalizeKnowledgeVisibility(
                input.visibility,
            ),
        effectiveClock:
            String(
                input.effectiveClock ||
                '',
            ).trim(),
        sceneId:
            normalizeKnowledgeId(
                input.sceneId,
                '',
            ),
        contentChecksum: '',
        category,
        id: recordId,
        title:
            String(
                input.title ||
                recordId,
            )
                .trim()
                .slice(0, 300),
        data:
            canonicalizeKnowledgeValue(
                input.data &&
                typeof input.data ===
                    'object'
                    ? input.data
                    : {},
            ),
    };
    record.contentChecksum =
        computeKnowledgeChecksum(
            checksumInput(record),
        );
    return record;
}

export function chunkKnowledgeText(
    value,
    {
        maxCharacters = 6_000,
        overlapCharacters = 400,
    } = {},
) {
    const text =
        String(value || '')
            .replace(/\r\n?/g, '\n')
            .trim();
    if (!text) return [];
    const maximum =
        Math.max(
            1_000,
            Number(maxCharacters) ||
            6_000,
        );
    const overlap =
        Math.min(
            Math.floor(maximum / 4),
            Math.max(
                0,
                Number(overlapCharacters) ||
                0,
            ),
        );
    if (text.length <= maximum) {
        return [text];
    }
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const targetEnd =
            Math.min(
                text.length,
                start + maximum,
            );
        let end = targetEnd;
        if (targetEnd < text.length) {
            const minimumBreak =
                start +
                Math.floor(maximum * 0.6);
            const candidates = [
                text.lastIndexOf(
                    '\n\n',
                    targetEnd,
                ),
                text.lastIndexOf(
                    '\n',
                    targetEnd,
                ),
                text.lastIndexOf(
                    ' ',
                    targetEnd,
                ),
            ];
            end =
                candidates.find(candidate =>
                    candidate >=
                    minimumBreak) ||
                targetEnd;
        }
        chunks.push(
            text.slice(start, end).trim(),
        );
        if (end >= text.length) break;
        const nextStart =
            Math.max(
                start + 1,
                end - overlap,
            );
        start = nextStart;
    }
    return chunks.filter(Boolean);
}

export function createChunkedKnowledgeRecords(
    input,
    options,
) {
    const chunks =
        chunkKnowledgeText(
            input.text,
            options,
        );
    if (chunks.length <= 1) {
        return [
            createKnowledgeRecordV2(
                input,
            ),
        ];
    }
    return chunks.map((text, index) => {
        const chunkNumber =
            String(index + 1)
                .padStart(4, '0');
        return createKnowledgeRecordV2({
            ...input,
            recordId:
                `${
                    input.recordId ||
                    input.id
                }_chunk_${chunkNumber}`,
            title:
                `${input.title || input.recordId} [${index + 1}/${chunks.length}]`,
            text,
            tags: [
                ...(input.tags || []),
                'chunk',
            ],
            data: {
                ...(input.data || {}),
                chunk: {
                    index,
                    count: chunks.length,
                },
            },
        });
    });
}

export function knowledgeClockOrdinal(
    value,
) {
    const parts =
        String(value || '')
            .match(/\d+/g) ||
        [];
    if (!parts.length) return null;
    const [
        year = '0',
        month = '0',
        day = '0',
        hour = '0',
        minute = '0',
    ] = parts;
    const ordinal =
        Number(year) * 100000000 +
        Number(month) * 1000000 +
        Number(day) * 10000 +
        Number(hour) * 100 +
        Number(minute);
    return Number.isSafeInteger(ordinal)
        ? ordinal
        : null;
}

export function isKnowledgeRecordVisible(
    record,
    audience = {},
) {
    const visibility =
        normalizeKnowledgeVisibility(
            record?.visibility,
        );
    if (
        visibility.scope ===
        'public'
    ) {
        return true;
    }
    const audienceActorIds =
        new Set(
            uniqueSorted(
                audience.actorIds,
            ).map(actorId =>
                normalizeKnowledgeId(
                    actorId,
                )),
        );
    const authorized =
        visibility.actorIds.some(actorId =>
            audienceActorIds.has(actorId));
    if (
        visibility.scope ===
        'locked'
    ) {
        return Boolean(
            audience.includeLocked &&
            (
                authorized ||
                audience.role === 'author'
            ),
        );
    }
    return authorized;
}

function sourceRefKey(sourceRef) {
    return `${sourceRef.type}:${sourceRef.id}`;
}

export function hydrateKnowledgeRecords(
    records,
    {
        timelineEpoch = '',
        stateRevision,
        audience = {},
        clock = '',
        nodeTypes = [],
        categories = [],
        supersededSourceRefs = [],
        includeSuperseded = false,
    } = {},
) {
    const requestedRevision =
        stateRevision === undefined
            ? null
            : normalizeRevision(
                stateRevision,
            );
    const requestedTypes =
        new Set(
            (nodeTypes || [])
                .filter(nodeType =>
                    NODE_TYPE_SET
                        .has(nodeType)),
        );
    const requestedCategories =
        new Set(
            (categories || [])
                .filter(category =>
                    CATEGORY_SET
                        .has(category)),
        );
    const clockOrdinal =
        knowledgeClockOrdinal(clock);
    const superseded =
        new Set(
            normalizeKnowledgeSourceRefs(
                supersededSourceRefs,
            ).map(sourceRefKey),
        );
    const selected = [];
    const suppressed = [];
    for (const record of records || []) {
        let reason = '';
        if (
            Number(record?.version) !== 2 ||
            Number(
                record?.projectorVersion,
            ) !== 2
        ) {
            reason = 'invalid_version';
        } else if (
            timelineEpoch &&
            record.timelineEpoch !==
                timelineEpoch
        ) {
            reason =
                'timeline_mismatch';
        } else if (
            requestedRevision !== null &&
            record.stateRevision !==
                requestedRevision
        ) {
            reason =
                'stale_revision';
        } else if (
            requestedCategories.size &&
            !requestedCategories
                .has(record.category)
        ) {
            reason =
                'category';
        } else if (
            requestedTypes.size &&
            !requestedTypes
                .has(record.nodeType)
        ) {
            reason =
                'node_type';
        } else if (
            !isKnowledgeRecordVisible(
                record,
                audience,
            )
        ) {
            reason = 'audience';
        } else if (
            !includeSuperseded &&
            record.tags?.includes(
                'superseded',
            )
        ) {
            reason = 'superseded';
        } else if (
            !includeSuperseded &&
            record.sourceRefs?.some(
                sourceRef =>
                    superseded.has(
                        sourceRefKey(
                            sourceRef,
                        ),
                    ),
            )
        ) {
            reason =
                'source_superseded';
        } else {
            const effectiveOrdinal =
                knowledgeClockOrdinal(
                    record.effectiveClock,
                );
            if (
                clockOrdinal !== null &&
                effectiveOrdinal !== null &&
                effectiveOrdinal >
                    clockOrdinal
            ) {
                reason =
                    'future_clock';
            }
        }
        if (reason) {
            suppressed.push({
                recordId:
                    record?.recordId ||
                    record?.id ||
                    'unknown',
                reason,
            });
        } else {
            selected.push(record);
        }
    }
    return {
        records: selected,
        diagnostics: {
            selectedRecordIds:
                selected.map(record =>
                    record.recordId),
            suppressed,
        },
    };
}
