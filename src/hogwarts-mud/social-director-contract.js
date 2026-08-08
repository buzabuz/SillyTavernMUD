export const SOCIAL_GRAPH_VERSION = 2;
export const SOCIAL_GRAPH_EXTRACTOR_VERSION = 6;

export const STATEMENT_CATEGORIES = new Set([
    'family',
    'origin',
    'education',
    'wealth',
    'occupation',
    'identity',
    'history',
    'preference',
    'other',
]);

export const RELATIONSHIP_DIMENSION_RANGES =
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
export const RELATIONSHIP_DIMENSIONS =
    new Set(
        Object.keys(
            RELATIONSHIP_DIMENSION_RANGES,
        ),
    );
export const IMPACT_BANDS =
    Object.freeze({
        trace: Object.freeze({
            minimum: 1,
            maximum: 1,
        }),
        minor: Object.freeze({
            minimum: 2,
            maximum: 3,
        }),
        meaningful: Object.freeze({
            minimum: 4,
            maximum: 6,
        }),
        major: Object.freeze({
            minimum: 7,
            maximum: 12,
        }),
        defining: Object.freeze({
            minimum: 13,
            maximum: 18,
        }),
    });
export const EVENT_KINDS = new Set([
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
export const STRUCTURAL_TAGS = new Set([
    'family',
    'authority',
    'classmate',
    'rivalry',
    'mentor',
]);
export const EMOTIONS = new Set([
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
export const MODEL_RELATIONSHIP_EVIDENCE_FIELDS =
    new Set([
        'sourceActorId',
        'targetActorId',
        'sceneId',
        'eventKind',
        'dimensionDeltas',
        'structuralTags',
        'emotionAppraisals',
        'summaryEn',
        'summary',
        'witnessedBy',
        'sourceMessageIds',
    ]);
export const PERSISTED_RELATIONSHIP_EVIDENCE_FIELDS =
    new Set([
        'id',
        ...MODEL_RELATIONSHIP_EVIDENCE_FIELDS,
        'clock',
        'turn',
        'source',
        'sourceEventIds',
        'effectiveSinceClock',
        'knownTo',
        'authorizedWitnesses',
        'authorizedAudienceIds',
        'playerKnown',
        'knownToPlayer',
        'visibility',
    ]);
export const PERSISTED_RELATIONSHIP_EDGE_FIELDS =
    new Set([
        'id',
        'sourceActorId',
        'targetActorId',
        ...Object.keys(
            RELATIONSHIP_DIMENSION_RANGES,
        ),
        'structuralTags',
        'activeEmotions',
        'evidenceIds',
        'updatedTurn',
        'updatedClock',
        'knownTo',
        'authorizedWitnesses',
        'authorizedAudienceIds',
        'witnessedBy',
        'playerKnown',
        'knownToPlayer',
        'visibility',
    ]);

export function selectObjectFields(
    value,
    allowedFields,
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) =>
                allowedFields.has(key)),
    );
}

export function getSocialDirectorReducerContract() {
    return Object.freeze({
        dimensions:
            Object.freeze([
                ...RELATIONSHIP_DIMENSIONS,
            ]),
        structuralTags:
            Object.freeze([
                ...STRUCTURAL_TAGS,
            ]),
        emotions:
            Object.freeze([
                ...EMOTIONS,
            ]),
    });
}

export const RESENTMENT_HARM_EVENT_KINDS =
    new Set([
        'insult',
        'humiliation',
        'threat',
        'harm',
        'betrayal',
        'unresolved_conflict',
    ]);
export const ACCEPTED_REPAIR_EVENT_KINDS =
    new Set([
        'accepted_apology',
        'accepted_compensation',
        'forgiveness',
        'reappraisal',
    ]);
export const DEFINING_EVENT_KINDS =
    new Set([
        'betrayal',
        'sacrifice',
    ]);
export const SIGNED_NEGATIVE_DIMENSIONS =
    new Set([
        'warmth',
        'trust',
        'respect',
    ]);
export const REPEAT_MULTIPLIERS =
    Object.freeze([
        1,
        0.6,
        0.35,
        0.2,
    ]);
export const NON_BONDING_CLOSENESS_EVENT_KINDS =
    new Set([
        'introduction',
        'routine_interaction',
        'other',
    ]);
export const STAGE_GATED_CLOSENESS_EVENT_KINDS =
    new Set([
        'gift',
        'praise',
    ]);
export const CLOSENESS_STAGE_THRESHOLDS =
    Object.freeze([
        10,
        20,
        35,
        50,
        70,
        90,
        100,
    ]);
export const ACTIVE_EMOTION_DECAY_PER_TURN = 1;
