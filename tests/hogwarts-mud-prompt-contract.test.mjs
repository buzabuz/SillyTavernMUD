/* eslint-disable playwright/expect-expect */
import {
    createContextBudgetPlan,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    buildStructuredPlayerTurnSequence,
    parseExplicitAddressBlocks,
    parseExplicitAddressDirective,
    removeExplicitAddressDirective,
    resolvePlayerAddressing,
    stripExplicitAddressTargets,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import {
    buildActorKnowledgeCapsules,
    filterKnowledgeForAudience,
    getActorVisibleSocialKnowledge,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    normalizeActorMemoryProfile,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory.js';
import {
    buildSystemPrompt,
    CANON_CAST_IDENTITY_CONTRACT,
    createDefaultCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    createDefaultCharacterDraft,
    getPlayerAgeAtClock,
    getRelativeAgeProfile,
    normalizeStoryPreferences,
    validateCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    buildMandatorySceneState,
    createInitialWorldState,
    validateOpeningWorldPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    createCurrentActorProposal,
    createCurrentOpeningPackage,
    createCurrentPlayingState,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('system prompt always adds the English-only output contract', () => {
    const prompt = buildSystemPrompt('Persistent wizarding world.');
    assert.match(prompt, /Persistent wizarding world/);
    assert.match(prompt, /English only/);
    assert.match(prompt, /Do not output Chinese/);
    assert.match(prompt, /authoritative source stored in context/);
    assert.match(prompt, /ORIGINAL, CANON-COMPATIBLE BRITISH WIT/);
    assert.match(prompt, /clear everyday British English/);
    assert.match(prompt, /Do not copy, quote, paraphrase, or imitate/);
    assert.match(prompt, /Every paragraph must earn its place/);
    assert.match(
        prompt,
        /RECENCY-AWARE VARIATION/,
    );
    assert.match(
        prompt,
        /Track and self-correct the prose choices made across recent responses/,
    );
    assert.match(
        prompt,
        /Re-express the beat through a genuinely different narrative route/,
    );
    assert.match(prompt, /The kettle, silent for several minutes/);
    assert.match(prompt, /She left it boiling, apparently on behalf of the whole family/);
    assert.match(prompt, /False ambiguity/);
    assert.match(prompt, /Purple prose/);
    assert.match(prompt, /not an ominous narrator flourish/);
});

test('shared cast identity contract separates named actors from crowd texture', () => {
    assert.match(
        CANON_CAST_IDENTITY_CONTRACT,
        /stable actor ID/u,
    );
    assert.match(
        CANON_CAST_IDENTITY_CONTRACT,
        /add that ID to actorEntrances/u,
    );
    assert.match(
        CANON_CAST_IDENTITY_CONTRACT,
        /not anonymous crowd texture/u,
    );
    assert.match(
        CANON_CAST_IDENTITY_CONTRACT,
        /use their supplied nameEn/u,
    );
});

test('direct-address focus and shared RAG preserve NPC knowledge boundaries', () => {
    const state = {
        actorLibrary: [
            {
                id:
                    'minerva_mcgonagall',
                nameEn:
                    'Minerva McGonagall',
                name:
                    '米勒娃·麦格',
                aliases: [
                    'McGonagall',
                    '麦格',
                ],
            },
            {
                id:
                    'canon_hermione_jean_granger',
                canonCatalogId:
                    'canon_hermione_jean_granger',
                nameEn:
                    'Hermione Jean Granger',
                name:
                    '赫敏·简·格兰杰',
                aliases: [
                    'Hermione',
                    '赫敏',
                ],
            },
        ],
        actors: [
            {
                id:
                    'minerva_mcgonagall',
                nameEn:
                    'Minerva McGonagall',
                name:
                    '米勒娃·麦格',
                present: true,
            },
            {
                id:
                    'canon_hermione_jean_granger',
                nameEn:
                    'Hermione Jean Granger',
                name:
                    '赫敏·简·格兰杰',
                present: true,
            },
        ],
    };
    assert.deepEqual(
        resolvePlayerAddressing(
            state,
            '*站在后面和赫敏叽叽喳喳*对，这是麦格奶奶。你想去哪里啊赫敏*手肘戳戳*',
        ),
        {
            mode: 'open',
            attempted: false,
            valid: true,
            actorIds: [],
            targetLabels: [],
            unresolvedLabels: [],
            speechText: '',
            blocks: [],
            error: '',
        },
    );
    const structuredAction =
        '*笑了笑*\n@赫敏：你真棒。\n*走过去对麦格说*\n@麦格：我觉得赫敏还行。\n*走回来*\n@赫敏：对不？';
    assert.deepEqual(
        parseExplicitAddressDirective(
            structuredAction,
        ),
        ['赫敏', '麦格', '赫敏'],
    );
    assert.deepEqual(
        parseExplicitAddressBlocks(
            structuredAction,
        ),
        [{
            lineIndex: 1,
            order: 0,
            targetLabel:
                '赫敏',
            speech:
                '你真棒。',
            raw:
                '@赫敏：你真棒。',
        }, {
            order: 1,
            lineIndex: 3,
            targetLabel:
                '麦格',
            speech:
                '我觉得赫敏还行。',
            raw:
                '@麦格：我觉得赫敏还行。',
        }, {
            order: 2,
            lineIndex: 5,
            targetLabel:
                '赫敏',
            speech: '对不？',
            raw: '@赫敏：对不？',
        }],
    );
    assert.equal(
        removeExplicitAddressDirective(
            structuredAction,
        ),
        '*笑了笑*\n“你真棒。”\n*走过去对麦格说*\n“我觉得赫敏还行。”\n*走回来*\n“对不？”',
    );
    assert.equal(
        stripExplicitAddressTargets(
            structuredAction,
        ),
        '*笑了笑*\n你真棒。\n*走过去对麦格说*\n我觉得赫敏还行。\n*走回来*\n对不？',
    );
    const structuredAddressing =
        resolvePlayerAddressing(
            state,
            structuredAction,
        );
    assert.deepEqual(
        structuredAddressing,
        {
            mode: 'sequence',
            attempted: true,
            valid: true,
            actorIds: [
                'canon_hermione_jean_granger',
                'minerva_mcgonagall',
            ],
            targetLabels: [
                '赫敏',
                '麦格',
                '赫敏',
            ],
            unresolvedLabels: [],
            speechText: '',
            blocks: [{
                order: 0,
                lineIndex: 1,
                mode: 'direct',
                targetLabel:
                    '赫敏',
                targetActorId:
                    'canon_hermione_jean_granger',
                speechText:
                    '你真棒。',
            }, {
                order: 1,
                lineIndex: 3,
                mode: 'direct',
                targetLabel:
                    '麦格',
                targetActorId:
                    'minerva_mcgonagall',
                speechText:
                    '我觉得赫敏还行。',
            }, {
                order: 2,
                lineIndex: 5,
                mode: 'direct',
                targetLabel:
                    '赫敏',
                targetActorId:
                    'canon_hermione_jean_granger',
                speechText:
                    '对不？',
            }],
            error: '',
        },
    );
    assert.deepEqual(
        buildStructuredPlayerTurnSequence(
            structuredAction,
            structuredAddressing,
        ),
        [{
            type: 'action',
            lineIndex: 0,
            text: '*笑了笑*',
        }, {
            type: 'direct_speech',
            lineIndex: 1,
            speechOrder: 0,
            targetLabel: '赫敏',
            targetActorId:
                'canon_hermione_jean_granger',
            speechText: '你真棒。',
        }, {
            type: 'action',
            lineIndex: 2,
            text: '*走过去对麦格说*',
        }, {
            type: 'direct_speech',
            lineIndex: 3,
            speechOrder: 1,
            targetLabel: '麦格',
            targetActorId:
                'minerva_mcgonagall',
            speechText:
                '我觉得赫敏还行。',
        }, {
            type: 'action',
            lineIndex: 4,
            text: '*走回来*',
        }, {
            type: 'direct_speech',
            lineIndex: 5,
            speechOrder: 2,
            targetLabel: '赫敏',
            targetActorId:
                'canon_hermione_jean_granger',
            speechText: '对不？',
        }],
    );
    assert.equal(
        resolvePlayerAddressing(
            state,
            '@赫敏 你想去哪里？',
        ).valid,
        false,
    );
    assert.equal(
        resolvePlayerAddressing(
            state,
            '@赫敏：你好。\n@麦格 这一行漏了冒号',
        ).valid,
        false,
    );
    assert.equal(
        resolvePlayerAddressing(
            state,
            '@全场：大家听我说。',
        ).mode,
        'broadcast',
    );

    const records = [
        {
            category: 'scenes',
            id: 'entrance_hall',
            entityIds: [
                'entrance_hall',
                'minerva_mcgonagall',
                'canon_hermione_jean_granger',
            ],
        },
        {
            category: 'actors',
            id: 'minerva_mcgonagall',
            entityIds: [
                'minerva_mcgonagall',
            ],
        },
        {
            category: 'events',
            id: 'private_wand_event',
            entityIds: [
                'minerva_mcgonagall',
                'alex_zhang',
            ],
        },
        {
            category: 'events',
            id: 'shared_train_event',
            entityIds: [
                'minerva_mcgonagall',
                'canon_hermione_jean_granger',
            ],
        },
        {
            category: 'clues',
            id: 'player_only_clue',
            entityIds: [
                'canon_hermione_jean_granger',
            ],
        },
    ];
    assert.deepEqual(
        filterKnowledgeForAudience(
            records,
            {
                actorIds: [
                    'minerva_mcgonagall',
                    'canon_hermione_jean_granger',
                ],
            },
        ).map(record =>
            record.id),
        [
            'shared_train_event',
        ],
    );

    const socialKnowledge =
        getActorVisibleSocialKnowledge(
            {
                socialGraph:
                    normalizeSocialGraph({
                        version: 3,
                        relationshipEvidence:
                            [],
                        relationships: [{
                            id: 'hermione_to_player',
                            sourceActorId:
                            'canon_hermione_jean_granger',
                            targetActorId:
                            'player',
                            familiarity: 30,
                            closeness: 35,
                            warmth: 8,
                            trust: 0,
                            respect: 0,
                            influence: 0,
                            tension: 80,
                            resentment: 0,
                            fear: 0,
                            protectiveness: 0,
                            structuralTags: [],
                            activeEmotions: [],
                            evidenceIds: [],
                            knownToPlayer: true,
                            relationshipClaimIds: [],
                            relationshipKinds: [],
                        }],
                    }),
            },
            'canon_hermione_jean_granger',
        );
    assert.deepEqual(
        socialKnowledge
            .relationshipEvidence
            .map(evidence =>
                evidence.id),
        [],
    );
    assert.deepEqual(
        socialKnowledge.relationships.map(
            relationship =>
                relationship.id),
        [
            'hermione_to_player',
        ],
    );
    assert.deepEqual(
        socialKnowledge
            .knownRelationshipActorIds,
        [],
    );

    const capsuleState =
        structuredClone(state);
    capsuleState.actorLibrary
        .find(actor =>
            actor.id ===
                'minerva_mcgonagall')
        .sharedMemories = {
            core: [],
            recent: [{
                id: 'private_crystal_event',
                summaryEn:
                    'McGonagall showed Tina a plain wand after Tina demanded crystal.',
            }],
            everyday: [],
        };
    capsuleState.actorLibrary
        .find(actor =>
            actor.id ===
                'canon_hermione_jean_granger')
        .knowledgeEn = [
            'Almost everything',
        ];
    normalizeCurrentActorFixtureInPlace(
        capsuleState,
    );
    const capsules =
        buildActorKnowledgeCapsules(
            capsuleState,
            [
                'canon_hermione_jean_granger',
            ],
            createContextBudgetPlan(
                120000,
                2000,
            ),
        );
    assert.deepEqual(
        capsules.map(capsule =>
            capsule.actorId),
        [
            'canon_hermione_jean_granger',
        ],
    );
    assert.equal(
        /crystal|水晶/iu.test(
            JSON.stringify(capsules),
        ),
        false,
    );
    assert.deepEqual(
        capsules[0]
            .privateFacts
            .knowledgeEn,
        [
            'Almost everything',
        ],
    );
});

test('character creation requires identity facts and an exact 63 point attribute budget', () => {
    const draft = createDefaultCharacterDraft();
    assert.match(validateCharacterDraft(draft).join(' '), /角色姓名/);

    draft.identity.name = 'Eleanor Hart';
    draft.background.guardian = 'Her grandmother, Miriam Hart';
    draft.background.desire = 'To belong somewhere without pretending';
    draft.background.fear = 'Losing control of her magic';
    assert.deepEqual(validateCharacterDraft(draft), []);

    draft.attributes.charisma = 11;
    assert.match(validateCharacterDraft(draft).join(' '), /总和必须为 63/);
});

test('fixed birth dates produce age bands relative to the player at the current world clock', () => {
    const character =
        createDefaultCharacterDraft();
    character.identity.name = 'Tina Zhang';
    character.identity.birthDate =
        '1980-07-01';
    const state = createInitialWorldState(
        character,
        {},
        createDefaultCampaign(),
    );
    state.clock =
        '1991-09-01 · 10:45';
    const olderStudent = {
        id: 'older_student',
        birthDate: '1978-04-01',
    };

    assert.equal(
        getPlayerAgeAtClock(state),
        11,
    );
    assert.deepEqual(
        getRelativeAgeProfile(
            state,
            olderStudent,
        ),
        {
            playerAge: 11,
            actorAge: 13,
            ageDelta: 2,
            relativeAgeBand:
                'older_peer',
        },
    );

    state.character.identity.birthDate =
        '1960-07-01';
    assert.equal(
        getRelativeAgeProfile(
            state,
            olderStudent,
        ).relativeAgeBand,
        'much_younger',
    );
    assert.equal(
        olderStudent.birthDate,
        '1978-04-01',
    );
    assert.deepEqual(
        normalizeStoryPreferences(),
        character.storyPreferences,
    );
});

test('relationship tags are not inferred before a character is introduced', () => {
    const futureFriend = {
        id: 'future_friend',
        relationshipToPlayerEn:
            'Future friend',
        settingTags: [
            'adventurous',
            'social',
        ],
    };

    assert.deepEqual(
        normalizeActorMemoryProfile(
            futureFriend,
            { present: false },
        ).relationshipTags,
        [],
    );
    assert.deepEqual(
        normalizeActorMemoryProfile(
            futureFriend,
            { present: true },
        ).relationshipTags,
        ['friend'],
    );
    assert.deepEqual(
        normalizeActorMemoryProfile(
            {
                id: 'introduced_stranger',
                settingTags: [
                    'steady',
                    'cautious',
                ],
            },
            { present: true },
        ).relationshipTags,
        ['acquaintance'],
    );
});

test('mandatory scene state stays compact and excludes detailed memories and hidden arcs', () => {
    const state = createCurrentPlayingState();
    state.actorLibrary[0].sharedMemories = {
        core: [],
        recent: [],
        everyday: Array.from(
            { length: 8 },
            (_, index) => ({
                id: `memory_${index}`,
                summaryEn:
                    `A deliberately verbose shared memory ${index} that belongs only in the authorized role request.`,
            }),
        ),
    };
    state.storyArcs = [{
        id: 'hidden_arc',
        hiddenTruthEn:
            'This private truth must not enter the mandatory prompt.',
    }];
    const compact = buildMandatorySceneState(state);
    const serialized = JSON.stringify(compact);
    assert.equal(
        serialized.includes('sharedMemories'),
        false,
    );
    assert.equal(
        serialized.includes('hiddenTruthEn'),
        false,
    );
    assert.equal(
        serialized.includes('secretEn'),
        false,
    );
    assert.equal(
        compact.actorCards.length,
        2,
    );
    assert.equal(
        compact.behavioralEnvironment.clock,
        state.clock,
    );
    assert.ok(
        compact.behavioralEnvironment.weather,
    );
    assert.ok(serialized.length < 8000);
});

test('opening world package rejects the hidden storage narrator as an NPC', () => {
    const character = createDefaultCharacterDraft();
    character.identity.name = 'Tina';
    const opening =
        createCurrentOpeningPackage();
    opening.actorProposals[0] =
        createCurrentActorProposal(
            'storage_narrator',
            {
                nameEn:
                    'Hogwarts World Director',
                roleEn: 'Narrator',
            },
        );
    const result = validateOpeningWorldPackage(opening, character, createDefaultCampaign());
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('后台存档叙事者')));
});
