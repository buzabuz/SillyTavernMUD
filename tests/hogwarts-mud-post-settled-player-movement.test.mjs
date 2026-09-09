/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createPlayerMovementPreflight,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement.js';
import {
    settlePostPlayerMovement,
    validatePostPlayerMovement,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement-post-settlement.js';
import {
    isPendingPostSettlementCurrent,
    PENDING_POST_SETTLEMENT_VERSION,
} from '../public/scripts/extensions/hogwarts-mud/domain/pending-post-settlement.js';
import {
    reconcileSpatialState,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';

const ACTION =
    '→【Back Garden】\nI walk through the kitchen door into the back garden.';
const ARRIVAL =
    'Tina walks through the kitchen door and arrives in the back garden.';

test('movement preflight is pure and ordinary prose remains inert', () => {
    const state =
        createCurrentPlayingState();
    const before =
        structuredClone(state);
    const preflight =
        createPlayerMovementPreflight(
            state,
            ACTION,
        );

    assert.equal(preflight.triggered, true);
    assert.equal(preflight.eligibility, 'eligible');
    assert.equal(preflight.candidateRoomId, 'back_garden');
    assert.deepEqual(state, before);
    assert.equal(
        createPlayerMovementPreflight(
            state,
            'I remember the back garden.',
        ),
        null,
    );
});

test('only an evidence-bound Post candidate lets the Movement Reducer write position', () => {
    const state =
        createCurrentPlayingState();
    const preflight =
        createPlayerMovementPreflight(
            state,
            ACTION,
        );
    const result =
        settlePostPlayerMovement(
            state,
            preflight,
            {
                outcome: 'moved',
                destinationMapId:
                    preflight.candidateMapId,
                destinationRoomId:
                    preflight.candidateRoomId,
                accompanyingActorIds: [],
                evidenceText: ARRIVAL,
            },
            [{
                type: 'narration',
                textEn: ARRIVAL,
            }],
        );

    assert.equal(result.valid, true);
    assert.equal(
        result.state.map.currentLocalNodeId,
        'back_garden',
    );
    assert.equal(
        result.state.scene.roomId,
        'back_garden',
    );
    assert.equal(
        result.state.spatial.player.roomId,
        'back_garden',
    );
    assert.equal(
        result.movementOutcome.status,
        'moved',
    );
});

test('Post cannot move outside preflight or without exact saved narration evidence', () => {
    const state =
        createCurrentPlayingState();
    const preflight =
        createPlayerMovementPreflight(
            state,
            ACTION,
        );
    const wrongDestination =
        validatePostPlayerMovement(
            preflight,
            {
                outcome: 'moved',
                destinationMapId:
                    preflight.candidateMapId,
                destinationRoomId: 'kitchen',
                accompanyingActorIds: [],
                evidenceText: ARRIVAL,
            },
            [{
                type: 'narration',
                textEn: ARRIVAL,
            }],
        );
    const inventedEvidence =
        validatePostPlayerMovement(
            preflight,
            {
                outcome: 'moved',
                destinationMapId:
                    preflight.candidateMapId,
                destinationRoomId:
                    preflight.candidateRoomId,
                accompanyingActorIds: [],
                evidenceText:
                    'The player arrived somewhere else.',
            },
            [{
                type: 'narration',
                textEn: ARRIVAL,
            }],
        );

    assert.equal(wrongDestination.valid, false);
    assert.equal(inventedEvidence.valid, false);
    assert.equal(
        state.map.currentLocalNodeId,
        'kitchen',
    );
});

test('reload reconciliation never replays a movement marker', () => {
    const state =
        createCurrentPlayingState();
    const reconciled =
        reconcileSpatialState(
            state,
            ACTION,
            {
                retryUnresolvedMovement: true,
            },
        );

    assert.equal(
        reconciled.state.map.currentLocalNodeId,
        'kitchen',
    );
    assert.equal(
        reconciled.movement,
        null,
    );
});

test('pending Post settlement rejects a changed State revision', () => {
    const state =
        createCurrentPlayingState();
    state.timelineEpoch = 'timeline-a';
    state.stateRevision = 7;
    const pending = {
        timelineEpoch: 'timeline-a',
        stateRevision: 6,
        sceneId: state.scene.id,
    };

    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            {
                ...pending,
                version: PENDING_POST_SETTLEMENT_VERSION,
            },
        ),
        false,
    );
    assert.equal(
        isPendingPostSettlementCurrent(
            state,
            {
                ...pending,
                version: PENDING_POST_SETTLEMENT_VERSION,
                stateRevision: 7,
            },
        ),
        true,
    );
});

test('Post no-move outcomes do not persist retired movement facts', () => {
    const state =
        createCurrentPlayingState();
    const preflight =
        createPlayerMovementPreflight(
            state,
            ACTION,
        );
    const result =
        settlePostPlayerMovement(
            state,
            preflight,
            {
                outcome: 'not_moved',
                destinationMapId: '',
                destinationRoomId: '',
                accompanyingActorIds: [],
                evidenceText:
                    'Tina remains in the kitchen.',
            },
            [{
                type: 'narration',
                textEn:
                    'Tina remains in the kitchen.',
            }],
        );

    assert.equal(result.valid, true);
    assert.equal(
        Object.hasOwn(
            result.movementOutcome,
            'movementOutcomeFactEn',
        ),
        false,
    );
});
