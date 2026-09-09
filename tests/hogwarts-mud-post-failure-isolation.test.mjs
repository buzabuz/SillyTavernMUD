/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    validatePerceptionContract,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import {
    settlePostTurnModelResult,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import {
    settlePostTurnResultFamilies,
} from '../src/hogwarts-mud/post-turn-result-settlement.js';
import {
    settlePostPlayerMovement,
    validatePostPlayerMovement,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement-post-settlement.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    createGuardedSavePorts,
} from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import {
    createSaveRevisionGuard,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';

const NARRATIVE =
    'The blanket lifted from the chair and dropped beside Hermione.';

function createPostResult(overrides = {}) {
    return {
        schemaVersion: 2,
        temporaryActors: [],
        firstImpressions: [],
        sceneProgression: null,
        pacingRealization: null,
        historicalClaims: [],
        materialEvents: [],
        actorUpdates: [],
        inventoryObservationRequired:
            false,
        perception: {
            version: 1,
            visualScope: 'room',
            audibleScope: 'room',
            salience: 'notable',
            attribution: 'ambiguous',
            concealment: 'none',
            directParticipantActorIds: [
                'hermione',
            ],
            evidenceText: NARRATIVE,
            confidence: 0.9,
            source: 'post_turn_observer',
        },
        temporalClaims: [],
        playerMovement: null,
        ...overrides,
    };
}

function createStorage() {
    const values = new Map();
    return {
        get length() {
            return values.size;
        },
        key(index) {
            return [
                ...values.keys(),
            ][index] ?? null;
        },
        getItem(key) {
            return values.get(key) ??
                null;
        },
        setItem(key, value) {
            values.set(
                key,
                String(value),
            );
        },
        removeItem(key) {
            values.delete(key);
        },
    };
}

test('family settlement discards malformed records without rejecting valid siblings', () => {
    const settled =
        settlePostTurnResultFamilies(
            createPostResult({
                materialEvents: [{
                    type: 'not_a_material_event',
                }],
                actorUpdates: [{
                    actorId: 'hermione',
                    currentActivityEn:
                        'Watching the blanket.',
                    presence: 'unchanged',
                    roomId: 'common_room',
                    evidenceText:
                        'beside Hermione',
                    confidence: 0.9,
                }],
            }),
        );

    assert.deepEqual(
        settled.result.materialEvents,
        [],
    );
    assert.equal(
        settled.result.actorUpdates.length,
        1,
    );
    assert.ok(
        settled.rejections.some(entry =>
            entry.family ===
                'materialEvents' &&
            entry.disposition ===
                'discard_record'),
    );
});

test('perception participant normalization removes player, duplicates and unknown IDs', async () => {
    const settled =
        await settlePostTurnModelResult(
            {
                playerAction:
                    'I stare at the blanket.',
                narrativeSegments: [{
                    type: 'narration',
                    actorId: '',
                    textEn: NARRATIVE,
                }],
                actors: [{
                    id: 'player',
                }, {
                    id: 'hermione',
                }],
            },
            createPostResult({
                perception: {
                    ...createPostResult()
                        .perception,
                    directParticipantActorIds: [
                        'player',
                        'hermione',
                        'unknown_actor',
                        'hermione',
                    ],
                },
            }),
        );

    assert.deepEqual(
        settled.result.perception
            .directParticipantActorIds,
        ['hermione'],
    );
    assert.equal(
        settled.diagnostics
            .perceptionParticipantIdsRemoved,
        3,
    );
});

test('invalid perception and temporal claims are omitted while root settlement succeeds', async () => {
    const settled =
        await settlePostTurnModelResult(
            {
                playerAction: 'I wait.',
                narrativeSegments: [{
                    type: 'narration',
                    actorId: '',
                    textEn: NARRATIVE,
                }],
                actors: [{
                    id: 'hermione',
                }],
            },
            createPostResult({
                perception: {
                    invalid: true,
                },
                temporalClaims: [{
                    kind: 'absolute_clock',
                    evidenceText: NARRATIVE,
                    clock: '29:99',
                    durationMinutes: 0,
                    relation: 'none',
                    confidence: 0.9,
                }],
            }),
        );

    assert.equal(
        settled.result.perception,
        null,
    );
    assert.deepEqual(
        settled.result.temporalClaims,
        [],
    );
    assert.equal(
        settled.diagnostics
            .temporalClaimsRejected,
        1,
    );
});

test('Low settlement isolates malformed Actor, Item, Identity and route families', async () => {
    const settled =
        await settlePostTurnModelResult(
            {
                playerAction: 'I wait.',
                narrativeSegments: [{
                    type: 'narration',
                    actorId: '',
                    textEn: NARRATIVE,
                }],
                actors: [{
                    id: 'player',
                }, {
                    id: 'hermione',
                    nameEn:
                        'Hermione Granger',
                }],
                itemCandidates: [],
                identityTargetActorIds: [
                    'hermione',
                ],
                inspectionTargetActorIds: [],
            },
            createPostResult({
                actorUpdates:
                    'not-an-array',
                inventoryObservationRequired:
                    'yes',
                inventoryUpdates: [{
                    invalid: true,
                }],
                identityObservations: [{
                    invalid: true,
                }],
            }),
        );

    assert.deepEqual(
        settled.result.actorUpdates,
        [],
    );
    assert.equal(
        settled.result
            .inventoryObservationRequired,
        false,
    );
    assert.deepEqual(
        settled.result.inventoryUpdates,
        [],
    );
    assert.deepEqual(
        settled.result.identityObservations,
        [],
    );
    assert.deepEqual(
        new Set(
            settled.diagnostics
                .familyRejections
                .map(entry =>
                    entry.family),
        ),
        new Set([
            'actorUpdates',
            'inventoryObservationRequired',
            'inventoryUpdates',
            'identityObservations',
        ]),
    );
});

test('every malformed family commits one valid sibling through real Reducer and guarded persistence', async () => {
    const material = {
        type: 'object_placed',
        actorId: 'player',
        objectTextEn: 'the blanket',
        sourceTextEn: '',
        targetTextEn:
            'beside Hermione',
        valueTextEn: '',
        previousValueTextEn: '',
        resultTextEn:
            'The blanket dropped beside Hermione.',
        quantity: 1,
        operation: 'add',
        slot: 'hands',
        hand: 'both',
        persistence:
            'until_changed',
        sourceKind: 'narrative',
        evidenceText: NARRATIVE,
        confidence: 0.95,
    };
    const base = {
        ...createPostResult(),
        materialEvents: [material],
        inventoryUpdates: [],
        identityObservations: [],
    };
    const cases = [
        [
            'materialEvents',
            {
                materialEvents: [
                    material,
                    { invalid: true },
                ],
            },
        ],
        [
            'actorUpdates',
            {
                actorUpdates: [{
                    invalid: true,
                }],
            },
        ],
        [
            'inventoryObservationRequired',
            {
                inventoryObservationRequired:
                    'yes',
            },
        ],
        [
            'perception',
            {
                perception: {
                    invalid: true,
                },
            },
        ],
        [
            'temporalClaims',
            {
                temporalClaims: [{
                    invalid: true,
                }],
            },
        ],
        [
            'inventoryUpdates',
            {
                inventoryUpdates: [{
                    invalid: true,
                }],
            },
        ],
        [
            'identityObservations',
            {
                identityObservations: [{
                    invalid: true,
                }],
            },
        ],
    ];

    for (
        const [
            family,
            malformed,
        ]
        of cases
    ) {
        const input = {
            playerAction:
                'I watch the blanket.',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn: NARRATIVE,
            }],
            actors: [{
                id: 'player',
                nameEn: 'Tina',
            }, {
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
            }],
            itemCandidates: [],
            identityTargetActorIds: [],
            inspectionTargetActorIds:
                [],
        };
        const settled =
            await settlePostTurnModelResult(
                input,
                {
                    ...structuredClone(base),
                    ...malformed,
                },
            );
        const state =
            createCurrentPlayingState();
        state.timelineEpoch =
            `family_${family}`;
        state.stateRevision = 0;
        state.revisionHistory = [];
        const transaction = {
            protocolVersion: 2,
            elapsedMinutes: 15,
            publicEventEn: NARRATIVE,
            segments: [{
                type: 'narration',
                textEn: NARRATIVE,
            }],
            actorPresence: {
                presentActorIdsAfterTurn:
                    (
                        state.actors ||
                        []
                    )
                        .filter(actor =>
                            actor.present !==
                            false)
                        .map(actor =>
                            actor.id),
            },
            actorUpdates: [],
            itemUpdates: [],
            itemOperations: [],
            itemCandidates: [],
            spellCandidates: [],
            identityObservations:
                settled.result
                    .identityObservations,
            materialEvents:
                settled.result
                    .materialEvents.map(
                        event => ({
                            ...event,
                            id: '',
                            mapId:
                                state.map
                                    .activeMapId,
                            roomId:
                                state.map
                                    .currentLocalNodeId,
                            sceneId:
                                state.scene.id,
                            sourceKinds: [
                                event
                                    .sourceKind,
                            ],
                            evidence: [{
                                text:
                                    event
                                        .evidenceText,
                                start: 0,
                                end:
                                    event
                                        .evidenceText
                                        .length,
                            }],
                        })),
            revealedClues: [],
        };
        const nextState =
            applyTurnTransaction(
                state,
                transaction,
                input.playerAction,
                {
                    sourceMessageId: 1,
                },
            );
        const context = {
            chatId:
                `family-${family}`,
            chatMetadata: {
                hogwartsMud:
                    structuredClone(state),
            },
            chat: [{
                is_user: true,
                mes:
                    input.playerAction,
                extra: {},
            }, {
                is_user: false,
                mes: NARRATIVE,
                extra: {},
            }],
            async saveMetadata() {
                return {
                    durable: true,
                };
            },
            async saveChat() {
                return {
                    durable: true,
                };
            },
        };
        const savePorts =
            createGuardedSavePorts({
                getContext:
                    () => context,
                guard:
                    createSaveRevisionGuard({
                        storage:
                            createStorage(),
                        lockManager: null,
                        createClaimId:
                            () =>
                                `claim_${family}`,
                        now:
                            () =>
                                '1991-09-01T08:00:00.000Z',
                    }),
            });
        await savePorts
            .registerSaveRevisionHead(
                context,
                {
                    persistMigration:
                        false,
                },
            );
        const currentChat =
            structuredClone(
                context.chat,
            );
        const nextChat =
            structuredClone(
                currentChat,
            );
        nextChat[1].extra
            .hogwartsMud = {
                turnTransaction:
                    transaction,
            };
        const committed =
            await savePorts
                .guardedRewriteTimeline({
                    currentState:
                        state,
                    nextState,
                    currentChat,
                    nextChat,
                    source:
                        'turn_post_commit',
                    changedDomains: [
                        'material_state',
                        'turn',
                    ],
                });

        assert.equal(
            committed.ok,
            true,
            family,
        );
        assert.equal(
            context.chatMetadata
                .hogwartsMud
                .turn.status,
            'idle',
            family,
        );
        assert.equal(
            context.chatMetadata
                .hogwartsMud
                .materialEventLog
                .length,
            1,
            family,
        );
        assert.equal(
            context.chat[1]
                .extra.hogwartsMud
                .turnTransaction
                .materialEvents
                .length,
            1,
            family,
        );
    }
});

test('browser Post adapter does not promote discarded perception or temporal claims to whole-Post failure', async () => {
    const raw = createPostResult({
        perception: {
            invalid: true,
        },
        temporalClaims: [{
            kind: 'absolute_clock',
            evidenceText: NARRATIVE,
            clock: '29:99',
            durationMinutes: 0,
            relation: 'none',
            confidence: 0.9,
        }],
        inventoryUpdates: [],
        identityObservations: [],
    });
    const adapter =
        createLocalSemanticAdapter({
            buildLocalMapModel:
                () => ({
                    nodes: [{
                        id: 'common_room',
                        nameEn:
                            'Common Room',
                    }],
                    exits: [],
                }),
            buildStructuredPlayerTurnSequence:
                () => [],
            getRequestHeaders:
                () => ({}),
            projectObservedInventoryUpdates:
                () => [],
            resolveRoleSlots:
                slots => slots,
            sendPostTurnSemanticRequest:
                async () => ({
                    content:
                        JSON.stringify(raw),
                }),
            fetchImpl:
                async (_url, options) => ({
                    ok: true,
                    json:
                        async () => {
                            const body =
                                JSON.parse(
                                    options.body,
                                );
                            return settlePostTurnModelResult(
                                body.input,
                                body.raw,
                            );
                        },
                }),
            validatePerceptionContract,
        });
    const result =
        await adapter
            .requestPostTurnSemanticObservation(
                {
                    clock:
                        '1991-09-04 · 19:30',
                    postTurnSemanticProvider:
                        'low',
                    modelSlots: {
                        low: {
                            profileId:
                                'low-profile',
                        },
                    },
                    map: {
                        activeMapId: 'castle',
                        currentLocalNodeId:
                            'common_room',
                    },
                    scene: {
                        id: 'evening',
                        mapId: 'castle',
                        roomId: 'common_room',
                    },
                    actors: [{
                        id: 'hermione',
                        nameEn:
                            'Hermione Granger',
                        present: true,
                        mapId: 'castle',
                        roomId:
                            'common_room',
                    }],
                    actorLibrary: [{
                        id: 'hermione',
                        nameEn:
                            'Hermione Granger',
                    }],
                    localPresence: {
                        occupantActorIds: [
                            'hermione',
                        ],
                    },
                    items: [],
                },
                'I stare at the blanket.',
                {
                    elapsedMinutes: 15,
                    segments: [{
                        type: 'narration',
                        textEn: NARRATIVE,
                    }],
                    actorPresence: {
                        presentActorIdsAfterTurn: [
                            'hermione',
                        ],
                    },
                    actorUpdates: [],
                },
            );

    assert.notEqual(
        result.postSettlementFailure,
        true,
    );
    assert.equal(result.perception, null);
    assert.deepEqual(
        result.temporalClaims,
        [],
    );
    assert.equal(
        result.temporalDiagnostics
            .rejected,
        1,
    );
});

test('Local unusable-root responses are classified as schema failures', async () => {
    const adapter =
        createLocalSemanticAdapter({
            buildLocalMapModel:
                () => ({
                    nodes: [],
                    exits: [],
                }),
            buildStructuredPlayerTurnSequence:
                () => [],
            getRequestHeaders:
                () => ({}),
            projectObservedInventoryUpdates:
                () => [],
            runLocalModelTask:
                async (_taskId, invoke) =>
                    invoke(),
            fetchImpl:
                async () => ({
                    ok: false,
                    status: 422,
                    text:
                        async () =>
                            'Post-turn semantic result rejected.',
                }),
            validatePerceptionContract,
        });
    const result =
        await adapter
            .requestPostTurnSemanticObservation(
                {
                    clock:
                        '1991-09-04 · 19:30',
                    postTurnSemanticProvider:
                        'local',
                    map: {
                        activeMapId: 'castle',
                        currentLocalNodeId:
                            'common_room',
                    },
                    scene: {
                        id: 'evening',
                        mapId: 'castle',
                        roomId: 'common_room',
                    },
                    actors: [],
                    actorLibrary: [],
                    items: [],
                },
                'I wait.',
                {
                    elapsedMinutes: 15,
                    segments: [{
                        type: 'narration',
                        textEn: NARRATIVE,
                    }],
                    actorPresence: {
                        presentActorIdsAfterTurn:
                            [],
                    },
                    actorUpdates: [],
                },
            );

    assert.equal(
        result.postSettlementFailure,
        true,
    );
    assert.equal(
        result.failureCode,
        'post_schema_failed',
    );
});

test('unusable Post roots remain blocking', () => {
    assert.throws(
        () =>
            settlePostTurnResultFamilies(
                'not json',
            ),
        /must be one JSON object/u,
    );
    assert.throws(
        () =>
            settlePostTurnResultFamilies({
                schemaVersion: 999,
            }),
        /unusable root envelope/u,
    );
});

function eligiblePreflight() {
    return {
        triggered: true,
        eligibility: 'eligible',
        mode: 'direct_room',
        candidateMapId: 'castle',
        candidateRoomId: 'tower',
        eligibleCompanionActorIds: [
            'hermione',
        ],
    };
}

test('movement discards unsolicited candidates and normalizes harmless extras', () => {
    const unsolicited =
        validatePostPlayerMovement(
            null,
            {
                outcome: 'moved',
            },
            [],
        );
    const noMove =
        validatePostPlayerMovement(
            eligiblePreflight(),
            {
                outcome: 'not_moved',
                destinationMapId: 'castle',
                destinationRoomId: 'tower',
                accompanyingActorIds: [
                    'unknown_actor',
                ],
                evidenceText: NARRATIVE,
            },
            [{
                textEn: NARRATIVE,
            }],
        );

    assert.equal(unsolicited.valid, true);
    assert.equal(
        unsolicited.value,
        null,
    );
    assert.equal(
        unsolicited.disposition,
        'discarded_unsolicited',
    );
    assert.equal(noMove.valid, true);
    assert.equal(
        noMove.disposition,
        'normalized_no_movement',
    );
    assert.deepEqual(
        noMove.value
            .accompanyingActorIds,
        [],
    );
    assert.equal(
        noMove.value.destinationRoomId,
        '',
    );
});

test('movement normalizes deterministic no-movement and blocks uncertain eligible movement', () => {
    const ineligible =
        validatePostPlayerMovement(
            {
                ...eligiblePreflight(),
                eligibility: 'ineligible',
                reasonCode:
                    'route_blocked',
            },
            null,
            [],
        );
    const missing =
        validatePostPlayerMovement(
            eligiblePreflight(),
            null,
            [],
        );

    assert.equal(ineligible.valid, true);
    assert.equal(
        ineligible.value.outcome,
        'not_moved',
    );
    assert.equal(
        ineligible.disposition,
        'normalized_no_movement',
    );
    assert.equal(missing.valid, false);
    assert.equal(
        missing.disposition,
        'blocking_uncertain',
    );
});

test('already-there preflight deterministically settles without changing movement State', () => {
    const state =
        createCurrentPlayingState();
    state.spatial ??= {};
    state.spatial.lastMovement = {
        id: 'previous_movement',
    };
    const before =
        structuredClone(state);
    const settled =
        settlePostPlayerMovement(
            state,
            {
                triggered: true,
                eligibility:
                    'already_there',
                reasonCode:
                    'already_there',
                mode: 'direct_room',
                fromMapId:
                    state.map.activeMapId,
                fromRoomId:
                    state.map
                        .currentLocalNodeId,
                candidateMapId:
                    state.map.activeMapId,
                candidateRoomId:
                    state.map
                        .currentLocalNodeId,
                eligibleCompanionActorIds:
                    [],
            },
            null,
            [],
        );

    assert.equal(settled.valid, true);
    assert.equal(
        settled.movementOutcome.status,
        'already_there',
    );
    assert.deepEqual(state, before);
});

test('deterministically ineligible movement commits a no-movement outcome without changing position', () => {
    const state =
        createCurrentPlayingState();
    const beforeMap =
        structuredClone(state.map);
    const settled =
        settlePostPlayerMovement(
            state,
            {
                triggered: true,
                eligibility: 'ineligible',
                reasonCode:
                    'route_blocked',
                mode: 'direct_room',
                fromMapId:
                    state.map.activeMapId,
                fromRoomId:
                    state.map
                        .currentLocalNodeId,
                candidateMapId:
                    state.map.activeMapId,
                candidateRoomId:
                    'locked_tower',
                candidateRoomNameEn:
                    'Locked Tower',
                eligibleCompanionActorIds:
                    [],
                markerEvidence:
                    'Go to the locked tower.',
            },
            null,
            [],
        );

    assert.equal(settled.valid, true);
    assert.equal(
        settled.movementOutcome.status,
        'failed',
    );
    assert.equal(
        settled.movementOutcome
            .reasonCode,
        'route_blocked',
    );
    assert.deepEqual(
        state.map,
        beforeMap,
    );
});

test('movement removes unknown companions but still requires a selected follow guide', () => {
    const direct =
        validatePostPlayerMovement(
            eligiblePreflight(),
            {
                outcome: 'moved',
                destinationMapId: 'castle',
                destinationRoomId: 'tower',
                accompanyingActorIds: [
                    'hermione',
                    'hermione',
                    'unknown_actor',
                ],
                evidenceText: NARRATIVE,
            },
            [{
                textEn: NARRATIVE,
            }],
        );
    const follow =
        validatePostPlayerMovement(
            {
                ...eligiblePreflight(),
                mode: 'follow_actor',
                guideActorId: 'hermione',
            },
            {
                outcome: 'moved',
                destinationMapId: 'castle',
                destinationRoomId: 'tower',
                accompanyingActorIds: [
                    'unknown_actor',
                ],
                evidenceText: NARRATIVE,
            },
            [{
                textEn: NARRATIVE,
            }],
        );

    assert.equal(direct.valid, true);
    assert.deepEqual(
        direct.value
            .accompanyingActorIds,
        ['hermione'],
    );
    assert.equal(follow.valid, false);
    assert.equal(
        follow.reasonCode,
        'movement_required_guide_missing',
    );
});

test('blocking eligible movement preserves clock, position, companions, Items and last movement', () => {
    const state =
        createCurrentPlayingState();
    state.spatial ??= {};
    state.spatial.lastMovement = {
        id: 'previous_movement',
    };
    state.items = [{
        id: 'book',
        holderId: 'player',
        location: {
            mapId:
                state.map.activeMapId,
            roomId:
                state.map
                    .currentLocalNodeId,
        },
    }];
    const before =
        structuredClone(state);
    const settled =
        settlePostPlayerMovement(
            state,
            eligiblePreflight(),
            {
                outcome: 'moved',
                destinationMapId:
                    'castle',
                destinationRoomId:
                    'wrong_tower',
                accompanyingActorIds: [
                    'hermione',
                ],
                evidenceText: NARRATIVE,
            },
            [{
                textEn: NARRATIVE,
            }],
        );

    assert.equal(settled.valid, false);
    assert.equal(
        settled.disposition,
        'blocking_uncertain',
    );
    assert.deepEqual(state, before);
});
