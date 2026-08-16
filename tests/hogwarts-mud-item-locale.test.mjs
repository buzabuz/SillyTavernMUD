/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    projectItemCard,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-projection.js';

function createState() {
    return {
        character: {
            identity: {
                name: 'Tina',
            },
        },
        actorLibrary: [],
        items: [],
    };
}

function createItem() {
    return {
        id: 'pink_ribbon',
        type: 'accessory',
        labelEn: 'Pink Ribbon',
        ownerId: 'player',
        holderId: 'player',
        location: {
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            placement:
                'with_holder',
        },
        appearanceEn:
            'A narrow pink silk ribbon.',
        state: 'intact',
        physicalForm: 'intact',
        sourceEventId:
            'event_ribbon',
        storyRoles: [
            'social',
        ],
        acquiredAt: {
            value:
                '1991-09-02 · 11:30',
            precision: 'exact',
        },
    };
}

test('Item projection emits English static chrome without changing stable Item identity', () => {
    const card =
        projectItemCard(
            createItem(),
            createState(),
            'en',
        );

    assert.equal(
        card.id,
        'pink_ribbon',
    );
    assert.equal(
        card.typeLabel,
        'Accessory',
    );
    assert.equal(
        card.stateLabel,
        'Intact',
    );
    assert.equal(
        card.ownershipLabel,
        'Owner Tina',
    );
    assert.equal(
        card.locationLabel,
        'With Tina',
    );
    assert.equal(
        card.storyRoles[0]
            .label,
        'Social significance',
    );
    assert.equal(
        /[\u3400-\u9fff]/u.test(
            JSON.stringify(
                card,
            ),
        ),
        false,
    );
});

test('Item projection keeps zh-CN as its default display locale', () => {
    const card =
        projectItemCard(
            createItem(),
            createState(),
        );

    assert.equal(
        card.typeLabel,
        '饰品',
    );
    assert.equal(
        card.stateLabel,
        '完好',
    );
    assert.equal(
        card.locationLabel,
        '随 Tina',
    );
});

test('Item projection resolves redirected Canon owners without exposing stable IDs', () => {
    const card =
        projectItemCard(
            {
                ...createItem(),
                ownerId:
                    'canon_charles_weasley',
                holderId:
                    'canon_ronald_bilius_weasley',
            },
            createState(),
        );

    assert.equal(
        card.ownershipLabel,
        '主人 查理·韦斯莱 · 持有人 罗恩·韦斯莱',
    );
    assert.doesNotMatch(
        card.ownershipLabel,
        /canon_/u,
    );
});
