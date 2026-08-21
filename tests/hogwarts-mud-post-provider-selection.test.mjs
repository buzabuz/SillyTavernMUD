/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createModelAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import {
    DEFAULT_POST_TURN_SEMANTIC_PROVIDER,
    normalizePostTurnSemanticProvider,
} from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-provider.js';
import {
    createPostTurnSemanticMessages,
    POST_TURN_JSON_SCHEMA,
    POST_TURN_SEMANTIC_SYSTEM,
} from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';
import {
    getModelTaskDefinition,
} from '../public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js';
import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    createSettingsProfileController,
} from '../public/scripts/extensions/hogwarts-mud/ui/settings-profile-controller.js';
import {
    parsePostTurnModelResult,
    settlePostTurnModelResult,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';

const NARRATIVE =
    'Hermione nods from the front desk.';

const VALID_RESULT = Object.freeze({
    schemaVersion: 1,
    materialEvents: [],
    actorUpdates: [],
    inventoryObservationRequired: false,
    perception: {
        version: 1,
        visualScope: 'target',
        audibleScope: 'none',
        salience: 'normal',
        attribution: 'clear',
        concealment: 'none',
        directParticipantActorIds: [],
        evidenceText: NARRATIVE,
        confidence: 0.9,
        source: 'post_turn_observer',
    },
    temporalClaims: [],
    playerMovement: null,
});

function createState(
    provider,
) {
    return {
        postTurnSemanticProvider: provider,
        clock: '1991-09-01 · 12:00',
        modelSlots: {
            low: {
                profileId: 'low-profile',
            },
        },
        map: {
            activeMapId: 'hogwarts_castle',
            currentLocalNodeId: 'classroom',
            currentLevelId: 'first_floor',
        },
        scene: {
            mapId: 'hogwarts_castle',
            roomId: 'classroom',
        },
        actorLibrary: [{
            id: 'hermione',
            nameEn: 'Hermione Granger',
        }],
        actors: [{
            id: 'hermione',
            nameEn: 'Hermione Granger',
            present: true,
            mapId: 'hogwarts_castle',
            roomId: 'classroom',
        }],
        localPresence: {
            mapId: 'hogwarts_castle',
            roomId: 'classroom',
            occupantActorIds: ['hermione'],
            cohortIds: [],
        },
        items: [],
    };
}

function createTransaction() {
    return {
        elapsedMinutes: 1,
        segments: [{
            type: 'narration',
            actorId: 'hermione',
            textEn: NARRATIVE,
        }],
        actorPresence: {
            presentActorIdsAfterTurn: ['hermione'],
        },
        actorUpdates: [],
    };
}

function createAdapter(
    overrides = {},
) {
    return createLocalSemanticAdapter({
        buildLocalMapModel: () => ({
            nodes: [{
                id: 'classroom',
                nameEn: 'Classroom',
                kind: 'room',
            }],
            exits: [],
        }),
        buildStructuredPlayerTurnSequence: () => [],
        getRequestHeaders: () => ({}),
        projectObservedInventoryUpdates: () => [],
        resolveRoleSlots: slots => slots,
        validatePerceptionContract: perception => ({
            valid: true,
            value: perception,
        }),
        ...overrides,
    });
}

test('post provider contract defaults and task registration are Low/Local only', () => {
    assert.equal(
        DEFAULT_POST_TURN_SEMANTIC_PROVIDER,
        'low',
    );
    assert.equal(
        normalizePostTurnSemanticProvider(
            'invalid',
        ),
        'low',
    );
    assert.equal(
        normalizePostTurnSemanticProvider(
            'local',
        ),
        'local',
    );
    const task = getModelTaskDefinition(
        'post_turn_semantic_proposal',
    );
    assert.deepEqual(
        task.allowedTiers,
        ['local', 'low'],
    );
    assert.equal(
        getModelTaskDefinition(
            'local_post_turn_observer',
        ),
        null,
    );
});

test('provider selector persists the same normalized value to extension settings and the active timeline', () => {
    const settings = {
        modelSlots: {
            low: {
                profileId: 'low-profile',
            },
        },
        postTurnSemanticProvider: 'low',
    };
    const state = {
        modelSlots: structuredClone(
            settings.modelSlots,
        ),
        postTurnSemanticProvider: 'low',
    };
    let settingsSaves = 0;
    let metadataSaves = 0;
    const controller =
        createSettingsProfileController({
            refs: {
                root: {
                    querySelector: () => null,
                    querySelectorAll: () => [],
                },
                profileEditorDialog: {},
            },
            getSettings: () => settings,
            getMudState: () => state,
            isGameStarted: () => true,
            normalizeModelSlots: value => value,
            normalizePostTurnSemanticProvider,
            saveMetadataDebounced: () => {
                metadataSaves++;
            },
            saveSettingsDebounced: () => {
                settingsSaves++;
            },
        });

    assert.equal(
        controller.persistPostTurnSemanticProvider(
            'local',
        ),
        'local',
    );
    assert.equal(
        settings.postTurnSemanticProvider,
        'local',
    );
    assert.equal(
        state.postTurnSemanticProvider,
        'local',
    );
    assert.equal(metadataSaves, 1);
    assert.equal(settingsSaves, 1);

    controller.persistPostTurnSemanticProvider(
        'invalid',
    );
    assert.equal(
        settings.postTurnSemanticProvider,
        'low',
    );
    assert.equal(
        state.postTurnSemanticProvider,
        'low',
    );
});

test('Low provider sends one shared-schema request, skips Regex, and settles its raw result on the server', async () => {
    const roleCalls = [];
    const localCalls = [];
    const requests = [];
    const adapter = createAdapter({
        sendPostTurnSemanticRequest:
            async (
                slot,
                messages,
                options,
            ) => {
                roleCalls.push({
                    slot,
                    messages,
                    options,
                });
                return {
                    content:
                        JSON.stringify(
                            VALID_RESULT,
                        ),
                };
            },
        runLocalModelTask:
            async () => {
                localCalls.push(true);
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
                        async () =>
                            settlePostTurnModelResult(
                                requests[0].body.input,
                                requests[0].body.raw,
                                {
                                    transport:
                                        'connection_profile',
                                },
                            ),
                };
            },
    });

    const result =
        await adapter
            .requestPostTurnSemanticObservation(
                createState('low'),
                'I wait for Hermione.',
                createTransaction(),
            );

    assert.equal(roleCalls.length, 1);
    assert.equal(localCalls.length, 0);
    assert.equal(requests.length, 1);
    assert.equal(
        requests[0].url,
        '/api/hogwarts-mud/post/observe/settle',
    );
    assert.equal(
        roleCalls[0].messages[0].content,
        POST_TURN_SEMANTIC_SYSTEM,
    );
    assert.deepEqual(
        roleCalls[0].messages,
        createPostTurnSemanticMessages(
            requests[0].body.input,
        ),
    );
    assert.strictEqual(
        roleCalls[0].options.jsonSchema,
        POST_TURN_JSON_SCHEMA,
    );
    assert.equal(
        roleCalls[0].options.skipRegexPreset,
        true,
    );
    assert.equal(
        result.observation.diagnostics.provider,
        'low',
    );
    assert.deepEqual(
        result.perception,
        VALID_RESULT.perception,
    );
});

test('Local provider makes one local request and never invokes the Low role request', async () => {
    let localCalls = 0;
    let roleCalls = 0;
    const requests = [];
    const adapter = createAdapter({
        sendPostTurnSemanticRequest:
            async () => {
                roleCalls++;
            },
        runLocalModelTask:
            async (
                taskId,
                invoke,
            ) => {
                localCalls++;
                assert.equal(
                    taskId,
                    'post_turn_semantic_proposal',
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
                        async () =>
                            settlePostTurnModelResult(
                                requests[0].body.input,
                                VALID_RESULT,
                                {
                                    transport:
                                        'ollama',
                                },
                            ),
                };
            },
    });

    const result =
        await adapter
            .requestPostTurnSemanticObservation(
                createState('local'),
                'I wait for Hermione.',
                createTransaction(),
            );

    assert.equal(localCalls, 1);
    assert.equal(roleCalls, 0);
    assert.deepEqual(
        requests.map(request =>
            request.url),
        ['/api/hogwarts-mud/local/observe'],
    );
    assert.equal(
        result.observation.diagnostics.provider,
        'local',
    );
});

test('Low JSON or settlement failure does not invoke Local, perception, or dynamic observation fallback', async () => {
    let roleCalls = 0;
    let localCalls = 0;
    const adapter = createAdapter({
        sendPostTurnSemanticRequest:
            async () => {
                roleCalls++;
                return {
                    content:
                        'not json',
                };
            },
        runLocalModelTask:
            async () => {
                localCalls++;
            },
        fetchImpl:
            async () => ({
                ok: false,
                status: 422,
                text:
                    async () =>
                        'Post-turn semantic result rejected.',
            }),
    });
    const originalWarn =
        console.warn;
    let result;
    try {
        console.warn = () => {};
        result =
            await adapter
                .requestPostTurnSemanticObservation(
                    createState('low'),
                    'I wait for Hermione.',
                    createTransaction(),
                );
    } finally {
        console.warn = originalWarn;
    }

    assert.equal(roleCalls, 1);
    assert.equal(localCalls, 0);
    assert.equal(
        result.observation
            .result
            .inventoryObservationRequired,
        false,
    );
    assert.equal(
        result.perception,
        null,
    );
    assert.deepEqual(
        result.materialEvents,
        [],
    );
});

test('server settlement accepts one strict JSON object and rejects recovery-shaped text', () => {
    const input = {
        playerAction: 'I wait for Hermione.',
        narrativeSegments: [{
            type: 'narration',
            textEn: NARRATIVE,
        }],
        actors: [{
            id: 'hermione',
        }],
    };
    const settled =
        settlePostTurnModelResult(
            input,
            JSON.stringify(
                VALID_RESULT,
            ),
        );

    assert.deepEqual(
        settled.result.perception,
        VALID_RESULT.perception,
    );
    assert.throws(
        () =>
            parsePostTurnModelResult(
                `\`\`\`json\n${JSON.stringify(
                    VALID_RESULT,
                )}\n\`\`\``,
            ),
        SyntaxError,
    );
});

test('Low post request disables the profile Regex preset without changing its JSON schema request', async () => {
    const profiles = [{
        id: 'low-profile',
        preset: 'low-preset',
        'regex-preset': 'profile-regex',
    }];
    const appliedRegexIds = [];
    let effectiveProfile;
    let overridePayload;
    const adapter = createModelAdapter({
        ConnectionManagerRequestService: {
            sendRequest:
                async (
                    profileId,
                    _prompt,
                    _maxTokens,
                    _options,
                    payload,
                ) => {
                    effectiveProfile = profiles.find(
                        profile =>
                            profile.id ===
                            profileId,
                    );
                    overridePayload = payload;
                    return {
                        content: '{}',
                    };
                },
        },
        applyRegexPresetById:
            async id =>
                appliedRegexIds.push(id),
        createContextBudgetPlan:
            () => ({
                maxPromptCharacters: 10_000,
            }),
        getConnectionProfiles:
            () => profiles,
        limitMessagesToContext:
            messages => messages,
        parseCompleteJsonObject:
            JSON.parse,
        uuidv4:
            () => 'provider-selection',
    });

    await adapter.sendRoleRequest(
        {
            profileId: 'low-profile',
            contextSize: 4_096,
            maxResponseLength: 512,
        },
        createPostTurnSemanticMessages({
            playerAction: 'I wait.',
        }),
        {
            json: true,
            jsonSchema:
                POST_TURN_JSON_SCHEMA,
            skipRegexPreset: true,
        },
    );

    assert.deepEqual(
        appliedRegexIds,
        [],
    );
    assert.equal(
        effectiveProfile['regex-preset'],
        '',
    );
    assert.strictEqual(
        overridePayload.json_schema,
        POST_TURN_JSON_SCHEMA,
    );
});
