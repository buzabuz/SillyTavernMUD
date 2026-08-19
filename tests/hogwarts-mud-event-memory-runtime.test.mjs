/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    analyzeMemoryConsolidation,
    applyMemoryConsolidation,
    validateMemoryConsolidation,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-reducer.js';
import {
    normalizeActorMemoryProfile,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    normalizeEventKnowledge,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';

function addAppraisalRef(
    state,
    {
        id,
        tier,
        summaryEn,
        clock = state.clock,
    },
) {
    const eventId =
        `event_${id}`;
    state.eventKnowledge.push(
        normalizeEventKnowledge(
            {
                version: 2,
                eventKind:
                    'observed',
                eventId,
                sceneId:
                    state.scene.id,
                clock,
                sourceMessageIds: [
                    state.eventKnowledge
                        .length +
                    1,
                ],
                summaryEn,
                activationSchemaIds:
                    [],
                participantActorIds: [
                    'tina_mother',
                ],
                witnessActorIds: [
                    'tina_mother',
                ],
                witnessCohortIds: [],
                witnessBasis: {
                    tina_mother:
                        'direct',
                },
                perception: {
                    version: 1,
                    visualScope:
                        'room',
                    audibleScope:
                        'room',
                    salience:
                        'normal',
                    attribution:
                        'clear',
                    concealment:
                        'none',
                    directParticipantActorIds:
                        [
                            'tina_mother',
                        ],
                    evidenceText:
                        summaryEn,
                    confidence: 0.9,
                    source:
                        'post_turn_observer',
                },
                knownToPlayer: true,
                source:
                    'post_turn_observer',
            },
            {
                actors:
                    state.actors,
                sourceTexts: [
                    summaryEn,
                ],
            },
        ),
    );
    state.memorySynapse
        .appraisals.push({
            id,
            observerId:
                'tina_mother',
            targetId: 'player',
            summaryEn,
            sourceEventIds: [
                eventId,
            ],
            activationSchemaIds: [],
            derivedSchemaIds: [],
            contextTags: [],
            confidence: 0.8,
            status: 'accepted',
            knowledgeSource:
                'participant',
            committedClock:
                clock,
            historicalClaimAllowed:
                true,
        });
    state.actorMemoryIndex
        .byActorId
        .tina_mother[
            tier
        ].push({
            recordType:
                'appraisal',
            recordId: id,
            addedClock: clock,
        });
}

test('established family and friends receive a background impression', () => {
    const father =
        normalizeActorMemoryProfile({
            id: 'alex_zhang',
            relationshipToPlayerEn:
                'Father',
        });
    const friend =
        normalizeActorMemoryProfile({
            id:
                'childhood_friend',
            relationshipToPlayerEn:
                'Childhood friend',
        });
    assert.match(
        father.impressionOfPlayerEn,
        /troublesome daughter/i,
    );
    assert.match(
        friend.impressionOfPlayerEn,
        /difficult friend/i,
    );
});

test('memory consolidation waits for a low-tier event boundary instead of a turn count', () => {
    const state =
        createCurrentPlayingState();
    state.turn.count = 10;
    state.memoryDirector
        .lastReviewedTurn = 0;
    addAppraisalRef(
        state,
        {
            id:
                'appraisal_pending_review',
            tier: 'recent',
            summaryEn:
                'Tina protected the signed reply during an argument.',
        },
    );
    assert.equal(
        analyzeMemoryConsolidation(
            state,
        ).shouldReview,
        false,
    );
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:9',
            status: 'pending',
            sceneId:
                state.scene.id,
            turn: 9,
        };
    assert.equal(
        analyzeMemoryConsolidation(
            state,
        ).shouldReview,
        false,
    );
    state.turn.count = 99;
    assert.equal(
        analyzeMemoryConsolidation(
            state,
        ).shouldReview,
        false,
    );
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:10',
            status: 'pending',
            sceneId:
                state.scene.id,
            turn: 10,
        };
    assert.equal(
        analyzeMemoryConsolidation(
            state,
        ).shouldReview,
        true,
    );
    state.memoryDirector
        .pendingEventBoundary
        .status = 'failed';
    assert.equal(
        analyzeMemoryConsolidation(
            state,
        ).shouldReview,
        false,
    );
});

test('medium memory consolidation promotes only referenced memories', () => {
    const state =
        createCurrentPlayingState();
    state.turn.count = 18;
    state.memoryDirector
        .lastReviewedTurn = 0;
    addAppraisalRef(
        state,
        {
            id:
                'appraisal_recent_defence',
            tier: 'recent',
            summaryEn:
                'Tina defended a younger student.',
        },
    );
    addAppraisalRef(
        state,
        {
            id:
                'appraisal_everyday_question',
            tier: 'everyday',
            summaryEn:
                'Tina asked a blunt question.',
        },
    );
    addAppraisalRef(
        state,
        {
            id:
                'appraisal_everyday_apology',
            tier: 'everyday',
            summaryEn:
                'Tina later offered a reluctant apology.',
        },
    );
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:18',
            status: 'pending',
            sceneId:
                state.scene.id,
            turn: 18,
        };
    const payload = {
        reviews: [{
            id: 'tina_mother',
            operations: [
                {
                    sourceIds: [
                        'appraisal_recent_defence',
                    ],
                    targetTier: 'core',
                    summaryEn:
                        'Tina protects vulnerable people under public pressure.',
                    summary: '',
                },
                {
                    sourceIds: [
                        'appraisal_everyday_question',
                        'appraisal_everyday_apology',
                    ],
                    targetTier:
                        'recent',
                    summaryEn:
                        'Tina caused offence with bluntness, then returned to apologise.',
                    summary: '',
                },
            ],
        }],
    };
    assert.deepEqual(
        validateMemoryConsolidation(
            payload,
            state,
        ),
        {
            valid: true,
            errors: [],
        },
    );
    const duplicate =
        structuredClone(
            payload,
        );
    duplicate.reviews[0]
        .operations[1]
        .sourceIds = [
            'appraisal_recent_defence',
        ];
    assert.equal(
        validateMemoryConsolidation(
            duplicate,
            state,
        ).valid,
        false,
    );
    const next =
        applyMemoryConsolidation(
            state,
            payload,
        );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .tina_mother
            .core.length,
        1,
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .tina_mother
            .recent.length >= 1,
        true,
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .tina_mother
            .everyday.length,
        0,
    );
    assert.equal(
        next.memoryDirector
            .pendingEventBoundary
            .status,
        'consumed',
    );
});
