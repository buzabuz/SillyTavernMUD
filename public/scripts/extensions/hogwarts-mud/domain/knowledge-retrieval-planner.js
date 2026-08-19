export const KNOWLEDGE_RETRIEVAL_PLAN_VERSION = 1;
export const MAX_KNOWLEDGE_SUBQUERIES = 4;
export const KNOWLEDGE_RETRIEVAL_INTENTS =
    Object.freeze([
        'direct',
        'cause',
        'consequence',
        'participant',
        'pattern',
    ]);

const INTENT_SET =
    new Set(
        KNOWLEDGE_RETRIEVAL_INTENTS,
    );
const DETERMINISTIC_RETRIEVAL_INTENTS =
    Object.freeze(['direct']);
const NODE_TYPES_BY_INTENT =
    Object.freeze({
        direct: [
            'fact',
            'actor',
            'scene',
            'clue',
            'appraisal',
            'schema',
        ],
        cause: [
            'fact',
            'scene',
            'clue',
        ],
        consequence: [
            'fact',
            'scene',
            'appraisal',
            'schema',
        ],
        participant: [
            'actor',
            'fact',
            'scene',
        ],
        pattern: [
            'schema',
            'appraisal',
            'fact',
        ],
    });

function stableUnique(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    String(value || '')
                        .trim())
                .filter(Boolean),
        ),
    ].sort((left, right) =>
        left.localeCompare(
            right,
            'en',
        ));
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

function normalizeLimit(value) {
    return Math.min(
        24,
        Math.max(
            1,
            Number.isSafeInteger(
                Number(value),
            )
                ? Number(value)
                : 8,
        ),
    );
}

function normalizeAudience(audience = {}) {
    return {
        actorIds:
            stableUnique(
                audience.actorIds,
            ),
        includePublic:
            audience.includePublic !==
            false,
        includeLocked:
            audience.includeLocked ===
            true,
        role:
            String(
                audience.role ||
                'actor',
            ).trim(),
    };
}

function normalizeConstraints(input = {}) {
    return {
        audience:
            normalizeAudience(
                input.audience,
            ),
        timelineEpoch:
            String(
                input.timelineEpoch ||
                '',
            ).trim(),
        stateRevision:
            normalizeRevision(
                input.stateRevision,
            ),
        clock:
            String(
                input.clock ||
                input.effectiveClock ||
                '',
            ).trim(),
        entityIds:
            stableUnique(
                input.entityIds,
            ),
        nodeTypes:
            stableUnique(
                input.nodeTypes,
            ),
    };
}

function nodeTypesForIntent(
    intent,
    requestedNodeTypes,
) {
    const defaults =
        NODE_TYPES_BY_INTENT[intent];
    if (!requestedNodeTypes.length) {
        return [...defaults];
    }
    const requested =
        new Set(requestedNodeTypes);
    const narrowed =
        defaults.filter(nodeType =>
            requested.has(nodeType));
    return narrowed.length
        ? narrowed
        : [...requestedNodeTypes];
}

function queryForIntent(
    query,
    intent,
) {
    const prefix = {
        direct: '',
        cause:
            'causes and prior conditions: ',
        consequence:
            'consequences and later changes: ',
        participant:
            'people involved and witnesses: ',
        pattern:
            'repeated behavior and relationship pattern: ',
    }[intent];
    return `${prefix}${query}`.trim();
}

function createSubquery(
    intent,
    query,
    constraints,
    index,
    limit,
) {
    return {
        id:
            `subquery_${String(index + 1)
                .padStart(2, '0')}_${intent}`,
        intent,
        query:
            queryForIntent(
                query,
                intent,
            ),
        audience:
            structuredClone(
                constraints.audience,
            ),
        timelineEpoch:
            constraints.timelineEpoch,
        stateRevision:
            constraints.stateRevision,
        clock:
            constraints.clock,
        entityIds: [
            ...constraints.entityIds,
        ],
        nodeTypes:
            nodeTypesForIntent(
                intent,
                constraints.nodeTypes,
            ),
        limit,
    };
}

function buildPlan({
    query,
    intents,
    constraints,
    limit,
    source,
    diagnostics,
}) {
    return {
        version:
            KNOWLEDGE_RETRIEVAL_PLAN_VERSION,
        source,
        query,
        constraints:
            structuredClone(
                constraints,
            ),
        subqueries:
            intents.map(
                (
                    intent,
                    index,
                ) =>
                    createSubquery(
                        intent,
                        query,
                        constraints,
                        index,
                        limit,
                    ),
            ),
        diagnostics,
    };
}

export function createDeterministicRetrievalPlan(
    input = {},
) {
    const query =
        String(input.query || '')
            .replace(/\s+/gu, ' ')
            .trim();
    const constraints =
        normalizeConstraints(input);
    const limit =
        normalizeLimit(input.limit);
    return buildPlan({
        query,
        intents:
            DETERMINISTIC_RETRIEVAL_INTENTS,
        constraints,
        limit,
        source: 'deterministic',
        diagnostics: {
            planner:
                'deterministic',
            fallback: '',
            errors: [],
        },
    });
}

function normalizeLocalIntents(result) {
    const candidates =
        Array.isArray(result)
            ? result
            : result?.subqueries;
    if (
        !Array.isArray(candidates) ||
        !candidates.length ||
        candidates.length >
            MAX_KNOWLEDGE_SUBQUERIES
    ) {
        throw new TypeError(
            'Local Planner must return 1-4 subqueries.',
        );
    }
    const intents = candidates.map(
        candidate =>
            typeof candidate ===
                'string'
                ? candidate
                : candidate?.intent,
    );
    if (
        intents.some(intent =>
            !INTENT_SET.has(intent))
    ) {
        throw new TypeError(
            'Local Planner returned an unsupported retrieval intent.',
        );
    }
    return [...new Set(intents)];
}

export async function createKnowledgeRetrievalPlan(
    input = {},
    {
        localPlanner = null,
    } = {},
) {
    const deterministic =
        createDeterministicRetrievalPlan(
            input,
        );
    if (
        typeof localPlanner !==
        'function'
    ) {
        return deterministic;
    }
    try {
        const result =
            await localPlanner(
                structuredClone({
                    query:
                        deterministic
                            .query,
                    constraints:
                        deterministic
                            .constraints,
                    supportedIntents: [
                        ...KNOWLEDGE_RETRIEVAL_INTENTS,
                    ],
                    maximumSubqueries:
                        MAX_KNOWLEDGE_SUBQUERIES,
                }),
            );
        const intents =
            normalizeLocalIntents(
                result,
            );
        return buildPlan({
            query:
                deterministic.query,
            intents,
            constraints:
                deterministic
                    .constraints,
            limit:
                normalizeLimit(
                    input.limit,
                ),
            source: 'local',
            diagnostics: {
                planner: 'local',
                fallback: '',
                errors: [],
            },
        });
    } catch (error) {
        return {
            ...deterministic,
            diagnostics: {
                planner:
                    'deterministic',
                fallback:
                    'local_planner_failed',
                errors: [
                    String(
                        error?.message ||
                        error,
                    ).slice(0, 500),
                ],
            },
        };
    }
}
