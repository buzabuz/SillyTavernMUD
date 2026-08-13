import {
    createPersonSchemaId,
    getSchemaFeedbackProvenanceIds,
    initializeMemorySynapseState,
    MIN_SCHEMA_SUPPORT_APPRAISALS,
    MIN_SCHEMA_SUPPORT_SCENES,
    normalizeMemorySynapse,
    normalizePersonSchema,
    validateAppraisalProposal,
    validateAppraisalProposalBatch,
    validateMemorySynapse,
    validatePersonSchema,
} from './memory-synapse-schema.js';

const SCHEMA_OPERATION_KEYS = new Set([
    'type',
    'schemaId',
    'observerId',
    'targetId',
    'factPatternEn',
    'interpretationEn',
    'expectationEn',
    'supportAppraisalIds',
    'counterAppraisalIds',
    'contextTags',
    'supersedesSchemaId',
]);

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function stableCompare(left, right) {
    return String(left).localeCompare(
        String(right),
        'en',
    );
}

function normalizeIds(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    String(value || '').trim())
                .filter(Boolean),
        ),
    ].sort(stableCompare);
}

function sameIds(left, right) {
    return JSON.stringify(
        normalizeIds(left),
    ) === JSON.stringify(
        normalizeIds(right),
    );
}

function throwValidationErrors(errors) {
    if (errors.length) {
        throw new Error(
            [...new Set(errors)].join('; '),
        );
    }
}

function cloneInitializedState(worldState) {
    const initialized =
        initializeMemorySynapseState(
            worldState,
        );
    return structuredClone(
        initialized.state,
    );
}

export function applyAppraisalProposals(
    worldState,
    proposals,
    options = {},
) {
    const validation =
        validateAppraisalProposalBatch(
            proposals,
            worldState,
            options,
        );
    throwValidationErrors(
        validation.errors,
    );
    const next =
        cloneInitializedState(
            worldState,
        );
    const byId = new Map(
        next.memorySynapse.appraisals
            .map(appraisal => [
                appraisal.id,
                appraisal,
            ]),
    );
    const errors = [];
    for (const appraisal of validation.value) {
        const existing = byId.get(
            appraisal.id,
        );
        if (existing) {
            continue;
        }
        if (
            appraisal
                .supersedesAppraisalId
        ) {
            const superseded = byId.get(
                appraisal
                    .supersedesAppraisalId,
            );
            if (
                !superseded ||
                superseded.observerId !==
                    appraisal.observerId ||
                superseded.targetId !==
                    appraisal.targetId ||
                superseded.id ===
                    appraisal.id
            ) {
                errors.push(
                    `Appraisal ${appraisal.id} cannot supersede ${appraisal.supersedesAppraisalId}.`,
                );
                continue;
            }
            if (
                superseded.status ===
                    'superseded' &&
                superseded
                    .supersededById !==
                    appraisal.id
            ) {
                errors.push(
                    `Appraisal ${superseded.id} was already superseded by another record.`,
                );
                continue;
            }
            byId.set(
                superseded.id,
                {
                    ...superseded,
                    status: 'superseded',
                    supersededById:
                        appraisal.id,
                },
            );
        }
        byId.set(
            appraisal.id,
            appraisal,
        );
    }
    throwValidationErrors(errors);
    next.memorySynapse =
        normalizeMemorySynapse({
            ...next.memorySynapse,
            appraisals:
                [...byId.values()],
        });
    const stateValidation =
        validateMemorySynapse(
            next.memorySynapse,
        );
    throwValidationErrors(
        stateValidation.errors,
    );
    return next;
}

function appraisalRejectionReasons(
    errors,
) {
    const values =
        Array.isArray(errors)
            ? errors
            : [];
    const reasons = new Set();
    let hasUnclassifiedError =
        false;
    for (const error of values) {
        const text =
            String(error || '');
        if (
            /Schema|activation-capsule/iu
                .test(text)
        ) {
            reasons.add(
                'schema_feedback_source',
            );
        } else if (
            /no authorized access/iu
                .test(text)
        ) {
            reasons.add(
                'observer_not_authorized',
            );
        } else if (
            /uncommitted event/iu
                .test(text)
        ) {
            reasons.add(
                'uncommitted_event',
            );
        } else if (
            /message provenance/iu
                .test(text)
        ) {
            reasons.add(
                'source_message_mismatch',
            );
        } else if (
            /scene does not match/iu
                .test(text)
        ) {
            reasons.add(
                'source_scene_mismatch',
            );
        } else if (
            /unknown actor/iu
                .test(text)
        ) {
            reasons.add(
                'unknown_actor',
            );
        } else if (
            /interpret an event/iu
                .test(text)
        ) {
            reasons.add(
                'objective_summary_copy',
            );
        } else if (
            /unsupported fields/iu
                .test(text)
        ) {
            reasons.add(
                'unsupported_fields',
            );
        } else {
            hasUnclassifiedError =
                true;
        }
    }
    if (
        hasUnclassifiedError &&
        !reasons.size
    ) {
        reasons.add(
            'invalid_proposal',
        );
    }
    return [...reasons]
        .sort(stableCompare);
}

function summarizeAppraisalOutcomes(
    proposed,
    outcomes,
) {
    const rejected =
        outcomes.filter(outcome =>
            outcome.status ===
                'rejected');
    const counts = new Map();
    for (const reason of rejected
        .flatMap(outcome =>
            outcome.reasons)) {
        counts.set(
            reason,
            (
                counts.get(reason) ||
                0
            ) + 1,
        );
    }
    return {
        proposed,
        accepted:
            outcomes.filter(outcome =>
                outcome.status ===
                    'accepted')
                .length,
        rejected:
            rejected.length,
        reasons:
            [...counts.entries()]
                .sort(([left], [right]) =>
                    stableCompare(
                        left,
                        right,
                    ))
                .map(([code, count]) => ({
                    code,
                    count,
                })),
    };
}

export function reduceAppraisalProposals(
    worldState,
    proposals,
    options = {},
) {
    const source =
        Array.isArray(proposals)
            ? proposals
            : [];
    let next =
        cloneInitializedState(
            worldState,
        );
    const outcomes = [];
    if (source.length > 64) {
        for (
            let index = 0;
            index < source.length;
            index++
        ) {
            outcomes.push({
                index,
                observerId:
                    String(
                        source[index]
                            ?.observerId ||
                        '',
                    ),
                targetId:
                    String(
                        source[index]
                            ?.targetId ||
                        '',
                    ),
                status: 'rejected',
                reasons: [
                    'batch_limit_exceeded',
                ],
            });
        }
        return {
            state: next,
            outcomes,
            summary:
                summarizeAppraisalOutcomes(
                    source.length,
                    outcomes,
                ),
        };
    }
    for (
        let index = 0;
        index < source.length;
        index++
    ) {
        const proposal =
            source[index];
        const validation =
            validateAppraisalProposal(
                proposal,
                next,
                options,
            );
        if (!validation.valid) {
            outcomes.push({
                index,
                observerId:
                    String(
                        proposal
                            ?.observerId ||
                        '',
                    ),
                targetId:
                    String(
                        proposal
                            ?.targetId ||
                        '',
                    ),
                status: 'rejected',
                reasons:
                    appraisalRejectionReasons(
                        validation.errors,
                    ),
            });
            continue;
        }
        const existing =
            next.memorySynapse
                .appraisals
                .some(appraisal =>
                    appraisal.id ===
                        validation
                            .value.id);
        try {
            next =
                applyAppraisalProposals(
                    next,
                    [proposal],
                    options,
                );
            outcomes.push({
                index,
                appraisalId:
                    validation.value.id,
                observerId:
                    validation
                        .value
                        .observerId,
                targetId:
                    validation
                        .value
                        .targetId,
                status: 'accepted',
                duplicate: existing,
                reasons:
                    existing
                        ? [
                            'already_committed',
                        ]
                        : [],
            });
        } catch {
            outcomes.push({
                index,
                observerId:
                    validation
                        .value
                        .observerId,
                targetId:
                    validation
                        .value
                        .targetId,
                status: 'rejected',
                reasons: [
                    'reducer_rejected',
                ],
            });
        }
    }
    return {
        state: next,
        outcomes,
        summary:
            summarizeAppraisalOutcomes(
                source.length,
                outcomes,
            ),
    };
}

export function derivePersonSchemaConfidence(
    supportAppraisals,
    counterAppraisals = [],
) {
    const supports =
        Array.isArray(
            supportAppraisals,
        )
            ? supportAppraisals
            : [];
    const counters =
        Array.isArray(
            counterAppraisals,
        )
            ? counterAppraisals
            : [];
    if (!supports.length) return 0;
    const supportWeight =
        supports.reduce(
            (sum, appraisal) =>
                sum +
                Number(
                    appraisal.confidence ||
                    0,
                ),
            0,
        );
    const counterWeight =
        counters.reduce(
            (sum, appraisal) =>
                sum +
                Number(
                    appraisal.confidence ||
                    0,
                ),
            0,
        );
    const supportMean =
        supportWeight /
        supports.length;
    const contradictionRatio =
        counterWeight /
        Math.max(
            0.0001,
            supportWeight +
                counterWeight,
        );
    return Math.round(
        Math.min(
            0.99,
            Math.max(
                0.05,
                supportMean *
                (
                    1 -
                    contradictionRatio *
                        0.65
                ),
            ),
        ) * 1000,
    ) / 1000;
}

export function isPersonSchemaStable(
    supportAppraisals,
) {
    const supports =
        Array.isArray(
            supportAppraisals,
        )
            ? supportAppraisals
                .filter(appraisal =>
                    appraisal?.status ===
                        'accepted')
            : [];
    return (
        supports.length >=
            MIN_SCHEMA_SUPPORT_APPRAISALS &&
        new Set(
            supports.map(
                appraisal =>
                    appraisal.sceneId,
            ),
        ).size >=
            MIN_SCHEMA_SUPPORT_SCENES
    );
}

function isContestedSchema(
    supportAppraisals,
    counterAppraisals,
) {
    const supportWeight =
        supportAppraisals.reduce(
            (sum, appraisal) =>
                sum +
                Number(
                    appraisal.confidence ||
                    0,
                ),
            0,
        );
    const counterWeight =
        counterAppraisals.reduce(
            (sum, appraisal) =>
                sum +
                Number(
                    appraisal.confidence ||
                    0,
                ),
            0,
        );
    const supportMean =
        supportWeight /
        Math.max(
            1,
            supportAppraisals.length,
        );
    return (
        counterAppraisals.length >= 2 ||
        counterWeight >=
            supportMean
    );
}

function validateOperationShape(
    operation,
) {
    const errors = [];
    if (
        !isRecord(operation) ||
        !Object.keys(operation)
            .every(key =>
                SCHEMA_OPERATION_KEYS.has(
                    key,
                ))
    ) {
        errors.push(
            'Person Schema operation contains unsupported fields.',
        );
        return errors;
    }
    if (operation.type !== 'upsert') {
        errors.push(
            'Person Schema operation type is invalid.',
        );
    }
    return errors;
}

function evidenceForOperation(
    operation,
    existing,
    appraisalById,
) {
    const supportIds =
        normalizeIds([
            ...(
                existing
                    ?.supportAppraisalIds ||
                []
            ),
            ...(
                operation
                    .supportAppraisalIds ||
                []
            ),
        ]);
    const counterIds =
        normalizeIds([
            ...(
                existing
                    ?.counterAppraisalIds ||
                []
            ),
            ...(
                operation
                    .counterAppraisalIds ||
                []
            ),
        ]);
    const counterSet =
        new Set(counterIds);
    const overlap =
        supportIds.filter(id =>
            counterSet.has(id));
    const supports =
        supportIds.map(id =>
            appraisalById.get(id));
    const counters =
        counterIds.map(id =>
            appraisalById.get(id));
    return {
        supportIds,
        counterIds,
        supports,
        counters,
        overlap,
    };
}

function relatedPersonSchemaIds(
    schemaById,
    seedIds,
) {
    const related =
        new Set(
            normalizeIds(seedIds),
        );
    let changed = true;
    while (changed) {
        changed = false;
        for (const schema of schemaById.values()) {
            const lineageIds =
                normalizeIds([
                    schema.id,
                    schema.supersedesSchemaId,
                    schema.supersededById,
                ]);
            if (
                !lineageIds.some(id =>
                    related.has(id))
            ) {
                continue;
            }
            for (const id of lineageIds) {
                if (!related.has(id)) {
                    related.add(id);
                    changed = true;
                }
            }
        }
    }
    return related;
}

function appraisalFeedbackSchemaIds(
    appraisal,
    eventById,
) {
    return normalizeIds([
        ...getSchemaFeedbackProvenanceIds(
            appraisal,
        ),
        ...(
            appraisal?.sourceEventIds ||
            []
        ).flatMap(eventId =>
            getSchemaFeedbackProvenanceIds(
                eventById.get(eventId),
            )),
    ]);
}

function validateEvidence(
    evidence,
    observerId,
    targetId,
    {
        schemaIds = new Set(),
        eventById = new Map(),
    } = {},
) {
    const errors = [];
    if (
        evidence.overlap.length
    ) {
        errors.push(
            'Person Schema support and counter evidence overlap.',
        );
    }
    if (
        [...evidence.supports, ...evidence.counters]
            .some(appraisal =>
                !appraisal)
    ) {
        errors.push(
            'Person Schema operation cites unknown Appraisals.',
        );
    }
    if (
        [...evidence.supports, ...evidence.counters]
            .filter(Boolean)
            .some(appraisal =>
                appraisal.status !==
                    'accepted' ||
                appraisal.observerId !==
                    observerId ||
                appraisal.targetId !==
                    targetId)
    ) {
        errors.push(
            'Person Schema evidence has the wrong status or actor pair.',
        );
    }
    const feedbackAppraisalIds =
        [
            ...evidence.supports,
            ...evidence.counters,
        ]
            .filter(Boolean)
            .filter(appraisal =>
                appraisalFeedbackSchemaIds(
                    appraisal,
                    eventById,
                ).some(schemaId =>
                    schemaIds.has(
                        schemaId,
                    )))
            .map(appraisal =>
                appraisal.id);
    if (feedbackAppraisalIds.length) {
        errors.push(
            `Person Schema evidence contains Schema feedback provenance: ${feedbackAppraisalIds.join(', ')}.`,
        );
    }
    if (
        !isPersonSchemaStable(
            evidence.supports,
        )
    ) {
        errors.push(
            'Stable Person Schema requires three accepted Appraisals across two scenes.',
        );
    }
    return errors;
}

function createSchemaFromOperation(
    operation,
    synapse,
    clock,
    eventKnowledge = [],
) {
    const schemaById = new Map(
        synapse.personSchemas.map(schema => [
            schema.id,
            schema,
        ]),
    );
    const appraisalById = new Map(
        synapse.appraisals.map(appraisal => [
            appraisal.id,
            appraisal,
        ]),
    );
    const suppliedId =
        String(
            operation.schemaId || '',
        ).trim();
    const suppliedExisting =
        suppliedId
            ? schemaById.get(suppliedId)
            : null;
    const identity = {
        observerId:
            operation.observerId ||
            suppliedExisting
                ?.observerId,
        targetId:
            operation.targetId ||
            suppliedExisting
                ?.targetId,
        factPatternEn:
            operation.factPatternEn ||
            suppliedExisting
                ?.factPatternEn,
        interpretationEn:
            operation.interpretationEn ||
            suppliedExisting
                ?.interpretationEn,
        expectationEn:
            operation.expectationEn ||
            suppliedExisting
                ?.expectationEn,
        contextTags:
            operation.contextTags ||
            suppliedExisting
                ?.contextTags,
    };
    const derivedId =
        suppliedId ||
        createPersonSchemaId(identity);
    const existing =
        schemaById.get(derivedId);
    const errors = [];
    if (
        suppliedId &&
        !suppliedExisting
    ) {
        errors.push(
            `Person Schema ${suppliedId} does not exist.`,
        );
    }
    if (
        !identity.observerId ||
        !identity.targetId ||
        !identity.factPatternEn ||
        !identity.interpretationEn ||
        !identity.expectationEn
    ) {
        errors.push(
            'Person Schema upsert requires observer, target, fact pattern, interpretation, and expectation.',
        );
    }
    if (
        existing &&
        (
            existing.status ===
                'superseded' ||
            existing.observerId !==
                identity.observerId ||
            existing.targetId !==
                identity.targetId ||
            (
                operation.factPatternEn &&
                operation.factPatternEn !==
                    existing.factPatternEn
            ) ||
            (
                operation.interpretationEn &&
                operation.interpretationEn !==
                    existing.interpretationEn
            ) ||
            (
                operation.expectationEn &&
                operation.expectationEn !==
                    existing.expectationEn
            )
        )
    ) {
        errors.push(
            'Existing Person Schema cannot be silently rewritten.',
        );
    }
    const evidence =
        evidenceForOperation(
            operation,
            existing,
            appraisalById,
        );
    const feedbackSchemaIds =
        relatedPersonSchemaIds(
            schemaById,
            [
                derivedId,
                operation
                    .supersedesSchemaId,
            ],
        );
    const eventById = new Map(
        (
            Array.isArray(eventKnowledge)
                ? eventKnowledge
                : []
        ).map(event => [
            String(
                event?.eventId ||
                '',
            ),
            event,
        ]),
    );
    errors.push(
        ...validateEvidence(
            evidence,
            identity.observerId,
            identity.targetId,
            {
                schemaIds:
                    feedbackSchemaIds,
                eventById,
            },
        ),
    );
    const supersedesSchemaId =
        String(
            operation
                .supersedesSchemaId ||
            '',
        ).trim();
    const superseded =
        supersedesSchemaId
            ? schemaById.get(
                supersedesSchemaId,
            )
            : null;
    if (
        supersedesSchemaId &&
        (
            !superseded ||
            superseded.id ===
                derivedId ||
            superseded.observerId !==
                identity.observerId ||
            superseded.targetId !==
                identity.targetId ||
            (
                superseded.status ===
                    'superseded' &&
                superseded
                    .supersededById !==
                    derivedId
            )
        )
    ) {
        errors.push(
            `Person Schema ${derivedId} cannot supersede ${supersedesSchemaId}.`,
        );
    }
    throwValidationErrors(errors);
    const supports =
        evidence.supports.filter(Boolean);
    const counters =
        evidence.counters.filter(Boolean);
    const supportEventIds =
        normalizeIds(
            supports.flatMap(appraisal =>
                appraisal.sourceEventIds),
        );
    const schema =
        normalizePersonSchema({
            ...identity,
            id: derivedId,
            confidence:
                derivePersonSchemaConfidence(
                    supports,
                    counters,
                ),
            supportAppraisalIds:
                evidence.supportIds,
            supportEventIds,
            counterAppraisalIds:
                evidence.counterIds,
            status:
                isContestedSchema(
                    supports,
                    counters,
                )
                    ? 'contested'
                    : 'active',
            updatedClock:
                existing
                    ?.updatedClock &&
                sameIds(
                    existing
                        .supportAppraisalIds,
                    evidence.supportIds,
                ) &&
                sameIds(
                    existing
                        .counterAppraisalIds,
                    evidence.counterIds,
                )
                    ? existing
                        .updatedClock
                    : clock,
            ...(supersedesSchemaId
                ? {
                    supersedesSchemaId,
                }
                : {}),
        });
    const validation =
        validatePersonSchema(
            schema,
            {
                appraisals:
                    synapse.appraisals,
            },
        );
    throwValidationErrors(
        validation.errors,
    );
    return {
        schema,
        superseded,
    };
}

export function applyPersonSchemaOperations(
    worldState,
    operations,
) {
    if (
        !Array.isArray(operations) ||
        operations.length > 32
    ) {
        throw new Error(
            'Person Schema operations must contain at most 32 records.',
        );
    }
    const next =
        cloneInitializedState(
            worldState,
        );
    const shapeErrors =
        operations.flatMap(
            validateOperationShape,
        );
    throwValidationErrors(shapeErrors);
    const schemas = new Map(
        next.memorySynapse.personSchemas
            .map(schema => [
                schema.id,
                schema,
            ]),
    );
    for (const operation of operations) {
        const currentSynapse =
            normalizeMemorySynapse({
                ...next.memorySynapse,
                personSchemas:
                    [...schemas.values()],
            });
        const {
            schema,
            superseded,
        } = createSchemaFromOperation(
            operation,
            currentSynapse,
            String(
                next.clock || '',
            ).trim(),
            next.eventKnowledge,
        );
        if (superseded) {
            schemas.set(
                superseded.id,
                {
                    ...superseded,
                    status: 'superseded',
                    supersededById:
                        schema.id,
                },
            );
        }
        schemas.set(
            schema.id,
            schema,
        );
    }
    next.memorySynapse =
        normalizeMemorySynapse({
            ...next.memorySynapse,
            personSchemas:
                [...schemas.values()],
        });
    const validation =
        validateMemorySynapse(
            next.memorySynapse,
        );
    throwValidationErrors(
        validation.errors,
    );
    return next;
}

export function reduceMemorySynapse(
    worldState,
    {
        appraisalProposals = [],
        schemaOperations = [],
    } = {},
    options = {},
) {
    const withAppraisals =
        applyAppraisalProposals(
            worldState,
            appraisalProposals,
            options,
        );
    return applyPersonSchemaOperations(
        withAppraisals,
        schemaOperations,
    );
}
