import {
    detectCausalCollapseOpportunity,
} from './causal-collapse.js';

export function analyzePacingSignals(
    worldState = {},
    playerAction = '',
) {
    const scene = worldState.scene || {};
    const pacing = worldState.pacingDirector || {};
    const totalTurns = Math.max(
        0,
        Number(
            worldState.turn?.count ||
            0,
        ),
    );
    const lastAssessedTurn =
        Number.isInteger(
            pacing.lastAssessedTurn,
        )
            ? pacing.lastAssessedTurn
            : null;
    const turnsSinceAssessment =
        lastAssessedTurn === null
            ? Number.POSITIVE_INFINITY
            : Math.max(
                0,
                totalTurns -
                    lastAssessedTurn,
            );
    const minimumCheckIntervalTurns =
        Math.max(
            1,
            Number(
                worldState
                    .causalCollapse
                    ?.minimumCheckIntervalTurns ||
                6,
            ),
        );
    const cooldownReady =
        turnsSinceAssessment >=
            minimumCheckIntervalTurns;
    const pendingBeat =
        pacing.pendingBeat?.status ===
            'pending';
    const assessmentRunning =
        pacing.status === 'assessing';
    const assessedCurrentScene =
        Boolean(
            scene.id &&
            pacing.lastAssessedSceneId ===
                scene.id,
        );
    const causalCollapseOpportunity =
        detectCausalCollapseOpportunity(
            worldState,
            playerAction,
        );
    const shouldAssess =
        Boolean(
            worldState.phase ===
                'playing' &&
            scene.id &&
            causalCollapseOpportunity &&
            cooldownReady &&
            !pendingBeat &&
            !assessmentRunning &&
            !assessedCurrentScene,
        );
    return {
        shouldAssess,
        reasons:
            shouldAssess
                ? [
                    'causal_collapse_opportunity',
                ]
                : [],
        metrics: {
            totalTurns,
            turnsSinceAssessment:
                Number.isFinite(
                    turnsSinceAssessment,
                )
                    ? turnsSinceAssessment
                    : null,
            minimumCheckIntervalTurns,
            causalCollapseOpportunity,
            causalCollapseCooldownReady:
                cooldownReady,
            assessedCurrentScene,
        },
    };
}
