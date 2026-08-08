import {
    normalizeMemoryId,
} from './stable-identity.js';

export const ENTITY_STATE_VERSION = 1;
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
export const ACTOR_LIFE_STATUS_VALUES = Object.freeze([
    'alive',
    'injured',
    'incapacitated',
    'missing',
    'dead',
]);
export const IMPORTANT_ITEM_PATTERN =
    /(?:\b(?:wand|key|letter|journal|diary|map|permit|token|ring|amulet|artifact|heirloom|autograph|signed parchment)\b|魔杖|钥匙|信件|日记|地图|许可证|信物|戒指|护符|魔法物品|传家宝|签名|签名羊皮纸)/i;
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
    const text = typeof value === 'string'
        ? value
        : [
            value?.id,
            value?.labelEn,
            value?.label,
            value?.detailEn,
            value?.detail,
        ].filter(Boolean).join(' ');
    const kinds = [
        ['wand', /(?:\bwand\b|魔杖)/i],
        ['key', /(?:\bkey\b|钥匙)/i],
        ['letter', /(?:\bletter\b|信件|通知书)/i],
        ['journal', /(?:\b(?:journal|diary)\b|日记)/i],
        ['map', /(?:\bmap\b|地图)/i],
        ['permit', /(?:\bpermit\b|许可证)/i],
        ['token', /(?:\btoken\b|信物)/i],
        ['jewellery', /(?:\b(?:ring|amulet)\b|戒指|护符)/i],
    ];
    return kinds.find(([, pattern]) =>
        pattern.test(text))?.[0] ||
        'other';
}

export function normalizeInventoryItem(
    item = {},
    index = 0,
    defaults = {},
) {
    const importance = inferItemImportance(item);
    const custody =
        ITEM_CUSTODY_VALUES.includes(item.custody)
            ? item.custody
            : importance === 'ordinary'
                ? 'stored'
                : 'carried';
    const ownerId = String(
        item.ownerId ||
        defaults.ownerId ||
        'player',
    ).trim();
    const activeWithOwner = [
        'carried',
        'equipped',
    ].includes(custody);
    return {
        ...item,
        id: normalizeMemoryId(
            item.id,
            `item_${index + 1}`,
        ),
        labelEn: String(
            item.labelEn ||
            item.label ||
            `Item ${index + 1}`,
        ).trim(),
        label: String(
            item.label ||
            item.labelEn ||
            `物品 ${index + 1}`,
        ).trim(),
        detailEn: String(
            item.detailEn ||
            item.detail ||
            '',
        ).trim(),
        detail: String(
            item.detail ||
            item.detailEn ||
            '',
        ).trim(),
        kind: item.kind ||
            inferItemKind(item),
        importance,
        custody,
        ownerId,
        mapId: activeWithOwner
            ? String(
                defaults.mapId ||
                item.mapId ||
                '',
            )
            : String(
                item.mapId ||
                defaults.mapId ||
                '',
            ),
        roomId: activeWithOwner
            ? String(
                defaults.roomId ||
                item.roomId ||
                '',
            )
            : String(
                item.roomId ||
                defaults.roomId ||
                '',
            ),
        status: [
            'available',
            'damaged',
            'consumed',
            'lost',
        ].includes(item.status)
            ? item.status
            : custody === 'consumed'
                ? 'consumed'
                : custody === 'lost'
                    ? 'lost'
                    : 'available',
        acquiredClock:
            item.acquiredClock ||
            defaults.clock ||
            '',
        updatedClock:
            item.updatedClock ||
            item.acquiredClock ||
            defaults.clock ||
            '',
        source: item.source || defaults.source || 'world',
    };
}

export function projectObservedInventoryUpdates(
    observedUpdates,
    worldState,
    playerAction,
    narrativeText,
) {
    const existingItems =
        new Map(
            (
                worldState.items ||
                []
            ).map((item, index) => {
                const normalized =
                    normalizeInventoryItem(
                        item,
                        index,
                    );
                return [
                    normalized.id,
                    normalized,
                ];
            }),
        );
    const allowedActions =
        new Set([
            'acquire',
            'update',
            'carry',
            'equip',
            'store',
            'consume',
            'lose',
        ]);
    const explicitPossession =
        /(?:\b(?:take|takes|took|pick(?:ed)? up|receive[ds]?|accept(?:ed)?|claim(?:ed)?|keep|kept|carry|carried|hold(?:ing)?|held|clamped on|in (?:her|his|their) hand)\b|拿起|拿到|拿走|收下|收到|接过|认领|保留|留着|带着|握着|攥着|手里|随身)/iu;
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
            observed.ownerId !==
                'player' ||
            !allowedActions.has(
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
            existingItems.get(
                observed.id,
            );
        if (
            !existing &&
            (
                observed.action !==
                    'acquire' ||
                ![
                    'key',
                    'important',
                ].includes(
                    observed
                        .importance,
                ) ||
                ![
                    'carried',
                    'equipped',
                ].includes(
                    observed
                        .custody,
                ) ||
                !explicitPossession
                    .test(evidence) ||
                !String(
                    observed.labelEn ||
                    '',
                ).trim() ||
                !String(
                    observed.detailEn ||
                    '',
                ).trim()
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
            action:
                existing &&
                observed.action ===
                    'acquire'
                    ? 'update'
                    : observed.action,
            labelEn:
                String(
                    observed.labelEn ||
                    existing?.labelEn ||
                    '',
                ).trim(),
            label:
                String(
                    observed.labelZh ||
                    existing?.label ||
                    observed.labelEn ||
                    '',
                ).trim(),
            detailEn:
                String(
                    observed.detailEn ||
                    existing?.detailEn ||
                    '',
                ).trim(),
            detail:
                String(
                    observed.detailZh ||
                    existing?.detail ||
                    observed.detailEn ||
                    '',
                ).trim(),
            importance:
                existing
                    ?.importance ||
                observed.importance,
            custody:
                observed.custody,
            ownerId: 'player',
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
    return (items || []).map((item, index) => {
        const normalized =
            normalizeInventoryItem(
                item,
                index,
                { mapId, roomId },
            );
        const followsPlayer = [
            'carried',
            'equipped',
        ].includes(normalized.custody) &&
            normalized.ownerId === 'player';
        return {
            id: normalized.id,
            custody: normalized.custody,
            ownerId: normalized.ownerId,
            mapId: followsPlayer
                ? mapId
                : normalized.mapId,
            roomId: followsPlayer
                ? roomId
                : normalized.roomId,
            status: normalized.status,
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
