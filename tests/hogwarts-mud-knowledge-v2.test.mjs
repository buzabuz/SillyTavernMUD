/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    mkdtemp,
    rm,
} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    fileURLToPath,
} from 'node:url';

import express from 'express';

import {
    chunkKnowledgeText,
    createChunkedKnowledgeRecords,
    createKnowledgeRecordV2,
    hydrateKnowledgeRecords,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    router as hogwartsMudRouter,
} from '../src/endpoints/hogwarts-mud.js';
import {
    createConfiguredKnowledgeService,
} from '../src/hogwarts-mud/knowledge-backend-factory.js';
import {
    createJsonKnowledgeBackend,
} from '../src/hogwarts-mud/knowledge-json-backend.js';
import {
    buildQdrantPayloadFilter,
    createQdrantKnowledgeBackend,
    getQdrantCollectionGeneration,
} from '../src/hogwarts-mud/knowledge-qdrant-backend.js';
import {
    FakeVectorBackend,
    createVectraCompatibleBackend,
    deterministicVectorPointId,
} from '../src/hogwarts-mud/knowledge-vector-backend.js';
import {
    createKnowledgeVectorService,
} from '../src/hogwarts-mud/knowledge-vector-service.js';
import {
    setConfigFilePath,
} from '../src/util.js';

setConfigFilePath(
    fileURLToPath(
        new URL(
            '../config.yaml',
            import.meta.url,
        ),
    ),
);

function record(overrides = {}) {
    return createKnowledgeRecordV2({
        category: 'events',
        recordId: 'events_quill_vanished',
        nodeType: 'fact',
        title: 'Quill vanished',
        text:
            'The smoking ruin of the quill vanished entirely.',
        entityIds: [
            'quill',
            'mcgonagall',
        ],
        tags: ['current'],
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        sourceRefs: [{
            type: 'message',
            id: '212',
        }],
        visibility: {
            scope: 'witnesses',
            actorIds: [
                'player',
                'hermione',
            ],
        },
        effectiveClock:
            '1991-09-02 · 18:30',
        sceneId:
            'transfiguration_class',
        data: {
            physicalForm: 'absent',
        },
        ...overrides,
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
            return JSON.stringify(body);
        },
    };
}

function qdrantRequestBackend(
    fetchImpl,
) {
    return createQdrantKnowledgeBackend({
        url: 'http://qdrant.test',
        embeddingModel: 'mini-lm',
        dimensions: 3,
        embedder:
            async texts =>
                texts.map(() =>
                    [1, 0, 0]),
        fetchImpl,
    });
}

test('Knowledge V2 records are stable and content-addressed', () => {
    const first = record({
        entityIds: [
            'quill',
            'mcgonagall',
            'quill',
        ],
        sourceRefs: [
            {
                type: 'message',
                id: '212',
            },
            {
                type: 'event',
                id: 'vanish_event',
            },
        ],
    });
    const second = record({
        entityIds: [
            'mcgonagall',
            'quill',
        ],
        sourceRefs: [
            {
                type: 'event',
                id: 'vanish_event',
            },
            {
                type: 'message',
                id: '212',
            },
        ],
    });
    assert.deepEqual(
        first,
        second,
    );
    assert.equal(first.version, 2);
    assert.equal(
        first.projectorVersion,
        2,
    );
    assert.match(
        first.contentChecksum,
        /^cyrb53-[0-9a-f]+$/u,
    );
    assert.notEqual(
        record({
            text:
                'The wreckage remained.',
        }).contentChecksum,
        first.contentChecksum,
    );
});

test('Knowledge V2 visibility fails closed while preserving explicit ACLs', () => {
    const missing = record({
        recordId:
            'events_missing_visibility',
        visibility: undefined,
    });
    const invalid = record({
        recordId:
            'events_invalid_visibility',
        visibility: {
            scope: 'everyone',
            actorIds: ['hermione'],
        },
    });
    const explicitPublic = record({
        recordId:
            'events_explicit_public',
        visibility: {
            scope: 'public',
            actorIds: [],
        },
    });
    const actorOnly = record({
        recordId:
            'events_actor_only',
        visibility: {
            scope: 'actor',
            actorIds: ['hermione'],
        },
    });

    assert.deepEqual(
        missing.visibility,
        {
            scope: 'locked',
            actorIds: [],
        },
    );
    assert.deepEqual(
        invalid.visibility,
        {
            scope: 'locked',
            actorIds: [],
        },
    );
    const visibleIds = actorId =>
        hydrateKnowledgeRecords(
            [
                missing,
                invalid,
                explicitPublic,
                actorOnly,
            ],
            {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 4,
                audience: {
                    actorIds: [actorId],
                },
            },
        ).records.map(current =>
            current.recordId);
    assert.deepEqual(
        visibleIds('player'),
        [
            explicitPublic.recordId,
        ],
    );
    assert.deepEqual(
        visibleIds('hermione'),
        [
            explicitPublic.recordId,
            actorOnly.recordId,
        ],
    );
});

test('long scene and event text receives deterministic complete chunks', () => {
    const paragraphs =
        Array.from(
            {
                length: 80,
            },
            (_, index) =>
                `MESSAGE_${index.toString().padStart(3, '0')} ${'detail '.repeat(35)}`,
        );
    const text =
        paragraphs.join('\n\n');
    const chunks =
        chunkKnowledgeText(
            text,
            {
                maxCharacters: 1_200,
                overlapCharacters: 100,
            },
        );
    const records =
        createChunkedKnowledgeRecords({
            ...record({
                category: 'scenes',
                recordId:
                    'scenes_long_scene',
                nodeType: 'scene',
                text,
            }),
            contentChecksum:
                undefined,
        }, {
            maxCharacters: 1_200,
            overlapCharacters: 100,
        });
    assert.ok(chunks.length > 10);
    assert.equal(
        records.length,
        chunks.length,
    );
    assert.match(
        records.at(0).recordId,
        /chunk_0001$/u,
    );
    assert.ok(
        records.some(item =>
            item.text.includes(
                'MESSAGE_079',
            )),
    );
    assert.deepEqual(
        createChunkedKnowledgeRecords({
            ...record({
                category: 'scenes',
                recordId:
                    'scenes_long_scene',
                nodeType: 'scene',
                text,
            }),
            contentChecksum:
                undefined,
        }, {
            maxCharacters: 1_200,
            overlapCharacters: 100,
        }),
        records,
    );
});

test('hydration enforces revision, audience, clock, nodeType and supersession', () => {
    const records = [
        record(),
        record({
            recordId:
                'appraisals_private',
            category:
                'appraisals',
            nodeType:
                'appraisal',
            visibility: {
                scope: 'actor',
                actorIds: [
                    'hermione',
                ],
            },
        }),
        record({
            recordId: 'events_future',
            effectiveClock:
                '1991-09-03 · 08:00',
        }),
        record({
            recordId: 'events_old',
            stateRevision: 3,
        }),
        record({
            recordId:
                'events_superseded',
            sourceRefs: [{
                type: 'event',
                id: 'old_event',
            }],
        }),
    ];
    const result =
        hydrateKnowledgeRecords(
            records,
            {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 4,
                audience: {
                    actorIds: [
                        'hermione',
                    ],
                },
                clock:
                    '1991-09-02 · 19:00',
                nodeTypes: [
                    'fact',
                ],
                supersededSourceRefs: [{
                    type: 'event',
                    id: 'old_event',
                }],
            },
        );
    assert.deepEqual(
        result.records.map(item =>
            item.recordId),
        [
            'events_quill_vanished',
        ],
    );
    assert.deepEqual(
        new Set(
            result.diagnostics
                .suppressed
                .map(item =>
                    item.reason),
        ),
        new Set([
            'node_type',
            'future_clock',
            'stale_revision',
            'source_superseded',
        ]),
    );
});

test('JSON backend rejects stale sync and rebuilds after index loss', async t => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-knowledge-json-',
            ),
        );
    t.after(() =>
        rm(
            root,
            {
                recursive: true,
                force: true,
            },
        ));
    const backend =
        createJsonKnowledgeBackend({
            root,
        });
    const input = {
        timelineId: 'timeline_a',
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        records: [
            record({
                visibility: {
                    scope: 'public',
                    actorIds: [],
                },
            }),
            record({
                recordId:
                    'appraisals_private',
                category:
                    'appraisals',
                nodeType:
                    'appraisal',
                visibility: {
                    scope: 'actor',
                    actorIds: [
                        'hermione',
                    ],
                },
            }),
            {
                ...record({
                    recordId:
                        'events_missing_backend_visibility',
                }),
                visibility: undefined,
            },
        ],
        replace: true,
    };
    await backend.upsert(input);
    const publicResult =
        await backend.query({
            timelineId:
                input.timelineId,
            query: 'quill',
            entityIds: [],
            limit: 10,
            filters: {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 4,
                audience: {
                    actorIds: [
                        'ron',
                    ],
                },
                clock:
                    '1991-09-02 · 19:00',
                categories: [
                    'events',
                    'appraisals',
                ],
            },
        });
    assert.deepEqual(
        publicResult.records
            .map(item =>
                item.recordId),
        [
            'events_quill_vanished',
        ],
    );
    const actorResult =
        await backend.query({
            timelineId:
                input.timelineId,
            query: 'quill',
            entityIds: [],
            limit: 10,
            filters: {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 4,
                audience: {
                    actorIds: [
                        'hermione',
                    ],
                },
                clock:
                    '1991-09-02 · 19:00',
                categories: [
                    'events',
                    'appraisals',
                ],
            },
        });
    assert.deepEqual(
        actorResult.records
            .map(item =>
                item.recordId),
        [
            'appraisals_private',
            'events_quill_vanished',
        ],
    );
    const missingEntry =
        backend.readIndex(
            input.timelineId,
        ).records[
            'events_missing_backend_visibility'
        ];
    assert.deepEqual(
        backend.readRecord(
            input.timelineId,
            missingEntry,
        ).visibility,
        {
            scope: 'locked',
            actorIds: [],
        },
    );
    await assert.rejects(
        backend.upsert({
            ...input,
            stateRevision: 3,
            records:
                input.records.map(item =>
                    createKnowledgeRecordV2({
                        ...item,
                        stateRevision: 3,
                    })),
        }),
        error =>
            error.code ===
            'STALE_KNOWLEDGE_REVISION',
    );
    fs.rmSync(
        backend.indexPath(
            input.timelineId,
        ),
    );
    assert.equal(
        (
            await backend.health(
                input,
            )
        ).indexMissing,
        true,
    );
    const rebuilt =
        await backend.upsert(input);
    assert.equal(
        rebuilt.rebuilt,
        true,
    );
    assert.equal(
        (
            await backend.health(
                input,
            )
        ).recordCount,
        3,
    );
});

test('service rebuilds a lost preferred index and degrades to exact search', async () => {
    const exact =
        new FakeVectorBackend({
            name: 'json-fake',
        });
    const preferred =
        new FakeVectorBackend({
            name: 'qdrant-fake',
        });
    const service =
        createKnowledgeVectorService({
            exactBackend: exact,
            preferredBackend:
                preferred,
        });
    const input = {
        timelineId: 'timeline_a',
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        records: [record()],
        replace: true,
    };
    const sync =
        await service.sync(input);
    assert.equal(
        sync.diagnostics
            .indexRebuilt,
        true,
    );
    assert.ok(
        preferred.calls.includes(
            'rebuild',
        ),
    );
    preferred.setFailure(
        'query',
    );
    const result =
        await service.query({
            timelineId:
                input.timelineId,
            query: 'quill',
            entityIds: [],
            limit: 5,
            filters: {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 4,
                audience: {
                    actorIds: [
                        'player',
                    ],
                },
                clock:
                    '1991-09-02 · 19:00',
            },
        });
    assert.equal(
        result.diagnostics
            .degraded,
        true,
    );
    assert.equal(
        result.records[0]
            .recordId,
        'events_quill_vanished',
    );
});

test('production knowledge factory keeps exact search when Qdrant fails', async t => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-knowledge-factory-',
            ),
        );
    t.after(() =>
        rm(
            root,
            {
                recursive: true,
                force: true,
            },
        ));
    const service =
        createConfiguredKnowledgeService({
            filesRoot: root,
            fetchImpl:
                async () => {
                    throw new Error(
                        'qdrant unavailable',
                    );
                },
            embedder:
                async texts =>
                    texts.map(() => [
                        0.1,
                        0.2,
                        0.3,
                    ]),
            config: {
                qdrant: {
                    enabled: true,
                    url:
                        'http://qdrant.invalid',
                    apiKey: '',
                    collectionPrefix:
                        'hpmud_test',
                    embeddingModel:
                        'fake',
                    dimensions: 3,
                    timeoutMs: 250,
                },
            },
        });
    const input = {
        timelineId:
            'timeline_factory',
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        records: [record()],
        replace: true,
    };
    const sync =
        await service.sync(input);
    assert.equal(
        sync.diagnostics.degraded,
        true,
    );
    const result =
        await service.query({
            timelineId:
                input.timelineId,
            timelineEpoch:
                input.timelineEpoch,
            stateRevision:
                input.stateRevision,
            query: 'quill',
            audience: {
                actorIds: [
                    'player',
                ],
                role: 'actor',
            },
            clock:
                '1991-09-02 · 19:00',
            nodeTypes: ['fact'],
        });

    assert.deepEqual(
        result.records.map(
            current =>
                current.recordId,
        ),
        [
            record().recordId,
        ],
    );
    assert.equal(
        result.diagnostics.backend,
        'json',
    );
    assert.equal(
        result.diagnostics
            .preferredBackend,
        'qdrant',
    );
    assert.equal(
        result.diagnostics.degraded,
        true,
    );
});

test('Qdrant REST request retries transient network and HTTP failures before succeeding', async () => {
    let attempts = 0;
    const backend =
        qdrantRequestBackend(
            async () => {
                attempts += 1;
                if (attempts === 1) {
                    throw new TypeError(
                        'fetch failed',
                    );
                }
                if (attempts === 2) {
                    const error =
                        new Error(
                            'request aborted',
                        );
                    error.name =
                        'AbortError';
                    throw error;
                }
                if (attempts === 3) {
                    return jsonResponse(
                        503,
                        {
                            status:
                                'warming',
                        },
                    );
                }
                return jsonResponse(
                    200,
                    {
                        result:
                            'healthy',
                    },
                );
            },
        );

    const result =
        await backend.request(
            '/collections/test',
        );

    assert.deepEqual(
        result,
        {
            result: 'healthy',
        },
    );
    assert.equal(
        attempts,
        4,
    );
});

test('Qdrant REST request does not retry non-retryable 4xx responses', async () => {
    let attempts = 0;
    const backend =
        qdrantRequestBackend(
            async () => {
                attempts += 1;
                return jsonResponse(
                    400,
                    {
                        status:
                            'invalid request',
                    },
                );
            },
        );

    await assert.rejects(
        backend.request(
            '/collections/test',
        ),
        /failed with 400.*invalid request/u,
    );
    assert.equal(
        attempts,
        1,
    );
});

test('Qdrant REST request does not retry POST unless it is explicitly replay-safe', async () => {
    let attempts = 0;
    const networkError =
        new TypeError(
            'fetch failed',
        );
    const backend =
        qdrantRequestBackend(
            async () => {
                attempts += 1;
                throw networkError;
            },
        );

    await assert.rejects(
        backend.request(
            '/collections/test/custom',
            {
                method: 'POST',
            },
        ),
        error =>
            error === networkError,
    );
    assert.equal(
        attempts,
        1,
    );
});

test('Qdrant REST request stops after three retries and preserves the final network error', async () => {
    const errors =
        Array.from(
            {
                length: 4,
            },
            (_, index) =>
                new TypeError(
                    `fetch failed ${index + 1}`,
                ),
        );
    let attempts = 0;
    const backend =
        qdrantRequestBackend(
            async () => {
                const error =
                    errors[attempts];
                attempts += 1;
                throw error;
            },
        );

    await assert.rejects(
        backend.request(
            '/collections/test',
        ),
        error =>
            error === errors[3],
    );
    assert.equal(
        attempts,
        4,
    );
});

test('Qdrant upsert does not contact Qdrant when embedding is interrupted', async () => {
    const requests = [];
    const interruption =
        new Error(
            'Transformers initialization interrupted.',
        );
    interruption.name = 'AbortError';
    const backend =
        createQdrantKnowledgeBackend({
            url:
                'http://qdrant.test',
            embeddingModel:
                'mini-lm',
            dimensions: 3,
            async embedder() {
                throw interruption;
            },
            async fetchImpl(
                url,
                options,
            ) {
                requests.push({
                    url,
                    method:
                        options.method,
                });
                return jsonResponse(
                    options.method ===
                        'GET'
                        ? 404
                        : 200,
                    {
                        result: true,
                    },
                );
            },
        });

    await assert.rejects(
        backend.upsert({
            timelineId: 'timeline_a',
            timelineEpoch: 'epoch_a',
            stateRevision: 4,
            records: [record()],
        }),
        error => error ===
            interruption,
    );
    assert.deepEqual(
        requests,
        [],
    );
});

test('Qdrant upsert embeds before creating the collection and putting points', async () => {
    const operations = [];
    const backend =
        createQdrantKnowledgeBackend({
            url:
                'http://qdrant.test',
            embeddingModel:
                'mini-lm',
            dimensions: 3,
            async embedder(texts) {
                operations.push(
                    'embed',
                );
                return texts.map(() =>
                    [1, 0, 0]);
            },
            async fetchImpl(
                url,
                options,
            ) {
                const pathname =
                    new URL(url)
                        .pathname;
                operations.push(
                    `${options.method} ${pathname}`,
                );
                return jsonResponse(
                    options.method ===
                        'GET'
                        ? 404
                        : 200,
                    {
                        result: true,
                    },
                );
            },
        });
    const collection =
        backend.collectionName(
            'timeline_a',
        );

    const result =
        await backend.upsert({
            timelineId: 'timeline_a',
            timelineEpoch: 'epoch_a',
            stateRevision: 4,
            records: [record()],
        });

    assert.equal(
        result.upserted,
        1,
    );
    assert.deepEqual(
        operations,
        [
            'embed',
            `GET /collections/${collection}`,
            `PUT /collections/${collection}`,
            `PUT /collections/${collection}/points`,
        ],
    );
});

test('Qdrant REST adapter uses generations, deterministic IDs and payload filters', async () => {
    const calls = [];
    let collectionExists = false;
    let storedRecord = null;
    const fetchImpl =
        async (url, options) => {
            const parsed =
                new URL(url);
            const body =
                options.body
                    ? JSON.parse(
                        options.body,
                    )
                    : null;
            calls.push({
                pathname:
                    parsed.pathname,
                search:
                    parsed.search,
                method:
                    options.method,
                body,
            });
            if (
                options.method ===
                    'GET' &&
                parsed.pathname
                    .includes(
                        '/collections/',
                    )
            ) {
                return collectionExists
                    ? jsonResponse(
                        200,
                        {
                            result: {
                                status:
                                    'green',
                            },
                        },
                    )
                    : jsonResponse(
                        404,
                    );
            }
            if (
                options.method ===
                    'PUT' &&
                parsed.pathname.endsWith(
                    '/points',
                ) === false
            ) {
                collectionExists =
                    true;
                return jsonResponse(
                    200,
                    {
                        result: true,
                    },
                );
            }
            if (
                options.method ===
                    'PUT' &&
                parsed.pathname.endsWith(
                    '/points',
                )
            ) {
                storedRecord =
                    body.points[0]
                        .payload.record;
                return jsonResponse(
                    200,
                    {
                        result: true,
                    },
                );
            }
            if (
                options.method ===
                    'POST' &&
                parsed.pathname.endsWith(
                    '/points/query',
                )
            ) {
                return jsonResponse(
                    200,
                    {
                        result: {
                            points: [{
                                payload: {
                                    record:
                                        storedRecord,
                                },
                            }],
                        },
                    },
                );
            }
            if (
                options.method ===
                    'POST' &&
                parsed.pathname.endsWith(
                    '/points/delete',
                )
            ) {
                return jsonResponse(
                    200,
                    {
                        result: true,
                    },
                );
            }
            if (
                options.method ===
                    'DELETE'
            ) {
                collectionExists =
                    false;
                return jsonResponse(
                    200,
                    {
                        result: true,
                    },
                );
            }
            throw new Error(
                `Unexpected Qdrant request ${options.method} ${parsed.pathname}`,
            );
        };
    const backend =
        createQdrantKnowledgeBackend({
            url:
                'http://qdrant.test',
            apiKey: 'test-key',
            embeddingModel:
                'mini-lm',
            dimensions: 3,
            embedder:
                async texts =>
                    texts.map(() =>
                        [1, 0, 0]),
            fetchImpl,
        });
    const input = {
        timelineId: 'timeline_a',
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        records: [record()],
    };
    const upsert =
        await backend.upsert(input);
    assert.match(
        upsert.collection,
        /mini|hogwarts_knowledge/u,
    );
    assert.equal(
        calls.find(call =>
            call.pathname.endsWith(
                '/points',
            ) &&
            call.method === 'PUT')
            .body.points[0].id,
        deterministicVectorPointId(
            'events_quill_vanished',
        ),
    );
    const filters = {
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        audience: {
            actorIds: [
                'hermione',
            ],
        },
        clock:
            '1991-09-02 · 19:00',
        nodeTypes: ['fact'],
        categories: ['events'],
    };
    const result =
        await backend.query({
            timelineId: 'timeline_a',
            query: 'quill',
            limit: 4,
            filters,
        });
    assert.equal(
        result.records.length,
        1,
    );
    const queryCall =
        calls.find(call =>
            call.pathname.endsWith(
                '/points/query',
            ));
    assert.deepEqual(
        queryCall.body.filter,
        buildQdrantPayloadFilter(
            filters,
        ),
    );
    await backend.delete({
        ...input,
        recordIds: [
            record().recordId,
        ],
    });
    await backend.rebuild(input);
    assert.ok(
        calls.some(call =>
            call.method ===
                'DELETE'),
    );
    assert.notEqual(
        getQdrantCollectionGeneration({
            embeddingModel:
                'mini-lm',
            dimensions: 3,
        }),
        getQdrantCollectionGeneration({
            embeddingModel:
                'mini-lm-v2',
            dimensions: 3,
        }),
    );
});

test('Vectra compatibility adapter stores V2 metadata and reapplies audience filters', async () => {
    let items = [];
    const backend =
        createVectraCompatibleBackend({
            transport: {
                async health() {
                    return {
                        ok: true,
                    };
                },
                async upsert(input) {
                    items = input.items;
                },
                async delete() {},
                async query() {
                    return {
                        items,
                    };
                },
                async rebuild() {
                    items = [];
                },
            },
        });
    await backend.upsert({
        timelineId: 'timeline_a',
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        records: [record()],
    });
    assert.equal(
        items[0].metadata.version,
        2,
    );
    const denied =
        await backend.query({
            timelineId: 'timeline_a',
            query: 'quill',
            limit: 5,
            filters: {
                timelineEpoch:
                    'epoch_a',
                stateRevision: 4,
                audience: {
                    actorIds: ['ron'],
                },
            },
        });
    assert.equal(
        denied.records.length,
        0,
    );
});

test('knowledge API reports stale revisions and audience-filtered diagnostics', async t => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-knowledge-api-',
            ),
        );
    t.after(() =>
        rm(
            root,
            {
                recursive: true,
                force: true,
            },
        ));
    const app = express();
    app.use(express.json({
        limit: '10mb',
    }));
    app.use(
        (
            request,
            _response,
            next,
        ) => {
            request.user = {
                directories: {
                    root,
                    files:
                        path.join(
                            root,
                            'files',
                        ),
                },
            };
            next();
        },
    );
    app.use(
        '/api/hogwarts-mud',
        hogwartsMudRouter,
    );
    const server =
        http.createServer(app);
    await new Promise(resolve =>
        server.listen(
            0,
            '127.0.0.1',
            resolve,
        ));
    t.after(() =>
        new Promise(resolve =>
            server.close(resolve)));
    const address =
        server.address();
    const base =
        `http://127.0.0.1:${address.port}/api/hogwarts-mud/knowledge`;
    const sync = async input =>
        fetch(
            `${base}/sync`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json',
                },
                body:
                    JSON.stringify(
                        input,
                    ),
            },
        );
    const input = {
        timelineId: 'timeline_api',
        timelineEpoch: 'epoch_a',
        stateRevision: 4,
        records: [
            record(),
            {
                ...record({
                    recordId:
                        'events_api_missing_visibility',
                    title:
                        'Onyx aperture',
                    text:
                        'VISIBILITY_PROBE amber.',
                    tags: [
                        'cedar',
                    ],
                }),
                visibility: undefined,
            },
            record({
                recordId:
                    'events_api_explicit_public',
                title:
                    'Cobalt lantern',
                text:
                    'VISIBILITY_PROBE harbor.',
                tags: [
                    'meadow',
                ],
                visibility: {
                    scope: 'public',
                    actorIds: [],
                },
            }),
            record({
                recordId:
                    'events_api_actor_only',
                title:
                    'Saffron astrolabe',
                text:
                    'VISIBILITY_PROBE quartz.',
                tags: [
                    'velvet',
                ],
                visibility: {
                    scope: 'actor',
                    actorIds: [
                        'hermione',
                    ],
                },
            }),
        ],
        replace: true,
    };
    assert.equal(
        (await sync(input)).status,
        200,
    );
    const stale =
        await sync({
            ...input,
            stateRevision: 3,
            records: [
                createKnowledgeRecordV2({
                    ...record(),
                    stateRevision: 3,
                }),
            ],
        });
    assert.equal(
        stale.status,
        409,
    );
    assert.equal(
        (await stale.json()).error,
        'stale_revision',
    );
    const search =
        await fetch(
            `${base}/search`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json',
                },
                body:
                    JSON.stringify({
                        timelineId:
                            'timeline_api',
                        timelineEpoch:
                            'epoch_a',
                        stateRevision: 4,
                        query: 'quill',
                        audience: {
                            actorIds: [
                                'ron',
                            ],
                            role:
                                'actor',
                        },
                        clock:
                            '1991-09-02 · 19:00',
                        nodeTypes: [
                            'fact',
                        ],
                    }),
            },
        );
    assert.equal(
        search.status,
        200,
    );
    const result =
        await search.json();
    assert.equal(
        result.records.length,
        0,
    );
    assert.equal(
        result.diagnostics
            .backend,
        'local-exact',
    );
    assert.ok(
        result.diagnostics
            .suppressed
            .some(item =>
                item.reason ===
                'audience'),
    );
    const searchVisibilityProbe =
        async actorId => {
            const response =
                await fetch(
                    `${base}/search`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body:
                            JSON.stringify({
                                timelineId:
                                    'timeline_api',
                                timelineEpoch:
                                    'epoch_a',
                                stateRevision: 4,
                                query:
                                    'VISIBILITY_PROBE',
                                audience: {
                                    actorIds: [
                                        actorId,
                                    ],
                                    role:
                                        actorId ===
                                            'player'
                                            ? 'player'
                                            : 'actor',
                                },
                                clock:
                                    '1991-09-02 · 19:00',
                                nodeTypes: [
                                    'fact',
                                ],
                            }),
                    },
                );
            assert.equal(
                response.status,
                200,
            );
            return (
                await response.json()
            ).records
                .map(current =>
                    current.recordId)
                .sort();
        };
    const playerVisibilityProbe =
        await searchVisibilityProbe(
            'player',
        );
    assert.equal(
        playerVisibilityProbe.includes(
            'events_api_explicit_public',
        ),
        true,
    );
    assert.equal(
        playerVisibilityProbe.includes(
            'events_api_actor_only',
        ),
        false,
    );
    assert.equal(
        playerVisibilityProbe.includes(
            'events_api_missing_visibility',
        ),
        false,
    );
    const hermioneVisibilityProbe =
        await searchVisibilityProbe(
            'hermione',
        );
    assert.equal(
        hermioneVisibilityProbe.includes(
            'events_api_explicit_public',
        ),
        true,
    );
    assert.equal(
        hermioneVisibilityProbe.includes(
            'events_api_actor_only',
        ),
        true,
    );
    assert.equal(
        hermioneVisibilityProbe.includes(
            'events_api_missing_visibility',
        ),
        false,
    );

    const graphEvent = record({
        recordId:
            'events_api_corridor_seed',
        title: 'Corridor event',
        text:
            'A rain corridor umbrella event became committed.',
        entityIds: [
            'hermione',
            'player',
        ],
        stateRevision: 5,
        sourceRefs: [
            {
                type: 'event',
                id: 'event_api_corridor',
            },
            {
                type: 'message',
                id: '501',
            },
        ],
        visibility: {
            scope: 'public',
            actorIds: [],
        },
        effectiveClock:
            '1991-09-03 · 16:00',
        sceneId:
            'scene_api_corridor',
        data: {
            eventKnowledge: {
                eventId:
                    'event_api_corridor',
            },
        },
    });
    const graphAppraisal = record({
        category: 'appraisals',
        recordId:
            'appraisals_api_private',
        nodeType: 'appraisal',
        title: 'Private appraisal',
        text:
            'PRIVATE_APPRAISAL_TEXT',
        entityIds: [
            'hermione',
            'player',
        ],
        stateRevision: 5,
        sourceRefs: [
            {
                type: 'event',
                id: 'event_api_corridor',
            },
            {
                type: 'message',
                id: '501',
            },
        ],
        visibility: {
            scope: 'actor',
            actorIds: [
                'hermione',
            ],
        },
        effectiveClock:
            '1991-09-03 · 16:05',
        sceneId:
            'scene_api_corridor',
        data: {
            appraisal: {
                id:
                    'appraisal_api_private',
                observerId:
                    'hermione',
                targetId: 'player',
                sourceEventIds: [
                    'event_api_corridor',
                ],
                confidence: 0.8,
            },
        },
    });
    const graphSchema = record({
        category: 'schemas',
        recordId:
            'schemas_api_private',
        nodeType: 'schema',
        title: 'Private schema',
        text:
            'PRIVATE_SCHEMA_TEXT',
        entityIds: [
            'hermione',
            'player',
        ],
        stateRevision: 5,
        sourceRefs: [
            {
                type: 'event',
                id: 'event_api_corridor',
            },
            {
                type: 'message',
                id: '501',
            },
        ],
        visibility: {
            scope: 'actor',
            actorIds: [
                'hermione',
            ],
        },
        effectiveClock:
            '1991-09-03 · 16:10',
        sceneId:
            'scene_api_corridor',
        data: {
            schema: {
                id:
                    'schema_api_private',
                observerId:
                    'hermione',
                targetId: 'player',
                labelEn:
                    'Private pattern',
                expectationEn:
                    'Prepare quiet help.',
                confidence: 0.8,
                status: 'active',
                supportAppraisalIds: [
                    'appraisal_api_private',
                ],
                counterAppraisalIds: [],
            },
        },
    });
    const futureRecord = record({
        recordId:
            'events_api_future',
        title: 'Future corridor event',
        text:
            'A rain corridor umbrella event happens tomorrow.',
        stateRevision: 5,
        sourceRefs: [{
            type: 'event',
            id: 'event_api_future',
        }],
        visibility: {
            scope: 'public',
            actorIds: [],
        },
        effectiveClock:
            '1991-09-04 · 16:00',
        sceneId:
            'scene_api_future',
        data: {
            eventKnowledge: {
                eventId:
                    'event_api_future',
            },
        },
    });
    const graphSync =
        await sync({
            ...input,
            stateRevision: 5,
            records: [
                graphEvent,
                graphAppraisal,
                graphSchema,
                futureRecord,
            ],
        });
    assert.equal(
        graphSync.status,
        200,
    );

    const searchGraph = async (
        actorId,
        nodeTypes = [],
    ) => {
        const response =
            await fetch(
                `${base}/search`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body:
                        JSON.stringify({
                            timelineId:
                                'timeline_api',
                            timelineEpoch:
                                'epoch_a',
                            stateRevision: 5,
                            query:
                                'rain corridor umbrella',
                            audience: {
                                actorIds: [
                                    actorId,
                                ],
                                role:
                                    'actor',
                            },
                            clock:
                                '1991-09-03 · 17:00',
                            nodeTypes,
                        }),
                },
            );
        assert.equal(
            response.status,
            200,
        );
        return response.json();
    };
    const hermioneResult =
        await searchGraph(
            'hermione',
        );
    assert.ok(
        hermioneResult.records
            .some(current =>
                current.recordId ===
                    graphSchema.recordId),
    );
    assert.ok(
        hermioneResult.diagnostics
            .plannerSubqueries.length >=
            1 &&
        hermioneResult.diagnostics
            .plannerSubqueries.length <=
            4,
    );
    assert.equal(
        hermioneResult.diagnostics
            .backend,
        'json',
    );
    assert.ok(
        hermioneResult.diagnostics
            .records.some(current =>
                current.recordId ===
                    graphSchema.recordId &&
                current.hop === 2),
    );
    assert.ok(
        Array.isArray(
            hermioneResult
                .diagnostics
                .suppression,
        ),
    );
    assert.equal(
        JSON.stringify(
            hermioneResult
                .diagnostics,
        ).includes(
            'PRIVATE_SCHEMA_TEXT',
        ),
        false,
    );

    const ronResult =
        await searchGraph('ron');
    assert.deepEqual(
        ronResult.records.map(
            current =>
                current.recordId,
        ),
        [
            graphEvent.recordId,
        ],
    );
    assert.ok(
        ronResult.diagnostics
            .suppression.some(entry =>
                entry.reason ===
                    'audience'),
    );
    const factsOnly =
        await searchGraph(
            'hermione',
            ['fact'],
        );
    assert.ok(
        factsOnly.records.every(
            current =>
                current.nodeType ===
                'fact',
        ),
    );
    assert.equal(
        factsOnly.records.some(
            current =>
                current.recordId ===
                    futureRecord.recordId,
        ),
        false,
    );
});
