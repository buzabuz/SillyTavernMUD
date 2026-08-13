import fs from 'node:fs';
import path from 'node:path';

import { sync as writeFileAtomicSync } from 'write-file-atomic';

import {
    KNOWLEDGE_CATEGORIES,
    hydrateKnowledgeRecords,
    normalizeKnowledgeId,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    StaleKnowledgeRevisionError,
    assertVectorBackend,
    normalizeBackendRecords,
} from './knowledge-vector-backend.js';

function isPathUnder(root, candidate) {
    const relative =
        path.relative(root, candidate);
    return Boolean(
        relative &&
        !relative.startsWith('..') &&
        !path.isAbsolute(relative),
    );
}

function readJson(filePath, fallback) {
    try {
        return JSON.parse(
            fs.readFileSync(
                filePath,
                'utf8',
            ),
        );
    } catch {
        return fallback;
    }
}

function hasStoredRecords(timelineRoot) {
    return KNOWLEDGE_CATEGORIES
        .some(category => {
            const categoryRoot =
                path.join(
                    timelineRoot,
                    category,
                );
            try {
                return fs.readdirSync(
                    categoryRoot,
                ).some(name =>
                    name.endsWith(
                        '.json',
                    ));
            } catch {
                return false;
            }
        });
}

function exactScore(
    record,
    query,
    entityIds,
) {
    const requestedEntities =
        new Set(entityIds || []);
    let score = 0;
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
    const queryTokens =
        new Set(
            String(query || '')
                .trim()
                .toLocaleLowerCase()
                .split(
                    /[^\p{L}\p{N}_-]+/u,
                )
                .filter(token =>
                    token.length > 1),
        );
    const haystack =
        `${
            record.recordId
        } ${
            record.title
        } ${
            record.text
        }`.toLocaleLowerCase();
    for (const token of queryTokens) {
        if (haystack.includes(token)) {
            score +=
                token === record.recordId
                    ? 40
                    : 5;
        }
    }
    return score;
}

export class KnowledgeIndexRebuildRequiredError
    extends Error {
    constructor(timelineId) {
        super(
            `Knowledge index for ${timelineId} is missing and requires a full rebuild.`,
        );
        this.name =
            'KnowledgeIndexRebuildRequiredError';
        this.code =
            'KNOWLEDGE_INDEX_REBUILD_REQUIRED';
    }
}

export class JsonKnowledgeBackend {
    constructor({ root }) {
        if (!root) {
            throw new TypeError(
                'JSON knowledge root is required.',
            );
        }
        this.name = 'json';
        this.root = path.resolve(root);
    }

    timelineRoot(timelineId) {
        const timelineRoot =
            path.join(
                this.root,
                normalizeKnowledgeId(
                    timelineId,
                    'timeline',
                ),
            );
        if (
            !isPathUnder(
                this.root,
                timelineRoot,
            )
        ) {
            throw new Error(
                'Invalid knowledge timeline path.',
            );
        }
        return timelineRoot;
    }

    indexPath(timelineId) {
        return path.join(
            this.timelineRoot(timelineId),
            'index.json',
        );
    }

    readIndex(timelineId) {
        const indexPath =
            this.indexPath(timelineId);
        if (!fs.existsSync(indexPath)) {
            return null;
        }
        const index =
            readJson(indexPath, null);
        return (
            index &&
            Number(index.version) === 2 &&
            index.records &&
            typeof index.records ===
                'object'
        )
            ? index
            : null;
    }

    readRecord(timelineId, entry) {
        const timelineRoot =
            this.timelineRoot(timelineId);
        const recordPath =
            path.join(
                timelineRoot,
                entry.category,
                `${entry.recordId}.json`,
            );
        if (
            !isPathUnder(
                timelineRoot,
                recordPath,
            ) ||
            !fs.existsSync(recordPath)
        ) {
            return null;
        }
        return readJson(
            recordPath,
            null,
        );
    }

    async health({ timelineId }) {
        const timelineRoot =
            this.timelineRoot(timelineId);
        const exists =
            fs.existsSync(timelineRoot);
        const index =
            this.readIndex(timelineId);
        const indexMissing =
            exists &&
            !index &&
            hasStoredRecords(
                timelineRoot,
            );
        return {
            ok:
                Boolean(index) ||
                !indexMissing,
            backend: this.name,
            indexMissing,
            stateRevision:
                index?.stateRevision ??
                null,
            recordCount:
                Object.keys(
                    index?.records ||
                    {},
                ).length,
        };
    }

    assertRevision(
        index,
        timelineEpoch,
        stateRevision,
    ) {
        if (
            index &&
            index.timelineEpoch ===
                timelineEpoch &&
            stateRevision <
                index.stateRevision
        ) {
            throw new StaleKnowledgeRevisionError(
                index.stateRevision,
                stateRevision,
            );
        }
    }

    createIndex(
        timelineId,
        timelineEpoch,
        stateRevision,
    ) {
        return {
            version: 2,
            projectorVersion: 2,
            timelineId,
            timelineEpoch,
            stateRevision,
            records: {},
        };
    }

    writeRecords({
        timelineId,
        timelineEpoch,
        stateRevision,
        records,
        replace,
        index,
    }) {
        const timelineRoot =
            this.timelineRoot(timelineId);
        fs.mkdirSync(
            timelineRoot,
            {
                recursive: true,
            },
        );
        const incomingKeys =
            new Set();
        const saved = [];
        for (const record of records) {
            const categoryRoot =
                path.join(
                    timelineRoot,
                    record.category,
                );
            fs.mkdirSync(
                categoryRoot,
                {
                    recursive: true,
                },
            );
            const recordPath =
                path.join(
                    categoryRoot,
                    `${record.recordId}.json`,
                );
            if (
                !isPathUnder(
                    categoryRoot,
                    recordPath,
                )
            ) {
                throw new Error(
                    'Invalid knowledge record path.',
                );
            }
            writeFileAtomicSync(
                recordPath,
                JSON.stringify(
                    record,
                    null,
                    2,
                ),
                'utf8',
            );
            incomingKeys.add(
                record.recordId,
            );
            index.records[
                record.recordId
            ] = {
                recordId:
                    record.recordId,
                category:
                    record.category,
                nodeType:
                    record.nodeType,
                title: record.title,
                entityIds:
                    record.entityIds,
                tags: record.tags,
                sourceRefs:
                    record.sourceRefs,
                visibility:
                    record.visibility,
                effectiveClock:
                    record.effectiveClock,
                stateRevision:
                    record.stateRevision,
                contentChecksum:
                    record.contentChecksum,
            };
            saved.push(
                index.records[
                    record.recordId
                ],
            );
        }
        const removed = [];
        if (replace) {
            for (
                const [
                    recordId,
                    entry,
                ]
                of Object.entries(
                    index.records,
                )
            ) {
                if (
                    incomingKeys.has(
                        recordId,
                    )
                ) {
                    continue;
                }
                const recordPath =
                    path.join(
                        timelineRoot,
                        entry.category,
                        `${recordId}.json`,
                    );
                if (
                    isPathUnder(
                        timelineRoot,
                        recordPath,
                    )
                ) {
                    fs.rmSync(
                        recordPath,
                        {
                            force: true,
                        },
                    );
                }
                delete index.records[
                    recordId
                ];
                removed.push({
                    recordId,
                    category:
                        entry.category,
                });
            }
        }
        index.timelineEpoch =
            timelineEpoch;
        index.stateRevision =
            stateRevision;
        writeFileAtomicSync(
            this.indexPath(timelineId),
            JSON.stringify(
                index,
                null,
                2,
            ),
            'utf8',
        );
        return {
            backend: this.name,
            records: saved,
            removed,
            root: timelineRoot,
        };
    }

    async upsert(input) {
        const health =
            await this.health(input);
        if (health.indexMissing) {
            if (!input.replace) {
                throw new KnowledgeIndexRebuildRequiredError(
                    input.timelineId,
                );
            }
            return this.rebuild(input);
        }
        const current =
            this.readIndex(
                input.timelineId,
            );
        this.assertRevision(
            current,
            input.timelineEpoch,
            input.stateRevision,
        );
        const records =
            normalizeBackendRecords(
                input.records,
            );
        const index =
            current ||
            this.createIndex(
                input.timelineId,
                input.timelineEpoch,
                input.stateRevision,
            );
        return this.writeRecords({
            ...input,
            records,
            index,
        });
    }

    async delete(input) {
        const index =
            this.readIndex(
                input.timelineId,
            );
        this.assertRevision(
            index,
            input.timelineEpoch,
            input.stateRevision,
        );
        if (!index) {
            return {
                backend: this.name,
                deleted: 0,
            };
        }
        const timelineRoot =
            this.timelineRoot(
                input.timelineId,
            );
        let deleted = 0;
        for (
            const recordId
            of input.recordIds || []
        ) {
            const normalizedId =
                normalizeKnowledgeId(
                    recordId,
                );
            const entry =
                index.records[
                    normalizedId
                ];
            if (!entry) continue;
            const recordPath =
                path.join(
                    timelineRoot,
                    entry.category,
                    `${normalizedId}.json`,
                );
            if (
                isPathUnder(
                    timelineRoot,
                    recordPath,
                )
            ) {
                fs.rmSync(
                    recordPath,
                    {
                        force: true,
                    },
                );
            }
            delete index.records[
                normalizedId
            ];
            deleted++;
        }
        index.stateRevision =
            input.stateRevision;
        writeFileAtomicSync(
            this.indexPath(
                input.timelineId,
            ),
            JSON.stringify(
                index,
                null,
                2,
            ),
            'utf8',
        );
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
        const index =
            this.readIndex(timelineId);
        if (!index) {
            return {
                backend: this.name,
                records: [],
                diagnostics: {
                    indexMissing:
                        hasStoredRecords(
                            this.timelineRoot(
                                timelineId,
                            ),
                        ),
                    selectedRecordIds:
                        [],
                    suppressed: [],
                },
            };
        }
        const records =
            Object.values(
                index.records,
            )
                .map(entry =>
                    this.readRecord(
                        timelineId,
                        entry,
                    ))
                .filter(Boolean);
        const hydrated =
            hydrateKnowledgeRecords(
                records,
                filters,
            );
        const ranked =
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
                .slice(
                    0,
                    Math.max(
                        1,
                        Number(limit) || 8,
                    ),
                )
                .map(item =>
                    item.record);
        return {
            backend: this.name,
            records: ranked,
            diagnostics: {
                ...hydrated.diagnostics,
                selectedRecordIds:
                    ranked.map(record =>
                        record.recordId),
            },
        };
    }

    async rebuild(input) {
        const records =
            normalizeBackendRecords(
                input.records,
            );
        const timelineRoot =
            this.timelineRoot(
                input.timelineId,
            );
        fs.mkdirSync(
            timelineRoot,
            {
                recursive: true,
            },
        );
        for (
            const category
            of KNOWLEDGE_CATEGORIES
        ) {
            fs.rmSync(
                path.join(
                    timelineRoot,
                    category,
                ),
                {
                    recursive: true,
                    force: true,
                },
            );
        }
        const index =
            this.createIndex(
                input.timelineId,
                input.timelineEpoch,
                input.stateRevision,
            );
        const result =
            this.writeRecords({
                ...input,
                records,
                replace: true,
                index,
            });
        return {
            ...result,
            rebuilt: true,
        };
    }
}

export function createJsonKnowledgeBackend(
    options,
) {
    return assertVectorBackend(
        new JsonKnowledgeBackend(
            options,
        ),
    );
}
