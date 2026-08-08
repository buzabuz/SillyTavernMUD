/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createModelAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import { createAutomaticWorkGate } from '../public/scripts/extensions/hogwarts-mud/runtime/automatic-work.js';
import { createJobRegistry } from '../public/scripts/extensions/hogwarts-mud/runtime/job-registry.js';
import { createOpeningWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import { createTurnWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';

function createOpeningHarness(responses) {
    const calls = [];
    const workflow = createOpeningWorkflow({
        PRESET_WORLD_MAP: {
            nodes: [],
        },
        extractRoleResponseText: response =>
            response.content,
        parseJsonObject: value =>
            JSON.parse(value),
        sendRoleRequest: async (...args) => {
            calls.push(args);
            return {
                content: responses.shift(),
            };
        },
        validateOpeningWorldPackage: value => ({
            valid: value.valid === true,
            errors: value.valid === true
                ? []
                : ['invalid opening'],
        }),
    });
    return {
        calls,
        state: {
            campaign: {
                grade: 1,
            },
            character: {
                identity: {
                    name: 'Tina',
                },
            },
        },
        workflow,
    };
}

function createTurnHarness({
    existingAssistant = false,
} = {}) {
    const playerAction = 'Wait by the door.';
    const playerMessage = {
        is_user: true,
        mes: playerAction,
        extra: {
            hogwartsMud: {},
        },
    };
    const assistantMessage = {
        is_user: false,
        mes: 'Interrupted response',
        extra: {},
    };
    const state = {
        phase: 'playing',
        clock: '1991-09-01 · 08:00',
        turn: {
            count: 0,
            status: 'failed',
            error: 'interrupted',
        },
        scene: {
            id: 'test_scene',
            startedMessageId: 0,
        },
        sceneTransition: {
            status: 'idle',
        },
        map: {
            activeMapId: 'test_map',
            currentLocalNodeId: 'test_room',
        },
        actors: [],
        actorLibrary: [],
        modelSlots: {},
        dailyDirector: {
            date: '1991-09-01',
            plan: {
                timePolicy: {},
            },
        },
        pacingDirector: {
            pendingBeat: null,
        },
    };
    const context = {
        chat: existingAssistant
            ? [playerMessage, assistantMessage]
            : [playerMessage],
        chatMetadata: {
            hogwartsMud: state,
        },
        saveChat: async () => {},
        saveMetadata: async () => {},
    };
    const jobRegistry = createJobRegistry();
    let streamClears = 0;
    const workflow = createTurnWorkflow({
        TRANSLATION_FORMAT_VERSION: 12,
        admitMentionedKnownActors: current => ({
            state: current,
            admittedActors: [],
        }),
        applyObservedActorUpdates: () => {},
        applyPlayerMovement: current => ({
            state: current,
            movement: null,
        }),
        applyPresenceWitnessTransaction: current =>
            current,
        applySystemPrompt: () => {},
        applyTurnTransaction: (current, transaction) => ({
            ...current,
            clock: '1991-09-01 · 08:15',
            turn: {
                count: 1,
                status: 'idle',
                error: '',
            },
            lastTransaction: transaction,
        }),
        buildLocalSemanticRoomContext: () => ({
            rooms: [],
        }),
        buildSceneTransaction: () => ({
            protocolVersion: 2,
            publicEventEn: 'Tina waits by the door.',
            segments: [{
                type: 'narration',
                textEn: 'Tina waits by the door.',
            }],
            actorPresence: {
                presentActorIdsAfterTurn: [],
            },
            actorUpdates: [],
            itemUpdates: [],
            settlementWarnings: [],
        }),
        clearLiveSceneStream: () => {
            streamClears++;
        },
        composeSceneSegments: segments =>
            segments.map(segment =>
                segment.textEn).join('\n'),
        consumePacingBeat: current =>
            current,
        createContextBudgetPlan: () => ({
            ragLimit: 1,
        }),
        createSceneMomentumDirective: () => ({
            required: true,
        }),
        createTurnPerformanceBudget: () => ({
            elapsedMinutes: 15,
        }),
        createTurnRetryCheckpoint: (
            current,
            checkpoint,
        ) => ({
            baseState: structuredClone(current),
            ...checkpoint,
        }),
        ensureDailyDirectorPlan: async () => {},
        ensureDirectorFoundation: async () => {},
        ensureMemoryConsolidation: async () => {},
        ensurePacingDirectorAssessment: async () => {},
        ensureSocialDirectorCatchup: async () => {},
        filterKnowledgeForAudience: values =>
            values,
        findUnsettledTurn: () => existingAssistant
            ? {
                playerAction,
                assistantMessageId: 1,
                forceCheck: false,
            }
            : null,
        generateScenePerformance: async () => ({
            segments: [],
        }),
        getActiveAddressingState: () => ({}),
        getContext: () => context,
        getFailedPlayerTurn: () => ({
            playerAction,
            forceCheck: false,
        }),
        getMudState: () =>
            context.chatMetadata.hogwartsMud,
        getSettings: () => ({
            translationEnabled: false,
        }),
        getWorldDate: () => '1991-09-01',
        isObservedEventBoundary: () => false,
        jobRegistry,
        localizeTurnTransaction: async transaction =>
            transaction,
        parseSpellCastDirectives: () => [],
        reconcileTurnActorPresenceWithSpatialState:
            transaction => transaction,
        reduceLocalPresence: () => ({
            occupantActorIds: [],
            cohortIds: [],
        }),
        removeExplicitAddressDirective: value =>
            value,
        removeSpellCastDirectives: value =>
            value,
        renderAll: () => {},
        requestLocalTurnAdjudication: async () => ({
            result: {
                temporal: {
                    elapsedMinutes: 15,
                },
                check: {
                    required: false,
                },
            },
            diagnostics: {},
        }),
        requestLocalTurnObservation: async () => ({
            observation: {
                diagnostics: {},
            },
            narrativeText:
                'Tina waits by the door.',
            materialEvents: [],
            itemUpdates: [],
            perception: {
                source: 'deterministic_test',
            },
            targetActorIds: [],
        }),
        resolveActionCheck: () => null,
        resolveEventWitnesses: () => null,
        resolvePlayerAddressing: () => ({
            valid: true,
            attempted: false,
            actorIds: [],
        }),
        resolveRoleSlots: () => ({
            low: {
                profileId: 'offline-test',
                contextSize: 4096,
                maxResponseLength: 512,
            },
        }),
        retrieveLocalKnowledge: async () => [],
        setLiveSceneStreamPhase: () => {},
        syncLocalKnowledge: async () => {},
        updateNativeMessageBlock: () => {},
        validateTurnTransaction: () => ({
            valid: true,
            errors: [],
        }),
    });
    return {
        context,
        get streamClears() {
            return streamClears;
        },
        workflow,
    };
}

test('runtime gate and job registries keep suppression and locks instance-local', () => {
    const leftGate = createAutomaticWorkGate();
    const rightGate = createAutomaticWorkGate();
    const leftJobs = createJobRegistry();
    const rightJobs = createJobRegistry();

    leftGate.suppressed = true;
    leftJobs.turnSettlement.set('turn', Promise.resolve());
    leftJobs.socialCatchupAttempts.add('cursor');

    assert.equal(rightGate.suppressed, false);
    assert.equal(rightJobs.turnSettlement.size, 0);
    assert.equal(rightJobs.socialCatchupAttempts.size, 0);
});

test('opening workflow accepts a valid first response without repair', async () => {
    const harness = createOpeningHarness([
        JSON.stringify({
            valid: true,
            id: 'opening',
        }),
    ]);

    const result =
        await harness.workflow.generateOpeningPackage(
            {
                profileId: 'offline-test',
            },
            harness.state,
        );

    assert.equal(result.id, 'opening');
    assert.equal(harness.calls.length, 1);
});

test('opening workflow repairs one invalid response and preserves call order', async () => {
    const harness = createOpeningHarness([
        JSON.stringify({
            valid: false,
        }),
        JSON.stringify({
            valid: true,
            id: 'repaired_opening',
        }),
    ]);

    const result =
        await harness.workflow.generateOpeningPackage(
            {
                profileId: 'offline-test',
            },
            harness.state,
        );

    assert.equal(result.id, 'repaired_opening');
    assert.equal(harness.calls.length, 2);
    assert.match(
        harness.calls[1][1][0].content,
        /^Repair an invalid opening-world JSON package\./u,
    );
});

test('opening workflow preserves the consecutive-failure error contract', async () => {
    const harness = createOpeningHarness([
        JSON.stringify({
            valid: false,
        }),
        JSON.stringify({
            valid: false,
        }),
    ]);

    await assert.rejects(
        harness.workflow.generateOpeningPackage(
            {
                profileId: 'offline-test',
            },
            harness.state,
        ),
        /世界导演连续两次未返回合法开场包：invalid opening。响应摘要：/u,
    );
    assert.equal(harness.calls.length, 2);
});

test('model adapter falls back from streaming once and removes its temporary profile', async () => {
    const profiles = [{
        id: 'base',
        preset: 'base-preset',
    }];
    const requestModes = [];
    const adapter = createModelAdapter({
        ConnectionManagerRequestService: {
            sendRequest: async (
                _profileId,
                _prompt,
                _maxTokens,
                options,
            ) => {
                requestModes.push(options.stream);
                if (options.stream) {
                    throw new Error('stream unavailable');
                }
                return {
                    content: 'fallback response',
                };
            },
        },
        applyRegexPresetById: async () => {},
        getConnectionProfiles: () => profiles,
        limitMessagesToContext: prompt => prompt,
        parseCompleteJsonObject: value => value,
        uuidv4: () => 'offline-test',
    });

    const result = await adapter.sendRoleRequest(
        {
            profileId: 'base',
            contextSize: 4096,
            maxResponseLength: 512,
        },
        [{
            role: 'user',
            content: 'offline',
        }],
        {
            stream: true,
        },
    );

    assert.equal(result.content, 'fallback response');
    assert.deepEqual(requestModes, [true, false]);
    assert.deepEqual(profiles, [{
        id: 'base',
        preset: 'base-preset',
    }]);
});

test('model adapter rethrows common streaming rate-limit errors without one-shot fallback', async () => {
    const rateLimitErrors = [
        Object.assign(new Error('upstream rejected request'), {
            status: 429,
        }),
        Object.assign(new Error('upstream rejected request'), {
            statusCode: '429',
        }),
        Object.assign(new Error('upstream rejected request'), {
            response: {
                status: 429,
            },
        }),
        Object.assign(new Error('upstream rejected request'), {
            cause: {
                status: 429,
            },
        }),
        new Error('HTTP 429 from upstream'),
        new Error('Too Many Requests'),
        new Error('rate limit exceeded'),
    ];

    for (const rateLimitError of rateLimitErrors) {
        const profiles = [{
            id: 'base',
            preset: 'base-preset',
        }];
        let requestCount = 0;
        const adapter = createModelAdapter({
            ConnectionManagerRequestService: {
                sendRequest: async () => {
                    requestCount++;
                    throw rateLimitError;
                },
            },
            applyRegexPresetById: async () => {},
            getConnectionProfiles: () => profiles,
            limitMessagesToContext: prompt => prompt,
            parseCompleteJsonObject: value => value,
            uuidv4: () => `rate-limit-${requestCount}`,
        });

        await assert.rejects(
            adapter.sendRoleRequest(
                {
                    profileId: 'base',
                    contextSize: 4096,
                    maxResponseLength: 512,
                },
                [{
                    role: 'user',
                    content: 'offline',
                }],
                {
                    stream: true,
                },
            ),
            error => {
                assert.strictEqual(error, rateLimitError);
                return true;
            },
        );
        assert.equal(requestCount, 1);
        assert.deepEqual(profiles, [{
            id: 'base',
            preset: 'base-preset',
        }]);
    }
});

test('failed-turn retry appends one assistant response without duplicating player input', async () => {
    const harness = createTurnHarness();

    await harness.workflow.retryFailedPlayerTurn();

    assert.equal(harness.context.chat.length, 2);
    assert.equal(
        harness.context.chat.filter(message =>
            message.is_user).length,
        1,
    );
    assert.equal(
        harness.context.chatMetadata.hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(harness.streamClears, 1);
});

test('unsettled-turn recovery rewrites the existing assistant message in place', async () => {
    const harness = createTurnHarness({
        existingAssistant: true,
    });

    await harness.workflow.processUnsettledTurn();

    assert.equal(harness.context.chat.length, 2);
    assert.equal(
        harness.context.chat[1].mes,
        'Tina waits by the door.',
    );
    assert.equal(
        harness.context.chatMetadata.hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(harness.streamClears, 1);
});
