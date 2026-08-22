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
    createLowPostTurnSemanticMessages,
    createPostTurnSemanticMessages,
    LOW_POST_TURN_SEMANTIC_SYSTEM,
    LOW_POST_TURN_TRANSPORT_JSON_SCHEMA,
    POST_TURN_JSON_SCHEMA,
    POST_TURN_TRANSPORT_JSON_SCHEMA,
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

const LOW_VALID_RESULT = Object.freeze({
    ...VALID_RESULT,
    inventoryUpdates: [],
    identityObservations: [],
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

test('Low retry sends one complete-Post request, skips Regex, and settles its raw result on the server', async () => {
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
                            LOW_VALID_RESULT,
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
                {
                    settlementOnly: true,
                },
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
        LOW_POST_TURN_SEMANTIC_SYSTEM,
    );
    assert.deepEqual(
        roleCalls[0].messages,
        createLowPostTurnSemanticMessages(
            requests[0].body.input,
        ),
    );
    assert.strictEqual(
        roleCalls[0].options.jsonSchema,
        LOW_POST_TURN_TRANSPORT_JSON_SCHEMA,
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
    assert.deepEqual(
        result.itemUpdates,
        [],
    );
});

test('Low directly settles Item and Identity proposals without a Dynamic 4B call', async () => {
    const narrative =
        'Hermione\'s bleeding cut was visible as I placed the signed note on the desk.';
    const state =
        createState('low');
    state.items = [{
        id: 'signed_note',
        labelEn: 'Signed Note',
        appearanceEn:
            'A folded parchment with a careful signature.',
        type: 'document',
        ownerId: 'player',
        holderId: '',
        custody: 'stored',
        location: {
            mapId: 'hogwarts_castle',
            roomId: 'classroom',
            placement: 'in_room',
        },
        state: 'intact',
        physicalForm: 'whole',
        visibility: 'public',
        isEquipped: false,
    }];
    const transaction =
        createTransaction();
    transaction.segments = [{
        type: 'narration',
        actorId: 'hermione',
        textEn: narrative,
    }];
    transaction.checkResolution = {
        kind: 'perception',
        target: {
            actorId: 'hermione',
        },
    };
    const lowResult = {
        ...LOW_VALID_RESULT,
        perception: {
            ...LOW_VALID_RESULT.perception,
            evidenceText: narrative,
        },
        inventoryUpdates: [{
            id: 'signed_note',
            operation: 'place',
            type: 'document',
            labelEn: 'Signed Note',
            appearanceEn:
                'A folded parchment with a careful signature.',
            ownerId: 'player',
            holderId: '',
            targetHolderId: '',
            transferMode: 'none',
            storyRoles: [],
            visibility: 'public',
            isEquipped: false,
            held: false,
            sourceKind: 'narrative',
            evidenceText:
                'placed the signed note on the desk',
            evidenceItemText:
                'signed note',
            physicalForm: 'whole',
            confidence: 0.9,
        }],
        identityObservations: [{
            actorId: 'hermione',
            injuryStatus: 'injured',
            evidenceText:
                'bleeding cut was visible',
            evidenceSegmentIndex: 0,
            confidence: 0.9,
        }],
    };
    const roleCalls = [];
    let localCalls = 0;
    const requests = [];
    const adapter = createAdapter({
        projectObservedInventoryUpdates:
            updates =>
                updates,
        runLocalModelTask:
            async () => {
                localCalls++;
            },
        sendPostTurnSemanticRequest:
            async (
                _slot,
                _messages,
                _options,
            ) => {
                roleCalls.push(true);
                return {
                    content:
                        JSON.stringify(
                            lowResult,
                        ),
                };
            },
        fetchImpl:
            async (
                url,
                options,
            ) => {
                const request = {
                    url,
                    body:
                        JSON.parse(
                            options.body,
                        ),
                };
                requests.push(request);
                return {
                    ok: true,
                    json:
                        async () =>
                            settlePostTurnModelResult(
                                request.body.input,
                                request.body.raw,
                            ),
                };
            },
    });

    const result =
        await adapter
            .requestPostTurnSemanticObservation(
                state,
                'I place the signed note on the desk.',
                transaction,
            );

    assert.equal(roleCalls.length, 1);
    assert.equal(localCalls, 0);
    assert.deepEqual(
        requests.map(request =>
            request.url),
        ['/api/hogwarts-mud/post/observe/settle'],
    );
    assert.deepEqual(
        requests[0].body.input.itemCandidates.map(item =>
            item.id),
        ['signed_note'],
    );
    assert.deepEqual(
        requests[0].body.input.identityTargetActorIds,
        ['hermione'],
    );
    assert.deepEqual(
        result.itemUpdates,
        lowResult.inventoryUpdates,
    );
    assert.deepEqual(
        result.identityObservations,
        [{
            version: 1,
            actorId: 'hermione',
            kind: 'injury_assessment',
            status: 'visible_injury',
            injuryType: 'unknown',
            description:
                'bleeding cut was visible',
            evidenceText:
                'bleeding cut was visible',
            evidenceSegmentIndex: 0,
            confidence: 0.9,
        }],
    );
});

test('Low proposal guards omit invalid Item and Identity candidates before transaction settlement', async () => {
    const input = {
        playerAction:
            'I place the Signed Note on the desk.',
        narrativeSegments: [{
            type: 'narration',
            actorId: 'hermione',
            textEn:
                'Hermione\'s bleeding cut was visible as I placed the signed note on the desk.',
        }],
        actors: [{
            id: 'hermione',
            nameEn: 'Hermione Granger',
        }],
        itemCandidates: [{
            id: 'signed_note',
            labelEn: 'Signed Note',
            label: 'Signed Note',
            appearanceEn:
                'A folded parchment with a careful signature.',
            type: 'document',
            ownerId: 'player',
            holderId: '',
            state: 'intact',
            isEquipped: false,
        }],
        identityTargetActorIds: [
            'hermione',
        ],
        inspectionTargetActorIds: [
            'hermione',
        ],
    };
    const settled =
        await settlePostTurnModelResult(
            input,
            {
                ...LOW_VALID_RESULT,
                perception: {
                    ...LOW_VALID_RESULT.perception,
                    evidenceText:
                        input.narrativeSegments[0]
                            .textEn,
                },
                inventoryUpdates: [{
                    id: 'signed_note',
                    operation: 'place',
                    type: 'document',
                    labelEn: 'Signed Note',
                    appearanceEn:
                        'A folded parchment with a careful signature.',
                    ownerId: 'player',
                    holderId: '',
                    targetHolderId: '',
                    transferMode: 'none',
                    storyRoles: [],
                    visibility: 'public',
                    isEquipped: false,
                    held: false,
                    sourceKind: 'player',
                    evidenceText:
                        input.playerAction,
                    evidenceItemText:
                        'Signed Note',
                    physicalForm: 'whole',
                    confidence: 0.1,
                }],
                identityObservations: [{
                    actorId: 'hermione',
                    injuryStatus: 'injured',
                    evidenceText:
                        'bleeding cut was visible',
                    evidenceSegmentIndex: 0,
                    confidence: 0.1,
                }],
            },
        );

    assert.deepEqual(
        settled.result.inventoryUpdates,
        [],
    );
    assert.deepEqual(
        settled.result.identityObservations,
        [],
    );
    assert.deepEqual(
        settled.diagnostics
            .lowAuxiliary
            .inventoryRejected,
        [{
            index: 0,
            code: 'confidence_below_threshold',
        }],
    );
    assert.deepEqual(
        settled.diagnostics
            .lowAuxiliary
            .identityRejected,
        [{
            index: 0,
            code: 'confidence_below_threshold',
        }],
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

test('Local retains one shared Dynamic request after an Item-routed core Post', async () => {
    const state =
        createState('local');
    state.items = [{
        id: 'signed_note',
        labelEn: 'Signed Note',
        appearanceEn:
            'A folded parchment with a careful signature.',
        type: 'document',
        ownerId: 'player',
        holderId: '',
        custody: 'stored',
        location: {
            mapId: 'hogwarts_castle',
            roomId: 'classroom',
            placement: 'in_room',
        },
        state: 'intact',
        physicalForm: 'whole',
        visibility: 'public',
        isEquipped: false,
    }];
    const update = {
        id: 'signed_note',
        operation: 'place',
        type: 'document',
        labelEn: 'Signed Note',
        appearanceEn:
            'A folded parchment with a careful signature.',
        ownerId: 'player',
        holderId: '',
        targetHolderId: '',
        transferMode: 'none',
        storyRoles: [],
        visibility: 'public',
        isEquipped: false,
        held: false,
        sourceKind: 'player',
        evidenceText:
            'I place the Signed Note on the desk.',
        evidenceItemText:
            'Signed Note',
        physicalForm: 'whole',
        confidence: 0.9,
    };
    const taskIds = [];
    const requests = [];
    const adapter = createAdapter({
        projectObservedInventoryUpdates:
            updates =>
                updates,
        runLocalModelTask:
            async (
                taskId,
                invoke,
            ) => {
                taskIds.push(taskId);
                return invoke();
            },
        sendPostTurnSemanticRequest:
            async () => {
                throw new Error(
                    'Low must not run for the Local provider.',
                );
            },
        fetchImpl:
            async (
                url,
                options,
            ) => {
                const request = {
                    url,
                    body:
                        JSON.parse(
                            options.body,
                        ),
                };
                requests.push(request);
                if (
                    url ===
                    '/api/hogwarts-mud/local/observe'
                ) {
                    return {
                        ok: true,
                        json:
                            async () =>
                                settlePostTurnModelResult(
                                    request.body.input,
                                    {
                                        ...VALID_RESULT,
                                        inventoryObservationRequired:
                                            true,
                                    },
                                    {
                                        transport:
                                            'ollama',
                                    },
                                ),
                    };
                }
                assert.equal(
                    url,
                    '/api/hogwarts-mud/local/dynamic/observe',
                );
                return {
                    ok: true,
                    json:
                        async () => ({
                            result: {
                                identityObservations: [],
                                inventoryUpdates: [
                                    update,
                                ],
                            },
                            diagnostics: {
                                routed: true,
                                requestedTasks: [
                                    'inventory',
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
            .requestPostTurnSemanticObservation(
                state,
                'I place the Signed Note on the desk.',
                createTransaction(),
            );

    assert.deepEqual(
        taskIds,
        [
            'post_turn_semantic_proposal',
            'local_dynamic_turn_observer',
        ],
    );
    assert.deepEqual(
        requests.map(request =>
            request.url),
        [
            '/api/hogwarts-mud/local/observe',
            '/api/hogwarts-mud/local/dynamic/observe',
        ],
    );
    assert.deepEqual(
        requests[1].body.input.inventory.inventory.map(item =>
            item.id),
        ['signed_note'],
    );
    assert.deepEqual(
        result.itemUpdates,
        [update],
    );
});

test('Local no-fit does not invoke either selected Post transport', async () => {
    let localCalls = 0;
    let roleCalls = 0;
    const adapter = createAdapter({
        localPostCapacity: {
            contextTokens: 1_000,
            responseReserveTokens: 500,
            estimatedCharactersPerToken: 4,
        },
        sendPostTurnSemanticRequest:
            async () => {
                roleCalls++;
            },
        runLocalModelTask:
            async () => {
                localCalls++;
            },
    });

    const result =
        await adapter
            .requestPostTurnSemanticObservation(
                createState('local'),
                'I wait for Hermione.',
                createTransaction(),
            );

    assert.equal(localCalls, 0);
    assert.equal(roleCalls, 0);
    assert.equal(
        result.postSettlementFailure,
        true,
    );
    assert.equal(
        result.failureCode,
        'post_no_fit',
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

test('server settlement accepts one strict JSON object and rejects recovery-shaped text', async () => {
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
        await settlePostTurnModelResult(
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
    let contextLimiterCalls = 0;
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
        limitMessagesToContext: () => {
            contextLimiterCalls++;
            return [];
        },
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
                POST_TURN_TRANSPORT_JSON_SCHEMA,
            skipRegexPreset: true,
            preservePrompt: true,
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
        POST_TURN_TRANSPORT_JSON_SCHEMA,
    );
    assert.strictEqual(
        overridePayload
            .json_schema
            .value,
        POST_TURN_JSON_SCHEMA,
    );
    assert.equal(contextLimiterCalls, 0);
});
