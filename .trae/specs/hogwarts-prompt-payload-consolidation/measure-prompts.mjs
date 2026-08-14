#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    stat,
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
    NPC_IDENTITY_PROMPT_BOUNDARY,
    buildNpcIdentityPromptProjection,
    projectNpcRuntimeActorsForPrompt,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    synchronizeHeldItemLocations,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
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

const TINA_FILE = path.resolve(
    'data/default-user/chats/Hogwarts_World_Director/' +
    'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
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
        const pacingSignals =
            domain.analyzePacingSignals(
                state,
                playerAction,
            );
        pacingSignals.playerAction =
            playerAction;
        pacingSignals.selectionPlayerAction =
            playerAction;
        pacingSignals.currentAddressing =
            null;
        capture.captures.length = 0;
        await workflow.generatePacingAssessment(
            slots.medium,
            state,
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
        const request = {
            bindingKey:
                'audit_current_container',
            suggestedMapId:
                'audit_current_container_interior',
            containerMapId:
                state.map?.activeMapId || '',
            containerRoomId:
                state.map?.currentLocalNodeId || '',
            nameEn:
                state.location || 'Current interior',
        };
        await workflow.generateInteriorMapPackage(
            slots.medium,
            state,
            request,
        ).catch(() => {});
        repairs.interiorMap =
            structuredClone(
                capture.captures,
            );
        repairs.interiorBuilder = {
            workflow,
            request,
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

        capture.captures.length = 0;
        await workflow.generateSceneTransitionOpening(
            slots.low,
            state,
            sceneTransitionPayload(state),
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
    const chat =
        structuredClone(
            rows.slice(1),
        );
    const migration =
        domain.migrateTimelineAppraisalLifecycleV4(
            structuredClone(
                rows[0]
                    .chat_metadata
                    .hogwartsMud,
            ),
            chat,
        );
    const interiorMountMigration =
        migrateInteriorMountAuthority(
            migration.state,
        );
    const state =
        interiorMountMigration.state;
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
    prompts.social =
        promptMetric(
            socialWorkflow
                .createMemoryConsolidationPrompt(
                    socialState,
                    signals,
                    evidence,
                    contextPlans.medium,
                ),
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
                `You are the World Director for a persistent Harry Potter RPG. First search the supplied preset world and local-map catalog. Propose a new top-level location only when no preset room or location can represent the physical place created by the event. Output one JSON object and no prose:
{"id":"string","reason":"string","changes":[{"operation":"add|update","node":{"id":"snake_case","regionId":"existing region id","name":"Chinese display name","kind":"string","summary":"Chinese summary","access":"public|student|restricted|dangerous|forbidden","x":0,"y":0}}]}
Never delete or rename a preset location. Ordinary movement and scene description require no proposal.`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                trigger: 'exploration',
                currentLocation:
                    state.location,
                character:
                    state.character,
                mapAuthority:
                    domain.buildMapAuthorityContext(
                        state,
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
                    state.character,
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
        narrativeText,
        inventory,
    };
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
        text:
            narrativeText
                .slice(0, 3_600),
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
                'POST_TURN_SYSTEM',
                'postTurnJsonSchema',
                'INVENTORY_TURN_SYSTEM',
                'inventoryTurnJsonSchema',
                'TRANSLATION_SYSTEM',
                'translationJsonSchema',
            ],
            {
                IDENTITY_OBSERVATION_JSON_SCHEMA,
                IDENTITY_OBSERVATION_SYSTEM_RULES,
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
                    localConstants
                        .PRE_TURN_SYSTEM,
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
        postTurn:
            localPromptMetric({
                system:
                    localConstants
                        .POST_TURN_SYSTEM,
                input:
                    postTurnInput,
                jsonSchema:
                    localConstants
                        .postTurnJsonSchema,
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
                    localConstants
                        .INVENTORY_TURN_SYSTEM,
                input:
                    inventoryInput,
                jsonSchema:
                    localConstants
                        .inventoryTurnJsonSchema,
                contextTokens:
                    4_096,
                endpointInputLimit:
                    150_000,
                source:
                    'local-semantic-adjudicator.js::observeTurn inventory',
                audience:
                    'local inventory model',
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
                        .TRANSLATION_SYSTEM,
                input:
                    translationInput,
                jsonSchema:
                    localConstants
                        .translationJsonSchema,
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

    const afterContents =
        await readFile(TINA_FILE);
    const afterStat =
        await stat(TINA_FILE);
    const report = {
        version: 1,
        generatedAt:
            new Date().toISOString(),
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
            changed:
                migration.changed,
            stats:
                migration.stats,
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
    const roleTargets = {
        'opening.world': 20_000,
        'opening.world.repair1':
            30_000,
        pacing: 65_000,
        'pacing.repair1': 75_000,
        interiorMap: 10_000,
        'interiorMap.repair1':
            30_000,
        'calendar.high': 20_000,
        'calendar.high.repair1':
            30_000,
        'calendar.high.openingWorld':
            20_000,
        'calendar.medium': 50_000,
        'calendar.medium.repair1':
            60_000,
        'calendar.medium.builder':
            50_000,
        sceneTransition: 95_000,
        'sceneTransition.repair1':
            110_000,
        'sceneTransition.repair2':
            110_000,
        sceneOpening: 40_000,
        scenePerformance: 80_000,
        'opening.bootstrapScene':
            40_000,
        social: 80_000,
        mapExpansion: 45_000,
        characterPolish: 4_000,
        hostSystemInjection:
            20_000,
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
    assert.equal(
        prompts[
            'scenePerformance.repair1'
        ],
        undefined,
        'Scene Performance must not issue an automatic Low repair request.',
    );
    assert.equal(
        prompts[
            'sceneOpening.repair1'
        ],
        undefined,
        'Scene Opening must not issue an automatic Low repair request.',
    );
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
