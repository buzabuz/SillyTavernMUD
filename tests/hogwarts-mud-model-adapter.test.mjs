/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createModelAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';

function createHarness(
    sendRequest,
) {
    const profiles = [{
        id: 'base',
        preset: 'base-preset',
    }];
    const requestModes = [];
    const adapter =
        createModelAdapter({
            ConnectionManagerRequestService: {
                sendRequest:
                    async (
                        profileId,
                        prompt,
                        maxTokens,
                        options,
                        overridePayload,
                    ) => {
                        requestModes.push(
                            options.stream,
                        );
                        return sendRequest({
                            profileId,
                            prompt,
                            maxTokens,
                            options,
                            overridePayload,
                        });
                    },
            },
            applyRegexPresetById:
                async () => {},
            getConnectionProfiles:
                () => profiles,
            parseCompleteJsonObject:
                value => value,
            uuidv4:
                () => 'model-adapter-test',
        });
    return {
        adapter,
        invokeRole:
            adapter
                .createScheduledRoleInvoker(),
        profiles,
        requestModes,
    };
}

const SLOT = {
    profileId: 'base',
    contextSize: 4096,
    maxResponseLength: 512,
};
const PROMPT = [{
    role: 'user',
    content: 'test',
}];

test('stream failure is surfaced after one request and the temporary profile is removed', async () => {
    const failure =
        new Error(
            'stream unavailable',
        );
    const harness =
        createHarness(
            async () => {
                throw failure;
            },
        );

    await assert.rejects(
        harness.invokeRole(
            SLOT,
            PROMPT,
            {
                stream: true,
            },
        ),
        error => {
            assert.strictEqual(
                error,
                failure,
            );
            return true;
        },
    );
    assert.deepEqual(
        harness.requestModes,
        [
            true,
        ],
    );
    assert.deepEqual(
        harness.profiles,
        [{
            id: 'base',
            preset: 'base-preset',
        }],
    );
});

test('stream success consumes one response iterator without a second request', async () => {
    const progress = [];
    const progressStates = [];
    const harness =
        createHarness(
            async () =>
                async function* stream() {
                    yield {
                        text: 'one',
                        state: {},
                    };
                    yield {
                        text: 'one two',
                        state: {
                            reasoning:
                                'done',
                        },
                    };
                },
        );

    const result =
        await harness.invokeRole(
            SLOT,
            PROMPT,
            {
                stream: true,
                onProgress:
                        (
                            content,
                            state,
                        ) => {
                            progress.push(
                                content,
                            );
                            progressStates.push(
                                state,
                            );
                        },
            },
        );

    assert.deepEqual(
        harness.requestModes,
        [
            true,
        ],
    );
    assert.deepEqual(
        progressStates,
        [
            {},
            {},
        ],
    );
    assert.deepEqual(
        progress,
        [
            'one',
            'one two',
        ],
    );
    assert.deepEqual(
        result,
        {
            content: 'one two',
        },
    );
});

test('reasoning-only responses cannot become Hogwarts structured content', () => {
    const harness =
        createHarness(
            async () => ({
                content: '',
                reasoning:
                    '{"schemaVersion":1}',
            }),
        );

    assert.equal(
        harness.adapter
            .extractRoleResponseText({
                content: '',
                reasoning:
                    '{"schemaVersion":1}',
            }),
        '',
    );
});

test('one-shot mode sends exactly one non-streaming request', async () => {
    const harness =
        createHarness(
            async () => ({
                content:
                    'one response',
                reasoning:
                    'hidden reasoning',
                reasoning_content:
                    'hidden reasoning',
                responseContent: {
                    parts: [{
                        thought: true,
                        text:
                            'hidden reasoning',
                    }],
                },
            }),
        );

    const result =
        await harness.invokeRole(
            SLOT,
            PROMPT,
        );

    assert.equal(
        result.content,
        'one response',
    );
    assert.equal(
        'reasoning' in result,
        false,
    );
    assert.equal(
        'reasoning_content' in
            result,
        false,
    );
    assert.equal(
        'responseContent' in
            result,
        false,
    );
    assert.deepEqual(
        harness.requestModes,
        [
            false,
        ],
    );
});

test('provider-native content arrays retain final text and discard thinking blocks', async () => {
    const harness =
        createHarness(
            async () => ({
                content: [{
                    type: 'thinking',
                    thinking:
                        'hidden',
                }, {
                    type: 'text',
                    text:
                        '{"schemaVersion":1}',
                }],
            }),
        );

    const result =
        await harness.invokeRole(
            SLOT,
            PROMPT,
        );

    assert.deepEqual(
        result,
        {
            content:
                '{"schemaVersion":1}',
        },
    );
    assert.equal(
        harness.adapter
            .extractRoleResponseText(
                result,
            ),
        '{"schemaVersion":1}',
    );
});

test('adapter exposes only a scheduler-bound role invoker', async () => {
    const harness =
        createHarness(
            async () => ({
                content:
                    'one response',
            }),
        );

    assert.equal(
        harness.adapter
            .sendRoleRequest,
        undefined,
    );
    await harness.invokeRole(
        SLOT,
        [{
            role:
                'user',
            content:
                'x'.repeat(
                    11,
                ),
        }],
    );

    assert.deepEqual(
        harness.requestModes,
        [
            false,
        ],
    );
});
