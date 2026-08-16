import {
    createSceneItemStates,
} from './inventory.js';

import {
    ITEM_OPERATION_VALUES,
    ITEM_PHYSICAL_FORM_VALUES,
    ITEM_PROPOSAL_SOURCE_VALUES,
    ITEM_PROPOSAL_VERSION,
    ITEM_STATE_VALUES,
    ITEM_TRANSFER_MODE_VALUES,
    inferDestroyedPhysicalForm,
    isItemOperationEvidenceGrounded,
    normalizeCurrentPresentation,
    normalizeItem,
    normalizeItemOperation,
} from './item-schema.js';

const ITEM_PROPOSAL_HISTORY_LIMIT =
    120;

function compactText(
    value,
    maximumLength = 500,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function fingerprint(
    value,
) {
    return compactText(
        value,
        600,
    )
        .toLocaleLowerCase()
        .replace(
            /[^\p{L}\p{N}]+/gu,
            '',
        )
        .slice(0, 64);
}

function stableId(
    value,
    fallback,
) {
    const normalized =
        compactText(
            value,
            80,
        )
            .toLocaleLowerCase()
            .replace(
                /[^a-z0-9_]+/gu,
                '_',
            )
            .replace(
                /^_+|_+$/gu,
                '',
            );
    return /^[a-z][a-z0-9_]{1,79}$/u
        .test(normalized)
        ? normalized
        : fallback;
}

function getHolderLocation(
    worldState,
    holderId,
) {
    if (
        !holderId ||
        holderId ===
            'player'
    ) {
        return {
            mapId:
                worldState.map
                    ?.activeMapId ||
                '',
            roomId:
                worldState.map
                    ?.currentLocalNodeId ||
                '',
        };
    }
    const holder =
        (
            worldState.actors ||
            []
        ).find(actor =>
            actor.id ===
                holderId);
    return {
        mapId:
            holder?.mapId ||
            '',
        roomId:
            holder?.roomId ||
            '',
    };
}

function removeItemFromPresentations(
    presentations,
    itemId,
    clock,
) {
    const next =
        structuredClone(
            presentations ||
            {},
        );
    Object.entries(next)
        .forEach(
            ([
                actorId,
                presentation,
            ]) => {
                const normalized =
                    normalizeCurrentPresentation(
                        presentation,
                        {
                            clock,
                        },
                    );
                const wornItemIds =
                    normalized
                        .wornItemIds
                        .filter(id =>
                            id !==
                                itemId);
                const heldItemIds =
                    normalized
                        .heldItemIds
                        .filter(id =>
                            id !==
                                itemId);
                if (
                    wornItemIds.length !==
                        normalized
                            .wornItemIds
                            .length ||
                    heldItemIds.length !==
                        normalized
                            .heldItemIds
                            .length
                ) {
                    next[actorId] = {
                        ...normalized,
                        wornItemIds,
                        heldItemIds,
                        updatedClock:
                            clock,
                    };
                }
            },
        );
    return next;
}

function addItemToPresentation(
    presentations,
    holderId,
    itemId,
    mode,
    clock,
) {
    if (!holderId) {
        return presentations;
    }
    const previous =
        normalizeCurrentPresentation(
            presentations[
                holderId
            ],
            {
                clock,
            },
        );
    const field =
        mode === 'worn'
            ? 'wornItemIds'
            : 'heldItemIds';
    return {
        ...presentations,
        [holderId]: {
            ...previous,
            [field]: [
                ...new Set([
                    ...previous[field],
                    itemId,
                ]),
            ],
            updatedClock:
                clock,
        },
    };
}

function applyPresentationOperation(
    presentations,
    before,
    after,
    operation,
    clock,
) {
    let next =
        removeItemFromPresentations(
            presentations,
            after.id,
            clock,
        );
    const sameHolder =
        before?.holderId &&
        before.holderId ===
            after.holderId;
    if (
        sameHolder &&
        operation.held ===
            undefined &&
        ![
            'place',
            'give',
            'lend',
            'consume',
            'lose',
        ].includes(
            operation.operation,
        )
    ) {
        const previous =
            normalizeCurrentPresentation(
                presentations?.[
                    before.holderId
                ],
                {
                    clock,
                },
            );
        if (
            previous.heldItemIds
                .includes(after.id)
        ) {
            next =
                addItemToPresentation(
                    next,
                    after.holderId,
                    after.id,
                    'held',
                    clock,
                );
        }
    }
    if (
        after.isEquipped &&
        after.holderId
    ) {
        next =
            addItemToPresentation(
                next,
                after.holderId,
                after.id,
                'worn',
                clock,
            );
    } else if (
        operation.held === true &&
        after.holderId &&
        ![
            'absent',
            'unknown',
        ].includes(
            after.physicalForm,
        )
    ) {
        next =
            addItemToPresentation(
                next,
                after.holderId,
                after.id,
                'held',
                clock,
            );
    }
    return next;
}

export function normalizeItemProposal(
    source,
    {
        sourceRole = 'low',
        sourceEventId = '',
        sourceMessageIds = [],
        clock = '',
        index = 0,
    } = {},
) {
    const operation =
        normalizeItemOperation(
            source?.operation ||
            source?.action,
        );
    if (!operation) {
        return null;
    }
    const itemSource =
        source?.item &&
        typeof source.item ===
            'object'
            ? source.item
            : source;
    const id =
        stableId(
            itemSource.id,
            `candidate_item_${
                index + 1
            }`,
        );
    const evidenceText =
        compactText(
            source.evidenceText ||
            itemSource
                .evidenceText,
            800,
        );
    const key =
        operation === 'acquire'
            ? `item-candidate:${id}`
            : [
                id,
                operation,
                fingerprint(
                    evidenceText ||
                    itemSource
                        .labelEn,
                ),
            ].join(':');
    return {
        version:
            ITEM_PROPOSAL_VERSION,
        key,
        id,
        operation,
        sourceRole:
            ITEM_PROPOSAL_SOURCE_VALUES
                .includes(sourceRole)
                ? sourceRole
                : 'low',
        sourceEventId:
            compactText(
                itemSource
                    .sourceEventId ||
                sourceEventId ||
                `item_proposal_${fingerprint(
                    key,
                )}`,
                160,
            ),
        sourceMessageIds: [
            ...new Set(
                sourceMessageIds
                    .map(Number)
                    .filter(
                        Number.isInteger,
                    ),
            ),
        ],
        evidenceText,
        transferMode:
            ITEM_TRANSFER_MODE_VALUES
                .includes(
                    source
                        .transferMode ||
                    itemSource
                        .transferMode,
                )
                ? source
                    .transferMode ||
                    itemSource
                        .transferMode
                : 'none',
        targetHolderId:
            compactText(
                source
                    .targetHolderId ||
                itemSource
                    .targetHolderId,
                96,
            ),
        held:
            source.held === true
                ? true
                : source.held ===
                    false
                    ? false
                    : undefined,
        location:
            source.location ||
            itemSource.location ||
            null,
        state:
            ITEM_STATE_VALUES
                .includes(
                    source.state,
                )
                ? source.state
                : '',
        physicalForm:
            ITEM_PHYSICAL_FORM_VALUES
                .includes(
                    source
                        .physicalForm ||
                    itemSource
                        .physicalForm,
                )
                ? source
                    .physicalForm ||
                    itemSource
                        .physicalForm
                : operation ===
                    'destroy'
                    ? inferDestroyedPhysicalForm(
                        evidenceText,
                    ) || 'remains'
                    : '',
        item:
            normalizeItem(
                {
                    ...itemSource,
                    id,
                    sourceEventId:
                        itemSource
                            .sourceEventId ||
                        sourceEventId,
                },
                index,
                {
                    clock,
                    sourceEventId,
                },
            ),
        createdClock:
            clock,
    };
}

export function partitionItemProposals(
    proposals,
    worldState,
    context = {},
) {
    const evidenceSources =
        (
            Array.isArray(
                context.sourceTexts,
            )
                ? context.sourceTexts
                : []
        )
            .map(value =>
                String(value || ''))
            .filter(Boolean);
    const existingItemsById =
        new Map(
            (
                worldState.items ||
                []
            ).map(item => [
                item.id,
                item,
            ]),
        );
    const existingIds =
        new Set(
            existingItemsById
                .keys(),
        );
    const decisions =
        new Set(
            (
                worldState
                    .itemProposalDecisions ||
                []
            ).map(entry =>
                entry.key),
        );
    const decidedItemIds =
        new Set(
            (
                worldState
                    .itemProposalDecisions ||
                []
            )
                .filter(entry =>
                    entry.decision ===
                        'ignored')
                .map(entry =>
                    entry.itemId)
                .filter(Boolean),
        );
    const operations = [];
    const candidates = [];
    (
        Array.isArray(proposals)
            ? proposals
            : []
    )
        .slice(0, 24)
        .forEach(
            (
                source,
                index,
            ) => {
                const proposal =
                    normalizeItemProposal(
                        source,
                        {
                            ...context,
                            index,
                        },
                    );
                if (
                    !proposal ||
                    decisions.has(
                        proposal.key,
                    ) ||
                    (
                        proposal.operation ===
                            'acquire' &&
                        decidedItemIds.has(
                            proposal.id,
                        )
                    )
                ) {
                    return;
                }
                if (
                    evidenceSources.length &&
                    (
                        !proposal
                            .evidenceText ||
                        !evidenceSources
                            .some(text =>
                                text.includes(
                                    proposal
                                        .evidenceText,
                                ))
                    )
                ) {
                    return;
                }
                if (
                    existingIds.has(
                        proposal.id,
                    )
                ) {
                    if (
                        !isItemOperationEvidenceGrounded(
                            existingItemsById
                                .get(
                                    proposal.id,
                                ),
                            proposal.operation,
                            proposal
                                .evidenceText,
                        )
                    ) {
                        return;
                    }
                    operations.push(
                        proposal,
                    );
                    return;
                }
                if (
                    proposal.operation ===
                        'acquire'
                ) {
                    const candidateSource =
                        source?.item &&
                        typeof source.item ===
                            'object'
                            ? source.item
                            : source;
                    if (
                        !String(
                            candidateSource
                                ?.labelEn ||
                            '',
                        ).trim() ||
                        !String(
                            candidateSource
                                ?.appearanceEn ||
                            candidateSource
                                ?.detailEn ||
                            '',
                        ).trim()
                        ||
                        proposal.item
                            .visibility ===
                            'hidden'
                    ) {
                        return;
                    }
                    candidates.push(
                        proposal,
                    );
                }
            },
        );
    return {
        operations,
        candidates,
    };
}

export function validateItemOperation(
    proposal,
    worldState,
    {
        allowCreate = false,
    } = {},
) {
    const errors = [];
    if (
        !proposal ||
        !ITEM_OPERATION_VALUES
            .includes(
                proposal.operation,
            )
    ) {
        return [
            '物品操作无效。',
        ];
    }
    const existing =
        (
            worldState.items ||
            []
        ).find(item =>
            item.id ===
                proposal.id);
    const validActorIds =
        new Set([
            'player',
            ...(
                worldState.actors ||
                []
            ).map(actor =>
                actor.id),
            ...(
                worldState
                    .actorLibrary ||
                []
            ).map(actor =>
                actor.id),
            ...(
                worldState.items ||
                []
            ).flatMap(item => [
                item.ownerId,
                item.holderId,
            ]),
        ].filter(Boolean));
    if (
        !existing &&
        !(
            allowCreate &&
            proposal.operation ===
                'acquire'
        )
    ) {
        errors.push(
            `物品 ${proposal.id} 尚未进入正式物品库。`,
        );
    }
    const normalizedExisting =
        existing
            ? normalizeItem(existing)
            : null;
    if (
        normalizedExisting
            ?.physicalForm ===
            'absent'
    ) {
        const replayOperation =
            normalizedExisting
                .state ===
                'consumed'
                ? 'consume'
                : 'destroy';
        if (
            proposal.operation !==
                replayOperation
        ) {
            errors.push(
                `物品 ${proposal.id} 已不存在，不能执行 ${proposal.operation}。`,
            );
        }
    }
    if (
        normalizedExisting
            ?.physicalForm ===
            'remains' &&
        ![
            'carry',
            'place',
            'give',
            'lend',
            'lose',
            'destroy',
            'damage',
            'clean',
        ].includes(
            proposal.operation,
        )
    ) {
        errors.push(
            `物品 ${proposal.id} 只剩残骸，不能执行 ${proposal.operation}。`,
        );
    }
    if (
        normalizedExisting
            ?.physicalForm ===
            'unknown' &&
        ![
            'acquire',
            'carry',
            'equip',
            'lose',
        ].includes(
            proposal.operation,
        )
    ) {
        errors.push(
            `物品 ${proposal.id} 下落未知，必须先恢复其物理存在。`,
        );
    }
    if (
        [
            'give',
            'lend',
        ].includes(
            proposal.operation,
        ) &&
        !proposal
            .targetHolderId
    ) {
        errors.push(
            `${proposal.operation} 必须指定新的持有人。`,
        );
    }
    [
        proposal.item
            ?.ownerId,
        proposal.item
            ?.holderId,
        proposal.targetHolderId,
    ]
        .filter(Boolean)
        .forEach(actorId => {
            if (
                !validActorIds.has(
                    actorId,
                )
            ) {
                errors.push(
                    `物品 ${proposal.id} 引用了未知人物 ${actorId}。`,
                );
            }
        });
    if (
        !existing &&
        proposal.item
            ?.visibility ===
            'hidden'
    ) {
        errors.push(
            `隐藏物品 ${proposal.id} 不能通过玩家候选入口创建。`,
        );
    }
    return errors;
}

function applyOneOperation(
    worldState,
    item,
    proposal,
) {
    const operation =
        proposal.operation;
    const targetHolderId =
        proposal
            .targetHolderId ||
        proposal.item?.holderId ||
        item.holderId ||
        item.ownerId;
    const holderLocation =
        getHolderLocation(
            worldState,
            targetHolderId,
        );
    const explicitLocation =
        proposal.location &&
        typeof proposal.location ===
            'object'
            ? proposal.location
            : {};
    const next = {
        ...item,
        sourceEventId:
            proposal
                .sourceEventId ||
            item.sourceEventId,
        updatedClock:
            worldState.clock,
    };
    if (
        operation === 'acquire' ||
        operation === 'carry'
    ) {
        next.holderId =
            targetHolderId;
        next.location = {
            ...holderLocation,
            placement:
                'with_holder',
        };
        next.state =
            proposal.state ||
            (
                next.state ===
                    'lost'
                    ? 'intact'
                    : next.state
            );
        if (
            next.state !==
                'destroyed'
        ) {
            next.physicalForm =
                'whole';
        }
        next.isEquipped =
            operation ===
                'acquire' &&
            proposal.item
                ?.isEquipped ===
                true;
        if (
            proposal
                .transferMode ===
                'gift'
        ) {
            next.ownerId =
                targetHolderId;
        }
        next.transferMode =
            proposal
                .transferMode;
    } else if (
        operation === 'place'
    ) {
        next.holderId = '';
        next.isEquipped =
            false;
        next.location = {
            mapId:
                compactText(
                    explicitLocation
                        .mapId ||
                    worldState.map
                        ?.activeMapId,
                    120,
                ),
            roomId:
                compactText(
                    explicitLocation
                        .roomId ||
                    worldState.map
                        ?.currentLocalNodeId,
                    120,
                ),
            placement:
                compactText(
                    explicitLocation
                        .placement ||
                    'in_room',
                    120,
                ),
        };
    } else if (
        operation === 'equip'
    ) {
        next.holderId =
            targetHolderId;
        next.location = {
            ...holderLocation,
            placement:
                'with_holder',
        };
        next.isEquipped =
            true;
        if (
            next.state ===
                'lost'
        ) {
            next.state =
                'intact';
            next.physicalForm =
                'whole';
        }
    } else if (
        operation === 'unequip'
    ) {
        next.holderId =
            targetHolderId;
        next.isEquipped =
            false;
        next.location = {
            ...holderLocation,
            placement:
                'with_holder',
        };
    } else if (
        operation === 'give' ||
        operation === 'lend'
    ) {
        next.holderId =
            targetHolderId;
        next.location = {
            ...holderLocation,
            placement:
                'with_holder',
        };
        next.isEquipped =
            false;
        next.transferMode =
            operation ===
                'give'
                ? 'gift'
                : 'loan';
        if (
            operation === 'give'
        ) {
            next.ownerId =
                targetHolderId;
        }
    } else if (
        operation === 'consume'
    ) {
        next.state =
            'consumed';
        next.physicalForm =
            'absent';
        next.holderId = '';
        next.isEquipped =
            false;
    } else if (
        operation === 'damage'
    ) {
        if (
            ![
                'consumed',
                'destroyed',
            ].includes(
                next.state,
            )
        ) {
            next.state =
                'damaged';
            next.physicalForm =
                'whole';
        }
    } else if (
        operation === 'clean'
    ) {
        if (
            next.state ===
                'dirty'
        ) {
            next.state =
                'intact';
            next.physicalForm =
                'whole';
        }
    } else if (
        operation === 'lose'
    ) {
        next.state = 'lost';
        next.physicalForm =
            'unknown';
        next.holderId = '';
        next.isEquipped =
            false;
    } else if (
        operation === 'destroy'
    ) {
        next.state =
            'destroyed';
        next.physicalForm =
            next.physicalForm ===
                'absent'
                ? 'absent'
                : ITEM_PHYSICAL_FORM_VALUES
                    .includes(
                        proposal
                            .physicalForm,
                    )
                    ? proposal
                        .physicalForm
                    : inferDestroyedPhysicalForm(
                        proposal
                            .evidenceText,
                    ) ||
                    (
                        next
                            .physicalForm ===
                            'absent'
                            ? 'absent'
                            : 'remains'
                    );
        next.isEquipped =
            false;
    }
    return normalizeItem(
        next,
        0,
        {
            clock:
                worldState.clock,
        },
    );
}

export function applyItemOperations(
    worldState,
    proposals,
    {
        allowCreate = false,
    } = {},
) {
    const next =
        structuredClone(
            worldState,
        );
    const itemsById =
        new Map(
            (
                next.items ||
                []
            ).map(
                (
                    item,
                    index,
                ) => {
                    const normalized =
                        normalizeItem(
                            item,
                            index,
                            {
                                clock:
                                    next
                                        .clock,
                            },
                        );
                    return [
                        normalized.id,
                        normalized,
                    ];
                },
            ),
        );
    next.actorPresentations ??= {};
    for (
        const proposal
        of Array.isArray(proposals)
            ? proposals
            : []
    ) {
        const errors =
            validateItemOperation(
                proposal,
                {
                    ...next,
                    items: [
                        ...itemsById
                            .values(),
                    ],
                },
                {
                    allowCreate,
                },
            );
        if (errors.length) {
            continue;
        }
        const before =
            itemsById.get(
                proposal.id,
            ) ||
            normalizeItem(
                proposal.item,
                itemsById.size,
                {
                    clock:
                        next.clock,
                    sourceEventId:
                        proposal
                            .sourceEventId,
                },
            );
        const after =
            applyOneOperation(
                next,
                before,
                proposal,
            );
        itemsById.set(
            after.id,
            after,
        );
        next.actorPresentations =
            applyPresentationOperation(
                next
                    .actorPresentations,
                before,
                after,
                proposal,
                next.clock,
            );
    }
    next.items = [
        ...itemsById.values(),
    ];
    return next;
}

export function queueItemCandidates(
    worldState,
    candidates,
) {
    const next =
        structuredClone(
            worldState,
        );
    const decisions =
        new Set(
            (
                next
                    .itemProposalDecisions ||
                []
            ).map(entry =>
                entry.key),
        );
    const decidedItemIds =
        new Set(
            (
                next
                    .itemProposalDecisions ||
                []
            )
                .filter(entry =>
                    entry.decision ===
                        'ignored')
                .map(entry =>
                    entry.itemId)
                .filter(Boolean),
        );
    const pending =
        new Map(
            (
                next
                    .pendingItemProposals ||
                []
            ).map(proposal => [
                proposal.key,
                proposal,
            ]),
        );
    (
        Array.isArray(candidates)
            ? candidates
            : []
    ).forEach(candidate => {
        if (
            !decisions.has(
                candidate.key,
            ) &&
            !decidedItemIds.has(
                candidate.id,
            )
        ) {
            pending.set(
                candidate.key,
                structuredClone(
                    candidate,
                ),
            );
        }
    });
    next.pendingItemProposals = [
        ...pending.values(),
    ].slice(-24);
    return next;
}

export function resolveItemCandidate(
    worldState,
    key,
    decision,
) {
    const candidate =
        (
            worldState
                .pendingItemProposals ||
            []
        ).find(proposal =>
            proposal.key === key);
    if (
        !candidate ||
        ![
            'accepted',
            'ignored',
        ].includes(decision)
    ) {
        return {
            state:
                worldState,
            changed:
                false,
        };
    }
    let next =
        structuredClone(
            worldState,
        );
    if (
        decision ===
            'accepted'
    ) {
        next =
            applyItemOperations(
                next,
                [
                    candidate,
                ],
                {
                    allowCreate:
                        true,
                },
            );
        if (next.scene) {
            next.scene.itemStates =
                createSceneItemStates(
                    next.items,
                    {
                        mapId:
                            next.map
                                ?.activeMapId,
                        roomId:
                            next.map
                                ?.currentLocalNodeId,
                    },
                );
        }
    }
    next.pendingItemProposals =
        (
            next
                .pendingItemProposals ||
            []
        ).filter(proposal =>
            proposal.key !== key);
    next.itemProposalDecisions = [
        ...(
            next
                .itemProposalDecisions ||
            []
        ).filter(entry =>
            entry.key !== key),
        {
            key,
            itemId:
                candidate.id,
            decision,
            decidedClock:
                next.clock,
        },
    ].slice(
        -ITEM_PROPOSAL_HISTORY_LIMIT,
    );
    return {
        state: next,
        changed: true,
        candidate,
    };
}
