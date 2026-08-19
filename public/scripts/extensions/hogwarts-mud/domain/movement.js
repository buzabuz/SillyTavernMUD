// Extracted from the helpers compatibility facade for Task 4.

import {
    createSceneItemStates,
    normalizeInventoryItem,
    synchronizeHeldItemLocations,
} from './inventory.js';
import {
    findCanonCharacter,
} from '../canon-characters.js';
import {
    getCanonLocalizationZhCn,
} from '../canon-localization.zh-cn.js';

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';
import {
    getInteriorMount,
} from './interior-mount.js';

import {
    findLocalRoomPath,
} from './pathfinding.js';

import {
    findSceneDestination,
    formatSceneLocationId,
} from './scene-destination.js';

import {
    EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN,
    normalizeSpatialText,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

function getExplicitMovementCompanionIds(
    worldState,
    action,
    allowedRoomIds = null,
) {
    const movementText = String(action || '')
        .split(/[\n。！？!?]+/)
        .filter(clause =>
            Boolean(
                findSceneDestination(
                    clause,
                    worldState,
                ),
            ))
        .join(' ');
    if (!movementText) return [];
    const normalizedMovement =
        normalizeSpatialText(movementText);
    const currentMapId = String(
        worldState.map?.activeMapId || '',
    );
    const currentRoomId = String(
        worldState.map?.currentLocalNodeId || '',
    );
    const allowedRooms = new Set(
        Array.isArray(allowedRoomIds) &&
            allowedRoomIds.length
            ? allowedRoomIds
            : [currentRoomId],
    );
    const profiles = new Map(
        (worldState.actorLibrary || []).map(
            profile => [profile.id, profile],
        ),
    );
    return (worldState.actors || [])
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || currentMapId) ===
                currentMapId &&
            allowedRooms.has(
                actor.roomId || currentRoomId,
            ))
        .filter(actor => {
            const profile =
                profiles.get(actor.id) || {};
            const structuralTags =
                (
                    worldState
                        .socialGraph
                        ?.relationships ||
                    []
                )
                    .filter(edge =>
                        (
                            edge.sourceActorId ===
                                actor.id &&
                            edge.targetActorId ===
                                'player'
                        ) ||
                        (
                            edge.sourceActorId ===
                                'player' &&
                            edge.targetActorId ===
                                actor.id
                        ))
                    .flatMap(edge =>
                        edge.structuralTags ||
                        []);
            const family =
                structuralTags.some(tag =>
                    [
                        'family',
                        'parent',
                        'guardian',
                    ].includes(tag));
            const familyAliases =
                family &&
                profile.identity
                    ?.gender?.code ===
                    'male'
                    ? ['爸爸', '我爸', '父亲', 'dad', 'father']
                    : family &&
                        profile.identity
                            ?.gender?.code ===
                            'female'
                        ? ['妈妈', '我妈', '母亲', 'mum', 'mom', 'mother']
                        : [];
            return [
                actor.id,
                profile.nameEn,
                ...(profile.aliases || []),
                ...familyAliases,
            ]
                .map(normalizeSpatialText)
                .filter(alias => alias.length >= 2)
                .some(alias =>
                    normalizedMovement.includes(alias));
        })
        .map(actor => actor.id);
}

export function parseExplicitMovementDirective(
    playerAction,
) {
    const action = String(playerAction || '');
    const match = action.match(
        EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN,
    );
    const destinationText = String(
        match?.[1] || match?.[2] || '',
    ).trim();
    if (
        !match ||
        !destinationText
    ) {
        return null;
    }
    return {
        raw: match[0],
        marker:
            match[0].trim()
                .startsWith('->')
                ? '->'
                : '→',
        destinationText,
        start: match.index,
        end:
            Number(match.index || 0) +
            match[0].length,
    };
}

export function removeExplicitMovementDirective(
    playerAction,
) {
    const action = String(playerAction || '');
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    if (!directive) return action;
    return (
        action.slice(
            0,
            directive.start,
        ) +
        action.slice(
            directive.end,
        )
    )
        .replace(
            /^[ \t]*\n/,
            '',
        )
        .replace(
            /\n{3,}/g,
            '\n\n',
        )
        .trim();
}

function isFollowMovementDirective(
    directive,
) {
    const destinationText =
        String(
            directive?.destinationText ||
            '',
        )
            .normalize('NFKC')
            .trim();
    return /^(?:(?:跟随|跟着|跟)\s*.+|follow\s+.+|go\s+with\s+.+)$/iu
        .test(
            destinationText,
        );
}

function boundedText(
    value,
    maximumLength = 500,
) {
    return String(value || '')
        .normalize('NFC')
        .trim()
        .slice(0, maximumLength);
}

function getCommittedSceneTurns(
    chat,
) {
    return (
        Array.isArray(chat)
            ? chat
            : []
    )
        .map((message, messageId) => ({
            message,
            messageId,
            mud:
                message?.extra
                    ?.hogwartsMud,
        }))
        .filter(entry =>
            entry.message?.is_user !==
                true &&
            entry.mud?.role ===
                'scene_turn' &&
            entry.mud
                .turnTransaction);
}

export function buildFollowMovementContext(
    worldState,
    playerAction,
    chat = [],
) {
    const directive =
        parseExplicitMovementDirective(
            playerAction,
        );
    if (
        !directive ||
        !isFollowMovementDirective(
            directive,
        ) ||
        findSceneDestination(
            directive.destinationText,
            worldState,
        )
    ) {
        return null;
    }
    const mapId =
        String(
            worldState.map
                ?.activeMapId ||
            '',
        );
    const currentRoomId =
        String(
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
    const currentActorIds =
        new Set([
            ...(
                worldState
                    .activeInteractionActorIds ||
                []
            ),
            ...(
                worldState
                    .localPresence
                    ?.occupantActorIds ||
                []
            ),
        ]);
    const committedTurns =
        getCommittedSceneTurns(
            chat,
        );
    const previousTurn =
        committedTurns.at(-1);
    const previousActorUpdates =
        previousTurn
            ?.mud
            ?.turnTransaction
            ?.actorUpdates ||
        [];
    const previousPresentIds =
        new Set(
            previousTurn
                ?.mud
                ?.turnTransaction
                ?.actorPresence
                ?.presentActorIdsAfterTurn ||
            [],
        );
    const priorDepartureIds =
        new Set(
            previousActorUpdates
                .filter(update =>
                    update?.id &&
                    (
                        update.present ===
                            false ||
                        (
                            update.roomId &&
                            update.roomId !==
                                currentRoomId
                        ) ||
                        !previousPresentIds
                            .has(
                                update.id,
                            )
                    ))
                .map(update =>
                    update.id),
        );
    const profiles =
        new Map(
            (
                worldState.actorLibrary ||
                []
            ).map(profile => [
                profile.id,
                profile,
            ]),
        );
    const eligibleIds =
        new Set([
            ...currentActorIds,
            ...priorDepartureIds,
        ]);
    const eligibleGuideCandidates =
        (
            worldState.actors ||
            []
        )
            .filter(actor =>
                eligibleIds.has(
                    actor.id,
                ))
            .slice(0, 16)
            .map(actor => {
                const profile =
                    profiles.get(
                        actor.id,
                    ) ||
                    {};
                const canon =
                    findCanonCharacter(
                        profile
                            .canonCatalogId ||
                        actor.id,
                    ) ||
                    findCanonCharacter(
                        profile.nameEn ||
                        actor.nameEn,
                    );
                const localization =
                    getCanonLocalizationZhCn(
                        canon?.id ||
                        profile
                            .canonCatalogId ||
                        actor.id,
                    );
                const locationKnown =
                    actor.locationKnown !==
                        false &&
                    Boolean(
                        actor.mapId &&
                        actor.roomId,
                    );
                return {
                    id:
                        actor.id,
                    nameEn:
                        boundedText(
                            profile.nameEn ||
                            actor.nameEn ||
                            actor.id,
                            160,
                        ),
                    aliases:
                        [
                            ...new Set(
                                [
                                    ...(
                                        profile.aliases ||
                                        []
                                    ),
                                    localization
                                        ?.nameZh,
                                    ...(
                                        localization
                                            ?.aliases ||
                                        []
                                    ),
                                ]
                                    .map(alias =>
                                        boundedText(
                                            alias,
                                            120,
                                        ))
                                    .filter(Boolean),
                            ),
                        ].slice(0, 4),
                    eligibility:
                        currentActorIds
                            .has(actor.id)
                            ? 'current'
                            : 'prior_departure',
                    locationKnown,
                    mapId:
                        locationKnown
                            ? actor.mapId
                            : '',
                    roomId:
                        locationKnown
                            ? actor.roomId
                            : '',
                };
            });
    const recentGuideEvidence =
        committedTurns
            .slice(-2)
            .map(entry => ({
                sourceRef:
                    `message:${entry.messageId}:publicEventEn`,
                textEn:
                    boundedText(
                        entry.mud
                            ?.turnTransaction
                            ?.publicEventEn,
                    ),
            }))
            .filter(entry =>
                entry.textEn);
    return {
        trigger: {
            raw:
                boundedText(
                    directive.raw,
                    300,
                ),
            destinationText:
                boundedText(
                    directive
                        .destinationText,
                    200,
                ),
            start:
                directive.start,
            end:
                directive.end,
        },
        mapId,
        currentRoomId,
        eligibleGuideCandidates,
        recentGuideEvidence,
    };
}

export function inspectPlayerMovementIntent(
    worldState,
    playerAction,
    options = {},
) {
    const action = String(playerAction || '');
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    const destination =
        findSceneDestination(
            directive?.destinationText ||
                action,
            worldState,
        );
    const guided =
        options.guided === true ||
        Boolean(
            options
                .guidedDestination,
        ) ||
        Boolean(
            options
                .guidedByActorId,
        );
    const candidate = Boolean(
        directive ||
        destination ||
        guided,
    );
    return {
        explicit: Boolean(directive),
        directive,
        destination,
        guided,
        candidate,
        confirmationRequired:
            candidate &&
            !directive,
    };
}

function movementFailure(
    worldState,
    reason,
    details = {},
) {
    const mapId =
        String(
            worldState.map
                ?.activeMapId ||
            '',
        );
    const roomId =
        String(
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
    return {
        state:
            worldState,
        movement: {
            attempted: true,
            moved: false,
            fromMapId:
                mapId,
            fromRoomId:
                roomId,
            confirmed: true,
            confirmationSource:
                'player_marker',
            reason,
            ...details,
        },
    };
}

function findMovementEvidence(
    context,
    sourceRef,
    evidenceText,
    room,
) {
    const ref =
        String(
            sourceRef ||
            '',
        );
    const evidence =
        String(
            evidenceText ||
            '',
        );
    if (
        !ref ||
        !evidence
    ) {
        return false;
    }
    const sourceMatches = (
        context
            ?.recentGuideEvidence ||
        []
    ).some(entry =>
        entry.sourceRef ===
            ref &&
        entry.textEn
            .includes(evidence));
    if (!sourceMatches) {
        return false;
    }
    const normalizedEvidence =
        evidence
            .normalize('NFKC')
            .toLocaleLowerCase();
    return [
        room?.id,
        room?.nameEn,
        ...(room?.aliases || []),
    ]
        .map(label =>
            String(label || '')
                .normalize('NFKC')
                .toLocaleLowerCase()
                .trim())
        .filter(label =>
            label.length >= 2)
        .some(label =>
            normalizedEvidence
                .includes(label));
}

function intentEvidenceNamesGuide(
    evidenceText,
    guide,
) {
    const normalizedEvidence =
        String(
            evidenceText ||
            '',
        )
            .normalize('NFKC')
            .toLocaleLowerCase();
    return [
        guide?.nameEn,
        ...(guide?.aliases || []),
    ]
        .map(label =>
            String(label || '')
                .normalize('NFKC')
                .toLocaleLowerCase()
                .trim())
        .filter(label =>
            label.length >= 2)
        .some(label =>
            normalizedEvidence
                .includes(label));
}

export function settleFollowMovementIntent(
    worldState,
    playerAction,
    movementContext,
    movementIntent,
    diagnostics = {},
) {
    if (!movementContext) {
        return {
            state:
                worldState,
            movement: null,
        };
    }
    if (
        diagnostics?.fallback ===
        true
    ) {
        return movementFailure(
            worldState,
            'movement_semantic_unavailable',
            {
                guided: true,
            },
        );
    }
    if (
        diagnostics
            ?.movementIntentRejected ===
        true
    ) {
        return movementFailure(
            worldState,
            'movement_schema_invalid',
            {
                guided: true,
            },
        );
    }
    if (
        movementIntent
            ?.requested !==
        true
    ) {
        return movementFailure(
            worldState,
            'destination_unknown',
            {
                guided: true,
            },
        );
    }
    const intentEvidenceText =
        String(
            movementIntent
                .intentEvidenceText ||
            '',
        );
    if (
        !intentEvidenceText ||
        !String(
            playerAction ||
            '',
        ).includes(
            intentEvidenceText,
        )
    ) {
        return movementFailure(
            worldState,
            'guide_evidence_invalid',
            {
                guided: true,
            },
        );
    }
    const guide =
        (
            movementContext
                .eligibleGuideCandidates ||
            []
        ).find(candidate =>
            candidate.id ===
                movementIntent
                    .guideActorId);
    if (!guide) {
        return movementFailure(
            worldState,
            'guide_not_eligible',
            {
                guided: true,
            },
        );
    }
    const namedGuides =
        (
            movementContext
                .eligibleGuideCandidates ||
            []
        ).filter(candidate =>
            intentEvidenceNamesGuide(
                intentEvidenceText,
                candidate,
            ));
    if (
        namedGuides.length !== 1 ||
        namedGuides[0].id !==
            guide.id
    ) {
        return movementFailure(
            worldState,
            'guide_evidence_invalid',
            {
                guided: true,
                guidedByActorId:
                    guide.id,
            },
        );
    }
    const currentRoomId =
        movementContext
            .currentRoomId;
    const authoritativeGuideRoomId =
        guide.locationKnown &&
        guide.mapId ===
            movementContext.mapId &&
        guide.roomId !==
            currentRoomId
            ? guide.roomId
            : '';
    const proposedRoomId =
        String(
            movementIntent
                .destinationRoomId ||
            '',
        );
    if (
        authoritativeGuideRoomId &&
        proposedRoomId &&
        proposedRoomId !==
            authoritativeGuideRoomId
    ) {
        return movementFailure(
            worldState,
            'destination_conflict',
            {
                guided: true,
                guidedByActorId:
                    guide.id,
            },
        );
    }
    const destinationRoomId =
        authoritativeGuideRoomId ||
        proposedRoomId;
    if (!destinationRoomId) {
        return movementFailure(
            worldState,
            'destination_unknown',
            {
                guided: true,
                guidedByActorId:
                    guide.id,
            },
        );
    }
    const room =
        getMapRooms(
            getLocalMapDefinition(
                movementContext.mapId,
                worldState.map,
            ),
            worldState.map,
        ).find(candidate =>
            candidate.id ===
                destinationRoomId);
    if (!room) {
        return movementFailure(
            worldState,
            'destination_invalid',
            {
                guided: true,
                guidedByActorId:
                    guide.id,
            },
        );
    }
    if (
        !authoritativeGuideRoomId &&
        !findMovementEvidence(
            movementContext,
            movementIntent
                .destinationEvidenceSourceRef,
            movementIntent
                .destinationEvidenceText,
            room,
        )
    ) {
        return movementFailure(
            worldState,
            'guide_evidence_invalid',
            {
                guided: true,
                guidedByActorId:
                    guide.id,
            },
        );
    }
    const settled =
        applyPlayerMovement(
        worldState,
        playerAction,
        {
            guided: true,
            guidedByActorId:
                guide.id,
            guidedDestination: {
                mapId:
                    movementContext
                        .mapId,
                roomId:
                    room.id,
                roomNameEn:
                    room.nameEn ||
                    room.id,
                levelId:
                    room.levelId,
            },
            companionIds: [
                guide.id,
            ],
        },
    );
    if (
        settled.movement?.moved !==
        true
    ) {
        return settled;
    }
    const next =
        structuredClone(
            settled.state,
        );
    next.actors =
        (
            next.actors ||
            []
        ).map(actor =>
            actor.id ===
                guide.id &&
            actor.mapId ===
                settled.movement
                    .toMapId &&
            actor.roomId ===
                settled.movement
                    .toRoomId
                ? {
                    ...actor,
                    present: true,
                }
                : actor);
    next.activeInteractionActorIds =
        [...new Set([
            ...(
                next
                    .activeInteractionActorIds ||
                []
            ),
            guide.id,
        ])];
    next.localPresence = {
        ...(next.localPresence || {}),
        mapId:
            settled.movement
                .toMapId,
        roomId:
            settled.movement
                .toRoomId,
        occupantActorIds:
            [...new Set([
                ...(
                    next.localPresence
                        ?.occupantActorIds ||
                    []
                ),
                guide.id,
            ])],
        updatedTurn:
            Number(
                next.turn?.count ||
                0,
            ),
        source:
            'player_follow_movement',
    };
    return {
        state: next,
        movement: {
            ...settled.movement,
            companionIds:
                [...new Set([
                    ...(
                        settled
                            .movement
                            .companionIds ||
                        []
                    ),
                    guide.id,
                ])],
        },
    };
}

export function applyPlayerMovement(
    worldState,
    playerAction,
    options = {},
) {
    const action = String(playerAction || '');
    const intent =
        inspectPlayerMovementIntent(
            worldState,
            action,
            options,
        );
    const confirmedDestination =
        options.confirmedDestination
            ? structuredClone(
                options
                    .confirmedDestination,
            )
            : null;
    const confirmed =
        intent.explicit ||
        options.confirmed === true ||
        Boolean(
            confirmedDestination,
        );
    if (!confirmed) {
        return {
            state: worldState,
            movement: null,
        };
    }
    const requestedDestination =
        confirmedDestination ||
        intent.destination;
    const guided = intent.guided;
    const rawDestination =
        requestedDestination ||
        (
            guided &&
            options.guidedDestination
                ? structuredClone(
                    options.guidedDestination,
                )
                : null
        );
    const destinationMap =
        rawDestination
            ? getLocalMapDefinition(
                rawDestination.mapId,
                worldState.map,
            )
            : null;
    const destinationRoom =
        rawDestination
            ? getMapRooms(
                destinationMap,
                worldState.map,
            ).find(room =>
                room.id ===
                    rawDestination.roomId)
            : null;
    const catalogDestination =
        rawDestination
            ? findSceneDestination(
                rawDestination.roomId,
                worldState,
            )
            : null;
    const catalogRoomNameEn =
        catalogDestination &&
        catalogDestination.mapId ===
            rawDestination?.mapId
            ? catalogDestination
                .roomNameEn
            : '';
    const suppliedRoomNameEn =
        String(
            rawDestination
                ?.roomNameEn || '',
        );
    const destination =
        rawDestination
            ? {
                ...rawDestination,
                roomName:
                    destinationRoom
                        ?.nameEn ||
                    formatSceneLocationId(
                        destinationRoom
                            ?.id,
                    ),
                roomNameEn:
                    destinationRoom?.nameEn ||
                    (
                        /[a-z]/i.test(
                            suppliedRoomNameEn,
                        )
                            ? suppliedRoomNameEn
                            : catalogRoomNameEn
                    ) ||
                    formatSceneLocationId(
                        destinationRoom?.id,
                    ),
                levelId:
                    rawDestination.levelId ||
                    destinationRoom?.levelId,
            }
            : null;
    const guidance = guided
        ? {
            guided: true,
            guidedByActorId:
                options.guidedByActorId || '',
            destinationSource:
                intent.explicit &&
                    requestedDestination
                    ? 'player_marker'
                    : confirmedDestination
                        ? 'stored_confirmation'
                        : destination
                            ? 'guide_context'
                            : 'unresolved',
        }
        : {};
    const confirmation = {
        confirmed: true,
        confirmationSource:
            intent.explicit
                ? 'player_marker'
                : confirmedDestination
                    ? 'stored_movement'
                    : 'internal',
    };
    if (!destination) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                ...confirmation,
                ...guidance,
                reason: guided
                    ? 'guide_destination_unknown'
                    : 'no_known_destination',
            },
        };
    }
    const mapId = String(worldState.map?.activeMapId || '');
    const fromRoomId = String(worldState.map?.currentLocalNodeId || '');
    const structuredCompanionIds =
        Array.isArray(
            options.companionIds,
        )
            ? new Set(
                options
                    .companionIds
                    .map(id =>
                        String(id || ''))
                    .filter(Boolean),
            )
            : null;
    let companionIds =
        structuredCompanionIds
            ? (
                worldState.actors ||
                []
            )
                .filter(actor =>
                    actor.present !==
                        false &&
                    structuredCompanionIds
                        .has(actor.id))
                .map(actor =>
                    actor.id)
            : getExplicitMovementCompanionIds(
                worldState,
                action,
            );
    const sourceMap = getLocalMapDefinition(
        mapId,
        worldState.map,
    );
    const sourceRoom = getMapRooms(
        sourceMap,
        worldState.map,
    ).find(room => room.id === fromRoomId);
    const destinationNameEn =
        destination.roomNameEn ||
        destination.roomId;
    if (destination.mapId !== mapId) {
        const sourceMount =
            getInteriorMount(
                sourceMap,
            );
        const destinationMount =
            getInteriorMount(
                destinationMap,
            );
        const exitsBoundInterior =
            Boolean(
                sourceMount,
            ) &&
            sourceMount.parentMapId ===
                destination.mapId &&
            sourceMap.id ===
                mapId;
        const entersBoundInterior =
            Boolean(
                destinationMount,
            ) &&
            destinationMount
                .parentMapId ===
                mapId &&
            destinationMap.id ===
                destination.mapId;
        const bridgeMapId =
            exitsBoundInterior
                ? destination.mapId
                : entersBoundInterior
                    ? mapId
                    : '';
        const bridgeFromRoomId =
            exitsBoundInterior
                ? sourceMount
                    .parentRoomId
                : fromRoomId;
        const bridgeToRoomId =
            exitsBoundInterior
                ? destination.roomId
                : destinationMount
                    ?.parentRoomId;
        const bridgePath =
            bridgeMapId &&
            bridgeFromRoomId &&
            bridgeToRoomId
                ? bridgeFromRoomId ===
                    bridgeToRoomId
                    ? {
                        roomIds: [
                            bridgeFromRoomId,
                        ],
                        routes: [],
                        minutes: 0,
                    }
                    : findLocalRoomPath(
                        bridgeMapId,
                        bridgeFromRoomId,
                        bridgeToRoomId,
                        worldState.map,
                        {
                            allowedConditions: [
                                'wizard_intent',
                            ],
                        },
                    )
                : null;
        if (
            (
                exitsBoundInterior ||
                entersBoundInterior
            ) &&
            bridgePath
        ) {
            const next =
                structuredClone(
                    worldState,
                );
            const routeRoomIds = [
                ...(exitsBoundInterior
                    ? [fromRoomId]
                    : []),
                ...bridgePath.roomIds,
                ...(entersBoundInterior
                    ? [
                        destination
                            .roomId,
                    ]
                    : []),
            ].filter((roomId, index, rooms) =>
                roomId &&
                roomId !==
                    rooms[index - 1]);
            next.map.activeMapId =
                destination.mapId;
            next.map.currentLocalNodeId =
                destination.roomId;
            next.map.currentLevelId =
                destination.levelId ||
                destinationMap
                    ?.defaultLevelId;
            next.map.discoveredLocalNodeIds =
                [...new Set([
                    ...(
                        next.map
                            .discoveredLocalNodeIds ||
                        []
                    ),
                    `${destination.mapId}:${destination.roomId}`,
                ])];
            if (next.scene) {
                next.scene.mapId =
                    destination.mapId;
                next.scene.roomId =
                    destination.roomId;
            }
            if (companionIds.length) {
                const companions =
                    new Set(
                        companionIds,
                    );
                next.actors =
                    (next.actors || [])
                        .map(actor =>
                            companions
                                .has(
                                    actor.id,
                                ) &&
                            (
                                actor.mapId ||
                                mapId
                            ) === mapId &&
                            (
                                actor.roomId ||
                                fromRoomId
                            ) === fromRoomId
                                ? {
                                    ...actor,
                                    mapId:
                                        destination
                                            .mapId,
                                    roomId:
                                        destination
                                            .roomId,
                                }
                                : actor);
            }
            next.items =
                synchronizeHeldItemLocations(
                    next.items,
                    {
                        playerMapId:
                            destination
                                .mapId,
                        playerRoomId:
                            destination
                                .roomId,
                        actors:
                            next.actors,
                        clock:
                            next.clock,
                    },
                );
            if (next.scene) {
                next.scene.itemStates =
                    createSceneItemStates(
                        next.items,
                        {
                            mapId:
                                destination
                                    .mapId,
                            roomId:
                                destination
                                    .roomId,
                        },
                    );
            }
            const movement = {
                attempted: true,
                moved: true,
                fromMapId: mapId,
                fromRoomId,
                toMapId:
                    destination.mapId,
                toRoomId:
                    destination.roomId,
                fromRoomName:
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn:
                    destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                path: routeRoomIds,
                minutes: Math.max(
                    1,
                    Number(
                        bridgePath.minutes ||
                        0,
                    ),
                ),
                bridge:
                    exitsBoundInterior
                        ? 'interior_to_parent'
                        : 'parent_to_interior',
                committedAt:
                    new Date()
                        .toISOString(),
            };
            next.spatial = {
                ...(next.spatial || {}),
                version:
                    SPATIAL_STATE_VERSION,
                player: {
                    mapId:
                        destination.mapId,
                    roomId:
                        destination.roomId,
                },
                lastMovement:
                    movement,
            };
            return {
                state: next,
                movement,
            };
        }
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                requiresSceneTransition: true,
                fromMapId: mapId,
                fromRoomId,
                toMapId: destination.mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                reason: 'different_local_map',
            },
        };
    }
    const allowedConditions = [
        'wizard_intent',
    ];
    const hasSchoolTravelAuthority =
        (worldState.items || []).some(
            (
                source,
                index,
            ) => {
                const item =
                    normalizeInventoryItem(
                        source,
                        index,
                    );
                return item.holderId ===
                    'player' &&
                ![
                    'consumed',
                    'lost',
                    'destroyed',
                ].includes(
                    item.state,
                ) &&
                item.id ===
                    'acceptance_letter';
            },
        );
    if (
        [
            fromRoomId,
            destination.roomId,
        ].includes(
            'hogwarts_express',
        ) &&
        hasSchoolTravelAuthority
    ) {
        allowedConditions.push(
            'valid_school_travel',
        );
    }
    const path = findLocalRoomPath(
        mapId,
        fromRoomId,
        destination.roomId,
        worldState.map,
        { allowedConditions },
    );
    if (!path) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                fromMapId: mapId,
                fromRoomId,
                toMapId: destination.mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                reason: 'no_passable_route',
            },
        };
    }
    if (!structuredCompanionIds) {
        companionIds =
            getExplicitMovementCompanionIds(
                worldState,
                action,
                path.roomIds,
            );
    }
    if (options.guidedByActorId) {
        const guide = (worldState.actors || [])
            .find(actor =>
                actor.id ===
                    options.guidedByActorId);
        if (
            guide &&
            (guide.mapId || mapId) === mapId &&
            path.roomIds.includes(
                guide.roomId || fromRoomId,
            )
        ) {
            companionIds = [...new Set([
                ...companionIds,
                guide.id,
            ])];
        }
    }
    if (fromRoomId === destination.roomId) {
        return {
            state: worldState,
            movement: {
                attempted: true,
                moved: false,
                fromMapId: mapId,
                fromRoomId,
                toMapId: mapId,
                toRoomId: destination.roomId,
                fromRoomName:
                    sourceRoom?.nameEn ||
                    fromRoomId,
                toRoomName:
                    destination.roomNameEn ||
                    destination.roomId,
                toRoomNameEn: destinationNameEn,
                companionIds,
                ...confirmation,
                ...guidance,
                path: path.roomIds,
                minutes: 0,
                reason: 'already_there',
            },
        };
    }
    const next = structuredClone(worldState);
    next.map.currentLocalNodeId = destination.roomId;
    next.map.currentLevelId = destination.levelId ||
        getLocalMapDefinition(mapId, next.map)?.defaultLevelId;
    next.map.discoveredLocalNodeIds = [...new Set([
        ...(next.map.discoveredLocalNodeIds || []),
        `${mapId}:${destination.roomId}`,
    ])];
    if (next.scene) {
        next.scene.roomId = destination.roomId;
    }
    if (companionIds.length) {
        const companions = new Set(companionIds);
        const routeRooms = new Set(path.roomIds);
        next.actors = (next.actors || []).map(actor =>
            companions.has(actor.id) &&
            (actor.mapId || mapId) === mapId &&
            routeRooms.has(actor.roomId || fromRoomId)
                ? {
                    ...actor,
                    mapId,
                    roomId: destination.roomId,
                }
                : actor);
    }
    next.items =
        synchronizeHeldItemLocations(
            next.items,
            {
                playerMapId:
                    mapId,
                playerRoomId:
                    destination.roomId,
                actors:
                    next.actors,
                clock:
                    next.clock,
            },
        );
    if (next.scene) {
        next.scene.itemStates =
            createSceneItemStates(
                next.items,
                {
                    mapId,
                    roomId:
                        destination.roomId,
                },
            );
    }
    const movement = {
        attempted: true,
        moved: true,
        fromMapId: mapId,
        fromRoomId,
        toMapId: mapId,
        toRoomId: destination.roomId,
        fromRoomName:
            sourceRoom?.nameEn ||
            fromRoomId,
        toRoomName:
            destination.roomNameEn ||
            destination.roomId,
        toRoomNameEn: destinationNameEn,
        companionIds,
        ...confirmation,
        ...guidance,
        path: path.roomIds,
        minutes: path.minutes,
        committedAt: new Date().toISOString(),
    };
    next.spatial = {
        ...(next.spatial || {}),
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId,
            roomId: destination.roomId,
        },
        lastMovement: movement,
    };
    return { state: next, movement };
}

export function resolvePlayerMovement(
    worldState,
    playerAction,
    storedMovement = null,
    options = {},
) {
    if (storedMovement?.moved !== true) {
        return applyPlayerMovement(
            worldState,
            playerAction,
            options,
        );
    }

    const correctedGuidedDestination =
        storedMovement.guided === true &&
        storedMovement.destinationSource ===
            'guide_context' &&
        options.guidedDestination &&
        (
            options.guidedDestination.mapId !==
                storedMovement.toMapId ||
            options.guidedDestination.roomId !==
                storedMovement.toRoomId
        );
    const replayBase = structuredClone(worldState);
    replayBase.map ??= {};
    replayBase.map.activeMapId =
        storedMovement.fromMapId ||
        replayBase.map.activeMapId;
    replayBase.map.currentLocalNodeId =
        storedMovement.fromRoomId ||
        replayBase.map.currentLocalNodeId;
    replayBase.spatial = {
        ...(replayBase.spatial || {}),
        player: {
            mapId:
                replayBase.map.activeMapId,
            roomId:
                replayBase.map.currentLocalNodeId,
        },
    };
    if (correctedGuidedDestination) {
        const staleCompanionIds = new Set([
            ...(storedMovement.companionIds || []),
            storedMovement.guidedByActorId,
        ].filter(Boolean));
        replayBase.actors = (
            replayBase.actors || []
        ).map(actor =>
            staleCompanionIds.has(actor.id) &&
            (actor.mapId ||
                storedMovement.toMapId) ===
                storedMovement.toMapId &&
            (actor.roomId ||
                storedMovement.toRoomId) ===
                storedMovement.toRoomId
                ? {
                    ...actor,
                    mapId:
                        storedMovement.fromMapId,
                    roomId:
                        storedMovement.fromRoomId,
                }
                : actor);
    }
    const replayDestination =
        correctedGuidedDestination
            ? options.guidedDestination
            : {
                mapId:
                    storedMovement.toMapId,
                roomId:
                    storedMovement.toRoomId,
                roomName:
                    storedMovement.toRoomName,
                roomNameEn:
                    storedMovement.toRoomNameEn,
            };
    const replayed = applyPlayerMovement(
        replayBase,
        playerAction,
        {
            ...options,
            confirmed: true,
            confirmedDestination:
                replayDestination,
        },
    );
    if (
        correctedGuidedDestination &&
        replayed.movement?.moved === true &&
        replayed.movement.toMapId ===
            options.guidedDestination.mapId &&
        replayed.movement.toRoomId ===
            options.guidedDestination.roomId
    ) {
        return replayed;
    }
    const sameDestination =
        replayed.movement?.moved === true &&
        replayed.movement.toMapId ===
            storedMovement.toMapId &&
        replayed.movement.toRoomId ===
            storedMovement.toRoomId;
    if (sameDestination) {
        return {
            state: replayed.state,
            movement: {
                ...structuredClone(storedMovement),
                ...replayed.movement,
                companionIds: [...new Set([
                    ...(storedMovement.companionIds || []),
                    ...(replayed.movement.companionIds || []),
                ])],
                committedAt:
                    storedMovement.committedAt ||
                    replayed.movement.committedAt,
            },
        };
    }

    const alreadyCommitted =
        worldState.map?.activeMapId ===
            storedMovement.toMapId &&
        worldState.map?.currentLocalNodeId ===
            storedMovement.toRoomId;
    if (alreadyCommitted) {
        return {
            state: worldState,
            movement:
                structuredClone(storedMovement),
        };
    }
    return applyPlayerMovement(
        worldState,
        playerAction,
        {
            ...options,
            confirmed: true,
            confirmedDestination:
                replayDestination,
        },
    );
}
