/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyPresenceWitnessTransaction,
    createDeterministicPerceptionFallback,
    normalizeEventKnowledge,
    normalizePerception,
    reconcileObservedPerceptionWithFallback,
    reduceLocalPresence,
    resolveEventWitnesses,
    validatePerceptionContract,
} from '../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    migrateActorContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    buildActorDossierViewModel,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-dossier-projection.js';
import {
    validateObservedPerception,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import {
    applyWitnessedEventMemories,
} from '../public/scripts/extensions/hogwarts-mud/domain/event-memory.js';
import {
    markCommittedMessageEventsKnownToPlayer,
    reduceEventKnowledge,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';

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

function strictActorContextState() {
    return migrateActorContextV1({
        clock:
            '1991-09-02 · 12:30',
        turn: {
            count: 96,
        },
        actors:
            actors.map(actor => ({
                ...actor,
                currentActivityEn:
                    'Attending Charms.',
                currentIntentEn:
                    'Watch the lesson.',
                currentGoalEn: '',
                temporary: false,
            })),
        actorLibrary:
            actors.map(actor => ({
                id: actor.id,
                nameEn: actor.id,
                roleEn: 'Student',
                sharedMemories: {
                    core: [],
                    recent: [],
                    everyday: [],
                },
            })),
        eventKnowledge: [],
    }).state;
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

test('unstructured classroom prose does not override direct-address privacy', () => {
    const perception =
        createDeterministicPerceptionFallback({
            playerAction:
                'Tina quietly asks Hermione for help.',
            narrativeText:
                'Hermione successfully demonstrated a partial metallic transformation. McGonagall called it a very promising start and awarded one point to Gryffindor.',
            playerTurnSequence: [{
                type:
                    'direct_speech',
                targetActorId:
                    'hermione',
            }],
            targetActorIds: [
                'hermione',
            ],
            actors,
        });

    assert.equal(
        perception.visualScope,
        'none',
    );
    assert.equal(
        perception.audibleScope,
        'target',
    );
    assert.equal(
        perception.salience,
        'normal',
    );
});

test('valid observer output cannot narrow deterministic public evidence', () => {
    const fallback =
        makePerception({
            visualScope:
                'room',
            audibleScope:
                'room',
            salience:
                'notable',
            source:
                'deterministic_fallback',
        });
    const observed =
        makePerception({
            visualScope:
                'none',
            audibleScope:
                'target',
            salience:
                'normal',
            directParticipantActorIds: [
                'hermione',
            ],
            source:
                'post_turn_observer',
        });

    assert.deepEqual(
        reconcileObservedPerceptionWithFallback(
            observed,
            fallback,
        ),
        fallback,
    );
    const privateFallback =
        makePerception({
            visualScope:
                'none',
            audibleScope:
                'target',
            salience:
                'subtle',
            concealment:
                'successful',
            source:
                'deterministic_fallback',
        });
    assert.deepEqual(
        reconcileObservedPerceptionWithFallback(
            observed,
            privateFallback,
        ),
        observed,
    );
});

test('room-wide notable event knowledge becomes neutral memory for every witness', () => {
    const perception =
        makePerception({
            salience:
                'major',
        });
    const resolution =
        resolveEventWitnesses({
            perception,
            localPresence,
            actors,
        });
    const eventKnowledge =
        normalizeEventKnowledge({
            version: 2,
            eventKind:
                'observed',
            sceneId:
                'first_charms_class',
            clock:
                '1991-09-02 · 12:30',
            sourceMessageIds: [
                201,
                202,
            ],
            summaryEn:
                'Tina destroyed Harry\'s spare quill in a public magical backfire.',
            ...resolution,
            perception,
            source:
                'deterministic_fallback',
        }, {
            actors,
            cohortIds: [
                cohort.id,
            ],
            sourceTexts: [
                perception
                    .evidenceText,
            ],
        });
    const state =
        strictActorContextState();
    const transaction = {
        publicEvent:
            '蒂娜在公开的魔法反噬中毁掉了哈利的备用羽毛笔。',
        eventKnowledge,
    };
    const first =
        applyWitnessedEventMemories(
            state,
            transaction,
        );
    const second =
        applyWitnessedEventMemories(
            first,
            transaction,
        );
    const witnessMemories =
        Object.entries(
            first
                .actorMemoryIndex
                .byActorId,
        )
            .filter(([
                actorId,
            ]) =>
                resolution
                    .witnessActorIds
                    .includes(
                        actorId,
                    ))
            .map(([
                ,
                memory,
            ]) => memory);

    assert.equal(
        witnessMemories.length,
        roomActorIds.length,
    );
    assert.equal(
        witnessMemories.every(memory =>
            memory
                .everyday
                .some(reference =>
                    reference.recordType ===
                        'event' &&
                    reference.recordId ===
                    eventKnowledge
                        .eventId)),
        true,
    );
    assert.deepEqual(
        second
            .actorMemoryIndex,
        first.actorMemoryIndex,
    );
    const privateEvent = {
        ...eventKnowledge,
        eventId:
            'private_event',
        perception: {
            ...perception,
            visualScope:
                'none',
            audibleScope:
                'target',
            salience:
                'subtle',
        },
        witnessActorIds: [
            'harry',
        ],
    };
    const privateResult =
        applyWitnessedEventMemories(
            state,
            {
                eventKnowledge:
                    privateEvent,
            },
        );
    assert.equal(
        privateResult.eventKnowledge
            .some(event =>
                event.eventId ===
                    'private_event'),
        true,
    );
    assert.equal(
        Object.values(
            privateResult
                .actorMemoryIndex
                .byActorId,
        ).some(memory =>
            memory.everyday.some(
                reference =>
                    reference.recordId ===
                    'private_event',
            )),
        false,
    );
});

test('Event player ACL is false by default, ignores model input, and becomes visible only after committed writer proof', () => {
    const perception =
        makePerception();
    const resolution =
        resolveEventWitnesses({
            perception,
            localPresence,
            actors,
        });
    const proposed =
        normalizeEventKnowledge({
            version: 2,
            eventKind:
                'observed',
            sceneId:
                'first_charms_class',
            clock:
                '1991-09-02 · 12:30',
            sourceMessageIds: [202],
            summaryEn:
                'Tina levitated Ron instead of the feather.',
            ...resolution,
            perception,
            knownToPlayer: true,
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
    assert.equal(
        proposed.knownToPlayer,
        false,
    );

    const base =
        strictActorContextState();
    const withMemory =
        applyWitnessedEventMemories(
            base,
            {
                eventKnowledge:
                    proposed,
            },
        );
    assert.equal(
        withMemory
            .eventKnowledge[0]
            .knownToPlayer,
        false,
    );
    assert.equal(
        buildActorDossierViewModel(
            withMemory,
            'ron',
            'player',
        ).memories.everyday
            .length,
        0,
    );

    const modelRetry =
        reduceEventKnowledge(
            withMemory,
            {
                ...proposed,
                knownToPlayer: true,
            },
        );
    assert.equal(
        modelRetry[0]
            .knownToPlayer,
        false,
    );

    const committed =
        markCommittedMessageEventsKnownToPlayer(
            withMemory,
            {
                is_user: false,
                is_system: false,
                extra: {
                    hogwartsMud: {
                        role:
                            'scene_turn',
                        segments: [{
                            type:
                                'narration',
                            textEn:
                                'Ron drops back into his chair.',
                        }],
                    },
                },
            },
            202,
            [proposed.eventId],
        );
    assert.equal(
        committed
            .eventKnowledge[0]
            .knownToPlayer,
        true,
    );
    assert.equal(
        buildActorDossierViewModel(
            committed,
            'ron',
            'player',
        ).memories.everyday[0]
            .recordId,
        proposed.eventId,
    );

    const preserved =
        reduceEventKnowledge(
            committed,
            {
                ...proposed,
                knownToPlayer: false,
            },
        );
    assert.equal(
        preserved[0]
            .knownToPlayer,
        true,
    );
});

test('structured perception owns private witness scope while fallback stays neutral', () => {
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
        'nearby',
    );
    assert.equal(
        noteFallback.audibleScope,
        'nearby',
    );
    assert.equal(
        noteFallback.concealment,
        'none',
    );
});

test('fallback spell visibility comes from structured spell input, not concealment prose', () => {
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
        'none',
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
        'none',
    );
    assert.equal(
        successful.visualScope,
        'room',
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
            version: 2,
            eventKind:
                'observed',
            sceneId:
                'first_charms_class',
            clock:
                '1991-09-02 · 12:30',
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
