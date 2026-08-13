// Extracted from the helpers compatibility facade for Task 4.

import {
    PRESET_LOCATION_ACTORS,
} from '../map-pack.js';

import {
    buildActorNameAliases,
} from './actor-identity.js';

import {
    assertActorContextStateV1,
    markActorIntroducedV1,
    updateActorRuntimeV1,
    upsertActorV1,
} from './actor-context-runtime.js';

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
    assertActorContextStateV1(
        worldState,
    );
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
    const admittedActorIds = [];
    let changed = false;
    residents.forEach(resident => {
        let profile = next.actorLibrary
            .find(actor =>
                actor.id === resident.id);
        let runtime = next.actors
            .find(actor =>
                actor.id === resident.id);
        if (!profile) {
            const inserted =
                upsertActorV1(
                    next,
                    {
                        actorId:
                            resident.id,
                        coreSource:
                            {
                                ...structuredClone(
                                    resident,
                                ),
                                cast: {
                                    origin:
                                        'preset_resident',
                                    introducedClock:
                                        activate
                                            ? next.clock ||
                                                'unknown'
                                            : '',
                                    introducedTurn:
                                        activate
                                            ? Number(
                                                next.turn
                                                    ?.count ||
                                                0,
                                            )
                                            : null,
                                },
                            },
                        runtimeSource: {
                            mapId,
                            roomId,
                            present:
                                Boolean(
                                    activate,
                                ),
                            lifeStatus:
                                'alive',
                            lifeStatusPermanent:
                                false,
                            lifeStatusDetailEn:
                                'Alive.',
                            lifeStatusSinceClock:
                                '',
                            currentActivityEn:
                                resident
                                    .currentActivityEn ||
                                '',
                            currentIntentEn:
                                resident
                                    .currentIntentEn ||
                                '',
                            currentGoalEn:
                                '',
                            temporary:
                                false,
                        },
                    },
                );
            profile = inserted.core;
            runtime = inserted.runtime;
            changed = true;
            admittedActorIds.push(
                resident.id,
            );
        }
        if (
            [
                'dead',
                'missing',
            ].includes(
                runtime?.lifeStatus,
            )
        ) {
            return;
        }
        if (!runtime) {
            runtime =
                upsertActorV1(
                    next,
                    {
                        actorId:
                            profile.id,
                        coreSource:
                            profile,
                        runtimeSource: {
                            mapId,
                            roomId,
                            present:
                                Boolean(
                                    activate,
                                ),
                            lifeStatus:
                                'alive',
                            lifeStatusPermanent:
                                false,
                            lifeStatusDetailEn:
                                'Alive.',
                            lifeStatusSinceClock:
                                '',
                            currentActivityEn:
                                resident
                                    .currentActivityEn ||
                                '',
                            currentIntentEn:
                                resident
                                    .currentIntentEn ||
                                '',
                            currentGoalEn:
                                '',
                            temporary:
                                false,
                        },
                    },
                ).runtime;
            changed = true;
            admittedActorIds.push(
                resident.id,
            );
        }
        if (
            activate &&
            runtime.present === false &&
            ![
                'dead',
                'missing',
            ].includes(
                runtime.lifeStatus,
            ) &&
            (runtime.mapId || mapId) === mapId &&
            (runtime.roomId || roomId) === roomId
        ) {
            updateActorRuntimeV1(
                next,
                resident.id,
                {
                    present: true,
                    mapId,
                    roomId,
                    currentActivityEn:
                        resident
                            .currentActivityEn ||
                        runtime
                            .currentActivityEn,
                    currentIntentEn:
                        resident
                            .currentIntentEn ||
                        runtime
                            .currentIntentEn,
                },
            );
            changed = true;
            if (
                !admittedActorIds
                    .includes(
                        resident.id,
                    )
            ) {
                admittedActorIds.push(
                    resident.id,
                );
            }
        }
        if (activate) {
            changed ||=
                !profile.cast
                    .introducedClock;
            markActorIntroducedV1(
                next,
                resident.id,
            );
        }
    });

    return {
        state: changed
            ? assertActorContextStateV1(
                next,
            )
            : worldState,
        admittedActorIds,
    };
}

export function admitMentionedKnownActors(
    worldState,
    playerAction,
) {
    assertActorContextStateV1(
        worldState,
    );
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
                    profile.nameEn,
                    '',
                    profile.aliases,
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
    for (const candidate of candidates) {
        updateActorRuntimeV1(
            next,
            candidate.actor.id,
            {
                present: true,
                mapId,
                roomId,
                currentActivityEn:
                    'Turning toward the player after being explicitly acknowledged in the current scene.',
            },
        );
        markActorIntroducedV1(
            next,
            candidate.actor.id,
        );
    }
    return {
        state:
            assertActorContextStateV1(
                next,
            ),
        admittedActors:
            candidates.map(
                candidate => ({
                    id:
                        candidate.actor.id,
                    nameEn:
                        profiles.get(
                            candidate.actor.id,
                        )?.nameEn ||
                        candidate.actor.id,
                    name:
                        profiles.get(
                            candidate.actor.id,
                        )?.nameEn ||
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
