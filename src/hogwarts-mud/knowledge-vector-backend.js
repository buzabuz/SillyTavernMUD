import { createHash } from 'node:crypto';

import {
    computeKnowledgeChecksum,
    createKnowledgeRecordV2,
    hydrateKnowledgeRecords,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';

export const VECTOR_BACKEND_METHODS = Object.freeze([
    'health',
    'upsert',
    'delete',
    'query',
    'rebuild',
]);

export class StaleKnowledgeRevisionError extends Error {
    constructor(currentRevision, receivedRevision) {
        super(
            `Stale knowledge revision ${receivedRevision}; current revision is ${currentRevision}.`,
        );
        this.name =
            'StaleKnowledgeRevisionError';
        this.code =
            'STALE_KNOWLEDGE_REVISION';
        this.currentRevision =
            currentRevision;
        this.receivedRevision =
            receivedRevision;
    }
}

export function assertVectorBackend(backend) {
    for (const method of VECTOR_BACKEND_METHODS) {
        if (
            typeof backend?.[method] !==
            'function'
        ) {
            throw new TypeError(
                `VectorBackend must implement ${method}().`,
            );
        }
    }
    return backend;
}

export function normalizeBackendRecords(records) {
    return (records || [])
        .map(record =>
            createKnowledgeRecordV2(
                record,
            ))
        .sort((left, right) =>
            left.recordId.localeCompare(
                right.recordId,
            ));
}

export function deterministicVectorPointId(
    recordId,
) {
    const hex =
        createHash('sha256')
            .update(
                String(recordId || ''),
            )
            .digest('hex')
            .slice(0, 32)
            .split('');
    hex[12] = '4';
    hex[16] = (
        (Number.parseInt(hex[16], 16) &
            0x3) |
        0x8
    ).toString(16);
    return [
        hex.slice(0, 8).join(''),
        hex.slice(8, 12).join(''),
        hex.slice(12, 16).join(''),
        hex.slice(16, 20).join(''),
        hex.slice(20).join(''),
    ].join('-');
}

function exactScore(record, query, entityIds) {
    let score = 0;
    const requestedEntities =
        new Set(entityIds || []);
    if (
        requestedEntities
            .has(record.recordId) ||
        requestedEntities
            .has(record.id)
    ) {
        score += 120;
    }
    score +=
        (record.entityIds || [])
            .filter(entityId =>
                requestedEntities
                    .has(entityId))
            .length * 80;
    const tokens =
        String(query || '')
            .toLocaleLowerCase()
            .split(
                /[^\p{L}\p{N}_-]+/u,
            )
            .filter(token =>
                token.length > 1);
    const haystack =
        `${
            record.recordId
        } ${
            record.title
        } ${
            record.text
        }`.toLocaleLowerCase();
    for (const token of tokens) {
        if (haystack.includes(token)) {
            score += 5;
        }
    }
    return score;
}

export class FakeVectorBackend {
    constructor({
        name = 'fake',
        fail = {},
    } = {}) {
        this.name = name;
        this.fail = { ...fail };
        this.timelines = new Map();
        this.calls = [];
    }

    setFailure(method, value = true) {
        this.fail[method] = value;
    }

    loseIndex(timelineId) {
        this.timelines.delete(
            timelineId,
        );
    }

    maybeFail(method) {
        this.calls.push(method);
        if (this.fail[method]) {
            throw new Error(
                `${this.name} ${method} unavailable`,
            );
        }
    }

    async health({ timelineId }) {
        this.maybeFail('health');
        const timeline =
            this.timelines.get(
                timelineId,
            );
        return {
            ok: Boolean(timeline),
            backend: this.name,
            indexMissing: !timeline,
            stateRevision:
                timeline?.stateRevision ??
                null,
        };
    }

    assertRevision(
        timeline,
        stateRevision,
    ) {
        if (
            timeline &&
            stateRevision <
                timeline.stateRevision
        ) {
            throw new StaleKnowledgeRevisionError(
                timeline.stateRevision,
                stateRevision,
            );
        }
    }

    async upsert({
        timelineId,
        timelineEpoch,
        stateRevision,
        records,
    }) {
        this.maybeFail('upsert');
        const current =
            this.timelines.get(
                timelineId,
            );
        this.assertRevision(
            current,
            stateRevision,
        );
        const timeline =
            current || {
                records: new Map(),
                stateRevision,
                timelineEpoch,
            };
        for (
            const record
            of normalizeBackendRecords(
                records,
            )
        ) {
            timeline.records.set(
                record.recordId,
                record,
            );
        }
        timeline.stateRevision =
            stateRevision;
        timeline.timelineEpoch =
            timelineEpoch;
        this.timelines.set(
            timelineId,
            timeline,
        );
        return {
            backend: this.name,
            upserted: records.length,
        };
    }

    async delete({
        timelineId,
        stateRevision,
        recordIds = [],
    }) {
        this.maybeFail('delete');
        const timeline =
            this.timelines.get(
                timelineId,
            );
        this.assertRevision(
            timeline,
            stateRevision,
        );
        let deleted = 0;
        for (const recordId of recordIds) {
            if (
                timeline?.records
                    .delete(recordId)
            ) {
                deleted++;
            }
        }
        if (timeline) {
            timeline.stateRevision =
                stateRevision;
        }
        return {
            backend: this.name,
            deleted,
        };
    }

    async query({
        timelineId,
        query = '',
        entityIds = [],
        limit = 8,
        filters = {},
    }) {
        this.maybeFail('query');
        const timeline =
            this.timelines.get(
                timelineId,
            );
        if (!timeline) {
            return {
                backend: this.name,
                records: [],
                diagnostics: {
                    indexMissing: true,
                },
            };
        }
        const hydrated =
            hydrateKnowledgeRecords(
                [
                    ...timeline.records
                        .values(),
                ],
                filters,
            );
        const records =
            hydrated.records
                .map(record => ({
                    record,
                    score:
                        exactScore(
                            record,
                            query,
                            entityIds,
                        ),
                }))
                .filter(item =>
                    item.score > 0 ||
                    (!query &&
                        !entityIds.length))
                .sort((left, right) =>
                    right.score -
                        left.score ||
                    left.record.recordId
                        .localeCompare(
                            right.record
                                .recordId,
                        ))
                .slice(0, limit)
                .map(item =>
                    item.record);
        return {
            backend: this.name,
            records,
            diagnostics:
                hydrated.diagnostics,
        };
    }

    async rebuild({
        timelineId,
        timelineEpoch,
        stateRevision,
        records,
    }) {
        this.maybeFail('rebuild');
        this.timelines.delete(
            timelineId,
        );
        const previous =
            this.fail.upsert;
        this.fail.upsert = false;
        try {
            const result =
                await this.upsert({
                    timelineId,
                    timelineEpoch,
                    stateRevision,
                    records,
                });
            return {
                ...result,
                rebuilt: true,
            };
        } finally {
            this.fail.upsert =
                previous;
        }
    }
}

function vectraHash(record) {
    return computeKnowledgeChecksum({
        recordId: record.recordId,
        contentChecksum:
            record.contentChecksum,
    });
}

export function createVectraCompatibleBackend({
    transport,
    name = 'vectra',
}) {
    if (!transport) {
        throw new TypeError(
            'Vectra transport is required.',
        );
    }
    const revisions = new Map();
    const backend = {
        async health({ timelineId }) {
            const result =
                await transport.health?.({
                    timelineId,
                });
            return {
                ok:
                    result?.ok !== false,
                backend: name,
                indexMissing:
                    Boolean(
                        result
                            ?.indexMissing,
                    ),
                stateRevision:
                    revisions.get(
                        timelineId,
                    ) ??
                    null,
            };
        },
        async upsert(input) {
            const current =
                revisions.get(
                    input.timelineId,
                );
            if (
                current !== undefined &&
                input.stateRevision <
                    current
            ) {
                throw new StaleKnowledgeRevisionError(
                    current,
                    input.stateRevision,
                );
            }
            const records =
                normalizeBackendRecords(
                    input.records,
                );
            await transport.upsert({
                timelineId:
                    input.timelineId,
                items:
                    records.map(record => ({
                        id:
                            record.recordId,
                        hash:
                            vectraHash(
                                record,
                            ),
                        text:
                            record.text,
                        metadata:
                            record,
                    })),
            });
            revisions.set(
                input.timelineId,
                input.stateRevision,
            );
            return {
                backend: name,
                upserted:
                    records.length,
            };
        },
        async delete(input) {
            await transport.delete({
                timelineId:
                    input.timelineId,
                ids: input.recordIds,
            });
            revisions.set(
                input.timelineId,
                input.stateRevision,
            );
            return {
                backend: name,
                deleted:
                    input.recordIds
                        .length,
            };
        },
        async query(input) {
            const result =
                await transport.query({
                    timelineId:
                        input.timelineId,
                    query: input.query,
                    limit: input.limit,
                });
            const candidates =
                (result?.items || result || [])
                    .map(item =>
                        item.metadata ||
                        item.record ||
                        item)
                    .filter(Boolean);
            const hydrated =
                hydrateKnowledgeRecords(
                    candidates,
                    input.filters,
                );
            return {
                backend: name,
                records:
                    hydrated.records
                        .slice(
                            0,
                            input.limit,
                        ),
                diagnostics:
                    hydrated.diagnostics,
            };
        },
        async rebuild(input) {
            await transport.rebuild?.({
                timelineId:
                    input.timelineId,
            });
            revisions.delete(
                input.timelineId,
            );
            const result =
                await backend.upsert(
                    input,
                );
            return {
                ...result,
                rebuilt: true,
            };
        },
    };
    return assertVectorBackend(backend);
}
