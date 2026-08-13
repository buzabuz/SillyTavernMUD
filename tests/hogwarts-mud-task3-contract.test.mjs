/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import * as actorIdentity from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import * as actorKnowledge from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import * as actorMemory from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory.js';
import * as actorMemoryMigration from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-migration.js';
import * as actorMemoryReducer from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-reducer.js';
import * as actorContextSchema from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import * as appearance from '../public/scripts/extensions/hogwarts-mud/domain/appearance.js';
import * as cast from '../public/scripts/extensions/hogwarts-mud/domain/cast.js';
import * as causalState from '../public/scripts/extensions/hogwarts-mud/domain/causal-state.js';
import * as inventory from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import * as knowledgeProjectorV2 from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import * as mapAccess from '../public/scripts/extensions/hogwarts-mud/domain/map-access.js';
import * as materialState from '../public/scripts/extensions/hogwarts-mud/domain/material-state.js';
import * as memorySynapseSchema from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import * as socialMigration from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import * as socialProjection from '../public/scripts/extensions/hogwarts-mud/domain/social-projection.js';
import * as socialReducer from '../public/scripts/extensions/hogwarts-mud/domain/social-reducer.js';
import * as socialSchema from '../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import * as spellState from '../public/scripts/extensions/hogwarts-mud/domain/spell-state.js';
import * as helpers from '../public/scripts/extensions/hogwarts-mud/helpers.js';
import * as socialDirector from '../src/hogwarts-mud/social-director-graph.js';

const TASK3_MODULE_URLS = [
    'actor-identity',
    'actor-knowledge',
    'actor-memory',
    'actor-memory-migration',
    'actor-memory-reducer',
    'appearance',
    'cast',
    'causal-state',
    'inventory',
    'map-access',
    'material-state',
    'social-migration',
    'social-projection',
    'social-reducer',
    'social-schema',
    'spell-state',
    'stable-identity',
].map(name => new URL(
    `../public/scripts/extensions/hogwarts-mud/domain/${name}.js`,
    import.meta.url,
));
const SOCIAL_WORKFLOW_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js',
    import.meta.url,
);
const SCENE_TRANSITION_WORKFLOW_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js',
    import.meta.url,
);
const KNOWLEDGE_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/knowledge.js',
    import.meta.url,
);
const RELATIONSHIP_GRAPH_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/relationship-graph.js',
    import.meta.url,
);

const TASK3_PUBLIC_MODULES = [
    actorIdentity,
    actorKnowledge,
    actorMemory,
    actorMemoryMigration,
    actorMemoryReducer,
    appearance,
    cast,
    causalState,
    inventory,
    mapAccess,
    materialState,
    socialMigration,
    socialProjection,
    socialReducer,
    socialSchema,
    spellState,
];
const TASK3_INTERNAL_EXPORTS = new Set([
    'CAUSAL_COLLAPSE_KEYS',
    'CAUSAL_COLLAPSE_KINDS',
    'CAUSAL_COLLAPSE_PERSISTENCE_TARGETS',
    'CAUSAL_SOCIAL_STRUCTURAL_TAG_BY_EDGE_TYPE',
    'CAUSAL_WITNESS_ACCOUNT_KEYS',
    'captureMemoryBoundaryGuard',
    'clampSocialDimension',
    'countTextWords',
    'CROWDED_SCENE_ROOM_KINDS',
    'deriveRelationshipImpression',
    'DURABLE_ACQUISITION_PATTERN',
    'finiteSocialNumber',
    'getActorMemoryEntries',
    'getCanonActorDisplayMetadata',
    'getKnownSpell',
    'getMapRooms',
    'getSpellProficiencyModifier',
    'hasGenericImpression',
    'IMPORTANT_ITEM_PATTERN',
    'impactForSocialDelta',
    'inferItemKind',
    'inferSocialEventKind',
    'isMemoryBoundaryGuardCurrent',
    'isValidFirstImpression',
    'isValidImpressionShorthand',
    'normalizeActorLifeState',
    'normalizeActorVisualRecord',
    'normalizeEmotionAppraisals',
    'normalizeMemoryId',
    'normalizeSocialDimensionDeltas',
    'normalizeSocialSourceMessageIds',
    'normalizeSocialStructuralTags',
    'ORDINARY_TRANSIENT_ITEM_PATTERN',
    'parseSocialGraphV1MigrationInput',
    'PLAYER_KEEP_ITEM_PATTERN',
    'SHARED_MEMORY_TIERS',
    'SOCIAL_RELATIONSHIP_DIMENSION_SET',
    'synchronizeHeldItemLocations',
    'upsertSharedMemory',
]);

test('Task 3 facade re-exports real entity, actor, and social module values', () => {
    for (const module of TASK3_PUBLIC_MODULES) {
        const publicEntries =
            Object.entries(module)
                .filter(([name]) =>
                    !TASK3_INTERNAL_EXPORTS
                        .has(name));
        for (const [name, value] of
            publicEntries) {
            assert.equal(
                helpers[name],
                value,
                `${name} must be the real domain export`,
            );
        }
    }
});

test('Task 3 modules stay below size limits and never import compatibility entry points', async () => {
    for (const url of TASK3_MODULE_URLS) {
        const source = await readFile(
            url,
            'utf8',
        );
        assert.ok(
            source.split('\n').length < 2000,
            `${url.pathname} exceeds the hard module limit`,
        );
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*['"][^'"]*(?:helpers|index)\.js['"]/u,
            url.pathname,
        );
    }
});

test('knowledge and relationship graph import their real domain owners', async () => {
    const [knowledgeSource, graphSource] =
        await Promise.all([
            readFile(KNOWLEDGE_URL, 'utf8'),
            readFile(
                RELATIONSHIP_GRAPH_URL,
                'utf8',
            ),
        ]);
    for (const source of [
        knowledgeSource,
        graphSource,
    ]) {
        assert.doesNotMatch(
            source,
            /from\s+['"]\.\/helpers\.js['"]/u,
        );
    }
    assert.match(
        knowledgeSource,
        /from\s+['"]\.\/domain\/actor-context-schema\.js['"]/u,
    );
    assert.match(
        graphSource,
        /from\s+['"]\.\/domain\/actor-dossier-projection\.js['"]/u,
    );
});

function extractFunction(source, name) {
    const start = source.indexOf(
        `function ${name}(`,
    );
    assert.notEqual(
        start,
        -1,
        `${name} must exist`,
    );
    const nextFunction =
        source.indexOf(
            '\nfunction ',
            start + 1,
        );
    const nextExport =
        source.indexOf(
            '\nexport function ',
            start + 1,
        );
    const nextNestedFunction =
        source.indexOf(
            '\n    function ',
            start + 1,
        );
    const candidates = [
        nextFunction,
        nextExport,
        nextNestedFunction,
    ].filter(index => index >= 0);
    const end = candidates.length
        ? Math.min(...candidates)
        : source.length;
    return source.slice(start, end);
}

async function loadKnowledgeModule(
    {
        fetchImpl,
    } = {},
) {
    const source =
        await readFile(
            KNOWLEDGE_URL,
            'utf8',
        );
    const context = vm.createContext({
        console,
        Date,
        fetch:
            fetchImpl ||
            (
                async () => ({
                    ok: true,
                    json:
                        async () => ({}),
                })
            ),
        structuredClone,
        URL,
    });
    const module = new vm.SourceTextModule(
        source,
        {
            context,
            identifier:
                KNOWLEDGE_URL.href,
        },
    );
    await module.link(async specifier => {
        const exportsBySpecifier = {
            '/script.js': {
                getRequestHeaders:
                    () => ({}),
            },
            '/scripts/utils.js': {
                getStringHash:
                    value =>
                        String(value).length,
            },
            './domain/appearance.js': {
                buildActorAppearanceView:
                    () => ({
                        physicalDescriptionEn:
                            '',
                        physicalDescription:
                            '',
                        presentation: {
                            outfit: '',
                            accessories: [],
                            hair: '',
                            visibleConditions:
                                [],
                            heldItems: [],
                        },
                    }),
            },
            './domain/actor-memory.js': {
                normalizeActorMemoryProfile:
                    actor => ({
                        ...actor,
                        knowledgeEn:
                            actor
                                .knowledgeEn ||
                            [],
                        sharedMemories: {
                            core: [],
                            recent: [],
                            everyday: [],
                            ...(
                                actor
                                    .sharedMemories ||
                                {}
                            ),
                        },
                    }),
            },
            './domain/social-projection.js': {
                buildSocialAudienceProjection:
                    () => ({
                        statements: [],
                        relationships: [],
                    }),
            },
            './presence-witness-contract.js': {
                getActiveInteractionActorIds:
                    helpers
                        .getActiveInteractionActorIds,
            },
            './domain/actor-context-schema.js':
                actorContextSchema,
            './domain/knowledge-projector-v2.js':
                knowledgeProjectorV2,
            './domain/memory-synapse-schema.js':
                memorySynapseSchema,
        };
        const values =
            exportsBySpecifier[specifier];
        assert.ok(
            values,
            `Unexpected import ${specifier}`,
        );
        return new vm.SyntheticModule(
            Object.keys(values),
            function setExports() {
                for (
                    const [name, value]
                    of Object.entries(values)
                ) {
                    this.setExport(
                        name,
                        value,
                    );
                }
            },
            {
                context,
                identifier:
                    `stub:${specifier}`,
            },
        );
    });
    await module.evaluate();
    return module.namespace;
}

function createEventKnowledge(
    overrides = {},
) {
    return {
        version: 1,
        eventId: 'event_charms_accident',
        sceneId: 'charms_class',
        sourceMessageIds: [10, 11],
        summaryEn:
            'Tina sent Ron into the rafters.',
        participantActorIds: ['ron'],
        witnessActorIds: [
            'dean',
            'hermione',
            'ron',
        ],
        witnessCohortIds: [
            'gryffindor_charms',
        ],
        witnessBasis: {
            dean:
                'room_visual_audible',
            hermione:
                'room_visual_audible',
            ron: 'direct',
        },
        perception: {
            version: 1,
            visualScope: 'room',
            audibleScope: 'room',
            salience: 'major',
            attribution: 'clear',
            concealment: 'none',
            directParticipantActorIds: [
                'ron',
            ],
            evidenceText:
                'Ron hit the rafters.',
            confidence: 0.95,
            source:
                'post_turn_observer',
        },
        source: 'post_turn_observer',
        ...overrides,
    };
}

test('[defect-probing] actor knowledge capsules separate direct, witnessed, and reported event knowledge', () => {
    assert.equal(
        typeof helpers
            .projectActorEventKnowledge,
        'function',
    );
    const state = {
        actorLibrary: [
            {
                id: 'ron',
                sharedMemories: {},
            },
            {
                id: 'hermione',
                sharedMemories: {},
            },
            {
                id: 'neville',
                sharedMemories: {},
            },
        ],
        actors: [],
        eventKnowledge: [
            createEventKnowledge(),
        ],
        cohorts: [{
            id: 'gryffindor_charms',
            knownMemberActorIds: [
                'neville',
            ],
        }],
    };
    const capsules =
        helpers
            .buildActorKnowledgeCapsules(
                state,
                [
                    'ron',
                    'hermione',
                    'neville',
                ],
            );

    assert.deepEqual(
        capsules[0]
            .eventKnowledge.direct
            .map(event => event.eventId),
        ['event_charms_accident'],
    );
    assert.deepEqual(
        capsules[1]
            .eventKnowledge.witnessed
            .map(event => event.eventId),
        ['event_charms_accident'],
    );
    assert.deepEqual(
        capsules[2].eventKnowledge,
        {
            version: 1,
            direct: [],
            witnessed: [],
            reported: [],
        },
        'cohort membership alone must not become personal event knowledge',
    );
});

test('[defect-probing] Social Director collection contains no active-cast or dialogue witness inference', async () => {
    const source =
        await readFile(
            SOCIAL_WORKFLOW_URL,
            'utf8',
        );
    const collector =
        extractFunction(
            source,
            'collectSocialDirectorEvidence',
        );

    assert.match(
        collector,
        /\beventKnowledge\b/u,
    );
    assert.doesNotMatch(
        collector,
        /actorPresence/u,
    );
    assert.doesNotMatch(
        collector,
        /segments\s*\.\s*map[\s\S]*?actorId/u,
    );
    assert.doesNotMatch(
        collector,
        /archivedActorIds/u,
    );
});

test('[defect-probing] server witness validation derives exact message maps from committed event knowledge', () => {
    assert.equal(
        typeof socialDirector
            .validateCommittedEventWitnessInput,
        'function',
    );
    const input = {
        actorIds: [
            'ron',
            'hermione',
            'dean',
        ],
        allowedMessageIds: [10, 11],
        messageSceneIds: {
            10: 'charms_class',
            11: 'charms_class',
        },
        witnessActorIdsByMessageId: {
            10: [
                'dean',
                'hermione',
                'ron',
            ],
            11: [
                'dean',
                'hermione',
                'ron',
            ],
        },
        eventKnowledge: [
            createEventKnowledge(),
        ],
    };

    assert.equal(
        socialDirector
            .validateCommittedEventWitnessInput(
                input,
            ).valid,
        true,
    );
    assert.equal(
        socialDirector
            .validateCommittedEventWitnessInput({
                ...input,
                witnessActorIdsByMessageId: {
                    ...input
                        .witnessActorIdsByMessageId,
                    10: [
                        'dean',
                        'hermione',
                        'neville',
                        'ron',
                    ],
                },
            }).valid,
        false,
        'active or cohort actors absent from the committed event cannot be promoted',
    );
});

test('[defect-probing] knowledge records use event participants, witnesses, cohorts, and separated scene populations', async () => {
    const knowledge =
        await loadKnowledgeModule();
    const eventKnowledge =
        createEventKnowledge();
    const state = {
        scene: {
            id: 'charms_class',
            nameEn: 'Charms',
            startedMessageId: 10,
        },
        sceneArchive: [],
        actors: [
            {
                id: 'ron',
                present: true,
            },
            {
                id: 'lavender',
                present: true,
            },
        ],
        actorLibrary: [],
        activeInteractionActorIds: [
            'lavender',
            'ron',
        ],
        localPresence: {
            occupantActorIds: [
                'dean',
                'hermione',
                'lavender',
                'ron',
            ],
            cohortIds: [
                'gryffindor_charms',
            ],
        },
        eventKnowledge: [
            eventKnowledge,
        ],
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
        },
        socialGraph: {},
        causalCollapse: {
            records: [],
        },
        clues: [],
        storyArcs: [],
        clock:
            '1991-09-01 · 11:00',
    };
    const chat = [
        ...Array.from(
            { length: 10 },
            () => ({}),
        ),
        {
            is_user: true,
            mes: 'Tina casts.',
        },
        {
            extra: {
                hogwartsMud: {
                    sceneId:
                        'charms_class',
                    segments: [{
                        type:
                            'narration',
                        textEn:
                            'Ron hit the rafters.',
                    }],
                    turnTransaction: {
                        publicEventEn:
                            eventKnowledge
                                .summaryEn,
                    },
                },
            },
        },
    ];
    const records =
        knowledge
            .buildKnowledgeRecords(
                state,
                chat,
            );
    const event =
        records.find(record =>
            record.category ===
                'events' &&
            record.recordId ===
                `events_${eventKnowledge.eventId}`);
    const scene =
        records.find(record =>
            record.category ===
                'scenes');

    assert.deepEqual(
        [...event.entityIds].sort(),
        [
            'charms_class',
            'dean',
            'gryffindor_charms',
            'hermione',
            'ron',
        ],
    );
    assert.deepEqual(
        scene.data
            .activeInteractionActorIds,
        ['lavender', 'ron'],
    );
    assert.deepEqual(
        scene.data
            .localOccupantActorIds,
        [
            'dean',
            'hermione',
            'lavender',
            'ron',
        ],
    );
    assert.deepEqual(
        scene.data.localCohortIds,
        ['gryffindor_charms'],
    );
});

test('[defect-probing] production Event projection preserves explicit ACL through hydration', async () => {
    let projectedRecords = [];
    const knowledge =
        await loadKnowledgeModule({
            fetchImpl:
                async () => ({
                    ok: true,
                    json: async () => ({
                        records:
                            projectedRecords,
                        diagnostics: {
                            backend:
                                'qdrant',
                        },
                    }),
                }),
        });
    const event = (
        eventId,
        overrides = {},
    ) => createEventKnowledge({
        eventId,
        sourceMessageIds: [
            overrides.sourceMessageId ||
                10,
        ],
        participantActorIds: [],
        witnessActorIds: [],
        witnessCohortIds: [],
        witnessBasis: {},
        ...overrides,
    });
    const state = {
        timelineEpoch: 'epoch_acl',
        stateRevision: 16,
        clock:
            '1991-09-02 · 19:00',
        scene: {
            id: 'charms_class',
            nameEn: 'Charms',
            startedMessageId: 0,
        },
        sceneArchive: [],
        actors: [],
        actorLibrary: [
            'hermione',
            'ron',
            'luna',
        ].map(id => ({
            id,
            sharedMemories: {},
        })),
        activeInteractionActorIds: [],
        eventKnowledge: [
            event(
                'event_hermione_only',
                {
                    participantActorIds: [
                        'hermione',
                    ],
                    witnessActorIds: [
                        'hermione',
                    ],
                    witnessBasis: {
                        hermione:
                            'direct',
                    },
                },
            ),
            event(
                'event_explicit_public',
                {
                    sourceMessageId: 11,
                    visibility:
                        'public',
                },
            ),
            event(
                'event_authorized_rumor',
                {
                    sourceMessageId: 12,
                    participantActorIds: [
                        'hermione',
                    ],
                    witnessActorIds: [
                        'hermione',
                    ],
                    witnessBasis: {
                        hermione:
                            'direct',
                    },
                },
            ),
            event(
                'event_unmarked_empty_acl',
                {
                    sourceMessageId: 13,
                },
            ),
        ],
        gossipPacks: [{
            id: 'rumor_acl',
            status: 'active',
            sourceEventIds: [
                'event_authorized_rumor',
            ],
            sourceMessageIds: [12],
            sourceActorIds: [
                'hermione',
            ],
            versions: [{
                id: 'rumor_acl_v1',
                sourceEventIds: [
                    'event_authorized_rumor',
                ],
                sourceMessageIds: [12],
                sourceActorIds: [
                    'hermione',
                ],
                audienceActorIds: [
                    'luna',
                ],
            }],
        }],
        map: {},
        socialGraph: {},
        causalCollapse: {
            records: [],
        },
        clues: [],
        storyArcs: [],
    };
    const records =
        knowledge.buildKnowledgeRecords(
            state,
            [],
        );
    projectedRecords = records;
    const visibleEventIds =
        async actorId =>
            (
                await knowledge
                    .retrieveKnowledge(
                        {
                            getCurrentChatId:
                                () =>
                                    'timeline_acl',
                        },
                        state,
                        'ACL event',
                        [],
                        20,
                        {
                            audienceActorIds: [
                                actorId,
                            ],
                            nodeTypes: [
                                'fact',
                            ],
                        },
                    )
            )
                .map(record =>
                    record.data
                        .eventKnowledge
                        ?.eventId)
                .filter(Boolean);

    assert.deepEqual(
        await visibleEventIds(
            'player',
        ),
        ['event_explicit_public'],
    );
    assert.deepEqual(
        await visibleEventIds('ron'),
        ['event_explicit_public'],
    );
    assert.deepEqual(
        await visibleEventIds(
            'hermione',
        ),
        [
            'event_authorized_rumor',
            'event_explicit_public',
            'event_hermione_only',
        ],
    );
    assert.deepEqual(
        await visibleEventIds('luna'),
        [
            'event_authorized_rumor',
            'event_explicit_public',
        ],
    );
    const locked =
        records.find(record =>
            record.data
                .eventKnowledge
                ?.eventId ===
            'event_unmarked_empty_acl');
    assert.deepEqual(
        locked.visibility,
        {
            scope: 'locked',
            actorIds: [],
        },
    );
});

test('[defect-probing] scene archive stores active, local, cohort, and event witness fields while retaining actorIds only for compatibility', async () => {
    const source =
        await readFile(
            SCENE_TRANSITION_WORKFLOW_URL,
            'utf8',
        );
    const builder =
        extractFunction(
            source,
            'buildSceneArchiveEntry',
        );

    for (const field of [
        'activeInteractionActorIds',
        'localOccupantActorIds',
        'localCohortIds',
        'events',
        'actorIds',
    ]) {
        assert.match(
            builder,
            new RegExp(`\\b${field}\\b`, 'u'),
        );
    }
});

test('event knowledge projections are idempotent and remain isolated by scene', () => {
    const current =
        createEventKnowledge();
    const other = createEventKnowledge({
        eventId:
            'event_library_whisper',
        sceneId: 'library',
        sourceMessageIds: [20, 21],
        participantActorIds: [
            'hermione',
        ],
        witnessActorIds: [
            'hermione',
        ],
        witnessCohortIds: [],
        witnessBasis: {
            hermione: 'direct',
        },
        perception: {
            ...createEventKnowledge()
                .perception,
            directParticipantActorIds: [
                'hermione',
            ],
        },
    });
    const state = {
        actors: [
            {
                id: 'ron',
                present: true,
            },
            {
                id: 'hermione',
                present: false,
            },
        ],
        actorLibrary: [],
        activeInteractionActorIds: [
            'ron',
        ],
        localPresence: {
            occupantActorIds: [
                'hermione',
                'ron',
            ],
            cohortIds: [
                'gryffindor_charms',
            ],
        },
        eventKnowledge: [
            other,
            current,
        ],
    };

    const first =
        helpers
            .projectSceneArchivePresence(
                state,
                {
                    sceneId:
                        'charms_class',
                    messageIds: [
                        10,
                        11,
                    ],
                },
            );
    const second =
        helpers
            .projectSceneArchivePresence(
                structuredClone(
                    state,
                ),
                {
                    sceneId:
                        'charms_class',
                    messageIds: [
                        10,
                        11,
                    ],
                },
            );

    assert.deepEqual(second, first);
    assert.deepEqual(
        first.events.map(event =>
            event.eventId),
        ['event_charms_accident'],
    );
    assert.deepEqual(
        first.actorIds,
        first
            .activeInteractionActorIds,
    );
});

test('public cohort event knowledge does not create relationships or a cohort member clique', () => {
    const eventKnowledge =
        createEventKnowledge();
    const socialGraph = {
        version: 2,
        relationships: [],
        relationshipEvidence: [],
    };
    const state = {
        actors: [
            'dean',
            'hermione',
            'ron',
        ].map(id => ({
            id,
        })),
        actorLibrary: [],
        cohorts: [{
            version: 1,
            id: 'gryffindor_charms',
            labelEn:
                'Gryffindor Charms class',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            knownMemberActorIds: [
                'dean',
                'hermione',
                'ron',
            ],
            source:
                'class_roster',
        }],
        eventKnowledge: [],
        socialGraph,
    };
    const transaction = {
        actorPresence: {
            presentActorIdsAfterTurn: [
                'ron',
            ],
        },
        localPresence: {
            version: 1,
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            occupantActorIds: [
                'dean',
                'hermione',
                'ron',
            ],
            cohortIds: [
                'gryffindor_charms',
            ],
            updatedTurn: 1,
            source:
                'scene_roster',
        },
        eventKnowledge,
    };
    const next =
        helpers
            .applyPresenceWitnessTransaction(
                state,
                transaction,
            );

    assert.equal(
        next.eventKnowledge.length,
        1,
    );
    assert.deepEqual(
        next.socialGraph,
        socialGraph,
    );
    assert.deepEqual(
        next.socialGraph.relationships,
        [],
    );
});

test('Social Reducer never promotes active actors outside the event witness map', async () => {
    const result =
        await socialDirector
            .runSocialDirectorGraph({
                sceneId:
                    'private_exchange',
                clock:
                    '1991-09-01 · 12:00',
                turn: 2,
                actorIds: [
                    'hermione',
                    'ron',
                ],
                presentActorIds: [
                    'hermione',
                    'ron',
                ],
                allowedMessageIds: [
                    30,
                ],
                messageSceneIds: {
                    30:
                        'private_exchange',
                },
                witnessActorIdsByMessageId: {
                    30: ['ron'],
                },
                existingGraph: {
                    version: 2,
                    statements: [],
                    relationshipEvidence:
                        [],
                    relationships: [],
                    lastProcessedMessageId:
                        29,
                },
                extraction: {
                    reviews: [],
                    statements: [],
                    relationshipEvidence: [{
                        sourceActorId:
                            'ron',
                        targetActorId:
                            'player',
                        sceneId:
                            'private_exchange',
                        eventKind:
                            'serious_conversation',
                        dimensionDeltas: [{
                            dimension:
                                'trust',
                            delta: 4,
                            impact:
                                'meaningful',
                        }],
                        structuralTags: [],
                        emotionAppraisals:
                            [],
                        summaryEn:
                            'Ron privately trusted the player.',
                        witnessedBy: [
                            'hermione',
                            'ron',
                        ],
                        sourceMessageIds: [
                            30,
                        ],
                    }],
                },
            });

    assert.deepEqual(
        result.socialGraph
            .relationshipEvidence[0]
            .witnessedBy,
        ['ron'],
    );
});

test('Knowledge V2 indexes independent Actor Core and Social Evidence records', async () => {
    const knowledge =
        await loadKnowledgeModule();
    const state = {
        timelineEpoch:
            'task5_knowledge',
        stateRevision: 5,
        clock:
            '1991-09-05 · 10:00',
        actorLibrary: [{
            id: 'hermione',
            nameEn:
                'Hermione Granger',
            roleEn: 'Student',
            performanceCore: {
                temperamentEn:
                    'Exacting and brave.',
                speechStyleEn:
                    'Precise.',
                motivesEn: [
                    'Master difficult magic.',
                ],
                socialStrategiesEn: [
                    'Correct errors directly.',
                ],
                boundariesEn: [
                    'Reject cruelty.',
                ],
                vulnerabilitiesEn: [],
            },
            sharedMemories: {
                core: [{
                    summaryEn:
                        'Forbidden copied memory.',
                }],
            },
            socialStatements: [{
                textEn:
                    'Forbidden copied statement.',
            }],
        }],
        actors: [{
            id: 'hermione',
            roomId: 'library',
            currentActivityEn:
                'Reading now.',
        }],
        actorPresentations: {
            hermione: {
                outfit:
                    'Current robes.',
            },
        },
        activeInteractionActorIds: [
            'hermione',
        ],
        sceneArchive: [],
        eventKnowledge: [],
        socialGraph: {
            relationshipEvidence: [{
                id: 'evidence_help',
                sourceActorId:
                    'hermione',
                targetActorId:
                    'player',
                summaryEn:
                    'Hermione offered help.',
                witnessedBy: [
                    'hermione',
                ],
                sourceMessageIds: [
                    12,
                ],
            }],
        },
        memorySynapse: {
            appraisals: [{
                id:
                    'appraisal_current_cache',
                observerId:
                    'hermione',
                targetId: 'player',
                summaryEn:
                    'Mutable current cache.',
                contextTags: [
                    'migrated_current_impression',
                ],
            }],
            personSchemas: [],
        },
        causalCollapse: {
            records: [],
        },
        clues: [],
        storyArcs: [],
    };
    const records =
        knowledge
            .buildKnowledgeRecords(
                state,
                [],
            );
    const actor =
        records.find(record =>
            record.category ===
                'actors');
    const social =
        records.find(record =>
            record.category ===
                'social_evidence');

    assert.equal(
        actor.recordId,
        'actors_hermione',
    );
    assert.deepEqual(
        Object.keys(actor.data),
        ['actorCore'],
    );
    assert.doesNotMatch(
        JSON.stringify(actor),
        /sharedMemories|socialStatements|currentActivity|Current robes/u,
    );
    assert.equal(
        social.recordId,
        'social_evidence_evidence_help',
    );
    assert.equal(
        records.some(record =>
            record.recordId ===
                'appraisals_appraisal_current_cache'),
        false,
    );
});

test('Knowledge retrieval canonical-hydrates hits and does not mutate State', async () => {
    let returnedRecords = [];
    const knowledge =
        await loadKnowledgeModule({
            fetchImpl:
                async () => ({
                    ok: true,
                    json:
                        async () => ({
                            records:
                                returnedRecords,
                            diagnostics: {
                                backend:
                                    'qdrant',
                            },
                        }),
                }),
        });
    const state = {
        timelineEpoch:
            'task5_hydration',
        stateRevision: 7,
        clock:
            '1991-09-05 · 10:00',
        actorLibrary: [],
        actors: [],
        activeInteractionActorIds: [],
        sceneArchive: [],
        eventKnowledge: [{
            eventId:
                'event_canonical',
            sceneId: 'scene_one',
            summaryEn:
                'The canonical bell rang.',
            visibility: 'public',
            sourceMessageIds: [],
            participantActorIds: [],
            witnessActorIds: [],
        }],
        socialGraph: {},
        memorySynapse: {
            appraisals: [],
            personSchemas: [],
        },
        causalCollapse: {
            records: [],
        },
        clues: [],
        storyArcs: [],
    };
    const canonical =
        knowledge
            .buildKnowledgeRecords(
                state,
                [],
            )
            .find(record =>
                record.category ===
                'events');
    returnedRecords = [{
        ...canonical,
        text:
            'Qdrant-injected noncanonical text.',
    }];
    const before =
        structuredClone(state);
    const records =
        await knowledge
            .retrieveKnowledge(
                {
                    chat: [],
                },
                state,
                'bell',
                [],
                5,
            );

    assert.equal(
        records[0].text,
        canonical.text,
    );
    assert.deepEqual(
        state,
        before,
    );
});
