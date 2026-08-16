/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';

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

test('observer does not turn transformation or sitting evidence into actor departure', () => {
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
                eventBoundary: {
                    ended: false,
                    confidence: 0,
                    evidenceText: '',
                },
                actorUpdates: [
                    {
                        actorId:
                            'minerva_mcgonagall',
                        currentActivityEn:
                            'Supervising the practical exercise.',
                        presence:
                            'absent',
                        roomId:
                            'transfiguration_courtyard',
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
                            'absent',
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
                eventBoundary: {
                    ended: true,
                    confidence: 0.9,
                    evidenceText:
                        evidence,
                },
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
            present: false,
        },
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
            eventBoundary: {
                ended: false,
                confidence: 0,
                evidenceText: '',
            },
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
