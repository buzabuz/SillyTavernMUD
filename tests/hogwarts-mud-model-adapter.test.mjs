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
            limitMessagesToContext:
                prompt => prompt,
            parseCompleteJsonObject:
                value => value,
            uuidv4:
                () => 'model-adapter-test',
        });
    return {
        adapter,
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
        harness.adapter
            .sendRoleRequest(
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
        await harness.adapter
            .sendRoleRequest(
                SLOT,
                PROMPT,
                {
                    stream: true,
                    onProgress:
                        content =>
                            progress.push(
                                content,
                            ),
                },
            );

    assert.deepEqual(
        harness.requestModes,
        [
            true,
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
            reasoning: 'done',
        },
    );
});

test('one-shot mode sends exactly one non-streaming request', async () => {
    const harness =
        createHarness(
            async () => ({
                content:
                    'one response',
            }),
        );

    const result =
        await harness.adapter
            .sendRoleRequest(
                SLOT,
                PROMPT,
            );

    assert.equal(
        result.content,
        'one response',
    );
    assert.deepEqual(
        harness.requestModes,
        [
            false,
        ],
    );
});
