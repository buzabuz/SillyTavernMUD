/* eslint-disable playwright/expect-expect */
import {
    applyPlayerMovement,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement.js';
import {
    inferActorRoomId,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-foundation.js';
import {
    normalizeScenePerformanceActorLocations,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-performance.js';
import {
    buildSpatialContext,
    migrateActorMovementHistory,
    reconcileSpatialState,
    reconcileTurnActorPresenceWithSpatialState,
    reconcileVisibleActorPresenceState,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    PRESET_LOCAL_MAPS,
} from '../public/scripts/extensions/hogwarts-mud/map-pack.js';
import {
    addCurrentPlayerRelationship,
    createCurrentKingsCrossState,
    createCurrentPlayingState,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('Gringotts shorthand moves player and explicit companions without archiving the scene', () => {
    const state = createCurrentPlayingState();
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
    state.actorLibrary = [
        {
            id: 'alex_zhang',
            nameEn: 'Alex Zhang',
            identity: {
                ...structuredClone(
                    state.actorLibrary[0]
                        .identity,
                ),
                gender: {
                    code: 'male',
                    label: '',
                },
            },
        },
        {
            id: 'eddie_cooper',
            nameEn: 'Eddie Cooper',
        },
        {
            id: 'minerva_mcgonagall',
            nameEn:
                'Minerva McGonagall',
        },
    ];
    addCurrentPlayerRelationship(
        state,
        'alex_zhang',
        ['parent'],
    );
    normalizeCurrentActorFixtureInPlace(
        state,
    );
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
    const state = createCurrentPlayingState();
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
    const state = createCurrentPlayingState();
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
    state.actorLibrary = [
        {
            id: 'alex_zhang',
            nameEn: 'Alex Zhang',
            identity: {
                ...structuredClone(
                    state.actorLibrary[0]
                        .identity,
                ),
                gender: {
                    code: 'male',
                    label: '',
                },
            },
        },
        {
            id: 'eddie_cooper',
            nameEn: 'Eddie Cooper',
        },
        {
            id: 'minerva_mcgonagall',
            nameEn:
                'Minerva McGonagall',
        },
    ];
    addCurrentPlayerRelationship(
        state,
        'alex_zhang',
        ['parent'],
    );
    normalizeCurrentActorFixtureInPlace(
        state,
    );
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
    const state = createCurrentPlayingState();
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
    const state = createCurrentPlayingState();
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
        'significant',
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
        createCurrentPlayingState();
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

test('spatial migration restores actor rooms without inferring player movement from prose', () => {
    const state = createCurrentPlayingState();
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
    assert.equal(
        migrated.state.map
            .currentLocalNodeId,
        'kitchen',
    );
    assert.equal(migrated.state.actors[0].roomId, 'kitchen');
    assert.equal(migrated.state.actors[1].mapId, 'zhang_home');
});

test('spatial v4 repairs a scene whose opening is at the barrier but room ID says train', () => {
    const state = createCurrentKingsCrossState(
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

test('spatial context allows reactions across a committed sightline', () => {
    const state = applyPlayerMovement(
        createCurrentPlayingState(),
        '→【back_garden】\n我跑到后花园。',
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
        createCurrentPlayingState(),
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
        createCurrentPlayingState();
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
