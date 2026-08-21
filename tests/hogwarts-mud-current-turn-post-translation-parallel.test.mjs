/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalizationQueue,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-queue.js';
import {
    createJobRegistry,
} from '../public/scripts/extensions/hogwarts-mud/runtime/job-registry.js';
import {
    createIdleLocalizationScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/idle-localization-scheduler.js';
import {
    enqueueLocalSemanticOperation,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';

function deferred() {
    let resolve;
    let reject;
    const promise =
        new Promise((
            resolvePromise,
            rejectPromise,
        ) => {
            resolve =
                resolvePromise;
            reject =
                rejectPromise;
        });
    return {
        promise,
        resolve,
        reject,
    };
}

function candidate(
    key,
    priority,
) {
    return {
        key,
        priority,
        sourceText:
            `source ${key}`,
        sourceHash:
            `hash_${key}`,
    };
}

test('current-turn selected translation overlaps selected post without consuming P1-P4', async () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('current_a', 0),
        candidate('current_b', 0),
        candidate('visible_old', 1),
        candidate('archive_old', 4),
    ]);
    const jobs =
        createJobRegistry();
    jobs.turnActive = true;
    jobs.turnSettlement.set(
        'new-turn',
        Promise.resolve(),
    );
    const translation =
        deferred();
    const post =
        deferred();
    const lifecycle = [];
    let translationCalls = 0;
    let upsertCalls = 0;
    let renderCalls = 0;
    let postCompleted = false;
    const scheduler =
        createIdleLocalizationScheduler({
            queue,
            automaticWork: {
                suppressed: false,
            },
            jobRegistry: jobs,
            getProviderId:
                () => 'local',
            getActionId:
                () => 'turn:epoch:1:1',
            translateBatch:
                async ({
                    candidates,
                }) => {
                    translationCalls++;
                    assert.deepEqual(
                        candidates.map(
                            item =>
                                item.key,
                        ),
                        [
                            'current_a',
                            'current_b',
                        ],
                    );
                    await translation
                        .promise;
                    return candidates.map(
                        item => ({
                            ...item,
                            translatedText:
                                `zh ${item.key}`,
                        }),
                    );
                },
            upsertRows:
                async () => {
                    upsertCalls++;
                },
            onCurrentTurnP0StateChange:
                event => {
                    lifecycle.push(
                        event.active,
                    );
                },
            render: () => {
                renderCalls++;
            },
        });

    const dispatch =
        scheduler
            .dispatchCurrentTurnP0({
                expectedActionId:
                    'turn:epoch:1:1',
                turnJobKey:
                    'new-turn',
                keys: [
                    'current_a',
                    'current_b',
                ],
            });
    const postPromise =
        post.promise.then(() => {
            postCompleted = true;
            return {
                materialEvents:
                    [],
            };
        });

    assert.equal(
        dispatch.started,
        true,
    );
    assert.equal(
        translationCalls,
        1,
    );
    assert.deepEqual(
        lifecycle,
        [true],
    );
    assert.equal(
        scheduler.gatesOpen(),
        false,
    );
    assert.deepEqual(
        queue.snapshot()
            .entries
            .filter(entry =>
                entry.status ===
                'active')
            .map(entry =>
                entry.key),
        [
            'current_a',
            'current_b',
        ],
    );

    translation.resolve();
    assert.equal(
        await dispatch.completion,
        true,
    );
    assert.equal(
        postCompleted,
        false,
    );
    assert.equal(
        upsertCalls,
        1,
    );
    assert.equal(
        renderCalls,
        1,
    );
    assert.deepEqual(
        lifecycle,
        [
            true,
            false,
        ],
    );
    assert.equal(
        jobs.localizationActiveBatch,
        null,
    );
    assert.deepEqual(
        queue.snapshot()
            .entries
            .map(entry =>
                [
                    entry.key,
                    entry.priority,
                    entry.status,
                ]),
        [
            [
                'visible_old',
                1,
                'pending',
            ],
            [
                'archive_old',
                4,
                'pending',
            ],
        ],
    );

    post.resolve();
    assert.deepEqual(
        await postPromise,
        {
            materialEvents: [],
        },
    );
    scheduler.stop();
});

test('current-turn dispatch accepts the selected provider and requires exact P0 keys', async () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('current', 0),
        candidate('visible', 1),
    ]);
    const jobs =
        createJobRegistry();
    jobs.turnActive = true;
    jobs.turnSettlement.set(
        'new-turn',
        Promise.resolve(),
    );
    let providerId = 'google';
    let calls = 0;
    const scheduler =
        createIdleLocalizationScheduler({
            queue,
            automaticWork: {
                suppressed: false,
            },
            jobRegistry: jobs,
            getProviderId:
                () => providerId,
            getActionId:
                () => 'current_action',
            translateBatch:
                async () => {
                    calls++;
                    return [];
                },
            upsertRows:
                async () => {},
        });

    assert.equal(
        scheduler
            .dispatchCurrentTurnP0({
                expectedActionId:
                    'stale_action',
                turnJobKey:
                    'new-turn',
                keys: ['current'],
            })
            .started,
        false,
    );
    assert.equal(
        calls,
        0,
    );
    const selectedDispatch =
        scheduler
            .dispatchCurrentTurnP0({
                expectedActionId:
                    'current_action',
                turnJobKey:
                    'new-turn',
                keys: ['current'],
            });
    assert.equal(
        selectedDispatch.started,
        true,
    );
    assert.equal(
        await selectedDispatch
            .completion,
        true,
    );
    assert.equal(calls, 1);
    assert.equal(
        scheduler.gatesOpen(),
        false,
    );
    scheduler.stop();
});

test('translation failure is single-attempt and does not cancel cloud post', async () => {
    const queue =
        createLocalizationQueue();
    queue.enqueue([
        candidate('current', 0),
    ]);
    const jobs =
        createJobRegistry();
    jobs.turnActive = true;
    jobs.turnSettlement.set(
        'new-turn',
        Promise.resolve(),
    );
    let translationCalls = 0;
    let failureWrites = 0;
    let postCalls = 0;
    const scheduler =
        createIdleLocalizationScheduler({
            queue,
            automaticWork: {
                suppressed: false,
            },
            jobRegistry: jobs,
            getProviderId:
                () => 'local',
            getActionId:
                () => 'current_action',
            translateBatch:
                async () => {
                    translationCalls++;
                    const error =
                        new Error(
                            'local unavailable',
                        );
                    error.code =
                        'LOCAL_UNAVAILABLE';
                    throw error;
                },
            upsertRows:
                async () => {},
            recordFailure:
                async ({
                    errorCode,
                }) => {
                    failureWrites++;
                    assert.equal(
                        errorCode,
                        'LOCAL_UNAVAILABLE',
                    );
                },
        });
    const postPromise =
        (async () => {
            postCalls++;
            return {
                accepted: true,
            };
        })();
    const dispatch =
        scheduler
            .dispatchCurrentTurnP0({
                expectedActionId:
                    'current_action',
                turnJobKey:
                    'new-turn',
                keys: ['current'],
            });

    assert.equal(
        dispatch.started,
        true,
    );
    assert.equal(
        await dispatch.completion,
        false,
    );
    assert.deepEqual(
        await postPromise,
        {
            accepted: true,
        },
    );
    assert.equal(translationCalls, 1);
    assert.equal(failureWrites, 1);
    assert.equal(postCalls, 1);
    assert.equal(
        queue.snapshot()
            .entries[0]
            .status,
        'error',
    );
    scheduler.stop();
});

test('routed local observation waits behind an active translation operation', async () => {
    const translation =
        deferred();
    const order = [];
    const translationOperation =
        enqueueLocalSemanticOperation(
            async () => {
                order.push(
                    'translation_start',
                );
                await translation
                    .promise;
                order.push(
                    'translation_end',
                );
            },
        );
    const observationOperation =
        enqueueLocalSemanticOperation(
            async () => {
                order.push(
                    'observation_start',
                );
            },
        );

    await Promise.resolve();
    assert.deepEqual(
        order,
        ['translation_start'],
    );

    translation.resolve();
    await Promise.all([
        translationOperation,
        observationOperation,
    ]);
    assert.deepEqual(
        order,
        [
            'translation_start',
            'translation_end',
            'observation_start',
        ],
    );
});
