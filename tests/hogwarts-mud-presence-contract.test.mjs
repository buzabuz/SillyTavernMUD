/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ACTOR_PRESENT_COMPATIBILITY,
    createDefaultCharacterDraft,
    createInitialWorldState,
    createStableContractId,
    EVENT_KNOWLEDGE_OBSERVED_KEYS,
    getActiveInteractionActorIds,
    normalizeCohort,
    normalizeEventKnowledge,
    normalizeLocalPresence,
    normalizePerception,
    normalizeWitnessResolution,
    PERCEPTION_CONTRACT_KEYS,
    PRESENCE_WITNESS_SCHEMA_VERSION,
    validateCohortContract,
    validateEventKnowledgeContract,
    validateLocalPresenceContract,
    validatePerceptionContract,
    validateWitnessResolutionContract,
} from '../public/scripts/extensions/hogwarts-mud/helpers.js';

const actors = [
    {
        id: 'ron',
        present: true,
        lifeStatus: 'alive',
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    },
    {
        id: 'hermione',
        present: false,
        lifeStatus: 'alive',
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    },
    {
        id: 'dean',
        lifeStatus: 'alive',
        mapId: 'hogwarts_castle',
        roomId: 'great_hall',
    },
    {
        id: 'ghost',
        lifeStatus: 'dead',
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    },
    {
        id: 'missing_student',
        lifeStatus: 'missing',
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    },
];

test('new worlds initialize the versioned presence and witness contract', () => {
    const state = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );

    assert.equal(
        state.presenceWitnessVersion,
        PRESENCE_WITNESS_SCHEMA_VERSION,
    );
    assert.deepEqual(
        state.activeInteractionActorIds,
        [],
    );
    assert.deepEqual(
        state.localPresence,
        {
            version: 1,
            mapId: '',
            roomId: '',
            occupantActorIds: [],
            cohortIds: [],
            updatedTurn: 0,
            source: 'initial',
        },
    );
    assert.deepEqual(state.cohorts, []);
    assert.deepEqual(
        state.eventKnowledge,
        [],
    );
});

test('actor.present remains an active-interaction compatibility field only', () => {
    assert.equal(
        ACTOR_PRESENT_COMPATIBILITY.meaning,
        'active_interaction',
    );
    assert.equal(
        ACTOR_PRESENT_COMPATIBILITY
            .physicalPresenceAuthority,
        'localPresence',
    );
    assert.deepEqual(
        getActiveInteractionActorIds({
            actors,
        }),
        ['dean', 'ron'],
    );
    assert.deepEqual(
        getActiveInteractionActorIds({
            actors,
            activeInteractionActorIds: [
                'hermione',
                'ron',
            ],
        }),
        ['hermione', 'ron'],
    );
});

test('local presence filters illegal, unavailable, and spatially inconsistent occupants without treating present false as an exit', () => {
    const normalized =
        normalizeLocalPresence({
            version: 99,
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            occupantActorIds: [
                'ron',
                'unknown_actor',
                'hermione',
                'ghost',
                'missing_student',
                'dean',
                'ron',
                '__proto__',
            ],
            cohortIds: [],
            updatedTurn: '50',
            source: 'scene_roster',
            unauthorized: true,
        }, { actors });

    assert.deepEqual(normalized, {
        version: 1,
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
        occupantActorIds: [
            'hermione',
            'ron',
        ],
        cohortIds: [],
        updatedTurn: 50,
        source: 'scene_roster',
    });
    assert.equal(
        validateLocalPresenceContract({
            ...normalized,
            unauthorized: true,
        }, { actors }).valid,
        false,
    );
});

test('cohort rosters use stable ids and filter unavailable or out-of-room known members', () => {
    const source = {
        labelEn:
            'Gryffindor first-years in Charms',
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
        knownMemberActorIds: [
            'ron',
            'hermione',
            'ghost',
            'dean',
            'ron',
        ],
        source: 'class_roster',
        ignored: 'not persisted',
    };
    const first = normalizeCohort(
        source,
        { actors },
    );
    const second = normalizeCohort(
        JSON.parse(JSON.stringify(first)),
        { actors },
    );

    assert.match(
        first.id,
        /^cohort_[a-z0-9_]+$/,
    );
    assert.equal(
        first.id,
        createStableContractId(
            'cohort',
            {
                labelEn: source.labelEn,
                mapId: source.mapId,
                roomId: source.roomId,
                source: source.source,
            },
        ),
    );
    assert.deepEqual(
        first.knownMemberActorIds,
        ['hermione', 'ron'],
    );
    assert.deepEqual(second, first);
    assert.equal(
        validateCohortContract(
            first,
            { actors },
        ).valid,
        true,
    );
    assert.deepEqual(
        Object.keys(first),
        [
            'version',
            'id',
            'labelEn',
            'mapId',
            'roomId',
            'knownMemberActorIds',
            'source',
        ],
    );

    const presence = normalizeLocalPresence({
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
        cohortIds: [
            first.id,
            'wrong_room_cohort',
        ],
        source: 'cohort_roster',
    }, {
        actors,
        cohorts: [
            first,
            {
                id: 'wrong_room_cohort',
                labelEn: 'Great Hall crowd',
                mapId: 'hogwarts_castle',
                roomId: 'great_hall',
                knownMemberActorIds: [],
                source: 'scene_roster',
            },
        ],
    });
    assert.deepEqual(
        presence.cohortIds,
        [first.id],
    );
});

test('perception normalization enforces enums, actor ids, evidence grounding, and a witness-free whitelist', () => {
    const input = {
        visualScope: 'room',
        audibleScope: 'room',
        salience: 'major',
        attribution: 'clear',
        concealment: 'attempted',
        directParticipantActorIds: [
            'ron',
            'unknown_actor',
            'ron',
        ],
        evidenceText:
            'Ron rose abruptly toward the rafters.',
        confidence: 0.95,
        source: 'post_turn_observer',
        witnessActorIds: ['hermione'],
    };
    const options = {
        actors,
        sourceTexts: [
            'The feather stayed put. Ron rose abruptly toward the rafters.',
        ],
    };
    const normalized =
        normalizePerception(
            input,
            options,
        );

    assert.deepEqual(
        Object.keys(normalized),
        PERCEPTION_CONTRACT_KEYS,
    );
    assert.deepEqual(
        normalized
            .directParticipantActorIds,
        ['ron'],
    );
    assert.equal(
        normalized.witnessActorIds,
        undefined,
    );
    assert.equal(
        validatePerceptionContract(
            input,
            options,
        ).valid,
        false,
    );
    assert.equal(
        normalizePerception({
            ...input,
            visualScope: 'planet',
        }, options),
        null,
    );
    assert.equal(
        normalizePerception(
            input,
            {
                ...options,
                sourceTexts: [
                    'No matching source text.',
                ],
            },
        ),
        null,
    );
});

test('witness resolution is stable, includes participants, and requires a basis for every witness', () => {
    const normalized =
        normalizeWitnessResolution({
            participantActorIds: ['ron'],
            witnessActorIds: [
                'hermione',
                'ron',
                'unknown_actor',
            ],
            witnessCohortIds: [
                'charms_class',
                'unknown_cohort',
            ],
            witnessBasis: {
                ron: 'room_visual',
                hermione:
                    'room_visual_audible',
            },
        }, {
            actors,
            cohortIds: ['charms_class'],
        });

    assert.deepEqual(normalized, {
        version: 1,
        participantActorIds: ['ron'],
        witnessActorIds: [
            'hermione',
            'ron',
        ],
        witnessCohortIds: [
            'charms_class',
        ],
        witnessBasis: {
            hermione:
                'room_visual_audible',
            ron: 'direct',
        },
    });
    assert.equal(
        validateWitnessResolutionContract({
            ...normalized,
            unauthorized: true,
        }, {
            actors,
            cohortIds: ['charms_class'],
        }).valid,
        false,
    );
    assert.equal(
        normalizeWitnessResolution({
            participantActorIds: ['ron'],
            witnessActorIds: ['hermione'],
            witnessBasis: {},
        }, { actors }),
        null,
    );
});

test('event knowledge receives an idempotent id and survives normalized serialization', () => {
    const source = {
        version: 2,
        eventKind: 'observed',
        sceneId: 'first_charms_class',
        clock: '1991-09-02 · 11:30',
        sourceMessageIds: [191, 190, 191],
        summaryEn:
            'Tina levitated Ron instead of the feather.',
        activationSchemaIds: [
            'schema_ron_player_patience',
            'schema_ron_player_patience',
        ],
        participantActorIds: ['ron'],
        witnessActorIds: [
            'ron',
            'hermione',
        ],
        witnessCohortIds: [
            'charms_class',
        ],
        witnessBasis: {
            ron: 'direct',
            hermione:
                'room_visual_audible',
        },
        perception: {
            visualScope: 'room',
            audibleScope: 'room',
            salience: 'major',
            attribution: 'clear',
            concealment: 'attempted',
            directParticipantActorIds: [
                'ron',
            ],
            evidenceText:
                'Ron rose abruptly toward the rafters.',
            confidence: 0.95,
            source: 'post_turn_observer',
        },
        knownToPlayer: true,
        source: 'post_turn_observer',
    };
    const options = {
        actors,
        cohortIds: ['charms_class'],
        sourceTexts: [
            'Ron rose abruptly toward the rafters.',
        ],
    };
    const first =
        normalizeEventKnowledge(
            source,
            options,
        );
    const second =
        normalizeEventKnowledge(
            JSON.parse(JSON.stringify(first)),
            options,
        );

    assert.match(
        first.eventId,
        /^event_[a-z0-9_]+$/,
    );
    assert.deepEqual(
        first.sourceMessageIds,
        [190, 191],
    );
    assert.deepEqual(
        first.activationSchemaIds,
        ['schema_ron_player_patience'],
    );
    assert.deepEqual(second, first);
    assert.deepEqual(
        Object.keys(first),
        EVENT_KNOWLEDGE_OBSERVED_KEYS,
    );
    assert.equal(
        validateEventKnowledgeContract(
            first,
            options,
        ).valid,
        true,
    );
    assert.equal(
        first.relationshipDeltas,
        undefined,
    );
});
