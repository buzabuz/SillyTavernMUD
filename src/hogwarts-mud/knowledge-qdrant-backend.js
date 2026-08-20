import {
    KNOWLEDGE_API_CONTRACT_VERSION,
    KNOWLEDGE_PROJECTOR_VERSION,
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

function getCollectionVectorSize(result) {
    const vectors =
        result?.result?.config
            ?.params?.vectors;
    if (
        Number.isSafeInteger(
            Number(vectors?.size),
        )
    ) {
        return Number(
            vectors.size,
        );
    }
    return null;
}

function isCompatibleCollection(
    result,
    dimensions,
) {
    return getCollectionVectorSize(
        result,
    ) === dimensions;
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
        knowledgeApiContractVersion:
            KNOWLEDGE_API_CONTRACT_VERSION,
        projectorVersion:
            KNOWLEDGE_PROJECTOR_VERSION,
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
        must.push({
            key: 'stateRevision',
            range: {
                lte:
                    Number(
                        stateRevision,
                    ),
            },
        });
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
            const compatible =
                Boolean(result) &&
                isCompatibleCollection(
                    result,
                    this.dimensions,
                );
            return {
                ok: compatible,
                configured: true,
                backend: this.name,
                indexMissing: !result,
                indexIncompatible:
                    Boolean(result) &&
                    !compatible,
                collection:
                    this.collectionName(
                        timelineId,
                    ),
                collectionGeneration:
                    this.generation,
                ...(result && !compatible
                    ? {
                        error:
                            `Qdrant collection dimension ${
                                getCollectionVectorSize(
                                    result,
                                ) ??
                                'unknown'
                            } does not match configured dimension ${
                                this.dimensions
                            }.`,
                    }
                    : {}),
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
                indexIncompatible: false,
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
                retryable: false,
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
            indexIncompatible: false,
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
            knowledgeApiContractVersion:
                KNOWLEDGE_API_CONTRACT_VERSION,
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

    async putPoints(
        timelineId,
        records,
        vectors,
    ) {
        if (!records.length) return;
        const collection =
            this.collectionName(
                timelineId,
            );
        await this.request(
            `/collections/${
                encodeURIComponent(
                    collection,
                )
            }/points?wait=true`,
            {
                method: 'PUT',
                retryable: false,
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
    }

    async deletePointIds(
        timelineId,
        pointIds,
    ) {
        if (!pointIds.length) return 0;
        await this.request(
            `/collections/${
                encodeURIComponent(
                    this.collectionName(
                        timelineId,
                    ),
                )
            }/points/delete?wait=true`,
            {
                method: 'POST',
                retryable: false,
                body: {
                    points:
                        pointIds,
                },
            },
        );
        return pointIds.length;
    }

    async readManifest(timelineId) {
        const collection =
            this.collectionName(
                timelineId,
            );
        const records = new Map();
        const malformedPointIds = [];
        let offset = null;
        do {
            const page =
                await this.request(
                    `/collections/${
                        encodeURIComponent(
                            collection,
                        )
                    }/points/scroll`,
                    {
                        method: 'POST',
                        retryable: false,
                        body: {
                            limit: 256,
                            with_payload: [
                                'recordId',
                                'contentChecksum',
                            ],
                            with_vector: false,
                            ...(offset === null
                                ? {}
                                : {
                                    offset,
                                }),
                        },
                    },
                );
            const result =
                page?.result ||
                {};
            for (const point of (
                result.points ||
                []
            )) {
                const recordId =
                    String(
                        point?.payload
                            ?.recordId ||
                        '',
                    ).trim();
                const contentChecksum =
                    String(
                        point?.payload
                            ?.contentChecksum ||
                        '',
                    ).trim();
                if (
                    !recordId ||
                    !contentChecksum
                ) {
                    malformedPointIds.push(
                        point?.id,
                    );
                    continue;
                }
                records.set(
                    recordId,
                    {
                        pointId:
                            point?.id,
                        contentChecksum,
                    },
                );
            }
            offset =
                result.next_page_offset ??
                null;
        } while (offset !== null);
        return {
            records,
            malformedPointIds:
                malformedPointIds
                    .filter(pointId =>
                        pointId !== undefined &&
                        pointId !== null),
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
        await this.putPoints(
            input.timelineId,
            records,
            vectors,
        );
        const collection =
            this.collectionName(
                input.timelineId,
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

    async reconcile(
        input,
        health = null,
    ) {
        this.assertRevision(
            input.timelineId,
            input.stateRevision,
        );
        const currentHealth =
            health ||
            await this.health(input);
        if (!currentHealth.ok) {
            if (
                !currentHealth.indexMissing &&
                !currentHealth.indexIncompatible
            ) {
                throw new Error(
                    currentHealth.error ||
                    'Qdrant health failed.',
                );
            }
            const rebuilt =
                await this.rebuild(input);
            return {
                ...rebuilt,
                embedded:
                    normalizeBackendRecords(
                        input.records,
                    ).length,
                reused: 0,
                deleted: 0,
                reconciled: false,
            };
        }
        const records =
            normalizeBackendRecords(
                input.records,
            );
        const manifest =
            await this.readManifest(
                input.timelineId,
            );
        const currentIds =
            new Set(
                records.map(record =>
                    record.recordId),
            );
        const upsertRecords =
            records.filter(record =>
                manifest.records
                    .get(record.recordId)
                    ?.contentChecksum !==
                record.contentChecksum);
        const deletedPointIds = [
            ...manifest.malformedPointIds,
            ...[
                ...manifest.records
                    .entries(),
            ]
                .filter(([recordId]) =>
                    !currentIds.has(
                        recordId,
                    ))
                .map(([, entry]) =>
                    entry.pointId),
        ];
        const vectors =
            upsertRecords.length
                ? await this.embedTexts(
                    upsertRecords.map(record =>
                        record.text),
                    false,
                )
                : [];
        await this.putPoints(
            input.timelineId,
            upsertRecords,
            vectors,
        );
        const deleted =
            await this.deletePointIds(
                input.timelineId,
                deletedPointIds,
            );
        this.revisions.set(
            input.timelineId,
            input.stateRevision,
        );
        return {
            backend: this.name,
            collection:
                this.collectionName(
                    input.timelineId,
                ),
            collectionGeneration:
                this.generation,
            upserted:
                upsertRecords.length,
            embedded:
                upsertRecords.length,
            reused:
                records.length -
                upsertRecords.length,
            deleted,
            reconciled: true,
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
        const deleted =
            await this.deletePointIds(
                input.timelineId,
                ids,
            );
        this.revisions.set(
            input.timelineId,
            input.stateRevision,
        );
        return {
            backend: this.name,
            deleted,
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
                retryable: false,
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
