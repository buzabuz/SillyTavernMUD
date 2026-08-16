/* eslint-disable playwright/expect-expect */
import {
    applyGeneratedInteriorMap,
    enterBoundInteriorMap,
    getInteriorMapRequest,
    validateGeneratedInteriorMap,
} from '../public/scripts/extensions/hogwarts-mud/domain/interior-map.js';
import {
    adoptMapProposalLanguage,
    applyLocalMapMutation,
    applyMapProposal,
    buildLocalMapModel,
    buildMapAuthorityContext,
    buildMapModel,
    validateLocalMapMutation,
    validateLocalMapPack,
    validateMapProposal,
} from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import {
    findSceneDestination,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-destination.js';
import {
    reconcileSpatialState,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    findPresetLocalMapInText,
    LOCAL_MAP_CATALOG,
    MAP_STATIC_LOCALE_EN,
    MAP_STATIC_LOCALE_ZH_CN,
    PRESET_LOCAL_MAPS,
    PRESET_LOCATION_ACTORS,
} from '../public/scripts/extensions/hogwarts-mud/map-pack.js';
import {
    PRESET_WORLD_MAP,
    WORLD_MAP_STATIC_LOCALE_EN,
    WORLD_MAP_STATIC_LOCALE_ZH_CN,
} from '../public/scripts/extensions/hogwarts-mud/world-data.js';
import {
    createCurrentKingsCrossState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

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

test('map expansion accepts a no-change result when preset topology already fits', () => {
    const validation =
        validateMapProposal(
            {
                id:
                    'map_expansion',
                reasonEn:
                    'The existing preset room already represents the explored place.',
                changes: [],
            },
            {
                trigger:
                    'exploration',
                baseMap:
                    PRESET_WORLD_MAP,
            },
        );
    assert.deepEqual(
        validation,
        {
            valid: true,
            errors: [],
        },
    );
});

test('validated World Director additions are committed as generated map nodes', () => {
    const proposal = {
        id: 'proposal-1',
        reasonEn:
            'The player deliberately searched behind the old tapestry.',
        changes: [{
            operation: 'add',
            node: {
                id: 'forgotten_tapestry_room',
                regionId: 'hogwarts',
                nameEn:
                    'Room Behind the Old Tapestry',
                kind: 'secret_room',
                summaryEn:
                    'A narrow room absent from the public castle plans.',
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
    assert.equal(
        next.generatedNodes[0]
            .nameEn,
        'Room Behind the Old Tapestry',
    );
    assert.equal(next.generatedNodes[0].locked, false);
    assert.equal(next.proposals[0].id, 'proposal-1');
});

test('preset Map semantics are English-only while static locale resources remain aligned', () => {
    assert.deepEqual(
        Object.keys(
            MAP_STATIC_LOCALE_EN,
        ).sort(),
        Object.keys(
            MAP_STATIC_LOCALE_ZH_CN,
        ).sort(),
    );
    assert.deepEqual(
        Object.keys(
            WORLD_MAP_STATIC_LOCALE_EN,
        ).sort(),
        Object.keys(
            WORLD_MAP_STATIC_LOCALE_ZH_CN,
        ).sort(),
    );
    for (const map of
        Object.values(
            PRESET_LOCAL_MAPS,
        )) {
        assert.equal(
            Object.hasOwn(
                map,
                'name',
            ),
            false,
        );
        assert.equal(
            Object.hasOwn(
                map,
                'layoutRule',
            ),
            false,
        );
        assert.match(
            map.nameEn,
            /^[^\u3400-\u9FFF]+$/u,
        );
        for (const level of
            map.levels) {
            assert.equal(
                Object.hasOwn(
                    level,
                    'name',
                ),
                false,
            );
        }
        for (const room of
            map.nodes) {
            assert.equal(
                Object.hasOwn(
                    room,
                    'name',
                ),
                false,
            );
            assert.equal(
                Object.hasOwn(
                    room,
                    'description',
                ),
                false,
            );
            assert.match(
                room.nameEn,
                /^[^\u3400-\u9FFF]+$/u,
            );
        }
    }
    assert.equal(
        Object.values(
            PRESET_LOCAL_MAPS,
        ).flatMap(map =>
            map.nodes)
            .filter(room =>
                room.descriptionEn)
            .length,
        28,
    );
    for (const actor of
        Object.values(
            PRESET_LOCATION_ACTORS,
        )) {
        for (const key of
            Object.keys(actor)) {
            assert.equal(
                !key.endsWith('En') &&
                Object.hasOwn(
                    actor,
                    `${key}En`,
                ),
                false,
            );
        }
    }
    for (const region of
        PRESET_WORLD_MAP.regions) {
        assert.equal(
            Object.hasOwn(
                region,
                'name',
            ),
            false,
        );
        assert.equal(
            Object.hasOwn(
                region,
                'subtitle',
            ),
            false,
        );
    }
    for (const node of
        PRESET_WORLD_MAP.nodes) {
        assert.equal(
            Object.hasOwn(
                node,
                'name',
            ),
            false,
        );
        assert.equal(
            Object.hasOwn(
                node,
                'summary',
            ),
            false,
        );
    }
});

test('medium cartographer creates and reuses a missing container interior map', () => {
    const state = createCurrentKingsCrossState(
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
        version: 2,
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
    const storedMap =
        entered.map.customLocalMaps
            .find(map =>
                map.id ===
                    generatedMap.id);
    assert.equal(
        storedMap.nameEn,
        generatedMap.nameEn,
    );
    assert.equal(
        Object.hasOwn(
            storedMap,
            'name',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            storedMap,
            'layoutRule',
        ),
        false,
    );
    assert.ok(
        storedMap.levels.every(level =>
            !Object.hasOwn(
                level,
                'name',
            )),
    );
    assert.ok(
        storedMap.nodes.every(room =>
            !Object.hasOwn(
                room,
                'name',
            ) &&
            !Object.hasOwn(
                room,
                'description',
            )),
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

test('World Map expansion skips non-English nodes without blocking an independent English node', () => {
    const adoption =
        adoptMapProposalLanguage({
            id: 'mixed_map_proposal',
            reasonEn:
                'The event created one new location.',
            changes: [
                {
                    operation: 'add',
                    node: {
                        id:
                            'english_location',
                        nameEn:
                            'English Location',
                        summaryEn:
                            'A grounded English description.',
                    },
                },
                {
                    operation: 'add',
                    node: {
                        id:
                            'chinese_location',
                        nameEn:
                            '中文地点',
                        summaryEn:
                            '中文说明。',
                    },
                },
            ],
        });

    assert.deepEqual(
        adoption.proposal.changes
            .map(change =>
                change.node.id),
        [
            'english_location',
        ],
    );
    assert.equal(
        adoption.diagnostics.length,
        2,
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
        version: 2,
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
            .customLocalMaps
            .find(map =>
                map.id ===
                    request
                        .suggestedMapId)
            .mount
            .parentRoomId,
        request.parentRoomId,
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
            nameEn:
                'Room Behind the Old Tapestry',
            summaryEn:
                'A hidden room.',
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
