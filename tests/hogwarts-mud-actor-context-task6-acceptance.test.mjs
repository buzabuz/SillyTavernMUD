/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    existsSync,
} from 'node:fs';
import test from 'node:test';

import {
    LOW_TIER_ACTIVE_SCHEMA_LIMIT,
    LOW_TIER_ACTOR_CARD_MAX_BYTES,
    LOW_TIER_ACTOR_EVENT_LIMIT,
    LOW_TIER_CONTEXT_KEYS,
    LOW_TIER_CONTEXT_MAX_BYTES,
    LOW_TIER_GLOBAL_EVENT_LIMIT,
    projectLowTierContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/low-tier-context-v1.js';
import {
    memoryReferenceVersion,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    DEFAULT_TINA_FILE,
    runTask6Acceptance,
} from '../scripts/dry-run-hogwarts-actor-context-task6.mjs';

const encoder = new TextEncoder();
const bytes = value =>
    encoder.encode(
        JSON.stringify(value),
    ).length;

function actor(
    actorId,
) {
    return {
        core: {
            id: actorId,
            nameEn:
                `Actor ${actorId}`,
            roleEn: 'Student',
            performanceCore: {
                temperamentEn:
                    'Alert and deliberate.',
                speechStyleEn:
                    'Concise.',
                motivesEn: [
                    'Understand the player.',
                ],
                socialStrategiesEn: [
                    'Ask a direct question.',
                ],
                boundariesEn: [
                    'Reject coercion.',
                ],
            },
        },
        runtime: {
            id: actorId,
            mapId:
                'hogwarts_castle',
            roomId:
                'library',
            present: true,
            currentActivityEn:
                'Reading.',
            currentIntentEn:
                'Observe.',
        },
    };
}

function capsule(
    actorId,
) {
    return {
        version: 1,
        observerId: actorId,
        expectations:
            Array.from(
                {
                    length: 5,
                },
                (_, index) => ({
                    schemaId:
                        `schema_${actorId}_${index}`,
                    observerId:
                        actorId,
                    targetId:
                        'player',
                    expectationEn:
                        `Expectation ${index}.`,
                    confidence: 0.8,
                    status: 'active',
                }),
            ),
        supportingEvents:
            Array.from(
                {
                    length: 5,
                },
                (_, index) => ({
                    recordId:
                        `events_${actorId}_${index}`,
                    text:
                        `Event ${actorId} ${index}.`,
                    sceneId:
                        `scene_${index}`,
                    effectiveClock:
                        '1991-09-02 · 18:00',
                    sourceRefs: [{
                        type: 'event',
                        id:
                            `event_${actorId}_${index}`,
                    }],
                }),
            ),
        sourceIds: [],
        confidence: 0.8,
        capsuleId:
            `capsule_${actorId}`,
    };
}

test(
    'Task 6 real Tina build-only acceptance preserves the file and passes payload budgets',
    {
        skip:
            !existsSync(
                DEFAULT_TINA_FILE,
            ),
    },
    async () => {
        const report =
            await runTask6Acceptance(
                DEFAULT_TINA_FILE,
            );

        assert.equal(
            report.version,
            2,
        );
        assert.equal(
            report.archive
                .shaAndMtimeUnchanged,
            true,
        );
        assert.equal(
            report.migrationArchive
                .shaAndMtimeUnchanged,
            true,
        );
        assert.equal(
            report.lifecycleArchive
                .shaAndMtimeUnchanged,
            true,
        );
        assert.equal(
            report.migration
                .sourceStateBytesUnchanged,
            true,
        );
        assert.equal(
            report.migration
                .idempotentBytes,
            true,
        );
        assert.equal(
            report.migration
                .migrationFailureStateBytesUnchanged,
            true,
        );
        assert.equal(
            report.migration
                .lifecycle
                .idempotentBytes,
            true,
        );
        assert.equal(
            report.migration
                .lifecycle
                .failureStateBytesUnchanged,
            true,
        );
        assert.deepEqual(
            {
                sourceVersion:
                    report
                        .memoryReferenceUpgrade
                        .sourceVersion,
                targetVersion:
                    report
                        .memoryReferenceUpgrade
                        .targetVersion,
                firstChanged:
                    report
                        .memoryReferenceUpgrade
                        .firstChanged,
                secondChanged:
                    report
                        .memoryReferenceUpgrade
                        .secondChanged,
                candidateAppraisalCount:
                    report
                        .memoryReferenceUpgrade
                        .candidateAppraisalCount,
                remainingCandidateCount:
                    report
                        .memoryReferenceUpgrade
                        .remainingCandidateCount,
            },
            {
                sourceVersion:
                    memoryReferenceVersion,
                targetVersion:
                    memoryReferenceVersion,
                firstChanged: false,
                secondChanged: false,
                candidateAppraisalCount:
                    0,
                remainingCandidateCount:
                    0,
            },
        );
        assert.equal(
            report
                .memoryReferenceUpgrade
                .failureStateBytesUnchanged,
            true,
        );
        assert.equal(
            report
                .playerVisibleSnapshots
                .semanticPass,
            true,
        );
        assert.equal(
            Object.values(
                report
                    .playerVisibleSnapshots
                    .sections,
            ).every(section =>
                section.equal),
            true,
        );
        assert.deepEqual(
            report
                .playerVisibleSnapshots
                .sections
                .core,
            {
                equal: true,
                actorCount: 23,
                rawDifferenceCount: 1,
                approvedImprovementCount:
                    1,
                differences: [{
                    actorId:
                        'canon_harry_james_potter',
                    field:
                        'speechStyle',
                    before:
                        'Age-appropriate speech consistent with established Canon characterization.',
                    after:
                        'Plain and understated, with dry humor, brief answers, and flashes of blunt defiance.',
                }],
            },
        );
        assert.deepEqual(
            report
                .playerVisibleSnapshots
                .firstImpressions,
            {
                pass: true,
                count: 10,
            },
        );
        const memory =
            report
                .playerVisibleSnapshots
                .memoryReconciliation;
        assert.equal(memory.pass, true);
        assert.equal(
            memory
                .legacySharedMemoryCount,
            91,
        );
        assert.deepEqual(
            memory.event,
            {
                legacyRefCount: 31,
                newRefCount: 31,
                uniqueReferencedCount:
                    5,
                knownToPlayerCount: 5,
                knownEventsMatchRefs:
                    true,
                dossierHydrationCount:
                    31,
                textCopyCount: 0,
                factsEqual: true,
            },
        );
        assert.deepEqual(
            memory
                .subjectiveAppraisals,
            {
                legacyMemoryCount: 60,
                legacyCurrentOpinionCount:
                    22,
                newRefCount: 62,
                dossierHydrationCount:
                    60,
                factsEqual: true,
            },
        );
        assert.deepEqual(
            memory.temporaryMemories,
            {
                migratedAppraisalCount:
                    2,
                hiddenFromPlayerDossier:
                    true,
            },
        );
        assert.deepEqual(
            memory.currentOpinions,
            {
                legacyCount: 22,
                migratedAppraisalCount:
                    0,
                recentRefCount: 0,
                exactTextMatch: true,
                historicalClaimAllowedFalse:
                    true,
                excludedFromSchema: true,
                discarded: true,
            },
        );

        for (const prompt of [
            report.prompt.initial,
        ]) {
            assert.deepEqual(
                prompt.topLevelKeys,
                LOW_TIER_CONTEXT_KEYS,
            );
            assert.ok(
                prompt.userPayload.bytes <=
                    LOW_TIER_CONTEXT_MAX_BYTES,
            );
            assert.ok(
                prompt.total.characters <=
                    report.prompt
                        .contextPlan
                        .maxPromptCharacters,
            );
            assert.ok(
                prompt.actorCards
                    .maximumBytes <=
                    LOW_TIER_ACTOR_CARD_MAX_BYTES,
            );
            assert.equal(
                prompt
                    .duplicateLegacyPayloadCount,
                0,
            );
            assert.equal(
                prompt
                    .legacyTopLevelPayloadCount,
                0,
            );
            assert.equal(
                prompt
                    .forbiddenCurrentImpressionCount,
                0,
            );
            assert.equal(
                prompt.contextTrimmed,
                false,
            );
            assert.equal(
                Object.values(
                    prompt
                        .protectedFields,
                ).every(Boolean),
                true,
            );
        }
        assert.equal(
            report.prompt
                .buildOnly
                .promptCaptures,
            1,
        );
        assert.equal(
            Object.hasOwn(
                report.prompt,
                'repair',
            ),
            false,
        );
        assert.equal(
            report.prompt
                .buildOnly
                .modelAdapterCalls,
            0,
        );
        assert.equal(
            report.prompt
                .buildOnly
                .externalNetworkCalls,
            0,
        );
    },
);

test('Task 6 LowTierContext enforces Schema<=3, Event<=3 per actor, and Event<=8 globally', () => {
    const actorIds = [
        'actor_a',
        'actor_b',
        'actor_c',
        'actor_d',
    ];
    const records =
        actorIds.map(actor);
    const context =
        projectLowTierContextV1(
            {
                actorLibrary:
                    records.map(
                        record =>
                            record.core,
                    ),
                actors:
                    records.map(
                        record =>
                            record.runtime,
                    ),
                actorPresentations:
                    {},
                socialGraph: {
                    relationships: [],
                },
            },
            {
                actorIds,
                playerTurn: {
                    playerAction:
                        'Continue.',
                },
                sceneFacts: {},
                actionOpportunities:
                    [],
                memoryActivationCapsules: {
                    version: 1,
                    common: {
                        facts: [],
                        sealed: true,
                    },
                    byActorId:
                        Object.fromEntries(
                            actorIds.map(
                                actorId => [
                                    actorId,
                                    capsule(
                                        actorId,
                                    ),
                                ],
                            ),
                        ),
                },
                prohibitions: [],
            },
        );
    const capsules =
        Object.values(
            context
                .memoryActivations
                .byActorId,
        );
    const eventCounts =
        capsules.map(
            current =>
                current
                    .supportingEvents
                    .length,
        );
    const schemaCounts =
        capsules.map(
            current =>
                current
                    .expectations
                    .length,
        );

    assert.equal(
        Math.max(
            ...schemaCounts,
        ),
        LOW_TIER_ACTIVE_SCHEMA_LIMIT,
    );
    assert.equal(
        Math.max(
            ...eventCounts,
        ),
        LOW_TIER_ACTOR_EVENT_LIMIT,
    );
    assert.equal(
        eventCounts.reduce(
            (
                total,
                count,
            ) =>
                total + count,
            0,
        ),
        LOW_TIER_GLOBAL_EVENT_LIMIT,
    );
    assert.ok(
        bytes(context) <=
            LOW_TIER_CONTEXT_MAX_BYTES,
    );
});
