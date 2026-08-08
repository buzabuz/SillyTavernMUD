import {
    isItemVisibleToPlayer,
    normalizeItem,
} from './item-schema.js';

export const ITEM_TYPE_LABELS =
    Object.freeze({
        wand: '魔杖',
        eyewear: '眼镜',
        clothing: '衣着',
        accessory: '饰品',
        document: '文书',
        container: '容器',
        money: '钱币',
        key: '钥匙',
        book: '书籍',
        tool: '工具',
        consumable: '消耗品',
        keepsake: '纪念物',
        clue: '线索物',
        other: '物品',
    });

export const ITEM_STATE_LABELS =
    Object.freeze({
        intact: '完好',
        damaged: '损坏',
        dirty: '待清洗',
        consumed: '已消耗',
        lost: '已丢失',
        destroyed: '已销毁',
    });

export const ITEM_TRANSFER_LABELS =
    Object.freeze({
        none: '',
        gift: '赠与',
        loan: '借出',
        theft: '失窃转移',
        return: '归还',
    });

export const ITEM_STORY_ROLE_LABELS =
    Object.freeze({
        signature: '标志物',
        social: '社会意义',
        clue: '线索',
        promise: '承诺',
        keepsake: '纪念',
    });

const ITEM_TIME_PRECISION_LABELS =
    Object.freeze({
        exact: '准确时间',
        day: '当日',
        before_date: '不晚于',
        unknown: '时间未详',
    });

function getActorName(
    state,
    actorId,
) {
    if (!actorId) {
        return '无人持有';
    }
    if (actorId === 'player') {
        return state.character
            ?.identity?.name ||
            '玩家';
    }
    const actor =
        (
            state.actors ||
            []
        ).find(entry =>
            entry.id === actorId);
    const profile =
        (
            state.actorLibrary ||
            []
        ).find(entry =>
            entry.id === actorId);
    return profile?.name ||
        actor?.name ||
        profile?.nameEn ||
        actor?.nameEn ||
        actorId;
}

function getKnownActorIds(
    state,
) {
    return (
        state.actorLibrary ||
        []
    )
        .filter(actor =>
            actor.playerKnown ===
                true ||
            actor.knownToPlayer ===
                true ||
            Boolean(
                actor
                    .introducedClock,
            ) ||
            Boolean(
                actor
                    .firstImpressionClock,
            ))
        .map(actor =>
            actor.id);
}

function getLocationLabel(
    item,
    state,
) {
    if (
        item.holderId
    ) {
        return `随 ${getActorName(
            state,
            item.holderId,
        )}`;
    }
    if (
        item.state === 'lost'
    ) {
        return item.location
            .roomId
            ? `最后见于 ${item.location.roomId}`
            : '下落不明';
    }
    if (
        [
            'consumed',
            'destroyed',
        ].includes(item.state)
    ) {
        return ITEM_STATE_LABELS[
            item.state
        ];
    }
    return item.location
        .placement &&
        item.location
            .placement !==
            'in_room'
        ? item.location
            .placement
        : item.location
            .roomId ||
            '位置未记录';
}

export function projectItemCard(
    source,
    state,
) {
    const item =
        normalizeItem(
            source,
        );
    const ownerName =
        getActorName(
            state,
            item.ownerId,
        );
    const holderName =
        item.holderId
            ? getActorName(
                state,
                item.holderId,
            )
            : '';
    return {
        id:
            item.id,
        type:
            item.type,
        typeLabel:
            ITEM_TYPE_LABELS[
                item.type
            ] ||
            '物品',
        label:
            item.label ||
            item.labelEn,
        appearance:
            item.appearance ||
            item.appearanceEn ||
            '外观尚未记录。',
        state:
            item.state,
        stateLabel:
            ITEM_STATE_LABELS[
                item.state
            ] ||
            item.state,
        ownerName,
        holderName,
        ownershipLabel:
            holderName &&
            item.holderId !==
                item.ownerId
                ? `主人 ${ownerName} · 持有人 ${holderName}`
                : `主人 ${ownerName}`,
        locationLabel:
            getLocationLabel(
                item,
                state,
            ),
        isEquipped:
            item.isEquipped,
        transferLabel:
            ITEM_TRANSFER_LABELS[
                item.transferMode
            ] ||
            '',
        storyRoles:
            item.storyRoles.map(
                role => ({
                    id:
                        role,
                    label:
                        ITEM_STORY_ROLE_LABELS[
                            role
                        ] ||
                        role,
                }),
            ),
        notes:
            item.notes ||
            item.notesEn ||
            '',
        acquiredAt:
            item.acquiredAt,
        acquiredLabel:
            item.acquiredAt
                .value
                ? `${
                    ITEM_TIME_PRECISION_LABELS[
                        item.acquiredAt
                            .precision
                    ] ||
                    '时间'
                } ${item.acquiredAt.value}`
                : ITEM_TIME_PRECISION_LABELS
                    .unknown,
        sourceEventId:
            item.sourceEventId,
        sourceUrl:
            item.sourceUrl,
    };
}

export function projectItemLedger(
    state,
) {
    const knownActorIds =
        getKnownActorIds(
            state,
        );
    const cards =
        (
            state.items ||
            []
        )
            .map(item =>
                normalizeItem(item))
            .filter(item =>
                isItemVisibleToPlayer(
                    item,
                    knownActorIds,
                ))
            .map(item =>
                projectItemCard(
                    item,
                    state,
                ));
    const rank = {
        intact: 0,
        dirty: 1,
        damaged: 2,
        lost: 3,
        consumed: 4,
        destroyed: 5,
    };
    cards.sort(
        (left, right) =>
            Number(
                left.ownerName !==
                    (
                        state.character
                            ?.identity
                            ?.name ||
                        '玩家'
                    ),
            ) -
                Number(
                    right.ownerName !==
                        (
                            state.character
                                ?.identity
                                ?.name ||
                            '玩家'
                        ),
                ) ||
            rank[left.state] -
                rank[right.state] ||
            left.label.localeCompare(
                right.label,
                'zh-CN',
            ),
    );
    return {
        cards,
        active:
            cards.filter(card =>
                ![
                    'consumed',
                    'destroyed',
                    'lost',
                ].includes(
                    card.state,
                )),
        history:
            cards.filter(card =>
                [
                    'consumed',
                    'destroyed',
                    'lost',
                ].includes(
                    card.state,
                )),
    };
}

export function projectActorItems(
    state,
    actorId,
) {
    const knownActorIds =
        getKnownActorIds(
            state,
        );
    return (
        state.items ||
        []
    )
        .map(item =>
            normalizeItem(item))
        .filter(item =>
            (
                item.ownerId ===
                    actorId ||
                item.holderId ===
                    actorId
            ) &&
            isItemVisibleToPlayer(
                item,
                knownActorIds,
            ))
        .map(item =>
            projectItemCard(
                item,
                state,
            ));
}

export function getItemProposalDecision(
    state,
    key,
) {
    const decision =
        (
            state
                .itemProposalDecisions ||
            []
        ).find(entry =>
            entry.key === key)
            ?.decision;
    if (decision) {
        return decision;
    }
    return (
        state
            .pendingItemProposals ||
        []
    ).some(proposal =>
        proposal.key === key)
        ? 'pending'
        : '';
}
