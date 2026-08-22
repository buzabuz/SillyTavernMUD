/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    createQdrantRepairCoordinator,
} from '../src/hogwarts-mud/knowledge-qdrant-repair-coordinator.js';

const INPUT = Object.freeze({
    timelineId: 'timeline_a',
    timelineEpoch: 'epoch_a',
    stateRevision: 7,
    projectionFingerprint: 'cyrb53-snapshot',
    records: [],
    replace: true,
});

function waitFor(
    predicate,
    {
        timeoutMs = 1_000,
    } = {},
) {
    return new Promise(
        (
            resolve,
            reject,
        ) => {
            const deadline =
                Date.now() + timeoutMs;
            const interval =
                setInterval(
                    () => {
                        if (predicate()) {
                            clearInterval(interval);
                            resolve();
                        } else if (
                            Date.now() > deadline
                        ) {
                            clearInterval(interval);
                            reject(
                                new Error(
                                    'Timed out waiting for Qdrant repair.',
                                ),
                            );
                        }
                    },
                    5,
                );
        },
    );
}

function checkpointPath(root) {
    return path.join(
        root,
        encodeURIComponent(
            INPUT.timelineId,
        ),
        'qdrant-repair.json',
    );
}

function readCheckpoint(root) {
    return JSON.parse(
        fs.readFileSync(
            checkpointPath(root),
            'utf8',
        ),
    );
}

function createService(
    repairPreferred,
    {
        exactBackend = null,
    } = {},
) {
    return {
        vectorService: {
            repairPreferred,
            ...(exactBackend
                ? {
                    exactBackend,
                }
                : {}),
        },
    };
}

test(
    'Qdrant repair enqueue returns before a blocked repair batch settles',
    async () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'hogwarts-qdrant-repair-',
                ),
            );
        let resolveRepair;
        let started = false;
        const coordinator =
            createQdrantRepairCoordinator({
                checkpointRoot: root,
                service: createService(
                    async () => {
                        started = true;
                        await new Promise(resolve => {
                            resolveRepair = resolve;
                        });
                        return {
                            preferred: {
                                complete: true,
                                embedded: 1,
                                reused: 0,
                                deleted: 0,
                            },
                        };
                    },
                ),
            });
        try {
            const queued =
                coordinator.enqueue(INPUT);

            assert.equal(
                queued.status,
                'queued',
            );
            await waitFor(() => started);
            assert.equal(
                readCheckpoint(root).status,
                'running',
            );

            resolveRepair();
            await waitFor(
                () =>
                    readCheckpoint(root)
                        .status ===
                    'completed',
            );
            assert.equal(
                readCheckpoint(root)
                    .embeddedRecordCount,
                1,
            );
        } finally {
            fs.rmSync(
                root,
                {
                    recursive: true,
                    force: true,
                },
            );
        }
    },
);

test(
    'Qdrant repair gives a newer snapshot ownership over an active stale batch',
    async () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'hogwarts-qdrant-repair-',
                ),
            );
        const newerInput = {
            ...INPUT,
            stateRevision: 8,
            projectionFingerprint:
                'cyrb53-newer-snapshot',
        };
        const calls = [];
        let resolveFirstRepair;
        const coordinator =
            createQdrantRepairCoordinator({
                checkpointRoot: root,
                service: createService(
                    async input => {
                        calls.push(input);
                        if (calls.length === 1) {
                            await new Promise(resolve => {
                                resolveFirstRepair = resolve;
                            });
                        }
                        return {
                            preferred: {
                                complete: true,
                                embedded: 1,
                                reused: 0,
                                deleted: 0,
                            },
                        };
                    },
                ),
            });
        try {
            coordinator.enqueue(INPUT);
            await waitFor(
                () => calls.length === 1,
            );
            coordinator.enqueue(newerInput);
            resolveFirstRepair();
            await waitFor(
                () => {
                    const checkpoint =
                        readCheckpoint(root);
                    return (
                        checkpoint.status ===
                            'completed' &&
                        checkpoint.stateRevision ===
                            newerInput.stateRevision
                    );
                },
            );
            assert.equal(
                calls.length,
                2,
            );
            assert.equal(
                readCheckpoint(root)
                    .snapshotFingerprint,
                newerInput
                    .projectionFingerprint,
            );
        } finally {
            fs.rmSync(
                root,
                {
                    recursive: true,
                    force: true,
                },
            );
        }
    },
);

test(
    'Qdrant repair records a request failure and a new coordinator resumes it',
    async () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'hogwarts-qdrant-repair-',
                ),
            );
        const timers = [];
        const failure =
            new Error(
                'Qdrant point write failed.',
            );
        failure.qdrantRequest = {
            operation: 'point_upsert',
            method: 'PUT',
            path: '/collections/timeline_a/points?wait=true',
            status: 503,
        };
        const failed =
            createQdrantRepairCoordinator({
                checkpointRoot: root,
                service: createService(
                    async () => {
                        throw failure;
                    },
                ),
                setTimer: (
                    callback,
                    delay,
                ) => {
                    timers.push({
                        callback,
                        delay,
                    });
                    return {
                        unref() {},
                    };
                },
            });
        try {
            failed.enqueue(INPUT);
            await waitFor(
                () =>
                    readCheckpoint(root)
                        .status ===
                    'retry_scheduled',
            );
            const checkpoint =
                readCheckpoint(root);
            assert.deepEqual(
                checkpoint.lastFailure,
                {
                    operation: 'point_upsert',
                    method: 'PUT',
                    path: '/collections/timeline_a/points?wait=true',
                    status: 503,
                    message:
                        'Qdrant request failed with HTTP 503.',
                },
            );
            assert.equal(
                timers.length,
                1,
            );
            assert.equal(
                timers[0].delay,
                5_000,
            );

            const resumed =
                createQdrantRepairCoordinator({
                    checkpointRoot: root,
                    service: createService(
                        async () => ({
                            preferred: {
                                complete: true,
                                embedded: 0,
                                reused: 2,
                                deleted: 1,
                            },
                        }),
                        {
                            exactBackend: {
                                listRepairSnapshots() {
                                    return [INPUT];
                                },
                            },
                        },
                    ),
                });
            assert.equal(
                resumed.resumePersisted().length,
                1,
            );
            await waitFor(
                () =>
                    readCheckpoint(root)
                        .status ===
                    'completed',
            );
            const completed =
                readCheckpoint(root);
            assert.equal(
                completed.lastFailure,
                null,
            );
            assert.equal(
                completed.reusedRecordCount,
                2,
            );
            assert.equal(
                completed.deletedRecordCount,
                1,
            );
        } finally {
            fs.rmSync(
                root,
                {
                    recursive: true,
                    force: true,
                },
            );
        }
    },
);

test(
    'Qdrant repair preserves an unavailable HTTP status as null',
    async () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'hogwarts-qdrant-repair-',
                ),
            );
        const failure =
            new Error(
                'RECORD_TEXT_SHOULD_NOT_PERSIST',
            );
        failure.cause =
            Object.assign(
                new Error(
                    'other side closed',
                ),
                {
                    code: 'UND_ERR_SOCKET',
                },
            );
        failure.qdrantRequest = {
            operation: 'point_upsert',
            method: 'PUT',
            path: '/collections/timeline_a/points',
            status: null,
        };
        const coordinator =
            createQdrantRepairCoordinator({
                checkpointRoot: root,
                service: createService(
                    async () => {
                        throw failure;
                    },
                ),
                setTimer: () => ({
                    unref() {},
                }),
            });
        try {
            coordinator.enqueue(INPUT);
            await waitFor(
                () =>
                    readCheckpoint(root)
                        .status ===
                    'retry_scheduled',
            );
            assert.equal(
                readCheckpoint(root)
                    .lastFailure
                    .status,
                null,
            );
            assert.equal(
                readCheckpoint(root)
                    .lastFailure
                    .message,
                'Qdrant request failed [UND_ERR_SOCKET].',
            );
            assert.equal(
                readCheckpoint(root)
                    .lastFailure
                    .code,
                'UND_ERR_SOCKET',
            );
            assert.doesNotMatch(
                JSON.stringify(
                    readCheckpoint(root),
                ),
                /RECORD_TEXT_SHOULD_NOT_PERSIST|other side closed/u,
            );
        } finally {
            fs.rmSync(
                root,
                {
                    recursive: true,
                    force: true,
                },
            );
        }
    },
);

test(
    'Qdrant repair rejects unrecognized diagnostic metadata',
    async () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'hogwarts-qdrant-repair-',
                ),
            );
        const failure =
            Object.assign(
                new Error(
                    'RECORD_TEXT_SHOULD_NOT_PERSIST',
                ),
                {
                    code:
                        'RECORD_TEXT_SHOULD_NOT_PERSIST',
                },
            );
        failure.qdrantRequest = {
            operation:
                'RECORD_TEXT_SHOULD_NOT_PERSIST',
            method:
                'RECORD_TEXT_SHOULD_NOT_PERSIST',
            path:
                '/RECORD_TEXT_SHOULD_NOT_PERSIST',
            status: null,
        };
        const coordinator =
            createQdrantRepairCoordinator({
                checkpointRoot: root,
                service: createService(
                    async () => {
                        throw failure;
                    },
                ),
                setTimer: () => ({
                    unref() {},
                }),
            });
        try {
            coordinator.enqueue(INPUT);
            await waitFor(
                () =>
                    readCheckpoint(root)
                        .status ===
                    'retry_scheduled',
            );
            const checkpoint =
                readCheckpoint(root);
            assert.deepEqual(
                checkpoint.lastFailure,
                {
                    operation: 'unknown',
                    method: 'UNKNOWN',
                    path: '',
                    status: null,
                    message:
                        'Qdrant request failed.',
                },
            );
            assert.doesNotMatch(
                JSON.stringify(checkpoint),
                /RECORD_TEXT_SHOULD_NOT_PERSIST/u,
            );
        } finally {
            fs.rmSync(
                root,
                {
                    recursive: true,
                    force: true,
                },
            );
        }
    },
);
