import {
    CANON_CHARACTER_CATALOG,
    findCanonCharacter,
    findMentionedCanonCharacters,
    getCanonSettingProfile,
} from '../canon-characters.js';
import {
    getRelativeAgeProfile,
} from './character.js';
import {
    resolvePlayerAddressing,
} from './actor-identity.js';
import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

export const DEFAULT_CAST_POLICY =
    Object.freeze({
        maxStoryActors: 48,
        maxGeneratedGuests: 12,
        targetPeerActors: 16,
        maxAuthorityActors: 12,
    });
function normalizeCastPolicy(
    policy = {},
) {
    return {
        maxStoryActors: Math.min(
            80,
            Math.max(
                3,
                Number(
                    policy.maxStoryActors ||
                    DEFAULT_CAST_POLICY
                        .maxStoryActors,
                ),
            ),
        ),
        maxGeneratedGuests: Math.min(
            24,
            Math.max(
                0,
                Number(
                    policy.maxGeneratedGuests ??
                    DEFAULT_CAST_POLICY
                        .maxGeneratedGuests,
                ),
            ),
        ),
        targetPeerActors: Math.min(
            32,
            Math.max(
                6,
                Number(
                    policy.targetPeerActors ||
                    DEFAULT_CAST_POLICY
                        .targetPeerActors,
                ),
            ),
        ),
        maxAuthorityActors: Math.min(
            24,
            Math.max(
                4,
                Number(
                    policy.maxAuthorityActors ||
                    DEFAULT_CAST_POLICY
                        .maxAuthorityActors,
                ),
            ),
        ),
    };
}

export function buildStoryCastPolicy(
    worldState = {},
) {
    const policy = normalizeCastPolicy(
        worldState.castPolicy,
    );
    const profiles = [
        ...new Map(
            (worldState.actorLibrary || [])
                .filter(actor => actor?.id)
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        ).values(),
    ];
    const runtimeById =
        new Map(
            (worldState.actors || [])
                .filter(actor =>
                    actor?.id)
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    const persistentProfiles =
        profiles.filter(actor =>
            runtimeById.get(actor.id)
                ?.temporary !== true);
    const canonActorCount =
        persistentProfiles.filter(actor =>
            Boolean(
                actor.canonCatalogId,
            ) ||
            Boolean(
                findCanonCharacter(
                    actor.nameEn,
                ),
            )).length;
    const generatedGuestCount =
        persistentProfiles.filter(actor =>
            !actor.canonCatalogId &&
            [
                'generated_guest',
                'scene_temporary',
            ].includes(
                actor.cast?.origin,
            ))
            .length;
    const storyActorCount =
        persistentProfiles.length;
    const metActorIds = new Set([
        ...(worldState.sceneArchive || [])
            .flatMap(scene =>
                scene.actorIds || []),
        ...(worldState.actors || [])
            .filter(actor =>
                actor.present !== false)
            .map(actor => actor.id),
        ...profiles
            .filter(actor =>
                actor.cast
                    ?.introducedClock)
            .map(actor => actor.id),
    ]);
    const ageProfiles =
        profiles
            .filter(actor =>
                metActorIds.has(actor.id))
            .map(actor => ({
                id: actor.id,
                ...getRelativeAgeProfile(
                    worldState,
                    actor,
                ),
            }));
    const peerActorCount =
        ageProfiles.filter(actor =>
            [
                'same_age',
                'younger_peer',
                'older_peer',
            ].includes(
                actor.relativeAgeBand,
            )).length;
    const playerRelationshipActorIds =
        new Set(
            (
                worldState.socialGraph
                    ?.relationships ||
                []
            )
                .filter(edge =>
                    (
                        edge.sourceActorId ===
                            'player' ||
                        edge.targetActorId ===
                            'player'
                    ) &&
                    Number(
                        edge.familiarity ||
                        0,
                    ) >= 12)
                .map(edge =>
                    edge.sourceActorId ===
                        'player'
                        ? edge.targetActorId
                        : edge.sourceActorId),
        );
    const playerEdges =
        (
            worldState.socialGraph
                ?.relationships ||
            []
        ).filter(edge =>
            edge.sourceActorId ===
                'player' ||
            edge.targetActorId ===
                'player');
    const playerStructuralTags =
        new Map();
    playerEdges.forEach(edge => {
        const actorId =
            edge.sourceActorId ===
                'player'
                ? edge.targetActorId
                : edge.sourceActorId;
        const tags =
            playerStructuralTags
                .get(actorId) ||
            new Set();
        (
            edge.structuralTags ||
            []
        ).forEach(tag =>
            tags.add(tag));
        playerStructuralTags.set(
            actorId,
            tags,
        );
    });
    const meaningfulRelationshipPattern =
        /(?:family|parent|guardian|friend|mentor|mentee|rival|enemy|romantic|spouse|partner|sibling|cousin|relative|家人|父|母|监护|朋友|导师|师生|对手|敌人|恋人|伴侣|亲属)/iu;
    const meaningfulRelationshipTags =
        new Set([
            'family',
            'friend',
            'mentor',
            'mentee',
            'rival',
            'enemy',
            'romantic_interest',
            'partner',
        ]);
    const allMeaningfulKnownActorIds =
        profiles
            .filter(actor => {
                if (
                    !metActorIds.has(
                        actor.id,
                    )
                ) {
                    return false;
                }
                const memoryCount =
                    [
                        'core',
                        'recent',
                        'everyday',
                    ].reduce(
                        (total, tier) =>
                            total +
                            (
                                worldState
                                    .actorMemoryIndex
                                    ?.byActorId
                                    ?.[actor.id]
                                    ?.[tier]
                                    ?.length ||
                                0
                            ),
                        0,
                    );
                const sceneCount = [
                    ...(
                        worldState
                            .sceneArchive ||
                        []
                    ).map(scene =>
                        scene.actorIds ||
                        []),
                    (
                        worldState.actors ||
                        []
                    )
                        .filter(item =>
                            item.present !==
                                false)
                        .map(item =>
                            item.id),
                ].filter(actorIds =>
                    actorIds.includes(
                        actor.id,
                    )).length;
                const priorityRelationship =
                    [
                        ...(
                            playerStructuralTags
                                .get(actor.id) ||
                            []
                        ),
                    ].some(tag =>
                        meaningfulRelationshipTags
                            .has(tag)) ||
                    meaningfulRelationshipPattern
                        .test([
                            ...(
                                playerStructuralTags
                                    .get(actor.id) ||
                                []
                            ),
                        ].join(' '));
                return (
                    priorityRelationship ||
                    (
                        sceneCount >= 2 &&
                        (
                            playerRelationshipActorIds
                                .has(
                                    actor.id,
                                ) ||
                            memoryCount > 0
                        )
                    )
                );
            })
            .map(actor =>
                actor.id);
    const socialStageExcludedPattern =
        /\b(?:professor|teacher|headmaster|headmistress|parent|guardian|mother|father|family|sibling|relative)\b|(?:教授|教师|校长|家人|父|母|监护|兄弟|姐妹|亲属)/iu;
    const excludedFromSocialStageActorIds =
        profiles
            .filter(actor =>
                allMeaningfulKnownActorIds
                    .includes(actor.id) &&
                socialStageExcludedPattern
                    .test([
                        actor.roleEn,
                        ...(
                            playerStructuralTags
                                .get(actor.id) ||
                            []
                        ),
                    ]
                        .filter(Boolean)
                        .join(' ')))
            .map(actor =>
                actor.id);
    const excludedFromSocialStage =
        new Set(
            excludedFromSocialStageActorIds,
        );
    const meaningfulKnownActorIds =
        allMeaningfulKnownActorIds
            .filter(actorId =>
                !excludedFromSocialStage
                    .has(actorId));
    const meaningfulKnownActorCount =
        meaningfulKnownActorIds.length;
    const socialStage =
        meaningfulKnownActorCount < 12
            ? 'exploration'
            : meaningfulKnownActorCount < 16
                ? 'circle_formation'
                : 'socially_stable';
    const socialStagePolicy =
        socialStage === 'exploration'
            ? {
                newActorShare: 0.7,
                familiarActorShare: 0.3,
                genericFamiliarRecallBudget: 1,
            }
            : socialStage ===
                'circle_formation'
                ? {
                    newActorShare: 0.5,
                    familiarActorShare: 0.5,
                    genericFamiliarRecallBudget: 2,
                }
                : {
                    newActorShare: 0.2,
                    familiarActorShare: 0.8,
                    genericFamiliarRecallBudget: 3,
                };
    const authorityActors =
        profiles.filter(actor =>
            metActorIds.has(actor.id) &&
            /(?:professor|teacher|headmaster|headmistress|parent|guardian|mother|father|minister|authority)/i
                .test([
                    actor.roleEn,
                    ...(
                        playerStructuralTags
                            .get(actor.id) ||
                        []
                    ),
                ].filter(Boolean).join(' ')));
    const sceneActorIds = [
        ...(
            worldState.sceneArchive || []
        ).map(scene =>
            scene.actorIds || []),
        (worldState.actors || [])
            .filter(actor =>
                actor.present !== false)
            .map(actor => actor.id),
    ];
    const actorExposure =
        profiles.map(actor => {
            const sceneCount =
                sceneActorIds.filter(ids =>
                    ids.includes(actor.id))
                    .length;
            let consecutiveSceneCount = 0;
            for (
                let index =
                    sceneActorIds.length - 1;
                index >= 0;
                index--
            ) {
                if (
                    !sceneActorIds[index]
                        .includes(actor.id)
                ) {
                    break;
                }
                consecutiveSceneCount++;
            }
            return {
                id: actor.id,
                sceneCount,
                consecutiveSceneCount,
                reusePenalty:
                    sceneCount * 2 +
                    Math.max(
                        0,
                        consecutiveSceneCount -
                            1,
                    ) * 8,
            };
        });
    const currentTurn =
        Number(
            worldState.turn?.count || 0,
        );
    const stagedPeerTarget =
        currentTurn < 10
            ? Math.min(
                3,
                policy.targetPeerActors,
            )
            : currentTurn < 30
                ? Math.min(
                    6,
                    policy.targetPeerActors,
                )
                : policy.targetPeerActors;
    const urgentPeerDeficit =
        Math.max(
            0,
            stagedPeerTarget -
                peerActorCount,
        );
    const repeatedAuthorityIds =
        authorityActors
            .filter(actor =>
                actorExposure.find(
                    exposure =>
                        exposure.id ===
                            actor.id)
                    ?.consecutiveSceneCount >=
                    2)
            .map(actor => actor.id);
    return {
        ...policy,
        storyActorCount,
        canonActorCount,
        generatedGuestCount,
        metActorCount:
            metActorIds.size,
        metActorIds: [
            ...metActorIds,
        ],
        meaningfulKnownActorCount,
        meaningfulKnownActorIds,
        excludedFromSocialStageActorIds,
        socialStage,
        socialStagePolicy,
        peerActorCount,
        authorityActorCount:
            authorityActors.length,
        peerDeficit: Math.max(
            0,
            policy.targetPeerActors -
                peerActorCount,
        ),
        stagedPeerTarget,
        urgentPeerDeficit,
        repeatedAuthorityIds,
        authorityOverage: Math.max(
            0,
            authorityActors.length -
                policy.maxAuthorityActors,
        ),
        relativeAgeProfiles:
            ageProfiles,
        actorExposure,
        remainingStorySlots: Math.max(
            0,
            policy.maxStoryActors -
                storyActorCount,
        ),
        remainingGeneratedGuestSlots:
            Math.max(
                0,
                policy.maxGeneratedGuests -
                    generatedGuestCount,
            ),
        canonCatalogSize:
            CANON_CHARACTER_CATALOG.length,
    };
}

const LONG_TERM_PURSUIT_TAGS =
    new Set([
        'friend',
        'mentor',
        'mentee',
        'rival',
        'enemy',
        'romantic_interest',
        'partner',
    ]);

export function buildActorSelectionPolicy(
    worldState = {},
    playerAction = '',
    recentPlayerTurns = [],
    currentAddressing = null,
) {
    const castPolicy =
        buildStoryCastPolicy(
            worldState,
        );
    const addressing =
        currentAddressing
            ?.valid === true
            ? currentAddressing
            : resolvePlayerAddressing(
                worldState,
                playerAction,
            );
    const explicitActorIds =
        new Set(
            addressing.valid
                ? addressing.actorIds
                : [],
        );
    const explicitCanonCandidates =
        findMentionedCanonCharacters(
            playerAction,
        ).map(actor => {
            explicitActorIds.add(
                actor.id,
            );
            const profile =
                getCanonSettingProfile(
                    actor,
                );
            return {
                id: actor.id,
                nameEn: actor.nameEn,
                roleEn:
                    actor.roleEn ||
                    'Canon character',
                house:
                    actor.house || '',
                settingTags:
                    profile
                        ?.settingTags ||
                    [],
            };
        });
    const recentTurns =
        (
            recentPlayerTurns ||
            []
        ).slice(-16);
    const directedAttention =
        new Map();
    recentTurns
        .forEach((turn, turnIndex) => {
            const actorIds =
                Array.isArray(
                    turn?.actorIds,
                )
                    ? turn.actorIds
                    : [];
            [
                ...new Set(
                    actorIds,
                ),
            ].forEach(actorId => {
                const attention =
                    directedAttention
                        .get(actorId) ||
                    {
                        turnCount: 0,
                        sceneIds:
                            new Set(),
                        lastTurnIndex: -1,
                    };
                attention.turnCount++;
                if (turn?.sceneId) {
                    attention.sceneIds
                        .add(
                            turn.sceneId,
                        );
                }
                attention.lastTurnIndex =
                    turnIndex;
                directedAttention.set(
                    actorId,
                    attention,
                );
            });
        });
    const recentAttentionStart =
        Math.max(
            0,
            recentTurns.length - 3,
        );
    const pursuedActorIds =
        new Set(
            [
                ...directedAttention
                    .entries(),
            ]
                .filter(([, attention]) =>
                    attention.turnCount >= 2 &&
                    attention.sceneIds.size >= 2 &&
                    attention.lastTurnIndex >=
                        recentAttentionStart)
                .map(([actorId]) =>
                    actorId),
        );
    const playerStructuralTags =
        new Map();
    (
        worldState.socialGraph
            ?.relationships ||
        []
    )
        .filter(edge =>
            edge.sourceActorId ===
                'player' ||
            edge.targetActorId ===
                'player')
        .forEach(edge => {
            const actorId =
                edge.sourceActorId ===
                    'player'
                    ? edge.targetActorId
                    : edge.sourceActorId;
            const tags =
                playerStructuralTags
                    .get(actorId) ||
                new Set();
            (
                edge.structuralTags ||
                []
            ).forEach(tag =>
                tags.add(tag));
            playerStructuralTags.set(
                actorId,
                tags,
            );
        });
    playerStructuralTags
        .forEach((tags, actorId) => {
            if (![...tags].some(tag =>
                LONG_TERM_PURSUIT_TAGS
                    .has(tag))) {
                return;
            }
            pursuedActorIds.add(
                actorId,
            );
        });
    const pendingBeat =
        worldState.pacingDirector
            ?.pendingBeat;
    const unresolvedPendingBeat =
        pendingBeat &&
        pendingBeat.status !==
            'consumed'
            ? pendingBeat
            : null;
    const causalActorIds =
        new Set([
            unresolvedPendingBeat
                ?.focusActorId,
            unresolvedPendingBeat
                ?.guestActor?.id,
            ...(
                unresolvedPendingBeat
                    ?.actorEntrances ||
                []
            ).map(actor =>
                actor.id),
        ].filter(Boolean));
    return {
        priorityOrder: [
            'explicit_current_turn',
            'long_term_pursuit',
            'causal_or_unresolved',
            'social_stage_quota',
            'generic_familiar_recall',
        ],
        explicitActorIds: [
            ...explicitActorIds,
        ],
        pursuedActorIds: [
            ...pursuedActorIds,
        ],
        causalActorIds: [
            ...causalActorIds,
        ],
        explicitCanonCandidates,
        socialStage:
            castPolicy.socialStage,
        meaningfulKnownActorCount:
            castPolicy
                .meaningfulKnownActorCount,
        stageQuota:
            castPolicy
                .socialStagePolicy,
        metActorIds:
            castPolicy.metActorIds,
    };
}

export const CROWDED_SCENE_ROOM_KINDS =
    new Set([
        'hall',
        'platform',
        'station',
        'street',
        'courtyard',
        'classroom',
        'common_room',
        'dining_hall',
        'shop',
    ]);

export function buildSceneCastRotationPolicy(
    worldState = {},
    destination = {},
) {
    const castPolicy =
        buildStoryCastPolicy(
            worldState,
        );
    const currentActiveActorIds =
        (worldState.actors || [])
            .filter(actor =>
                actor.present !==
                    false &&
                !actor.temporary)
            .map(actor =>
                actor.id);
    const mapId =
        destination.mapId ||
        worldState.scene?.mapId ||
        worldState.map?.activeMapId;
    const roomId =
        destination.roomId ||
        worldState.scene?.roomId ||
        worldState.map
            ?.currentLocalNodeId;
    const map =
        getLocalMapDefinition(
            mapId,
            worldState.map,
        );
    const room =
        getMapRooms(
            map,
            worldState.map,
        ).find(item =>
            item.id === roomId);
    const crowdedPublicScene =
        CROWDED_SCENE_ROOM_KINDS
            .has(room?.kind) ||
        (
            [
                'public',
                'student',
                'visitor',
            ].includes(room?.access) &&
            currentActiveActorIds
                .length >= 5
        );
    const exposureByActorId =
        new Map(
            castPolicy
                .actorExposure
                .map(exposure => [
                    exposure.id,
                    exposure,
                ]),
        );
    const highExposureActorIds =
        [...currentActiveActorIds]
            .sort((left, right) => {
                const leftExposure =
                    exposureByActorId
                        .get(left);
                const rightExposure =
                    exposureByActorId
                        .get(right);
                return (
                    Number(
                        rightExposure
                            ?.consecutiveSceneCount ||
                        0,
                    ) -
                    Number(
                        leftExposure
                            ?.consecutiveSceneCount ||
                        0,
                    ) ||
                    Number(
                        rightExposure
                            ?.reusePenalty ||
                        0,
                    ) -
                    Number(
                        leftExposure
                            ?.reusePenalty ||
                        0,
                    )
                );
            })
            .filter(actorId => {
                const exposure =
                    exposureByActorId
                        .get(actorId);
                return (
                    Number(
                        exposure
                            ?.consecutiveSceneCount ||
                        0,
                    ) >= 2 ||
                    Number(
                        exposure
                            ?.sceneCount ||
                        0,
                    ) >= 3
                );
            });
    const minimumNamedTurnover =
        crowdedPublicScene &&
        currentActiveActorIds.length >= 5
            ? Math.min(
                2,
                highExposureActorIds
                    .length,
            )
            : currentActiveActorIds.length >= 4 &&
                highExposureActorIds.length
                ? 1
                : 0;
    const recentSceneCastHistory = [
        ...(worldState.sceneArchive || [])
            .slice(-2)
            .map(scene => ({
                sceneId: scene.id,
                actorIds:
                    scene.actorIds || [],
            })),
        {
            sceneId:
                worldState.scene?.id ||
                '',
            actorIds:
                currentActiveActorIds,
        },
    ];
    return {
        crowdedPublicScene,
        targetActiveNamedCast: {
            min: crowdedPublicScene
                ? 2
                : 1,
            max: 4,
        },
        continuityAnchorBudget:
            crowdedPublicScene
                ? 2
                : 3,
        minimumNamedTurnover,
        currentActiveActorIds,
        highExposureActorIds,
        recommendedRotateOutActorIds:
            highExposureActorIds,
        recentSceneCastHistory,
        anonymousCrowdAllowed:
            crowdedPublicScene,
        destination: {
            mapId,
            roomId,
            roomKind:
                room?.kind || '',
            access:
                room?.access || '',
        },
    };
}
