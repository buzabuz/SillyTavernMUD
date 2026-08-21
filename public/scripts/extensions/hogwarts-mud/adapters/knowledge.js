export function createKnowledgeAdapter(ports) {
    const {
        getContext,
        getMudState,
        recordTurnDiagnostic =
        () => {},
        retrieveKnowledge,
        syncKnowledgeBase,
    } = ports;

    function projectSourceRefs(
        sourceRefs,
    ) {
        return (
            Array.isArray(sourceRefs)
                ? sourceRefs
                : []
        )
            .slice(0, 16)
            .map(reference => ({
                type:
                    String(
                        reference?.type ||
                        '',
                    ).slice(0, 64),
                id:
                    String(
                        reference?.id ||
                        '',
                    ).slice(0, 128),
            }))
            .filter(reference =>
                reference.type &&
                reference.id);
    }

    function getActivationCapsuleIds(
        activationCapsules,
    ) {
        return {
            common:
                String(
                    activationCapsules
                        ?.common
                        ?.capsuleId ||
                    '',
                ),
            byActorId:
                Object.fromEntries(
                    Object.entries(
                        activationCapsules
                            ?.byActorId ||
                        {},
                    )
                        .slice(0, 32)
                        .map(
                            ([
                                actorId,
                                capsule,
                            ]) => [
                                actorId,
                                String(
                                    capsule
                                        ?.capsuleId ||
                                    '',
                                ),
                            ],
                        )
                        .filter(([, id]) =>
                            id),
                ),
        };
    }

    function projectRetrievalDiagnostics(
        result,
        records,
    ) {
        const diagnostics =
            result?.diagnostics ||
            {};
        const sourcePaths =
            (
                diagnostics.sourcePaths ||
                []
            )
                .slice(0, 32)
                .map(path => ({
                    recordId:
                        String(
                            path?.recordId ||
                            '',
                        ),
                    hop:
                        Math.max(
                            0,
                            Number(
                                path?.hop,
                            ) || 0,
                        ),
                    sourceRefs:
                        projectSourceRefs(
                            path
                                ?.sourceRefs,
                        ),
                }));
        const sourcePathByRecordId =
            new Map(
                sourcePaths.map(path => [
                    path.recordId,
                    path,
                ]),
            );
        return {
            plannerSubqueries:
                (
                    diagnostics
                        .plannerSubqueries ||
                    []
                )
                    .slice(0, 4)
                    .map(subquery => ({
                        id:
                            String(
                                subquery?.id ||
                                '',
                            ),
                        intent:
                            String(
                                subquery
                                    ?.intent ||
                                '',
                            ),
                        nodeTypes:
                            (
                                subquery
                                    ?.nodeTypes ||
                                []
                            )
                                .slice(0, 8)
                                .map(String),
                    })),
            backend:
                (
                    Array.isArray(
                        diagnostics.backend,
                    )
                        ? diagnostics.backend
                        : diagnostics.backend
                            ? [{
                                backend:
                                    diagnostics
                                        .backend,
                                degraded:
                                    diagnostics
                                        .degraded ===
                                    true,
                            }]
                            : []
                )
                    .slice(0, 8)
                    .map(item => ({
                        subqueryId:
                            String(
                                item
                                    ?.subqueryId ||
                                '',
                            ),
                        backend:
                            String(
                                item?.backend ||
                                '',
                            ),
                        degraded:
                            item?.degraded ===
                            true,
                        fallback:
                            String(
                                item
                                    ?.fallback ||
                                '',
                            ),
                    })),
            degraded:
                diagnostics.degraded ===
                true,
            selectedRecords:
                records
                    .slice(0, 32)
                    .map(record => {
                        const recordId =
                            String(
                                record
                                    ?.recordId ||
                                record?.id ||
                                '',
                            );
                        return {
                            recordId,
                            sourceRefs:
                                projectSourceRefs(
                                    sourcePathByRecordId
                                        .get(
                                            recordId,
                                        )
                                        ?.sourceRefs ||
                                    record
                                        ?.sourceRefs,
                                ),
                        };
                    }),
            sourcePaths,
            suppressedConflicts:
                [
                    ...(
                        diagnostics
                            .hydrationSuppressed ||
                        []
                    ),
                    ...(
                        Array.isArray(
                            diagnostics.backend,
                        )
                            ? diagnostics
                                .backend
                                .flatMap(item =>
                                    item
                                        ?.suppressed ||
                                    [])
                            : []
                    ),
                ]
                    .slice(0, 32)
                    .map(entry => ({
                        recordId:
                            String(
                                entry
                                    ?.recordId ||
                                '',
                            ),
                        reason:
                            String(
                                entry
                                    ?.reason ||
                                '',
                            ).slice(0, 256),
                        sourceRefs:
                            projectSourceRefs(
                                entry
                                    ?.sourceRefs,
                            ),
                    })),
            activationCapsuleIds:
                getActivationCapsuleIds(
                    result
                        ?.activationCapsules,
                ),
            localCallCounts: {
                planner:
                    Math.max(
                        0,
                        Number(
                            diagnostics
                                ?.callCounts
                                ?.localPlanner,
                        ) || 0,
                    ),
            },
            selectedRecordIds:
                records
                    .slice(0, 32)
                    .map(record =>
                        String(
                            record
                                ?.recordId ||
                            record?.id ||
                            '',
                        ))
                    .filter(Boolean),
        };
    }

    async function syncLocalKnowledge() {
        const context = getContext();
        const state = getMudState();
        if (!state?.character?.confirmed) return;
        try {
            const previousError =
                String(
                    state.knowledgeBase
                        ?.lastError ||
                    '',
                );
            const result =
                await syncKnowledgeBase(
                    context,
                    state,
                );
            state.knowledgeBase.lastError = '';
            if (
                result?.skipped ===
                    true &&
                result.metadataChanged !==
                    true &&
                !previousError
            ) {
                return result;
            }
            // #region debug-point A:knowledge-metadata-save
            const debugTraceId =
                `knowledge-metadata-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const debugStartedAt =
                performance.now();
            globalThis.__hogwartsChatSaveTailDebug = {
                traceId: debugTraceId,
                source: 'knowledge_metadata',
                startedAt: debugStartedAt,
            };
            void fetch('http://127.0.0.1:7778/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'chat-save-tail-latency', runId: 'pre-fix', hypothesisId: 'A', location: 'adapters/knowledge.js:syncLocalKnowledge', msg: '[DEBUG] Knowledge endpoint returned; metadata save starts', data: { skipped: result?.skipped === true, metadataChanged: result?.metadataChanged === true, recordCount: Number(result?.recordCount || 0) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            await context.saveMetadata();
            // #region debug-point A:knowledge-metadata-save
            void fetch('http://127.0.0.1:7778/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'chat-save-tail-latency', runId: 'pre-fix', hypothesisId: 'A', location: 'adapters/knowledge.js:syncLocalKnowledge', msg: '[DEBUG] Knowledge metadata save completed', data: { elapsedMs: Math.round(performance.now() - debugStartedAt) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            if (globalThis.__hogwartsChatSaveTailDebug?.traceId === debugTraceId) delete globalThis.__hogwartsChatSaveTailDebug;
            // #endregion
            return result;
        } catch (error) {
            state.knowledgeBase ??= {};
            state.knowledgeBase.lastError = String(error?.message || error);
            console.error('[Hogwarts MUD] Local knowledge sync failed', error);
            await context.saveMetadata();
            throw error;
        }
    }

    async function retrieveLocalKnowledge(query, entityIds = [], options = {}) {
        const context = getContext();
        const state = getMudState();
        if (!state?.character?.confirmed) return [];
        try {
            const {
                limit = 6,
                ...retrieveOptions
            } = options;
            const result =
                await retrieveKnowledge(
                    context,
                    state,
                    query,
                    entityIds,
                    Math.max(
                        1,
                        Number(limit) || 6,
                    ),
                    retrieveOptions,
                );
            const sourceRecords =
                Array.isArray(result)
                    ? result
                    : Array.isArray(
                        result?.records,
                    )
                        ? result.records
                        : [];
            const records =
                sourceRecords.map(record => {
                    const superseded =
                        record.evidenceStatus ===
                            'SUPERSEDED' ||
                        record.tags?.includes(
                            'superseded',
                        );
                    return {
                        ...record,
                        evidenceType:
                            'HISTORICAL_EVIDENCE',
                        evidenceStatus:
                            superseded
                                ? 'SUPERSEDED'
                                : 'HISTORICAL',
                    };
                });
            const diagnostics =
                projectRetrievalDiagnostics(
                    result,
                    records,
                );
            records.activationCapsules =
                result
                    ?.activationCapsules;
            records
                .retainedEventIdsByActorId =
                structuredClone(
                    options
                        .retainedEventIdsByActorId ||
                    {},
                );
            records.diagnostics =
                diagnostics;
            recordTurnDiagnostic(
                'knowledge_retrieval',
                diagnostics,
            );
            if (
                diagnostics
                    .localCallCounts
                    .planner >
                0
            ) {
                recordTurnDiagnostic(
                    'local_call',
                    {
                        operation:
                            'planner',
                        count:
                            diagnostics
                                .localCallCounts
                                .planner,
                    },
                );
            }
            return records;
        } catch (error) {
            console.warn('[Hogwarts MUD] Local knowledge retrieval failed', error);
            recordTurnDiagnostic(
                'knowledge_retrieval_failure',
                {
                    code:
                        String(
                            error?.code ||
                            'KNOWLEDGE_RETRIEVAL_FAILED',
                        ),
                    error:
                        String(
                            error?.message ||
                            error,
                        ).slice(0, 1_000),
                    willRetry: false,
                },
            );
            throw error;
        }
    }

    return {
        syncLocalKnowledge,
        retrieveLocalKnowledge,
    };
}
