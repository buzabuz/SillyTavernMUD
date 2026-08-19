/* eslint-disable playwright/expect-expect */
import {
    createDefaultCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    createLegacyTurnRollbackCheckpoint,
    createTurnRetryCheckpoint,
    findUnsettledTurn,
    getAvailableTurnRollbackCheckpoint,
    getFailedPlayerTurn,
    restoreTurnRetryCheckpoint,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('last-turn retry checkpoint restores one non-recursive pre-commit state', () => {
    const state = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    state.phase = 'playing';
    state.clock = '1991-07-24 · 14:35';
    state.turn = {
        count: 19,
        status: 'resolving',
        error: 'stale error',
        lastElapsedMinutes: 15,
        lastResolvedAt: 'earlier',
    };
    state.turnRetry = {
        version: 1,
        baseState: {
            shouldNotNest: true,
        },
    };
    const checkpoint =
        createTurnRetryCheckpoint(
            state,
            {
                playerMessageId: 41,
                assistantMessageId: 42,
                playerAction: 'I enter the shop.',
                forceCheck: true,
            },
        );

    assert.equal(checkpoint.baseClock, state.clock);
    assert.equal(checkpoint.forceCheck, true);
    assert.equal(
        checkpoint.baseState.turn.status,
        'idle',
    );
    assert.equal(
        checkpoint.baseState.turn.error,
        '',
    );
    assert.equal(
        checkpoint.baseState.turnRetry,
        undefined,
    );

    state.clock = '1991-07-24 · 14:50';
    checkpoint.baseState.turn.status = 'failed';
    checkpoint.baseState.turnRetry = {
        shouldBeRemoved: true,
    };
    checkpoint.playerAction =
        '→【后花园】';
    checkpoint.baseState
        .pacingDirector = {
            lastAssessedTurn: 19,
            signals: {
                playerAction:
                    '→【后花园】',
            },
        };
    const restored =
        restoreTurnRetryCheckpoint(
            checkpoint,
        );
    assert.equal(
        restored.clock,
        '1991-07-24 · 14:35',
    );
    assert.equal(restored.turn.status, 'idle');
    assert.equal(restored.turn.error, '');
    assert.equal(restored.turnRetry, undefined);
    assert.equal(
        restored.pacingDirector
            .lastAssessedTurn,
        19,
    );
    assert.notEqual(
        restored,
        checkpoint.baseState,
    );
    assert.throws(
        () => restoreTurnRetryCheckpoint({
            version: 1,
        }),
        /状态检查点/,
    );
    const chat = Array.from(
        {
            length: 43,
        },
        () => ({
            is_user: false,
        }),
    );
    chat[41] = {
        is_user: true,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    };
    chat[42] = {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
            },
        },
    };
    const committedState = {
        ...state,
        turn: {
            ...state.turn,
            status: 'idle',
        },
        turnRetry: checkpoint,
    };
    assert.equal(
        getAvailableTurnRollbackCheckpoint(
            committedState,
            chat,
        ),
        checkpoint,
    );
    chat.push({
        is_user: false,
    });
    assert.equal(
        getAvailableTurnRollbackCheckpoint(
            committedState,
            chat,
        ),
        null,
    );
});

test('legacy rollback projection stays removed after the V1 cutover', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-07-24 · 11:45';
    state.turn = {
        count: 2,
        status: 'idle',
        error: '',
        lastElapsedMinutes: 15,
    };
    state.map.currentLocalNodeId =
        'back_garden';
    state.scene.roomId =
        'back_garden';
    state.scene.timelineEntries = [
        {
            clock:
                '1991-07-24 · 11:30',
            label:
                'The previous turn.',
        },
        {
            clock:
                '1991-07-24 · 11:45',
            label:
                'The latest turn.',
        },
    ];
    state.spatial = {
        version: 7,
        player: {
            mapId:
                'zhang_home',
            roomId:
                'back_garden',
        },
        lastMovement: {
            attempted: true,
            moved: true,
            fromMapId:
                'zhang_home',
            fromRoomId:
                'kitchen',
            fromRoomName:
                '厨房',
            toMapId:
                'zhang_home',
            toRoomId:
                'back_garden',
            companionIds: [
                'minerva_mcgonagall',
            ],
        },
    };
    const minerva =
        state.actors.find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    minerva.mapId =
        'zhang_home';
    minerva.roomId =
        'back_garden';
    const chat = [
        {
            is_user: false,
            send_date:
                'previous',
            extra: {
                hogwartsMud: {
                    role:
                        'scene_turn',
                    turnTransaction: {
                        committedClock:
                            '1991-07-24 · 11:30',
                        elapsedMinutes:
                            15,
                        actorPresence: {
                            presentActorIdsAfterTurn: [
                                'minerva_mcgonagall',
                            ],
                        },
                        actorUpdates: [{
                            id:
                                'minerva_mcgonagall',
                            mapId:
                                'zhang_home',
                            roomId:
                                'kitchen',
                            currentActivityEn:
                                'Waiting in the kitchen.',
                        }],
                    },
                },
            },
        },
        {
            is_user: true,
            mes:
                '→【和麦格一起去后花园】',
            extra: {
                hogwartsMud: {
                    role:
                        'player_turn',
                    movement: {
                        attempted: true,
                        moved: false,
                        toMapId:
                            'zhang_home',
                        toRoomId:
                            'back_garden',
                    },
                },
            },
        },
        {
            is_user: false,
            extra: {
                hogwartsMud: {
                    role:
                        'scene_turn',
                    turnTransaction: {
                        committedClock:
                            '1991-07-24 · 11:45',
                        elapsedMinutes:
                            15,
                        actorPresence: {
                            presentActorIdsAfterTurn: [
                                'minerva_mcgonagall',
                            ],
                        },
                        actorUpdates: [],
                    },
                },
            },
        },
    ];

    const checkpoint =
        createLegacyTurnRollbackCheckpoint(
            state,
            chat,
        );
    assert.equal(checkpoint, null);
});

test('a failed trailing player turn remains recoverable without duplicating the input', () => {
    const playerMessage = {
        is_user: true,
        mes: 'I wait for the Hat.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck: true,
            },
        },
    };
    const chat = [
        {
            is_user: false,
            mes: 'The Hat begins to sing.',
            extra: {
                hogwartsMud: {
                    role: 'scene_turn',
                },
            },
        },
        playerMessage,
    ];
    assert.deepEqual(
        getFailedPlayerTurn(
            chat,
            {
                status: 'failed',
                error: 'Invalid JSON.',
            },
        ),
        {
            messageId: 1,
            playerAction:
                'I wait for the Hat.',
            forceCheck: true,
            error: 'Invalid JSON.',
        },
    );
    assert.equal(
        getFailedPlayerTurn(
            chat,
            { status: 'idle' },
        ),
        null,
    );
    assert.equal(
        getFailedPlayerTurn(
            [
                ...chat,
                {
                    is_user: false,
                    extra: {
                        hogwartsMud: {
                            role: 'scene_turn',
                        },
                    },
                },
            ],
            {
                status: 'failed',
                error: 'stale',
            },
        ),
        null,
    );
});

test('unsettled turn detection never replays an idle completed legacy assistant message', () => {
    const playerMessage = {
        is_user: true,
        mes: 'I wait for the Hat.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck: true,
            },
        },
    };
    const completedLegacyReply = {
        is_user: false,
        is_system: false,
        mes: 'The Hat finishes its answer.',
        extra: {},
    };
    const chat = [
        playerMessage,
        completedLegacyReply,
    ];

    assert.equal(
        findUnsettledTurn(
            chat,
            {
                status: 'idle',
            },
        ),
        null,
    );
    assert.deepEqual(
        findUnsettledTurn(
            chat,
            {
                status:
                    'resolving',
            },
        ),
        {
            playerMessageId: 0,
            assistantMessageId: 1,
            playerAction:
                'I wait for the Hat.',
            forceCheck: true,
        },
    );
});

test('unsettled turn detection resumes only an explicit trailing player turn', () => {
    const pending = {
        is_user: true,
        mes: 'I try the feather again.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck: false,
            },
        },
    };

    assert.deepEqual(
        findUnsettledTurn(
            [pending],
            {
                status: 'idle',
            },
        ),
        {
            playerMessageId: 0,
            assistantMessageId:
                null,
            playerAction:
                'I try the feather again.',
            forceCheck: false,
        },
    );
    assert.equal(
        findUnsettledTurn(
            [pending],
            {
                status: 'failed',
            },
        ),
        null,
    );
    assert.equal(
        findUnsettledTurn(
            [{
                ...pending,
                extra: {},
            }],
            {
                status: 'idle',
            },
        ),
        null,
    );
});

test('turn settlement ignores legacy item updates without prose-based acquisition fallback', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-07-24 · 16:10';
    state.map.activeMapId =
        'diagon_alley';
    state.map.currentLocalNodeId =
        'ollivanders';
    state.scene.mapId =
        'diagon_alley';
    state.scene.roomId =
        'ollivanders';
    state.actors =
        state.actors.map(actor => ({
            ...actor,
            mapId:
                'diagon_alley',
            roomId:
                'ollivanders',
            locationKnown: true,
        }));
    const transaction = {
        elapsedMinutes: 15,
        publicEventEn:
            'Ollivander completed the purchase and the holly wand now belongs to Tina.',
        segments: [{
            type: 'narration',
            textEn:
                'The boxed holly wand passed across the counter into Tina\'s possession.',
        }],
        actorUpdates: [],
        itemUpdates: [{
            id: 'holly_phoenix_wand',
            action: 'acquire',
            labelEn: 'Holly Wand',
            detailEn:
                'Twelve and a quarter inches with a phoenix feather core.',
            importance: 'key',
            custody: 'carried',
            ownerId: 'player',
            status: 'available',
        }],
        revealedClues: [],
    };
    const next = applyTurnTransaction(
        state,
        transaction,
        'I accept the wand.',
    );
    assert.equal(next.items.length, 0);

    const missingWand =
        structuredClone(transaction);
    missingWand.itemUpdates = [];
    const missingResult =
        applyTurnTransaction(
            state,
            missingWand,
            'I accept the wand.',
        );
    assert.equal(
        missingResult.items.length,
        0,
    );

    const food = {
        ...transaction,
        publicEventEn:
            'Tina bought and ate a caramel pasty.',
        segments: [{
            type: 'narration',
            textEn:
                'The pasty was gone before she left the cart.',
        }],
        itemUpdates: [{
            id: 'caramel_pasty',
            action: 'acquire',
            labelEn: 'Caramel Pasty',
            detailEn: 'A warm street snack.',
            importance: 'ordinary',
            custody: 'carried',
            ownerId: 'player',
        }],
    };
    const consumed =
        applyTurnTransaction(
            state,
            food,
            'I eat the pasty.',
        );
    assert.equal(
        consumed.items.length,
        0,
    );
    const kept = applyTurnTransaction(
        state,
        food,
        'I keep the pasty in my bag.',
    );
    assert.equal(
        kept.items.length,
        0,
    );
});
