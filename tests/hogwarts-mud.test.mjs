/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import cytoscape from 'cytoscape';

import {
    admitCurrentLocationResidents,
    admitMentionedKnownActors,
    advanceWorldClock,
    analyzeMemoryConsolidation,
    analyzePacingSignals,
    applyDirectorFoundation,
    applyEventBoundaryNextSceneIntent,
    applyGeneratedInteriorMap,
    applyTranslationGlossaryTargets,
    applyMemoryConsolidation,
    applyMaterialEvents,
    applyOpeningWorldPackage,
    applyMapProposal,
    applyLocalMapMutation,
    applyPacingAssessment,
    applyPlayerMovement,
    applySceneTransition,
    applySocialDirectorResult,
    applyTransitionWorldChanges,
    applyTurnTransaction,
    assertImportSize,
    buildCampaignContext,
    buildActorNameAliases,
    buildActorAppearanceView,
    buildActorContinuityCapsules,
    buildActorKnowledgeCapsules,
    buildActorSelectionPolicy,
    buildActorTranslationTerms,
    buildBehavioralEnvironment,
    buildCurrentMaterialState,
    buildLocalMapModel,
    buildMapAuthorityContext,
    buildMapModel,
    buildMandatorySceneState,
    buildSceneCastRotationPolicy,
    buildSocialAudienceProjection,
    buildSpatialContext,
    buildStoryCastPolicy,
    buildStructuredPlayerTurnSequence,
    buildSystemPrompt,
    buildTemporaryActorPromotionPolicy,
    CANON_CAST_IDENTITY_CONTRACT,
    CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE,
    CAUSAL_COLLAPSE_MIN_CHECK_TURNS,
    createDefaultCampaign,
    createDefaultCharacterDraft,
    createFallbackNextSceneIntent,
    createInitialWorldState,
    createSpellDirective,
    createContextBudgetPlan,
    createLegacyTurnRollbackCheckpoint,
    createTranslationBatches,
    createTurnRetryCheckpoint,
    createTurnPerformanceBudget,
    consumePacingBeat,
    ACTOR_KNOWLEDGE_BOUNDARY_EN,
    DEFAULT_CAST_POLICY,
    DEFAULT_RESPONSE_HEADROOM,
    detectPresetApi,
    detectActionCheck,
    detectCausalCollapseOpportunity,
    deriveRelationshipLabels,
    estimateTurnMinutes,
    ensureMentionedKnownActorMemories,
    extractStreamingSceneSegments,
    filterKnowledgeForAudience,
    findSceneDestination,
    findLocalRoomPath,
    findUnsettledTurn,
    getActorKnownRumors,
    getActorVisibleSocialKnowledge,
    getAvailableTurnRollbackCheckpoint,
    getFailedPlayerTurn,
    getInteriorMapRequest,
    getPlayerAgeAtClock,
    getRelativeAgeProfile,
    getSceneDestinationAuthority,
    getSpellDefinition,
    getSpellProficiency,
    getWorldDate,
    inferActorRoomId,
    inspectPlayerMovementIntent,
    isDailyDirectorPlanCurrent,
    isGuidedMovementAction,
    limitMessagesToContext,
    migrateActorKnowledgeBoundaries,
    migrateActorMovementHistory,
    migrateActorPresentationState,
    migrateEntityState,
    migrateLoadedSocialGraph,
    migrateObservedInventoryState,
    migrateRelationshipMemoryState,
    migrateSpellbookState,
    normalizeActorMemoryProfile,
    normalizeCausalCollapseState,
    NARRATIVE_TURN_PROTOCOL_VERSION,
    normalizeModelSlots,
    normalizeMemoryConsolidationPayload,
    normalizeMaterialEvents,
    normalizeRegexScripts,
    normalizeCampaign,
    normalizeLocalTranslationText,
    normalizeStoryPreferences,
    normalizePacingAssessmentPayload,
    normalizeScenePerformanceActorLocations,
    normalizeSocialGraph,
    normalizeSceneTransitionPackage,
    normalizeTranslationProvider,
    protectTranslationTerms,
    parseCompleteJsonObject,
    parseExplicitAddressBlocks,
    parseExplicitAddressDirective,
    parseExplicitMovementDirective,
    parseSpellCastDirectives,
    projectObservedInventoryUpdates,
    reconcileCanonActorDisplayNames,
    reconcileSpatialState,
    reconcileTurnActorPresenceWithSpatialState,
    reconcileVisibleActorPresenceState,
    reconcileTemporalState,
    reconcileTemporaryActorDisplayNames,
    recoverImplicitTemporaryActorEntrances,
    recoverScenePerformancePayload,
    recoverSceneTransitionPayload,
    resolveActionCheck,
    resolvePlayerAddressing,
    resolvePlayerMovement,
    resolveSceneTransitionDestination,
    resolveTurnElapsedMinutes,
    removeExplicitMovementDirective,
    removeExplicitAddressDirective,
    removeSpellCastDirectives,
    restoreTurnRetryCheckpoint,
    restoreTranslationTerms,
    resolveTemporaryActorRevealedName,
    RESPONSE_HEADROOM_VERSION,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
    SOCIAL_RELATIONSHIP_DIMENSIONS,
    SOCIAL_RELATIONSHIP_EMOTIONS,
    SOCIAL_RELATIONSHIP_STRUCTURAL_TAGS,
    enterBoundInteriorMap,
    sanitizePresetData,
    sanitizeActorKnowledgeEn,
    selectSharedMemoriesForContext,
    settleNarrativeTurnPerformance,
    settleSpellProgress,
    shouldTranslateToChinese,
    splitTranslationChunks,
    SPELL_CATALOG,
    splitActorVisualDescription,
    stripExplicitAddressTargets,
    stripSyntheticSceneOpeningActorSegments,
    validateCharacterDraft,
    validateCheckResolution,
    validateDirectorFoundation,
    validateEventBoundaryNextSceneIntent,
    validateGeneratedInteriorMap,
    validateLocalMapMutation,
    validateLocalMapPack,
    validateMapProposal,
    validateMemoryConsolidation,
    validateNextSceneIntent,
    validateOpeningWorldPackage,
    validatePacingAssessment,
    validateScenePerformance,
    validateSceneTemporalConsistency,
    validateSocialDirectorResult,
    validateSceneDestinationGrounding,
    validateSceneTransitionPackage,
    validateTransitionWorldChanges,
    validateTurnTransaction,
    WORLD_CHANGE_MIN_DAYS,
} from '../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    findPresetLocalMapInText,
    LOCAL_MAP_CATALOG,
    PRESET_LOCATION_ACTORS,
    PRESET_LOCAL_MAPS,
} from '../public/scripts/extensions/hogwarts-mud/map-pack.js';
import {
    CANON_CHARACTER_CATALOG,
    CANON_PLAYABLE_CHARACTER_CATALOG,
    findCanonCharacter,
    findMentionedCanonCharacters,
    getCanonNameAliases,
    getCanonSettingProfile,
    recommendCanonCharacters,
} from '../public/scripts/extensions/hogwarts-mud/canon-characters.js';
import {
    CANON_IDENTITY_REDIRECTS,
    CANON_LOCALIZATION_ZH_CN,
    getCanonicalCanonActorId,
} from '../public/scripts/extensions/hogwarts-mud/canon-localization.zh-cn.js';
import { PRESET_WORLD_MAP } from '../public/scripts/extensions/hogwarts-mud/world-data.js';
import {
    buildPlayerKnownRelationshipProjection,
    filterRelationshipGraphProjection,
    getRelationshipGraphStyles,
} from '../public/scripts/extensions/hogwarts-mud/relationship-graph.js';
import {
    MATERIAL_EVENT_DEFINITIONS,
    MATERIAL_EXTRACTION_SCHEMA,
    MATERIAL_STATE_SCHEMA_VERSION,
} from '../public/scripts/extensions/hogwarts-mud/material-schema.js';
import { runSocialDirectorGraph } from '../src/hogwarts-mud/social-director-graph.js';
import { runTurnSettlementGraph } from '../src/hogwarts-mud/turn-settlement-graph.js';
import { TRANSFORMERS_EMBEDDING_MAX_TOKENS } from '../src/vectors/embedding.js';

function createDirectorFoundation(primaryActorId = 'tina_mother', primaryActorName = 'Mei Zhang') {
    const actor = (id, name, role) => ({
        id,
        nameEn: name,
        roleEn: role,
        relationshipToPlayerEn: id === primaryActorId ? 'Known adult' : 'Future contact',
        firstImpressionOfPlayerEn:
            'A small, sharply dressed child watching every adult before speaking.',
        impressionOfPlayerEn: id === primaryActorId
            ? 'Sees Tina as curious, guarded, and likely to test an adult before trusting them.'
            : 'Has not met Tina and has no personal impression yet.',
        publicDescriptionEn: `${name} has a composed public manner.`,
        publicBackgroundEn: `${name} has a documented place in the magical world.`,
        personalityEn: 'Observant, deliberate, and capable of withholding judgment.',
        speechStyleEn: 'Precise sentences with restrained emotion.',
        birthDate: id === 'minerva_mcgonagall'
            ? '1935-10-04'
            : id === 'old_archivist'
                ? '1930-03-12'
                : '1955-05-18',
        settingTags: id === 'minerva_mcgonagall'
            ? ['steady', 'intellectual', 'cautious']
            : ['steady', 'compassionate'],
        privateGoalEn: 'Protect their interests while learning what Tina knows.',
        fearEn: 'Losing control of a dangerous secret.',
        secretEn: 'Knows one part of the hidden lineage.',
        knowledgeEn: ['A bounded fragment of the hidden lineage mystery.'],
    });
    return {
        actorLibrary: [
            actor(primaryActorId, primaryActorName, 'Opening witness'),
            actor('minerva_mcgonagall', 'Minerva McGonagall', 'Deputy Headmistress'),
            actor('old_archivist', 'Miriam Strout', 'Retired magical archivist'),
        ],
        storyArc: {
            id: 'serpent_lineage',
            titleEn: 'The Serpent Lineage',
            hookEn: 'Tina can speak to snakes without knowing why.',
            hiddenTruthEn: 'A concealed branch of the Riddle bloodline reaches Tina through her mother.',
            stakesEn: 'Several factions would exploit or erase the proof.',
            involvedActorIds: [primaryActorId, 'minerva_mcgonagall', 'old_archivist'],
            cluePlan: [
                {
                    id: 'mother_portrait',
                    labelEn: 'The altered portrait',
                    hiddenFactEn: 'The portrait was magically edited.',
                    playerFacingDiscoveryEn: 'A moving edge remains around the mother figure.',
                    unlockConditionEn: 'Closely inspect the photograph.',
                    sourceActorIds: [primaryActorId],
                    sourceLocationIds: [],
                },
                {
                    id: 'school_registry',
                    labelEn: 'The sealed registry',
                    hiddenFactEn: 'A false surname was entered in the registry.',
                    playerFacingDiscoveryEn: 'One line uses different ink and handwriting.',
                    unlockConditionEn: 'Gain access to the sealed registry.',
                    sourceActorIds: ['minerva_mcgonagall'],
                    sourceLocationIds: [],
                },
                {
                    id: 'archivist_testimony',
                    labelEn: 'The archivist testimony',
                    hiddenFactEn: 'The archivist witnessed the concealment.',
                    playerFacingDiscoveryEn: 'The archivist recognizes Tina by her eyes.',
                    unlockConditionEn: 'Earn the archivist trust.',
                    sourceActorIds: ['old_archivist'],
                    sourceLocationIds: [],
                },
            ],
        },
    };
}

function createSceneTransitionState() {
    const character = createDefaultCharacterDraft();
    character.identity.name = 'Tina Zhang';
    const state = createInitialWorldState(character, {}, createDefaultCampaign());
    const foundation = createDirectorFoundation();
    state.phase = 'playing';
    state.clock = '1991-07-24 · 11:15';
    state.chapter = 'The Letter at Breakfast';
    state.location = 'Zhang Home';
    state.actorLibrary = foundation.actorLibrary;
    state.actors = foundation.actorLibrary.slice(0, 2).map(actor => ({
        ...actor,
        present: true,
        currentActivityEn: 'Standing in the kitchen.',
        mapId: 'zhang_home',
        roomId: 'kitchen',
    }));
    state.scene = {
        id: 'zhang_home_kitchen',
        name: '张家厨房',
        nameEn: 'Zhang Home Kitchen',
        summary: '录取手续接近尾声。',
        summaryEn: 'The enrollment discussion is nearly complete.',
        startedClock: '1991-07-24 · 09:15',
        startedMessageId: 1,
        timelineEntries: [{
            clock: '1991-07-24 · 09:15',
            label: 'The enrollment discussion begins.',
        }],
        mapId: 'zhang_home',
        roomId: 'kitchen',
    };
    state.timeline = structuredClone(state.scene.timelineEntries);
    state.map.activeMapId = 'zhang_home';
    state.map.currentLocalNodeId = 'kitchen';
    state.map.currentLevelId = 'ground_floor';
    state.map.customLocalMaps = [{
        id: 'zhang_home',
        name: '张家',
        nameEn: 'Zhang Home',
        defaultLevelId: 'ground_floor',
        levels: [{ id: 'ground_floor', name: '一楼', nameEn: 'Ground Floor', z: 0 }],
        nodes: [
            { id: 'kitchen', name: '厨房', nameEn: 'Kitchen', levelId: 'ground_floor', descriptionEn: 'A kitchen window overlooks the back garden.' },
            { id: 'back_garden', name: '后花园', nameEn: 'Back Garden', levelId: 'ground_floor' },
        ],
        exits: [
            { from: 'kitchen', to: 'back_garden', direction: 'east', kind: 'door', minutes: 1 },
        ],
    }];
    return state;
}

function createKingsCrossState(
    roomId = 'platform_barrier',
) {
    const state = createSceneTransitionState();
    const mcgonagall = state.actorLibrary
        .find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    const alex = {
        id: 'alex_zhang',
        nameEn: 'Alex Zhang',
        name: '张先生',
        relationshipToPlayerEn: 'Father',
        relationshipToPlayer: '父亲',
        impressionOfPlayerEn:
            'My loud, fearless daughter needs watching.',
    };
    state.actorLibrary = [
        alex,
        mcgonagall,
    ];
    state.actors = state.actorLibrary.map(actor => ({
        ...actor,
        present: true,
        currentActivityEn:
            'Waiting with Tina near the station barrier.',
        mapId: 'kings_cross',
        roomId,
    }));
    state.map.activeMapId = 'kings_cross';
    state.map.currentLocalNodeId = roomId;
    state.map.currentLevelId = 'station';
    state.scene.mapId = 'kings_cross';
    state.scene.roomId = roomId;
    state.scene.nameEn =
        'The Barrier Between Platforms Nine and Ten';
    state.location =
        roomId === 'hogwarts_express'
            ? '霍格沃茨特快'
            : '九号与十号站台隔墙';
    state.spatial = {
        version: 3,
        player: {
            mapId: 'kings_cross',
            roomId,
        },
        lastMovement: null,
    };
    state.items = [{
        id: 'acceptance_letter',
        labelEn:
            'Hogwarts acceptance letter',
        label: '霍格沃茨录取通知书',
        importance: 'key',
        custody: 'carried',
        ownerId: 'player',
        mapId: 'kings_cross',
        roomId,
        status: 'available',
    }];
    return state;
}

function createSceneTransitionPackage(roomId = 'back_garden') {
    return {
        transitionMinutes: 0,
        nextClock:
            '1991-07-24 · 11:15',
        closureSummaryEn: 'The enrollment form is signed and Tina runs into the garden.',
        authorQuillEn: 'The editorial desk awards Tina this chapter\'s Golden Door Handle for attempting to solve every magical problem by rattling the nearest piece of architecture until an adult appeared. It was a bold strategy, especially because the adults were already present and had, in fact, been speaking. Her negotiation technique also deserves notice: hug father, scatter sweets, sprint into the garden, then treat footwear as an optional clause in the Hogwarts admissions process. McGonagall maintained the expression of a woman mentally drafting three new school rules and one strongly worded letter to the inventor of sugar. Alex, meanwhile, completed enough paperwork to qualify for an honorary NEWT in Parental Endurance. The owl waited with professional dignity, which placed it comfortably first in the chapter\'s self-control rankings. Special commendation goes to Tina for converting a bursary form into a contact sport without technically damaging the form. The chapter closes with the paperwork signed, the garden occupied, and several sweets distributed according to a system known only to gravity. Overall performance: academically premature, tactically loud, and extremely effective at ensuring no quiet domestic morning survives first contact with the protagonist.',
        unresolvedThreadsEn: ['The owl still carries an unfamiliar leather tag.'],
        worldChanges: {
            prophetBriefs: [],
            gossipUpdates: [],
        },
        relationshipUpdates: [{
            id: 'minerva_mcgonagall',
            impressionOfPlayerEn:
                'Wilful and exhausting, but capable of focused courage.',
            sceneMemoryEn:
                'McGonagall guided Tina through enrollment while Tina tested every boundary and still completed the required paperwork.',
        }],
        nextScene: {
            id: 'zhang_home_garden_owl',
            nameEn: 'The Owl in the Back Garden',
            name: '后花园里的猫头鹰',
            summaryEn: 'Tina reaches the owl while the adults finish the paperwork inside.',
            summary: '蒂娜抵达围墙边，猫头鹰仍在等候。',
            explorationHookEn:
                'In the Back Garden, one patch of dew remains perfectly dry beneath the fence and can be examined or ignored.',
            explorationHook:
                '后花园围栏下有一小片草叶完全没有露水，可以检查，也可以忽略。',
            crowdDirectionEn: '',
            temporalFactsEn: [],
            chapterEn: 'The Letter at Breakfast',
            chapter: '早餐时的信',
            mapId: 'zhang_home',
            roomId,
            actorStates: [{
                id: 'minerva_mcgonagall',
                present: true,
                currentActivityEn: 'Standing at the garden door with the reply slip.',
                currentActivity: '拿着回条站在花园门边。',
                lifeStatus: 'alive',
                lifeStatusPermanent: false,
                lifeStatusDetailEn: 'Alive and unharmed.',
                mapId: 'zhang_home',
                roomId: 'kitchen',
            }],
            openingSegments: [
                {
                    type: 'narration',
                    textEn: 'The garden wall cuts off the kitchen voices as Tina reaches the Back Garden fence, where one patch of grass remains perfectly dry beneath the owl.',
                },
                {
                    type: 'dialogue',
                    actorId: 'minerva_mcgonagall',
                    textEn: 'The owl will wait, Miss Zhang, but not indefinitely.',
                },
            ],
            followingSceneIntent: {
                titleEn: 'The Signed Reply',
                title: '签好的回信',
                summaryEn: 'Return the signed reply to the waiting owl.',
                summary: '把签好的回信交给等待的猫头鹰。',
                triggerEn: 'After Tina decides whether to inspect the owl.',
                trigger: '蒂娜决定是否检查猫头鹰之后。',
                mapId: 'zhang_home',
                roomId: 'back_garden',
                tier: 'medium',
            },
        },
    };
}

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

test('streaming scene parser reveals complete and partial JSON segments', () => {
    const partial = [
        '```json',
        '{"publicEventEn":"A door opens.","segments":[',
        '{"type":"narration","textEn":"The brass handle turns."},',
        '{"type":"dialogue","actorId":"minerva_mcgonagall",',
        '"textEn":"\\"This way, Miss Zhang.\\""},',
        '{"type":"narration","textEn":"The brick wall fol',
    ].join('');
    assert.deepEqual(
        extractStreamingSceneSegments(partial),
        [
            {
                type: 'narration',
                textEn: 'The brass handle turns.',
                partial: false,
            },
            {
                type: 'dialogue',
                actorId: 'minerva_mcgonagall',
                textEn: '"This way, Miss Zhang."',
                partial: false,
            },
            {
                type: 'narration',
                textEn: 'The brick wall fol',
                partial: true,
            },
        ],
    );

    const finished = `${partial}ds open."}],` +
        '"actorUpdates":[{"id":"minerva_mcgonagall",' +
        '"currentActivityEn":"Waiting"}]}';
    const segments =
        extractStreamingSceneSegments(finished);
    assert.equal(segments.length, 3);
    assert.equal(
        segments.at(-1).textEn,
        'The brick wall folds open.',
    );
    assert.equal(segments.at(-1).partial, false);
});

test('truncated scene recovery keeps root fields instead of an inner segment', () => {
    const raw = `\`\`\`json
{
  "publicEventEn": "Tina appeals to her father while Eddie protests.",
  "pacingBeatRealized": false,
  "checkApplied": false,
  "sceneProgression": {
    "type": "social_shift",
    "summaryEn": "Alex hears both children and takes charge.",
    "completedRequestedStep": false
  },
  "segments": [
    {"type":"narration","textEn":"Tina points toward Eddie."},
    {"type":"dialogue","actorId":"alex_zhang","textEn":"What happened?"},
    {"type":"narration","textEn":"Eddie raises both hands."},
    {"type":"dialogue","actorId":"eddie_cooper","textEn":"That is not what happened."}
  ],
  "actorUpdates": [
    {"id":"alex_zhang","currentActivityEn":"Listening to both children`;
    const recovered =
        recoverScenePerformancePayload(raw);

    assert.equal(
        recovered.publicEventEn,
        'Tina appeals to her father while Eddie protests.',
    );
    assert.equal(
        recovered.sceneProgression.type,
        'social_shift',
    );
    assert.equal(recovered.segments.length, 4);
    assert.deepEqual(recovered.actorUpdates, [{
        id: 'alex_zhang',
        currentActivityEn:
            'Listening to both children',
    }]);
    assert.deepEqual(
        Object.keys(recovered.segments[0]),
        ['type', 'textEn'],
    );
});

test('structured JSON parsing rejects a truncated root instead of accepting an inner object', () => {
    const truncated = `\`\`\`json
{
  "transitionMinutes": 165,
  "worldChanges": {
    "prophetBriefs": [],
    "gossipUpdates": []
  },
  "socialRelationshipEvidence": [
    {
      "sourceActorId": "canon_ronald_bilius_weasley",
      "targetActorId": "canon_seamus_finnigan"`;

    assert.throws(
        () => parseCompleteJsonObject(
            truncated,
        ),
        /root object closed/,
    );
    assert.deepEqual(
        parseCompleteJsonObject(
            'Result:\n{"outer":{"inner":true}}\nDone',
        ),
        {
            outer: {
                inner: true,
            },
        },
    );
    assert.deepEqual(
        parseCompleteJsonObject(
            `<think>
Let me analyze the relationship evidence first.
An invalid draft like {"scanComplete":false} must be ignored.
</think>
\`\`\`json
{"scanComplete":true,"reviews":[],"statements":[],"relationshipEvidence":[]}
\`\`\``,
        ),
        {
            scanComplete: true,
            reviews: [],
            statements: [],
            relationshipEvidence: [],
        },
    );
});

test('scene transition recovery keeps a complete core and drops only a truncated social tail', () => {
    const payload =
        createSceneTransitionPackage();
    const ordered = {
        ...payload,
        socialStatements: [{
            subjectId:
                'minerva_mcgonagall',
            speakerId:
                'minerva_mcgonagall',
            category: 'education',
            textEn:
                'The reply form must be signed.',
            witnessedBy: ['player'],
            sourceMessageIds: [12],
        }],
        socialRelationshipEvidence: [{
            sourceActorId:
                'minerva_mcgonagall',
            targetActorId: 'tina_mother',
            type: 'trust',
            weightDelta: 1,
            summaryEn:
                'McGonagall trusted Tina\'s family to complete the reply.',
            witnessedBy: ['player'],
            sourceMessageIds: [12],
        }],
    };
    const serialized =
        JSON.stringify(ordered);
    const evidenceStart =
        serialized.indexOf(
            '"socialRelationshipEvidence"',
        );
    const truncated = serialized.slice(
        0,
        serialized.indexOf(
            '"summaryEn"',
            evidenceStart,
        ) + 18,
    );

    const recovered =
        recoverSceneTransitionPayload(
            truncated,
        );
    assert.equal(
        recovered.nextScene.id,
        payload.nextScene.id,
    );
    assert.equal(
        recovered.socialStatements.length,
        1,
    );
    assert.deepEqual(
        recovered
            .socialRelationshipEvidence,
        [],
    );
    const normalized =
        normalizeSceneTransitionPackage(
            recovered,
            createSceneTransitionState(),
            { tier: 'medium' },
        );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            createSceneTransitionState(),
            { tier: 'medium' },
        ).valid,
        true,
    );
});

test('scene recovery accepts an unquoted event and a partial final actor update', () => {
    const raw = `\`\`\`json
{
  "publicEventEn":Tina questions Eddie while Gran Cooper enters the lobby.",
  "pacingBeatRealized":true,
  "checkApplied":false,
  "sceneProgression":{
    "type":"npc_initiative",
    "summaryEn":"Gran Cooper finds Eddie in Gringotts.",
    "completedRequestedStep":false
  },
  "segments":[
    {"type":"narration","textEn":"Tina folds her arms."},
    {"type":"dialogue","actorId":"eddie_cooper","textEn":"One question at a time."},
    {"type":"narration","textEn":"The bronze doors open."},
    {"type":"dialogue","actorId":"eddie_grandmother_cooper","textEn":"Edward Cooper."}
  ],
  "actorUpdates":[
    {"id":"eddie_cooper","present":true,"currentActivityEn":"Answering Tina by the column."},
    {"id":"eddie_grandmother_cooper","present":true,"currentActivityEn":"Confronting Eddie in the lobby.","mapId":"diagon_alley","roomId":"gringotts_lobby","memoryUpdate":{"summaryEn":"Gran found Eddie`;
    const recovered =
        recoverScenePerformancePayload(raw);

    assert.equal(
        recovered.publicEventEn,
        'Tina questions Eddie while Gran Cooper enters the lobby.',
    );
    assert.equal(
        recovered.sceneProgression.type,
        'npc_initiative',
    );
    assert.equal(recovered.segments.length, 4);
    assert.deepEqual(
        recovered.actorUpdates.at(-1),
        {
            id: 'eddie_grandmother_cooper',
            present: true,
            currentActivityEn:
                'Confronting Eddie in the lobby.',
            mapId: 'diagon_alley',
            roomId: 'gringotts_lobby',
        },
    );
});

test('translation chunks preserve paragraph boundaries when possible', () => {
    const chunks = splitTranslationChunks('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.', 35);
    assert.deepEqual(chunks, ['First paragraph.\n\nSecond paragraph.', 'Third paragraph.']);
    assert.equal(chunks.join('\n\n'), 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
});

test('translation chunks split oversized prose without breaking words', () => {
    const source = 'one two three four five six seven eight nine ten eleven twelve';
    const chunks = splitTranslationChunks(source, 32);
    assert.ok(chunks.length > 1);
    assert.deepEqual(
        chunks.join(' ').split(/\s+/),
        source.split(/\s+/),
    );
    assert.ok(chunks.every(chunk => chunk.length <= 32));
});

test('translation batches keep complete structured fields together', () => {
    const values = [
        'First complete field stays together beside the kitchen table.',
        'Second complete field stays together beside the cooling kettle.',
        'Third complete field stays together beside the patient owl.',
    ];
    const batches = createTranslationBatches(values, 128);
    assert.ok(batches.length > 1);
    assert.ok(batches.every(batch => batch.length <= 128));
    values.forEach((value, index) => {
        assert.ok(batches.some(batch =>
            batch.includes(`[[HPMUD_${index}_0]] ${value}`),
        ));
    });
});

test('translation batches preserve a full long scene within the Google text limit', () => {
    const value = `${'Long scene context remains together. '.repeat(110)}`;
    assert.ok(value.length > 3500);
    assert.ok(value.length < 4600);
    const batches =
        createTranslationBatches([value]);
    assert.equal(batches.length, 1);
    assert.match(
        batches[0],
        /^\[\[HPMUD_0_0]] Long scene context/,
    );
});

test('actor translation terms preserve full and short authoritative names', () => {
    const terms = buildActorTranslationTerms([{
        nameEn: 'Seamus Finnigan',
        name: '谢莫斯·芬尼根',
        aliases: [
            'Seamus Finnigan',
            'Seamus',
            'Finnigan',
            '谢莫斯·芬尼根',
            '谢莫斯',
            '芬尼根',
        ],
    }]);
    assert.deepEqual(
        terms,
        [
            {
                source: 'Seamus Finnigan',
                target: '谢莫斯·芬尼根',
            },
            {
                source: 'Seamus',
                target: '谢莫斯',
            },
            {
                source: 'Finnigan',
                target: '芬尼根',
            },
        ],
    );
});

test('local translation inputs receive authoritative glossary targets without placeholders', () => {
    const localized =
        applyTranslationGlossaryTargets(
            'Dean found Lavender\'s Sorting parchment in the Charms classroom.',
        );
    assert.equal(
        localized,
        '迪安 found 拉文德\'s 分院羊皮纸 in the 魔咒课教室.',
    );
    assert.doesNotMatch(
        localized,
        /\[\[HPMUD_TERM_/,
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'The first Charms lesson begins for the first-year Gryffindors.',
        ),
        'The 第一节魔咒课 begins for the 格兰芬多一年级新生.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'Tina joined Lavender.',
        ),
        '蒂娜 joined 拉文德.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'She tucked them under one arm and dragged Lavender to Charms class so fast the ink was still wet.',
        ),
        'She 把三本书夹在一只胳膊下 and 以飞快的速度拽着拉文德赶去魔咒课，墨水甚至还没干.',
    );
});

test('local short-label translations drop an unsolicited parenthetical alternative', () => {
    assert.equal(
        normalizeLocalTranslationText(
            'First Charms Lesson',
            '第一节魔咒课\n\n（第一堂魔咒课）',
        ),
        '第一节魔咒课',
    );
    assert.equal(
        normalizeLocalTranslationText(
            'First Charms Lesson (Year One)',
            '第一节魔咒课（一年级）',
        ),
        '第一节魔咒课（一年级）',
    );
    assert.equal(
        normalizeLocalTranslationText(
            'Lavender still wants details.',
            '拉文德 仍想了解细节。',
        ),
        '拉文德仍想了解细节。',
    );
});

test('translation term placeholders restore canonical Chinese terms', () => {
    const source = 'Professor McGonagall welcomed Hermione Jean Granger, a Muggle-born student, to Hogwarts.';
    const protectedText = protectTranslationTerms(source);
    assert.doesNotMatch(protectedText, /McGonagall|Muggle-born|Hogwarts/);
    assert.match(protectedText, /\[\[HPMUD_TERM_\d+]]/);

    const restored = restoreTranslationTerms(protectedText);
    assert.match(restored, /麦格教授/);
    assert.match(
        restored,
        /赫敏·格兰杰/,
    );
    assert.match(restored, /麻瓜出身/);
    assert.match(restored, /霍格沃茨/);

    const spaced = protectTranslationTerms('要求 McGonagall 安排');
    assert.equal(restoreTranslationTerms(spaced), '要求麦格安排');

    const lavender =
        protectTranslationTerms(
            'Lavender Brown joined the first-years.',
        );
    assert.doesNotMatch(
        lavender,
        /Lavender Brown/,
    );
    assert.match(
        restoreTranslationTerms(lavender),
        /拉文德·布朗/,
    );

    const schoolTerms = protectTranslationTerms(
        'A third-year prefect watched the Sorting Hat during the Sorting in the Great Hall.',
    );
    assert.equal(
        restoreTranslationTerms(schoolTerms),
        'A 三年级学生级长 watched the 分院帽 during 分院仪式 in the 礼堂.',
    );

    assert.equal(
        restoreTranslationTerms(
            '你好。 世界 ！ “ 测试 ”',
            [],
        ),
        '你好。世界！“测试”',
    );
});

test('actor aliases retain full and short English and Chinese names', () => {
    assert.deepEqual(
        buildActorNameAliases(
            'Hermione Jean Granger',
            '赫敏·简·格兰杰',
        ),
        [
            'Hermione Jean Granger',
            'Hermione',
            'Jean',
            'Granger',
            '赫敏·简·格兰杰',
            '赫敏',
            '格兰杰',
        ],
    );
    const profile =
        normalizeActorMemoryProfile({
            id:
                'canon_hermione_jean_granger',
            nameEn:
                'Hermione Jean Granger',
            name: '赫敏·简·格兰杰',
        });
    assert.ok(
        profile.aliases.includes(
            '赫敏',
        ),
    );
    assert.ok(
        profile.aliases.includes(
            'Hermione',
        ),
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
                socialGraph: {
                    statements: [{
                        id: 'hermione_own_claim',
                        subjectId:
                            'canon_hermione_jean_granger',
                        speakerId:
                            'canon_hermione_jean_granger',
                        textEn:
                            'My parents are dentists.',
                        witnessedBy: [],
                    }, {
                        id: 'private_claim_about_hermione',
                        subjectId:
                            'canon_hermione_jean_granger',
                        speakerId:
                            'minerva_mcgonagall',
                        textEn:
                            'Hermione was discussed elsewhere.',
                        witnessedBy: [
                            'player',
                        ],
                    }, {
                        id: 'claim_witnessed_by_hermione',
                        subjectId:
                            'canon_ronald_bilius_weasley',
                        speakerId:
                            'canon_ronald_bilius_weasley',
                        textEn:
                            'I have five brothers.',
                        witnessedBy: [
                            'canon_hermione_jean_granger',
                        ],
                    }],
                    relationshipEvidence: [{
                        id: 'hermione_player_evidence',
                        sourceActorId:
                            'canon_hermione_jean_granger',
                        targetActorId:
                            'player',
                        type: 'tension',
                    }, {
                        id: 'private_mcgonagall_evidence',
                        sourceActorId:
                            'minerva_mcgonagall',
                        targetActorId:
                            'player',
                        type: 'trust',
                        witnessedBy: [
                            'canon_ronald_bilius_weasley',
                        ],
                    }, {
                        id: 'unseen_evidence_about_hermione',
                        sourceActorId:
                            'minerva_mcgonagall',
                        targetActorId:
                            'canon_hermione_jean_granger',
                        type: 'tension',
                        witnessedBy: [
                            'player',
                        ],
                    }, {
                        id: 'evidence_witnessed_by_hermione',
                        sourceActorId:
                            'canon_ronald_bilius_weasley',
                        targetActorId:
                            'player',
                        type: 'affinity',
                        witnessedBy: [
                            'canon_hermione_jean_granger',
                        ],
                    }],
                    relationships: [{
                        id: 'hermione_to_player',
                        sourceActorId:
                            'canon_hermione_jean_granger',
                        targetActorId:
                            'player',
                    }, {
                        id: 'mcgonagall_to_hermione',
                        sourceActorId:
                            'minerva_mcgonagall',
                        targetActorId:
                            'canon_hermione_jean_granger',
                    }],
                },
            },
            'canon_hermione_jean_granger',
        );
    assert.deepEqual(
        socialKnowledge.statements.map(
            statement => statement.id,
        ),
        [
            'hermione_own_claim',
            'claim_witnessed_by_hermione',
        ],
    );
    assert.deepEqual(
        socialKnowledge
            .relationshipEvidence
            .map(evidence =>
                evidence.id),
        [
            'hermione_player_evidence',
            'evidence_witnessed_by_hermione',
        ],
    );
    assert.deepEqual(
        socialKnowledge.relationships.map(
            relationship =>
                relationship.id),
        [
            'hermione_to_player',
        ],
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
        capsules[0].knowledgeEn,
        [
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        ],
    );
});

test('translation only runs for predominantly English content', () => {
    assert.equal(shouldTranslateToChinese('Rodolphus lowered his voice and accepted the oath.'), true);
    assert.equal(shouldTranslateToChinese('他压低声音，接受了誓言。'), false);
    assert.equal(shouldTranslateToChinese(''), false);
});

test('translation provider settings accept local, Google, Bing and off with a stable fallback', () => {
    assert.equal(
        normalizeTranslationProvider('LOCAL'),
        'local',
    );
    assert.equal(
        normalizeTranslationProvider('google'),
        'google',
    );
    assert.equal(
        normalizeTranslationProvider('BING'),
        'bing',
    );
    assert.equal(
        normalizeTranslationProvider('off'),
        'off',
    );
    assert.equal(
        normalizeTranslationProvider(
            'unknown',
            'bing',
        ),
        'bing',
    );
});

test('imports reject files above the configured size limit', () => {
    assert.doesNotThrow(() => assertImportSize(1024));
    assert.throws(() => assertImportSize(6 * 1024 * 1024), /5 MB/);
});

test('preset type detection recognizes standard SillyTavern shapes', () => {
    assert.equal(detectPresetApi({ prompts: [] }), 'openai');
    assert.equal(detectPresetApi({ instruct_sequence: '### Instruction' }), 'instruct');
    assert.equal(detectPresetApi({ story_string: '{{description}}' }), 'context');
    assert.equal(detectPresetApi({ temperature: 0.8 }, 'textgenerationwebui'), 'textgenerationwebui');
});

test('preset sanitization removes connection and secret-bearing fields', () => {
    const source = {
        name: 'Imported',
        temperature: 0.8,
        reverse_proxy: 'https://example.invalid',
        proxy_password: 'secret',
        custom_include_headers: 'x-test: value',
        nested: {
            api_key: 'nested-secret',
            safe: true,
        },
    };
    const { clean, removed } = sanitizePresetData(source);
    assert.equal(clean.temperature, 0.8);
    assert.equal(clean.reverse_proxy, undefined);
    assert.equal(clean.proxy_password, undefined);
    assert.equal(clean.nested.api_key, undefined);
    assert.equal(clean.nested.safe, true);
    assert.deepEqual(removed.sort(), ['custom_include_headers', 'nested.api_key', 'proxy_password', 'reverse_proxy']);
    assert.equal(source.reverse_proxy, 'https://example.invalid');
});

test('preset sanitization removes prototype-pollution keys', () => {
    const source = JSON.parse('{"name":"Safe","__proto__":{"polluted":true},"nested":{"constructor":{"prototype":{"polluted":true}}}}');
    const { clean, removed } = sanitizePresetData(source);
    assert.equal(Object.hasOwn(clean, '__proto__'), false);
    assert.equal(Object.hasOwn(clean.nested, 'constructor'), false);
    assert.deepEqual(removed.sort(), ['__proto__', 'nested.constructor']);
});

test('regex normalization accepts standard single and array formats', () => {
    let id = 0;
    const uuid = () => `id-${++id}`;
    const scripts = normalizeRegexScripts([
        { scriptName: 'Quotes', findRegex: '/foo/g', replaceString: 'bar' },
        { scriptName: 'Spacing', findRegex: '/ +/g' },
    ], uuid);

    assert.equal(scripts.length, 2);
    assert.equal(scripts[0].id, 'id-1');
    assert.equal(scripts[1].replaceString, '');
    assert.equal(scripts[1].disabled, false);
});

test('regex normalization rejects malformed files', () => {
    assert.throws(() => normalizeRegexScripts({ findRegex: '/foo/' }), /scriptName/);
    assert.throws(() => normalizeRegexScripts({ scriptName: 'Missing expression' }), /findRegex/);
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

test('campaign presets normalize locked and open school starts', () => {
    assert.deepEqual(normalizeCampaign({
        presetId: 'canon_1991',
        startYear: 2005,
        grade: 7,
        difficulty: 'harsh',
    }), {
        presetId: 'canon_1991',
        presetName: '与哈利同届',
        startYear: 1991,
        grade: 1,
        difficulty: 'harsh',
        difficultyName: '严酷',
    });

    const open = normalizeCampaign({
        presetId: 'hogwarts_student',
        startYear: 1986,
        grade: 5,
        difficulty: 'narrative',
    });
    assert.equal(open.startYear, 1986);
    assert.equal(open.grade, 5);
});

test('campaign configuration becomes authoritative world and prompt state', () => {
    const campaign = {
        presetId: 'hogwarts_student',
        startYear: 1986,
        grade: 5,
        difficulty: 'harsh',
    };
    const character = createDefaultCharacterDraft();
    const state = createInitialWorldState(character, {}, campaign);
    const prompt = buildCampaignContext(campaign);

    assert.equal(state.campaign.grade, 5);
    assert.equal(state.phase, 'initializing');
    assert.equal(state.chapter, '正在编排首幕');
    assert.match(state.clock, /^1986/);
    assert.match(prompt, /Starting school year: 1986/);
    assert.match(prompt, /Difficulty: 严酷/);
    assert.deepEqual(createDefaultCampaign(), {
        presetId: 'canon_1991',
        startYear: 1991,
        grade: 1,
        difficulty: 'standard',
    });
});

test('opening world package commits a home map, present NPCs, and dramatic conflict', () => {
    const character = createDefaultCharacterDraft();
    character.identity.name = 'Tina Zhang';
    character.background.guardian = 'Her mother';
    character.background.home = 'London';
    character.confirmed = true;
    const campaign = createDefaultCampaign();
    const foundation = createDirectorFoundation();
    const opening = {
        version: 1,
        chapterEn: 'The Letter at Breakfast',
        clock: '1991-07-24 · 09:10',
        scene: {
            id: 'zhang_home_breakfast',
            nameEn: 'Zhang Family Kitchen',
            summaryEn: 'Breakfast is interrupted by a Hogwarts letter.',
            explorationHookEn:
                'A teaspoon keeps sliding toward the unopened Hogwarts envelope whenever the breakfast table is nudged.',
            worldAnchorId: '',
            map: {
                id: 'zhang_family_home',
                nameEn: 'Zhang Family Home',
                currentLevelId: 'ground_floor',
                levels: [{ id: 'ground_floor', nameEn: 'Ground Floor', z: 0 }],
                rooms: [
                    { id: 'kitchen', nameEn: 'Kitchen', levelId: 'ground_floor', kind: 'room', descriptionEn: 'A narrow kitchen.', x: 30, y: 50, access: 'private' },
                    { id: 'hallway', nameEn: 'Hallway', levelId: 'ground_floor', kind: 'corridor', descriptionEn: 'The front hall.', x: 70, y: 50, access: 'private' },
                ],
                exits: [{ from: 'kitchen', to: 'hallway', direction: 'east', kind: 'door', minutes: 1 }],
                currentRoomId: 'kitchen',
            },
        },
        actors: [{
            id: 'tina_mother',
            nameEn: 'Mei Zhang',
            roleEn: 'Mother',
            relationshipToPlayerEn: 'Protective parent',
            firstImpressionOfPlayerEn:
                'Her neatly tied hair cannot disguise how closely she watches every reaction.',
            impressionOfPlayerEn:
                'Knows Tina as curious, stubborn, and inclined to test a boundary before accepting it.',
            publicDescriptionEn: 'Still in her work clothes.',
            currentActivityEn: 'Holding the letter over the breakfast table.',
            currentIntentEn: 'Decide whether to trust the invitation.',
            present: true,
        }],
        ...foundation,
        conflict: {
            titleEn: 'A Door Neither Parent Expected',
            premiseEn: 'The letter reveals a world the family did not know existed.',
            immediatePressureEn: 'An owl waits for an answer.',
            stakesEn: 'Tina may lose the chance to attend Hogwarts.',
            incitingEventEn: 'Her mother opens the Hogwarts letter.',
        },
        agenda: [{ timeLabelEn: 'Now', labelEn: 'Answer the family question.' }],
        clues: [{ id: 'wax_seal', labelEn: 'Wax seal', detailEn: 'A lion, eagle, badger, and snake surround an H.' }],
        items: [{ id: 'admission_letter', labelEn: 'Hogwarts letter', detailEn: 'Addressed precisely to Tina.' }],
        openingBriefEn: 'Begin at breakfast as the mother reads the letter aloud, then stop for Tina.',
    };
    const validation = validateOpeningWorldPackage(opening, character, campaign);
    assert.deepEqual(validation, { valid: true, errors: [] });

    const state = applyOpeningWorldPackage(createInitialWorldState(character, {}, campaign), opening);
    assert.equal(state.phase, 'opening_narration');
    assert.equal(state.location, 'Zhang Family Kitchen');
    assert.equal(state.actors[0].name, 'Mei Zhang');
    assert.equal(state.actorLibrary.length, 3);
    assert.deepEqual(
        state.actorLibrary[0]
            .relationshipTags,
        ['family'],
    );
    assert.deepEqual(
        state.actorLibrary.find(actor =>
            actor.id ===
                'old_archivist')
            .relationshipTags,
        [],
    );
    assert.equal(state.storyArcs[0].hiddenTruthEn.includes('Riddle'), true);
    assert.deepEqual(state.clues, []);
    assert.equal(state.conflict.title, 'A Door Neither Parent Expected');
    assert.equal(state.map.activeMapId, 'zhang_family_home');
    assert.equal(state.scene.nextSceneIntent.roomId, 'kitchen');
    assert.equal(state.scene.nextSceneIntent.tier, 'medium');
    assert.equal(
        state.scene.explorationHookEn,
        opening.scene.explorationHookEn,
    );
    assert.deepEqual(state.scene.timelineEntries, [{
        clock: '1991-07-24 · 09:10',
        label: 'Her mother opens the Hogwarts letter.',
    }]);
    assert.equal(
        state.items[0].importance,
        'key',
    );
    assert.equal(
        state.items[0].custody,
        'carried',
    );
    assert.equal(
        state.scene.itemStates[0]
            .custody,
        'carried',
    );
    assert.equal(
        state.actors[0].lifeStatus,
        'alive',
    );
    const map = buildLocalMapModel('zhang_family_home', state.map);
    assert.equal(map.currentRoomId, 'kitchen');
    assert.equal(map.nodes.length, 2);
});

test('scene destination matching resolves a player move to an existing room', () => {
    const state = createSceneTransitionState();
    assert.deepEqual(
        findSceneDestination('我跑到后花园去找猫头鹰。', state),
        {
            mapId: 'zhang_home',
            roomId: 'back_garden',
            mapName: '张家',
            mapNameEn: 'Zhang Home',
            roomName: '后花园',
            roomNameEn: 'Back Garden',
            levelId: 'ground_floor',
        },
    );
    const train = findSceneDestination(
        '转场去开学的火车。',
        state,
    );
    assert.equal(train.mapId, 'kings_cross');
    assert.equal(
        train.roomId,
        'hogwarts_express',
    );
    assert.equal(
        train.roomNameEn,
        'Hogwarts Express',
    );
});

test('express arrival intent binds the canonical Hogsmeade station room', () => {
    const state =
        createSceneTransitionState();
    state.map.activeMapId =
        'kings_cross_hogwarts_express_interior';
    state.scene.mapId =
        'kings_cross_hogwarts_express_interior';

    const destination =
        resolveSceneTransitionDestination(
            state,
            '到达霍格沃茨准备晚餐和分院',
        );
    assert.equal(
        destination.mapId,
        'hogsmeade',
    );
    assert.equal(
        destination.roomId,
        'hogsmeade_station',
    );
    assert.equal(
        resolveSceneTransitionDestination(
            state,
            '我想起了霍格沃茨',
        ),
        null,
    );
});

test('movement requires an explicit marker and historical place mentions stay put', () => {
    const state =
        createSceneTransitionState();
    const historical =
        '我之前去过古灵阁，我奶奶也带我去过古灵阁。';
    const candidate =
        inspectPlayerMovementIntent(
            state,
            historical,
        );

    assert.equal(
        candidate.confirmationRequired,
        true,
    );
    assert.equal(
        candidate.destination.roomId,
        'gringotts_lobby',
    );
    assert.equal(
        applyPlayerMovement(
            state,
            historical,
        ).movement,
        null,
    );
    assert.equal(
        state.map.currentLocalNodeId,
        'kitchen',
    );

    const marked =
        `${historical}\n→【后花园】`;
    assert.equal(
        parseExplicitMovementDirective(
            marked,
        ).destinationText,
        '后花园',
    );
    assert.equal(
        removeExplicitMovementDirective(
            marked,
        ),
        historical,
    );
    const moved =
        applyPlayerMovement(
            state,
            marked,
        );
    assert.equal(
        moved.movement.moved,
        true,
    );
    assert.equal(
        moved.movement
            .confirmationSource,
        'player_marker',
    );
    assert.equal(
        moved.state.map
            .currentLocalNodeId,
        'back_garden',
    );
});

test('entity migration backfills an owned wand without inventorying incidental food', () => {
    const state =
        createSceneTransitionState();
    delete state.entityStateVersion;
    state.items = [{
        id: 'admission_letter',
        labelEn: 'Hogwarts Letter',
        detailEn: 'The original acceptance letter.',
    }];
    state.scene.itemStates = undefined;
    const chat = [{
        extra: {
            hogwartsMud: {
                turnTransaction: {
                    publicEventEn:
                        'The holly wand has chosen Tina and the wand fitting is resolved.',
                    actorUpdates: [{
                        id: 'minerva_mcgonagall',
                        memoryUpdate: {
                            summaryEn:
                                'Ollivander confirmed the holly wand belongs to Tina for seven Galleons.',
                            significance:
                                'notable',
                            lastingImpactEn:
                                'The wand belongs to Tina.',
                        },
                    }],
                },
            },
        },
    }, {
        extra: {
            hogwartsMud: {
                turnTransaction: {
                    publicEventEn:
                        'Tina ate a caramel pasty at the cart.',
                },
            },
        },
    }];

    const migrated =
        migrateEntityState(state, chat);
    assert.equal(migrated.changed, true);
    assert.equal(
        migrated.state.entityStateVersion,
        1,
    );
    assert.ok(
        migrated.state.items.some(item =>
            item.id ===
                'holly_phoenix_wand' &&
            item.custody === 'carried' &&
            item.importance === 'key'),
    );
    assert.equal(
        migrated.state.items.some(item =>
            /pasty|馅饼/i.test(
                `${item.labelEn} ${item.label}`)),
        false,
    );
    assert.ok(
        migrated.state.scene.itemStates
            .every(item =>
                item.custody),
    );
    assert.ok(
        migrated.state.actors.every(actor =>
            actor.lifeStatus === 'alive'),
    );
});

test('current scene carries a valid editable default next-scene intent', () => {
    const state = createSceneTransitionState();
    const intent = createFallbackNextSceneIntent(state);
    assert.equal(intent.mapId, 'zhang_home');
    assert.equal(intent.roomId, 'kitchen');
    assert.equal(intent.tier, 'medium');
    assert.match(intent.summary, /继续推进/);
    assert.deepEqual(
        validateNextSceneIntent(intent, state),
        { valid: true, errors: [] },
    );
});

test('event-boundary director refreshes intent text without changing structural authority', () => {
    const state =
        createSceneTransitionState();
    state.scene.nextSceneIntent =
        createFallbackNextSceneIntent(
            state,
        );
    const previous =
        structuredClone(
            state.scene
                .nextSceneIntent,
        );
    const update = {
        titleEn:
            'After the Compartment Group Forms',
        summaryEn:
            'Carry the new peer group and its unresolved obligations into the next public scene.',
        triggerEn:
            'When the current group finishes its immediate business.',
    };

    assert.deepEqual(
        validateEventBoundaryNextSceneIntent(
            update,
        ),
        { valid: true, errors: [] },
    );
    const next =
        applyEventBoundaryNextSceneIntent(
            state,
            update,
        );
    assert.equal(
        next.scene.nextSceneIntent
            .titleEn,
        update.titleEn,
    );
    assert.equal(
        next.scene.nextSceneIntent
            .mapId,
        previous.mapId,
    );
    assert.equal(
        next.scene.nextSceneIntent
            .roomId,
        previous.roomId,
    );
    assert.equal(
        next.scene.nextSceneIntent
            .tier,
        previous.tier,
    );
    assert.equal(
        next.scene.nextSceneIntent
            .source,
        'medium_event_boundary',
    );

    assert.match(
        validateEventBoundaryNextSceneIntent({
            ...update,
            mapId:
                'forbidden_map',
        }).errors.join('；'),
        /不得写入字段/,
    );
});

test('ordinary player movement commits a reachable room before AI performance', () => {
    const state = createSceneTransitionState();
    const path = findLocalRoomPath(
        'zhang_home',
        'kitchen',
        'back_garden',
        state.map,
    );
    assert.deepEqual(path.roomIds, ['kitchen', 'back_garden']);

    const result = applyPlayerMovement(
        state,
        '→【后花园】\n我跑到后花园去找猫头鹰。',
    );
    assert.equal(result.movement.moved, true);
    assert.equal(result.movement.minutes, 1);
    assert.equal(result.state.map.currentLocalNodeId, 'back_garden');
    assert.equal(result.state.scene.roomId, 'back_garden');
    assert.equal(result.state.location, '后花园');
    assert.equal(result.state.spatial.player.roomId, 'back_garden');
});

test('guided movement commits a leader-known destination hidden from the player', () => {
    const state = createSceneTransitionState();
    const action =
        '→【跟随麦格】\n我牵着爸爸跟着麦格走向下一个购物点，她给我们带路。';
    const destination =
        findSceneDestination(
            '麦格带他们前往后花园。',
            state,
        );

    assert.equal(
        isGuidedMovementAction(action),
        true,
    );
    const result = applyPlayerMovement(
        state,
        action,
        {
            guidedDestination: destination,
            guidedByActorId:
                'minerva_mcgonagall',
        },
    );

    assert.equal(result.movement.moved, true);
    assert.equal(result.movement.guided, true);
    assert.equal(
        result.movement.destinationSource,
        'guide_context',
    );
    assert.equal(
        result.state.map.currentLocalNodeId,
        'back_garden',
    );
    assert.ok(
        result.movement.companionIds.includes(
            'minerva_mcgonagall',
        ),
    );

    const unresolved = applyPlayerMovement(
        state,
        action,
    );
    assert.equal(
        unresolved.movement.reason,
        'guide_destination_unknown',
    );
});

test('passive guided movement reaches Platform Nine and Three Quarters with the whole party', () => {
    const state = createKingsCrossState();
    const action =
        '→【九又四分之三站台】\n*紧紧拉住麦格教授，另外一只手拉住爸爸，希望被拉去九又四分之三站台*麦格教授你来拉我过去我不敢！！\n*扯扯爸爸，大喊*爸我们跟麦格教授走。她懂行！！';

    assert.equal(
        isGuidedMovementAction(
            '爸我们跟麦格教授走。',
        ),
        true,
    );
    assert.equal(
        isGuidedMovementAction(
            '希望被拉去九又四分之三站台。',
        ),
        true,
    );

    const result = applyPlayerMovement(
        state,
        action,
        {
            guidedByActorId:
                'minerva_mcgonagall',
        },
    );

    assert.equal(result.movement.moved, true);
    assert.equal(result.movement.guided, true);
    assert.equal(
        result.movement.toRoomId,
        'platform_nine_three_quarters',
    );
    assert.deepEqual(
        result.movement.path,
        [
            'platform_barrier',
            'platform_nine_three_quarters',
        ],
    );
    assert.deepEqual(
        new Set(result.movement.companionIds),
        new Set([
            'alex_zhang',
            'minerva_mcgonagall',
        ]),
    );
    assert.ok(
        result.state.actors.every(actor =>
            actor.roomId ===
                'platform_nine_three_quarters'),
    );
    const stableAfterReload =
        reconcileSpatialState(
            result.state,
            '',
            {
                sceneOpeningText:
                    'Muggle travellers pass the barriers between Platforms 9 and 10 while Tina waits before the brick partition.',
            },
        );
    assert.equal(
        stableAfterReload.locationRepair,
        null,
    );
    assert.equal(
        stableAfterReload.state.map
            .currentLocalNodeId,
        'platform_nine_three_quarters',
    );
    assert.equal(
        stableAfterReload.state.spatial
            .openingGroundingVersion,
        1,
    );

    const boarded = applyPlayerMovement(
        result.state,
        '→【霍格沃茨特快】\n我们拿着录取通知书登上霍格沃茨特快。',
    );
    assert.equal(boarded.movement.moved, true);
    assert.deepEqual(
        boarded.movement.path,
        [
            'platform_nine_three_quarters',
            'hogwarts_express',
        ],
    );
});

test('guided movement retry replaces a stale guide-context destination', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'leaky_cauldron';
    state.map.currentLevelId = 'street';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'leaky_cauldron';
    state.spatial = {
        version: 3,
        player: {
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
        lastMovement: null,
    };
    state.actors = [
        {
            id: 'alex_zhang',
            nameEn: 'Alex Zhang',
            relationshipToPlayerEn: 'Father',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
        {
            id: 'minerva_mcgonagall',
            nameEn: 'Minerva McGonagall',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
    ];
    state.actorLibrary = [
        {
            id: 'alex_zhang',
            nameEn: 'Alex Zhang',
            relationshipToPlayerEn: 'Father',
        },
        {
            id: 'minerva_mcgonagall',
            nameEn: 'Minerva McGonagall',
        },
    ];
    const action =
        '我牵着爸爸跟着麦格走向下一个购物点，她给我们带路。';
    const storedMovement = {
        attempted: true,
        moved: true,
        fromMapId: 'diagon_alley',
        fromRoomId: 'madam_malkins',
        toMapId: 'diagon_alley',
        toRoomId: 'leaky_cauldron',
        companionIds: [
            'alex_zhang',
            'minerva_mcgonagall',
        ],
        guided: true,
        guidedByActorId:
            'minerva_mcgonagall',
        destinationSource: 'guide_context',
        path: [
            'madam_malkins',
            'diagon_south',
            'brick_archway',
            'leaky_cauldron',
        ],
        minutes: 3,
    };

    const result = resolvePlayerMovement(
        state,
        action,
        storedMovement,
        {
            guidedDestination: {
                mapId: 'diagon_alley',
                roomId: 'ollivanders',
                roomName:
                    '奥利凡德魔杖店',
                roomNameEn: 'Ollivanders',
                levelId: 'street',
            },
            guidedByActorId:
                'minerva_mcgonagall',
        },
    );

    assert.equal(
        result.movement.toRoomId,
        'ollivanders',
    );
    assert.equal(
        result.state.map.currentLocalNodeId,
        'ollivanders',
    );
    assert.deepEqual(
        new Set(result.movement.companionIds),
        new Set([
            'alex_zhang',
            'minerva_mcgonagall',
        ]),
    );
    assert.ok(
        result.state.actors.every(actor =>
            actor.roomId === 'ollivanders'),
    );
});

test('entering a preset proprietor room admits its canonical resident once', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'ollivanders';
    state.map.currentLevelId = 'street';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'ollivanders';
    state.spatial = {
        version: 3,
        player: {
            mapId: 'diagon_alley',
            roomId: 'ollivanders',
        },
        lastMovement: null,
    };

    assert.equal(
        PRESET_LOCATION_ACTORS
            .garrick_ollivander
            .homeRoomId,
        'ollivanders',
    );
    const admitted =
        admitCurrentLocationResidents(
            state,
        );
    assert.deepEqual(
        admitted.admittedActorIds,
        ['garrick_ollivander'],
    );
    const profile =
        admitted.state.actorLibrary
            .find(actor =>
                actor.id ===
                    'garrick_ollivander');
    const actor =
        admitted.state.actors
            .find(item =>
                item.id ===
                    'garrick_ollivander');
    assert.equal(
        profile.source,
        'preset_location_resident',
    );
    assert.equal(actor.present, true);
    assert.equal(
        actor.mapId,
        'diagon_alley',
    );
    assert.equal(
        actor.roomId,
        'ollivanders',
    );
    assert.match(
        actor.currentActivityEn,
        /Emerging quietly/,
    );

    const repeated =
        admitCurrentLocationResidents(
            admitted.state,
        );
    assert.deepEqual(
        repeated.admittedActorIds,
        [],
    );
    assert.equal(
        repeated.state,
        admitted.state,
    );
    assert.equal(
        repeated.state.actorLibrary
            .filter(item =>
                item.id ===
                    'garrick_ollivander')
            .length,
        1,
    );
    assert.equal(
        repeated.state.actors
            .filter(item =>
                item.id ===
                    'garrick_ollivander')
            .length,
        1,
    );
});

test('scene transition can preload a destination professor without activating them in the closing scene', () => {
    const state =
        createSceneTransitionState();
    const preloaded =
        admitCurrentLocationResidents(
            state,
            {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
                activate: false,
            },
        );
    assert.deepEqual(
        preloaded.admittedActorIds,
        [
            'canon_filius_flitwick',
        ],
    );
    const profile =
        preloaded.state
            .actorLibrary
            .find(actor =>
                actor.id ===
                    'canon_filius_flitwick');
    const inactive =
        preloaded.state.actors
            .find(actor =>
                actor.id ===
                    'canon_filius_flitwick');
    assert.equal(
        profile.nameEn,
        'Filius Flitwick',
    );
    assert.equal(
        inactive.present,
        false,
    );
    assert.equal(
        inactive.roomId,
        'charms_classroom',
    );

    const activated =
        admitCurrentLocationResidents(
            preloaded.state,
            {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
                activate: true,
            },
        );
    assert.deepEqual(
        activated.admittedActorIds,
        [
            'canon_filius_flitwick',
        ],
    );
    assert.equal(
        activated.state.actors
            .find(actor =>
                actor.id ===
                    'canon_filius_flitwick')
            .present,
        true,
    );

    const transition =
        createSceneTransitionPackage();
    transition.nextScene.mapId =
        'hogwarts_castle';
    transition.nextScene.roomId =
        'charms_classroom';
    transition.nextScene.nameEn =
        'First Charms Lesson';
    transition.nextScene.summaryEn =
        'Professor Flitwick begins the first Charms lesson.';
    transition.nextScene.actorStates =
        [];
    transition.nextScene
        .openingSegments = [
            {
                type:
                    'narration',
                textEn:
                    'The Charms classroom settles for the lesson.',
            },
            {
                type:
                    'narration',
                textEn:
                    'Rain ticks against the high windows.',
            },
        ];
    assert.match(
        validateSceneTransitionPackage(
            transition,
            preloaded.state,
        ).errors.join('；'),
        /canon_filius_flitwick.*present:true/u,
    );
    transition.nextScene
        .actorStates.push({
            id:
                'canon_filius_flitwick',
            present: true,
            currentActivityEn:
                'Beginning the first Charms lesson.',
            firstImpressionOfPlayerEn:
                'An unusually conspicuous first-year with bright blue eyes.',
            lifeStatus:
                'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive and unharmed.',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
        });
    assert.doesNotMatch(
        validateSceneTransitionPackage(
            transition,
            preloaded.state,
        ).errors.join('；'),
        /canon_filius_flitwick.*present:true/u,
    );
});

test('marked Chinese movement resolves a multi-room Diagon Alley destination', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId = 'leaky_cauldron';
    state.map.currentLevelId = 'street';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'leaky_cauldron';
    state.spatial = {
        version: 1,
        player: {
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
        lastMovement: null,
    };

    const result = applyPlayerMovement(
        state,
        '→【摩金夫人长袍店】\n我冲向对角巷南段，然后往摩金夫人长袍店的方向走去。',
    );

    assert.equal(result.movement.moved, true);
    assert.equal(
        result.movement.toRoomId,
        'madam_malkins',
    );
    assert.equal(
        result.movement.toRoomNameEn,
        'Madam Malkins',
    );
    assert.deepEqual(result.movement.path, [
        'leaky_cauldron',
        'brick_archway',
        'diagon_south',
        'madam_malkins',
    ]);
});

test('house credentials constrain entry but not exit movement', () => {
    const mapState = {
        exitStates: {},
        generatedLocalNodes: [],
        generatedLocalExits: [],
    };
    const outward =
        findLocalRoomPath(
            'hogwarts_castle',
            'gryffindor_common_room',
            'great_hall',
            mapState,
            {
                allowedConditions: [
                    'wizard_intent',
                ],
            },
        );
    assert.ok(outward);
    assert.deepEqual(
        [
            outward.roomIds[0],
            outward.roomIds.at(-1),
        ],
        [
            'gryffindor_common_room',
            'great_hall',
        ],
    );
    assert.equal(
        outward.routes.some(route =>
            route.reversed &&
            route.from ===
                'fat_lady_portrait' &&
            route.to ===
                'gryffindor_corridor' &&
            (
                route.conditions ||
                []
            ).length === 0),
        true,
    );
    assert.equal(
        findLocalRoomPath(
            'hogwarts_castle',
            'great_hall',
            'gryffindor_common_room',
            mapState,
            {
                allowedConditions: [
                    'wizard_intent',
                ],
            },
        ),
        null,
    );
    assert.ok(
        findLocalRoomPath(
            'hogwarts_castle',
            'great_hall',
            'gryffindor_common_room',
            mapState,
            {
                allowedConditions: [
                    'wizard_intent',
                    'gryffindor_password',
                ],
            },
        ),
    );
});

test('explicit Great Hall movement commits from Gryffindor Common Room', () => {
    const state =
        createSceneTransitionState();
    state.map.activeMapId =
        'hogwarts_castle';
    state.map.currentLocalNodeId =
        'gryffindor_common_room';
    state.map.currentLevelId =
        'seventh';
    state.scene.mapId =
        'hogwarts_castle';
    state.scene.roomId =
        'gryffindor_common_room';
    state.spatial = {
        version: 7,
        player: {
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
        },
        lastMovement: null,
    };
    state.actorLibrary = [{
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        name:
            '赫敏·简·格兰杰',
        aliases: [
            '赫敏',
        ],
    }, {
        id:
            'canon_lavender_brown',
        nameEn:
            'Lavender Brown',
        name:
            '拉文德·布朗',
        aliases: [
            '拉文德',
        ],
    }];
    state.actors = [{
        ...state.actorLibrary[0],
        present: true,
        mapId:
            'hogwarts_castle_gryffindor_girls_dormitory_interior',
        roomId:
            'first_year_dormitory',
    }, {
        ...state.actorLibrary[1],
        present: true,
        mapId:
            'hogwarts_castle',
        roomId:
            'gryffindor_common_room',
    }];

    const moved =
        applyPlayerMovement(
            state,
            '→【跟着赫敏和拉文德去大礼堂】',
        );
    assert.equal(
        moved.movement.moved,
        true,
    );
    assert.equal(
        moved.movement.toRoomId,
        'great_hall',
    );
    assert.deepEqual(
        moved.movement
            .companionIds,
        [
            'canon_lavender_brown',
        ],
    );
    assert.equal(
        moved.state.map
            .currentLocalNodeId,
        'great_hall',
    );
    assert.equal(
        moved.state.scene.id,
        state.scene.id,
    );
});

test('bound interior and parent map movement commits without archiving the scene', () => {
    const state =
        createSceneTransitionState();
    const interiorMap = {
        id:
            'zhang_home_kitchen_interior',
        parentMapId:
            'zhang_home',
        parentRoomId:
            'kitchen',
        sourceContainerKey:
            'zhang_home:kitchen',
        name:
            '厨房内部',
        nameEn:
            'Kitchen Interior',
        defaultLevelId:
            'inside',
        defaultRoomId:
            'kitchen_table',
        levels: [{
            id: 'inside',
            name: '内部',
            nameEn: 'Inside',
            z: 0,
        }],
        nodes: [{
            id:
                'kitchen_table',
            name:
                '厨房餐桌',
            nameEn:
                'Kitchen Table',
            levelId:
                'inside',
        }],
        exits: [],
    };
    state.map.customLocalMaps.push(
        interiorMap,
    );
    state.map.interiorMapBindings = {
        'zhang_home:kitchen':
            interiorMap.id,
    };
    state.map.activeMapId =
        interiorMap.id;
    state.map.currentLocalNodeId =
        'kitchen_table';
    state.map.currentLevelId =
        'inside';
    state.scene.mapId =
        interiorMap.id;
    state.scene.roomId =
        'kitchen_table';
    state.spatial = {
        version: 6,
        player: {
            mapId:
                interiorMap.id,
            roomId:
                'kitchen_table',
        },
        lastMovement: null,
    };
    const minerva =
        state.actors.find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    minerva.mapId =
        interiorMap.id;
    minerva.roomId =
        'kitchen_table';
    minerva.aliases = [
        'Minerva',
    ];
    state.actorLibrary
        .find(actor =>
            actor.id ===
                'minerva_mcgonagall')
        .aliases = [
            'Minerva',
        ];

    const exited =
        applyPlayerMovement(
            state,
            '→【和Minerva一起去后花园】',
        );
    assert.equal(
        exited.movement.moved,
        true,
    );
    assert.equal(
        exited.movement.bridge,
        'interior_to_parent',
    );
    assert.equal(
        exited.state.map.activeMapId,
        'zhang_home',
    );
    assert.equal(
        exited.state.map
            .currentLocalNodeId,
        'back_garden',
    );
    assert.equal(
        exited.state.scene.id,
        state.scene.id,
    );
    assert.deepEqual(
        exited.movement.companionIds,
        [
            'minerva_mcgonagall',
        ],
    );
    assert.equal(
        exited.state.actors
            .find(actor =>
                actor.id ===
                    'minerva_mcgonagall')
            .roomId,
        'back_garden',
    );

    const entered =
        applyPlayerMovement(
            exited.state,
            '→【和Minerva一起去Kitchen Table】',
            {
                confirmed: true,
                confirmedDestination: {
                    mapId:
                        interiorMap.id,
                    roomId:
                        'kitchen_table',
                    roomName:
                        '厨房餐桌',
                    roomNameEn:
                        'Kitchen Table',
                    levelId:
                        'inside',
                },
            },
        );
    assert.equal(
        entered.movement.moved,
        true,
    );
    assert.equal(
        entered.movement.bridge,
        'parent_to_interior',
    );
    assert.equal(
        entered.state.map.activeMapId,
        interiorMap.id,
    );
    assert.equal(
        entered.state.map
            .currentLocalNodeId,
        'kitchen_table',
    );
});

test('unsettled turn recovery replays its committed move and route companions', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'diagon_south';
    state.map.currentLevelId = 'street';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'diagon_south';
    state.spatial = {
        version: 3,
        player: {
            mapId: 'diagon_alley',
            roomId: 'diagon_south',
        },
        lastMovement: null,
    };
    state.actors = [{
        id: 'alex_zhang',
        nameEn: 'Alex Zhang',
        relationshipToPlayerEn: 'Father',
        present: true,
        mapId: 'diagon_alley',
        roomId: 'gringotts_steps',
    }];
    state.actorLibrary = [{
        id: 'alex_zhang',
        nameEn: 'Alex Zhang',
        relationshipToPlayerEn: 'Father',
    }];
    const storedMovement = {
        attempted: true,
        moved: true,
        fromMapId: 'diagon_alley',
        fromRoomId: 'gringotts_lobby',
        toMapId: 'diagon_alley',
        toRoomId: 'diagon_south',
        fromRoomName: '古灵阁大厅',
        toRoomName: '对角巷南段',
        toRoomNameEn: '对角巷南段',
        companionIds: [],
        path: [
            'gringotts_lobby',
            'gringotts_steps',
            'diagon_south',
        ],
        minutes: 2,
        committedAt: '2026-08-03T17:39:10.999Z',
    };

    const result = resolvePlayerMovement(
        state,
        '我冲向对角巷南段的街上，拉着爸爸去买饼。',
        storedMovement,
    );

    assert.equal(result.movement.moved, true);
    assert.equal(
        result.movement.toRoomNameEn,
        'Diagon Alley South',
    );
    assert.deepEqual(
        result.movement.companionIds,
        ['alex_zhang'],
    );
    assert.equal(
        result.state.actors[0].roomId,
        'diagon_south',
    );
    assert.equal(
        result.movement.committedAt,
        storedMovement.committedAt,
    );
});

test('Gringotts shorthand moves player and explicit companions without archiving the scene', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'madam_malkins';
    state.map.currentLevelId = 'street';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'madam_malkins';
    state.spatial = {
        version: 1,
        player: {
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        lastMovement: null,
    };
    state.actors = [
        {
            id: 'alex_zhang',
            nameEn: 'Alex Zhang',
            relationshipToPlayerEn: 'Father',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        {
            id: 'eddie_cooper',
            nameEn: 'Eddie Cooper',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        {
            id: 'minerva_mcgonagall',
            nameEn: 'Minerva McGonagall',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
    ];
    const sceneId = state.scene.id;
    const archiveCount = state.sceneArchive.length;
    const result = applyPlayerMovement(
        state,
        '→【古灵阁】\n我拉着我爸和 Eddie Cooper 一起走向古灵阁。',
    );
    assert.equal(result.movement.moved, true);
    assert.equal(
        result.movement.toRoomId,
        'gringotts_lobby',
    );
    assert.equal(
        result.movement.toRoomNameEn,
        'Gringotts',
    );
    assert.deepEqual(
        new Set(result.movement.companionIds),
        new Set(['alex_zhang', 'eddie_cooper']),
    );
    assert.equal(
        result.state.map.currentLocalNodeId,
        'gringotts_lobby',
    );
    assert.equal(
        result.state.actors.find(actor =>
            actor.id === 'alex_zhang').roomId,
        'gringotts_lobby',
    );
    assert.equal(
        result.state.actors.find(actor =>
            actor.id === 'eddie_cooper').roomId,
        'gringotts_lobby',
    );
    assert.equal(
        result.state.actors.find(actor =>
            actor.id === 'minerva_mcgonagall').roomId,
        'madam_malkins',
    );
    assert.equal(result.state.scene.id, sceneId);
    assert.equal(
        result.state.sceneArchive.length,
        archiveCount,
    );
});

test('spatial v2 repairs the legacy generic steps false match', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'madam_malkins';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'madam_malkins';
    state.spatial = {
        version: 1,
        player: {
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        lastMovement: null,
    };
    state.actors = [{
        id: 'madam_malkin',
        present: true,
        mapId: 'diagon_alley',
        roomId: 'gringotts_steps',
        currentActivityEn:
            'Steps from behind cutting table and intercepts Tina.',
    }];
    const reconciled = reconcileSpatialState(state);
    assert.equal(reconciled.changed, true);
    assert.equal(
        reconciled.state.actors[0].roomId,
        'madam_malkins',
    );
    assert.equal(
        reconciled.state.spatial.version,
        7,
    );
});

test('spatial migration retries a recorded unresolved local movement once', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'madam_malkins';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'madam_malkins';
    state.spatial = {
        version: 2,
        player: {
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        lastMovement: null,
    };
    state.actors = [
        {
            id: 'alex_zhang',
            relationshipToPlayerEn: 'Father',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        {
            id: 'eddie_cooper',
            nameEn: 'Eddie Cooper',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
        {
            id: 'minerva_mcgonagall',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'madam_malkins',
        },
    ];
    const sceneId = state.scene.id;
    const archiveCount = state.sceneArchive.length;
    const migrated = reconcileSpatialState(
        state,
        '我拉着我爸和 Eddie Cooper 一起走向古灵阁。',
        { retryUnresolvedMovement: true },
    );

    assert.equal(migrated.changed, true);
    assert.equal(migrated.movement.moved, true);
    assert.equal(
        migrated.state.map.currentLocalNodeId,
        'gringotts_lobby',
    );
    assert.deepEqual(
        new Set(migrated.movement.companionIds),
        new Set(['alex_zhang', 'eddie_cooper']),
    );
    assert.equal(
        migrated.state.actors.find(actor =>
            actor.id === 'minerva_mcgonagall').roomId,
        'madam_malkins',
    );
    assert.equal(migrated.state.scene.id, sceneId);
    assert.equal(
        migrated.state.sceneArchive.length,
        archiveCount,
    );
});

test('spatial v3 advances legacy Gringotts shorthand from the steps to the lobby', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'gringotts_steps';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'gringotts_steps';
    state.spatial = {
        version: 2,
        player: {
            mapId: 'diagon_alley',
            roomId: 'gringotts_steps',
        },
        lastMovement: {
            moved: true,
            fromMapId: 'diagon_alley',
            fromRoomId: 'madam_malkins',
            fromRoomName:
                '摩金夫人长袍店',
            companionIds: [
                'alex_zhang',
                'eddie_cooper',
                'minerva_mcgonagall',
            ],
            path: [
                'madam_malkins',
                'diagon_south',
                'gringotts_steps',
            ],
            minutes: 2,
            toRoomId: 'gringotts_steps',
        },
    };
    state.actors = [
        {
            id: 'alex_zhang',
            relationshipToPlayerEn: 'Father',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'gringotts_steps',
        },
        {
            id: 'eddie_cooper',
            nameEn: 'Eddie Cooper',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'gringotts_steps',
        },
        {
            id: 'minerva_mcgonagall',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'gringotts_lobby',
        },
    ];
    const migrated = reconcileSpatialState(
        state,
        '我拉着我爸和 Eddie Cooper 一起走向古灵阁。',
    );

    assert.equal(migrated.movement.moved, true);
    assert.equal(
        migrated.state.map.currentLocalNodeId,
        'gringotts_lobby',
    );
    assert.equal(
        migrated.state.actors.find(actor =>
            actor.id === 'alex_zhang').roomId,
        'gringotts_lobby',
    );
    assert.equal(
        migrated.state.actors.find(actor =>
            actor.id === 'eddie_cooper').roomId,
        'gringotts_lobby',
    );
    assert.equal(
        migrated.state.actors.find(actor =>
            actor.id === 'minerva_mcgonagall').roomId,
        'gringotts_lobby',
    );
    assert.equal(
        migrated.state.spatial.version,
        7,
    );
    assert.deepEqual(
        migrated.movement.path,
        [
            'madam_malkins',
            'diagon_south',
            'gringotts_steps',
            'gringotts_lobby',
        ],
    );
    assert.deepEqual(
        new Set(migrated.movement.companionIds),
        new Set([
            'alex_zhang',
            'eddie_cooper',
            'minerva_mcgonagall',
        ]),
    );
});

test('observable actor activity corrects stale low-tier room ids', () => {
    const state = createSceneTransitionState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId = 'madam_malkins';
    state.actors = [
        {
            id: 'alex_zhang',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
        {
            id: 'minerva_mcgonagall',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
        {
            id: 'eddie_cooper',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
        {
            id: 'diagon_passerby_doris',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        },
    ];
    const normalized =
        normalizeScenePerformanceActorLocations({
            actorUpdates: [
                {
                    id: 'alex_zhang',
                    mapId: 'diagon_alley',
                    roomId: 'leaky_cauldron',
                    currentActivityEn:
                        'Standing at the brick archway.',
                },
                {
                    id: 'minerva_mcgonagall',
                    mapId: 'diagon_alley',
                    roomId: 'leaky_cauldron',
                    currentActivityEn:
                        'Standing at the archway, watching Tina dash down Diagon Alley south.',
                    memoryUpdate: {
                        summaryEn:
                            'McGonagall watched Tina run into Diagon Alley.',
                        significance:
                            'significant',
                        lastingImpactEn:
                            'McGonagall will watch nearby exits when Tina grows restless.',
                    },
                },
                {
                    id: 'eddie_cooper',
                    mapId: 'diagon_alley',
                    roomId: 'leaky_cauldron',
                    currentActivityEn:
                        'Blocking Madam Malkin\'s doorway.',
                },
                {
                    id: 'diagon_passerby_doris',
                    mapId: 'diagon_alley',
                    roomId: 'leaky_cauldron',
                    currentActivityEn:
                        'Walking along Diagon Alley south.',
                },
            ],
        }, state);

    assert.deepEqual(
        normalized.actorUpdates.map(update => [
            update.id,
            update.roomId,
        ]),
        [
            ['alex_zhang', 'brick_archway'],
            ['minerva_mcgonagall', 'brick_archway'],
            ['eddie_cooper', 'madam_malkins'],
            ['diagon_passerby_doris', 'diagon_south'],
        ],
    );
    assert.equal(
        normalized.actorUpdates.find(update =>
            update.id ===
                'minerva_mcgonagall')
            .memoryUpdate.significance,
        'notable',
    );
});

test('generic school-year ordinals do not move actors onto stair landings', () => {
    const castle =
        PRESET_LOCAL_MAPS
            .hogwarts_castle;
    assert.equal(
        inferActorRoomId(
            {
                currentActivityEn:
                    'Sitting at the Gryffindor table holding his first-year timetable.',
            },
            castle,
            'great_hall',
        ),
        'great_hall',
    );
});

test('train actor tracking prefers an explicit corridor over a generic compartment mention', () => {
    const state =
        createSceneTransitionState();
    const trainMap = {
        id:
            'hogwarts_express_interior',
        name: '霍格沃茨特快内部',
        nameEn:
            'Hogwarts Express Interior',
        defaultLevelId: 'carriage',
        nodes: [
            {
                id: 'rear_corridor',
                name: '后车厢走廊',
                nameEn:
                    'Rear Carriage Corridor',
                levelId: 'carriage',
            },
            {
                id:
                    'compartment_a_rear',
                name: '后舱 A',
                nameEn:
                    'Rear Compartment A',
                levelId: 'carriage',
            },
        ],
        exits: [
            {
                from: 'rear_corridor',
                to:
                    'compartment_a_rear',
                direction: 'north',
                kind: 'door',
                minutes: 1,
                conditions: [],
            },
            {
                from:
                    'compartment_a_rear',
                to: 'rear_corridor',
                direction: 'south',
                kind: 'door',
                minutes: 1,
                conditions: [],
            },
        ],
    };
    state.map.customLocalMaps.push(
        trainMap,
    );
    state.map.activeMapId =
        trainMap.id;
    state.map.currentLocalNodeId =
        'rear_corridor';
    state.scene.mapId = trainMap.id;
    state.scene.roomId =
        'rear_corridor';
    state.spatial = {
        version: 4,
        player: {
            mapId: trainMap.id,
            roomId: 'rear_corridor',
        },
        lastMovement: null,
    };
    state.actors = [{
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        present: true,
        mapId: trainMap.id,
        roomId:
            'compartment_a_rear',
        currentActivityEn:
            'Hauling Tina backward into the rear corridor away from the three boys\' compartment.',
    }];
    const payload =
        normalizeScenePerformanceActorLocations({
            actorUpdates: [{
                ...state.actors[0],
            }],
        }, state);
    assert.equal(
        payload.actorUpdates[0].roomId,
        'rear_corridor',
    );

    const migrated =
        reconcileSpatialState(state);
    assert.equal(
        migrated.state.actors[0]
            .roomId,
        'rear_corridor',
    );
    assert.equal(
        migrated.state.spatial.version,
        7,
    );
});

test('spatial migration restores legacy player and actor room positions', () => {
    const state = createSceneTransitionState();
    delete state.spatial;
    delete state.actors[0].mapId;
    delete state.actors[0].roomId;
    state.actors[0].currentActivityEn = 'Signing a form at the kitchen table.';
    delete state.actors[1].mapId;
    delete state.actors[1].roomId;
    state.actors[1].currentActivityEn = 'Watching from the living area.';

    const migrated = reconcileSpatialState(
        state,
        '然后我跑到后花园绕着围墙跑了一圈。',
    );
    assert.equal(migrated.changed, true);
    assert.equal(migrated.state.map.currentLocalNodeId, 'back_garden');
    assert.equal(migrated.state.actors[0].roomId, 'kitchen');
    assert.equal(migrated.state.actors[1].mapId, 'zhang_home');
});

test('spatial v4 repairs a scene whose opening is at the barrier but room ID says train', () => {
    const state = createKingsCrossState(
        'hogwarts_express',
    );
    state.spatial.version = 4;
    const repaired = reconcileSpatialState(
        state,
        '',
        {
            sceneOpeningText:
                'Muggle travellers dragged suitcases past the barriers between Platforms 9 and 10 without a second glance at the brick partition, and Alex stood directly in front of it. The Hogwarts Express waited somewhere on the other side.',
        },
    );

    assert.equal(repaired.changed, true);
    assert.deepEqual(
        repaired.locationRepair,
        {
            fromMapId: 'kings_cross',
            fromRoomId: 'hogwarts_express',
            toMapId: 'kings_cross',
            toRoomId: 'platform_barrier',
            source: 'scene_opening_text',
        },
    );
    assert.equal(
        repaired.state.map.currentLocalNodeId,
        'platform_barrier',
    );
    assert.equal(
        repaired.state.scene.roomId,
        'platform_barrier',
    );
    assert.ok(
        repaired.state.actors.every(actor =>
            actor.roomId ===
                'platform_barrier'),
    );
    assert.equal(
        repaired.state.items[0].roomId,
        'platform_barrier',
    );
    assert.equal(
        repaired.state.spatial.version,
        7,
    );
    assert.equal(
        repaired.state.spatial
            .openingGroundingVersion,
        1,
    );
});

test('temporal grounding repairs the legacy July clock for the September school departure', () => {
    const state = createKingsCrossState(
        'platform_nine_three_quarters',
    );
    state.clock = '1991-07-24 · 17:03';
    state.scene.startedClock =
        '1991-07-24 · 16:48';
    state.scene.timelineEntries = [
        {
            clock: '1991-07-24 · 16:48',
            label: 'The family reaches the barrier.',
        },
        {
            clock: '1991-07-24 · 17:03',
            label: 'The family crosses onto the platform.',
        },
    ];
    state.timeline = [
        {
            clock: '1991-07-24 · 11:15',
            label: 'An earlier scene remains unchanged.',
        },
        ...structuredClone(
            state.scene.timelineEntries,
        ),
    ];
    const retryBase = structuredClone(state);
    retryBase.clock =
        '1991-07-24 · 16:48';
    retryBase.scene.timelineEntries =
        retryBase.scene.timelineEntries
            .slice(0, 1);
    delete retryBase.turnRetry;
    state.turnRetry = {
        version: 1,
        playerMessageId: 63,
        assistantMessageId: 64,
        playerAction: 'Follow McGonagall.',
        forceCheck: false,
        baseClock: retryBase.clock,
        baseState: retryBase,
    };

    const repaired =
        reconcileTemporalState(
            state,
            'King\'s Cross on the first of September was crowded beside the Hogwarts Express and Platform Nine and Three Quarters.',
        );

    assert.equal(repaired.changed, true);
    assert.deepEqual(
        repaired.clockRepair,
        {
            fromClock:
                '1991-07-24 · 17:03',
            toClock:
                '1991-09-01 · 10:45',
            fromSceneStartedClock:
                '1991-07-24 · 16:48',
            toSceneStartedClock:
                '1991-09-01 · 10:30',
            source:
                'legacy_kings_cross_anchor',
        },
    );
    assert.equal(
        repaired.state.clock,
        '1991-09-01 · 10:45',
    );
    assert.deepEqual(
        repaired.state.scene.timelineEntries
            .map(entry => entry.clock),
        [
            '1991-09-01 · 10:30',
            '1991-09-01 · 10:45',
        ],
    );
    assert.equal(
        repaired.state.timeline[0].clock,
        '1991-07-24 · 11:15',
    );
    assert.equal(
        repaired.state.turnRetry.baseClock,
        '1991-09-01 · 10:30',
    );
    assert.equal(
        repaired.state.turnRetry
            .baseState.clock,
        '1991-09-01 · 10:30',
    );
    assert.deepEqual(
        repaired.state.scene.temporalFactsEn,
        [
            'The current date is 1 September 1991.',
            'The train departs at eleven.',
        ],
    );
});

test('spatial context allows reactions across a committed sightline', () => {
    const state = applyPlayerMovement(
        createSceneTransitionState(),
        '→【后花园】\n我跑到后花园。',
    ).state;
    const spatial = buildSpatialContext(state);
    assert.equal(spatial.player.roomId, 'back_garden');
    assert.equal(
        spatial.actors.find(actor =>
            actor.id === 'minerva_mcgonagall').roomId,
        'kitchen',
    );
    assert.equal(
        spatial.actors.find(actor =>
            actor.id === 'minerva_mcgonagall').canSeePlayer,
        true,
    );
});

test('spatial authority removes stale off-scene actors but preserves committed sightlines', () => {
    const state = applyPlayerMovement(
        createSceneTransitionState(),
        '→【后花园】\n我跑到后花园。',
    ).state;
    state.actors.push({
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        present: true,
        mapId:
            'hogwarts_castle',
        roomId:
            'great_hall',
        currentActivityEn:
            'Waiting in another castle room.',
    });
    const reconciled =
        reconcileVisibleActorPresenceState(
            state,
        );
    assert.equal(
        reconciled.changed,
        true,
    );
    assert.equal(
        reconciled.state.actors
            .find(actor =>
                actor.id ===
                    'minerva_mcgonagall')
            .present,
        true,
    );
    assert.equal(
        reconciled.state.actors
            .find(actor =>
                actor.id ===
                    'canon_hermione_jean_granger')
            .present,
        false,
    );

    const transaction =
        reconcileTurnActorPresenceWithSpatialState(
            {
                actorPresence: {
                    presentActorIdsAfterTurn: [
                        'minerva_mcgonagall',
                        'canon_hermione_jean_granger',
                    ],
                },
                actorUpdates: [],
                temporaryActorEntrances: [],
            },
            state,
        );
    assert.deepEqual(
        transaction.actorPresence
            .presentActorIdsAfterTurn,
        [
            'minerva_mcgonagall',
        ],
    );
    assert.equal(
        transaction.actorUpdates
            .find(update =>
                update.id ===
                    'canon_hermione_jean_granger')
            .present,
        false,
    );
});

test('explicit movement history repairs a named companion omitted by legacy movement metadata', () => {
    const state =
        createSceneTransitionState();
    state.actors.push({
        id:
            'canon_hermione_jean_granger',
        name:
            '赫敏·格兰杰',
        nameEn:
            'Hermione Jean Granger',
        aliases: [
            '赫敏',
            'Hermione',
        ],
        present: false,
        mapId:
            'hogwarts_castle_gryffindor_girls_dormitory_interior',
        roomId:
            'first_year_dormitory',
        currentActivityEn:
            'Last recorded in the dormitory.',
    });
    state.actorLibrary.push({
        id:
            'canon_hermione_jean_granger',
        name:
            '赫敏·格兰杰',
        nameEn:
            'Hermione Jean Granger',
        aliases: [
            '赫敏',
            'Hermione',
        ],
    });
    const migration =
        migrateActorMovementHistory(
            state,
            [{
                is_user: true,
                mes:
                    '→【跟着赫敏和拉文德去大礼堂】',
                extra: {
                    hogwartsMud: {
                        movement: {
                            moved: true,
                            toMapId:
                                'hogwarts_castle',
                            toRoomId:
                                'great_hall',
                            companionIds: [],
                        },
                    },
                },
            }],
        );
    const hermione =
        migration.state.actors
            .find(actor =>
                actor.id ===
                    'canon_hermione_jean_granger');
    assert.equal(
        hermione.mapId,
        'hogwarts_castle',
    );
    assert.equal(
        hermione.roomId,
        'great_hall',
    );
    assert.match(
        hermione.currentActivityEn,
        /Last known at great_hall/iu,
    );
    assert.equal(
        migrateActorMovementHistory(
            migration.state,
            [],
        ).changed,
        false,
    );
});

test('mandatory scene state stays compact and excludes detailed memories and hidden arcs', () => {
    const state = createSceneTransitionState();
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
        compact.actorPerformance.length,
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

test('actor continuity capsules override stale stranger labels without exposing secrets', () => {
    const state =
        createSceneTransitionState();
    const hermione = {
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        roleEn: 'Student',
        relationshipToPlayerEn:
            'newly met stranger',
        impressionOfPlayerEn:
            'Boundary-free but impossible to forget.',
        firstImpressionOfPlayerEn:
            'A reckless girl with a wand.',
        firstImpressionClock:
            '1991-09-01 · 11:53',
        secretEn:
            'This must not enter continuity.',
        sharedMemories: {
            core: [],
            recent: [{
                id: 'train_memory',
                tier: 'recent',
                summaryEn:
                    'Shared a train compartment where Tina broke the window and scorched a textbook.',
                lastClock:
                    '1991-09-01 · 15:15',
            }],
            everyday: [],
        },
    };
    const lavender = {
        id:
            'canon_lavender_brown',
        nameEn:
            'Lavender Brown',
        roleEn: 'Student',
    };
    state.actorLibrary = [
        hermione,
        lavender,
    ];
    state.actors = [
        {
            ...hermione,
            present: true,
        },
        {
            ...lavender,
            present: true,
        },
    ];
    state.socialGraph = {
        version: 2,
        relationships: [
            {
                id: 'hermione_player',
                sourceActorId:
                    hermione.id,
                targetActorId:
                    'player',
                familiarity: 30,
                closeness: 35,
                warmth: 8,
                trust: 0,
                tension: 80,
                protectiveness: 8,
                evidenceIds: [],
            },
            {
                id:
                    'hermione_lavender',
                sourceActorId:
                    hermione.id,
                targetActorId:
                    lavender.id,
                familiarity: 15,
                closeness: 10,
                warmth: 8,
                trust: 0,
                tension: 0,
                protectiveness: 0,
                evidenceIds: [],
            },
        ],
        relationshipEvidence: [],
    };

    const [capsule] =
        buildActorContinuityCapsules(
            state,
            [hermione.id],
            createContextBudgetPlan(
                120000,
                12000,
            ),
        );

    assert.equal(
        capsule.hasMetPlayer,
        true,
    );
    assert.equal(
        capsule.relationshipToPlayer
            .stageEn,
        'friend',
    );
    assert.equal(
        capsule.relationshipToPlayer
            .closeness,
        35,
    );
    assert.equal(
        capsule.relationshipToPlayer
            .tension,
        80,
    );
    assert.deepEqual(
        capsule.knownActorIds,
        [lavender.id],
    );
    assert.deepEqual(
        capsule.sharedMemories
            .map(memory => memory.id),
        ['train_memory'],
    );
    assert.equal(
        JSON.stringify(capsule)
            .includes(
                'This must not enter continuity.',
            ),
        false,
    );
});

test('behavioral environment deterministically turns clock and weather into action constraints', () => {
    const state =
        createSceneTransitionState();
    state.clock =
        '1991-09-02 · 02:20';
    state.map.activeMapId =
        'hogwarts_castle';
    state.map.currentLocalNodeId =
        'great_hall';
    state.scene.mapId =
        'hogwarts_castle';
    state.scene.roomId =
        'great_hall';

    const first =
        buildBehavioralEnvironment(
            state,
        );
    const repeated =
        buildBehavioralEnvironment(
            structuredClone(state),
        );

    assert.deepEqual(
        repeated,
        first,
    );
    assert.equal(
        first.period,
        'deep_night',
    );
    assert.equal(
        first.daylight,
        'dark',
    );
    assert.equal(
        first.curfewActive,
        true,
    );
    assert.equal(
        first.sleepPressure,
        'high',
    );
    assert.equal(
        first.exposure,
        'indoor',
    );
    assert.match(
        first.behavioralConstraintsEn
            .join(' '),
        /asleep|preparing to sleep/iu,
    );
    assert.match(
        first.behavioralConstraintsEn
            .join(' '),
        /remain outside/iu,
    );

    state.map.activeMapId =
        'hogwarts_grounds';
    state.map.currentLocalNodeId =
        'main_courtyard';
    state.scene.mapId =
        'hogwarts_grounds';
    state.scene.roomId =
        'main_courtyard';
    const outdoor =
        buildBehavioralEnvironment(
            state,
        );

    assert.equal(
        outdoor.exposure,
        'outdoor',
    );
    assert.match(
        outdoor.behavioralConstraintsEn
            .join(' '),
        /exposed to/iu,
    );
});

test('structured local observation normalizes material changes', () => {
    const state =
        createSceneTransitionState();
    const mapId =
        state.map.activeMapId;
    const roomId =
        state.map.currentLocalNodeId;
    const evidence = [{
        text:
            'Tina arranged twenty-eight toy bears along the headboard and changed into striped pyjamas.',
        start: 0,
        end: 91,
    }];
    const result =
        normalizeMaterialEvents(
            [
                {
                    type:
                        'object_placed',
                    actorId: 'player',
                    objectText:
                        'twenty-eight toy bears',
                    targetText:
                        'headboard',
                    quantity: 28,
                    mapId,
                    roomId,
                    sceneId:
                        state.scene.id,
                    sourceKinds: [
                        'player',
                        'narrative',
                    ],
                    confidence: 0.96,
                    evidence,
                },
                {
                    type:
                        'outfit_changed',
                    actorId: 'player',
                    valueText:
                        'striped pyjamas',
                    operation: 'set',
                    mapId,
                    roomId,
                    sceneId:
                        state.scene.id,
                    sourceKinds: [
                        'player',
                        'narrative',
                    ],
                    confidence: 0.94,
                    evidence,
                },
            ],
            state,
        );
    const placement = result.find(event =>
        event.type ===
            'object_placed');
    const outfit = result.find(event =>
        event.type ===
            'outfit_changed');

    assert.ok(placement);
    assert.equal(
        placement.quantity,
        28,
    );
    assert.match(
        placement.objectText,
        /toy bears/u,
    );
    assert.match(
        placement.targetText,
        /headboard/u,
    );
    assert.deepEqual(
        placement.sourceKinds,
        [
            'player',
            'narrative',
        ],
    );
    assert.ok(outfit);
    assert.equal(
        outfit.valueText,
        'striped pyjamas',
    );
    assert.deepEqual(
        outfit.sourceKinds,
        [
            'player',
            'narrative',
        ],
    );
    assert.equal(
        result.filter(event =>
            event.type ===
                'object_placed')
            .length,
        1,
    );
});

test('local inventory observation admits only evidenced durable player possessions', () => {
    const state =
        createSceneTransitionState();
    const playerAction =
        '*激动拿起签名，把哈利签过名的羊皮纸带在身上*';
    const projected =
        projectObservedInventoryUpdates(
            [
                {
                    id:
                        'harry_potter_autograph',
                    action:
                        'acquire',
                    labelEn:
                        'Harry Potter Autograph',
                    labelZh:
                        '哈利·波特的签名',
                    detailEn:
                        'Lavender\'s Sorting parchment bearing Harry Potter\'s crooked H autograph.',
                    detailZh:
                        '拉文德的分院笔记羊皮纸，上面留着哈利·波特歪歪扭扭的 H 签名。',
                    importance:
                        'important',
                    custody:
                        'carried',
                    ownerId:
                        'player',
                    sourceKind:
                        'player',
                    evidenceText:
                        '*激动拿起签名，把哈利签过名的羊皮纸带在身上*',
                    confidence:
                        0.96,
                },
                {
                    id:
                        'breakfast_toast',
                    action:
                        'acquire',
                    labelEn:
                        'Toast',
                    labelZh:
                        '烤面包',
                    detailEn:
                        'An ordinary breakfast item.',
                    detailZh:
                        '普通早餐。',
                    importance:
                        'ordinary',
                    custody:
                        'carried',
                    ownerId:
                        'player',
                    sourceKind:
                        'player',
                    evidenceText:
                        '*激动拿起签名，把哈利签过名的羊皮纸带在身上*',
                    confidence:
                        0.99,
                },
            ],
            state,
            playerAction,
            '',
        );
    assert.equal(
        projected.length,
        1,
    );
    assert.deepEqual(
        projected[0],
        {
            id:
                'harry_potter_autograph',
            action:
                'acquire',
            labelEn:
                'Harry Potter Autograph',
            label:
                '哈利·波特的签名',
            detailEn:
                'Lavender\'s Sorting parchment bearing Harry Potter\'s crooked H autograph.',
            detail:
                '拉文德的分院笔记羊皮纸，上面留着哈利·波特歪歪扭扭的 H 签名。',
            importance:
                'important',
            custody:
                'carried',
            ownerId:
                'player',
        },
    );
});

test('legacy signed autograph acquisition migrates into the authoritative inventory once', () => {
    const state =
        createSceneTransitionState();
    state.items = [];
    const chat = [
        {
            is_user: true,
            mes:
                '*激动拿起签名，把哈利签过名的羊皮纸带在身上*',
        },
        {
            is_user: false,
            extra: {
                hogwartsMud: {
                    turnTransaction: {
                        segments: [{
                            type:
                                'narration',
                            textEn:
                                'Tina carried the signed parchment to class, Harry Potter\'s crooked H visible in the ink.',
                        }],
                    },
                },
            },
        },
    ];
    const migration =
        migrateObservedInventoryState(
            state,
            chat,
        );
    assert.equal(
        migration.changed,
        true,
    );
    const autograph =
        migration.state.items
            .find(item =>
                item.id ===
                    'harry_signed_parchment');
    assert.ok(autograph);
    assert.equal(
        autograph.importance,
        'important',
    );
    assert.equal(
        autograph.custody,
        'carried',
    );
    assert.equal(
        autograph.ownerId,
        'player',
    );
    assert.equal(
        migrateObservedInventoryState(
            migration.state,
            chat,
        ).changed,
        false,
    );
});

test('material schema defines complete scene and appearance changes', () => {
    assert.deepEqual(
        MATERIAL_EXTRACTION_SCHEMA
            .场景变化,
        [
            '执行者',
            '变化类型',
            '物品',
            '数量',
            '原位置',
            '目标位置',
            '目标对象',
            '变化结果',
            '持续性',
        ],
    );
    assert.deepEqual(
        MATERIAL_EXTRACTION_SCHEMA
            .外貌变化,
        [
            '人物',
            '变化类型',
            '服装',
            '饰品',
            '发型',
            '外貌状态',
            '手持物',
            '手部',
            '穿戴部位',
            '变化结果',
            '持续性',
        ],
    );
    assert.deepEqual(
        Object.keys(
            MATERIAL_EVENT_DEFINITIONS,
        ),
        [
            'object_placed',
            'object_moved',
            'object_removed',
            'scene_adjusted',
            'scene_damaged',
            'scene_repaired',
            'scene_soiled',
            'scene_cleaned',
            'outfit_changed',
            'accessory_changed',
            'hairstyle_changed',
            'appearance_changed',
            'appearance_cleared',
            'object_held',
            'object_released',
        ],
    );
});

test('complete material event taxonomy reduces to current room and presentation state', () => {
    const state =
        createSceneTransitionState();
    const mapId =
        state.map.activeMapId;
    const roomId =
        state.map.currentLocalNodeId;
    const evidence = [{
        text:
            'A directly observed material change occurs.',
        start: 0,
        end: 43,
    }];
    const event = (
        id,
        type,
        extra = {},
    ) => ({
        id,
        type,
        actorId: 'player',
        mapId,
        roomId,
        sceneId: state.scene.id,
        sourceKinds: ['player'],
        confidence: 1,
        evidence,
        ...extra,
    });
    const events = [
        event(
            'placed',
            'object_placed',
            {
                objectText: 'bear',
                targetText:
                    'headboard',
                persistence:
                    'permanent',
            },
        ),
        event(
            'moved',
            'object_moved',
            {
                objectText: 'bear',
                sourceText:
                    'headboard',
                targetText: 'trunk',
            },
        ),
        event(
            'removed',
            'object_removed',
            {
                objectText: 'bear',
            },
        ),
        event(
            'adjusted',
            'scene_adjusted',
            {
                targetText: 'bed curtains',
                resultText:
                    'The bed curtains are open.',
            },
        ),
        event(
            'damaged',
            'scene_damaged',
            {
                targetText: 'window',
            },
        ),
        event(
            'repaired',
            'scene_repaired',
            {
                targetText: 'window',
            },
        ),
        event(
            'soiled',
            'scene_soiled',
            {
                objectText: 'ink',
                targetText: 'carpet',
                resultText:
                    'Ink stains the carpet.',
            },
        ),
        event(
            'cleaned',
            'scene_cleaned',
            {
                targetText: 'carpet',
            },
        ),
        event(
            'outfit',
            'outfit_changed',
            {
                valueText:
                    'striped pyjamas',
            },
        ),
        event(
            'accessory_add',
            'accessory_changed',
            {
                valueText:
                    'silver necklace',
                slot: 'neck',
            },
        ),
        event(
            'accessory_remove',
            'accessory_changed',
            {
                valueText:
                    'silver necklace',
                operation: 'remove',
                slot: 'neck',
            },
        ),
        event(
            'hair',
            'hairstyle_changed',
            {
                valueText: 'ponytail',
                slot: 'hair',
            },
        ),
        event(
            'condition',
            'appearance_changed',
            {
                valueText:
                    'soaking wet',
            },
        ),
        event(
            'condition_clear',
            'appearance_cleared',
            {
                resultText:
                    'dried off',
            },
        ),
        event(
            'held',
            'object_held',
            {
                objectText: 'wand',
                hand: 'right',
            },
        ),
        event(
            'released',
            'object_released',
            {
                objectText: 'wand',
                hand: 'right',
            },
        ),
    ];
    const normalized =
        normalizeMaterialEvents(
            events,
            state,
        );
    assert.equal(
        normalized.length,
        events.length,
    );
    assert.ok(
        normalized.every(item =>
            item.schemaVersion ===
                MATERIAL_STATE_SCHEMA_VERSION),
    );
    assert.equal(
        normalized.find(item =>
            item.id === 'placed')
            .persistence,
        'until_changed',
    );

    const next =
        applyMaterialEvents(
            state,
            events,
            {
                clock: state.clock,
                turn: 1,
            },
        );
    const current =
        buildCurrentMaterialState(
            next,
        );
    assert.deepEqual(
        current.roomEffects.map(
            effect => effect.type,
        ),
        ['scene_adjusted'],
    );
    assert.equal(
        current.actorPresentations
            .player.outfit,
        'striped pyjamas',
    );
    assert.deepEqual(
        current.actorPresentations
            .player.accessories,
        {},
    );
    assert.equal(
        current.actorPresentations
            .player.hair,
        'ponytail',
    );
    assert.deepEqual(
        current.actorPresentations
            .player.visibleConditions,
        [],
    );
    assert.deepEqual(
        current.actorPresentations
            .player.heldItems,
        {},
    );
    assert.equal(
        current.actorPresentations
            .player.heldObject,
        '',
    );
});

test('legacy actor descriptions split stable appearance from current presentation', () => {
    const legacy =
        'A girl with bushy brown hair and large front teeth, wearing new Hogwarts robes already fastened, surrounded by stacked books on the opposite bench.';
    assert.deepEqual(
        splitActorVisualDescription(
            legacy,
        ),
        {
            physicalDescriptionEn:
                'A girl with bushy brown hair and large front teeth.',
            outfit:
                'new Hogwarts robes already fastened',
            heldObject: '',
        },
    );

    const state =
        createSceneTransitionState();
    const actorId =
        'canon_hermione_jean_granger';
    const actor = {
        id: actorId,
        nameEn:
            'Hermione Jean Granger',
        publicDescriptionEn: legacy,
        present: true,
        mapId:
            state.map.activeMapId,
        roomId:
            state.map.currentLocalNodeId,
    };
    state.actors = [actor];
    state.actorLibrary = [{
        ...actor,
        publicBackgroundEn:
            'A first-year student.',
    }];
    state.actorPresentations = {};
    state.actorPresentationVersion = 0;
    const migration =
        migrateActorPresentationState(
            state,
        );
    const migratedActor =
        migration.state.actors[0];
    const migratedProfile =
        migration.state
            .actorLibrary[0];
    const view =
        buildActorAppearanceView(
            migration.state,
            actorId,
        );

    assert.equal(
        migration.changed,
        true,
    );
    assert.equal(
        migratedActor
            .physicalDescriptionEn,
        'A girl with bushy brown hair and large front teeth.',
    );
    assert.equal(
        migratedProfile
            .publicDescriptionEn,
        'A girl with bushy brown hair and large front teeth.',
    );
    assert.equal(
        view.presentation.outfit,
        'new Hogwarts robes already fastened',
    );
    assert.equal(
        JSON.stringify(view)
            .includes(
                'stacked books',
            ),
        false,
    );
    assert.equal(
        migrateActorPresentationState(
            migration.state,
        ).changed,
        false,
    );
});

test('material events persist presentation and only project effects for the current room', () => {
    const state =
        createSceneTransitionState();
    const mapId =
        state.map.activeMapId;
    const roomId =
        state.map.currentLocalNodeId;
    const evidence = [{
        text:
            'Tina places twenty-eight bears on the headboard and changes into striped pyjamas.',
        start: 0,
        end: 84,
    }];
    const events = [
        {
            id: 'material_bears',
            type:
                'object_placed',
            actorId: 'player',
            objectText:
                'twenty-eight bears',
            targetText:
                'headboard',
            quantity: 28,
            mapId,
            roomId,
            sourceKinds: [
                'player',
                'narrative',
            ],
            confidence: 1,
            evidence,
        },
        {
            id: 'material_outfit',
            type:
                'outfit_changed',
            actorId: 'player',
            valueText:
                'striped pyjamas',
            mapId,
            roomId,
            sourceKinds: [
                'player',
            ],
            confidence: 1,
            evidence,
        },
        {
            id: 'wrong_room',
            type:
                'scene_adjusted',
            targetText:
                'another bed',
            mapId,
            roomId: 'back_garden',
            sourceKinds: [
                'narrative',
            ],
            confidence: 1,
            evidence,
        },
    ];
    assert.equal(
        normalizeMaterialEvents(
            events,
            state,
        ).length,
        2,
    );

    const next =
        applyMaterialEvents(
            state,
            events,
            {
                clock: state.clock,
                turn: 1,
            },
        );
    const current =
        buildCurrentMaterialState(
            next,
        );
    assert.equal(
        next.actorPresentations
            .player.outfit,
        'striped pyjamas',
    );
    assert.equal(
        current.roomEffects.length,
        1,
    );
    assert.equal(
        current.roomEffects[0]
            .quantity,
        28,
    );
    assert.equal(
        buildMandatorySceneState(
            next,
        ).currentMaterialState
            .roomEffects.length,
        1,
    );

    next.map.currentLocalNodeId =
        'back_garden';
    const elsewhere =
        buildCurrentMaterialState(
            next,
        );
    assert.deepEqual(
        elsewhere.roomEffects,
        [],
    );
    assert.equal(
        elsewhere
            .actorPresentations
            .player.outfit,
        'striped pyjamas',
    );

    const committed =
        applyTurnTransaction(
            state,
            {
                protocolVersion:
                    NARRATIVE_TURN_PROTOCOL_VERSION,
                elapsedMinutes: 15,
                publicEventEn:
                    'Tina arranges her bed and changes for sleep.',
                eventEnded: false,
                segments: [{
                    type:
                        'narration',
                    textEn:
                        'Tina places the bears on the headboard and changes into striped pyjamas.',
                }],
                actorPresence: {
                    presentActorIdsAfterTurn:
                        state.actors
                            .filter(actor =>
                                actor
                                    .present !==
                                false)
                            .map(actor =>
                                actor.id),
                },
                actorUpdates: [],
                temporaryActorEntrances:
                    [],
                itemUpdates: [],
                revealedClues: [],
                materialEvents:
                    events.slice(0, 2),
            },
            'I arrange my bed.',
        );
    assert.equal(
        committed.actorPresentations
            .player.outfit,
        'striped pyjamas',
    );
    assert.equal(
        committed.map.roomStates[
            `${mapId}:${roomId}`
        ].materialEffects[0]
            .quantity,
        28,
    );
});

test('local transformer embeddings enforce a bounded sequence length', () => {
    assert.equal(
        TRANSFORMERS_EMBEDDING_MAX_TOKENS,
        512,
    );
});

test('narrative-first turn settlement accepts segments without the metadata customs form', async () => {
    const state =
        createSceneTransitionState();
    const payload = {
        segments: [
            {
                type: 'narration',
                textEn:
                    'McGonagall folds the reply slip and sets it beside the cooling teapot.',
            },
            {
                type: 'dialogue',
                actorId:
                    'minerva_mcgonagall',
                textEn:
                    'That will do, Miss Zhang.',
            },
        ],
    };
    const settled =
        await runTurnSettlementGraph({
            payload,
            worldState: state,
            playerAction:
                'I watch McGonagall.',
            admittedActors: [],
            movementResolution: null,
            momentumDirective: null,
            checkResolution: null,
        });

    assert.equal(
        settled.protocolVersion,
        NARRATIVE_TURN_PROTOCOL_VERSION,
    );
    assert.match(
        settled.publicEventEn,
        /McGonagall folds the reply slip/iu,
    );
    assert.equal(
        settled.eventEnded,
        false,
    );
    assert.equal(
        settled.checkApplied,
        false,
    );
    assert.deepEqual(
        new Set(
            settled.actorPresence
                .presentActorIdsAfterTurn,
        ),
        new Set(
            state.actors
                .filter(actor =>
                    actor.present !==
                        false)
                .map(actor =>
                    actor.id),
        ),
    );
    assert.deepEqual(
        validateScenePerformance(
            settled,
            state,
            {
                elapsedMinutes: 15,
            },
        ),
        {
            valid: true,
            errors: [],
        },
    );
});

test('narrative-first settlement folds sparse exits and drops invalid proposals without losing prose', async () => {
    const state =
        createSceneTransitionState();
    const payload = {
        segments: [{
            type: 'narration',
            textEn:
                'McGonagall leaves the kitchen while Tina remains beside the table.',
        }],
        stateProposals: [
            {
                type: 'actor_exit',
                actorId:
                    'minerva_mcgonagall',
                currentActivityEn:
                    'Walking into the back garden with the reply slip.',
                mapId: 'zhang_home',
                roomId: 'back_garden',
            },
            {
                type: 'actor_move',
                actorId:
                    'tina_mother',
                mapId:
                    'nonexistent_map',
                roomId:
                    'nonexistent_room',
                currentActivityEn:
                    'Teleporting somewhere impossible.',
            },
            {
                type:
                    'unknown_future_type',
            },
        ],
    };
    const settled =
        await runTurnSettlementGraph({
            payload,
            worldState: state,
            playerAction:
                'I remain beside the table.',
            admittedActors: [],
        });

    assert.equal(
        settled.segments[0].textEn,
        payload.segments[0].textEn,
    );
    assert.equal(
        settled.actorPresence
            .presentActorIdsAfterTurn
            .includes(
                'minerva_mcgonagall',
            ),
        false,
    );
    const mcgonagall =
        settled.actorUpdates
            .find(update =>
                update.id ===
                    'minerva_mcgonagall');
    assert.equal(
        mcgonagall.present,
        false,
    );
    assert.equal(
        mcgonagall.roomId,
        'back_garden',
    );
    const mother =
        settled.actorUpdates
            .find(update =>
                update.id ===
                    'tina_mother');
    assert.equal(
        mother?.mapId,
        'zhang_home',
    );
    assert.equal(
        mother?.roomId,
        'kitchen',
    );
    assert.ok(
        settled.settlementWarnings
            .some(warning =>
                warning.code ===
                    'invalid_actor_move_proposal'),
    );
    assert.ok(
        settled.settlementWarnings
            .some(warning =>
                warning.code ===
                    'unknown_state_proposal'),
    );
});

test('local narrative-first reducer matches the LangGraph settlement output', async () => {
    const state =
        createSceneTransitionState();
    const input = {
        payload: {
            segments: [{
                type: 'narration',
                textEn:
                    'The kitchen clock ticks while the discussion continues.',
            }],
            signals: {
                eventEnded: true,
            },
        },
        worldState: state,
        playerAction:
            'I continue listening.',
        admittedActors: [],
        movementResolution: null,
        momentumDirective: null,
        checkResolution: null,
    };
    const graph =
        await runTurnSettlementGraph(
            input,
        );
    const local =
        settleNarrativeTurnPerformance(
            input.payload,
            state,
            {
                playerAction:
                    input.playerAction,
                admittedActors: [],
            },
        );

    assert.deepEqual(
        graph,
        local,
    );
    assert.equal(
        graph.eventEnded,
        true,
    );
});

test('scene transition duration is not locally capped', () => {
    const state =
        createSceneTransitionState();
    state.clock =
        '1991-07-24 · 02:50';
    const source =
        createSceneTransitionPackage(
            'kitchen',
        );
    delete source.nextClock;

    const oldMaximum =
        normalizeSceneTransitionPackage({
            ...structuredClone(
                source,
            ),
            transitionMinutes: 180,
        }, state);
    assert.equal(
        oldMaximum.nextClock,
        '1991-07-24 · 05:50',
    );
    assert.equal(
        validateSceneTransitionPackage(
            oldMaximum,
            state,
            {
                expectedMapId:
                    'zhang_home',
                expectedRoomId:
                    'kitchen',
            },
        ).valid,
        true,
    );

    const overnight =
        normalizeSceneTransitionPackage({
            ...structuredClone(
                source,
            ),
            transitionMinutes: 280,
        }, state);
    assert.equal(
        overnight.nextClock,
        '1991-07-24 · 07:30',
    );
    assert.equal(
        validateSceneTransitionPackage(
            overnight,
            state,
            {
                expectedMapId:
                    'zhang_home',
                expectedRoomId:
                    'kitchen',
            },
        ).valid,
        true,
    );

    const longSkip =
        normalizeSceneTransitionPackage({
            ...structuredClone(
                source,
            ),
            transitionMinutes:
                20000,
        }, state);
    assert.equal(
        longSkip.transitionMinutes,
        20000,
    );
});

test('scene transition validation locks an explicit player destination', () => {
    const state = createSceneTransitionState();
    const valid = validateSceneTransitionPackage(
        createSceneTransitionPackage(),
        state,
        {
            expectedMapId: 'zhang_home',
            expectedRoomId: 'back_garden',
        },
    );
    assert.deepEqual(valid, { valid: true, errors: [] });

    const wrongRoom = validateSceneTransitionPackage(
        createSceneTransitionPackage('kitchen'),
        state,
        {
            expectedMapId: 'zhang_home',
            expectedRoomId: 'back_garden',
        },
    );
    assert.equal(wrongRoom.valid, false);
    assert.match(wrongRoom.errors.join('；'), /back_garden/);

    const shortQuill =
        createSceneTransitionPackage();
    shortQuill.authorQuillEn =
        'Tina did very well and everyone laughed.';
    const invalidQuill =
        validateSceneTransitionPackage(
            shortQuill,
            state,
        );
    assert.equal(invalidQuill.valid, false);
    assert.match(
        invalidQuill.errors.join('；'),
        /作者的羽毛笔/,
    );

    const missingHook =
        createSceneTransitionPackage();
    delete missingHook.nextScene
        .explorationHookEn;
    const invalidHook =
        validateSceneTransitionPackage(
            missingHook,
            state,
        );
    assert.equal(invalidHook.valid, false);
    assert.match(
        invalidHook.errors.join('；'),
        /explorationHookEn/,
    );

    const unrepresentedActor =
        createSceneTransitionPackage();
    unrepresentedActor.nextScene.actorStates
        .push({
            id: 'tina_mother',
            present: true,
            currentActivityEn:
                'Standing silently by the garden door.',
            lifeStatus: 'alive',
            lifeStatusPermanent: false,
            lifeStatusDetailEn:
                'Alive and unharmed.',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        });
    const invisiblePresence =
        validateSceneTransitionPackage(
            unrepresentedActor,
            state,
        );
    assert.equal(
        invisiblePresence.valid,
        true,
    );
    const locallyRepresented =
        normalizeSceneTransitionPackage(
            unrepresentedActor,
            state,
        );
    assert.equal(
        validateSceneTransitionPackage(
            locallyRepresented,
            state,
        ).valid,
        true,
    );
    assert.doesNotMatch(
        locallyRepresented.nextScene
            .openingSegments
            .map(segment => segment.textEn)
            .join(' '),
        /Mei Zhang/,
    );

    assert.deepEqual(
        stripSyntheticSceneOpeningActorSegments([
            {
                type: 'narration',
                textEn:
                    'The Charms Classroom fills with first-years.',
            },
            {
                type: 'narration',
                textEn:
                    'Hermione Jean Granger remains visible in the scene, seated with her book open.',
            },
        ]),
        [{
            type: 'narration',
            textEn:
                'The Charms Classroom fills with first-years.',
        }],
    );

    const missingRelationships =
        createSceneTransitionPackage();
    delete missingRelationships
        .relationshipUpdates;
    const locallySettled =
        normalizeSceneTransitionPackage(
            missingRelationships,
            state,
        );
    assert.ok(
        locallySettled.relationshipUpdates
            .length > 0,
    );
    assert.equal(
        validateSceneTransitionPackage(
            locallySettled,
            state,
        ).valid,
        true,
    );
});

test('compact scene-seal core normalizes into a valid transition without optional prose or enrichments', () => {
    const state =
        createSceneTransitionState();
    const core =
        createSceneTransitionPackage();
    delete core.worldChanges;
    delete core.socialStatements;
    delete core
        .socialRelationshipEvidence;
    delete core.nextScene
        .openingSegments;

    const normalized =
        normalizeSceneTransitionPackage(
            core,
            state,
            {
                tier: 'medium',
                deferWorldChanges:
                    true,
            },
        );
    assert.deepEqual(
        normalized.worldChanges,
        {
            prophetBriefs: [],
            gossipUpdates: [],
        },
    );
    assert.equal(
        normalized.nextScene
            .openingSegments.length >=
            2,
        true,
    );
    assert.equal(
        normalized.nextScene
            .openingSegments.some(
                segment =>
                    segment.type ===
                    'narration',
            ),
        true,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
            {
                tier: 'medium',
                deferWorldChanges:
                    true,
            },
        ).valid,
        true,
    );
});

test('scene transition fallback memories cap the final English word count', () => {
    const state = createSceneTransitionState();
    const payload =
        createSceneTransitionPackage();
    delete payload.relationshipUpdates;
    payload.closureSummaryEn =
        Array.from(
            { length: 80 },
            (_, index) =>
                `observable${index}`,
        ).join(' ');

    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
        );
    const memoryWordCounts =
        normalized.relationshipUpdates
            .map(update =>
                update.sceneMemoryEn
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .length);

    assert.ok(memoryWordCounts.length > 0);
    assert.equal(
        memoryWordCounts.every(count =>
            count >= 8 && count <= 32),
        true,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
        ).valid,
        true,
    );
});

test('scene transitions capture but never overwrite a new actor first impression', () => {
    const state =
        createSceneTransitionState();
    const archivist =
        state.actorLibrary.find(actor =>
            actor.id ===
                'old_archivist');
    delete archivist
        .firstImpressionOfPlayerEn;
    const payload =
        createSceneTransitionPackage();
    payload.nextScene.actorStates.push({
        id: 'old_archivist',
        present: true,
        currentActivityEn:
            'Standing beside the dry patch in the Back Garden.',
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn:
            'Alive and unharmed.',
        mapId: 'zhang_home',
        roomId: 'back_garden',
    });
    payload.nextScene.openingSegments[0]
        .textEn +=
        ' Miriam Strout stands beside the dry patch.';

    assert.match(
        validateSceneTransitionPackage(
            payload,
            state,
        ).errors.join('；'),
        /初见印象/,
    );
    payload.nextScene.actorStates[1]
        .firstImpressionOfPlayerEn =
        'A carefully dressed Chinese child whose stillness looks more watchful than shy.';
    assert.deepEqual(
        validateSceneTransitionPackage(
            payload,
            state,
        ),
        { valid: true, errors: [] },
    );
    const committed =
        applySceneTransition(
            state,
            payload,
            {
                id: state.scene.id,
                startedClock:
                    state.scene.startedClock,
                endedClock:
                    state.clock,
                closureSummary:
                    payload.closureSummaryEn,
            },
        );
    const committedArchivist =
        committed.actorLibrary.find(
            actor =>
                actor.id ===
                    'old_archivist',
        );
    assert.equal(
        committedArchivist
            .firstImpressionOfPlayerEn,
        payload.nextScene.actorStates[1]
            .firstImpressionOfPlayerEn,
    );
    const overwrite =
        structuredClone(payload);
    overwrite.nextScene.id =
        'another_new_scene';
    overwrite.nextScene.actorStates[1]
        .firstImpressionOfPlayerEn =
        'A different first impression that must not replace the original.';
    assert.match(
        validateSceneTransitionPackage(
            overwrite,
            committed,
        ).errors.join('；'),
        /不得覆盖/,
    );
});

test('scene transition checkpoints settle a pending first impression for an actor who was already present', () => {
    const state =
        createSceneTransitionState();
    const profile =
        state.actorLibrary.find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    const actor =
        state.actors.find(item =>
            item.id ===
                'minerva_mcgonagall');
    delete profile
        .firstImpressionOfPlayerEn;
    profile.firstImpressionPending =
        true;
    delete actor
        .firstImpressionOfPlayerEn;
    actor.firstImpressionPending =
        true;

    const payload =
        createSceneTransitionPackage();
    payload.nextScene.actorStates[0]
        .roomId = 'back_garden';
    delete payload.nextScene
        .actorStates[0]
        .firstImpressionOfPlayerEn;

    assert.match(
        validateSceneTransitionPackage(
            payload,
            state,
        ).errors.join('；'),
        /初见印象/,
    );

    payload.nextScene.actorStates[0]
        .firstImpressionOfPlayerEn =
        'A lake-drenched first-year girl with dark hair and bright blue eyes who studies every stone arch as though comparing the castle against a private property checklist.';
    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
        );
    const normalizedFirstImpression =
        normalized.nextScene.actorStates[0]
            .firstImpressionOfPlayerEn;
    assert.equal(
        normalizedFirstImpression
            .split(/\s+/)
            .filter(Boolean)
            .length,
        24,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
        ).valid,
        true,
    );

    payload.nextScene.actorStates[0]
        .firstImpressionOfPlayerEn =
        'A small, striking girl whose bright eyes make every new rule look negotiable.';
    assert.deepEqual(
        validateSceneTransitionPackage(
            payload,
            state,
        ),
        { valid: true, errors: [] },
    );

    const committed =
        applySceneTransition(
            state,
            payload,
            {
                id: state.scene.id,
                startedClock:
                    state.scene.startedClock,
                endedClock:
                    state.clock,
                closureSummary:
                    payload
                        .closureSummaryEn,
            },
        );
    const settled =
        committed.actorLibrary.find(
            item =>
                item.id ===
                    'minerva_mcgonagall',
        );
    assert.equal(
        settled
            .firstImpressionOfPlayerEn,
        payload.nextScene.actorStates[0]
            .firstImpressionOfPlayerEn,
    );
    assert.equal(
        settled.firstImpressionPending,
        false,
    );
});

test('scene transition normalization never hides a wrong model destination', () => {
    const state = createSceneTransitionState();
    const payload = createSceneTransitionPackage();
    const normalized = normalizeSceneTransitionPackage(payload, state);
    const expected = {
        mapId: 'diagon_alley',
        roomId: 'leaky_cauldron',
    };

    assert.equal(normalized.nextScene.mapId, 'zhang_home');
    assert.equal(normalized.nextScene.roomId, 'back_garden');
    const validation = validateSceneTransitionPackage(normalized, state, {
        expectedMapId: expected.mapId,
        expectedRoomId: expected.roomId,
        requireDestinationGrounding: true,
    });
    assert.equal(validation.valid, false);
    assert.match(validation.errors.join('；'), /diagon_alley/);
    assert.match(validation.errors.join('；'), /leaky_cauldron/);
});

test('unbound transition normalization resolves a known room on its authoritative map', () => {
    const state = createSceneTransitionState();
    const profile =
        state.actorLibrary.find(actor =>
            actor.id ===
            'minerva_mcgonagall');
    profile.firstImpressionOfPlayerEn =
        'A visibly wilful child who treats every boundary as negotiable.';
    const payload =
        createSceneTransitionPackage();
    payload.nextScene.mapId =
        'hogwarts_grounds';
    payload.nextScene.roomId =
        'hogsmeade_station';
    payload.nextScene.nameEn =
        'Arrival at Hogsmeade Station';
    payload.nextScene.summaryEn =
        'The Hogwarts Express has stopped at Hogsmeade Station and the first-years are gathering on the platform.';
    payload.nextScene.explorationHookEn =
        'At Hogsmeade Station, a lantern-bearing figure is calling for first-years beside a narrow path into the dark.';
    payload.nextScene.actorStates[0] = {
        ...payload.nextScene
            .actorStates[0],
        mapId: 'hogwarts_grounds',
        roomId: 'hogsmeade_station',
        currentActivityEn:
            'Waiting with the first-years at Hogsmeade Station.',
        firstImpressionOfPlayerEn:
            'This duplicate must not overwrite committed history.',
    };
    payload.nextScene.openingSegments[0]
        .textEn =
        'Steam drifts across Hogsmeade Station as the first-years step down onto the dark platform.';
    payload.nextScene.followingSceneIntent = {
        titleEn: 'Across the Black Lake',
        summaryEn:
            'Follow the first-years from the station toward the boats.',
        triggerEn:
            'When the player follows the lantern-bearing guide.',
        mapId: 'hogwarts_grounds',
        roomId: 'great_lake_dock',
        tier: 'medium',
    };

    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
            {
                tier: 'medium',
                repairUnboundDestination:
                    true,
                destinationHint:
                    'Arrive at Hogwarts for the Sorting.',
            },
        );
    assert.equal(
        normalized.nextScene.mapId,
        'hogsmeade',
    );
    assert.equal(
        normalized.nextScene.roomId,
        'hogsmeade_station',
    );
    assert.equal(
        normalized.nextScene
            .actorStates[0].mapId,
        'hogsmeade',
    );
    assert.equal(
        normalized.nextScene
            .actorStates[0]
            .firstImpressionOfPlayerEn,
        undefined,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );
});

test('scene transition normalization repairs invalid actor and following rooms', () => {
    const state = createSceneTransitionState();
    const payload = createSceneTransitionPackage();
    payload.nextScene.actorStates[0].roomId = 'invented_balcony';
    payload.nextScene.actorStates[0].currentActivityEn = 'Waiting nearby.';
    payload.nextScene.followingSceneIntent.mapId = 'invented_map';
    payload.nextScene.followingSceneIntent.roomId = 'invented_room';
    payload.nextScene.followingSceneIntent.titleEn = 'An Unmapped Errand';
    payload.nextScene.followingSceneIntent.summaryEn = 'Continue somewhere invented.';

    const normalized = normalizeSceneTransitionPackage(payload, state);

    assert.equal(
        normalized.nextScene.actorStates[0].roomId,
        'back_garden',
    );
    assert.equal(
        normalized.nextScene.followingSceneIntent.mapId,
        'zhang_home',
    );
    assert.equal(
        normalized.nextScene.followingSceneIntent.roomId,
        'back_garden',
    );
    assert.equal(
        validateSceneTransitionPackage(normalized, state).valid,
        true,
    );
});

test('scene transition grounding validates structured destination without parsing prose', () => {
    const state = createSceneTransitionState();
    const destination = {
        mapId: 'diagon_alley',
        roomId: 'leaky_cauldron',
    };
    const authority = getSceneDestinationAuthority(state, destination);
    assert.equal(authority.roomNameEn, 'Leaky Cauldron');

    const payload = createSceneTransitionPackage();
    payload.nextScene.id = 'leaky_cauldron_arrival';
    payload.nextScene.mapId = destination.mapId;
    payload.nextScene.roomId = destination.roomId;
    payload.nextScene.nameEn = 'Arrival at the Leaky Cauldron';
    payload.nextScene.summaryEn =
        'The family reaches the Leaky Cauldron with the school list in hand.';
    payload.nextScene.explorationHookEn =
        'Inside the Leaky Cauldron, a brass room key keeps turning toward a sealed upstairs landing whenever nobody touches it.';
    payload.nextScene.actorStates[0].mapId = destination.mapId;
    payload.nextScene.actorStates[0].roomId = destination.roomId;
    payload.nextScene.actorStates[0].currentActivityEn =
        'Waiting beside a table in the Leaky Cauldron.';
    payload.nextScene.openingSegments[0].textEn =
        'The Leaky Cauldron is dim even at noon, and every chair seems to know it.';
    payload.nextScene.followingSceneIntent.mapId = destination.mapId;
    payload.nextScene.followingSceneIntent.roomId = destination.roomId;

    assert.deepEqual(
        validateSceneDestinationGrounding(payload, state, destination),
        { valid: true, errors: [] },
    );
    assert.equal(
        validateSceneTransitionPackage(payload, state, {
            expectedMapId: destination.mapId,
            expectedRoomId: destination.roomId,
            requireDestinationGrounding: true,
        }).valid,
        true,
    );

    payload.nextScene.summaryEn =
        'Tina returns to the back garden while the owl waits on the fence.';
    payload.nextScene.openingSegments[0].textEn =
        'Wet grass clings to her socks beside the garden fence.';
    const stale = validateSceneDestinationGrounding(
        payload,
        state,
        destination,
    );
    assert.deepEqual(
        stale,
        { valid: true, errors: [] },
    );

    payload.nextScene.roomId =
        'gringotts_steps';
    const wrongStructuredRoom =
        validateSceneDestinationGrounding(
            payload,
            state,
            destination,
        );
    assert.equal(
        wrongStructuredRoom.valid,
        false,
    );
    assert.match(
        wrongStructuredRoom.errors
            .join('；'),
        /leaky_cauldron/,
    );
});

test('scene transition treats prose location mentions as non-authoritative', () => {
    const state =
        createSceneTransitionState();
    const destination = {
        mapId: 'hogwarts_castle',
        roomId: 'entrance_hall',
    };
    const payload =
        createSceneTransitionPackage();
    payload.nextScene.id =
        'hogwarts_entrance_hall_arrival';
    payload.nextScene.mapId =
        destination.mapId;
    payload.nextScene.roomId =
        destination.roomId;
    payload.nextScene.nameEn =
        'Hogwarts Castle — Entrance Hall';
    payload.nextScene.summaryEn =
        'The first-years stand in the Entrance Hall beside the marble staircase; McGonagall will lead them into the Great Hall for the Sorting.';
    payload.nextScene.explorationHookEn =
        'In the Entrance Hall, a suit of armour keeps turning its helmet toward the closed doors and may be inspected or ignored.';
    payload.nextScene.actorStates[0]
        .mapId = destination.mapId;
    payload.nextScene.actorStates[0]
        .roomId = destination.roomId;
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Waiting beside the closed doors, staring at the marble staircase with parchment in hand.';
    payload.nextScene.openingSegments[0]
        .textEn =
        'Entrance Hall: torchlight reaches the marble staircase and the closed doors to the Great Hall.';
    payload.nextScene.followingSceneIntent
        .mapId = destination.mapId;
    payload.nextScene.followingSceneIntent
        .roomId = destination.roomId;

    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            {
                expectedMapId:
                    destination.mapId,
                expectedRoomId:
                    destination.roomId,
                requireDestinationGrounding:
                    true,
            },
        ).valid,
        true,
    );

    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Standing in the Great Hall beside the staff table.';
    const proseOnlyMismatch =
        validateSceneTransitionPackage(
            payload,
            state,
        );
    assert.deepEqual(
        proseOnlyMismatch,
        { valid: true, errors: [] },
    );
});

test('scene transition rejects a structured room ID that differs from destination authority', () => {
    const state = createKingsCrossState();
    const payload =
        createSceneTransitionPackage();
    payload.nextScene.id =
        'kings_cross_barrier_arrival';
    payload.nextScene.mapId =
        'kings_cross';
    payload.nextScene.roomId =
        'hogwarts_express';
    payload.nextScene.nameEn =
        'The Hogwarts Express';
    payload.nextScene.summaryEn =
        'The Hogwarts Express waits beyond the barrier between Platforms Nine and Ten, which Tina has not crossed.';
    payload.nextScene.actorStates[0].mapId =
        'kings_cross';
    payload.nextScene.actorStates[0].roomId =
        'hogwarts_express';
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Waiting aboard the Hogwarts Express.';
    payload.nextScene.openingSegments[0]
        .textEn =
        'Hogwarts Express: Tina and Alex stand before the brick barrier between Platforms Nine and Ten while Minerva McGonagall waits beside them.';
    payload.nextScene.followingSceneIntent
        .mapId = 'kings_cross';
    payload.nextScene.followingSceneIntent
        .roomId =
        'platform_nine_three_quarters';

    const invalid =
        validateSceneTransitionPackage(
            payload,
            state,
            {
                expectedMapId:
                    'kings_cross',
                expectedRoomId:
                    'platform_barrier',
                requireDestinationGrounding:
                    true,
            },
        );
    assert.equal(invalid.valid, false);
    assert.match(
        invalid.errors.join('；'),
        /platform_barrier/,
    );

    payload.nextScene.roomId =
        'platform_barrier';
    payload.nextScene.actorStates[0].roomId =
        'platform_barrier';
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Waiting at the barrier between Platforms Nine and Ten.';
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            {
                expectedMapId:
                    'kings_cross',
                expectedRoomId:
                    'platform_barrier',
                requireDestinationGrounding:
                    true,
            },
        ).valid,
        true,
    );
});

test('scene transition commits an absolute nextClock across a deliberate calendar jump', () => {
    const state = createSceneTransitionState();
    const payload =
        createSceneTransitionPackage();
    payload.nextClock =
        '1991-09-01 · 10:30';
    payload.nextScene.temporalFactsEn = [
        'The current date is 1 September 1991.',
        'The train departs at eleven.',
    ];
    payload.worldChanges = {
        prophetBriefs: [{
            id: 'ministry_owl_post_delays',
            headlineEn:
                'Owl Post Delays Blamed on Rain',
            briefEn:
                'Ministry clerks reported scattered delivery delays across southern Britain after persistent rain disrupted several established owl routes.',
            category: 'ministry',
            happenedClock:
                '1991-08-14 · 09:00',
        }],
        gossipUpdates: [{
            id: 'tina_garden_owl_gossip',
            action: 'create',
            originEventEn:
                'McGonagall watched Tina turn the enrollment morning into a loud practical ordeal before the waiting owl.',
            truthCoreEn:
                'Tina tested every adult boundary but completed the required Hogwarts enrollment paperwork under McGonagall supervision.',
            versionEn:
                'McGonagall personally wrestled an impossible new student through enrollment while an owl refused to leave.',
            sourceActorIds: [
                'minerva_mcgonagall',
            ],
            audienceActorIds: [
                'old_archivist',
            ],
            channel: 'staff',
            targetGroupEn:
                'Hogwarts staff acquaintances',
            distortionLevel: 1,
        }],
    };
    const next = applySceneTransition(
        state,
        payload,
        {
            id: state.scene.id,
            startedClock:
                state.scene.startedClock,
            endedClock: state.clock,
            status: 'closed',
        },
        {
            tier: 'medium',
        },
    );

    assert.equal(
        next.clock,
        '1991-09-01 · 10:30',
    );
    assert.equal(
        next.scene.startedClock,
        '1991-09-01 · 10:30',
    );
    assert.deepEqual(
        next.scene.temporalFactsEn,
        payload.nextScene
            .temporalFactsEn,
    );
    assert.equal(
        next.worldNews[0].id,
        'ministry_owl_post_delays',
    );
    assert.equal(
        next.worldChangeLog[0]
            .elapsedDays,
        38,
    );
    assert.equal(
        next.gossipPacks[0]
            .versions[0]
            .distortionLevel,
        1,
    );
    assert.equal(
        getActorKnownRumors(
            next,
            'minerva_mcgonagall',
        )[0].distortionLevel,
        0,
    );
    assert.equal(
        getActorKnownRumors(
            next,
            'old_archivist',
        )[0].versionEn,
        payload.worldChanges
            .gossipUpdates[0]
            .versionEn,
    );
});

test('short scene transitions reject inter-scene world changes', () => {
    const state = createSceneTransitionState();
    const payload =
        createSceneTransitionPackage();
    payload.worldChanges.prophetBriefs = [{
        id: 'premature_news',
        headlineEn:
            'A Premature Newspaper Aside',
        briefEn:
            'This otherwise valid brief must not exist during an ordinary same-day scene transition.',
        category: 'local',
        happenedClock:
            '1991-07-24 · 11:15',
    }];

    const validation =
        validateSceneTransitionPackage(
            payload,
            state,
        );
    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join('；'),
        /不足 7 天/,
    );

    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        );
    assert.deepEqual(
        normalized.worldChanges,
        {
            prophetBriefs: [],
            gossipUpdates: [],
        },
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );
});

test('long scene transitions may defer world changes and social consolidation after the core commit', () => {
    const state =
        createSceneTransitionState();
    state.memoryDirector = {
        status: 'ready',
        error: '',
        lastReviewedTurn: 4,
        triggerMode:
            'event_boundary',
        minimumReviewTurns: 10,
        pendingEventBoundary: null,
    };
    const payload =
        createSceneTransitionPackage();
    payload.nextClock =
        '1991-09-01 · 10:30';
    payload.worldChanges = {
        prophetBriefs: [],
        gossipUpdates: [],
    };

    assert.equal(
        WORLD_CHANGE_MIN_DAYS,
        7,
    );
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            {
                tier: 'medium',
            },
        ).valid,
        false,
    );
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            {
                tier: 'medium',
                deferWorldChanges: true,
            },
        ).valid,
        true,
    );

    const committed =
        applySceneTransition(
            state,
            payload,
            {
                id: state.scene.id,
                status: 'closed',
            },
            {
                tier: 'medium',
                deferWorldChanges: true,
                deferSocialConsolidation:
                    true,
            },
        );
    assert.equal(
        committed.sceneEnrichment
            .worldChanges.status,
        'pending',
    );
    assert.equal(
        committed.memoryDirector
            .lastReviewedTurn,
        4,
    );
    assert.equal(
        committed.worldChangeLog
            ?.length || 0,
        0,
    );

    const changes = {
        prophetBriefs: [{
            id:
                'deferred_owl_post_news',
            headlineEn:
                'Rain Delays Southern Owl Post',
            briefEn:
                'Postal officials reported delayed deliveries after persistent rain pushed several established owl routes away from familiar landmarks.',
            category: 'britain',
            happenedClock:
                '1991-08-15 · 12:00',
        }],
        gossipUpdates: [{
            id:
                'deferred_tina_enrollment_gossip',
            action: 'create',
            originEventEn:
                'McGonagall watched Tina test every boundary before completing her Hogwarts enrollment paperwork.',
            truthCoreEn:
                'Tina caused a difficult enrollment morning but completed every required form under supervision.',
            versionEn:
                'McGonagall spent an entire morning chasing one impossible new student through enrollment.',
            sourceActorIds: [
                'minerva_mcgonagall',
            ],
            audienceActorIds: [
                'old_archivist',
            ],
            channel: 'staff',
            targetGroupEn:
                'Retired staff acquaintances',
            distortionLevel: 1,
        }],
    };
    assert.deepEqual(
        validateTransitionWorldChanges(
            changes,
            state,
            payload.nextClock,
        ),
        [],
    );
    const enriched =
        structuredClone(committed);
    const entry =
        applyTransitionWorldChanges(
            enriched,
            state,
            {
                nextClock:
                    payload.nextClock,
                worldChanges: changes,
            },
        );
    assert.equal(
        entry.elapsedDays >= 7,
        true,
    );
    assert.equal(
        enriched.worldNews.at(-1)
            .id,
        'deferred_owl_post_news',
    );
});

test('long transitions propagate known gossip one distortion step and later let it fade', () => {
    const initial =
        createSceneTransitionState();
    const first =
        createSceneTransitionPackage();
    first.nextClock =
        '1991-09-01 · 10:30';
    first.worldChanges = {
        prophetBriefs: [{
            id: 'first_long_skip_news',
            headlineEn:
                'Rain Troubles Southern Owl Routes',
            briefEn:
                'Postal officials recorded repeated delays after wet weather pushed several owl routes away from their usual landmarks.',
            category: 'britain',
            happenedClock:
                '1991-08-15 · 12:00',
        }],
        gossipUpdates: [{
            id: 'staff_room_tina_story',
            action: 'create',
            originEventEn:
                'McGonagall witnessed Tina loudly test every adult boundary during the enrollment morning before completing the paperwork.',
            truthCoreEn:
                'Tina caused a difficult enrollment morning but ultimately completed every required step under direct adult supervision.',
            versionEn:
                'McGonagall spent an entire morning chasing one impossible first-year through a routine enrollment visit.',
            sourceActorIds: [
                'minerva_mcgonagall',
            ],
            audienceActorIds: [
                'old_archivist',
            ],
            channel: 'staff',
            targetGroupEn:
                'Retired staff acquaintances',
            distortionLevel: 1,
        }],
    };
    const afterFirst =
        applySceneTransition(
            initial,
            first,
            {
                id: initial.scene.id,
                status: 'closed',
            },
            { tier: 'medium' },
        );

    const second =
        createSceneTransitionPackage();
    second.nextClock =
        '1991-09-15 · 10:30';
    second.nextScene.id =
        'second_long_skip_scene';
    second.worldChanges = {
        prophetBriefs: [{
            id: 'second_long_skip_news',
            headlineEn:
                'Cauldron Inspectors Expand Autumn Checks',
            briefEn:
                'Ministry inspectors added several London suppliers to an autumn review after routine cauldron thickness complaints increased.',
            category: 'ministry',
            happenedClock:
                '1991-09-10 · 09:30',
        }],
        gossipUpdates: [{
            id: 'staff_room_tina_story',
            action: 'propagate',
            versionEn:
                'A notorious first-year made McGonagall abandon half her duties just to finish one enrollment form.',
            sourceActorIds: [
                'old_archivist',
            ],
            audienceActorIds: [
                'tina_mother',
            ],
            channel: 'family',
            targetGroupEn:
                'A connected wizarding family',
            distortionLevel: 2,
        }],
    };
    const afterSecond =
        applySceneTransition(
            afterFirst,
            second,
            {
                id: afterFirst.scene.id,
                status: 'closed',
            },
            { tier: 'medium' },
        );
    const pack =
        afterSecond.gossipPacks
            .find(item =>
                item.id ===
                    'staff_room_tina_story');
    assert.equal(
        pack.versions.length,
        2,
    );
    assert.equal(
        pack.versions[1]
            .distortionLevel,
        2,
    );
    assert.equal(
        getActorKnownRumors(
            afterSecond,
            'tina_mother',
        )[0].distortionLevel,
        2,
    );

    const third =
        createSceneTransitionPackage();
    third.nextClock =
        '1991-10-20 · 10:30';
    third.nextScene.id =
        'third_long_skip_scene';
    third.worldChanges = {
        prophetBriefs: [{
            id: 'third_long_skip_news',
            headlineEn:
                'Hogsmeade Chimney Charms Reviewed',
            briefEn:
                'Local officials requested voluntary chimney charm checks before winter after several harmless soot reversal incidents.',
            category: 'local',
            happenedClock:
                '1991-10-03 · 14:00',
        }],
        gossipUpdates: [],
    };
    const afterThird =
        applySceneTransition(
            afterSecond,
            third,
            {
                id: afterSecond.scene.id,
                status: 'closed',
            },
            { tier: 'medium' },
        );
    assert.equal(
        afterThird.gossipPacks
            .find(item =>
                item.id ===
                    'staff_room_tina_story')
            .status,
        'faded',
    );
    assert.deepEqual(
        getActorKnownRumors(
            afterThird,
            'tina_mother',
        ),
        [],
    );
});

test('scene transition atomically archives the old scene and commits the next room', () => {
    const state = createSceneTransitionState();
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'old:event:1',
            status: 'pending',
            sceneId: state.scene.id,
            turn: state.turn.count,
        };
    const payload = createSceneTransitionPackage();
    payload.nextScene.name = '后花园里的猫头鹰';
    payload.nextScene.summary = '蒂娜抵达围墙边，猫头鹰仍在等候。';
    payload.nextScene.chapter = '早餐时的信';
    payload.nextScene.actorStates[0].currentActivity = '拿着回条站在花园门边。';
    const archive = {
        id: state.scene.id,
        name: state.scene.name,
        closureSummary: '助学金表格已经签好，蒂娜跑进了花园。',
        startedClock: state.scene.startedClock,
        endedClock: state.clock,
        messageIds: [1, 2, 3],
        status: 'closed',
    };
    const next = applySceneTransition(state, payload, archive, {
        expectedMapId: 'zhang_home',
        expectedRoomId: 'back_garden',
        startedMessageId: 17,
        tier: 'medium',
    });

    assert.equal(next.sceneArchive.length, 1);
    assert.equal(next.sceneArchive[0].id, 'zhang_home_kitchen');
    assert.deepEqual(next.sceneArchive[0].timelineEntries, [
        {
            clock: '1991-07-24 · 09:15',
            label: 'The enrollment discussion begins.',
        },
        {
            clock: '1991-07-24 · 11:15',
            label: '助学金表格已经签好，蒂娜跑进了花园。',
        },
    ]);
    assert.equal(next.scene.id, 'zhang_home_garden_owl');
    assert.equal(
        next.scene.explorationHookEn,
        payload.nextScene.explorationHookEn,
    );
    assert.equal(next.scene.startedMessageId, 17);
    assert.equal(next.scene.nextSceneIntent.titleEn, 'The Signed Reply');
    assert.deepEqual(next.scene.timelineEntries, [{
        clock: '1991-07-24 · 11:15',
        label: '蒂娜抵达围墙边，猫头鹰仍在等候。',
    }]);
    assert.equal(next.location, '后花园');
    assert.equal(next.map.currentLocalNodeId, 'back_garden');
    assert.equal(next.actors.find(actor =>
        actor.id === 'minerva_mcgonagall').present, true);
    assert.equal(next.actors.find(actor =>
        actor.id === 'tina_mother').present, false);
    const mcgonagall = next.actorLibrary.find(
        actor =>
            actor.id ===
                'minerva_mcgonagall',
    );
    assert.equal(
        mcgonagall.impressionOfPlayerEn,
        payload.relationshipUpdates[0]
            .impressionOfPlayerEn,
    );
    assert.equal(
        mcgonagall.sharedMemories.recent.length,
        1,
    );
    assert.equal(
        mcgonagall.sharedMemories.recent[0]
            .source,
        'medium_transition',
    );
    assert.equal(
        next.actors.find(actor =>
            actor.id ===
                'minerva_mcgonagall')
            .impressionOfPlayerEn,
        payload.relationshipUpdates[0]
            .impressionOfPlayerEn,
    );
    assert.equal(next.sceneTransition.status, 'idle');
    assert.equal(
        next.memoryDirector
            .pendingEventBoundary,
        null,
    );
    assert.equal(
        next.memoryDirector
            .lastReviewedTurn,
        next.turn.count,
    );
});

test('scene transition does not teleport an omitted actor to the new map', () => {
    const state = createSceneTransitionState();
    const payload = createSceneTransitionPackage();
    payload.nextScene.id = 'leaky_cauldron_arrival';
    payload.nextScene.mapId = 'diagon_alley';
    payload.nextScene.roomId = 'leaky_cauldron';
    payload.nextScene.actorStates = payload.nextScene.actorStates.map(actor => ({
        ...actor,
        mapId: 'diagon_alley',
        roomId: 'leaky_cauldron',
    }));
    payload.nextScene.followingSceneIntent.mapId = 'diagon_alley';
    payload.nextScene.followingSceneIntent.roomId = 'leaky_cauldron';

    const next = applySceneTransition(state, payload, {
        id: state.scene.id,
        status: 'closed',
    });
    const omitted = next.actors.find(actor => actor.id === 'tina_mother');

    assert.equal(omitted.present, false);
    assert.equal(omitted.mapId, 'zhang_home');
    assert.equal(omitted.roomId, 'kitchen');
});

test('scene transition snapshots carried and stored item custody', () => {
    const state = createSceneTransitionState();
    state.items = [
        {
            id: 'player_wand',
            labelEn: 'Player Wand',
            detailEn: 'A chosen wand.',
            importance: 'key',
            custody: 'carried',
            ownerId: 'player',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        },
        {
            id: 'old_letter',
            labelEn: 'Old Letter',
            detailEn: 'Stored on the kitchen table.',
            importance: 'important',
            custody: 'stored',
            ownerId: 'player',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        },
    ];
    const next = applySceneTransition(
        state,
        createSceneTransitionPackage(),
        {
            id: state.scene.id,
            status: 'closed',
        },
        {
            tier: 'medium',
        },
    );
    const wand = next.items.find(
        item => item.id === 'player_wand');
    const letter = next.items.find(
        item => item.id === 'old_letter');
    assert.equal(wand.roomId, 'back_garden');
    assert.equal(wand.custody, 'carried');
    assert.equal(letter.roomId, 'kitchen');
    assert.equal(letter.custody, 'stored');
    assert.deepEqual(
        next.scene.itemStates.map(item => [
            item.id,
            item.custody,
            item.roomId,
        ]),
        [
            [
                'player_wand',
                'carried',
                'back_garden',
            ],
            [
                'old_letter',
                'stored',
                'kitchen',
            ],
        ],
    );
});

test('transition normalization drops new permanent flags from medium tier only', () => {
    const state = createSceneTransitionState();
    state.actors = state.actors.map(actor => ({
        ...actor,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
    }));
    const payload =
        createSceneTransitionPackage();
    payload.nextScene.actorStates[0]
        .lifeStatusPermanent = true;

    const medium =
        normalizeSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        );
    assert.equal(
        medium.nextScene.actorStates[0]
            .lifeStatusPermanent,
        false,
    );
    assert.equal(
        validateSceneTransitionPackage(
            medium,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );

    const high =
        normalizeSceneTransitionPackage(
            payload,
            state,
            { tier: 'high' },
        );
    assert.equal(
        high.nextScene.actorStates[0]
            .lifeStatusPermanent,
        true,
    );
});

test('only high-tier transitions may commit irreversible NPC death', () => {
    const state = createSceneTransitionState();
    state.actors = state.actors.map(actor => ({
        ...actor,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
    }));
    const payload = createSceneTransitionPackage();
    payload.nextScene.actorStates[0] = {
        ...payload.nextScene.actorStates[0],
        present: false,
        lifeStatus: 'dead',
        lifeStatusPermanent: true,
        lifeStatusDetailEn:
            'Killed during the committed permanent consequence.',
    };
    payload.nextScene.openingSegments[1] = {
        type: 'narration',
        textEn:
            'The garden falls silent after the permanent loss.',
    };
    const mediumValidation =
        validateSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        );
    assert.equal(
        mediumValidation.valid,
        false,
    );
    assert.match(
        mediumValidation.errors.join('；'),
        /高端世界导演/,
    );
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            { tier: 'high' },
        ).valid,
        true,
    );
    const deadState = applySceneTransition(
        state,
        payload,
        {
            id: state.scene.id,
            status: 'closed',
        },
        { tier: 'high' },
    );
    const dead =
        deadState.actors.find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    assert.equal(dead.lifeStatus, 'dead');
    assert.equal(
        dead.lifeStatusPermanent,
        true,
    );
    assert.equal(dead.present, false);

    const revival =
        createSceneTransitionPackage();
    revival.nextScene.id =
        'illegal_revival_scene';
    revival.nextScene.actorStates[0] = {
        ...revival.nextScene.actorStates[0],
        present: true,
        lifeStatus: 'alive',
    };
    assert.match(
        validateSceneTransitionPackage(
            revival,
            deadState,
            { tier: 'high' },
        ).errors.join('；'),
        /不能恢复/,
    );
});

test('mid-tier transition director may settle reversible NPC status', () => {
    const state = createSceneTransitionState();
    state.actors = state.actors.map(actor => ({
        ...actor,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
    }));
    const payload = createSceneTransitionPackage();
    payload.nextScene.actorStates[0] = {
        ...payload.nextScene.actorStates[0],
        lifeStatus: 'injured',
        lifeStatusPermanent: false,
        lifeStatusDetailEn:
            'A sprained wrist from the observed closing-scene fall.',
    };
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );
    const next = applySceneTransition(
        state,
        payload,
        {
            id: state.scene.id,
            status: 'closed',
        },
        { tier: 'medium' },
    );
    const actor = next.actors.find(item =>
        item.id === 'minerva_mcgonagall');
    assert.equal(actor.lifeStatus, 'injured');
    assert.equal(
        actor.lifeStatusPermanent,
        false,
    );
    assert.equal(
        actor.lifeStatusSinceClock,
        next.clock,
    );
});

test('pacing signals trigger on repeated core cast after an interaction', () => {
    const state = createSceneTransitionState();
    state.scene.timelineEntries = [
        {
            clock: '1991-07-24 · 11:15',
            label: 'The scene begins.',
        },
        {
            clock: '1991-07-24 · 11:30',
            label: 'The same discussion continues.',
        },
    ];
    state.sceneArchive = [{
        id: 'previous_scene',
        actorIds: [
            'tina_mother',
            'minerva_mcgonagall',
            'hogwarts_owl',
        ],
    }];
    state.pacingDirector = {
        status: 'idle',
        lastAssessedTurn: null,
        lastAssessedSceneId: '',
        reassessAfterTurns: 3,
        pendingBeat: null,
    };

    const result = analyzePacingSignals(state);

    assert.equal(result.shouldAssess, true);
    assert.equal(result.metrics.sceneTurnCount, 1);
    assert.equal(result.metrics.repeatedCastSceneCount, 2);
    assert.deepEqual(result.reasons, [
        'relationship_roster_gap',
        'repeated_core_cast',
    ]);
});

test('repeated authority scenes force a near-age relationship introduction', () => {
    const state =
        createSceneTransitionState();
    state.character.identity
        .birthDate = '1980-07-01';
    state.turn.count = 8;
    state.scene.timelineEntries.push({
        clock: '1991-07-24 · 11:30',
        label:
            'McGonagall completes another procedure.',
    });
    state.sceneArchive = [
        {
            id: 'scene_one',
            actorIds: [
                'minerva_mcgonagall',
            ],
        },
        {
            id: 'scene_two',
            actorIds: [
                'minerva_mcgonagall',
            ],
        },
    ];
    state.actors =
        state.actors.filter(actor =>
            actor.id ===
                'minerva_mcgonagall');
    const signals =
        analyzePacingSignals(state);

    assert.equal(
        signals.metrics
            .forcePeerIntroduction,
        true,
    );
    assert.equal(
        signals.metrics
            .repeatedAuthorityIds
            .includes(
                'minerva_mcgonagall',
            ),
        true,
    );
    assert.equal(
        validatePacingAssessment({
            decision: 'hold',
            diagnosisEn:
                'The professor can continue.',
            reassessAfterTurns: 3,
            intervention: null,
        }, state, signals).valid,
        false,
    );
});

test('pacing signals respect pending beats and reassessment cooldown', () => {
    const state = createSceneTransitionState();
    state.turn.count = 7;
    state.scene.timelineEntries = [
        { clock: '1991-07-24 · 11:15', label: 'Opening.' },
        { clock: '1991-07-24 · 11:30', label: 'Turn one.' },
        { clock: '1991-07-24 · 11:45', label: 'Turn two.' },
        { clock: '1991-07-24 · 12:00', label: 'Turn three.' },
    ];
    state.pacingDirector = {
        status: 'ready',
        lastAssessedTurn: 6,
        lastAssessedSceneId: state.scene.id,
        reassessAfterTurns: 3,
        pendingBeat: null,
    };
    assert.equal(analyzePacingSignals(state).shouldAssess, false);

    state.turn.count = 9;
    assert.equal(analyzePacingSignals(state).shouldAssess, false);

    state.turn.count = 12;
    assert.equal(analyzePacingSignals(state).shouldAssess, true);
    assert.equal(
        analyzePacingSignals(state)
            .metrics
            .automaticReassessAfterTurns,
        6,
    );

    state.pacingDirector.pendingBeat = {
        status: 'pending',
        beatEn: 'A visitor arrives.',
    };
    assert.equal(analyzePacingSignals(state).shouldAssess, false);
});

test('causal collapse opportunities share pacing cooldown and bind one persistent aftermath per scene', () => {
    const state =
        createSceneTransitionState();
    state.phase = 'playing';
    state.turn.count = 12;
    state.pacingDirector = {
        status: 'ready',
        lastAssessedTurn: 6,
        lastAssessedSceneId:
            state.scene.id,
        reassessAfterTurns: 2,
        pendingBeat: null,
    };
    state.causalCollapse =
        normalizeCausalCollapseState();
    const action =
        '@Minerva McGonagall：教授，你以前认识我在这里遇见的其他人吗？';
    const opportunity =
        detectCausalCollapseOpportunity(
            state,
            action,
        );
    assert.equal(
        opportunity.type,
        'first_deep_conversation',
    );
    assert.equal(
        opportunity.focusActorId,
        'minerva_mcgonagall',
    );
    const signals =
        analyzePacingSignals(
            state,
            action,
        );
    assert.equal(
        signals.reasons.includes(
            'causal_collapse_opportunity',
        ),
        true,
    );
    assert.equal(
        signals.metrics
            .automaticReassessAfterTurns,
        CAUSAL_COLLAPSE_MIN_CHECK_TURNS,
    );

    const cooling =
        structuredClone(state);
    cooling.pacingDirector
        .lastAssessedTurn = 10;
    assert.equal(
        analyzePacingSignals(
            cooling,
            action,
        ).reasons.includes(
            'causal_collapse_opportunity',
        ),
        false,
    );

    const causalSignals = {
        reasons: [
            'causal_collapse_opportunity',
        ],
        metrics: {
            causalCollapseOpportunity:
                opportunity,
            forcePeerIntroduction:
                false,
        },
    };
    const collapse = {
        kind: 'social_edge',
        focusActorId:
            'minerva_mcgonagall',
        relatedActorIds: [
            'tina_mother',
        ],
        itemId: '',
        mapId:
            state.map.activeMapId,
        roomId:
            state.map
                .currentLocalNodeId,
        effectiveMinutesBeforeObservation:
            30,
        factEn:
            'McGonagall and Tina mother attended the same preparatory class before the Hogwarts visit.',
        edgeType: 'classmate',
        visibleResiduesEn: [
            'McGonagall pauses when Tina mentions her mother.',
        ],
        aftermathEn:
            'Show McGonagall recognizing the family reference without explaining the correspondence.',
        witnessAccounts: [{
            actorId:
                'minerva_mcgonagall',
            accountEn:
                'McGonagall exchanged two practical letters with Tina mother before visiting the family.',
        }],
        sourceEventIds: [],
        persistenceTargets: [
            'event',
            'social_graph',
        ],
        surfaceMode: 'aftermath',
        consequenceMode: 'mixed',
        irreversible: false,
        requiresHighTier: false,
    };
    const payload =
        normalizePacingAssessmentPayload(
            {
                decision: 'intervene',
                diagnosisEn:
                    'The first deep conversation can collide with an unobserved ordinary acquaintance.',
                reassessAfterTurns: 6,
                intervention: {
                    kind:
                        'causal_collision',
                    timing: 'this_turn',
                    beatEn:
                        'McGonagall pauses over Tina reference to her mother.',
                    pressureEn:
                        'The pause invites Tina to ask what McGonagall already knows.',
                    arcId: '',
                    actorEntrances: [],
                    temporaryActors: [],
                    guestActor: null,
                    causalCollapse:
                        collapse,
                },
            },
            state,
        );
    assert.deepEqual(
        validatePacingAssessment(
            payload,
            state,
            causalSignals,
        ),
        { valid: true, errors: [] },
    );
    const committed =
        applyPacingAssessment(
            state,
            payload,
            causalSignals,
        );
    assert.equal(
        committed.causalCollapse
            .records.length,
        CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE,
    );
    assert.equal(
        committed.causalCollapse
            .records[0]
            .effectiveSinceClock,
        advanceWorldClock(
            state.clock,
            -30,
        ),
    );
    assert.equal(
        committed.pacingDirector
            .pendingBeat
            .causalCollapse
            .factEn,
        collapse.factEn,
    );
    const mandatory =
        buildMandatorySceneState(
            committed,
        );
    assert.equal(
        mandatory.pacingDirective
            .causalCollapse.factEn,
        undefined,
    );
    assert.deepEqual(
        mandatory.pacingDirective
            .causalCollapse
            .visibleResiduesEn,
        collapse.visibleResiduesEn,
    );
    const capsules =
        buildActorKnowledgeCapsules(
            committed,
            ['minerva_mcgonagall'],
        );
    assert.equal(
        capsules[0]
            .causalFacts[0].factEn,
        collapse.factEn,
    );
    const causalEdge =
        committed.socialGraph
            .relationships
            .find(edge =>
                edge.sourceActorId ===
                    'minerva_mcgonagall' &&
                edge.targetActorId ===
                    'tina_mother');
    assert.equal(
        SOCIAL_RELATIONSHIP_DIMENSIONS
            .every(dimension =>
                Object.hasOwn(
                    causalEdge,
                    dimension,
                )),
        true,
    );
    assert.equal(
        causalEdge.familiarity >= 2,
        true,
    );
    assert.deepEqual(
        causalEdge.structuralTags,
        ['classmate'],
    );
    assert.equal(
        Object.hasOwn(
            causalEdge,
            'affinity',
        ),
        false,
    );
    const causalEvidence =
        committed.socialGraph
            .relationshipEvidence
            .find(evidence =>
                evidence.id ===
                causalEdge.evidenceIds[0]);
    assert.equal(
        causalEvidence.eventKind,
        'other',
    );
    assert.deepEqual(
        causalEvidence.structuralTags,
        ['classmate'],
    );
    assert.equal(
        Object.hasOwn(
            causalEvidence,
            'type',
        ),
        false,
    );
    assert.equal(
        detectCausalCollapseOpportunity(
            committed,
            action,
        ),
        null,
    );
    committed.turn.count += 1;
    const consumed =
        consumePacingBeat(
            committed,
        );
    assert.equal(
        consumed.causalCollapse
            .records[0].status,
        'surfaced',
    );
    assert.equal(
        consumed.causalCollapse
            .records.length,
        1,
    );

    const fallback =
        normalizePacingAssessmentPayload(
            {
                decision: 'intervene',
                diagnosisEn:
                    'No compatible prior fact exists, so a bounded ordinary incident is used.',
                reassessAfterTurns: 6,
                intervention: {
                    kind:
                        'minor_mishap',
                    timing: 'this_turn',
                    beatEn:
                        'A gravy boat tips at the table edge.',
                    pressureEn:
                        'Someone must catch it before it spills.',
                    arcId: '',
                    actorEntrances: [],
                    temporaryActors: [],
                    guestActor: null,
                    causalCollapse: null,
                },
            },
            state,
        );
    assert.equal(
        validatePacingAssessment(
            fallback,
            state,
            causalSignals,
        ).valid,
        true,
    );
    const fallbackCommitted =
        applyPacingAssessment(
            state,
            fallback,
            causalSignals,
        );
    assert.equal(
        fallbackCommitted
            .causalCollapse
            .records.length,
        0,
    );
    assert.equal(
        fallbackCommitted
            .causalCollapse
            .checkedSlots[0]
            .outcome,
        'immediate_incident',
    );
    assert.equal(
        detectCausalCollapseOpportunity(
            fallbackCommitted,
            action,
        ),
        null,
    );
    assert.equal(
        validatePacingAssessment(
            {
                decision: 'hold',
                diagnosisEn:
                    'Nothing changes.',
                reassessAfterTurns: 6,
                intervention: null,
            },
            state,
            causalSignals,
        ).valid,
        false,
    );
});

test('pacing roster gaps stop auto-triggering when the current scene already has enough peers', () => {
    const state =
        createSceneTransitionState();
    state.character.identity.birthDate =
        '1980-07-01';
    state.turn.count = 30;
    state.scene.timelineEntries = [
        {
            clock:
                '1991-07-24 · 11:15',
            label: 'Opening.',
        },
        {
            clock:
                '1991-07-24 · 11:30',
            label:
                'Three students are already talking.',
        },
    ];
    const peerIds = [
        'peer_one',
        'peer_two',
        'peer_three',
    ];
    state.actorLibrary =
        peerIds.map((id, index) => ({
            id,
            nameEn: `Peer ${index + 1}`,
            birthDate:
                `1980-0${index + 5}-01`,
            introducedClock:
                state.clock,
        }));
    state.actors =
        peerIds.map(id => ({
            id,
            present: true,
        }));
    state.pacingDirector = {
        status: 'ready',
        lastAssessedTurn: null,
        lastAssessedSceneId: '',
        reassessAfterTurns: 2,
        pendingBeat: null,
    };

    const result =
        analyzePacingSignals(state);

    assert.equal(
        result.metrics
            .urgentPeerDeficit > 0,
        true,
    );
    assert.equal(
        result.metrics
            .currentPeerActorCount,
        3,
    );
    assert.equal(
        result.metrics
            .currentPeerRosterSaturated,
        true,
    );
    assert.equal(
        result.reasons.includes(
            'relationship_roster_gap',
        ),
        false,
    );
    assert.equal(
        result.shouldAssess,
        false,
    );
});

test('pacing signals immediately route explicit stranger interaction to medium tier', () => {
    const state = createSceneTransitionState();
    state.scene.timelineEntries = [{
        clock: '1991-07-24 · 11:15',
        label: 'The scene begins.',
    }];
    state.pacingDirector = {
        status: 'idle',
        lastAssessedTurn: null,
        lastAssessedSceneId: '',
        reassessAfterTurns: 3,
        pendingBeat: null,
    };

    const result = analyzePacingSignals(
        state,
        '我随机问一个酒客：“你是巫师吗？”',
    );

    assert.equal(result.shouldAssess, true);
    assert.deepEqual(
        result.reasons,
        ['explicit_new_actor_request'],
    );
    state.turn.count = 10;
    state.pacingDirector
        .lastAssessedTurn = 10;
    for (const action of [
        '我们出去认识一下别人。',
        '去看看谁在车厢里。',
        '我介绍其他学生给你认识。',
    ]) {
        const socialSearch =
            analyzePacingSignals(
                state,
                action,
            );
        assert.equal(
            socialSearch.shouldAssess,
            true,
        );
        assert.equal(
            socialSearch.metrics
                .explicitNewActorRequest,
            true,
        );
    }
});

test('supplied Canon candidates are promoted from actorEntrances to guestActor', () => {
    const state =
        createSceneTransitionState();
    const ron =
        findCanonCharacter(
            'canon_ronald_bilius_weasley',
        );
    const ronProfile =
        getCanonSettingProfile(
            ron,
        );
    const payload = {
        decision: 'intervene',
        diagnosisEn:
            'The player is actively looking for another student.',
        reassessAfterTurns: 2,
        intervention: {
            kind: 'new_actor',
            timing: 'this_turn',
            beatEn:
                'Ron appears in the next compartment doorway.',
            pressureEn:
                'Ron asks whether the seats are taken.',
            arcId: '',
            actorEntrances: [{
                id:
                    'canon_ronald_bilius_weasley',
                currentActivityEn:
                    'Standing in the doorway with a battered trunk.',
            }],
            guestActor: null,
        },
    };
    const normalized =
        normalizePacingAssessmentPayload(
            payload,
            state,
            [{
                id: ron.id,
                nameEn: ron.nameEn,
                roleEn: ron.roleEn,
                settingTags:
                    ronProfile.settingTags,
            }],
        );
    assert.deepEqual(
        normalized.intervention
            .actorEntrances,
        [],
    );
    assert.equal(
        normalized.intervention
            .guestActor.id,
        ron.id,
    );
    assert.deepEqual(
        normalized.intervention
            .guestActor.settingTags,
        ronProfile.settingTags,
    );
    assert.deepEqual(
        validatePacingAssessment(
            normalized,
            state,
        ),
        { valid: true, errors: [] },
    );
    const committed =
        applyPacingAssessment(
            state,
            normalized,
        );
    assert.equal(
        committed.actorLibrary.at(-1)
            .canonCatalogId,
        ron.id,
    );
    assert.deepEqual(
        committed.actorLibrary.at(-1)
            .knowledgeEn,
        [
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        ],
    );
    assert.equal(
        committed.actors.at(-1)
            .present,
        true,
    );
});

test('canon actor knowledge boundaries discard catalog skills, future affiliations, and omniscience claims', () => {
    const hermione = {
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        canonCatalogId:
            'canon_hermione_jean_granger',
        knowledgeEn: [
            'Student',
            'House: Gryffindor',
            'Dumbledore\'s Army | Order of the Phoenix | Hogwarts School of Witchcraft and Wizardry',
            'Almost everything',
            'Hermione personally witnessed Tina break the train window.',
        ],
    };
    assert.deepEqual(
        sanitizeActorKnowledgeEn(
            hermione,
        ),
        [
            'Hermione personally witnessed Tina break the train window.',
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        ],
    );

    const state =
        createSceneTransitionState();
    state.actorKnowledgeVersion = 0;
    state.actorLibrary = [
        hermione,
        {
            id: 'original_student',
            nameEn: 'Original Student',
            knowledgeEn: [
                'Saw the locked classroom door this morning.',
            ],
        },
    ];
    const migrated =
        migrateActorKnowledgeBoundaries(
            state,
        );
    assert.equal(
        migrated.changed,
        true,
    );
    assert.deepEqual(
        migrated.state.actorLibrary[0]
            .knowledgeEn,
        [
            'Hermione personally witnessed Tina break the train window.',
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        ],
    );
    assert.deepEqual(
        migrated.state.actorLibrary[1]
            .knowledgeEn,
        [
            'Saw the locked classroom door this morning.',
        ],
    );
    assert.equal(
        migrateActorKnowledgeBoundaries(
            migrated.state,
        ).changed,
        false,
    );
});

test('pacing assessment commits and consumes a safe public guest beat', () => {
    const state = createSceneTransitionState();
    state.pacingDirector = {
        status: 'idle',
        lastAssessedTurn: null,
        lastAssessedSceneId: '',
        reassessAfterTurns: 3,
        pendingBeat: null,
    };
    const payload = {
        decision: 'intervene',
        diagnosisEn: 'The familiar adults have exhausted the current pressure.',
        reassessAfterTurns: 3,
        intervention: {
            kind: 'mixed',
            timing: 'this_turn',
            beatEn: 'A hurried shop assistant mistakes Tina for another customer.',
            pressureEn: 'The assistant demands an immediate answer about a missing parcel.',
            arcId: '',
            actorEntrances: [],
            guestActor: {
                id: 'hurried_shop_assistant',
                nameEn: 'Nora Pike',
                roleEn: 'Wizarding shop assistant',
                relationshipToPlayerEn: 'Newly met stranger',
                publicDescriptionEn: 'A young witch with ink on both cuffs.',
                publicBackgroundEn: 'Works nearby and is searching for a parcel.',
                personalityEn: 'Harried, observant, and quick to assume.',
                speechStyleEn: 'Fast practical questions with clipped apologies.',
                currentActivityEn: 'Hurrying through the Back Garden with a torn delivery note.',
                birthDate: '1970-04-09',
                settingTags: [
                    'social',
                    'steady',
                ],
            },
        },
    };
    assert.deepEqual(
        validatePacingAssessment(payload, state),
        { valid: true, errors: [] },
    );

    const committed = applyPacingAssessment(
        state,
        payload,
        { reasons: ['repeated_core_cast'] },
    );
    assert.equal(
        committed.actorLibrary.at(-1).id,
        'hurried_shop_assistant',
    );
    assert.equal(
        committed.actorLibrary.at(-1)
            .birthDate,
        '1970-04-09',
    );
    assert.deepEqual(
        committed.actorLibrary.at(-1)
            .settingTags,
        [
            'social',
            'steady',
        ],
    );
    assert.deepEqual(
        committed.actorLibrary.at(-1)
            .relationshipTags,
        ['acquaintance'],
    );
    assert.equal(committed.actors.at(-1).present, true);
    assert.equal(
        committed.actors.at(-1).roomId,
        'back_garden',
    );
    assert.equal(
        committed.pacingDirector.pendingBeat.status,
        'pending',
    );

    committed.turn.count += 1;
    committed.clock = '1991-07-24 · 11:30';
    const consumed = consumePacingBeat(committed);
    assert.equal(
        consumed.pacingDirector.pendingBeat.status,
        'consumed',
    );
    assert.equal(
        consumed.pacingDirector.pendingBeat.consumedTurn,
        committed.turn.count,
    );

    const unsafe = structuredClone(payload);
    unsafe.intervention.guestActor.secretEn = 'A hidden fact';
    const rejected = validatePacingAssessment(unsafe, state);
    assert.equal(rejected.valid, false);
    assert.match(rejected.errors.join('；'), /不得写入字段/);

    const relationshipAsSetting =
        structuredClone(payload);
    relationshipAsSetting
        .intervention
        .guestActor
        .settingTags = [
            'friend',
            'social',
        ];
    assert.match(
        validatePacingAssessment(
            relationshipAsSetting,
            state,
        ).errors.join('；'),
        /settingTags/,
    );

    const repeatedActorState =
        structuredClone(state);
    repeatedActorState.pacingDirector
        .assessment = {
            intervention: {
                kind: 'new_actor',
                guestActor: {
                    nameEn:
                        'Nora Pike',
                },
            },
        };
    const repeated = validatePacingAssessment(
        payload,
        repeatedActorState,
        {
            metrics: {
                explicitNewActorRequest: false,
            },
        },
    );
    assert.equal(repeated.valid, false);
    assert.match(
        repeated.errors.join('；'),
        /不得连续新增原创过场人物/,
    );
    assert.deepEqual(
        validatePacingAssessment(
            payload,
            repeatedActorState,
            {
                metrics: {
                    explicitNewActorRequest: true,
                },
            },
        ),
        { valid: true, errors: [] },
    );
});

test('temporary scene actors keep a stable identity and merge only after narrative evidence', () => {
    const state = createSceneTransitionState();
    const initialLibraryCount =
        state.actorLibrary.length;
    const initialStoryCount =
        buildStoryCastPolicy(state)
            .storyActorCount;
    const temporaryPayload = {
        decision: 'intervene',
        diagnosisEn:
            'A service worker is needed for the bounded mishap, not as permanent cast.',
        reassessAfterTurns: 6,
        intervention: {
            kind: 'minor_mishap',
            timing: 'this_turn',
            beatEn:
                'An unnamed trolley attendant arrives and her sweets tray tips at the doorway.',
            pressureEn:
                'The attendant needs help recovering stock and settling payment.',
            arcId: '',
            actorEntrances: [],
            temporaryActors: [{
                id:
                    'temp_train_trolley_attendant_01',
                nameEn:
                    'Trolley Attendant',
                roleEn:
                    'Hogwarts Express trolley attendant',
                publicDescriptionEn:
                    'A square-jawed witch in a starched hat and apron.',
                personalityEn:
                    'Seasoned, practical, and patient.',
                speechStyleEn:
                    'Brisk and dryly professional.',
                currentActivityEn:
                    'Steadying a tipped sweets trolley at the doorway.',
            }],
            guestActor: null,
            identityMergeFromId: '',
            identityEvidenceEn: '',
            identityRevealed: false,
        },
    };
    assert.deepEqual(
        validatePacingAssessment(
            temporaryPayload,
            state,
        ),
        { valid: true, errors: [] },
    );
    const introduced =
        applyPacingAssessment(
            state,
            temporaryPayload,
            { reasons: ['long_scene'] },
        );
    const temporary = introduced.actors
        .find(actor =>
            actor.id ===
                'temp_train_trolley_attendant_01');
    assert.equal(temporary.temporary, true);
    assert.equal(temporary.present, true);
    assert.equal(
        introduced.actorLibrary.length,
        initialLibraryCount,
    );
    assert.equal(
        buildStoryCastPolicy(introduced)
            .storyActorCount,
        initialStoryCount,
    );

    const remainingActorIds =
        introduced.actors
            .filter(actor =>
                actor.present !== false &&
                actor.id !== temporary.id)
            .map(actor =>
                actor.id);
    const departed = applyTurnTransaction(
        introduced,
        {
            elapsedMinutes: 15,
            publicEventEn:
                'The attendant recovers the trolley, remembers Tina questioning her, and continues down the train.',
            actorPresence: {
                presentActorIdsAfterTurn:
                    remainingActorIds,
            },
            segments: [{
                type: 'narration',
                textEn:
                    'The attendant wheels the recovered trolley into the next carriage.',
            }],
            actorUpdates: [{
                id: temporary.id,
                present: false,
                currentActivityEn:
                    'Wheeling the trolley into the next carriage.',
                memoryUpdate: {
                    summaryEn:
                        'Tina helped recover the sweets and asked about the attendant\'s work.',
                    significance:
                        'everyday',
                },
            }],
            itemUpdates: [],
            revealedClues: [],
        },
        'I help and ask about her work.',
    );
    const departedTemporary =
        departed.actors.find(actor =>
            actor.id === temporary.id);
    assert.equal(
        departedTemporary.present,
        false,
    );
    assert.equal(
        departedTemporary
            .temporaryMemories.length,
        1,
    );

    const returnPayload =
        structuredClone(
            temporaryPayload,
        );
    returnPayload.intervention.beatEn =
        'The same trolley attendant returns and recognizes Tina.';
    returnPayload.intervention
        .temporaryActors[0]
        .currentActivityEn =
        'Returning with the trolley and recognizing Tina from the spill.';
    assert.deepEqual(
        validatePacingAssessment(
            returnPayload,
            departed,
        ),
        { valid: true, errors: [] },
    );
    const returned =
        applyPacingAssessment(
            departed,
            returnPayload,
        );
    assert.equal(
        returned.actors.filter(actor =>
            actor.id === temporary.id)
            .length,
        1,
    );
    assert.equal(
        returned.actors.find(actor =>
            actor.id === temporary.id)
            .temporaryMemories.length,
        1,
    );

    const mergePayload = {
        decision: 'intervene',
        diagnosisEn:
            'The recurring attendant states her name, resolving the provisional identity.',
        reassessAfterTurns: 6,
        intervention: {
            kind: 'mixed',
            timing: 'this_turn',
            beatEn:
                'The attendant introduces herself as Nora Pike while handing Tina a receipt.',
            pressureEn:
                'Nora expects Tina to acknowledge the final account.',
            arcId: '',
            actorEntrances: [],
            temporaryActors: [],
            guestActor: {
                id: 'nora_pike',
                nameEn: 'Nora Pike',
                roleEn:
                    'Hogwarts Express trolley attendant',
                relationshipToPlayerEn:
                    'Scene acquaintance',
                publicDescriptionEn:
                    'A square-jawed witch in a starched hat and apron.',
                publicBackgroundEn:
                    'An experienced sweets attendant aboard the Hogwarts Express.',
                personalityEn:
                    'Seasoned, practical, and patient.',
                speechStyleEn:
                    'Brisk and dryly professional.',
                currentActivityEn:
                    'Handing Tina an itemized receipt.',
                birthDate:
                    '1952-03-18',
                settingTags: [
                    'steady',
                    'social',
                ],
            },
            identityMergeFromId:
                temporary.id,
            identityEvidenceEn:
                'She explicitly says her name is Nora Pike.',
            identityRevealed: true,
        },
    };
    assert.deepEqual(
        validatePacingAssessment(
            mergePayload,
            returned,
        ),
        { valid: true, errors: [] },
    );
    const merged =
        applyPacingAssessment(
            returned,
            mergePayload,
        );
    const mergedActor =
        merged.actors.find(actor =>
            actor.id === temporary.id);
    const mergedProfile =
        merged.actorLibrary.find(actor =>
            actor.id === temporary.id);
    assert.equal(
        merged.actors.some(actor =>
            actor.id === 'nora_pike'),
        false,
    );
    assert.equal(
        mergedActor.temporary,
        false,
    );
    assert.equal(
        mergedActor.resolvedIdentityId,
        'nora_pike',
    );
    assert.equal(
        mergedProfile.nameEn,
        'Nora Pike',
    );
    assert.equal(
        mergedProfile
            .sharedMemories.everyday
            .some(memory =>
                /helped recover the sweets/i
                    .test(
                        memory
                            .summaryEn,
                    )),
        true,
    );

    const unsupportedMerge =
        structuredClone(
            mergePayload,
        );
    unsupportedMerge.intervention
        .identityEvidenceEn = '';
    assert.match(
        validatePacingAssessment(
            unsupportedMerge,
            returned,
        ).errors.join('；'),
        /明确证据/,
    );
});

test('temporary actor promotion policy separates selected interaction from crowd texture', () => {
    const state =
        createSceneTransitionState();
    state.actors.push({
        id: 'temp_existing_prefect',
        temporary: true,
        present: false,
    });
    const policy =
        buildTemporaryActorPromotionPolicy(
            state,
        );
    assert.equal(
        policy.mode,
        'promote_selected_anonymous_interaction',
    );
    assert.match(
        policy.promoteWhen,
        /sitting beside/,
    );
    assert.match(
        policy.keepAnonymousWhen,
        /crowd texture/,
    );
    assert.equal(
        policy.maximumEntrances,
        2,
    );
    assert.equal(
        policy.reservedActorIds.includes(
            'minerva_mcgonagall',
        ),
        true,
    );
    assert.equal(
        policy.reservedActorIds.includes(
            'temp_existing_prefect',
        ),
        true,
    );
    assert.deepEqual(
        policy.requiredFields,
        [
            'id',
            'nameEn',
            'roleEn',
            'publicDescriptionEn',
            'personalityEn',
            'speechStyleEn',
            'currentActivityEn',
        ],
    );
});

test('coherent orphan actor references recover into one temporary entrance', () => {
    const words = prefix =>
        Array.from(
            { length: 45 },
            (_, index) =>
                `${prefix}${index}`,
        ).join(' ');
    const state =
        createSceneTransitionState();
    state.actors = state.actors
        .filter(actor =>
            actor.id ===
            'minerva_mcgonagall');
    const temporaryId =
        'gryffindor_fifth_year_rhys';
    const payload = {
        publicEventEn:
            'Tina sits beside an older Gryffindor student and asks his name.',
        eventEnded: false,
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
                temporaryId,
            ],
        },
        segments: [
            {
                type: 'narration',
                textEn: words('arrival'),
            },
            {
                type: 'dialogue',
                actorId: temporaryId,
                textEn: words('answer'),
            },
            {
                type: 'narration',
                textEn: words('feast'),
            },
            {
                type: 'dialogue',
                actorId: temporaryId,
                textEn: words('question'),
            },
        ],
        actorUpdates: [{
            id: temporaryId,
            present: true,
            currentActivityEn:
                'Sitting beside Tina at the Gryffindor table and answering her questions.',
            mapId:
                state.map.activeMapId,
            roomId:
                state.map
                    .currentLocalNodeId,
        }],
        temporaryActorEntrances: [],
    };
    const budget = {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    };
    assert.equal(
        validateScenePerformance(
            payload,
            state,
            budget,
        ).valid,
        false,
    );
    const recovered =
        recoverImplicitTemporaryActorEntrances(
            payload,
            state,
        );
    assert.equal(
        recovered
            .temporaryActorEntrances
            .length,
        1,
    );
    assert.equal(
        recovered
            .temporaryActorEntrances[0]
            .id,
        temporaryId,
    );
    assert.equal(
        recovered
            .temporaryActorEntrances[0]
            .nameEn,
        'Gryffindor Fifth Year Rhys',
    );
    assert.deepEqual(
        validateScenePerformance(
            recovered,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const incomplete =
        structuredClone(payload);
    incomplete.actorPresence
        .presentActorIdsAfterTurn =
        ['minerva_mcgonagall'];
    assert.equal(
        recoverImplicitTemporaryActorEntrances(
            incomplete,
            state,
        ).temporaryActorEntrances
            .length,
        0,
    );
});

test('temporary actor display names reconcile from revealed bilingual dialogue', () => {
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
        actorId: 'phillip_meadows',
        textEn:
            'Phillip. Third year. My mum is a witch.',
        textZh:
            '菲利普。三年级。我妈妈是个女巫。',
    }];
    assert.deepEqual(
        resolveTemporaryActorRevealedName(
            actor,
            segments,
        ),
        {
            nameEn: 'Phillip',
            name: '菲利普',
        },
    );
    const migration =
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
        migration.changed,
        true,
    );
    assert.equal(
        migration.state
            .actors[0].nameEn,
        'Phillip',
    );
    assert.equal(
        migration.state
            .actors[0].name,
        '菲利普',
    );
    assert.equal(
        migration.state
            .actors[0].aliases
            .includes('Phillip'),
        true,
    );
    assert.equal(
        migration.state
            .actors[0].aliases
            .includes('菲利普'),
        true,
    );
});

test('exactly mentioned nearby acquaintances are recalled for one turn with memory', () => {
    const state = {
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'great_hall',
            generatedLocalNodes: [],
            generatedLocalExits: [],
            exitStates: {},
        },
        actors: [{
            id: 'canon_lavender_brown',
            nameEn: 'Lavender Brown',
            name: '拉文德·布朗',
            aliases: [
                'Lavender',
                '拉文德',
            ],
            present: false,
            lifeStatus: 'alive',
            mapId:
                'hogwarts_castle',
            roomId:
                'entrance_hall',
        }],
        actorLibrary: [{
            id: 'canon_lavender_brown',
            nameEn: 'Lavender Brown',
            name: '拉文德·布朗',
            aliases: [
                'Lavender',
                '拉文德',
            ],
        }],
    };
    assert.equal(
        admitMentionedKnownActors(
            state,
            '我找认识的女生挤眉弄眼。',
        ).admittedActors.length,
        0,
    );
    const admitted =
        admitMentionedKnownActors(
            state,
            '我对拉文德点头。',
        );
    assert.equal(
        admitted
            .admittedActors.length,
        1,
    );
    assert.equal(
        admitted
            .admittedActors[0].id,
        'canon_lavender_brown',
    );
    assert.equal(
        admitted.state.actors[0]
            .present,
        true,
    );
    assert.equal(
        admitted.state.actors[0]
            .roomId,
        'great_hall',
    );
    const withMemory =
        ensureMentionedKnownActorMemories(
            {
                publicEventEn:
                    'Tina nodded to Lavender Brown at the Gryffindor table, and Lavender acknowledged her.',
                eventEnded: false,
                segments: [{
                    type: 'narration',
                    textEn:
                        'Tina nodded to Lavender, who nodded back.',
                }],
                actorPresence: {
                    presentActorIdsAfterTurn:
                        [],
                },
                actorUpdates: [],
            },
            admitted.state,
            admitted.admittedActors,
        );
    assert.equal(
        withMemory.actorPresence
            .presentActorIdsAfterTurn
            .includes(
                'canon_lavender_brown',
            ),
        true,
    );
    const update =
        withMemory.actorUpdates
            .find(item =>
                item.id ===
                'canon_lavender_brown');
    assert.equal(
        update.memoryUpdate
            .significance,
        'everyday',
    );
    assert.match(
        update.memoryUpdate
            .summaryEn,
        /Lavender Brown/,
    );
});

test('social discovery stages advance at 12 and 16 meaningful known actors', () => {
    const createStageState = count => {
        const state =
            createSceneTransitionState();
        const actors = Array.from(
            {
                length: count,
            },
            (_, index) => ({
                id: `known_actor_${index}`,
                nameEn:
                    `Known Actor ${index}`,
                roleEn: 'Student',
                relationshipToPlayerEn:
                    'Friend',
                relationshipTags:
                    ['friend'],
                birthDate:
                    '1980-01-01',
                present: true,
                mapId:
                    state.map
                        .activeMapId,
                roomId:
                    state.map
                        .currentLocalNodeId,
            }),
        );
        state.actorLibrary =
            structuredClone(actors);
        state.actors =
            structuredClone(actors);
        state.sceneArchive = [];
        return state;
    };

    const exploration =
        buildStoryCastPolicy(
            createStageState(11),
        );
    assert.equal(
        exploration.socialStage,
        'exploration',
    );
    assert.equal(
        exploration
            .socialStagePolicy
            .newActorShare,
        0.7,
    );

    const formation =
        buildStoryCastPolicy(
            createStageState(12),
        );
    assert.equal(
        formation.socialStage,
        'circle_formation',
    );
    assert.equal(
        formation
            .meaningfulKnownActorIds
            .includes(
                'known_actor_0',
            ),
        true,
    );

    const excludedState =
        createStageState(11);
    const excludedActors = [
        {
            id: 'known_professor',
            nameEn:
                'Known Professor',
            roleEn: 'Professor',
            relationshipToPlayerEn:
                'Mentor',
            relationshipTags: [
                'mentor',
            ],
        },
        {
            id: 'known_parent',
            nameEn:
                'Known Parent',
            roleEn: 'Parent',
            relationshipToPlayerEn:
                'Father',
            relationshipTags: [
                'family',
            ],
        },
    ].map(actor => ({
        ...actor,
        present: true,
        mapId:
            excludedState.map
                .activeMapId,
        roomId:
            excludedState.map
                .currentLocalNodeId,
    }));
    excludedState.actorLibrary.push(
        ...structuredClone(
            excludedActors,
        ),
    );
    excludedState.actors.push(
        ...structuredClone(
            excludedActors,
        ),
    );
    const excludedPolicy =
        buildStoryCastPolicy(
            excludedState,
        );
    assert.equal(
        excludedPolicy
            .meaningfulKnownActorCount,
        11,
    );
    assert.deepEqual(
        new Set(
            excludedPolicy
                .excludedFromSocialStageActorIds,
        ),
        new Set([
            'known_professor',
            'known_parent',
        ]),
    );
    assert.equal(
        excludedPolicy.socialStage,
        'exploration',
    );

    const stable =
        buildStoryCastPolicy(
            createStageState(16),
        );
    assert.equal(
        stable.socialStage,
        'socially_stable',
    );
    assert.equal(
        stable
            .socialStagePolicy
            .familiarActorShare,
        0.8,
    );
});

test('actor selection policy preserves explicit and pursued targets above stage quotas', () => {
    const state =
        createSceneTransitionState();
    state.actorLibrary.push({
        id: 'pursued_professor',
        nameEn:
            'Professor Pursued',
        roleEn: 'Professor',
        relationshipToPlayerEn:
            'Acquaintance',
        relationshipTags: [
            'acquaintance',
        ],
    });
    state.actors.push({
        id: 'pursued_professor',
        nameEn:
            'Professor Pursued',
        roleEn: 'Professor',
        relationshipToPlayerEn:
            'Acquaintance',
        present: true,
        mapId:
            state.map.activeMapId,
        roomId:
            state.map
                .currentLocalNodeId,
    });
    const policy =
        buildActorSelectionPolicy(
            state,
            'Please wait.',
            [
                {
                    actorIds: [
                        'pursued_professor',
                    ],
                    sceneId:
                        'scene_one',
                },
                {
                    actorIds: [
                        'pursued_professor',
                    ],
                    sceneId:
                        'scene_two',
                },
            ],
            {
                mode: 'direct',
                attempted: true,
                valid: true,
                actorIds: [
                    'pursued_professor',
                ],
            },
        );

    assert.deepEqual(
        policy.priorityOrder,
        [
            'explicit_current_turn',
            'long_term_pursuit',
            'causal_or_unresolved',
            'social_stage_quota',
            'generic_familiar_recall',
        ],
    );
    assert.equal(
        policy.explicitActorIds
            .includes(
                'pursued_professor',
            ),
        true,
    );
    assert.equal(
        policy.pursuedActorIds
            .includes(
                'pursued_professor',
            ),
        true,
    );

    const canonPolicy =
        buildActorSelectionPolicy(
            state,
            'I want to meet Albus Dumbledore.',
        );
    assert.equal(
        canonPolicy
            .explicitCanonCandidates
            .some(actor =>
                /dumbledore/iu.test(
                    actor.nameEn,
                )),
        true,
    );
});

test('explicit Harry aliases force stable Canon admission through pacing', () => {
    assert.equal(
        findCanonCharacter(
            'Harry Potter',
        )?.id,
        'canon_harry_james_potter',
    );
    assert.equal(
        findCanonCharacter(
            'Harry Potter',
        )?.nameZh,
        '哈利·波特',
    );
    assert.deepEqual(
        findMentionedCanonCharacters(
            '我走到哈利·波特旁边，问他要签名。',
        ).map(actor =>
            actor.id),
        [
            'canon_harry_james_potter',
        ],
    );
    assert.deepEqual(
        findMentionedCanonCharacters(
            'I walk over to Harry Potter.',
        ).map(actor =>
            actor.id),
        [
            'canon_harry_james_potter',
        ],
    );

    const state =
        createSceneTransitionState();
    state.phase = 'playing';
    state.turn.count = 84;
    state.map.activeMapId =
        'hogwarts_castle';
    state.map.currentLocalNodeId =
        'great_hall';
    state.map.currentLevelId =
        'ground';
    state.scene.mapId =
        'hogwarts_castle';
    state.scene.roomId =
        'great_hall';
    state.scene.timelineEntries = [{
        clock: state.clock,
        label: 'Breakfast begins.',
    }];
    state.pacingDirector = {
        status: 'idle',
        pendingBeat: null,
        lastAssessedTurn: 84,
        lastAssessedSceneId:
            state.scene.id,
        reassessAfterTurns: 6,
    };
    const playerAction =
        '我走到哈利·波特旁边，问他要签名。';
    const signals =
        analyzePacingSignals(
            state,
            playerAction,
        );
    assert.equal(
        signals.shouldAssess,
        true,
    );
    assert.equal(
        signals.reasons.includes(
            'explicit_canon_actor_request',
        ),
        true,
    );
    assert.deepEqual(
        signals.metrics
            .explicitCanonActorIds,
        [
            'canon_harry_james_potter',
        ],
    );
    assert.match(
        validatePacingAssessment(
            {
                decision: 'hold',
                diagnosisEn:
                    'The scene can continue.',
                reassessAfterTurns: 3,
                intervention: null,
            },
            state,
            signals,
        ).errors.join('；'),
        /不能继续 hold/u,
    );

    const actorPolicy =
        buildActorSelectionPolicy(
            state,
            playerAction,
        );
    const normalized =
        normalizePacingAssessmentPayload(
            {
                decision: 'intervene',
                diagnosisEn:
                    'The player selected Harry directly.',
                reassessAfterTurns: 3,
                intervention: {
                    kind:
                        'existing_actor_action',
                    timing: 'this_turn',
                    beatEn:
                        'Harry looks up from breakfast when Tina approaches.',
                    pressureEn:
                        'He must answer an unexpected request for an autograph.',
                    arcId: '',
                    actorEntrances: [{
                        id:
                            'canon_harry_james_potter',
                        currentActivityEn:
                            'Eating breakfast at the Gryffindor table.',
                    }],
                    guestActor: null,
                    causalCollapse: null,
                },
            },
            state,
            actorPolicy
                .explicitCanonCandidates,
        );
    assert.equal(
        normalized.intervention.kind,
        'new_actor',
    );
    assert.equal(
        normalized.intervention
            .guestActor.id,
        'canon_harry_james_potter',
    );
    assert.deepEqual(
        normalized.intervention
            .actorEntrances,
        [],
    );
    assert.deepEqual(
        validatePacingAssessment(
            normalized,
            state,
            signals,
        ),
        {
            valid: true,
            errors: [],
        },
    );
    const admitted =
        applyPacingAssessment(
            state,
            normalized,
            signals,
        );
    assert.equal(
        admitted.actors.some(actor =>
            actor.id ===
                'canon_harry_james_potter' &&
            actor.present === true &&
            actor.roomId ===
                'great_hall'),
        true,
    );
    assert.equal(
        admitted.actorLibrary.find(actor =>
            actor.id ===
                'canon_harry_james_potter')
            .source,
        'canon_catalog',
    );
    const admittedProfile =
        admitted.actorLibrary.find(actor =>
            actor.id ===
                'canon_harry_james_potter');
    const admittedActor =
        admitted.actors.find(actor =>
            actor.id ===
                'canon_harry_james_potter');
    assert.equal(
        admittedProfile.name,
        '哈利·波特',
    );
    assert.equal(
        admittedActor.name,
        '哈利·波特',
    );
    assert.equal(
        admittedProfile.aliases.includes(
            'Harry Potter',
        ),
        true,
    );
    assert.equal(
        admittedProfile.aliases.includes(
            '哈利波特',
        ),
        true,
    );
    const reconciledPerformance =
        settleNarrativeTurnPerformance(
            {
                protocolVersion: 2,
                segments: [
                    {
                        type:
                            'narration',
                        textEn:
                            'Harry looks up from his breakfast.',
                    },
                    {
                        type:
                            'dialogue',
                        actorId:
                            'canon_harry_potter',
                        textEn:
                            'I am Harry.',
                    },
                ],
                stateProposals: [{
                    type:
                        'temporary_actor',
                    actor: {
                        id:
                            'canon_harry_potter',
                        nameEn:
                            'Harry Potter',
                        roleEn:
                            'First-year student',
                        publicDescriptionEn:
                            'A small boy with round glasses.',
                        personalityEn:
                            'Quiet and wary.',
                        speechStyleEn:
                            'Brief and hesitant.',
                        currentActivityEn:
                            'Eating breakfast at the Gryffindor table.',
                    },
                }],
            },
            admitted,
            {
                playerAction,
            },
        );
    assert.deepEqual(
        reconciledPerformance
            .temporaryActorEntrances,
        [],
    );
    assert.equal(
        reconciledPerformance
            .segments[1].actorId,
        'canon_harry_james_potter',
    );
    assert.equal(
        reconciledPerformance
            .actorUpdates.some(update =>
                update.id ===
                    'canon_harry_james_potter'),
        true,
    );
    assert.equal(
        reconciledPerformance
            .actorUpdates.some(update =>
                update.id ===
                    'canon_harry_potter'),
        false,
    );

    const legacyNames =
        structuredClone(admitted);
    [
        legacyNames.actorLibrary.find(
            actor =>
                actor.id ===
                'canon_harry_james_potter',
        ),
        legacyNames.actors.find(actor =>
            actor.id ===
                'canon_harry_james_potter'),
    ].forEach(actor => {
        actor.name =
            'Harry James Potter';
        actor.aliases = [
            'Harry James Potter',
        ];
    });
    const reconciled =
        reconcileCanonActorDisplayNames(
            legacyNames,
        );
    assert.equal(
        reconciled.changed,
        true,
    );
    assert.equal(
        reconciled.state.actorLibrary
            .find(actor =>
                actor.id ===
                    'canon_harry_james_potter')
            .name,
        '哈利·波特',
    );
    assert.equal(
        reconciled.state.actors
            .find(actor =>
                actor.id ===
                    'canon_harry_james_potter')
            .aliases.includes(
                '哈利波特',
            ),
        true,
    );
});

test('pacing admits a recognizable companion by stable actor ID', () => {
    const state =
        createSceneTransitionState();
    state.phase = 'playing';
    state.turn.count = 84;
    state.map.activeMapId =
        'hogwarts_castle';
    state.map.currentLocalNodeId =
        'great_hall';
    state.map.currentLevelId =
        'ground';
    state.scene.mapId =
        'hogwarts_castle';
    state.scene.roomId =
        'great_hall';
    state.scene.timelineEntries = [{
        clock: state.clock,
        label: 'Breakfast begins.',
    }];
    state.pacingDirector = {
        status: 'idle',
        pendingBeat: null,
        lastAssessedTurn: 84,
        lastAssessedSceneId:
            state.scene.id,
        reassessAfterTurns: 6,
    };
    const ron =
        findCanonCharacter(
            'canon_ronald_bilius_weasley',
        );
    state.actorLibrary.push(
        normalizeActorMemoryProfile({
            id: ron.id,
            nameEn: ron.nameEn,
            roleEn: 'Student',
            relationshipToPlayerEn:
                'acquaintance',
            publicDescriptionEn:
                'A tall, thin boy with red hair and freckles.',
            personalityEn:
                'Social and loyal.',
            speechStyleEn:
                'Casual and dry.',
            source: 'canon_catalog',
            canonCatalogId:
                ron.id,
            introducedTurn: 44,
        }),
    );
    state.actors.push({
        id: ron.id,
        nameEn: ron.nameEn,
        present: false,
        mapId:
            'hogwarts_castle',
        roomId:
            'first_landing',
        currentActivityEn:
            'Heading down to breakfast.',
        source: 'canon_catalog',
        canonCatalogId:
            ron.id,
    });
    const playerAction =
        '我走到哈利·波特旁边，问他要签名。';
    const signals =
        analyzePacingSignals(
            state,
            playerAction,
        );
    const actorPolicy =
        buildActorSelectionPolicy(
            state,
            playerAction,
        );
    const normalized =
        normalizePacingAssessmentPayload(
            {
                decision: 'intervene',
                diagnosisEn:
                    'Harry and his known companion are both part of the exchange.',
                reassessAfterTurns: 3,
                intervention: {
                    kind: 'new_actor',
                    timing: 'this_turn',
                    beatEn:
                        'Harry looks up while Ron sits beside him at breakfast.',
                    pressureEn:
                        'Harry answers while Ron reacts to the autograph request.',
                    arcId: '',
                    actorEntrances: [
                        {
                            id:
                                'canon_harry_james_potter',
                            currentActivityEn:
                                'Eating toast at the Gryffindor table.',
                        },
                        {
                            id:
                                ron.id,
                            currentActivityEn:
                                'Sitting beside Harry at the Gryffindor table.',
                        },
                    ],
                    guestActor: null,
                    causalCollapse: null,
                },
            },
            state,
            actorPolicy
                .explicitCanonCandidates,
        );
    assert.equal(
        normalized.intervention.kind,
        'mixed',
    );
    assert.equal(
        normalized.intervention
            .guestActor.id,
        'canon_harry_james_potter',
    );
    assert.deepEqual(
        normalized.intervention
            .actorEntrances.map(
                actor =>
                    actor.id,
            ),
        [
            ron.id,
        ],
    );
    assert.deepEqual(
        validatePacingAssessment(
            normalized,
            state,
            signals,
        ),
        {
            valid: true,
            errors: [],
        },
    );
    const admitted =
        applyPacingAssessment(
            state,
            normalized,
            signals,
        );
    assert.equal(
        admitted.actors.find(
            actor =>
                actor.id ===
                    ron.id,
        ).present,
        true,
    );
    assert.equal(
        admitted.actors.find(
            actor =>
                actor.id ===
                    ron.id,
        ).roomId,
        'great_hall',
    );
});

test('actor selection does not treat stale same-scene conversation as long-term pursuit', () => {
    const state =
        createSceneTransitionState();
    state.pacingDirector = {
        pendingBeat: {
            status: 'consumed',
            actorEntrances: [{
                id:
                    'canon_seamus_finnigan',
            }],
        },
    };
    const recentPlayerTurns = [
        {
            actorIds: [
                'canon_seamus_finnigan',
            ],
            sceneId:
                'sorting_queue',
        },
        {
            actorIds: [
                'canon_seamus_finnigan',
            ],
            sceneId:
                'gryffindor_common_room',
        },
        {
            actorIds: [
                'canon_seamus_finnigan',
            ],
            sceneId:
                'gryffindor_common_room',
        },
        {
            actorIds: [
                'canon_lavender_brown',
            ],
            sceneId:
                'girls_dormitory',
        },
        {
            actorIds: [],
            sceneId:
                'girls_dormitory',
        },
        {
            actorIds: [
                'canon_hermione_jean_granger',
            ],
            sceneId:
                'first_morning',
        },
    ];
    const policy =
        buildActorSelectionPolicy(
            state,
            'The explicit address marker has been removed.',
            recentPlayerTurns,
            {
                mode: 'direct',
                attempted: true,
                valid: true,
                actorIds: [
                    'canon_hermione_jean_granger',
                ],
            },
        );

    assert.deepEqual(
        policy.explicitActorIds,
        [
            'canon_hermione_jean_granger',
        ],
    );
    assert.equal(
        policy.pursuedActorIds
            .includes(
                'canon_seamus_finnigan',
            ),
        false,
    );
    assert.equal(
        policy.causalActorIds
            .includes(
                'canon_seamus_finnigan',
            ),
        false,
    );
});

test('localized Canon registry resolves aliases and duplicate identities deterministically', () => {
    const rawIds =
        new Set(
            CANON_CHARACTER_CATALOG
                .map(actor =>
                    actor.id),
        );
    assert.equal(
        CANON_PLAYABLE_CHARACTER_CATALOG
            .length >= 100,
        true,
    );
    assert.equal(
        CANON_PLAYABLE_CHARACTER_CATALOG
            .every(actor =>
                String(
                    actor.nameZh ||
                    '',
                ).trim()),
        true,
    );
    assert.equal(
        new Set(
            CANON_PLAYABLE_CHARACTER_CATALOG
                .map(actor =>
                    actor.id),
        ).size,
        CANON_PLAYABLE_CHARACTER_CATALOG
            .length,
    );
    Object.keys(
        CANON_LOCALIZATION_ZH_CN,
    ).forEach(actorId => {
        assert.equal(
            rawIds.has(actorId),
            true,
            actorId,
        );
        const actor =
            findCanonCharacter(actorId);
        assert.equal(
            actor.id,
            getCanonicalCanonActorId(
                actorId,
            ),
        );
        assert.equal(
            findCanonCharacter(
                CANON_LOCALIZATION_ZH_CN[
                    actorId
                ].nameZh,
            )?.id,
            actor.id,
        );
    });
    Object.entries(
        CANON_IDENTITY_REDIRECTS,
    ).forEach(
        ([sourceId, targetId]) => {
            assert.equal(
                rawIds.has(sourceId),
                true,
            );
            assert.equal(
                rawIds.has(targetId),
                true,
            );
            assert.equal(
                findCanonCharacter(
                    sourceId,
                )?.id,
                targetId,
            );
        },
    );
    assert.equal(
        findCanonCharacter(
            'Albus Dumbledore',
        )?.id,
        'canon_albus_dumbledore',
    );
    assert.equal(
        findCanonCharacter(
            '邓布利多',
        )?.id,
        'canon_albus_dumbledore',
    );
    assert.deepEqual(
        findMentionedCanonCharacters(
            '我去找邓布利多和赫敏，再问问罗恩。',
        ).map(actor =>
            actor.id),
        [
            'canon_albus_dumbledore',
            'canon_ronald_bilius_weasley',
            'canon_hermione_jean_granger',
        ],
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
});

test('offline canon catalog and cast budgets permit bounded additions', () => {
    assert.equal(
        DEFAULT_CAST_POLICY
            .maxStoryActors,
        48,
    );
    assert.equal(
        DEFAULT_CAST_POLICY
            .maxGeneratedGuests,
        12,
    );
    assert.equal(
        CANON_CHARACTER_CATALOG.length,
        723,
    );
    assert.equal(
        findCanonCharacter(
            'Harry James Potter',
        )?.house,
        'Gryffindor',
    );
    assert.equal(
        findCanonCharacter(
            'canon_mr_ollivander',
        )?.nameEn,
        'Mr Ollivander',
    );
    assert.deepEqual(
        findMentionedCanonCharacters(
            'Mr Ollivander watches Tina.',
        ).map(actor => actor.nameEn),
        ['Mr Ollivander'],
    );

    const state =
        createSceneTransitionState();
    state.castPolicy = {
        maxStoryActors: 4,
        maxGeneratedGuests: 1,
    };
    const initial =
        buildStoryCastPolicy(state);
    assert.equal(
        initial.storyActorCount,
        3,
    );
    assert.equal(
        initial.remainingStorySlots,
        1,
    );

    const originalGuest = {
        decision: 'intervene',
        diagnosisEn:
            'A local interruption is useful.',
        reassessAfterTurns: 3,
        intervention: {
            kind: 'new_actor',
            timing: 'this_turn',
            beatEn:
                'A courier enters with a parcel.',
            pressureEn:
                'The parcel needs an owner.',
            arcId: '',
            actorEntrances: [],
            guestActor: {
                id: 'local_courier',
                nameEn: 'Nora Pike',
                roleEn: 'Courier',
                relationshipToPlayerEn:
                    'Newly met stranger',
                publicDescriptionEn:
                    'A hurried witch with a parcel.',
                publicBackgroundEn:
                    'A local delivery worker.',
                personalityEn:
                    'Practical and impatient.',
                speechStyleEn:
                    'Short practical questions.',
                currentActivityEn:
                    'Entering with a parcel.',
                birthDate: '1970-04-09',
                settingTags: [
                    'social',
                    'steady',
                ],
            },
        },
    };
    const withGuest =
        applyPacingAssessment(
            state,
            originalGuest,
        );
    const exhausted =
        buildStoryCastPolicy(withGuest);
    assert.equal(
        exhausted.storyActorCount,
        4,
    );
    assert.equal(
        exhausted.generatedGuestCount,
        1,
    );
    assert.equal(
        validatePacingAssessment(
            {
                ...originalGuest,
                intervention: {
                    ...originalGuest
                        .intervention,
                    guestActor: {
                        ...originalGuest
                            .intervention
                            .guestActor,
                        id: 'second_courier',
                        nameEn:
                            'Mara Pike',
                    },
                },
            },
            withGuest,
        ).valid,
        false,
    );

    const returningActor = {
        decision: 'intervene',
        diagnosisEn:
            'Reuse a known actor.',
        reassessAfterTurns: 3,
        intervention: {
            kind: 'new_actor',
            timing: 'this_turn',
            beatEn:
                'The archivist returns.',
            pressureEn:
                'She asks for an answer.',
            arcId: '',
            actorEntrances: [{
                id: 'old_archivist',
                currentActivityEn:
                    'Entering with her notes.',
            }],
            guestActor: null,
        },
    };
    const returningState =
        structuredClone(withGuest);
    returningState.sceneArchive = [{
        actorIds: [
            'old_archivist',
        ],
    }];
    const normalizedReturningActor =
        normalizePacingAssessmentPayload(
            returningActor,
            returningState,
        );
    assert.equal(
        normalizedReturningActor
            .intervention.kind,
        'existing_actor_action',
    );
    assert.deepEqual(
        validatePacingAssessment(
            normalizedReturningActor,
            returningState,
        ),
        { valid: true, errors: [] },
    );

    const canonState =
        createSceneTransitionState();
    canonState.castPolicy = {
        ...DEFAULT_CAST_POLICY,
        maxStoryActors: 4,
    };
    const canonGuest =
        structuredClone(originalGuest);
    canonGuest.intervention.guestActor = {
        ...canonGuest.intervention
            .guestActor,
        id: 'canon_harry_james_potter',
        nameEn: 'Harry James Potter',
        roleEn:
            'Hogwarts first-year student',
        birthDate: '',
        settingTags: [
            'adventurous',
            'rebellious',
            'compassionate',
            'mysterious',
        ],
    };
    assert.deepEqual(
        validatePacingAssessment(
            canonGuest,
            canonState,
        ),
        { valid: true, errors: [] },
    );
    const withCanon =
        applyPacingAssessment(
            canonState,
            canonGuest,
        );
    assert.equal(
        withCanon.actorLibrary.at(-1)
            .source,
        'canon_catalog',
    );
    assert.equal(
        buildStoryCastPolicy(
            withCanon,
        ).generatedGuestCount,
        0,
    );
});

test('crowded scene transitions recommend named-cast turnover without deleting persistent actors', () => {
    const state =
        createSceneTransitionState();
    const extraProfiles = [
        {
            id: 'peer_alpha',
            nameEn: 'Peer Alpha',
            roleEn: 'Student',
        },
        {
            id: 'peer_beta',
            nameEn: 'Peer Beta',
            roleEn: 'Student',
        },
        {
            id: 'peer_gamma',
            nameEn: 'Peer Gamma',
            roleEn: 'Student',
        },
    ];
    state.actorLibrary.push(
        ...extraProfiles,
    );
    state.actors = [
        ...state.actors,
        ...extraProfiles.map(profile => ({
            ...profile,
            present: true,
            mapId: 'zhang_home',
            roomId: 'kitchen',
            currentActivityEn:
                'Waiting with the group.',
        })),
    ];
    const activeIds =
        state.actors.map(actor =>
            actor.id);
    state.sceneArchive = [
        {
            id: 'repeated_cast_one',
            actorIds: activeIds,
        },
        {
            id: 'repeated_cast_two',
            actorIds: activeIds,
        },
    ];

    const rotation =
        buildSceneCastRotationPolicy(
            state,
            {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'entrance_hall',
            },
        );
    assert.equal(
        rotation.crowdedPublicScene,
        true,
    );
    assert.deepEqual(
        rotation.targetActiveNamedCast,
        {
            min: 2,
            max: 4,
        },
    );
    assert.equal(
        rotation.minimumNamedTurnover,
        2,
    );
    assert.equal(
        rotation
            .highExposureActorIds
            .length,
        activeIds.length,
    );
    assert.equal(
        rotation.anonymousCrowdAllowed,
        true,
    );

    const payload =
        createSceneTransitionPackage();
    payload.nextScene
        .crowdDirectionEn =
        'Wet first-years bunch around the doorway while an unnamed boy fights a collapsing stack of books and two girls compare dripping sleeves.';
    payload.nextScene.actorStates = [
        payload.nextScene
            .actorStates[0],
        {
            id: 'peer_alpha',
            present: true,
            currentActivityEn:
                'Watching the garden gate.',
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive and unharmed.',
            mapId: 'zhang_home',
            roomId:
                'back_garden',
        },
        {
            id: 'peer_beta',
            present: false,
            currentActivityEn:
                'Following the larger group off camera.',
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive and unharmed.',
            mapId: 'zhang_home',
            roomId:
                'back_garden',
        },
    ];
    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
        );
    const committed =
        applySceneTransition(
            state,
            normalized,
            {
                id: state.scene.id,
                status: 'closed',
            },
            {
                tier: 'medium',
            },
        );
    assert.equal(
        committed.scene
            .crowdDirectionEn,
        payload.nextScene
            .crowdDirectionEn,
    );
    assert.deepEqual(
        committed.actors
            .filter(actor =>
                actor.present)
            .map(actor =>
                actor.id)
            .sort(),
        [
            'minerva_mcgonagall',
            'peer_alpha',
        ].sort(),
    );
    assert.equal(
        committed.actorLibrary.some(
            actor =>
                actor.id ===
                    'peer_beta',
        ),
        true,
    );
    const rotatedOut =
        committed.actors.find(actor =>
            actor.id ===
                'peer_beta');
    assert.equal(
        rotatedOut.present,
        false,
    );
    assert.equal(
        rotatedOut.roomId,
        'back_garden',
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
    assert.deepEqual(
        hannah.settingTags,
        [
            'steady',
            'compassionate',
            'cautious',
        ],
    );
    assert.equal(
        hannah.relativeAgeBand,
        'same_age',
    );
    assert.equal(
        hannah.settingTags.includes(
            'adventurous',
        ),
        false,
    );

    const recommendations =
        recommendCanonCharacters({
            worldYear: 1991,
            playerAge: 11,
            storyPreferences: {
                tone: 'adventure',
                relationshipFocus: [
                    'friendship',
                    'rivalry',
                ],
                relativeAgePreference:
                    'peer_focused',
            },
            locationText:
                'Hogwarts Express',
            limit: 30,
        });
    assert.equal(
        recommendations.some(actor =>
            actor.id ===
                'canon_harry_james_potter'),
        true,
    );
    assert.equal(
        recommendations.some(actor =>
            actor.id ===
                'canon_hannah_abbott'),
        false,
    );
    assert.equal(
        recommendations.every(actor =>
            actor.settingTags.some(tag =>
                [
                    'adventurous',
                    'rebellious',
                    'mischievous',
                ].includes(tag))),
        true,
    );
});

test('pacing can commit a mishap without introducing another actor', () => {
    const state = createSceneTransitionState();
    const actorCount = state.actors.length;
    const payload = {
        decision: 'intervene',
        diagnosisEn:
            'The conversation needs physical pressure rather than another arrival.',
        reassessAfterTurns: 3,
        intervention: {
            kind: 'minor_mishap',
            timing: 'this_turn',
            beatEn:
                'The owl reply slips from the table and skids toward the open garden drain.',
            pressureEn:
                'Someone must catch or recover the existing reply before it disappears.',
            arcId: '',
            actorEntrances: [],
            guestActor: null,
        },
    };

    assert.deepEqual(
        validatePacingAssessment(payload, state),
        { valid: true, errors: [] },
    );
    const committed = applyPacingAssessment(
        state,
        payload,
        { reasons: ['long_scene'] },
    );
    assert.equal(committed.actors.length, actorCount);
    assert.equal(
        committed.pacingDirector.pendingBeat.kind,
        'minor_mishap',
    );

    const smuggledGuest = structuredClone(payload);
    smuggledGuest.intervention.guestActor = {
        id: 'unneeded_guest',
        nameEn: 'Unneeded Guest',
        roleEn: 'Bystander',
        relationshipToPlayerEn: 'Stranger',
        publicDescriptionEn: 'A bystander.',
        publicBackgroundEn: 'Passing nearby.',
        personalityEn: 'Ordinary.',
        speechStyleEn: 'Brief.',
        currentActivityEn: 'Entering the garden.',
    };
    const rejected = validatePacingAssessment(
        smuggledGuest,
        state,
    );
    assert.equal(rejected.valid, false);
    assert.match(
        rejected.errors.join('；'),
        /非新人物介入/,
    );
});

test('opening world package rejects the hidden storage narrator as an NPC', () => {
    const character = createDefaultCharacterDraft();
    character.identity.name = 'Tina';
    const foundation = createDirectorFoundation('storage_narrator', 'Hogwarts World Director');
    const opening = {
        chapterEn: 'Opening',
        clock: '1991-07-24 · 09:00',
        scene: {
            nameEn: 'Home',
            summaryEn: 'A letter arrives.',
            explorationHookEn:
                'A teaspoon keeps sliding toward the unopened envelope whenever the breakfast table is nudged.',
            map: {
                id: 'home_map',
                nameEn: 'Home',
                levels: [{ id: 'ground', nameEn: 'Ground', z: 0 }],
                rooms: [
                    { id: 'room_a', nameEn: 'Room A', levelId: 'ground', x: 20, y: 20 },
                    { id: 'room_b', nameEn: 'Room B', levelId: 'ground', x: 80, y: 20 },
                ],
                exits: [{ from: 'room_a', to: 'room_b' }],
                currentRoomId: 'room_a',
            },
        },
        actors: [{
            id: 'storage_narrator',
            nameEn: 'Hogwarts World Director',
            roleEn: 'Narrator',
            relationshipToPlayerEn: 'None',
            currentActivityEn: 'Waiting',
            currentIntentEn: 'Narrate',
        }],
        ...foundation,
        conflict: {
            titleEn: 'Conflict',
            premiseEn: 'Premise',
            immediatePressureEn: 'Pressure',
            stakesEn: 'Stakes',
            incitingEventEn: 'Event',
        },
        agenda: [{ timeLabelEn: 'Now', labelEn: 'Act' }],
        openingBriefEn: 'Brief',
    };
    const result = validateOpeningWorldPackage(opening, character, createDefaultCampaign());
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('后台存档叙事者')));
});

test('director foundation commits a private cast library and a prewritten clue graph', () => {
    const foundation = createDirectorFoundation();
    assert.deepEqual(validateDirectorFoundation(foundation, [{ id: 'tina_mother' }]), {
        valid: true,
        errors: [],
    });
    const base = createInitialWorldState(createDefaultCharacterDraft(), {});
    base.actors = [{ id: 'tina_mother', name: 'Mei Zhang', present: true }];
    const state = applyDirectorFoundation(base, foundation);
    assert.equal(state.actorLibrary[0].publicBackground.includes('documented place'), true);
    assert.equal(state.storyArcs[0].cluePlan.length, 3);
    assert.deepEqual(state.clues, []);
    assert.equal(state.directorFoundation.status, 'ready');
});

test('turn settlement advances at least fifteen minutes and reveals only prewritten clues', () => {
    const foundation = createDirectorFoundation();
    const base = createInitialWorldState(createDefaultCharacterDraft(), {});
    base.clock = '1991-07-24 · 09:15';
    base.actors = [{
        id: 'tina_mother',
        name: 'Mei Zhang',
        currentActivity: 'Holding the letter.',
        currentIntent: 'Wait for Tina.',
        present: true,
    }];
    const state = applyDirectorFoundation(base, foundation);
    const transaction = {
        elapsedMinutes: 1,
        instantaneousMagic: false,
        exceptionReasonEn: '',
        publicEventEn: 'Tina opens the front door.',
        segments: [
            { type: 'narration', textEn: 'The front door opens.' },
            { type: 'dialogue', actorId: 'tina_mother', textEn: 'Stay close to me.' },
        ],
        actorUpdates: [{
            id: 'tina_mother',
            present: true,
            currentActivityEn: 'Standing behind Tina.',
            currentIntentEn: 'Protect Tina.',
        }],
        revealedClues: [{
            id: 'mother_portrait',
            labelEn: 'The altered portrait',
            detailEn: 'A moving edge remains around the mother figure.',
        }],
    };
    const next = applyTurnTransaction(state, transaction, 'I open the door.');
    assert.equal(next.clock, '1991-07-24 · 09:30');
    assert.equal(next.turn.lastElapsedMinutes, 15);
    assert.equal(next.clues[0].id, 'mother_portrait');
    assert.deepEqual(next.storyArcs[0].revealedClueIds, ['mother_portrait']);
    assert.equal(next.actors[0].currentActivity, 'Standing behind Tina.');
});

test('last-turn retry checkpoint restores one non-recursive pre-commit state', () => {
    const state = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    state.phase = 'playing';
    state.clock = '1991-07-24 · 14:35';
    state.turn = {
        count: 19,
        status: 'resolving',
        error: 'stale error',
        lastElapsedMinutes: 15,
        lastResolvedAt: 'earlier',
    };
    state.turnRetry = {
        version: 1,
        baseState: {
            shouldNotNest: true,
        },
    };
    const checkpoint =
        createTurnRetryCheckpoint(
            state,
            {
                playerMessageId: 41,
                assistantMessageId: 42,
                playerAction: 'I enter the shop.',
                forceCheck: true,
            },
        );

    assert.equal(checkpoint.baseClock, state.clock);
    assert.equal(checkpoint.forceCheck, true);
    assert.equal(
        checkpoint.baseState.turn.status,
        'idle',
    );
    assert.equal(
        checkpoint.baseState.turn.error,
        '',
    );
    assert.equal(
        checkpoint.baseState.turnRetry,
        undefined,
    );

    state.clock = '1991-07-24 · 14:50';
    checkpoint.baseState.turn.status = 'failed';
    checkpoint.baseState.turnRetry = {
        shouldBeRemoved: true,
    };
    checkpoint.playerAction =
        '→【后花园】';
    checkpoint.baseState
        .pacingDirector = {
            lastAssessedTurn: 19,
            signals: {
                playerAction:
                    '→【后花园】',
            },
        };
    const restored =
        restoreTurnRetryCheckpoint(
            checkpoint,
        );
    assert.equal(
        restored.clock,
        '1991-07-24 · 14:35',
    );
    assert.equal(restored.turn.status, 'idle');
    assert.equal(restored.turn.error, '');
    assert.equal(restored.turnRetry, undefined);
    assert.equal(
        restored.pacingDirector
            .lastAssessedTurn,
        null,
    );
    assert.notEqual(
        restored,
        checkpoint.baseState,
    );
    assert.throws(
        () => restoreTurnRetryCheckpoint({
            version: 1,
        }),
        /状态检查点/,
    );
    const chat = Array.from(
        {
            length: 43,
        },
        () => ({
            is_user: false,
        }),
    );
    chat[41] = {
        is_user: true,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    };
    chat[42] = {
        is_user: false,
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
            },
        },
    };
    const committedState = {
        ...state,
        turn: {
            ...state.turn,
            status: 'idle',
        },
        turnRetry: checkpoint,
    };
    assert.equal(
        getAvailableTurnRollbackCheckpoint(
            committedState,
            chat,
        ),
        checkpoint,
    );
    chat.push({
        is_user: false,
    });
    assert.equal(
        getAvailableTurnRollbackCheckpoint(
            committedState,
            chat,
        ),
        null,
    );
});

test('legacy rollback checkpoint projects the previous committed turn', () => {
    const state =
        createSceneTransitionState();
    state.clock =
        '1991-07-24 · 11:45';
    state.turn = {
        count: 2,
        status: 'idle',
        error: '',
        lastElapsedMinutes: 15,
    };
    state.map.currentLocalNodeId =
        'back_garden';
    state.scene.roomId =
        'back_garden';
    state.scene.timelineEntries = [
        {
            clock:
                '1991-07-24 · 11:30',
            label:
                'The previous turn.',
        },
        {
            clock:
                '1991-07-24 · 11:45',
            label:
                'The latest turn.',
        },
    ];
    state.spatial = {
        version: 7,
        player: {
            mapId:
                'zhang_home',
            roomId:
                'back_garden',
        },
        lastMovement: {
            attempted: true,
            moved: true,
            fromMapId:
                'zhang_home',
            fromRoomId:
                'kitchen',
            fromRoomName:
                '厨房',
            toMapId:
                'zhang_home',
            toRoomId:
                'back_garden',
            companionIds: [
                'minerva_mcgonagall',
            ],
        },
    };
    const minerva =
        state.actors.find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    minerva.mapId =
        'zhang_home';
    minerva.roomId =
        'back_garden';
    const chat = [
        {
            is_user: false,
            send_date:
                'previous',
            extra: {
                hogwartsMud: {
                    role:
                        'scene_turn',
                    turnTransaction: {
                        committedClock:
                            '1991-07-24 · 11:30',
                        elapsedMinutes:
                            15,
                        actorPresence: {
                            presentActorIdsAfterTurn: [
                                'minerva_mcgonagall',
                            ],
                        },
                        actorUpdates: [{
                            id:
                                'minerva_mcgonagall',
                            mapId:
                                'zhang_home',
                            roomId:
                                'kitchen',
                            currentActivityEn:
                                'Waiting in the kitchen.',
                        }],
                    },
                },
            },
        },
        {
            is_user: true,
            mes:
                '→【和麦格一起去后花园】',
            extra: {
                hogwartsMud: {
                    role:
                        'player_turn',
                    movement: {
                        attempted: true,
                        moved: false,
                        toMapId:
                            'zhang_home',
                        toRoomId:
                            'back_garden',
                    },
                },
            },
        },
        {
            is_user: false,
            extra: {
                hogwartsMud: {
                    role:
                        'scene_turn',
                    turnTransaction: {
                        committedClock:
                            '1991-07-24 · 11:45',
                        elapsedMinutes:
                            15,
                        actorPresence: {
                            presentActorIdsAfterTurn: [
                                'minerva_mcgonagall',
                            ],
                        },
                        actorUpdates: [],
                    },
                },
            },
        },
    ];

    const checkpoint =
        createLegacyTurnRollbackCheckpoint(
            state,
            chat,
        );
    assert.equal(
        checkpoint.source,
        'legacy_projection',
    );
    assert.equal(
        checkpoint.baseState.clock,
        '1991-07-24 · 11:30',
    );
    assert.equal(
        checkpoint.baseState
            .turn.count,
        1,
    );
    assert.equal(
        checkpoint.baseState.map
            .currentLocalNodeId,
        'kitchen',
    );
    assert.equal(
        checkpoint.baseState.actors
            .find(actor =>
                actor.id ===
                    'minerva_mcgonagall')
            .roomId,
        'kitchen',
    );
});

test('a failed trailing player turn remains recoverable without duplicating the input', () => {
    const playerMessage = {
        is_user: true,
        mes: 'I wait for the Hat.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck: true,
            },
        },
    };
    const chat = [
        {
            is_user: false,
            mes: 'The Hat begins to sing.',
            extra: {
                hogwartsMud: {
                    role: 'scene_turn',
                },
            },
        },
        playerMessage,
    ];
    assert.deepEqual(
        getFailedPlayerTurn(
            chat,
            {
                status: 'failed',
                error: 'Invalid JSON.',
            },
        ),
        {
            messageId: 1,
            playerAction:
                'I wait for the Hat.',
            forceCheck: true,
            error: 'Invalid JSON.',
        },
    );
    assert.equal(
        getFailedPlayerTurn(
            chat,
            { status: 'idle' },
        ),
        null,
    );
    assert.equal(
        getFailedPlayerTurn(
            [
                ...chat,
                {
                    is_user: false,
                    extra: {
                        hogwartsMud: {
                            role: 'scene_turn',
                        },
                    },
                },
            ],
            {
                status: 'failed',
                error: 'stale',
            },
        ),
        null,
    );
});

test('unsettled turn detection never replays an idle completed legacy assistant message', () => {
    const playerMessage = {
        is_user: true,
        mes: 'I wait for the Hat.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck: true,
            },
        },
    };
    const completedLegacyReply = {
        is_user: false,
        is_system: false,
        mes: 'The Hat finishes its answer.',
        extra: {},
    };
    const chat = [
        playerMessage,
        completedLegacyReply,
    ];

    assert.equal(
        findUnsettledTurn(
            chat,
            {
                status: 'idle',
            },
        ),
        null,
    );
    assert.deepEqual(
        findUnsettledTurn(
            chat,
            {
                status:
                    'resolving',
            },
        ),
        {
            playerMessageId: 0,
            assistantMessageId: 1,
            playerAction:
                'I wait for the Hat.',
            forceCheck: true,
        },
    );
});

test('unsettled turn detection resumes only an explicit trailing player turn', () => {
    const pending = {
        is_user: true,
        mes: 'I try the feather again.',
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck: false,
            },
        },
    };

    assert.deepEqual(
        findUnsettledTurn(
            [pending],
            {
                status: 'idle',
            },
        ),
        {
            playerMessageId: 0,
            assistantMessageId:
                null,
            playerAction:
                'I try the feather again.',
            forceCheck: false,
        },
    );
    assert.equal(
        findUnsettledTurn(
            [pending],
            {
                status: 'failed',
            },
        ),
        null,
    );
    assert.equal(
        findUnsettledTurn(
            [{
                ...pending,
                extra: {},
            }],
            {
                status: 'idle',
            },
        ),
        null,
    );
});

test('turn settlement records important possessions and filters incidental consumables', () => {
    const foundation =
        createDirectorFoundation();
    const base = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    base.phase = 'playing';
    base.clock = '1991-07-24 · 16:10';
    base.map.activeMapId =
        'diagon_alley';
    base.map.currentLocalNodeId =
        'ollivanders';
    base.actors = [{
        id: 'tina_mother',
        present: true,
        currentActivityEn:
            'Watching the purchase.',
        mapId: 'diagon_alley',
        roomId: 'ollivanders',
    }];
    const state = applyDirectorFoundation(
        base,
        foundation,
    );
    const transaction = {
        elapsedMinutes: 15,
        publicEventEn:
            'Ollivander completed the purchase and the holly wand now belongs to Tina.',
        segments: [{
            type: 'narration',
            textEn:
                'The boxed holly wand passed across the counter into Tina\'s possession.',
        }],
        actorUpdates: [],
        itemUpdates: [{
            id: 'holly_phoenix_wand',
            action: 'acquire',
            labelEn: 'Holly Wand',
            detailEn:
                'Twelve and a quarter inches with a phoenix feather core.',
            importance: 'key',
            custody: 'carried',
            ownerId: 'player',
            status: 'available',
        }],
        revealedClues: [],
    };
    const next = applyTurnTransaction(
        state,
        transaction,
        'I accept the wand.',
    );
    assert.equal(next.items.length, 1);
    assert.equal(
        next.items[0].custody,
        'carried',
    );
    assert.equal(
        next.items[0].roomId,
        'ollivanders',
    );

    const missingWand =
        structuredClone(transaction);
    missingWand.itemUpdates = [];
    assert.throws(
        () => applyTurnTransaction(
            state,
            missingWand,
            'I accept the wand.',
        ),
        /必须提交 acquire itemUpdate/,
    );

    const food = {
        ...transaction,
        publicEventEn:
            'Tina bought and ate a caramel pasty.',
        segments: [{
            type: 'narration',
            textEn:
                'The pasty was gone before she left the cart.',
        }],
        itemUpdates: [{
            id: 'caramel_pasty',
            action: 'acquire',
            labelEn: 'Caramel Pasty',
            detailEn: 'A warm street snack.',
            importance: 'ordinary',
            custody: 'carried',
            ownerId: 'player',
        }],
    };
    assert.throws(
        () => applyTurnTransaction(
            state,
            food,
            'I eat the pasty.',
        ),
        /明确要求保留或携带/,
    );
    const kept = applyTurnTransaction(
        state,
        food,
        'I keep the pasty in my bag.',
    );
    assert.equal(
        kept.items[0].id,
        'caramel_pasty',
    );
});

test('low-tier turn updates an actor impression and tiered shared memory', () => {
    const foundation = createDirectorFoundation();
    const base = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    base.clock = '1991-07-24 · 09:15';
    base.phase = 'playing';
    base.actors = [{
        id: 'tina_mother',
        name: 'Mei Zhang',
        currentActivity: 'Watching Tina.',
        present: true,
    }];
    const state = applyDirectorFoundation(
        base,
        foundation,
    );
    const transaction = {
        elapsedMinutes: 15,
        publicEventEn:
            'Tina defends the family letter and refuses to surrender it.',
        segments: [{
            type: 'narration',
            textEn:
                'Tina folds the letter against her chest.',
        }],
        actorUpdates: [{
            id: 'tina_mother',
            present: true,
            currentActivityEn:
                'Watching Tina hold the letter.',
            impressionOfPlayerEn:
                'My stubborn, fiercely protective child.',
            impressionOfPlayer:
                '我那倔强、护东西护得要命的孩子。',
            memoryUpdate: {
                summaryEn:
                    'Tina refused to surrender the Hogwarts letter when challenged.',
                summary:
                    '蒂娜在受到质疑时拒绝交出霍格沃茨来信。',
                significance: 'notable',
                lastingImpactEn:
                    'Her refusal establishes the letter as a boundary she will defend.',
                lastingImpact:
                    '她的拒绝表明这封信是她会坚持守住的底线。',
            },
        }],
        revealedClues: [],
    };
    const next = applyTurnTransaction(
        state,
        transaction,
        '我把信护在怀里。',
    );
    const profile = next.actorLibrary.find(
        actor => actor.id === 'tina_mother',
    );
    assert.equal(
        profile.impressionOfPlayerEn,
        transaction.actorUpdates[0]
            .impressionOfPlayerEn,
    );
    assert.equal(
        profile.sharedMemories.recent.length,
        0,
    );
    assert.equal(
        profile.sharedMemories.everyday.length,
        1,
    );
    assert.equal(
        profile.sharedMemories.everyday[0].source,
        'low',
    );
    assert.equal(
        profile.sharedMemories.everyday[0]
            .significance,
        'notable',
    );
    assert.equal(
        next.actors[0].impressionOfPlayer,
        transaction.actorUpdates[0]
            .impressionOfPlayer,
    );
});

test('legacy relationship migration backfills witnessed turn memories', () => {
    const state = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    delete state.relationshipMemoryVersion;
    state.turn.count = 5;
    const foundation = createDirectorFoundation();
    state.actorLibrary = [
        {
            ...foundation.actorLibrary[0],
            relationshipToPlayerEn:
                'Newly met stranger',
            impressionOfPlayerEn:
                'Newly met stranger',
            sharedMemories: {
                core: [],
                recent: [{
                    id: 'old_low_recent',
                    summaryEn:
                        'Tina complained about an ordinary shopping delay.',
                    source: 'low',
                }],
                everyday: [],
            },
        },
        foundation.actorLibrary[1],
    ];
    state.actors = [
        {
            id: 'tina_mother',
            relationshipToPlayerEn:
                'Newly met stranger',
            impressionOfPlayerEn:
                'Newly met stranger',
            present: true,
        },
        {
            id: 'minerva_mcgonagall',
            present: true,
        },
    ];
    const chat = [{
        extra: {
            hogwartsMud: {
                turnTransaction: {
                    publicEventEn:
                        'Tina offered Mei the first piece of treacle tart.',
                    publicEvent:
                        '蒂娜把第一块糖浆馅饼递给了梅。',
                    committedClock:
                        '1991-07-24 · 09:30',
                    segments: [{
                        type: 'dialogue',
                        actorId: 'tina_mother',
                        textEn:
                            'You saved the first piece for me?',
                        textZh:
                            '你把第一块留给我了？',
                    }],
                    actorUpdates: [{
                        id: 'minerva_mcgonagall',
                        currentActivityEn:
                            'Reading paperwork elsewhere.',
                    }],
                },
            },
        },
    }];
    const migrated =
        migrateRelationshipMemoryState(state, chat);
    const profile = migrated.state.actorLibrary[0];
    assert.equal(migrated.changed, true);
    assert.equal(
        migrated.state.relationshipMemoryVersion,
        6,
    );
    assert.equal(
        profile.sharedMemories.everyday.length,
        2,
    );
    assert.equal(
        profile.sharedMemories.recent.length,
        0,
    );
    assert.match(
        profile.impressionOfPlayerEn,
        /deciding what to make/i,
    );
    assert.equal(
        migrated.state.memoryDirector
            .lastReviewedTurn,
        5,
    );
    assert.match(
        profile.sharedMemories.everyday
            .find(memory =>
                /first piece/i.test(
                    memory.summaryEn))
            .summaryEn,
        /first piece/i,
    );
    assert.equal(
        migrated.state.actorLibrary[1]
            .sharedMemories.everyday.length,
        0,
    );
});

test('established family and friends receive a background impression', () => {
    const father = normalizeActorMemoryProfile({
        id: 'alex_zhang',
        relationshipToPlayerEn: 'Father',
    });
    const friend = normalizeActorMemoryProfile({
        id: 'childhood_friend',
        relationshipToPlayerEn:
            'Childhood friend',
    });
    assert.match(
        father.impressionOfPlayerEn,
        /troublesome daughter/i,
    );
    assert.match(
        father.impressionOfPlayer,
        /不省心/,
    );
    assert.match(
        friend.impressionOfPlayerEn,
        /difficult friend/i,
    );
});

test('memory consolidation waits for a low-tier event boundary instead of a turn count', () => {
    const state = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    state.phase = 'playing';
    state.scene = {
        id: 'memory_scene',
    };
    state.turn.count = 10;
    state.actorLibrary = [{
        ...createDirectorFoundation()
            .actorLibrary[0],
        sharedMemories: {
            core: [],
            recent: [],
            everyday: Array.from(
                { length: 6 },
                (_, index) => ({
                    id: `daily_${index}`,
                    summaryEn:
                        `Shared ordinary moment ${index}.`,
                    updatedTurn: index + 1,
                }),
            ),
        },
    }];
    assert.equal(
        analyzeMemoryConsolidation(state)
            .shouldReview,
        false,
    );
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:9',
            status: 'pending',
            sceneId: state.scene.id,
            turn: 9,
        };
    assert.equal(
        analyzeMemoryConsolidation(state)
            .shouldReview,
        false,
    );
    state.turn.count = 99;
    assert.equal(
        analyzeMemoryConsolidation(state)
            .shouldReview,
        false,
    );
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:10',
            status: 'pending',
            sceneId: state.scene.id,
            turn: 10,
        };
    assert.equal(
        analyzeMemoryConsolidation(state)
            .shouldReview,
        true,
    );
    state.memoryDirector
        .pendingEventBoundary.status =
        'failed';
    assert.equal(
        analyzeMemoryConsolidation(state)
            .shouldReview,
        false,
    );
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:11',
            status: 'pending',
            sceneId: state.scene.id,
            turn: 11,
        };
    state.actorLibrary[0]
        .sharedMemories.everyday = [
            {
                id: 'single_event_memory',
                summaryEn:
                    'A bounded event ended.',
                updatedTurn: 11,
            },
        ];
    assert.equal(
        analyzeMemoryConsolidation(state)
            .shouldReview,
        true,
    );
});

test('an ended low-tier event queues one memory consolidation boundary', () => {
    const state =
        createSceneTransitionState();
    state.turn.count = 9;
    state.memoryDirector
        .lastReviewedTurn = 0;
    const transaction = {
        elapsedMinutes: 15,
        eventEnded: true,
        publicEventEn:
            'McGonagall ends the argument after Tina offers a difficult apology.',
        segments: [{
            type: 'narration',
            textEn:
                'The argument ends and both step back from the kitchen table.',
        }],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            memoryUpdate: {
                summaryEn:
                    'Tina ended an argument with a difficult apology.',
                significance:
                    'notable',
                lastingImpactEn:
                    'McGonagall now knows Tina can retreat from a conflict without being forced.',
            },
        }],
        itemUpdates: [],
        revealedClues: [],
    };
    const committed =
        applyTurnTransaction(
            state,
            transaction,
            'I apologise and end the argument.',
        );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary.status,
        'pending',
    );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary.turn,
        committed.turn.count,
    );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary
            .intentRefreshed,
        false,
    );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary
            .intentRefreshStatus,
        'pending',
    );
    assert.equal(
        analyzeMemoryConsolidation(
            committed,
        ).shouldReview,
        true,
    );

    const ongoing =
        applyTurnTransaction(
            state,
            {
                ...transaction,
                eventEnded: false,
            },
            'I keep arguing.',
        );
    assert.equal(
        ongoing.memoryDirector
            .pendingEventBoundary,
        null,
    );
});

test('an event boundary refreshes direction even without reviewable memory', () => {
    const state =
        createSceneTransitionState();
    state.turn.count = 4;
    state.memoryDirector
        .lastReviewedTurn = 4;
    state.actorLibrary =
        state.actorLibrary.map(actor => ({
            ...actor,
            sharedMemories: {
                core: [],
                recent: [],
                everyday: [],
            },
        }));
    const committed =
        applyTurnTransaction(
            state,
            {
                elapsedMinutes: 15,
                eventEnded: true,
                publicEventEn:
                    'The bounded conversation ends without creating a lasting shared memory.',
                segments: [{
                    type: 'narration',
                    textEn:
                        'The conversation reaches a natural stopping point.',
                }],
                actorUpdates: [],
                itemUpdates: [],
                revealedClues: [],
            },
            'I let the conversation end.',
        );

    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary
            .intentRefreshStatus,
        'pending',
    );
    assert.equal(
        committed.memoryDirector
            .pendingEventBoundary
            .hasUnreviewedMemory,
        false,
    );
    assert.equal(
        analyzeMemoryConsolidation(
            committed,
        ).shouldReview,
        false,
    );
});

test('Social Graph v2 migrates Tina-sized legacy data without moving cursors or memory cooldowns', () => {
    const namedActorIds = [
        'canon_harry_james_potter',
        'canon_ronald_bilius_weasley',
        'canon_lavender_brown',
        'canon_filius_flitwick',
        'canon_hermione_jean_granger',
    ];
    const sourceActorIds = [
        ...namedActorIds,
        ...Array.from(
            { length: 28 },
            (_, index) =>
                `tina_known_actor_${index + 1}`,
        ),
    ];
    const legacyTypes = [
        'met',
        'trust',
        'affinity',
        'tension',
        'protectiveness',
    ];
    const relationshipEvidence =
        Array.from(
            { length: 91 },
            (_, index) => ({
                id:
                    `tina_relationship_evidence_${index + 1}`,
                sourceActorId:
                    sourceActorIds[
                        index %
                        sourceActorIds.length
                    ],
                targetActorId: 'player',
                type:
                    legacyTypes[
                        index %
                        legacyTypes.length
                    ],
                weightDelta:
                    index % 3 === 0
                        ? -1
                        : 1,
                summaryEn:
                    `Observed social event ${index + 1}.`,
                witnessedBy: ['player'],
                sourceMessageIds: [
                    100 + index,
                ],
                sceneId:
                    `tina_scene_${Math.floor(index / 7)}`,
                turn: index + 1,
            }),
        );
    const relationships =
        sourceActorIds.map(
            (sourceActorId, index) => ({
                id:
                    `relationship_${sourceActorId}_player`,
                sourceActorId,
                targetActorId: 'player',
                familiarity: 55 + index,
                trust:
                    (index % 7) * 6 - 12,
                affinity:
                    (index % 5) * 10 - 10,
                tension: index % 20,
                protectiveness:
                    (index % 4) * 5,
                evidenceIds:
                    relationshipEvidence
                        .filter(evidence =>
                            evidence
                                .sourceActorId ===
                            sourceActorId)
                        .map(evidence =>
                            evidence.id),
            }),
        );
    const state = {
        turn: {
            count: 91,
        },
        socialGraph: {
            version: 1,
            extractorVersion: 5,
            statements: [],
            relationshipEvidence,
            relationships,
            lastProcessedMessageId: 190,
            lastRunSceneId:
                'first_charms_lesson',
            lastRunTurn: 91,
            lastRunClock:
                '1991-09-06 · 10:32',
            backfilledSceneIds: [
                'hogwarts_express',
            ],
            backfillPendingSceneId: '',
            status: 'ready',
            error: '',
        },
        memoryDirector: {
            lastReviewedTurn: 84,
            reviewAfterTurns: 14,
            nextEligibleTurn: 98,
            pendingEventBoundary: {
                id: 'charms_lesson_boundary',
                status: 'pending',
            },
        },
    };
    const original =
        structuredClone(state);
    const migratedGraph =
        normalizeSocialGraph(
            state.socialGraph,
        );
    const migratedState = {
        ...state,
        socialGraph: migratedGraph,
    };

    assert.deepEqual(state, original);
    assert.equal(
        migratedGraph.version,
        SOCIAL_GRAPH_VERSION,
    );
    assert.equal(
        migratedGraph
            .relationshipEvidence.length,
        91,
    );
    assert.equal(
        migratedGraph.relationships.length,
        33,
    );
    assert.deepEqual(
        migratedGraph
            .relationshipEvidence
            .map(evidence => evidence.id),
        relationshipEvidence
            .map(evidence => evidence.id),
    );
    assert.deepEqual(
        migratedGraph.relationships
            .map(edge => edge.id),
        relationships.map(edge => edge.id),
    );
    assert.equal(
        migratedGraph
            .lastProcessedMessageId,
        original.socialGraph
            .lastProcessedMessageId,
    );
    assert.deepEqual(
        migratedState.memoryDirector,
        original.memoryDirector,
    );
    assert.deepEqual(
        migratedState.turn,
        original.turn,
    );
    for (const actorId of namedActorIds) {
        const legacyEdge =
            relationships.find(edge =>
                edge.sourceActorId ===
                actorId);
        const migratedEdge =
            migratedGraph.relationships
                .find(edge =>
                    edge.sourceActorId ===
                    actorId);
        const expectedCloseness = Math.min(
            legacyEdge.familiarity,
            Math.round(
                Math.max(
                    0,
                    legacyEdge.affinity,
                ) * 0.45 +
                Math.max(
                    0,
                    legacyEdge.trust,
                ) * 0.35 +
                legacyEdge
                    .protectiveness * 0.20,
            ),
        );
        assert.equal(
            migratedEdge.warmth,
            legacyEdge.affinity,
        );
        assert.equal(
            Object.hasOwn(
                migratedEdge,
                'affinity',
            ),
            false,
        );
        assert.equal(
            migratedEdge.closeness,
            expectedCloseness,
        );
        assert.equal(
            migratedEdge.respect,
            0,
        );
        assert.equal(
            migratedEdge.influence,
            0,
        );
        assert.equal(
            migratedEdge.resentment,
            0,
        );
        assert.equal(
            migratedEdge.fear,
            0,
        );
    }
    const migratedAffinityEvidence =
        migratedGraph
            .relationshipEvidence
            .find(evidence =>
                evidence.id ===
                'tina_relationship_evidence_3');
    assert.deepEqual(
        migratedAffinityEvidence
            .dimensionDeltas,
        [{
            dimension: 'warmth',
            delta: 8,
            impact: 'major',
        }],
    );
    assert.equal(
        migratedAffinityEvidence.eventKind,
        'other',
    );
    assert.equal(
        Object.hasOwn(
            migratedAffinityEvidence,
            'type',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            migratedAffinityEvidence,
            'weightDelta',
        ),
        false,
    );
    assert.deepEqual(
        normalizeSocialGraph(
            migratedGraph,
        ),
        migratedGraph,
    );
    const loadedMigration =
        migrateLoadedSocialGraph(
            state.socialGraph,
            {
                chatLength: 191,
                sceneId:
                    'first_charms_lesson',
            },
        );
    assert.equal(
        loadedMigration
            .cursorAtTail,
        true,
    );
    assert.equal(
        loadedMigration
            .migrationRequired,
        true,
    );
    assert.equal(
        loadedMigration
            .allowAutomaticModelWork,
        false,
    );
    assert.equal(
        loadedMigration.graph
            .extractorVersion,
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
    );
    assert.equal(
        loadedMigration.graph
            .lastProcessedMessageId,
        190,
    );
    assert.equal(
        loadedMigration.graph
            .relationshipEvidence
            .length,
        91,
    );
    assert.equal(
        loadedMigration.graph
            .relationships.length,
        33,
    );
    assert.equal(
        loadedMigration.graph
            .backfillPendingSceneId,
        '',
    );
    assert.equal(
        loadedMigration.graph
            .status,
        'ready',
    );
    assert.deepEqual(
        state,
        original,
    );
});

test('loaded social graph defers catch-up until after a behind cursor receives its local metadata migration', () => {
    const legacy = {
        version: 1,
        extractorVersion:
            SOCIAL_GRAPH_EXTRACTOR_VERSION -
            1,
        statements: [],
        relationshipEvidence: [],
        relationships: [],
        lastProcessedMessageId: 190,
        status: 'ready',
    };
    const firstLoad =
        migrateLoadedSocialGraph(
            legacy,
            {
                chatLength: 192,
                sceneId:
                    'first_charms_lesson',
            },
        );

    assert.equal(
        firstLoad.cursorAtTail,
        false,
    );
    assert.equal(
        firstLoad.migrationRequired,
        true,
    );
    assert.equal(
        firstLoad
            .allowAutomaticModelWork,
        false,
    );
    assert.equal(
        firstLoad.graph
            .extractorVersion,
        SOCIAL_GRAPH_EXTRACTOR_VERSION,
    );
    assert.equal(
        firstLoad.graph
            .backfillPendingSceneId,
        'first_charms_lesson',
    );
    assert.equal(
        firstLoad.graph.status,
        'pending',
    );

    const laterLoad =
        migrateLoadedSocialGraph(
            firstLoad.graph,
            {
                chatLength: 192,
                sceneId:
                    'first_charms_lesson',
            },
        );
    assert.equal(
        laterLoad.migrationRequired,
        false,
    );
    assert.equal(
        laterLoad
            .allowAutomaticModelWork,
        true,
    );
    assert.equal(
        laterLoad.graph
            .lastProcessedMessageId,
        190,
    );
    assert.equal(
        laterLoad.graph
            .backfillPendingSceneId,
        'first_charms_lesson',
    );
});

test('Social Graph v2 normalizes long-term dimensions, appraisals, active emotions, and structural tags', () => {
    const graph = normalizeSocialGraph({
        version: 2,
        relationshipEvidence: [{
            id: 'flitwick_feedback',
            sourceActorId:
                'canon_filius_flitwick',
            targetActorId: 'player',
            eventKind: 'other',
            dimensionDeltas: [
                {
                    dimension: 'respect',
                    delta: 5,
                    impact: 'meaningful',
                },
                {
                    dimension:
                        'unsupported_dimension',
                    delta: 99,
                    impact: 'defining',
                },
            ],
            emotionAppraisals: [
                {
                    emotion: 'admiration',
                    intensity: 5,
                },
                {
                    emotion: 'hope',
                    intensity: 3,
                },
                {
                    emotion: 'relief',
                    intensity: 2,
                },
                {
                    emotion: 'joy',
                    intensity: 4,
                },
                {
                    emotion: 'gratitude',
                    intensity: 5,
                },
            ],
            structuralTags: [
                'authority',
                'classmate',
            ],
            sourceMessageIds: [401],
            turn: 91,
        }],
        relationships: [{
            id: 'flitwick_player',
            sourceActorId:
                'canon_filius_flitwick',
            targetActorId: 'player',
            familiarity: 45,
            closeness: 20,
            warmth: 18,
            trust: 12,
            respect: 42,
            influence: 24,
            tension: 5,
            resentment: 0,
            fear: 38,
            protectiveness: 8,
            structuralTags: ['mentor'],
            evidenceIds: [
                'flitwick_feedback',
            ],
        }],
    });
    const evidence =
        graph.relationshipEvidence[0];
    const edge = graph.relationships[0];

    assert.deepEqual(
        SOCIAL_RELATIONSHIP_DIMENSIONS,
        [
            'familiarity',
            'closeness',
            'warmth',
            'trust',
            'respect',
            'influence',
            'tension',
            'resentment',
            'fear',
            'protectiveness',
        ],
    );
    assert.equal(
        SOCIAL_RELATIONSHIP_EMOTIONS
            .includes('admiration'),
        true,
    );
    assert.deepEqual(
        SOCIAL_RELATIONSHIP_STRUCTURAL_TAGS,
        [
            'family',
            'authority',
            'classmate',
            'rivalry',
            'mentor',
        ],
    );
    assert.deepEqual(
        evidence.dimensionDeltas,
        [{
            dimension: 'respect',
            delta: 5,
            impact: 'meaningful',
        }],
    );
    assert.equal(
        evidence.emotionAppraisals.length,
        4,
    );
    assert.deepEqual(
        evidence.emotionAppraisals
            .map(appraisal =>
                appraisal.sourceMessageIds),
        [
            [401],
            [401],
            [401],
            [401],
        ],
    );
    assert.deepEqual(
        edge.structuralTags,
        [
            'mentor',
            'authority',
            'classmate',
        ],
    );
    assert.deepEqual(
        edge.activeEmotions
            .map(emotion => ({
                emotion: emotion.emotion,
                intensity:
                    emotion.intensity,
                sourceEvidenceId:
                    emotion
                        .sourceEvidenceId,
            })),
        [
            {
                emotion: 'admiration',
                intensity: 5,
                sourceEvidenceId:
                    'flitwick_feedback',
            },
            {
                emotion: 'hope',
                intensity: 3,
                sourceEvidenceId:
                    'flitwick_feedback',
            },
            {
                emotion: 'relief',
                intensity: 2,
                sourceEvidenceId:
                    'flitwick_feedback',
            },
            {
                emotion: 'joy',
                intensity: 4,
                sourceEvidenceId:
                    'flitwick_feedback',
            },
        ],
    );
    assert.deepEqual(
        deriveRelationshipLabels(edge)
            .slice(0, 3),
        [
            '敬畏的导师',
            '敬畏',
            '熟人',
        ],
    );
});

test('Social Graph v2 removes legacy compatibility fields without changing IDs or provenance', () => {
    const graph = normalizeSocialGraph({
        version: 2,
        relationshipEvidence: [{
            id: 'v2_compatibility_evidence',
            sourceActorId:
                'canon_ronald_bilius_weasley',
            targetActorId: 'player',
            type: 'met',
            weightDelta: 1,
            affinity: 50,
            dimensionDeltas: [{
                dimension: 'familiarity',
                delta: 12,
                impact: 'major',
            }],
            structuralTags: [],
            emotionAppraisals: [],
            sceneId: 'compatibility_scene',
            sourceMessageIds: [77],
            witnessedBy: ['player'],
        }],
        relationships: [{
            id: 'v2_compatibility_edge',
            sourceActorId:
                'canon_ronald_bilius_weasley',
            targetActorId: 'player',
            familiarity: 12,
            closeness: 3,
            warmth: 7,
            affinity: 99,
            trust: 0,
            respect: 0,
            influence: 0,
            tension: 0,
            resentment: 0,
            fear: 0,
            protectiveness: 0,
            structuralTags: [],
            activeEmotions: [],
            evidenceIds: [
                'v2_compatibility_evidence',
            ],
        }],
    });
    const evidence =
        graph.relationshipEvidence[0];
    const edge = graph.relationships[0];

    assert.equal(
        evidence.id,
        'v2_compatibility_evidence',
    );
    assert.equal(
        evidence.sceneId,
        'compatibility_scene',
    );
    assert.deepEqual(
        evidence.sourceMessageIds,
        [77],
    );
    assert.deepEqual(
        evidence.witnessedBy,
        ['player'],
    );
    assert.equal(
        evidence.eventKind,
        'introduction',
    );
    assert.equal(edge.warmth, 7);
    assert.equal(edge.closeness, 3);
    for (const value of [
        evidence,
        edge,
        buildSocialAudienceProjection(
            {
                socialGraph: graph,
            },
            'player',
        ),
        buildPlayerKnownRelationshipProjection({
            socialGraph: graph,
        }),
    ]) {
        assert.equal(
            JSON.stringify(value)
                .includes('"affinity"'),
            false,
        );
        assert.equal(
            JSON.stringify(value)
                .includes('"weightDelta"'),
            false,
        );
    }
});

test('Social Graph v2 deterministically decays and expires active emotions from the current turn', () => {
    const source = {
        version: 2,
        relationshipEvidence: [],
        relationships: [{
            id: 'ron_player_emotion',
            sourceActorId:
                'canon_ronald_bilius_weasley',
            targetActorId: 'player',
            familiarity: 20,
            closeness: 10,
            warmth: 5,
            trust: 0,
            respect: 0,
            influence: 0,
            tension: 0,
            resentment: 0,
            fear: 0,
            protectiveness: 0,
            structuralTags: [],
            activeEmotions: [{
                emotion: 'gratitude',
                intensity: 3,
                sourceEvidenceId:
                    'ron_thanks_player',
                sourceMessageIds: [410],
                witnessedBy: ['player'],
                updatedTurn: 20,
                updatedClock:
                    '1991-09-06 · 10:32',
            }],
            evidenceIds: [
                'ron_thanks_player',
            ],
        }],
    };
    const decayed = normalizeSocialGraph(
        source,
        {
            currentTurn: 22,
        },
    );

    assert.equal(
        decayed.relationships[0]
            .activeEmotions[0]
            .intensity,
        1,
    );
    assert.deepEqual(
        normalizeSocialGraph(
            decayed,
            {
                currentTurn: 22,
            },
        ),
        decayed,
    );
    assert.deepEqual(
        normalizeSocialGraph(
            decayed,
            {
                currentTurn: 23,
            },
        ).relationships[0]
            .activeEmotions,
        [],
    );
});

test('Social Graph v2 migration preserves hostile family values and derives complex relationship labels', () => {
    const familyGraph =
        normalizeSocialGraph({
            version: 1,
            relationshipEvidence: [{
                id: 'family_history',
                sourceActorId:
                    'tina_father',
                targetActorId: 'player',
                type: 'family',
                weightDelta: 1,
                sourceMessageIds: [12],
            }],
            relationships: [{
                id: 'tina_father_player',
                sourceActorId:
                    'tina_father',
                targetActorId: 'player',
                familiarity: 25,
                trust: -45,
                affinity: -60,
                tension: 35,
                protectiveness: 20,
                evidenceIds: [
                    'family_history',
                ],
            }],
        });
    const familyEdge =
        familyGraph.relationships[0];

    assert.equal(
        familyEdge.familiarity,
        90,
    );
    assert.equal(
        familyEdge.closeness,
        70,
    );
    assert.equal(
        familyEdge.warmth,
        -60,
    );
    assert.equal(
        familyEdge.trust,
        -45,
    );
    assert.deepEqual(
        familyEdge.structuralTags,
        ['family'],
    );
    assert.deepEqual(
        deriveRelationshipLabels(
            familyEdge,
        ),
        [
            '疏远的亲人',
            '亲人',
        ],
    );

    assert.deepEqual(
        deriveRelationshipLabels({
            familiarity: 80,
            closeness: 20,
            warmth: -30,
            trust: -10,
            tension: 20,
            resentment: 20,
        }),
        ['反感的熟人'],
    );
    const rivalryLabels =
        deriveRelationshipLabels({
            familiarity: 90,
            closeness: 25,
            warmth: -65,
            trust: -70,
            tension: 80,
            resentment: 75,
            structuralTags: [
                'rivalry',
            ],
        });
    assert.equal(
        rivalryLabels[0],
        '宿敌',
    );
    assert.equal(
        rivalryLabels.includes('竞争者'),
        true,
    );

    assert.deepEqual(
        deriveRelationshipLabels({
            familiarity: 85,
            closeness: 50,
            warmth: 10,
            trust: 5,
            tension: 45,
            resentment: 60,
        }),
        [
            '疏远的密友',
            '亲近但积怨的朋友',
            '密友',
        ],
    );
    assert.deepEqual(
        deriveRelationshipLabels({
            familiarity: 100,
            closeness: 90,
            warmth: 75,
            trust: 75,
        }),
        ['终身或家庭级纽带'],
    );
});

test('social audience projections preserve source knowledge without leaking hidden evidence through edge totals', () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const hermione =
        'canon_hermione_jean_granger';
    const mcgonagall =
        'minerva_mcgonagall';
    const state = {
        character: {
            identity: {
                name: 'Tina Zhang',
            },
        },
        actorLibrary: [
            {
                id: ron,
                nameEn: 'Ron Weasley',
            },
            {
                id: hermione,
                nameEn:
                    'Hermione Granger',
            },
            {
                id: mcgonagall,
                nameEn:
                    'Minerva McGonagall',
            },
        ],
        actors: [],
        socialGraph: {
            version: 2,
            statements: [
                {
                    id: 'ron_private_claim',
                    subjectId: ron,
                    speakerId: ron,
                    textEn:
                        'Ron privately formed this claim.',
                    witnessedBy: [],
                },
                {
                    id: 'ron_public_claim',
                    subjectId: ron,
                    speakerId: ron,
                    textEn:
                        'Ron told Tina this claim.',
                    witnessedBy: [
                        'player',
                    ],
                },
            ],
            relationshipEvidence: [
                {
                    id:
                        'ron_player_visible',
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    eventKind: 'support',
                    summaryEn:
                        'Tina saw Ron offer practical support.',
                    witnessedBy: [
                        'player',
                    ],
                    sourceMessageIds: [
                        10,
                    ],
                    turn: 10,
                    dimensionDeltas: [
                        {
                            dimension:
                                'trust',
                            delta: 5,
                            impact:
                                'meaningful',
                            appliedDelta: 5,
                        },
                        {
                            dimension:
                                'closeness',
                            delta: 4,
                            impact:
                                'meaningful',
                            appliedDelta: 4,
                        },
                        {
                            dimension:
                                'warmth',
                            delta: 2,
                            impact: 'minor',
                            appliedDelta: 2,
                        },
                    ],
                    structuralTags: [
                        'classmate',
                    ],
                    emotionAppraisals: [{
                        emotion:
                            'gratitude',
                        intensity: 3,
                        sourceMessageIds: [
                            10,
                        ],
                    }],
                },
                {
                    id:
                        'ron_player_hidden',
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    eventKind:
                        'private_reflection',
                    summaryEn:
                        'Ron privately revised his opinion.',
                    witnessedBy: [
                        hermione,
                    ],
                    sourceMessageIds: [
                        11,
                    ],
                    turn: 11,
                    dimensionDeltas: [
                        {
                            dimension:
                                'trust',
                            delta: 8,
                            impact: 'major',
                        },
                        {
                            dimension:
                                'closeness',
                            delta: 8,
                            impact: 'major',
                            appliedDelta: 8,
                        },
                        {
                            dimension:
                                'warmth',
                            delta: 4,
                            impact:
                                'meaningful',
                            appliedDelta: 4,
                        },
                    ],
                    structuralTags: [
                        'rivalry',
                    ],
                    emotionAppraisals: [{
                        emotion: 'anger',
                        intensity: 4,
                        sourceMessageIds: [
                            11,
                        ],
                    }],
                },
                {
                    id:
                        'mcgonagall_player_hidden',
                    sourceActorId:
                        mcgonagall,
                    targetActorId:
                        'player',
                    eventKind:
                        'private_judgment',
                    summaryEn:
                        'McGonagall formed an unwitnessed judgment.',
                    witnessedBy: [ron],
                    sourceMessageIds: [
                        12,
                    ],
                    turn: 12,
                    dimensionDeltas: [{
                        dimension: 'trust',
                        delta: -6,
                        impact:
                            'meaningful',
                        appliedDelta: -6,
                    }],
                    emotionAppraisals: [],
                },
            ],
            relationships: [
                {
                    id: 'ron_player',
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    familiarity: 30,
                    closeness: 12,
                    warmth: 6,
                    trust: 13,
                    respect: 0,
                    influence: 0,
                    tension: 0,
                    resentment: 0,
                    fear: 0,
                    protectiveness: 0,
                    structuralTags: [
                        'classmate',
                        'rivalry',
                    ],
                    activeEmotions: [
                        {
                            emotion:
                                'gratitude',
                            intensity: 3,
                            sourceEvidenceId:
                                'ron_player_visible',
                            witnessedBy: [
                                'player',
                            ],
                        },
                        {
                            emotion: 'anger',
                            intensity: 4,
                            sourceEvidenceId:
                                'ron_player_hidden',
                            witnessedBy: [
                                hermione,
                            ],
                        },
                    ],
                    evidenceIds: [
                        'ron_player_visible',
                        'ron_player_hidden',
                    ],
                },
                {
                    id: 'player_ron',
                    sourceActorId:
                        'player',
                    targetActorId: ron,
                    familiarity: 22,
                    closeness: 10,
                    warmth: 7,
                    trust: 4,
                    respect: 3,
                    influence: 0,
                    tension: 0,
                    resentment: 0,
                    fear: 0,
                    protectiveness: 0,
                    structuralTags: [],
                    activeEmotions: [],
                    evidenceIds: [],
                },
                {
                    id:
                        'mcgonagall_player',
                    sourceActorId:
                        mcgonagall,
                    targetActorId:
                        'player',
                    familiarity: 20,
                    closeness: 0,
                    warmth: 0,
                    trust: -6,
                    respect: 0,
                    influence: 0,
                    tension: 0,
                    resentment: 0,
                    fear: 0,
                    protectiveness: 0,
                    structuralTags: [],
                    activeEmotions: [],
                    evidenceIds: [
                        'mcgonagall_player_hidden',
                    ],
                },
            ],
        },
    };

    const playerProjection =
        buildSocialAudienceProjection(
            state,
            'player',
        );
    const playerRon =
        playerProjection.relationships
            .find(edge =>
                edge.id ===
                'ron_player');
    assert.deepEqual(
        playerProjection.statements
            .map(statement =>
                statement.id),
        ['ron_public_claim'],
    );
    assert.equal(playerRon.trust, 5);
    assert.equal(
        playerRon.closeness,
        4,
    );
    assert.equal(playerRon.warmth, 2);
    assert.deepEqual(
        playerRon.structuralTags,
        ['classmate'],
    );
    assert.deepEqual(
        playerRon.activeEmotions
            .map(emotion =>
                emotion.emotion),
        ['gratitude'],
    );
    assert.deepEqual(
        playerRon.evidence
            .map(evidence =>
                evidence.id),
        ['ron_player_visible'],
    );
    assert.equal(
        playerProjection.relationships
            .some(edge =>
                edge.id ===
                'mcgonagall_player'),
        false,
    );
    assert.equal(
        playerProjection.relationships
            .some(edge =>
                edge.id ===
                'player_ron'),
        true,
    );

    const ronProjection =
        buildSocialAudienceProjection(
            state,
            ron,
        );
    const ronSelfEdge =
        ronProjection.relationships
            .find(edge =>
                edge.id ===
                'ron_player');
    assert.deepEqual(
        ronProjection.statements
            .map(statement =>
                statement.id),
        [
            'ron_private_claim',
            'ron_public_claim',
        ],
    );
    assert.equal(ronSelfEdge.trust, 13);
    assert.equal(
        ronProjection.relationships
            .some(edge =>
                edge.id ===
                'player_ron'),
        false,
    );
    assert.deepEqual(
        ronSelfEdge.evidence
            .map(evidence =>
                evidence.id),
        [
            'ron_player_hidden',
            'ron_player_visible',
        ],
    );
    const [knowledgeCapsule] =
        buildActorKnowledgeCapsules(
            state,
            [ron],
        );
    assert.equal(
        knowledgeCapsule
            .socialKnowledge
            .relationships
            .some(edge =>
                edge.id ===
                'player_ron'),
        false,
    );
    const [continuityCapsule] =
        buildActorContinuityCapsules(
            state,
            [ron],
        );
    assert.equal(
        continuityCapsule
            .relationshipToPlayer
            .stageEn,
        'newly acquainted',
    );
    assert.equal(
        SOCIAL_RELATIONSHIP_DIMENSIONS
            .every(dimension =>
                Object.hasOwn(
                    continuityCapsule
                        .relationshipToPlayer,
                    dimension,
                )),
        true,
    );
    assert.deepEqual(
        continuityCapsule
            .relationshipToPlayer
            .activeEmotions
            .map(emotion =>
                emotion.emotion),
        [
            'gratitude',
            'anger',
        ],
    );
    assert.equal(
        continuityCapsule
            .relationshipToPlayer
            .latestEvidence.id,
        'ron_player_hidden',
    );
    assert.equal(
        continuityCapsule
            .relationshipToPlayer
            .labels
            .includes('竞争者'),
        true,
    );

    const hermioneProjection =
        buildSocialAudienceProjection(
            state,
            hermione,
        );
    const hermioneWitnessedEdge =
        hermioneProjection
            .relationships[0];
    assert.equal(
        hermioneWitnessedEdge.trust,
        8,
    );
    assert.equal(
        hermioneWitnessedEdge
            .closeness,
        8,
    );
    assert.deepEqual(
        hermioneWitnessedEdge
            .structuralTags,
        ['rivalry'],
    );
    assert.deepEqual(
        hermioneWitnessedEdge
            .activeEmotions
            .map(emotion =>
                emotion.emotion),
        ['anger'],
    );

    const starProjection =
        buildPlayerKnownRelationshipProjection(
            state,
        );
    const starRon =
        starProjection
            .edgeByDirection
            .get(`${ron}->player`);
    assert.equal(starRon.dimensions.trust, 5);
    assert.equal(
        starRon.dimensions.closeness,
        4,
    );
    assert.deepEqual(
        starRon.evidence.map(item =>
            item.id),
        ['ron_player_visible'],
    );
    assert.deepEqual(
        starRon.activeEmotions
            .map(emotion =>
                emotion.emotion),
        ['gratitude'],
    );
});

test('relationship graph renders familiarity-only edges as neutral instead of conflict', () => {
    const actorLibrary = [
        {
            id: 'neutral_actor',
            nameEn: 'Neutral Actor',
            knownToPlayer: true,
        },
        {
            id: 'warm_actor',
            nameEn: 'Warm Actor',
            knownToPlayer: true,
        },
        {
            id: 'tense_actor',
            nameEn: 'Tense Actor',
            knownToPlayer: true,
        },
    ];
    const edge = (
        targetActorId,
        dimensions,
    ) => ({
        id: `player_${targetActorId}`,
        sourceActorId: 'player',
        targetActorId,
        familiarity: 24,
        closeness: 0,
        warmth: 0,
        trust: 0,
        respect: 0,
        influence: 0,
        tension: 0,
        resentment: 0,
        fear: 0,
        protectiveness: 0,
        knownToPlayer: true,
        ...dimensions,
    });
    const projection =
        buildPlayerKnownRelationshipProjection({
            actorLibrary,
            socialGraph: {
                version: 2,
                relationships: [
                    edge('neutral_actor', {}),
                    edge('warm_actor', {
                        warmth: 16,
                    }),
                    edge('tense_actor', {
                        tension: 24,
                    }),
                ],
            },
        });

    assert.deepEqual(
        projection.edges.map(item => ({
            target: item.targetId,
            dominant:
                item.dominantDimension,
            color: item.color,
        })),
        [
            {
                target: 'neutral_actor',
                dominant: 'neutral',
                color: '#7f879c',
            },
            {
                target: 'warm_actor',
                dominant: 'warmth',
                color: '#d8b65e',
            },
            {
                target: 'tense_actor',
                dominant: 'tension',
                color: '#d46b6b',
            },
        ],
    );
});

test('relationship graph separates reciprocal directed edges instead of stacking their colors', () => {
    const projection =
        buildPlayerKnownRelationshipProjection({
            actorLibrary: [
                {
                    id: 'alice',
                    nameEn: 'Alice',
                    knownToPlayer: true,
                },
                {
                    id: 'bob',
                    nameEn: 'Bob',
                    knownToPlayer: true,
                },
            ],
            socialGraph: {
                version: 2,
                relationships: [
                    {
                        id: 'alice_bob',
                        sourceActorId: 'alice',
                        targetActorId: 'bob',
                        familiarity: 30,
                        warmth: 16,
                        knownToPlayer: true,
                    },
                    {
                        id: 'bob_alice',
                        sourceActorId: 'bob',
                        targetActorId: 'alice',
                        familiarity: 30,
                        tension: 24,
                        knownToPlayer: true,
                    },
                ],
            },
        });
    const reciprocalEdges =
        projection.edges.map(edge => ({
            direction:
                `${edge.sourceId}->${edge.targetId}`,
            color: edge.color,
            curveDistance:
                edge.curveDistance,
        }));

    assert.deepEqual(
        reciprocalEdges,
        [
            {
                direction: 'alice->bob',
                color: '#d8b65e',
                curveDistance: 42,
            },
            {
                direction: 'bob->alice',
                color: '#d46b6b',
                curveDistance: 42,
            },
        ],
    );
});

test('relationship graph projects actor house affiliations with their player-visible directed edges', () => {
    const state = {
        character: {
            identity: {
                name: 'Tina Zhang',
            },
        },
        actorLibrary: [
            {
                id: 'harry',
                nameEn: 'Harry Potter',
                house: 'Gryffindor',
                knownToPlayer: true,
            },
            {
                id: 'hermione',
                nameEn: 'Hermione Granger',
                affiliation: 'Gryffindor',
                knownToPlayer: true,
            },
            {
                id: 'ron',
                nameEn: 'Ron Weasley',
                affiliations: [
                    'Hogwarts School of Witchcraft and Wizardry',
                    'Gryffindor',
                ],
                knownToPlayer: true,
            },
            {
                id: 'luna',
                nameEn: 'Luna Lovegood',
                affiliation: {
                    house: 'Ravenclaw',
                },
                knownToPlayer: true,
            },
        ],
        socialGraph: {
            version: 2,
            relationships: [
                {
                    id: 'player_harry',
                    sourceActorId: 'player',
                    targetActorId: 'harry',
                    familiarity: 40,
                    closeness: 20,
                    knownToPlayer: true,
                },
                {
                    id: 'harry_hermione',
                    sourceActorId: 'harry',
                    targetActorId: 'hermione',
                    familiarity: 60,
                    closeness: 35,
                    knownToPlayer: true,
                },
                {
                    id: 'hermione_ron',
                    sourceActorId: 'hermione',
                    targetActorId: 'ron',
                    familiarity: 55,
                    closeness: 30,
                    knownToPlayer: true,
                },
                {
                    id: 'ron_luna',
                    sourceActorId: 'ron',
                    targetActorId: 'luna',
                    familiarity: 25,
                    closeness: 12,
                    knownToPlayer: true,
                },
            ],
        },
    };

    const projection =
        buildPlayerKnownRelationshipProjection(
            state,
        );
    const houseNodes =
        projection.nodes
            .filter(node =>
                node.categories
                    .includes('house'));

    assert.deepEqual(
        houseNodes.map(node => node.id).sort(),
        [
            'harry',
            'hermione',
            'luna',
            'ron',
        ],
    );
    assert.deepEqual(
        Object.fromEntries(
            houseNodes.map(node => [
                node.id,
                node.house,
            ]),
        ),
        {
            harry: 'Gryffindor',
            hermione: 'Gryffindor',
            luna: 'Ravenclaw',
            ron: 'Gryffindor',
        },
    );
    assert.deepEqual(
        projection.edges.map(edge =>
            `${edge.sourceId}->${edge.targetId}`),
        [
            'player->harry',
            'harry->hermione',
            'hermione->ron',
            'ron->luna',
        ],
    );
    const visible =
        filterRelationshipGraphProjection(
            projection,
            {
                scope: 'all',
                sentiment: 'all',
                category: 'house',
                query: '',
            },
        );
    assert.deepEqual(
        visible.nodes
            .map(node => node.id)
            .sort(),
        [
            'harry',
            'hermione',
            'luna',
            'ron',
        ],
    );
    assert.deepEqual(
        visible.edges.map(edge =>
            `${edge.sourceId}->${edge.targetId}`),
        [
            'player->harry',
            'harry->hermione',
            'hermione->ron',
            'ron->luna',
        ],
    );
});

test('relationship graph resolves Tina-shaped house identities without losing current visible edges', () => {
    const currentTinaHouseActorCount = 10;
    const currentTinaHouseVisibleEdgeCount = 32;
    const catalogActors = [
        [
            'canon_hermione_jean_granger',
            'Hermione Granger',
            'Student',
        ],
        [
            'canon_lavender_brown',
            'Lavender Brown',
            'Student',
        ],
        [
            'canon_ronald_bilius_weasley',
            'Ron Weasley',
            'Student',
        ],
        [
            'canon_seamus_finnigan',
            'Seamus Finnigan',
            'Student',
        ],
        [
            'canon_dean_thomas',
            'Dean Thomas',
            'Student',
        ],
        [
            'canon_neville_longbottom',
            'Neville Longbottom',
            'Student',
        ],
        [
            'canon_harry_james_potter',
            'Harry Potter',
            'Student',
        ],
        [
            'canon_filius_flitwick',
            'Filius Flitwick',
            'Professor of Charms and Head of Ravenclaw',
        ],
        [
            'minerva_mcgonagall',
            'Minerva McGonagall',
            'Deputy Headmistress of Hogwarts',
            'canon_minerva_mcgonagall',
        ],
    ];
    const nonHouseActors = [
        ['eddie_cooper', 'Eddie Cooper'],
        ['diagon_food_cart_vendor', 'Agnes Braithwaite'],
        ['diagon_passerby_doris', 'Doris Plunkett'],
        ['eddie_grandmother_cooper', 'Gran Cooper'],
        [
            'garrick_ollivander',
            'Garrick Ollivander',
            'canon_mr_ollivander',
        ],
        [
            'madam_malkin',
            'Madam Malkin',
            'canon_madam_malkin',
        ],
        ['malkins_next_customer', 'Mrs. Pendle'],
        ['alex_zhang', 'Alex Zhang'],
    ];
    const actorLibrary = [
        ...catalogActors.map(
            ([
                id,
                nameEn,
                roleEn,
                catalogId = id,
            ], index) => ({
                id,
                nameEn,
                roleEn,
                canonCatalogId: catalogId,
                introducedTurn: index + 1,
                source: roleEn === 'Student'
                    ? 'canon_catalog'
                    : 'preset_location_resident',
            })),
        ...nonHouseActors.map(
            ([
                id,
                nameEn,
                canonCatalogId,
            ], index) => ({
                id,
                nameEn,
                roleEn: 'Known non-house actor',
                ...(canonCatalogId
                    ? { canonCatalogId }
                    : {}),
                introducedTurn:
                    catalogActors.length +
                    index +
                    1,
                source: 'pacing_public_guest',
            })),
    ];
    const actors = actorLibrary.map(
        (profile, index) => ({
            id: profile.id,
            nameEn: profile.nameEn,
            roleEn: profile.roleEn,
            present: false,
            introducedTurn: index + 1,
            source: profile.source,
            ...(profile.roleEn === 'Student'
                ? {
                    canonCatalogId:
                        profile.canonCatalogId,
                }
                : {}),
        }),
    );
    actors.push(
        {
            id: 'hogwarts_express_trolley_witch',
            nameEn: 'Trolley Witch',
            roleEn:
                'Hogwarts Express trolley attendant',
            introducedTurn: 18,
            source: 'scene_temporary_actor',
            present: false,
        },
        {
            id: 'phillip_meadows',
            nameEn: 'Phillip',
            roleEn:
                'Third-year Gryffindor student',
            introducedTurn: 19,
            source: 'scene_temporary_actor',
            present: false,
        },
    );
    const visibleDirections = [
        'eddie_cooper->canon_hermione_jean_granger',
        'canon_dean_thomas->canon_ronald_bilius_weasley',
        'eddie_cooper->player',
        'canon_ronald_bilius_weasley->player',
        'canon_hermione_jean_granger->player',
        'canon_dean_thomas->player',
        'canon_dean_thomas->eddie_cooper',
        'canon_dean_thomas->canon_hermione_jean_granger',
        'canon_seamus_finnigan->player',
        'canon_seamus_finnigan->canon_dean_thomas',
        'canon_seamus_finnigan->eddie_cooper',
        'canon_neville_longbottom->player',
        'canon_hermione_jean_granger->canon_neville_longbottom',
        'canon_seamus_finnigan->canon_hermione_jean_granger',
        'canon_seamus_finnigan->canon_ronald_bilius_weasley',
        'canon_dean_thomas->canon_seamus_finnigan',
        'eddie_cooper->canon_seamus_finnigan',
        'canon_lavender_brown->player',
        'canon_lavender_brown->canon_hermione_jean_granger',
        'canon_hermione_jean_granger->canon_lavender_brown',
        'canon_dean_thomas->canon_neville_longbottom',
        'canon_neville_longbottom->canon_dean_thomas',
        'minerva_mcgonagall->player',
        'canon_hermione_jean_granger->minerva_mcgonagall',
        'minerva_mcgonagall->canon_hermione_jean_granger',
        'canon_seamus_finnigan->canon_lavender_brown',
        'canon_ronald_bilius_weasley->canon_seamus_finnigan',
        'canon_neville_longbottom->canon_seamus_finnigan',
        'canon_harry_james_potter->player',
        'canon_lavender_brown->canon_harry_james_potter',
        'canon_filius_flitwick->player',
        'canon_hermione_jean_granger->canon_filius_flitwick',
        'canon_harry_james_potter->canon_ronald_bilius_weasley',
    ];
    const relationshipEvidence =
        visibleDirections.map(
            (direction, index) => {
                const [
                    sourceActorId,
                    targetActorId,
                ] = direction.split('->');
                return {
                    id:
                        `visible_evidence_${index + 1}`,
                    sourceActorId,
                    targetActorId,
                    eventKind: 'interaction',
                    dimensionDeltas: [{
                        dimension: 'familiarity',
                        delta: 1,
                        impact: 'trace',
                    }],
                    emotionAppraisals: [],
                    structuralTags: [],
                    summaryEn:
                        'Deidentified player-known interaction.',
                    summary: '',
                    witnessedBy: ['player'],
                    sourceMessageIds: [index + 1],
                    sceneId: 'deidentified_scene',
                    turn: index + 1,
                };
            });
    const relationships =
        relationshipEvidence.map(
            (evidence, index) => ({
                id:
                    `known_relationship_${index + 1}`,
                sourceActorId:
                    evidence.sourceActorId,
                targetActorId:
                    evidence.targetActorId,
                familiarity: 25,
                closeness: 12,
                warmth: 0,
                trust: 0,
                respect: 0,
                influence: 0,
                tension: 0,
                resentment: 0,
                fear: 0,
                protectiveness: 0,
                structuralTags: [],
                activeEmotions: [],
                evidenceIds: [evidence.id],
            }));
    relationshipEvidence.push({
        id: 'npc_only_hidden_evidence',
        sourceActorId:
            'canon_ronald_bilius_weasley',
        targetActorId:
            'canon_hermione_jean_granger',
        eventKind: 'private_conversation',
        dimensionDeltas: [{
            dimension: 'trust',
            delta: 2,
            impact: 'minor',
        }],
        emotionAppraisals: [],
        structuralTags: [],
        summaryEn:
            'A private interaction unknown to the player.',
        summary: '',
        witnessedBy: [
            'canon_ronald_bilius_weasley',
            'canon_hermione_jean_granger',
        ],
        sourceMessageIds: [99],
        sceneId: 'private_scene',
        turn: 99,
    });
    relationships.push({
        id: 'npc_only_hidden_relationship',
        sourceActorId:
            'canon_ronald_bilius_weasley',
        targetActorId:
            'canon_hermione_jean_granger',
        familiarity: 25,
        closeness: 12,
        warmth: 0,
        trust: 2,
        respect: 0,
        influence: 0,
        tension: 0,
        resentment: 0,
        fear: 0,
        protectiveness: 0,
        structuralTags: [],
        activeEmotions: [],
        evidenceIds: [
            'npc_only_hidden_evidence',
        ],
    });
    const projection =
        buildPlayerKnownRelationshipProjection({
            character: {
                identity: {
                    name:
                        'Deidentified Player',
                },
            },
            actorLibrary,
            actors,
            socialGraph: {
                version: 2,
                relationshipEvidence,
                relationships,
            },
        });
    const houseNodes =
        projection.nodes.filter(node =>
            node?.categories.includes('house'));
    const visible =
        filterRelationshipGraphProjection(
            projection,
            {
                scope: 'all',
                sentiment: 'all',
                category: 'house',
                query: '',
            },
        );

    assert.equal(
        projection.nodes.length,
        20,
    );
    assert.equal(
        projection.edges.length,
        33,
    );
    assert.equal(
        houseNodes.length,
        currentTinaHouseActorCount,
    );
    assert.equal(
        visible.nodes.length,
        currentTinaHouseActorCount,
    );
    assert.deepEqual(
        new Set(visible.nodes.map(node =>
            node?.id)),
        new Set([
            'canon_hermione_jean_granger',
            'canon_lavender_brown',
            'canon_ronald_bilius_weasley',
            'canon_seamus_finnigan',
            'canon_dean_thomas',
            'canon_neville_longbottom',
            'canon_filius_flitwick',
            'canon_harry_james_potter',
            'minerva_mcgonagall',
            'phillip_meadows',
        ]),
    );
    assert.equal(
        visible.edges.length,
        currentTinaHouseVisibleEdgeCount,
    );
    assert.equal(
        visible.nodes.some(node =>
            [
                'player',
                'eddie_cooper',
            ].includes(node.id)),
        false,
    );
    assert.equal(
        visible.edges.every(edge =>
            [edge.sourceId, edge.targetId]
                .some(id =>
                    projection.nodeById
                        .get(id)
                        ?.categories
                        .includes('house'))),
        true,
    );
    assert.equal(
        projection.edgeByDirection.has(
            'canon_ronald_bilius_weasley' +
            '->canon_hermione_jean_granger',
        ),
        false,
    );
    assert.equal(
        visible.edges.some(edge =>
            edge.sourceId === 'eddie_cooper' &&
            edge.targetId ===
                'canon_hermione_jean_granger'),
        true,
    );
});

test('relationship graph Cytoscape styles use supported highlight properties without warnings', () => {
    const styles =
        getRelationshipGraphStyles();
    const styleProperties =
        styles.flatMap(entry =>
            Object.keys(entry.style));
    assert.equal(
        styleProperties.some(property =>
            property.startsWith('shadow-')),
        false,
    );
    const focusStyle =
        styles.find(entry =>
            entry.selector ===
            'node.hpmud-graph-focus')
            ?.style;
    assert.deepEqual(
        {
            color:
                focusStyle?.[
                    'underlay-color'
                ],
            opacity:
                focusStyle?.[
                    'underlay-opacity'
                ],
            padding:
                focusStyle?.[
                    'underlay-padding'
                ],
        },
        {
            color: '#bca9ff',
            opacity: 0.34,
            padding: 11,
        },
    );
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...values) => {
        warnings.push(
            values
                .map(String)
                .join(' '),
        );
    };
    let graph;
    try {
        graph = cytoscape({
            headless: true,
            styleEnabled: true,
            elements: [
                {
                    data: {
                        id: 'player',
                        label: 'Tina',
                        sigil: '',
                        size: 64,
                        ringColor: '#e1c477',
                        player: 'true',
                    },
                    classes:
                        'hpmud-graph-focus',
                },
                {
                    data: {
                        id: 'harry',
                        label: 'Harry',
                        sigil: '',
                        size: 58,
                        ringColor: '#9f3a43',
                        player: 'false',
                    },
                },
                {
                    data: {
                        id: 'player_harry',
                        source: 'player',
                        target: 'harry',
                        color: '#77aee8',
                        width: 3,
                        opacity: 0.7,
                        curveDistance: 0,
                    },
                },
            ],
            style: styles,
        });
    } finally {
        graph?.destroy();
        console.warn = originalWarn;
    }
    assert.deepEqual(warnings, []);
});

test('relationship graph disables motion and avoids custom wheel sensitivity warnings', async () => {
    const reducedMotionStyles =
        getRelationshipGraphStyles({
            reducedMotion: true,
        });
    const transitionDurations =
        reducedMotionStyles.flatMap(entry =>
            entry.style[
                'transition-duration'
            ] || []);
    assert.ok(
        transitionDurations.length > 0,
    );
    assert.deepEqual(
        new Set(transitionDurations),
        new Set(['0ms']),
    );

    const graphSource = await readFile(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/relationship-graph.js',
            import.meta.url,
        ),
        'utf8',
    );
    assert.doesNotMatch(
        graphSource,
        /wheelSensitivity\s*:/,
    );
    assert.doesNotMatch(
        graphSource,
        /duration:\s*reducedMotion\.matches\s*\?\s*0\s*:/,
    );
});

test('relationship graph actor cards reopen the inspector on narrow screens', async () => {
    const [graphSource, stylesheet] =
        await Promise.all([
            readFile(
                new URL(
                    '../public/scripts/extensions/hogwarts-mud/relationship-graph.js',
                    import.meta.url,
                ),
                'utf8',
            ),
            readFile(
                new URL(
                    '../public/scripts/extensions/hogwarts-mud/style.css',
                    import.meta.url,
                ),
                'utf8',
            ),
        ]);
    assert.match(
        graphSource,
        /classList\.add\(\s*['"]hpmud-relationship-inspector-open['"]\s*,?\s*\)/,
    );
    assert.match(
        stylesheet,
        /@media\s*\(max-width:\s*760px\)[\s\S]*?\.hpmud-app\.hpmud-relationship-inspector-open\s+\.hpmud-inspector\s*\{[\s\S]*?display:\s*grid;/,
    );
});

test('LangGraph social director validates provenance and derives idempotent NPC relationships', async () => {
    const actorIds = [
        'canon_ronald_bilius_weasley',
        'canon_hermione_jean_granger',
        'eddie_cooper',
    ];
    const input = {
        sceneId:
            'express_corridor_search',
        clock:
            '1991-09-01 · 13:40',
        turn: 47,
        actorIds,
        presentActorIds: actorIds,
        allowedMessageIds: [
            10,
            11,
        ],
        messageSceneIds: {
            10: 'express_corridor_search',
            11: 'express_corridor_search',
        },
        witnessActorIdsByMessageId: {
            10: [
                'player',
                'canon_ronald_bilius_weasley',
                'eddie_cooper',
            ],
            11: [
                'player',
                'canon_ronald_bilius_weasley',
                'canon_hermione_jean_granger',
            ],
        },
        existingGraph:
            normalizeSocialGraph(),
        extraction: {
            reviews: [],
            statements: [
                {
                    subjectId:
                        'canon_ronald_bilius_weasley',
                    speakerId:
                        'canon_ronald_bilius_weasley',
                    category: 'family',
                    textEn:
                        'Ron says he has five older brothers and one younger sister.',
                    witnessedBy: [
                        'player',
                        'canon_hermione_jean_granger',
                        'eddie_cooper',
                    ],
                    sourceMessageIds: [10],
                },
                {
                    subjectId:
                        'canon_hermione_jean_granger',
                    speakerId:
                        'canon_hermione_jean_granger',
                    category:
                        'occupation',
                    textEn:
                        'Hermione says both of her parents are dentists.',
                    witnessedBy: [
                        'player',
                        'canon_ronald_bilius_weasley',
                    ],
                    sourceMessageIds: [11],
                },
                {
                    subjectId:
                        'unknown_actor',
                    speakerId:
                        'canon_ronald_bilius_weasley',
                    category: 'family',
                    textEn:
                        'This statement has no valid subject.',
                    witnessedBy: [
                        'player',
                    ],
                    sourceMessageIds: [10],
                },
            ],
            relationshipEvidence: [
                {
                    sourceActorId:
                        'canon_ronald_bilius_weasley',
                    targetActorId:
                        'canon_hermione_jean_granger',
                    eventKind:
                        'introduction',
                    dimensionDeltas: [{
                        dimension:
                            'familiarity',
                        delta: 12,
                        impact: 'major',
                    }],
                    structuralTags: [
                        'classmate',
                    ],
                    emotionAppraisals: [],
                    summaryEn:
                        'Ron and Hermione exchanged introductions in the compartment.',
                    witnessedBy: [
                        'player',
                        'eddie_cooper',
                    ],
                    sourceMessageIds: [
                        10,
                        11,
                    ],
                },
                {
                    sourceActorId:
                        'canon_ronald_bilius_weasley',
                    targetActorId:
                        'player',
                    eventKind: 'gift',
                    dimensionDeltas: [{
                        dimension: 'warmth',
                        delta: 3,
                        impact: 'minor',
                    }],
                    structuralTags: [],
                    emotionAppraisals: [{
                        emotion:
                            'gratitude',
                        intensity: 2,
                        sourceMessageIds: [
                            11,
                        ],
                    }],
                    summaryEn:
                        'Ron warmed to the player after accepting the offered sweets.',
                    witnessedBy: [
                        'player',
                        'canon_hermione_jean_granger',
                    ],
                    sourceMessageIds: [11],
                },
            ],
        },
    };
    const first =
        await runSocialDirectorGraph(
            input,
        );
    assert.equal(
        first.socialGraph
            .statements.length,
        2,
    );
    assert.equal(
        first.socialGraph
            .relationshipEvidence
            .length,
        2,
    );
    assert.equal(
        first.socialGraph
            .relationships[0]
            .familiarity,
        12,
    );
    assert.equal(
        first.rejected.length,
        1,
    );
    assert.deepEqual(
        first.socialGraph
            .statements[0]
            .witnessedBy,
        [
            'player',
            'eddie_cooper',
        ],
    );
    assert.deepEqual(
        first.socialGraph
            .relationshipEvidence[0]
            .witnessedBy,
        ['player'],
    );
    assert.equal(
        first.socialGraph
            .relationshipEvidence[0]
            .sceneId,
        'express_corridor_search',
    );

    const second =
        await runSocialDirectorGraph({
            ...input,
            existingGraph:
                first.socialGraph,
        });
    assert.equal(
        second.socialGraph
            .statements.length,
        2,
    );
    assert.equal(
        second.socialGraph
            .relationshipEvidence
            .length,
        2,
    );
    assert.equal(
        second.socialGraph
            .relationships[0]
            .familiarity,
        12,
    );

    const state =
        createInitialWorldState(
            createDefaultCharacterDraft(),
            {},
        );
    state.phase = 'playing';
    state.scene = {
        id:
            'express_corridor_search',
    };
    state.clock =
        '1991-09-01 · 13:40';
    state.turn.count = 47;
    state.actorLibrary =
        actorIds.map(id => ({
            id,
            nameEn: id,
            relationshipToPlayerEn:
                'Newly met',
        }));
    state.actors =
        actorIds.map(id => ({
            id,
            present: true,
        }));
    state.memoryDirector = {
        lastReviewedTurn: 31,
        reviewAfterTurns: 14,
        pendingEventBoundary: {
            id: 'pending-memory-review',
            status: 'pending',
        },
    };
    const memoryDirectorBefore =
        structuredClone(
            state.memoryDirector,
        );
    assert.deepEqual(
        validateSocialDirectorResult(
            second,
            state,
            [10, 11],
        ),
        { valid: true, errors: [] },
    );
    const committed =
        applySocialDirectorResult(
            state,
            second,
            [10, 11],
        );
    const ron = committed
        .actorLibrary.find(actor =>
            actor.id ===
                'canon_ronald_bilius_weasley');
    assert.equal(
        ron.socialStatements.length,
        1,
    );
    assert.equal(
        ron.socialRelationships.length,
        2,
    );
    assert.equal(
        ron.socialRelationships.some(edge =>
            edge.targetActorId === 'player' &&
            edge.warmth === 3 &&
            !Object.hasOwn(
                edge,
                'affinity',
            )),
        true,
    );
    assert.deepEqual(
        committed.memoryDirector,
        memoryDirectorBefore,
    );
});

test('LangGraph social director rejects cross-scene evidence and restores authoritative source scenes', async () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const hermione =
        'canon_hermione_jean_granger';
    const result =
        await runSocialDirectorGraph({
            sceneId: 'catchup_batch',
            clock:
                '1991-09-02 · 11:05',
            turn: 91,
            actorIds: [
                ron,
                hermione,
            ],
            presentActorIds: [
                ron,
                hermione,
            ],
            allowedMessageIds: [
                127,
                192,
            ],
            messageSceneIds: {
                127: 'hogsmeade_station_arrival',
                192: 'first_charms_lesson',
            },
            witnessActorIdsByMessageId: {
                127: [
                    'player',
                    ron,
                ],
                192: [
                    'player',
                    hermione,
                ],
            },
            existingGraph:
                normalizeSocialGraph(),
            extraction: {
                reviews: [],
                statements: [{
                    subjectId: ron,
                    speakerId: ron,
                    sceneId:
                        'first_charms_lesson',
                    category: 'family',
                    textEn:
                        'Ron says he has five older brothers.',
                    witnessedBy: [
                        'player',
                        hermione,
                    ],
                    sourceMessageIds: [
                        127,
                    ],
                }],
                relationshipEvidence: [{
                    sourceActorId: ron,
                    targetActorId:
                        hermione,
                    sceneId:
                        'first_charms_lesson',
                    eventKind:
                        'introduction',
                    dimensionDeltas: [{
                        dimension:
                            'familiarity',
                        delta: 10,
                        impact: 'major',
                    }],
                    structuralTags: [
                        'classmate',
                    ],
                    emotionAppraisals: [],
                    summaryEn:
                        'Two unrelated scenes were incorrectly merged.',
                    witnessedBy: [
                        'player',
                    ],
                    sourceMessageIds: [
                        127,
                        192,
                    ],
                }],
            },
        });
    assert.equal(
        result.socialGraph
            .statements[0]
            .sceneId,
        'hogsmeade_station_arrival',
    );
    assert.deepEqual(
        result.socialGraph
            .statements[0]
            .witnessedBy,
        ['player'],
    );
    assert.equal(
        result.socialGraph
            .relationshipEvidence
            .length,
        0,
    );
    assert.equal(
        result.rejected.some(entry =>
            entry.kind ===
                'relationship_evidence'),
        true,
    );
});

test('LangGraph social director rejects bad v2 proposals individually and preserves message witness privacy', async () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const hermione =
        'canon_hermione_jean_granger';
    const input = {
        sceneId: 'private_library_help',
        clock:
            '1991-09-03 · 18:10',
        turn: 18,
        actorIds: [
            ron,
            hermione,
        ],
        presentActorIds: [
            ron,
            hermione,
        ],
        allowedMessageIds: [
            30,
            31,
        ],
        messageSceneIds: {
            30: 'private_library_help',
            31: 'private_library_help',
        },
        witnessActorIdsByMessageId: {
            30: [
                ron,
                hermione,
            ],
            31: [
                ron,
                hermione,
            ],
        },
        existingGraph:
            normalizeSocialGraph(),
        extraction: {
            reviews: [],
            statements: [],
            relationshipEvidence: [{
                sourceActorId: ron,
                targetActorId: hermione,
                sceneId:
                    'private_library_help',
                eventKind: 'support',
                dimensionDeltas: [
                    {
                        dimension: 'trust',
                        delta: 99,
                        impact:
                            'meaningful',
                    },
                    {
                        dimension:
                            'familiarity',
                        delta: 4,
                        impact: 'minor',
                    },
                    {
                        dimension: 'warmth',
                        delta: 6,
                        impact:
                            'meaningful',
                    },
                    {
                        dimension:
                            'unsupported',
                        delta: 5,
                        impact:
                            'meaningful',
                    },
                    {
                        dimension:
                            'resentment',
                        delta: -6,
                        impact:
                            'meaningful',
                    },
                ],
                structuralTags: [
                    'classmate',
                    'secret_cabal',
                ],
                emotionAppraisals: [
                    {
                        emotion:
                            'gratitude',
                        intensity: 3,
                        sourceMessageIds: [
                            31,
                        ],
                    },
                    {
                        emotion: 'joy',
                        intensity: 9,
                        sourceMessageIds: [
                            30,
                        ],
                    },
                ],
                summaryEn:
                    'Ron quietly backed Hermione during a difficult library search.',
                witnessedBy: [
                    'player',
                    ron,
                ],
                sourceMessageIds: [
                    31,
                    30,
                ],
            }],
        },
    };
    const first =
        await runSocialDirectorGraph(
            input,
        );
    const evidence =
        first.socialGraph
            .relationshipEvidence[0];
    const edge =
        first.socialGraph
            .relationships[0];

    assert.deepEqual(
        evidence.sourceMessageIds,
        [30, 31],
    );
    assert.deepEqual(
        evidence.witnessedBy,
        [ron],
    );
    assert.deepEqual(
        evidence.dimensionDeltas
            .map(delta => ({
                dimension:
                    delta.dimension,
                delta: delta.delta,
                appliedDelta:
                    delta.appliedDelta,
            })),
        [{
            dimension: 'warmth',
            delta: 6,
            appliedDelta: 6,
        }],
    );
    assert.deepEqual(
        evidence.structuralTags,
        ['classmate'],
    );
    assert.deepEqual(
        edge.activeEmotions,
        [{
            emotion: 'gratitude',
            intensity: 3,
            sourceMessageIds: [31],
            sourceEvidenceId:
                evidence.id,
            sceneId:
                'private_library_help',
            eventKind: 'support',
            witnessedBy: [ron],
            updatedTurn: 18,
            updatedClock:
                '1991-09-03 · 18:10',
        }],
    );
    assert.equal(edge.trust, 0);
    assert.equal(edge.familiarity, 0);
    assert.equal(edge.warmth, 6);
    assert.equal(
        first.rejected.filter(entry =>
            entry.reason ===
                'delta_outside_impact_band')
            .length,
        2,
    );
    assert.equal(
        first.rejected.some(entry =>
            entry.reason ===
                'unknown_dimension'),
        true,
    );
    assert.equal(
        first.rejected.some(entry =>
            entry.reason ===
                'resentment_repair_not_accepted'),
        true,
    );
    assert.equal(
        first.rejected.some(entry =>
            entry.reason ===
                'invalid_emotion_intensity'),
        true,
    );
    assert.equal(
        first.rejected.some(entry =>
            entry.reason ===
                'unknown_structural_tag'),
        true,
    );
    assert.equal(
        normalizeSocialGraph(
            first.socialGraph,
        ).relationshipEvidence[0]
            .witnessedBy
            .includes('player'),
        false,
    );

    const replay =
        structuredClone(input);
    replay.existingGraph =
        first.socialGraph;
    replay.extraction
        .relationshipEvidence[0]
        .sourceMessageIds = [
            30,
            31,
        ];
    replay.extraction
        .relationshipEvidence[0]
        .summaryEn =
        'Different model wording for the same sourced event.';
    const second =
        await runSocialDirectorGraph(
            replay,
        );
    assert.equal(
        second.socialGraph
            .relationshipEvidence.length,
        1,
    );
    assert.equal(
        second.socialGraph
            .relationshipEvidence[0].id,
        evidence.id,
    );
    assert.equal(
        second.socialGraph
            .relationships[0].trust,
        0,
    );
    assert.equal(
        second.socialGraph
            .relationships[0].warmth,
        6,
    );
});

test('LangGraph social reducer applies directional saturation and asymmetric betrayal damage', async () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const result =
        await runSocialDirectorGraph({
            sceneId: 'betrayal_scene',
            clock:
                '1991-10-11 · 21:00',
            turn: 40,
            actorIds: [ron],
            presentActorIds: [ron],
            allowedMessageIds: [40],
            messageSceneIds: {
                40: 'betrayal_scene',
            },
            witnessActorIdsByMessageId: {
                40: [
                    'player',
                    ron,
                ],
            },
            existingGraph:
                normalizeSocialGraph({
                    version: 2,
                    relationshipEvidence:
                        [],
                    relationships: [{
                        id:
                            'ron_player_edge',
                        sourceActorId:
                            ron,
                        targetActorId:
                            'player',
                        familiarity: 80,
                        closeness: 0,
                        warmth: 80,
                        trust: 80,
                        respect: -80,
                        influence: 0,
                        tension: 0,
                        resentment: 0,
                        fear: 0,
                        protectiveness: 0,
                        structuralTags:
                            [],
                        evidenceIds: [],
                    }],
                }),
            extraction: {
                reviews: [],
                statements: [],
                relationshipEvidence: [{
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    sceneId:
                        'betrayal_scene',
                    eventKind:
                        'betrayal',
                    dimensionDeltas: [
                        {
                            dimension:
                                'trust',
                            delta: -8,
                            impact:
                                'major',
                        },
                        {
                            dimension:
                                'warmth',
                            delta: 8,
                            impact:
                                'major',
                        },
                        {
                            dimension:
                                'respect',
                            delta: -8,
                            impact:
                                'major',
                        },
                        {
                            dimension:
                                'resentment',
                            delta: 8,
                            impact:
                                'major',
                        },
                        {
                            dimension:
                                'closeness',
                            delta: 15,
                            impact:
                                'defining',
                        },
                    ],
                    structuralTags: [],
                    emotionAppraisals: [{
                        emotion: 'anger',
                        intensity: 5,
                        sourceMessageIds: [
                            40,
                        ],
                    }],
                    summaryEn:
                        'Ron deliberately exposed a confidence entrusted to him.',
                    witnessedBy: [
                        'player',
                        ron,
                    ],
                    sourceMessageIds: [
                        40,
                    ],
                }],
            },
        });
    const edge =
        result.socialGraph
            .relationships[0];
    const deltas =
        Object.fromEntries(
            result.socialGraph
                .relationshipEvidence[0]
                .dimensionDeltas
                .map(delta => [
                    delta.dimension,
                    delta,
                ]),
        );

    assert.equal(edge.trust, 68);
    assert.equal(edge.warmth, 82);
    assert.equal(edge.respect, -83);
    assert.equal(edge.resentment, 8);
    assert.equal(edge.closeness, 15);
    assert.equal(
        deltas.trust
            .asymmetryMultiplier,
        1.5,
    );
    assert.equal(
        deltas.trust
            .saturationMultiplier,
        1,
    );
    assert.equal(
        deltas.warmth
            .saturationMultiplier,
        0.25,
    );
    assert.equal(
        deltas.respect
            .saturationMultiplier,
        0.25,
    );
});

test('LangGraph social reducer deterministically attenuates repeated events', async () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const messageIds = [
        50,
        51,
        52,
        53,
    ];
    const result =
        await runSocialDirectorGraph({
            sceneId:
                'repeated_praise_scene',
            clock:
                '1991-10-12 · 10:00',
            turn: 41,
            actorIds: [ron],
            presentActorIds: [ron],
            allowedMessageIds:
                messageIds,
            messageSceneIds:
                Object.fromEntries(
                    messageIds.map(id => [
                        id,
                        'repeated_praise_scene',
                    ]),
                ),
            witnessActorIdsByMessageId:
                Object.fromEntries(
                    messageIds.map(id => [
                        id,
                        [
                            'player',
                            ron,
                        ],
                    ]),
                ),
            existingGraph:
                normalizeSocialGraph(),
            extraction: {
                reviews: [],
                statements: [],
                relationshipEvidence:
                    messageIds
                        .toReversed()
                        .map(id => ({
                            sourceActorId:
                                ron,
                            targetActorId:
                                'player',
                            sceneId:
                                'repeated_praise_scene',
                            eventKind:
                                'praise',
                            dimensionDeltas: [{
                                dimension:
                                    'warmth',
                                delta: 5,
                                impact:
                                    'meaningful',
                            }],
                            structuralTags:
                                [],
                            emotionAppraisals:
                                [],
                            summaryEn:
                                `Praise event ${id}.`,
                            witnessedBy: [
                                'player',
                                ron,
                            ],
                            sourceMessageIds: [
                                id,
                            ],
                        })),
            },
        });
    const evidence =
        result.socialGraph
            .relationshipEvidence;

    assert.deepEqual(
        evidence.map(item =>
            item.sourceMessageIds[0]),
        messageIds,
    );
    assert.deepEqual(
        evidence.map(item =>
            item.dimensionDeltas[0]
                .repeatMultiplier),
        [
            1,
            0.6,
            0.35,
            0.2,
        ],
    );
    assert.deepEqual(
        evidence.map(item =>
            item.dimensionDeltas[0]
                .appliedDelta),
        [
            5,
            2.85,
            1.61,
            0.91,
        ],
    );
    assert.equal(
        result.socialGraph
            .relationships[0].warmth,
        10.37,
    );
});

test('LangGraph social reducer blocks routine closeness and keeps repeated praise or gifts below the next relationship stage', async () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const messageIds = [
        54,
        55,
        56,
        57,
        58,
    ];
    const eventKinds = [
        'routine_interaction',
        'praise',
        'gift',
        'praise',
        'gift',
    ];
    const result =
        await runSocialDirectorGraph({
            sceneId:
                'classmate_praise_scene',
            clock:
                '1991-10-12 · 10:30',
            turn: 42,
            actorIds: [ron],
            presentActorIds: [ron],
            allowedMessageIds:
                messageIds,
            messageSceneIds:
                Object.fromEntries(
                    messageIds.map(id => [
                        id,
                        'classmate_praise_scene',
                    ]),
                ),
            witnessActorIdsByMessageId:
                Object.fromEntries(
                    messageIds.map(id => [
                        id,
                        [
                            'player',
                            ron,
                        ],
                    ]),
                ),
            existingGraph:
                normalizeSocialGraph({
                    version: 2,
                    relationships: [{
                        id:
                            'ron_player_friend',
                        sourceActorId: ron,
                        targetActorId:
                            'player',
                        familiarity: 75,
                        closeness: 49,
                        warmth: 30,
                        trust: 30,
                        respect: 10,
                        influence: 0,
                        tension: 0,
                        resentment: 0,
                        fear: 0,
                        protectiveness: 0,
                        structuralTags: [
                            'classmate',
                        ],
                        activeEmotions: [],
                        evidenceIds: [],
                    }],
                }),
            extraction: {
                reviews: [],
                statements: [],
                relationshipEvidence:
                    messageIds.map(
                        (id, index) => ({
                            sourceActorId:
                                ron,
                            targetActorId:
                                'player',
                            sceneId:
                                'classmate_praise_scene',
                            eventKind:
                                eventKinds[
                                    index
                                ],
                            dimensionDeltas: [{
                                dimension:
                                    'closeness',
                                delta:
                                    index === 0
                                        ? 4
                                        : 2,
                                impact:
                                    index === 0
                                        ? 'meaningful'
                                        : 'minor',
                            }],
                            structuralTags:
                                index === 0
                                    ? [
                                        'classmate',
                                    ]
                                    : [],
                            emotionAppraisals:
                                [],
                            summaryEn:
                                `Routine social event ${id}.`,
                            witnessedBy: [
                                'player',
                                ron,
                            ],
                            sourceMessageIds: [
                                id,
                            ],
                        }),
                    ),
            },
        });
    const edge =
        result.socialGraph
            .relationships[0];
    const routineEvidence =
        result.socialGraph
            .relationshipEvidence[0];

    assert.deepEqual(
        routineEvidence.dimensionDeltas,
        [],
    );
    assert.equal(
        result.rejected.some(entry =>
            entry.reason ===
                'closeness_requires_voluntary_bonding'),
        true,
    );
    assert.equal(edge.closeness < 50, true);
});

test('LangGraph social reducer lowers resentment only for accepted repair evidence', async () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const result =
        await runSocialDirectorGraph({
            sceneId: 'repair_scene',
            clock:
                '1991-10-13 · 14:00',
            turn: 42,
            actorIds: [ron],
            presentActorIds: [ron],
            allowedMessageIds: [
                60,
                61,
            ],
            messageSceneIds: {
                60: 'repair_scene',
                61: 'repair_scene',
            },
            witnessActorIdsByMessageId: {
                60: [
                    'player',
                    ron,
                ],
                61: [
                    'player',
                    ron,
                ],
            },
            existingGraph:
                normalizeSocialGraph({
                    version: 2,
                    relationshipEvidence:
                        [],
                    relationships: [{
                        id:
                            'ron_player_repair',
                        sourceActorId:
                            ron,
                        targetActorId:
                            'player',
                        familiarity: 75,
                        closeness: 45,
                        warmth: -20,
                        trust: -30,
                        respect: 0,
                        influence: 0,
                        tension: 50,
                        resentment: 60,
                        fear: 0,
                        protectiveness: 0,
                        structuralTags:
                            [],
                        evidenceIds: [],
                    }],
                }),
            extraction: {
                reviews: [],
                statements: [],
                relationshipEvidence: [
                    {
                        sourceActorId:
                            ron,
                        targetActorId:
                            'player',
                        sceneId:
                            'repair_scene',
                        eventKind: 'gift',
                        dimensionDeltas: [
                            {
                                dimension:
                                    'warmth',
                                delta: 3,
                                impact:
                                    'minor',
                            },
                            {
                                dimension:
                                    'resentment',
                                delta: -6,
                                impact:
                                    'meaningful',
                            },
                        ],
                        structuralTags:
                            [],
                        emotionAppraisals:
                            [],
                        summaryEn:
                            'Ron offered a gift without addressing the betrayal.',
                        witnessedBy: [
                            'player',
                            ron,
                        ],
                        sourceMessageIds: [
                            60,
                        ],
                    },
                    {
                        sourceActorId:
                            ron,
                        targetActorId:
                            'player',
                        sceneId:
                            'repair_scene',
                        eventKind:
                            'accepted_apology',
                        dimensionDeltas: [
                            {
                                dimension:
                                    'resentment',
                                delta: -6,
                                impact:
                                    'meaningful',
                            },
                            {
                                dimension:
                                    'warmth',
                                delta: 4,
                                impact:
                                    'meaningful',
                            },
                        ],
                        structuralTags:
                            [],
                        emotionAppraisals: [{
                            emotion:
                                'relief',
                            intensity: 3,
                            sourceMessageIds: [
                                61,
                            ],
                        }],
                        summaryEn:
                            'The player accepted Ron\'s specific apology and restitution.',
                        witnessedBy: [
                            'player',
                            ron,
                        ],
                        sourceMessageIds: [
                            61,
                        ],
                    },
                ],
            },
        });
    const edge =
        result.socialGraph
            .relationships[0];
    const gift =
        result.socialGraph
            .relationshipEvidence[0];

    assert.equal(edge.resentment, 54);
    assert.equal(edge.warmth, -13);
    assert.deepEqual(
        gift.dimensionDeltas
            .map(delta =>
                delta.dimension),
        ['warmth'],
    );
    assert.equal(
        result.rejected.some(entry =>
            entry.reason ===
                'resentment_repair_not_accepted'),
        true,
    );
});

test('medium memory consolidation promotes only referenced memories', () => {
    const state = createInitialWorldState(
        createDefaultCharacterDraft(),
        {},
    );
    state.phase = 'playing';
    state.scene = {
        id: 'memory_scene',
    };
    state.clock = '1991-07-24 · 13:30';
    state.turn.count = 8;
    state.actorLibrary = [{
        ...createDirectorFoundation()
            .actorLibrary[0],
        sharedMemories: {
            core: [],
            recent: [{
                id: 'recent_defence',
                summaryEn:
                    'Tina defended a younger student.',
                createdTurn: 5,
                updatedTurn: 5,
            }],
            everyday: [
                {
                    id: 'daily_question',
                    summaryEn:
                        'Tina asked a blunt question.',
                    createdTurn: 6,
                    updatedTurn: 6,
                },
                {
                    id: 'daily_apology',
                    summaryEn:
                        'Tina later offered a reluctant apology.',
                    createdTurn: 7,
                    updatedTurn: 7,
                    significance: 'notable',
                    lastingImpactEn:
                        'The apology reopened trust after a genuine offence.',
                },
            ],
        },
    }];
    state.actors = [{
        id: 'tina_mother',
        present: true,
    }];
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'scene:event:8',
            status: 'pending',
            sceneId: state.scene.id,
            turn: 8,
        };
    const payload = {
        reviews: [{
            id: 'tina_mother',
            impressionOfPlayerEn:
                'Blunt and impulsive, but capable of loyalty and a difficult apology.',
            operations: [
                {
                    sourceIds: ['recent_defence'],
                    targetTier: 'core',
                    summaryEn:
                        'Tina will put herself between a vulnerable person and public pressure.',
                    summary: '',
                },
                {
                    sourceIds: [
                        'daily_question',
                        'daily_apology',
                    ],
                    targetTier: 'recent',
                    summaryEn:
                        'Tina caused offence with bluntness, then returned to make an awkward apology.',
                    summary: '',
                },
            ],
        }],
    };
    const trivialState =
        structuredClone(state);
    delete trivialState.actorLibrary[0]
        .sharedMemories.everyday[1]
        .significance;
    delete trivialState.actorLibrary[0]
        .sharedMemories.everyday[1]
        .lastingImpactEn;
    const trivialPromotion =
        validateMemoryConsolidation(
            payload,
            trivialState,
        );
    assert.deepEqual(
        trivialPromotion,
        { valid: true, errors: [] },
    );
    const singleOrdinary =
        structuredClone(payload);
    singleOrdinary.reviews[0]
        .operations[1].sourceIds = [
            'daily_question',
        ];
    assert.equal(
        validateMemoryConsolidation(
            singleOrdinary,
            trivialState,
        ).valid,
        false,
    );
    const normalizedComposite =
        normalizeMemoryConsolidationPayload(
            {
                ...singleOrdinary,
                statements: [{
                    subjectId:
                        'tina_mother',
                    textEn:
                        'A valid social statement remains available.',
                }],
            },
            trivialState,
        );
    assert.equal(
        normalizedComposite
            .reviews.length,
        0,
    );
    assert.equal(
        normalizedComposite
            .statements.length,
        1,
    );
    assert.deepEqual(
        validateMemoryConsolidation(
            payload,
            state,
        ),
        { valid: true, errors: [] },
    );
    const localizedPayload =
        structuredClone(payload);
    localizedPayload.reviews[0]
        .operations[0].summary =
        '蒂娜会保护弱小者。';
    assert.equal(
        validateMemoryConsolidation(
            localizedPayload,
            state,
        ).valid,
        true,
    );
    const next = applyMemoryConsolidation(
        state,
        payload,
    );
    const profile = next.actorLibrary[0];
    assert.equal(
        profile.sharedMemories.core.length,
        1,
    );
    assert.equal(
        profile.sharedMemories.recent.length,
        1,
    );
    assert.equal(
        profile.sharedMemories.everyday.length,
        0,
    );
    assert.equal(
        next.memoryDirector.lastReviewedTurn,
        8,
    );
    assert.equal(
        next.memoryDirector
            .pendingEventBoundary.status,
        'consumed',
    );
});

test('an explicitly instantaneous magical action may advance less than fifteen minutes', () => {
    const foundation = createDirectorFoundation();
    const base = createInitialWorldState(createDefaultCharacterDraft(), {});
    base.clock = '1991-07-24 · 09:15';
    base.actors = [{ id: 'tina_mother', name: 'Mei Zhang', present: true }];
    const state = applyDirectorFoundation(base, foundation);
    const transaction = {
        elapsedMinutes: 2,
        instantaneousMagic: true,
        exceptionReasonEn: 'A single wand reaction resolves instantly.',
        publicEventEn: 'A brief spark jumps from the wand.',
        segments: [{ type: 'narration', textEn: 'A spark flashes and vanishes.' }],
        actorUpdates: [],
        revealedClues: [],
    };
    const magical = applyTurnTransaction(state, transaction, '我举起魔杖施法。');
    const mundane = applyTurnTransaction(
        state,
        {
            ...transaction,
            instantaneousMagic: false,
            exceptionReasonEn: '',
        },
        '我看向桌子。',
    );
    assert.equal(advanceWorldClock('1991-12-31 · 23:55', 15), '1992-01-01 · 00:10');
    assert.equal(magical.clock, '1991-07-24 · 09:17');
    assert.equal(mundane.clock, '1991-07-24 · 09:30');
});

test('daily time policy advances ordinary turns locally without a per-turn director decision', () => {
    const policy = {
        defaultMinutes: 15,
        movementMinutes: 20,
        investigationMinutes: 35,
        extendedActionMinutes: 90,
        instantaneousMagicMinutes: 2,
    };
    assert.equal(getWorldDate('1991-07-24 · 09:30'), '1991-07-24');
    assert.equal(isDailyDirectorPlanCurrent('1991-07-24 · 09:30', {
        date: '1991-07-24',
        status: 'ready',
        plan: { timePolicy: policy },
    }), true);
    assert.equal(isDailyDirectorPlanCurrent('1991-07-25 · 00:01', {
        date: '1991-07-24',
        status: 'ready',
        plan: { timePolicy: policy },
    }), false);
    assert.equal(estimateTurnMinutes('我回答了麦格的问题。', policy), 15);
    assert.equal(estimateTurnMinutes('我前往厨房。', policy), 20);
    assert.equal(estimateTurnMinutes('我仔细检查照片。', policy), 35);
    assert.equal(estimateTurnMinutes('我练习魔药一整个下午。', policy), 90);
    assert.equal(estimateTurnMinutes('我举起魔杖施法。', policy), 2);
    assert.equal(
        estimateTurnMinutes(
            '你的魔杖是不是水晶做的？',
            policy,
        ),
        15,
    );
});

test('turn performance budgets scale prose to the locally decided duration', () => {
    const policy = {
        defaultMinutes: 15,
        movementMinutes: 20,
        investigationMinutes: 35,
        extendedActionMinutes: 90,
        instantaneousMagicMinutes: 2,
    };
    assert.deepEqual(createTurnPerformanceBudget('我回答麦格教授。', policy), {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    });
    assert.deepEqual(createTurnPerformanceBudget('我练习魔药一整个下午。', policy), {
        elapsedMinutes: 90,
        minimumWords: 540,
        maximumWords: 860,
    });
    assert.deepEqual(createTurnPerformanceBudget('我举起魔杖施法。', policy), {
        elapsedMinutes: 2,
        minimumWords: 60,
        maximumWords: 380,
    });
    assert.deepEqual(
        createTurnPerformanceBudget(
            '你等下一起上课吗？',
            policy,
            {
                adjudicatedMinutes:
                    15,
            },
        ),
        {
            elapsedMinutes: 15,
            minimumWords: 240,
            maximumWords: 560,
        },
    );
    assert.deepEqual(
        createTurnPerformanceBudget(
            '我在人群里和大家说话。',
            policy,
            {
                activeNamedActorCount: 6,
            },
        ),
        {
            elapsedMinutes: 15,
            minimumWords: 420,
            maximumWords: 860,
            activeNamedActorCount: 6,
            ensemble: true,
            minimumSegments: 6,
            maximumSegments: 20,
            primaryProgressionShare:
                0.4,
            maximumIndividuatedSecondaryActors:
                2,
        },
    );
    assert.deepEqual(
        createTurnPerformanceBudget(
            '我举起魔杖施法。',
            policy,
            {
                activeNamedActorCount: 6,
            },
        ),
        {
            elapsedMinutes: 2,
            minimumWords: 60,
            maximumWords: 380,
        },
    );
});

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
    const state = createSceneTransitionState();
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
        createSceneTransitionState();
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

test('first-year players may self-study or experiment with later curriculum spells', () => {
    const state =
        createSceneTransitionState();
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
        createSceneTransitionState();
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
        createSceneTransitionState();
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
        createSceneTransitionState();
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
    const state = createSceneTransitionState();
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
    const state = createSceneTransitionState();
    const check = resolveActionCheck(
        state,
        '我仔细检查桌下。',
        { randomInt: () => 12 },
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

test('scene performance requires substantial narration for a fifteen-minute turn', () => {
    const words = (prefix, count) => Array.from(
        { length: count },
        (_, index) => `${prefix}${index}`,
    ).join(' ');
    const state = {
        clock: '1991-07-24 · 11:15',
        actors: [{ id: 'minerva_mcgonagall', present: true }],
        actorLibrary: [{
            id: 'minerva_mcgonagall',
            impressionOfPlayerEn:
                'A difficult child with unexpected nerve.',
            impressionUpdatedTurn: 0,
        }],
        turn: {
            count: 5,
        },
    };
    const budget = {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    };
    const validPayload = {
        publicEventEn: 'Tina lets McGonagall enter, attempts to trip her, and faces the professor across the kitchen table.',
        eventEnded: false,
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
            ],
        },
        segments: [
            { type: 'narration', textEn: words('movement', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply', 45) },
            { type: 'narration', textEn: words('setting', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('question', 45) },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Sitting at the kitchen table opposite Tina.',
            impressionOfPlayerEn:
                'Bold, disorderly, and unwilling to retreat after an awkward confrontation.',
            memoryUpdate: {
                summaryEn:
                    'Tina attempted to trip McGonagall, then remained at the kitchen table.',
                significance: 'notable',
                lastingImpactEn:
                    'McGonagall will treat future physical defiance as a real disciplinary risk.',
            },
        }],
    };
    const valid = validateScenePerformance(
        validPayload,
        state,
        budget,
    );
    assert.deepEqual(valid, { valid: true, errors: [] });
    const compactPayload =
        structuredClone(validPayload);
    compactPayload.segments = [{
        type: 'narration',
        textEn:
            'Hermione glances down at her wand.',
    }, {
        type: 'dialogue',
        actorId:
            'minerva_mcgonagall',
        textEn:
            'It is wood, not crystal.',
    }];
    assert.deepEqual(
        validateScenePerformance(
            compactPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const placeholderPayload = {
        ...structuredClone(
            compactPayload,
        ),
        protocolVersion: 2,
        segments: [{
            type: 'narration',
            textEn: '...',
        }, {
            type: 'dialogue',
            actorId:
                'minerva_mcgonagall',
            textEn: '……',
        }, {
            type: 'narration',
            textEn: 'TBD',
        }],
    };
    assert.match(
        validateScenePerformance(
            placeholderPayload,
            state,
            budget,
        ).errors.join('；'),
        /省略号或占位文本/u,
    );
    const firstSightState =
        createSceneTransitionState();
    const firstSightProfile =
        firstSightState.actorLibrary
            .find(actor =>
                actor.id ===
                    'minerva_mcgonagall');
    delete firstSightProfile
        .firstImpressionOfPlayerEn;
    firstSightProfile
        .firstImpressionPending = true;
    const firstSightActor =
        firstSightState.actors.find(
            actor =>
                actor.id ===
                    'minerva_mcgonagall',
        );
    delete firstSightActor
        .firstImpressionOfPlayerEn;
    firstSightActor
        .firstImpressionPending = true;
    const firstSightPayload = {
        ...structuredClone(validPayload),
        actorPresence: {
            presentActorIdsAfterTurn:
                firstSightState.actors
                    .filter(actor =>
                        actor.present !== false)
                    .map(actor =>
                        actor.id),
        },
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn:
                'Watching Tina from across the kitchen.',
        }],
    };
    assert.deepEqual(
        validateScenePerformance(
            firstSightPayload,
            firstSightState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    firstSightPayload.actorUpdates[0]
        .firstImpressionOfPlayerEn =
        'A small Chinese girl in careful clothes, watching adults with guarded concentration.';
    assert.deepEqual(
        validateScenePerformance(
            firstSightPayload,
            firstSightState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const firstSightCommitted =
        applyTurnTransaction(
            firstSightState,
            {
                elapsedMinutes: 15,
                publicEventEn:
                    firstSightPayload
                        .publicEventEn,
                actorPresence:
                    firstSightPayload
                        .actorPresence,
                segments:
                    firstSightPayload
                        .segments,
                actorUpdates:
                    firstSightPayload
                        .actorUpdates,
                itemUpdates: [],
                revealedClues: [],
            },
            'I answer the professor.',
        );
    const committedProfile =
        firstSightCommitted.actorLibrary
            .find(actor =>
                actor.id ===
                    'minerva_mcgonagall');
    assert.equal(
        committedProfile
            .firstImpressionOfPlayerEn,
        firstSightPayload.actorUpdates[0]
            .firstImpressionOfPlayerEn,
    );
    assert.equal(
        committedProfile
            .firstImpressionPending,
        false,
    );
    assert.equal(
        validateScenePerformance(
            firstSightPayload,
            firstSightCommitted,
            budget,
        ).valid,
        false,
    );
    const activityRecap =
        structuredClone(validPayload);
    activityRecap.actorUpdates[0]
        .impressionOfPlayerEn =
        'Currently annoyed by Tina at the kitchen table.';
    assert.match(
        validateScenePerformance(
            activityRecap,
            state,
            budget,
        ).errors.join('；'),
        /主观 shorthand/,
    );
    const normalizedActivityRecap =
        normalizeScenePerformanceActorLocations(
            activityRecap,
            state,
        );
    assert.equal(
        normalizedActivityRecap
            .actorUpdates[0]
            .impressionOfPlayerEn,
        undefined,
    );
    assert.equal(
        normalizedActivityRecap
            .actorUpdates[0]
            .currentActivityEn,
        activityRecap.actorUpdates[0]
            .currentActivityEn,
    );
    assert.deepEqual(
        validateScenePerformance(
            normalizedActivityRecap,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const incompleteNotable =
        structuredClone(validPayload);
    delete incompleteNotable
        .actorUpdates[0]
        .memoryUpdate
        .lastingImpactEn;
    const normalizedIncompleteNotable =
        normalizeScenePerformanceActorLocations(
            incompleteNotable,
            state,
        );
    assert.equal(
        normalizedIncompleteNotable
            .actorUpdates[0]
            .memoryUpdate,
        undefined,
    );
    assert.deepEqual(
        validateScenePerformance(
            normalizedIncompleteNotable,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const cooldownState =
        structuredClone(state);
    cooldownState.actorLibrary[0]
        .impressionUpdatedTurn = 4;
    assert.match(
        validateScenePerformance(
            validPayload,
            cooldownState,
            budget,
        ).errors.join('；'),
        /过于频繁变化/,
    );
    const normalizedCooldown =
        normalizeScenePerformanceActorLocations(
            validPayload,
            cooldownState,
        );
    assert.equal(
        normalizedCooldown.actorUpdates[0]
            .impressionOfPlayerEn,
        undefined,
    );
    assert.ok(
        normalizedCooldown.actorUpdates[0]
            .memoryUpdate,
    );
    assert.deepEqual(
        validateScenePerformance(
            normalizedCooldown,
            cooldownState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const longPayload =
        structuredClone(validPayload);
    longPayload.segments[0].textEn =
        words('extended', 800);
    assert.deepEqual(
        validateScenePerformance(
            longPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const movement = {
        moved: true,
        toMapId: 'diagon_alley',
        toRoomId: 'gringotts_steps',
        toRoomName: '古灵阁台阶',
        toRoomNameEn: 'Gringotts',
    };
    const missingArrival =
        validateScenePerformance(
            validPayload,
            state,
            budget,
            null,
            null,
            movement,
        );
    assert.equal(missingArrival.valid, false);
    assert.match(
        missingArrival.errors.join('；'),
        /明确抵达/,
    );
    const arrivedPayload =
        structuredClone(validPayload);
    arrivedPayload.publicEventEn +=
        ' They arrive at Gringotts.';
    assert.deepEqual(
        validateScenePerformance(
            arrivedPayload,
            state,
            budget,
            null,
            null,
            movement,
        ),
        { valid: true, errors: [] },
    );
    const localizedDestination =
        structuredClone(validPayload);
    localizedDestination.publicEventEn +=
        ' They reach the southern stretch of Diagon Alley.';
    assert.deepEqual(
        validateScenePerformance(
            localizedDestination,
            state,
            budget,
            null,
            null,
            {
                moved: true,
                toMapId: 'diagon_alley',
                toRoomId: 'diagon_south',
                toRoomName: '对角巷南段',
                toRoomNameEn: '对角巷南段',
            },
        ),
        { valid: true, errors: [] },
    );
    const possessiveDestination =
        structuredClone(validPayload);
    possessiveDestination.publicEventEn +=
        ' They enter Madam Malkin\'s robe shop.';
    assert.deepEqual(
        validateScenePerformance(
            possessiveDestination,
            state,
            budget,
            null,
            null,
            {
                moved: true,
                toMapId: 'diagon_alley',
                toRoomId: 'madam_malkins',
                toRoomName: '摩金夫人长袍店',
                toRoomNameEn: '摩金夫人长袍店',
            },
        ),
        { valid: true, errors: [] },
    );
    const playerDialogue =
        structuredClone(validPayload);
    playerDialogue.segments[1].actorId =
        'player_tina';
    const invalidPlayerDialogue =
        validateScenePerformance(
            playerDialogue,
            state,
            budget,
        );
    assert.equal(invalidPlayerDialogue.valid, false);
    assert.match(
        invalidPlayerDialogue.errors.join('；'),
        /player_tina/,
    );
    const missingCompanionUpdate =
        validateScenePerformance(
            arrivedPayload,
            state,
            budget,
            null,
            null,
            {
                ...movement,
                companionIds: [
                    'minerva_mcgonagall',
                ],
            },
        );
    assert.equal(
        missingCompanionUpdate.valid,
        false,
    );
    assert.match(
        missingCompanionUpdate.errors.join('；'),
        /同行者/,
    );
    const unauthorizedCore =
        structuredClone(validPayload);
    unauthorizedCore.actorUpdates[0]
        .memoryUpdate.targetTier = 'core';
    assert.equal(
        validateScenePerformance(
            unauthorizedCore,
            state,
            budget,
        ).valid,
        false,
    );

    const pacingState = {
        ...state,
        pacingDirector: {
            pendingBeat: {
                status: 'pending',
                kind: 'complication',
                beatEn: 'A delivery crashes into the doorway.',
                pressureEn: 'Someone must identify the missing parcel.',
                actorEntrances: [],
                guestActor: null,
            },
        },
    };
    const pacingPayload = {
        publicEventEn: 'A delivery crashes into the doorway and interrupts the discussion.',
        eventEnded: false,
        pacingBeatRealized: false,
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
            ],
        },
        segments: [
            { type: 'narration', textEn: words('arrival', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply', 45) },
            { type: 'narration', textEn: words('parcel', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('question', 45) },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Inspecting the parcel at the doorway.',
        }],
    };
    const ignoredPacing = validateScenePerformance(
        pacingPayload,
        pacingState,
        budget,
    );
    assert.equal(ignoredPacing.valid, false);
    assert.match(ignoredPacing.errors.join('；'), /节奏转机/);
    pacingPayload.pacingBeatRealized = true;
    assert.deepEqual(
        validateScenePerformance(
            pacingPayload,
            pacingState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const momentum = {
        required: true,
        explicitProgressionRequest: true,
    };
    const missingProgress = validateScenePerformance(
        pacingPayload,
        pacingState,
        budget,
        momentum,
    );
    assert.equal(missingProgress.valid, false);
    assert.match(
        missingProgress.errors.join('；'),
        /sceneProgression/,
    );
    pacingPayload.sceneProgression = {
        type: 'access_change',
        summaryEn: 'McGonagall prepares to open the brick wall.',
        completedRequestedStep: true,
    };
    const stalledProgress = validateScenePerformance(
        pacingPayload,
        pacingState,
        budget,
        momentum,
    );
    assert.equal(stalledProgress.valid, false);
    assert.match(
        stalledProgress.errors.join('；'),
        /准备阶段/,
    );
    pacingPayload.sceneProgression = {
        type: 'access_change',
        summaryEn: 'McGonagall opens the brick wall and reveals the archway.',
        completedRequestedStep: true,
    };
    assert.deepEqual(
        validateScenePerformance(
            pacingPayload,
            pacingState,
            budget,
            momentum,
        ),
        { valid: true, errors: [] },
    );
    const failedRequestedStep =
        structuredClone(pacingPayload);
    failedRequestedStep.checkApplied =
        true;
    failedRequestedStep
        .sceneProgression = {
            type: 'social_shift',
            summaryEn:
                'Hermione catches Tina searching her books and takes them back.',
            completedRequestedStep:
                false,
        };
    assert.deepEqual(
        validateScenePerformance(
            failedRequestedStep,
            pacingState,
            budget,
            momentum,
            {
                id: 'failed-check',
                outcome: 'failure',
            },
        ),
        { valid: true, errors: [] },
    );
    const checkPayload = structuredClone(pacingPayload);
    const ignoredCheck = validateScenePerformance(
        checkPayload,
        pacingState,
        budget,
        momentum,
        { id: 'local-check' },
    );
    assert.equal(ignoredCheck.valid, false);
    assert.match(
        ignoredCheck.errors.join('；'),
        /本地判定结果/,
    );
    checkPayload.checkApplied = true;
    assert.deepEqual(
        validateScenePerformance(
            checkPayload,
            pacingState,
            budget,
            momentum,
            { id: 'local-check' },
        ),
        { valid: true, errors: [] },
    );
    const missingPresence =
        structuredClone(validPayload);
    delete missingPresence.actorPresence;
    assert.match(
        validateScenePerformance(
            missingPresence,
            state,
            budget,
        ).errors.join('；'),
        /完整的回合结束在场人物名单/,
    );
    const normalizedMissingPresence =
        normalizeScenePerformanceActorLocations(
            missingPresence,
            state,
        );
    assert.deepEqual(
        normalizedMissingPresence
            .actorPresence
            .presentActorIdsAfterTurn,
        state.actors
            .filter(actor =>
                actor.present !== false)
            .map(actor =>
                actor.id),
    );
    assert.deepEqual(
        validateScenePerformance(
            normalizedMissingPresence,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const exitedPayload =
        structuredClone(validPayload);
    exitedPayload.actorPresence
        .presentActorIdsAfterTurn = [];
    exitedPayload.actorUpdates[0].present =
        false;
    exitedPayload.actorUpdates[0]
        .currentActivityEn =
        'Continuing down the corridor after leaving the kitchen.';
    assert.deepEqual(
        validateScenePerformance(
            exitedPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const exitedState = applyTurnTransaction(
        state,
        {
            elapsedMinutes: 15,
            publicEventEn:
                exitedPayload.publicEventEn,
            actorPresence:
                exitedPayload.actorPresence,
            segments:
                exitedPayload.segments,
            actorUpdates:
                exitedPayload.actorUpdates,
            itemUpdates: [],
            revealedClues: [],
        },
        'I wave goodbye.',
    );
    assert.equal(
        exitedState.actors[0].present,
        false,
    );
    const mismatchedPresence =
        structuredClone(exitedPayload);
    mismatchedPresence.actorUpdates[0]
        .present = true;
    assert.match(
        validateScenePerformance(
            mismatchedPresence,
            state,
            budget,
        ).errors.join('；'),
        /present 与回合结束在场名单不一致/,
    );
    const temporaryId =
        'temp_corridor_prefect_01';
    const temporaryEntrance = {
        id: temporaryId,
        nameEn:
            'Slytherin Prefect',
        roleEn:
            'Passing Slytherin prefect',
        publicDescriptionEn:
            'A tall student in green-trimmed robes.',
        personalityEn:
            'Busy, aloof, and observant.',
        speechStyleEn:
            'Curt and dismissive.',
        currentActivityEn:
            'Pausing in the corridor after Tina calls out.',
    };
    const directAddressPayload =
        structuredClone(validPayload);
    directAddressPayload
        .temporaryActorEntrances = [
            temporaryEntrance,
        ];
    directAddressPayload
        .actorPresence
        .presentActorIdsAfterTurn
        .push(temporaryId);
    directAddressPayload.segments[1] = {
        type: 'dialogue',
        actorId: temporaryId,
        textEn:
            words('prefect_reply', 45),
    };
    directAddressPayload.actorUpdates
        .push({
            id: temporaryId,
            present: true,
            currentActivityEn:
                'Standing in the corridor and refusing Tina\'s order.',
        });
    assert.deepEqual(
        validateScenePerformance(
            directAddressPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const temporaryCommitted =
        applyTurnTransaction(
            state,
            {
                elapsedMinutes: 15,
                publicEventEn:
                    directAddressPayload
                        .publicEventEn,
                actorPresence:
                    directAddressPayload
                        .actorPresence,
                temporaryActorEntrances:
                    directAddressPayload
                        .temporaryActorEntrances,
                segments:
                    directAddressPayload
                        .segments,
                actorUpdates:
                    directAddressPayload
                        .actorUpdates,
                itemUpdates: [],
                revealedClues: [],
            },
            'I shout to the Slytherin prefect.',
        );
    assert.equal(
        temporaryCommitted
            .actors.find(actor =>
                actor.id === temporaryId)
            .temporary,
        true,
    );
    assert.equal(
        temporaryCommitted
            .actorLibrary.some(actor =>
                actor.id === temporaryId),
        false,
    );
    const localizedTemporaryTransaction = {
        protocolVersion: 2,
        elapsedMinutes: 15,
        publicEventEn:
            directAddressPayload
                .publicEventEn,
        actorPresence:
            structuredClone(
                directAddressPayload
                    .actorPresence,
            ),
        temporaryActorEntrances: [{
            ...temporaryEntrance,
            name:
                '斯莱特林级长',
            role:
                '路过的斯莱特林级长',
            publicDescription:
                '一名高个学生。',
            personality:
                '忙碌、冷淡、警觉。',
            speechStyle:
                '简短而不耐烦。',
            currentActivity:
                '被蒂娜叫住后停在走廊里。',
        }],
        segments:
            structuredClone(
                directAddressPayload
                    .segments,
            ),
        actorUpdates:
            structuredClone(
                directAddressPayload
                    .actorUpdates,
            ),
        itemUpdates: [],
        revealedClues: [],
    };
    assert.match(
        validateTurnTransaction(
            localizedTemporaryTransaction,
            state,
        ).errors.join('；'),
        /临时入场人物不得写入字段/u,
    );
    const localizedTemporaryCommitted =
        applyTurnTransaction(
            state,
            localizedTemporaryTransaction,
            'I shout to the Slytherin prefect.',
        );
    const localizedTemporaryActor =
        localizedTemporaryCommitted
            .actors.find(actor =>
                actor.id === temporaryId);
    assert.equal(
        localizedTemporaryActor.name,
        '斯莱特林级长',
    );
    assert.equal(
        localizedTemporaryActor
            .role,
        '路过的斯莱特林级长',
    );
    const missingTemporaryUpdate =
        structuredClone(
            directAddressPayload,
        );
    missingTemporaryUpdate.actorUpdates =
        missingTemporaryUpdate
            .actorUpdates
            .filter(update =>
                update.id !==
                temporaryId);
    assert.match(
        validateScenePerformance(
            missingTemporaryUpdate,
            state,
            budget,
        ).errors.join('；'),
        /临时入场人物.*最终在场状态一致/,
    );

    const invalid = validateScenePerformance({
        publicEventEn: 'The player completes the stated action and the characters respond.',
        segments: [
            { type: 'narration', textEn: 'The door opens.' },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply', 80) },
            { type: 'narration', textEn: 'A chair moves.' },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('answer', 80) },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Waiting.',
            currentIntentEn: 'Learn Tina secrets.',
        }],
    }, state, budget);
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.some(error => error.includes('通用占位句')));
    assert.equal(
        invalid.errors.some(error =>
            error.includes(
                '动作与场景描写过短',
            )),
        false,
    );
    assert.ok(invalid.errors.some(error => error.includes('currentIntentEn')));
});

test('scene time authority bounds relative narration and rejects invented schedules', () => {
    const state = {
        clock: '1991-07-24 · 14:35',
    };
    const budget = {
        elapsedMinutes: 15,
    };
    const valid = {
        publicEventEn:
            'The group finishes at 14:50 and enters the shop.',
        segments: [{
            type: 'narration',
            textEn:
                'Later that afternoon, Ollivander\'s fingers closed after the wand jerked in Tina\'s grip.',
        }],
        actorUpdates: [],
    };
    assert.deepEqual(
        validateSceneTemporalConsistency(
            valid,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );

    const boundedRelative = {
        ...valid,
        segments: [{
            type: 'narration',
            textEn:
                'Ten minutes ago, Hermione left the armchair. Five minutes later, she reached the portrait hole.',
        }],
    };
    assert.deepEqual(
        validateSceneTemporalConsistency(
            boundedRelative,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );

    const overlongRelative =
        structuredClone(valid);
    overlongRelative
        .segments[0]
        .textEn = [
            'Sixteen minutes later, Hermione reaches the door.',
            'They have ten minutes before breakfast.',
        ].join(' ');
    const overlongValidation =
        validateSceneTemporalConsistency(
            overlongRelative,
            state,
            budget,
        );
    assert.equal(
        overlongValidation.valid,
        false,
    );
    assert.match(
        overlongValidation
            .errors.join('；'),
        /Sixteen minutes later/,
    );
    assert.match(
        overlongValidation
            .errors.join('；'),
        /ten minutes before/,
    );

    const invented = structuredClone(valid);
    invented.segments[0].textEn = [
        'The filling has been hot since noon.',
        'They have twenty minutes before the shop closes.',
        'The room looks unchanged from two hours earlier.',
        'Madam Malkin says the shop closes at four o’clock.',
        'The shop closes after dusk.',
    ].join(' ');
    const validation =
        validateSceneTemporalConsistency(
            invented,
            state,
            budget,
        );
    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join('；'),
        /系统时间权威/,
    );
    assert.match(
        validation.errors.join('；'),
        /since noon/,
    );
    assert.match(
        validation.errors.join('；'),
        /twenty minutes before/,
    );
    assert.match(
        validation.errors.join('；'),
        /shop closes after/,
    );
    assert.match(
        validation.errors.join('；'),
        /two hours earlier/,
    );
    assert.match(
        validation.errors.join('；'),
        /closes at/,
    );

    const transportSchedule = {
        ...valid,
        segments: [{
            type: 'dialogue',
            actorId:
                'minerva_mcgonagall',
            textEn:
                'On the first of September, the train departs at eleven.',
        }],
    };
    const transportValidation =
        validateSceneTemporalConsistency(
            transportSchedule,
            state,
            budget,
        );
    assert.equal(
        transportValidation.valid,
        false,
    );
    assert.match(
        transportValidation.errors.join('；'),
        /first of September/i,
    );
    assert.match(
        transportValidation.errors.join('；'),
        /train departs at eleven/i,
    );
    assert.deepEqual(
        validateSceneTemporalConsistency(
            transportSchedule,
            state,
            budget,
            'On the first of September, the train departs at eleven.',
        ),
        { valid: true, errors: [] },
    );

    const userRequestedWait = {
        ...valid,
        segments: [{
            type: 'narration',
            textEn:
                'Twenty minutes later, Tina stands up.',
        }],
    };
    assert.deepEqual(
        validateSceneTemporalConsistency(
            userRequestedWait,
            state,
            budget,
            'I wait here. Twenty minutes later, I stand up.',
        ),
        { valid: true, errors: [] },
    );
});

test('an offstage actor cannot form impression or memory without a sightline', () => {
    const words = (prefix, count) => Array.from(
        { length: count },
        (_, index) => `${prefix}${index}`,
    ).join(' ');
    const state = {
        map: {
            activeMapId: 'diagon_alley',
            currentLocalNodeId: 'madam_malkins',
            generatedLocalNodes: [],
            generatedLocalExits: [],
            exitStates: {},
        },
        actors: [{
            id: 'tom_leaky_bartender',
            nameEn: 'Tom',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        }],
    };
    const spatial = buildSpatialContext(state)
        .actors[0];
    assert.equal(spatial.canSeePlayer, false);
    assert.equal(spatial.canHearPlayer, false);
    const payload = {
        publicEventEn:
            'Tina argues with Eddie inside Madam Malkin.',
        eventEnded: false,
        actorPresence: {
            presentActorIdsAfterTurn: [
                'tom_leaky_bartender',
            ],
        },
        segments: [
            {
                type: 'narration',
                textEn: words('movement', 45),
            },
            {
                type: 'narration',
                textEn: words('setting', 45),
            },
            {
                type: 'narration',
                textEn: words('reaction', 45),
            },
            {
                type: 'narration',
                textEn: words('aftermath', 45),
            },
        ],
        actorUpdates: [{
            id: 'tom_leaky_bartender',
            present: true,
            currentActivityEn:
                'Wiping a glass behind the distant bar.',
            impressionOfPlayerEn:
                'Loud, reckless, and prone to public accusations.',
            memoryUpdate: {
                summaryEn:
                    'Tina argued with Eddie inside Madam Malkin.',
                significance: 'everyday',
            },
        }],
    };
    const validation = validateScenePerformance(
        payload,
        state,
        {
            elapsedMinutes: 15,
            minimumWords: 240,
            maximumWords: 560,
        },
    );
    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join('；'),
        /无法看见或听见玩家/,
    );
    const normalized =
        normalizeScenePerformanceActorLocations(
            payload,
            state,
        );
    assert.equal(
        normalized.actorUpdates[0]
            .impressionOfPlayerEn,
        undefined,
    );
    assert.equal(
        normalized.actorUpdates[0]
            .memoryUpdate,
        undefined,
    );
    assert.equal(
        normalized.actorUpdates[0]
            .currentActivityEn,
        payload.actorUpdates[0]
            .currentActivityEn,
    );
    assert.deepEqual(
        validateScenePerformance(
            normalized,
            state,
            {
                elapsedMinutes: 15,
                minimumWords: 240,
                maximumWords: 560,
            },
        ),
        { valid: true, errors: [] },
    );
});

test('low-tier actor movement is limited to reachable existing rooms', () => {
    const words = prefix => Array.from(
        { length: 45 },
        (_, index) => `${prefix}${index}`,
    ).join(' ');
    const state = createSceneTransitionState();
    const payload = roomId => ({
        publicEventEn: 'McGonagall crosses from the kitchen into the back garden while Tina circles the lawn.',
        eventEnded: false,
        actorPresence: {
            presentActorIdsAfterTurn:
                state.actors
                    .filter(actor =>
                        actor.present !== false)
                    .map(actor =>
                        actor.id),
        },
        segments: [
            { type: 'narration', textEn: words('movement') },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply') },
            { type: 'narration', textEn: words('garden') },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('warning') },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Standing at the edge of the back garden.',
            mapId: 'zhang_home',
            roomId,
        }],
    });
    const budget = {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    };

    assert.deepEqual(
        validateScenePerformance(payload('back_garden'), state, budget),
        { valid: true, errors: [] },
    );
    const invalid = validateScenePerformance(
        payload('invented_tower'),
        state,
        budget,
    );
    assert.equal(invalid.valid, false);
    assert.match(invalid.errors.join('；'), /目标房间不可达/);
});

test('model slot settings migrate legacy limits to output headroom and clamp to context size', () => {
    const slots = normalizeModelSlots({
        low: {
            profileId: 'low-profile',
            maxTokens: 3000,
            contextSize: 2048,
        },
        medium: {
            presetName: 'Marina',
            regexPresetId: 'regex-1',
            contextSize: 65536,
            maxResponseLength: 4096,
        },
    });
    assert.equal(slots.low.contextSize, 32768);
    assert.equal(
        slots.low.maxResponseLength,
        DEFAULT_RESPONSE_HEADROOM,
    );
    assert.equal(
        slots.low.responseHeadroomVersion,
        RESPONSE_HEADROOM_VERSION,
    );
    assert.equal(Object.hasOwn(slots.low, 'maxTokens'), false);
    assert.equal(slots.medium.presetName, 'Marina');
    assert.equal(slots.medium.regexPresetId, 'regex-1');
    assert.equal(
        slots.medium.maxResponseLength,
        DEFAULT_RESPONSE_HEADROOM,
    );
    assert.equal(slots.high.contextSize, 120000);
    assert.equal(
        slots.high.maxResponseLength,
        DEFAULT_RESPONSE_HEADROOM,
    );
    const explicit = normalizeModelSlots({
        low: {
            maxResponseLength: 3000,
            responseHeadroomVersion:
                RESPONSE_HEADROOM_VERSION,
        },
    });
    assert.equal(
        explicit.low.maxResponseLength,
        3000,
    );
});

test('role context size limits old message content while preserving recent content', () => {
    const messages = [
        { role: 'system', content: 'S'.repeat(500) },
        { role: 'user', content: 'old-' + 'A'.repeat(30000) },
        { role: 'user', content: 'recent-action' },
    ];
    const plan = createContextBudgetPlan(
        32768,
        18576,
    );
    const limited = limitMessagesToContext(
        messages,
        32768,
        18576,
    );
    assert.ok(limited.reduce(
        (sum, message) =>
            sum + message.content.length,
        0,
    ) <= plan.maxPromptCharacters);
    assert.equal(limited.at(-1).content, 'recent-action');
    assert.notEqual(messages[1].content, limited[1].content);
});

test('adaptive context plans scale RAG and memory depth up to 120K', () => {
    const lean = createContextBudgetPlan(
        32768,
        4096,
    );
    const balanced = createContextBudgetPlan(
        65536,
        6000,
    );
    const rich = createContextBudgetPlan(
        120000,
        4096,
    );
    assert.equal(lean.mode, 'lean');
    assert.equal(lean.ragLimit, 3);
    assert.equal(lean.chapterMessageLimit, 8);
    assert.equal(balanced.mode, 'balanced');
    assert.equal(balanced.ragLimit, 6);
    assert.equal(
        balanced.chapterMessageLimit,
        16,
    );
    assert.equal(rich.mode, 'rich');
    assert.equal(rich.ragLimit, 10);
    assert.equal(rich.chapterMessageLimit, 32);
    assert.ok(rich.mandatoryReserveTokens >= 6000);

    const memories = {
        core: Array.from(
            { length: 3 },
            (_, index) => ({
                id: `core_${index}`,
                summaryEn: `Core ${index}`,
            }),
        ),
        recent: Array.from(
            { length: 6 },
            (_, index) => ({
                id: `recent_${index}`,
                summaryEn: `Recent ${index}`,
            }),
        ),
        everyday: Array.from(
            { length: 8 },
            (_, index) => ({
                id: `daily_${index}`,
                summaryEn: `Daily ${index}`,
            }),
        ),
    };
    const leanMemories =
        selectSharedMemoriesForContext(
            memories,
            lean,
        );
    const richMemories =
        selectSharedMemoriesForContext(
            memories,
            rich,
        );
    assert.deepEqual(
        Object.fromEntries(
            Object.entries(leanMemories).map(
                ([tier, items]) => [
                    tier,
                    items.length,
                ],
            ),
        ),
        { core: 3, recent: 2, everyday: 1 },
    );
    assert.deepEqual(
        Object.fromEntries(
            Object.entries(richMemories).map(
                ([tier, items]) => [
                    tier,
                    items.length,
                ],
            ),
        ),
        { core: 3, recent: 6, everyday: 8 },
    );
});

test('map proposals cannot rewrite a canon location during exploration', () => {
    const proposal = {
        changes: [{
            operation: 'update',
            node: {
                id: 'hogwarts_castle',
                name: '另一个城堡',
            },
        }],
    };
    const result = validateMapProposal(proposal, {
        trigger: 'exploration',
        baseMap: PRESET_WORLD_MAP,
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /没有修改原著地点的因果权限/);
    assert.match(result.errors.join(' '), /改写原著地点身份或坐标/);
});

test('validated World Director additions are committed as generated map nodes', () => {
    const proposal = {
        id: 'proposal-1',
        reason: 'The player deliberately searched behind the old tapestry.',
        changes: [{
            operation: 'add',
            node: {
                id: 'forgotten_tapestry_room',
                regionId: 'hogwarts',
                name: '旧挂毯后的房间',
                kind: 'secret_room',
                summary: '一间没有出现在公开校舍图上的狭小房间。',
                access: 'restricted',
                x: 44,
                y: 51,
            },
        }],
    };
    const validation = validateMapProposal(proposal, {
        trigger: 'exploration',
        baseMap: PRESET_WORLD_MAP,
    });
    assert.equal(validation.valid, true);

    const next = applyMapProposal({
        generatedNodes: [],
        nodeOverrides: {},
        proposals: [],
    }, proposal);
    assert.equal(next.generatedNodes[0].id, 'forgotten_tapestry_room');
    assert.equal(next.generatedNodes[0].locked, false);
    assert.equal(next.proposals[0].id, 'proposal-1');
});

test('medium cartographer creates and reuses a missing container interior map', () => {
    const state = createKingsCrossState(
        'hogwarts_express',
    );
    const request =
        getInteriorMapRequest(state);
    assert.equal(
        request.status,
        'missing',
    );
    assert.equal(
        request.suggestedMapId,
        'kings_cross_hogwarts_express_interior',
    );
    const generatedMap = {
        version: 1,
        id: request.suggestedMapId,
        nameEn:
            'Hogwarts Express Interior',
        currentLevelId: 'train',
        currentRoomId:
            'entry_vestibule',
        levels: [{
            id: 'train',
            nameEn: 'Train',
            z: 0,
        }],
        rooms: [
            {
                id: 'entry_vestibule',
                nameEn:
                    'Entry Vestibule',
                levelId: 'train',
                kind: 'vestibule',
                descriptionEn:
                    'A narrow boarding vestibule links the platform door to the carriage corridor.',
                x: 12,
                y: 50,
                access: 'ticketed',
            },
            {
                id: 'forward_corridor',
                nameEn:
                    'Forward Carriage Corridor',
                levelId: 'train',
                kind: 'corridor',
                descriptionEn:
                    'A long corridor runs beside the forward student compartments.',
                x: 38,
                y: 50,
                access: 'student',
            },
            {
                id: 'student_compartments',
                nameEn:
                    'Student Compartments',
                levelId: 'train',
                kind: 'compartment',
                descriptionEn:
                    'Rows of sliding compartment doors face the carriage windows.',
                x: 64,
                y: 50,
                access: 'student',
            },
            {
                id: 'luggage_van',
                nameEn:
                    'Luggage Van',
                levelId: 'train',
                kind: 'service',
                descriptionEn:
                    'Secured racks hold trunks and school luggage near the rear of the train.',
                x: 88,
                y: 50,
                access: 'staff',
            },
        ],
        exits: [
            {
                from: 'entry_vestibule',
                to: 'forward_corridor',
                direction: 'forward',
                kind: 'door',
                minutes: 1,
            },
            {
                from: 'forward_corridor',
                to: 'student_compartments',
                direction: 'forward',
                kind: 'corridor',
                minutes: 1,
            },
            {
                from: 'student_compartments',
                to: 'luggage_van',
                direction: 'aft',
                kind: 'corridor',
                minutes: 2,
            },
        ],
    };
    assert.deepEqual(
        validateGeneratedInteriorMap(
            generatedMap,
            state,
            request,
        ),
        { valid: true, errors: [] },
    );
    const disconnected =
        structuredClone(generatedMap);
    disconnected.exits =
        disconnected.exits.slice(0, 1);
    assert.equal(
        validateGeneratedInteriorMap(
            disconnected,
            state,
            request,
        ).valid,
        false,
    );

    const entered =
        applyGeneratedInteriorMap(
            state,
            generatedMap,
            request,
        );
    assert.equal(
        entered.map.activeMapId,
        generatedMap.id,
    );
    assert.equal(
        entered.map.currentLocalNodeId,
        'entry_vestibule',
    );
    assert.equal(
        entered.scene.mapId,
        generatedMap.id,
    );
    assert.equal(
        entered.location,
        '霍格沃茨特快 · 内部',
    );
    assert.equal(
        entered.map.customLocalMaps
            .find(map =>
                map.id ===
                    generatedMap.id)
            .name,
        '霍格沃茨特快 · 内部',
    );
    assert.ok(
        entered.actors.every(actor =>
            actor.roomId ===
                'entry_vestibule'),
    );
    assert.equal(
        entered.items[0].roomId,
        'entry_vestibule',
    );
    assert.equal(
        entered.map.customLocalMaps
            .filter(map =>
                map.id ===
                    generatedMap.id)
            .length,
        1,
    );

    const parentReentry =
        structuredClone(entered);
    parentReentry.map.activeMapId =
        'kings_cross';
    parentReentry.map
        .currentLocalNodeId =
        'hogwarts_express';
    parentReentry.map.currentLevelId =
        'station';
    parentReentry.scene.mapId =
        'kings_cross';
    parentReentry.scene.roomId =
        'hogwarts_express';
    const readyRequest =
        getInteriorMapRequest(
            parentReentry,
        );
    assert.equal(
        readyRequest.status,
        'ready',
    );
    const reused =
        enterBoundInteriorMap(
            parentReentry,
            readyRequest,
        );
    assert.equal(
        reused.map.activeMapId,
        generatedMap.id,
    );
    assert.equal(
        reused.map.customLocalMaps
            .length,
        entered.map.customLocalMaps
            .length,
    );
    assert.equal(
        getInteriorMapRequest(reused),
        null,
    );
});

test('legacy Gryffindor dormitory scenes repair the parent room and request a persistent interior', () => {
    const state = {
        phase: 'playing',
        clock:
            '1991-09-02 · 02:20',
        location:
            '格兰芬多公共休息室',
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'gryffindor_common_room',
            currentLevelId:
                'seventh',
            discoveredLocalNodeIds:
                [],
            customLocalMaps: [],
            generatedLocalNodes: [],
            generatedLocalExits: [],
            interiorMapBindings: {},
            roomStates: {},
            exitStates: {},
        },
        scene: {
            id:
                'settling_in_gryffindor_dormitory',
            nameEn:
                'Gryffindor Common Room — Settling In',
            summaryEn:
                'The first-year girls climb the spiral staircase from the common room into their dormitory, where five four-poster beds wait.',
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            itemStates: [],
            nextSceneIntent: {
                titleEn:
                    'First Morning',
                summaryEn:
                    'The girls wake in their dormitory.',
                triggerEn:
                    'When the girls wake.',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'gryffindor_common_room',
                tier: 'medium',
            },
        },
        actors: [{
            id:
                'canon_lavender_brown',
            present: true,
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            currentActivityEn:
                'Climbing into the girls dormitory and scanning for the window bed.',
        }],
        items: [],
        spatial: {
            version: 5,
            player: {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'gryffindor_common_room',
            },
            lastMovement: null,
        },
    };
    const repaired =
        reconcileSpatialState(
            state,
        );
    assert.equal(
        repaired.changed,
        true,
    );
    assert.equal(
        repaired.state.map
            .currentLocalNodeId,
        'gryffindor_girls_dormitory',
    );
    assert.equal(
        repaired.state.scene.roomId,
        'gryffindor_girls_dormitory',
    );
    assert.equal(
        repaired.state.actors[0]
            .roomId,
        'gryffindor_girls_dormitory',
    );
    assert.equal(
        repaired.locationRepair
            .source,
        'gryffindor_dormitory_scene_migration',
    );
    const request =
        getInteriorMapRequest(
            repaired.state,
        );
    assert.equal(
        request.status,
        'missing',
    );
    assert.equal(
        request.suggestedMapId,
        'hogwarts_castle_gryffindor_girls_dormitory_interior',
    );
    assert.equal(
        findSceneDestination(
            '女生卧室',
            repaired.state,
        ).roomId,
        'gryffindor_girls_dormitory',
    );
    const generatedMap = {
        version: 1,
        id:
            request
                .suggestedMapId,
        nameEn:
            'Gryffindor Girls Dormitory Interior',
        currentLevelId:
            'first_year',
        currentRoomId:
            'first_year_dormitory',
        levels: [{
            id: 'first_year',
            nameEn:
                'First-Year Dormitory',
            z: 0,
        }],
        rooms: [{
            id: 'spiral_landing',
            nameEn:
                'Spiral Stair Landing',
            levelId:
                'first_year',
            kind: 'landing',
            descriptionEn:
                'The spiral stair from the common room ends at a small round landing.',
            x: 15,
            y: 50,
            access:
                'house_gryffindor',
        }, {
            id:
                'first_year_dormitory',
            nameEn:
                'First-Year Girls Dormitory',
            levelId:
                'first_year',
            kind: 'dormitory',
            descriptionEn:
                'Five four-poster beds stand around the curved tower wall beneath a tall window.',
            x: 50,
            y: 50,
            access:
                'house_gryffindor',
        }, {
            id: 'washroom',
            nameEn:
                'Girls Washroom',
            levelId:
                'first_year',
            kind: 'washroom',
            descriptionEn:
                'A compact shared washroom opens beside the sleeping chamber.',
            x: 85,
            y: 50,
            access:
                'house_gryffindor',
        }],
        exits: [{
            from:
                'spiral_landing',
            to:
                'first_year_dormitory',
            direction: 'east',
            kind: 'door',
            minutes: 1,
        }, {
            from:
                'first_year_dormitory',
            to: 'washroom',
            direction: 'east',
            kind: 'door',
            minutes: 1,
        }],
    };
    const entered =
        applyGeneratedInteriorMap(
            repaired.state,
            generatedMap,
            request,
        );
    assert.equal(
        entered.map.activeMapId,
        request.suggestedMapId,
    );
    assert.equal(
        entered.map
            .currentLocalNodeId,
        'first_year_dormitory',
    );
    assert.equal(
        entered.map
            .interiorMapBindings[
                request.bindingKey
            ],
        request.suggestedMapId,
    );
});

test('map model projects canon nodes, routes and current location for every map view', () => {
    const model = buildMapModel({
        discoveredNodeIds: ['kings_cross', 'diagon_alley'],
        generatedNodes: [],
        nodeOverrides: {},
    }, '对角巷');

    assert.equal(model.regions.length, 3);
    assert.equal(model.nodes.length, 10);
    assert.equal(model.edges.length, 4);
    assert.equal(model.currentNodeId, 'diagon_alley');
    assert.equal(model.nodes.find(node => node.id === 'diagon_alley').visibility, 'current');
    assert.ok(model.nodes.every(node => Number.isFinite(node.mapX) && Number.isFinite(node.mapY)));
});

test('generated map nodes receive a visible route to their nearest regional node', () => {
    const model = buildMapModel({
        discoveredNodeIds: [],
        nodeOverrides: {},
        generatedNodes: [{
            id: 'forgotten_tapestry_room',
            regionId: 'hogwarts',
            name: '旧挂毯后的房间',
            summary: '隐藏房间',
            x: 48,
            y: 40,
            locked: false,
        }],
    });

    const edge = model.edges.find(item => item.to === 'forgotten_tapestry_room');
    assert.ok(edge);
    assert.equal(edge.generated, true);
    assert.equal(edge.visibility, 'discovered');
});

test('preset MUD map pack covers every world location with valid room and exit graphs', () => {
    const validation = validateLocalMapPack();
    assert.deepEqual(validation, { valid: true, errors: [] });
    assert.equal(LOCAL_MAP_CATALOG.length, 10);
    assert.equal(LOCAL_MAP_CATALOG.reduce((sum, map) => sum + map.levelCount, 0), 35);
    assert.equal(LOCAL_MAP_CATALOG.reduce((sum, map) => sum + map.nodeCount, 0), 203);
    assert.equal(PRESET_LOCAL_MAPS.hogwarts_castle.levels.length, 10);
    assert.equal(PRESET_LOCAL_MAPS.hogwarts_castle.nodes.length, 76);
});

test('local map model selects one floor and applies runtime topology state', () => {
    const state = {
        activeMapId: 'hogwarts_castle',
        currentLocalNodeId: 'potions_classroom',
        currentLevelId: 'dungeons',
        roomStates: {
            'hogwarts_castle:potions_corridor': {
                status: 'blocked',
                note: '坍塌的石块封住了走廊。',
            },
        },
        exitStates: {},
        discoveredLocalNodeIds: [],
        generatedLocalNodes: [],
        generatedLocalExits: [],
    };
    const model = buildLocalMapModel('hogwarts_castle', state);
    assert.equal(model.levelId, 'dungeons');
    assert.equal(model.nodes.find(room => room.id === 'potions_classroom').visibility, 'current');
    assert.equal(model.nodes.find(room => room.id === 'potions_corridor').runtime.status, 'blocked');
    assert.equal(model.nodes.some(room => room.id === 'great_hall'), false);
});

test('AI map context includes only the active detailed map plus the global catalog', () => {
    const context = buildMapAuthorityContext({
        location: '霍格沃茨城堡',
        map: {
            activeMapId: 'hogwarts_castle',
            currentLocalNodeId: 'entrance_hall',
            currentLevelId: 'ground',
        },
    });
    assert.match(context, /potions_classroom/);
    assert.match(context, /localMapCatalog/);
    assert.doesNotMatch(context, /borgin_burkes/);
});

test('runtime map mutations cannot rewrite preset topology', () => {
    const mutation = {
        mapId: 'hogwarts_castle',
        changes: [
            {
                type: 'room_state',
                roomId: 'third_floor_corridor',
                status: 'blocked',
                note: '校方临时封锁。',
            },
            {
                type: 'exit_state',
                from: 'third_floor_corridor',
                to: 'forbidden_corridor',
                blocked: true,
            },
            {
                type: 'discover_secret',
                roomId: 'humpbacked_witch',
            },
        ],
    };
    assert.deepEqual(validateLocalMapMutation(mutation), { valid: true, errors: [] });
    const next = applyLocalMapMutation({}, mutation);
    assert.equal(next.roomStates['hogwarts_castle:third_floor_corridor'].status, 'blocked');
    assert.equal(next.exitStates['hogwarts_castle:third_floor_corridor->forbidden_corridor'].blocked, true);
    assert.deepEqual(next.discoveredLocalNodeIds, ['hogwarts_castle:humpbacked_witch']);
});

test('explicit movement text resolves a preset local map without AI inference', () => {
    assert.equal(findPresetLocalMapInText('我决定前往对角巷购买课本。')?.id, 'diagon_alley');
    assert.equal(findPresetLocalMapInText('We enter Hogwarts Castle before dinner.')?.id, 'hogwarts_castle');
    assert.equal(findPresetLocalMapInText('我留在原地。'), null);
});
