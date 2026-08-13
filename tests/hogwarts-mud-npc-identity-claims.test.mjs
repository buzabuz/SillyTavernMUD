/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    migrateLoadedSocialGraph,
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    buildSocialAudienceProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-projection.js';
import {
    applySocialDirectorResult,
    validateSocialDirectorResult,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-reducer.js';
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
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';

const IVY_ID = 'original_ivy';
const RON_ID =
    'canon_ronald_bilius_weasley';
const BROTHER_ID =
    'original_ivy_brother';

function createActor(
    id,
    identity = normalizeNpcIdentity(),
) {
    return normalizeActorCore({
        id,
        canonCatalogId: id,
        nameEn: id,
        aliases: [id],
        roleEn: 'Test actor',
        cast: {
            origin: 'foundation',
            introducedClock:
                '1991-09-02 · 11:00',
            introducedTurn: 1,
        },
        publicProfile: {
            descriptionEn:
                `Public profile for ${id}.`,
            backgroundEn: '',
        },
        performanceCore: {
            temperamentEn: 'Consistent.',
            speechStyleEn: 'Direct.',
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
    });
}

function createWorldState({
    includeBrother = false,
} = {}) {
    const actorLibrary = [
        createActor(
            IVY_ID,
            normalizeNpcIdentity({
                lineage: {
                    status:
                        'half_blood',
                    basis:
                        'user-confirmed authority',
                },
            }),
        ),
        createActor(RON_ID),
    ];
    if (includeBrother) {
        actorLibrary.push(
            createActor(
                BROTHER_ID,
            ),
        );
    }
    return {
        actorContextVersion,
        memoryReferenceVersion,
        actorDossierProjectionVersion,
        clock:
            '1991-09-02 · 11:30',
        turn: {
            count: 12,
        },
        actorLibrary,
        actors: [normalizeActorRuntime({
            id: IVY_ID,
            mapId: 'hogwarts',
            roomId: 'hall',
            present: true,
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
                byActorId:
                    Object.fromEntries(
                        actorLibrary.map(actor => [
                            actor.id,
                            {
                                firstImpressionRef:
                                    '',
                                core: [],
                                recent: [],
                                everyday: [],
                            },
                        ]),
                    ),
            }),
        memorySynapse:
            normalizeMemorySynapse(),
        localPresence: {
            actorIds: [IVY_ID],
        },
        castPolicy: {
            metActorIds: [IVY_ID],
            maxStoryActors: 8,
        },
        socialGraph:
            normalizeSocialGraph(),
    };
}

function createIdentityClaim({
    id,
    value,
    sourceKind = 'self',
    speakerId = IVY_ID,
    witnessedBy = ['player'],
    sourceMessageIds = [101],
} = {}) {
    return {
        id,
        subjectId: IVY_ID,
        fieldPath:
            'lineage.status',
        value,
        sourceKind,
        speakerId,
        sourceMessageIds,
        witnessedBy,
        clock:
            '1991-09-02 · 11:30',
    };
}

function createPersonReference({
    id = 'person_ref_ivy_brother',
    status = 'unresolved',
    actorId = '',
} = {}) {
    return {
        id,
        label:
            'Ivy\'s older brother',
        status,
        actorId,
    };
}

function createRelationshipClaim({
    id = 'relationship_claim_ivy_brother',
    targetRefId =
    'person_ref_ivy_brother',
    sourceKind = 'self',
    speakerId = IVY_ID,
    sourceMessageIds = [102],
    witnessedBy = ['player'],
} = {}) {
    return {
        id,
        subjectId: IVY_ID,
        relationshipKind:
            'sibling',
        targetRefId,
        sourceKind,
        speakerId,
        sourceMessageIds,
        witnessedBy,
        clock:
            '1991-09-02 · 11:31',
    };
}

function createResult(
    socialGraph,
    extras = {},
) {
    return {
        socialGraph,
        memoryReviews: [],
        acceptedStatementIds: [],
        acceptedEvidenceIds: [],
        ...extras,
    };
}

test('[defect-probing] Social Graph normalization retains claims and collapses imaginary aliases to nonexistent', () => {
    const graph =
        normalizeSocialGraph({
            identityClaims: [
                createIdentityClaim({
                    id: 'identity_self',
                    value:
                        'pure_blood',
                }),
            ],
            relationshipClaims: [
                createRelationshipClaim(),
            ],
            personReferences: [
                {
                    ...createPersonReference({
                        status:
                            'fabricated',
                    }),
                    nonexistenceReason:
                        'must not persist',
                },
                createPersonReference({
                    id:
                        'person_ref_imaginary',
                    status:
                        'imaginary',
                }),
            ],
        });

    assert.equal(
        graph.identityClaims.length,
        1,
    );
    assert.equal(
        graph.relationshipClaims
            .length,
        1,
    );
    assert.deepEqual(
        graph.personReferences,
        [
            {
                id:
                    'person_ref_ivy_brother',
                label:
                    'Ivy\'s older brother',
                status:
                    'nonexistent',
                actorId: '',
            },
            {
                id:
                    'person_ref_imaginary',
                label:
                    'Ivy\'s older brother',
                status:
                    'nonexistent',
                actorId: '',
            },
        ],
    );
});

test('identity claims allow only self or other, preserve conflicts, and never overwrite authority Identity', () => {
    const worldState =
        createWorldState();
    const graph =
        normalizeSocialGraph({
            identityClaims: [
                createIdentityClaim({
                    id:
                        'identity_self',
                    value:
                        'pure_blood',
                }),
                createIdentityClaim({
                    id:
                        'identity_other',
                    value:
                        'muggle_born',
                    sourceKind:
                        'other',
                    speakerId: RON_ID,
                    sourceMessageIds: [
                        103,
                    ],
                }),
            ],
        });
    const validation =
        validateSocialDirectorResult(
            createResult(graph, {
                acceptedIdentityClaimIds:
                    [
                        'identity_self',
                        'identity_other',
                    ],
            }),
            worldState,
            [101, 103],
        );

    assert.deepEqual(
        validation,
        {
            valid: true,
            errors: [],
        },
    );
    const committed =
        applySocialDirectorResult(
            worldState,
            createResult(graph, {
                acceptedIdentityClaimIds:
                    [
                        'identity_self',
                        'identity_other',
                    ],
            }),
            [101, 103],
        );
    assert.equal(
        committed.actorLibrary[0]
            .identity.lineage.status,
        'half_blood',
    );
    assert.deepEqual(
        committed.socialGraph
            .identityClaims
            .map(claim => claim.value),
        [
            'pure_blood',
            'muggle_born',
        ],
    );
    assert.deepEqual(
        buildSocialAudienceProjection(
            committed,
            'player',
        ).identityClaims
            .map(claim => claim.id),
        [
            'identity_self',
            'identity_other',
        ],
    );

    const authorityClaim = {
        ...createIdentityClaim({
            id:
                'identity_authority',
            value: 'pure_blood',
        }),
        sourceKind: 'authority',
        speakerId: 'authority',
    };
    assert.equal(
        validateSocialDirectorResult(
            createResult({
                ...graph,
                identityClaims: [
                    authorityClaim,
                ],
            }),
            worldState,
            [101],
        ).valid,
        false,
        'authority facts belong to actor.identity, never identityClaims',
    );
});

test('social director requires accepted claim evidence and cannot write authority or person resolution', () => {
    const worldState =
        createWorldState({
            includeBrother: true,
        });
    const unacceptedIdentity =
        normalizeSocialGraph({
            identityClaims: [
                createIdentityClaim({
                    id:
                        'identity_unaccepted',
                    value:
                        'pure_blood',
                }),
            ],
        });
    assert.equal(
        validateSocialDirectorResult(
            createResult(
                unacceptedIdentity,
            ),
            worldState,
            [101],
        ).valid,
        false,
    );

    const wrongMessageIdentity =
        normalizeSocialGraph({
            identityClaims: [
                createIdentityClaim({
                    id:
                        'identity_wrong_message',
                    value:
                        'pure_blood',
                    sourceMessageIds: [
                        999,
                    ],
                }),
            ],
        });
    assert.equal(
        validateSocialDirectorResult(
            createResult(
                wrongMessageIdentity,
                {
                    acceptedIdentityClaimIds:
                        [
                            'identity_wrong_message',
                        ],
                },
            ),
            worldState,
            [101],
        ).valid,
        false,
    );

    const forgedAuthority =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference({
                    status:
                        'resolved',
                    actorId:
                        BROTHER_ID,
                }),
            ],
            relationshipClaims: [
                createRelationshipClaim({
                    id:
                        'forged_authority',
                    sourceKind:
                        'authority',
                    speakerId:
                        'authority',
                    sourceMessageIds: [],
                }),
            ],
        });
    assert.equal(
        validateSocialDirectorResult(
            createResult(
                forgedAuthority,
                {
                    acceptedRelationshipClaimIds:
                        [
                            'forged_authority',
                        ],
                },
            ),
            worldState,
            [],
        ).valid,
        false,
    );
    assert.throws(
        () => applySocialDirectorResult(
            worldState,
            createResult(
                forgedAuthority,
                {
                    acceptedRelationshipClaimIds:
                        [
                            'forged_authority',
                        ],
                },
            ),
            [],
        ),
        /resolution|证据授权/u,
    );

    const directResolution =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference({
                    status:
                        'nonexistent',
                }),
            ],
        });
    assert.equal(
        validateSocialDirectorResult(
            createResult(
                directResolution,
            ),
            worldState,
            [],
        ).valid,
        false,
    );

    const resolvedWorld =
        createWorldState();
    resolvedWorld.socialGraph =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference({
                    status:
                        'nonexistent',
                }),
            ],
            relationshipClaims: [
                createRelationshipClaim(),
            ],
        });
    const overwrittenResolution =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference(),
            ],
            relationshipClaims: [
                createRelationshipClaim(),
            ],
        });
    assert.equal(
        validateSocialDirectorResult(
            createResult(
                overwrittenResolution,
            ),
            resolvedWorld,
            [],
        ).valid,
        false,
    );
});

test('an NPC claiming an unknown brother creates only a person reference and relationship claim', () => {
    const worldState =
        createWorldState();
    const before = {
        actorIds:
            worldState.actorLibrary
                .map(actor => actor.id),
        actors:
            structuredClone(
                worldState.actors,
            ),
        localPresence:
            structuredClone(
                worldState
                    .localPresence,
            ),
        castPolicy:
            structuredClone(
                worldState.castPolicy,
            ),
        actorMemoryIndex:
            structuredClone(
                worldState
                    .actorMemoryIndex,
            ),
    };
    const graph =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference(),
            ],
            relationshipClaims: [
                createRelationshipClaim(),
            ],
        });
    const committed =
        applySocialDirectorResult(
            worldState,
            createResult(graph, {
                acceptedRelationshipClaimIds:
                    [
                        'relationship_claim_ivy_brother',
                    ],
            }),
            [102],
        );
    const projection =
        buildSocialAudienceProjection(
            committed,
            'player',
        );

    assert.deepEqual(
        committed.actorLibrary
            .map(actor => actor.id),
        before.actorIds,
    );
    assert.deepEqual(
        committed.actors,
        before.actors,
    );
    assert.deepEqual(
        committed.localPresence,
        before.localPresence,
    );
    assert.deepEqual(
        committed.castPolicy,
        before.castPolicy,
    );
    assert.deepEqual(
        committed.actorMemoryIndex,
        before.actorMemoryIndex,
    );
    assert.equal(
        committed.socialGraph
            .relationships.length,
        0,
    );
    assert.equal(
        projection
            .personReferences.length,
        1,
    );
    assert.equal(
        projection
            .relationshipClaims.length,
        1,
    );
    assert.equal(
        projection.relationships
            .length,
        0,
    );
});

test('[defect-probing] only a resolved authority family claim forms a formal family edge', () => {
    const worldState =
        createWorldState({
            includeBrother: true,
        });
    const unsupportedGraph =
        normalizeSocialGraph({
            version: 2,
            relationshipEvidence: [{
                id:
                    'model_family_evidence',
                sourceActorId: IVY_ID,
                targetActorId:
                    BROTHER_ID,
                eventKind: 'other',
                dimensionDeltas: [],
                emotionAppraisals: [],
                structuralTags: [
                    'family',
                ],
                summaryEn:
                    'A model asserted family structure.',
                witnessedBy: [
                    'player',
                ],
                sourceMessageIds: [
                    104,
                ],
            }],
            relationships: [{
                id:
                    'unsupported_family_edge',
                sourceActorId: IVY_ID,
                targetActorId:
                    BROTHER_ID,
                structuralTags: [
                    'family',
                ],
                evidenceIds: [
                    'model_family_evidence',
                ],
            }],
        });
    const unsupported =
        applySocialDirectorResult(
            worldState,
            createResult(
                unsupportedGraph,
            ),
            [104],
        );
    assert.equal(
        unsupported.socialGraph
            .relationships[0]
            .structuralTags
            .includes('family'),
        false,
    );

    const unresolved =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference(),
            ],
            relationshipClaims: [
                createRelationshipClaim({
                    id:
                        'authority_unresolved',
                    sourceKind:
                        'authority',
                    speakerId:
                        'authority',
                    sourceMessageIds:
                        [],
                    witnessedBy: [],
                }),
            ],
        });
    assert.equal(
        unresolved.relationships.length,
        0,
    );

    const resolvedSelf =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference({
                    status:
                        'resolved',
                    actorId:
                        BROTHER_ID,
                }),
            ],
            relationshipClaims: [
                createRelationshipClaim({
                    id:
                        'self_resolved',
                }),
            ],
        });
    assert.equal(
        resolvedSelf.relationships.length,
        0,
    );

    const resolvedAuthorityGraph =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference({
                    status:
                        'resolved',
                    actorId:
                        BROTHER_ID,
                }),
            ],
            relationshipClaims: [
                createRelationshipClaim({
                    id:
                        'authority_resolved',
                    sourceKind:
                        'authority',
                    speakerId:
                        'authority',
                    sourceMessageIds: [],
                    witnessedBy: [
                        'player',
                    ],
                }),
            ],
        });
    const resolvedAuthority =
        resolvedAuthorityGraph;
    const familyEdge =
        resolvedAuthority
            .relationships[0];

    assert.ok(familyEdge);
    assert.equal(
        familyEdge.sourceActorId,
        IVY_ID,
    );
    assert.equal(
        familyEdge.targetActorId,
        BROTHER_ID,
    );
    assert.equal(
        familyEdge.structuralTags
            .includes('family'),
        true,
    );
    assert.deepEqual(
        familyEdge
            .relationshipClaimIds,
        ['authority_resolved'],
    );
});

test('nonexistent authority resolution stays hidden from witnesses of the original claim', () => {
    const worldState =
        createWorldState();
    worldState.socialGraph =
        normalizeSocialGraph({
            personReferences: [
                createPersonReference({
                    status:
                        'nonexistent',
                }),
            ],
            relationshipClaims: [
                createRelationshipClaim(),
            ],
        });
    const playerProjection =
        buildSocialAudienceProjection(
            worldState,
            'player',
        );
    const speakerProjection =
        buildSocialAudienceProjection(
            worldState,
            IVY_ID,
        );

    assert.equal(
        worldState.socialGraph
            .personReferences[0]
            .status,
        'nonexistent',
    );
    for (const projection of [
        playerProjection,
        speakerProjection,
    ]) {
        assert.deepEqual(
            projection
                .personReferences[0],
            {
                id:
                    'person_ref_ivy_brother',
                label:
                    'Ivy\'s older brother',
                status: 'unresolved',
                actorId: '',
            },
        );
    }
});

test('legacy statements migrate conservatively without losing text, evidence, or custom fields', () => {
    const familyStatement = {
        id: 'legacy_family_text',
        subjectId: IVY_ID,
        speakerId: IVY_ID,
        category: 'family',
        textEn:
            'Ivy says she has an older brother.',
        text:
            'Ivy 说她有一个哥哥。',
        witnessedBy: [
            'player',
        ],
        sourceMessageIds: [
            88,
        ],
        sceneId:
            'charms_classroom',
        customEvidence: {
            transcriptOffset: 12,
        },
    };
    const identityStatement = {
        id:
            'legacy_identity_structured',
        subjectId: IVY_ID,
        speakerId: IVY_ID,
        category: 'identity',
        textEn:
            'Ivy claims to be pure-blood.',
        witnessedBy: [
            'player',
        ],
        sourceMessageIds: [
            89,
        ],
        sceneId:
            'charms_classroom',
        identityClaim: {
            fieldPath:
                'lineage.status',
            value: 'pure_blood',
        },
    };
    const first =
        migrateLoadedSocialGraph(
            {
                version: 2,
                extractorVersion: 6,
                statements: [
                    familyStatement,
                    identityStatement,
                ],
                lastProcessedMessageId:
                    89,
            },
            {
                chatLength: 90,
                sceneId:
                    'charms_classroom',
            },
        );

    assert.deepEqual(
        first.graph.statements,
        [
            familyStatement,
            identityStatement,
        ],
    );
    assert.equal(
        first.graph
            .personReferences.length,
        0,
        'free text must not invent a brother entity or person reference',
    );
    assert.equal(
        first.graph
            .relationshipClaims
            .length,
        0,
    );
    assert.deepEqual(
        first.graph.identityClaims,
        [{
            id:
                'legacy_identity_structured:identity',
            subjectId: IVY_ID,
            fieldPath:
                'lineage.status',
            value: 'pure_blood',
            sourceKind: 'self',
            speakerId: IVY_ID,
            sourceMessageIds: [89],
            witnessedBy: [
                'player',
            ],
            clock: '',
        }],
    );

    const serialized =
        JSON.stringify(first.graph);
    const second =
        migrateLoadedSocialGraph(
            first.graph,
            {
                chatLength: 90,
                sceneId:
                    'charms_classroom',
            },
        );
    assert.equal(
        JSON.stringify(
            second.graph,
        ),
        serialized,
    );
});

test('legacy statements tolerate malformed witness lists without losing the statement', () => {
    const graph =
        normalizeSocialGraph({
            version: 2,
            statements: [{
                id:
                    'legacy_bad_witnesses',
                subjectId: IVY_ID,
                speakerId: IVY_ID,
                textEn:
                    'Ivy remembers a family story.',
                witnessedBy:
                    'player',
                sourceMessageIds: [
                    91,
                ],
            }],
        });

    assert.equal(
        graph.statements.length,
        1,
    );
    assert.deepEqual(
        graph.statements[0]
            .witnessedBy,
        [],
    );
});

test('claims-aware V2 loading does not promote raw family tags into authority claims', () => {
    const migration =
        migrateLoadedSocialGraph({
            version: 2,
            extractorVersion: 6,
            identityClaims: [],
            relationshipClaims: [],
            personReferences: [],
            relationshipEvidence: [],
            relationships: [{
                id:
                    'unsupported_v2_family',
                sourceActorId: IVY_ID,
                targetActorId:
                    BROTHER_ID,
                structuralTags: [
                    'family',
                ],
                evidenceIds: [],
            }],
            lastProcessedMessageId:
                -1,
        });

    assert.deepEqual(
        migration.graph
            .relationshipClaims,
        [],
    );
    assert.deepEqual(
        migration.graph
            .personReferences,
        [],
    );
    assert.equal(
        migration.graph
            .relationships[0]
            .structuralTags
            .includes('family'),
        false,
    );
});

test('legacy explicit family edges migrate to resolved authority claims without inventing actors', () => {
    const migration =
        migrateLoadedSocialGraph({
            version: 2,
            extractorVersion: 6,
            relationshipEvidence: [{
                id:
                    'legacy_family_evidence',
                sourceActorId: IVY_ID,
                targetActorId:
                    BROTHER_ID,
                type: 'family',
                sourceMessageIds: [
                    90,
                ],
                witnessedBy: [
                    'player',
                ],
            }],
            relationships: [{
                id:
                    'legacy_family_edge',
                sourceActorId: IVY_ID,
                targetActorId:
                    BROTHER_ID,
                structuralTags: [
                    'family',
                ],
                evidenceIds: [
                    'legacy_family_evidence',
                ],
            }],
            lastProcessedMessageId: 90,
        }, {
            chatLength: 91,
        });

    assert.deepEqual(
        migration.graph
            .personReferences,
        [{
            id:
                `legacy-person:${BROTHER_ID}`,
            label: BROTHER_ID,
            status: 'resolved',
            actorId: BROTHER_ID,
        }],
    );
    assert.equal(
        migration.graph
            .relationshipClaims[0]
            .sourceKind,
        'authority',
    );
    assert.equal(
        migration.graph
            .relationshipClaims[0]
            .relationshipKind,
        'family',
    );
    assert.equal(
        migration.graph
            .relationships[0]
            .structuralTags
            .includes('family'),
        true,
    );
});
