export const MEMORY_SYNAPSE_VERSION = 2;
export const APPRAISAL_STATUS_VALUES = Object.freeze([
    'provisional',
    'accepted',
    'superseded',
]);
export const PERSON_SCHEMA_STATUS_VALUES = Object.freeze([
    'active',
    'contested',
    'superseded',
]);
export const APPRAISAL_KNOWLEDGE_SOURCE_VALUES =
    Object.freeze([
        'participant',
        'witness',
        'reported',
        'mixed',
    ]);
export const MIN_SCHEMA_SUPPORT_APPRAISALS = 3;
export const MIN_SCHEMA_SUPPORT_SCENES = 2;
export const MAX_ACTIVE_PERSON_SCHEMAS_PER_PAIR = 3;

const APPRAISAL_KEYS = new Set([
    'id',
    'observerId',
    'targetId',
    'summaryEn',
    'sourceEventIds',
    'activationSchemaIds',
    'derivedSchemaIds',
    'contextTags',
    'confidence',
    'status',
    'knowledgeSource',
    'committedClock',
    'historicalClaimAllowed',
    'supersedesAppraisalId',
    'supersededById',
]);
const APPRAISAL_PROPOSAL_KEYS = new Set([
    'observerId',
    'targetId',
    'summaryEn',
    'sourceEventIds',
    'activationSchemaIds',
    'derivedSchemaIds',
    'contextTags',
    'confidence',
    'supersedesAppraisalId',
]);
const PERSON_SCHEMA_KEYS = new Set([
    'id',
    'observerId',
    'targetId',
    'factPatternEn',
    'interpretationEn',
    'expectationEn',
    'confidence',
    'supportAppraisalIds',
    'supportEventIds',
    'counterAppraisalIds',
    'contextTags',
    'status',
    'updatedClock',
    'supersedesSchemaId',
    'supersededById',
]);
const MEMORY_SYNAPSE_KEYS = new Set([
    'version',
    'maxActiveSchemasPerPair',
    'appraisals',
    'personSchemas',
]);
function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function stableCompare(left, right) {
    return String(left).localeCompare(
        String(right),
        'en',
    );
}

function normalizeEntityId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_.:-]+/gu, '_')
        .replace(/^[_:.-]+|[_:.-]+$/gu, '')
        .slice(0, 96);
}

function normalizeRecordId(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_.:-]+/gu, '_')
        .replace(/^[_:.-]+|[_:.-]+$/gu, '')
        .slice(0, 128);
}

function normalizeReferenceIds(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    String(value || '').trim())
                .filter(Boolean),
        ),
    ].sort(stableCompare);
}

function normalizeSchemaProvenanceIds(
    value,
    key,
) {
    const provenance =
        isRecord(value?.provenance)
            ? value.provenance
            : {};
    return normalizeReferenceIds([
        ...(
            Array.isArray(value?.[key])
                ? value[key]
                : []
        ),
        ...(
            Array.isArray(provenance[key])
                ? provenance[key]
                : []
        ),
    ]);
}

export function getSchemaFeedbackProvenanceIds(
    value,
) {
    return normalizeReferenceIds([
        ...normalizeSchemaProvenanceIds(
            value,
            'activationSchemaIds',
        ),
        ...normalizeSchemaProvenanceIds(
            value,
            'derivedSchemaIds',
        ),
    ]);
}

function normalizeContextTags(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    String(value || '')
                        .normalize('NFKC')
                        .trim()
                        .toLocaleLowerCase()
                        .replace(/[\s-]+/gu, '_')
                        .replace(/[^a-z0-9_:]+/gu, ''))
                .filter(Boolean),
        ),
    ].sort(stableCompare).slice(0, 16);
}

function finiteConfidence(value, fallback = 0.6) {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(1, Math.max(0, number))
        : fallback;
}

function countWords(value) {
    return String(value || '')
        .trim()
        .split(/\s+/u)
        .filter(Boolean)
        .length;
}

function textFingerprint(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0)
        .toString(36)
        .padStart(7, '0');
}

function appraisalIdentity(value = {}) {
    return JSON.stringify({
        observerId:
            normalizeEntityId(value.observerId),
        targetId:
            normalizeEntityId(value.targetId),
        sourceEventIds:
            normalizeReferenceIds(
                value.sourceEventIds,
            ),
    });
}

function personSchemaIdentity(value = {}) {
    return JSON.stringify({
        observerId:
            normalizeEntityId(value.observerId),
        targetId:
            normalizeEntityId(value.targetId),
        factPattern:
            textFingerprint(
                value.factPatternEn,
            ),
        interpretation:
            textFingerprint(
                value.interpretationEn,
            ),
        contextTags:
            normalizeContextTags(
                value.contextTags,
            ),
    });
}

function hasOnlyKeys(value, allowedKeys) {
    return isRecord(value) &&
        Object.keys(value).every(key =>
            allowedKeys.has(key));
}

function validationResult(
    value,
    errors,
) {
    return {
        valid: errors.length === 0,
        errors,
        value,
    };
}

function statusRank(value) {
    return {
        provisional: 0,
        accepted: 1,
        active: 1,
        contested: 2,
        superseded: 3,
    }[value] ?? -1;
}

function selectPreferredRecord(left, right, clockKey) {
    const clockOrder = stableCompare(
        left[clockKey],
        right[clockKey],
    );
    if (clockOrder !== 0) {
        return clockOrder > 0
            ? left
            : right;
    }
    const rankOrder =
        statusRank(left.status) -
        statusRank(right.status);
    if (rankOrder !== 0) {
        return rankOrder > 0
            ? left
            : right;
    }
    return stableCompare(
        JSON.stringify(left),
        JSON.stringify(right),
    ) <= 0
        ? left
        : right;
}

function dedupeRecords(
    records,
    clockKey,
) {
    const byId = new Map();
    for (const record of records) {
        const existing = byId.get(record.id);
        byId.set(
            record.id,
            existing
                ? selectPreferredRecord(
                    existing,
                    record,
                    clockKey,
                )
                : record,
        );
    }
    return [...byId.values()]
        .sort((left, right) =>
            stableCompare(left.id, right.id));
}

export function createAppraisalId(
    appraisal = {},
) {
    return `appraisal_${stableHash(
        appraisalIdentity(appraisal),
    )}`;
}

export function createPersonSchemaId(
    schema = {},
) {
    return `schema_${stableHash(
        personSchemaIdentity(schema),
    )}`;
}

export function normalizeAppraisal(
    value = {},
) {
    const source = isRecord(value)
        ? value
        : {};
    const normalized = {
        id:
            normalizeRecordId(source.id) ||
            createAppraisalId(source),
        observerId:
            normalizeEntityId(source.observerId),
        targetId:
            normalizeEntityId(source.targetId),
        summaryEn:
            String(source.summaryEn || '').trim(),
        sourceEventIds:
            normalizeReferenceIds(
                source.sourceEventIds,
            ),
        activationSchemaIds:
            normalizeSchemaProvenanceIds(
                source,
                'activationSchemaIds',
            ),
        derivedSchemaIds:
            normalizeSchemaProvenanceIds(
                source,
                'derivedSchemaIds',
            ),
        contextTags:
            normalizeContextTags(
                source.contextTags,
            ),
        confidence:
            finiteConfidence(
                source.confidence,
            ),
        status:
            APPRAISAL_STATUS_VALUES.includes(
                source.status,
            )
                ? source.status
                : 'provisional',
        knowledgeSource:
            APPRAISAL_KNOWLEDGE_SOURCE_VALUES
                .includes(
                    source.knowledgeSource,
                )
                ? source.knowledgeSource
                : '',
        committedClock:
            String(
                source.committedClock || '',
            ).trim(),
        historicalClaimAllowed:
            source.historicalClaimAllowed !==
            false,
    };
    const supersedesAppraisalId =
        normalizeRecordId(
            source.supersedesAppraisalId,
        );
    const supersededById =
        normalizeRecordId(
            source.supersededById,
        );
    if (supersedesAppraisalId) {
        normalized.supersedesAppraisalId =
            supersedesAppraisalId;
    }
    if (supersededById) {
        normalized.supersededById =
            supersededById;
    }
    return normalized;
}

export function validateAppraisal(
    value,
) {
    const normalized =
        normalizeAppraisal(value);
    const errors = [];
    if (!hasOnlyKeys(value, APPRAISAL_KEYS)) {
        errors.push(
            'Appraisal contains unsupported fields.',
        );
    }
    if (
        !normalized.observerId ||
        !normalized.targetId ||
        normalized.observerId ===
            normalized.targetId
    ) {
        errors.push(
            'Appraisal observer and target are invalid.',
        );
    }
    if (
        !normalized.summaryEn ||
        countWords(normalized.summaryEn) > 60
    ) {
        errors.push(
            'Appraisal summary must contain 1-60 words.',
        );
    }
    if (
        normalized.historicalClaimAllowed &&
        !normalized.sourceEventIds.length
    ) {
        errors.push(
            'Historical Appraisal must cite an Event.',
        );
    }
    if (
        value?.historicalClaimAllowed !==
            undefined &&
        typeof value
            .historicalClaimAllowed !==
            'boolean'
    ) {
        errors.push(
            'Appraisal historicalClaimAllowed must be boolean.',
        );
    }
    if (
        !normalized.historicalClaimAllowed &&
        normalized.sourceEventIds.length
    ) {
        errors.push(
            'Non-historical Appraisal cannot cite Events.',
        );
    }
    if (
        !APPRAISAL_STATUS_VALUES.includes(
            value?.status,
        )
    ) {
        errors.push(
            'Appraisal status is invalid.',
        );
    }
    if (
        !Number.isFinite(
            Number(value?.confidence),
        ) ||
        Number(value.confidence) < 0 ||
        Number(value.confidence) > 1
    ) {
        errors.push(
            'Appraisal confidence must be between 0 and 1.',
        );
    }
    if (
        normalized.status !== 'provisional' &&
        (
            !normalized.committedClock ||
            !normalized.knowledgeSource
        )
    ) {
        errors.push(
            'Committed Appraisal requires clock and knowledge source.',
        );
    }
    if (
        normalized.status === 'superseded' &&
        !normalized.supersededById
    ) {
        errors.push(
            'Superseded Appraisal requires a replacement ID.',
        );
    }
    return validationResult(
        normalized,
        errors,
    );
}

export function normalizePersonSchema(
    value = {},
) {
    const source = isRecord(value)
        ? value
        : {};
    const normalized = {
        id:
            normalizeRecordId(source.id) ||
            createPersonSchemaId(source),
        observerId:
            normalizeEntityId(source.observerId),
        targetId:
            normalizeEntityId(source.targetId),
        factPatternEn:
            String(
                source.factPatternEn || '',
            ).trim(),
        interpretationEn:
            String(
                source.interpretationEn || '',
            ).trim(),
        expectationEn:
            String(
                source.expectationEn || '',
            ).trim(),
        confidence:
            finiteConfidence(
                source.confidence,
                0.75,
            ),
        supportAppraisalIds:
            normalizeReferenceIds(
                source.supportAppraisalIds,
            ),
        supportEventIds:
            normalizeReferenceIds(
                source.supportEventIds,
            ),
        counterAppraisalIds:
            normalizeReferenceIds(
                source.counterAppraisalIds,
            ),
        contextTags:
            normalizeContextTags(
                source.contextTags,
            ),
        status:
            PERSON_SCHEMA_STATUS_VALUES
                .includes(source.status)
                ? source.status
                : 'active',
        updatedClock:
            String(
                source.updatedClock || '',
            ).trim(),
    };
    const supersedesSchemaId =
        normalizeRecordId(
            source.supersedesSchemaId,
        );
    const supersededById =
        normalizeRecordId(
            source.supersededById,
        );
    if (supersedesSchemaId) {
        normalized.supersedesSchemaId =
            supersedesSchemaId;
    }
    if (supersededById) {
        normalized.supersededById =
            supersededById;
    }
    return normalized;
}

export function validatePersonSchema(
    value,
    {
        appraisals = [],
        eventKnowledge = [],
    } = {},
) {
    const normalized =
        normalizePersonSchema(value);
    const errors = [];
    if (
        !hasOnlyKeys(
            value,
            PERSON_SCHEMA_KEYS,
        )
    ) {
        errors.push(
            'Person Schema contains unsupported fields.',
        );
    }
    if (
        !normalized.observerId ||
        !normalized.targetId ||
        normalized.observerId ===
            normalized.targetId
    ) {
        errors.push(
            'Person Schema observer and target are invalid.',
        );
    }
    if (
        !normalized.factPatternEn ||
        countWords(
            normalized.factPatternEn,
        ) > 48 ||
        !normalized.interpretationEn ||
        countWords(
            normalized.interpretationEn,
        ) > 48 ||
        !normalized.expectationEn ||
        countWords(
            normalized.expectationEn,
        ) > 48
    ) {
        errors.push(
            'Person Schema fact pattern, interpretation, or expectation is invalid.',
        );
    }
    if (
        !PERSON_SCHEMA_STATUS_VALUES.includes(
            value?.status,
        )
    ) {
        errors.push(
            'Person Schema status is invalid.',
        );
    }
    if (
        !Number.isFinite(
            Number(value?.confidence),
        ) ||
        Number(value.confidence) < 0 ||
        Number(value.confidence) > 1
    ) {
        errors.push(
            'Person Schema confidence must be between 0 and 1.',
        );
    }
    if (!normalized.updatedClock) {
        errors.push(
            'Person Schema requires an update clock.',
        );
    }
    const counterIds = new Set(
        normalized.counterAppraisalIds,
    );
    if (
        normalized.supportAppraisalIds
            .some(id => counterIds.has(id))
    ) {
        errors.push(
            'Person Schema support and counter evidence overlap.',
        );
    }
    if (
        normalized.status !==
            'superseded' &&
        normalized.supportAppraisalIds
            .length <
            MIN_SCHEMA_SUPPORT_APPRAISALS
    ) {
        errors.push(
            'Stable Person Schema requires three accepted Appraisals across two scenes.',
        );
    }
    const appraisalById = new Map(
        appraisals.map(appraisal => [
            appraisal.id,
            appraisal,
        ]),
    );
    const eventById = new Map(
        eventKnowledge.map(event => [
            event.eventId,
            event,
        ]),
    );
    if (appraisalById.size) {
        const supports =
            normalized.supportAppraisalIds
                .map(id => appraisalById.get(id))
                .filter(Boolean);
        const counters =
            normalized.counterAppraisalIds
                .map(id => appraisalById.get(id))
                .filter(Boolean);
        const derivedSupportEventIds =
            normalizeReferenceIds(
                supports.flatMap(appraisal =>
                    appraisal.sourceEventIds),
            );
        const supportEvents =
            derivedSupportEventIds
                .map(id =>
                    eventById.get(id))
                .filter(Boolean);
        if (
            supports.length !==
                normalized
                    .supportAppraisalIds
                    .length ||
            counters.length !==
                normalized
                    .counterAppraisalIds
                    .length
        ) {
            errors.push(
                'Person Schema cites unknown Appraisals.',
            );
        }
        if (
            [...supports, ...counters]
                .some(appraisal =>
                    appraisal.status !==
                        'accepted' ||
                    appraisal.observerId !==
                        normalized.observerId ||
                    appraisal.targetId !==
                        normalized.targetId)
        ) {
            errors.push(
                'Person Schema evidence has the wrong status or actor pair.',
            );
        }
        if (
            JSON.stringify(
                normalized.supportEventIds,
            ) !== JSON.stringify(
                derivedSupportEventIds,
            )
        ) {
            errors.push(
                'Person Schema support Events must be derived from supporting Appraisals.',
            );
        }
        if (
            eventById.size &&
            supportEvents.length !==
                derivedSupportEventIds
                    .length
        ) {
            errors.push(
                'Person Schema cites unknown support Events.',
            );
        }
        if (
            normalized.status !==
                'superseded' &&
            (
                supports.length <
                    MIN_SCHEMA_SUPPORT_APPRAISALS ||
                new Set(
                    supportEvents.map(
                        event =>
                            event.sceneId,
                    ),
                ).size <
                    MIN_SCHEMA_SUPPORT_SCENES
            )
        ) {
            errors.push(
                'Stable Person Schema requires three accepted Appraisals across two scenes.',
            );
        }
    }
    return validationResult(
        normalized,
        errors,
    );
}

export function normalizeMemorySynapse(
    value = {},
) {
    const source = isRecord(value)
        ? value
        : {};
    const appraisals = dedupeRecords(
        (
            Array.isArray(source.appraisals)
                ? source.appraisals
                : []
        )
            .filter(isRecord)
            .map(normalizeAppraisal)
            .filter(appraisal =>
                appraisal.observerId &&
                appraisal.targetId &&
                appraisal.summaryEn),
        'committedClock',
    );
    const personSchemas = dedupeRecords(
        (
            Array.isArray(
                source.personSchemas,
            )
                ? source.personSchemas
                : []
        )
            .filter(isRecord)
            .map(normalizePersonSchema)
            .filter(schema =>
                schema.observerId &&
                schema.targetId &&
                schema.factPatternEn &&
                schema.interpretationEn &&
                schema.expectationEn),
        'updatedClock',
    );
    return {
        version: MEMORY_SYNAPSE_VERSION,
        maxActiveSchemasPerPair:
            Math.min(
                MAX_ACTIVE_PERSON_SCHEMAS_PER_PAIR,
                Math.max(
                    1,
                    Number.isInteger(
                        source
                            .maxActiveSchemasPerPair,
                    )
                        ? source
                            .maxActiveSchemasPerPair
                        : MAX_ACTIVE_PERSON_SCHEMAS_PER_PAIR,
                ),
            ),
        appraisals,
        personSchemas,
    };
}

export function validateMemorySynapse(
    value,
    {
        eventKnowledge = [],
    } = {},
) {
    const normalized =
        normalizeMemorySynapse(value);
    const errors = [];
    if (
        !hasOnlyKeys(
            value,
            MEMORY_SYNAPSE_KEYS,
        )
    ) {
        errors.push(
            'Memory Synapse contains unsupported fields.',
        );
    }
    if (
        value?.version !==
            MEMORY_SYNAPSE_VERSION
    ) {
        errors.push(
            'Memory Synapse version is invalid.',
        );
    }
    if (
        !Number.isInteger(
            value?.maxActiveSchemasPerPair,
        ) ||
        value.maxActiveSchemasPerPair < 1 ||
        value.maxActiveSchemasPerPair >
            MAX_ACTIVE_PERSON_SCHEMAS_PER_PAIR
    ) {
        errors.push(
            'Memory Synapse active schema limit is invalid.',
        );
    }
    if (
        !Array.isArray(value?.appraisals) ||
        !Array.isArray(value?.personSchemas)
    ) {
        errors.push(
            'Memory Synapse record collections are invalid.',
        );
    }
    const appraisalIds = new Set();
    for (const appraisal of (
        Array.isArray(value?.appraisals)
            ? value.appraisals
            : []
    )) {
        const validation =
            validateAppraisal(appraisal);
        errors.push(...validation.errors);
        if (
            validation.value
                .historicalClaimAllowed
        ) {
            const access =
                validateAppraisalObserverAccess(
                    validation.value,
                    {
                        eventKnowledge,
                    },
                );
            errors.push(...access.errors);
            if (
                access.valid &&
                validation.value
                    .knowledgeSource !==
                    access.basis
            ) {
                errors.push(
                    `Appraisal ${validation.value.id} knowledge source disagrees with Event authority.`,
                );
            }
        }
        if (appraisalIds.has(validation.value.id)) {
            errors.push(
                `Duplicate Appraisal ID ${validation.value.id}.`,
            );
        }
        appraisalIds.add(validation.value.id);
    }
    const schemaIds = new Set();
    const schemaById = new Map();
    const activeCounts = new Map();
    for (const schema of (
        Array.isArray(value?.personSchemas)
            ? value.personSchemas
            : []
    )) {
        const validation =
            validatePersonSchema(
                schema,
                {
                    appraisals:
                        normalized.appraisals,
                    eventKnowledge,
                },
            );
        errors.push(...validation.errors);
        if (schemaIds.has(validation.value.id)) {
            errors.push(
                `Duplicate Person Schema ID ${validation.value.id}.`,
            );
        }
        schemaIds.add(validation.value.id);
        schemaById.set(
            validation.value.id,
            validation.value,
        );
        if (
            validation.value.status ===
                'active'
        ) {
            const pair =
                `${validation.value.observerId}->${validation.value.targetId}`;
            activeCounts.set(
                pair,
                (activeCounts.get(pair) || 0) +
                    1,
            );
        }
    }
    if (
        [...activeCounts.values()]
            .some(count =>
                count >
                normalized
                    .maxActiveSchemasPerPair)
    ) {
        errors.push(
            'Memory Synapse exceeds the active schema limit.',
        );
    }
    for (const schema of schemaById.values()) {
        const predecessor =
            schema.supersedesSchemaId
                ? schemaById.get(
                    schema.supersedesSchemaId,
                )
                : null;
        const replacement =
            schema.supersededById
                ? schemaById.get(
                    schema.supersededById,
                )
                : null;
        if (
            schema.status === 'superseded' &&
            !replacement
        ) {
            errors.push(
                `Superseded Person Schema ${schema.id} requires a replacement.`,
            );
        }
        if (
            schema.status !== 'superseded' &&
            schema.supersededById
        ) {
            errors.push(
                `Person Schema ${schema.id} has an invalid replacement link.`,
            );
        }
        if (
            predecessor &&
            (
                predecessor.observerId !==
                    schema.observerId ||
                predecessor.targetId !==
                    schema.targetId ||
                predecessor.status !==
                    'superseded' ||
                predecessor.supersededById !==
                    schema.id
            )
        ) {
            errors.push(
                `Person Schema ${schema.id} has an incomplete supersede chain.`,
            );
        }
        if (
            schema.supersedesSchemaId &&
            !predecessor
        ) {
            errors.push(
                `Person Schema ${schema.id} supersedes an unknown Schema.`,
            );
        }
        if (
            replacement &&
            (
                replacement.observerId !==
                    schema.observerId ||
                replacement.targetId !==
                    schema.targetId ||
                replacement.supersedesSchemaId !==
                    schema.id
            )
        ) {
            errors.push(
                `Person Schema ${schema.id} has an incomplete supersede chain.`,
            );
        }
        const visited = new Set([
            schema.id,
        ]);
        let cursor = schema;
        while (cursor.supersededById) {
            if (
                visited.has(
                    cursor.supersededById,
                )
            ) {
                errors.push(
                    `Person Schema ${schema.id} has a cyclic supersede chain.`,
                );
                break;
            }
            visited.add(
                cursor.supersededById,
            );
            cursor =
                schemaById.get(
                    cursor.supersededById,
                ) || {};
        }
    }
    return validationResult(
        normalized,
        errors,
    );
}

export function createDefaultMemorySynapse() {
    return normalizeMemorySynapse();
}

export function initializeMemorySynapseState(
    worldState,
) {
    if (!isRecord(worldState)) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const normalized =
        normalizeMemorySynapse(
            worldState.memorySynapse,
        );
    if (
        isRecord(worldState.memorySynapse) &&
        JSON.stringify(
            worldState.memorySynapse,
        ) === JSON.stringify(normalized)
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    return {
        state: {
            ...structuredClone(worldState),
            memorySynapse: normalized,
        },
        changed: true,
    };
}

export const migrateMemorySynapseState =
    initializeMemorySynapseState;

export function getLegalAppraisalObserverIds(
    worldState,
    event,
) {
    if (!isRecord(event)) {
        return [];
    }
    const actorIds =
        knownActorIds(worldState);
    const legal =
        event.eventKind === 'reported'
            ? new Set([
                event.report?.speakerId,
                ...(
                    event.report
                        ?.recipientIds ||
                    []
                ),
            ].map(normalizeEntityId))
            : new Set([
                ...(event
                    .participantActorIds ||
                    []),
                ...(event.witnessActorIds ||
                    []),
            ].map(normalizeEntityId));
    return [...legal]
        .filter(actorId =>
            actorIds.has(actorId))
        .sort(stableCompare);
}

export function validateAppraisalObserverAccess(
    appraisal,
    worldState = {},
) {
    const normalized =
        normalizeAppraisal(appraisal);
    const errors = [];
    const eventsById = new Map(
        (
            Array.isArray(
                worldState.eventKnowledge,
            )
                ? worldState.eventKnowledge
                : []
        ).map(event => [
            String(event?.eventId || ''),
            event,
        ]),
    );
    const events =
        normalized.sourceEventIds
            .map(id => eventsById.get(id))
            .filter(Boolean);
    if (
        !events.length ||
        events.length !==
            normalized.sourceEventIds.length
    ) {
        errors.push(
            'Appraisal cites an uncommitted event.',
        );
    }
    const bases = [];
    for (const event of events) {
        if (
            event.eventKind ===
                'reported'
        ) {
            if (
                event.report
                    ?.speakerId ===
                    normalized.observerId
            ) {
                bases.push(
                    'participant',
                );
                continue;
            }
            if (
                (
                    event.report
                        ?.recipientIds ||
                    []
                )
                    .map(normalizeEntityId)
                    .includes(
                        normalized.observerId,
                    )
            ) {
                bases.push('reported');
                continue;
            }
            errors.push(
                `Observer ${normalized.observerId || '?'} did not receive reported Event ${event.eventId || '?'}.`,
            );
            continue;
        }
        if (
            (
                event.participantActorIds ||
                []
            )
                .map(normalizeEntityId)
                .includes(
                    normalized.observerId,
                )
        ) {
            bases.push('participant');
            continue;
        }
        if (
            (
                event.witnessActorIds ||
                []
            )
                .map(normalizeEntityId)
                .includes(
                    normalized.observerId,
                )
        ) {
            bases.push('witness');
            continue;
        }
        errors.push(
            `Observer ${normalized.observerId || '?'} has no authorized access to event ${event.eventId || '?'}.`,
        );
    }
    const uniqueBases = [...new Set(bases)];
    return {
        valid: errors.length === 0,
        errors,
        basis:
            uniqueBases.length === 1
                ? uniqueBases[0]
                : uniqueBases.length > 1
                    ? 'mixed'
                    : '',
        events,
    };
}

function knownActorIds(worldState) {
    return new Set([
        ...(worldState?.actorLibrary || [])
            .map(actor =>
                normalizeEntityId(actor.id)),
        ...(worldState?.actors || [])
            .map(actor =>
                normalizeEntityId(actor.id)),
    ].filter(Boolean));
}

export function validateAppraisalProposal(
    proposal,
    worldState = {},
    options = {},
) {
    const errors = [];
    if (
        !hasOnlyKeys(
            proposal,
            APPRAISAL_PROPOSAL_KEYS,
        )
    ) {
        errors.push(
            'Appraisal proposal contains unsupported fields.',
        );
    }
    if (
        getSchemaFeedbackProvenanceIds(
            proposal,
        ).length
    ) {
        errors.push(
            'Appraisal proposal cannot use Schema or activation-capsule feedback as source evidence.',
        );
    }
    const normalized =
        normalizeAppraisal({
            ...proposal,
            id: createAppraisalId(
                proposal,
            ),
            status: 'accepted',
            knowledgeSource:
                'participant',
            committedClock:
                worldState.clock,
        });
    const actors = knownActorIds(worldState);
    if (
        !actors.has(
            normalized.observerId,
        ) ||
        (
            normalized.targetId !==
                'player' &&
            !actors.has(
                normalized.targetId,
            )
        )
    ) {
        errors.push(
            'Appraisal proposal references an unknown actor.',
        );
    }
    const access =
        validateAppraisalObserverAccess(
            normalized,
            worldState,
        );
    errors.push(...access.errors);
    if (
        access.events.some(event =>
            textFingerprint(
                event.summaryEn,
            ) ===
            textFingerprint(
                normalized.summaryEn,
            ))
    ) {
        errors.push(
            'Appraisal must interpret an event rather than copy its objective summary.',
        );
    }
    const value = normalizeAppraisal({
        ...normalized,
        status: 'accepted',
        knowledgeSource:
            access.basis,
        activationSchemaIds: [
            ...normalized
                .activationSchemaIds,
            ...access.events.flatMap(
                event =>
                    normalizeSchemaProvenanceIds(
                        event,
                        'activationSchemaIds',
                    ),
            ),
        ],
        derivedSchemaIds: [
            ...normalized
                .derivedSchemaIds,
            ...access.events.flatMap(
                event =>
                    normalizeSchemaProvenanceIds(
                        event,
                        'derivedSchemaIds',
                    ),
            ),
        ],
        committedClock:
            worldState.clock,
    });
    errors.push(
        ...validateAppraisal(value)
            .errors,
    );
    return validationResult(
        value,
        [...new Set(errors)],
    );
}

export function validateAppraisalProposalBatch(
    proposals,
    worldState = {},
    options = {},
) {
    const errors = [];
    if (
        !Array.isArray(proposals) ||
        proposals.length > 64
    ) {
        return validationResult(
            [],
            [
                'Appraisal proposal batch must contain at most 64 records.',
            ],
        );
    }
    const byId = new Map();
    for (const proposal of proposals) {
        const validation =
            validateAppraisalProposal(
                proposal,
                worldState,
                options,
            );
        if (!validation.valid) {
            errors.push(
                ...validation.errors,
            );
            continue;
        }
        const existing =
            byId.get(validation.value.id);
        if (
            existing &&
            JSON.stringify(existing) !==
                JSON.stringify(
                    validation.value,
                )
        ) {
            errors.push(
                `Conflicting Appraisal proposals share stable ID ${validation.value.id}.`,
            );
            continue;
        }
        byId.set(
            validation.value.id,
            validation.value,
        );
    }
    return validationResult(
        [...byId.values()]
            .sort((left, right) =>
                stableCompare(
                    left.id,
                    right.id,
                )),
        [...new Set(errors)],
    );
}
