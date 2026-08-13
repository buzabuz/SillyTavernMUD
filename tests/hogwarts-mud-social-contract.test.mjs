/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
    readdir,
} from 'node:fs/promises';
import test from 'node:test';

import Ajv from 'ajv';
import { parse } from 'acorn';

import {
    getSocialDirectorReducerContract,
    runSocialDirectorGraph,
} from '../src/hogwarts-mud/social-director-graph.js';
import {
    createSocialMemoryWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';
import {
    canOpenCurrentV2SaveReadOnly,
    shouldTranslateRenderedMessage,
} from '../public/scripts/extensions/hogwarts-mud/runtime/read-only-policy.js';

const V2_DIMENSIONS = Object.freeze([
    'familiarity',
    'closeness',
    'warmth',
    'trust',
    'respect',
    'influence',
    'tension',
    'resentment',
    'fear',
    'protectiveness',
]);
const STRUCTURAL_TAGS = Object.freeze([
    'family',
    'authority',
    'classmate',
    'rivalry',
    'mentor',
]);
const EMOTIONS = Object.freeze([
    'anger',
    'fear',
    'contempt',
    'disgust',
    'envy',
    'shame',
    'guilt',
    'gratitude',
    'admiration',
    'hope',
    'disappointment',
    'relief',
    'pity',
    'joy',
    'distress',
]);
const LEGACY_FIELDS = Object.freeze([
    'affinity',
    'weightDelta',
    'type',
]);
const INDEX_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/index.js',
    import.meta.url,
);
const HOST_EVENTS_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/runtime/host-events.js',
    import.meta.url,
);
const SETTINGS_CONTROLLER_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/ui/settings-profile-controller.js',
    import.meta.url,
);
const SOCIAL_SCHEMA_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/domain/social-schema.js',
    import.meta.url,
);

function findFunctionNode(program, name) {
    const pending = [...program.body];
    while (pending.length) {
        const node = pending.shift();
        const declaration = node.type ===
            'ExportNamedDeclaration'
            ? node.declaration
            : node;
        if (
            declaration?.type ===
                'FunctionDeclaration' &&
            declaration.id?.name === name
        ) {
            return declaration;
        }
        if (
            declaration?.type ===
                'FunctionDeclaration'
        ) {
            pending.push(
                ...declaration.body.body,
            );
        }
    }
    return null;
}

function collectCalledFunctions(node) {
    const calls = [];
    const visit = value => {
        if (!value || typeof value !== 'object') {
            return;
        }
        if (
            value.type === 'CallExpression' &&
            value.callee?.type === 'Identifier'
        ) {
            calls.push(value.callee.name);
        }
        for (const child of Object.values(value)) {
            if (Array.isArray(child)) {
                child.forEach(visit);
            } else {
                visit(child);
            }
        }
    };
    visit(node);
    return calls;
}

async function readProductionSocialSources() {
    const directories = [
        new URL(
            '../public/scripts/extensions/hogwarts-mud/',
            import.meta.url,
        ),
        new URL(
            '../src/hogwarts-mud/',
            import.meta.url,
        ),
    ];
    const urls = [
        new URL(
            '../src/endpoints/hogwarts-mud.js',
            import.meta.url,
        ),
        new URL(
            '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js',
            import.meta.url,
        ),
        SOCIAL_SCHEMA_URL,
    ];
    for (const directory of directories) {
        const entries = await readdir(
            directory,
            {
                withFileTypes: true,
            },
        );
        urls.push(
            ...entries
                .filter(entry =>
                    entry.isFile() &&
                    entry.name.endsWith('.js'))
                .map(entry =>
                    new URL(
                        entry.name,
                        directory,
                    )),
        );
    }
    return Promise.all(
        urls.map(async url => ({
            url,
            source:
                await readFile(url, 'utf8'),
        })),
    );
}

function removeCentralMigrationParser(
    entry,
    migrationStart,
    migrationEnd,
) {
    if (
        entry.url.href !==
        SOCIAL_SCHEMA_URL.href
    ) {
        return entry.source;
    }
    return entry.source.slice(
        0,
        migrationStart,
    ) + entry.source.slice(
        migrationEnd,
    );
}

function createModelPayload() {
    return {
        scanComplete: true,
        reviewAfterTurns: 10,
        reviews: [],
        statements: [],
        schemaOperations: [],
        relationshipEvidence: [{
            sourceActorId: 'ron',
            targetActorId: 'player',
            sceneId: 'social_contract_scene',
            eventKind: 'harm',
            dimensionDeltas:
                V2_DIMENSIONS.map(
                    dimension => ({
                        dimension,
                        delta: 7,
                        impact: 'major',
                    }),
                ),
            structuralTags: [
                ...STRUCTURAL_TAGS,
            ],
            emotionAppraisals:
                EMOTIONS
                    .slice(0, 4)
                    .map((emotion, index) => ({
                        emotion,
                        intensity: index + 1,
                        sourceMessageIds: [101],
                    })),
            summaryEn:
                'Ron caused a serious, witnessed social injury.',
            witnessedBy: [
                'player',
                'ron',
            ],
            sourceMessageIds: [101],
        }],
    };
}

function getLegacyFieldValue(field) {
    return field === 'type'
        ? 'affinity'
        : 5;
}

function createGraphInput(
    relationshipEvidence,
) {
    return {
        sceneId: 'social_contract_scene',
        clock: '1991-10-31 · 20:00',
        turn: 50,
        actorIds: ['ron'],
        presentActorIds: ['ron'],
        allowedMessageIds: [
            101,
            102,
            103,
        ],
        messageSceneIds: {
            101: 'social_contract_scene',
            102: 'social_contract_scene',
            103: 'social_contract_scene',
        },
        witnessActorIdsByMessageId: {
            101: ['player', 'ron'],
            102: ['player', 'ron'],
            103: ['player', 'ron'],
        },
        existingGraph: {
            version: 2,
            statements: [],
            relationshipEvidence: [],
            relationships: [],
            lastProcessedMessageId: 100,
        },
        extraction: {
            reviews: [],
            statements: [],
            relationshipEvidence,
        },
    };
}

test('[defect-probing] passive current-v2 save loading never starts translation or chat persistence', async () => {
    const [indexSource, hostEventsSource, settingsSource] =
        await Promise.all([
            readFile(INDEX_URL, 'utf8'),
            readFile(HOST_EVENTS_URL, 'utf8'),
            readFile(
                SETTINGS_CONTROLLER_URL,
                'utf8',
            ),
        ]);
    const indexProgram = parse(indexSource, {
        ecmaVersion: 'latest',
        sourceType: 'module',
    });
    const hostEventsProgram = parse(
        hostEventsSource,
        {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
    );
    const settingsProgram = parse(
        settingsSource,
        {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
    );
    const registerEvents =
        findFunctionNode(
            hostEventsProgram,
            'registerEvents',
        );
    const init =
        findFunctionNode(
            indexProgram,
            'init',
        );
    const setTranslationProvider =
        findFunctionNode(
            settingsProgram,
            'setTranslationProvider',
        );

    assert.ok(registerEvents);
    assert.ok(init);
    assert.ok(setTranslationProvider);
    assert.equal(
        collectCalledFunctions(
            registerEvents,
        ).includes(
            'translateExistingMessages',
        ),
        false,
        'APP_READY and CHAT_CHANGED are passive load events and must not translate stored messages',
    );
    assert.equal(
        collectCalledFunctions(init)
            .includes(
                'translateExistingMessages',
            ),
        false,
        'extension initialization must not translate or save an already-current v2 chat',
    );
    assert.equal(
        collectCalledFunctions(
            registerEvents,
        ).includes(
            'translateMessage',
        ),
        true,
        'newly rendered or explicitly updated messages must retain their translation path',
    );
    assert.equal(
        collectCalledFunctions(
            registerEvents,
        ).includes(
            'shouldTranslateRenderedMessage',
        ),
        true,
        'passive rendered-message events must be gated before they can translate or save stored chat data',
    );
    assert.equal(
        collectCalledFunctions(
            setTranslationProvider,
        ).includes(
            'refreshTranslationsForProvider',
        ),
        true,
        'an explicit provider change must retain the user-triggered refresh path',
    );

    const currentSave = {
        fileName:
            'tina-current.jsonl',
        storageCharacterId: 4,
    };
    const currentState = {
        socialGraph: {
            version: 2,
            extractorVersion: 6,
            lastProcessedMessageId:
                191,
        },
    };
    assert.equal(
        canOpenCurrentV2SaveReadOnly(
            currentSave,
            {
                currentChatId:
                        'tina-current',
                characterId: 4,
                chatLength: 192,
                state: currentState,
            },
        ),
        true,
        'a current, fully processed v2 save must open without reinstalling and saving its snapshot',
    );
    assert.equal(
        canOpenCurrentV2SaveReadOnly(
            currentSave,
            {
                currentChatId:
                        'tina-current',
                characterId: 4,
                chatLength: 193,
                state: currentState,
            },
        ),
        false,
        'a behind cursor must retain the migration and catch-up load path',
    );
    assert.equal(
        canOpenCurrentV2SaveReadOnly(
            currentSave,
            {
                currentChatId:
                        'another-save',
                characterId: 4,
                chatLength: 192,
                state: currentState,
            },
        ),
        false,
        'a different save must retain the snapshot installation path',
    );
    assert.equal(
        shouldTranslateRenderedMessage(
            191,
            currentState,
        ),
        false,
        'a rendered message already covered by the current v2 cursor is passive load data',
    );
    assert.equal(
        shouldTranslateRenderedMessage(
            192,
            currentState,
        ),
        true,
        'a newly rendered message beyond the current v2 cursor must retain automatic translation',
    );
    assert.equal(
        shouldTranslateRenderedMessage(
            191,
            {
                socialGraph: {
                    version: 1,
                    lastProcessedMessageId:
                            191,
                },
            },
        ),
        true,
        'legacy saves must retain their migration-era rendering path',
    );
});

test('actual Social Director prompt and JSON Schema expose only the v2 relationship contract', async () => {
    const browserContract =
        createSocialMemoryWorkflow({
            buildSocialAudienceProjection:
                () => ({
                    relationships: [],
                }),
            normalizeActorMemoryProfile:
                actor => ({
                    ...actor,
                    sharedMemories: [],
                }),
            normalizeSocialGraph:
                graph => ({
                    statements: [],
                    relationshipEvidence: [],
                    relationships: [],
                    lastProcessedMessageId: -1,
                    ...(graph || {}),
                }),
            selectSharedMemoriesForContext:
                () => [],
        });
    const promptMessages =
        browserContract
            .createMemoryConsolidationPrompt(
                {
                    actorLibrary: [{
                        id: 'ron',
                        nameEn: 'Ron Weasley',
                        socialRelationships: [{
                            sourceActorId:
                                'ron',
                            targetActorId:
                                'player',
                            affinity: 99,
                        }],
                    }],
                    socialGraph: {
                        statements: [],
                        relationshipEvidence:
                            [],
                        relationships: [],
                        lastProcessedMessageId:
                            -1,
                    },
                    clock:
                        '1991-10-31 · 20:00',
                    turn: {
                        count: 50,
                    },
                },
                {
                    actors: [{
                        id: 'ron',
                    }],
                },
                {
                    backfill: false,
                    messages: [],
                    allowedMessageIds: [],
                },
                {},
            );
    const systemPrompt =
        promptMessages[0].content;
    const schema =
        structuredClone(
            browserContract
                .SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
        );
    const evidenceSchema =
        schema.value.properties
            .relationshipEvidence.items;

    assert.equal(
        schema.strict,
        true,
    );
    assert.equal(
        evidenceSchema.additionalProperties,
        false,
    );
    assert.deepEqual(
        evidenceSchema.properties
            .dimensionDeltas.items
            .properties.dimension.enum,
        V2_DIMENSIONS,
    );
    assert.deepEqual(
        evidenceSchema.properties
            .structuralTags.items.enum,
        STRUCTURAL_TAGS,
    );
    assert.deepEqual(
        evidenceSchema.properties
            .emotionAppraisals.items
            .properties.emotion.enum,
        EMOTIONS,
    );
    assert.deepEqual(
        evidenceSchema.required,
        [
            'sourceActorId',
            'targetActorId',
            'sceneId',
            'eventKind',
            'dimensionDeltas',
            'structuralTags',
            'emotionAppraisals',
            'summaryEn',
            'witnessedBy',
            'sourceMessageIds',
        ],
    );
    for (const field of [
        ...V2_DIMENSIONS,
        'dimensionDeltas',
        'structuralTags',
        'emotionAppraisals',
    ]) {
        assert.match(
            systemPrompt,
            new RegExp(`\\b${field}\\b`, 'u'),
        );
    }
    assert.match(
        systemPrompt,
        /Closeness anchors: 0 none, 10 first met, 20 acquaintance, 35 friend, 50 close friend, 70 confidant\/high intimacy, 90 lifelong\/family-grade bond/u,
    );
    assert.match(
        systemPrompt,
        /Impact bands: trace=1; minor=2-3; meaningful=4-6; major=7-12; defining=13-18/u,
    );
    assert.doesNotMatch(
        systemPrompt,
        /\b(?:affinity|weightDelta)\b/u,
    );

    const validate =
        new Ajv({
            allErrors: true,
        }).compile(schema.value);
    assert.equal(
        validate(createModelPayload()),
        true,
        JSON.stringify(validate.errors),
    );
    for (const field of LEGACY_FIELDS) {
        const legacyPayload =
            createModelPayload();
        legacyPayload
            .relationshipEvidence[0][field] =
            getLegacyFieldValue(field);
        assert.equal(
            validate(legacyPayload),
            false,
            `${field} must not pass the model JSON Schema`,
        );
        assert.equal(
            validate.errors.some(error =>
                error.keyword ===
                    'additionalProperties' &&
                error.params
                    .additionalProperty ===
                    field),
            true,
        );
    }
});

test('legacy relationship field names exist only inside the centralized v1 migration parser', async () => {
    const sources =
        await readProductionSocialSources();
    const schema =
        sources.find(entry =>
            entry.url.href ===
            SOCIAL_SCHEMA_URL.href);
    assert.ok(schema);
    const migrationStart =
        schema.source.indexOf(
            'export function parseSocialGraphV1MigrationInput(',
        );
    const migrationEnd =
        schema.source.indexOf(
            '\nexport function normalizeEmotionAppraisals(',
            migrationStart,
        );
    assert.ok(migrationStart >= 0);
    assert.ok(migrationEnd > migrationStart);
    const migrationSource =
        schema.source.slice(
            migrationStart,
            migrationEnd,
        );
    for (const field of [
        'affinity',
        'weightDelta',
    ]) {
        assert.match(
            migrationSource,
            new RegExp(`\\b${field}\\b`, 'u'),
        );
    }

    for (const entry of sources) {
        const auditedSource =
            removeCentralMigrationParser(
                entry,
                migrationStart,
                migrationEnd,
            );
        assert.doesNotMatch(
            auditedSource,
            /\b(?:affinity|weightDelta)\b/u,
            entry.url.pathname,
        );
    }
});

test('validator and LangGraph reducer commit all v2 dimensions, structural tags, and emotion appraisals', async () => {
    const reducerContract =
        getSocialDirectorReducerContract();
    assert.deepEqual(
        reducerContract.dimensions,
        V2_DIMENSIONS,
    );
    assert.deepEqual(
        reducerContract.structuralTags,
        STRUCTURAL_TAGS,
    );
    assert.deepEqual(
        reducerContract.emotions,
        EMOTIONS,
    );

    const modelEvidence =
        createModelPayload()
            .relationshipEvidence[0];
    const result =
        await runSocialDirectorGraph(
            createGraphInput([
                modelEvidence,
            ]),
        );
    const committedEvidence =
        result.socialGraph
            .relationshipEvidence[0];
    const edge =
        result.socialGraph.relationships[0];

    assert.deepEqual(
        committedEvidence
            .dimensionDeltas
            .map(item => item.dimension),
        V2_DIMENSIONS,
    );
    assert.deepEqual(
        Object.fromEntries(
            V2_DIMENSIONS.map(dimension => [
                dimension,
                edge[dimension],
            ]),
        ),
        Object.fromEntries(
            V2_DIMENSIONS.map(dimension => [
                dimension,
                7,
            ]),
        ),
    );
    assert.deepEqual(
        edge.structuralTags,
        STRUCTURAL_TAGS,
    );
    assert.deepEqual(
        edge.activeEmotions.map(item =>
            item.emotion),
        EMOTIONS.slice(0, 4),
    );
    assert.deepEqual(
        result.rejected,
        [],
    );
    assert.equal(
        Object.hasOwn(edge, 'affinity'),
        false,
    );
    assert.equal(
        Object.hasOwn(
            committedEvidence,
            'weightDelta',
        ),
        false,
    );
});

test('[defect-probing] validator rejects legacy relationship fields before reducer commit', async () => {
    const legacyEvidence =
        LEGACY_FIELDS.map(
            (field, index) => ({
                sourceActorId: 'ron',
                targetActorId: 'player',
                sceneId:
                    'social_contract_scene',
                eventKind: 'harm',
                dimensionDeltas: [],
                structuralTags: [],
                emotionAppraisals: [],
                summaryEn:
                    `Legacy ${field} proposal.`,
                witnessedBy: [
                    'player',
                    'ron',
                ],
                sourceMessageIds: [
                    101 + index,
                ],
                [field]:
                    getLegacyFieldValue(
                        field,
                    ),
            }),
        );
    const result =
        await runSocialDirectorGraph(
            createGraphInput(
                legacyEvidence,
            ),
        );

    assert.deepEqual(
        result.acceptedEvidenceIds,
        [],
    );
    assert.deepEqual(
        result.socialGraph
            .relationshipEvidence,
        [],
    );
    assert.deepEqual(
        result.socialGraph.relationships,
        [],
    );
    assert.deepEqual(
        result.rejected.map(entry => ({
            kind: entry.kind,
            reason: entry.reason,
            fields: entry.fields,
        })),
        LEGACY_FIELDS.map(field => ({
            kind:
                'relationship_evidence',
            reason:
                'unknown_contract_field',
            fields: [field],
        })),
    );
});
