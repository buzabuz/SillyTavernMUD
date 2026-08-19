import { z } from 'zod';

export const EVENT_BOUNDARY_TASK_ID =
    'local_event_boundary_observer';
export const EVENT_BOUNDARY_CONTEXT_SIZE =
    4_096;
export const EVENT_BOUNDARY_WINDOW_SIZE =
    10;

const turnSchema = z.object({
    turn: z.number()
        .int()
        .positive(),
    messageId: z.number()
        .int()
        .nonnegative(),
    sceneId: z.string()
        .min(1)
        .max(160),
    clock: z.string()
        .min(1)
        .max(80),
    publicEventEn: z.string()
        .min(1)
        .max(2_000),
    closingNarrationEn:
        z.string()
            .min(1)
            .max(500),
}).strict();

export const eventBoundaryInputSchema =
    z.object({
        checkpointTurn:
            z.number()
                .int()
                .positive(),
        windowStartTurn:
            z.number()
                .int()
                .positive(),
        windowEndTurn:
            z.number()
                .int()
                .positive(),
        turns:
            z.array(turnSchema)
                .length(
                    EVENT_BOUNDARY_WINDOW_SIZE,
                ),
    }).strict()
        .superRefine((value, context) => {
            if (
                value.checkpointTurn %
                    EVENT_BOUNDARY_WINDOW_SIZE !==
                0 ||
                value.windowEndTurn !==
                    value.checkpointTurn ||
                value.windowStartTurn !==
                    value.checkpointTurn -
                    EVENT_BOUNDARY_WINDOW_SIZE +
                    1
            ) {
                context.addIssue({
                    code:
                        z.ZodIssueCode.custom,
                    message:
                        'Event boundary checkpoint range is invalid.',
                });
            }
            value.turns.forEach(
                (turn, index) => {
                    if (
                        turn.turn !==
                        value.windowStartTurn +
                            index
                    ) {
                        context.addIssue({
                            code:
                                z.ZodIssueCode
                                    .custom,
                            path: [
                                'turns',
                                index,
                                'turn',
                            ],
                            message:
                                'Event boundary turns must be contiguous and ordered.',
                        });
                    }
                },
            );
        });

export const eventBoundaryResultSchema =
    z.object({
        ended: z.boolean(),
        evidenceTurn:
            z.number()
                .int()
                .nonnegative(),
        evidenceText:
            z.string()
                .max(2_000),
        confidence:
            z.number()
                .min(0)
                .max(1),
    }).strict();

export const EVENT_BOUNDARY_SYSTEM = `You review one completed ten-turn window from a persistent text RPG and decide whether the bounded interaction or procedure reached a narrative breathing boundary.

Rules:
- Judge the whole ten-turn interaction, not whether one person left.
- ended=true only when the committed text explicitly establishes that the interaction, topic, procedure, meeting, ceremony, examination, task, or shared activity concluded, completed, adjourned, was dismissed, or all remaining parties disengaged.
- One NPC leaving, sitting down, becoming silent, changing form, finishing one sentence, placing an object, or completing one ordinary sub-action does not end the whole interaction.
- A new development may follow an ended boundary, but you do not close the Scene, move an Actor, create knowledge, or write State.
- For ended=true, select one supplied turn and copy either its complete publicEventEn or complete closingNarrationEn verbatim as evidenceText.
- For ended=false, use evidenceTurn=0, evidenceText="", and confidence=0.
- Every confidence is a decimal from 0 to 1, never a percentage.
- Return exactly one JSON object matching the supplied Schema.`;

export function createEventBoundaryJsonSchema(
    input,
) {
    const parsed =
        eventBoundaryInputSchema
            .parse(input);
    const turns =
        parsed.turns.map(turn =>
            turn.turn);
    const evidence = [
        ...new Set([
            '',
            ...parsed.turns.flatMap(turn => [
                turn.publicEventEn,
                turn.closingNarrationEn,
            ]),
        ]),
    ];
    return {
        type: 'object',
        additionalProperties: false,
        required: [
            'ended',
            'evidenceTurn',
            'evidenceText',
            'confidence',
        ],
        properties: {
            ended: {
                type: 'boolean',
            },
            evidenceTurn: {
                type: 'integer',
                enum: [
                    0,
                    ...turns,
                ],
            },
            evidenceText: {
                type: 'string',
                enum: evidence,
                maxLength: 2_000,
            },
            confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
            },
        },
    };
}

export function validateEventBoundaryResult(
    result,
    input,
) {
    const parsedInput =
        eventBoundaryInputSchema
            .safeParse(input);
    const parsedResult =
        eventBoundaryResultSchema
            .safeParse(result);
    if (
        !parsedInput.success ||
        !parsedResult.success
    ) {
        return {
            valid: false,
            value: null,
            error:
                'Event boundary input or result Schema is invalid.',
        };
    }
    const value =
        parsedResult.data;
    if (!value.ended) {
        const valid =
            value.evidenceTurn === 0 &&
            value.evidenceText === '' &&
            value.confidence === 0;
        return {
            valid,
            value:
                valid
                    ? value
                    : null,
            error:
                valid
                    ? ''
                    : 'A not-ended result must have empty evidence and zero confidence.',
        };
    }
    const evidenceTurn =
        parsedInput.data.turns
            .find(turn =>
                turn.turn ===
                value.evidenceTurn);
    const valid =
        value.confidence >= 0.55 &&
        Boolean(
            evidenceTurn &&
            (
                evidenceTurn
                    .publicEventEn
                    .includes(
                        value
                            .evidenceText,
                    ) ||
                evidenceTurn
                    .closingNarrationEn
                    .includes(
                        value
                            .evidenceText,
                    )
            ),
        );
    return {
        valid,
        value:
            valid
                ? value
                : null,
        error:
            valid
                ? ''
                : 'Ended evidence is not grounded in the selected committed turn.',
    };
}
