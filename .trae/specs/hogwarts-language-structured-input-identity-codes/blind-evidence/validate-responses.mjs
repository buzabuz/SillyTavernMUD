#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    createServer,
} from 'node:http';
import {
    readFile,
    stat,
} from 'node:fs/promises';
import path from 'node:path';

import * as domain from '../../../../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    parseItemOperationDirectives,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import {
    applyHighCalendarProposal,
    applyMediumCalendarProposal,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/calendar-reducer.js';
import {
    migrateInteriorMountAuthority,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/interior-mount.js';
import {
    applyGeneratedInteriorMap,
    validateGeneratedInteriorMap,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/interior-map.js';
import {
    migrateLanguageAuthorityV1,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/language-authority-migration.js';
import {
    adoptMapProposalLanguage,
    applyMapProposal,
    validateMapProposal,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import {
    NPC_IDENTITY_PROMPT_BOUNDARY,
    buildNpcIdentityPromptProjection,
    projectNpcRuntimeActorsForPrompt,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    synchronizeHeldItemLocations,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import {
    applyPacingAssessment,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/pacing-reducer.js';
import {
    projectPeoplePanel,
} from '../../../../public/scripts/extensions/hogwarts-mud/people-projection.js';
import {
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/social-schema.js';
import {
    applySocialDirectorResult,
} from '../../../../public/scripts/extensions/hogwarts-mud/domain/social-v3-reducer.js';
import {
    PRESET_WORLD_MAP,
} from '../../../../public/scripts/extensions/hogwarts-mud/world-data.js';
import {
    createDirectorWorkflows,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createHighCalendarDirectorWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/high-calendar-director.js';
import {
    createInteriorMapWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/interior-map.js';
import {
    createMediumCalendarDirectorWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/medium-calendar-director.js';
import {
    createOpeningWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import {
    createSceneTransitionWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createSocialMemoryWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';
import {
    createTurnPerformanceWorkflow,
} from '../../../../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    adjudicateTurn,
    observeTurn,
    translateText,
} from '../../../../src/hogwarts-mud/local-semantic-adjudicator.js';
import {
    proposeTurnAppraisals,
} from '../../../../src/hogwarts-mud/local-appraisal-proposer.js';
import {
    runSocialDirectorGraph,
} from '../../../../src/hogwarts-mud/social-director-v3-graph.js';
import {
    setConfigFilePath,
} from '../../../../src/util.js';

const ROOT =
    path.resolve(
        import.meta.dirname,
        '../../../..',
    );
setConfigFilePath(
    path.join(
        ROOT,
        'config.yaml',
    ),
);
const ARCHIVE_PATH =
    path.resolve(
        process.env
            .HOGWARTS_BLIND_ARCHIVE_PATH ||
        path.join(
            ROOT,
            'data/default-user/chats/Hogwarts_World_Director/' +
            'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
        ),
    );
const WORK_DIRECTORY =
    path.resolve(
        process.env
            .HOGWARTS_BLIND_WORK_DIR ||
        '/tmp/hogwarts-language-blind',
    );
const REQUEST_DIRECTORY =
    path.join(
        WORK_DIRECTORY,
        'requests',
    );
const RESPONSE_DIRECTORY =
    path.join(
        WORK_DIRECTORY,
        'responses',
    );

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function latestPlayerAction(chat) {
    return String(
        [...chat]
            .reverse()
            .find(message =>
                message.is_user ===
                    true)
            ?.mes ||
        '',
    );
}

function activeAddressingState(state) {
    const activeIds =
        new Set(
            projectPeoplePanel(
                state,
            )
                .activePeople
                .map(person =>
                    person.id),
        );
    return {
        ...state,
        actors:
            (state.actors || [])
                .map(actor => ({
                    ...actor,
                    present:
                        activeIds.has(
                            actor.id,
                        ),
                })),
    };
}

function sceneTransitionPayload(state) {
    const actorStates =
        (state.actors || [])
            .filter(actor =>
                actor.present !==
                    false)
            .map(actor => ({
                id: actor.id,
                present: true,
                currentActivityEn:
                    actor
                        .currentActivityEn ||
                    '',
                currentIntentEn:
                    actor
                        .currentIntentEn ||
                    '',
                lifeStatus:
                    actor.lifeStatus ||
                    'alive',
                lifeStatusPermanent:
                    actor
                        .lifeStatusPermanent ===
                    true,
                lifeStatusDetailEn:
                    actor
                        .lifeStatusDetailEn ||
                    'Alive.',
                mapId:
                    actor.mapId ||
                    state.map
                        ?.activeMapId ||
                    '',
                roomId:
                    actor.roomId ||
                    state.map
                        ?.currentLocalNodeId ||
                    '',
            }));
    return {
        transitionMinutes: 15,
        nextClock:
            state.clock,
        closureSummaryEn:
            'The current scene closes after the committed exchange.',
        globalChronicleSummaryEn:
            'The scene closed after the participants completed their immediate exchange, preserving the established relationships, material state, and unresolved practical pressures that will continue to shape the next committed moment.',
        authorQuillEn:
            'Build-only placeholder text that is never submitted to a model.',
        unresolvedThreadsEn: [],
        nextScene: {
            id:
                `${
                    state.scene?.id ||
                    'scene'
                }_audit_next`,
            nameEn:
                state.scene?.nameEn ||
                state.location ||
                'Current Scene',
            summaryEn:
                state.scene?.summaryEn ||
                'The current situation continues.',
            chapterEn:
                state.chapterEn ||
                '',
            mapId:
                state.map
                    ?.activeMapId ||
                state.scene?.mapId ||
                '',
            roomId:
                state.map
                    ?.currentLocalNodeId ||
                state.scene?.roomId ||
                '',
            actorStates,
            followingSceneIntent:
                state.scene
                    ?.nextSceneIntent ||
                {
                    titleEn:
                        'Continue the current pressure',
                    summaryEn:
                        'Follow the established public situation.',
                    triggerEn:
                        'After the next bounded exchange.',
                    mapId:
                        state.map
                            ?.activeMapId ||
                        '',
                    roomId:
                        state.map
                            ?.currentLocalNodeId ||
                        '',
                    tier: 'medium',
                },
        },
    };
}

function createInteriorBlindFixture(state) {
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
        domain.getInteriorMapRequest(
            interiorState,
        );
    assert.equal(
        request?.status,
        'missing',
    );
    return {
        state:
            interiorState,
        request,
    };
}

function createPacingBlindFixture(state) {
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
        lastAssessedSceneId: '',
        reassessAfterTurns: 6,
        assessment: null,
        pendingBeat: null,
    };
    pacingState.causalCollapse =
        domain
            .normalizeCausalCollapseState();
    const playerAction =
        'Inspect the Blind Audit Key.';
    const signals =
        domain.analyzePacingSignals(
            pacingState,
            playerAction,
        );
    assert.equal(
        signals.shouldAssess,
        true,
    );
    signals.playerAction =
        playerAction;
    signals.selectionPlayerAction =
        playerAction;
    signals.currentAddressing =
        null;
    return {
        state:
            pacingState,
        playerAction,
        signals,
    };
}

async function readBlindFiles() {
    const manifestText =
        await readFile(
            path.join(
                REQUEST_DIRECTORY,
                'manifest.json',
            ),
            'utf8',
        );
    const manifest =
        JSON.parse(
            manifestText,
        );
    const requests =
        new Map();
    const responses =
        new Map();
    for (const entry of manifest.cases) {
        const requestText =
            await readFile(
                path.join(
                    REQUEST_DIRECTORY,
                    entry.fileName,
                ),
                'utf8',
            );
        assert.equal(
            sha256(requestText),
            entry.sha256,
            `${entry.caseId} request hash changed.`,
        );
        const responseText =
            await readFile(
                path.join(
                    RESPONSE_DIRECTORY,
                    `${entry.caseId}.txt`,
                ),
                'utf8',
            );
        requests.set(
            entry.caseId,
            JSON.parse(
                requestText,
            ),
        );
        responses.set(
            entry.caseId,
            responseText.trim(),
        );
    }
    return {
        manifest,
        requests,
        responses,
    };
}

async function loadRepresentativeState() {
    const beforeContents =
        await readFile(
            ARCHIVE_PATH,
        );
    const beforeStat =
        await stat(
            ARCHIVE_PATH,
        );
    const rows =
        beforeContents
            .toString('utf8')
            .trimEnd()
            .split(/\r?\n/u)
            .map(line =>
                JSON.parse(line));
    const sourceChat =
        structuredClone(
            rows.slice(1),
        );
    const timelineMigration =
        domain
            .migrateTimelineAppraisalLifecycleV4(
                structuredClone(
                    rows[0]
                        .chat_metadata
                        .hogwartsMud,
                ),
                sourceChat,
            );
    const languageMigration =
        migrateLanguageAuthorityV1({
            worldState:
                timelineMigration
                    .state,
            chat: sourceChat,
        });
    const interiorMigration =
        migrateInteriorMountAuthority(
            languageMigration
                .nextState,
        );
    return {
        state:
            interiorMigration.state,
        chat:
            languageMigration.nextChat,
        beforeContents,
        beforeStat,
    };
}

function createHostedSender({
    caseId,
    requests,
    responses,
    slots,
    callCounts,
}) {
    return async (
        slot,
        prompt,
        options = {},
    ) => {
        callCounts.set(
            caseId,
            (
                callCounts.get(
                    caseId,
                ) ||
                0
            ) + 1,
        );
        const request =
            requests.get(
                caseId,
            );
        const limited =
            domain.limitMessagesToContext(
                prompt,
                slot.contextSize,
                slot.maxResponseLength,
            );
        assert.deepEqual(
            limited,
            request.messages,
            `${caseId} did not use the captured production request.`,
        );
        assert.equal(
            options.json === true,
            request.transport.json,
            `${caseId} JSON transport changed.`,
        );
        assert.deepEqual(
            options.jsonSchema ||
                null,
            request.transport
                .jsonSchema,
            `${caseId} transport Schema changed.`,
        );
        assert.equal(
            slot.contextSize,
            slots[
                request.tier
            ].contextSize,
        );
        return {
            content:
                responses.get(
                    caseId,
                ),
        };
    };
}

async function validateHosted({
    state,
    chat,
    slots,
    contextPlans,
    requests,
    responses,
    callCounts,
}) {
    const result = {};
    const sender = caseId =>
        createHostedSender({
            caseId,
            requests,
            responses,
            slots,
            callCounts,
        });
    const parseJsonObject =
        domain.parseCompleteJsonObject;
    const extractRoleResponseText =
        response =>
            domain
                .parseCompleteJsonObject(
                    response.content,
                );
    const playerAction =
        latestPlayerAction(
            chat,
        );
    const performanceBudget =
        domain
            .createTurnPerformanceBudget(
                playerAction,
                {},
                {
                    activeNamedActorCount:
                        projectPeoplePanel(
                            state,
                        )
                            .activePeople
                            .length,
                },
            );
    const characterText =
        responses.get(
            'character_polish',
        );
    assert.ok(
        characterText.trim(),
        'character_polish returned empty text.',
    );
    callCounts.set(
        'character_polish',
        1,
    );
    result.character_polish = {
        stage:
            'setup_preview',
    };

    const openingWorkflow =
        createOpeningWorkflow({
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            PRESET_WORLD_MAP,
            extractRoleResponseText,
            getContext: () => ({
                chat,
            }),
            getSettings: () => ({
                translationEnabled:
                    false,
            }),
            parseJsonObject,
            sendOpeningWorldRequest:
                sender(
                    'opening_world',
                ),
            validateOpeningWorldPackage:
                domain
                    .validateOpeningWorldPackage,
        });
    const opening =
        await openingWorkflow
            .generateOpeningPackage(
                slots.high,
                state,
            );
    if (!opening.languageSkipped) {
        domain
            .applyOpeningWorldPackage(
                structuredClone(
                    state,
                ),
                opening,
            );
    }
    result.opening_world = {
        stage:
            opening.languageSkipped
                ? 'language_skipped'
                : 'reducer',
    };

    const highWorkflow =
        createHighCalendarDirectorWorkflow({
            extractRoleResponseText,
            parseJsonObject,
            sendModelTaskRequest:
                sender(
                    'calendar_high',
                ),
        });
    const highProposal =
        await highWorkflow
            .generateHighCalendarProposal(
                slots.high,
                state,
                'high_transition',
            );
    applyHighCalendarProposal(
        structuredClone(state),
        highProposal,
    );
    result.calendar_high = {
        stage: 'reducer',
    };

    const mediumWorkflow =
        createMediumCalendarDirectorWorkflow({
            extractRoleResponseText,
            getContext: () => ({
                chat,
            }),
            parseJsonObject,
            sendModelTaskRequest:
                sender(
                    'calendar_medium',
                ),
        });
    const mediumTrigger = {
        reasons: [
            'build_only_audit',
        ],
        explicitCommitment: '',
    };
    const targetHorizon =
        domain.advanceWorldClock(
            state.clock,
            14 * 24 * 60,
        );
    const mediumProposal =
        await mediumWorkflow
            .generateMediumCalendarProposal(
                slots.medium,
                state,
                mediumTrigger,
                targetHorizon,
            );
    applyMediumCalendarProposal(
        structuredClone(state),
        mediumProposal,
    );
    result.calendar_medium = {
        stage: 'reducer',
    };

    const interiorFixture =
        createInteriorBlindFixture(
            state,
        );
    const interiorRequest =
        interiorFixture.request;
    const interiorWorkflow =
        createInteriorMapWorkflow({
            extractRoleResponseText,
            getContext: () => ({
                chat,
            }),
            getSettings: () => ({
                translationEnabled:
                    false,
            }),
            parseJsonObject,
            sendModelTaskRequest:
                sender(
                    'interior_cartographer',
                ),
            validateGeneratedInteriorMap:
                validateGeneratedInteriorMap,
        });
    const interior =
        await interiorWorkflow
            .generateInteriorMapPackage(
                slots.medium,
                interiorFixture
                    .state,
                interiorRequest,
            );
    if (!interior.languageSkipped) {
        applyGeneratedInteriorMap(
            structuredClone(
                interiorFixture
                    .state,
            ),
            interior,
            interiorRequest,
        );
    }
    result.interior_cartographer = {
        stage:
            interior.languageSkipped
                ? 'language_skipped'
                : 'reducer',
    };

    const directorWorkflow =
        createDirectorWorkflows({
            CANON_CAST_IDENTITY_CONTRACT:
                domain
                    .CANON_CAST_IDENTITY_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY,
            analyzePacingSignals:
                domain
                    .analyzePacingSignals,
            buildActorSelectionPolicy:
                domain
                    .buildActorSelectionPolicy,
            buildMapAuthorityContext:
                domain
                    .buildMapAuthorityContext,
            buildNpcIdentityPromptProjection,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText,
            formatRetrievedKnowledge:
                value =>
                    value,
            getContext: () => ({
                chat,
            }),
            getMudState: () =>
                state,
            normalizePacingAssessmentPayload:
                domain
                    .normalizePacingAssessmentPayload,
            parseJsonObject,
            projectNpcRuntimeActorsForPrompt,
            sendPacingDirectorRequest:
                sender(
                    'pacing_director',
                ),
            validatePacingAssessment:
                domain
                    .validatePacingAssessment,
        });
    const pacingFixture =
        createPacingBlindFixture(
            state,
        );
    const pacingSignals =
        pacingFixture.signals;
    const pacing =
        await directorWorkflow
            .generatePacingAssessment(
                slots.medium,
                pacingFixture.state,
                pacingSignals,
                [],
                contextPlans.medium,
            );
    applyPacingAssessment(
        structuredClone(
            pacingFixture.state,
        ),
        pacing,
        pacingSignals,
    );
    result.pacing_director = {
        stage: 'reducer',
    };

    const performanceWorkflow =
        createTurnPerformanceWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                domain
                    .CANON_CAST_IDENTITY_CONTRACT,
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY,
            beginLiveSceneStream:
                () => {},
            buildBehavioralEnvironment:
                domain
                    .buildBehavioralEnvironment,
            buildCurrentMaterialState:
                domain
                    .buildCurrentMaterialState,
            buildSpatialContext:
                domain
                    .buildSpatialContext,
            buildStructuredPlayerTurnSequence:
                domain
                    .buildStructuredPlayerTurnSequence,
            buildTemporaryActorPromotionPolicy:
                domain
                    .buildTemporaryActorPromotionPolicy,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText,
            getActiveAddressingState:
                activeAddressingState,
            getAuthoritativeSceneSpells:
                domain
                    .getAuthoritativeSceneSpells,
            getRequestHeaders:
                () => ({}),
            getSettings: () => ({
                translationEnabled:
                    false,
            }),
            parseItemOperationDirectives,
            parseJsonObject,
            recoverScenePerformancePayload:
                domain
                    .recoverScenePerformancePayload,
            removeExplicitAddressDirective:
                domain
                    .removeExplicitAddressDirective,
            resolvePlayerAddressing:
                domain
                    .resolvePlayerAddressing,
            resolveTemporaryActorRevealedName:
                domain
                    .resolveTemporaryActorRevealedName,
            sendModelTaskRequest:
                sender(
                    'scene_performance',
                ),
            setLiveSceneStreamPhase:
                () => {},
            settleNarrativeTurnPerformance:
                domain
                    .settleNarrativeTurnPerformance,
            translateOpeningValues:
                async values =>
                    values,
            updateLiveSceneStream:
                () => {},
            validateScenePerformance:
                domain
                    .validateScenePerformance,
        });
    const originalFetch =
        globalThis.fetch;
    globalThis.fetch =
        async (
            _url,
            options,
        ) => {
            const input =
                JSON.parse(
                    options.body,
                );
            return {
                ok: true,
                json: async () => ({
                    performance:
                        domain
                            .settleNarrativeTurnPerformance(
                                input.payload,
                                input
                                    .worldState,
                                {
                                    playerAction:
                                        input
                                            .playerAction,
                                    movementResolution:
                                        input
                                            .movementResolution,
                                    momentumDirective:
                                        input
                                            .momentumDirective,
                                    checkResolution:
                                        input
                                            .checkResolution,
                                },
                            ),
                }),
            };
        };
    let performance;
    try {
        performance =
            await performanceWorkflow
                .generateScenePerformance(
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
                );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
    const transaction =
        performanceWorkflow
            .buildSceneTransaction(
                performance,
                performanceBudget,
                null,
                null,
            );
    domain.applyTurnTransaction(
        structuredClone(state),
        transaction,
        playerAction,
    );
    result.scene_performance = {
        stage: 'reducer',
    };

    const transitionWorkflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                domain
                    .CANON_CAST_IDENTITY_CONTRACT,
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY,
            buildActorContinuityCapsules:
                domain
                    .buildActorContinuityCapsules,
            buildBehavioralEnvironment:
                domain
                    .buildBehavioralEnvironment,
            buildCurrentMaterialState:
                domain
                    .buildCurrentMaterialState,
            buildMapAuthorityContext:
                domain
                    .buildMapAuthorityContext,
            buildSceneCastRotationPolicy:
                domain
                    .buildSceneCastRotationPolicy,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText,
            formatRetrievedKnowledge:
                value =>
                    value,
            getContext: () => ({
                chat,
            }),
            getSceneDestinationAuthority:
                domain
                    .getSceneDestinationAuthority,
            normalizeSceneTransitionPackage:
                domain
                    .normalizeSceneTransitionPackage,
            parseJsonObject,
            projectActorLibraryForContext:
                directorWorkflow
                    .projectActorLibraryForContext,
            projectNpcRuntimeActorsForPrompt,
            sendSceneOpeningRequest:
                sender(
                    'scene_opening_runtime',
                ),
            sendSceneTransitionRequest:
                sender(
                    'scene_transition',
                ),
            stripSyntheticSceneOpeningActorSegments:
                domain
                    .stripSyntheticSceneOpeningActorSegments,
            synchronizeHeldItemLocations,
            validateSceneTransitionPackage:
                domain
                    .validateSceneTransitionPackage,
        });
    const expectedDestination = {
        mapId:
            state.map?.activeMapId ||
            state.scene?.mapId ||
            '',
        roomId:
            state.map
                ?.currentLocalNodeId ||
            state.scene?.roomId ||
            '',
    };
    const transition =
        await transitionWorkflow
            .generateSceneTransitionPackage(
                slots.medium,
                state,
                'medium',
                state.location,
                expectedDestination,
                null,
                [],
                contextPlans.medium,
            );
    const archiveEntry = {
        id: state.scene.id,
        endedClock:
            state.clock,
        closureSummaryEn:
            transition
                .closureSummaryEn,
    };
    const runtimeOpening =
        await transitionWorkflow
            .generateSceneTransitionOpening(
                slots.low,
                state,
                transition,
                expectedDestination,
                contextPlans.low,
                {},
                [],
            );
    assert.ok(
        runtimeOpening
            .nextScene
            .openingSegments
            .length,
        'Runtime Scene Opening produced no segments.',
    );
    domain.applySceneTransition(
        structuredClone(state),
        runtimeOpening,
        archiveEntry,
        {
            expectedMapId:
                expectedDestination
                    .mapId,
            expectedRoomId:
                expectedDestination
                    .roomId,
            tier: 'medium',
        },
    );
    result.scene_transition = {
        stage: 'composed_reducer',
    };
    result.scene_opening_runtime = {
        stage: 'composed_reducer',
    };

    const bootstrapWorkflow =
        createOpeningWorkflow({
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            PRESET_WORLD_MAP,
            extractRoleResponseText,
            parseJsonObject,
            sendBootstrapSceneOpeningRequest:
                sender(
                    'scene_opening_bootstrap',
                ),
        });
    const bootstrapSegments =
        await bootstrapWorkflow
            .generateBootstrapSceneOpening(
                slots.low,
                state,
            );
    assert.ok(
        bootstrapSegments.length,
        'Bootstrap Scene Opening produced no segments.',
    );
    result.scene_opening_bootstrap = {
        stage: 'validator',
    };

    const socialState =
        structuredClone(state);
    socialState.socialGraph
        .lastProcessedMessageId =
        -1;
    const socialWorkflow =
        createSocialMemoryWorkflow({
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            SOCIAL_GRAPH_EXTRACTOR_VERSION,
            analyzeMemoryConsolidation:
                domain
                    .analyzeMemoryConsolidation,
            buildSocialAudienceProjection:
                domain
                    .buildSocialAudienceProjection,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText,
            getContext: () => ({
                chat,
            }),
            normalizeMemoryConsolidationPayload:
                domain
                    .normalizeMemoryConsolidationPayload,
            normalizeSocialGraph:
                domain
                    .normalizeSocialGraph,
            sendModelTaskRequest:
                sender(
                    'social_director',
                ),
            validateMemoryConsolidation:
                domain
                    .validateMemoryConsolidation,
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
        domain
            .analyzeMemoryConsolidation(
                socialState,
            );
    const socialPayload =
        await socialWorkflow
            .generateMemoryConsolidation(
                slots.medium,
                socialState,
                signals,
                evidence,
                contextPlans.medium,
            );
    if (!socialPayload.languageSkipped) {
        const graphResult =
            await runSocialDirectorGraph({
                sceneId:
                    `social_catchup_${
                        evidence
                            .allowedMessageIds[0]
                    }_${
                        evidence
                            .allowedMessageIds
                            .at(-1)
                    }`,
                clock:
                    socialState.clock,
                turn:
                    Number(
                        socialState
                            .turn?.count ||
                        0,
                    ),
                actorIds:
                    socialState
                        .actorLibrary
                        .map(actor =>
                            actor.id),
                presentActorIds:
                    evidence
                        .presentActorIds,
                actorDirectory:
                    socialState
                        .actorLibrary
                        .map(actor => ({
                            id: actor.id,
                            nameEn:
                                actor.nameEn,
                        })),
                sceneEvidence:
                    evidence.messages,
                allowedMessageIds:
                    evidence
                        .allowedMessageIds,
                messageSceneIds:
                    evidence
                        .messageSceneIds,
                witnessActorIdsByMessageId:
                    evidence
                        .witnessActorIdsByMessageId,
                eventKnowledge:
                    evidence
                        .eventKnowledge,
                availableAppraisals:
                    socialState
                        .memorySynapse
                        .appraisals,
                existingGraph:
                    socialState
                        .socialGraph,
                extraction:
                    socialPayload,
            });
        applySocialDirectorResult(
            socialState,
            graphResult,
            evidence
                .allowedMessageIds,
        );
    }
    result.social_director = {
        stage:
            socialPayload
                .languageSkipped
                ? 'language_skipped'
                : 'reducer',
    };

    const mapRaw =
        responses.get(
            'map_expansion',
        );
    callCounts.set(
        'map_expansion',
        1,
    );
    const mapAdoption =
        adoptMapProposalLanguage(
                parseJsonObject(
                    mapRaw,
                ),
            );
    const mapValidation =
        validateMapProposal(
            mapAdoption.proposal,
            {
                trigger:
                    'exploration',
                baseMap:
                    PRESET_WORLD_MAP,
                generatedNodes:
                    state.map
                        ?.generatedNodes,
            },
        );
    assert.equal(
        mapValidation.valid,
        true,
        mapValidation
            .errors
            .join('; '),
    );
    if (
        mapAdoption.proposal
            .changes.length
    ) {
        applyMapProposal(
            structuredClone(
                state.map,
            ),
            mapAdoption.proposal,
        );
    }
    result.map_expansion = {
        stage:
            mapAdoption
                .proposal
                .changes
                .length
                ? 'reducer'
                : 'no_change',
    };
    return result;
}

async function validateLocal({
    requests,
    responses,
    callCounts,
}) {
    const bySystem =
        new Map(
            [
                'local_pre_turn_adjudicator',
                'local_post_turn_observer',
                'local_inventory_observer',
                'local_appraisal_proposer',
                'local_translation_zh_cn',
            ].map(caseId => [
                requests.get(
                    caseId,
                ).messages[0]
                    .content,
                caseId,
            ]),
        );
    const server =
        createServer((
            incoming,
            outgoing,
        ) => {
            if (
                incoming.url ===
                    '/api/tags'
            ) {
                outgoing.writeHead(
                    200,
                    {
                        'Content-Type':
                            'application/json',
                    },
                );
                outgoing.end(
                    '{"models":[]}',
                );
                return;
            }
            const chunks = [];
            incoming.on(
                'data',
                chunk => {
                    chunks.push(
                        chunk,
                    );
                },
            );
            incoming.on(
                'end',
                () => {
                    try {
                        assert.equal(
                            incoming.url,
                            '/api/chat',
                        );
                        const body =
                            JSON.parse(
                                Buffer
                                    .concat(
                                        chunks,
                                    )
                                    .toString(
                                        'utf8',
                                    ),
                            );
                        const caseId =
                            bySystem.get(
                                body
                                    .messages[0]
                                    .content,
                            );
                        assert.ok(
                            caseId,
                            'Unexpected local blind request.',
                        );
                        const request =
                            requests.get(
                                caseId,
                            );
                        assert.deepEqual(
                            body.messages,
                            request.messages,
                            `${caseId} local messages changed.`,
                        );
                        assert.deepEqual(
                            body.format,
                            request
                                .transport
                                .jsonSchema,
                            `${caseId} local Schema changed.`,
                        );
                        callCounts.set(
                            caseId,
                            (
                                callCounts
                                    .get(
                                        caseId,
                                    ) ||
                                0
                            ) + 1,
                        );
                        outgoing.writeHead(
                            200,
                            {
                                'Content-Type':
                                    'application/json',
                            },
                        );
                        outgoing.end(
                            JSON.stringify({
                                model:
                                    'fresh-blind-agent',
                                message: {
                                    content:
                                        responses
                                            .get(
                                                caseId,
                                            ),
                                },
                                total_duration:
                                    1,
                                prompt_eval_count:
                                    1,
                                eval_count: 1,
                            }),
                        );
                    } catch (error) {
                        outgoing.writeHead(
                            500,
                            {
                                'Content-Type':
                                    'text/plain',
                            },
                        );
                        outgoing.end(
                            String(
                                error?.message ||
                                error,
                            ),
                        );
                    }
                },
            );
        });
    await new Promise((
        resolve,
        reject,
    ) => {
        server.once(
            'error',
            reject,
        );
        server.listen(
            0,
            '127.0.0.1',
            resolve,
        );
    });
    const address =
        server.address();
    process.env
        .HOGWARTS_OLLAMA_URL =
        `http://127.0.0.1:${
            address.port
        }`;
    try {
        const preRequest =
            requests.get(
                'local_pre_turn_adjudicator',
            );
        await adjudicateTurn(
            JSON.parse(
                preRequest
                    .messages[1]
                    .content,
            ),
        );

        const postRequest =
            requests.get(
                'local_post_turn_observer',
            );
        const inventoryRequest =
            requests.get(
                'local_inventory_observer',
            );
        const postInput =
            JSON.parse(
                postRequest
                    .messages[1]
                    .content,
            );
        const inventoryInput =
            JSON.parse(
                inventoryRequest
                    .messages[1]
                    .content,
            );
        await observeTurn({
            ...postInput,
            inventory:
                inventoryInput
                    .inventory,
        });

        const appraisalRequest =
            requests.get(
                'local_appraisal_proposer',
            );
        await proposeTurnAppraisals(
            JSON.parse(
                appraisalRequest
                    .messages[1]
                    .content,
            ),
        );

        const translationRequest =
            requests.get(
                'local_translation_zh_cn',
            );
        const translationInput =
            JSON.parse(
                translationRequest
                    .messages[1]
                    .content,
            );
        const translationSource =
            translationInput
                .segments
                .map(segment =>
                    `[[HPMUD_${
                        segment.index
                    }_${
                        segment.partIndex
                    }]] ${
                        segment.text
                    }`)
                .join('\n');
        await translateText(
            translationSource,
            {
                glossary:
                    translationInput
                        .glossary,
            },
        );
    } finally {
        await new Promise(resolve =>
            server.close(
                resolve,
            ));
    }
    return {
        local_pre_turn_adjudicator: {
            stage:
                'zod_language_adoption',
        },
        local_post_turn_observer: {
            stage:
                'zod_language_adoption',
        },
        local_inventory_observer: {
            stage:
                'zod_language_adoption',
        },
        local_appraisal_proposer: {
            stage:
                'zod_language_adoption',
        },
        local_translation_zh_cn: {
            stage:
                'zod_marker_validation',
        },
    };
}

async function main() {
    const blind =
        await readBlindFiles();
    const representative =
        await loadRepresentativeState();
    const slots =
        domain.normalizeModelSlots(
            representative
                .state
                .modelSlots,
        );
    const contextPlans =
        Object.fromEntries(
            Object.entries(slots)
                .map(([
                    tier,
                    slot,
                ]) => [
                    tier,
                    domain
                        .createContextBudgetPlan(
                            slot.contextSize,
                            slot
                                .maxResponseLength,
                        ),
                ]),
        );
    const callCounts =
        new Map();
    const outcomes = {};
    const validators = [
        [
            'hosted',
            () =>
                validateHosted({
                    state:
                        representative
                            .state,
                    chat:
                        representative
                            .chat,
                    slots,
                    contextPlans,
                    requests:
                        blind.requests,
                    responses:
                        blind.responses,
                    callCounts,
                }),
        ],
        [
            'local',
            () =>
                validateLocal({
                    requests:
                        blind.requests,
                    responses:
                        blind.responses,
                    callCounts,
                }),
        ],
    ];
    for (const [
        group,
        validate,
    ] of validators) {
        try {
            Object.assign(
                outcomes,
                await validate(),
            );
        } catch (error) {
            outcomes[group] = {
                stage: 'failed',
                error:
                    String(
                        error?.message ||
                        error,
                    ),
            };
        }
    }
    const cases =
        blind.manifest.cases
            .map(entry => {
                const response =
                    blind.responses.get(
                        entry.caseId,
                    );
                const count =
                    callCounts.get(
                        entry.caseId,
                    ) ||
                    0;
                return {
                    caseId:
                        entry.caseId,
                    requestSha256:
                        entry.sha256,
                    responseSha256:
                        sha256(
                            response,
                        ),
                    responseBytes:
                        Buffer
                            .byteLength(
                                response,
                            ),
                    modelCallCount:
                        count,
                    repairCallCount: 0,
                    outcome:
                        outcomes[
                            entry.caseId
                        ] ||
                        {
                            stage:
                                'not_reached',
                        },
                };
            });
    const afterContents =
        await readFile(
            ARCHIVE_PATH,
        );
    const afterStat =
        await stat(
            ARCHIVE_PATH,
        );
    const report = {
        schemaVersion: 1,
        freshContextFreeAgents:
            cases.length,
        requestCount:
            cases.length,
        responseCount:
            blind.responses.size,
        sourceArchiveUnchanged:
            representative
                .beforeContents
                .equals(
                    afterContents,
                ) &&
            representative
                .beforeStat
                .mtimeMs ===
            afterStat.mtimeMs,
        passed:
            cases.every(item =>
                item.modelCallCount ===
                    1 &&
                item.repairCallCount ===
                    0 &&
                ![
                    'failed',
                    'not_reached',
                ].includes(
                    item.outcome
                        .stage,
                )),
        groupOutcomes:
            outcomes,
        cases,
    };
    process.stdout.write(
        `${JSON.stringify(
            report,
            null,
            2,
        )}\n`,
    );
    if (!report.passed) {
        process.exit(1);
    }
    process.exit(0);
}

await main();
