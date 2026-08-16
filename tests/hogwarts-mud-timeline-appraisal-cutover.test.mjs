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
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';

const TINA_SAVE_URL = new URL(
    '../data/default-user/chats/Hogwarts_World_Director/' +
    'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    import.meta.url,
);

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

test('current Tina satisfies the Revision 4 contract and the cutover is a no-op', async () => {
    const {
        state,
        chat,
    } = await loadTinaSave();
    const before =
        structuredClone(state);
    const result =
        migrateTimelineAppraisalLifecycleV4(
            state,
            chat,
        );

    assert.deepEqual(state, before);
    assert.equal(result.changed, false);
    assert.deepEqual(result.stats, {});
    assert.equal(
        result.state
            .timelineChronicleVersion,
        1,
    );
    assert.equal(
        result.state
            .eventKnowledgeVersion,
        2,
    );
    for (const field of [
        'timeline',
        'gossipPacks',
        'worldNews',
        'worldChangeLog',
    ]) {
        assert.equal(
            Object.hasOwn(
                result.state,
                field,
            ),
            false,
        );
    }
    assert.equal(
        result.state.socialGraph
            .relationshipEvidence
            .length,
        13,
    );
});

test('Revision 4 current-state validation is byte-idempotent', async () => {
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
                    /still contains removed fields/u,
                );
                assert.deepEqual(
                    state,
                    before,
                );
            },
        );
    }
});

test('Revision 4 rejects a reintroduced world-change payload atomically', async () => {
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

    state.sceneEnrichment ??= {};
    state.sceneEnrichment
        .worldChanges = {
            gossipUpdates: [{
                id: 'legacy_rumor',
            }],
        };
    const before =
        structuredClone(state);
    assert.throws(
        () =>
            migrateTimelineAppraisalLifecycleV4(
                state,
                chat,
            ),
        /still contains sceneEnrichment\.worldChanges/u,
    );
    assert.deepEqual(state, before);
});

test('production lifecycle does not recommit the completed Revision 4 cutover', async () => {
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
        false,
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
    assert.equal(saveCalls.length, 0);
    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        false,
    );
    assert.equal(saveCalls.length, 0);
});
