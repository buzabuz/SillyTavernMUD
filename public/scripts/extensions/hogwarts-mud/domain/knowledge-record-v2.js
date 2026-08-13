export const KNOWLEDGE_RECORD_VERSION = 2;
export const KNOWLEDGE_PROJECTOR_VERSION = 2;
export const KNOWLEDGE_NODE_TYPES = Object.freeze([
    'fact',
    'appraisal',
    'schema',
    'actor',
    'scene',
    'clue',
]);
export const KNOWLEDGE_VISIBILITY_SCOPES = Object.freeze([
    'public',
    'actor',
    'witnesses',
    'locked',
]);
export const KNOWLEDGE_CATEGORIES_V2 = Object.freeze([
    'actors',
    'scenes',
    'events',
    'clues',
    'appraisals',
    'schemas',
]);

const NODE_TYPE_SET = new Set(KNOWLEDGE_NODE_TYPES);
const VISIBILITY_SCOPE_SET =
    new Set(KNOWLEDGE_VISIBILITY_SCOPES);
const CATEGORY_SET =
    new Set(KNOWLEDGE_CATEGORIES_V2);

export function normalizeKnowledgeId(
    value,
    fallback = 'unknown',
) {
    const normalized =
        String(value || '')
            .normalize('NFKD')
            .replace(/[^\w.-]+/g, '_')
            .replace(/^[_\-.]+|[_\-.]+$/g, '')
            .slice(0, 160);
    return normalized || fallback;
}

function normalizeText(value, maximumLength = 100_000) {
    return String(value ?? '')
        .normalize('NFC')
        .trim()
        .slice(0, maximumLength);
}

function normalizeStringList(
    values,
    maximumEntries = 128,
) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    normalizeKnowledgeId(
                        value,
                        '',
                    ))
                .filter(Boolean),
        ),
    ]
        .sort()
        .slice(0, maximumEntries);
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
        return value.map(entry =>
            canonicalize(entry, seen));
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
        if (
            value[key] === undefined ||
            typeof value[key] === 'function'
        ) {
            continue;
        }
        normalized[key] =
            canonicalize(
                value[key],
                seen,
            );
    }
    seen.delete(value);
    return normalized;
}

export function stableKnowledgeStringify(value) {
    return JSON.stringify(
        canonicalize(value),
    );
}

export function checksumKnowledgeContent(value) {
    const text =
        stableKnowledgeStringify(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index++) {
        const code =
            text.charCodeAt(index);
        first ^= code;
        first = Math.imul(
            first,
            0x01000193,
        );
        second ^= code +
            ((index + 1) * 31);
        second = Math.imul(
            second,
            0x85ebca6b,
        );
    }
    return [
        first >>> 0,
        second >>> 0,
    ]
        .map(part =>
            part.toString(16)
                .padStart(8, '0'))
        .join('');
}

function normalizeSourceRefs(sourceRefs) {
    const refs = (
        Array.isArray(sourceRefs)
            ? sourceRefs
            : []
    )
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
            const type =
                normalizeKnowledgeId(
                    sourceRef.type ||
                    'state',
                );
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
                type,
                id,
            };
        })
        .filter(Boolean);
    return [
        ...new Map(
            refs.map(ref => [
                `${ref.type}:${ref.id}`,
                ref,
            ]),
        ).values(),
    ].sort((left, right) =>
        `${left.type}:${left.id}`
            .localeCompare(
                `${right.type}:${right.id}`,
            ));
}

export function normalizeKnowledgeVisibility(
    visibility,
) {
    const isValid =
        VISIBILITY_SCOPE_SET.has(
            visibility?.scope,
        );
    return {
        scope:
            isValid
                ? visibility.scope
                : 'locked',
        actorIds:
            isValid
                ? normalizeStringList(
                    visibility?.actorIds,
                )
                : [],
    };
}

function normalizeRevision(value) {
    const revision = Number(value);
    return (
        Number.isSafeInteger(revision) &&
        revision >= 0
    )
        ? revision
        : 0;
}

function recordChecksumInput(record) {
    return {
        recordId: record.recordId,
        nodeType: record.nodeType,
        title: record.title,
        text: record.text,
        entityIds: record.entityIds,
        tags: record.tags,
        sourceRefs: record.sourceRefs,
        visibility: record.visibility,
        effectiveClock:
            record.effectiveClock,
        sceneId: record.sceneId,
    };
}

export function createKnowledgeRecordV2(input) {
    const nodeType =
        NODE_TYPE_SET.has(input?.nodeType)
            ? input.nodeType
            : 'fact';
    const category =
        CATEGORY_SET.has(input?.category)
            ? input.category
            : nodeType === 'actor'
                ? 'actors'
                : nodeType === 'scene'
                    ? 'scenes'
                    : nodeType === 'clue'
                        ? 'clues'
                        : nodeType ===
                            'appraisal'
                            ? 'appraisals'
                            : nodeType ===
                                'schema'
                                ? 'schemas'
                                : 'events';
    const recordId =
        normalizeKnowledgeId(
            input?.recordId ||
            input?.id,
        );
    const record = {
        version:
            KNOWLEDGE_RECORD_VERSION,
        recordId,
        nodeType,
        text: normalizeText(input?.text),
        entityIds:
            normalizeStringList(
                input?.entityIds,
            ),
        tags:
            normalizeStringList(
                input?.tags,
            ),
        timelineEpoch:
            normalizeKnowledgeId(
                input?.timelineEpoch,
                'legacy_epoch',
            ),
        stateRevision:
            normalizeRevision(
                input?.stateRevision,
            ),
        projectorVersion:
            KNOWLEDGE_PROJECTOR_VERSION,
        sourceRefs:
            normalizeSourceRefs(
                input?.sourceRefs,
            ),
        visibility:
            normalizeKnowledgeVisibility(
                input?.visibility,
            ),
        effectiveClock:
            normalizeText(
                input?.effectiveClock,
                80,
            ),
        sceneId:
            normalizeKnowledgeId(
                input?.sceneId,
                '',
            ),
        contentChecksum: '',
        category,
        id: recordId,
        title:
            normalizeText(
                input?.title ||
                recordId,
                300,
            ),
        data:
            input?.data &&
            typeof input.data === 'object'
                ? canonicalize(input.data)
                : {},
    };
    record.contentChecksum =
        checksumKnowledgeContent(
            recordChecksumInput(record),
        );
    return record;
}

export function chunkKnowledgeText(
    value,
    {
        maximumCharacters = 6_000,
        overlapCharacters = 320,
    } = {},
) {
    const text = normalizeText(
        value,
        2_000_000,
    );
    const maximum = Math.max(
        1_000,
        Number(maximumCharacters) ||
            6_000,
    );
    const overlap = Math.min(
        Math.max(
            0,
            Number(overlapCharacters) ||
                0,
        ),
        Math.floor(maximum / 4),
    );
    if (text.length <= maximum) {
        return text
            ? [text]
            : [];
    }
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(
            text.length,
            start + maximum,
        );
        if (end < text.length) {
            const boundary = Math.max(
                text.lastIndexOf(
                    '\n\n',
                    end,
                ),
                text.lastIndexOf(
                    '\n',
                    end,
                ),
                text.lastIndexOf(
                    ' ',
                    end,
                ),
            );
            if (
                boundary >
                start +
                    Math.floor(maximum * 0.6)
            ) {
                end = boundary;
            }
        }
        const chunk =
            text.slice(start, end)
                .trim();
        if (chunk) chunks.push(chunk);
        if (end >= text.length) break;
        start = Math.max(
            start + 1,
            end - overlap,
        );
    }
    return chunks;
}

export function createChunkedKnowledgeRecordsV2(
    input,
    options,
) {
    const chunks =
        chunkKnowledgeText(
            input?.text,
            options,
        );
    if (chunks.length <= 1) {
        return chunks.length
            ? [
                createKnowledgeRecordV2(
                    input,
                ),
            ]
            : [];
    }
    const width =
        String(chunks.length).length;
    return chunks.map((text, index) => {
        const chunkNumber =
            String(index + 1)
                .padStart(width, '0');
        return createKnowledgeRecordV2({
            ...input,
            recordId:
                `${
                    input.recordId ||
                    input.id
                }.chunk_${chunkNumber}`,
            title:
                `${
                    input.title ||
                    input.recordId ||
                    input.id
                } (${index + 1}/${
                    chunks.length
                })`,
            text,
            tags: [
                ...(input.tags || []),
                'chunk',
                `chunk_${chunkNumber}`,
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

export function clockToKnowledgeOrdinal(value) {
    const parts =
        String(value || '')
            .match(/\d+/gu) ||
        [];
    if (!parts.length) return null;
    const [
        year = '0',
        month = '0',
        day = '0',
        hour = '0',
        minute = '0',
    ] = parts;
    return Number(
        [
            year.padStart(4, '0'),
            month.padStart(2, '0'),
            day.padStart(2, '0'),
            hour.padStart(2, '0'),
            minute.padStart(2, '0'),
        ].join(''),
    );
}

function normalizeAudience(audience) {
    if (typeof audience === 'string') {
        return {
            actorIds: audience === 'public'
                ? []
                : [
                    normalizeKnowledgeId(
                        audience,
                    ),
                ],
            includePublic: true,
            includeLocked: false,
        };
    }
    return {
        actorIds:
            normalizeStringList(
                audience?.actorIds,
            ),
        includePublic:
            audience?.includePublic !==
            false,
        includeLocked:
            audience?.includeLocked ===
            true,
    };
}

export function canAudienceAccessKnowledgeRecord(
    record,
    audience,
) {
    const normalizedAudience =
        normalizeAudience(audience);
    const visibility =
        normalizeKnowledgeVisibility(
            record?.visibility,
        );
    if (visibility.scope === 'public') {
        return normalizedAudience
            .includePublic;
    }
    const authorized =
        visibility.actorIds.some(actorId =>
            normalizedAudience
                .actorIds
                .includes(actorId));
    if (visibility.scope === 'locked') {
        return (
            normalizedAudience
                .includeLocked &&
            authorized
        );
    }
    return authorized;
}

function sourceRefKey(sourceRef) {
    if (typeof sourceRef === 'string') {
        return sourceRef;
    }
    return `${sourceRef?.type || 'state'}:${
        sourceRef?.id || ''
    }`;
}

export function hydrateKnowledgeRecords(
    records,
    {
        timelineEpoch,
        stateRevision,
        audience,
        effectiveClock,
        nodeTypes,
        supersededSourceRefs = [],
    } = {},
) {
    const suppressedRefs =
        new Set(
            supersededSourceRefs
                .map(sourceRefKey),
        );
    const allowedNodeTypes =
        new Set(
            (
                Array.isArray(nodeTypes)
                    ? nodeTypes
                    : []
            ).filter(nodeType =>
                NODE_TYPE_SET.has(nodeType)),
        );
    const requestedRevision =
        stateRevision === undefined
            ? null
            : normalizeRevision(
                stateRevision,
            );
    const requestedClock =
        clockToKnowledgeOrdinal(
            effectiveClock,
        );
    const selected = [];
    const diagnostics = {
        staleRevision: [],
        wrongTimeline: [],
        unauthorized: [],
        future: [],
        wrongNodeType: [],
        superseded: [],
    };
    for (const input of records || []) {
        const record =
            createKnowledgeRecordV2(
                input,
            );
        if (
            timelineEpoch &&
            record.timelineEpoch !==
                normalizeKnowledgeId(
                    timelineEpoch,
                    'legacy_epoch',
                )
        ) {
            diagnostics.wrongTimeline
                .push(record.recordId);
            continue;
        }
        if (
            requestedRevision !== null &&
            record.stateRevision !==
                requestedRevision
        ) {
            diagnostics.staleRevision
                .push(record.recordId);
            continue;
        }
        if (
            allowedNodeTypes.size &&
            !allowedNodeTypes.has(
                record.nodeType,
            )
        ) {
            diagnostics.wrongNodeType
                .push(record.recordId);
            continue;
        }
        if (
            requestedClock !== null
        ) {
            const recordClock =
                clockToKnowledgeOrdinal(
                    record.effectiveClock,
                );
            if (
                recordClock !== null &&
                recordClock >
                    requestedClock
            ) {
                diagnostics.future
                    .push(record.recordId);
                continue;
            }
        }
        if (
            !canAudienceAccessKnowledgeRecord(
                record,
                audience,
            )
        ) {
            diagnostics.unauthorized
                .push(record.recordId);
            continue;
        }
        const hasSupersededSource =
            record.sourceRefs.some(ref =>
                suppressedRefs.has(
                    sourceRefKey(ref),
                ) ||
                suppressedRefs.has(
                    ref.id,
                ));
        if (
            record.tags.includes(
                'superseded',
            ) ||
            hasSupersededSource
        ) {
            diagnostics.superseded
                .push(record.recordId);
            continue;
        }
        selected.push(record);
    }
    return {
        records: selected,
        diagnostics,
    };
}
