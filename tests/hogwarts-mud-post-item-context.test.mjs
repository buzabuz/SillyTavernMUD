/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createSceneItemStates,
} from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    selectPostItemContext,
} from '../public/scripts/extensions/hogwarts-mud/domain/inventory-observation-context.js';

function item(
    {
        id,
        labelEn,
        ownerId = 'player',
        holderId = '',
        custody = 'stored',
        mapId = 'hogwarts_castle',
        roomId = 'classroom',
        placement = 'in_room',
    },
) {
    return {
        id,
        labelEn,
        appearanceEn:
            `A formal ${labelEn}.`,
        type: 'other',
        ownerId,
        holderId,
        custody,
        location: {
            mapId,
            roomId,
            placement,
        },
        state: 'intact',
        physicalForm: 'whole',
        visibility: 'public',
        isEquipped:
            custody === 'equipped',
    };
}

function state(
    items,
) {
    return {
        map: {
            activeMapId: 'hogwarts_castle',
            currentLocalNodeId: 'classroom',
        },
        actorLibrary: [{
            id: 'harry',
        }],
        actors: [{
            id: 'harry',
        }],
        items,
    };
}

function selectedIds(
    source,
) {
    return selectPostItemContext(
        source,
    ).items.map(item =>
        item.id);
}

test(
    'Post Item context retains independent current-room Items and excludes unmentioned holder-followed Items',
    () => {
        const world = state([
            item({
                id: 'room_note',
                labelEn: 'Room Note',
            }),
            item({
                id: 'player_wand',
                labelEn: 'Player Wand',
                holderId: 'player',
                custody: 'carried',
                placement: 'with_holder',
            }),
            item({
                id: 'harry_wand',
                labelEn: 'Harry Wand',
                ownerId: 'harry',
                holderId: 'harry',
                custody: 'carried',
                placement: 'with_holder',
            }),
        ]);

        assert.deepEqual(
            selectedIds({
                state: world,
                playerAction:
                    'I wait by the window.',
                narrativeSegments: [{
                    type: 'narration',
                    textEn:
                        'Harry speaks quietly.',
                }],
            }),
            ['room_note'],
        );
    },
);

test(
    'Post Item context admits holder-followed Items only through direct current-turn evidence',
    () => {
        const world = state([
            item({
                id: 'player_wand',
                labelEn: 'Player Wand',
                holderId: 'player',
                custody: 'equipped',
                placement: 'with_holder',
            }),
            item({
                id: 'harry_wand',
                labelEn: 'Harry Wand',
                ownerId: 'harry',
                holderId: 'harry',
                custody: 'carried',
                placement: 'with_holder',
            }),
        ]);

        assert.deepEqual(
            selectedIds({
                state: world,
                playerAction:
                    'I raise my Player Wand.',
                narrativeSegments: [{
                    type: 'narration',
                    textEn:
                        'Harry keeps still.',
                }],
            }),
            ['player_wand'],
        );
        assert.deepEqual(
            selectedIds({
                state: world,
                playerAction:
                    'I wait.',
                narrativeSegments: [{
                    type: 'narration',
                    textEn:
                        'Harry Wand flashed once above the desk.',
                }],
            }),
            ['harry_wand'],
        );
    },
);

test(
    'Post Item context accepts exact Item directives and rejects ambiguous or generic textual references',
    () => {
        const world = state([
            item({
                id: 'player_wand',
                labelEn: 'Player Wand',
                holderId: 'player',
                custody: 'carried',
                placement: 'with_holder',
            }),
            item({
                id: 'note_alpha',
                labelEn: 'Shared Note',
                holderId: 'harry',
                ownerId: 'harry',
                custody: 'carried',
                placement: 'with_holder',
            }),
            item({
                id: 'note_beta',
                labelEn: 'Shared Note',
                holderId: 'player',
                custody: 'carried',
                placement: 'with_holder',
            }),
        ]);

        assert.deepEqual(
            selectedIds({
                state: world,
                playerAction:
                    '【物品操作:carry｜携带】\n【物品:player_wand｜Player Wand】',
                narrativeSegments: [],
            }),
            ['player_wand'],
        );
        assert.deepEqual(
            selectedIds({
                state: world,
                playerAction:
                    'I look at the Shared Note and a wand.',
                narrativeSegments: [],
            }),
            [],
        );
    },
);

test(
    'Scene Item snapshot follows player custody but is never the Post Item selector',
    () => {
        const carried = item({
            id: 'player_wand',
            labelEn: 'Player Wand',
            holderId: 'player',
            custody: 'carried',
            placement: 'with_holder',
            mapId: '',
            roomId: '',
        });
        const world = state([
            carried,
        ]);
        const sceneItems =
            createSceneItemStates(
                world.items,
                {
                    mapId: 'hogwarts_castle',
                    roomId: 'classroom',
                },
            );

        assert.deepEqual(
            sceneItems.map(item => ({
                id: item.id,
                roomId: item.roomId,
            })),
            [{
                id: 'player_wand',
                roomId: 'classroom',
            }],
        );
        assert.deepEqual(
            selectedIds({
                state: world,
                playerAction:
                    'I wait.',
                narrativeSegments: [],
            }),
            [],
        );
    },
);
