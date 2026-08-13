/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    migrateActorContextV1,
    validateActorContextStateV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';
import {
    addActorMemoryRefV1,
    recordActorAppraisalV1,
    updateActorRuntimeV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-runtime.js';

const CLOCK =
    '1991-09-02 · 16:20';

function legacyState() {
    return {
        clock: CLOCK,
        untouched: {
            value: 7,
        },
        actorLibrary: [{
            id: 'canon_harry_james_potter',
            canonCatalogId:
                'canon_harry_james_potter',
            nameEn: 'Harry Potter',
            aliases: ['Harry'],
            roleEn: 'Student',
            publicDescriptionEn:
                'A slight boy with round glasses.',
            publicBackgroundEn:
                'A first-year Gryffindor.',
            personalityEn:
                'Guarded, brave, and loyal.',
            speechStyleEn:
                'Direct and understated.',
            privateGoalEn:
                'Protect his friends.',
            fearEn:
                'Losing his friends.',
            secretEn: 'The scar sometimes hurts.',
            knowledgeEn: ['The troll was real.'],
            identity:
                normalizeNpcIdentity({}),
            firstImpressionOfPlayerEn:
                'She stayed calm under pressure.',
            impressionOfPlayerEn:
                'She can probably be trusted.',
            socialStatements: [{
                text: 'legacy social copy',
            }],
            socialRelationships: [{
                targetId: 'player',
            }],
            sharedMemories: {
                core: [{
                    id: 'memory_troll',
                    eventId: 'event_troll',
                    summaryEn:
                        'A duplicate Event summary.',
                    firstClock: CLOCK,
                }],
                recent: [{
                    id: 'memory_quill',
                    summaryEn:
                        'She repaired the broken quill.',
                    lastClock: CLOCK,
                }],
                everyday: [],
            },
        }],
        actors: [{
            id: 'canon_harry_james_potter',
            nameEn: 'Harry Potter',
            identity:
                normalizeNpcIdentity({}),
            mapId: 'hogwarts_castle',
            roomId: 'great_hall',
            present: true,
            lifeStatus: 'alive',
            currentActivityEn: 'Eating dinner.',
            currentIntentEn: 'Speak with Tina.',
            currentGoalEn: 'Ask about the quill.',
            temporary: false,
            impressionOfPlayerEn:
                'She can probably be trusted.',
        }],
        eventKnowledge: [{
            eventId: 'event_troll',
            summaryEn:
                'Harry and Tina escaped the troll.',
        }],
    };
}

test('cutover emits exact V1 records and removes all legacy actor copies', () => {
    const input = legacyState();
    const before =
        structuredClone(input);
    const result =
        migrateActorContextV1(input);

    assert.deepEqual(input, before);
    assert.equal(result.changed, true);
    assert.deepEqual(
        Object.keys(result.state.actorLibrary[0]),
        [
            'id',
            'canonCatalogId',
            'nameEn',
            'aliases',
            'roleEn',
            'cast',
            'publicProfile',
            'performanceCore',
            'identity',
            'privateFacts',
        ],
    );
    assert.deepEqual(
        Object.keys(result.state.actors[0]),
        [
            'id',
            'mapId',
            'roomId',
            'present',
            'lifeStatus',
            'lifeStatusPermanent',
            'lifeStatusDetailEn',
            'lifeStatusSinceClock',
            'currentActivityEn',
            'currentIntentEn',
            'currentGoalEn',
            'temporary',
        ],
    );
    assert.equal(
        Object.hasOwn(
            result.state,
            'sharedMemories',
        ),
        false,
    );
    assert.equal(
        JSON.stringify(result.state)
            .includes(
                'legacy social copy',
            ),
        false,
    );
    assert.deepEqual(
        result.state.untouched,
        input.untouched,
    );
    assert.equal(
        validateActorContextStateV1(
            result.state,
        ).valid,
        true,
    );
});

test('cutover uses Event refs and denies historical claims for text-only memories', () => {
    const { state } =
        migrateActorContextV1(
            legacyState(),
        );
    const memory =
        state.actorMemoryIndex
            .byActorId
            .canon_harry_james_potter;

    assert.deepEqual(memory.core, [{
        recordType: 'event',
        recordId: 'event_troll',
        addedClock: CLOCK,
    }]);
    assert.equal(
        memory.recent.some(reference =>
            reference.recordType ===
                'appraisal'),
        true,
    );
    const migrated =
        state.memorySynapse.appraisals
            .filter(appraisal =>
                appraisal.contextTags
                    .some(tag =>
                        tag.startsWith(
                            'migrated_',
                        )));
    assert.ok(migrated.length >= 3);
    assert.ok(migrated.every(appraisal =>
        appraisal.historicalClaimAllowed ===
            false &&
        appraisal.sourceEventIds.length ===
            0));
    assert.equal(
        JSON.stringify(
            state.actorMemoryIndex,
        ).includes(
            'She repaired the broken quill.',
        ),
        false,
    );
});

test('cutover is idempotent for valid V1 state', () => {
    const first =
        migrateActorContextV1(
            legacyState(),
        );
    const second =
        migrateActorContextV1(
            first.state,
        );

    assert.equal(second.changed, false);
    assert.deepEqual(
        second.state,
        first.state,
    );
    assert.notEqual(
        second.state,
        first.state,
    );
});

test('cutover failure leaves the input unchanged', () => {
    const input = legacyState();
    input.actorLibrary[0]
        .sharedMemories.recent
        .push({
            id: 'unconvertible',
        });
    const before =
        structuredClone(input);

    assert.throws(
        () =>
            migrateActorContextV1(input),
        /cannot be converted/u,
    );
    assert.deepEqual(input, before);
});

function tinaAuditState() {
    const identity =
        normalizeNpcIdentity({});
    return {
        clock: CLOCK,
        actorLibrary: [{
            id:
                'canon_harry_james_potter',
            canonCatalogId:
                'canon_harry_james_potter',
            nameEn: 'Harry Potter',
            aliases: ['Harry'],
            roleEn: 'Student',
            publicDescriptionEn:
                'A slight boy with round glasses and a lightning-shaped scar.',
            publicBackgroundEn:
                'A first-year Gryffindor student.',
            personalityEn:
                'Guarded, brave, and loyal.',
            speechStyleEn:
                'Age-appropriate speech consistent with established Canon characterization.',
            privateGoalEn:
                'Complete the committed public scene beat.',
            identity,
        }, {
            id:
                'canon_hermione_jean_granger',
            canonCatalogId:
                'canon_hermione_jean_granger',
            nameEn:
                'Hermione Jean Granger',
            aliases: ['Hermione'],
            roleEn: 'Student',
            publicDescriptionEn:
                'A first-year girl with bushy brown hair.',
            publicBackgroundEn:
                'A Muggle-born Gryffindor student.',
            personalityEn:
                'Brilliant, exacting, and deeply conscientious.',
            speechStyleEn:
                'Precise, quick, and inclined to explain.',
            privateGoalEn:
                'Complete the committed public scene beat.',
            identity,
        }],
        actors: [{
            id:
                'canon_harry_james_potter',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
            present: true,
            lifeStatus: 'alive',
            currentActivityEn:
                'Eating dinner.',
            currentIntentEn:
                'Listen to Tina.',
            privateGoalEn:
                'Complete the committed public scene beat.',
            temporary: false,
        }, {
            id:
                'canon_hermione_jean_granger',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
            present: true,
            lifeStatus: 'alive',
            currentActivityEn:
                'Reading the notice board.',
            currentIntentEn:
                'Correct a timetable error.',
            currentGoalEn:
                'Complete the committed public scene beat.',
            temporary: false,
        }],
        eventKnowledge: [],
    };
}

function playerVisibleActorFacts(
    state,
) {
    return Object.fromEntries(
        state.actorLibrary.map(actor => [
            actor.id,
            {
                nameEn:
                    actor.nameEn,
                roleEn:
                    actor.roleEn,
                descriptionEn:
                    actor.publicProfile
                        ?.descriptionEn ??
                    actor.publicDescriptionEn,
                backgroundEn:
                    actor.publicProfile
                        ?.backgroundEn ??
                    actor.publicBackgroundEn,
                identity:
                    actor.identity,
            },
        ]),
    );
}

test('Tina audit cutover fills canonical performance cores without changing player-visible facts', () => {
    const input =
        tinaAuditState();
    const visibleBefore =
        playerVisibleActorFacts(input);
    const { state } =
        migrateActorContextV1(input);

    assert.deepEqual(
        playerVisibleActorFacts(state),
        visibleBefore,
    );
    for (const actorId of [
        'canon_harry_james_potter',
        'canon_hermione_jean_granger',
    ]) {
        const core =
            state.actorLibrary.find(
                actor =>
                    actor.id ===
                    actorId,
            ).performanceCore;
        assert.ok(core.temperamentEn);
        assert.ok(core.speechStyleEn);
        assert.notEqual(
            core.speechStyleEn,
            'Age-appropriate speech consistent with established Canon characterization.',
        );
        assert.ok(core.motivesEn.length);
        assert.ok(
            core.socialStrategiesEn
                .length,
        );
        assert.ok(core.boundariesEn.length);
    }
    assert.equal(
        state.actors.every(actor =>
            actor.currentGoalEn !==
            'Complete the committed public scene beat.'),
        true,
    );
});

function lifecyclePorts(
    state,
    overrides = {},
) {
    const unchanged =
        value => ({
            state: value,
            changed: false,
        });
    return {
        createFallbackNextSceneIntent:
            () => null,
        getContext:
            () => ({
                chat: [],
                chatMetadata: {
                    hogwartsMud:
                        state,
                },
            }),
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
    };
}

function lifecycleState() {
    return {
        ...legacyState(),
        modelSlots: {},
        socialGraph: {},
        sceneArchive: [],
        checks: [],
        turn: {
            count: 0,
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

test('lifecycle performs the Actor Context cutover once and only exposes V1 afterwards', () => {
    const state =
        lifecycleState();
    const lifecycle =
        createLifecycleRuntime(
            lifecyclePorts(state),
        );

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
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        false,
    );
});

test('lifecycle cutover failure leaves the original State byte-equivalent', () => {
    const state =
        lifecycleState();
    state.actorLibrary[0]
        .sharedMemories.recent
        .push({
            id: 'unconvertible',
        });
    const before =
        JSON.stringify(state);
    const lifecycle =
        createLifecycleRuntime(
            lifecyclePorts(state),
        );

    assert.throws(
        () =>
            lifecycle
                .ensureSceneLifecycleState(
                    state,
                ),
        /cannot be converted/u,
    );
    assert.equal(
        JSON.stringify(state),
        before,
    );
});

test('V1 actor mutations keep runtime exact and persist memory only through Appraisal/ref', () => {
    const { state } =
        migrateActorContextV1(
            legacyState(),
        );
    const actorId =
        'canon_harry_james_potter';

    updateActorRuntimeV1(
        state,
        actorId,
        {
            currentActivityEn:
                'Watching the doorway.',
            identity: {
                forbidden: true,
            },
            impressionOfPlayerEn:
                'Forbidden runtime copy.',
        },
    );
    const appraisalId =
        recordActorAppraisalV1(
            state,
            {
                actorId,
                summaryEn:
                    'Tina notices danger before others do.',
                kind:
                    'turn_impression',
                tier: 'recent',
            },
        );
    addActorMemoryRefV1(
        state,
        actorId,
        'everyday',
        {
            recordType: 'event',
            recordId: 'event_troll',
            addedClock: CLOCK,
        },
    );

    assert.deepEqual(
        Object.keys(
            state.actors[0],
        ),
        [
            'id',
            'mapId',
            'roomId',
            'present',
            'lifeStatus',
            'lifeStatusPermanent',
            'lifeStatusDetailEn',
            'lifeStatusSinceClock',
            'currentActivityEn',
            'currentIntentEn',
            'currentGoalEn',
            'temporary',
        ],
    );
    assert.equal(
        state.memorySynapse
            .appraisals
            .some(appraisal =>
                appraisal.id ===
                    appraisalId),
        true,
    );
    assert.equal(
        validateActorContextStateV1(
            state,
        ).valid,
        true,
    );
});

test('all production Actor Context writers are wired to the V1 mutation boundary', async () => {
    const writerFiles = [
        'initial-world.js',
        'turn-reducer.js',
        'archive-projection.js',
        'turn-rollback.js',
        'actor-admission.js',
        'pacing-reducer.js',
        'actor-memory-reducer.js',
        'event-memory.js',
        'social-reducer.js',
    ];
    for (const fileName of writerFiles) {
        const source =
            await readFile(
                new URL(
                    `../public/scripts/extensions/hogwarts-mud/domain/${fileName}`,
                    import.meta.url,
                ),
                'utf8',
            );
        assert.match(
            source,
            /from ['"]\.\/actor-context-runtime\.js['"]/u,
            `${fileName} must use the V1 Actor Context mutation boundary.`,
        );
    }
});
