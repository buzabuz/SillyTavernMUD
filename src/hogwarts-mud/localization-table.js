import {
    createHash,
} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import writeFileAtomic from 'write-file-atomic';

import {
    TRANSLATION_API_CONTRACT_VERSION,
    TRANSLATION_TABLE_LIMITS,
    TRANSLATION_TABLE_SCHEMA_VERSION,
    canonicalTranslationIdentity,
    isTranslationRowKey,
    normalizeTranslationRecord,
} from '../../public/scripts/extensions/hogwarts-mud/domain/localization-contract.js';

const JOURNAL_TRANSACTION_VERSION = 1;

function sha256(value) {
    return createHash('sha256')
        .update(String(value || ''))
        .digest('hex');
}

function isPathUnder(root, candidate) {
    const relative =
        path.relative(root, candidate);
    return Boolean(
        relative &&
        !relative.startsWith('..') &&
        !path.isAbsolute(relative),
    );
}

function createEmptyTable(timelineEpoch) {
    return {
        translationApiContractVersion:
            TRANSLATION_API_CONTRACT_VERSION,
        tableSchemaVersion:
            TRANSLATION_TABLE_SCHEMA_VERSION,
        timelineEpoch,
        tableRevision: 0,
        rows: {},
        diagnostics: {
            rowCount: 0,
            serializedBytes: 0,
            lastWriteAt: 0,
        },
    };
}

function canonicalJournalPayload(
    transaction,
) {
    return JSON.stringify({
        transactionVersion:
            transaction
                .transactionVersion,
        translationApiContractVersion:
            transaction
                .translationApiContractVersion,
        tableSchemaVersion:
            transaction
                .tableSchemaVersion,
        timelineEpoch:
            transaction.timelineEpoch,
        tableRevision:
            transaction.tableRevision,
        upserts:
            transaction.upserts,
        deleteKeys:
            transaction.deleteKeys,
        committedAt:
            transaction.committedAt,
    });
}

function withChecksum(transaction) {
    return {
        ...transaction,
        checksum:
            sha256(
                canonicalJournalPayload(
                    transaction,
                ),
            ),
    };
}

function assertJournalTransaction(
    transaction,
    timelineEpoch,
) {
    if (
        !transaction ||
        typeof transaction !== 'object' ||
        Array.isArray(transaction) ||
        Number(
            transaction
                .transactionVersion,
        ) !==
            JOURNAL_TRANSACTION_VERSION ||
        Number(
            transaction
                .translationApiContractVersion,
        ) !==
            TRANSLATION_API_CONTRACT_VERSION ||
        Number(
            transaction
                .tableSchemaVersion,
        ) !==
            TRANSLATION_TABLE_SCHEMA_VERSION ||
        transaction.timelineEpoch !==
            timelineEpoch ||
        !Number.isSafeInteger(
            Number(
                transaction
                    .tableRevision,
            ),
        ) ||
        Number(
            transaction
                .tableRevision,
        ) < 1 ||
        !transaction.upserts ||
        typeof transaction
            .upserts !== 'object' ||
        Array.isArray(
            transaction.upserts,
        ) ||
        !Array.isArray(
            transaction.deleteKeys,
        ) ||
        transaction.checksum !==
            sha256(
                canonicalJournalPayload(
                    transaction,
                ),
            )
    ) {
        throw new TranslationTableError(
            'Translation journal is corrupt.',
            'TRANSLATION_TABLE_CORRUPT',
            500,
        );
    }
}

function applyTransaction(
    table,
    transaction,
) {
    if (
        transaction.tableRevision <=
        table.tableRevision
    ) {
        return;
    }
    if (
        transaction.tableRevision !==
        table.tableRevision + 1
    ) {
        throw new TranslationTableError(
            'Translation journal revision is discontinuous.',
            'TRANSLATION_TABLE_CORRUPT',
            500,
        );
    }
    for (
        const [
            key,
            row,
        ]
        of Object.entries(
            transaction.upserts,
        )
    ) {
        if (!isTranslationRowKey(key)) {
            throw new TranslationTableError(
                'Translation journal contains an invalid row key.',
                'TRANSLATION_TABLE_CORRUPT',
                500,
            );
        }
        const normalized =
            normalizeTranslationRecord(
                row,
                {
                    timelineEpoch:
                        table
                            .timelineEpoch,
                    now:
                        row?.updatedAt,
                },
            );
        if (
            !normalized ||
            key !==
                createServerRowKey(
                    normalized,
                )
        ) {
            throw new TranslationTableError(
                'Translation journal contains an invalid row.',
                'TRANSLATION_TABLE_CORRUPT',
                500,
            );
        }
        table.rows[key] =
            normalized;
    }
    for (
        const key
        of transaction.deleteKeys
    ) {
        if (!isTranslationRowKey(key)) {
            throw new TranslationTableError(
                'Translation journal contains an invalid delete key.',
                'TRANSLATION_TABLE_CORRUPT',
                500,
            );
        }
        delete table.rows[key];
    }
    table.tableRevision =
        transaction.tableRevision;
    table.diagnostics.lastWriteAt =
        Number(
            transaction.committedAt,
        ) || 0;
}

function snapshotForWrite(table) {
    const snapshot = {
        translationApiContractVersion:
            TRANSLATION_API_CONTRACT_VERSION,
        tableSchemaVersion:
            TRANSLATION_TABLE_SCHEMA_VERSION,
        timelineEpoch:
            table.timelineEpoch,
        tableRevision:
            table.tableRevision,
        rows:
            table.rows,
        diagnostics: {
            rowCount:
                Object.keys(
                    table.rows,
                ).length,
            serializedBytes: 0,
            lastWriteAt:
                Number(
                    table.diagnostics
                        ?.lastWriteAt,
                ) || 0,
        },
    };
    snapshot.diagnostics
        .serializedBytes =
        Buffer.byteLength(
            JSON.stringify(
                snapshot,
            ),
            'utf8',
        );
    return snapshot;
}

function sameStoredTranslation(
    left,
    right,
) {
    return [
        'schemaVersion',
        'timelineEpoch',
        'recordKind',
        'recordId',
        'fieldPath',
        'sourceHash',
        'sourceLocale',
        'targetLocale',
        'providerId',
        'translatorVersion',
        'glossaryVersion',
        'translatedText',
        'status',
        'errorCode',
    ].every(field =>
        left?.[field] ===
        right?.[field]);
}

function assertSnapshot(
    snapshot,
    timelineEpoch,
) {
    if (
        !snapshot ||
        typeof snapshot !== 'object' ||
        Array.isArray(snapshot) ||
        Number(
            snapshot
                .translationApiContractVersion,
        ) !==
            TRANSLATION_API_CONTRACT_VERSION ||
        Number(
            snapshot
                .tableSchemaVersion,
        ) !==
            TRANSLATION_TABLE_SCHEMA_VERSION ||
        snapshot.timelineEpoch !==
            timelineEpoch ||
        !Number.isSafeInteger(
            Number(
                snapshot.tableRevision,
            ),
        ) ||
        Number(
            snapshot.tableRevision,
        ) < 0 ||
        !snapshot.rows ||
        typeof snapshot.rows !==
            'object' ||
        Array.isArray(snapshot.rows)
    ) {
        throw new TranslationTableError(
            'Translation snapshot is corrupt.',
            'TRANSLATION_TABLE_CORRUPT',
            500,
        );
    }
    const table =
        createEmptyTable(
            timelineEpoch,
        );
    table.tableRevision =
        Number(
            snapshot.tableRevision,
        );
    table.diagnostics = {
        rowCount: 0,
        serializedBytes: 0,
        lastWriteAt:
            Number(
                snapshot
                    .diagnostics
                    ?.lastWriteAt,
            ) || 0,
    };
    for (
        const [
            key,
            row,
        ]
        of Object.entries(
            snapshot.rows,
        )
    ) {
        const normalized =
            normalizeTranslationRecord(
                row,
                {
                    timelineEpoch,
                    now:
                        row?.updatedAt,
                },
            );
        if (
            !isTranslationRowKey(
                key,
            ) ||
            !normalized ||
            key !==
                createServerRowKey(
                    normalized,
                )
        ) {
            throw new TranslationTableError(
                'Translation snapshot contains an invalid row.',
                'TRANSLATION_TABLE_CORRUPT',
                500,
            );
        }
        table.rows[key] =
            normalized;
    }
    return table;
}

async function appendJournalLine(
    journalPath,
    line,
) {
    const handle =
        await fs.promises.open(
            journalPath,
            'a',
        );
    try {
        await handle.writeFile(
            `${line}\n`,
            'utf8',
        );
        await handle.sync();
    } finally {
        await handle.close();
    }
}

export class TranslationTableError
    extends Error {
    constructor(
        message,
        code,
        status = 400,
    ) {
        super(message);
        this.name =
            'TranslationTableError';
        this.code = code;
        this.status = status;
    }
}

export function createServerRowKey(row) {
    return sha256(
        canonicalTranslationIdentity(
            row,
        ),
    );
}

export class TranslationTableService {
    constructor({
        filesRoot,
        limits =
        TRANSLATION_TABLE_LIMITS,
        appendJournal =
        appendJournalLine,
        writeAtomic =
        writeFileAtomic,
    }) {
        if (!filesRoot) {
            throw new TypeError(
                'Translation table files root is required.',
            );
        }
        this.root =
            path.resolve(
                filesRoot,
                'hogwarts-mud',
                'localization',
            );
        this.limits = {
            ...TRANSLATION_TABLE_LIMITS,
            ...limits,
        };
        this.appendJournal =
            appendJournal;
        this.writeAtomic =
            writeAtomic;
        this.locks =
            new Map();
    }

    normalizeTimelineEpoch(
        timelineEpoch,
    ) {
        const normalized =
            String(
                timelineEpoch || '',
            ).trim();
        if (
            !normalized ||
            normalized.length > 256
        ) {
            throw new TranslationTableError(
                'A valid timeline epoch is required.',
                'INVALID_TIMELINE_EPOCH',
            );
        }
        return normalized;
    }

    paths(timelineEpoch) {
        const normalized =
            this.normalizeTimelineEpoch(
                timelineEpoch,
            );
        const tableRoot =
            path.join(
                this.root,
                sha256(normalized),
            );
        if (
            !isPathUnder(
                this.root,
                tableRoot,
            )
        ) {
            throw new TranslationTableError(
                'Invalid translation table path.',
                'INVALID_TIMELINE_EPOCH',
            );
        }
        return {
            timelineEpoch:
                normalized,
            tableRoot,
            snapshotPath:
                path.join(
                    tableRoot,
                    'snapshot.json',
                ),
            journalPath:
                path.join(
                    tableRoot,
                    'journal.jsonl',
                ),
        };
    }

    async withLock(
        timelineEpoch,
        operation,
    ) {
        const key =
            this.normalizeTimelineEpoch(
                timelineEpoch,
            );
        const previous =
            this.locks.get(key) ||
            Promise.resolve();
        let release;
        const current =
            new Promise(resolve => {
                release = resolve;
            });
        this.locks.set(
            key,
            current,
        );
        await previous;
        try {
            return await operation();
        } finally {
            release();
            if (
                this.locks.get(key) ===
                current
            ) {
                this.locks.delete(key);
            }
        }
    }

    async readSnapshot(
        paths,
    ) {
        try {
            const contents =
                await fs.promises
                    .readFile(
                        paths
                            .snapshotPath,
                        'utf8',
                    );
            return assertSnapshot(
                JSON.parse(contents),
                paths.timelineEpoch,
            );
        } catch (error) {
            if (
                error?.code ===
                'ENOENT'
            ) {
                return createEmptyTable(
                    paths.timelineEpoch,
                );
            }
            if (
                error instanceof
                TranslationTableError
            ) {
                throw error;
            }
            throw new TranslationTableError(
                'Translation snapshot could not be read.',
                'TRANSLATION_TABLE_CORRUPT',
                500,
            );
        }
    }

    async replayJournal(
        paths,
        table,
    ) {
        let contents;
        try {
            contents =
                await fs.promises
                    .readFile(
                        paths
                            .journalPath,
                        'utf8',
                    );
        } catch (error) {
            if (
                error?.code ===
                'ENOENT'
            ) {
                return table;
            }
            throw error;
        }
        const complete =
            contents.endsWith('\n');
        const lines =
            contents.split('\n');
        for (
            let index = 0;
            index < lines.length;
            index++
        ) {
            const line =
                lines[index].trim();
            if (!line) continue;
            if (
                !complete &&
                index ===
                    lines.length - 1
            ) {
                break;
            }
            let transaction;
            try {
                transaction =
                    JSON.parse(line);
            } catch {
                throw new TranslationTableError(
                    'Translation journal is corrupt.',
                    'TRANSLATION_TABLE_CORRUPT',
                    500,
                );
            }
            assertJournalTransaction(
                transaction,
                paths.timelineEpoch,
            );
            applyTransaction(
                table,
                transaction,
            );
        }
        if (
            contents &&
            !complete
        ) {
            const lastNewline =
                contents.lastIndexOf(
                    '\n',
                );
            await this.writeAtomic(
                paths.journalPath,
                lastNewline >= 0
                    ? contents.slice(
                        0,
                        lastNewline + 1,
                    )
                    : '',
                'utf8',
            );
        }
        return table;
    }

    async readTable(timelineEpoch) {
        const paths =
            this.paths(
                timelineEpoch,
            );
        const table =
            await this.readSnapshot(
                paths,
            );
        await this.replayJournal(
            paths,
            table,
        );
        return {
            paths,
            table,
        };
    }

    assertTableLimits(table) {
        const snapshot =
            snapshotForWrite(table);
        if (
            snapshot
                .diagnostics
                .rowCount >
                this.limits
                    .maxRowsPerTimeline ||
            snapshot
                .diagnostics
                .serializedBytes >
                this.limits
                    .maxTableBytes
        ) {
            throw new TranslationTableError(
                'Translation table capacity was reached.',
                'TRANSLATION_TABLE_CAPACITY',
                413,
            );
        }
        table.diagnostics =
            snapshot.diagnostics;
        return snapshot;
    }

    async compact(
        paths,
        table,
    ) {
        const snapshot =
            this.assertTableLimits(
                table,
            );
        await this.writeAtomic(
            paths.snapshotPath,
            JSON.stringify(
                snapshot,
                null,
                2,
            ),
            'utf8',
        );
        await this.writeAtomic(
            paths.journalPath,
            '',
            'utf8',
        );
    }

    async appendTransaction(
        paths,
        table,
        {
            upserts = {},
            deleteKeys = [],
        },
    ) {
        const committedAt =
            Date.now();
        const transaction =
            withChecksum({
                transactionVersion:
                    JOURNAL_TRANSACTION_VERSION,
                translationApiContractVersion:
                    TRANSLATION_API_CONTRACT_VERSION,
                tableSchemaVersion:
                    TRANSLATION_TABLE_SCHEMA_VERSION,
                timelineEpoch:
                    paths.timelineEpoch,
                tableRevision:
                    table.tableRevision +
                    1,
                upserts,
                deleteKeys,
                committedAt,
            });
        fs.mkdirSync(
            paths.tableRoot,
            {
                recursive: true,
            },
        );
        await this.appendJournal(
            paths.journalPath,
            JSON.stringify(
                transaction,
            ),
        );
        applyTransaction(
            table,
            transaction,
        );
        this.assertTableLimits(
            table,
        );
        const journalStats =
            await fs.promises.stat(
                paths.journalPath,
            );
        if (
            journalStats.size >=
            this.limits
                .maxJournalBytesBeforeCompaction
        ) {
            await this.compact(
                paths,
                table,
            );
        }
        return transaction;
    }

    async health({
        timelineEpoch,
    }) {
        return this.withLock(
            timelineEpoch,
            async () => {
                const {
                    paths,
                    table,
                } =
                    await this
                        .readTable(
                            timelineEpoch,
                        );
                return {
                    ok: true,
                    translationApiContractVersion:
                        TRANSLATION_API_CONTRACT_VERSION,
                    tableSchemaVersion:
                        TRANSLATION_TABLE_SCHEMA_VERSION,
                    timelineEpoch:
                        paths
                            .timelineEpoch,
                    tableRevision:
                        table
                            .tableRevision,
                    rowCount:
                        Object.keys(
                            table.rows,
                        ).length,
                    limits:
                        this.limits,
                };
            },
        );
    }

    async query({
        timelineEpoch,
        keys,
    }) {
        if (
            !Array.isArray(keys) ||
            keys.length >
                this.limits
                    .maxQueryKeys ||
            keys.some(key =>
                !isTranslationRowKey(
                    key,
                ))
        ) {
            throw new TranslationTableError(
                'Invalid translation query keys.',
                'INVALID_TRANSLATION_QUERY',
            );
        }
        return this.withLock(
            timelineEpoch,
            async () => {
                const {
                    table,
                } =
                    await this
                        .readTable(
                            timelineEpoch,
                        );
                return {
                    translationApiContractVersion:
                        TRANSLATION_API_CONTRACT_VERSION,
                    tableSchemaVersion:
                        TRANSLATION_TABLE_SCHEMA_VERSION,
                    timelineEpoch:
                        table.timelineEpoch,
                    tableRevision:
                        table.tableRevision,
                    rows:
                        keys
                            .map(key =>
                                table.rows[
                                    key
                                ])
                            .filter(Boolean),
                };
            },
        );
    }

    async upsert({
        timelineEpoch,
        rows,
    }) {
        if (
            !Array.isArray(rows) ||
            rows.length >
                this.limits
                    .maxUpsertRows
        ) {
            throw new TranslationTableError(
                'Invalid translation upsert rows.',
                'INVALID_TRANSLATION_ROWS',
            );
        }
        return this.withLock(
            timelineEpoch,
            async () => {
                const {
                    paths,
                    table,
                } =
                    await this
                        .readTable(
                            timelineEpoch,
                        );
                const upserts = {};
                const acceptedKeys = [];
                for (const row of rows) {
                    const normalized =
                        normalizeTranslationRecord(
                            row,
                            {
                                timelineEpoch:
                                    paths
                                        .timelineEpoch,
                            },
                        );
                    if (!normalized) {
                        throw new TranslationTableError(
                            'Invalid translation row.',
                            'INVALID_TRANSLATION_ROW',
                        );
                    }
                    const key =
                        createServerRowKey(
                            normalized,
                        );
                    const existing =
                        table.rows[key];
                    const stored =
                        existing
                            ?.status ===
                            'ready' &&
                        normalized.status ===
                            'error'
                            ? existing
                            : normalized;
                    acceptedKeys.push(key);
                    if (
                        !sameStoredTranslation(
                            existing,
                            stored,
                        )
                    ) {
                        upserts[key] =
                            stored;
                    }
                }
                const candidate =
                    structuredClone(
                        table,
                    );
                Object.assign(
                    candidate.rows,
                    upserts,
                );
                this.assertTableLimits(
                    candidate,
                );
                if (
                    !Object.keys(
                        upserts,
                    ).length
                ) {
                    return {
                        translationApiContractVersion:
                            TRANSLATION_API_CONTRACT_VERSION,
                        tableSchemaVersion:
                            TRANSLATION_TABLE_SCHEMA_VERSION,
                        timelineEpoch:
                            table
                                .timelineEpoch,
                        tableRevision:
                            table
                                .tableRevision,
                        acceptedKeys:
                            [...new Set(
                                acceptedKeys,
                            )],
                    };
                }
                await this
                    .appendTransaction(
                        paths,
                        table,
                        {
                            upserts,
                        },
                    );
                return {
                    translationApiContractVersion:
                        TRANSLATION_API_CONTRACT_VERSION,
                    tableSchemaVersion:
                        TRANSLATION_TABLE_SCHEMA_VERSION,
                    timelineEpoch:
                        table.timelineEpoch,
                    tableRevision:
                        table.tableRevision,
                    acceptedKeys:
                        [...new Set(
                            acceptedKeys,
                        )],
                };
            },
        );
    }

    async retranslate({
        timelineEpoch,
        keys,
    }) {
        if (
            !Array.isArray(keys) ||
            keys.length >
                this.limits
                    .maxUpsertRows ||
            keys.some(key =>
                !isTranslationRowKey(
                    key,
                ))
        ) {
            throw new TranslationTableError(
                'Invalid retranslation keys.',
                'INVALID_RETRANSLATION_KEYS',
            );
        }
        return this.withLock(
            timelineEpoch,
            async () => {
                const {
                    paths,
                    table,
                } =
                    await this
                        .readTable(
                            timelineEpoch,
                        );
                const deleteKeys =
                    [...new Set(keys)]
                        .filter(key =>
                            table.rows[key]);
                if (deleteKeys.length) {
                    await this
                        .appendTransaction(
                            paths,
                            table,
                            {
                                deleteKeys,
                            },
                        );
                }
                return {
                    translationApiContractVersion:
                        TRANSLATION_API_CONTRACT_VERSION,
                    tableSchemaVersion:
                        TRANSLATION_TABLE_SCHEMA_VERSION,
                    timelineEpoch:
                        table.timelineEpoch,
                    tableRevision:
                        table.tableRevision,
                    removedKeys:
                        deleteKeys,
                };
            },
        );
    }
}

export function createTranslationTableService(
    options,
) {
    return new TranslationTableService(
        options,
    );
}
