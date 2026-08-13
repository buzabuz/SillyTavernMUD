import {
    assertActorContextStateV1,
} from './actor-context-runtime.js';
import {
    validateSocialGraphV3,
} from './social-migration.js';

function protectedAppraisalIds(
    state,
) {
    const protectedIds =
        new Set();
    for (const entry of Object.values(
        state.actorMemoryIndex
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
        state.memorySynapse
            ?.personSchemas ||
        []
    )) {
        for (const id of [
            ...(schema
                .supportAppraisalIds ||
                []),
            ...(schema
                .counterAppraisalIds ||
                []),
        ]) {
            protectedIds.add(id);
        }
    }
    for (const appraisal of (
        state.memorySynapse
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
    return protectedIds;
}

export function expireEverydayAppraisalsAtSceneTransition(
    worldState,
) {
    const next =
        structuredClone(
            worldState,
        );
    const eventIds =
        new Set(
            (
                next.eventKnowledge ||
                []
            ).map(event =>
                event.eventId),
        );
    const appraisals =
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
    const candidates =
        new Set();
    let addedEventRefCount = 0;
    for (const entry of Object.values(
        next.actorMemoryIndex
            ?.byActorId ||
        {},
    )) {
        const existingEventIds =
            new Set(
                (
                    entry.everyday ||
                    []
                )
                    .filter(reference =>
                        reference
                            .recordType ===
                        'event')
                    .map(reference =>
                        reference
                            .recordId),
            );
        const replacementRefs = [];
        for (const reference of (
            entry.everyday || []
        )) {
            if (
                reference.recordType !==
                    'appraisal'
            ) {
                replacementRefs.push(
                    reference,
                );
                continue;
            }
            candidates.add(
                reference.recordId,
            );
            const appraisal =
                appraisals.get(
                    reference.recordId,
                );
            for (const eventId of (
                appraisal
                    ?.sourceEventIds ||
                []
            )) {
                if (
                    !eventIds.has(eventId) ||
                    existingEventIds
                        .has(eventId)
                ) {
                    continue;
                }
                existingEventIds.add(
                    eventId,
                );
                replacementRefs.push({
                    recordType:
                        'event',
                    recordId: eventId,
                    addedClock:
                        reference
                            .addedClock,
                });
                addedEventRefCount++;
            }
        }
        entry.everyday =
            replacementRefs;
    }
    const protectedIds =
        protectedAppraisalIds(
            next,
        );
    const deletedIds =
        new Set(
            [...candidates]
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
            !deletedIds.has(
                appraisal.id,
            ));
    let clearedReceiptCount = 0;
    for (const receipt of (
        next.socialGraph
            ?.relationshipEvidence ||
        []
    )) {
        if (
            deletedIds.has(
                receipt.appraisalId,
            )
        ) {
            receipt.appraisalId =
                '';
            clearedReceiptCount++;
        }
    }
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
    return {
        state:
            assertActorContextStateV1(
                next,
            ),
        stats: {
            expiredRefCount:
                candidates.size,
            addedEventRefCount,
            deletedAppraisalCount:
                deletedIds.size,
            clearedReceiptCount,
        },
    };
}
