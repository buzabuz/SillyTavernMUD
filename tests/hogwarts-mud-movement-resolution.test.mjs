/* eslint-disable playwright/expect-expect */
import {
    admitCurrentLocationResidents,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-admission.js';
import {
    buildCampaignContext,
    createDefaultCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    createDefaultCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    applyOpeningWorldPackage,
    createInitialWorldState,
    validateOpeningWorldPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    buildLocalMapModel,
} from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import {
    applyAcceptedMovementPlan as applyPlayerMovement,
    buildFollowMovementContext,
    inspectPlayerMovementIntent,
    parseExplicitMovementDirective,
    removeExplicitMovementDirective,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement.js';
import {
    findLocalRoomPath,
} from '../public/scripts/extensions/hogwarts-mud/domain/pathfinding.js';
import {
    applyEventBoundaryNextSceneIntent,
    createFallbackNextSceneIntent,
    findSceneDestination,
    validateEventBoundaryNextSceneIntent,
    validateNextSceneIntent,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-destination.js';
import {
    validateSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    reconcileSpatialState,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    createCurrentOpeningPackage,
    createCurrentKingsCrossState,
    createCurrentPlayingState,
    createCurrentTransitionPackage,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

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
    assert.equal(
        state.chapterEn,
        'Opening World',
    );
    assert.equal(
        Object.hasOwn(
            state,
            'chapter',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            state,
            'location',
        ),
        false,
    );
    assert.match(state.clock, /^1986/);
    assert.match(
        prompt,
        /"startYear":1986/u,
    );
    assert.match(
        prompt,
        /"difficulty":"harsh"/u,
    );
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
    character.confirmed = true;
    const campaign = createDefaultCampaign();
    const opening =
        createCurrentOpeningPackage();
    const validation = validateOpeningWorldPackage(opening, character, campaign);
    assert.deepEqual(validation, { valid: true, errors: [] });

    const state = applyOpeningWorldPackage(createInitialWorldState(character, {}, campaign), opening);
    assert.equal(state.phase, 'opening_narration');
    assert.equal(
        state.chapterEn,
        opening.chapterEn,
    );
    assert.equal(
        Object.hasOwn(
            state,
            'location',
        ),
        false,
    );
    assert.equal(
        state.actorLibrary.find(actor =>
            actor.id ===
                'tina_mother')
            .nameEn,
        'Mei Zhang',
    );
    assert.equal(state.actorLibrary.length, 3);
    assert.deepEqual(
        state.socialGraph
            .relationships
            .find(edge =>
                edge.sourceActorId ===
                    'tina_mother' &&
                edge.targetActorId ===
                    'player')
            .structuralTags,
        ['parent'],
    );
    assert.deepEqual(
        state.socialGraph
            .relationships
            .filter(edge =>
                edge.sourceActorId ===
                    'old_archivist' ||
                edge.targetActorId ===
                    'old_archivist'),
        [],
    );
    assert.equal(
        state.storyArcs[0]
            .hiddenTruthEn
            .includes('family'),
        true,
    );
    assert.deepEqual(state.clues, []);
    assert.equal(
        state.conflict.titleEn,
        'The Letter at Breakfast',
    );
    assert.equal(state.map.activeMapId, 'zhang_home');
    assert.equal(state.scene.nextSceneIntent.roomId, 'back_garden');
    assert.equal(state.scene.nextSceneIntent.tier, 'medium');
    assert.equal(
        state.scene.explorationHookEn,
        opening.scene.explorationHookEn,
    );
    assert.deepEqual(state.scene.timelineEntries, [{
        clock:
            opening.clock,
        summaryEn:
            opening.scene
                .summaryEn,
        sourceRef:
            `scene:${opening.scene.id}:opening`,
    }]);
    assert.equal(
        Object.hasOwn(
            state.opening.package,
            'display',
        ),
        false,
    );
    assert.deepEqual(
        state.items,
        [],
    );
    assert.deepEqual(
        state.scene.itemStates,
        [],
    );
    assert.equal(
        state.actors[0].lifeStatus,
        'alive',
    );
    const map = buildLocalMapModel('zhang_home', state.map);
    assert.equal(map.currentRoomId, 'kitchen');
    assert.equal(map.nodes.length, 2);
});

test('scene destination matching resolves a player move to an existing room', () => {
    const state = createCurrentPlayingState();
    assert.deepEqual(
        findSceneDestination('I run into the Back Garden to find the owl.', state),
        {
            mapId: 'zhang_home',
            roomId: 'back_garden',
            mapName: 'Zhang Home',
            mapNameEn: 'Zhang Home',
            roomName: 'Back Garden',
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

test('scene destination uses the catalog room instead of arrival prose inference', () => {
    const state =
        createCurrentPlayingState();
    const destination =
        findSceneDestination(
            '→【hogsmeade_station】',
            state,
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
        findSceneDestination(
            '我想起了霍格沃茨',
            state,
        ),
        null,
    );
});

test('movement requires an explicit marker and historical place mentions stay put', () => {
    const state =
        createCurrentPlayingState();
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
        `${historical}\n→【Back Garden】`;
    assert.equal(
        parseExplicitMovementDirective(
            marked,
        ).destinationText,
        'Back Garden',
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

test('current scene carries a valid editable default next-scene intent', () => {
    const state = createCurrentPlayingState();
    const intent = createFallbackNextSceneIntent(state);
    assert.equal(intent.mapId, 'zhang_home');
    assert.equal(intent.roomId, 'kitchen');
    assert.equal(intent.tier, 'medium');
    assert.match(
        intent.summaryEn,
        /Continue the unresolved public action/,
    );
    assert.equal(
        Object.hasOwn(
            intent,
            'summary',
        ),
        false,
    );
    assert.deepEqual(
        validateNextSceneIntent(intent, state),
        { valid: true, errors: [] },
    );
});

test('event-boundary director refreshes intent text without changing structural authority', () => {
    const state =
        createCurrentPlayingState();
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
    const state = createCurrentPlayingState();
    const legacyLocation =
        state.location;
    const path = findLocalRoomPath(
        'zhang_home',
        'kitchen',
        'back_garden',
        state.map,
    );
    assert.deepEqual(path.roomIds, ['kitchen', 'back_garden']);

    const result = applyPlayerMovement(
        state,
        '→【Back Garden】\n我跑到后花园去找猫头鹰。',
    );
    assert.equal(result.movement.moved, true);
    assert.equal(result.movement.minutes, 1);
    assert.equal(result.state.map.currentLocalNodeId, 'back_garden');
    assert.equal(result.state.scene.roomId, 'back_garden');
    assert.equal(
        result.state.location,
        legacyLocation,
    );
    assert.equal(result.state.spatial.player.roomId, 'back_garden');
});

test('guided movement commits a leader-known destination hidden from the player', () => {
    const state = createCurrentPlayingState();
    const action =
        '→【跟随麦格】\n我牵着爸爸跟着麦格走向下一个购物点，她给我们带路。';
    const destination =
        findSceneDestination(
            'McGonagall leads them to the Back Garden.',
            state,
        );

    assert.equal(
        inspectPlayerMovementIntent(
            state,
            action,
            {
                guidedDestination:
                    destination,
            },
        ).guided,
        true,
    );
    const result = applyPlayerMovement(
        state,
        action,
        {
            guidedDestination: destination,
            guidedByActorId:
                'minerva_mcgonagall',
            companionIds: [
                'alex_zhang',
                'minerva_mcgonagall',
            ],
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
        'no_known_destination',
    );
});

test('passive guided movement reaches Platform Nine and Three Quarters with the whole party', () => {
    const state = createCurrentKingsCrossState();
    const action =
        '→【九又四分之三站台】\n*紧紧拉住麦格教授，另外一只手拉住爸爸，希望被拉去九又四分之三站台*麦格教授你来拉我过去我不敢！！\n*扯扯爸爸，大喊*爸我们跟麦格教授走。她懂行！！';

    const result = applyPlayerMovement(
        state,
        action,
        {
            guidedByActorId:
                'minerva_mcgonagall',
            companionIds: [
                'alex_zhang',
                'minerva_mcgonagall',
            ],
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

test('school travel uses stable Item ID instead of item labels or action prose', () => {
    const mislabeledState =
        createCurrentKingsCrossState(
            'platform_nine_three_quarters',
        );
    mislabeledState.items = [{
        ...mislabeledState.items[0],
        id: 'ordinary_paper',
        labelEn: 'Hogwarts acceptance letter',
        label: '霍格沃茨录取通知书',
    }];

    const denied = applyPlayerMovement(
        mislabeledState,
        '→【霍格沃茨特快】\n我举起录取通知书登上霍格沃茨特快。',
    );
    assert.equal(
        denied.movement.moved,
        false,
    );
    assert.equal(
        denied.movement.reason,
        'no_passable_route',
    );
    assert.equal(
        denied.state,
        mislabeledState,
    );

    const authorizedState =
        createCurrentKingsCrossState(
            'platform_nine_three_quarters',
        );
    authorizedState.items[0].labelEn =
        'Blank parchment';
    authorizedState.items[0].label =
        '空白羊皮纸';
    const allowed = applyPlayerMovement(
        authorizedState,
        '→【霍格沃茨特快】\n我登上列车。',
    );
    assert.equal(
        allowed.movement.moved,
        true,
    );
    assert.equal(
        allowed.state.map
            .currentLocalNodeId,
        'hogwarts_express',
    );
});

test('scene transition can preload a destination professor without activating them in the closing scene', () => {
    const state =
        createCurrentPlayingState();
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
        createCurrentTransitionPackage();
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
            currentIntentEn: '',
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
    const state = createCurrentPlayingState();
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
        createCurrentPlayingState();
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
        createCurrentPlayingState();
    const interiorMap = {
        id:
            'zhang_home_kitchen_interior',
        worldAnchorId:
            'zhang_home',
        mount: {
            parentMapId:
                'zhang_home',
            parentRoomId:
                'kitchen',
        },
        nameEn:
            'Kitchen Interior',
        defaultLevelId:
            'inside',
        defaultRoomId:
            'kitchen_table',
        levels: [{
            id: 'inside',
            nameEn: 'Inside',
            z: 0,
        }],
        nodes: [{
            id:
                'kitchen_table',
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
            '→【Go with Minerva to Back Garden】',
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

test('only the finite follow-tag grammar opens the follow-NPC semantic route', () => {
    const state =
        createCurrentPlayingState();

    assert.equal(
        buildFollowMovementContext(
            state,
            '→【Wait for McGonagall】\nI remain here.',
            [],
        ),
        null,
    );
    assert.equal(
        buildFollowMovementContext(
            state,
            '→【跟随麦格】\n我立即跟上。',
            [],
        )
            .eligibleGuideCandidates
            .some(candidate =>
                candidate.id ===
                    'minerva_mcgonagall'),
        true,
    );
});
