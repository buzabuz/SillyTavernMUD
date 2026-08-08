// Extracted from the helpers compatibility facade for Task 4.

import {
    DURABLE_ACQUISITION_PATTERN,
    IMPORTANT_ITEM_PATTERN,
    inferItemKind,
    ITEM_CUSTODY_VALUES,
    ITEM_IMPORTANCE_VALUES,
    normalizeInventoryItem,
    ORDINARY_TRANSIENT_ITEM_PATTERN,
    PLAYER_KEEP_ITEM_PATTERN,
} from './inventory.js';
import {
    applyItemOperations,
    normalizeItemProposal,
} from './item-reducer.js';
import {
    ITEM_OPERATION_VALUES,
    normalizeItemOperation,
} from './item-schema.js';

import {
    LOCALIZED_TEMPORARY_ACTOR_KEYS,
    PACING_TEMPORARY_ACTOR_KEYS,
} from './pacing-validation.js';

export function validateItemUpdates(
    itemUpdates,
    worldState,
    playerAction = '',
    narrativeText = '',
    {
        requireNarrativeAcquisition = true,
    } = {},
) {
    const errors = [];
    if (!Array.isArray(itemUpdates)) {
        return ['itemUpdates 必须是数组。'];
    }
    const existingItems = new Map(
        (worldState.items || []).map(item => [
            item.id,
            normalizeInventoryItem(item),
        ]),
    );
    const seenIds = new Set();
    const allowedActions =
        new Set([
            ...ITEM_OPERATION_VALUES,
            'update',
            'store',
        ]);
    itemUpdates.forEach(update => {
        if (!update ||
            typeof update !== 'object' ||
            Array.isArray(update)) {
            errors.push('物品更新必须是对象。');
            return;
        }
        if (!/^[a-z][a-z0-9_]{1,79}$/.test(
            String(update.id || ''),
        ) || seenIds.has(update.id)) {
            errors.push(
                `物品更新 ${update.id || '?'} 的 ID 无效或重复。`,
            );
        }
        seenIds.add(update.id);
        const operation =
            normalizeItemOperation(
                update.operation ||
                update.action,
            );
        if (
            !allowedActions.has(
                update.action,
            ) &&
            !operation
        ) {
            errors.push(
                `物品 ${update.id || '?'} 的 action 无效。`,
            );
        }
        const existing =
            existingItems.get(update.id);
        if (
            operation !== 'acquire' &&
            !existing
        ) {
            errors.push(
                `物品 ${update.id || '?'} 尚未入栏，不能执行 ${update.action || '?'}。`,
            );
        }
        if (operation === 'acquire') {
            if (
                !String(
                    update.labelEn || '',
                ).trim() ||
                !String(
                    update.appearanceEn ||
                    update.detailEn ||
                    '',
                ).trim()
            ) {
                errors.push(
                    `新物品 ${update.id || '?'} 缺少 labelEn 或 detailEn。`,
                );
            }
            if (
                update.importance &&
                !ITEM_IMPORTANCE_VALUES
                    .includes(
                        update.importance,
                    )
            ) {
                errors.push(
                    `新物品 ${update.id || '?'} 的 importance 无效。`,
                );
            }
            if (
                update.custody &&
                !ITEM_CUSTODY_VALUES
                    .includes(
                        update.custody,
                    )
            ) {
                errors.push(
                    `新物品 ${update.id || '?'} 的 custody 无效。`,
                );
            }
            const itemText = [
                update.labelEn,
                update.detailEn,
            ].filter(Boolean).join(' ');
            if (
                update.importance ===
                    'ordinary' &&
                ORDINARY_TRANSIENT_ITEM_PATTERN
                    .test(itemText) &&
                !PLAYER_KEEP_ITEM_PATTERN.test(
                    playerAction,
                )
            ) {
                errors.push(
                    `普通消耗品 ${update.id || '?'} 只有在玩家明确要求保留或携带时才能进入物品栏。`,
                );
            }
        }
    });

    const acquiredImportant =
        IMPORTANT_ITEM_PATTERN.test(
            narrativeText,
        ) &&
        DURABLE_ACQUISITION_PATTERN.test(
            narrativeText,
        );
    if (
        requireNarrativeAcquisition &&
        acquiredImportant
    ) {
        const kind =
            inferItemKind(narrativeText);
        const alreadyTracked =
            [...existingItems.values()].some(item =>
                item.kind === kind &&
                !['consumed', 'lost'].includes(
                    item.custody,
                ));
        const submitted =
            itemUpdates.some(update =>
                normalizeItemOperation(
                    update.operation ||
                    update.action,
                ) === 'acquire' &&
                inferItemKind(update) === kind &&
                ['key', 'important'].includes(
                    update.importance,
                ));
        if (!alreadyTracked && !submitted) {
            errors.push(
                `本回合已明确获得重要物品（${kind}），必须提交 acquire itemUpdate。`,
            );
        }
    }
    return errors;
}

export function applyItemUpdates(
    worldState,
    itemUpdates = [],
) {
    const proposals =
        (
            Array.isArray(
                itemUpdates,
            )
                ? itemUpdates
                : []
        )
            .map(
                (
                    update,
                    index,
                ) =>
                    normalizeItemProposal(
                        update,
                        {
                            sourceRole:
                                'low',
                            sourceEventId:
                                `legacy_item_update_${
                                    index + 1
                                }`,
                            clock:
                                worldState
                                    .clock,
                            index,
                        },
                    ),
            )
            .filter(Boolean);
    return applyItemOperations(
        worldState,
        proposals,
        {
            allowCreate:
                true,
        },
    ).items;
}

export function validateActorPresenceResolution(
    actorPresence,
    worldState,
    actorUpdates,
    {
        required = false,
        authorizedEntranceIds = [],
    } = {},
) {
    const errors = [];
    if (actorPresence == null) {
        if (required) {
            errors.push(
                '低档每轮必须提交完整的回合结束在场人物名单。',
            );
        }
        return errors;
    }
    if (
        typeof actorPresence !== 'object' ||
        Array.isArray(actorPresence) ||
        !Array.isArray(
            actorPresence
                .presentActorIdsAfterTurn,
        )
    ) {
        return [
            'actorPresence 必须包含 presentActorIdsAfterTurn 数组。',
        ];
    }
    const actorIdsAfterTurn =
        actorPresence
            .presentActorIdsAfterTurn
            .map(String);
    const presentAfterTurn = new Set(
        actorIdsAfterTurn,
    );
    if (
        presentAfterTurn.size !==
        actorIdsAfterTurn.length
    ) {
        errors.push(
            '回合结束在场人物名单不能包含重复人物。',
        );
    }
    const initiallyPresent = new Set(
        (worldState.actors || [])
            .filter(actor =>
                actor.present !== false)
            .map(actor =>
                actor.id),
    );
    const authorizedPresent =
        new Set([
            ...initiallyPresent,
            ...authorizedEntranceIds,
        ]);
    actorIdsAfterTurn.forEach(actorId => {
        if (!authorizedPresent.has(actorId)) {
            errors.push(
                `回合结束在场人物名单包含未授权入场人物 ${actorId}。`,
            );
        }
    });
    const updatesByActor = new Map(
        (
            Array.isArray(actorUpdates)
                ? actorUpdates
                : []
        ).map(update => [
            update.id,
            update,
        ]),
    );
    initiallyPresent.forEach(actorId => {
        if (presentAfterTurn.has(actorId)) {
            return;
        }
        const update =
            updatesByActor.get(actorId);
        if (
            !update ||
            update.present !== false ||
            !String(
                update.currentActivityEn ||
                '',
            ).trim()
        ) {
            errors.push(
                `离场人物 ${actorId} 必须提交 present:false 和离场后的当前活动。`,
            );
        }
    });
    authorizedEntranceIds.forEach(
        actorId => {
            const update =
                updatesByActor.get(actorId);
            if (
                !update ||
                typeof update.present !==
                    'boolean' ||
                update.present !==
                    presentAfterTurn.has(
                        actorId,
                    ) ||
                !String(
                    update
                        .currentActivityEn ||
                    '',
                ).trim()
            ) {
                errors.push(
                    `临时入场人物 ${actorId} 必须提交与最终在场状态一致的 present 和当前活动。`,
                );
            }
        },
    );
    updatesByActor.forEach(
        (update, actorId) => {
            if (
                update.present !==
                    undefined &&
                update.present !==
                    presentAfterTurn.has(actorId)
            ) {
                errors.push(
                    `人物 ${actorId} 的 present 与回合结束在场名单不一致。`,
                );
            }
        },
    );
    return errors;
}

export function validateTemporaryActorEntrances(
    entrances,
    worldState,
    {
        allowLocalizedDisplayFields =
        false,
    } = {},
) {
    const errors = [];
    if (!Array.isArray(entrances)) {
        return {
            valid: false,
            errors: [
                'temporaryActorEntrances 必须是数组。',
            ],
            ids: [],
        };
    }
    if (entrances.length > 2) {
        errors.push(
            '单轮最多引入两名场景临时人物。',
        );
    }
    const existingIds = new Set([
        ...(worldState.actorLibrary || [])
            .map(actor => actor.id),
        ...(worldState.actors || [])
            .map(actor => actor.id),
    ]);
    const ids = new Set();
    entrances.forEach(actor => {
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(String(actor?.id || '')) ||
            existingIds.has(actor?.id) ||
            ids.has(actor?.id)
        ) {
            errors.push(
                `临时入场人物 ${actor?.id || '?'} 的 ID 无效、重复或已存在。`,
            );
        }
        PACING_TEMPORARY_ACTOR_KEYS
            .forEach(key => {
                if (!String(
                    actor?.[key] || '',
                ).trim()) {
                    errors.push(
                        `临时入场人物 ${actor?.id || '?'} 缺少 ${key}。`,
                    );
                }
            });
        const unauthorized =
            Object.keys(actor || {})
                .filter(key =>
                    !PACING_TEMPORARY_ACTOR_KEYS
                        .has(key) &&
                    (
                        !allowLocalizedDisplayFields ||
                        !LOCALIZED_TEMPORARY_ACTOR_KEYS
                            .has(key)
                    ));
        if (unauthorized.length) {
            errors.push(
                `临时入场人物不得写入字段：${unauthorized.join(', ')}。`,
            );
        }
        ids.add(actor?.id);
    });
    return {
        valid: errors.length === 0,
        errors,
        ids: [...ids].filter(Boolean),
    };
}

export function recoverImplicitTemporaryActorEntrances(
    payload,
    worldState,
) {
    const recovered =
        structuredClone(payload);
    const declared =
        Array.isArray(
            recovered
                ?.temporaryActorEntrances,
        )
            ? recovered
                .temporaryActorEntrances
            : [];
    recovered.temporaryActorEntrances =
        declared;
    if (
        declared.length >= 2 ||
        !Array.isArray(
            recovered?.segments,
        ) ||
        !Array.isArray(
            recovered?.actorUpdates,
        )
    ) {
        return recovered;
    }
    const reservedIds = new Set([
        ...(
            worldState.actorLibrary ||
            []
        ).map(actor => actor.id),
        ...(
            worldState.actors ||
            []
        ).map(actor => actor.id),
        ...declared.map(actor =>
            actor.id),
    ]);
    const dialogueActorIds =
        new Set(
            recovered.segments
                .filter(segment =>
                    segment.type ===
                        'dialogue')
                .map(segment =>
                    segment.actorId)
                .filter(Boolean),
        );
    const updatesById =
        new Map(
            recovered.actorUpdates
                .filter(update =>
                    update?.present !==
                        false &&
                    String(
                        update
                            ?.currentActivityEn ||
                        '',
                    ).trim())
                .map(update => [
                    update.id,
                    update,
                ]),
        );
    const suppliedPresentIds =
        Array.isArray(
            recovered
                ?.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? new Set(
                recovered
                    .actorPresence
                    .presentActorIdsAfterTurn,
            )
            : null;
    const recoverableIds = [
        ...dialogueActorIds,
    ].filter(actorId =>
        /^[a-z][a-z0-9_]{2,79}$/
            .test(
                String(actorId || ''),
            ) &&
        !reservedIds.has(actorId) &&
        updatesById.has(actorId) &&
        (
            !suppliedPresentIds ||
            suppliedPresentIds
                .has(actorId)
        ))
        .slice(
            0,
            2 - declared.length,
        );
    recoverableIds.forEach(actorId => {
        const update =
            updatesById.get(actorId);
        const publicLabel =
            String(actorId)
                .split('_')
                .filter(Boolean)
                .map(word =>
                    word.charAt(0)
                        .toLocaleUpperCase() +
                    word.slice(1))
                .join(' ');
        recovered
            .temporaryActorEntrances
            .push({
                id: actorId,
                nameEn:
                    publicLabel ||
                    'Unnamed Scene Acquaintance',
                roleEn:
                    'Previously unnamed scene acquaintance',
                publicDescriptionEn:
                    'A person in the current scene whom the player has directly engaged; further identity details remain unrevealed.',
                personalityEn:
                    'Not yet established beyond the observable interaction.',
                speechStyleEn:
                    'Defined only by dialogue already rendered in this turn.',
                currentActivityEn:
                    update
                        .currentActivityEn,
            });
    });
    return recovered;
}
