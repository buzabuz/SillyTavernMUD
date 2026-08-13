import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    chmod,
    mkdtemp,
    rm,
    writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    DEFAULT_KNOWN_RECORD_ID,
    DEFAULT_KNOWN_SOURCE_REF,
    buildAuthoritativeKnowledgeProjection,
    loadAuthoritativeArchive,
    parseArguments,
    runKnowledgeSync,
} from '../scripts/sync-hogwarts-knowledge-qdrant.mjs';

function fixtureState() {
    return {
        timelineEpoch:
            'epoch_task22_fixture',
        stateRevision: 7,
        clock:
            '1991-09-02 · 19:15',
        items: [{
            id:
                'harry_spare_brass_quill',
            ownerId:
                'canon_harry_james_potter',
            holderId: '',
            state: 'destroyed',
            physicalForm: 'absent',
            sourceEventId:
                DEFAULT_KNOWN_SOURCE_REF
                    .id,
            location: {
                mapId: '',
                roomId: '',
                placement: '',
            },
        }],
        actors: [],
        actorLibrary: [],
        sceneArchive: [],
        eventKnowledge: [],
        storyArcs: [],
        memorySynapse: {
            appraisals: [],
            personSchemas: [],
        },
    };
}

function knownRecord() {
    return {
        version: 2,
        projectorVersion: 2,
        recordId:
            DEFAULT_KNOWN_RECORD_ID,
        nodeType: 'fact',
        category: 'events',
        title:
            'Current material state',
        text:
            'The spare brass quill is destroyed and physically absent.',
        entityIds: [
            'harry_spare_brass_quill',
        ],
        tags: [
            'current',
        ],
        timelineEpoch:
            'epoch_task22_fixture',
        stateRevision: 7,
        sourceRefs: [{
            ...DEFAULT_KNOWN_SOURCE_REF,
        }],
        visibility: {
            scope: 'public',
            actorIds: [],
        },
        effectiveClock:
            '1991-09-02 · 19:15',
        sceneId: '',
        contentChecksum:
            'cyrb53-fixture',
        data: {},
    };
}

function syncOptions(
    overrides = {},
) {
    return {
        ...parseArguments([
            '--archive',
            '/tmp/task22.jsonl',
            '--expected-record-count',
            '1',
        ]),
        ...overrides,
    };
}

test('Task22 sync CLI parses explicit parameters and rejects archive write modes', () => {
    const options =
        parseArguments([
            '--archive',
            'archive.jsonl',
            '--config',
            'local-config.yaml',
            '--operation',
            'upsert',
            '--timeline-id',
            'tina_timeline',
            '--query',
            'vanished quill',
            '--known-record-id',
            'known_record',
            '--known-source-ref',
            'message:202',
            '--expected-record-count',
            '101',
            '--limit',
            '12',
            '--audience-actor',
            'player',
            '--qdrant-url',
            'http://127.0.0.1:6333',
            '--embedding-model',
            'Cohee/jina-embeddings-v2-base-en',
            '--dimensions',
            '768',
            '--collection-prefix',
            'hogwarts_knowledge',
            '--timeout-ms',
            '20000',
        ], {
            cwd: '/tmp/task22',
        });

    assert.equal(
        options.archive,
        '/tmp/task22/archive.jsonl',
    );
    assert.equal(
        options.config,
        '/tmp/task22/local-config.yaml',
    );
    assert.equal(
        options.operation,
        'upsert',
    );
    assert.equal(
        options.expectedRecordCount,
        101,
    );
    assert.equal(
        options.dimensions,
        768,
    );
    assert.deepEqual(
        options.knownSourceRef,
        {
            type: 'message',
            id: '202',
        },
    );
    assert.deepEqual(
        options.audienceActorIds,
        ['player'],
    );
    assert.throws(
        () =>
            parseArguments([
                '--apply',
            ]),
        /never writes archive or State/u,
    );
    assert.throws(
        () =>
            parseArguments([
                '--archive',
            ]),
        /requires a value/u,
    );
    assert.throws(
        () =>
            parseArguments([
                '--dimensions',
                '0',
            ]),
        /greater than or equal to 1/u,
    );
    assert.throws(
        () =>
            parseArguments([
                '--operation',
                'sync',
            ]),
        /rebuild or upsert/u,
    );
});

test('Task22 archive loader opens JSONL read-only and exposes State plus chat', async t => {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'task22-archive-',
            ),
        );
    const archivePath =
        path.join(
            root,
            'tina.jsonl',
        );
    const source = [
        JSON.stringify({
            chat_metadata: {
                hogwartsMud:
                    fixtureState(),
            },
        }),
        JSON.stringify({
            is_user: true,
            mes:
                'A committed player action.',
        }),
    ].join('\n') + '\n';
    await writeFile(
        archivePath,
        source,
    );
    await chmod(
        archivePath,
        0o444,
    );
    t.after(async () => {
        await chmod(
            archivePath,
            0o644,
        );
        await rm(
            root,
            {
                recursive: true,
                force: true,
            },
        );
    });

    const loaded =
        await loadAuthoritativeArchive(
            archivePath,
        );

    assert.equal(
        loaded.state.timelineEpoch,
        'epoch_task22_fixture',
    );
    assert.equal(
        loaded.state.stateRevision,
        7,
    );
    assert.equal(
        loaded.chat.length,
        1,
    );
    assert.equal(
        loaded.sha256,
        createHash('sha256')
            .update(source)
            .digest('hex'),
    );
    assert.equal(
        loaded.lineCount,
        2,
    );
});

test('Task22 authoritative projection builds Knowledge V2 without mutating State or chat', () => {
    const authority = {
        state:
            fixtureState(),
        chat: [],
    };
    const before =
        structuredClone(
            authority,
        );

    const records =
        buildAuthoritativeKnowledgeProjection(
            authority,
        );

    assert.deepEqual(
        authority,
        before,
    );
    assert.equal(
        records.length,
        1,
    );
    assert.equal(
        records[0].recordId,
        DEFAULT_KNOWN_RECORD_ID,
    );
    assert.equal(
        records[0].version,
        2,
    );
    assert.equal(
        records[0].projectorVersion,
        2,
    );
    assert.deepEqual(
        records[0].sourceRefs
            .find(ref =>
                ref.type ===
                    DEFAULT_KNOWN_SOURCE_REF
                        .type &&
                ref.id ===
                    DEFAULT_KNOWN_SOURCE_REF
                        .id),
        DEFAULT_KNOWN_SOURCE_REF,
    );
});

test('Task22 sync orchestrates Qdrant rebuild and sourceRefs query with zero narrative model calls', async () => {
    const state =
        fixtureState();
    const authority = {
        archivePath:
            '/tmp/task22.jsonl',
        sha256:
            'archive-sha',
        size: 120,
        lineCount: 2,
        state,
        chat: [],
    };
    const record =
        knownRecord();
    const calls = {
        rebuild: [],
        query: [],
        collection: [],
    };
    const backend = {
        name: 'qdrant',
        generation:
            'g-task22',
        collectionName() {
            return 'task22_collection';
        },
        async rebuild(input) {
            calls.rebuild.push(
                input,
            );
            return {
                backend: 'qdrant',
                rebuilt: true,
                upserted: 1,
                collection:
                    'task22_collection',
                collectionGeneration:
                    'g-task22',
            };
        },
        async upsert() {
            throw new Error(
                'unexpected upsert',
            );
        },
        async query(input) {
            calls.query.push(
                input,
            );
            return {
                backend: 'qdrant',
                records: [
                    record,
                ],
                diagnostics: {
                    selectedRecordIds: [
                        record.recordId,
                    ],
                },
            };
        },
    };

    const result =
        await runKnowledgeSync(
            syncOptions(),
            {
                async loadArchive() {
                    return authority;
                },
                project() {
                    return [
                        record,
                    ];
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
                        timeoutMs:
                            10_000,
                    };
                },
                createBackend(
                    options,
                ) {
                    assert.equal(
                        typeof options
                            .embedder,
                        'function',
                    );
                    return backend;
                },
                async getCollectionInfo(
                    receivedBackend,
                    collectionName,
                ) {
                    calls.collection
                        .push({
                            receivedBackend,
                            collectionName,
                        });
                    return {
                        points_count: 1,
                        indexed_vectors_count:
                            1,
                    };
                },
            },
        );

    assert.equal(
        calls.rebuild.length,
        1,
    );
    assert.equal(
        calls.rebuild[0]
            .records[0],
        record,
    );
    assert.equal(
        calls.query.length,
        1,
    );
    assert.deepEqual(
        calls.query[0]
            .filters.audience
            .actorIds,
        ['player'],
    );
    assert.equal(
        calls.collection[0]
            .collectionName,
        'task22_collection',
    );
    assert.equal(
        result.backend,
        'qdrant',
    );
    assert.equal(
        result.degraded,
        false,
    );
    assert.equal(
        result.recordCount,
        1,
    );
    assert.equal(
        result.failedCount,
        0,
    );
    assert.equal(
        result.pointCount,
        1,
    );
    assert.equal(
        result.knownQuery
            .matched,
        true,
    );
    assert.equal(
        result.archive
            .unchanged,
        true,
    );
    assert.equal(
        result.modelCallCount,
        0,
    );
    assert.deepEqual(
        result.modelCalls,
        {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
            total: 0,
        },
    );
});

test('Task22 sync aborts before Qdrant when archive SHA changes after projection', async () => {
    const state =
        fixtureState();
    let reads = 0;
    let qdrantLoads = 0;

    await assert.rejects(
        runKnowledgeSync(
            syncOptions(),
            {
                async loadArchive() {
                    reads += 1;
                    return {
                        archivePath:
                            '/tmp/task22.jsonl',
                        sha256:
                            reads === 1
                                ? 'before'
                                : 'changed',
                        size: 120,
                        lineCount: 2,
                        state,
                        chat: [],
                    };
                },
                project() {
                    return [
                        knownRecord(),
                    ];
                },
                loadQdrant() {
                    qdrantLoads += 1;
                    throw new Error(
                        'must not load Qdrant',
                    );
                },
            },
        ),
        /changed during projection preflight/u,
    );
    assert.equal(
        reads,
        2,
    );
    assert.equal(
        qdrantLoads,
        0,
    );
});
