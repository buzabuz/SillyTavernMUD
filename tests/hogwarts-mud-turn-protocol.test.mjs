/* eslint-disable playwright/expect-expect */
import {
    buildBehavioralEnvironment,
} from '../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import {
    NARRATIVE_TURN_PROTOCOL_VERSION,
    settleNarrativeTurnPerformance,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    validateScenePerformance,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import {
    runTurnSettlementGraph,
} from '../src/hogwarts-mud/turn-settlement-graph.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('behavioral environment deterministically turns clock and weather into action constraints', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-09-02 · 02:20';
    state.map.activeMapId =
        'hogwarts_castle';
    state.map.currentLocalNodeId =
        'great_hall';
    state.scene.mapId =
        'hogwarts_castle';
    state.scene.roomId =
        'great_hall';

    const first =
        buildBehavioralEnvironment(
            state,
        );
    const repeated =
        buildBehavioralEnvironment(
            structuredClone(state),
        );

    assert.deepEqual(
        repeated,
        first,
    );
    assert.equal(
        first.period,
        'deep_night',
    );
    assert.equal(
        first.daylight,
        'dark',
    );
    assert.equal(
        first.curfewActive,
        true,
    );
    assert.equal(
        first.sleepPressure,
        'high',
    );
    assert.equal(
        first.exposure,
        'indoor',
    );
    assert.match(
        first.behavioralConstraintsEn
            .join(' '),
        /asleep|preparing to sleep/iu,
    );
    assert.match(
        first.behavioralConstraintsEn
            .join(' '),
        /remain outside/iu,
    );

    state.map.activeMapId =
        'hogwarts_grounds';
    state.map.currentLocalNodeId =
        'main_courtyard';
    state.scene.mapId =
        'hogwarts_grounds';
    state.scene.roomId =
        'main_courtyard';
    const outdoor =
        buildBehavioralEnvironment(
            state,
        );

    assert.equal(
        outdoor.exposure,
        'outdoor',
    );
    assert.match(
        outdoor.behavioralConstraintsEn
            .join(' '),
        /exposed to/iu,
    );

    state.map.customLocalMaps = [{
        id:
            'display_name_trap',
        nodes: [{
            id:
                'sunny_garden',
            nameEn:
                'Sunny Garden',
            kind:
                'room',
            tags: [],
        }],
    }];
    state.map.activeMapId =
        'display_name_trap';
    state.map.currentLocalNodeId =
        'sunny_garden';
    state.scene.mapId =
        'display_name_trap';
    state.scene.roomId =
        'sunny_garden';
    assert.equal(
        buildBehavioralEnvironment(
            state,
        ).exposure,
        'indoor',
    );

    state.map.customLocalMaps[0]
        .nodes[0].kind =
        'garden';
    assert.equal(
        buildBehavioralEnvironment(
            state,
        ).exposure,
        'outdoor',
    );
});

test('narrative-first turn settlement accepts segments without the metadata customs form', async () => {
    const state =
        createCurrentPlayingState();
    const payload = {
        publicEventEn:
            'The player completes the stated action and the characters respond.',
        segments: [
            {
                type: 'narration',
                textEn:
                    'McGonagall folds the reply slip and sets it beside the cooling teapot.',
            },
            {
                type: 'dialogue',
                actorId:
                    'minerva_mcgonagall',
                textEn:
                    'That will do, Miss Zhang.',
            },
        ],
    };
    const settled =
        await runTurnSettlementGraph({
            payload,
            worldState: state,
            playerAction:
                'I watch McGonagall.',
            admittedActors: [],
            movementResolution: null,
            momentumDirective: null,
            checkResolution: null,
        });

    assert.equal(
        settled.protocolVersion,
        NARRATIVE_TURN_PROTOCOL_VERSION,
    );
    assert.match(
        settled.publicEventEn,
        /McGonagall folds the reply slip/iu,
    );
    assert.equal(
        Object.hasOwn(
            settled,
            'eventEnded',
        ),
        false,
    );
    assert.equal(
        settled.checkApplied,
        false,
    );
    assert.deepEqual(
        new Set(
            settled.actorPresence
                .presentActorIdsAfterTurn,
        ),
        new Set(
            state.actors
                .filter(actor =>
                    actor.present !==
                        false)
                .map(actor =>
                    actor.id),
        ),
    );
    assert.deepEqual(
        validateScenePerformance(
            settled,
            state,
            {
                elapsedMinutes: 15,
            },
        ),
        {
            valid: true,
            errors: [],
        },
    );
});

test('narrative-first settlement folds sparse exits and drops invalid proposals without losing prose', async () => {
    const state =
        createCurrentPlayingState();
    const payload = {
        segments: [{
            type: 'narration',
            textEn:
                'McGonagall leaves the kitchen while Tina remains beside the table.',
        }],
        stateProposals: [
            {
                type: 'actor_exit',
                actorId:
                    'minerva_mcgonagall',
                currentActivityEn:
                    'Walking into the back garden with the reply slip.',
                mapId: 'zhang_home',
                roomId: 'back_garden',
            },
            {
                type: 'actor_move',
                actorId:
                    'tina_mother',
                mapId:
                    'nonexistent_map',
                roomId:
                    'nonexistent_room',
                currentActivityEn:
                    'Teleporting somewhere impossible.',
            },
            {
                type:
                    'unknown_future_type',
            },
        ],
    };
    const settled =
        await runTurnSettlementGraph({
            payload,
            worldState: state,
            playerAction:
                'I remain beside the table.',
            admittedActors: [],
        });

    assert.equal(
        settled.segments[0].textEn,
        payload.segments[0].textEn,
    );
    assert.equal(
        settled.actorPresence
            .presentActorIdsAfterTurn
            .includes(
                'minerva_mcgonagall',
            ),
        false,
    );
    const mcgonagall =
        settled.actorUpdates
            .find(update =>
                update.id ===
                    'minerva_mcgonagall');
    assert.equal(
        mcgonagall.present,
        false,
    );
    assert.equal(
        mcgonagall.roomId,
        'back_garden',
    );
    const mother =
        settled.actorUpdates
            .find(update =>
                update.id ===
                    'tina_mother');
    assert.equal(
        mother,
        undefined,
    );
    assert.ok(
        settled.settlementWarnings
            .some(warning =>
                warning.code ===
                    'invalid_actor_move_proposal'),
    );
    assert.ok(
        settled.settlementWarnings
            .some(warning =>
                warning.code ===
                    'unknown_state_proposal'),
    );
});

test('local narrative-first reducer matches the LangGraph settlement output', async () => {
    const state =
        createCurrentPlayingState();
    const input = {
        payload: {
            segments: [{
                type: 'narration',
                textEn:
                    'The kitchen clock ticks while the discussion continues.',
            }],
        },
        worldState: state,
        playerAction:
            'I continue listening.',
        admittedActors: [],
        movementResolution: null,
        momentumDirective: null,
        checkResolution: null,
    };
    const graph =
        await runTurnSettlementGraph(
            input,
        );
    const local =
        settleNarrativeTurnPerformance(
            input.payload,
            state,
            {
                playerAction:
                    input.playerAction,
                admittedActors: [],
            },
        );

    assert.deepEqual(
        graph,
        local,
    );
    assert.equal(
        Object.hasOwn(
            graph,
            'eventEnded',
        ),
        false,
    );
});

test('turn settlement advances at least fifteen minutes and reveals only prewritten clues', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-07-24 · 09:15';
    const transaction = {
        elapsedMinutes: 1,
        instantaneousMagic: false,
        exceptionReasonEn: '',
        publicEventEn: 'Tina opens the front door.',
        segments: [
            { type: 'narration', textEn: 'The front door opens.' },
            { type: 'dialogue', actorId: 'tina_mother', textEn: 'Stay close to me.' },
        ],
        actorUpdates: [{
            id: 'tina_mother',
            present: true,
            currentActivityEn: 'Standing behind Tina.',
            currentIntentEn: 'Protect Tina.',
        }],
        revealedClues: [{
            id: 'mother_portrait',
            labelEn: 'The altered portrait',
            detailEn: 'A moving edge remains around the mother figure.',
        }],
    };
    const next = applyTurnTransaction(
        state,
        transaction,
        'I open the door.',
        {
            sourceMessageId: 42,
        },
    );
    assert.equal(next.clock, '1991-07-24 · 09:30');
    assert.equal(next.turn.lastElapsedMinutes, 15);
    assert.equal(next.clues[0].id, 'mother_portrait');
    assert.deepEqual(next.storyArcs[0].revealedClueIds, ['mother_portrait']);
    assert.deepEqual(
        next.scene.timelineEntries.at(-1),
        {
            clock:
                '1991-07-24 · 09:30',
            summaryEn:
                transaction.publicEventEn,
            sourceRef:
                'message:42:public_event',
        },
    );
    assert.equal(
        next.actors.find(actor =>
            actor.id ===
                'tina_mother')
            .currentActivityEn,
        'Standing behind Tina.',
    );
});
