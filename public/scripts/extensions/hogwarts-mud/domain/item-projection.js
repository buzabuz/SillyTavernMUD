import {
    isItemVisibleToPlayer,
    normalizeItem,
} from './item-schema.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from './localized-view-model.js';
import {
    getActorDisplayName,
} from './actor-display-name.js';

export const ITEM_TYPE_LABELS =
    Object.freeze({
        wand: 'Wand',
        eyewear: 'Eyewear',
        clothing: 'Clothing',
        accessory: 'Accessory',
        document: 'Document',
        container: 'Container',
        money: 'Currency',
        key: 'Key',
        book: 'Book',
        tool: 'Tool',
        consumable: 'Consumable',
        keepsake: 'Keepsake',
        clue: 'Clue Item',
        other: 'Item',
    });

export const ITEM_STATE_LABELS =
    Object.freeze({
        intact: 'Intact',
        damaged: 'Damaged',
        dirty: 'Needs cleaning',
        consumed: 'Consumed',
        lost: 'Lost',
        destroyed: 'Destroyed',
    });

export const ITEM_TRANSFER_LABELS =
    Object.freeze({
        none: '',
        gift: 'Gift',
        loan: 'Loaned',
        theft: 'Transferred by theft',
        return: 'Returned',
    });

export const ITEM_STORY_ROLE_LABELS =
    Object.freeze({
        signature: 'Signature Item',
        social: 'Social significance',
        clue: 'Clue',
        promise: 'Promise',
        keepsake: 'Keepsake',
    });

const ITEM_TIME_PRECISION_LABELS =
    Object.freeze({
        exact: 'Exact time',
        day: 'That day',
        before_date: 'No later than',
        unknown: 'Time unknown',
    });

function staticText(
    displayLocale,
    staticKey,
    sourceTextEn,
) {
    return getStaticLocaleText(
        staticKey,
        normalizeDisplayLocale(
            displayLocale,
        ),
    ) ||
        sourceTextEn;
}

function formatStaticText(
    displayLocale,
    staticKey,
    sourceTextEn,
    values = {},
) {
    return Object.entries(
        values,
    ).reduce(
        (
            text,
            [
                key,
                value,
            ],
        ) =>
            text.replaceAll(
                `{${key}}`,
                String(value),
            ),
        staticText(
            displayLocale,
            staticKey,
            sourceTextEn,
        ),
    );
}

function mappedLabel(
    displayLocale,
    prefix,
    value,
    labels,
) {
    const sourceTextEn =
        labels[value] ||
        value;
    return labels[value]
        ? staticText(
            displayLocale,
            `${prefix}.${value}`,
            sourceTextEn,
        )
        : sourceTextEn;
}

function getActorName(
    state,
    actorId,
    displayLocale,
    getLocalizedField,
) {
    if (!actorId) {
        return staticText(
            displayLocale,
            'ui.item.no_holder',
            'No holder',
        );
    }
    if (actorId === 'player') {
        return state.character
            ?.identity?.name ||
            staticText(
                displayLocale,
                'ui.item.player',
                'Player',
            );
    }
    const profile =
        (
            state.actorLibrary ||
            []
        ).find(entry =>
            entry.id === actorId);
    return getActorDisplayName({
        actorId,
        nameEn:
            profile?.nameEn ||
            actorId,
        displayLocale,
        getLocalizedField:
            getLocalizedField ||
            (field => ({
                text:
                    field
                        .sourceTextEn,
            })),
    });
}

function getKnownActorIds(
    state,
) {
    return (
        state.actorLibrary ||
        []
    )
        .filter(actor =>
            actor?.id)
        .map(actor =>
            actor.id);
}

function getLocationLabel(
    item,
    state,
    displayLocale,
    {
        getLocalizedField,
        getRoomName,
    } = {},
) {
    if (
        item.holderId
    ) {
        return formatStaticText(
            displayLocale,
            'ui.item.with_holder',
            'With {holder}',
            {
                holder:
                    getActorName(
                        state,
                        item.holderId,
                        displayLocale,
                        getLocalizedField,
                    ),
            },
        );
    }
    if (
        item.state === 'lost'
    ) {
        return item.location
            .roomId
            ? formatStaticText(
                displayLocale,
                'ui.item.last_seen',
                'Last seen at {room}',
                {
                    room:
                        getRoomName
                            ? getRoomName(
                                state,
                                item.location
                                    .mapId,
                                item.location
                                    .roomId,
                            )
                            : item.location
                                .roomId,
                },
            )
            : staticText(
                displayLocale,
                'ui.item.whereabouts_unknown',
                'Whereabouts unknown',
            );
    }
    if (
        [
            'consumed',
            'destroyed',
        ].includes(item.state)
    ) {
        return mappedLabel(
            displayLocale,
            'ui.item.state',
            item.state,
            ITEM_STATE_LABELS,
        );
    }
    return item.location
        .placement &&
        item.location
            .placement !==
            'in_room'
        ? staticText(
            displayLocale,
            `ui.item.placement.${item.location.placement}`,
            item.location
                .placement,
        )
        : (
            getRoomName &&
            item.location
                .roomId
                ? getRoomName(
                    state,
                    item.location
                        .mapId,
                    item.location
                        .roomId,
                )
                : item.location
                    .roomId
        ) ||
            staticText(
                displayLocale,
                'ui.item.location_unrecorded',
                'Location unrecorded',
            );
}

export function projectItemCard(
    source,
    state,
    displayLocale =
    'zh-CN',
    {
        getLocalizedField,
        getRoomName,
    } = {},
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
    const item =
        normalizeItem(
            source,
        );
    const ownerName =
        getActorName(
            state,
            item.ownerId,
            locale,
            getLocalizedField,
        );
    const holderName =
        item.holderId
            ? getActorName(
                state,
                item.holderId,
                locale,
                getLocalizedField,
            )
            : '';
    return {
        id:
            item.id,
        type:
            item.type,
        typeLabel:
            mappedLabel(
                locale,
                'ui.item.type',
                item.type,
                ITEM_TYPE_LABELS,
            ),
        label:
            item.labelEn,
        appearance:
            item.appearanceEn ||
            staticText(
                locale,
                'ui.item.appearance_unrecorded',
                'Appearance unrecorded.',
            ),
        state:
            item.state,
        stateLabel:
            mappedLabel(
                locale,
                'ui.item.state',
                item.state,
                ITEM_STATE_LABELS,
            ),
        ownerName,
        holderName,
        ownershipLabel:
            holderName &&
            item.holderId !==
                item.ownerId
                ? formatStaticText(
                    locale,
                    'ui.item.owner_holder',
                    'Owner {owner} · Holder {holder}',
                    {
                        owner:
                            ownerName,
                        holder:
                            holderName,
                    },
                )
                : formatStaticText(
                    locale,
                    'ui.item.owner',
                    'Owner {owner}',
                    {
                        owner:
                            ownerName,
                    },
                ),
        locationLabel:
            getLocationLabel(
                item,
                state,
                locale,
                {
                    getLocalizedField,
                    getRoomName,
                },
            ),
        isEquipped:
            item.isEquipped,
        transferLabel:
            item.transferMode ===
                'none'
                ? ''
                : mappedLabel(
                    locale,
                    'ui.item.transfer',
                    item.transferMode,
                    ITEM_TRANSFER_LABELS,
                ),
        storyRoles:
            item.storyRoles.map(
                role => ({
                    id:
                        role,
                    label:
                        mappedLabel(
                            locale,
                            'ui.item.story_role',
                            role,
                            ITEM_STORY_ROLE_LABELS,
                        ),
                }),
            ),
        notes:
            item.notesEn ||
            '',
        acquiredAt:
            item.acquiredAt,
        acquiredLabel:
            item.acquiredAt
                .value
                ? `${
                    mappedLabel(
                        locale,
                        'ui.item.time',
                        item.acquiredAt
                            .precision,
                        ITEM_TIME_PRECISION_LABELS,
                    )
                } ${item.acquiredAt.value}`
                : mappedLabel(
                    locale,
                    'ui.item.time',
                    'unknown',
                    ITEM_TIME_PRECISION_LABELS,
                ),
        sourceEventId:
            item.sourceEventId,
        sourceUrl:
            item.sourceUrl,
    };
}

export function projectItemLedger(
    state,
    displayLocale =
    'zh-CN',
    options = {},
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
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
                    locale,
                    options,
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
                        staticText(
                            locale,
                            'ui.item.player',
                            'Player',
                        )
                    ),
            ) -
                Number(
                    right.ownerName !==
                        (
                            state.character
                                ?.identity
                                ?.name ||
                            staticText(
                                locale,
                                'ui.item.player',
                                'Player',
                            )
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
    displayLocale =
    'zh-CN',
    options = {},
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
                displayLocale,
                options,
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
