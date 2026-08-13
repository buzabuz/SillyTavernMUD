import { z } from 'zod';

export const IDENTITY_OBSERVATION_RESULT_SCHEMA =
    z.object({
        actorId:
            z.string().max(96),
        kind:
            z.literal(
                'injury_assessment',
            ),
        status:
            z.enum([
                'visible_injury',
                'no_visible_injury',
            ]),
        injuryType:
            z.string().max(80),
        description:
            z.string().max(500),
        evidenceText:
            z.string().max(500),
        confidence:
            z.number()
                .min(0)
                .max(1),
    }).strict();

export const IDENTITY_OBSERVATION_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'actorId',
        'kind',
        'status',
        'injuryType',
        'description',
        'evidenceText',
        'confidence',
    ],
    properties: {
        actorId: {
            type: 'string',
            maxLength: 96,
        },
        kind: {
            type: 'string',
            const:
                'injury_assessment',
        },
        status: {
            type: 'string',
            enum: [
                'visible_injury',
                'no_visible_injury',
            ],
        },
        injuryType: {
            type: 'string',
            maxLength: 80,
        },
        description: {
            type: 'string',
            maxLength: 500,
        },
        evidenceText: {
            type: 'string',
            maxLength: 500,
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
        },
    },
};

export const IDENTITY_OBSERVATION_SYSTEM_RULES = `
Identity observation rules:
- identityObservations records a directly observed NPC body result even when no physical change happened this turn.
- Emit injury_assessment only when a narration segment explicitly describes a deliberate inspection result or an injury becoming directly visible.
- visible_injury requires an objective injury description. no_visible_injury requires explicit narration that the inspection found no visible injury or damage.
- A character saying "I am uninjured" is dialogue and remains a self claim; dialogue alone must never create an identity observation.
- Ordinary absence of injury wording is not evidence. Do not infer health from silence, activity, posture, clothing, or prior context.
- evidenceText must be an exact substring of one narration segment. Never cite playerAction, dialogue, actor context, or a summary.
- Use only supplied actor IDs. Leave injuryType and description empty for no_visible_injury.
- Keep observations sparse. Do not repeat an existing condition unless this turn explicitly re-examines it.
`;
