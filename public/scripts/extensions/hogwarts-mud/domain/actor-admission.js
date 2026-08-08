// Extracted from the helpers compatibility facade for Task 4.

import {
    PRESET_LOCATION_ACTORS,
} from '../map-pack.js';

import {
    buildActorNameAliases,
} from './actor-identity.js';

import {
    normalizeActorMemoryProfile,
} from './actor-memory.js';

import {
    findLocalRoomPath,
} from './pathfinding.js';

export function admitCurrentLocationResidents(
    worldState,
    {
        mapId =
        worldState.map
            ?.activeMapId,
        roomId =
        worldState.map
            ?.currentLocalNodeId,
        activate = true,
    } = {},
) {
    const residents = Object.values(
        PRESET_LOCATION_ACTORS,
    ).filter(actor =>
        actor.homeMapId === mapId &&
        actor.homeRoomId === roomId);
    if (!residents.length) {
        return {
            state: worldState,
            admittedActorIds: [],
        };
    }

    const next = structuredClone(worldState);
    next.actorLibrary ??= [];
    next.actors ??= [];
    const admittedActorIds = [];
    let changed = false;
    residents.forEach(resident => {
        let profile = next.actorLibrary
            .find(actor =>
                actor.id === resident.id);
        if (!profile) {
            profile = normalizeActorMemoryProfile(
                structuredClone(resident),
            );
            next.actorLibrary.push(profile);
            changed = true;
        }
        if (
            profile.lifeStatus === 'dead' &&
            profile.lifeStatusPermanent
        ) {
            return;
        }
        if (
            !profile
                .firstImpressionOfPlayerEn &&
            !profile
                .firstImpressionPending
        ) {
            profile =
                normalizeActorMemoryProfile({
                    ...profile,
                    introducedClock:
                        profile.introducedClock ||
                        next.clock,
                    introducedTurn:
                        profile.introducedTurn ??
                        Number(
                            next.turn?.count ||
                            0,
                        ),
                    firstImpressionPending:
                        true,
                }, {
                    ...profile,
                    present: true,
                });
            const profileIndex =
                next.actorLibrary.findIndex(
                    actor =>
                        actor.id ===
                        profile.id,
                );
            next.actorLibrary[
                profileIndex
            ] = profile;
            changed = true;
        }

        const actorIndex = next.actors
            .findIndex(actor =>
                actor.id === resident.id);
        if (actorIndex < 0) {
            next.actors.push({
                id: profile.id,
                nameEn: profile.nameEn,
                name:
                    profile.name ||
                    profile.nameEn,
                roleEn: profile.roleEn,
                role:
                    profile.role ||
                    profile.roleEn,
                relationshipToPlayerEn:
                    profile
                        .relationshipToPlayerEn,
                relationshipToPlayer:
                    profile
                        .relationshipToPlayer ||
                    profile
                        .relationshipToPlayerEn,
                impressionOfPlayerEn:
                    profile.impressionOfPlayerEn,
                impressionOfPlayer:
                    profile.impressionOfPlayer ||
                    profile.impressionOfPlayerEn,
                impressionUpdatedClock: '',
                impressionUpdatedTurn: 0,
                firstImpressionOfPlayerEn:
                    profile
                        .firstImpressionOfPlayerEn,
                firstImpressionOfPlayer:
                    profile
                        .firstImpressionOfPlayer,
                firstImpressionClock:
                    profile
                        .firstImpressionClock,
                firstImpressionTurn:
                    profile
                        .firstImpressionTurn,
                firstImpressionPending:
                    profile
                        .firstImpressionPending,
                publicDescriptionEn:
                    profile.publicDescriptionEn,
                currentActivityEn:
                    resident.currentActivityEn,
                currentActivity:
                    resident.currentActivity ||
                    resident.currentActivityEn,
                currentIntentEn:
                    resident.currentIntentEn,
                currentIntent:
                    resident.currentIntent ||
                    resident.currentIntentEn,
                present:
                    Boolean(
                        activate,
                    ),
                lifeStatus: 'alive',
                lifeStatusPermanent: false,
                lifeStatusDetailEn: 'Alive.',
                lifeStatusDetail: '存活。',
                lifeStatusSinceClock: '',
                mapId,
                roomId,
                source:
                    'preset_location_resident',
            });
            admittedActorIds.push(
                resident.id,
            );
            changed = true;
            return;
        }

        const actor =
            next.actors[actorIndex];
        if (
            activate &&
            actor.present === false &&
            actor.lifeStatus !== 'dead' &&
            (actor.mapId || mapId) === mapId &&
            (actor.roomId || roomId) === roomId
        ) {
            next.actors[actorIndex] = {
                ...actor,
                present: true,
                currentActivityEn:
                    resident.currentActivityEn,
                currentActivity:
                    resident.currentActivity ||
                    resident.currentActivityEn,
                currentIntentEn:
                    resident.currentIntentEn,
                currentIntent:
                    resident.currentIntent ||
                    resident.currentIntentEn,
                firstImpressionOfPlayerEn:
                    profile
                        .firstImpressionOfPlayerEn,
                firstImpressionOfPlayer:
                    profile
                        .firstImpressionOfPlayer,
                firstImpressionClock:
                    profile
                        .firstImpressionClock,
                firstImpressionTurn:
                    profile
                        .firstImpressionTurn,
                firstImpressionPending:
                    profile
                        .firstImpressionPending,
            };
            admittedActorIds.push(
                resident.id,
            );
            changed = true;
        }
    });

    return {
        state: changed ? next : worldState,
        admittedActorIds,
    };
}

export function admitMentionedKnownActors(
    worldState,
    playerAction,
) {
    const action = String(
        playerAction || '',
    ).normalize('NFKC');
    if (!action.trim()) {
        return {
            state: worldState,
            admittedActors: [],
        };
    }
    const mapId =
        worldState.map?.activeMapId;
    const roomId =
        worldState.map
            ?.currentLocalNodeId;
    if (!mapId || !roomId) {
        return {
            state: worldState,
            admittedActors: [],
        };
    }
    const profiles = new Map(
        (
            worldState.actorLibrary ||
            []
        ).map(profile => [
            profile.id,
            profile,
        ]),
    );
    const containsAlias = alias => {
        const target = String(
            alias || '',
        ).trim().normalize('NFKC');
        if (target.length < 2) {
            return false;
        }
        if (/[\p{Script=Han}]/u.test(target)) {
            return action.includes(target);
        }
        const escaped =
            target.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );
        return new RegExp(
            `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
            'iu',
        ).test(action);
    };
    const candidates = (
        worldState.actors || []
    )
        .filter(actor =>
            actor.present === false &&
            actor.lifeStatus !== 'dead' &&
            actor.lifeStatus !== 'missing' &&
            actor.mapId === mapId &&
            actor.roomId)
        .map(actor => {
            const profile =
                profiles.get(actor.id) ||
                {};
            const matchedAliases =
                buildActorNameAliases(
                    actor.nameEn ||
                        profile.nameEn,
                    actor.name ||
                        profile.name,
                    [
                        ...(actor.aliases ||
                            []),
                        ...(profile.aliases ||
                            []),
                    ],
                ).filter(
                    containsAlias,
                );
            const path =
                findLocalRoomPath(
                    mapId,
                    actor.roomId,
                    roomId,
                    worldState.map,
                );
            return {
                actor,
                matchedAlias:
                    matchedAliases.sort(
                        (left, right) =>
                            right.length -
                            left.length,
                    )[0] || '',
                path,
            };
        })
        .filter(candidate =>
            candidate.matchedAlias &&
            candidate.path &&
            candidate.path.minutes <= 5 &&
            candidate.path.roomIds.length <=
                4)
        .sort((left, right) =>
            right.matchedAlias.length -
                left.matchedAlias.length ||
            left.path.minutes -
                right.path.minutes)
        .slice(0, 2);
    if (!candidates.length) {
        return {
            state: worldState,
            admittedActors: [],
        };
    }
    const next =
        structuredClone(worldState);
    const candidateById = new Map(
        candidates.map(candidate => [
            candidate.actor.id,
            candidate,
        ]),
    );
    next.actors = (
        next.actors || []
    ).map(actor => {
        const candidate =
            candidateById.get(actor.id);
        if (!candidate) {
            return actor;
        }
        return {
            ...actor,
            present: true,
            mapId,
            roomId,
            currentActivityEn:
                'Turning toward the player after being explicitly acknowledged in the current scene.',
            currentActivity:
                '在当前场景中被玩家明确点名后，转身回应玩家。',
        };
    });
    return {
        state: next,
        admittedActors:
            candidates.map(
                candidate => ({
                    id:
                        candidate.actor.id,
                    nameEn:
                        candidate.actor
                            .nameEn ||
                        profiles.get(
                            candidate.actor.id,
                        )?.nameEn ||
                        candidate.actor.id,
                    name:
                        candidate.actor
                            .name ||
                        profiles.get(
                            candidate.actor.id,
                        )?.name ||
                        candidate.actor
                            .nameEn ||
                        candidate.actor.id,
                    matchedAlias:
                        candidate
                            .matchedAlias,
                    previousRoomId:
                        candidate.actor
                            .roomId,
                    mapId,
                    roomId,
                    pathMinutes:
                        candidate.path
                            .minutes,
                    requireReaction:
                        true,
                    requireEverydayMemory:
                        true,
                }),
            ),
    };
}
