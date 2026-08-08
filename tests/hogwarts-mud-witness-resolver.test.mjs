/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyPresenceWitnessTransaction,
    createDeterministicPerceptionFallback,
    normalizeEventKnowledge,
    normalizePerception,
    reduceLocalPresence,
    resolveEventWitnesses,
    validatePerceptionContract,
} from '../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    validateObservedPerception,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';

const roomId = 'charms_classroom';
const mapId = 'hogwarts_castle';
const roomActorIds = [
    'dean',
    'flitwick',
    'harry',
    'hermione',
    'lavender',
    'neville',
    'ron',
    'seamus',
];
const actors = [
    ...roomActorIds.map(id => ({
        id,
        present: [
            'flitwick',
            'lavender',
            'ron',
        ].includes(id),
        lifeStatus: 'alive',
        mapId,
        roomId,
    })),
    {
        id: 'peeves',
        present: false,
        lifeStatus: 'alive',
        mapId,
        roomId: 'charms_corridor',
    },
    {
        id: 'hagrid',
        present: false,
        lifeStatus: 'alive',
        mapId: 'hogwarts_grounds',
        roomId: 'hagrid_hut',
    },
];
const cohort = {
    version: 1,
    id: 'gryffindor_year1_charms_1991',
    labelEn:
        'Gryffindor first-years in Charms',
    mapId,
    roomId,
    knownMemberActorIds:
        roomActorIds.filter(id =>
            id !== 'flitwick'),
    source: 'class_roster',
};
const localPresence = {
    version: 1,
    mapId,
    roomId,
    occupantActorIds:
        roomActorIds,
    cohortIds: [cohort.id],
    updatedTurn: 50,
    source: 'scene_roster',
};

function makePerception(overrides = {}) {
    return {
        version: 1,
        visualScope: 'room',
        audibleScope: 'room',
        salience: 'major',
        attribution: 'clear',
        concealment: 'none',
        directParticipantActorIds: [
            'ron',
        ],
        evidenceText:
            'Ron shot toward the rafters.',
        confidence: 0.95,
        source: 'post_turn_observer',
        ...overrides,
    };
}

test('presence reducer keeps non-interacting classroom occupants until movement proves they left', () => {
    const reduced =
        reduceLocalPresence({
            actors,
            actorLibrary: actors,
            cohorts: [cohort],
            localPresence,
            map: {
                activeMapId: mapId,
                currentLocalNodeId:
                    roomId,
            },
            turn: {
                count: 50,
            },
        }, {
            actorUpdates: [
                {
                    id: 'ron',
                    present: true,
                },
                {
                    id: 'lavender',
                    present: false,
                },
                {
                    id: 'seamus',
                    mapId,
                    roomId:
                        'charms_corridor',
                },
            ],
        });

    assert.equal(
        reduced.occupantActorIds
            .includes('hermione'),
        true,
    );
    assert.equal(
        reduced.occupantActorIds
            .includes('lavender'),
        true,
    );
    assert.equal(
        reduced.occupantActorIds
            .includes('seamus'),
        false,
    );
    assert.deepEqual(
        reduced.cohortIds,
        [cohort.id],
    );
});

test('a public classroom accident reaches every occupant and the stable class cohort', () => {
    const resolution =
        resolveEventWitnesses({
            perception:
                makePerception(),
            localPresence,
            activeInteractionActorIds: [
                'ron',
                'lavender',
                'flitwick',
            ],
            actors,
            spatialGraph: {
                currentRoomId:
                    roomId,
                exits: [],
            },
        });

    assert.deepEqual(
        resolution
            .participantActorIds,
        ['ron'],
    );
    assert.deepEqual(
        resolution.witnessActorIds,
        roomActorIds,
    );
    assert.deepEqual(
        resolution.witnessCohortIds,
        [cohort.id],
    );
    assert.equal(
        resolution
            .witnessBasis.ron,
        'direct',
    );
    assert.equal(
        resolution
            .witnessBasis.hermione,
        'room_visual_audible',
    );
});

test('whispers and notes stay with their direct target when concealment succeeds', () => {
    const whisper =
        resolveEventWitnesses({
            perception:
                makePerception({
                    visualScope:
                        'target',
                    audibleScope:
                        'target',
                    salience:
                        'subtle',
                    concealment:
                        'successful',
                    directParticipantActorIds: [
                        'harry',
                    ],
                    evidenceText:
                        'Tina whispered only to Harry.',
                }),
            localPresence,
            activeInteractionActorIds: [
                'ron',
                'harry',
            ],
            targetActorIds: [
                'harry',
            ],
            actors,
        });
    const noteFallback =
        createDeterministicPerceptionFallback({
            playerAction:
                'Tina quietly passed a note to Harry.',
            narrativeText:
                'Harry covered the note with one hand.',
            playerTurnSequence: [
                {
                    type: 'action',
                },
            ],
            targetActorIds: [
                'harry',
            ],
            checkResolution: {
                outcome: 'success',
            },
            actors,
        });

    assert.deepEqual(
        whisper.witnessActorIds,
        ['harry'],
    );
    assert.deepEqual(
        whisper.witnessCohortIds,
        [],
    );
    assert.equal(
        noteFallback.visualScope,
        'target',
    );
    assert.equal(
        noteFallback.audibleScope,
        'none',
    );
    assert.equal(
        noteFallback.concealment,
        'successful',
    );
});

test('covert magic follows successful concealment or the failed public result', () => {
    const fallback =
        createDeterministicPerceptionFallback({
            playerAction:
                'Tina secretly casts at Ron.',
            narrativeText:
                'The spell exploded and Ron shot toward the rafters.',
            spellCasts: [
                {
                    spellId:
                        'wingardium_leviosa',
                },
            ],
            checkResolution: {
                outcome: 'failure',
                target: {
                    actorId: 'ron',
                },
            },
            targetActorIds: [
                'ron',
            ],
            actors,
        });
    const successful =
        createDeterministicPerceptionFallback({
            playerAction:
                'Tina secretly casts at Ron.',
            narrativeText:
                'Ron alone noticed his quill twitch.',
            spellCasts: [
                {
                    spellId:
                        'wingardium_leviosa',
                },
            ],
            checkResolution: {
                outcome: 'success',
                target: {
                    actorId: 'ron',
                },
            },
            targetActorIds: [
                'ron',
            ],
            actors,
        });

    assert.equal(
        fallback.concealment,
        'attempted',
    );
    assert.equal(
        fallback.visualScope,
        'room',
    );
    assert.equal(
        fallback.audibleScope,
        'room',
    );
    assert.equal(
        fallback.source,
        'deterministic_fallback',
    );
    assert.equal(
        successful.concealment,
        'successful',
    );
    assert.equal(
        successful.visualScope,
        'target',
    );
});

test('adjacent hearing uses only rooms connected by the supplied spatial graph', () => {
    const resolution =
        resolveEventWitnesses({
            perception:
                makePerception({
                    visualScope:
                        'none',
                    audibleScope:
                        'adjacent',
                    directParticipantActorIds:
                        [],
                    evidenceText:
                        'A sharp crash rang through the corridor.',
                }),
            localPresence,
            actors,
            spatialGraph: {
                currentRoomId:
                    roomId,
                exits: [
                    {
                        from:
                            'charms_corridor',
                        to: roomId,
                    },
                ],
            },
        });

    assert.equal(
        resolution.witnessActorIds
            .includes('peeves'),
        true,
    );
    assert.equal(
        resolution
            .witnessBasis.peeves,
        'adjacent_audible',
    );
    assert.equal(
        resolution.witnessActorIds
            .includes('hagrid'),
        false,
    );
});

test('illegal observer perception is rejected and deterministic fallback keeps grounded narrative evidence', () => {
    const illegal =
        makePerception({
            directParticipantActorIds: [
                'unknown_student',
            ],
            evidenceText:
                'This sentence was never written.',
        });
    const validation =
        validateObservedPerception(
            illegal,
            {
                actors,
                playerAction:
                    'Tina raises her wand.',
                narrativeSegments: [
                    {
                        textEn:
                            'Ron ducks behind his desk.',
                    },
                ],
            },
        );
    const normalized =
        normalizePerception(
            illegal,
            {
                actors,
                sourceTexts: [
                    'Ron ducks behind his desk.',
                ],
            },
        );
    const contractValidation =
        validatePerceptionContract(
            illegal,
            {
                actors,
                sourceTexts: [
                    'This sentence was never written.',
                ],
            },
        );
    const narrativeText =
        'A shout carried across the classroom.';
    const fallback =
        createDeterministicPerceptionFallback({
            playerAction: '',
            narrativeText,
            actors,
        });

    assert.equal(validation.valid, false);
    assert.equal(normalized, null);
    assert.equal(
        contractValidation.valid,
        false,
    );
    assert.equal(
        narrativeText.includes(
            fallback.evidenceText,
        ),
        true,
    );
});

test('turn witness fields and event knowledge persist idempotently into world state', () => {
    const perception =
        makePerception();
    const resolution =
        resolveEventWitnesses({
            perception,
            localPresence,
            actors,
        });
    const eventKnowledge =
        normalizeEventKnowledge({
            sceneId:
                'first_charms_class',
            sourceMessageIds: [191],
            summaryEn:
                'Tina levitated Ron instead of the feather.',
            ...resolution,
            perception,
            source:
                'post_turn_observer',
        }, {
            actors,
            cohortIds: [
                cohort.id,
            ],
            sourceTexts: [
                perception.evidenceText,
            ],
        });
    const base = {
        actors,
        actorLibrary: actors,
        cohorts: [cohort],
        localPresence,
        eventKnowledge: [],
    };
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'flitwick',
                'lavender',
                'ron',
            ],
        },
        localPresence,
        perception,
        participantActorIds:
            resolution
                .participantActorIds,
        witnessActorIds:
            resolution
                .witnessActorIds,
        witnessCohortIds:
            resolution
                .witnessCohortIds,
        witnessBasis:
            resolution.witnessBasis,
        eventKnowledge,
    };
    const first =
        applyPresenceWitnessTransaction(
            base,
            transaction,
        );
    const second =
        applyPresenceWitnessTransaction(
            first,
            transaction,
        );

    assert.deepEqual(
        first
            .activeInteractionActorIds,
        [
            'flitwick',
            'lavender',
            'ron',
        ],
    );
    assert.equal(
        first.eventKnowledge.length,
        1,
    );
    assert.deepEqual(
        second.eventKnowledge,
        first.eventKnowledge,
    );
    assert.deepEqual(
        transaction.witnessActorIds,
        roomActorIds,
    );
});
