/* eslint-disable playwright/expect-expect */
import {
    buildActorAppearanceView,
    migrateActorPresentationState,
    splitActorVisualDescription,
} from '../public/scripts/extensions/hogwarts-mud/domain/appearance.js';
import {
    buildMandatorySceneState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    migrateEntityState,
    migrateObservedInventoryState,
    projectObservedInventoryUpdates,
} from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    applyMaterialEvents,
    buildCurrentMaterialState,
    normalizeMaterialEvents,
} from '../public/scripts/extensions/hogwarts-mud/domain/material-state.js';
import {
    NARRATIVE_TURN_PROTOCOL_VERSION,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    MATERIAL_EVENT_DEFINITIONS,
    MATERIAL_EXTRACTION_SCHEMA,
    MATERIAL_STATE_SCHEMA_VERSION,
} from '../public/scripts/extensions/hogwarts-mud/material-schema.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('entity migration preserves structured Items without inferring a wand from prose', () => {
    const state =
        createCurrentPlayingState();
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
        2,
    );
    assert.equal(
        migrated.state.items.some(item =>
            item.id ===
                'holly_phoenix_wand' &&
            item.custody === 'carried' &&
            item.importance === 'key'),
        false,
    );
    assert.ok(
        migrated.state.items.some(item =>
            item.id ===
                'admission_letter'),
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

test('structured local observation normalizes material changes', () => {
    const state =
        createCurrentPlayingState();
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
                    objectTextEn:
                        'twenty-eight toy bears',
                    targetTextEn:
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
                    valueTextEn:
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
        placement.objectTextEn,
        /toy bears/u,
    );
    assert.match(
        placement.targetTextEn,
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
        outfit.valueTextEn,
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
        createCurrentPlayingState();
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
                    type:
                        'document',
                    labelEn:
                        'Harry Potter Autograph',
                    detailEn:
                        'Lavender\'s Sorting parchment bearing Harry Potter\'s crooked H autograph.',
                    importance:
                        'important',
                    storyRoles: [
                        'signature',
                    ],
                    custody:
                        'carried',
                    ownerId:
                        'player',
                    holderId:
                        'player',
                    sourceKind:
                        'player',
                    evidenceText:
                        '*激动拿起签名，把哈利签过名的羊皮纸带在身上*',
                    evidenceItemText:
                        '签名',
                    physicalForm:
                        'whole',
                    confidence:
                        0.96,
                },
                {
                    id:
                        'breakfast_toast',
                    action:
                        'acquire',
                    type:
                        'consumable',
                    labelEn:
                        'Toast',
                    detailEn:
                        'An ordinary breakfast item.',
                    importance:
                        'ordinary',
                    custody:
                        'carried',
                    ownerId:
                        'player',
                    holderId:
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
            operation:
                'acquire',
            type: 'document',
            labelEn:
                'Harry Potter Autograph',
            appearanceEn:
                'Lavender\'s Sorting parchment bearing Harry Potter\'s crooked H autograph.',
            ownerId:
                'player',
            holderId:
                'player',
            targetHolderId: '',
            transferMode:
                'none',
            storyRoles: [
                'signature',
            ],
            visibility:
                'public',
            isEquipped: false,
            held: false,
            sourceKind:
                'player',
            evidenceText:
                playerAction,
            evidenceItemText:
                '签名',
            physicalForm:
                'whole',
            confidence: 0.96,
        },
    );
});

test('legacy signed autograph prose cannot create an authoritative inventory Item', () => {
    const state =
        createCurrentPlayingState();
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
    assert.deepEqual(
        migration.state.items,
        [],
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
        createCurrentPlayingState();
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
                objectTextEn: 'bear',
                targetTextEn:
                    'headboard',
                persistence:
                    'permanent',
            },
        ),
        event(
            'moved',
            'object_moved',
            {
                objectTextEn: 'bear',
                sourceTextEn:
                    'headboard',
                targetTextEn: 'trunk',
            },
        ),
        event(
            'removed',
            'object_removed',
            {
                objectTextEn: 'bear',
            },
        ),
        event(
            'adjusted',
            'scene_adjusted',
            {
                targetTextEn: 'bed curtains',
                resultTextEn:
                    'The bed curtains are open.',
            },
        ),
        event(
            'damaged',
            'scene_damaged',
            {
                targetTextEn: 'window',
            },
        ),
        event(
            'repaired',
            'scene_repaired',
            {
                targetTextEn: 'window',
            },
        ),
        event(
            'soiled',
            'scene_soiled',
            {
                objectTextEn: 'ink',
                targetTextEn: 'carpet',
                resultTextEn:
                    'Ink stains the carpet.',
            },
        ),
        event(
            'cleaned',
            'scene_cleaned',
            {
                targetTextEn: 'carpet',
            },
        ),
        event(
            'outfit',
            'outfit_changed',
            {
                valueTextEn:
                    'striped pyjamas',
            },
        ),
        event(
            'accessory_add',
            'accessory_changed',
            {
                valueTextEn:
                    'silver necklace',
                slot: 'neck',
            },
        ),
        event(
            'accessory_remove',
            'accessory_changed',
            {
                valueTextEn:
                    'silver necklace',
                operation: 'remove',
                slot: 'neck',
            },
        ),
        event(
            'hair',
            'hairstyle_changed',
            {
                valueTextEn: 'ponytail',
                slot: 'hair',
            },
        ),
        event(
            'condition',
            'appearance_changed',
            {
                valueTextEn:
                    'soaking wet',
            },
        ),
        event(
            'condition_clear',
            'appearance_cleared',
            {
                resultTextEn:
                    'dried off',
            },
        ),
        event(
            'held',
            'object_held',
            {
                objectTextEn: 'wand',
                hand: 'right',
            },
        ),
        event(
            'released',
            'object_released',
            {
                objectTextEn: 'wand',
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
            .player.outfitEn,
        'striped pyjamas',
    );
    assert.deepEqual(
        current.actorPresentations
            .player.accessories,
        {},
    );
    assert.equal(
        current.actorPresentations
            .player.hairEn,
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
            .player.heldObjectEn,
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
            outfitEn:
                'new Hogwarts robes already fastened',
            heldObjectEn: '',
        },
    );

    const state =
        createCurrentPlayingState();
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
    delete state.actorContextVersion;
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
        createCurrentPlayingState();
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
            objectTextEn:
                'twenty-eight bears',
            targetTextEn:
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
            valueTextEn:
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
            targetTextEn:
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
            .player.outfitEn,
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
            .player.outfitEn,
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
            .player.outfitEn,
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
