import {
    getSpellDefinition,
} from '../spell-catalog.js';

export function createMandatorySceneStateProjector(
    dependencies,
) {
    return function buildMandatorySceneState(
        worldState = {},
    ) {
        return projectMandatorySceneState(
            worldState,
            dependencies,
        );
    };
}

function projectMandatorySceneState(
    worldState = {},
    {
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
    },
) {
    const presentActors = (worldState.actors || [])
        .filter(actor => actor.present !== false);
    const presentActorIds = new Set(
        presentActors.map(actor => actor.id),
    );
    const profiles = new Map(
        (worldState.actorLibrary || [])
            .filter(profile =>
                presentActorIds.has(profile.id))
            .map(profile => [profile.id, profile]),
    );
    const materialState =
        buildCurrentMaterialState(
            worldState,
        );
    const scene = worldState.scene
        ? {
            id: worldState.scene.id,
            nameEn: worldState.scene.nameEn,
            summaryEn: worldState.scene.summaryEn,
            explorationHookEn:
                worldState.scene.explorationHookEn,
            temporalFactsEn:
                worldState.scene
                    .temporalFactsEn || [],
            mapId: worldState.scene.mapId,
            roomId: worldState.scene.roomId,
            nextSceneIntent:
                worldState.scene.nextSceneIntent || null,
            pacingPressureEn:
                worldState.scene.pacingPressureEn || '',
        }
        : null;
    const currentMapId =
        worldState.map
            ?.activeMapId ||
        '';
    const currentRoomId =
        worldState.map
            ?.currentLocalNodeId ||
        '';
    const currentHolderIds =
        new Set([
            'player',
            ...presentActorIds,
        ]);
    return {
        clock: worldState.clock,
        chapter: worldState.chapter,
        location: worldState.location,
        scene,
        playerPosition: {
            mapId:
                worldState.map?.activeMapId || null,
            roomId:
                worldState.map?.currentLocalNodeId || null,
            visibleResiduesEn:
                worldState.map
                    ?.roomStates?.[
                        `${worldState.map?.activeMapId}:${worldState.map?.currentLocalNodeId}`
                    ]
                    ?.visibleResiduesEn ||
                [],
        },
        currentMaterialState:
            {
                mapId:
                    materialState
                        .mapId,
                roomId:
                    materialState
                        .roomId,
                roomEffects:
                    (
                        materialState
                            .roomEffects ||
                        []
                    ).map(effect => ({
                        id: effect.id,
                        type: effect.type,
                        operation:
                            effect.operation,
                        actorId:
                            effect.actorId,
                        objectText:
                            effect.objectText,
                        targetText:
                            effect.targetText,
                        resultText:
                            effect.resultText,
                        persistence:
                            effect.persistence,
                        committedClock:
                            effect
                                .committedClock,
                    })),
                actorPresentations:
                    Object.fromEntries(
                        Object.entries(
                            materialState
                                .actorPresentations ||
                            {},
                        ).filter(([
                            actorId,
                        ]) =>
                            presentActorIds
                                .has(actorId)),
                    ),
            },
        actorCards: presentActors.map(actor => ({
            id: actor.id,
            nameEn:
                profiles.get(
                    actor.id,
                )?.nameEn ||
                actor.id,
            roleEn:
                profiles.get(
                    actor.id,
                )?.roleEn ||
                '',
            currentActivityEn:
                actor.currentActivityEn,
            currentIntentEn: actor.currentIntentEn,
            lifeStatus:
                actor.lifeStatus || 'alive',
            lifeStatusPermanent:
                Boolean(
                    actor.lifeStatusPermanent,
                ),
            lifeStatusDetailEn:
                actor.lifeStatusDetailEn ||
                (
                    actor.lifeStatus === 'dead'
                        ? ''
                        : 'Alive.'
                ),
            mapId: actor.mapId,
            roomId: actor.roomId,
            performanceCore: {
                temperamentEn:
                    profiles.get(actor.id)
                        ?.performanceCore
                        ?.temperamentEn ||
                    '',
                speechStyleEn:
                    profiles.get(actor.id)
                        ?.performanceCore
                        ?.speechStyleEn ||
                    '',
                motivesEn:
                    profiles.get(actor.id)
                        ?.performanceCore
                        ?.motivesEn ||
                    [],
                boundariesEn:
                    profiles.get(actor.id)
                        ?.performanceCore
                        ?.boundariesEn ||
                    [],
                vulnerabilitiesEn:
                    profiles.get(actor.id)
                        ?.performanceCore
                        ?.vulnerabilitiesEn ||
                    [],
            },
        })),
        behavioralEnvironment:
            buildBehavioralEnvironment(
                worldState,
            ),
        pacingDirective:
            worldState.pacingDirector?.pendingBeat
                ?.status === 'pending'
                ? (
                    worldState
                        .pacingDirector
                        .pendingBeat
                        .causalCollapse
                        ? {
                            ...worldState
                                .pacingDirector
                                .pendingBeat,
                            causalCollapse: {
                                recordId:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .recordId ||
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .id,
                                kind:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .kind,
                                surfaceMode:
                                    'aftermath',
                                visibleResiduesEn:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .visibleResiduesEn,
                                aftermathEn:
                                    worldState
                                        .pacingDirector
                                        .pendingBeat
                                        .causalCollapse
                                        .aftermathEn,
                            },
                        }
                        : worldState
                            .pacingDirector
                            .pendingBeat
                )
                : null,
        publicConflict: worldState.conflict
            ? {
                title:
                    worldState.conflict.title ||
                    worldState.conflict.titleEn,
                immediatePressure:
                    worldState.conflict.immediatePressure ||
                    worldState.conflict
                        .immediatePressureEn,
                stakes:
                    worldState.conflict.stakes ||
                    worldState.conflict.stakesEn,
            }
            : null,
        discoveredClues: (worldState.clues || [])
            .filter(clue => clue.discovered === true),
        currentItems:
            (
                worldState.items ||
                []
            )
                .filter(item =>
                    item.visibility !==
                        'hidden' &&
                    [
                        'whole',
                        'remains',
                    ].includes(
                        item.physicalForm,
                    ) &&
                    (
                        currentHolderIds
                            .has(
                                item.holderId,
                            ) ||
                        (
                            item.location
                                ?.mapId ===
                                currentMapId &&
                            item.location
                                ?.roomId ===
                                currentRoomId
                        )
                    ))
                .map(item => ({
                    id: item.id,
                    labelEn:
                        item.labelEn ||
                        item.label ||
                        item.id,
                    ownerId:
                        item.ownerId ||
                        '',
                    holderId:
                        item.holderId ||
                        '',
                    state:
                        item.state ||
                        '',
                    physicalForm:
                        item
                            .physicalForm,
                    isEquipped:
                        item.isEquipped ===
                        true,
                    storyRoles:
                        item.storyRoles ||
                        [],
                })),
        knownSpells:
            (
                worldState
                    .spellbook
                    ?.known ||
                []
            ).map(entry => {
                const spell =
                    getSpellDefinition(
                        entry.spellId,
                        worldState,
                    );
                return spell
                    ? {
                        spellId:
                            spell.id,
                        incantation:
                            spell.incantation,
                        effectEn:
                            spell.effectEn,
                        proficiencyRank:
                            entry
                                .proficiencyRank,
                        proficiencyXp:
                            entry
                                .proficiencyXp,
                    }
                    : null;
            }).filter(Boolean),
    };
}
