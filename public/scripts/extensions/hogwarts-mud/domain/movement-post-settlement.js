import {
    applyAcceptedMovementPlan,
} from './movement.js';
import {
    createMovementOutcome,
} from './movement-outcome.js';

/**
 * Field route: vcon013.result.playerMovement.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

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
    reasonCode =
    'movement_candidate_invalid',
) {
    return {
        valid: false,
        error,
        disposition:
            'blocking_uncertain',
        reasonCode,
    };
}

export function validatePostPlayerMovement(
    preflight,
    candidate,
    narrativeSegments = [],
) {
    if (!preflight?.triggered) {
        return {
            valid: true,
            value: null,
            disposition:
                candidate === null ||
                candidate === undefined
                    ? 'accepted'
                    : 'discarded_unsolicited',
            reasonCode:
                candidate === null ||
                candidate === undefined
                    ? ''
                    : 'movement_without_preflight',
        };
    }
    if (
        preflight.eligibility ===
            'ineligible' ||
        preflight.eligibility ===
            'already_there'
    ) {
        return {
            valid: true,
            value: {
                outcome:
                    preflight
                        .eligibility ===
                    'already_there'
                        ? 'already_there'
                        : 'not_moved',
                destinationMapId: '',
                destinationRoomId: '',
                accompanyingActorIds: [],
                evidenceText: '',
            },
            disposition:
                'normalized_no_movement',
            reasonCode:
                preflight.reasonCode ||
                preflight.eligibility,
        };
    }
    if (
        !candidate ||
        typeof candidate !==
            'object' ||
        Array.isArray(candidate)
    ) {
        return candidateFailure(
            'Triggered movement requires one Post movement candidate.',
            'movement_candidate_missing',
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
            'movement_outcome_invalid',
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
            'movement_evidence_ungrounded',
        );
    }
    const allowedCompanions =
        new Set(
            preflight
                .eligibleCompanionActorIds ||
            [],
        );
    const suppliedCompanions =
        Array.isArray(
            candidate.accompanyingActorIds,
        )
            ? candidate
                .accompanyingActorIds
            : [];
    const companions = [
        ...new Set(
            suppliedCompanions
                .filter(actorId =>
                    allowedCompanions
                        .has(actorId)),
        ),
    ];
    if (outcome !== 'moved') {
        const normalized =
            Boolean(
                String(
                    candidate
                        .destinationMapId ||
                    '',
                ) ||
                String(
                    candidate
                        .destinationRoomId ||
                    '',
                ) ||
                suppliedCompanions
                    .length,
            );
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
            disposition:
                normalized
                    ? 'normalized_no_movement'
                    : 'accepted',
            reasonCode:
                normalized
                    ? 'no_movement_extras_removed'
                    : '',
        };
    }
    if (
        preflight.eligibility !==
        'eligible'
    ) {
        return candidateFailure(
            'An ineligible preflight cannot settle as moved.',
            'movement_preflight_ineligible',
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
            'movement_destination_mismatch',
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
            'movement_required_guide_missing',
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
        disposition:
            companions.length !==
                suppliedCompanions.length
                ? 'normalized'
                : 'accepted',
        reasonCode:
            companions.length !==
                suppliedCompanions.length
                ? 'movement_companions_removed'
                : '',
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
