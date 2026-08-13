import {
    normalizeMemoryId,
} from './stable-identity.js';

export const ITEM_SYSTEM_VERSION = 3;
export const ITEM_SCHEMA_VERSION = 3;
export const ITEM_PROPOSAL_VERSION = 1;

export const ITEM_TYPE_VALUES =
    Object.freeze([
        'wand',
        'eyewear',
        'clothing',
        'accessory',
        'document',
        'container',
        'money',
        'key',
        'book',
        'tool',
        'consumable',
        'keepsake',
        'clue',
        'other',
    ]);

export const ITEM_STATE_VALUES =
    Object.freeze([
        'intact',
        'damaged',
        'dirty',
        'consumed',
        'lost',
        'destroyed',
    ]);

export const ITEM_PHYSICAL_FORM_VALUES =
    Object.freeze([
        'whole',
        'remains',
        'absent',
        'unknown',
    ]);

export const ITEM_OPERATION_VALUES =
    Object.freeze([
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

export const ITEM_VISIBILITY_VALUES =
    Object.freeze([
        'public',
        'owner_known',
        'hidden',
    ]);

export const ITEM_STORY_ROLE_VALUES =
    Object.freeze([
        'signature',
        'social',
        'clue',
        'promise',
        'keepsake',
    ]);

export const ITEM_TRANSFER_MODE_VALUES =
    Object.freeze([
        'none',
        'gift',
        'loan',
        'theft',
        'return',
    ]);

export const ITEM_TIME_PRECISION_VALUES =
    Object.freeze([
        'exact',
        'day',
        'before_date',
        'unknown',
    ]);

export const ITEM_PROPOSAL_SOURCE_VALUES =
    Object.freeze([
        'low',
        'medium',
        'high',
        'local_observer',
        'user',
        'canon_migration',
    ]);

export const LEGACY_ITEM_ACTION_MAP =
    Object.freeze({
        update: 'carry',
        store: 'place',
    });

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

function stableValues(
    values,
    allowed,
) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    String(value || '')
                        .trim())
                .filter(value =>
                    allowed.includes(value)),
        ),
    ];
}

export function normalizeItemOperation(
    value,
) {
    const operation =
        LEGACY_ITEM_ACTION_MAP[
            value
        ] ||
        value;
    return ITEM_OPERATION_VALUES
        .includes(operation)
        ? operation
        : '';
}

const HIGH_RISK_ITEM_OPERATION_PATTERNS =
    Object.freeze({
        lose:
            /(?:\b(?:lose|lost|missing|misplaced|gone|disappear(?:ed)?|vanish(?:ed)?|left behind|could not find|couldn't find)\b|丢失|弄丢|不见|遗失|找不到|落下)/iu,
        destroy:
            /(?:\b(?:destroy(?:ed)?|shatter(?:ed)?|annihilat(?:e|ed)|disintegrat(?:e|ed)|burn(?:ed|t)? to (?:ash|cinders|nothing)|irreparably ruined)\b|\b(?:vanish(?:ed)?|disappear(?:ed)?)\s+(?:entirely|completely|altogether)\b|\b(?:ruin|remains|wreck)\b.{0,48}\b(?:vanish(?:ed)?|disappear(?:ed)?)\b|销毁|摧毁|彻底烧毁|碎成|无法修复|彻底消失|完全消失|(?:残骸|遗骸).{0,24}(?:消失|不见))/iu,
        consume:
            /(?:\b(?:consume[ds]?|ate|eaten|drank|drunk|used up|finished)\b|消耗|吃掉|喝掉|用完)/iu,
        damage:
            /(?:\b(?:damage[ds]?|damaged|broke|broken|tore|torn|cracked|bent|scorched)\b|损坏|打坏|弄坏|撕破|裂开|折弯|烧焦)/iu,
        clean:
            /(?:\b(?:clean(?:ed)?|wash(?:ed)?|wiped clean|polished)\b|清洗|洗净|擦净|清洁|擦亮)/iu,
    });

const ABSENT_DESTRUCTION_EVIDENCE_PATTERN =
    /(?:\b(?:vanish(?:ed)?|disappear(?:ed)?)\s+(?:entirely|completely|altogether)\b|\b(?:entirely|completely|altogether)\s+(?:vanish(?:ed)?|disappear(?:ed)?)\b|\b(?:annihilat(?:e|ed|ion)|disintegrat(?:e|ed|ion)|vapor(?:ize|ized|ise|ised)|ceased to exist|left no trace|no (?:trace|ash|cinders|remains) remained|burn(?:ed|t) to nothing)\b|彻底消失|完全消失|消失殆尽|化为乌有|灰飞烟灭|彻底湮灭|不留痕迹|没有留下(?:任何)?(?:残骸|灰烬))/iu;

const REMAINS_DESTRUCTION_EVIDENCE_PATTERN =
    /(?:\b(?:remains|wreckage|wreck|ruin|debris|pieces?|fragments?|shards?|splinters?|ashes|cinders)\b|\bshatter(?:ed)?\b|残骸|遗骸|碎片|碎块|碎屑|灰烬|余烬|破碎|粉碎)/iu;

export function inferDestroyedPhysicalForm(
    evidenceText,
) {
    const evidence =
        compactText(
            evidenceText,
            1600,
        );
    if (
        ABSENT_DESTRUCTION_EVIDENCE_PATTERN
            .test(evidence)
    ) {
        return 'absent';
    }
    if (
        REMAINS_DESTRUCTION_EVIDENCE_PATTERN
            .test(evidence)
    ) {
        return 'remains';
    }
    return '';
}

function getItemPhysicalEvidence(
    source,
) {
    return [
        source
            .destructionEvidenceEn,
        source
            .destructionEvidence,
        source.evidenceText,
        source.notesEn,
        source.notes,
        source.appearanceEn,
        source.appearance,
        source.detailEn,
        source.detail,
    ]
        .filter(Boolean)
        .join(' ');
}

export function normalizeItemPhysicalForm(
    source = {},
    state = 'intact',
) {
    if (
        [
            'intact',
            'damaged',
            'dirty',
        ].includes(state)
    ) {
        return 'whole';
    }
    if (state === 'consumed') {
        return 'absent';
    }
    if (state === 'lost') {
        return 'unknown';
    }
    if (state === 'destroyed') {
        if (
            [
                'remains',
                'absent',
            ].includes(
                source.physicalForm,
            )
        ) {
            return source
                .physicalForm;
        }
        return inferDestroyedPhysicalForm(
            getItemPhysicalEvidence(
                source,
            ),
        ) || 'remains';
    }
    return ITEM_PHYSICAL_FORM_VALUES
        .includes(source.physicalForm)
        ? source.physicalForm
        : 'whole';
}

export function validateItem(
    source,
) {
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source)
    ) {
        return [
            '物品必须是对象。',
        ];
    }
    const errors = [];
    const state =
        source.state;
    const physicalForm =
        source.physicalForm;
    if (
        !ITEM_STATE_VALUES.includes(
            state,
        )
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 state 无效。`,
        );
    }
    if (
        !ITEM_PHYSICAL_FORM_VALUES
            .includes(physicalForm)
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 physicalForm 无效。`,
        );
        return errors;
    }
    if (
        [
            'intact',
            'damaged',
            'dirty',
        ].includes(state) &&
        physicalForm !== 'whole'
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 ${state} 状态要求 physicalForm=whole。`,
        );
    }
    if (
        state === 'destroyed' &&
        ![
            'remains',
            'absent',
        ].includes(physicalForm)
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 destroyed 状态要求 physicalForm=remains|absent。`,
        );
    }
    if (
        state === 'consumed' &&
        physicalForm !== 'absent'
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 consumed 状态要求 physicalForm=absent。`,
        );
    }
    if (
        state === 'lost' &&
        physicalForm !== 'unknown'
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 lost 状态要求 physicalForm=unknown。`,
        );
    }
    if (
        physicalForm === 'remains' &&
        state !== 'destroyed'
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 physicalForm=remains 要求 state=destroyed。`,
        );
    }
    if (
        physicalForm === 'absent' &&
        ![
            'consumed',
            'destroyed',
        ].includes(state)
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 physicalForm=absent 要求终态 state。`,
        );
    }
    if (
        physicalForm === 'unknown' &&
        state !== 'lost'
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的 physicalForm=unknown 要求 state=lost。`,
        );
    }
    if (
        [
            'absent',
            'unknown',
        ].includes(physicalForm)
    ) {
        if (source.holderId) {
            errors.push(
                `物品 ${source.id || '?'} 的 ${physicalForm} 形态不能有 holderId。`,
            );
        }
        if (source.isEquipped) {
            errors.push(
                `物品 ${source.id || '?'} 的 ${physicalForm} 形态不能被装备。`,
            );
        }
        if (
            source.location &&
            (
                source.location
                    .mapId ||
                source.location
                    .roomId ||
                source.location
                    .placement
            )
        ) {
            errors.push(
                `物品 ${source.id || '?'} 的 ${physicalForm} 形态不能有当前物理位置。`,
            );
        }
    }
    if (
        physicalForm === 'remains' &&
        source.isEquipped
    ) {
        errors.push(
            `物品 ${source.id || '?'} 的残骸不能被装备。`,
        );
    }
    return errors;
}

const ITEM_TYPE_EVIDENCE_PATTERNS =
    Object.freeze({
        wand:
            /(?:\bwand\b|魔杖)/iu,
        eyewear:
            /(?:\b(?:glasses|spectacles|eyewear|lenses|frames)\b|眼镜|镜片|镜框)/iu,
        clothing:
            /(?:\b(?:robe|dress|coat|cloak|uniform|shirt|skirt|trousers|clothing)\b|长袍|裙|外套|斗篷|校服|衬衫|裤|衣物)/iu,
        accessory:
            /(?:\b(?:ribbon|ring|amulet|necklace|brooch|accessory)\b|丝带|戒指|护符|项链|胸针|饰品)/iu,
        document:
            /(?:\b(?:document|letter|parchment|paper|permit|note|autograph)\b|文件|信件|羊皮纸|纸张|许可证|纸条|签名)/iu,
        container:
            /(?:\b(?:pouch|bag|box|case|trunk|container)\b|袋|包|盒|箱|容器)/iu,
        money:
            /(?:\b(?:money|coin|galleon|sickle|knut)\b|钱|硬币|加隆|西可|纳特)/iu,
        key:
            /(?:\bkey\b|钥匙)/iu,
        book:
            /(?:\b(?:book|journal|diary|textbook)\b|书|课本|日记)/iu,
        tool:
            /(?:\b(?:tool|quill|pen|knife|instrument|nib)\b|工具|羽毛笔|笔|刀|器具|笔尖)/iu,
        consumable:
            /(?:\b(?:food|drink|sweet|potion|consumable)\b|食物|饮料|糖果|药水|消耗品)/iu,
        keepsake:
            /(?:\b(?:keepsake|memento|souvenir)\b|纪念品|信物)/iu,
        clue:
            /(?:\bclue\b|线索)/iu,
    });

function evidenceMentionsItem(
    item,
    evidenceText,
) {
    const evidence =
        compactText(
            evidenceText,
            800,
        ).toLocaleLowerCase();
    if (!evidence) return false;
    const idWords =
        String(item?.id || '')
            .replace(/_/gu, ' ')
            .toLocaleLowerCase()
            .trim();
    const idTokens =
        idWords
            .split(/\s+/gu)
            .filter(Boolean);
    const exactAliases = [
        item?.labelEn,
        item?.label,
        idWords,
        idTokens
            .slice(-2)
            .join(' '),
        idTokens.at(-1),
    ]
        .map(value =>
            compactText(
                value,
                200,
            ).toLocaleLowerCase())
        .filter(value =>
            value.length >= 3);
    return exactAliases.some(alias =>
        evidence.includes(alias)) ||
        ITEM_TYPE_EVIDENCE_PATTERNS[
            item?.type
        ]?.test(evidence) === true;
}

export function isItemOperationEvidenceGrounded(
    item,
    operation,
    evidenceText,
) {
    const operationPattern =
        HIGH_RISK_ITEM_OPERATION_PATTERNS[
            operation
        ];
    if (!operationPattern) {
        return true;
    }
    const evidence =
        compactText(
            evidenceText,
            800,
        );
    return (
        evidenceMentionsItem(
            item,
            evidence,
        ) &&
        operationPattern.test(
            evidence,
        )
    );
}

export function inferItemType(
    value,
) {
    const text =
        typeof value ===
            'string'
            ? value
            : [
                value?.id,
                value?.labelEn,
                value?.label,
                value?.appearanceEn,
                value?.appearance,
                value?.detailEn,
                value?.detail,
            ]
                .filter(Boolean)
                .join(' ');
    const types = [
        [
            'wand',
            /(?:\bwand\b|魔杖)/iu,
        ],
        [
            'eyewear',
            /(?:\b(?:glasses|spectacles|eyewear)\b|眼镜)/iu,
        ],
        [
            'key',
            /(?:\bkey\b|钥匙)/iu,
        ],
        [
            'document',
            /(?:\b(?:letter|parchment|permit|note)\b|信件|羊皮纸|许可证|纸条|通知书)/iu,
        ],
        [
            'book',
            /(?:\b(?:book|journal|diary)\b|书|课本|日记)/iu,
        ],
        [
            'money',
            /(?:\b(?:money|coin|galleon|sickle|knut)\b|钱|硬币|加隆|西可|纳特)/iu,
        ],
        [
            'container',
            /(?:\b(?:pouch|bag|box|case|trunk)\b|袋|包|盒|箱)/iu,
        ],
        [
            'clothing',
            /(?:\b(?:robe|dress|coat|cloak|uniform|shirt|skirt|trousers)\b|长袍|裙|外套|斗篷|校服|衬衫|裤)/iu,
        ],
        [
            'accessory',
            /(?:\b(?:ribbon|ring|amulet|necklace|brooch)\b|丝带|戒指|护符|项链|胸针)/iu,
        ],
        [
            'consumable',
            /(?:\b(?:food|drink|sweet|potion)\b|食物|饮料|糖果|药水)/iu,
        ],
        [
            'tool',
            /(?:\b(?:tool|quill|knife|instrument)\b|工具|羽毛笔|刀|器具)/iu,
        ],
    ];
    return types.find(
        ([, pattern]) =>
            pattern.test(text),
    )?.[0] ||
        'other';
}

export function deriveLegacyCustody(
    item,
) {
    if (
        item.state ===
            'consumed'
    ) {
        return 'consumed';
    }
    if (
        item.state === 'lost' ||
        item.physicalForm ===
            'unknown'
    ) {
        return 'lost';
    }
    if (item.isEquipped) {
        return 'equipped';
    }
    if (item.holderId) {
        return 'carried';
    }
    return 'stored';
}

function normalizeAcquiredAt(
    source,
    defaults,
) {
    if (
        source?.acquiredAt &&
        typeof source.acquiredAt ===
            'object'
    ) {
        return {
            value:
                compactText(
                    source
                        .acquiredAt
                        .value,
                    80,
                ),
            precision:
                ITEM_TIME_PRECISION_VALUES
                    .includes(
                        source
                            .acquiredAt
                            .precision,
                    )
                    ? source
                        .acquiredAt
                        .precision
                    : 'unknown',
        };
    }
    const legacyClock =
        compactText(
            source?.acquiredClock ||
            defaults.clock,
            80,
        );
    return {
        value:
            legacyClock,
        precision:
            legacyClock
                ? legacyClock
                    .includes(' · ')
                    ? 'exact'
                    : /^\d{4}-\d{2}-\d{2}$/u
                        .test(
                            legacyClock,
                        )
                        ? 'day'
                        : 'unknown'
                : 'unknown',
    };
}

function normalizeLegacyState(
    source,
) {
    if (
        ITEM_STATE_VALUES.includes(
            source.state,
        )
    ) {
        return source.state;
    }
    if (
        ITEM_STATE_VALUES.includes(
            source.status,
        )
    ) {
        return source.status ===
            'available'
            ? 'intact'
            : source.status;
    }
    if (
        source.custody ===
            'consumed'
    ) {
        return 'consumed';
    }
    if (
        source.custody ===
            'lost'
    ) {
        return 'lost';
    }
    return 'intact';
}

function normalizeHolderId(
    source,
) {
    if (
        Object.prototype
            .hasOwnProperty.call(
                source,
                'holderId',
            )
    ) {
        return compactText(
            source.holderId,
            96,
        );
    }
    return [
        'carried',
        'equipped',
    ].includes(
        source.custody,
    )
        ? compactText(
            source.ownerId ||
                'player',
            96,
        )
        : '';
}

export function normalizeItem(
    source = {},
    index = 0,
    defaults = {},
) {
    const holderId =
        normalizeHolderId(source);
    const isEquipped =
        Object.prototype
            .hasOwnProperty.call(
                source,
                'isEquipped',
            )
            ? source.isEquipped ===
                true
            : source.custody ===
                'equipped';
    const state =
        normalizeLegacyState(
            source,
        );
    const physicalForm =
        normalizeItemPhysicalForm(
            source,
            state,
        );
    const hasPhysicalMatter =
        [
            'whole',
            'remains',
        ].includes(
            physicalForm,
        );
    const normalizedHolderId =
        hasPhysicalMatter
            ? holderId
            : '';
    const locationSource =
        source.location &&
        typeof source.location ===
            'object'
            ? source.location
            : {};
    const location =
        hasPhysicalMatter
            ? {
                mapId:
                    compactText(
                        locationSource
                            .mapId ||
                        source.mapId ||
                        defaults.mapId,
                        120,
                    ),
                roomId:
                    compactText(
                        locationSource
                            .roomId ||
                        source.roomId ||
                        defaults.roomId,
                        120,
                    ),
                placement:
                    compactText(
                        locationSource
                            .placement ||
                        (
                            normalizedHolderId
                                ? 'with_holder'
                                : 'in_room'
                        ),
                        120,
                    ),
            }
            : {
                mapId: '',
                roomId: '',
                placement: '',
            };
    const item = {
        version:
            ITEM_SCHEMA_VERSION,
        id:
            normalizeMemoryId(
                source.id,
                `item_${index + 1}`,
            ),
        type:
            ITEM_TYPE_VALUES.includes(
                source.type,
            )
                ? source.type
                : inferItemType(
                    source,
                ),
        labelEn:
            compactText(
                source.labelEn ||
                source.label ||
                `Item ${index + 1}`,
                160,
            ),
        label:
            compactText(
                source.label ||
                source.labelEn ||
                `物品 ${index + 1}`,
                160,
            ),
        ownerId:
            compactText(
                source.ownerId ||
                defaults.ownerId ||
                'player',
                96,
            ),
        holderId:
            normalizedHolderId,
        location,
        appearanceEn:
            compactText(
                source.appearanceEn ||
                source.detailEn ||
                source.appearance ||
                source.detail,
                800,
            ),
        appearance:
            compactText(
                source.appearance ||
                source.detail ||
                source.appearanceEn ||
                source.detailEn,
                800,
            ),
        state,
        physicalForm,
        sourceEventId:
            compactText(
                source.sourceEventId ||
                source.source ||
                defaults.sourceEventId ||
                'world',
                160,
            ),
        sourceUrl:
            compactText(
                source.sourceUrl,
                500,
            ),
        isEquipped:
            physicalForm ===
                'whole' &&
            isEquipped,
        notesEn:
            compactText(
                source.notesEn,
                800,
            ),
        notes:
            compactText(
                source.notes ||
                source.notesEn,
                800,
            ),
        storyRoles:
            stableValues(
                source.storyRoles,
                ITEM_STORY_ROLE_VALUES,
            ),
        visibility:
            ITEM_VISIBILITY_VALUES
                .includes(
                    source.visibility,
                )
                ? source.visibility
                : source.ownerId &&
                    source.ownerId !==
                        'player'
                    ? 'owner_known'
                    : 'public',
        acquiredAt:
            normalizeAcquiredAt(
                source,
                defaults,
            ),
        transferMode:
            ITEM_TRANSFER_MODE_VALUES
                .includes(
                    source.transferMode,
                )
                ? source.transferMode
                : 'none',
        updatedClock:
            compactText(
                source.updatedClock ||
                defaults.clock,
                80,
            ),
    };
    return {
        ...item,
        custody:
            deriveLegacyCustody(
                item,
            ),
        kind:
            item.type,
        importance:
            source.importance ||
            (
                item.storyRoles
                    .length
                    ? 'important'
                    : 'ordinary'
            ),
        mapId:
            item.location.mapId,
        roomId:
            item.location.roomId,
        status:
            item.state ===
                'intact'
                ? 'available'
                : item.state,
        acquiredClock:
            item.acquiredAt.value,
        source:
            item.sourceEventId,
        detailEn:
            item.appearanceEn,
        detail:
            item.appearance,
    };
}

export function normalizeCurrentPresentation(
    source = {},
    {
        validItemIds =
        null,
        clock = '',
    } = {},
) {
    const normalizeIds =
        values =>
            [
                ...new Set(
                    (
                        Array.isArray(
                            values,
                        )
                            ? values
                            : []
                    )
                        .map(value =>
                            String(
                                value ||
                                '',
                            ).trim())
                        .filter(id =>
                            id &&
                            (
                                !validItemIds ||
                                validItemIds
                                    .has(id)
                            )),
                ),
            ];
    return {
        ...source,
        outfit:
            compactText(
                source.outfit,
                500,
            ),
        wornItemIds:
            normalizeIds(
                source.wornItemIds,
            ),
        heldItemIds:
            normalizeIds(
                source.heldItemIds,
            ),
        updatedClock:
            compactText(
                source.updatedClock ||
                clock,
                80,
            ),
        ...(
            source.sourceEventId
                ? {
                    sourceEventId:
                        compactText(
                            source
                                .sourceEventId,
                            160,
                        ),
                }
                : {}
        ),
    };
}

export function isItemVisibleToPlayer(
    item,
    knownActorIds = [],
) {
    if (
        item.visibility ===
            'hidden'
    ) {
        return false;
    }
    if (
        item.visibility ===
            'public' ||
        item.ownerId ===
            'player' ||
        item.holderId ===
            'player'
    ) {
        return true;
    }
    return new Set(
        knownActorIds,
    ).has(item.ownerId) ||
        new Set(
            knownActorIds,
        ).has(item.holderId);
}
