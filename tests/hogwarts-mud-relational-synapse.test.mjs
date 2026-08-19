/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createKnowledgeRecordV2,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    createDeterministicRetrievalPlan,
    createKnowledgeRetrievalPlan,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-retrieval-planner.js';
import {
    buildRelationalSynapseGraph,
    buildSealedActivationCapsules,
    estimateKnowledgeTokens,
    expandRelationalActivation,
    fuseKnowledgeRankings,
    rerankRelationalKnowledge,
    trimRelationalKnowledgeBudget,
} from '../public/scripts/extensions/hogwarts-mud/domain/relational-synapse-retrieval.js';
import {
    createRelationalKnowledgeService,
} from '../src/hogwarts-mud/knowledge-relational-service.js';

const TIMELINE_EPOCH = 'epoch_task3';
const STATE_REVISION = 7;
const CLOCK = '1991-09-03 · 17:00';

function record(overrides = {}) {
    return createKnowledgeRecordV2({
        category: 'events',
        recordId: 'events_corridor_help',
        nodeType: 'fact',
        title: 'Corridor help',
        text:
            'Hermione offered help in the rain-soaked corridor.',
        entityIds: [
            'hermione',
            'player',
        ],
        tags: ['current'],
        timelineEpoch:
            TIMELINE_EPOCH,
        stateRevision:
            STATE_REVISION,
        sourceRefs: [{
            type: 'event',
            id: 'event_corridor_help',
        }],
        visibility: {
            scope: 'public',
            actorIds: [],
        },
        effectiveClock:
            '1991-09-03 · 16:00',
        sceneId: 'scene_corridor',
        data: {
            eventKnowledge: {
                eventId:
                    'event_corridor_help',
            },
        },
        ...overrides,
    });
}

function createGraphFixture() {
    const supportEvent = record({
        data: {
            eventKnowledge: {
                eventId:
                    'event_corridor_help',
            },
            similarRecordIds: [
                'events_courtyard_help',
            ],
        },
    });
    const counterEvent = record({
        recordId:
            'events_courtyard_help',
        title: 'Courtyard help',
        text:
            'The player accepted quiet help in the courtyard.',
        sourceRefs: [{
            type: 'event',
            id: 'event_courtyard_help',
        }],
        effectiveClock:
            '1991-09-03 · 16:30',
        sceneId: 'scene_courtyard',
        data: {
            eventKnowledge: {
                eventId:
                    'event_courtyard_help',
            },
        },
    });
    const supportAppraisal = record({
        category: 'appraisals',
        recordId:
            'appraisals_hermione_help',
        nodeType: 'appraisal',
        title: 'Hermione appraisal',
        text:
            'Hermione interprets the refusal as defensive pride.',
        sourceRefs: [{
            type: 'appraisal',
            id: 'appraisal_help',
        }],
        data: {
            appraisal: {
                id: 'appraisal_help',
                observerId: 'hermione',
                targetId: 'player',
                sourceEventIds: [
                    'event_corridor_help',
                ],
                confidence: 0.85,
            },
        },
    });
    const counterAppraisal = record({
        category: 'appraisals',
        recordId:
            'appraisals_hermione_counter',
        nodeType: 'appraisal',
        title: 'Hermione counter appraisal',
        text:
            'Hermione notices that private help can be accepted.',
        sourceRefs: [{
            type: 'appraisal',
            id: 'appraisal_counter',
        }],
        data: {
            appraisal: {
                id: 'appraisal_counter',
                observerId: 'hermione',
                targetId: 'player',
                sourceEventIds: [
                    'event_courtyard_help',
                ],
                confidence: 0.8,
            },
        },
    });
    const schema = record({
        category: 'schemas',
        recordId:
            'schemas_hermione_help',
        nodeType: 'schema',
        title:
            'Proudly deflects visible help',
        text:
            'Hermione expects the player to refuse visible help.',
        sourceRefs: [{
            type: 'schema',
            id: 'schema_help',
        }],
        data: {
            schema: {
                id: 'schema_help',
                observerId: 'hermione',
                targetId: 'player',
                labelEn:
                    'Proudly deflects visible help',
                expectationEn:
                    'Hermione expects the player to refuse help when embarrassment has an audience.',
                confidence: 0.82,
                status: 'active',
                supportAppraisalIds: [
                    'appraisal_help',
                ],
                counterAppraisalIds: [
                    'appraisal_counter',
                ],
            },
        },
    });
    return {
        supportEvent,
        counterEvent,
        supportAppraisal,
        counterAppraisal,
        schema,
        records: [
            supportEvent,
            counterEvent,
            supportAppraisal,
            counterAppraisal,
            schema,
        ],
    };
}

function createObserverRecords(
    observerId,
) {
    const supportRecords = [];
    const supportIds = [];
    for (
        let index = 1;
        index <= 3;
        index++
    ) {
        const eventId =
            `event_${observerId}_support_${index}`;
        const appraisalId =
            `appraisal_${observerId}_support_${index}`;
        supportIds.push(appraisalId);
        supportRecords.push(
            record({
                recordId:
                    `events_${observerId}_support_${index}`,
                title:
                    `${observerId} support event ${index}`,
                text:
                    `${observerId} observed support event ${index}.`,
                sourceRefs: [{
                    type: 'event',
                    id: eventId,
                }],
                visibility: {
                    scope: 'actor',
                    actorIds: [
                        observerId,
                    ],
                },
                sceneId:
                    index === 1
                        ? 'scene_corridor'
                        : 'scene_library',
                data: {
                    eventKnowledge: {
                        eventId,
                    },
                },
            }),
            record({
                category:
                    'appraisals',
                recordId:
                    `appraisals_${observerId}_support_${index}`,
                nodeType:
                    'appraisal',
                title:
                    `${observerId} appraisal ${index}`,
                text:
                    `${observerId} forms private appraisal ${index}.`,
                sourceRefs: [{
                    type: 'appraisal',
                    id: appraisalId,
                }],
                visibility: {
                    scope: 'actor',
                    actorIds: [
                        observerId,
                    ],
                },
                data: {
                    appraisal: {
                        id: appraisalId,
                        observerId,
                        targetId:
                            'player',
                        sourceEventIds: [
                            eventId,
                        ],
                        confidence: 0.8,
                    },
                },
            }),
        );
    }
    const counterEventId =
        `event_${observerId}_counter`;
    const counterAppraisalId =
        `appraisal_${observerId}_counter`;
    const counterRecords = [
        record({
            recordId:
                `events_${observerId}_counter`,
            title:
                `${observerId} counter event`,
            text:
                `${observerId} observed a relevant counterexample.`,
            sourceRefs: [{
                type: 'event',
                id: counterEventId,
            }],
            visibility: {
                scope: 'actor',
                actorIds: [
                    observerId,
                ],
            },
            sceneId: 'scene_courtyard',
            data: {
                eventKnowledge: {
                    eventId:
                        counterEventId,
                },
            },
        }),
        record({
            category: 'appraisals',
            recordId:
                `appraisals_${observerId}_counter`,
            nodeType: 'appraisal',
            title:
                `${observerId} counter appraisal`,
            text:
                `${observerId} records a private counter appraisal.`,
            sourceRefs: [{
                type: 'appraisal',
                id:
                    counterAppraisalId,
            }],
            visibility: {
                scope: 'actor',
                actorIds: [
                    observerId,
                ],
            },
            data: {
                appraisal: {
                    id:
                        counterAppraisalId,
                    observerId,
                    targetId: 'player',
                    sourceEventIds: [
                        counterEventId,
                    ],
                    confidence: 0.75,
                },
            },
        }),
    ];
    const schemaId =
        `schema_${observerId}_player`;
    const schema = record({
        category: 'schemas',
        recordId:
            `schemas_${observerId}_player`,
        nodeType: 'schema',
        title:
            `${observerId} private expectation`,
        text:
            `${observerId} expects a repeated private pattern.`,
        sourceRefs: [{
            type: 'schema',
            id: schemaId,
        }],
        visibility: {
            scope: 'actor',
            actorIds: [
                observerId,
            ],
        },
        data: {
            schema: {
                id: schemaId,
                observerId,
                targetId: 'player',
                factPatternEn:
                    `${observerId} observed a repeated private pattern.`,
                interpretationEn:
                    `${observerId} interprets it as a stable tendency.`,
                expectationEn:
                    `${observerId} expects the player to repeat this behavior.`,
                confidence: 0.8,
                status: 'active',
                supportAppraisalIds:
                    supportIds,
                supportEventIds:
                    supportIds.map(
                        (_id, index) =>
                            `event_${observerId}_support_${index + 1}`,
                    ),
                counterAppraisalIds: [
                    counterAppraisalId,
                ],
            },
        },
    });
    return [
        schema,
        ...supportRecords,
        ...counterRecords,
    ];
}

test('deterministic Planner uses one bounded raw-query retrieval without keyword intent routing', async () => {
    const plan =
        createDeterministicRetrievalPlan({
            query:
                'Why did the relationship change, what happened after, and who was involved?',
            audience: {
                actorIds: [
                    'ron',
                    'hermione',
                    'ron',
                ],
                role: 'actor',
            },
            timelineEpoch:
                TIMELINE_EPOCH,
            stateRevision:
                STATE_REVISION,
            clock: CLOCK,
            entityIds: [
                'player',
                'hermione',
                'player',
            ],
            nodeTypes: [
                'schema',
                'fact',
            ],
            limit: 99,
        });

    assert.equal(
        plan.subqueries.length,
        1,
    );
    assert.deepEqual(
        plan.subqueries.map(
            subquery =>
                subquery.intent,
        ),
        ['direct'],
    );
    assert.equal(
        plan.subqueries[0].query,
        plan.query,
    );
    assert.deepEqual(
        plan.constraints
            .audience.actorIds,
        [
            'hermione',
            'ron',
        ],
    );
    assert.deepEqual(
        plan.constraints.entityIds,
        [
            'hermione',
            'player',
        ],
    );
    assert.ok(
        plan.subqueries.every(
            subquery =>
                subquery.limit === 24 &&
                subquery.timelineEpoch ===
                    TIMELINE_EPOCH &&
                subquery.stateRevision ===
                    STATE_REVISION &&
                subquery.clock ===
                    CLOCK,
        ),
    );

    for (const query of [
        'Who was involved?',
        'What pattern keeps repeating?',
        '为什么会导致这个结果？',
    ]) {
        const candidatePlan =
            createDeterministicRetrievalPlan({
                query,
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
            });
        assert.deepEqual(
            candidatePlan.subqueries.map(
                subquery =>
                    subquery.intent,
            ),
            ['direct'],
        );
        assert.equal(
            candidatePlan.subqueries[0]
                .query,
            query,
        );
    }

    const localPlan =
        await createKnowledgeRetrievalPlan(
            {
                query:
                    'What pattern keeps repeating?',
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
            },
            {
                localPlanner:
                    async () => ({
                        subqueries: [
                            {
                                intent:
                                    'pattern',
                            },
                            {
                                intent:
                                    'direct',
                            },
                        ],
                    }),
            },
        );
    assert.equal(
        localPlan.source,
        'local',
    );
    assert.deepEqual(
        localPlan.subqueries.map(
            subquery =>
                subquery.intent,
        ),
        [
            'pattern',
            'direct',
        ],
    );
});

test('Planner falls back deterministically when the local Planner fails', async () => {
    const plan =
        await createKnowledgeRetrievalPlan(
            {
                query:
                    'Why did Hermione change her mind?',
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
            },
            {
                localPlanner:
                    async () => {
                        throw new Error(
                            'local model unavailable',
                        );
                    },
            },
        );

    assert.equal(
        plan.source,
        'deterministic',
    );
    assert.equal(
        plan.diagnostics.fallback,
        'local_planner_failed',
    );
    assert.match(
        plan.diagnostics.errors[0],
        /local model unavailable/u,
    );
    assert.deepEqual(
        plan.subqueries.map(
            subquery =>
                subquery.intent,
        ),
        ['direct'],
    );
});

test('Relational graph projection is deterministic and keeps typed source-backed edges', () => {
    const fixture =
        createGraphFixture();
    const input = {
        records: fixture.records,
        socialEvidence: [{
            id: 'social_help',
            sourceActorId:
                'hermione',
            targetActorId: 'player',
            sourceEventIds: [
                'event_corridor_help',
            ],
            sourceMessageIds: [101],
        }],
        entityRelations: [{
            id: 'relation_friend',
            sourceEntityId:
                'hermione',
            targetEntityId: 'player',
            sourceRefs: [{
                type:
                    'social_evidence',
                id: 'social_help',
            }],
        }],
    };
    const graph =
        buildRelationalSynapseGraph(
            input,
        );

    assert.deepEqual(
        buildRelationalSynapseGraph(
            input,
        ),
        graph,
    );
    assert.deepEqual(
        new Set(
            graph.edges.map(edge =>
                edge.type),
        ),
        new Set([
            'derived_from',
            'supports',
            'contradicts',
            'about',
            'temporal',
            'similar',
        ]),
    );
    assert.ok(
        graph.edges.every(
            edge =>
                edge.sourceRefs.length >
                0,
        ),
    );
    assert.equal(
        graph.diagnostics
            .recordCount,
        fixture.records.length,
    );
});

test('Relational graph suppresses edges without authoritative sourceRefs', () => {
    const sourced = record({
        recordId:
            'events_sourced_provenance',
        sourceRefs: [{
            type: 'event',
            id: 'event_sourced_provenance',
        }],
        effectiveClock:
            '1991-09-03 · 15:00',
        data: {
            eventKnowledge: {
                eventId:
                    'event_sourced_provenance',
            },
            similarRecordIds: [
                'events_missing_provenance',
            ],
        },
    });
    const missing = record({
        recordId:
            'events_missing_provenance',
        sourceRefs: [],
        effectiveClock:
            '1991-09-03 · 15:30',
        data: {
            eventKnowledge: {
                eventId:
                    'event_missing_provenance',
            },
            similarRecordIds: [
                'events_sourced_provenance',
            ],
        },
    });
    const graph =
        buildRelationalSynapseGraph({
            records: [
                sourced,
                missing,
            ],
        });

    assert.equal(
        graph.edges.some(edge =>
            edge.from.includes(
                missing.recordId,
            ) ||
            edge.to.includes(
                missing.recordId,
            )),
        false,
    );
    assert.equal(
        graph.edges.some(edge =>
            edge.sourceRefs.some(
                sourceRef =>
                    sourceRef.type ===
                    'knowledge_record',
            )),
        false,
    );
    assert.ok(
        graph.diagnostics.suppressed
            .some(entry =>
                entry.recordId ===
                    missing.recordId &&
                entry.reason ===
                    'missing_authoritative_source_refs'),
    );
    assert.equal(
        JSON.stringify(
            graph.diagnostics
                .suppressed,
        ).includes(missing.text),
        false,
    );
});

test('RRF, two-hop activation, reranking, and token trimming stay bounded', () => {
    const fixture =
        createGraphFixture();
    const graph =
        buildRelationalSynapseGraph({
            records: fixture.records,
        });
    const fused =
        fuseKnowledgeRankings([
            {
                subqueryId: 'direct',
                records: [
                    fixture.supportEvent,
                    fixture.schema,
                ],
            },
            {
                subqueryId: 'pattern',
                records: [
                    fixture.schema,
                ],
            },
        ]);
    assert.equal(
        fused[0].record.recordId,
        fixture.schema.recordId,
    );
    assert.equal(
        fused[0].ranks.length,
        2,
    );

    const expanded =
        expandRelationalActivation(
            graph,
            [{
                record:
                    fixture
                        .supportEvent,
                rrfScore: 1,
            }],
            {
                maximumHops: 99,
                edgeDecay: 0.5,
            },
        );
    assert.ok(
        expanded.every(entry =>
            entry.hop <= 2),
    );
    assert.equal(
        expanded.find(entry =>
            entry.record.recordId ===
                fixture
                    .supportAppraisal
                    .recordId)
            .hop,
        1,
    );
    assert.equal(
        expanded.find(entry =>
            entry.record.recordId ===
                fixture.schema
                    .recordId)
            .hop,
        2,
    );

    const reranked =
        rerankRelationalKnowledge(
            expanded,
            {
                query:
                    'Hermione help pride',
                clock: CLOCK,
            },
        );
    assert.ok(
        reranked.every(
            (
                entry,
                index,
            ) =>
                index === 0 ||
                reranked[index - 1]
                    .score >=
                    entry.score,
        ),
    );
    assert.ok(
        Object.hasOwn(
            reranked[0].factors,
            'relationship',
        ),
    );

    const firstCost =
        estimateKnowledgeTokens(
            reranked[0].record,
        );
    const budgeted =
        trimRelationalKnowledgeBudget(
            reranked,
            {
                tokenBudget:
                    firstCost,
                maximumRecords: 1,
            },
        );
    assert.equal(
        budgeted.records.length,
        1,
    );
    assert.equal(
        budgeted.usedTokens,
        firstCost,
    );
    assert.deepEqual(
        new Set([
            ...budgeted.records.map(
                entry =>
                    entry.record
                        .recordId,
            ),
            ...budgeted
                .omittedRecordIds,
        ]),
        new Set(
            reranked.map(entry =>
                entry.record.recordId),
        ),
    );
});

test('sealed activation capsules keep common facts separate from observer memory', () => {
    const common = record({
        recordId:
            'events_great_hall_bell',
        title: 'Great Hall bell',
        text:
            'The Great Hall bell rang at noon.',
        sourceRefs: [{
            type: 'event',
            id:
                'event_great_hall_bell',
        }],
        data: {
            eventKnowledge: {
                eventId:
                    'event_great_hall_bell',
            },
        },
    });
    const records = [
        common,
        ...createObserverRecords(
            'hermione',
        ),
        ...createObserverRecords(
            'ron',
        ),
    ];
    const capsules =
        buildSealedActivationCapsules(
            records.map(
                (
                    current,
                    index,
                ) => ({
                    record: current,
                    score:
                        records.length -
                        index,
                    hop: 0,
                    path: [],
                    sourceRefs:
                        current
                            .sourceRefs,
                }),
            ),
            {
                actorIds: [
                    'ron',
                    'hermione',
                    'draco',
                ],
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
                clock: CLOCK,
            },
        );

    assert.deepEqual(
        capsules.common.facts.map(
            fact =>
                fact.recordId,
        ),
        [
            common.recordId,
        ],
    );
    assert.deepEqual(
        capsules.byActorId
            .hermione
            .expectations
            .map(expectation =>
                Object.keys(
                    expectation,
                ).sort()),
        [
            [
                'confidence',
                'expectationEn',
                'observerId',
                'schemaId',
                'status',
                'targetId',
            ],
        ],
    );
    assert.deepEqual(
        capsules.byActorId.ron
            .expectations
            .map(expectation =>
                expectation.expectationEn),
        [
            'ron expects the player to repeat this behavior.',
        ],
    );
    assert.equal(
        capsules.byActorId
            .hermione
            .supportingEvents
            .length,
        0,
    );
    assert.equal(
        Object.hasOwn(
            capsules.byActorId
                .hermione,
            'counterexample',
        ),
        false,
    );
    const slowCapsules =
        buildSealedActivationCapsules(
            records.map(
                (
                    current,
                    index,
                ) => ({
                    record: current,
                    score:
                        records.length -
                        index,
                    hop: 0,
                    path: [],
                    sourceRefs:
                        current
                            .sourceRefs,
                }),
            ),
            {
                actorIds: [
                    'hermione',
                ],
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
                clock: CLOCK,
                queryAnchors: [
                    'support event',
                ],
            },
        );
    assert.equal(
        slowCapsules.byActorId
            .hermione
            .supportingEvents
            .length,
        3,
    );
    assert.equal(
        capsules.byActorId.draco
            .expectations.length,
        0,
    );
    assert.equal(
        capsules.byActorId
            .hermione.sourceIds
            .some(id =>
                id.includes('ron')),
        false,
    );
    assert.equal(
        Object.isFrozen(
            capsules,
        ),
        true,
    );
    assert.equal(
        Object.isFrozen(
            capsules.byActorId
                .hermione,
        ),
        true,
    );
});

test('relational service survives Planner and vector failures and reports empty graphs', async () => {
    const fallbackRecord =
        record({
            entityIds: [],
        });
    const service =
        createRelationalKnowledgeService({
            vectorService: {
                name:
                    'qdrant-fake',
                async query() {
                    throw new Error(
                        'qdrant unavailable',
                    );
                },
            },
            localPlanner:
                async () => {
                    throw new Error(
                        'planner unavailable',
                    );
                },
        });
    const result =
        await service.query({
            timelineId:
                'timeline_task3',
            timelineEpoch:
                TIMELINE_EPOCH,
            stateRevision:
                STATE_REVISION,
            clock: CLOCK,
            query:
                'corridor help',
            actorIds: ['hermione'],
            audience: {
                actorIds: [
                    'hermione',
                ],
                role: 'actor',
            },
            fallbackRecords: [
                fallbackRecord,
            ],
        });

    assert.deepEqual(
        result.records.map(
            current =>
                current.recordId,
        ),
        [
            fallbackRecord.recordId,
        ],
    );
    assert.equal(
        result.plan.diagnostics
            .fallback,
        'local_planner_failed',
    );
    assert.equal(
        result.diagnostics
            .degraded,
        true,
    );
    assert.ok(
        result.diagnostics
            .backendQueries
            .some(item =>
                item.backend ===
                    'qdrant-fake' &&
                item.degraded),
    );
    assert.ok(
        result.diagnostics
            .backendQueries
            .some(item =>
                item.backend ===
                    'local-exact'),
    );
    assert.equal(
        result.diagnostics.graph
            .fallback,
        'seed_only',
    );
    assert.deepEqual(
        result.diagnostics
            .callCounts,
        {
            high: 0,
            medium: 0,
            low: 0,
            localPlanner: 1,
        },
    );

    const empty =
        await createRelationalKnowledgeService()
            .query({
                timelineId:
                    'timeline_task3',
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
                query:
                    'missing memory',
            });
    assert.deepEqual(
        empty.records,
        [],
    );
    assert.equal(
        empty.diagnostics.graph
            .fallback,
        'empty',
    );
});

test('relational service rehydrates backend and Synapse records before returning them', async () => {
    const wrongNodeType = record({
        category: 'schemas',
        recordId:
            'schemas_wrong_node_type',
        nodeType: 'schema',
        title: 'Private backend text',
        text: 'PRIVATE_BACKEND_TEXT',
        sourceRefs: [{
            type: 'event',
            id: 'event_wrong_node_type',
        }],
        visibility: {
            scope: 'public',
            actorIds: [],
        },
        data: {
            schema: {
                id:
                    'schema_wrong_node_type',
                observerId:
                    'hermione',
                targetId: 'player',
                status: 'active',
            },
        },
    });
    const missingVisibility = {
        ...record({
            recordId:
                'events_missing_visibility',
            title:
                'Missing visibility',
            text:
                'VISIBILITY_BOUNDARY missing.',
        }),
        visibility: undefined,
    };
    const explicitPublic = record({
        recordId:
            'events_explicit_public',
        title:
            'Explicit public',
        text:
            'VISIBILITY_BOUNDARY public.',
        visibility: {
            scope: 'public',
            actorIds: [],
        },
    });
    const actorOnly = record({
        recordId:
            'events_actor_only',
        title:
            'Actor only',
        text:
            'VISIBILITY_BOUNDARY actor.',
        visibility: {
            scope: 'actor',
            actorIds: [
                'hermione',
            ],
        },
    });
    const backendRecords = [
        wrongNodeType,
        missingVisibility,
        explicitPublic,
        actorOnly,
    ];
    const service =
        createRelationalKnowledgeService({
            vectorService: {
                name:
                    'untrusted-vector',
                async query() {
                    return {
                        records:
                            backendRecords,
                        diagnostics: {
                            backend:
                                'untrusted-vector',
                            suppressed: [],
                        },
                    };
                },
            },
        });
    const queryAs =
        actorId =>
            service.query({
                timelineId:
                    'timeline_task3',
                timelineEpoch:
                    TIMELINE_EPOCH,
                stateRevision:
                    STATE_REVISION,
                clock: CLOCK,
                query:
                    'VISIBILITY_BOUNDARY',
                audience: {
                    actorIds: [
                        actorId,
                    ],
                    role: 'actor',
                },
                nodeTypes: ['fact'],
                graphRecords:
                    backendRecords,
            });
    const result =
        await queryAs('ron');

    assert.deepEqual(
        result.records.map(current =>
            current.recordId),
        [
            explicitPublic.recordId,
        ],
    );
    assert.ok(
        result.diagnostics
            .suppression.some(entry =>
                entry.recordId ===
                    missingVisibility.recordId &&
                entry.reason ===
                    'audience'),
    );
    assert.ok(
        result.diagnostics
            .suppression.some(entry =>
                entry.recordId ===
                    wrongNodeType.recordId &&
                entry.reason ===
                    'node_type'),
    );
    assert.equal(
        JSON.stringify(
            result.diagnostics,
        ).includes(
            wrongNodeType.text,
        ),
        false,
    );

    const actorResult =
        await queryAs('hermione');
    assert.deepEqual(
        actorResult.records
            .map(current =>
                current.recordId)
            .sort(),
        [
            actorOnly.recordId,
            explicitPublic.recordId,
        ],
    );
});
