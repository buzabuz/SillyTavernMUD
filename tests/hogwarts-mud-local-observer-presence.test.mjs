/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    validateObservedTemporalClaims,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';

function createHarness() {
    const state = {
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
            currentLevelId:
                'first_floor',
        },
        scene: {
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
        },
        actors: [
            {
                id:
                    'minerva_mcgonagall',
                nameEn:
                    'Professor McGonagall',
                aliases: [
                    'McGonagall',
                ],
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
            },
            {
                id:
                    'canon_lavender_brown',
                nameEn:
                    'Lavender Brown',
                aliases: [
                    'Lavender',
                ],
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
            },
        ],
        actorLibrary: [],
        localPresence: {
            occupantActorIds: [
                'minerva_mcgonagall',
                'canon_lavender_brown',
            ],
        },
    };
    const rooms = [
        {
            id:
                'transfiguration_classroom',
            nameEn:
                'Transfiguration Classroom',
        },
        {
            id:
                'transfiguration_courtyard',
            nameEn:
                'Transfiguration Courtyard',
        },
    ];
    const adapter =
        createLocalSemanticAdapter({
            buildLocalMapModel:
                () => ({
                    nodes: rooms,
                    exits: [],
                }),
            buildStructuredPlayerTurnSequence:
                () => [],
            createDeterministicPerceptionFallback:
                () => null,
            findLocalRoomPath:
                () => ({
                    roomIds:
                        rooms.map(room =>
                            room.id),
                    minutes: 1,
                }),
            getRequestHeaders:
                () => ({}),
            projectObservedInventoryUpdates:
                () => [],
            validatePerceptionContract:
                () => ({
                    valid: true,
                }),
        });
    return {
        adapter,
        state,
    };
}

test('observer preserves presence for structured unchanged transformation and sitting observations', () => {
    const {
        adapter,
        state,
    } = createHarness();
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
                'canon_lavender_brown',
            ],
        },
        actorUpdates: [],
    };
    const narrativeText = [
        'Professor McGonagall stood precisely where the cat had been.',
        'Lavender took a quick step backwards and sat in the nearest chair.',
    ].join(' ');
    adapter.applyObservedActorUpdates(
        transaction,
        {
            result: {
                actorUpdates: [
                    {
                        actorId:
                            'minerva_mcgonagall',
                        currentActivityEn:
                            'Supervising the practical exercise.',
                        presence:
                            'unchanged',
                        roomId:
                            'transfiguration_classroom',
                        evidenceText:
                            'Professor McGonagall stood precisely where the cat had been.',
                        confidence: 0.9,
                    },
                    {
                        actorId:
                            'canon_lavender_brown',
                        currentActivityEn:
                            'Sitting at her desk.',
                        presence:
                            'unchanged',
                        roomId:
                            'transfiguration_classroom',
                        evidenceText:
                            'Lavender took a quick step backwards and sat in the nearest chair.',
                        confidence: 0.9,
                    },
                ],
            },
        },
        state,
        narrativeText,
    );
    assert.deepEqual(
        transaction.actorPresence
            .presentActorIdsAfterTurn,
        [
            'minerva_mcgonagall',
            'canon_lavender_brown',
        ],
    );
    assert.deepEqual(
        transaction.actorUpdates.map(
            update => ({
                id: update.id,
                roomId:
                    update.roomId,
                present:
                    update.present,
            }),
        ),
        [
            {
                id:
                    'minerva_mcgonagall',
                roomId:
                    'transfiguration_classroom',
                present: undefined,
            },
            {
                id:
                    'canon_lavender_brown',
                roomId:
                    'transfiguration_classroom',
                present: undefined,
            },
        ],
    );
});

test('observer accepts an explicit actor departure into a named room', () => {
    const {
        adapter,
        state,
    } = createHarness();
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
            ],
        },
        actorUpdates: [],
    };
    const evidence =
        'Professor McGonagall walked into the Transfiguration Courtyard and left the class behind.';
    adapter.applyObservedActorUpdates(
        transaction,
        {
            result: {
                actorUpdates: [{
                    actorId:
                        'minerva_mcgonagall',
                    currentActivityEn:
                        'Walking into the courtyard.',
                    presence: 'absent',
                    roomId:
                        'transfiguration_courtyard',
                    evidenceText:
                        evidence,
                    confidence: 0.9,
                }],
            },
        },
        state,
        evidence,
    );
    assert.deepEqual(
        transaction.actorPresence
            .presentActorIdsAfterTurn,
        [],
    );
    assert.deepEqual(
        transaction.actorUpdates[0],
        {
            id:
                'minerva_mcgonagall',
            currentActivityEn:
                'Walking into the courtyard.',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_courtyard',
            locationKnown: true,
            present: false,
        },
    );
});

test('observer records explicit departure with unknown destination instead of retaining the old room', () => {
    const {
        adapter,
        state,
    } = createHarness();
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
            ],
        },
        actorUpdates: [],
    };
    const evidence =
        'Professor McGonagall left the classroom alone and disappeared from view.';
    adapter.applyObservedActorUpdates(
        transaction,
        {
            result: {
                actorUpdates: [{
                    actorId:
                        'minerva_mcgonagall',
                    currentActivityEn:
                        'Travelling somewhere outside the current room.',
                    presence:
                        'absent',
                    roomId: '',
                    evidenceText:
                        evidence,
                    confidence: 0.95,
                }],
            },
        },
        state,
        evidence,
    );

    assert.deepEqual(
        transaction.actorPresence
            .presentActorIdsAfterTurn,
        [],
    );
    assert.deepEqual(
        transaction.actorUpdates[0],
        {
            id:
                'minerva_mcgonagall',
            currentActivityEn:
                'Travelling somewhere outside the current room.',
            mapId: '',
            roomId: '',
            locationKnown: false,
            present: false,
        },
    );
});

test('an observation without actor updates leaves actor presence unchanged', () => {
    const {
        adapter,
        state,
    } = createHarness();
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
                'canon_lavender_brown',
            ],
        },
        actorUpdates: [],
    };
    const evidence =
        'The demonstration concluded while Professor McGonagall and Lavender remained seated.';
    adapter.applyObservedActorUpdates(
        transaction,
        {
            result: {
                actorUpdates: [],
            },
        },
        state,
        evidence,
    );

    assert.deepEqual(
        transaction.actorPresence
            .presentActorIdsAfterTurn,
        [
            'minerva_mcgonagall',
            'canon_lavender_brown',
        ],
    );
    assert.deepEqual(
        transaction.actorUpdates,
        [],
    );
});

test('recovered actor movement leaves the room without ending the event', () => {
    const {
        adapter,
        state,
    } = createHarness();
    const evidence =
        'Professor McGonagall walked into the Transfiguration Courtyard while the class continued.';
    const observation = {
        result: {
            materialEvents: [{
                type: 'object_moved',
                actorId:
                    'minerva_mcgonagall',
                sourceKind:
                    'narrative',
                targetTextEn:
                    'Transfiguration Courtyard',
                evidenceText:
                    evidence,
                confidence: 0.9,
            }],
            actorUpdates: [],
        },
    };

    adapter.recoverObservedActorMovements(
        observation,
        state,
        evidence,
    );

    assert.deepEqual(
        observation.result.actorUpdates,
        [{
            actorId:
                'minerva_mcgonagall',
            currentActivityEn:
                evidence,
            presence: 'absent',
            roomId:
                'transfiguration_courtyard',
            evidenceText:
                evidence,
            confidence: 0.9,
        }],
    );
});

test('observer skips a non-English actor activity without blocking an independent English update', () => {
    const {
        adapter,
        state,
    } = createHarness();
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
                'canon_lavender_brown',
            ],
        },
        actorUpdates: [],
    };
    const mcgonagallEvidence =
        'Professor McGonagall remained beside the demonstration desk.';
    const lavenderEvidence =
        'Lavender Brown sat down beside Tina.';
    const observation = {
        result: {
            actorUpdates: [
                {
                    actorId:
                        'minerva_mcgonagall',
                    currentActivityEn:
                        '站在演示桌旁。',
                    presence:
                        'unchanged',
                    roomId:
                        'transfiguration_classroom',
                    evidenceText:
                        mcgonagallEvidence,
                    confidence: 0.9,
                },
                {
                    actorId:
                        'canon_lavender_brown',
                    currentActivityEn:
                        'Sitting beside Tina.',
                    presence:
                        'unchanged',
                    roomId:
                        'transfiguration_classroom',
                    evidenceText:
                        lavenderEvidence,
                    confidence: 0.9,
                },
            ],
        },
    };

    adapter.applyObservedActorUpdates(
        transaction,
        observation,
        state,
        `${mcgonagallEvidence} ${lavenderEvidence}`,
    );

    assert.deepEqual(
        transaction.actorUpdates,
        [{
            id:
                'canon_lavender_brown',
            currentActivityEn:
                'Sitting beside Tina.',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            locationKnown: true,
        }],
    );
    assert.equal(
        observation.diagnostics
            .languageMismatchCount,
        1,
    );
    assert.equal(
        observation.diagnostics
            .languageMismatches[0]
            .code,
        'model_language_mismatch',
    );
});

test('post-core temporal claims require exact narrative evidence and normalized values', () => {
    const narrative =
        'At 14:50 the door opens. Five minutes later, Tina leaves.';
    const validation =
        validateObservedTemporalClaims(
            [
                {
                    kind:
                        'absolute_clock',
                    evidenceText:
                        'At 14:50',
                    clock: '14:50',
                    durationMinutes: 0,
                    relation: 'none',
                    confidence: 0.95,
                },
                {
                    kind:
                        'relative_duration',
                    evidenceText:
                        'Five minutes later',
                    clock: '',
                    durationMinutes: 5,
                    relation: 'later',
                    confidence: 0.95,
                },
            ],
            {
                narrativeSegments: [{
                    type: 'narration',
                    textEn: narrative,
                }],
            },
        );

    assert.equal(
        validation.errors.length,
        0,
    );
    assert.equal(
        validation.values.length,
        2,
    );
});

test('post-core temporal validation omits invalid claims without prose fallback', () => {
    const validation =
        validateObservedTemporalClaims(
            [
                {
                    kind:
                        'absolute_clock',
                    evidenceText:
                        'At 29:99',
                    clock: '29:99',
                    durationMinutes: 0,
                    relation: 'none',
                    confidence: 0.95,
                },
                {
                    kind: 'schedule',
                    evidenceText:
                        'The train departs at eleven',
                    clock: '',
                    durationMinutes: 0,
                    relation: 'none',
                    confidence: 0.95,
                },
            ],
            {
                playerAction:
                    'What time does the train leave?',
                narrativeSegments: [{
                    type: 'narration',
                    textEn:
                        'The train departs at eleven.',
                }],
            },
        );

    assert.deepEqual(
        validation.values,
        [{
            kind: 'schedule',
            evidenceText:
                'The train departs at eleven',
            clock: '',
            durationMinutes: 0,
            relation: 'none',
            confidence: 0.95,
        }],
    );
    assert.equal(
        validation.errors.length,
        1,
    );
    assert.deepEqual(
        validateObservedTemporalClaims(
            [],
            {
                narrativeSegments: [{
                    type: 'narration',
                    textEn:
                        'The shop closes at four and the train leaves at eleven.',
                }],
            },
        ),
        {
            values: [],
            errors: [],
        },
    );
});
