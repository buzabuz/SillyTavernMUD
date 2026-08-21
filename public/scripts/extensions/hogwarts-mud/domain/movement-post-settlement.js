import {
    applyAcceptedMovementPlan,
} from './movement.js';
import {
    createMovementOutcome,
} from './movement-outcome.js';
import {
    isStateRevisionCurrentOrModelTaskRuntimeOnly,
} from './save-revision.js';

export function isPendingMovementSettlementCurrent(
    state,
    pending,
) {
    return Boolean(
        pending &&
        pending.timelineEpoch ===
            String(
                state?.timelineEpoch ||
                '',
            ) &&
        pending.sceneId ===
            String(
                state?.scene?.id ||
                '',
            ) &&
        isStateRevisionCurrentOrModelTaskRuntimeOnly(
            state,
            Number(
                pending.stateRevision ||
                0,
            ),
        ),
    );
}

function hasExactNarrativeEvidence(
    evidenceText,
    narrativeSegments,
) {
    const evidence =
        String(
            evidenceText ||
            '',
        ).trim();
    return Boolean(
        evidence &&
        (narrativeSegments || [])
            .some(segment =>
                String(
                    segment?.textEn ||
                    '',
                ).includes(
                    evidence,
                )),
    );
}

function candidateFailure(
    error,
) {
    return {
        valid: false,
        error,
    };
}

export function validatePostPlayerMovement(
    preflight,
    candidate,
    narrativeSegments = [],
) {
    if (!preflight?.triggered) {
        return candidate === null ||
            candidate === undefined
            ? {
                valid: true,
                value: null,
            }
            : candidateFailure(
                'Ordinary prose cannot create a player movement candidate.',
            );
    }
    if (
        !candidate ||
        typeof candidate !==
            'object' ||
        Array.isArray(candidate)
    ) {
        return candidateFailure(
            'Triggered movement requires one Post movement candidate.',
        );
    }
    const outcome =
        String(
            candidate.outcome ||
            '',
        );
    if (
        ![
            'moved',
            'not_moved',
            'already_there',
        ].includes(outcome)
    ) {
        return candidateFailure(
            'Post movement outcome is invalid.',
        );
    }
    if (
        !hasExactNarrativeEvidence(
            candidate.evidenceText,
            narrativeSegments,
        )
    ) {
        return candidateFailure(
            'Post movement evidence must be an exact saved narration substring.',
        );
    }
    const companions =
        Array.isArray(
            candidate.accompanyingActorIds,
        )
            ? [
                ...new Set(
                    candidate
                        .accompanyingActorIds,
                ),
            ]
            : [];
    if (
        companions.length !==
        (
            candidate
                .accompanyingActorIds ||
            []
        ).length
    ) {
        return candidateFailure(
            'Post movement companions must not contain duplicates.',
        );
    }
    const allowedCompanions =
        new Set(
            preflight
                .eligibleCompanionActorIds ||
            [],
        );
    if (
        companions.some(actorId =>
            !allowedCompanions.has(actorId))
    ) {
        return candidateFailure(
            'Post movement companion is outside the deterministic preflight.',
        );
    }
    if (outcome !== 'moved') {
        if (
            String(
                candidate.destinationMapId ||
                '',
            ) ||
            String(
                candidate.destinationRoomId ||
                '',
            ) ||
            companions.length
        ) {
            return candidateFailure(
                'A no-move candidate cannot carry a destination or companions.',
            );
        }
        return {
            valid: true,
            value: {
                outcome,
                destinationMapId: '',
                destinationRoomId: '',
                accompanyingActorIds: [],
                evidenceText:
                    String(
                        candidate
                            .evidenceText ||
                        '',
                    ),
            },
        };
    }
    if (
        preflight.eligibility !==
        'eligible'
    ) {
        return candidateFailure(
            'An ineligible preflight cannot settle as moved.',
        );
    }
    if (
        String(
            candidate.destinationMapId ||
            '',
        ) !==
        String(
            preflight.candidateMapId ||
            '',
        ) ||
        String(
            candidate.destinationRoomId ||
            '',
        ) !==
        String(
            preflight.candidateRoomId ||
            '',
        )
    ) {
        return candidateFailure(
            'Post movement destination differs from the deterministic preflight.',
        );
    }
    if (
        preflight.mode ===
        'follow_actor' &&
        preflight.guideActorId &&
        !companions.includes(
            preflight.guideActorId,
        )
    ) {
        return candidateFailure(
            'A completed follow movement must evidence the selected guide accompanying the player.',
        );
    }
    return {
        valid: true,
        value: {
            outcome,
            destinationMapId:
                preflight.candidateMapId,
            destinationRoomId:
                preflight.candidateRoomId,
            accompanyingActorIds:
                companions,
            evidenceText:
                String(
                    candidate
                        .evidenceText ||
                    '',
                ),
        },
    };
}

export function settlePostPlayerMovement(
    worldState,
    preflight,
    candidate,
    narrativeSegments = [],
) {
    const validation =
        validatePostPlayerMovement(
            preflight,
            candidate,
            narrativeSegments,
        );
    if (!validation.valid) {
        return validation;
    }
    if (!preflight?.triggered) {
        return {
            valid: true,
            state: worldState,
            movementOutcome: null,
        };
    }
    const value =
        validation.value;
    if (value.outcome !== 'moved') {
        const movementOutcome =
            createMovementOutcome(
                worldState,
                {
                    attempted: true,
                    moved: false,
                    fromMapId:
                        preflight.fromMapId,
                    fromRoomId:
                        preflight.fromRoomId,
                    toMapId:
                        preflight.candidateMapId,
                    toRoomId:
                        preflight.candidateRoomId,
                    toRoomNameEn:
                        preflight.candidateRoomNameEn,
                    reason:
                        value.outcome ===
                        'already_there'
                            ? 'already_there'
                            : preflight.eligibility ===
                                'eligible'
                                ? 'movement_failed'
                                : preflight.reasonCode ||
                                    'movement_failed',
                    guided:
                        preflight.mode ===
                        'follow_actor',
                    guidedByActorId:
                        preflight.guideActorId,
                },
                {
                    mode: preflight.mode,
                    evidenceText:
                        value.evidenceText,
                },
            );
        delete movementOutcome
            .movementOutcomeFactEn;
        return {
            valid: true,
            state: worldState,
            movementOutcome,
        };
    }
    const settled =
        applyAcceptedMovementPlan(
            worldState,
            preflight.markerEvidence,
            {
                confirmed: true,
                confirmedDestination: {
                    mapId:
                        preflight.candidateMapId,
                    roomId:
                        preflight.candidateRoomId,
                    roomNameEn:
                        preflight.candidateRoomNameEn,
                },
                guided:
                    preflight.mode ===
                    'follow_actor',
                guidedByActorId:
                    preflight.guideActorId,
                companionIds:
                    value.accompanyingActorIds,
            },
        );
    if (
        settled.movement?.moved !==
        true ||
        settled.movement.toMapId !==
            preflight.candidateMapId ||
        settled.movement.toRoomId !==
            preflight.candidateRoomId
    ) {
        return candidateFailure(
            'Movement Reducer could not reproduce the accepted deterministic route.',
        );
    }
    return {
        valid: true,
        state: settled.state,
        movementOutcome:
            createMovementOutcome(
                worldState,
                settled.movement,
                {
                    mode: preflight.mode,
                    evidenceText:
                        value.evidenceText,
                },
            ),
    };
}
