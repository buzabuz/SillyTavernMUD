import {
    inferItemType,
    isItemOperationEvidenceGrounded,
    normalizeItem,
} from './item-schema.js';
import {
    ACTOR_LIFE_STATUS_VALUES,
} from './actor-context-schema.js';

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
export const IMPORTANT_ITEM_PATTERN =
    /(?:\b(?:wand|key|letter|journal|diary|map|permit|token|ring|ribbon|glasses|spectacles|amulet|artifact|heirloom|keepsake|clue|autograph|signed parchment)\b|魔杖|钥匙|信件|日记|地图|许可证|信物|戒指|丝带|眼镜|护符|魔法物品|传家宝|纪念品|线索|签名|签名羊皮纸)/i;
export const ORDINARY_TRANSIENT_ITEM_PATTERN =
    /(?:\b(?:food|meal|snack|sweet|toffee|pasty|tart|drink|wrapper|receipt)\b|食物|饭|零食|糖果|太妃糖|馅饼|饮料|包装|收据)/i;
export const DURABLE_ACQUISITION_PATTERN =
    /(?:\b(?:belongs? to|became .{0,24}(?:property|possession)|bought|purchased|received|accepted|acquired|was given|was handed|purchase (?:is|was) complete|fitting (?:is|was) resolved|has chosen)\b|归.+所有|买下|购买完成|得到|收下|交给|正式获得|认主|选择了)/i;
export const PLAYER_KEEP_ITEM_PATTERN =
    /(?:保留|收好|带上|随身|装进|放进(?:包|口袋)|拿走|留着|keep|save|carry|take (?:it|this|the)|put (?:it|this|the) (?:away|in)|hold on to)/i;

function inferItemImportance(
    item = {},
) {
    if (ITEM_IMPORTANCE_VALUES.includes(
        item.importance,
    )) {
        return item.importance;
    }
    const text = [
        item.id,
        item.labelEn,
        item.label,
        item.detailEn,
        item.detail,
    ].filter(Boolean).join(' ');
    if (IMPORTANT_ITEM_PATTERN.test(text)) {
        return 'key';
    }
    return 'ordinary';
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
            appearance:
                item.appearance ||
                item.detail,
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
            const candidateText = [
                observed.labelEn,
                observed.labelZh,
                observed.appearanceEn,
                observed.appearanceZh,
                observed.detailEn,
                observed.detailZh,
            ]
                .filter(Boolean)
                .join(' ');
            const candidateType =
                observed.type ||
                inferItemKind(
                    observed,
                );
            const evidenceType =
                inferItemKind(
                    evidence,
                );
            const normalizedEvidence =
                evidence
                    .normalize('NFKC')
                    .toLocaleLowerCase();
            const labelMentioned =
                [
                    observed.labelEn,
                    observed.labelZh,
                ]
                    .map(value =>
                        String(
                            value ||
                            '',
                        )
                            .normalize(
                                'NFKC',
                            )
                            .toLocaleLowerCase()
                            .trim())
                    .filter(value =>
                        value.length >= 2)
                    .some(value =>
                        normalizedEvidence
                            .includes(
                                value,
                            ));
            const typedMention =
                candidateType !==
                    'other' &&
                candidateType ===
                    evidenceType;
            const explicitlyKept =
                PLAYER_KEEP_ITEM_PATTERN
                    .test(evidence);
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
                IMPORTANT_ITEM_PATTERN
                    .test(candidateText) ||
                explicitlyKept ||
                explicitTransfer;
            if (
                !meaningful ||
                !(
                    labelMentioned ||
                    typedMention
                ) ||
                (
                    ORDINARY_TRANSIENT_ITEM_PATTERN
                        .test(
                            candidateText,
                        ) &&
                    !explicitlyKept &&
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
        seenIds.add(
            observed.id,
        );
        const ownerId =
            validHolderIds.has(
                observed.ownerId,
            )
                ? observed.ownerId
                : 'player';
        const holderId =
            validHolderIds.has(
                observed.holderId,
            )
                ? observed.holderId
                : ownerId;
        projected.push({
            id:
                observed.id,
            operation:
                observed.operation ||
                observed.action,
            type:
                observed.type ||
                inferItemKind(
                    observed,
                ),
            labelEn:
                String(
                    observed.labelEn ||
                    '',
                ).trim(),
            label:
                String(
                    observed.labelZh ||
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
            appearance:
                String(
                    observed
                        .appearanceZh ||
                    observed.detailZh ||
                    observed.detailEn ||
                    '',
                ).trim(),
            ownerId,
            holderId,
            targetHolderId:
                validHolderIds.has(
                    observed
                        .targetHolderId,
                )
                    ? observed
                        .targetHolderId
                    : '',
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
    chat = [],
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
    const recentMessages =
        (
            Array.isArray(chat)
                ? chat
                : []
        ).slice(-12);
    const playerText =
        recentMessages
            .filter(message =>
                message?.is_user)
            .map(message =>
                String(
                    message.mes ||
                    '',
                ))
            .join('\n');
    const narrativeText =
        recentMessages
            .flatMap(message =>
                (
                    message?.extra
                        ?.hogwartsMud
                        ?.turnTransaction
                        ?.segments ||
                    []
                ).map(segment =>
                    String(
                        segment.textEn ||
                        '',
                    )))
            .join('\n');
    const claimsAutograph =
        /(?:拿起.{0,16}签名|拿到.{0,16}签名|带着.{0,16}签名|收下.{0,16}签名|\b(?:took|picked up|kept|carried|received).{0,32}\bautograph\b)/iu
            .test(playerText);
    const confirmsAutograph =
        /(?:\b(?:signed parchment|autograph|crooked H)\b|签名羊皮纸|签下.{0,12}H|签名)/iu
            .test(narrativeText);
    const existingAutograph =
        (
            next.items ||
            []
        ).some(item =>
            /(?:autograph|signed_parchment|签名)/iu
                .test(
                    `${item.id || ''} ${item.labelEn || ''} ${item.label || ''}`,
                ));
    if (
        claimsAutograph &&
        confirmsAutograph &&
        !existingAutograph
    ) {
        const harry =
            (
                next.actorLibrary ||
                []
            ).find(actor =>
                actor.id ===
                    'canon_harry_james_potter');
        next.items = [
            ...(
                next.items ||
                []
            ),
            normalizeInventoryItem(
                {
                    id:
                        'harry_signed_parchment',
                    labelEn:
                        'Harry Potter Autograph',
                    label:
                        '哈利·波特的签名',
                    detailEn:
                        'Lavender Brown\'s Sorting notes parchment bearing Harry Potter\'s crooked H autograph.',
                    detail:
                        '拉文德·布朗的分院笔记羊皮纸，上面留着哈利·波特歪歪扭扭的 H 签名。',
                    kind: 'other',
                    importance:
                        'important',
                    custody:
                        'carried',
                    ownerId:
                        'player',
                    source:
                        'local_semantic_migration',
                    acquiredClock:
                        next.clock,
                    updatedClock:
                        next.clock,
                    actorId:
                        harry?.id ||
                        'canon_harry_james_potter',
                },
                (
                    next.items ||
                    []
                ).length,
                {
                    mapId:
                        next.map
                            ?.activeMapId,
                    roomId:
                        next.map
                            ?.currentLocalNodeId,
                    clock:
                        next.clock,
                },
            ),
        ];
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
    const recentTransactions = (chat || [])
        .slice(-24)
        .map(message =>
            message?.extra?.hogwartsMud
                ?.turnTransaction)
        .filter(Boolean);
    const recentText = JSON.stringify(
        recentTransactions,
    );
    const hasOwnedWand =
        next.items.some(item =>
            /(?:wand|魔杖)/i.test(
                `${item.id} ${item.labelEn} ${item.label}`,
            ) &&
            !['consumed', 'lost'].includes(
                item.custody,
            ));
    if (
        !hasOwnedWand &&
        /(?:holly wand|冬青.{0,8}魔杖)/i
            .test(recentText) &&
        /(?:belongs? to Tina|wand fitting is resolved|has chosen Tina|seven Galleons|归蒂娜所有|选择了蒂娜)/i
            .test(recentText)
    ) {
        next.items.push(
            normalizeInventoryItem({
                id: 'holly_phoenix_wand',
                labelEn:
                    'Holly Wand',
                label: '冬青木魔杖',
                detailEn:
                    'Twelve and a quarter inches, phoenix feather core; chosen Tina at Ollivanders.',
                detail:
                    '十二又四分之一英寸，凤凰羽毛杖芯；在奥利凡德魔杖店选择了蒂娜。',
                importance: 'key',
                custody: 'carried',
                ownerId: 'player',
                source:
                    'legacy_turn_recovery',
            }, next.items.length, defaults),
        );
    }
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
