#!/usr/bin/env node
/* global AggregateError, globalThis */

import {
    access,
    readdir,
    stat,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    buildQdrantPayloadFilter,
    createQdrantKnowledgeBackend,
} from '../src/hogwarts-mud/knowledge-qdrant-backend.js';
import {
    DEFAULT_ARCHIVE,
    DEFAULT_CONFIG,
    DEFAULT_KNOWN_RECORD_ID,
    DEFAULT_KNOWN_SOURCE_REF,
    loadAuthoritativeArchive,
    loadConfiguredQdrant,
} from './sync-hogwarts-knowledge-qdrant.mjs';

const PROJECT_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);
const DEFAULT_SNAPSHOTS_PATH = path.join(
    PROJECT_ROOT,
    'docker',
    'data',
    'qdrant',
    'snapshots',
);
const DEFAULT_RON_ID = 'canon_ronald_bilius_weasley';
const DEFAULT_PLAYER_ID = 'player';
const EXPECTED_VECTOR_DIMENSIONS = 768;
const PRIVATE_PROBE_POINT_ID =
    '00000000-0000-4000-8000-000000000001';
const MISSING_PROBE_POINT_ID =
    '00000000-0000-4000-8000-000000000002';

function argumentValue(argv, index, flag) {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
        throw new TypeError(`${flag} requires a value.`);
    }
    return value;
}

function positiveInteger(flag, value) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new TypeError(`${flag} must be a positive integer.`);
    }
    return parsed;
}

export function parseSmokeArguments(
    argv,
    { cwd = process.cwd() } = {},
) {
    const options = {
        archive: DEFAULT_ARCHIVE,
        config: DEFAULT_CONFIG,
        qdrantUrl: '',
        collection: '',
        snapshotsPath: DEFAULT_SNAPSHOTS_PATH,
        snapshotName: '',
        expectedCount: 101,
        playerId: DEFAULT_PLAYER_ID,
        actorId: '',
        ronId: DEFAULT_RON_ID,
        help: false,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const flag = argv[index];
        if (flag === '--help') {
            options.help = true;
            continue;
        }
        const value = argumentValue(argv, index, flag);
        index += 1;
        switch (flag) {
            case '--archive':
                options.archive = path.resolve(cwd, value);
                break;
            case '--config':
                options.config = path.resolve(cwd, value);
                break;
            case '--qdrant-url':
                options.qdrantUrl = value;
                break;
            case '--collection':
                options.collection = value;
                break;
            case '--snapshots-path':
                options.snapshotsPath = path.resolve(cwd, value);
                break;
            case '--snapshot-name':
                options.snapshotName = value;
                break;
            case '--expected-count':
                options.expectedCount = positiveInteger(flag, value);
                break;
            case '--player-id':
                options.playerId = value;
                break;
            case '--actor-id':
                options.actorId = value;
                break;
            case '--ron-id':
                options.ronId = value;
                break;
            default:
                throw new TypeError(`Unknown argument: ${flag}`);
        }
    }
    return options;
}

function qdrantMatch(key, value) {
    return {
        key,
        match: {
            value,
        },
    };
}

export function buildRecordAclFilter({
    timelineEpoch,
    stateRevision,
    audience,
    recordId,
}) {
    const filter = buildQdrantPayloadFilter({
        timelineEpoch,
        stateRevision,
        audience: {
            actorIds: audience.actorIds || [],
            role: audience.role || 'player',
            includeLocked: Boolean(audience.includeLocked),
        },
    });
    filter.must.push(
        qdrantMatch('recordId', recordId),
    );
    return filter;
}

function visibility(point) {
    return point?.payload?.visibility;
}

function actorIds(point) {
    return visibility(point)?.actorIds || [];
}

export function selectAclCandidates(
    points,
    {
        playerId = DEFAULT_PLAYER_ID,
        actorId = '',
        ronId = DEFAULT_RON_ID,
    } = {},
) {
    const publicPoint = points.find(
        point => visibility(point)?.scope === 'public',
    ) || null;
    const lockedPoint = points.find(
        point => visibility(point)?.scope === 'locked',
    ) || null;
    const missingVisibilityPoint = points.find(
        point => !visibility(point),
    ) || null;
    const privatePoint = points.find(point => {
        const scope = visibility(point)?.scope;
        const allowed = actorIds(point);
        return (
            ['actor', 'witnesses'].includes(scope) &&
            allowed.length > 0 &&
            !allowed.includes(playerId) &&
            !allowed.includes(ronId) &&
            (!actorId || allowed.includes(actorId))
        );
    }) || null;
    const discoveredActorId = actorId || points
        .flatMap(point => actorIds(point))
        .find(id => id !== playerId && id !== ronId) || '';
    return {
        publicPoint,
        privatePoint,
        lockedPoint,
        missingVisibilityPoint,
        actorId: privatePoint
            ? actorIds(privatePoint).find(id => id !== ronId)
            : discoveredActorId,
    };
}

export function createQdrantRequester({
    url,
    apiKey = '',
    timeoutMs = 10_000,
    fetchImpl = globalThis.fetch,
}) {
    const endpoint = String(url || '').replace(/\/+$/u, '');
    return async function request(
        pathname,
        {
            method = 'GET',
            body,
            allowNotFound = false,
            responseType = 'json',
        } = {},
    ) {
        const response = await fetchImpl(
            `${endpoint}${pathname}`,
            {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'api-key': apiKey } : {}),
                },
                ...(body === undefined
                    ? {}
                    : { body: JSON.stringify(body) }),
                signal: AbortSignal.timeout(timeoutMs),
            },
        );
        if (allowNotFound && response.status === 404) {
            return null;
        }
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(
                `Qdrant ${method} ${pathname} failed with ${response.status}: ${detail.slice(0, 500)}`,
            );
        }
        if (response.status === 204) {
            return null;
        }
        if (responseType === 'text') {
            return response.text();
        }
        return response.json();
    };
}

async function verifyHealth(request) {
    const response = String(
        await request(
            '/healthz',
            {
                responseType: 'text',
            },
        ),
    ).trim();
    if (response !== 'healthz check passed') {
        throw new Error(
            `Qdrant health check failed: ${response || 'empty response'}`,
        );
    }
    return {
        healthy: true,
        path: '/healthz',
        response,
    };
}

async function verifyCollectionStatus(
    request,
    {
        collection,
        expectedCount,
    },
) {
    const response = await request(
        `/collections/${encodeURIComponent(collection)}`,
    );
    const result = response?.result;
    const status = String(result?.status || '');
    const vectorSize = Number(
        result?.config?.params?.vectors?.size,
    );
    const pointsCount = Number(result?.points_count);
    if (status !== 'green') {
        throw new Error(
            `Qdrant collection ${collection} is ${status || 'missing'}, expected green.`,
        );
    }
    if (vectorSize !== EXPECTED_VECTOR_DIMENSIONS) {
        throw new Error(
            `Qdrant collection ${collection} vector size is ${vectorSize}, expected ${EXPECTED_VECTOR_DIMENSIONS}.`,
        );
    }
    assertCount(
        'Qdrant collection info',
        pointsCount,
        expectedCount,
    );
    return {
        status,
        vectorSize,
        expectedVectorSize:
            EXPECTED_VECTOR_DIMENSIONS,
        pointsCount,
    };
}

async function scrollAllPoints(request, collection) {
    const points = [];
    let offset;
    do {
        const body = {
            limit: 256,
            with_payload: true,
            with_vector: false,
            ...(offset === undefined ? {} : { offset }),
        };
        const response = await request(
            `/collections/${encodeURIComponent(collection)}/points/scroll`,
            {
                method: 'POST',
                body,
            },
        );
        points.push(...(response?.result?.points || []));
        offset = response?.result?.next_page_offset;
    } while (offset !== null && offset !== undefined);
    return points;
}

async function exactCount(request, collection, filter) {
    const body = {
        exact: true,
        ...(filter ? { filter } : {}),
    };
    const response = await request(
        `/collections/${encodeURIComponent(collection)}/points/count`,
        {
            method: 'POST',
            body,
        },
    );
    return {
        count: Number(response?.result?.count),
        request: {
            method: 'POST',
            path: `/collections/${collection}/points/count`,
            body,
        },
    };
}

function assertCount(label, actual, expected) {
    if (actual !== expected) {
        throw new Error(
            `${label} expected count ${expected}, received ${actual}.`,
        );
    }
}

function pointSummary(point, source) {
    return {
        source,
        pointId: point.id,
        recordId: point.payload.recordId,
        visibility: point.payload.visibility || null,
    };
}

function probePayload({
    recordId,
    timelineEpoch,
    stateRevision,
    visibility: recordVisibility,
}) {
    return {
        recordId,
        timelineEpoch,
        stateRevision,
        ...(recordVisibility
            ? { visibility: recordVisibility }
            : {}),
        record: {
            version: 2,
            projectorVersion: 2,
            recordId,
            sourceRefs: [{
                type: 'probe',
                id: recordId,
                revision: stateRevision,
            }],
            ...(recordVisibility
                ? { visibility: recordVisibility }
                : {}),
        },
    };
}

async function createTemporaryAclCollection(
    request,
    {
        timelineEpoch,
        stateRevision,
        actorId,
        needsPrivate,
        needsMissing,
    },
) {
    const collection = `task22_smoke_${process.pid}_${Date.now()}`;
    try {
        await request(
            `/collections/${encodeURIComponent(collection)}`,
            {
                method: 'PUT',
                body: {
                    vectors: {
                        size: 1,
                        distance: 'Cosine',
                    },
                },
            },
        );
        const points = [];
        if (needsPrivate) {
            points.push({
                id: PRIVATE_PROBE_POINT_ID,
                vector: [1],
                payload: probePayload({
                    recordId: 'task22_actor_private_probe',
                    timelineEpoch,
                    stateRevision,
                    visibility: {
                        scope: 'actor',
                        actorIds: [actorId],
                    },
                }),
            });
        }
        if (needsMissing) {
            points.push({
                id: MISSING_PROBE_POINT_ID,
                vector: [1],
                payload: probePayload({
                    recordId: 'task22_missing_visibility_probe',
                    timelineEpoch,
                    stateRevision,
                    visibility: null,
                }),
            });
        }
        await request(
            `/collections/${encodeURIComponent(collection)}/points?wait=true`,
            {
                method: 'PUT',
                body: {
                    points,
                },
            },
        );
        return {
            collection,
            points,
        };
    } catch (error) {
        try {
            await deleteTemporaryCollection(
                request,
                collection,
            );
        } catch (cleanupError) {
            throw new AggregateError(
                [
                    error,
                    cleanupError,
                ],
                `Temporary ACL collection setup and cleanup failed: ${collection}`,
            );
        }
        throw error;
    }
}

async function deleteTemporaryCollection(request, collection) {
    if (!collection) {
        return false;
    }
    await request(
        `/collections/${encodeURIComponent(collection)}`,
        {
            method: 'DELETE',
            allowNotFound: true,
        },
    );
    const remaining = await request(
        `/collections/${encodeURIComponent(collection)}`,
        {
            allowNotFound: true,
        },
    );
    if (remaining !== null) {
        throw new Error(
            `Temporary ACL collection was not deleted: ${collection}`,
        );
    }
    return true;
}

async function countAclRecord(
    request,
    collection,
    point,
    audience,
) {
    const filter = buildRecordAclFilter({
        timelineEpoch: point.payload.timelineEpoch,
        stateRevision: point.payload.stateRevision,
        audience,
        recordId: point.payload.recordId,
    });
    return exactCount(
        request,
        collection,
        filter,
    );
}

async function runAclSmoke(
    request,
    {
        collection,
        points,
        playerId,
        actorId,
        ronId,
        timelineEpoch,
        stateRevision,
    },
) {
    const candidates = selectAclCandidates(
        points,
        {
            playerId,
            actorId,
            ronId,
        },
    );
    if (!candidates.publicPoint || !candidates.lockedPoint) {
        throw new Error(
            'Tina collection needs at least one public and one locked record for Task22 ACL smoke.',
        );
    }
    if (!candidates.actorId) {
        throw new Error(
            'No real actor ID is available for the actor-private ACL probe.',
        );
    }
    let temporary;
    try {
        if (
            !candidates.privatePoint ||
            !candidates.missingVisibilityPoint
        ) {
            temporary = await createTemporaryAclCollection(
                request,
                {
                    timelineEpoch,
                    stateRevision,
                    actorId: candidates.actorId,
                    needsPrivate: !candidates.privatePoint,
                    needsMissing:
                        !candidates.missingVisibilityPoint,
                },
            );
        }
        const privatePoint = candidates.privatePoint || temporary.points
            .find(point =>
                point.payload.recordId ===
                'task22_actor_private_probe');
        const missingPoint = candidates.missingVisibilityPoint ||
            temporary.points.find(point =>
                point.payload.recordId ===
                'task22_missing_visibility_probe');
        const privateCollection = candidates.privatePoint
            ? collection
            : temporary.collection;
        const missingCollection = candidates.missingVisibilityPoint
            ? collection
            : temporary.collection;
        const publicResult = await countAclRecord(
            request,
            collection,
            candidates.publicPoint,
            {
                actorIds: [playerId],
                role: 'player',
                includeLocked: false,
            },
        );
        const privateAuthorized = await countAclRecord(
            request,
            privateCollection,
            privatePoint,
            {
                actorIds: [candidates.actorId],
                role: 'player',
                includeLocked: false,
            },
        );
        const privatePlayer = await countAclRecord(
            request,
            privateCollection,
            privatePoint,
            {
                actorIds: [playerId],
                role: 'player',
                includeLocked: false,
            },
        );
        const privateRon = await countAclRecord(
            request,
            privateCollection,
            privatePoint,
            {
                actorIds: [ronId],
                role: 'player',
                includeLocked: false,
            },
        );
        const lockedResult = await countAclRecord(
            request,
            collection,
            candidates.lockedPoint,
            {
                actorIds: [candidates.actorId],
                role: 'player',
                includeLocked: false,
            },
        );
        const missingResult = await countAclRecord(
            request,
            missingCollection,
            missingPoint,
            {
                actorIds: [candidates.actorId],
                role: 'player',
                includeLocked: false,
            },
        );
        assertCount('public ACL', publicResult.count, 1);
        assertCount(
            'authorized actor-private ACL',
            privateAuthorized.count,
            1,
        );
        assertCount(
            'player unauthorized actor-private ACL',
            privatePlayer.count,
            0,
        );
        assertCount(
            'Ron unauthorized actor-private ACL',
            privateRon.count,
            0,
        );
        assertCount('locked ACL', lockedResult.count, 0);
        assertCount(
            'missing visibility ACL',
            missingResult.count,
            0,
        );
        return {
            transport: 'qdrant_rest_points_count',
            serverSidePayloadFilter: true,
            clientSidePostFilter: false,
            public: {
                ...pointSummary(
                    candidates.publicPoint,
                    'tina_collection',
                ),
                count: publicResult.count,
                filter: publicResult.request.body.filter,
            },
            actorPrivate: {
                ...pointSummary(
                    privatePoint,
                    candidates.privatePoint
                        ? 'tina_collection'
                        : 'temporary_collection',
                ),
                authorizedActorId: candidates.actorId,
                authorizedCount: privateAuthorized.count,
                playerId,
                playerUnauthorizedCount: privatePlayer.count,
                ronId,
                ronUnauthorizedCount: privateRon.count,
                filters: {
                    authorized:
                        privateAuthorized.request.body.filter,
                    player:
                        privatePlayer.request.body.filter,
                    ron:
                        privateRon.request.body.filter,
                },
            },
            locked: {
                ...pointSummary(
                    candidates.lockedPoint,
                    'tina_collection',
                ),
                includeLocked: false,
                count: lockedResult.count,
                filter: lockedResult.request.body.filter,
            },
            missingVisibility: {
                ...pointSummary(
                    missingPoint,
                    candidates.missingVisibilityPoint
                        ? 'tina_collection'
                        : 'temporary_collection',
                ),
                includeLocked: false,
                count: missingResult.count,
                filter: missingResult.request.body.filter,
            },
            temporaryCollection: temporary
                ? {
                    name: temporary.collection,
                    created: true,
                    cleaned: false,
                }
                : {
                    name: '',
                    created: false,
                    cleaned: true,
                },
        };
    } finally {
        if (temporary) {
            await deleteTemporaryCollection(
                request,
                temporary.collection,
            );
        }
    }
}

async function findSnapshotFile(root, snapshotName) {
    const entries = await readdir(
        root,
        {
            withFileTypes: true,
        },
    );
    for (const entry of entries) {
        const candidate = path.join(root, entry.name);
        if (entry.isDirectory()) {
            const nested = await findSnapshotFile(
                candidate,
                snapshotName,
            );
            if (nested) {
                return nested;
            }
        } else if (
            entry.isFile() &&
            entry.name === snapshotName
        ) {
            return candidate;
        }
    }
    return '';
}

async function verifySnapshot(
    request,
    {
        collection,
        snapshotsPath,
        snapshotName,
    },
) {
    await access(snapshotsPath);
    let name = snapshotName;
    let created = false;
    if (!name) {
        const response = await request(
            `/collections/${encodeURIComponent(collection)}/snapshots`,
            {
                method: 'POST',
            },
        );
        name = response?.result?.name || '';
        created = true;
    }
    if (!name) {
        throw new Error('Qdrant did not return a snapshot name.');
    }
    const listResponse = await request(
        `/collections/${encodeURIComponent(collection)}/snapshots`,
    );
    const listed = (listResponse?.result || []).some(
        snapshot => snapshot.name === name,
    );
    if (!listed) {
        throw new Error(
            `Snapshot is absent from Qdrant snapshot list: ${name}`,
        );
    }
    const filePath = await findSnapshotFile(
        snapshotsPath,
        name,
    );
    if (!filePath) {
        throw new Error(
            `Snapshot is absent from explicit path ${snapshotsPath}: ${name}`,
        );
    }
    const fileStat = await stat(filePath);
    return {
        name,
        created,
        listed,
        snapshotsPath,
        filePath,
        size: fileStat.size,
    };
}

async function verifyKnownSourceRef(
    request,
    {
        collection,
        timelineEpoch,
        stateRevision,
        playerId,
    },
) {
    const filter = buildRecordAclFilter({
        timelineEpoch,
        stateRevision,
        audience: {
            actorIds: [playerId],
            role: 'player',
            includeLocked: false,
        },
        recordId: DEFAULT_KNOWN_RECORD_ID,
    });
    const body = {
        filter,
        limit: 1,
        with_payload: true,
        with_vector: false,
    };
    const response = await request(
        `/collections/${encodeURIComponent(collection)}/points/scroll`,
        {
            method: 'POST',
            body,
        },
    );
    const point = response?.result?.points?.[0];
    const sourceRefs = point?.payload?.record?.sourceRefs || [];
    const matched = sourceRefs.some(ref =>
        ref.type === DEFAULT_KNOWN_SOURCE_REF.type &&
        ref.id === DEFAULT_KNOWN_SOURCE_REF.id);
    if (
        point?.payload?.recordId !== DEFAULT_KNOWN_RECORD_ID ||
        !matched
    ) {
        throw new Error(
            `Known sourceRef was not found through Qdrant payload filter: ${DEFAULT_KNOWN_RECORD_ID}`,
        );
    }
    return {
        recordId: DEFAULT_KNOWN_RECORD_ID,
        sourceRef: DEFAULT_KNOWN_SOURCE_REF,
        matched: true,
        filter,
    };
}

function archiveTimelineId(archivePath) {
    return path.basename(
        archivePath,
        path.extname(archivePath),
    );
}

export async function runQdrantSmoke(
    options,
    dependencies = {},
) {
    const loadArchive = dependencies.loadArchive ||
        loadAuthoritativeArchive;
    const loadQdrant = dependencies.loadQdrant ||
        loadConfiguredQdrant;
    const before = await loadArchive(options.archive);
    const qdrant = loadQdrant({
        config: options.config,
        qdrantUrl: options.qdrantUrl,
        embeddingModel: '',
        dimensions: null,
        collectionPrefix: '',
        timeoutMs: null,
        dataRoot: '',
        allowNonLoopback: false,
    });
    const request = dependencies.request ||
        createQdrantRequester(qdrant);
    const backend = createQdrantKnowledgeBackend({
        ...qdrant,
        embedder: async () => [],
    });
    const timelineId = archiveTimelineId(before.archivePath);
    const collection = options.collection ||
        backend.collectionName(timelineId);
    const health = await verifyHealth(request);
    const collectionStatus =
        await verifyCollectionStatus(
            request,
            {
                collection,
                expectedCount:
                    options.expectedCount,
            },
        );
    const countBefore = await exactCount(request, collection);
    assertCount(
        'Tina collection before smoke',
        countBefore.count,
        options.expectedCount,
    );
    const points = await scrollAllPoints(
        request,
        collection,
    );
    assertCount(
        'Tina scroll result',
        points.length,
        options.expectedCount,
    );
    const acl = await runAclSmoke(
        request,
        {
            collection,
            points,
            playerId: options.playerId,
            actorId: options.actorId,
            ronId: options.ronId,
            timelineEpoch: before.state.timelineEpoch,
            stateRevision: Number(before.state.stateRevision),
        },
    );
    if (acl.temporaryCollection.created) {
        acl.temporaryCollection.cleaned = true;
    }
    const knownSourceRef = await verifyKnownSourceRef(
        request,
        {
            collection,
            timelineEpoch: before.state.timelineEpoch,
            stateRevision: Number(before.state.stateRevision),
            playerId: options.playerId,
        },
    );
    const snapshot = await verifySnapshot(
        request,
        {
            collection,
            snapshotsPath: options.snapshotsPath,
            snapshotName: options.snapshotName,
        },
    );
    const countAfter = await exactCount(request, collection);
    assertCount(
        'Tina collection after smoke',
        countAfter.count,
        options.expectedCount,
    );
    const after = await loadArchive(options.archive);
    if (before.sha256 !== after.sha256) {
        throw new Error(
            'Authoritative archive changed during Qdrant smoke.',
        );
    }
    return {
        backend: 'qdrant',
        endpoint: qdrant.url,
        collection,
        collectionGeneration: backend.generation,
        health,
        collectionStatus,
        exactCountBefore: countBefore.count,
        exactCountAfter: countAfter.count,
        archive: {
            path: before.archivePath,
            beforeSha256: before.sha256,
            afterSha256: after.sha256,
            unchanged: true,
        },
        acl,
        knownSourceRef,
        snapshot,
    };
}

export function smokeUsage() {
    return [
        'Usage: node scripts/smoke-hogwarts-qdrant.mjs [options]',
        '',
        'Options:',
        '  --archive PATH',
        '  --config PATH',
        '  --qdrant-url URL',
        '  --collection NAME',
        '  --snapshots-path PATH',
        '  --snapshot-name NAME  verify an existing snapshot instead of creating one',
        '  --expected-count NUMBER',
        '  --player-id ID',
        '  --actor-id ID',
        '  --ron-id ID',
        '  --help',
        '',
        'ACL acceptance uses Qdrant REST points/count payload filters.',
        'Temporary ACL probe collections are always deleted.',
    ].join('\n');
}

const isMain = process.argv[1] &&
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
    const options = parseSmokeArguments(
        process.argv.slice(2),
    );
    if (options.help) {
        process.stdout.write(`${smokeUsage()}\n`);
    } else {
        runQdrantSmoke(options)
            .then(result => {
                process.stdout.write(
                    `${JSON.stringify(result, null, 2)}\n`,
                );
            })
            .catch(error => {
                process.stderr.write(
                    `${error?.stack || error}\n`,
                );
                process.exitCode = 1;
            });
    }
}
