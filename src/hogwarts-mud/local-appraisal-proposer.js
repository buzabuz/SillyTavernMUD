import { z } from 'zod';

import {
    adoptEnglishFields,
} from '../../public/scripts/extensions/hogwarts-mud/domain/model-language-adoption.js';
import {
    callStructuredModel,
    enqueueLocalSemanticOperation,
} from './local-semantic-adjudicator.js';

const appraisalProposalTransportSchema =
    z.object({
        observerId:
            z.string().min(1).max(96),
        targetId:
            z.string().min(1).max(96),
        summaryEn:
            z.string().min(1).max(600),
        sourceEventIds:
            z.array(
                z.string()
                    .min(1)
                    .max(180),
            ).min(1).max(4),
        contextTags:
            z.array(
                z.string()
                    .min(1)
                    .max(80),
            ).max(8),
        confidence:
            z.number().finite().min(0),
    }).strict();

const appraisalProposalSchema =
    appraisalProposalTransportSchema.extend({
        confidence:
            z.number().finite().min(0).max(1),
    });

const appraisalBatchTransportResultSchema =
    z.object({
        appraisalProposals:
            z.array(
                appraisalProposalTransportSchema,
            ).max(64),
    }).strict();

const appraisalBatchResultSchema =
    z.object({
        appraisalProposals:
            z.array(
                appraisalProposalSchema,
            ).max(64),
    }).strict();

const appraisalProposalJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'observerId',
        'targetId',
        'summaryEn',
        'sourceEventIds',
        'contextTags',
        'confidence',
    ],
    properties: {
        observerId: {
            type: 'string',
            minLength: 1,
            maxLength: 96,
        },
        targetId: {
            type: 'string',
            minLength: 1,
            maxLength: 96,
        },
        summaryEn: {
            type: 'string',
            minLength: 1,
            maxLength: 600,
        },
        sourceEventIds: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: {
                type: 'string',
            },
        },
        contextTags: {
            type: 'array',
            maxItems: 8,
            items: {
                type: 'string',
            },
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
        },
    },
};

const appraisalBatchJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'appraisalProposals',
    ],
    properties: {
        appraisalProposals: {
            type: 'array',
            maxItems: 64,
            items:
                appraisalProposalJsonSchema,
        },
    },
};

const APPRAISAL_SYSTEM = `You are the local post-turn Appraisal proposer for a persistent RPG. Process every supplied observer in this single batch and return only subjective interpretations grounded in the one committed event.

Rules:
- observers contains the complete rules-authorized participant, witness, or reported-recipient set. Use only those observer IDs.
- targetId must be player or one supplied target ID and must differ from observerId.
- Copy only event.eventId into sourceEventIds. Event owns Scene, message and witness provenance.
- summaryEn is the named observer's interpretation or expectation-forming reaction. Do not copy the objective event summary and do not turn it into world fact or common knowledge.
- Do not use a Person Schema, activation capsule, prior Appraisal, relationship score, secret, private goal, or hidden fact as evidence.
- Different observers may interpret the same event differently. Never transfer one observer's interpretation to another observer.
- Emit no proposal when the event gives an observer no meaningful interpretation. Do not invent missing reactions.
- Use concise English and at most eight neutral contextTags.`;

export function adoptLocalAppraisalLanguage(
    result,
) {
    const diagnostics = [];
    const appraisalProposals = (
        result?.appraisalProposals ||
        []
    ).filter((proposal, index) => {
        const adoption =
            adoptEnglishFields(
                proposal,
                {
                    taskId:
                        'local_appraisal_proposer',
                    recordId:
                        String(
                            proposal
                                ?.observerId ||
                            index,
                        ),
                    requiredFields: [
                        'summaryEn',
                    ],
                },
            );
        diagnostics.push(
            ...adoption.diagnostics
                .map(diagnostic => ({
                    ...diagnostic,
                    fieldPath:
                        `appraisalProposals[${index}].${diagnostic.fieldPath}`,
                })),
        );
        return adoption.admissible;
    });
    return {
        result: {
            ...result,
            appraisalProposals,
        },
        diagnostics,
    };
}

export function normalizeAppraisalConfidence(
    value,
) {
    const confidence =
        Number(value);
    if (
        !Number.isFinite(confidence) ||
        confidence < 0
    ) {
        throw new RangeError(
            'Appraisal confidence must be a finite nonnegative number.',
        );
    }
    if (confidence <= 1) {
        return confidence;
    }
    if (confidence <= 100) {
        return confidence / 100;
    }
    return 1;
}

export function normalizeAppraisalBatchResult(
    result,
) {
    const normalized = {
        ...result,
        appraisalProposals:
            result.appraisalProposals.map(
                proposal => ({
                    ...proposal,
                    confidence:
                        normalizeAppraisalConfidence(
                            proposal.confidence,
                        ),
                }),
            ),
    };
    return appraisalBatchResultSchema.parse(
        normalized,
    );
}

export function proposeTurnAppraisals(
    input,
    {
        model = '',
        callModel =
        callStructuredModel,
        enqueue =
        enqueueLocalSemanticOperation,
    } = {},
) {
    return enqueue(
        async () => {
            const modeled =
                await callModel({
                    taskId:
                    'local_appraisal_proposer',
                    system:
                    APPRAISAL_SYSTEM,
                    input,
                    jsonSchema:
                    appraisalBatchJsonSchema,
                    resultSchema:
                    appraisalBatchTransportResultSchema,
                    unload: true,
                    modelOverride:
                    model,
                });
            const adopted =
                adoptLocalAppraisalLanguage(
                    normalizeAppraisalBatchResult(
                        modeled.result,
                    ),
                );
            return {
                ...modeled,
                result: adopted.result,
                diagnostics: {
                    ...modeled.diagnostics,
                    languageMismatches:
                        adopted.diagnostics,
                    languageMismatchCount:
                        adopted.diagnostics
                            .length,
                },
            };
        },
    );
}
