import {
    ACTOR_CREATION_PROPOSAL_KEYS,
} from './actor-creation-proposal.js';
import {
    normalizePacingAssessmentPayload as normalizeCausalPacingAssessmentPayload,
    validatePacingAssessment as validateCausalPacingAssessment,
} from './causal-pacing-contract.js';

export const PACING_TEMPORARY_ACTOR_KEYS =
    new Set(
        ACTOR_CREATION_PROPOSAL_KEYS,
    );

export function buildTemporaryActorPromotionPolicy(
    worldState = {},
) {
    return {
        mode:
            'promote_selected_anonymous_interaction',
        promoteWhen:
            'The player selects one specific unnamed person and starts a continuing interaction by addressing, touching, displacing, sitting beside, following, blocking, giving to, taking from, or otherwise directly affecting that person.',
        keepAnonymousWhen:
            'The person is only glimpsed, described as crowd texture, or receives no individual continuing interaction from the player.',
        maximumEntrances: 2,
        reservedActorIds: [
            ...new Set([
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
            ]),
        ].filter(Boolean),
        requiredFields: [
            ...PACING_TEMPORARY_ACTOR_KEYS,
        ],
    };
}

export {
    normalizeCausalPacingAssessmentPayload as normalizePacingAssessmentPayload,
    validateCausalPacingAssessment as validatePacingAssessment,
};
