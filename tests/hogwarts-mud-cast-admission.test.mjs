/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CANON_CHARACTER_CATALOG,
    findCanonCharacter,
    findMentionedCanonCharacters,
    getCanonNameAliases,
    getCanonSettingProfile,
    recommendCanonCharacters,
} from '../public/scripts/extensions/hogwarts-mud/canon-characters.js';
import {
    getCanonicalCanonActorId,
} from '../public/scripts/extensions/hogwarts-mud/canon-localization.zh-cn.js';
import {
    admitMentionedKnownActors,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-admission.js';
import {
    reconcileCanonActorDisplayNames,
    reconcileTemporaryActorDisplayNames,
    resolveTemporaryActorRevealedName,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import {
    buildActorSelectionPolicy,
    buildSceneCastRotationPolicy,
    buildStoryCastPolicy,
    DEFAULT_CAST_POLICY,
} from '../public/scripts/extensions/hogwarts-mud/domain/cast.js';
import {
    analyzePacingSignals,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-signals.js';
import {
    validatePacingAssessment,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import {
    normalizeSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    applySceneTransition,
} from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import {
    addCurrentPlayerRelationship,
    createCurrentActorProposal,
    createCurrentPlayingState,
    createCurrentTransitionPackage,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';

test('temporary actor display names do not migrate from dialogue prose', () => {
    const actor = {
        id: 'phillip_meadows',
        nameEn:
            'Tall dark-haired Gryffindor boy',
        name:
            'Tall dark-haired Gryffindor boy',
        temporary: true,
        aliases: [
            'Tall dark-haired Gryffindor boy',
        ],
    };
    const segments = [{
        type: 'dialogue',
        actorId: actor.id,
        textEn:
            'Phillip. Third year.',
        textZh:
            '菲利普。三年级。',
    }];
    assert.deepEqual(
        resolveTemporaryActorRevealedName(
            actor,
            segments,
        ),
        {
            nameEn:
                'Tall dark-haired Gryffindor boy',
            name:
                'Tall dark-haired Gryffindor boy',
        },
    );
    const migrated =
        reconcileTemporaryActorDisplayNames(
            {
                actors: [actor],
            },
            [{
                extra: {
                    hogwartsMud: {
                        segments,
                    },
                },
            }],
        );
    assert.equal(
        migrated.state
            .actors[0].nameEn,
        'Tall dark-haired Gryffindor boy',
    );
});

test('exactly mentioned nearby acquaintances are admitted for one turn without writing memory', () => {
    const state =
        createCurrentPlayingState();
    const lavender =
        createCurrentActorProposal(
            'canon_lavender_brown',
            {
                nameEn:
                    'Lavender Brown',
                present: false,
                roomId:
                    'back_garden',
            },
        );
    state.actorLibrary.push(
        lavender,
    );
    state.actors.push({
        id: lavender.id,
        present: false,
        mapId:
            'zhang_home',
        roomId:
            'back_garden',
        lifeStatus: 'alive',
    });
    normalizeCurrentActorFixtureInPlace(
        state,
    );
    const admitted =
        admitMentionedKnownActors(
            state,
            'I nod to Lavender Brown.',
        );
    assert.equal(
        admitted
            .admittedActors[0]
            .id,
        lavender.id,
    );
    assert.equal(
        Object.hasOwn(
            admitted
                .admittedActors[0],
            'requireEverydayMemory',
        ),
        false,
    );
});

test('social discovery stages advance at 12 and 16 meaningful known actors', () => {
    const createState = count => {
        const state =
            createCurrentPlayingState();
        const actors =
            Array.from(
                {
                    length: count,
                },
                (_, index) =>
                    createCurrentActorProposal(
                        `known_actor_${index}`,
                        {
                            nameEn:
                                `Known Actor ${index}`,
                        },
                    ),
            );
        state.actorLibrary = actors;
        state.actors =
            actors.map(actor => ({
                id: actor.id,
                present: true,
                mapId:
                    state.map
                        .activeMapId,
                roomId:
                    state.map
                        .currentLocalNodeId,
                lifeStatus:
                    'alive',
            }));
        state.socialGraph.relationships =
            [];
        for (const actor of
            actors) {
            addCurrentPlayerRelationship(
                state,
                actor.id,
                ['friend'],
            );
        }
        return normalizeCurrentActorFixtureInPlace(
            state,
        );
    };
    assert.equal(
        buildStoryCastPolicy(
            createState(11),
        ).socialStage,
        'exploration',
    );
    assert.equal(
        buildStoryCastPolicy(
            createState(12),
        ).socialStage,
        'circle_formation',
    );
    assert.equal(
        buildStoryCastPolicy(
            createState(16),
        ).socialStage,
        'socially_stable',
    );
});

test('actor selection policy preserves explicit and pursued targets above stage quotas', () => {
    const state =
        createCurrentPlayingState();
    const policy =
        buildActorSelectionPolicy(
            state,
            'I want to speak with Minerva McGonagall.',
            [],
            {
                valid: true,
                actorIds: [
                    'minerva_mcgonagall',
                ],
            },
        );
    assert.equal(
        policy.explicitActorIds
            .includes(
                'minerva_mcgonagall',
            ),
        true,
    );
    assert.equal(
        buildActorSelectionPolicy(
            state,
            'I want to meet Albus Dumbledore.',
        ).explicitCanonCandidates
            .some(actor =>
                /dumbledore/iu.test(
                    actor.nameEn)),
        true,
    );
});

test('explicit Harry aliases force stable Canon admission through pacing', () => {
    const action =
        '我走到哈利·波特旁边，问他要签名。';
    assert.deepEqual(
        findMentionedCanonCharacters(
            action,
        ).map(actor =>
            actor.id),
        [
            'canon_harry_james_potter',
        ],
    );
    const state =
        createCurrentPlayingState();
    assert.equal(
        analyzePacingSignals(
            state,
            action,
        ).shouldAssess,
        false,
    );
    assert.equal(
        buildActorSelectionPolicy(
            state,
            action,
        ).explicitCanonCandidates[0]
            .id,
        'canon_harry_james_potter',
    );
});

test('pacing admits a recognizable companion by stable actor ID', () => {
    const state =
        createCurrentPlayingState();
    const ron =
        findCanonCharacter(
            'canon_ronald_bilius_weasley',
        );
    assert.equal(
        getCanonSettingProfile(
            ron,
        ).settingTags.length > 0,
        true,
    );
    assert.equal(
        validatePacingAssessment(
            {
                decision:
                    'intervene',
                diagnosisEn:
                    'Admit Ron.',
                reassessAfterTurns: 3,
                intervention: {
                    kind:
                        'new_actor',
                },
            },
            state,
        ).valid,
        false,
    );
});

test('actor selection does not treat stale same-scene conversation as long-term pursuit', () => {
    const state =
        createCurrentPlayingState();
    state.scene.timelineEntries.push({
        clock: state.clock,
        label:
            'Tina spoke to the archivist once.',
    });
    const policy =
        buildActorSelectionPolicy(
            state,
            'Continue.',
        );
    assert.equal(
        policy.pursuedActorIds
            .includes(
                'old_archivist',
            ),
        false,
    );
});

test('localized Canon registry resolves aliases and duplicate identities deterministically', () => {
    assert.equal(
        getCanonicalCanonActorId(
            'canon_harry_james_potter',
        ),
        'canon_harry_james_potter',
    );
    assert.equal(
        getCanonNameAliases(
            findCanonCharacter(
                '西莫',
            ),
        ).includes(
            '谢莫斯·芬尼根',
        ),
        true,
    );
    assert.equal(
        reconcileCanonActorDisplayNames(
            createCurrentPlayingState(),
        ).changed,
        false,
    );
});

test('offline canon catalog and cast budgets permit bounded additions', () => {
    assert.equal(
        DEFAULT_CAST_POLICY
            .maxStoryActors,
        48,
    );
    assert.equal(
        CANON_CHARACTER_CATALOG
            .length,
        723,
    );
    const state =
        createCurrentPlayingState();
    state.castPolicy = {
        maxStoryActors: 4,
        maxGeneratedGuests: 1,
    };
    const policy =
        buildStoryCastPolicy(
            state,
        );
    assert.equal(
        policy.storyActorCount,
        3,
    );
    assert.equal(
        policy.remainingStorySlots,
        1,
    );
});

test('crowded scene transitions recommend named-cast turnover without deleting persistent actors', () => {
    const state =
        createCurrentPlayingState();
    for (const id of [
        'peer_alpha',
        'peer_beta',
        'peer_gamma',
    ]) {
        const proposal =
            createCurrentActorProposal(
                id,
                {
                    nameEn: id,
                },
            );
        state.actorLibrary.push(
            proposal,
        );
        state.actors.push({
            id,
            present: true,
            mapId:
                'zhang_home',
            roomId: 'kitchen',
            lifeStatus:
                'alive',
        });
    }
    normalizeCurrentActorFixtureInPlace(
        state,
    );
    state.map.customLocalMaps[0]
        .nodes.find(node =>
            node.id ===
                'back_garden')
        .access = 'public';
    const activeIds =
        state.actors.map(actor =>
            actor.id);
    state.sceneArchive = [
        {
            actorIds: activeIds,
        },
        {
            actorIds: activeIds,
        },
    ];
    const rotation =
        buildSceneCastRotationPolicy(
            state,
            {
                mapId:
                    'zhang_home',
                roomId:
                    'back_garden',
            },
        );
    assert.equal(
        rotation.crowdedPublicScene,
        true,
    );
    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.actorStates
        .push({
            id: 'peer_alpha',
            present: true,
            currentActivityEn:
                'Watching the garden gate.',
            currentIntentEn: '',
            firstImpressionOfPlayerEn:
                'A direct classmate with an impatient stare.',
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            mapId:
                'zhang_home',
            roomId:
                'back_garden',
        });
    const committed =
        applySceneTransition(
            state,
            normalizeSceneTransitionPackage(
                payload,
                state,
            ),
            {
                id: state.scene.id,
                status: 'closed',
            },
        );
    assert.equal(
        committed.actorLibrary
            .some(actor =>
                actor.id ===
                    'peer_beta'),
        true,
    );
});

test('canon recommendations use fixed temperament tags and player-relative age', () => {
    const hannah =
        getCanonSettingProfile(
            'Hannah Abbott',
            {
                worldYear: 1991,
                playerAge: 11,
            },
        );
    assert.equal(
        hannah.relativeAgeBand,
        'same_age',
    );
    assert.equal(
        recommendCanonCharacters({
            worldYear: 1991,
            playerAge: 11,
            locationText:
                'Hogwarts Express',
            limit: 30,
        }).some(actor =>
            actor.id ===
                'canon_harry_james_potter'),
        true,
    );
});

test('pacing can commit a mishap without introducing another actor', () => {
    const state =
        createCurrentPlayingState();
    const before =
        state.actors.length;
    assert.equal(
        validatePacingAssessment(
            {
                decision:
                    'intervene',
                diagnosisEn:
                    'A small accident would add pressure.',
                reassessAfterTurns: 3,
                intervention: {
                    kind:
                        'minor_mishap',
                },
            },
            state,
        ).valid,
        false,
    );
    assert.equal(
        state.actors.length,
        before,
    );
});
