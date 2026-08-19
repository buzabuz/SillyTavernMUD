import { z } from 'zod';

export const movementIntentSchema =
    z.object({
        requested: z.boolean(),
        guideActorId:
            z.string().max(96),
        destinationRoomId:
            z.string().max(96),
        intentEvidenceText:
            z.string().max(500),
        destinationEvidenceSourceRef:
            z.string().max(200),
        destinationEvidenceText:
            z.string().max(500),
        confidence:
            z.number().min(0).max(1),
    }).strict();

export const movementIntentJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'requested',
        'guideActorId',
        'destinationRoomId',
        'intentEvidenceText',
        'destinationEvidenceSourceRef',
        'destinationEvidenceText',
        'confidence',
    ],
    properties: {
        requested: {
            type: 'boolean',
        },
        guideActorId: {
            type: 'string',
            maxLength: 96,
        },
        destinationRoomId: {
            type: 'string',
            maxLength: 96,
        },
        intentEvidenceText: {
            type: 'string',
            maxLength: 500,
        },
        destinationEvidenceSourceRef: {
            type: 'string',
            maxLength: 200,
        },
        destinationEvidenceText: {
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

function stringEnum(
    values,
) {
    return [
        ...new Set([
            '',
            ...values
                .map(value =>
                    String(
                        value ||
                        '',
                    ).trim())
                .filter(Boolean),
        ]),
    ];
}

function roomLabels(
    room,
) {
    return [
        room?.id,
        room?.nameEn,
        ...(room?.aliases || []),
    ]
        .map(label =>
            String(label || '')
                .normalize('NFKC')
                .toLocaleLowerCase()
                .trim())
        .filter(label =>
            label.length >= 2);
}

export function constrainPreTurnMovementJsonSchema(
    baseJsonSchema,
    input,
) {
    const jsonSchema =
        structuredClone(
            baseJsonSchema,
        );
    const properties =
        jsonSchema.properties
            .movementIntent
            .properties;
    const context =
        input?.movementContext;
    const rooms =
        input?.room?.rooms ||
        [];
    const roomById =
        new Map(
            rooms.map(room => [
                room.id,
                room,
            ]),
        );
    const evidenceTexts =
        context?.recentGuideEvidence
            ?.map(entry =>
                String(
                    entry.textEn ||
                    '',
                )
                    .normalize('NFKC')
                    .toLocaleLowerCase()) ||
        [];
    const evidenceRoomIds =
        rooms
            .filter(room =>
                room.id !==
                    context?.currentRoomId &&
                evidenceTexts.some(text =>
                    roomLabels(room)
                        .some(label =>
                            text.includes(
                                label,
                            ))))
            .map(room =>
                room.id);
    const guideRoomIds =
        (
            context
                ?.eligibleGuideCandidates ||
            []
        )
            .filter(candidate =>
                candidate.locationKnown &&
                candidate.mapId ===
                    context.mapId &&
                candidate.roomId !==
                    context.currentRoomId &&
                roomById.has(
                    candidate.roomId,
                ))
            .map(candidate =>
                candidate.roomId);
    const destinationRoomIds =
        context
            ? [
                ...new Set([
                    ...guideRoomIds,
                    ...evidenceRoomIds,
                ]),
            ]
            : [];
    properties.guideActorId.enum =
        stringEnum(
            context
                ?.eligibleGuideCandidates
                ?.map(candidate =>
                    candidate.id) ||
            [],
        );
    properties.destinationRoomId
        .enum =
        stringEnum(
            destinationRoomIds,
        );
    properties.intentEvidenceText
        .enum =
        stringEnum([
            context?.trigger?.raw,
        ]);
    properties
        .destinationEvidenceSourceRef
        .enum =
        stringEnum(
            context
                ?.recentGuideEvidence
                ?.map(entry =>
                    entry.sourceRef) ||
            [],
        );
    properties.destinationEvidenceText
        .enum =
        stringEnum(
            context
                ?.recentGuideEvidence
                ?.map(entry =>
                    entry.textEn) ||
            [],
        );
    const outputFieldOrder =
        context
            ? [
                'schemaVersion',
                'movementIntent',
                'calendarCommitment',
                'temporal',
                'check',
            ]
            : [
                'schemaVersion',
                'calendarCommitment',
                'temporal',
                'check',
                'movementIntent',
            ];
    jsonSchema.required =
        outputFieldOrder;
    jsonSchema.properties =
        Object.fromEntries(
            outputFieldOrder.map(
                field => [
                    field,
                    jsonSchema
                        .properties[
                            field
                        ],
                ],
            ),
        );
    return jsonSchema;
}

function neutralMovementIntent() {
    return {
        requested: false,
        guideActorId: '',
        destinationRoomId: '',
        intentEvidenceText: '',
        destinationEvidenceSourceRef:
            '',
        destinationEvidenceText: '',
        confidence: 0,
    };
}

function evidenceNamesGuide(
    evidenceText,
    guide,
) {
    const evidence =
        String(evidenceText || '')
            .normalize('NFKC')
            .toLocaleLowerCase();
    return [
        guide?.nameEn,
        ...(guide?.aliases || []),
    ].some(label => {
        const normalized =
            String(label || '')
                .normalize('NFKC')
                .toLocaleLowerCase()
                .trim();
        return normalized.length >= 2 &&
            evidence.includes(
                normalized,
            );
    });
}

function destinationEvidenceMatches(
    context,
    intent,
    input,
) {
    const evidence =
        String(
            intent
                .destinationEvidenceText ||
            '',
        );
    const sourceMatches =
        (
            context
                .recentGuideEvidence ||
            []
        ).some(entry =>
            entry.sourceRef ===
                intent
                    .destinationEvidenceSourceRef &&
            String(entry.textEn || '')
                .includes(evidence));
    const room =
        (
            input.room?.rooms ||
            []
        ).find(candidate =>
            candidate.id ===
                intent.destinationRoomId);
    const normalizedEvidence =
        evidence
            .normalize('NFKC')
            .toLocaleLowerCase();
    return Boolean(
        evidence &&
        sourceMatches &&
        roomLabels(room).some(label =>
            normalizedEvidence
                .includes(label)),
    );
}

export function validatePreTurnMovementIntent(
    movementIntent,
    input = {},
) {
    const neutral =
        neutralMovementIntent();
    const parsed =
        movementIntentSchema
            .safeParse(
                movementIntent,
            );
    if (!parsed.success) {
        return {
            valid: false,
            value: neutral,
            error:
                'Movement intent does not match the pre-turn schema.',
        };
    }
    const context =
        input.movementContext;
    if (!context) {
        return {
            valid:
                !parsed.data.requested,
            value: neutral,
            error:
                parsed.data.requested
                    ? 'Movement intent was requested without an unresolved movement trigger.'
                    : '',
        };
    }
    if (!parsed.data.requested) {
        return {
            valid: true,
            value: neutral,
            error: '',
        };
    }
    const intent =
        parsed.data;
    if (
        intent.confidence < 0.55 ||
        !intent.intentEvidenceText ||
        !String(
            input.playerAction ||
            '',
        ).includes(
            intent.intentEvidenceText,
        )
    ) {
        return {
            valid: false,
            value: neutral,
            error:
                'Movement intent is not grounded in the current player action.',
        };
    }
    const candidates =
        context
            .eligibleGuideCandidates ||
        [];
    const guide =
        candidates.find(candidate =>
            candidate.id ===
                intent.guideActorId);
    const namedGuides =
        candidates.filter(candidate =>
            evidenceNamesGuide(
                intent.intentEvidenceText,
                candidate,
            ));
    if (
        !guide ||
        namedGuides.length !== 1 ||
        namedGuides[0].id !==
            guide.id
    ) {
        return {
            valid: false,
            value: neutral,
            error:
                'Movement intent evidence must name exactly one selected supplied guide.',
        };
    }
    if (!intent.destinationRoomId) {
        return {
            valid: true,
            value: {
                ...intent,
                destinationEvidenceSourceRef:
                    '',
                destinationEvidenceText:
                    '',
            },
            error: '',
        };
    }
    const roomIds =
        new Set(
            (
                input.room?.rooms ||
                []
            ).map(room =>
                room.id),
        );
    if (
        !roomIds.has(
            intent.destinationRoomId,
        )
    ) {
        return {
            valid: false,
            value: neutral,
            error:
                'Movement intent destinationRoomId is not a supplied existing room.',
        };
    }
    const authoritativeRoom =
        guide.locationKnown &&
        guide.mapId ===
            context.mapId &&
        guide.roomId !==
            context.currentRoomId
            ? guide.roomId
            : '';
    if (authoritativeRoom) {
        if (
            intent.destinationRoomId !==
            authoritativeRoom
        ) {
            return {
                valid: false,
                value: neutral,
                error:
                    'Movement intent conflicts with the guide Actor authoritative room.',
            };
        }
        return {
            valid: true,
            value: {
                ...intent,
                destinationEvidenceSourceRef:
                    '',
                destinationEvidenceText:
                    '',
            },
            error: '',
        };
    }
    if (
        !destinationEvidenceMatches(
            context,
            intent,
            input,
        )
    ) {
        return {
            valid: false,
            value: neutral,
            error:
                'Movement destination evidence is not grounded in supplied recent public evidence.',
        };
    }
    return {
        valid: true,
        value: intent,
        error: '',
    };
}
