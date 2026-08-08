import {
    ITEM_SCHEMA_VERSION,
    normalizeItem,
} from './item-schema.js';

export const CANON_ITEM_CATALOG_VERSION =
    1;

export const CANON_ITEM_CATALOG =
    Object.freeze([
        Object.freeze({
            version:
                ITEM_SCHEMA_VERSION,
            id:
                'canon_harry_holly_wand',
            type:
                'wand',
            labelEn:
                'Harry Potter\'s Holly Wand',
            label:
                '哈利·波特的冬青木魔杖',
            ownerId:
                'canon_harry_james_potter',
            holderId:
                'canon_harry_james_potter',
            appearanceEn:
                'A 12½-inch holly wand with a phoenix feather core and unbending flexibility.',
            appearance:
                '一根十二又二分之一英寸、凤凰羽毛杖芯、质地不易弯曲的冬青木魔杖。',
            state:
                'intact',
            sourceEventId:
                'canon_harry_wand_1991',
            sourceUrl:
                'https://www.harrypotter.com/wand/Holly/Phoenix/TwelveAndAHalf/Unbending',
            isEquipped:
                false,
            notesEn:
                'The wand chose Harry at Ollivanders.',
            notes:
                '这根魔杖在奥利凡德选择了哈利。',
            storyRoles: [
                'signature',
            ],
            visibility:
                'owner_known',
            acquiredAt: {
                value:
                    '1991-07-31',
                precision:
                    'day',
            },
            transferMode:
                'none',
        }),
        Object.freeze({
            version:
                ITEM_SCHEMA_VERSION,
            id:
                'canon_harry_round_spectacles',
            type:
                'eyewear',
            labelEn:
                'Harry Potter\'s Round Spectacles',
            label:
                '哈利·波特的圆框眼镜',
            ownerId:
                'canon_harry_james_potter',
            holderId:
                'canon_harry_james_potter',
            appearanceEn:
                'A pair of round spectacles strongly associated with Harry\'s appearance.',
            appearance:
                '一副与哈利外貌紧密相连的圆框眼镜。',
            state:
                'intact',
            sourceEventId:
                'canon_harry_glasses_pre_1991',
            sourceUrl:
                'https://www.harrypotter.com/news/how-many-easter-eggs-did-you-spot-in-audible-announcement-video',
            isEquipped:
                true,
            notesEn:
                'The official editorial site describes the round spectacles as one of Harry\'s most iconic props.',
            notes:
                '官方编辑网站将圆框眼镜称为哈利最具标志性的道具之一。',
            storyRoles: [
                'signature',
            ],
            visibility:
                'public',
            acquiredAt: {
                value:
                    '1991-07-24',
                precision:
                    'before_date',
            },
            transferMode:
                'none',
        }),
        Object.freeze({
            version:
                ITEM_SCHEMA_VERSION,
            id:
                'canon_ron_charlie_wand',
            type:
                'wand',
            labelEn:
                'Charlie Weasley\'s Hand-me-down Wand',
            label:
                '查理·韦斯莱传给罗恩的旧魔杖',
            ownerId:
                'canon_charles_weasley',
            holderId:
                'canon_ronald_bilius_weasley',
            appearanceEn:
                'An ash wand with a unicorn hair core, handed down from Charlie Weasley to Ron.',
            appearance:
                '一根白蜡木、独角兽毛杖芯的旧魔杖，由查理·韦斯莱传给罗恩。',
            state:
                'intact',
            sourceEventId:
                'canon_ron_first_wand_pre_1991',
            sourceUrl:
                'https://www.harrypotter.com/features/how-loyal-is-a-wand-to-a-wizard',
            isEquipped:
                false,
            notesEn:
                'The wand did not choose Ron and remained associated with its original owner.',
            notes:
                '这根魔杖没有选择罗恩，仍与原主人存在强烈联系。',
            storyRoles: [
                'signature',
                'social',
            ],
            visibility:
                'owner_known',
            acquiredAt: {
                value:
                    '1991-09-01',
                precision:
                    'before_date',
            },
            transferMode:
                'loan',
        }),
        Object.freeze({
            version:
                ITEM_SCHEMA_VERSION,
            id:
                'canon_hermione_vine_wand',
            type:
                'wand',
            labelEn:
                'Hermione Granger\'s Vine Wand',
            label:
                '赫敏·格兰杰的葡萄藤木魔杖',
            ownerId:
                'canon_hermione_jean_granger',
            holderId:
                'canon_hermione_jean_granger',
            appearanceEn:
                'A 12½-inch vine wand with a dragon heartstring core and pliant flexibility.',
            appearance:
                '一根十二又二分之一英寸、龙心弦杖芯、柔韧的葡萄藤木魔杖。',
            state:
                'intact',
            sourceEventId:
                'canon_hermione_wand_pre_1991',
            sourceUrl:
                'https://www.harrypotter.com/wand/Vine/Dragon/TwelveAndAHalf/Pliant',
            isEquipped:
                false,
            notesEn:
                'Hermione owned the wand before beginning her first Hogwarts year.',
            notes:
                '赫敏在进入霍格沃茨一年级前已经拥有这根魔杖。',
            storyRoles: [
                'signature',
            ],
            visibility:
                'owner_known',
            acquiredAt: {
                value:
                    '1991-09-01',
                precision:
                    'before_date',
            },
            transferMode:
                'none',
        }),
    ]);

function getWorldDate(
    clock,
) {
    return String(clock || '')
        .match(
            /\d{4}-\d{2}-\d{2}/u,
        )?.[0] ||
        '';
}

function isAcquiredByDate(
    item,
    worldDate,
) {
    const value =
        item.acquiredAt?.value ||
        '';
    if (
        !worldDate ||
        !/^\d{4}-\d{2}-\d{2}$/u
            .test(value)
    ) {
        return true;
    }
    return worldDate >= value;
}

export function seedCanonItems(
    worldState,
) {
    const actorIds =
        new Set(
            (
                worldState
                    .actorLibrary ||
                []
            ).map(actor =>
                actor.id),
        );
    const actorsById =
        new Map(
            (
                worldState.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const existingIds =
        new Set(
            (
                worldState.items ||
                []
            ).map(item =>
                item.id),
        );
    const worldDate =
        getWorldDate(
            worldState.clock,
        );
    const additions =
        CANON_ITEM_CATALOG
            .filter(item =>
                (
                    actorIds.has(
                        item.ownerId,
                    ) ||
                    actorIds.has(
                        item.holderId,
                    )
                ) &&
                !existingIds.has(
                    item.id,
                ) &&
                isAcquiredByDate(
                    item,
                    worldDate,
                ))
            .map(
                (
                    source,
                    index,
                ) => {
                    const holder =
                        actorsById.get(
                            source
                                .holderId,
                        );
                    return normalizeItem(
                        {
                            ...source,
                            location: {
                                mapId:
                                    holder
                                        ?.mapId ||
                                    '',
                                roomId:
                                    holder
                                        ?.roomId ||
                                    '',
                                placement:
                                    'with_holder',
                            },
                        },
                        (
                            worldState.items ||
                            []
                        ).length +
                            index,
                        {
                            clock:
                                worldState
                                    .clock,
                        },
                    );
                },
            );
    return additions;
}
