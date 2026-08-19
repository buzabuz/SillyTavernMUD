/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalSemanticAdapter,
} from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    migrateNpcIdentityObservations,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-observation-migration.js';
import {
    applyNpcIdentityObservations,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-observation.js';
import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
    normalizeActorCore,
    normalizeActorMemoryIndex,
    normalizeActorRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    normalizeMemorySynapse,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeNpcIdentity,
    validateNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    buildNpcIdentityDossierViewModel,
} from '../public/scripts/extensions/hogwarts-mud/ui/npc-identity-dossier.js';

const HERMIONE_ID =
    'canon_hermione_jean_granger';
const INSPECTION_ACTION =
    '@赫敏·格兰杰：“你刚刚上课有伤到吗？”*仔细观察赫敏有没有伤痕或受伤*';
const NEGATIVE_EVIDENCE =
    'Her bushy hair bristled as Tina inspected her face and neck for nonexistent spell damage.';

function identityState() {
    const identity =
        normalizeNpcIdentity({
            body: {
                hairColor: 'brown',
            },
        });
    return {
        actorContextVersion,
        memoryReferenceVersion,
        actorDossierProjectionVersion,
        clock:
            '1991-09-02 · 13:05',
        actorLibrary: [normalizeActorCore({
            id: HERMIONE_ID,
            canonCatalogId:
                HERMIONE_ID,
            nameEn:
                'Hermione Jean Granger',
            aliases: [
                'Hermione',
                '赫敏',
            ],
            roleEn: 'Student',
            publicProfile: {
                descriptionEn:
                    'A bushy-haired first-year student.',
                backgroundEn: '',
            },
            performanceCore: {
                temperamentEn:
                    'Analytical and conscientious.',
                speechStyleEn:
                    'Precise and emphatic.',
                motivesEn: [],
                socialStrategiesEn: [],
                boundariesEn: [],
                vulnerabilitiesEn: [],
            },
            identity,
            privateFacts: {
                secretEn: '',
                knowledgeEn: [],
            },
        })],
        actors: [normalizeActorRuntime({
            id: HERMIONE_ID,
            present: true,
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusSinceClock:
                '',
            currentActivityEn: '',
            currentIntentEn: '',
            currentGoalEn: '',
            temporary: false,
        })],
        actorMemoryIndex:
            normalizeActorMemoryIndex({
                byActorId: {
                    [HERMIONE_ID]: {
                        firstImpressionRef:
                            '',
                        core: [],
                        recent: [],
                        everyday: [],
                    },
                },
            }),
        memorySynapse:
            normalizeMemorySynapse(),
        localPresence: {
            occupantActorIds: [
                HERMIONE_ID,
            ],
        },
    };
}

function noVisibleInjuryObservation() {
    return {
        version: 1,
        actorId: HERMIONE_ID,
        kind:
            'injury_assessment',
        status:
            'no_visible_injury',
        injuryType: '',
        description: '',
        evidenceText:
            NEGATIVE_EVIDENCE,
        confidence: 0.95,
    };
}

test('direct negative injury observation records an assessment without inventing an injury', () => {
    const state =
        identityState();
    const first =
        applyNpcIdentityObservations(
            state,
            [
                noVisibleInjuryObservation(),
            ],
            {
                clock:
                    '1991-09-02 · 13:20',
                eventId:
                    'event_common_room',
                sourceMessageIds: [
                    206,
                    207,
                ],
            },
        );
    const authority =
        first.state
            .actorLibrary[0]
            .identity;

    assert.equal(
        first.changed,
        true,
    );
    assert.deepEqual(
        authority.body.injuries,
        [],
    );
    assert.deepEqual(
        authority.body
            .injuryAssessment,
        {
            status:
                'no_visible_injury',
            summary:
                NEGATIVE_EVIDENCE,
            asOfClock:
                '1991-09-02 · 13:20',
        },
    );
    assert.equal(
        Object.hasOwn(
            first.state.actors[0],
            'identity',
        ),
        false,
    );
    assert.equal(
        authority.provenance.records
            .some(record =>
                record.fieldPath ===
                    'body.injuryAssessment' &&
                record.sourceTier ===
                    'direct_observation'),
        true,
    );
    assert.deepEqual(
        validateNpcIdentity(
            authority,
        ),
        {
            valid: true,
            errors: [],
        },
    );

    const repeated =
        applyNpcIdentityObservations(
            first.state,
            [
                noVisibleInjuryObservation(),
            ],
            {
                clock:
                    '1991-09-02 · 13:20',
                eventId:
                    'event_common_room',
                sourceMessageIds: [
                    206,
                    207,
                ],
            },
        );
    assert.deepEqual(
        repeated.state,
        first.state,
    );
});

test('direct visible injury observation adds an active injury and observation provenance', () => {
    const evidence =
        'A fresh cut crossed Hermione’s right palm.';
    const result =
        applyNpcIdentityObservations(
            identityState(),
            [{
                version: 1,
                actorId:
                    HERMIONE_ID,
                kind:
                    'injury_assessment',
                status:
                    'visible_injury',
                injuryType: 'cut',
                description:
                    'Fresh cut across the right palm.',
                evidenceText:
                    evidence,
                confidence: 0.92,
            }],
            {
                clock:
                    '1991-09-02 · 13:20',
            },
        );
    const body =
        result.state
            .actorLibrary[0]
            .identity.body;

    assert.deepEqual(
        body.injuries[0],
        {
            type: 'cut',
            description:
                'Fresh cut across the right palm.',
            status: 'active',
            startedClock:
                '1991-09-02 · 13:20',
            resolvedClock: '',
        },
    );
    assert.equal(
        body.injuryAssessment.status,
        'visible_injury',
    );
});

test('dynamic Identity uses the structured perception target and preserves the endpoint result', async () => {
    const requests = [];
    const adapter =
        createLocalSemanticAdapter({
            getRequestHeaders:
                () => ({}),
            runLocalModelTask:
                async (
                    taskId,
                    invoke,
                    event,
                ) => {
                    assert.equal(
                        taskId,
                        'local_dynamic_identity_observer',
                    );
                    assert.equal(
                        event.eventType,
                        'turn.post_commit',
                    );
                    return invoke();
                },
            fetchImpl:
                async (
                    _url,
                    options,
                ) => {
                    requests.push(
                        JSON.parse(
                            options.body,
                        ),
                    );
                    return {
                        ok: true,
                        json:
                            async () => ({
                                result: {
                                    identityObservations: [
                                        noVisibleInjuryObservation(),
                                    ],
                                },
                                diagnostics: {
                                    routed: true,
                                    modelCalls: 1,
                                },
                            }),
                    };
                },
        });
    const result =
        await adapter
            .requestDynamicIdentityObservation(
                [{
                    type: 'narration',
                    textEn:
                        NEGATIVE_EVIDENCE,
                }],
                [{
                    id:
                        HERMIONE_ID,
                    nameEn:
                        'Hermione Granger',
                }],
                {
                    kind:
                        'perception',
                    target: {
                        actorId:
                            HERMIONE_ID,
                    },
                },
            );

    assert.deepEqual(
        result.identityObservations,
        [
            noVisibleInjuryObservation(),
        ],
    );
    assert.deepEqual(
        requests[0].input
            .identityTargetActorIds,
        [
            HERMIONE_ID,
        ],
    );
    assert.deepEqual(
        requests[0].input
            .inspectionTargetActorIds,
        [
            HERMIONE_ID,
        ],
    );
});

test('dynamic Identity makes no call or Regex inference without a structured target', async () => {
    let calls = 0;
    const adapter =
        createLocalSemanticAdapter({
            fetchImpl:
                async () => {
                    calls++;
                    throw new Error(
                        'must not call',
                    );
                },
        });
    const result =
        await adapter
            .requestDynamicIdentityObservation(
                [{
                    type: 'narration',
                    textEn:
                        NEGATIVE_EVIDENCE,
                }],
                [{
                    id:
                        HERMIONE_ID,
                    nameEn:
                        'Hermione Granger',
                }],
                null,
            );

    assert.equal(
        calls,
        0,
    );
    assert.deepEqual(
        result.identityObservations,
        [],
    );
    assert.equal(
        result.diagnostics
            .modelCalls,
        0,
    );
});

test('legacy committed inspection does not infer an observation from prose', () => {
    const state =
        identityState();
    delete state.actorContextVersion;
    const chat = [
        {
            is_user: true,
            mes:
                INSPECTION_ACTION,
        },
        {
            is_user: false,
            extra: {
                hogwartsMud: {
                    turnTransaction: {
                        committedClock:
                            '1991-09-02 · 13:20',
                        segments: [
                            {
                                type:
                                    'narration',
                                textEn:
                                    NEGATIVE_EVIDENCE,
                            },
                            {
                                type:
                                    'dialogue',
                                actorId:
                                    HERMIONE_ID,
                                textEn:
                                    'I am perfectly uninjured.',
                            },
                        ],
                        eventKnowledge: {
                            eventId:
                                'event_common_room',
                            sourceMessageIds: [
                                206,
                                207,
                            ],
                        },
                    },
                },
            },
        },
    ];
    const migrated =
        migrateNpcIdentityObservations(
            state,
            chat,
        );

    assert.equal(
        migrated.changed,
        true,
    );
    assert.equal(
        migrated.diagnostics
            .observationsReplayed,
        0,
    );
    assert.deepEqual(
        migrated.state
            .actorLibrary[0]
            .identity.body
            .injuryAssessment,
        {
            status: 'unknown',
            summary: '',
            asOfClock: '',
        },
    );
    assert.equal(
        migrateNpcIdentityObservations(
            migrated.state,
            chat,
        ).changed,
        false,
    );

    const dialogueOnly =
        structuredClone(chat);
    dialogueOnly[1]
        .extra.hogwartsMud
        .turnTransaction
        .segments =
    dialogueOnly[1]
        .extra.hogwartsMud
        .turnTransaction
        .segments
        .filter(segment =>
            segment.type ===
                'dialogue');
    assert.equal(
        migrateNpcIdentityObservations(
            state,
            dialogueOnly,
        ).diagnostics
            .observationsReplayed,
        0,
    );
});

test('dossier renders the negative assessment as field-level observation', () => {
    const state =
        applyNpcIdentityObservations(
            identityState(),
            [
                noVisibleInjuryObservation(),
            ],
            {
                clock:
                    '1991-09-02 · 13:20',
            },
        ).state;
    const viewModel =
        buildNpcIdentityDossierViewModel({
            worldState: state,
            actorId:
                HERMIONE_ID,
            buildIdentityProjection:
                (
                    worldState,
                    actorId,
                    observerId,
                ) => ({
                    authority:
                        observerId ===
                            'authority'
                            ? {
                                ...worldState
                                    .actorLibrary
                                    .find(actor =>
                                        actor.id ===
                                            actorId)
                                    .identity,
                                derived: {
                                    age: {
                                        years: null,
                                    },
                                },
                            }
                            : null,
                    claims: {
                        identityClaims:
                            [],
                        relationshipClaims:
                            [],
                        personReferences:
                            [],
                    },
                }),
        });
    const injury =
        viewModel.groups
            .find(group =>
                group.id === 'body')
            .entries
            .find(entry =>
                entry.label ===
                    '伤势');

    assert.equal(
        injury.value,
        '未观察到伤势',
    );
    assert.equal(
        injury.sourceKind,
        'observation',
    );
    assert.equal(
        injury.detail,
        '截至 1991-09-02 · 13:20',
    );
});
