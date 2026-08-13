import {
    applyMemoryConsolidation,
} from './actor-memory-reducer.js';
import {
    addActorMemoryRefV1,
    assertActorContextStateV1,
} from './actor-context-runtime.js';
import {
    applyReportedEventMemories,
} from './event-memory.js';
import {
    applyAppraisalProposals,
} from './memory-synapse-reducer.js';
import {
    createAppraisalId,
} from './memory-synapse-schema.js';
import {
    validateSocialGraphV3,
} from './social-migration.js';
import {
    getEventKnowledgeSourceMessageIds,
} from '../presence-witness-contract.js';

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function retainRecipientAppraisals(
    state,
    result,
    previousAppraisalIds,
) {
    const next =
        structuredClone(state);
    const structural =
        new Set(
            result
                .structurallyRetainedAppraisalIds ||
            [],
        );
    const newAppraisalIds =
        new Set(
            result
                .recipientAppraisals
                .map(proposal =>
                    createAppraisalId(
                        proposal,
                    ))
                .filter(id =>
                    !previousAppraisalIds
                        .has(id)),
        );
    const retained =
        new Set();
    for (const receipt of (
        next.socialGraph
            .relationshipEvidence ||
        []
    )) {
        if (
            !newAppraisalIds.has(
                receipt.appraisalId,
            )
        ) {
            continue;
        }
        const meaningful =
            structural.has(
                receipt.appraisalId,
            ) ||
            (
                receipt
                    .dimensionDeltas ||
                []
            ).some(delta =>
                Math.abs(
                    Number(
                        delta
                            .appliedDelta,
                    ) || 0,
                ) >= 4) ||
            (
                receipt
                    .emotionEffects ||
                []
            ).some(effect =>
                Number(
                    effect.intensity,
                ) >= 3);
        if (meaningful) {
            retained.add(
                receipt.appraisalId,
            );
        } else {
            receipt.appraisalId =
                '';
        }
    }
    const appraisalsById =
        new Map(
            (
                next.memorySynapse
                    ?.appraisals ||
                []
            ).map(appraisal => [
                appraisal.id,
                appraisal,
            ]),
        );
    for (const appraisalId of (
        retained
    )) {
        const appraisal =
            appraisalsById.get(
                appraisalId,
            );
        if (!appraisal) continue;
        addActorMemoryRefV1(
            next,
            appraisal.observerId,
            'recent',
            {
                recordType:
                    'appraisal',
                recordId:
                    appraisal.id,
                addedClock:
                    appraisal
                        .committedClock,
            },
        );
    }
    const protectedIds =
        new Set(retained);
    for (const entry of Object.values(
        next.actorMemoryIndex
            ?.byActorId ||
        {},
    )) {
        if (entry.firstImpressionRef) {
            protectedIds.add(
                entry.firstImpressionRef,
            );
        }
        for (const tier of [
            'core',
            'recent',
            'everyday',
        ]) {
            for (const reference of (
                entry[tier] || []
            )) {
                if (
                    reference.recordType ===
                        'appraisal'
                ) {
                    protectedIds.add(
                        reference.recordId,
                    );
                }
            }
        }
    }
    for (const schema of (
        next.memorySynapse
            ?.personSchemas ||
        []
    )) {
        for (const appraisalId of [
            ...(schema
                .supportAppraisalIds ||
                []),
            ...(schema
                .counterAppraisalIds ||
                []),
        ]) {
            protectedIds.add(
                appraisalId,
            );
        }
    }
    for (const appraisal of (
        next.memorySynapse
            ?.appraisals ||
        []
    )) {
        if (
            appraisal
                .supersedesAppraisalId ||
            appraisal.supersededById
        ) {
            protectedIds.add(
                appraisal.id,
            );
            if (
                appraisal
                    .supersedesAppraisalId
            ) {
                protectedIds.add(
                    appraisal
                        .supersedesAppraisalId,
                );
            }
            if (appraisal.supersededById) {
                protectedIds.add(
                    appraisal
                        .supersededById,
                );
            }
        }
    }
    const deleted =
        new Set(
            [...newAppraisalIds]
                .filter(id =>
                    !protectedIds.has(id)),
        );
    next.memorySynapse
        .appraisals =
        (
            next.memorySynapse
                ?.appraisals ||
            []
        ).filter(appraisal =>
            !deleted.has(
                appraisal.id,
            ));
    for (const receipt of (
        next.socialGraph
            .relationshipEvidence ||
        []
    )) {
        if (
            deleted.has(
                receipt.appraisalId,
            )
        ) {
            receipt.appraisalId =
                '';
        }
    }
    return next;
}

function applyResult(
    worldState,
    result,
    allowedMessageIds,
    {
        boundaryGuard = null,
    } = {},
) {
    if (
        !isRecord(result) ||
        !isRecord(
            result.socialGraph,
        ) ||
        !Array.isArray(
            result.reportedEvents,
        ) ||
        !Array.isArray(
            result.recipientAppraisals,
        ) ||
        !Array.isArray(
            result.memoryReviews,
        ) ||
        !Array.isArray(
            result.schemaOperations,
        ) ||
        !Number.isInteger(
            result
                .processedThroughMessageId,
        )
    ) {
        throw new TypeError(
            'Social Director V3 result contract is invalid.',
        );
    }
    const allowed =
        new Set(
            (
                allowedMessageIds ||
                []
            ).map(Number),
        );
    if (
        !allowed.has(
            result
                .processedThroughMessageId,
        )
    ) {
        throw new TypeError(
            'Social Director cursor is outside the supplied batch.',
        );
    }
    let next =
        structuredClone(
            worldState,
        );
    const previousAppraisalIds =
        new Set(
            (
                next.memorySynapse
                    ?.appraisals ||
                []
            ).map(appraisal =>
                appraisal.id),
        );
    for (const event of (
        result.reportedEvents
    )) {
        const sourceMessageIds =
            getEventKnowledgeSourceMessageIds(
                event,
            );
        if (
            !sourceMessageIds.length ||
            sourceMessageIds.some(id =>
                !allowed.has(id) ||
                id >
                    result
                        .processedThroughMessageId)
        ) {
            throw new TypeError(
                `Reported Event ${event.eventId || '?'} is outside the processed message prefix.`,
            );
        }
        next =
            applyReportedEventMemories(
                next,
                event,
            );
    }
    if (
        result.recipientAppraisals
            .length
    ) {
        next =
            applyAppraisalProposals(
                next,
                result
                    .recipientAppraisals,
            );
    }
    if (
        result.memoryReviews.length ||
        result.schemaOperations
            .length ||
        boundaryGuard
    ) {
        next =
            applyMemoryConsolidation(
                next,
                {
                    reviews:
                        result
                            .memoryReviews,
                    schemaOperations:
                        result
                            .schemaOperations,
                },
                {
                    boundaryGuard,
                },
            );
    }
    next.socialGraph =
        structuredClone(
            result.socialGraph,
        );
    next =
        retainRecipientAppraisals(
            next,
            result,
            previousAppraisalIds,
        );
    const graphValidation =
        validateSocialGraphV3(
            next.socialGraph,
            {
                eventKnowledge:
                    next.eventKnowledge ||
                    [],
                appraisals:
                    next.memorySynapse
                        ?.appraisals ||
                    [],
            },
        );
    if (!graphValidation.valid) {
        throw new TypeError(
            graphValidation.errors
                .join(' '),
        );
    }
    next.socialGraph =
        graphValidation.value;
    return assertActorContextStateV1(
        next,
    );
}

export function validateSocialDirectorResult(
    result,
    worldState,
    allowedMessageIds = [],
) {
    try {
        applyResult(
            worldState,
            result,
            allowedMessageIds,
        );
        return {
            valid: true,
            errors: [],
        };
    } catch (error) {
        return {
            valid: false,
            errors: [
                String(
                    error?.message ||
                    error,
                ),
            ],
        };
    }
}

export function applySocialDirectorResult(
    worldState,
    result,
    allowedMessageIds = [],
    options = {},
) {
    return applyResult(
        worldState,
        result,
        allowedMessageIds,
        options,
    );
}
