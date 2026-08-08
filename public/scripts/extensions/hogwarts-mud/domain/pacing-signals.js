// Extracted from the helpers compatibility facade for Task 4.

import {
    findMentionedCanonCharacters,
} from '../canon-characters.js';

import {
    buildStoryCastPolicy,
} from './cast.js';

import {
    detectCausalCollapseOpportunity,
} from './causal-collapse.js';

function getActorIdSet(actorIds = []) {
    return new Set(actorIds.filter(Boolean));
}

function getCoreCastOverlap(leftIds, rightIds) {
    const left = getActorIdSet(leftIds);
    const right = getActorIdSet(rightIds);
    const smallerSize = Math.min(left.size, right.size);
    if (smallerSize < 2) {
        return { sharedCount: 0, ratio: 0 };
    }
    const sharedCount = [...left]
        .filter(actorId => right.has(actorId))
        .length;
    return {
        sharedCount,
        ratio: sharedCount / smallerSize,
    };
}

const EXPLICIT_NEW_ACTOR_PATTERN =
    /(?:随机|随便|任意).{0,8}(?:人|酒客|顾客|店员|老板)|(?:问|找|寻找|叫住|搭话|认识|结识|见见|看看|介绍).{0,12}(?:陌生人|酒客|顾客|店员|老板|别人|其他人|其他学生|同学|新朋友|新人|谁)|(?:谁|有没有人).{0,10}(?:在|坐在|待在).{0,10}(?:车厢|隔间|房间|走廊)|(?:random|any|some).{0,12}(?:person|patron|customer|student)|(?:ask|approach|talk to|meet|find|look for|see who).{0,16}(?:stranger|patron|shopkeeper|barman|other student|new people|someone)/i;

const MIN_AUTOMATIC_PACING_REASSESS_TURNS = 6;

const SATURATED_SCENE_PEER_COUNT = 3;

export function analyzePacingSignals(
    worldState = {},
    playerAction = '',
) {
    const scene = worldState.scene || {};
    const pacing = worldState.pacingDirector || {};
    const totalTurns = Math.max(0, Number(worldState.turn?.count || 0));
    const sceneTurnCount = Math.max(
        0,
        Number(scene.timelineEntries?.length || 0) - 1,
    );
    const currentActorIds = (worldState.actors || [])
        .filter(actor => actor.present !== false)
        .map(actor => actor.id);
    let repeatedCastSceneCount = currentActorIds.length ? 1 : 0;
    for (const archived of [...(worldState.sceneArchive || [])].reverse()) {
        const overlap = getCoreCastOverlap(
            currentActorIds,
            archived.actorIds || [],
        );
        if (overlap.sharedCount < 2 || overlap.ratio < 0.75) {
            break;
        }
        repeatedCastSceneCount += 1;
    }

    const lastAssessedTurn = Number.isInteger(pacing.lastAssessedTurn)
        ? pacing.lastAssessedTurn
        : null;
    const turnsSinceAssessment = lastAssessedTurn === null
        ? Number.POSITIVE_INFINITY
        : Math.max(0, totalTurns - lastAssessedTurn);
    const reassessAfterTurns = Math.min(
        6,
        Math.max(2, Number(pacing.reassessAfterTurns || 3)),
    );
    const automaticReassessAfterTurns =
        Math.max(
            MIN_AUTOMATIC_PACING_REASSESS_TURNS,
            reassessAfterTurns,
        );
    const pendingBeat = pacing.pendingBeat?.status === 'pending';
    const assessmentRunning = pacing.status === 'assessing';
    const assessedCurrentScene =
        pacing.lastAssessedSceneId === scene.id;
    const automaticCooldownReady =
        turnsSinceAssessment >=
            automaticReassessAfterTurns;
    const causalCollapseOpportunity =
        detectCausalCollapseOpportunity(
            worldState,
            playerAction,
        );
    const castPolicy =
        buildStoryCastPolicy(
            worldState,
        );
    const reasons = [];
    const explicitNewActorRequest =
        EXPLICIT_NEW_ACTOR_PATTERN.test(
            String(playerAction || ''),
        );
    const knownActorIds =
        new Set([
            ...(
                worldState
                    .actorLibrary ||
                []
            ).map(actor =>
                actor.id),
            ...(
                worldState.actors ||
                []
            ).map(actor =>
                actor.id),
        ]);
    const explicitCanonActorIds =
        findMentionedCanonCharacters(
            playerAction,
        )
            .map(actor =>
                actor.id)
            .filter(actorId =>
                !knownActorIds.has(
                    actorId,
                ));
    const explicitCanonActorRequest =
        explicitCanonActorIds.length > 0;
    const currentPeerActorCount =
        castPolicy
            .relativeAgeProfiles
            .filter(actor =>
                currentActorIds.includes(
                    actor.id,
                ) &&
                [
                    'same_age',
                    'younger_peer',
                    'older_peer',
                ].includes(
                    actor.relativeAgeBand,
                ))
            .length;
    const currentPeerRosterSaturated =
        currentPeerActorCount >=
            SATURATED_SCENE_PEER_COUNT;
    if (explicitNewActorRequest) {
        reasons.push('explicit_new_actor_request');
    }
    if (explicitCanonActorRequest) {
        reasons.push(
            'explicit_canon_actor_request',
        );
    }
    if (
        causalCollapseOpportunity &&
        automaticCooldownReady
    ) {
        reasons.push(
            'causal_collapse_opportunity',
        );
    }
    if (
        castPolicy.urgentPeerDeficit > 0 &&
        !currentPeerRosterSaturated &&
        sceneTurnCount >= 1 &&
        automaticCooldownReady
    ) {
        reasons.push(
            'relationship_roster_gap',
        );
    }
    if (repeatedCastSceneCount >= 2 &&
        sceneTurnCount >= 1 &&
        !assessedCurrentScene) {
        reasons.push('repeated_core_cast');
    }
    if (
        sceneTurnCount >= 3 &&
        automaticCooldownReady
    ) {
        reasons.push('long_scene');
    }
    if (
        sceneTurnCount >= 8 &&
        turnsSinceAssessment >= 10
    ) {
        reasons.push('periodic_reassessment');
    }
    return {
        shouldAssess: Boolean(
            worldState.phase === 'playing' &&
            scene.id &&
            (
                !pendingBeat ||
                explicitCanonActorRequest
            ) &&
            !assessmentRunning &&
            reasons.length,
        ),
        reasons,
        metrics: {
            totalTurns,
            sceneTurnCount,
            repeatedCastSceneCount,
            currentActorIds,
            turnsSinceAssessment: Number.isFinite(turnsSinceAssessment)
                ? turnsSinceAssessment
                : null,
            reassessAfterTurns,
            automaticReassessAfterTurns,
            explicitNewActorRequest,
            explicitCanonActorRequest,
            explicitCanonActorIds,
            causalCollapseOpportunity,
            causalCollapseCooldownReady:
                automaticCooldownReady,
            currentPeerActorCount,
            currentPeerRosterSaturated,
            socialStage:
                castPolicy.socialStage,
            meaningfulKnownActorCount:
                castPolicy
                    .meaningfulKnownActorCount,
            socialStagePolicy:
                castPolicy
                    .socialStagePolicy,
            urgentPeerDeficit:
                castPolicy
                    .urgentPeerDeficit,
            stagedPeerTarget:
                castPolicy
                    .stagedPeerTarget,
            repeatedAuthorityIds:
                castPolicy
                    .repeatedAuthorityIds,
            forcePeerIntroduction:
                castPolicy
                    .urgentPeerDeficit > 0 &&
                castPolicy
                    .repeatedAuthorityIds
                    .length > 0,
        },
    };
}
