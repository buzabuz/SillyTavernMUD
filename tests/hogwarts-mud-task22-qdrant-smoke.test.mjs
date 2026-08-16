/* eslint-disable playwright/expect-expect */

import assert from 'node:assert/strict';
import {
    mkdtemp,
    rm,
    writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    parseSmokeArguments,
    runQdrantSmoke,
} from '../scripts/smoke-hogwarts-qdrant.mjs';
import {
    DEFAULT_KNOWN_RECORD_ID,
    DEFAULT_KNOWN_SOURCE_REF,
} from '../scripts/sync-hogwarts-knowledge-qdrant.mjs';

const TIMELINE_EPOCH = 'epoch_task22_smoke';
const STATE_REVISION = 41;
const ACTOR_ID = 'canon_hermione_jean_granger';
const COLLECTION = 'task22_tina_collection';
const SNAPSHOT_NAME = 'task22-existing.snapshot';

function visibilityPoint(
    index,
    visibility,
    {
        recordId = `record_${index}`,
        sourceRefs = [{
            type: 'message',
            id: String(index),
        }],
    } = {},
) {
    return {
        id: `00000000-0000-4000-8000-${String(index)
            .padStart(12, '0')}`,
        payload: {
            recordId,
            timelineEpoch: TIMELINE_EPOCH,
            stateRevision: STATE_REVISION,
            ...(visibility ? { visibility } : {}),
            record: {
                version: 2,
                projectorVersion: 2,
                recordId,
                sourceRefs,
                ...(visibility ? { visibility } : {}),
            },
        },
    };
}

function tinaPoints() {
    return [
        visibilityPoint(
            1,
            {
                scope: 'public',
                actorIds: [],
            },
            {
                recordId: DEFAULT_KNOWN_RECORD_ID,
                sourceRefs: [{
                    ...DEFAULT_KNOWN_SOURCE_REF,
                }],
            },
        ),
        visibilityPoint(
            2,
            {
                scope: 'locked',
                actorIds: [ACTOR_ID],
            },
        ),
        ...Array.from(
            {
                length: 99,
            },
            (_, index) =>
                visibilityPoint(
                    index + 3,
                    {
                        scope: 'public',
                        actorIds: [],
                    },
                ),
        ),
    ];
}

function payloadValue(payload, key) {
    return key.split('.')
        .reduce(
            (value, segment) =>
                value?.[segment],
            payload,
        );
}

function matchesCondition(payload, condition) {
    if (condition.must) {
        return condition.must.every(item =>
            matchesCondition(payload, item));
    }
    const value = payloadValue(
        payload,
        condition.key,
    );
    if (condition.range) {
        return (
            (
                condition.range.lte ===
                    undefined ||
                value <=
                    condition.range.lte
            ) &&
            (
                condition.range.gte ===
                    undefined ||
                value >=
                    condition.range.gte
            )
        );
    }
    if (!condition.match) {
        return false;
    }
    if (Object.hasOwn(condition.match, 'value')) {
        return value === condition.match.value;
    }
    if (condition.match.any) {
        if (Array.isArray(value)) {
            return value.some(item =>
                condition.match.any.includes(item));
        }
        return condition.match.any.includes(value);
    }
    return false;
}

function matchesFilter(point, filter) {
    const payload = point.payload || {};
    const must = filter?.must || [];
    const should = filter?.should || [];
    return (
        must.every(condition =>
            matchesCondition(payload, condition)) &&
        (
            should.length === 0 ||
            should.some(condition =>
                matchesCondition(payload, condition))
        )
    );
}

function fakeArchive(sha256 = 'archive-sha') {
    return {
        archivePath: '/tmp/Tina.jsonl',
        sha256,
        state: {
            timelineEpoch: TIMELINE_EPOCH,
            stateRevision: STATE_REVISION,
        },
        chat: [],
    };
}

function smokeOptions(
    snapshotsPath,
    overrides = {},
) {
    return {
        ...parseSmokeArguments([
            '--archive',
            '/tmp/Tina.jsonl',
            '--collection',
            COLLECTION,
            '--snapshots-path',
            snapshotsPath,
        ]),
        ...overrides,
    };
}

function createFakeQdrant({
    failTemporaryUpsert = false,
} = {}) {
    const collections = new Map([
        [
            COLLECTION,
            tinaPoints(),
        ],
    ]);
    const calls = [];

    async function request(
        pathname,
        options = {},
    ) {
        const method = options.method || 'GET';
        const body = options.body;
        calls.push({
            pathname,
            method,
            body,
        });
        if (pathname === '/healthz') {
            return 'healthz check passed';
        }
        const match = pathname.match(
            /^\/collections\/([^/?]+)(.*)$/u,
        );
        assert.ok(
            match,
            `Unexpected fake Qdrant path: ${pathname}`,
        );
        const collection = decodeURIComponent(
            match[1],
        );
        const suffix = match[2];
        if (
            method === 'GET' &&
            suffix === ''
        ) {
            if (!collections.has(collection)) {
                return null;
            }
            return {
                result: {
                    status: 'green',
                    optimizer_status: 'ok',
                    points_count:
                        collections.get(collection).length,
                    config: {
                        params: {
                            vectors: {
                                size: 768,
                                distance: 'Cosine',
                            },
                        },
                    },
                },
            };
        }
        if (
            method === 'PUT' &&
            suffix === ''
        ) {
            collections.set(
                collection,
                [],
            );
            return {
                result: true,
            };
        }
        if (
            method === 'DELETE' &&
            suffix === ''
        ) {
            collections.delete(collection);
            return {
                result: true,
            };
        }
        if (
            method === 'PUT' &&
            suffix === '/points?wait=true'
        ) {
            if (
                failTemporaryUpsert &&
                collection.startsWith('task22_smoke_')
            ) {
                throw new Error(
                    'fake temporary points upsert failed',
                );
            }
            collections.set(
                collection,
                body.points.map(point => ({
                    id: point.id,
                    payload: point.payload,
                })),
            );
            return {
                result: {
                    status: 'completed',
                },
            };
        }
        if (
            method === 'POST' &&
            suffix === '/points/count'
        ) {
            const points =
                collections.get(collection) || [];
            return {
                result: {
                    count: body.filter
                        ? points.filter(point =>
                            matchesFilter(
                                point,
                                body.filter,
                            )).length
                        : points.length,
                },
            };
        }
        if (
            method === 'POST' &&
            suffix === '/points/scroll'
        ) {
            const points =
                collections.get(collection) || [];
            return {
                result: {
                    points: body.filter
                        ? points.filter(point =>
                            matchesFilter(
                                point,
                                body.filter,
                            ))
                        : points,
                    next_page_offset: null,
                },
            };
        }
        if (
            method === 'POST' &&
            suffix === '/snapshots'
        ) {
            return {
                result: {
                    name: SNAPSHOT_NAME,
                },
            };
        }
        if (
            method === 'GET' &&
            suffix === '/snapshots'
        ) {
            return {
                result: [{
                    name: SNAPSHOT_NAME,
                }],
            };
        }
        throw new Error(
            `Unexpected fake Qdrant request: ${method} ${pathname}`,
        );
    }

    return {
        calls,
        collections,
        request,
    };
}

async function createSnapshotFixture(t) {
    const root = await mkdtemp(
        path.join(
            os.tmpdir(),
            'task22-qdrant-smoke-',
        ),
    );
    await writeFile(
        path.join(
            root,
            SNAPSHOT_NAME,
        ),
        'real-snapshot-bytes',
    );
    t.after(async () => {
        await rm(
            root,
            {
                recursive: true,
                force: true,
            },
        );
    });
    return root;
}

test('[defect-probing] Task22 smoke CLI parameterizes Qdrant URL, collection, and archive', () => {
    const options = parseSmokeArguments([
        '--qdrant-url',
        'http://127.0.0.1:7333',
        '--collection',
        'explicit_collection',
        '--archive',
        'Tina.jsonl',
    ], {
        cwd: '/tmp/task22',
    });

    assert.equal(
        options.qdrantUrl,
        'http://127.0.0.1:7333',
    );
    assert.equal(
        options.collection,
        'explicit_collection',
    );
    assert.equal(
        options.archive,
        '/tmp/task22/Tina.jsonl',
    );
});

test('[defect-probing] Task22 smoke reports health, green 768 collection, server-side ACL counts, and cleanup', async t => {
    const snapshotsPath =
        await createSnapshotFixture(t);
    const fake =
        createFakeQdrant();
    const loadedOptions = [];
    let archiveReads = 0;

    const result = await runQdrantSmoke(
        smokeOptions(
            snapshotsPath,
            {
                qdrantUrl:
                    'http://127.0.0.1:7333',
            },
        ),
        {
            async loadArchive() {
                archiveReads += 1;
                return fakeArchive();
            },
            loadQdrant(options) {
                loadedOptions.push(options);
                return {
                    enabled: true,
                    url: options.qdrantUrl,
                    apiKey: '',
                    collectionPrefix:
                        'hogwarts_knowledge',
                    embeddingModel:
                        'Cohee/jina-embeddings-v2-base-en',
                    dimensions: 768,
                    timeoutMs: 10_000,
                };
            },
            request: fake.request,
        },
    );

    assert.equal(
        archiveReads,
        2,
    );
    assert.deepEqual(
        result.health,
        {
            healthy: true,
            path: '/healthz',
            response: 'healthz check passed',
        },
    );
    assert.deepEqual(
        result.collectionStatus,
        {
            status: 'green',
            vectorSize: 768,
            expectedVectorSize: 768,
            pointsCount: 101,
        },
    );
    assert.equal(
        loadedOptions[0].qdrantUrl,
        'http://127.0.0.1:7333',
    );
    assert.equal(
        result.exactCountBefore,
        101,
    );
    assert.equal(
        result.exactCountAfter,
        101,
    );
    assert.equal(
        result.acl.serverSidePayloadFilter,
        true,
    );
    assert.equal(
        result.acl.clientSidePostFilter,
        false,
    );
    assert.equal(
        result.acl.public.count,
        1,
    );
    assert.equal(
        result.acl.actorPrivate.authorizedCount,
        1,
    );
    assert.equal(
        result.acl.actorPrivate.playerUnauthorizedCount,
        0,
    );
    assert.equal(
        result.acl.actorPrivate.ronUnauthorizedCount,
        0,
    );
    assert.equal(
        result.acl.locked.count,
        0,
    );
    assert.equal(
        result.acl.missingVisibility.count,
        0,
    );
    assert.equal(
        result.acl.temporaryCollection.created,
        true,
    );
    assert.equal(
        result.acl.temporaryCollection.cleaned,
        true,
    );
    assert.equal(
        result.knownSourceRef.matched,
        true,
    );
    assert.equal(
        result.snapshot.listed,
        true,
    );
    assert.equal(
        result.archive.unchanged,
        true,
    );
    assert.ok(
        fake.calls.some(call =>
            call.method === 'POST' &&
            call.pathname.endsWith('/points/count') &&
            call.body?.filter),
    );
    assert.equal(
        [...fake.collections.keys()]
            .filter(name =>
                name.startsWith('task22_smoke_'))
            .length,
        0,
    );
});

test('[defect-probing] Task22 smoke deletes a temporary ACL collection when probe upsert fails', async t => {
    const snapshotsPath =
        await createSnapshotFixture(t);
    const fake =
        createFakeQdrant({
            failTemporaryUpsert: true,
        });

    await assert.rejects(
        runQdrantSmoke(
            smokeOptions(
                snapshotsPath,
            ),
            {
                async loadArchive() {
                    return fakeArchive();
                },
                loadQdrant() {
                    return {
                        enabled: true,
                        url:
                            'http://127.0.0.1:6333',
                        apiKey: '',
                        collectionPrefix:
                            'hogwarts_knowledge',
                        embeddingModel:
                            'Cohee/jina-embeddings-v2-base-en',
                        dimensions: 768,
                        timeoutMs: 10_000,
                    };
                },
                request: fake.request,
            },
        ),
        /temporary points upsert failed/u,
    );
    assert.equal(
        [...fake.collections.keys()]
            .filter(name =>
                name.startsWith('task22_smoke_'))
            .length,
        0,
    );
    assert.ok(
        fake.calls.some(call =>
            call.method === 'DELETE' &&
            call.pathname.startsWith(
                '/collections/task22_smoke_',
            )),
    );
});

test('Task22 smoke rejects archive SHA drift after Qdrant verification', async t => {
    const snapshotsPath =
        await createSnapshotFixture(t);
    const fake =
        createFakeQdrant();
    let archiveReads = 0;

    await assert.rejects(
        runQdrantSmoke(
            smokeOptions(
                snapshotsPath,
            ),
            {
                async loadArchive() {
                    archiveReads += 1;
                    return fakeArchive(
                        archiveReads === 1
                            ? 'before-sha'
                            : 'after-sha',
                    );
                },
                loadQdrant() {
                    return {
                        enabled: true,
                        url:
                            'http://127.0.0.1:6333',
                        apiKey: '',
                        collectionPrefix:
                            'hogwarts_knowledge',
                        embeddingModel:
                            'Cohee/jina-embeddings-v2-base-en',
                        dimensions: 768,
                        timeoutMs: 10_000,
                    };
                },
                request: fake.request,
            },
        ),
        /archive changed during Qdrant smoke/u,
    );
});
