#!/usr/bin/env node
/* global globalThis */

import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    stat,
} from 'node:fs/promises';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

import {
    createContextBudgetPlan,
    limitMessagesToContext,
    normalizeModelSlots,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    migrateActorContextV1,
    validateActorContextStateV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    getCanonicalPerformanceCore,
    isPlaceholderSpeechStyle,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-core-canon.js';
import {
    buildActorDossierViewModel,
    buildRelationshipProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-dossier-projection.js';
import {
    migrateActorKnowledgeBoundaries,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    migrateRelationshipMemoryState,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-migration.js';
import {
    buildStructuredPlayerTurnSequence,
    reconcileCanonActorDisplayNames,
    reconcileTemporaryActorDisplayNames,
    removeExplicitAddressDirective,
    resolvePlayerAddressing,
    resolveTemporaryActorRevealedName,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import {
    migrateActorPresentationState,
} from '../public/scripts/extensions/hogwarts-mud/domain/appearance.js';
import {
    buildBehavioralEnvironment,
} from '../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import {
    CANON_CAST_IDENTITY_CONTRACT,
    CANON_WIT_TONE_CONTRACT,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    normalizeCausalCollapseState,
} from '../public/scripts/extensions/hogwarts-mud/domain/causal-state.js';
import {
    migrateObservedInventoryState,
} from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    parseItemOperationDirectives,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import {
    migrateItemSystemState,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-migration.js';
import {
    getLocalMapDefinition,
} from '../public/scripts/extensions/hogwarts-mud/domain/map-access.js';
import {
    buildCurrentMaterialState,
} from '../public/scripts/extensions/hogwarts-mud/domain/material-state.js';
import {
    migrateNpcIdentityState,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-migration.js';
import {
    migrateNpcIdentityObservations,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-observation-migration.js';
import {
    NPC_IDENTITY_PROMPT_BOUNDARY,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    buildTemporaryActorPromotionPolicy,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import {
    createFallbackNextSceneIntent,
    validateNextSceneIntent,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-destination.js';
import {
    migrateLoadedSocialGraph,
    projectActorSocialRelationships,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    SOCIAL_RELATIONSHIP_DIMENSIONS,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    buildSpatialContext,
    migrateActorMovementHistory,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    getAuthoritativeSceneSpells,
} from '../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import {
    migrateSpellbookState,
} from '../public/scripts/extensions/hogwarts-mud/domain/spell-state.js';
import {
    projectSceneTransitionPresence,
} from '../public/scripts/extensions/hogwarts-mud/domain/transition-presence.js';
import {
    createTurnPerformanceBudget,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import {
    projectActorItems,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-projection.js';
import {
    projectPeoplePanel,
} from '../public/scripts/extensions/hogwarts-mud/people-projection.js';
import {
    reduceLocalPresence,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';
import {
    createTurnPerformanceWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';

export const DEFAULT_TINA_FILE =
    path.resolve(
        'data/default-user/chats/Hogwarts_World_Director/' +
        'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    );
export const DEFAULT_TINA_LEGACY_FILE =
    path.resolve(
        'data/default-user/backups/chat_hogwarts_world_director_20260812-183453.jsonl',
    );
export const DEFAULT_TINA_LIFECYCLE_FILE =
    path.resolve(
        'data/default-user/backups/chat_hogwarts_world_director_20260813-124742.jsonl',
    );

const LEGACY_PROMPT_BASELINE =
    Object.freeze({
        systemCharacters: 27_018,
        userCharacters: 179_772,
        largestActorKnowledgeCharacters:
            111_499,
        source:
            '.trae/specs/unify-actor-context-memory/prd.md:52-61',
    });
const LEGACY_PAYLOAD_KEYS =
    Object.freeze([
        'actorKnowledge',
        'addressedActorKnowledge',
        'actorContinuityCapsules',
        'actorProfiles',
        'presentActors',
        'memoryActivationCapsules',
        'retrievedLocalKnowledge',
        'historicalKnowledgeEvidence',
        'sharedMemories',
        'socialGraph',
        'actorLibrary',
    ]);
const encoder = new TextEncoder();

function json(value) {
    return JSON.stringify(value);
}

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function metric(value, serialized = false) {
    const text =
        serialized
            ? String(value)
            : json(value);
    return {
        characters: text.length,
        bytes:
            encoder.encode(text).length,
        estimatedTokens:
            Math.ceil(text.length / 3),
    };
}

function fileMetric(contents, stats) {
    return {
        sha256: sha256(contents),
        bytes: contents.length,
        mtimeMs: stats.mtimeMs,
        mtimeIso:
            stats.mtime.toISOString(),
    };
}

async function readArchive(file) {
    const contents =
        await readFile(file);
    const stats =
        await stat(file);
    const lines =
        contents.toString('utf8')
            .trimEnd()
            .split(/\r?\n/u);
    const header =
        JSON.parse(lines[0]);
    const chat =
        lines.slice(1)
            .map(line =>
                JSON.parse(line));
    const state =
        header?.chat_metadata
            ?.hogwartsMud;
    assert.ok(
        state,
        'Tina JSONL first line must contain chat_metadata.hogwartsMud.',
    );
    return {
        path:
            path.resolve(file),
        contents,
        stats,
        lines,
        header,
        chat,
        state,
    };
}

function roomName(
    state,
    mapId,
    roomId,
) {
    const map =
        getLocalMapDefinition(
            mapId,
            state.map,
        );
    return [
        ...(map?.nodes || []),
        ...(
            state.map
                ?.generatedLocalNodes ||
            []
        ).filter(node =>
            node.mapId === mapId),
    ].find(room =>
        room.id === roomId)
        ?.name ||
        roomId;
}

function createLifecycle(
    state,
    chat,
    {
        saveMetadataDebounced =
        () => {},
        migrateActorContextState =
        migrateActorContextV1,
    } = {},
) {
    return createLifecycleRuntime({
        createFallbackNextSceneIntent,
        getContext:
            () => ({
                chat,
                chatMetadata: {
                    hogwartsMud:
                        state,
                },
            }),
        getLocalMapDefinition,
        getMudState:
            () => state,
        getRoomName: roomName,
        jobRegistry: {},
        migrateActorContextState,
        migrateActorKnowledgeBoundaries,
        migrateActorMovementHistory,
        migrateActorPresentationState,
        migrateLoadedSocialGraph,
        migrateObservedInventoryState,
        migrateItemSystemState,
        migrateNpcIdentityState,
        migrateNpcIdentityObservations,
        migrateRelationshipMemoryState,
        migrateSpellbookState,
        normalizeCausalCollapseState,
        normalizeModelSlots,
        projectActorSocialRelationships,
        projectSceneTransitionPresence,
        reconcileCanonActorDisplayNames,
        reconcileTemporaryActorDisplayNames,
        reduceLocalPresence,
        saveMetadataDebounced,
        validateNextSceneIntent,
    });
}

function memoryRefCount(state) {
    return Object.values(
        state.actorMemoryIndex
            ?.byActorId ||
        {},
    ).reduce(
        (total, entry) =>
            total +
            [
                'core',
                'recent',
                'everyday',
            ].reduce(
                (sum, tier) =>
                    sum +
                    (
                        entry[tier] ||
                        []
                    ).length,
                0,
            ),
        0,
    );
}

function createFailureState(state) {
    const failed =
        structuredClone(state);
    const profile =
        failed.actorLibrary
            .find(actor =>
                actor?.sharedMemories
                    ?.recent);
    assert.ok(
        profile,
        'The real Tina save must contain a legacy recent-memory owner.',
    );
    profile.sharedMemories
        .recent.push({
            id:
                'task6_unconvertible',
        });
    return failed;
}

function runMigrationEvidence(
    sourceState,
    chat,
    lifecycleSourceState =
        null,
    lifecycleChat =
        chat,
) {
    const sourceBytes =
        Buffer.from(json(sourceState));
    const first =
        migrateActorContextV1(
            sourceState,
        );
    const second =
        migrateActorContextV1(
            first.state,
        );
    const validation =
        validateActorContextStateV1(
            first.state,
        );
    assert.equal(
        validation.valid,
        true,
        validation.errors.join('\n'),
    );
    assert.equal(
        json(sourceState),
        sourceBytes.toString('utf8'),
        'migrateActorContextV1 mutated its source.',
    );
    assert.equal(
        second.changed,
        false,
    );
    assert.equal(
        json(second.state),
        json(first.state),
    );

    const failed =
        createFailureState(
            sourceState,
        );
    const failedBefore =
        Buffer.from(json(failed));
    let migrationFailure = '';
    try {
        migrateActorContextV1(
            failed,
        );
    } catch (error) {
        migrationFailure =
            String(error.message);
    }
    assert.match(
        migrationFailure,
        /cannot be converted/u,
    );
    assert.deepEqual(
        Buffer.from(json(failed)),
        failedBefore,
    );

    const lifecycleState =
        structuredClone(
            lifecycleSourceState ||
            first.state,
        );
    let saveRequests = 0;
    const lifecycle =
        createLifecycle(
            lifecycleState,
            lifecycleChat,
            {
                saveMetadataDebounced:
                    () => {
                        saveRequests += 1;
                    },
            },
        );
    const lifecycleFirst =
        lifecycle
            .ensureSceneLifecycleState(
                lifecycleState,
            );
    const lifecycleFirstBytes =
        Buffer.from(
            json(lifecycleState),
        );
    const lifecycleSecondBefore =
        structuredClone(
            lifecycleState,
        );
    const lifecycleSecond =
        lifecycle
            .ensureSceneLifecycleState(
                lifecycleState,
            );
    assert.equal(
        lifecycleFirst,
        true,
    );
    assert.equal(
        lifecycleSecond,
        false,
        `Lifecycle second pass changed: ${Object.keys(
            lifecycleState,
        ).filter(key =>
            json(
                lifecycleState[
                    key
                ],
            ) !==
            json(
                lifecycleSecondBefore[
                    key
                ],
            )).join(', ')}`,
    );
    assert.deepEqual(
        Buffer.from(
            json(lifecycleState),
        ),
        lifecycleFirstBytes,
    );

    const lifecycleFailed =
        structuredClone(
            lifecycleSourceState ||
            first.state,
        );
    lifecycleFailed.socialGraph = {
        ...lifecycleFailed
            .socialGraph,
        version: 1,
    };
    const lifecycleFailedBefore =
        Buffer.from(
            json(lifecycleFailed),
        );
    let lifecycleFailure = '';
    try {
        createLifecycle(
            lifecycleFailed,
            lifecycleChat,
        ).ensureSceneLifecycleState(
            lifecycleFailed,
        );
    } catch (error) {
        lifecycleFailure =
            String(error.message);
    }
    assert.match(
        lifecycleFailure,
        /complete V1\/V2 production source boundary/u,
    );
    assert.deepEqual(
        Buffer.from(
            json(lifecycleFailed),
        ),
        lifecycleFailedBefore,
    );

    return {
        migratedState:
            first.state,
        lifecycleState,
        report: {
            inputState:
                metric(sourceState),
            firstChanged:
                first.changed,
            stats: first.stats,
            validationErrors:
                validation.errors,
            secondChanged:
                second.changed,
            idempotentBytes:
                json(second.state) ===
                json(first.state),
            sourceStateBytesUnchanged:
                json(sourceState) ===
                sourceBytes.toString(
                    'utf8',
                ),
            migrationFailure,
            migrationFailureStateBytesUnchanged:
                Buffer.from(
                    json(failed),
                ).equals(
                    failedBefore,
                ),
            lifecycle: {
                firstChanged:
                    lifecycleFirst,
                secondChanged:
                    lifecycleSecond,
                saveRequests,
                idempotentBytes:
                    Buffer.from(
                        json(
                            lifecycleState,
                        ),
                    ).equals(
                        lifecycleFirstBytes,
                    ),
                failure:
                    lifecycleFailure,
                failureStateBytesUnchanged:
                    Buffer.from(
                        json(
                            lifecycleFailed,
                        ),
                    ).equals(
                        lifecycleFailedBefore,
                    ),
                clockUnchanged:
                    lifecycleState
                        .clock ===
                    (
                        lifecycleSourceState ||
                        first.state
                    ).clock,
                turnUnchanged:
                    json(
                        lifecycleState
                            .turn,
                    ) ===
                    json(
                        (
                            lifecycleSourceState ||
                            first.state
                        )
                            .turn,
                    ),
                stateRevisionUnchanged:
                    lifecycleState
                        .stateRevision ===
                    (
                        lifecycleSourceState ||
                        first.state
                    )
                        .stateRevision,
            },
            sizes: {
                before:
                    metric(sourceState),
                after:
                    metric(first.state),
                actorLibraryBefore:
                    metric(
                        sourceState
                            .actorLibrary,
                    ),
                actorLibraryAfter:
                    metric(
                        first.state
                            .actorLibrary,
                    ),
                actorRuntimeBefore:
                    metric(
                        sourceState
                            .actors,
                    ),
                actorRuntimeAfter:
                    metric(
                        first.state
                            .actors,
                    ),
                memoryRefs:
                    memoryRefCount(
                        first.state,
                    ),
            },
        },
    };
}

function currentImpressionAppraisals(
    state,
) {
    return (
        state.memorySynapse
            ?.appraisals ||
        []
    ).filter(appraisal =>
        (
            appraisal.contextTags ||
            []
        ).includes(
            'migrated_current_impression',
        ));
}

function runMemoryReferenceUpgradeEvidence(
    sourceState,
    chat,
) {
    const sourceBytes =
        Buffer.from(
            json(sourceState),
        );
    const candidateAppraisals =
        currentImpressionAppraisals(
            sourceState,
        );
    const candidateIds =
        new Set(
            candidateAppraisals
                .map(appraisal =>
                    appraisal.id),
        );
    const first =
        migrateActorContextV1(
            sourceState,
        );
    const second =
        migrateActorContextV1(
            first.state,
        );
    const validation =
        validateActorContextStateV1(
            first.state,
        );
    assert.equal(
        validation.valid,
        true,
        validation.errors.join('\n'),
    );
    assert.equal(
        json(sourceState),
        sourceBytes.toString(
            'utf8',
        ),
    );
    assert.equal(
        second.changed,
        false,
    );
    assert.equal(
        currentImpressionAppraisals(
            first.state,
        ).length,
        0,
    );
    assert.equal(
        Object.values(
            first.state.actorMemoryIndex
                .byActorId,
        ).some(entry =>
            [
                'core',
                'recent',
                'everyday',
            ].some(tier =>
                entry[tier].some(
                    reference =>
                        candidateIds.has(
                            reference
                                .recordId,
                        )))),
        false,
    );

    let failure = '';
    let failureStateBytesUnchanged =
        true;
    if (
        sourceState
            .memoryReferenceVersion ===
            1 &&
        candidateAppraisals.length
    ) {
        const failed =
            structuredClone(
                sourceState,
            );
        const candidateId =
            candidateAppraisals[0].id;
        const owner =
            Object.values(
                failed.actorMemoryIndex
                    .byActorId,
            ).find(entry =>
                [
                    'core',
                    'recent',
                    'everyday',
                ].some(tier =>
                    entry[tier].some(
                        reference =>
                            reference
                                .recordId ===
                                candidateId,
                    )));
        assert.ok(
            owner,
            'V1 current impression must have a MemoryRef owner.',
        );
        owner.firstImpressionRef =
            candidateId;
        const failedBefore =
            Buffer.from(
                json(failed),
            );
        try {
            migrateActorContextV1(
                failed,
            );
        } catch (error) {
            failure =
                String(error.message);
        }
        assert.match(
            failure,
            /canonical dependants/u,
        );
        failureStateBytesUnchanged =
            Buffer.from(
                json(failed),
            ).equals(
                failedBefore,
            );
        assert.equal(
            failureStateBytesUnchanged,
            true,
        );
    }

    const lifecycleState =
        structuredClone(
            sourceState,
        );
    let saveRequests = 0;
    const lifecycle =
        createLifecycle(
            lifecycleState,
            chat,
            {
                saveMetadataDebounced:
                    () => {
                        saveRequests += 1;
                    },
            },
        );
    const lifecycleFirst =
        lifecycle
            .ensureSceneLifecycleState(
                lifecycleState,
            );
    const lifecycleFirstBytes =
        Buffer.from(
            json(lifecycleState),
        );
    const lifecycleSecond =
        lifecycle
            .ensureSceneLifecycleState(
                lifecycleState,
            );
    assert.equal(
        lifecycleSecond,
        false,
    );
    assert.deepEqual(
        Buffer.from(
            json(lifecycleState),
        ),
        lifecycleFirstBytes,
    );
    return {
        migratedState:
            first.state,
        lifecycleState,
        forbiddenTexts:
            candidateAppraisals
                .map(appraisal =>
                    appraisal.summaryEn)
                .filter(Boolean),
        report: {
            sourceVersion:
                sourceState
                    .memoryReferenceVersion,
            targetVersion:
                memoryReferenceVersion,
            firstChanged:
                first.changed,
            secondChanged:
                second.changed,
            sourceStateBytesUnchanged:
                Buffer.from(
                    json(sourceState),
                ).equals(
                    sourceBytes,
                ),
            candidateAppraisalCount:
                candidateAppraisals
                    .length,
            remainingCandidateCount:
                currentImpressionAppraisals(
                    first.state,
                ).length,
            stats:
                first.stats,
            failure,
            failureStateBytesUnchanged,
            lifecycle: {
                firstChanged:
                    lifecycleFirst,
                secondChanged:
                    lifecycleSecond,
                saveRequests,
                idempotentBytes:
                    Buffer.from(
                        json(
                            lifecycleState,
                        ),
                    ).equals(
                        lifecycleFirstBytes,
                    ),
            },
        },
    };
}

function text(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

function relationshipFor(
    projection,
    actorId,
) {
    return projection
        .relationships
        .find(edge =>
            edge.sourceActorId ===
                actorId &&
            edge.targetActorId ===
                'player') ||
        null;
}

function legacyMemorySummaries(
    profile,
) {
    return Object.fromEntries(
        [
            'core',
            'recent',
            'everyday',
        ].map(tier => [
            tier,
            (
                profile
                    ?.sharedMemories
                    ?.[tier] ||
                []
            ).map(memory =>
                text(
                    memory.summaryEn ||
                    memory.summary,
                ))
                .filter(Boolean),
        ]),
    );
}

function actorIdsInState(
    state,
) {
    return [
        ...new Set([
            ...(state.actorLibrary || [])
                .map(actor => actor.id),
            ...(state.actors || [])
                .map(actor => actor.id),
        ]),
    ].sort();
}

function legacyMemoryRecords(
    state,
) {
    const profiles =
        new Map(
            (state.actorLibrary || [])
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    const runtimes =
        new Map(
            (state.actors || [])
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    return actorIdsInState(state)
        .flatMap(actorId => [
            profiles.get(actorId)
                ?.sharedMemories,
            runtimes.get(actorId)
                ?.sharedMemories,
            state.sharedMemories
                ?.[actorId],
        ].flatMap(source =>
            [
                'core',
                'recent',
                'everyday',
            ].flatMap(tier =>
                (source?.[tier] || [])
                    .map(memory => ({
                        actorId,
                        tier,
                        eventId:
                            text(
                                memory.eventId,
                            ),
                        summary:
                            text(
                                memory.summaryEn ||
                                memory.summary,
                            ),
                    })))));
}

function memoryReferences(
    state,
) {
    return Object.entries(
        state.actorMemoryIndex
            ?.byActorId ||
        {},
    ).flatMap(([
        actorId,
        entry,
    ]) =>
        [
            'core',
            'recent',
            'everyday',
        ].flatMap(tier =>
            (entry[tier] || [])
                .map(reference => ({
                    actorId,
                    tier,
                    ...reference,
                }))));
}

function countSignatures(
    values,
) {
    const counts = new Map();
    values.forEach(value =>
        counts.set(
            value,
            (counts.get(value) || 0) +
                1,
        ));
    return counts;
}

function signaturesEqual(
    left,
    right,
) {
    return json(
        [...countSignatures(left)]
            .sort(),
    ) ===
        json(
            [...countSignatures(right)]
                .sort(),
        );
}

function presentationRefs(
    state,
) {
    return Object.fromEntries(
        actorIdsInState(state)
            .map(actorId => {
                const presentation =
                    state.actorPresentations
                        ?.[actorId] ||
                    {};
                return [
                    actorId,
                    {
                        wornItemIds:
                            presentation
                                .wornItemIds ||
                            [],
                        heldItemIds:
                            presentation
                                .heldItemIds ||
                            [],
                    },
                ];
            }),
    );
}

function buildLegacyVisibleSnapshot(
    state,
) {
    const profiles =
        new Map(
            (
                state.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const runtimes =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const relationships =
        buildRelationshipProjection(
            state,
            'player',
        );
    const actorIds = [
        ...new Set([
            ...profiles.keys(),
            ...runtimes.keys(),
        ]),
    ].sort();
    return Object.fromEntries(
        actorIds.map(actorId => {
            const profile =
                profiles.get(actorId) ||
                {};
            const runtime =
                runtimes.get(actorId) ||
                {};
            const relationship =
                relationshipFor(
                    relationships,
                    actorId,
                );
            return [
                actorId,
                {
                    core: {
                        name:
                            text(
                                profile
                                    .nameEn ||
                                runtime
                                    .nameEn,
                            ),
                        role:
                            text(
                                profile
                                    .roleEn ||
                                runtime
                                    .roleEn,
                            ),
                        publicBackground:
                            text(
                                profile
                                    .publicBackgroundEn ||
                                runtime
                                    .publicBackgroundEn,
                            ),
                        personality:
                            text(
                                profile
                                    .personalityEn ||
                                runtime
                                    .personalityEn,
                            ),
                        speechStyle:
                            text(
                                profile
                                    .speechStyleEn ||
                                runtime
                                    .speechStyleEn,
                            ),
                        visibleDescription:
                            text(
                                profile
                                    .publicDescriptionEn ||
                                profile
                                    .physicalDescriptionEn ||
                                runtime
                                    .publicDescriptionEn ||
                                runtime
                                    .physicalDescriptionEn,
                            ),
                    },
                    current: {
                        location:
                            text(
                                runtime
                                    .roomId,
                            ),
                        activity:
                            text(
                                runtime
                                    .currentActivityEn,
                            ),
                        intent:
                            text(
                                runtime
                                    .currentIntentEn,
                            ),
                        lifeStatus:
                            text(
                                runtime
                                    .lifeStatus,
                            ),
                        lifeStatusDetail:
                            text(
                                runtime
                                    .lifeStatusDetailEn,
                            ),
                    },
                    relationship: {
                        labels:
                            relationship
                                ?.labels ||
                            ['无关系'],
                        dimensions:
                            relationship
                                ?.dimensions ||
                            Object.fromEntries(
                                SOCIAL_RELATIONSHIP_DIMENSIONS
                                    .map(dimension => [
                                        dimension,
                                        0,
                                    ]),
                            ),
                        activeSentiments:
                            relationship
                                ?.activeSentiments ||
                            [],
                        evidenceRefs:
                            relationship
                                ?.evidenceRefs ||
                            [],
                    },
                    firstImpression:
                        text(
                            profile
                                .firstImpressionOfPlayerEn ||
                            runtime
                                .firstImpressionOfPlayerEn ||
                            profile
                                .firstImpressionOfPlayer ||
                            runtime
                                .firstImpressionOfPlayer,
                        ),
                    legacyCurrentOpinion:
                        text(
                            profile
                                .impressionOfPlayerEn ||
                            runtime
                                .impressionOfPlayerEn ||
                            profile
                                .impressionOfPlayer ||
                            runtime
                                .impressionOfPlayer,
                        ),
                    memories:
                        legacyMemorySummaries(
                            profile,
                        ),
                    items:
                        projectActorItems(
                            state,
                            actorId,
                        ),
                    presentation:
                        presentationRefs(
                            state,
                        )[actorId],
                },
            ];
        }),
    );
}

function buildDossierVisibleSnapshot(
    state,
) {
    return Object.fromEntries(
        (
            state.actorLibrary ||
            []
        ).map(actor => {
            const dossier =
                buildActorDossierViewModel(
                    state,
                    actor.id,
                    'player',
                    {
                        getRoomName:
                            (
                                _state,
                                _mapId,
                                roomId,
                            ) =>
                                roomId,
                    },
                );
            return [
                actor.id,
                {
                    core: {
                        name:
                            dossier
                                .header
                                .name,
                        role:
                            dossier
                                .header
                                .role,
                        ...dossier.core,
                    },
                    current: {
                        location:
                            dossier
                                .current
                                .location,
                        activity:
                            dossier
                                .current
                                .activity,
                        intent:
                            dossier
                                .current
                                .intent,
                        lifeStatus:
                            dossier
                                .current
                                .lifeStatus,
                        lifeStatusDetail:
                            dossier
                                .current
                                .lifeStatusDetail,
                    },
                    relationship: {
                        labels:
                            dossier
                                .relationship
                                .labels,
                        dimensions:
                            dossier
                                .relationship
                                .dimensions,
                        activeSentiments:
                            dossier
                                .relationship
                                .activeSentiments,
                        evidenceRefs:
                            dossier
                                .relationship
                                .evidenceRefs,
                    },
                    firstImpression:
                        text(
                            dossier
                                .relationship
                                .firstImpression
                                ?.summary,
                        ),
                    currentSchema:
                        dossier
                            .relationship
                            .currentSchema,
                    memories:
                        Object.fromEntries(
                            [
                                'core',
                                'recent',
                                'everyday',
                            ].map(tier => [
                                tier,
                                dossier
                                    .memories[
                                        tier
                                    ]
                                    .map(
                                        memory =>
                                            text(
                                                memory
                                                    .summary,
                                            ),
                                    ),
                            ]),
                        ),
                    hydratedMemories:
                        Object.fromEntries(
                            [
                                'core',
                                'recent',
                                'everyday',
                            ].map(tier => [
                                tier,
                                dossier
                                    .memories[
                                        tier
                                    ],
                            ]),
                        ),
                    items:
                        dossier.items,
                    presentation:
                        {
                            wornItemIds:
                                dossier
                                    .current
                                    .presentation
                                    .wornItemIds,
                            heldItemIds:
                                dossier
                                    .current
                                    .presentation
                                    .heldItemIds,
                        },
                },
            ];
        }),
    );
}

function sectionComparison(
    before,
    after,
    section,
) {
    const actorIds = [
        ...new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ]),
    ].sort();
    const differences =
        actorIds.filter(actorId =>
            json(
                before[actorId]
                    ?.[section],
            ) !==
            json(
                after[actorId]
                    ?.[section],
            ));
    return {
        equal:
            differences.length ===
            0,
        actorCount:
            actorIds.length,
        differenceCount:
            differences.length,
        differenceActorIds:
            differences,
    };
}

function coreComparison(
    before,
    after,
) {
    const differences = [];
    for (const actorId of [
        ...new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ]),
    ].sort()) {
        const beforeCore =
            before[actorId]?.core ||
            {};
        const afterCore =
            after[actorId]?.core ||
            {};
        for (const field of [
            'name',
            'role',
            'publicBackground',
            'personality',
            'speechStyle',
            'visibleDescription',
        ]) {
            if (
                beforeCore[field] !==
                afterCore[field]
            ) {
                differences.push({
                    actorId,
                    field,
                    before:
                        beforeCore[field],
                    after:
                        afterCore[field],
                });
            }
        }
    }
    const approved =
        differences.length === 1 &&
        differences[0].actorId ===
            'canon_harry_james_potter' &&
        differences[0].field ===
            'speechStyle' &&
        isPlaceholderSpeechStyle(
            differences[0].before,
        ) &&
        differences[0].after ===
            getCanonicalPerformanceCore(
                'canon_harry_james_potter',
            ).speechStyleEn;
    return {
        equal: approved,
        actorCount:
            Object.keys(before).length,
        rawDifferenceCount:
            differences.length,
        approvedImprovementCount:
            approved ? 1 : 0,
        differences,
    };
}

function factSignature(
    {
        actorId,
        tier,
        recordType,
        recordId = '',
        summary,
    },
) {
    return json({
        actorId,
        tier,
        recordType,
        recordId,
        summary:
            text(summary),
    });
}

function dossierMemoryRecords(
    snapshot,
) {
    return Object.entries(snapshot)
        .flatMap(([
            actorId,
            actor,
        ]) =>
            [
                'core',
                'recent',
                'everyday',
            ].flatMap(tier =>
                (
                    actor
                        .hydratedMemories[
                            tier
                        ] ||
                    []
                ).map(memory => ({
                    actorId,
                    tier,
                    recordType:
                        memory.recordType,
                    recordId:
                        memory.recordId,
                    summary:
                        memory.summary,
                }))));
}

function memoryReconciliation(
    beforeState,
    afterState,
    beforeSnapshot,
    afterSnapshot,
) {
    const eventsById =
        new Map(
            (
                beforeState
                    .eventKnowledge ||
                []
            ).map(event => [
                text(event.eventId),
                event,
            ]),
        );
    const legacyMemories =
        legacyMemoryRecords(
            beforeState,
        );
    const legacyEventMemories =
        legacyMemories.filter(memory =>
            eventsById.has(
                memory.eventId,
            ));
    const legacySubjectiveMemories =
        legacyMemories.filter(memory =>
            !eventsById.has(
                memory.eventId,
            ));
    const legacyCurrentOpinions =
        Object.entries(
            beforeSnapshot,
        )
            .filter(([
                ,
                actor,
            ]) =>
                actor
                    .legacyCurrentOpinion)
            .map(([
                actorId,
                actor,
            ]) => ({
                actorId,
                tier: 'recent',
                recordType:
                    'appraisal',
                summary:
                    actor
                        .legacyCurrentOpinion,
            }));
    const references =
        memoryReferences(
            afterState,
        );
    const hydrated =
        dossierMemoryRecords(
            afterSnapshot,
        );
    const hydratedEvents =
        hydrated.filter(record =>
            record.recordType ===
                'event');
    const hydratedAppraisals =
        hydrated.filter(record =>
            record.recordType ===
                'appraisal');
    const currentOpinionAppraisals =
        (
            afterState.memorySynapse
                ?.appraisals ||
            []
        ).filter(appraisal =>
            (
                appraisal
                    .contextTags ||
                []
            ).includes(
                'migrated_current_impression',
            ));
    const temporaryAppraisals =
        (
            afterState.memorySynapse
                ?.appraisals ||
            []
        ).filter(appraisal =>
            (
                appraisal
                    .contextTags ||
                []
            ).includes(
                'migrated_temporary_memory',
            ));
    const temporaryAppraisalIds =
        new Set(
            temporaryAppraisals
                .map(appraisal =>
                    appraisal.id),
        );
    const currentOpinionIds =
        new Set(
            currentOpinionAppraisals
                .map(appraisal =>
                    appraisal.id),
        );
    const schemaAppraisalIds =
        new Set(
            (
                afterState
                    .memorySynapse
                    ?.personSchemas ||
                []
            ).flatMap(schema => [
                ...(schema
                    .supportAppraisalIds ||
                    []),
                ...(schema
                    .counterAppraisalIds ||
                    []),
            ]),
        );
    const legacyEventFacts =
        legacyEventMemories
            .map(memory =>
                factSignature({
                    ...memory,
                    recordType:
                        'event',
                    recordId:
                        memory.eventId,
                }));
    const hydratedEventFacts =
        hydratedEvents
            .map(factSignature);
    const legacySubjectiveFacts =
        legacySubjectiveMemories
            .map(memory =>
                factSignature({
                    ...memory,
                    recordType:
                        'appraisal',
                }));
    const hydratedSubjectiveFacts =
        hydratedAppraisals
            .map(record =>
                factSignature({
                    ...record,
                    recordId: '',
                }));
    const referencedEventIds =
        new Set(
            references
                .filter(reference =>
                    reference
                        .recordType ===
                    'event')
                .map(reference =>
                    reference.recordId),
        );
    const knownEventIds =
        (
            afterState
                .eventKnowledge ||
            []
        )
            .filter(event =>
                event
                    .knownToPlayer ===
                true)
            .map(event =>
                event.eventId)
            .sort();
    const eventRefs =
        references.filter(reference =>
            reference.recordType ===
                'event');
    const appraisalRefs =
        references.filter(reference =>
            reference.recordType ===
                'appraisal');
    const playerVisibleAppraisalRefs =
        appraisalRefs.filter(reference =>
            !temporaryAppraisalIds
                .has(
                    reference.recordId,
                ));
    const eventTextCopyCount =
        references.filter(reference =>
            Object.hasOwn(
                reference,
                'summary',
            ) ||
            Object.hasOwn(
                reference,
                'summaryEn',
            )).length;
    const currentOpinionRefs =
        references.filter(reference =>
            currentOpinionIds.has(
                reference.recordId,
            ));
    const eventFactsEqual =
        signaturesEqual(
            legacyEventFacts,
            hydratedEventFacts,
        );
    const subjectiveFactsEqual =
        signaturesEqual(
            legacySubjectiveFacts,
            hydratedSubjectiveFacts,
        );
    const knownEventsMatchRefs =
        json(knownEventIds) ===
        json(
            [...referencedEventIds]
                .sort(),
        );
    const currentOpinionsDiscarded =
        currentOpinionAppraisals
            .length === 0 &&
        currentOpinionRefs.length === 0 &&
        [...schemaAppraisalIds]
            .every(id =>
                !currentOpinionIds
                    .has(id));
    return {
        pass:
            legacyMemories.length ===
                91 &&
            legacyEventMemories.length ===
                31 &&
            legacySubjectiveMemories
                .length === 60 &&
            references.length === 93 &&
            eventRefs.length === 31 &&
            appraisalRefs.length === 62 &&
            playerVisibleAppraisalRefs
                .length === 60 &&
            temporaryAppraisals.length ===
                2 &&
            legacyCurrentOpinions
                .length === 22 &&
            currentOpinionAppraisals
                .length === 0 &&
            currentOpinionRefs.length ===
                0 &&
            currentOpinionsDiscarded &&
            referencedEventIds.size ===
                5 &&
            knownEventIds.length === 5 &&
            knownEventsMatchRefs &&
            hydratedEvents.length ===
                31 &&
            hydratedAppraisals.length ===
                60 &&
            eventTextCopyCount === 0 &&
            eventFactsEqual &&
            subjectiveFactsEqual,
        legacySharedMemoryCount:
            legacyMemories.length,
        event: {
            legacyRefCount:
                legacyEventMemories
                    .length,
            newRefCount:
                eventRefs.length,
            uniqueReferencedCount:
                referencedEventIds.size,
            knownToPlayerCount:
                knownEventIds.length,
            knownEventsMatchRefs,
            dossierHydrationCount:
                hydratedEvents.length,
            textCopyCount:
                eventTextCopyCount,
            factsEqual:
                eventFactsEqual,
        },
        subjectiveAppraisals: {
            legacyMemoryCount:
                legacySubjectiveMemories
                    .length,
            legacyCurrentOpinionCount:
                legacyCurrentOpinions
                    .length,
            newRefCount:
                appraisalRefs.length,
            dossierHydrationCount:
                hydratedAppraisals
                    .length,
            factsEqual:
                subjectiveFactsEqual,
        },
        temporaryMemories: {
            migratedAppraisalCount:
                temporaryAppraisals.length,
            hiddenFromPlayerDossier:
                temporaryAppraisals
                    .every(appraisal =>
                        !hydratedAppraisals
                            .some(record =>
                                record.recordId ===
                                appraisal.id)),
        },
        currentOpinions: {
            legacyCount:
                legacyCurrentOpinions
                    .length,
            migratedAppraisalCount:
                currentOpinionAppraisals
                    .length,
            recentRefCount:
                currentOpinionRefs.length,
            exactTextMatch:
                subjectiveFactsEqual,
            historicalClaimAllowedFalse:
                true,
            excludedFromSchema:
                true,
            discarded:
                currentOpinionsDiscarded,
        },
    };
}

function buildSnapshotEvidence(
    beforeState,
    afterState,
) {
    const before =
        buildLegacyVisibleSnapshot(
            beforeState,
        );
    const after =
        buildDossierVisibleSnapshot(
            afterState,
        );
    const firstImpression =
        sectionComparison(
            before,
            after,
            'firstImpression',
        );
    const memory =
        memoryReconciliation(
            beforeState,
            afterState,
            before,
            after,
        );
    const sections = {
        core:
            coreComparison(
                before,
                after,
            ),
        current:
            sectionComparison(
                before,
                after,
                'current',
            ),
        relationship:
            sectionComparison(
                before,
                after,
                'relationship',
            ),
        firstImpression,
        memories: {
            equal:
                memory.pass,
            actorCount:
                Object.keys(before)
                    .length,
            differenceCount:
                memory.pass
                    ? 0
                    : 1,
            differenceActorIds: [],
        },
        formalItems:
            sectionComparison(
                before,
                after,
                'items',
            ),
        presentation:
            sectionComparison(
                before,
                after,
                'presentation',
            ),
    };
    const firstImpressionCount =
        Object.values(before)
            .filter(actor =>
                actor.firstImpression)
            .length;
    const sectionPass =
        Object.values(sections)
            .every(section =>
                section.equal);
    const semanticPass =
        sectionPass &&
        firstImpressionCount === 10 &&
        memory.pass;
    const failedSections =
        Object.entries(sections)
            .filter(([, section]) =>
                !section.equal)
            .map(([name]) => name);
    assert.equal(
        semanticPass,
        true,
        `Tina player-visible semantic facts changed during Actor Context V1 cutover: ${failedSections.join(', ') || 'aggregate checks'}. Memory: ${json(memory)}`,
    );
    return {
        semanticPass,
        beforeHash:
            sha256(json(before)),
        afterHash:
            sha256(json(after)),
        beforeActorCount:
            Object.keys(before).length,
        afterActorCount:
            Object.keys(after).length,
        sections,
        firstImpressions: {
            pass:
                firstImpression.equal &&
                firstImpressionCount ===
                    10,
            count:
                firstImpressionCount,
        },
        memoryReconciliation:
            memory,
    };
}

function getActiveAddressingState(
    state,
) {
    const activeIds =
        new Set(
            projectPeoplePanel(
                state,
            ).activePeople
                .map(person =>
                    person.id),
        );
    return {
        ...state,
        actors:
            (
                state.actors ||
                []
            ).map(actor => ({
                ...actor,
                present:
                    activeIds.has(
                        actor.id,
                    ),
            })),
    };
}

function findLatestPlayerAction(
    chat,
) {
    return String(
        [...chat]
            .reverse()
            .find(message =>
                message.is_user ===
                true)
            ?.mes ||
        '',
    );
}

function extractOutputSchema(
    systemPrompt,
) {
    const marker =
        '\nSchema:\n';
    const markerIndex =
        systemPrompt.indexOf(
            marker,
        );
    if (markerIndex < 0) {
        return '';
    }
    const start =
        systemPrompt.indexOf(
            '{',
            markerIndex +
                marker.length,
        );
    if (start < 0) return '';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (
        let index = start;
        index <
            systemPrompt.length;
        index += 1
    ) {
        const character =
            systemPrompt[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (
                character === '\\'
            ) {
                escaped = true;
            } else if (
                character === '"'
            ) {
                inString = false;
            }
            continue;
        }
        if (character === '"') {
            inString = true;
        } else if (
            character === '{'
        ) {
            depth += 1;
        } else if (
            character === '}'
        ) {
            depth -= 1;
            if (depth === 0) {
                return systemPrompt
                    .slice(
                        start,
                        index + 1,
                    );
            }
        }
    }
    return '';
}

function countKeys(
    value,
    targetKeys,
) {
    let count = 0;
    const visit = current => {
        if (
            !current ||
            typeof current !==
                'object'
        ) {
            return;
        }
        for (const [
            key,
            child,
        ] of Object.entries(
                current,
            )) {
            if (
                targetKeys.has(
                    key,
                )
            ) {
                count += 1;
            }
            visit(child);
        }
    };
    visit(value);
    return count;
}

function promptReport(
    prompt,
    slot,
    forbiddenCurrentImpressions = [],
) {
    const system =
        String(
            prompt.find(message =>
                message.role ===
                    'system')
                ?.content ||
            '',
        );
    const user =
        String(
            prompt.find(message =>
                message.role ===
                    'user')
                ?.content ||
            '',
        );
    const payload =
        JSON.parse(user);
    const outputSchema =
        extractOutputSchema(
            system,
        );
    const limited =
        limitMessagesToContext(
            prompt,
            slot.contextSize,
            slot.maxResponseLength,
        );
    const limitedSystem =
        String(
            limited.find(message =>
                message.role ===
                    'system')
                ?.content ||
            '',
        );
    const limitedUser =
        String(
            limited.find(message =>
                message.role ===
                    'user')
                ?.content ||
            '',
        );
    const limitedPayload =
        JSON.parse(
            limitedUser,
        );
    const actorCardMetrics =
        payload.actorCards
            .map(card => ({
                actorId:
                    card.actorId,
                ...metric(card),
            }));
    const actorCapsules =
        Object.values(
            payload
                .memoryActivations
                ?.byActorId ||
            {},
        );
    const eventCounts =
        actorCapsules
            .map(capsule =>
                capsule
                    .supportingEvents
                    ?.length ||
                0);
    const schemaCounts =
        actorCapsules
            .map(capsule =>
                capsule
                    .expectations
                    ?.length ||
                0);
    return {
        total:
            metric(
                prompt.reduce(
                    (
                        value,
                        message,
                    ) =>
                        value +
                        String(
                            message
                                .content ||
                            '',
                        ),
                    '',
                ),
                true,
            ),
        systemPrompt:
            metric(
                system,
                true,
            ),
        outputSchema:
            metric(
                outputSchema,
                true,
            ),
        userPayload:
            metric(
                user,
                true,
            ),
        sections:
            Object.fromEntries(
                Object.entries(
                    payload,
                ).map(([
                    key,
                    value,
                ]) => [
                    key,
                    metric(value),
                ]),
            ),
        topLevelKeys:
            Object.keys(
                payload,
            ),
        actorCards: {
            count:
                payload
                    .actorCards
                    .length,
            maximumBytes:
                Math.max(
                    0,
                    ...actorCardMetrics
                        .map(card =>
                            card.bytes),
                ),
            largest:
                actorCardMetrics
                    .sort((
                        left,
                        right,
                    ) =>
                        right.bytes -
                        left.bytes)[0] ||
                null,
        },
        schemas: {
            maximumPerActor:
                Math.max(
                    0,
                    ...schemaCounts,
                ),
            total:
                schemaCounts
                    .reduce(
                        (
                            sum,
                            count,
                        ) =>
                            sum +
                            count,
                        0,
                    ),
        },
        events: {
            maximumPerActor:
                Math.max(
                    0,
                    ...eventCounts,
                ),
            total:
                eventCounts
                    .reduce(
                        (
                            sum,
                            count,
                        ) =>
                            sum +
                            count,
                        0,
                    ),
        },
        duplicateLegacyPayloadCount:
            countKeys(
                payload,
                new Set(
                    LEGACY_PAYLOAD_KEYS,
                ),
            ),
        legacyTopLevelPayloadCount:
            Object.keys(payload)
                .filter(key =>
                    ![
                        'playerTurn',
                        'sceneFacts',
                        'actorCards',
                        'actionOpportunities',
                        'memoryActivations',
                        'prohibitions',
                    ].includes(key))
                .length,
        forbiddenCurrentImpressionCount:
            forbiddenCurrentImpressions
                .filter(value =>
                    value &&
                    user.includes(value))
                .length,
        contextTrimmed:
            system !==
                limitedSystem ||
            user !==
                limitedUser,
        protectedFields: {
            systemPromptUnchanged:
                system ===
                limitedSystem,
            outputSchemaUnchanged:
                outputSchema ===
                extractOutputSchema(
                    limitedSystem,
                ),
            playerActionUnchanged:
                payload
                    .playerTurn
                    ?.playerAction ===
                limitedPayload
                    .playerTurn
                    ?.playerAction,
            authoritySnapshotUnchanged:
                json(
                    payload
                        .sceneFacts
                        ?.authoritySnapshot,
                ) ===
                json(
                    limitedPayload
                        .sceneFacts
                        ?.authoritySnapshot,
                ),
            actorCardsUnchanged:
                json(
                    payload
                        .actorCards,
                ) ===
                json(
                    limitedPayload
                        .actorCards,
                ),
        },
    };
}

async function buildPromptEvidence(
    state,
    chat,
    forbiddenCurrentImpressions = [],
) {
    const playerAction =
        findLatestPlayerAction(
            chat,
        );
    assert.ok(
        playerAction,
        'Tina archive has no player action.',
    );
    const activeNamedActorCount =
        projectPeoplePanel(state)
            .activePeople.length;
    const performanceBudget =
        createTurnPerformanceBudget(
            playerAction,
            {},
            {
                activeNamedActorCount,
            },
        );
    const slot =
        state.modelSlots.low;
    const contextPlan =
        createContextBudgetPlan(
            slot.contextSize,
            slot.maxResponseLength,
        );
    const prompts = [];
    const response = {
        segments: [{
            type:
                'narration',
            textEn:
                'The table remains unchanged.',
        }, {
            type:
                'narration',
            textEn:
                'The room waits.',
        }],
    };
    let settlementCaptures = 0;
    const workflow =
        createTurnPerformanceWorkflow({
            CANON_CAST_IDENTITY_CONTRACT,
            CANON_WIT_TONE_CONTRACT,
            CONTEXT_SIZE_PRESETS: {
                rich:
                    slot.contextSize,
            },
            DEFAULT_MODEL_SLOTS: {
                low: slot,
            },
            NPC_IDENTITY_PROMPT_BOUNDARY,
            beginLiveSceneStream:
                () => {},
            buildBehavioralEnvironment,
            buildCurrentMaterialState,
            buildSpatialContext,
            buildStructuredPlayerTurnSequence,
            buildTemporaryActorPromotionPolicy,
            createContextBudgetPlan,
            extractRoleResponseText:
                response =>
                    response.content,
            getActiveAddressingState,
            getAuthoritativeSceneSpells,
            getRequestHeaders:
                () => ({}),
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            parseItemOperationDirectives,
            parseJsonObject:
                value =>
                    typeof value ===
                        'string'
                        ? JSON.parse(
                            value,
                        )
                        : value,
            recordTurnDiagnostic:
                () => {},
            recoverScenePerformancePayload:
                () => null,
            removeExplicitAddressDirective,
            resolvePlayerAddressing,
            resolveTemporaryActorRevealedName,
            sendModelTaskRequest:
                async (
                    _slot,
                    prompt,
                ) => {
                    prompts.push(
                        structuredClone(
                            prompt,
                        ),
                    );
                    return {
                        content:
                            response,
                    };
                },
            setLiveSceneStreamPhase:
                () => {},
            settleNarrativeTurnPerformance:
                payload =>
                    payload,
            translateOpeningValues:
                async values =>
                    values,
            updateLiveSceneStream:
                () => {},
            validateScenePerformance:
                () => ({
                    valid: true,
                    errors: [],
                }),
        });
    const originalFetch =
        globalThis.fetch;
    globalThis.fetch =
        async () => {
            settlementCaptures += 1;
            return {
                ok: true,
                json:
                    async () => ({
                        performance:
                            response,
                    }),
            };
        };
    try {
        await workflow
            .generateScenePerformance(
                {
                    ...slot,
                    profileId:
                        slot.profileId ||
                        'build-only',
                },
                state,
                playerAction,
                performanceBudget,
                [],
                null,
                null,
                null,
                null,
                [],
                contextPlan,
            );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
    assert.equal(
        prompts.length,
        1,
        'Production build-only capture must produce exactly one initial Prompt.',
    );
    const initial =
        promptReport(
            prompts[0],
            slot,
            forbiddenCurrentImpressions,
        );
    assert.equal(
        initial
            .forbiddenCurrentImpressionCount,
        0,
    );
    return {
        playerAction: {
            characters:
                playerAction.length,
            bytes:
                encoder.encode(
                    playerAction,
                ).length,
            source:
                'latest is_user=true JSONL row',
        },
        activeNamedActorCount,
        performanceBudget,
        contextPlan,
        initial,
        buildOnly: {
            promptCaptures:
                prompts.length,
            modelAdapterCalls: 0,
            externalNetworkCalls: 0,
            localSettlementCaptures:
                settlementCaptures,
        },
        baseline:
            LEGACY_PROMPT_BASELINE,
        delta: {
            initialSystemCharacters:
                initial
                    .systemPrompt
                    .characters -
                LEGACY_PROMPT_BASELINE
                    .systemCharacters,
            initialUserCharacters:
                initial
                    .userPayload
                    .characters -
                LEGACY_PROMPT_BASELINE
                    .userCharacters,
            initialTotalCharacters:
                initial.total
                    .characters -
                (
                    LEGACY_PROMPT_BASELINE
                        .systemCharacters +
                    LEGACY_PROMPT_BASELINE
                        .userCharacters
                ),
        },
    };
}

export async function runTask6Acceptance(
    file =
    DEFAULT_TINA_FILE,
) {
    const resolved =
        path.resolve(file);
    const before =
        await readArchive(
            resolved,
        );
    const activeHasActorContext =
        before.state
            .actorContextVersion ===
            actorContextVersion &&
        before.state
            .actorDossierProjectionVersion ===
            actorDossierProjectionVersion &&
        Boolean(
            before.state
                .actorMemoryIndex,
        );
    const migrationArchive =
        activeHasActorContext &&
        resolved ===
            DEFAULT_TINA_FILE
            ? await readArchive(
                DEFAULT_TINA_LEGACY_FILE,
            )
            : before;
    const lifecycleArchive =
        activeHasActorContext &&
        resolved ===
            DEFAULT_TINA_FILE
            ? await readArchive(
                DEFAULT_TINA_LIFECYCLE_FILE,
            )
            : migrationArchive;
    const migration =
        runMigrationEvidence(
            migrationArchive.state,
            migrationArchive.chat,
            lifecycleArchive.state,
            lifecycleArchive.chat,
        );
    const snapshots =
        buildSnapshotEvidence(
            migrationArchive.state,
            migration.migratedState,
        );
    const memoryReferenceUpgrade =
        activeHasActorContext
            ? runMemoryReferenceUpgradeEvidence(
                before.state,
                before.chat,
            )
            : null;
    const forbiddenCurrentImpressions =
        memoryReferenceUpgrade
            ?.forbiddenTexts
            ?.length
            ? memoryReferenceUpgrade
                .forbiddenTexts
            : [
                ...(
                    migrationArchive
                        .state
                        .actorLibrary ||
                    []
                ),
                ...(
                    migrationArchive
                        .state
                        .actors ||
                    []
                ),
            ]
                .flatMap(actor => [
                    actor
                        .impressionOfPlayerEn,
                    actor
                        .impressionOfPlayer,
                ])
                .filter(Boolean);
    const prompt =
        await buildPromptEvidence(
            memoryReferenceUpgrade
                ?.lifecycleState ||
                migration.lifecycleState,
            before.chat,
            forbiddenCurrentImpressions,
        );
    const after =
        await readArchive(
            resolved,
        );
    const fileBefore =
        fileMetric(
            before.contents,
            before.stats,
        );
    const fileAfter =
        fileMetric(
            after.contents,
            after.stats,
        );
    assert.deepEqual(
        fileAfter,
        fileBefore,
        'Dry-run changed Tina JSONL bytes or mtime.',
    );
    const migrationArchiveAfter =
        migrationArchive === before
            ? after
            : await readArchive(
                migrationArchive.path,
            );
    const migrationFileBefore =
        fileMetric(
            migrationArchive.contents,
            migrationArchive.stats,
        );
    const migrationFileAfter =
        fileMetric(
            migrationArchiveAfter
                .contents,
            migrationArchiveAfter.stats,
        );
    assert.deepEqual(
        migrationFileAfter,
        migrationFileBefore,
        'Dry-run changed the Tina legacy evidence archive.',
    );
    const lifecycleArchiveAfter =
        lifecycleArchive === before
            ? after
            : lifecycleArchive ===
                migrationArchive
                ? migrationArchiveAfter
                : await readArchive(
                    lifecycleArchive.path,
                );
    const lifecycleFileBefore =
        fileMetric(
            lifecycleArchive
                .contents,
            lifecycleArchive.stats,
        );
    const lifecycleFileAfter =
        fileMetric(
            lifecycleArchiveAfter
                .contents,
            lifecycleArchiveAfter
                .stats,
        );
    assert.deepEqual(
        lifecycleFileAfter,
        lifecycleFileBefore,
        'Dry-run changed the Tina lifecycle evidence archive.',
    );
    return {
        version: 2,
        mode: 'build-only',
        archive: {
            path: resolved,
            lineCount:
                before.lines.length,
            firstLineState:
                true,
            before:
                fileBefore,
            after:
                fileAfter,
            shaAndMtimeUnchanged:
                true,
            stateRevision:
                before.state
                    .stateRevision,
            turn:
                before.state.turn
                    ?.count,
        },
        migrationArchive: {
            path:
                migrationArchive.path,
            before:
                migrationFileBefore,
            after:
                migrationFileAfter,
            shaAndMtimeUnchanged:
                true,
            distinctFromActive:
                migrationArchive !==
                before,
        },
        lifecycleArchive: {
            path:
                lifecycleArchive.path,
            before:
                lifecycleFileBefore,
            after:
                lifecycleFileAfter,
            shaAndMtimeUnchanged:
                true,
            distinctFromMigration:
                lifecycleArchive !==
                migrationArchive,
        },
        migration:
            migration.report,
        memoryReferenceUpgrade:
            memoryReferenceUpgrade
                ?.report ||
            null,
        playerVisibleSnapshots:
            snapshots,
        prompt,
    };
}

const isMain =
    process.argv[1] &&
    path.resolve(
        process.argv[1],
    ) ===
        fileURLToPath(
            import.meta.url,
        );

if (isMain) {
    const report =
        await runTask6Acceptance(
            process.argv[2] ||
            DEFAULT_TINA_FILE,
        );
    process.stdout.write(
        `${JSON.stringify(
            report,
            null,
            2,
        )}\n`,
    );
}
