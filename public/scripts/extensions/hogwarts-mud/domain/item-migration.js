import {
    CANON_ITEM_CATALOG_VERSION,
    seedCanonItems,
} from './item-canon.js';

import {
    ITEM_SYSTEM_VERSION,
    normalizeCurrentPresentation,
    normalizeItem,
} from './item-schema.js';

function migrateItems(
    worldState,
) {
    return (
        worldState.items ||
        []
    ).map(
        (
            source,
            index,
        ) => {
            const normalized =
                normalizeItem(
                    source,
                    index,
                    {
                        mapId:
                            worldState
                                .map
                                ?.activeMapId,
                        roomId:
                            worldState
                                .map
                                ?.currentLocalNodeId,
                        clock:
                            worldState
                                .clock,
                    },
                );
            return normalizeItem(
                {
                    ...normalized,
                    sourceEventId:
                        String(
                            normalized
                                .sourceEventId ||
                            'legacy_item',
                        ).startsWith(
                            'event_',
                        ) ||
                        String(
                            normalized
                                .sourceEventId ||
                            '',
                        ).startsWith(
                            'canon_',
                        ) ||
                        String(
                            normalized
                                .sourceEventId ||
                            '',
                        ).startsWith(
                            'legacy_',
                        )
                            ? normalized
                                .sourceEventId
                            : `legacy_${
                                normalized
                                    .sourceEventId ||
                                'item'
                            }`,
                },
                index,
                {
                    clock:
                        worldState
                            .clock,
                },
            );
        },
    );
}

function migratePresentations(
    worldState,
    items,
) {
    const itemsById =
        new Map(
            items.map(item => [
                item.id,
                item,
            ]),
        );
    const validItemIds =
        new Set(
            items
                .filter(item =>
                    ![
                        'absent',
                        'unknown',
                    ].includes(
                        item.physicalForm,
                    ))
                .map(item =>
                    item.id),
        );
    const wearableItemIds =
        new Set(
            items
                .filter(item =>
                    item.physicalForm ===
                        'whole')
                .map(item =>
                    item.id),
        );
    const presentations =
        Object.fromEntries(
            Object.entries(
                worldState
                    .actorPresentations ||
                {},
            ).map(
                ([
                    actorId,
                    presentation,
                ]) => {
                    const normalized =
                        normalizeCurrentPresentation(
                            presentation,
                            {
                                validItemIds,
                                clock:
                                worldState
                                    .clock,
                            },
                        );
                    return [
                        actorId,
                        {
                            ...normalized,
                            wornItemIds:
                                normalized
                                    .wornItemIds
                                    .filter(id => {
                                        const item =
                                            itemsById
                                                .get(id);
                                        return (
                                            wearableItemIds
                                                .has(id) &&
                                            item
                                                ?.holderId ===
                                                actorId
                                        );
                                    }),
                            heldItemIds:
                                normalized
                                    .heldItemIds
                                    .filter(id => {
                                        const item =
                                            itemsById
                                                .get(id);
                                        return (
                                            validItemIds
                                                .has(id) &&
                                            item
                                                ?.holderId ===
                                                actorId
                                        );
                                    }),
                        },
                    ];
                },
            ),
        );
    for (const item of items) {
        if (
            !item.isEquipped ||
            !item.holderId ||
            !wearableItemIds.has(
                item.id,
            )
        ) {
            continue;
        }
        const previous =
            normalizeCurrentPresentation(
                presentations[
                    item.holderId
                ],
                {
                    validItemIds,
                    clock:
                        worldState
                            .clock,
                },
            );
        presentations[
            item.holderId
        ] = {
            ...previous,
            wornItemIds: [
                ...new Set([
                    ...previous
                        .wornItemIds,
                    item.id,
                ]),
            ],
        };
    }
    return presentations;
}

export function migrateItemSystemState(
    worldState,
) {
    if (!worldState) {
        return {
            state:
                worldState,
            changed:
                false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const before =
        JSON.stringify({
            itemSystemVersion:
                next.itemSystemVersion,
            canonItemCatalogVersion:
                next.canonItemCatalogVersion,
            items:
                next.items,
            actorPresentations:
                next.actorPresentations,
            pendingItemProposals:
                next
                    .pendingItemProposals,
            itemProposalDecisions:
                next
                    .itemProposalDecisions,
        });
    next.items =
        migrateItems(next);
    next.items = [
        ...next.items,
        ...seedCanonItems(
            next,
        ),
    ];
    next
        .canonItemCatalogVersion =
        CANON_ITEM_CATALOG_VERSION;
    next.actorPresentations =
        migratePresentations(
            next,
            next.items,
        );
    next.pendingItemProposals =
        Array.isArray(
            next
                .pendingItemProposals,
        )
            ? next
                .pendingItemProposals
                .slice(-24)
            : [];
    next.itemProposalDecisions =
        Array.isArray(
            next
                .itemProposalDecisions,
        )
            ? next
                .itemProposalDecisions
                .slice(-120)
            : [];
    next.itemSystemVersion =
        ITEM_SYSTEM_VERSION;
    const after =
        JSON.stringify({
            itemSystemVersion:
                next.itemSystemVersion,
            canonItemCatalogVersion:
                next.canonItemCatalogVersion,
            items:
                next.items,
            actorPresentations:
                next.actorPresentations,
            pendingItemProposals:
                next
                    .pendingItemProposals,
            itemProposalDecisions:
                next
                    .itemProposalDecisions,
        });
    return {
        state: next,
        changed:
            before !== after,
    };
}
