/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createKnowledgeAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/knowledge.js';
import {
    limitMessagesToContext,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    createTurnDiagnosticsRecorder,
} from '../public/scripts/extensions/hogwarts-mud/runtime/turn-diagnostics.js';
import {
    validateHistoricalClaimProvenance,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-memory-provenance.js';
import {
    buildSealedActivationCapsules,
} from '../public/scripts/extensions/hogwarts-mud/domain/relational-synapse-retrieval.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createTurnPerformanceWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';

function createState() {
    return {
        timelineEpoch:
            'task6_repair_epoch',
        stateRevision: 61,
        clock: '1991-09-04 · 09:30',
        location: 'Charms Classroom',
        character: {
            confirmed: true,
        },
        scene: {
            id: 'scene_charms',
            nameEn: 'Charms Classroom',
            summaryEn:
                'The class waits.',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            timelineEntries: [],
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
            roomStates: {},
        },
        actors: [{
            id: 'hermione',
            nameEn: 'Hermione Granger',
            present: true,
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            lifeStatus: 'alive',
            currentActivityEn:
                'Watching the desk.',
        }],
        actorLibrary: [{
            id: 'hermione',
            nameEn: 'Hermione Granger',
            roleEn: 'Student',
        }],
        actorPresentations: {},
        items: [{
            id: 'vanished_quill',
            labelEn: 'Vanished Quill',
            type: 'tool',
            state: 'destroyed',
            physicalForm: 'absent',
            holderId: '',
            visibility: 'public',
        }],
        clues: [],
        storyArcs: [],
    };
}

function createRetrievalResult() {
    return {
        records: [{
            version: 2,
            recordId:
                'events_quill_history',
            id: 'events_quill_history',
            nodeType: 'fact',
            category: 'events',
            title: 'Quill history',
            text:
                'An obsolete account says the quill remains.',
            sourceRefs: [{
                type: 'message',
                id: '212',
            }],
            visibility: {
                scope: 'public',
                actorIds: [],
            },
        }],
        activationCapsules: {
            version: 1,
            common: {
                version: 1,
                scope: 'common',
                observerId: '',
                facts: [],
                sourceIds: [],
                confidence: 0,
                capsuleId:
                    'activation_common',
                sealed: true,
            },
            byActorId: {
                hermione: {
                    version: 1,
                    scope: 'observer',
                    observerId:
                        'hermione',
                    expectations: [],
                    supportingEvents: [],
                    counterexample: null,
                    sourceIds: [],
                    confidence: 0.7,
                    capsuleId:
                        'activation_hermione',
                    sealed: true,
                },
            },
        },
        diagnostics: {
            plannerSubqueries: [{
                id: 'query_direct',
                intent: 'direct_fact',
                nodeTypes: ['fact'],
            }],
            backend: [{
                backend: 'qdrant',
                degraded: false,
                suppressed: [],
            }],
            degraded: false,
            selectedRecordIds: [
                'events_quill_history',
            ],
            sourcePaths: [{
                recordId:
                    'events_quill_history',
                hop: 0,
                sourceRefs: [{
                    type: 'message',
                    id: '212',
                }],
            }],
            hydrationSuppressed: [{
                recordId:
                    'events_stale_quill',
                reason:
                    'current_state_conflict',
                sourceRefs: [{
                    type: 'message',
                    id: '211',
                }],
            }],
            callCounts: {
                high: 0,
                medium: 0,
                low: 0,
                localPlanner: 1,
            },
        },
    };
}

function createPrivateMemoryRecords(
    actorId,
    eventId,
    eventText,
) {
    const appraisalId =
        `appraisal_${actorId}`;
    const schemaId =
        `schema_${actorId}`;
    const base = {
        version: 2,
        projectorVersion: 2,
        timelineEpoch:
            'task6_repair_epoch',
        stateRevision: 61,
        effectiveClock:
            '1991-09-03 · 17:00',
        sceneId:
            `scene_${actorId}_memory`,
        tags: ['current'],
        visibility: {
            scope: 'actor',
            actorIds: [actorId],
        },
    };
    return [{
        ...base,
        recordId:
            `events_${eventId}`,
        id:
            `events_${eventId}`,
        category: 'events',
        nodeType: 'fact',
        title:
            `${actorId} private memory`,
        text: eventText,
        sourceRefs: [{
            type: 'event',
            id: eventId,
        }],
        data: {
            eventKnowledge: {
                eventId,
            },
        },
    }, {
        ...base,
        recordId:
            `appraisals_${actorId}`,
        id:
            `appraisals_${actorId}`,
        category: 'appraisals',
        nodeType: 'appraisal',
        title:
            `${actorId} appraisal`,
        text:
            `${actorId} privately interpreted the event.`,
        sourceRefs: [{
            type: 'appraisal',
            id: appraisalId,
        }],
        data: {
            appraisal: {
                id: appraisalId,
                observerId:
                    actorId,
                targetId: 'player',
                sourceEventIds: [
                    eventId,
                ],
                confidence: 0.8,
            },
        },
    }, {
        ...base,
        recordId:
            `schemas_${actorId}`,
        id:
            `schemas_${actorId}`,
        category: 'schemas',
        nodeType: 'schema',
        title:
            `${actorId} schema`,
        text:
            `${actorId} expects a repeated pattern.`,
        sourceRefs: [{
            type: 'schema',
            id: schemaId,
        }],
        data: {
            schema: {
                id: schemaId,
                observerId:
                    actorId,
                targetId: 'player',
                factPatternEn:
                    'The player repeatedly reacts to private help.',
                interpretationEn:
                    `${actorId} interprets embarrassment as the cause.`,
                expectationEn:
                    'The player may refuse help when embarrassed.',
                confidence: 0.8,
                status: 'active',
                supportAppraisalIds: [
                    appraisalId,
                ],
                supportEventIds: [
                    eventId,
                ],
                counterAppraisalIds: [],
            },
        },
    }];
}

function createPrivateMemoryRetrieval() {
    const records = [
        ...createPrivateMemoryRecords(
            'hermione',
            'event_umbrella',
            'Yesterday in the rain corridor, Tina hid Hermione\'s umbrella.',
        ),
        ...createPrivateMemoryRecords(
            'ron',
            'event_library_book',
            'Last night in the library, Tina returned Ron\'s book.',
        ),
    ];
    return {
        records,
        activationCapsules:
            buildSealedActivationCapsules(
                records.map(
                    (
                        record,
                        index,
                    ) => ({
                        record,
                        score:
                            records.length -
                            index,
                        hop: 0,
                        path: [],
                        sourceRefs:
                            record.sourceRefs,
                    }),
                ),
                {
                    actorIds: [
                        'hermione',
                        'ron',
                    ],
                    timelineEpoch:
                        'task6_repair_epoch',
                    stateRevision: 61,
                    clock:
                        '1991-09-04 · 09:30',
                    queryAnchors: [
                        'umbrella',
                        'library',
                        'book',
                    ],
                },
            ),
    };
}

function createContextPlan() {
    return {
        mode: 'rich',
        label: 'rich',
        inputBudget: 108_000,
        ragLimit: 8,
        memoryLimits: {},
    };
}

function limitToExtremeContext(
    prompt,
) {
    return limitMessagesToContext(
        prompt,
        32_768,
        18_576,
    );
}

function createTurnPorts(
    sendModelTaskRequest,
    validateScenePerformance,
    recordTurnDiagnostic =
    () => {},
) {
    return {
        CANON_CAST_IDENTITY_CONTRACT:
            '',
        CANON_WIT_TONE_CONTRACT: '',
        CONTEXT_SIZE_PRESETS: {
            rich: 120_000,
        },
        DEFAULT_MODEL_SLOTS: {
            low: {
                maxResponseLength:
                    12_000,
            },
        },
        beginLiveSceneStream:
            () => {},
        buildActorContinuityCapsules:
            () => [],
        buildActorKnowledgeCapsules:
            () => [],
        buildBehavioralEnvironment:
            () => ({}),
        buildCurrentMaterialState:
            () => ({}),
        buildSpatialContext:
            () => ({}),
        buildStructuredPlayerTurnSequence:
            () => [],
        buildTemporaryActorPromotionPolicy:
            () => ({}),
        createContextBudgetPlan:
            createContextPlan,
        extractRoleResponseText:
            response => response.content,
        formatRetrievedKnowledge:
            () => '[HISTORICAL_EVIDENCE]',
        getActiveAddressingState:
            () => ({}),
        getAuthoritativeSceneSpells:
            () => [],
        getRequestHeaders:
            () => ({}),
        getSettings:
            () => ({
                translationEnabled:
                    false,
            }),
        parseItemOperationDirectives:
            () => ({
                directives: [],
                errors: [],
            }),
        parseJsonObject:
            value => JSON.parse(value),
        recoverScenePerformancePayload:
            () => null,
        recordTurnDiagnostic,
        removeExplicitAddressDirective:
            value => value,
        resolvePlayerAddressing:
            () => ({
                valid: true,
                actorIds: [
                    'hermione',
                ],
            }),
        resolveTemporaryActorRevealedName:
            actor => actor,
        sendModelTaskRequest,
        setLiveSceneStreamPhase:
            () => {},
        settleNarrativeTurnPerformance:
            payload => payload,
        translateOpeningValues:
            async values => values,
        updateLiveSceneStream:
            () => {},
        validateScenePerformance,
    };
}

async function withSettlementFetch(
    callback,
) {
    const originalFetch =
        globalThis.fetch;
    globalThis.fetch =
        async (_url, options) => {
            const input =
                JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({
                    performance:
                        input.payload,
                }),
            };
        };
    try {
        return await callback();
    } finally {
        globalThis.fetch =
            originalFetch;
    }
}

test('[defect-probing] ordinary Performer reports the first validation error without a repair call', async () => {
    const prompts = [];
    const diagnostics = [];
    const responses = [
        JSON.stringify({
            segments: [{
                type: 'narration',
                textEn:
                    'Hermione lifts the absent quill.',
            }],
        }),
        JSON.stringify({
            segments: [{
                type: 'narration',
                textEn:
                    'The bare desk remains empty.',
            }],
        }),
    ];
    let validations = 0;
    const workflow =
        createTurnPerformanceWorkflow(
            createTurnPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content:
                            responses.shift(),
                    };
                },
                () => {
                    validations++;
                    return validations === 1
                        ? {
                            valid: false,
                            errors: [
                                'Item vanished_quill is physically absent.',
                            ],
                        }
                        : {
                            valid: true,
                            errors: [],
                        };
                },
                (
                    type,
                    data,
                ) => {
                    diagnostics.push({
                        type,
                        data,
                    });
                },
            ),
        );

    await assert.rejects(
        () => withSettlementFetch(
            () =>
                workflow.generateScenePerformance(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    'Pick up the quill.',
                    {
                        elapsedMinutes: 15,
                        minimumWords: 1,
                        maximumWords: 100,
                        minimumSegments: 1,
                        maximumSegments: 4,
                    },
                    createRetrievalResult(),
                    null,
                    null,
                    null,
                    {
                        valid: true,
                        actorIds: [
                            'hermione',
                        ],
                    },
                    [],
                    createContextPlan(),
                ),
        ),
        /Item vanished_quill is physically absent/u,
    );

    assert.equal(
        prompts.length,
        1,
        'invalid Low output must not trigger a repair call',
    );
    const originalInput =
        JSON.parse(
            prompts[0][1].content,
        );
    assert.deepEqual(
        Object.keys(originalInput),
        [
            'playerTurn',
            'sceneFacts',
            'actorCards',
            'actionOpportunities',
            'memoryActivations',
            'prohibitions',
        ],
    );
    assert.equal(
        diagnostics.find(entry =>
            entry.type ===
                'narrative_context')
            ?.data
            ?.expectationReasonsByActorId
            ?.hermione,
        'no_legal_schema',
    );
});

test('[defect-probing] production Performer reports an extreme invalid output after one bounded request', async () => {
    const prompts = [];
    const claimTextEn =
        'Yesterday in the rain corridor, you hid my umbrella.';
    const responses = [
        JSON.stringify({
            segments: [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn: claimTextEn,
                historicalClaims: [{
                    claimTextEn,
                    sourceEventIds: [
                        'event_umbrella',
                    ],
                }],
            }],
            disposable:
                'x'.repeat(50_000),
        }),
        JSON.stringify({
            segments: [{
                type: 'narration',
                textEn:
                    'The bare desk remains empty.',
            }],
        }),
    ];
    let validations = 0;
    const workflow =
        createTurnPerformanceWorkflow(
            createTurnPorts(
                async (_slot, prompt) => {
                    const limitedPrompt =
                        limitToExtremeContext(
                            prompt,
                        );
                    prompts.push(
                        limitedPrompt,
                    );
                    return {
                        content:
                            responses.shift(),
                    };
                },
                () => {
                    validations++;
                    return validations === 1
                        ? {
                            valid: false,
                            errors: [
                                'Item vanished_quill is physically absent.',
                                'The failed segment must retain its provenance.',
                            ],
                        }
                        : {
                            valid: true,
                            errors: [],
                        };
                },
            ),
        );

    await assert.rejects(
        () => withSettlementFetch(
            () =>
                workflow.generateScenePerformance(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    'Pick up the vanished quill.',
                    {
                        elapsedMinutes: 15,
                        minimumWords: 1,
                        maximumWords: 100,
                        minimumSegments: 1,
                        maximumSegments: 4,
                    },
                    createPrivateMemoryRetrieval(),
                    null,
                    null,
                    null,
                    {
                        valid: true,
                        actorIds: [
                            'hermione',
                        ],
                    },
                    [],
                    createContextPlan(),
                ),
        ),
        /不得写入字段：disposable/u,
    );

    assert.equal(
        prompts.length,
        1,
    );
    const originalInput =
        JSON.parse(
            prompts[0][1].content,
        );
    assert.equal(
        originalInput.playerTurn
            .playerAction,
        'Pick up the vanished quill.',
    );
    assert.deepEqual(
        Object.keys(originalInput),
        [
            'playerTurn',
            'sceneFacts',
            'actorCards',
            'actionOpportunities',
            'memoryActivations',
            'prohibitions',
        ],
    );
    assert.equal(
        originalInput.requiredSchema,
        undefined,
    );
});

test('ordinary Performer accepts supported actor-scoped historical provenance in one production call', async () => {
    const prompts = [];
    const claim =
        'Yesterday in the rain corridor, you hid my umbrella.';
    const workflow =
        createTurnPerformanceWorkflow(
            createTurnPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content:
                            JSON.stringify({
                                segments: [{
                                    type: 'dialogue',
                                    actorId:
                                        'hermione',
                                    textEn:
                                        claim,
                                    historicalClaims: [{
                                        claimTextEn:
                                            claim,
                                        sourceEventIds: [
                                            'event_umbrella',
                                        ],
                                    }],
                                }],
                            }),
                    };
                },
                () => ({
                    valid: true,
                    errors: [],
                }),
            ),
        );

    const result =
        await withSettlementFetch(
            () =>
                workflow.generateScenePerformance(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    'Hermione looks thoughtful.',
                    {
                        elapsedMinutes: 15,
                        minimumWords: 1,
                        maximumWords: 100,
                        minimumSegments: 1,
                        maximumSegments: 4,
                    },
                    createPrivateMemoryRetrieval(),
                    null,
                    null,
                    null,
                    {
                        valid: true,
                        actorIds: [
                            'hermione',
                        ],
                    },
                    [],
                    createContextPlan(),
                ),
        );

    assert.equal(prompts.length, 1);
    assert.deepEqual(
        result.segments[0]
            .historicalClaims[0]
            .sourceEventIds,
        ['event_umbrella'],
    );
});

test('ordinary Performer reports missing historical provenance without repair', async () => {
    const prompts = [];
    const responses = [
        {
            segments: [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    'Yesterday in the rain corridor, you hid my umbrella.',
            }],
        },
        {
            segments: [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    'I thought you might refuse help.',
            }],
        },
    ];
    const workflow =
        createTurnPerformanceWorkflow(
            createTurnPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content:
                            JSON.stringify(
                                responses.shift(),
                            ),
                    };
                },
                () => ({
                    valid: true,
                    errors: [],
                }),
            ),
        );

    await assert.rejects(
        () => withSettlementFetch(
            () =>
                workflow.generateScenePerformance(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    'Hermione considers the offer.',
                    {
                        elapsedMinutes: 15,
                        minimumWords: 1,
                        maximumWords: 100,
                        minimumSegments: 1,
                        maximumSegments: 4,
                    },
                    createPrivateMemoryRetrieval(),
                    null,
                    null,
                    null,
                    {
                        valid: true,
                        actorIds: [
                            'hermione',
                        ],
                    },
                    [],
                    createContextPlan(),
                ),
        ),
        /unsupported_historical_detail/u,
    );

    assert.equal(prompts.length, 1);
});

test('ordinary Performer rejects narrator and other-NPC consumption of a private supporting Event', async () => {
    const state =
        createState();
    state.actors.push({
        id: 'ron',
        nameEn: 'Ron Weasley',
        present: true,
        mapId: 'hogwarts_castle',
        roomId:
            'charms_classroom',
        lifeStatus: 'alive',
        currentActivityEn:
            'Watching Hermione.',
    });
    state.actorLibrary.push({
        id: 'ron',
        nameEn: 'Ron Weasley',
        roleEn: 'Student',
    });
    const responses = [
        {
            segments: [{
                type: 'narration',
                textEn:
                    'Yesterday in the rain corridor, Tina hid Hermione\'s umbrella.',
                historicalClaims: [{
                    claimTextEn:
                        'Yesterday in the rain corridor, Tina hid Hermione\'s umbrella.',
                    sourceEventIds: [
                        'event_umbrella',
                    ],
                }],
            }],
        },
        {
            segments: [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    'I thought you might refuse help.',
            }],
        },
        {
            segments: [{
                type: 'dialogue',
                actorId: 'ron',
                textEn:
                    'Yesterday in the rain corridor, you hid Hermione\'s umbrella.',
                historicalClaims: [{
                    claimTextEn:
                        'Yesterday in the rain corridor, you hid Hermione\'s umbrella.',
                    sourceEventIds: [
                        'event_umbrella',
                    ],
                }],
            }],
        },
        {
            segments: [{
                type: 'dialogue',
                actorId: 'ron',
                textEn:
                    'I thought you might refuse help.',
            }],
        },
    ];
    const prompts = [];
    const run = async responseCount => {
        const workflow =
            createTurnPerformanceWorkflow(
                createTurnPorts(
                    async (_slot, prompt) => {
                        prompts.push(prompt);
                        return {
                            content:
                                JSON.stringify(
                                    responses.shift(),
                                ),
                        };
                    },
                    () => ({
                        valid: true,
                        errors: [],
                    }),
                ),
            );
        const result =
            await withSettlementFetch(
                () =>
                    workflow.generateScenePerformance(
                        {
                            profileId: 'low',
                            tier: 'low',
                        },
                        state,
                        'The room considers the offer.',
                        {
                            elapsedMinutes: 15,
                            minimumWords: 1,
                            maximumWords: 100,
                            minimumSegments: 1,
                            maximumSegments: 4,
                        },
                        createPrivateMemoryRetrieval(),
                        null,
                        null,
                        null,
                        {
                            valid: true,
                            actorIds: [
                                'hermione',
                                'ron',
                            ],
                        },
                        [],
                        createContextPlan(),
                    ),
            );
        assert.equal(
            prompts.length,
            responseCount,
        );
        const repairInput =
            JSON.parse(
                prompts.at(-1)[1]
                    .content,
            );
        assert.match(
            repairInput.playerTurn
                .repair.validationError,
            /unsupported_historical_detail/u,
        );
        return result;
    };

    await assert.rejects(
        () => run(1),
        /historicalClaims/u,
    );
    responses.shift();
    await assert.rejects(
        () => run(2),
        /actor ron cannot access supporting Event\(s\) event_umbrella/u,
    );
    assert.equal(
        prompts.length,
        2,
    );
});

function createTransitionPorts(
    sendSceneOpeningRequest,
    validateSceneTransitionPackage,
) {
    return {
        CANON_CAST_IDENTITY_CONTRACT:
            '',
        CANON_WIT_TONE_CONTRACT: '',
        CONTEXT_SIZE_PRESETS: {
            rich: 120_000,
        },
        DEFAULT_MODEL_SLOTS: {
            medium: {
                maxResponseLength:
                    12_000,
            },
        },
        buildActorContinuityCapsules:
            () => [],
        buildBehavioralEnvironment:
            () => ({}),
        buildCurrentMaterialState:
            () => ({}),
        buildMapAuthorityContext:
            () => ({}),
        buildSceneCastRotationPolicy:
            () => ({}),
        createContextBudgetPlan:
            createContextPlan,
        extractRoleResponseText:
            response => response.content,
        formatRetrievedKnowledge:
            () => '[HISTORICAL_EVIDENCE]',
        getContext:
            () => ({
                chat: [],
            }),
        getSceneDestinationAuthority:
            (_state, destination) => ({
                ...destination,
                roomNameEn: 'Library',
            }),
        parseJsonObject:
            value => JSON.parse(value),
        projectActorLibraryForContext:
            value => value,
        projectNpcRuntimeActorsForPrompt:
            state => state.actors,
        sendSceneOpeningRequest,
        stripSyntheticSceneOpeningActorSegments:
            segments => segments,
        synchronizeHeldItemLocations:
            items => items,
        validateSceneTransitionPackage,
    };
}

test('[defect-probing] low Opening reports the first validation error without a repair call', async () => {
    const prompts = [];
    const response =
        JSON.stringify({
            segments: [
                {
                    type: 'narration',
                    textEn:
                        'Hermione lifts the quill from a Library table.',
                },
                {
                    type: 'narration',
                    textEn:
                        'Rain taps against the high windows.',
                },
            ],
        });
    let validations = 0;
    const workflow =
        createSceneTransitionWorkflow(
            createTransitionPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content: response,
                    };
                },
                () => {
                    validations++;
                    return {
                        valid: false,
                        errors: [
                            'Opening contradicts absent Item vanished_quill.',
                        ],
                    };
                },
            ),
        );
    await assert.rejects(
        () =>
            workflow
                .generateSceneTransitionOpening(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    {
                        nextClock:
                            '1991-09-04 · 09:45',
                        nextScene: {
                            id: 'scene_library',
                            nameEn: 'Library',
                            summaryEn:
                                'The Library waits.',
                            mapId:
                                'hogwarts_castle',
                            roomId: 'library',
                            actorStates: [{
                                id: 'hermione',
                                present: true,
                                mapId:
                                    'hogwarts_castle',
                                roomId: 'library',
                                lifeStatus: 'alive',
                                currentActivityEn:
                                    'Sorting notes.',
                                currentIntentEn:
                                    'Finish the index.',
                            }],
                        },
                    },
                    {
                        mapId:
                            'hogwarts_castle',
                        roomId: 'library',
                    },
                    createContextPlan(),
                    {},
                    createRetrievalResult(),
                ),
        /Opening contradicts absent Item vanished_quill/u,
    );

    assert.equal(
        prompts.length,
        1,
        'invalid Low opening must not trigger a repair call',
    );
    assert.equal(validations, 1);
    const originalInput =
        JSON.parse(
            prompts[0][1].content,
        );
    assert.ok(
        originalInput.authoritySnapshot,
    );
    assert.ok(
        originalInput
            .memoryActivationCapsules,
    );
});

test('[defect-probing] production Opening reports an invalid extreme output after one bounded request', async () => {
    const prompts = [];
    const claimTextEn =
        'Yesterday in the rain corridor, you hid my umbrella.';
    const response =
        JSON.stringify({
            segments: [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn: claimTextEn,
                historicalClaims: [{
                    claimTextEn,
                    sourceEventIds: [
                        'event_umbrella',
                    ],
                }],
            }],
            disposable:
                'x'.repeat(50_000),
        });
    const workflow =
        createSceneTransitionWorkflow(
            createTransitionPorts(
                async (_slot, prompt) => {
                    const limitedPrompt =
                        limitToExtremeContext(
                            prompt,
                        );
                    prompts.push(
                        limitedPrompt,
                    );
                    return {
                        content: response,
                    };
                },
                () => ({
                    valid: true,
                    errors: [],
                }),
            ),
        );

    await assert.rejects(
        () =>
            workflow
                .generateSceneTransitionOpening(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    {
                        nextClock:
                            '1991-09-04 · 09:45',
                        nextScene: {
                            id: 'scene_library',
                            nameEn: 'Library',
                            summaryEn:
                                'The Library waits.',
                            mapId:
                                'hogwarts_castle',
                            roomId: 'library',
                            actorStates: [{
                                id: 'hermione',
                                present: true,
                                mapId:
                                    'hogwarts_castle',
                                roomId: 'library',
                                lifeStatus: 'alive',
                                currentActivityEn:
                                    'Sorting notes.',
                                currentIntentEn:
                                    'Finish the index.',
                            }],
                        },
                    },
                    {
                        mapId:
                            'hogwarts_castle',
                        roomId: 'library',
                    },
                    createContextPlan(),
                    {},
                    createPrivateMemoryRetrieval(),
                ),
        /disposable/u,
    );

    assert.equal(
        prompts.length,
        1,
    );
    const originalInput =
        JSON.parse(
            prompts[0][1].content,
        );
    assert.equal(
        originalInput.openingClock,
        '1991-09-04 · 09:45',
    );
    assert.equal(
        originalInput
            .destinationAuthority
            .roomId,
        'library',
    );
    assert.equal(
        originalInput
            .nextScene
            .id,
        'scene_library',
    );
    assert.equal(
        originalInput
            .nextScene
            .actorStates[0]
            .id,
        'hermione',
    );
    assert.ok(
        originalInput.authoritySnapshot,
    );
    assert.ok(
        originalInput
            .memoryActivationCapsules,
    );
});

function supportedUmbrellaSegment() {
    const claimTextEn =
        'Yesterday in the rain corridor, you hid my umbrella behind the armour.';
    return {
        type: 'dialogue',
        actorId: 'hermione',
        textEn: claimTextEn,
        historicalClaims: [{
            claimTextEn,
            sourceEventIds: [
                'event_umbrella',
            ],
        }],
    };
}

function createTask12Budget() {
    return {
        elapsedMinutes: 15,
        minimumWords: 1,
        maximumWords: 100,
        minimumSegments: 1,
        maximumSegments: 4,
    };
}

async function runTask12Performance(
    responses,
    prompts,
    state = createState(),
) {
    const workflow =
        createTurnPerformanceWorkflow(
            createTurnPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content:
                            JSON.stringify(
                                responses.shift(),
                            ),
                    };
                },
                () => ({
                    valid: true,
                    errors: [],
                }),
            ),
        );
    return withSettlementFetch(
        () =>
            workflow.generateScenePerformance(
                {
                    profileId: 'low',
                    tier: 'low',
                },
                state,
                'Continue.',
                createTask12Budget(),
                createPrivateMemoryRetrieval(),
                null,
                null,
                null,
                {
                    valid: true,
                    actorIds: [
                        'hermione',
                    ],
                },
                [],
                createContextPlan(),
            ),
    );
}

test('[Task 12] production Performer accepts supported actor recall and expectation-only gist', async () => {
    const supportedPrompts = [];
    const supported =
        await runTask12Performance(
            [{
                segments: [
                    supportedUmbrellaSegment(),
                ],
            }],
            supportedPrompts,
        );
    assert.equal(
        supportedPrompts.length,
        1,
    );
    assert.deepEqual(
        supported.segments[0]
            .historicalClaims[0]
            .sourceEventIds,
        ['event_umbrella'],
    );

    const gistPrompts = [];
    await runTask12Performance(
        [{
            segments: [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    'I thought you might refuse help, so I brought a spare.',
            }],
        }],
        gistPrompts,
    );
    assert.equal(
        gistPrompts.length,
        1,
        'expectation-driven gist must not require a fabricated episode provenance',
    );
});

test('[Task 12] production Performer reports narrator and cross-actor private Event consumption once', async () => {
    const narratorPrompts = [];
    await assert.rejects(
        () => runTask12Performance(
            [{
                segments: [{
                    type: 'narration',
                    textEn:
                    'Yesterday in the rain corridor, Tina hid Hermione\'s umbrella behind the armour.',
                }],
            }, {
                segments: [{
                    type: 'narration',
                    textEn:
                    'Hermione stands beside a spare umbrella.',
                }],
            }],
            narratorPrompts,
        ),
        /unsupported_historical_detail/u,
    );
    assert.equal(
        narratorPrompts.length,
        1,
    );

    const state =
        createState();
    state.actors.push({
        id: 'ron',
        nameEn: 'Ron Weasley',
        present: true,
        mapId:
            'hogwarts_castle',
        roomId:
            'charms_classroom',
        lifeStatus: 'alive',
        currentActivityEn:
            'Watching Hermione.',
    });
    state.actorLibrary.push({
        id: 'ron',
        nameEn: 'Ron Weasley',
        roleEn: 'Student',
    });
    const crossActorPrompts = [];
    await assert.rejects(
        () => runTask12Performance(
            [{
                segments: [{
                    ...supportedUmbrellaSegment(),
                    actorId: 'ron',
                }],
            }, {
                segments: [{
                    type: 'dialogue',
                    actorId: 'ron',
                    textEn:
                    'You two are being oddly careful with that umbrella.',
                }],
            }],
            crossActorPrompts,
            state,
        ),
        /actor ron cannot access supporting Event\(s\) event_umbrella/u,
    );
    assert.equal(
        crossActorPrompts.length,
        1,
    );
});

test('[Task 12] production low Opening reports narrator recall without repair', async () => {
    const prompts = [];
    const response = {
        segments: [
            {
                type: 'narration',
                textEn:
                    'Yesterday in the rain corridor, Tina hid Hermione\'s umbrella behind the armour.',
            },
            {
                type: 'narration',
                textEn:
                    'The Library smells of rain and old parchment.',
            },
        ],
    };
    const workflow =
        createSceneTransitionWorkflow(
            createTransitionPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content:
                            JSON.stringify(
                                response,
                            ),
                    };
                },
                () => ({
                    valid: true,
                    errors: [],
                }),
            ),
        );
    await assert.rejects(
        () =>
            workflow
                .generateSceneTransitionOpening(
                    {
                        profileId: 'low',
                        tier: 'low',
                    },
                    createState(),
                    {
                        nextClock:
                            '1991-09-04 · 09:45',
                        nextScene: {
                            id: 'scene_library',
                            nameEn: 'Library',
                            summaryEn:
                                'The Library waits.',
                            mapId:
                                'hogwarts_castle',
                            roomId: 'library',
                            actorStates: [{
                                id: 'hermione',
                                present: true,
                                mapId:
                                    'hogwarts_castle',
                                roomId: 'library',
                                lifeStatus: 'alive',
                                currentActivityEn:
                                    'Sorting notes.',
                                currentIntentEn:
                                    'Finish the index.',
                            }],
                        },
                    },
                    {
                        mapId:
                            'hogwarts_castle',
                        roomId: 'library',
                    },
                    createContextPlan(),
                    {},
                    createPrivateMemoryRetrieval(),
                ),
        /unsupported_historical_detail/u,
    );
    assert.equal(
        prompts.length,
        1,
    );
});

test('[defect-probing] knowledge adapter preserves bounded retrieval metadata without record text', async () => {
    const events = [];
    const retrieval =
        createRetrievalResult();
    retrieval.diagnostics.secret =
        'locked-clue-secret';
    const adapter =
        createKnowledgeAdapter({
            getContext:
                () => ({}),
            getMudState:
                () => createState(),
            recordTurnDiagnostic:
                (stage, data) => {
                    events.push({
                        stage,
                        data,
                    });
                },
            retrieveKnowledge:
                async () => retrieval,
            syncKnowledgeBase:
                async () => {},
        });

    const result =
        await adapter
            .retrieveLocalKnowledge(
                'Why did it vanish?',
                ['vanished_quill'],
            );

    assert.equal(
        Array.isArray(result),
        true,
    );
    assert.equal(
        result[0].recordId,
        'events_quill_history',
    );
    assert.equal(
        result.activationCapsules
            .byActorId.hermione
            .capsuleId,
        'activation_hermione',
    );
    assert.deepEqual(
        result.diagnostics
            .selectedRecordIds,
        ['events_quill_history'],
    );
    const diagnostic =
        events.find(event =>
            event.stage ===
                'knowledge_retrieval');
    assert.ok(diagnostic);
    assert.equal(
        diagnostic.data
            .selectedRecords[0]
            .recordId,
        'events_quill_history',
    );
    assert.deepEqual(
        diagnostic.data
            .selectedRecords[0]
            .sourceRefs,
        [{
            type: 'message',
            id: '212',
        }],
    );
    const persisted =
        JSON.stringify(diagnostic);
    assert.doesNotMatch(
        persisted,
        /obsolete account|locked-clue-secret/iu,
    );
});

test('knowledge adapter reports retrieval infrastructure failure without an empty-result fallback', async () => {
    const events = [];
    const failure =
        Object.assign(
            new Error(
                'Knowledge API contract mismatch.',
            ),
            {
                code:
                    'KNOWLEDGE_API_CONTRACT_MISMATCH',
            },
        );
    const adapter =
        createKnowledgeAdapter({
            getContext:
                () => ({}),
            getMudState:
                () => createState(),
            recordTurnDiagnostic:
                (stage, data) => {
                    events.push({
                        stage,
                        data,
                    });
                },
            retrieveKnowledge:
                async () => {
                    throw failure;
                },
            syncKnowledgeBase:
                async () => {},
        });
    await assert.rejects(
        adapter.retrieveLocalKnowledge(
            'quill',
            [],
        ),
        error => error ===
            failure,
    );
    assert.deepEqual(
        events.find(event =>
            event.stage ===
                'knowledge_retrieval_failure')
            ?.data,
        {
            code:
                'KNOWLEDGE_API_CONTRACT_MISMATCH',
            error:
                'Knowledge API contract mismatch.',
            willRetry: false,
        },
    );
});

test('knowledge adapter persists and rethrows exact sync failure', async () => {
    const state =
        createState();
    let saves = 0;
    const failure =
        new Error(
            'Local knowledge sync failed with 500',
        );
    const adapter =
        createKnowledgeAdapter({
            getContext:
                () => ({
                    async saveMetadata() {
                        saves++;
                    },
                }),
            getMudState:
                () => state,
            retrieveKnowledge:
                async () => [],
            syncKnowledgeBase:
                async () => {
                    throw failure;
                },
        });
    await assert.rejects(
        adapter.syncLocalKnowledge(),
        error => error ===
            failure,
    );
    assert.equal(
        saves,
        1,
    );
    assert.equal(
        state.knowledgeBase
            .lastError,
        failure.message,
    );
});

test('knowledge adapter does not save metadata for an unchanged healthy projection', async () => {
    const state =
        createState();
    state.knowledgeBase = {
        lastError: '',
    };
    let saves = 0;
    const adapter =
        createKnowledgeAdapter({
            getContext:
                () => ({
                    async saveMetadata() {
                        saves++;
                    },
                }),
            getMudState:
                () => state,
            retrieveKnowledge:
                async () => [],
            syncKnowledgeBase:
                async () => ({
                    skipped: true,
                    metadataChanged:
                        false,
                }),
        });
    const result =
        await adapter
            .syncLocalKnowledge();
    assert.equal(
        result.skipped,
        true,
    );
    assert.equal(
        saves,
        0,
    );
});

test('[defect-probing] diagnostics retain bounded authority and validation outcomes but reject prompts, secrets, and full model output', () => {
    let now =
        Date.parse(
            '1991-09-04T09:30:00.000Z',
        );
    const recorder =
        createTurnDiagnosticsRecorder({
            createId:
                () => 'task6',
            now: () => now++,
        });
    recorder.beginTurnDiagnostics({
        sceneId: 'scene_charms',
        turnCount: 7,
    });
    recorder.recordTurnDiagnostic(
        'narrative_context',
        {
            authority: {
                version: 1,
                stateRevision: 61,
            },
            plannerSubqueries: [{
                id: 'query_direct',
                intent: 'direct_fact',
                nodeTypes: ['fact'],
            }],
            backend: [{
                backend: 'qdrant',
                degraded: false,
            }],
            selectedRecords: [{
                recordId:
                    'events_quill_history',
                sourceRefs: [{
                    type: 'message',
                    id: '212',
                }],
            }],
            suppressedConflicts: [{
                recordId:
                    'events_stale_quill',
                reason:
                    'current_state_conflict',
            }],
            activationCapsuleIds: {
                common:
                    'activation_common',
                byActorId: {
                    hermione:
                        'activation_hermione',
                },
            },
            fullPrompt:
                'SYSTEM PROMPT MUST NOT PERSIST',
            raw:
                'FULL MODEL OUTPUT MUST NOT PERSIST',
            nested: {
                apiKey:
                    'sk-task6-secret',
                privateGoalEn:
                    'Locked private goal',
            },
        },
    );
    recorder.recordTurnDiagnostic(
        'appraisal_schema_validation',
        {
            appraisal: {
                proposed: 2,
                accepted: 1,
                rejected: 1,
                errors: [
                    'observer_not_authorized',
                ],
            },
            schema: {
                proposed: 1,
                accepted: 0,
                rejected: 1,
                errors: [
                    'insufficient_support',
                ],
            },
        },
    );
    recorder.recordTurnDiagnostic(
        'model_call',
        {
            tier: 'high',
        },
    );
    recorder.recordTurnDiagnostic(
        'model_call',
        {
            tier: 'medium',
        },
    );
    recorder.recordTurnDiagnostic(
        'model_call',
        {
            tier: 'low',
        },
    );
    recorder.recordTurnDiagnostic(
        'local_call',
        {
            operation: 'planner',
        },
    );
    const trace =
        recorder.finalizeTurnDiagnostics(
            'committed',
        );

    assert.deepEqual(
        trace.callCounts,
        {
            high: 1,
            medium: 1,
            low: 1,
            local: 1,
        },
    );
    const context =
        trace.events.find(event =>
            event.stage ===
                'narrative_context');
    assert.deepEqual(
        context.data.authority,
        {
            version: 1,
            stateRevision: 61,
        },
    );
    const validation =
        trace.events.find(event =>
            event.stage ===
                'appraisal_schema_validation');
    assert.equal(
        validation.data.appraisal
            .rejected,
        1,
    );
    assert.equal(
        validation.data.schema
            .rejected,
        1,
    );
    const persisted =
        JSON.stringify(trace);
    assert.doesNotMatch(
        persisted,
        /SYSTEM PROMPT MUST NOT PERSIST|FULL MODEL OUTPUT MUST NOT PERSIST|sk-task6-secret|Locked private goal/iu,
    );
});

function createTask14MemoryActivationCapsules() {
    return {
        byActorId: {
            hermione: {
                supportingEvents: [{
                    text:
                        'In the rain corridor, Hermione hid Tina\'s umbrella behind the armour.',
                    sourceRefs: [{
                        type: 'event',
                        id: 'event_umbrella',
                    }],
                }],
            },
            ron: {
                supportingEvents: [{
                    text:
                        'In the library, Tina returned Ron\'s book.',
                    sourceRefs: [{
                        type: 'event',
                        id: 'event_library_book',
                    }],
                }],
            },
        },
    };
}

test('[defect-probing][Task 14.1] third-person concrete history cannot bypass claim provenance', () => {
    const concreteClaims = [
        'Hermione hid my umbrella behind the armour.',
        'Hermione waited in the rain corridor beside the armour.',
        'Hermione packed my umbrella into the leather satchel.',
        'Hermione whispered, "The umbrella is behind the armour."',
    ];
    concreteClaims.forEach(textEn => {
        const result =
            validateHistoricalClaimProvenance(
                [{
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn,
                }],
                createTask14MemoryActivationCapsules(),
            );
        assert.equal(
            result.valid,
            false,
            textEn,
        );
        assert.match(
            result.errors.join(' '),
            /without claim-level Event provenance/u,
        );
    });
    const missingCapsules =
        validateHistoricalClaimProvenance(
            [{
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    concreteClaims[0],
            }],
            null,
        );
    assert.equal(
        missingCapsules.valid,
        false,
    );
});

test('[defect-probing][Task 15] dialogue and explicit narrator history require provenance without treating scene prose as recall', () => {
    const concreteClaims = [
        'Hermione put my umbrella behind the armour.',
        'Hermione taught me the Shield Charm in the library.',
        'Hermione cast Lumos in the rain corridor.',
    ];
    concreteClaims.forEach(textEn => {
        const narrator =
            validateHistoricalClaimProvenance(
                [{
                    type: 'narration',
                    textEn,
                }],
                createTask14MemoryActivationCapsules(),
            );
        assert.equal(
            narrator.valid,
            true,
            `narrator: ${textEn}`,
        );

        const otherActor =
            validateHistoricalClaimProvenance(
                [{
                    type: 'dialogue',
                    actorId: 'ron',
                    textEn,
                }],
                createTask14MemoryActivationCapsules(),
            );
        assert.equal(
            otherActor.valid,
            false,
            `Ron: ${textEn}`,
        );
        assert.match(
            otherActor.errors.join(' '),
            /without claim-level Event provenance/u,
        );
    });
    const explicitNarratorHistory =
        validateHistoricalClaimProvenance(
            [{
                type: 'narration',
                textEn:
                    'Earlier today, Hermione put my umbrella behind the armour.',
            }],
            createTask14MemoryActivationCapsules(),
        );
    assert.equal(
        explicitNarratorHistory.valid,
        false,
    );
    assert.match(
        explicitNarratorHistory.errors
            .join(' '),
        /narrator segments cannot consume actor-private supporting Events/u,
    );
});

test('[Task 15] concrete-history detection excludes pure expectation, gist, current action, and adjacent-place references', () => {
    const result =
        validateHistoricalClaimProvenance(
            [
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'Hermione expects me to refuse help when embarrassed.',
                },
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'Hermione usually hid embarrassment behind brisk advice.',
                },
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'Hermione is hiding my umbrella behind the armour now.',
                },
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'They put my umbrella behind the armour now.',
                },
                {
                    type: 'narration',
                    textEn:
                        'Entrance Hall: torchlight reaches the marble staircase and the closed doors to the Great Hall.',
                },
            ],
            createTask14MemoryActivationCapsules(),
        );
    assert.deepEqual(
        result,
        {
            valid: true,
            errors: [],
        },
    );
});

test('[Task 15] current participle adjectives stay distinct from finite and auxiliary historical actions', () => {
    const capsules =
        createTask14MemoryActivationCapsules();
    for (const textEn of [
        'The first part is finding something that is actually broken.',
        'Finish the written lesson.',
        'Inspect the hidden latch.',
        'Use the given name.',
        'Replace the broken bottle.',
    ]) {
        assert.deepEqual(
            validateHistoricalClaimProvenance(
                [{
                    type: 'dialogue',
                    actorId:
                        'hermione',
                    textEn,
                }],
                capsules,
            ),
            {
                valid: true,
                errors: [],
            },
            textEn,
        );
    }
    for (const textEn of [
        'You broke my quill at breakfast.',
        'You wrote the note in the library.',
        'You had hidden my quill.',
        'We had gone to the station.',
        'Yesterday you replaced the bottle.',
        'Remember when you hid the key.',
    ]) {
        const validation =
            validateHistoricalClaimProvenance(
                [{
                    type: 'dialogue',
                    actorId:
                        'hermione',
                    textEn,
                }],
                capsules,
            );
        assert.equal(
            validation.valid,
            false,
            textEn,
        );
        assert.match(
            validation.errors
                .join(' '),
            /without claim-level Event provenance/u,
        );
    }
});

test('[Task 14.1] actor-only Event provenance remains private and text-anchored for unmarked history', () => {
    const claimTextEn =
        'Hermione hid my umbrella behind the armour.';
    const supported = {
        type: 'dialogue',
        actorId: 'hermione',
        textEn: claimTextEn,
        historicalClaims: [{
            claimTextEn,
            sourceEventIds: [
                'event_umbrella',
            ],
        }],
    };
    assert.equal(
        validateHistoricalClaimProvenance(
            [supported],
            createTask14MemoryActivationCapsules(),
        ).valid,
        true,
    );

    const narrator =
        validateHistoricalClaimProvenance(
            [{
                ...supported,
                type: 'narration',
                actorId: undefined,
            }],
            createTask14MemoryActivationCapsules(),
        );
    assert.equal(narrator.valid, false);
    assert.match(
        narrator.errors.join(' '),
        /narrator segments cannot consume actor-private supporting Events/u,
    );

    const otherActor =
        validateHistoricalClaimProvenance(
            [{
                ...supported,
                actorId: 'ron',
            }],
            createTask14MemoryActivationCapsules(),
        );
    assert.equal(otherActor.valid, false);
    assert.match(
        otherActor.errors.join(' '),
        /actor ron cannot access supporting Event\(s\) event_umbrella/u,
    );

    const unanchoredCapsules =
        createTask14MemoryActivationCapsules();
    unanchoredCapsules
        .byActorId.hermione
        .supportingEvents[0]
        .text =
            'Ron returned a library book.';
    const unanchored =
        validateHistoricalClaimProvenance(
            [supported],
            unanchoredCapsules,
        );
    assert.equal(unanchored.valid, false);
    assert.match(
        unanchored.errors.join(' '),
        /does not share a concrete anchor/u,
    );
});

test('[defect-probing][Task 20] an actor name alone cannot anchor unrelated Event evidence', () => {
    const claims = [
        'Hermione hid my umbrella behind the armour.',
        'Hermione put my umbrella behind the armour.',
        'Hermione taught me the Shield Charm in the library.',
        'Hermione cast Lumos in the rain corridor.',
    ];
    const capsules = {
        byActorId: {
            hermione: {
                supportingEvents: [{
                    text:
                        'Hermione polished a telescope near midnight.',
                    sourceRefs: [{
                        type: 'event',
                        id: 'event_unrelated',
                    }],
                }],
            },
        },
    };
    claims.forEach(claimTextEn => {
        const result =
            validateHistoricalClaimProvenance(
                [{
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn: claimTextEn,
                    historicalClaims: [{
                        claimTextEn,
                        sourceEventIds: [
                            'event_unrelated',
                        ],
                    }],
                }],
                capsules,
            );
        assert.equal(
            result.valid,
            false,
            claimTextEn,
        );
        assert.match(
            result.errors.join(' '),
            /does not share a concrete anchor/u,
        );
    });
});

test('[Task 20] concrete non-identity anchors accept matching Event evidence', () => {
    const cases = [{
        claimTextEn:
            'Hermione hid my umbrella behind the armour.',
        eventText:
            'Hermione hid Tina\'s umbrella behind the armour.',
    }, {
        claimTextEn:
            'Hermione put my umbrella behind the armour.',
        eventText:
            'Hermione put Tina\'s umbrella behind the armour.',
    }, {
        claimTextEn:
            'Hermione taught me the Shield Charm in the library.',
        eventText:
            'Hermione taught Tina the Shield Charm in the library.',
    }, {
        claimTextEn:
            'Hermione cast Lumos in the rain corridor.',
        eventText:
            'Hermione cast Lumos in the rain corridor.',
    }];
    cases.forEach(({
        claimTextEn,
        eventText,
    }) => {
        const result =
            validateHistoricalClaimProvenance(
                [{
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn: claimTextEn,
                    historicalClaims: [{
                        claimTextEn,
                        sourceEventIds: [
                            'event_matching',
                        ],
                    }],
                }],
                {
                    byActorId: {
                        hermione: {
                            supportingEvents: [{
                                text:
                                    eventText,
                                sourceRefs: [{
                                    type: 'event',
                                    id:
                                        'event_matching',
                                }],
                            }],
                        },
                    },
                },
            );
        assert.deepEqual(
            result,
            {
                valid: true,
                errors: [],
            },
            claimTextEn,
        );
    });
});

test('[Task 14.1] production Performer reports unmarked history with missing or private provenance once', async () => {
    const state =
        createState();
    state.actors.push({
        id: 'ron',
        nameEn: 'Ron Weasley',
        present: true,
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
        lifeStatus: 'alive',
        currentActivityEn:
            'Watching Hermione.',
    });
    state.actorLibrary.push({
        id: 'ron',
        nameEn: 'Ron Weasley',
        roleEn: 'Student',
    });
    const claimTextEn =
        'Hermione hid my umbrella behind the armour.';
    const cases = [{
        invalidSegment: {
            type: 'dialogue',
            actorId: 'hermione',
            textEn: claimTextEn,
        },
        expectedError:
            /without claim-level Event provenance/u,
    }, {
        invalidSegment: {
            type: 'narration',
            textEn: claimTextEn,
            historicalClaims: [{
                claimTextEn,
                sourceEventIds: [
                    'event_umbrella',
                ],
            }],
        },
        expectedError:
            /historicalClaims/u,
    }, {
        invalidSegment: {
            type: 'dialogue',
            actorId: 'ron',
            textEn: claimTextEn,
            historicalClaims: [{
                claimTextEn,
                sourceEventIds: [
                    'event_umbrella',
                ],
            }],
        },
        expectedError:
            /actor ron cannot access supporting Event\(s\) event_umbrella/u,
    }];

    for (const scenario of cases) {
        const prompts = [];
        await assert.rejects(
            () =>
                runTask12Performance(
                    [{
                        segments: [
                            scenario.invalidSegment,
                        ],
                    }],
                    prompts,
                    state,
                ),
            scenario.expectedError,
        );
        assert.equal(prompts.length, 1);
    }
});

test('[Task 14.1] production low Opening treats unmarked literary past as current scene prose', async () => {
    const prompts = [];
    const claimTextEn =
        'Hermione hid Tina\'s umbrella behind the armour.';
    const response = {
        segments: [
            {
                type: 'narration',
                textEn: claimTextEn,
            },
            {
                type: 'narration',
                textEn:
                    'The Library smells of rain and old parchment.',
            },
        ],
    };
    const workflow =
        createSceneTransitionWorkflow(
            createTransitionPorts(
                async (_slot, prompt) => {
                    prompts.push(prompt);
                    return {
                        content:
                            JSON.stringify(
                                response,
                            ),
                    };
                },
                () => ({
                    valid: true,
                    errors: [],
                }),
            ),
        );
    await workflow
        .generateSceneTransitionOpening(
            {
                profileId: 'low',
                tier: 'low',
            },
            createState(),
            {
                nextClock:
                    '1991-09-04 · 09:45',
                nextScene: {
                    id: 'scene_library',
                    nameEn: 'Library',
                    summaryEn:
                        'The Library waits.',
                    mapId:
                        'hogwarts_castle',
                    roomId: 'library',
                    actorStates: [{
                        id: 'hermione',
                        present: true,
                        mapId:
                            'hogwarts_castle',
                        roomId: 'library',
                        lifeStatus: 'alive',
                        currentActivityEn:
                            'Sorting notes.',
                        currentIntentEn:
                            'Finish the index.',
                    }],
                },
            },
            {
                mapId:
                    'hogwarts_castle',
                roomId: 'library',
            },
            createContextPlan(),
            {},
            createPrivateMemoryRetrieval(),
        );
    assert.equal(prompts.length, 1);
});
