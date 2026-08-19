import {
    inferItemType,
    isItemOperationEvidenceGrounded,
    normalizeItem,
} from './item-schema.js';
import {
    ACTOR_LIFE_STATUS_VALUES,
} from './actor-context-schema.js';
import {
    isEnglishAuthorityText,
} from './model-language-adoption.js';

export {
    ACTOR_LIFE_STATUS_VALUES,
};

export const ENTITY_STATE_VERSION = 2;
export const OBSERVED_INVENTORY_VERSION = 1;
export const ITEM_IMPORTANCE_VALUES = Object.freeze([
    'key',
    'important',
    'ordinary',
]);
export const ITEM_CUSTODY_VALUES = Object.freeze([
    'carried',
    'equipped',
    'stored',
    'consumed',
    'lost',
]);

function inferItemImportance(
    item = {},
) {
    if (ITEM_IMPORTANCE_VALUES.includes(
        item.importance,
    )) {
        return item.importance;
    }
    return (
        item.storyRoles ||
        []
    ).length
        ? 'important'
        : 'ordinary';
}

export function inferItemKind(
    value,
) {
    return inferItemType(value);
}

export function normalizeInventoryItem(
    item = {},
    index = 0,
    defaults = {},
) {
    const importance = inferItemImportance(item);
    return normalizeItem(
        {
            ...item,
            type:
                item.type ||
                item.kind ||
                inferItemKind(
                    item,
                ),
            appearanceEn:
                item.appearanceEn ||
                item.detailEn,
            importance,
        },
        index,
        {
            ...defaults,
            sourceEventId:
                defaults
                    .sourceEventId ||
                defaults.source,
        },
    );
}

export function synchronizeHeldItemLocations(
    items = [],
    {
        playerMapId = '',
        playerRoomId = '',
        actors = [],
        holderIds = null,
        clock = '',
    } = {},
) {
    const allowedHolders =
        holderIds === null
            ? null
            : new Set(
                holderIds,
            );
    const actorLocations =
        new Map(
            (
                actors ||
                []
            ).map(actor => [
                actor.id,
                {
                    mapId:
                        actor.mapId ||
                        '',
                    roomId:
                        actor.roomId ||
                        '',
                },
            ]),
        );
    actorLocations.set(
        'player',
        {
            mapId:
                playerMapId,
            roomId:
                playerRoomId,
        },
    );
    return (
        items ||
        []
    ).map(
        (
            source,
            index,
        ) => {
            const item =
                normalizeInventoryItem(
                    source,
                    index,
                    {
                        clock,
                    },
                );
            if (
                !item.holderId ||
                (
                    allowedHolders &&
                    !allowedHolders.has(
                        item.holderId,
                    )
                )
            ) {
                return item;
            }
            const location =
                actorLocations.get(
                    item.holderId,
                );
            if (
                !location?.mapId ||
                !location?.roomId ||
                (
                    item.location
                        .mapId ===
                        location.mapId &&
                    item.location
                        .roomId ===
                        location.roomId &&
                    item.location
                        .placement ===
                        'with_holder'
                )
            ) {
                return item;
            }
            return normalizeInventoryItem(
                {
                    ...item,
                    location: {
                        ...location,
                        placement:
                            'with_holder',
                    },
                    updatedClock:
                        clock ||
                        item.updatedClock,
                },
                index,
                {
                    clock,
                },
            );
        },
    );
}

export function projectObservedInventoryUpdates(
    observedUpdates,
    worldState,
    playerAction,
    narrativeText,
) {
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
    const validHolderIds =
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
        ]);
    const allowedActions =
        new Set([
            'acquire',
            'carry',
            'place',
            'equip',
            'unequip',
            'give',
            'lend',
            'consume',
            'damage',
            'clean',
            'lose',
            'destroy',
        ]);
    const projected = [];
    const seenIds =
        new Set();
    for (
        const observed
        of Array.isArray(
            observedUpdates,
        )
            ? observedUpdates
            : []
    ) {
        if (
            !observed ||
            Number(
                observed.confidence ||
                0,
            ) < 0.65 ||
            !allowedActions.has(
                observed.operation ||
                observed.action,
            ) ||
            !/^[a-z][a-z0-9_]{1,79}$/u
                .test(
                    String(
                        observed.id ||
                        '',
                    ),
                ) ||
            seenIds.has(
                observed.id,
            )
        ) {
            continue;
        }
        const sourceText =
            observed.sourceKind ===
                'player'
                ? String(
                    playerAction ||
                    '',
                )
                : String(
                    narrativeText ||
                    '',
                );
        const evidence =
            String(
                observed.evidenceText ||
                '',
            ).trim();
        if (
            !evidence ||
            !sourceText.includes(
                evidence,
            )
        ) {
            continue;
        }
        const observedLabelEn =
            String(
                observed.labelEn ||
                '',
            ).trim();
        const observedAppearanceEn =
            String(
                observed.appearanceEn ||
                observed.detailEn ||
                '',
            ).trim();
        if (
            (
                observedLabelEn &&
                !isEnglishAuthorityText(
                    observedLabelEn,
                )
            ) ||
            (
                observedAppearanceEn &&
                !isEnglishAuthorityText(
                    observedAppearanceEn,
                )
            )
        ) {
            continue;
        }
        const existing =
            existingIds.has(
                observed.id,
            );
        const existingItem =
            existingItemsById.get(
                observed.id,
            );
        if (
            existing &&
            !isItemOperationEvidenceGrounded(
                existingItem,
                observed.operation ||
                    observed.action,
                evidence,
                observed
                    .evidenceItemText,
            )
        ) {
            continue;
        }
        if (
            !existing &&
            (
                (
                    observed.operation ||
                    observed.action
                ) !==
                    'acquire' ||
                !String(
                    observed.labelEn ||
                    '',
                ).trim() ||
                !String(
                    observed
                        .appearanceEn ||
                    observed.detailEn ||
                    '',
                ).trim()
            )
        ) {
            continue;
        }
        if (!existing) {
            const candidateType =
                observed.type ||
                'other';
            const explicitTransfer =
                [
                    'gift',
                    'loan',
                    'theft',
                    'return',
                ].includes(
                    observed
                        .transferMode,
                );
            const meaningful =
                (
                    observed.storyRoles ||
                    []
                ).length > 0 ||
                explicitTransfer;
            if (
                !meaningful ||
                (
                    candidateType ===
                        'consumable' &&
                    !explicitTransfer &&
                    !(
                        observed
                            .storyRoles ||
                        []
                    ).length
                )
            ) {
                continue;
            }
        }
        const ownerId =
            observed.ownerId ||
            existingItem?.ownerId ||
            'player';
        const holderId =
            observed.holderId ||
            existingItem?.holderId ||
            ownerId;
        const targetHolderId =
            observed.targetHolderId ||
            '';
        if (
            !validHolderIds.has(
                ownerId,
            ) ||
            !validHolderIds.has(
                holderId,
            ) ||
            (
                targetHolderId &&
                !validHolderIds.has(
                    targetHolderId,
                )
            ) ||
            (
                !existing &&
                (
                    !observed.ownerId ||
                    !observed.holderId
                )
            )
        ) {
            continue;
        }
        seenIds.add(
            observed.id,
        );
        projected.push({
            id:
                observed.id,
            operation:
                observed.operation ||
                observed.action,
            type:
                observed.type ||
                'other',
            labelEn:
                String(
                    observed.labelEn ||
                    '',
                ).trim(),
            appearanceEn:
                String(
                    observed
                        .appearanceEn ||
                    observed.detailEn ||
                    '',
                ).trim(),
            ownerId,
            holderId,
            targetHolderId:
                targetHolderId,
            transferMode:
                observed
                    .transferMode ||
                'none',
            storyRoles:
                observed
                    .storyRoles ||
                [],
            visibility:
                observed.visibility ||
                (
                    ownerId ===
                        'player'
                        ? 'public'
                        : 'owner_known'
                ),
            isEquipped:
                observed
                    .isEquipped ===
                true,
            held:
                observed.held ===
                true,
            sourceKind:
                observed
                    .sourceKind,
            evidenceText:
                evidence,
            evidenceItemText:
                String(
                    observed
                        .evidenceItemText ||
                    '',
                ).trim(),
            physicalForm:
                observed.physicalForm ||
                '',
            confidence:
                Number(
                    observed
                        .confidence ||
                    0,
                ),
        });
    }
    return projected;
}

export function migrateObservedInventoryState(
    worldState,
) {
    if (
        Number(
            worldState
                .observedInventoryVersion ||
            0,
        ) >=
        OBSERVED_INVENTORY_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    next.observedInventoryVersion =
        OBSERVED_INVENTORY_VERSION;
    return {
        state: next,
        changed: true,
    };
}

export function createSceneItemStates(
    items = [],
    {
        mapId = '',
        roomId = '',
    } = {},
) {
    return (items || [])
        .map((item, index) =>
            normalizeInventoryItem(
                item,
                index,
                { mapId, roomId },
            ))
        .filter(item =>
            [
                'whole',
                'remains',
            ].includes(
                item.physicalForm,
            ))
        .map(normalized => {
            const followsPlayer = [
                'carried',
                'equipped',
            ].includes(normalized.custody) &&
                normalized.holderId === 'player';
            return {
                id: normalized.id,
                version:
                    normalized.version,
                type:
                    normalized.type,
                custody: normalized.custody,
                ownerId: normalized.ownerId,
                holderId:
                    normalized.holderId,
                mapId: followsPlayer
                    ? mapId
                    : normalized.mapId,
                roomId: followsPlayer
                    ? roomId
                    : normalized.roomId,
                status: normalized.status,
                state:
                    normalized.state,
                physicalForm:
                    normalized.physicalForm,
                isEquipped:
                    normalized.isEquipped,
            };
        });
}

export function normalizeActorLifeState(
    actor = {},
) {
    const lifeStatus =
        ACTOR_LIFE_STATUS_VALUES.includes(
            actor.lifeStatus,
        )
            ? actor.lifeStatus
            : 'alive';
    const permanent =
        lifeStatus === 'dead'
            ? actor.lifeStatusPermanent !==
                false
            : Boolean(
                actor.lifeStatusPermanent,
            );
    return {
        ...actor,
        lifeStatus,
        lifeStatusPermanent: permanent,
        lifeStatusDetailEn: String(
            actor.lifeStatusDetailEn ||
            actor.lifeStatusDetail ||
            (
                lifeStatus === 'alive'
                    ? 'Alive.'
                    : ''
            ),
        ).trim(),
        lifeStatusDetail: String(
            actor.lifeStatusDetail ||
            actor.lifeStatusDetailEn ||
            (
                lifeStatus === 'alive'
                    ? '存活。'
                    : ''
            ),
        ).trim(),
        lifeStatusSinceClock:
            actor.lifeStatusSinceClock || '',
        present:
            lifeStatus === 'dead'
                ? false
                : actor.present,
    };
}

export function migrateEntityState(
    worldState,
    chat = [],
) {
    if (!worldState ||
        Number(worldState.entityStateVersion || 0) >=
            ENTITY_STATE_VERSION) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next = structuredClone(worldState);
    const defaults = {
        mapId: next.map?.activeMapId || '',
        roomId:
            next.map?.currentLocalNodeId || '',
        clock: next.clock || '',
    };
    next.items = (next.items || []).map(
        (item, index) =>
            normalizeInventoryItem(
                item,
                index,
                defaults,
            ),
    );
    next.actors = (next.actors || [])
        .map(normalizeActorLifeState);
    next.actorLibrary =
        (next.actorLibrary || []).map(profile => {
            const actor = next.actors.find(
                item => item.id === profile.id,
            );
            return {
                ...profile,
                lifeStatus:
                    actor?.lifeStatus ||
                    profile.lifeStatus ||
                    'alive',
                lifeStatusPermanent:
                    actor
                        ?.lifeStatusPermanent ||
                    Boolean(
                        profile
                            .lifeStatusPermanent,
                    ),
                lifeStatusDetailEn:
                    actor
                        ?.lifeStatusDetailEn ||
                    profile
                        .lifeStatusDetailEn ||
                    'Alive.',
                lifeStatusDetail:
                    actor
                        ?.lifeStatusDetail ||
                    profile
                        .lifeStatusDetail ||
                    '存活。',
                lifeStatusSinceClock:
                    actor
                        ?.lifeStatusSinceClock ||
                    profile
                        .lifeStatusSinceClock ||
                    '',
            };
        });
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                defaults,
            );
    }
    next.entityStateVersion =
        ENTITY_STATE_VERSION;
    return {
        state: next,
        changed: true,
    };
}
