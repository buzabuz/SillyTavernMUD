/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildNarrativeAuthoritySnapshot,
    validateNarrationConsistency,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-authority.js';
import {
    validateSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    validateScenePerformance,
    validateTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';

function createAuthorityState() {
    return {
        timelineEpoch:
            'timeline_tina_1991',
        stateRevision: 17,
        clock:
            '1991-09-02 · 19:00',
        scene: {
            id:
                'transfiguration_aftermath',
            temporalFactsEn: [
                'Class has ended.',
            ],
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
            roomStates: {
                'hogwarts_castle:transfiguration_classroom': {
                    visibleResiduesEn: [
                        'A scorched mark remains on the desk.',
                    ],
                    materialEffects: [{
                        id: 'effect_scorch',
                        category:
                            'object_state',
                        persistence:
                            'persistent',
                        description:
                            'A scorched mark remains.',
                    }],
                },
            },
        },
        actors: [
            {
                id: 'z_actor',
                nameEn: 'Zed',
                present: false,
            },
            {
                id:
                    'canon_harry_james_potter',
                nameEn:
                    'Harry Potter',
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
                currentActivityEn:
                    'Watching the desk.',
            },
        ],
        items: [
            {
                id:
                    'vanished_quill',
                type: 'tool',
                labelEn:
                    'Vanished Quill',
                ownerId:
                    'canon_harry_james_potter',
                holderId:
                    'canon_harry_james_potter',
                state: 'destroyed',
                physicalForm:
                    'absent',
                sourceEventId:
                    'event_vanish',
            },
            {
                id:
                    'quill_fragments',
                type: 'tool',
                labelEn:
                    'Quill Fragments',
                ownerId:
                    'canon_harry_james_potter',
                holderId:
                    'canon_harry_james_potter',
                state: 'destroyed',
                physicalForm:
                    'remains',
                sourceEventId:
                    'event_fragments',
            },
        ],
        actorPresentations: {
            canon_harry_james_potter: {
                outfit:
                    'School robes.',
                wornItemIds: [
                    'vanished_quill',
                    'quill_fragments',
                ],
                heldItemIds: [
                    'vanished_quill',
                    'quill_fragments',
                ],
                updatedClock:
                    '1991-09-02 · 19:00',
            },
        },
        currentOpenFacts: [
            {
                id: 'fact_b',
                text:
                    'The lesson is over.',
            },
            {
                id: 'fact_a',
                text:
                    'The room is still occupied.',
            },
        ],
        supersededSourceRefs: [
            'message:214',
            'message:212',
        ],
    };
}

function createConsistencyState() {
    const state =
        createAuthorityState();
    state.character = {
        identity: {
            name: 'Tina Zhang',
        },
    };
    state.scene = {
        ...state.scene,
        nameEn:
            'Transfiguration Classroom',
        mapId:
            'hogwarts_castle',
        roomId:
            'transfiguration_classroom',
    };
    state.map.customLocalMaps = [{
        id:
            'hogwarts_castle',
        nameEn: 'Hogwarts Castle',
        nodes: [{
            id:
                'transfiguration_classroom',
            nameEn:
                'Transfiguration Classroom',
            aliases: [
                'Transfiguration',
            ],
        }, {
            id: 'library',
            nameEn: 'Library',
        }],
    }];
    state.actorLibrary = [{
        id:
            'canon_harry_james_potter',
        nameEn: 'Harry Potter',
        aliases: ['Harry'],
    }, {
        id:
            'canon_hermione_granger',
        nameEn:
            'Hermione Granger',
        aliases: ['Hermione'],
    }];
    state.actors.push({
        id:
            'canon_hermione_granger',
        nameEn:
            'Hermione Granger',
        present: false,
        mapId:
            'hogwarts_castle',
        roomId: 'library',
        lifeStatus: 'alive',
    });
    state.items[0].aliases = [
        'brass quill',
    ];
    return state;
}

function createTurn(
    textEn,
    segment = {},
) {
    return {
        protocolVersion: 2,
        elapsedMinutes: 15,
        publicEventEn: textEn,
        segments: [{
            type: 'narration',
            textEn,
            ...segment,
        }],
        actorPresence: {
            presentActorIdsAfterTurn: [
                'canon_harry_james_potter',
            ],
        },
        actorUpdates: [],
        itemUpdates: [],
        itemOperations: [],
        itemCandidates: [],
        revealedClues: [],
    };
}

function createTransitionPackage(
    openingTextEn,
) {
    return {
        transitionMinutes: 5,
        nextClock:
            '1991-09-02 · 19:05',
        closureSummaryEn:
            'The lesson ends.',
        authorQuillEn:
            'The lesson closes with the practical dignity of a scorched desk, a vanished quill, and several students pretending this was the intended result. The editorial desk awards the furniture full marks for endurance and reserves judgment on everyone else until the smoke clears.',
        unresolvedThreadsEn: [],
        worldChanges: {
            prophetBriefs: [],
            gossipUpdates: [],
        },
        relationshipUpdates: [],
        nextScene: {
            id:
                'transfiguration_evening',
            nameEn:
                'Transfiguration Classroom',
            summaryEn:
                'The classroom settles after the lesson.',
            chapterEn:
                'After the Lesson',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            explorationHookEn:
                'A scorched mark remains on the desk.',
            temporalFactsEn: [],
            actorStates: [{
                id:
                    'canon_harry_james_potter',
                present: true,
                currentActivityEn:
                    'Watching the scorched desk.',
                currentIntentEn: '',
                lifeStatus: 'alive',
                lifeStatusPermanent:
                    false,
                lifeStatusDetailEn:
                    'Alive and unharmed.',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
            }],
            openingSegments: [{
                type: 'narration',
                textEn:
                    openingTextEn,
            }, {
                type: 'dialogue',
                actorId:
                    'canon_harry_james_potter',
                textEn:
                    'That was not the intended result.',
            }],
            followingSceneIntent: {
                titleEn:
                    'Visit the Library',
                summaryEn:
                    'Continue the evening in the library.',
                triggerEn:
                    'After the classroom is cleared.',
                mapId:
                    'hogwarts_castle',
                roomId: 'library',
                tier: 'medium',
            },
        },
    };
}

test('Narrative Authority Snapshot deterministically projects revision, scene, actor, item, material and room authority', () => {
    const state =
        createAuthorityState();
    const before =
        structuredClone(state);
    const snapshot =
        buildNarrativeAuthoritySnapshot(
            state,
        );

    assert.deepEqual(
        Object.keys(snapshot),
        [
            'version',
            'timelineEpoch',
            'stateRevision',
            'clock',
            'sceneId',
            'currentActors',
            'currentItems',
            'currentMaterialState',
            'currentRoomState',
            'currentOpenFacts',
            'supersededSourceRefs',
        ],
    );
    assert.equal(snapshot.version, 1);
    assert.equal(
        snapshot.timelineEpoch,
        'timeline_tina_1991',
    );
    assert.equal(
        snapshot.stateRevision,
        17,
    );
    assert.equal(
        snapshot.sceneId,
        'transfiguration_aftermath',
    );
    assert.deepEqual(
        snapshot.currentActors
            .map(actor =>
                actor.id),
        [
            'canon_harry_james_potter',
        ],
    );
    assert.deepEqual(
        snapshot.currentItems
            .map(item => [
                item.id,
                item.physicalForm,
                item.holderId,
            ]),
        [
            [
                'quill_fragments',
                'remains',
                'canon_harry_james_potter',
            ],
            [
                'vanished_quill',
                'absent',
                '',
            ],
        ],
    );
    assert.deepEqual(
        snapshot.currentActors[0]
            .presentation
            .heldItemIds,
        [
            'quill_fragments',
        ],
    );
    assert.deepEqual(
        snapshot.currentActors[0]
            .presentation
            .wornItemIds,
        [],
    );
    assert.deepEqual(
        snapshot
            .currentMaterialState
            .actorPresentations
            .canon_harry_james_potter
            .heldItemIds,
        [
            'quill_fragments',
        ],
    );
    assert.deepEqual(
        snapshot.currentRoomState
            .visibleResiduesEn,
        [
            'A scorched mark remains on the desk.',
        ],
    );
    assert.deepEqual(
        snapshot
            .supersededSourceRefs,
        [
            'message:212',
            'message:214',
        ],
    );
    assert.deepEqual(state, before);
    assert.deepEqual(
        buildNarrativeAuthoritySnapshot(
            state,
        ),
        snapshot,
    );
});

test('Narrative Authority Snapshot applies stable defaults without mutating an empty state', () => {
    const state = {};
    const snapshot =
        buildNarrativeAuthoritySnapshot(
            state,
        );
    assert.equal(
        snapshot.timelineEpoch,
        'stable_epoch',
    );
    assert.equal(
        snapshot.stateRevision,
        0,
    );
    assert.equal(snapshot.sceneId, '');
    assert.deepEqual(
        snapshot.currentActors,
        [],
    );
    assert.deepEqual(
        snapshot.currentItems,
        [],
    );
    assert.deepEqual(
        snapshot.currentRoomState,
        {},
    );
    assert.deepEqual(state, {});
});

test('narration consistency accepts current authoritative item, actor, scene, clock and spell identity', () => {
    const validation =
        validateTurnTransaction(
            createTurn(
                'At 19:00 in the Transfiguration Classroom, Harry Potter watches the quill fragments while Lumos remains the Wand-Lighting Charm.',
            ),
            createConsistencyState(),
        );
    assert.doesNotMatch(
        validation.errors.join('\n'),
        /正文权威冲突/u,
    );
});

test('[defect-probing] turn validation rejects direct current Item, Actor, Scene, clock and Spell contradictions', () => {
    const validation =
        validateTurnTransaction(
            createTurn(
                'Now at 08:15 in the Library, Hermione Granger holds the intact Vanished Quill while Accio is the Wand-Lighting Charm.',
            ),
            createConsistencyState(),
        );
    assert.match(
        validation.errors.join('\n'),
        /正文权威冲突/u,
    );
});

test('[defect-probing] Performer rejects absent Item claims made in dialogue', () => {
    const validation =
        validateScenePerformance(
            createTurn(
                'I am holding the intact Vanished Quill.',
                {
                    type: 'dialogue',
                    actorId:
                        'canon_harry_james_potter',
                },
            ),
            createConsistencyState(),
            {
                elapsedMinutes: 15,
            },
        );
    const errors =
        validation.errors.join('\n');

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        errors,
        /\[item:vanished_quill\/physicalForm\]/u,
    );
});

test('Performer checks Actor presence, room and life claims across narration and dialogue', () => {
    const state =
        createConsistencyState();
    state.actors.find(actor =>
        actor.id ===
            'canon_harry_james_potter')
        .lifeStatus = 'dead';
    const transaction =
        createTurn(
            'Hermione Granger stands in the Transfiguration Classroom.',
        );
    transaction.segments.push({
        type: 'dialogue',
        actorId:
            'canon_harry_james_potter',
        textEn:
            'Harry Potter is breathing.',
    });
    const validation =
        validateScenePerformance(
            transaction,
            state,
            {
                elapsedMinutes: 15,
            },
        );
    const errors =
        validation.errors.join('\n');

    assert.match(
        errors,
        /\[actor:canon_hermione_granger\/presence\]/u,
    );
    assert.match(
        errors,
        /\[actor:canon_hermione_granger\/room\]/u,
    );
    assert.match(
        errors,
        /\[actor:canon_harry_james_potter\/life\]/u,
    );
});

test('Performer checks Scene destination, clock and Spell identity claims in dialogue', () => {
    const validation =
        validateScenePerformance(
            createTurn(
                'Now at 08:15 in the Library, Accio is the Wand-Lighting Charm.',
                {
                    type: 'dialogue',
                    actorId:
                        'canon_harry_james_potter',
                },
            ),
            createConsistencyState(),
            {
                elapsedMinutes: 15,
            },
        );
    const errors =
        validation.errors.join('\n');

    assert.match(
        errors,
        /\[scene:destination\]/u,
    );
    assert.match(
        errors,
        /\[scene:clock\]/u,
    );
    assert.match(
        errors,
        /\[spell:.*\/identity\]/u,
    );
});

test('authority validation checks every text-bearing narrative segment', () => {
    const validation =
        validateNarrationConsistency(
            [{
                type: 'stage_direction',
                textEn:
                    'Hermione Granger holds the intact Vanished Quill.',
            }],
            createConsistencyState(),
        );

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        validation.errors.join('\n'),
        /\[item:vanished_quill\/physicalForm\]/u,
    );
});

test('[defect-probing] scene opening package validation rejects prose that contradicts next-scene authority', () => {
    const validation =
        validateSceneTransitionPackage(
            createTransitionPackage(
                'Now at 08:15 in the Library, Hermione Granger holds the intact Vanished Quill.',
            ),
            createConsistencyState(),
            {
                expectedMapId:
                    'hogwarts_castle',
                expectedRoomId:
                    'transfiguration_classroom',
                tier: 'medium',
            },
        );
    assert.match(
        validation.errors.join('\n'),
        /正文权威冲突/u,
    );
});

test('[defect-probing] scene Opening rejects authority conflicts in dialogue segments', () => {
    const payload =
        createTransitionPackage(
            'The classroom settles after the lesson.',
        );
    payload.nextScene
        .openingSegments[1]
        .textEn =
        'Now at 08:15 in the Library, Hermione Granger holds the intact Vanished Quill while Accio is the Wand-Lighting Charm.';
    const validation =
        validateSceneTransitionPackage(
            payload,
            createConsistencyState(),
            {
                expectedMapId:
                    'hogwarts_castle',
                expectedRoomId:
                    'transfiguration_classroom',
                tier: 'medium',
            },
        );
    const errors =
        validation.errors.join('\n');

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        errors,
        /\[item:vanished_quill\/physicalForm\]/u,
    );
    assert.match(
        errors,
        /\[actor:canon_hermione_granger\/presence\]/u,
    );
    assert.match(
        errors,
        /\[scene:destination\]/u,
    );
    assert.match(
        errors,
        /\[scene:clock\]/u,
    );
    assert.match(
        errors,
        /\[spell:.*\/identity\]/u,
    );
});

test('[defect-probing] scene opening validation rejects uncommitted secrets, promises, relationships, and gifts', () => {
    const payload =
        createTransitionPackage(
            'Harry says Tina is the hidden heir, promises to show her the forbidden book, declares they are family now, and gives her his silver ring.',
        );
    const validation =
        validateSceneTransitionPackage(
            payload,
            createConsistencyState(),
            {
                expectedMapId:
                    'hogwarts_castle',
                expectedRoomId:
                    'transfiguration_classroom',
                tier: 'medium',
            },
        );
    const errors =
        validation.errors.join('\n');

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        errors,
        /未提交承诺/u,
    );
    assert.match(
        errors,
        /隐藏事实/u,
    );
    assert.match(
        errors,
        /关系变更/u,
    );
    assert.match(
        errors,
        /物品转移/u,
    );
});

test('narration consistency allows clearly attributed history, hypotheses and mistaken character beliefs', () => {
    const validation =
        validateTurnTransaction(
            createTurn(
                'Harry remembers that yesterday Hermione claimed she held the intact Vanished Quill in the Library at 08:15, but he may have been mistaken about Accio being the Wand-Lighting Charm.',
            ),
            createConsistencyState(),
        );
    assert.doesNotMatch(
        validation.errors.join('\n'),
        /正文权威冲突/u,
    );
});

test('authority validation allows explicit history, belief, uncertainty, hypotheses and incomplete attempts in narration and dialogue', () => {
    const state =
        createConsistencyState();
    const allowedStatements = [
        {
            type: 'narration',
            textEn:
                'Yesterday Hermione Granger held the intact Vanished Quill in the Library.',
        },
        {
            type: 'dialogue',
            actorId:
                'canon_harry_james_potter',
            textEn:
                'I believe Hermione Granger holds the intact Vanished Quill in the Library.',
        },
        {
            type: 'dialogue',
            actorId:
                'canon_harry_james_potter',
            textEn:
                'Perhaps Accio is the Wand-Lighting Charm.',
        },
        {
            type: 'narration',
            textEn:
                'If Hermione Granger were in the Transfiguration Classroom, she could hold the intact Vanished Quill.',
        },
        {
            type: 'narration',
            textEn:
                'Tina Zhang tries to pick up the Vanished Quill, but cannot because no physical matter remains.',
        },
        {
            type: 'dialogue',
            actorId:
                'canon_harry_james_potter',
            textEn:
                'I believe that Hermione Granger holds the intact Vanished Quill and that she is in the Library.',
        },
        {
            type: 'narration',
            textEn:
                'Yesterday Hermione Granger stood in the Library and Hermione Granger held the intact Vanished Quill.',
        },
        {
            type: 'narration',
            textEn:
                'Yesterday Hermione Granger stood in the Library while Hermione Granger held the intact Vanished Quill.',
        },
    ];

    allowedStatements.forEach(segment => {
        const validation =
            validateNarrationConsistency(
                [segment],
                state,
            );
        assert.equal(
            validation.valid,
            true,
            `${segment.type}: ${validation.errors.join('; ')}`,
        );
    });
});

test('an attributed clause does not hide a later direct current conflict', () => {
    const validation =
        validateNarrationConsistency(
            [{
                type: 'dialogue',
                actorId:
                    'canon_harry_james_potter',
                textEn:
                    'I believed the Vanished Quill was intact yesterday, but now Hermione Granger holds it in the Library.',
            }],
            createConsistencyState(),
        );

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        validation.errors.join('\n'),
        /\[actor:canon_hermione_granger\/presence\]|\[actor:canon_hermione_granger\/room\]/u,
    );
});

test('[defect-probing] Performer limits a belief exception to its dialogue clause', () => {
    const validation =
        validateScenePerformance(
            createTurn(
                'Harry believes a rumour and Hermione now holds the intact Vanished Quill.',
                {
                    type: 'dialogue',
                    actorId:
                        'canon_harry_james_potter',
                },
            ),
            createConsistencyState(),
            {
                elapsedMinutes: 15,
            },
        );

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        validation.errors.join('\n'),
        /\[item:vanished_quill\/physicalForm\]/u,
    );
});

test('authority exceptions stay clause-scoped across history, belief, hypotheses, uncertainty and attempts', () => {
    const cases = [
        {
            textEn:
                'Harry remembers that the Vanished Quill vanished yesterday while the intact Vanished Quill now rests on the desk.',
            expected:
                /\[item:vanished_quill\/physicalForm\]/u,
        },
        {
            textEn:
                'Yesterday Harry remembered an old lesson, and Hermione Granger now stands in the Transfiguration Classroom.',
            expected:
                /\[actor:canon_hermione_granger\/presence\]/u,
        },
        {
            textEn:
                'Harry believes a rumour and Accio is now the Wand-Lighting Charm.',
            expected:
                /\[spell:.*\/identity\]/u,
        },
        {
            textEn:
                'If Hermione Granger were in the Library, that would be hypothetical and currently in the Library the lesson continues.',
            expected:
                /\[scene:destination\]/u,
        },
        {
            textEn:
                'Perhaps the clock once read 08:15 and now at 08:15 the lesson continues.',
            expected:
                /\[scene:clock\]/u,
        },
        {
            textEn:
                'Tina Zhang tries to pick up the Vanished Quill and the intact Vanished Quill now rests on the desk.',
            expected:
                /\[item:vanished_quill\/physicalForm\]/u,
        },
    ];

    cases.forEach((entry, index) => {
        const validation =
            validateNarrationConsistency(
                [{
                    type:
                        index % 2 === 0
                            ? 'narration'
                            : 'dialogue',
                    actorId:
                        'canon_harry_james_potter',
                    textEn:
                        entry.textEn,
                }],
                createConsistencyState(),
            );
        assert.equal(
            validation.valid,
            false,
            entry.textEn,
        );
        assert.match(
            validation.errors.join('\n'),
            entry.expected,
            entry.textEn,
        );
    });
});

test('[defect-probing] implicit present facts after contrast and coordination clauses retain independent authority', () => {
    const cases = [
        {
            textEn:
                'Harry remembers the old lesson while the intact Vanished Quill rests on the desk.',
            expected:
                /\[item:vanished_quill\/physicalForm\]/u,
        },
        {
            textEn:
                'Harry remembers the old lesson whereas Hermione Granger stands in the Transfiguration Classroom.',
            mutateState(state) {
                state.actors.find(actor =>
                    actor.id ===
                        'canon_hermione_granger')
                    .present = true;
            },
            expected:
                /\[actor:canon_hermione_granger\/room\]/u,
        },
        {
            textEn:
                'Harry remembers the old lesson although Harry Potter is alive.',
            mutateState(state) {
                state.actors.find(actor =>
                    actor.id ===
                        'canon_harry_james_potter')
                    .lifeStatus = 'dead';
            },
            expected:
                /\[actor:canon_harry_james_potter\/life\]/u,
        },
        {
            textEn:
                'Harry remembers the old lesson though in the Library the lesson continues.',
            expected:
                /\[scene:destination\]/u,
        },
        {
            textEn:
                'Harry remembers the old lesson but at 08:15 the lesson continues.',
            expected:
                /\[scene:clock\]/u,
        },
        {
            textEn:
                'Harry remembers the old lesson and Accio is the Wand-Lighting Charm.',
            expected:
                /\[spell:.*\/identity\]/u,
        },
    ];

    cases.forEach(entry => {
        const state =
            createConsistencyState();
        entry.mutateState?.(state);
        const validation =
            validateNarrationConsistency(
                [{
                    type: 'narration',
                    textEn:
                        entry.textEn,
                }],
                state,
            );

        assert.equal(
            validation.valid,
            false,
            entry.textEn,
        );
        assert.match(
            validation.errors.join('\n'),
            entry.expected,
            entry.textEn,
        );
    });
});

test('past-tense contrast and coordination clauses remain attributed history', () => {
    const state =
        createConsistencyState();
    state.actors.find(actor =>
        actor.id ===
            'canon_harry_james_potter')
        .lifeStatus = 'dead';
    const statements = [
        'Harry remembers the old lesson while the intact Vanished Quill rested on the desk.',
        'Harry remembers the old lesson whereas Hermione Granger stood in the Transfiguration Classroom.',
        'Harry remembers the old lesson although Harry Potter was alive.',
        'Harry remembers the old lesson though in the Library the lesson continued.',
        'Harry remembers the old lesson but at 08:15 the lesson continued.',
        'Harry remembers the old lesson and Accio was the Wand-Lighting Charm.',
    ];

    statements.forEach(textEn => {
        const validation =
            validateNarrationConsistency(
                [{
                    type: 'narration',
                    textEn,
                }],
                state,
            );

        assert.equal(
            validation.valid,
            true,
            `${textEn}: ${validation.errors.join('; ')}`,
        );
    });
});

test('[defect-probing] scene Opening validates current facts after attributed clauses in narration and dialogue', () => {
    const payload =
        createTransitionPackage(
            'Harry remembers yesterday and now at 08:15 in the Library, Hermione Granger stands holding the intact Vanished Quill.',
        );
    payload.nextScene
        .openingSegments[1]
        .textEn =
        'I may be mistaken and Accio is now the Wand-Lighting Charm.';
    const validation =
        validateSceneTransitionPackage(
            payload,
            createConsistencyState(),
            {
                expectedMapId:
                    'hogwarts_castle',
                expectedRoomId:
                    'transfiguration_classroom',
                tier: 'medium',
            },
        );
    const errors =
        validation.errors.join('\n');

    assert.equal(
        validation.valid,
        false,
    );
    assert.match(
        errors,
        /\[item:vanished_quill\/physicalForm\]/u,
    );
    assert.match(
        errors,
        /\[actor:canon_hermione_granger\/presence\]/u,
    );
    assert.match(
        errors,
        /\[scene:destination\]/u,
    );
    assert.match(
        errors,
        /\[scene:clock\]/u,
    );
    assert.match(
        errors,
        /\[spell:.*\/identity\]/u,
    );
});
