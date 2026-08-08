import {
    COHORT_SCHEMA_VERSION,
    LOCAL_PRESENCE_SCHEMA_VERSION,
} from './presence-witness-schema.js';

function stableIds(values = []) {
    return [
        ...new Set(
            values
                .map(value =>
                    String(value || '')
                        .trim())
                .filter(Boolean),
        ),
    ].sort();
}

function isAvailableActor(actor) {
    return ![
        'dead',
        'missing',
    ].includes(actor?.lifeStatus);
}

function getDestinationKey(roomId) {
    return String(roomId || '')
        .replace(
            /_classroom$/u,
            '',
        )
        .replace(
            /[^a-z0-9_]+/gu,
            '_',
        )
        .replace(
            /^_+|_+$/gu,
            '',
        ) ||
        'class';
}

function getDestinationCohortId(
    cohort,
    roomId,
) {
    const destinationKey =
        getDestinationKey(roomId);
    const match =
        String(cohort.id || '')
            .match(
                /^(.*)_[a-z0-9]+_(\d{4})$/u,
            );
    const id = match
        ? `${match[1]}_${destinationKey}_${match[2]}`
        : `${cohort.id}_${destinationKey}`;
    return id.slice(0, 80);
}

function getDestinationCohortLabel(
    cohort,
    nextScene,
) {
    const destination =
        String(
            nextScene.nameEn ||
            nextScene.name ||
            nextScene.roomId ||
            '',
        )
            .replace(
                /\s+Classroom$/iu,
                '',
            )
            .trim();
    const prefix =
        String(
            cohort.labelEn ||
            cohort.label ||
            cohort.id ||
            'Class cohort',
        )
            .replace(
                /\s+in\s+.+$/iu,
                '',
            )
            .trim();
    return destination
        ? `${prefix} in ${destination}`
        : prefix;
}

function getCarriedClassCohorts(
    worldState,
    room,
) {
    if (
        room?.kind !==
            'classroom'
    ) {
        return [];
    }
    const cohorts =
        worldState.cohorts ||
        [];
    const cohortById =
        new Map(
            cohorts.map(cohort => [
                cohort.id,
                cohort,
            ]),
        );
    const currentClassCohortIds =
        (
            worldState
                .localPresence
                ?.cohortIds ||
            []
        ).filter(id =>
            cohortById.get(id)
                ?.source ===
            'class_roster');
    const sourceCohortIds =
        currentClassCohortIds.length
            ? currentClassCohortIds
            : worldState
                .sceneArchive
                ?.at(-1)
                ?.localCohortIds ||
                [];
    const sourceCohortIdSet =
        new Set(
            sourceCohortIds,
        );
    return cohorts.filter(cohort =>
        cohort.source ===
            'class_roster' &&
        sourceCohortIdSet.has(
            cohort.id,
        ));
}

export function projectSceneTransitionPresence(
    worldState,
    nextState,
    nextScene,
    room,
    updatedTurn,
) {
    const carriedCohorts =
        getCarriedClassCohorts(
            worldState,
            room,
        );
    const destinationCohorts =
        carriedCohorts.map(
            cohort => ({
                ...structuredClone(
                    cohort,
                ),
                version:
                    COHORT_SCHEMA_VERSION,
                id:
                    getDestinationCohortId(
                        cohort,
                        nextScene.roomId,
                    ),
                labelEn:
                    getDestinationCohortLabel(
                        cohort,
                        nextScene,
                    ),
                mapId:
                    nextScene.mapId,
                roomId:
                    nextScene.roomId,
                knownMemberActorIds:
                    stableIds(
                        cohort
                            .knownMemberActorIds ||
                        [],
                    ),
                source:
                    'class_roster',
            }),
        );
    const cohortById =
        new Map(
            (
                nextState.cohorts ||
                []
            ).map(cohort => [
                cohort.id,
                structuredClone(
                    cohort,
                ),
            ]),
        );
    destinationCohorts.forEach(
        cohort => {
            cohortById.set(
                cohort.id,
                cohort,
            );
        },
    );
    const cohorts = [
        ...cohortById.values(),
    ];
    const carriedActorIds =
        new Set(
            destinationCohorts
                .flatMap(cohort =>
                    cohort
                        .knownMemberActorIds),
        );
    const actors =
        (
            nextState.actors ||
            []
        ).map(actor =>
            carriedActorIds.has(
                actor.id,
            ) &&
            isAvailableActor(actor)
                ? {
                    ...actor,
                    mapId:
                        nextScene.mapId,
                    roomId:
                        nextScene.roomId,
                }
                : actor);
    const actorById =
        new Map(
            actors.map(actor => [
                actor.id,
                actor,
            ]),
        );
    const activeInteractionActorIds =
        (
            nextScene.actorStates ||
            []
        )
            .filter(actor =>
                actor.present === true &&
                actorById.get(
                    actor.id,
                )?.present === true)
            .map(actor =>
                actor.id);
    const localCohortIds =
        stableIds(
            cohorts
                .filter(cohort =>
                    cohort.mapId ===
                        nextScene.mapId &&
                    cohort.roomId ===
                        nextScene.roomId)
                .map(cohort =>
                    cohort.id),
        );

    return {
        actors,
        cohorts,
        activeInteractionActorIds,
        localPresence: {
            version:
                LOCAL_PRESENCE_SCHEMA_VERSION,
            mapId:
                nextScene.mapId,
            roomId:
                nextScene.roomId,
            occupantActorIds:
                stableIds(
                    actors
                        .filter(actor =>
                            isAvailableActor(
                                actor,
                            ) &&
                            actor.mapId ===
                                nextScene
                                    .mapId &&
                            actor.roomId ===
                                nextScene
                                    .roomId)
                        .map(actor =>
                            actor.id),
                ),
            cohortIds:
                localCohortIds,
            updatedTurn:
                Math.max(
                    0,
                    Number(
                        updatedTurn ||
                        0,
                    ),
                ),
            source:
                destinationCohorts
                    .length
                    ? 'cohort_roster'
                    : 'scene_roster',
        },
    };
}
