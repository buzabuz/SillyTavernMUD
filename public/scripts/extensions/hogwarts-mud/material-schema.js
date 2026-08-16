export const MATERIAL_STATE_SCHEMA_VERSION = 3;

export const MATERIAL_EXTRACTION_SCHEMA =
    Object.freeze({
        场景变化: Object.freeze([
            '执行者',
            '变化类型',
            '物品',
            '数量',
            '原位置',
            '目标位置',
            '目标对象',
            '变化结果',
            '持续性',
        ]),
        外貌变化: Object.freeze([
            '人物',
            '变化类型',
            '服装',
            '饰品',
            '发型',
            '外貌状态',
            '手持物',
            '手部',
            '穿戴部位',
            '变化结果',
            '持续性',
        ]),
    });

export const MATERIAL_EVENT_DEFINITIONS =
    Object.freeze({
        object_placed: Object.freeze({
            category: 'scene_change',
            operation: 'add',
            aspect: 'placement',
            required: Object.freeze([
                'objectTextEn',
                'targetTextEn',
            ]),
        }),
        object_moved: Object.freeze({
            category: 'scene_change',
            operation: 'move',
            aspect: 'placement',
            required: Object.freeze([
                'objectTextEn',
                'sourceTextEn',
                'targetTextEn',
            ]),
        }),
        object_removed: Object.freeze({
            category: 'scene_change',
            operation: 'remove',
            aspect: 'placement',
            required: Object.freeze([
                'objectTextEn',
            ]),
        }),
        scene_adjusted: Object.freeze({
            category: 'scene_change',
            operation: 'set',
            aspect: 'furnishing',
            requiredAny: Object.freeze([
                'objectTextEn',
                'targetTextEn',
                'resultTextEn',
            ]),
        }),
        scene_damaged: Object.freeze({
            category: 'scene_change',
            operation: 'damage',
            aspect: 'integrity',
            requiredAny: Object.freeze([
                'objectTextEn',
                'targetTextEn',
            ]),
        }),
        scene_repaired: Object.freeze({
            category: 'scene_change',
            operation: 'repair',
            aspect: 'integrity',
            requiredAny: Object.freeze([
                'objectTextEn',
                'targetTextEn',
            ]),
        }),
        scene_soiled: Object.freeze({
            category: 'scene_change',
            operation: 'soil',
            aspect: 'cleanliness',
            requiredAny: Object.freeze([
                'objectTextEn',
                'targetTextEn',
                'resultTextEn',
            ]),
        }),
        scene_cleaned: Object.freeze({
            category: 'scene_change',
            operation: 'clean',
            aspect: 'cleanliness',
            requiredAny: Object.freeze([
                'objectTextEn',
                'targetTextEn',
            ]),
        }),
        outfit_changed: Object.freeze({
            category: 'appearance_change',
            operation: 'set',
            aspect: 'outfit',
            required: Object.freeze([
                'actorId',
            ]),
            requiredUnlessRemove:
                'valueTextEn',
        }),
        accessory_changed: Object.freeze({
            category: 'appearance_change',
            operation: 'set',
            aspect: 'accessory',
            required: Object.freeze([
                'actorId',
            ]),
            requiredUnlessRemove:
                'valueTextEn',
        }),
        hairstyle_changed: Object.freeze({
            category: 'appearance_change',
            operation: 'set',
            aspect: 'hair',
            required: Object.freeze([
                'actorId',
                'valueTextEn',
            ]),
        }),
        appearance_changed: Object.freeze({
            category: 'appearance_change',
            operation: 'set',
            aspect: 'condition',
            required: Object.freeze([
                'actorId',
                'valueTextEn',
            ]),
        }),
        appearance_cleared: Object.freeze({
            category: 'appearance_change',
            operation: 'remove',
            aspect: 'condition',
            required: Object.freeze([
                'actorId',
            ]),
        }),
        object_held: Object.freeze({
            category: 'appearance_change',
            operation: 'set',
            aspect: 'held_item',
            required: Object.freeze([
                'actorId',
                'objectTextEn',
            ]),
        }),
        object_released: Object.freeze({
            category: 'appearance_change',
            operation: 'remove',
            aspect: 'held_item',
            required: Object.freeze([
                'actorId',
            ]),
        }),
    });

export const MATERIAL_EVENT_TYPES =
    Object.freeze(
        Object.keys(
            MATERIAL_EVENT_DEFINITIONS,
        ),
    );

export const MATERIAL_EVENT_TYPE_SET =
    new Set(MATERIAL_EVENT_TYPES);

export const MATERIAL_EVENT_CATEGORIES =
    Object.freeze([
        'scene_change',
        'appearance_change',
    ]);

export const MATERIAL_OPERATIONS =
    Object.freeze([
        'set',
        'add',
        'move',
        'remove',
        'damage',
        'repair',
        'soil',
        'clean',
    ]);

export const MATERIAL_PERSISTENCE_VALUES =
    Object.freeze([
        'transient',
        'until_scene_end',
        'until_changed',
        'permanent',
    ]);

export const LOCAL_MATERIAL_PERSISTENCE_VALUES =
    Object.freeze([
        'transient',
        'until_scene_end',
        'until_changed',
    ]);

export const APPEARANCE_SLOT_VALUES =
    Object.freeze([
        'head',
        'hair',
        'face',
        'neck',
        'torso_inner',
        'torso_outer',
        'hands',
        'waist',
        'legs',
        'feet',
        'accessory',
        'unspecified',
    ]);

export const HAND_VALUES =
    Object.freeze([
        'left',
        'right',
        'both',
        'unspecified',
    ]);
