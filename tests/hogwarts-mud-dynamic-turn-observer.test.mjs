import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    DYNAMIC_TURN_CONTEXT_SIZE,
    DYNAMIC_TURN_TASK_ID,
    createDynamicTurnModelRequest,
    observeDynamicTurn,
} from '../src/hogwarts-mud/dynamic-turn-observer.js';

const NARRATIVE =
    'A bleeding cut was visible on Harry\'s palm as he placed the signed note on the desk.';
const ITEM_EVIDENCE =
    'placed the signed note on the desk';

function narrativeSegments() {
    return [{
        type: 'narration',
        actorId: '',
        textEn: NARRATIVE,
    }];
}

function identityInput({
    routed = true,
} = {}) {
    return {
        narrativeSegments:
            narrativeSegments(),
        actors: [{
            id: 'harry',
            nameEn: 'Harry Potter',
        }],
        identityTargetActorIds:
            routed
                ? ['harry']
                : [],
        inspectionTargetActorIds:
            [],
    };
}

function inventoryInput() {
    return {
        playerAction:
            'Place the signed note on the desk.',
        narrativeSegments:
            narrativeSegments(),
        inventory: [{
            id: 'harry_signed_note',
            labelEn: 'Harry Signed Note',
            label: 'Harry Signed Note',
            appearanceEn:
                'A folded parchment signed by Harry.',
            type: 'document',
            ownerId: 'player',
            holderId: 'player',
            state: 'intact',
            isEquipped: false,
        }],
    };
}

function identityObservation() {
    return {
        actorId: 'harry',
        injuryStatus: 'injured',
        evidenceText:
            'A bleeding cut was visible on Harry\'s palm',
        evidenceSegmentIndex: 0,
        confidence: 0.94,
    };
}

function inventoryUpdate() {
    return {
        id: 'harry_signed_note',
        operation: 'place',
        type: 'document',
        labelEn: 'Harry Signed Note',
        appearanceEn:
            'A folded parchment signed by Harry.',
        ownerId: 'player',
        holderId: '',
        targetHolderId: '',
        transferMode: 'none',
        storyRoles: ['social'],
        visibility: 'public',
        isEquipped: false,
        held: false,
        sourceKind: 'narrative',
        evidenceText: ITEM_EVIDENCE,
        evidenceItemText:
            'signed note',
        physicalForm: 'whole',
        confidence: 0.91,
    };
}

test(
    'shared dynamic Turn omits unrouted sections and makes zero model calls',
    async () => {
        let calls = 0;
        const result =
            await observeDynamicTurn(
                {
                    identity:
                        identityInput({
                            routed: false,
                        }),
                    inventory: null,
                },
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async () => {
                            calls++;
                            return {
                                result: {},
                            };
                        },
                },
            );

        assert.equal(calls, 0);
        assert.equal(
            result.diagnostics
                .modelCalls,
            0,
        );
        assert.deepEqual(
            result.result,
            {
                identityObservations: [],
                inventoryUpdates: [],
            },
        );
    },
);

test(
    'mixed Identity and Inventory route uses one configured 4B request and both guards',
    async () => {
        const attempts = [];
        const result =
            await observeDynamicTurn(
                {
                    identity:
                        identityInput(),
                    inventory:
                        inventoryInput(),
                },
                {
                    enqueue:
                        operation =>
                            operation(),
                    callModel:
                        async request => {
                            attempts.push(
                                request,
                            );
                            return {
                                result: {
                                    identityObservations: [
                                        identityObservation(),
                                    ],
                                    inventoryUpdates: [
                                        inventoryUpdate(),
                                    ],
                                },
                                diagnostics: {
                                    model: 'qwen3:4b',
                                },
                            };
                        },
                },
            );

        assert.equal(
            attempts.length,
            1,
        );
        assert.equal(
            attempts[0].taskId,
            DYNAMIC_TURN_TASK_ID,
        );
        assert.equal(
            attempts[0]
                .exactContextSize,
            DYNAMIC_TURN_CONTEXT_SIZE,
        );
        assert.deepEqual(
            attempts[0]
                .input
                .requestedTasks,
            [
                'inventory',
                'identity',
            ],
        );
        assert.deepEqual(
            attempts[0]
                .jsonSchema
                .required,
            [
                'inventoryUpdates',
                'identityObservations',
            ],
        );
        assert.equal(
            result.diagnostics
                .modelCalls,
            1,
        );
        assert.equal(
            result.result
                .identityObservations
                .length,
            1,
        );
        assert.deepEqual(
            result.result
                .inventoryUpdates,
            [
                inventoryUpdate(),
            ],
        );
    },
);

test(
    'single-section request exposes only that requested result field within budget',
    () => {
        const request =
            createDynamicTurnModelRequest({
                identity:
                    identityInput(),
                inventory: null,
            });

        assert.deepEqual(
            request.requestedTasks,
            ['identity'],
        );
        assert.deepEqual(
            request.jsonSchema.required,
            ['identityObservations'],
        );
        assert.deepEqual(
            Object.keys(
                request
                    .jsonSchema
                    .properties,
            ),
            ['identityObservations'],
        );
        assert.equal(
            request.promptMeasurement
                .characters <=
            20_000,
            true,
        );
    },
);

test(
    'ordinary Turn adapter sends one shared request for a mixed route',
    async () => {
        const requests = [];
        const taskIds = [];
        const adapter =
            createLocalSemanticAdapter({
                getRequestHeaders:
                    () => ({}),
                runLocalModelTask:
                    async (
                        taskId,
                        invoke,
                    ) => {
                        taskIds.push(
                            taskId,
                        );
                        return invoke();
                    },
                fetchImpl:
                    async (
                        url,
                        options,
                    ) => {
                        requests.push({
                            url,
                            body:
                                JSON.parse(
                                    options.body,
                                ),
                        });
                        return {
                            ok: true,
                            json:
                                async () => ({
                                    result: {
                                        identityObservations: [
                                            identityObservation(),
                                        ],
                                        inventoryUpdates: [
                                            inventoryUpdate(),
                                        ],
                                    },
                                    diagnostics: {
                                        requestedTasks: [
                                            'inventory',
                                            'identity',
                                        ],
                                        modelCalls: 1,
                                        identity: {},
                                        inventory: {},
                                    },
                                }),
                        };
                    },
            });

        const result =
            await adapter
                .requestDynamicTurnObservation(
                    inventoryInput()
                        .playerAction,
                    narrativeSegments(),
                    [{
                        id: 'harry',
                        nameEn:
                            'Harry Potter',
                    }],
                    inventoryInput()
                        .inventory,
                    {
                        kind: 'perception',
                        target: {
                            actorId:
                                'harry',
                        },
                    },
                    true,
                );

        assert.deepEqual(
            taskIds,
            [
                DYNAMIC_TURN_TASK_ID,
            ],
        );
        assert.equal(
            requests.length,
            1,
        );
        assert.equal(
            requests[0].url,
            '/api/hogwarts-mud/local/dynamic/observe',
        );
        assert.equal(
            requests[0]
                .body
                .input
                .identity
                .identityTargetActorIds[0],
            'harry',
        );
        assert.equal(
            Boolean(
                requests[0]
                    .body
                    .input
                    .inventory,
            ),
            true,
        );
        assert.equal(
            result.diagnostics
                .modelCalls,
            1,
        );
    },
);
