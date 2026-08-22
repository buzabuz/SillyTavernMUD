/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    DYNAMIC_INVENTORY_CONTEXT_SIZE,
    DYNAMIC_INVENTORY_TASK_ID,
    createDynamicInventoryModelRequest,
    guardDynamicInventoryResult,
} from '../src/hogwarts-mud/inventory-observation-contract.js';
import {
    observeDynamicInventory,
} from '../src/hogwarts-mud/dynamic-inventory-observer.js';

const EVIDENCE =
    'Harry handed Tina the signed note.';

function input() {
    return {
        playerAction:
            'Tina accepts Harry\'s signed note.',
        narrativeSegments: [{
            type: 'narration',
            actorId: 'harry',
            textEn: EVIDENCE,
        }],
        inventory: [{
            id: 'harry_signed_note',
            labelEn: 'Harry Signed Note',
            label: '哈利的签名纸条',
            appearanceEn:
                'A folded parchment signed by Harry.',
            type: 'document',
            ownerId: 'harry',
            holderId: '',
            state: 'intact',
            isEquipped: false,
        }],
    };
}

function oversizedInput() {
    return {
        ...input(),
        narrativeSegments: Array.from(
            {
                length: 3,
            },
            (_, index) => ({
                type: 'narration',
                actorId: '',
                textEn: `${
                    index
                } ${
                    'The signed note remained on the desk. '
                        .repeat(100)
                }`,
            }),
        ),
    };
}

function update(
    overrides = {},
) {
    return {
        id: 'harry_signed_note',
        operation: 'acquire',
        type: 'document',
        labelEn: 'Harry Signed Note',
        appearanceEn:
            'A folded parchment signed by Harry.',
        ownerId: 'harry',
        holderId: 'player',
        targetHolderId: '',
        transferMode: 'gift',
        storyRoles: [
            'social',
        ],
        visibility: 'public',
        isEquipped: false,
        held: true,
        sourceKind: 'narrative',
        evidenceText: EVIDENCE,
        evidenceItemText:
            'signed note',
        physicalForm: 'whole',
        confidence: 0.92,
        ...overrides,
    };
}

test('dynamic Inventory derives the model Schema from one descriptor and rejects ungrounded output', () => {
    const request =
        createDynamicInventoryModelRequest(
            input(),
        );
    assert.equal(
        request.jsonSchema.properties
            .inventoryUpdates.items
            .properties.operation.enum
            .includes('acquire'),
        true,
    );
    assert.equal(
        request.promptMeasurement.characters <=
            9_000,
        true,
    );

    const guarded =
        guardDynamicInventoryResult(
            {
                inventoryUpdates: [
                    update({
                        evidenceText:
                            'An unrelated sentence.',
                    }),
                ],
            },
            request.normalizedInput,
        );
    assert.deepEqual(
        guarded.inventoryUpdates,
        [],
    );
    assert.deepEqual(
        guarded.rejections,
        [{
            index: 0,
            code: 'ungrounded_evidence',
        }],
    );
});

test('standalone dynamic Inventory retains its 9,000-character budget', () => {
    assert.throws(
        () =>
            createDynamicInventoryModelRequest(
                oversizedInput(),
            ),
        /above 9000/u,
    );
});

test('dynamic Inventory makes exactly one routed 4B call and returns guarded transient proposals', async () => {
    let calls = 0;
    const result =
        await observeDynamicInventory(
            input(),
            {
                enqueue:
                    async operation =>
                        operation(),
                callModel:
                    async request => {
                        calls++;
                        assert.equal(
                            request.taskId,
                            DYNAMIC_INVENTORY_TASK_ID,
                        );
                        assert.equal(
                            request.exactContextSize,
                            DYNAMIC_INVENTORY_CONTEXT_SIZE,
                        );
                        assert.equal(
                            request.unload,
                            true,
                        );
                        return {
                            result: {
                                inventoryUpdates: [
                                    update(),
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
        calls,
        1,
    );
    assert.deepEqual(
        result.result
            .inventoryUpdates,
        [
            update(),
        ],
    );
    assert.equal(
        result.diagnostics.modelCalls,
        1,
    );
    assert.equal(
        result.diagnostics
            .rejectedUpdateCount,
        0,
    );
});

test('Inventory adapter makes zero calls when post core does not route and one call when it does', async () => {
    const requests = [];
    const adapter =
        createLocalSemanticAdapter({
            getRequestHeaders:
                () => ({}),
            runLocalModelTask:
                async (
                    taskId,
                    invoke,
                    event,
                ) => {
                    assert.equal(
                        taskId,
                        DYNAMIC_INVENTORY_TASK_ID,
                    );
                    assert.equal(
                        event.eventType,
                        'turn.post_commit',
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
                                    inventoryUpdates: [
                                        update(),
                                    ],
                                },
                                diagnostics: {
                                    routed: true,
                                    modelCalls: 1,
                                },
                            }),
                    };
                },
        });

    const omitted =
        await adapter
            .requestDynamicInventoryObservation(
                input().playerAction,
                input().narrativeSegments,
                input().inventory,
                false,
            );
    assert.deepEqual(
        omitted.inventoryUpdates,
        [],
    );
    assert.equal(
        requests.length,
        0,
    );

    const routed =
        await adapter
            .requestDynamicInventoryObservation(
                input().playerAction,
                input().narrativeSegments,
                input().inventory,
                true,
            );
    assert.equal(
        requests.length,
        1,
    );
    assert.equal(
        requests[0].url,
        '/api/hogwarts-mud/local/inventory/observe',
    );
    assert.deepEqual(
        requests[0].body.input,
        input(),
    );
    assert.deepEqual(
        routed.inventoryUpdates,
        [
            update(),
        ],
    );
});
