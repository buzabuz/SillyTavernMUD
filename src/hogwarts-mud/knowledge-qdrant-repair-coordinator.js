import fs from 'node:fs';
import path from 'node:path';

const REPAIR_CHECKPOINT_VERSION = 1;
const DEFAULT_BATCH_SIZE = 8;
const RETRY_DELAYS_MS = Object.freeze([
    5_000,
    15_000,
    60_000,
]);
const SAFE_OPERATIONS = new Set([
    'collection_health',
    'collection_create',
    'collection_rebuild_reset',
    'manifest_read',
    'point_upsert',
    'point_delete',
    'record_embedding',
    'query_embedding',
]);
const SAFE_METHODS = new Set([
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'LOCAL',
]);
const SAFE_TRANSPORT_CODES = new Set([
    'ABORT_ERR',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
]);

function boundedInteger(
    value,
    fallback = 0,
) {
    return Math.max(
        0,
        Number.isSafeInteger(
            Number(value),
        )
            ? Number(value)
            : fallback,
    );
}

function safeTransportCode(
    error,
) {
    const code =
        String(
            error?.cause?.code ||
            error?.code ||
            '',
        )
            .trim()
            .toUpperCase();
    return SAFE_TRANSPORT_CODES.has(
        code,
    )
        ? code
        : '';
}

function safeOperation(
    value,
) {
    const operation =
        String(value || '');
    return SAFE_OPERATIONS.has(
        operation,
    )
        ? operation
        : 'unknown';
}

function safeMethod(
    value,
) {
    const method =
        String(value || '')
            .toUpperCase();
    return SAFE_METHODS.has(method)
        ? method
        : 'UNKNOWN';
}

function safePath(
    operation,
    value,
) {
    const pathname =
        String(value || '');
    const collection =
        '[A-Za-z0-9_-]{1,240}';
    const patterns = {
        collection_health:
            new RegExp(
                `^/collections/${collection}$`,
                'u',
            ),
        collection_create:
            new RegExp(
                `^/collections/${collection}$`,
                'u',
            ),
        collection_rebuild_reset:
            new RegExp(
                `^/collections/${collection}(?:\\?wait=true)?$`,
                'u',
            ),
        manifest_read:
            new RegExp(
                `^/collections/${collection}/points/scroll$`,
                'u',
            ),
        point_upsert:
            new RegExp(
                `^/collections/${collection}/points\\?wait=true$`,
                'u',
            ),
        point_delete:
            new RegExp(
                `^/collections/${collection}/points/delete\\?wait=true$`,
                'u',
            ),
    };
    if (
        operation === 'record_embedding' ||
        operation === 'query_embedding'
    ) {
        return 'embedding';
    }
    return patterns[operation]?.test(
        pathname,
    )
        ? pathname
        : '';
}

function compactError(
    error,
) {
    const request =
        error?.qdrantRequest ||
        error ||
        {};
    const operation =
        safeOperation(
            request.operation,
        );
    const method =
        safeMethod(
            request.method,
        );
    const causeCode =
        safeTransportCode(error);
    const status =
        request.status !== null &&
        request.status !== undefined &&
        Number.isSafeInteger(
            Number(request.status),
        )
            ? Number(request.status)
            : null;
    return {
        operation:
            operation,
        method:
            method,
        path:
            safePath(
                operation,
                request.path,
            ),
        status:
            status,
        ...(causeCode
            ? {
                code: causeCode,
            }
            : {}),
        message:
            status !== null
                ? `Qdrant request failed with HTTP ${status}.`
                : `${
                    request.method === 'LOCAL'
                        ? 'Local embedding failed'
                        : 'Qdrant request failed'
                }${
                    causeCode
                        ? ` [${causeCode}]`
                        : ''
                }.`,
    };
}

function publicCheckpoint(
    checkpoint = {},
) {
    return {
        status:
            String(
                checkpoint.status ||
                'idle',
            ),
        stateRevision:
            boundedInteger(
                checkpoint.stateRevision,
            ),
        snapshotFingerprint:
            String(
                checkpoint.snapshotFingerprint ||
                '',
            ).slice(0, 96),
        pendingRecordCount:
            boundedInteger(
                checkpoint.pendingRecordCount,
            ),
        embeddedRecordCount:
            boundedInteger(
                checkpoint.embeddedRecordCount,
            ),
        reusedRecordCount:
            boundedInteger(
                checkpoint.reusedRecordCount,
            ),
        deletedRecordCount:
            boundedInteger(
                checkpoint.deletedRecordCount,
            ),
        attempt:
            boundedInteger(
                checkpoint.attempt,
            ),
        retryAt:
            Number.isFinite(
                checkpoint.retryAt,
            )
                ? checkpoint.retryAt
                : null,
        lastFailure:
            checkpoint.lastFailure
                ? compactError(
                    checkpoint.lastFailure,
                )
                : null,
    };
}

function writeJsonAtomic(
    targetPath,
    value,
) {
    fs.mkdirSync(
        path.dirname(targetPath),
        {
            recursive: true,
        },
    );
    const temporaryPath =
        `${targetPath}.tmp-${
            process.pid
        }-${
            Date.now()
        }`;
    fs.writeFileSync(
        temporaryPath,
        JSON.stringify(
            value,
            null,
            2,
        ),
        'utf8',
    );
    fs.renameSync(
        temporaryPath,
        targetPath,
    );
}

function readJson(
    targetPath,
) {
    try {
        return JSON.parse(
            fs.readFileSync(
                targetPath,
                'utf8',
            ),
        );
    } catch {
        return null;
    }
}

export class QdrantRepairCoordinator {
    constructor({
        service,
        checkpointRoot = null,
        batchSize = DEFAULT_BATCH_SIZE,
        now = () => Date.now(),
        setTimer = setTimeout,
    }) {
        if (
            !service?.vectorService
                ?.repairPreferred
        ) {
            throw new TypeError(
                'Qdrant repair coordinator requires a Knowledge vector service.',
            );
        }
        this.service = service;
        this.checkpointRoot =
            checkpointRoot
                ? path.resolve(checkpointRoot)
                : null;
        this.batchSize =
            Math.max(
                1,
                Number(batchSize) ||
                DEFAULT_BATCH_SIZE,
            );
        this.now = now;
        this.setTimer = setTimer;
        this.entries = new Map();
    }

    keyFor(input) {
        return [
            String(
                input.timelineEpoch ||
                '',
            ),
            String(
                input.timelineId ||
                '',
            ),
        ].join(':');
    }

    checkpointPath(input) {
        if (this.checkpointRoot) {
            return path.join(
                this.checkpointRoot,
                encodeURIComponent(
                    String(input.timelineId),
                ),
                'qdrant-repair.json',
            );
        }
        const exactBackend =
            this.service.vectorService
                .exactBackend;
        if (
            typeof exactBackend
                ?.timelineRoot !==
            'function'
        ) {
            return null;
        }
        return path.join(
            exactBackend.timelineRoot(
                input.timelineId,
            ),
            'qdrant-repair.json',
        );
    }

    readCheckpoint(input) {
        const targetPath =
            this.checkpointPath(input);
        return targetPath
            ? readJson(targetPath)
            : null;
    }

    getCheckpoint(input) {
        return publicCheckpoint(
            this.readCheckpoint(input) ||
            {},
        );
    }

    writeCheckpoint(
        input,
        checkpoint,
    ) {
        const targetPath =
            this.checkpointPath(input);
        if (!targetPath) return;
        writeJsonAtomic(
            targetPath,
            {
                version:
                    REPAIR_CHECKPOINT_VERSION,
                timelineEpoch:
                    String(
                        input.timelineEpoch ||
                        '',
                    ),
                timelineId:
                    String(
                        input.timelineId ||
                        '',
                    ),
                ...publicCheckpoint(
                    checkpoint,
                ),
                updatedAt:
                    this.now(),
            },
        );
    }

    createCheckpoint(
        input,
        status,
        current = {},
    ) {
        return {
            ...current,
            status,
            stateRevision:
                boundedInteger(
                    input.stateRevision,
                ),
            snapshotFingerprint:
                String(
                    input.projectionFingerprint ||
                    '',
                ).slice(0, 96),
            retryAt: null,
        };
    }

    enqueue(input) {
        const key =
            this.keyFor(input);
        let entry =
            this.entries.get(key);
        if (!entry) {
            entry = {
                active: false,
                latest: null,
                pending: null,
                retryTimer: null,
            };
            this.entries.set(
                key,
                entry,
            );
        }
        entry.latest = input;
        entry.pending = input;
        if (entry.retryTimer) {
            clearTimeout(
                entry.retryTimer,
            );
            entry.retryTimer = null;
        }
        const persisted =
            this.readCheckpoint(input) ||
            {};
        const queued =
            this.createCheckpoint(
                input,
                entry.active
                    ? 'queued'
                    : 'queued',
                persisted,
            );
        this.writeCheckpoint(
            input,
            queued,
        );
        if (!entry.active) {
            void this.drain(
                key,
                entry,
            );
        }
        return publicCheckpoint(
            queued,
        );
    }

    resumePersisted() {
        const exactBackend =
            this.service.vectorService
                .exactBackend;
        if (
            typeof exactBackend
                ?.listRepairSnapshots !==
            'function'
        ) {
            return [];
        }
        const resumed = [];
        for (
            const input
            of exactBackend.listRepairSnapshots()
        ) {
            const checkpoint =
                this.readCheckpoint(input);
            if (
                !checkpoint ||
                checkpoint.status ===
                    'completed'
            ) {
                continue;
            }
            resumed.push(
                this.enqueue(input),
            );
        }
        return resumed;
    }

    isLatest(
        entry,
        input,
    ) {
        return entry.latest === input;
    }

    writeLatestCheckpoint(
        entry,
        input,
        checkpoint,
    ) {
        if (
            this.isLatest(
                entry,
                input,
            )
        ) {
            this.writeCheckpoint(
                input,
                checkpoint,
            );
        }
    }

    scheduleRetry(
        key,
        entry,
        input,
        checkpoint,
    ) {
        const attempt =
            boundedInteger(
                checkpoint.attempt,
            );
        const delay =
            RETRY_DELAYS_MS[
                Math.min(
                    Math.max(
                        0,
                        attempt - 1,
                    ),
                    RETRY_DELAYS_MS.length -
                        1,
                )
            ];
        const retryAt =
            this.now() + delay;
        this.writeLatestCheckpoint(
            entry,
            input,
            {
                ...checkpoint,
                status: 'retry_scheduled',
                retryAt,
            },
        );
        entry.retryTimer =
            this.setTimer(
                () => {
                    entry.retryTimer = null;
                    if (
                        !entry.active &&
                        this.isLatest(
                            entry,
                            input,
                        )
                    ) {
                        entry.pending = input;
                        void this.drain(
                            key,
                            entry,
                        );
                    }
                },
                delay,
            );
        entry.retryTimer.unref?.();
    }

    async repairInput(
        entry,
        input,
    ) {
        let checkpoint =
            this.createCheckpoint(
                input,
                'running',
                this.readCheckpoint(input) ||
                {},
            );
        this.writeLatestCheckpoint(
            entry,
            input,
            checkpoint,
        );
        for (;;) {
            if (
                !this.isLatest(
                    entry,
                    input,
                )
            ) {
                return;
            }
            try {
                const repair =
                    await this.service
                        .vectorService
                        .repairPreferred(
                            input,
                            {
                                batchSize:
                                    this.batchSize,
                            },
                        );
                const result =
                    repair.preferred ||
                    {};
                checkpoint = {
                    ...checkpoint,
                    status:
                        result.complete === false
                            ? 'running'
                            : 'completed',
                    pendingRecordCount:
                        boundedInteger(
                            result.pendingRecordCount,
                        ),
                    embeddedRecordCount:
                        boundedInteger(
                            checkpoint.embeddedRecordCount,
                        ) +
                        boundedInteger(
                            result.embedded ??
                            result.upserted,
                        ),
                    reusedRecordCount:
                        boundedInteger(
                            result.reused,
                        ),
                    deletedRecordCount:
                        boundedInteger(
                            result.deleted,
                        ),
                    lastFailure: null,
                    retryAt: null,
                };
                this.writeLatestCheckpoint(
                    entry,
                    input,
                    checkpoint,
                );
                if (result.complete !== false) {
                    return;
                }
            } catch (error) {
                checkpoint = {
                    ...checkpoint,
                    status: 'failed',
                    attempt:
                        boundedInteger(
                            checkpoint.attempt,
                        ) + 1,
                    lastFailure:
                        compactError(error),
                };
                this.writeLatestCheckpoint(
                    entry,
                    input,
                    checkpoint,
                );
                if (
                    this.isLatest(
                        entry,
                        input,
                    )
                ) {
                    this.scheduleRetry(
                        this.keyFor(input),
                        entry,
                        input,
                        checkpoint,
                    );
                }
                return;
            }
        }
    }

    async drain(
        key,
        entry,
    ) {
        if (entry.active) return;
        entry.active = true;
        try {
            while (entry.pending) {
                const input =
                    entry.pending;
                entry.pending = null;
                await this.repairInput(
                    entry,
                    input,
                );
                if (entry.retryTimer) {
                    break;
                }
            }
        } finally {
            entry.active = false;
            if (
                entry.pending &&
                !entry.retryTimer
            ) {
                void this.drain(
                    key,
                    entry,
                );
            }
        }
    }
}

export function createQdrantRepairCoordinator(
    options,
) {
    return new QdrantRepairCoordinator(
        options,
    );
}
