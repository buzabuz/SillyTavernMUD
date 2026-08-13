/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    migrateActorContextV1,
    validateActorContextStateV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    admitCurrentLocationResidents,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-admission.js';
import {
    applyMemoryConsolidation,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-reducer.js';
import {
    applySceneTransition,
} from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import {
    applyWitnessedEventMemories,
} from '../public/scripts/extensions/hogwarts-mud/domain/event-memory.js';
import {
    applyDirectorFoundation,
    applyOpeningWorldPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    applyPacingAssessment,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-reducer.js';
import {
    applySocialDirectorResult,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-reducer.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    createLegacyTurnRollbackCheckpoint,
    restoreTurnRetryCheckpoint,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';
import {
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';

const CLOCK =
    '1991-09-02 · 16:20';

function legacyState() {
    return {
        phase: 'playing',
        clock: CLOCK,
        modelSlots: {},
        actorLibrary: [{
            id: 'harry',
            nameEn: 'Harry Potter',
            roleEn: 'Student',
            personalityEn:
                'Guarded, brave, and loyal.',
            speechStyleEn:
                'Direct and understated.',
            privateGoalEn:
                'Protect his friends.',
            impressionOfPlayerEn:
                'She can probably be trusted.',
            sharedMemories: {
                core: [],
                recent: [],
                everyday: [],
            },
        }],
        actors: [{
            id: 'harry',
            nameEn: 'Harry Potter',
            mapId: 'hogwarts_castle',
            roomId: 'great_hall',
            present: true,
            lifeStatus: 'alive',
            currentActivityEn:
                'Eating dinner.',
            currentIntentEn:
                'Speak with Tina.',
            temporary: false,
        }],
        eventKnowledge: [],
        socialGraph: {},
        sceneArchive: [],
        checks: [],
        timeline: [],
        turn: {
            count: 1,
            status: 'idle',
        },
        sceneTransition: {
            status: 'idle',
        },
        pacingDirector: {
            status: 'idle',
            reassessAfterTurns: 3,
        },
        memoryDirector: {
            status: 'idle',
            reviewAfterTurns: 10,
        },
        causalCollapse: {},
    };
}

function unchanged(state) {
    return {
        state,
        changed: false,
    };
}

function createLifecycle(
    state,
    overrides = {},
) {
    const context = {
        chat: [],
        chatMetadata: {
            hogwartsMud: state,
        },
    };
    return createLifecycleRuntime({
        createFallbackNextSceneIntent:
            () => null,
        getContext:
            () => context,
        getMudState:
            () =>
                context.chatMetadata
                    .hogwartsMud,
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
            () => {
                throw new Error(
                    'V1 lifecycle must not materialize Social Graph copies.',
                );
            },
        reconcileCanonActorDisplayNames:
            unchanged,
        reconcileTemporaryActorDisplayNames:
            unchanged,
        saveMetadataDebounced:
            () => {},
        validateNextSceneIntent:
            () => ({
                valid: true,
            }),
        ...overrides,
    });
}

test('lifecycle atomically cuts a loaded legacy world over to Actor Context V1', () => {
    const state = legacyState();
    const lifecycle =
        createLifecycle(state);

    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        true,
    );
    assert.equal(
        validateActorContextStateV1(
            state,
        ).valid,
        true,
    );
    assert.equal(
        Object.hasOwn(
            state.actorLibrary[0],
            'impressionOfPlayerEn',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            state.actors[0],
            'nameEn',
        ),
        false,
    );
});

test('lifecycle failure leaves the caller State byte-for-byte unchanged', () => {
    const state = legacyState();
    const before =
        JSON.stringify(state);
    let saveRequests = 0;
    const lifecycle =
        createLifecycle(
            state,
            {
                normalizeModelSlots:
                    () => ({
                        changedBeforeFailure:
                            true,
                    }),
                migrateLoadedSocialGraph:
                    () => {
                        throw new Error(
                            'post-cutover failure',
                        );
                    },
                saveMetadataDebounced:
                    () => {
                        saveRequests += 1;
                    },
            },
        );

    assert.throws(
        () =>
            lifecycle
                .ensureSceneLifecycleState(
                    state,
                ),
        /post-cutover failure/u,
    );
    assert.equal(
        JSON.stringify(state),
        before,
    );
    assert.equal(
        saveRequests,
        0,
    );
});

test('valid V1 lifecycle never runs legacy actor migrations or copy projectors', () => {
    const state =
        migrateActorContextV1(
            legacyState(),
        ).state;
    const legacyActorPath =
        () => {
            throw new Error(
                'legacy actor path called',
            );
        };
    const lifecycle =
        createLifecycle(
            state,
            {
                migrateActorKnowledgeBoundaries:
                    legacyActorPath,
                migrateActorPresentationState:
                    legacyActorPath,
                migrateNpcIdentityObservations:
                    legacyActorPath,
                migrateNpcIdentityState:
                    legacyActorPath,
                migrateRelationshipMemoryState:
                    legacyActorPath,
                projectActorSocialRelationships:
                    legacyActorPath,
                reconcileCanonActorDisplayNames:
                    legacyActorPath,
                reconcileTemporaryActorDisplayNames:
                    legacyActorPath,
            },
        );

    assert.doesNotThrow(() =>
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ));
    assert.equal(
        validateActorContextStateV1(
            state,
        ).valid,
        true,
    );
});

test('production actor writers contain no legacy copy writes', () => {
    const writers = [
        applyOpeningWorldPackage,
        applyDirectorFoundation,
        applyTurnTransaction,
        applySceneTransition,
        createLegacyTurnRollbackCheckpoint,
        restoreTurnRetryCheckpoint,
        admitCurrentLocationResidents,
        applyPacingAssessment,
        applyMemoryConsolidation,
        applyWitnessedEventMemories,
        applySocialDirectorResult,
    ];
    const legacyWriter =
        /(?:\.(?:sharedMemories|impressionOfPlayerEn|firstImpressionOfPlayerEn|socialStatements|socialRelationships)\s*=|(?:^|[,{]\s*)(?:sharedMemories|impressionOfPlayerEn|firstImpressionOfPlayerEn|socialStatements|socialRelationships)\s*:|(?:upsertSharedMemory|normalizeActorMemoryProfile|projectActorSocialRelationships)\s*\()/mu;

    for (const writer of writers) {
        assert.doesNotMatch(
            writer.toString(),
            legacyWriter,
            `${writer.name} still writes a legacy actor copy`,
        );
    }
});
