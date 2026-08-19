import { z } from 'zod';

export const PRE_TURN_EVIDENCE_ROUTE_SCHEMA =
    z.object({
        requested:
            z.boolean(),
        evidenceText:
            z.string().max(500),
        confidence:
            z.number()
                .min(0)
                .max(1),
    }).strict();

export const PRE_TURN_EVIDENCE_ROUTE_JSON_SCHEMA =
    Object.freeze({
        type: 'object',
        additionalProperties: false,
        required: [
            'requested',
            'evidenceText',
            'confidence',
        ],
        properties: {
            requested: {
                type: 'boolean',
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
    });

function neutralRoute() {
    return {
        requested: false,
        evidenceText: '',
        confidence: 0,
    };
}

function validateEvidenceRoute(
    route,
    input,
    {
        label,
    },
) {
    const parsed =
        PRE_TURN_EVIDENCE_ROUTE_SCHEMA
            .safeParse(route);
    const neutral =
        neutralRoute();
    if (!parsed.success) {
        return {
            valid: false,
            value: neutral,
            error:
                `${label} does not match the pre-turn schema.`,
        };
    }
    if (!parsed.data.requested) {
        return {
            valid: true,
            value: neutral,
            error: '',
        };
    }
    const evidenceText =
        String(
            parsed.data
                .evidenceText ||
            '',
        );
    const sourceTexts = [
        String(
            input.playerAction ||
            '',
        ),
    ];
    if (
        !evidenceText ||
        !sourceTexts.some(text =>
            text.includes(
                evidenceText,
            ))
    ) {
        return {
            valid: false,
            value: neutral,
            error:
                `${label} evidenceText is not grounded in the player action.`,
        };
    }
    return {
        valid: true,
        value: parsed.data,
        error: '',
    };
}

export function validatePreTurnCalendarCommitment(
    calendarCommitment,
    input = {},
) {
    return validateEvidenceRoute(
        calendarCommitment,
        input,
        {
            label:
                'Calendar commitment',
        },
    );
}
