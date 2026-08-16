/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ACTOR_KNOWLEDGE_BOUNDARY_EN,
    sanitizeActorKnowledgeEn,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory.js';
import {
    migrateActorKnowledgeBoundaries,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    normalizeCausalCollapseState,
} from '../public/scripts/extensions/hogwarts-mud/domain/causal-state.js';
import {
    applyPacingAssessment,
    consumePacingBeat,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-reducer.js';
import {
    analyzePacingSignals,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-signals.js';
import {
    buildTemporaryActorPromotionPolicy,
    normalizePacingAssessmentPayload,
    validatePacingAssessment,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import {
    recoverImplicitTemporaryActorEntrances,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-authority.js';
import {
    validateScenePerformance,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import {
    createDirectorWorkflows,
} from '../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';

function keyState() {
    const state =
        createCurrentPlayingState();
    state.turn.count = 12;
    state.pacingDirector = {
        status: 'idle',
        lastAssessedTurn: null,
        lastAssessedSceneId: '',
        reassessAfterTurns: 6,
        assessment: null,
        pendingBeat: null,
    };
    state.causalCollapse =
        normalizeCausalCollapseState();
    state.items.push({
        id: 'brass_key',
        labelEn: 'Brass Key',
        importance: 'key',
    });
    return state;
}

test('pacing signals trigger on repeated core cast after an interaction', () => {
    const state = keyState();
    state.sceneArchive = [{
        id: 'previous_scene',
        actorIds: state.actors.map(actor =>
            actor.id),
    }];
    const result =
        analyzePacingSignals(
            state,
            'Continue talking.',
        );
    assert.equal(result.shouldAssess, false);
    assert.deepEqual(result.reasons, []);
});

test('repeated authority scenes force a near-age relationship introduction', () => {
    const state = keyState();
    state.sceneArchive = [
        {
            id: 'scene_one',
            actorIds: [
                'minerva_mcgonagall',
            ],
        },
        {
            id: 'scene_two',
            actorIds: [
                'minerva_mcgonagall',
            ],
        },
    ];
    const signals =
        analyzePacingSignals(
            state,
            'Continue the procedure.',
        );
    assert.equal(signals.shouldAssess, false);
    assert.equal(
        Object.hasOwn(
            signals.metrics,
            'forcePeerIntroduction',
        ),
        false,
    );
});

test('pacing signals respect pending beats and reassessment cooldown', () => {
    const state = keyState();
    assert.equal(
        analyzePacingSignals(
            state,
            'Inspect the Brass Key.',
        ).shouldAssess,
        true,
    );
    state.pacingDirector
        .lastAssessedTurn = 10;
    assert.equal(
        analyzePacingSignals(
            state,
            'Inspect the Brass Key.',
        ).shouldAssess,
        false,
    );
    state.pacingDirector
        .lastAssessedTurn = null;
    state.pacingDirector.pendingBeat = {
        status: 'pending',
    };
    assert.equal(
        analyzePacingSignals(
            state,
            'Inspect the Brass Key.',
        ).shouldAssess,
        false,
    );
});

test('causal collapse opportunities share pacing cooldown and bind one persistent aftermath per scene', () => {
    const state = keyState();
    const signals =
        analyzePacingSignals(
            state,
            'Inspect the Brass Key.',
        );
    assert.equal(signals.shouldAssess, true);
    const opportunity =
        signals.metrics
            .causalCollapseOpportunity;
    const payload =
        normalizePacingAssessmentPayload({
            decision: 'intervene',
            diagnosisEn:
                'The key has a recent material history with visible consequences.',
            reassessAfterTurns: 6,
            intervention: {
                kind:
                    'causal_collision',
                timing: 'this_turn',
                beatEn:
                    'Fresh wax clings to the key.',
                pressureEn:
                    'The new residue complicates immediate use.',
                arcId: '',
                causalCollapse: {
                    kind:
                        'material_history',
                    focusActorId: '',
                    relatedActorIds: [],
                    itemId:
                        'brass_key',
                    mapId:
                        opportunity.mapId,
                    roomId:
                        opportunity.roomId,
                    effectiveMinutesBeforeObservation:
                        20,
                    factEn:
                        'A clerk sealed the key shortly before Tina inspected it.',
                    edgeType: '',
                    visibleResiduesEn: [
                        'Fresh red wax covers the key teeth.',
                    ],
                    aftermathEn:
                        'Show the wax before anyone explains it.',
                    witnessAccounts: [],
                    sourceEventIds: [],
                    persistenceTargets: [
                        'event',
                        'item',
                    ],
                    surfaceMode:
                        'aftermath',
                    consequenceMode:
                        'mixed',
                    irreversible: false,
                    requiresHighTier:
                        false,
                },
            },
        });
    assert.deepEqual(
        validatePacingAssessment(
            payload,
            state,
            signals,
        ),
        {
            valid: true,
            errors: [],
        },
    );
    const committed =
        applyPacingAssessment(
            state,
            payload,
            signals,
        );
    assert.equal(
        committed.causalCollapse
            .records.length,
        1,
    );
    assert.equal(
        consumePacingBeat(
            committed,
        ).causalCollapse
            .records[0].status,
        'surfaced',
    );
});

test('pacing roster gaps stop auto-triggering when the current scene already has enough peers', () => {
    const result =
        analyzePacingSignals(
            keyState(),
            'Meet more students.',
        );
    assert.equal(result.shouldAssess, false);
    assert.equal(
        Object.hasOwn(
            result.metrics,
            'urgentPeerDeficit',
        ),
        false,
    );
});

test('pacing signals immediately route explicit stranger interaction to medium tier', () => {
    const result =
        analyzePacingSignals(
            keyState(),
            'I ask a random patron who they are.',
        );
    assert.equal(result.shouldAssess, false);
    assert.deepEqual(result.reasons, []);
});

test('supplied Canon candidates are promoted from actorEntrances to guestActor', () => {
    const state = keyState();
    const legacy =
        normalizePacingAssessmentPayload({
            decision: 'intervene',
            diagnosisEn:
                'The player asks for Ron.',
            reassessAfterTurns: 3,
            intervention: {
                kind: 'new_actor',
                timing: 'this_turn',
                beatEn:
                    'Ron enters.',
                pressureEn:
                    'Ron asks a question.',
                arcId: '',
                actorEntrances: [{
                    id:
                        'canon_ronald_bilius_weasley',
                    currentActivityEn:
                        'Standing nearby.',
                }],
            },
        });
    assert.equal(
        legacy.intervention
            .actorEntrances.length,
        1,
    );
    assert.equal(
        validatePacingAssessment(
            legacy,
            state,
        ).valid,
        false,
    );
});

test('canon actor knowledge boundaries discard catalog skills, future affiliations, and omniscience claims', () => {
    const hermione = {
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        canonCatalogId:
            'canon_hermione_jean_granger',
        knowledgeEn: [
            'Student',
            'House: Gryffindor',
            'Almost everything',
            'Hermione witnessed Tina break the train window.',
        ],
    };
    assert.deepEqual(
        sanitizeActorKnowledgeEn(
            hermione,
        ),
        [
            'Hermione witnessed Tina break the train window.',
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        ],
    );
    const state = keyState();
    delete state.actorContextVersion;
    state.actorKnowledgeVersion = 0;
    state.actorLibrary = [
        hermione,
    ];
    const migration =
        migrateActorKnowledgeBoundaries(
            state,
        );
    assert.equal(migration.changed, true);
    assert.equal(
        migration.state
            .actorLibrary[0]
            .knowledgeEn.includes(
                'Almost everything',
            ),
        false,
    );
});

test('pacing assessment commits and consumes a safe public guest beat', () => {
    const state = keyState();
    const legacy = {
        decision: 'intervene',
        diagnosisEn:
            'A guest could create pressure.',
        reassessAfterTurns: 3,
        intervention: {
            kind: 'new_actor',
            timing: 'this_turn',
            beatEn:
                'A guest enters.',
            pressureEn:
                'The guest asks a question.',
            arcId: '',
            actorEntrances: [],
            guestActor: {
                id: 'legacy_guest',
            },
        },
    };
    assert.equal(
        validatePacingAssessment(
            legacy,
            state,
        ).valid,
        false,
    );
});

test('temporary scene actors keep a stable identity and merge only after narrative evidence', () => {
    const legacy = {
        decision: 'intervene',
        diagnosisEn:
            'A temporary worker appears.',
        reassessAfterTurns: 6,
        intervention: {
            kind: 'minor_mishap',
            timing: 'this_turn',
            beatEn:
                'A worker arrives.',
            pressureEn:
                'The worker needs help.',
            arcId: '',
            temporaryActors: [{
                id: 'legacy_worker',
            }],
        },
    };
    assert.equal(
        validatePacingAssessment(
            legacy,
            keyState(),
        ).valid,
        false,
    );
});

test('temporary actor promotion policy separates selected interaction from crowd texture', () => {
    const policy =
        buildTemporaryActorPromotionPolicy(
            keyState(),
        );
    assert.equal(
        policy.mode,
        'promote_selected_anonymous_interaction',
    );
    assert.deepEqual(
        policy.requiredFields,
        [
            'id',
            'nameEn',
            'aliases',
            'roleEn',
            'publicProfile',
            'performanceCore',
            'privateFacts',
            'runtime',
            'initialRelationshipToPlayerEn',
            'firstImpressionOfPlayerEn',
        ],
    );
});

test('coherent orphan actor references recover into one temporary entrance', () => {
    const state = keyState();
    const temporaryId =
        'gryffindor_fifth_year_rhys';
    const payload = {
        protocolVersion: 1,
        publicEventEn:
            'Tina asks an older student his name.',
        eventEnded: false,
        actorPresence: {
            presentActorIdsAfterTurn: [
                ...state
                    .activeInteractionActorIds,
                temporaryId,
            ],
        },
        segments: [{
            type: 'dialogue',
            actorId: temporaryId,
            textEn: 'Rhys.',
        }],
        actorUpdates: [{
            id: temporaryId,
            present: true,
            currentActivityEn:
                'Answering Tina.',
        }],
        temporaryActorEntrances: [],
    };
    const recovered =
        recoverImplicitTemporaryActorEntrances(
            payload,
            state,
        );
    assert.equal(
        recovered
            .temporaryActorEntrances
            .length,
        1,
    );
    const validation =
        validateScenePerformance(
            recovered,
            state,
            {
                elapsedMinutes: 1,
            },
        );
    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join(
            '；',
        ),
        /Actor creation proposal/u,
    );
});

test('Pacing Director skips non-English authority after one model request', async () => {
    let calls = 0;
    const state = keyState();
    const signals =
        analyzePacingSignals(
            state,
            'Inspect the Brass Key.',
        );
    const opportunity =
        signals.metrics
            .causalCollapseOpportunity;
    const workflow =
        createDirectorWorkflows({
            extractRoleResponseText:
                response =>
                    response.content,
            normalizePacingAssessmentPayload,
            parseJsonObject:
                JSON.parse,
            sendPacingDirectorRequest:
                async () => {
                    calls++;
                    return {
                        content:
                            JSON.stringify({
                                decision:
                                    'intervene',
                                diagnosisEn:
                                    '当前场景无需介入。',
                                reassessAfterTurns:
                                    6,
                                intervention: {
                                    kind:
                                        'causal_collision',
                                    timing:
                                        'this_turn',
                                    beatEn:
                                        'Fresh wax clings to the key.',
                                    pressureEn:
                                        'The residue complicates immediate use.',
                                    arcId: '',
                                    causalCollapse: {
                                        kind:
                                            'material_history',
                                        focusActorId:
                                            '',
                                        relatedActorIds:
                                            [],
                                        itemId:
                                            'brass_key',
                                        mapId:
                                            opportunity
                                                .mapId,
                                        roomId:
                                            opportunity
                                                .roomId,
                                        effectiveMinutesBeforeObservation:
                                            20,
                                        factEn:
                                            'A clerk sealed the key shortly before Tina inspected it.',
                                        edgeType: '',
                                        visibleResiduesEn: [
                                            'Fresh red wax covers the key teeth.',
                                        ],
                                        aftermathEn:
                                            'Show the wax before anyone explains it.',
                                        witnessAccounts:
                                            [],
                                        sourceEventIds:
                                            [],
                                        persistenceTargets:
                                            [
                                                'event',
                                                'item',
                                            ],
                                        surfaceMode:
                                            'aftermath',
                                        consequenceMode:
                                            'mixed',
                                        irreversible:
                                            false,
                                        requiresHighTier:
                                            false,
                                    },
                                },
                            }),
                    };
                },
            validatePacingAssessment,
        });

    const result =
        await workflow
            .generatePacingAssessment(
                {},
                state,
                signals,
            );

    assert.equal(calls, 1);
    assert.equal(
        result.languageSkipped,
        true,
    );
    assert.equal(
        result.diagnostics.length,
        1,
    );
});

test('Pacing Director surfaces invalid JSON after one model request without repair', async () => {
    let calls = 0;
    const workflow =
        createDirectorWorkflows({
            extractRoleResponseText:
                response =>
                    response.content,
            normalizePacingAssessmentPayload,
            parseJsonObject:
                JSON.parse,
            sendPacingDirectorRequest:
                async () => {
                    calls++;
                    return {
                        content:
                            'not-json',
                    };
                },
            validatePacingAssessment,
        });

    await assert.rejects(
        workflow.generatePacingAssessment(
            {},
            keyState(),
            {
                reasons: [],
                metrics: {},
            },
        ),
        /Unexpected token|JSON/iu,
    );
    assert.equal(calls, 1);
});
