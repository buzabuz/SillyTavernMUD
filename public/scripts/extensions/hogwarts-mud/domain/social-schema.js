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
export const SOCIAL_RELATIONSHIP_DIMENSION_SET =
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
export function finiteSocialNumber(
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

export function clampSocialDimension(
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

export function normalizeSocialSourceMessageIds(
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

export function normalizeSocialStructuralTags(
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

export function impactForSocialDelta(delta) {
    const magnitude = Math.abs(delta);
    if (magnitude <= 1) return 'trace';
    if (magnitude <= 3) return 'minor';
    if (magnitude <= 6) {
        return 'meaningful';
    }
    if (magnitude <= 12) return 'major';
    return 'defining';
}

export function normalizeSocialDimensionDeltas(
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

export function inferSocialEventKind(evidence) {
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

export function parseSocialGraphV1MigrationInput(
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

export function normalizeEmotionAppraisals(
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

function normalizeSocialRelationshipKind(
    value,
) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(
            /[\s-]+/gu,
            '_',
        )
        .replace(
            /[^a-z0-9_:]+/gu,
            '',
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
    normalized.relationshipClaimIds = [
        ...new Set(
            (
                Array.isArray(
                    edge.relationshipClaimIds,
                )
                    ? edge
                        .relationshipClaimIds
                    : []
            )
                .map(String)
                .filter(Boolean),
        ),
    ];
    normalized.relationshipKinds = [
        ...new Set(
            (
                Array.isArray(
                    edge.relationshipKinds,
                )
                    ? edge
                        .relationshipKinds
                    : []
            )
                .map(
                    normalizeSocialRelationshipKind,
                )
                .filter(Boolean),
        ),
    ];
    return normalized;
}
