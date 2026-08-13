import {
    computeKnowledgeChecksum,
    hydrateKnowledgeRecords,
    knowledgeClockOrdinal,
    normalizeKnowledgeId,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    StaleKnowledgeRevisionError,
    assertVectorBackend,
    deterministicVectorPointId,
    normalizeBackendRecords,
} from './knowledge-vector-backend.js';

const QDRANT_RETRY_DELAYS_MS =
    Object.freeze([
        100,
        250,
        500,
    ]);
const REPLAY_SAFE_HTTP_METHODS =
    new Set([
        'DELETE',
        'GET',
        'HEAD',
        'OPTIONS',
        'PUT',
    ]);

function trimUrl(value) {
    return String(value || '')
        .trim()
        .replace(/\/+$/g, '');
}

function isRetryableHttpStatus(
    status,
) {
    return (
        status === 408 ||
        status === 429 ||
        (
            status >= 500 &&
            status <= 599
        )
    );
}

function waitForRetry(delayMs) {
    return new Promise(resolve =>
        setTimeout(
            resolve,
            delayMs,
        ));
}

function qdrantMatch(
    key,
    value,
) {
    return {
        key,
        match: {
            value,
        },
    };
}

function qdrantMatchAny(
    key,
    values,
) {
    return {
        key,
        match: {
            any: values,
        },
    };
}

export function getQdrantCollectionGeneration({
    embeddingModel,
    dimensions,
}) {
    return computeKnowledgeChecksum({
        projectorVersion: 2,
        embeddingModel:
            String(embeddingModel || ''),
        dimensions:
            Number(dimensions),
    })
        .replace(/^cyrb53-/u, 'g')
        .slice(0, 16);
}

export function buildQdrantAudienceFilter(
    audience = {},
) {
    const actorIds =
        [
            ...new Set(
                (audience.actorIds || [])
                    .map(actorId =>
                        normalizeKnowledgeId(
                            actorId,
                        )),
            ),
        ];
    const should = [
        qdrantMatch(
            'visibility.scope',
            'public',
        ),
    ];
    if (actorIds.length) {
        should.push({
            must: [
                qdrantMatchAny(
                    'visibility.scope',
                    [
                        'actor',
                        'witnesses',
                    ],
                ),
                qdrantMatchAny(
                    'visibility.actorIds',
                    actorIds,
                ),
            ],
        });
    }
    if (audience.includeLocked) {
        if (audience.role === 'author') {
            should.push(
                qdrantMatch(
                    'visibility.scope',
                    'locked',
                ),
            );
        } else if (actorIds.length) {
            should.push({
                must: [
                    qdrantMatch(
                        'visibility.scope',
                        'locked',
                    ),
                    qdrantMatchAny(
                        'visibility.actorIds',
                        actorIds,
                    ),
                ],
            });
        }
    }
    return should;
}

export function buildQdrantPayloadFilter({
    timelineEpoch = '',
    stateRevision,
    audience = {},
    clock = '',
    nodeTypes = [],
    categories = [],
} = {}) {
    const must = [];
    if (timelineEpoch) {
        must.push(
            qdrantMatch(
                'timelineEpoch',
                timelineEpoch,
            ),
        );
    }
    if (stateRevision !== undefined) {
        must.push(
            qdrantMatch(
                'stateRevision',
                Number(stateRevision),
            ),
        );
    }
    if (nodeTypes.length) {
        must.push(
            qdrantMatchAny(
                'nodeType',
                nodeTypes,
            ),
        );
    }
    if (categories.length) {
        must.push(
            qdrantMatchAny(
                'category',
                categories,
            ),
        );
    }
    const clockOrdinal =
        knowledgeClockOrdinal(clock);
    if (clockOrdinal !== null) {
        must.push({
            key:
                'effectiveClockOrdinal',
            range: {
                lte: clockOrdinal,
            },
        });
    }
    return {
        must,
        should:
            buildQdrantAudienceFilter(
                audience,
            ),
    };
}

export class QdrantKnowledgeBackend {
    constructor({
        url,
        apiKey = '',
        collectionPrefix =
        'hogwarts_knowledge',
        embeddingModel =
        'transformers',
        dimensions,
        embedder,
        fetchImpl = globalThis.fetch,
        timeoutMs = 10_000,
        enabled = true,
    }) {
        this.name = 'qdrant';
        this.url = trimUrl(url);
        this.apiKey =
            String(apiKey || '');
        this.collectionPrefix =
            normalizeKnowledgeId(
                collectionPrefix,
            );
        this.embeddingModel =
            String(embeddingModel || '');
        this.dimensions =
            Number(dimensions);
        this.embedder = embedder;
        this.fetchImpl = fetchImpl;
        this.timeoutMs =
            Math.max(
                250,
                Number(timeoutMs) ||
                10_000,
            );
        this.enabled =
            Boolean(
                enabled &&
                this.url,
            );
        this.revisions = new Map();
        this.generation =
            getQdrantCollectionGeneration({
                embeddingModel:
                    this.embeddingModel,
                dimensions:
                    this.dimensions,
            });
        if (
            this.enabled &&
            (
                !Number.isSafeInteger(
                    this.dimensions,
                ) ||
                this.dimensions <= 0 ||
                typeof this.embedder !==
                    'function'
            )
        ) {
            throw new TypeError(
                'Configured Qdrant requires dimensions and an embedder.',
            );
        }
    }

    collectionName(timelineId) {
        return [
            this.collectionPrefix,
            normalizeKnowledgeId(
                timelineId,
            ),
            this.generation,
        ].join('_').slice(0, 240);
    }

    async request(
        pathname,
        {
            method = 'GET',
            body,
            allowNotFound = false,
            retryable,
        } = {},
    ) {
        if (!this.enabled) {
            throw new Error(
                'Qdrant is not configured.',
            );
        }
        const requestMethod =
            String(method || 'GET')
                .toUpperCase();
        const canRetry =
            retryable === undefined
                ? REPLAY_SAFE_HTTP_METHODS
                    .has(requestMethod)
                : Boolean(retryable);
        const requestBody =
            body === undefined
                ? undefined
                : JSON.stringify(body);
        for (
            let attempt = 0;
            ;
            attempt += 1
        ) {
            let response;
            try {
                response =
                    await this.fetchImpl(
                        `${this.url}${pathname}`,
                        {
                            method:
                                requestMethod,
                            headers: {
                                'Content-Type':
                                    'application/json',
                                ...(this.apiKey
                                    ? {
                                        'api-key':
                                            this.apiKey,
                                    }
                                    : {}),
                            },
                            ...(requestBody ===
                            undefined
                                ? {}
                                : {
                                    body:
                                        requestBody,
                                }),
                            signal:
                                AbortSignal
                                    .timeout(
                                        this
                                            .timeoutMs,
                                    ),
                        },
                    );
            } catch (error) {
                if (
                    !canRetry ||
                    attempt >=
                        QDRANT_RETRY_DELAYS_MS
                            .length
                ) {
                    throw error;
                }
                await waitForRetry(
                    QDRANT_RETRY_DELAYS_MS[
                        attempt
                    ],
                );
                continue;
            }
            if (
                allowNotFound &&
                response.status === 404
            ) {
                return null;
            }
            if (!response.ok) {
                if (
                    canRetry &&
                    isRetryableHttpStatus(
                        response.status,
                    ) &&
                    attempt <
                        QDRANT_RETRY_DELAYS_MS
                            .length
                ) {
                    await waitForRetry(
                        QDRANT_RETRY_DELAYS_MS[
                            attempt
                        ],
                    );
                    continue;
                }
                const detail =
                    await response.text()
                        .catch(() => '');
                throw new Error(
                    `Qdrant ${requestMethod} ${pathname} failed with ${response.status}: ${detail.slice(0, 500)}`,
                );
            }
            if (response.status === 204) {
                return null;
            }
            return response.json();
        }
    }

    async health({ timelineId }) {
        if (!this.enabled) {
            return {
                ok: false,
                configured: false,
                backend: this.name,
                indexMissing: false,
                collectionGeneration:
                    this.generation,
            };
        }
        try {
            const result =
                await this.request(
                    `/collections/${
                        encodeURIComponent(
                            this.collectionName(
                                timelineId,
                            ),
                        )
                    }`,
                    {
                        allowNotFound: true,
                    },
                );
            return {
                ok: Boolean(result),
                configured: true,
                backend: this.name,
                indexMissing: !result,
                collection:
                    this.collectionName(
                        timelineId,
                    ),
                collectionGeneration:
                    this.generation,
                stateRevision:
                    this.revisions.get(
                        timelineId,
                    ) ??
                    null,
            };
        } catch (error) {
            return {
                ok: false,
                configured: true,
                backend: this.name,
                indexMissing: false,
                collectionGeneration:
                    this.generation,
                error:
                    String(
                        error?.message ||
                        error,
                    ),
            };
        }
    }

    async ensureCollection(timelineId) {
        const health =
            await this.health({
                timelineId,
            });
        if (health.ok) return health;
        if (
            !health.indexMissing &&
            health.configured
        ) {
            throw new Error(
                health.error ||
                'Qdrant health failed.',
            );
        }
        const collection =
            this.collectionName(
                timelineId,
            );
        await this.request(
            `/collections/${
                encodeURIComponent(
                    collection,
                )
            }`,
            {
                method: 'PUT',
                body: {
                    vectors: {
                        size:
                            this.dimensions,
                        distance:
                            'Cosine',
                    },
                    on_disk_payload:
                        true,
                },
            },
        );
        return {
            ok: true,
            configured: true,
            backend: this.name,
            indexMissing: false,
            collection,
            collectionGeneration:
                this.generation,
        };
    }

    assertRevision(
        timelineId,
        stateRevision,
    ) {
        const current =
            this.revisions.get(
                timelineId,
            );
        if (
            current !== undefined &&
            stateRevision < current
        ) {
            throw new StaleKnowledgeRevisionError(
                current,
                stateRevision,
            );
        }
    }

    async embedTexts(texts, isQuery) {
        const vectors =
            await this.embedder(
                texts,
                {
                    isQuery,
                    model:
                        this.embeddingModel,
                },
            );
        if (
            !Array.isArray(vectors) ||
            vectors.length !==
                texts.length ||
            vectors.some(vector =>
                !Array.isArray(vector) ||
                vector.length !==
                    this.dimensions)
        ) {
            throw new Error(
                `Embedding output does not match configured dimension ${this.dimensions}.`,
            );
        }
        return vectors;
    }

    pointPayload(record) {
        return {
            recordId:
                record.recordId,
            nodeType:
                record.nodeType,
            category:
                record.category,
            timelineEpoch:
                record.timelineEpoch,
            stateRevision:
                record.stateRevision,
            visibility:
                record.visibility,
            effectiveClock:
                record.effectiveClock,
            effectiveClockOrdinal:
                knowledgeClockOrdinal(
                    record.effectiveClock,
                ) ?? 0,
            sceneId:
                record.sceneId,
            entityIds:
                record.entityIds,
            tags: record.tags,
            contentChecksum:
                record.contentChecksum,
            record,
        };
    }

    async upsert(input) {
        this.assertRevision(
            input.timelineId,
            input.stateRevision,
        );
        const records =
            normalizeBackendRecords(
                input.records,
            );
        const vectors =
            records.length
                ? await this.embedTexts(
                    records.map(record =>
                        record.text),
                    false,
                )
                : [];
        await this.ensureCollection(
            input.timelineId,
        );
        if (!records.length) {
            return {
                backend: this.name,
                upserted: 0,
                collectionGeneration:
                    this.generation,
            };
        }
        const collection =
            this.collectionName(
                input.timelineId,
            );
        await this.request(
            `/collections/${
                encodeURIComponent(
                    collection,
                )
            }/points?wait=true`,
            {
                method: 'PUT',
                body: {
                    points:
                        records.map(
                            (
                                record,
                                index,
                            ) => ({
                                id:
                                    deterministicVectorPointId(
                                        record
                                            .recordId,
                                    ),
                                vector:
                                    vectors[
                                        index
                                    ],
                                payload:
                                    this.pointPayload(
                                        record,
                                    ),
                            }),
                        ),
                },
            },
        );
        this.revisions.set(
            input.timelineId,
            input.stateRevision,
        );
        return {
            backend: this.name,
            upserted: records.length,
            collection,
            collectionGeneration:
                this.generation,
        };
    }

    async delete(input) {
        this.assertRevision(
            input.timelineId,
            input.stateRevision,
        );
        const health =
            await this.health(input);
        if (!health.ok) {
            return {
                backend: this.name,
                deleted: 0,
                indexMissing:
                    health.indexMissing,
            };
        }
        const ids =
            (input.recordIds || [])
                .map(recordId =>
                    deterministicVectorPointId(
                        recordId,
                    ));
        if (ids.length) {
            await this.request(
                `/collections/${
                    encodeURIComponent(
                        this.collectionName(
                            input.timelineId,
                        ),
                    )
                }/points/delete?wait=true`,
                {
                    method: 'POST',
                    retryable: true,
                    body: {
                        points: ids,
                    },
                },
            );
        }
        this.revisions.set(
            input.timelineId,
            input.stateRevision,
        );
        return {
            backend: this.name,
            deleted: ids.length,
        };
    }

    async query(input) {
        const health =
            await this.health(input);
        if (!health.ok) {
            throw new Error(
                health.indexMissing
                    ? 'Qdrant collection is missing.'
                    : health.error ||
                        'Qdrant is unavailable.',
            );
        }
        const [vector] =
            await this.embedTexts(
                [
                    String(
                        input.query ||
                        '',
                    ),
                ],
                true,
            );
        const result =
            await this.request(
                `/collections/${
                    encodeURIComponent(
                        this.collectionName(
                            input.timelineId,
                        ),
                    )
                }/points/query`,
                {
                    method: 'POST',
                    retryable: true,
                    body: {
                        query: vector,
                        filter:
                            buildQdrantPayloadFilter(
                                input.filters,
                            ),
                        limit:
                            Math.max(
                                1,
                                Number(
                                    input.limit,
                                ) ||
                                8,
                            ),
                        with_payload:
                            true,
                    },
                },
            );
        const points =
            result?.result?.points ||
            result?.result ||
            [];
        const candidates =
            points
                .map(point =>
                    point?.payload
                        ?.record)
                .filter(Boolean);
        const hydrated =
            hydrateKnowledgeRecords(
                candidates,
                input.filters,
            );
        return {
            backend: this.name,
            records:
                hydrated.records
                    .slice(
                        0,
                        input.limit,
                    ),
            diagnostics: {
                ...hydrated.diagnostics,
                collectionGeneration:
                    this.generation,
            },
        };
    }

    async rebuild(input) {
        this.assertRevision(
            input.timelineId,
            input.stateRevision,
        );
        const collection =
            this.collectionName(
                input.timelineId,
            );
        await this.request(
            `/collections/${
                encodeURIComponent(
                    collection,
                )
            }`,
            {
                method: 'DELETE',
                allowNotFound: true,
            },
        );
        this.revisions.delete(
            input.timelineId,
        );
        const result =
            await this.upsert(input);
        return {
            ...result,
            rebuilt: true,
        };
    }
}

export function createQdrantKnowledgeBackend(
    options,
) {
    return assertVectorBackend(
        new QdrantKnowledgeBackend(
            options,
        ),
    );
}
