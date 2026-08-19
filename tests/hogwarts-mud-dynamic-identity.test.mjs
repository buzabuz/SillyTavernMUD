import assert from 'node:assert/strict';
import test from 'node:test';
import {
    fileURLToPath,
} from 'node:url';

import express from 'express';

import {
    applyNpcIdentityObservations,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-observation.js';
import {
    createModelEventScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    DYNAMIC_IDENTITY_CONTEXT_SIZE,
    DYNAMIC_IDENTITY_RESULT_DESCRIPTOR,
    DYNAMIC_IDENTITY_TASK_ID,
    createDynamicIdentityModelRequest,
    createDynamicIdentityResultSchema,
    guardDynamicIdentityResult,
    observeDynamicIdentity,
} from '../src/hogwarts-mud/dynamic-identity-observer.js';
import {
    router as hogwartsRouter,
} from '../src/endpoints/hogwarts-mud.js';
import {
    setConfigFilePath,
} from '../src/util.js';

setConfigFilePath(
    fileURLToPath(
        new URL(
            '../config.yaml',
            import.meta.url,
        ),
    ),
);

const HARRY_ID = 'harry';
const INJURY_EVIDENCE =
    'A bleeding cut was clearly visible across Harry\'s palm.';
const NEGATIVE_EVIDENCE =
    'The examination found no visible injury on Harry.';

function identityInput({
    textEn = INJURY_EVIDENCE,
    segmentType = 'narration',
    identityTargetActorIds = [
        HARRY_ID,
    ],
    inspectionTargetActorIds = [],
} = {}) {
    return {
        narrativeSegments: [{
            type:
                segmentType,
            actorId: '',
            textEn,
        }],
        actors: [{
            id:
                HARRY_ID,
            nameEn:
                'Harry Potter',
        }],
        identityTargetActorIds,
        inspectionTargetActorIds,
    };
}

function modelResponse({
    actorId = HARRY_ID,
    injuryStatus = 'injured',
    evidenceText = INJURY_EVIDENCE,
    evidenceSegmentIndex = 0,
    confidence = 0.95,
} = {}) {
    return {
        identityObservations: [{
            actorId,
            injuryStatus,
            evidenceText,
            evidenceSegmentIndex,
            confidence,
        }],
    };
}

function worldState() {
    return {
        clock:
            '1991-09-02 · 13:20',
        actorLibrary: [{
            id:
                HARRY_ID,
            identity: {},
        }],
        actors: [{
            id:
                HARRY_ID,
        }],
    };
}

async function listen(app) {
    const server =
        await new Promise((
            resolve,
            reject,
        ) => {
            const candidate =
                app.listen(
                    0,
                    '127.0.0.1',
                    () =>
                        resolve(
                            candidate,
                        ),
                );
            candidate.once(
                'error',
                reject,
            );
        });
    return {
        server,
        url:
            `http://127.0.0.1:${server.address().port}`,
    };
}

async function close(server) {
    await new Promise((
        resolve,
        reject,
    ) =>
        server.close(error =>
            error
                ? reject(error)
                : resolve()));
}

test(
    'unrouted Identity work performs zero model calls and writes no State',
    async () => {
        let calls = 0;
        const state =
            worldState();
        const before =
            structuredClone(
                state,
            );
        const observed =
            await observeDynamicIdentity(
                identityInput({
                    identityTargetActorIds:
                        [],
                }),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            calls++;
                            return {
                                result:
                                    modelResponse(),
                            };
                        },
                },
            );
        const reduced =
            applyNpcIdentityObservations(
                state,
                observed.result
                    .identityObservations,
            );

        assert.equal(calls, 0);
        assert.equal(
            observed.diagnostics
                .modelCalls,
            0,
        );
        assert.deepEqual(
            observed.result
                .identityObservations,
            [],
        );
        assert.equal(
            reduced.changed,
            false,
        );
        assert.deepEqual(
            state,
            before,
        );
    },
);

test(
    'server-ephemeral Identity scheduling never writes the world model-task ledger',
    async () => {
        const state = {
            timelineEpoch:
                'epoch_a',
            stateRevision: 4,
            turn: {
                count: 2,
            },
            scene: {
                id: 'hospital_wing',
            },
        };
        const before =
            structuredClone(
                state,
            );
        let persisted = 0;
        let invoked = 0;
        const scheduler =
            createModelEventScheduler({
                invokeRole:
                    async () => {
                        throw new Error(
                            'role path must not run',
                        );
                    },
                getState:
                    () => state,
                persistRuntime:
                    async () => {
                        persisted++;
                    },
            });
        const result =
            await scheduler.runLocalTask(
                DYNAMIC_IDENTITY_TASK_ID,
                async () => {
                    invoked++;
                    return 'ok';
                },
                {
                    eventType:
                        'turn.post_commit',
                    emittedBy:
                        'identity.endpoint',
                },
            );

        assert.equal(
            result,
            'ok',
        );
        assert.equal(invoked, 1);
        assert.equal(persisted, 0);
        assert.deepEqual(
            state,
            before,
        );
    },
);

test(
    'one routed result is guarded once and reaches the existing Identity Reducer',
    async () => {
        const attempts = [];
        const observed =
            await observeDynamicIdentity(
                identityInput(),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async options => {
                            attempts.push(
                                options,
                            );
                            return {
                                result:
                                    modelResponse(),
                                diagnostics: {
                                    model:
                                        'qwen3:4b',
                                },
                            };
                        },
                },
            );
        const reduced =
            applyNpcIdentityObservations(
                worldState(),
                observed.result
                    .identityObservations,
            );

        assert.equal(
            attempts.length,
            1,
        );
        assert.equal(
            attempts[0].taskId,
            DYNAMIC_IDENTITY_TASK_ID,
        );
        assert.equal(
            attempts[0]
                .exactContextSize,
            DYNAMIC_IDENTITY_CONTEXT_SIZE,
        );
        assert.deepEqual(
            attempts[0]
                .jsonSchema
                .properties
                .identityObservations
                .items
                .properties
                .actorId
                .enum,
            [
                HARRY_ID,
            ],
        );
        assert.equal(
            observed.diagnostics
                .modelCalls,
            1,
        );
        assert.equal(
            reduced.changed,
            true,
        );
        assert.equal(
            reduced.state
                .actorLibrary[0]
                .identity.body
                .injuryAssessment
                .status,
            'visible_injury',
        );
        assert.equal(
            reduced.state
                .actorLibrary[0]
                .identity.body
                .injuries[0]
                .description,
            INJURY_EVIDENCE,
        );
    },
);

test(
    'stable segment authority recovers evidence without semantic text matching',
    () => {
        const request =
            createDynamicIdentityModelRequest(
                identityInput(),
            );
        const guarded =
            guardDynamicIdentityResult(
                modelResponse({
                    evidenceText:
                        'not copied from the segment',
                }),
                request
                    .normalizedInput,
            );

        assert.deepEqual(
            guarded.rejections,
            [],
        );
        assert.equal(
            guarded
                .identityObservations[0]
                .evidenceText,
            INJURY_EVIDENCE,
        );
    },
);

test(
    'one executable descriptor generates runtime and transport result Schemas',
    () => {
        const request =
            createDynamicIdentityModelRequest(
                identityInput(),
            );
        const transportObservation =
            request.jsonSchema
                .properties
                .identityObservations;
        const runtimeSchema =
            createDynamicIdentityResultSchema(
                [
                    HARRY_ID,
                ],
                1,
            );

        assert.deepEqual(
            transportObservation
                .items.required,
            Object.keys(
                DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                    .fields,
            ),
        );
        assert.equal(
            transportObservation
                .maxItems,
            DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
                .maximumItems,
        );
        assert.deepEqual(
            runtimeSchema.parse(
                modelResponse(),
            ),
            modelResponse(),
        );
        assert.throws(
            () =>
                runtimeSchema.parse(
                    modelResponse({
                        actorId: 'ron',
                    }),
                ),
        );
        assert.throws(
            () =>
                runtimeSchema.parse(
                    modelResponse({
                        evidenceText: '',
                    }),
                ),
        );
    },
);

test(
    'shared Schema and deterministic guards reject invalid Identity proposals',
    () => {
        const request =
            createDynamicIdentityModelRequest(
                identityInput({
                    textEn:
                        NEGATIVE_EVIDENCE,
                }),
            );
        assert.throws(
            () =>
                guardDynamicIdentityResult(
                    modelResponse({
                        actorId: 'ron',
                    }),
                    request
                        .normalizedInput,
                ),
        );
        assert.throws(
            () =>
                guardDynamicIdentityResult(
                    modelResponse({
                        evidenceSegmentIndex:
                            3,
                    }),
                    request
                        .normalizedInput,
                ),
        );
        const guarded =
            guardDynamicIdentityResult(
                {
                    identityObservations: [
                        modelResponse({
                            confidence: 0.69,
                        })
                            .identityObservations[0],
                        modelResponse({
                            injuryStatus:
                                'no_visible_injury',
                            evidenceText:
                                NEGATIVE_EVIDENCE,
                        })
                            .identityObservations[0],
                    ],
                },
                request
                    .normalizedInput,
            );

        assert.deepEqual(
            guarded
                .rejections
                .map(value =>
                    value.code),
            [
                'confidence_below_threshold',
                'inspection_target_required',
            ],
        );
        assert.deepEqual(
            guarded
                .identityObservations,
            [],
        );

        const dialogueRequest =
            createDynamicIdentityModelRequest(
                identityInput({
                    segmentType:
                        'dialogue',
                }),
            );
        assert.deepEqual(
            guardDynamicIdentityResult(
                modelResponse(),
                dialogueRequest
                    .normalizedInput,
            ).rejections,
            [{
                index: 0,
                code:
                    'evidence_is_not_narration',
            }],
        );
    },
);

test(
    'no_visible_injury is accepted only for a structured inspection target',
    async () => {
        const observed =
            await observeDynamicIdentity(
                identityInput({
                    textEn:
                        NEGATIVE_EVIDENCE,
                    inspectionTargetActorIds:
                        [
                            HARRY_ID,
                        ],
                }),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => ({
                            result:
                                modelResponse({
                                    injuryStatus:
                                        'no_visible_injury',
                                    evidenceText:
                                        NEGATIVE_EVIDENCE,
                                }),
                        }),
                },
            );

        assert.equal(
            observed.result
                .identityObservations[0]
                .status,
            'no_visible_injury',
        );
        assert.equal(
            observed.result
                .identityObservations[0]
                .description,
            '',
        );
    },
);

test(
    'empty semantic output remains empty even when narration contains an injury',
    async () => {
        const state =
            worldState();
        const before =
            structuredClone(
                state,
            );
        const observed =
            await observeDynamicIdentity(
                identityInput(),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => ({
                            result: {
                                identityObservations:
                                    [],
                            },
                        }),
                },
            );
        const reduced =
            applyNpcIdentityObservations(
                state,
                observed.result
                    .identityObservations,
            );

        assert.deepEqual(
            observed.result
                .identityObservations,
            [],
        );
        assert.equal(
            reduced.changed,
            false,
        );
        assert.deepEqual(
            state,
            before,
        );
    },
);

test(
    'model and Schema failures perform one attempt with no repair or fallback',
    async () => {
        let failureCalls = 0;
        await assert.rejects(
            observeDynamicIdentity(
                identityInput(),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            failureCalls++;
                            throw new Error(
                                'model unavailable',
                            );
                        },
                },
            ),
            /model unavailable/u,
        );
        assert.equal(
            failureCalls,
            1,
        );

        let schemaCalls = 0;
        await assert.rejects(
            observeDynamicIdentity(
                identityInput(),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            schemaCalls++;
                            return {
                                result: {
                                    identityObservations: [{
                                        actorId:
                                            HARRY_ID,
                                    }],
                                },
                            };
                        },
                },
            ),
        );
        assert.equal(
            schemaCalls,
            1,
        );

        let emptyEvidenceCalls = 0;
        await assert.rejects(
            observeDynamicIdentity(
                identityInput(),
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            emptyEvidenceCalls++;
                            return {
                                result:
                                    modelResponse({
                                        evidenceText:
                                            '',
                                    }),
                            };
                        },
                },
            ),
        );
        assert.equal(
            emptyEvidenceCalls,
            1,
        );
    },
);

test(
    'invalid structured routes and oversized Prompts fail before a model call',
    async () => {
        let calls = 0;
        await assert.rejects(
            observeDynamicIdentity(
                {
                    ...identityInput(),
                    identityTargetActorIds:
                        [
                            'ron',
                        ],
                },
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            calls++;
                        },
                },
            ),
            /unknown Actor ron/u,
        );
        await assert.rejects(
            observeDynamicIdentity(
                {
                    ...identityInput(),
                    narrativeSegments:
                        Array.from(
                            {
                                length: 24,
                            },
                            () => ({
                                type:
                                    'narration',
                                actorId: '',
                                textEn:
                                    'X'.repeat(
                                        400,
                                    ),
                            }),
                        ),
                },
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            calls++;
                        },
                },
            ),
            /above 6000/u,
        );
        assert.equal(calls, 0);
    },
);

test(
    'production HTTP route uses exact 2048 context and rejects runtime Schema drift',
    async () => {
        const ollamaApp =
            express();
        ollamaApp.use(
            express.json(),
        );
        const requests = [];
        ollamaApp.get(
            '/api/tags',
            (_request, response) =>
                response.json({
                    models: [],
                }),
        );
        ollamaApp.post(
            '/api/chat',
            (request, response) => {
                requests.push(
                    request.body,
                );
                return response.json({
                    model:
                        request.body
                            .model,
                    message: {
                        content:
                            JSON.stringify(
                                requests.length ===
                                    1
                                    ? modelResponse()
                                    : modelResponse({
                                        evidenceText:
                                            '',
                                    }),
                            ),
                    },
                    prompt_eval_count:
                        100,
                    eval_count: 20,
                });
            },
        );
        const ollama =
            await listen(
                ollamaApp,
            );
        const apiApp =
            express();
        apiApp.use(
            express.json(),
        );
        apiApp.use(
            '/api/hogwarts-mud',
            hogwartsRouter,
        );
        const api =
            await listen(
                apiApp,
            );
        const previousUrl =
            process.env
                .HOGWARTS_OLLAMA_URL;
        const previousModel =
            process.env
                .HOGWARTS_OLLAMA_DYNAMIC_MODEL;
        process.env
            .HOGWARTS_OLLAMA_URL =
            ollama.url;
        process.env
            .HOGWARTS_OLLAMA_DYNAMIC_MODEL =
            'qwen3:4b';
        try {
            const response =
                await fetch(
                    `${api.url}/api/hogwarts-mud/local/identity/observe`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body:
                            JSON.stringify({
                                input:
                                    identityInput(),
                            }),
                    },
                );
            assert.equal(
                response.status,
                200,
            );
            const payload =
                await response.json();

            assert.equal(
                requests.length,
                1,
            );
            assert.equal(
                requests[0].model,
                'qwen3:4b',
            );
            assert.equal(
                requests[0]
                    .options
                    .num_ctx,
                2_048,
            );
            assert.equal(
                requests[0].stream,
                false,
            );
            assert.equal(
                requests[0]
                    .keep_alive,
                0,
            );
            assert.deepEqual(
                requests[0]
                    .format
                    .properties
                    .identityObservations
                    .items
                    .properties
                    .actorId
                    .enum,
                [
                    HARRY_ID,
                ],
            );
            assert.equal(
                payload.diagnostics
                    .modelCalls,
                1,
            );
            assert.equal(
                payload.result
                    .identityObservations[0]
                    .status,
                'visible_injury',
            );
            const rejectedResponse =
                await fetch(
                    `${api.url}/api/hogwarts-mud/local/identity/observe`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body:
                            JSON.stringify({
                                input:
                                    identityInput(),
                            }),
                    },
                );
            assert.equal(
                rejectedResponse.status,
                503,
            );
            assert.equal(
                requests.length,
                2,
            );
        } finally {
            if (
                previousUrl ===
                undefined
            ) {
                delete process.env
                    .HOGWARTS_OLLAMA_URL;
            } else {
                process.env
                    .HOGWARTS_OLLAMA_URL =
                    previousUrl;
            }
            if (
                previousModel ===
                undefined
            ) {
                delete process.env
                    .HOGWARTS_OLLAMA_DYNAMIC_MODEL;
            } else {
                process.env
                    .HOGWARTS_OLLAMA_DYNAMIC_MODEL =
                    previousModel;
            }
            await Promise.all([
                close(api.server),
                close(ollama.server),
            ]);
        }
    },
);
