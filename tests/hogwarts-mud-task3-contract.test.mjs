/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import * as helpers from '../public/scripts/extensions/hogwarts-mud/helpers.js';
import * as socialDirector from '../src/hogwarts-mud/social-director-graph.js';

const INDEX_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/index.js',
    import.meta.url,
);
const KNOWLEDGE_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/knowledge.js',
    import.meta.url,
);

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
    const candidates = [
        nextFunction,
        nextExport,
    ].filter(index => index >= 0);
    const end = candidates.length
        ? Math.min(...candidates)
        : source.length;
    return source.slice(start, end);
}

async function loadKnowledgeModule() {
    const source =
        await readFile(
            KNOWLEDGE_URL,
            'utf8',
        );
    const context = vm.createContext({
        console,
        Date,
        fetch: async () => ({
            ok: true,
            json: async () => ({}),
        }),
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
            './helpers.js': {
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
                buildSocialAudienceProjection:
                    () => ({
                        statements: [],
                        relationships: [],
                    }),
                getActiveInteractionActorIds:
                    helpers
                        .getActiveInteractionActorIds,
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
            INDEX_URL,
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
            record.id ===
                eventKnowledge.eventId);
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

test('[defect-probing] scene archive stores active, local, cohort, and event witness fields while retaining actorIds only for compatibility', async () => {
    const source =
        await readFile(
            INDEX_URL,
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
