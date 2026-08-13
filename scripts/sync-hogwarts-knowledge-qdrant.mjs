#!/usr/bin/env node
/* global globalThis */

import {
    createHash,
} from 'node:crypto';
import {
    open,
} from 'node:fs/promises';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

import {
    buildArchiveKnowledgeRecords,
    TARGET_EVIDENCE_EVENT_ID,
} from './repair-hogwarts-relational-memory-task7.mjs';
import {
    getKnowledgeBackendConfig,
} from '../src/hogwarts-mud/knowledge-backend-factory.js';
import {
    createQdrantKnowledgeBackend,
} from '../src/hogwarts-mud/knowledge-qdrant-backend.js';
import {
    getTransformersBatchVector,
} from '../src/vectors/embedding.js';
import {
    getConfigValue,
    setConfigFilePath,
} from '../src/util.js';

const PROJECT_ROOT =
    path.resolve(
        path.dirname(
            fileURLToPath(
                import.meta.url,
            ),
        ),
        '..',
    );

export const DEFAULT_ARCHIVE =
    path.join(
        PROJECT_ROOT,
        'data',
        'default-user',
        'chats',
        'Hogwarts_World_Director',
        'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    );
export const DEFAULT_CONFIG =
    path.join(
        PROJECT_ROOT,
        'config.yaml',
    );
export const DEFAULT_KNOWN_RECORD_ID =
    'events_item_harry_spare_brass_quill_current';
export const DEFAULT_KNOWN_SOURCE_REF =
    Object.freeze({
        type: 'event',
        id: TARGET_EVIDENCE_EVENT_ID,
    });

const READ_ONLY_FLAGS =
    new Set([
        '--apply',
        '--output',
        '--state',
        '--write',
        '--write-archive',
    ]);
const MODEL_CALLS =
    Object.freeze({
        high: 0,
        medium: 0,
        low: 0,
        local: 0,
        total: 0,
    });

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function parseJsonLine(
    line,
    lineNumber,
) {
    if (!line.trim()) {
        throw new Error(
            `Archive line ${lineNumber} is empty.`,
        );
    }
    try {
        return JSON.parse(line);
    } catch (error) {
        throw new Error(
            `Archive line ${lineNumber} is not valid JSON: ${
                error.message
            }`,
            {
                cause: error,
            },
        );
    }
}

export async function loadAuthoritativeArchive(
    archivePath,
) {
    const resolvedPath =
        path.resolve(archivePath);
    const handle =
        await open(
            resolvedPath,
            'r',
        );
    let source;
    let fileStat;
    try {
        fileStat =
            await handle.stat();
        if (!fileStat.isFile()) {
            throw new Error(
                `Archive is not a regular file: ${resolvedPath}`,
            );
        }
        source =
            await handle.readFile();
    } finally {
        await handle.close();
    }
    if (!source.length) {
        throw new Error(
            `Archive is empty: ${resolvedPath}`,
        );
    }
    const text =
        source.toString('utf8');
    const lines =
        text.endsWith('\n')
            ? text.slice(0, -1)
                .split('\n')
            : text.split('\n');
    const parsed =
        lines.map(
            (
                line,
                index,
            ) =>
                parseJsonLine(
                    line,
                    index + 1,
                ),
        );
    const header =
        parsed[0];
    const state =
        header?.chat_metadata
            ?.hogwartsMud;
    if (
        !state ||
        typeof state !== 'object'
    ) {
        throw new Error(
            'Archive metadata does not contain authoritative Hogwarts State.',
        );
    }
    if (
        !String(
            state.timelineEpoch ||
            '',
        ).trim()
    ) {
        throw new Error(
            'Authoritative State is missing timelineEpoch.',
        );
    }
    if (
        !Number.isSafeInteger(
            Number(
                state.stateRevision,
            ),
        ) ||
        Number(
            state.stateRevision,
        ) < 0
    ) {
        throw new Error(
            'Authoritative State has an invalid stateRevision.',
        );
    }
    return {
        archivePath:
            resolvedPath,
        sha256:
            sha256(source),
        size: fileStat.size,
        mtimeMs:
            fileStat.mtimeMs,
        lineCount:
            lines.length,
        header,
        state,
        chat:
            parsed.slice(1),
    };
}

function assertProjectionRecords(
    records,
    state,
) {
    if (
        !Array.isArray(records) ||
        !records.length
    ) {
        throw new Error(
            'Knowledge Projector V2 returned no records.',
        );
    }
    const recordIds =
        new Set();
    let previousRecordId = '';
    for (const record of records) {
        if (
            record?.version !== 2 ||
            record
                ?.projectorVersion !==
                2
        ) {
            throw new Error(
                `Record ${
                    record?.recordId ||
                    '<missing>'
                } is not Knowledge V2.`,
            );
        }
        if (
            record.timelineEpoch !==
            state.timelineEpoch ||
            record.stateRevision !==
            Number(
                state.stateRevision,
            )
        ) {
            throw new Error(
                `Record ${record.recordId} does not match the authoritative revision.`,
            );
        }
        if (
            !record.recordId ||
            recordIds.has(
                record.recordId,
            )
        ) {
            throw new Error(
                `Knowledge record ID is missing or duplicated: ${
                    record.recordId ||
                    '<missing>'
                }`,
            );
        }
        if (
            previousRecordId &&
            previousRecordId.localeCompare(
                record.recordId,
                'en',
            ) > 0
        ) {
            throw new Error(
                'Knowledge records are not in stable recordId order.',
            );
        }
        recordIds.add(
            record.recordId,
        );
        previousRecordId =
            record.recordId;
    }
}

export function buildAuthoritativeKnowledgeProjection(
    authority,
    projector =
    buildArchiveKnowledgeRecords,
) {
    const stateBefore =
        sha256(
            JSON.stringify(
                authority.state,
            ),
        );
    const chatBefore =
        sha256(
            JSON.stringify(
                authority.chat,
            ),
        );
    const records =
        projector(
            authority.state,
            authority.chat,
        );
    if (
        stateBefore !==
            sha256(
                JSON.stringify(
                    authority.state,
                ),
            ) ||
        chatBefore !==
            sha256(
                JSON.stringify(
                    authority.chat,
                ),
            )
    ) {
        throw new Error(
            'Knowledge projection mutated authoritative State or chat in memory.',
        );
    }
    assertProjectionRecords(
        records,
        authority.state,
    );
    return records;
}

function integerArgument(
    flag,
    value,
    {
        minimum = 1,
    } = {},
) {
    const parsed =
        Number(value);
    if (
        !Number.isSafeInteger(
            parsed,
        ) ||
        parsed < minimum
    ) {
        throw new TypeError(
            `${flag} must be an integer greater than or equal to ${minimum}.`,
        );
    }
    return parsed;
}

function sourceRefArgument(value) {
    const separator =
        String(value || '')
            .indexOf(':');
    if (separator < 1) {
        throw new TypeError(
            '--known-source-ref must use type:id.',
        );
    }
    const type =
        value.slice(
            0,
            separator,
        ).trim();
    const id =
        value.slice(
            separator + 1,
        ).trim();
    if (!type || !id) {
        throw new TypeError(
            '--known-source-ref must use type:id.',
        );
    }
    return {
        type,
        id,
    };
}

function argumentValue(
    argv,
    index,
    flag,
) {
    const value =
        argv[index + 1];
    if (
        value === undefined ||
        value.startsWith('--')
    ) {
        throw new TypeError(
            `${flag} requires a value.`,
        );
    }
    return value;
}

export function parseArguments(
    argv,
    {
        cwd = process.cwd(),
    } = {},
) {
    const options = {
        archive:
            DEFAULT_ARCHIVE,
        config:
            DEFAULT_CONFIG,
        operation:
            'rebuild',
        timelineId: '',
        query: '',
        knownRecordId:
            DEFAULT_KNOWN_RECORD_ID,
        knownSourceRef: {
            ...DEFAULT_KNOWN_SOURCE_REF,
        },
        expectedRecordCount:
            null,
        limit: 8,
        audienceActorIds: [],
        qdrantUrl: '',
        embeddingModel: '',
        dimensions: null,
        collectionPrefix: '',
        timeoutMs: null,
        dataRoot: '',
        allowNonLoopback: false,
        help: false,
    };
    for (
        let index = 0;
        index < argv.length;
        index += 1
    ) {
        const flag =
            argv[index];
        if (READ_ONLY_FLAGS.has(flag)) {
            throw new Error(
                `${flag} is forbidden: this command never writes archive or State.`,
            );
        }
        if (flag === '--help') {
            options.help = true;
            continue;
        }
        if (
            flag ===
            '--allow-non-loopback'
        ) {
            options
                .allowNonLoopback =
                true;
            continue;
        }
        const value =
            argumentValue(
                argv,
                index,
                flag,
            );
        index += 1;
        switch (flag) {
            case '--archive':
                options.archive =
                    path.resolve(
                        cwd,
                        value,
                    );
                break;
            case '--config':
                options.config =
                    path.resolve(
                        cwd,
                        value,
                    );
                break;
            case '--operation':
                if (
                    value !==
                        'rebuild' &&
                    value !==
                        'upsert'
                ) {
                    throw new TypeError(
                        '--operation must be rebuild or upsert.',
                    );
                }
                options.operation =
                    value;
                break;
            case '--timeline-id':
                options.timelineId =
                    value;
                break;
            case '--query':
                options.query =
                    value;
                break;
            case '--known-record-id':
                options
                    .knownRecordId =
                    value;
                break;
            case '--known-source-ref':
                options
                    .knownSourceRef =
                    sourceRefArgument(
                        value,
                    );
                break;
            case '--expected-record-count':
                options
                    .expectedRecordCount =
                    integerArgument(
                        flag,
                        value,
                    );
                break;
            case '--limit':
                options.limit =
                    integerArgument(
                        flag,
                        value,
                    );
                break;
            case '--audience-actor':
                options
                    .audienceActorIds
                    .push(value);
                break;
            case '--qdrant-url':
                options.qdrantUrl =
                    value;
                break;
            case '--embedding-model':
                options
                    .embeddingModel =
                    value;
                break;
            case '--dimensions':
                options.dimensions =
                    integerArgument(
                        flag,
                        value,
                    );
                break;
            case '--collection-prefix':
                options
                    .collectionPrefix =
                    value;
                break;
            case '--timeout-ms':
                options.timeoutMs =
                    integerArgument(
                        flag,
                        value,
                        {
                            minimum:
                                250,
                        },
                    );
                break;
            case '--data-root':
                options.dataRoot =
                    path.resolve(
                        cwd,
                        value,
                    );
                break;
            default:
                throw new TypeError(
                    `Unknown argument: ${flag}`,
                );
        }
    }
    return options;
}

function assertLoopbackQdrant(
    url,
    allowNonLoopback,
) {
    let parsed;
    try {
        parsed =
            new URL(url);
    } catch (error) {
        throw new TypeError(
            `Configured Qdrant URL is invalid: ${url}`,
            {
                cause: error,
            },
        );
    }
    if (
        ![
            'http:',
            'https:',
        ].includes(
            parsed.protocol,
        )
    ) {
        throw new TypeError(
            'Configured Qdrant URL must use HTTP or HTTPS.',
        );
    }
    const loopback =
        new Set([
            '127.0.0.1',
            '[::1]',
            '::1',
            'localhost',
        ]);
    if (
        !allowNonLoopback &&
        !loopback.has(
            parsed.hostname,
        )
    ) {
        throw new Error(
            'Refusing non-loopback Qdrant without --allow-non-loopback.',
        );
    }
}

export function initializeTransformerDataRoot(
    configuredDataRoot,
) {
    const dataRoot =
        path.resolve(
            PROJECT_ROOT,
            configuredDataRoot ||
            'data',
        );
    globalThis.DATA_ROOT =
        dataRoot;
    return dataRoot;
}

export function loadConfiguredQdrant(
    options,
) {
    setConfigFilePath(
        options.config,
    );
    const configured = {
        ...getKnowledgeBackendConfig()
            .qdrant,
    };
    const merged = {
        ...configured,
        ...(options.qdrantUrl
            ? {
                url:
                    options.qdrantUrl,
                enabled: true,
            }
            : {}),
        ...(options.embeddingModel
            ? {
                embeddingModel:
                    options
                        .embeddingModel,
            }
            : {}),
        ...(options.dimensions
            ? {
                dimensions:
                    options.dimensions,
            }
            : {}),
        ...(options.collectionPrefix
            ? {
                collectionPrefix:
                    options
                        .collectionPrefix,
            }
            : {}),
        ...(options.timeoutMs
            ? {
                timeoutMs:
                    options.timeoutMs,
            }
            : {}),
    };
    if (
        !merged.enabled ||
        !merged.url
    ) {
        throw new Error(
            'Configured Qdrant is not enabled.',
        );
    }
    if (
        !String(
            merged.embeddingModel ||
            '',
        ).trim() ||
        !Number.isSafeInteger(
            Number(
                merged.dimensions,
            ),
        )
    ) {
        throw new Error(
            'Configured embedding model or dimensions are invalid.',
        );
    }
    assertLoopbackQdrant(
        merged.url,
        options.allowNonLoopback,
    );
    return {
        ...merged,
        dataRoot:
            initializeTransformerDataRoot(
                options.dataRoot ||
                getConfigValue(
                    'dataRoot',
                    'data',
                ),
            ),
    };
}

function archiveTimelineId(
    archivePath,
) {
    return path.basename(
        archivePath,
        path.extname(
            archivePath,
        ),
    );
}

function assertArchiveUnchanged(
    before,
    after,
    stage,
) {
    if (
        before.archivePath !==
            after.archivePath ||
        before.sha256 !==
            after.sha256 ||
        before.size !==
            after.size ||
        before.state
            .timelineEpoch !==
            after.state
                .timelineEpoch ||
        Number(
            before.state
                .stateRevision,
        ) !==
            Number(
                after.state
                    .stateRevision,
            )
    ) {
        throw new Error(
            `Authoritative archive changed during ${stage}; Qdrant projection is not authority.`,
        );
    }
}

function countCategories(records) {
    const counts = {};
    for (const record of records) {
        counts[record.category] =
            (
                counts[
                    record.category
                ] ||
                0
            ) + 1;
    }
    return Object.fromEntries(
        Object.entries(counts)
            .sort((left, right) =>
                left[0]
                    .localeCompare(
                        right[0],
                        'en',
                    )),
    );
}

function findKnownRecord(
    records,
    options,
) {
    const known =
        records.find(record =>
            record.recordId ===
            options.knownRecordId);
    if (!known) {
        throw new Error(
            `Known record is absent from authoritative projection: ${options.knownRecordId}`,
        );
    }
    const sourceRef =
        known.sourceRefs.find(ref =>
            ref.type ===
                options
                    .knownSourceRef
                    .type &&
            ref.id ===
                options
                    .knownSourceRef
                    .id);
    if (!sourceRef) {
        throw new Error(
            `Known sourceRef is absent from ${known.recordId}.`,
        );
    }
    return {
        record: known,
        sourceRef,
    };
}

async function defaultCollectionInfo(
    backend,
    collectionName,
) {
    const response =
        await backend.request(
            `/collections/${
                encodeURIComponent(
                    collectionName,
                )
            }`,
        );
    return response?.result;
}

function querySummary(
    queryResult,
    knownRecordId,
    knownSourceRef,
) {
    const results =
        (
            queryResult.records ||
            []
        ).map(record => ({
            recordId:
                record.recordId,
            sourceRefs:
                record.sourceRefs,
        }));
    const matched =
        results.find(result =>
            result.recordId ===
                knownRecordId &&
            result.sourceRefs.some(
                ref =>
                    ref.type ===
                        knownSourceRef
                            .type &&
                    ref.id ===
                        knownSourceRef
                            .id,
            ));
    if (!matched) {
        throw new Error(
            `Real Qdrant query did not recall ${knownRecordId} with the known sourceRef.`,
        );
    }
    return {
        matched: true,
        expectedRecordId:
            knownRecordId,
        expectedSourceRef:
            knownSourceRef,
        results,
    };
}

export async function runKnowledgeSync(
    options,
    dependencies = {},
) {
    const loadArchive =
        dependencies.loadArchive ||
        loadAuthoritativeArchive;
    const project =
        dependencies.project ||
        buildAuthoritativeKnowledgeProjection;
    const loadQdrant =
        dependencies.loadQdrant ||
        loadConfiguredQdrant;
    const createBackend =
        dependencies.createBackend ||
        createQdrantKnowledgeBackend;
    const embedder =
        dependencies.embedder ||
        getTransformersBatchVector;
    const getCollectionInfo =
        dependencies
            .getCollectionInfo ||
        defaultCollectionInfo;

    const before =
        await loadArchive(
            options.archive,
        );
    const records =
        project(before);
    if (
        options
            .expectedRecordCount !==
            null &&
        records.length !==
            options
                .expectedRecordCount
    ) {
        throw new Error(
            `Expected ${
                options
                    .expectedRecordCount
            } records, projected ${
                records.length
            }.`,
        );
    }
    const known =
        findKnownRecord(
            records,
            options,
        );
    const preSync =
        await loadArchive(
            options.archive,
        );
    assertArchiveUnchanged(
        before,
        preSync,
        'projection preflight',
    );

    const qdrantConfig =
        loadQdrant(options);
    const backend =
        createBackend({
            ...qdrantConfig,
            embedder,
        });
    if (backend.name !== 'qdrant') {
        throw new Error(
            'Configured backend is not Qdrant.',
        );
    }
    const timelineId =
        options.timelineId ||
        archiveTimelineId(
            before.archivePath,
        );
    const input = {
        timelineId,
        timelineEpoch:
            before.state
                .timelineEpoch,
        stateRevision:
            Number(
                before.state
                    .stateRevision,
            ),
        records,
    };
    const syncResult =
        await backend[
            options.operation
        ](input);
    const upsertedCount =
        Number(
            syncResult.upserted,
        ) || 0;
    const failedCount =
        Math.max(
            0,
            records.length -
                upsertedCount,
        );
    if (failedCount) {
        throw new Error(
            `Qdrant accepted ${upsertedCount} of ${records.length} records.`,
        );
    }

    const query =
        options.query ||
        known.record.text;
    const audienceActorIds =
        options
            .audienceActorIds
            .length
            ? options
                .audienceActorIds
            : ['player'];
    const queryResult =
        await backend.query({
            timelineId,
            query,
            limit:
                options.limit,
            filters: {
                timelineEpoch:
                    input
                        .timelineEpoch,
                stateRevision:
                    input
                        .stateRevision,
                audience: {
                    actorIds:
                        audienceActorIds,
                    role: 'player',
                    includeLocked:
                        false,
                },
                clock:
                    before.state
                        .clock ||
                    '',
                nodeTypes: [],
                categories: [],
            },
        });
    if (
        queryResult.backend !==
        'qdrant'
    ) {
        throw new Error(
            'Knowledge query did not use Qdrant.',
        );
    }
    const knownQuery =
        querySummary(
            queryResult,
            known.record.recordId,
            known.sourceRef,
        );
    const collectionName =
        syncResult.collection ||
        backend.collectionName(
            timelineId,
        );
    const collectionInfo =
        await getCollectionInfo(
            backend,
            collectionName,
        );
    const pointCount =
        Number(
            collectionInfo
                ?.points_count,
        );
    if (
        !Number.isSafeInteger(
            pointCount,
        ) ||
        pointCount !==
            records.length
    ) {
        throw new Error(
            `Qdrant collection point count ${pointCount} does not match ${records.length}.`,
        );
    }

    const after =
        await loadArchive(
            options.archive,
        );
    assertArchiveUnchanged(
        before,
        after,
        'Qdrant sync',
    );
    const generation =
        syncResult
            .collectionGeneration ||
        backend.generation;
    return {
        archive: {
            path:
                before.archivePath,
            beforeSha256:
                before.sha256,
            afterSha256:
                after.sha256,
            unchanged: true,
            size:
                before.size,
            lineCount:
                before.lineCount,
        },
        archiveBeforeSha256:
            before.sha256,
        archiveAfterSha256:
            after.sha256,
        timelineId,
        timelineEpoch:
            input.timelineEpoch,
        revision:
            input.stateRevision,
        stateRevision:
            input.stateRevision,
        projectorVersion: 2,
        recordCount:
            records.length,
        categories:
            countCategories(
                records,
            ),
        operation:
            options.operation,
        collectionGeneration:
            generation,
        collectionName,
        pointCount,
        indexedVectorCount:
            Number(
                collectionInfo
                    ?.indexed_vectors_count,
            ) || 0,
        upsertedCount,
        failedCount,
        backend: 'qdrant',
        degraded: false,
        knownQuery: {
            query,
            ...knownQuery,
        },
        embedding: {
            model:
                qdrantConfig
                    .embeddingModel,
            dimensions:
                qdrantConfig
                    .dimensions,
            dataRoot:
                qdrantConfig
                    .dataRoot,
        },
        modelCallCount: 0,
        modelCalls: {
            ...MODEL_CALLS,
        },
    };
}

export function usage() {
    return [
        'Usage: node scripts/sync-hogwarts-knowledge-qdrant.mjs [options]',
        '',
        'Options:',
        '  --archive PATH',
        '  --config PATH',
        '  --operation rebuild|upsert',
        '  --timeline-id ID',
        '  --query TEXT',
        '  --known-record-id ID',
        '  --known-source-ref type:id',
        '  --expected-record-count NUMBER',
        '  --limit NUMBER',
        '  --audience-actor ID',
        '  --qdrant-url URL',
        '  --embedding-model MODEL',
        '  --dimensions NUMBER',
        '  --collection-prefix PREFIX',
        '  --timeout-ms NUMBER',
        '  --data-root PATH',
        '  --allow-non-loopback',
        '  --help',
        '',
        'The archive and authoritative State are always read-only.',
    ].join('\n');
}

export async function runCli(argv) {
    const options =
        parseArguments(argv);
    if (options.help) {
        return {
            help:
                usage(),
        };
    }
    return runKnowledgeSync(
        options,
    );
}

const isMain =
    process.argv[1] &&
    fileURLToPath(
        import.meta.url,
    ) ===
        path.resolve(
            process.argv[1],
        );

if (isMain) {
    runCli(
        process.argv.slice(2),
    )
        .then(result => {
            process.stdout.write(
                `${JSON.stringify(
                    result,
                    null,
                    2,
                )}\n`,
            );
        })
        .catch(error => {
            process.stderr.write(
                `${String(
                    error?.stack ||
                    error,
                )}\n`,
            );
            process.exitCode = 1;
        });
}
