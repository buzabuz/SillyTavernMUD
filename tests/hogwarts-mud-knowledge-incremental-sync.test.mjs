/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createKnowledgeRecordV2,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    createQdrantKnowledgeBackend,
} from '../src/hogwarts-mud/knowledge-qdrant-backend.js';
import {
    deterministicVectorPointId,
    FakeVectorBackend,
} from '../src/hogwarts-mud/knowledge-vector-backend.js';
import {
    createKnowledgeVectorService,
} from '../src/hogwarts-mud/knowledge-vector-service.js';

function record(
    recordId,
    text,
    stateRevision,
) {
    return createKnowledgeRecordV2({
        category: 'events',
        recordId,
        nodeType: 'fact',
        title: recordId,
        text,
        entityIds: [
            recordId,
        ],
        tags: [
            'current',
        ],
        timelineEpoch: 'epoch_a',
        stateRevision,
        sourceRefs: [{
            type: 'message',
            id: '42',
        }],
        visibility: {
            scope: 'public',
            actorIds: [],
        },
        effectiveClock:
            '1991-09-02 · 18:30',
        sceneId: 'common_room',
        data: {},
    });
}

function jsonResponse(
    status,
    body = {},
) {
    return {
        ok:
            status >= 200 &&
            status < 300,
        status,
        async json() {
            return body;
        },
        async text() {
            return JSON.stringify(
                body,
            );
        },
    };
}

function createHarness() {
    let collectionExists = true;
    let vectorSize = 3;
    const points = new Map();
    const embedCalls = [];
    const fetchImpl = async (
        url,
        options = {},
    ) => {
        const pathname =
            new URL(url).pathname;
        const body =
            options.body
                ? JSON.parse(options.body)
                : null;
        if (
            options.method === 'GET' &&
            pathname.includes('/collections/')
        ) {
            return collectionExists
                ? jsonResponse(
                    200,
                    {
                        result: {
                            config: {
                                params: {
                                    vectors: {
                                        size:
                                            vectorSize,
                                    },
                                },
                            },
                        },
                    },
                )
                : jsonResponse(404);
        }
        if (
            options.method === 'PUT' &&
            pathname.endsWith('/points')
        ) {
            for (const point of body.points) {
                points.set(
                    point.id,
                    point,
                );
            }
            return jsonResponse(
                200,
                {
                    result: true,
                },
            );
        }
        if (
            options.method === 'POST' &&
            pathname.endsWith('/points/scroll')
        ) {
            return jsonResponse(
                200,
                {
                    result: {
                        points:
                            [...points.values()]
                                .map(point => ({
                                    id: point.id,
                                    payload: {
                                        recordId:
                                            point.payload
                                                .recordId,
                                        contentChecksum:
                                            point.payload
                                                .contentChecksum,
                                    },
                                })),
                        next_page_offset: null,
                    },
                },
            );
        }
        if (
            options.method === 'POST' &&
            pathname.endsWith('/points/delete')
        ) {
            for (const pointId of body.points) {
                points.delete(pointId);
            }
            return jsonResponse(
                200,
                {
                    result: true,
                },
            );
        }
        if (
            options.method === 'DELETE' &&
            pathname.includes('/collections/')
        ) {
            collectionExists = false;
            points.clear();
            return jsonResponse(
                200,
                {
                    result: true,
                },
            );
        }
        if (
            options.method === 'PUT' &&
            pathname.includes('/collections/')
        ) {
            collectionExists = true;
            vectorSize =
                Number(
                    body?.vectors?.size,
                ) || vectorSize;
            return jsonResponse(
                200,
                {
                    result: true,
                },
            );
        }
        throw new Error(
            `Unexpected Qdrant request ${options.method} ${pathname}`,
        );
    };
    const backend =
        createQdrantKnowledgeBackend({
            url: 'http://qdrant.test',
            embeddingModel: 'mini-lm',
            dimensions: 3,
            fetchImpl,
            embedder: async texts => {
                embedCalls.push(
                    [...texts],
                );
                return texts.map(() =>
                    [1, 0, 0]);
            },
        });
    return {
        backend,
        points,
        embedCalls,
        loseCollection() {
            collectionExists = false;
            points.clear();
        },
        setVectorSize(value) {
            vectorSize = value;
        },
    };
}

function syncInput(
    stateRevision,
    records,
) {
    return {
        timelineId: 'timeline_a',
        timelineEpoch: 'epoch_a',
        stateRevision,
        records,
        replace: true,
    };
}

test(
    'Qdrant reconciliation reuses unchanged vectors and replaces only changed records',
    async () => {
        const harness =
            createHarness();
        const first = [
            record(
                'events_alpha',
                'Alpha remains on the table.',
                1,
            ),
            record(
                'events_beta',
                'Beta remains by the fire.',
                1,
            ),
        ];
        const initial =
            await harness.backend
                .reconcile(
                    syncInput(1, first),
                );
        assert.equal(
            initial.embedded,
            2,
        );
        assert.equal(
            initial.reused,
            0,
        );

        const unchanged =
            await harness.backend
                .reconcile(
                    syncInput(
                        2,
                        first.map(entry =>
                            record(
                                entry.recordId,
                                entry.text,
                                2,
                            )),
                    ),
                );
        assert.equal(
            unchanged.embedded,
            0,
        );
        assert.equal(
            unchanged.reused,
            2,
        );
        assert.equal(
            harness.embedCalls.length,
            1,
        );

        const changed =
            await harness.backend
                .reconcile(
                    syncInput(
                        3,
                        [
                            record(
                                'events_alpha',
                                'Alpha has fallen to the floor.',
                                3,
                            ),
                            record(
                                'events_beta',
                                'Beta remains by the fire.',
                                3,
                            ),
                        ],
                    ),
                );
        assert.equal(
            changed.embedded,
            1,
        );
        assert.equal(
            changed.reused,
            1,
        );
        assert.deepEqual(
            harness.embedCalls.at(-1),
            [
                'Alpha has fallen to the floor.',
            ],
        );
    },
);

test(
    'Knowledge vector service uses Qdrant reconciliation for a healthy preferred backend',
    async () => {
        const harness =
            createHarness();
        const service =
            createKnowledgeVectorService({
                exactBackend:
                    new FakeVectorBackend({
                        name: 'json',
                    }),
                preferredBackend:
                    harness.backend,
            });
        const first = [
            record(
                'events_alpha',
                'Alpha remains on the table.',
                1,
            ),
        ];
        const initial =
            await service.sync(
                syncInput(1, first),
            );
        assert.equal(
            initial.diagnostics
                .embeddedRecordCount,
            1,
        );
        const unchanged =
            await service.sync(
                syncInput(
                    2,
                    [
                        record(
                            'events_alpha',
                            'Alpha remains on the table.',
                            2,
                        ),
                    ],
                ),
            );
        assert.equal(
            unchanged.diagnostics
                .embeddedRecordCount,
            0,
        );
        assert.equal(
            unchanged.diagnostics
                .reusedRecordCount,
            1,
        );
    },
);

test(
    'Qdrant reconciliation repairs missing points and deletes absent records',
    async () => {
        const harness =
            createHarness();
        const records = [
            record(
                'events_alpha',
                'Alpha remains on the table.',
                1,
            ),
            record(
                'events_beta',
                'Beta remains by the fire.',
                1,
            ),
        ];
        await harness.backend
            .reconcile(
                syncInput(1, records),
            );
        harness.points.delete(
            deterministicVectorPointId(
                'events_alpha',
            ),
        );

        const repaired =
            await harness.backend
                .reconcile(
                    syncInput(
                        2,
                        records.map(entry =>
                            record(
                                entry.recordId,
                                entry.text,
                                2,
                            )),
                    ),
                );
        assert.equal(
            repaired.embedded,
            1,
        );
        assert.equal(
            repaired.reused,
            1,
        );

        const deleted =
            await harness.backend
                .reconcile(
                    syncInput(
                        3,
                        [
                            record(
                                'events_alpha',
                                'Alpha remains on the table.',
                                3,
                            ),
                        ],
                    ),
                );
        assert.equal(
            deleted.deleted,
            1,
        );
        assert.equal(
            harness.points.has(
                deterministicVectorPointId(
                    'events_beta',
                ),
            ),
            false,
        );
    },
);

test(
    'Qdrant reconciliation fully rebuilds a missing collection',
    async () => {
        const harness =
            createHarness();
        harness.loseCollection();
        const result =
            await harness.backend
                .reconcile(
                    syncInput(
                        1,
                        [
                            record(
                                'events_alpha',
                                'Alpha remains on the table.',
                                1,
                            ),
                            record(
                                'events_beta',
                                'Beta remains by the fire.',
                                1,
                            ),
                        ],
                    ),
                );
        assert.equal(
            result.rebuilt,
            true,
        );
        assert.equal(
            result.embedded,
            2,
        );
        assert.equal(
            harness.points.size,
            2,
        );
    },
);

test(
    'Qdrant reconciliation rebuilds an incompatible collection',
    async () => {
        const harness =
            createHarness();
        harness.setVectorSize(2);
        const result =
            await harness.backend
                .reconcile(
                    syncInput(
                        1,
                        [
                            record(
                                'events_alpha',
                                'Alpha remains on the table.',
                                1,
                            ),
                            record(
                                'events_beta',
                                'Beta remains by the fire.',
                                1,
                            ),
                        ],
                    ),
                );
        assert.equal(
            result.rebuilt,
            true,
        );
        assert.equal(
            result.embedded,
            2,
        );
        assert.equal(
            harness.points.size,
            2,
        );
    },
);

test(
    'Qdrant reconciliation does not retry manifest, point write, or point delete failures',
    async () => {
        for (const scenario of [
            'manifest',
            'upsert',
            'delete',
        ]) {
            let failedRequests = 0;
            const backend =
                createQdrantKnowledgeBackend({
                    url: 'http://qdrant.test',
                    embeddingModel: 'mini-lm',
                    dimensions: 3,
                    embedder: async texts =>
                        texts.map(() =>
                            [1, 0, 0]),
                    fetchImpl: async (
                        url,
                        options = {},
                    ) => {
                        const pathname =
                            new URL(url).pathname;
                        if (
                            options.method === 'GET'
                        ) {
                            return jsonResponse(
                                200,
                                {
                                    result: {
                                        config: {
                                            params: {
                                                vectors: {
                                                    size: 3,
                                                },
                                            },
                                        },
                                    },
                                },
                            );
                        }
                        if (
                            pathname.endsWith(
                                '/points/scroll',
                            )
                        ) {
                            if (
                                scenario ===
                                'manifest'
                            ) {
                                failedRequests++;
                                return jsonResponse(503);
                            }
                            return jsonResponse(
                                200,
                                {
                                    result: {
                                        points:
                                            scenario ===
                                            'delete'
                                                ? [{
                                                    id: 'obsolete',
                                                    payload: {
                                                        recordId:
                                                            'events_obsolete',
                                                        contentChecksum:
                                                            'cyrb53-obsolete',
                                                    },
                                                }]
                                                : [],
                                        next_page_offset:
                                            null,
                                    },
                                },
                            );
                        }
                        if (
                            pathname.endsWith(
                                '/points',
                            )
                        ) {
                            if (
                                scenario ===
                                'upsert'
                            ) {
                                failedRequests++;
                                return jsonResponse(503);
                            }
                            return jsonResponse(
                                200,
                                {
                                    result: true,
                                },
                            );
                        }
                        if (
                            pathname.endsWith(
                                '/points/delete',
                            )
                        ) {
                            if (
                                scenario ===
                                'delete'
                            ) {
                                failedRequests++;
                                return jsonResponse(503);
                            }
                            return jsonResponse(
                                200,
                                {
                                    result: true,
                                },
                            );
                        }
                        throw new Error(
                            `Unexpected Qdrant request ${
                                options.method
                            } ${
                                pathname
                            }`,
                        );
                    },
                });
            await assert.rejects(
                backend.reconcile(
                    syncInput(
                        1,
                        [
                            record(
                                'events_alpha',
                                'Alpha remains on the table.',
                                1,
                            ),
                        ],
                    ),
                ),
            );
            assert.equal(
                failedRequests,
                1,
                `${scenario} failure must not retry`,
            );
        }
    },
);
