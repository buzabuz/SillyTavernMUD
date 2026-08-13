import express from 'express';

import {
    KNOWLEDGE_CATEGORIES,
    KNOWLEDGE_NODE_TYPES,
} from '../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    createConfiguredKnowledgeService,
} from '../hogwarts-mud/knowledge-backend-factory.js';
import {
    StaleKnowledgeRevisionError,
} from '../hogwarts-mud/knowledge-vector-backend.js';
import {
    adjudicateTurn,
    getLocalSemanticStatus,
    observeTurn,
    translateText,
} from '../hogwarts-mud/local-semantic-adjudicator.js';
import {
    proposeTurnAppraisals,
} from '../hogwarts-mud/local-appraisal-proposer.js';
import {
    runSocialDirectorGraph,
    validateCommittedEventWitnessInput,
} from '../hogwarts-mud/social-director-graph.js';
import { runTurnSettlementGraph } from '../hogwarts-mud/turn-settlement-graph.js';
import { clientRelativePath } from '../util.js';

export const router = express.Router();

const KNOWLEDGE_CATEGORY_SET =
    new Set(KNOWLEDGE_CATEGORIES);
const KNOWLEDGE_NODE_TYPE_SET =
    new Set(KNOWLEDGE_NODE_TYPES);
const MAX_RECORDS_PER_SYNC = 2_000;
const MAX_KNOWLEDGE_BODY_LENGTH =
    8_000_000;

function getKnowledgeService(request) {
    return createConfiguredKnowledgeService({
        filesRoot:
            request.user
                .directories.files,
    });
}

function isRevision(value) {
    return Number.isSafeInteger(
        Number(value),
    ) &&
        Number(value) >= 0;
}

function validateKnowledgeEnvelope(
    body,
    {
        requireRecords = false,
    } = {},
) {
    const records =
        Array.isArray(body?.records)
            ? body.records
            : [];
    return Boolean(
        body &&
        typeof body === 'object' &&
        !Array.isArray(body) &&
        String(
            body.timelineId ||
            '',
        ).trim() &&
        String(
            body.timelineEpoch ||
            '',
        ).trim() &&
        isRevision(
            body.stateRevision,
        ) &&
        (
            !requireRecords ||
            Array.isArray(body.records)
        ) &&
        records.length <=
            MAX_RECORDS_PER_SYNC &&
        JSON.stringify(body).length <=
            MAX_KNOWLEDGE_BODY_LENGTH,
    );
}

function buildKnowledgeFilters(body) {
    const categories =
        Array.isArray(body.categories)
            ? body.categories
                .filter(category =>
                    KNOWLEDGE_CATEGORY_SET
                        .has(category))
            : [
                ...KNOWLEDGE_CATEGORIES,
            ];
    const nodeTypes =
        Array.isArray(body.nodeTypes)
            ? body.nodeTypes
                .filter(nodeType =>
                    KNOWLEDGE_NODE_TYPE_SET
                        .has(nodeType))
            : [];
    const actorIds =
        Array.isArray(
            body.audience?.actorIds,
        )
            ? body.audience
                .actorIds
                .slice(0, 64)
                .map(actorId =>
                    String(actorId))
            : [];
    const role =
        ['player', 'actor', 'author']
            .includes(
                body.audience?.role,
            )
            ? body.audience.role
            : 'player';
    return {
        timelineEpoch:
            String(
                body.timelineEpoch,
            ),
        stateRevision:
            Number(
                body.stateRevision,
            ),
        audience: {
            actorIds,
            role,
            includeLocked:
                Boolean(
                    body.audience
                        ?.includeLocked,
                ),
        },
        clock:
            String(
                body.clock ||
                '',
            ).slice(0, 100),
        nodeTypes,
        categories,
        supersededSourceRefs:
            Array.isArray(
                body
                    .supersededSourceRefs,
            )
                ? body
                    .supersededSourceRefs
                    .slice(0, 500)
                : [],
    };
}

function projectKnowledgeSourceRefs(
    sourceRefs,
) {
    return (
        Array.isArray(sourceRefs)
            ? sourceRefs
            : []
    )
        .slice(0, 32)
        .map(sourceRef => ({
            type:
                String(
                    sourceRef?.type ||
                    '',
                ).slice(0, 64),
            id:
                String(
                    sourceRef?.id ||
                    '',
                ).slice(0, 128),
        }))
        .filter(sourceRef =>
            sourceRef.type &&
            sourceRef.id);
}

function projectKnowledgeSearchResult(
    result,
) {
    const diagnostics =
        result?.diagnostics || {};
    const backendQueries =
        (
            diagnostics
                .backendQueries ||
            (
                Array.isArray(
                    diagnostics.backend,
                )
                    ? diagnostics.backend
                    : []
            )
        )
            .slice(0, 8)
            .map(entry => ({
                subqueryId:
                    String(
                        entry
                            ?.subqueryId ||
                        '',
                    ),
                backend:
                    String(
                        entry?.backend ||
                        '',
                    ),
                preferredBackend:
                    String(
                        entry
                            ?.preferredBackend ||
                        '',
                    ),
                degraded:
                    entry?.degraded ===
                    true,
                fallback:
                    String(
                        entry?.fallback ||
                        '',
                    ),
            }));
    const records =
        (
            diagnostics.records ||
            diagnostics.sourcePaths ||
            []
        )
            .slice(0, 64)
            .map(entry => ({
                recordId:
                    String(
                        entry?.recordId ||
                        '',
                    ),
                hop:
                    Math.min(
                        2,
                        Math.max(
                            0,
                            Number(
                                entry?.hop,
                            ) || 0,
                        ),
                    ),
                sourceRefs:
                    projectKnowledgeSourceRefs(
                        entry?.sourceRefs,
                    ),
            }))
            .filter(entry =>
                entry.recordId);
    const suppression =
        (
            diagnostics.suppression ||
            diagnostics.suppressed ||
            diagnostics
                .hydrationSuppressed ||
            []
        )
            .slice(0, 128)
            .map(entry => ({
                recordId:
                    String(
                        entry?.recordId ||
                        '',
                    ),
                reason:
                    String(
                        entry?.reason ||
                        '',
                    ).slice(0, 128),
            }))
            .filter(entry =>
                entry.recordId &&
                entry.reason);
    const plannerSubqueries =
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
                        subquery?.intent ||
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
            }));
    const backend =
        String(
            Array.isArray(
                diagnostics.backend,
            )
                ? backendQueries[0]
                    ?.backend ||
                    'unknown'
                : diagnostics.backend ||
                    'unknown',
        );
    const preferredBackend =
        String(
            diagnostics
                .preferredBackend ||
            backendQueries.find(entry =>
                entry.preferredBackend)
                ?.preferredBackend ||
            'none',
        );
    return {
        records:
            Array.isArray(
                result?.records,
            )
                ? result.records
                : [],
        activationCapsules:
            result
                ?.activationCapsules,
        diagnostics: {
            planner: {
                source:
                    String(
                        result?.plan
                            ?.source ||
                        diagnostics
                            ?.planner
                            ?.planner ||
                        'deterministic',
                    ),
                fallback:
                    String(
                        diagnostics
                            ?.planner
                            ?.fallback ||
                        '',
                    ),
            },
            plannerSubqueries,
            backend,
            preferredBackend,
            backendQueries,
            degraded:
                diagnostics.degraded ===
                true,
            records,
            sourcePaths: records,
            selectedRecordIds:
                records.map(entry =>
                    entry.recordId),
            suppression,
            suppressed: suppression,
            hydrationSuppressed:
                suppression,
            graph: {
                recordCount:
                    Math.max(
                        0,
                        Number(
                            diagnostics
                                ?.graph
                                ?.recordCount,
                        ) || 0,
                    ),
                edgeCount:
                    Math.max(
                        0,
                        Number(
                            diagnostics
                                ?.graph
                                ?.edgeCount,
                        ) || 0,
                    ),
                maximumHops: 2,
                fallback:
                    String(
                        diagnostics
                            ?.graph
                            ?.fallback ||
                        '',
                    ),
            },
        },
    };
}

function sendKnowledgeError(
    response,
    error,
    operation,
) {
    if (
        error instanceof
            StaleKnowledgeRevisionError ||
        error?.code ===
            'STALE_KNOWLEDGE_REVISION'
    ) {
        return response
            .status(409)
            .json({
                error:
                    'stale_revision',
                currentRevision:
                    error.currentRevision,
                receivedRevision:
                    error.receivedRevision,
            });
    }
    if (
        error instanceof TypeError
    ) {
        return response
            .status(400)
            .json({
                error:
                    String(
                        error.message,
                    ).slice(0, 1_000),
            });
    }
    console.error(
        `[Hogwarts MUD] Knowledge ${operation} failed`,
        error,
    );
    return response
        .status(500)
        .json({
            error:
                'knowledge_operation_failed',
        });
}

router.post(
    '/knowledge/health',
    async (request, response) => {
        try {
            if (
                !request.body
                    ?.timelineId
            ) {
                return response
                    .sendStatus(400);
            }
            const result =
                await getKnowledgeService(
                    request,
                ).health({
                    timelineId:
                        String(
                            request.body
                                .timelineId,
                        ),
                });
            return response.json(
                result,
            );
        } catch (error) {
            return sendKnowledgeError(
                response,
                error,
                'health',
            );
        }
    },
);

router.post(
    '/knowledge/sync',
    async (request, response) => {
        if (
            !validateKnowledgeEnvelope(
                request.body,
                {
                    requireRecords:
                        true,
                },
            )
        ) {
            return response
                .sendStatus(400);
        }
        try {
            const input = {
                timelineId:
                    String(
                        request.body
                            .timelineId,
                    ),
                timelineEpoch:
                    String(
                        request.body
                            .timelineEpoch,
                    ),
                stateRevision:
                    Number(
                        request.body
                            .stateRevision,
                    ),
                records:
                    request.body
                        .records,
                replace:
                    request.body
                        .replace === true,
            };
            const result =
                await getKnowledgeService(
                    request,
                ).sync(input);
            return response.json({
                root:
                    clientRelativePath(
                        request.user
                            .directories
                            .root,
                        result.exact
                            .root,
                    ),
                records:
                    result.exact
                        .records,
                removed:
                    result.exact
                        .removed ||
                    [],
                diagnostics:
                    result
                        .diagnostics,
            });
        } catch (error) {
            return sendKnowledgeError(
                response,
                error,
                'sync',
            );
        }
    },
);

router.post(
    '/knowledge/rebuild',
    async (request, response) => {
        if (
            !validateKnowledgeEnvelope(
                request.body,
                {
                    requireRecords:
                        true,
                },
            )
        ) {
            return response
                .sendStatus(400);
        }
        try {
            const result =
                await getKnowledgeService(
                    request,
                ).rebuild({
                    timelineId:
                        String(
                            request.body
                                .timelineId,
                        ),
                    timelineEpoch:
                        String(
                            request.body
                                .timelineEpoch,
                        ),
                    stateRevision:
                        Number(
                            request.body
                                .stateRevision,
                        ),
                    records:
                        request.body
                            .records,
                    replace: true,
                });
            return response.json({
                rebuilt: true,
                records:
                    result.exact
                        .records,
                diagnostics:
                    result
                        .diagnostics,
            });
        } catch (error) {
            return sendKnowledgeError(
                response,
                error,
                'rebuild',
            );
        }
    },
);

router.post(
    '/knowledge/delete',
    async (request, response) => {
        if (
            !validateKnowledgeEnvelope(
                request.body,
            ) ||
            !Array.isArray(
                request.body
                    .recordIds,
            ) ||
            request.body.recordIds
                .length > 2_000
        ) {
            return response
                .sendStatus(400);
        }
        try {
            const result =
                await getKnowledgeService(
                    request,
                ).delete({
                    timelineId:
                        String(
                            request.body
                                .timelineId,
                        ),
                    timelineEpoch:
                        String(
                            request.body
                                .timelineEpoch,
                        ),
                    stateRevision:
                        Number(
                            request.body
                                .stateRevision,
                        ),
                    recordIds:
                        request.body
                            .recordIds,
                });
            return response.json(
                result,
            );
        } catch (error) {
            return sendKnowledgeError(
                response,
                error,
                'delete',
            );
        }
    },
);

async function searchKnowledge(
    request,
    response,
    listOnly,
) {
    if (
        !validateKnowledgeEnvelope(
            request.body,
        )
    ) {
        return response
            .sendStatus(400);
    }
    try {
        const service =
            getKnowledgeService(
                request,
            );
        const filters =
            buildKnowledgeFilters(
                request.body,
            );
        const input = {
            timelineId:
                String(
                    request.body
                        .timelineId,
                ),
            query: listOnly
                ? ''
                : String(
                    request.body
                        .query ||
                    '',
                ).slice(0, 12_000),
            entityIds:
                listOnly ||
                !Array.isArray(
                    request.body
                        .entityIds,
                )
                    ? []
                    : request.body
                        .entityIds
                        .slice(0, 64),
            limit: Math.min(
                listOnly
                    ? 2_000
                    : 50,
                Math.max(
                    1,
                    Number(
                        request.body
                            .limit,
                    ) ||
                    (listOnly
                        ? 2_000
                        : 8),
                ),
            ),
            filters,
            ...(
                listOnly
                    ? {}
                    : {
                        ...filters,
                        actorIds:
                            filters
                                .audience
                                .actorIds,
                    }
            ),
        };
        const result = listOnly
            ? await service
                .exactBackend
                .query(input)
            : await service
                .query(input);
        return response.json(
            listOnly
                ? result
                : projectKnowledgeSearchResult(
                    result,
                ),
        );
    } catch (error) {
        return sendKnowledgeError(
            response,
            error,
            listOnly
                ? 'list'
                : 'search',
        );
    }
}

router.post(
    '/knowledge/list',
    (request, response) =>
        searchKnowledge(
            request,
            response,
            true,
        ),
);

router.post(
    '/knowledge/search',
    (request, response) =>
        searchKnowledge(
            request,
            response,
            false,
        ),
);

router.post('/social/resolve', async (request, response) => {
    try {
        const input = request.body;
        const messageSceneIds =
            input?.messageSceneIds;
        const witnessesByMessage =
            input
                ?.witnessActorIdsByMessageId;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !Array.isArray(input.actorIds) ||
            input.actorIds.length > 64 ||
            !Array.isArray(input.allowedMessageIds) ||
            input.allowedMessageIds.length > 200 ||
            input.allowedMessageIds.some(id =>
                !Number.isInteger(
                    Number(id),
                )) ||
            !Array.isArray(
                input.eventKnowledge,
            ) ||
            input.eventKnowledge.length > 200 ||
            (
                (
                    !messageSceneIds ||
                    typeof messageSceneIds !==
                        'object' ||
                    Array.isArray(
                        messageSceneIds,
                    ) ||
                    Object.keys(
                        messageSceneIds,
                    ).length > 200 ||
                    input.allowedMessageIds
                        .some(id =>
                            !Object.hasOwn(
                                messageSceneIds,
                                id,
                            ) ||
                            !String(
                                messageSceneIds[
                                    id
                                ] ||
                                '',
                            ).trim())
                )
            ) ||
            (
                (
                    !witnessesByMessage ||
                    typeof witnessesByMessage !==
                        'object' ||
                    Array.isArray(
                        witnessesByMessage,
                    ) ||
                    Object.keys(
                        witnessesByMessage,
                    ).length > 200 ||
                    Object.values(
                        witnessesByMessage,
                    ).some(value =>
                        !Array.isArray(value) ||
                        value.length > 65) ||
                    input.allowedMessageIds
                        .some(id =>
                            !Object.hasOwn(
                                witnessesByMessage,
                                id,
                            ))
                )
            ) ||
            !input.existingGraph ||
            typeof input.existingGraph !==
                'object' ||
            Array.isArray(
                input.existingGraph,
            ) ||
            Number(
                input.existingGraph
                    .version,
            ) !== 2 ||
            !input.extraction ||
            typeof input.extraction !==
                'object' ||
            Array.isArray(
                input.extraction,
            ) ||
            !Array.isArray(
                input.extraction
                    .statements,
            ) ||
            input.extraction
                .statements.length > 100 ||
            !Array.isArray(
                input.extraction
                    .relationshipEvidence,
            ) ||
            input.extraction
                .relationshipEvidence
                .length > 200 ||
            input.extraction
                .relationshipEvidence
                .some(evidence =>
                    !evidence ||
                    typeof evidence !==
                        'object' ||
                    (
                        Array.isArray(
                            evidence
                                .dimensionDeltas,
                        ) &&
                        evidence
                            .dimensionDeltas
                            .length > 20
                    ) ||
                    (
                        Array.isArray(
                            evidence
                                .emotionAppraisals,
                        ) &&
                        evidence
                            .emotionAppraisals
                            .length > 12
                    ) ||
                    (
                        Array.isArray(
                            evidence
                                .structuralTags,
                        ) &&
                        evidence
                            .structuralTags
                            .length > 20
                    )) ||
            !Array.isArray(
                input.extraction.reviews,
            ) ||
            input.extraction
                .reviews.length > 16 ||
            (
                input.extraction
                    .schemaOperations !==
                    undefined &&
                (
                    !Array.isArray(
                        input.extraction
                            .schemaOperations,
                    ) ||
                    input.extraction
                        .schemaOperations
                        .length > 32 ||
                    input.extraction
                        .schemaOperations
                        .some(operation =>
                            !operation ||
                            typeof operation !==
                                'object' ||
                            Array.isArray(
                                operation,
                            ))
                )
            ) ||
            JSON.stringify(input)
                .length > 500_000
        ) {
            return response.sendStatus(400);
        }
        const committedWitnessValidation =
            validateCommittedEventWitnessInput(
                input,
            );
        if (
            !committedWitnessValidation
                .valid
        ) {
            return response.sendStatus(400);
        }
        input.messageSceneIds =
            committedWitnessValidation
                .messageSceneIds;
        input
            .witnessActorIdsByMessageId =
            committedWitnessValidation
                .witnessActorIdsByMessageId;
        input.extraction
            .schemaOperations =
            Array.isArray(
                input.extraction
                    .schemaOperations,
            )
                ? input.extraction
                    .schemaOperations
                : [];
        const result = await runSocialDirectorGraph(input);
        return response.json(result);
    } catch (error) {
        console.error('[Hogwarts MUD] Social director graph failed', error);
        return response.sendStatus(500);
    }
});

router.get('/local/status', async (_request, response) => {
    return response.json(
        await getLocalSemanticStatus(),
    );
});

router.post('/local/adjudicate', async (request, response) => {
    try {
        const input =
            request.body?.input;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !Array.isArray(
                input.playerTurnSequence,
            ) ||
            input.playerTurnSequence
                .length > 32 ||
            JSON.stringify(input)
                .length > 100_000
        ) {
            return response
                .sendStatus(400);
        }
        return response.json(
            await adjudicateTurn(
                input,
            ),
        );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local pre-turn adjudication unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/local/translate', async (request, response) => {
    try {
        const text =
            String(
                request.body?.text ||
                '',
            );
        if (
            !text.trim() ||
            text.length > 12_000 ||
            (
                request.body
                    ?.glossary !==
                    undefined &&
                (
                    !Array.isArray(
                        request.body
                            .glossary,
                    ) ||
                    request.body
                        .glossary
                        .length > 96
                )
            )
        ) {
            return response
                .sendStatus(400);
        }
        const result =
            await translateText(
                text,
                {
                    unload:
                        request.body
                            ?.unload !==
                        false,
                    glossary:
                        request.body
                            ?.glossary ||
                        [],
                },
            );
        return response
            .type('text/plain')
            .send(
                result.translation,
            );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local translation unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/local/observe', async (request, response) => {
    try {
        const input =
            request.body?.input;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !Array.isArray(
                input.narrativeSegments,
            ) ||
            input.narrativeSegments
                .length > 24 ||
            JSON.stringify(input)
                .length > 150_000
        ) {
            return response
                .sendStatus(400);
        }
        return response.json(
            await observeTurn(
                input,
            ),
        );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local post-turn observation unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/local/appraise', async (request, response) => {
    try {
        const input =
            request.body?.input;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !input.event ||
            !Array.isArray(
                input.observers,
            ) ||
            input.observers.length > 64 ||
            JSON.stringify(input)
                .length > 100_000
        ) {
            return response
                .sendStatus(400);
        }
        return response.json(
            await proposeTurnAppraisals(
                input,
            ),
        );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local Appraisal proposal unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/turn/settle', async (request, response) => {
    try {
        const input = request.body;
        const payload = input?.payload;
        if (
            !input ||
            typeof input !== 'object' ||
            !input.worldState ||
            typeof input.worldState !==
                'object' ||
            !payload ||
            typeof payload !==
                'object' ||
            Array.isArray(payload) ||
            (
                payload.segments !==
                    undefined &&
                (
                    !Array.isArray(
                        payload.segments,
                    ) ||
                    payload.segments
                        .length > 24
                )
            ) ||
            (
                payload.stateProposals !==
                    undefined &&
                (
                    !Array.isArray(
                        payload
                            .stateProposals,
                    ) ||
                    payload
                        .stateProposals
                        .length > 24
                )
            ) ||
            (
                input.admittedActors !==
                    undefined &&
                (
                    !Array.isArray(
                        input
                            .admittedActors,
                    ) ||
                    input
                        .admittedActors
                        .length > 4
                )
            )
        ) {
            return response
                .sendStatus(400);
        }
        const performance =
            await runTurnSettlementGraph(
                input,
            );
        return response.json({
            performance,
        });
    } catch (error) {
        console.error(
            '[Hogwarts MUD] Turn settlement graph failed',
            error,
        );
        return response.sendStatus(500);
    }
});
