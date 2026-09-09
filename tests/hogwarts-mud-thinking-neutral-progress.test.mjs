/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import {
    readFileSync,
} from 'node:fs';
import test from 'node:test';

import {
    createModelEventScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    createAppController,
} from '../public/scripts/extensions/hogwarts-mud/ui/app-controller.js';

test('Hogwarts named-Schema requests do not force-disable thinking', () => {
    const source =
        readFileSync(
            new URL(
                '../src/endpoints/backends/chat-completions.js',
                import.meta.url,
            ),
            'utf8',
        );
    const customStart =
        source.indexOf(
            '} else if (request.body.chat_completion_source === CHAT_COMPLETION_SOURCES.CUSTOM)',
            source.indexOf(
                'router.post(\'/generate\'',
            ),
        );
    const customEnd =
        source.indexOf(
            '} else if (request.body.chat_completion_source === CHAT_COMPLETION_SOURCES.PERPLEXITY)',
            customStart,
        );
    const customBranch =
        source.slice(
            customStart,
            customEnd,
        );

    assert.doesNotMatch(
        source,
        /isHogwartsMudJsonSchema[\s\S]{0,260}reasoning_effort\s*=\s*'none'/u,
    );
    assert.doesNotMatch(
        source,
        /\^glm-5[\s\S]{0,260}enable_thinking\s*=\s*false/u,
    );
    assert.match(
        customBranch,
        /request\.body\.thinking\?\.type/u,
    );
});

test('scheduler exposes blocking metadata without changing the one-call contract', async () => {
    const attempts = [];
    const successes = [];
    let calls = 0;
    const scheduler =
        createModelEventScheduler({
            invokeRole:
                async () => {
                    calls++;
                    return {
                        content:
                            '{"ok":true}',
                    };
                },
            getState:
                () => ({
                    timelineEpoch:
                        'epoch',
                    stateRevision: 1,
                    turn: {
                        count: 1,
                    },
                    scene: {
                        id: 'scene',
                    },
                }),
            onAttempt:
                envelope =>
                    attempts.push(
                        envelope,
                    ),
            onSuccess:
                envelope =>
                    successes.push(
                        envelope,
                    ),
        });

    await scheduler.runRoleTask(
        'scene_performance',
        {
            role: 'low',
            contextSize: 4096,
            maxResponseLength: 512,
        },
        [{
            role: 'user',
            content: '{}',
        }],
        {
            json: true,
        },
        {
            eventType:
                'turn.generation',
            emittedBy:
                'test',
        },
    );

    assert.equal(calls, 1);
    assert.equal(
        attempts.length,
        1,
    );
    assert.equal(
        successes.length,
        1,
    );
    assert.equal(
        attempts[0]
            .definition
            .blocking,
        true,
    );
    assert.equal(
        attempts[0].taskId,
        'scene_performance',
    );
});

test('scheduler terminal cleanup runs when failure-ledger persistence rejects', async () => {
    const events = [];
    const providerError =
        new Error(
            'provider failed',
        );
    const persistenceError =
        new Error(
            'ledger save failed',
        );
    let persistCalls = 0;
    const state = {
        timelineEpoch:
            'epoch',
        stateRevision: 1,
        turn: {
            count: 1,
        },
        scene: {
            id: 'scene',
        },
    };
    const scheduler =
        createModelEventScheduler({
            invokeRole:
                async () => {
                    throw providerError;
                },
            getState:
                () => state,
            persistRuntime:
                async () => {
                    persistCalls++;
                    if (
                        persistCalls ===
                        2
                    ) {
                        throw persistenceError;
                    }
                },
            onAttempt:
                envelope =>
                    events.push([
                        'attempt',
                        envelope.taskId,
                    ]),
            onFailure:
                envelope =>
                    events.push([
                        'failure',
                        envelope.taskId,
                    ]),
        });

    await assert.rejects(
        scheduler.runRoleTask(
            'scene_performance',
            {
                role: 'low',
                contextSize: 4096,
                maxResponseLength: 512,
            },
            [{
                role: 'user',
                content: '{}',
            }],
            {
                json: true,
            },
            {
                eventType:
                    'turn.generation',
                emittedBy:
                    'test',
            },
        ),
        error =>
            error ===
            persistenceError,
    );
    assert.deepEqual(
        events,
        [
            [
                'attempt',
                'scene_performance',
            ],
            [
                'failure',
                'scene_performance',
            ],
        ],
    );
});

test('foreground activity renders finite task metadata and clears without persistence', () => {
    const activityElement = {
        hidden: true,
        textContent: '',
        parentElement: null,
    };
    const place = {
        append:
            element => {
                element.parentElement =
                    place;
            },
        insertBefore:
            element => {
                element.parentElement =
                    place;
            },
    };
    const root = {
        querySelector:
            selector => {
                if (
                    selector ===
                    '#hpmud_model_activity'
                ) {
                    return activityElement;
                }
                if (
                    selector ===
                    '.hpmud-place'
                ) {
                    return place;
                }
                return null;
            },
        querySelectorAll:
            () => [],
    };
    const session = {
        foregroundModelActivity:
            null,
    };
    const controller =
        createAppController({
            refs: {
                root,
                homeElement: {},
                setupElement: {},
                workspaceElement: {},
            },
            session,
            getLocalizedField:
                field => ({
                    text:
                        field.sourceTextEn,
                }),
        });

    controller
        .setForegroundModelActivity({
            taskId:
                'post_turn_semantic_proposal',
            phase:
                'post_generation',
            startedAt:
                Date.now(),
        });

    assert.equal(
        activityElement.hidden,
        false,
    );
    assert.match(
        activityElement.textContent,
        /^Post · \d+s$/u,
    );
    assert.deepEqual(
        Object.keys(
            session
                .foregroundModelActivity,
        ),
        [
            'taskId',
            'phase',
            'startedAt',
        ],
    );
    assert.doesNotMatch(
        JSON.stringify(
            session
                .foregroundModelActivity,
        ),
        /reasoning|content|prompt|error/iu,
    );

    controller
        .clearForegroundModelActivity(
            'post_turn_semantic_proposal',
        );
    assert.equal(
        session
            .foregroundModelActivity,
        null,
    );
    assert.equal(
        activityElement.hidden,
        true,
    );
});

test('workflow glue publishes only blocking remote activity and clears both outcomes', () => {
    const source =
        readFileSync(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/workflows/application.js',
                import.meta.url,
            ),
            'utf8',
        );

    assert.match(
        source,
        /definition[\s\S]*\.blocking[\s\S]*envelope\.tier\s*!==[\s\S]*'local'/u,
    );
    assert.match(
        source,
        /onSuccess:[\s\S]*clearForegroundModelActivity/u,
    );
    assert.match(
        source,
        /onFailure:[\s\S]*clearForegroundModelActivity/u,
    );
});
