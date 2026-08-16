/* eslint-disable playwright/expect-expect */
import {
    createDefaultCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    createDefaultCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    detectActionCheck,
    resolveActionCheck,
    validateCheckResolution,
} from '../public/scripts/extensions/hogwarts-mud/domain/checks.js';
import {
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    extractSpellCandidates,
    getAuthoritativeSceneSpells,
    queueSpellCandidates,
    reconcileAuthoritativeSpellNarrative,
    resolveSpellCandidate,
} from '../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import {
    migrateSpellbookState,
    resolveSpellObservation,
    settleSpellProgress,
} from '../public/scripts/extensions/hogwarts-mud/domain/spell-state.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    createTurnPerformanceBudget,
    resolveTurnElapsedMinutes,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import {
    createSpellDirective,
    getSpellDefinition,
    getSpellProficiency,
    parseSpellCastDirectives,
    removeSpellCastDirectives,
    SPELL_CATALOG,
} from '../public/scripts/extensions/hogwarts-mud/spell-catalog.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('long scene prose advances additional time instead of failing', () => {
    const budget = createTurnPerformanceBudget(
        '我回答麦格教授。',
        {
            defaultMinutes: 15,
        },
    );
    const performance = wordCount => ({
        segments: [{
            type: 'narration',
            textEn: Array.from(
                { length: wordCount },
                (_, index) => `word${index}`,
            ).join(' '),
        }],
    });

    assert.equal(
        resolveTurnElapsedMinutes(
            performance(728),
            budget,
        ),
        15,
    );
    assert.equal(
        resolveTurnElapsedMinutes(
            performance(729),
            budget,
        ),
        30,
    );
    assert.equal(
        resolveTurnElapsedMinutes(
            performance(1457),
            budget,
        ),
        45,
    );
    assert.equal(
        resolveTurnElapsedMinutes(
            performance(1200),
            createTurnPerformanceBudget(
                '我举起魔杖施法。',
                {
                    instantaneousMagicMinutes: 2,
                },
            ),
        ),
        2,
    );
});

test('local checks ignore deterministic conversation and detect a physical contest', () => {
    const state = createCurrentPlayingState();
    state.character.attributes.physique = 10;
    state.actorLibrary.push({
        id: 'eddie_cooper',
        nameEn: 'Eddie Cooper',
        roleEn: 'Hogwarts first-year student',
    });
    state.actors.push({
        id: 'eddie_cooper',
        nameEn: 'Eddie Cooper',
        roleEn: 'Hogwarts first-year student',
        present: true,
        mapId: 'zhang_home',
        roomId: 'kitchen',
    });

    assert.equal(
        detectActionCheck(state, '我向Eddie Cooper问好。'),
        null,
    );
    assert.equal(
        detectActionCheck(state, '我推开普通的店门。'),
        null,
    );
    assert.equal(
        detectActionCheck(
            state,
            '我把那个男孩推到一边。',
        ).target.actorId,
        'eddie_cooper',
    );
    const values = [14, 9];
    const check = resolveActionCheck(
        state,
        '我把Eddie Cooper推到一边。',
        { randomInt: () => values.shift() },
    );

    assert.equal(check.kind, 'physical_force');
    assert.equal(check.attribute, 'physique');
    assert.equal(check.target.actorId, 'eddie_cooper');
    assert.equal(check.target.mode, 'opposed');
    assert.deepEqual(check.rolls, [14]);
    assert.equal(check.total, 14);
    assert.equal(check.hidden.opponentRoll, 9);
    assert.equal(check.outcome, 'success');
    assert.deepEqual(
        validateCheckResolution(check, state),
        { valid: true, errors: [] },
    );
});

test('spell catalog uses curriculum year only as guidance and structured markers survive dialogue or action', () => {
    assert.ok(
        SPELL_CATALOG.length >= 45,
    );
    assert.equal(
        new Set(
            SPELL_CATALOG.map(
                spell =>
                    spell.id,
            ),
        ).size,
        SPELL_CATALOG.length,
    );
    assert.ok(
        SPELL_CATALOG.every(spell =>
            Number.isInteger(
                spell.curriculumYear,
            ) &&
            Boolean(
                spell.incantation,
            ) &&
            !Object.hasOwn(
                spell,
                'minimumYear',
            )),
    );
    assert.equal(
        getSpellDefinition(
            'accio',
        ).curriculumYear,
        4,
    );
    const marker =
        createSpellDirective(
            'accio',
        );
    const action =
        `${marker} *我举起魔杖，对准书架念出：“Accio！”*`;
    const dialogue =
        `@全场：“看好了。” ${marker}`;
    assert.deepEqual(
        parseSpellCastDirectives(
            action,
        ).map(cast =>
            cast.spellId),
        ['accio'],
    );
    assert.deepEqual(
        parseSpellCastDirectives(
            dialogue,
        ).map(cast =>
            cast.spellId),
        ['accio'],
    );
    assert.doesNotMatch(
        removeSpellCastDirectives(
            action,
        ),
        /咒语:accio/u,
    );
});

test('a structured spell always rolls even when semantic adjudication says no check', () => {
    const state =
        createCurrentPlayingState();
    const marker =
        createSpellDirective(
            'accio',
        );
    const check =
        resolveActionCheck(
            state,
            `${marker} 我念出“Accio”，召唤远处的书。`,
            {
                semanticCheck: {
                    required: false,
                    ruleId: 'none',
                    targetActorId: '',
                },
                randomInt:
                    () => 15,
            },
        );
    assert.equal(
        check.kind,
        'magic',
    );
    assert.equal(
        check.forced,
        true,
    );
    assert.equal(
        check.spell.spellId,
        'accio',
    );
    assert.equal(
        check.spell.known,
        false,
    );
    assert.equal(
        check.modifiers
            .proficiency,
        -2,
    );
    assert.deepEqual(
        check.rolls,
        [15],
    );
    assert.equal(
        validateCheckResolution(
            check,
            state,
        ).valid,
        true,
    );
});

test('active scene-spell observation rolls once and learns only on a successful result', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Transfiguration Classroom';
    state.scene.nextSceneIntent = {
        titleEn:
            'The Match-to-Needle Exercise',
        summaryEn:
            'Professor McGonagall asks the class to transform a match into a needle.',
    };
    const action =
        '*眯着眼睛想要看清黑板上的咒语，但麦格教授的草书太模糊了。*';
    const observation =
        resolveSpellObservation(
            state,
            action,
        );
    assert.equal(
        observation.spellId,
        'match_to_needle_transfiguration',
    );
    assert.equal(
        observation.incantationKnown,
        true,
    );
    assert.equal(
        observation.incantation,
        'Acufors',
    );
    const check =
        resolveActionCheck(
            state,
            action,
            {
                semanticCheck: {
                    required: false,
                    ruleId: 'none',
                    targetActorId: '',
                },
                randomInt:
                    () => 3,
            },
        );
    assert.equal(
        check.kind,
        'perception',
    );
    assert.deepEqual(
        check.rolls,
        [3],
    );
    assert.equal(
        check.spellObservation
            .spellId,
        observation.spellId,
    );
    assert.equal(
        validateCheckResolution(
            check,
            state,
        ).valid,
        true,
    );
    const next =
        settleSpellProgress(
            state,
            action,
            {
                checkResolution:
                    check,
                publicEventEn:
                    'Tina cannot make out every detail on the blackboard.',
                segments: [],
            },
        );
    const failedLearning =
        next.spellbook
            .known
            .find(entry =>
                entry.spellId ===
                observation.spellId);
    assert.equal(
        failedLearning,
        undefined,
    );
    const successfulCheck =
        resolveActionCheck(
            state,
            action,
            {
                semanticCheck: {
                    required: false,
                    ruleId: 'none',
                    targetActorId: '',
                },
                randomInt:
                    () => 15,
            },
        );
    const successfulState =
        settleSpellProgress(
            state,
            action,
            {
                checkResolution:
                    successfulCheck,
                publicEventEn:
                    'Tina identifies Acufors on the blackboard.',
                segments: [],
            },
        );
    const learned =
        successfulState
            .spellbook
            .known
            .find(entry =>
                entry.spellId ===
                observation.spellId);
    assert.ok(learned);
    assert.equal(
        learned.learnedSource,
        'class',
    );
    assert.equal(
        learned.attempts,
        0,
    );
    assert.match(
        learned.learnedSourceDetail,
        /Acufors/u,
    );
});

test('explicit NPC explanation teaches a spell after failed player observation', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Transfiguration Classroom';
    state.scene.nextSceneIntent = {
        titleEn:
            'The Match-to-Needle Exercise',
    };
    const action =
        '*眯着眼睛辨认黑板上模糊的咒语。*';
    const failedCheck =
        resolveActionCheck(
            state,
            action,
            {
                semanticCheck: {
                    required: false,
                    ruleId: 'none',
                    targetActorId: '',
                },
                randomInt:
                    () => 3,
            },
        );
    const next =
        settleSpellProgress(
            state,
            action,
            {
                checkResolution:
                    failedCheck,
                publicEventEn:
                    'Professor McGonagall explains Acufors to the class.',
                segments: [{
                    type:
                        'dialogue',
                    actorId:
                        'minerva_mcgonagall',
                    textEn:
                        'The incantation is Acufors. Repeat it precisely.',
                }],
            },
        );
    assert.ok(
        next.spellbook
            .known
            .some(entry =>
                entry.spellId ===
                'match_to_needle_transfiguration'),
    );
});

test('scene authority reconciles a conflicting taught incantation and blocks a custom candidate', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Transfiguration Classroom';
    state.scene.nextSceneIntent = {
        titleEn:
            'The Match-to-Needle Exercise',
        summaryEn:
            'Professor McGonagall asks the class to transform a match into a needle.',
    };
    const authority =
        getAuthoritativeSceneSpells(
            state,
        );
    assert.deepEqual(
        authority.map(spell => ({
            spellId:
                spell.spellId,
            incantation:
                spell.incantation,
        })),
        [{
            spellId:
                'match_to_needle_transfiguration',
            incantation:
                'Acufors',
        }],
    );
    const result =
        reconcileAuthoritativeSpellNarrative(
            {
                publicEventEn:
                    'Hermione teaches Acus.',
                segments: [
                    {
                        type:
                            'dialogue',
                        actorId:
                            'canon_hermione_jean_granger',
                        textEn:
                            'The incantation is Acus. Repeat it precisely.',
                    },
                    {
                        type:
                            'dialogue',
                        actorId:
                            'canon_hermione_jean_granger',
                        textEn:
                            'Acus!',
                    },
                ],
            },
            state,
        );
    assert.deepEqual(
        result.corrections,
        [{
            from: 'Acus',
            to: 'Acufors',
            spellId:
                'match_to_needle_transfiguration',
        }],
    );
    assert.equal(
        result.transaction
            .segments[0]
            .textEn,
        'The incantation is Acufors. Repeat it precisely.',
    );
    assert.equal(
        result.transaction
            .segments[1]
            .textEn,
        'Acufors!',
    );
    assert.deepEqual(
        extractSpellCandidates(
            result.transaction,
            state,
        ),
        [],
    );
});

test('scene authority corrects a replacement while preserving a distinct custom spell', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Transfiguration Classroom';
    state.scene.nextSceneIntent = {
        titleEn:
            'The Match-to-Needle Exercise',
        summaryEn:
            'Professor McGonagall asks the class to transform a match into a needle.',
    };
    const result =
        reconcileAuthoritativeSpellNarrative(
            {
                publicEventEn:
                    'Hermione teaches the assigned technique and then demonstrates a separate original charm.',
                segments: [
                    {
                        type:
                            'dialogue',
                        actorId:
                            'canon_hermione_jean_granger',
                        textEn:
                            'I devised a new incantation for the match-to-needle technique. The incantation is Acus.',
                    },
                    {
                        type:
                            'dialogue',
                        actorId:
                            'canon_hermione_jean_granger',
                        textEn:
                            'I devised a different original spell. The incantation is Nebula Verto. It makes writing glow.',
                    },
                    {
                        type:
                            'dialogue',
                        actorId:
                            'canon_hermione_jean_granger',
                        textEn:
                            'The incantation is Mutare. It transforms a match.',
                    },
                ],
            },
            state,
        );

    assert.deepEqual(
        result.corrections,
        [
            {
                from: 'Acus',
                to: 'Acufors',
                spellId:
                    'match_to_needle_transfiguration',
            },
            {
                from: 'Mutare',
                to: 'Acufors',
                spellId:
                    'match_to_needle_transfiguration',
            },
        ],
    );
    assert.match(
        result.transaction
            .segments[0]
            .textEn,
        /The incantation is Acufors\./u,
    );
    assert.match(
        result.transaction
            .segments[1]
            .textEn,
        /The incantation is Nebula Verto\./u,
    );
    assert.match(
        result.transaction
            .segments[2]
            .textEn,
        /The incantation is Acufors\./u,
    );
    const candidates =
        extractSpellCandidates(
            result.transaction,
            state,
            {
                sourceEventId:
                    'mixed_authority_custom',
                sourceMessageIds:
                    [205],
                clock:
                    '1991-09-02 · 12:45',
            },
        );
    assert.equal(
        candidates.length,
        1,
    );
    assert.equal(
        candidates[0].id,
        'custom_nebula_verto',
    );
    assert.deepEqual(
        candidates[0]
            .authorityConflicts,
        [],
    );
});

test('a player-declared freeform spell becomes a review candidate under scene authority', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Transfiguration Classroom';
    state.scene.nextSceneIntent = {
        titleEn:
            'The Match-to-Needle Exercise',
        summaryEn:
            'Professor McGonagall asks the class to transform a match into a needle.',
    };
    const candidates =
        extractSpellCandidates(
            {
                publicEventEn:
                    'Tina tested an undocumented incantation and caused a magical backfire.',
                segments: [{
                    type:
                        'narration',
                    textEn:
                        'The undocumented incantation struck the brass quill and produced a cloud of metallic smoke.',
                }],
            },
            state,
            {
                sourceEventId:
                    'player_custom_spell',
                sourceMessageIds:
                    [201, 202],
                clock:
                    '1991-09-02 · 12:30',
                playerAction:
                    '✦【咒语:match_to_needle_transfiguration】 I cast Acufors, then test ✦【咒语:Nebula Verto】 on the quill.',
            },
        );

    assert.equal(
        candidates.length,
        1,
    );
    assert.equal(
        candidates[0].id,
        'custom_nebula_verto',
    );
    assert.equal(
        candidates[0]
            .evidenceText,
        '✦【咒语:Nebula Verto】',
    );
    assert.match(
        candidates[0]
            .definition
            .effectEn,
        /^Observed narrative evidence:/u,
    );
    assert.equal(
        candidates[0]
            .definition
            .risk,
        'unknown',
    );
    const queued =
        queueSpellCandidates(
            state,
            candidates,
        );
    assert.equal(
        queued
            .pendingSpellProposals
            .length,
        1,
    );
    assert.equal(
        queued.spellbook
            .known
            .some(entry =>
                entry.spellId ===
                'custom_nebula_verto'),
        false,
    );
});

test('explicit non-catalog teaching becomes a player-reviewed custom spell', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Unused Classroom';
    state.scene.nextSceneIntent = {
        titleEn:
            'Independent Experiment',
        summaryEn:
            'A student tests an original magical technique.',
    };
    const transaction = {
        publicEventEn:
            'A student teaches Tina a new spell that makes paper glow.',
        segments: [{
            type: 'dialogue',
            actorId:
                'canon_hermione_jean_granger',
            textEn:
                'The incantation is Nebula Verto. It makes the writing glow.',
        }],
    };
    const candidates =
        extractSpellCandidates(
            transaction,
            state,
            {
                sourceEventId:
                    'custom_spell_event',
                sourceMessageIds:
                    [201],
                clock:
                    '1991-09-02 · 12:30',
            },
        );
    assert.equal(
        candidates.length,
        1,
    );
    assert.equal(
        candidates[0].id,
        'custom_nebula_verto',
    );
    assert.equal(
        candidates[0]
            .incantation,
        'Nebula Verto',
    );
    const queued =
        queueSpellCandidates(
            state,
            candidates,
        );
    assert.equal(
        queued
            .pendingSpellProposals
            .length,
        1,
    );
    assert.equal(
        queued.spellbook
            .known
            .some(entry =>
                entry.spellId ===
                'custom_nebula_verto'),
        false,
    );
    const ignored =
        resolveSpellCandidate(
            queued,
            candidates[0].key,
            'ignored',
        ).state;
    assert.equal(
        ignored
            .pendingSpellProposals
            .length,
        0,
    );
    assert.equal(
        ignored
            .spellProposalDecisions[0]
            .decision,
        'ignored',
    );
    assert.equal(
        queueSpellCandidates(
            ignored,
            candidates,
        )
            .pendingSpellProposals
            .length,
        0,
    );
    assert.equal(
        ignored.spellbook
            .known
            .some(entry =>
                entry.spellId ===
                'custom_nebula_verto'),
        false,
    );
    const accepted =
        resolveSpellCandidate(
            queued,
            candidates[0].key,
            'accepted',
        );
    assert.equal(
        accepted.changed,
        true,
    );
    const learned =
        accepted.state
            .spellbook
            .known
            .find(entry =>
                entry.spellId ===
                'custom_nebula_verto');
    assert.ok(learned);
    assert.equal(
        learned.definition
            .incantation,
        'Nebula Verto',
    );
    assert.equal(
        accepted.state
            .pendingSpellProposals
            .length,
        0,
    );
    const marker =
        createSpellDirective(
            learned.spellId,
            accepted.state,
        );
    assert.equal(
        marker,
        '✦【咒语:custom_nebula_verto】',
    );
    assert.deepEqual(
        parseSpellCastDirectives(
            marker,
            accepted.state,
        ).map(cast =>
            cast.spellId),
        ['custom_nebula_verto'],
    );
    const check =
        resolveActionCheck(
            accepted.state,
            `${marker} *我念出：“Nebula Verto！”*`,
            {
                randomInt:
                    () => 15,
            },
        );
    assert.equal(
        check.spell.spellId,
        'custom_nebula_verto',
    );
    assert.equal(
        check.spell.known,
        true,
    );
});

test('an AI-visible spell marker records the referenced spell without counting a cast', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'Transfiguration Classroom';
    const marker =
        createSpellDirective(
            'match_to_needle_transfiguration',
        );
    const next =
        settleSpellProgress(
            state,
            '',
            {
                publicEventEn:
                    `Professor McGonagall demonstrates ${marker}.`,
                segments: [],
            },
        );
    const learned =
        next.spellbook
            .known
            .find(entry =>
                entry.spellId ===
                'match_to_needle_transfiguration');
    assert.ok(learned);
    assert.equal(
        learned.attempts,
        0,
    );
});

test('first-year players may self-study or experiment with later curriculum spells', () => {
    const state =
        createCurrentPlayingState();
    assert.equal(
        state.campaign.grade,
        1,
    );
    assert.equal(
        state.spellbook.known
            .some(entry =>
                entry.spellId ===
                'accio'),
        false,
    );
    const marker =
        createSpellDirective(
            'accio',
        );
    const check =
        resolveActionCheck(
            state,
            `${marker} 我在图书馆照着书自学 Accio。`,
            {
                randomInt:
                    () => 16,
            },
        );
    const next =
        settleSpellProgress(
            state,
            `${marker} 我在图书馆照着书自学 Accio。`,
            {
                spellCasts:
                    parseSpellCastDirectives(
                        marker,
                    ),
                checkResolution:
                    check,
                publicEventEn:
                    'Tina experiments with Accio in the library.',
                segments: [],
            },
        );
    const learned =
        next.spellbook
            .known
            .find(entry =>
                entry.spellId ===
                'accio');
    assert.ok(learned);
    assert.equal(
        learned.learnedSource,
        'self_study',
    );
    assert.equal(
        learned.attempts,
        1,
    );
    assert.ok(
        learned.proficiencyXp >
        5,
    );
    assert.equal(
        getSpellProficiency(
            learned.proficiencyXp,
        ).id,
        learned.proficiencyRank,
    );
});

test('an unknown spell cast in class remains an experiment unless it was actually taught', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'First Charms Lesson';
    const marker =
        createSpellDirective(
            'accio',
        );
    const next =
        settleSpellProgress(
            state,
            `${marker} 我忽然对书架念出“Accio”。`,
            {
                spellCasts:
                    parseSpellCastDirectives(
                        marker,
                    ),
                publicEventEn:
                    'Tina unexpectedly casts Accio at the bookshelf.',
                segments: [{
                    type:
                        'narration',
                    textEn:
                        'Professor Flitwick looks surprised by the experiment.',
                }],
            },
        );
    assert.equal(
        next.spellbook
            .known
            .find(entry =>
                entry.spellId ===
                'accio')
            .learnedSource,
        'experiment',
    );
});

test('spellbook migration learns classroom spells from existing narrative', () => {
    const state =
        createCurrentPlayingState();
    state.scene.nameEn =
        'First Charms Lesson';
    state.scene.summaryEn =
        'Professor Flitwick teaches the first Charms lesson.';
    const migration =
        migrateSpellbookState(
            state,
            [{
                is_user: false,
                mes:
                    'Professor Flitwick writes WINGARDIUM LEVIOSA on the board and tells the class to practise it.',
                extra: {
                    hogwartsMud: {
                        role:
                            'scene_opening',
                    },
                },
            }],
        );
    assert.equal(
        migration.changed,
        true,
    );
    const learned =
        migration.state
            .spellbook
            .known
            .find(entry =>
                entry.spellId ===
                'wingardium_leviosa');
    assert.ok(learned);
    assert.equal(
        learned.learnedSource,
        'class',
    );
});

test('later-year starts seed prior curriculum but never gate other spells', () => {
    const campaign =
        createDefaultCampaign();
    campaign.presetId =
        'hogwarts_student';
    campaign.grade = 5;
    const state =
        createInitialWorldState(
            createDefaultCharacterDraft(),
            {},
            campaign,
        );
    const known =
        new Set(
            state.spellbook
                .known
                .map(entry =>
                    entry.spellId),
        );
    assert.equal(
        known.has('accio'),
        true,
    );
    assert.equal(
        known.has('crucio'),
        false,
    );
    assert.ok(
        getSpellDefinition(
            'crucio',
        ),
    );
});

test('semantic check authority overrides keyword detection', () => {
    const state =
        createCurrentPlayingState();
    assert.equal(
        resolveActionCheck(
            state,
            '我问他等下要不要一起上课。',
            {
                semanticCheck: {
                    required: false,
                    ruleId: 'none',
                    targetActorId: '',
                },
            },
        ),
        null,
    );
    const checked =
        resolveActionCheck(
            state,
            '我用力推开男孩。',
            {
                semanticCheck: {
                    required: true,
                    ruleId:
                        'physical_force',
                    targetActorId: '',
                },
                randomInt:
                    () => 10,
            },
        );
    assert.equal(
        checked.kind,
        'physical_force',
    );
    assert.deepEqual(
        checked.rolls,
        [10],
    );
});

test('local checks handle advantage, disadvantage, natural rolls and forced checks', () => {
    const state = createCurrentPlayingState();
    state.character.attributes.agility = 10;
    state.character.attributes.perception = 11;

    let values = [4, 17];
    const advantage = resolveActionCheck(
        state,
        '我借助一根工具绳翻越柜台。',
        { randomInt: () => values.shift() },
    );
    assert.equal(advantage.rollMode, 'advantage');
    assert.deepEqual(advantage.rolls, [4, 17]);
    assert.equal(advantage.keptRoll, 17);

    state.status = [
        { label: '压力', detail: '惊慌' },
    ];
    values = [18, 5];
    const disadvantage = resolveActionCheck(
        state,
        '我闪避飞来的箱子。',
        { randomInt: () => values.shift() },
    );
    assert.equal(disadvantage.rollMode, 'disadvantage');
    assert.equal(disadvantage.keptRoll, 5);

    state.status = [];
    const naturalOne = resolveActionCheck(
        state,
        '我攀爬湿滑的高墙。',
        { randomInt: () => 1 },
    );
    assert.equal(naturalOne.outcome, 'catastrophic_failure');

    const naturalTwenty = resolveActionCheck(
        state,
        '我仔细检查隐藏的刻痕。',
        { randomInt: () => 20 },
    );
    assert.equal(naturalTwenty.outcome, 'critical_success');

    const forced = resolveActionCheck(
        state,
        '我端详面前的普通椅子。',
        { forced: true, randomInt: () => 10 },
    );
    assert.equal(forced.kind, 'forced_general');
    assert.equal(forced.attribute, 'perception');
});

test('check resolution is validated and persisted with the turn transaction', () => {
    const state = createCurrentPlayingState();
    const check = resolveActionCheck(
        state,
        '我仔细检查桌下。',
        {
            randomInt:
                () => 12,
            sourceMessageId:
                44,
        },
    );
    assert.equal(
        check.reasonCode,
        'perception',
    );
    assert.equal(
        check.sourceMessageId,
        44,
    );
    assert.equal(
        Object.hasOwn(
            check,
            'reasonEn',
        ),
        false,
    );
    const transaction = {
        elapsedMinutes: 15,
        publicEventEn: 'Tina checks beneath the table.',
        checkResolution: check,
        segments: [{
            type: 'narration',
            textEn: 'Tina kneels and checks beneath the table.',
        }],
        actorUpdates: [],
        revealedClues: [],
    };
    const next = applyTurnTransaction(
        state,
        transaction,
        '我仔细检查桌下。',
    );
    assert.equal(next.checks.length, 1);
    assert.equal(next.checks[0].id, check.id);
    assert.equal(
        next.checks[0].committedClock,
        '1991-07-24 · 11:30',
    );

    const tampered = structuredClone(check);
    tampered.total += 1;
    assert.equal(
        validateCheckResolution(tampered, state).valid,
        false,
    );
});
