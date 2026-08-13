/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    migrateActorContextV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    migrateTimelineAppraisalLifecycleV4,
} from '../public/scripts/extensions/hogwarts-mud/domain/timeline-appraisal-cutover.js';
import {
    createStableContractId,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';

const TINA_SAVE_URL = new URL(
    '../data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    import.meta.url,
);

const MISSING_APPLIED_DELTA_RECEIPTS = [
    {
        sourceActorId:
            'canon_filius_flitwick',
        targetActorId: 'player',
        eventKind: 'other',
        eventId:
            'event_first_charms_lesson_988fa95d9373dfd1',
    },
    {
        sourceActorId:
            'canon_ronald_bilius_weasley',
        targetActorId: 'player',
        eventKind: 'other',
        eventId:
            'event_first_charms_lesson_988fa95d9373dfd1',
    },
];

let tinaSavePromise;

async function loadTinaSave() {
    tinaSavePromise ??=
        readFile(
            TINA_SAVE_URL,
            'utf8',
        ).then(source =>
            source
                .trimEnd()
                .split('\n')
                .map(line =>
                    JSON.parse(line)));
    const rows =
        await tinaSavePromise;
    return {
        state:
            structuredClone(
                rows[0]
                    .chat_metadata
                    .hogwartsMud,
            ),
        chat:
            structuredClone(
                rows.slice(1),
            ),
    };
}

function relationshipAggregates(
    state,
) {
    return (
        state.socialGraph
            ?.relationships ||
        []
    ).map(edge => ({
        id: edge.id,
        sourceActorId:
            edge.sourceActorId,
        targetActorId:
            edge.targetActorId,
        familiarity:
            edge.familiarity,
        closeness: edge.closeness,
        warmth: edge.warmth,
        trust: edge.trust,
        respect: edge.respect,
        influence: edge.influence,
        tension: edge.tension,
        resentment: edge.resentment,
        fear: edge.fear,
        protectiveness:
            edge.protectiveness,
        structuralTags:
            edge.structuralTags,
    }));
}

function unchanged(value) {
    return {
        state: value,
        changed: false,
    };
}

function createLifecycle(
    state,
    chat,
    saveCalls,
) {
    return createLifecycleRuntime({
        createFallbackNextSceneIntent:
            () => null,
        getContext:
            () => ({
                chat,
                chatMetadata: {
                    hogwartsMud:
                        state,
                },
            }),
        getLocalMapDefinition:
            () => null,
        getMudState:
            () => state,
        getRoomName:
            () => '',
        jobRegistry: {},
        migrateActorContextState:
            migrateActorContextV1,
        migrateActorKnowledgeBoundaries:
            unchanged,
        migrateActorMovementHistory:
            unchanged,
        migrateActorPresentationState:
            unchanged,
        migrateCalendarState:
            unchanged,
        migrateItemSystemState:
            unchanged,
        migrateLoadedSocialGraph:
            graph => ({
                graph,
                changed: false,
            }),
        migrateNpcIdentityObservations:
            unchanged,
        migrateNpcIdentityState:
            unchanged,
        migrateObservedInventoryState:
            unchanged,
        migrateRelationshipMemoryState:
            unchanged,
        migrateSpellbookState:
            unchanged,
        normalizeCausalCollapseState:
            value => value,
        normalizeModelSlots:
            value => value,
        projectActorSocialRelationships:
            value => value,
        reconcileCanonActorDisplayNames:
            unchanged,
        reconcileTemporaryActorDisplayNames:
            unchanged,
        reduceLocalPresence:
            value =>
                value.localPresence,
        saveMetadataDebounced:
            options =>
                saveCalls.push(options),
        validateNextSceneIntent:
            () => ({
                valid: true,
            }),
    });
}

test('Revision 4 migrates Tina to 13 receipts and deletes both details without applied deltas', async () => {
    const {
        state,
        chat,
    } = await loadTinaSave();
    const before =
        structuredClone(state);
    const aggregates =
        relationshipAggregates(state);
    const result =
        migrateTimelineAppraisalLifecycleV4(
            state,
            chat,
        );

    assert.deepEqual(state, before);
    assert.deepEqual(
        result.stats,
        {
            chronicleEntryCount: 12,
            eventCount: 9,
            appraisalCount: 35,
            removedAppraisalCount: 37,
            retainedReceiptCount: 13,
            droppedReceiptCount: 92,
            receiptDropReasons: {
                noEvent: 89,
                ambiguousEvent: 1,
                missingAppliedDelta: 2,
            },
            removedStatementCount: 83,
        },
    );
    assert.deepEqual(
        relationshipAggregates(
            result.state,
        ),
        aggregates,
    );
    assert.equal(
        result.state.socialGraph
            .relationships.length,
        34,
    );
    assert.equal(
        result.state.socialGraph
            .relationships
            .flatMap(edge =>
                edge.activeEmotions)
            .length,
        9,
    );
    const retainedIds =
        new Set(
            result.state.socialGraph
                .relationshipEvidence
                .map(receipt =>
                    receipt.id),
        );
    for (
        const identity of
            MISSING_APPLIED_DELTA_RECEIPTS
    ) {
        assert.equal(
            retainedIds.has(
                createStableContractId(
                    'relation_evidence',
                    identity,
                ),
            ),
            false,
        );
    }
    assert.equal(
        result.state.socialGraph
            .relationshipEvidence
            .some(receipt =>
                receipt
                    .dimensionDeltas
                    .some(delta =>
                        delta.appliedDelta ===
                            undefined)),
        false,
    );
});

test('Revision 4 cutover is byte-idempotent on its second run', async () => {
    const {
        state,
        chat,
    } = await loadTinaSave();
    const first =
        migrateTimelineAppraisalLifecycleV4(
            state,
            chat,
        );
    const second =
        migrateTimelineAppraisalLifecycleV4(
            first.state,
            chat,
        );

    assert.equal(second.changed, false);
    assert.deepEqual(
        second.state,
        first.state,
    );

    const corrupted =
        structuredClone(
            first.state,
        );
    corrupted.timeline = [];
    assert.throws(
        () =>
            migrateTimelineAppraisalLifecycleV4(
                corrupted,
                chat,
            ),
        /still contains removed fields/u,
    );
});

test('Revision 4 rejects non-empty legacy prose ledgers atomically', async t => {
    for (const field of [
        'gossipPacks',
        'worldNews',
        'worldChangeLog',
    ]) {
        await t.test(
            field,
            async () => {
                const {
                    state,
                    chat,
                } = await loadTinaSave();
                state[field] = [{
                    text:
                        'Legacy prose without Event authority.',
                }];
                const before =
                    structuredClone(
                        state,
                    );

                assert.throws(
                    () =>
                        migrateTimelineAppraisalLifecycleV4(
                            state,
                            chat,
                        ),
                    new RegExp(
                        `Legacy ${field} cannot be migrated`,
                        'u',
                    ),
                );
                assert.deepEqual(
                    state,
                    before,
                );
            },
        );
    }
});

test('Revision 4 removes an empty world-change diagnostic but rejects business payload atomically', async () => {
    const {
        state,
        chat,
    } = await loadTinaSave();
    const migrated =
        migrateTimelineAppraisalLifecycleV4(
            state,
            chat,
        );

    assert.equal(
        Object.hasOwn(
            migrated.state
                .sceneEnrichment,
            'worldChanges',
        ),
        false,
    );

    state.sceneEnrichment
        .worldChanges
        .gossipUpdates = [{
            id: 'legacy_rumor',
        }];
    const before =
        structuredClone(state);
    assert.throws(
        () =>
            migrateTimelineAppraisalLifecycleV4(
                state,
                chat,
            ),
        /sceneEnrichment\.worldChanges cannot be migrated/u,
    );
    assert.deepEqual(state, before);
});

test('Revision 4 archive seed failure leaves the caller State unchanged', async () => {
    const {
        state,
        chat,
    } = await loadTinaSave();
    delete state.sceneArchive[0]
        .closureSummaryEn;
    delete state.sceneArchive[0]
        .summaryEn;
    const before =
        structuredClone(state);

    assert.throws(
        () =>
            migrateTimelineAppraisalLifecycleV4(
                state,
                chat,
            ),
        /cannot seed Global Chronicle/u,
    );
    assert.deepEqual(state, before);
});

test('production lifecycle commits the Revision 4 cutover once', async () => {
    const {
        state,
        chat,
    } = await loadTinaSave();
    const saveCalls = [];
    const lifecycle =
        createLifecycle(
            state,
            chat,
            saveCalls,
        );

    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        true,
    );
    assert.equal(
        state.socialGraph
            .relationshipEvidence
            .length,
        13,
    );
    assert.equal(
        Object.hasOwn(
            state,
            'timeline',
        ),
        false,
    );
    assert.equal(saveCalls.length, 1);
    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        false,
    );
    assert.equal(saveCalls.length, 1);
});
