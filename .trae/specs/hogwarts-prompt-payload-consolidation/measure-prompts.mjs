#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    mkdir,
    readFile,
    stat,
    writeFile,
} from 'node:fs/promises';
import {
    parse as parseJavaScript,
} from 'acorn';
import path from 'node:path';

import * as domain from '../../../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    createLocalSemanticAdapter,
} from '../../../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import {
    parseItemOperationDirectives,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import {
    migrateInteriorMountAuthority,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/interior-mount.js';
import {
    migrateActorContextV1,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    migrateLanguageAuthorityV1,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/language-authority-migration.js';
import {
    NPC_IDENTITY_PROMPT_BOUNDARY,
    buildNpcIdentityPromptProjection,
    projectNpcRuntimeActorsForPrompt,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    synchronizeHeldItemLocations,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    buildFollowMovementContext,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/movement.js';
import {
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    getDeterministicTimePolicy,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import {
    projectPeoplePanel,
} from '../../../public/scripts/extensions/hogwarts-mud/people-projection.js';
import {
    PRESET_WORLD_MAP,
} from '../../../public/scripts/extensions/hogwarts-mud/world-data.js';
import {
    createDirectorWorkflows,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createHighCalendarDirectorPrompt,
    createHighCalendarDirectorWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/high-calendar-director.js';
import {
    createInteriorMapWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/interior-map.js';
import {
    createMediumCalendarDirectorPrompt,
    createMediumCalendarDirectorWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/medium-calendar-director.js';
import {
    createOpeningWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import {
    createSceneTransitionWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createSocialMemoryWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';
import {
    createTurnPerformanceWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    IDENTITY_OBSERVATION_JSON_SCHEMA,
    IDENTITY_OBSERVATION_SYSTEM_RULES,
} from '../../../src/hogwarts-mud/identity-observation-contract.js';
import {
    createDynamicIdentityModelRequest,
} from '../../../src/hogwarts-mud/dynamic-identity-observer.js';
import {
    createDynamicInventoryModelRequest,
} from '../../../src/hogwarts-mud/inventory-observation-contract.js';
import {
    createDynamicTurnModelRequest,
} from '../../../src/hogwarts-mud/dynamic-turn-observer.js';
import {
    PRE_TURN_EVIDENCE_ROUTE_JSON_SCHEMA,
} from '../../../src/hogwarts-mud/pre-turn-route-contract.js';
import {
    movementIntentJsonSchema,
} from '../../../src/hogwarts-mud/pre-turn-movement-contract.js';
import {
    PRE_TURN_SYSTEM,
    createPreTurnSystemPrompt,
} from '../../../src/hogwarts-mud/pre-turn-system-prompt.js';
import {
    POST_TURN_SYSTEM,
} from '../../../src/hogwarts-mud/post-turn-system-prompt.js';
import {
    postTurnJsonSchema,
} from '../../../src/hogwarts-mud/post-turn-transport-contract.js';

const TINA_FILE = path.resolve(
    process.env
        .HOGWARTS_PROMPT_MEASURE_ARCHIVE_PATH ||
    (
        'data/default-user/chats/Hogwarts_World_Director/' +
        'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl'
    ),
);
const encoder = new TextEncoder();

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function metric(value, serialized = false) {
    const text = serialized
        ? String(value ?? '')
        : JSON.stringify(value);
    return {
        characters: text.length,
        bytes: encoder.encode(text).length,
        estimatedTokens: Math.ceil(text.length / 3),
    };
}

function countMetric(characters) {
    return {
        characters,
        bytes: characters,
        estimatedTokens:
            Math.ceil(characters / 3),
    };
}

function extractSchema(system) {
    const markers = [
        '\nProposal schema:\n',
        '\nSchema:\n',
        '\nReturn exactly:\n',
    ];
    const markerIndex = markers
        .map(marker => system.indexOf(marker))
        .filter(index => index >= 0)
        .sort((left, right) => left - right)[0];
    if (!Number.isInteger(markerIndex)) return '';
    const start = system.indexOf('{', markerIndex);
    if (start < 0) return '';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < system.length; index++) {
        const character = system[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }
        if (character === '"') {
            inString = true;
        } else if (character === '{') {
            depth++;
        } else if (character === '}') {
            depth--;
            if (depth === 0) {
                return system.slice(start, index + 1);
            }
        }
    }
    return '';
}

function promptMetric(
    prompt,
    {
        slot = null,
        transportSchema = null,
        source = '',
        audience = '',
    } = {},
) {
    const system = String(
        prompt.find(message => message.role === 'system')
            ?.content || '',
    );
    const user = String(
        prompt.find(message => message.role === 'user')
            ?.content || '',
    );
    let payload = null;
    try {
        payload = JSON.parse(user);
    } catch {
        // Prose-only user messages have no field-level metrics.
    }
    const schema = extractSchema(system);
    const separateSchema = transportSchema
        ? JSON.stringify(transportSchema)
        : '';
    const totalCharacters = prompt.reduce(
        (sum, message) =>
            sum + String(message?.content || '').length,
        0,
    );
    const contextPlan = slot
        ? domain.createContextBudgetPlan(
            slot.contextSize,
            slot.maxResponseLength,
        )
        : null;
    return {
        source,
        audience,
        system: metric(system, true),
        embeddedOutputSchema: metric(schema, true),
        transportOutputSchema: metric(separateSchema, true),
        user: metric(user, true),
        messageTotal: metric(
            prompt.map(message => message.content || '').join(''),
            true,
        ),
        transportTotal:
            countMetric(
                totalCharacters +
                separateSchema.length,
            ),
        runtimeCeilingCharacters:
            contextPlan?.maxPromptCharacters ?? null,
        exceedsRuntimeCeiling:
            contextPlan
                ? totalCharacters >
                    contextPlan.maxPromptCharacters
                : null,
        topLevelKeys: payload
            ? Object.keys(payload)
            : [],
        fields: payload
            ? Object.fromEntries(
                Object.entries(payload)
                    .map(([key, value]) => [
                        key,
                        metric(value),
                    ])
                    .sort((left, right) =>
                        right[1].characters -
                        left[1].characters),
            )
            : {},
        repeatedStrings:
            payload
                ? collectRepeatedStrings(
                    payload,
                )
                : {
                    distinctRepeatedStrings:
                        0,
                    repeatedCharacters:
                        0,
                    largest: [],
                },
    };
}

function collectRepeatedStrings(
    payload,
) {
    const occurrences =
        new Map();
    const visit = (
        value,
        topLevelKey,
    ) => {
        if (
            typeof value === 'string' &&
            value.length >= 24
        ) {
            const keys =
                occurrences.get(value) ||
                new Set();
            keys.add(topLevelKey);
            occurrences.set(
                value,
                keys,
            );
            return;
        }
        if (
            !value ||
            typeof value !== 'object'
        ) {
            return;
        }
        for (
            const child
            of Object.values(value)
        ) {
            visit(
                child,
                topLevelKey,
            );
        }
    };
    for (
        const [
            key,
            value,
        ] of Object.entries(
            payload ||
            {},
        )
    ) {
        visit(value, key);
    }
    const repeated = [
        ...occurrences,
    ]
        .filter(([
            ,
            keys,
        ]) =>
            keys.size > 1)
        .map(([
            value,
            keys,
        ]) => ({
            characters:
                value.length,
            sections:
                [...keys],
            preview:
                value.slice(0, 180),
        }))
        .sort((left, right) =>
            right.characters -
            left.characters);
    return {
        distinctRepeatedStrings:
            repeated.length,
        repeatedCharacters:
            repeated.reduce(
                (
                    sum,
                    item,
                ) =>
                    sum +
                    item.characters *
                    (
                        item.sections
                            .length -
                        1
                    ),
                0,
            ),
        largest:
            repeated.slice(0, 12),
    };
}

function evaluateStaticDeclarations(
    source,
    names,
    seeds = {},
) {
    const ast =
        parseJavaScript(
            source,
            {
                ecmaVersion:
                    'latest',
                sourceType:
                    'module',
            },
        );
    const declarations =
        new Map();
    for (const statement of ast.body) {
        const declaration =
            statement.type ===
                'ExportNamedDeclaration'
                ? statement
                    .declaration
                : statement;
        if (
            declaration?.type !==
            'VariableDeclaration'
        ) {
            continue;
        }
        for (
            const item
            of declaration.declarations
        ) {
            if (
                item.id?.type ===
                'Identifier'
            ) {
                declarations.set(
                    item.id.name,
                    item.init,
                );
            }
        }
    }
    const cache =
        new Map(
            Object.entries(
                seeds,
            ),
        );
    const evaluateIdentifier =
        name => {
            if (name === 'undefined') {
                return undefined;
            }
            if (cache.has(name)) {
                return cache.get(name);
            }
            if (!declarations.has(name)) {
                throw new Error(
                    `Static prompt evaluator cannot resolve ${name}.`,
                );
            }
            const value =
                evaluate(
                    declarations.get(
                        name,
                    ),
                );
            cache.set(name, value);
            return value;
        };
    const evaluate =
        node => {
            if (!node) return null;
            switch (node.type) {
                case 'Literal':
                    return node.value;
                case 'Identifier':
                    return evaluateIdentifier(
                        node.name,
                    );
                case 'TemplateLiteral':
                    return node.quasis
                        .map((
                            quasi,
                            index,
                        ) =>
                            quasi.value
                                .cooked +
                            (
                                index <
                                node.expressions
                                    .length
                                    ? String(
                                        evaluate(
                                            node
                                                .expressions[
                                                index
                                            ],
                                        ),
                                    )
                                    : ''
                            ))
                        .join('');
                case 'ArrayExpression':
                    return node.elements
                        .flatMap(element =>
                            element?.type ===
                                'SpreadElement'
                                ? evaluate(
                                    element
                                        .argument,
                                )
                                : [
                                    evaluate(
                                        element,
                                    ),
                                ]);
                case 'ObjectExpression':
                    return Object.fromEntries(
                        node.properties
                            .flatMap(property => {
                                if (
                                    property.type ===
                                    'SpreadElement'
                                ) {
                                    return Object
                                        .entries(
                                            evaluate(
                                                property
                                                    .argument,
                                            ),
                                        );
                                }
                                const key =
                                    property
                                        .computed
                                        ? evaluate(
                                            property.key,
                                        )
                                        : property.key
                                            .name ??
                                        property.key
                                            .value;
                                return [[
                                    key,
                                    evaluate(
                                        property
                                            .value,
                                    ),
                                ]];
                            }),
                    );
                case 'UnaryExpression': {
                    const value =
                        evaluate(
                            node.argument,
                        );
                    if (
                        node.operator ===
                        '-'
                    ) {
                        return -value;
                    }
                    if (
                        node.operator ===
                        '+'
                    ) {
                        return +value;
                    }
                    throw new Error(
                        `Unsupported unary operator ${node.operator}.`,
                    );
                }
                default:
                    throw new Error(
                        `Unsupported static prompt node ${node.type}.`,
                    );
            }
        };
    return Object.fromEntries(
        names.map(name => [
            name,
            evaluateIdentifier(name),
        ]),
    );
}

function localPromptMetric({
    system,
    input,
    jsonSchema,
    contextTokens,
    endpointInputLimit,
    source,
    audience,
}) {
    const schema =
        JSON.stringify(
            jsonSchema,
        );
    const actualSystem =
        system;
    const user =
        JSON.stringify(input);
    const promptCharacters =
        actualSystem.length +
        user.length;
    const estimatedTokens =
        Math.ceil(
            promptCharacters / 3,
        );
    return {
        source,
        audience,
        systemRules:
            metric(
                system,
                true,
            ),
        systemWithEmbeddedSchema:
            metric(
                actualSystem,
                true,
            ),
        embeddedOutputSchema:
            metric(
                '',
                true,
            ),
        transportOutputSchema:
            metric(
                schema,
                true,
            ),
        user:
            metric(
                user,
                true,
            ),
        promptTotal:
            countMetric(
                promptCharacters,
            ),
        transportTotal:
            countMetric(
                promptCharacters +
                schema.length,
            ),
        configuredContextTokens:
            contextTokens,
        estimatedPromptTokens:
            estimatedTokens,
        estimatedContextOverflow:
            estimatedTokens >
            contextTokens,
        endpointInputLimit,
        endpointInputLimitExceeded:
            user.length >
            endpointInputLimit,
        fields:
            Object.fromEntries(
                Object.entries(
                    input,
                )
                    .map(([
                        key,
                        value,
                    ]) => [
                        key,
                        metric(value),
                    ])
                    .sort((left, right) =>
                        right[1]
                            .characters -
                        left[1]
                            .characters),
            ),
        repeatedStrings:
            collectRepeatedStrings(
                input,
            ),
    };
}

function createPromptCapture() {
    const captures = [];
    return {
        captures,
        sendRoleRequest: async (
            slot,
            prompt,
            options = {},
        ) => {
            captures.push({
                slot,
                prompt: structuredClone(prompt),
                options: {
                    json:
                        options.json === true,
                    jsonSchema:
                        options.jsonSchema
                            ? structuredClone(
                                options.jsonSchema,
                            )
                            : null,
                    stream:
                        options.stream === true,
                },
            });
            return {
                content: '{}',
            };
        },
    };
}

async function writeBlindRequests(
    outputDirectory,
    requests,
) {
    if (!outputDirectory) {
        return null;
    }
    const resolved =
        path.resolve(
            outputDirectory,
        );
    await mkdir(
        resolved,
        {
            recursive: true,
        },
    );
    const manifest = [];
    for (const request of requests) {
        const serialized =
            `${JSON.stringify(
                request,
                null,
                2,
            )}\n`;
        const fileName =
            `${request.caseId}.json`;
        await writeFile(
            path.join(
                resolved,
                fileName,
            ),
            serialized,
            'utf8',
        );
        manifest.push({
            caseId:
                request.caseId,
            fileName,
            sha256:
                sha256(serialized),
            bytes:
                encoder
                    .encode(serialized)
                    .length,
        });
    }
    await writeFile(
        path.join(
            resolved,
            'manifest.json',
        ),
        `${JSON.stringify(
            {
                schemaVersion: 1,
                cases: manifest,
            },
            null,
            2,
        )}\n`,
        'utf8',
    );
    return {
        directory: resolved,
        cases: manifest,
    };
}

function createBlindRequest({
    caseId,
    taskId,
    tier,
    mode,
    prompt,
    options = {},
}) {
    return {
        schemaVersion: 1,
        caseId,
        taskId,
        tier,
        mode,
        messages:
            structuredClone(
                prompt,
            ),
        transport: {
            json:
                options.json ===
                true,
            stream:
                options.stream ===
                true,
            jsonSchema:
                options.jsonSchema
                    ? structuredClone(
                        options.jsonSchema,
                    )
                    : null,
        },
    };
}

function invalidValidation() {
    return {
        valid: false,
        errors: [
            'build-only forced repair',
        ],
    };
}

function latestPlayerAction(chat) {
    return String(
        [...chat]
            .reverse()
            .find(message =>
                message.is_user === true)
            ?.mes || '',
    );
}

function activeAddressingState(state) {
    const activeIds = new Set(
        projectPeoplePanel(state)
            .activePeople
            .map(person => person.id),
    );
    return {
        ...state,
        actors: (state.actors || [])
            .map(actor => ({
                ...actor,
                present:
                    activeIds.has(actor.id),
            })),
    };
}

function sceneTransitionPayload(state) {
    const actorStates = (state.actors || [])
        .filter(actor =>
            actor.present !== false)
        .map(actor => ({
            id: actor.id,
            present: true,
            currentActivityEn:
                actor.currentActivityEn || '',
            currentIntentEn:
                actor.currentIntentEn || '',
            lifeStatus:
                actor.lifeStatus || 'alive',
            lifeStatusPermanent:
                actor.lifeStatusPermanent === true,
            lifeStatusDetailEn:
                actor.lifeStatusDetailEn || 'Alive.',
            mapId:
                actor.mapId ||
                state.map?.activeMapId ||
                '',
            roomId:
                actor.roomId ||
                state.map?.currentLocalNodeId ||
                '',
        }));
    return {
        transitionMinutes: 15,
        nextClock: state.clock,
        closureSummaryEn:
            'The current scene closes after the committed exchange.',
        globalChronicleSummaryEn:
            'The scene closed after the participants completed their immediate exchange, preserving the established relationships, material state, and unresolved practical pressures that will continue to shape the next committed moment.',
        authorQuillEn:
            'Build-only placeholder text that is never submitted to a model.',
        unresolvedThreadsEn: [],
        nextScene: {
            id:
                `${state.scene?.id || 'scene'}_audit_next`,
            nameEn:
                state.scene?.nameEn ||
                state.location ||
                'Current Scene',
            summaryEn:
                state.scene?.summaryEn ||
                'The current situation continues.',
            chapterEn:
                state.chapter || '',
            mapId:
                state.map?.activeMapId ||
                state.scene?.mapId ||
                '',
            roomId:
                state.map?.currentLocalNodeId ||
                state.scene?.roomId ||
                '',
            actorStates,
            followingSceneIntent:
                state.scene?.nextSceneIntent || {
                    titleEn:
                        'Continue the current pressure',
                    summaryEn:
                        'Follow the established public situation.',
                    triggerEn:
                        'After the next bounded exchange.',
                    mapId:
                        state.map?.activeMapId || '',
                    roomId:
                        state.map?.currentLocalNodeId || '',
                    tier: 'medium',
                },
        },
    };
}

async function captureRepairs({
    state,
    chat,
    slots,
    playerAction,
    performanceBudget,
    contextPlans,
    actorProjector,
}) {
    const repairs = {};

    {
        const capture = createPromptCapture();
        const workflow = createOpeningWorkflow({
            CANON_WIT_TONE_CONTRACT:
                domain.CANON_WIT_TONE_CONTRACT,
            PRESET_WORLD_MAP,
            getContext: () => ({
                chat,
            }),
            getSettings: () => ({
                translationEnabled: false,
            }),
            extractRoleResponseText:
                response => response.content,
            parseJsonObject:
                value => JSON.parse(value),
            sendOpeningWorldRequest:
                capture.sendRoleRequest,
            validateOpeningWorldPackage:
                invalidValidation,
        });
        await workflow.generateOpeningPackage(
            slots.high,
            state,
        ).catch(() => {});
        repairs.openingWorld =
            structuredClone(
                capture.captures,
            );

    }

    {
        const capture = createPromptCapture();
        const workflow = createDirectorWorkflows({
            CANON_CAST_IDENTITY_CONTRACT:
                domain.CANON_CAST_IDENTITY_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain.CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain.DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY,
            analyzePacingSignals:
                domain.analyzePacingSignals,
            buildActorSelectionPolicy:
                domain.buildActorSelectionPolicy,
            buildMapAuthorityContext:
                domain.buildMapAuthorityContext,
            buildNpcIdentityPromptProjection,
            createContextBudgetPlan:
                domain.createContextBudgetPlan,
            extractRoleResponseText:
                response => response.content,
            formatRetrievedKnowledge:
                value => value,
            getContext: () => ({
                chat,
            }),
            getMudState: () => state,
            normalizePacingAssessmentPayload:
                domain.normalizePacingAssessmentPayload,
            parseJsonObject:
                value => JSON.parse(value),
            projectNpcRuntimeActorsForPrompt,
            sendPacingDirectorRequest:
                capture.sendRoleRequest,
            validatePacingAssessment:
                invalidValidation,
        });
        const pacingState =
            structuredClone(
                state,
            );
        pacingState.items = [
            ...(
                pacingState.items ||
                []
            ),
            {
                id:
                    'blind_audit_key',
                labelEn:
                    'Blind Audit Key',
                importance: 'key',
            },
        ];
        pacingState.pacingDirector = {
            status: 'idle',
            lastAssessedTurn: null,
            lastAssessedSceneId:
                '',
            reassessAfterTurns: 6,
            assessment: null,
            pendingBeat: null,
        };
        pacingState.causalCollapse =
            domain
                .normalizeCausalCollapseState();
        const pacingPlayerAction =
            'Inspect the Blind Audit Key.';
        const pacingSignals =
            domain.analyzePacingSignals(
                pacingState,
                pacingPlayerAction,
            );
        assert.equal(
            pacingSignals
                .shouldAssess,
            true,
            'Pacing blind fixture must reach an active causal-collapse opportunity.',
        );
        pacingSignals.playerAction =
            pacingPlayerAction;
        pacingSignals.selectionPlayerAction =
            pacingPlayerAction;
        pacingSignals.currentAddressing =
            null;
        capture.captures.length = 0;
        await workflow.generatePacingAssessment(
            slots.medium,
            pacingState,
            pacingSignals,
            [],
            contextPlans.medium,
        ).catch(() => {});
        repairs.pacingDirector =
            structuredClone(
                capture.captures,
            );
        repairs.directorBuilders = {
            workflow,
            pacingSignals,
            state: pacingState,
        };
    }

    {
        const capture = createPromptCapture();
        const workflow =
            createInteriorMapWorkflow({
                extractRoleResponseText:
                    response =>
                        response.content,
                getContext: () => ({
                    chat,
                }),
                getSettings: () => ({
                    translationEnabled: false,
                }),
                parseJsonObject:
                    value => JSON.parse(value),
                sendModelTaskRequest:
                    capture.sendRoleRequest,
                validateGeneratedInteriorMap:
                    invalidValidation,
            });
        const interiorState =
            structuredClone(
                state,
            );
        interiorState.map
            .activeMapId =
            'blind_container_map';
        interiorState.map
            .currentLocalNodeId =
            'blind_carriage';
        interiorState.map
            .currentLevelId =
            'ground';
        interiorState.map
            .customLocalMaps = [
                ...(
                    interiorState
                        .map
                        .customLocalMaps ||
                    []
                ),
                {
                    id:
                        'blind_container_map',
                    nameEn:
                        'Blind Test Rail Map',
                    defaultLevelId:
                        'ground',
                    levels: [{
                        id: 'ground',
                        nameEn:
                            'Ground',
                        z: 0,
                    }],
                    nodes: [{
                        id:
                            'blind_carriage',
                        nameEn:
                            'Blind Test Carriage',
                        levelId:
                            'ground',
                        kind:
                            'carriage',
                        descriptionEn:
                            'A stable passenger carriage that requires a mounted interior.',
                        tags: [
                            'requires_interior_map',
                        ],
                        x: 50,
                        y: 50,
                    }],
                    exits: [],
                },
            ];
        const request =
            domain
                .getInteriorMapRequest(
                    interiorState,
                );
        assert.equal(
            request?.status,
            'missing',
            'Interior blind fixture must reach the production missing-interior trigger.',
        );
        await workflow.generateInteriorMapPackage(
            slots.medium,
            interiorState,
            request,
        ).catch(() => {});
        repairs.interiorMap =
            structuredClone(
                capture.captures,
            );
        repairs.interiorBuilder = {
            workflow,
            request,
            state:
                interiorState,
        };
    }

    {
        const capture = createPromptCapture();
        const workflow =
            createHighCalendarDirectorWorkflow({
                extractRoleResponseText:
                    response =>
                        response.content,
                parseJsonObject:
                    value => JSON.parse(value),
                sendModelTaskRequest:
                    capture.sendRoleRequest,
            });
        await workflow.generateHighCalendarProposal(
            slots.high,
            state,
            'high_transition',
        ).catch(() => {});
        repairs.highCalendar =
            capture.captures;
    }

    {
        const capture = createPromptCapture();
        const workflow =
            createMediumCalendarDirectorWorkflow({
                buildMapAuthorityContext:
                    domain.buildMapAuthorityContext,
                extractRoleResponseText:
                    response =>
                        response.content,
                getContext: () => ({
                    chat,
                }),
                parseJsonObject:
                    value => JSON.parse(value),
                sendModelTaskRequest:
                    capture.sendRoleRequest,
            });
        await workflow.generateMediumCalendarProposal(
            slots.medium,
            state,
            {
                reasons: [
                    'build_only_audit',
                ],
                explicitCommitment: '',
            },
            domain.advanceWorldClock(
                state.clock,
                14 * 24 * 60,
            ),
        ).catch(() => {});
        repairs.mediumCalendar =
            capture.captures;
    }

    {
        const capture = createPromptCapture();
        const workflow =
            createSceneTransitionWorkflow({
                CANON_CAST_IDENTITY_CONTRACT:
                    domain.CANON_CAST_IDENTITY_CONTRACT,
                CANON_WIT_TONE_CONTRACT:
                    domain.CANON_WIT_TONE_CONTRACT,
                CONTEXT_SIZE_PRESETS:
                    domain.CONTEXT_SIZE_PRESETS,
                DEFAULT_MODEL_SLOTS:
                    domain.DEFAULT_MODEL_SLOTS,
                NPC_IDENTITY_PROMPT_BOUNDARY,
                buildActorContinuityCapsules:
                    domain.buildActorContinuityCapsules,
                buildBehavioralEnvironment:
                    domain.buildBehavioralEnvironment,
                buildCurrentMaterialState:
                    domain.buildCurrentMaterialState,
                buildMapAuthorityContext:
                    domain.buildMapAuthorityContext,
                buildSceneCastRotationPolicy:
                    domain.buildSceneCastRotationPolicy,
                createContextBudgetPlan:
                    domain.createContextBudgetPlan,
                extractRoleResponseText:
                    response =>
                        response.content,
                formatRetrievedKnowledge:
                    value => value,
                getContext: () => ({
                    chat,
                }),
                getSceneDestinationAuthority:
                    domain.getSceneDestinationAuthority,
                parseJsonObject:
                    value => JSON.parse(value),
                projectActorLibraryForContext:
                    actorProjector,
                projectNpcRuntimeActorsForPrompt,
                sendSceneOpeningRequest:
                    capture.sendRoleRequest,
                sendSceneTransitionRequest:
                    capture.sendRoleRequest,
                stripSyntheticSceneOpeningActorSegments:
                    domain.stripSyntheticSceneOpeningActorSegments,
                synchronizeHeldItemLocations,
                validateSceneTransitionPackage:
                    invalidValidation,
            });
        const expectedDestination = {
            mapId:
                state.map?.activeMapId ||
                state.scene?.mapId ||
                '',
            roomId:
                state.map?.currentLocalNodeId ||
                state.scene?.roomId ||
                '',
        };
        await workflow.generateSceneTransitionPackage(
            slots.medium,
            state,
            'medium',
            state.location,
            expectedDestination,
            null,
            [],
            contextPlans.medium,
        ).catch(() => {});
        repairs.sceneTransition =
            structuredClone(
                capture.captures,
            );

        let runtimeOpeningPayload =
            sceneTransitionPayload(
                state,
            );
        const blindTransitionResponsePath =
            String(
                process.env
                    .HOGWARTS_BLIND_SCENE_TRANSITION_RESPONSE ||
                '',
            ).trim();
        if (blindTransitionResponsePath) {
            const parsed =
                domain
                    .parseCompleteJsonObject(
                        await readFile(
                            path.resolve(
                                blindTransitionResponsePath,
                            ),
                            'utf8',
                        ),
                    );
            if (
                parsed.nextScene &&
                typeof parsed
                    .nextScene ===
                    'object'
            ) {
                delete parsed
                    .nextScene
                    .openingSegments;
            }
            runtimeOpeningPayload =
                domain
                    .normalizeSceneTransitionPackage(
                        parsed,
                        state,
                        {
                            tier:
                                'medium',
                        },
                    );
        }
        capture.captures.length = 0;
        await workflow.generateSceneTransitionOpening(
            slots.low,
            state,
            runtimeOpeningPayload,
            expectedDestination,
            contextPlans.low,
            {},
            [],
        ).catch(() => {});
        repairs.sceneOpening =
            structuredClone(
                capture.captures,
            );
        repairs.sceneTransitionBuilder = {
            workflow,
            expectedDestination,
        };
    }

    {
        const capture = createPromptCapture();
        const workflow =
            createTurnPerformanceWorkflow({
                CANON_CAST_IDENTITY_CONTRACT:
                    domain.CANON_CAST_IDENTITY_CONTRACT,
                CANON_WIT_TONE_CONTRACT:
                    domain.CANON_WIT_TONE_CONTRACT,
                CONTEXT_SIZE_PRESETS:
                    domain.CONTEXT_SIZE_PRESETS,
                DEFAULT_MODEL_SLOTS:
                    domain.DEFAULT_MODEL_SLOTS,
                NPC_IDENTITY_PROMPT_BOUNDARY,
                beginLiveSceneStream: () => {},
                buildBehavioralEnvironment:
                    domain.buildBehavioralEnvironment,
                buildCurrentMaterialState:
                    domain.buildCurrentMaterialState,
                buildSpatialContext:
                    domain.buildSpatialContext,
                buildStructuredPlayerTurnSequence:
                    domain.buildStructuredPlayerTurnSequence,
                buildTemporaryActorPromotionPolicy:
                    domain.buildTemporaryActorPromotionPolicy,
                createContextBudgetPlan:
                    domain.createContextBudgetPlan,
                extractRoleResponseText:
                    response =>
                        response.content,
                getActiveAddressingState:
                    activeAddressingState,
                getAuthoritativeSceneSpells:
                    domain.getAuthoritativeSceneSpells,
                getRequestHeaders: () => ({}),
                getSettings: () => ({
                    translationEnabled: false,
                }),
                parseItemOperationDirectives,
                parseJsonObject:
                    value => JSON.parse(value),
                recoverScenePerformancePayload:
                    () => null,
                removeExplicitAddressDirective:
                    domain.removeExplicitAddressDirective,
                resolvePlayerAddressing:
                    domain.resolvePlayerAddressing,
                resolveTemporaryActorRevealedName:
                    domain.resolveTemporaryActorRevealedName,
                sendModelTaskRequest:
                    capture.sendRoleRequest,
                setLiveSceneStreamPhase: () => {},
                settleNarrativeTurnPerformance:
                    payload => payload,
                translateOpeningValues:
                    async values => values,
                updateLiveSceneStream: () => {},
                validateScenePerformance:
                    invalidValidation,
            });
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({
                performance: {
                    segments: [],
                },
            }),
        });
        try {
            await workflow.generateScenePerformance(
                slots.low,
                state,
                playerAction,
                performanceBudget,
                [],
                null,
                null,
                null,
                null,
                [],
                contextPlans.low,
            ).catch(error => {
                if (!capture.captures.length) {
                    throw error;
                }
            });
        } finally {
            globalThis.fetch =
                originalFetch;
        }
        repairs.scenePerformance =
            capture.captures;
        repairs.turnBuilder =
            workflow;
    }

    return repairs;
}

async function main() {
    const beforeContents =
        await readFile(TINA_FILE);
    const beforeStat =
        await stat(TINA_FILE);
    const rows =
        beforeContents.toString('utf8')
            .trimEnd()
            .split(/\r?\n/u)
            .map(line =>
                JSON.parse(line));
    const sourceChat =
        structuredClone(
            rows.slice(1),
        );
    const actorContextMigration =
        migrateActorContextV1(
            structuredClone(
                rows[0]
                    .chat_metadata
                    .hogwartsMud,
            ),
            sourceChat,
        );
    const migration =
        domain.migrateTimelineAppraisalLifecycleV4(
            actorContextMigration
                .state,
            sourceChat,
        );
    const languageMigration =
        migration.state
            .languageAuthorityVersion ===
        1
            ? {
                changed: false,
                nextState:
                    migration.state,
                nextChat:
                    sourceChat,
                report: {
                    schemaVersion: 1,
                    timelineEntries: 0,
                    changes: [],
                    rawSegmentCount: 0,
                    skippedRecordCount: 0,
                },
            }
            : migrateLanguageAuthorityV1({
                worldState:
                    migration.state,
                chat:
                    sourceChat,
            });
    const interiorMountMigration =
        migrateInteriorMountAuthority(
            languageMigration
                .nextState,
        );
    const state =
        interiorMountMigration.state;
    const chat =
        languageMigration
            .nextChat;
    const slots =
        domain.normalizeModelSlots(
            state.modelSlots,
        );
    const contextPlans =
        Object.fromEntries(
            Object.entries(slots)
                .map(([role, slot]) => [
                    role,
                    domain.createContextBudgetPlan(
                        slot.contextSize,
                        slot.maxResponseLength,
                    ),
                ]),
        );
    const playerAction =
        latestPlayerAction(chat);
    assert.ok(
        playerAction,
        'Tina save must have a player action.',
    );
    const performanceBudget =
        domain.createTurnPerformanceBudget(
            playerAction,
            {},
            {
                activeNamedActorCount:
                    projectPeoplePanel(state)
                        .activePeople
                        .length,
            },
        );

    const directorFactory =
        createDirectorWorkflows({
            CANON_CAST_IDENTITY_CONTRACT:
                domain.CANON_CAST_IDENTITY_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain.CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain.DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY,
            analyzePacingSignals:
                domain.analyzePacingSignals,
            buildActorSelectionPolicy:
                domain.buildActorSelectionPolicy,
            buildMapAuthorityContext:
                domain.buildMapAuthorityContext,
            buildNpcIdentityPromptProjection,
            createContextBudgetPlan:
                domain.createContextBudgetPlan,
            formatRetrievedKnowledge:
                value => value,
            getContext: () => ({
                chat,
            }),
            getMudState: () => state,
            getWorldDate:
                domain.getWorldDate,
            normalizePacingAssessmentPayload:
                domain.normalizePacingAssessmentPayload,
            projectNpcRuntimeActorsForPrompt,
        });

    const captures =
        await captureRepairs({
            state,
            chat,
            slots,
            playerAction,
            performanceBudget,
            contextPlans,
            actorProjector:
                directorFactory
                    .projectActorLibraryForContext,
        });

    const prompts = {};
    const addCaptures = (
        key,
        entries,
        role,
        source,
    ) => {
        entries.forEach(
            (
                entry,
                index,
            ) => {
                prompts[
                    index === 0
                        ? key
                        : `${key}.repair${index}`
                ] = promptMetric(
                    entry.prompt,
                    {
                        slot:
                            slots[role],
                        transportSchema:
                            entry.options
                                ?.jsonSchema ||
                            null,
                        source,
                        audience:
                            role,
                    },
                );
            },
        );
    };

    addCaptures(
        'opening.world',
        captures.openingWorld,
        'high',
        'workflows/opening.js::generateOpeningPackage',
    );
    addCaptures(
        'pacing',
        captures.pacingDirector,
        'medium',
        'workflows/directors.js::generatePacingAssessment',
    );
    addCaptures(
        'interiorMap',
        captures.interiorMap,
        'medium',
        'workflows/interior-map.js::generateInteriorMapPackage',
    );
    addCaptures(
        'calendar.high',
        captures.highCalendar,
        'high',
        'workflows/high-calendar-director.js::generateHighCalendarProposal',
    );
    addCaptures(
        'calendar.medium',
        captures.mediumCalendar,
        'medium',
        'workflows/medium-calendar-director.js::generateMediumCalendarProposal',
    );
    addCaptures(
        'sceneTransition',
        captures.sceneTransition,
        'medium',
        'workflows/scene-transition.js::generateSceneTransitionPackage',
    );
    addCaptures(
        'sceneOpening',
        captures.sceneOpening,
        'low',
        'workflows/scene-transition.js::generateSceneTransitionOpening',
    );
    addCaptures(
        'scenePerformance',
        captures.scenePerformance,
        'low',
        'workflows/turn-performance.js::generateScenePerformance',
    );

    const openingPrompt =
        createOpeningWorkflow({
            CANON_WIT_TONE_CONTRACT:
                domain.CANON_WIT_TONE_CONTRACT,
            PRESET_WORLD_MAP,
        }).createBootstrapSceneOpeningPrompt(
            state,
        );
    prompts['opening.bootstrapScene'] =
        promptMetric(openingPrompt, {
            slot: slots.low,
            source:
                'workflows/opening.js::createBootstrapSceneOpeningPrompt',
            audience: 'low',
        });

    prompts['calendar.high.openingWorld'] =
        promptMetric(
            createHighCalendarDirectorPrompt(
                state,
                {
                    trigger:
                        'opening_world',
                },
            ),
            {
                slot: slots.high,
                source:
                    'workflows/high-calendar-director.js::createHighCalendarDirectorPrompt',
                audience: 'high',
            },
        );
    prompts['calendar.medium.builder'] =
        promptMetric(
            createMediumCalendarDirectorPrompt(
                state,
                {
                    trigger: {
                        reasons: [
                            'build_only_audit',
                        ],
                    },
                    recentPlayerActions:
                        chat.filter(message =>
                            message.is_user)
                            .map(message =>
                                message.mes),
                    mapAuthority:
                        domain.buildMapAuthorityContext(
                            state,
                        ),
                },
            ),
            {
                slot: slots.medium,
                source:
                    'workflows/medium-calendar-director.js::createMediumCalendarDirectorPrompt',
                audience: 'medium',
            },
        );

    const socialState =
        structuredClone(state);
    socialState.socialGraph
        .lastProcessedMessageId = -1;
    const socialWorkflow =
        createSocialMemoryWorkflow({
            CONTEXT_SIZE_PRESETS:
                domain.CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain.DEFAULT_MODEL_SLOTS,
            SOCIAL_GRAPH_EXTRACTOR_VERSION,
            analyzeMemoryConsolidation:
                domain.analyzeMemoryConsolidation,
            buildSocialAudienceProjection:
                domain.buildSocialAudienceProjection,
            createContextBudgetPlan:
                domain.createContextBudgetPlan,
            getContext: () => ({
                chat,
            }),
            normalizeSocialGraph:
                domain.normalizeSocialGraph,
        });
    const evidence =
        socialWorkflow
            .collectSocialDirectorEvidence(
                socialState,
                {
                    backfill: true,
                },
            );
    const signals =
        domain.analyzeMemoryConsolidation(
            socialState,
        );
    const socialPrompt =
        socialWorkflow
            .createMemoryConsolidationPrompt(
                socialState,
                signals,
                evidence,
                contextPlans.medium,
            );
    prompts.social =
        promptMetric(
            socialPrompt,
            {
                slot: slots.medium,
                transportSchema:
                    socialWorkflow
                        .SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
                source:
                    'workflows/social-memory.js::createMemoryConsolidationPrompt',
                audience: 'medium',
            },
        );

    const mapPrompt = [
        {
            role: 'system',
            content:
                `You are the World Director for a persistent Harry Potter RPG. First search the supplied preset world and local-map catalog. Propose a new top-level location only when no preset room or location can represent the physical place created by the event. Use English for every semantic prose field. Output one JSON object and no prose:
{"id":"string","reasonEn":"English reason","changes":[{"operation":"add|update","node":{"id":"snake_case","regionId":"existing region id","nameEn":"English canonical name","kind":"string","summaryEn":"English canonical summary","access":"public|student|restricted|dangerous|forbidden","x":0,"y":0}}]}
Never delete or rename a preset location. Ordinary movement and scene description require no proposal.`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                trigger: 'exploration',
                currentLocation: {
                    mapId:
                        state.map
                            ?.activeMapId ||
                        '',
                    roomId:
                        state.map
                            ?.currentLocalNodeId ||
                        '',
                },
                character:
                    domain
                        .projectCharacterForPrompt(
                            state
                                .character,
                        ),
                mapAuthority:
                    domain.buildMapAuthorityContext(
                        state,
                        {
                            purpose:
                                'expansion',
                        },
                    ),
            }),
        },
    ];
    prompts.mapExpansion =
        promptMetric(mapPrompt, {
            slot: slots.high,
            source:
                'ui/map-renderer.js::requestMapExpansion',
            audience: 'high',
        });

    const polishCharacter =
        domain
            .getCharacterInputDraft(
                state.character,
            );
    delete polishCharacter
        .polishedBackground;
    const polishPrompt = [
        {
            role: 'system',
            content:
                `You polish a structured player character background for a Hogwarts role-playing game beginning in ${state.campaign.startYear}, school grade ${state.campaign.grade}. Preserve every supplied fact, add no secret lineage or ability, write 180-260 English words, and output prose only.`,
        },
        {
            role: 'user',
            content:
                JSON.stringify(
                    polishCharacter,
                ),
        },
    ];
    prompts.characterPolish =
        promptMetric(polishPrompt, {
            slot: slots.medium,
            source:
                'ui/setup-controller.js::polishCharacterBackground',
            audience: 'medium',
        });

    const mandatorySceneState =
        domain.buildMandatorySceneState(
            state,
        );
    const campaignContext =
        domain.buildCampaignContext(
            state.campaign,
        );
    const characterContext =
        domain.buildCharacterContext(
            state.character,
        );
    const sceneContext =
        `CURRENT COMMITTED SCENE (binding JSON):
${JSON.stringify(mandatorySceneState)}

Continue from this exact state. actorCards contain the only shared NPC performance guidance. behavioralEnvironment is binding current context: embody materially relevant time, daylight, fatigue, curfew, weather, clothing, shelter, and activity effects without reciting it as a checklist. Current scene, location, and environment override stale guidance. Detailed memories, map topology, private facts, hidden arcs, and locked clues are supplied only to role requests authorized to use them. Never invent or disclose absent private state. The SillyTavern storage character is infrastructure and never exists inside the story.`;
    const hostPrompt =
        `${domain.buildSystemPrompt(
            domain.DEFAULT_WORLD_PROMPT,
        )}\n\n${campaignContext}\n\n${characterContext}\n\n${sceneContext}`;
    prompts.hostSystemInjection = {
        source:
            'ui/app-controller.js::applySystemPrompt',
        audience:
            'native SillyTavern generation',
        system:
            metric(hostPrompt, true),
        fields: {
            worldSystem:
                metric(
                    domain.buildSystemPrompt(
                        domain.DEFAULT_WORLD_PROMPT,
                    ),
                    true,
                ),
            campaignContext:
                metric(
                    campaignContext,
                    true,
                ),
            characterContext:
                metric(
                    characterContext,
                    true,
                ),
            mandatorySceneState:
                metric(
                    mandatorySceneState,
                ),
        },
    };

    const localAdapter =
        createLocalSemanticAdapter({
            buildLocalMapModel:
                domain.buildLocalMapModel,
            buildStructuredPlayerTurnSequence:
                domain.buildStructuredPlayerTurnSequence,
            createDeterministicPerceptionFallback:
                domain.createDeterministicPerceptionFallback,
            findLocalRoomPath:
                domain.findLocalRoomPath,
            getRequestHeaders:
                () => ({}),
            projectObservedInventoryUpdates:
                domain.projectObservedInventoryUpdates,
            reconcileObservedPerceptionWithFallback:
                domain.reconcileObservedPerceptionWithFallback,
            validatePerceptionContract:
                domain.validatePerceptionContract,
        });
    const room =
        localAdapter
            .buildLocalSemanticRoomContext(
                state,
            );
    const localActors =
        localAdapter
            .buildLocalSemanticActorContext(
                state,
            );
    const playerTurnSequence =
        domain.buildStructuredPlayerTurnSequence(
            playerAction,
            {
                mode: 'open',
                actorIds: [],
                blocks: [],
                valid: true,
            },
        );
    const narrativeMessage =
        [...chat]
            .reverse()
            .find(message =>
                !message.is_user &&
                Array.isArray(
                    message.extra
                        ?.hogwartsMud
                        ?.segments,
                ) &&
                message.extra
                    .hogwartsMud
                    .segments.length);
    const narrativeSegments =
        (
            narrativeMessage
                ?.extra
                ?.hogwartsMud
                ?.segments ||
            []
        ).map(segment => ({
            type:
                segment.type,
            actorId:
                segment.actorId || '',
            textEn:
                segment.textEn || '',
        }));
    const narrativeText =
        narrativeSegments
            .map(segment =>
                segment.textEn)
            .filter(Boolean)
            .join('\n');
    const semanticActors =
        localActors.map(actor => ({
            id: actor.id,
            nameEn:
                actor.nameEn,
            roleEn:
                actor.roleEn,
            mapId:
                actor.mapId,
            roomId:
                actor.roomId,
        }));
    const inventory =
        (state.items || [])
            .map(item => ({
                id: item.id,
                labelEn:
                    item.labelEn || '',
                label:
                    item.label ||
                    item.labelEn ||
                    '',
                appearanceEn:
                    item.appearanceEn ||
                    item.detailEn ||
                    '',
                type:
                    item.type ||
                    item.kind ||
                    'other',
                ownerId:
                    item.ownerId ||
                    'player',
                holderId:
                    item.holderId ||
                    '',
                state:
                    item.state ||
                    item.status ||
                    'intact',
                isEquipped:
                    item.isEquipped ===
                    true,
            }));
    const preTurnInput = {
        playerAction,
        playerTurnSequence,
        forcedCheck: false,
        clock:
            state.clock,
        scene: {
            id:
                state.scene?.id ||
                '',
            summaryEn:
                state.scene
                    ?.summaryEn ||
                '',
            nextSceneIntent:
                state.scene
                    ?.nextSceneIntent ||
                null,
            recentSceneEvents:
                (
                    state.scene
                        ?.timelineEntries ||
                    []
                ).slice(-4),
        },
        room,
        actors:
            localActors,
        movementResolution:
            null,
        timePolicy:
            getDeterministicTimePolicy(),
    };
    const followPlayerAction =
        '→【跟随赫敏】\n我立即跟着赫敏离开。';
    const followPreTurnInput = {
        ...preTurnInput,
        playerAction:
            followPlayerAction,
        playerTurnSequence: [{
            type: 'action',
            lineIndex: 0,
            text:
                followPlayerAction,
        }],
        movementContext:
            buildFollowMovementContext(
                state,
                followPlayerAction,
                chat,
            ),
    };
    const postTurnInput = {
        clock:
            state.clock,
        playerAction,
        playerTurnSequence,
        targetActorIds: [],
        narrativeSegments,
        room,
        actors:
            semanticActors,
        localPresence:
            state.localPresence ||
            null,
        existingActorPresence:
            null,
    };
    const inventoryInput = {
        playerAction,
        narrativeSegments:
            postTurnInput
                .narrativeSegments,
        inventory,
    };
    const inventoryRequest =
        createDynamicInventoryModelRequest(
            inventoryInput,
        );
    const dynamicIdentityActors =
        semanticActors
            .slice(0, 1)
            .map(actor => ({
                id: actor.id,
                nameEn:
                    actor.nameEn ||
                    actor.id,
            }));
    const dynamicIdentityInput = {
        narrativeSegments:
            postTurnInput
                .narrativeSegments,
        actors:
            dynamicIdentityActors,
        identityTargetActorIds:
            dynamicIdentityActors
                .map(actor =>
                    actor.id),
        inspectionTargetActorIds:
            [],
    };
    const identityRequest =
        createDynamicIdentityModelRequest(
            dynamicIdentityInput,
        );
    const dynamicTurnRequest =
        createDynamicTurnModelRequest({
            identity:
                dynamicIdentityInput,
            inventory:
                inventoryInput,
        });
    const event =
        (state.eventKnowledge || [])
            .at(-1);
    const observerIds =
        [
            ...new Set([
                ...(
                    event
                        ?.participantActorIds ||
                    []
                ),
                ...(
                    event
                        ?.witnessActorIds ||
                    []
                ),
            ]),
        ].filter(actorId =>
            actorId !== 'player');
    const profileById =
        new Map(
            (
                state.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const appraisalInput = {
        clock:
            state.clock,
        event: {
            eventId:
                event?.eventId ||
                '',
            summaryEn:
                event?.summaryEn ||
                '',
        },
        observers:
            observerIds
                .map(id => ({
                    id,
                    nameEn:
                        profileById
                            .get(id)
                            ?.nameEn ||
                        id,
                    roleEn:
                        profileById
                            .get(id)
                            ?.roleEn ||
                        '',
                })),
        targetActorIds: [
            'player',
            ...observerIds,
        ],
    };
    const translationInput = {
        segments: [
            {
                index: 0,
                partIndex: 0,
                text:
                    narrativeText
                        .slice(
                            0,
                            2_400,
                        ),
            },
            {
                index: 1,
                partIndex: 0,
                text:
                    String(
                        state.scene
                            ?.summaryEn ||
                        state.chapterEn ||
                        'Current Scene',
                    ).slice(
                        0,
                        1_000,
                    ),
            },
        ],
        glossary: [],
    };
    const localSemanticSource =
        await readFile(
            path.resolve(
                'src/hogwarts-mud/local-semantic-adjudicator.js',
            ),
            'utf8',
        );
    const localConstants =
        evaluateStaticDeclarations(
            localSemanticSource,
            [
                'PRE_TURN_SYSTEM',
                'preTurnJsonSchema',
                'TRANSLATION_BATCH_SYSTEM',
                'translationBatchJsonSchema',
            ],
            {
                IDENTITY_OBSERVATION_JSON_SCHEMA,
                IDENTITY_OBSERVATION_SYSTEM_RULES,
                movementIntentJsonSchema,
                PRE_TURN_SYSTEM,
                PRE_TURN_EVIDENCE_ROUTE_JSON_SCHEMA,
            },
        );
    const appraisalSource =
        await readFile(
            path.resolve(
                'src/hogwarts-mud/local-appraisal-proposer.js',
            ),
            'utf8',
        );
    const appraisalConstants =
        evaluateStaticDeclarations(
            appraisalSource,
            [
                'APPRAISAL_SYSTEM',
                'appraisalBatchJsonSchema',
            ],
        );
    const localPrompts = {
        preTurn:
            localPromptMetric({
                system:
                    createPreTurnSystemPrompt(
                        preTurnInput,
                    ),
                input:
                    preTurnInput,
                jsonSchema:
                    localConstants
                        .preTurnJsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    100_000,
                source:
                    'local-semantic-adjudicator.js::adjudicateTurn',
                audience:
                    'local semantic model',
            }),
        preTurnFollow:
            localPromptMetric({
                system:
                    createPreTurnSystemPrompt(
                        followPreTurnInput,
                    ),
                input:
                    followPreTurnInput,
                jsonSchema:
                    localConstants
                        .preTurnJsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    100_000,
                source:
                    'local-semantic-adjudicator.js::adjudicateTurn follow movement',
                audience:
                    'local semantic model',
            }),
        postTurn:
            localPromptMetric({
                system:
                    POST_TURN_SYSTEM,
                input:
                    postTurnInput,
                jsonSchema:
                    postTurnJsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    150_000,
                source:
                    'local-semantic-adjudicator.js::observeTurn core',
                audience:
                    'local semantic model',
            }),
        inventory:
            localPromptMetric({
                system:
                    inventoryRequest
                        .system,
                input:
                    inventoryRequest
                        .input,
                jsonSchema:
                    inventoryRequest
                        .jsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    150_000,
                source:
                    'local-semantic-adjudicator.js::observeTurn inventory',
                audience:
                    'local inventory model',
            }),
        dynamicIdentity:
            localPromptMetric({
                system:
                    identityRequest
                        .system,
                input:
                    identityRequest
                        .input,
                jsonSchema:
                    identityRequest
                        .jsonSchema,
                contextTokens:
                    2_048,
                endpointInputLimit:
                    50_000,
                source:
                    'dynamic-identity-observer.js::observeDynamicIdentity',
                audience:
                    'local dynamic model',
            }),
        dynamicTurn:
            localPromptMetric({
                system:
                    dynamicTurnRequest
                        .system,
                input:
                    dynamicTurnRequest
                        .input,
                jsonSchema:
                    dynamicTurnRequest
                        .jsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    150_000,
                source:
                    'dynamic-turn-observer.js::observeDynamicTurn',
                audience:
                    'local dynamic model',
            }),
        appraisal:
            localPromptMetric({
                system:
                    appraisalConstants
                        .APPRAISAL_SYSTEM,
                input:
                    appraisalInput,
                jsonSchema:
                    appraisalConstants
                        .appraisalBatchJsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    100_000,
                source:
                    'local-appraisal-proposer.js::proposeTurnAppraisals',
                audience:
                    'local semantic model',
            }),
        translation:
            localPromptMetric({
                system:
                    localConstants
                        .TRANSLATION_BATCH_SYSTEM,
                input:
                    translationInput,
                jsonSchema:
                    localConstants
                        .translationBatchJsonSchema,
                contextTokens:
                    8_192,
                endpointInputLimit:
                    12_000,
                source:
                    'local-semantic-adjudicator.js::translateText',
                audience:
                    'local translation model',
            }),
    };
    const hostedPrompt = (
        tier,
        prompt,
    ) =>
        domain.limitMessagesToContext(
            prompt,
            slots[tier]
                .contextSize,
            slots[tier]
                .maxResponseLength,
        );
    const capturedRequest = (
        caseId,
        taskId,
        tier,
        mode,
        entries,
    ) => {
        assert.equal(
            entries.length,
            1,
            `${caseId} must capture exactly one request.`,
        );
        return createBlindRequest({
            caseId,
            taskId,
            tier,
            mode,
            prompt:
                hostedPrompt(
                    tier,
                    entries[0]
                        .prompt,
                ),
            options:
                entries[0].options,
        });
    };
    const localRequest = (
        caseId,
        taskId,
        mode,
        system,
        input,
        jsonSchema,
    ) =>
        createBlindRequest({
            caseId,
            taskId,
            tier: 'local',
            mode,
            prompt: [{
                role: 'system',
                content: system,
            }, {
                role: 'user',
                content:
                    JSON.stringify(
                        input,
                    ),
            }],
            options: {
                json: true,
                jsonSchema,
            },
        });
    const blindRequests = [
        capturedRequest(
            'character_polish',
            'character_polish',
            'medium',
            'setup',
            [{
                prompt:
                    polishPrompt,
                options: {},
            }],
        ),
        capturedRequest(
            'opening_world',
            'opening_world',
            'high',
            'bootstrap',
            captures.openingWorld,
        ),
        capturedRequest(
            'calendar_high',
            'calendar_high',
            'high',
            'high_transition',
            captures.highCalendar,
        ),
        capturedRequest(
            'calendar_medium',
            'calendar_medium',
            'medium',
            'runtime',
            captures.mediumCalendar,
        ),
        capturedRequest(
            'interior_cartographer',
            'interior_cartographer',
            'medium',
            'runtime',
            captures.interiorMap,
        ),
        capturedRequest(
            'pacing_director',
            'pacing_director',
            'medium',
            'runtime',
            captures.pacingDirector,
        ),
        capturedRequest(
            'scene_performance',
            'scene_performance',
            'low',
            'runtime',
            captures.scenePerformance,
        ),
        capturedRequest(
            'scene_transition',
            'scene_transition',
            'medium',
            'runtime',
            captures.sceneTransition,
        ),
        createBlindRequest({
            caseId:
                'scene_opening_bootstrap',
            taskId:
                'scene_opening',
            tier: 'low',
            mode: 'bootstrap',
            prompt:
                hostedPrompt(
                    'low',
                    openingPrompt,
                ),
            options: {
                json: true,
            },
        }),
        capturedRequest(
            'scene_opening_runtime',
            'scene_opening',
            'low',
            'runtime',
            captures.sceneOpening,
        ),
        createBlindRequest({
            caseId:
                'social_director',
            taskId:
                'social_director',
            tier: 'medium',
            mode: 'runtime',
            prompt:
                hostedPrompt(
                    'medium',
                    socialPrompt,
                ),
            options: {
                json: true,
                jsonSchema:
                    socialWorkflow
                        .SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
            },
        }),
        createBlindRequest({
            caseId:
                'map_expansion',
            taskId:
                'map_expansion',
            tier: 'high',
            mode: 'runtime',
            prompt:
                hostedPrompt(
                    'high',
                    mapPrompt,
                ),
            options: {
                json: true,
            },
        }),
        localRequest(
            'local_pre_turn_adjudicator',
            'local_pre_turn_adjudicator',
            'runtime',
            createPreTurnSystemPrompt(
                preTurnInput,
            ),
            preTurnInput,
            localConstants
                .preTurnJsonSchema,
        ),
        localRequest(
            'post_turn_semantic_proposal',
            'post_turn_semantic_proposal',
            'runtime',
            POST_TURN_SYSTEM,
            postTurnInput,
            postTurnJsonSchema,
        ),
        localRequest(
            'local_inventory_observer',
            'local_inventory_observer',
            'runtime',
            inventoryRequest.system,
            inventoryRequest.input,
            inventoryRequest
                .jsonSchema,
        ),
        localRequest(
            'local_dynamic_identity_observer',
            'local_dynamic_identity_observer',
            'runtime',
            identityRequest.system,
            identityRequest.input,
            identityRequest
                .jsonSchema,
        ),
        localRequest(
            'local_dynamic_turn_observer',
            'local_dynamic_turn_observer',
            'runtime',
            dynamicTurnRequest.system,
            dynamicTurnRequest.input,
            dynamicTurnRequest
                .jsonSchema,
        ),
        localRequest(
            'local_appraisal_proposer',
            'local_appraisal_proposer',
            'runtime',
            appraisalConstants
                .APPRAISAL_SYSTEM,
            appraisalInput,
            appraisalConstants
                .appraisalBatchJsonSchema,
        ),
        localRequest(
            'local_translation_zh_cn',
            'local_translation',
            'zh-CN_batch',
            localConstants
                .TRANSLATION_BATCH_SYSTEM,
            translationInput,
            localConstants
                .translationBatchJsonSchema,
        ),
    ];
    const blindRequestExport =
        await writeBlindRequests(
            process.env
                .HOGWARTS_BLIND_REQUEST_DIR,
            blindRequests,
        );

    const afterContents =
        await readFile(TINA_FILE);
    const afterStat =
        await stat(TINA_FILE);
    const report = {
        version: 1,
        generatedAt:
            new Date().toISOString(),
        ...(blindRequestExport
            ? {
                blindRequestExport,
            }
            : {}),
        archive: {
            path: TINA_FILE,
            sha256:
                sha256(beforeContents),
            bytes:
                beforeContents.length,
            mtimeMs:
                beforeStat.mtimeMs,
            unchanged:
                beforeContents.equals(
                    afterContents,
                ) &&
                beforeStat.mtimeMs ===
                    afterStat.mtimeMs,
        },
        cutover: {
            timelineAppraisal: {
                changed:
                    migration.changed,
                stats:
                    migration.stats,
            },
            languageAuthority: {
                changed:
                    languageMigration
                        .changed,
                stats:
                    languageMigration
                        .report,
            },
        },
        interiorMountMigration: {
            changed:
                interiorMountMigration
                    .changed,
            stats:
                interiorMountMigration
                    .stats,
        },
        modelSlots: slots,
        contextPlans,
        representativeInput: {
            playerAction:
                metric(
                    playerAction,
                    true,
                ),
            performanceBudget,
            socialEvidence: {
                messages:
                    evidence.messages.length,
                events:
                    evidence
                        .eventKnowledge
                        .length,
                actors:
                    signals.actors.length,
            },
            retrievalRecords:
                0,
            retrievalNote:
                'Prompt builders are measured with empty model-free retrieval. Retrieval field ceilings are audited separately from production planner limits.',
        },
        prompts,
        localPrompts,
    };
    if (
        process.env
            .HOGWARTS_PROMPT_MEASURE_SCOPE ===
        'validator-revision-17'
    ) {
        assert.equal(
            report.archive.unchanged,
            true,
            'Scoped build-only audit modified the Tina archive.',
        );
        process.stdout.write(
            `${JSON.stringify({
                version:
                    report.version,
                generatedAt:
                    report.generatedAt,
                scope:
                    'validator-revision-17',
                archive:
                    report.archive,
                modelSlots:
                    report.modelSlots,
                contextPlans:
                    report.contextPlans,
                representativeInput:
                    report
                        .representativeInput,
                prompts: {
                    scenePerformance:
                        report.prompts
                            .scenePerformance,
                },
                localPrompts: {
                    preTurn:
                        report.localPrompts
                            .preTurn,
                    preTurnFollow:
                        report.localPrompts
                            .preTurnFollow,
                    postTurn:
                        report.localPrompts
                            .postTurn,
                },
            }, null, 2)}\n`,
        );
        return;
    }
    const roleTargets = {
        'opening.world': 14_358,
        pacing: 65_000,
        interiorMap: 10_000,
        'calendar.high': 14_358,
        'calendar.high.openingWorld':
            14_358,
        'calendar.medium': 36_893,
        'calendar.medium.builder':
            36_893,
        sceneTransition: 76_100,
        sceneOpening: 28_319,
        scenePerformance: 47_626,
        'opening.bootstrapScene':
            28_319,
        social: 80_000,
        mapExpansion: 39_344,
        characterPolish: 4_000,
        hostSystemInjection:
            19_319,
    };
    const roleBudgetChecks =
        Object.fromEntries(
            Object.entries(
                roleTargets,
            ).map(([key, target]) => {
                const prompt =
                    prompts[key];
                assert.ok(
                    prompt,
                    `Missing build-only Prompt ${key}.`,
                );
                const actual =
                    prompt
                        .transportTotal
                        ?.characters ??
                    prompt
                        .messageTotal
                        ?.characters ??
                    prompt.system
                        ?.characters ??
                    0;
                assert.ok(
                    actual <= target,
                    `${key} requires ${actual} characters, above product target ${target}.`,
                );
                return [
                    key,
                    {
                        actual,
                        target,
                        passed: true,
                    },
                ];
            }),
        );
    const localTargets = {
        preTurn: {
            characters: 9_000,
        },
        postTurn: {
            characters: 10_500,
            tokens: 3_500,
        },
        inventory: {
            characters: 9_000,
        },
        dynamicIdentity: {
            characters: 6_000,
        },
        dynamicTurn: {
            characters: 20_000,
        },
        appraisal: {
            characters: 3_500,
        },
        translation: {
            characters: 20_000,
        },
    };
    const localBudgetChecks =
        Object.fromEntries(
            Object.entries(
                localTargets,
            ).map(([key, target]) => {
                const prompt =
                    localPrompts[key];
                assert.ok(
                    prompt,
                    `Missing local Prompt ${key}.`,
                );
                const characters =
                    prompt
                        .promptTotal
                        .characters;
                const tokens =
                    prompt
                        .estimatedPromptTokens;
                assert.ok(
                    characters <=
                        target.characters,
                    `${key} requires ${characters} characters, above local target ${target.characters}.`,
                );
                if (target.tokens) {
                    assert.ok(
                        tokens <=
                            target.tokens,
                        `${key} requires approximately ${tokens} tokens, above local target ${target.tokens}.`,
                    );
                }
                return [
                    key,
                    {
                        characters,
                        tokens,
                        target,
                        passed: true,
                    },
                ];
            }),
        );
    const retrievalCapChecks =
        Object.fromEntries(
            [
                [
                    'scenePerformance',
                    80_000,
                ],
                [
                    'sceneTransition',
                    95_000,
                ],
                [
                    'sceneOpening',
                    40_000,
                ],
            ].map(([key, target]) => {
                const base =
                    roleBudgetChecks[
                        key
                    ].actual;
                const actual =
                    base +
                    8_000;
                assert.ok(
                    actual <= target,
                    `${key} with full 8,000-character retrieval requires ${actual}, above product target ${target}.`,
                );
                return [
                    key,
                    {
                        base,
                        retrievalCharacters:
                            8_000,
                        actual,
                        target,
                        passed: true,
                    },
                ];
            }),
        );
    report.budgetChecks = {
        role: roleBudgetChecks,
        local: localBudgetChecks,
        retrievalCap:
            retrievalCapChecks,
    };
    assert.ok(
        prompts.scenePerformance
            .system.characters <=
            27_221,
        'LowTier System Prompt exceeded the approved 27,221-character ceiling.',
    );
    for (const key of [
        'opening.world.repair1',
        'pacing.repair1',
        'interiorMap.repair1',
        'calendar.high.repair1',
        'calendar.medium.repair1',
        'sceneTransition.repair1',
        'sceneTransition.repair2',
        'sceneOpening.repair1',
        'scenePerformance.repair1',
    ]) {
        assert.equal(
            prompts[key],
            undefined,
            `${key} must not exist; invalid output surfaces without an automatic model repair request.`,
        );
    }
    assert.equal(
        report.archive.unchanged,
        true,
        'Build-only audit modified the Tina archive.',
    );
    process.stdout.write(
        `${JSON.stringify(
            report,
            null,
            2,
        )}\n`,
    );
}

await main();
