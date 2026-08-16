import {
    buildCurrentMaterialState,
} from './material-state.js';
import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';
import {
    normalizeCurrentPresentation,
    normalizeItem,
} from './item-schema.js';
import {
    getSpellDefinitions,
} from '../spell-catalog.js';

export const NARRATIVE_AUTHORITY_SNAPSHOT_VERSION =
    1;

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

function cloneJsonValue(
    value,
    fallback,
) {
    try {
        const serialized =
            JSON.stringify(value);
        return serialized ===
            undefined
            ? fallback
            : JSON.parse(
                serialized,
            );
    } catch {
        return fallback;
    }
}

function stableValues(
    values,
) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
        .map(value =>
            cloneJsonValue(
                value,
                null,
            ))
        .filter(value =>
            value !== null)
        .sort((left, right) =>
            JSON.stringify(left)
                .localeCompare(
                    JSON.stringify(
                        right,
                    ),
                    'en',
                ));
}

function projectCurrentItems(
    worldState,
    {
        includeHidden = false,
    } = {},
) {
    const mapId =
        worldState.map
            ?.activeMapId ||
        worldState.scene?.mapId ||
        '';
    const roomId =
        worldState.map
            ?.currentLocalNodeId ||
        worldState.scene?.roomId ||
        '';
    const currentHolderIds =
        new Set([
            'player',
            ...(
                worldState.actors ||
                []
            )
                .filter(actor =>
                    actor.present !==
                    false)
                .map(actor =>
                    actor.id),
        ]);
    return (
        worldState.items ||
        []
    )
        .filter(source =>
            includeHidden ||
            source?.visibility !==
                'hidden')
        .map(
            (
                source,
                index,
            ) =>
                normalizeItem(
                    source,
                    index,
                    {
                        mapId:
                            mapId,
                        roomId:
                            roomId,
                        clock:
                            worldState
                                .clock,
                    },
                ),
        )
        .map(item => (
            item.holderId &&
            currentHolderIds.has(
                item.holderId,
            )
                ? {
                    ...item,
                    location: {
                        mapId,
                        roomId,
                        placement:
                            'with_holder',
                    },
                }
                : item
        ))
        .filter(item =>
            [
                'whole',
                'remains',
            ].includes(
                item.physicalForm,
            ) &&
            (
                currentHolderIds.has(
                    item.holderId,
                ) ||
                (
                    item.location
                        ?.mapId === mapId &&
                    item.location
                        ?.roomId === roomId
                )
            ))
        .sort((left, right) =>
            left.id.localeCompare(
                right.id,
                'en',
            ))
        .map(item => ({
            id: item.id,
            type: item.type,
            labelEn: item.labelEn,
            state: item.state,
            physicalForm:
                item.physicalForm,
            ownerId: item.ownerId,
            holderId: item.holderId,
            location:
                cloneJsonValue(
                    item.location,
                    {
                        mapId: '',
                        roomId: '',
                        placement: '',
                    },
                ),
            isEquipped:
                item.isEquipped,
            sourceEventId:
                item.sourceEventId,
            updatedClock:
                item.updatedClock,
        }));
}

function projectPresentation(
    source,
    actorId,
    itemsById,
    clock,
) {
    if (
        !source ||
        typeof source !== 'object'
    ) {
        return null;
    }
    const physicallyPresentIds =
        new Set(
            [
                ...itemsById
                    .values(),
            ]
                .filter(item =>
                    [
                        'whole',
                        'remains',
                    ].includes(
                        item.physicalForm,
                    ))
                .map(item =>
                    item.id),
        );
    const normalized =
        normalizeCurrentPresentation(
            source,
            {
                validItemIds:
                    physicallyPresentIds,
                clock,
            },
        );
    const wornItemIds =
        normalized
            .wornItemIds
            .filter(itemId => {
                const item =
                    itemsById.get(
                        itemId,
                    );
                return (
                    item
                        ?.physicalForm ===
                        'whole' &&
                    item.holderId ===
                        actorId &&
                    item.isEquipped
                );
            });
    const heldItemIds =
        normalized
            .heldItemIds
            .filter(itemId => {
                const item =
                    itemsById.get(
                        itemId,
                    );
                return (
                    [
                        'whole',
                        'remains',
                    ].includes(
                        item
                            ?.physicalForm,
                    ) &&
                    item.holderId ===
                        actorId
                );
            });
    const hadFormalHeldItems =
        Array.isArray(
            source.heldItemIds,
        ) &&
        source.heldItemIds
            .length > 0;
    return {
        ...cloneJsonValue(
            normalized,
            {},
        ),
        ...(
            hadFormalHeldItems &&
            heldItemIds.length === 0
                ? {
                    heldItems: {},
                    heldObject: '',
                }
                : {}
        ),
        wornItemIds,
        heldItemIds,
    };
}

function projectCurrentActors(
    worldState,
    itemsById,
) {
    const coreById =
        new Map(
            (
                worldState
                    .actorLibrary ||
                []
            ).map(core => [
                core.id,
                core,
            ]),
        );
    return (
        worldState.actors ||
        []
    )
        .filter(actor =>
            actor?.present !==
                false)
        .sort((left, right) =>
            String(left?.id || '')
                .localeCompare(
                    String(
                        right?.id ||
                        '',
                    ),
                    'en',
                ))
        .map(actor => {
            const core =
                coreById.get(
                    actor.id,
                ) || {};
            return {
                id:
                compactText(
                    actor.id,
                    96,
                ),
                nameEn:
                compactText(
                    core.nameEn,
                    160,
                ),
                name:
                compactText(
                    core.nameEn,
                    160,
                ),
                present: true,
                mapId:
                compactText(
                    actor.mapId,
                    120,
                ),
                roomId:
                compactText(
                    actor.roomId,
                    120,
                ),
                lifeStatus:
                compactText(
                    actor.lifeStatus ||
                    'alive',
                    40,
                ),
                lifeStatusDetailEn:
                compactText(
                    actor
                        .lifeStatusDetailEn,
                    500,
                ),
                currentActivityEn:
                compactText(
                    actor
                        .currentActivityEn,
                    500,
                ),
                currentIntentEn:
                compactText(
                    actor
                        .currentIntentEn,
                    500,
                ),
                presentation:
                projectPresentation(
                    worldState
                        .actorPresentations
                        ?.[actor.id],
                    actor.id,
                    itemsById,
                    worldState.clock,
                ),
            };
        });
}

function projectMaterialState(
    worldState,
    itemsById,
) {
    const materialState =
        buildCurrentMaterialState(
            worldState,
        );
    return {
        ...cloneJsonValue(
            materialState,
            {},
        ),
        actorPresentations:
            Object.fromEntries(
                Object.entries(
                    materialState
                        .actorPresentations ||
                    {},
                )
                    .sort(
                        ([left], [right]) =>
                            left.localeCompare(
                                right,
                                'en',
                            ),
                    )
                    .map(
                        ([
                            actorId,
                            presentation,
                        ]) => [
                            actorId,
                            projectPresentation(
                                presentation,
                                actorId,
                                itemsById,
                                worldState
                                    .clock,
                            ),
                        ],
                    ),
            ),
    };
}

export function buildNarrativeAuthoritySnapshot(
    worldState = {},
    {
        access = 'medium',
    } = {},
) {
    const currentItems =
        projectCurrentItems(
            worldState,
            {
                includeHidden:
                    access ===
                    'dedicated_high',
            },
        );
    const itemsById =
        new Map(
            currentItems.map(item => [
                item.id,
                item,
            ]),
        );
    const mapId =
        compactText(
            worldState.map
                ?.activeMapId,
            120,
        );
    const roomId =
        compactText(
            worldState.map
                ?.currentLocalNodeId,
            120,
        );
    const roomKey =
        `${mapId}:${roomId}`;
    const stateRevision =
        Number(
            worldState
                .stateRevision,
        );
    const currentOpenFacts =
        worldState
            .currentOpenFacts ||
        worldState.scene
            ?.currentOpenFacts ||
        worldState.scene
            ?.temporalFactsEn ||
        [];
    return {
        version:
            NARRATIVE_AUTHORITY_SNAPSHOT_VERSION,
        timelineEpoch:
            compactText(
                worldState
                    .timelineEpoch ||
                'stable_epoch',
                160,
            ),
        stateRevision:
            Number.isSafeInteger(
                stateRevision,
            ) &&
            stateRevision >= 0
                ? stateRevision
                : 0,
        clock:
            compactText(
                worldState.clock,
                80,
            ),
        sceneId:
            compactText(
                worldState.scene
                    ?.id,
                160,
            ),
        currentActors:
            projectCurrentActors(
                worldState,
                itemsById,
            ),
        currentItems,
        currentMaterialState:
            projectMaterialState(
                worldState,
                itemsById,
            ),
        currentRoomState:
            Object.fromEntries(
                Object.entries(
                    cloneJsonValue(
                        worldState.map
                            ?.roomStates
                            ?.[roomKey],
                        {},
                    ),
                ).filter(([key]) =>
                    key !==
                    'materialEffects'),
            ),
        currentOpenFacts:
            stableValues(
                currentOpenFacts,
            ),
        supersededSourceRefs:
            stableValues(
                worldState
                    .supersededSourceRefs,
            ),
    };
}

const AUTHORITY_ALIAS_LIMIT = 8;

const ATTRIBUTED_NON_CURRENT_PATTERN =
    /(?:\b(?:yesterday|previously|formerly|earlier|last (?:night|week|month|year)|once|used to|in the past|back then|\d+ (?:minutes?|hours?|days?|weeks?|months?|years?) ago)\b|\b(?:believ(?:e|es|ed)|think(?:s|ing)?|thought|claim(?:s|ed)?|say(?:s|ing)?|said|remember(?:s|ed|ing)?|recall(?:s|ed|ing)?|assum(?:e|es|ed|ing)|suspect(?:s|ed|ing)?|dream(?:s|ed|ing)?|imagin(?:e|es|ed|ing)|mistaken|misremember(?:s|ed|ing)?|rumou?r|according to|was told|had heard)\b|\b(?:if|unless|would|could|might|may|perhaps|maybe|possibly|hypothetically|suppose|supposing|what if|as though|as if)\b)/iu;

const NARRATIVE_CLAUSE_SPLIT_PATTERN =
    /(?<=[.!?;])\s+|\n+|(?:,\s*|\s+)(?:however|nevertheless|yet)\b,?\s+/iu;

const COORDINATING_CLAUSE_BOUNDARY_PATTERN =
    /(?:,\s*|\s+)(and|then|while|whereas|although|though|but)\s+/giu;

const NEXT_COORDINATING_CLAUSE_BOUNDARY_PATTERN =
    /(?:,\s*|\s+)(?:and|then|while|whereas|although|though|but)\s+/iu;

const EXPLICIT_CURRENT_CLAUSE_PATTERN =
    /^(?:(?:now|currently|today|here|meanwhile|actually|in fact|at present)\b|(?:[\p{L}\p{N}'_-]+\s+){1,5}(?:now|currently|today|here|actually|in fact|at present)\b)/iu;

const IMPLICIT_CURRENT_FACT_PATTERN =
    /\b(?:am|is|are|rests?|stands?|sits?|waits?|walks?|stays?|remains?|appears?|arrives?|works?|holds?|carries|wears?|clutches?|grips?|possesses?|keeps?|has|lies?|touches?|grabs?|uses?|examines?|functions?|continues?|reads?|shows?|surrounds?|receives?|opens?|breathes?|casts?|fights?)\b/iu;

const INCOMPLETE_ITEM_ATTEMPT_PATTERN =
    /\b(?:(?:try|tries|tried|trying|attempt|attempts|attempted|attempting)\s+to|(?:reach|reaches|reached|reaching)\s+(?:out\s+)?for)\b/iu;

const COMPLETED_ITEM_ATTEMPT_PATTERN =
    /\b(?:and|then|before|after)\b.{0,48}\b(?:carr(?:y|ies|ied|ying)|clutch(?:es|ed|ing)?|grab(?:s|bed|bing)?|hold(?:s|ing)?|pick(?:s|ed|ing)? up|repair(?:s|ed|ing)?|restore(?:s|d|ing)?|use(?:s|d|ing)?)\b|\b(?:manag(?:e|es|ed|ing)|succeed(?:s|ed|ing)?)\b/iu;

const POSITIVE_ITEM_PHYSICAL_PATTERN =
    /\b(?:hold(?:s|ing)?|carr(?:y|ies|ied|ying)|wear(?:s|ing)?|clutch(?:es|ed|ing)?|grip(?:s|ped|ping)?|possess(?:es|ed|ing)?|keep(?:s|ing)?|kept|place(?:s|d|ing)?|put(?:s|ting)?|set(?:s|ting)? down|rest(?:s|ed|ing)?|sit(?:s|ting)?|lie(?:s|ing)?|lay|touch(?:es|ed|ing)?|grab(?:s|bed|bing)?|pick(?:s|ed|ing)? up|repair(?:s|ed|ing)?|restore(?:s|d|ing)?|use(?:s|d|ing)?|examin(?:e|es|ed|ing)|intact|whole|undamaged|unbroken|usable|working|fragments?|remains|pieces?|shards?|splinters?|wreckage|debris|ashes)\b/iu;

const NEGATED_ITEM_PHYSICAL_PATTERN =
    /\b(?:no one|nobody|neither|not|never|no longer|cannot|can t|could not|couldn t|without)\b.{0,64}\b(?:hold|carry|wear|possess|place|touch|grab|repair|restore|use|find|see)\b/iu;

const WHOLE_ITEM_PATTERN =
    /\b(?:intact|whole|undamaged|unbroken|pristine|usable|working|repaired|restored|functions?|functioning|works?)\b/iu;

const POSSESSION_VERB_PATTERN =
    '(?:holds?|holding|carries|carried|carrying|wears?|wearing|clutches?|clutched|grips?|gripped|possesses?|possessed|keeps?|kept|has)';

const CURRENT_ACTOR_ACTION_PATTERN =
    '(?:is (?:here|present|standing|sitting|waiting|walking|running|speaking|watching|holding|carrying|smiling|breathing)|stands?|sits?|waits?|walks?|runs?|speaks?|says?|watches?|holds?|carries|smiles?|looks?|enters?|leaves?|moves?|reaches?|touches?|grabs?|breathes?|casts?|fights?)';

const INCAPACITATED_ACTION_PATTERN =
    '(?:stands? up|walks?|runs?|casts?|fights?|carries|climbs?)';

const SPELL_IDENTITY_LINK_PATTERN =
    '(?:is|means|is called|is known as|is also known as|has the incantation|uses the incantation)';

function normalizeAuthorityText(
    value,
) {
    return String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase('en')
        .replace(/['’]/gu, ' ')
        .replace(/[^\p{L}\p{N}:]+/gu, ' ')
        .replace(/\s+/gu, ' ')
        .trim();
}

function escapeRegExp(
    value,
) {
    return String(value || '')
        .replace(
            /[.*+?^${}()|[\]\\]/gu,
            '\\$&',
        );
}

function stableEntityLabels(
    id,
    labels = [],
    aliases = [],
) {
    const primary = [
        id,
        String(id || '')
            .replace(/_/gu, ' '),
        ...labels,
    ]
        .map(normalizeAuthorityText)
        .filter(label =>
            label.length >= 3);
    const boundedAliases = [
        ...new Set(
            (
                Array.isArray(aliases)
                    ? aliases
                    : []
            )
                .map(normalizeAuthorityText)
                .filter(label =>
                    label.length >= 3),
        ),
    ]
        .sort((left, right) =>
            left.localeCompare(
                right,
                'en',
            ))
        .slice(
            0,
            AUTHORITY_ALIAS_LIMIT,
        );
    return [
        ...new Set([
            ...primary,
            ...boundedAliases,
        ]),
    ];
}

function containsLabel(
    text,
    label,
) {
    return (
        ` ${text} `
            .includes(
                ` ${label} `,
            )
    );
}

function findMentionedLabel(
    text,
    labels,
) {
    return labels.find(label =>
        containsLabel(
            text,
            label,
        )) || '';
}

function labelPattern(
    label,
) {
    return `(?:^| )${
        escapeRegExp(
            label,
        )
    }(?: |$)`;
}

function hasLabelRelation(
    text,
    leftLabels,
    relationPattern,
    rightLabels,
    distance = 96,
) {
    return leftLabels.some(left =>
        rightLabels.some(right =>
            new RegExp(
                `${
                    labelPattern(left)
                }.{0,${
                    distance
                }}${relationPattern}.{0,${
                    distance
                }}${
                    labelPattern(right)
                }`,
                'iu',
            ).test(text)));
}

function hasActionAfterEntity(
    text,
    labels,
    actionPattern,
) {
    return labels.some(label =>
        new RegExp(
            `${
                labelPattern(label)
            }.{0,64}${
                actionPattern
            }(?: |$)`,
            'iu',
        ).test(text));
}

function splitCoordinatedNarrativeClauses(
    text,
) {
    const clauses = [];
    let clauseStart = 0;
    COORDINATING_CLAUSE_BOUNDARY_PATTERN
        .lastIndex = 0;
    let match;
    while (
        (
            match =
                COORDINATING_CLAUSE_BOUNDARY_PATTERN
                    .exec(text)
        )
    ) {
        const nextStart =
            match.index +
            match[0].length;
        const currentClause =
            text.slice(
                clauseStart,
                match.index,
            );
        const remainingText =
            text.slice(nextStart);
        const followingBoundary =
            remainingText.match(
                NEXT_COORDINATING_CLAUSE_BOUNDARY_PATTERN,
            );
        const nextClause =
            followingBoundary
                ? remainingText.slice(
                    0,
                    followingBoundary.index,
                )
                : remainingText;
        if (
            !EXPLICIT_CURRENT_CLAUSE_PATTERN
                .test(
                    nextClause.trim(),
                ) &&
            !IMPLICIT_CURRENT_FACT_PATTERN
                .test(
                    nextClause.trim(),
                )
        ) {
            continue;
        }
        clauses.push(
            currentClause,
        );
        clauseStart = nextStart;
    }
    clauses.push(
        text.slice(clauseStart),
    );
    return clauses;
}

function narrativeFactClauses(
    segments,
) {
    return (
        Array.isArray(segments)
            ? segments
            : []
    )
        .filter(segment =>
            segment &&
            typeof segment ===
                'object' &&
            String(
                segment.textEn ||
                '',
            ).trim())
        .flatMap(segment =>
            String(
                segment.textEn ||
                '',
            )
                .slice(0, 8000)
                .split(
                    NARRATIVE_CLAUSE_SPLIT_PATTERN,
                )
                .flatMap(
                    splitCoordinatedNarrativeClauses,
                )
                .map(text =>
                    text.trim())
                .filter(Boolean)
                .map(text => ({
                    raw: text,
                    normalized:
                        normalizeAuthorityText(
                            text,
                        ),
                })))
        .filter(sentence =>
            sentence.normalized &&
            !ATTRIBUTED_NON_CURRENT_PATTERN
                .test(sentence.raw));
}

function buildItemAuthorities(
    worldState,
) {
    return (
        worldState.items ||
        []
    )
        .map(
            (
                source,
                index,
            ) => {
                const item =
                    normalizeItem(
                        source,
                        index,
                        {
                            mapId:
                                worldState
                                    .map
                                    ?.activeMapId,
                            roomId:
                                worldState
                                    .map
                                    ?.currentLocalNodeId,
                            clock:
                                worldState
                                    .clock,
                        },
                    );
                return {
                    ...item,
                    labels:
                        stableEntityLabels(
                            item.id,
                            [
                                item.labelEn,
                            ],
                            source.aliases,
                        ),
                };
            },
        )
        .sort((left, right) =>
            left.id.localeCompare(
                right.id,
                'en',
            ));
}

function buildActorAuthorities(
    worldState,
    suppliedActors,
) {
    const profilesById =
        new Map(
            (
                worldState
                    .actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const runtimeById =
        new Map(
            (
                worldState.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const suppliedById =
        Array.isArray(
            suppliedActors,
        )
            ? new Map(
                suppliedActors.map(
                    actor => [
                        actor.id,
                        actor,
                    ],
                ),
            )
            : null;
    const ids = new Set([
        ...profilesById.keys(),
        ...runtimeById.keys(),
        ...(
            suppliedById
                ? suppliedById.keys()
                : []
        ),
    ]);
    const actors = [
        ...ids,
    ]
        .map(id => {
            const profile =
                profilesById.get(id) ||
                {};
            const runtime =
                runtimeById.get(id) ||
                {};
            const supplied =
                suppliedById
                    ?.get(id);
            const authority =
                supplied
                    ? {
                        ...runtime,
                        ...supplied,
                    }
                    : runtime;
            return {
                id,
                labels:
                    stableEntityLabels(
                        id,
                        [
                            authority.nameEn,
                            authority.name,
                            profile.nameEn,
                            profile.name,
                        ],
                        [
                            ...(
                                profile.aliases ||
                                []
                            ),
                            ...(
                                authority
                                    .aliases ||
                                []
                            ),
                        ],
                    ),
                present:
                    suppliedById
                        ? supplied
                            ?.present ===
                            true
                        : authority
                            .present !==
                            false,
                mapId:
                    compactText(
                        authority.mapId,
                        120,
                    ),
                roomId:
                    compactText(
                        authority.roomId,
                        120,
                    ),
                lifeStatus:
                    compactText(
                        authority
                            .lifeStatus ||
                        'alive',
                        40,
                    ),
            };
        })
        .sort((left, right) =>
            left.id.localeCompare(
                right.id,
                'en',
            ));
    const playerName =
        worldState.character
            ?.identity
            ?.name ||
        worldState.character
            ?.name ||
        '';
    actors.push({
        id: 'player',
        labels:
            stableEntityLabels(
                'player',
                [
                    playerName,
                    String(
                        playerName,
                    ).split(/\s+/u)[0],
                ],
            ),
        present: true,
        mapId:
            compactText(
                worldState.map
                    ?.activeMapId,
                120,
            ),
        roomId:
            compactText(
                worldState.map
                    ?.currentLocalNodeId,
                120,
            ),
        lifeStatus: 'alive',
        player: true,
    });
    return actors;
}

function buildRoomAuthorities(
    worldState,
    mapId,
) {
    const map =
        getLocalMapDefinition(
            mapId,
            worldState.map,
        );
    const rooms = map
        ? getMapRooms(
            map,
            worldState.map,
        )
        : [];
    const sceneRoomId =
        worldState.scene
            ?.roomId;
    if (
        sceneRoomId &&
        !rooms.some(room =>
            room.id ===
                sceneRoomId)
    ) {
        rooms.push({
            id: sceneRoomId,
            nameEn:
                worldState.scene
                    ?.nameEn,
        });
    }
    return rooms
        .map(room => ({
            id: room.id,
            mapId:
                room.mapId ||
                mapId,
            labels:
                stableEntityLabels(
                    room.id,
                    [
                        room.nameEn,
                    ],
                    room.aliases,
                ),
        }))
        .sort((left, right) =>
            left.id.localeCompare(
                right.id,
                'en',
            ));
}

function actorPossessesItem(
    text,
    actor,
    item,
) {
    if (
        hasLabelRelation(
            text,
            actor.labels,
            POSSESSION_VERB_PATTERN,
            item.labels,
            64,
        )
    ) {
        return true;
    }
    return item.labels.some(itemLabel =>
        actor.labels.some(actorLabel =>
            new RegExp(
                `${
                    labelPattern(
                        itemLabel,
                    )
                }.{0,64}(?:is |rests |sits )?(?:in|with|on).{0,24}${
                    labelPattern(
                        actorLabel,
                    )
                }.{0,16}(?:hand|hands|pocket|bag|person)(?: |$)`,
                'iu',
            ).test(text)));
}

function validateItemSentence(
    sentence,
    items,
    actors,
    mutableItemIds,
) {
    const errors = [];
    const incompleteAttempt =
        INCOMPLETE_ITEM_ATTEMPT_PATTERN
            .test(sentence) &&
        !COMPLETED_ITEM_ATTEMPT_PATTERN
            .test(sentence);
    items.forEach(item => {
        if (
            !findMentionedLabel(
                sentence,
                item.labels,
            )
        ) {
            return;
        }
        const positivePhysicalClaim =
            POSITIVE_ITEM_PHYSICAL_PATTERN
                .test(sentence) &&
            !NEGATED_ITEM_PHYSICAL_PATTERN
                .test(sentence) &&
            !incompleteAttempt;
        if (
            [
                'absent',
                'unknown',
            ].includes(
                item.physicalForm,
            ) &&
            positivePhysicalClaim
        ) {
            errors.push(
                `正文权威冲突 [item:${item.id}/physicalForm]：${item.physicalForm} 物品不能被写成当前可持有、放置、修复或操作的实体。`,
            );
        }
        if (
            (
                item.state ===
                    'destroyed' ||
                item.physicalForm ===
                    'remains'
            ) &&
            !incompleteAttempt &&
            WHOLE_ITEM_PATTERN
                .test(sentence)
        ) {
            errors.push(
                `正文权威冲突 [item:${item.id}/terminalState]：destroyed/remains 物品不能被写成完整、可用或已修复的原物。`,
            );
        }
        if (
            mutableItemIds.has(
                item.id,
            ) ||
            ![
                'whole',
                'remains',
            ].includes(
                item.physicalForm,
            )
        ) {
            return;
        }
        actors.forEach(actor => {
            if (
                actor.id ===
                    item.holderId ||
                !actorPossessesItem(
                    sentence,
                    actor,
                    item,
                )
            ) {
                return;
            }
            errors.push(
                `正文权威冲突 [item:${item.id}/holder]：正文持有人 ${actor.id} 与权威 holderId=${item.holderId || '(none)'} 不一致。`,
            );
        });
    });
    return errors;
}

function actorClaimsRoom(
    sentence,
    actor,
    room,
) {
    return hasLabelRelation(
        sentence,
        actor.labels,
        '(?:is|stands|sits|waits|walks|stays|remains|appears|arrives|works).{0,32}(?:in|inside|within|at)',
        room.labels,
        64,
    );
}

function validateActorSentence(
    sentence,
    actors,
    rooms,
) {
    const errors = [];
    actors
        .filter(actor =>
            !actor.player)
        .forEach(actor => {
            if (
                !findMentionedLabel(
                    sentence,
                    actor.labels,
                )
            ) {
                return;
            }
            const currentAction =
                hasActionAfterEntity(
                    sentence,
                    actor.labels,
                    CURRENT_ACTOR_ACTION_PATTERN,
                );
            if (
                !actor.present &&
                currentAction
            ) {
                errors.push(
                    `正文权威冲突 [actor:${actor.id}/presence]：不在场人物不能执行当前场景动作。`,
                );
            }
            if (
                [
                    'dead',
                    'missing',
                ].includes(
                    actor.lifeStatus,
                ) &&
                currentAction
            ) {
                errors.push(
                    `正文权威冲突 [actor:${actor.id}/life]：${actor.lifeStatus} 人物不能执行当前场景动作。`,
                );
            }
            if (
                actor.lifeStatus ===
                    'dead' &&
                hasActionAfterEntity(
                    sentence,
                    actor.labels,
                    '(?:is alive|is breathing|breathes?)',
                )
            ) {
                errors.push(
                    `正文权威冲突 [actor:${actor.id}/life]：永久死亡人物不能被写成存活。`,
                );
            }
            if (
                [
                    'alive',
                    'injured',
                ].includes(
                    actor.lifeStatus,
                ) &&
                hasActionAfterEntity(
                    sentence,
                    actor.labels,
                    '(?:is dead|lies dead|corpse)',
                )
            ) {
                errors.push(
                    `正文权威冲突 [actor:${actor.id}/life]：正文死亡状态与权威 lifeStatus=${actor.lifeStatus} 不一致。`,
                );
            }
            if (
                actor.lifeStatus ===
                    'incapacitated' &&
                hasActionAfterEntity(
                    sentence,
                    actor.labels,
                    INCAPACITATED_ACTION_PATTERN,
                )
            ) {
                errors.push(
                    `正文权威冲突 [actor:${actor.id}/life]：incapacitated 人物不能执行该当前动作。`,
                );
            }
            rooms.forEach(room => {
                if (
                    room.id ===
                        actor.roomId ||
                    !actorClaimsRoom(
                        sentence,
                        actor,
                        room,
                    )
                ) {
                    return;
                }
                errors.push(
                    `正文权威冲突 [actor:${actor.id}/room]：正文房间 ${room.id} 与权威 roomId=${actor.roomId || '(none)'} 不一致。`,
                );
            });
        });
    return errors;
}

function claimsSceneAtRoom(
    sentence,
    room,
) {
    return room.labels.some(label => {
        const roomPattern =
            `${
                escapeRegExp(label)
            }(?: |$)`;
        return (
            new RegExp(
                `^(?:in|inside|within|at) (?:the )?${
                    roomPattern
                }`,
                'iu',
            ).test(sentence) ||
            new RegExp(
                `^(?:now|currently|here)(?: |$).{0,96}(?:in|inside|within|at|enters|arrives at|reaches) (?:the )?${
                    roomPattern
                }`,
                'iu',
            ).test(sentence) ||
            new RegExp(
                `^at [0-2]?\\d:[0-5]\\d.{0,48}(?:in|inside|within|at) (?:the )?${
                    roomPattern
                }`,
                'iu',
            ).test(sentence) ||
            new RegExp(
                `(?:^| )${
                    roomPattern
                }.{0,32}(?:surrounds|receives|opens around)(?: |$)`,
                'iu',
            ).test(sentence)
        );
    });
}

function parseClockMinutes(
    value,
) {
    const match =
        String(value || '')
            .match(
                /(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/u,
            );
    return match
        ? Number(match[1]) *
            60 +
            Number(match[2])
        : null;
}

function findDirectClockMinutes(
    sentence,
) {
    const patterns = [
        /^(?:now\s+)?at\s+([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/iu,
        /\b(?:now|currently|it is|the clock reads|the clock shows)\s+(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/iu,
    ];
    for (const pattern of patterns) {
        const match =
            sentence.match(pattern);
        if (match) {
            return Number(match[1]) *
                60 +
                Number(match[2]);
        }
    }
    return null;
}

function clockMinuteIsAllowed(
    minute,
    clock,
    elapsedMinutes,
) {
    const start =
        parseClockMinutes(
            clock,
        );
    if (start === null) {
        return true;
    }
    const elapsed =
        Math.max(
            0,
            Math.min(
                1440,
                Math.round(
                    Number(
                        elapsedMinutes,
                    ) ||
                    0,
                ),
            ),
        );
    let candidate =
        minute;
    if (
        start + elapsed >=
            1440 &&
        candidate < start
    ) {
        candidate += 1440;
    }
    return (
        candidate >= start &&
        candidate <=
            start + elapsed
    );
}

function validateSceneSentence(
    sentence,
    rooms,
    roomId,
    clock,
    elapsedMinutes,
) {
    const errors = [];
    rooms.forEach(room => {
        if (
            room.id === roomId ||
            !claimsSceneAtRoom(
                sentence,
                room,
            )
        ) {
            return;
        }
        errors.push(
            `正文权威冲突 [scene:destination]：正文目的地 ${room.id} 与权威 roomId=${roomId || '(none)'} 不一致。`,
        );
    });
    const directMinute =
        findDirectClockMinutes(
            sentence,
        );
    if (
        directMinute !== null &&
        !clockMinuteIsAllowed(
            directMinute,
            clock,
            elapsedMinutes,
        )
    ) {
        const displayMinute =
            `${String(
                Math.floor(
                    directMinute /
                    60,
                ),
            ).padStart(2, '0')}:${String(
                directMinute %
                60,
            ).padStart(2, '0')}`;
        errors.push(
            `正文权威冲突 [scene:clock]：正文当前时刻 ${displayMinute} 与权威 clock=${clock || '(none)'} 不一致。`,
        );
    }
    return errors;
}

function buildSpellAuthorities(
    worldState,
) {
    const genericLabels =
        new Set([
            'charm',
            'curse',
            'hex',
            'jinx',
            'spell',
            'transfiguration',
        ]);
    return getSpellDefinitions(
        worldState,
    )
        .map(spell => ({
            id: spell.id,
            labels:
                stableEntityLabels(
                    spell.id,
                    [
                        spell.incantation,
                        spell.nameEn,
                    ],
                    spell.aliases,
                )
                    .filter(label =>
                        !genericLabels
                            .has(label)),
        }))
        .sort((left, right) =>
            left.id.localeCompare(
                right.id,
                'en',
            ));
}

function spellsLinkedAsOneIdentity(
    sentence,
    left,
    right,
) {
    return (
        hasLabelRelation(
            sentence,
            left.labels,
            `${SPELL_IDENTITY_LINK_PATTERN} (?!not )`,
            right.labels,
            32,
        ) ||
        hasLabelRelation(
            sentence,
            right.labels,
            `${SPELL_IDENTITY_LINK_PATTERN} (?!not )`,
            left.labels,
            32,
        )
    );
}

function validateSpellSentence(
    sentence,
    spells,
) {
    const mentioned =
        spells.filter(spell =>
            findMentionedLabel(
                sentence,
                spell.labels,
            ));
    for (
        let leftIndex = 0;
        leftIndex <
            mentioned.length;
        leftIndex++
    ) {
        for (
            let rightIndex =
                leftIndex + 1;
            rightIndex <
                mentioned.length;
            rightIndex++
        ) {
            const left =
                mentioned[leftIndex];
            const right =
                mentioned[rightIndex];
            if (
                spellsLinkedAsOneIdentity(
                    sentence,
                    left,
                    right,
                )
            ) {
                return [
                    `正文权威冲突 [spell:${left.id}/identity]：正文把不同权威咒语 ${left.id} 与 ${right.id} 写成同一身份。`,
                ];
            }
        }
    }
    return [];
}

export function validateNarrationConsistency(
    segments,
    worldState = {},
    {
        actors,
        clock =
        worldState.clock,
        elapsedMinutes = 0,
        mapId =
        worldState.map
            ?.activeMapId ||
        worldState.scene
            ?.mapId ||
        '',
        roomId =
        worldState.map
            ?.currentLocalNodeId ||
        worldState.scene
            ?.roomId ||
        '',
        mutableItemIds = [],
    } = {},
) {
    const sentences =
        narrativeFactClauses(
            segments,
        );
    if (!sentences.length) {
        return {
            valid: true,
            errors: [],
        };
    }
    const itemAuthorities =
        buildItemAuthorities(
            worldState,
        );
    const actorAuthorities =
        buildActorAuthorities(
            worldState,
            actors,
        );
    const roomAuthorities =
        buildRoomAuthorities(
            worldState,
            mapId,
        );
    const spellAuthorities =
        buildSpellAuthorities(
            worldState,
        );
    const mutableIds =
        new Set(
            (
                Array.isArray(
                    mutableItemIds,
                )
                    ? mutableItemIds
                    : []
            )
                .map(value =>
                    String(value || '')
                        .trim())
                .filter(Boolean),
        );
    const errors = [];
    sentences.forEach(sentence => {
        errors.push(
            ...validateItemSentence(
                sentence.normalized,
                itemAuthorities,
                actorAuthorities,
                mutableIds,
            ),
            ...validateActorSentence(
                sentence.normalized,
                actorAuthorities,
                roomAuthorities,
            ),
            ...validateSceneSentence(
                sentence.normalized,
                roomAuthorities,
                roomId,
                clock,
                elapsedMinutes,
            ),
            ...validateSpellSentence(
                sentence.normalized,
                spellAuthorities,
            ),
        );
    });
    const stableErrors = [
        ...new Set(errors),
    ];
    return {
        valid:
            stableErrors.length ===
            0,
        errors: stableErrors,
    };
}
