/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeMemorySynapse,
    validateAppraisalProposal,
    validateMemorySynapse,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeSocialGraph,
    validateSocialGraphV3,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    normalizeSocialRelationshipEvidence,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    appendGlobalChronicleEntry,
    createDefaultGlobalChronicle,
    validateGlobalChronicle,
} from '../public/scripts/extensions/hogwarts-mud/domain/timeline-chronicle.js';
import {
    createReportedEventKnowledgeId,
    createStableContractId,
    normalizeEventKnowledge,
    projectActorEventKnowledge,
    validateEventKnowledgeContract,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';

const ACTORS = [
    {
        id: 'ron',
    },
    {
        id: 'hermione',
    },
    {
        id: 'harry',
    },
];

function observedEvent() {
    return normalizeEventKnowledge({
        version: 2,
        eventKind: 'observed',
        sceneId: 'library_evening',
        clock:
            '1991-09-03 · 19:10',
        sourceMessageIds: [11],
        summaryEn:
            'Ron handed Hermione a folded note beside the library doors.',
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
                'room_visual',
            ron: 'direct',
        },
        perception: {
            version: 1,
            visualScope: 'room',
            audibleScope: 'none',
            salience: 'normal',
            attribution: 'clear',
            concealment: 'none',
            directParticipantActorIds: [
                'ron',
            ],
            evidenceText:
                'Ron handed Hermione a folded note.',
            confidence: 0.95,
            source:
                'post_turn_observer',
        },
        knownToPlayer: true,
        source:
            'post_turn_observer',
    }, {
        actors: ACTORS,
        sourceTexts: [
            'Ron handed Hermione a folded note.',
        ],
    });
}

function reportedEvent() {
    const identity = {
        sceneId: 'library_evening',
        sourceSegmentRefs: [{
            messageId: 12,
            segmentIndex: 0,
        }],
        speakerId: 'ron',
        recipientIds: [
            'hermione',
        ],
        statementKind: 'claim',
        sourceStatementText:
            'Harry hid the map.',
    };
    return normalizeEventKnowledge({
        version: 2,
        eventKind: 'reported',
        eventId:
            createReportedEventKnowledgeId(
                identity,
            ),
        sceneId: identity.sceneId,
        clock:
            '1991-09-03 · 19:12',
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
            hermione: 'reported',
            ron: 'direct',
        },
        knownToPlayer: true,
        source:
            'social_event_boundary',
        report: {
            statementKind: 'claim',
            sourceSegmentRefs:
                identity
                    .sourceSegmentRefs,
            speakerId: 'ron',
            recipientIds: [
                'hermione',
            ],
            subjectIds: [
                'harry',
            ],
            aboutEventId:
                'event_hidden_map_truth',
            parentReportedEventId: '',
            distortionLevel: 1,
        },
    }, {
        actors: ACTORS,
    });
}

test('Event V2 enforces exact observed and reported union shapes', () => {
    const observed =
        observedEvent();
    const reported =
        reportedEvent();

    assert.equal(
        observed.knownToPlayer,
        false,
    );
    assert.equal(
        reported.knownToPlayer,
        false,
    );
    assert.equal(
        validateEventKnowledgeContract(
            observed,
            {
                actors: ACTORS,
                sourceTexts: [
                    observed
                        .perception
                        .evidenceText,
                ],
            },
        ).valid,
        true,
    );
    assert.equal(
        validateEventKnowledgeContract(
            reported,
            {
                actors: ACTORS,
            },
        ).valid,
        true,
    );
    assert.equal(
        validateEventKnowledgeContract(
            {
                ...reported,
                sourceMessageIds: [12],
            },
            {
                actors: ACTORS,
            },
        ).valid,
        false,
    );
    const missingReportKey =
        structuredClone(reported);
    delete missingReportKey.report
        .subjectIds;
    assert.equal(
        validateEventKnowledgeContract(
            missingReportKey,
            {
                actors: ACTORS,
            },
        ).valid,
        false,
    );
});

test('reported Event projection grants only speaker and explicit recipient knowledge', () => {
    const report =
        reportedEvent();
    const state = {
        eventKnowledge: [
            report,
        ],
    };
    const speaker =
        projectActorEventKnowledge(
            state,
            'ron',
        );
    const recipient =
        projectActorEventKnowledge(
            state,
            'hermione',
        );
    const subject =
        projectActorEventKnowledge(
            state,
            'harry',
        );

    assert.equal(
        speaker.direct.length,
        1,
    );
    assert.equal(
        recipient.reported.length,
        1,
    );
    assert.deepEqual(
        subject,
        {
            version: 2,
            direct: [],
            witnessed: [],
            reported: [],
        },
    );
    assert.equal(
        Object.hasOwn(
            recipient.reported[0]
                .report,
            'sourceSegmentRefs',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            recipient.reported[0]
                .report,
            'aboutEventId',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            recipient.reported[0]
                .report,
            'parentReportedEventId',
        ),
        false,
    );
});

test('reported Event stable identity excludes translated summary but includes exact statement evidence', () => {
    const base = {
        sceneId: 'library_evening',
        sourceSegmentRefs: [{
            messageId: 12,
            segmentIndex: 0,
        }],
        speakerId: 'ron',
        recipientIds: [
            'hermione',
        ],
        statementKind: 'claim',
        sourceStatementText:
            'Harry hid the map.',
    };
    const first =
        createReportedEventKnowledgeId(
            base,
        );
    const retry =
        createReportedEventKnowledgeId({
            ...base,
            summaryEn:
                'A different translation.',
        });
    const differentStatement =
        createReportedEventKnowledgeId({
            ...base,
            sourceStatementText:
                'Harry destroyed the map.',
        });

    assert.equal(first, retry);
    assert.notEqual(
        first,
        differentStatement,
    );
});

test('reported Appraisal requires recipient authority and persists only Event references', () => {
    const report =
        reportedEvent();
    const worldState = {
        clock: report.clock,
        actorLibrary: ACTORS,
        actors: ACTORS,
        eventKnowledge: [
            report,
        ],
    };
    const accepted =
        validateAppraisalProposal({
            observerId: 'hermione',
            targetId: 'player',
            summaryEn:
                'Hermione suspects Ron is repeating a story he has not verified.',
            sourceEventIds: [
                report.eventId,
            ],
            contextTags: [
                'heard_claim',
            ],
            confidence: 0.8,
        }, worldState);
    const denied =
        validateAppraisalProposal({
            observerId: 'harry',
            targetId: 'player',
            summaryEn:
                'Harry somehow reacts to a report he never received.',
            sourceEventIds: [
                report.eventId,
            ],
            contextTags: [],
            confidence: 0.5,
        }, worldState);

    assert.equal(accepted.valid, true);
    assert.equal(
        accepted.value
            .knowledgeSource,
        'reported',
    );
    assert.deepEqual(
        accepted.value
            .sourceEventIds,
        [report.eventId],
    );
    assert.equal(
        Object.hasOwn(
            accepted.value,
            'sourceMessageIds',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            accepted.value,
            'sceneId',
        ),
        false,
    );
    assert.equal(denied.valid, false);

    const synapse =
        normalizeMemorySynapse({
            appraisals: [
                accepted.value,
            ],
            personSchemas: [],
        });
    assert.equal(
        validateMemorySynapse(
            synapse,
            {
                eventKnowledge: [
                    report,
                ],
            },
        ).valid,
        true,
    );
    const wrongSource =
        structuredClone(synapse);
    wrongSource.appraisals[0]
        .knowledgeSource =
        'witness';
    assert.equal(
        validateMemorySynapse(
            wrongSource,
            {
                eventKnowledge: [
                    report,
                ],
            },
        ).valid,
        false,
    );
});

test('Relationship Evidence V3 is a reference-only applied receipt', () => {
    const report =
        reportedEvent();
    const appraisal =
        validateAppraisalProposal({
            observerId: 'hermione',
            targetId: 'player',
            summaryEn:
                'Hermione treats the claim as evidence that Ron is being careless.',
            sourceEventIds: [
                report.eventId,
            ],
            contextTags: [],
            confidence: 0.75,
        }, {
            clock: report.clock,
            actorLibrary: ACTORS,
            actors: ACTORS,
            eventKnowledge: [
                report,
            ],
        }).value;
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
                            report.eventId,
                    },
                ),
            sourceActorId:
                'hermione',
            targetActorId: 'player',
            eventId:
                report.eventId,
            appraisalId:
                appraisal.id,
            eventKind: 'other',
            dimensionDeltas: [{
                dimension: 'trust',
                delta: -4,
                appliedDelta: -4,
                impact:
                    'meaningful',
            }],
            structuralTags: [],
            emotionEffects: [{
                emotion:
                    'disappointment',
                intensity: 3,
            }],
            clock: report.clock,
            turn: 12,
        });
    const graph =
        normalizeSocialGraph({
            version: 3,
            extractorVersion: 7,
            identityClaims: [],
            relationshipClaims: [],
            personReferences: [],
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
                trust: -4,
                evidenceIds: [
                    receipt.id,
                ],
            }],
            lastProcessedMessageId: 12,
            lastRunSceneId:
                report.sceneId,
            lastRunTurn: 12,
            lastRunClock:
                report.clock,
            backfilledSceneIds: [],
            backfillPendingSceneId: '',
            status: 'ready',
            error: '',
            lastRunStats: null,
        });

    assert.equal(
        validateSocialGraphV3(
            graph,
            {
                eventKnowledge: [
                    report,
                ],
                appraisals: [
                    appraisal,
                ],
            },
        ).valid,
        true,
    );
    for (const forbidden of [
        'summary',
        'summaryEn',
        'sourceMessageIds',
        'sceneId',
        'witnessedBy',
        'visibility',
    ]) {
        assert.equal(
            Object.hasOwn(
                receipt,
                forbidden,
            ),
            false,
        );
    }
    assert.equal(
        validateSocialGraphV3(
            {
                ...graph,
                statements: [],
            },
            {
                eventKnowledge: [
                    report,
                ],
                appraisals: [
                    appraisal,
                ],
            },
        ).valid,
        false,
    );
});

test('Global Chronicle appends once per Scene and rejects conflicting duplicates', () => {
    const first = {
        sceneId: 'scene_one',
        endedClock:
            '1991-09-03 · 19:20',
        summaryEn:
            'Ron passed Hermione a folded note outside the library, then attributed a claim about Harry hiding a map. Hermione accepted that she had heard the claim but remained openly skeptical about whether Ron had verified any part of the story.',
    };
    const chronicle =
        appendGlobalChronicleEntry(
            createDefaultGlobalChronicle(),
            first,
        );
    const retry =
        appendGlobalChronicleEntry(
            chronicle,
            first,
        );

    assert.deepEqual(retry, chronicle);
    assert.equal(
        validateGlobalChronicle(
            chronicle,
        ).valid,
        true,
    );
    assert.throws(
        () =>
            appendGlobalChronicleEntry(
                chronicle,
                {
                    ...first,
                    summaryEn:
                        `${first.summaryEn} The retry changed its authority.`,
                },
            ),
        /Conflicting/u,
    );
});
