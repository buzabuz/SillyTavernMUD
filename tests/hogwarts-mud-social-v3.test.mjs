/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    addActorMemoryRefV1,
    upsertActorV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-runtime.js';
import {
    applyMemoryConsolidation,
    validateMemoryConsolidation,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-reducer.js';
import {
    expireEverydayAppraisalsAtSceneTransition,
} from '../public/scripts/extensions/hogwarts-mud/domain/appraisal-lifecycle.js';
import {
    createDefaultCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    createDefaultCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    applyAppraisalProposals,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-reducer.js';
import {
    createAppraisalId,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    migrateLegacyFamilyEdges,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-claims-reducer.js';
import {
    normalizeSocialRelationshipEvidence,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    applySocialDirectorResult,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-v3-reducer.js';
import {
    canOpenCurrentSocialSaveReadOnly,
} from '../public/scripts/extensions/hogwarts-mud/runtime/read-only-policy.js';
import {
    createStableContractId,
    normalizeEventKnowledge,
    projectActorEventKnowledge,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    runSocialDirectorGraph,
} from '../src/hogwarts-mud/social-director-v3-graph.js';

const CLOCK =
    '1991-09-03 · 19:12';

function createObservedEvent() {
    const event =
        normalizeEventKnowledge({
            version: 2,
            eventKind:
                'observed',
            sceneId:
                'library_evening',
            clock: CLOCK,
            sourceMessageIds: [
                10,
            ],
            summaryEn:
                'Ron spoke to Hermione beside the library doors.',
            activationSchemaIds: [],
            participantActorIds: [
                'ron',
            ],
            witnessActorIds: [
                'hermione',
                'ron',
            ],
            witnessCohortIds: [],
            witnessBasis: {
                hermione:
                    'room_audible',
                ron: 'direct',
            },
            perception: {
                version: 1,
                visualScope: 'room',
                audibleScope: 'room',
                salience: 'normal',
                attribution: 'clear',
                concealment: 'none',
                directParticipantActorIds: [
                    'ron',
                ],
                evidenceText:
                    'Ron spoke to Hermione beside the library doors.',
                confidence: 0.95,
                source:
                    'post_turn_observer',
            },
            knownToPlayer: false,
            source:
                'post_turn_observer',
        }, {
            actors: [
                {
                    id: 'ron',
                },
                {
                    id: 'hermione',
                },
                {
                    id: 'harry',
                },
            ],
            sourceTexts: [
                'Ron spoke to Hermione beside the library doors.',
            ],
        });
    event.knownToPlayer = true;
    return event;
}

function createInput() {
    const event =
        createObservedEvent();
    return {
        sceneId:
            'library_evening',
        clock: CLOCK,
        turn: 12,
        actorIds: [
            'ron',
            'hermione',
            'harry',
        ],
        actorDirectory: [
            {
                id: 'ron',
                nameEn:
                    'Ron Weasley',
            },
            {
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
            },
            {
                id: 'harry',
                nameEn:
                    'Harry Potter',
            },
        ],
        presentActorIds: [
            'ron',
            'hermione',
        ],
        allowedMessageIds: [
            10,
        ],
        messageSceneIds: {
            10:
                'library_evening',
        },
        witnessActorIdsByMessageId: {
            10: [
                'hermione',
                'ron',
            ],
        },
        eventKnowledge: [
            event,
        ],
        availableAppraisals: [],
        sceneEvidence: [{
            id: 10,
            sceneId:
                'library_evening',
            isUser: false,
            text: '',
            segments: [{
                type: 'dialogue',
                actorId: 'ron',
                textEn:
                    'Hermione, Harry hid the map.',
                historicalClaims: [],
            }],
            witnessActorIds: [
                'hermione',
                'ron',
            ],
        }],
        existingGraph:
            normalizeSocialGraph(),
        extraction: {
            scanComplete: true,
            processedThroughMessageId:
                10,
            reviewAfterTurns: 10,
            reviews: [],
            reportedEvents: [{
                localReportId:
                    'report_map_claim',
                statementKind:
                    'claim',
                sourceStatementText:
                    'Harry hid the map.',
                audienceEvidenceText:
                    'Hermione',
                summaryEn:
                    'Ron told Hermione that Harry had hidden the map.',
                sourceSegmentRefs: [{
                    messageId: 10,
                    segmentIndex: 0,
                }],
                speakerId: 'ron',
                recipientIds: [
                    'hermione',
                ],
                subjectIds: [
                    'harry',
                ],
                aboutEventId: '',
                parentReportedEventId:
                    '',
                distortionLevel: 0,
            }],
            recipientAppraisals: [{
                localReportId:
                    'report_map_claim',
                observerId:
                    'hermione',
                targetId: 'player',
                summaryEn:
                    'Hermione suspects Ron is repeating an unverified story to provoke a reaction.',
                contextTags: [
                    'heard_claim',
                ],
                confidence: 0.8,
            }],
            identityClaims: [],
            relationshipClaims: [],
            personReferences: [],
            relationshipEvidence: [{
                sourceActorId:
                    'hermione',
                targetActorId:
                    'player',
                eventRef:
                    'report_map_claim',
                appraisalRef:
                    'report_map_claim:hermione',
                eventKind:
                    'serious_conversation',
                dimensionDeltas: [{
                    dimension: 'trust',
                    delta: -4,
                    impact:
                        'meaningful',
                }],
                structuralTags: [],
                emotionEffects: [{
                    emotion:
                        'disappointment',
                    intensity: 3,
                }],
            }],
            schemaOperations: [],
        },
    };
}

function createWorldState(
    observedEvent,
) {
    const state =
        createInitialWorldState(
            createDefaultCharacterDraft(),
            {},
            createDefaultCampaign(),
        );
    state.clock = CLOCK;
    state.turn.count = 12;
    for (const actorId of [
        'ron',
        'hermione',
        'harry',
    ]) {
        upsertActorV1(
            state,
            {
                actorId,
                coreSource: {
                    id: actorId,
                    nameEn: actorId,
                    roleEn: 'Student',
                },
                runtimeSource: {
                    id: actorId,
                    mapId:
                        'hogwarts_castle',
                    roomId: 'library',
                    present: true,
                    lifeStatus: 'alive',
                    temporary: false,
                },
            },
        );
    }
    state.eventKnowledge = [
        observedEvent,
    ];
    return state;
}

test('Social V3 commits report, recipient Appraisal, EventRefs and reference-only Receipt atomically', async () => {
    const input = createInput();
    const result =
        await runSocialDirectorGraph(
            input,
        );

    assert.equal(
        result.reportedEvents
            .length,
        1,
    );
    assert.equal(
        result.recipientAppraisals
            .length,
        1,
    );
    assert.equal(
        result.socialGraph
            .relationshipEvidence
            .length,
        1,
    );
    const receipt =
        result.socialGraph
            .relationshipEvidence[0];
    assert.equal(
        receipt.dimensionDeltas[0]
            .appliedDelta,
        -5,
    );
    for (const forbidden of [
        'summary',
        'summaryEn',
        'sourceMessageIds',
        'sceneId',
        'witnessedBy',
    ]) {
        assert.equal(
            Object.hasOwn(
                receipt,
                forbidden,
            ),
            false,
        );
    }

    const state =
        createWorldState(
            input.eventKnowledge[0],
        );
    const before =
        structuredClone(state);
    const next =
        applySocialDirectorResult(
            state,
            result,
            input.allowedMessageIds,
        );

    assert.deepEqual(state, before);
    assert.equal(
        next.eventKnowledge.length,
        2,
    );
    const report =
        next.eventKnowledge.find(
            event =>
                event.eventKind ===
                    'reported',
        );
    assert.ok(report);
    assert.equal(
        report.report
            .aboutEventId,
        '',
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .ron
            .everyday
            .some(reference =>
                reference.recordId ===
                    report.eventId),
        true,
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .hermione
            .everyday
            .some(reference =>
                reference.recordId ===
                    report.eventId),
        true,
    );
    assert.equal(
        next.memorySynapse
            .appraisals.length,
        1,
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .hermione
            .recent
            .some(reference =>
                reference.recordId ===
                    next.memorySynapse
                        .appraisals[0]
                        .id),
        true,
    );
    assert.equal(
        next.socialGraph
            .relationshipEvidence[0]
            .appraisalId,
        next.memorySynapse
            .appraisals[0]
            .id,
    );
    const actorProjection =
        projectActorEventKnowledge(
            next,
            'hermione',
        );
    assert.equal(
        actorProjection
            .reported.length,
        1,
    );
    assert.equal(
        Object.hasOwn(
            actorProjection
                .reported[0]
                .report,
            'aboutEventId',
        ),
        false,
    );
});

test('Social V3 evaporates a weak recipient Appraisal but keeps its EventRef and applied receipt', async () => {
    const input = createInput();
    input.extraction
        .relationshipEvidence[0]
        .dimensionDeltas = [{
            dimension: 'trust',
            delta: -1,
            impact: 'trace',
        }];
    input.extraction
        .relationshipEvidence[0]
        .emotionEffects = [{
            emotion:
                'disappointment',
            intensity: 1,
        }];
    const result =
        await runSocialDirectorGraph(
            input,
        );
    const next =
        applySocialDirectorResult(
            createWorldState(
                input
                    .eventKnowledge[0],
            ),
            result,
            input.allowedMessageIds,
        );
    const report =
        next.eventKnowledge.find(
            event =>
                event.eventKind ===
                    'reported',
        );

    assert.equal(
        next.memorySynapse
            .appraisals.length,
        0,
    );
    assert.equal(
        next.socialGraph
            .relationshipEvidence[0]
            .appraisalId,
        '',
    );
    assert.equal(
        next.socialGraph
            .relationshipEvidence[0]
            .dimensionDeltas[0]
            .appliedDelta,
        -1,
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .hermione
            .everyday
            .some(reference =>
                reference.recordId ===
                    report.eventId),
        true,
    );
});

test('Social V3 cursor preserves an unprocessed suffix', async () => {
    const input = createInput();
    input.allowedMessageIds = [
        10,
        11,
    ];
    input.messageSceneIds[11] =
        'library_evening';
    input
        .witnessActorIdsByMessageId[
        11
    ] = [
        'hermione',
        'ron',
    ];
    input.sceneEvidence.push({
        ...structuredClone(
            input.sceneEvidence[0],
        ),
        id: 11,
    });
    input.eventKnowledge.push({
        ...structuredClone(
            input.eventKnowledge[0],
        ),
        eventId:
            'event_second_message',
        sourceMessageIds: [
            11,
        ],
    });
    input.extraction.scanComplete =
        false;

    const result =
        await runSocialDirectorGraph(
            input,
        );

    assert.equal(
        result
            .processedThroughMessageId,
        10,
    );
    assert.equal(
        result.scanComplete,
        false,
    );
    assert.equal(
        result.socialGraph
            .lastProcessedMessageId,
        10,
    );
});

test('Social V3 accepts player source only through segmentIndex -1', async () => {
    const input = createInput();
    input.sceneEvidence[0] = {
        id: 10,
        sceneId:
            'library_evening',
        isUser: true,
        text:
            'Hermione, Harry hid the map.',
        segments: [],
        witnessActorIds: [
            'hermione',
            'ron',
        ],
    };
    const report =
        input.extraction
            .reportedEvents[0];
    report.speakerId = 'player';
    report
        .sourceSegmentRefs[0]
        .segmentIndex = -1;
    report.summaryEn =
        'The player told Hermione that Harry had hidden the map.';
    input.extraction
        .recipientAppraisals = [];
    input.extraction
        .relationshipEvidence = [];

    const result =
        await runSocialDirectorGraph(
            input,
        );

    assert.equal(
        result.reportedEvents
            .length,
        1,
    );
    assert.equal(
        result.reportedEvents[0]
            .report.speakerId,
        'player',
    );
    assert.deepEqual(
        result.reportedEvents[0]
            .participantActorIds,
        ['hermione'],
    );
});

test('Social V3 correction requires a known parent report and exact historical Event claim', async () => {
    const input = createInput();
    const parent = {
        version: 2,
        eventKind: 'reported',
        eventId:
            'reported_parent_claim',
        sceneId:
            'library_evening',
        clock:
            '1991-09-03 · 19:05',
        summaryEn:
            'Ron told Hermione that Harry had hidden the map.',
        activationSchemaIds: [],
        participantActorIds: [
            'hermione',
            'ron',
        ],
        witnessActorIds: [
            'hermione',
            'ron',
        ],
        witnessCohortIds: [],
        witnessBasis: {
            hermione:
                'reported',
            ron: 'direct',
        },
        knownToPlayer: false,
        source:
            'social_event_boundary',
        report: {
            statementKind:
                'claim',
            sourceSegmentRefs: [{
                messageId: 9,
                segmentIndex: 0,
            }],
            speakerId: 'ron',
            recipientIds: [
                'hermione',
            ],
            subjectIds: [
                'harry',
            ],
            aboutEventId: '',
            parentReportedEventId:
                '',
            distortionLevel: 1,
        },
    };
    input.eventKnowledge.push(
        parent,
    );
    input.sceneEvidence[0]
        .segments[0] = {
        type: 'dialogue',
        actorId: 'ron',
        textEn:
            'Hermione, that map story was wrong.',
        historicalClaims: [{
            claimTextEn:
                'that map story',
            sourceEventIds: [
                parent.eventId,
            ],
        }],
    };
    const correction =
        input.extraction
            .reportedEvents[0];
    correction.statementKind =
        'correction';
    correction.sourceStatementText =
        'that map story was wrong';
    correction.summaryEn =
        'Ron corrected his earlier report to Hermione and said the map story was wrong.';
    correction.parentReportedEventId =
        parent.eventId;
    correction.distortionLevel = 0;
    input.extraction
        .recipientAppraisals = [];
    input.extraction
        .relationshipEvidence = [];

    const accepted =
        await runSocialDirectorGraph(
            input,
        );
    assert.equal(
        accepted.reportedEvents[0]
            .report
            .parentReportedEventId,
        parent.eventId,
    );

    input.sceneEvidence[0]
        .segments[0]
        .historicalClaims = [];
    const rejected =
        await runSocialDirectorGraph(
            input,
        );
    assert.equal(
        rejected.reportedEvents
            .length,
        0,
    );
    assert.equal(
        rejected.rejected[0]
            .reason,
        'invalid_report_provenance',
    );
});

test('current Social V3 save opens read-only only when its processed cursor reaches the chat tail', () => {
    const state = {
        socialGraph:
            normalizeSocialGraph({
                extractorVersion: 7,
                lastProcessedMessageId:
                    11,
            }),
    };
    const save = {
        fileName:
            'current-save.jsonl',
        storageCharacterId: 4,
    };

    assert.equal(
        canOpenCurrentSocialSaveReadOnly(
            save,
            {
                currentChatId:
                    'current-save',
                characterId: 4,
                chatLength: 12,
                state,
            },
        ),
        true,
    );
    assert.equal(
        canOpenCurrentSocialSaveReadOnly(
            save,
            {
                currentChatId:
                    'current-save',
                characterId: 4,
                chatLength: 13,
                state,
            },
        ),
        false,
    );
});

test('legacy authority family edge migrates structurally without Statement provenance copies', () => {
    const migrated =
        migrateLegacyFamilyEdges({
            relationshipEvidence: [],
            relationships: [{
                id:
                    'legacy_family_edge',
                sourceActorId:
                    'ron',
                targetActorId:
                    'harry',
                structuralTags: [
                    'family',
                ],
                evidenceIds: [],
            }],
            identityClaims: [],
            relationshipClaims: [],
            personReferences: [],
        });
    const claim =
        migrated
            .relationshipClaims[0];

    assert.equal(
        claim.sourceKind,
        'authority',
    );
    assert.equal(
        claim.authoritySourceRef,
        'legacy_relationship_edge:legacy_family_edge',
    );
    for (const forbidden of [
        'speakerId',
        'sourceMessageIds',
        'witnessedBy',
        'clock',
    ]) {
        assert.equal(
            Object.hasOwn(
                claim,
                forbidden,
            ),
            false,
        );
    }
});

test('Memory Consolidation consumes only AppraisalRefs, rebinds receipts and deletes unprotected sources', () => {
    let state =
        createWorldState(
            createObservedEvent(),
        );
    const firstEvent =
        state.eventKnowledge[0];
    const secondEvent = {
        ...structuredClone(
            firstEvent,
        ),
        eventId:
            'event_library_followup',
        sourceMessageIds: [
            11,
        ],
        summaryEn:
            'Hermione challenged Ron to verify the map story.',
    };
    state.eventKnowledge.push(
        secondEvent,
    );
    const proposals = [
        {
            observerId:
                'hermione',
            targetId: 'player',
            summaryEn:
                'Hermione treats the first claim as careless gossip.',
            sourceEventIds: [
                firstEvent.eventId,
            ],
            activationSchemaIds: [],
            derivedSchemaIds: [],
            contextTags: [
                'gossip',
            ],
            confidence: 0.7,
            supersedesAppraisalId:
                '',
        },
        {
            observerId:
                'hermione',
            targetId: 'player',
            summaryEn:
                'Hermione sees the follow-up challenge as necessary fact checking.',
            sourceEventIds: [
                secondEvent.eventId,
            ],
            activationSchemaIds: [],
            derivedSchemaIds: [],
            contextTags: [
                'fact_checking',
            ],
            confidence: 0.8,
            supersedesAppraisalId:
                '',
        },
    ];
    state =
        applyAppraisalProposals(
            state,
            proposals,
        );
    const sourceIds =
        proposals.map(proposal =>
            createAppraisalId(
                proposal,
            ));
    for (const appraisalId of (
        sourceIds
    )) {
        addActorMemoryRefV1(
            state,
            'hermione',
            'everyday',
            {
                recordType:
                    'appraisal',
                recordId:
                    appraisalId,
                addedClock: CLOCK,
            },
        );
    }
    const receipts =
        [
            firstEvent,
            secondEvent,
        ].map((event, index) =>
            normalizeSocialRelationshipEvidence({
                id:
                    createStableContractId(
                        'relation_evidence',
                        {
                            sourceActorId:
                                'hermione',
                            targetActorId:
                                'player',
                            eventKind:
                                'serious_conversation',
                            eventId:
                                event.eventId,
                        },
                    ),
                sourceActorId:
                    'hermione',
                targetActorId:
                    'player',
                eventId:
                    event.eventId,
                appraisalId:
                    sourceIds[index],
                eventKind:
                    'serious_conversation',
                dimensionDeltas: [{
                    dimension: 'trust',
                    delta: -1,
                    impact: 'trace',
                    appliedDelta: -1,
                }],
                structuralTags: [],
                emotionEffects: [],
                clock: CLOCK,
                turn: 12,
            }));
    state.socialGraph =
        normalizeSocialGraph({
            ...state.socialGraph,
            relationshipEvidence:
                receipts,
            relationships: [{
                id:
                    'relationship_hermione_player',
                sourceActorId:
                    'hermione',
                targetActorId:
                    'player',
                trust: -2,
                evidenceIds:
                    receipts.map(
                        receipt =>
                            receipt.id,
                    ),
            }],
        });
    addActorMemoryRefV1(
        state,
        'hermione',
        'everyday',
        {
            recordType: 'event',
            recordId:
                firstEvent.eventId,
            addedClock: CLOCK,
        },
    );
    assert.equal(
        validateMemoryConsolidation(
            {
                reviews: [{
                    id: 'hermione',
                    operations: [{
                        sourceIds: [
                            firstEvent
                                .eventId,
                        ],
                        targetTier:
                            'forget',
                        summaryEn: null,
                    }],
                }],
                schemaOperations: [],
            },
            state,
        ).valid,
        false,
    );

    const mergedSummary =
        'Hermione now treats repeated map claims as a pattern requiring verification.';
    const next =
        applyMemoryConsolidation(
            state,
            {
                reviews: [{
                    id: 'hermione',
                    operations: [{
                        sourceIds,
                        targetTier:
                            'recent',
                        summaryEn:
                            mergedSummary,
                    }],
                }],
                schemaOperations: [],
            },
        );
    const merged =
        next.memorySynapse
            .appraisals.find(
                appraisal =>
                    appraisal
                        .summaryEn ===
                    mergedSummary,
            );

    assert.ok(merged);
    assert.deepEqual(
        merged.sourceEventIds,
        [
            firstEvent.eventId,
            secondEvent.eventId,
        ].sort(),
    );
    assert.equal(
        next.memorySynapse
            .appraisals
            .some(appraisal =>
                sourceIds.includes(
                    appraisal.id,
                )),
        false,
    );
    assert.equal(
        next.actorMemoryIndex
            .byActorId
            .hermione
            .recent
            .some(reference =>
                reference.recordId ===
                    merged.id),
        true,
    );
    assert.equal(
        next.socialGraph
            .relationshipEvidence
            .every(receipt =>
                receipt.appraisalId ===
                    merged.id),
        true,
    );
});

test('Scene boundary replaces Everyday AppraisalRef with EventRef and clears only deleted receipt links', () => {
    let state =
        createWorldState(
            createObservedEvent(),
        );
    const event =
        state.eventKnowledge[0];
    const proposal = {
        observerId: 'hermione',
        targetId: 'player',
        summaryEn:
            'Hermione regards the conversation as a small warning about careless claims.',
        sourceEventIds: [
            event.eventId,
        ],
        activationSchemaIds: [],
        derivedSchemaIds: [],
        contextTags: [
            'warning',
        ],
        confidence: 0.6,
        supersedesAppraisalId:
            '',
    };
    state =
        applyAppraisalProposals(
            state,
            [proposal],
        );
    const appraisalId =
        createAppraisalId(
            proposal,
        );
    addActorMemoryRefV1(
        state,
        'hermione',
        'everyday',
        {
            recordType:
                'appraisal',
            recordId:
                appraisalId,
            addedClock: CLOCK,
        },
    );
    const receipt =
        normalizeSocialRelationshipEvidence({
            id:
                createStableContractId(
                    'relation_evidence',
                    {
                        sourceActorId:
                            'hermione',
                        targetActorId:
                            'player',
                        eventKind:
                            'other',
                        eventId:
                            event.eventId,
                    },
                ),
            sourceActorId:
                'hermione',
            targetActorId:
                'player',
            eventId:
                event.eventId,
            appraisalId,
            eventKind: 'other',
            dimensionDeltas: [{
                dimension: 'trust',
                delta: -1,
                impact: 'trace',
                appliedDelta: -1,
            }],
            structuralTags: [],
            emotionEffects: [],
            clock: CLOCK,
            turn: 12,
        });
    state.socialGraph =
        normalizeSocialGraph({
            ...state.socialGraph,
            relationshipEvidence: [
                receipt,
            ],
            relationships: [{
                id:
                    'relationship_hermione_player',
                sourceActorId:
                    'hermione',
                targetActorId:
                    'player',
                trust: -1,
                evidenceIds: [
                    receipt.id,
                ],
            }],
        });

    const result =
        expireEverydayAppraisalsAtSceneTransition(
            state,
        );
    const memory =
        result.state
            .actorMemoryIndex
            .byActorId
            .hermione;

    assert.equal(
        memory.everyday
            .some(reference =>
                reference
                    .recordType ===
                'appraisal'),
        false,
    );
    assert.equal(
        memory.everyday
            .some(reference =>
                reference
                    .recordType ===
                    'event' &&
                reference.recordId ===
                    event.eventId),
        true,
    );
    assert.equal(
        result.state
            .memorySynapse
            .appraisals
            .some(appraisal =>
                appraisal.id ===
                    appraisalId),
        false,
    );
    assert.equal(
        result.state
            .socialGraph
            .relationshipEvidence[0]
            .appraisalId,
        '',
    );
    assert.deepEqual(
        result.stats,
        {
            expiredRefCount: 1,
            addedEventRefCount: 1,
            deletedAppraisalCount: 1,
            clearedReceiptCount: 1,
        },
    );
});
