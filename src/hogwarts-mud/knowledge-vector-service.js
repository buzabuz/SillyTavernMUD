import {
    hydrateKnowledgeRecords,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    assertVectorBackend,
    normalizeBackendRecords,
} from './knowledge-vector-backend.js';

function mergeRecords(
    exactRecords,
    semanticRecords,
    limit,
) {
    const merged = new Map();
    for (
        const record
        of [
            ...exactRecords,
            ...semanticRecords,
        ]
    ) {
        if (
            !merged.has(
                record.recordId,
            )
        ) {
            merged.set(
                record.recordId,
                record,
            );
        }
    }
    return [...merged.values()]
        .slice(0, limit);
}

function validateProjectionBatch({
    timelineEpoch,
    stateRevision,
    records,
}) {
    const normalized =
        normalizeBackendRecords(
            records,
        );
    for (const record of normalized) {
        if (
            record.timelineEpoch !==
            timelineEpoch
        ) {
            throw new TypeError(
                `Knowledge record ${record.recordId} has a mismatched timeline epoch.`,
            );
        }
        if (
            record.stateRevision !==
            stateRevision
        ) {
            throw new TypeError(
                `Knowledge record ${record.recordId} has a mismatched state revision.`,
            );
        }
    }
    return normalized;
}

export class KnowledgeVectorService {
    constructor({
        exactBackend,
        preferredBackend = null,
    }) {
        this.exactBackend =
            assertVectorBackend(
                exactBackend,
            );
        this.preferredBackend =
            preferredBackend
                ? assertVectorBackend(
                    preferredBackend,
                )
                : null;
    }

    async health(input) {
        const exact =
            await this.exactBackend
                .health(input);
        const preferred =
            this.preferredBackend
                ? await this
                    .preferredBackend
                    .health(input)
                : {
                    ok: false,
                    configured: false,
                    backend: 'none',
                };
        return {
            exact,
            preferred,
            degraded:
                Boolean(
                    this.preferredBackend &&
                    !preferred.ok,
                ),
        };
    }

    async sync(input) {
        const records =
            validateProjectionBatch(
                input,
            );
        const exactResult =
            await this.exactBackend
                .upsert({
                    ...input,
                    records,
                });
        const diagnostics = {
            backend:
                this.exactBackend.name ||
                'json',
            preferredBackend:
                this.preferredBackend
                    ?.name ||
                'none',
            degraded: false,
            fallback:
                this.exactBackend.name ||
                'json',
            indexRebuilt:
                Boolean(
                    exactResult.rebuilt,
                ),
            knowledgeApiContractVersion:
                exactResult
                    .knowledgeApiContractVersion,
            indexFormatVersion:
                exactResult
                    .indexFormatVersion,
            projectorVersion:
                exactResult
                    .projectorVersion,
            projectionFingerprint:
                exactResult
                    .projectionFingerprint,
            stateRevision:
                exactResult
                    .stateRevision,
            errors: [],
        };
        let preferredResult = null;
        if (this.preferredBackend) {
            try {
                const health =
                    await this
                        .preferredBackend
                        .health(input);
                if (
                    health.indexMissing ||
                    health.indexIncompatible
                ) {
                    preferredResult =
                        await this
                            .preferredBackend
                            .rebuild({
                                ...input,
                                records,
                            });
                    diagnostics
                        .indexRebuilt =
                        true;
                } else if (!health.ok) {
                    throw new Error(
                        health.error ||
                        `${
                            this
                                .preferredBackend
                                .name
                        } health failed`,
                    );
                } else {
                    if (
                        typeof this
                            .preferredBackend
                            .reconcile ===
                            'function'
                    ) {
                        preferredResult =
                            await this
                                .preferredBackend
                                .reconcile(
                                    {
                                        ...input,
                                        records,
                                    },
                                    health,
                                );
                    } else {
                        const removedIds =
                            (
                                exactResult
                                    .removed ||
                                []
                            ).map(entry =>
                                entry.recordId ||
                                entry.id);
                        if (removedIds.length) {
                            await this
                                .preferredBackend
                                .delete({
                                    ...input,
                                    recordIds:
                                        removedIds,
                                });
                        }
                        preferredResult =
                            await this
                                .preferredBackend
                                .upsert({
                                    ...input,
                                    records,
                                });
                    }
                }
                diagnostics.backend =
                    this.preferredBackend
                        .name;
                diagnostics.embeddedRecordCount =
                    Number(
                        preferredResult
                            ?.embedded ??
                        preferredResult
                            ?.upserted ??
                        0,
                    );
                diagnostics.reusedRecordCount =
                    Number(
                        preferredResult
                            ?.reused ??
                        0,
                    );
                diagnostics.deletedRecordCount =
                    Number(
                        preferredResult
                            ?.deleted ??
                        0,
                    );
            } catch (error) {
                diagnostics.degraded =
                    true;
                diagnostics.errors.push(
                    String(
                        error?.message ||
                        error,
                    ).slice(0, 1_000),
                );
            }
        }
        return {
            exact: exactResult,
            preferred:
                preferredResult,
            diagnostics,
        };
    }

    async query(input) {
        const exact =
            await this.exactBackend
                .query(input);
        let semantic = {
            records: [],
            diagnostics: {
                selectedRecordIds: [],
                suppressed: [],
            },
        };
        const diagnostics = {
            backend:
                this.exactBackend.name ||
                'json',
            preferredBackend:
                this.preferredBackend
                    ?.name ||
                'none',
            degraded: false,
            fallback:
                this.exactBackend.name ||
                'json',
            errors: [],
            suppressed: [
                ...(
                    exact.diagnostics
                        ?.suppressed ||
                    []
                ),
            ],
        };
        if (this.preferredBackend) {
            try {
                semantic =
                    await this
                        .preferredBackend
                        .query(input);
                diagnostics.backend =
                    this.preferredBackend
                        .name;
                diagnostics.suppressed
                    .push(
                        ...(
                            semantic
                                .diagnostics
                                ?.suppressed ||
                            []
                        ),
                    );
            } catch (error) {
                diagnostics.degraded =
                    true;
                diagnostics.errors.push(
                    String(
                        error?.message ||
                        error,
                    ).slice(0, 1_000),
                );
            }
        }
        const merged =
            mergeRecords(
                exact.records || [],
                semantic.records || [],
                input.limit,
            );
        const hydrated =
            hydrateKnowledgeRecords(
                merged,
                input.filters,
            );
        diagnostics.suppressed.push(
            ...hydrated
                .diagnostics
                .suppressed,
        );
        diagnostics.selectedRecordIds =
            hydrated.records
                .map(record =>
                    record.recordId);
        diagnostics.sourcePaths =
            hydrated.records
                .map(record => ({
                    recordId:
                        record.recordId,
                    sourceRefs:
                        record.sourceRefs,
                }));
        return {
            records:
                hydrated.records,
            diagnostics,
        };
    }

    async delete(input) {
        const exact =
            await this.exactBackend
                .delete(input);
        const diagnostics = {
            backend:
                this.exactBackend.name ||
                'json',
            degraded: false,
            errors: [],
        };
        let preferred = null;
        if (this.preferredBackend) {
            try {
                preferred =
                    await this
                        .preferredBackend
                        .delete(input);
                diagnostics.backend =
                    this.preferredBackend
                        .name;
            } catch (error) {
                diagnostics.degraded =
                    true;
                diagnostics.errors.push(
                    String(
                        error?.message ||
                        error,
                    ).slice(0, 1_000),
                );
            }
        }
        return {
            exact,
            preferred,
            diagnostics,
        };
    }

    async rebuild(input) {
        const records =
            validateProjectionBatch(
                input,
            );
        const exact =
            await this.exactBackend
                .rebuild({
                    ...input,
                    records,
                });
        const diagnostics = {
            backend:
                this.exactBackend.name ||
                'json',
            degraded: false,
            indexRebuilt: true,
            knowledgeApiContractVersion:
                exact
                    .knowledgeApiContractVersion,
            indexFormatVersion:
                exact
                    .indexFormatVersion,
            projectorVersion:
                exact
                    .projectorVersion,
            projectionFingerprint:
                exact
                    .projectionFingerprint,
            stateRevision:
                exact.stateRevision,
            errors: [],
        };
        let preferred = null;
        if (this.preferredBackend) {
            try {
                preferred =
                    await this
                        .preferredBackend
                        .rebuild({
                            ...input,
                            records,
                        });
                diagnostics.backend =
                    this.preferredBackend
                        .name;
            } catch (error) {
                diagnostics.degraded =
                    true;
                diagnostics.errors.push(
                    String(
                        error?.message ||
                        error,
                    ).slice(0, 1_000),
                );
            }
        }
        return {
            exact,
            preferred,
            diagnostics,
        };
    }
}

export function createKnowledgeVectorService(
    options,
) {
    return new KnowledgeVectorService(
        options,
    );
}
