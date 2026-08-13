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
        getActorKnownRumors,
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
    const scene = worldState.scene
        ? {
            id: worldState.scene.id,
            name: worldState.scene.name,
            nameEn: worldState.scene.nameEn,
            summary: worldState.scene.summary,
            summaryEn: worldState.scene.summaryEn,
            explorationHook:
                worldState.scene.explorationHook,
            explorationHookEn:
                worldState.scene.explorationHookEn,
            temporalFactsEn:
                worldState.scene
                    .temporalFactsEn || [],
            mapId: worldState.scene.mapId,
            roomId: worldState.scene.roomId,
            itemStates:
                worldState.scene
                    .itemStates || [],
            nextSceneIntent:
                worldState.scene.nextSceneIntent || null,
            pacingPressureEn:
                worldState.scene.pacingPressureEn || '',
        }
        : null;
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
            materialEffects:
                buildCurrentMaterialState(
                    worldState,
                ).roomEffects,
        },
        currentMaterialState:
            buildCurrentMaterialState(
                worldState,
            ),
        presentActors: presentActors.map(actor => ({
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
            knownRumors:
                getActorKnownRumors(
                    worldState,
                    actor.id,
                ),
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
            presentation:
                worldState
                    .actorPresentations?.[
                        actor.id
                    ] ||
                null,
        })),
        actorPerformance: presentActors.map(actor => {
            const profile = profiles.get(actor.id) || {};
            return {
                id: actor.id,
                temperamentEn:
                    profile
                        .performanceCore
                        ?.temperamentEn ||
                    '',
                speechStyleEn:
                    profile
                        .performanceCore
                        ?.speechStyleEn ||
                    '',
                motivesEn:
                    profile
                        .performanceCore
                        ?.motivesEn ||
                    [],
                boundariesEn:
                    profile
                        .performanceCore
                        ?.boundariesEn ||
                    [],
                vulnerabilitiesEn:
                    profile
                        .performanceCore
                        ?.vulnerabilitiesEn ||
                    [],
                knowledgeEn:
                    profile
                        .privateFacts
                        ?.knowledgeEn ||
                    [],
            };
        }),
        behavioralEnvironment:
            buildBehavioralEnvironment(
                worldState,
            ),
        dailyDirectives: (
            worldState.dailyDirector?.plan
                ?.actorDirectives || []
        ).filter(directive =>
            presentActorIds.has(directive.id)),
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
        recentWorldNews:
            (worldState.worldNews || [])
                .slice(-4)
                .map(brief => ({
                    id: brief.id,
                    headlineEn:
                        brief.headlineEn,
                    briefEn: brief.briefEn,
                    category: brief.category,
                    happenedClock:
                        brief.happenedClock,
                })),
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
        items: worldState.items || [],
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
