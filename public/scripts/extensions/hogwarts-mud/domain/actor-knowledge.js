import {
    projectActorEventKnowledge,
} from '../presence-witness-contract.js';
import {
    normalizeActorMemoryProfile,
    selectSharedMemoriesForContext,
    ACTOR_KNOWLEDGE_VERSION,
    sanitizeActorKnowledgeEn,
} from './actor-memory.js';
import {
    normalizeCausalCollapseState,
} from './causal-state.js';
import {
    buildSocialAudienceProjection,
} from './social-projection.js';

export function filterKnowledgeForAudience(
    records,
    {
        actorIds = [],
    } = {},
) {
    const normalizeEntityId = value =>
        String(value || '')
            .normalize('NFKD')
            .replace(/[^\w.-]+/g, '_')
            .replace(
                /^[_\-.]+|[_\-.]+$/g,
                '',
            )
            .slice(0, 96);
    const audience = [
        ...new Set(
            actorIds
                .map(normalizeEntityId)
                .filter(Boolean),
        ),
    ];
    return (records || [])
        .filter(record => {
            if (
                record.category ===
                    'actors' ||
                record.category ===
                    'scenes' ||
                record.category ===
                    'clues'
            ) {
                return false;
            }
            const visibleTo =
                new Set(
                    (
                        record.entityIds ||
                        []
                    )
                        .map(
                            normalizeEntityId,
                        )
                        .filter(Boolean),
                );
            return audience.length > 0 &&
                audience.every(actorId =>
                    visibleTo.has(actorId));
        });
}

export function getActorVisibleSocialKnowledge(
    worldState,
    actorId,
    {
        statementLimit = 16,
        evidenceLimit = 16,
        relationshipLimit = 12,
    } = {},
) {
    const projection =
        buildSocialAudienceProjection(
            worldState,
            actorId,
        );
    const statements =
        projection.statements
            .slice(-statementLimit);
    const relationshipEvidence =
        projection.relationshipEvidence
            .slice(-evidenceLimit);
    const relationships =
        projection.relationships
            .slice(-relationshipLimit);
    const knownRelationshipActorIds = [
        ...new Set([
            ...statements.flatMap(
                statement => [
                    statement.subjectId,
                    statement.speakerId,
                ],
            ),
            ...relationshipEvidence.flatMap(
                evidence => [
                    evidence.sourceActorId,
                    evidence.targetActorId,
                ],
            ),
            ...relationships.flatMap(
                relationship => [
                    relationship.sourceActorId,
                    relationship.targetActorId,
                ],
            ),
        ].filter(id =>
            id &&
            id !== 'player' &&
            id !== actorId)),
    ];
    return {
        statements,
        relationshipEvidence,
        relationships,
        knownRelationshipActorIds,
    };
}

export function buildActorKnowledgeCapsules(
    worldState,
    actorIds = [],
    contextPlan = {},
) {
    const requestedActorIds = [
        ...new Set(
            actorIds.filter(Boolean),
        ),
    ];
    const profiles = new Map(
        (worldState?.actorLibrary || [])
            .map(profile => [
                profile.id,
                profile,
            ]),
    );
    const currentActors = new Map(
        (worldState?.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    const dailyDirectives =
        new Map(
            (
                worldState?.dailyDirector
                    ?.plan
                    ?.actorDirectives ||
                []
            ).map(directive => [
                directive.id,
                directive,
            ]),
        );
    return requestedActorIds
        .map(actorId => {
            const actor =
                profiles.get(actorId);
            if (!actor) return null;
            const dynamic =
                normalizeActorMemoryProfile(
                    actor,
                    currentActors.get(
                        actorId,
                    ) || {},
                );
            return {
                actorId,
                roleEn: actor.roleEn,
                relationshipToPlayerEn:
                    actor
                        .relationshipToPlayerEn,
                publicBackgroundEn:
                    actor.publicBackgroundEn,
                privateGoalEn:
                    actor.privateGoalEn,
                fearEn: actor.fearEn,
                secretEn: actor.secretEn,
                knowledgeEn:
                    dynamic.knowledgeEn,
                impressionOfPlayerEn:
                    dynamic
                        .impressionOfPlayerEn,
                sharedMemories:
                    selectSharedMemoriesForContext(
                        dynamic
                            .sharedMemories,
                        contextPlan,
                    ),
                dailyDirective:
                    dailyDirectives
                        .get(actorId) ||
                    null,
                knownRumors:
                    getActorKnownRumors(
                        worldState,
                        actorId,
                    ),
                eventKnowledge:
                    projectActorEventKnowledge(
                        worldState,
                        actorId,
                    ),
                socialKnowledge:
                    getActorVisibleSocialKnowledge(
                        worldState,
                        actorId,
                    ),
                causalFacts:
                    normalizeCausalCollapseState(
                        worldState
                            .causalCollapse,
                    ).records
                        .filter(record =>
                            (
                                record
                                    .knownByActorIds ||
                                []
                            ).includes(
                                actorId,
                            ))
                        .slice(-8)
                        .map(record => ({
                            id: record.id,
                            kind:
                                record.kind,
                            factEn:
                                record.factEn,
                            effectiveSinceClock:
                                record
                                    .effectiveSinceClock,
                        })),
            };
        })
        .filter(Boolean);
}

function getContinuityRelationshipStage(
    closeness,
    hasMet,
) {
    if (closeness >= 90) {
        return 'lifelong or family-level bond';
    }
    if (closeness >= 70) {
        return 'confidant or deeply bonded';
    }
    if (closeness >= 50) {
        return 'close friend';
    }
    if (closeness >= 35) {
        return 'friend';
    }
    if (closeness >= 20) {
        return 'acquaintance';
    }
    if (closeness >= 10) {
        return 'newly acquainted';
    }
    return hasMet
        ? 'met previously'
        : 'not established';
}

export function buildActorContinuityCapsules(
    worldState,
    actorIds = [],
    contextPlan = {},
) {
    const requestedActorIds = [
        ...new Set(
            actorIds.filter(Boolean),
        ),
    ];
    const profiles = new Map(
        (worldState?.actorLibrary || [])
            .map(profile => [
                profile.id,
                profile,
            ]),
    );
    const currentActors = new Map(
        (worldState?.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    return requestedActorIds
        .map(actorId => {
            const profile =
                profiles.get(actorId);
            if (!profile) return null;
            const dynamic =
                normalizeActorMemoryProfile(
                    profile,
                    currentActors.get(
                        actorId,
                    ) || {},
                );
            const selectedMemories =
                selectSharedMemoriesForContext(
                    dynamic.sharedMemories,
                    contextPlan,
                );
            const sharedMemories = [
                ...(
                    selectedMemories.core ||
                    []
                ).slice(-1),
                ...(
                    selectedMemories.recent ||
                    []
                ).slice(-2),
                ...(
                    selectedMemories.everyday ||
                    []
                ).slice(-1),
            ].map(memory => ({
                id: memory.id,
                tier: memory.tier,
                summaryEn:
                    memory.summaryEn,
                lastClock:
                    memory.lastClock,
            }));
            const socialKnowledge =
                getActorVisibleSocialKnowledge(
                    worldState,
                    actorId,
                    {
                        statementLimit: 16,
                        evidenceLimit: 32,
                        relationshipLimit: 32,
                    },
                );
            const actorEdges =
                socialKnowledge
                    .relationships;
            const playerEdge =
                actorEdges.find(edge =>
                    edge.sourceActorId ===
                        actorId &&
                    edge.targetActorId ===
                        'player') ||
                null;
            const hasMetPlayer =
                Boolean(
                    dynamic
                        .firstImpressionClock ||
                    dynamic
                        .firstImpressionOfPlayerEn ||
                    sharedMemories.length ||
                    playerEdge,
                );
            const knownActorIds =
                new Set();
            actorEdges.forEach(edge => {
                if (
                    Number(
                        edge.familiarity ||
                        0,
                    ) <= 0
                ) {
                    return;
                }
                const otherId =
                    edge.sourceActorId ===
                        actorId
                        ? edge.targetActorId
                        : edge.sourceActorId;
                if (
                    otherId &&
                    otherId !==
                        'player'
                ) {
                    knownActorIds.add(
                        otherId,
                    );
                }
            });
            socialKnowledge
                .relationshipEvidence
                .filter(evidence =>
                    evidence.eventKind ===
                        'introduction' &&
                    (
                        evidence
                            .sourceActorId ===
                            actorId ||
                        evidence
                            .targetActorId ===
                            actorId
                    ))
                .forEach(evidence => {
                    const otherId =
                        evidence
                            .sourceActorId ===
                            actorId
                            ? evidence
                                .targetActorId
                            : evidence
                                .sourceActorId;
                    if (
                        otherId &&
                        otherId !==
                            'player'
                    ) {
                        knownActorIds.add(
                            otherId,
                        );
                    }
                });
            const familiarity =
                Number(
                    playerEdge
                        ?.familiarity ||
                    0,
                );
            const closeness =
                Number(
                    playerEdge
                        ?.closeness ||
                    0,
                );
            return {
                actorId,
                hasMetPlayer,
                knownActorIds: [
                    ...knownActorIds,
                ].sort(),
                relationshipToPlayer: {
                    stageEn:
                        getContinuityRelationshipStage(
                            closeness,
                            hasMetPlayer,
                        ),
                    familiarity,
                    closeness,
                    warmth: Number(
                        playerEdge
                            ?.warmth ||
                        0,
                    ),
                    trust: Number(
                        playerEdge
                            ?.trust ||
                        0,
                    ),
                    respect: Number(
                        playerEdge
                            ?.respect ||
                        0,
                    ),
                    influence: Number(
                        playerEdge
                            ?.influence ||
                        0,
                    ),
                    tension: Number(
                        playerEdge
                            ?.tension ||
                        0,
                    ),
                    resentment: Number(
                        playerEdge
                            ?.resentment ||
                        0,
                    ),
                    fear: Number(
                        playerEdge
                            ?.fear ||
                        0,
                    ),
                    protectiveness: Number(
                        playerEdge
                            ?.protectiveness ||
                        0,
                    ),
                    labels:
                        playerEdge
                            ?.labels ||
                        [],
                    structuralTags:
                        playerEdge
                            ?.structuralTags ||
                        [],
                    activeEmotions:
                        playerEdge
                            ?.activeEmotions ||
                        [],
                    latestEvidence:
                        playerEdge
                            ?.latestEvidence ||
                        null,
                    impressionOfPlayerEn:
                        dynamic
                            .impressionOfPlayerEn,
                },
                sharedMemories,
            };
        })
        .filter(Boolean);
}

export function migrateActorKnowledgeBoundaries(
    worldState,
) {
    if (
        !worldState ||
        Number(
            worldState
                .actorKnowledgeVersion ||
            0,
        ) >= ACTOR_KNOWLEDGE_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    const currentActors = new Map(
        (next.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    next.actorLibrary =
        (next.actorLibrary || [])
            .map(profile => ({
                ...profile,
                knowledgeEn:
                    sanitizeActorKnowledgeEn(
                        profile,
                        currentActors.get(
                            profile.id,
                        ) || {},
                    ),
            }));
    next.actorKnowledgeVersion =
        ACTOR_KNOWLEDGE_VERSION;
    return {
        state: next,
        changed: true,
    };
}

export function getActorKnownRumors(
    worldState,
    actorId,
) {
    return (worldState.gossipPacks || [])
        .filter(pack =>
            pack.status !== 'faded')
        .map(pack => {
            if (
                (pack.sourceActorIds || [])
                    .includes(actorId)
            ) {
                return {
                    id: pack.id,
                    versionEn:
                        pack.truthCoreEn,
                    version:
                        pack.truthCore ||
                        pack.truthCoreEn,
                    channel: 'witness',
                    targetGroupEn:
                        'Direct witnesses',
                    distortionLevel: 0,
                    truthWitness: true,
                };
            }
            const received = (
                pack.versions || []
            )
                .filter(version =>
                    (
                        version
                            .audienceActorIds ||
                        []
                    ).includes(actorId))
                .at(-1);
            return received ? {
                id: pack.id,
                versionEn:
                    received.versionEn,
                version:
                    received.version ||
                    received.versionEn,
                channel:
                    received.channel,
                targetGroupEn:
                    received.targetGroupEn,
                distortionLevel:
                    received
                        .distortionLevel,
                truthWitness: false,
            } : null;
        })
        .filter(Boolean)
        .slice(-6);
}
