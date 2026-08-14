import {
    projectActorEventKnowledge,
} from '../presence-witness-contract.js';
import {
    ACTOR_KNOWLEDGE_VERSION,
    sanitizeActorKnowledgeEn,
} from './actor-memory.js';
import {
    normalizeCausalCollapseState,
} from './causal-state.js';
import {
    buildNpcIdentityKnowledgeForObserver,
    buildNpcIdentityPromptProjection,
} from './npc-identity-prompt-projection.js';
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
        evidenceLimit = 16,
        relationshipLimit = 12,
    } = {},
) {
    const projection =
        buildSocialAudienceProjection(
            worldState,
            actorId,
        );
    const relationshipEvidence =
        projection.relationshipEvidence
            .slice(-evidenceLimit);
    const relationships =
        projection.relationships
            .slice(-relationshipLimit);
    const eventKnowledge =
        projectActorEventKnowledge(
            worldState,
            actorId,
        );
    const reportedRoleActorIds =
        [
            ...eventKnowledge.direct,
            ...eventKnowledge.reported,
        ]
            .filter(event =>
                event.eventKind ===
                    'reported')
            .flatMap(event => [
                event.report?.speakerId,
                ...(
                    event.report
                        ?.recipientIds ||
                    []
                ),
                ...(
                    event.report
                        ?.subjectIds ||
                    []
                ),
            ]);
    const knownRelationshipActorIds = [
        ...new Set([
            ...reportedRoleActorIds,
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
    const continuityById =
        new Map(
            buildActorContinuityCapsules(
                worldState,
                requestedActorIds,
                contextPlan,
            ).map(capsule => [
                capsule.actorId,
                capsule,
            ]),
        );
    return requestedActorIds
        .map(actorId => {
            const actor =
                profiles.get(actorId);
            if (!actor) return null;
            const identityProjection =
                buildNpcIdentityPromptProjection(
                    worldState,
                    actorId,
                    actorId,
                );
            return {
                actorId,
                roleEn: actor.roleEn,
                publicProfile:
                    actor.publicProfile,
                performanceCore:
                    actor.performanceCore,
                privateFacts:
                    actor.privateFacts,
                continuity:
                    continuityById.get(
                        actorId,
                    ) || null,
                socialKnowledge:
                    getActorVisibleSocialKnowledge(
                        worldState,
                        actorId,
                    ),
                identityProjection,
                identityKnowledge:
                    buildNpcIdentityKnowledgeForObserver(
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
    const appraisalsById =
        new Map(
            (
                worldState
                    ?.memorySynapse
                    ?.appraisals ||
                []
            ).map(appraisal => [
                appraisal.id,
                appraisal,
            ]),
        );
    const eventsById =
        new Map(
            (
                worldState
                    ?.eventKnowledge ||
                []
            ).map(event => [
                event.eventId,
                event,
            ]),
        );
    return requestedActorIds
        .map(actorId => {
            const profile =
                profiles.get(actorId);
            if (!profile) return null;
            const memoryEntry =
                worldState
                    .actorMemoryIndex
                    ?.byActorId
                    ?.[actorId] ||
                {
                    firstImpressionRef:
                        '',
                    core: [],
                    recent: [],
                    everyday: [],
                };
            const limits = {
                core:
                    Math.min(
                        1,
                        contextPlan
                            ?.memoryLimits
                            ?.core ??
                        1,
                    ),
                recent:
                    Math.min(
                        2,
                        contextPlan
                            ?.memoryLimits
                            ?.recent ??
                        2,
                    ),
                everyday:
                    Math.min(
                        1,
                        contextPlan
                            ?.memoryLimits
                            ?.everyday ??
                        1,
                    ),
            };
            const memories = [
                'core',
                'recent',
                'everyday',
            ].flatMap(tier =>
                (
                    memoryEntry[tier] ||
                    []
                )
                    .slice(
                        -limits[tier],
                    )
                    .map(reference => {
                        const record =
                            reference
                                .recordType ===
                                'event'
                                ? eventsById
                                    .get(
                                        reference
                                            .recordId,
                                    )
                                : appraisalsById
                                    .get(
                                        reference
                                            .recordId,
                                    );
                        if (!record) {
                            return null;
                        }
                        if (
                            reference
                                .recordType ===
                                'appraisal' &&
                            (
                                record
                                    .contextTags ||
                                []
                            ).includes(
                                'migrated_current_impression',
                            )
                        ) {
                            return null;
                        }
                        return {
                            recordId:
                                reference
                                    .recordId,
                            recordType:
                                reference
                                    .recordType,
                            tier,
                            summaryEn:
                                record
                                    .summaryEn ||
                                '',
                            lastClock:
                                record.clock ||
                                record
                                    .committedClock ||
                                reference
                                    .addedClock,
                        };
                    })
                    .filter(Boolean));
            const currentSchema =
                (
                    worldState
                        .memorySynapse
                        ?.personSchemas ||
                    []
                )
                    .filter(schema =>
                        schema
                            .observerId ===
                            actorId &&
                        schema.targetId ===
                            'player' &&
                        [
                            'active',
                            'contested',
                        ].includes(
                            schema.status,
                        ))
                    .sort((left, right) =>
                        String(
                            right
                                .updatedClock ||
                            '',
                        ).localeCompare(
                            String(
                                left
                                    .updatedClock ||
                                '',
                            ),
                            'en',
                        ))[0] ||
                null;
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
                    profile.cast
                        ?.introducedClock ||
                    memoryEntry
                        .firstImpressionRef ||
                    memories.length ||
                    playerEdge,
                );
            const knownActorIds =
                new Set(
                    socialKnowledge
                        .knownRelationshipActorIds ||
                    [],
                );
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
                    currentSchema:
                        currentSchema
                            ? {
                                schemaId:
                                    currentSchema
                                        .id,
                                expectationEn:
                                    currentSchema
                                        .expectationEn,
                                confidence:
                                    currentSchema
                                        .confidence,
                                status:
                                    currentSchema
                                        .status,
                            }
                            : null,
                },
                memories,
            };
        })
        .filter(Boolean);
}

export function buildActorMemoryKnowledgeSeeds(
    worldState,
    actorIds = [],
    contextPlan = {},
) {
    const requestedActorIds =
        [
            ...new Set(
                actorIds
                    .map(actorId =>
                        String(
                            actorId ||
                            '',
                        ).trim())
                    .filter(Boolean),
            ),
        ];
    const eventIds =
        new Set(
            (
                worldState
                    ?.eventKnowledge ||
                []
            ).map(event =>
                event.eventId),
        );
    const appraisalsById =
        new Map(
            (
                worldState
                    ?.memorySynapse
                    ?.appraisals ||
                []
            ).map(appraisal => [
                appraisal.id,
                appraisal,
            ]),
        );
    const limits = {
        core:
            Math.min(
                1,
                contextPlan
                    ?.memoryLimits
                    ?.core ??
                1,
            ),
        recent:
            Math.min(
                2,
                contextPlan
                    ?.memoryLimits
                    ?.recent ??
                2,
            ),
        everyday:
            Math.min(
                1,
                contextPlan
                    ?.memoryLimits
                    ?.everyday ??
                1,
            ),
    };
    const recordIds =
        new Set();
    const retainedEventIdsByActorId =
        {};
    for (const actorId of
        requestedActorIds) {
        const retainedEventIds =
            new Set();
        (
            worldState
                ?.memorySynapse
                ?.personSchemas ||
            []
        )
            .filter(schema =>
                schema.observerId ===
                    actorId &&
                [
                    'active',
                    'contested',
                ].includes(
                    schema.status,
                ))
            .sort((left, right) =>
                String(
                    right.updatedClock ||
                    '',
                ).localeCompare(
                    String(
                        left.updatedClock ||
                        '',
                    ),
                    'en',
                ))
            .slice(0, 3)
            .forEach(schema =>
                recordIds.add(
                    `schemas_${schema.id}`,
                ));
        const memoryEntry =
            worldState
                ?.actorMemoryIndex
                ?.byActorId
                ?.[actorId] ||
            {};
        for (const tier of [
            'core',
            'recent',
            'everyday',
        ]) {
            (
                memoryEntry[tier] ||
                []
            )
                .slice(
                    -limits[tier],
                )
                .forEach(reference => {
                    if (
                        reference
                            ?.recordType ===
                            'event' &&
                        eventIds.has(
                            reference
                                .recordId,
                        )
                    ) {
                        recordIds.add(
                            `events_${
                                reference
                                    .recordId
                            }`,
                        );
                        retainedEventIds
                            .add(
                                reference
                                    .recordId,
                            );
                        return;
                    }
                    if (
                        reference
                            ?.recordType !==
                            'appraisal'
                    ) {
                        return;
                    }
                    const appraisal =
                        appraisalsById.get(
                            reference
                                .recordId,
                        );
                    if (
                        !appraisal ||
                        (
                            appraisal
                                .contextTags ||
                            []
                        ).includes(
                            'migrated_current_impression',
                        )
                    ) {
                        return;
                    }
                    recordIds.add(
                        `appraisals_${
                            appraisal.id
                        }`,
                    );
                });
        }
        retainedEventIdsByActorId[
            actorId
        ] = [...retainedEventIds]
            .sort((left, right) =>
                left.localeCompare(
                    right,
                    'en',
                ));
    }
    return {
        recordIds:
            [...recordIds]
                .sort((left, right) =>
                    left.localeCompare(
                        right,
                        'en',
                    )),
        retainedEventIdsByActorId,
    };
}

export function migrateActorKnowledgeBoundaries(
    worldState,
) {
    if (
        worldState
            ?.actorContextVersion ===
        1
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
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
