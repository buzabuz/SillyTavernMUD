import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
    normalizeActorCore,
    normalizeActorRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    createDefaultMemorySynapse,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';

function currentCoreSource(
    source,
) {
    return {
        id:
            source.id,
        canonCatalogId:
            source
                .canonCatalogId ||
            '',
        nameEn:
            source.nameEn ||
            source.name ||
            source.id,
        aliases:
            source.aliases ||
            [],
        roleEn:
            source.roleEn ||
            'Current test actor',
        cast: {
            origin:
                source.cast
                    ?.origin ||
                (
                    source
                        .canonCatalogId
                        ? 'canon_catalog'
                        : source
                            .temporary
                            ? 'scene_temporary'
                            : 'foundation'
                ),
            introducedClock:
                source.cast
                    ?.introducedClock ||
                source
                    .introducedClock ||
                '',
            introducedTurn:
                source.cast
                    ?.introducedTurn ??
                (
                    Number.isInteger(
                        source
                            .introducedTurn,
                    )
                        ? source
                            .introducedTurn
                        : null
                ),
        },
        publicProfile: {
            descriptionEn:
                source.publicProfile
                    ?.descriptionEn ||
                source
                    .publicDescriptionEn ||
                `${source.nameEn || source.id} has stable visible traits.`,
            backgroundEn:
                source.publicProfile
                    ?.backgroundEn ||
                source
                    .publicBackgroundEn ||
                '',
        },
        performanceCore: {
            temperamentEn:
                source.performanceCore
                    ?.temperamentEn ||
                source.personalityEn ||
                'Observant and deliberate.',
            speechStyleEn:
                source.performanceCore
                    ?.speechStyleEn ||
                source.speechStyleEn ||
                'Concise and direct.',
            motivesEn:
                source.performanceCore
                    ?.motivesEn ||
                [],
            socialStrategiesEn:
                source.performanceCore
                    ?.socialStrategiesEn ||
                [],
            boundariesEn:
                source.performanceCore
                    ?.boundariesEn ||
                [],
            vulnerabilitiesEn:
                source.performanceCore
                    ?.vulnerabilitiesEn ||
                [],
        },
        identity:
            source.identity ||
            {},
        privateFacts: {
            secretEn:
                source.privateFacts
                    ?.secretEn ||
                source.secretEn ||
                '',
            knowledgeEn:
                source.privateFacts
                    ?.knowledgeEn ||
                source.knowledgeEn ||
                [],
        },
    };
}

function currentRuntimeSource(
    source,
    fallback,
) {
    return {
        id:
            source.id,
        mapId:
            source.mapId ||
            fallback.mapId ||
            '',
        roomId:
            source.roomId ||
            fallback.roomId ||
            '',
        present:
            source.present ===
            true,
        lifeStatus:
            source.lifeStatus ||
            'alive',
        lifeStatusPermanent:
            source
                .lifeStatusPermanent ===
            true,
        lifeStatusDetailEn:
            source
                .lifeStatusDetailEn ||
            'Alive.',
        lifeStatusSinceClock:
            source
                .lifeStatusSinceClock ||
            '',
        currentActivityEn:
            source
                .currentActivityEn ||
            '',
        currentIntentEn:
            source
                .currentIntentEn ||
            '',
        currentGoalEn:
            source
                .currentGoalEn ||
            '',
        temporary:
            source.temporary ===
            true,
    };
}

export function normalizeCurrentActorFixtureInPlace(
    state,
) {
    const coresById =
        new Map(
            (
                state.actorLibrary ||
                []
            )
                .filter(actor =>
                    actor?.id)
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    const runtimesById =
        new Map(
            (
                state.actors ||
                []
            )
                .filter(actor =>
                    actor?.id)
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    const actorIds = [
        ...new Set([
            ...coresById.keys(),
            ...runtimesById.keys(),
        ]),
    ].sort();
    state.actorLibrary =
        actorIds.map(actorId => {
            const source =
                coresById.get(
                    actorId,
                ) ||
                runtimesById.get(
                    actorId,
                );
            return normalizeActorCore(
                currentCoreSource(
                    source,
                ),
            );
        });
    state.actors =
        actorIds.map(actorId => {
            const source =
                runtimesById.get(
                    actorId,
                ) ||
                coresById.get(
                    actorId,
                );
            return normalizeActorRuntime(
                currentRuntimeSource(
                    source,
                    {
                        mapId:
                            state.map
                                ?.activeMapId,
                        roomId:
                            state.map
                                ?.currentLocalNodeId,
                    },
                ),
            );
        });
    state.actorMemoryIndex ??= {
        version:
            memoryReferenceVersion,
        byActorId: {},
    };
    state.actorMemoryIndex.version =
        memoryReferenceVersion;
    for (const actorId of
        actorIds) {
        state.actorMemoryIndex
            .byActorId[
                actorId
            ] ??= {
                firstImpressionRef:
                    '',
                core: [],
                recent: [],
                everyday: [],
            };
    }
    for (
        const actorId of Object.keys(
            state.actorMemoryIndex
                .byActorId,
        )
    ) {
        if (
            !actorIds.includes(
                actorId,
            )
        ) {
            delete state
                .actorMemoryIndex
                .byActorId[
                    actorId
                ];
        }
    }
    state.memorySynapse ??=
        createDefaultMemorySynapse();
    state.socialGraph =
        normalizeSocialGraph(
            state.socialGraph,
        );
    state.actorContextVersion =
        actorContextVersion;
    state.memoryReferenceVersion =
        memoryReferenceVersion;
    state.actorDossierProjectionVersion =
        actorDossierProjectionVersion;
    state.activeInteractionActorIds =
        state.actors
            .filter(actor =>
                actor.present)
            .map(actor =>
                actor.id);
    return state;
}

export function addCurrentPlayerRelationship(
    state,
    actorId,
    structuralTags = [],
) {
    const relationships =
        state.socialGraph
            ?.relationships ||
        [];
    const existing =
        relationships.find(edge =>
            edge.sourceActorId ===
                actorId &&
            edge.targetActorId ===
                'player');
    const next = {
        id:
            existing?.id ||
            `relationship_${actorId}_player`,
        sourceActorId:
            actorId,
        targetActorId:
            'player',
        familiarity: 70,
        closeness:
            structuralTags
                .includes(
                    'friend',
                )
                ? 55
                : 45,
        warmth: 20,
        trust: 15,
        respect: 0,
        influence: 0,
        tension: 0,
        resentment: 0,
        fear: 0,
        protectiveness:
            structuralTags.some(tag =>
                [
                    'parent',
                    'guardian',
                ].includes(tag))
                ? 60
                : 0,
        structuralTags:
            [...structuralTags],
        activeEmotions: [],
        evidenceIds: [],
        knownToPlayer: true,
        relationshipClaimIds: [],
        relationshipKinds: [],
    };
    state.socialGraph = {
        ...normalizeSocialGraph(
            state.socialGraph,
        ),
        relationships: [
            ...relationships.filter(
                edge =>
                    edge !== existing,
            ),
            next,
        ],
    };
    return state;
}
