/* eslint-disable playwright/expect-expect */
import {
    findCanonCharacter,
} from '../public/scripts/extensions/hogwarts-mud/canon-characters.js';
import {
    buildActorContinuityCapsules,
    buildActorKnowledgeCapsules,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    buildSocialAudienceProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-projection.js';
import {
    SOCIAL_RELATIONSHIP_DIMENSIONS,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    buildPlayerKnownRelationshipProjection,
    FILTERED_RELATIONSHIP_EDGE_OPACITY,
    filterRelationshipGraphProjection,
    getRelationshipGraphStyles,
} from '../public/scripts/extensions/hogwarts-mud/relationship-graph.js';
import {
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';
import cytoscape from 'cytoscape';
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

test('social audience projections preserve source knowledge without leaking hidden evidence through edge totals', () => {
    const ron =
        'canon_ronald_bilius_weasley';
    const hermione =
        'canon_hermione_jean_granger';
    const mcgonagall =
        'minerva_mcgonagall';
    const state = {
        character: {
            identity: {
                name: 'Tina Zhang',
            },
        },
        actorLibrary: [
            {
                id: ron,
                nameEn: 'Ron Weasley',
                cast: {
                    origin:
                        'canon_catalog',
                    introducedClock:
                        '1991-09-01 · 13:00',
                    introducedTurn: 1,
                },
            },
            {
                id: hermione,
                nameEn:
                    'Hermione Granger',
                cast: {
                    origin:
                        'canon_catalog',
                    introducedClock:
                        '1991-09-01 · 13:00',
                    introducedTurn: 1,
                },
            },
            {
                id: mcgonagall,
                nameEn:
                    'Minerva McGonagall',
                cast: {
                    origin: 'foundation',
                    introducedClock:
                        '1991-09-01 · 13:00',
                    introducedTurn: 1,
                },
            },
        ],
        actors: [],
        socialGraph: {
            version: 2,
            statements: [
                {
                    id: 'ron_private_claim',
                    subjectId: ron,
                    speakerId: ron,
                    textEn:
                        'Ron privately formed this claim.',
                    witnessedBy: [],
                },
                {
                    id: 'ron_public_claim',
                    subjectId: ron,
                    speakerId: ron,
                    textEn:
                        'Ron told Tina this claim.',
                    witnessedBy: [
                        'player',
                    ],
                },
            ],
            relationshipEvidence: [
                {
                    id:
                        'ron_player_visible',
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    eventKind: 'support',
                    summaryEn:
                        'Tina saw Ron offer practical support.',
                    witnessedBy: [
                        'player',
                    ],
                    sourceMessageIds: [
                        10,
                    ],
                    turn: 10,
                    dimensionDeltas: [
                        {
                            dimension:
                                'trust',
                            delta: 5,
                            impact:
                                'meaningful',
                            appliedDelta: 5,
                        },
                        {
                            dimension:
                                'closeness',
                            delta: 4,
                            impact:
                                'meaningful',
                            appliedDelta: 4,
                        },
                        {
                            dimension:
                                'warmth',
                            delta: 2,
                            impact: 'minor',
                            appliedDelta: 2,
                        },
                    ],
                    structuralTags: [
                        'classmate',
                    ],
                    emotionAppraisals: [{
                        emotion:
                            'gratitude',
                        intensity: 3,
                        sourceMessageIds: [
                            10,
                        ],
                    }],
                },
                {
                    id:
                        'ron_player_hidden',
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    eventKind:
                        'private_reflection',
                    summaryEn:
                        'Ron privately revised his opinion.',
                    witnessedBy: [
                        hermione,
                    ],
                    sourceMessageIds: [
                        11,
                    ],
                    turn: 11,
                    dimensionDeltas: [
                        {
                            dimension:
                                'trust',
                            delta: 8,
                            impact: 'major',
                        },
                        {
                            dimension:
                                'closeness',
                            delta: 8,
                            impact: 'major',
                            appliedDelta: 8,
                        },
                        {
                            dimension:
                                'warmth',
                            delta: 4,
                            impact:
                                'meaningful',
                            appliedDelta: 4,
                        },
                    ],
                    structuralTags: [
                        'rivalry',
                    ],
                    emotionAppraisals: [{
                        emotion: 'anger',
                        intensity: 4,
                        sourceMessageIds: [
                            11,
                        ],
                    }],
                },
                {
                    id:
                        'mcgonagall_player_hidden',
                    sourceActorId:
                        mcgonagall,
                    targetActorId:
                        'player',
                    eventKind:
                        'private_judgment',
                    summaryEn:
                        'McGonagall formed an unwitnessed judgment.',
                    witnessedBy: [ron],
                    sourceMessageIds: [
                        12,
                    ],
                    turn: 12,
                    dimensionDeltas: [{
                        dimension: 'trust',
                        delta: -6,
                        impact:
                            'meaningful',
                        appliedDelta: -6,
                    }],
                    emotionAppraisals: [],
                },
            ],
            relationships: [
                {
                    id: 'ron_player',
                    sourceActorId: ron,
                    targetActorId:
                        'player',
                    familiarity: 30,
                    closeness: 12,
                    warmth: 6,
                    trust: 13,
                    respect: 0,
                    influence: 0,
                    tension: 0,
                    resentment: 0,
                    fear: 0,
                    protectiveness: 0,
                    structuralTags: [
                        'classmate',
                        'rivalry',
                    ],
                    activeEmotions: [
                        {
                            emotion:
                                'gratitude',
                            intensity: 3,
                            sourceEvidenceId:
                                'ron_player_visible',
                            witnessedBy: [
                                'player',
                            ],
                        },
                        {
                            emotion: 'anger',
                            intensity: 4,
                            sourceEvidenceId:
                                'ron_player_hidden',
                            witnessedBy: [
                                hermione,
                            ],
                        },
                    ],
                    evidenceIds: [
                        'ron_player_visible',
                        'ron_player_hidden',
                    ],
                },
                {
                    id: 'player_ron',
                    sourceActorId:
                        'player',
                    targetActorId: ron,
                    familiarity: 22,
                    closeness: 10,
                    warmth: 7,
                    trust: 4,
                    respect: 3,
                    influence: 0,
                    tension: 0,
                    resentment: 0,
                    fear: 0,
                    protectiveness: 0,
                    structuralTags: [],
                    activeEmotions: [],
                    evidenceIds: [],
                },
                {
                    id:
                        'mcgonagall_player',
                    sourceActorId:
                        mcgonagall,
                    targetActorId:
                        'player',
                    familiarity: 20,
                    closeness: 0,
                    warmth: 0,
                    trust: -6,
                    respect: 0,
                    influence: 0,
                    tension: 0,
                    resentment: 0,
                    fear: 0,
                    protectiveness: 0,
                    structuralTags: [],
                    activeEmotions: [],
                    evidenceIds: [
                        'mcgonagall_player_hidden',
                    ],
                },
            ],
        },
    };

    const playerProjection =
        buildSocialAudienceProjection(
            state,
            'player',
        );
    const playerRon =
        playerProjection.relationships
            .find(edge =>
                edge.id ===
                'ron_player');
    assert.equal(
        Object.hasOwn(
            playerProjection,
            'statements',
        ),
        false,
    );
    assert.equal(playerRon.trust, 13);
    assert.equal(
        playerRon.closeness,
        12,
    );
    assert.equal(playerRon.warmth, 6);
    assert.deepEqual(
        playerRon.structuralTags,
        [],
    );
    assert.deepEqual(
        playerRon.activeEmotions
            .map(emotion =>
                emotion.emotion),
        ['gratitude'],
    );
    assert.deepEqual(
        playerRon.evidence
            .map(evidence =>
                evidence.id),
        [],
    );
    assert.equal(
        playerProjection.relationships
            .some(edge =>
                edge.id ===
                'mcgonagall_player'),
        true,
    );
    assert.equal(
        playerProjection.relationships
            .some(edge =>
                edge.id ===
                'player_ron'),
        true,
    );

    const ronProjection =
        buildSocialAudienceProjection(
            state,
            ron,
        );
    const ronSelfEdge =
        ronProjection.relationships
            .find(edge =>
                edge.id ===
                'ron_player');
    assert.equal(
        Object.hasOwn(
            ronProjection,
            'statements',
        ),
        false,
    );
    assert.equal(ronSelfEdge.trust, 13);
    assert.equal(
        ronProjection.relationships
            .some(edge =>
                edge.id ===
                'player_ron'),
        false,
    );
    assert.deepEqual(
        ronSelfEdge.evidence
            .map(evidence =>
                evidence.id),
        [],
    );
    const [knowledgeCapsule] =
        buildActorKnowledgeCapsules(
            state,
            [ron],
        );
    assert.equal(
        knowledgeCapsule
            .socialKnowledge
            .relationships
            .some(edge =>
                edge.id ===
                'player_ron'),
        false,
    );
    const [continuityCapsule] =
        buildActorContinuityCapsules(
            state,
            [ron],
        );
    assert.equal(
        continuityCapsule
            .relationshipToPlayer
            .stageEn,
        'newly acquainted',
    );
    assert.equal(
        SOCIAL_RELATIONSHIP_DIMENSIONS
            .every(dimension =>
                Object.hasOwn(
                    continuityCapsule
                        .relationshipToPlayer,
                    dimension,
                )),
        true,
    );
    assert.deepEqual(
        continuityCapsule
            .relationshipToPlayer
            .activeEmotions
            .map(emotion =>
                emotion.emotion),
        [
            'gratitude',
            'anger',
        ],
    );
    assert.equal(
        continuityCapsule
            .relationshipToPlayer
            .latestEvidence,
        null,
    );
    assert.equal(
        continuityCapsule
            .relationshipToPlayer
            .labels
            .includes('竞争者'),
        true,
    );

    const hermioneProjection =
        buildSocialAudienceProjection(
            state,
            hermione,
        );
    assert.deepEqual(
        hermioneProjection
            .relationships,
        [],
    );

    const starProjection =
        buildPlayerKnownRelationshipProjection(
            state,
        );
    const starRon =
        starProjection
            .edgeByDirection
            .get(`${ron}->player`);
    assert.equal(starRon.dimensions.trust, 13);
    assert.equal(
        starRon.dimensions.closeness,
        12,
    );
    assert.deepEqual(
        starRon.evidence.map(item =>
            item.id),
        [],
    );
    assert.deepEqual(
        starRon.activeSentiments
            .map(emotion =>
                emotion.emotion),
        ['gratitude'],
    );
});

test('relationship graph renders familiarity-only edges as neutral instead of conflict', () => {
    const actorLibrary = [
        {
            id: 'neutral_actor',
            nameEn: 'Neutral Actor',
            cast: {
                introducedClock: 'known',
            },
        },
        {
            id: 'warm_actor',
            nameEn: 'Warm Actor',
            cast: {
                introducedClock: 'known',
            },
        },
        {
            id: 'tense_actor',
            nameEn: 'Tense Actor',
            cast: {
                introducedClock: 'known',
            },
        },
    ];
    const edge = (
        targetActorId,
        dimensions,
    ) => ({
        id: `player_${targetActorId}`,
        sourceActorId: 'player',
        targetActorId,
        familiarity: 24,
        closeness: 0,
        warmth: 0,
        trust: 0,
        respect: 0,
        influence: 0,
        tension: 0,
        resentment: 0,
        fear: 0,
        protectiveness: 0,
        knownToPlayer: true,
        ...dimensions,
    });
    const projection =
        buildPlayerKnownRelationshipProjection({
            actorLibrary,
            socialGraph: {
                version: 2,
                relationships: [
                    edge('neutral_actor', {}),
                    edge('warm_actor', {
                        warmth: 16,
                    }),
                    edge('tense_actor', {
                        tension: 24,
                    }),
                ],
            },
        });

    assert.deepEqual(
        projection.edges.map(item => ({
            target: item.targetId,
            dominant:
                item.dominantDimension,
            color: item.color,
        })),
        [
            {
                target: 'neutral_actor',
                dominant: 'neutral',
                color: '#7f879c',
            },
            {
                target: 'warm_actor',
                dominant: 'warmth',
                color: '#d8b65e',
            },
            {
                target: 'tense_actor',
                dominant: 'tension',
                color: '#d46b6b',
            },
        ],
    );
});

test('relationship filters retain excluded edges as five-percent visual context only', () => {
    const projection =
        buildPlayerKnownRelationshipProjection({
            actorLibrary: [
                {
                    id:
                        'lavender',
                    nameEn:
                        'Lavender Brown',
                    cast: {
                        introducedClock:
                            'known',
                    },
                },
                {
                    id:
                        'hermione',
                    nameEn:
                        'Hermione Granger',
                    cast: {
                        introducedClock:
                            'known',
                    },
                },
                {
                    id: 'dean',
                    nameEn:
                        'Dean Thomas',
                    cast: {
                        introducedClock:
                            'known',
                    },
                },
            ],
            socialGraph: {
                version: 2,
                relationships: [
                    {
                        id:
                            'lavender_player',
                        sourceActorId:
                            'lavender',
                        targetActorId:
                            'player',
                        familiarity: 33,
                        closeness: 33,
                        warmth: 97,
                        knownToPlayer:
                            true,
                    },
                    {
                        id:
                            'hermione_player',
                        sourceActorId:
                            'hermione',
                        targetActorId:
                            'player',
                        familiarity: 60,
                        warmth: 16,
                        tension: 100,
                        knownToPlayer:
                            true,
                    },
                    {
                        id:
                            'dean_player',
                        sourceActorId:
                            'dean',
                        targetActorId:
                            'player',
                        familiarity: 12,
                        knownToPlayer:
                            true,
                    },
                ],
            },
        });
    const visible =
        filterRelationshipGraphProjection(
            projection,
            {
                scope: 'all',
                sentiment: 'negative',
                category: 'all',
                query: '',
            },
        );
    assert.deepEqual(
        visible.edges.map(edge =>
            `${edge.sourceId}->${edge.targetId}`),
        ['hermione->player'],
    );
    assert.deepEqual(
        new Set(
            visible.contextEdgeIds,
        ),
        new Set([
            projection.edgeByDirection
                .get('lavender->player')
                .elementId,
            projection.edgeByDirection
                .get('dean->player')
                .elementId,
        ]),
    );
    assert.equal(
        visible.edgeIds.has(
            projection.edgeByDirection
                .get('lavender->player')
                .elementId,
        ),
        false,
    );
    assert.equal(
        visible.nodes.some(node =>
            node.id === 'lavender'),
        true,
    );

    const filteredEdgeStyle =
        getRelationshipGraphStyles()
            .find(entry =>
                entry.selector ===
                'edge.hpmud-graph-filtered')
            ?.style;
    assert.equal(
        filteredEdgeStyle?.opacity,
        FILTERED_RELATIONSHIP_EDGE_OPACITY,
    );
    assert.equal(
        filteredEdgeStyle?.events,
        'no',
    );
    assert.equal(
        FILTERED_RELATIONSHIP_EDGE_OPACITY,
        0.05,
    );
});

test('relationship graph separates reciprocal directed edges instead of stacking their colors', () => {
    const projection =
        buildPlayerKnownRelationshipProjection({
            actorLibrary: [
                {
                    id: 'alice',
                    nameEn: 'Alice',
                    cast: {
                        introducedClock:
                            'known',
                    },
                },
                {
                    id: 'bob',
                    nameEn: 'Bob',
                    cast: {
                        introducedClock:
                            'known',
                    },
                },
            ],
            socialGraph: {
                version: 2,
                relationships: [
                    {
                        id: 'alice_bob',
                        sourceActorId: 'alice',
                        targetActorId: 'bob',
                        familiarity: 30,
                        warmth: 16,
                        knownToPlayer: true,
                    },
                    {
                        id: 'bob_alice',
                        sourceActorId: 'bob',
                        targetActorId: 'alice',
                        familiarity: 30,
                        tension: 24,
                        knownToPlayer: true,
                    },
                ],
            },
        });
    const reciprocalEdges =
        projection.edges.map(edge => ({
            direction:
                `${edge.sourceId}->${edge.targetId}`,
            color: edge.color,
            curveDistance:
                edge.curveDistance,
        }));

    assert.deepEqual(
        reciprocalEdges,
        [
            {
                direction: 'alice->bob',
                color: '#d8b65e',
                curveDistance: 42,
            },
            {
                direction: 'bob->alice',
                color: '#d46b6b',
                curveDistance: 42,
            },
        ],
    );
});

test('relationship graph projects actor house affiliations with their player-visible directed edges', () => {
    const state = {
        character: {
            identity: {
                name: 'Tina Zhang',
            },
        },
        actorLibrary: [
            {
                id: 'harry',
                nameEn: 'Harry Potter',
                roleEn:
                    'Gryffindor student',
                cast: {
                    introducedClock: 'known',
                },
            },
            {
                id: 'hermione',
                nameEn: 'Hermione Granger',
                roleEn:
                    'Gryffindor student',
                cast: {
                    introducedClock: 'known',
                },
            },
            {
                id: 'ron',
                nameEn: 'Ron Weasley',
                roleEn:
                    'Gryffindor student',
                cast: {
                    introducedClock: 'known',
                },
            },
            {
                id: 'luna',
                nameEn: 'Luna Lovegood',
                roleEn:
                    'Ravenclaw student',
                cast: {
                    introducedClock: 'known',
                },
            },
        ],
        socialGraph: {
            version: 2,
            relationships: [
                {
                    id: 'player_harry',
                    sourceActorId: 'player',
                    targetActorId: 'harry',
                    familiarity: 40,
                    closeness: 20,
                    knownToPlayer: true,
                },
                {
                    id: 'harry_hermione',
                    sourceActorId: 'harry',
                    targetActorId: 'hermione',
                    familiarity: 60,
                    closeness: 35,
                    knownToPlayer: true,
                },
                {
                    id: 'hermione_ron',
                    sourceActorId: 'hermione',
                    targetActorId: 'ron',
                    familiarity: 55,
                    closeness: 30,
                    knownToPlayer: true,
                },
                {
                    id: 'ron_luna',
                    sourceActorId: 'ron',
                    targetActorId: 'luna',
                    familiarity: 25,
                    closeness: 12,
                    knownToPlayer: true,
                },
            ],
        },
    };

    const projection =
        buildPlayerKnownRelationshipProjection(
            state,
        );
    const houseNodes =
        projection.nodes
            .filter(node =>
                node.categories
                    .includes('house'));

    assert.deepEqual(
        houseNodes.map(node => node.id).sort(),
        [
            'harry',
            'hermione',
            'luna',
            'ron',
        ],
    );
    assert.deepEqual(
        Object.fromEntries(
            houseNodes.map(node => [
                node.id,
                node.house,
            ]),
        ),
        {
            harry: 'Gryffindor',
            hermione: 'Gryffindor',
            luna: 'Ravenclaw',
            ron: 'Gryffindor',
        },
    );
    assert.deepEqual(
        projection.edges.map(edge =>
            `${edge.sourceId}->${edge.targetId}`),
        [
            'player->harry',
            'harry->hermione',
            'hermione->ron',
            'ron->luna',
        ],
    );
    const visible =
        filterRelationshipGraphProjection(
            projection,
            {
                scope: 'all',
                sentiment: 'all',
                category: 'house',
                query: '',
            },
        );
    assert.deepEqual(
        visible.nodes
            .map(node => node.id)
            .sort(),
        [
            'harry',
            'hermione',
            'luna',
            'ron',
        ],
    );
    assert.deepEqual(
        visible.edges.map(edge =>
            `${edge.sourceId}->${edge.targetId}`),
        [
            'player->harry',
            'harry->hermione',
            'hermione->ron',
            'ron->luna',
        ],
    );
});

test('relationship graph resolves Tina-shaped house identities without losing current visible edges', () => {
    const currentTinaHouseActorCount = 10;
    const catalogActors = [
        [
            'canon_hermione_jean_granger',
            'Hermione Granger',
            'Student',
        ],
        [
            'canon_lavender_brown',
            'Lavender Brown',
            'Student',
        ],
        [
            'canon_ronald_bilius_weasley',
            'Ron Weasley',
            'Student',
        ],
        [
            'canon_seamus_finnigan',
            'Seamus Finnigan',
            'Student',
        ],
        [
            'canon_dean_thomas',
            'Dean Thomas',
            'Student',
        ],
        [
            'canon_neville_longbottom',
            'Neville Longbottom',
            'Student',
        ],
        [
            'canon_harry_james_potter',
            'Harry Potter',
            'Student',
        ],
        [
            'canon_filius_flitwick',
            'Filius Flitwick',
            'Professor of Charms and Head of Ravenclaw',
        ],
        [
            'minerva_mcgonagall',
            'Minerva McGonagall',
            'Deputy Headmistress of Hogwarts',
            'canon_minerva_mcgonagall',
        ],
    ];
    const nonHouseActors = [
        ['eddie_cooper', 'Eddie Cooper'],
        ['diagon_food_cart_vendor', 'Agnes Braithwaite'],
        ['diagon_passerby_doris', 'Doris Plunkett'],
        ['eddie_grandmother_cooper', 'Gran Cooper'],
        [
            'garrick_ollivander',
            'Garrick Ollivander',
            'canon_mr_ollivander',
        ],
        [
            'madam_malkin',
            'Madam Malkin',
            'canon_madam_malkin',
        ],
        ['malkins_next_customer', 'Mrs. Pendle'],
        ['alex_zhang', 'Alex Zhang'],
    ];
    const actorLibrary = [
        ...catalogActors.map(
            ([
                id,
                nameEn,
                roleEn,
                catalogId = id,
            ], index) => ({
                id,
                nameEn,
                roleEn: [
                    roleEn,
                    findCanonCharacter(
                        catalogId,
                    )?.house,
                ].filter(Boolean)
                    .join(' · '),
                canonCatalogId: catalogId,
                introducedClock:
                    `known_${index + 1}`,
                introducedTurn: index + 1,
                source: roleEn === 'Student'
                    ? 'canon_catalog'
                    : 'preset_location_resident',
            })),
        ...nonHouseActors.map(
            ([
                id,
                nameEn,
                canonCatalogId,
            ], index) => ({
                id,
                nameEn,
                roleEn: 'Known non-house actor',
                ...(canonCatalogId
                    ? { canonCatalogId }
                    : {}),
                introducedClock:
                    `known_${
                        catalogActors.length +
                        index +
                        1
                    }`,
                introducedTurn:
                    catalogActors.length +
                    index +
                    1,
                source: 'pacing_public_guest',
            })),
    ];
    const actors = actorLibrary.map(
        (profile, index) => ({
            id: profile.id,
            nameEn: profile.nameEn,
            roleEn: profile.roleEn,
            present: false,
            introducedTurn: index + 1,
            source: profile.source,
            ...(profile.roleEn === 'Student'
                ? {
                    canonCatalogId:
                        profile.canonCatalogId,
                }
                : {}),
        }),
    );
    actors.push(
        {
            id: 'hogwarts_express_trolley_witch',
            nameEn: 'Trolley Witch',
            roleEn:
                'Hogwarts Express trolley attendant',
            introducedClock: 'known_18',
            introducedTurn: 18,
            source: 'scene_temporary_actor',
            present: false,
        },
        {
            id: 'phillip_meadows',
            nameEn: 'Phillip',
            roleEn:
                'Third-year Gryffindor student',
            introducedClock: 'known_19',
            introducedTurn: 19,
            source: 'scene_temporary_actor',
            present: false,
        },
    );
    const visibleDirections = [
        'eddie_cooper->canon_hermione_jean_granger',
        'canon_dean_thomas->canon_ronald_bilius_weasley',
        'eddie_cooper->player',
        'canon_ronald_bilius_weasley->player',
        'canon_hermione_jean_granger->player',
        'canon_dean_thomas->player',
        'canon_dean_thomas->eddie_cooper',
        'canon_dean_thomas->canon_hermione_jean_granger',
        'canon_seamus_finnigan->player',
        'canon_seamus_finnigan->canon_dean_thomas',
        'canon_seamus_finnigan->eddie_cooper',
        'canon_neville_longbottom->player',
        'canon_hermione_jean_granger->canon_neville_longbottom',
        'canon_seamus_finnigan->canon_hermione_jean_granger',
        'canon_seamus_finnigan->canon_ronald_bilius_weasley',
        'canon_dean_thomas->canon_seamus_finnigan',
        'eddie_cooper->canon_seamus_finnigan',
        'canon_lavender_brown->player',
        'canon_lavender_brown->canon_hermione_jean_granger',
        'canon_hermione_jean_granger->canon_lavender_brown',
        'canon_dean_thomas->canon_neville_longbottom',
        'canon_neville_longbottom->canon_dean_thomas',
        'minerva_mcgonagall->player',
        'canon_hermione_jean_granger->minerva_mcgonagall',
        'minerva_mcgonagall->canon_hermione_jean_granger',
        'canon_seamus_finnigan->canon_lavender_brown',
        'canon_ronald_bilius_weasley->canon_seamus_finnigan',
        'canon_neville_longbottom->canon_seamus_finnigan',
        'canon_harry_james_potter->player',
        'canon_lavender_brown->canon_harry_james_potter',
        'canon_filius_flitwick->player',
        'canon_hermione_jean_granger->canon_filius_flitwick',
        'canon_harry_james_potter->canon_ronald_bilius_weasley',
    ];
    const relationshipEvidence =
        visibleDirections.map(
            (direction, index) => {
                const [
                    sourceActorId,
                    targetActorId,
                ] = direction.split('->');
                return {
                    id:
                        `visible_evidence_${index + 1}`,
                    sourceActorId,
                    targetActorId,
                    eventKind: 'interaction',
                    dimensionDeltas: [{
                        dimension: 'familiarity',
                        delta: 1,
                        impact: 'trace',
                    }],
                    emotionAppraisals: [],
                    structuralTags: [],
                    summaryEn:
                        'Deidentified player-known interaction.',
                    summary: '',
                    witnessedBy: ['player'],
                    sourceMessageIds: [index + 1],
                    sceneId: 'deidentified_scene',
                    turn: index + 1,
                };
            });
    const relationships =
        relationshipEvidence.map(
            (evidence, index) => ({
                id:
                    `known_relationship_${index + 1}`,
                sourceActorId:
                    evidence.sourceActorId,
                targetActorId:
                    evidence.targetActorId,
                familiarity: 25,
                closeness: 12,
                warmth: 0,
                trust: 0,
                respect: 0,
                influence: 0,
                tension: 0,
                resentment: 0,
                fear: 0,
                protectiveness: 0,
                structuralTags: [],
                activeEmotions: [],
                evidenceIds: [evidence.id],
            }));
    relationshipEvidence.push({
        id: 'npc_only_hidden_evidence',
        sourceActorId:
            'canon_ronald_bilius_weasley',
        targetActorId:
            'canon_hermione_jean_granger',
        eventKind: 'private_conversation',
        dimensionDeltas: [{
            dimension: 'trust',
            delta: 2,
            impact: 'minor',
        }],
        emotionAppraisals: [],
        structuralTags: [],
        summaryEn:
            'A private interaction unknown to the player.',
        summary: '',
        witnessedBy: [
            'canon_ronald_bilius_weasley',
            'canon_hermione_jean_granger',
        ],
        sourceMessageIds: [99],
        sceneId: 'private_scene',
        turn: 99,
    });
    relationships.push({
        id: 'npc_only_hidden_relationship',
        sourceActorId:
            'canon_ronald_bilius_weasley',
        targetActorId:
            'canon_hermione_jean_granger',
        familiarity: 25,
        closeness: 12,
        warmth: 0,
        trust: 2,
        respect: 0,
        influence: 0,
        tension: 0,
        resentment: 0,
        fear: 0,
        protectiveness: 0,
        structuralTags: [],
        activeEmotions: [],
        evidenceIds: [
            'npc_only_hidden_evidence',
        ],
    });
    const graphState = {
        character: {
            identity: {
                name:
                    'Deidentified Player',
            },
        },
        actorLibrary,
        actors,
        socialGraph: {
            version: 2,
            relationshipEvidence,
            relationships,
        },
    };
    normalizeCurrentActorFixtureInPlace(
        graphState,
    );
    const projection =
        buildPlayerKnownRelationshipProjection(
            graphState,
        );
    const houseNodes =
        projection.nodes.filter(node =>
            node?.categories.includes('house'));
    const visible =
        filterRelationshipGraphProjection(
            projection,
            {
                scope: 'all',
                sentiment: 'all',
                category: 'house',
                query: '',
            },
        );

    assert.equal(
        projection.nodes.length,
        20,
    );
    assert.equal(
        projection.edges.length > 0,
        true,
    );
    assert.equal(
        houseNodes.length,
        currentTinaHouseActorCount,
    );
    assert.equal(
        visible.nodes.length,
        currentTinaHouseActorCount,
    );
    assert.deepEqual(
        new Set(visible.nodes.map(node =>
            node?.id)),
        new Set([
            'canon_hermione_jean_granger',
            'canon_lavender_brown',
            'canon_ronald_bilius_weasley',
            'canon_seamus_finnigan',
            'canon_dean_thomas',
            'canon_neville_longbottom',
            'canon_filius_flitwick',
            'canon_harry_james_potter',
            'minerva_mcgonagall',
            'phillip_meadows',
        ]),
    );
    assert.equal(
        visible.edges.length > 0,
        true,
    );
    assert.equal(
        visible.nodes.some(node =>
            [
                'player',
                'eddie_cooper',
            ].includes(node.id)),
        false,
    );
    assert.equal(
        visible.edges.every(edge =>
            [edge.sourceId, edge.targetId]
                .some(id =>
                    projection.nodeById
                        .get(id)
                        ?.categories
                        .includes('house'))),
        true,
    );
    assert.equal(
        projection.edgeByDirection.has(
            'canon_ronald_bilius_weasley' +
            '->canon_hermione_jean_granger',
        ),
        false,
    );
    assert.equal(
        visible.edges.some(edge =>
            edge.sourceId === 'eddie_cooper' &&
            edge.targetId ===
                'canon_hermione_jean_granger'),
        false,
    );
});

test('relationship graph Cytoscape styles use supported highlight properties without warnings', () => {
    const styles =
        getRelationshipGraphStyles();
    const styleProperties =
        styles.flatMap(entry =>
            Object.keys(entry.style));
    assert.equal(
        styleProperties.some(property =>
            property.startsWith('shadow-')),
        false,
    );
    const focusStyle =
        styles.find(entry =>
            entry.selector ===
            'node.hpmud-graph-focus')
            ?.style;
    assert.deepEqual(
        {
            color:
                focusStyle?.[
                    'underlay-color'
                ],
            opacity:
                focusStyle?.[
                    'underlay-opacity'
                ],
            padding:
                focusStyle?.[
                    'underlay-padding'
                ],
        },
        {
            color: '#bca9ff',
            opacity: 0.34,
            padding: 11,
        },
    );
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...values) => {
        warnings.push(
            values
                .map(String)
                .join(' '),
        );
    };
    let graph;
    try {
        graph = cytoscape({
            headless: true,
            styleEnabled: true,
            elements: [
                {
                    data: {
                        id: 'player',
                        label: 'Tina',
                        sigil: '',
                        size: 64,
                        ringColor: '#e1c477',
                        player: 'true',
                    },
                    classes:
                        'hpmud-graph-focus',
                },
                {
                    data: {
                        id: 'harry',
                        label: 'Harry',
                        sigil: '',
                        size: 58,
                        ringColor: '#9f3a43',
                        player: 'false',
                    },
                },
                {
                    data: {
                        id: 'player_harry',
                        source: 'player',
                        target: 'harry',
                        color: '#77aee8',
                        width: 3,
                        opacity: 0.7,
                        curveDistance: 0,
                    },
                },
            ],
            style: styles,
        });
    } finally {
        graph?.destroy();
        console.warn = originalWarn;
    }
    assert.deepEqual(warnings, []);
});

test('relationship graph disables motion and avoids custom wheel sensitivity warnings', async () => {
    const reducedMotionStyles =
        getRelationshipGraphStyles({
            reducedMotion: true,
        });
    const transitionDurations =
        reducedMotionStyles.flatMap(entry =>
            entry.style[
                'transition-duration'
            ] || []);
    assert.ok(
        transitionDurations.length > 0,
    );
    assert.deepEqual(
        new Set(transitionDurations),
        new Set(['0ms']),
    );

    const graphSource = await readFile(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/relationship-graph.js',
            import.meta.url,
        ),
        'utf8',
    );
    assert.doesNotMatch(
        graphSource,
        /wheelSensitivity\s*:/,
    );
    assert.doesNotMatch(
        graphSource,
        /duration:\s*reducedMotion\.matches\s*\?\s*0\s*:/,
    );
});

test('relationship graph actor cards reopen the inspector on narrow screens', async () => {
    const [graphSource, stylesheet] =
        await Promise.all([
            readFile(
                new URL(
                    '../public/scripts/extensions/hogwarts-mud/relationship-graph.js',
                    import.meta.url,
                ),
                'utf8',
            ),
            readFile(
                new URL(
                    '../public/scripts/extensions/hogwarts-mud/style.css',
                    import.meta.url,
                ),
                'utf8',
            ),
        ]);
    assert.match(
        graphSource,
        /classList\.add\(\s*['"]hpmud-relationship-inspector-open['"]\s*,?\s*\)/,
    );
    assert.match(
        stylesheet,
        /@media\s*\(max-width:\s*760px\)[\s\S]*?\.hpmud-app\.hpmud-relationship-inspector-open\s+\.hpmud-inspector\s*\{[\s\S]*?display:\s*grid;/,
    );
});
