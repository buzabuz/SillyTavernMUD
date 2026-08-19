import {
    MATERIAL_STATE_SCHEMA_VERSION,
} from '../material-schema.js';
import {
    isItemVisibleToPlayer,
    normalizeCurrentPresentation,
    normalizeItem,
} from './item-schema.js';

export const ACTOR_PRESENTATION_VERSION = 1;
const ACTOR_VISUAL_DESCRIPTION_VERSION = 1;
const DYNAMIC_OUTFIT_PATTERN =
    /\b(?:wearing|wears|dressed in)\s+([^.;]+?)(?=,\s*(?:holding|carrying|surrounded|sitting|standing|wiping|with)\b|[.;]|$)/iu;
const DYNAMIC_IN_OUTFIT_PATTERN =
    /\bin\s+((?:an?\s+|the\s+)?[^,.;]{0,80}?(?:robes?|cloak|shirt|dress|uniform|apron|shawl|coat|boots?|hat)[^,.;]{0,40}?)(?=,|[.;]|$)/iu;
const DYNAMIC_HELD_PATTERN =
    /\b(?:holding|holds|carrying|carries)\s+([^.;]+?)(?=,\s*(?:and|while|with)\b|[.;]|$)/iu;

function ensureDescriptionSentence(
    value,
) {
    const text = String(value || '')
        .replace(/\s+/gu, ' ')
        .replace(/\s+([,.;])/gu, '$1')
        .replace(/,\s*\./gu, '.')
        .replace(/\.\s*\./gu, '.')
        .trim();
    if (!text) return '';
    return /[.!?]$/u.test(text)
        ? text
        : `${text}.`;
}

function sanitizeLocalizedPhysicalDescription(
    value,
) {
    return ensureDescriptionSentence(
        String(value || '')
            .replace(
                /[，,]\s*(?:穿着|身穿|戴着|拿着|手持|抱着|周围(?:堆着|放着)|坐在|站在|正在)[^。！？]*/gu,
                '',
            )
            .replace(
                /(?:他|她|他们)(?:穿着|身穿|戴着|拿着|手持|抱着)[^。！？]*[。！？]?/gu,
                '',
            ),
    );
}

export function splitActorVisualDescription(
    value,
) {
    const source = ensureDescriptionSentence(
        value,
    );
    if (!source) {
        return {
            physicalDescriptionEn: '',
            outfitEn: '',
            heldObjectEn: '',
        };
    }
    const outfit =
        source.match(
            DYNAMIC_OUTFIT_PATTERN,
        )?.[1] ||
        source.match(
            DYNAMIC_IN_OUTFIT_PATTERN,
        )?.[1] ||
        '';
    const heldObject =
        source.match(
            DYNAMIC_HELD_PATTERN,
        )?.[1] ||
        '';
    let physicalDescriptionEn = source
        .replace(
            /,\s*(?:wearing|dressed in|holding|carrying|surrounded by|sitting|standing|perched|wiping|presiding over)\b[^.]*[.]?/giu,
            '.',
        )
        .replace(
            /(?:^|[.]\s*)(?:He|She|They)\s+(?:wears?|is wearing|holds?|is holding|carries?|is carrying)\b[^.]*[.]?/giu,
            '. ',
        )
        .replace(
            /\s+in\s+(?:an?\s+|the\s+)?[^,.;]{0,80}?(?:robes?|cloak|shirt|dress|uniform|apron|shawl|coat|boots?|hat)[^,.;]{0,40}?(?=,|[.;]|$)/giu,
            '',
        );
    physicalDescriptionEn =
        ensureDescriptionSentence(
            physicalDescriptionEn,
        );
    return {
        physicalDescriptionEn:
            physicalDescriptionEn ||
            source,
        outfitEn:
            String(outfit)
                .replace(
                    /,\s*(?:holding|carrying|surrounded by)\b.*$/iu,
                    '',
                )
                .trim(),
        heldObjectEn:
            String(heldObject)
                .trim(),
    };
}

export function normalizeActorVisualRecord(
    source = {},
) {
    const split =
        splitActorVisualDescription(
            source
                .physicalDescriptionEn ||
            source.publicDescriptionEn ||
            source.publicDescription,
        );
    const physicalDescriptionEn =
        ensureDescriptionSentence(
            source.physicalDescriptionEn ||
            split.physicalDescriptionEn,
        );
    const localizedSource =
        source.physicalDescription ||
        source.publicDescription ||
        '';
    const physicalDescription =
        sanitizeLocalizedPhysicalDescription(
            localizedSource,
        ) ||
        physicalDescriptionEn;
    return {
        record: {
            ...source,
            physicalDescriptionEn,
            physicalDescription,
            publicDescriptionEn:
                physicalDescriptionEn,
            publicDescription:
                physicalDescription,
            visualDescriptionVersion:
                ACTOR_VISUAL_DESCRIPTION_VERSION,
        },
        presentationSeed: {
            outfitEn:
                split.outfitEn,
            heldObjectEn:
                split.heldObjectEn,
        },
    };
}

export function migrateActorPresentationState(
    worldState,
) {
    if (!worldState) {
        return {
            state: worldState,
            changed: false,
        };
    }
    if (
        Number(
            worldState
                .actorContextVersion ||
            0,
        ) >= 1
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const records = [
        ...(worldState.actors || []),
        ...(worldState.actorLibrary || []),
    ];
    const needsMigration =
        Number(
            worldState
                .actorPresentationVersion ||
            0,
        ) <
            ACTOR_PRESENTATION_VERSION ||
        records.some(record =>
            Number(
                record
                    .visualDescriptionVersion ||
                0,
            ) <
                ACTOR_VISUAL_DESCRIPTION_VERSION);
    if (!needsMigration) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    const seeds = new Map();
    const normalizeRecords = values =>
        (values || []).map(source => {
            const normalized =
                normalizeActorVisualRecord(
                    source,
                );
            const previous =
                seeds.get(source.id) || {};
            seeds.set(source.id, {
                outfitEn:
                    previous.outfitEn ||
                    normalized
                        .presentationSeed
                        .outfitEn,
                heldObjectEn:
                    previous.heldObjectEn ||
                    normalized
                        .presentationSeed
                        .heldObjectEn,
            });
            return normalized.record;
        });
    next.actors =
        normalizeRecords(next.actors);
    next.actorLibrary =
        normalizeRecords(
            next.actorLibrary,
        );
    next.actorPresentations ??= {};
    for (
        const actor
        of next.actors || []
    ) {
        if (actor.present === false) {
            continue;
        }
        const seed =
            seeds.get(actor.id);
        if (!seed?.outfitEn) {
            continue;
        }
        const previous =
            next.actorPresentations[
                actor.id
            ] || {};
        next.actorPresentations[
            actor.id
        ] = {
            ...previous,
            outfitEn:
                previous.outfitEn ||
                seed.outfitEn,
            updatedClock:
                previous
                    .updatedClock ||
                next.clock ||
                '',
            source:
                previous.source ||
                'legacy_public_description_migration',
        };
    }
    const normalizeGuest = guest =>
        guest
            ? normalizeActorVisualRecord(
                guest,
            ).record
            : guest;
    if (
        next.pacingDirector
            ?.pendingBeat?.guestActor
    ) {
        next.pacingDirector
            .pendingBeat.guestActor =
            normalizeGuest(
                next.pacingDirector
                    .pendingBeat
                    .guestActor,
            );
    }
    if (
        next.pacingDirector
            ?.assessment
            ?.intervention
            ?.guestActor
    ) {
        next.pacingDirector
            .assessment
            .intervention
            .guestActor =
            normalizeGuest(
                next.pacingDirector
                    .assessment
                    .intervention
                    .guestActor,
            );
    }
    next.actorPresentationVersion =
        ACTOR_PRESENTATION_VERSION;
    next.materialStateVersion =
        Math.max(
            Number(
                next.materialStateVersion ||
                0,
            ),
            MATERIAL_STATE_SCHEMA_VERSION,
        );
    return {
        state: next,
        changed: true,
    };
}

export function buildActorAppearanceView(
    worldState,
    actorId,
) {
    const actor =
        (worldState?.actors || [])
            .find(item =>
                item.id === actorId) ||
        {};
    const profile =
        (worldState?.actorLibrary || [])
            .find(item =>
                item.id === actorId) ||
        {};
    const visual =
        normalizeActorVisualRecord({
            ...actor,
            ...profile,
        }).record;
    const presentation =
        worldState
            ?.actorPresentations?.[
                actorId
            ] ||
        {};
    const knownActorIds =
        new Set([
            actorId,
            ...(
                worldState
                    ?.actorLibrary ||
                []
            )
                .filter(entry =>
                    Boolean(
                        entry
                            .cast
                            ?.introducedClock,
                    ))
                .map(entry =>
                    entry.id),
        ]);
    const itemById =
        new Map(
            (
                worldState?.items ||
                []
            )
                .map(
                    (
                        item,
                        index,
                    ) =>
                        normalizeItem(
                            item,
                            index,
                        ),
                )
                .filter(item =>
                    isItemVisibleToPlayer(
                        item,
                        knownActorIds,
                    ))
                .map(item => [
                    item.id,
                    item,
                ]),
        );
    const normalizedPresentation =
        normalizeCurrentPresentation(
            presentation,
            {
                validItemIds:
                    new Set(
                        itemById.keys(),
                    ),
                clock:
                    worldState
                        ?.clock ||
                    '',
            },
        );
    const accessories =
        Object.values(
            presentation.accessories ||
            {},
        ).filter(Boolean);
    const visibleConditions = (
        presentation.visibleConditions ||
        []
    )
        .map(condition =>
            typeof condition ===
                'string'
                ? condition
                : condition.valueEn ||
                    condition
                        .resultTextEn)
        .filter(Boolean);
    const wornItems =
        normalizedPresentation
            .wornItemIds
            .map(itemId => {
                const item =
                    itemById.get(
                        itemId,
                    );
                return item
                    ? item.labelEn
                    : '';
            })
            .filter(Boolean);
    const heldItems =
        normalizedPresentation
            .heldItemIds
            .map(itemId => {
                const item =
                    itemById.get(
                        itemId,
                    );
                return item
                    ? {
                        hand:
                            'unspecified',
                        item:
                            item.labelEn,
                        itemId,
                    }
                    : null;
            })
            .filter(Boolean);
    const hasFormalHeldReferences =
        Array.isArray(
            presentation.heldItemIds,
        ) &&
        presentation.heldItemIds
            .some(Boolean);
    if (
        !heldItems.length &&
        !hasFormalHeldReferences
    ) {
        heldItems.push(
            ...Object.entries(
                presentation
                    .heldItems ||
                {},
            )
                .filter(([, item]) =>
                    item)
                .map(
                    ([
                        hand,
                        item,
                    ]) => ({
                        hand,
                        item,
                    }),
                ),
        );
    }
    if (
        !heldItems.length &&
        !hasFormalHeldReferences &&
        presentation.heldObjectEn
    ) {
        heldItems.push({
            hand: 'unspecified',
            item:
                presentation
                    .heldObjectEn,
        });
    }
    return {
        physicalDescription:
            visual
                .physicalDescription ||
            visual
                .physicalDescriptionEn ||
            '尚未仔细观察。',
        physicalDescriptionEn:
            visual
                .physicalDescriptionEn ||
            '',
        presentation: {
            outfit:
                normalizedPresentation
                    .outfitEn ||
                '',
            accessories,
            wornItems,
            hair:
                presentation.hairEn ||
                '',
            visibleConditions,
            heldItems,
            updatedClock:
                normalizedPresentation
                    .updatedClock ||
                '',
        },
    };
}
