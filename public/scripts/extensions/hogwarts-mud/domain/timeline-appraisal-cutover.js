import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
} from './actor-context-schema.js';
import {
    validateActorContextStateV1,
} from './actor-context-cutover.js';
import {
    MEMORY_SYNAPSE_VERSION,
    normalizeAppraisal,
    normalizeMemorySynapse,
    validateMemorySynapse,
} from './memory-synapse-schema.js';
import {
    EVENT_KNOWLEDGE_SCHEMA_VERSION,
    createStableContractId,
    getEventKnowledgeSourceMessageIds,
    normalizeEventKnowledge,
    validateEventKnowledgeContract,
} from '../presence-witness-contract.js';
import {
    normalizeSocialDimensionDeltas,
    normalizeSocialEmotionEffects,
    normalizeSocialStructuralTags,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
} from './social-schema.js';
import {
    normalizeSocialGraph,
    validateSocialGraphV3,
} from './social-migration.js';
import {
    migrateLegacyFamilyEdges,
} from './social-claims-reducer.js';
import {
    TIMELINE_CHRONICLE_VERSION,
    normalizeGlobalChronicle,
    validateGlobalChronicle,
} from './timeline-chronicle.js';

const MEMORY_TIERS = Object.freeze([
    'core',
    'recent',
    'everyday',
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

function unique(values) {
    return [
        ...new Set(
            values.filter(Boolean),
        ),
    ];
}

function messageTransactionClock(
    chat,
    messageIds,
) {
    for (
        const messageId of [
            ...messageIds,
        ].sort((left, right) =>
            right - left)
    ) {
        const message =
            chat?.[messageId];
        const candidates = [
            message?.extra
                ?.hogwartsMud
                ?.turnTransaction,
            ...(
                message?.swipe_info ||
                []
            ).map(swipe =>
                swipe?.extra
                    ?.hogwartsMud
                    ?.turnTransaction),
        ];
        const committedClock =
            candidates
                .map(transaction =>
                    String(
                        transaction
                            ?.committedClock ||
                        '',
                    ).trim())
                .find(Boolean);
        if (committedClock) {
            return committedClock;
        }
    }
    return '';
}

function migrateEventKnowledge(
    source,
    chat,
) {
    const actorOptions = {
        actors:
            source.actors || [],
        knownActorIds:
            (source.actorLibrary || [])
                .map(actor =>
                    actor.id),
        cohortIds:
            (source.cohorts || [])
                .map(cohort =>
                    cohort.id),
    };
    const migrated = [];
    for (const original of (
        source.eventKnowledge || []
    )) {
        if (
            original.version ===
                EVENT_KNOWLEDGE_SCHEMA_VERSION &&
            [
                'observed',
                'reported',
            ].includes(
                original.eventKind,
            )
        ) {
            const validation =
                validateEventKnowledgeContract(
                    original,
                    {
                        ...actorOptions,
                        sourceTexts: [
                            original
                                .perception
                                ?.evidenceText,
                        ],
                    },
                );
            if (!validation.valid) {
                throw new TypeError(
                    validation.errors
                        .join(' '),
                );
            }
            migrated.push(
                validation.value,
            );
            continue;
        }
        const sourceMessageIds =
            getEventKnowledgeSourceMessageIds(
                original,
            );
        const clock =
            messageTransactionClock(
                chat,
                sourceMessageIds,
            );
        if (!clock) {
            throw new TypeError(
                `Event ${original.eventId || '?'} has no committed transaction clock.`,
            );
        }
        const normalized =
            normalizeEventKnowledge({
                ...structuredClone(
                    original,
                ),
                version:
                    EVENT_KNOWLEDGE_SCHEMA_VERSION,
                eventKind:
                    'observed',
                clock,
                knownToPlayer:
                    original
                        .knownToPlayer ===
                    true,
            }, {
                ...actorOptions,
                sourceTexts: [
                    original.perception
                        ?.evidenceText,
                ],
            });
        if (!normalized) {
            throw new TypeError(
                `Event ${original.eventId || '?'} cannot migrate to V2.`,
            );
        }
        normalized.knownToPlayer =
            original.knownToPlayer ===
            true;
        migrated.push(normalized);
    }
    return migrated.sort((left, right) =>
        stableCompare(
            left.eventId,
            right.eventId,
        ));
}

function requireEmptyLegacyWorldChange(
    source,
) {
    for (const field of [
        'gossipPacks',
        'worldNews',
        'worldChangeLog',
    ]) {
        const value = source[field];
        if (
            value !== undefined &&
            (
                !Array.isArray(value) ||
                value.length > 0
            )
        ) {
            throw new TypeError(
                `Legacy ${field} cannot be migrated without authoritative Event provenance.`,
            );
        }
    }
    const enrichment =
        source.sceneEnrichment
            ?.worldChanges;
    if (
        enrichment !== undefined &&
        (
            !isRecord(enrichment) ||
            (
                Array.isArray(
                    enrichment
                        .prophetBriefs,
                ) &&
                enrichment
                    .prophetBriefs
                    .length > 0
            ) ||
            (
                Array.isArray(
                    enrichment
                        .gossipUpdates,
                ) &&
                enrichment
                    .gossipUpdates
                    .length > 0
            ) ||
            Object.keys(enrichment)
                .some(key =>
                    ![
                        'status',
                        'sceneId',
                        'fromClock',
                        'toClock',
                        'error',
                        'prophetBriefs',
                        'gossipUpdates',
                    ].includes(key))
        )
    ) {
        throw new TypeError(
            'Legacy sceneEnrichment.worldChanges cannot be migrated without authoritative Event provenance.',
        );
    }
}

function migrateChronicle(source) {
    const archive =
        Array.isArray(
            source.sceneArchive,
        )
            ? source.sceneArchive
            : [];
    const entries =
        archive.map(scene => {
            const summaryEn =
                String(
                    scene
                        .closureSummaryEn ||
                    scene.summaryEn ||
                    '',
                ).trim();
            if (
                !scene.id ||
                !scene.endedClock ||
                !summaryEn
            ) {
                throw new TypeError(
                    `Archived Scene ${scene.id || '?'} cannot seed Global Chronicle.`,
                );
            }
            return {
                sceneId:
                    scene.id,
                endedClock:
                    scene.endedClock,
                summaryEn,
            };
        });
    const chronicle =
        normalizeGlobalChronicle({
            version:
                TIMELINE_CHRONICLE_VERSION,
            entries,
        }, {
            allowLegacySummaryLength:
                true,
        });
    const validation =
        validateGlobalChronicle(
            chronicle,
            {
                allowLegacySummaryLength:
                    true,
            },
        );
    if (
        !validation.valid ||
        validation.value.entries
            .length !== archive.length
    ) {
        throw new TypeError(
            validation.errors.join(' '),
        );
    }
    return validation.value;
}

function completeMissingSceneTimelines(
    state,
) {
    const legacy =
        Array.isArray(state.timeline)
            ? state.timeline
            : [];
    const select = (
        startedClock,
        endedClock = '',
    ) =>
        legacy.filter(entry =>
            (
                !startedClock ||
                stableCompare(
                    entry.clock,
                    startedClock,
                ) >= 0
            ) &&
            (
                !endedClock ||
                stableCompare(
                    entry.clock,
                    endedClock,
                ) <= 0
            ));
    state.sceneArchive =
        (
            state.sceneArchive ||
            []
        ).map(scene => ({
            ...scene,
            timelineEntries:
                Array.isArray(
                    scene.timelineEntries,
                )
                    ? scene
                        .timelineEntries
                    : select(
                        scene.startedClock,
                        scene.endedClock,
                    ),
        }));
    if (
        state.scene &&
        !Array.isArray(
            state.scene.timelineEntries,
        )
    ) {
        state.scene.timelineEntries =
            select(
                state.scene
                    .startedClock,
            );
    }
}

function migrateAppraisals(
    source,
    events,
) {
    const eventsById =
        new Map(
            events.map(event => [
                event.eventId,
                event,
            ]),
        );
    const appraisals = (
        source.memorySynapse
            ?.appraisals ||
        []
    ).map(original => {
        if (
            (
                original
                    .sourceRumorIds ||
                []
            ).length ||
            original.knowledgeSource ===
                'authorized_rumor'
        ) {
            throw new TypeError(
                `Appraisal ${original.id || '?'} has legacy rumor authority.`,
            );
        }
        const sourceEventIds =
            unique(
                original
                    .sourceEventIds ||
                [],
            ).sort(stableCompare);
        const historical =
            original
                .historicalClaimAllowed !==
                false;
        const sourceEvents =
            sourceEventIds
                .map(id =>
                    eventsById.get(id))
                .filter(Boolean);
        if (
            historical &&
            (
                !sourceEventIds.length ||
                sourceEvents.length !==
                    sourceEventIds.length
            )
        ) {
            throw new TypeError(
                `Historical Appraisal ${original.id || '?'} has invalid Event provenance.`,
            );
        }
        if (
            !historical &&
            sourceEventIds.length
        ) {
            throw new TypeError(
                `Non-historical Appraisal ${original.id || '?'} cites Events.`,
            );
        }
        if (historical) {
            const messageUnion =
                unique(
                    sourceEvents
                        .flatMap(event =>
                            getEventKnowledgeSourceMessageIds(
                                event,
                            )),
                ).sort((left, right) =>
                    left - right);
            const oldMessages =
                unique(
                    original
                        .sourceMessageIds ||
                    [],
                ).sort((left, right) =>
                    left - right);
            if (
                JSON.stringify(
                    messageUnion,
                ) !==
                JSON.stringify(
                    oldMessages,
                )
            ) {
                throw new TypeError(
                    `Appraisal ${original.id || '?'} message provenance disagrees with Event authority.`,
                );
            }
            const scenes =
                unique(
                    sourceEvents.map(
                        event =>
                            event.sceneId,
                    ),
                );
            if (
                original.sceneId &&
                (
                    scenes.length !== 1 ||
                    scenes[0] !==
                        original.sceneId
                )
            ) {
                throw new TypeError(
                    `Appraisal ${original.id || '?'} Scene provenance disagrees with Event authority.`,
                );
            }
        }
        return normalizeAppraisal({
            id: original.id,
            observerId:
                original.observerId,
            targetId:
                original.targetId,
            summaryEn:
                original.summaryEn,
            sourceEventIds,
            activationSchemaIds:
                original
                    .activationSchemaIds ||
                original.provenance
                    ?.activationSchemaIds,
            derivedSchemaIds:
                original
                    .derivedSchemaIds ||
                original.provenance
                    ?.derivedSchemaIds,
            contextTags:
                original.contextTags,
            confidence:
                original.confidence,
            status:
                original.status,
            knowledgeSource:
                original.knowledgeSource,
            committedClock:
                original.committedClock,
            historicalClaimAllowed:
                historical,
            supersedesAppraisalId:
                original
                    .supersedesAppraisalId,
            supersededById:
                original
                    .supersededById,
        });
    });
    const synapse =
        normalizeMemorySynapse({
            version:
                MEMORY_SYNAPSE_VERSION,
            maxActiveSchemasPerPair:
                source.memorySynapse
                    ?.maxActiveSchemasPerPair,
            appraisals,
            personSchemas:
                source.memorySynapse
                    ?.personSchemas ||
                [],
        });
    const validation =
        validateMemorySynapse(
            synapse,
            {
                eventKnowledge:
                    events,
            },
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.errors.join(' '),
        );
    }
    return validation.value;
}

function protectedAppraisalIds(
    memoryIndex,
    synapse,
) {
    const protectedIds =
        new Set();
    for (const entry of Object.values(
        memoryIndex.byActorId || {},
    )) {
        if (entry.firstImpressionRef) {
            protectedIds.add(
                entry.firstImpressionRef,
            );
        }
        for (const tier of MEMORY_TIERS) {
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
        synapse.personSchemas || []
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
        synapse.appraisals || []
    )) {
        if (
            appraisal
                .supersedesAppraisalId ||
            appraisal.supersededById
        ) {
            protectedIds.add(
                appraisal.id,
            );
        }
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
                appraisal.supersededById,
            );
        }
    }
    return protectedIds;
}

function migrateMemoryReference(
    source,
    synapse,
    currentSceneId,
) {
    const appraisals =
        new Map(
            synapse.appraisals
                .map(appraisal => [
                    appraisal.id,
                    appraisal,
                ]),
        );
    const index =
        structuredClone(
            source.actorMemoryIndex,
        );
    index.version =
        memoryReferenceVersion;
    const candidates =
        new Set();
    for (const entry of Object.values(
        index.byActorId || {},
    )) {
        entry.everyday =
            (entry.everyday || [])
                .filter(reference => {
                    if (
                        reference.recordType !==
                            'appraisal'
                    ) {
                        return true;
                    }
                    const appraisal =
                        appraisals.get(
                            reference
                                .recordId,
                        );
                    const current =
                        Boolean(
                            appraisal
                                ?.sourceEventIds
                                ?.some(eventId =>
                                    (
                                        source
                                            .eventKnowledge ||
                                        []
                                    ).some(event =>
                                        event
                                            .eventId ===
                                            eventId &&
                                        event
                                            .sceneId ===
                                            currentSceneId)),
                        );
                    if (!current) {
                        candidates.add(
                            reference
                                .recordId,
                        );
                    }
                    return current;
                });
    }
    const protectedIds =
        protectedAppraisalIds(
            index,
            synapse,
        );
    const removedIds =
        new Set(
            [...candidates]
                .filter(id =>
                    !protectedIds.has(id)),
        );
    return {
        index,
        synapse: {
            ...synapse,
            appraisals:
                synapse.appraisals
                    .filter(appraisal =>
                        !removedIds.has(
                            appraisal.id,
                        )),
        },
        removedIds,
    };
}

function migrateSocialGraph(
    source,
    events,
    appraisals,
) {
    const legacyGraph =
        migrateLegacyFamilyEdges(
            source.socialGraph ||
            {},
        );
    const eventsByMessage =
        new Map();
    for (const event of events) {
        for (
            const messageId of
            getEventKnowledgeSourceMessageIds(
                event,
            )
        ) {
            const values =
                eventsByMessage.get(
                    messageId,
                ) || [];
            values.push(event);
            eventsByMessage.set(
                messageId,
                values,
            );
        }
    }
    const oldToNew =
        new Map();
    const receipts = [];
    const receiptsById =
        new Map();
    const dropReasons = {
        noEvent: 0,
        ambiguousEvent: 0,
        missingAppliedDelta: 0,
    };
    for (const evidence of (
        legacyGraph
            ?.relationshipEvidence ||
        []
    )) {
        const matched =
            new Map();
        for (const messageId of (
            evidence.sourceMessageIds ||
            []
        )) {
            for (
                const event of
                eventsByMessage.get(
                    Number(messageId),
                ) || []
            ) {
                if (
                    event.sceneId ===
                        evidence.sceneId
                ) {
                    matched.set(
                        event.eventId,
                        event,
                    );
                }
            }
        }
        if (!matched.size) {
            dropReasons.noEvent++;
            continue;
        }
        if (matched.size !== 1) {
            dropReasons
                .ambiguousEvent++;
            continue;
        }
        if (
            !(
                evidence
                    .dimensionDeltas ||
                []
            ).every(delta =>
                Number.isFinite(
                    Number(
                        delta.appliedDelta,
                    ),
                ))
        ) {
            dropReasons
                .missingAppliedDelta++;
            continue;
        }
        const event =
            [...matched.values()][0];
        const id =
            createStableContractId(
                'relation_evidence',
                {
                    sourceActorId:
                        evidence
                            .sourceActorId,
                    targetActorId:
                        evidence
                            .targetActorId,
                    eventKind:
                        evidence.eventKind ||
                        'other',
                    eventId:
                        event.eventId,
                },
            );
        const receipt = {
            id,
            sourceActorId:
                evidence.sourceActorId,
            targetActorId:
                evidence.targetActorId,
            eventId:
                event.eventId,
            appraisalId: '',
            eventKind:
                evidence.eventKind ||
                'other',
            dimensionDeltas:
                normalizeSocialDimensionDeltas(
                    evidence
                        .dimensionDeltas,
                ),
            structuralTags:
                normalizeSocialStructuralTags(
                    evidence
                        .structuralTags,
                ),
            emotionEffects:
                normalizeSocialEmotionEffects(
                    evidence
                        .emotionAppraisals,
                ),
            clock:
                evidence.clock ||
                event.clock,
            turn:
                Number(
                    evidence.turn,
                ) || 0,
        };
        oldToNew.set(
            evidence.id,
            id,
        );
        const existing =
            receiptsById.get(id);
        if (
            existing &&
            JSON.stringify(existing) !==
                JSON.stringify(receipt)
        ) {
            throw new TypeError(
                `Legacy Social Evidence collides on V3 receipt ${id}.`,
            );
        }
        if (existing) {
            continue;
        }
        receiptsById.set(
            id,
            receipt,
        );
        receipts.push(receipt);
    }
    const relationships =
        (
            legacyGraph
                ?.relationships ||
            []
        ).map(edge => ({
            ...structuredClone(edge),
            evidenceIds:
                unique(
                    (
                        edge
                            .evidenceIds ||
                        []
                    )
                        .map(id =>
                            oldToNew.get(
                                id,
                            ))
                        .filter(Boolean),
                ),
            activeEmotions:
                (
                    edge.activeEmotions ||
                    []
                )
                    .filter(emotion =>
                        oldToNew.has(
                            emotion
                                .sourceEvidenceId,
                        ))
                    .map(emotion => ({
                        ...emotion,
                        sourceEvidenceId:
                            oldToNew.get(
                                emotion
                                    .sourceEvidenceId,
                            ),
                    })),
        }));
    for (const claim of [
        ...(legacyGraph
            ?.identityClaims ||
            []),
        ...(legacyGraph
            ?.relationshipClaims ||
            []),
    ]) {
        if (
            claim.sourceKind !==
                'authority' ||
            !claim.authoritySourceRef
        ) {
            throw new TypeError(
                `Legacy Social claim ${claim.id || '?'} lacks V3 provenance.`,
            );
        }
    }
    const graph =
        normalizeSocialGraph({
            version:
                SOCIAL_GRAPH_VERSION,
            extractorVersion:
                SOCIAL_GRAPH_EXTRACTOR_VERSION,
            identityClaims:
                legacyGraph
                    ?.identityClaims ||
                [],
            relationshipClaims:
                legacyGraph
                    ?.relationshipClaims ||
                [],
            personReferences:
                legacyGraph
                    ?.personReferences ||
                [],
            relationshipEvidence:
                receipts,
            relationships,
            lastProcessedMessageId:
                source.socialGraph
                    ?.lastProcessedMessageId ??
                -1,
            lastRunSceneId:
                source.socialGraph
                    ?.lastRunSceneId ||
                '',
            lastRunTurn:
                source.socialGraph
                    ?.lastRunTurn ||
                0,
            lastRunClock:
                source.socialGraph
                    ?.lastRunClock ||
                '',
            backfilledSceneIds:
                source.socialGraph
                    ?.backfilledSceneIds ||
                [],
            backfillPendingSceneId:
                source.socialGraph
                    ?.backfillPendingSceneId ||
                '',
            status:
                source.socialGraph
                    ?.status ||
                'ready',
            error: '',
            lastRunStats:
                source.socialGraph
                    ?.lastRunStats ||
                null,
        });
    const validation =
        validateSocialGraphV3(
            graph,
            {
                eventKnowledge:
                    events,
                appraisals,
            },
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.errors.join(' '),
        );
    }
    return {
        graph: validation.value,
        dropReasons,
        retainedReceiptCount:
            receipts.length,
    };
}

function hasTargetVersions(source) {
    return (
        source
            .timelineChronicleVersion ===
            TIMELINE_CHRONICLE_VERSION &&
        source.globalChronicle
            ?.version ===
            TIMELINE_CHRONICLE_VERSION &&
        source
            .eventKnowledgeVersion ===
            EVENT_KNOWLEDGE_SCHEMA_VERSION &&
        (
            source.eventKnowledge ||
            []
        ).every(event =>
            event.version ===
                EVENT_KNOWLEDGE_SCHEMA_VERSION) &&
        source.memoryReferenceVersion ===
            memoryReferenceVersion &&
        source.actorMemoryIndex
            ?.version ===
            memoryReferenceVersion &&
        source.memorySynapse
            ?.version ===
            MEMORY_SYNAPSE_VERSION &&
        source.socialGraph
            ?.version ===
            SOCIAL_GRAPH_VERSION
    );
}

function validateMigratedState(source) {
    if (
        Object.hasOwn(
            source,
            'timeline',
        ) ||
        Object.hasOwn(
            source,
            'gossipPacks',
        ) ||
        Object.hasOwn(
            source,
            'worldNews',
        ) ||
        Object.hasOwn(
            source,
            'worldChangeLog',
        ) ||
        Object.hasOwn(
            source.socialGraph ||
                {},
            'statements',
        )
    ) {
        throw new TypeError(
            'Timeline/Appraisal V4 state still contains removed fields.',
        );
    }
    if (
        Object.hasOwn(
            source.sceneEnrichment ||
                {},
            'worldChanges',
        )
    ) {
        throw new TypeError(
            'Timeline/Appraisal V4 state still contains sceneEnrichment.worldChanges.',
        );
    }
    const chronicleValidation =
        validateGlobalChronicle(
            source.globalChronicle,
            {
                allowLegacySummaryLength:
                    true,
            },
        );
    if (!chronicleValidation.valid) {
        throw new TypeError(
            chronicleValidation.errors
                .join(' '),
        );
    }
    const actorOptions = {
        actors:
            source.actors || [],
        knownActorIds:
            (source.actorLibrary || [])
                .map(actor =>
                    actor.id),
        cohortIds:
            (source.cohorts || [])
                .map(cohort =>
                    cohort.id),
    };
    for (const event of (
        source.eventKnowledge ||
        []
    )) {
        const validation =
            validateEventKnowledgeContract(
                event,
                {
                    ...actorOptions,
                    sourceTexts: [
                        event.perception
                            ?.evidenceText,
                    ],
                },
            );
        if (!validation.valid) {
            throw new TypeError(
                validation.errors
                    .join(' '),
            );
        }
    }
    const actorValidation =
        validateActorContextStateV1(
            source,
        );
    if (!actorValidation.valid) {
        throw new TypeError(
            actorValidation.errors
                .join(' '),
        );
    }
    const socialValidation =
        validateSocialGraphV3(
            source.socialGraph,
            {
                eventKnowledge:
                    source
                        .eventKnowledge ||
                    [],
                appraisals:
                    source.memorySynapse
                        ?.appraisals ||
                    [],
            },
        );
    if (!socialValidation.valid) {
        throw new TypeError(
            socialValidation.errors
                .join(' '),
        );
    }
}

export function migrateTimelineAppraisalLifecycleV4(
    state,
    chat = [],
) {
    if (!isRecord(state)) {
        throw new TypeError(
            'Timeline/Appraisal cutover source must be an object.',
        );
    }
    const source =
        structuredClone(state);
    if (hasTargetVersions(source)) {
        validateMigratedState(
            source,
        );
        return {
            state: source,
            changed: false,
            stats: {},
        };
    }
    if (
        source.actorContextVersion !==
            actorContextVersion ||
        source
            .actorDossierProjectionVersion !==
            actorDossierProjectionVersion ||
        source.memoryReferenceVersion !==
            2 ||
        source.actorMemoryIndex
            ?.version !== 2 ||
        source.memorySynapse
            ?.version !== 1 ||
        source.socialGraph
            ?.version !== 2
    ) {
        throw new TypeError(
            'Timeline/Appraisal cutover requires the complete V1/V2 production source boundary.',
        );
    }
    requireEmptyLegacyWorldChange(
        source,
    );
    const next =
        structuredClone(source);
    completeMissingSceneTimelines(
        next,
    );
    next.globalChronicle =
        migrateChronicle(next);
    next.timelineChronicleVersion =
        TIMELINE_CHRONICLE_VERSION;
    delete next.timeline;
    const events =
        migrateEventKnowledge(
            next,
            chat,
        );
    next.eventKnowledge = events;
    next.eventKnowledgeVersion =
        EVENT_KNOWLEDGE_SCHEMA_VERSION;
    let synapse =
        migrateAppraisals(
            next,
            events,
        );
    const memory =
        migrateMemoryReference(
            next,
            synapse,
            next.scene?.id || '',
        );
    next.actorMemoryIndex =
        memory.index;
    next.memoryReferenceVersion =
        memoryReferenceVersion;
    synapse = memory.synapse;
    next.memorySynapse = synapse;
    const social =
        migrateSocialGraph(
            next,
            events,
            synapse.appraisals,
        );
    next.socialGraph =
        social.graph;
    delete next.gossipPacks;
    delete next.worldNews;
    delete next.worldChangeLog;
    if (
        isRecord(
            next.sceneEnrichment,
        )
    ) {
        delete next.sceneEnrichment
            .worldChanges;
    }
    const actorValidation =
        validateActorContextStateV1(
            next,
        );
    if (!actorValidation.valid) {
        throw new TypeError(
            actorValidation.errors.join(' '),
        );
    }
    return {
        state: next,
        changed: true,
        stats: {
            chronicleEntryCount:
                next.globalChronicle
                    .entries.length,
            eventCount:
                events.length,
            appraisalCount:
                synapse.appraisals
                    .length,
            removedAppraisalCount:
                memory.removedIds.size,
            retainedReceiptCount:
                social
                    .retainedReceiptCount,
            droppedReceiptCount:
                (
                    source.socialGraph
                        .relationshipEvidence ||
                    []
                ).length -
                social
                    .retainedReceiptCount,
            receiptDropReasons:
                social.dropReasons,
            removedStatementCount:
                (
                    source.socialGraph
                        .statements ||
                    []
                ).length,
        },
    };
}
