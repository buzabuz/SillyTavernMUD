/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    buildActorAppearanceView,
} from '../public/scripts/extensions/hogwarts-mud/domain/appearance.js';
import {
    seedCanonItems,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-canon.js';
import {
    ITEM_OPERATION_OPTIONS,
    createItemOperationDirective,
    createItemReferenceDirective,
    parseItemOperationDirectives,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import {
    migrateItemSystemState,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-migration.js';
import {
    getItemProposalDecision,
    projectActorItems,
    projectItemLedger,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-projection.js';
import {
    applyItemOperations,
    normalizeItemProposal,
    partitionItemProposals,
    queueItemCandidates,
    resolveItemCandidate,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-reducer.js';
import {
    inferDestroyedPhysicalForm,
    isItemOperationEvidenceGrounded,
    isItemVisibleToPlayer,
    normalizeCurrentPresentation,
    normalizeItem,
    validateItem,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-schema.js';
import {
    createSceneItemStates,
    projectObservedInventoryUpdates,
    synchronizeHeldItemLocations,
} from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    settleNarrativeTurnPerformance,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';

function createState(
    {
        items = [],
        actorPresentations = {},
    } = {},
) {
    return {
        clock:
            '1991-09-02 · 11:30',
        character: {
            identity: {
                name: 'Tina',
            },
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'transfiguration_classroom',
        },
        scene: {
            id: 'transfiguration',
            mapId:
                'hogwarts_castle',
            roomId:
                'transfiguration_classroom',
            itemStates: [],
        },
        actors: [
            {
                id:
                    'canon_lavender_brown',
                name: '拉文德·布朗',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
                present: true,
            },
            {
                id:
                    'canon_harry_james_potter',
                name: '哈利·波特',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
                present: true,
            },
        ],
        actorLibrary: [
            {
                id:
                    'canon_lavender_brown',
                name: '拉文德·布朗',
                introducedClock:
                    '1991-09-01 · 18:00',
            },
            {
                id:
                    'canon_harry_james_potter',
                name: '哈利·波特',
                introducedClock:
                    '1991-09-01 · 18:00',
            },
        ],
        items,
        actorPresentations,
        pendingItemProposals: [],
        itemProposalDecisions: [],
    };
}

function createItem(
    overrides = {},
) {
    return normalizeItem({
        id: 'pink_ribbon',
        type: 'accessory',
        labelEn: 'Pink Ribbon',
        label: '粉色丝带',
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
        appearance:
            '一条窄窄的粉色丝带。',
        state: 'intact',
        sourceEventId:
            'event_ribbon',
        storyRoles: [
            'social',
        ],
        visibility: 'public',
        acquiredAt: {
            value:
                '1991-09-02 · 11:30',
            precision: 'exact',
        },
        ...overrides,
    });
}

function proposal(
    source,
    index = 0,
) {
    return normalizeItemProposal(
        source,
        {
            sourceRole: 'user',
            sourceEventId:
                'event_test',
            sourceMessageIds: [
                1,
            ],
            clock:
                '1991-09-02 · 11:30',
            index,
        },
    );
}

test('Item V2 normalization separates owner, holder and legacy custody while preserving presentation compatibility', () => {
    const item = normalizeItem({
        id: 'borrowed_wand',
        kind: 'wand',
        ownerId:
            'canon_harry_james_potter',
        custody: 'carried',
        detailEn:
            'A borrowed holly wand.',
        source: 'legacy_turn',
    });
    assert.equal(
        item.ownerId,
        'canon_harry_james_potter',
    );
    assert.equal(
        item.holderId,
        'canon_harry_james_potter',
    );
    assert.equal(
        item.type,
        'wand',
    );
    assert.equal(
        item.custody,
        'carried',
    );

    const presentation =
        normalizeCurrentPresentation(
            {
                outfitEn:
                    'Standard school robes.',
                wornItemIds: [
                    'borrowed_wand',
                    'borrowed_wand',
                ],
                heldItemIds: [
                    'missing_item',
                ],
                hairEn: 'ponytail',
                visibleConditions: [
                    'ink-stained',
                ],
            },
            {
                validItemIds:
                    new Set([
                        'borrowed_wand',
                    ]),
            },
        );
    assert.deepEqual(
        presentation.wornItemIds,
        [
            'borrowed_wand',
        ],
    );
    assert.deepEqual(
        presentation.heldItemIds,
        [],
    );
    assert.equal(
        presentation.hairEn,
        'ponytail',
    );
    assert.deepEqual(
        presentation
            .visibleConditions,
        [
            'ink-stained',
        ],
    );
    assert.equal(
        isItemVisibleToPlayer(
            createItem({
                visibility: 'hidden',
            }),
            [
                'player',
            ],
        ),
        false,
    );
});

test('Item physicalForm normalization and validation enforce material existence invariants', () => {
    assert.equal(
        inferDestroyedPhysicalForm(
            'the smoking ruin of the quill vanished entirely',
        ),
        'absent',
    );
    assert.equal(
        inferDestroyedPhysicalForm(
            'the quill shattered and its pieces were gathered',
        ),
        'remains',
    );

    const consumed =
        normalizeItem({
            id: 'consumed_toffee',
            state: 'consumed',
            physicalForm: 'whole',
            holderId: 'player',
            isEquipped: true,
            location: {
                mapId: 'old_map',
                roomId: 'old_room',
                placement: 'in_hand',
            },
        });
    assert.equal(
        consumed.physicalForm,
        'absent',
    );
    assert.equal(
        consumed.holderId,
        '',
    );
    assert.equal(
        consumed.isEquipped,
        false,
    );
    assert.deepEqual(
        consumed.location,
        {
            mapId: '',
            roomId: '',
            placement: '',
        },
    );
    assert.deepEqual(
        validateItem(consumed),
        [],
    );

    const lost =
        normalizeItem({
            id: 'lost_key',
            state: 'lost',
            holderId: 'player',
        });
    assert.equal(
        lost.physicalForm,
        'unknown',
    );
    assert.equal(
        lost.holderId,
        '',
    );

    const legacyDestroyed =
        normalizeItem({
            id: 'ambiguous_wreck',
            state: 'destroyed',
            holderId: 'player',
        });
    assert.equal(
        legacyDestroyed
            .physicalForm,
        'remains',
    );
    assert.equal(
        legacyDestroyed.holderId,
        'player',
    );

    assert.match(
        validateItem({
            ...legacyDestroyed,
            physicalForm: 'absent',
            holderId: 'player',
        }).join(' '),
        /不能有 holderId/u,
    );
});

test('Item composer protocol exposes all operations and pairs stable formal Item references', () => {
    assert.deepEqual(
        ITEM_OPERATION_OPTIONS
            .map(option => [
                option.operation,
                option.label,
            ]),
        [
            ['acquire', '获得'],
            ['carry', '携带'],
            ['place', '放置'],
            ['equip', '穿戴'],
            ['unequip', '脱下'],
            ['give', '赠送'],
            ['lend', '借出'],
            ['consume', '消耗'],
            ['damage', '损坏'],
            ['clean', '清洗'],
            ['lose', '丢失'],
            ['destroy', '销毁'],
        ],
    );
    const action = [
        createItemOperationDirective(
            'carry',
        ),
        createItemReferenceDirective({
            id: 'pink_ribbon',
            label:
                '粉色｜丝带】',
        }),
        '我把它仔细收在口袋里。',
        createItemOperationDirective(
            'lend',
        ),
        createItemReferenceDirective({
            id: 'borrowed_wand',
            label:
                '借来的魔杖',
        }),
        '我把魔杖借给拉文德。',
    ].join('\n');
    const parsed =
        parseItemOperationDirectives(
            action,
            [
                createItem(),
                createItem({
                    id: 'borrowed_wand',
                    type: 'wand',
                }),
            ],
        );
    assert.deepEqual(
        parsed.errors,
        [],
    );
    assert.deepEqual(
        parsed.directives.map(
            directive => ({
                operation:
                    directive.operation,
                itemId:
                    directive.itemId,
                itemLabel:
                    directive.itemLabel,
            }),
        ),
        [
            {
                operation: 'carry',
                itemId:
                    'pink_ribbon',
                itemLabel:
                    '粉色 丝带',
            },
            {
                operation: 'lend',
                itemId:
                    'borrowed_wand',
                itemLabel:
                    '借来的魔杖',
            },
        ],
    );
});

test('Item composer protocol rejects orphaned, unknown and hidden references without guessing', () => {
    const parsed =
        parseItemOperationDirectives(
            [
                '【物品:orphan_item｜孤立物品】',
                '【物品操作:carry｜携带】',
                '【物品:unknown_item｜未知物品】',
                '【物品操作:destroy｜销毁】',
            ].join('\n'),
            [
                createItem(),
            ],
        );
    assert.deepEqual(
        parsed.directives,
        [],
    );
    assert.equal(
        parsed.errors.length,
        3,
    );
    assert.match(
        parsed.errors.join(' '),
        /缺少前置操作/u,
    );
    assert.match(
        parsed.errors.join(' '),
        /不在当前正式物品库/u,
    );
    assert.match(
        parsed.errors.join(' '),
        /缺少物品引用/u,
    );
    assert.equal(
        createItemOperationDirective(
            'teleport',
        ),
        '',
    );
    assert.equal(
        createItemReferenceDirective({
            id: 'Bad ID',
            label: '无效',
        }),
        '',
    );
});

test('Item V2 reducer applies all twelve operations with owner-holder invariants', () => {
    const base =
        createState({
            items: [
                createItem(),
            ],
        });
    const apply = (
        state,
        operation,
        extra = {},
    ) =>
        applyItemOperations(
            state,
            [
                proposal({
                    id: 'pink_ribbon',
                    operation,
                    ...extra,
                }),
            ],
        );

    let state = apply(
        base,
        'place',
        {
            location: {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'transfiguration_classroom',
                placement:
                    'on_desk',
            },
        },
    );
    assert.equal(
        state.items[0].holderId,
        '',
    );
    assert.equal(
        state.items[0]
            .location.placement,
        'on_desk',
    );

    state = apply(
        state,
        'carry',
        {
            targetHolderId: 'player',
            held: true,
        },
    );
    assert.equal(
        state.items[0].holderId,
        'player',
    );
    assert.deepEqual(
        state.actorPresentations
            .player.heldItemIds,
        [
            'pink_ribbon',
        ],
    );

    state = apply(
        state,
        'equip',
        {
            targetHolderId: 'player',
        },
    );
    assert.equal(
        state.items[0].isEquipped,
        true,
    );
    assert.deepEqual(
        state.actorPresentations
            .player.wornItemIds,
        [
            'pink_ribbon',
        ],
    );

    state = apply(
        state,
        'unequip',
    );
    assert.equal(
        state.items[0].isEquipped,
        false,
    );
    assert.deepEqual(
        state.actorPresentations
            .player.wornItemIds,
        [],
    );

    const lent = apply(
        base,
        'lend',
        {
            targetHolderId:
                'canon_lavender_brown',
            held: true,
        },
    );
    assert.equal(
        lent.items[0].ownerId,
        'player',
    );
    assert.equal(
        lent.items[0].holderId,
        'canon_lavender_brown',
    );
    assert.equal(
        lent.items[0].transferMode,
        'loan',
    );

    const given = apply(
        base,
        'give',
        {
            targetHolderId:
                'canon_lavender_brown',
        },
    );
    assert.equal(
        given.items[0].ownerId,
        'canon_lavender_brown',
    );
    assert.equal(
        given.items[0].holderId,
        'canon_lavender_brown',
    );

    const stolen = apply(
        base,
        'acquire',
        {
            targetHolderId:
                'canon_lavender_brown',
            transferMode: 'theft',
        },
    );
    assert.equal(
        stolen.items[0].ownerId,
        'player',
    );
    assert.equal(
        stolen.items[0].holderId,
        'canon_lavender_brown',
    );
    assert.equal(
        stolen.items[0].transferMode,
        'theft',
    );

    const damaged = apply(
        base,
        'damage',
    );
    assert.equal(
        damaged.items[0].state,
        'damaged',
    );

    const cleaned = applyItemOperations(
        createState({
            items: [
                createItem({
                    state: 'dirty',
                }),
            ],
        }),
        [
            proposal({
                id: 'pink_ribbon',
                operation: 'clean',
            }),
        ],
    );
    assert.equal(
        cleaned.items[0].state,
        'intact',
    );

    for (
        const [
            operation,
            expectedState,
            expectedHolderId,
        ]
        of [
            [
                'consume',
                'consumed',
                '',
            ],
            [
                'lose',
                'lost',
                '',
            ],
            [
                'destroy',
                'destroyed',
                'player',
            ],
        ]
    ) {
        const result =
            apply(
                base,
                operation,
            );
        assert.equal(
            result.items[0].state,
            expectedState,
        );
        assert.equal(
            result.items[0].holderId,
            expectedHolderId,
        );
        assert.equal(
            result.items[0].custody,
            expectedHolderId
                ? 'carried'
                : (
                    operation ===
                        'consume'
                        ? 'consumed'
                        : 'lost'
                ),
        );
    }

    const consumed = apply(
        base,
        'consume',
    );
    const replayed = apply(
        consumed,
        'carry',
        {
            targetHolderId: 'player',
        },
    );
    assert.equal(
        replayed.items[0].state,
        'consumed',
    );
    assert.equal(
        replayed.items[0].holderId,
        '',
    );
});

test('[defect-probing] accepted equipped acquisition preserves Item and presentation state', () => {
    const candidate =
        proposal({
            operation: 'acquire',
            evidenceText:
                'Lavender tied the pink ribbon into her hair.',
            item: {
                id: 'lavender_pink_ribbon',
                type: 'accessory',
                labelEn:
                    'Lavender Brown\'s Pink Ribbon',
                label:
                    '拉文德·布朗的粉色丝带',
                ownerId:
                    'canon_lavender_brown',
                holderId:
                    'canon_lavender_brown',
                appearanceEn:
                    'A narrow pink silk ribbon.',
                appearance:
                    '一条窄窄的粉色丝带。',
                isEquipped: true,
                storyRoles: [
                    'signature',
                    'social',
                ],
                visibility: 'public',
            },
        });
    const queued =
        queueItemCandidates(
            createState(),
            [
                candidate,
            ],
        );
    const accepted =
        resolveItemCandidate(
            queued,
            candidate.key,
            'accepted',
        ).state;
    const item =
        accepted.items.find(entry =>
            entry.id ===
                'lavender_pink_ribbon');
    assert.equal(
        item.isEquipped,
        true,
    );
    assert.deepEqual(
        accepted.actorPresentations
            .canon_lavender_brown
            .wornItemIds,
        [
            'lavender_pink_ribbon',
        ],
    );
    assert.equal(
        accepted.scene.itemStates
            .some(entry =>
                entry.id ===
                    'lavender_pink_ribbon'),
        true,
    );
});

test('[defect-probing] ignored acquisition uses a stable decision key across evidence wording', () => {
    const first =
        proposal({
            id: 'lavender_pink_ribbon',
            operation: 'acquire',
            labelEn: 'Pink Ribbon',
            appearanceEn:
                'A pink silk ribbon.',
            evidenceText:
                'Lavender wore a pink silk ribbon.',
        });
    const repeated =
        proposal({
            id: 'lavender_pink_ribbon',
            operation: 'acquire',
            labelEn: 'Pink Ribbon',
            appearanceEn:
                'A pink silk ribbon.',
            evidenceText:
                'The pink ribbon bobbed beside Lavender\'s curls.',
        });
    assert.equal(
        first.key,
        repeated.key,
    );

    const ignored =
        resolveItemCandidate(
            queueItemCandidates(
                createState(),
                [
                    first,
                ],
            ),
            first.key,
            'ignored',
        ).state;
    const partitioned =
        partitionItemProposals(
            [
                repeated,
            ],
            ignored,
        );
    assert.deepEqual(
        partitioned.candidates,
        [],
    );
});

test('candidate partition requires grounded evidence and keeps hidden objects out of player confirmation', () => {
    const state = createState();
    const proposals = [
        {
            id: 'grounded_letter',
            operation: 'acquire',
            labelEn:
                'Signed Letter',
            appearanceEn:
                'A folded signed letter.',
            evidenceText:
                'Tina kept the signed letter.',
        },
        {
            id: 'invented_key',
            operation: 'acquire',
            labelEn: 'Silver Key',
            appearanceEn:
                'A small silver key.',
            evidenceText:
                'A key appeared elsewhere.',
        },
        {
            id: 'hidden_note',
            operation: 'acquire',
            labelEn:
                'Hidden Note',
            appearanceEn:
                'A concealed note.',
            visibility: 'hidden',
            evidenceText:
                'Tina kept the hidden note.',
        },
    ];
    const partitioned =
        partitionItemProposals(
            proposals,
            state,
            {
                sourceTexts: [
                    'Tina kept the signed letter.',
                    'Tina kept the hidden note.',
                ],
            },
        );
    assert.deepEqual(
        partitioned.candidates
            .map(item =>
                item.id),
        [
            'grounded_letter',
        ],
    );
});

test('high-risk Item operations require evidence for both the Item and state change', () => {
    const autograph = createItem({
        id:
            'harry_signed_parchment',
        type: 'document',
        labelEn:
            'Harry Potter Autograph',
        label:
            '哈利·波特亲笔签名',
        appearanceEn:
            'A signed parchment bearing Harry Potter\'s crooked H.',
    });
    const state = createState({
        items: [
            autograph,
        ],
    });
    const catEvidence =
        'The cat stood up. Professor McGonagall stood precisely where the cat had been.';
    const lostEvidence =
        'The signed parchment slipped from Tina\'s bag and was lost beneath the moving staircase.';
    const observed = evidenceText => ({
        id:
            'harry_signed_parchment',
        operation: 'lose',
        sourceKind: 'narrative',
        evidenceText,
        confidence: 0.99,
    });

    assert.equal(
        isItemOperationEvidenceGrounded(
            autograph,
            'lose',
            catEvidence,
        ),
        false,
    );
    assert.deepEqual(
        projectObservedInventoryUpdates(
            [
                observed(
                    catEvidence,
                ),
            ],
            state,
            '',
            catEvidence,
        ),
        [],
    );
    assert.deepEqual(
        partitionItemProposals(
            [
                observed(
                    catEvidence,
                ),
            ],
            state,
            {
                sourceTexts: [
                    catEvidence,
                ],
            },
        ).operations,
        [],
    );

    const projected =
        projectObservedInventoryUpdates(
            [
                observed(
                    lostEvidence,
                ),
            ],
            state,
            '',
            lostEvidence,
        );
    assert.equal(
        projected.length,
        1,
    );
    assert.equal(
        partitionItemProposals(
            projected,
            state,
            {
                sourceTexts: [
                    lostEvidence,
                ],
            },
        ).operations.length,
        1,
    );
});

test('destroyed Item remains are grounded and narrative proposals fold once', () => {
    const quill =
        createItem({
            id:
                'harry_spare_brass_quill',
            type: 'tool',
            labelEn:
                'Harry\'s Spare Brass Quill',
            label:
                '哈利的备用黄铜羽毛笔',
            appearanceEn:
                'A brass-nibbed quill.',
            ownerId:
                'canon_harry_james_potter',
            holderId:
                'player',
        });
    const state =
        createState({
            items: [quill],
        });
    const evidence =
        'the smoking ruin of the quill vanished entirely';
    const payload =
        settleNarrativeTurnPerformance(
            {
                segments: [{
                    type: 'narration',
                    textEn:
                        `McGonagall flicked her wand and ${evidence}.`,
                }],
                stateProposals: [{
                    type:
                        'item_update',
                    item: {
                        id:
                            quill.id,
                        operation:
                            'destroy',
                        type: 'tool',
                        ownerId:
                            quill.ownerId,
                        holderId:
                            quill.holderId,
                        evidenceText:
                            evidence,
                    },
                }],
            },
            state,
        );

    assert.equal(
        payload.itemUpdates
            .length,
        1,
    );
    assert.equal(
        payload.itemUpdates[0]
            .operation,
        'destroy',
    );
    assert.equal(
        payload.itemUpdates[0]
            .action,
        'destroy',
    );
    assert.equal(
        isItemOperationEvidenceGrounded(
            quill,
            'destroy',
            evidence,
        ),
        true,
    );
    assert.equal(
        isItemOperationEvidenceGrounded(
            quill,
            'destroy',
            'The quill vanished from the desk.',
        ),
        false,
    );
    const partitioned =
        partitionItemProposals(
            payload.itemUpdates,
            state,
            {
                sourceTexts: [
                    payload
                        .segments[0]
                        .textEn,
                ],
            },
        );
    assert.equal(
        partitioned.operations
            .length,
        1,
    );
});

test('[defect-probing] vanished quill becomes absent, clears placement and replays idempotently', () => {
    const quill =
        createItem({
            id:
                'harry_spare_brass_quill',
            type: 'tool',
            labelEn:
                'Harry\'s Spare Brass Quill',
            label:
                '哈利的备用黄铜羽毛笔',
            ownerId:
                'canon_harry_james_potter',
            holderId: 'player',
            isEquipped: true,
        });
    const state =
        createState({
            items: [quill],
            actorPresentations: {
                player: {
                    wornItemIds: [
                        quill.id,
                    ],
                    heldItemIds: [
                        quill.id,
                    ],
                },
            },
        });
    const destroy =
        proposal({
            id: quill.id,
            operation: 'destroy',
            evidenceText:
                'the smoking ruin of the quill vanished entirely',
        });
    const destroyed =
        applyItemOperations(
            state,
            [destroy],
        );
    const absent =
        destroyed.items[0];

    assert.equal(
        destroy.physicalForm,
        'absent',
    );
    assert.equal(
        absent.state,
        'destroyed',
    );
    assert.equal(
        absent.physicalForm,
        'absent',
    );
    assert.equal(
        absent.holderId,
        '',
    );
    assert.equal(
        absent.isEquipped,
        false,
    );
    assert.deepEqual(
        absent.location,
        {
            mapId: '',
            roomId: '',
            placement: '',
        },
    );
    assert.deepEqual(
        destroyed
            .actorPresentations
            .player.wornItemIds,
        [],
    );
    assert.deepEqual(
        destroyed
            .actorPresentations
            .player.heldItemIds,
        [],
    );

    const replayed =
        applyItemOperations(
            destroyed,
            [
                proposal({
                    id: quill.id,
                    operation:
                        'destroy',
                }),
            ],
        );
    assert.deepEqual(
        replayed.items,
        destroyed.items,
    );
    assert.deepEqual(
        replayed
            .actorPresentations,
        destroyed
            .actorPresentations,
    );

    const carryAttempt =
        applyItemOperations(
            destroyed,
            [
                proposal({
                    id: quill.id,
                    operation: 'carry',
                    targetHolderId:
                        'player',
                    held: true,
                }),
            ],
        );
    assert.deepEqual(
        carryAttempt.items,
        destroyed.items,
    );
    assert.deepEqual(
        carryAttempt
            .actorPresentations,
        destroyed
            .actorPresentations,
    );
});

test('[defect-probing] gathered quill remains can be carried and placed but not equipped', () => {
    const quill =
        createItem({
            id:
                'harry_spare_brass_quill',
            type: 'tool',
            labelEn:
                'Harry\'s Spare Brass Quill',
            holderId: 'player',
        });
    const state =
        createState({
            items: [quill],
            actorPresentations: {
                player: {
                    heldItemIds: [
                        quill.id,
                    ],
                },
            },
        });
    const remains =
        applyItemOperations(
            state,
            [
                proposal({
                    id: quill.id,
                    operation:
                        'destroy',
                    evidenceText:
                        'The quill shattered and its pieces were gathered.',
                }),
            ],
        );
    assert.equal(
        remains.items[0]
            .physicalForm,
        'remains',
    );
    assert.equal(
        remains.items[0]
            .holderId,
        'player',
    );
    assert.deepEqual(
        remains
            .actorPresentations
            .player.heldItemIds,
        [quill.id],
    );

    const equipAttempt =
        applyItemOperations(
            remains,
            [
                proposal({
                    id: quill.id,
                    operation: 'equip',
                    targetHolderId:
                        'player',
                }),
            ],
        );
    assert.deepEqual(
        equipAttempt.items,
        remains.items,
    );

    const carried =
        applyItemOperations(
            remains,
            [
                proposal({
                    id: quill.id,
                    operation: 'carry',
                    targetHolderId:
                        'canon_harry_james_potter',
                    held: true,
                }),
            ],
        );
    assert.equal(
        carried.items[0]
            .physicalForm,
        'remains',
    );
    assert.equal(
        carried.items[0]
            .holderId,
        'canon_harry_james_potter',
    );
    assert.deepEqual(
        carried
            .actorPresentations
            .canon_harry_james_potter
            .heldItemIds,
        [quill.id],
    );

    const placed =
        applyItemOperations(
            carried,
            [
                proposal({
                    id: quill.id,
                    operation: 'place',
                    location: {
                        mapId:
                            'hogwarts_castle',
                        roomId:
                            'transfiguration_classroom',
                        placement:
                            'on_desk',
                    },
                }),
            ],
        );
    assert.equal(
        placed.items[0]
            .physicalForm,
        'remains',
    );
    assert.equal(
        placed.items[0]
            .holderId,
        '',
    );
    assert.equal(
        placed.items[0]
            .location.placement,
        'on_desk',
    );
});

test('a completed loan promotes an ordinary quill to a player-confirmed candidate', () => {
    const evidence =
        'Harry nudged a spare brass quill toward Tina and told her she could use it.';
    const state = createState();
    const projected =
        projectObservedInventoryUpdates(
            [{
                id:
                    'harry_spare_brass_quill',
                operation:
                    'acquire',
                type: 'tool',
                labelEn:
                    'Harry\'s Spare Brass Quill',
                appearanceEn:
                    'A spare writing quill with a brass nib.',
                ownerId:
                    'canon_harry_james_potter',
                holderId: 'player',
                transferMode: 'loan',
                storyRoles: [],
                visibility: 'public',
                held: false,
                sourceKind:
                    'narrative',
                evidenceText:
                    evidence,
                confidence: 0.95,
            }],
            state,
            '',
            evidence,
        );
    const partitioned =
        partitionItemProposals(
            projected,
            state,
            {
                sourceTexts: [
                    evidence,
                ],
            },
        );

    assert.equal(
        partitioned.candidates.length,
        1,
    );
    assert.equal(
        partitioned.candidates[0]
            .transferMode,
        'loan',
    );
    assert.equal(
        partitioned.candidates[0]
            .item.ownerId,
        'canon_harry_james_potter',
    );
    assert.equal(
        partitioned.candidates[0]
            .item.holderId,
        'player',
    );
});

test('inventory observer prompt treats completed transfers as an implicit-item boundary', async () => {
    const source = await readFile(
        new URL(
            '../src/hogwarts-mud/local-semantic-adjudicator.js',
            import.meta.url,
        ),
        'utf8',
    );
    assert.match(
        source,
        /A completed gift, loan, return, or theft crosses the implicit-item boundary/u,
    );
    assert.match(
        source,
        /quill\|pen\|textbook/u,
    );
});

test('V1 migration preserves five items and presentation details, seeds canon once and is idempotent', () => {
    const state = createState({
        items: Array.from(
            {
                length: 5,
            },
            (
                _,
                index,
            ) => ({
                id:
                    `legacy_item_${index + 1}`,
                kind:
                    index === 0
                        ? 'wand'
                        : 'other',
                labelEn:
                    `Legacy Item ${index + 1}`,
                detailEn:
                    `Legacy detail ${index + 1}.`,
                ownerId: 'player',
                custody:
                    index === 0
                        ? 'equipped'
                        : 'stored',
                source: 'opening',
                acquiredClock:
                    '1991-07-24 · 09:10',
            }),
        ),
        actorPresentations: {
            player: {
                outfit:
                    'Standard school robes.',
                hair: 'ponytail',
                visibleConditions: [
                    'ink-stained',
                ],
            },
        },
    });
    const first =
        migrateItemSystemState(
            state,
        );
    assert.equal(
        first.changed,
        true,
    );
    assert.equal(
        first.state.items
            .filter(item =>
                item.id.startsWith(
                    'legacy_item_',
                ))
            .length,
        5,
    );
    assert.equal(
        first.state.items
            .find(item =>
                item.id ===
                    'legacy_item_1')
            .sourceEventId,
        'legacy_opening',
    );
    assert.deepEqual(
        first.state.actorPresentations
            .player.visibleConditions,
        [
            'ink-stained',
        ],
    );
    assert.deepEqual(
        first.state.actorPresentations
            .player.wornItemIds,
        [
            'legacy_item_1',
        ],
    );
    assert.equal(
        first.state.items
            .filter(item =>
                item.id ===
                    'canon_harry_holly_wand')
            .length,
        1,
    );

    const second =
        migrateItemSystemState(
            first.state,
        );
    assert.equal(
        second.changed,
        false,
    );
    assert.equal(
        second.state.items
            .find(item =>
                item.id ===
                    'legacy_item_1')
            .sourceEventId,
        'legacy_opening',
    );
});

test('[defect-probing] migration distinguishes absent evidence from remains and is idempotent', () => {
    const state =
        createState({
            items: [
                {
                    id:
                        'vanished_quill',
                    type: 'tool',
                    labelEn:
                        'Vanished Quill',
                    state:
                        'destroyed',
                    holderId:
                        'player',
                    evidenceText:
                        'The smoking ruin vanished entirely.',
                },
                {
                    id:
                        'gathered_quill',
                    type: 'tool',
                    labelEn:
                        'Gathered Quill',
                    state:
                        'destroyed',
                    holderId:
                        'player',
                    evidenceText:
                        'Its shattered pieces were gathered.',
                },
                {
                    id:
                        'legacy_wreck',
                    type: 'tool',
                    labelEn:
                        'Legacy Wreck',
                    state:
                        'destroyed',
                    holderId:
                        'player',
                },
            ],
            actorPresentations: {
                player: {
                    wornItemIds: [
                        'vanished_quill',
                        'gathered_quill',
                    ],
                    heldItemIds: [
                        'vanished_quill',
                        'gathered_quill',
                        'legacy_wreck',
                    ],
                },
                canon_harry_james_potter: {
                    heldItemIds: [
                        'gathered_quill',
                    ],
                },
            },
        });
    const first =
        migrateItemSystemState(
            state,
        );
    const migrated =
        new Map(
            first.state.items
                .map(item => [
                    item.id,
                    item,
                ]),
        );

    assert.equal(
        migrated.get(
            'vanished_quill',
        ).physicalForm,
        'absent',
    );
    assert.equal(
        migrated.get(
            'vanished_quill',
        ).holderId,
        '',
    );
    assert.equal(
        migrated.get(
            'gathered_quill',
        ).physicalForm,
        'remains',
    );
    assert.equal(
        migrated.get(
            'legacy_wreck',
        ).physicalForm,
        'remains',
    );
    assert.deepEqual(
        first.state
            .actorPresentations
            .player.wornItemIds,
        [],
    );
    assert.deepEqual(
        first.state
            .actorPresentations
            .player.heldItemIds,
        [
            'gathered_quill',
            'legacy_wreck',
        ],
    );
    assert.deepEqual(
        first.state
            .actorPresentations
            .canon_harry_james_potter
            .heldItemIds,
        [],
    );

    const second =
        migrateItemSystemState(
            first.state,
        );
    assert.equal(
        second.changed,
        false,
    );
    assert.deepEqual(
        second.state,
        first.state,
    );
});

test('Canon seed respects actor availability, dates and Ron wand ownership', () => {
    const before = createState();
    before.clock =
        '1991-08-31 · 10:00';
    before.actorLibrary = [{
        id:
            'canon_ronald_bilius_weasley',
    }];
    assert.deepEqual(
        seedCanonItems(before),
        [],
    );

    const current =
        structuredClone(before);
    current.clock =
        '1991-09-01 · 10:00';
    current.actors = [{
        id:
            'canon_ronald_bilius_weasley',
        mapId:
            'hogwarts_express_interior',
        roomId:
            'compartment',
    }];
    const seeded =
        seedCanonItems(current);
    assert.equal(
        seeded.length,
        1,
    );
    assert.equal(
        seeded[0].ownerId,
        'canon_charles_weasley',
    );
    assert.equal(
        seeded[0].holderId,
        'canon_ronald_bilius_weasley',
    );
    assert.equal(
        seeded[0].transferMode,
        'loan',
    );
});

test('item projections group history, filter hidden NPC items and expose candidate decisions', () => {
    const state = createState({
        items: [
            createItem(),
            createItem({
                id: 'lost_letter',
                type: 'document',
                labelEn:
                    'Lost Letter',
                state: 'lost',
                holderId: '',
            }),
            createItem({
                id: 'secret_key',
                type: 'key',
                labelEn:
                    'Secret Key',
                ownerId:
                    'canon_lavender_brown',
                holderId:
                    'canon_lavender_brown',
                visibility: 'hidden',
            }),
        ],
    });
    const ledger =
        projectItemLedger(
            state,
        );
    assert.deepEqual(
        ledger.active.map(item =>
            item.id),
        [
            'pink_ribbon',
        ],
    );
    assert.deepEqual(
        ledger.history.map(item =>
            item.id),
        [
            'lost_letter',
        ],
    );
    assert.equal(
        projectActorItems(
            state,
            'canon_lavender_brown',
        ).some(item =>
            item.id ===
                'secret_key'),
        false,
    );

    const candidate =
        proposal({
            id: 'signed_note',
            operation: 'acquire',
            labelEn: 'Signed Note',
            appearanceEn:
                'A signed note.',
            evidenceText:
                'Tina kept the signed note.',
        });
    const queued =
        queueItemCandidates(
            state,
            [
                candidate,
            ],
        );
    assert.equal(
        getItemProposalDecision(
            queued,
            candidate.key,
        ),
        'pending',
    );
    const ignored =
        resolveItemCandidate(
            queued,
            candidate.key,
            'ignored',
        ).state;
    assert.equal(
        getItemProposalDecision(
            ignored,
            candidate.key,
        ),
        'ignored',
    );
});

test('[defect-probing] scene item states exclude nonphysical items and preserve carried remains form', () => {
    const itemStates =
        createSceneItemStates(
            [
                createItem(),
                createItem({
                    id: 'broken_quill',
                    type: 'tool',
                    labelEn:
                        'Broken Quill',
                    state: 'destroyed',
                    physicalForm:
                        'remains',
                    location: {
                        mapId: 'old_map',
                        roomId:
                            'old_room',
                        placement:
                            'with_holder',
                    },
                }),
                createItem({
                    id: 'vanished_quill',
                    type: 'tool',
                    labelEn:
                        'Vanished Quill',
                    state: 'destroyed',
                    physicalForm:
                        'absent',
                    holderId: '',
                }),
                createItem({
                    id: 'lost_quill',
                    type: 'tool',
                    labelEn:
                        'Lost Quill',
                    state: 'lost',
                    physicalForm:
                        'unknown',
                    holderId: '',
                }),
            ],
            {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'great_hall',
            },
        );

    assert.deepEqual(
        itemStates.map(item =>
            item.id),
        [
            'pink_ribbon',
            'broken_quill',
        ],
    );
    assert.equal(
        itemStates[0]
            .physicalForm,
        'whole',
    );
    assert.deepEqual(
        itemStates[1],
        {
            id: 'broken_quill',
            version: 4,
            type: 'tool',
            custody: 'carried',
            ownerId: 'player',
            holderId: 'player',
            mapId:
                'hogwarts_castle',
            roomId: 'great_hall',
            status: 'destroyed',
            state: 'destroyed',
            physicalForm:
                'remains',
            isEquipped: false,
        },
    );
});

test('destroyed item remains follow the current holder instead of the owner', () => {
    const state = createState({
        items: [
            createItem({
                ownerId: 'player',
                holderId:
                    'canon_lavender_brown',
                transferMode: 'loan',
                state: 'destroyed',
                location: {
                    mapId: 'old_map',
                    roomId: 'old_room',
                    placement:
                        'with_holder',
                },
            }),
        ],
    });
    state.actors[0].mapId =
        'hogwarts_grounds';
    state.actors[0].roomId =
        'courtyard';
    const [item] =
        synchronizeHeldItemLocations(
            state.items,
            {
                playerMapId:
                    state.map
                        .activeMapId,
                playerRoomId:
                    state.map
                        .currentLocalNodeId,
                actors:
                    state.actors,
                clock:
                    state.clock,
            },
        );
    assert.deepEqual(
        item.location,
        {
            mapId:
                'hogwarts_grounds',
            roomId: 'courtyard',
            placement:
                'with_holder',
        },
    );
    assert.equal(
        item.ownerId,
        'player',
    );
    assert.equal(
        item.holderId,
        'canon_lavender_brown',
    );
    assert.equal(
        item.state,
        'destroyed',
    );
    assert.equal(
        item.custody,
        'carried',
    );
});

test('[defect-probing] observer rejects an unrelated ordinary acquisition that reuses another item evidence', () => {
    const state = createState();
    const evidence =
        '*激动拿起签名，把哈利签过名的羊皮纸带在身上*';
    const projected =
        projectObservedInventoryUpdates(
            [
                {
                    id:
                        'harry_potter_autograph',
                    operation:
                        'acquire',
                    type: 'document',
                    labelEn:
                        'Harry Potter Autograph',
                    appearanceEn:
                        'A signed parchment.',
                    ownerId: 'player',
                    holderId: 'player',
                    transferMode:
                        'none',
                    storyRoles: [
                        'social',
                        'keepsake',
                    ],
                    visibility: 'public',
                    isEquipped: false,
                    held: true,
                    sourceKind: 'player',
                    evidenceText:
                        evidence,
                    confidence: 0.96,
                },
                {
                    id:
                        'breakfast_toast',
                    operation:
                        'acquire',
                    type: 'consumable',
                    labelEn: 'Toast',
                    appearanceEn:
                        'An ordinary breakfast item.',
                    ownerId: 'player',
                    holderId: 'player',
                    transferMode:
                        'none',
                    storyRoles: [],
                    visibility: 'public',
                    isEquipped: false,
                    held: true,
                    sourceKind: 'player',
                    evidenceText:
                        evidence,
                    confidence: 0.99,
                },
            ],
            state,
            evidence,
            '',
        );
    assert.deepEqual(
        projected.map(item =>
            item.id),
        [
            'harry_potter_autograph',
        ],
    );
});

test('appearance resolves visible formal IDs before legacy fallback', () => {
    const state = createState({
        items: [
            createItem({
                ownerId:
                    'canon_lavender_brown',
                holderId:
                    'canon_lavender_brown',
                isEquipped: true,
            }),
        ],
        actorPresentations: {
            canon_lavender_brown: {
                outfit:
                    'Standard Hogwarts robes.',
                wornItemIds: [
                    'pink_ribbon',
                ],
                heldItemIds: [
                    'pink_ribbon',
                ],
                heldObject:
                    'legacy ribbon text',
            },
        },
    });
    const view =
        buildActorAppearanceView(
            state,
            'canon_lavender_brown',
        );
    assert.deepEqual(
        view.presentation
            .wornItems,
        [
            'Pink Ribbon',
        ],
    );
    assert.deepEqual(
        view.presentation
            .heldItems,
        [
            {
                hand: 'unspecified',
                item: 'Pink Ribbon',
                itemId:
                    'pink_ribbon',
            },
        ],
    );
});

test('[defect-probing] hidden formal held IDs suppress unfiltered legacy text', () => {
    const state = createState({
        items: [
            createItem({
                id: 'secret_key',
                type: 'key',
                labelEn:
                    'Secret Key',
                label: '秘密钥匙',
                ownerId:
                    'canon_lavender_brown',
                holderId:
                    'canon_lavender_brown',
                visibility: 'hidden',
            }),
        ],
        actorPresentations: {
            canon_lavender_brown: {
                heldItemIds: [
                    'secret_key',
                ],
                heldItems: {
                    right:
                        '秘密钥匙',
                },
                heldObject:
                    '秘密钥匙',
            },
        },
    });
    const view =
        buildActorAppearanceView(
            state,
            'canon_lavender_brown',
        );
    assert.deepEqual(
        view.presentation
            .heldItems,
        [],
    );
});
