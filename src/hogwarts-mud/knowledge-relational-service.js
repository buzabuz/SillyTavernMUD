import {
    hydrateKnowledgeRecords,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    createKnowledgeRetrievalPlan,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-retrieval-planner.js';
import {
    buildRelationalSynapseGraph,
    buildSealedActivationCapsules,
    expandRelationalActivation,
    fuseKnowledgeRankings,
    rerankRelationalKnowledge,
    trimRelationalKnowledgeBudget,
} from '../../public/scripts/extensions/hogwarts-mud/domain/relational-synapse-retrieval.js';

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

function queryTokens(value) {
    return stableUnique(
        String(value || '')
            .toLocaleLowerCase()
            .split(
                /[^\p{L}\p{N}_-]+/u,
            )
            .filter(token =>
                token.length > 1),
    );
}

function exactRecordScore(
    record,
    query,
    entityIds,
) {
    const requestedEntities =
        new Set(entityIds || []);
    let score = 0;
    if (
        requestedEntities.has(
            record.recordId,
        )
    ) {
        score += 120;
    }
    score +=
        (record.entityIds || [])
            .filter(entityId =>
                requestedEntities
                    .has(entityId))
            .length * 80;
    const haystack =
        `${
            record.recordId
        } ${
            record.title || ''
        } ${
            record.text || ''
        } ${
            (record.tags || [])
                .join(' ')
        }`
            .toLocaleLowerCase();
    for (
        const token
        of queryTokens(query)
    ) {
        if (haystack.includes(token)) {
            score += 5;
        }
    }
    return score;
}

function uniqueRecords(...groups) {
    const byId = new Map();
    for (
        const record
        of groups.flat()
    ) {
        if (
            record?.recordId &&
            !byId.has(
                record.recordId,
            )
        ) {
            byId.set(
                record.recordId,
                record,
            );
        }
    }
    return [...byId.values()]
        .sort((left, right) =>
            left.recordId.localeCompare(
                right.recordId,
                'en',
            ));
}

function filtersForSubquery(
    subquery,
    input,
) {
    return {
        timelineEpoch:
            subquery.timelineEpoch,
        stateRevision:
            subquery.stateRevision,
        audience:
            subquery.audience,
        clock:
            subquery.clock,
        nodeTypes:
            subquery.nodeTypes,
        categories:
            input.categories || [],
        supersededSourceRefs:
            input
                .supersededSourceRefs ||
            [],
    };
}

function filtersForPlan(
    plan,
    input,
) {
    return {
        timelineEpoch:
            plan.constraints
                .timelineEpoch,
        stateRevision:
            plan.constraints
                .stateRevision,
        audience:
            plan.constraints
                .audience,
        clock:
            plan.constraints.clock,
        nodeTypes:
            plan.constraints
                .nodeTypes,
        categories:
            input.categories || [],
        supersededSourceRefs:
            input
                .supersededSourceRefs ||
            [],
    };
}

function normalizedSuppression(...groups) {
    const byKey = new Map();
    for (
        const entry
        of groups.flat()
    ) {
        const recordId =
            String(
                entry?.recordId ||
                '',
            ).trim();
        const reason =
            String(
                entry?.reason ||
                '',
            ).trim();
        if (!recordId || !reason) {
            continue;
        }
        const key =
            `${recordId}:${reason}`;
        if (!byKey.has(key)) {
            byKey.set(key, {
                recordId,
                reason,
            });
        }
    }
    return [...byKey.values()]
        .sort((left, right) =>
            `${
                left.recordId
            }:${
                left.reason
            }`.localeCompare(
                `${
                    right.recordId
                }:${
                    right.reason
                }`,
                'en',
            ));
}

export function exactFallbackKnowledgeQuery(
    records,
    subquery,
    input = {},
) {
    const hydrated =
        hydrateKnowledgeRecords(
            records,
            filtersForSubquery(
                subquery,
                input,
            ),
        );
    return {
        backend: 'local-exact',
        records:
            hydrated.records
                .map(record => ({
                    record,
                    score:
                        exactRecordScore(
                            record,
                            subquery.query,
                            subquery
                                .entityIds,
                        ),
                }))
                .filter(entry =>
                    entry.score > 0 ||
                    (
                        !subquery.query &&
                        !subquery
                            .entityIds
                            .length
                    ))
                .sort((left, right) =>
                    right.score -
                        left.score ||
                    left.record
                        .recordId
                        .localeCompare(
                            right.record
                                .recordId,
                            'en',
                        ))
                .slice(
                    0,
                    subquery.limit,
                )
                .map(entry =>
                    entry.record),
        diagnostics: {
            backend: 'local-exact',
            degraded: true,
            selectedRecordIds: [],
            suppressed:
                hydrated.diagnostics
                    .suppressed,
        },
    };
}

function normalizeBackendResult(
    result,
) {
    return {
        records:
            Array.isArray(
                result?.records,
            )
                ? result.records
                : [],
        diagnostics: {
            backend:
                String(
                    result?.diagnostics
                        ?.backend ||
                    result?.backend ||
                    'unknown',
                ),
            degraded:
                result?.diagnostics
                    ?.degraded ===
                true,
            preferredBackend:
                String(
                    result?.diagnostics
                        ?.preferredBackend ||
                    '',
                ),
            fallback:
                String(
                    result?.diagnostics
                        ?.fallback ||
                    '',
                ),
            errors:
                Array.isArray(
                    result
                        ?.diagnostics
                        ?.errors,
                )
                    ? result
                        .diagnostics
                        .errors
                    : [],
            suppressed:
                Array.isArray(
                    result
                        ?.diagnostics
                        ?.suppressed,
                )
                    ? result
                        .diagnostics
                        .suppressed
                    : [],
        },
    };
}

export class RelationalKnowledgeService {
    constructor({
        vectorService = null,
        localPlanner = null,
    } = {}) {
        if (
            vectorService !== null &&
            typeof vectorService
                ?.query !==
                'function'
        ) {
            throw new TypeError(
                'Relational knowledge vector service must implement query().',
            );
        }
        if (
            localPlanner !== null &&
            typeof localPlanner !==
                'function'
        ) {
            throw new TypeError(
                'Local Planner must be a function.',
            );
        }
        this.vectorService =
            vectorService;
        this.localPlanner =
            localPlanner;
    }

    get name() {
        return this.vectorService
            ?.preferredBackend
            ?.name ||
            this.vectorService
                ?.exactBackend
                ?.name ||
            this.vectorService
                ?.name ||
            'local-exact';
    }

    get exactBackend() {
        return this.vectorService
            ?.exactBackend ||
            null;
    }

    async health(input) {
        return this.vectorService
            ? this.vectorService
                .health(input)
            : {
                exact: {
                    ok: true,
                    backend:
                        'local-exact',
                },
                preferred: {
                    ok: false,
                    configured: false,
                    backend: 'none',
                },
                degraded: false,
            };
    }

    async sync(input) {
        if (!this.vectorService) {
            throw new TypeError(
                'Relational knowledge sync requires a vector service.',
            );
        }
        return this.vectorService
            .sync(input);
    }

    async delete(input) {
        if (!this.vectorService) {
            throw new TypeError(
                'Relational knowledge delete requires a vector service.',
            );
        }
        return this.vectorService
            .delete(input);
    }

    async rebuild(input) {
        if (!this.vectorService) {
            throw new TypeError(
                'Relational knowledge rebuild requires a vector service.',
            );
        }
        return this.vectorService
            .rebuild(input);
    }

    async loadGraphRecords(
        input,
        plan,
    ) {
        if (
            !this.exactBackend ||
            typeof this.exactBackend
                .query !==
                'function'
        ) {
            return {
                records: [],
                suppressed: [],
            };
        }
        const result =
            await this.exactBackend
                .query({
                    timelineId:
                        String(
                            input.timelineId ||
                            '',
                        ),
                    query: '',
                    entityIds: [],
                    limit:
                        Math.min(
                            2_000,
                            Math.max(
                                1,
                                Number(
                                    input
                                        .graphRecordLimit,
                                ) ||
                                2_000,
                            ),
                        ),
                    filters:
                        filtersForPlan(
                            plan,
                            input,
                        ),
                });
        return {
            records:
                Array.isArray(
                    result?.records,
                )
                    ? result.records
                    : [],
            suppressed:
                Array.isArray(
                    result?.diagnostics
                        ?.suppressed,
                )
                    ? result
                        .diagnostics
                        .suppressed
                    : [],
        };
    }

    async query(input = {}) {
        const actorIds =
            stableUnique([
                ...(
                    input.actorIds ||
                    []
                ),
                ...(
                    input.audience
                        ?.actorIds ||
                    []
                ),
            ]);
        const audience = {
            ...(input.audience ||
                {}),
            actorIds,
        };
        const plan =
            await createKnowledgeRetrievalPlan(
                {
                    ...input,
                    audience,
                },
                {
                    localPlanner:
                        this
                            .localPlanner,
                },
            );
        let storedGraph = {
            records: [],
            suppressed: [],
        };
        try {
            storedGraph =
                await this
                    .loadGraphRecords(
                        input,
                        plan,
                    );
        } catch {
            storedGraph = {
                records: [],
                suppressed: [],
            };
        }
        const fallbackRecords =
            uniqueRecords(
                storedGraph.records,
                input.fallbackRecords ||
                    [],
                input.graphRecords ||
                    [],
            );
        const rankings = [];
        const backendDiagnostics =
            [];
        for (
            const subquery
            of plan.subqueries
        ) {
            let result = null;
            if (this.vectorService) {
                try {
                    result =
                        normalizeBackendResult(
                            await this
                                .vectorService
                                .query({
                                    timelineId:
                                        String(
                                            input.timelineId ||
                                            '',
                                        ),
                                    query:
                                        subquery.query,
                                    entityIds:
                                        subquery
                                            .entityIds,
                                    limit:
                                        subquery.limit,
                                    filters:
                                        filtersForSubquery(
                                            subquery,
                                            input,
                                        ),
                                }),
                        );
                } catch (error) {
                    backendDiagnostics
                        .push({
                            subqueryId:
                                subquery.id,
                            backend:
                                this
                                    .vectorService
                                    .name ||
                                'vector',
                            preferredBackend:
                                this
                                    .vectorService
                                    .name ||
                                'vector',
                            degraded:
                                true,
                            fallback:
                                'local-exact',
                            errors: [
                                String(
                                    error
                                        ?.message ||
                                    error,
                                ).slice(
                                    0,
                                    500,
                                ),
                            ],
                        });
                }
            }
            if (
                !result ||
                (
                    !result.records
                        .length &&
                    fallbackRecords
                        .length
                )
            ) {
                const exact =
                    exactFallbackKnowledgeQuery(
                        fallbackRecords,
                        subquery,
                        input,
                    );
                if (
                    result?.records
                        .length
                ) {
                    exact.records =
                        uniqueRecords(
                            result.records,
                            exact.records,
                        ).slice(
                            0,
                            subquery
                                .limit,
                        );
                }
                result =
                    normalizeBackendResult(
                        exact,
                    );
            }
            rankings.push({
                subqueryId:
                    subquery.id,
                records:
                    result.records,
            });
            backendDiagnostics.push({
                subqueryId:
                    subquery.id,
                backend:
                    result
                        .diagnostics
                        .backend,
                preferredBackend:
                    result
                        .diagnostics
                        .preferredBackend,
                degraded:
                    result
                        .diagnostics
                        .degraded,
                fallback:
                    result
                        .diagnostics
                        .fallback ||
                    (
                        result
                            .diagnostics
                            .backend ===
                            'local-exact'
                            ? 'local-exact'
                            : ''
                    ),
                errors:
                    result
                        .diagnostics
                        .errors,
                suppressed:
                    result
                        .diagnostics
                        .suppressed,
            });
        }
        const fused =
            fuseKnowledgeRankings(
                rankings,
            );
        const graphCandidates =
            uniqueRecords(
                fallbackRecords,
                fused.map(entry =>
                    entry.record),
            );
        const graphHydration =
            hydrateKnowledgeRecords(
                graphCandidates,
                filtersForPlan(
                    plan,
                    input,
                ),
            );
        const graph =
            buildRelationalSynapseGraph({
                records:
                    graphHydration
                        .records,
                socialEvidence:
                    input
                        .socialEvidence ||
                    [],
                entityRelations:
                    input
                        .entityRelations ||
                    [],
            });
        const expanded =
            expandRelationalActivation(
                graph,
                fused,
                {
                    maximumHops: 2,
                    edgeDecay:
                        input
                            .edgeDecay ??
                        0.7,
                },
            );
        const reranked =
            rerankRelationalKnowledge(
                expanded,
                {
                    query:
                        plan.query,
                    clock:
                        plan.constraints
                            .clock,
                },
            );
        const budgeted =
            trimRelationalKnowledgeBudget(
                reranked,
                {
                    tokenBudget:
                        input
                            .tokenBudget ??
                        1_600,
                    maximumRecords:
                        input
                            .maximumRecords ??
                        24,
                },
            );
        const finalHydration =
            hydrateKnowledgeRecords(
                budgeted.records
                    .map(entry =>
                        entry.record),
                filtersForPlan(
                    plan,
                    input,
                ),
            );
        const finalRecordIds =
            new Set(
                finalHydration.records
                    .map(record =>
                        record.recordId),
            );
        const finalEntries =
            budgeted.records
                .filter(entry =>
                    finalRecordIds.has(
                        entry.record
                            .recordId,
                    ));
        const activationCapsules =
            buildSealedActivationCapsules(
                finalEntries,
                {
                    actorIds,
                    timelineEpoch:
                        plan.constraints
                            .timelineEpoch,
                    stateRevision:
                        plan.constraints
                            .stateRevision,
                    clock:
                        plan.constraints
                            .clock,
                    commonFactLimit:
                        input
                            .commonFactLimit ??
                        6,
                    queryAnchors: [
                        plan.query,
                    ],
                },
            );
        const selectedRecordIds =
            finalEntries.map(entry =>
                entry.record.recordId);
        const backend =
            backendDiagnostics
                .at(-1)
                ?.backend ||
            this.name;
        const preferredBackend =
            backendDiagnostics
                .find(item =>
                    item
                        .preferredBackend)
                ?.preferredBackend ||
            (
                backendDiagnostics
                    .find(item =>
                        item.degraded &&
                        item.fallback &&
                        item.backend !==
                            'local-exact')
                    ?.backend
            ) ||
            'none';
        const suppression =
            normalizedSuppression(
                storedGraph.suppressed,
                backendDiagnostics
                    .flatMap(item =>
                        item.suppressed ||
                        []),
                graphHydration
                    .diagnostics
                    .suppressed,
                graph.diagnostics
                    .suppressed ||
                    [],
                finalHydration
                    .diagnostics
                    .suppressed,
            );
        return {
            plan,
            records:
                finalEntries.map(
                    entry =>
                        entry.record,
                ),
            activationCapsules,
            diagnostics: {
                planner:
                    plan.diagnostics,
                plannerSubqueries:
                    plan.subqueries.map(
                        subquery => ({
                            id:
                                subquery.id,
                            intent:
                                subquery
                                    .intent,
                            nodeTypes:
                                subquery
                                    .nodeTypes,
                        }),
                    ),
                backend,
                preferredBackend,
                backendQueries:
                    backendDiagnostics,
                degraded:
                    backendDiagnostics
                        .some(item =>
                            item.degraded),
                graph: {
                    ...graph
                        .diagnostics,
                    maximumHops: 2,
                    edgeDecay:
                        input
                            .edgeDecay ??
                        0.7,
                    fanPenalty:
                        'inverse_sqrt_degree',
                    fallback:
                        graph.edges.length
                            ? ''
                            : fused.length
                                ? 'seed_only'
                                : 'empty',
                },
                selectedRecordIds,
                records:
                    finalEntries.map(
                        entry => ({
                            recordId:
                                entry
                                    .record
                                    .recordId,
                            hop:
                                entry.hop,
                            sourceRefs:
                                entry
                                    .sourceRefs,
                        }),
                    ),
                sourcePaths:
                    finalEntries.map(
                        entry => ({
                            recordId:
                                entry
                                    .record
                                    .recordId,
                            hop:
                                entry.hop,
                            sourceRefs:
                                entry
                                    .sourceRefs,
                        }),
                    ),
                budget: {
                    tokenBudget:
                        budgeted
                            .tokenBudget,
                    usedTokens:
                        budgeted
                            .usedTokens,
                    omittedRecordIds:
                        budgeted
                            .omittedRecordIds,
                },
                hydrationSuppressed:
                    suppression,
                suppression,
                suppressed:
                    suppression,
                callCounts: {
                    high: 0,
                    medium: 0,
                    low: 0,
                    localPlanner:
                        this
                            .localPlanner
                            ? 1
                            : 0,
                },
            },
        };
    }
}

export function createRelationalKnowledgeService(
    options,
) {
    return new RelationalKnowledgeService(
        options,
    );
}
