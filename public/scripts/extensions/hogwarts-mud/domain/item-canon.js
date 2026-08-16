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
            ownerId:
                'canon_harry_james_potter',
            holderId:
                'canon_harry_james_potter',
            appearanceEn:
                'A 12½-inch holly wand with a phoenix feather core and unbending flexibility.',
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
            ownerId:
                'canon_harry_james_potter',
            holderId:
                'canon_harry_james_potter',
            appearanceEn:
                'A pair of round spectacles strongly associated with Harry\'s appearance.',
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
            ownerId:
                'canon_charles_weasley',
            holderId:
                'canon_ronald_bilius_weasley',
            appearanceEn:
                'An ash wand with a unicorn hair core, handed down from Charlie Weasley to Ron.',
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
            ownerId:
                'canon_hermione_jean_granger',
            holderId:
                'canon_hermione_jean_granger',
            appearanceEn:
                'A 12½-inch vine wand with a dragon heartstring core and pliant flexibility.',
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
