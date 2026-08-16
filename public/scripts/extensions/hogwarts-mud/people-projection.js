import {
    buildActorDossierViewModel,
} from './domain/actor-dossier-projection.js';

function uniqueIds(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map(value => String(value || '').trim())
        .filter(id => id && !seen.has(id) && seen.add(id));
}

function hasOwn(value, key) {
    return Boolean(value) &&
        Object.prototype.hasOwnProperty.call(value, key);
}

function hasKnownPlayerContact(actor, profile) {
    return Boolean(
        profile?.cast
            ?.introducedClock,
    ) &&
        actor?.temporary !== true;
}

function getPlayerRoom(state) {
    return {
        mapId: String(
            state?.map?.activeMapId ||
            '',
        ).trim(),
        roomId: String(
            state?.map?.currentLocalNodeId ||
            '',
        ).trim(),
    };
}

function isAtPlayerRoom(actor, playerRoom) {
    return (!actor?.mapId ||
        actor.mapId === playerRoom.mapId) &&
        (!actor?.roomId ||
            actor.roomId === playerRoom.roomId);
}

function createPerson(
    state,
    actorId,
    actorById,
    profileById,
    options,
) {
    const actor = actorById.get(actorId) || null;
    const profile = profileById.get(actorId) || null;
    if (!actor && !profile) {
        return null;
    }
    const dossier =
        buildActorDossierViewModel(
            state,
            actorId,
            'player',
            options,
        );
    if (!dossier) {
        return null;
    }
    return structuredClone({
        id: actorId,
        actorId:
            dossier.actorId,
        header:
            dossier.header,
        current:
            dossier.current,
    });
}

function getActiveIds(state) {
    if (hasOwn(state, 'activeInteractionActorIds')) {
        return Array.isArray(
            state.activeInteractionActorIds,
        )
            ? uniqueIds(
                state.activeInteractionActorIds,
            )
            : [];
    }
    return uniqueIds(
        (state?.actors || [])
            .filter(actor =>
                actor?.present !== false)
            .map(actor => actor.id),
    );
}

/**
 * Projects player-visible people into interactive and local-only UI tiers.
 *
 * Explicit presence fields fail closed. Legacy actor.present is consulted only
 * when activeInteractionActorIds is absent.
 */
export function projectPeoplePanel(
    state = {},
    options = {},
) {
    const actors = Array.isArray(state.actors)
        ? state.actors
        : [];
    const profiles =
        Array.isArray(state.actorLibrary)
            ? state.actorLibrary
            : [];
    const actorById = new Map(
        actors
            .filter(actor => actor?.id)
            .map(actor => [
                String(actor.id),
                actor,
            ]),
    );
    const profileById = new Map(
        profiles
            .filter(profile => profile?.id)
            .map(profile => [
                String(profile.id),
                profile,
            ]),
    );
    const activePeople = getActiveIds(state)
        .map(actorId =>
            createPerson(
                state,
                actorId,
                actorById,
                profileById,
                options,
            ))
        .filter(Boolean);
    const activeIds = new Set(
        activePeople.map(person => person.id),
    );
    const playerRoom = getPlayerRoom(state);
    const localPresence =
        state.localPresence &&
        typeof state.localPresence ===
            'object' &&
        !Array.isArray(state.localPresence)
            ? state.localPresence
            : null;
    const validLocalPresence =
        Boolean(
            playerRoom.mapId &&
            playerRoom.roomId &&
            localPresence &&
            localPresence.mapId ===
                playerRoom.mapId &&
            localPresence.roomId ===
                playerRoom.roomId,
        );
    const localPeople = validLocalPresence
        ? uniqueIds(
            localPresence.occupantActorIds,
        )
            .filter(actorId =>
                !activeIds.has(actorId))
            .filter(actorId =>
                isAtPlayerRoom(
                    actorById.get(
                        actorId,
                    ),
                    playerRoom,
                ))
            .filter(actorId =>
                hasKnownPlayerContact(
                    actorById.get(
                        actorId,
                    ),
                    profileById.get(
                        actorId,
                    ),
                ))
            .map(actorId =>
                createPerson(
                    state,
                    actorId,
                    actorById,
                    profileById,
                    options,
                ))
            .filter(Boolean)
        : [];
    const cohortById = new Map(
        (
            Array.isArray(state.cohorts)
                ? state.cohorts
                : []
        )
            .filter(cohort =>
                cohort?.id &&
                cohort.mapId ===
                    playerRoom.mapId &&
                cohort.roomId ===
                    playerRoom.roomId)
            .map(cohort => [
                String(cohort.id),
                cohort,
            ]),
    );
    const cohorts = validLocalPresence
        ? uniqueIds(localPresence.cohortIds)
            .map(cohortId =>
                cohortById.get(cohortId))
            .filter(Boolean)
            .map(cohort => ({
                id: String(cohort.id),
                label: String(
                    cohort.label ||
                    cohort.labelZh ||
                    cohort.labelEn ||
                    '',
                ).trim(),
            }))
            .filter(cohort =>
                cohort.label)
        : [];

    return {
        activePeople,
        localPeople,
        cohorts,
        playerRoom,
        localPresenceValid:
            validLocalPresence,
    };
}
