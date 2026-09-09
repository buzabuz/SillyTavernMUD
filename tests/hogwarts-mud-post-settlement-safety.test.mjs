/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assemblePostTurnSemanticPrompt,
    createPostTurnProviderCapacity,
} from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-prompt-assembly.js';
import {
    createPendingPostSettlement,
    findPendingPostSettlement,
    isPendingPostSettlementCurrent,
    isPendingPostSettlementTail,
    migrateLegacyPendingMovementSettlement,
    synchronizePendingPostSettlementRevision,
} from '../public/scripts/extensions/hogwarts-mud/domain/pending-post-settlement.js';
import {
    createRoleTransportEnvelope,
    createTaskPromptBudget,
    measurePromptMessages,
} from '../public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js';
import {
    LOW_POST_TURN_TRANSPORT_JSON_SCHEMA,
} from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';
import {
    createTurnRetryCheckpoint,
    restoreTurnRetryCheckpoint,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';
import {
    createTurnWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';

function createPostInput() {
    return {
        clock: '1991-09-01 · 12:00',
        elapsedMinutes: 1,
        playerAction: 'I wait for Hermione.',
        playerTurnSequence: [],
        targetActorIds: ['hermione'],
        narrativeSegments: [{
            type: 'narration',
            actorId: 'hermione',
            textEn: 'Hermione nods.',
        }],
        room: {
            currentRoomId: 'classroom',
            exits: [{
                id: 'stairs',
                note: 'e'.repeat(1_400),
            }],
            rooms: [
                {
                    id: 'classroom',
                    note: 'current',
                },
                {
                    id: 'storage',
                    note: 'r'.repeat(1_400),
                },
            ],
        },
        actors: [
            {
                id: 'hermione',
                roomId: 'classroom',
            },
            {
                id: 'ron',
                roomId: 'storage',
                note: 'a'.repeat(1_400),
            },
        ],
        localPresence: {
            occupantActorIds: ['hermione'],
            cohortIds: ['c'.repeat(1_400)],
        },
        existingActorPresence: {
            note: 'p'.repeat(1_400),
        },
    };
}

test('a complete Post request above the old local target uses selected Low capacity', () => {
    const input = createPostInput();
    input.playerTurnSequence = [];
    input.existingActorPresence = null;
    input.localPresence = null;
    input.actors = [];
    input.room.exits = [];
    input.room.rooms = [];
    const lowSlot = {
        profileId: 'low-profile',
        contextSize: 32_768,
        maxResponseLength: 512,
    };
    const baseline =
        assemblePostTurnSemanticPrompt({
            provider: 'low',
            input,
            lowSlot,
        }).diagnostics.fullMeasurement;
    const requestCharacters = baseline.characters + 1_000;
    input.narrativeSegments[0].textEn =
        'n'.repeat(
            input.narrativeSegments[0].textEn.length +
            requestCharacters -
            baseline.characters,
        );
    const result =
        assemblePostTurnSemanticPrompt({
            provider: 'low',
            input,
            lowSlot,
        });

    assert.equal(
        result.diagnostics
            .fullMeasurement
            .characters,
        requestCharacters,
    );
    assert.ok(
        result.diagnostics
            .fullMeasurement
            .runtimeWrapperCharacters >
        0,
    );
    assert.ok(
        result.diagnostics
            .fullMeasurement
            .estimatedTokens >
        0,
    );
    assert.equal(result.fit, true);
    const transportEnvelope =
        createRoleTransportEnvelope({
            maxResponseLength:
                lowSlot.maxResponseLength,
            json: true,
            jsonSchema:
                LOW_POST_TURN_TRANSPORT_JSON_SCHEMA,
        });
    assert.deepEqual(
        result.diagnostics
            .fullMeasurement,
        {
            ...measurePromptMessages(
                result.messages,
                {
                    transportJsonSchema:
                        transportEnvelope
                            .transportJsonSchema,
                    runtimeWrapper:
                        transportEnvelope
                            .runtimeWrapper,
                },
            ),
            estimatedTokens:
                result.diagnostics
                    .fullMeasurement
                    .estimatedTokens,
            estimatedMessageTokens:
                result.diagnostics
                    .fullMeasurement
                    .estimatedMessageTokens,
            estimatedSchemaTokens:
                result.diagnostics
                    .fullMeasurement
                    .estimatedSchemaTokens,
            estimatedWrapperTokens:
                result.diagnostics
                    .fullMeasurement
                    .estimatedWrapperTokens,
        },
        'Low Post assembly must use the scheduler transport envelope',
    );
    assert.deepEqual(
        result.diagnostics
            .compactedSections,
        [],
    );
    assert.deepEqual(
        result.input,
        input,
    );
    assert.ok(
        result.diagnostics
            .capacity
            .maximumCharacters >=
        requestCharacters,
    );
    assert.equal(
        createTaskPromptBudget(
            'post_turn_semantic_proposal',
            {
                runtimeMaximumCharacters:
                    result.diagnostics
                        .capacity
                        .maximumCharacters,
            },
        ).effectiveMaximumCharacters,
        result.diagnostics
            .capacity
            .maximumCharacters,
    );
});

test('Post assembly compacts only approved sections in deterministic order', () => {
    const input = createPostInput();
    input.targetActorIds = [];
    input.playerTurnSequence = [{
        note: 's'.repeat(1_400),
    }];
    const compacted = structuredClone(input);
    delete compacted.existingActorPresence;
    delete compacted.playerTurnSequence;
    delete compacted.localPresence;
    compacted.actors = compacted.actors.filter(actor => actor.id === 'hermione');
    delete compacted.room.exits;
    const protectedSize = assemblePostTurnSemanticPrompt({
        provider: 'local', input: compacted,
    }).diagnostics.fullMeasurement.characters;
    const result =
        assemblePostTurnSemanticPrompt({
            provider: 'local',
            input,
            localCapacity: {
                contextTokens: protectedSize + 1_024,
                responseReserveTokens: 1_000,
                estimatedCharactersPerToken: 1,
            },
        });

    assert.equal(result.fit, true);
    assert.deepEqual(
        result.diagnostics
            .compactedSections
            .map(section =>
                section.key),
        [
            'existingActorPresence',
            'playerTurnSequence',
            'localPresence.cohortIds',
            'localPresence',
            'actors',
            'room.exits',
        ],
    );
    assert.equal(
        result.input.playerAction,
        input.playerAction,
    );
    assert.deepEqual(
        result.input.narrativeSegments,
        input.narrativeSegments,
    );
    assert.deepEqual(
        result.input.actors.map(actor =>
            actor.id),
        ['hermione'],
    );
});

test('protected Post content produces no-fit rather than string truncation', () => {
    const input = createPostInput();
    input.movementPreflight = {
        triggered: true,
        candidateMapId: 'hogwarts_castle',
        candidateRoomId: 'classroom',
        routeRoomIds: ['classroom'],
    };
    const result =
        assemblePostTurnSemanticPrompt({
            provider: 'local',
            input,
            localCapacity: {
                contextTokens: 1_000,
                responseReserveTokens: 500,
                estimatedCharactersPerToken: 4,
            },
        });

    assert.equal(result.fit, false);
    assert.equal(
        result.input.playerAction,
        input.playerAction,
    );
    assert.deepEqual(
        result.input.narrativeSegments,
        input.narrativeSegments,
    );
    assert.deepEqual(
        result.input.movementPreflight,
        input.movementPreflight,
    );
});

test('room compaction retains only rooms needed by retained Actors', () => {
    const input = createPostInput();
    input.targetActorIds = [];
    input.room.rooms[1].note =
        'r'.repeat(8_000);
    const result =
        assemblePostTurnSemanticPrompt({
            provider: 'local',
            input,
            localCapacity: {
                contextTokens: 13_500,
                responseReserveTokens: 500,
                estimatedCharactersPerToken: 1,
            },
        });

    assert.ok(
        result.diagnostics
            .compactedSections
            .some(section =>
                section.key ===
                'room.rooms'),
    );
    assert.deepEqual(
        result.input.room.rooms.map(room =>
            room.id),
        ['classroom'],
    );
});

test('pending Post settlement requires a current tail pair and migrates legacy movement pending', () => {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 7;
    state.turn = {
        ...state.turn,
        status: 'post_unsettled',
    };
    const pending =
        createPendingPostSettlement({
            state,
            playerMessageId: 0,
            sceneMessageId: 1,
            transactionDraft: {
                segments: [],
            },
            failureCode: 'post_no_fit',
        });
    const chat = [{
        is_user: true,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    }, {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
                pendingPostSettlement:
                    pending,
            },
        },
    }];

    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            pending,
        ),
        true,
    );
    assert.equal(
        isPendingPostSettlementTail(
            chat,
            pending,
        ),
        true,
    );
    chat.push({
        is_user: false,
    });
    assert.equal(
        isPendingPostSettlementTail(
            chat,
            pending,
        ),
        false,
    );
    chat.pop();
    const legacyState =
        structuredClone(state);
    legacyState.turn.status =
        'resolving';
    delete chat[1].extra
        .hogwartsMud
        .pendingPostSettlement;
    chat[1].extra.hogwartsMud
        .pendingTurnSettlement = {
            version: 1,
            playerMessageId: 0,
            sceneMessageId: 1,
            timelineEpoch: 'timeline-a',
            stateRevision: 7,
            sceneId: state.scene.id,
            transactionDraft: {
                segments: [],
            },
        };
    const migration =
        migrateLegacyPendingMovementSettlement(
            legacyState,
            chat,
        );

    assert.equal(migration.changed, true);
    assert.equal(
        migration.state.turn.status,
        'post_unsettled',
    );
    assert.equal(
        chat[1].extra.hogwartsMud
            .pendingTurnSettlement,
        undefined,
    );
    assert.equal(
        findPendingPostSettlement(
            chat,
        )?.pending.preTurnCheckpoint,
        null,
    );
    assert.equal(
        findPendingPostSettlement(
            chat,
        )?.pending.retryable,
        false,
    );
    assert.equal(
        findPendingPostSettlement(
            chat,
        )?.pending.discardable,
        false,
    );
});

test('lifecycle migration advances a pending Post revision guard exactly once', () => {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 8;
    state.revisionHistory = [{
        baseRevision: 7,
        revision: 8,
        source: 'lifecycle_migration',
    }];
    state.turn = {
        ...state.turn,
        status: 'post_unsettled',
    };
    const pending =
        createPendingPostSettlement({
            state: {
                ...state,
                stateRevision: 7,
            },
            playerMessageId: 0,
            sceneMessageId: 1,
            transactionDraft: {
                segments: [],
            },
            preTurnCheckpoint: {
                version: 1,
            },
            failureCode: 'post_provider_failed',
        });
    const chat = [{
        is_user: true,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    }, {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
                pendingPostSettlement:
                    pending,
            },
        },
    }];

    assert.equal(
        synchronizePendingPostSettlementRevision(
            state,
            chat,
        ),
        true,
    );
    assert.equal(pending.stateRevision, 8);
    assert.equal(
        synchronizePendingPostSettlementRevision(
            state,
            chat,
        ),
        false,
    );
});

test('empty metadata plus lifecycle revisions preserve Post retry eligibility', () => {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 9;
    state.revisionHistory = [{
        baseRevision: 7,
        revision: 8,
        source: 'metadata',
        changedDomains: [],
    }, {
        baseRevision: 8,
        revision: 9,
        source: 'lifecycle_migration',
        changedDomains: [
            'migration',
        ],
    }];
    state.turn = {
        ...state.turn,
        status: 'post_unsettled',
    };
    const pending =
        createPendingPostSettlement({
            state: {
                ...state,
                stateRevision: 7,
            },
            playerMessageId: 0,
            sceneMessageId: 1,
            transactionDraft: {
                segments: [],
            },
            preTurnCheckpoint: {
                version: 1,
            },
            failureCode: 'post_guard_failed',
        });
    const chat = [{
        is_user: true,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    }, {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
                pendingPostSettlement:
                    pending,
            },
        },
    }];

    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            pending,
        ),
        true,
    );
    assert.equal(
        synchronizePendingPostSettlementRevision(
            state,
            chat,
        ),
        true,
    );
    assert.equal(
        pending.stateRevision,
        state.stateRevision,
    );
});

test('empty metadata cannot bypass pending revision continuity', () => {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 9;
    state.revisionHistory = [{
        baseRevision: 2,
        revision: 8,
        source: 'metadata',
        changedDomains: [],
    }, {
        baseRevision: 8,
        revision: 9,
        source: 'lifecycle_migration',
        changedDomains: [
            'migration',
        ],
    }];
    state.turn = {
        ...state.turn,
        status: 'post_unsettled',
    };
    const pending =
        createPendingPostSettlement({
            state: {
                ...state,
                stateRevision: 7,
            },
            playerMessageId: 0,
            sceneMessageId: 1,
            transactionDraft: {
                segments: [],
            },
            preTurnCheckpoint: {
                version: 1,
            },
            failureCode: 'post_guard_failed',
        });
    const chat = [{
        is_user: true,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    }, {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
                pendingPostSettlement:
                    pending,
            },
        },
    }];

    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            pending,
        ),
        false,
    );
    assert.equal(
        synchronizePendingPostSettlementRevision(
            state,
            chat,
        ),
        false,
    );
    assert.equal(
        pending.stateRevision,
        7,
    );
});

function createPendingWorkflowHarness({
    postResult = null,
    advanceRevisionOnMetadataSave = false,
    failAtomicCommit = false,
    advanceRevisionDuringPost = false,
    movementPreflight = null,
} = {}) {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 7;
    const checkpoint =
        createTurnRetryCheckpoint(
            state,
            {
                playerMessageId: 0,
                assistantMessageId: 1,
                playerAction:
                    'I wait for Hermione.',
            },
        );
    const context = {
        chat: [{
            is_user: true,
            mes: 'I wait for Hermione.',
            extra: {
                hogwartsMud: {
                    role: 'player_turn',
                },
            },
        }, {
            is_user: false,
            mes: 'Hermione nods.',
            extra: {
                hogwartsMud: {
                    role: 'scene_turn',
                    segments: [{
                        type: 'narration',
                        textEn: 'Hermione nods.',
                    }],
                },
            },
        }],
        chatMetadata: {
            hogwartsMud: state,
        },
        saveMetadata: async () => {
            if (advanceRevisionOnMetadataSave) {
                context.chatMetadata
                    .hogwartsMud
                    .stateRevision += 1;
            }
        },
        saveChat: async () => {},
    };
    let atomicCommitCalls = 0;
    const pending =
        createPendingPostSettlement({
            state,
            playerMessageId: 0,
            sceneMessageId: 1,
            transactionDraft: {
                elapsedMinutes: 1,
                segments: [{
                    type: 'narration',
                    textEn: 'Hermione nods.',
                }],
                actorPresence: {
                    presentActorIdsAfterTurn: [],
                },
            },
            preTurnCheckpoint: checkpoint,
            movementPreflight,
            failureCode: 'post_provider_failed',
        });
    context.chat[1].extra.hogwartsMud
        .pendingPostSettlement =
        pending;
    state.turn = {
        ...state.turn,
        status: 'post_unsettled',
        error: '',
    };
    let postCalls = 0;
    const workflow =
        createTurnWorkflow({
            getContext: () => context,
            getMudState: () =>
                context.chatMetadata
                    .hogwartsMud,
            guardedRewriteTimeline:
                async ({
                    currentState,
                    nextState,
                    nextChat,
                    source,
                }) => {
                    if (source === 'turn_post_commit') atomicCommitCalls++;
                    if (failAtomicCommit && source === 'turn_post_commit') {
                        const previousState =
                            structuredClone(
                                context
                                    .chatMetadata
                                    .hogwartsMud,
                            );
                        const previousChat =
                            structuredClone(
                                context.chat,
                            );
                        context.chatMetadata
                            .hogwartsMud =
                            structuredClone(
                                nextState,
                            );
                        context.chat.splice(
                            0,
                            context.chat.length,
                            ...structuredClone(
                                nextChat,
                            ),
                        );
                        context.chatMetadata
                            .hogwartsMud =
                            previousState;
                        context.chat.splice(
                            0,
                            context.chat.length,
                            ...previousChat,
                        );
                        throw new Error(
                            'Atomic commit failed.',
                        );
                    }
                    assert.equal(
                        currentState
                            .stateRevision,
                        context.chatMetadata
                            .hogwartsMud
                            .stateRevision,
                    );
                    context.chatMetadata
                        .hogwartsMud =
                        nextState;
                    context.chat.splice(
                        0,
                        context.chat.length,
                        ...structuredClone(
                            nextChat,
                        ),
                    );
                    return {
                        ok: true,
                        state: nextState,
                    };
                },
            jobRegistry: {
                turnActive: false,
                sceneTransitionActive: false,
                turnSettlement: new Map(),
            },
            renderAll: () => {},
            applySystemPrompt: () => {},
            restoreTurnRetryCheckpoint,
            applyTurnTransaction: current => ({
                ...current,
                turn: {
                    ...current.turn,
                    count:
                        Number(
                            current.turn?.count ||
                            0,
                        ) + 1,
                    status: 'idle',
                    error: '',
                },
            }),
            applyPresenceWitnessTransaction:
                current => current,
            buildLocalSemanticRoomContext: () => ({
                rooms: [],
            }),
            composeSceneSegments: segments =>
                segments
                    .map(segment =>
                        segment.textEn)
                    .join('\n'),
            consumePacingBeat:
                current => current,
            extractSpellCandidates: () => [],
            partitionItemProposals: () => ({
                operations: [],
                candidates: [],
            }),
            applyObservedActorUpdates: () => {},
            reconcileTurnActorPresenceWithSpatialState:
                transaction => transaction,
            reduceLocalPresence: () => ({
                occupantActorIds: [],
                cohortIds: [],
            }),
            resolveEventWitnesses: () => null,
            updateNativeMessageBlock: () => {},
            validateTurnTransaction: () => ({ valid: true, errors: [] }),
            requestPostTurnSemanticObservation:
                async (_state, _action, _transaction, options) => {
                    await options.beforeDispatch?.();
                    postCalls++;
                    if (
                        advanceRevisionDuringPost
                    ) {
                        context.chatMetadata
                            .hogwartsMud
                            .stateRevision += 1;
                    }
                    return postResult || {
                        postSettlementFailure: true,
                        failureCode:
                            'post_provider_failed',
                    };
                },
        });

    return {
        context,
        get postCalls() {
            return postCalls;
        },
        get atomicCommitCalls() {
            return atomicCommitCalls;
        },
        workflow,
    };
}

test('one failed supplement settles optional fields with defaults and retains prose', async () => {
    const harness =
        createPendingWorkflowHarness();

    const result =
        await harness.workflow
            .retryPendingPostSettlement();

    assert.equal(harness.postCalls, 1);
    assert.deepEqual(result, {
        settled: true,
    });
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(
        harness.context.chat[1].extra
            .hogwartsMud
            .pendingPostSettlement,
        undefined,
    );
});

test('pending guard advances with the save revision that persisted it', async () => {
    const harness =
        createPendingWorkflowHarness({
            advanceRevisionOnMetadataSave: true,
            movementPreflight: {
                triggered: true, eligibility: 'eligible',
                candidateMapId: 'hogwarts_castle', candidateRoomId: 'classroom',
            },
        });

    await harness.workflow
        .retryPendingPostSettlement();

    const state =
        harness.context.chatMetadata
            .hogwartsMud;
    const pending =
        harness.context.chat[1].extra
            .hogwartsMud
            .pendingPostSettlement;
    assert.equal(
        pending.stateRevision,
        state.stateRevision,
    );
    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            pending,
        ),
        true,
    );
    state.stateRevision = 8;
    state.revisionHistory = [{
        baseRevision: 7,
        revision: 8,
        source: 'metadata',
        changedDomains: [],
    }];
    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            {
                ...pending,
                version: 2,
                stateRevision: 7,
            },
        ),
        true,
    );
    state.revisionHistory[0].changedDomains = [
        'world',
    ];
    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            {
                ...pending,
                version: 1,
                stateRevision: 7,
            },
        ),
        false,
    );
});

test('incomplete legacy pending without a checkpoint cannot fabricate discard authority', () => {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 7;
    state.turn = {
        ...state.turn,
        status: 'movement_unsettled',
    };
    const chat = [{
        is_user: true,
        mes: 'I wait for Hermione.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    }, {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
                pendingTurnSettlement: {
                    version: 1,
                    playerMessageId: 0,
                    sceneMessageId: 1,
                    timelineEpoch: 'timeline-a',
                    stateRevision: 7,
                    sceneId: state.scene.id,
                },
            },
        },
    }];
    const migration =
        migrateLegacyPendingMovementSettlement(
            state,
            chat,
        );

    assert.equal(migration.changed, true);
    assert.equal(
        chat[1].extra.hogwartsMud
            .pendingPostSettlement
            .retryable,
        false,
    );
    assert.equal(
        chat[1].extra.hogwartsMud
            .pendingPostSettlement
            .discardable,
        false,
    );
});

test('successful Retry Post commits the saved turn once without follow-up model work', async () => {
    const harness =
        createPendingWorkflowHarness({
            postResult: {
                observation: {
                    result: {
                        playerMovement: null,
                        actorUpdates: [],
                    },
                    diagnostics: {
                        provider: 'low',
                    },
                },
                narrativeText: 'Hermione nods.',
                materialEvents: [],
                itemUpdates: [],
                identityObservations: [],
                temporalDiagnostics: {
                    valid: true,
                    accepted: 0,
                    rejected: 0,
                },
                perception: null,
                targetActorIds: [],
            },
        });

    const result =
        await harness.workflow
            .retryPendingPostSettlement();

    assert.deepEqual(result, {
        settled: true,
    });
    assert.equal(harness.postCalls, 1);
    assert.equal(
        harness.atomicCommitCalls,
        1,
    );
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(
        harness.context.chat[1].extra
            .hogwartsMud
            .pendingPostSettlement,
        undefined,
    );
    assert.ok(
        harness.context.chat[1].extra
            .hogwartsMud
            .turnTransaction,
    );
});

test('Retry Post persistence failure leaves the saved Scene pending without a partial commit', async () => {
    const harness =
        createPendingWorkflowHarness({
            failAtomicCommit: true,
            postResult: {
                observation: {
                    result: {
                        playerMovement: null,
                        actorUpdates: [],
                    },
                    diagnostics: {
                        provider: 'low',
                    },
                },
                narrativeText:
                    'Hermione nods.',
                materialEvents: [],
                itemUpdates: [],
                identityObservations: [],
                temporalDiagnostics: {
                    valid: true,
                    accepted: 0,
                    rejected: 0,
                },
                perception: null,
                targetActorIds: [],
            },
        });

    await assert.rejects(
        () =>
            harness.workflow
                .retryPendingPostSettlement(),
        /Atomic commit failed/u,
    );
    assert.equal(harness.postCalls, 1);
    assert.equal(
        harness.atomicCommitCalls,
        1,
    );
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud
            .turn.status,
        'post_unsettled',
    );
    assert.equal(
        harness.context.chat[1].extra
            .hogwartsMud
            .pendingPostSettlement
            .failureCode,
        'post_guard_failed',
    );
});

test('Retry Post rejects a substantive revision change that occurs while the model is running', async () => {
    const harness =
        createPendingWorkflowHarness({
            advanceRevisionDuringPost:
                true,
            postResult: {
                observation: {
                    result: {
                        playerMovement: null,
                        actorUpdates: [],
                    },
                    diagnostics: {
                        provider: 'low',
                    },
                },
                narrativeText:
                    'Hermione nods.',
                materialEvents: [],
                itemUpdates: [],
                identityObservations: [],
                temporalDiagnostics: {
                    valid: true,
                    accepted: 0,
                    rejected: 0,
                },
                perception: null,
                targetActorIds: [],
            },
        });

    await assert.rejects(
        () =>
            harness.workflow
                .retryPendingPostSettlement(),
        /State changed before retry commit/u,
    );
    assert.equal(
        harness.atomicCommitCalls,
        0,
    );
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud
            .turn.status,
        'post_unsettled',
    );
});

test('blocking Retry movement preserves its bounded reason in the pending draft', async () => {
    const movementPreflight = {
        triggered: true,
        eligibility: 'eligible',
        mode: 'direct_room',
        candidateMapId:
            'hogwarts_castle',
        candidateRoomId:
            'back_garden',
        eligibleCompanionActorIds: [],
    };
    const harness =
        createPendingWorkflowHarness({
            movementPreflight,
            postResult: {
                observation: {
                    result: {
                        playerMovement: {
                            outcome: 'moved',
                            destinationMapId:
                                'hogwarts_castle',
                            destinationRoomId:
                                'wrong_room',
                            accompanyingActorIds:
                                [],
                            evidenceText:
                                'Hermione nods.',
                        },
                        actorUpdates: [],
                    },
                    diagnostics: {
                        provider: 'low',
                    },
                },
                narrativeText:
                    'Hermione nods.',
                materialEvents: [],
                itemUpdates: [],
                identityObservations: [],
                temporalDiagnostics: {
                    valid: true,
                    accepted: 0,
                    rejected: 0,
                },
                perception: null,
                targetActorIds: [],
            },
        });

    const result =
        await harness.workflow
            .retryPendingPostSettlement();

    assert.deepEqual(result, {
        settled: false,
    });
    const pending =
        harness.context.chat[1]
            .extra.hogwartsMud
            .pendingPostSettlement;
    assert.equal(
        pending.failureCode,
        'post_candidate_rejected',
    );
    assert.deepEqual(
        pending.transactionDraft
            .settlementWarnings,
        [{
            code:
                'post_movement_blocked',
            detail:
                'movement_destination_mismatch',
        }],
    );
});

test('Discard Post settlement invokes no model and restores the input pair', async () => {
    const harness =
        createPendingWorkflowHarness();

    const result =
        await harness.workflow
            .discardPendingPostSettlement();

    assert.equal(harness.postCalls, 0);
    assert.equal(
        harness.context.chat.length,
        0,
    );
    assert.equal(
        harness.context.chatMetadata
            .hogwartsMud
            .turn.status,
        'idle',
    );
    assert.equal(
        result.playerAction,
        'I wait for Hermione.',
    );
});

test('loading a pending Post turn never replays a model call', async () => {
    const harness =
        createPendingWorkflowHarness();

    await harness.workflow
        .processUnsettledTurn();

    assert.equal(harness.postCalls, 0);
});

test('Post pending blocks the scene-transition workflow before any write or call', async () => {
    let modelCalls = 0;
    const workflow =
        createSceneTransitionWorkflow({
            getContext: () => ({
                chat: [],
                chatMetadata: {
                    hogwartsMud: {
                        phase: 'playing',
                    },
                },
            }),
            getMudState: () => ({
                phase: 'playing',
                turn: {
                    status: 'post_unsettled',
                },
                scene: {
                    id: 'scene_current',
                },
            }),
            jobRegistry: {
                calendarMoment: null,
                sceneTransition: null,
            },
            generateSceneTransition:
                async () => {
                    modelCalls++;
                },
        });

    await assert.rejects(
        workflow.runSceneTransition(),
        /Post 结算尚未完成/u,
    );
    assert.equal(modelCalls, 0);
});

test('Local capacity is independent from Low role capacity', () => {
    const low =
        createPostTurnProviderCapacity(
            'low',
            {
                lowSlot: {
                    contextSize: 120_000,
                    maxResponseLength: 12_000,
                },
            },
        );
    const local =
        createPostTurnProviderCapacity(
            'local',
            {
                localCapacity: {
                    contextTokens: 8_192,
                    responseReserveTokens: 1_024,
                    estimatedCharactersPerToken: 4,
                },
            },
        );

    assert.equal(local.contextSize, 8_192);
    assert.equal(local.responseReserve, 1_024);
    assert.notEqual(
        local.maximumCharacters,
        low.maximumCharacters,
    );
});
