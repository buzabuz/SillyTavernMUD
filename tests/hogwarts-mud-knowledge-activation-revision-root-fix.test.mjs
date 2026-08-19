import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
    fileURLToPath,
} from 'node:url';

import {
    buildActorMemoryKnowledgeSeeds,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    createKnowledgeRetrievalPlan,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-retrieval-planner.js';
import {
    hydrateCanonicalKnowledgeCandidates,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    buildNarrativePromptContext,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-prompt-context.js';
import {
    buildSealedActivationCapsules,
} from '../public/scripts/extensions/hogwarts-mud/domain/relational-synapse-retrieval.js';
import {
    exactFallbackKnowledgeQuery,
} from '../src/hogwarts-mud/knowledge-relational-service.js';
import {
    buildAuthoritativeKnowledgeProjection,
    loadAuthoritativeArchive,
} from '../scripts/sync-hogwarts-knowledge-qdrant.mjs';

const TINA_ARCHIVE =
    fileURLToPath(
        new URL(
            '../data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
            import.meta.url,
        ),
    );

function sha256(buffer) {
    return createHash('sha256')
        .update(buffer)
        .digest('hex');
}

test('Actor Memory seed projection emits bounded canonical IDs without copied prose', () => {
    const state = {
        eventKnowledge: [
            {
                eventId: 'event_core',
            },
            {
                eventId: 'event_everyday',
            },
        ],
        memorySynapse: {
            appraisals: [
                {
                    id: 'appraisal_recent',
                    contextTags: [],
                },
                {
                    id: 'appraisal_legacy_opinion',
                    contextTags: [
                        'migrated_current_impression',
                    ],
                },
            ],
            personSchemas: [
                {
                    id: 'schema_active',
                    observerId: 'harry',
                    status: 'active',
                    updatedClock:
                        '1991-09-02 · 13:00',
                },
                {
                    id: 'schema_superseded',
                    observerId: 'harry',
                    status: 'superseded',
                    updatedClock:
                        '1991-09-02 · 14:00',
                },
            ],
        },
        actorMemoryIndex: {
            byActorId: {
                harry: {
                    core: [{
                        recordType: 'event',
                        recordId: 'event_core',
                    }],
                    recent: [
                        {
                            recordType:
                                'appraisal',
                            recordId:
                                'appraisal_recent',
                        },
                        {
                            recordType:
                                'appraisal',
                            recordId:
                                'appraisal_legacy_opinion',
                        },
                    ],
                    everyday: [{
                        recordType: 'event',
                        recordId:
                            'event_everyday',
                    }],
                },
            },
        },
    };
    assert.deepEqual(
        buildActorMemoryKnowledgeSeeds(
            state,
            ['harry'],
            {
                memoryLimits: {
                    core: 3,
                    recent: 6,
                    everyday: 8,
                },
            },
        ),
        {
            recordIds: [
                'appraisals_appraisal_recent',
                'events_event_core',
                'events_event_everyday',
                'schemas_schema_active',
            ],
            retainedEventIdsByActorId: {
                harry: [
                    'event_core',
                    'event_everyday',
                ],
            },
        },
    );
});

test('real Tina State-backed seeds produce actor-scoped quill Events through canonical exact retrieval', async () => {
    const before =
        fs.readFileSync(
            TINA_ARCHIVE,
        );
    const authority =
        await loadAuthoritativeArchive(
            TINA_ARCHIVE,
        );
    const {
        state,
        chat,
    } = authority;
    const records =
        buildAuthoritativeKnowledgeProjection(
            authority,
        );
    const seededQuillEventId =
        'event_gryffindor_common_room_quill_repair_1bc78241e1942a8d';
    const seededQuillEvent =
        state.eventKnowledge.find(event =>
            event.eventId ===
            seededQuillEventId);
    assert.ok(seededQuillEvent);
    const playerMessageId =
        seededQuillEvent
            .sourceMessageIds
            .find(messageId =>
                chat[messageId]
                    ?.is_user);
    const playerMessage =
        chat[playerMessageId];
    assert.ok(playerMessage);
    const actorIds = [
        'canon_harry_james_potter',
        'canon_hermione_jean_granger',
        'canon_lavender_brown',
    ];
    const seeds =
        buildActorMemoryKnowledgeSeeds(
            state,
            actorIds,
            {
                memoryLimits: {
                    core: 3,
                    recent: 6,
                    everyday: 8,
                },
            },
        );
    assert.ok(
        seeds.recordIds.includes(
            `events_${seededQuillEventId}`,
        ),
    );
    const input = {
        timelineEpoch:
            state.timelineEpoch,
        stateRevision:
            state.stateRevision,
        clock: state.clock,
        audience: {
            actorIds,
            includePublic: true,
            includeLocked: false,
        },
        actorIds,
        entityIds: [
            state.scene?.id,
            state.map
                ?.currentLocalNodeId,
            ...seeds.recordIds,
        ].filter(Boolean),
        categories: [
            'actors',
            'scenes',
            'events',
            'clues',
            'appraisals',
            'schemas',
        ],
        query:
            playerMessage.mes,
        limit: 30,
    };
    const plan =
        await createKnowledgeRetrievalPlan(
            input,
        );
    const byId =
        new Map();
    for (const subquery of
        plan.subqueries) {
        const result =
            exactFallbackKnowledgeQuery(
                records,
                subquery,
                input,
            );
        for (const record of
            result.records) {
            if (
                !byId.has(
                    record.recordId,
                )
            ) {
                byId.set(
                    record.recordId,
                    record,
                );
            }
        }
    }
    const selectedCandidates =
        [...byId.values()];
    assert.ok(
        selectedCandidates.some(record =>
            record.recordId ===
            `events_${seededQuillEventId}`),
    );
    const selected =
        hydrateCanonicalKnowledgeCandidates({
            candidateRecords:
                selectedCandidates,
            seedRecordIds:
                seeds.recordIds,
            canonicalRecords:
                records,
            filters: {
                timelineEpoch:
                    state
                        .timelineEpoch,
                stateRevision:
                    state
                        .stateRevision,
                audience: {
                    actorIds,
                },
                clock:
                    state.clock,
            },
        }).records;
    const capsules =
        buildSealedActivationCapsules(
            selected.map(
                (
                    record,
                    index,
                ) => ({
                    record,
                    score:
                        selected.length -
                        index,
                    hop: 0,
                    path: [],
                    sourceRefs:
                        record.sourceRefs,
                }),
            ),
            {
                actorIds,
                timelineEpoch:
                    state
                        .timelineEpoch,
                stateRevision:
                    state
                        .stateRevision,
                clock:
                    state.clock,
                queryAnchors: [
                    playerMessage.mes,
                ],
                retainedEventIdsByActorId:
                    seeds
                        .retainedEventIdsByActorId,
            },
        );
    for (const actorId of
        actorIds) {
        assert.equal(
            capsules
                .byActorId[
                    actorId
                ]
                .expectations
                .length,
            0,
        );
        const hasQuillEvent =
            capsules
                .byActorId[
                    actorId
                ]
                .supportingEvents
                .some(event =>
                    /quill/u.test(
                        `${event.recordId} ${event.text}`,
                    ));
        const retainsTargetEvent =
            (
                seeds
                    .retainedEventIdsByActorId[
                        actorId
                    ] ||
                []
            ).includes(
                seededQuillEventId,
            );
        assert.equal(
            hasQuillEvent,
            retainsTargetEvent,
            `${actorId} must receive the quill Event only through its own retained Event authority.`,
        );
    }
    const productionRetrieval =
        selected.map(record => ({
            ...record,
            evidenceType:
                'HISTORICAL_EVIDENCE',
            evidenceStatus:
                'HISTORICAL',
        }));
    productionRetrieval
        .retainedEventIdsByActorId =
        seeds
            .retainedEventIdsByActorId;
    const narrativeContext =
        buildNarrativePromptContext(
            state,
            productionRetrieval,
            {
                actorIds,
                queryAnchors: [
                    playerMessage.mes,
                ],
            },
        );
    for (const actorId of
        actorIds) {
        const hasQuillEvent =
            narrativeContext
                .memoryActivationCapsules
                .byActorId[
                    actorId
                ]
                .supportingEvents
                .some(event =>
                    /quill/u.test(
                        `${event.recordId} ${event.text}`,
                    ));
        const retainsTargetEvent =
            (
                seeds
                    .retainedEventIdsByActorId[
                        actorId
                    ] ||
                []
            ).includes(
                seededQuillEventId,
            );
        assert.equal(
            hasQuillEvent,
            retainsTargetEvent,
            `${actorId} production context must preserve actor-scoped retained Event authority.`,
        );
    }
    const after =
        fs.readFileSync(
            TINA_ARCHIVE,
        );
    assert.equal(
        sha256(after),
        sha256(before),
    );
    assert.equal(
        after.length,
        before.length,
    );
});
