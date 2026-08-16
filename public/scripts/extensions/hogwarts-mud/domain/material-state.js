import {
    APPEARANCE_SLOT_VALUES,
    HAND_VALUES,
    LOCAL_MATERIAL_PERSISTENCE_VALUES,
    MATERIAL_EVENT_DEFINITIONS,
    MATERIAL_EVENT_TYPE_SET,
    MATERIAL_OPERATIONS,
    MATERIAL_STATE_SCHEMA_VERSION,
} from '../material-schema.js';
import {
    normalizeMemoryId,
} from './stable-identity.js';
import {
    isEnglishAuthorityText,
} from './model-language-adoption.js';

function compactMaterialText(
    value,
    maximumLength = 160,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function materialFingerprint(value) {
    return compactMaterialText(
        value,
        200,
    )
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}

function materialEffectIdentity(event) {
    return [
        event.category,
        event.type,
        event.operation,
        event.actorId,
        event.aspect,
        event.slot,
        event.hand,
        event.quantity || '',
        materialFingerprint(
            event.valueTextEn ||
            event.objectTextEn ||
            event.targetTextEn,
        ),
        materialFingerprint(
            event.sourceTextEn,
        ),
        materialFingerprint(
            event.targetTextEn,
        ),
    ].join(':');
}

function normalizeMaterialEvent(
    source,
    worldState,
) {
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source) ||
        !MATERIAL_EVENT_TYPE_SET.has(
            source.type,
        )
    ) {
        return null;
    }
    const definition =
        MATERIAL_EVENT_DEFINITIONS[
            source.type
        ];
    const mapId =
        compactMaterialText(
            source.mapId,
            120,
        );
    const roomId =
        compactMaterialText(
            source.roomId,
            120,
        );
    const currentMapId =
        String(
            worldState.map?.activeMapId ||
            '',
        );
    const currentRoomId =
        String(
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
    const sceneId =
        compactMaterialText(
            worldState.scene?.id ||
            source.sceneId,
            120,
        );
    if (
        !mapId ||
        !roomId ||
        mapId !== currentMapId ||
        roomId !== currentRoomId
    ) {
        return null;
    }
    const validActorIds = new Set([
        'player',
        ...(worldState.actors || [])
            .map(actor => actor.id),
        ...(worldState.actorLibrary || [])
            .map(actor => actor.id),
    ]);
    const actorId =
        compactMaterialText(
            source.actorId,
            96,
        );
    if (
        actorId &&
        !validActorIds.has(actorId)
    ) {
        return null;
    }
    const objectTextEn =
        compactMaterialText(
            source.objectTextEn,
        );
    const sourceTextEn =
        compactMaterialText(
            source.sourceTextEn,
        );
    const targetTextEn =
        compactMaterialText(
            source.targetTextEn,
        );
    const valueTextEn =
        compactMaterialText(
            source.valueTextEn,
        );
    const previousValueTextEn =
        compactMaterialText(
            source.previousValueTextEn,
        );
    const resultTextEn =
        compactMaterialText(
            source.resultTextEn,
        );
    const semanticTexts = [
        objectTextEn,
        sourceTextEn,
        targetTextEn,
        valueTextEn,
        previousValueTextEn,
        resultTextEn,
    ].filter(Boolean);
    if (
        semanticTexts.some(text =>
            !isEnglishAuthorityText(
                text,
            ))
    ) {
        return null;
    }
    const operation =
        [
            'outfit_changed',
            'accessory_changed',
        ].includes(source.type) &&
        source.operation ===
            'remove'
            ? 'remove'
            : definition.operation;
    if (
        !MATERIAL_OPERATIONS.includes(
            operation,
        )
    ) {
        return null;
    }
    const fields = {
        actorId,
        objectTextEn,
        sourceTextEn,
        targetTextEn,
        valueTextEn,
        previousValueTextEn,
        resultTextEn,
    };
    if (
        (definition.required || [])
            .some(field =>
                !fields[field])
    ) {
        return null;
    }
    if (
        definition.requiredAny &&
        !definition.requiredAny.some(
            field => fields[field],
        )
    ) {
        return null;
    }
    if (
        definition
            .requiredUnlessRemove &&
        operation !== 'remove' &&
        !fields[
            definition
                .requiredUnlessRemove
        ]
    ) {
        return null;
    }
    const slot =
        APPEARANCE_SLOT_VALUES
            .includes(source.slot)
            ? source.slot
            : 'unspecified';
    const hand =
        HAND_VALUES.includes(
            source.hand,
        )
            ? source.hand
            : 'unspecified';
    const persistence =
        LOCAL_MATERIAL_PERSISTENCE_VALUES
            .includes(
                source.persistence,
            )
            ? source.persistence
            : 'until_changed';
    const evidence = (
        Array.isArray(source.evidence)
            ? source.evidence
            : source.evidence
                ? [source.evidence]
                : []
    )
        .filter(item =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            compactMaterialText(
                item.text,
                500,
            ))
        .slice(0, 3)
        .map(item => ({
            text:
                compactMaterialText(
                    item.text,
                    500,
                ),
            start:
                Math.max(
                    0,
                    Number(
                        item.start || 0,
                    ),
                ),
            end:
                Math.max(
                    0,
                    Number(
                        item.end || 0,
                    ),
                ),
        }));
    if (!evidence.length) {
        return null;
    }
    const quantity =
        Number.isInteger(
            Number(source.quantity),
        ) &&
        Number(source.quantity) > 0 &&
        Number(source.quantity) <= 1_000
            ? Number(source.quantity)
            : null;
    const sourceKinds = [
        ...new Set(
            (
                Array.isArray(
                    source.sourceKinds,
                )
                    ? source
                        .sourceKinds
                    : [source.sourceKind]
            ).filter(value =>
                [
                    'player',
                    'narrative',
                ].includes(value)),
        ),
    ];
    return {
        id:
            normalizeMemoryId(
                source.id,
                `material_${materialFingerprint(
                    materialEffectIdentity(
                        source,
                    ),
                ).slice(0, 40)}`,
            ),
        schemaVersion:
            MATERIAL_STATE_SCHEMA_VERSION,
        category:
            definition.category,
        type: source.type,
        aspect:
            definition.aspect,
        actorId,
        objectTextEn,
        sourceTextEn,
        targetTextEn,
        valueTextEn,
        previousValueTextEn,
        resultTextEn,
        quantity,
        operation,
        slot,
        hand,
        mapId,
        roomId,
        sceneId,
        persistence,
        sourceKinds,
        confidence:
            Math.min(
                1,
                Math.max(
                    0,
                    Number(
                        source.confidence ||
                        0,
                    ),
                ),
            ),
        uieConfidence:
            Math.min(
                1,
                Math.max(
                    0,
                    Number(
                        source
                            .uieConfidence ||
                        0,
                    ),
                ),
            ),
        evidence,
    };
}

export function normalizeMaterialEvents(
    events,
    worldState,
) {
    if (!Array.isArray(events)) {
        return [];
    }
    const accepted = new Map();
    for (
        const source
        of events.slice(0, 24)
    ) {
        const event =
            normalizeMaterialEvent(
                source,
                worldState,
            );
        if (!event) continue;
        const key =
            materialEffectIdentity(event);
        const previous =
            accepted.get(key);
        if (!previous) {
            accepted.set(key, event);
            continue;
        }
        previous.sourceKinds = [
            ...new Set([
                ...previous.sourceKinds,
                ...event.sourceKinds,
            ]),
        ];
        previous.evidence = [
            ...previous.evidence,
            ...event.evidence,
        ].slice(0, 3);
        previous.confidence =
            Math.max(
                previous.confidence,
                event.confidence,
            );
        previous.uieConfidence =
            Math.max(
                previous.uieConfidence,
                event.uieConfidence,
            );
    }
    return [...accepted.values()]
        .slice(0, 24);
}

function materialTargetsOverlap(
    left,
    right,
) {
    const leftTarget =
        materialFingerprint(
            left.targetTextEn ||
            left.objectTextEn,
        );
    const rightTarget =
        materialFingerprint(
            right.targetTextEn ||
            right.objectTextEn,
        );
    return Boolean(
        leftTarget &&
        rightTarget &&
        (
            leftTarget.includes(
                rightTarget,
            ) ||
            rightTarget.includes(
                leftTarget,
            )
        ),
    );
}

function materialObjectsOverlap(
    left,
    right,
) {
    const leftObject =
        materialFingerprint(
            left.objectTextEn,
        );
    const rightObject =
        materialFingerprint(
            right.objectTextEn,
        );
    return Boolean(
        leftObject &&
        rightObject &&
        (
            leftObject.includes(
                rightObject,
            ) ||
            rightObject.includes(
                leftObject,
            )
        ),
    );
}

export function applyMaterialEvents(
    worldState,
    events,
    {
        clock =
        worldState.clock || '',
        turn =
        Number(
            worldState.turn?.count ||
            0,
        ),
    } = {},
) {
    const next =
        structuredClone(worldState);
    const accepted =
        normalizeMaterialEvents(
            events,
            next,
        );
    if (!accepted.length) {
        return next;
    }
    next.materialStateVersion =
        MATERIAL_STATE_SCHEMA_VERSION;
    next.actorPresentations ??= {};
    next.materialEventLog = [
        ...(next.materialEventLog || []),
        ...accepted.map(event => ({
            ...event,
            committedClock: clock,
            committedTurn: turn,
        })),
    ].slice(-200);
    next.map ??= {};
    next.map.roomStates ??= {};
    for (const event of accepted) {
        if (
            event.category ===
                'appearance_change'
        ) {
            if (
                [
                    'accessory_changed',
                    'object_held',
                    'object_released',
                ].includes(
                    event.type,
                )
            ) {
                continue;
            }
            const previous =
                next.actorPresentations[
                    event.actorId
                ] || {};
            const presentation = {
                ...previous,
                updatedClock: clock,
                sourceEventId:
                    event.id,
            };
            if (
                event.type ===
                    'outfit_changed'
            ) {
                presentation.outfitEn =
                    event.operation ===
                        'remove'
                        ? ''
                        : event
                            .valueTextEn;
            } else if (
                event.type ===
                    'hairstyle_changed'
            ) {
                presentation.hairEn =
                    event.valueTextEn;
            } else if (
                event.type ===
                    'appearance_changed'
            ) {
                const conditions = (
                    previous
                        .visibleConditions ||
                    []
                ).filter(condition =>
                    condition.id !==
                    event.id);
                presentation
                    .visibleConditions = [
                        ...conditions,
                        {
                            id: event.id,
                            valueEn:
                                event
                                    .valueTextEn,
                            resultTextEn:
                                event
                                    .resultTextEn,
                            persistence:
                                event
                                    .persistence,
                            sceneId:
                                event.sceneId,
                            committedClock:
                                clock,
                            committedTurn:
                                turn,
                        },
                    ].slice(-8);
            } else if (
                event.type ===
                    'appearance_cleared'
            ) {
                presentation
                    .visibleConditions = (
                        previous
                            .visibleConditions ||
                        []
                    ).filter(condition =>
                        event.valueTextEn &&
                        !materialFingerprint(
                            condition.valueEn,
                        ).includes(
                            materialFingerprint(
                                event
                                    .valueTextEn,
                            ),
                        ));
            }
            next.actorPresentations[
                event.actorId
            ] = presentation;
            continue;
        }
        const roomKey =
            `${event.mapId}:${event.roomId}`;
        const roomState =
            next.map.roomStates[
                roomKey
            ] || {};
        let materialEffects = (
            roomState.materialEffects ||
            []
        ).filter(effect => {
            if (effect.id === event.id) {
                return false;
            }
            if (
                effect.persistence ===
                    'transient' &&
                Number(
                    effect
                        .committedTurn ||
                    0,
                ) < turn
            ) {
                return false;
            }
            if (
                effect.persistence ===
                    'until_scene_end' &&
                effect.sceneId &&
                effect.sceneId !==
                    next.scene?.id
            ) {
                return false;
            }
            return true;
        });
        if (
            [
                'object_moved',
                'object_removed',
            ].includes(event.type)
        ) {
            materialEffects =
                materialEffects.filter(
                    effect =>
                        ![
                            'object_placed',
                            'object_moved',
                        ].includes(
                            effect.type,
                        ) ||
                        !materialObjectsOverlap(
                            effect,
                            event,
                        ),
                );
            if (
                event.type ===
                    'object_removed'
            ) {
                next.map.roomStates[
                    roomKey
                ] = {
                    ...roomState,
                    materialEffects,
                };
                continue;
            }
        }
        if (
            event.type ===
                'scene_repaired'
        ) {
            const matchingDamageIds =
                materialEffects
                    .filter(effect =>
                        effect.type ===
                            'scene_damaged' &&
                        materialTargetsOverlap(
                            effect,
                            event,
                        ))
                    .map(effect =>
                        effect.id);
            if (
                !matchingDamageIds.length
            ) {
                const sameActorDamage =
                    materialEffects
                        .filter(effect =>
                            effect.type ===
                                'scene_damaged' &&
                            effect.actorId ===
                                event.actorId);
                if (
                    sameActorDamage.length ===
                    1
                ) {
                    matchingDamageIds.push(
                        sameActorDamage[0].id,
                    );
                }
            }
            materialEffects =
                materialEffects.filter(
                    effect =>
                        !matchingDamageIds
                            .includes(
                                effect.id,
                            ),
                );
            if (!event.resultTextEn) {
                next.map.roomStates[
                    roomKey
                ] = {
                    ...roomState,
                    materialEffects,
                };
                continue;
            }
        }
        if (
            event.type ===
                'scene_cleaned'
        ) {
            materialEffects =
                materialEffects.filter(
                    effect =>
                        effect.type !==
                            'scene_soiled' ||
                        (
                            !materialTargetsOverlap(
                                effect,
                                event,
                            ) &&
                            !materialObjectsOverlap(
                                effect,
                                event,
                            )
                        ),
                );
            if (!event.resultTextEn) {
                next.map.roomStates[
                    roomKey
                ] = {
                    ...roomState,
                    materialEffects,
                };
                continue;
            }
        }
        const effect = {
            ...event,
            committedClock: clock,
            committedTurn: turn,
            descriptionEn:
                [
                    event.objectTextEn,
                    event.sourceTextEn,
                    event.targetTextEn,
                    event.valueTextEn,
                    event.resultTextEn,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .slice(0, 800),
        };
        next.map.roomStates[
            roomKey
        ] = {
            ...roomState,
            materialEffects: [
                ...materialEffects,
                effect,
            ].slice(-24),
        };
    }
    return next;
}

export function buildCurrentMaterialState(
    worldState = {},
) {
    const mapId =
        worldState.map?.activeMapId ||
        '';
    const roomId =
        worldState.map
            ?.currentLocalNodeId ||
        '';
    const roomKey =
        `${mapId}:${roomId}`;
    const currentTurn =
        Number(
            worldState.turn?.count ||
            0,
        );
    const currentSceneId =
        worldState.scene?.id ||
        '';
    const isActive = entry => {
        if (
            entry.persistence ===
                'transient' &&
            Number(
                entry.committedTurn ||
                0,
            ) < currentTurn
        ) {
            return false;
        }
        if (
            entry.persistence ===
                'until_scene_end' &&
            entry.sceneId &&
            entry.sceneId !==
                currentSceneId
        ) {
            return false;
        }
        return true;
    };
    const currentActorIds = new Set([
        'player',
        ...(worldState.actors || [])
            .filter(actor =>
                actor.present !==
                    false &&
                (
                    !actor.mapId ||
                    actor.mapId ===
                        mapId
                ) &&
                (
                    !actor.roomId ||
                    actor.roomId ===
                        roomId
                ))
            .map(actor =>
                actor.id),
    ]);
    return {
        mapId,
        roomId,
        roomEffects:
            (
                worldState.map
                    ?.roomStates?.[
                        roomKey
                    ]
                    ?.materialEffects ||
                []
            )
                .filter(isActive)
                .slice(-24)
                .map(effect => ({
                    id: effect.id,
                    schemaVersion:
                        effect
                            .schemaVersion,
                    category:
                        effect.category,
                    type: effect.type,
                    operation:
                        effect.operation,
                    aspect:
                        effect.aspect,
                    actorId:
                        effect.actorId,
                    objectTextEn:
                        effect.objectTextEn,
                    sourceTextEn:
                        effect.sourceTextEn,
                    targetTextEn:
                        effect.targetTextEn,
                    valueTextEn:
                        effect.valueTextEn,
                    resultTextEn:
                        effect.resultTextEn,
                    quantity:
                        effect.quantity,
                    persistence:
                        effect.persistence,
                    descriptionEn:
                        effect.descriptionEn,
                    committedClock:
                        effect
                            .committedClock,
                })),
        actorPresentations:
            Object.fromEntries(
                Object.entries(
                    worldState
                        .actorPresentations ||
                    {},
                )
                    .filter(([actorId]) =>
                        currentActorIds.has(
                            actorId,
                        ))
                    .map(
                        ([
                            actorId,
                            presentation,
                        ]) => [
                            actorId,
                            {
                                outfitEn:
                                    presentation
                                        .outfitEn ||
                                    '',
                                accessories:
                                    presentation
                                        .accessories ||
                                    {},
                                hairEn:
                                    presentation
                                        .hairEn ||
                                    '',
                                visibleConditions:
                                    (
                                        presentation
                                            .visibleConditions ||
                                        []
                                    )
                                        .filter(
                                            isActive,
                                        )
                                        .map(
                                            condition =>
                                                condition
                                                    .valueEn ||
                                                condition
                                                    .resultTextEn,
                                        )
                                        .filter(
                                            Boolean,
                                        ),
                                heldItems:
                                    presentation
                                        .heldItems ||
                                    {},
                                heldObjectEn:
                                    presentation
                                        .heldObjectEn ||
                                    '',
                                wornItemIds:
                                    presentation
                                        .wornItemIds ||
                                    [],
                                heldItemIds:
                                    presentation
                                        .heldItemIds ||
                                    [],
                                updatedClock:
                                    presentation
                                        .updatedClock ||
                                    '',
                            },
                        ],
                    ),
            ),
    };
}
