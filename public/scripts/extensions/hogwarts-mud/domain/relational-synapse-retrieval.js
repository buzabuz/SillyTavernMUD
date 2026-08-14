import {
    computeKnowledgeChecksum,
    hydrateKnowledgeRecords,
    knowledgeClockOrdinal,
    normalizeKnowledgeId,
    normalizeKnowledgeSourceRefs,
} from './knowledge-projector-v2.js';

export const RELATIONAL_SYNAPSE_GRAPH_VERSION = 1;
export const ACTIVATION_CAPSULE_VERSION = 1;
export const MAX_RELATIONAL_HOPS = 2;
export const RELATIONAL_EDGE_WEIGHTS =
    Object.freeze({
        derived_from: 1,
        supports: 0.9,
        contradicts: 0.8,
        about: 0.45,
        temporal: 0.6,
        similar: 0.65,
    });

const SUBJECTIVE_NODE_TYPES =
    new Set([
        'appraisal',
        'schema',
    ]);

function stableCompare(left, right) {
    return String(left).localeCompare(
        String(right),
        'en',
    );
}

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
    ].sort(stableCompare);
}

function recordNodeId(recordId) {
    return `record:${normalizeKnowledgeId(
        recordId,
    )}`;
}

function entityNodeId(entityId) {
    return `entity:${normalizeKnowledgeId(
        entityId,
    )}`;
}

function sourceNodeId(type, id) {
    return `source:${normalizeKnowledgeId(
        type,
    )}:${normalizeKnowledgeId(id)}`;
}

function recordSourceRefs(record) {
    return normalizeKnowledgeSourceRefs(
        record?.sourceRefs,
    ).filter(sourceRef =>
        sourceRef.type !==
            'knowledge_record');
}

function mergeSourceRefs(...groups) {
    return normalizeKnowledgeSourceRefs(
        groups.flat(),
    );
}

function recordPayload(record, key) {
    const direct =
        record?.data?.[key];
    if (
        direct &&
        typeof direct === 'object'
    ) {
        return direct;
    }
    return (
        record?.data &&
        typeof record.data ===
            'object'
    )
        ? record.data
        : {};
}

function referenceIds(value, keys) {
    return stableUnique(
        keys.flatMap(key =>
            value?.[key] || []),
    );
}

function createGraphBuilder() {
    const nodes = new Map();
    const edges = new Map();

    const addNode = node => {
        const existing =
            nodes.get(node.id);
        nodes.set(
            node.id,
            existing
                ? {
                    ...existing,
                    ...node,
                    sourceRefs:
                        mergeSourceRefs(
                            existing
                                .sourceRefs,
                            node.sourceRefs,
                        ),
                }
                : {
                    ...node,
                    sourceRefs:
                        mergeSourceRefs(
                            node.sourceRefs,
                        ),
                },
        );
        return node.id;
    };

    const addEdge = ({
        type,
        from,
        to,
        sourceRefs,
        weight =
        RELATIONAL_EDGE_WEIGHTS[
            type
        ],
    }) => {
        if (
            !from ||
            !to ||
            from === to ||
            !Object.hasOwn(
                RELATIONAL_EDGE_WEIGHTS,
                type,
            )
        ) {
            return;
        }
        const normalizedRefs =
            mergeSourceRefs(
                sourceRefs,
            );
        if (!normalizedRefs.length) {
            return;
        }
        const key =
            `${type}:${from}->${to}`;
        const existing =
            edges.get(key);
        edges.set(key, {
            id:
                `edge_${computeKnowledgeChecksum(
                    key,
                )}`,
            type,
            from,
            to,
            weight:
                Math.min(
                    1,
                    Math.max(
                        0,
                        Number(weight) ||
                        0,
                    ),
                ),
            sourceRefs:
                mergeSourceRefs(
                    existing
                        ?.sourceRefs,
                    normalizedRefs,
                ),
        });
    };

    return {
        nodes,
        edges,
        addNode,
        addEdge,
    };
}

function addRecordNodes(
    builder,
    records,
) {
    const byLookupKey = new Map();
    const byRecordId = new Map();
    const register = (
        key,
        nodeId,
    ) => {
        const normalized =
            String(key || '').trim();
        if (!normalized) return;
        byLookupKey.set(
            normalized,
            nodeId,
        );
        byLookupKey.set(
            normalizeKnowledgeId(
                normalized,
            ),
            nodeId,
        );
    };
    for (const record of records) {
        const recordId =
            normalizeKnowledgeId(
                record.recordId ||
                record.id,
            );
        const nodeId =
            recordNodeId(recordId);
        const sourceRefs =
            recordSourceRefs(record);
        builder.addNode({
            id: nodeId,
            kind: 'record',
            recordId,
            nodeType:
                record.nodeType,
            sourceRefs,
            record,
        });
        byRecordId.set(
            recordId,
            nodeId,
        );
        register(recordId, nodeId);
        register(record.id, nodeId);
        const appraisal =
            recordPayload(
                record,
                'appraisal',
            );
        const schema =
            recordPayload(
                record,
                'schema',
            );
        const event =
            recordPayload(
                record,
                'eventKnowledge',
            );
        register(
            appraisal.id,
            nodeId,
        );
        register(
            schema.id,
            nodeId,
        );
        register(
            event.eventId,
            nodeId,
        );
        for (
            const sourceRef
            of sourceRefs
        ) {
            register(
                `${sourceRef.type}:${sourceRef.id}`,
                nodeId,
            );
            if (
                sourceRef.type ===
                    'event'
            ) {
                register(
                    sourceRef.id,
                    nodeId,
                );
            }
        }
    }
    return {
        byLookupKey,
        byRecordId,
    };
}

function resolveOrAddSourceNode(
    builder,
    lookup,
    type,
    id,
    sourceRefs,
) {
    const existing =
        lookup.get(id) ||
        lookup.get(
            normalizeKnowledgeId(
                id,
            ),
        ) ||
        lookup.get(
            `${type}:${id}`,
        );
    if (existing) return existing;
    const nodeId =
        sourceNodeId(type, id);
    builder.addNode({
        id: nodeId,
        kind: 'source',
        sourceType: type,
        sourceId:
            String(id || ''),
        sourceRefs,
    });
    return nodeId;
}

function addRecordRelations(
    builder,
    records,
    lookup,
) {
    for (const record of records) {
        const from =
            recordNodeId(
                record.recordId ||
                record.id,
            );
        const sourceRefs =
            recordSourceRefs(record);
        for (
            const entityId
            of stableUnique(
                record.entityIds,
            )
        ) {
            const entity =
                entityNodeId(entityId);
            builder.addNode({
                id: entity,
                kind: 'entity',
                entityId,
                sourceRefs,
            });
            builder.addEdge({
                type: 'about',
                from,
                to: entity,
                sourceRefs,
            });
        }
        if (
            record.nodeType ===
                'appraisal'
        ) {
            const appraisal =
                recordPayload(
                    record,
                    'appraisal',
                );
            const eventIds =
                referenceIds(
                    appraisal,
                    [
                        'sourceEventIds',
                    ],
                );
            for (
                const eventId
                of eventIds
            ) {
                const target =
                    resolveOrAddSourceNode(
                        builder,
                        lookup,
                        'event',
                        eventId,
                        sourceRefs,
                    );
                builder.addEdge({
                    type:
                        'derived_from',
                    from,
                    to: target,
                    sourceRefs,
                });
            }
        }
        if (
            record.nodeType ===
                'schema'
        ) {
            const schema =
                recordPayload(
                    record,
                    'schema',
                );
            for (
                const appraisalId
                of referenceIds(
                    schema,
                    [
                        'supportAppraisalIds',
                    ],
                )
            ) {
                const appraisal =
                    resolveOrAddSourceNode(
                        builder,
                        lookup,
                        'appraisal',
                        appraisalId,
                        sourceRefs,
                    );
                builder.addEdge({
                    type: 'supports',
                    from: appraisal,
                    to: from,
                    sourceRefs,
                });
            }
            for (
                const appraisalId
                of referenceIds(
                    schema,
                    [
                        'counterAppraisalIds',
                    ],
                )
            ) {
                const appraisal =
                    resolveOrAddSourceNode(
                        builder,
                        lookup,
                        'appraisal',
                        appraisalId,
                        sourceRefs,
                    );
                builder.addEdge({
                    type:
                        'contradicts',
                    from: appraisal,
                    to: from,
                    sourceRefs,
                });
            }
            for (
                const eventId
                of referenceIds(
                    schema,
                    [
                        'supportEventIds',
                    ],
                )
            ) {
                const event =
                    resolveOrAddSourceNode(
                        builder,
                        lookup,
                        'event',
                        eventId,
                        sourceRefs,
                    );
                builder.addEdge({
                    type: 'derived_from',
                    from,
                    to: event,
                    sourceRefs,
                });
            }
        }
    }
}

function addTemporalEdges(
    builder,
    records,
) {
    const events =
        records
            .filter(record =>
                record.nodeType ===
                    'fact' &&
                knowledgeClockOrdinal(
                    record.effectiveClock,
                ) !== null)
            .sort((left, right) =>
                knowledgeClockOrdinal(
                    left.effectiveClock,
                ) -
                    knowledgeClockOrdinal(
                        right.effectiveClock,
                    ) ||
                stableCompare(
                    left.recordId,
                    right.recordId,
                ));
    for (
        let index = 1;
        index < events.length;
        index++
    ) {
        const previous =
            events[index - 1];
        const current =
            events[index];
        builder.addEdge({
            type: 'temporal',
            from:
                recordNodeId(
                    previous.recordId,
                ),
            to:
                recordNodeId(
                    current.recordId,
                ),
            sourceRefs:
                mergeSourceRefs(
                    recordSourceRefs(
                        previous,
                    ),
                    recordSourceRefs(
                        current,
                    ),
                ),
        });
    }
}

function addSimilarEdges(
    builder,
    records,
    lookup,
    maximumSimilarEdges,
) {
    for (const record of records) {
        const similarIds =
            stableUnique(
                record.data
                    ?.similarRecordIds,
            ).slice(
                0,
                maximumSimilarEdges,
            );
        for (
            const similarId
            of similarIds
        ) {
            const target =
                lookup.get(similarId) ||
                lookup.get(
                    normalizeKnowledgeId(
                        similarId,
                    ),
                );
            if (!target) continue;
            const from =
                recordNodeId(
                    record.recordId,
                );
            if (
                stableCompare(
                    from,
                    target,
                ) >= 0
            ) {
                continue;
            }
            const targetRecord =
                records.find(item =>
                    recordNodeId(
                        item.recordId,
                    ) === target);
            builder.addEdge({
                type: 'similar',
                from,
                to: target,
                sourceRefs:
                    mergeSourceRefs(
                        recordSourceRefs(
                            record,
                        ),
                        recordSourceRefs(
                            targetRecord,
                        ),
                    ),
            });
        }
    }
}

function socialEvidenceSourceRefs(
    evidence,
) {
    return mergeSourceRefs(
        (evidence.sourceEventIds || [])
            .map(id => ({
                type: 'event',
                id,
            })),
        (evidence.sourceMessageIds || [])
            .map(id => ({
                type: 'message',
                id,
            })),
        [{
            type:
                'social_evidence',
            id:
                evidence.id ||
                'unknown',
        }],
    );
}

function addSocialEvidence(
    builder,
    evidenceRecords,
    lookup,
) {
    for (
        const evidence
        of evidenceRecords || []
    ) {
        if (
            !evidence ||
            typeof evidence !==
                'object'
        ) {
            continue;
        }
        const evidenceId =
            normalizeKnowledgeId(
                evidence.id,
                '',
            );
        if (!evidenceId) continue;
        const nodeId =
            `social:${evidenceId}`;
        const sourceRefs =
            socialEvidenceSourceRefs(
                evidence,
            );
        builder.addNode({
            id: nodeId,
            kind:
                'social_evidence',
            evidenceId,
            sourceRefs,
        });
        for (
            const actorId
            of stableUnique([
                evidence.sourceActorId,
                evidence.targetActorId,
                ...(evidence.witnessedBy ||
                    []),
                ...(evidence.knownTo ||
                    []),
            ])
        ) {
            const entity =
                entityNodeId(actorId);
            builder.addNode({
                id: entity,
                kind: 'entity',
                entityId: actorId,
                sourceRefs,
            });
            builder.addEdge({
                type: 'about',
                from: nodeId,
                to: entity,
                sourceRefs,
            });
        }
        for (
            const eventId
            of stableUnique(
                evidence.sourceEventIds,
            )
        ) {
            builder.addEdge({
                type:
                    'derived_from',
                from: nodeId,
                to:
                    resolveOrAddSourceNode(
                        builder,
                        lookup,
                        'event',
                        eventId,
                        sourceRefs,
                    ),
                sourceRefs,
            });
        }
    }
}

function addEntityRelations(
    builder,
    relations,
) {
    for (
        const relation
        of relations || []
    ) {
        const sourceEntityId =
            String(
                relation
                    ?.sourceEntityId ||
                relation?.fromId ||
                '',
            ).trim();
        const targetEntityId =
            String(
                relation
                    ?.targetEntityId ||
                relation?.toId ||
                '',
            ).trim();
        const sourceRefs =
            mergeSourceRefs(
                relation
                    ?.sourceRefs,
            );
        if (
            !sourceEntityId ||
            !targetEntityId ||
            !sourceRefs.length
        ) {
            continue;
        }
        const relationId =
            `relation:${
                normalizeKnowledgeId(
                    relation.id ||
                    `${sourceEntityId}_${targetEntityId}`,
                )
            }`;
        builder.addNode({
            id: relationId,
            kind:
                'entity_relation',
            sourceRefs,
        });
        for (
            const entityId
            of [
                sourceEntityId,
                targetEntityId,
            ]
        ) {
            const entity =
                entityNodeId(entityId);
            builder.addNode({
                id: entity,
                kind: 'entity',
                entityId,
                sourceRefs,
            });
            builder.addEdge({
                type: 'about',
                from: relationId,
                to: entity,
                sourceRefs,
            });
        }
    }
}

export function buildRelationalSynapseGraph({
    records = [],
    socialEvidence = [],
    entityRelations = [],
    maximumSimilarEdges = 4,
} = {}) {
    const candidateRecords =
        (records || [])
            .filter(record =>
                Number(record?.version) ===
                    2 &&
                Number(
                    record
                        ?.projectorVersion,
                ) === 2 &&
                record?.recordId)
            .sort((left, right) =>
                stableCompare(
                    left.recordId,
                    right.recordId,
                ));
    const suppressed = [];
    const normalizedRecords =
        candidateRecords.filter(record => {
            if (
                recordSourceRefs(
                    record,
                ).length
            ) {
                return true;
            }
            suppressed.push({
                recordId:
                    record.recordId,
                reason:
                    'missing_authoritative_source_refs',
            });
            return false;
        });
    const builder =
        createGraphBuilder();
    const {
        byLookupKey,
    } = addRecordNodes(
        builder,
        normalizedRecords,
    );
    addRecordRelations(
        builder,
        normalizedRecords,
        byLookupKey,
    );
    addTemporalEdges(
        builder,
        normalizedRecords,
    );
    addSimilarEdges(
        builder,
        normalizedRecords,
        byLookupKey,
        Math.min(
            8,
            Math.max(
                0,
                Number(
                    maximumSimilarEdges,
                ) || 0,
            ),
        ),
    );
    addSocialEvidence(
        builder,
        socialEvidence,
        byLookupKey,
    );
    addEntityRelations(
        builder,
        entityRelations,
    );
    const nodes =
        [...builder.nodes.values()]
            .sort((left, right) =>
                stableCompare(
                    left.id,
                    right.id,
                ));
    const edges =
        [...builder.edges.values()]
            .sort((left, right) =>
                stableCompare(
                    `${left.type}:${left.from}:${left.to}`,
                    `${right.type}:${right.from}:${right.to}`,
                ));
    return {
        version:
            RELATIONAL_SYNAPSE_GRAPH_VERSION,
        nodes,
        edges,
        diagnostics: {
            inputRecordCount:
                candidateRecords.length,
            recordCount:
                normalizedRecords.length,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            suppressed,
            edgeTypes:
                Object.fromEntries(
                    Object.keys(
                        RELATIONAL_EDGE_WEIGHTS,
                    ).map(type => [
                        type,
                        edges.filter(edge =>
                            edge.type ===
                                type)
                            .length,
                    ]),
                ),
        },
    };
}

export function fuseKnowledgeRankings(
    rankings,
    {
        rankConstant = 60,
    } = {},
) {
    const fused = new Map();
    for (
        const ranking
        of rankings || []
    ) {
        const subqueryId =
            String(
                ranking?.subqueryId ||
                '',
            );
        for (
            const [
                index,
                record,
            ]
            of (
                ranking?.records || []
            ).entries()
        ) {
            if (!record?.recordId) {
                continue;
            }
            const current =
                fused.get(
                    record.recordId,
                ) || {
                    record,
                    rrfScore: 0,
                    ranks: [],
                };
            current.rrfScore +=
                1 /
                (
                    Math.max(
                        1,
                        Number(
                            rankConstant,
                        ) || 60,
                    ) +
                    index +
                    1
                );
            current.ranks.push({
                subqueryId,
                rank: index + 1,
            });
            fused.set(
                record.recordId,
                current,
            );
        }
    }
    return [...fused.values()]
        .sort((left, right) =>
            right.rrfScore -
                left.rrfScore ||
            stableCompare(
                left.record
                    .recordId,
                right.record
                    .recordId,
            ));
}

function graphIndexes(graph) {
    const nodeById =
        new Map(
            (graph?.nodes || [])
                .map(node => [
                    node.id,
                    node,
                ]),
        );
    const adjacency = new Map();
    for (
        const edge
        of graph?.edges || []
    ) {
        for (
            const [
                from,
                to,
                direction,
            ]
            of [
                [
                    edge.from,
                    edge.to,
                    'forward',
                ],
                [
                    edge.to,
                    edge.from,
                    'reverse',
                ],
            ]
        ) {
            const entries =
                adjacency.get(from) ||
                [];
            entries.push({
                edge,
                to,
                direction,
            });
            adjacency.set(
                from,
                entries,
            );
        }
    }
    for (
        const entries
        of adjacency.values()
    ) {
        entries.sort(
            (left, right) =>
                stableCompare(
                    `${left.edge.type}:${left.to}`,
                    `${right.edge.type}:${right.to}`,
                ),
        );
    }
    return {
        nodeById,
        adjacency,
    };
}

export function expandRelationalActivation(
    graph,
    seeds,
    {
        maximumHops =
        MAX_RELATIONAL_HOPS,
        edgeDecay = 0.7,
    } = {},
) {
    const {
        nodeById,
        adjacency,
    } = graphIndexes(graph);
    const hops =
        Math.min(
            MAX_RELATIONAL_HOPS,
            Math.max(
                0,
                Number(
                    maximumHops,
                ) || 0,
            ),
        );
    const decay =
        Math.min(
            1,
            Math.max(
                0,
                Number(edgeDecay) ||
                0,
            ),
        );
    const activation = new Map();
    let frontier = new Map();
    for (const seed of seeds || []) {
        const record =
            seed.record || seed;
        if (!record?.recordId) {
            continue;
        }
        const nodeId =
            recordNodeId(
                record.recordId,
            );
        if (!nodeById.has(nodeId)) {
            continue;
        }
        const score =
            Math.max(
                0,
                Number(
                    seed.rrfScore ??
                    seed.score ??
                    1,
                ) || 0,
            );
        const entry = {
            nodeId,
            record,
            score,
            rrfScore:
                Number(
                    seed.rrfScore ??
                    score,
                ) || 0,
            hop: 0,
            path: [],
            sourceRefs:
                recordSourceRefs(
                    record,
                ),
        };
        const existing =
            activation.get(nodeId);
        if (
            !existing ||
            entry.score >
                existing.score
        ) {
            activation.set(
                nodeId,
                entry,
            );
            frontier.set(
                nodeId,
                entry,
            );
        }
    }
    for (
        let hop = 1;
        hop <= hops;
        hop++
    ) {
        const nextFrontier =
            new Map();
        for (
            const current
            of frontier.values()
        ) {
            const neighbors =
                adjacency.get(
                    current.nodeId,
                ) || [];
            const fanPenalty =
                1 /
                Math.sqrt(
                    Math.max(
                        1,
                        neighbors.length,
                    ),
                );
            for (
                const neighbor
                of neighbors
            ) {
                if (
                    current.path.some(
                        step =>
                            step.from ===
                                neighbor.to)
                ) {
                    continue;
                }
                const score =
                    current.score *
                    neighbor.edge
                        .weight *
                    decay *
                    fanPenalty;
                if (score <= 0) {
                    continue;
                }
                const path = [
                    ...current.path,
                    {
                        edgeId:
                            neighbor
                                .edge.id,
                        type:
                            neighbor
                                .edge.type,
                        from:
                            current
                                .nodeId,
                        to:
                            neighbor.to,
                        direction:
                            neighbor
                                .direction,
                        sourceRefs:
                            neighbor
                                .edge
                                .sourceRefs,
                    },
                ];
                const entry = {
                    nodeId:
                        neighbor.to,
                    record:
                        nodeById.get(
                            neighbor.to,
                        )?.record ||
                        null,
                    score,
                    rrfScore: 0,
                    hop,
                    path,
                    sourceRefs:
                        mergeSourceRefs(
                            current
                                .sourceRefs,
                            neighbor
                                .edge
                                .sourceRefs,
                        ),
                };
                const existing =
                    activation.get(
                        neighbor.to,
                    );
                if (
                    existing &&
                    existing.score >=
                        entry.score
                ) {
                    continue;
                }
                activation.set(
                    neighbor.to,
                    entry,
                );
                nextFrontier.set(
                    neighbor.to,
                    entry,
                );
            }
        }
        frontier = nextFrontier;
        if (!frontier.size) break;
    }
    return [...activation.values()]
        .filter(entry =>
            entry.record)
        .sort((left, right) =>
            right.score -
                left.score ||
            left.hop -
                right.hop ||
            stableCompare(
                left.record
                    .recordId,
                right.record
                    .recordId,
            ));
}

function queryTokens(query) {
    return stableUnique(
        String(query || '')
            .toLocaleLowerCase()
            .split(
                /[^\p{L}\p{N}_-]+/u,
            )
            .filter(token =>
                token.length > 1),
    );
}

function lexicalRelevance(
    record,
    tokens,
) {
    if (!tokens.length) return 0;
    const text =
        `${
            record.title || ''
        } ${
            record.text || ''
        } ${
            (record.tags || [])
                .join(' ')
        }`
            .toLocaleLowerCase();
    return (
        tokens.filter(token =>
            text.includes(token))
            .length /
        tokens.length
    );
}

function recordConfidence(record) {
    const data =
        recordPayload(
            record,
            record.nodeType ===
                'schema'
                ? 'schema'
                : 'appraisal',
        );
    const confidence =
        Number(
            data.confidence ??
            record.data
                ?.confidence,
        );
    return Number.isFinite(
        confidence,
    )
        ? Math.min(
            1,
            Math.max(0, confidence),
        )
        : 0.5;
}

export function rerankRelationalKnowledge(
    activations,
    {
        query = '',
        clock = '',
    } = {},
) {
    const tokens =
        queryTokens(query);
    const currentClock =
        knowledgeClockOrdinal(
            clock,
        );
    const maximumActivation =
        Math.max(
            0.000001,
            ...(
                activations || []
            ).map(entry =>
                entry.score),
        );
    return (activations || [])
        .map(entry => {
            const record =
                entry.record;
            const activation =
                entry.score /
                maximumActivation;
            const lexical =
                lexicalRelevance(
                    record,
                    tokens,
                );
            const authority =
                record.tags
                    ?.includes('current')
                    ? 1
                    : record.tags
                        ?.includes(
                            'superseded',
                        )
                        ? 0
                        : 0.65;
            const confidence =
                recordConfidence(
                    record,
                );
            const ordinal =
                knowledgeClockOrdinal(
                    record
                        .effectiveClock,
                );
            const recency =
                currentClock !== null &&
                ordinal !== null
                    ? Math.max(
                        0,
                        1 -
                        Math.min(
                            1,
                            Math.abs(
                                currentClock -
                                ordinal,
                            ) /
                            100000000,
                        ),
                    )
                    : 0.5;
            const relationship =
                SUBJECTIVE_NODE_TYPES
                    .has(
                        record.nodeType,
                    )
                    ? 1
                    : Math.min(
                        1,
                        Math.max(
                            0,
                            Number(
                                record.data
                                    ?.relationshipSalience,
                            ) ||
                            0.35,
                        ),
                    );
            const score =
                activation * 0.45 +
                lexical * 0.23 +
                authority * 0.13 +
                confidence * 0.08 +
                recency * 0.05 +
                relationship * 0.06;
            return {
                ...entry,
                score:
                    Math.round(
                        score *
                        1_000_000,
                    ) /
                    1_000_000,
                factors: {
                    activation,
                    lexical,
                    authority,
                    confidence,
                    recency,
                    relationship,
                },
            };
        })
        .sort((left, right) =>
            right.score -
                left.score ||
            left.hop -
                right.hop ||
            stableCompare(
                left.record
                    .recordId,
                right.record
                    .recordId,
            ));
}

export function estimateKnowledgeTokens(
    record,
) {
    return Math.max(
        1,
        Math.ceil(
            (
                String(
                    record?.title ||
                    '',
                ).length +
                String(
                    record?.text ||
                    '',
                ).length +
                48
            ) /
            4,
        ),
    );
}

export function trimRelationalKnowledgeBudget(
    ranked,
    {
        tokenBudget = 1_600,
        maximumRecords = 24,
    } = {},
) {
    const budget =
        Math.max(
            0,
            Number(tokenBudget) ||
            0,
        );
    const recordLimit =
        Math.max(
            0,
            Number(
                maximumRecords,
            ) || 0,
        );
    const records = [];
    const omittedRecordIds = [];
    let usedTokens = 0;
    for (
        const entry
        of ranked || []
    ) {
        const cost =
            estimateKnowledgeTokens(
                entry.record,
            );
        if (
            records.length >=
                recordLimit ||
            usedTokens + cost >
                budget
        ) {
            omittedRecordIds.push(
                entry.record.recordId,
            );
            continue;
        }
        usedTokens += cost;
        records.push({
            ...entry,
            estimatedTokens: cost,
        });
    }
    return {
        records,
        usedTokens,
        tokenBudget: budget,
        omittedRecordIds:
            stableUnique(
                omittedRecordIds,
            ),
    };
}

function hydratedRecordIds(
    entries,
    filters,
) {
    return new Set(
        hydrateKnowledgeRecords(
            entries.map(entry =>
                entry.record),
            filters,
        ).records.map(record =>
            record.recordId),
    );
}

function subjectiveValue(
    record,
) {
    return recordPayload(
        record,
        record.nodeType ===
            'schema'
            ? 'schema'
            : 'appraisal',
    );
}

const SLOW_PATH_ANCHOR_STOP_WORDS =
    new Set([
        'about',
        'after',
        'before',
        'from',
        'have',
        'that',
        'their',
        'there',
        'they',
        'this',
        'with',
        'would',
    ]);

function anchorTokens(value) {
    return stableUnique(
        (
            Array.isArray(value)
                ? value
                : [value]
        )
            .flatMap(anchor =>
                String(anchor || '')
                    .toLocaleLowerCase()
                    .match(
                        /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu,
                    ) || [])
            .filter(token =>
                token.length >= 4 &&
                !SLOW_PATH_ANCHOR_STOP_WORDS
                    .has(token)),
    );
}

function canonicalSupportEventId(record) {
    const eventId =
        String(
            recordPayload(
                record,
                'eventKnowledge',
            ).eventId || '',
        ).trim();
    return (
        record.nodeType === 'fact' &&
        eventId &&
        recordSourceRefs(record)
            .some(ref =>
                ref.type === 'event' &&
                ref.id === eventId)
    )
        ? eventId
        : '';
}

function eventMatchesAnchors(
    record,
    anchors,
) {
    if (!anchors.length) return false;
    const text =
        [
            record.title,
            record.text,
            record.sceneId,
            record.effectiveClock,
        ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
    return anchors.some(anchor =>
        text.includes(anchor));
}

function capsuleEvent(record) {
    return {
        recordId:
            record.recordId,
        text:
            String(
                record.text || '',
            ),
        sceneId:
            record.sceneId ||
            '',
        effectiveClock:
            record.effectiveClock ||
            '',
        sourceRefs:
            recordSourceRefs(
                record,
            ),
    };
}

function sealCapsule(value) {
    const capsule = {
        ...value,
        capsuleId: '',
        sealed: true,
    };
    capsule.capsuleId =
        `activation_${computeKnowledgeChecksum(
            capsule,
        )}`;
    return deepFreeze(capsule);
}

function deepFreeze(value) {
    if (
        !value ||
        typeof value !== 'object' ||
        Object.isFrozen(value)
    ) {
        return value;
    }
    for (
        const child
        of Object.values(value)
    ) {
        deepFreeze(child);
    }
    return Object.freeze(value);
}

function observerCapsule(
    actorId,
    entries,
    constraints,
    queryAnchors,
    retainedEventIds,
) {
    const allowedIds =
        hydratedRecordIds(
            entries,
            {
                ...constraints,
                audience: {
                    actorIds: [
                        actorId,
                    ],
                    includePublic:
                        true,
                    includeLocked:
                        false,
                },
            },
        );
    const visible =
        entries
            .map(entry =>
                entry.record)
            .filter(record =>
                allowedIds.has(
                    record.recordId,
                ));
    const eventById =
        new Map();
    for (const record of visible) {
        const eventId =
            canonicalSupportEventId(
                record,
            );
        if (eventId) {
            eventById.set(
                eventId,
                record,
            );
        }
    }
    const schemaRecords =
        visible
            .filter(record => {
                if (
                    record.nodeType !==
                        'schema'
                ) {
                    return false;
                }
                const schema =
                    subjectiveValue(
                        record,
                    );
                return (
                    schema.observerId ===
                        actorId &&
                    [
                        'active',
                        'contested',
                    ].includes(
                        schema.status,
                    )
                );
            })
            .slice(0, 3);
    const expectations =
        schemaRecords.map(record => {
            const schema =
                subjectiveValue(
                    record,
                );
            return {
                schemaId:
                    schema.id ||
                    record.recordId,
                observerId:
                    schema.observerId,
                targetId:
                    schema.targetId,
                expectationEn:
                    String(
                        schema.expectationEn ||
                        '',
                    ),
                confidence:
                    recordConfidence(
                        record,
                    ),
                status:
                    schema.status,
            };
        });
    const supportingEvents = [];
    const addEvent = (
        record,
        target,
    ) => {
        if (
            !record ||
            target.some(event =>
                event.recordId ===
                    record.recordId)
        ) {
            return;
        }
        target.push(
            capsuleEvent(record),
        );
    };
    for (
        const schemaRecord
        of schemaRecords
    ) {
        const schema =
            subjectiveValue(
                schemaRecord,
            );
        for (const eventId of (
            schema.supportEventIds || []
        )) {
            const eventRecord =
                eventById.get(eventId);
            if (
                eventMatchesAnchors(
                    eventRecord || {},
                    queryAnchors,
                )
            ) {
                addEvent(
                    eventRecord,
                    supportingEvents,
                );
            }
            if (
                supportingEvents.length >= 3
            ) {
                break;
            }
        }
        if (
            supportingEvents.length >=
                3
        ) {
            break;
        }
    }
    for (const eventId of
        retainedEventIds || []) {
        const eventRecord =
            eventById.get(
                eventId,
            );
        if (
            eventMatchesAnchors(
                eventRecord || {},
                queryAnchors,
            )
        ) {
            addEvent(
                eventRecord,
                supportingEvents,
            );
        }
        if (
            supportingEvents.length >=
                3
        ) {
            break;
        }
    }
    const sourceIds =
        stableUnique([
            ...schemaRecords.flatMap(
                record => [
                    record.recordId,
                    ...recordSourceRefs(
                        record,
                    ).map(ref => ref.id),
                ]),
            ...supportingEvents
                .flatMap(event => [
                    event.recordId,
                    ...event.sourceRefs
                        .map(ref =>
                            ref.id),
                ]),
        ]);
    const confidences =
        expectations.map(
            expectation =>
                expectation.confidence,
        );
    return sealCapsule({
        version:
            ACTIVATION_CAPSULE_VERSION,
        scope: 'observer',
        observerId: actorId,
        expectations,
        supportingEvents:
            supportingEvents.slice(
                0,
                3,
            ),
        sourceIds,
        confidence:
            confidences.length
                ? Math.round(
                    (
                        confidences
                            .reduce(
                                (
                                    sum,
                                    value,
                                ) =>
                                    sum +
                                    value,
                                0,
                            ) /
                        confidences
                            .length
                    ) *
                    1000,
                ) /
                1000
                : 0,
    });
}

export function buildSealedActivationCapsules(
    rankedEntries,
    {
        actorIds = [],
        timelineEpoch = '',
        stateRevision,
        clock = '',
        commonFactLimit = 6,
        queryAnchors = [],
        retainedEventIdsByActorId =
            {},
    } = {},
) {
    const entries =
        rankedEntries || [];
    const constraints = {
        timelineEpoch,
        ...(stateRevision === undefined
            ? {}
            : {
                stateRevision,
            }),
        clock,
    };
    const commonIds =
        hydratedRecordIds(
            entries,
            {
                ...constraints,
                audience: {
                    actorIds: [],
                    includePublic:
                        true,
                    includeLocked:
                        false,
                },
            },
        );
    const commonFacts =
        entries
            .map(entry =>
                entry.record)
            .filter(record =>
                commonIds.has(
                    record.recordId,
                ) &&
                !SUBJECTIVE_NODE_TYPES
                    .has(
                        record.nodeType,
                    ))
            .slice(
                0,
                Math.max(
                    0,
                    Number(
                        commonFactLimit,
                    ) || 0,
                ),
            )
            .map(capsuleEvent);
    const common =
        sealCapsule({
            version:
                ACTIVATION_CAPSULE_VERSION,
            scope: 'common',
            observerId: '',
            facts: commonFacts,
            sourceIds:
                stableUnique(
                    commonFacts
                        .flatMap(fact => [
                            fact.recordId,
                            ...fact
                                .sourceRefs
                                .map(ref =>
                                    ref.id),
                        ]),
                ),
            confidence:
                commonFacts.length
                    ? 1
                    : 0,
        });
    const byActorId =
        Object.fromEntries(
            stableUnique(actorIds)
                .map(actorId => [
                    actorId,
                    observerCapsule(
                        actorId,
                        entries,
                        constraints,
                        anchorTokens(
                            queryAnchors,
                        ),
                        retainedEventIdsByActorId[
                            actorId
                        ] ||
                        [],
                    ),
                ]),
        );
    return deepFreeze({
        version:
            ACTIVATION_CAPSULE_VERSION,
        common,
        byActorId,
    });
}
