/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createModelAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import { createAutomaticWorkGate } from '../public/scripts/extensions/hogwarts-mud/runtime/automatic-work.js';
import { createJobRegistry } from '../public/scripts/extensions/hogwarts-mud/runtime/job-registry.js';
import { createLifecycleRuntime } from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';
import {
    TURN_DIAGNOSTIC_EVENT_LIMIT,
    TURN_DIAGNOSTIC_HISTORY_LIMIT,
    TURN_DIAGNOSTIC_STRING_LIMIT,
    attachTurnDiagnostics,
    createTurnDiagnosticsRecorder,
} from '../public/scripts/extensions/hogwarts-mud/runtime/turn-diagnostics.js';
import {
    reduceLocalPresence,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    projectSceneTransitionPresence,
} from '../public/scripts/extensions/hogwarts-mud/domain/transition-presence.js';
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
    let diagnosticId = 0;
    let diagnosticNow =
        Date.parse(
            '1991-09-01T08:00:00.000Z',
        );
    const diagnostics =
        createTurnDiagnosticsRecorder({
            createId: () =>
                `test-${++diagnosticId}`,
            now: () =>
                diagnosticNow++,
        });
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
        attachTurnDiagnostics,
        ...diagnostics,
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
        parseItemOperationDirectives: () => ({
            directives: [],
            errors: [],
        }),
        partitionItemProposals: () => ({
            operations: [],
            candidates: [],
        }),
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

test('lifecycle repairs stale transition cast and local-presence projections without model work', () => {
    const activeActorIds = [
        'minerva_mcgonagall',
        'canon_hermione_jean_granger',
        'canon_ronald_bilius_weasley',
        'canon_lavender_brown',
    ];
    const localOnlyActorIds = [
        'canon_dean_thomas',
        'canon_harry_james_potter',
        'canon_neville_longbottom',
        'canon_seamus_finnigan',
    ];
    const actorIds = [
        ...activeActorIds,
        ...localOnlyActorIds,
    ];
    const cohortActorIds =
        actorIds.filter(id =>
            id !==
                'minerva_mcgonagall');
    const state = {
        modelSlots: {},
        actorLibrary:
            actorIds.map(id => ({
                id,
            })),
        actors:
            actorIds.map(id => ({
                id,
                present:
                    activeActorIds
                        .includes(id),
                lifeStatus:
                    'alive',
                mapId:
                    'hogwarts_castle',
                roomId:
                    activeActorIds
                        .includes(id)
                        ? 'transfiguration_classroom'
                        : 'charms_classroom',
            })),
        activeInteractionActorIds: [
            'canon_ronald_bilius_weasley',
        ],
        localPresence: {
            version: 1,
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            occupantActorIds:
                activeActorIds,
            cohortIds: [],
            updatedTurn:
                92,
            source:
                'actor_position',
        },
        cohorts: [{
            version: 1,
            id:
                'gryffindor_year1_charms_1991',
            labelEn:
                'Gryffindor first-years in Charms',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            knownMemberActorIds:
                cohortActorIds,
            source:
                'class_roster',
        }],
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
        },
        scene: {
            id:
                'transfiguration_after_break',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            startedClock:
                '1991-09-02 · 11:30',
            startedMessageId:
                0,
            timelineEntries: [],
            nextSceneIntent: {},
        },
        sceneArchive: [{
            localCohortIds: [
                'gryffindor_year1_charms_1991',
            ],
        }],
        checks: [],
        timeline: [],
        turn: {
            count: 92,
        },
        sceneTransition: {
            status:
                'idle',
        },
        pacingDirector: {
            status:
                'idle',
        },
        memoryDirector: {
            status:
                'ready',
            reviewAfterTurns:
                10,
            lastReviewedTurn:
                92,
        },
        causalCollapse: {},
        socialGraph: {},
    };
    const context = {
        chat: [],
    };
    const unchanged =
        current => ({
            state:
                current,
            changed:
                false,
        });
    const lifecycle =
        createLifecycleRuntime({
            createFallbackNextSceneIntent:
                () => ({}),
            getContext:
                () => context,
            getLocalMapDefinition:
                () => ({
                    nodes: [{
                        id:
                            'transfiguration_classroom',
                        kind:
                            'classroom',
                    }],
                }),
            getMudState:
                () => state,
            getRoomName:
                () => '',
            jobRegistry:
                createJobRegistry(),
            migrateActorKnowledgeBoundaries:
                unchanged,
            migrateActorMovementHistory:
                unchanged,
            migrateActorPresentationState:
                unchanged,
            migrateLoadedSocialGraph:
                graph => ({
                    graph,
                    changed:
                        false,
                }),
            migrateObservedInventoryState:
                unchanged,
            migrateRelationshipMemoryState:
                unchanged,
            migrateSpellbookState:
                unchanged,
            normalizeCausalCollapseState:
                value => value,
            normalizeModelSlots:
                value => value,
            projectActorSocialRelationships:
                value => value,
            projectSceneTransitionPresence,
            reconcileCanonActorDisplayNames:
                unchanged,
            reconcileTemporaryActorDisplayNames:
                unchanged,
            reduceLocalPresence,
            saveMetadataDebounced:
                () => {},
            validateNextSceneIntent:
                () => ({
                    valid: true,
                }),
        });

    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        true,
    );
    assert.deepEqual(
        state
            .activeInteractionActorIds,
        activeActorIds,
    );
    assert.deepEqual(
        state.localPresence,
        {
            version: 1,
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            occupantActorIds:
                [...actorIds]
                    .sort(),
            cohortIds: [
                'gryffindor_year1_transfiguration_1991',
            ],
            updatedTurn:
                92,
            source:
                'cohort_roster',
        },
    );
});

test('turn diagnostics stay local, bounded, and retain only recent traces', () => {
    let id = 0;
    let now =
        Date.parse(
            '1991-09-01T08:00:00.000Z',
        );
    const recorder =
        createTurnDiagnosticsRecorder({
            createId: () =>
                `trace-${++id}`,
            now: () =>
                now++,
        });
    const chat = [];
    for (
        let turn = 0;
        turn <
            TURN_DIAGNOSTIC_HISTORY_LIMIT +
                2;
        turn++
    ) {
        recorder.beginTurnDiagnostics({
            playerAction:
                `turn ${turn}`,
            turnCount:
                turn,
        });
        for (
            let event = 0;
            event <
                TURN_DIAGNOSTIC_EVENT_LIMIT +
                    2;
            event++
        ) {
            recorder.recordTurnDiagnostic(
                'event',
                {
                    text:
                        'x'.repeat(
                            TURN_DIAGNOSTIC_STRING_LIMIT +
                                10,
                        ),
                },
            );
        }
        const trace =
            recorder.finalizeTurnDiagnostics(
                'committed',
            );
        const message = {
            extra: {
                hogwartsMud: {},
            },
        };
        chat.push(message);
        attachTurnDiagnostics(
            chat,
            message,
            trace,
        );
        assert.equal(
            trace.events.length,
            TURN_DIAGNOSTIC_EVENT_LIMIT,
        );
        assert.equal(
            trace.events[0]
                .sequence,
            0,
        );
        assert.ok(
            trace.events
                .find(event =>
                    event.stage ===
                        'event')
                .data.text.length <=
                TURN_DIAGNOSTIC_STRING_LIMIT,
        );
    }
    assert.equal(
        chat.filter(message =>
            message.extra
                .hogwartsMud
                .turnDiagnostics)
            .length,
        TURN_DIAGNOSTIC_HISTORY_LIMIT,
    );
    assert.equal(
        chat.at(-1)
            .extra
            .hogwartsMud
            .turnDiagnostics
            .status,
        'committed',
    );
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

test('model adapter records whether context limiting preserves the authoritative player prompt', async () => {
    const events = [];
    const prompt = [
        {
            role: 'system',
            content:
                'You are the low-tier On-Scene Performer. The scene must plausibly cover 15 minutes. Every direct block must receive an answer.',
        },
        {
            role: 'user',
            content:
                JSON.stringify({
                    playerAction:
                        'Whisper to Lavender.',
                    playerTurnSequence: [{
                        type:
                            'direct_speech',
                        targetActorId:
                            'canon_lavender_brown',
                        text:
                            'A private question.',
                    }],
                    elapsedMinutes:
                        15,
                    targetWordRange: [
                        240,
                        560,
                    ],
                }),
        },
    ];
    const adapter =
        createModelAdapter({
            ConnectionManagerRequestService: {
                sendRequest:
                    async () => ({
                        content:
                            '{"segments":[]}',
                    }),
            },
            applyRegexPresetById:
                async () => {},
            getConnectionProfiles:
                () => [{
                    id: 'base',
                }],
            limitMessagesToContext:
                value => [
                    value[0],
                    {
                        ...value[1],
                        content:
                            value[1]
                                .content
                                .slice(40),
                    },
                ],
            parseCompleteJsonObject:
                value => value,
            recordTurnDiagnostic:
                (stage, data) => {
                    events.push({
                        stage,
                        data,
                    });
                },
            uuidv4:
                () => 'diagnostic-test',
        });

    await adapter.sendRoleRequest(
        {
            profileId:
                'base',
            contextSize:
                4096,
            maxResponseLength:
                512,
        },
        prompt,
        {
            json: true,
        },
    );

    assert.equal(
        events.length,
        1,
    );
    assert.equal(
        events[0].stage,
        'model_request',
    );
    assert.equal(
        events[0].data
            .contextTrimmed,
        true,
    );
    assert.equal(
        events[0].data
            .originalPlayerAction,
        'Whisper to Lavender.',
    );
    assert.equal(
        events[0].data
            .limitedUserJsonValid,
        false,
    );
    assert.equal(
        events[0].data
            .limitedPlayerAction,
        '',
    );
    assert.equal(
        events[0].data
            .instructionFlags
            .limitedDuration,
        true,
    );
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
    assert.equal(
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics
            .status,
        'committed',
    );
    assert.ok(
        harness.context.chat[1]
            .extra
            .hogwartsMud
            .turnDiagnostics
            .events
            .some(event =>
                event.stage ===
                    'workflow_input'),
    );
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
