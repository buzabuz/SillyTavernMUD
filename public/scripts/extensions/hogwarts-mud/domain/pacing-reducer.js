// Extracted from the helpers compatibility facade for Task 4.

import {
    findCanonCharacter,
} from '../canon-characters.js';

import {
    getCanonActorDisplayMetadata,
} from './actor-identity.js';

import {
    getCanonIdentity,
} from './npc-identity-canon.js';

import {
    normalizeNpcIdentity,
} from './npc-identity-schema.js';

import {
    ACTOR_KNOWLEDGE_BOUNDARY_EN,
} from './actor-memory.js';

import {
    assertActorContextStateV1,
    markActorIntroducedV1,
    removeActorV1,
    updateActorRuntimeV1,
    upsertActorV1,
} from './actor-context-runtime.js';

import {
    CAUSAL_SOCIAL_STRUCTURAL_TAG_BY_EDGE_TYPE,
    normalizeCausalCollapseState,
} from './causal-state.js';

import {
    getLocalMapDefinition,
} from './map-access.js';

import {
    validatePacingAssessment,
} from './pacing-validation.js';

import {
    normalizeSocialGraph,
} from './social-migration.js';

import {
    clampSocialDimension,
    impactForSocialDelta,
    normalizeSocialStructuralTags,
} from './social-schema.js';

import {
    inferActorRoomId,
} from './spatial-foundation.js';

import {
    advanceWorldClock,
} from './time-environment.js';

export function applyPacingAssessment(
    worldState,
    payload,
    signals = {},
) {
    assertActorContextStateV1(
        worldState,
    );
    const validation = validatePacingAssessment(
        payload,
        worldState,
        signals,
    );
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const intervention = payload.decision === 'intervene'
        ? structuredClone(payload.intervention)
        : null;
    const mapId = next.map?.activeMapId;
    const roomId = next.map?.currentLocalNodeId;
    const totalTurns = Math.max(
        0,
        Number(
            next.turn?.count ||
            0,
        ),
    );
    const causalOpportunity =
        signals.reasons
            ?.includes(
                'causal_collapse_opportunity',
            )
            ? signals.metrics
                ?.causalCollapseOpportunity ||
                null
            : null;
    const causalState =
        normalizeCausalCollapseState(
            next.causalCollapse,
        );
    if (causalOpportunity) {
        causalState.lastCheckedTurn =
            totalTurns;
        causalState.checkedSlots = [
            ...causalState
                .checkedSlots
                .filter(entry =>
                    entry.key !==
                        causalOpportunity
                            .key),
            {
                key:
                    causalOpportunity
                        .key,
                type:
                    causalOpportunity
                        .type,
                sceneId:
                    next.scene?.id ||
                    '',
                checkedTurn:
                    totalTurns,
                outcome:
                    intervention
                        ?.causalCollapse
                        ? 'bound'
                        : 'immediate_incident',
            },
        ].slice(-100);
    }
    const causalCollapse =
        intervention
            ?.causalCollapse;
    if (
        causalOpportunity &&
        causalCollapse
    ) {
        const recordId =
            `causal_${totalTurns + 1}_${causalCollapse.kind}_${causalState.records.length + 1}`;
        const knownByActorIds = [
            causalCollapse
                .focusActorId,
            ...(
                causalCollapse
                    .relatedActorIds ||
                []
            ),
            ...(
                causalCollapse
                    .witnessAccounts ||
                []
            ).map(account =>
                account.actorId),
        ].filter(Boolean);
        const record = {
            ...structuredClone(
                causalCollapse,
            ),
            id: recordId,
            slotKey:
                causalOpportunity.key,
            triggerType:
                causalOpportunity.type,
            sceneId:
                next.scene?.id ||
                '',
            status:
                'pending_surface',
            effectiveSinceClock:
                advanceWorldClock(
                    next.clock,
                    -Number(
                        causalCollapse
                            .effectiveMinutesBeforeObservation,
                    ),
                ),
            observedAtClock:
                next.clock,
            materializedAtTurn:
                totalTurns + 1,
            knownByActorIds:
                [...new Set(
                    knownByActorIds,
                )],
        };
        causalState.records = [
            ...causalState.records,
            record,
        ].slice(-100);
        causalState.lastBoundTurn =
            totalTurns;
        intervention.causalCollapse = {
            ...record,
            recordId,
        };
        if (
            record
                .persistenceTargets
                .includes(
                    'room_state',
                )
        ) {
            next.map ??= {};
            next.map.roomStates ??= {};
            const roomKey =
                `${record.mapId}:${record.roomId}`;
            const roomState =
                next.map
                    .roomStates[
                        roomKey
                    ] || {};
            next.map.roomStates[
                roomKey
            ] = {
                ...roomState,
                causalFactIds: [
                    ...new Set([
                        ...(
                            roomState
                                .causalFactIds ||
                            []
                        ),
                        recordId,
                    ]),
                ],
                visibleResiduesEn:
                    [
                        ...new Set([
                            ...(
                                roomState
                                    .visibleResiduesEn ||
                                []
                            ),
                            ...record
                                .visibleResiduesEn,
                        ]),
                    ].slice(-12),
            };
        }
        if (
            record.itemId &&
            record
                .persistenceTargets
                .includes('item')
        ) {
            next.items = (
                next.items || []
            ).map(item =>
                item.id ===
                    record.itemId
                    ? {
                        ...item,
                        causalFactIds: [
                            ...new Set([
                                ...(
                                    item
                                        .causalFactIds ||
                                    []
                                ),
                                recordId,
                            ]),
                        ],
                    }
                    : item);
        }
        if (
            record.kind ===
                'social_edge' &&
            record
                .persistenceTargets
                .includes(
                    'social_graph',
                )
        ) {
            next.socialGraph =
                normalizeSocialGraph(
                    next.socialGraph,
                );
            const relationshipEvidence =
                new Map(
                    next.socialGraph
                        .relationshipEvidence
                        .map(evidence => [
                            evidence.id,
                            evidence,
                        ]),
                );
            const relationships =
                new Map(
                    next.socialGraph
                        .relationships
                        .map(edge => [
                            `${edge.sourceActorId}->${edge.targetActorId}`,
                            edge,
                        ]),
                );
            for (
                const relatedActorId of (
                    record
                        .relatedActorIds ||
                    []
                )
            ) {
                for (
                    const [
                        sourceActorId,
                        targetActorId,
                    ] of [
                        [
                            record
                                .focusActorId,
                            relatedActorId,
                        ],
                        [
                            relatedActorId,
                            record
                                .focusActorId,
                        ],
                    ]
                ) {
                    const evidenceId =
                        `${recordId}_${sourceActorId}_${targetActorId}`;
                    const key =
                        `${sourceActorId}->${targetActorId}`;
                    const existing =
                        relationships
                            .get(key) ||
                        {};
                    const edgeType =
                        String(
                            record.edgeType ||
                            '',
                        );
                    const causalStructuralTag =
                        CAUSAL_SOCIAL_STRUCTURAL_TAG_BY_EDGE_TYPE[
                            edgeType
                        ];
                    const causalStructuralTags =
                        causalStructuralTag
                            ? [
                                causalStructuralTag,
                            ]
                            : [];
                    const familiarity =
                        Math.max(
                            2,
                            clampSocialDimension(
                                'familiarity',
                                existing
                                    .familiarity,
                            ),
                        );
                    const warmth = Math.max(
                        edgeType === 'friend'
                            ? 1
                            : 0,
                        clampSocialDimension(
                            'warmth',
                            existing.warmth,
                        ),
                    );
                    const tension = Math.max(
                        edgeType === 'rival'
                            ? 1
                            : 0,
                        clampSocialDimension(
                            'tension',
                            existing.tension,
                        ),
                    );
                    const dimensionDeltas = [
                        [
                            'familiarity',
                            familiarity,
                        ],
                        ['warmth', warmth],
                        ['tension', tension],
                    ].flatMap(
                        ([
                            dimension,
                            nextValue,
                        ]) => {
                            const previousValue =
                                clampSocialDimension(
                                    dimension,
                                    existing[
                                        dimension
                                    ],
                                );
                            const delta =
                                nextValue -
                                previousValue;
                            return delta
                                ? [{
                                    dimension,
                                    delta,
                                    appliedDelta:
                                        delta,
                                    impact:
                                        impactForSocialDelta(
                                            delta,
                                        ),
                                }]
                                : [];
                        },
                    );
                    relationshipEvidence.set(
                        evidenceId,
                        {
                            id: evidenceId,
                            sourceActorId,
                            targetActorId,
                            eventKind: 'other',
                            dimensionDeltas,
                            structuralTags:
                                causalStructuralTags,
                            emotionAppraisals: [],
                            summaryEn:
                                record.factEn,
                            witnessedBy: [
                                ...new Set(
                                    record
                                        .knownByActorIds ||
                                    [
                                        sourceActorId,
                                        targetActorId,
                                    ],
                                ),
                            ],
                            sourceMessageIds: [],
                            sourceEventIds: [
                                ...(
                                    record
                                        .sourceEventIds ||
                                    []
                                ),
                            ],
                            sceneId:
                                record.sceneId,
                            source:
                                'causal_collapse',
                            effectiveSinceClock:
                                record
                                    .effectiveSinceClock,
                            clock:
                                record
                                    .observedAtClock,
                            turn: totalTurns,
                        },
                    );
                    relationships.set(
                        key,
                        {
                            ...existing,
                            familiarity,
                            closeness:
                                clampSocialDimension(
                                    'closeness',
                                    existing.closeness,
                                ),
                            warmth,
                            trust:
                                clampSocialDimension(
                                    'trust',
                                    existing.trust,
                                ),
                            respect:
                                clampSocialDimension(
                                    'respect',
                                    existing.respect,
                                ),
                            influence:
                                clampSocialDimension(
                                    'influence',
                                    existing.influence,
                                ),
                            tension,
                            resentment:
                                clampSocialDimension(
                                    'resentment',
                                    existing
                                        .resentment,
                                ),
                            fear:
                                clampSocialDimension(
                                    'fear',
                                    existing.fear,
                                ),
                            protectiveness:
                                clampSocialDimension(
                                    'protectiveness',
                                    existing
                                        .protectiveness,
                                ),
                            structuralTags:
                                normalizeSocialStructuralTags(
                                    existing
                                        .structuralTags,
                                    causalStructuralTags,
                                ),
                            activeEmotions:
                                Array.isArray(
                                    existing
                                        .activeEmotions,
                                )
                                    ? structuredClone(
                                        existing
                                            .activeEmotions,
                                    )
                                    : [],
                            evidenceIds:
                                [
                                    ...new Set([
                                        ...(
                                            existing
                                                .evidenceIds ||
                                            []
                                        ),
                                        evidenceId,
                                    ]),
                                ].slice(-32),
                            id:
                                existing.id ||
                                `relationship_${sourceActorId}_${targetActorId}`,
                            sourceActorId,
                            targetActorId,
                            updatedTurn:
                                totalTurns,
                            updatedClock:
                                next.clock,
                        },
                    );
                }
            }
            next.socialGraph = {
                ...next.socialGraph,
                relationshipEvidence: [
                    ...relationshipEvidence
                        .values(),
                ].slice(-1000),
                relationships: [
                    ...relationships
                        .values(),
                ].slice(-500),
            };
        }
    }
    next.causalCollapse =
        causalState;
    const guest = intervention?.guestActor;
    if (guest) {
        const canonIdentity =
            findCanonCharacter(
                guest.nameEn,
            );
        const canonDisplay =
            getCanonActorDisplayMetadata({
                ...guest,
                canonCatalogId:
                    canonIdentity?.id ||
                    '',
            });
        const guestRoomId = inferActorRoomId(
            guest,
            getLocalMapDefinition(mapId, next.map),
            roomId,
        );
        const identity =
            getCanonIdentity(
                canonIdentity ||
                guest,
            ) ||
            normalizeNpcIdentity({
                birth:
                    /^\d{4}-\d{2}-\d{2}$/u
                        .test(
                            guest
                                .birthDate ||
                            '',
                        )
                        ? {
                            date:
                                guest
                                    .birthDate,
                            precision:
                                'exact',
                        }
                        : {},
                provenance: {
                    registryVersion: 1,
                    generatedBy:
                        'pacing_guest_reducer',
                    records:
                        guest.birthDate
                            ? [{
                                fieldPath:
                                    'birth',
                                sourceTier:
                                    'authorized_reducer',
                                sourceRef:
                                    `pacing-guest:${guest.id}:${next.clock || 'unknown'}`,
                                effectiveFrom:
                                    next.clock ||
                                    '',
                                effectiveTo:
                                    '',
                            }]
                            : [],
                },
            });
        upsertActorV1(
            next,
            {
                actorId: guest.id,
                coreSource: {
                    ...guest,
                    ...(canonDisplay || {}),
                    aliases:
                        canonDisplay
                            ?.aliases ||
                        guest.aliases ||
                        [],
                    canonCatalogId:
                        canonIdentity?.id ||
                        '',
                    identity,
                    cast: {
                        origin:
                            canonIdentity
                                ? 'canon_catalog'
                                : 'generated_guest',
                        introducedClock:
                            next.clock ||
                            'unknown',
                        introducedTurn:
                            totalTurns,
                    },
                    privateFacts: {
                        secretEn: '',
                        knowledgeEn:
                            canonIdentity
                                ? [
                                    ACTOR_KNOWLEDGE_BOUNDARY_EN,
                                ]
                                : [],
                    },
                },
                runtimeSource: {
                    mapId,
                    roomId:
                        guestRoomId,
                    present: true,
                    lifeStatus:
                        'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                    lifeStatusSinceClock:
                        '',
                    currentActivityEn:
                        guest
                            .currentActivityEn ||
                        '',
                    currentIntentEn:
                        intervention
                            .pressureEn ||
                        '',
                    currentGoalEn: '',
                    temporary:
                        false,
                },
            },
        );
        markActorIntroducedV1(
            next,
            guest.id,
            {
                turn:
                    totalTurns,
            },
        );
    }
    const identityMergeFromId =
        intervention?.identityMergeFromId;
    if (
        guest &&
        identityMergeFromId
    ) {
        const temporary =
            next.actors.find(actor =>
                actor.id ===
                    identityMergeFromId &&
                actor.temporary);
        const guestProfile =
            next.actorLibrary.find(
                actor =>
                    actor.id === guest.id,
            );
        const guestActor =
            next.actors.find(actor =>
                actor.id === guest.id);
        if (
            temporary &&
            guestProfile &&
            guestActor
        ) {
            const temporaryCore =
                next.actorLibrary
                    .find(actor =>
                        actor.id ===
                            identityMergeFromId);
            removeActorV1(
                next,
                guest.id,
            );
            upsertActorV1(
                next,
                {
                    actorId:
                        identityMergeFromId,
                    coreSource: {
                        ...guestProfile,
                        id:
                            identityMergeFromId,
                        cast:
                            temporaryCore
                                ?.cast ||
                            guestProfile.cast,
                        aliases: [
                            ...guestProfile
                                .aliases,
                            ...(
                                temporaryCore
                                    ?.aliases ||
                                []
                            ),
                            temporaryCore
                                ?.nameEn ||
                                '',
                        ],
                        identity: {
                            ...guestProfile
                                .identity,
                            provenance: {
                                ...guestProfile
                                    .identity
                                    .provenance,
                                generatedBy:
                                    'pacing_identity_merge',
                                records: [
                                    ...(
                                        guestProfile
                                            .identity
                                            .provenance
                                            .records ||
                                        []
                                    ),
                                    {
                                        fieldPath:
                                            'identity',
                                        sourceTier:
                                            'authorized_reducer',
                                        sourceRef:
                                            `pacing-assessment:${next.scene?.id || 'unknown'}:${totalTurns}`,
                                        effectiveFrom:
                                            next.clock ||
                                            '',
                                        effectiveTo:
                                            '',
                                    },
                                ],
                            },
                        },
                    },
                    runtimeSource: {
                        ...guestActor,
                        id:
                            identityMergeFromId,
                        temporary:
                            false,
                    },
                },
            );
        }
    }
    (
        intervention?.temporaryActors ||
        []
    ).forEach(actor => {
        if (
            actor.id ===
            identityMergeFromId
        ) {
            return;
        }
        const existing =
            next.actors.find(item =>
                item.id === actor.id);
        if (existing?.temporary) {
            updateActorRuntimeV1(
                next,
                actor.id,
                {
                    present: true,
                    mapId,
                    roomId,
                    currentActivityEn:
                        actor
                            .currentActivityEn ||
                        existing
                            .currentActivityEn,
                    currentIntentEn:
                        intervention
                            .pressureEn ||
                        existing
                            .currentIntentEn,
                },
            );
            return;
        }
        upsertActorV1(
            next,
            {
                actorId: actor.id,
                coreSource: {
                    ...actor,
                    cast: {
                        origin:
                            'scene_temporary',
                        introducedClock:
                            next.clock ||
                            'unknown',
                        introducedTurn:
                            totalTurns,
                    },
                },
                runtimeSource: {
                    mapId,
                    roomId,
                    present: true,
                    lifeStatus:
                        'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                    lifeStatusSinceClock:
                        '',
                    currentActivityEn:
                        actor
                            .currentActivityEn ||
                        '',
                    currentIntentEn:
                        intervention
                            .pressureEn ||
                        '',
                    currentGoalEn: '',
                    temporary: true,
                },
            },
        );
        markActorIntroducedV1(
            next,
            actor.id,
            {
                turn:
                    totalTurns,
            },
        );
    });
    const entrances = new Map(
        (intervention?.actorEntrances || [])
            .map(entry => [entry.id, entry]),
    );
    for (const [actorId, entrance] of entrances) {
        const profile = next.actorLibrary.find(actor =>
            actor.id === actorId);
        if (!profile) {
            continue;
        }
        const entranceRoomId = inferActorRoomId(
            entrance,
            getLocalMapDefinition(mapId, next.map),
            roomId,
        );
        const existing =
            next.actors.find(actor =>
                actor.id === actorId);
        if (existing) {
            updateActorRuntimeV1(
                next,
                actorId,
                {
                    present: true,
                    mapId,
                    roomId:
                        entranceRoomId,
                    currentActivityEn:
                        entrance
                            .currentActivityEn ||
                        existing
                            .currentActivityEn,
                    currentIntentEn:
                        intervention
                            .pressureEn ||
                        existing
                            .currentIntentEn,
                },
            );
            markActorIntroducedV1(
                next,
                actorId,
                {
                    turn:
                        totalTurns,
                },
            );
            continue;
        }
        upsertActorV1(
            next,
            {
                actorId,
                coreSource: profile,
                runtimeSource: {
                    mapId,
                    roomId:
                        entranceRoomId,
                    present: true,
                    lifeStatus:
                        'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                    lifeStatusSinceClock:
                        '',
                    currentActivityEn:
                        entrance
                            .currentActivityEn ||
                        '',
                    currentIntentEn:
                        intervention
                            .pressureEn ||
                        '',
                    currentGoalEn: '',
                    temporary:
                        false,
                },
            },
        );
        markActorIntroducedV1(
            next,
            actorId,
            {
                turn:
                    totalTurns,
            },
        );
    }
    next.pacingDirector = {
        status: 'ready',
        error: '',
        lastAssessedTurn: totalTurns,
        lastAssessedSceneId: next.scene?.id || '',
        reassessAfterTurns: payload.reassessAfterTurns,
        assessment: structuredClone(payload),
        assessedAt: new Date().toISOString(),
        signals: structuredClone(signals),
        pendingBeat: intervention ? {
            ...intervention,
            status: 'pending',
            sceneId: next.scene?.id || '',
            createdTurn: totalTurns,
        } : null,
    };
    if (intervention && next.scene) {
        next.scene.pacingPressureEn = intervention.pressureEn;
    }
    return assertActorContextStateV1(
        next,
    );
}

export function consumePacingBeat(worldState) {
    const pending = worldState.pacingDirector?.pendingBeat;
    if (pending?.status !== 'pending') {
        return worldState;
    }
    const next = structuredClone(worldState);
    next.pacingDirector.pendingBeat = {
        ...next.pacingDirector.pendingBeat,
        status: 'consumed',
        consumedAtClock: next.clock,
        consumedTurn: Number(next.turn?.count || 0),
    };
    const recordId =
        pending
            .causalCollapse
            ?.recordId ||
        pending
            .causalCollapse
            ?.id;
    if (recordId) {
        next.causalCollapse =
            normalizeCausalCollapseState(
                next.causalCollapse,
            );
        next.causalCollapse.records =
            next.causalCollapse.records
                .map(record =>
                    record.id ===
                        recordId
                        ? {
                            ...record,
                            status:
                                'surfaced',
                            surfacedAtClock:
                                next.clock,
                            surfacedAtTurn:
                                Number(
                                    next.turn
                                        ?.count ||
                                    0,
                                ),
                        }
                        : record);
    }
    return next;
}
