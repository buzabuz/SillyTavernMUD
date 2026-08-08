// Extracted from the helpers compatibility facade for Task 4.

import {
    findCanonCharacter,
    getCanonSettingProfile,
} from '../canon-characters.js';

import {
    buildActorNameAliases,
    getCanonActorDisplayMetadata,
} from './actor-identity.js';

import {
    ACTOR_KNOWLEDGE_BOUNDARY_EN,
    normalizeActorMemoryProfile,
    normalizeSharedMemories,
    SHARED_MEMORY_TIER_LIMITS,
} from './actor-memory.js';

import {
    migrateActorPresentationState,
} from './appearance.js';

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
    projectActorSocialRelationships,
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
            next.actorLibrary =
                projectActorSocialRelationships(
                    next.actorLibrary,
                    next.socialGraph,
                );
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
        const canonProfile =
            getCanonSettingProfile(
                canonIdentity,
            );
        const canonDisplay =
            getCanonActorDisplayMetadata({
                ...guest,
                canonCatalogId:
                    canonIdentity?.id ||
                    '',
            });
        const actorSource = canonIdentity
            ? 'canon_catalog'
            : 'pacing_public_guest';
        const guestRoomId = inferActorRoomId(
            guest,
            getLocalMapDefinition(mapId, next.map),
            roomId,
        );
        next.actorLibrary = [
            ...(next.actorLibrary || []),
            normalizeActorMemoryProfile({
                ...guest,
                ...(canonDisplay || {}),
                privateGoalEn: 'Complete the committed public scene beat.',
                fearEn: '',
                secretEn: '',
                knowledgeEn: canonIdentity
                    ? [
                        ACTOR_KNOWLEDGE_BOUNDARY_EN,
                    ]
                    : [],
                impressionOfPlayerEn:
                    'Has only just noticed the player.',
                impressionOfPlayer:
                    '刚刚注意到玩家，还没有形成稳定看法。',
                firstImpressionPending:
                    true,
                canonCatalogId:
                    canonIdentity?.id || '',
                fixedBirthText:
                    canonProfile
                        ?.fixedBirthText ||
                    '',
                birthYear:
                    canonProfile
                        ?.estimatedBirthYear ||
                    (
                        guest.birthDate
                            ? Number(
                                guest.birthDate
                                    .slice(
                                        0,
                                        4,
                                    ),
                            )
                            : null
                    ),
                birthDate:
                    canonIdentity
                        ? ''
                        : guest.birthDate,
                settingTags:
                    canonProfile
                        ?.settingTags ||
                    guest.settingTags,
                relationshipTags: [
                    'acquaintance',
                ],
                introducedClock:
                    next.clock,
                introducedTurn:
                    Number(
                        next.turn?.count ||
                        0,
                    ),
                source: actorSource,
            }),
        ];
        next.actors = [
            ...(next.actors || []),
            {
                id: guest.id,
                nameEn:
                    canonDisplay
                        ?.nameEn ||
                    guest.nameEn,
                name:
                    canonDisplay
                        ?.name ||
                    guest.name ||
                    guest.nameEn,
                aliases:
                    canonDisplay
                        ?.aliases ||
                    buildActorNameAliases(
                        guest.nameEn,
                        guest.name,
                        guest.aliases,
                    ),
                roleEn: guest.roleEn,
                role: guest.roleEn,
                relationshipToPlayerEn: guest.relationshipToPlayerEn,
                relationshipToPlayer: guest.relationshipToPlayerEn,
                impressionOfPlayerEn:
                    'Has only just noticed the player.',
                impressionOfPlayer:
                    '刚刚注意到玩家，还没有形成稳定看法。',
                impressionUpdatedClock: next.clock,
                impressionUpdatedTurn:
                    Number(next.turn?.count || 0),
                firstImpressionPending:
                    true,
                publicDescriptionEn: guest.publicDescriptionEn,
                currentActivityEn: guest.currentActivityEn,
                currentActivity: guest.currentActivityEn,
                currentIntentEn: intervention.pressureEn,
                currentIntent: intervention.pressureEn,
                present: true,
                lifeStatus: 'alive',
                lifeStatusPermanent:
                    false,
                lifeStatusDetailEn:
                    'Alive.',
                lifeStatusDetail:
                    '存活。',
                lifeStatusSinceClock: '',
                mapId,
                roomId: guestRoomId,
                canonCatalogId:
                    canonIdentity?.id || '',
                fixedBirthText:
                    canonProfile
                        ?.fixedBirthText ||
                    '',
                birthYear:
                    canonProfile
                        ?.estimatedBirthYear ||
                    (
                        guest.birthDate
                            ? Number(
                                guest.birthDate
                                    .slice(
                                        0,
                                        4,
                                    ),
                            )
                            : null
                    ),
                birthDate:
                    canonIdentity
                        ? ''
                        : guest.birthDate,
                settingTags:
                    canonProfile
                        ?.settingTags ||
                    guest.settingTags,
                relationshipTags: [
                    'acquaintance',
                ],
                introducedClock:
                    next.clock,
                introducedTurn:
                    Number(
                        next.turn?.count ||
                        0,
                    ),
                source: actorSource,
            },
        ];
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
            const sharedMemories =
                normalizeSharedMemories(
                    guestProfile
                        .sharedMemories,
                );
            sharedMemories.everyday = [
                ...sharedMemories.everyday,
                ...(
                    temporary
                        .temporaryMemories ||
                    []
                ),
            ].slice(
                -SHARED_MEMORY_TIER_LIMITS
                    .everyday,
            );
            const mergedProfile =
                normalizeActorMemoryProfile({
                    ...guestProfile,
                    id:
                        identityMergeFromId,
                    aliases:
                        buildActorNameAliases(
                            guestProfile
                                .nameEn,
                            guestProfile.name,
                            [
                                ...(
                                    guestProfile
                                        .aliases ||
                                    []
                                ),
                                ...(
                                    temporary
                                        .aliases ||
                                    []
                                ),
                                temporary
                                    .nameEn,
                            ],
                        ),
                    sharedMemories,
                    provisionalActorId:
                        identityMergeFromId,
                    resolvedIdentityId:
                        guest.id,
                    identityStatus:
                        'confirmed',
                    identityEvidenceEn:
                        intervention
                            .identityEvidenceEn,
                });
            next.actorLibrary =
                next.actorLibrary
                    .filter(actor =>
                        actor.id !==
                            guest.id)
                    .concat(
                        mergedProfile,
                    );
            next.actors =
                next.actors
                    .filter(actor =>
                        ![
                            guest.id,
                            identityMergeFromId,
                        ].includes(
                            actor.id,
                        ))
                    .concat({
                        ...guestActor,
                        id:
                            identityMergeFromId,
                        aliases:
                            mergedProfile
                                .aliases,
                        temporary: false,
                        provisionalActorId:
                            identityMergeFromId,
                        resolvedIdentityId:
                            guest.id,
                        identityStatus:
                            'confirmed',
                        identityEvidenceEn:
                            intervention
                                .identityEvidenceEn,
                    });
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
            Object.assign(existing, {
                ...actor,
                name:
                    existing.name ||
                    actor.nameEn,
                aliases:
                    buildActorNameAliases(
                        actor.nameEn,
                        existing.name,
                        existing.aliases,
                    ),
                present: true,
                mapId,
                roomId,
                currentActivity:
                    actor
                        .currentActivityEn,
                currentIntentEn:
                    intervention
                        .pressureEn,
                currentIntent:
                    intervention
                        .pressureEn,
            });
            return;
        }
        next.actors.push({
            ...actor,
            name: actor.nameEn,
            aliases:
                buildActorNameAliases(
                    actor.nameEn,
                ),
            relationshipToPlayerEn:
                'scene acquaintance',
            relationshipToPlayer:
                '场景中的临时相识',
            currentActivity:
                actor.currentActivityEn,
            currentIntentEn:
                intervention.pressureEn,
            currentIntent:
                intervention.pressureEn,
            present: true,
            temporary: true,
            provisionalActorId:
                actor.id,
            identityStatus:
                'provisional',
            temporaryMemories: [],
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusDetail:
                '存活。',
            lifeStatusSinceClock: '',
            mapId,
            roomId,
            source:
                'scene_temporary_actor',
            introducedClock:
                next.clock,
            introducedTurn:
                Number(
                    next.turn?.count ||
                    0,
                ),
        });
    });
    const entrances = new Map(
        (intervention?.actorEntrances || [])
            .map(entry => [entry.id, entry]),
    );
    next.actorLibrary =
        (next.actorLibrary || [])
            .map(profile =>
                entrances.has(profile.id)
                    ? normalizeActorMemoryProfile({
                        ...profile,
                        introducedClock:
                            profile
                                .introducedClock ||
                            next.clock,
                        introducedTurn:
                            profile
                                .introducedTurn ??
                            Number(
                                next.turn
                                    ?.count ||
                                0,
                            ),
                        firstImpressionPending:
                            !profile
                                .firstImpressionOfPlayerEn,
                    }, {
                        ...profile,
                        present: true,
                    })
                    : profile);
    next.actors = (next.actors || []).map(actor => {
        const entrance = entrances.get(actor.id);
        const profile = next.actorLibrary
            .find(item =>
                item.id === actor.id);
        const entranceRoomId = entrance
            ? inferActorRoomId(
                entrance,
                getLocalMapDefinition(mapId, next.map),
                roomId,
            )
            : roomId;
        return entrance ? {
            ...actor,
            present: true,
            mapId,
            roomId: entranceRoomId,
            currentActivityEn: entrance.currentActivityEn,
            currentActivity: entrance.currentActivityEn,
            firstImpressionOfPlayerEn:
                profile
                    ?.firstImpressionOfPlayerEn ||
                actor
                    .firstImpressionOfPlayerEn ||
                '',
            firstImpressionOfPlayer:
                profile
                    ?.firstImpressionOfPlayer ||
                actor
                    .firstImpressionOfPlayer ||
                '',
            firstImpressionClock:
                profile
                    ?.firstImpressionClock ||
                actor.firstImpressionClock ||
                '',
            firstImpressionTurn:
                profile
                    ?.firstImpressionTurn ||
                actor.firstImpressionTurn ||
                0,
            firstImpressionPending:
                !(
                    profile
                        ?.firstImpressionOfPlayerEn ||
                    actor
                        .firstImpressionOfPlayerEn
                ),
        } : actor;
    });
    for (const [actorId, entrance] of entrances) {
        if (next.actors.some(actor => actor.id === actorId)) {
            continue;
        }
        const profile = next.actorLibrary.find(actor =>
            actor.id === actorId);
        const entranceRoomId = inferActorRoomId(
            entrance,
            getLocalMapDefinition(mapId, next.map),
            roomId,
        );
        next.actors.push({
            id: profile.id,
            nameEn: profile.nameEn,
            name: profile.name || profile.nameEn,
            roleEn: profile.roleEn,
            role: profile.role || profile.roleEn,
            relationshipToPlayerEn:
                profile.relationshipToPlayerEn,
            relationshipToPlayer:
                profile.relationshipToPlayer ||
                profile.relationshipToPlayerEn,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer ||
                profile.impressionOfPlayerEn,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
            firstImpressionOfPlayerEn:
                profile
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile.firstImpressionClock,
            firstImpressionTurn:
                profile.firstImpressionTurn,
            firstImpressionPending:
                !profile
                    .firstImpressionOfPlayerEn,
            publicDescriptionEn: profile.publicDescriptionEn,
            currentActivityEn: entrance.currentActivityEn,
            currentActivity: entrance.currentActivityEn,
            currentIntentEn: intervention.pressureEn,
            currentIntent: intervention.pressureEn,
            present: true,
            mapId,
            roomId: entranceRoomId,
        });
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
    return migrateActorPresentationState(
        next,
    ).state;
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
