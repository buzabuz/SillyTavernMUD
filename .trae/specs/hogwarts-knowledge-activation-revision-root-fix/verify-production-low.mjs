#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    stat,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

import {
    CONTEXT_SIZE_PRESETS,
    DEFAULT_MODEL_SLOTS,
    createContextBudgetPlan,
} from '../../../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    parseCompleteJsonObject,
    recoverScenePerformancePayload,
} from '../../../public/scripts/extensions/hogwarts-mud/core/json-recovery.js';
import {
    buildStructuredPlayerTurnSequence,
    removeExplicitAddressDirective,
    resolvePlayerAddressing,
    resolveTemporaryActorRevealedName,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import {
    buildActorMemoryKnowledgeSeeds,
    filterKnowledgeForAudience,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    CANON_CAST_IDENTITY_CONTRACT,
    CANON_WIT_TONE_CONTRACT,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    KNOWLEDGE_API_CONTRACT_VERSION,
    KNOWLEDGE_CATEGORIES,
    hydrateCanonicalKnowledgeCandidates,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    LOW_TIER_CONTEXT_KEYS,
    LOW_TIER_CONTEXT_MAX_BYTES,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/low-tier-context-v1.js';
import {
    NPC_IDENTITY_PROMPT_BOUNDARY,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    buildTemporaryActorPromotionPolicy,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import {
    buildSpatialContext,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    getAuthoritativeSceneSpells,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import {
    buildBehavioralEnvironment,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import {
    settleNarrativeTurnPerformance,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';
import {
    createTurnPerformanceBudget,
    getDeterministicTimePolicy,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import {
    validateScenePerformance,
    validateTurnTransaction,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import {
    parseItemOperationDirectives,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import {
    projectPeoplePanel,
} from '../../../public/scripts/extensions/hogwarts-mud/people-projection.js';
import {
    removeSpellCastDirectives,
} from '../../../public/scripts/extensions/hogwarts-mud/spell-catalog.js';
import {
    createTurnPerformanceWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    DEFAULT_ARCHIVE,
    buildAuthoritativeKnowledgeProjection,
    loadAuthoritativeArchive,
} from '../../../scripts/sync-hogwarts-knowledge-qdrant.mjs';

const PROJECT_ROOT =
    path.resolve(
        path.dirname(
            fileURLToPath(
                import.meta.url,
            ),
        ),
        '../../..',
    );
const DEFAULT_BASE_URL =
    'http://127.0.0.1:8000';
const DEFAULT_PROMPT_OUT =
    '/tmp/hogwarts-knowledge-root-fix-low-prompt.json';
const SYSTEM_PROMPT_MAX_CHARACTERS =
    27_221;
const PRODUCT_PROMPT_MAX_CHARACTERS =
    80_000;
const encoder = new TextEncoder();

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function parseArguments(argv) {
    const args = {
        mode: 'capture',
        archive: DEFAULT_ARCHIVE,
        baseUrl: DEFAULT_BASE_URL,
        promptOut: DEFAULT_PROMPT_OUT,
        response: '',
    };
    const values = [...argv];
    if (
        values[0] === 'capture' ||
        values[0] === 'validate'
    ) {
        args.mode = values.shift();
    }
    while (values.length) {
        const flag = values.shift();
        const value = values.shift();
        if (!value) {
            throw new Error(
                `Missing value for ${flag}.`,
            );
        }
        if (flag === '--archive') {
            args.archive =
                path.resolve(value);
        } else if (flag === '--base-url') {
            args.baseUrl =
                value.replace(/\/+$/u, '');
        } else if (flag === '--prompt-out') {
            args.promptOut =
                path.resolve(value);
        } else if (flag === '--response') {
            args.response =
                path.resolve(value);
        } else {
            throw new Error(
                `Unknown argument ${flag}.`,
            );
        }
    }
    if (
        args.mode === 'validate' &&
        !args.response
    ) {
        throw new Error(
            'validate requires --response.',
        );
    }
    return args;
}

function getSetCookies(response) {
    if (
        typeof response.headers
            .getSetCookie ===
        'function'
    ) {
        return response.headers
            .getSetCookie();
    }
    const value =
        response.headers.get(
            'set-cookie',
        );
    return value
        ? value.split(
            /,(?=\s*[^;,=\s]+=[^;,]+)/u,
        )
        : [];
}

async function createApiClient(
    baseUrl,
) {
    const csrfResponse =
        await fetch(
            `${baseUrl}/csrf-token`,
        );
    if (!csrfResponse.ok) {
        throw new Error(
            `CSRF bootstrap failed with ${csrfResponse.status}.`,
        );
    }
    const csrf =
        await csrfResponse.json();
    const cookie =
        getSetCookies(
            csrfResponse,
        )
            .map(value =>
                value.split(';', 1)[0])
            .join('; ');
    assert.ok(
        csrf.token,
        'CSRF bootstrap returned no token.',
    );
    assert.ok(
        cookie,
        'CSRF bootstrap returned no session cookie.',
    );
    return {
        async request(
            pathname,
            options = {},
        ) {
            const response =
                await fetch(
                    pathname.startsWith(
                        'http',
                    )
                        ? pathname
                        : `${baseUrl}${pathname}`,
                    {
                        ...options,
                        headers: {
                            'Content-Type':
                                'application/json',
                            'X-CSRF-Token':
                                csrf.token,
                            Cookie: cookie,
                            ...(
                                options
                                    .headers ||
                                {}
                            ),
                        },
                    },
                );
            return response;
        },
    };
}

function findVerificationTurn(
    chat,
) {
    const committedAssistant =
        chat.findLast(message =>
            !message.is_user &&
            message.extra
                ?.hogwartsMud
                ?.turnDiagnostics
                ?.status ===
                'committed');
    assert.ok(
        committedAssistant,
        'No committed Tina turn was found.',
    );
    const assistantIndex =
        chat.indexOf(
            committedAssistant,
        );
    const playerMessage =
        chat
            .slice(
                0,
                assistantIndex,
            )
            .findLast(message =>
                message.is_user);
    assert.ok(
        playerMessage?.mes,
        'The committed Tina turn has no player input.',
    );
    return {
        assistantIndex,
        playerMessage,
    };
}

function getActiveAddressingState(
    state,
) {
    const activeIds =
        new Set(
            projectPeoplePanel(
                state,
            ).activePeople.map(
                person =>
                    person.id,
            ),
        );
    return {
        ...state,
        actors:
            (
                state.actors ||
                []
            ).map(actor => ({
                ...actor,
                present:
                    activeIds.has(
                        actor.id,
                    ),
            })),
    };
}

function metric(value) {
    const text =
        typeof value === 'string'
            ? value
            : JSON.stringify(
                value,
            );
    return {
        characters:
            text.length,
        bytes:
            encoder.encode(
                text,
            ).length,
        estimatedTokens:
            Math.ceil(
                text.length / 4,
            ),
    };
}

function extractOutputSchema(
    systemPrompt,
) {
    const marker = '\nSchema:\n';
    const markerIndex =
        systemPrompt.indexOf(
            marker,
        );
    if (markerIndex < 0) {
        return '';
    }
    const start =
        systemPrompt.indexOf(
            '{',
            markerIndex +
                marker.length,
        );
    if (start < 0) {
        return '';
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (
        let index = start;
        index < systemPrompt.length;
        index++
    ) {
        const character =
            systemPrompt[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (
                character === '\\'
            ) {
                escaped = true;
            } else if (
                character === '"'
            ) {
                inString = false;
            }
            continue;
        }
        if (character === '"') {
            inString = true;
        } else if (
            character === '{'
        ) {
            depth++;
        } else if (
            character === '}'
        ) {
            depth--;
            if (depth === 0) {
                return systemPrompt
                    .slice(
                        start,
                        index + 1,
                    );
            }
        }
    }
    return '';
}

function createWorkflowPorts(
    {
        sendModelTaskRequest =
            async () => {
                throw new Error(
                    'Model transport is disabled during capture.',
                );
            },
        diagnostics = [],
    } = {},
) {
    return {
        CANON_CAST_IDENTITY_CONTRACT,
        CANON_WIT_TONE_CONTRACT,
        CONTEXT_SIZE_PRESETS,
        DEFAULT_MODEL_SLOTS,
        NPC_IDENTITY_PROMPT_BOUNDARY,
        beginLiveSceneStream:
            () => {},
        buildBehavioralEnvironment,
        buildSpatialContext,
        buildStructuredPlayerTurnSequence,
        buildTemporaryActorPromotionPolicy,
        createContextBudgetPlan,
        extractRoleResponseText:
            response =>
                response.content,
        getActiveAddressingState,
        getAuthoritativeSceneSpells,
        getRequestHeaders:
            () => ({
                'Content-Type':
                    'application/json',
            }),
        getSettings:
            () => ({
                translationEnabled:
                    false,
            }),
        parseItemOperationDirectives,
        parseJsonObject:
            parseCompleteJsonObject,
        recordTurnDiagnostic:
            (
                type,
                data,
            ) => {
                diagnostics.push({
                    type,
                    data,
                });
            },
        recoverScenePerformancePayload,
        removeExplicitAddressDirective,
        resolvePlayerAddressing,
        resolveTemporaryActorRevealedName,
        sendModelTaskRequest,
        setLiveSceneStreamPhase:
            () => {},
        settleNarrativeTurnPerformance,
        translateOpeningValues:
            async values =>
                values,
        updateLiveSceneStream:
            () => {},
        validateScenePerformance,
    };
}

async function getArchiveMetric(
    archivePath,
) {
    const [
        contents,
        fileStat,
    ] = await Promise.all([
        readFile(archivePath),
        stat(archivePath),
    ]);
    return {
        sha256:
            sha256(contents),
        bytes:
            contents.length,
        mtimeMs:
            fileStat.mtimeMs,
    };
}

async function buildVerification(
    args,
) {
    const archiveBefore =
        await getArchiveMetric(
            args.archive,
        );
    const authority =
        await loadAuthoritativeArchive(
            args.archive,
        );
    const {
        state,
        chat,
    } = authority;
    const {
        assistantIndex,
        playerMessage,
    } = findVerificationTurn(
        chat,
    );
    const rawPlayerAction =
        String(
            playerMessage.mes,
        );
    const narrativePlayerAction =
        removeSpellCastDirectives(
            removeExplicitAddressDirective(
                rawPlayerAction,
            ),
        );
    const addressing =
        playerMessage.extra
            ?.hogwartsMud
            ?.addressing ||
        resolvePlayerAddressing(
            getActiveAddressingState(
                state,
            ),
            rawPlayerAction,
        );
    assert.equal(
        addressing.valid,
        true,
        'Verification addressing is invalid.',
    );
    const actorIds = [
        ...new Set([
            ...(
                state.actors ||
                []
            )
                .filter(actor =>
                    actor.present !==
                        false)
                .map(actor =>
                    actor.id),
            ...(
                addressing.actorIds ||
                []
            ),
        ].filter(Boolean)),
    ];
    const slot =
        state.modelSlots.low;
    const contextPlan =
        createContextBudgetPlan(
            slot.contextSize,
            slot.maxResponseLength,
        );
    const seeds =
        buildActorMemoryKnowledgeSeeds(
            state,
            actorIds,
            contextPlan,
        );
    const canonicalRecords =
        buildAuthoritativeKnowledgeProjection(
            authority,
        );
    const timelineId =
        state.knowledgeBase
            ?.timelineId;
    assert.ok(
        timelineId,
        'Tina State has no Knowledge timelineId.',
    );
    const api =
        await createApiClient(
            args.baseUrl,
        );
    const healthResponse =
        await api.request(
            '/api/hogwarts-mud/knowledge/health',
            {
                method: 'POST',
                body:
                    JSON.stringify({
                        knowledgeApiContractVersion:
                            KNOWLEDGE_API_CONTRACT_VERSION,
                        timelineId,
                    }),
            },
        );
    assert.equal(
        healthResponse.ok,
        true,
        `Knowledge health failed with ${healthResponse.status}.`,
    );
    const health =
        await healthResponse.json();
    assert.equal(
        health
            .knowledgeApiContractVersion,
        KNOWLEDGE_API_CONTRACT_VERSION,
    );
    const filters = {
        timelineEpoch:
            state.timelineEpoch,
        stateRevision:
            state.stateRevision,
        audience: {
            actorIds,
            includeLocked: false,
            role: 'player',
        },
        clock:
            state.clock,
        nodeTypes: [],
        supersededSourceRefs:
            state.authoritySnapshot
                ?.supersededSourceRefs ||
            state.supersededSourceRefs ||
            [],
    };
    const searchResponse =
        await api.request(
            '/api/hogwarts-mud/knowledge/search',
            {
                method: 'POST',
                body:
                    JSON.stringify({
                        knowledgeApiContractVersion:
                            KNOWLEDGE_API_CONTRACT_VERSION,
                        timelineId,
                        timelineEpoch:
                            filters
                                .timelineEpoch,
                        stateRevision:
                            filters
                                .stateRevision,
                        query:
                            narrativePlayerAction,
                        entityIds: [
                            state.scene
                                ?.id,
                            state.map
                                ?.currentLocalNodeId,
                            ...seeds
                                .recordIds,
                        ].filter(Boolean),
                        categories:
                            KNOWLEDGE_CATEGORIES,
                        limit:
                            contextPlan
                                .ragLimit *
                            3,
                        audience:
                            filters.audience,
                        clock:
                            filters.clock,
                        nodeTypes: [],
                        supersededSourceRefs:
                            filters
                                .supersededSourceRefs,
                    }),
            },
        );
    assert.equal(
        searchResponse.ok,
        true,
        `Knowledge search failed with ${searchResponse.status}.`,
    );
    const search =
        await searchResponse.json();
    assert.equal(
        search
            .knowledgeApiContractVersion,
        KNOWLEDGE_API_CONTRACT_VERSION,
    );
    const hydration =
        hydrateCanonicalKnowledgeCandidates({
            candidateRecords:
                search.records ||
                [],
            seedRecordIds:
                seeds.recordIds,
            canonicalRecords,
            filters,
        });
    const retrievedKnowledge =
        filterKnowledgeForAudience(
            hydration.records
                .slice(
                    0,
                    contextPlan
                        .ragLimit *
                    3,
                )
                .map(record => ({
                    ...record,
                    evidenceType:
                        'HISTORICAL_EVIDENCE',
                    evidenceStatus:
                        record.tags
                            ?.includes(
                                'superseded',
                            )
                            ? 'SUPERSEDED'
                            : 'HISTORICAL',
                })),
            {
                actorIds,
            },
        ).slice(
            0,
            contextPlan.ragLimit,
        );
    retrievedKnowledge
        .retainedEventIdsByActorId =
        structuredClone(
            seeds
                .retainedEventIdsByActorId,
        );
    retrievedKnowledge.diagnostics = {
        ...(
            search.diagnostics ||
            {}
        ),
        hydrationSuppressed:
            hydration.diagnostics
                ?.suppressed ||
            [],
    };
    const activeNamedActorCount =
        actorIds.length;
    const budget =
        createTurnPerformanceBudget(
            narrativePlayerAction,
            getDeterministicTimePolicy(),
            {
                activeNamedActorCount,
                adjudicatedMinutes:
                    playerMessage
                        .extra
                        ?.hogwartsMud
                        ?.localAdjudication
                        ?.result
                        ?.temporal
                        ?.elapsedMinutes,
            },
        );
    const workflow =
        createTurnPerformanceWorkflow(
            createWorkflowPorts(),
        );
    const momentumDirective =
        workflow
            .createSceneMomentumDirective(
                state,
                narrativePlayerAction,
                budget,
            );
    const checkResolution =
        playerMessage.extra
            ?.hogwartsMud
            ?.checkResolution ||
        null;
    const prompt =
        workflow
            .createScenePerformancePrompt(
                state,
                narrativePlayerAction,
                budget,
                retrievedKnowledge,
                null,
                momentumDirective,
                checkResolution,
                addressing,
                [],
                contextPlan,
            );
    assert.equal(
        prompt.length,
        2,
    );
    const system =
        String(
            prompt[0].content,
        );
    const user =
        String(
            prompt[1].content,
        );
    const payload =
        JSON.parse(user);
    assert.deepEqual(
        Object.keys(payload),
        LOW_TIER_CONTEXT_KEYS,
    );
    const promptCharacters =
        system.length +
        user.length;
    assert.ok(
        system.length <=
            SYSTEM_PROMPT_MAX_CHARACTERS,
        `System Prompt exceeded ${SYSTEM_PROMPT_MAX_CHARACTERS} characters.`,
    );
    assert.ok(
        encoder.encode(user).length <=
            LOW_TIER_CONTEXT_MAX_BYTES,
        `User Payload exceeded ${LOW_TIER_CONTEXT_MAX_BYTES} bytes.`,
    );
    assert.ok(
        promptCharacters <=
            PRODUCT_PROMPT_MAX_CHARACTERS,
        `Low Prompt exceeded ${PRODUCT_PROMPT_MAX_CHARACTERS} characters.`,
    );
    assert.ok(
        promptCharacters <=
            contextPlan
                .maxPromptCharacters,
        'Low Prompt exceeded the runtime-derived context budget.',
    );
    const capsuleSummary =
        Object.fromEntries(
            actorIds.map(actorId => {
                const capsule =
                    payload
                        .memoryActivations
                        ?.byActorId
                        ?.[actorId] ||
                    {};
                return [
                    actorId,
                    {
                        expectationCount:
                            capsule
                                .expectations
                                ?.length ||
                            0,
                        expectationReason:
                            (
                                capsule
                                    .expectations ||
                                []
                            ).length
                                ? 'available'
                                : 'no_legal_schema',
                        supportingEventIds:
                            (
                                capsule
                                    .supportingEvents ||
                                []
                            ).map(event =>
                                event.recordId),
                    },
                ];
            }),
        );
    for (const actorId of actorIds) {
        assert.equal(
            capsuleSummary[
                actorId
            ].expectationCount,
            0,
        );
        assert.ok(
            capsuleSummary[
                actorId
            ].supportingEventIds
                .some(recordId =>
                    /quill/u.test(
                        recordId,
                    )),
            `${actorId} has no quill Event in the production Low Prompt.`,
        );
    }
    const archiveAfter =
        await getArchiveMetric(
            args.archive,
        );
    assert.deepEqual(
        archiveAfter,
        archiveBefore,
        'Production Prompt build changed the Tina archive.',
    );
    const promptCapture = {
        messages:
            prompt,
    };
    const promptJson =
        JSON.stringify(
            promptCapture,
        );
    return {
        authority,
        state,
        playerMessage,
        assistantIndex,
        narrativePlayerAction,
        addressing,
        actorIds,
        slot,
        contextPlan,
        seeds,
        canonicalRecords,
        health,
        search,
        hydration,
        retrievedKnowledge,
        budget,
        momentumDirective,
        checkResolution,
        prompt,
        promptJson,
        api,
        report: {
            version: 1,
            mode: args.mode,
            archive: {
                path:
                    path.relative(
                        PROJECT_ROOT,
                        args.archive,
                    ),
                ...archiveBefore,
                unchanged: true,
                stateRevision:
                    state
                        .stateRevision,
                timelineEpoch:
                    state
                        .timelineEpoch,
            },
            turn: {
                assistantMessageIndex:
                    assistantIndex,
                playerActionHash:
                    sha256(
                        rawPlayerAction,
                    ),
                actorIds,
            },
            knowledge: {
                knowledgeApiContractVersion:
                    health
                        .knowledgeApiContractVersion,
                backend:
                    search
                        .diagnostics
                        ?.backend ||
                    health.preferred
                        ?.backend ||
                    health.exact
                        ?.backend,
                degraded:
                    search
                        .diagnostics
                        ?.degraded ===
                    true,
                exact: {
                    indexFormatVersion:
                        health.exact
                            ?.indexFormatVersion,
                    projectorVersion:
                        health.exact
                            ?.projectorVersion,
                    projectionFingerprint:
                        health.exact
                            ?.projectionFingerprint,
                    stateRevision:
                        health.exact
                            ?.stateRevision,
                    recordCount:
                        health.exact
                            ?.recordCount,
                },
                preferred: {
                    collectionGeneration:
                        health
                            .preferred
                            ?.collectionGeneration,
                    ok:
                        health
                            .preferred
                            ?.ok ===
                        true,
                },
                canonicalRecordCount:
                    canonicalRecords.length,
                seedRecordCount:
                    seeds
                        .recordIds
                        .length,
                serverSelectedRecordIds:
                    (
                        search.records ||
                        []
                    ).map(record =>
                        record.recordId),
                canonicalSelectedRecordIds:
                    hydration.records
                        .map(record =>
                            record.recordId),
                capsuleSummary,
            },
            prompt: {
                capturePath:
                    args.promptOut,
                captureSha256:
                    sha256(
                        promptJson,
                    ),
                system:
                    metric(system),
                outputSchema:
                    metric(
                        extractOutputSchema(
                            system,
                        ),
                    ),
                user:
                    metric(user),
                total:
                    metric(
                        system +
                        user,
                    ),
                sections:
                    Object.fromEntries(
                        Object.entries(
                            payload,
                        ).map(([
                            key,
                            value,
                        ]) => [
                            key,
                            metric(
                                value,
                            ),
                        ]),
                    ),
                runtimeMaxPromptCharacters:
                    contextPlan
                        .maxPromptCharacters,
                productMaxPromptCharacters:
                    PRODUCT_PROMPT_MAX_CHARACTERS,
                systemMaxCharacters:
                    SYSTEM_PROMPT_MAX_CHARACTERS,
                userMaxBytes:
                    LOW_TIER_CONTEXT_MAX_BYTES,
                topLevelKeys:
                    Object.keys(
                        payload,
                    ),
            },
        },
    };
}

async function validateBlindResponse(
    verification,
    responsePath,
) {
    const rawResponse =
        await readFile(
            responsePath,
            'utf8',
        );
    assert.ok(
        rawResponse.trim(),
        'Blind response is empty.',
    );
    const diagnostics = [];
    let modelCallCount = 0;
    const workflow =
        createTurnPerformanceWorkflow(
            createWorkflowPorts({
                diagnostics,
                sendModelTaskRequest:
                    async (
                        _slot,
                        prompt,
                    ) => {
                        modelCallCount++;
                        assert.equal(
                            sha256(
                                JSON.stringify({
                                    messages:
                                        prompt,
                                }),
                            ),
                            sha256(
                                verification
                                    .promptJson,
                            ),
                            'Validation did not use the captured production Prompt.',
                        );
                        return {
                            content:
                                rawResponse,
                        };
                    },
            }),
        );
    const originalFetch =
        globalThis.fetch;
    globalThis.fetch =
        (
            input,
            options,
        ) => {
            if (
                typeof input ===
                    'string' &&
                input.startsWith('/')
            ) {
                return verification
                    .api.request(
                        input,
                        options,
                    );
            }
            return originalFetch(
                input,
                options,
            );
        };
    let performance;
    try {
        performance =
            await workflow
                .generateScenePerformance(
                    verification
                        .slot,
                    verification
                        .state,
                    verification
                        .narrativePlayerAction,
                    verification
                        .budget,
                    verification
                        .retrievedKnowledge,
                    null,
                    verification
                        .momentumDirective,
                    verification
                        .checkResolution,
                    verification
                        .addressing,
                    [],
                    verification
                        .contextPlan,
                );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
    assert.equal(
        modelCallCount,
        1,
        'Blind validation issued more than one model call.',
    );
    const transaction =
        workflow
            .buildSceneTransaction(
                performance,
                verification
                    .budget,
                verification
                    .state
                    .pacingDirector
                    ?.pendingBeat
                    ?.status ===
                    'pending'
                    ? verification
                        .state
                        .pacingDirector
                        .pendingBeat
                    : null,
                verification
                    .checkResolution,
            );
    const transactionValidation =
        validateTurnTransaction(
            transaction,
            verification.state,
        );
    assert.equal(
        transactionValidation.valid,
        true,
        transactionValidation
            .errors
            .join('; '),
    );
    const failureDiagnostics =
        diagnostics.filter(entry =>
            entry.type ===
                'performance_failure');
    assert.equal(
        failureDiagnostics.length,
        0,
        'Blind response entered the failure path.',
    );
    const validationDiagnostic =
        diagnostics.findLast(entry =>
            entry.type ===
                'performance_validation');
    assert.equal(
        validationDiagnostic
            ?.data
            ?.validation
            ?.valid,
        true,
        'Blind response did not pass production validation.',
    );
    const narrativeDiagnostic =
        diagnostics.findLast(entry =>
            entry.type ===
                'narrative_context');
    assert.deepEqual(
        narrativeDiagnostic
            ?.data
            ?.expectationReasonsByActorId,
        Object.fromEntries(
            verification.actorIds
                .map(actorId => [
                    actorId,
                    'no_legal_schema',
                ]),
        ),
        'Tina Prompt diagnostics did not explain the empty Schema path.',
    );
    return {
        response: {
            path:
                responsePath,
            sha256:
                sha256(
                    rawResponse,
                ),
            characters:
                rawResponse.length,
        },
        modelCallCount,
        repairCallCount:
            Math.max(
                0,
                modelCallCount - 1,
            ),
        settlementSource:
            performance
                .settlementSource,
        validationPassed:
            true,
        transactionValidationPassed:
            true,
        expectationReasonsByActorId:
            narrativeDiagnostic
                .data
                .expectationReasonsByActorId,
        diagnosticStages:
            diagnostics.map(entry =>
                entry.type),
    };
}

async function main() {
    const args =
        parseArguments(
            process.argv.slice(2),
        );
    const verification =
        await buildVerification(
            args,
        );
    await writeFile(
        args.promptOut,
        verification.promptJson,
        {
            encoding: 'utf8',
            mode: 0o600,
        },
    );
    if (args.mode === 'validate') {
        verification.report.blind =
            await validateBlindResponse(
                verification,
                args.response,
            );
        const archiveAfter =
            await getArchiveMetric(
                args.archive,
            );
        assert.deepEqual(
            archiveAfter,
            {
                sha256:
                    verification
                        .report
                        .archive
                        .sha256,
                bytes:
                    verification
                        .report
                        .archive
                        .bytes,
                mtimeMs:
                    verification
                        .report
                        .archive
                        .mtimeMs,
            },
            'Blind validation changed the Tina archive.',
        );
    }
    process.stdout.write(
        `${JSON.stringify(
            verification.report,
            null,
            2,
        )}\n`,
    );
}

await main();
