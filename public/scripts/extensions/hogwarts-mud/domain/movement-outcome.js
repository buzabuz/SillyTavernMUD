import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';
import {
    formatSceneLocationId,
} from './scene-destination.js';

function boundedText(
    value,
) {
    return String(value || '')
        .normalize('NFC')
        .trim()
        .slice(0, 500);
}

function movementRoomNameEn(
    worldState,
    mapId,
    roomId,
) {
    const map =
        getLocalMapDefinition(
            mapId,
            worldState.map,
        );
    return getMapRooms(
        map,
        worldState.map,
    ).find(room =>
        room.id ===
            roomId)
        ?.nameEn ||
        formatSceneLocationId(
            roomId,
        ) ||
        'the current room';
}

function movementGuideNameEn(
    worldState,
    actorId,
) {
    return (
        worldState.actorLibrary ||
        []
    ).find(actor =>
        actor.id ===
            actorId)
        ?.nameEn ||
        'the selected guide';
}

function normalizeMovementReason(
    reason,
) {
    return {
        no_known_destination:
            'destination_unknown',
        guide_destination_unknown:
            'destination_unknown',
        no_passable_route:
            'route_blocked',
        different_local_map:
            'different_map',
    }[
        String(reason || '')
    ] ||
        String(
            reason ||
            'movement_failed',
        );
}

export function createMovementOutcome(
    worldState,
    movement,
    {
        mode = 'direct_room',
        evidenceSourceRef = '',
        evidenceText = '',
    } = {},
) {
    if (!movement?.attempted) {
        return null;
    }
    const fromMapId =
        String(
            movement.fromMapId ||
            worldState.map
                ?.activeMapId ||
            '',
        );
    const fromRoomId =
        String(
            movement.fromRoomId ||
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
    const status =
        movement.moved ===
            true
            ? 'moved'
            : movement.reason ===
                'already_there'
                ? 'already_there'
                : 'failed';
    const reasonCode =
        status ===
            'moved'
            ? 'none'
            : status ===
                'already_there'
                ? 'already_there'
                : normalizeMovementReason(
                    movement.reason,
                );
    const remainingMapId =
        status ===
            'moved'
            ? String(
                movement.toMapId ||
                fromMapId,
            )
            : fromMapId;
    const remainingRoomId =
        status ===
            'moved'
            ? String(
                movement.toRoomId ||
                fromRoomId,
            )
            : fromRoomId;
    const currentRoomNameEn =
        movementRoomNameEn(
            worldState,
            fromMapId,
            fromRoomId,
        );
    const requestedRoomNameEn =
        movement.toRoomId
            ? movementRoomNameEn(
                worldState,
                movement.toMapId ||
                    fromMapId,
                movement.toRoomId,
            )
            : 'the requested destination';
    const guideNameEn =
        movementGuideNameEn(
            worldState,
            movement
                .guidedByActorId,
        );
    const subject =
        movement.guided ===
            true
            ? `follow ${guideNameEn}`
            : `reach ${requestedRoomNameEn}`;
    const reasonEn = {
        movement_semantic_unavailable:
            'the local movement interpreter was unavailable',
        movement_schema_invalid:
            'the movement request could not be validated',
        guide_not_eligible:
            'the selected guide was not available to follow',
        guide_evidence_invalid:
            'the guide or destination evidence was not valid',
        destination_unknown:
            'the destination was unknown',
        destination_conflict:
            'the available destination evidence conflicted',
        destination_invalid:
            'the requested destination was not an existing room',
        different_map:
            'the destination required a separate scene transition',
        route_blocked:
            'no passable route was available',
        movement_failed:
            'the movement could not be completed',
    }[reasonCode] ||
        'the movement could not be completed';
    const movementOutcomeFactEn =
        status ===
            'failed'
            ? `The player tried to ${subject}, but ${reasonEn}, so the player remained in ${currentRoomNameEn}.`
            : status ===
                'already_there'
                ? `The player was already in ${currentRoomNameEn}, so no travel occurred.`
                : '';
    return {
        version: 1,
        attempted: true,
        moved:
            status ===
            'moved',
        status,
        mode:
            movement.guided ===
                true
                ? 'follow_actor'
                : mode,
        guideActorId:
            String(
                movement
                    .guidedByActorId ||
                '',
            ),
        fromMapId,
        fromRoomId,
        toMapId:
            String(
                movement.toMapId ||
                '',
            ),
        toRoomId:
            String(
                movement.toRoomId ||
                '',
            ),
        toRoomName:
            String(
                movement.toRoomName ||
                '',
            ),
        toRoomNameEn:
            String(
                movement.toRoomNameEn ||
                movement.toRoomName ||
                '',
            ),
        remainingMapId,
        remainingRoomId,
        reasonCode,
        evidenceSourceRef:
            String(
                evidenceSourceRef ||
                '',
            ),
        evidenceText:
            boundedText(
                evidenceText,
            ),
        minutes:
            status ===
                'moved'
                ? Math.max(
                    15,
                    Number(
                        movement.minutes ||
                        0,
                    ) ||
                    15,
                )
                : 15,
        companionIds:
            Array.isArray(
                movement.companionIds,
            )
                ? [...movement
                    .companionIds]
                : [],
        path:
            Array.isArray(
                movement.path,
            )
                ? [...movement.path]
                : [],
        guided:
            movement.guided ===
            true,
        guidedByActorId:
            String(
                movement
                    .guidedByActorId ||
                '',
            ),
        movementOutcomeFactEn,
    };
}

export function ensureMovementOutcomeFact(
    payload,
    movementOutcome,
) {
    const fact =
        String(
            movementOutcome
                ?.movementOutcomeFactEn ||
            '',
        ).trim();
    if (
        !fact ||
        movementOutcome.status ===
            'moved'
    ) {
        return payload;
    }
    const segments =
        Array.isArray(
            payload?.segments,
        )
            ? payload.segments
            : [];
    if (
        segments.some(segment =>
            segment?.type ===
                'narration' &&
            String(
                segment.textEn ||
                '',
            ).includes(fact))
    ) {
        return payload;
    }
    return {
        ...payload,
        segments: [
            {
                type:
                    'narration',
                textEn:
                    fact,
            },
            ...segments,
        ],
    };
}
